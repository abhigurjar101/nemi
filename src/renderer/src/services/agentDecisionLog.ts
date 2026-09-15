/**
 * NEMI Agent Decision Log
 *
 * Persistent store for every Orchestrator decision cycle.
 * Written immediately after calculateSwarmConsensus() — resolved when a
 * linked PredictionRecord settles to PASSED or FAILED.
 *
 * This is the sole input to the Calibration Module. It never modifies weights,
 * never executes trades, and never changes hard stops.
 */

import type { AgentDecisionEntry, MarketRegime } from '../../../../n8n/tradingBots/types'

const STORAGE_KEY = 'nemi_agent_decision_log'
const MAX_ENTRIES = 500

// ==========================================
// Regime Classification (deterministic)
// ==========================================

/**
 * Classifies the market regime at the moment of a decision cycle.
 * Uses change24h and ATR as proxies — no model, no hallucination.
 *
 * - TRENDING_BULL:    24h change > 2% and price above EMA (ema50 > 0 check)
 * - TRENDING_BEAR:    24h change < -2%
 * - HIGH_VOLATILITY:  |change24h| > 4% OR atr is very large relative to price
 * - RANGING:          everything else (|change24h| < 0.5% and quiet ATR)
 */
export function classifyRegime(
  change24h: number,
  atr: number,
  price: number,
  ema50: number
): MarketRegime {
  const absChange = Math.abs(change24h)
  const atrPct = price > 0 ? (atr / price) * 100 : 0

  if (absChange > 4 || atrPct > 3.5) return 'HIGH_VOLATILITY'
  if (change24h > 2 && price >= ema50 * 0.99) return 'TRENDING_BULL'
  if (change24h < -2) return 'TRENDING_BEAR'
  return 'RANGING'
}

// ==========================================
// Storage Helpers
// ==========================================

function loadFromStorage(): AgentDecisionEntry[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AgentDecisionEntry[]
  } catch {
    return []
  }
}

function saveToStorage(entries: AgentDecisionEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    // Prune to MAX_ENTRIES to prevent unbounded growth
    const pruned = entries.slice(-MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
  } catch (e) {
    console.warn('[AgentDecisionLog] Could not persist to localStorage:', e)
  }
}

// ==========================================
// Service Class
// ==========================================

class AgentDecisionLogService {
  private entries: AgentDecisionEntry[]

  constructor() {
    this.entries = loadFromStorage()
  }

  /**
   * Log a new Orchestrator cycle immediately after calculateSwarmConsensus().
   * Returns the generated entry ID so the caller can link a PredictionRecord to it.
   */
  public logDecision(params: {
    ticker: string
    change24h: number
    atr: number
    price: number
    ema50: number
    agentVotes: AgentDecisionEntry['agentVotes']
    orchestratorAction: AgentDecisionEntry['orchestratorAction']
    orchestratorConfidence: number
    winProbability: number
    gatekeeperPassed: boolean
  }): string {
    const id = `adl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const regime = classifyRegime(params.change24h, params.atr, params.price, params.ema50)

    const entry: AgentDecisionEntry = {
      id,
      timestamp: Date.now(),
      ticker: params.ticker,
      regime,
      change24h: params.change24h,
      atr: params.atr,
      agentVotes: params.agentVotes,
      orchestratorAction: params.orchestratorAction,
      orchestratorConfidence: params.orchestratorConfidence,
      winProbability: params.winProbability,
      gatekeeperPassed: params.gatekeeperPassed,
      resolved: false,
    }

    this.entries.push(entry)
    saveToStorage(this.entries)
    return id
  }

  /**
   * Resolve a logged cycle after a prediction settles.
   * outcome 'WIN' = price hit target; 'LOSS' = stop loss triggered; 'SCRATCH' = breakeven.
   */
  public resolveDecision(
    cycleId: string,
    realized: { outcome: 'WIN' | 'LOSS' | 'SCRATCH'; finalPrice: number }
  ): boolean {
    let found = false
    this.entries = this.entries.map((e) => {
      if (e.id !== cycleId || e.resolved) return e
      found = true
      return {
        ...e,
        resolved: true,
        outcome: realized.outcome,
        finalPrice: realized.finalPrice,
        resolvedAt: Date.now(),
      }
    })
    if (found) saveToStorage(this.entries)
    return found
  }

  /** All entries (resolved and unresolved) */
  public getAllEntries(): AgentDecisionEntry[] {
    return [...this.entries]
  }

  /** Only entries that have an outcome — used by CalibrationModule */
  public getResolvedEntries(): AgentDecisionEntry[] {
    return this.entries.filter((e) => e.resolved && e.outcome !== undefined)
  }

  /** Resolved entries for a specific agent — filtered by botId across all cycles */
  public getEntriesByAgent(botId: string): AgentDecisionEntry[] {
    return this.getResolvedEntries().filter((e) =>
      e.agentVotes.some((v) => v.botId === botId)
    )
  }

  /** Count of resolved entries available for a specific agent */
  public resolvedCountForAgent(botId: string): number {
    return this.getEntriesByAgent(botId).length
  }

  /**
   * Inject synthetic historical entries for testing / seeding.
   * In production this should only be called from tests.
   */
  public seedEntries(entries: AgentDecisionEntry[]): void {
    this.entries = [...entries, ...this.entries].slice(-MAX_ENTRIES)
    saveToStorage(this.entries)
  }

  /** Wipe the log — for testing only */
  public clearAll(): void {
    this.entries = []
    saveToStorage(this.entries)
  }

  /** Total logged cycles (resolved + unresolved) */
  public totalCount(): number {
    return this.entries.length
  }

  /** Number of resolved cycles */
  public resolvedCount(): number {
    return this.entries.filter((e) => e.resolved).length
  }
}

export const agentDecisionLog = new AgentDecisionLogService()
