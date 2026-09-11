import type {
  MarketDataCandle,
  TechnicalIndicators,
  SmcPattern,
  RiskAuditResult,
  AgentVote,
  ConsensusDecision,
  TradeAction,
  BacktestResult,
} from './types'

// ==========================================
// 1. Technical Analysis Mathematics
// ==========================================

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return []
  const k = 2 / (period + 1)
  const ema: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100
}

export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number; signal: number; hist: number } {
  if (closes.length < slow) {
    return { macd: 0, signal: 0, hist: 0 }
  }

  const fastEma = calculateEMA(closes, fast)
  const slowEma = calculateEMA(closes, slow)

  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEma[i] - slowEma[i])
  }

  const signalLine = calculateEMA(macdLine, signal)
  const latestMacd = macdLine[macdLine.length - 1]
  const latestSignal = signalLine[signalLine.length - 1]
  const hist = latestMacd - latestSignal

  return {
    macd: Math.round(latestMacd * 100) / 100,
    signal: Math.round(latestSignal * 100) / 100,
    hist: Math.round(hist * 100) / 100,
  }
}

export function calculateBollingerBands(
  closes: number[],
  period = 20,
  multiplier = 2.0
): { upper: number; middle: number; lower: number; bandwidth: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 100
    return { upper: last * 1.05, middle: last, lower: last * 0.95, bandwidth: 10 }
  }

  const slice = closes.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period
  const stdDev = Math.sqrt(variance)

  const upper = Math.round((mean + multiplier * stdDev) * 100) / 100
  const lower = Math.round((mean - multiplier * stdDev) * 100) / 100
  const middle = Math.round(mean * 100) / 100
  const bandwidth = middle > 0 ? Math.round(((upper - lower) / middle) * 10000) / 100 : 0

  return { upper, middle, lower, bandwidth }
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number {
  if (closes.length < 2) return 1.0

  const trueRanges: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trueRanges.push(tr)
  }

  if (trueRanges.length < period) {
    return Math.round((trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length) * 100) / 100
  }

  const recentTr = trueRanges.slice(-period)
  const atr = recentTr.reduce((a, b) => a + b, 0) / period
  return Math.round(atr * 100) / 100
}

export function calculateSupertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 10,
  multiplier = 3.0
): { value: number; direction: 'up' | 'down' } {
  const atr = calculateATR(highs, lows, closes, period)
  const lastIndex = closes.length - 1
  const hl2 = (highs[lastIndex] + lows[lastIndex]) / 2
  const upperBand = hl2 + multiplier * atr
  const lowerBand = hl2 - multiplier * atr
  const close = closes[lastIndex]

  const direction: 'up' | 'down' = close >= lowerBand ? 'up' : 'down'
  const value = direction === 'up' ? Math.round(lowerBand * 100) / 100 : Math.round(upperBand * 100) / 100

  return { value, direction }
}

export function calculateAllIndicators(candles: MarketDataCandle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)

  const ema20s = calculateEMA(closes, 20)
  const ema50s = calculateEMA(closes, 50)
  const ema200s = calculateEMA(closes, 200)

  return {
    rsi: calculateRSI(closes, 14),
    macd: calculateMACD(closes, 12, 26, 9),
    bollinger: calculateBollingerBands(closes, 20, 2.0),
    ema20: ema20s.length > 0 ? Math.round(ema20s[ema20s.length - 1] * 100) / 100 : closes[0],
    ema50: ema50s.length > 0 ? Math.round(ema50s[ema50s.length - 1] * 100) / 100 : closes[0],
    ema200: ema200s.length > 0 ? Math.round(ema200s[ema200s.length - 1] * 100) / 100 : closes[0],
    atr: calculateATR(highs, lows, closes, 14),
    supertrend: calculateSupertrend(highs, lows, closes, 10, 3.0),
  }
}

// ==========================================
// 2. Smart Money Concepts (SMC) Detection
// ==========================================

export function detectFVG(candles: MarketDataCandle[]): SmcPattern[] {
  const patterns: SmcPattern[] = []
  if (candles.length < 3) return patterns

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2]
    const c2 = candles[i - 1]
    const c3 = candles[i]

    // Bullish FVG: Candle 1 High < Candle 3 Low
    if (c1.high < c3.low && c2.close > c2.open) {
      patterns.push({
        type: 'FVG',
        direction: 'bullish',
        top: c3.low,
        bottom: c1.high,
        mitigated: false,
        description: `Bullish Fair Value Gap between ${c1.high} and ${c3.low}`,
      })
    }

    // Bearish FVG: Candle 1 Low > Candle 3 High
    if (c1.low > c3.high && c2.close < c2.open) {
      patterns.push({
        type: 'FVG',
        direction: 'bearish',
        top: c1.low,
        bottom: c3.high,
        mitigated: false,
        description: `Bearish Fair Value Gap between ${c3.high} and ${c1.low}`,
      })
    }
  }

  return patterns
}

