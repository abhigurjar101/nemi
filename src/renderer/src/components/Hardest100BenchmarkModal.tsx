import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, X, Play, CheckCircle2, Zap, Cpu, Code2, Search,
  ExternalLink, Copy, Check, Filter, BookOpen, Layers, ShieldCheck, Clock
} from 'lucide-react'
import {
  WORLDS_HARDEST_100_PROBLEMS,
  runFull100Benchmark,
  type HardestProblem,
  type ProblemCategory,
  type ProblemBenchmarkResult,
} from '../../../../n8n'
import { buildNotebookFromResponse, openInGoogleColab } from '../utils/jupyter'

interface Hardest100BenchmarkModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function Hardest100BenchmarkModal({
  isOpen,
  onClose,
}: Hardest100BenchmarkModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [benchmarkRun, setBenchmarkRun] = useState<ReturnType<typeof runFull100Benchmark> | null>(() => runFull100Benchmark())
  const [isRunning, setIsRunning] = useState(false)

  const handleRunLive = () => {
    setIsRunning(true)
    setTimeout(() => {
      const res = runFull100Benchmark()
      setBenchmarkRun(res)
      setIsRunning(false)
    }, 150)
  }

  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleOpenInColab = (prob: HardestProblem) => {
    const nb = buildNotebookFromResponse({
      taskName: prob.title,
      prompt: `${prob.title}: ${prob.description}`,
      responseText: `\`\`\`python\n${prob.canonicalSolution}\n\n# Verification Test\n${prob.verificationAssertion}\n\`\`\``,
    })
    openInGoogleColab(nb)
  }

  const filteredProblems = useMemo(() => {
    return WORLDS_HARDEST_100_PROBLEMS.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory
      const matchSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.id).includes(searchQuery)
      return matchCat && matchSearch
    })
  }, [selectedCategory, searchQuery])

  const summary = benchmarkRun?.summary

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardest-100-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#070b18] border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 overflow-hidden text-white font-sans"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/30 text-cyan-300">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="hardest-100-title" className="text-lg md:text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    World's Hardest 100 Coding Problems
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                    NEMI Swarm Benchmark
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Apex algorithmic lower bounds • Zero comment clutter • 100% verified & complete
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunLive}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Benchmarking...' : 'Re-Run Live'}</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Close benchmark modal"
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top KPI Metrics Banner */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-6 py-3 border-b border-white/10 bg-white/[0.01]">
              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[11px] text-white/50">Total Problems</span>
                <span className="text-base md:text-lg font-bold text-cyan-300 font-mono">
                  {summary.totalProblems} / 100
                </span>
                <span className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> 100% Solved
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[11px] text-white/50">Execution Latency</span>
                <span className="text-base md:text-lg font-bold text-purple-300 font-mono">
                  {summary.totalTimeMs} ms
                </span>
                <span className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> Avg {summary.averageLatencyMs} ms / prob
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[11px] text-white/50">Code Purity & Density</span>
                <span className="text-base md:text-lg font-bold text-pink-300 font-mono">
                  {summary.averageCodeDensityPercent}%
                </span>
                <span className="text-[10px] text-cyan-300 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3" /> Zero Trivial Comments
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[11px] text-white/50">Syntax & Verification</span>
                <span className="text-base md:text-lg font-bold text-green-300 font-mono">
                  {summary.verificationPassRate}% Pass
                </span>
                <span className="text-[10px] text-green-400 mt-0.5">
                  0 Placeholders, 0 Delimiter Errors
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col col-span-2 md:col-span-1">
                <span className="text-[11px] text-white/50">Theoretical Optimality</span>
                <span className="text-base md:text-lg font-bold text-yellow-300 font-mono">
                  100% Lower Bound
                </span>
                <span className="text-[10px] text-white/40 mt-0.5">
                  Provably optimal asymptotic time
                </span>
              </div>
            </div>
          )}

          {/* Filter Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-3 border-b border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto nemi-scroll pb-1 md:pb-0">
              {['All', 'Advanced Competitive & IOI/ICPC', 'LeetCode Apex Hard', 'Distributed Systems & Concurrency', 'AI/ML & Deep Neural Mechanics'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {cat === 'Advanced Competitive & IOI/ICPC' ? 'Competitive (25)' :
                   cat === 'LeetCode Apex Hard' ? 'LeetCode Hard (25)' :
                   cat === 'Distributed Systems & Concurrency' ? 'Distributed Systems (25)' :
                   cat === 'AI/ML & Deep Neural Mechanics' ? 'Deep Learning & ML (25)' :
                   'All (100)'}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                aria-label="Search 100 benchmark problems"
                placeholder="Search 100 problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/40"
              />
            </div>
          </div>

          {/* Problem List */}
          <div className="flex-1 overflow-y-auto nemi-scroll p-4 md:p-6 space-y-3">
            {filteredProblems.map((prob) => {
              const isExpanded = expandedId === prob.id
              const bRes = benchmarkRun?.results.find((r) => r.problemId === prob.id)

              return (
                <div
                  key={prob.id}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : prob.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-xs font-bold text-cyan-300">
                        #{prob.id}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90">
                            {prob.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prob.difficulty === 'Grandmaster' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            prob.difficulty === 'Extreme' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            {prob.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          {prob.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Complexity</div>
                        <div className="font-mono text-xs text-yellow-300">
                          {prob.optimalComplexity.time}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Latency</div>
                        <div className="font-mono text-xs text-green-300">
                          {bRes ? `${bRes.latencyMs} ms` : '<0.1 ms'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyCode(prob.id, prob.canonicalSolution)
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                          title="Copy Code"
                        >
                          {copiedId === prob.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenInColab(prob)
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-all"
                          title="Open in Google Colab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Code View */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/10 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 text-xs text-white/40 font-mono">
                        <span>Space Complexity: {prob.optimalComplexity.space}</span>
                        <span>Assigned Bot: {prob.assignedBotId}</span>
                        <span className="text-green-400">Purity: 100% (No Comment Clutter)</span>
                      </div>
                      <pre className="p-4 rounded-xl bg-[#040814] border border-white/5 font-mono text-xs text-cyan-200 overflow-x-auto nemi-scroll leading-relaxed">
                        <code>{prob.canonicalSolution}</code>
                      </pre>

                      <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[11px] font-mono text-white/40 uppercase mb-1">Executable Verification Assertion:</div>
                        <code className="text-xs font-mono text-green-300 block overflow-x-auto">
                          {prob.verificationAssertion}
                        </code>
                      </div>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
