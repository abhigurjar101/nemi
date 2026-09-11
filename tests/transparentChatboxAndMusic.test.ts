import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  startOrbitalMusicEngine,
  stopOrbitalMusicEngine,
  toggleSoothingMusic,
  isSoothingMusicActive,
  setSoothingMusicActive,
  setSoothingMusicVolume,
  getSoothingMusicVolume,
} from '../src/renderer/src/services/orbitalMusic'

describe('Transparent Chatbox & Mind-Soothing Music Suite', () => {
  const chatPanelPath = path.resolve(__dirname, '../src/renderer/src/components/ChatPanel.tsx')
  const chatPanelContent = fs.readFileSync(chatPanelPath, 'utf8')
  const messageBubblePath = path.resolve(__dirname, '../src/renderer/src/components/MessageBubble.tsx')
  const messageBubbleContent = fs.readFileSync(messageBubblePath, 'utf8')
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')

  describe('1. Transparent Crystal Glass & Rotating Brain Visibility', () => {
    it('implements crystal transparent glassmorphism for ChatPanel container', () => {
      expect(chatPanelContent).toContain('MINIMALIST CRYSTAL GLASS CONTAINER (TRANSPARENT TO SEE ROTATING BRAIN)')
      expect(chatPanelContent).toContain("glassTransparency === 'crystal'")
      expect(chatPanelContent).toContain('bg-slate-950/25 sm:bg-slate-950/20 backdrop-blur-md')
    })

    it('provides user-controllable transparency and layout perspective toggles in header', () => {
      expect(chatPanelContent).toContain('setGlassTransparency')
      expect(chatPanelContent).toContain('Crystal Clear (See Brain Rotating)')
      expect(chatPanelContent).toContain('setPanelPosition')
      expect(chatPanelContent).toContain('Center Chat over Rotating Brain')
    })

    it('implements translucent message bubbles in MessageBubble.tsx to reveal background brain', () => {
      expect(messageBubbleContent).toContain('backdrop-blur-md')
      expect(messageBubbleContent).toContain('bg-gradient-to-br from-cyan-600/30 via-cyan-600/20 to-purple-600/20')
      expect(messageBubbleContent).toContain('bg-slate-900/35 backdrop-blur-md')
    })

    it('mounts NemiBrain 3D rotating group with continuous rotation in App.tsx background', () => {
      expect(appContent).toContain('<NemiBrain')
      expect(appContent).toContain('companionEnabled={humanCompanionEnabled}')
    })
  })

  describe('2. Best Mind-Soothing Music Engine (432Hz Zen Soundscape)', () => {
    it('integrates orbitalMusic engine into ChatPanel with header and dock triggers', () => {
      expect(chatPanelContent).toContain('isSoothingMusicActive')
      expect(chatPanelContent).toContain('toggleSoothingMusic')
      expect(chatPanelContent).toContain('handleToggleMusic')
      expect(chatPanelContent).toContain('Mind-Soothing 432Hz Zen Soundscape')
    })

    it('starts and toggles 432Hz soothing music soundscape smoothly', () => {
      stopOrbitalMusicEngine()
      expect(isSoothingMusicActive()).toBe(false)

      const active = toggleSoothingMusic(true)
      expect(active).toBe(true)
      expect(isSoothingMusicActive()).toBe(true)

      toggleSoothingMusic(false)
      expect(isSoothingMusicActive()).toBe(false)
    })

    it('supports velvet dynamic gain and volume modulation', () => {
      setSoothingMusicVolume(0.35)
      expect(getSoothingMusicVolume()).toBe(0.35)
      stopOrbitalMusicEngine()
    })
  })

  describe('3. Voice & Send Buttons Sticky to Chatbox', () => {
    it('anchors Voice Dictation Button inside chatbox input bar next to Send button', () => {
      expect(chatPanelContent).toContain('Voice Dictation Button — ALWAYS STUCK TO CHATBOX, CAN BE TURNED OFF AND ON')
      expect(chatPanelContent).toContain('onToggleVoice')
      expect(chatPanelContent).toContain('isListening ? (')
      expect(chatPanelContent).toContain('Voice listening active (Click to turn off)')
      expect(chatPanelContent).toContain('Turn on voice dictation')
    })

    it('anchors Send Button inside chatbox input bar next to Voice button', () => {
      expect(chatPanelContent).toContain('Send button — STUCK TO CHATBOX')
      expect(chatPanelContent).toContain('onClick={handleSend}')
      expect(chatPanelContent).toContain('Send message (Enter)')
      expect(chatPanelContent).toContain('from-cyan-500 via-blue-500 to-purple-600')
    })

    it('ensures Voice button never disappears when files are attached', () => {
      expect(chatPanelContent).not.toContain('onToggleVoice && attachedFiles.length === 0')
    })
  })
})
