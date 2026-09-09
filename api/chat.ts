export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const apiKey =
    req.headers.get('x-api-key') ||
    process.env.NVIDIA_NIM_API_KEY ||
    ''

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'NVIDIA NIM API key is not configured on the server. Please set NVIDIA_NIM_API_KEY in Vercel settings.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const isStream = body.stream !== false
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

    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    })

    if (isStream) {
      headers.set('Content-Type', 'text/event-stream; charset=utf-8')
      headers.set('Cache-Control', 'no-cache, no-transform')
      headers.set('Connection', 'keep-alive')
      headers.set('X-Accel-Buffering', 'no')
    } else {
      headers.set('Content-Type', 'application/json')
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Upstream connection error' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}
