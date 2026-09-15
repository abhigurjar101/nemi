/**
 * NEMI Swarm Calibration Module
 *
 * Weekly-scheduled, stateless computation engine.
 * Reads AgentDecisionLog → produces CalibrationReport and CalibrationProposal
 * per agent → stores proposals in a pending-approval queue.
 *
 * HARD RULES (enforced in code, not just policy):
 * - No proposal generated if resolved cycles < N_MIN (50).
 * - No weight change applied without explicit human approval.
 * - Max adjustment per week: ±10% of current weight (multiplicative cap).
 * - Sudden calibration degradation >15pts → DATA_FEED_ANOMALY_ALERT, proposal blocked.
 * - Last-10-cycle hot streak flagged as LOW_CONFIDENCE_STREAK, never sole basis.
 * - This module never calls any trade execution function.
 * - This module never modifies hard stops or veto logic.
 */

import type {
  AgentDecisionEntry,
  CalibrationBucketRow,
  CalibrationProposal,
  CalibrationReport,
  DissenterAudit,
  MarketRegime,
  RegimeHitRow,
} from '../../../../n8n/tradingBots/types'
import { agentDecisionLog } from './agentDecisionLog'

// ==========================================
// Constants
// ==========================================

const N_MIN = 50 // minimum resolved cycles before any proposal
const MAX_WEEKLY_DELTA_FRACTION = 0.10 // ±10% of current weight
const ANOMALY_THRESHOLD_PTS = 15 // calibration drop that triggers DATA_FEED_ANOMALY_ALERT
const MIN_DISAGREEMENTS_FOR_DISSENTER_AUDIT = 20
const MIN_BUCKET_SAMPLES = 5 // below this → bucket marked SPARSE
const MIN_REGIME_SAMPLES = 10 // below this → regime marked LOW_SAMPLE_COUNT
const RECENCY_WINDOW = 10 // cycles used for recency-streak check
const PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const PROPOSALS_KEY = 'nemi_calibration_proposals'
const LAST_RUN_KEY = 'nemi_last_calibration_run'
const PREV_SCORES_KEY = 'nemi_calibration_prev_scores'
const APPROVED_WEIGHTS_KEY = 'nemi_approved_calibration_weights'

// Default agent weights (mirrors engine.ts defaultVotes)
const DEFAULT_WEIGHTS: Record<string, number> = {
  'technical-analyst': 0.20,
  'smc-liquidity': 0.20,
  'sentiment-trader': 0.15,
  'volume-breakout': 0.15,
  'fundamental-valuation': 0.10,
  'arbitrage-funding': 0.10,
  'macro-regime': 0.10,
}

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

function loadProposals(): CalibrationProposal[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(PROPOSALS_KEY)
    return raw ? (JSON.parse(raw) as CalibrationProposal[]) : []
  } catch { return [] }
}

function saveProposals(proposals: CalibrationProposal[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals))
  } catch (e) {
    console.warn('[CalibrationModule] Could not save proposals:', e)
  }
}

function loadPrevScores(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(PREV_SCORES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePrevScores(scores: Record<string, number>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PREV_SCORES_KEY, JSON.stringify(scores))
  } catch {}
}

export function loadApprovedWeights(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(APPROVED_WEIGHTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveApprovedWeights(weights: Record<string, number>): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(APPROVED_WEIGHTS_KEY, JSON.stringify(weights))
  } catch {}
}

// ==========================================
// Core Calibration Math
// ==========================================

const CONFIDENCE_BUCKETS = [
  { label: '50-60%', lo: 50, hi: 60, midpoint: 55 },
  { label: '60-70%', lo: 60, hi: 70, midpoint: 65 },
  { label: '70-80%', lo: 70, hi: 80, midpoint: 75 },
  { label: '80-90%', lo: 80, hi: 90, midpoint: 85 },
  { label: '90-100%', lo: 90, hi: 101, midpoint: 95 },
]

/**
 * For a given agent, bucket all resolved cycles by stated confidence,
 * then compute empirical win rate per bucket vs. stated confidence.
 * Sparse buckets (< MIN_BUCKET_SAMPLES) are flagged but not penalized.
 */
