import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  naturalizePhonetics,
  toConversationalScript
} from '../src/renderer/src/humanCompanion/conversationalSpeech'

describe('Empirical Challenge M4-2: Conversational Speech & TTS Pre-Processing', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. Breath pauses: ellipses (...) and em-dashes (—)
  // ─────────────────────────────────────────────────────────────
  describe('1. Breath Pauses & Cadence', () => {
    it('confirms intentional ellipses (...) survive to the final script', () => {
      const input = 'Wait... let me check... all systems are operational.'
      const result = toConversationalScript(input)
      expect(result).toContain('Wait...')
      expect(result).toContain('check...')
      expect(result).toContain('all systems are operational.')
    })

    it('confirms em-dashes (—) survive to the final script', () => {
      const input = 'Latency is minimal — approximately 50 milliseconds — ensuring real-time response.'
      const result = toConversationalScript(input)
      expect(result).toContain(' — ')
      expect(result).toContain('Latency is minimal — approximately 50 milliseconds — ensuring real-time response.')
    })

    it('confirms double hyphens (--) are converted to em-dash (—) for speech rhythm', () => {
      const input = 'Local Kokoro TTS -- neural audio synthesis -- runs offline.'
      const result = toConversationalScript(input)
      expect(result).toContain('Local Kokoro T.T.S. — neural audio synthesis — runs offline.')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. Decimal protection & monologue sentence splitting
  // ─────────────────────────────────────────────────────────────
  describe('2. Decimal Protection in Long Monologues (>250 chars)', () => {
    it('preserves float 2.5 in long monologue without false sentence splitting', () => {
      const longMonologue =
        'NEMI version 2.5 introduces seamless conversational speech and low-latency Kokoro synthesis. ' +
        'The audio processing pipeline maintains 24kHz sample rate with natural prosody. ' +
        'In addition, this update includes comprehensive regression suites and full system integration verification for desktop environments.'
      expect(longMonologue.length).toBeGreaterThan(250)
      const result = toConversationalScript(longMonologue)
      expect(result).toContain('2.5')
      expect(result).not.toContain('2. 5')
      expect(result).toContain("I've placed the full breakdown in our chat notes for you to review.")
    })

    it('preserves float 3.14159 in long monologue without false sentence splitting', () => {
      const longMonologue =
        'The mathematical constant is approximately 3.14159 according to precision calculations. ' +
        'This calculation is utilized in geometric transformations and neural network activation profiles. ' +
        'Additional architecture documentation can be found in the system specification files for engineering reference.'
      expect(longMonologue.length).toBeGreaterThan(250)
      const result = toConversationalScript(longMonologue)
      expect(result).toContain('3.14159')
      expect(result).not.toContain('3. 14159')
      expect(result).toContain("I've placed the full breakdown in our chat notes for you to review.")
    })

    it('tests version 1.2.3 in long monologue for false sentence splitting', () => {
      const longMonologue =
        'We recently deployed version 1.2.3 across all client installations and user workstations. ' +
        'The response latency dropped significantly down to 60 milliseconds on local hardware. ' +
        'Users can continue using the desktop companion seamlessly without manual configuration or server restarts.'
      expect(longMonologue.length).toBeGreaterThan(250)
      const result = toConversationalScript(longMonologue)
      // If falsely split, result contains '1.2. 3' instead of '1.2.3' and drops sentence 2
      expect(result).toContain('1.2.3')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. Currency edge cases
  // ─────────────────────────────────────────────────────────────
  describe('3. Currency Edge Cases', () => {
    it('handles $50.5 (single-digit cents)', () => {
      const result = naturalizePhonetics('The monthly subscription is $50.5 today.')
      expect(result).toBe('The monthly subscription is 50 dollars and 50 cents today.')
    })

    it('handles $100 (whole number currency)', () => {
      const result = naturalizePhonetics('The cost is $100 total.')
      expect(result).toBe('The cost is 100 dollars total.')
    })

    it('handles $0.99 (sub-dollar currency)', () => {
      const result = naturalizePhonetics('The microtransaction costs $0.99 only.')
      expect(result).toBe('The microtransaction costs 0 dollars and 99 cents only.')
    })

    it('handles $1,000,000.50 (comma-formatted currency with cents)', () => {
      const result = naturalizePhonetics('The enterprise valuation reached $1,000,000.50 this quarter.')
      expect(result).toBe('The enterprise valuation reached 1,000,000 dollars and 50 cents this quarter.')
    })

    it('handles $10,000 (comma-formatted whole currency)', () => {
      const result = naturalizePhonetics('The reserve fund has $10,000 available.')
      expect(result).toBe('The reserve fund has 10,000 dollars available.')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. Numbered lists preservation
  // ─────────────────────────────────────────────────────────────
  describe('4. Numbered Lists Preservation', () => {
    it('strictly preserves numeric list markers (1. , 2. ) to guarantee zero regressions', () => {
      const list = `Deployment plan:
1. Verify unit tests
2. Run production build
3. Package desktop application`
      const result = toConversationalScript(list)
      expect(result).toContain('1. Verify unit tests')
      expect(result).toContain('2. Run production build')
      expect(result).toContain('3. Package desktop application')
    })

    it('preserves multi-digit numeric markers (10. , 11. )', () => {
      const list = `10. Advanced configuration\n11. Final verification`
      const result = toConversationalScript(list)
      expect(result).toContain('10. Advanced configuration')
      expect(result).toContain('11. Final verification')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. Dual-mode behavior verification
  // ─────────────────────────────────────────────────────────────
  describe('5. Dual-Mode Behavior (Conversation State vs Kokoro TTS)', () => {
    it('verifies App.tsx stores raw markdown in conversation state while passing conversational script to TTS', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )

      // Conversation state stores finalText directly
      expect(appSource).toContain('messages: updatedMessages')
      expect(appSource).toContain('setMessages((prev) =>')

      // TTS pre-processing branch
      expect(appSource).toContain('const snippet = humanCompanionEnabled')
      expect(appSource).toContain('? toConversationalScript(text)')
      expect(appSource).toContain('window.nemi?.ttsSpeak(snippet, selectedVoice, voiceSpeed)')
    })

    it('verifies MessageBubble renders tables via TableBlock while conversational script summarizes them', () => {
      const rawMarkdown = `Here is the data:
| Metric | Value |
|---|---|
| Latency | 60ms |`

      // Spoken script must summarize
      const spoken = toConversationalScript(rawMarkdown)
      expect(spoken).toContain("I've organized the detailed comparison table in your chat notes.")
      expect(spoken).not.toContain('| Metric |')

      // UI MessageBubble renders TableBlock
      const bubbleSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/components/MessageBubble.tsx'),
        'utf-8'
      )
      expect(bubbleSource).toContain('<TableBlock key={key++} table={parsed} />')
    })
  })
})
