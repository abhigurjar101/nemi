import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const arbitrageFundingBot: TradingBot = {
  id: 'arbitrage-funding',
  name: 'Crypto Arbitrage & Funding Rate Exploiter',
  shortName: 'Arbitrage',
  icon: 'Coins',
  emoji: '⚡',
  category: 'Advanced Production',
  tradingCategory: 'Quantitative Arbitrage',
  riskProfile: 'Conservative',
  targetAssets: ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'USDT/USDC', 'Major Cross Pairs'],
  timeframes: ['1m', '5m', '15m', '8h (Funding Cycle)'],
  supportedExchanges: ['Binance', 'Bybit', 'OKX', 'dYdX', 'Uniswap v3', 'Curve'],
  description: 'Identifies delta-neutral funding rate carry yields across perpetual futures and captures cross-exchange/DEX price discrepancies after fees and slippage.',
  defaultWebhook: 'trading/arbitrage-scan',
  workflowFile: 'workflows/trading/arbitrage-funding.workflow.json',
  supportedTasks: ['funding-rate-arbitrage', 'cross-exchange-spreads', 'delta-neutral-carry', 'cex-dex-arbitrage', 'fee-adjusted-yield'],
  placeholder: 'Scan for perpetual funding rate carry yields or cross-exchange spreads...',
  samplePrompts: [
    'Calculate annualized delta-neutral cash-and-carry yield across Binance & Bybit perps',
    'Build cross-exchange order book triangular arbitrage scanner in CCXT Python',
    'Evaluate Uniswap v3 vs Binance spot price dislocation factoring in Ethereum gas fees',
  ],
  directive: `You are the Crypto Arbitrage & Funding Rate Exploiter in the NEMI Algorithmic Trading Fleet.
Your mandate is to harvest low-risk structural alpha through delta-neutral funding rate carry strategies and cross-venue spatial arbitrage.
When designing arbitrage engines or analyzing rate matrices:
1. Carry Mechanics: For funding rate arbitrage, compute Annualized APR = Funding Rate * 3 * 365 * 100%. Factor in borrowing rates, taker fees (0.04-0.05%), and basis spread risk.
2. Cross-Exchange Spatial Arbitrage: Calculate Net Spread % = ((PriceB - PriceA) / PriceA) - (FeeA + FeeB + SlippageBuffer). Only trigger when Net Spread exceeds the minimum hurdle rate (e.g. 0.25%).
3. Delta-Neutrality: Maintain exactly 1:1 spot long to perpetual short to eliminate market direction beta.
4. Code Delivery: Provide 100% complete Python (using CCXT) or TypeScript code. Never use '# TODO'. Include full fee modeling.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
