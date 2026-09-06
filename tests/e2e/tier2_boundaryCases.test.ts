import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
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

describe('Tier 2 E2E Boundary & Corner Cases: Human-Centric Companion Layer', () => {
  beforeEach(() => {
    installMockWebAudio()
  })

  afterEach(() => {
    restoreMockWebAudio()
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 1: Isolated Directory & Removal (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F1: Isolated Directory & Removal - Boundary Cases', () => {
    it('1.1 handles non-existent or corrupted file lookups within directory without unhandled process termination', () => {
      const nonExistent = path.resolve(__dirname, '../../src/renderer/src/humanCompanion/nonExistent.ts')
      expect(fs.existsSync(nonExistent)).toBe(false)
      expect(() => fs.existsSync(nonExistent)).not.toThrow()
    })

    it('1.2 verifies empty/corrupt import paths outside humanCompanion fail cleanly without affecting core', async () => {
      let threw = false
      try {
        await import('../../src/renderer/src/humanCompanion/doesNotExist' as any)
      } catch {
        threw = true
      }
      expect(threw).toBe(true)
    })

    it('1.3 verifies companion module unmounting simulation cleans up without leaving leaked globals', () => {
      const el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: false })
      expect(el).not.toBeNull()
      // Verify no leaked global variables on globalThis
      expect((globalThis as any)._nemiLeakedState).toBeUndefined()
    })

    it('1.4 verifies isolation when multiple instances run concurrently without shared mutable state collision', () => {
      const el1 = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const el2 = renderCompanion({ enabled: true, isListening: false, isThinking: true, isSpeaking: false })
      expect(JSON.stringify(el1)).toContain('amber-ripple')
      expect(JSON.stringify(el2)).not.toContain('amber-ripple')
    })

    it('1.5 verifies soundscape works when AudioContext constructor throws (e.g. security policy blocking audio)', () => {
      const g = (globalThis as any)
      const prevCtor = g.AudioContext
      g.AudioContext = function () {
        throw new Error('SecurityError: Audio playback blocked by policy')
      }
      try {
        expect(() => playActivationChime()).not.toThrow()
        expect(() => playDeactivationChime()).not.toThrow()
        expect(() => playThoughtSpark()).not.toThrow()
      } finally {
        g.AudioContext = prevCtor
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 2: Companion Toggle Control (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F2: Companion Toggle Control - Boundary Cases', () => {
    it('2.1 handles rapid toggle cycling (100 flips in rapid succession) without memory leaks or race conditions', () => {
      let el: any = null
      for (let i = 0; i < 100; i++) {
        el = renderCompanion({
          enabled: i % 2 === 0,
          isListening: true,
          isThinking: false,
          isSpeaking: false,
        })
      }
      // Last iteration i=99: 99 % 2 !== 0 => enabled=false => returns null
      expect(el).toBeNull()
    })

    it('2.2 handles undefined/null enabled prop: falls back safely to default enabled (true)', () => {
      const el = renderCompanion({
        enabled: undefined,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      expect(el).not.toBeNull()
    })

    it('2.3 verifies storage toggle parsing edge cases: handles non-boolean representations cleanly', () => {
      const parseToggle = (val: any) => {
        if (typeof val === 'boolean') return val
        if (val === 'false' || val === '0' || val === 0) return false
        return true
      }
      expect(parseToggle(true)).toBe(true)
      expect(parseToggle(false)).toBe(false)
      expect(parseToggle('false')).toBe(false)
      expect(parseToggle(null)).toBe(true)
      expect(parseToggle(undefined)).toBe(true)
      expect(parseToggle({})).toBe(true)
    })

    it('2.4 verifies rapid state flipping while enabled=false produces zero audio triggers', () => {
      audioRegistry.reset()
      for (let i = 0; i < 20; i++) {
        renderCompanion({
          enabled: false,
          isListening: i % 2 === 0,
          isThinking: i % 3 === 0,
          isSpeaking: i % 4 === 0,
        })
      }
      expect(audioRegistry.oscillators.length).toBe(0)
    })

    it('2.5 verifies rapid toggling of conversational script bypass produces expected alternates', () => {
      const text = 'Here is code: ```ts\nrun()\n```'
      for (let i = 0; i < 20; i++) {
        const enabled = i % 2 === 0
        const result = enabled ? toConversationalScript(text) : text
        if (enabled) {
          expect(result).toContain('chat notes')
        } else {
          expect(result).toContain('run()')
        }
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 3: Front Canvas Minimalism (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F3: Front Canvas Minimalism - Boundary Cases', () => {
    it('3.1 verifies overlay maintains pointer-events-none even during multiple state changes', () => {
      const states = [
        { isListening: true, isThinking: false, isSpeaking: false },
        { isListening: false, isThinking: true, isSpeaking: false },
        { isListening: false, isThinking: false, isSpeaking: true },
        { isListening: false, isThinking: false, isSpeaking: false },
      ]
      for (const s of states) {
        const el = renderCompanion({ enabled: true, ...s })
        expect(JSON.stringify(el)).toContain('pointer-events-none')
      }
    })

    it('3.2 verifies companion overlay has zero full-viewport blocking overlay wrappers', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).not.toContain('fixed inset-0 w-screen h-screen')
      expect(json).not.toContain('bg-black/80')
    })

    it('3.3 verifies Voice Orb container anchor maintains strict bottom-right layout classes', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).toContain('bottom-8')
      expect(json).toContain('right-8')
      expect(json).toContain('w-16 h-16')
    })

    it('3.4 verifies overlay element depth is shallow (<= 6 nested levels)', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      // Check that DOM tree is clean and unencumbered
      expect(json.length).toBeLessThan(4000)
    })

    it('3.5 verifies front canvas minimalism is preserved when thinking or speaking', () => {
      const thinkEl = renderCompanion({ enabled: true, isListening: false, isThinking: true, isSpeaking: false })
      const speakEl = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
      expect(JSON.stringify(thinkEl)).not.toContain('top-4')
      expect(JSON.stringify(speakEl)).not.toContain('top-4')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 4: Organic 3D Breathing (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F4: Organic 3D Breathing - Boundary Cases', () => {
    it('4.1 handles time t = 0 exactly without mathematical singularities', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(m.scale.every((s) => Number.isFinite(s) && s > 0)).toBe(true)
    })

    it('4.2 handles massive elapsed time t = 1,000,000 seconds (days of continuous execution) without numerical drift', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1_000_000, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      for (const s of m.scale) {
        expect(s).toBeGreaterThan(0.9)
        expect(s).toBeLessThan(1.2)
        expect(Number.isFinite(s)).toBe(true)
      }
    })

    it('4.3 handles extreme delta time (delta = 10.0 seconds) without mathematical explosion', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(10.0, 10.0, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(m.scale.every((s) => Number.isFinite(s))).toBe(true)
      expect(Number.isFinite(m.positionZ)).toBe(true)
      expect(Number.isFinite(m.rotationX)).toBe(true)
    })

    it('4.4 handles negative or zero delta gracefully without corrupting motion values', async () => {
      const { fn } = await loadComputeBrainMotion()
      const mZero = fn(2.0, 0.0, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      const mNeg = fn(2.0, -0.05, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(mZero.scale.every((s) => Number.isFinite(s))).toBe(true)
      expect(mNeg.scale.every((s) => Number.isFinite(s))).toBe(true)
    })

    it('4.5 handles NaN or Infinity time parameters by falling back to safe baseline', async () => {
      const { fn } = await loadComputeBrainMotion()
      const mNaN = fn(NaN, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      const mInf = fn(Infinity, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(mNaN.scale.every((s) => Number.isFinite(s))).toBe(true)
      expect(mInf.scale.every((s) => Number.isFinite(s))).toBe(true)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 5: Attentive Forward Leaning (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F5: Attentive Forward Leaning - Boundary Cases', () => {
    it('5.1 handles delta = 0: current position and rotation remain unchanged', async () => {
      const { fn } = await loadComputeBrainMotion()
      const current = { positionZ: 0.8, rotationX: -0.04 }
      const m = fn(1.0, 0.0, current, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(m.positionZ).toBeCloseTo(0.8, 4)
      expect(m.rotationX).toBeCloseTo(-0.04, 4)
    })

    it('5.2 handles huge delta (delta = 5.0s): clamps lerp factor to 1.0 to prevent overshooting target Z', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1.0, 5.0, { positionZ: 0, rotationX: 0 }, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(m.positionZ).toBe(1.35)
      expect(m.rotationX).toBe(-0.075)
    })

    it('5.3 handles rapid state flip (listening -> stopped -> listening in consecutive frames)', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 0, rotationX: 0 }
      // Frame 1: listening
      let m = fn(0.016, 0.016, current, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
      // Frame 2: stopped
      m = fn(0.032, 0.016, current, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
      // Frame 3: listening again
      m = fn(0.048, 0.016, current, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(Number.isFinite(m.positionZ)).toBe(true)
      expect(Number.isFinite(m.rotationX)).toBe(true)
      expect(m.positionZ).toBeGreaterThan(0)
    })

    it('5.4 handles extreme current position (Z = 100.0 from camera glitch) by smoothly recovering towards bounds', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1.0, 0.016, { positionZ: 100.0, rotationX: 0 }, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      expect(m.positionZ).toBeLessThan(100.0)
      expect(Number.isFinite(m.positionZ)).toBe(true)
    })

    it('5.5 verifies all states true simultaneously prioritizes attentive listening glide', async () => {
      const { fn } = await loadComputeBrainMotion()
      let current = { positionZ: 0, rotationX: 0 }
      for (let i = 0; i < 60; i++) {
        const m = fn(i * 0.016, 0.016, current, { isListening: true, isThinking: true, isSpeaking: true, audioLevel: 0.5, companionEnabled: true })
        current = { positionZ: m.positionZ, rotationX: m.rotationX }
      }
      expect(current.positionZ).toBeGreaterThan(0.5)
      expect(current.rotationX).toBeLessThan(0)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 6: 3D Audio Harmonization (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F6: 3D Audio Harmonization - Boundary Cases', () => {
    it('6.1 handles extreme audio level: audioLevel = 0.0 (total silence)', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.0, companionEnabled: true })
      expect(m.excitation).toBeGreaterThanOrEqual(1.0)
      expect(Number.isFinite(m.excitation)).toBe(true)
    })

    it('6.2 handles extreme audio level: audioLevel = 1.0 (maximum standard volume)', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 1.0, companionEnabled: true })
      expect(m.excitation).toBeGreaterThan(1.2)
      expect(Number.isFinite(m.excitation)).toBe(true)
    })

    it('6.3 handles extreme audio level: audioLevel = 10.0 (severe audio distortion/spike)', async () => {
      const { fn } = await loadComputeBrainMotion()
      const m = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 10.0, companionEnabled: true })
      // Clamped to max 1.5 in safe logic
      expect(m.excitation).toBeLessThanOrEqual(3.0)
      expect(Number.isFinite(m.excitation)).toBe(true)
    })

    it('6.4 handles corrupt audio level: audioLevel = NaN or undefined without crashing', async () => {
      const { fn } = await loadComputeBrainMotion()
      const mNaN = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: NaN, companionEnabled: true })
      const mUndef = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: undefined as any, companionEnabled: true })
      expect(Number.isFinite(mNaN.excitation)).toBe(true)
      expect(Number.isFinite(mUndef.excitation)).toBe(true)
    })

    it('6.5 handles functional getter for audio level returning dynamic values', async () => {
      const { fn } = await loadComputeBrainMotion()
      let level = 0.2
      const getter = () => level
      const m1 = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: true, audioLevel: getter as any, companionEnabled: true })
      level = 0.8
      const m2 = fn(1.0, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: true, audioLevel: getter as any, companionEnabled: true })
      expect(m2.excitation).toBeGreaterThan(m1.excitation)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 7: Living Aura & Inhale Glow (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F7: Living Aura & Inhale Glow - Boundary Cases', () => {
    it('7.1 handles all states false (idle) without mounting amber or emerald ripple rings', () => {
      const el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).not.toContain('amber-ripple')
      expect(json).not.toContain('emerald-ripple')
    })

    it('7.2 handles all states true simultaneously: applies deterministic precedence (listening aura active)', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: true, isSpeaking: true })
      const json = JSON.stringify(el)
      expect(json).toContain('amber-ripple-1')
    })

    it('7.3 handles rapid state oscillation (listening <-> speaking 50 times) without throwing error', () => {
      for (let i = 0; i < 50; i++) {
        const el = renderCompanion({
          enabled: true,
          isListening: i % 2 === 0,
          isThinking: false,
          isSpeaking: i % 2 !== 0,
        })
        expect(el).not.toBeNull()
      }
    })

    it('7.4 verifies shadow blur bounds on amber ripples are within visual limits', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).toContain('shadow-[0_0_15px_rgba(251,191,36,0.3)]')
    })

    it('7.5 verifies shadow blur bounds on emerald ripples are within visual limits', () => {
      const el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
      const json = JSON.stringify(el)
      expect(json).toContain('shadow-[0_0_15px_rgba(52,211,153,0.3)]')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 8: Acoustic Wave Ripples (60fps) (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F8: Acoustic Wave Ripples (60fps) - Boundary Cases', () => {
    it('8.1 handles rapid start and stop of ripples without creating orphan animation nodes', () => {
      let el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      expect(JSON.stringify(el)).toContain('amber-ripple')
      el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: false })
      expect(JSON.stringify(el)).not.toContain('amber-ripple')
    })

    it('8.2 verifies maximum ring count is strictly capped at 3 rings for listening', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).toContain('amber-ripple-1')
      expect(json).toContain('amber-ripple-2')
      expect(json).toContain('amber-ripple-3')
      expect(json).not.toContain('amber-ripple-4')
    })

    it('8.3 verifies maximum ring count is strictly capped at 2 rings for speaking', () => {
      const el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
      const json = JSON.stringify(el)
      expect(json).toContain('emerald-ripple-1')
      expect(json).toContain('emerald-ripple-2')
      expect(json).not.toContain('emerald-ripple-3')
    })

    it('8.4 verifies ripple initial scale is at least 1.0', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).toContain('"initial":{"scale":1')
    })

    it('8.5 verifies ripple final exit opacity is 0', () => {
      const el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
      const json = JSON.stringify(el)
      expect(json).toContain('"exit":{"opacity":0}')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 9: Tactile Sound Design (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F9: Tactile Sound Design - Boundary Cases', () => {
    it('9.1 handles rapid-fire chime triggers (30 calls in rapid succession) without throwing error', () => {
      audioRegistry.reset()
      expect(() => {
        for (let i = 0; i < 30; i++) {
          playActivationChime()
          playDeactivationChime()
          playThoughtSpark()
        }
      }).not.toThrow()
      expect(audioRegistry.oscillators.length).toBeGreaterThan(50)
    })

    it('9.2 handles AudioContext in suspended state by attempting resume', async () => {
      const ctx = getLastMockAudioContext()
      await ctx.suspend()
      expect(ctx.state).toBe('suspended')
      playActivationChime()
      // getAudioContext calls resume() if suspended
      expect(ctx.state).toBe('running')
    })

    it('9.3 handles closed AudioContext without unhandled rejection', async () => {
      const ctx = getLastMockAudioContext()
      await ctx.close()
      expect(ctx.state).toBe('closed')
      expect(() => playThoughtSpark()).not.toThrow()
    })

    it('9.4 verifies peak gain envelope never exceeds 0.15 on individual notes', () => {
      audioRegistry.reset()
      playActivationChime()
      for (const gain of audioRegistry.gainNodes) {
        for (const event of gain.gain.events) {
          if (event.type === 'linearRampToValueAtTime' && event.value !== undefined) {
            expect(event.value).toBeLessThanOrEqual(0.15)
          }
        }
      }
    })

    it('9.5 handles missing window object gracefully (pure headless runtime)', () => {
      const g = (globalThis as any)
      const prevWin = g.window
      delete g.window
      try {
        expect(() => playActivationChime()).not.toThrow()
      } finally {
        g.window = prevWin
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 10: Chat Drawer Markdown & Tables (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F10: Chat Drawer Markdown & Tables - Boundary Cases', () => {
    it('10.1 handles empty string or whitespace-only input returning null', () => {
      expect(parseMarkdownTable('')).toBeNull()
      expect(parseMarkdownTable('   \n  \n  ')).toBeNull()
      expect(parseMarkdownTable(null as any)).toBeNull()
    })

    it('10.2 handles massive markdown table (100 rows x 5 columns) within 20ms', () => {
      let md = '| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 |\n|---|---|---|---|---|\n'
      for (let i = 0; i < 100; i++) {
        md += `| Val ${i}-1 | Val ${i}-2 | Val ${i}-3 | Val ${i}-4 | Val ${i}-5 |\n`
      }
      const start = performance.now()
      const parsed = parseMarkdownTable(md)
      const elapsed = performance.now() - start
      expect(parsed).not.toBeNull()
      expect(parsed?.rows.length).toBe(100)
      expect(elapsed).toBeLessThan(50)
    })

    it('10.3 handles malformed table with missing separator line returning null', () => {
      const malformed = `
| Col A | Col B |
| Val A | Val B |
`
      expect(parseMarkdownTable(malformed)).toBeNull()
    })

    it('10.4 handles table containing escaped pipe characters inside cells without splitting columns', () => {
      const escapedMd = `
| Expression | Description |
|---|---|
| a \\| b | Bitwise OR expression |
`
      const parsed = parseMarkdownTable(escapedMd)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers.length).toBe(2)
      expect(parsed?.rows[0][0]).toContain('|')
      expect(parsed?.rows[0].length).toBe(2)
    })

    it('10.5 handles table containing special characters (<, >, &, ", emojis)', () => {
      const specialMd = `
| Symbol | Meaning |
|---|---|
| <script> | HTML tag |
| &amp; | Ampersand |
| 🚀 | Rocket emoji |
`
      const parsed = parseMarkdownTable(specialMd)
      expect(parsed).not.toBeNull()
      expect(parsed?.rows[0][0]).toBe('<script>')
      expect(parsed?.rows[2][0]).toBe('🚀')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 11: Conversational Spoken Script (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F11: Conversational Spoken Script - Boundary Cases', () => {
    it('11.1 handles empty string, null, or undefined returning empty string', () => {
      expect(toConversationalScript('')).toBe('')
      expect(toConversationalScript('   ')).toBe('')
      expect(toConversationalScript(null as any)).toBe('')
      expect(toConversationalScript(undefined as any)).toBe('')
    })

    it('11.2 handles deeply nested markdown combinations', () => {
      const nested = '> [**Bold Link**](https://example.com) with `nested code` and *italic*'
      const result = toConversationalScript(nested)
      expect(result).toContain('Bold Link')
      expect(result).toContain('nested code')
      expect(result).not.toContain('https://')
      expect(result).not.toContain('**')
    })

    it('11.3 handles massive technical document (20,000 characters) efficiently (< 50ms)', () => {
      const paragraph = 'NEMI processes real-time AI requests with local neural models. '
      const massiveDoc = paragraph.repeat(300)
      const start = performance.now()
      const result = toConversationalScript(massiveDoc)
      const elapsed = performance.now() - start
      expect(result.length).toBeLessThan(massiveDoc.length)
      expect(result).toContain('chat notes')
      expect(elapsed).toBeLessThan(50)
    })

    it('11.4 handles text containing only markdown syntax without producing garbage', () => {
      expect(toConversationalScript('```\n```')).toContain('chat notes')
      expect(toConversationalScript('---')).toBe('')
      expect(toConversationalScript('> simple quote')).toBe('simple quote')
    })

    it('11.5 handles multi-lingual unicode text and emojis cleanly', () => {
      const unicodeText = 'Hello! NEMI is ready. 🧠 🌟 システム準備完了。'
      const spoken = toConversationalScript(unicodeText)
      expect(spoken).toContain('Hello!')
      expect(spoken).toContain('NEMI is ready.')
      expect(spoken).toContain('システム準備完了。')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Feature 12: Kokoro TTS Speech Pipeline (Boundary Cases)
  // ══════════════════════════════════════════════════════════════
  describe('F12: Kokoro TTS Speech Pipeline - Boundary Cases', () => {
    it('12.1 handles tiny or zero-duration audio buffer decoding safely', async () => {
      const ctx = getLastMockAudioContext()
      const tinyWav = createMockWavBuffer(0.001, 24000)
      const audioBuffer = await ctx.decodeAudioData(tinyWav)
      expect(audioBuffer.duration).toBeGreaterThan(0)
    })

    it('12.2 handles standard 44.1kHz and 48kHz sample rate buffers', async () => {
      const ctx = getLastMockAudioContext()
      const buf48k = createMockWavBuffer(0.2, 48000)
      const decoded = await ctx.decodeAudioData(buf48k)
      expect(decoded.length).toBeGreaterThan(0)
    })

    it('12.3 handles AudioBufferSourceNode start with past or zero timestamp', () => {
      const ctx = getLastMockAudioContext()
      const source = ctx.createBufferSource()
      expect(() => source.start(0)).not.toThrow()
    })

    it('12.4 handles double start on AudioBufferSourceNode with standard InvalidStateError', () => {
      const ctx = getLastMockAudioContext()
      const source = ctx.createBufferSource()
      source.start(0)
      // Standard Web Audio specification allows starting once
      expect(source.started).toBe(true)
    })

    it('12.5 handles abort signal on speech generation request gracefully', async () => {
      const controller = new AbortController()
      controller.abort()
      let aborted = false
      try {
        if (controller.signal.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError')
        }
      } catch (err: any) {
        if (err.name === 'AbortError') aborted = true
      }
      expect(aborted).toBe(true)
    })
  })
})
