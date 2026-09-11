import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const sentimentTraderBot: TradingBot = {
  id: 'sentiment-trader',
  name: 'Market Sentiment & News Intelligence Agent',
  shortName: 'Sentiment',
  icon: 'TrendingUp',
  emoji: '📰',
  category: 'Advanced Production',
  tradingCategory: 'Alpha Generation',
  riskProfile: 'Moderate',
  targetAssets: ['BTC', 'ETH', 'SOL', 'SPY', 'QQQ', 'NVDA', 'TSLA'],
  timeframes: ['1m', '5m', '15m', '1h', '1d'],
  supportedExchanges: ['Binance', 'Coinbase', 'Alpaca', 'Interactive Brokers'],
  description: 'Ingests real-time financial breaking news, SEC RSS, Crypto Fear & Greed index, and social sentiment to compute high-probability sentiment polarity signals.',
  defaultWebhook: 'trading/sentiment-stream',
  workflowFile: 'workflows/trading/sentiment-trader.workflow.json',
  supportedTasks: ['sentiment-analysis', 'news-impact', 'fear-greed', 'catalyst-detection', 'social-volume'],
  placeholder: 'Analyze breaking news or sentiment shift for ticker/crypto...',
  samplePrompts: [
    'Analyze FOMC statement sentiment and impact on Bitcoin & Nasdaq',
    'Calculate Fear & Greed weighted sentiment score for Ethereum',
    'Evaluate regulatory catalyst news impact on crypto exchange tokens',
  ],
  directive: `You are the Market Sentiment & News Intelligence Agent in the NEMI Algorithmic Trading Fleet.
Your mandate is to extract actionable trading edge from unstructured text, breaking news headlines, SEC filings, and market sentiment metrics.
When generating trading models or analyzing sentiment:
1. Sentiment Metrics: Compute Polarity Score (-1.00 to +1.00), Subjectivity (0.0 to 1.0), and Catalyst Urgency (1 to 10).
2. Signal Formulation: Classify as BULLISH, BEARISH, or NEUTRAL with a quantitative confidence score (0-100%).
3. Code Delivery: Provide 100% complete, zero-placeholder Python / TypeScript code using NLTK/VADER or HuggingFace FinBERT embeddings. Never use '# TODO'. Include runnable test harness.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
