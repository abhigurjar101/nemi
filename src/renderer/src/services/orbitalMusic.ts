/**
 * NEMI Soothing & Calming Ambient Soundscape Engine (432Hz Zen / Deep Focus)
 * Generates an organic, ultra-calming meditative ambient soundscape with warm
 * felt-like acoustic pads, slow oceanic breath modulation, and gentle zen chimes.
 */

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let masterFilter: BiquadFilterNode | null = null
let compressor: DynamicsCompressorNode | null = null
let isEngineRunning = false
let padOscillators: OscillatorNode[] = []
let lfoOsc: OscillatorNode | null = null
let zenChimeTimer: any = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass()
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

// 432 Hz Calm Harmonic Tuning (Golden Ratio / Meditative Pentatonic)
// Warm, serene, rich chord frequencies: A2 (108Hz), A3 (216Hz), E4 (324Hz), A4 (432Hz), E5 (648Hz)
const CALM_PAD_FREQS = [108.0, 216.0, 324.0, 432.0, 648.0]
const ZEN_CHIME_FREQS = [432.0, 540.0, 648.0, 864.0, 1080.0, 1296.0]

export function startOrbitalMusicEngine(): boolean {
  const ctx = getAudioContext()
  if (!ctx || isEngineRunning) return false

  try {
    const now = ctx.currentTime

    // 1. Transparent soft limiter to keep sound velvet-smooth and calm
    compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-16, now)
    compressor.knee.setValueAtTime(24, now)
    compressor.ratio.setValueAtTime(3.5, now)
    compressor.attack.setValueAtTime(0.03, now)
    compressor.release.setValueAtTime(0.35, now)
    compressor.connect(ctx.destination)

    masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.0001, now)

    // Warm, silky low-pass filter (warm acoustic clarity around 850Hz)
    masterFilter = ctx.createBiquadFilter()
    masterFilter.type = 'lowpass'
    masterFilter.frequency.setValueAtTime(850, now)
    masterFilter.Q.setValueAtTime(1.0, now)

    masterGain.connect(masterFilter)
    masterFilter.connect(compressor)

    // 2. Meditative Deep Ambient Pads (Pure warm sine & soft harmonic blend)
    padOscillators = CALM_PAD_FREQS.map((freq, idx) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      // Micro-detuning for lush analog shimmer and warmth
      const microDetune = (idx - 2) * 1.5
      osc.detune.setValueAtTime(microDetune, now)

      oscGain.gain.setValueAtTime(0.12 / (idx + 1), now)
      osc.connect(oscGain)
      oscGain.connect(masterGain!)
      osc.start(now)
      return osc
    })

    // 3. Slow 7-second Oceanic Breathing LFO
    lfoOsc = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfoOsc.frequency.setValueAtTime(0.14, now) // gentle breath cycle
    lfoGain.gain.setValueAtTime(120, now)
    lfoOsc.connect(lfoGain)
    lfoGain.connect(masterFilter.frequency)
    lfoOsc.start(now)

    // 4. Sparse, Peaceful Zen Chime Drops (Spaced out every 2.6s)
    let chimeIndex = 0
    zenChimeTimer = setInterval(() => {
      if (!manualSoothingMusicActive && (!masterGain || masterGain.gain.value < 0.01)) return

      const freq = ZEN_CHIME_FREQS[chimeIndex % ZEN_CHIME_FREQS.length]
      playZenChime(freq)
      chimeIndex = (chimeIndex + 1) % ZEN_CHIME_FREQS.length
    }, 2600)

    isEngineRunning = true
    return true
  } catch {
    return false
  }
}

function playZenChime(freq: number) {
  const ctx = getAudioContext()
  if (!ctx || !masterGain) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const oscHarmonic = ctx.createOscillator()
    const gain = ctx.createGain()
    const chimeFilter = ctx.createBiquadFilter()
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null

    // Pure organic acoustic singing-bowl/tibetan bell timbre
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    // Gentle harmonic overtone
    oscHarmonic.type = 'sine'
    oscHarmonic.frequency.setValueAtTime(freq * 1.5, now)

    chimeFilter.type = 'lowpass'
    chimeFilter.frequency.setValueAtTime(freq * 2.5, now)
    chimeFilter.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 2.4)

    const volume = Math.min(0.22, (soothingMusicVolume || 0.35) * 0.65)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.08) // Soft felt strike
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7) // Long soothing decay

    osc.connect(chimeFilter)
    oscHarmonic.connect(chimeFilter)
    chimeFilter.connect(gain)

    if (panner) {
      panner.pan.setValueAtTime(Math.sin(now * 0.7) * 0.35, now)
      gain.connect(panner)
      panner.connect(masterGain)
    } else {
      gain.connect(masterGain)
    }

    osc.start(now)
    oscHarmonic.start(now)
    osc.stop(now + 2.8)
    oscHarmonic.stop(now + 2.8)
  } catch {}
}

