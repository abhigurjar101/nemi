# Original User Request

## 2026-09-04T18:15:00Z

Build a modular, zero-friction, easily removable Human-Centric Companion Layer for NEMI that transforms it into a warm, organic, and living AI companion while keeping the current minimalist front view (3D Brain canvas + central Voice Orb) and core architecture completely intact.

Working directory: /Users/abhigurjar/Desktop/NEMI
Integrity mode: development

## Requirements

### R1. Fully Isolated & Easily Removable Architecture
All human-centric features (breathing/attentive 3D animation, living Voice Orb aura and ripples, acoustic sound design, and conversational warmth pre-processor) must reside in a dedicated, isolated file or directory (e.g. `src/renderer/src/components/HumanCompanionLayer.tsx` or `src/renderer/src/humanCompanion/`). The entire feature set must be easily toggled on/off via a single setting or cleanly removable by deleting that file without breaking any existing NEMI functionality.

### R2. Organic "Breathing" & Attentive 3D Brain Presence
Equip the 3D Brain with an organic respiratory cycle (subtle sinusoidal expansion/contraction when idle) and a smooth forward focus ("leaning in" to listen) when voice input is active, harmonized with Web Audio frequency data.

### R3. Living Voice Orb Aura & Ripple Interaction
Equip the central Voice Orb with smooth audio-reactive acoustic wave ripples and an organic warm inhale glow transition during speech recognition, with tactile sound design (warm acoustic chime on activation, gentle release on close).

### R4. Human-like Conversational & Voice Dual-Mode Processing
Provide dual-mode output processing: formatting markdown, code, and tables cleanly for the drawer chat record while generating natural, conversational, punchy English (with natural breath pauses and conversational courtesy) through Kokoro TTS.

## Acceptance Criteria

### Modularity & Safety
- [ ] The human-companion layer is isolated in separate file(s) and can be enabled/disabled via a single toggle or cleanly unplugged without modifying core app stability.
- [ ] All existing 65 Vitest tests and 16 Python tests pass with zero regressions (`npm test` and `./venv/bin/python3 -m unittest discover tests`).
- [ ] `npm run build` succeeds cleanly with zero TypeScript or Vite bundle errors.

### Visual & Interactive Polish
- [ ] The front canvas remains strictly minimal: only the 3D Brain and Voice Orb are visible.
- [ ] Voice Orb displays smooth, audio-reactive ripples without UI frame drops (maintains 60fps).
- [ ] 3D Brain exhibits natural respiratory idle rhythm and responds to voice activity.
- [ ] Sound feedback triggers softly on Voice Orb tap without audio clipping or errors.

## 2026-09-04T18:47:46Z

This is a focused testing and verification audit by a Principal Software QA Engineer (20+ years testing experience); keep it focused on the updated Voice Server, Kokoro neural TTS, and Human Companion conversational speech.

Working directory: /Users/abhigurjar/Desktop/NEMI
Integrity mode: development

## Requirements

### R1. Kokoro Neural Voice Server Verification
Audit and verify the local Kokoro neural TTS voice server (`voice_server.py`) on port 5002:
- Support for all 10 pre-cached local voices (`af_heart`, `af_bella`, `af_sarah`, `af_sky`, `af_nicole`, `am_adam`, `am_michael`, `bf_emma`, `bf_isabella`, `bm_george`)
- Dual-pipeline architecture with authentic British phonetics (`lang_code='b'`) and American phonetics (`lang_code='a'`) sharing the neural KModel
- Natural 60ms comfort silence between generated speech chunks for human breathing rhythm
- Removal of artificial 500-character truncation, cleanly handling long inputs up to 2,000+ characters with sentence boundary preservation
- Resilient fallback mechanism gracefully reverting to `af_heart` if an individual voice fails

### R2. Conversational Speech & Phonetics Audit
Verify the conversational speech pre-processor (`src/renderer/src/humanCompanion/conversationalSpeech.ts`):
- Phonetic naturalization of currency (`$100` -> `100 dollars`), units (`24kHz`, `100ms`, `2.5s`), and technical acronyms (`AI` -> `A.I.`, `API` -> `A.P.I.`, `UI` -> `U.I.`, `LLM` -> `L.L.M.`)
- Smooth conversational list transitions and markdown cleanup
- Natural speech pacing without robotic repetitive signoffs

### R3. Full System Regression & Build Integrity
Run programmatic verification across the entire project:
- Vitest comprehensive test suite (all 17 test files)
- Python backend unit tests (`test_full_system_voice.py`, `test_full_system_rag.py`, `test_rag_persistence.py`)
- TypeScript compiler verification (`npx tsc --noEmit`)
- Electron Vite production build (`npm run build`)

## Acceptance Criteria

### Automated Test Passing
- [ ] 100% of Vitest tests pass with zero failures (295+ tests)
- [ ] 100% of Python backend tests pass (16 tests)
- [ ] TypeScript check (`npx tsc --noEmit`) completes with 0 errors
- [ ] Production build (`npm run build`) completes cleanly with 0 bundle errors

### Functional & Audio Verification
- [ ] Kokoro TTS produces valid WAV audio with correct PCM headers
- [ ] Voice switching to British and American voice models operates without runtime errors
- [ ] Conversational speech script naturalizes numbers, units, and acronyms properly
