import { describe, expect, it } from 'vitest'
import { isActivationPhrase, readinessBriefing, extractVoiceIntent } from '../src/renderer/src/voiceActivation'

describe('voice activation', () => {
  it.each([
    'Hey NEMI, I am Abhi',
    'hey nemi i am abhi',
    'HEY NEMI I AM ABHI!',
    'Hello NEMI, I am Abhi',
    'Hi NEMI, I am Abhi',
    'Hey Nimmi, I am Abhi',
    'Hey NEMI',
  ])('accepts activation phrase: %s', (phrase) => {
    expect(isActivationPhrase(phrase)).toBe(true)
  })

  it.each([
    'What is on my calendar?',
    'Who is Abhi?',
    'Tell me what NEMI is',
    'What can nemi do?',
    'Is Abhi at the desk?',
    'Just saying abhi or nemi in a sentence',
  ])('rejects non-activation speech: %s', (phrase) => {
    expect(isActivationPhrase(phrase)).toBe(false)
  })

  it('summarizes the running services for the greeting', () => {
    expect(readinessBriefing({ ollama: true, voice: true, rag: true }))
      .toContain('Ollama is ready')
  })

  describe('extractVoiceIntent', () => {
    it('detects wake-only phrases', () => {
      expect(extractVoiceIntent('Hey NEMI')).toEqual({
        hasWakeWord: true,
        isWakeOnly: true,
        query: '',
      })
      expect(extractVoiceIntent('Hey NEMI, I am Abhi')).toEqual({
        hasWakeWord: true,
        isWakeOnly: true,
        query: '',
      })
      expect(extractVoiceIntent('Hello NEMI, this is Abhi!')).toEqual({
        hasWakeWord: true,
        isWakeOnly: true,
        query: '',
      })
    })

    it('extracts query when spoken together with wake word', () => {
      const res = extractVoiceIntent('Hey NEMI, what is quantum computing?')
      expect(res.hasWakeWord).toBe(true)
      expect(res.isWakeOnly).toBe(false)
      expect(res.query).toBe('what is quantum computing?')
    })

    it('extracts query with greeting and speaker intro', () => {
      const res = extractVoiceIntent('Hey NEMI, I am Abhi, explain Black Holes')
      expect(res.hasWakeWord).toBe(true)
      expect(res.isWakeOnly).toBe(false)
      expect(res.query).toBe('explain Black Holes')
    })

    it('preserves direct user queries without wake word', () => {
      const res = extractVoiceIntent('What is the capital of France?')
      expect(res.hasWakeWord).toBe(false)
      expect(res.isWakeOnly).toBe(false)
      expect(res.query).toBe('What is the capital of France?')
    })
  })
})

