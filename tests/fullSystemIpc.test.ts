import { describe, expect, it } from 'vitest'
import { isActivationPhrase, readinessBriefing } from '../src/renderer/src/voiceActivation'
import { resolveChatRequestConfig } from '../src/renderer/src/modelRouting'

describe('local Ollama system contract', () => {
  it('keeps voice readiness local', () => {
    expect(isActivationPhrase('Hey NEMI')).toBe(true)
    expect(readinessBriefing({ ollama: true, voice: true, rag: true })).toContain('Ollama is ready')
  })

  it('resolves RAG chat to Ollama', () => {
    const config = resolveChatRequestConfig({ ollamaModel: 'llama3.2', messages: [{ role: 'user', content: 'Hello' }] })
    expect(config.provider).toBe('ollama')
    expect(config.model).toBe('llama3.2')
  })
})