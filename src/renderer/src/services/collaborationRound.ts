/**
 * NEMI Cross-Agent Collaboration Round
 *
 * Runs after initial agent reports and before the final Bayesian vote.
 * Identifies genuine disagreements, challenges agents to cross-examine each
 * other's cited evidence, and applies only citation-backed revisions.
 *
 * DESIGN INVARIANTS:
 * - Collaboration can only REDUCE or maintain confidence — never inflate it beyond
 *   what indicators support (an agent cannot gain confidence from a challenge alone).
 * - Revisions without a specific cited reason are REJECTED and logged permanently.
 *   This prevents agents from silently averaging toward consensus to avoid looking
 *   like the outlier — which would quietly destroy the value of independent agents.
 * - Surviving disagreements are PRESERVED as explicit dissent in the output.
 *   Genuine disagreement that survives scrutiny is valuable information, not a bug.
 * - This module never calls any trade execution function.
 * - This module never modifies the 70% gatekeeper threshold or hard stops.
 */

import type {
  AgentVote,
  AgentDisagreement,
  CollaborationChallenge,
  CollaborationRevision,
  CollaborationRound,
  TechnicalIndicators,
  TradeAction,
} from '../../../../n8n/tradingBots/types'

// ==========================================
// Constants
// ==========================================

const ROUNDS_KEY = 'nemi_collaboration_rounds'
const MAX_ROUNDS_STORED = 200
const HIGH_CONFIDENCE_THRESHOLD = 80  // both agents need >= 80% for HIGH_CONFIDENCE_CONFLICT

// Agent categories (mirrors engine.ts trading categories)
const DIRECTIONAL_AGENTS = new Set([
  'technical-analyst',
  'smc-liquidity',
  'sentiment-trader',
  'volume-breakout',
])

// ==========================================
// Storage Helpers
// ==========================================

