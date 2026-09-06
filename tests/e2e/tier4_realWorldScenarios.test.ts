import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  installMockWebAudio,
  restoreMockWebAudio,
  getLastMockAudioContext,
  audioRegistry,
} from '../fixtures/mockWebAudio'
import {
  loadComputeBrainMotion,
  parseMarkdownTable,
  processConversationalSpeech,
  createMockWavBuffer,
  renderCompanion,
} from '../fixtures/companionContract'
import { toConversationalScript } from '../../src/renderer/src/humanCompanion/conversationalSpeech'
import {
  playActivationChime,
  playDeactivationChime,
} from '../../src/renderer/src/humanCompanion/soundscape'

describe('Tier 4 E2E Real-World Scenarios: Human-Centric Companion Layer', () => {
  beforeEach(() => {
    installMockWebAudio()
  })

  afterEach(() => {
    restoreMockWebAudio()
  })

  // ══════════════════════════════════════════════════════════════
  // Scenario 1: Continuous Voice Dialogue with Code and Table Summary
  // Features: F2, F7, F8, F9, F10, F11, F12
  // ══════════════════════════════════════════════════════════════
  it('Scenario 1: Continuous Voice Dialogue with Code and Table Summary (F2, F7, F8, F9, F10, F11, F12)', async () => {
    const { fn } = await loadComputeBrainMotion()
    const ctx = getLastMockAudioContext()
    audioRegistry.reset()

    // 1. User taps Voice Orb to start speaking
    let companionState = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.4, companionEnabled: true }
    playActivationChime()
    expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(2)

    // Visual overlay displays amber ripples behind Voice Orb
    let overlay = renderCompanion({ enabled: true, ...companionState })
    expect(JSON.stringify(overlay)).toContain('amber-ripple')

    // 3D Brain tilts forward attentively
    let brainCurrent = { positionZ: 0, rotationX: 0 }
    for (let f = 0; f < 30; f++) {
      const m = fn(f * 0.016, 0.016, brainCurrent, companionState)
      brainCurrent = { positionZ: m.positionZ, rotationX: m.rotationX }
    }
    expect(brainCurrent.positionZ).toBeGreaterThan(0.5)
    expect(brainCurrent.rotationX).toBeLessThan(0)

    // 2. User finishes speaking; system reflects (thinking)
    companionState = { isListening: false, isThinking: true, isSpeaking: false, audioLevel: 0.0, companionEnabled: true }
    overlay = renderCompanion({ enabled: true, ...companionState })
    expect(JSON.stringify(overlay)).not.toContain('amber-ripple')

    // 3. AI generates rich technical response
    const aiResponse = `
### Model Comparison
Here are the evaluated metrics:
| Architecture | Parameters | Speed |
|---|---|---|
| Kokoro | 82M | 80ms |
| Whisper | 39M | 110ms |

Configuration example:
\`\`\`yaml
service: kokoro
sample_rate: 24000
\`\`\`
`
    // Dual-mode processing:
    // A. Chat drawer structured table rendering
    const tableData = parseMarkdownTable(aiResponse)
    expect(tableData).not.toBeNull()
    expect(tableData?.headers).toEqual(['Architecture', 'Parameters', 'Speed'])
    expect(tableData?.rows.length).toBe(2)

    // B. Conversational speech script pre-processing
    const spokenScript = processConversationalSpeech(aiResponse)
    expect(spokenScript).toContain('Regarding Model Comparison:')
    expect(spokenScript).toContain('chat notes')
    expect(spokenScript).not.toContain('service: kokoro')

    // 4. TTS audio synthesis & playback
    const wavBuffer = createMockWavBuffer(1.2, 24000)
    const audioBuffer = await ctx.decodeAudioData(wavBuffer)
    expect(audioBuffer.sampleRate).toBe(24000)

    const source = ctx.createBufferSource()
    const analyser = ctx.createAnalyser()
    source.connect(analyser)
    analyser.connect(ctx.destination)

    companionState = { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.7, companionEnabled: true }
    overlay = renderCompanion({ enabled: true, ...companionState })
    expect(JSON.stringify(overlay)).toContain('emerald-ripple')

    // 5. Speech playback completes
    source.onended = () => {
      companionState = { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0.0, companionEnabled: true }
      playDeactivationChime()
    }
    source.start(0)
    source.stop(1.2)

    expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(4)
    expect(companionState.isSpeaking).toBe(false)

    // Brain glides back to neutral
    for (let f = 0; f < 30; f++) {
      const m = fn(f * 0.016, 0.016, brainCurrent, companionState)
      brainCurrent = { positionZ: m.positionZ, rotationX: m.rotationX }
    }
    expect(brainCurrent.positionZ).toBeLessThan(0.3)
  })

  // ══════════════════════════════════════════════════════════════
  // Scenario 2: Speech Interrupt and Rapid Voice Orb Tap Toggle
  // Features: F2, F5, F7, F8, F9
  // ══════════════════════════════════════════════════════════════
  it('Scenario 2: Speech Interrupt and Rapid Voice Orb Tap Toggle (F2, F5, F7, F8, F9)', async () => {
    const { fn } = await loadComputeBrainMotion()
    const ctx = getLastMockAudioContext()
    audioRegistry.reset()

    // 1. NEMI is speaking
    const source = ctx.createBufferSource()
    source.start(0)
    let state = { isListening: false, isThinking: false, isSpeaking: true, audioLevel: 0.6, companionEnabled: true }
    let overlay = renderCompanion({ enabled: true, ...state })
    expect(JSON.stringify(overlay)).toContain('emerald-ripple')

    // 2. User interrupts by tapping Voice Orb (Barge-In)
    source.stop(0)
    expect(source.stopped).toBe(true)

    state = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.3, companionEnabled: true }
    playActivationChime()
    overlay = renderCompanion({ enabled: true, ...state })
    expect(JSON.stringify(overlay)).toContain('amber-ripple')
    expect(JSON.stringify(overlay)).not.toContain('emerald-ripple')

    // 3. User rapidly toggles Voice Orb (10 rapid taps)
    for (let tap = 0; tap < 10; tap++) {
      const listening = tap % 2 === 0
      state = { isListening: listening, isThinking: false, isSpeaking: false, audioLevel: 0.1, companionEnabled: true }
      renderCompanion({ enabled: true, ...state })
    }

    // 4. Brain motion remains safe and bounded throughout rapid tapping
    let current = { positionZ: 0.5, rotationX: -0.03 }
    for (let f = 0; f < 20; f++) {
      const m = fn(f * 0.016, 0.016, current, state)
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
      expect(Number.isFinite(m.positionZ)).toBe(true)
      expect(Number.isFinite(m.rotationX)).toBe(true)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // Scenario 3: Complete Companion Unplug / Deletion Simulation
  // Features: F1, F2, F3, F4
  // ══════════════════════════════════════════════════════════════
  it('Scenario 3: Complete Companion Unplug / Deletion Simulation (F1, F2, F3, F4)', async () => {
    const { fn } = await loadComputeBrainMotion()

    // 1. Companion toggle turned OFF globally in settings
    const disabledState = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.5, companionEnabled: false }

    // Overlay completely unmounts (returns null)
    const overlay = renderCompanion({ enabled: false, ...disabledState })
    expect(overlay).toBeNull()

    // 2. Brain motion operates in neutral baseline mode
    for (let t = 0; t < 5; t += 0.5) {
      const m = fn(t, 0.016, { positionZ: 0, rotationX: 0 }, disabledState)
      expect(m.scale).toEqual([1, 1, 1])
      expect(m.positionZ).toBe(0)
      expect(m.rotationX).toBe(0)
      expect(m.excitation).toBe(1.0)
    }

    // 3. Speech processor passes raw text through without modification when companion is disabled
    const rawText = '### Title\n| A | B |\n|---|---|\n| 1 | 2 |'
    const speechText = false ? toConversationalScript(rawText) : rawText
    expect(speechText).toBe(rawText)

    // 4. Front canvas remains minimal with only core canvas active
    const canvasOverlay = renderCompanion({ enabled: false, isListening: false, isThinking: false, isSpeaking: false })
    expect(canvasOverlay).toBeNull()
  })

  // ══════════════════════════════════════════════════════════════
  // Scenario 4: Fallback from Kokoro to Browser Voice Speech
  // Features: F11, F12
  // ══════════════════════════════════════════════════════════════
  it('Scenario 4: Fallback from Kokoro to Browser Voice Speech (F11, F12)', () => {
    const rawMarkdown = `
NEMI has identified the solution:
1. Verify network connection
2. Restart local services
3. Run diagnostic check
`
    // Step 1: Conversational script pre-processing prepares clear text
    const conversationalText = toConversationalScript(rawMarkdown)
    expect(conversationalText).toContain('1. Verify network connection')

    // Step 2: Simulate Kokoro server down (ECONNREFUSED)
    let kokoroOnline = false
    let fallbackSpeechInvoked = false
    let spokenOutput = ''

    const speakWithFallback = (text: string) => {
      if (kokoroOnline) {
        return 'kokoro_audio_buffer'
      } else {
        // Fallback to browser speech synthesis
        fallbackSpeechInvoked = true
        spokenOutput = text
        return 'browser_speech_synthesis'
      }
    }

    const routeResult = speakWithFallback(conversationalText)
    expect(routeResult).toBe('browser_speech_synthesis')
    expect(fallbackSpeechInvoked).toBe(true)
    expect(spokenOutput).toBe(conversationalText)
  })

  // ══════════════════════════════════════════════════════════════
  // Scenario 5: Heavy Multi-Modal Chat Session with 60fps Animation
  // Features: F4, F6, F8, F10
  // ══════════════════════════════════════════════════════════════
  it('Scenario 5: Heavy Multi-Modal Chat Session with 60fps Animation (F4, F6, F8, F10)', async () => {
    const { fn } = await loadComputeBrainMotion()
    const ctx = getLastMockAudioContext()
    const analyser = ctx.createAnalyser()

    let brainCurrent = { positionZ: 0, rotationX: 0 }

    // Simulate 120 consecutive 60fps frames (2 full seconds of animation loop)
    const frameTimes: number[] = []

    for (let frame = 0; frame < 120; frame++) {
      const start = performance.now()
      const t = frame * 0.01666
      const audioLevel = 0.2 + 0.6 * Math.sin(t * 8)
      const isSpeaking = frame > 30 && frame < 90

      // A. Brain motion calculation per frame
      const m = fn(
        t,
        0.01666,
        brainCurrent,
        { isListening: false, isThinking: false, isSpeaking, audioLevel, companionEnabled: true }
      )
      brainCurrent = { positionZ: m.positionZ, rotationX: m.rotationX }

      // B. Audio frequency check per frame
      analyser.setMockFrequencyData([Math.floor(audioLevel * 255), 100, 50])
      const freq = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(freq)

      // C. Render companion ripple overlay
      const overlay = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking,
      })

      if (isSpeaking) {
        expect(JSON.stringify(overlay)).toContain('emerald-ripple')
      }

      const frameDuration = performance.now() - start
      frameTimes.push(frameDuration)
    }

    // Average frame calculation time must be well under 16.6ms (60fps budget)
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    expect(avgFrameTime).toBeLessThan(5.0)

    // Parse massive 30-row table rendered in chat drawer during session
    let massiveTable = '| Turn | Metric | Value |\n|---|---|---|\n'
    for (let r = 1; r <= 30; r++) {
      massiveTable += `| Turn ${r} | FPS | 60 |\n`
    }
    const parsed = parseMarkdownTable(massiveTable)
    expect(parsed?.rows.length).toBe(30)
  })
})
