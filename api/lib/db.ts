import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

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

// Determine storage path based on environment
function getStoragePath(): string {
  if (process.env.NEMI_DB_PATH) {
    return process.env.NEMI_DB_PATH
  }
  // If running on Vercel or read-only filesystem, use /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'nemi_users.json')
  }
  // Local environment
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

// In-memory cache for ultra-fast queries within the same process
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
  } catch (e) {
    // Direct write fallback
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
    } catch (writeErr) {
      console.error('Failed to persist user database to disk:', writeErr)
    }
  }
}

// ── Cryptographic Hashing Utilities ──

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

// ── Database Operations ──

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

export const OWNER_EMAILS = ['abhi@uncodemy.com', 'admin@uncodemy.com']

export function resolveUserRole(email: string, isFirstUser: boolean = false): 'owner' | 'member' {
  const norm = normalizeEmail(email)
  if (OWNER_EMAILS.includes(norm)) return 'owner'
  if (process.env.NEMI_OWNER_EMAIL && normalizeEmail(process.env.NEMI_OWNER_EMAIL) === norm) return 'owner'
  return isFirstUser ? 'owner' : 'member'
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
    role: params.role || resolveUserRole(key, isFirstUser),
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

export async function getAllUsers(): Promise<Array<Omit<UserRecord, 'passwordHash' | 'salt'>>> {
  const db = loadDatabase()
  return Object.values(db.users).map(({ passwordHash, salt, ...safeUser }) => safeUser)
}

// Reset helper for unit testing
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