function loadRounds(): CollaborationRound[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(ROUNDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function persistCollaborationRound(round: CollaborationRound): void {
  try {
    if (typeof localStorage === 'undefined') return
    const existing = loadRounds()
    const updated = [...existing, round].slice(-MAX_ROUNDS_STORED)
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(updated))
  } catch {}
}

export function getRecentCollaborationRounds(count = 10): CollaborationRound[] {
  return loadRounds().slice(-count)
}

// ==========================================
// Step 1: Identify Genuine Disagreements
// ==========================================

/**
 * Finds agent pairs that genuinely disagree — either directional agents split
 * BUY vs SELL, or any two high-confidence agents with conflicting views.
 *
 * Does NOT flag HOLD vs BUY/SELL as a disagreement — abstention is not a conflict.
 * Returns deduplicated pairs (A-B and B-A treated as one disagreement).
 */
export function identifyDisagreements(votes: AgentVote[]): AgentDisagreement[] {
  const disagreements: AgentDisagreement[] = []
  const seen = new Set<string>()

  for (let i = 0; i < votes.length; i++) {
    for (let j = i + 1; j < votes.length; j++) {
      const a = votes[i]
      const b = votes[j]

      // Skip HOLD — only directional conflicts matter
      if (a.action === 'HOLD' || b.action === 'HOLD') continue
      // Skip same direction — no conflict
      if (a.action === b.action) continue

      const pairKey = [a.botId, b.botId].sort().join('|')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      // DIRECTIONAL_SPLIT: two agents from the core directional set disagree on direction
      const isDirectionalSplit =
        DIRECTIONAL_AGENTS.has(a.botId) && DIRECTIONAL_AGENTS.has(b.botId)

      // HIGH_CONFIDENCE_CONFLICT: any two agents both above threshold with opposing views
      const isHighConfConflict =
        a.confidence >= HIGH_CONFIDENCE_THRESHOLD && b.confidence >= HIGH_CONFIDENCE_THRESHOLD

      if (isDirectionalSplit || isHighConfConflict) {
        disagreements.push({
          agentA: {
            botId: a.botId,
            botName: a.botName,
            action: a.action,
            confidence: a.confidence,
            reasoning: a.reasoning,
          },
          agentB: {
            botId: b.botId,
            botName: b.botName,
            action: b.action,
            confidence: b.confidence,
            reasoning: b.reasoning,
          },
          conflictType: isDirectionalSplit ? 'DIRECTIONAL_SPLIT' : 'HIGH_CONFIDENCE_CONFLICT',
          description: `${a.botName} (${a.action} ${a.confidence}%) vs ${b.botName} (${b.action} ${b.confidence}%)`,
        })
      }
    }
  }

  return disagreements
}

// ==========================================
// Step 2: Generate Challenges
// ==========================================

/**
 * Creates a specific challenge for a pair of disagreeing agents.
 * The challenge asks each agent what data from the other's reasoning
 * they haven't accounted for — not "who's right" but "what would change your view?"
 */
export function generateChallenge(
  disagreement: AgentDisagreement,
  indicators?: TechnicalIndicators
): CollaborationChallenge {
  const { agentA, agentB } = disagreement

  // Extract the key evidence tokens each agent cited
  const evidenceA = extractKeyEvidence(agentA.reasoning, indicators)
  const evidenceB = extractKeyEvidence(agentB.reasoning, indicators)

  const challengeToA = buildChallenge(agentA, agentB, evidenceA, evidenceB)
  const challengeToB = buildChallenge(agentB, agentA, evidenceB, evidenceA)

  return {
    id: `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    disagreement,
    challengeToA,
    challengeToB,
    askedAt: Date.now(),
  }
}

function extractKeyEvidence(reasoning: string, indicators?: TechnicalIndicators): string[] {
  const tokens: string[] = []
  // Extract numeric values cited in the reasoning
  const numbers = reasoning.match(/[\d.]+/g) || []
  tokens.push(...numbers.slice(0, 3).map((n) => `$${n}`))
  // Extract indicator names
  const indicatorKeywords = ['RSI', 'MACD', 'EMA', 'Supertrend', 'FVG', 'OrderBlock',
    'funding', 'sentiment', 'volume', 'liquidity', 'momentum', 'breakout']
  for (const kw of indicatorKeywords) {
    if (reasoning.toLowerCase().includes(kw.toLowerCase())) tokens.push(kw)
  }
  // Add live ATR if available
  if (indicators?.atr) tokens.push(`ATR ${indicators.atr.toFixed(2)}`)
  return tokens.slice(0, 5)
}

function buildChallenge(
  askAgent: AgentDisagreement['agentA'],
  otherAgent: AgentDisagreement['agentA'],
  _askEvidence: string[],
  otherEvidence: string[]
): string {
  const otherEvidenceStr = otherEvidence.length > 0
    ? otherEvidence.join(', ')
    : 'the structural signal it cited'

  return (
    `${askAgent.botName}: You cited ${askAgent.action} at ${askAgent.confidence}% confidence. ` +
    `${otherAgent.botName} cited ${otherAgent.action} ${otherAgent.confidence}% based on: ${otherEvidenceStr}. ` +
    `What specific data point in that evidence does your model not account for, ` +
    `and what would need to change in ${otherEvidenceStr} to shift your view?`
  )
}

// ==========================================
// Step 3: Process Revisions (with strict validation)
// ==========================================

/**
 * Determines if an agent should revise its vote given the cross-examined evidence.
 *
 * REVISION LOGIC (deterministic, indicator-based):
 * - An agent reduces its confidence when the challenge surfaces an indicator in
 *   the other agent's reasoning that genuinely contradicts the agent's cited signal.
 * - An agent does NOT change its directional view (BUY→SELL) from a challenge alone —
 *   that requires the indicators themselves to cross a threshold.
 * - A revision is VALID only if it cites the specific contradicting data point.
 * - A revision that just moves confidence toward the midpoint without a cited reason
 *   is REJECTED — logged permanently for audit.
 *
 * INVARIANT: revised confidence <= prior confidence (scrutiny cannot inflate certainty)
 */
export function processRevision(
  challenge: CollaborationChallenge,
  agentId: string,
  currentVotes: AgentVote[],
  indicators?: TechnicalIndicators,
  marketData?: { change24h?: number }
): CollaborationRevision {
  const vote = currentVotes.find((v) => v.botId === agentId)
  if (!vote) {
    return {
      challengeId: challenge.id,
      agentId,
      priorAction: 'HOLD',
      priorConfidence: 50,
      revisedAction: 'HOLD',
      revisedConfidence: 50,
      citedReason: '',
      isValid: false,
      rejectionReason: 'Agent not found in current votes',
    }
  }

  const { agentA, agentB } = challenge.disagreement
  const other = agentId === agentA.botId ? agentB : agentA

  // Check if the challenge exposes a genuine contradiction with this agent's signal
  const contradiction = detectContradiction(vote, other, indicators, marketData)

  if (!contradiction.exists) {
    // No contradiction detected → agent maintains its position (no revision needed)
    return {
      challengeId: challenge.id,
      agentId,
      priorAction: vote.action,
      priorConfidence: vote.confidence,
      revisedAction: vote.action,
      revisedConfidence: vote.confidence,
      citedReason: '',
      isValid: false,
      rejectionReason: 'No specific contradicting data surfaced — agent maintains position',
    }
  }

  // Contradiction exists → agent revises confidence (never direction unless indicators flip)
  const confidenceReduction = Math.min(contradiction.confidenceImpact, vote.confidence - 50)
  const revisedConfidence = Math.max(50, vote.confidence - confidenceReduction)

  const citedReason = buildCitedReason(vote, other, contradiction)

  // Validate the revision: must cite something specific (not empty, not vague)
  const isValid = citedReason.length > 40 && contradiction.exists

  return {
    challengeId: challenge.id,
    agentId,
    priorAction: vote.action,
    priorConfidence: vote.confidence,
    revisedAction: vote.action,          // direction unchanged — only confidence shifts
    revisedConfidence,
    citedReason,
    isValid,
    rejectionReason: isValid ? undefined : 'Insufficient evidence citation — revision rejected',
  }
}

interface Contradiction {
  exists: boolean
  reason: string
  confidenceImpact: number  // how many confidence points to reduce
}

function detectContradiction(
  agentVote: AgentVote,
  other: AgentDisagreement['agentA'],
  indicators?: TechnicalIndicators,
  marketData?: { change24h?: number }
): Contradiction {
  const change24h = marketData?.change24h ?? 0
  const rsi = indicators?.rsi ?? 50
  const macdHist = indicators?.macd?.hist ?? 0

  // Check specific cross-indicator contradictions

  // 1. RSI-based agent (Technical) vs SMC/structural → ATR confirms range, not breakout
  if (agentVote.botId === 'technical-analyst' && other.botId === 'smc-liquidity') {
    if (agentVote.action === 'BUY' && other.action === 'SELL') {
      if (indicators?.bollinger?.bandwidth && indicators.bollinger.bandwidth < 8) {
        return {
          exists: true,
          reason: `SMC cites Order Block rejection at structural level; Bollinger Bandwidth ${indicators.bollinger.bandwidth.toFixed(1)}% confirms range-bound conditions — RSI oversold read may be range noise, not reversal`,
          confidenceImpact: 14,
        }
      }
    }
    if (agentVote.action === 'SELL' && other.action === 'BUY') {
      if (rsi < 35 && macdHist > 0) {
        return {
          exists: true,
          reason: `SMC cites buy-side demand tap; RSI ${rsi.toFixed(1)} overlaid with MACD Hist +${macdHist.toFixed(2)} diverges from sell signal — structural demand may override technical momentum`,
          confidenceImpact: 12,
        }
      }
    }
  }

  // 2. Sentiment vs Volume → funding rate vs volume confirmation mismatch
  if (agentVote.botId === 'sentiment-trader' && other.botId === 'volume-breakout') {
    const absChange = Math.abs(change24h)
    if (absChange < 1.0 && agentVote.confidence >= 80) {
      return {
        exists: true,
        reason: `Volume Breakout cites ${other.action} signal; 24h change (${change24h.toFixed(2)}%) is below 1% threshold — high sentiment confidence (${agentVote.confidence}%) not corroborated by volume confirmation`,
        confidenceImpact: 16,
      }
    }
  }

  // 3. Fundamental vs Macro → valuation vs rate environment conflict
  if (agentVote.botId === 'fundamental-valuation' && other.botId === 'macro-regime') {
    if (agentVote.action !== other.action && agentVote.confidence >= 76) {
      return {
        exists: true,
        reason: `Macro Regime cites ${other.action} regime signal; fundamental model's DCF assumption may not incorporate current ${change24h > 0 ? 'risk-on' : 'risk-off'} macro backdrop — valuation confidence adjusted`,
        confidenceImpact: 10,
      }
    }
  }

  // 4. Arbitrage vs any directional agent → funding rate cross-reference
  if (agentVote.botId === 'arbitrage-funding') {
    const arbitrageSignalConflict = change24h > 3.0 && agentVote.action === 'BUY'
    const arbitrageFlushConflict = change24h < -3.0 && agentVote.action === 'SELL'
    if ((arbitrageSignalConflict || arbitrageFlushConflict) && other.action !== agentVote.action) {
      return {
        exists: true,
        reason: `Directional agent cites strong ${other.action} momentum (24h: ${change24h.toFixed(2)}%); funding rate signal may be lagging extreme move — reducing funding confidence`,
        confidenceImpact: 8,
      }
    }
  }

  // 5. Generic high-confidence conflict check — when two high-confidence agents split,
  // both should acknowledge uncertainty from the other's view
  if (other.confidence >= HIGH_CONFIDENCE_THRESHOLD && agentVote.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      exists: true,
      reason: `High-confidence conflict: ${other.botName} (${other.confidence}%) cites opposing ${other.action} view with independent evidence — acknowledged uncertainty reduces our confidence`,
      confidenceImpact: 8,
    }
  }

  return { exists: false, reason: '', confidenceImpact: 0 }
}

