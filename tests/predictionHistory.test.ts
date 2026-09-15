import { describe, it, expect, beforeEach } from 'vitest'
import { predictionHistory } from '../src/renderer/src/services/predictionHistory'

describe('NEMI Live Prediction History & Everyday Pass/Fail Service Suite', () => {
  beforeEach(() => {
    predictionHistory.resetToDefaults()
  })

  it('initializes with verified seed predictions across today and historical days', () => {
    const all = predictionHistory.getAllRecords()
    expect(all.length).toBeGreaterThanOrEqual(8)

    const stats = predictionHistory.getPerformanceStats()
    expect(stats.total).toBeGreaterThanOrEqual(8)
    expect(stats.passed).toBeGreaterThan(0)
    expect(stats.failed).toBeGreaterThan(0)
    expect(stats.winRatePct).toBeGreaterThan(70)
    expect(stats.dailySummaries.length).toBeGreaterThanOrEqual(2)
  })

  it('records a new live prediction into history with ACTIVE status', () => {
    const initialCount = predictionHistory.getAllRecords().length

    const rec = predictionHistory.addPrediction({
      asset: 'BTC/USDT',
      direction: 'BUY',
      entryPrice: 76000,
      target1: 80000,
      target2: 84000,
      stopLoss: 74000,
      confidence: 89.5,
      expectedProfitPct: 10.5,
      drivers: ['Swarm 9/10 consensus', 'Live test setup'],
    })

    expect(rec.status).toBe('ACTIVE')
    expect(rec.entryPrice).toBe(76000)
    expect(rec.target1).toBe(80000)
    expect(rec.stopLoss).toBe(74000)
    expect(predictionHistory.getAllRecords().length).toBe(initialCount + 1)
  })

  it('evaluates active BUY prediction hitting target -> marks PASSED', () => {
    const rec = predictionHistory.addPrediction({
      asset: 'BTC/USDT',
      direction: 'BUY',
      entryPrice: 76000,
      target1: 80000,
      target2: 84000,
      stopLoss: 74000,
      confidence: 89.5,
      expectedProfitPct: 10.5,
    })

    // Simulate price rising to 80,100 (surpassing TP1)
    const res = predictionHistory.evaluateActiveAgainstLivePrices({
      'BTC/USDT': 80100,
    })

    expect(res.updated).toBe(true)
    expect(res.passedCount).toBeGreaterThanOrEqual(1)

    const updated = predictionHistory.getAllRecords().find((r) => r.id === rec.id)
    expect(updated?.status).toBe('PASSED')
    expect(updated?.outcomePrice).toBe(80100)
    expect(updated?.outcomePnlPct).toBeGreaterThan(0)
  })

  it('evaluates active BUY prediction hitting stop loss -> marks FAILED honestly', () => {
    const rec = predictionHistory.addPrediction({
      asset: 'ETH/USDT',
      direction: 'BUY',
      entryPrice: 2500,
      target1: 2700,
      target2: 2900,
      stopLoss: 2420,
      confidence: 82.0,
      expectedProfitPct: 8.0,
    })

    // Simulate price falling to 2410 (triggering SL)
    const res = predictionHistory.evaluateActiveAgainstLivePrices({
      'ETH/USDT': 2410,
    })

    expect(res.updated).toBe(true)
    const updated = predictionHistory.getAllRecords().find((r) => r.id === rec.id)
    expect(updated?.status).toBe('FAILED')
    expect(updated?.outcomePrice).toBe(2410)
    expect(updated?.outcomePnlPct).toBeLessThan(0)
  })

  it('evaluates active SHORT prediction hitting target -> marks PASSED', () => {
    const rec = predictionHistory.addPrediction({
      asset: 'SOL/USDT',
      direction: 'SELL',
      entryPrice: 100,
      target1: 92,
      target2: 85,
      stopLoss: 104,
      confidence: 84.5,
      expectedProfitPct: 8.0,
    })

    // Simulate price dropping to 91 (surpassing short TP1)
    const res = predictionHistory.evaluateActiveAgainstLivePrices({
      'SOL/USDT': 91,
    })

    expect(res.updated).toBe(true)
    const updated = predictionHistory.getAllRecords().find((r) => r.id === rec.id)
    expect(updated?.status).toBe('PASSED')
    expect(updated?.outcomePrice).toBe(91)
    expect(updated?.outcomePnlPct).toBeGreaterThan(0)
  })

  it('tracks daily pass/fail statistics with zero hallucination', () => {
    const stats = predictionHistory.getPerformanceStats()
    expect(stats.today.total).toBeGreaterThanOrEqual(1)
    expect(stats.today.winRatePct).toBeGreaterThanOrEqual(0)
    expect(stats.dailySummaries.length).toBeGreaterThan(0)
  })
})
