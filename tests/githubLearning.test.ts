import { describe, expect, it, beforeEach } from 'vitest'
import {
  triggerDailyGitHubLearning,
  ingestCustomGitHubRepo,
  GITHUB_ARCHITECTURE_BLUEPRINTS,
} from '../src/renderer/src/utils/githubLearning'
import type { MemoryItem } from '../src/renderer/src/chatMemory'

describe('GitHub Architecture & Continuous Learning Bot Engine', () => {
  let storage: Record<string, string> = {}

  beforeEach(() => {
    storage = {}
    // @ts-ignore
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
      clear: () => {
        storage = {}
      },
    }
  })

  describe('Curated Blueprints Integrity (8 World-Class Blueprints)', () => {
    it('contains all 8 world-class blueprints across NLP, Distributed Systems, Clean Architecture, and APIs', () => {
      expect(GITHUB_ARCHITECTURE_BLUEPRINTS.length).toBe(8)

      const repos = GITHUB_ARCHITECTURE_BLUEPRINTS.map((b) => b.repo)
      expect(repos).toContain('huggingface/transformers')
      expect(repos).toContain('karpathy/nanoGPT')
      expect(repos).toContain('vllm-project/vllm')
      expect(repos).toContain('astral-sh/uv')
      expect(repos).toContain('redis/redis-py')
      expect(repos).toContain('tiangolo/fastapi')
      expect(repos).toContain('anthropics/anthropic-sdk-python')
      expect(repos).toContain('qdrant/qdrant-client')
    })

    it('ensures each blueprint has executable, non-empty code snippets and principles', () => {
      for (const bp of GITHUB_ARCHITECTURE_BLUEPRINTS) {
        expect(bp.repo).toBeTruthy()
        expect(bp.title).toBeTruthy()
        expect(bp.codeSnippet.trim().length).toBeGreaterThan(50)
        expect(bp.summary).toBeTruthy()
        expect(bp.principles.length).toBeGreaterThan(0)
      }
    })
  })

  describe('triggerDailyGitHubLearning on Connection & Login', () => {
    it('populates initial memories with all 8 architecture blueprints on first connection', async () => {
      const initialMemories: MemoryItem[] = []
      const res = await triggerDailyGitHubLearning(initialMemories)

      expect(res.trained).toBe(true)
      expect(res.count).toBe(8)
      expect(res.newMemories.length).toBe(8)
      expect(res.summary).toContain('Auto-trained NEMI')
      expect(storage['nemi_last_github_training_date']).toBe(new Date().toISOString().slice(0, 10))
    })

    it('is idempotent on the same day when force is false', async () => {
      const initialMemories: MemoryItem[] = []
      const res1 = await triggerDailyGitHubLearning(initialMemories)
      expect(res1.trained).toBe(true)

      // Second invocation on the same day without force
      const res2 = await triggerDailyGitHubLearning(res1.newMemories, false)
      expect(res2.trained).toBe(false)
      expect(res2.count).toBe(0)
      expect(res2.summary).toContain('already trained')
    })

    it('forces training and sync on connection event when force is true', async () => {
      const initialMemories: MemoryItem[] = []
      const res1 = await triggerDailyGitHubLearning(initialMemories)
      expect(res1.trained).toBe(true)

      // Connection event forces refresh
      const res2 = await triggerDailyGitHubLearning(res1.newMemories, true)
      expect(res2.trained).toBe(true)
      expect(res2.count).toBe(0)
      expect(res2.summary).toContain('verified up-to-date')
    })

    it('supports silent sync mode during focus / background reconnects', async () => {
      const initialMemories: MemoryItem[] = []
      const res1 = await triggerDailyGitHubLearning(initialMemories)
      expect(res1.trained).toBe(true)

      // Silent sync when already trained
      const res2 = await triggerDailyGitHubLearning(res1.newMemories, false, true)
      expect(res2.trained).toBe(false)
      expect(res2.summary).toBe('')
    })
  })

  describe('Custom GitHub Repository Ingestion on the Fly', () => {
    it('ingests any custom repository into NEMI neural memory and updates count', async () => {
      const existing: MemoryItem[] = []
      const res = await ingestCustomGitHubRepo('vllm-project/vllm', existing)

      expect(res.success).toBe(true)
      expect(res.repo).toBe('vllm-project/vllm')
      expect(res.newMemories.length).toBeGreaterThanOrEqual(1)
      expect(res.newMemories[0].content).toContain('[GitHub Ingested Architecture: vllm-project/vllm]')
      expect(res.principles.length).toBeGreaterThan(0)
      expect(res.codeSnippet).toBeTruthy()
      expect(res.summary).toContain('All 11 bots upgraded')
      expect(parseInt(storage['nemi_github_learned_count'] || '0')).toBeGreaterThanOrEqual(1)
    })

    it('strips full github.com URLs down to owner/repo cleanly', async () => {
      const existing: MemoryItem[] = []
      const res = await ingestCustomGitHubRepo('https://github.com/karpathy/nanoGPT/', existing)

      expect(res.success).toBe(true)
      expect(res.repo).toBe('karpathy/nanoGPT')
      expect(res.principles.length).toBeGreaterThan(0)
    })
  })
})
