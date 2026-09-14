/**
 * NEMI Organic Nature & Deep Focus Soundscape Engine
 * 
 * Provides authentic, ultra-calming auditory environments:
 * 1. 🐦 Forest & Birds: Sweet singing songbirds, forest breeze, rustling leaves.
 * 2. 🌊 Flowing River & Droplets: Crisp mountain creek, gentle water currents, water droplets.
 * 3. 🎧 Relaxing Focus Beats: 60 BPM resting heartbeat pulse, warm vinyl texture, ambient focus chimes.
 * 4. 🌿 Deep Serenity: Harmonious blend of forest birds, gentle water stream, and calm focus pulse.
 * 
 * Completely eliminates harsh synthetic drone pads in favor of pure peace and focus.
 */

export type SoundscapeMode = 'forest' | 'river' | 'beats' | 'serenity'

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let masterFilter: BiquadFilterNode | null = null
let compressor: DynamicsCompressorNode | null = null
let isEngineRunning = false

// Organic Sound Sources
let streamSourceNode: AudioBufferSourceNode | null = null
let streamFilter: BiquadFilterNode | null = null
let streamGain: GainNode | null = null

let breezeSourceNode: AudioBufferSourceNode | null = null
let breezeFilter: BiquadFilterNode | null = null
let breezeGain: GainNode | null = null
let breezeLfo: OscillatorNode | null = null

// Timers for organic events
let birdChirpTimer: any = null
let waterDropTimer: any = null
let focusBeatTimer: any = null
let focusChimeTimer: any = null

// Configuration & State
let currentMode: SoundscapeMode = 'serenity'
let manualSoothingMusicActive = false
let soundscapeVolume = 0.25

type MusicStateListener = (active: boolean) => void
type ModeStateListener = (mode: SoundscapeMode) => void

const musicListeners = new Set<MusicStateListener>()
const modeListeners = new Set<ModeStateListener>()

// Load saved settings if in browser
if (typeof window !== 'undefined') {
  try {
    const savedMode = localStorage.getItem('nemi_soundscape_mode') as SoundscapeMode
    if (savedMode && ['forest', 'river', 'beats', 'serenity'].includes(savedMode)) {
      currentMode = savedMode
    }
    const savedVol = localStorage.getItem('nemi_soundscape_volume')
    if (savedVol) {
      soundscapeVolume = Math.max(0, Math.min(1, parseFloat(savedVol)))
    }
  } catch {}
}

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
      void audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Creates 7 seconds of organic Brownian/pink noise for realistic
 * flowing river, forest wind, and gentle breeze.
 */
function createPinkBrownianNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 7
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
      b6 = white * 0.115926
    }
  }
  return buffer
}

/**
 * Synthesizes authentic, melodic bird songs and gentle chirps.
 * Uses high-frequency modulated sines with natural pitch curves and stereo panning.
 */
function playNaturalBirdChirp(ctx: AudioContext, destination: AudioNode) {
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  const panPos = (Math.random() * 1.4 - 0.7) // Panned naturally in left/right trees

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'

  const motif = Math.floor(Math.random() * 3)

  if (motif === 0) {
    // 1. Morning Robin (Upward warble)
    const baseFreq = 2900 + Math.random() * 400
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + 0.16)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    osc.start(now)
    osc.stop(now + 0.24)
  } else if (motif === 1) {
    // 2. Forest Warbler Trill (Delicate double-chirp)
    const baseFreq = 3400 + Math.random() * 300
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.06)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, now + 0.12)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.18)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.065, now + 0.02)
    gain.gain.linearRampToValueAtTime(0.015, now + 0.11)
    gain.gain.linearRampToValueAtTime(0.065, now + 0.16)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

    osc.start(now)
    osc.stop(now + 0.3)
  } else {
    // 3. Distant Finch (Pure peaceful whistle)
    const baseFreq = 2600 + Math.random() * 500
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.linearRampToValueAtTime(baseFreq + 150, now + 0.15)
    osc.frequency.exponentialRampToValueAtTime(baseFreq - 80, now + 0.35)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.055, now + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

    osc.start(now)
    osc.stop(now + 0.42)
  }

  osc.connect(gain)

  if (panner) {
    panner.pan.setValueAtTime(panPos, now)
    gain.connect(panner)
    panner.connect(destination)
  } else {
    gain.connect(destination)
  }
}

