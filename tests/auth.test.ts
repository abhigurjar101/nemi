import { describe, it, expect, beforeEach } from 'vitest'
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  _resetDatabaseForTesting,
  normalizeEmail,
  createSessionToken,
  verifySessionToken,
} from '../api/auth'

describe('NEMI Database Authentication & User Management', () => {
  beforeEach(() => {
    _resetDatabaseForTesting()
  })

  it('correctly normalizes email addresses', () => {
    expect(normalizeEmail('  Test.User@Example.COM ')).toBe('test.user@example.com')
  })

  it('signs up a new user, hashes password with salt, and persists to database', async () => {
    const user = await createUser({
      email: 'alex@example.com',
      password: 'SecurePassword123!',
      name: 'Alex Mercer',
    })

    expect(user.id).toMatch(/^usr_/)
    expect(user.email).toBe('alex@example.com')
    expect(user.name).toBe('Alex Mercer')
    expect(user.salt).toBeDefined()
    expect(user.salt.length).toBe(32) // 16 bytes hex
    expect(user.passwordHash).toBeDefined()
    expect(user.passwordHash).not.toBe('SecurePassword123!')
    expect(user.role).toBe('owner') // First user is owner

    // Verify user can be looked up
    const retrieved = await findUserByEmail('ALEX@EXAMPLE.COM')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe(user.id)
  })

  it('prevents duplicate email registration', async () => {
    await createUser({
      email: 'dup@example.com',
      password: 'FirstPassword123',
    })

    await expect(
      createUser({
        email: 'dup@example.com',
        password: 'SecondPassword456',
      })
    ).rejects.toThrow(/already exists/i)
  })

  it('rejects passwords shorter than 6 characters', async () => {
    await expect(
      createUser({
        email: 'short@example.com',
        password: '123',
      })
    ).rejects.toThrow(/at least 6 characters/i)
  })

  it('verifies passwords accurately using scrypt with timing-safe comparison', async () => {
    const user = await createUser({
      email: 'login@example.com',
      password: 'MySecretPassword2026',
    })

    // Correct password
    expect(verifyPassword('MySecretPassword2026', user.salt, user.passwordHash)).toBe(true)

    // Wrong password
    expect(verifyPassword('WrongPassword', user.salt, user.passwordHash)).toBe(false)
    expect(verifyPassword('mysecretpassword2026', user.salt, user.passwordHash)).toBe(false)
  })

  it('generates cryptographically signed session JWT tokens and verifies them', () => {
    const user = {
      id: 'usr_test_123',
      email: 'session@example.com',
      name: 'Session User',
      role: 'owner',
    }

    const token = createSessionToken(user)
    expect(token).toBeDefined()
    expect(token.split('.').length).toBe(3) // Header.Payload.Signature

    const verified = verifySessionToken(token)
    expect(verified.valid).toBe(true)
    expect(verified.payload.email).toBe('session@example.com')
    expect(verified.payload.name).toBe('Session User')
    expect(verified.payload.sub).toBe('usr_test_123')
  })

  it('rejects tampered or malformed session tokens', () => {
    const user = {
      id: 'usr_test_123',
      email: 'session@example.com',
      name: 'Session User',
      role: 'owner',
    }
    const token = createSessionToken(user)
    const [header, payload, sig] = token.split('.')

    // Tamper with payload
    const tamperedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'superadmin' })).toString('base64url')
    const tamperedToken = `${header}.${tamperedPayload}.${sig}`

    expect(verifySessionToken(tamperedToken).valid).toBe(false)
    expect(verifySessionToken('completely.invalid.token').valid).toBe(false)
    expect(verifySessionToken('').valid).toBe(false)
  })
})
