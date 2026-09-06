import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  computeBrainMotion,
  type BrainMotionValues,
  type BrainMotionState,
} from '../src/renderer/src/humanCompanion/companionMotion'

describe('Empirical Challenge 1: Milestone 2 Motion Verification', () => {
  // ══════════════════════════════════════════════════════════════
  // Section 1: Delta Spikes & Extreme Timing Resilience
  // ══════════════════════════════════════════════════════════════
  describe('1. Delta Spikes & Extreme Timing Resilience', () => {
    it('handles delta = 0 without movement or NaN generation', () => {
      const current = { positionZ: 0.85, rotationX: -0.04 }
      const motion = computeBrainMotion(1.0, 0, current, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(motion.positionZ).toBe(0.85)
      expect(motion.rotationX).toBe(-0.04)
      expect(Number.isFinite(motion.positionZ)).toBe(true)
      expect(Number.isFinite(motion.rotationX)).toBe(true)
    })

    it('handles negative delta gracefully without reversing or NaN', () => {
      const current = { positionZ: 0.4, rotationX: -0.01 }
      const motion = computeBrainMotion(2.0, -0.016, current, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(motion.positionZ).toBe(0.4)
      expect(motion.rotationX).toBe(-0.01)
    })

    it('handles sudden massive lag spikes (delta = 0.5s, 2s, 10s) without overshooting target Z', () => {
      const spikeDeltas = [0.5, 1.0, 2.0, 10.0]
      for (const delta of spikeDeltas) {
        const motion = computeBrainMotion(5.0, delta, { positionZ: 0, rotationX: 0 }, {
          isListening: true,
          isThinking: false,
          isSpeaking: false,
          audioLevel: 0,
          companionEnabled: true,
        })
        expect(motion.positionZ).toBe(1.35)
        expect(motion.rotationX).toBe(-0.075)
      }
    })

    it('handles non-finite delta (NaN, Infinity, -Infinity) by fallback to 0.016s step', () => {
      const corruptedDeltas = [NaN, Infinity, -Infinity]
      for (const badDelta of corruptedDeltas) {
        const motion = computeBrainMotion(1.0, badDelta, { positionZ: 0, rotationX: 0 }, {
          isListening: true,
          isThinking: false,
          isSpeaking: false,
          audioLevel: 0,
          companionEnabled: true,
        })
        expect(Number.isFinite(motion.positionZ)).toBe(true)
        expect(Number.isFinite(motion.rotationX)).toBe(true)
        expect(motion.positionZ).toBeGreaterThan(0)
        expect(motion.positionZ).toBeLessThan(1.35)
      }
    })

    it('handles non-finite elapsed time (NaN, Infinity, negative) by falling back to t=0', () => {
      const corruptedTimes = [NaN, Infinity, -Infinity, -500]
      for (const badTime of corruptedTimes) {
        const motion = computeBrainMotion(badTime, 0.016, { positionZ: 0, rotationX: 0 }, {
          isListening: false,
          isThinking: false,
          isSpeaking: false,
          audioLevel: 0,
          companionEnabled: true,
        })
        for (const s of motion.scale) {
          expect(Number.isFinite(s)).toBe(true)
          expect(s).toBeGreaterThan(0.9)
          expect(s).toBeLessThan(1.2)
        }
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Section 2: Extreme Audio Values & Accessor Fault Injection
  // ══════════════════════════════════════════════════════════════
  describe('2. Extreme Audio Values & Accessor Fault Injection', () => {
    it('clamps negative audio level to 0', () => {
      const quiet = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 0,
        companionEnabled: true,
      })
      const negative = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: -999,
        companionEnabled: true,
      })
      expect(negative.excitation).toBe(quiet.excitation)
      expect(negative.scale).toEqual(quiet.scale)
    })

    it('clamps extreme audio level (> 1.5) to safe maximum bound 1.5', () => {
      const atMax = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 1.5,
        companionEnabled: true,
      })
      const wayAbove = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 50_000,
        companionEnabled: true,
      })
      expect(wayAbove.excitation).toBe(atMax.excitation)
      expect(wayAbove.scale).toEqual(atMax.scale)
    })

    it('safely handles non-numeric or corrupted audio values (NaN, Infinity, null, string)', () => {
      const quiet = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 0,
        companionEnabled: true,
      })
      const invalidValues = [NaN, Infinity, -Infinity, null, undefined, 'loud' as any, {} as any]
      for (const val of invalidValues) {
        const m = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
          isListening: false,
          isThinking: false,
          isSpeaking: true,
          audioLevel: val,
          companionEnabled: true,
        })
        expect(m.excitation).toBe(quiet.excitation)
        expect(m.scale).toEqual(quiet.scale)
      }
    })

    it('gracefully handles throwing audio getter callback without crashing', () => {
      const brokenGetter = () => {
        throw new Error('AudioContext crashed or disconnected')
      }
      expect(() => {
        computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
          isListening: false,
          isThinking: false,
          isSpeaking: true,
          audioLevel: brokenGetter,
          companionEnabled: true,
        })
      }).not.toThrow()

      const result = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: brokenGetter,
        companionEnabled: true,
      })
      expect(result.excitation).toBe(1.25)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Section 3: Smooth Convergence of positionZ
  // ══════════════════════════════════════════════════════════════
  describe('3. Smooth Convergence of positionZ', () => {
    it('strictly monotonic forward convergence from 0.0 to +1.35 on listening', () => {
      let current = { positionZ: 0, rotationX: 0 }
      const state: BrainMotionState = {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      }

      const zHistory: number[] = [current.positionZ]

      for (let frame = 0; frame < 120; frame++) {
        const motion = computeBrainMotion(frame * 0.016, 0.016, current, state)
        // Strictly monotonic increase
        expect(motion.positionZ).toBeGreaterThan(current.positionZ)
        // Zero overshoot
        expect(motion.positionZ).toBeLessThanOrEqual(1.35)

        current = { positionZ: motion.positionZ, rotationX: motion.rotationX }
        zHistory.push(current.positionZ)
      }

      // Reaches > 90% in ~45 frames (0.72s)
      expect(zHistory[45]).toBeGreaterThan(1.35 * 0.9)
      // Reaches > 99% in ~80 frames (1.28s)
      expect(zHistory[80]).toBeGreaterThan(1.35 * 0.99)
      // Fully converged at frame 120
      expect(current.positionZ).toBeGreaterThan(1.349)
    })

    it('strictly monotonic return convergence from 1.35 to 0.0 on idle', () => {
      let current = { positionZ: 1.35, rotationX: -0.075 }
      const state: BrainMotionState = {
        isListening: false,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      }

      const zHistory: number[] = [current.positionZ]

      for (let frame = 0; frame < 120; frame++) {
        const motion = computeBrainMotion(frame * 0.016, 0.016, current, state)
        // Strictly monotonic decrease
        expect(motion.positionZ).toBeLessThan(current.positionZ)
        // Zero undershoot
        expect(motion.positionZ).toBeGreaterThanOrEqual(0.0)

        current = { positionZ: motion.positionZ, rotationX: motion.rotationX }
        zHistory.push(current.positionZ)
      }

      // Reaches < 10% in ~45 frames
      expect(zHistory[45]).toBeLessThan(1.35 * 0.1)
      // Fully returned at frame 120 (< 0.001)
      expect(current.positionZ).toBeLessThan(0.001)
    })

    it('converges reliably across different display refresh rates (30Hz, 60Hz, 120Hz)', () => {
      const refreshRates = [30, 60, 120]
      for (const fps of refreshRates) {
        const dt = 1 / fps
        let current = { positionZ: 0, rotationX: 0 }
        const steps = Math.round(1.5 * fps)

        for (let i = 0; i < steps; i++) {
          const m = computeBrainMotion(i * dt, dt, current, {
            isListening: true,
            isThinking: false,
            isSpeaking: false,
            audioLevel: 0,
            companionEnabled: true,
          })
          current = { positionZ: m.positionZ, rotationX: m.rotationX }
        }

        expect(current.positionZ).toBeGreaterThan(1.35 * 0.99)
        expect(current.positionZ).toBeLessThanOrEqual(1.35)
      }
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Section 4: Current State Glitch Immunity & Out-of-Bounds Clamping
  // ══════════════════════════════════════════════════════════════
  describe('4. Current State Glitch Immunity & Out-of-Bounds Clamping', () => {
    it('handles undefined current state gracefully', () => {
      const motion = computeBrainMotion(1.0, 0.016, undefined as any, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(Number.isFinite(motion.positionZ)).toBe(true)
      expect(Number.isFinite(motion.rotationX)).toBe(true)
    })

    it('handles NaN current values by falling back to 0', () => {
      const motion = computeBrainMotion(1.0, 0.016, { positionZ: NaN, rotationX: NaN }, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(Number.isFinite(motion.positionZ)).toBe(true)
      expect(Number.isFinite(motion.rotationX)).toBe(true)
      expect(motion.positionZ).toBeGreaterThan(0)
    })

    it('safely clamps and recovers from extreme current position (Z = 500)', () => {
      const motion = computeBrainMotion(1.0, 0.016, { positionZ: 500, rotationX: 0 }, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      // Clamped to 10 in logic, then lerped toward 1.35
      expect(motion.positionZ).toBeLessThan(10)
      expect(motion.positionZ).toBeGreaterThan(1.35)
      expect(Number.isFinite(motion.positionZ)).toBe(true)
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Section 5: Decoupling & Architecture Compliance
  // ══════════════════════════════════════════════════════════════
  describe('5. Decoupling & Architecture Compliance', () => {
    it('verifies NemiBrain.tsx has zero imports from humanCompanion', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/components/NemiBrain.tsx'),
        'utf-8'
      )
      expect(content).not.toMatch(/import.*from\s+['"].*\/humanCompanion.*['"]/)
    })

    it('verifies computeBrainMotion returns baseline when companionEnabled is false', () => {
      const motion = computeBrainMotion(3.0, 0.016, { positionZ: 1.0, rotationX: -0.05 }, {
        isListening: true,
        isThinking: true,
        isSpeaking: true,
        audioLevel: 1.0,
        companionEnabled: false,
      })
      expect(motion.scale).toEqual([1, 1, 1])
      expect(motion.positionZ).toBe(0)
      expect(motion.rotationX).toBe(0)
      expect(motion.rotationSpeedY).toBe(0.04)
      expect(motion.excitation).toBe(1.0)
    })
  })
})
