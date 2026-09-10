/**
 * NEMI 100% Offline Mode & Local WebGPU SLM Modal
 * Manages on-device neural model selection, WebGPU hardware acceleration probing,
 * weight caching, and local prompt synthesis.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, Cpu, Zap, Download, Play, CheckCircle2, X } from 'lucide-react'
import {
  globalLocalSLMEngine,
  AVAILABLE_LOCAL_MODELS,
  type LocalSLMModel,
  type LocalInferenceStats,
} from '../services/localSLMEngine'

export const OfflineModeModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [selectedModel, setSelectedModel] = useState<LocalSLMModel>(globalLocalSLMEngine.getActiveModel())
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [gpuInfo, setGpuInfo] = useState<{ supported: boolean; adapterName?: string }>({
    supported: true,
    adapterName: 'WebGPU Hardware Accelerated',
  })
  const [testPrompt, setTestPrompt] = useState('Explain why cache locality matters in matrix multiplication.')
  const [output, setOutput] = useState('')
  const [stats, setStats] = useState<LocalInferenceStats | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    globalLocalSLMEngine.checkWebGPUSupport().then(setGpuInfo)
  }, [isOpen])

  const handlePreload = async () => {
    setIsPreloading(true)
    await globalLocalSLMEngine.preloadModel((pct) => setPreloadProgress(pct))
    setIsPreloading(false)
  }

  const handleGenerate = async () => {
    setIsRunning(true)
    setOutput('')
    const res = await globalLocalSLMEngine.generateOfflineResponse(testPrompt, (tok) => {
      setOutput((prev) => prev + tok)
    })
    setStats(res.stats)
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
      aria-labelledby="offline-mode-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 id="offline-mode-title" className="text-base font-bold text-cyan-200">
                100% Offline Mode (Local WebGPU SLM)
              </h3>
              <p className="text-xs text-slate-400">
                Run local neural models in browser VRAM with zero external cloud dependencies
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Hardware Status */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300">GPU Acceleration Pipeline</span>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {gpuInfo.adapterName || 'Active'}
            </span>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-slate-400 font-semibold">Available Local SLM Models</label>
            <div className="space-y-2">
              {AVAILABLE_LOCAL_MODELS.map((model) => {
                const isSelected = model.id === selectedModel.id
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model)
                      globalLocalSLMEngine.setModel(model.id)
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-200">{model.name}</span>
                      <span className="font-mono text-[10px] text-cyan-400">{model.sizeMb} MB</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{model.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preload button / progress */}
          {isPreloading ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Loading model weights into WebGPU VRAM...</span>
                <span className="font-mono text-cyan-300">{preloadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handlePreload}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Preload Weights ({selectedModel.sizeMb} MB)</span>
            </button>
          )}

          {/* Test Offline Generation */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
              />
              <button
                onClick={handleGenerate}
                disabled={isRunning}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? 'Running...' : 'Generate'}</span>
              </button>
            </div>
          </div>

          {/* Output Display */}
          {output && (
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800 font-mono text-xs text-slate-200 space-y-2">
              <div className="text-emerald-300 whitespace-pre-wrap">{output}</div>
              {stats && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Speed: <strong className="text-cyan-300">{stats.tokensPerSecond} tps</strong></span>
                  <span>TTFT: <strong className="text-cyan-300">{stats.timeToFirstTokenMs}ms</strong></span>
                  <span>Tokens: <strong className="text-cyan-300">{stats.tokensGenerated}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