export function computeCalibrationScore(
  botId: string,
  entries: AgentDecisionEntry[]
): { score: number; buckets: CalibrationBucketRow[] } {
  const buckets: CalibrationBucketRow[] = CONFIDENCE_BUCKETS.map((bkt) => {
    const inBucket = entries.filter((e) => {
      const vote = e.agentVotes.find((v) => v.botId === botId)
      if (!vote) return false
      return vote.confidence >= bkt.lo && vote.confidence < bkt.hi
    })

    const wins = inBucket.filter((e) => {
      const vote = e.agentVotes.find((v) => v.botId === botId)!
      // Agent is "correct" if their action matches the outcome direction
      if (!e.outcome) return false
      if (e.outcome === 'SCRATCH') return false
      const agentWantedBull = vote.action === 'BUY'
      const outcomeWasBull = e.outcome === 'WIN' && e.orchestratorAction === 'BUY'
      const outcomeWasBear = e.outcome === 'WIN' && e.orchestratorAction === 'SELL'
      return (agentWantedBull && outcomeWasBull) || (!agentWantedBull && outcomeWasBear)
    }).length

    const total = inBucket.length
    const empiricalRate = total > 0 ? wins / total : 0
    const calibrationError = total > 0
      ? Math.abs(empiricalRate - bkt.midpoint / 100)
      : 0

    return {
      bucketLabel: bkt.label,
      midpoint: bkt.midpoint,
      totalCalls: total,
      wins,
      empiricalRate: Math.round(empiricalRate * 1000) / 1000,
      calibrationError: Math.round(calibrationError * 1000) / 1000,
      sparse: total < MIN_BUCKET_SAMPLES,
    }
  })

  // Weighted mean absolute calibration error (only non-sparse buckets)
  const activeBuckets = buckets.filter((b) => !b.sparse && b.totalCalls > 0)
  const totalCalls = activeBuckets.reduce((s, b) => s + b.totalCalls, 0)

  let wmace = 0
  if (totalCalls > 0) {
    wmace = activeBuckets.reduce(
      (s, b) => s + b.calibrationError * (b.totalCalls / totalCalls),
      0
    )
  }

  // Score 0-100: 100 = perfectly calibrated (zero error)
  const score = Math.max(0, Math.round((1 - wmace) * 100))

  return { score, buckets }
}

/**
 * Per-regime hit rate table.
 * Always reported separately — never collapsed into a lifetime average.
 */
export function computeRegimeHitRates(
  botId: string,
  entries: AgentDecisionEntry[]
): RegimeHitRow[] {
  const regimes: MarketRegime[] = ['TRENDING_BULL', 'TRENDING_BEAR', 'RANGING', 'HIGH_VOLATILITY']

  return regimes.map((regime) => {
    const inRegime = entries.filter((e) => e.regime === regime)
    const wins = inRegime.filter((e) => {
      if (!e.outcome || e.outcome === 'SCRATCH') return false
      const vote = e.agentVotes.find((v) => v.botId === botId)
      if (!vote) return false
      const agentWantedBull = vote.action === 'BUY'
      const outcomeWasBull = e.outcome === 'WIN' && e.orchestratorAction === 'BUY'
      const outcomeWasBear = e.outcome === 'WIN' && e.orchestratorAction === 'SELL'
      return (agentWantedBull && outcomeWasBull) || (!agentWantedBull && outcomeWasBear)
    }).length

    const total = inRegime.length
    return {
      regime,
      totalCycles: total,
      wins,
      hitRate: total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0,
      lowSampleCount: total < MIN_REGIME_SAMPLES,
    }
  })
}

/**
 * Dissenter contribution audit.
 * Identifies cycles where this agent's vote ≠ consensus action,
 * then checks who was closer to correct — agent or consensus.
 */