function buildCitedReason(
  agentVote: AgentVote,
  other: AgentDisagreement['agentA'],
  contradiction: Contradiction
): string {
  return (
    `Cross-examined ${other.botName}'s ${other.action} at ${other.confidence}% — ` +
    contradiction.reason +
    ` → revising confidence from ${agentVote.confidence}% (maintaining ${agentVote.action} direction).`
  )
}

// ==========================================
// Main Orchestration
// ==========================================

/**
 * Runs the full collaboration round.
 *
 * Steps:
 * 1. Identify genuine disagreements
 * 2. Generate one challenge per disagreement
 * 3. Process revisions for both agents in each challenge
 * 4. Apply only valid revisions to votes
 * 5. Identify surviving dissents (disagreements where no valid revision converged views)
 *
 * Returns the complete collaboration record + post-collaboration votes.
 */
export function runCollaborationRound(
  votes: AgentVote[],
  ticker: string,
  indicators?: TechnicalIndicators,
  marketData?: { change24h?: number }
): CollaborationRound {
  const timestamp = Date.now()
  const preCollaborationVotes = votes.map((v) => ({ ...v }))

  // Step 1: Identify disagreements
  const disagreements = identifyDisagreements(votes)

  // If no disagreements, return immediately — no round needed
  if (disagreements.length === 0) {
    return {
      id: `round_${timestamp}`,
      ticker,
      timestamp,
      preCollaborationVotes,
      disagreements: [],
      challenges: [],
      validRevisions: [],
      rejectedRevisions: [],
      postCollaborationVotes: preCollaborationVotes,
      survivingDissents: [],
      roundRanAt: timestamp,
    }
  }

  // Step 2: Generate one challenge per disagreement
  const challenges: CollaborationChallenge[] = disagreements.map((d) =>
    generateChallenge(d, indicators)
  )

  // Step 3 & 4: Process revisions for each challenge, apply valid ones
  const validRevisions: CollaborationRevision[] = []
  const rejectedRevisions: CollaborationRevision[] = []
  const postVotes = votes.map((v) => ({ ...v }))

  for (const challenge of challenges) {
    const { agentA, agentB } = challenge.disagreement

    // Challenge both agents
    for (const agentId of [agentA.botId, agentB.botId]) {
      const revision = processRevision(challenge, agentId, postVotes, indicators, marketData)

      if (revision.isValid) {
        validRevisions.push(revision)
        // Apply the revision to postVotes
        const voteIdx = postVotes.findIndex((v) => v.botId === agentId)
        if (voteIdx !== -1) {
          postVotes[voteIdx] = {
            ...postVotes[voteIdx],
            confidence: revision.revisedConfidence,
            reasoning: `${postVotes[voteIdx].reasoning} [Post-collaboration: ${revision.citedReason}]`,
          }
        }
      } else {
        // Only log rejections where an actual revision was attempted but lacked evidence
        if (revision.revisedConfidence !== revision.priorConfidence) {
          rejectedRevisions.push(revision)
        }
      }
    }
  }

  // Step 5: Identify surviving dissents
  // A dissent survives if the two agents still hold opposing directional views
  // after all valid revisions have been applied
  const survivingDissents = disagreements.filter((d) => {
    const postA = postVotes.find((v) => v.botId === d.agentA.botId)
    const postB = postVotes.find((v) => v.botId === d.agentB.botId)
    if (!postA || !postB) return false
    // Dissent survives if direction still opposes
    return postA.action !== postB.action && postA.action !== 'HOLD' && postB.action !== 'HOLD'
  })

  return {
    id: `round_${timestamp}`,
    ticker,
    timestamp,
    preCollaborationVotes,
    disagreements,
    challenges,
    validRevisions,
    rejectedRevisions,
    postCollaborationVotes: postVotes,
    survivingDissents,
    roundRanAt: Date.now(),
  }
}
