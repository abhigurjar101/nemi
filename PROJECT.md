# Project: Human-Centric Companion Layer for NEMI

## Architecture
NEMI's architecture combines an Electron + Vite + React 18 frontend with local Python backend services (Kokoro TTS on port 5002, RAG vector store on port 5001) and cloud AI providers.
The Human-Centric Companion Layer enhances NEMI with organic presence, audio reactivity, tactile sound design, and conversational dual-mode processing while strictly preserving the minimalist front canvas and core stability.

### Module Boundaries
1. **Core Canvas & 3D Brain** (`src/renderer/src/components/NemiBrain.tsx`): Renders the 3D neural ellipsoid using React Three Fiber. Accepts optional companion props without hard dependencies on the companion layer.
2. **Core Voice Orb & Chat Drawer** (`src/renderer/src/components/VoiceOrb.tsx`, `ChatPanel.tsx`, `MessageBubble.tsx`): Voice activation trigger, audio bar visualizers, and markdown chat drawer.
3. **Isolated Human Companion Module** (`src/renderer/src/humanCompanion/`):
   - `HumanCompanionLayer.tsx`: Overlay mounting the 2D canvas aura/ripples and handling tactile chime triggers.
   - `companionMotion.ts`: Pure mathematical functions for organic asymmetric breathing and attentive forward leaning.
   - `soundscape.ts`: Web Audio API procedural felt chimes with dynamics compression.
   - `conversationalSpeech.ts`: Dual-mode text transformer preparing spoken scripts for Kokoro TTS.
   - `index.ts`: Barrel export.
4. **App Orchestration & Audio Bridge** (`src/renderer/src/App.tsx`): Manages toggle state (`humanCompanionEnabled`), audio contexts, and provides an audio stream provider for 60fps zero-render visual reactivity.

---

## Feature Inventory
Every feature identified during Survey is listed below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Isolated Directory & Export Contract | All companion code placed in `src/renderer/src/humanCompanion/` with clean barrel exports; core does not break if removed | M1 | Survey 1, R1 |
| 2 | Global Companion Toggle | Instant runtime enable/disable toggle via Settings and state persistence without application restart | M1 | Survey 1, R1 |
| 3 | Strict Front Canvas Minimalism | Remove top-center presence pill from `HumanCompanionLayer.tsx` so only 3D Brain and Voice Orb are visible | M1 | Survey 1 & 2, AC |
| 4 | Asymmetric Sinusoidal Respiratory Cycle | Multi-axis ($X, Y, Z$) asymmetric breathing motion in `NemiBrain` (~4.5s cycle) replacing uniform scaling | M2 | Survey 1, R2 |
| 5 | Attentive Forward Focus ("Leaning In") | Smooth camera-relative forward glide ($Z +1.35$) and pitch tilt ($-0.075\text{ rad}$) when voice listening is active | M2 | Survey 1, R2 |
| 6 | 3D Audio Harmonization | Harmonize 3D Brain excitation and micro-breathing with real Web Audio frequency levels | M2 | Survey 1, R2 |
| 7 | Output Audio Analyser Tap | Connect TTS playback `AudioBufferSourceNode` through an `AnalyserNode` in `App.tsx` to enable speech reactivity | M3 | Survey 1 & 2, R3 |
| 8 | 60fps Living Aura & Acoustic Wave Ripples | High-performance 2D Canvas overlay behind Voice Orb rendering warm inhale glow and speech ripples with zero React virtual DOM re-renders | M3 | Survey 2, R3 |
| 9 | Tactile Sound Design (Anti-Clipping Chimes) | Procedural felt chimes for activation and deactivation with DynamicsCompressorNode and debounce protection | M3 | Survey 2, R3 |
| 10 | Chat Drawer Markdown Table Rendering | Add structured `<TableBlock>` rendering to `MessageBubble.tsx` to display markdown tables with clean glassmorphic design | M4 | Survey 3, R4 |
| 11 | Conversational Spoken Script Pre-Processor | Strip/summarize tables, format numbered lists, expand symbols, and add natural breath pauses (em-dashes, ellipses) in `conversationalSpeech.ts` | M4 | Survey 3, R4 |
| 12 | Kokoro TTS Pipeline Integration | Verify seamless transmission of conversational speech through IPC and Kokoro 24kHz WAV synthesis | M4 | Survey 3, R4 |
| 13 | 100% E2E Test Suite Pass | Complete opaque-box test suite across Tiers 1-4 passing with exit code 0 | M-Final | Survey 3, AC |
| 14 | Zero Regressions on Existing Suites | All 73 Vitest tests and 16 Python tests pass with zero regressions | M-Final | Survey 3, AC |
| 15 | Clean Production Build | `npm run build` succeeds with zero TypeScript or Vite bundle errors | M-Final | Survey 3, AC |
| 16 | Tier 5 Adversarial Coverage Hardening | White-box coverage audit, edge-case stress tests, and verification | M-Final | Project Pattern |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite (Tiers 1-4) | Build requirement-driven opaque-box test harness & test cases across Tiers 1-4; publish TEST_READY.md | none | DONE |
| M1 | Isolated Architecture & Canvas Minimalism | Scaffold isolated module, implement toggle contract in App & Settings, eliminate presence pill for front canvas minimalism | none | DONE |
| M2 | Organic Breathing & Attentive 3D Brain | Implement `companionMotion.ts`, wire asymmetric breathing & forward lean-in into `NemiBrain.tsx` with audio harmonization | M1 | DONE |
| M3 | Living Voice Orb Aura & Ripples + Chimes | Implement 2D canvas aura/ripple engine in `HumanCompanionLayer`, output audio analyser tap in `App.tsx`, and anti-clipping soundscape | M1 | DONE |
| M4 | Dual-Mode Conversational & Table Processing | Implement `<TableBlock>` in `MessageBubble.tsx` and advanced conversational breath/table transformation in `conversationalSpeech.ts` | M1 | DONE |
| M-Final | Final Integration, 100% E2E Pass & Tier 5 Hardening | Pass 100% of E2E test suite (Tiers 1-4), verify 73 Vitest & 16 Python tests pass, verify clean build, execute Tier 5 adversarial hardening | M2, M3, M4, E2E | PLANNED |

