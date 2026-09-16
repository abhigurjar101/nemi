/**
 * NEMI Per-Agent Mistake Journal
 *
 * Each agent keeps a structured record of its predictions, outcomes,
 * and falsifiable hypotheses for errors. Reviewed weekly; proposals
 * go into the human-approval queue — nothing auto-applies.
 *
 * HARD RULES (enforced in code, not policy):
 * - Error hypotheses must be specific and falsifiable. "Market was unpredictable"
 *   or "I was just unlucky" are rejected as entries — they provide no signal.
 * - Agents flag their own "right for the wrong reason" wins — these are the most
 *   dangerous to leave uncorrected; they look like wins but reinforce bad logic.
 * - Weekly proposals require N_MIN = 50 journal entries before generation.
 * - Proposals go to human-approval queue — never auto-applied.
 * - No agent retrains a model, rewrites its core prompt, or changes its risk profile.
 * - Proposals are permanently logged even if rejected — for longitudinal audit of
 *   whether an agent's self-diagnosis actually correlates with real improvement.
 */

import type {
  MistakeJournalEntry,
  AgentSelfProposal,
  TradeAction,
} from '../../../../n8n/tradingBots/types'

// ==========================================
// Constants
// ==========================================

const JOURNAL_KEY = 'nemi_mistake_journal'
const PROPOSALS_KEY = 'nemi_agent_self_proposals'
const APPROVED_KEY = 'nemi_approved_agent_proposals'
const N_MIN = 50       // minimum journal entries before proposals generated
const MAX_ENTRIES = 1000
const PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Vague hypothesis patterns that are automatically rejected
const VAGUE_PATTERNS = [
  /\bunpredictable\b/i,
  /\bjust unlucky\b/i,
  /\bbad luck\b/i,
  /\bcould not have known\b/i,
  /\bmarket moved against/i,
  /\bblack swan\b/i,
  /\bextreme event\b/i,
  /\bnobody could have\b/i,
  /\bunforeseeable\b/i,
]

// Minimum length for a specific hypothesis
const MIN_HYPOTHESIS_LENGTH = 40

// Agent metadata (mirrors engine.ts)
const AGENT_NAMES: Record<string, string> = {
  'technical-analyst': 'Technical Analysis Agent',
  'smc-liquidity': 'SMC & ICT Liquidity Hunter',
  'sentiment-trader': 'Sentiment & News Intelligence',
  'volume-breakout': 'Volume Breakout Hunter',
  'fundamental-valuation': 'Fundamental Valuation RAG',
  'arbitrage-funding': 'Arbitrage & Funding Exploiter',
  'macro-regime': 'Macro Regime & Fed Watchdog',
}

// ==========================================
// Storage Helpers
// ==========================================

