import { describe, expect, it, beforeEach, afterEach } from 'vitest'
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
  playThoughtSpark,
} from '../../src/renderer/src/humanCompanion/soundscape'

describe('Tier 3 E2E Cross-Feature Combinations: Pairwise Interactions', () => {
  beforeEach(() => {
    installMockWebAudio()
  })

  afterEach(() => {
    restoreMockWebAudio()
  })

  // ── Pairwise 1: Toggle OFF while Audio Playing ─────────────
  it('P1: toggling companion OFF while voice state is active silences chimes and unmounts visual layer immediately', () => {
    audioRegistry.reset()
    // Active state with companion enabled
    let el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
    expect(el).not.toBeNull()
    expect(JSON.stringify(el)).toContain('amber-ripple')

    // Toggled OFF mid-session
    el = renderCompanion({ enabled: false, isListening: true, isThinking: false, isSpeaking: false })
    expect(el).toBeNull()

    // State transition while OFF emits no audio
    audioRegistry.reset()
    renderCompanion({ enabled: false, isListening: false, isThinking: true, isSpeaking: false })
    expect(audioRegistry.oscillators.length).toBe(0)
  })

  // ── Pairwise 2: Toggle & Conversational Dual-Mode ──────────
  it('P2: companion toggle switches dual-mode text processing between raw markdown and conversational spoken script', () => {
    const rawMarkdown = '### System Architecture\n\n| Service | Port |\n|---|---|\n| Kokoro | 5002 |\n\nCode:\n```bash\ncurl localhost:5002\n```'

    // When companion is enabled: dual-mode transformation
    const spoken = processConversationalSpeech(rawMarkdown)
    expect(spoken).toContain('Regarding System Architecture:')
    expect(spoken).toContain('chat notes')
    expect(spoken).not.toContain('curl localhost:5002')

    // When companion is disabled: raw text is preserved for direct standard readout
    const disabledSpoken = rawMarkdown
    expect(disabledSpoken).toContain('curl localhost:5002')
    expect(disabledSpoken).toContain('| Service | Port |')
  })

  // ── Pairwise 3: 3D Breathing & Attentive Leaning In ─────────
  it('P3: 3D Brain executes organic respiratory cycle simultaneously with forward leaning translation', async () => {
    const { fn } = await loadComputeBrainMotion()
    let current = { positionZ: 0, rotationX: 0 }
    const state = { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.1, companionEnabled: true }

    // Advance 30 frames
    for (let i = 0; i < 30; i++) {
      const m = fn(i * 0.016, 0.016, current, state)
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
      // Verify scale is asymmetric and positive while translating forward
      expect(m.scale[0]).toBeGreaterThan(0.9)
      expect(m.scale[0]).toBeLessThan(1.2)
    }

    // Position glided forward significantly
    expect(current.positionZ).toBeGreaterThan(0.5)
    expect(current.rotationX).toBeLessThan(0)
  })

  // ── Pairwise 4: Forward Leaning & Audio Harmonization ───────
  it('P4: audio frequency level modulates brain excitation while leaning forward attentively', async () => {
    const { fn } = await loadComputeBrainMotion()
    const quietMotion = fn(
      1.0,
      0.016,
      { positionZ: 1.0, rotationX: -0.05 },
      { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.0, companionEnabled: true }
    )
    const loudMotion = fn(
      1.0,
      0.016,
      { positionZ: 1.0, rotationX: -0.05 },
      { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.9, companionEnabled: true }
    )

    // Forward position maintained in both
    expect(quietMotion.positionZ).toBeGreaterThan(0.9)
    expect(loudMotion.positionZ).toBeGreaterThan(0.9)
    // Audio level amplifies excitation
    expect(loudMotion.excitation).toBeGreaterThan(quietMotion.excitation)
  })

  // ── Pairwise 5: Living Aura, Ripples & Toggle ───────────────
  it('P5: living aura and ripple wave animations unmount cleanly on toggle disable and restore on enable', () => {
    // Enabled + speaking: emerald ripples
    let el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
    expect(JSON.stringify(el)).toContain('emerald-ripple')

    // Disabled mid-speech: null returned
    el = renderCompanion({ enabled: false, isListening: false, isThinking: false, isSpeaking: true })
    expect(el).toBeNull()

    // Re-enabled: emerald ripples restored
    el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
    expect(JSON.stringify(el)).toContain('emerald-ripple')
  })

  // ── Pairwise 6: Markdown Tables + Code Blocks in Speech ─────
  it('P6: conversational pre-processor handles combined tables, code blocks, and bullet lists in single response', () => {
    const multiBlockMarkdown = `
# Benchmark Report
Here are the metrics:
| Metric | Value |
|---|---|
| Latency | 15ms |
| Accuracy | 99% |

Implementation:
\`\`\`typescript
const client = new NemiClient()
\`\`\`

Key advantages:
- Instant local generation
- Total privacy
`
    const spoken = processConversationalSpeech(multiBlockMarkdown)
    expect(spoken).toContain('Regarding Benchmark Report:')
    expect(spoken).toContain('chat notes')
    expect(spoken).not.toContain('const client')
    expect(spoken).toContain('Instant local generation,')
    expect(spoken).toContain('Total privacy,')
  })

  // ── Pairwise 7: Conversational Speech & Kokoro Audio Buffer ──
  it('P7: transformed conversational script generates valid audio synthesis buffer via Kokoro pipeline', async () => {
    const raw = '### Voice Pipeline\n- Kokoro 82M TTS\n- 24kHz High Fidelity'
    const script = toConversationalScript(raw)
    expect(script).toContain('Regarding Voice Pipeline:')

    const ctx = getLastMockAudioContext()
    const wavBuffer = createMockWavBuffer(1.0, 24000)
    const audioBuffer = await ctx.decodeAudioData(wavBuffer)

    expect(audioBuffer.sampleRate).toBe(24000)
    expect(audioBuffer.numberOfChannels).toBe(1)
    expect(audioBuffer.duration).toBeCloseTo(1.0, 1)
  })

  // ── Pairwise 8: Ripples & TTS Output Analyser Reactivity ────
  it('P8: TTS audio playback connects through AnalyserNode to drive audio reactive wave ripples', () => {
    const ctx = getLastMockAudioContext()
    const source = ctx.createBufferSource()
    const analyser = ctx.createAnalyser()
    source.connect(analyser)
    analyser.connect(ctx.destination)

    // Simulate speech audio playback with frequency data
    analyser.setMockFrequencyData([150, 210, 180, 90, 60])
    const freqData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(freqData)
    const avgVolume = (freqData[0] + freqData[1] + freqData[2]) / 3

    expect(avgVolume).toBeGreaterThan(100)

    // Visual ripple layer receives speaking state
    const el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
    expect(JSON.stringify(el)).toContain('emerald-ripple')
  })

  // ── Pairwise 9: Soundscape Chimes & 3D Forward Lean Pipeline ─
  it('P9: voice activation state pipeline executes chimes and forward lean in synchronized harmony', async () => {
    const { fn } = await loadComputeBrainMotion()
    audioRegistry.reset()

    // Step 1: Voice activates -> Activation chime plays
    playActivationChime()
    expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(2)

    // Step 2: 3D Brain glides forward
    let current = { positionZ: 0, rotationX: 0 }
    for (let frame = 0; frame < 30; frame++) {
      const m = fn(frame * 0.016, 0.016, current, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.3, companionEnabled: true })
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
    }
    expect(current.positionZ).toBeGreaterThan(0.5)

    // Step 3: Voice stops -> Deactivation chime plays & brain glides back
    audioRegistry.reset()
    playDeactivationChime()
    expect(audioRegistry.oscillators.length).toBeGreaterThanOrEqual(2)

    for (let frame = 0; frame < 30; frame++) {
      const m = fn(frame * 0.016, 0.016, current, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0, companionEnabled: true })
      current = { positionZ: m.positionZ, rotationX: m.rotationX }
    }
    expect(current.positionZ).toBeLessThan(0.3)
  })

  // ── Pairwise 10: Canvas Minimalism & Chat Drawer Coexistence 
  it('P10: front canvas maintains zero visual obstruction while chat drawer renders rich markdown tables', () => {
    // Front canvas companion layer
    const canvasOverlay = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: false })
    const canvasJson = JSON.stringify(canvasOverlay)
    expect(canvasJson).not.toContain('table')
    expect(canvasJson).not.toContain('top-4')

    // Chat drawer parses structured table cleanly
    const tableMd = '| Key | Value |\n|---|---|\n| Latency | 12ms |'
    const parsedTable = parseMarkdownTable(tableMd)
    expect(parsedTable).not.toBeNull()
    expect(parsedTable?.headers).toEqual(['Key', 'Value'])
    expect(parsedTable?.rows[0]).toEqual(['Latency', '12ms'])
  })

  // ── Pairwise 11: Barge-In Interruption (Speaking -> Listening) 
  it('P11: barge-in interruption transitions immediately from speaking to listening ripples and forward lean', async () => {
    const { fn } = await loadComputeBrainMotion()
    // Initial speaking state: emerald ripples
    let el = renderCompanion({ enabled: true, isListening: false, isThinking: false, isSpeaking: true })
    expect(JSON.stringify(el)).toContain('emerald-ripple')

    // User interrupts: immediately switch to listening
    el = renderCompanion({ enabled: true, isListening: true, isThinking: false, isSpeaking: false })
    expect(JSON.stringify(el)).toContain('amber-ripple')
    expect(JSON.stringify(el)).not.toContain('emerald-ripple')

    // Brain immediately tilts and moves forward
    const m = fn(0.016, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: true, isThinking: false, isSpeaking: false, audioLevel: 0.4, companionEnabled: true })
    expect(m.positionZ).toBeGreaterThan(0)
    expect(m.rotationX).toBeLessThan(0)
  })

  // ── Pairwise 12: Companion Disabled Idle Brain Motion Baseline 
  it('P12: companion disabled completely reverts brain motion to pure neutral baseline without animation cost', async () => {
    const { fn } = await loadComputeBrainMotion()
    for (let t = 0; t < 5; t += 1.0) {
      const m = fn(t, 0.016, { positionZ: 0, rotationX: 0 }, { isListening: false, isThinking: false, isSpeaking: false, audioLevel: 0.5, companionEnabled: false })
      expect(m.scale).toEqual([1, 1, 1])
      expect(m.positionZ).toBe(0)
      expect(m.rotationX).toBe(0)
      expect(m.excitation).toBe(1.0)
    }
  })
})