let manualSoothingMusicActive = false
let soothingMusicVolume = 0.35

// Auto-resume audio context upon any user interaction to eliminate browser autoplay gating
if (typeof window !== 'undefined') {
  const resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
  }
  window.addEventListener('click', resumeAudio, { passive: true })
  window.addEventListener('touchstart', resumeAudio, { passive: true })
  window.addEventListener('keydown', resumeAudio, { passive: true })
}

/**
 * Updates soundscape parameters based on 3D camera distance to the ring.
 * Smoothly blends a soothing, meditative ambient presence.
 */
export function updateOrbitalProximity(cameraDistance: number): number {
  // Gentle distance curve: 14 = silence, 10 = approaching, 4-7 = serene calm presence
  const rawProximity = Math.max(0, Math.min(1, (13.0 - cameraDistance) / 8.0))
  const proximity = manualSoothingMusicActive ? Math.max(0.85, rawProximity) : rawProximity

  if (!isEngineRunning) {
    startOrbitalMusicEngine()
  }

  const ctx = getAudioContext()
  if (ctx && masterGain && masterFilter) {
    // Soothing, gentle volume level (up to 0.28 peak for serene relaxation)
    const targetGain = Math.pow(proximity, 1.5) * (manualSoothingMusicActive ? soothingMusicVolume : 0.28)
    const targetFilterFreq = 320 + Math.pow(proximity, 1.2) * 1200

    const now = ctx.currentTime
    masterGain.gain.setTargetAtTime(targetGain, now, 0.2)
    masterFilter.frequency.setTargetAtTime(targetFilterFreq, now, 0.25)
  }

  return proximity
}

type MusicStateListener = (active: boolean) => void
const musicListeners = new Set<MusicStateListener>()

export function subscribeSoothingMusic(listener: MusicStateListener): () => void {
  musicListeners.add(listener)
  try {
    listener(manualSoothingMusicActive)
  } catch {}
  return () => {
    musicListeners.delete(listener)
  }
}

export function isSoothingMusicActive(): boolean {
  return manualSoothingMusicActive
}

export function setSoothingMusicActive(active: boolean): boolean {
  manualSoothingMusicActive = active
  if (active) {
    if (!isEngineRunning) {
      startOrbitalMusicEngine()
    }
    const ctx = getAudioContext()
    if (ctx && masterGain && masterFilter) {
      const now = ctx.currentTime
      masterGain.gain.setTargetAtTime(soothingMusicVolume, now, 0.3)
      masterFilter.frequency.setTargetAtTime(850, now, 0.35)
    }
  } else {
    const ctx = getAudioContext()
    if (ctx && masterGain) {
      const now = ctx.currentTime
      masterGain.gain.setTargetAtTime(0.0001, now, 0.3)
    }
  }
  musicListeners.forEach((fn) => {
    try { fn(manualSoothingMusicActive) } catch {}
  })
  return manualSoothingMusicActive
}

export function toggleSoothingMusic(forceState?: boolean): boolean {
  const next = forceState !== undefined ? forceState : !manualSoothingMusicActive
  return setSoothingMusicActive(next)
}

export function getSoothingMusicVolume(): number {
  return soothingMusicVolume
}

export function setSoothingMusicVolume(vol: number): void {
  soothingMusicVolume = Math.max(0, Math.min(1, vol))
  if (manualSoothingMusicActive && masterGain) {
    const ctx = getAudioContext()
    if (ctx) {
      masterGain.gain.setTargetAtTime(soothingMusicVolume, ctx.currentTime, 0.1)
    }
  }
}

export function stopOrbitalMusicEngine(): void {
  if (zenChimeTimer) {
    clearInterval(zenChimeTimer)
    zenChimeTimer = null
  }
  if (lfoOsc) {
    try { lfoOsc.stop() } catch {}
    lfoOsc = null
  }
  padOscillators.forEach((osc) => {
    try { osc.stop() } catch {}
  })
  padOscillators = []
  isEngineRunning = false
  manualSoothingMusicActive = false
}
