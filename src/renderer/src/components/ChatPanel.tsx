import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  RotateCcw,
  ChevronDown,
  Brain,
  Clock,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  Search,
  Trash2,
  Tag,
  ArrowLeft,
  Pin,
  Send,
  Minimize2,
  Maximize2,
  Paperclip,
  Upload,
  FileText,
} from 'lucide-react'
import MessageBubble from './MessageBubble'
import BotIcon from './BotIcon'
import type { MemoryItem, ConversationSession, Message } from '../chatMemory'
import { N8N_BOTS, type N8nBot } from '../types_bots'

export type { Message }

export interface ChatPanelProps {
  messages: Message[]
  isVisible: boolean
  isThinking: boolean
  isSpeaking?: boolean
  onClose: () => void
  onSend: (text: string) => void
  onClear: () => void
  onSpeakMessage?: (text: string) => void
  isSpeakingText?: string | null
  // Memory integration
  memories?: MemoryItem[]
  onAddMemory?: (content: string, category?: MemoryItem['category']) => void
  onDeleteMemory?: (id: string) => void
  onClearMemories?: () => void
  // Conversation session management
  conversations?: ConversationSession[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  onNewConversation?: () => void
  onDeleteConversation?: (id: string) => void
  // Voice dictation
  isListening?: boolean
  onToggleVoice?: () => void
  modelBadge?: string
  // Bot integration
  selectedBotId?: string
  onSelectBot?: (botId: string) => void
}

type TabMode = 'chat' | 'memory' | 'history'

export default function ChatPanel({
  messages,
  isVisible,
  isThinking,
  isSpeaking = false,
  onClose,
  onSend,
  onClear,
  onSpeakMessage,
  isSpeakingText,
  memories = [],
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isListening = false,
  onToggleVoice,
  modelBadge = 'NEURAL',
  selectedBotId = 'orchestrator',
  onSelectBot,
}: ChatPanelProps) {
  const activeBot = N8N_BOTS.find((b) => b.id === selectedBotId) || N8N_BOTS[0]
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const [activeTab, setActiveTab] = useState<TabMode>('chat')
  const [isMinimized, setIsMinimized] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; content: string }>>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // File upload reader
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, size: file.size, content: text },
        ])
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, size: file.size, content: text },
        ])
      }
      reader.readAsText(file)
    })
  }

  // Memory manager local state
  const [memorySearch, setMemorySearch] = useState('')
  const [newMemContent, setNewMemContent] = useState('')
  const [newMemCategory, setNewMemCategory] = useState<MemoryItem['category']>('preference')

  // History search
  const [historySearch, setHistorySearch] = useState('')

  // Auto-scroll to latest message
  useEffect(() => {
    if (atBottom && activeTab === 'chat' && !isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, atBottom, activeTab, isMinimized])

  // Auto-focus input when panel opens or returns to chat tab
  useEffect(() => {
    if (isVisible && activeTab === 'chat' && !isMinimized) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [isVisible, activeTab, isMinimized])

  const handleSend = () => {
    const text = input.trim()
    if ((!text && attachedFiles.length === 0) || isThinking) return
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = '38px'
    }

    let fullPrompt = text
    if (attachedFiles.length > 0) {
      const filesContext = attachedFiles
        .map((f) => `### Attached File: \`${f.name}\` (${(f.size / 1024).toFixed(1)} KB)\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n')
      fullPrompt = fullPrompt ? `${filesContext}\n\n${fullPrompt}` : `${filesContext}\n\nPlease analyze and explain this uploaded file.`
      setAttachedFiles([])
    }

    onSend(fullPrompt)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemContent.trim() || !onAddMemory) return
    onAddMemory(newMemContent.trim(), newMemCategory)
    setNewMemContent('')
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const convTitle = activeConv?.title || 'Chat with NEMI'

  // Filtered memories
  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(memorySearch.toLowerCase()) ||
    m.category.toLowerCase().includes(memorySearch.toLowerCase())
  )

  // Filtered conversations
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
    c.preview.toLowerCase().includes(historySearch.toLowerCase())
  )

  const quickStarters = [
    'Synthesize verified Python code (Coding Assistant)',
    'Decompose architecture into DAG (System Design)',
    'Adversarial risk & failure pre-mortem (High Thinking)',
    'Create & paste to Desktop Jupyter Notebook',
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className={`
            fixed z-40 flex flex-col transition-all duration-300 ease-out
            inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6
            ${isMinimized
              ? 'w-full sm:w-[260px] h-14 sm:h-[46px]'
              : 'w-full sm:w-[380px] md:w-[420px] h-[88dvh] sm:h-[540px] sm:max-h-[78vh]'
            }
          `}
          onMouseEnter={() => window.nemi?.enterInteractiveMode()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingOver(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDraggingOver(false)
            }
          }}
          onDrop={handleDrop}
        >
          {/* ── MINIMALIST GLASS CONTAINER ── */}
          <div className="
            relative w-full h-full flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden
            bg-slate-950/95 sm:bg-slate-950/85 backdrop-blur-2xl border-t sm:border border-white/10
            shadow-[0_-8px_32px_rgba(0,0,0,0.6),0_16px_48px_rgba(0,0,0,0.75)] select-none
          ">
            {/* Mobile swipe/drag handle pill */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mt-2 mb-0.5 sm:hidden flex-shrink-0" />

            {/* Ambient subtle glow background */}
            <div className="absolute top-0 right-1/4 w-40 h-20 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-40 h-20 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

            {/* Drag & Drop files overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-50 rounded-2xl bg-slate-950/92 backdrop-blur-md border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Upload className="w-8 h-8 text-cyan-400 animate-bounce" />
                <p className="text-xs font-semibold text-cyan-200">Drop files here to attach</p>
                <p className="text-[10px] text-white/50">Text, code, markdown, JSON, PDF</p>
              </div>
            )}

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 bg-white/3 z-10">
              <div className="flex items-center gap-2 min-w-0">
                {/* Dynamic Status Dot */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isThinking
                        ? 'bg-purple-400 animate-pulse'
                        : isSpeaking
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-cyan-400 shadow-[0_0_6px_#00d4ff]'
                    }`}
                  />
                  {isThinking && (
                    <div className="absolute inset-0 rounded-full bg-purple-400/40 animate-ping" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] font-bold text-white/70 tracking-wider">NEMI</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-purple-500/20 border border-purple-400/30 text-[10px] text-purple-200 font-semibold truncate">
                    <BotIcon botId={activeBot.id} iconName={activeBot.icon} className="w-3 h-3 text-purple-300 flex-shrink-0" />
                    <span className="truncate max-w-[90px]">{activeBot.shortName}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Memory Vault Toggle */}
                <button
                  onClick={() => {
                    if (isMinimized) setIsMinimized(false)
                    setActiveTab(activeTab === 'memory' ? 'chat' : 'memory')
                  }}
                  className={`
                    px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer
                    ${activeTab === 'memory'
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/5'
                    }
                  `}
                  title="View NEMI Chat Memory"
                >
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>{memories.length}</span>
                </button>

                {/* History Switcher Toggle */}
                <button
                  onClick={() => {
                    if (isMinimized) setIsMinimized(false)
                    setActiveTab(activeTab === 'history' ? 'chat' : 'history')
                  }}
                  className={`
                    p-1.5 rounded-xl transition-all cursor-pointer
                    ${activeTab === 'history'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    }
                  `}
                  title="Past Conversations"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>

                {/* New Chat */}
                {onNewConversation && (
                  <button
                    onClick={() => {
                      onNewConversation()
                      setActiveTab('chat')
                    }}
                    className="p-1.5 rounded-xl text-white/40 hover:text-cyan-300 hover:bg-white/5 transition-all cursor-pointer"
                    title="New conversation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Minimize Toggle */}
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* If Minimized, only header is rendered */}
            {!isMinimized && (
              <>
                {/* ── BOT SWITCHER CHIP ROW ── */}
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-white/2 overflow-x-auto nemi-scroll z-10">
                  {N8N_BOTS.map((bot) => {
                    const isSelected = bot.id === activeBot.id
                    return (
                      <button
                        key={bot.id}
                        onClick={() => onSelectBot?.(bot.id)}
                        className={`
                          flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap cursor-pointer border
                          ${isSelected
                            ? 'bg-purple-600/30 text-white border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                            : 'bg-white/3 text-white/50 hover:text-white/80 border-white/5 hover:bg-white/6'
                          }
                        `}
                      >
                        <BotIcon botId={bot.id} iconName={bot.icon} className="w-3 h-3 text-purple-300 flex-shrink-0" />
                        <span className="text-[10px]">{bot.shortName}</span>
                      </button>
                    )
                  })}
                </div>

                {/* ── TAB 1: CHAT VIEW ── */}
                {activeTab === 'chat' && (
                  <>
                    <div
                      className="flex-1 overflow-y-auto py-2.5 px-2.5 space-y-2.5 nemi-scroll z-10"
                      onScroll={(e) => {
                        const el = e.currentTarget
                        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
                      }}
                    >
                      {/* Empty state with interactive prompt starters tailored to activeBot */}
                      {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-4 px-2 text-center opacity-90">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)] text-purple-300">
                            <BotIcon botId={activeBot.id} iconName={activeBot.icon} className="w-5 h-5 text-purple-300" />
                          </div>
                          <div>
                            <div className="flex items-center justify-center gap-1.5">
                              <h4 className="text-xs font-semibold text-white/90">{activeBot.name}</h4>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                            <p className="text-[10px] text-white/45 mt-0.5 max-w-xs leading-relaxed">
                              {activeBot.description}
                            </p>
                          </div>

                          {/* Quick starters chips */}
                          <div className="flex flex-col gap-1.5 w-full mt-2">
                            {activeBot.samplePrompts.map((starter, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  onSend(starter.replace(/^[^\w]+/, '').trim())
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-left text-[11px] bg-white/5 hover:bg-white/10 border border-white/5 text-white/75 hover:text-white transition-all cursor-pointer"
                              >
                                {starter}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          onSpeak={onSpeakMessage}
                          onRemember={(content) => onAddMemory && onAddMemory(content, 'general')}
                          isSpeakingThis={isSpeakingText === msg.content}
                        />
                      ))}

                      {/* Thinking shimmer */}
                      {isThinking && messages[messages.length - 1]?.role === 'user' && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                            <span className="text-[10px] font-bold text-white">N</span>
                          </div>
                          <div className="rounded-2xl rounded-tl-xs px-3.5 py-2.5 bg-slate-900/60 border border-purple-400/20 flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                            <span className="text-[10px] text-purple-300 font-mono ml-1">Thinking...</span>
                          </div>
                        </motion.div>
                      )}

                      <div ref={bottomRef} />
                    </div>

                    {/* Scroll to bottom floating button */}
                    <AnimatePresence>
                      {!atBottom && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => {
                            setAtBottom(true)
                            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className="absolute bottom-16 right-4 bg-slate-800/90 rounded-full p-1.5 border border-white/10 shadow-lg text-white/70 hover:text-white cursor-pointer z-20"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* ── INPUT BAR ── */}
                    <div className="border-t border-white/8 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-2 bg-white/2 z-10">
                      {/* Attached files preview chips */}
                      {attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-1 pb-2">
                          {attachedFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px]"
                            >
                              <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[120px] font-mono">{file.name}</span>
                              <span className="text-[9px] text-white/40">({(file.size / 1024).toFixed(1)}k)</span>
                              <button
                                type="button"
                                onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-white/40 hover:text-rose-300 ml-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative flex items-end gap-1.5 bg-white/5 rounded-2xl p-1 border border-white/8 focus-within:border-cyan-400/30 transition-colors">
                        {/* Hidden File Input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          multiple
                          accept=".txt,.py,.js,.ts,.tsx,.jsx,.json,.csv,.md,.html,.css,.sql,.pdf,.ipynb"
                          className="hidden"
                        />

                        {/* File Upload Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 sm:p-2 min-h-[38px] min-w-[38px] sm:min-h-[32px] sm:min-w-[32px] rounded-xl transition-all cursor-pointer flex items-center justify-center flex-shrink-0 text-white/40 hover:text-cyan-300 hover:bg-white/5"
                          title="Upload file or code to chat"
                        >
                          <Paperclip className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>

                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={isListening ? 'Listening via microphone...' : attachedFiles.length > 0 ? 'Ask a question about uploaded file...' : activeBot.placeholder}
                          rows={1}
                          className="
                            flex-1 bg-transparent px-2.5 py-2 sm:px-2 sm:py-1.5
                            text-base sm:text-xs text-white/95 placeholder-white/25
                            border-none focus:outline-none resize-none
                            max-h-24 overflow-y-auto nemi-scroll leading-relaxed
                          "
                          style={{ minHeight: '36px' }}
                          onInput={(e) => {
                            const el = e.currentTarget
                            el.style.height = 'auto'
                            el.style.height = Math.min(el.scrollHeight, 96) + 'px'
                          }}
                        />

                        {/* Voice Dictation Button — automatically disappears when files are attached or uploading so it never obstructs upload! */}
                        {onToggleVoice && attachedFiles.length === 0 && (
                          <button
                            type="button"
                            onClick={onToggleVoice}
                            className={`p-2.5 sm:p-2 min-h-[38px] min-w-[38px] sm:min-h-[32px] sm:min-w-[32px] rounded-xl transition-all cursor-pointer flex items-center justify-center flex-shrink-0 ${
                              isListening
                                ? 'bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                : 'text-white/35 hover:text-cyan-300 hover:bg-white/5'
                            }`}
                            title={isListening ? 'Stop listening' : 'Dictate with mic'}
                          >
                            {isListening ? <MicOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Mic className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                          </button>
                        )}

                        {/* Send button */}
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={(!input.trim() && attachedFiles.length === 0) || isThinking}
                          className={`
                            p-2.5 sm:p-2 min-h-[38px] min-w-[38px] sm:min-h-[32px] sm:min-w-[32px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                            ${(input.trim() || attachedFiles.length > 0) && !isThinking
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_12px_rgba(0,212,255,0.4)] cursor-pointer hover:scale-105 active:scale-95'
                              : 'text-white/20 cursor-not-allowed'
                            }
                          `}
                          title="Send message (Enter)"
                        >
                          <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>

                      {/* Footer micro-indicators */}
                      <div className="flex items-center justify-between px-2 pt-1.5 text-[9px] text-white/30">
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {modelBadge}
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="w-2.5 h-2.5 text-purple-400" />
                          {memories.length > 0 ? `${memories.length} memories loaded` : 'Memory active'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* ── TAB 2: MEMORY VAULT DRAWER ── */}
                {activeTab === 'memory' && (
                  <div className="flex-1 flex flex-col p-3 overflow-hidden z-10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Chat
                      </button>
                      {onClearMemories && memories.length > 0 && (
                        <button
                          onClick={onClearMemories}
                          className="text-[10px] text-red-400/70 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Search Memory */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                      <input
                        type="text"
                        value={memorySearch}
                        onChange={(e) => setMemorySearch(e.target.value)}
                        placeholder="Search learned memories..."
                        className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-purple-400/40"
                      />
                    </div>

                    {/* Add Memory Form */}
                    <form onSubmit={handleCreateMemory} className="space-y-1.5 pt-1">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newMemContent}
                          onChange={(e) => setNewMemContent(e.target.value)}
                          placeholder="Add new memory fact..."
                          className="flex-1 px-2.5 py-1 text-xs bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-purple-400/40"
                        />
                        <select
                          value={newMemCategory}
                          onChange={(e) => setNewMemCategory(e.target.value as any)}
                          className="px-2 py-1 text-[10px] bg-slate-900 border border-white/10 rounded-xl text-white/80 focus:outline-none"
                        >
                          <option value="preference">Preference</option>
                          <option value="project">Project</option>
                          <option value="personal">Personal</option>
                          <option value="general">Fact</option>
                        </select>
                        <button
                          type="submit"
                          disabled={!newMemContent.trim()}
                          className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30 text-xs font-semibold disabled:opacity-30 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </form>

                    {/* Memories List */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 nemi-scroll pr-1">
                      {filteredMemories.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-xs">
                          No memories found.<br />NEMI remembers facts automatically as you chat, or add one above!
                        </div>
                      ) : (
                        filteredMemories.map((mem) => (
                          <div
                            key={mem.id}
                            className="p-2 rounded-xl bg-white/4 hover:bg-white/7 border border-white/5 flex items-start justify-between gap-2 group transition-all"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`
                                  px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider
                                  ${mem.category === 'preference' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20' : ''}
                                  ${mem.category === 'project' ? 'bg-purple-500/10 text-purple-300 border border-purple-400/20' : ''}
                                  ${mem.category === 'personal' ? 'bg-amber-500/10 text-amber-300 border border-amber-400/20' : ''}
                                  ${mem.category === 'general' ? 'bg-white/10 text-white/60' : ''}
                                `}>
                                  {mem.category}
                                </span>
                              </div>
                              <p className="text-xs text-white/85 leading-snug break-words">
                                {mem.content}
                              </p>
                            </div>

                            {onDeleteMemory && (
                              <button
                                onClick={() => onDeleteMemory(mem.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-opacity cursor-pointer"
                                title="Forget this memory"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: CONVERSATION HISTORY DRAWER ── */}
                {activeTab === 'history' && (
                  <div className="flex-1 flex flex-col p-3 overflow-hidden z-10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Chat
                      </button>
                      {onNewConversation && (
                        <button
                          onClick={() => {
                            onNewConversation()
                            setActiveTab('chat')
                          }}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                        >
                          <Plus className="w-3 h-3" /> New Chat
                        </button>
                      )}
                    </div>

                    {/* Search Conversations */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                      <input
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-cyan-400/40"
                      />
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 nemi-scroll pr-1">
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-xs">
                          No conversations found.
                        </div>
                      ) : (
                        filteredConversations.map((conv) => {
                          const isCurrent = conv.id === activeConversationId
                          return (
                            <div
                              key={conv.id}
                              onClick={() => {
                                onSelectConversation?.(conv.id)
                                setActiveTab('chat')
                              }}
                              className={`
                                p-2.5 rounded-xl border flex items-center justify-between gap-2 group cursor-pointer transition-all
                                ${isCurrent
                                  ? 'bg-cyan-500/15 border-cyan-400/30'
                                  : 'bg-white/4 hover:bg-white/8 border-white/5'
                                }
                              `}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className={`text-xs font-semibold truncate ${isCurrent ? 'text-cyan-300' : 'text-white/80'}`}>
                                    {conv.title}
                                  </h5>
                                  <span className="text-[9px] text-white/25 font-mono">
                                    {new Date(conv.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/35 truncate mt-0.5">
                                  {conv.preview || 'No messages yet'}
                                </p>
                              </div>

                              {onDeleteConversation && conversations.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteConversation(conv.id)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-opacity"
                                  title="Delete conversation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