/**
 * Synthesizes soft, calming water droplets dripping into a mountain stream.
 */
function playWaterDroplet(ctx: AudioContext, destination: AudioNode) {
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  const startFreq = 950 + Math.random() * 550
  osc.type = 'sine'
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.45, now + 0.07)

  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(startFreq * 0.7, now)
  filter.Q.setValueAtTime(4.0, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.045, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  osc.start(now)
  osc.stop(now + 0.14)
}

/**
 * Synthesizes a soft 60 BPM resting heartbeat sub-pulse for calm focus.
 */
function playFocusPulse(ctx: AudioContext, destination: AudioNode) {
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(54, now)
  osc.frequency.exponentialRampToValueAtTime(46, now + 0.25)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.065, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

  osc.connect(gain)
  gain.connect(destination)

  osc.start(now)
  osc.stop(now + 0.4)
}

const PENTATONIC_CHIMES = [432.0, 486.0, 576.0, 648.0, 729.0]
let chimeIdx = 0

function playAmbientFocusChime(ctx: AudioContext, destination: AudioNode) {
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  const freq = PENTATONIC_CHIMES[chimeIdx % PENTATONIC_CHIMES.length]
  chimeIdx++

  const osc = ctx.createOscillator()
  const oscHarmonic = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)

  // Gentle pure 432Hz harmonic overtone for pristine crystal shimmer
  oscHarmonic.type = 'triangle'
  oscHarmonic.frequency.setValueAtTime(freq * 2, now)

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq * 3.5, now)
  filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 2.4)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.04, now + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5)

  osc.connect(filter)
  oscHarmonic.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  osc.start(now)
  oscHarmonic.start(now)
  osc.stop(now + 2.6)
  oscHarmonic.stop(now + 2.6)
}

/**
 * Initializes and starts the Web Audio organic nature engine.
 */
export function startOrbitalMusicEngine(): boolean {
  const ctx = getAudioContext()
  if (!ctx || isEngineRunning) return false

  try {
    const now = ctx.currentTime

    compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-14, now)
    compressor.knee.setValueAtTime(20, now)
    compressor.ratio.setValueAtTime(3.0, now)
    compressor.attack.setValueAtTime(0.02, now)
    compressor.release.setValueAtTime(0.3, now)
    compressor.connect(ctx.destination)

    masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.0001, now)

    masterFilter = ctx.createBiquadFilter()
    masterFilter.type = 'lowpass'
    // Full high-fidelity acoustic bandwidth (16kHz transparent ceiling)
    masterFilter.frequency.setValueAtTime(16000, now)
    masterFilter.Q.setValueAtTime(0.7, now)

    masterGain.connect(masterFilter)
    masterFilter.connect(compressor)

    const noiseBuffer = createPinkBrownianNoiseBuffer(ctx)

    // 1. Flowing River Bed
    streamSourceNode = ctx.createBufferSource()
    streamSourceNode.buffer = noiseBuffer
    streamSourceNode.loop = true

    streamFilter = ctx.createBiquadFilter()
    streamFilter.type = 'bandpass'
    streamFilter.frequency.setValueAtTime(540, now)
    streamFilter.Q.setValueAtTime(0.75, now)

    streamGain = ctx.createGain()
    streamGain.gain.setValueAtTime(0.06, now)

    streamSourceNode.connect(streamFilter)
    streamFilter.connect(streamGain)
    streamGain.connect(masterGain)
    streamSourceNode.start(now)

    // 2. Forest Breeze Bed
    breezeSourceNode = ctx.createBufferSource()
    breezeSourceNode.buffer = noiseBuffer
    breezeSourceNode.loop = true

    breezeFilter = ctx.createBiquadFilter()
    breezeFilter.type = 'lowpass'
    breezeFilter.frequency.setValueAtTime(380, now)
    breezeFilter.Q.setValueAtTime(0.6, now)

    breezeGain = ctx.createGain()
    breezeGain.gain.setValueAtTime(0.045, now)

    breezeLfo = ctx.createOscillator()
    const breezeLfoGain = ctx.createGain()
    breezeLfo.frequency.setValueAtTime(0.1, now)
    breezeLfoGain.gain.setValueAtTime(140, now)
    breezeLfo.connect(breezeLfoGain)
    breezeLfoGain.connect(breezeFilter.frequency)
    breezeLfo.start(now)

    breezeSourceNode.connect(breezeFilter)
    breezeFilter.connect(breezeGain)
    breezeGain.connect(masterGain)
    breezeSourceNode.start(now)

    scheduleNaturalEvents(ctx)
    applyModeParameters()

    isEngineRunning = true
    return true
  } catch (e) {
    console.warn('Nature soundscape engine failed to start:', e)
    return false
  }
}

