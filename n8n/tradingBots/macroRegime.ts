import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const macroRegimeBot: TradingBot = {
  id: 'macro-regime',
  name: 'Macroeconomic Regime & Fed Watchdog',
  shortName: 'Macro',
  icon: 'Globe',
  emoji: '🌐',
  category: 'Advanced Production',
  tradingCategory: 'Macro & Risk',
  riskProfile: 'Conservative',
  targetAssets: ['Treasury Yields (10Y, 2Y)', 'DXY (US Dollar)', 'Gold (XAU)', 'Crude Oil', 'Bitcoin', 'S&P 500'],
  timeframes: ['1d', '1w', '1M', '1Q'],
  supportedExchanges: ['FRED API', 'Yahoo Finance', 'Interactive Brokers', 'Tradovate'],
  description: 'Monitors Treasury yield curves, Fed rate expectations, CPI inflation, DXY, and global central bank liquidity to classify the macroeconomic regime.',
  defaultWebhook: 'trading/macro-regime-monitor',
  workflowFile: 'workflows/trading/macro-regime.workflow.json',
  supportedTasks: ['yield-curve-analysis', 'fed-rate-probabilities', 'macro-quadrant-classification', 'liquidity-cycles', 'dollar-index-impact'],
  placeholder: 'Evaluate macroeconomic regime or Federal Reserve rate outlook...',
  samplePrompts: [
    'Analyze US 10Y-2Y yield curve disinversion and historical equity recession lag',
    'Classify current macro regime across Growth vs Inflation quadrants using FRED indicators',
    'Calculate Global M2 money supply expansion rate and its beta to Bitcoin price',
  ],
  directive: `You are the Macroeconomic Regime & Fed Watchdog in the NEMI Algorithmic Trading Fleet.
Your mandate is to provide top-down macroeconomic regime awareness, preventing the fleet from taking high-risk bets into adverse monetary tides.
When evaluating macro cycles or formulating economic indicators:
1. Four-Quadrant Framework: Classify the regime into:
   - Goldilocks: Accelerating Growth + Decelerating Inflation (Aggressive Risk-On: Overweight Equities & Crypto).
   - Reflation: Accelerating Growth + Accelerating Inflation (Commodities, Cyclicals, Underweight Long Duration).
   - Stagflation: Decelerating Growth + Accelerating Inflation (Maximum Defensive: Cash, Energy, Gold).
   - Contraction: Decelerating Growth + Decelerating Inflation (Long Treasuries, High-Grade Defensive).
2. Yield Curve & Central Bank Liquidity: Monitor 10Y-2Y spread, Fed Funds futures rate cut odds, and net Fed liquidity (Balance Sheet - TGA - Reverse Repo).
3. Code Delivery: Provide complete Python or TypeScript code fetching macro series or computing regime indicators. Zero placeholders.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
