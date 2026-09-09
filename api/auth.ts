import type { IncomingMessage, ServerResponse } from 'http'
import * as crypto from 'crypto'

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
  })
}

function createToken(passcode: string): string {
  const secret = process.env.NEMI_AUTH_PASSCODE || 'nemi-default-secret'
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${passcode}-${Date.now()}`)
  return Buffer.from(JSON.stringify({ t: Date.now(), sig: hmac.digest('hex') })).toString('base64url')
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
    // Return whether auth is enabled
    res.statusCode = 200
    res.end(
      JSON.stringify({
        authEnabled: Boolean(configuredPasscode),
        type: 'passcode',
      })
    )
    return
  }

  if (req.method === 'POST') {
    const body = await parseBody(req)
    const { passcode, token, action } = body

    if (action === 'verify') {
      if (!configuredPasscode) {
        res.statusCode = 200
        res.end(JSON.stringify({ valid: true, guest: true }))
        return
      }
      // Simple verification of token existence and age (< 30 days)
      try {
        if (!token) throw new Error('No token provided')
        const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
        const isFresh = Date.now() - decoded.t < 30 * 24 * 60 * 60 * 1000
        res.statusCode = 200
        res.end(JSON.stringify({ valid: isFresh }))
        return
      } catch {
        res.statusCode = 200
        res.end(JSON.stringify({ valid: false }))
        return
      }
    }

    // Login check
    if (!configuredPasscode) {
      // No passcode configured -> open access
      const token = createToken('guest')
      res.statusCode = 200
      res.end(JSON.stringify({ success: true, token, role: 'owner' }))
      return
    }

    if (passcode === configuredPasscode) {
      const token = createToken(passcode)
      res.statusCode = 200
      res.end(JSON.stringify({ success: true, token, role: 'owner' }))
      return
    }

    res.statusCode = 401
    res.end(JSON.stringify({ success: false, error: 'Incorrect passcode. Please try again.' }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
