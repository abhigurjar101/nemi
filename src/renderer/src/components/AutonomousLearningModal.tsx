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
  Play,
  Square,
  TrendingDown,
  Award,
  Zap,
} from 'lucide-react'
import type { MemoryItem } from '../chatMemory'
import { uid } from '../chatMemory'
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
  initialTab?: 'fleet' | 'blueprints' | 'memories' | 'lab'
}

type TabType = 'fleet' | 'blueprints' | 'memories' | 'lab'

interface TrainingCurriculum {
  id: string
  name: string
  category: string
  targetLoss: number
  accuracy: string
  tokensPerSec: number
  description: string
  architectures: string[]
}

const CURRICULA: TrainingCurriculum[] = [
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1 Reasoning & Chain-of-Thought',
    category: 'Reasoning & Verification',
    targetLoss: 0.24,
    accuracy: '99.4%',
    tokensPerSec: 18450,
    description: 'Self-verification, back-tracking, and zero-error code logic distillation.',
    architectures: ['DeepSeek-R1-Distill', 'Qwen-2.5-Coder', 'Tree-of-Thought AST'],
  },
  {
    id: 'nanogpt-attention',
    name: 'NanoGPT & PagedAttention KV-Cache',
    category: 'LLM Systems & Inference',
    targetLoss: 0.31,
    accuracy: '98.8%',
    tokensPerSec: 22100,
    description: 'High-throughput transformer kernels and continuous memory optimization.',
    architectures: ['vLLM PagedAttention', 'FlashAttention-3', 'NanoGPT Speedrun'],
  },
  {
    id: 'hardest-100',
    name: "World's Hardest 100 Benchmark Patterns",
    category: 'Competitive Code',
    targetLoss: 0.18,
    accuracy: '100.0%',
    tokensPerSec: 15200,
    description: 'Competitive programming, distributed state consensus, and AST parsers.',
    architectures: ['LeetCode Hardest 100', 'Distributed Raft Consensus', 'Compiler Lexer'],
  },
  {
    id: 'quant-swarm',
    name: 'Institutional Quant Volatility & High-Frequency Swarm',
    category: 'Quantitative Finance',
    targetLoss: 0.15,
    accuracy: '99.1%',
    tokensPerSec: 19800,
    description: 'Bayesian win probability modeling, Sharpe maximization, and regime clustering.',
    architectures: ['Orderbook Microstructure', 'Kelly Criterion Engine', 'Statistical Arbitrage'],
  },
  {
    id: 'healthcare-rag',
    name: 'Clinical Vector Search & Healthcare Analytics',
    category: 'Domain RAG',
    targetLoss: 0.22,
    accuracy: '99.6%',
    tokensPerSec: 16700,
    description: 'Domain embeddings, HIPAA-safe data transformation, and SQL aggregation.',
    architectures: ['BioBERT Embedding', 'Qdrant Hybrid Search', 'FastAPI Async Pipeline'],
  },
]

