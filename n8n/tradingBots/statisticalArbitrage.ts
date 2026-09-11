import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const statisticalArbitrageBot: TradingBot = {
  id: 'statistical-arbitrage',
  name: 'Statistical Arbitrage & Pairs Trading Agent',
  shortName: 'Stat-Arb',
  icon: 'Scale',
  emoji: '⚖️',
  category: 'Advanced Production',
  tradingCategory: 'Quantitative Arbitrage',
  riskProfile: 'Moderate',
  targetAssets: ['BTC/ETH', 'SOL/AVAX', 'GOOGL/MSFT', 'NVDA/AMD', 'XOM/CVX', 'GLD/SLV'],
  timeframes: ['15m', '1h', '4h', '1d'],
  supportedExchanges: ['Binance', 'Alpaca', 'Interactive Brokers', 'Coinbase'],
  description: 'Applies rigorous statistical testing (Engle-Granger cointegration, Ornstein-Uhlenbeck half-life, Z-scores) to execute mean-reverting pairs trading strategies.',
  defaultWebhook: 'trading/pairs-stat-arb',
  workflowFile: 'workflows/trading/statistical-arbitrage.workflow.json',
  supportedTasks: ['cointegration-testing', 'zscore-divergence', 'pairs-trading', 'kalman-hedge-ratio', 'mean-reversion-halflife'],
  placeholder: 'Test cointegration or calculate pairs trading Z-score...',
  samplePrompts: [
    'Test cointegration of BTC and ETH using Engle-Granger two-step method in Python',
    'Calculate rolling Z-score and Ornstein-Uhlenbeck half-life of GOOGL vs MSFT spread',
    'Generate dynamic Kalman Filter hedge ratio for continuous market-neutral pairs rebalancing',
  ],
  directive: `You are the Statistical Arbitrage & Pairs Trading Agent in the NEMI Algorithmic Trading Fleet.
Your mandate is to mathematically identify cointegrated asset pairs whose spread deviates from equilibrium and capture mean-reverting alpha.
When writing statistical arbitrage algorithms or evaluating pair dynamics:
1. Stationarity & Cointegration: Run Augmented Dickey-Fuller (ADF) test on the residual spread epsilon = PriceA - (beta * PriceB). Verify p-value < 0.05.
2. Z-Score Normalization: Compute Z = (Spread - RollingMean(Spread, window)) / RollingStd(Spread, window). Trigger LONG A / SHORT B when Z < -2.0, and SHORT A / LONG B when Z > +2.0. Exit positions at Z = 0.0.
3. Half-Life & Stop-Loss: Estimate mean-reversion speed using Ornstein-Uhlenbeck parameter lambda. Exit on divergence stop-loss if |Z| > 3.5 (broken cointegration).
4. Code Delivery: Provide complete Python code using statsmodels/scipy or pure NumPy. Complete all mathematical loops. Zero placeholders.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
