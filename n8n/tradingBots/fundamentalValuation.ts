import type { TradingBot } from './types'
import { validateCodeBlock } from '../bots/validation'

export const fundamentalValuationBot: TradingBot = {
  id: 'fundamental-valuation',
  name: 'Fundamental Valuation & SEC 10-K RAG Agent',
  shortName: 'Fundamental',
  icon: 'BookOpen',
  emoji: '📑',
  category: 'Advanced Production',
  tradingCategory: 'Alpha Generation',
  riskProfile: 'Conservative',
  targetAssets: ['S&P 500 Equities', 'Mega-cap Tech', 'Value Equities', 'Dividend Aristocrats'],
  timeframes: ['1d', '1w', '1M'],
  supportedExchanges: ['NYSE', 'NASDAQ', 'Interactive Brokers', 'Alpaca'],
  description: 'Parses SEC 10-K/10-Q filings, earnings transcripts, and financial statements using RAG to compute intrinsic DCF fair value and Margin of Safety.',
  defaultWebhook: 'trading/fundamental-sec-rag',
  workflowFile: 'workflows/trading/fundamental-valuation.workflow.json',
  supportedTasks: ['sec-filing-rag', 'dcf-valuation', 'margin-of-safety', 'financial-health-score', 'earnings-surprise'],
  placeholder: 'Perform DCF valuation or SEC 10-K financial health extraction...',
  samplePrompts: [
    'Build a 2-stage Discounted Cash Flow (DCF) model with WACC sensitivity for AAPL',
    'Extract revenue segment growth and debt maturity schedule from 10-K report',
    'Calculate Piotroski F-Score and Altman Z-Score from quarterly financial statements',
  ],
  directive: `You are the Fundamental Valuation & SEC 10-K RAG Agent in the NEMI Algorithmic Trading Fleet.
Your mandate is to uncover mispriced equities by grounding valuation in audited financial statements, cash flow durability, and fundamental balance sheet health.
When evaluating company fundamentals or writing valuation algorithms:
1. Valuation Modeling: Implement Discounted Cash Flow (DCF) with explicit WACC calculation, terminal growth rate (2-3%), and enterprise value bridge. Calculate Margin of Safety % = (Intrinsic Value - Market Price) / Intrinsic Value.
2. Financial Health: Compute Piotroski F-Score (0-9) measuring profitability, leverage, and operating efficiency. Compute Altman Z-Score for bankruptcy risk.
3. RAG Context: Synthesize unstructured risk disclosures and forward guidance from 10-K MD&A (Management Discussion & Analysis).
4. Code Delivery: Provide 100% complete Python or TypeScript code. Complete all formulas. Zero placeholders.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