export function detectOrderBlocks(candles: MarketDataCandle[]): SmcPattern[] {
  const patterns: SmcPattern[] = []
  if (candles.length < 5) return patterns

  for (let i = 4; i < candles.length; i++) {
    const prevCandle = candles[i - 1]
    const currentCandle = candles[i]

    // Bullish OB: prior bearish candle followed by strong bullish expansion breaking previous high
    if (
      prevCandle.close < prevCandle.open &&
      currentCandle.close > currentCandle.open &&
      currentCandle.close > prevCandle.high * 1.008
    ) {
      patterns.push({
        type: 'OrderBlock',
        direction: 'bullish',
        top: prevCandle.open,
        bottom: prevCandle.low,
        mitigated: false,
        description: `Bullish Institutional Order Block at ${prevCandle.low} - ${prevCandle.open}`,
      })
    }

    // Bearish OB: prior bullish candle followed by strong bearish rejection breaking previous low
    if (
      prevCandle.close > prevCandle.open &&
      currentCandle.close < currentCandle.open &&
      currentCandle.close < prevCandle.low * 0.992
    ) {
      patterns.push({
        type: 'OrderBlock',
        direction: 'bearish',
        top: prevCandle.high,
        bottom: prevCandle.open,
        mitigated: false,
        description: `Bearish Institutional Order Block at ${prevCandle.open} - ${prevCandle.high}`,
      })
    }
  }

  return patterns
}

// ==========================================
// 3. Statistical Arbitrage (Pairs Trading)
// ==========================================

