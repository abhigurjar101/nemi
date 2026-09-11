import { sentimentTraderBot } from './sentimentTrader'
import { technicalAnalystBot } from './technicalAnalyst'
import { smcLiquidityBot } from './smcLiquidity'
import { volumeBreakoutBot } from './volumeBreakout'
import { fundamentalValuationBot } from './fundamentalValuation'
import { arbitrageFundingBot } from './arbitrageFunding'
import { statisticalArbitrageBot } from './statisticalArbitrage'
import { macroRegimeBot } from './macroRegime'
import { riskSentinelBot } from './riskSentinel'
import { tradingOrchestratorBot } from './tradingOrchestrator'
import type { TradingBot } from './types'

export * from './types'
export * from './engine'

export {
  sentimentTraderBot,
  technicalAnalystBot,
  smcLiquidityBot,
  volumeBreakoutBot,
  fundamentalValuationBot,
  arbitrageFundingBot,
  statisticalArbitrageBot,
  macroRegimeBot,
  riskSentinelBot,
  tradingOrchestratorBot,
}

/**
 * Registry of all 10 Elite Algorithmic & AI Trading Agents.
 */
export const ALL_TRADING_BOTS: TradingBot[] = [
  sentimentTraderBot,
  technicalAnalystBot,
  smcLiquidityBot,
  volumeBreakoutBot,
  fundamentalValuationBot,
  arbitrageFundingBot,
  statisticalArbitrageBot,
  macroRegimeBot,
  riskSentinelBot,
  tradingOrchestratorBot,
]

export function getTradingBotById(botId: string): TradingBot {
  return ALL_TRADING_BOTS.find((b) => b.id === botId) || tradingOrchestratorBot
}

export function compileTradingBotPrompt(botId: string): string {
  const bot = getTradingBotById(botId)
  return `You are ${bot.name} (${bot.shortName}), an elite specialist in the NEMI Algorithmic Trading Swarm.
Risk Profile: ${bot.riskProfile} | Trading Category: ${bot.tradingCategory}
Target Assets: ${bot.targetAssets.join(', ')}
Timeframes: ${bot.timeframes.join(', ')}

CORE DIRECTIVE:
${bot.directive}

ABSOLUTE MANDATES:
- ZERO TRIVIAL COMMENTS: Do not narrate elementary code or add useless annotations.
- ZERO PLACEHOLDERS: Never use '# TODO' or stubbed functions.
- PRODUCTION EXECUTION: Write 100% complete, runnable Python or TypeScript code.
- CAPITAL PRESERVATION: Never violate stop-loss or risk sizing boundaries.`
}
