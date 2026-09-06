import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { computeBrainMotion, BrainMotionValues, BrainMotionState } from '../src/renderer/src/humanCompanion/companionMotion'
import * as barrelExports from '../src/renderer/src/humanCompanion'
import { loadComputeBrainMotion } from './fixtures/companionContract'

describe('Empirical Challenge: Milestone 2 Reviewer & Adversarial Verification', () => {
  describe('Adversarial Challenge 1: Integrity & Dynamic Loader Verification', () => {
    it('verifies loadComputeBrainMotion resolves to real production implementation, not fallback mock', async () => {
      const loaderResult = await loadComputeBrainMotion()
      expect(loaderResult.isRealImplementation).toBe(true)
      expect(loaderResult.fn).toBe(computeBrainMotion)
    })

    it('verifies barrel export in humanCompanion/index.ts exports computeBrainMotion', () => {
      expect(typeof barrelExports.computeBrainMotion).toBe('function')
    })

    it('verifies zero hard imports from humanCompanion in NemiBrain.tsx', () => {
      const brainSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/components/NemiBrain.tsx'),
        'utf-8'
      )
      expect(brainSource).not.toMatch(/import.*from\s+['"].*humanCompanion.*['"]/)
    })

    it('verifies NemiBrainProps exported from NemiBrain.tsx includes companionEnabled and audioLevel', () => {
      const brainSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/components/NemiBrain.tsx'),
        'utf-8'
      )
      expect(brainSource).toMatch(/export\s+interface\s+NemiBrainProps/)
      expect(brainSource).toContain('companionEnabled?: boolean')
      expect(brainSource).toContain('audioLevel?: number | (() => number)')
    })
  })

  describe('Adversarial Challenge 2: Asymmetric Breathing Cycle Mathematics', () => {
    const idleState: BrainMotionState = {
      isListening: false,
      isThinking: false,
      isSpeaking: false,
      audioLevel: 0,
      companionEnabled: true,
    }

    it('verifies respiratory cycle period is approximately 4.5 seconds', () => {
      const m0 = computeBrainMotion(0, 0.016, { positionZ: 0, rotationX: 0 }, idleState)
      const mQuarter = computeBrainMotion(1.125, 0.016, { positionZ: 0, rotationX: 0 }, idleState)
      const mHalf = computeBrainMotion(2.25, 0.016, { positionZ: 0, rotationX: 0 }, idleState)
      const mFull = computeBrainMotion(4.5, 0.016, { positionZ: 0, rotationX: 0 }, idleState)

      // X scale at 0 should equal X scale at 4.5s (full period 2*PI/4.5)
      expect(mFull.scale[0]).toBeCloseTo(m0.scale[0], 4)
      // Quarter period is peak inhalation
      expect(mQuarter.scale[0]).toBeGreaterThan(m0.scale[0])
      // Half period returns to baseline
      expect(mHalf.scale[0]).toBeCloseTo(m0.scale[0], 4)
    })

    it('verifies multi-axis asymmetry across X, Y, and Z curves', () => {
      // Sample at multiple phases
      let hasAsymmetricScale = false
      for (let t = 0.5; t < 4.0; t += 0.5) {
        const motion = computeBrainMotion(t, 0.016, { positionZ: 0, rotationX: 0 }, idleState)
        const [scaleX, scaleY, scaleZ] = motion.scale
        // Multi-axis expansion is non-uniform (not isotropic scalar scaling)
        if (Math.abs(scaleX - scaleY) > 0.001 || Math.abs(scaleY - scaleZ) > 0.001) {
          hasAsymmetricScale = true
        }
      }
      expect(hasAsymmetricScale).toBe(true)
    })

    it('verifies scale remains strictly within physiological comfort bounds [0.95, 1.15] during idle breath', () => {
      for (let t = 0; t <= 10; t += 0.2) {
        const motion = computeBrainMotion(t, 0.016, { positionZ: 0, rotationX: 0 }, idleState)
        for (const s of motion.scale) {
          expect(s).toBeGreaterThanOrEqual(0.95)
          expect(s).toBeLessThanOrEqual(1.15)
        }
      }
    })
  })

  describe('Adversarial Challenge 3: Attentive Forward Focus & Lean-in Mechanics', () => {
    it('verifies forward translation glides toward +1.35 Z when listening is active', () => {
      const listeningState: BrainMotionState = {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      }

      let current = { positionZ: 0, rotationX: 0 }
      // Simulate 2 seconds at 60fps (120 frames)
      for (let f = 0; f < 120; f++) {
        const motion = computeBrainMotion(f * 0.016, 0.016, current, listeningState)
        current = { positionZ: motion.positionZ, rotationX: motion.rotationX }
      }

      // Should converge to +1.35 within 2 seconds
      expect(current.positionZ).toBeCloseTo(1.35, 2)
      // Pitch tilt should converge to -0.075 rad
      expect(current.rotationX).toBeCloseTo(-0.075, 2)
    })

    it('verifies smooth recovery to neutral (0, 0) when listening turns off', () => {
      let current = { positionZ: 1.35, rotationX: -0.075 }
      const idleState: BrainMotionState = {
        isListening: false,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      }

      for (let f = 0; f < 120; f++) {
        const motion = computeBrainMotion(f * 0.016, 0.016, current, idleState)
        current = { positionZ: motion.positionZ, rotationX: motion.rotationX }
      }

      expect(current.positionZ).toBeCloseTo(0, 2)
      expect(current.rotationX).toBeCloseTo(0, 2)
    })

    it('verifies damped yaw speed is 0.008 rad/s when listening and 0.04 rad/s when idle', () => {
      const listening = computeBrainMotion(0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(listening.rotationSpeedY).toBe(0.008)

      const idle = computeBrainMotion(0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(idle.rotationSpeedY).toBe(0.04)

      const thinking = computeBrainMotion(0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: true,
        isSpeaking: false,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(thinking.rotationSpeedY).toBeCloseTo(0.06, 4)

      const speaking = computeBrainMotion(0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 0,
        companionEnabled: true,
      })
      expect(speaking.rotationSpeedY).toBeCloseTo(0.048, 4)
    })
  })

  describe('Adversarial Challenge 4: Audio Harmonization & Dynamic Accessors', () => {
    it('harmonizes with numeric audioLevel and dynamic getter audioLevel', () => {
      const numericMotion = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 0.75,
        companionEnabled: true,
      })

      const getterMotion = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: () => 0.75,
        companionEnabled: true,
      })

      expect(numericMotion.excitation).toBe(getterMotion.excitation)
      expect(numericMotion.scale).toEqual(getterMotion.scale)
    })

    it('gracefully handles faulty throwing getter without crashing', () => {
      const faultyGetterMotion = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: () => { throw new Error('Web Audio disconnected') },
        companionEnabled: true,
      })

      expect(Number.isFinite(faultyGetterMotion.excitation)).toBe(true)
      expect(faultyGetterMotion.excitation).toBe(1.25) // baseline speaking excitation with audio=0
    })

    it('safely clamps saturated audio level > 1.5 to prevent mesh explosion', () => {
      const extremeAudio = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 9999,
        companionEnabled: true,
      })

      const clampedMaxAudio = computeBrainMotion(1.0, 0.016, { positionZ: 0, rotationX: 0 }, {
        isListening: false,
        isThinking: false,
        isSpeaking: true,
        audioLevel: 1.5,
        companionEnabled: true,
      })

      expect(extremeAudio.excitation).toBe(clampedMaxAudio.excitation)
      expect(extremeAudio.scale).toEqual(clampedMaxAudio.scale)
    })
  })

  describe('Adversarial Challenge 5: Numerical Robustness & Pathological Inputs', () => {
    it('handles NaN, Infinity, negative time and delta inputs gracefully', () => {
      const pathological = computeBrainMotion(
        NaN,
        Infinity,
        { positionZ: NaN, rotationX: -Infinity },
        {
          isListening: true,
          isThinking: false,
          isSpeaking: false,
          audioLevel: NaN,
          companionEnabled: true,
        }
      )

      expect(Number.isFinite(pathological.positionZ)).toBe(true)
      expect(Number.isFinite(pathological.rotationX)).toBe(true)
      expect(Number.isFinite(pathological.rotationSpeedY)).toBe(true)
      expect(Number.isFinite(pathological.excitation)).toBe(true)
      for (const s of pathological.scale) {
        expect(Number.isFinite(s)).toBe(true)
      }
    })

    it('clamps out-of-bounds positionZ [-5, 10] preventing camera clipping or runaway', () => {
      const runawayFar = computeBrainMotion(
        0,
        0.016,
        { positionZ: 500, rotationX: 0 },
        {
          isListening: false,
          isThinking: false,
          isSpeaking: false,
          audioLevel: 0,
          companionEnabled: true,
        }
      )
      // Clamped to 10 initially, then interpolated toward 0
      expect(runawayFar.positionZ).toBeLessThan(10)

      const runawayClose = computeBrainMotion(
        0,
        0.016,
        { positionZ: -500, rotationX: 0 },
        {
          isListening: false,
          isThinking: false,
          isSpeaking: false,
          audioLevel: 0,
          companionEnabled: true,
        }
      )
      // Clamped to -5 initially, then interpolated toward 0
      expect(runawayClose.positionZ).toBeGreaterThan(-5)
    })

    it('returns baseline values immediately when companionEnabled is false', () => {
      const disabled = computeBrainMotion(
        100,
        0.016,
        { positionZ: 1.35, rotationX: -0.075 },
        {
          isListening: true,
          isThinking: true,
          isSpeaking: true,
          audioLevel: 1.0,
          companionEnabled: false,
        }
      )

      expect(disabled.scale).toEqual([1, 1, 1])
      expect(disabled.positionZ).toBe(0)
      expect(disabled.rotationX).toBe(0)
      expect(disabled.rotationSpeedY).toBe(0.04)
      expect(disabled.excitation).toBe(1.0)
    })
  })
})
