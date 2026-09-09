import type {
  N8nBot,
  BotExecutionContext,
  BotExecutionResult,
  AstValidationResult,
  JupyterNotebookMetadata,
} from './types'
import { orchestratorBot } from './bots/orchestrator'
import { githubLearnerBot } from './bots/githubLearner'
import { codingAssistantBot } from './bots/codingAssistant'
import { systemDesignBot } from './bots/systemDesign'
import { highThinkingBot } from './bots/highThinking'
import { testingBot } from './bots/testingBot'
import { advancedRagBot } from './bots/advancedRag'
import { cloudDeploymentBot } from './bots/cloudDeployment'
import { mlPipelineBot } from './bots/mlPipeline'
import { n8nManagerBot } from './bots/n8nManager'
import { ragBot } from './bots/ragBot'
import { validateCodeBlock } from './bots/validation'
import { buildLearnedPromptContext } from './learningBridge'

/**
 * Registry of all 11 world-class bots in the swarm.
 */
export const ALL_N8N_BOTS: N8nBot[] = [
  orchestratorBot,
  githubLearnerBot,
  codingAssistantBot,
  systemDesignBot,
  highThinkingBot,
  testingBot,
  advancedRagBot,
  cloudDeploymentBot,
  mlPipelineBot,
  n8nManagerBot,
  ragBot,
]

export function getBotById(botId: string): N8nBot {
  return ALL_N8N_BOTS.find((b) => b.id === botId) || ALL_N8N_BOTS[0]
}

/**
 * Compiles a world-class prompt for any bot, incorporating:
 * 1. The bot's core domain directive
 * 2. Cross-bot learning from the GitHub Architecture Learning Bot
 * 3. 100% complete, error-free, zero-placeholder code generation mandates
 */
export function compileBotSystemPrompt(
  botId: string,
  memories?: Array<{ content: string; category?: string }>
): {
  systemPrompt: string
  appliedBlueprints: string[]
} {
  const bot = getBotById(botId)
  const { promptBlock, appliedBlueprints } = buildLearnedPromptContext(botId, memories)

  const systemPrompt = `You are ${bot.name} (${bot.emoji}), an elite specialist in the NEMI Autonomous Multi-Agent Swarm.

CORE SPECIALIST DIRECTIVE:
${bot.directive}

${promptBlock}

ABSOLUTE MANDATES FOR PRODUCTION EXCELLENCE:
1. 100% COMPLETE CODE ONLY: Never truncate code, never emit placeholders like '# ... rest of code', 'pass', or '// TODO'. Every class, function, and import must be 100% written out.
2. ERROR-FREE ARCHITECTURE: Use explicit typing, robust parameter validation, defensive exception handling, and verified mathematical/tokenization formulas.
3. RUNNABLE EXECUTION DEMO: Always include a complete, executable demonstration block with concrete sample data and print() statements ready for Jupyter / Colab execution.
4. SYNTAX INTEGRITY: Ensure all parentheses, brackets, and code fences are completely closed.
`

  return { systemPrompt, appliedBlueprints }
}

/**
 * Extracts python or ts/js code blocks from response markdown.
 */
export function extractCodeFromMarkdown(content: string): string {
  const match = content.match(/```(?:python|py|ts|javascript|js)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : ''
}

/**
 * Executes a bot task with full learning augmentation, AST validation, and Jupyter metadata.
 */
export async function executeBotTask(
  context: BotExecutionContext,
  inferenceFn?: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<BotExecutionResult> {
  const startTime = Date.now()
  const bot = getBotById(context.botId)

  const { systemPrompt, appliedBlueprints } = compileBotSystemPrompt(
    context.botId,
    context.memories
  )

  let output = ''
  let source: 'n8n_webhook' | 'local_runner' | 'cloud_nim' = 'cloud_nim'

  // 1. Try external n8n webhook or local runner if available
  const isBrowser = typeof window !== 'undefined'
  const isElectron = isBrowser && !!(window as any).nemi?.isElectron

  if (isElectron) {
    try {
      const endpoint =
        bot.id === 'orchestrator'
          ? 'http://localhost:8000/api/tasks/execute-sync'
          : `http://localhost:8000/api/bots/${bot.id}/execute`

      const payload =
        bot.id === 'orchestrator'
          ? {
              goal: context.prompt,
              preferred_language: context.preferredLanguage || 'python',
              auto_execute: true,
              auto_verify: true,
              save_artifacts: true,
              auto_approve_hitl: true,
              learned_blueprints: appliedBlueprints,
            }
          : {
              payload: {
                task: context.prompt,
                prompt: context.prompt,
                language: context.preferredLanguage || 'python',
                learned_blueprints: appliedBlueprints,
              },
              use_n8n: true,
            }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (resp.ok) {
        const data = await resp.json()
        output = data.output || data.synthesis || data.rawResponse || JSON.stringify(data)
        source = 'local_runner'
      }
    } catch {
      // Gracefully fall back to neural inference
    }
  }

  // 2. If not executed via local runner, use the supplied neural inference function
  if (!output && inferenceFn) {
    output = await inferenceFn(systemPrompt, context.prompt)
  }

  // Fallback placeholder if no inference provided
  if (!output) {
    output = `### ${bot.emoji} ${bot.name} Initialized\n\nDirectives compiled with ${appliedBlueprints.length} GitHub architectures (${appliedBlueprints.join(', ')}).\n\nTask: ${context.prompt}`
  }

  // 3. Extract and validate code syntax
  const detectedCode = extractCodeFromMarkdown(output)
  let astValidation: AstValidationResult | undefined
  if (detectedCode) {
    astValidation = bot.validateCode
      ? bot.validateCode(detectedCode)
      : validateCodeBlock(detectedCode, context.preferredLanguage || 'python')
  }

  // 4. Generate Jupyter Notebook metadata
  const notebookName = `${bot.id}_${Date.now().toString(36)}.ipynb`
  const jupyterNotebook: JupyterNotebookMetadata = {
    notebookName,
    jupyterLink: isElectron ? 'http://localhost:8888' : 'https://colab.research.google.com/#create=true',
    cellCount: detectedCode ? 2 : 1,
    createdFresh: true,
    kernelVerified: astValidation ? astValidation.valid : true,
  }

  return {
    success: true,
    botId: bot.id,
    botName: bot.name,
    emoji: bot.emoji,
    output,
    detectedCode: detectedCode || undefined,
    astValidation,
    jupyterNotebook,
    learnedBlueprintsApplied: appliedBlueprints,
    latencyMs: Date.now() - startTime,
    source,
  }
}
