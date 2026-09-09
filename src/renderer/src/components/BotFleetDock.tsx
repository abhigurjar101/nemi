import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { N8N_BOTS, type N8nBot } from '../types_bots'
import { Sparkles, Bot, Layers, ChevronUp } from 'lucide-react'
import BotIcon from './BotIcon'

interface BotFleetDockProps {
  selectedBotId: string
  onSelectBot: (botId: string) => void
  onOpenChat: () => void
  onToggleSidebar?: () => void
}

export default function BotFleetDock({
  selectedBotId,
  onSelectBot,
  onOpenChat,
  onToggleSidebar,
}: BotFleetDockProps) {
  const [hoveredBot, setHoveredBot] = useState<N8nBot | null>(null)

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] select-none hidden md:block"
      onMouseEnter={() => window.nemi?.enterInteractiveMode()}
    >
      {/* Tooltip on hover */}
      <AnimatePresence>
        {hoveredBot && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-purple-500/30 text-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] pointer-events-none whitespace-nowrap z-50"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <BotIcon botId={hoveredBot.id} iconName={hoveredBot.icon} className="w-3.5 h-3.5 text-purple-400" />
              <span>{hoveredBot.name}</span>
              <span className="text-[10px] text-purple-300 font-mono px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-400/30">
                {hoveredBot.category}
              </span>
            </div>
            <p className="text-[10px] text-white/50 mt-0.5 max-w-xs truncate">
              {hoveredBot.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Glass Dock */}
      <nav
        aria-label="Autonomous Bot Fleet Navigation"
        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-2xl glass-panel bg-slate-950/85 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
      >
        {/* Status Indicator */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Bot Swarm Fleet Sidebar (11 bots active)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:bg-white/15 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          title="Toggle Bot Swarm Fleet Sidebar"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[11px] font-bold tracking-wider bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
            11 BOTS
          </span>
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        {/* Bot Pills */}
        <div className="flex items-center gap-1 overflow-x-auto nemi-scroll py-0.5" role="toolbar" aria-label="Bot Fleet Selector">
          {N8N_BOTS.map((bot) => {
            const isSelected = bot.id === selectedBotId
            return (
              <button
                key={bot.id}
                type="button"
                role="button"
                aria-label={`Select ${bot.name} (${bot.shortName}) - ${bot.category}`}
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectBot(bot.id)
                  onOpenChat()
                }}
                onMouseEnter={() => setHoveredBot(bot)}
                onMouseLeave={() => setHoveredBot(null)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-xl text-xs font-medium
                  transition-all duration-200 cursor-pointer border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60
                  ${isSelected
                    ? 'bg-purple-600/35 border-purple-400/70 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)] ring-1 ring-purple-400/30'
                    : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
                  }
                `}
              >
                <BotIcon
                  botId={bot.id}
                  iconName={bot.icon}
                  strokeWidth={1.65}
                  className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-purple-200' : 'text-white/60'}`}
                />
                <span className="text-[11px] tracking-tight font-medium">{bot.shortName}</span>
                {isSelected && (
                  <motion.div
                    layoutId="active-pill-dot"
                    className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        {/* Fleet Drawer Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open Bot Fleet Drawer"
            className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/50 hover:text-purple-300 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            title="Open Bot Fleet Drawer"
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.65} />
          </button>
        )}
      </nav>
    </div>
  )
}
