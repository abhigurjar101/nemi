/**
 * 🧠 companionMotion.ts
 * Pure mathematical functions for organic 3D Brain presence:
 * - Multi-axis asymmetric respiratory cycle (~4.5s cycle)
 * - Attentive forward focus lean-in on voice input (+1.35 Z, -0.075 rad pitch, damped yaw)
 * - Frame-rate independent damping interpolation
 * - Audio harmonization with Web Audio frequency levels
 */

export interface BrainMotionValues {
  scale: [number, number, number]
  positionZ: number
  rotationX: number
  rotationSpeedY: number
  excitation: number
}

export interface BrainMotionState {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  audioLevel?: number | (() => number)
  companionEnabled?: boolean
}

/**
 * Computes organic 3D motion values for the NEMI Brain ellipsoid.
 * Fully deterministic, pure, and safe against extreme time/delta bounds.
 */
export function computeBrainMotion(
  time: number,
  delta: number,
  current: { positionZ: number; rotationX: number },
  state: BrainMotionState
): BrainMotionValues {
  // Graceful fallback when companion layer is disabled
  if (state.companionEnabled === false) {
    return {
      scale: [1, 1, 1],
      positionZ: 0,
      rotationX: 0,
      rotationSpeedY: 0.04,
      excitation: 1.0,
    }
  }

  // 1. Sanitize time and delta against non-finite or negative inputs
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0.016

  // 2. Extract and clamp audio level (supports dynamic getter or numeric value)
  let rawAudio: number | undefined
  if (typeof state.audioLevel === 'function') {
    try {
      rawAudio = state.audioLevel()
    } catch {
      rawAudio = 0
    }
  } else {
    rawAudio = state.audioLevel
  }
  const safeAudio = Number.isFinite(rawAudio) ? Math.max(0, Math.min(rawAudio as number, 1.5)) : 0

  // 3. Multi-axis asymmetric respiratory cycle (~4.5s natural resting breath)
  // Chest/neural ellipsoid expands with distinct harmonic curves on X, Y, and Z
  const breathCycle = (2 * Math.PI) / 4.5
  const breathPhase = safeTime * breathCycle

  const baseScaleX = 1 + Math.sin(breathPhase) * 0.024
  const baseScaleY = 1 + Math.sin(breathPhase + 0.35) * 0.018
  const baseScaleZ = 1 + Math.sin(breathPhase - 0.25) * 0.022

  // 4. Audio harmonization: micro-vibrations & neural excitation
  const audioPulse = safeAudio * 0.04 * Math.sin(safeTime * 12)
  const excitation =
    (state.isListening ? 1.3 : state.isThinking ? 1.15 : state.isSpeaking ? 1.25 : 1.0) +
    safeAudio * 0.4

  const scaleFactor = 1 + (excitation - 1) * 0.08
  const scale: [number, number, number] = [
    (baseScaleX + audioPulse) * scaleFactor,
    (baseScaleY + audioPulse) * scaleFactor,
    (baseScaleZ + audioPulse) * scaleFactor,
  ]

  // 5. Attentive forward focus ("leaning in" to listen)
  // Glides toward user on Z axis and tilts downward into listening posture
  const targetZ = state.isListening ? 1.35 : 0.0
  const targetPitch = state.isListening ? -0.075 : 0.0

  // Frame-rate independent exponential lerp factor clamped strictly to [0, 1]
  const lerpFactor = Math.min(1, Math.max(0, safeDelta * 3.8))
  const safeCurrentZ = Number.isFinite(current?.positionZ) ? current.positionZ : 0
  const safeCurrentPitch = Number.isFinite(current?.rotationX) ? current.rotationX : 0

  // Clamp current Z to prevent out-of-bounds recovery blowups
  const clampedCurrentZ = Math.max(-5, Math.min(safeCurrentZ, 10))
  const positionZ = clampedCurrentZ + (targetZ - clampedCurrentZ) * lerpFactor
  const rotationX = safeCurrentPitch + (targetPitch - safeCurrentPitch) * lerpFactor

  // Damped yaw rotation speed (0.008 rad/s to steady gaze when listening, 0.04 baseline, increased when thinking/speaking)
  const rotationSpeedY = state.isListening
    ? 0.008
    : 0.04 * (state.isThinking ? 1.5 : state.isSpeaking ? 1.2 : 1.0)

  return {
    scale,
    positionZ,
    rotationX,
    rotationSpeedY,
    excitation,
  }
}
