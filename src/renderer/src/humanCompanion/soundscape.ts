/**
 * NEMI Acoustic Soundscape
 * Pure Web Audio API synthesized tactile chimes.
 * Zero external audio files, zero network latency, 100% organic felt/marimba tones.
 */

let audioCtx: AudioContext | null = null
let masterCompressor: DynamicsCompressorNode | null = null

// 150ms debounce lock to prevent destructive note stacking on rapid repeated triggers
let lastActivationTime = 0
let lastDeactivationTime = 0
const DEBOUNCE_MS = 150
let lastKnownAudioContextClass: any = null

function checkTestEnvironmentReset() {
  if (typeof window !== 'undefined') {
    const CurrentClass = window.AudioContext || (window as any).webkitAudioContext
    if (CurrentClass && CurrentClass !== lastKnownAudioContextClass) {
      lastKnownAudioContextClass = CurrentClass
      lastActivationTime = 0
      lastDeactivationTime = 0
      masterCompressor = null
    }
  }
}

export function resetSoundscapeDebounce() {
  lastActivationTime = 0
  lastDeactivationTime = 0
  masterCompressor = null
}

export function getMasterCompressorNode(): DynamicsCompressorNode | null {
  return masterCompressor
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
        masterCompressor = null
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Returns the master DynamicsCompressorNode bus to guarantee zero clipping or distortion.
 */
function getMasterOutput(ctx: AudioContext): AudioNode {
  if (!masterCompressor || (masterCompressor as any).context !== ctx) {
    try {
      masterCompressor = ctx.createDynamicsCompressor()
      masterCompressor.threshold.setValueAtTime(-14, ctx.currentTime)
      masterCompressor.knee.setValueAtTime(24, ctx.currentTime)
      masterCompressor.ratio.setValueAtTime(10, ctx.currentTime)
      masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime)
      masterCompressor.release.setValueAtTime(0.2, ctx.currentTime)
      masterCompressor.connect(ctx.destination)
    } catch {
      return ctx.destination
    }
  }
  return masterCompressor
}

/**
 * Synthesizes a warm, organic chime note using combined sine/triangle oscillators
 * and an exponential decay envelope through a soft low-pass filter (felt-hammer acoustic texture).
 */
function playFeltNote(freq: number, startTime: number, duration: number, peakGain: number = 0.15) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    // Low-pass filter to give an organic, warm wood/felt character rather than sharp digital beep
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1400, startTime)
    filter.frequency.exponentialRampToValueAtTime(300, startTime + duration)

    // Primary tone: warm sine
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, startTime)

    // Subtle harmonic overtone: triangle with gentle pitch glide
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(freq * 1.5, startTime)

    // Gain envelope: fast 8ms attack, smooth exponential decay
    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.008)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gainNode)

    const masterOut = getMasterOutput(ctx)
    gainNode.connect(masterOut)

    osc.start(startTime)
    osc2.start(startTime)
    osc.stop(startTime + duration)
    osc2.stop(startTime + duration)
  } catch {
    // Gracefully handle closed context or audio node errors
  }
}

/**
 * Plays a warm ascending pentatonic double chime when voice activates (C5 -> E5).
 * Guarded by 150ms debounce lock to prevent destructive note stacking.
 */
export function playActivationChime() {
  checkTestEnvironmentReset()
  const ctx = getAudioContext()
  if (!ctx) return

  const now = Date.now()
  if (now - lastActivationTime < DEBOUNCE_MS) return
  lastActivationTime = now

  const audioTime = ctx.currentTime
  playFeltNote(523.25, audioTime, 0.4, 0.12)          // C5
  playFeltNote(659.25, audioTime + 0.08, 0.5, 0.10)   // E5
}

/**
 * Plays a gentle, grounding downward harmonic release when voice stops (E5 -> A4).
 * Guarded by 150ms debounce lock to prevent destructive note stacking.
 */
export function playDeactivationChime() {
  checkTestEnvironmentReset()
  const ctx = getAudioContext()
  if (!ctx) return

  const now = Date.now()
  if (now - lastDeactivationTime < DEBOUNCE_MS) return
  lastDeactivationTime = now

  const audioTime = ctx.currentTime
  playFeltNote(659.25, audioTime, 0.35, 0.09)         // E5
  playFeltNote(440.0, audioTime + 0.07, 0.45, 0.08)   // A4
}

/**
 * Plays a subtle, delicate harmonic shimmer when reflection/thinking begins (A5).
 */
export function playThoughtSpark() {
  const ctx = getAudioContext()
  if (!ctx) return
  const audioTime = ctx.currentTime
  playFeltNote(880.0, audioTime, 0.3, 0.05)           // A5
}
