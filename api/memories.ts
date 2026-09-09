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
  if ((req as any).readableEnded || !(req as any).readable) {
    return {}
  }
  return new Promise((resolve) => {
    let data = ''
    const timer = setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    }, 1500)

    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => {
      clearTimeout(timer)
      resolve({})
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
  res.end(JSON.stringify({ memories: [], status: 'ready' }))
}
