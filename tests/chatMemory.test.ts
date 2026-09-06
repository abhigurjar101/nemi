import { describe, expect, it, beforeEach } from 'vitest'
import {
  createDefaultConversation,
  generateConversationTitle,
  extractMemoriesFromText,
  formatMemoriesForSystemPrompt,
  loadStoredConversations,
  saveStoredConversations,
  loadStoredMemories,
  saveStoredMemories,
  type MemoryItem,
  type ConversationSession,
} from '../src/renderer/src/chatMemory'

describe('Chat Memory & Persistence Engine', () => {
  beforeEach(() => {
    // Clear in-memory mock storage
    const storage: Record<string, string> = {}
    // @ts-ignore
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value },
      removeItem: (key: string) => { delete storage[key] },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
    }
  })

  describe('Default Conversation Generation', () => {
    it('creates a default welcome conversation session with proper metadata', () => {
      const conv = createDefaultConversation()
      expect(conv.id).toBeTruthy()
      expect(conv.title).toBe('Welcome to NEMI')
      expect(conv.messages.length).toBeGreaterThan(0)
      expect(conv.messages[0].role).toBe('assistant')
      expect(conv.createdAt).toBeGreaterThan(0)
    })
  })

  describe('Smart Title Generation', () => {
    it('generates concise title from user text', () => {
      const title = generateConversationTitle('How do I build a react application with tailwind?')
      expect(title).toBe('How do I build a react applicatio...')
    })

    it('capitalizes and strips markdown characters or slash commands', () => {
      const title1 = generateConversationTitle('/remember I like TypeScript')
      expect(title1).toBe('I like TypeScript')

      const title2 = generateConversationTitle('### Summary of today')
      expect(title2).toBe('Summary of today')
    })

    it('handles short messages without truncation', () => {
      const title = generateConversationTitle('Hello world')
      expect(title).toBe('Hello world')
    })
  })

  describe('Smart Memory Extraction', () => {
    it('extracts explicit /remember commands', () => {
      const memories = extractMemoriesFromText('/remember My dog is named Rocky')
      expect(memories.length).toBe(1)
      expect(memories[0].content).toBe('My dog is named Rocky')
      expect(memories[0].category).toBe('general')
    })

    it('detects preferences like "I prefer"', () => {
      const memories = extractMemoriesFromText('I prefer dark mode and clean minimalist interfaces.')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0].category).toBe('preference')
      expect(memories[0].content.toLowerCase()).toContain('prefer dark mode')
    })

    it('detects project details like "I am working on"', () => {
      const memories = extractMemoriesFromText('I am working on a desktop AI assistant named NEMI.')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0].category).toBe('project')
      expect(memories[0].content.toLowerCase()).toContain('working on a desktop ai assistant')
    })

    it('detects personal details like "my name is"', () => {
      const memories = extractMemoriesFromText('Hello! My name is Abhi.')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0].category).toBe('personal')
      expect(memories[0].content).toContain('Abhi')
    })

    it('returns empty array if no memory patterns or keywords match', () => {
      const memories = extractMemoriesFromText('What is the weather outside today?')
      expect(memories).toHaveLength(0)
    })
  })

  describe('System Prompt Memory Formatter', () => {
    it('returns empty string if memories array is empty', () => {
      expect(formatMemoriesForSystemPrompt([])).toBe('')
    })

    it('formats memories into structured section for LLM system prompt', () => {
      const memories: MemoryItem[] = [
        { id: '1', content: 'User prefers TypeScript over JavaScript', category: 'preference', timestamp: 100 },
        { id: '2', content: 'Developing NEMI desktop companion', category: 'project', timestamp: 200 },
      ]
      const formatted = formatMemoriesForSystemPrompt(memories)
      expect(formatted).toContain('=== NEMI LONG-TERM CHAT MEMORY')
      expect(formatted).toContain('[PREFERENCE] User prefers TypeScript over JavaScript')
      expect(formatted).toContain('[PROJECT] Developing NEMI desktop companion')
      expect(formatted).toContain('=== END CHAT MEMORY ===')
    })
  })

  describe('Storage Persistence', () => {
    it('saves and loads conversations from localStorage', async () => {
      const conv: ConversationSession = {
        id: 'test-conv-1',
        title: 'Persistent Chat',
        preview: 'Testing persistence',
        messages: [{ id: 'm1', role: 'user', content: 'Hi', timestamp: new Date() }],
        createdAt: 1000,
        updatedAt: 1000,
        pinned: true,
      }
      await saveStoredConversations([conv])
      const loaded = await loadStoredConversations()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('test-conv-1')
      expect(loaded[0].title).toBe('Persistent Chat')
      expect(loaded[0].messages[0].content).toBe('Hi')
    })

    it('saves and loads memories from localStorage', async () => {
      const memoryList: MemoryItem[] = [
        { id: 'mem-1', content: 'Favorite food is pizza', category: 'personal', timestamp: 100 },
      ]
      await saveStoredMemories(memoryList)
      const loaded = await loadStoredMemories()
      expect(loaded.length).toBe(1)
      expect(loaded[0].content).toBe('Favorite food is pizza')
    })
  })
})
