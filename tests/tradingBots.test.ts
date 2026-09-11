import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  ALL_TRADING_BOTS,
  getTradingBotById,
  compileTradingBotPrompt,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateSupertrend,
  calculateAllIndicators,
  detectFVG,
  detectOrderBlocks,
  calculatePairsZScore,
  calculateKellyPositionSize,
  calculateParametricVaR,
  runRiskAudit,
  calculateSwarmConsensus,
  runStrategyBacktest,
  generateMockCandles,
  type MarketDataCandle,
} from '../n8n/tradingBots'

describe('NEMI 10 Elite Algorithmic & AI Trading Agents Fleet', () => {
  describe('1. Trading Fleet Registry & Metadata Verification', () => {
    it('contains all 10 elite quantitative trading specialist agents', () => {
      expect(ALL_TRADING_BOTS.length).toBe(10)

      const expectedIds = [
        'sentiment-trader',
        'technical-analyst',
        'smc-liquidity',
        'volumeBreakout' ? 'volume-breakout' : '',
        'fundamental-valuation',
        'arbitrage-funding',
        'statistical-arbitrage',
        'macro-regime',
        'risk-sentinel',
        'trading-orchestrator',
      ]

      for (const id of expectedIds) {
        const bot = getTradingBotById(id)
        expect(bot).toBeDefined()
        expect(bot.id).toBe(id)
        expect(bot.name).toBeTruthy()
        expect(bot.shortName).toBeTruthy()
        expect(bot.icon).toBeTruthy()
        expect(bot.category).toBeTruthy()
        expect(bot.tradingCategory).toBeTruthy()
        expect(bot.riskProfile).toBeTruthy()
        expect(bot.targetAssets.length).toBeGreaterThan(0)
        expect(bot.timeframes.length).toBeGreaterThan(0)
        expect(bot.supportedExchanges.length).toBeGreaterThan(0)
        expect(bot.defaultWebhook.startsWith('trading/')).toBe(true)
        expect(bot.directive.length).toBeGreaterThan(100)
        expect(bot.samplePrompts.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('ensures each trading bot has a unique ID and unique webhook path', () => {
      const ids = ALL_TRADING_BOTS.map((b) => b.id)
      const webhooks = ALL_TRADING_BOTS.map((b) => b.defaultWebhook)

      expect(new Set(ids).size).toBe(ALL_TRADING_BOTS.length)
      expect(new Set(webhooks).size).toBe(ALL_TRADING_BOTS.length)
    })

    it('compiles an institutional quantitative prompt enforcing zero placeholders and capital preservation', () => {
      const prompt = compileTradingBotPrompt('trading-orchestrator')
      expect(prompt).toContain('Autonomous Hedge Fund Consensus Swarm Master')
      expect(prompt).toContain('ZERO TRIVIAL COMMENTS')
      expect(prompt).toContain('ZERO PLACEHOLDERS')
      expect(prompt).toContain('CAPITAL PRESERVATION')
    })
  })

  describe('2. Official n8n Workflow JSON Schema Validation', () => {
    it('verifies that all 10 trading bot workflow files exist and contain valid n8n v1/v2 schemas', () => {
      const workflowsDir = path.join(__dirname, '../n8n/workflows/trading')
      expect(fs.existsSync(workflowsDir)).toBe(true)

      for (const bot of ALL_TRADING_BOTS) {
        const filePath = path.join(workflowsDir, `${bot.id}.workflow.json`)
        expect(fs.existsSync(filePath)).toBe(true)

        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)

        expect(json.name).toContain('NEMI Trading')
        expect(json.active).toBe(true)
        expect(Array.isArray(json.nodes)).toBe(true)
        expect(json.nodes.length).toBeGreaterThanOrEqual(4)
        expect(json.meta?.botId).toBe(bot.id)

        // Webhook trigger node exists with exact path
        const webhookNode = json.nodes.find((n: any) => n.type === 'n8n-nodes-base.webhook')
        expect(webhookNode).toBeDefined()
        expect(webhookNode.parameters.path).toBe(bot.defaultWebhook)

        // Connections and settings exist
        expect(json.connections).toBeDefined()
        expect(json.settings.executionOrder).toBe('v1')
      }
    })
  })

  describe('3. Mathematical Indicator Engine', () => {
    it('computes Exponential Moving Average (EMA) with exact recurrence weighting', () => {
      const prices = [10, 11, 12, 13, 14, 15]
      const ema3 = calculateEMA(prices, 3)
      expect(ema3.length).toBe(prices.length)
      expect(ema3[0]).toBe(10)
      expect(ema3[ema3.length - 1]).toBeGreaterThan(13)
    })

    it('calculates Relative Strength Index (RSI) bounded in [0, 100]', () => {
      const upPrices = Array.from({ length: 30 }, (_, i) => 100 + i * 2)
      const rsiHigh = calculateRSI(upPrices, 14)
      expect(rsiHigh).toBeGreaterThan(80)

      const downPrices = Array.from({ length: 30 }, (_, i) => 200 - i * 2)
      const rsiLow = calculateRSI(downPrices, 14)
      expect(rsiLow).toBeLessThan(20)
    })

    it('calculates MACD line, signal line, and histogram', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 50 + Math.sin(i) * 5 + i * 0.5)
      const macd = calculateMACD(prices, 12, 26, 9)
      expect(typeof macd.macd).toBe('number')
      expect(typeof macd.signal).toBe('number')
      expect(typeof macd.hist).toBe('number')
      expect(macd.hist).toBeCloseTo(macd.macd - macd.signal, 1)
    })

    it('calculates Bollinger Bands with proper standard deviation bounds', () => {
      const prices = Array.from({ length: 30 }, () => 100)
      const flatBands = calculateBollingerBands(prices, 20, 2.0)
      expect(flatBands.middle).toBe(100)
      expect(flatBands.upper).toBe(100)
      expect(flatBands.lower).toBe(100)

      const volatile = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 110 : 90))
      const bands = calculateBollingerBands(volatile, 20, 2.0)
      expect(bands.upper).toBeGreaterThan(bands.middle)
      expect(bands.lower).toBeLessThan(bands.middle)
      expect(bands.bandwidth).toBeGreaterThan(0)
    })

    it('calculates Average True Range (ATR) and Supertrend', () => {
      const highs = [105, 106, 107, 108, 107, 109, 110, 112, 111, 113, 114, 115, 116, 117, 118]
      const lows = [95, 96, 97, 98, 97, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108]
      const closes = [100, 102, 104, 101, 105, 106, 108, 109, 110, 111, 112, 113, 114, 115, 116]

      const atr = calculateATR(highs, lows, closes, 14)
      expect(atr).toBeGreaterThan(0)

      const supertrend = calculateSupertrend(highs, lows, closes, 10, 3.0)
      expect(['up', 'down']).toContain(supertrend.direction)
    })

    it('calculates all technical indicators simultaneously on candle stream', () => {
      const candles = generateMockCandles('BTC/USDT', 50, 60000, 'bullish')
      const indicators = calculateAllIndicators(candles)

      expect(indicators.rsi).toBeGreaterThanOrEqual(0)
      expect(indicators.rsi).toBeLessThanOrEqual(100)
      expect(indicators.bollinger.upper).toBeGreaterThan(indicators.bollinger.lower)
      expect(indicators.ema20).toBeGreaterThan(0)
      expect(indicators.ema50).toBeGreaterThan(0)
      expect(indicators.ema200).toBeGreaterThan(0)
      expect(indicators.atr).toBeGreaterThan(0)
    })
  })

  describe('4. Smart Money Concepts (SMC) & Liquidity Detection', () => {
    it('detects Bullish and Bearish Fair Value Gaps (FVG)', () => {
      const candles: MarketDataCandle[] = [
        { timestamp: 1, open: 100, high: 102, low: 99, close: 101, volume: 100 },
        { timestamp: 2, open: 101, high: 110, low: 101, close: 109, volume: 300 }, // Impulse candle
        { timestamp: 3, open: 109, high: 112, low: 105, close: 111, volume: 150 }, // Low (105) > C1 High (102) -> Bullish FVG
      ]

      const fvgs = detectFVG(candles)
      expect(fvgs.length).toBeGreaterThan(0)
      const bullishFvg = fvgs.find((p) => p.direction === 'bullish')
      expect(bullishFvg).toBeDefined()
      expect(bullishFvg?.bottom).toBe(102)
      expect(bullishFvg?.top).toBe(105)
    })

    it('detects Institutional Order Blocks (OB)', () => {
      const candles: MarketDataCandle[] = [
        { timestamp: 1, open: 100, high: 102, low: 99, close: 101, volume: 100 },
        { timestamp: 2, open: 101, high: 103, low: 98, close: 99, volume: 120 },
        { timestamp: 3, open: 99, high: 100, low: 96, close: 97, volume: 150 },
        { timestamp: 4, open: 97, high: 98, low: 94, close: 95, volume: 200 }, // Prior bearish candle
        { timestamp: 5, open: 95, high: 105, low: 95, close: 104, volume: 800 }, // Strong impulse breakout
      ]

      const obs = detectOrderBlocks(candles)
      expect(obs.length).toBeGreaterThan(0)
      const bullishOb = obs.find((p) => p.direction === 'bullish')
      expect(bullishOb).toBeDefined()
      expect(bullishOb?.bottom).toBe(94)
    })
  })

  describe('5. Statistical Arbitrage & Pairs Trading Math', () => {
    it('calculates Z-score and identifies mean-reversion divergence', () => {
      const seriesA = [100, 102, 101, 103, 102, 104, 103, 105, 104, 125] // sudden surge in A
      const seriesB = [50, 51, 50.5, 51.5, 51, 52, 51.5, 52.5, 52, 52]

      const res = calculatePairsZScore(seriesA, seriesB, 10)
      expect(res.zScore).toBeGreaterThan(1.5)
      expect(typeof res.ratio).toBe('number')
      expect(typeof res.meanRatio).toBe('number')
    })
  })

  describe('6. Portfolio Risk Sentinel & Sizing Math', () => {
    it('calculates safe Fractional Kelly Criterion position sizing', () => {
      const { recommendedSizeUsd, kellyFraction } = calculateKellyPositionSize(
        0.6, // 60% win rate
        2.0, // 1:2 RR
        100000, // $100k portfolio
        0.25 // Quarter-Kelly
      )

      // Full Kelly: (0.6 * 2 - 0.4) / 2 = (1.2 - 0.4) / 2 = 0.40 (40%)
      // Quarter Kelly: 40% * 0.25 = 10% -> $10,000
      expect(kellyFraction).toBe(10)
      expect(recommendedSizeUsd).toBe(10000)
    })

    it('calculates 99% Parametric Value at Risk (VaR)', () => {
      const var99 = calculateParametricVaR(100000, 0.02, 0.99)
      // 100000 * 0.02 * 2.326 = ~4652
      expect(var99).toBeGreaterThan(4600)
      expect(var99).toBeLessThan(4700)
    })

    it('triggers circuit breaker when daily drawdown hits or exceeds 3.0%', () => {
      const safeAudit = runRiskAudit(5000, 100000, 0.58, 2.0, 1.2)
      expect(safeAudit.approved).toBe(true)
      expect(safeAudit.circuitBreakerTriggered).toBe(false)

      const haltAudit = runRiskAudit(5000, 100000, 0.58, 2.0, 3.2)
      expect(haltAudit.approved).toBe(false)
      expect(haltAudit.approvedSizeUsd).toBe(0)
      expect(haltAudit.circuitBreakerTriggered).toBe(true)
      expect(haltAudit.reason).toContain('CIRCUIT BREAKER TRIGGERED')
    })

    it('strictly rejects trades where win probability is below 70% threshold', () => {
      const rejectedAudit = runRiskAudit(5000, 100000, 0.65, 2.0, 0.5, 0.70)
      expect(rejectedAudit.approved).toBe(false)
      expect(rejectedAudit.approvedSizeUsd).toBe(0)
      expect(rejectedAudit.reason).toContain('RISK GATEKEEPER REJECTED')
      expect(rejectedAudit.reason).toContain('70%')

      const approvedAudit = runRiskAudit(5000, 100000, 0.75, 2.0, 0.5, 0.70)
      expect(approvedAudit.approved).toBe(true)
      expect(approvedAudit.approvedSizeUsd).toBeGreaterThan(0)
    })
  })

  describe('7. Multi-Agent Bayesian Consensus Engine', () => {
    it('synthesizes specialist votes into a unified trade execution directive', () => {
      const consensus = calculateSwarmConsensus('BTC/USDT', 64500, 100000)

      expect(['BUY', 'SELL', 'HOLD']).toContain(consensus.consensusAction)
      expect(consensus.overallConfidence).toBeGreaterThanOrEqual(50)
      expect(consensus.winProbability).toBeGreaterThanOrEqual(0.70)
      expect(consensus.isHighConviction).toBe(true)
      expect(consensus.gatekeeperPassed).toBe(true)
      expect(consensus.entryTarget).toBe(64500)
      expect(consensus.stopLoss).toBeLessThan(consensus.entryTarget)
      expect(consensus.takeProfit1).toBeGreaterThan(consensus.entryTarget)
      expect(consensus.takeProfit2).toBeGreaterThan(consensus.takeProfit1)
      expect(consensus.agentVotes.length).toBe(7)
      expect(consensus.riskAudit.approved).toBe(true)
    })

    it('strictly forces consensus to HOLD when win probability does not meet 70% threshold', () => {
      // Conflicting votes: 1 buy, 2 sell, low confidence
      const conflictingVotes = {
        'technical-analyst': { action: 'BUY' as const, confidence: 52 },
        'sentiment-trader': { action: 'SELL' as const, confidence: 60 },
        'fundamental-valuation': { action: 'SELL' as const, confidence: 55 },
      }
      const consensus = calculateSwarmConsensus('ETH/USDT', 3200, 100000, conflictingVotes)

      expect(consensus.winProbability).toBeLessThan(0.70)
      expect(consensus.gatekeeperPassed).toBe(false)
      expect(consensus.isHighConviction).toBe(false)
      expect(consensus.consensusAction).toBe('HOLD')
    })
  })

  describe('8. Strategy Backtest Engine', () => {
    it('runs backtest simulation generating realistic trade statistics and equity curve', () => {
      const candles = generateMockCandles('BTC/USDT', 80, 50000, 'bullish')
      const result = runStrategyBacktest(candles, 100000)

      expect(result.totalTrades).toBeGreaterThanOrEqual(0)
      expect(result.equityCurve.length).toBeGreaterThan(0)
      expect(result.equityCurve[0].equity).toBe(100000)
      expect(typeof result.winRate).toBe('number')
      expect(typeof result.totalReturnPercent).toBe('number')
      expect(typeof result.maxDrawdownPercent).toBe('number')
    })
  })

  describe('9. AST Validation on Trading Bots Code', () => {
    it('validates clean Python trading execution code', () => {
      const code = `
import ccxt

class OrderDispatcher:
    def __init__(self, exchange_id='binance'):
        self.exchange = getattr(ccxt, exchange_id)()

    def create_bracket_order(self, symbol: str, side: str, amount: float):
        return {"symbol": symbol, "side": side, "amount": amount}

if __name__ == '__main__':
    dispatcher = OrderDispatcher()
    res = dispatcher.create_bracket_order('BTC/USDT', 'buy', 0.1)
    print("Order:", res)
`
      const bot = getTradingBotById('trading-orchestrator')
      const val = bot.validateCode?.(code)
      expect(val?.valid).toBe(true)
      expect(val?.balancedDelimiters).toBe(true)
      expect(val?.detectedClasses).toContain('OrderDispatcher')
    })
  })
})
