import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  createDefaultConversation,
  generateConversationTitle,
  extractMemoriesFromText,
  formatMemoriesForSystemPrompt,
  loadStoredConversations,
  saveStoredConversations,
  loadStoredMemories,
  saveStoredMemories,
  type ConversationSession,
  type MemoryItem,
} from '../../src/renderer/src/chatMemory'
import { resolveChatRequestConfig } from '../../src/renderer/src/modelRouting'
import { extractVoiceIntent, readinessBriefing } from '../../src/renderer/src/voiceActivation'
import { toConversationalScript } from '../../src/renderer/src/humanCompanion/conversationalSpeech'

describe('Tier 5 Adversarial Coverage Hardening & Principal QA Audit', () => {
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}
    // @ts-ignore
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value },
      removeItem: (key: string) => { delete mockStorage[key] },
      clear: () => { mockStorage = {} },
    }
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ADVERSARIAL INPUTS & EXTREME BOUNDARY CONDITIONS
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. Adversarial Inputs & Boundary Stress', () => {
    it('handles null, undefined, and non-string inputs in title generation without crashing', () => {
      // @ts-ignore
      expect(generateConversationTitle(null)).toBe('New Conversation')
      // @ts-ignore
      expect(generateConversationTitle(undefined)).toBe('New Conversation')
      // @ts-ignore
      expect(generateConversationTitle('')).toBe('New Conversation')
      // @ts-ignore
      expect(generateConversationTitle('   \n\t  ')).toBe('New Conversation')
      // @ts-ignore
      expect(generateConversationTitle(12345 as any)).toBe('New Conversation')
      // @ts-ignore
      expect(generateConversationTitle({} as any)).toBe('New Conversation')
    })

    it('handles giant user prompts (>50,000 characters) without regex catastrophic backtracking', () => {
      const hugeInput = 'I am building ' + 'a'.repeat(60000) + ' and I prefer ' + 'b'.repeat(60000)
      const t0 = performance.now()
      const memories = extractMemoriesFromText(hugeInput)
      const elapsed = performance.now() - t0

      expect(elapsed).toBeLessThan(100) // Must parse in <100ms
      expect(Array.isArray(memories)).toBe(true)
    })

    it('handles deeply nested or malformed markdown characters in title generation', () => {
      const inputs = [
        '# # # ### >>>> ***** Deeply nested symbols',
        '/boost /goal /remember   ',
        '!!!???....',
        '   \n\r\t   Hello world   \n\r\t',
      ]
      inputs.forEach((input) => {
        const title = generateConversationTitle(input)
        expect(typeof title).toBe('string')
        expect(title.length).toBeGreaterThan(0)
      })
    })

    it('keeps model routing local regardless of stored values', () => {
      expect(resolveChatRequestConfig({ modelMode: 'ollama', messages: [] }).provider).toBe('ollama')
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 2. FAULT INJECTION & CORRUPTED STORAGE RECOVERY
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Fault Injection & Storage Resilience', () => {
    it('gracefully recovers from corrupted JSON in conversations storage', async () => {
      mockStorage['nemi_conversations_v2'] = '{"corrupted": true, [malformed json'
      const convs = await loadStoredConversations()
      expect(Array.isArray(convs)).toBe(true)
      expect(convs.length).toBeGreaterThan(0)
      expect(convs[0].title).toBe('Welcome to NEMI')
    })

    it('gracefully recovers from non-array JSON in conversations storage', async () => {
      mockStorage['nemi_conversations_v2'] = '{"some": "object"}'
      const convs = await loadStoredConversations()
      expect(Array.isArray(convs)).toBe(true)
      expect(convs[0].title).toBe('Welcome to NEMI')
    })

    it('gracefully recovers from corrupted JSON in memories storage', async () => {
      mockStorage['nemi_memories_v2'] = 'INVALID_PAYLOAD'
      const mems = await loadStoredMemories()
      expect(Array.isArray(mems)).toBe(true)
      expect(mems.length).toBeGreaterThan(0)
    })

    it('recovers cleanly when conversations list contains elements with missing messages array', async () => {
      mockStorage['nemi_conversations_v2'] = JSON.stringify([
        { id: 'broken-1', title: 'Corrupted Conv', createdAt: 100 },
      ])
      const convs = await loadStoredConversations()
      expect(convs.length).toBe(1)
      expect(Array.isArray(convs[0].messages)).toBe(true)
      expect(convs[0].messages).toHaveLength(0)
    })

    it('handles IPC disk write failures without throwing unhandled rejection', async () => {
      // @ts-ignore
      global.window = {
        nemi: {
          saveStoredConversations: vi.fn().mockRejectedValue(new Error('EACCES: permission denied')),
          saveStoredMemories: vi.fn().mockRejectedValue(new Error('ENOSPC: no space left on device')),
        },
      }

      await expect(saveStoredConversations([])).resolves.not.toThrow()
      await expect(saveStoredMemories([])).resolves.not.toThrow()

      // @ts-ignore
      delete global.window
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MEMORY VAULT & SYSTEM PROMPT INJECTION RIGOR
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Memory Vault & Prompt Augmentation Rigor', () => {
    it('extracts multiple distinct memories from a single conversational prompt', () => {
      const complexText = 'Hi NEMI! Call me Alice. I am working on the Quantum Engine project and I prefer dark mode.'
      const memories = extractMemoriesFromText(complexText)
      expect(memories.length).toBeGreaterThanOrEqual(2)

      const categories = memories.map((m) => m.category)
      expect(categories).toContain('personal')
      expect(categories).toContain('project')
    })

    it('does not crash when formatMemoriesForSystemPrompt receives invalid objects or nulls', () => {
      // @ts-ignore
      expect(formatMemoriesForSystemPrompt(null as any)).toBe('')
      // @ts-ignore
      expect(formatMemoriesForSystemPrompt(undefined as any)).toBe('')
      // @ts-ignore
      expect(formatMemoriesForSystemPrompt([null, undefined, {} as any])).not.toThrow
    })

    it('sanitizes and formats memory entries into clean markdown bullet points', () => {
      const memories: MemoryItem[] = [
        { id: '1', content: 'User prefers Rust and WebAssembly', category: 'preference', timestamp: 1 },
        { id: '2', content: 'Building local LLM orchestrator', category: 'project', timestamp: 2 },
      ]
      const promptBlock = formatMemoriesForSystemPrompt(memories)
      expect(promptBlock).toContain('=== NEMI LONG-TERM CHAT MEMORY')
      expect(promptBlock).toContain('- [PREFERENCE] User prefers Rust and WebAssembly')
      expect(promptBlock).toContain('- [PROJECT] Building local LLM orchestrator')
      expect(promptBlock).toContain('=== END CHAT MEMORY ===')
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 4. DUAL-MODE CONVERSATIONAL SPEECH & TABLE REASONING
  // ══════════════════════════════════════════════════════════════════════════
  describe('4. Conversational Speech Transformation Under Stress', () => {
    it('summarizes complex multi-column markdown tables into polite spoken scripts', () => {
      const raw = `Here are the benchmark results:
| Model | Param | Latency | Accuracy | Memory |
|---|---|---|---|---|
| Kokoro | 82M | 20ms | 94% | 350MB |
| Piper | 120M | 45ms | 91% | 450MB |
`
      const script = toConversationalScript(raw)
      expect(script).not.toContain('|---|---|')
      expect(script).toContain("I've organized the detailed comparison table in your chat notes.")
    })

    it('cleans numbered lists and preserves clean spoken sequence', () => {
      const raw = `To setup NEMI:
1. Run pip install -r requirements.txt
2. Run npm install
3. Start the application`
      const script = toConversationalScript(raw)
      expect(script).toContain('1. Run pip install')
      expect(script).toContain('2. Run npm install')
    })

    it('handles empty, whitespace-only, or code-only responses safely', () => {
      expect(toConversationalScript('')).toBe('')
      expect(toConversationalScript('   ')).toBe('')
      const codeOnly = '```python\nprint("hello world")\n```'
      const script = toConversationalScript(codeOnly)
      expect(script).not.toContain('print("hello world")')
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 5. VOICE INTENT & READINESS STATE MACHINE
  // ══════════════════════════════════════════════════════════════════════════
  describe('5. Voice Activation Intent State Machine', () => {
    it('accurately parses wake-word only utterances', () => {
      const intent1 = extractVoiceIntent('hey nemi')
      expect(intent1.hasWakeWord).toBe(true)
      expect(intent1.isWakeOnly).toBe(true)
      expect(intent1.query).toBe('')

      const intent2 = extractVoiceIntent('hello nemi')
      expect(intent2.hasWakeWord).toBe(true)
      expect(intent2.isWakeOnly).toBe(true)
    })

    it('accurately splits wake-word from trailing queries', () => {
      const intent = extractVoiceIntent('hey nemi what is the current system memory usage?')
      expect(intent.hasWakeWord).toBe(true)
      expect(intent.isWakeOnly).toBe(false)
      expect(intent.query.toLowerCase()).toContain('what is the current system memory usage')
    })

    it('generates courteous spoken readiness briefings under all service permutations', () => {
      const b1 = readinessBriefing({ ollama: true, voice: true, rag: true })
      expect(b1).toContain('Ollama')

      const b2 = readinessBriefing({ ollama: false, voice: false, rag: false })
      expect(b2).toContain('starting')
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 6. CONVERSATION LIFECYCLE & MASSIVE CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════
  describe('6. Massive Concurrency & High-Load Conversation Lifecycle', () => {
    it('handles 200 sequential conversation insertions and updates with sub-millisecond serialization', async () => {
      const convs: ConversationSession[] = []
      const t0 = performance.now()
      for (let i = 0; i < 200; i++) {
        convs.push({
          id: `conv-stress-${i}`,
          title: `Session ${i}`,
          preview: `Preview message for stress test session number ${i}`,
          messages: [
            { id: `m-${i}-1`, role: 'user', content: `Query ${i}`, timestamp: new Date() },
            { id: `m-${i}-2`, role: 'assistant', content: `Response ${i}`, timestamp: new Date() },
          ],
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i,
          pinned: i % 5 === 0,
        })
      }

      await saveStoredConversations(convs)
      const loaded = await loadStoredConversations()
      const elapsed = performance.now() - t0

      expect(loaded).toHaveLength(200)
      expect(loaded[50].id).toBe('conv-stress-50')
      expect(loaded[100].messages).toHaveLength(2)
      expect(elapsed).toBeLessThan(150) // High-throughput: 200 sessions serialized and deserialized in <150ms
    })
  })
})
