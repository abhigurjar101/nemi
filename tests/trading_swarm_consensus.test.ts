import { describe, it, expect } from 'vitest'
import {
  calculateSwarmConsensus,
  calculateAllIndicators,
  generateMockCandles,
  ALL_TRADING_BOTS,
  type TechnicalIndicators,
} from '../n8n/tradingBots'

describe('Trading Swarm Consensus & Multi-Agent Prediction Tests', () => {
  it('verifies all 10 trading bots are defined and configured with unique parameters', () => {
    expect(ALL_TRADING_BOTS).toHaveLength(10)
    const botIds = ALL_TRADING_BOTS.map((b) => b.id)
    const uniqueIds = new Set(botIds)
    expect(uniqueIds.size).toBe(10)

    for (const bot of ALL_TRADING_BOTS) {
      expect(bot.name).toBeTruthy()
      expect(bot.tradingCategory).toBeTruthy()
      expect(bot.riskProfile).toBeTruthy()
      expect(bot.defaultWebhook).toBeTruthy()
      expect(bot.targetAssets.length).toBeGreaterThan(0)
    }
  })

  it('generates a high-conviction BULLISH (BUY) consensus when indicators and momentum are positive', () => {
    const bullishCandles = generateMockCandles('BTC/USDT', 100, 60000, 'bullish')
    const indicators = calculateAllIndicators(bullishCandles)

    const consensus = calculateSwarmConsensus(
      'BTC/USDT',
      bullishCandles[bullishCandles.length - 1].close,
      100000,
      undefined,
      indicators,
      { change24h: 3.5, isLive: true }
    )

    expect(consensus.consensusAction).toBe('BUY')
    expect(consensus.winProbability).toBeGreaterThanOrEqual(0.70)
    expect(consensus.gatekeeperPassed).toBe(true)
    expect(consensus.takeProfit1).toBeGreaterThan(consensus.entryTarget)
    expect(consensus.stopLoss).toBeLessThan(consensus.entryTarget)

    const buyVotes = consensus.agentVotes.filter((v) => v.action === 'BUY')
    expect(buyVotes.length).toBeGreaterThanOrEqual(4)

    const techVote = consensus.agentVotes.find((v) => v.botId === 'technical-analyst')
    expect(techVote).toBeDefined()
    expect(techVote?.reasoning).toContain('RSI')
    expect(techVote?.reasoning).toContain('MACD')

    const sentVote = consensus.agentVotes.find((v) => v.botId === 'sentiment-trader')
    expect(sentVote).toBeDefined()
    expect(sentVote?.reasoning).toContain('+3.50%')
  })

  it('generates a BEARISH (SELL) consensus when indicators and momentum are negative', () => {
    const bearishCandles = generateMockCandles('ETH/USDT', 100, 3000, 'bearish')
    const indicators = calculateAllIndicators(bearishCandles)

    const consensus = calculateSwarmConsensus(
      'ETH/USDT',
      bearishCandles[bearishCandles.length - 1].close,
      100000,
      undefined,
      indicators,
      { change24h: -3.8, isLive: true }
    )

    expect(consensus.consensusAction).toBe('SELL')
    expect(consensus.winProbability).toBeGreaterThanOrEqual(0.70)
    expect(consensus.gatekeeperPassed).toBe(true)
    expect(consensus.takeProfit1).toBeLessThan(consensus.entryTarget)
    expect(consensus.stopLoss).toBeGreaterThan(consensus.entryTarget)

    const sellVotes = consensus.agentVotes.filter((v) => v.action === 'SELL')
    expect(sellVotes.length).toBeGreaterThanOrEqual(4)

    const sentVote = consensus.agentVotes.find((v) => v.botId === 'sentiment-trader')
    expect(sentVote).toBeDefined()
    expect(sentVote?.action).toBe('SELL')
    expect(sentVote?.reasoning).toContain('-3.80%')

    const smcVote = consensus.agentVotes.find((v) => v.botId === 'smc-liquidity')
    expect(smcVote?.action).toBe('SELL')
  })

  it('quotes exact calculated indicators rather than static hallucinations in reasonings', () => {
    const mockIndicators: TechnicalIndicators = {
      rsi: 28.5,
      macd: { macd: -15.2, signal: -18.4, hist: 3.2 },
      bollinger: { upper: 105, middle: 100, lower: 95, bandwidth: 10 },
      ema20: 98,
      ema50: 97,
      ema200: 90,
      atr: 2.5,
      supertrend: { value: 92, direction: 'up' },
    }

    const consensus = calculateSwarmConsensus(
      'SOL/USDT',
      99,
      100000,
      undefined,
      mockIndicators,
      { change24h: 1.8, isLive: true }
    )

    const techVote = consensus.agentVotes.find((v) => v.botId === 'technical-analyst')
    expect(techVote?.reasoning).toContain('28.5')
    expect(techVote?.reasoning).toContain('+3.20')
  })
})
