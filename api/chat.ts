import type { IncomingMessage, ServerResponse } from 'http'
import * as https from 'https'

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const apiKey =
    (req.headers['x-api-key'] as string) ||
    process.env.NVIDIA_NIM_API_KEY ||
    ''

  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error:
          'NVIDIA NIM API key is not configured on the server. Please set NVIDIA_NIM_API_KEY in Vercel settings or provide a key in client settings.',
      })
    )
    return
  }

  const body = await parseBody(req)
  const isStream = body.stream !== false

  // Handle both standard chat messages and prompt format
  let messages = body.messages || []
  if (!messages.length && body.prompt) {
    messages = [
      {
        role: 'system',
        content:
          body.system_prompt ||
          'You are NEMI, an organic and brilliant neural companion.',
      },
      { role: 'user', content: body.prompt },
    ]
  }

  const model = body.model || 'nvidia/nemotron-3.5-lightning-30b-a3b'

  const payload = JSON.stringify({
    model,
    messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1536,
    stream: isStream,
  })

  const requestOptions: https.RequestOptions = {
    hostname: 'integrate.api.nvidia.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Length': Buffer.byteLength(payload),
    },
  }

  if (isStream) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const proxyReq = https.request(requestOptions, (proxyRes) => {
      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        let errData = ''
        proxyRes.on('data', (c) => {
          errData += c
        })
        proxyRes.on('end', () => {
          try {
            const parsed = JSON.parse(errData)
            res.write(`data: ${JSON.stringify({ error: parsed?.error?.message || `HTTP ${proxyRes.statusCode}` })}\n\n`)
          } catch {
            res.write(`data: ${JSON.stringify({ error: `NVIDIA NIM returned HTTP ${proxyRes.statusCode}` })}\n\n`)
          }
          res.write('data: [DONE]\n\n')
          res.end()
        })
        return
      }

      proxyRes.pipe(res)
    })

    proxyReq.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    })

    proxyReq.write(payload)
    proxyReq.end()
  } else {
    // Non-streaming fallback
    res.setHeader('Content-Type', 'application/json')
    const proxyReq = https.request(requestOptions, (proxyRes) => {
      const chunks: Buffer[] = []
      proxyRes.on('data', (c) => chunks.push(c))
      proxyRes.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        try {
          const parsed = JSON.parse(raw)
          if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
            res.statusCode = proxyRes.statusCode
            res.end(JSON.stringify({ error: parsed?.error?.message || 'NVIDIA NIM request failed' }))
            return
          }
          const replyText = parsed.choices?.[0]?.message?.content || ''
          res.statusCode = 200
          res.end(JSON.stringify({ content: replyText, text: replyText, raw: parsed }))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to parse response from NVIDIA NIM' }))
        }
      })
    })

    proxyReq.on('error', (err) => {
      res.statusCode = 502
      res.end(JSON.stringify({ error: err.message }))
    })

    proxyReq.write(payload)
    proxyReq.end()
  }
}
