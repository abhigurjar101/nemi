import type { IncomingMessage, ServerResponse } from 'http'
import {
  ALL_N8N_BOTS,
  getBotById,
  compileBotSystemPrompt,
  getLearnedBlueprintsForBot,
} from '../n8n'

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
  if ((req as any).readableEnded || !(req as any).readable) return {}
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const queryBotId = url.searchParams.get('id') || url.searchParams.get('botId')

  if (req.method === 'GET') {
    if (queryBotId) {
      const bot = getBotById(queryBotId)
      const blueprints = getLearnedBlueprintsForBot(queryBotId)
      res.statusCode = 200
      res.end(
        JSON.stringify({
          bot,
          learnedBlueprints: blueprints,
          workflowFile: `workflows/${bot.id}.workflow.json`,
        })
      )
      return
    }

    // Return all bots with status
    res.statusCode = 200
    res.end(
      JSON.stringify({
        totalBots: ALL_N8N_BOTS.length,
        bots: ALL_N8N_BOTS.map((b) => ({
          id: b.id,
          name: b.name,
          shortName: b.shortName,
          emoji: b.emoji,
          category: b.category,
          description: b.description,
          defaultWebhook: b.defaultWebhook,
          supportedTasks: b.supportedTasks,
          learnedArchitecturesCount: getLearnedBlueprintsForBot(b.id).length,
        })),
        continuousLearningSource: 'github-learner',
        engineVersion: '2.0-n8n-unified',
      })
    )
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req)
      const botId = String(body.botId || queryBotId || 'orchestrator')
      const bot = getBotById(botId)
      const prompt = String(body.prompt || body.task || body.goal || '')

      if (!prompt) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Prompt is required' }))
        return
      }

      const { systemPrompt, appliedBlueprints } = compileBotSystemPrompt(
        botId,
        body.memories || []
      )

      res.statusCode = 200
      res.end(
        JSON.stringify({
          success: true,
          botId: bot.id,
          botName: bot.name,
          emoji: bot.emoji,
          appliedBlueprints,
          systemPrompt,
          task: prompt,
          status: 'ready_for_execution',
        })
      )
      return
    } catch (err: any) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
      return
    }
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'Method Not Allowed' }))
}
