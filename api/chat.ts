import type { IncomingMessage, ServerResponse } from 'http'

async function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body) {
    if (typeof (req as any).body === 'string') {
      try {
        return JSON.parse((req as any).body)
      } catch {
        return {}
      }
    }
    return (req as any).body
  }
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
    req.on('error', () => {
      resolve({})
    })
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')

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

  try {
    const upstreamRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: payload,
    })

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => '')
      let errMsg = `NVIDIA NIM returned HTTP ${upstreamRes.status}`
      try {
        const parsed = JSON.parse(errText)
        errMsg = parsed?.error?.message || parsed?.detail || errMsg
      } catch {}

      if (isStream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: errMsg }))
      }
      return
    }

    if (isStream && upstreamRes.body) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      const reader = upstreamRes.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          res.write(Buffer.from(value))
          if (typeof (res as any).flush === 'function') {
            (res as any).flush()
          }
        }
      }
      res.end()
    } else {
      const data = await upstreamRes.json()
      const replyText = data.choices?.[0]?.message?.content || ''
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: replyText, text: replyText, raw: data }))
    }
  } catch (err: any) {
    if (isStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      })
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Upstream connection error' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err?.message || 'Upstream connection error' }))
    }
  }
}
