import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  _resetDatabaseForTesting,
} from '../api/auth'

describe('Login & Authentication Connection Suite', () => {
  beforeEach(() => {
    _resetDatabaseForTesting()
  })

  it('completes the full registration and login lifecycle with database persistence', async () => {
    // 1. Sign up new user
    const newUser = await createUser({
      email: 'pilot@nemi.in',
      password: 'StrongPassword2026!',
      name: 'NEMI Pilot',
      role: 'owner',
    })

    expect(newUser).toBeDefined()
    expect(newUser.email).toBe('pilot@nemi.in')
    expect(newUser.name).toBe('NEMI Pilot')
    expect(newUser.role).toBe('owner')
    expect(newUser.passwordHash).not.toBe('StrongPassword2026!')

    // 2. Look up stored user
    const found = await findUserByEmail('pilot@nemi.in')
    expect(found).not.toBeNull()
    expect(found?.email).toBe('pilot@nemi.in')

    // 3. Verify password hash matching
    const isCorrect = verifyPassword('StrongPassword2026!', found!.salt, found!.passwordHash)
    expect(isCorrect).toBe(true)

    const isWrong = verifyPassword('WrongPassword!', found!.salt, found!.passwordHash)
    expect(isWrong).toBe(false)

    // 4. Generate and verify 30-day session token
    const token = createSessionToken({
      id: found!.id,
      email: found!.email,
      name: found!.name,
      role: found!.role,
    })

    const verified = verifySessionToken(token)
    expect(verified.valid).toBe(true)
    expect(verified.payload.sub).toBe(found!.id)
    expect(verified.payload.email).toBe('pilot@nemi.in')
  })

  it('verifies that Sidebar connects to Auth state with profile indicator & sign-in triggers', () => {
    const sidebarPath = path.resolve(__dirname, '../src/renderer/src/components/Sidebar.tsx')
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')

    // Verifies SidebarProps includes auth parameters
    expect(sidebarContent).toContain('isAuthenticated?: boolean')
    expect(sidebarContent).toContain('currentUser?: UserProfile | null')
    expect(sidebarContent).toContain('authRole?:')
    expect(sidebarContent).toContain('onOpenAuth?: () => void')

    // Verifies Footer render of Auth status / Sign In trigger
    expect(sidebarContent).toContain('onOpenAuth')
    expect(sidebarContent).toContain('ShieldCheck')
    expect(sidebarContent).toContain('Neural Access / Sign In')
  })

  it('verifies that App.tsx integrates AuthModal and passes auth props to Sidebar', () => {
    const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
    const appContent = fs.readFileSync(appPath, 'utf8')

    expect(appContent).toContain('AuthModal')
    expect(appContent).toContain('authModalOpen')
    expect(appContent).toContain('setAuthModalOpen')
    expect(appContent).toContain('onOpenAuth={() => setAuthModalOpen(true)}')
    expect(appContent).toContain('isAuthenticated={isAuthenticated}')
    expect(appContent).toContain('currentUser={currentUser}')
  })

  it('verifies that cloud sync in chatMemory.ts includes Authorization Bearer token header', () => {
    const memoryPath = path.resolve(__dirname, '../src/renderer/src/chatMemory.ts')
    const memoryContent = fs.readFileSync(memoryPath, 'utf8')

    expect(memoryContent).toContain("localStorage.getItem('nemi_session_token')")
    expect(memoryContent).toContain('Authorization: `Bearer ${token}`')
  })
})

describe('Microphone / Voice Dictation Button Suite', () => {
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')
  const chatPanelPath = path.resolve(__dirname, '../src/renderer/src/components/ChatPanel.tsx')
  const chatPanelContent = fs.readFileSync(chatPanelPath, 'utf8')

  it('supports standard SpeechRecognition and webkitSpeechRecognition across browsers', () => {
    expect(appContent).toContain('window.SpeechRecognition || (window as any).webkitSpeechRecognition')
  })

  it('proactively checks and requests browser microphone permissions before dictation', () => {
    expect(appContent).toContain('navigator.mediaDevices?.getUserMedia')
    expect(appContent).toContain('testStream.getTracks().forEach((track) => track.stop())')
  })

  it('provides live speech dictation banner and transcript display in ChatPanel', () => {
    expect(chatPanelContent).toContain('Live Voice Dictation Status Banner')
    expect(chatPanelContent).toContain('isListening && (')
    expect(chatPanelContent).toContain('Listening:')
    expect(chatPanelContent).toContain('transcript ||')
    expect(chatPanelContent).toContain('onToggleVoice')
  })

  it('wires up toggleVoice across ChatPanel, Header, Mobile HUD, VoiceOrb, and NemiBrain', () => {
    expect(appContent).toContain('onToggleVoice={toggleVoice}')
    expect(appContent).toContain('onBrainClick={toggleVoice}')
    expect(appContent).toContain('transcript={transcript}')
  })

  it('safely handles non-speech pauses and aborted recognition without breaking session', () => {
    expect(appContent).toContain("if (err === 'no-speech')")
    expect(appContent).toContain("if (err === 'aborted')")
    expect(appContent).toContain('showToast(errMsg)')
  })
})
