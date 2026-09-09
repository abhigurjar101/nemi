import type { LearnedArchitectureItem } from './types'
import {
  GITHUB_ARCHITECTURE_BLUEPRINTS,
  getAllLearnedBlueprints,
  DYNAMIC_LEARNED_BLUEPRINTS,
} from './blueprints'

/**
 * Curated mappings of which GitHub code architectures empower which bot.
 * Every bot in the fleet continuously learns from the GitHub Architecture Learning Bot.
 */
export const BOT_LEARNING_DOMAIN_MAP: Record<string, string[]> = {
  'orchestrator': [
    'huggingface/transformers',
    'karpathy/nanoGPT',
    'vllm-project/vllm',
    'astral-sh/uv',
    'redis/redis-py',
    'tiangolo/fastapi',
    'anthropics/anthropic-sdk-python',
    'qdrant/qdrant-client',
  ],
  'github-learner': [
    'huggingface/transformers',
    'karpathy/nanoGPT',
    'vllm-project/vllm',
    'astral-sh/uv',
    'redis/redis-py',
    'tiangolo/fastapi',
    'anthropics/anthropic-sdk-python',
    'qdrant/qdrant-client',
  ],
  'coding-assistant': [
    'astral-sh/uv',
    'redis/redis-py',
    'tiangolo/fastapi',
    'huggingface/transformers',
    'anthropics/anthropic-sdk-python',
    'karpathy/nanoGPT',
  ],
  'system-design': [
    'vllm-project/vllm',
    'redis/redis-py',
    'tiangolo/fastapi',
    'qdrant/qdrant-client',
    'astral-sh/uv',
  ],
  'high-thinking': [
    'karpathy/nanoGPT',
    'vllm-project/vllm',
    'qdrant/qdrant-client',
    'tiangolo/fastapi',
  ],
  'testing-bot': [
    'anthropics/anthropic-sdk-python',
    'huggingface/transformers',
    'redis/redis-py',
    'tiangolo/fastapi',
    'astral-sh/uv',
  ],
  'advanced-rag': [
    'qdrant/qdrant-client',
    'huggingface/transformers',
    'karpathy/nanoGPT',
    'anthropics/anthropic-sdk-python',
  ],
  'cloud-deployment': [
    'vllm-project/vllm',
    'tiangolo/fastapi',
    'redis/redis-py',
    'astral-sh/uv',
  ],
  'ml-pipeline': [
    'karpathy/nanoGPT',
    'huggingface/transformers',
    'vllm-project/vllm',
    'qdrant/qdrant-client',
  ],
  'n8n-manager': [
    'anthropics/anthropic-sdk-python',
    'tiangolo/fastapi',
    'redis/redis-py',
  ],
  'rag-bot': [
    'qdrant/qdrant-client',
    'huggingface/transformers',
    'karpathy/nanoGPT',
  ],
}

/**
 * Retrieves learned blueprints relevant to a given bot.
 */
export function getLearnedBlueprintsForBot(botId: string): LearnedArchitectureItem[] {
  const allowedRepos = BOT_LEARNING_DOMAIN_MAP[botId] || ['huggingface/transformers']
  const all = getAllLearnedBlueprints()
  return all.filter((bp) =>
    allowedRepos.includes(bp.repo) ||
    DYNAMIC_LEARNED_BLUEPRINTS.some((d) => d.repo.toLowerCase() === bp.repo.toLowerCase())
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

  let block = `\n--- CONTINUOUS GITHUB ARCHITECTURAL KNOWLEDGE INGESTION ---\n`
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
