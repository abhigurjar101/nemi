import { describe, expect, it } from 'vitest'
import { defaultModelMode, resolveChatRequestConfig } from '../src/renderer/src/modelRouting'

describe('Ollama UI routing', () => {
  it('always defaults to Ollama', () => {
    expect(defaultModelMode({ getItem: () => null })).toBe('ollama')
    expect(defaultModelMode({ getItem: () => 'openai' })).toBe('ollama')
  })

  it('resolves the selected local model', () => {
    expect(resolveChatRequestConfig({ ollamaModel: 'deepseek-r1:latest', messages: [] })).toEqual({
      provider: 'ollama',
      model: 'deepseek-r1:latest',
      messages: [],
    })
  })

  it('resolves the NVIDIA NIM online model', () => {
    expect(resolveChatRequestConfig({ modelMode: 'nvidia-nim', messages: [] })).toMatchObject({
      provider: 'nvidia-nim',
      model: 'nvidia/nemotron-3-super-120b-a12b',
    })
  })
})