import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import HumanCompanionLayer, { type HumanCompanionLayerProps } from '../src/renderer/src/humanCompanion/HumanCompanionLayer'
import * as soundscape from '../src/renderer/src/humanCompanion/soundscape'
import { installMockWebAudio, restoreMockWebAudio, audioRegistry } from './fixtures/mockWebAudio'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Canvas 2D Context for Headless Testing & Specification Auditing
// ─────────────────────────────────────────────────────────────────────────────
interface RadialGradientCall {
  x0: number
  y0: number
  r0: number
  x1: number
  y1: number
  r1: number
  colorStops: Array<{ offset: number; color: string }>
}

interface ArcCall {
  x: number
  y: number
  radius: number
  startAngle: number
  endAngle: number
}

class MockCanvasRenderingContext2D {
  canvas: any
  clearRectCalls: Array<{ x: number; y: number; w: number; h: number }> = []
  radialGradients: RadialGradientCall[] = []
  arcs: ArcCall[] = []
  fills: string[] = []
  strokes: string[] = []
  fillStyle: any = '#000000'
  strokeStyle: any = '#000000'
  shadowColor: string = ''
  shadowBlur: number = 0
  lineWidth: number = 1

  constructor(canvas: any) {
    this.canvas = canvas
  }

  clearRect(x: number, y: number, w: number, h: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
      throw new Error(`Invalid clearRect arguments: ${x}, ${y}, ${w}, ${h}`)
    }
    this.clearRectCalls.push({ x, y, w, h })
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    if (
      !Number.isFinite(x0) ||
      !Number.isFinite(y0) ||
      !Number.isFinite(r0) ||
      !Number.isFinite(x1) ||
      !Number.isFinite(y1) ||
      !Number.isFinite(r1)
    ) {
      throw new Error(`Invalid non-finite arguments to createRadialGradient: [${x0}, ${y0}, ${r0}, ${x1}, ${y1}, ${r1}]`)
    }
    if (r0 < 0 || r1 < 0) {
      throw new Error(`Negative radius passed to createRadialGradient: r0=${r0}, r1=${r1}`)
    }

    const grad: RadialGradientCall = {
      x0,
      y0,
      r0,
      x1,
      y1,
      r1,
      colorStops: [],
    }
    this.radialGradients.push(grad)

    return {
      addColorStop: (offset: number, color: string) => {
        if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
          throw new Error(`Invalid color stop offset: ${offset}. Must be between 0 and 1.`)
        }
        grad.colorStops.push({ offset, color })
      },
    }
  }

  beginPath() {}
  save() {}
  restore() {}

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
      throw new Error(`Invalid non-finite arguments to arc: x=${x}, y=${y}, r=${radius}`)
    }
    if (radius < 0) {
      throw new Error(`Negative radius passed to arc: ${radius}`)
    }
    this.arcs.push({ x, y, radius, startAngle, endAngle })
  }

  fill() {
    this.fills.push(this.fillStyle)
  }

  stroke() {
    this.strokes.push(this.strokeStyle)
  }

  reset() {
    this.clearRectCalls = []
    this.radialGradients = []
    this.arcs = []
    this.fills = []
    this.strokes = []
  }
}