function loadJournal(): MistakeJournalEntry[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(JOURNAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveJournal(entries: MistakeJournalEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch (e) {
    console.warn('[MistakeJournal] Could not save journal:', e)
  }
}

function loadProposals(): AgentSelfProposal[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(PROPOSALS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveProposals(proposals: AgentSelfProposal[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals))
  } catch {}
}

function loadApprovedProposals(): Record<string, AgentSelfProposal[]> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(APPROVED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveApprovedProposals(data: Record<string, AgentSelfProposal[]>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(APPROVED_KEY, JSON.stringify(data))
  } catch {}
}

// ==========================================
// Hypothesis Validation
// ==========================================

/**
 * Validates whether an error hypothesis is specific and falsifiable.
 *
 * REJECTS:
 * - Hypotheses matching vague patterns ("unlucky", "unpredictable", etc.)
 * - Hypotheses shorter than MIN_HYPOTHESIS_LENGTH characters
 *
 * ACCEPTS:
 * - References to specific indicators (RSI, MACD, volume, funding rate, etc.)
 * - References to measurable conditions ("low volume < 1.5x average")
 * - References to specific data sources or timing failures
 *
 * This is enforced at write time — vague entries are logged as VAGUE_REJECTED,
 * not silently discarded (they remain in the journal for the meta-audit of
 * whether this agent even tries to give useful self-diagnosis).
 */
export function validateHypothesis(text: string): 'SPECIFIC_FALSIFIABLE' | 'VAGUE_REJECTED' {
  if (!text || text.length < MIN_HYPOTHESIS_LENGTH) return 'VAGUE_REJECTED'
  for (const pattern of VAGUE_PATTERNS) {
    if (pattern.test(text)) return 'VAGUE_REJECTED'
  }
  return 'SPECIFIC_FALSIFIABLE'
}

// ==========================================
// Right-for-Wrong-Reason Detection
// ==========================================

/**
 * Detects when an agent was correct direction but for the wrong stated reason.
 *
 * Example: agent BUYs citing RSI oversold reversal, but the actual price driver
 * was a funding rate squeeze — the direction was right, the evidence was coincidental.
 *
 * These are flagged as rightForWrongReason = true. They look like wins in the log
 * but reinforce bad logic if left uncorrected.
 *
 * Detection heuristic (deterministic — no LLM):
 * - Agent cited technical indicator X as primary driver
 * - Outcome was WIN (correct direction)
 * - The cited indicator crossed its threshold in the OPPOSITE direction near the outcome time
 *   (e.g., RSI rose above 50 — no longer oversold — before the price move happened)
 */
export function detectRightForWrongReason(params: {
  botId: string
  predictedAction: TradeAction
  citedEvidence: string
  actualOutcome: 'WIN' | 'LOSS' | 'SCRATCH'
  postTradeChange24h?: number    // the actual price change that occurred
  postTradeRsi?: number          // RSI at resolution time
}): { rightForWrongReason: boolean; explanation?: string } {
  const { predictedAction, citedEvidence, actualOutcome, postTradeChange24h, postTradeRsi } = params

  if (actualOutcome !== 'WIN') {
    return { rightForWrongReason: false }
  }

  const citedLower = citedEvidence.toLowerCase()
  const change = postTradeChange24h ?? 0

  // Case 1: Agent cited RSI oversold as primary signal for BUY
  // but price movement was driven by macro/funding (large single-day move)
  if (predictedAction === 'BUY' && citedLower.includes('oversold') && Math.abs(change) > 4) {
    return {
      rightForWrongReason: true,
      explanation: `BUY direction was correct, but cited RSI oversold reversal. Actual driver appears to be a large price move (+${change.toFixed(2)}%) unrelated to the stated oversold thesis.`,
    }
  }

  // Case 2: Agent cited sentiment/funding for direction but RSI was neutral at outcome
  if (citedLower.includes('funding') && postTradeRsi && postTradeRsi > 45 && postTradeRsi < 55) {
    return {
      rightForWrongReason: true,
      explanation: `Direction correct, but cited funding rate signal. RSI at outcome was ${postTradeRsi.toFixed(1)} (neutral range) — the cited funding thesis may not have driven the actual move.`,
    }
  }

  // Case 3: Agent cited SMC structural break for SELL but price never broke structure
  // (price declined due to sentiment, not SMC pattern)
  if (predictedAction === 'SELL' && citedLower.includes('order block') && change < -4) {
    return {
      rightForWrongReason: true,
      explanation: `SELL direction correct, but cited SMC Order Block rejection. Large move (${change.toFixed(2)}%) suggests market-wide sell-off rather than specific SMC structural thesis.`,
    }
  }

  return { rightForWrongReason: false }
}

// ==========================================
// Journal Entry Logging
// ==========================================

/**
 * Logs a post-outcome journal entry for a specific agent.
 *
 * Called after a prediction resolves (PASSED → WIN, FAILED → LOSS).
 * For LOSS entries: errorHypothesis is required and validated.
 * For WIN entries: right-for-wrong-reason detection runs automatically.
 */
export function logJournalEntry(params: {
  cycleId: string
  botId: string
  predictedAction: TradeAction
  predictedConfidence: number
  citedEvidence: string
  actualOutcome: 'WIN' | 'LOSS' | 'SCRATCH'
  wasCorrectDirection: boolean
  errorHypothesis?: string
  postTradeChange24h?: number
  postTradeRsi?: number
}): MistakeJournalEntry {
  const {
    cycleId, botId, predictedAction, predictedConfidence,
    citedEvidence, actualOutcome, wasCorrectDirection,
    errorHypothesis, postTradeChange24h, postTradeRsi,
  } = params

  const botName = AGENT_NAMES[botId] || botId

  // Validate error hypothesis (required for LOSS)
  let hypothesisQuality: MistakeJournalEntry['hypothesisQuality'] = 'N_A'
  if (actualOutcome === 'LOSS') {
    hypothesisQuality = errorHypothesis
      ? validateHypothesis(errorHypothesis)
      : 'VAGUE_REJECTED'
  }

  // Right-for-wrong-reason check (for WIN)
  const rwrResult = detectRightForWrongReason({
    botId,
    predictedAction,
    citedEvidence,
    actualOutcome,
    postTradeChange24h,
    postTradeRsi,
  })

  const entry: MistakeJournalEntry = {
    id: `mje_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    cycleId,
    botId,
    botName,
    timestamp: Date.now(),
    predictedAction,
    predictedConfidence,
    citedEvidence,
    actualOutcome,
    wasCorrectDirection,
    errorHypothesis,
    hypothesisQuality,
    rightForWrongReason: rwrResult.rightForWrongReason,
    rightForWrongReasonExplanation: rwrResult.explanation,
    postMortemCompleted: true,
  }

  const all = loadJournal()
  all.push(entry)
  saveJournal(all)

  return entry
}

// ==========================================
// Journal Queries
// ==========================================

export function getAgentJournal(botId: string): MistakeJournalEntry[] {
  return loadJournal()
    .filter((e) => e.botId === botId)
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function getAllJournalEntries(): MistakeJournalEntry[] {
  return loadJournal().sort((a, b) => b.timestamp - a.timestamp)
}

export function getJournalStats(botId: string) {
  const entries = getAgentJournal(botId)
  const resolved = entries.filter((e) => e.actualOutcome !== 'SCRATCH')
  const wins = entries.filter((e) => e.actualOutcome === 'WIN')
  const losses = entries.filter((e) => e.actualOutcome === 'LOSS')
  const rightWrongReason = entries.filter((e) => e.rightForWrongReason)
  const specificHypotheses = losses.filter((e) => e.hypothesisQuality === 'SPECIFIC_FALSIFIABLE')
  const vagueHypotheses = losses.filter((e) => e.hypothesisQuality === 'VAGUE_REJECTED')

  return {
    total: entries.length,
    resolved: resolved.length,
    wins: wins.length,
    losses: losses.length,
    rightForWrongReason: rightWrongReason.length,
    specificHypotheses: specificHypotheses.length,
    vagueHypotheses: vagueHypotheses.length,
    hypothesisQualityRate: losses.length > 0
      ? Math.round((specificHypotheses.length / losses.length) * 100)
      : 0,
    sufficientData: entries.length >= N_MIN,
  }
}

// ==========================================
// Weekly Self-Proposal Generation
// ==========================================

/**
 * Analyzes an agent's journal and generates structured self-improvement proposals.
 *
 * Requires N_MIN = 50 entries before any proposal.
 * Proposals are plain, specific, and falsifiable — not "I'll try harder."
 * Goes into the human-approval queue — NEVER auto-applied.
 *
 * Pattern recognition:
 * 1. Recurring loss with same cited indicator → NEW_CHECK proposal
 * 2. Repeated overconfidence in specific regime → ABSTAIN_CONDITION proposal
 * 3. Repeated vague hypotheses → flags self-reflection unreliability
 * 4. High right-for-wrong-reason rate → flags evidence quality problem
 */
export function generateWeeklyProposals(botId: string): AgentSelfProposal[] {
  const entries = getAgentJournal(botId)
  const botName = AGENT_NAMES[botId] || botId

  if (entries.length < N_MIN) {
    return []
  }

  const proposals: AgentSelfProposal[] = []
  const now = Date.now()

  const losses = entries.filter((e) => e.actualOutcome === 'LOSS')
  const specificLosses = losses.filter((e) => e.hypothesisQuality === 'SPECIFIC_FALSIFIABLE')
  const rightWrongWins = entries.filter((e) => e.rightForWrongReason)

  // Pattern 1: Recurring RSI-without-volume losses
  const rsiVolumeLosses = specificLosses.filter((e) =>
    e.citedEvidence.toLowerCase().includes('rsi') &&
    e.errorHypothesis?.toLowerCase().includes('volume')
  )
  if (rsiVolumeLosses.length >= 3) {
    proposals.push({
      id: `sp_${botId}_rsi_vol_${now}`,
      botId,
      botName,
      proposalType: 'NEW_CHECK',
      proposalText: `Before issuing a signal based on RSI oversold/overbought, verify that 24h volume is at least 1.5× the 7-day moving average. RSI signals in low-volume sessions (< 1.5× avg) should be downgraded from primary to supporting evidence.`,
      isFalsifiable: true,
      evidenceSummary: `${rsiVolumeLosses.length} loss entries where RSI signal fired without volume confirmation. Error hypothesis in each cited low-volume false signal.`,
      cyclesSupporting: rsiVolumeLosses.length,
      status: 'PENDING',
      createdAt: now,
      expiresAt: now + PROPOSAL_TTL_MS,
    })
  }

  // Pattern 2: Sentiment agent high-confidence losses when change24h < 1%
  const lowMoveSentimentLosses = specificLosses.filter((e) =>
    e.citedEvidence.toLowerCase().includes('sentiment') &&
    e.predictedConfidence >= 85 &&
    e.errorHypothesis?.toLowerCase().includes('single source')
  )
  if (lowMoveSentimentLosses.length >= 3) {
    proposals.push({
      id: `sp_${botId}_sent_src_${now}`,
      botId,
      botName,
      proposalType: 'NEW_CHECK',
      proposalText: `Before issuing a sentiment signal above 85% confidence, verify the sentiment spike is not driven by a single low-volume source. If the sentiment score is derived from fewer than 3 independent sources, cap stated confidence at 75%.`,
      isFalsifiable: true,
      evidenceSummary: `${lowMoveSentimentLosses.length} loss entries citing sentiment spike from unverified single-source data.`,
      cyclesSupporting: lowMoveSentimentLosses.length,
      status: 'PENDING',
      createdAt: now,
      expiresAt: now + PROPOSAL_TTL_MS,
    })
  }

  // Pattern 3: High right-for-wrong-reason rate → evidence quality problem
  if (rightWrongWins.length >= 5 && entries.length >= 30) {
    const rwrRate = rightWrongWins.length / entries.filter((e) => e.actualOutcome === 'WIN').length
    if (rwrRate > 0.3) {
      proposals.push({
        id: `sp_${botId}_rwr_${now}`,
        botId,
        botName,
        proposalType: 'ABSTAIN_CONDITION',
        proposalText: `When this agent's primary cited indicator contradicts a secondary indicator that independently predicts the opposite direction, reduce stated confidence by 15% and add "conflicting evidence" flag to reasoning instead of suppressing the conflict.`,
        isFalsifiable: true,
        evidenceSummary: `${rightWrongWins.length} wins flagged as right-for-wrong-reason (${Math.round(rwrRate * 100)}% of all wins). The cited evidence did not actually predict the move in these cases.`,
        cyclesSupporting: rightWrongWins.length,
        status: 'PENDING',
        createdAt: now,
        expiresAt: now + PROPOSAL_TTL_MS,
      })
    }
  }

  // Pattern 4: High rate of vague hypotheses → self-reflection unreliability flag
  const vagueHypotheses = losses.filter((e) => e.hypothesisQuality === 'VAGUE_REJECTED')
  if (vagueHypotheses.length > losses.length * 0.5 && losses.length >= 10) {
    proposals.push({
      id: `sp_${botId}_vague_diag_${now}`,
      botId,
      botName,
      proposalType: 'THRESHOLD_REVISION',
      proposalText: `⚠️ META-FINDING: This agent's error hypotheses have been flagged as vague in ${vagueHypotheses.length}/${losses.length} loss cases. This means the agent's self-diagnosis is not producing useful signal. Human reviewer should inspect whether the agent's reasoning structure is specific enough to generate testable hypotheses before acting on any proposals from this agent.`,
      isFalsifiable: true,
      evidenceSummary: `${vagueHypotheses.length} of ${losses.length} loss hypotheses were flagged VAGUE_REJECTED. Proposals from this agent should be treated with low confidence until hypothesis quality improves.`,
      cyclesSupporting: vagueHypotheses.length,
      status: 'PENDING',
      createdAt: now,
      expiresAt: now + PROPOSAL_TTL_MS,
    })
  }

  // Save generated proposals (merge with existing, replace PENDING for same botId+type)
  const existing = loadProposals().filter(
    (p) => p.status !== 'PENDING' || p.botId !== botId ||
    !proposals.some((np) => np.proposalType === p.proposalType)
  )
  saveProposals([...existing, ...proposals])

  return proposals
}

