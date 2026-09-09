import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { extractVoiceIntent } from '../src/renderer/src/voiceActivation'

describe('Mobile Interface & Unified Header Architecture', () => {
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')

  it('separates desktop toolbar from mobile controls via responsive Tailwind breakpoints', () => {
    // Desktop toolbar must be hidden on mobile screens (< md)
    expect(appContent).toContain('hidden md:flex items-center gap-1.5')
    // Mobile controls must be hidden on desktop screens (>= md)
    expect(appContent).toContain('flex md:hidden items-center gap-1.5')
  })

  it('provides zero-rainbow unified dark glass styling across desktop toolbar buttons', () => {
    // Buttons must use unified subtle border and translucent dark glass
    expect(appContent).toContain('bg-white/[0.04] border border-white/10')
    // No rainbow borders should remain in the header action bar
    expect(appContent).not.toMatch(/border-purple-400\/20[^"]*className/)
    expect(appContent).not.toMatch(/border-amber-400\/20[^"]*className/)
  })

  it('renders a mobile Actions Drawer bottom sheet with all 7 control cards', () => {
    expect(appContent).toContain('mobileMenuOpen && (')
    expect(appContent).toContain('NEMI Control Hub')
    expect(appContent).toContain('Bot Swarm Fleet')
    expect(appContent).toContain('Google Colab Notebook')
    expect(appContent).toContain('Advanced RAG & Documents')
    expect(appContent).toContain('Train on GitHub')
    expect(appContent).toContain('Ingest GitHub Repository')
    expect(appContent).toContain('Sign In / Account')
    expect(appContent).toContain('System Settings')
  })

  it('renders a dedicated Mobile Voice HUD when voice is active on mobile screens', () => {
    expect(appContent).toContain('Listening to Voice')
    expect(appContent).toContain('Send Now')
    expect(appContent).toContain('handleSendVoiceNow')
    expect(appContent).toContain('fixed bottom-6 inset-x-4 md:hidden')
  })

  it('primes mobile audio on user touch to unlock iOS and mobile Safari speech synthesis', () => {
    expect(appContent).toContain('const primeMobileAudio')
    expect(appContent).toContain('silentUtterance.volume = 0.01')
    expect(appContent).toContain('window.speechSynthesis.speak(silentUtterance)')
  })

  it('handles speech pauses resiliently on mobile WebKit without dropping session', () => {
    expect(appContent).toContain("if (err === 'no-speech')")
    expect(appContent).toContain('latestTranscriptRef')
    expect(appContent).toContain('processedTranscriptRef')
  })
})

describe('Direct Mobile Voice Fallback & Intent Handling', () => {
  it('detects direct queries without requiring Hey NEMI wake word on mobile taps', () => {
    const res = extractVoiceIntent('Write a Python script for quicksort')
    expect(res.hasWakeWord).toBe(false)
    expect(res.isWakeOnly).toBe(false)
    // Direct speech query is preserved intact
    expect(res.query).toBe('Write a Python script for quicksort')
  })

  it('detects wake word queries when user prefixes Hey NEMI', () => {
    const res = extractVoiceIntent('Hey NEMI write a binary search algorithm')
    expect(res.hasWakeWord).toBe(true)
    expect(res.isWakeOnly).toBe(false)
    expect(res.query).toBe('write a binary search algorithm')
  })

  it('detects wake-only trigger phrase', () => {
    const res = extractVoiceIntent('Hey NEMI')
    expect(res.hasWakeWord).toBe(true)
    expect(res.isWakeOnly).toBe(true)
    expect(res.query).toBe('')
  })
})

describe('Universal Command Palette & Jupyter/Colab Paste Engine Integration', () => {
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')
  const bubblePath = path.resolve(__dirname, '../src/renderer/src/components/MessageBubble.tsx')
  const bubbleContent = fs.readFileSync(bubblePath, 'utf8')

  it('binds Cmd+K / Ctrl+K and provides desktop and mobile Command Palette triggers', () => {
    expect(appContent).toContain("e.key.toLowerCase() === 'k'")
    expect(appContent).toContain('setCommandPaletteOpen')
    expect(appContent).toContain('Open Command Palette (Cmd+K)')
    expect(appContent).toContain('Universal Command Palette')
  })

  it('renders a universal floating Toast notification for clipboard and export actions', () => {
    expect(appContent).toContain('toastMessage')
    expect(appContent).toContain('showToast')
    expect(appContent).toContain('Universal Floating Toast Feedback')
  })

  it('provides automated self-healing error pipeline in App.tsx and MessageBubble.tsx', () => {
    expect(appContent).toContain('handleAutoFixCode')
    expect(appContent).toContain('SELF-HEALING CODE FIX REQUEST')
    expect(bubbleContent).toContain('Auto-Fix with NEMI')
  })

  it('provides mobile-accessible Colab and Jupyter buttons with cell-ready copying', () => {
    // Colab button must not be hidden on mobile
    expect(bubbleContent).not.toMatch(/className="hidden sm:flex items-center gap-1[^"]*title="Open in Google Colab"/)
    // Must contain dedicated Jupyter / Colab copy button
    expect(bubbleContent).toContain('Copy clean code formatted for Jupyter or Colab')
    expect(bubbleContent).toContain('handleCopyForJupyter')
    expect(bubbleContent).toContain('handleCopyAllJupyter')
  })
})
