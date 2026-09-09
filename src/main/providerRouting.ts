import * as http from 'http'
import * as https from 'https'

export interface ChatMessage {
  role: string
  content: string
}

export interface ChatRequest {
  provider: 'ollama' | 'nvidia-nim'
  model: string
  messages: ChatMessage[]
  apiKey?: string
}

export interface ChatResponse {
  text: string
  error?: string
}

export type HttpRequestFn = (
  options: http.RequestOptions | string | URL,
  callback?: (res: http.IncomingMessage) => void
) => http.ClientRequest

export type HttpsRequestFn = (
  options: https.RequestOptions | string | URL,
  callback?: (res: http.IncomingMessage) => void
) => http.ClientRequest

export const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'
export const NVIDIA_NIM_DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b'
export const NVIDIA_NIM_FALLBACK_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

function parseResponseBody(chunks: Buffer[]): any {
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  } catch {
    return null
  }
}

function getNvidiaError(data: any, statusCode: number): string {
  return data?.error?.message || data?.error || data?.detail || data?.message || `NVIDIA NIM status ${statusCode}`
}

export function proxyChat(request: ChatRequest, customRequest?: HttpRequestFn): Promise<ChatResponse> {
  if (request.provider === 'nvidia-nim') {
    return proxyNvidiaNimChat(request, customRequest as HttpsRequestFn | undefined)
  }

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: request.model || 'llama3.2',
      messages: request.messages,
      stream: false,
      options: { temperature: 0.7, num_ctx: 4096 },
    })
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }
    const req = (customRequest || http.request)(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          if (res.statusCode && res.statusCode >= 400) {
            resolve({ text: '', error: data?.error || `Ollama status ${res.statusCode}` })
            return
          }
          resolve({ text: data?.message?.content || '' })
        } catch {
          resolve({ text: '', error: 'Failed to parse Ollama response' })
        }
      })
    })
    req.on('error', (error) => resolve({ text: '', error: `Ollama is not reachable (port 11434): ${error.message}` }))
    req.setTimeout(120000, () => {
      req.destroy()
      resolve({ text: '', error: 'Ollama request timed out' })
    })
    req.write(body)
    req.end()
  })
}

export function proxyNvidiaNimChat(
  request: ChatRequest,
  customRequest?: HttpsRequestFn
): Promise<ChatResponse> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: request.model || NVIDIA_NIM_DEFAULT_MODEL,
      messages: request.messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 4096,
    })
    const options: https.RequestOptions = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${request.apiKey || ''}`,
      },
    }
    const req = (customRequest || https.request)(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      res.on('end', () => {
        const data = parseResponseBody(chunks)
        if (res.statusCode && res.statusCode >= 400) {
          const error = getNvidiaError(data, res.statusCode)
          const canRetry = request.model !== NVIDIA_NIM_FALLBACK_MODEL &&
            (res.statusCode === 410 || /function.*not found/i.test(error))
          if (canRetry) {
            proxyNvidiaNimChat({ ...request, model: NVIDIA_NIM_FALLBACK_MODEL }, customRequest).then(resolve)
            return
          }
          resolve({ text: '', error })
          return
        }
        resolve({ text: data?.choices?.[0]?.message?.content || '' })
      })
    })
    req.on('error', (error) => resolve({ text: '', error: `NVIDIA NIM is not reachable: ${error.message}` }))
    req.setTimeout(120000, () => {
      req.destroy()
      resolve({ text: '', error: 'NVIDIA NIM request timed out' })
    })
    req.write(body)
    req.end()
  })
}

export function validateNvidiaNimKey(
  apiKey: string,
  customRequest?: HttpsRequestFn
): Promise<{ valid: boolean; message?: string; error?: string }> {
  return new Promise((resolve) => {
    const options: https.RequestOptions = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    }
    const req = (customRequest || https.request)(options, (res) => {
      res.resume()
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ valid: true, message: 'NVIDIA NIM API key connected' })
        } else {
          resolve({ valid: false, error: `NVIDIA NIM returned HTTP ${res.statusCode || 500}` })
        }
      })
    })
    req.on('error', (error) => resolve({ valid: false, error: `NVIDIA NIM connection failed: ${error.message}` }))
    req.setTimeout(15000, () => {
      req.destroy()
      resolve({ valid: false, error: 'NVIDIA NIM validation timed out' })
    })
    req.end()
  })
}