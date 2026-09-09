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
  type LucideProps,
} from 'lucide-react'

export interface BotIconProps extends LucideProps {
  botId?: string
  iconName?: string
  className?: string
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
}

export const BotIcon: React.FC<BotIconProps> = ({ botId, iconName, className, ...props }) => {
  let IconComponent: React.ComponentType<LucideProps> = Bot

  if (botId && BOT_ICON_MAP[botId]) {
    IconComponent = BOT_ICON_MAP[botId]
  } else if (iconName) {
    const key = iconName.toLowerCase().replace(/[-_]/g, '')
    if (NAME_ICON_MAP[key]) {
      IconComponent = NAME_ICON_MAP[key]
    }
  }

  return <IconComponent className={className || 'w-4 h-4'} {...props} />
}

export default BotIcon
