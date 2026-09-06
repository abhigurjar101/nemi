export type ModelMode = 'ollama' | 'nvidia-nim'

export interface StorageLike {
  getItem(key: string): string | null
}

export function defaultModelMode(_storage: StorageLike): ModelMode {
  return 'ollama'
}

export interface ChatConfigInput {
  modelMode?: ModelMode
  ollamaModel?: string
  nvidiaNimModel?: string
  messages: Array<{ role: string; content: string }>
}

export function resolveChatRequestConfig(input: ChatConfigInput) {
  if (input.modelMode === 'nvidia-nim') {
    return {
      provider: 'nvidia-nim' as const,
      model: input.nvidiaNimModel || 'nvidia/nemotron-3-super-120b-a12b',
      messages: input.messages,
    }
  }
  return {
    provider: 'ollama' as const,
    model: input.ollamaModel || 'llama3.2',
    messages: input.messages,
  }
}