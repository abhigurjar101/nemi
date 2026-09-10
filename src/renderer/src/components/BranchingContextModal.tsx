/**
 * NEMI Branching Context & Time-Travel Tree Modal
 * Visualizes conversation checkpoints, creates parallel exploration branches,
 * and allows switching between multiple thought pathways.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, GitFork, RotateCcw, Plus, CheckCircle2, MessageSquare, X } from 'lucide-react'
import { BranchingContextManager, type TreeNode } from '../services/branchingMemory'

export const BranchingContextModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [manager] = useState(() => {
    const mgr = new BranchingContextManager('Algorithm Exploration Session')
    const n1 = mgr.addMessage('user', 'Can you optimize the prime sieve with SIMD bit-packing?')
    const n2 = mgr.addMessage('assistant', 'Here is the baseline 64-bit word packed bitset implementation.')
    mgr.createBranch(n1.id, 'alternative-segmented-sieve')
    mgr.addMessage('assistant', 'Segmented Cache-Oblivious Sieve alternative for L1 cache optimization.')
    return mgr
  })

  const [tree, setTree] = useState(manager.getTree())
  const [newBranchName, setNewBranchName] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState(tree.activeNodeId)

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return
    manager.createBranch(selectedNodeId, newBranchName.trim())
    setTree({ ...manager.getTree() })
    setSelectedNodeId(manager.getTree().activeNodeId)
    setNewBranchName('')
  }

  const handleSwitchNode = (id: string) => {
    manager.switchActiveNode(id)
    setTree({ ...manager.getTree() })
    setSelectedNodeId(id)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const history = manager.getLinearHistory(selectedNodeId)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="branching-tree-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 id="branching-tree-title" className="text-base font-bold text-cyan-200">
                Time-Travel Context Tree & Branching Engine
              </h3>
              <p className="text-xs text-slate-400">
                Explore parallel thought paths, fork responses, and restore checkpoints
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800/80 overflow-hidden text-xs">
          {/* Left: Branch Nodes Graph */}
          <div className="flex flex-col h-full p-4 overflow-y-auto space-y-3 bg-black/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Conversation Tree Nodes</span>
              <span className="text-[10px] text-slate-500 font-mono">{Object.keys(tree.nodes).length} nodes</span>
            </div>

            <div className="space-y-2">
              {Object.values(tree.nodes).map((node) => {
                const isSelected = node.id === selectedNodeId
                const isActive = node.id === tree.activeNodeId

                return (
                  <div
                    key={node.id}
                    onClick={() => handleSwitchNode(node.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
                        [{node.branchName}] • {node.role}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/30 text-cyan-300 font-mono">
                          HEAD
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-200 truncate">{node.content}</div>
                  </div>
                )
              })}
            </div>

            {/* Fork new branch input */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-slate-400 font-semibold">Fork New Branch from Selected Node</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. quantum-variant"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
                <button
                  onClick={handleCreateBranch}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fork</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Active Linear Path */}
          <div className="flex flex-col h-full p-4 overflow-y-auto space-y-3 bg-slate-950">
            <div className="font-semibold text-slate-300">Active Branch Timeline (Linear Execution)</div>
            <div className="space-y-3">
              {history.map((node, idx) => (
                <div key={node.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-cyan-300 uppercase">{node.role}</span>
                    <span className="font-mono">{new Date(node.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-200">{node.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
