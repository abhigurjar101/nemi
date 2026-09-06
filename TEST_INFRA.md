# E2E Test Infra: Human-Centric Companion Layer

## Test Philosophy
- Opaque-box, requirement-driven test suite derived from `ORIGINAL_REQUEST.md`.
- Zero dependency on internal implementation details; verifies public contracts and behaviors.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|----------------------|:----------------:|:-----------------:|:-----------------:|:-------------------:|
| 1 | Isolated Directory & Removal | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 2 | Companion Toggle Control | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 3 | Front Canvas Minimalism | ORIGINAL_REQUEST §AC | 5 tests | 5 tests | ✓ | ✓ |
| 4 | Organic 3D Breathing | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 5 | Attentive Forward Leaning | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 6 | 3D Audio Harmonization | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 7 | Living Aura & Inhale Glow | ORIGINAL_REQUEST §R3 | 5 tests | 5 tests | ✓ | ✓ |
| 8 | Acoustic Wave Ripples (60fps) | ORIGINAL_REQUEST §R3 | 5 tests | 5 tests | ✓ | ✓ |
| 9 | Tactile Sound Design | ORIGINAL_REQUEST §R3 | 5 tests | 5 tests | ✓ | ✓ |
| 10 | Chat Drawer Markdown & Tables | ORIGINAL_REQUEST §R4 | 5 tests | 5 tests | ✓ | ✓ |
| 11 | Conversational Spoken Script | ORIGINAL_REQUEST §R4 | 5 tests | 5 tests | ✓ | ✓ |
| 12 | Kokoro TTS Speech Pipeline | ORIGINAL_REQUEST §R4 | 5 tests | 5 tests | ✓ | ✓ |

## Test Architecture
- Test runner: Vitest (`npm test`)
- Location: `tests/e2e/`
- Directory layout:
  - `tests/e2e/tier1_featureCoverage.test.ts`
  - `tests/e2e/tier2_boundaryCases.test.ts`
  - `tests/e2e/tier3_crossFeatureCombinations.test.ts`
  - `tests/e2e/tier4_realWorldScenarios.test.ts`
  - `tests/fixtures/mockWebAudio.ts`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Continuous Voice Dialogue with Code and Table Summary | F2, F7, F8, F9, F10, F11, F12 | High |
| 2 | Speech Interrupt and Rapid Voice Orb Tap Toggle | F2, F5, F7, F8, F9 | High |
| 3 | Complete Companion Unplug / Deletion Simulation | F1, F2, F3, F4 | Medium |
| 4 | Fallback from Kokoro to Browser Voice Speech | F11, F12 | Medium |
| 5 | Heavy Multi-Modal Chat Session with 60fps Animation | F4, F6, F8, F10 | High |

## Coverage Thresholds
- Tier 1: ≥5 tests per feature
- Tier 2: ≥5 tests per feature (boundary & corner cases)
- Tier 3: Pairwise coverage of major feature combinations
- Tier 4: ≥5 realistic end-to-end application scenarios
- **Total planned test cases**: ≥120 tests in `tests/e2e/`
