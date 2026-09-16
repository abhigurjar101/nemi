import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, FileText, Search, Trash2, Database,
  Loader2, CheckCircle2, AlertCircle, ChevronRight,
  Brain, Zap, BookOpen, Layers, Sparkles, RotateCcw, Info
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type RagStep =
  | 'idle'
  | 'embedding-query'   // 1. Embedding the question
  | 'retrieving'        // 2. Vector similarity search
  | 'found-chunks'      // 3. Got top-K chunks
  | 'augmenting'        // 4. Building enriched prompt
  | 'generating'        // 5. LLM streaming answer
  | 'done'              // 6. Complete
  | 'error'

interface RagStepState {
  step: RagStep
  chunks: RagChunk[]
  answer: string
  error: string
  totalSearched: number
  embeddingMode: string
}

// ─────────────────────────────────────────────────────────────
// PIPELINE STEP CARD
// ─────────────────────────────────────────────────────────────
const STEP_DEFS = [
  { id: 'embedding-query', icon: Brain,       label: 'Embedding Query',   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',    border: 'border-cyan-400/30' },
  { id: 'retrieving',      icon: Search,      label: 'Vector Search',     color: 'text-violet-400', bg: 'bg-violet-500/10',  border: 'border-violet-400/30' },
  { id: 'found-chunks',    icon: Layers,      label: 'Retrieved Sources', color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' },
  { id: 'augmenting',      icon: Sparkles,    label: 'Augmenting Prompt', color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-400/30' },
  { id: 'generating',      icon: Zap,         label: 'Generating Answer', color: 'text-pink-400',   bg: 'bg-pink-500/10',    border: 'border-pink-400/30' },
  { id: 'done',            icon: CheckCircle2,label: 'Answer Ready',      color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-400/30' },
]

const STEP_ORDER: RagStep[] = ['embedding-query','retrieving','found-chunks','augmenting','generating','done']

function PipelineStep({
  def, isActive, isDone, children
}: {
  def: typeof STEP_DEFS[0]
  isActive: boolean
  isDone: boolean
  children?: React.ReactNode
}) {
  const Icon = def.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border p-3 transition-all ${
        isActive ? `${def.bg} ${def.border} shadow-lg` :
        isDone   ? 'bg-white/3 border-white/10' :
                   'bg-white/2 border-white/5 opacity-40'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive || isDone ? def.bg : 'bg-white/5'}`}>
          {isActive && def.id !== 'done' ? (
            <Loader2 className={`w-4 h-4 ${def.color} animate-spin`} />
          ) : (
            <Icon className={`w-4 h-4 ${isActive || isDone ? def.color : 'text-white/30'}`} />
          )}
        </div>
        <span className={`text-xs font-semibold tracking-wide ${isActive || isDone ? def.color : 'text-white/30'}`}>
          {def.label}
        </span>
        {isDone && !isActive && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto flex-shrink-0" />
        )}
      </div>
      {(isActive || isDone) && children && (
        <div className="ml-9">{children}</div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// SOURCE CHUNK CARD
// ─────────────────────────────────────────────────────────────
function ChunkCard({ chunk, rank }: { chunk: RagChunk; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.round(chunk.similarity * 100)
  const barColor = pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className="bg-white/4 border border-white/10 rounded-xl p-3 cursor-pointer hover:border-white/20 transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-2">
        {/* Rank badge */}
        <div className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-violet-300">{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-white/70 truncate">{chunk.doc_name}</span>
            <span className="text-[10px] text-white/35 flex-shrink-0">§{chunk.chunk_index + 1}</span>
            {/* Similarity bar */}
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-[10px] font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{pct}%</span>
            </div>
          </div>
          <p className={`text-xs text-white/55 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {chunk.text}
          </p>
          {!expanded && chunk.text.length > 120 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setExpanded(true)
              }}
              className="text-[10px] text-cyan-400/70 mt-1 hover:text-cyan-400"
            >
              Show more <ChevronRight className="w-2.5 h-2.5 inline" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT LIBRARY ITEM
// ─────────────────────────────────────────────────────────────
function DocItem({ doc, onDelete }: { doc: RagDoc; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/4 border border-white/8 rounded-xl hover:border-white/15 transition-all group">
      <FileText className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{doc.name}</p>
        <p className="text-[10px] text-white/35">{doc.chunk_count} chunks · {(doc.total_words / 1000).toFixed(1)}k words</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function KnowledgeGraph({ graph, onSearch }: { graph: RagGraphResult; onSearch: (value: string) => void }) {
  const width = 420
  const height = 230
  const nodes = graph.nodes.slice(0, 40)
  const positions = new Map(nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2
    const radius = Math.min(width, height) * 0.34
    return [node.id, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius }] as const
  }))

  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-3 shadow-[0_0_35px_rgba(16,185,129,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">Knowledge Graph</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-100/45">{graph.nodes.length} entities · {graph.edges.length} relationships</p>
        </div>
        <input
          aria-label="Search knowledge graph"
          placeholder="Find entity"
          onChange={(event) => onSearch(event.target.value)}
          className="w-28 rounded-lg border border-emerald-300/20 bg-black/20 px-2 py-1 text-[10px] text-emerald-50 placeholder-emerald-100/30 outline-none focus:border-emerald-300/60"
        />
      </div>
      {nodes.length > 0 ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible rounded-xl bg-black/15" role="img" aria-label="Knowledge graph entities and relationships">
          <defs>
            <filter id="graph-glow"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {graph.edges.map((edge) => {
            const source = positions.get(edge.source_id)
            const target = positions.get(edge.target_id)
            if (!source || !target) return null
            return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#34d399" strokeOpacity="0.28" strokeWidth="1.2" />
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id)
            if (!position) return null
            return (
              <g key={node.id} filter="url(#graph-glow)">
                <circle cx={position.x} cy={position.y} r="5.5" fill="#39ff88" fillOpacity="0.9" />
                <circle cx={position.x} cy={position.y} r="10" fill="none" stroke="#34d399" strokeOpacity="0.2" />
                <text x={position.x} y={position.y + 18} textAnchor="middle" fill="#bbf7d0" fontSize="8" opacity="0.86">{node.name.slice(0, 22)}</text>
              </g>
            )
          })}
        </svg>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-emerald-300/15 text-xs text-emerald-100/40">Upload knowledge to grow the graph</div>
      )}
      {graph.edges.length > 0 && (
        <div className="mt-2 space-y-1">
          {graph.edges.slice(0, 3).map((edge) => (
            <p key={edge.id} className="truncate text-[10px] text-emerald-100/45">{edge.source_name} <span className="text-emerald-300">{edge.type}</span> {edge.target_name}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN RAG PANEL
// ─────────────────────────────────────────────────────────────
interface RagPanelProps {
  isVisible: boolean
  onClose: () => void
  onThinkingChange: (thinking: boolean) => void
  ollamaRunning: boolean
  ollamaModel: string
  modelMode: 'ollama' | 'nvidia-nim'
  nvidiaNimKey?: string
  fullScreen?: boolean
}

export default function RagPanel({
  isVisible, onClose, onThinkingChange,
  ollamaRunning,
  ollamaModel,
  modelMode,
  nvidiaNimKey = '',
  fullScreen = false,
}: RagPanelProps) {

  const [docs, setDocs] = useState<RagDoc[]>([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [graph, setGraph] = useState<RagGraphResult>({ nodes: [], edges: [] })
  const [ragStatus, setRagStatus] = useState<{ running: boolean; embeddingMode: string; modelLoading: boolean }>({
    running: false, embeddingMode: 'none', modelLoading: false
  })

  const [query, setQuery] = useState('')
  const [pipeline, setPipeline] = useState<RagStepState>({
    step: 'idle', chunks: [], answer: '', error: '', totalSearched: 0, embeddingMode: ''
  })

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerRef = useRef<string>('')
  const queryInputRef = useRef<HTMLTextAreaElement>(null)
  const mountedRef = useRef(true)
  const pipelineRunRef = useRef(0)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      pipelineRunRef.current += 1
      onThinkingChange(false)
    }
  }, [onThinkingChange])

  // ── Load docs & check status on open ──
  useEffect(() => {
    if (!isVisible) return
    loadDocs()
    loadGraph()
    checkStatus()
    const iv = setInterval(() => { checkStatus(); loadDocs() }, 5000)
    return () => clearInterval(iv)
  }, [isVisible])

  const checkStatus = async () => {
    try {
      const res = await window.nemi?.checkRagServer()
      if (res) {
        setRagStatus({ running: res.running, embeddingMode: res.embedding_mode, modelLoading: res.model_loading })
      }
    } catch { /* ignore */ }
  }

  const loadDocs = async () => {
    try {
      const res = await window.nemi?.ragDocs()
      if (res) {
        setDocs(res.docs as RagDoc[])
        setTotalChunks(res.total_chunks)
      }
    } catch { /* ignore */ }
  }

  const loadGraph = async (query = '') => {
    try {
      const result = await window.nemi?.ragGraph(query, 40)
      if (result && !result.error) setGraph(result)
    } catch { /* graph is an enhancement; vector RAG remains available */ }
  }

  // ── File upload / indexing ──
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string || '')
      reader.onerror = reject
      reader.readAsText(file, 'utf-8')
    })
  }

  const uploadFile = useCallback(async (file: File) => {
    if (!ragStatus.running) {
      setUploadStatus('RAG server not running. Please wait...')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const textExts = ['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'xml', 'yaml', 'yml', 'log', 'ini', 'env', 'sh', 'sql', 'c', 'cpp', 'h', 'java', 'rs', 'go', 'pdf']
    if (!textExts.includes(ext) && !file.type.startsWith('text/')) {
      setUploadStatus(`Skipped ${file.name}: unsupported binary format. Please upload text, markdown, or code files.`)
      setTimeout(() => setUploadStatus(''), 4000)
      return
    }
    setUploadStatus(`Reading ${file.name}...`)
    try {
      const text = await readFileAsText(file)
      if (!text.trim()) {
        setUploadStatus('File appears empty or unreadable')
        return
      }
      setUploadStatus(`Chunking & embedding ${file.name}...`)
      const result = await window.nemi?.ragUpload(file.name, text)
      if (result && (result as RagUploadResult).error) {
        setUploadStatus(`Error: ${(result as RagUploadResult).error}`)
      } else if (result) {
        const r = result as RagUploadResult
        setUploadStatus(`Indexed ${r.chunks} chunks from ${file.name} (${r.embedding_mode === 'bge-m3' ? 'BGE-M3' : 'TF-IDF'})`)
        await loadDocs()
        await loadGraph()
      }
    } catch (e) {
      setUploadStatus(`Upload failed: ${e}`)
    }
    setTimeout(() => setUploadStatus(''), 4000)
  }, [ragStatus.running])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      await uploadFile(file)
    }
  }, [uploadFile])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      await uploadFile(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [uploadFile])

  const loadSampleDoc = useCallback(async () => {
    setUploadStatus('Indexing sample knowledge document (NEMI Overview)...')
    const sampleText = `NEMI Desktop AI Assistant Overview
NEMI is an ultra-fast, next-generation AI desktop assistant designed for speed, privacy, and intelligence.

Architecture & Key Capabilities:
- 3D Neural Brain: Visualizes AI thought states, listening levels, and speech cadence with responsive particle dynamics.
- Voice Loop: Features Kokoro 82M Neural TTS (24kHz natural speech) and faster-whisper local STT with natural silence detection.
- Ambient Wake-Word Mode: Say "Hey NEMI" or "Hey NEMI, I am Abhi" for instant briefing or direct queries.
- RAG (Retrieval-Augmented Generation): Neural embeddings with BGE-M3 (1024-dim dense vectors) and TF-IDF fallback with cosine similarity search.
- Local AI Routing: Generate answers with Ollama while keeping document retrieval on-device.
- Global Hotkeys: Command+Shift+Space triggers Voice Mode anywhere; Command+K opens quick chat.`

    try {
      const result = await window.nemi?.ragUpload('NEMI-Overview.txt', sampleText)
      if (result && (result as RagUploadResult).chunks) {
        setUploadStatus(`Indexed ${(result as RagUploadResult).chunks} chunks from NEMI-Overview.txt (${(result as RagUploadResult).embedding_mode === 'bge-m3' ? 'BGE-M3' : 'TF-IDF'})`)
        await loadDocs()
        await loadGraph()
      }
    } catch (e: any) {
      setUploadStatus(`Failed to load sample: ${e.message || e}`)
    }
    setTimeout(() => setUploadStatus(''), 4000)
  }, [loadDocs])

  // ── RAG query pipeline ──
  const runRagPipeline = useCallback(async () => {
    const q = query.trim()
    if (!q || pipeline.step !== 'idle') return

    const runId = pipelineRunRef.current + 1
    pipelineRunRef.current = runId
    const isCurrentRun = () => mountedRef.current && pipelineRunRef.current === runId

    answerRef.current = ''
    setPipeline({ step: 'embedding-query', chunks: [], answer: '', error: '', totalSearched: 0, embeddingMode: '' })
    onThinkingChange(true)

    try {
      // Step 1: Embed query (visual pause)
      await new Promise(r => setTimeout(r, 600))
      if (!isCurrentRun()) return

      // Step 2: Retrieve
      setPipeline(p => ({ ...p, step: 'retrieving' }))
      const ragResult = await window.nemi?.ragQuery(q, 5) as RagQueryResult | undefined
      if (!isCurrentRun()) return

      if (!ragResult || ragResult.error) {
        throw new Error(ragResult?.error || 'RAG server error')
      }

      const chunks = (ragResult.chunks || []) as RagChunk[]

      // Step 3: Show chunks
      setPipeline(p => ({
        ...p, step: 'found-chunks', chunks,
        totalSearched: ragResult.total_chunks_searched || 0,
        embeddingMode: ragResult.embedding_mode || ''
      }))
      await new Promise(r => setTimeout(r, 600))
      if (!isCurrentRun()) return

      let augmentedPrompt = ragResult.augmented_prompt || ''
      let fallbackPrefix = ''

      if (chunks.length === 0) {
        fallbackPrefix = '> *Synthesized via Neural Core Intelligence:*\n\n'
        augmentedPrompt = `Question: ${q}\n\nPlease answer this question clearly, concisely, and helpfully.`
      }

      // Step 4: Augment
      setPipeline(p => ({ ...p, step: 'augmenting' }))
      await new Promise(r => setTimeout(r, 500))
      if (!isCurrentRun()) return

      // Step 5: Generate with LLM
      setPipeline(p => ({ ...p, step: 'generating' }))

      let fullAnswer = ''

      // Choose AI engine via main-process proxy
      const useOllama = modelMode === 'ollama' && ollamaRunning

      if (useOllama) {
        const messages = [
          { role: 'system', content: 'You are NEMI. Answer based on context if provided, or answer directly and helpfully.' },
          { role: 'user', content: augmentedPrompt }
        ]
        const res = await window.nemi?.chat({
          provider: 'ollama',
          model: ollamaModel,
          messages,
        })
        if (res?.error) throw new Error(res.error)
        fullAnswer = res?.text || ''
      } else if (modelMode === 'nvidia-nim' && nvidiaNimKey) {
        const res = await window.nemi?.chat({
          provider: 'nvidia-nim',
          model: 'nvidia/nemotron-3-super-120b-a12b',
          messages: [{ role: 'user', content: augmentedPrompt }],
        })
        if (res?.error) throw new Error(res.error)
        fullAnswer = res?.text || ''
      } else {
        if (chunks.length > 0) {
          fullAnswer = chunks.slice(0, 3).map((c, i) =>
            `**[Source ${i+1}: ${c.doc_name} §${c.chunk_index+1}]** (${Math.round(c.similarity*100)}% match)\n\n${c.text}`
          ).join('\n\n---\n\n')
          fullAnswer += '\n\n*Start Ollama to get a generated answer.*'
        } else {
          fullAnswer = 'No knowledge base documents found. Upload documents above, or configure an AI model in Settings to get full answers!'
        }
      }

      if (!isCurrentRun()) return
      setPipeline(p => ({ ...p, step: 'done', answer: fallbackPrefix + fullAnswer }))

    } catch (err) {
      if (!isCurrentRun()) return
      setPipeline(p => ({
        ...p,
        step: 'error',
        error: err instanceof Error ? err.message : String(err)
      }))
    } finally {
      if (isCurrentRun()) onThinkingChange(false)
    }
  }, [query, pipeline.step, modelMode, ollamaRunning, ollamaModel, nvidiaNimKey, onThinkingChange])

  const resetPipeline = () => {
    setPipeline({ step: 'idle', chunks: [], answer: '', error: '', totalSearched: 0, embeddingMode: '' })
  }

  const handleDeleteDoc = async (docId: string) => {
    if (window.nemi?.ragDelete) {
      await window.nemi.ragDelete(docId)
    }
    await loadDocs()
  }

  const stepIdx = STEP_ORDER.indexOf(pipeline.step)
  const isRunning = !['idle','done','error'].includes(pipeline.step)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -50, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className={fullScreen
            ? 'fixed inset-0 w-full z-40 flex flex-col'
            : 'fixed left-6 top-1/2 -translate-y-1/2 w-[460px] z-40 flex flex-col'}
          style={{ maxHeight: fullScreen ? '100vh' : '86vh' }}
        >
          <div className="glass-panel flex flex-col overflow-hidden" style={{ height: fullScreen ? '100vh' : '86vh', borderRadius: fullScreen ? 0 : undefined }}>

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${ragStatus.running ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-sm font-bold text-white/90">RAG Knowledge Interface</span>
                {ragStatus.modelLoading && (
                  <span className="text-[10px] text-amber-400 animate-pulse flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading BGE-M3...
                  </span>
                )}
                {!ragStatus.modelLoading && ragStatus.running && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                    ragStatus.embeddingMode === 'bge-m3'
                      ? 'text-violet-300 border-violet-400/30 bg-violet-500/10'
                      : 'text-amber-300 border-amber-400/30 bg-amber-500/10'
                  }`}>
                    {ragStatus.embeddingMode === 'bge-m3' ? 'BGE-M3' : ragStatus.embeddingMode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-[10px] text-white/35">{totalChunks} chunks</div>
                <button onClick={onClose} aria-label="Close knowledge base panel" className="icon-btn ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto nemi-scroll">

              {/* ── DROP ZONE ── */}
              <div className="px-4 pt-4">
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-cyan-400/60 bg-cyan-500/10 scale-[1.01]'
                      : 'border-white/15 hover:border-white/30 hover:bg-white/3'
                  }`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-2 ${isDragOver ? 'text-cyan-400' : 'text-white/30'}`} />
                  <p className="text-xs text-white/50">
                    Drop files here or <span className="text-cyan-400">click to upload</span>
                  </p>
                  <p className="text-[10px] text-white/25 mt-1">Supports .txt · .md · .csv · .py · .js · .json and more</p>
                  {docs.length === 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void loadSampleDoc()
                      }}
                      className="mt-3 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Load Sample Knowledge (NEMI Overview)</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  aria-label="Upload knowledge files"
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.py,.js,.ts,.json,.html,.xml,.yaml,.yml,.rst,.tex"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Upload status */}
                <AnimatePresence>
                  {uploadStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                    >
                      {uploadStatus}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── DOCUMENT LIBRARY ── */}
              {docs.length > 0 && (
                <div className="px-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Indexed Documents</span>
                    </div>

                    <button
                      onClick={async () => { await window.nemi?.ragClear(); loadDocs() }}
                      className="text-[10px] text-white/30 hover:text-rose-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear all
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {docs.map(doc => (
                      <DocItem key={doc.doc_id} doc={doc} onDelete={() => handleDeleteDoc(doc.doc_id)} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── ADVANCED RAG CAPABILITIES ── */}
              {docs.length > 0 && (
                <div className="px-4 mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Advanced RAG</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { icon: Brain, label: 'Semantic Search', detail: `${totalChunks} indexed chunks`, color: 'text-cyan-300 border-cyan-400/20 bg-cyan-500/8' },
                      { icon: Layers, label: 'Source Reranking', detail: 'Similarity scored', color: 'text-violet-300 border-violet-400/20 bg-violet-500/8' },
                      { icon: Database, label: 'Knowledge Graph', detail: `${graph.nodes.length} entities`, color: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/8' },
                      { icon: CheckCircle2, label: 'Cited Answers', detail: 'Source grounded', color: 'text-amber-300 border-amber-400/20 bg-amber-500/8' },
                    ].map(({ icon: Icon, label, detail, color }) => (
                      <div key={label} className={`rounded-xl border px-2.5 py-2 ${color}`}>
                        <Icon className="w-3.5 h-3.5 mb-1" />
                        <p className="text-[10px] font-semibold">{label}</p>
                        <p className="text-[9px] opacity-60 mt-0.5">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {docs.length > 0 && (
                <div className="px-4">
                  <KnowledgeGraph graph={graph} onSearch={(value) => void loadGraph(value)} />
                </div>
              )}

              {/* ── QUERY INPUT ── */}
              <div className="px-4 mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Ask Your Documents</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    ref={queryInputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runRagPipeline() }
                    }}
                    placeholder="Ask anything about your documents..."
                    rows={2}
                    disabled={isRunning}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/25 resize-none focus:outline-none focus:border-violet-400/40 transition-colors"
                    style={{ minHeight: '60px', maxHeight: '100px' }}
                    onInput={e => {
                      const el = e.currentTarget
                      el.style.height = 'auto'
                      el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                    }}
                  />
                  <div className="flex flex-col gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={runRagPipeline}
                      disabled={!query.trim() || isRunning}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                        query.trim() && !isRunning
                          ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] cursor-pointer hover:scale-105'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>{isRunning ? 'Running' : 'Ask'}</span>
                    </motion.button>
                    {pipeline.step !== 'idle' && (
                      <button
                        onClick={resetPipeline}
                        className="px-3 py-2 rounded-xl text-[10px] text-white/30 hover:text-white/60 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
                {docs.length === 0 && (
                  <p className="text-[10px] text-cyan-400/60 mt-1.5 flex items-center gap-1.5">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span>Knowledge base empty: queries will be answered with general AI.</span>
                  </p>
                )}
              </div>

              {/* ── PIPELINE VISUALIZATION ── */}
              <AnimatePresence>
                {pipeline.step !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-4 mt-4 pb-4"
                  >
                    <div className="flex items-center gap-1.5 mb-3">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">RAG Pipeline</span>
                    </div>

                    <div className="space-y-2">
                      {STEP_DEFS.map((def, i) => {
                        const myIdx = STEP_ORDER.indexOf(def.id as RagStep)
                        const isActive = pipeline.step === def.id
                        const isDone = stepIdx > myIdx && pipeline.step !== 'error'

                        return (
                          <PipelineStep key={def.id} def={def} isActive={isActive} isDone={isDone}>
                            {/* Per-step content */}
                            {def.id === 'embedding-query' && (isActive || isDone) && (
                              <p className="text-[11px] text-white/50 italic">"{query.slice(0, 60)}{query.length > 60 ? '…' : ''}"</p>
                            )}

                            {def.id === 'retrieving' && (isActive || isDone) && (
                              <p className="text-[11px] text-white/50">
                                Searching {pipeline.totalSearched || '?'} chunks with cosine similarity...
                              </p>
                            )}

                            {def.id === 'found-chunks' && isDone && pipeline.chunks.length > 0 && (
                              <div className="space-y-1.5 mt-1">
                                {pipeline.chunks.map((c, rank) => (
                                  <ChunkCard key={c.id} chunk={c} rank={rank + 1} />
                                ))}
                              </div>
                            )}

                            {def.id === 'augmenting' && (isActive || isDone) && (
                              <p className="text-[11px] text-white/50">
                                Building enriched prompt with {pipeline.chunks.length} source chunks...
                              </p>
                            )}

                            {def.id === 'generating' && (isActive || isDone) && pipeline.answer && (
                              <div className="mt-1 text-xs text-white/60 leading-relaxed line-clamp-3 italic">
                                {pipeline.answer.slice(0, 150)}
                                {pipeline.answer.length > 150 && '…'}
                              </div>
                            )}

                            {def.id === 'done' && isDone && (
                              <p className="text-[11px] text-emerald-400/70">
                                Generated from {pipeline.chunks.length} sources via {
                                  modelMode === 'ollama' && ollamaRunning ? ollamaModel : 'context only'
                                }
                              </p>
                            )}
                          </PipelineStep>
                        )
                      })}

                      {/* Error state */}
                      {pipeline.step === 'error' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-rose-500/10 border border-rose-400/30 rounded-xl p-3 flex items-start gap-2"
                        >
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-rose-400">Pipeline Error</p>
                            <p className="text-[11px] text-rose-300/70 mt-0.5">{pipeline.error}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* ── FINAL ANSWER ── */}
                    <AnimatePresence>
                      {pipeline.step === 'done' && pipeline.answer && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4"
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[11px] font-semibold text-green-400 uppercase tracking-widest">Answer</span>
                          </div>
                          <div className="bg-white/4 border border-green-400/20 rounded-xl p-4">
                            <div
                              className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                              {pipeline.answer}
                            </div>
                            {/* Source citation chips */}
                            {pipeline.chunks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/8">
                                <span className="text-[10px] text-white/35 mr-1">Sources:</span>
                                {pipeline.chunks.slice(0, 5).map((c, i) => (
                                  <span
                                    key={c.id}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/25 text-violet-300"
                                  >
                                    [{i+1}] {c.doc_name} §{c.chunk_index+1}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── EMPTY STATE ── */}
              {docs.length === 0 && pipeline.step === 'idle' && (
                <div className="flex flex-col items-center justify-center py-8 opacity-50">
                  <Database className="w-10 h-10 text-white/20 mb-3" />
                  <p className="text-sm text-white/40 text-center">No documents indexed yet</p>
                  <p className="text-xs text-white/25 text-center mt-1">Drop text files above to get started</p>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
