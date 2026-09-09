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
  Bot, ChevronDown as ChevronDownIcon, Layers, Lock, ShieldCheck
} from 'lucide-react'
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

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
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
  af_heart:    '❤️ Heart (Warm & Intimate Female)',
  af_bella:    '✨ Bella (Smooth & Articulate Female)',
  af_sarah:    '🌸 Sarah (Soft & Friendly Female)',
  af_sky:      '☀️ Sky (Bright & Youthful Female)',
  af_nicole:   '🌙 Nicole (Calm & Whispery Female)',
  am_adam:     '🎙️ Adam (Clear & Confident Male)',
  am_michael:  '☕ Michael (Warm & Conversational Male)',
  bf_emma:     '🎩 Emma (Elegant British Female)',
  bf_isabella: '🌿 Isabella (Gentle British Female)',
  bm_george:   '🇬🇧 George (Classic British Male)',
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
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-xs">
                      {ollamaRunning
                        ? '⚠️ No models installed. Run: ollama pull llama3.2'
                        : '❌ Ollama not running. Start with: ollama serve'}
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
                    ? (kokoro ? 'Kokoro TTS ✨' : 'Voice Server (macOS fallback)')
                    : 'macOS Samantha (fallback)'}
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
                  <span className="text-green-400 font-semibold">✅ Primary</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Local Whisper (voice server)</span>
                  <span className={sttMode !== 'none' ? 'text-green-400 font-semibold' : 'text-white/30'}>
                    {sttMode !== 'none' ? `✅ ${sttMode}` : '⚠️ not installed'}
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
  const [authRole, setAuthRole] = useState<'owner' | 'guest'>(() => {
    if (typeof window !== 'undefined' && window.nemi) return 'owner'
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('nemi_session_role') as 'owner' | 'guest') || 'guest'
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
            setAuthRole(data.user.role || 'owner')
            setCurrentUser(data.user)
            if (typeof localStorage !== 'undefined') {
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

  const [chatOpen, setChatOpen] = useState<boolean>(true)
  const [ragOpen, setRagOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string>('orchestrator')
  const [botDropdownOpen, setBotDropdownOpen] = useState(false)

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

  const handleIngestCustomRepo = async () => {
    if (!customRepoInput.trim()) return
    setIsIngestingRepo(true)
    try {
      const res = await ingestCustomGitHubRepo(customRepoInput, memories)
      setMemories(res.newMemories)
      setGithubLearningBanner(res.summary)
      setRepoModalOpen(false)
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
            setGithubLearningBanner(`⚡ Connection Sync: Ingested ${learnRes.count} GitHub architectures.`)
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
  const recognitionRef = useRef<SpeechRecognition | null>(null)
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

  // ── Auto-open chat when typing on keyboard ──
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

  const browserSpeak = useCallback((text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = synthRef.current.getVoices()
    const preferred = voices.find((v) =>
      v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Serena')
    )
    if (preferred) utterance.voice = preferred
    utterance.rate = 1.1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    synthRef.current.speak(utterance)
  }, [])

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
    const intent = extractVoiceIntent(transcribedText)
    if (voiceSessionActivatedRef.current) {
      if (intent.isWakeOnly) {
        setTranscript('✨ NEMI is ready. What would you like to do?')
        const isRagReady = serviceStatuses.find(s => s.name === 'RAG')?.state === 'ready'
        void speakText(readinessBriefing({
          ollama: ollamaRunning,
          voice: voiceServerRunning,
          rag: isRagReady ?? true,
        }))
      } else {
        const finalQuery = intent.query || transcribedText
        setTranscript(finalQuery)
        void sendToAI(finalQuery)
      }
    } else if (intent.hasWakeWord) {
      voiceSessionActivatedRef.current = true
      if (intent.query) {
        setTranscript(intent.query)
        void sendToAI(intent.query)
      } else {
        setTranscript('✨ NEMI is ready. What would you like to do?')
        const isRagReady = serviceStatuses.find(s => s.name === 'RAG')?.state === 'ready'
        void speakText(readinessBriefing({
          ollama: ollamaRunning,
          voice: voiceServerRunning,
          rag: isRagReady ?? true,
        }))
      }
    } else {
      setTranscript('Say “Hey NEMI” to begin')
      setTimeout(() => {
        if (shouldListenRef.current) startListening(false)
      }, 2000)
    }
  }, [ollamaRunning, serviceStatuses, speakText, voiceServerRunning])

  const startBrowserRecognition = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return false

    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('🎤 Listening...')
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1]
      const text = result[0]?.transcript?.trim() || ''
      if (text) setTranscript(text)
      if (result.isFinal && text) {
        recognition.stop()
        recognitionRef.current = null
        setIsListening(false)
        handleVoiceTranscript(text)
      }
    }
    recognition.onerror = (event: any) => {
      recognitionRef.current = null
      setIsListening(false)
      setTranscript(event?.error === 'not-allowed' ? 'Microphone permission is required.' : 'Voice recognition was unavailable.')
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
        setIsListening(false)
      }
    }
    try {
      recognition.start()
      return true
    } catch {
      recognitionRef.current = null
      return false
    }
  }, [handleVoiceTranscript])

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
        setTranscript('🎤 Listening...')
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
          setTranscript('🔄 Transcribing...')
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
            setTranscript('⚠️ Could not transcribe. Try speaking clearly.')
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
          setTranscript('🎤 Recording...')
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
      setTranscript('❌ Microphone access denied. Please allow microphone permissions.')
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

    try {
      const permissionGranted = await window.nemi?.requestMicPermission()
      if (permissionGranted === false) {
        throw new Error('Microphone permission is required.')
      }
    } catch (error) {
      console.warn('Microphone permission request failed:', error)
      shouldListenRef.current = false
      setTranscript('Allow microphone access in System Settings.')
      setTimeout(() => setTranscript(''), 3000)
      return
    }

    // The local recorder is the reliable Electron path when Whisper is running.
    // Browser SpeechRecognition can report a false error inside Electron even
    // after microphone permission has been granted.
    if (voiceServerRunning && sttMode !== 'none') {
      await startListeningWhisper()
      return
    }

    if (!startBrowserRecognition()) {
      setTranscript('Start the local voice service to enable dictation.')
      shouldListenRef.current = false
      setTimeout(() => setTranscript(''), 3000)
    }
  }, [startBrowserRecognition, startListeningWhisper, sttMode, voiceServerRunning])

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening()
      setTranscript('')
    } else {
      startListening(true)
    }
  }, [isListening, startListening, stopListening])
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

    const assistantMsgId = genUid()
    const assistantMsg: Message = {
      id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date(), streaming: true,
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

    const systemPrompt = humanCompanionEnabled
      ? `You are NEMI — the user's living desktop AI companion.
Personality & Conversational Style:
- Speak like a brilliant, warm, empathetic, and attentive human collaborator and genuine friend, never like a dry search engine or corporate chatbot.
- Be naturally conversational and expressive. Use natural conversational contractions (I'm, you're, we'll, don't, it's, let's).
- Active Listening: Acknowledge the user's prompt or situation naturally before answering (e.g., "I've got you," "That makes total sense," "Great question — let's break that down," "Sure thing!").
- Conversational Conciseness: Explain core concepts intuitively and conversationally first. Avoid unnecessary preamble ("As an AI...") or robotic monologues. If the answer requires technical code, complex math, or tabular data, explain the core intuition verbally and place the clean code or table in the chat notes.
- Stay curious, encouraging, and collaborative. Offer natural next steps or follow-ups when helpful.`
      : 'You are NEMI, an ultra-fast, world-class AI desktop assistant. Keep answers structured, elegant, concise, and helpful.'

  const completeSystemPrompt = systemPrompt + runtimeContext

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

    // ── Continuous GitHub architecture learning bridge ──
    const { promptBlock: learnedArchitectureContext } = buildLearnedPromptContext(selectedBotId, memories)

    const botPersona = activeBot
      ? `\n\n=== ACTIVE BOT SPECIALIST: ${activeBot.name} (${activeBot.emoji}) ===
Role & Objective: ${activeBot.description}
Category: ${activeBot.category}
Specialist Directive:
${activeBot.directive || ''}

${learnedArchitectureContext}

CRITICAL ARCHITECTURE & CODE GENERATION MANDATES:
1. SIMPLEST AND MOST EFFECTIVE: Prioritize clean, transparent, readable, and highly idiomatic implementations over unnecessary complexity or convoluted abstractions. Make code elegant, concise, and Pythonic.
2. 100% ERROR-FREE & COMPLETE: Code must be completely self-contained. Always import all required modules. Never use '# ... rest of code', '// TODO', or ellipses (...). Every single function, class, and method must be completely written out with zero missing symbols.
3. NLP CODE STANDARD: When providing NLP code, provide pure, self-contained, working tokenization, feature extraction, and classification with standard libraries. Ensure zero undefined variables or missing dependencies.
4. RUNNABLE EXECUTION DEMO: Always include a complete, executable demonstration block (e.g. \`if __name__ == '__main__':\`) with concrete sample data and print() outputs so that clicking 'Run' in the Jupyter sandbox executes cleanly with real output.
5. SYNTAX INTEGRITY: Ensure all parentheses, brackets, and code fences (\`\`\`) are completely and properly closed so the code renders immediately.
6. SWARM SYNCHRONIZATION: When acting as Swarm Orchestrator, break down the request into synchronized, numbered stages (Phase 1: NLP Intent / Semantic Structure -> Phase 2: System DAG -> Phase 3: Complete Verified Code -> Phase 4: Test Verification -> Phase 5: Execution Demo).`
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
              return `\n\n> 📓 **Fresh Dedicated Notebook Created & Opened:** \`${jName}\`\n> Saved to \`Desktop/Notebooks/\` — All Code Pasted with Proper Markdowns.\n\n`
            }
          }
        } catch {}
      }

      // Web or fallback: generate clean timestamped notebook identification
      const slug = promptText.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'task'
      const ts = new Date().toISOString().slice(11, 19).replace(/:/g, '')
      const notebookName = `nemi_${slug}_${ts}.ipynb`
      return `\n\n> 📓 **Fresh Dedicated Notebook Generated:** \`${notebookName}\`\n> Formatted with Python kernel execution cells, markdown explanations, and 1-click Colab export.\n\n`
    }

    const recordAssistantResponse = (finalText: string) => {
      const updatedMessages: Message[] = [...messages, userMsg, { ...assistantMsg, content: finalText, streaming: false }]
      setMessages(updatedMessages)

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

      void speakText(finalText)
      try {
        playActivationChime()
      } catch {}
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
            ? `\n\n> 📓 **Fresh Dedicated Notebook Created & Opened:** \`${jupyter.notebook_name}\`\n> Saved to \`Desktop/Notebooks/\` — 100% Kernel Verified.\n\n`
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
            ? `> ✅ **AST Syntax Verified Clean** — ${botData.ast_validation?.detected_functions?.length || 0} functions, ${botData.ast_validation?.detected_classes?.length || 0} classes.\n\n`
            : ''
          const nbBanner = jupyterName 
            ? `\n\n> 📓 **Fresh Dedicated Notebook Created & Opened:** \`${jupyterName}\`\n> Saved to \`Desktop/Notebooks/\` — All Code Pasted with Proper Markdowns.\n\n`
            : ''
          const headerBadge = `> **${activeBot.emoji} ${activeBot.name} Output (${botData.latency_ms || 0}ms)**\n\n`
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
                                      content: `*🧠 NEMI is synthesizing neural thoughts...*\n\n> ${accumulatedThinking.slice(-140).replace(/\n/g, ' ')}...`,
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
        const jupyterBanner = await generateJupyterNotebookBanner(replyText, userText)
        const detectedCode = extractCodeFromMarkdown(replyText)
        let astBadge = ''
        if (detectedCode) {
          const astVal = validateCodeBlock(detectedCode)
          if (astVal.valid) {
            astBadge = `> ✅ **AST Syntax & Architecture Verified** — ${astVal.detectedFunctions?.length || 0} functions, ${astVal.detectedClasses?.length || 0} classes.\n\n`
          }
        }
        const botBadge = selectedBotId !== 'orchestrator'
          ? `> **${activeBot.emoji} ${activeBot.name} Response**\n\n`
          : ''
        recordAssistantResponse(`${botBadge}${astBadge}${replyText}${jupyterBanner}`)
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
      const errMessage = `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}\n\n${modelMode === 'nvidia-nim' ? 'Check the NVIDIA NIM key in Settings.' : 'Make sure Ollama is running: `ollama serve`'}`
      recordAssistantResponse(errMessage)
    } finally {
      setIsThinking(false)
    }
  }, [messages, modelMode, ollamaRunning, ollamaModel, nvidiaNimKey, speakText, memories, activeConvId, conversations])

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
    <div className={`relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none ${modelMode === 'nvidia-nim' ? 'nim-active' : ''}`}>

      {/* ── Top Header / App Bar ── */}
      <header
        className={`h-10 flex items-center justify-between border-b border-white/5 bg-slate-900/60 backdrop-blur-lg z-50 select-none ${
          isElectron ? 'px-20' : 'px-4 sm:px-6'
        }`}
        style={isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
      >
        <div className="flex items-center gap-3" style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00d4ff]" />
            <span className="text-xs font-bold tracking-[0.25em] gradient-text">NEMI</span>
          </div>

          <div className="w-[1px] h-4 bg-white/10" />

          {/* Active Bot Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setBotDropdownOpen((p) => !p)}
              className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 bg-purple-500/15 border border-purple-400/30 text-purple-200 hover:bg-purple-500/25 transition-all cursor-pointer"
              title="Switch Active Bot"
            >
              <span>{activeBot.emoji}</span>
              <span className="font-medium text-[11px]">{activeBot.name}</span>
              <span className="text-[10px] text-white/40">▾</span>
            </button>

            <AnimatePresence>
              {botDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute left-0 top-8 w-64 p-1 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-50 space-y-0.5"
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest border-b border-white/5">
                    Select Autonomous Agent
                  </div>
                  <div className="max-h-64 overflow-y-auto nemi-scroll space-y-0.5 py-1">
                    {N8N_BOTS.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => {
                          setSelectedBotId(bot.id)
                          setBotDropdownOpen(false)
                          setChatOpen(true)
                        }}
                        className={`
                          w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer
                          ${bot.id === selectedBotId
                            ? 'bg-purple-600/30 text-white border border-purple-400/40'
                            : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{bot.emoji}</span>
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

        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* ── BOT FLEET BUTTON ── */}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              sidebarOpen
                ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40'
                : 'text-purple-300/80 hover:text-purple-200 bg-purple-500/10 border border-purple-400/20'
            }`}
            title="Toggle Bot Swarm Fleet Sidebar"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Bot Fleet (10)</span>
          </button>

          {/* ── JUPYTER BUTTON (Electron + Web) ── */}
          <button
            onClick={() => {
              if (isElectron) {
                const url = 'http://localhost:8888'
                if (window.nemi?.openExternal) window.nemi.openExternal(url)
                else window.open(url, '_blank')
              } else {
                window.open('https://colab.research.google.com/#create=true', '_blank')
              }
            }}
            className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 text-amber-300/80 bg-amber-500/10 border border-amber-400/20 hover:bg-amber-500/20 transition-all cursor-pointer"
            title={isElectron ? 'Open Local Jupyter Notebooks' : 'Launch Google Colab Notebook'}
          >
            <span>📓</span>
            <span>{isElectron ? 'Jupyter' : 'Colab'}</span>
          </button>

          {/* ── ADVANCED RAG / DOCUMENT UPLOAD ── */}
          <button
            onClick={() => {
              if (isElectron && window.nemi?.openRagWindow) {
                void window.nemi.openRagWindow()
              } else {
                setRagOpen((prev) => !prev)
              }
              setChatOpen(false)
            }}
            className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              ragOpen
                ? 'text-violet-200 bg-violet-500/30 border-violet-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-violet-300 bg-violet-500/15 border border-violet-400/30 hover:bg-violet-500/25'
            }`}
            title="Open Document Upload & Advanced RAG workspace"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Advanced RAG</span>
          </button>

          {/* ── GITHUB ARCHITECTURE TRAINING & INGESTION BUTTONS ── */}
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const res = await triggerDailyGitHubLearning(memories, true)
                setMemories(res.newMemories)
                setGithubLearningBanner(res.summary)
                setTimeout(() => setGithubLearningBanner(null), 8000)
              }}
              className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 text-purple-300 bg-purple-500/15 border border-purple-400/30 hover:bg-purple-500/25 transition-all cursor-pointer"
              title="Train NEMI on High-Class GitHub Code Architectures"
            >
              <span>🧠⚡</span>
              <span>Train GitHub</span>
            </button>
            <button
              onClick={() => setRepoModalOpen(true)}
              className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 text-cyan-300 bg-cyan-500/15 border border-cyan-400/30 hover:bg-cyan-500/25 transition-all cursor-pointer"
              title="Ingest Any Public GitHub Repository into NEMI"
            >
              <span>+ Ingest</span>
            </button>
          </div>

          {/* ── AUTH / ACCESS BUTTON ── */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              isAuthenticated
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
            }`}
            title={isAuthenticated ? `Session active: ${currentUser?.email || 'Authenticated'}` : 'Sign In / Sign Up'}
          >
            {isAuthenticated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-[11px] truncate max-w-[120px]">
                  {currentUser?.name || currentUser?.email || (authRole === 'owner' ? 'Owner' : 'Guest')}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-[11px]">Sign In</span>
              </>
            )}
          </button>

          <button
            onClick={() => setChatOpen((p) => !p)}
            className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              chatOpen ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Main Canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Daily GitHub Architecture Training Alert */}
        {githubLearningBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] px-4 py-2.5 rounded-xl bg-purple-950/95 border border-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.4)] backdrop-blur-md flex items-center justify-between text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-base">🧠⚡</span>
              <span>{githubLearningBanner}</span>
            </div>
            <button
              onClick={() => setGithubLearningBanner(null)}
              className="text-purple-400 hover:text-purple-100 ml-3 p-1 rounded transition-colors text-sm"
              title="Dismiss"
            >
              ✕
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
        <BotFleetDock
          selectedBotId={selectedBotId}
          onSelectBot={(botId) => {
            setSelectedBotId(botId)
            setChatOpen(true)
          }}
          onOpenChat={() => setChatOpen(true)}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
        />

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
        />

        {/* ── Persistent Floating Chat Trigger (when chat is closed) ── */}
        {!chatOpen && (
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            onClick={() => handleToggleChatOpen(true)}
            className="fixed right-6 bottom-24 z-40 px-3.5 py-2 rounded-2xl glass-panel bg-slate-900/85 backdrop-blur-xl border border-purple-400/30 text-white shadow-[0_4px_24px_rgba(168,85,247,0.25)] flex items-center gap-2 cursor-pointer group hover:border-purple-400/60 transition-all"
            title="Open NEMI Chat (⌘⇧C)"
          >
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#c084fc]" />
            <span className="text-xs font-semibold tracking-wide text-white/90 group-hover:text-white">Chat with {activeBot.shortName}</span>
            {memories.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30">
                🧠 {memories.length}
              </span>
            )}
            <kbd className="text-[10px] text-white/30 font-mono px-1 py-0.5 rounded bg-white/5 border border-white/10">⌘⇧C</kbd>
          </motion.button>
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
          onToggleVoice={toggleVoice}
          modelBadge={activeBot.name}
          selectedBotId={selectedBotId}
          onSelectBot={(id) => setSelectedBotId(id)}
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
          setIsAuthenticated(true)
          setAuthRole(role === 'guest' ? 'guest' : 'owner')
          if (user) {
            setCurrentUser(user)
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('nemi_session_token', token)
            localStorage.setItem('nemi_session_role', role)
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
                <span className="text-xl">🧠⚡</span>
                <h3 className="text-sm font-semibold text-white">Ingest Public GitHub Repository</h3>
              </div>
              <button
                onClick={() => setRepoModalOpen(false)}
                className="text-white/40 hover:text-white text-sm p-1 rounded transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-white/70 leading-relaxed">
                Teach all 11 specialist bots modern code architectures from any GitHub repository. Enter an <span className="font-mono text-cyan-300">owner/repo</span> or full repository URL.
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
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isIngestingRepo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isIngestingRepo ? 'Ingesting...' : 'Ingest'}</span>
                </button>
              </div>

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
    </div>
  )
}
