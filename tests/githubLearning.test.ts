import { describe, expect, it, beforeEach } from 'vitest'
import {
  triggerDailyGitHubLearning,
  GITHUB_ARCHITECTURE_BLUEPRINTS,
  type GitHubArchitectureBlueprint,
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

  describe('Curated Blueprints Integrity', () => {
    it('contains valid blueprints across required domains including NLP & ML', () => {
      expect(GITHUB_ARCHITECTURE_BLUEPRINTS.length).toBeGreaterThanOrEqual(4)
      const nlpBlueprint = GITHUB_ARCHITECTURE_BLUEPRINTS.find((b) => b.category === 'NLP & ML')
      expect(nlpBlueprint).toBeDefined()
      expect(nlpBlueprint?.repo).toBe('huggingface/transformers')
      expect(nlpBlueprint?.codeSnippet).toContain('MinimalNLPPipeline')
      expect(nlpBlueprint?.principles.length).toBeGreaterThan(0)
    })

    it('ensures each blueprint has executable, non-empty code snippets and summaries', () => {
      for (const bp of GITHUB_ARCHITECTURE_BLUEPRINTS) {
        expect(bp.repo).toBeTruthy()
        expect(bp.title).toBeTruthy()
        expect(bp.codeSnippet.trim().length).toBeGreaterThan(50)
        expect(bp.summary).toBeTruthy()
      }
    })
  })

  describe('triggerDailyGitHubLearning', () => {
    it('populates initial memories with architecture blueprints on first login', async () => {
      const initialMemories: MemoryItem[] = []
      const res = await triggerDailyGitHubLearning(initialMemories)

      expect(res.trained).toBe(true)
      expect(res.count).toBe(GITHUB_ARCHITECTURE_BLUEPRINTS.length)
      expect(res.newMemories.length).toBe(GITHUB_ARCHITECTURE_BLUEPRINTS.length)
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

    it('forces training on user login when force is true', async () => {
      const initialMemories: MemoryItem[] = []
      const res1 = await triggerDailyGitHubLearning(initialMemories)
      expect(res1.trained).toBe(true)

      // User logs in and forces refresh
      const res2 = await triggerDailyGitHubLearning(res1.newMemories, true)
      expect(res2.trained).toBe(true)
      // Because all blueprints are already in memory, deduplication prevents duplicates
      expect(res2.count).toBe(0)
      expect(res2.summary).toContain('verified up-to-date')
    })

    it('deduplicates properly against existing repository memories', async () => {
      const existing: MemoryItem[] = [
        {
          id: 'existing-1',
          content: 'Architecture notes from huggingface/transformers NLP pipeline',
          category: 'project',
          timestamp: Date.now(),
        },
      ]

      const res = await triggerDailyGitHubLearning(existing, true)
      expect(res.trained).toBe(true)
      // huggingface/transformers should not be added again
      const hfCount = res.newMemories.filter((m) =>
        m.content.toLowerCase().includes('huggingface/transformers')
      ).length
      expect(hfCount).toBe(1)
    })
  })
})
