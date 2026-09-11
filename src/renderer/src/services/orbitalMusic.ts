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

// 432 Hz Calm Harmonic Tuning (F Major 9 / Meditative Pentatonic)
// Warm, serene, grounding chord frequencies: F, C, E, G, A
const CALM_PAD_FREQS = [86.4, 129.6, 172.8, 216.0, 259.2] // Deep warm grounding foundation
const ZEN_CHIME_FREQS = [324.0, 432.0, 540.0, 648.0, 864.0, 1080.0] // Soothing harmonic bells

export function startOrbitalMusicEngine(): boolean {
  const ctx = getAudioContext()
  if (!ctx || isEngineRunning) return false

  try {
    const now = ctx.currentTime

    // 1. Transparent soft limiter to keep sound velvet-smooth and calm
    compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-18, now)
    compressor.knee.setValueAtTime(30, now)
    compressor.ratio.setValueAtTime(4, now)
    compressor.attack.setValueAtTime(0.04, now)
    compressor.release.setValueAtTime(0.4, now)
    compressor.connect(ctx.destination)

    masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.0001, now)

    // Warm, soft low-pass filter (gentle cutoff for velvet acoustic warmth)
    masterFilter = ctx.createBiquadFilter()
    masterFilter.type = 'lowpass'
    masterFilter.frequency.setValueAtTime(380, now)
    masterFilter.Q.setValueAtTime(1.2, now)

    masterGain.connect(masterFilter)
    masterFilter.connect(compressor)

    // 2. Meditative Deep Ambient Pads (Pure warm sine & soft triangle blend)
    padOscillators = CALM_PAD_FREQS.map((freq, idx) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = idx === 0 ? 'sine' : 'sine'
      osc.frequency.setValueAtTime(freq, now)

      // Micro-detuning for deep analog tranquility
      const microDetune = (idx - 2) * 1.8
      osc.detune.setValueAtTime(microDetune, now)

      oscGain.gain.setValueAtTime(0.05 / (idx + 1.2), now)
      osc.connect(oscGain)
      oscGain.connect(masterGain!)
      osc.start(now)
      return osc
    })

    // 3. Slow 6-second Oceanic Breathing LFO
    lfoOsc = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfoOsc.frequency.setValueAtTime(0.12, now) // ~8.3s slow breath cycle
    lfoGain.gain.setValueAtTime(90, now)
    lfoOsc.connect(lfoGain)
    lfoGain.connect(masterFilter.frequency)
    lfoOsc.start(now)

    // 4. Sparse, Peaceful Zen Chime Drops (Spaced out every 2.4 - 3.2s)
    let chimeIndex = 0
    zenChimeTimer = setInterval(() => {
      if (!masterGain || masterGain.gain.value < 0.01) return

      const freq = ZEN_CHIME_FREQS[chimeIndex % ZEN_CHIME_FREQS.length]
      playZenChime(freq)
      chimeIndex = (chimeIndex + 1) % ZEN_CHIME_FREQS.length
    }, 2800)

    isEngineRunning = true
    return true
  } catch {
    return false
  }
}

function playZenChime(freq: number) {
  const ctx = getAudioContext()
  if (!ctx || !masterGain || masterGain.gain.value < 0.01) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const oscHarmonic = ctx.createOscillator()
    const gain = ctx.createGain()
    const chimeFilter = ctx.createBiquadFilter()
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null

    // Pure organic acoustic singing-bowl/marimba timbre
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    // Gentle fifth overtone
    oscHarmonic.type = 'sine'
    oscHarmonic.frequency.setValueAtTime(freq * 1.5, now)

    chimeFilter.type = 'lowpass'
    chimeFilter.frequency.setValueAtTime(freq * 2.2, now)
    chimeFilter.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 2.5)

    const volume = Math.min(0.12, masterGain.gain.value * 0.45)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.12) // Soft felt strike
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8) // Long soothing decay

    osc.connect(chimeFilter)
    oscHarmonic.connect(chimeFilter)
    chimeFilter.connect(gain)

    if (panner) {
      // Gentle spatial pan drift
      panner.pan.setValueAtTime(Math.sin(now * 0.8) * 0.4, now)
      gain.connect(panner)
      panner.connect(masterGain)
    } else {
      gain.connect(masterGain)
    }

    osc.start(now)
    oscHarmonic.start(now)
    osc.stop(now + 2.9)
    oscHarmonic.stop(now + 2.9)
  } catch {}
}

let manualSoothingMusicActive = false
let soothingMusicVolume = 0.22

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
      masterFilter.frequency.setTargetAtTime(750, now, 0.35)
    }
  } else {
    const ctx = getAudioContext()
    if (ctx && masterGain) {
      const now = ctx.currentTime
      masterGain.gain.setTargetAtTime(0.0001, now, 0.3)
    }
  }
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
