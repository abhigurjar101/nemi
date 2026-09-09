import type { IncomingMessage, ServerResponse } from 'http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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
  const apiKey = process.env.NVIDIA_NIM_API_KEY || ''

  let nimStatus = 'skipped'
  let nimLatencyMs = 0
  if (hasApiKey) {
    const t0 = Date.now()
    try {
      const nimRes = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      })
      nimStatus = `HTTP_${nimRes.status}`
      nimLatencyMs = Date.now() - t0
    } catch (e: any) {
      nimStatus = `ERR_${e?.message}`
      nimLatencyMs = Date.now() - t0
    }
  }

  res.statusCode = 200
  res.end(
    JSON.stringify({
      status: 'online',
      apiKeyConfigured: hasApiKey,
      authRequired: hasPasscode,
      provider: 'nvidia-nim',
      defaultModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      nimConnectivity: nimStatus,
      nimLatencyMs,
      timestamp: Date.now(),
    })
  )
}
