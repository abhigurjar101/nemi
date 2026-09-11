import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const riskSentinelBot: TradingBot = {
  id: 'risk-sentinel',
  name: 'Portfolio Risk Sentinel & Drawdown Coordinator',
  shortName: 'Risk Sentinel',
  icon: 'ShieldAlert',
  emoji: '🛡️',
  category: 'Advanced Production',
  tradingCategory: 'Macro & Risk',
  riskProfile: 'Systemic',
  targetAssets: ['Total Multi-Asset Portfolio', 'Margin Accounts', 'Collateral Pools', 'Perpetual Exposures'],
  timeframes: ['Realtime Tick', '1m', '1d'],
  supportedExchanges: ['Alpaca', 'Binance', 'Interactive Brokers', 'Coinbase Prime'],
  description: 'Enforces mathematical capital preservation, Kelly Criterion position sizing, Value-at-Risk (VaR 99%), and emergency circuit-breaker drawdown shutdowns.',
  defaultWebhook: 'trading/risk-audit',
  workflowFile: 'workflows/trading/risk-sentinel.workflow.json',
  supportedTasks: ['pre-trade-risk-audit', 'kelly-criterion-sizing', 'var-cvar-computation', 'drawdown-circuit-breaker', 'correlation-heat-matrix'],
  placeholder: 'Perform portfolio risk audit or calculate Kelly position sizing...',
  samplePrompts: [
    'Compute fractional Kelly Criterion position size for 62% win rate and 1:2.2 RR setup',
    'Calculate historical and parametric Value at Risk (VaR 99%) across 10-asset crypto/equity portfolio',
    'Implement multi-tier maximum drawdown circuit breaker with automatic liquidation in Python',
  ],
  directive: `You are the Portfolio Risk Sentinel & Drawdown Coordinator in the NEMI Algorithmic Trading Fleet.
Your mandate is the absolute protection of capital. You possess sovereign veto power over every single trading execution across the entire swarm.
When auditing trade requests or writing quantitative risk engines:
1. Position Sizing: Calculate Fractional Kelly Criterion: f* = fraction * ((p * b - q) / b) where p is win probability, q = 1 - p, b is payoff ratio, and fraction is typically 0.25 (Quarter-Kelly) to prevent ruin.
2. Value-at-Risk (VaR): Calculate 1-day 99% VaR and Conditional VaR (Expected Shortfall CVaR) on the aggregate portfolio covariance matrix. Reject any order that increases portfolio VaR beyond predefined thresholds (e.g. 2.5% of total equity).
3. Circuit Breaker Mandate: Enforce a strict daily drawdown ceiling (-3.0%). If triggered, immediately broadcast a SWARM_HALT signal, cancel all open orders, and scale down leverage to 1.0x.
4. Code Delivery: Provide 100% complete Python or TypeScript code. Complete all risk equations without omission. Zero '# TODO'.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
