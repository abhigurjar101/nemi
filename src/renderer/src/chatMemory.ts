import type { Message } from './components/ChatPanel'

export interface ConversationSession {
  id: string
  title: string
  preview: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
}

export interface MemoryItem {
  id: string
  content: string
  category: 'preference' | 'project' | 'personal' | 'general'
  timestamp: number
  sourceConvId?: string
}

const CONVERSATIONS_STORAGE_KEY = 'nemi_conversations_v2'
const MEMORIES_STORAGE_KEY = 'nemi_memories_v2'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

// ── Default Welcome Conversation ─────────────────────────────
export function createDefaultConversation(): ConversationSession {
  return {
    id: uid(),
    title: 'Welcome to NEMI',
    preview: 'Ask me anything or talk with me...',
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `### 🧠 Welcome to NEMI\n\nI'm your next-generation desktop AI companion.\n\n- 💬 **Interactive Chat**: Type your questions, code, or ideas.\n- 🧠 **Persistent Memory**: I remember your preferences and project details across sessions.\n- 🎙️ **Voice Ready**: Press \`⌘⇧Space\` or click the mic button to speak.\n- 📁 **RAG Connected**: Query your local documents in real-time.`,
        timestamp: new Date(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
  }
}

// ── Conversation Persistence ─────────────────────────────────
export async function loadStoredConversations(): Promise<ConversationSession[]> {
  try {
    if (typeof window !== 'undefined' && window.nemi?.getStoredConversations) {
      const stored = await window.nemi.getStoredConversations()
      if (Array.isArray(stored) && stored.length > 0) {
        return stored.map((c) => ({
          ...c,
          messages: (c.messages || []).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }))
      }
    }

    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => ({
            ...c,
            messages: (c.messages || []).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }))
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load stored conversations:', err)
  }

  const defaultConv = createDefaultConversation()
  await saveStoredConversations([defaultConv])
  return [defaultConv]
}

export async function saveStoredConversations(conversations: ConversationSession[]): Promise<void> {
  try {
    const serialized = JSON.stringify(conversations)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, serialized)
    }
    if (typeof window !== 'undefined' && window.nemi?.saveStoredConversations) {
      await window.nemi.saveStoredConversations(conversations)
    }
    if (typeof fetch !== 'undefined' && typeof window !== 'undefined' && !window.nemi) {
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('Failed to save conversations:', err)
  }
}

// ── Smart Title Generator ────────────────────────────────────
export function generateConversationTitle(firstUserText: string): string {
  if (typeof firstUserText !== 'string' || !firstUserText.trim()) return 'New Conversation'
  let clean = firstUserText.trim()
  // Strip slash commands repeatedly (e.g. /boost /goal /remember)
  clean = clean.replace(/^(?:\/(?:remember|goal|boost)\s*)+/gi, '')
  // Strip markdown prefixes and special leading symbols
  clean = clean.replace(/^[\s#*>\-!?.~`]+/g, '')
  clean = clean.trim()
  if (!clean) return 'New Conversation'
  const firstSentence = clean.split(/[.?!:\n]/)[0].trim()
  if (!firstSentence) return 'New Conversation'
  if (firstSentence.length <= 36) {
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
  }
  return firstSentence.slice(0, 33).trim() + '...'
}

// ── Long-Term Memory Vault Persistence ───────────────────────
export async function loadStoredMemories(): Promise<MemoryItem[]> {
  try {
    if (typeof window !== 'undefined' && window.nemi?.getStoredMemories) {
      const stored = await window.nemi.getStoredMemories()
      if (Array.isArray(stored) && stored.length > 0) {
        return stored
      }
    }

    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(MEMORIES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load stored memories:', err)
  }

  // Prepopulate with a helpful default memory if empty
  const initialMemories: MemoryItem[] = [
    {
      id: 'mem-init-1',
      content: 'Prefers clean, concise, and structured answers with elegant markdown formatting.',
      category: 'preference',
      timestamp: Date.now(),
    },
  ]
  await saveStoredMemories(initialMemories)
  return initialMemories
}

export async function saveStoredMemories(memories: MemoryItem[]): Promise<void> {
  try {
    const serialized = JSON.stringify(memories)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMORIES_STORAGE_KEY, serialized)
    }
    if (typeof window !== 'undefined' && window.nemi?.saveStoredMemories) {
      await window.nemi.saveStoredMemories(memories)
    }
    if (typeof fetch !== 'undefined' && typeof window !== 'undefined' && !window.nemi) {
      fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('Failed to save memories:', err)
  }
}

// ── Smart Memory Extraction ──────────────────────────────────
export function extractMemoriesFromText(text: string, sourceConvId?: string): MemoryItem[] {
  if (typeof text !== 'string' || !text.trim()) return []
  const memories: MemoryItem[] = []
  const trimmed = text.trim()

  // 1. Explicit /remember command
  const explicitMatch = trimmed.match(/^\/remember\s+(.+)$/i)
  if (explicitMatch && explicitMatch[1]) {
    memories.push({
      id: uid(),
      content: explicitMatch[1].trim(),
      category: 'general',
      timestamp: Date.now(),
      sourceConvId,
    })
    return memories
  }

  // 2. Pattern detection for preferences & facts
  const patterns: Array<{ regex: RegExp; category: MemoryItem['category'] }> = [
    {
      regex: /(?:please\s+)?remember\s+(?:that\s+)?([^.!?\n]{6,120})/i,
      category: 'general',
    },
    {
      regex: /(?:i\s+prefer|i\s+always\s+use|i\s+like\s+to\s+use)\s+([^.!?\n]{4,100})/i,
      category: 'preference',
    },
    {
      regex: /(?:i\s+am\s+working\s+on|my\s+project\s+is|we\s+are\s+building)\s+([^.!?\n]{4,100})/i,
      category: 'project',
    },
    {
      regex: /(?:my\s+name\s+is|call\s+me)\s+([a-zA-Z]{2,30})/i,
      category: 'personal',
    },
  ]

  for (const { regex, category } of patterns) {
    const match = trimmed.match(regex)
    if (match && match[1]) {
      const extractedContent = match[0].trim()
      memories.push({
        id: uid(),
        content: extractedContent.charAt(0).toUpperCase() + extractedContent.slice(1),
        category,
        timestamp: Date.now(),
        sourceConvId,
      })
    }
  }

  return memories
}

// ── System Prompt Memory Formatter ───────────────────────────
export function formatMemoriesForSystemPrompt(memories: MemoryItem[]): string {
  if (!Array.isArray(memories) || memories.length === 0) return ''

  const lines = memories
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => `- [${(m.category || 'general').toUpperCase()}] ${m.content}`)
    .join('\n')

  return `\n\n=== NEMI LONG-TERM CHAT MEMORY (USER FACTS & CONTEXT) ===
You have persistent memory of past conversations with this user. Naturally incorporate these remembered facts and preferences into your responses:
${lines}
=== END CHAT MEMORY ===`
}