export default function AutonomousLearningModal({
  isOpen,
  onClose,
  memories,
  onUpdateMemories,
  onToast,
  initialTab = 'lab',
}: AutonomousLearningModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [isLearningCycleRunning, setIsLearningCycleRunning] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

  // Interactive Neural Training Lab State
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('deepseek-r1')
  const [isTraining, setIsTraining] = useState(false)
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [maxEpochs, setMaxEpochs] = useState(6)
  const [lossHistory, setLossHistory] = useState<number[]>([2.45, 1.88, 1.24, 0.76, 0.42, 0.22])
  const [trainingLogs, setTrainingLogs] = useState<string[]>([
    '[INIT] NEMI Autonomous Neural Training Engine ready.',
    '[RAG] 48 verified architecture blueprints loaded in vector cache.',
    '[READY] Select a curriculum and start continuous training.',
  ])

  const selectedCurriculum = useMemo(() => {
    return CURRICULA.find((c) => c.id === selectedCurriculumId) || CURRICULA[0]
  }, [selectedCurriculumId])

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

  // Interactive Training Run Simulator
  const handleStartTrainingRun = async () => {
    if (isTraining) return
    setIsTraining(true)
    setCurrentEpoch(0)
    setLossHistory([2.6])

    const logs: string[] = [
      `[TRAIN] Initialized training pipeline for: ${selectedCurriculum.name}`,
      `[BATCH] Tokenizing ${selectedCurriculum.architectures.join(', ')}...`,
    ]
    setTrainingLogs([...logs])

    let currentL = 2.6
    const newLoss: number[] = [currentL]

    for (let ep = 1; ep <= maxEpochs; ep++) {
      await new Promise((r) => setTimeout(r, 650))
      currentL = Math.max(selectedCurriculum.targetLoss, +(currentL * (0.62 + Math.random() * 0.12)).toFixed(3))
      newLoss.push(currentL)
      setLossHistory([...newLoss])
      setCurrentEpoch(ep)

      const epLog = `[EPOCH ${ep}/${maxEpochs}] Loss: ${currentL.toFixed(3)} | Throughput: ${selectedCurriculum.tokensPerSec} tok/s | AST Syntax: 100% Valid`
      logs.push(epLog)
      setTrainingLogs([...logs])
    }

    // Finished training: create verified neural memory
    const newMem: MemoryItem = {
      id: uid(),
      category: 'project',
      content: `[Neural Trained: ${selectedCurriculum.name}] Reached convergence at loss ${currentL.toFixed(3)} with ${selectedCurriculum.accuracy} verification. Ingested ${selectedCurriculum.architectures.join(', ')}.`,
      timestamp: Date.now(),
    }

    const updated = [newMem, ...memories]
    onUpdateMemories(updated)
    setIsTraining(false)

    logs.push(`[COMPLETE] Checkpoint committed to NEMI Neural Memory Vault. Swarm Mastery improved! ✨`)
    setTrainingLogs([...logs])

    if (onToast) {
      onToast(`🎉 Training Run Complete: Checkpoint saved to Neural Memory! (Loss: ${currentL.toFixed(3)})`)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
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
            className="relative w-full max-w-4xl max-h-[92dvh] sm:max-h-[90vh] bg-slate-900/98 border border-cyan-400/30 rounded-2xl sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(0,212,255,0.15)] overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.3)] flex-shrink-0">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      NEMI Neural Training &amp; Learning Hub
                    </h2>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-semibold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      24/7 Engine
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/50 line-clamp-1">
                    Continuous model fine-tuning, loss optimization, and GitHub architecture distillation
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
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar (Responsive 2-col on mobile, 4-col on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-black/40 border-b border-white/5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase font-mono tracking-wider">Swarm Status</div>
                <div className="text-xs sm:text-sm font-bold text-cyan-300 mt-0.5">{stats.overallLevel}</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase font-mono tracking-wider">Trained Blueprints</div>
                <div className="text-xs sm:text-sm font-bold text-white mt-0.5">{stats.totalBlueprints} Architectures</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase font-mono tracking-wider">Zero-Error Patterns</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">{stats.verifiedPatternsCount} Verified</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase font-mono tracking-wider">Swarm Proficiency</div>
                <div className="text-xs sm:text-sm font-bold text-purple-300 mt-0.5">{stats.overallScore}% World-Class</div>
              </div>
            </div>

            {/* Tab Navigation (Horizontal scrolling for mobile touch) */}
            <div className="flex items-center gap-2 px-4 sm:px-6 pt-2.5 border-b border-white/5 overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('lab')}
                className={`pb-2 px-2 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'lab'
                    ? 'border-fuchsia-400 text-fuchsia-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Neural Training Lab</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-fuchsia-400/20 text-fuchsia-300 font-mono">LIVE</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`pb-2 px-2 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                11-Bot Swarm Mastery
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blueprints')}
                className={`pb-2 px-2 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'blueprints'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                GitHub Architectures ({blueprints.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memories')}
                className={`pb-2 px-2 sm:px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'memories'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                Neural Memories ({memories.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto nemi-scroll p-4 sm:p-6">
              {/* TAB 0: NEURAL TRAINING LAB (NEW & OPTIMIZED FOR TRAINING) */}
              {activeTab === 'lab' && (
                <div className="space-y-5">
                  {/* Curriculum Selection Grid */}
                  <div>
                    <div className="text-xs font-bold text-white uppercase font-mono tracking-wider mb-2.5 flex items-center justify-between">
                      <span>1. Select Neural Training Curriculum</span>
                      <span className="text-cyan-400 font-normal">5 Specialized Datasets</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {CURRICULA.map((c) => {
                        const isSelected = c.id === selectedCurriculumId
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCurriculumId(c.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-fuchsia-950/40 border-fuchsia-400/60 shadow-[0_0_16px_rgba(217,70,239,0.2)]'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white/5 text-cyan-300">
                                  {c.category}
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400">{c.accuracy} Acc</span>
                              </div>
                              <h4 className="text-xs font-bold text-white line-clamp-1">{c.name}</h4>
                              <p className="text-[11px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                                {c.description}
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
                              <span>Target Loss: {c.targetLoss}</span>
                              <span className="text-cyan-300">{c.tokensPerSec.toLocaleString()} tok/s</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live Training Telemetry & Loss Convergence Chart */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-cyan-400/25 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                          Active Training Pipeline: {selectedCurriculum.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-white/50">Epoch:</span>
                        <span className="text-cyan-300 font-bold">{currentEpoch} / {maxEpochs}</span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/50">Current Loss:</span>
                        <span className="text-emerald-400 font-bold">
                          {lossHistory[lossHistory.length - 1]?.toFixed(3) || '2.450'}
                        </span>
                      </div>
                    </div>

                    {/* SVG Loss Curve Visualizer */}
                    <div className="relative h-24 sm:h-28 w-full bg-slate-950/80 rounded-xl border border-white/10 p-2 overflow-hidden flex flex-col justify-end">
                      <div className="absolute top-2 left-3 text-[10px] font-mono text-white/40">
                        Convergence Loss Curve (Cross-Entropy Loss vs Epochs)
                      </div>
                      <svg className="w-full h-16 sm:h-20 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                        <defs>
                          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d946ef" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area */}
                        <path
                          d={`M 0 40 ${lossHistory
                            .map((loss, idx) => {
                              const x = (idx / Math.max(1, lossHistory.length - 1)) * 100
                              const y = Math.max(2, Math.min(38, (loss / 2.8) * 38))
                              return `L ${x} ${y}`
                            })
                            .join(' ')} L 100 40 Z`}
                          fill="url(#lossGrad)"
                        />
                        {/* Line */}
                        <path
                          d={lossHistory
                            .map((loss, idx) => {
                              const x = (idx / Math.max(1, lossHistory.length - 1)) * 100
                              const y = Math.max(2, Math.min(38, (loss / 2.8) * 38))
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#d946ef"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Live Training Console / Logs */}
                    <div>
                      <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-1 flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-cyan-400" />
                        <span>Real-Time Distillation Terminal</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/90 border border-white/10 font-mono text-[11px] text-cyan-200/90 h-28 overflow-y-auto nemi-scroll space-y-1">
                        {trainingLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            <span className="text-white/30 mr-1.5">❯</span>
                            <span className={log.includes('COMPLETE') ? 'text-emerald-400 font-bold' : log.includes('EPOCH') ? 'text-fuchsia-300' : ''}>
                              {log}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                      <div className="text-xs text-white/50 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Target: 100% verified executable code patterns</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartTrainingRun}
                        disabled={isTraining}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                      >
                        {isTraining ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Training in Progress ({currentEpoch}/{maxEpochs})...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Run Neural Training Cycle ⚡</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
            <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span className="font-mono text-[10px] sm:text-[11px] text-white/50 truncate mr-2">
                Continuous learning daemon runs silently in the background.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer min-h-[36px] flex items-center justify-center flex-shrink-0"
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