export function computeDissenterAudit(
  botId: string,
  entries: AgentDecisionEntry[]
): DissenterAudit {
  // Cycles where agent disagreed with orchestrator
  const disagreements = entries.filter((e) => {
    const vote = e.agentVotes.find((v) => v.botId === botId)
    if (!vote) return false
    return vote.action !== e.orchestratorAction
  })

  const total = disagreements.length

  if (total < MIN_DISAGREEMENTS_FOR_DISSENTER_AUDIT) {
    return {
      totalDisagreements: total,
      agentCorrect: 0,
      consensusCorrect: 0,
      dissenterHitRate: 0,
      consensusHitRate: 0,
      signal: 'NEUTRAL',
      insufficientDisagreements: true,
    }
  }

  // Agent correct = agent's direction was the winning direction
  const agentCorrect = disagreements.filter((e) => {
    if (!e.outcome || e.outcome === 'SCRATCH') return false
    const vote = e.agentVotes.find((v) => v.botId === botId)!
    const agentBull = vote.action === 'BUY'
    return (agentBull && e.outcome === 'WIN' && e.orchestratorAction !== 'BUY') ||
      (!agentBull && e.outcome === 'LOSS' && e.orchestratorAction === 'BUY') ||
      (!agentBull && e.outcome === 'WIN' && e.orchestratorAction === 'BUY')
  }).length

  // Consensus correct = consensus direction was right (outcome WIN following orchestrator direction)
  const consensusCorrect = disagreements.filter((e) => {
    if (!e.outcome || e.outcome === 'SCRATCH') return false
    return e.outcome === 'WIN'
  }).length

  const dissenterHitRate = Math.round((agentCorrect / total) * 1000) / 1000
  const consensusHitRate = Math.round((consensusCorrect / total) * 1000) / 1000

  let signal: DissenterAudit['signal'] = 'NEUTRAL'
  // If agent is meaningfully more accurate than consensus when disagreeing → under-weighted
  if (dissenterHitRate > consensusHitRate + 0.05) signal = 'WEIGHT_INCREASE_CANDIDATE'
  else if (consensusHitRate > dissenterHitRate + 0.05) signal = 'WEIGHT_DECREASE_CANDIDATE'

  return {
    totalDisagreements: total,
    agentCorrect,
    consensusCorrect,
    dissenterHitRate,
    consensusHitRate,
    signal,
    insufficientDisagreements: false,
  }
}

/**
 * Checks whether the last RECENCY_WINDOW cycles are the primary driver
 * of the proposed direction — flags as LOW_CONFIDENCE_STREAK if so.
 */
function isRecentStreakDriving(
  botId: string,
  allEntries: AgentDecisionEntry[],
  proposedDirection: number
): boolean {
  const recent = allEntries.slice(-RECENCY_WINDOW)
  if (recent.length < RECENCY_WINDOW) return false

  const recentWins = recent.filter((e) => {
    if (!e.outcome || e.outcome === 'SCRATCH') return false
    const vote = e.agentVotes.find((v) => v.botId === botId)
    if (!vote) return false
    const agentBull = vote.action === 'BUY'
    return (agentBull && e.outcome === 'WIN' && e.orchestratorAction === 'BUY') ||
      (!agentBull && e.outcome === 'WIN' && e.orchestratorAction === 'SELL')
  }).length

  const recentRate = recentWins / RECENCY_WINDOW

  // If recent rate is the direction driver and lifetime rate disagrees
  const lifetimeWins = allEntries.filter((e) => {
    if (!e.outcome || e.outcome === 'SCRATCH') return false
    const vote = e.agentVotes.find((v) => v.botId === botId)
    if (!vote) return false
    const agentBull = vote.action === 'BUY'
    return (agentBull && e.outcome === 'WIN' && e.orchestratorAction === 'BUY') ||
      (!agentBull && e.outcome === 'WIN' && e.orchestratorAction === 'SELL')
  }).length
  const lifetimeRate = allEntries.length > 0 ? lifetimeWins / allEntries.length : 0.5

  // Streak is driving if recency rate diverges from lifetime by >15pp AND aligns with proposed direction
  if (proposedDirection > 0 && recentRate - lifetimeRate > 0.15) return true
  if (proposedDirection < 0 && lifetimeRate - recentRate > 0.15) return true
  return false
}

// ==========================================
// Per-Agent Report + Proposal
// ==========================================

/**
 * Generates the full calibration report for a single agent.
 */
