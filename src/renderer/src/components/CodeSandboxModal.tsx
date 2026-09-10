/**
 * NEMI In-Browser Interactive WASM Code Sandbox & REPL Modal
 * Executes JavaScript/TypeScript and Python code safely in the client,
 * with real-time stdout, execution time profiling, and benchmark problem loading.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Play, RotateCcw, Clock, CheckCircle2, AlertCircle, Copy, Check, X } from 'lucide-react'
import { runCodeInSandbox, type ExecutionResult } from '../services/codeRunner'

export const CodeSandboxModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  initialCode?: string
  initialLanguage?: 'javascript' | 'python'
}> = ({ isOpen, onClose, initialCode, initialLanguage = 'javascript' }) => {
  const [language, setLanguage] = useState<'javascript' | 'python'>(initialLanguage)
  const [code, setCode] = useState(
    initialCode ||
      `// High-Performance Algorithm Sandbox\nfunction calculatePrimes(max) {\n  const sieve = new Uint8Array(max);\n  const primes = [];\n  for (let i = 2; i < max; i++) {\n    if (!sieve[i]) {\n      primes.push(i);\n      for (let j = i * 2; j < max; j += i) sieve[j] = 1;\n    }\n  }\n  return primes;\n}\n\nconst start = performance.now();\nconst list = calculatePrimes(50000);\nconsole.log(\`Found \${list.length} primes in \${(performance.now() - start).toFixed(2)}ms\`);\nconsole.log('Sample primes:', list.slice(0, 10));\n`
  )
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleExecute = async () => {
    setIsRunning(true)
    const res = await runCodeInSandbox(code, language)
    setResult(res)
    setIsRunning(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isOpen) {
        e.preventDefault()
        handleExecute()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, code, language, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="code-sandbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="code-sandbox-title" className="text-base font-bold text-cyan-200">
                In-Browser Web REPL & Code Sandbox
              </h3>
              <p className="text-xs text-slate-400">
                Execute client-side JS/TS & Python algorithms with zero server latency
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setLanguage('javascript')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  language === 'javascript'
                    ? 'bg-cyan-500/30 text-cyan-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JavaScript / TS
              </button>
              <button
                onClick={() => setLanguage('python')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  language === 'python'
                    ? 'bg-cyan-500/30 text-cyan-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python 3.12 (WASM)
              </button>
            </div>

            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-950/50 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Running...' : 'Run Code (⌘+Enter)'}</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor & Output Split Body */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800/80 overflow-hidden font-mono">
          {/* Code Editor */}
          <div className="flex flex-col h-full bg-black/40">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
              <span>Source Editor</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 p-4 bg-transparent text-xs text-slate-200 resize-none focus:outline-none font-mono leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Terminal / stdout */}
          <div className="flex flex-col h-full bg-slate-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
              <span>Terminal stdout / Output</span>
              {result && (
                <div className="flex items-center gap-2 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300">{result.executionTimeMs}ms</span>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto text-xs font-mono space-y-2">
              {!result && !isRunning && (
                <div className="text-slate-600 italic">Click "Run Code" or press ⌘+Enter to execute.</div>
              )}
              {isRunning && <div className="text-cyan-400 animate-pulse">Running in sandbox environment...</div>}
              {result && (
                <>
                  {result.stdout && (
                    <pre className="text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {result.stdout}
                    </pre>
                  )}
                  {result.stderr && (
                    <pre className="text-rose-400 whitespace-pre-wrap font-mono leading-relaxed">
                      {result.stderr}
                    </pre>
                  )}
                  {result.returnValue !== undefined && (
                    <div className="pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                      Return Value: <span className="text-cyan-300">{result.returnValue}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
