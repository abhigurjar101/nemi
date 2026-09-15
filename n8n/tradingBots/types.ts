import type { N8nBot } from '../types'

export type TradeAction = 'BUY' | 'SELL' | 'HOLD'

export interface MarketDataCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalIndicators {
  rsi: number
  macd: {
    macd: number
    signal: number
    hist: number
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
    bandwidth: number
  }
  ema20: number
  ema50: number
  ema200: number
  atr: number
  supertrend: {
    value: number
    direction: 'up' | 'down'
  }
}

export interface SmcPattern {
  type: 'FVG' | 'OrderBlock' | 'BOS' | 'CHoCH' | 'LiquiditySweep'
  direction: 'bullish' | 'bearish'
  top: number
  bottom: number
  mitigated: boolean
  description: string
}

export interface ArbitrageOpportunity {
  pair: string
  exchangeA: string
  exchangeB: string
  priceA: number
  priceB: number
  spreadPercent: number
  netProfitUsd: number
  fundingRateA?: number
  fundingRateB?: number
  annualizedApr?: number
}

export interface PairsStatArb {
  assetA: string
  assetB: string
  currentRatio: number
  meanRatio: number
  stdDev: number
  zScore: number
  signal: 'LONG_A_SHORT_B' | 'SHORT_A_LONG_B' | 'NEUTRAL'
  halfLifeDays: number
}

export interface MacroRegimeState {
  regime: 'Goldilocks' | 'Reflation' | 'Stagflation' | 'Contraction'
  yieldCurve10Y2Y: number
  cpiInflationRate: number
  fedFundsRate: number
  dxyIndex: number
  equityTilt: 'Overweight' | 'Neutral' | 'Underweight'
  cryptoTilt: 'Overweight' | 'Neutral' | 'Underweight'
  description: string
}

export interface RiskAuditResult {
  approved: boolean
  requestedSizeUsd: number
  approvedSizeUsd: number
  kellyFraction: number
  var99Percent: number
  maxDrawdownCurrentPercent: number
  circuitBreakerTriggered: boolean
  winProbability?: number
  minWinProbabilityRequired?: number
  reason: string
}

export interface AgentVote {
  botId: string
  botName: string
  action: TradeAction
  weight: number
  confidence: number
  reasoning: string
}

export interface ConsensusDecision {
  consensusAction: TradeAction
  overallConfidence: number
  winProbability: number
  isHighConviction: boolean
  gatekeeperPassed: boolean
  ticker: string
  price: number
  entryTarget: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  recommendedPositionSizeUsd: number
  agentVotes: AgentVote[]
  riskAudit: RiskAuditResult
  timestamp: number
}

export interface BacktestResult {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  profitFactor: number
  totalReturnPercent: number
  maxDrawdownPercent: number
  sharpeRatio: number
  equityCurve: Array<{ timestamp: number; equity: number }>
}

export type TradingBotCategory =
  | 'Alpha Generation'
  | 'Structural & Flow'
  | 'Quantitative Arbitrage'
  | 'Macro & Risk'
  | 'Swarm Consensus'

export interface TradingBot extends N8nBot {
  tradingCategory: TradingBotCategory
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive' | 'Systemic'
  targetAssets: string[]
  timeframes: string[]
  supportedExchanges: string[]
}

// ==========================================
// Calibration Module Types
// ==========================================

/**
 * Market regime at the time of a swarm decision cycle.
 * Used to segment hit-rate reporting — never collapsed into a lifetime average.
 */
export type MarketRegime =
  | 'TRENDING_BULL'
  | 'TRENDING_BEAR'
  | 'RANGING'
  | 'HIGH_VOLATILITY'

/**
 * One logged Orchestrator decision cycle. Written immediately after
 * calculateSwarmConsensus() and resolved when the prediction outcome is known.
 * This is the raw material for calibration — every field here is evidence,
 * not inference.
 */
export interface AgentDecisionEntry {
  id: string
  timestamp: number
  ticker: string
  regime: MarketRegime
  change24h: number
  atr: number
  // Each agent's raw vote for this cycle
  agentVotes: Array<{
    botId: string
    botName: string
    action: TradeAction
    confidence: number // 0-100
    weight: number
  }>
  // What the Orchestrator decided
  orchestratorAction: TradeAction
  orchestratorConfidence: number
  winProbability: number
  gatekeeperPassed: boolean
  // Resolved after outcome is known
  resolved: boolean
  outcome?: 'WIN' | 'LOSS' | 'SCRATCH' // null until resolved
  finalPrice?: number
  resolvedAt?: number
}

/**
 * A single row in a calibration score table.
 * One row per confidence bucket (e.g. 70-80%).
 */
export interface CalibrationBucketRow {
  bucketLabel: string      // e.g. '70-80%'
  midpoint: number         // e.g. 75 (as 0-100)
  totalCalls: number
  wins: number
  empiricalRate: number    // wins / totalCalls (0-1)
  calibrationError: number // |empiricalRate - midpoint/100|
  sparse: boolean          // true if totalCalls < 5
}

/**
 * Per-regime hit rate row. Always reported separately,
 * never collapsed into a lifetime average.
 */
export interface RegimeHitRow {
  regime: MarketRegime
  totalCycles: number
  wins: number
  hitRate: number          // 0-1
  lowSampleCount: boolean  // true if totalCycles < 10
}

/**
 * Dissenter contribution audit for one agent.
 * Tracks cycles where this agent disagreed with consensus,
 * and who was right more often.
 */
export interface DissenterAudit {
  totalDisagreements: number
  agentCorrect: number            // agent disagreed AND was right
  consensusCorrect: number        // consensus prevailed AND was right
  dissenterHitRate: number        // agentCorrect / totalDisagreements
  consensusHitRate: number        // consensusCorrect / totalDisagreements
  signal: 'WEIGHT_INCREASE_CANDIDATE' | 'WEIGHT_DECREASE_CANDIDATE' | 'NEUTRAL'
  insufficientDisagreements: boolean // true if totalDisagreements < 20
}

/**
 * Complete calibration report for one agent, produced weekly.
 * Read-only — contains findings and a proposed adjustment but never
 * applies anything automatically.
 */
export interface CalibrationReport {
  botId: string
  botName: string
  currentWeight: number
  resolvedCycles: number
  minCyclesRequired: number        // 50
  hasEnoughData: boolean

  calibrationScore: number         // 0-100: 100 = perfectly calibrated
  calibrationScoreLastWeek?: number
  calibrationBuckets: CalibrationBucketRow[]

  regimeHitRates: RegimeHitRow[]

  dissenterAudit: DissenterAudit

  flags: Array<
    | 'INSUFFICIENT_DATA'
    | 'DATA_FEED_ANOMALY_ALERT'
    | 'LOW_CONFIDENCE_STREAK'
    | 'WEIGHT_INCREASE_CANDIDATE'
    | 'WEIGHT_DECREASE_CANDIDATE'
  >

  proposedWeightDelta: number      // e.g. -0.02 = decrease by 2 percentage points
  proposedWeight: number           // clamped result
  proposalReason: string           // human-readable evidence summary

  generatedAt: number
}

/**
 * A human-approval record for a single agent's proposed weight change.
 * Nothing in live trading changes until status is set to 'APPROVED'.
 */
export interface CalibrationProposal {
  id: string
  botId: string
  botName: string
  currentWeight: number
  proposedWeight: number
  delta: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  flags: CalibrationReport['flags']
  calibrationScore: number
  dissenterHitRate: number
  proposalReason: string
  createdAt: number
  expiresAt: number              // auto-expire after 7 days
  decidedAt?: number
  decidedBy?: string
}
