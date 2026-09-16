/**
 * NEMI Multi-Agent Swarm DAG Execution Visualizer Modal
 * Visualizes dynamic DAG nodes, real-time agent state progression,
 * token flow, and multi-agent consensus synthesis.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Play, CheckCircle2, Clock, ShieldAlert, Sparkles, X, Activity } from 'lucide-react'
import { SwarmDAGOrchestrator, type SwarmDAGExecution } from '../services/swarmOrchestrator'

export const SwarmDagModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [orchestrator] = useState(() => new SwarmDAGOrchestrator())
  const [execution, setExecution] = useState<SwarmDAGExecution>(orchestrator.getExecution())
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async () => {
    setIsRunning(true)
    await orchestrator.runDAG((updated) => {
      setExecution({ ...updated })
    })
    setIsRunning(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swarm-dag-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 id="swarm-dag-title" className="text-base font-bold text-cyan-200">
                Autonomous Multi-Agent Swarm Orchestrator
              </h3>
              <p className="text-xs text-slate-400">
                Real-time Directed Acyclic Graph (DAG) task routing & consensus engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition ${
                isRunning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold'
              }`}
            >
              {isRunning ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Executing Swarm...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Dispatch Swarm DAG</span>
                </>
              )}
            </button>
            <button onClick={onClose} aria-label="Close Swarm DAG modal" className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Agent Fleet Status */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Active Agent Collective
            </h4>
            <div className="grid grid-cols-5 gap-3">
              {execution.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 flex flex-col items-center text-center"
                >
                  <span className="text-2xl mb-1">{agent.avatar}</span>
                  <div className="text-xs font-bold text-slate-200">{agent.name}</div>
                  <div className="text-[10px] text-cyan-400">{agent.role}</div>
                  <div className="mt-2 text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {agent.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DAG Pipeline Visualizer */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Execution Pipeline (DAG Nodes)
            </h4>
            <div className="space-y-3">
              {execution.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border transition ${
                    node.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                      : node.status === 'running'
                      ? 'bg-cyan-950/30 border-cyan-400/60 text-cyan-100 animate-pulse'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold bg-slate-800 text-slate-300">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold">{node.label}</div>
                        <div className="text-[10px] opacity-75">
                          Assigned: {execution.agents.find((a) => a.id === node.agentId)?.name} ({execution.agents.find((a) => a.id === node.agentId)?.role})
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono">
                      {node.status === 'completed' && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{node.executionTimeMs}ms</span>
                        </span>
                      )}
                      {node.status === 'running' && (
                        <span className="text-cyan-400 font-semibold">Running...</span>
                      )}
                      {node.status === 'pending' && <span className="text-slate-500">Queued</span>}
                    </div>
                  </div>
                  {node.output && (
                    <div className="mt-2.5 p-2 rounded-lg bg-black/40 text-[11px] font-mono opacity-90">
                      {node.output}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Consensus Box */}
          {execution.finalConsensus && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/40 text-emerald-200">
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Multi-Agent Consensus Verified</span>
              </div>
              <p className="text-xs font-mono">{execution.finalConsensus}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
