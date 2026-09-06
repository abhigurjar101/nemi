import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import { proxyChat, validateNvidiaNimKey, type ChatRequest } from '../src/main/providerRouting'

function mockRequest(response: unknown, statusCode = 200) {
  return vi.fn((_options, callback) => {
    const request = new EventEmitter() as any
    request.write = vi.fn()
    request.end = vi.fn()
    request.destroy = vi.fn()
    request.setTimeout = vi.fn()
    const responseStream = new EventEmitter() as any
    responseStream.statusCode = statusCode
    responseStream.resume = vi.fn()
    setTimeout(() => {
      callback(responseStream)
      responseStream.emit('data', Buffer.from(JSON.stringify(response)))
      responseStream.emit('end')
    }, 0)
    return request
  })
}

describe('Ollama routing', () => {
  it('routes chat to localhost Ollama', async () => {
    let options: any
    const request = mockRequest({ message: { content: 'Hello from Ollama' } })
    request.mockImplementationOnce((requestOptions: any, callback: any) => {
      options = requestOptions
      return mockRequest({ message: { content: 'Hello from Ollama' } })(requestOptions, callback)
    })
    const input: ChatRequest = { provider: 'ollama', model: 'llama3.2', messages: [{ role: 'user', content: 'Hello' }] }
    const response = await proxyChat(input, request as any)
    expect(options).toMatchObject({ hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST' })
    expect(response.text).toBe('Hello from Ollama')
  })

  it('routes NVIDIA NIM chat to the hosted OpenAI-compatible endpoint', async () => {
    let options: any
    const request = vi.fn((requestOptions: any, callback: any) => {
      options = requestOptions
      return mockRequest({ choices: [{ message: { content: 'Hello from NIM' } }] })(requestOptions, callback)
    })
    const response = await proxyChat({
      provider: 'nvidia-nim',
      model: 'nvidia/nemotron-3-super-120b-a12b',
      apiKey: 'nvapi-test',
      messages: [{ role: 'user', content: 'Hello' }],
    }, request as any)
    expect(options).toMatchObject({ hostname: 'integrate.api.nvidia.com', port: 443, path: '/v1/chat/completions', method: 'POST' })
    expect(options.headers.Authorization).toBe('Bearer nvapi-test')
    expect(response.text).toBe('Hello from NIM')
  })

  it('returns Ollama errors without exposing another provider', async () => {
    const request = vi.fn(() => {
      const client = new EventEmitter() as any
      client.write = vi.fn()
      client.end = vi.fn()
      client.destroy = vi.fn()
      client.setTimeout = vi.fn()
      setTimeout(() => client.emit('error', new Error('ECONNREFUSED')), 0)
      return client
    })
    const response = await proxyChat({ provider: 'ollama', model: 'llama3.2', messages: [] }, request as any)
    expect(response.text).toBe('')
    expect(response.error).toContain('Ollama is not reachable (port 11434)')
  })

  it('validates a working NVIDIA NIM key against the models endpoint', async () => {
    let options: any
    const request = vi.fn((requestOptions: any, callback: any) => {
      options = requestOptions
      return mockRequest({ data: [{ id: 'nvidia/nemotron' }] })(requestOptions, callback)
    })

    await expect(validateNvidiaNimKey('nvapi-valid', request as any)).resolves.toEqual({
      valid: true,
      message: 'NVIDIA NIM API key connected',
    })
    expect(options).toMatchObject({ hostname: 'integrate.api.nvidia.com', path: '/v1/models', method: 'GET' })
    expect(options.headers.Authorization).toBe('Bearer nvapi-valid')
  })

  it('reports an invalid NVIDIA NIM key without throwing', async () => {
    const request = vi.fn((requestOptions: any, callback: any) =>
      mockRequest({ error: { message: 'Unauthorized' } }, 401)(requestOptions, callback))

    await expect(validateNvidiaNimKey('nvapi-invalid', request as any)).resolves.toEqual({
      valid: false,
      error: 'NVIDIA NIM returned HTTP 401',
    })
  })
})