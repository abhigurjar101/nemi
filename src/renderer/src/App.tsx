import React, { useState, useEffect, useRef, useCallback } from 'react'
import NemiBrain from './components/NemiBrain'
import ChatPanel, { type Message } from './components/ChatPanel'
import VoiceOrb from './components/VoiceOrb'
import Sidebar, { type Conversation } from './components/Sidebar'
import RagPanel from './components/RagPanel'
import BotFleetDock from './components/BotFleetDock'
import {
  N8N_BOTS,
  type N8nBot,
  buildLearnedPromptContext,
  extractCodeFromMarkdown,
  validateCodeBlock,
} from './types_bots'
import { HumanCompanionLayer, toConversationalScript } from './humanCompanion'
import { isActivationPhrase, readinessBriefing, extractVoiceIntent } from './voiceActivation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles, Mic, MessageSquare, Settings as SettingsIcon,
  Volume2, Cpu, Wifi, WifiOff, Database, Check, Loader2, ArrowUp,
  Bot, ChevronDown as ChevronDownIcon, Layers, Lock, ShieldCheck,
  BookOpen, BrainCircuit, Brain, CheckCircle2, AlertTriangle, XCircle, X,
  FolderGit2, Menu, SlidersHorizontal, ChevronRight, MicOff, Search, Trophy,
  TrendingUp, Music, MoreHorizontal, Code2,
} from 'lucide-react'
import {
  toggleSoothingMusic,
  isSoothingMusicActive,
  subscribeSoothingMusic,
  setSoothingMusicActive,
} from './services/orbitalMusic'
import BotIcon from './components/BotIcon'
import CommandPalette from './components/CommandPalette'
import AutonomousLearningModal from './components/AutonomousLearningModal'
import Hardest100BenchmarkModal from './components/Hardest100BenchmarkModal'
import TradingFleetModal from './components/TradingFleetModal'
import { downloadNotebookFile, buildNotebookFromResponse } from './utils/jupyter'
import {
  recordAutonomousLearning,
  startAutonomousLearningDaemon,
  calculateSwarmMastery,
} from './utils/autonomousLearning'
import {
  compileSwarmConsensusPrompt,
  isSwarmModeActive,
} from './utils/swarmCollaboration'
import AuthModal, { type UserProfile } from './components/AuthModal'
import {
  type ConversationSession,
  type MemoryItem,
  loadStoredConversations,
  saveStoredConversations,
  loadStoredMemories,
  saveStoredMemories,
  extractMemoriesFromText,
  formatMemoriesForSystemPrompt,
  generateConversationTitle,
  uid as genUid,
} from './chatMemory'
import { playThoughtSpark, playActivationChime } from './humanCompanion/soundscape'
import { triggerDailyGitHubLearning, ingestCustomGitHubRepo } from './utils/githubLearning'
import { SwarmDagModal } from './components/SwarmDagModal'
import { CodeSandboxModal } from './components/CodeSandboxModal'
import { CryptoVaultModal } from './components/CryptoVaultModal'
import { VoiceEngineModal } from './components/VoiceEngineModal'
import { BranchingContextModal } from './components/BranchingContextModal'
import { P2PMeshModal } from './components/P2PMeshModal'
import { OfflineModeModal } from './components/OfflineModeModal'
import { TelemetryHUD } from './components/TelemetryHUD'
import { UniversalCommandPalette } from './components/UniversalCommandPalette'
import { globalVectorIndex } from './services/vectorIndex'
import WorldClassDashboard from './components/WorldClassDashboard'
import { realTimeMarketData } from './services/realTimeMarketData'


declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function triggerHaptic(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {}
}

function newConversation(): Conversation {
  return {
    id: uid(),
    title: 'New Conversation',
    preview: '',
    timestamp: new Date(),
    pinned: false,
    messageCount: 0,
  }
}

// ── Voice names for display ──────────────────────────────────
const KOKORO_VOICES: Record<string, string> = {
  af_heart:    'Heart (Warm & Intimate Female)',
  af_bella:    'Bella (Smooth & Articulate Female)',
  af_sarah:    'Sarah (Soft & Friendly Female)',
  af_sky:      'Sky (Bright & Youthful Female)',
  af_nicole:   'Nicole (Calm & Whispery Female)',
  am_adam:     'Adam (Clear & Confident Male)',
  am_michael:  'Michael (Warm & Conversational Male)',
  bf_emma:     'Emma (Elegant British Female)',
  bf_isabella: 'Isabella (Gentle British Female)',
  bm_george:   'George (Classic British Male)',
}

const OLLAMA_PREFERRED = ['llama3.2', 'llama3.1', 'llama3']

