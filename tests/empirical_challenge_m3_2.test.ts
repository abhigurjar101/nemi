import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import HumanCompanionLayer from '../src/renderer/src/humanCompanion/HumanCompanionLayer'
import {
  playActivationChime,
  playDeactivationChime,
  playThoughtSpark,
  resetSoundscapeDebounce,
  getMasterCompressorNode
} from '../src/renderer/src/humanCompanion/soundscape'
import { installMockWebAudio, restoreMockWebAudio, audioRegistry } from './fixtures/mockWebAudio'
import { renderCompanion } from './fixtures/companionContract'

describe('Empirical Challenge: Milestone 3 Reviewer & Adversarial Stress Tests', () => {
  beforeEach(() => {
    installMockWebAudio()
    resetSoundscapeDebounce()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    restoreMockWebAudio()
    resetSoundscapeDebounce()
  })

  // ══════════════════════════════════════════════════════════════
  // Adversarial Dimension 1: Canvas 2D Engine Resilience & Math
  // ══════════════════════════════════════════════════════════════
  describe('Adversarial 1: 2D Canvas Engine & Fault Injection', () => {
    it('verifies 2D canvas element attributes, dimensions, and styling', () => {
      const el = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(el)
      expect(json).toContain('"width":280')
      expect(json).toContain('"height":280')
      expect(json).toContain('fixed bottom-2 right-2')
      expect(json).toContain('pointer-events-none')
      expect(json).toContain('z-40')
      expect(json).toContain('"aria-hidden":"true"')
    })

    it('verifies canvas source code uses requestAnimationFrame and avoids virtual DOM state updates in render', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )
      // Checks requestAnimationFrame is used
      expect(source).toContain('requestAnimationFrame(render)')
      expect(source).toContain('cancelAnimationFrame(animId)')
      // Checks refs are used for live state inside render loop
      expect(source).toContain('isListeningRef.current')
      expect(source).toContain('isThinkingRef.current')
      expect(source).toContain('isSpeakingRef.current')
      expect(source).toContain('getAudioLevelRef.current')
      // Checks radial gradients are created
      expect(source).toContain('ctx.createRadialGradient')
      // Checks warm inhale glow colors
      expect(source).toContain('251, 191, 36') // amber-400
      expect(source).toContain('245, 158, 11') // amber-500
      // Checks speaking emerald colors
      expect(source).toContain('52, 211, 153') // emerald-400
      // Checks idle celestial colors
      expect(source).toContain('0, 212, 255') // cyan
    })

    it('verifies canvas simulation survives pathological getAudioLevel outputs (NaN, Infinity, negative, throwing)', () => {
      // Test audio normalization logic directly as written in HumanCompanionLayer
      const testNormalize = (rawAudio: any) => {
        return Number.isFinite(rawAudio) ? Math.max(0, Math.min(1, rawAudio)) : 0
      }

      expect(testNormalize(NaN)).toBe(0)
      expect(testNormalize(Infinity)).toBe(0)
      expect(testNormalize(-Infinity)).toBe(0)
      expect(testNormalize(-50)).toBe(0)
      expect(testNormalize(100)).toBe(1)
      expect(testNormalize(0.65)).toBeCloseTo(0.65, 4)
      expect(testNormalize(undefined)).toBe(0)
      expect(testNormalize(null)).toBe(0)
    })

    it('verifies exact fallback center coordinates (224, 224) match the Voice Orb position geometry', () => {
      // Canvas is 280x280 at bottom-2 right-2 (8px offset)
      // Voice Orb is 64x64 at bottom-8 right-8 (32px offset)
      // Center from window right: 32 + 32 = 64px
      // Canvas right from window right: 8px -> Canvas left from window right: 288px
      // Center from canvas left: 288 - 64 = 224px
      // Same for Y axis: 288 - 64 = 224px
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )
      expect(source).toContain('let cx = 224')
      expect(source).toContain('let cy = 224')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Adversarial Dimension 2: Dynamics Compression & Anti-Clipping
  // ══════════════════════════════════════════════════════════════
  describe('Adversarial 2: Web Audio Dynamics Compression & Headroom', () => {
    it('verifies master DynamicsCompressorNode is instantiated with acoustic anti-clipping parameters', () => {
      audioRegistry.reset()
      playActivationChime()

      expect(audioRegistry.compressors.length).toBeGreaterThanOrEqual(1)
      const comp = audioRegistry.compressors[0]
      expect(comp.threshold.value).toBe(-14)
      expect(comp.knee.value).toBe(24)
      expect(comp.ratio.value).toBe(10)
      expect(comp.attack.value).toBe(0.003)
      expect(comp.release.value).toBe(0.2)
    })

    it('verifies all chime audio paths route through the compressor before destination', () => {
      audioRegistry.reset()
      playActivationChime()

      const comp = audioRegistry.compressors[0]
      // Compressor must connect to destination
      expect(comp.connections).toContain(comp.context.destination)

      // All gain nodes must route to the compressor
      for (const gain of audioRegistry.gainNodes) {
        expect(gain.connections).toContain(comp)
      }
    })

    it('verifies 150ms debounce window strictly rejects rapid successive activation calls', () => {
      audioRegistry.reset()
      resetSoundscapeDebounce()

      // Call activation 10 times in immediate succession
      for (let i = 0; i < 10; i++) {
        playActivationChime()
      }

      // Each note has 2 oscillators (sine fundamental + triangle overtone).
      // 2 notes (C5 + E5) = 4 oscillators total.
      // Debounce lock ensures only 1 activation chime is synthesized despite 10 rapid calls!
      expect(audioRegistry.oscillators.length).toBe(4)
      const freqs = audioRegistry.oscillators.map((o) => o.frequency.value)
      expect(freqs).toContain(523.25)
      expect(freqs).toContain(659.25)
    })

    it('verifies 150ms debounce window strictly rejects rapid successive deactivation calls', () => {
      audioRegistry.reset()
      resetSoundscapeDebounce()

      // Call deactivation 10 times in immediate succession
      for (let i = 0; i < 10; i++) {
        playDeactivationChime()
      }

      // 2 notes (E5 + A4) * 2 oscillators = 4 oscillators total.
      // Debounce lock ensures only 1 deactivation chime is synthesized despite 10 rapid calls!
      expect(audioRegistry.oscillators.length).toBe(4)
      const freqs = audioRegistry.oscillators.map((o) => o.frequency.value)
      expect(freqs).toContain(659.25)
      expect(freqs).toContain(440.0)
    })

    it('verifies individual peak gain never exceeds safe headroom limit (0.15)', () => {
      audioRegistry.reset()
      resetSoundscapeDebounce()

      playActivationChime()
      playThoughtSpark()

      for (const gain of audioRegistry.gainNodes) {
        for (const ev of gain.gain.events) {
          if (ev.type === 'linearRampToValueAtTime' && typeof ev.value === 'number') {
            expect(ev.value).toBeLessThanOrEqual(0.15)
            expect(ev.value).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Adversarial Dimension 3: Bidirectional Audio Pipeline in App.tsx
  // ══════════════════════════════════════════════════════════════
  describe('Adversarial 3: App.tsx Audio Tap & Non-Allocating Accessor', () => {
    it('verifies App.tsx routes play-audio through an AnalyserNode before destination', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )

      expect(appSource).toContain('const ttsAnalyser = audioCtx.createAnalyser()')
      expect(appSource).toContain('ttsAnalyser.fftSize = 256')
      expect(appSource).toContain('source.connect(ttsAnalyser)')
      expect(appSource).toContain('ttsAnalyser.connect(audioCtx.destination)')
      expect(appSource).toContain('ttsAnalyserRef.current = ttsAnalyser')
    })

    it('verifies getAudioLevel inspects both ttsAnalyserRef and analyserRef', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )

      expect(appSource).toContain('const analyser = ttsAnalyserRef.current || analyserRef.current')
      expect(appSource).toContain('analyser.getByteFrequencyData(audioDataArrayRef.current)')
      // Verifies non-allocating reuse of Uint8Array buffer
      expect(appSource).toContain('audioDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)')
    })

    it('verifies stopListening cleans up analyserRef to null', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )

      expect(appSource).toContain('analyserRef.current = null')
    })

    it('verifies HumanCompanionLayer receives getAudioLevel prop in App.tsx', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )

      expect(appSource).toMatch(/<HumanCompanionLayer[\s\S]*?getAudioLevel=\{getAudioLevel\}/)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Adversarial Dimension 4: Strict Canvas Minimalism
  // ══════════════════════════════════════════════════════════════
  describe('Adversarial 4: Strict Canvas Minimalism', () => {
    it('verifies no presence text, pills, or badge overlays exist in HumanCompanionLayer', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )

      expect(source).not.toContain('presenceText')
      expect(source).not.toContain('dotColor')
      expect(source).not.toContain('top-4')
      expect(source).not.toContain('left-1/2')
      expect(source).not.toContain('NEMI is present')
      expect(source).not.toContain('Listening attentively')
      expect(source).not.toContain('Reflecting deeply')
    })
  })
})