export function generateAgentReport(
  botId: string,
  currentWeight: number,
  prevScores: Record<string, number>
): CalibrationReport {
  const entries = agentDecisionLog.getEntriesByAgent(botId)
  const resolvedCycles = entries.length
  const botName = AGENT_NAMES[botId] || botId
  const hasEnoughData = resolvedCycles >= N_MIN
  const flags: CalibrationReport['flags'] = []

  if (!hasEnoughData) {
    flags.push('INSUFFICIENT_DATA')
    return {
      botId,
      botName,
      currentWeight,
      resolvedCycles,
      minCyclesRequired: N_MIN,
      hasEnoughData: false,
      calibrationScore: 0,
      calibrationScoreLastWeek: prevScores[botId],
      calibrationBuckets: [],
      regimeHitRates: computeRegimeHitRates(botId, entries),
      dissenterAudit: computeDissenterAudit(botId, entries),
      flags,
      proposedWeightDelta: 0,
      proposedWeight: currentWeight,
      proposalReason: `Insufficient data: ${resolvedCycles}/${N_MIN} resolved cycles. No proposal generated.`,
      generatedAt: Date.now(),
    }
  }

  const { score: calibrationScore, buckets } = computeCalibrationScore(botId, entries)
  const regimeHitRates = computeRegimeHitRates(botId, entries)
  const dissenterAudit = computeDissenterAudit(botId, entries)

  const lastWeekScore = prevScores[botId]

  // DATA_FEED_ANOMALY_ALERT: sharp calibration degradation
  if (lastWeekScore !== undefined && lastWeekScore - calibrationScore > ANOMALY_THRESHOLD_PTS) {
    flags.push('DATA_FEED_ANOMALY_ALERT')
  }

  // Dissenter audit flags
  if (dissenterAudit.signal === 'WEIGHT_INCREASE_CANDIDATE') flags.push('WEIGHT_INCREASE_CANDIDATE')
  if (dissenterAudit.signal === 'WEIGHT_DECREASE_CANDIDATE') flags.push('WEIGHT_DECREASE_CANDIDATE')

  // Determine proposed direction from combined signals
  let directionScore = 0
  // Calibration: >80 = good → slight increase; <65 = poor → decrease
  if (calibrationScore >= 80) directionScore += 1
  else if (calibrationScore < 65) directionScore -= 1

  // Dissenter audit
  if (dissenterAudit.signal === 'WEIGHT_INCREASE_CANDIDATE') directionScore += 1
  if (dissenterAudit.signal === 'WEIGHT_DECREASE_CANDIDATE') directionScore -= 1

  // Block proposal on anomaly
  if (flags.includes('DATA_FEED_ANOMALY_ALERT')) {
    return {
      botId, botName, currentWeight, resolvedCycles,
      minCyclesRequired: N_MIN, hasEnoughData: true,
      calibrationScore, calibrationScoreLastWeek: lastWeekScore,
      calibrationBuckets: buckets, regimeHitRates, dissenterAudit, flags,
      proposedWeightDelta: 0, proposedWeight: currentWeight,
      proposalReason: `DATA_FEED_ANOMALY_ALERT: Calibration dropped ${lastWeekScore !== undefined ? Math.round(lastWeekScore - calibrationScore) : 'unknown'} points vs last week. Investigate data feed before any reweighting.`,
      generatedAt: Date.now(),
    }
  }

  // Recency streak check
  if (isRecentStreakDriving(botId, entries, directionScore)) {
    flags.push('LOW_CONFIDENCE_STREAK')
  }

  // Compute bounded adjustment
  const maxDelta = currentWeight * MAX_WEEKLY_DELTA_FRACTION
  const rawDelta = directionScore > 0 ? maxDelta : directionScore < 0 ? -maxDelta : 0
  const clampedMin = 0.05
  const clampedMax = 0.40
  const proposedWeight = Math.min(clampedMax, Math.max(clampedMin,
    Math.round((currentWeight + rawDelta) * 1000) / 1000
  ))
  const proposedWeightDelta = Math.round((proposedWeight - currentWeight) * 1000) / 1000

  const recencyNote = flags.includes('LOW_CONFIDENCE_STREAK')
    ? ' ⚠️ Note: last-10-cycle streak partially drives this recommendation — treat with caution.'
    : ''

  const proposalReason = directionScore === 0
    ? `No clear adjustment signal. Calibration score ${calibrationScore}%, dissenter audit neutral. Weight unchanged.`
    : directionScore > 0
    ? `Upward adjustment: calibration score ${calibrationScore}%, dissenter audit shows ${(dissenterAudit.dissenterHitRate * 100).toFixed(0)}% hit rate on disagreements (vs consensus ${(dissenterAudit.consensusHitRate * 100).toFixed(0)}%).${recencyNote}`
    : `Downward adjustment: calibration score ${calibrationScore}%, agent under-performs consensus on disagreements (${(dissenterAudit.dissenterHitRate * 100).toFixed(0)}% vs ${(dissenterAudit.consensusHitRate * 100).toFixed(0)}%).${recencyNote}`

  return {
    botId, botName, currentWeight, resolvedCycles,
    minCyclesRequired: N_MIN, hasEnoughData: true,
    calibrationScore, calibrationScoreLastWeek: lastWeekScore,
    calibrationBuckets: buckets, regimeHitRates, dissenterAudit, flags,
    proposedWeightDelta, proposedWeight, proposalReason,
    generatedAt: Date.now(),
  }
}