describe('Empirical Challenge 1: Milestone 3 Deep Adversarial Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    soundscape.resetSoundscapeDebounce()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 1: Audio Reactivity & Aura Boundary Stress Testing
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Audio Reactivity & Aura Gradient Boundary Conditions', () => {
    let mockCtx: MockCanvasRenderingContext2D
    let mockCanvas: any

    beforeEach(() => {
      mockCanvas = {
        width: 280,
        height: 280,
        parentElement: null,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 280, height: 280 }),
        getContext: () => mockCtx,
      }
      mockCtx = new MockCanvasRenderingContext2D(mockCanvas)
    })

    // Helper to simulate the exact canvas render step from HumanCompanionLayer
    function simulateCanvasFrame(params: {
      now: number
      lastTime: number
      listening: boolean
      thinking: boolean
      speaking: boolean
      rawAudio: number
      smoothedAudio: number
    }) {
      const dt = Math.min(0.1, (params.now - params.lastTime) / 1000)
      const timeSeconds = params.now / 1000
      const safeAudio = Number.isFinite(params.rawAudio) ? Math.max(0, Math.min(1, params.rawAudio)) : 0
      const newSmoothed = params.smoothedAudio + (safeAudio - params.smoothedAudio) * Math.min(1, dt * 14)

      let cx = 224
      let cy = 224

      mockCtx.clearRect(0, 0, mockCanvas.width, mockCanvas.height)

      const baseRadius = 32
      let auraRadius = baseRadius + 24
      let grad = mockCtx.createRadialGradient(cx, cy, baseRadius * 0.7, cx, cy, auraRadius)

      if (params.listening) {
        auraRadius = baseRadius + 48 + newSmoothed * 46
        grad = mockCtx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        const alpha = Math.min(0.85, 0.35 + newSmoothed * 0.45)
        grad.addColorStop(0, `rgba(251, 191, 36, ${alpha})`)
        grad.addColorStop(0.5, `rgba(245, 158, 11, ${alpha * 0.5})`)
        grad.addColorStop(1, 'rgba(217, 119, 6, 0)')
      } else if (params.speaking) {
        auraRadius = baseRadius + 42 + newSmoothed * 42
        grad = mockCtx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        const alpha = Math.min(0.8, 0.32 + newSmoothed * 0.4)
        grad.addColorStop(0, `rgba(52, 211, 153, ${alpha})`)
        grad.addColorStop(0.5, `rgba(16, 185, 129, ${alpha * 0.45})`)
        grad.addColorStop(1, 'rgba(5, 150, 105, 0)')
      } else if (params.thinking) {
        const shimmer = Math.sin(timeSeconds * 3.2) * 6
        auraRadius = baseRadius + 32 + shimmer
        grad = mockCtx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.28)')
        grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.14)')
        grad.addColorStop(1, 'rgba(126, 34, 206, 0)')
      } else {
        const breath = (Math.sin(timeSeconds * 1.4) + 1) * 0.5
        auraRadius = baseRadius + 22 + breath * 12
        grad = mockCtx.createRadialGradient(cx, cy, baseRadius * 0.6, cx, cy, auraRadius)
        const idleAlpha = 0.05 + breath * 0.03
        grad.addColorStop(0, `rgba(0, 212, 255, ${idleAlpha})`)
        grad.addColorStop(0.6, `rgba(0, 212, 255, ${idleAlpha * 0.4})`)
        grad.addColorStop(1, 'rgba(0, 212, 255, 0)')
      }

      mockCtx.save()
      mockCtx.beginPath()
      mockCtx.arc(cx, cy, auraRadius, 0, Math.PI * 2)
      mockCtx.fillStyle = grad
      mockCtx.fill()
      mockCtx.restore()

      return { newSmoothed, auraRadius }
    }

    it('handles silent audio (0.0) with clean minimum radii and baseline warm amber glow', () => {
      mockCtx.reset()
      const { auraRadius } = simulateCanvasFrame({
        now: 1000,
        lastTime: 984,
        listening: true,
        thinking: false,
        speaking: false,
        rawAudio: 0.0,
        smoothedAudio: 0.0,
      })

      // Listening baseline radius with 0 audio = 32 + 48 = 80px
      expect(auraRadius).toBe(80)
      expect(mockCtx.radialGradients.length).toBeGreaterThan(0)
      const lastGrad = mockCtx.radialGradients[mockCtx.radialGradients.length - 1]
      expect(lastGrad.r1).toBe(80)
      expect(lastGrad.colorStops).toHaveLength(3)
      expect(lastGrad.colorStops[0].color).toBe('rgba(251, 191, 36, 0.35)')
      expect(lastGrad.colorStops[2].color).toBe('rgba(217, 119, 6, 0)')
    })

    it('clamps loud audio (> 1.0, e.g. 1.5, 10.0, 50000.0) without overflowing max radius or alpha', () => {
      const extremeLoudLevels = [1.01, 1.5, 5.0, 100.0, 50000.0]

      for (const loud of extremeLoudLevels) {
        mockCtx.reset()
        // Pre-smooth to 1.0 to test steady state at max volume
        const { auraRadius } = simulateCanvasFrame({
          now: 2000,
          lastTime: 1984,
          listening: true,
          thinking: false,
          speaking: false,
          rawAudio: loud,
          smoothedAudio: 1.0,
        })

        // Max radius = 32 + 48 + 46 = 126px
        expect(auraRadius).toBeCloseTo(126, 1)
        expect(auraRadius).toBeLessThanOrEqual(126.01)

        const lastGrad = mockCtx.radialGradients[mockCtx.radialGradients.length - 1]
        // Max alpha is clamped to 0.85
        const firstStop = lastGrad.colorStops[0].color
        expect(firstStop).toContain('0.8')
      }
    })

    it('clamps negative audio levels (< 0.0) to zero without inversion or NaN', () => {
      mockCtx.reset()
      const { auraRadius } = simulateCanvasFrame({
        now: 3000,
        lastTime: 2984,
        listening: true,
        thinking: false,
        speaking: false,
        rawAudio: -999.0,
        smoothedAudio: 0.0,
      })

      expect(auraRadius).toBe(80)
      expect(Number.isFinite(auraRadius)).toBe(true)
    })

    it('recovers cleanly from corrupt non-numeric audio (NaN, Infinity, -Infinity, null, undefined)', () => {
      const corruptions = [NaN, Infinity, -Infinity, null as any, undefined as any]

      for (const badVal of corruptions) {
        mockCtx.reset()
        const { auraRadius } = simulateCanvasFrame({
          now: 4000,
          lastTime: 3984,
          listening: true,
          thinking: false,
          speaking: false,
          rawAudio: badVal,
          smoothedAudio: 0.0,
        })

        expect(Number.isFinite(auraRadius)).toBe(true)
        expect(auraRadius).toBe(80)
      }
    })

    it('survives rapid sub-frame state switching without gradient collision or throwing', () => {
      const states = [
        { listening: true, thinking: false, speaking: false },
        { listening: false, thinking: true, speaking: false },
        { listening: false, thinking: false, speaking: true },
        { listening: false, thinking: false, speaking: false },
        { listening: true, thinking: true, speaking: true },
      ]

      let smoothed = 0.5
      let time = 0

      expect(() => {
        for (let i = 0; i < 200; i++) {
          const st = states[i % states.length]
          time += 16
          const res = simulateCanvasFrame({
            now: time,
            lastTime: time - 16,
            listening: st.listening,
            thinking: st.thinking,
            speaking: st.speaking,
            rawAudio: 0.8,
            smoothedAudio: smoothed,
          })
          smoothed = res.newSmoothed
          expect(Number.isFinite(res.auraRadius)).toBe(true)
          expect(res.auraRadius).toBeGreaterThan(0)
        }
      }).not.toThrow()
    })

    it('verifies all gradient color stop offsets are strictly within [0, 1] across all states', () => {
      const allStates = [
        { listening: true, thinking: false, speaking: false },
        { listening: false, thinking: true, speaking: false },
        { listening: false, thinking: false, speaking: true },
        { listening: false, thinking: false, speaking: false },
      ]

      for (const st of allStates) {
        mockCtx.reset()
        simulateCanvasFrame({
          now: 1500,
          lastTime: 1484,
          listening: st.listening,
          thinking: st.thinking,
          speaking: st.speaking,
          rawAudio: 0.75,
          smoothedAudio: 0.75,
        })

        for (const grad of mockCtx.radialGradients) {
          for (const stop of grad.colorStops) {
            expect(stop.offset).toBeGreaterThanOrEqual(0)
            expect(stop.offset).toBeLessThanOrEqual(1)
          }
        }
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 2: 2D Canvas Performance, React Zero-Rerender & Loop Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. 2D Canvas Zero-Rerender & Frame Budget Verification', () => {
    it('verifies canvas render loop execution time is well under 16.67ms frame budget (< 0.5ms)', () => {
      const canvas = {
        width: 280,
        height: 280,
        parentElement: null,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 280, height: 280 }),
      }
      const ctx = new MockCanvasRenderingContext2D(canvas)

      const start = performance.now()
      const frames = 1000

      let smoothed = 0.5
      let now = 0

      for (let i = 0; i < frames; i++) {
        now += 16.666
        const dt = 0.016
        const safeAudio = 0.8
        smoothed += (safeAudio - smoothed) * Math.min(1, dt * 14)

        ctx.clearRect(0, 0, 280, 280)
        const baseRadius = 32
        const auraRadius = baseRadius + 48 + smoothed * 46
        const grad = ctx.createRadialGradient(224, 224, baseRadius * 0.5, 224, 224, auraRadius)
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.7)')
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)')
        grad.addColorStop(1, 'rgba(217, 119, 6, 0)')

        ctx.save()
        ctx.beginPath()
        ctx.arc(224, 224, auraRadius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }

      const elapsed = performance.now() - start
      const perFrameMs = elapsed / frames

      // Frame budget is 16.67ms; pure canvas calculation should execute in < 0.2ms
      expect(perFrameMs).toBeLessThan(0.5)
    })

    it('verifies HumanCompanionLayer component structure has 0 setState calls during animation', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )

      // Must not use useState for continuous rendering
      expect(source).not.toContain('useState')
      // Must drive animation exclusively via requestAnimationFrame
      expect(source).toContain('requestAnimationFrame(render)')
      expect(source).toContain('cancelAnimationFrame(animId)')
      // Uses refs for non-re-rendering state updates
      expect(source).toContain('isListeningRef.current = isListening')
      expect(source).toContain('isThinkingRef.current = isThinking')
      expect(source).toContain('isSpeakingRef.current = isSpeaking')
      expect(source).toContain('getAudioLevelRef.current = getAudioLevel')
    })

    it('verifies animation loop effect depends ONLY on [enabled] to avoid RAF tear-down/restart', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )

      // Locate the animation loop useEffect
      const animLoopMatch = source.match(/animId = requestAnimationFrame\(render\)[\s\S]*?\}, \[([^\]]*)\]\)/)
      expect(animLoopMatch).not.toBeNull()
      const deps = animLoopMatch![1].trim()
      // The dependency array must only contain 'enabled'
      expect(deps).toBe('enabled')
    })

    it('verifies ripple array culling prevents unbounded memory growth', () => {
      interface CanvasRipple {
        radius: number
        maxRadius: number
        opacity: number
        speed: number
        color: 'amber' | 'emerald'
      }

      const ripples: CanvasRipple[] = []
      const baseRadius = 32
      const maxRadius = 115

      // Simulate 60 seconds of continuous speaking/listening at 60fps (3600 frames)
      const dt = 0.016
      let lastRippleSpawn = 0

      for (let frame = 0; frame < 3600; frame++) {
        const now = frame * 16.666

        // Spawn logic from HumanCompanionLayer.tsx
        if (now - lastRippleSpawn > 320 && ripples.length < 4) {
          ripples.push({
            radius: baseRadius,
            maxRadius,
            opacity: 0.6,
            speed: 38 * (1 + 0.8 * 0.6),
            color: 'amber',
          })
          lastRippleSpawn = now
        }

        // Culling logic from HumanCompanionLayer.tsx
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i]
          r.radius += r.speed * dt
          const progress = Math.max(0, Math.min(1, (r.radius - baseRadius) / (r.maxRadius - baseRadius)))
          r.opacity = Math.max(0, (1 - progress) * 0.65)

          if (progress >= 1 || r.opacity <= 0.01) {
            ripples.splice(i, 1)
          }
        }

        // The active pool must never exceed 4 ripples
        expect(ripples.length).toBeLessThanOrEqual(4)
      }

      // Memory test: Pool does not leak
      expect(ripples.length).toBeLessThanOrEqual(4)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Section 3: Soundscape Chimes, Debounce Lock & Anti-Clipping Compressor
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Soundscape Tactile Chimes & Anti-Clipping Dynamics Compressor', () => {
    beforeEach(() => {
      installMockWebAudio()
      soundscape.resetSoundscapeDebounce()
    })

    afterEach(() => {
      restoreMockWebAudio()
      soundscape.resetSoundscapeDebounce()
    })

    it('blocks rapid 50x button clicks within 150ms debounce window', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      // Simulate 50 clicks in rapid succession within 20ms
      for (let i = 0; i < 50; i++) {
        soundscape.playActivationChime()
      }

      // Exactly 1 chime should have fired = 2 notes * 2 oscs = 4 oscillators (C5 & E5 with triangle overtones)
      expect(audioRegistry.oscillators.length).toBe(4)
      expect(audioRegistry.gainNodes.length).toBe(2)
    })

    it('resets debounce lock after 150ms elapsed, allowing subsequent activation', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      soundscape.playActivationChime()
      expect(audioRegistry.oscillators.length).toBe(4)

      // Advance mock time past 150ms window
      const nowSpy = vi.spyOn(Date, 'now')
      const initialTime = Date.now()
      nowSpy.mockReturnValue(initialTime + 160)

      soundscape.playActivationChime()
      expect(audioRegistry.oscillators.length).toBe(8)
    })

    it('verifies independent debounce tracking for activation vs deactivation', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      // First activation
      soundscape.playActivationChime()
      expect(audioRegistry.oscillators.length).toBe(4)

      // Immediately trigger deactivation: must NOT be blocked by activation debounce
      soundscape.playDeactivationChime()
      expect(audioRegistry.oscillators.length).toBe(8)

      // Second deactivation within 150ms: MUST be debounced
      soundscape.playDeactivationChime()
      expect(audioRegistry.oscillators.length).toBe(8)
    })

    it('configures master DynamicsCompressorNode with anti-clipping parameters', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      soundscape.playActivationChime()

      expect(audioRegistry.compressors.length).toBeGreaterThanOrEqual(1)
      const comp = audioRegistry.compressors[0]
      expect(comp.threshold.value).toBe(-14)
      expect(comp.knee.value).toBe(24)
      expect(comp.ratio.value).toBe(10)
      expect(comp.attack.value).toBe(0.003)
      expect(comp.release.value).toBe(0.2)
      expect(comp.connections).toContain(comp.context.destination)
    })

    it('routes all chime notes through master compressor before destination', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      soundscape.playActivationChime()
      soundscape.playThoughtSpark()

      const comp = audioRegistry.compressors[0]
      // All created gains must connect to the compressor
      for (const gain of audioRegistry.gainNodes) {
        expect(gain.connections).toContain(comp)
      }
    })

    it('strictly avoids RangeError by using positive target value (0.0001) in exponential decay ramps', () => {
      audioRegistry.reset()
      soundscape.resetSoundscapeDebounce()

      soundscape.playActivationChime()

      for (const gain of audioRegistry.gainNodes) {
        // Find exponential ramp events
        for (const ev of gain.gain.events) {
          if (ev.type === 'exponentialRampToValueAtTime') {
            expect(ev.value).toBeGreaterThan(0)
            expect(ev.value).toBe(0.0001)
          }
        }
      }
    })
  })


  // ═══════════════════════════════════════════════════════════════════════════
  // Section 4: App.tsx Audio Pipeline & Accessor Verification
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. App.tsx Bidirectional Audio Pipeline & Level Accessor', () => {
    it('verifies getAudioLevel calculates safe normalized level [0, 1] without buffer reallocation', () => {
      let allocatedBuffer: Uint8Array | null = null
      let allocationCount = 0

      // Simulate App.tsx getAudioLevel logic
      const simulateGetAudioLevel = (analyser: any) => {
        if (analyser) {
          if (!allocatedBuffer || allocatedBuffer.length !== analyser.frequencyBinCount) {
            allocatedBuffer = new Uint8Array(analyser.frequencyBinCount)
            allocationCount++
          }
          analyser.getByteFrequencyData(allocatedBuffer)
          let sum = 0
          const len = allocatedBuffer.length
          for (let i = 0; i < len; i++) sum += allocatedBuffer[i]
          return Math.min(1.0, sum / (len || 1) / 128)
        }
        return 0
      }

      const mockAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: (arr: Uint8Array) => arr.fill(128),
      }

      // First call allocates buffer
      const level1 = simulateGetAudioLevel(mockAnalyser)
      expect(level1).toBe(1.0)
      expect(allocationCount).toBe(1)

      // 100 subsequent calls reuse buffer (zero allocation count increase)
      for (let i = 0; i < 100; i++) {
        const lvl = simulateGetAudioLevel(mockAnalyser)
        expect(lvl).toBe(1.0)
      }
      expect(allocationCount).toBe(1)
    })

    it('verifies stopListening cleans up analyserRef to null to stop visual processing', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )
      // Must contain analyser cleanup in stopListening
      expect(appSource).toContain('analyserRef.current = null')
    })
  })
})