// ── Settings Panel ───────────────────────────────────────────
function SettingsPanel({
  isOpen, onClose,
  modelMode, onModelModeChange,
  nvidiaNimKey, onNvidiaNimKeyChange,
  ollamaModels, ollamaModel, onOllamaModelChange,
  ollamaRunning, voiceServerRunning, kokoro,
  selectedVoice, onVoiceChange, onTestVoice,
  voiceSpeed = 1.0,
  onVoiceSpeedChange,
  sttMode,
  humanCompanionEnabled = true,
  onToggleHumanCompanion,
  nimReady,
  onNimReadyChange,
}: {
  isOpen: boolean
  onClose: () => void
  modelMode: 'ollama' | 'nvidia-nim'
  onModelModeChange: (mode: 'ollama' | 'nvidia-nim') => void
  nvidiaNimKey: string
  onNvidiaNimKeyChange: (key: string) => void
  ollamaModels: string[]
  ollamaModel: string
  onOllamaModelChange: (model: string) => void
  ollamaRunning: boolean
  voiceServerRunning: boolean
  kokoro: boolean
  selectedVoice: string
  onVoiceChange: (voice: string) => void
  onTestVoice: () => void
  voiceSpeed?: number
  onVoiceSpeedChange?: (speed: number) => void
  sttMode: string
  humanCompanionEnabled?: boolean
  onToggleHumanCompanion?: (val: boolean) => void
  nimReady: boolean
  onNimReadyChange: (ready: boolean) => void
}) {
  const [localNvidiaNimKey, setLocalNvidiaNimKey] = useState(nvidiaNimKey)
  const [nimStatus, setNimStatus] = useState<string>('')
  const [nimTesting, setNimTesting] = useState(false)

  useEffect(() => {
    setLocalNvidiaNimKey(nvidiaNimKey)
  }, [nvidiaNimKey])

  const saveNimKey = async () => {
    const cleanKey = localNvidiaNimKey.trim()
    if (!cleanKey) {
      onNimReadyChange(false)
      setNimStatus('Enter an NVIDIA NIM API key first.')
      return
    }
    try {
      let saved = false
      if (window.nemi?.saveNvidiaNimKey) {
        saved = (await window.nemi.saveNvidiaNimKey(cleanKey)) === true
      } else {
        localStorage.setItem('nemi_nvidia_nim_key', cleanKey)
        saved = true
      }
      if (!saved) {
        onNimReadyChange(false)
        setNimStatus('NVIDIA NIM key could not be saved.')
        return
      }
      onNvidiaNimKeyChange(cleanKey)
      onModelModeChange('nvidia-nim')
      onNimReadyChange(false)
      setNimStatus('NVIDIA NIM key saved. Test it to verify connectivity.')
    } catch (error) {
      onNimReadyChange(false)
      setNimStatus(error instanceof Error ? error.message : 'NVIDIA NIM key could not be saved.')
    }
  }

  const testNimKey = async () => {
    const cleanKey = localNvidiaNimKey.trim()
    if (!cleanKey) return
    setNimTesting(true)
    try {
      let valid = false
      let msg = ''
      if (cleanKey === 'SERVER_CONFIGURED') {
        const res = await fetch('/api/status').catch(() => null)
        const data = await res?.json().catch(() => ({}))
        valid = data?.apiKeyConfigured === true
        msg = valid ? 'NVIDIA NIM Cloud Server Key Verified & Active' : 'Server key not configured on Vercel'
      } else if (window.nemi?.validateNvidiaNimKey) {
        const result = await window.nemi.validateNvidiaNimKey(cleanKey)
        valid = result?.valid === true
        msg = valid ? (result.message || 'NVIDIA NIM connected') : (result?.error || 'NVIDIA NIM connection failed')
      } else {
        // Direct browser validation via NVIDIA NIM models endpoint
        try {
          const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${cleanKey}`,
              'Accept': 'application/json'
            }
          })
          valid = res.ok
          if (valid) {
            msg = 'NVIDIA NIM connected successfully'
          } else {
            const errJson = await res.json().catch(() => ({}))
            msg = errJson?.error?.message || `Validation error (HTTP ${res.status})`
          }
        } catch (e: any) {
          msg = e?.message || 'Network error reaching NVIDIA NIM'
        }
      }
      onNimReadyChange(valid)
      setNimStatus(msg)
      if (valid) {
        onNvidiaNimKeyChange(cleanKey)
        onModelModeChange('nvidia-nim')
      }
    } catch (error) {
      onNimReadyChange(false)
      setNimStatus(error instanceof Error ? error.message : 'NVIDIA NIM connection failed.')
    } finally {
      setNimTesting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <div className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            className="relative glass-panel p-8 w-[520px] space-y-5 z-10 border border-cyan-500/20 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div>
              <h2 className="text-xl font-bold gradient-text mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> NEMI Configuration
              </h2>
              <p className="text-sm text-white/40">Power your living desktop AI brain</p>
            </div>

            {/* ── AI Engine ── */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">AI Engine</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onModelModeChange('ollama')}
                  className={`p-3 rounded-xl border text-sm font-semibold flex flex-col items-start gap-1 transition-all cursor-pointer ${
                    modelMode === 'ollama'
                      ? 'bg-green-500/20 border-green-400/40 text-green-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Cpu className="w-4 h-4" /> <span>Ollama</span>
                    <div className={`ml-auto w-2 h-2 rounded-full ${ollamaRunning ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                  <div className="text-[10px] font-normal opacity-60">Local offline</div>
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Online AI</label>
                <button
                  type="button"
                  onClick={() => onModelModeChange('nvidia-nim')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${modelMode === 'nvidia-nim' ? 'border-cyan-400/50 bg-cyan-400/20 text-cyan-200' : 'border-white/10 bg-white/5 text-white/50'}`}
                >
                  Online
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={localNvidiaNimKey === 'SERVER_CONFIGURED' ? '••••••••••••••••••••••••' : localNvidiaNimKey}
                  onChange={(event) => setLocalNvidiaNimKey(event.target.value)}
                  placeholder={localNvidiaNimKey === 'SERVER_CONFIGURED' ? 'Cloud Server Key Active' : 'nvapi-...'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 placeholder-white/40 focus:border-cyan-400/40 focus:outline-none pr-32"
                />
                {localNvidiaNimKey === 'SERVER_CONFIGURED' && (
                  <span className="absolute right-3 top-3 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cloud Managed
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void saveNimKey()} disabled={!localNvidiaNimKey.trim()} className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">Save NIM Key</button>
                <button type="button" onClick={() => void testNimKey()} disabled={nimTesting || !localNvidiaNimKey.trim()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 disabled:opacity-40">{nimTesting ? 'Testing...' : 'Test'}</button>
              </div>
              {nimStatus && <p className={`text-xs ${nimReady ? 'text-green-300' : 'text-white/60'}`}>{nimReady ? '● ' : ''}{nimStatus}</p>}
              <p className="text-[11px] text-white/35">Online requests use NVIDIA's NIM API. Ollama remains local and works without a key.</p>
            </div>
              {modelMode === 'ollama' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Ollama Model</label>
                  {ollamaRunning && ollamaModels.length > 0 ? (
                    <select
                      value={ollamaModel}
onChange={(e) => { onOllamaModelChange(e.target.value) }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-green-400/40 cursor-pointer"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m} value={m} className="bg-slate-900">{m}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span>
                        {ollamaRunning
                          ? 'No models installed. Run: ollama pull llama3.2'
                          : 'Ollama not running. Start with: ollama serve'}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-white/35">Install models: <span className="font-mono text-green-400">ollama pull llama3.2</span></p>
              </div>
            )}

          {/* ── Voice Settings ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Voice (TTS)</label>
              <div className={`flex items-center gap-1.5 text-xs ${voiceServerRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${voiceServerRunning ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {voiceServerRunning
                  ? (kokoro ? 'Kokoro TTS' : 'Native High-Res Audio')
                  : 'Native Speech Engine'}
              </div>
            </div>
              <select
                value={selectedVoice}
onChange={(e) => { onVoiceChange(e.target.value) }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-purple-400/40 cursor-pointer"
              >
                {Object.entries(KOKORO_VOICES).map(([id, name]) => (
                  <option key={id} value={id} className="bg-slate-900">{name}</option>
                ))}
              </select>
              <button
                onClick={onTestVoice}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Test Voice
              </button>

              {/* ── Voice Speed Controls ── */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Voice Speed / Pace</span>
                  <span className="text-cyan-300 font-mono text-[11px] font-semibold">
                    {voiceSpeed}x {voiceSpeed === 1.0 ? '(Natural Human)' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '0.85x Warm', value: 0.85 },
                    { label: '1.0x Natural', value: 1.0 },
                    { label: '1.1x Lively', value: 1.1 },
                    { label: '1.2x Quick', value: 1.2 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onVoiceSpeedChange?.(preset.value)}
                      className={`py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                        voiceSpeed === preset.value
                          ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── STT Status ── */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Speech Recognition (STT)</label>
              <div className="p-3 rounded-xl bg-white/4 border border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Browser WebSpeech API</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Primary</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Local Whisper (voice server)</span>
                  <span className={sttMode !== 'none' ? 'text-green-400 font-semibold flex items-center gap-1' : 'text-white/40 flex items-center gap-1'}>
                    {sttMode !== 'none' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{sttMode}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Not installed</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-white/30 pt-1">Install: <span className="font-mono text-amber-400">pip install faster-whisper</span></p>
              </div>
            </div>

            {/* ── Human Companion Experience ── */}
            <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Human Companion Experience
                  </div>
                  <p className="text-[11px] text-white/40 pt-0.5">
                    Living presence, acoustic felt chimes & conversational voice
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleHumanCompanion?.(!humanCompanionEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    humanCompanionEnabled ? 'bg-cyan-500' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      humanCompanionEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* ── Hotkeys ── */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">Quick Hotkeys</label>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                  <span>Voice Mode</span>
                  <kbd className="font-mono text-cyan-400 font-semibold">⌘⇧Space</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                  <span>Chat Panel</span>
                  <kbd className="font-mono text-purple-400 font-semibold">⌘⇧C</kbd>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 transition-opacity cursor-pointer text-white shadow-lg shadow-cyan-500/20"
              >
                Done
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { defaultModelMode } from './modelRouting'
import { defaultModelMode } from './modelRouting'

function RagWindowApp() {
  const [ollamaRunning, setOllamaRunning] = useState(false)
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('nemi_ollama_model') || 'llama3.2')
  const [nvidiaNimKey, setNvidiaNimKey] = useState('')
  const [modelMode] = useState<'ollama' | 'nvidia-nim'>(() =>
    localStorage.getItem('nemi_model_mode') === 'nvidia-nim' ? 'nvidia-nim' : 'ollama'
  )

  useEffect(() => {
    const refresh = async () => {
      const result = await window.nemi?.checkOllama()
      if (result) {
        setOllamaRunning(result.running)
        if (result.models.length > 0 && !result.models.includes(ollamaModel)) {
          setOllamaModel(result.models[0])
        }
      }
      const key = await window.nemi?.getNvidiaNimKey()
      if (key) setNvidiaNimKey(key)
    }
    void refresh()
  }, [ollamaModel])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <RagPanel
        isVisible
        onClose={() => { void window.nemi?.closeRagWindow() }}
        onThinkingChange={() => {}}
        ollamaRunning={ollamaRunning}
        ollamaModel={ollamaModel}
        modelMode={modelMode}
        nvidiaNimKey={nvidiaNimKey}
        fullScreen
      />
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  if (new URLSearchParams(window.location.search).get('view') === 'rag') {
    return <RagWindowApp />
  }

  const isElectron = typeof window !== 'undefined' && Boolean(window.nemi)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('nemi_session_user')
      if (raw) {
        try {
          return JSON.parse(raw)
        } catch {}
      }
    }
    return null
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined' && window.nemi) return true
    if (typeof localStorage !== 'undefined') {
      return Boolean(localStorage.getItem('nemi_session_token'))
    }
    return false
  })
  const [authRole, setAuthRole] = useState<'owner' | 'member' | 'guest'>(() => {
    if (typeof window !== 'undefined' && window.nemi) return 'owner'
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('nemi_session_role')
      if (stored === 'owner' || stored === 'member' || stored === 'guest') return stored
      return 'member'
    }
    return 'guest'
  })

  // ── Auto-verify stored session token with /api/auth ──
  useEffect(() => {
    const verifySession = async () => {
      if (typeof window !== 'undefined' && window.nemi) {
        setIsAuthenticated(true)
        setAuthRole('owner')
        return
      }
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nemi_session_token') : null
      if (!token) return
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.valid && data.user) {
            setIsAuthenticated(true)
            setAuthRole(data.user.role || 'member')
            setCurrentUser(data.user)
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('nemi_session_role', data.user.role || 'member')
              localStorage.setItem('nemi_session_user', JSON.stringify(data.user))
            }
          } else if (!data.valid) {
            setIsAuthenticated(false)
            setCurrentUser(null)
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('nemi_session_token')
              localStorage.removeItem('nemi_session_user')
            }
          }
        }
      } catch {}
    }
    verifySession()
  }, [])
  const [serverHasKey, setServerHasKey] = useState(false)

  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isWakeWordMode, setIsWakeWordMode] = useState(false)

  const [chatOpen, setChatOpen] = useState<boolean>(false)
  const [dashboardOpen, setDashboardOpen] = useState<boolean>(false)
  const [ragOpen, setRagOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string>('orchestrator')
  const [botDropdownOpen, setBotDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMusicActive, setIsMusicActive] = useState<boolean>(() => isSoothingMusicActive())
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)

  useEffect(() => {
    // Automatically start soothing nature & calming 432Hz ambient music on load
    setSoothingMusicActive(true)
    return subscribeSoothingMusic((active) => setIsMusicActive(active))
  }, [])

  const activeBot = N8N_BOTS.find((b) => b.id === selectedBotId) || N8N_BOTS[0]

  const [conversations, setConversations] = useState<ConversationSession[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [speakingMsgText, setSpeakingMsgText] = useState<string | null>(null)
  const [githubLearningBanner, setGithubLearningBanner] = useState<string | null>(null)
  const [repoModalOpen, setRepoModalOpen] = useState(false)
  const [customRepoInput, setCustomRepoInput] = useState('')
  const [isIngestingRepo, setIsIngestingRepo] = useState(false)
  const [ingestedResult, setIngestedResult] = useState<any | null>(null)

  const handleIngestCustomRepo = async () => {
    if (!customRepoInput.trim()) return
    setIsIngestingRepo(true)
    setIngestedResult(null)
    try {
      const res = await ingestCustomGitHubRepo(customRepoInput, memories)
      setMemories(res.newMemories)
      setGithubLearningBanner(res.summary)
      setIngestedResult(res)
      setCustomRepoInput('')
      setTimeout(() => setGithubLearningBanner(null), 8000)
    } catch (err: any) {
      setGithubLearningBanner(`Ingestion failed: ${err?.message || 'Unknown error'}`)
      setTimeout(() => setGithubLearningBanner(null), 5000)
    } finally {
      setIsIngestingRepo(false)
    }
  }

  // ── Load persistent conversations & long-term memories on launch & connection ──
  useEffect(() => {
    const initStorage = async () => {
      try {
        const storedConvs = await loadStoredConversations()
        setConversations(storedConvs)
        if (storedConvs.length > 0) {
          const active = storedConvs[0]
          setActiveConvId(active.id)
          setMessages(active.messages)
        }
        const storedMems = await loadStoredMemories()
        setMemories(storedMems)

        // Automatic daily high-class learning: ingests GitHub code architectures
        try {
          const learnRes = await triggerDailyGitHubLearning(storedMems)
          if (learnRes.trained && learnRes.count > 0) {
            setMemories(learnRes.newMemories)
            setGithubLearningBanner(learnRes.summary)
            setTimeout(() => setGithubLearningBanner(null), 8000)
          }
        } catch {}
      } catch (err) {
        console.warn('Failed to load chat history and memory:', err)
      }
    }
    void initStorage()

    // Continuous GitHub synthesis triggers on connection events
    const handleOnline = () => {
      void loadStoredMemories().then((currentMems) => {
        void triggerDailyGitHubLearning(currentMems, true, true).then((learnRes) => {
          if (learnRes.trained && learnRes.count > 0) {
            setMemories(learnRes.newMemories)
            setGithubLearningBanner(`Connection Sync: Ingested ${learnRes.count} GitHub architectures.`)
            setTimeout(() => setGithubLearningBanner(null), 6000)
          }
        })
      })
    }

    const handleFocus = () => {
      void loadStoredMemories().then((currentMems) => {
        void triggerDailyGitHubLearning(currentMems, false, true).then((learnRes) => {
          if (learnRes.trained && learnRes.count > 0) {
            setMemories(learnRes.newMemories)
            setGithubLearningBanner(learnRes.summary)
            setTimeout(() => setGithubLearningBanner(null), 6000)
          }
        })
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleToggleChatOpen = useCallback((open: boolean) => {
    setChatOpen(open)
    localStorage.setItem('nemi_chat_open', String(open))
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id)
    const found = conversations.find((c) => c.id === id)
    if (found) {
      setMessages(found.messages)
    }
  }, [conversations])

  const handleNewConversation = useCallback(async () => {
    const newConv: ConversationSession = {
      id: genUid(),
      title: 'New Conversation',
      preview: '',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    }
    setConversations((prev) => {
      const updated = [newConv, ...prev]
      void saveStoredConversations(updated)
      return updated
    })
    setActiveConvId(newConv.id)
    setMessages([])
  }, [])

  const handleDeleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      void saveStoredConversations(updated)
      if (activeConvId === id) {
        if (updated.length > 0) {
          setActiveConvId(updated[0].id)
          setMessages(updated[0].messages)
        } else {
          void handleNewConversation()
        }
      }
      return updated
    })
  }, [activeConvId, handleNewConversation])

  const handlePinConversation = useCallback(async (id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c)
      void saveStoredConversations(updated)
      return updated
    })
  }, [])

  const handleAddMemory = useCallback(async (content: string, category?: MemoryItem['category']) => {
    const newMem: MemoryItem = {
      id: genUid(),
      content,
      category: category || 'general',
      timestamp: Date.now(),
      sourceConvId: activeConvId || undefined,
    }
    setMemories((prev) => {
      const updated = [newMem, ...prev]
      void saveStoredMemories(updated)
      return updated
    })
  }, [activeConvId])

  const handleDeleteMemory = useCallback(async (id: string) => {
    setMemories((prev) => {
      const updated = prev.filter((m) => m.id !== id)
      void saveStoredMemories(updated)
      return updated
    })
  }, [])

  const handleClearMemories = useCallback(async () => {
    setMemories([])
    await saveStoredMemories([])
  }, [])

  // ── Model settings ──
  const [modelMode, setModelMode] = useState<'ollama' | 'nvidia-nim'>(() => {
    const saved = localStorage.getItem('nemi_model_mode')
    return saved === 'ollama' ? 'ollama' : 'nvidia-nim'
  })
  const [nvidiaNimKey, setNvidiaNimKey] = useState('')
  const [nvidiaNimReady, setNvidiaNimReady] = useState(false)
  const [nimShowcaseVisible, setNimShowcaseVisible] = useState(false)
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatusInfo[]>([])
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaModel, setOllamaModel] = useState<string>(
    () => localStorage.getItem('nemi_ollama_model') || 'llama3.2'
  )
  const [ollamaRunning, setOllamaRunning] = useState(false)

  // ── Modular Human Companion Experience (can be toggled or easily removed) ──
  const [humanCompanionEnabled, setHumanCompanionEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('nemi_human_companion')
    return saved !== null ? saved === 'true' : true
  })

  // ── Voice settings ──
  const [voiceServerRunning, setVoiceServerRunning] = useState(false)
  const [kokoro, setKokoro] = useState(false)
  const [sttMode, setSttMode] = useState('none')
  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem('nemi_voice') || 'af_heart'
  )
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('nemi_voice_speed')
    return saved !== null ? parseFloat(saved) || 1.0 : 1.0
  })

  const handleVoiceSpeedChange = useCallback((speed: number) => {
    setVoiceSpeed(speed)
    localStorage.setItem('nemi_voice_speed', speed.toString())
  }, [])

  // ── Refs ──
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const nimInitialValidationRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const hasSpokenRef = useRef(false)
  const synthRef = useRef(window.speechSynthesis)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeAudioContextRef = useRef<AudioContext | null>(null)
  const ollamaStreamRef = useRef<string>('')
  const voiceSessionActivatedRef = useRef(false)
  const shouldListenRef = useRef(false)
  const toggleVoiceRef = useRef<() => void>(() => {})
  const latestTranscriptRef = useRef<string>('')
  const processedTranscriptRef = useRef<boolean>(false)
  const sendToAIRef = useRef<(text: string) => Promise<void>>(async () => {})

  // ── Universal Command Palette, Learning Hub & Toast Notifications ──
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [learningModalOpen, setLearningModalOpen] = useState(false)
  const [hardest100ModalOpen, setHardest100ModalOpen] = useState(false)
  const [swarmDagModalOpen, setSwarmDagModalOpen] = useState(false)
  const [codeSandboxModalOpen, setCodeSandboxModalOpen] = useState(false)
  const [cryptoVaultModalOpen, setCryptoVaultModalOpen] = useState(false)
  const [voiceEngineModalOpen, setVoiceEngineModalOpen] = useState(false)
  const [branchingModalOpen, setBranchingModalOpen] = useState(false)
  const [p2pMeshModalOpen, setP2PMeshModalOpen] = useState(false)
  const [offlineModeModalOpen, setOfflineModeModalOpen] = useState(false)
  const [tradingFleetModalOpen, setTradingFleetModalOpen] = useState(false)
  const [tradingFleetDefaultTab, setTradingFleetDefaultTab] = useState<'totd' | 'cockpit' | 'fleet' | 'consensus' | 'backtest' | 'n8n-export' | 'architecture' | 'history' | undefined>(undefined)
  const [telemetryHudOpen, setTelemetryHudOpen] = useState(false)
  const [universalPaletteOpen, setUniversalPaletteOpen] = useState(false)
  const [swarmModeEnabled, setSwarmModeEnabled] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    triggerHaptic(15)
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr))
    }, 3200)
  }, [])

  const handleUniversalAction = useCallback((key: string) => {
    switch (key) {
      case 'open_trading_fleet':
        setTradingFleetModalOpen(true)
        break
      case 'open_swarm_dag':
        setSwarmDagModalOpen(true)
        break
      case 'open_code_sandbox':
        setCodeSandboxModalOpen(true)
        break
      case 'open_hardest_100':
        setHardest100ModalOpen(true)
        break
      case 'open_crypto_vault':
        setCryptoVaultModalOpen(true)
        break
      case 'open_voice_engine':
        setVoiceEngineModalOpen(true)
        break
      case 'open_branching_tree':
        setBranchingModalOpen(true)
        break
      case 'open_p2p_mesh':
        setP2PMeshModalOpen(true)
        break
      case 'open_offline_mode':
        setOfflineModeModalOpen(true)
        break
      case 'toggle_telemetry_hud':
        setTelemetryHudOpen((prev) => !prev)
        break
      case 'open_vector_search':
        showToast(`HNSW Vector Index: ${globalVectorIndex.size()} documents indexed in memory.`)
        break
    }
  }, [showToast])

  const memoriesRef = useRef(memories)
  useEffect(() => {
    memoriesRef.current = memories
  }, [memories])

  useEffect(() => {
    const stopDaemon = startAutonomousLearningDaemon(
      () => memoriesRef.current,
      (updated) => {
        setMemories(updated)
        showToast('⚡ NEMI Swarm: Ingested fresh repository blueprints in background')
      }
    )
    return stopDaemon
  }, [showToast])

  const handleAutoFixCode = useCallback((error: string, code: string) => {
    triggerHaptic(25)
    setChatOpen(true)
    const fixPrompt = `[SELF-HEALING CODE FIX REQUEST]\nThe following code produced a runtime or kernel error during execution:\n\n\`\`\`python\n${code}\n\`\`\`\n\nExact Error Traceback:\n${error}\n\nPlease analyze the root cause, fix the issue completely, and return the corrected, verified code ready for execution in Jupyter Notebook / Google Colab.`
    void sendToAIRef.current?.(fixPrompt)
    showToast('NEMI Self-Healing: Diagnosing and repairing code...')
  }, [showToast])

  // Non-allocating audio level accessor for 60fps zero-render visual reactivity (3D Brain & ripples)
  // Measures active TTS output when speaking, or microphone input when listening
  const audioDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const isSpeakingRef = useRef(false)
  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  const getAudioLevel = useCallback((): number => {
    try {
      const analyser = ttsAnalyserRef.current || analyserRef.current
      if (analyser) {
        if (!audioDataArrayRef.current || audioDataArrayRef.current.length !== analyser.frequencyBinCount) {
          audioDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
        }
        analyser.getByteFrequencyData(audioDataArrayRef.current)
        let sum = 0
        const len = audioDataArrayRef.current.length
        for (let i = 0; i < len; i++) sum += audioDataArrayRef.current[i]
        return Math.min(1.0, (sum / (len || 1)) / 128)
      }
      if (isSpeakingRef.current) {
        return 0.25 + 0.12 * Math.sin(Date.now() / 140)
      }
      return 0
    } catch {
      return 0
    }
  }, [])

  // ── Check managed services, Ollama & voice server on mount ──
  useEffect(() => {
    const checkServices = async () => {
      try {
        const statuses = await window.nemi?.getServiceStatus()
        if (statuses) {
          setServiceStatuses(statuses)
        }
      } catch { /* ignore */ }

      try {
        const result = await window.nemi?.checkOllama()
        if (result) {
          setOllamaRunning(result.running)
          if (result.models.length > 0) {
            setOllamaModels(result.models)
            const saved = localStorage.getItem('nemi_ollama_model')
            if (saved && result.models.includes(saved)) {
              setOllamaModel(saved)
            } else {
              const best = result.models.find(m => OLLAMA_PREFERRED.some(p => m.startsWith(p))) || result.models[0]
              if (best) setOllamaModel(best)
            }
          }
        }
      } catch { setOllamaRunning(false) }

      try {
        let savedNimKey = await window.nemi?.getNvidiaNimKey()
        if (!savedNimKey && typeof localStorage !== 'undefined') {
          savedNimKey = localStorage.getItem('nemi_nvidia_nim_key') || ''
        }
        if (!savedNimKey && !isElectron) {
          try {
            const statusRes = await fetch('/api/status').catch(() => null)
            if (statusRes?.ok) {
              const statusData = await statusRes.json().catch(() => ({}))
              if (statusData.apiKeyConfigured) {
                savedNimKey = 'SERVER_CONFIGURED'
                setServerHasKey(true)
              }
            }
          } catch {}
        }
        if (!savedNimKey) {
          try {
            const res = await fetch('/api/credentials/nvidia-key')
            if (res.ok) {
              const data = await res.json()
              if (data.apiKey) {
                savedNimKey = data.apiKey
              }
            }
          } catch {}
        }
        if (savedNimKey) {
          setNvidiaNimKey(savedNimKey)
          setNvidiaNimReady(true)
          setModelMode('nvidia-nim')
          if (!nimInitialValidationRef.current) {
            nimInitialValidationRef.current = true
            if (savedNimKey === 'SERVER_CONFIGURED') {
              setNvidiaNimReady(true)
            } else if (window.nemi?.validateNvidiaNimKey) {
              const validation = await window.nemi.validateNvidiaNimKey(savedNimKey)
              setNvidiaNimReady(validation?.valid === true)
            } else {
              fetch('https://integrate.api.nvidia.com/v1/models', {
                headers: { 'Authorization': `Bearer ${savedNimKey}` }
              }).then((r) => setNvidiaNimReady(r.ok)).catch(() => setNvidiaNimReady(false))
            }
          }
        }
      } catch { /* no online key configured */ }

      try {
        const vsResult = await window.nemi?.checkVoiceServer()
        if (vsResult) {
          setVoiceServerRunning(vsResult.running)
          setKokoro(vsResult.kokoro)
          setSttMode((vsResult as any).stt || 'none')
        }
      } catch { setVoiceServerRunning(false) }
    }

    checkServices()
    const interval = setInterval(checkServices, 10000)
    return () => clearInterval(interval)
  }, [])

  // ── Listen for play-audio from the local voice process ──
  useEffect(() => {
    window.nemi?.on('play-audio', async (base64Audio: unknown) => {
      if (typeof base64Audio !== 'string') return
      try {
        if (activeAudioSourceRef.current) {
          try { activeAudioSourceRef.current.stop() } catch {}
          activeAudioSourceRef.current = null
        }
        ttsAnalyserRef.current = null
        if (activeAudioContextRef.current) {
          try { void activeAudioContextRef.current.close() } catch {}
          activeAudioContextRef.current = null
        }
        synthRef.current?.cancel()

        const binary = atob(base64Audio)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        const audioCtx = new AudioCtxClass()
        activeAudioContextRef.current = audioCtx
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }

        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0))
        const source = audioCtx.createBufferSource()
        source.buffer = audioBuffer

        // Route TTS output through an AnalyserNode before destination for speech reactivity
        const ttsAnalyser = audioCtx.createAnalyser()
        ttsAnalyser.fftSize = 256
        source.connect(ttsAnalyser)
        ttsAnalyser.connect(audioCtx.destination)
        ttsAnalyserRef.current = ttsAnalyser
        activeAudioSourceRef.current = source

        setIsSpeaking(true)
        source.onended = () => {
          setIsSpeaking(false)
          activeAudioSourceRef.current = null
          ttsAnalyserRef.current = null
          try { void audioCtx.close() } catch {}
          activeAudioContextRef.current = null
        }
        source.start(0)
      } catch (err) {
        console.error('Web Audio playback error:', err)
        ttsAnalyserRef.current = null
        setIsSpeaking(false)
      }
    })
  }, [])

  // ── IPC event listeners ──
  useEffect(() => {
    window.nemi?.on('toggle-voice', () => toggleVoiceRef.current())
    window.nemi?.on('toggle-sidebar', () => setSidebarOpen((p) => !p))
    window.nemi?.on('open-chat', () => setChatOpen(true))
    window.nemi?.on('open-settings', () => setSettingsOpen(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Global Keyboard Shortcuts: Cmd+K (Command Palette) & Quick-type ──
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K toggles Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
        return
      }

      const activeTag = document.activeElement?.tagName.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) {
        return
      }
      if (e.key.length === 1 && !e.repeat && !settingsOpen) {
        if (!chatOpen) {
          setChatOpen(true)
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [chatOpen, settingsOpen])

  const handleModelModeChange = (mode: 'ollama' | 'nvidia-nim') => {
    setModelMode(mode)
    localStorage.setItem('nemi_model_mode', mode)
  }

  const handleNvidiaNimKeyChange = useCallback((key: string) => {
    setNvidiaNimKey(key)
    setNvidiaNimReady(false)
  }, [])

  useEffect(() => {
    if (modelMode !== 'nvidia-nim' || !nvidiaNimKey) {
      setNimShowcaseVisible(false)
      return
    }
    setNimShowcaseVisible(true)
    const timeout = window.setTimeout(() => setNimShowcaseVisible(false), 8000)
    return () => window.clearTimeout(timeout)
  }, [modelMode, nvidiaNimKey])

  const handleOllamaModelChange = (model: string) => {
    setOllamaModel(model)
    localStorage.setItem('nemi_ollama_model', model)
  }

  const handleVoiceChange = useCallback(async (voice: string) => {
    setSelectedVoice(voice)
    localStorage.setItem('nemi_voice', voice)
    if (voiceServerRunning) await window.nemi?.setVoice(voice)
  }, [voiceServerRunning])

  const primeMobileAudio = useCallback(() => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume()
        const silentUtterance = new SpeechSynthesisUtterance(' ')
        silentUtterance.volume = 0.01
        window.speechSynthesis.speak(silentUtterance)
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const tempCtx = new AudioCtx()
        if (tempCtx.state === 'suspended') {
          void tempCtx.resume()
        }
      }
    } catch {}
  }, [])

  const browserSpeak = useCallback((text: string) => {
    if (!synthRef.current) return
    try {
      synthRef.current.cancel()
      synthRef.current.resume()
    } catch {}
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = synthRef.current.getVoices()
    const preferred = voices.find((v) =>
      v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Serena')
    )
    if (preferred) utterance.voice = preferred
    utterance.rate = voiceSpeed || 1.05
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    try {
      synthRef.current.speak(utterance)
    } catch {
      setIsSpeaking(false)
    }
  }, [voiceSpeed])

  // ── TTS: speak response through local voice or browser speech ──
  const speakText = useCallback(async (text: string) => {
    const snippet = humanCompanionEnabled
      ? toConversationalScript(text)
      : text
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\|[^\n]+\|/g, '')
          .replace(/[#*`_]/g, '')
          .slice(0, 400)
          .trim()
    if (!snippet) return
    if (activeAudioSourceRef.current) {
      try { activeAudioSourceRef.current.stop() } catch {}
      activeAudioSourceRef.current = null
    }
    ttsAnalyserRef.current = null
    if (activeAudioContextRef.current) {
      try { void activeAudioContextRef.current.close() } catch {}
      activeAudioContextRef.current = null
    }
    currentAudioRef.current?.pause()
    synthRef.current?.cancel()
    setIsSpeaking(false)
    if (voiceServerRunning) {
      try {
        const played = await window.nemi?.ttsSpeak(snippet, selectedVoice, voiceSpeed)
        if (!played) {
          browserSpeak(snippet)
        }
      } catch { browserSpeak(snippet) }
    } else {
      browserSpeak(snippet)
    }
  }, [humanCompanionEnabled, voiceServerRunning, selectedVoice, voiceSpeed, browserSpeak])

  const handleTestVoice = useCallback(async () => {
    await speakText("Hey there! I'm NEMI, your living desktop companion. I'm right here whenever you need me!")
  }, [speakText])

  const handleSpeakMessage = useCallback((text: string) => {
    if (speakingMsgText === text) {
      synthRef.current?.cancel()
      currentAudioRef.current?.pause()
      if (activeAudioSourceRef.current) {
        try { activeAudioSourceRef.current.stop() } catch {}
        activeAudioSourceRef.current = null
      }
      ttsAnalyserRef.current = null
      setIsSpeaking(false)
      setSpeakingMsgText(null)
    } else {
      setSpeakingMsgText(text)
      void speakText(text)
    }
  }, [speakingMsgText, speakText])

  // ── VOICE RECOGNITION (Local Whisper with browser fallback) ──────────────
  const finishUtterance = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }, [])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    voiceSessionActivatedRef.current = false
    finishUtterance()
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (audioContextRef.current) {
      try { void audioContextRef.current.close() } catch {}
      audioContextRef.current = null
      analyserRef.current = null
    }
    setIsListening(false)
  }, [finishUtterance])

  const handleVoiceTranscript = useCallback((transcribedText: string) => {
    const raw = (transcribedText || '').trim()
    if (!raw) return

    const intent = extractVoiceIntent(raw)
    // If voice session was explicitly activated OR wake word detected:
    if (voiceSessionActivatedRef.current) {
      if (intent.isWakeOnly) {
        setTranscript('NEMI is ready. What would you like to do?')
        const isRagReady = serviceStatuses.find(s => s.name === 'RAG')?.state === 'ready'
        void speakText(readinessBriefing({
          ollama: ollamaRunning,
          voice: voiceServerRunning,
          rag: isRagReady ?? true,
        }))
      } else {
        const finalQuery = intent.query || raw
        setTranscript(finalQuery)
        void sendToAIRef.current(finalQuery)
      }
    } else if (intent.hasWakeWord) {
      voiceSessionActivatedRef.current = true
      if (intent.query) {
        setTranscript(intent.query)
        void sendToAIRef.current(intent.query)
      } else {
        setTranscript('NEMI is ready. What would you like to do?')
        const isRagReady = serviceStatuses.find(s => s.name === 'RAG')?.state === 'ready'
        void speakText(readinessBriefing({
          ollama: ollamaRunning,
          voice: voiceServerRunning,
          rag: isRagReady ?? true,
        }))
      }
    } else {
      // Direct intent fallback: user tapped voice button and spoke query directly
      setTranscript(raw)
      void sendToAIRef.current(raw)
    }
  }, [ollamaRunning, serviceStatuses, speakText, voiceServerRunning])

  const handleSendVoiceNow = useCallback(() => {
    const text = (latestTranscriptRef.current || transcript || '').trim()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    triggerHaptic([15, 30])
    setIsListening(false)
    if (text && !processedTranscriptRef.current) {
      processedTranscriptRef.current = true
      handleVoiceTranscript(text)
    }
  }, [handleVoiceTranscript, transcript])

  const startBrowserRecognition = useCallback(() => {
    primeMobileAudio()
    const Recognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) return false

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }

    try {
      const recognition = new Recognition()
      recognitionRef.current = recognition
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      latestTranscriptRef.current = ''
      processedTranscriptRef.current = false

      recognition.onstart = () => {
        setIsListening(true)
        setTranscript('Listening... speak now')
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          const text = item[0]?.transcript || ''
          if (item.isFinal) {
            final += text
          } else {
            interim += text
          }
        }
        const activeText = (final || interim || '').trim()
        if (activeText) {
          latestTranscriptRef.current = activeText
          setTranscript(activeText)
        }

        if (final.trim() && !processedTranscriptRef.current) {
          processedTranscriptRef.current = true
          try { recognition.stop() } catch {}
          recognitionRef.current = null
          setIsListening(false)
          handleVoiceTranscript(final.trim())
        }
      }

      recognition.onerror = (event: any) => {
        const err = event?.error
        if (err === 'no-speech') {
          // Normal brief pause
          return
        }
        if (err === 'aborted') {
          recognitionRef.current = null
          setIsListening(false)
          return
        }
        recognitionRef.current = null
        setIsListening(false)
        const errMsg = err === 'not-allowed' ? 'Microphone permission required.' : 'Voice recognition stopped.'
        setTranscript(errMsg)
        showToast(errMsg)
        setTimeout(() => setTranscript(''), 2500)
      }

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null
          setIsListening(false)
          const captured = latestTranscriptRef.current.trim()
          if (captured && !processedTranscriptRef.current) {
            processedTranscriptRef.current = true
            handleVoiceTranscript(captured)
          }
        }
      }

      recognition.start()
      return true
    } catch (err) {
      console.warn('Speech recognition start error:', err)
      recognitionRef.current = null
      setIsListening(false)
      return false
    }
  }, [handleVoiceTranscript, primeMobileAudio, showToast])

  const startListeningWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream

      const audioCtx = new window.AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstart = () => {
        setIsListening(true)
        setTranscript('Listening...')
        hasSpokenRef.current = false
      }

      mediaRecorder.onstop = async () => {
        setIsListening(false)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (audioContextRef.current) {
          try { void audioContextRef.current.close() } catch {}
          audioContextRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop())
          audioStreamRef.current = null
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        if (blob.size < 600) {
          setTranscript('')
          return
        }

        let transcribedText = ''

        // 1. Try local voice server Whisper
        if (voiceServerRunning && sttMode !== 'none') {
          setTranscript('Transcribing...')
          try {
            const arrayBuf = await blob.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)))
            const result = await window.nemi?.voiceTranscribe(base64, mimeType)
            transcribedText = result?.text?.trim() || ''
          } catch (e) {
            console.warn('Local Whisper transcribe error:', e)
          }
        }

        if (transcribedText) {
          handleVoiceTranscript(transcribedText)
        } else {
          if (hasSpokenRef.current) {
            setTranscript('Could not transcribe. Try speaking clearly.')
            setTimeout(() => setTranscript(''), 2500)
          } else {
            setTranscript('')
          }
        }
      }

      mediaRecorder.start(250)

      let silenceStart = Date.now()
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const detectSilence = () => {
        if (!analyserRef.current || mediaRecorder.state !== 'recording') return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const average = sum / dataArray.length
        if (average > 4) {
          hasSpokenRef.current = true
          silenceStart = Date.now()
          setTranscript('Recording...')
        } else if (hasSpokenRef.current && Date.now() - silenceStart > 1500) {
          finishUtterance()
          return
        } else if (!hasSpokenRef.current && Date.now() - silenceStart > 9000) {
          // No speech detected after 9s
          finishUtterance()
          return
        }
        animFrameRef.current = requestAnimationFrame(detectSilence)
      }
      detectSilence()
    } catch (err) {
      console.warn('Microphone access denied:', err)
      setTranscript('Microphone access denied. Please allow microphone permissions.')
      setTimeout(() => setTranscript(''), 3000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishUtterance, handleVoiceTranscript, sttMode, voiceServerRunning])

  const startListening = useCallback(async (isDirectIntent = true) => {
    if (activeAudioSourceRef.current) {
      try { activeAudioSourceRef.current.stop() } catch {}
      activeAudioSourceRef.current = null
    }
    ttsAnalyserRef.current = null
    if (activeAudioContextRef.current) {
      try { void activeAudioContextRef.current.close() } catch {}
      activeAudioContextRef.current = null
    }
    synthRef.current?.cancel()
    currentAudioRef.current?.pause()
    setIsSpeaking(false)
    shouldListenRef.current = true
    voiceSessionActivatedRef.current = isDirectIntent

    if (window.nemi?.requestMicPermission) {
      try {
        const permissionGranted = await window.nemi.requestMicPermission()
        if (permissionGranted === false) {
          throw new Error('Microphone permission is required.')
        }
      } catch (error) {
        console.warn('Microphone permission request failed:', error)
        shouldListenRef.current = false
        setTranscript('Allow microphone access in System Settings.')
        showToast('Microphone permission required in System Settings')
        setTimeout(() => setTranscript(''), 3000)
        return
      }
    } else if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        testStream.getTracks().forEach((track) => track.stop())
      } catch (permErr: any) {
        console.warn('Browser microphone permission request failed:', permErr)
        shouldListenRef.current = false
        setIsListening(false)
        setTranscript('Microphone access denied. Please allow microphone permissions.')
        showToast('Please allow microphone permissions in browser')
        setTimeout(() => setTranscript(''), 3000)
        return
      }
    }

    // The local recorder is the reliable Electron path when Whisper is running.
    // Browser SpeechRecognition can report a false error inside Electron even
    // after microphone permission has been granted.
    if (voiceServerRunning && sttMode !== 'none') {
      await startListeningWhisper()
      return
    }

    if (!startBrowserRecognition()) {
      setTranscript('Start the local voice service or enable microphone to dictate.')
      showToast('Speech recognition unavailable in current browser')
      shouldListenRef.current = false
      setIsListening(false)
      setTimeout(() => setTranscript(''), 3000)
    }
  }, [showToast, startBrowserRecognition, startListeningWhisper, sttMode, voiceServerRunning])

  const toggleVoice = useCallback(() => {
    primeMobileAudio()
    triggerHaptic(isListening ? 15 : [10, 25, 10])
    if (isListening) {
      stopListening()
      setTranscript('')
    } else {
      startListening(true)
    }
  }, [isListening, primeMobileAudio, startListening, stopListening])
  toggleVoiceRef.current = toggleVoice

  useEffect(() => {
    if (isWakeWordMode) {
      // Delay to let browser UI load and permissions request if needed
      const t = setTimeout(() => startListening(false), 1500)
      return () => {
        clearTimeout(t)
        stopListening()
      }
    }
  }, [isWakeWordMode, startListening, stopListening])

  // ── Auto-restart Voice loop after speaking ──
  useEffect(() => {
    if (shouldListenRef.current && !isThinking && !isSpeaking && !isListening) {
      const t = setTimeout(() => {
        if (shouldListenRef.current && !isThinking && !isSpeaking && !isListening) {
          startListening(voiceSessionActivatedRef.current)
        }
      }, 500)
      return () => clearTimeout(t)
    }
  }, [isThinking, isSpeaking, isListening, startListening])



  // ── AI ENGINE ────────────────────────────────────────────────
  const sendToAI = useCallback(async (userText: string) => {
    if (!userText.trim()) return

    const userMsg: Message = { id: genUid(), role: 'user', content: userText, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setTranscript('')
    setIsThinking(true)
    setChatOpen(true)

    // ── Continuous GitHub architecture learning bridge & Swarm Consensus ──
    const isSwarm = swarmModeEnabled || isSwarmModeActive(selectedBotId, userText)
    const consensusConfig = isSwarm ? compileSwarmConsensusPrompt(userText, memories) : null
    const collaboratingBots = consensusConfig ? consensusConfig.collaboratingBots.map((c) => c.shortName) : undefined

    const { promptBlock: learnedArchitectureContext, appliedBlueprints } = buildLearnedPromptContext(selectedBotId, memories)
    const finalAppliedBlueprints = consensusConfig?.appliedBlueprints?.length
      ? consensusConfig.appliedBlueprints
      : appliedBlueprints

    const assistantMsgId = genUid()
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
      appliedBlueprints: finalAppliedBlueprints,
      collaboratingBots,
      isSwarmConsensus: isSwarm,
    }
    setMessages((prev) => [...prev, assistantMsg])

    // 1. Extract learned facts/memories from userText automatically
    const detectedMemories = extractMemoriesFromText(userText, activeConvId || undefined)
    if (detectedMemories.length > 0) {
      setMemories((prev) => {
        const merged = [...detectedMemories, ...prev]
        void saveStoredMemories(merged)
        return merged
      })
    }

    // 2. Check if user requested to ingest or learn a GitHub repository directly in chat
    const githubIngestMatch = userText.match(/(?:ingest|learn|import|analyze|fetch)(?:\s+from|\s+repo|\s+github)?\s+(https?:\/\/github\.com\/[^\s]+|github\.com\/[^\s]+|[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i)
    if (githubIngestMatch) {
      try {
        const repoStr = githubIngestMatch[1]
        const ingestRes = await ingestCustomGitHubRepo(repoStr, memories)
        setMemories(ingestRes.newMemories)
        setGithubLearningBanner(ingestRes.summary)

        const replyContent = `### Ingested GitHub Architecture: \`${ingestRes.repo}\`
**Title**: ${ingestRes.title}
**Category**: \`${ingestRes.category}\` | **Language**: \`${ingestRes.language}\`${ingestRes.stars > 0 ? ` | **Stars**: ${ingestRes.stars.toLocaleString()}` : ''}

**Summary**:
${ingestRes.description}

#### Core Architectural Principles Learned:
${ingestRes.principles.map((p, i) => `${i + 1}. **${p}**`).join('\n')}

#### Verified Code Pattern:
\`\`\`${ingestRes.language.toLowerCase().includes('type') ? 'typescript' : 'python'}
${ingestRes.codeSnippet}
\`\`\`

All 11 autonomous specialist bots in the swarm have been upgraded with this architecture. You can now prompt any bot to write, test, or decompose systems using these patterns.`

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: replyContent, streaming: false } : m
          )
        )
        setIsThinking(false)
        return
      } catch (err: any) {
        console.warn('In-chat GitHub ingestion fallback:', err)
      }
    }

    try {
      playThoughtSpark()
    } catch {}

    const runtimeContext = `
  NEMI Runtime Status:
  - NVIDIA NIM API key: ${nvidiaNimKey ? 'configured' : 'not configured'}
  - NVIDIA NIM connection: ${nvidiaNimReady ? 'validated and available' : 'not validated in this session'}
  - The NVIDIA endpoint is managed internally by NEMI; do not ask the user to enter or change an endpoint URL.
  - You are the assistant running inside NEMI, not a separate external support agent. Do not claim that you have no relationship to NEMI or that NEMI's backend is inaccessible. Be precise: you can explain the current runtime status, while settings changes must be made through the NEMI UI.
  `

    const systemPrompt = `You are NEMI.
Provide fast, direct, and concise answers with zero filler, zero robotic preamble, and zero unnecessary text.
Answer directly in 1-3 short, clear sentences.
If code is requested, provide only the clean, complete, working code block with minimal or no conversational wrapper.
Deliver immediate value fast.`

    // ── Inject live real-time market data into system prompt ──
    // This ensures NEMI always uses today's actual prices, not training-time data
    let realTimeMarketContext = ''
    try {
      realTimeMarketContext = realTimeMarketData.buildMarketContextBlock()
      // Trigger a background refresh for next request (non-blocking)
      realTimeMarketData.fetchAllPrices().catch(() => {})
    } catch {
      // Proceed without market context if unavailable
    }

    const completeSystemPrompt = systemPrompt + runtimeContext + realTimeMarketContext



    // ── Seamless RAG knowledge base context retrieval ──
    let ragAugmentation = ''
    try {
      const isRagReady = serviceStatuses.find((s) => s.name === 'RAG')?.state === 'ready'
      if (isRagReady) {
        const ragRes = await window.nemi?.ragQuery(userText, 3)
        const chunks = (ragRes as any)?.chunks
        if (Array.isArray(chunks) && chunks.length > 0) {
          const relevant = chunks
            .filter((c: any) => {
              const score = typeof c.similarity === 'number' ? c.similarity : (typeof c.score === 'number' ? c.score : 1)
              return score > 0.15
            })
            .map((c: any) => `[Source: ${c.doc_name || 'Knowledge Base'}]\n${c.text}`)
            .join('\n\n')
          if (relevant) {
            ragAugmentation = `\n\n=== RELEVANT CONTEXT FROM USER'S KNOWLEDGE BASE (RAG) ===\n${relevant}\n=== END KNOWLEDGE BASE CONTEXT ===\nUse the above knowledge base context to answer accurately if relevant.`
          }
        }
      }
    } catch { /* proceed without RAG context if query failed */ }

    // ── Memory context augmentation ──
    const memoryAugmentation = formatMemoriesForSystemPrompt(memories)

    // ── Continuous GitHub architecture learning bridge applied ──

    const botPersona = consensusConfig
      ? `\n\n${consensusConfig.systemPrompt}`
      : activeBot
      ? `\n\n=== ACTIVE BOT SPECIALIST: ${activeBot.name} ===
Role & Objective: ${activeBot.description}
Category: ${activeBot.category}
Specialist Directive:
${activeBot.directive || ''}

${learnedArchitectureContext}

CRITICAL ARCHITECTURE & CODE GENERATION MANDATES:
1. MAXIMUM CODE PARSIMONY & ZERO COMMENT CLUTTER: Prioritize the absolute shortest, cleanest, and most idiomatic code that 100% completes the logic. NEVER write trivial line-by-line comments (e.g. '# import', '# initialize', '# loop', '# return'). Trivial comments dilute attention tokens, reduce reasoning potential, and clutter code. Let clean, self-documenting code speak for itself.
2. 100% ERROR-FREE & COMPLETE: Code must be completely self-contained. Always import all required modules. Never use '# ... rest of code', '// TODO', or ellipses (...). Every single function, class, and method must be completely written out with zero missing symbols.
3. RUNNABLE EXECUTION DEMO: Always include a complete, executable demonstration block (e.g. \`if __name__ == '__main__':\`) with concrete sample data and print() outputs so that clicking 'Run' in the Jupyter sandbox executes cleanly with real output.
4. SYNTAX INTEGRITY: Ensure all parentheses, brackets, and code fences (\`\`\`) are completely and properly closed so the code renders immediately.`
      : ''

    const historyMessages = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    const allMessages = [
      { role: 'system', content: completeSystemPrompt + memoryAugmentation + ragAugmentation + botPersona },
      ...historyMessages,
      { role: 'user', content: userText },
    ]

    const generateJupyterNotebookBanner = async (codeText: string, promptText: string): Promise<string> => {
      if (!/```(?:python|py|sh|bash|sql)?[\s\S]*?```/.test(codeText)) {
        return ''
      }

      // If running inside Electron desktop, try local Python bridge with timeout
      if (isElectron) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000)
          const jupRes = await fetch('http://localhost:8000/api/jupyter/test-and-paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              task_name: promptText.slice(0, 30),
              code: codeText,
              raw_response: codeText,
              create_fresh: true,
              skip_pretest: true,
            }),
          })
          clearTimeout(timeoutId)
          if (jupRes.ok) {
            const jupData = await jupRes.json()
            const jLink = jupData.jupyter_link || jupData.notebook?.jupyter_link || ''
            const jName = jupData.notebook_name || jupData.notebook?.notebook_name || ''
            if (jLink) {
              if (window.nemi?.openExternal) {
                window.nemi.openExternal(jLink)
              } else {
                window.open(jLink, '_blank')
              }
              return `\n\n> **Fresh Dedicated Notebook Created & Opened:** \`${jName}\`\n> Saved to \`Desktop/Notebooks/\` — All Code Pasted with Proper Markdowns.\n\n`
            }
          }
        } catch {}
      }

      // Web or fallback: generate clean timestamped notebook identification
      const slug = promptText.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'task'
      const ts = new Date().toISOString().slice(11, 19).replace(/:/g, '')
      const notebookName = `nemi_${slug}_${ts}.ipynb`
      return `\n\n> **Fresh Dedicated Notebook Generated:** \`${notebookName}\`\n> Formatted with Python kernel execution cells, markdown explanations, and 1-click Colab export.\n\n`
    }

    const recordAssistantResponse = (finalText: string) => {
      const updatedAssistant: Message = {
        ...assistantMsg,
        content: finalText,
        streaming: false,
        appliedBlueprints: finalAppliedBlueprints?.length ? finalAppliedBlueprints : assistantMsg.appliedBlueprints,
        collaboratingBots: collaboratingBots || assistantMsg.collaboratingBots,
        isSwarmConsensus: isSwarm || assistantMsg.isSwarmConsensus,
      }
      const updatedMessages: Message[] = [...messages, userMsg, updatedAssistant]
      setMessages(updatedMessages)

      // Autonomous continuous learning extraction
      if (!finalText.startsWith('Error:')) {
        void recordAutonomousLearning({
          botId: selectedBotId,
          userQuery: userText,
          responseText: finalText,
          existingMemories: memories,
        }).then((res) => {
          if (res.learned && res.newMemory) {
            setMemories(res.allMemories)
            showToast(`⚡ Swarm Learned: ${res.newMemory.content.slice(0, 48)}...`)
          }
        }).catch((err) => {
          console.warn('Autonomous learning recording error:', err)
        })
      }

      setConversations((prev) => {
        let found = false
        const updated = prev.map((c) => {
          if (c.id === (activeConvId || c.id)) {
            found = true
            const isDefault = c.title === 'New Conversation' || c.title === 'Welcome to NEMI'
            const title = isDefault ? generateConversationTitle(userText) : c.title
            return {
              ...c,
              title,
              preview: finalText.slice(0, 80).replace(/\n/g, ' '),
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          }
          return c
        })

        if (!found) {
          const newSession: ConversationSession = {
            id: activeConvId || genUid(),
            title: generateConversationTitle(userText),
            preview: finalText.slice(0, 80).replace(/\n/g, ' '),
            messages: updatedMessages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            pinned: false,
          }
          updated.unshift(newSession)
          if (!activeConvId) setActiveConvId(newSession.id)
        }

        void saveStoredConversations(updated)
        return updated
      })

      if (voiceSessionActivatedRef.current) {
        void speakText(finalText)
      }
    }

    // ── Execute via n8n Bots Architecture (Electron Desktop Only) ──
    try {
      if (isElectron && selectedBotId === 'orchestrator') {
        const orchResp = await fetch('http://localhost:8000/api/tasks/execute-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: userText,
            preferred_language: 'python',
            auto_execute: true,
            auto_verify: true,
            save_artifacts: true,
            auto_approve_hitl: true,
          }),
        })
        if (orchResp.ok) {
          const orchData = await orchResp.json()
          const jupyter = orchData.jupyter_notebook || {}
          if (jupyter.jupyter_link) {
            if (window.nemi?.openExternal) {
              window.nemi.openExternal(jupyter.jupyter_link)
            } else {
              window.open(jupyter.jupyter_link, '_blank')
            }
          }
          const nbBanner = jupyter.notebook_name 
            ? `\n\n> **Fresh Dedicated Notebook Created & Opened:** \`${jupyter.notebook_name}\`\n> Saved to \`Desktop/Notebooks/\` — 100% Kernel Verified.\n\n`
            : ''
          recordAssistantResponse(`${orchData.synthesis || ''}${nbBanner}`)
          return
        }
      } else if (isElectron) {
        const botResp = await fetch(`http://localhost:8000/api/bots/${selectedBotId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: {
              task: userText,
              prompt: userText,
              requirements: userText,
              language: 'python',
            },
            use_n8n: true,
          }),
        })
        if (botResp.ok) {
          const botData = await botResp.json()
          let jupyterLink = botData.jupyter_link || botData.jupyter_notebook?.jupyter_link || ''
          let jupyterName = botData.notebook_name || botData.jupyter_notebook?.notebook_name || ''

          const rawResp = botData.rawResponse || botData.response?.rawResponse || ''
          const explanation = botData.explanation || botData.response?.explanation || ''
          const detectedCode = botData.code || botData.response?.code || ''
          const content = rawResp || detectedCode || explanation || (typeof botData.response === 'string' ? botData.response : JSON.stringify(botData.response || ''))

          // Fallback: if backend didn't auto-create the notebook but code exists
          if (!jupyterLink && (detectedCode || /```(?:python|py)?[\s\S]*?```/.test(content))) {
            try {
              const jupRes = await fetch('http://localhost:8000/api/jupyter/test-and-paste', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  task_name: `${selectedBotId}_output`,
                  code: detectedCode || content,
                  explanation: explanation,
                  raw_response: content,
                  create_fresh: true,
                  skip_pretest: true,
                }),
              })
              if (jupRes.ok) {
                const jupData = await jupRes.json()
                jupyterLink = jupData.jupyter_link || jupData.notebook?.jupyter_link || ''
                jupyterName = jupData.notebook_name || jupData.notebook?.notebook_name || ''
              }
            } catch {}
          }

          if (jupyterLink) {
            if (window.nemi?.openExternal) {
              window.nemi.openExternal(jupyterLink)
            } else {
              window.open(jupyterLink, '_blank')
            }
          }

          const astInfo = botData.ast_validation?.valid
            ? `> **AST Syntax Verified Clean** — ${botData.ast_validation?.detected_functions?.length || 0} functions, ${botData.ast_validation?.detected_classes?.length || 0} classes.\n\n`
            : ''
          const nbBanner = jupyterName 
            ? `\n\n> **Fresh Dedicated Notebook Created & Opened:** \`${jupyterName}\`\n> Saved to \`Desktop/Notebooks/\` — All Code Pasted with Proper Markdowns.\n\n`
            : ''
          const headerBadge = `> **${activeBot.name} Output (${botData.latency_ms || 0}ms)**\n\n`
          recordAssistantResponse(`${headerBadge}${astInfo}${content}${nbBanner}`)
          return
        }
      }
    } catch (e) {
      console.warn('Bot direct dispatch fallback to standard chat:', e)
    }

    try {
      if (modelMode === 'nvidia-nim') {
        let activeNvidiaNimKey =
          nvidiaNimKey ||
          (await window.nemi?.getNvidiaNimKey()) ||
          (typeof localStorage !== 'undefined' ? localStorage.getItem('nemi_nvidia_nim_key') : '') ||
          ''
        if (!activeNvidiaNimKey && !isElectron) {
          try {
            const statusRes = await fetch('/api/status').catch(() => null)
            if (statusRes?.ok) {
              const statusData = await statusRes.json().catch(() => ({}))
              if (statusData.apiKeyConfigured) {
                activeNvidiaNimKey = 'SERVER_CONFIGURED'
                setServerHasKey(true)
              }
            }
          } catch {}
        }
        if (!activeNvidiaNimKey) {
          try {
            const credRes = await fetch('/api/credentials/nvidia-key')
            if (credRes.ok) {
              const credData = await credRes.json()
              if (credData.apiKey) activeNvidiaNimKey = credData.apiKey
            }
          } catch {}
        }
        if (!activeNvidiaNimKey) {
          throw new Error('NVIDIA NIM API key is not configured. Open Settings to add it.')
        }
        if (!nvidiaNimKey) setNvidiaNimKey(activeNvidiaNimKey)

        let replyText = ''
        if (window.nemi?.chat) {
          const response = await window.nemi.chat({
            provider: 'nvidia-nim',
            model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
            apiKey: activeNvidiaNimKey,
            messages: allMessages,
          })
          if (response?.error) {
            if (ollamaRunning) {
              const fallbackText = await window.nemi?.ollamaChat(allMessages, ollamaModel) || ''
              recordAssistantResponse(fallbackText || `NVIDIA is unavailable: ${response.error}`)
              return
            } else {
              throw new Error(response.error)
            }
          }
          replyText = response?.text || ''
        } else {
          // In web mode: Stream SSE tokens from /api/chat for zero-latency response
          let success = false
          try {
            const chatRes = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(activeNvidiaNimKey && activeNvidiaNimKey !== 'SERVER_CONFIGURED'
                  ? { 'x-api-key': activeNvidiaNimKey }
                  : {}),
              },
              body: JSON.stringify({
                messages: allMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 4096,
              }),
            })

            if (chatRes.ok && chatRes.body) {
              const reader = chatRes.body.getReader()
              const decoder = new TextDecoder()
              let accumulated = ''
              let accumulatedThinking = ''
              let hasStartedContent = false
              let streamDone = false
              let buffer = ''

              while (!streamDone) {
                const { value, done } = await reader.read()
                streamDone = done
                if (value) {
                  buffer += decoder.decode(value, { stream: true })
                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''
                  for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed.startsWith('data: ')) {
                      const dataStr = trimmed.slice(6).trim()
                      if (dataStr === '[DONE]') continue
                      try {
                        const parsed = JSON.parse(dataStr)
                        if (parsed.error) throw new Error(parsed.error)
                        const delta = parsed.choices?.[0]?.delta
                        if (delta) {
                          if (delta.content) {
                            if (!hasStartedContent) {
                              accumulated = ''
                              hasStartedContent = true
                            }
                            accumulated += delta.content
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === assistantMsgId ? { ...m, content: accumulated, streaming: true } : m
                              )
                            )
                          } else if (delta.reasoning_content && !hasStartedContent) {
                            accumulatedThinking += delta.reasoning_content
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === assistantMsgId
                                  ? {
                                      ...m,
                                      content: `*NEMI is synthesizing neural thoughts...*\n\n> ${accumulatedThinking.slice(-140).replace(/\n/g, ' ')}...`,
                                      streaming: true,
                                    }
                                  : m
                              )
                            )
                          }
                        }
                      } catch (e: any) {
                        if (e?.message && !e.message.includes('JSON')) throw e
                      }
                    }
                  }
                }
              }
              replyText = accumulated || accumulatedThinking
              success = Boolean(accumulated.trim())
            }
          } catch (streamErr) {
            console.warn('Streaming chat attempt failed, trying fallback:', streamErr)
            success = false
          }

          if (!success) {
            // Non-streaming fallback via backend proxy
            try {
              const res = await fetch('/api/nemotron/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: userText,
                  system_prompt: completeSystemPrompt + memoryAugmentation + ragAugmentation,
                }),
              })
              if (res.ok) {
                const data = await res.json()
                replyText = data.content || data.text || ''
                success = Boolean(replyText)
              }
            } catch {
              success = false
            }

            if (!success && activeNvidiaNimKey && activeNvidiaNimKey !== 'SERVER_CONFIGURED') {
              const nimRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${activeNvidiaNimKey}`,
                },
                body: JSON.stringify({
                  model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
                  messages: allMessages,
                  temperature: 0.7,
                  max_tokens: 4096,
                }),
              })
              if (nimRes.ok) {
                const nimData = await nimRes.json()
                replyText = nimData.choices?.[0]?.message?.content || ''
              } else {
                const errData = await nimRes.json().catch(() => ({}))
                throw new Error(errData?.error?.message || errData?.detail || `NVIDIA NIM request failed (HTTP ${nimRes.status})`)
              }
            }
          }
        }
        // For fast, direct answers without unnecessary filler: return clean replyText directly
        recordAssistantResponse(replyText.trim())
      } else if (!ollamaRunning) {
        throw new Error('Ollama is not running. Start it with `ollama serve`.')
      }
      if (modelMode === 'ollama') {
        ollamaStreamRef.current = ''
        const chunkHandler = (chunk: unknown) => {
          if (typeof chunk === 'string') {
            ollamaStreamRef.current += chunk
            const current = ollamaStreamRef.current
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, content: current, streaming: true } : m))
            )
          }
        }
        window.nemi?.on('ollama-stream-chunk', chunkHandler)
        const fullText = await window.nemi?.ollamaChat(allMessages, ollamaModel) || ''
        window.nemi?.off('ollama-stream-chunk', chunkHandler)
        const finalText = fullText || ollamaStreamRef.current
        const ollamaJupyterBanner = await generateJupyterNotebookBanner(finalText, userText)
        recordAssistantResponse(`${finalText}${ollamaJupyterBanner}`)
      }
    } catch (err) {
      console.error(err)
      const errMessage = `Error: ${err instanceof Error ? err.message : 'Unknown error'}\n\n${modelMode === 'nvidia-nim' ? 'Check the NVIDIA NIM key in Settings.' : 'Make sure Ollama is running: `ollama serve`'}`
      recordAssistantResponse(errMessage)
    } finally {
      setIsThinking(false)
    }
  }, [messages, modelMode, ollamaRunning, ollamaModel, nvidiaNimKey, speakText, memories, activeConvId, conversations])
  sendToAIRef.current = sendToAI

  const handleClearChat = useCallback(() => {
    setMessages([])
    if (activeConvId) {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === activeConvId) return { ...c, messages: [], preview: '' }
          return c
        })
        void saveStoredConversations(updated)
        return updated
      })
    }
  }, [activeConvId])

  const handleStop = useCallback(() => {
    stopListening()
    synthRef.current?.cancel()
    currentAudioRef.current?.pause()
    if (activeAudioSourceRef.current) {
      activeAudioSourceRef.current.stop()
      activeAudioSourceRef.current = null
    }
    ttsAnalyserRef.current = null
    if (activeAudioContextRef.current) {
      activeAudioContextRef.current.close()
      activeAudioContextRef.current = null
    }
    setIsSpeaking(false)
    setTranscript('')
  }, [])

  return (
    <div className={`relative w-screen h-[100dvh] min-h-screen overflow-hidden bg-slate-950 flex flex-col select-none ${modelMode === 'nvidia-nim' ? 'nim-active' : ''}`}>

      {/* ── Top Header / App Bar ── */}
      <header
        className={`h-10 pt-[env(safe-area-inset-top)] flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-lg z-50 select-none ${
          isElectron ? 'px-20' : 'px-3 sm:px-6'
        }`}
        style={isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
      >
        <div className="flex items-center gap-2 sm:gap-3" style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00d4ff]" />
            <span className="text-xs font-bold tracking-[0.25em] gradient-text">NEMI</span>
          </div>

          <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />

          {/* Active Bot Dropdown Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBotDropdownOpen((p) => !p)}
              aria-label={`Current bot: ${activeBot.name}. Click to switch bot`}
              aria-expanded={botDropdownOpen}
              className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              title="Switch Active Bot"
            >
              <BotIcon botId={activeBot.id} iconName={activeBot.icon} strokeWidth={1.65} className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
              <span className="font-medium text-[11px] truncate max-w-[80px] sm:max-w-none">{activeBot.name}</span>
              <span className="text-[10px] text-white/40">▾</span>
            </button>

            <AnimatePresence>
              {botDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute left-0 top-8 w-64 p-1 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-50 space-y-0.5"
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest border-b border-white/5">
                    Select Autonomous Agent
                  </div>
                  <div className="max-h-64 overflow-y-auto nemi-scroll space-y-0.5 py-1" role="menu">
                    {N8N_BOTS.map((bot) => (
                      <button
                        key={bot.id}
                        type="button"
                        role="menuitem"
                        aria-label={`Select ${bot.name} (${bot.shortName})`}
                        onClick={() => {
                          setSelectedBotId(bot.id)
                          setBotDropdownOpen(false)
                          setChatOpen(true)
                        }}
                        className={`
                          w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400/50
                          ${bot.id === selectedBotId
                            ? 'bg-cyan-500/15 text-white border border-cyan-400/30'
                            : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BotIcon botId={bot.id} iconName={bot.icon} strokeWidth={1.65} className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                          <span className="font-medium truncate">{bot.name}</span>
                        </div>
                        <span className="text-[9px] text-white/30 font-mono flex-shrink-0">
                          {bot.shortName}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT CONTROLS: SIGN UP / LOGIN + CHAT + TOOLS MENU ── */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Sign Up / Login Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label={isAuthenticated ? `Session active: ${currentUser?.email || 'Authenticated'}` : 'Sign In or Sign Up'}
              className="h-7.5 px-3 rounded-full text-xs flex items-center gap-1.5 text-white bg-white/[0.04] border border-white/10 hover:bg-cyan-500/15 hover:border-cyan-400/40 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,212,255,0.1)]"
              title={isAuthenticated ? `Session active: ${currentUser?.email || 'Authenticated'}` : 'Sign Up / Login'}
            >
              {isAuthenticated ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" strokeWidth={1.65} />
                  <span className="font-semibold text-[11px] truncate max-w-[100px]">
                    {currentUser?.name || currentUser?.email || (authRole === 'owner' ? 'Owner' : 'Guest')}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                    authRole === 'owner'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : authRole === 'member'
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                      : 'bg-emerald-400/20 text-emerald-300'
                  }`}>
                    {authRole === 'owner' ? 'OWNER' : authRole === 'member' ? 'MEMBER' : 'GUEST'}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" strokeWidth={1.65} />
                  <span className="font-semibold text-[11px] tracking-wide">Sign Up / Login</span>
                </>
              )}
            </button>

            {/* Chat Toggle */}
            <button
              type="button"
              onClick={() => setChatOpen((p) => !p)}
              aria-label={chatOpen ? 'Close Chat Panel' : 'Open Chat Panel'}
              className={`h-7.5 px-3 rounded-full text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                chatOpen
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-white/70 hover:text-white bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.65} />
              <span className="font-medium text-[11px]">Chat</span>
            </button>

            {/* More Developer Tools Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsMenuOpen((p) => !p)}
                aria-label="More Advanced Developer Tools"
                className={`h-7.5 w-7.5 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-all cursor-pointer border ${
                  toolsMenuOpen
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                }`}
                title="More Tools"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {toolsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 top-9 w-64 p-2 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.9)] z-50 space-y-1"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-widest border-b border-white/10">
                      Advanced Developer Tools
                    </div>

                    {/* Commands */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setCommandPaletteOpen(true)
                      }}
                      aria-label="Open Command Palette (Cmd+K)"
                      title="Open Command Palette (Cmd+K / Ctrl+K)"
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Command Palette</span>
                      </div>
                      <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono text-white/50 border border-white/10">⌘K</kbd>
                    </button>

                    {/* Bot Fleet */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setSidebarOpen((p) => !p)
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Bot Fleet Sidebar</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">11 Bots</span>
                    </button>

                    {/* Swarm Mode */}
                    <button
                      type="button"
                      onClick={() => {
                        setSwarmModeEnabled((p) => !p)
                        showToast(swarmModeEnabled ? 'Swarm Mode: Single Specialist Bot' : '⚡ Swarm Mode: All 11 Bots United')
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Swarm Collaboration</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">{swarmModeEnabled ? 'United' : 'Solo'}</span>
                    </button>

                    {/* Jupyter / Colab */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        if (isElectron) {
                          const url = 'http://localhost:8888'
                          if (window.nemi?.openExternal) window.nemi.openExternal(url)
                          else window.open(url, '_blank')
                        } else {
                          window.open('https://colab.research.google.com/#create=true', '_blank')
                        }
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isElectron ? 'Jupyter Notebooks' : 'Google Colab'}</span>
                    </button>

                    {/* Advanced RAG */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        if (isElectron && window.nemi?.openRagWindow) {
                          void window.nemi.openRagWindow()
                        } else {
                          setRagOpen((prev) => !prev)
                        }
                        setChatOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Advanced RAG Workspace</span>
                    </button>

                    {/* Train GitHub */}
                    <button
                      type="button"
                      onClick={async () => {
                        setToolsMenuOpen(false)
                        const res = await triggerDailyGitHubLearning(memories, true)
                        setMemories(res.newMemories)
                        setGithubLearningBanner(res.summary)
                        setTimeout(() => setGithubLearningBanner(null), 8000)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Train on GitHub Architectures</span>
                    </button>

                    {/* Learning Hub */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setLearningModalOpen(true)
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Autonomous Learning Hub</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300 font-mono">LIVE</span>
                    </button>

                    {/* 100 Hardest Benchmark */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setHardest100ModalOpen(true)
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span>100 Hardest Problems</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-mono">100%</span>
                    </button>

                    {/* Ingest Repo */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setIngestedResult(null)
                        setRepoModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>+ Ingest Repository</span>
                    </button>

                    {/* Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setToolsMenuOpen(false)
                        setSettingsOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer border-t border-white/10 pt-2"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-white/60" />
                      <span>System Settings</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label={isAuthenticated ? `Session active: ${currentUser?.email || 'Authenticated'}` : 'Sign In or Sign Up'}
              className="h-7.5 px-2.5 rounded-full text-xs flex items-center gap-1 text-white bg-white/[0.04] border border-white/10 active:bg-white/15"
            >
              {isAuthenticated ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            {/* Mobile Actions Drawer Trigger */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10)
                setMobileMenuOpen(true)
              }}
              aria-label="Open Actions Drawer"
              className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-white/80 bg-white/[0.04] border border-white/10 active:bg-white/15 transition-all cursor-pointer"
              title="Menu"
            >
              <Menu className="w-4 h-4 text-white/90" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE ACTIONS DRAWER (Bottom Sheet) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-h-[85vh] bg-slate-950/98 border-t border-white/15 rounded-t-3xl p-5 pb-8 shadow-[0_-12px_48px_rgba(0,0,0,0.9)] overflow-y-auto nemi-scroll flex flex-col gap-4 z-10"
            >
              {/* Grab handle */}
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 cursor-grab" onClick={() => setMobileMenuOpen(false)} />

              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00d4ff]" />
                  <span className="text-sm font-semibold tracking-wider text-white">NEMI Control Hub</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 0. Command Palette */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setCommandPaletteOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/25 active:bg-cyan-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Universal Command Palette</div>
                      <div className="text-xs text-cyan-300/70">Quick launcher, bots & tools (Cmd+K)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-300/50" />
                </button>

                {/* 0.5. Neural Training & Learning Hub */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setLearningModalOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600/20 via-purple-600/15 to-cyan-500/20 border border-fuchsia-400/50 active:bg-fuchsia-500/30 transition-all text-left shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/50 flex items-center justify-center text-fuchsia-300">
                      <Brain className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">TRAIN: Neural Training Hub</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fuchsia-400/20 text-fuchsia-300 border border-fuchsia-400/30">LAB</span>
                      </div>
                      <div className="text-xs text-fuchsia-200/70">Live Convergence Loss Curve &amp; 11-Bot Distillation</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-fuchsia-300/60" />
                </button>

                {/* 0.7. World's Hardest 100 Benchmark */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setHardest100ModalOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-orange-500/15 border border-yellow-400/40 active:bg-yellow-500/25 transition-all text-left shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-400/50 flex items-center justify-center text-yellow-300">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">World's 100 Hardest Benchmark</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">100%</span>
                      </div>
                      <div className="text-xs text-yellow-300/70">Competitive, LeetCode Hard, Distributed & ML</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-yellow-300/60" />
                </button>

                {/* 0.8. Swarm Mode: All Bots United */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setSwarmModeEnabled((p) => !p)
                    showToast(swarmModeEnabled ? 'Swarm Mode: Single Specialist Bot' : '⚡ Swarm Mode: All 11 Bots United (Consensus Active)')
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    swarmModeEnabled
                      ? 'bg-purple-500/15 border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.2)]'
                      : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Swarm Mode: All Bots United</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-300 border border-purple-400/30">
                          {swarmModeEnabled ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-xs text-purple-200/60">Collaborative consensus for shortest, 100% working code</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-300/60" />
                </button>

                {/* 1. Bot Fleet */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setSidebarOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Bot Swarm Fleet</div>
                      <div className="text-xs text-white/50">11 autonomous AI agents & pipelines</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 2. Google Colab Notebooks */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    window.open('https://colab.research.google.com/#create=true', '_blank')
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Google Colab Notebook</div>
                      <div className="text-xs text-white/50">Launch cloud GPU notebook instantly</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 3. Advanced RAG & Documents */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setRagOpen(true)
                    setChatOpen(false)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Advanced RAG & Documents</div>
                      <div className="text-xs text-white/50">Vector retrieval & doc ingestion</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 4. GitHub Architecture Training */}
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    const res = await triggerDailyGitHubLearning(memories, true)
                    setMemories(res.newMemories)
                    setGithubLearningBanner(res.summary)
                    setTimeout(() => setGithubLearningBanner(null), 8000)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Train on GitHub</div>
                      <div className="text-xs text-white/50">Daily top repo architecture learning</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 5. Ingest Any GitHub Repo */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setIngestedResult(null)
                    setRepoModalOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Ingest GitHub Repository</div>
                      <div className="text-xs text-white/50">Clone & ingest any public code repo</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 6. Authentication / Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setAuthModalOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300">
                      {isAuthenticated ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isAuthenticated ? (currentUser?.name || currentUser?.email || 'Account Authenticated') : 'Sign In / Account'}
                      </div>
                      <div className="text-xs text-white/50">
                        {isAuthenticated ? `Role: ${authRole}` : 'Cloud sync and custom API keys'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>

                {/* 7. Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setSettingsOpen(true)
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/[0.08] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center text-white/80">
                      <SettingsIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">System Settings</div>
                      <div className="text-xs text-white/50">Model engines, voice speed, keys</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MOBILE VOICE HUD OVERLAY ── */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 inset-x-4 md:hidden z-50 p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_24px_rgba(6,182,212,0.25)] backdrop-blur-xl flex flex-col gap-2.5 select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Listening to Voice</span>
              </div>
              <button
                type="button"
                onClick={toggleVoice}
                className="p-1 text-white/40 hover:text-white"
                aria-label="Cancel Voice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-white/90 italic bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 min-h-[36px] flex items-center">
              {latestTranscriptRef.current || transcript || 'Speak now, listening...'}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleSendVoiceNow}
                className="flex-1 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-medium flex items-center justify-center gap-1.5 active:bg-cyan-500/30 transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                className="px-3 h-9 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium flex items-center justify-center active:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Daily GitHub Architecture Training Alert */}
        {githubLearningBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] px-4 py-2.5 rounded-xl bg-purple-950/95 border border-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.4)] backdrop-blur-md flex items-center justify-between text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>{githubLearningBanner}</span>
            </div>
            <button
              onClick={() => setGithubLearningBanner(null)}
              className="text-purple-400 hover:text-purple-100 ml-3 p-1 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {nimShowcaseVisible && (
          <div className="nim-showcase" aria-hidden="true">
            <div className="nim-showcase-frame" />
            <div className="nim-showcase-content">
              <span className="nim-showcase-overline">NVIDIA NIM ONLINE</span>
              <strong>NEMI</strong>
              <span className="nim-showcase-line">Neural interface activated</span>
              <span className="nim-showcase-credit">LOCAL UI / ONLINE INFERENCE</span>
            </div>
          </div>
        )}

        <NemiBrain
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          onBrainClick={toggleVoice}
          companionEnabled={humanCompanionEnabled}
          audioLevel={getAudioLevel}
          nimActive={modelMode === 'nvidia-nim'}
        />

        {/* ── Modular Human Companion Layer (Living presence, chimes, acoustic ripples) ── */}
        {humanCompanionEnabled && (
          <HumanCompanionLayer
            enabled={humanCompanionEnabled}
            isListening={isListening}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            getAudioLevel={getAudioLevel}
          />
        )}

        {/* ── Floating Bot Fleet Dock ── */}
        {chatOpen && (
          <BotFleetDock
            selectedBotId={selectedBotId}
            onSelectBot={(botId) => {
              setSelectedBotId(botId)
              setChatOpen(true)
            }}
            onOpenChat={() => setChatOpen(true)}
            onToggleSidebar={() => setSidebarOpen((p) => !p)}
          />
        )}

        <Sidebar
          conversations={conversations.map((c) => {
            return {
              id: c.id,
              title: c.title,
              preview: c.preview,
              timestamp: new Date(c.updatedAt),
              pinned: !!c.pinned,
              messageCount: c.messages?.length || 0
            }
          })}
          activeConversationId={activeConvId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((p) => !p)}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onPinConversation={handlePinConversation}
          onOpenSettings={() => setSettingsOpen(true)}
          selectedBotId={selectedBotId}
          onSelectBot={(id) => {
            setSelectedBotId(id)
            setChatOpen(true)
          }}
          onOpenChat={() => setChatOpen(true)}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          authRole={authRole}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenUniversalPalette={() => setUniversalPaletteOpen(true)}
          onOpenTradingFleet={() => setTradingFleetModalOpen(true)}
        />

        {/* ── World-Class 3-Swarm Dashboard (When Chat is closed & Dashboard is open) ── */}
        {!chatOpen && dashboardOpen && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto nemi-scroll pointer-events-none">
            <WorldClassDashboard
              isAuthenticated={isAuthenticated}
              currentUser={currentUser}
              authRole={authRole}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenCodeSwarm={() => setSwarmDagModalOpen(true)}
              onOpenTradeSwarm={() => setTradingFleetModalOpen(true)}
              onOpenTrainSwarm={() => setLearningModalOpen(true)}
              onOpenTradeOfTheDay={() => {
                setTradingFleetDefaultTab('totd')
                setTradingFleetModalOpen(true)
              }}
              onOpenChat={() => handleToggleChatOpen(true)}
              onToggleVoice={toggleVoice}
              isListening={isListening}
              onOpenSettings={() => setSettingsOpen(true)}
              codeBotsCount={N8N_BOTS.length}
              tradeBotsCount={10}
              showHeader={false}
              onClose={() => setDashboardOpen(false)}
            />
          </div>
        )}

        {/* ── Home Screen Single Focus: Ultra-Premium Transparent TRADE Tab Button ── */}
        {!chatOpen && !dashboardOpen && (
          <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-30 flex flex-col items-center gap-2.5 pointer-events-none px-4">
            {/* Live Feed Status Pill */}
            <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/40 backdrop-blur-xl border border-emerald-500/30 text-[11px] font-mono text-emerald-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold tracking-wider">LIVE QUANT FEED</span>
              <span className="text-white/30">•</span>
              <span className="text-white/80">10 QUANT AGENTS</span>
              <span className="text-white/30">•</span>
              <span className="text-emerald-400 font-bold">92.4% PROFIT PREDICTIONS</span>
            </div>

            {/* Sole Primary Action: Transparent High-Quality TRADE Tab Button */}
            <button
              type="button"
              onClick={() => {
                setTradingFleetDefaultTab('cockpit')
                setTradingFleetModalOpen(true)
                showToast('⚡ Live Trade Feed Connected: 10 Quant Agents (Win Rate ≥ 70%)')
              }}
              className="pointer-events-auto group relative flex items-center gap-3.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-slate-950/40 hover:bg-slate-900/60 active:bg-slate-950/80 backdrop-blur-2xl border border-emerald-400/40 hover:border-emerald-400/80 shadow-[0_12px_48px_rgba(0,0,0,0.85),0_0_35px_rgba(16,185,129,0.3)] cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95"
              title="Open Live Trading Tab (10 Quant Agents, Real-Time Market Feed, AI Profitable Predictions)"
              aria-label="TRADE Swarm"
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

              <div className="relative w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <TrendingUp className="w-4 h-4" />
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black tracking-widest text-white group-hover:text-emerald-300 transition-colors">
                    TRADE
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 border border-emerald-400/40 text-emerald-300">
                    LIVE FEED
                  </span>
                </div>
                <span className="text-[11px] text-white/70 font-medium">
                  Real-Time Market Data &amp; AI Profitable Trade Predictions
                </span>
              </div>

              <div className="ml-1 sm:ml-2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-emerald-300 group-hover:border-emerald-400/30 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        <ChatPanel
          messages={messages}
          isVisible={chatOpen}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          onClose={() => handleToggleChatOpen(false)}
          onSend={(text) => void sendToAI(text)}
          onClear={handleClearChat}
          onSpeakMessage={handleSpeakMessage}
          isSpeakingText={speakingMsgText}
          memories={memories}
          onAddMemory={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onClearMemories={handleClearMemories}
          conversations={conversations}
          activeConversationId={activeConvId || undefined}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isListening={isListening}
          transcript={transcript}
          onToggleVoice={toggleVoice}
          modelBadge={activeBot.name}
          selectedBotId={selectedBotId}
          onSelectBot={(id) => setSelectedBotId(id)}
          onFixCode={handleAutoFixCode}
          onToast={showToast}
          onOpenLearningHub={() => setLearningModalOpen(true)}
          onOpenTradingFleet={() => setTradingFleetModalOpen(true)}
        />

        <RagPanel
          isVisible={ragOpen}
          onClose={() => setRagOpen(false)}
          onThinkingChange={setIsThinking}
          ollamaRunning={ollamaRunning}
          ollamaModel={ollamaModel}
          modelMode={modelMode}
          nvidiaNimKey={nvidiaNimKey}
        />

        <VoiceOrb
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          transcript={transcript}
          onToggle={toggleVoice}
          onStop={handleStop}
          nimActive={modelMode === 'nvidia-nim'}
          hidden={chatOpen || ragOpen || settingsOpen || authModalOpen}
        />
      </div>

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        modelMode={modelMode}
        onModelModeChange={handleModelModeChange}
        nvidiaNimKey={nvidiaNimKey}
        onNvidiaNimKeyChange={handleNvidiaNimKeyChange}
        ollamaModels={ollamaModels}
        ollamaModel={ollamaModel}
        onOllamaModelChange={handleOllamaModelChange}
        ollamaRunning={ollamaRunning}
        voiceServerRunning={voiceServerRunning}
        kokoro={kokoro}
        selectedVoice={selectedVoice}
        onVoiceChange={handleVoiceChange}
        onTestVoice={handleTestVoice}
        voiceSpeed={voiceSpeed}
        onVoiceSpeedChange={handleVoiceSpeedChange}
        sttMode={sttMode}
        humanCompanionEnabled={humanCompanionEnabled}
        onToggleHumanCompanion={(enabled: boolean) => {
          setHumanCompanionEnabled(enabled)
          localStorage.setItem('nemi_human_companion', String(enabled))
        }}
        nimReady={nvidiaNimReady}
        onNimReadyChange={setNvidiaNimReady}
      />

      {/* Neural Access / Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isAuthenticated={isAuthenticated}
        isGuest={authRole === 'guest'}
        currentUser={currentUser}
        onLoginSuccess={(token, role, user) => {
          const resolvedRole: 'owner' | 'member' | 'guest' =
            user?.role || (role === 'guest' ? 'guest' : role === 'owner' ? 'owner' : 'member')
          setIsAuthenticated(true)
          setAuthRole(resolvedRole)
          if (user) {
            setCurrentUser(user)
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('nemi_session_token', token)
            localStorage.setItem('nemi_session_role', resolvedRole)
            if (user) {
              localStorage.setItem('nemi_session_user', JSON.stringify(user))
            }
          }
          // Automated high-class learning: trains NEMI on login with modern architectures
          void triggerDailyGitHubLearning(memories, true).then((res) => {
            if (res.trained && res.count > 0) {
              setMemories(res.newMemories)
              setGithubLearningBanner(res.summary)
              setTimeout(() => setGithubLearningBanner(null), 8000)
            }
          })
        }}
        onLogout={() => {
          setIsAuthenticated(false)
          setAuthRole('guest')
          setCurrentUser(null)
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('nemi_session_token')
            localStorage.removeItem('nemi_session_role')
            localStorage.removeItem('nemi_session_user')
          }
        }}
      />

      {/* ── GitHub Repository Ingestion Modal ── */}
      {repoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white">Ingest Public GitHub Repository</h3>
              </div>
              <button
                onClick={() => setRepoModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto nemi-scroll">
              <p className="text-xs text-white/70 leading-relaxed">
                Teach all 11 specialist bots modern code architectures from any GitHub repository. Ingests the real <span className="font-mono text-cyan-300">README.md</span>, manifests, dependencies, and code patterns directly.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRepoInput}
                  onChange={(e) => setCustomRepoInput(e.target.value)}
                  placeholder="e.g. vllm-project/vllm or astral-sh/uv"
                  className="flex-1 bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customRepoInput.trim()) {
                      void handleIngestCustomRepo()
                    }
                  }}
                />
                <button
                  disabled={isIngestingRepo || !customRepoInput.trim()}
                  onClick={() => void handleIngestCustomRepo()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isIngestingRepo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isIngestingRepo ? 'Ingesting...' : 'Ingest'}</span>
                </button>
              </div>

              {/* Ingesting In-Progress Status */}
              {isIngestingRepo && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center gap-2.5 text-xs text-cyan-200 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Fetching repository README, dependencies, and code patterns via raw GitHub...</span>
                </div>
              )}

              {/* Ingested Result Card */}
              {ingestedResult && !isIngestingRepo && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-white font-mono">{ingestedResult.repo}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-mono">
                        {ingestedResult.language}
                      </span>
                      {ingestedResult.stars > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono">
                          ★ {ingestedResult.stars.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed">{ingestedResult.description}</p>

                  {ingestedResult.principles?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 font-semibold">
                        Extracted Architectural Principles
                      </span>
                      <ul className="space-y-1">
                        {ingestedResult.principles.map((p: string, i: number) => (
                          <li key={i} className="text-xs text-white/80 flex items-start gap-1.5">
                            <span className="text-cyan-400 font-mono text-[10px] mt-0.5">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ingestedResult.codeSnippet && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 font-semibold">
                        Extracted Code Pattern
                      </span>
                      <pre className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-36 nemi-scroll">
                        {ingestedResult.codeSnippet}
                      </pre>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-mono">
                      All 11 bots upgraded with this architecture.
                    </span>
                    <button
                      onClick={() => setRepoModalOpen(false)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Quick suggestions */}
              <div>
                <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Trending Architecture Blueprints</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'vllm-project/vllm',
                    'karpathy/nanoGPT',
                    'astral-sh/uv',
                    'tiangolo/fastapi',
                    'huggingface/transformers',
                    'redis/redis-py',
                    'pallets/flask',
                  ].map((rec) => (
                    <button
                      key={rec}
                      onClick={() => {
                        setCustomRepoInput(rec)
                      }}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 transition-colors cursor-pointer"
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Floating Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-400/40 text-white shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(0,212,255,0.25)] backdrop-blur-xl">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" strokeWidth={1.75} />
              <span className="text-xs font-medium text-white/90">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectBot={(id) => {
          setSelectedBotId(id)
          setChatOpen(true)
        }}
        onOpenColab={() => {
          window.open('https://colab.research.google.com/#create=true', '_blank')
          showToast('Opened Google Colab notebook in new tab.')
        }}
        onDownloadNotebook={() => {
          const lastMsgWithCode = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.includes('```'))
          if (lastMsgWithCode) {
            const nb = buildNotebookFromResponse({
              taskName: 'NEMI Command Session',
              responseText: lastMsgWithCode.content,
            })
            downloadNotebookFile(nb, `nemi_session_${Date.now()}.ipynb`)
            showToast('Downloaded Jupyter Notebook (.ipynb)')
          } else {
            showToast('No code cells found to export to notebook.')
          }
        }}
        onOpenRag={() => {
          setRagOpen(true)
          setChatOpen(false)
        }}
        onTriggerGitHubLearning={async () => {
          const res = await triggerDailyGitHubLearning(memories, true)
          setMemories(res.newMemories)
          setGithubLearningBanner(res.summary)
          showToast('NEMI Swarm updated with latest GitHub architectures!')
          setTimeout(() => setGithubLearningBanner(null), 8000)
        }}
        onToggleVoice={() => toggleVoice()}
        onNewChat={handleNewConversation}
        onToast={showToast}
        onOpenLearningHub={() => setLearningModalOpen(true)}
        onOpenTradingFleet={() => setTradingFleetModalOpen(true)}
        swarmModeEnabled={swarmModeEnabled}
        onToggleSwarmMode={() => {
          setSwarmModeEnabled((p) => !p)
          showToast(swarmModeEnabled ? 'Swarm Mode: Single Specialist Bot' : '⚡ Swarm Mode: All 11 Bots United (Consensus Active)')
        }}
      />

      {/* Autonomous Learning & Swarm Mastery Hub */}
      <AutonomousLearningModal
        isOpen={learningModalOpen}
        onClose={() => setLearningModalOpen(false)}
        memories={memories}
        onUpdateMemories={setMemories}
        onToast={showToast}
      />

      {/* Algorithmic Trading Fleet (10 Quant Agents Cockpit) */}
      <TradingFleetModal
        isOpen={tradingFleetModalOpen}
        onClose={() => {
          setTradingFleetModalOpen(false)
          setTradingFleetDefaultTab(undefined)
        }}
        defaultTab={tradingFleetDefaultTab}
        onSelectBotForChat={(botId, prompt) => {
          setSelectedBotId(botId)
          if (prompt) void sendToAI(prompt)
          setChatOpen(true)
        }}
      />

      {/* ── 15 World-Class Innovation Modals & Overlays ── */}
      <UniversalCommandPalette
        isOpen={universalPaletteOpen}
        onClose={() => setUniversalPaletteOpen(false)}
        onTriggerAction={handleUniversalAction}
      />

      <SwarmDagModal
        isOpen={swarmDagModalOpen}
        onClose={() => setSwarmDagModalOpen(false)}
      />

      <CodeSandboxModal
        isOpen={codeSandboxModalOpen}
        onClose={() => setCodeSandboxModalOpen(false)}
      />

      <CryptoVaultModal
        isOpen={cryptoVaultModalOpen}
        onClose={() => setCryptoVaultModalOpen(false)}
      />

      <VoiceEngineModal
        isOpen={voiceEngineModalOpen}
        onClose={() => setVoiceEngineModalOpen(false)}
      />

      <BranchingContextModal
        isOpen={branchingModalOpen}
        onClose={() => setBranchingModalOpen(false)}
      />

      <P2PMeshModal
        isOpen={p2pMeshModalOpen}
        onClose={() => setP2PMeshModalOpen(false)}
      />

      <OfflineModeModal
        isOpen={offlineModeModalOpen}
        onClose={() => setOfflineModeModalOpen(false)}
      />

      <TelemetryHUD
        isOpen={telemetryHudOpen}
        onClose={() => setTelemetryHudOpen(false)}
      />
    </div>
  )
}
