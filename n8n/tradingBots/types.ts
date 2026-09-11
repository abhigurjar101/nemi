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
