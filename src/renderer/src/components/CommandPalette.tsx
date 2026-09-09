import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bot,
  BookOpen,
  Download,
  Database,
  BrainCircuit,
  Volume2,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Command,
  X,
  ChevronRight,
  Terminal,
} from 'lucide-react'
import { N8N_BOTS } from '../types_bots'

export interface CommandPaletteAction {
  id: string
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  category: 'Bots' | 'Notebooks' | 'Tools' | 'Actions'
  badge?: string
  run: () => void
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelectBot: (botId: string) => void
  onOpenColab: () => void
  onDownloadNotebook?: () => void
  onOpenRag: () => void
  onTriggerGitHubLearning: () => void
  onToggleVoice?: () => void
  onNewChat: () => void
  onToast?: (message: string) => void
  onOpenLearningHub?: () => void
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectBot,
  onOpenColab,
  onDownloadNotebook,
  onOpenRag,
  onTriggerGitHubLearning,
  onToggleVoice,
  onNewChat,
  onToast,
  onOpenLearningHub,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build command list
  const actions: CommandPaletteAction[] = useMemo(() => {
    const list: CommandPaletteAction[] = []

    // 1. Notebook actions
    list.push({
      id: 'open-colab',
      title: 'Launch Google Colab',
      subtitle: 'Open clean ready-to-run GPU notebook with code in clipboard',
      icon: ExternalLink,
      category: 'Notebooks',
      badge: 'Colab',
      run: () => {
        onOpenColab()
        onClose()
      },
    })

    if (onDownloadNotebook) {
      list.push({
        id: 'download-ipynb',
        title: 'Download Jupyter Notebook (.ipynb)',
        subtitle: 'Export entire session as executable Jupyter v4 file',
        icon: Download,
        category: 'Notebooks',
        badge: '.ipynb',
        run: () => {
          onDownloadNotebook()
          onClose()
        },
      })
    }

    // 2. Swarm Bot Fleet
    N8N_BOTS.forEach((bot) => {
      list.push({
        id: `bot-${bot.id}`,
        title: `Switch to ${bot.name}`,
        subtitle: bot.description,
        icon: Bot,
        category: 'Bots',
        badge: bot.category.toUpperCase(),
        run: () => {
          onSelectBot(bot.id)
          if (onToast) onToast(`Switched to ${bot.name}`)
          onClose()
        },
      })
    })

    // 3. Automated Tools
    list.push({
      id: 'github-learning',
      title: 'Train GitHub Architectures (24/7 RAG)',
      subtitle: 'Ingest top trending repos into neural vector memory',
      icon: BrainCircuit,
      category: 'Tools',
      badge: 'Swarm',
      run: () => {
        onTriggerGitHubLearning()
        onClose()
      },
    })

    if (onOpenLearningHub) {
      list.push({
        id: 'open-learning-hub',
        title: 'Autonomous Learning Hub (24/7 Swarm)',
        subtitle: 'Inspect all 11 bot mastery levels, active GitHub architectures & principles',
        icon: Sparkles,
        category: 'Tools',
        badge: 'Mastery',
        run: () => {
          onOpenLearningHub()
          onClose()
        },
      })
    }

    list.push({
      id: 'open-rag',
      title: 'Advanced RAG & Documents',
      subtitle: 'Upload documents, PDFs, codebases, and query embeddings',
      icon: Database,
      category: 'Tools',
      badge: 'RAG',
      run: () => {
        onOpenRag()
        onClose()
      },
    })

    if (onToggleVoice) {
      list.push({
        id: 'toggle-voice',
        title: 'Toggle Voice Companion',
        subtitle: 'Hands-free voice recognition and conversational speech',
        icon: Volume2,
        category: 'Tools',
        badge: 'Voice',
        run: () => {
          onToggleVoice()
          onClose()
        },
      })
    }

    // 4. Session actions
    list.push({
      id: 'new-chat',
      title: 'Start Fresh Conversation',
      subtitle: 'Clear current workspace session and memory buffer',
      icon: Plus,
      category: 'Actions',
      badge: 'Reset',
      run: () => {
        onNewChat()
        onClose()
      },
    })

    return list
  }, [
    onOpenColab,
    onDownloadNotebook,
    onSelectBot,
    onTriggerGitHubLearning,
    onOpenRag,
    onToggleVoice,
    onNewChat,
    onClose,
    onToast,
  ])

  // Filter actions
  const filtered = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase()
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.badge && a.badge.toLowerCase().includes(q))
    )
  }, [actions, query])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run()
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          />

          {/* Palette Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl bg-slate-900/95 border border-white/15 rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_24px_rgba(0,212,255,0.15)] overflow-hidden flex flex-col z-10"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" strokeWidth={1.75} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, bot name, or action (e.g. 'colab', 'architect', 'ipynb')..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none font-medium"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/50 bg-white/5 border border-white/10 rounded">
                ESC to close
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-white/40 hover:text-white sm:hidden"
                aria-label="Close command palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions List */}
            <div className="max-h-[60vh] overflow-y-auto nemi-scroll p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-white/40">
                  No matching commands found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((action, idx) => {
                  const Icon = action.icon
                  const isSelected = idx === selectedIndex

                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.run}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/15 border border-cyan-400/30 text-white'
                          : 'hover:bg-white/[0.04] text-white/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                              : 'bg-white/5 text-white/60 border-white/10'
                          }`}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.65} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {action.title}
                          </div>
                          <div className="text-[11px] text-white/50 truncate">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {action.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                              isSelected
                                ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {action.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected ? 'text-cyan-300 translate-x-0.5' : 'text-white/20'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-950/80 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono">↓</kbd> to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono">↵</kbd> to select
                </span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400/80">NEMI Swarm Command</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
