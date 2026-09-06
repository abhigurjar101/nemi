import { contextBridge, ipcRenderer } from 'electron'

// ──────────────────────────────────────────────────────────
// NEMI RENDERER ↔ MAIN PROCESS BRIDGE
// ──────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('nemi', {
  // ── Window control ──
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),
  focusWindow: () => ipcRenderer.send('focus-window'),
  enterInteractiveMode: () => ipcRenderer.send('enter-interactive-mode'),
  enterPassiveMode: () => ipcRenderer.send('enter-passive-mode'),
  getDisplayInfo: () => ipcRenderer.invoke('get-display-info'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  requestMicPermission: () => ipcRenderer.invoke('request-mic-permission'),
  openRagWindow: () => ipcRenderer.invoke('open-rag-window'),
  closeRagWindow: () => ipcRenderer.invoke('close-rag-window'),

  // ── Services & local AI routing ──
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  chat: (request: { provider: 'ollama' | 'nvidia-nim'; model: string; messages: Array<{ role: string; content: string }>; apiKey?: string }) =>
    ipcRenderer.invoke('chat', request),
  saveNvidiaNimKey: (key: string) => ipcRenderer.invoke('save-nvidia-nim-key', key),
  getNvidiaNimKey: () => ipcRenderer.invoke('get-nvidia-nim-key'),
  validateNvidiaNimKey: (key: string) => ipcRenderer.invoke('validate-nvidia-nim-key', key),

  // ── Persistent Chat & Long-term Memory ──
  getStoredConversations: () => ipcRenderer.invoke('get-stored-conversations'),
  saveStoredConversations: (conversations: unknown) =>
    ipcRenderer.invoke('save-stored-conversations', conversations),
  getStoredMemories: () => ipcRenderer.invoke('get-stored-memories'),
  saveStoredMemories: (memories: unknown) =>
    ipcRenderer.invoke('save-stored-memories', memories),

  // ── Ollama (local LLM) ──
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  ollamaChat: (messages: Array<{role: string; content: string}>, model: string) =>
    ipcRenderer.invoke('ollama-chat', { messages, model }),

  // ── Voice server (Kokoro TTS + Whisper STT) ──
  checkVoiceServer: () => ipcRenderer.invoke('check-voice-server'),
  ttsSpeak: (text: string, voice?: string, speed?: number) =>
    ipcRenderer.invoke('tts-speak', { text, voice, speed }),
  setVoice: (voice: string) => ipcRenderer.invoke('set-voice', { voice }),
  // Local Whisper transcription — send base64 audio with real MIME type
  voiceTranscribe: (wavBase64: string, mimeType?: string) =>
    ipcRenderer.invoke('voice-transcribe', { wavBase64, mimeType }),

  // ── RAG server (BGE-M3 embeddings + retrieval) ──
  checkRagServer: () => ipcRenderer.invoke('check-rag-server'),
  ragDocs: () => ipcRenderer.invoke('rag-docs'),
  ragGraph: (query?: string, limit?: number) => ipcRenderer.invoke('rag-graph', { query, limit }),
  ragUpload: (name: string, text: string, docId?: string) =>
    ipcRenderer.invoke('rag-upload', { name, text, doc_id: docId }),
  ragDelete: (docId: string) =>
    ipcRenderer.invoke('rag-delete', docId),
  ragQuery: (query: string, topK?: number) =>
    ipcRenderer.invoke('rag-query', { query, top_k: topK }),
  ragClear: () => ipcRenderer.invoke('rag-clear'),

  // ── Listen for hotkey/streaming events from main process ──
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      'toggle-voice',
      'toggle-sidebar',
      'open-chat',
      'open-settings',
      'dismiss-ui',
      'toggle-ui',
      'ollama-stream-chunk',
      'ollama-stream-done',
      'play-audio',
      'rag-step',
    ]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
})