// ==========================================
// Weekly Orchestration
// ==========================================

/**
 * Runs the full calibration pass across all agents.
 * - Generates CalibrationReport per agent.
 * - Creates CalibrationProposal records in PENDING state.
 * - Saves proposals to localStorage.
 * - Records this run timestamp and current scores for next week's comparison.
 *
 * This function NEVER modifies live weights or executes trades.
 */
export function runWeeklyCalibration(): CalibrationReport[] {
  const approvedWeights = loadApprovedWeights()
  const prevScores = loadPrevScores()
  const reports: CalibrationReport[] = []

  const newProposals: CalibrationProposal[] = []
  const newScores: Record<string, number> = {}

  for (const botId of Object.keys(DEFAULT_WEIGHTS)) {
    const currentWeight = approvedWeights[botId] ?? DEFAULT_WEIGHTS[botId]
    const report = generateAgentReport(botId, currentWeight, prevScores)
    reports.push(report)

    // Record this week's score for anomaly detection next run
    if (report.hasEnoughData) {
      newScores[botId] = report.calibrationScore
    }

    // Only create a proposal if there's an actual non-zero adjustment and no blocking flag
    if (
      report.hasEnoughData &&
      !report.flags.includes('DATA_FEED_ANOMALY_ALERT') &&
      !report.flags.includes('INSUFFICIENT_DATA') &&
      report.proposedWeightDelta !== 0
    ) {
      const proposal: CalibrationProposal = {
        id: `prop_${botId}_${Date.now()}`,
        botId: report.botId,
        botName: report.botName,
        currentWeight: report.currentWeight,
        proposedWeight: report.proposedWeight,
        delta: report.proposedWeightDelta,
        status: 'PENDING',
        flags: report.flags,
        calibrationScore: report.calibrationScore,
        dissenterHitRate: report.dissenterAudit.dissenterHitRate,
        proposalReason: report.proposalReason,
        createdAt: Date.now(),
        expiresAt: Date.now() + PROPOSAL_TTL_MS,
      }
      newProposals.push(proposal)
    }
  }

  // Merge with existing proposals — replace any existing PENDING for same botId
  const existingProposals = loadProposals().filter(
    (p) => p.status !== 'PENDING' || !newProposals.some((np) => np.botId === p.botId)
  )
  saveProposals([...existingProposals, ...newProposals])

  // Update score history and last-run timestamp
  savePrevScores({ ...prevScores, ...newScores })
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_RUN_KEY, String(Date.now()))
    }
  } catch {}

  return reports
}

// ==========================================
// Human Approval Interface
// ==========================================

/** Approve a pending proposal — writes to approved weights overlay */
export function approveProposal(proposalId: string): boolean {
  const proposals = loadProposals()
  const idx = proposals.findIndex((p) => p.id === proposalId && p.status === 'PENDING')
  if (idx === -1) return false

  proposals[idx] = {
    ...proposals[idx],
    status: 'APPROVED',
    decidedAt: Date.now(),
    decidedBy: 'HUMAN',
  }
  saveProposals(proposals)

  // Apply to approved weights overlay
  const weights = loadApprovedWeights()
  weights[proposals[idx].botId] = proposals[idx].proposedWeight
  saveApprovedWeights(weights)

  return true
}

/** Reject a pending proposal — leaves current weight unchanged */
export function rejectProposal(proposalId: string): boolean {
  const proposals = loadProposals()
  const idx = proposals.findIndex((p) => p.id === proposalId && p.status === 'PENDING')
  if (idx === -1) return false

  proposals[idx] = {
    ...proposals[idx],
    status: 'REJECTED',
    decidedAt: Date.now(),
    decidedBy: 'HUMAN',
  }
  saveProposals(proposals)
  return true
}

/** Reset all approved weight overrides to factory defaults */
export function resetAllWeightsToDefaults(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(APPROVED_WEIGHTS_KEY)
    }
  } catch {}
}

/** Get all proposals (pending + historical) */
export function getAllProposals(): CalibrationProposal[] {
  return loadProposals()
}

/** Get pending proposals only */
export function getPendingProposals(): CalibrationProposal[] {
  return loadProposals().filter((p) => p.status === 'PENDING' && p.expiresAt > Date.now())
}

/** Timestamp of last calibration run, or null */
export function getLastRunTimestamp(): number | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(LAST_RUN_KEY)
    return raw ? parseInt(raw, 10) : null
  } catch { return null }
}
