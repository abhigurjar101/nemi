/**
 * NEMI Cross-Agent Collaboration Round — Test Suite
 *
 * Verifies Part 1 requirements:
 * 1. Step 1: Initial votes collected as normal.
 * 2. Step 2: Orchestrator identifies genuine disagreements:
 *    - Directional splits (Alpha Generation + Structural & Flow)
 *    - High-confidence conflicts on same underlying data
 * 3. Step 3: Specific challenge questions directed to disagreeing agents.
 * 4. Step 4: Strict validation:
 *    - Revisions without cited evidence are rejected
 *    - Revisions cannot inflate confidence (scrutiny only reduces or maintains)
 *    - Agents do not arbitrarily flip direction without indicator support
 * 5. Step 5: Surviving disagreements are NOT hidden or forced to converge —
 *    preserved as explicit dissent in final output.
 * 6. Integration: calculateSwarmConsensus outputs collaborationRound audit.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AgentVote, TechnicalIndicators } from '../n8n/tradingBots/types'

// Mock localStorage for test environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

import {
  identifyDisagreements,
  generateChallenge,
  processRevision,
  runCollaborationRound,
  getRecentCollaborationRounds,
} from '../src/renderer/src/services/collaborationRound'
import { calculateSwarmConsensus } from '../n8n/tradingBots/engine'

describe('Part 1: Cross-Agent Collaboration Round', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  const sampleIndicators: TechnicalIndicators = {
    rsi: 30.5,
    macd: { macd: -4.2, signal: -5.0, hist: 0.8 },
    bollinger: { upper: 68000, middle: 65000, lower: 62000, bandwidth: 6.5 },
    ema20: 64800,
    ema50: 64200,
    ema200: 61000,
    atr: 1250,
    supertrend: { value: 63500, direction: 'up' },
  }

  it('identifies DIRECTIONAL_SPLIT when directional agents split on BUY vs SELL', () => {
    const votes: AgentVote[] = [
      {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY',
        weight: 0.2,
        confidence: 84,
        reasoning: 'Bullish confluence: RSI 30.5, MACD Hist +0.80',
      },
      {
        botId: 'smc-liquidity',
        botName: 'SMC & ICT Liquidity Hunter',
        action: 'SELL',
        weight: 0.2,
        confidence: 86,
        reasoning: 'Bearish Order Block rejection at structural low',
      },
      {
        botId: 'sentiment-trader',
        botName: 'Sentiment & News Intelligence',
        action: 'HOLD',
        weight: 0.15,
        confidence: 70,
        reasoning: 'Sentiment neutral at baseline',
      },
    ]

    const disagreements = identifyDisagreements(votes)
    expect(disagreements.length).toBe(1)
    expect(disagreements[0].conflictType).toBe('DIRECTIONAL_SPLIT')
    expect(disagreements[0].agentA.botId).toBe('technical-analyst')
    expect(disagreements[0].agentB.botId).toBe('smc-liquidity')
  })

  it('identifies HIGH_CONFIDENCE_CONFLICT between two high-confidence agents (>= 80%)', () => {
    const votes: AgentVote[] = [
      {
        botId: 'arbitrage-funding',
        botName: 'Arbitrage & Funding Exploiter',
        action: 'BUY',
        weight: 0.1,
        confidence: 82,
        reasoning: 'Negative funding rate short-squeeze asymmetry',
      },
      {
        botId: 'macro-regime',
        botName: 'Macro Regime & Fed Watchdog',
        action: 'SELL',
        weight: 0.1,
        confidence: 85,
        reasoning: 'Risk-off defensive posture with dollar strength',
      },
    ]

    const disagreements = identifyDisagreements(votes)
    expect(disagreements.length).toBe(1)
    expect(disagreements[0].conflictType).toBe('HIGH_CONFIDENCE_CONFLICT')
  })

  it('does NOT flag disagreement when agents agree or one agent holds', () => {
    const votes: AgentVote[] = [
      {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY',
        weight: 0.2,
        confidence: 84,
        reasoning: 'RSI oversold bounce',
      },
      {
        botId: 'smc-liquidity',
        botName: 'SMC & ICT Liquidity Hunter',
        action: 'BUY',
        weight: 0.2,
        confidence: 86,
        reasoning: 'Bullish FVG fill',
      },
      {
        botId: 'sentiment-trader',
        botName: 'Sentiment Trader',
        action: 'HOLD',
        weight: 0.15,
        confidence: 70,
        reasoning: 'Consolidating',
      },
    ]

    const disagreements = identifyDisagreements(votes)
    expect(disagreements.length).toBe(0)
  })

  it('generates targeted challenge questions demanding specific data points', () => {
    const disagreement = {
      agentA: {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY' as const,
        confidence: 84,
        reasoning: 'RSI at 30.5 oversold reversal',
      },
      agentB: {
        botId: 'smc-liquidity',
        botName: 'SMC & ICT Liquidity Hunter',
        action: 'SELL' as const,
        confidence: 86,
        reasoning: 'Bearish Order Block rejection at $65200',
      },
      conflictType: 'DIRECTIONAL_SPLIT' as const,
      description: 'Technical BUY vs SMC SELL',
    }

    const challenge = generateChallenge(disagreement, sampleIndicators)
    expect(challenge.challengeToA).toContain('Technical Analysis Agent')
    expect(challenge.challengeToA).toContain('SMC & ICT Liquidity Hunter')
    expect(challenge.challengeToA).toContain('What specific data point')
    expect(challenge.challengeToB).toContain('Technical Analysis Agent')
    expect(challenge.challengeToB).toContain('What specific data point')
  })

  it('rejects any revision that lacks a specific cited reason', () => {
    const disagreement = {
      agentA: {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY' as const,
        confidence: 74,
        reasoning: 'RSI at 48 neutral',
      },
      agentB: {
        botId: 'volume-breakout',
        botName: 'Volume Breakout Hunter',
        action: 'SELL' as const,
        confidence: 72,
        reasoning: 'Volume distribution breakdown',
      },
      conflictType: 'DIRECTIONAL_SPLIT' as const,
      description: 'Technical vs Volume',
    }

    const challenge = generateChallenge(disagreement)
    const currentVotes: AgentVote[] = [
      {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY',
        weight: 0.2,
        confidence: 74,
        reasoning: 'RSI at 48 neutral',
      },
    ]

    // Without indicator contradiction surfaced, the agent maintains position
    const revision = processRevision(challenge, 'technical-analyst', currentVotes)
    // Should not be a valid revision without specific evidence
    expect(revision.isValid).toBe(false)
  })

  it('enforces that confidence can only be reduced or maintained, never inflated', () => {
    const votes: AgentVote[] = [
      {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY',
        weight: 0.2,
        confidence: 84,
        reasoning: 'RSI 30.5, MACD Hist +0.80',
      },
      {
        botId: 'smc-liquidity',
        botName: 'SMC & ICT Liquidity Hunter',
        action: 'SELL',
        weight: 0.2,
        confidence: 86,
        reasoning: 'Bearish Order Block rejection',
      },
    ]

    const round = runCollaborationRound(votes, 'BTC/USDT', sampleIndicators, { change24h: 0.2 })

    for (const postVote of round.postCollaborationVotes) {
      const preVote = votes.find((v) => v.botId === postVote.botId)!
      expect(postVote.confidence).toBeLessThanOrEqual(preVote.confidence)
    }
  })

  it('preserves surviving disagreements as explicit dissent in final output', () => {
    const votes: AgentVote[] = [
      {
        botId: 'technical-analyst',
        botName: 'Technical Analysis Agent',
        action: 'BUY',
        weight: 0.2,
        confidence: 84,
        reasoning: 'RSI at 30.5 oversold bounce',
      },
      {
        botId: 'smc-liquidity',
        botName: 'SMC & ICT Liquidity Hunter',
        action: 'SELL',
        weight: 0.2,
        confidence: 86,
        reasoning: 'Order Block rejection at $65200',
      },
    ]

    const round = runCollaborationRound(votes, 'BTC/USDT', sampleIndicators, { change24h: 0.1 })
    // Disagreements that survived scrutiny are NOT suppressed
    expect(round.survivingDissents.length).toBeGreaterThan(0)
    expect(round.survivingDissents[0].agentA.action).not.toBe(round.survivingDissents[0].agentB.action)
  })

  it('integrates seamlessly with calculateSwarmConsensus returning full audit trail', () => {
    const customVotes = {
      'technical-analyst': { action: 'BUY' as const, confidence: 84, reasoning: 'RSI oversold at 29' },
      'smc-liquidity': { action: 'SELL' as const, confidence: 86, reasoning: 'Order block rejection' },
    }

    const consensus = calculateSwarmConsensus(
      'BTC/USDT',
      64000,
      100000,
      customVotes,
      sampleIndicators,
      { change24h: 0.1, isLive: true }
    )

    expect(consensus.collaborationRound).toBeDefined()
    expect(consensus.collaborationRound?.ticker).toBe('BTC/USDT')
    expect(consensus.collaborationRound?.preCollaborationVotes.length).toBe(7)
    expect(consensus.collaborationRound?.postCollaborationVotes.length).toBe(7)
    // Saved in history
    const recentRounds = getRecentCollaborationRounds(5)
    expect(recentRounds.length).toBeGreaterThan(0)
  })
})
