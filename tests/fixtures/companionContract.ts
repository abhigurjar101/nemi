import fs from 'fs'
import path from 'path'
import React from 'react'
import { toConversationalScript } from '../../src/renderer/src/humanCompanion/conversationalSpeech'
import HumanCompanionLayer, { type HumanCompanionLayerProps } from '../../src/renderer/src/humanCompanion/HumanCompanionLayer'
import {
  parseMarkdownTable as productionParseMarkdownTable,
  type ParsedTable,
} from '../../src/renderer/src/components/MessageBubble'

/**
 * 📐 Interface Contracts & Progressive Testability Fixture
 * Implements specifications from PROJECT.md & TEST_INFRA.md.
 */

// ── 1. Brain Motion Engine Contract ──────────────────────────
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
  audioLevel: number
  companionEnabled: boolean
}

export type ComputeBrainMotionFn = (
  time: number,
  delta: number,
  current: { positionZ: number; rotationX: number },
  state: BrainMotionState
) => BrainMotionValues

export function referenceComputeBrainMotion(
  time: number,
  delta: number,
  current: { positionZ: number; rotationX: number },
  state: BrainMotionState
): BrainMotionValues {
  if (!state.companionEnabled) {
    return {
      scale: [1, 1, 1],
      positionZ: 0,
      rotationX: 0,
      rotationSpeedY: 0.04,
      excitation: 1.0,
    }
  }

  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0.016
  const rawAudio = typeof state.audioLevel === 'function' ? (state.audioLevel as any)() : state.audioLevel
  const safeAudio = Number.isFinite(rawAudio) ? Math.max(0, Math.min(rawAudio, 1.5)) : 0

  const breathCycle = (2 * Math.PI) / 4.5
  const breathPhase = safeTime * breathCycle

  const baseScaleX = 1 + Math.sin(breathPhase) * 0.024
  const baseScaleY = 1 + Math.sin(breathPhase + 0.35) * 0.018
  const baseScaleZ = 1 + Math.sin(breathPhase - 0.25) * 0.022

  const audioPulse = safeAudio * 0.04 * Math.sin(safeTime * 12)
  const excitation = (state.isListening ? 1.3 : state.isThinking ? 1.15 : state.isSpeaking ? 1.25 : 1.0) + safeAudio * 0.4

  const scale: [number, number, number] = [
    (baseScaleX + audioPulse) * (1 + (excitation - 1) * 0.08),
    (baseScaleY + audioPulse) * (1 + (excitation - 1) * 0.08),
    (baseScaleZ + audioPulse) * (1 + (excitation - 1) * 0.08),
  ]

  const targetZ = state.isListening ? 1.35 : 0.0
  const targetPitch = state.isListening ? -0.075 : 0.0

  const lerpFactor = Math.min(1, Math.max(0, safeDelta * 3.8))
  const safeCurrentZ = Number.isFinite(current.positionZ) ? current.positionZ : 0
  const safeCurrentPitch = Number.isFinite(current.rotationX) ? current.rotationX : 0

  const clampedCurrentZ = Math.max(-5, Math.min(safeCurrentZ, 10))
  const positionZ = clampedCurrentZ + (targetZ - clampedCurrentZ) * lerpFactor
  const rotationX = safeCurrentPitch + (targetPitch - safeCurrentPitch) * lerpFactor
  const rotationSpeedY = 0.04 * (state.isThinking ? 1.5 : state.isSpeaking ? 1.2 : 1.0)

  return {
    scale,
    positionZ,
    rotationX,
    rotationSpeedY,
    excitation,
  }
}

export async function loadComputeBrainMotion(): Promise<{
  fn: ComputeBrainMotionFn
  isRealImplementation: boolean
}> {
  const filePath = path.resolve(__dirname, '../../src/renderer/src/humanCompanion/companionMotion.ts')
  if (fs.existsSync(filePath)) {
    try {
      const mod = await import('../../src/renderer/src/humanCompanion/companionMotion')
      if (typeof mod.computeBrainMotion === 'function') {
        return { fn: mod.computeBrainMotion, isRealImplementation: true }
      }
    } catch {
      // fallback
    }
  }
  return { fn: referenceComputeBrainMotion, isRealImplementation: false }
}

// ── 2. Markdown Table Parser & Contract ──────────────────────
export type { ParsedTable }

export function parseMarkdownTable(markdown: string): ParsedTable | null {
  return productionParseMarkdownTable(markdown)
}

// ── 3. Conversational Speech Table Pre-Processor Contract ───
export function processConversationalSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return ''
  const tableRegex = /^[ \t]*\|[^\n]+\|\r?\n[ \t]*\|[-:\s|]+\|\r?\n(?:[ \t]*\|[^\n]+\|\r?\n?)*/gm
  const preProcessed = rawText.replace(tableRegex, " I've organized the detailed comparison table in your chat notes. ")
  return toConversationalScript(preProcessed)
}

// ── 4. Kokoro TTS Audio Waveform Mock ─────────────────────────
export function createMockWavBuffer(durationSeconds = 0.5, sampleRate = 24000): ArrayBuffer {
  const numChannels = 1
  const bytesPerSample = 2
  const numSamples = Math.max(1, Math.floor(durationSeconds * sampleRate))
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * blockAlign
  const totalSize = 44 + dataSize

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  view.setUint32(0, 0x52494646, false) // 'RIFF'
  view.setUint32(4, 36 + dataSize, true)
  view.setUint32(8, 0x57415645, false) // 'WAVE'
  view.setUint32(12, 0x666d7420, false) // 'fmt '
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  view.setUint32(36, 0x64617461, false) // 'data'
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * 32767
    view.setInt16(44 + i * 2, sample, true)
  }

  return buffer
}

// ── 5. Safe React Component Testing Helper ────────────────────
export function renderCompanion(
  props: HumanCompanionLayerProps,
  onEffect?: (effectCb: () => void) => void
): React.ReactElement | null {
  const internals =
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ||
    (React as any).default?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

  const prevDispatcher = internals?.ReactCurrentDispatcher?.current

  if (internals?.ReactCurrentDispatcher) {
    internals.ReactCurrentDispatcher.current = {
      useRef: (init: any) => ({ current: init }),
      useEffect: (cb: () => void) => {
        if (onEffect) onEffect(cb)
        else cb()
      },
      useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
      useMemo: (factory: () => any) => factory(),
      useCallback: (cb: any) => cb,
    }
  }

  try {
    return HumanCompanionLayer(props)
  } finally {
    if (internals?.ReactCurrentDispatcher) {
      internals.ReactCurrentDispatcher.current = prevDispatcher
    }
  }
}