// ==========================================
// Human Approval Interface
// ==========================================

export function approveSelfProposal(proposalId: string): boolean {
  const proposals = loadProposals()
  const idx = proposals.findIndex((p) => p.id === proposalId && p.status === 'PENDING')
  if (idx === -1) return false

  proposals[idx] = { ...proposals[idx], status: 'APPROVED', decidedAt: Date.now(), decidedBy: 'HUMAN' }
  saveProposals(proposals)

  // Record in permanent approved log (for longitudinal audit)
  const approvedData = loadApprovedProposals()
  const botId = proposals[idx].botId
  if (!approvedData[botId]) approvedData[botId] = []
  approvedData[botId].push(proposals[idx])
  saveApprovedProposals(approvedData)

  return true
}

export function rejectSelfProposal(proposalId: string): boolean {
  const proposals = loadProposals()
  const idx = proposals.findIndex((p) => p.id === proposalId && p.status === 'PENDING')
  if (idx === -1) return false

  // PERMANENTLY logged even after rejection — for longitudinal meta-audit
  proposals[idx] = { ...proposals[idx], status: 'REJECTED', decidedAt: Date.now(), decidedBy: 'HUMAN' }
  saveProposals(proposals)
  return true
}

export function getPendingSelfProposals(): AgentSelfProposal[] {
  return loadProposals().filter((p) => p.status === 'PENDING' && p.expiresAt > Date.now())
}

export function getAllSelfProposals(): AgentSelfProposal[] {
  return loadProposals()
}

/**
 * Wipe all journal data — for testing only
 */
export function clearJournal(): void {
  saveJournal([])
}
