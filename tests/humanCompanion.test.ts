import { describe, expect, it } from 'vitest'
import { toConversationalScript } from '../src/renderer/src/humanCompanion/conversationalSpeech'
import { playActivationChime, playDeactivationChime, playThoughtSpark } from '../src/renderer/src/humanCompanion/soundscape'

describe('HumanCompanion conversational speech pre-processor', () => {
  it('returns empty string on empty input', () => {
    expect(toConversationalScript('')).toBe('')
    expect(toConversationalScript('   ')).toBe('')
  })

  it('converts markdown code blocks into a polite reference to chat notes', () => {
    const raw = "Here is the code:\n```typescript\nconsole.log('hello world')\n```\nRun it in your terminal."
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain("I've placed the code snippet in our chat notes.")
    expect(spoken).not.toContain('console.log')
  })

  it('strips markdown links to spoken label only', () => {
    const raw = 'Visit the [Official Documentation](https://nemi.brain/docs) for details.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('Visit the Official Documentation for details.')
    expect(spoken).not.toContain('https://nemi.brain/docs')
  })

  it('converts markdown headers into natural spoken transitions', () => {
    const raw = '### System Architecture\nThe backend uses Python and FastAPI.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('Regarding System Architecture: The backend uses Python and FastAPI.')
  })

  it('converts bullet lists into fluid spoken cadence', () => {
    const raw = 'Key points:\n- Neural embeddings\n- Local Kokoro voice\n- Instant chat'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('Neural embeddings,')
    expect(spoken).toContain('Local Kokoro voice,')
  })

  it('strips bold and italic markdown tags', () => {
    const raw = 'This is **essential** and *important*.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toBe('This is essential and important.')
  })

  it('gracefully limits lengthy monologues with a courteous signoff', () => {
    const longText = 'NEMI is a local AI companion designed for privacy and speed. ' +
      'It leverages BGE-M3 embeddings for high precision retrieval. ' +
      'Kokoro generates 82M parameter neural speech on CPU. ' +
      'Faster-whisper decodes incoming voice requests. ' +
      'The user interface is built with Electron and React. ' +
      'All components communicate through IPC handlers and HTTP proxies.'
    
    const spoken = toConversationalScript(longText)
    expect(spoken).toContain("I've placed the full breakdown in our chat notes for you to review.")
    expect(spoken.length).toBeLessThan(longText.length)
    expect(spoken).toContain('NEMI is a local A.I. companion designed for privacy and speed.')
    expect(spoken).toContain('It leverages BGE-M3 embeddings for high precision retrieval.')
    expect(spoken).not.toContain('  ')
  })

  it('preserves short, human conversational answers without robotic signoffs', () => {
    const greeting = 'Hey there! I am happy to help you with your project today.'
    const spoken = toConversationalScript(greeting)
    expect(spoken).toContain('Hey there!')
    expect(spoken).not.toContain('chat notes')
    expect(spoken).not.toContain('full breakdown')
  })

  it('naturalizes currency and percentages for human speech', () => {
    const raw = 'The cloud model costs $50 a month or $19.99 for starter tiers, saving 95%.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('50 dollars')
    expect(spoken).toContain('19 dollars and 99 cents')
    expect(spoken).toContain('95 percent')
  })

  it('naturalizes frequencies, latency units, and time for human speech', () => {
    const raw = 'Kokoro samples at 24kHz with 120ms latency and 1.5s total time.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('24 kilohertz')
    expect(spoken).toContain('120 milliseconds')
    expect(spoken).toContain('1.5 seconds')
  })

  it('expands technical acronyms and common abbreviations for natural pronunciation', () => {
    const raw = 'NEMI uses an AI UI with an API connecting to an LLM on your OS w/o extra setup, e.g. local Ollama.'
    const spoken = toConversationalScript(raw)
    expect(spoken).toContain('A.I.')
    expect(spoken).toContain('U.I.')
    expect(spoken).toContain('A.P.I.')
    expect(spoken).toContain('L.L.M.')
    expect(spoken).toContain('O.S.')
    expect(spoken).toContain('without')
    expect(spoken).toContain('for example')
  })

  it('cleanly preserves complete sentences containing acronyms in responses >250 chars without period severance', () => {
    const raw =
      'NEMI utilizes an AI pipeline with an API connecting to Kokoro. ' +
      'The system delivers 24kHz voice output with 100ms latency on CPU for real-time responsiveness. ' +
      'Furthermore, the UI provides smooth visual feedback during user interactions and an LLM handles queries over IPC.'

    expect(raw.length).toBeGreaterThan(250)
    const spoken = toConversationalScript(raw)

    expect(spoken).toContain('NEMI utilizes an A.I. pipeline with an A.P.I. connecting to Kokoro.')
    expect(spoken).toContain(
      'The system delivers 24 kilohertz voice output with 100 milliseconds latency on C.P.U. for real-time responsiveness.'
    )
    expect(spoken).toContain("I've placed the full breakdown in our chat notes for you to review.")
    expect(spoken).not.toContain('A.  I.')
    expect(spoken).not.toContain('A. I.')
    expect(spoken).not.toContain('A.  P.  I.')
    expect(spoken).not.toContain('A. P. I.')
    expect(spoken).not.toMatch(/\bA\.\s+I\./)
    expect(spoken).not.toMatch(/\bA\.\s+P\.\s+I\./)
    expect(spoken).not.toMatch(/\bU\.\s+I\./)
    expect(spoken).not.toMatch(/\bL\.\s+L\.\s+M\./)
  })

  it('eliminates double-space artifacts when condensing monologue sentences', () => {
    const raw =
      'First sentence introduces the concept clearly to the user. ' +
      'Second sentence elaborates with technical precision and deep clarity. ' +
      'Third sentence adds extraneous background detail that exceeds the monologue length threshold for speech output in conversational interactions.'

    expect(raw.length).toBeGreaterThan(250)
    const spoken = toConversationalScript(raw)

    expect(spoken).not.toContain('  ')
    expect(spoken).toMatch(
      /^First sentence introduces the concept clearly to the user\. Second sentence elaborates with technical precision and deep clarity\. I've placed the full breakdown/
    )
  })

  it('guards 4-digit years like 1980s from being converted to seconds', () => {
    const raw = 'In the 1980s and 1990s, speech engines required 5s to process 100ms of audio.'
    const spoken = toConversationalScript(raw)

    expect(spoken).toContain('1980s')
    expect(spoken).toContain('1990s')
    expect(spoken).toContain('5 seconds')
    expect(spoken).toContain('100 milliseconds')
    expect(spoken).not.toContain('1980 seconds')
    expect(spoken).not.toContain('1990 seconds')
  })
})

describe('HumanCompanion soundscape safety', () => {
  it('safely handles audio triggers when AudioContext is mocked or absent', () => {
    expect(() => playActivationChime()).not.toThrow()
    expect(() => playDeactivationChime()).not.toThrow()
    expect(() => playThoughtSpark()).not.toThrow()
  })
})

