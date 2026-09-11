import React from 'react'
import {
  Target,
  BrainCircuit,
  Code2,
  Boxes,
  Brain,
  TestTube2,
  BookOpen,
  Cloud,
  Cpu,
  Workflow,
  FolderGit2,
  Bot,
  Sparkles,
  Layers,
  Zap,
  Terminal,
  TrendingUp,
  LineChart,
  CandlestickChart,
  BarChart3,
  Coins,
  Scale,
  Globe,
  ShieldAlert,
  Gauge,
  type LucideProps,
} from 'lucide-react'

export interface BotIconProps extends LucideProps {
  botId?: string
  iconName?: string
  className?: string
  strokeWidth?: number
}

const BOT_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'orchestrator': Target,
  'github-learner': BrainCircuit,
  'coding-assistant': Code2,
  'system-design': Boxes,
  'high-thinking': Brain,
  'testing-bot': TestTube2,
  'advanced-rag': BookOpen,
  'cloud-deployment': Cloud,
  'ml-pipeline': Cpu,
  'n8n-manager': Workflow,
  'rag-bot': FolderGit2,
  // 10 Algorithmic & AI Trading Agents
  'sentiment-trader': TrendingUp,
  'technical-analyst': LineChart,
  'smc-liquidity': CandlestickChart,
  'volume-breakout': BarChart3,
  'fundamental-valuation': BookOpen,
  'arbitrage-funding': Coins,
  'statistical-arbitrage': Scale,
  'macro-regime': Globe,
  'risk-sentinel': ShieldAlert,
  'trading-orchestrator': Gauge,
}

const NAME_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'target': Target,
  'braincircuit': BrainCircuit,
  'code2': Code2,
  'boxes': Boxes,
  'brain': Brain,
  'testtube2': TestTube2,
  'bookopen': BookOpen,
  'cloud': Cloud,
  'cpu': Cpu,
  'workflow': Workflow,
  'foldergit2': FolderGit2,
  'bot': Bot,
  'sparkles': Sparkles,
  'layers': Layers,
  'zap': Zap,
  'terminal': Terminal,
  'trendingup': TrendingUp,
  'linechart': LineChart,
  'candlestickchart': CandlestickChart,
  'barchart3': BarChart3,
  'coins': Coins,
  'scale': Scale,
  'globe': Globe,
  'shieldalert': ShieldAlert,
  'gauge': Gauge,
}

export const BotIcon: React.FC<BotIconProps> = ({
  botId,
  iconName,
  className = 'w-4 h-4',
  strokeWidth = 1.65,
  ...props
}) => {
  let IconComponent: React.ComponentType<LucideProps> = Bot

  if (botId && BOT_ICON_MAP[botId]) {
    IconComponent = BOT_ICON_MAP[botId]
  } else if (iconName) {
    const key = iconName.toLowerCase().replace(/[-_]/g, '')
    if (NAME_ICON_MAP[key]) {
      IconComponent = NAME_ICON_MAP[key]
    }
  }

  return (
    <IconComponent
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...props}
    />
  )
}

export default BotIcon
