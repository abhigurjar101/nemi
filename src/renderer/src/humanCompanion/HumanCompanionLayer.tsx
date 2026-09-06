import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playActivationChime, playDeactivationChime, playThoughtSpark } from './soundscape'

export interface HumanCompanionLayerProps {
  enabled?: boolean
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  getAudioLevel?: () => number
}

interface CanvasRipple {
  radius: number
  maxRadius: number
  opacity: number
  speed: number
  color: 'amber' | 'emerald'
}

/**
 * 🌿 HumanCompanionLayer
 * An isolated, easily-removable companion layer that infuses NEMI with
 * organic presence: acoustic sound chimes, living Voice Orb aura, and 60fps acoustic wave ripples.
 * Front canvas is strictly minimalist: only the 3D Brain and Voice Orb are visible.
 * 
 * To remove or disable completely:
 * Simply toggle the `enabled` prop to `false` or delete this folder.
 */
export default function HumanCompanionLayer({
  enabled = true,
  isListening,
  isThinking,
  isSpeaking,
  getAudioLevel,
}: HumanCompanionLayerProps) {
  const prevListeningRef = useRef(isListening)
  const prevThinkingRef = useRef(isThinking)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isListeningRef = useRef(isListening)
  const isThinkingRef = useRef(isThinking)
  const isSpeakingRef = useRef(isSpeaking)
  const getAudioLevelRef = useRef(getAudioLevel)

  // Keep refs up to date without restarting animation loop
  useEffect(() => {
    isListeningRef.current = isListening
    isThinkingRef.current = isThinking
    isSpeakingRef.current = isSpeaking
    getAudioLevelRef.current = getAudioLevel
  }, [isListening, isThinking, isSpeaking, getAudioLevel])

  // Trigger organic acoustic chimes on state transitions
  useEffect(() => {
    if (!enabled) return

    // Listening transition
    if (isListening && !prevListeningRef.current) {
      playActivationChime()
    } else if (!isListening && prevListeningRef.current) {
      playDeactivationChime()
    }
    prevListeningRef.current = isListening

    // Thinking transition
    if (isThinking && !prevThinkingRef.current) {
      playThoughtSpark()
    }
    prevThinkingRef.current = isThinking
  }, [enabled, isListening, isThinking])

  // 60fps 2D Canvas Living Aura & Acoustic Wave Ripple Engine
  useEffect(() => {
    if (!enabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = performance.now()
    let smoothedAudio = 0
    let lastRippleSpawn = 0
    const ripples: CanvasRipple[] = []

    const render = (now: number) => {
      animId = requestAnimationFrame(render)

      const dt = Math.min(0.1, (now - lastTime) / 1000)
      lastTime = now
      const timeSeconds = now / 1000

      const listening = isListeningRef.current
      const thinking = isThinkingRef.current
      const speaking = isSpeakingRef.current

      // Sample live audio level with exponential smoothing
      const rawAudio = getAudioLevelRef.current ? getAudioLevelRef.current() : 0
      const safeAudio = Number.isFinite(rawAudio) ? Math.max(0, Math.min(1, rawAudio)) : 0
      smoothedAudio += (safeAudio - smoothedAudio) * Math.min(1, dt * 14)

      // Calculate orb center coordinates relative to canvas (280x280)
      let cx = 224
      let cy = 224
      try {
        const orbBtn =
          canvas.parentElement?.querySelector('button') ||
          document.querySelector('.fixed.bottom-8.right-8 button')
        if (orbBtn) {
          const orbRect = orbBtn.getBoundingClientRect()
          const canvasRect = canvas.getBoundingClientRect()
          if (canvasRect.width > 0 && orbRect.width > 0) {
            cx = orbRect.left + orbRect.width / 2 - canvasRect.left
            cy = orbRect.top + orbRect.height / 2 - canvasRect.top
          }
        }
      } catch {
        // Safe fallback
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // ── 1. Living Radial Aura Glow ──
      const baseRadius = 32
      let auraRadius = baseRadius + 24
      let grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.7, cx, cy, auraRadius)

      if (listening) {
        // Warm Inhale Glow (amber / gold transition during listening)
        auraRadius = baseRadius + 48 + smoothedAudio * 46
        grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        const alpha = Math.min(0.85, 0.35 + smoothedAudio * 0.45)
        grad.addColorStop(0, `rgba(251, 191, 36, ${alpha})`)
        grad.addColorStop(0.5, `rgba(245, 158, 11, ${alpha * 0.5})`)
        grad.addColorStop(1, 'rgba(217, 119, 6, 0)')
      } else if (speaking) {
        // Emerald / Teal Glow (during speaking)
        auraRadius = baseRadius + 42 + smoothedAudio * 42
        grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        const alpha = Math.min(0.8, 0.32 + smoothedAudio * 0.4)
        grad.addColorStop(0, `rgba(52, 211, 153, ${alpha})`)
        grad.addColorStop(0.5, `rgba(16, 185, 129, ${alpha * 0.45})`)
        grad.addColorStop(1, 'rgba(5, 150, 105, 0)')
      } else if (thinking) {
        // Violet shimmer (during thinking)
        const shimmer = Math.sin(timeSeconds * 3.2) * 6
        auraRadius = baseRadius + 32 + shimmer
        grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, auraRadius)
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.28)')
        grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.14)')
        grad.addColorStop(1, 'rgba(126, 34, 206, 0)')
      } else {
        // Subtle celestial idle breath (~4.5s respiratory rhythm)
        const breath = (Math.sin(timeSeconds * 1.4) + 1) * 0.5
        auraRadius = baseRadius + 22 + breath * 12
        grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.6, cx, cy, auraRadius)
        const idleAlpha = 0.05 + breath * 0.03
        grad.addColorStop(0, `rgba(0, 212, 255, ${idleAlpha})`)
        grad.addColorStop(0.6, `rgba(0, 212, 255, ${idleAlpha * 0.4})`)
        grad.addColorStop(1, 'rgba(0, 212, 255, 0)')
      }

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()

      // ── 2. Audio-Reactive Acoustic Wave Ripples ──
      const shouldSpawnRipple = listening || speaking
      const rippleInterval = listening ? 320 : 360

      if (shouldSpawnRipple && now - lastRippleSpawn > rippleInterval && ripples.length < 4) {
        if (smoothedAudio > 0.06 || Math.random() < 0.35) {
          ripples.push({
            radius: baseRadius,
            maxRadius: listening ? 115 : 105,
            opacity: 0.6,
            speed: (listening ? 38 : 34) * (1 + smoothedAudio * 0.6),
            color: listening ? 'amber' : 'emerald',
          })
          lastRippleSpawn = now
        }
      }

      // Propagate and render active acoustic ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.radius += r.speed * dt
        const progress = Math.max(0, Math.min(1, (r.radius - baseRadius) / (r.maxRadius - baseRadius)))
        r.opacity = Math.max(0, (1 - progress) * 0.65)

        if (progress >= 1 || r.opacity <= 0.01) {
          ripples.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, r.radius, 0, Math.PI * 2)
        ctx.lineWidth = 1.6
        if (r.color === 'amber') {
          ctx.strokeStyle = `rgba(251, 191, 36, ${r.opacity})`
          ctx.shadowColor = 'rgba(251, 191, 36, 0.45)'
        } else {
          ctx.strokeStyle = `rgba(52, 211, 153, ${r.opacity})`
          ctx.shadowColor = 'rgba(52, 211, 153, 0.45)'
        }
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.restore()
      }
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      {/* ── 2D Canvas Living Aura & Audio-Reactive Acoustic Wave Engine (60fps) ── */}
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="fixed bottom-2 right-2 pointer-events-none z-40"
        style={{ width: 280, height: 280 }}
        aria-hidden="true"
      />

      {/* ── Living Acoustic Ripple Rings behind the Voice Orb (Bottom Right) ── */}
      <div className="fixed bottom-8 right-8 w-16 h-16 pointer-events-none z-40 flex items-center justify-center">
        <AnimatePresence>
          {isListening && (
            <>
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={`amber-ripple-${ring}`}
                  initial={{ scale: 1, opacity: 0.55 }}
                  animate={{ scale: 1.2 + ring * 0.45, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: ring * 0.55,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                />
              ))}
            </>
          )}

          {isSpeaking && (
            <>
              {[1, 2].map((ring) => (
                <motion.div
                  key={`emerald-ripple-${ring}`}
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.15 + ring * 0.4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.9,
                    repeat: Infinity,
                    delay: ring * 0.6,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
