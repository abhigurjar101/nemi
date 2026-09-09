import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Sparkles,
  Bot,
  CheckCircle2,
  Cpu,
  BookOpen,
  GitBranch,
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  Layers,
  Activity,
  Terminal,
} from 'lucide-react'
import type { MemoryItem } from '../chatMemory'
import {
  calculateSwarmMastery,
  runAutonomousGitHubLearningCycle,
  type SwarmMasteryStats,
  type BotMasteryProfile,
} from '../utils/autonomousLearning'
import { getAllLearnedBlueprints, type GitHubArchitectureBlueprint } from '../../../../n8n/blueprints'

export interface AutonomousLearningModalProps {
  isOpen: boolean
  onClose: () => void
  memories: MemoryItem[]
  onUpdateMemories: (mems: MemoryItem[]) => void
  onToast?: (message: string) => void
}

type TabType = 'fleet' | 'blueprints' | 'memories'

export default function AutonomousLearningModal({
  isOpen,
  onClose,
  memories,
  onUpdateMemories,
  onToast,
}: AutonomousLearningModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('fleet')
  const [isLearningCycleRunning, setIsLearningCycleRunning] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

  const stats: SwarmMasteryStats = useMemo(() => {
    return calculateSwarmMastery(memories)
  }, [memories])

  const blueprints: GitHubArchitectureBlueprint[] = useMemo(() => {
    return getAllLearnedBlueprints()
  }, [memories])

  const handleRunLearningCycle = async () => {
    setIsLearningCycleRunning(true)
    try {
      const res = await runAutonomousGitHubLearningCycle(memories)
      onUpdateMemories(res.newMemories)
      if (onToast) {
        onToast('Autonomous Learning Cycle Complete: Synchronized all 11 bots with GitHub blueprints!')
      }
    } finally {
      setIsLearningCycleRunning(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/98 border border-cyan-400/30 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(0,212,255,0.15)] overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.3)]">
                  <Brain className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-wide">NEMI Autonomous Learning Hub</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      24/7 Continuous
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    Real-time knowledge synthesis across all 11 autonomous bots from top GitHub code architectures
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunLearningCycle}
                  disabled={isLearningCycleRunning}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  title="Force an instant learning cycle across GitHub architectures"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLearningCycleRunning ? 'animate-spin' : ''}`} />
                  <span>{isLearningCycleRunning ? 'Learning...' : 'Sync GitHub'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-black/40 border-b border-white/5">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Swarm Status</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">{stats.overallLevel}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Mastered Blueprints</div>
                <div className="text-sm font-bold text-white mt-0.5">{stats.totalBlueprints} Repositories</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Verified Patterns</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{stats.verifiedPatternsCount} Zero-Error</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Swarm Proficiency</div>
                <div className="text-sm font-bold text-purple-300 mt-0.5">{stats.overallScore}% World-Class</div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                11 Bot Swarm Mastery
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blueprints')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'blueprints'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                Ingested GitHub Architectures ({blueprints.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memories')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'memories'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                Dynamic Neural Memories ({memories.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto nemi-scroll p-6">
              {/* TAB 1: 11 BOT FLEET MASTERY */}
              {activeTab === 'fleet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {stats.botProfiles.map((bot) => (
                    <div
                      key={bot.botId}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-400/30 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xs font-bold">
                              {bot.shortName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">
                                {bot.name}
                              </div>
                              <div className="text-[10px] text-white/40">{bot.category}</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {bot.proficiency}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-white/5 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                            style={{ width: `${bot.proficiency}%` }}
                          />
                        </div>

                        {/* Mastered Skills */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {bot.masteredSkills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-white/60 border border-white/5"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                        <span>{bot.level}</span>
                        <span className="text-cyan-400/80 font-mono">
                          {bot.relevantBlueprints.length} GitHub Domains
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: INGESTED GITHUB BLUEPRINTS */}
              {activeTab === 'blueprints' && (
                <div className="space-y-4">
                  {blueprints.map((bp) => (
                    <div
                      key={bp.repo}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-mono font-bold text-white">{bp.repo}</span>
                          <span className="text-xs text-white/60">— {bp.title}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30">
                          {bp.category}
                        </span>
                      </div>

                      <p className="text-xs text-white/70 leading-relaxed">{bp.summary}</p>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider font-semibold">
                          Ingested Principles
                        </span>
                        <ul className="space-y-0.5">
                          {bp.principles.map((p, idx) => (
                            <li key={idx} className="text-[11px] text-white/80 flex items-start gap-1.5">
                              <span className="text-cyan-400">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {bp.codeSnippet && (
                        <div className="mt-2">
                          <span className="text-[10px] font-mono uppercase text-white/40 tracking-wider">
                            Verified Pattern Blueprint
                          </span>
                          <pre className="mt-1 p-2.5 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono text-cyan-200 overflow-x-auto max-h-32 nemi-scroll">
                            {bp.codeSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: DYNAMIC NEURAL MEMORIES */}
              {activeTab === 'memories' && (
                <div className="space-y-2">
                  {memories.length === 0 ? (
                    <div className="py-8 text-center text-xs text-white/40">
                      No memories recorded yet. Ask NEMI to write or verify code to see autonomous learning in action!
                    </div>
                  ) : (
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                              {mem.category || 'project'}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                              {new Date(mem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-white/85 leading-relaxed break-words">{mem.content}</p>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-1" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-950/80 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span className="font-mono text-[11px] text-white/50">
                Continuous learning daemon runs silently in the background every 15 minutes.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
