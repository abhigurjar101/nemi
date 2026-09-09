import type { LearnedArchitectureItem } from './types'
import { GITHUB_ARCHITECTURE_BLUEPRINTS } from '../src/renderer/src/utils/githubLearning'

/**
 * Curated mappings of which GitHub code architectures empower which bot.
 * Every bot in the fleet continuously learns from the GitHub Architecture Learning Bot.
 */
export const BOT_LEARNING_DOMAIN_MAP: Record<string, string[]> = {
  'orchestrator': [
    'huggingface/transformers',
    'redis/redis-py',
    'tiangolo/fastapi',
    'qdrant/qdrant',
  ],
  'github-learner': [
    'huggingface/transformers',
    'redis/redis-py',
    'tiangolo/fastapi',
    'qdrant/qdrant',
  ],
  'coding-assistant': [
    'redis/redis-py',
    'tiangolo/fastapi',
    'huggingface/transformers',
  ],
  'system-design': [
    'tiangolo/fastapi',
    'redis/redis-py',
    'qdrant/qdrant',
  ],
  'high-thinking': [
    'qdrant/qdrant',
    'tiangolo/fastapi',
  ],
  'testing-bot': [
    'huggingface/transformers',
    'redis/redis-py',
    'tiangolo/fastapi',
  ],
  'advanced-rag': [
    'qdrant/qdrant',
    'huggingface/transformers',
  ],
  'cloud-deployment': [
    'tiangolo/fastapi',
    'redis/redis-py',
  ],
  'ml-pipeline': [
    'huggingface/transformers',
    'qdrant/qdrant',
  ],
  'n8n-manager': [
    'tiangolo/fastapi',
    'redis/redis-py',
  ],
  'rag-bot': [
    'qdrant/qdrant',
    'huggingface/transformers',
  ],
}

/**
 * Retrieves learned blueprints relevant to a given bot.
 */
export function getLearnedBlueprintsForBot(botId: string): LearnedArchitectureItem[] {
  const allowedRepos = BOT_LEARNING_DOMAIN_MAP[botId] || ['huggingface/transformers']
  return GITHUB_ARCHITECTURE_BLUEPRINTS.filter((bp) =>
    allowedRepos.includes(bp.repo)
  ).map((bp) => ({
    repo: bp.repo,
    title: bp.title,
    category: bp.category,
    principles: bp.principles,
    codeSnippet: bp.codeSnippet,
    summary: bp.summary,
  }))
}

/**
 * Compiles a rich neural context block for system prompt injection.
 * Feeds the latest GitHub code architectures into the bot before generation.
 */
export function buildLearnedPromptContext(
  botId: string,
  extraMemories?: Array<{ content: string }>
): {
  promptBlock: string
  appliedBlueprints: string[]
} {
  const blueprints = getLearnedBlueprintsForBot(botId)
  const appliedRepos = blueprints.map((b) => b.repo)

  let block = `\n--- 🧠 CONTINUOUS GITHUB ARCHITECTURAL KNOWLEDGE INGESTION ---\n`
  block += `The following verified blueprints and high-class patterns were learned from top GitHub repositories:\n`

  for (const bp of blueprints) {
    block += `\n[Architecture: ${bp.repo} - ${bp.title}]\n`
    block += `Category: ${bp.category}\n`
    block += `Core Principles:\n`
    for (const p of bp.principles) {
      block += `  - ${p}\n`
    }
    block += `Key Blueprint Essence: ${bp.summary}\n`
  }

  // Also include any user-stored GitHub architecture memories
  if (extraMemories && extraMemories.length > 0) {
    const ghMemories = extraMemories.filter((m) =>
      m.content.toLowerCase().includes('github') ||
      m.content.toLowerCase().includes('architecture') ||
      m.content.toLowerCase().includes('pipeline')
    )
    if (ghMemories.length > 0) {
      block += `\nDynamic Ingested Long-Term Neural Memories:\n`
      ghMemories.slice(0, 5).forEach((m) => {
        block += `  • ${m.content}\n`
      })
    }
  }

  block += `\nARCHITECTURAL INSTRUCTION FOR OUTPUT:\n`
  block += `You MUST apply these clean architectural patterns to your response. Write 100% complete, error-free, self-contained implementations.\n`
  block += `----------------------------------------------------------\n`

  return {
    promptBlock: block,
    appliedBlueprints: appliedRepos,
  }
}
