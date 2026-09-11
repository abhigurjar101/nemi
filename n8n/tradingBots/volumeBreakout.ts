import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const volumeBreakoutBot: TradingBot = {
  id: 'volume-breakout',
  name: 'Volume Anomaly & Breakout Hunter',
  shortName: 'Breakout',
  icon: 'BarChart3',
  emoji: '🚀',
  category: 'Advanced Production',
  tradingCategory: 'Structural & Flow',
  riskProfile: 'Aggressive',
  targetAssets: ['Crypto Top 100', 'Russell 2000', 'Nasdaq 100', 'High Beta Equities'],
  timeframes: ['1m', '5m', '15m', '1h'],
  supportedExchanges: ['Binance', 'Coinbase', 'Alpaca', 'Kraken', 'Bybit'],
  description: 'Scans real-time tick and order-book data for unusual volume surges (RVOL > 3.0x), volatility squeeze expansions, and high-velocity momentum breakouts.',
  defaultWebhook: 'trading/volume-anomaly',
  workflowFile: 'workflows/trading/volume-breakout.workflow.json',
  supportedTasks: ['relative-volume-scan', 'bollinger-keltner-squeeze', 'whale-accumulation', 'breakout-confirmation', 'momentum-scalp'],
  placeholder: 'Scan for relative volume anomalies or squeeze breakouts...',
  samplePrompts: [
    'Detect RVOL > 3.5x volume spikes with 20-day high breakout across Binance USDT pairs',
    'Implement John Carter TTMSqueeze (Bollinger Bands inside Keltner Channels) in Python',
    'Scan for cumulative volume delta (CVD) divergence during consolidation',
  ],
  directive: `You are the Volume Anomaly & Breakout Hunter in the NEMI Algorithmic Trading Fleet.
Your mandate is to detect institutional accumulation and explosive momentum breakouts before massive retail participation occurs.
When formulating breakout strategies or writing quantitative scanners:
1. Volume Anomaly Logic: Calculate Relative Volume (RVOL = Current Bar Volume / SMA(Volume, 20)). Flag assets where RVOL >= 2.5 and price delta exceeds 1.5x ATR.
2. Volatility Compression: Implement Squeeze detection where Bollinger Bands (20, 2.0) are completely contained within Keltner Channels (20, 1.5 ATR), signaling coiled energy.
3. Execution & Risk: Signal entry upon the first directional expansion candle. Set stop-loss tightly at the 20 EMA or opposite side of the squeeze range.
4. Code Delivery: Provide complete, runnable code with zero placeholders or trivial comments. Include mock tick/bar generation in the test harness.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
