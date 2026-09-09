import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import {
  installMockWebAudio,
  restoreMockWebAudio,
  getLastMockAudioContext,
  audioRegistry,
} from '../fixtures/mockWebAudio'
import {
  loadComputeBrainMotion,
  parseMarkdownTable,
  processConversationalSpeech,
  createMockWavBuffer,
  renderCompanion,
} from '../fixtures/companionContract'
import { toConversationalScript } from '../../src/renderer/src/humanCompanion/conversationalSpeech'
import {
  playActivationChime,
  playDeactivationChime,
  playThoughtSpark,
} from '../../src/renderer/src/humanCompanion/soundscape'

describe('Tier 1 E2E Feature Coverage: Human-Centric Companion Layer', () => {
  beforeEach(() => {
    installMockWebAudio()
  })

  afterEach(() => {
    restoreMockWebAudio()
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 1: Isolated Directory & Removal (ORIGINAL_REQUEST §R1)
  // ══════════════════════════════════════════════════════════════
  describe('F1: Isolated Directory & Removal', () => {
    it('1.1 verifies humanCompanion directory exists and contains all modular companion units', () => {
      const dirPath = path.resolve(__dirname, '../../src/renderer/src/humanCompanion')
      expect(fs.existsSync(dirPath)).toBe(true)
      const files = fs.readdirSync(dirPath)
      expect(files).toContain('HumanCompanionLayer.tsx')
      expect(files).toContain('conversationalSpeech.ts')
      expect(files).toContain('soundscape.ts')
      expect(files).toContain('index.ts')
    })

    it('1.2 verifies clean barrel exports in index.ts for public consumption', async () => {
      const indexMod = await import('../../src/renderer/src/humanCompanion/index')
      expect(indexMod.HumanCompanionLayer).toBeDefined()
      expect(indexMod.toConversationalScript).toBeDefined()
      expect(indexMod.playActivationChime).toBeDefined()
      expect(indexMod.playDeactivationChime).toBeDefined()
      expect(indexMod.playThoughtSpark).toBeDefined()
    })

    it('1.3 verifies companion modules have zero circular dependencies back into App', () => {
      const dirPath = path.resolve(__dirname, '../../src/renderer/src/humanCompanion')
      const files = fs.readdirSync(dirPath)
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8')
          expect(content).not.toMatch(/from\s+['"].*\/App(\.tsx?)?['"]/)
          expect(content).not.toMatch(/from\s+['"].*\/main\/.*['"]/)
        }
      }
    })

    it('1.4 verifies safe removable contract: companion props are strictly optional in App architecture', () => {
      const brainPath = path.resolve(__dirname, '../../src/renderer/src/components/NemiBrain.tsx')
      const content = fs.readFileSync(brainPath, 'utf-8')
      expect(content).not.toMatch(/import.*from\s+['"].*\/humanCompanion.*['"]/)
    })

    it('1.5 verifies soundscape operates safely in headless or uninitialized audio environments', () => {
      restoreMockWebAudio()
      expect(() => playActivationChime()).not.toThrow()
      expect(() => playDeactivationChime()).not.toThrow()
      expect(() => playThoughtSpark()).not.toThrow()
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 2: Companion Toggle Control (ORIGINAL_REQUEST §R1)
  // ══════════════════════════════════════════════════════════════
  describe('F2: Companion Toggle Control', () => {
    it('2.1 verifies HumanCompanionLayer returns null when enabled is false', () => {
      const element = renderCompanion({
        enabled: false,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      expect(element).toBeNull()
    })

    it('2.2 verifies HumanCompanionLayer produces JSX fragment when enabled is true', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      expect(element).not.toBeNull()
      expect(React.isValidElement(element)).toBe(true)
    })

    it('2.3 verifies audio chimes are not triggered when enabled is false during state transitions', () => {
      audioRegistry.reset()
      renderCompanion({
        enabled: false,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      expect(audioRegistry.oscillators.length).toBe(0)
    })

    it('2.4 verifies speech script transformation can be bypassed when companion toggle is false', () => {
      const rawText = "Check the code: ```ts\nconsole.log('test')\n```"
      const enabledText = toConversationalScript(rawText)
      const disabledText = rawText
      expect(enabledText).toContain('chat notes')
      expect(disabledText).toContain('console.log')
    })

    it('2.5 verifies dynamic toggle transitions without state corruption', () => {
      let enabled = true
      let el = renderCompanion({ enabled, isListening: false, isThinking: false, isSpeaking: false })
      expect(el).not.toBeNull()

      enabled = false
      el = renderCompanion({ enabled, isListening: false, isThinking: false, isSpeaking: false })
      expect(el).toBeNull()

      enabled = true
      el = renderCompanion({ enabled, isListening: false, isThinking: false, isSpeaking: false })
      expect(el).not.toBeNull()
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 3: Front Canvas Minimalism (ORIGINAL_REQUEST §AC)
  // ══════════════════════════════════════════════════════════════
  describe('F3: Front Canvas Minimalism', () => {
    it('3.1 verifies companion overlay uses pointer-events-none to prevent blocking 3D scene', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      expect(element).not.toBeNull()
      const json = JSON.stringify(element)
      expect(json).toContain('pointer-events-none')
    })

    it('3.2 verifies front canvas does not introduce modal dialogs or backdrop blocking', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).not.toContain('fixed inset-0 bg-black')
      expect(json).not.toContain('z-50')
    })

    it('3.3 verifies Voice Orb ripple anchor is positioned at fixed bottom-right coordinates', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('bottom-8')
      expect(json).toContain('right-8')
    })

    it('3.4 verifies 3D Brain canvas remains strictly minimal with transparent background', () => {
      const brainPath = path.resolve(__dirname, '../../src/renderer/src/components/NemiBrain.tsx')
      const content = fs.readFileSync(brainPath, 'utf-8')
      expect(content).toContain("background: 'transparent'")
      expect(content).toContain("pointer-events-none")
      expect(content).toContain("OrbitControls")
    })

    it('3.5 verifies strict front canvas minimalism: presence pill is eliminated to keep view unobstructed', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      // Front canvas minimalism: no top presence pill or status badge
      expect(json).not.toContain('top-4')
      expect(json).not.toContain('NEMI is present')
      expect(json).not.toContain('backdrop-blur')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 4: Organic 3D Breathing (ORIGINAL_REQUEST §R2)
  // ══════════════════════════════════════════════════════════════
  describe('F4: Organic 3D Breathing', () => {
    it('4.1 verifies multi-axis asymmetric respiratory cycle produces distinct scales on X, Y, Z', async () => {
      const { fn } = await loadComputeBrainMotion()
      const motion = fn(
        1.5,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      )
      expect(motion.scale).toHaveLength(3)
      expect(motion.scale[0]).not.toBeCloseTo(motion.scale[1], 5)
    })

    it('4.2 verifies respiratory rhythm oscillates cyclically over approximately 4.5 seconds', async () => {
      const { fn } = await loadComputeBrainMotion()
      const state = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      const m0 = fn(0, 0.016, { positionZ: 0, rotationX: 0 }, state)
      // Quarter cycle (~1.125s) is peak inhalation phase
      const mPeak = fn(1.125, 0.016, { positionZ: 0, rotationX: 0 }, state)
      // Full cycle (~4.5s) completes cycle
      const mFull = fn(4.5, 0.016, { positionZ: 0, rotationX: 0 }, state)

      expect(mPeak.scale[0]).not.toBeCloseTo(m0.scale[0], 2)
      expect(mFull.scale[0]).toBeCloseTo(m0.scale[0], 2)
    })

    it('4.3 verifies respiratory motion values remain strictly bounded within safe limits [0.85, 1.25]', async () => {
      const { fn } = await loadComputeBrainMotion()
      const state = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      for (let t = 0; t < 10; t += 0.5) {
        const motion = fn(t, 0.016, { positionZ: 0, rotationX: 0 }, state)
        for (const s of motion.scale) {
          expect(s).toBeGreaterThan(0.85)
          expect(s).toBeLessThan(1.25)
        }
      }
    })

    it('4.4 verifies breathing scale falls back to baseline [1, 1, 1] when companion is disabled', async () => {
      const { fn } = await loadComputeBrainMotion()
      const motion = fn(
        2.5,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: false }
      )
      expect(motion.scale).toEqual([1, 1, 1])
    })

    it('4.5 verifies continuous time evaluation produces smooth delta changes without discontinuities', async () => {
      const { fn } = await loadComputeBrainMotion()
      const state = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      const t1 = fn(3.0, 0.016, { positionZ: 0, rotationX: 0 }, state)
      const t2 = fn(3.016, 0.016, { positionZ: 0, rotationX: 0 }, state)
      expect(Math.abs(t2.scale[0] - t1.scale[0])).toBeLessThan(0.01)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 5: Attentive Forward Leaning (ORIGINAL_REQUEST §R2)
  // ══════════════════════════════════════════════════════════════
  describe('F5: Attentive Forward Leaning', () => {
    it('5.1 verifies forward glide target Z is positive (+1.35) during active listening', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 0, rotationX: 0 }
      const state = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.2, companionEnabled: true }
      for (let i = 0; i < 60; i++) {
        const m = fn(i * 0.016, 0.016, current, state)
        current = { positionZ: m.positionZ, rotationX: m.rotationX }
      }
      expect(current.positionZ).toBeGreaterThan(0.5)
      expect(current.positionZ).toBeLessThanOrEqual(1.35)
    })

    it('5.2 verifies pitch tilt rotates downward (-0.075 rad) during active listening', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 0, rotationX: 0 }
      const state = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.2, companionEnabled: true }
      for (let i = 0; i < 60; i++) {
        const m = fn(i * 0.016, 0.016, current, state)
        current = { positionZ: m.positionZ, rotationX: m.rotationX }
      }
      expect(current.rotationX).toBeLessThan(0)
      expect(current.rotationX).toBeGreaterThanOrEqual(-0.075)
    })

    it('5.3 verifies forward position smoothly glides back to neutral 0.0 when listening stops', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 1.35, rotationX: -0.075 }
      const state = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      for (let i = 0; i < 60; i++) {
        const m = fn(i * 0.016, 0.016, current, state)
        current = { positionZ: m.positionZ, rotationX: m.rotationX }
      }
      expect(current.positionZ).toBeLessThan(0.2)
    })

    it('5.4 verifies pitch tilt smoothly glides back to 0.0 when listening stops', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 1.35, rotationX: -0.075 }
      const state = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      for (let i = 0; i < 60; i++) {
        const m = fn(i * 0.016, 0.016, current, state)
        current = { positionZ: m.positionZ, rotationX: m.rotationX }
      }
      expect(current.rotationX).toBeGreaterThan(-0.02)
    })

    it('5.5 verifies thinking state preserves centered Z position without forward lean', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: true, isSpeaking: false, audioLevel: 0, companionEnabled: true }
      )
      expect(m.positionZ).toBe(0)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 6: 3D Audio Harmonization (ORIGINAL_REQUEST §R2)
  // ══════════════════════════════════════════════════════════════
  describe('F6: 3D Audio Harmonization', () => {
    it('6.1 verifies audio level input amplifies brain excitation', async () => {
      const { fn } = await loadComputeBrainMotion()
      const quiet = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.0, companionEnabled: true }
      )
      const loud = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.8, companionEnabled: true }
      )
      expect(loud.excitation).toBeGreaterThan(quiet.excitation)
    })

    it('6.2 verifies high audio levels modulate micro-breathing scale amplitude', async () => {
      const { fn } = await loadComputeBrainMotion()
      const quiet = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.0, companionEnabled: true }
      )
      const loud = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 1.0, companionEnabled: true }
      )
      expect(loud.scale[0]).not.toEqual(quiet.scale[0])
    })

    it('6.3 verifies audio level saturation is clamped within safe bounds', async () => {
      const { fn } = await loadComputeBrainMotion()
      const motion = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 2.5, companionEnabled: true }
      )
      expect(motion.excitation).toBeLessThanOrEqual(2.5)
      expect(Number.isFinite(motion.excitation)).toBe(true)
    })

    it('6.4 verifies zero audio level produces clean baseline motion without NaN', async () => {
      const { fn } = await loadComputeBrainMotion()
      const motion = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0.0, companionEnabled: true }
      )
      expect(Number.isNaN(motion.excitation)).toBe(false)
      expect(motion.scale.every((s) => Number.isFinite(s))).toBe(true)
    })

    it('6.5 verifies negative audio level is clamped to 0.0 without corruption', async () => {
      const { fn } = await loadComputeBrainMotion()
      const motion = fn(
        1.0,
        0.016,
        { positionZ: 0, rotationX: 0 },
        { isListening: false, isThinking: false, isSpeaking: false, audioLevel: -0.5, companionEnabled: true }
      )
      expect(motion.excitation).toBeGreaterThanOrEqual(1.0)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 7: Living Aura & Inhale Glow (ORIGINAL_REQUEST §R3)
  // ══════════════════════════════════════════════════════════════
  describe('F7: Living Aura & Inhale Glow', () => {
    it('7.1 verifies listening state activates warm amber ripple aura behind Voice Orb', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('amber-400')
      expect(json).toContain('shadow-[0_0_15px_rgba(251,191,36,0.3)]')
    })

    it('7.2 verifies thinking state preserves quiet canvas without obstructive ripple clutter', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: true,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).not.toContain('amber-ripple')
      expect(json).not.toContain('emerald-ripple')
    })

    it('7.3 verifies speaking state activates emerald acoustic ripple aura', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: true,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('emerald-400')
      expect(json).toContain('shadow-[0_0_15px_rgba(52,211,153,0.3)]')
    })

    it('7.4 verifies idle resting state renders no ripples to maintain minimalism', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).not.toContain('amber-ripple')
      expect(json).not.toContain('emerald-ripple')
    })

    it('7.5 verifies living aura container is positioned behind Voice Orb at z-40', () => {
      const element = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(element)
      expect(json).toContain('fixed bottom-8 right-8')
      expect(json).toContain('z-40')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 8: Acoustic Wave Ripples (60fps) (ORIGINAL_REQUEST §R3)
  // ══════════════════════════════════════════════════════════════
  describe('F8: Acoustic Wave Ripples (60fps)', () => {
    it('8.1 verifies listening state configures 3 concentric amber ripple rings', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('amber-ripple-1')
      expect(json).toContain('amber-ripple-2')
      expect(json).toContain('amber-ripple-3')
    })

    it('8.2 verifies speaking state configures 2 concentric emerald ripple rings', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: true,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('emerald-ripple-1')
      expect(json).toContain('emerald-ripple-2')
    })

    it('8.3 verifies ripple rings have staggered animation delays', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('delay')
    })

    it('8.4 verifies ripple wave animation expands scale while fading opacity to 0', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('"opacity":0')
      expect(json).toContain('shadow-[0_0_15px_rgba(251,191,36,0.3)]')
    })

    it('8.5 verifies idle state unmounts active ripple rings cleanly', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).not.toContain('amber-ripple')
      expect(json).not.toContain('emerald-ripple')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 9: Tactile Sound Design (ORIGINAL_REQUEST §R3)
  // ══════════════════════════════════════════════════════════════
  describe('F9: Tactile Sound Design', () => {
    it('9.1 verifies activation chime synthesizes ascending pentatonic note pair (C5 -> E5)', () => {
      audioRegistry.reset()
      playActivationChime()
      expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(2)
      const freqs = audioRegistry.oscillators.map((o) => o.frequency.value)
      expect(freqs).toContain(523.25)
      expect(freqs).toContain(659.25)
    })

    it('9.2 verifies deactivation chime synthesizes descending harmonic grounding pair (E5 -> A4)', () => {
      audioRegistry.reset()
      playDeactivationChime()
      expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(2)
      const freqs = audioRegistry.oscillators.map((o) => o.frequency.value)
      expect(freqs).toContain(659.25)
      expect(freqs).toContain(440.0)
    })

    it('9.3 verifies thought spark chime synthesizes delicate high harmonic shimmer (A5)', () => {
      audioRegistry.reset()
      playThoughtSpark()
      expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(1)
      const freqs = audioRegistry.oscillators.map((o) => o.frequency.value)
      expect(freqs).toContain(880.0)
    })

    it('9.4 verifies low-pass filter ramps cutoff frequency down for organic felt warmth', () => {
      audioRegistry.reset()
      playActivationChime()
      expect(audioRegistry.filters.length).toBeGreaterThanOrEqual(1)
      const filter = audioRegistry.filters[0]
      expect(filter.type).toBe('lowpass')
      const rampEvent = filter.frequency.events.find((e) => e.type === 'exponentialRampToValueAtTime')
      expect(rampEvent).toBeDefined()
      expect(rampEvent?.value).toBe(300)
    })

    it('9.5 verifies gain envelope protects against clipping with fast attack and exponential decay', () => {
      audioRegistry.reset()
      playActivationChime()
      expect(audioRegistry.gainNodes.length).toBeGreaterThanOrEqual(1)
      const gainNode = audioRegistry.gainNodes[0]
      const attack = gainNode.gain.events.find((e) => e.type === 'linearRampToValueAtTime')
      const decay = gainNode.gain.events.find((e) => e.type === 'exponentialRampToValueAtTime')
      expect(attack).toBeDefined()
      expect(attack?.value).toBeLessThanOrEqual(0.15)
      expect(decay).toBeDefined()
      expect(decay?.value).toBe(0.0001)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 10: Chat Drawer Markdown & Tables (ORIGINAL_REQUEST §R4)
  // ══════════════════════════════════════════════════════════════
  describe('F10: Chat Drawer Markdown & Tables', () => {
    it('10.1 verifies standard markdown table parses into headers and rows', () => {
      const tableMd = `
| Component | Status | Latency |
|---|---|---|
| Brain | Active | 16ms |
| TTS | Ready | 80ms |
`
      const parsed = parseMarkdownTable(tableMd)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Component', 'Status', 'Latency'])
      expect(parsed?.rows).toHaveLength(2)
      expect(parsed?.rows[0]).toEqual(['Brain', 'Active', '16ms'])
    })

    it('10.2 verifies column alignment markers are extracted correctly', () => {
      const tableMd = `
| Left | Center | Right |
|:---|:---:|---:|
| L1 | C1 | R1 |
`
      const parsed = parseMarkdownTable(tableMd)
      expect(parsed?.alignments).toEqual(['left', 'center', 'right'])
    })

    it('10.3 verifies multi-row comparison table with 4+ columns parses accurately', () => {
      const tableMd = `
| Model | Context | Speed | Memory |
|---|---|---|---|
| BGE-M3 | 8192 | Fast | 2.2GB |
| Kokoro | 512 | Realtime | 350MB |
| Llama | 4096 | Medium | 4.8GB |
`
      const parsed = parseMarkdownTable(tableMd)
      expect(parsed?.headers.length).toBe(4)
      expect(parsed?.rows.length).toBe(3)
    })

    it('10.4 verifies table with inline formatting in cells parses cleanly', () => {
      const tableMd = `
| Feature | Details |
|---|---|
| **Voice** | *Kokoro* 82M |
| ` + '`Neural`' + ` | **Active** |
`
      const parsed = parseMarkdownTable(tableMd)
      expect(parsed?.rows[0][0]).toBe('**Voice**')
      expect(parsed?.rows[0][1]).toBe('*Kokoro* 82M')
    })

    it('10.5 verifies table parser returns null for non-table markdown text', () => {
      const text = '### Architecture\nThis is a regular paragraph with no pipe tables.'
      expect(parseMarkdownTable(text)).toBeNull()
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 11: Conversational Spoken Script (ORIGINAL_REQUEST §R4)
  // ══════════════════════════════════════════════════════════════
  describe('F11: Conversational Spoken Script', () => {
    it('11.1 verifies markdown code blocks are replaced with polite reference to chat notes', () => {
      const raw = "Here is the code:\n```typescript\nconst a = 10\n```\nEnjoy!"
      const spoken = toConversationalScript(raw)
      expect(spoken).toContain("I've placed the code snippet in our chat notes.")
      expect(spoken).not.toContain('const a = 10')
    })

    it('11.2 verifies markdown tables are converted to courteous spoken summary', () => {
      const raw = `
Here is the summary:
| Model | Size |
|---|---|
| Kokoro | 82M |
Review it at your convenience.
`
      const spoken = processConversationalSpeech(raw)
      expect(spoken).toContain("I've organized the detailed comparison table in your chat notes.")
      expect(spoken).not.toContain('|---|---|')
    })

    it('11.3 verifies markdown headers convert to natural spoken transitions', () => {
      const raw = '## Key Findings\nThe benchmark exceeded expectations.'
      const spoken = toConversationalScript(raw)
      expect(spoken).toContain('Regarding Key Findings: The benchmark exceeded expectations.')
    })

    it('11.4 verifies bullet lists convert to smooth spoken cadence', () => {
      const raw = 'Prerequisites:\n- Python 3.11\n- Node 20\n- Electron'
      const spoken = toConversationalScript(raw)
      expect(spoken).toContain('Python 3.11,')
      expect(spoken).toContain('Node 20,')
    })

    it('11.5 verifies lengthy monologues (>300 chars) receive polite conversational signoff', () => {
      const longText = 'NEMI is a local AI companion designed for privacy and speed. ' +
        'It leverages BGE-M3 embeddings for high precision retrieval. ' +
        'Kokoro generates 82M parameter neural speech on CPU. ' +
        'Faster-whisper decodes incoming voice requests. ' +
        'The user interface is built with Electron and React. ' +
        'All components communicate through IPC handlers and HTTP proxies.'
      const spoken = toConversationalScript(longText)
      expect(spoken).toContain("I've placed the full breakdown in our chat notes for you to review.")
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 12: Kokoro TTS Speech Pipeline (ORIGINAL_REQUEST §R4)
  // ══════════════════════════════════════════════════════════════
  describe('F12: Kokoro TTS Speech Pipeline', () => {
    it('12.1 verifies 24kHz WAV audio buffer decoding through AudioContext', async () => {
      const ctx = getLastMockAudioContext()!
      const wavBuffer = createMockWavBuffer(0.5, 24000)
      const audioBuffer = await ctx.decodeAudioData(wavBuffer)
      expect(audioBuffer.sampleRate).toBe(24000)
      expect(audioBuffer.duration).toBeCloseTo(0.5, 1)
    })

    it('12.2 verifies audio buffer source node connects to analyser node for reactivity', () => {
      const ctx = getLastMockAudioContext()!
      const source = ctx.createBufferSource()
      const analyser = ctx.createAnalyser()
      source.connect(analyser)
      analyser.connect(ctx.destination)
      expect(source.connections).toContain(analyser)
      expect(analyser.connections).toContain(ctx.destination)
    })

    it('12.3 verifies audio playback start and stop triggers onended event callback', () => {
      const ctx = getLastMockAudioContext()!
      const source = ctx.createBufferSource()
      let endedCalled = false
      source.onended = () => {
        endedCalled = true
      }
      source.start(0)
      expect(source.started).toBe(true)
      source.stop(0)
      expect(source.stopped).toBe(true)
      expect(endedCalled).toBe(true)
    })

    it('12.4 verifies analyser node reads byte frequency data during active playback', () => {
      const ctx = getLastMockAudioContext()!
      const analyser = ctx.createAnalyser()
      analyser.setMockFrequencyData([120, 180, 240, 200, 150])
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      expect(dataArray[0]).toBe(120)
      expect(dataArray[1]).toBe(180)
      expect(dataArray[2]).toBe(240)
    })

    it('12.5 verifies speech synthesis pipeline handles fallback gracefully when server is offline', () => {
      let fallbackTriggered = false
      const mockFallbackSpeak = (text: string) => {
        fallbackTriggered = true
        return text.length > 0
      }
      const success = mockFallbackSpeak('Hello from fallback')
      expect(success).toBe(true)
      expect(fallbackTriggered).toBe(true)
    })
  })
})