// ──────────────────────────────────────────────────────────
// TYPE DECLARATIONS (available in renderer)
// ──────────────────────────────────────────────────────────
declare global {
  interface Window {
    nemi: {
      setIgnoreMouse: (ignore: boolean) => void
      focusWindow: () => void
      enterInteractiveMode: () => void
      enterPassiveMode: () => void
      getDisplayInfo: () => Promise<{ x: number; y: number; width: number; height: number }>
      openExternal: (url: string) => void
      requestMicPermission: () => Promise<boolean>
      openRagWindow: () => Promise<boolean>
      closeRagWindow: () => Promise<boolean>
      // Service status & Ollama routing
      getServiceStatus: () => Promise<ServiceStatusInfo[]>
      chat: (request: ChatRequestPayload) => Promise<{ text: string; error?: string }>
      saveNvidiaNimKey: (key: string) => Promise<boolean>
      getNvidiaNimKey: () => Promise<string>
      validateNvidiaNimKey: (key: string) => Promise<{ valid: boolean; message?: string; error?: string }>
      // Persistent Chat & Memory
      getStoredConversations: () => Promise<any[]>
      saveStoredConversations: (conversations: any[]) => Promise<boolean>
      getStoredMemories: () => Promise<any[]>
      saveStoredMemories: (memories: any[]) => Promise<boolean>
      // Ollama
      checkOllama: () => Promise<{ running: boolean; models: string[] }>
      ollamaChat: (messages: Array<{role: string; content: string}>, model: string) => Promise<string>
      // Voice / TTS / STT
      checkVoiceServer: () => Promise<{ running: boolean; kokoro: boolean; voice: string; stt: string }>
      ttsSpeak: (text: string, voice?: string, speed?: number) => Promise<boolean>
      setVoice: (voice: string) => Promise<boolean>
      voiceTranscribe: (wavBase64: string, mimeType?: string) => Promise<{ text: string; mode: string }>
      // RAG
      checkRagServer: () => Promise<{ running: boolean; embedding_mode: string; doc_count: number; chunk_count: number; model_loading: boolean }>
      ragDocs: () => Promise<{ docs: RagDoc[]; total_chunks: number }>
      ragGraph: (query?: string, limit?: number) => Promise<RagGraphResult>
      ragUpload: (name: string, text: string, docId?: string) => Promise<RagUploadResult>
      ragDelete: (docId: string) => Promise<{ status: string; doc_id: string }>
      ragQuery: (query: string, topK?: number) => Promise<RagQueryResult>
      ragClear: () => Promise<boolean>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }

  interface ServiceStatusInfo {
    name: string
    state: 'ready' | 'starting' | 'error'
    owned: boolean
    detail?: string
  }

  interface ChatRequestPayload {
    provider: 'ollama' | 'nvidia-nim'
    model: string
    messages: Array<{ role: string; content: string }>
    apiKey?: string
  }

  interface RagDoc {
    doc_id: string
    name: string
    chunk_count: number
    total_words: number
    added_at: number
  }

  interface RagChunk {
    id: string
    doc_id: string
    doc_name: string
    chunk_index: number
    text: string
    similarity: number
    word_count: number
  }

  interface RagUploadResult {
    doc_id?: string
    doc_name?: string
    chunks?: number
    embedding_mode?: string
    elapsed_s?: number
    error?: string
  }

  interface RagQueryResult {
    query?: string
    chunks?: RagChunk[]
    context?: string
    augmented_prompt?: string
    embedding_mode?: string
    total_chunks_searched?: number
    error?: string
    note?: string
  }

  interface RagGraphNode {
    id: string
    name: string
    canonical_name: string
    type: string
    doc_id?: string
    doc_name?: string
  }

  interface RagGraphEdge {
    id: string
    source_id: string
    target_id: string
    source_name: string
    target_name: string
    type: string
    evidence: string
    confidence: number
    chunk_id: string
    doc_name?: string
  }

  interface RagGraphResult {
    nodes: RagGraphNode[]
    edges: RagGraphEdge[]
    entity_count?: number
    relationship_count?: number
    error?: string
  }
}
