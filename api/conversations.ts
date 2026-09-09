import type { IncomingMessage, ServerResponse } from 'http'

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
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method === 'POST') {
    const body = await parseBody(req)
    res.statusCode = 200
    res.end(
      JSON.stringify({
        status: 'synced',
        count: Array.isArray(body) ? body.length : 0,
        syncedAt: Date.now(),
      })
    )
    return
  }

  res.statusCode = 200
  res.end(JSON.stringify({ conversations: [], status: 'ready' }))
}
