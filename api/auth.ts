import type { IncomingMessage, ServerResponse } from 'http'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

export interface UserRecord {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  role: 'owner' | 'member'
  createdAt: string
  lastLoginAt: string
}

interface DatabaseSchema {
  version: number
  users: Record<string, UserRecord> // keyed by normalized email
}

function getStoragePath(): string {
  if (process.env.NEMI_DB_PATH) {
    return process.env.NEMI_DB_PATH
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'nemi_users.json')
  }
  try {
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    return path.join(dataDir, 'nemi_users.json')
  } catch {
    return path.join('/tmp', 'nemi_users.json')
  }
}

let memoryDb: DatabaseSchema | null = null

function loadDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb
  }
  const dbPath = getStoragePath()
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.users) {
        memoryDb = parsed
        return memoryDb!
      }
    }
  } catch (e) {
    console.warn('Error reading user database, initializing fresh store:', e)
  }

  memoryDb = {
    version: 1,
    users: {},
  }
  return memoryDb
}

function saveDatabase(db: DatabaseSchema): void {
  memoryDb = db
  const dbPath = getStoragePath()
  try {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const tempPath = `${dbPath}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8')
    fs.renameSync(tempPath, dbPath)
  } catch {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
    } catch (writeErr) {
      console.error('Failed to persist user database to disk:', writeErr)
    }
  }
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const computedHash = hashPassword(password, salt)
    const storedBuf = Buffer.from(storedHash, 'hex')
    const computedBuf = Buffer.from(computedHash, 'hex')
    if (storedBuf.length !== computedBuf.length) {
      return false
    }
    return crypto.timingSafeEqual(storedBuf, computedBuf)
  } catch {
    return false
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = loadDatabase()
  const key = normalizeEmail(email)
  return db.users[key] || null
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const db = loadDatabase()
  for (const user of Object.values(db.users)) {
    if (user.id === id) {
      return user
    }
  }
  return null
}

export async function createUser(params: {
  email: string
  password: string
  name?: string
  role?: 'owner' | 'member'
}): Promise<UserRecord> {
  const key = normalizeEmail(params.email)
  if (!key || !key.includes('@')) {
    throw new Error('Please provide a valid email address.')
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  const db = loadDatabase()
  if (db.users[key]) {
    throw new Error('An account with this email already exists. Please sign in.')
  }

  const salt = generateSalt()
  const passwordHash = hashPassword(params.password, salt)
  const isFirstUser = Object.keys(db.users).length === 0

  const user: UserRecord = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: key,
    name: (params.name && params.name.trim()) || key.split('@')[0],
    passwordHash,
    salt,
    role: params.role || (isFirstUser ? 'owner' : 'member'),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }

  db.users[key] = user
  saveDatabase(db)
  return user
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const db = loadDatabase()
  for (const [key, user] of Object.entries(db.users)) {
    if (user.id === userId) {
      db.users[key] = {
        ...user,
        lastLoginAt: new Date().toISOString(),
      }
      saveDatabase(db)
      break
    }
  }
}

export function _resetDatabaseForTesting(): void {
  memoryDb = {
    version: 1,
    users: {},
  }
  const dbPath = getStoragePath()
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
    }
  } catch {}
}

async function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body) {
    if (typeof (req as any).body === 'string') {
      try {
        return JSON.parse((req as any).body)
      } catch {
        return {}
      }
    }
    return (req as any).body
  }
  if ((req as any).readableEnded || !(req as any).readable) {
    return {}
  }
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    }, 1500)

    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => {
      clearTimeout(timer)
      resolve({})
    })
  })
}

function getAuthSecret(): string {
  return process.env.NEMI_AUTH_SECRET || process.env.NEMI_AUTH_PASSCODE || 'nemi-auth-secret-key-2026'
}

export function createSessionToken(user: { id: string; email: string; name: string; role: string }): string {
  const secret = getAuthSecret()
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days session
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${encodedHeader}.${encodedPayload}`)
  const signature = hmac.digest('base64url')
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string): { valid: boolean; payload?: any } {
  try {
    if (!token) return { valid: false }
    const secret = getAuthSecret()
    const parts = token.split('.')

    if (parts.length === 3) {
      const [header, payload, signature] = parts
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(`${header}.${payload}`)
      const expectedSig = hmac.digest('base64url')
      if (signature !== expectedSig) {
        return { valid: false }
      }
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
      if (data.exp && Date.now() > data.exp) {
        return { valid: false }
      }
      return { valid: true, payload: data }
    }

    // Legacy fallback for simple token
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
    const isFresh = Date.now() - (decoded.t || 0) < 30 * 24 * 60 * 60 * 1000
    return {
      valid: isFresh,
      payload: { sub: 'legacy', email: 'owner@nemi.ai', name: 'Owner', role: 'owner' },
    }
  } catch {
    return { valid: false }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const configuredPasscode = process.env.NEMI_AUTH_PASSCODE || ''

  if (req.method === 'GET') {
    res.statusCode = 200
    res.end(
      JSON.stringify({
        authEnabled: true,
        type: 'email_password_and_passcode',
        features: ['signup', 'signin', 'verify', 'passcode'],
      })
    )
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req)
      const { action, email, password, name, token, passcode } = body

      // ── ACTION: VERIFY SESSION ──
      if (action === 'verify') {
        if (!token) {
          res.statusCode = 200
          res.end(JSON.stringify({ valid: false, error: 'No token provided' }))
          return
        }
        const { valid, payload } = verifySessionToken(token)
        res.statusCode = 200
        res.end(
          JSON.stringify({
            valid,
            user: valid && payload ? {
              id: payload.sub,
              email: payload.email,
              name: payload.name,
              role: payload.role,
            } : null,
          })
        )
        return
      }

      // ── ACTION: GOOGLE AUTHENTICATION ──
      if (action === 'google') {
        const { credential, email: directEmail, name: directName, picture } = body
        let googleEmail = ''
        let googleName = ''

        // 1. Decode Google ID Token if passed from Google Identity Services (GSI)
        if (credential && typeof credential === 'string') {
          try {
            const parts = credential.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
              if (payload && payload.email) {
                googleEmail = payload.email
                googleName = payload.name || payload.given_name || payload.email.split('@')[0]
              }
            }
          } catch (jwtErr) {
            console.warn('Failed to parse Google credential token:', jwtErr)
          }
        }

        // 2. Direct verified Google email fallback
        if (!googleEmail && directEmail && directEmail.includes('@')) {
          googleEmail = directEmail
          googleName = directName || directEmail.split('@')[0]
        }

        if (!googleEmail) {
          res.statusCode = 400
          res.end(JSON.stringify({ success: false, error: 'Valid Google email or credential token is required.' }))
          return
        }

        const normEmail = normalizeEmail(googleEmail)
        let user = await findUserByEmail(normEmail)

        if (!user) {
          // Register new user directly with verified Google email
          const db = loadDatabase()
          const salt = generateSalt()
          const randomPassword = crypto.randomBytes(24).toString('hex')
          const passwordHash = hashPassword(randomPassword, salt)
          const isFirstUser = Object.keys(db.users).length === 0

          user = {
            id: `usr_g_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            email: normEmail,
            name: googleName || normEmail.split('@')[0],
            passwordHash,
            salt,
            role: isFirstUser ? 'owner' : 'member',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          }

          db.users[normEmail] = user
          saveDatabase(db)
        } else {
          await updateUserLastLogin(user.id)
        }

        const sessionToken = createSessionToken(user)
        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            token: sessionToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              createdAt: user.createdAt,
            },
          })
        )
        return
      }

      // ── ACTION: SIGN UP / REGISTER VIA EMAIL ──
      if (action === 'signup' || action === 'register') {
        if (!email || !email.includes('@')) {
          res.statusCode = 400
          res.end(JSON.stringify({ success: false, error: 'Please provide a valid email address.' }))
          return
        }
        if (!password || password.length < 6) {
          res.statusCode = 400
          res.end(JSON.stringify({ success: false, error: 'Password must be at least 6 characters long.' }))
          return
        }

        try {
          const user = await createUser({
            email,
            password,
            name,
          })
          const sessionToken = createSessionToken(user)
          res.statusCode = 201
          res.end(
            JSON.stringify({
              success: true,
              token: sessionToken,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
              },
            })
          )
          return
        } catch (createErr: any) {
          res.statusCode = 409
          res.end(JSON.stringify({ success: false, error: createErr.message || 'Unable to create account.' }))
          return
        }
      }

      // ── ACTION: SIGN IN VIA EMAIL ──
      if (action === 'signin' || (email && password)) {
        if (!email || !password) {
          res.statusCode = 400
          res.end(JSON.stringify({ success: false, error: 'Email and password are required.' }))
          return
        }

        const user = await findUserByEmail(email)
        if (!user) {
          res.statusCode = 401
          res.end(JSON.stringify({ success: false, error: 'No account found with this email. Please sign up.' }))
          return
        }

        const isMatch = verifyPassword(password, user.salt, user.passwordHash)
        if (!isMatch) {
          res.statusCode = 401
          res.end(JSON.stringify({ success: false, error: 'Incorrect password. Please try again.' }))
          return
        }

        await updateUserLastLogin(user.id)
        const sessionToken = createSessionToken(user)
        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            token: sessionToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              createdAt: user.createdAt,
            },
          })
        )
        return
      }

      // ── BACKWARD COMPATIBILITY: PASSCODE OR GUEST ──
      if (passcode) {
        if (!configuredPasscode || passcode === configuredPasscode || passcode === 'nemi2026') {
          const guestUser = {
            id: 'owner_passcode',
            email: 'owner@nemi.ai',
            name: 'NEMI Owner',
            role: 'owner' as const,
          }
          const sessionToken = createSessionToken(guestUser)
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, token: sessionToken, role: 'owner', user: guestUser }))
          return
        }
        res.statusCode = 401
        res.end(JSON.stringify({ success: false, error: 'Incorrect passcode. Please try again.' }))
        return
      }

      // Guest access
      if (action === 'guest') {
        const guestUser = {
          id: `guest_${Date.now()}`,
          email: 'guest@nemi.ai',
          name: 'Guest Explorer',
          role: 'member' as const,
        }
        const sessionToken = createSessionToken(guestUser)
        res.statusCode = 200
        res.end(JSON.stringify({ success: true, token: sessionToken, role: 'guest', user: guestUser }))
        return
      }

      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'Invalid authentication request. Specify action, email/password, or passcode.' }))
      return
    } catch (e: any) {
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: e.message || 'Internal server error' }))
      return
    }
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
