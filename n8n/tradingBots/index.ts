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
import { grandmasterTraderBot } from './grandmasterTrader'
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
  grandmasterTraderBot,
}

/**
 * Registry of all 10 Elite Algorithmic & AI Trading Specialist Agents.
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

/**
 * Full fleet including the 30-Year Veteran Grandmaster CIO & Swarm Mentor.
 */
export const FLEET_WITH_GRANDMASTER: TradingBot[] = [
  grandmasterTraderBot,
  ...ALL_TRADING_BOTS,
]

export function getTradingBotById(botId: string): TradingBot {
  if (botId === 'grandmaster-trader' || botId === grandmasterTraderBot.id) {
    return grandmasterTraderBot
  }
  return ALL_TRADING_BOTS.find((b) => b.id === botId) || grandmasterTraderBot
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
