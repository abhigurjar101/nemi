/**
 * NEMI Universal Command Palette (Cmd + K / Ctrl + K)
 * Keyboard-first fuzzy command launcher across all 15 system capabilities:
 * Vector Indexing, WebGPU Shaders, Sandbox REPL, Swarm DAG, Passkeys, Mesh Sync, etc.
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Sparkles, Terminal, Shield, Mic, Cpu, HardDrive, Share2,
  GitBranch, Zap, Volume2, Bot, Layers, Trophy, Key, Play, X
} from 'lucide-react'

export interface CommandItem {
  id: string
  title: string
  category: 'Intelligence' | 'Engineering' | 'Security' | 'Voice' | 'Settings'
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
}

export const UniversalCommandPalette: React.FC<{
  isOpen: boolean
  onClose: () => void
  onTriggerAction: (actionKey: string) => void
}> = ({ isOpen, onClose, onTriggerAction }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    {
      id: 'cmd_swarm_dag',
      title: 'Open Autonomous Multi-Agent Swarm DAG Visualizer',
      category: 'Intelligence',
      icon: Bot,
      shortcut: '⌘S',
      action: () => onTriggerAction('open_swarm_dag'),
    },
    {
      id: 'cmd_code_sandbox',
      title: 'Launch In-Browser Interactive WASM Code Sandbox & REPL',
      category: 'Engineering',
      icon: Terminal,
      shortcut: '⌘R',
      action: () => onTriggerAction('open_code_sandbox'),
    },
    {
      id: 'cmd_hardest_100',
      title: 'Run World\'s Hardest 100 Coding Problems Benchmark',
      category: 'Engineering',
      icon: Trophy,
      shortcut: '⌘B',
      action: () => onTriggerAction('open_hardest_100'),
    },
    {
      id: 'cmd_crypto_vault',
      title: 'Zero-Knowledge E2E Encryption & WebAuthn Passkeys',
      category: 'Security',
      icon: Shield,
      shortcut: '⌘K',
      action: () => onTriggerAction('open_crypto_vault'),
    },
    {
      id: 'cmd_voice_engine',
      title: 'Configure Sub-150ms Full-Duplex Voice & VAD Engine',
      category: 'Voice',
      icon: Mic,
      shortcut: '⌘V',
      action: () => onTriggerAction('open_voice_engine'),
    },
    {
      id: 'cmd_branching_tree',
      title: 'Time-Travel Conversation Graph & Context Tree Debugger',
      category: 'Intelligence',
      icon: GitBranch,
      shortcut: '⌘T',
      action: () => onTriggerAction('open_branching_tree'),
    },
    {
      id: 'cmd_p2p_mesh',
      title: 'Peer-to-Peer Local Mesh Sync & WebRTC Discovery',
      category: 'Engineering',
      icon: Share2,
      shortcut: '⌘M',
      action: () => onTriggerAction('open_p2p_mesh'),
    },
    {
      id: 'cmd_offline_mode',
      title: '100% Offline Mode with WebLLM & Local SLMs',
      category: 'Intelligence',
      icon: HardDrive,
      action: () => onTriggerAction('open_offline_mode'),
    },
    {
      id: 'cmd_telemetry_hud',
      title: 'Toggle Real-Time Telemetry & Token Latency HUD',
      category: 'Settings',
      icon: Zap,
      action: () => onTriggerAction('toggle_telemetry_hud'),
    },
    {
      id: 'cmd_vector_search',
      title: 'Query Local HNSW Vector Index & Memory Embeddings',
      category: 'Intelligence',
      icon: Cpu,
      action: () => onTriggerAction('open_vector_search'),
    },
  ]

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-palette-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden font-sans"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-cyan-500/20 bg-cyan-950/30">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            id="universal-palette-title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Type a command, feature, or natural language action..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching commands or actions found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon
              const isSelected = idx === selectedIndex

              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action()
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-900/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{cmd.title}</div>
                      <div className="text-[10px] text-slate-400">{cmd.category}</div>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900/80 rounded border border-slate-800">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
