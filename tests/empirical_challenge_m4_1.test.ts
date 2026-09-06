import { describe, expect, it } from 'vitest'
import React from 'react'
import fs from 'fs'
import path from 'path'
import {
  parseMarkdownTable,
  TableBlock,
  type ParsedTable
} from '../src/renderer/src/components/MessageBubble'
import {
  toConversationalScript,
  naturalizePhonetics
} from '../src/renderer/src/humanCompanion/conversationalSpeech'

describe('Teamwork Challenger M4.1: Empirical Stress Suite for Table Parsing, Inline Links & Drawer Rendering', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. Stress-Test parseMarkdownTable Boundary Conditions
  // ─────────────────────────────────────────────────────────────
  describe('1. parseMarkdownTable Boundary Conditions & Stress', () => {
    it('handles single and multiple escaped pipes (\\|) inside cell contents without column corruption', () => {
      const md = `
| Expression | Result | Note |
|---|---|---|
| a \\| b | logical OR | single pipe |
| a \\|\\| b | conditional OR | double pipe \\| inside |
| \\|left | right\\| | boundary pipes |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Expression', 'Result', 'Note'])
      expect(parsed?.rows).toHaveLength(3)

      // Row 1
      expect(parsed?.rows[0][0]).toBe('a | b')
      expect(parsed?.rows[0][1]).toBe('logical OR')
      expect(parsed?.rows[0][2]).toBe('single pipe')

      // Row 2
      expect(parsed?.rows[1][0]).toBe('a || b')
      expect(parsed?.rows[1][1]).toBe('conditional OR')
      expect(parsed?.rows[1][2]).toBe('double pipe | inside')

      // Row 3
      expect(parsed?.rows[2][0]).toBe('|left')
      expect(parsed?.rows[2][1]).toBe('right|')
      expect(parsed?.rows[2][2]).toBe('boundary pipes')
    })

    it('handles escaped pipes in table headers', () => {
      const md = `
| Input \\| Mode | Output \\| Format | Status |
|---|---|---|
| Audio | 24kHz PCM | OK |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Input | Mode', 'Output | Format', 'Status'])
      expect(parsed?.rows[0]).toEqual(['Audio', '24kHz PCM', 'OK'])
    })

    it('handles inline code containing escaped pipes cleanly', () => {
      const md = `
| Command | Purpose |
|---|---|
| \`cat file \\| grep text\` | Pipeline test |
| \`echo "a \\| b"\` | Echo test |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Command', 'Purpose'])
      expect(parsed?.rows[0][0]).toBe('`cat file | grep text`')
      expect(parsed?.rows[0][1]).toBe('Pipeline test')
      expect(parsed?.rows[1][0]).toBe('`echo "a | b"`')
      expect(parsed?.rows[1][1]).toBe('Echo test')
    })

    it('does not crash on unescaped pipes inside inline code, keeping normalized row count', () => {
      // In standard GFM, unescaped pipes inside inline code split at block level
      const md = `
| Code | Explanation |
|---|---|
| \`a | b\` | Bitwise |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toHaveLength(2)
      // Must normalize row length to headers.length without throwing
      expect(parsed?.rows[0]).toHaveLength(2)
    })

    it('strictly rejects malformed separators: non-delimiter text, missing dashes, misplaced colons', () => {
      // Missing dashes
      const noDashes = `
| Col1 | Col2 |
| abc | def |
| 1 | 2 |
`
      expect(parseMarkdownTable(noDashes)).toBeNull()

      // Notes or text in separator
      const textInSep = `
| Header 1 | Header 2 |
| :--- | --- not a separator |
| Val 1 | Val 2 |
`
      expect(parseMarkdownTable(textInSep)).toBeNull()

      // Colon in middle of hyphens
      const colonMiddle = `
| A | B |
| --:- | --- |
| 1 | 2 |
`
      expect(parseMarkdownTable(colonMiddle)).toBeNull()

      // Spaces separating hyphens
      const spacedHyphens = `
| A | B |
| - - - | - - - |
| 1 | 2 |
`
      expect(parseMarkdownTable(spacedHyphens)).toBeNull()

      // Delimiter with escaped pipe
      const escapedPipeInSep = `
| A | B |
| :---\\| | ---: |
| 1 | 2 |
`
      expect(parseMarkdownTable(escapedPipeInSep)).toBeNull()
    })

    it('parses valid separators with different column alignments', () => {
      const md = `
| Left | Center | Right | Default |
|:---|:---:|---:|---|
| L | C | R | D |
`
      const parsed = parseMarkdownTable(md)
      expect(parsed).not.toBeNull()
      expect(parsed?.alignments).toEqual(['left', 'center', 'right', 'default'])
    })

    it('normalizes ragged rows: pads short rows with empty strings and slices overflow rows', () => {
      const raggedMd = `
| H1 | H2 | H3 | H4 |
|---|---|---|---|
| Single |
| Pair 1 | Pair 2 |
| Three 1 | Three 2 | Three 3 |
| Four 1 | Four 2 | Four 3 | Four 4 |
| Five 1 | Five 2 | Five 3 | Five 4 | Overflow 5 | Overflow 6 |
`
      const parsed = parseMarkdownTable(raggedMd)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toHaveLength(4)
      expect(parsed?.rows).toHaveLength(5)

      // Every row must strictly match headers length (4)
      for (const row of parsed!.rows) {
        expect(row).toHaveLength(4)
      }

      // Check padding
      expect(parsed?.rows[0]).toEqual(['Single', '', '', ''])
      expect(parsed?.rows[1]).toEqual(['Pair 1', 'Pair 2', '', ''])
      expect(parsed?.rows[2]).toEqual(['Three 1', 'Three 2', 'Three 3', ''])
      expect(parsed?.rows[3]).toEqual(['Four 1', 'Four 2', 'Four 3', 'Four 4'])
      // Check truncation
      expect(parsed?.rows[4]).toEqual(['Five 1', 'Five 2', 'Five 3', 'Five 4'])
    })

    it('handles empty, whitespace, and non-string inputs safely without crashing', () => {
      expect(parseMarkdownTable('')).toBeNull()
      expect(parseMarkdownTable('   ')).toBeNull()
      expect(parseMarkdownTable('\n\n\t  \r\n')).toBeNull()
      expect(parseMarkdownTable(null as any)).toBeNull()
      expect(parseMarkdownTable(undefined as any)).toBeNull()
      expect(parseMarkdownTable(0 as any)).toBeNull()
      expect(parseMarkdownTable(42 as any)).toBeNull()
      expect(parseMarkdownTable(NaN as any)).toBeNull()
      expect(parseMarkdownTable(true as any)).toBeNull()
      expect(parseMarkdownTable(false as any)).toBeNull()
      expect(parseMarkdownTable({} as any)).toBeNull()
      expect(parseMarkdownTable([] as any)).toBeNull()
      expect(parseMarkdownTable((() => {}) as any)).toBeNull()
      expect(parseMarkdownTable(Symbol('table') as any)).toBeNull()
    })

    it('parses tables without leading or trailing outer pipes', () => {
      const noOuterPipes = `
Col A | Col B | Col C
--- | :---: | ---:
Val 1 | Val 2 | Val 3
`
      const parsed = parseMarkdownTable(noOuterPipes)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Col A', 'Col B', 'Col C'])
      expect(parsed?.alignments).toEqual(['default', 'center', 'right'])
      expect(parsed?.rows[0]).toEqual(['Val 1', 'Val 2', 'Val 3'])
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. Stress-Test Inline Link Rendering in TableBlock & renderInline
  // ─────────────────────────────────────────────────────────────
  describe('2. Inline Link Rendering Stress in Table Cells', () => {
    it('renders links with complex query parameters and anchors in table cells', () => {
      const tableData: ParsedTable = {
        headers: ['Resource', 'Direct Link'],
        rows: [
          [
            'Search Query',
            '[Google Search](https://www.google.com/search?q=nemi+ai&hl=en&gl=us&page=1)'
          ],
          [
            'Documentation Section',
            '[Architecture Spec](https://docs.nemi.ai/guide/companion#audio-reactive-ripples)'
          ],
          [
            'Combined Query and Hash',
            '[API Endpoint](https://api.nemi.ai/v1/synthesize?model=kokoro&speed=1.0#payload-format)'
          ]
        ],
        alignments: ['left', 'left']
      }

      const element = TableBlock({ table: tableData })
      const json = JSON.stringify(element)

      // Verify link texts
      expect(json).toContain('Google Search')
      expect(json).toContain('Architecture Spec')
      expect(json).toContain('API Endpoint')

      // Verify full URLs preserved intact
      expect(json).toContain('https://www.google.com/search?q=nemi+ai&hl=en&gl=us&page=1')
      expect(json).toContain('https://docs.nemi.ai/guide/companion#audio-reactive-ripples')
      expect(json).toContain('https://api.nemi.ai/v1/synthesize?model=kokoro&speed=1.0#payload-format')

      // Verify security attributes
      expect(json).toContain('target":"_blank"')
      expect(json).toContain('rel":"noopener noreferrer"')
      expect(json).toContain('text-cyan-400')
    })

    it('renders multiple markdown links within a single table cell', () => {
      const tableData: ParsedTable = {
        headers: ['Component', 'Links'],
        rows: [
          [
            'Models',
            'Refer to [Kokoro TTS](https://github.com/hexgrad/kokoro) and [Whisper STT](https://github.com/openai/whisper)'
          ]
        ],
        alignments: ['left', 'left']
      }

      const element = TableBlock({ table: tableData })
      const json = JSON.stringify(element)

      expect(json).toContain('Kokoro TTS')
      expect(json).toContain('https://github.com/hexgrad/kokoro')
      expect(json).toContain('Whisper STT')
      expect(json).toContain('https://github.com/openai/whisper')
      expect(json).toContain('Refer to ')
      expect(json).toContain(' and ')
    })

    it('renders URL-encoded parentheses in URLs without breaking', () => {
      const tableData: ParsedTable = {
        headers: ['Topic', 'Reference'],
        rows: [
          [
            'Brain',
            '[Wikipedia](https://en.wikipedia.org/wiki/Brain_%28disambiguation%29)'
          ]
        ],
        alignments: ['left', 'left']
      }

      const element = TableBlock({ table: tableData })
      const json = JSON.stringify(element)

      expect(json).toContain('Wikipedia')
      expect(json).toContain('https://en.wikipedia.org/wiki/Brain_%28disambiguation%29')
    })

    it('rejects unsafe schemes (javascript:, data:) by not rendering them as anchor links', () => {
      const tableData: ParsedTable = {
        headers: ['Safe', 'Unsafe'],
        rows: [
          [
            '[Valid](https://safe.com)',
            '[XSS Attempt](javascript:alert(1)) and [Data Payload](data:text/html,<script>)'
          ]
        ],
        alignments: ['left', 'left']
      }

      const element = TableBlock({ table: tableData })
      const json = JSON.stringify(element)

      // Safe URL should be in an href
      expect(json).toContain('"href":"https://safe.com"')

      // Unsafe URLs should NOT be in href attributes
      expect(json).not.toContain('"href":"javascript:alert(1)"')
      expect(json).not.toContain('"href":"data:text/html')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. Verify TableBlock Dark Glassmorphism Styling & nemi-scroll
  // ─────────────────────────────────────────────────────────────
  describe('3. TableBlock Dark Glassmorphism Styling & Scrollbar Class', () => {
    it('verifies TableBlock contains complete dark glassmorphic styling and nemi-scroll', () => {
      const tableData: ParsedTable = {
        headers: ['Service', 'Status'],
        rows: [['Kokoro', 'Active']],
        alignments: ['left', 'right']
      }

      const element = TableBlock({ table: tableData })
      const json = JSON.stringify(element)

      // Container styling
      expect(json).toContain('nemi-scroll')
      expect(json).toContain('overflow-x-auto')
      expect(json).toContain('rounded-xl')
      expect(json).toContain('border border-white/10')
      expect(json).toContain('bg-slate-900/60')
      expect(json).toContain('backdrop-blur-md')
      expect(json).toContain('shadow-inner')

      // Header styling
      expect(json).toContain('border-b border-white/10 bg-white/5')
      expect(json).toContain('text-cyan-300')
      expect(json).toContain('uppercase tracking-wider text-[10px]')

      // Body styling
      expect(json).toContain('divide-y divide-white/5 font-mono text-[11px]')
      expect(json).toContain('hover:bg-white/5 transition-colors')
      expect(json).toContain('text-white/80')

      // Alignment styling
      expect(json).toContain('"textAlign":"left"')
      expect(json).toContain('"textAlign":"right"')
    })

    it('verifies .nemi-scroll CSS rule exists in globals.css with custom scrollbar properties', () => {
      const cssPath = path.resolve(__dirname, '../src/renderer/src/styles/globals.css')
      const cssContent = fs.readFileSync(cssPath, 'utf-8')

      expect(cssContent).toContain('.nemi-scroll::-webkit-scrollbar')
      expect(cssContent).toContain('.nemi-scroll::-webkit-scrollbar-track')
      expect(cssContent).toContain('.nemi-scroll::-webkit-scrollbar-thumb')
      expect(cssContent).toContain('.nemi-scroll::-webkit-scrollbar-thumb:hover')
      expect(cssContent).toContain('rgba(0, 212, 255, 0.3)')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. Conversational Speech Pre-Processor Stress Verification
  // ─────────────────────────────────────────────────────────────
  describe('4. Conversational Speech & Spoken Summary Transformations', () => {
    it('transforms indented tables into conversational summaries without leaking pipes', () => {
      const text = `
Here are the specs:
    | Param | Value |
    |---|---|
    | Sample Rate | 24000 |
    | Channels | 1 |
Let me know if you need more details.
`
      const script = toConversationalScript(text)
      expect(script).toContain("I've organized the detailed comparison table in your chat notes.")
      expect(script).not.toContain('| Param |')
      expect(script).not.toContain('| Sample Rate |')
      expect(script).not.toContain('|---|---|')
    })

    it('preserves multi-period ellipses (...) through monologue pacing', () => {
      const text = 'Thinking... analyzing audio frames... synthesized successfully.'
      const script = toConversationalScript(text)
      expect(script).toContain('Thinking...')
      expect(script).toContain('analyzing audio frames...')
      expect(script).toContain('synthesized successfully.')
    })

    it('correctly handles currency with single and double digits', () => {
      const single = 'Cost is $12.5 per unit.'
      const double = 'Total comes to $99.95 today.'
      const whole = 'Flat fee of $250.'

      expect(naturalizePhonetics(single)).toContain('12 dollars and 50 cents')
      expect(naturalizePhonetics(double)).toContain('99 dollars and 95 cents')
      expect(naturalizePhonetics(whole)).toContain('250 dollars')
    })

    it('preserves numbered lists without destroying step indicators', () => {
      const list = `1. Initialize the audio context.\n2. Tap the analyser node.\n3. Stream to ripples.`
      const script = toConversationalScript(list)
      expect(script).toContain('1. Initialize')
      expect(script).toContain('2. Tap')
      expect(script).toContain('3. Stream')
    })

    it('does not split decimal numbers across monologue sentences', () => {
      // Monologue > 250 characters
      const monologue = `NEMI is running high-performance neural synthesis. Current audio latency is 2.5 milliseconds across all buffers. This ensures 60fps frame rate without any jitter or latency buildup during extended voice interactions. The system maintains continuous responsiveness throughout.`
      const script = toConversationalScript(monologue)
      // Must not split "2.5" into "2." and "5 milliseconds"
      expect(script).toContain('2.5')
      expect(script).not.toContain('2. milliseconds')
    })
  })
})

  // ─────────────────────────────────────────────────────────────
  // 5. Deep Adversarial Matrix & Edge-Case Stress Testing
  // ─────────────────────────────────────────────────────────────
  describe('5. Deep Adversarial Matrix & Edge-Case Stress Testing', () => {
    it('handles tables surrounded by leading and trailing paragraphs', () => {
      const complexDoc = `
Here is an introductory explanation before the table.
It has multiple sentences describing the feature set.

| Feature | State | Notes |
|:---|:---:|---:|
| Voice Orb | Active | 60fps ripples |
| Companion | Enabled | Breathing motion |

And here is a trailing paragraph concluding the response.
`
      const parsed = parseMarkdownTable(complexDoc)
      expect(parsed).not.toBeNull()
      expect(parsed?.headers).toEqual(['Feature', 'State', 'Notes'])
      expect(parsed?.rows).toHaveLength(2)
      expect(parsed?.rows[0]).toEqual(['Voice Orb', 'Active', '60fps ripples'])
      expect(parsed?.rows[1]).toEqual(['Companion', 'Enabled', 'Breathing motion'])
    })

    it('handles cells containing mixed markdown: links, bold, code, and italics', () => {
      const tableData: ParsedTable = {
        headers: ['Header 1', 'Header 2'],
        rows: [
          [
            'Visit [NEMI AI](https://nemi.ai) for **updates**',
            'Run `npm test` and check *status*'
          ]
        ],
        alignments: ['left', 'left']
      }

      const el = TableBlock({ table: tableData })
      const json = JSON.stringify(el)

      // Link
      expect(json).toContain('NEMI AI')
      expect(json).toContain('https://nemi.ai')
      // Bold
      expect(json).toContain('font-semibold text-white')
      expect(json).toContain('updates')
      // Code
      expect(json).toContain('font-mono text-[11px] bg-white/10 text-cyan-300')
      expect(json).toContain('npm test')
      // Italic
      expect(json).toContain('italic text-white/80')
      expect(json).toContain('status')
    })

    it('safely renders TableBlock when alignments array is missing or shorter than headers', () => {
      const tableNoAlign = {
        headers: ['Col A', 'Col B', 'Col C'],
        rows: [['1', '2', '3']]
      }

      const el = TableBlock({ table: tableNoAlign })
      const json = JSON.stringify(el)

      // Fallback alignment is 'left'
      expect(json).toContain('"textAlign":"left"')
      expect(json).toContain('nemi-scroll')
    })

    it('handles empty rows array in TableBlock without throwing', () => {
      const emptyTable: ParsedTable = {
        headers: ['Empty Col 1', 'Empty Col 2'],
        rows: [],
        alignments: ['left', 'left']
      }

      const el = TableBlock({ table: emptyTable })
      const json = JSON.stringify(el)

      expect(json).toContain('Empty Col 1')
      expect(json).toContain('Empty Col 2')
    })
  })
