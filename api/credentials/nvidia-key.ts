import type { IncomingMessage, ServerResponse } from 'http'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const isConfigured = Boolean(process.env.NVIDIA_NIM_API_KEY)
  res.statusCode = 200
  res.end(
    JSON.stringify({
      configured: isConfigured,
      apiKey: isConfigured ? 'SERVER_CONFIGURED' : '',
      provider: 'nvidia-nim',
    })
  )
}
