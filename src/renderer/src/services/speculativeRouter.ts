/**
 * NEMI Speculative Multi-Draft AI Routing & Cost Optimizer
 * Evaluates draft token models against frontier verification models,
 * calculates token latency metrics, acceptance rates, and estimated cost savings.
 */

export interface ModelSpec {
  id: string
  name: string
  provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'deepseek'
  type: 'draft' | 'frontier'
  costPer1kInput: number
  costPer1kOutput: number
  typicalTps: number
  latencyMs: number
}

export interface SpeculativeExecutionResult {
  draftModel: ModelSpec
  targetModel: ModelSpec
  draftTokens: number
  acceptedTokens: number
  acceptanceRate: number
  effectiveTps: number
  baselineLatencyMs: number
  speculativeLatencyMs: number
  speedupFactor: number
  costBaselineUsd: number
  costSpeculativeUsd: number
  costSavingsPercent: number
  routedContent: string
}

export const REGISTERED_MODELS: Record<string, ModelSpec> = {
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    name: 'Groq Llama 3.3 70B (Ultra-Fast Draft)',
    provider: 'groq',
    type: 'draft',
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    typicalTps: 320,
    latencyMs: 120,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Fast Draft & Tooling)',
    provider: 'gemini',
    type: 'draft',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    typicalTps: 180,
    latencyMs: 160,
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (Frontier Verifier)',
    provider: 'anthropic',
    type: 'frontier',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    typicalTps: 65,
    latencyMs: 580,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o (Frontier Verifier)',
    provider: 'openai',
    type: 'frontier',
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    typicalTps: 80,
    latencyMs: 450,
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 (Frontier Reasoning)',
    provider: 'deepseek',
    type: 'frontier',
    costPer1kInput: 0.00055,
    costPer1kOutput: 0.00219,
    typicalTps: 55,
    latencyMs: 720,
  },
}

export function simulateSpeculativeRun(
  prompt: string,
  draftId = 'llama-3.3-70b-versatile',
  frontierId = 'claude-3-5-sonnet'
): SpeculativeExecutionResult {
  const draft = REGISTERED_MODELS[draftId] || REGISTERED_MODELS['llama-3.3-70b-versatile']
  const frontier = REGISTERED_MODELS[frontierId] || REGISTERED_MODELS['claude-3-5-sonnet']

  const estimatedInputTokens = Math.max(10, Math.ceil(prompt.length / 4))
  const estimatedOutputTokens = Math.max(40, Math.ceil(estimatedInputTokens * 1.5))

  // Statistical acceptance probability based on prompt complexity
  const isCodeHeavy = /function|class|import|def|const|let|var|return/i.test(prompt)
  const baseAcceptanceRate = isCodeHeavy ? 0.82 : 0.74
  const acceptedTokens = Math.floor(estimatedOutputTokens * baseAcceptanceRate)
  const acceptanceRate = +(acceptedTokens / estimatedOutputTokens).toFixed(2)

  // Latency modeling:
  // Baseline = frontier latency + (tokens / frontier TPS) * 1000
  // Speculative = (tokens / (draft TPS * acceptanceRate + frontier TPS * (1 - acceptanceRate))) * 1000 + draft.latencyMs
  const baselineLatencyMs = Math.round(frontier.latencyMs + (estimatedOutputTokens / frontier.typicalTps) * 1000)
  const effectiveTps = Math.round(frontier.typicalTps * (1 + acceptanceRate * 2.1))
  const speculativeLatencyMs = Math.round(draft.latencyMs + (estimatedOutputTokens / effectiveTps) * 1000)
  const speedupFactor = +(baselineLatencyMs / Math.max(1, speculativeLatencyMs)).toFixed(2)

  // Cost calculations
  const costBaselineUsd =
    (estimatedInputTokens / 1000) * frontier.costPer1kInput +
    (estimatedOutputTokens / 1000) * frontier.costPer1kOutput

  const costSpeculativeUsd =
    (estimatedInputTokens / 1000) * draft.costPer1kInput +
    (acceptedTokens / 1000) * draft.costPer1kOutput +
    ((estimatedOutputTokens - acceptedTokens) / 1000) * frontier.costPer1kOutput

  const costSavingsPercent = Math.max(
    0,
    +(((costBaselineUsd - costSpeculativeUsd) / costBaselineUsd) * 100).toFixed(1)
  )

  return {
    draftModel: draft,
    targetModel: frontier,
    draftTokens: estimatedOutputTokens,
    acceptedTokens,
    acceptanceRate,
    effectiveTps,
    baselineLatencyMs,
    speculativeLatencyMs,
    speedupFactor,
    costBaselineUsd,
    costSpeculativeUsd,
    costSavingsPercent,
    routedContent: `[Speculative Execution via ${draft.name} -> ${frontier.name}]: Draft accepted ${acceptedTokens}/${estimatedOutputTokens} tokens (${Math.round(acceptanceRate * 100)}%). Effective TPS: ${effectiveTps} (${speedupFactor}x acceleration).`,
  }
}