---

## Interface Contracts

### 1. NemiBrain Props Contract (`src/renderer/src/components/NemiBrain.tsx`)
```typescript
export interface NemiBrainProps {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  onBrainClick?: () => void
  companionEnabled?: boolean
  audioLevel?: number | (() => number)
}
```

### 2. Companion Motion Engine Contract (`src/renderer/src/humanCompanion/companionMotion.ts`)
```typescript
export interface BrainMotionValues {
  scale: [number, number, number]
  positionZ: number
  rotationX: number
  rotationSpeedY: number
  excitation: number
}

export function computeBrainMotion(
  time: number,
  delta: number,
  current: { positionZ: number; rotationX: number },
  state: {
    isListening: boolean
    isThinking: boolean
    isSpeaking: boolean
    audioLevel: number
    companionEnabled: boolean
  }
): BrainMotionValues
```

### 3. Human Companion Layer Props Contract (`src/renderer/src/humanCompanion/HumanCompanionLayer.tsx`)
```typescript
export interface HumanCompanionLayerProps {
  enabled?: boolean
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  getAudioLevel?: () => number
}
```

### 4. Dual-Mode Text Transformation Contract (`src/renderer/src/humanCompanion/conversationalSpeech.ts`)
```typescript
export function toConversationalScript(rawText: string): string
```
- Spoken mode transforms tables to courteous spoken summaries: `"I've organized the detailed comparison table in your chat notes."`
- Numbered lists convert to smooth spoken transitions: `"First, ... Next, ..."`
- Inserts breath pauses: em-dashes (` — `) and ellipses (`...`) for Kokoro TTS acoustic rhythm.
- Technical shorthand and symbols are converted to spoken English.

---

## Code Layout
- `src/renderer/src/humanCompanion/`: All companion-specific logic (R1).
  - `HumanCompanionLayer.tsx`: Living aura & ripples canvas overlay + audio chime triggers. Strict minimalism: no presence pill.
  - `companionMotion.ts`: Breathing and forward-lean math.
  - `soundscape.ts`: Web Audio felt chime synthesis with dynamics compression.
  - `conversationalSpeech.ts`: Spoken text pre-processor.
  - `index.ts`: Barrel exports.
- `src/renderer/src/components/NemiBrain.tsx`: Core 3D Brain canvas, enhanced with optional companion props.
- `src/renderer/src/components/MessageBubble.tsx`: Core chat bubble, enhanced with markdown table rendering.
- `src/renderer/src/App.tsx`: Layout container, toggle handling, and audio stream routing.
- `tests/e2e/`: E2E test suites (Tiers 1-5).
