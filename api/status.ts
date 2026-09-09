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

  const hasApiKey = Boolean(process.env.NVIDIA_NIM_API_KEY)
  const hasPasscode = Boolean(process.env.NEMI_AUTH_PASSCODE)

  res.statusCode = 200
  res.end(
    JSON.stringify({
      status: 'online',
      apiKeyConfigured: hasApiKey,
      authRequired: hasPasscode,
      provider: 'nvidia-nim',
      defaultModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      timestamp: Date.now(),
    })
  )
}