/**
 * Periodic timers for realistic natural forest birds, water drops, and focus beats.
 */
function scheduleNaturalEvents(ctx: AudioContext) {
  if (birdChirpTimer) clearInterval(birdChirpTimer)
  if (waterDropTimer) clearInterval(waterDropTimer)
  if (focusBeatTimer) clearInterval(focusBeatTimer)
  if (focusChimeTimer) clearInterval(focusChimeTimer)

  // 🐦 Birds chirp every 3.5 - 6.5 seconds (in 'forest' or 'serenity' modes)
  birdChirpTimer = setInterval(() => {
    if (!masterGain || masterGain.gain.value < 0.005) return
    if (currentMode === 'forest' || currentMode === 'serenity') {
      playNaturalBirdChirp(ctx, masterGain)
      if (Math.random() > 0.6) {
        setTimeout(() => {
          if (masterGain && masterGain.gain.value >= 0.005) {
            playNaturalBirdChirp(ctx, masterGain)
          }
        }, 350)
      }
    }
  }, 4200)

  // 🌊 Water droplets every 2.3 seconds (in 'river' or 'serenity' modes)
  waterDropTimer = setInterval(() => {
    if (!masterGain || masterGain.gain.value < 0.005) return
    if (currentMode === 'river' || currentMode === 'serenity') {
      playWaterDroplet(ctx, masterGain)
    }
  }, 2300)

  // 🎧 Relaxing 60 BPM Focus Heartbeat Pulse (in 'beats' or 'serenity' modes)
  focusBeatTimer = setInterval(() => {
    if (!masterGain || masterGain.gain.value < 0.005) return
    if (currentMode === 'beats' || currentMode === 'serenity') {
      playFocusPulse(ctx, masterGain)
    }
  }, 1000)

  // 🔔 Peaceful Zen Focus Chime every 5.5 seconds (in 'beats' or 'serenity' modes)
  focusChimeTimer = setInterval(() => {
    if (!masterGain || masterGain.gain.value < 0.005) return
    if (currentMode === 'beats' || currentMode === 'serenity') {
      playAmbientFocusChime(ctx, masterGain)
    }
  }, 5500)
}

function applyModeParameters() {
  if (!streamGain || !breezeGain || !audioCtx) return

  const now = audioCtx.currentTime

  switch (currentMode) {
    case 'forest':
      streamGain.gain.setTargetAtTime(0.015, now, 0.4)
      breezeGain.gain.setTargetAtTime(0.065, now, 0.4)
      break
    case 'river':
      streamGain.gain.setTargetAtTime(0.08, now, 0.4)
      breezeGain.gain.setTargetAtTime(0.02, now, 0.4)
      break
    case 'beats':
      streamGain.gain.setTargetAtTime(0.035, now, 0.4)
      breezeGain.gain.setTargetAtTime(0.025, now, 0.4)
      break
    case 'serenity':
    default:
      streamGain.gain.setTargetAtTime(0.05, now, 0.4)
      breezeGain.gain.setTargetAtTime(0.045, now, 0.4)
      break
  }
}

