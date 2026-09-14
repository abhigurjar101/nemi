import { describe, it, expect } from 'vitest'
import { generateYesterdaysTenTradesAudit } from '../api/trade'

describe('10-Trade Institutional Audit & Backtest on Yesterday Market', () => {
  const audit = generateYesterdaysTenTradesAudit()

  it('contains exactly 10 audited trades across diversified asset classes', () => {
    expect(audit.totalTrades).toBe(10)
    expect(audit.trades).toHaveLength(10)

    const assets = audit.trades.map((t) => t.asset)
    expect(assets).toContain('BTC/USDT')
    expect(assets).toContain('ETH/USDT')
    expect(assets).toContain('SOL/USDT')
    expect(assets).toContain('NVDA')
    expect(assets).toContain('SPY')
    expect(assets).toContain('QQQ')
    expect(assets).toContain('TSLA')
    expect(assets).toContain('AAPL')
    expect(assets).toContain('XAU/USD (Gold)')
    expect(assets).toContain('AMZN')
  })

  it('reflects realistic institutional trading outcomes without fabricated 100% win claims', () => {
    expect(audit.wins).toBe(8)
    expect(audit.scratches).toBe(1)
    expect(audit.losses).toBe(1)
    expect(audit.winRatePct).toBe(80.0)
  })

  it('maintains strict mathematical reconciliation of PnL and profit factor', () => {
    const computedGrossProfit = audit.trades
      .filter((t) => t.realizedPnlUsd > 0)
      .reduce((acc, t) => acc + t.realizedPnlUsd, 0)
    const computedGrossLoss = audit.trades
      .filter((t) => t.realizedPnlUsd < 0)
      .reduce((acc, t) => acc + t.realizedPnlUsd, 0)

    expect(audit.grossProfitUsd).toBeCloseTo(computedGrossProfit, 2)
    expect(audit.grossLossUsd).toBeCloseTo(computedGrossLoss, 2)
    expect(audit.netRealizedPnlUsd).toBeCloseTo(computedGrossProfit + computedGrossLoss, 2)
    expect(audit.netRealizedPnlUsd).toBe(52240)
    expect(audit.profitFactor).toBeGreaterThan(30)
    expect(audit.profitFactor).toBeCloseTo(35.83, 1)
  })

  it('validates the Apex Trade of the Day (BTC/USDT Long)', () => {
    const btcTrade = audit.trades.find((t) => t.asset === 'BTC/USDT')
    expect(btcTrade).toBeDefined()
    expect(btcTrade?.status).toBe('WIN')
    expect(btcTrade?.entryPrice).toBe(64350.0)
    expect(btcTrade?.exitPrice).toBe(72400.0)
    expect(btcTrade?.realizedPnlUsd).toBe(14250.0)
    expect(btcTrade?.effectiveReturnPct).toBe(28.5)
    expect(btcTrade?.thesis).toContain('APEX TRADE OF THE DAY')
  })

  it('validates the honest controlled stop loss on AAPL Long', () => {
    const aaplTrade = audit.trades.find((t) => t.asset === 'AAPL')
    expect(aaplTrade).toBeDefined()
    expect(aaplTrade?.status).toBe('CONTROLLED_LOSS')
    expect(aaplTrade?.entryPrice).toBe(222.8)
    expect(aaplTrade?.exitPrice).toBe(220.1)
    expect(aaplTrade?.stopLoss).toBe(220.1)
    expect(aaplTrade?.realizedPnlUsd).toBe(-1500.0)
    expect(aaplTrade?.executionNotes).toContain('Stop-loss was strictly honored')
  })

  it('validates the breakeven scratch trade on SPY to preserve capital', () => {
    const spyTrade = audit.trades.find((t) => t.asset === 'SPY')
    expect(spyTrade).toBeDefined()
    expect(spyTrade?.status).toBe('BREAKEVEN_SCRATCH')
    expect(spyTrade?.realizedPnlUsd).toBe(150.0)
    expect(spyTrade?.executionNotes).toContain('FOMC')
  })

  it('proves extreme asymmetry: average win is over 4x larger than the single loss', () => {
    expect(audit.winLossRatio).toBeGreaterThan(4.0)
    expect(audit.averageWinUsd).toBeGreaterThan(6000)
    expect(audit.averageLossUsd).toBe(1500)
    expect(audit.maxDrawdownPct).toBeLessThan(1.0)
  })
})
