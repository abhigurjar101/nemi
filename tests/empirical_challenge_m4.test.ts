import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import {
  parseMarkdownTable,
  TableBlock,
  type ParsedTable
} from '../src/renderer/src/components/MessageBubble'
import {
  toConversationalScript,
  naturalizePhonetics
} from '../src/renderer/src/humanCompanion/conversationalSpeech'
import {
  parseMarkdownTable as fixtureParseMarkdownTable,
  processConversationalSpeech
} from './fixtures/companionContract'

describe('Empirical Challenge: Milestone 4 Dual-Mode Conversational & Table Processing', () => {
  // ══════════════════════════════════════════════════════════════
  // Dimension 1: Production Table Parser & TableBlock
  // ══════════════════════════════════════════════════════════════
  describe('Dimension 1: Production Table Parser & TableBlock', () => {
    it('parses standard markdown table with headers, rows, and alignments', () => {
      const md = `
| Service | Status | Latency |
|:---|:---:|---:|
| Kokoro TTS | Online | 60ms |
| Whisper STT | Active | 120ms |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Service', 'Status', 'Latency'])
      expect(parsed?.rows).toHaveLength(2)
      expect(parsed?.rows[0]).toEqual(['Kokoro TTS', 'Online', '60ms'])
      expect(parsed?.alignments).toEqual(['left', 'center', 'right'])
    })

    it('handles escaped pipes inside cells without corrupting column counts', () => {
      const md = `
| Operator | Usage | Description |
|---|---|---|
| \\| | a \\| b | Bitwise OR operator |
| & | a & b | Bitwise AND operator |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers.length).toBe(3)
      expect(parsed?.rows.length).toBe(2)
      expect(parsed?.rows[0][0]).toBe('|')
      expect(parsed?.rows[0][1]).toBe('a | b')
      expect(parsed?.rows[0].length).toBe(3)
    })

    it('enforces strict separator validation and rejects malformed separator lines', () => {
      const invalidSep = `
| Option A | Option B |
| Note: --- not a delimiter | Value B |
| 1 | 2 |
`
      expect(parseMarkdownTable(invalidSep)).toBeNull()
    })

    it('safely handles empty strings, whitespace, null, and non-string inputs', () => {
      expect(parseMarkdownTable('')).toBeNull()
      expect(parseMarkdownTable('    \n   \t  ')).toBeNull()
      expect(parseMarkdownTable(null as any)).toBeNull()
      expect(parseMarkdownTable(undefined as any)).toBeNull()
      expect(parseMarkdownTable(12345 as any)).toBeNull()
    })

    it('normalizes ragged rows by padding short rows and trimming long rows', () => {
      const raggedMd = `
| Col 1 | Col 2 | Col 3 |
|---|---|---|
| A | B |
| C | D | E | F |
`
      const parsed = parseMarkdownTable(raggedMd)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Col 1', 'Col 2', 'Col 3'])
      expect(parsed?.rows[0]).toEqual(['A', 'B', ''])
      expect(parsed?.rows[1]).toEqual(['C', 'D', 'E'])
    })

    it('renders TableBlock with nemi-scroll and alignment styling', () => {
      const tableData: ParsedTable = {
        headers: ['Left', 'Center', 'Right'],
        rows: [['1', '2', '3']],
        alignments: ['left', 'center', 'right']
      }
      const el = TableBlock({ table: tableData })
      const json = JSON.stringify(el)
      expect(json).toContain('nemi-scroll')
      expect(json).toContain('overflow-x-auto')
      expect(json).toContain('textAlign":"left"')
      expect(json).toContain('textAlign":"center"')
      expect(json).toContain('textAlign":"right"')
    })

    it('renders clickable markdown links in MessageBubble with external attributes', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/components/MessageBubble.tsx'),
        'utf-8'
      )
      expect(source).toContain('text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors')
      expect(source).toContain('target="_blank"')
      expect(source).toContain('rel="noopener noreferrer"')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Dimension 2: Conversational Speech & Phonetic Refinements
  // ══════════════════════════════════════════════════════════════
  describe('Dimension 2: Conversational Speech & Phonetics', () => {
    it('supports indented markdown tables and replaces them with polite chat notes reference', () => {
      const indented = `
Here is our performance overview:
  | Engine | Voice | Latency |
  |---|---|---|
  | Kokoro | af_heart | 60ms |
  | Whisper | tiny.en | 120ms |
`
      const script = toConversationalScript(indented)
      expect(script).toContain("I've organized the detailed comparison table in your chat notes.")
      expect(script).not.toContain('| Kokoro |')
    })

    it('protects intentional ellipses (...) across period deduplication', () => {
      const input = 'Wait... let me check the status... everything looks good.'
      const spoken = toConversationalScript(input)
      expect(spoken).toContain('Wait...')
      expect(spoken).toContain('status...')
      expect(spoken).toContain('everything looks good.')
    })

    it('expands double hyphens ( -- ) to em-dash ( — ) for natural breathing cadence', () => {
      const input = 'Latency is critical -- 100ms makes all the difference.'
      const spoken = toConversationalScript(input)
      expect(spoken).toContain('Latency is critical — 100 milliseconds makes all the difference.')
    })

    it('expands technical symbols (!=, !==, =>, standalone &) in naturalizePhonetics', () => {
      const symbols = 'Condition x != y and a !== b => result is true & valid. Avoid &amp; changes.'
      const spoken = naturalizePhonetics(symbols)
      expect(spoken).toContain('is not equal to y')
      expect(spoken).toContain('is not equal to b')
      expect(spoken).toContain('leads to result is true and valid.')
      expect(spoken).toContain('&amp;')
    })

    it('formats single-digit currency cents ($50.5 -> 50 dollars and 50 cents)', () => {
      const cost = 'The upgrade costs $50.5 for the pro plan.'
      const spoken = toConversationalScript(cost)
      expect(spoken).toContain('50 dollars and 50 cents')
    })

    it('protects decimal numbers during monologue sentence splitting without splitting across sentences', () => {
      const longText =
        'NEMI 2.5 delivers high performance and stability. ' +
        'It features 100ms latency and 24kHz audio synthesis. ' +
        'Additional system architecture details are extensive and continue on for several sentences exceeding two hundred and fifty characters in length and there are more explanations following.'
      expect(longText.length).toBeGreaterThan(250)
      const spoken = toConversationalScript(longText)
      expect(spoken).toContain('NEMI 2.5 delivers high performance and stability.')
      expect(spoken).toContain('100 milliseconds latency')
      expect(spoken).toContain("I've placed the full breakdown in our chat notes for you to review.")
      expect(spoken).not.toContain('NEMI 2. 5')
    })

    it('strictly preserves numeric list markers (1. , 2. ) without replacing them', () => {
      const list = `Steps to launch:
1. Start local server
2. Connect audio stream
3. Begin conversation`
      const script = toConversationalScript(list)
      expect(script).toContain('1. Start local server')
      expect(script).toContain('2. Connect audio stream')
      expect(script).toContain('3. Begin conversation')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Dimension 3: App.tsx Audio Resilience & Fallbacks
  // ══════════════════════════════════════════════════════════════
  describe('Dimension 3: App.tsx Audio Resilience & Fallbacks', () => {
    it('verifies App.tsx keeps a browser speech fallback for local TTS', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )
      const speakTextBlock = appSource.substring(
        appSource.indexOf('const speakText = useCallback'),
        appSource.indexOf('const handleTestVoice = useCallback')
      )
      expect(speakTextBlock).toContain('catch { browserSpeak(snippet) }')
      expect(speakTextBlock).toContain('browserSpeak(snippet)')
    })

    it('verifies App.tsx strips markdown table pipes in standard fallback mode', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )
      expect(appSource).toContain('.replace(/\\|[^\\n]+\\|/g')
    })
  })

  // ══════════════════════════════════════════════════════════════
  // Dimension 4: Test Fixture Delegation Contract
  // ══════════════════════════════════════════════════════════════
  describe('Dimension 4: Test Fixture Delegation Contract', () => {
    it('verifies companionContract delegates parseMarkdownTable to production MessageBubble', () => {
      const testMd = `
| Col A | Col B |
|---|---|
| Val 1 | Val 2 |
`
      const prodResult = parseMarkdownTable(testMd)
      const fixtureResult = fixtureParseMarkdownTable(testMd)
      expect(fixtureResult).toEqual(prodResult)
    })

    it('verifies processConversationalSpeech handles indented tables seamlessly', () => {
      const indented = `
Summary notes:
  | Metric | Value |
  |---|---|
  | Accuracy | 99% |
`
      const processed = processConversationalSpeech(indented)
      expect(processed).toContain("I've organized the detailed comparison table in your chat notes.")
    })
  })
})
