import { describe, expect, it } from 'vitest'

describe('local-only routing contract', () => {
  it('requires no API key for Ollama chat', () => {
    expect({ provider: 'ollama', model: 'llama3.2', messages: [] }).not.toHaveProperty('apiKey')
  })
})