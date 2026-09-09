import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  ALL_N8N_BOTS,
  getBotById,
  compileBotSystemPrompt,
  executeBotTask,
  extractCodeFromMarkdown,
  validateCodeBlock,
  getLearnedBlueprintsForBot,
  buildLearnedPromptContext,
  BOT_LEARNING_DOMAIN_MAP,
} from '../n8n'

describe('Unified n8n Bots Swarm Fleet & Cross-Bot Learning Engine', () => {
  describe('Bot Swarm Fleet Registry', () => {
    it('contains all 11 world-class specialist bots in the registry', () => {
      expect(ALL_N8N_BOTS.length).toBe(11)

      const expectedIds = [
        'orchestrator',
        'github-learner',
        'coding-assistant',
        'system-design',
        'high-thinking',
        'testing-bot',
        'advanced-rag',
        'cloud-deployment',
        'ml-pipeline',
        'n8n-manager',
        'rag-bot',
      ]

      for (const id of expectedIds) {
        const bot = getBotById(id)
        expect(bot).toBeDefined()
        expect(bot.id).toBe(id)
        expect(bot.name).toBeTruthy()
        expect(bot.emoji).toBeTruthy()
        expect(bot.description).toBeTruthy()
        expect(bot.defaultWebhook).toBeTruthy()
        expect(bot.directive).toBeTruthy()
        expect(bot.supportedTasks.length).toBeGreaterThan(0)
      }
    })

    it('ensures each bot has unique IDs and distinct default webhook paths', () => {
      const ids = ALL_N8N_BOTS.map((b) => b.id)
      const webhooks = ALL_N8N_BOTS.map((b) => b.defaultWebhook)

      expect(new Set(ids).size).toBe(ALL_N8N_BOTS.length)
      expect(new Set(webhooks).size).toBe(ALL_N8N_BOTS.length)
    })
  })

  describe('Cross-Bot Learning Bridge (Learning from GitHub Learning Bot)', () => {
    it('maps every bot to relevant GitHub architectural blueprints', () => {
      for (const bot of ALL_N8N_BOTS) {
        const blueprints = getLearnedBlueprintsForBot(bot.id)
        expect(blueprints.length).toBeGreaterThan(0)
        for (const bp of blueprints) {
          expect(bp.repo).toBeTruthy()
          expect(bp.title).toBeTruthy()
          expect(bp.principles.length).toBeGreaterThan(0)
        }
      }
    })

    it('injects HuggingFace minimalist NLP blueprints into ml-pipeline and coding-assistant bots', () => {
      const mlBlueprints = getLearnedBlueprintsForBot('ml-pipeline')
      expect(mlBlueprints.some((b) => b.repo === 'huggingface/transformers')).toBe(true)

      const codingBlueprints = getLearnedBlueprintsForBot('coding-assistant')
      expect(codingBlueprints.some((b) => b.repo === 'redis/redis-py')).toBe(true)
    })

    it('builds a rich learned prompt context incorporating dynamic memories', () => {
      const extraMemories = [
        { content: 'Dynamic architecture pattern: CQRS event sourcing with clean read models' },
      ]
      const { promptBlock, appliedBlueprints } = buildLearnedPromptContext('orchestrator', extraMemories)

      expect(promptBlock).toContain('CONTINUOUS GITHUB ARCHITECTURAL KNOWLEDGE INGESTION')
      expect(promptBlock).toContain('huggingface/transformers')
      expect(promptBlock).toContain('CQRS event sourcing')
      expect(appliedBlueprints.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('AST Syntax & Delimiter Validation Engine', () => {
    it('validates clean, complete Python code with balanced delimiters', () => {
      const cleanCode = `
import math

class MinimalTokenizer:
    def __init__(self, vocab=None):
        self.vocab = vocab or {}

    def tokenize(self, text: str) -> list[str]:
        return text.lower().split()

if __name__ == '__main__':
    tok = MinimalTokenizer()
    print("Tokens:", tok.tokenize("Hello World"))
`
      const res = validateCodeBlock(cleanCode, 'python')
      expect(res.valid).toBe(true)
      expect(res.balancedDelimiters).toBe(true)
      expect(res.detectedClasses).toContain('MinimalTokenizer')
      expect(res.detectedFunctions).toContain('__init__')
      expect(res.detectedFunctions).toContain('tokenize')
    })

    it('catches unbalanced brackets and placeholder comments', () => {
      const badCode = `
def broken_fn():
    arr = [1, 2, 3
    # TODO: implement rest
`
      const res = validateCodeBlock(badCode, 'python')
      expect(res.valid).toBe(false)
      expect(res.syntaxErrors?.some((e) => e.includes('bracket'))).toBe(true)
      expect(res.syntaxErrors?.some((e) => e.includes('placeholder'))).toBe(true)
    })
  })

  describe('Official n8n Workflow JSON Files', () => {
    it('verifies that all 11 bot workflow files exist and contain valid n8n schemas', () => {
      const workflowsDir = path.join(__dirname, '../n8n/workflows')
      expect(fs.existsSync(workflowsDir)).toBe(true)

      for (const bot of ALL_N8N_BOTS) {
        const filePath = path.join(workflowsDir, `${bot.id}.workflow.json`)
        expect(fs.existsSync(filePath)).toBe(true)

        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)

        expect(json.name).toContain(bot.name)
        expect(json.active).toBe(true)
        expect(Array.isArray(json.nodes)).toBe(true)
        expect(json.nodes.length).toBeGreaterThanOrEqual(4)
        expect(json.meta?.botId).toBe(bot.id)

        // Webhook trigger node
        const webhookNode = json.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook')
        expect(webhookNode).toBeDefined()
        expect(webhookNode.parameters.path).toBe(bot.defaultWebhook)

        // Connections exist
        expect(json.connections).toBeDefined()
      }
    })
  })

  describe('Central Bot Engine Compilation & Execution', () => {
    it('compiles system prompt with bot directive and learned blueprints', () => {
      const { systemPrompt, appliedBlueprints } = compileBotSystemPrompt('ml-pipeline')
      expect(systemPrompt).toContain('AI/ML & Natural Language Processing (NLP) Specialist')
      expect(systemPrompt).toContain('CONTINUOUS GITHUB ARCHITECTURAL KNOWLEDGE INGESTION')
      expect(systemPrompt).toContain('ABSOLUTE MANDATES FOR PRODUCTION EXCELLENCE')
      expect(appliedBlueprints.length).toBeGreaterThan(0)
    })

    it('extracts code blocks from markdown cleanly', () => {
      const markdown = `
Here is the solution:
\`\`\`python
def hello():
    return "world"
\`\`\`
Hope that helps!
`
      const code = extractCodeFromMarkdown(markdown)
      expect(code).toBe('def hello():\n    return "world"')
    })

    it('executes a bot task and attaches AST validation and Jupyter notebook metadata', async () => {
      const mockInference = async (_sys: string, prompt: string) => {
        return `### Output for ${prompt}\n\`\`\`python\ndef solve():\n    return 42\n\`\`\``
      }

      const res = await executeBotTask(
        {
          botId: 'coding-assistant',
          prompt: 'Solve the problem',
        },
        mockInference
      )

      expect(res.success).toBe(true)
      expect(res.botId).toBe('coding-assistant')
      expect(res.detectedCode).toContain('def solve():')
      expect(res.astValidation?.valid).toBe(true)
      expect(res.jupyterNotebook?.notebookName).toBeTruthy()
      expect(res.learnedBlueprintsApplied?.length).toBeGreaterThan(0)
    })
  })
})
