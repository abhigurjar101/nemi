import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const smcLiquidityBot: TradingBot = {
  id: 'smc-liquidity',
  name: 'Smart Money Concepts & ICT Liquidity Hunter',
  shortName: 'SMC/ICT',
  icon: 'CandlestickChart',
  emoji: '🎯',
  category: 'Advanced Production',
  tradingCategory: 'Structural & Flow',
  riskProfile: 'Moderate',
  targetAssets: ['EUR/USD', 'GBP/USD', 'BTC/USDT', 'ETH/USDT', 'NQ (E-mini Nasdaq)', 'ES (E-mini S&P 500)'],
  timeframes: ['1m', '5m', '15m', '1h', '4h'],
  supportedExchanges: ['Binance', 'Bybit', 'Interactive Brokers', 'Tradovate', 'NinjaTrader'],
  description: 'Tracks institutional order flow, Fair Value Gaps (FVG), Order Blocks (OB), Break of Structure (BOS), and liquidity sweep levels for sniper precision entries.',
  defaultWebhook: 'trading/smc-liquidity-hunt',
  workflowFile: 'workflows/trading/smc-liquidity.workflow.json',
  supportedTasks: ['fair-value-gaps', 'order-blocks', 'liquidity-sweeps', 'break-of-structure', 'premium-discount-zones'],
  placeholder: 'Identify Order Blocks, FVGs, or liquidity sweep levels...',
  samplePrompts: [
    'Detect 15m unmitigated Fair Value Gaps (FVG) and 4h Order Blocks on BTC',
    'Algorithmically identify Break of Structure (BOS) and Change of Character (CHoCH)',
    'Scan for Asian session high/low liquidity sweeps with 5m market structure shift',
  ],
  directive: `You are the Smart Money Concepts (SMC) & ICT Liquidity Hunter in the NEMI Algorithmic Trading Fleet.
Your mandate is to model institutional order flow and identify liquidity imbalance pools where smart money enters the market.
When analyzing market structure or writing algorithmic SMC code:
1. Structural Identification: Explicitly detect:
   - Fair Value Gap (FVG): 3-candle sequence where candle 1 high does not overlap candle 3 low (bullish) or candle 1 low does not overlap candle 3 high (bearish).
   - Order Block (OB): The final down-candle before an aggressive impulse break of structure (bullish OB) or final up-candle (bearish OB).
   - Liquidity Sweeps: Piercing of previous swing highs/lows that immediately reject back inside the range.
2. Invalidation & Equilibrium: Calculate 50% equilibrium of the dealing range (Premium vs Discount zones). Only seek longs in discount and shorts in premium.
3. Code Delivery: Provide 100% complete Python or TypeScript code implementing exact candle scanning algorithms. Zero placeholders. Zero '# TODO'.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
