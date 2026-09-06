import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import { proxyChat } from '../src/main/providerRouting'

describe('Ollama routing resilience', () => {
  it('handles concurrent local requests', async () => {
    const request = vi.fn((_options, callback) => {
      const client = new EventEmitter() as any
      client.write = vi.fn()
      client.end = vi.fn()
      client.destroy = vi.fn()
      client.setTimeout = vi.fn()
      const response = new EventEmitter() as any
      response.statusCode = 200
      setTimeout(() => {
        callback(response)
        response.emit('data', Buffer.from(JSON.stringify({ message: { content: 'ok' } })))
        response.emit('end')
      }, 0)
      return client
    })
    const results = await Promise.all(Array.from({ length: 20 }, () => proxyChat({ provider: 'ollama', model: 'llama3.2', messages: [] }, request as any)))
    expect(results.every((result) => result.text === 'ok')).toBe(true)
  })
})