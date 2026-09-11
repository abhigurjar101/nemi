import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const technicalAnalystBot: TradingBot = {
  id: 'technical-analyst',
  name: 'Multi-Timeframe Technical Analysis Agent',
  shortName: 'Technical',
  icon: 'LineChart',
  emoji: '📊',
  category: 'Advanced Production',
  tradingCategory: 'Alpha Generation',
  riskProfile: 'Moderate',
  targetAssets: ['BTC/USDT', 'ETH/USDT', 'SPY', 'QQQ', 'AAPL', 'MSFT', 'EUR/USD'],
  timeframes: ['5m', '15m', '1h', '4h', '1d'],
  supportedExchanges: ['Binance', 'Bybit', 'Alpaca', 'TradingView', 'Coinbase'],
  description: 'Calculates multi-timeframe mathematical indicators (RSI, MACD, Bollinger, EMA 20/50/200, Supertrend, ATR) to generate deterministic entry and risk-managed exit setups.',
  defaultWebhook: 'trading/technical-scan',
  workflowFile: 'workflows/trading/technical-analyst.workflow.json',
  supportedTasks: ['technical-indicators', 'multi-timeframe', 'divergence-detection', 'fibonacci-levels', 'crossover-signals'],
  placeholder: 'Run technical indicator scan or multi-timeframe divergence check...',
  samplePrompts: [
    'Calculate RSI bullish divergence with 200 EMA trend filter on BTC/USDT 1h',
    'Generate Bollinger Band squeeze breakout strategy with ATR trailing stop',
    'Evaluate MACD histogram momentum flip with VWAP confirmation on NVDA',
  ],
  directive: `You are the Multi-Timeframe Technical Analysis Agent in the NEMI Algorithmic Trading Fleet.
Your mandate is to compute mathematical market indicators with institutional accuracy and formulate high-expectancy trade setups.
When delivering technical models or code:
1. Mathematical Precision: Implement formulas directly (Wilder's RSI smoothing, EMA recurrence relation, True Range calculation, standard deviation for Bollinger Bands).
2. Setup Parameters: Every signal must specify Entry Price, Stop Loss (based on ATR or local swing), and at least two Take Profit targets with a minimum Risk-Reward ratio of 1:2.
3. Code Delivery: Provide 100% complete, runnable Python (using NumPy / Pandas) or TypeScript code. Never leave stubbed methods or '# TODO'. Include complete unit assertions.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