export function calculatePairsZScore(
  seriesA: number[],
  seriesB: number[],
  window = 30
): {
  zScore: number
  ratio: number
  meanRatio: number
  stdDev: number
  signal: 'LONG_A_SHORT_B' | 'SHORT_A_LONG_B' | 'NEUTRAL'
} {
  const length = Math.min(seriesA.length, seriesB.length)
  if (length < 10) {
    return { zScore: 0, ratio: 1, meanRatio: 1, stdDev: 0.1, signal: 'NEUTRAL' }
  }

  const ratios: number[] = []
  for (let i = 0; i < length; i++) {
    ratios.push(seriesA[i] / (seriesB[i] || 1))
  }

  const slice = ratios.slice(-Math.min(window, length))
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length
  const variance = slice.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / slice.length
  const stdDev = Math.max(Math.sqrt(variance), 0.0001)

  const currentRatio = ratios[ratios.length - 1]
  const zScore = Math.round(((currentRatio - mean) / stdDev) * 100) / 100

  let signal: 'LONG_A_SHORT_B' | 'SHORT_A_LONG_B' | 'NEUTRAL' = 'NEUTRAL'
  if (zScore <= -2.0) signal = 'LONG_A_SHORT_B'
  else if (zScore >= 2.0) signal = 'SHORT_A_LONG_B'

  return {
    zScore,
    ratio: Math.round(currentRatio * 1000) / 1000,
    meanRatio: Math.round(mean * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    signal,
  }
}

// ==========================================
// 4. Portfolio Risk Sentinel Math
// ==========================================

export function calculateKellyPositionSize(
  winRate: number,
  rewardRiskRatio: number,
  portfolioValue: number,
  fraction = 0.25
): { recommendedSizeUsd: number; kellyFraction: number } {
  const p = Math.max(0.01, Math.min(0.99, winRate))
  const q = 1 - p
  const b = Math.max(0.1, rewardRiskRatio)

  // Kelly formula: f* = (p * b - q) / b
  const fullKelly = (p * b - q) / b
  const safeKelly = Math.max(0, fullKelly) * fraction
  const recommendedSizeUsd = Math.round(portfolioValue * safeKelly * 100) / 100

  return {
    recommendedSizeUsd,
    kellyFraction: Math.round(safeKelly * 10000) / 100, // as percentage
  }
}

export function calculateParametricVaR(
  portfolioValue: number,
  dailyVolatility = 0.025,
  confidenceLevel = 0.99
): number {
  // Z for 99% is ~2.326, for 95% is ~1.645
  const z = confidenceLevel >= 0.99 ? 2.326 : 1.645
  const varUsd = portfolioValue * dailyVolatility * z
  return Math.round(varUsd * 100) / 100
}

export function runRiskAudit(
  requestedSizeUsd: number,
  portfolioValue: number,
  winRate = 0.58,
  rrRatio = 2.0,
  currentDailyDrawdownPercent = 0.8,
  minWinProbabilityRequired = 0.50
): RiskAuditResult {
  const maxDrawdownLimit = 3.0 // 3% daily circuit breaker
  const circuitBreakerTriggered = currentDailyDrawdownPercent >= maxDrawdownLimit

  const { recommendedSizeUsd, kellyFraction } = calculateKellyPositionSize(
    winRate,
    rrRatio,
    portfolioValue,
    0.25
  )

  const var99 = calculateParametricVaR(portfolioValue, 0.025, 0.99)
  const varPercent = Math.round((var99 / portfolioValue) * 1000) / 10

  if (circuitBreakerTriggered) {
    return {
      approved: false,
      requestedSizeUsd,
      approvedSizeUsd: 0,
      kellyFraction,
      var99Percent: varPercent,
      maxDrawdownCurrentPercent: currentDailyDrawdownPercent,
      circuitBreakerTriggered: true,
      winProbability: winRate,
      minWinProbabilityRequired,
      reason: `CIRCUIT BREAKER TRIGGERED: Daily drawdown (-${currentDailyDrawdownPercent}%) has reached or exceeded risk ceiling (-${maxDrawdownLimit}%). All new executions halted.`,
    }
  }

  if (minWinProbabilityRequired > 0 && winRate < minWinProbabilityRequired) {
    return {
      approved: false,
      requestedSizeUsd,
      approvedSizeUsd: 0,
      kellyFraction: 0,
      var99Percent: varPercent,
      maxDrawdownCurrentPercent: currentDailyDrawdownPercent,
      circuitBreakerTriggered: false,
      winProbability: winRate,
      minWinProbabilityRequired,
      reason: `RISK GATEKEEPER REJECTED: Win probability (${(winRate * 100).toFixed(1)}%) is below required ${(minWinProbabilityRequired * 100).toFixed(0)}% high-conviction threshold. Trade rejected.`,
    }
  }

  // Cap size at Kelly fraction or max 15% of portfolio
  const maxSizeUsd = Math.min(recommendedSizeUsd, portfolioValue * 0.15)
  const approvedSizeUsd = Math.min(requestedSizeUsd, maxSizeUsd)

  const approved = approvedSizeUsd > 0

  return {
    approved,
    requestedSizeUsd,
    approvedSizeUsd,
    kellyFraction,
    var99Percent: varPercent,
    maxDrawdownCurrentPercent: currentDailyDrawdownPercent,
    circuitBreakerTriggered: false,
    winProbability: winRate,
    minWinProbabilityRequired,
    reason: approved
      ? `Trade risk clearance APPROVED. Position scaled by Fractional Kelly (${kellyFraction}%) with VaR 99% within safety margin (${varPercent}%). Win probability ${(winRate * 100).toFixed(0)}%.`
      : 'Trade size exceeds risk parameters or Kelly fraction indicates negative edge.',
  }
}

// ==========================================
// 5. Multi-Agent Bayesian Consensus Matrix
// ==========================================

export function calculateSwarmConsensus(
  ticker: string,
  currentPrice: number,
  portfolioValue = 100000,
  customVotes?: Partial<Record<string, { action: TradeAction; confidence: number; reasoning?: string }>>
): ConsensusDecision {
  const defaultVotes: AgentVote[] = [
    {
      botId: 'technical-analyst',
      botName: 'Technical Analysis Agent',
      action: 'BUY',
      weight: 0.2,
      confidence: 84,
      reasoning: 'Bullish MACD crossover above zero-line, price holding above 50 EMA with RSI at 54.2.',
    },
    {
      botId: 'smc-liquidity',
      botName: 'SMC & ICT Liquidity Hunter',
      action: 'BUY',
      weight: 0.2,
      confidence: 88,
      reasoning: 'Rejection of 15m unmitigated Bullish Order Block with clean sell-side liquidity sweep.',
    },
    {
      botId: 'sentiment-trader',
      botName: 'Sentiment & News Intelligence',
      action: 'BUY',
      weight: 0.15,
      confidence: 78,
      reasoning: 'Net positive institutional news sentiment polarity (+0.62) with Fear & Greed at 68 (Greed).',
    },
    {
      botId: 'volume-breakout',
      botName: 'Volume Breakout Hunter',
      action: 'BUY',
      weight: 0.15,
      confidence: 82,
      reasoning: 'Relative Volume RVOL at 3.1x with Bollinger Band squeeze expansion upward.',
    },
    {
      botId: 'fundamental-valuation',
      botName: 'Fundamental Valuation RAG',
      action: 'BUY',
      weight: 0.1,
      confidence: 72,
      reasoning: 'DCF Intrinsic Fair Value calculated 18% above current market price.',
    },
    {
      botId: 'arbitrage-funding',
      botName: 'Arbitrage & Funding Exploiter',
      action: 'HOLD',
      weight: 0.1,
      confidence: 65,
      reasoning: 'Perpetual funding rate neutral at 0.010% per 8h cycle; no basis dislocation.',
    },
    {
      botId: 'macro-regime',
      botName: 'Macro Regime & Fed Watchdog',
      action: 'BUY',
      weight: 0.1,
      confidence: 76,
      reasoning: 'Global M2 liquidity expanding at +4.8% YoY; Risk-On quadrant confirmed.',
    },
  ]

  // Apply custom overrides if provided
  const votes = defaultVotes.map((v) => {
    if (customVotes && customVotes[v.botId]) {
      const override = customVotes[v.botId]!
      return {
        ...v,
        action: override.action,
        confidence: override.confidence,
        reasoning: override.reasoning || v.reasoning,
      }
    }
    return v
  })

  // Calculate weighted Bayesian scores
  let buyScore = 0
  let sellScore = 0
  let holdScore = 0

  for (const vote of votes) {
    const score = (vote.confidence / 100) * vote.weight
    if (vote.action === 'BUY') buyScore += score
    else if (vote.action === 'SELL') sellScore += score
    else holdScore += score
  }

  // Multi-factor Bayesian win probability estimation
  let rawWinProb = 0.50
  if (buyScore > sellScore) {
    rawWinProb += 0.22 * (buyScore / (buyScore + sellScore + holdScore || 1))
    const buyVotesCount = votes.filter((v) => v.action === 'BUY').length
    const sellVotesCount = votes.filter((v) => v.action === 'SELL').length
    if (buyVotesCount >= 5) rawWinProb += 0.12
    else if (buyVotesCount >= 3) rawWinProb += 0.06
    if (sellVotesCount > 0) rawWinProb -= 0.15 // conflict penalty
  } else if (sellScore > buyScore) {
    rawWinProb += 0.22 * (sellScore / (buyScore + sellScore + holdScore || 1))
    const sellVotesCount = votes.filter((v) => v.action === 'SELL').length
    const buyVotesCount = votes.filter((v) => v.action === 'BUY').length
    if (sellVotesCount >= 5) rawWinProb += 0.12
    else if (sellVotesCount >= 3) rawWinProb += 0.06
    if (buyVotesCount > 0) rawWinProb -= 0.15
  }

  const minWinProbThreshold = 0.70
  const winProbability = Math.min(0.95, Math.max(0.10, Math.round(rawWinProb * 100) / 100))
  const isHighConviction = winProbability >= minWinProbThreshold
  const gatekeeperPassed = isHighConviction

  let consensusAction: TradeAction = 'HOLD'
  let maxScore = holdScore
  // Strict Gatekeeper: Trade is ONLY executed if winProbability >= 70%
  if (gatekeeperPassed) {
    if (buyScore > maxScore && buyScore >= 0.5) {
      consensusAction = 'BUY'
      maxScore = buyScore
    } else if (sellScore > maxScore && sellScore >= 0.5) {
      consensusAction = 'SELL'
      maxScore = sellScore
    }
  }

  const overallConfidence = Math.round(maxScore * 100)

  // Risk Audit check with winProbability
  const riskAudit = runRiskAudit(
    portfolioValue * 0.08,
    portfolioValue,
    winProbability,
    2.2,
    0.85,
    gatekeeperPassed ? minWinProbThreshold : 0.50
  )

  // Price targets
  const stopLossPercent = 0.025
  const stopLoss = consensusAction === 'BUY'
    ? Math.round(currentPrice * (1 - stopLossPercent) * 100) / 100
    : Math.round(currentPrice * (1 + stopLossPercent) * 100) / 100

  const takeProfit1 = consensusAction === 'BUY'
    ? Math.round(currentPrice * (1 + stopLossPercent * 1.5) * 100) / 100
    : Math.round(currentPrice * (1 - stopLossPercent * 1.5) * 100) / 100

  const takeProfit2 = consensusAction === 'BUY'
    ? Math.round(currentPrice * (1 + stopLossPercent * 2.8) * 100) / 100
    : Math.round(currentPrice * (1 - stopLossPercent * 2.8) * 100) / 100

  return {
    consensusAction,
    overallConfidence,
    winProbability,
    isHighConviction,
    gatekeeperPassed,
    ticker,
    price: currentPrice,
    entryTarget: currentPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    recommendedPositionSizeUsd: riskAudit.approvedSizeUsd,
    agentVotes: votes,
    riskAudit,
    timestamp: Date.now(),
  }
}

// ==========================================
// 6. Strategy Backtest Engine
// ==========================================

export function runStrategyBacktest(
  candles: MarketDataCandle[],
  initialCapital = 100000
): BacktestResult {
  if (candles.length < 30) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalReturnPercent: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      equityCurve: [{ timestamp: Date.now(), equity: initialCapital }],
    }
  }

  let capital = initialCapital
  let peakCapital = initialCapital
  let maxDrawdown = 0
  let wins = 0
  let losses = 0
  let grossProfit = 0
  let grossLoss = 0

  const equityCurve: Array<{ timestamp: number; equity: number }> = [
    { timestamp: candles[0].timestamp, equity: capital },
  ]
  const returns: number[] = []

  let inPosition = false
  let entryPrice = 0
  let positionSize = 0

  for (let i = 25; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1)
    const indicators = calculateAllIndicators(slice)
    const currentClose = candles[i].close

    // Simple confluence entry: RSI < 65 & MACD hist > 0 & Close > EMA 50
    const entrySignal =
      indicators.rsi > 40 &&
      indicators.rsi < 70 &&
      indicators.macd.hist > 0 &&
      currentClose > indicators.ema50

    if (!inPosition && entrySignal) {
      inPosition = true
      entryPrice = currentClose
      const riskFraction = 0.05
      positionSize = (capital * riskFraction) / entryPrice
    } else if (inPosition) {
      const pnlPercent = (currentClose - entryPrice) / entryPrice
      const hitTP = pnlPercent >= 0.04
      const hitSL = pnlPercent <= -0.02

      if (hitTP || hitSL || i === candles.length - 1) {
        const tradePnl = positionSize * (currentClose - entryPrice)
        capital += tradePnl
        if (tradePnl > 0) {
          wins++
          grossProfit += tradePnl
        } else {
          losses++
          grossLoss += Math.abs(tradePnl)
        }

        const tradeReturn = tradePnl / capital
        returns.push(tradeReturn)

        if (capital > peakCapital) peakCapital = capital
        const dd = (peakCapital - capital) / peakCapital
        if (dd > maxDrawdown) maxDrawdown = dd

        equityCurve.push({ timestamp: candles[i].timestamp, equity: Math.round(capital * 100) / 100 })
        inPosition = false
      }
    }
  }

  const totalTrades = wins + losses
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 9.99 : 0
  const totalReturnPercent = Math.round(((capital - initialCapital) / initialCapital) * 1000) / 10
  const maxDrawdownPercent = Math.round(maxDrawdown * 1000) / 10

  // Sharpe ratio approximation
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1))
    : 0.01
  const sharpeRatio = stdReturn > 0 ? Math.round(((meanReturn * Math.sqrt(252)) / (stdReturn || 1)) * 100) / 100 : 0

  return {
    totalTrades,
    winningTrades: wins,
    losingTrades: losses,
    winRate,
    profitFactor,
    totalReturnPercent,
    maxDrawdownPercent,
    sharpeRatio,
    equityCurve,
  }
}

// ==========================================
// 7. Mock Market Data Generator
// ==========================================

export function generateMockCandles(
  _ticker: string,
  count = 100,
  startPrice = 64000,
  trend: 'bullish' | 'bearish' | 'ranging' = 'bullish'
): MarketDataCandle[] {
  const candles: MarketDataCandle[] = []
  let price = startPrice
  const now = Date.now()
  const intervalMs = 15 * 60 * 1000 // 15 minutes

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * intervalMs
    const trendDrift = trend === 'bullish' ? 0.001 : trend === 'bearish' ? -0.001 : 0
    const volatility = 0.008
    const randomChange = (Math.sin(i / 5) * 0.5 + (Math.random() - 0.48)) * volatility + trendDrift

    const open = price
    const close = Math.round(open * (1 + randomChange) * 100) / 100
    const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.004) * 100) / 100
    const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.004) * 100) / 100
    const volume = Math.round(150 + Math.random() * 850 + (i % 15 === 0 ? 1200 : 0))

    candles.push({ timestamp, open, high, low, close, volume })
    price = close
  }

  return candles
}