// Auto-resume audio upon user gesture for seamless background playback
if (typeof window !== 'undefined') {
  const autoResumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
  }
  window.addEventListener('click', autoResumeAudio, { passive: true })
  window.addEventListener('pointerdown', autoResumeAudio, { passive: true })
  window.addEventListener('touchstart', autoResumeAudio, { passive: true })
  window.addEventListener('keydown', autoResumeAudio, { passive: true })
}

/**
 * Updates soundscape parameters based on 3D camera distance to the ring.
 * Smoothly blends peaceful ambient presence.
 */
export function updateOrbitalProximity(cameraDistance: number): number {
  const rawProximity = Math.max(0, Math.min(1, (13.0 - cameraDistance) / 8.0))
  const proximity = manualSoothingMusicActive ? Math.max(0.85, rawProximity) : rawProximity

  if (!isEngineRunning || !audioCtx || audioCtx.state !== 'running') {
    return proximity
  }

  const ctx = getAudioContext()
  if (ctx && masterGain && masterFilter) {
    const targetGain = Math.pow(proximity, 1.3) * (manualSoothingMusicActive ? soundscapeVolume : 0.22)
    // High-fidelity studio clarity: opens up to 20kHz sparkle on close proximity
    const targetFilterFreq = 10000 + Math.pow(proximity, 1.1) * 8000

    const now = ctx.currentTime
    masterGain.gain.setTargetAtTime(targetGain, now, 0.2)
    masterFilter.frequency.setTargetAtTime(targetFilterFreq, now, 0.25)
  }

  return proximity
}

export function subscribeSoothingMusic(listener: MusicStateListener): () => void {
  musicListeners.add(listener)
  try {
    listener(manualSoothingMusicActive)
  } catch {}
  return () => {
    musicListeners.delete(listener)
  }
}

export function subscribeSoundscapeMode(listener: ModeStateListener): () => void {
  modeListeners.add(listener)
  try {
    listener(currentMode)
  } catch {}
  return () => {
    modeListeners.delete(listener)
  }
}

export function isSoothingMusicActive(): boolean {
  return manualSoothingMusicActive
}

export function getSoundscapeMode(): SoundscapeMode {
  return currentMode
}

export function setSoundscapeMode(mode: SoundscapeMode): void {
  currentMode = mode
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nemi_soundscape_mode', mode)
    }
  } catch {}
  applyModeParameters()
  modeListeners.forEach((fn) => {
    try { fn(currentMode) } catch {}
  })
}

export function setSoothingMusicActive(active: boolean): boolean {
  manualSoothingMusicActive = active
  if (active) {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    if (!isEngineRunning) {
      startOrbitalMusicEngine()
    }
    if (ctx && masterGain) {
      const now = ctx.currentTime
      masterGain.gain.setTargetAtTime(soundscapeVolume, now, 0.3)
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
  return soundscapeVolume
}

export function setSoothingMusicVolume(vol: number): void {
  soundscapeVolume = Math.max(0, Math.min(1, vol))
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nemi_soundscape_volume', String(soundscapeVolume))
    }
  } catch {}
  if (manualSoothingMusicActive && masterGain) {
    const ctx = getAudioContext()
    if (ctx) {
      masterGain.gain.setTargetAtTime(soundscapeVolume, ctx.currentTime, 0.1)
    }
  }
}

export function stopOrbitalMusicEngine(): void {
  if (birdChirpTimer) clearInterval(birdChirpTimer)
  if (waterDropTimer) clearInterval(waterDropTimer)
  if (focusBeatTimer) clearInterval(focusBeatTimer)
  if (focusChimeTimer) clearInterval(focusChimeTimer)

  if (streamSourceNode) {
    try { streamSourceNode.stop() } catch {}
    streamSourceNode = null
  }
  if (breezeSourceNode) {
    try { breezeSourceNode.stop() } catch {}
    breezeSourceNode = null
  }
  if (breezeLfo) {
    try { breezeLfo.stop() } catch {}
    breezeLfo = null
  }

  isEngineRunning = false
  manualSoothingMusicActive = false
}
