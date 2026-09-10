import { describe, it, expect } from 'vitest'
import {
  WORLDS_HARDEST_100_PROBLEMS,
  COMPETITIVE_PROBLEMS,
  LEETCODE_HARD_PROBLEMS,
  DISTRIBUTED_PROBLEMS,
  DEEP_LEARNING_PROBLEMS,
  getProblemById,
  getProblemsByCategory,
  type ProblemCategory,
} from '../n8n/benchmarks/hardest100Catalog'
import {
  evaluateProblemCode,
  runFull100Benchmark,
} from '../n8n/benchmarks/benchmarkEngine'
import { validateCodeBlock } from '../n8n/bots/validation'
import { calculateCodeDensity, stripTrivialComments } from '../src/renderer/src/utils/swarmCollaboration'
import handler from '../api/benchmark-100'

describe("World's Hardest 100 Coding Problems — Catalog Integrity", () => {
  it('contains exactly 100 problems with contiguous IDs 1 through 100', () => {
    expect(WORLDS_HARDEST_100_PROBLEMS.length).toBe(100)

    const ids = WORLDS_HARDEST_100_PROBLEMS.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(100)

    for (let i = 1; i <= 100; i++) {
      expect(uniqueIds.has(i)).toBe(true)
    }
  })

  it('divides evenly across 4 balanced specialist categories of 25 problems each', () => {
    expect(COMPETITIVE_PROBLEMS.length).toBe(25)
    expect(LEETCODE_HARD_PROBLEMS.length).toBe(25)
    expect(DISTRIBUTED_PROBLEMS.length).toBe(25)
    expect(DEEP_LEARNING_PROBLEMS.length).toBe(25)

    const competitive = getProblemsByCategory('Advanced Competitive & IOI/ICPC')
    const leetcode = getProblemsByCategory('LeetCode Apex Hard')
    const distributed = getProblemsByCategory('Distributed Systems & Concurrency')
    const deepLearning = getProblemsByCategory('AI/ML & Deep Neural Mechanics')

    expect(competitive.length).toBe(25)
    expect(leetcode.length).toBe(25)
    expect(distributed.length).toBe(25)
    expect(deepLearning.length).toBe(25)
  })

  it('retrieves individual problems by ID accurately', () => {
    const p1 = getProblemById(1)
    expect(p1).toBeDefined()
    expect(p1?.title).toContain('Dinic')
    expect(p1?.category).toBe('Advanced Competitive & IOI/ICPC')

    const p36 = getProblemById(26) // First LeetCode problem
    expect(p36).toBeDefined()
    expect(p36?.title).toContain('Median of Two Sorted Arrays')

    const p61 = getProblemById(51) // First Distributed problem
    expect(p61).toBeDefined()
    expect(p61?.title).toContain('Raft Consensus')

    const p81 = getProblemById(76) // First DL problem
    expect(p81).toBeDefined()
    expect(p81?.title).toContain('Self-Attention')

    const p100 = getProblemById(100)
    expect(p100).toBeDefined()
    expect(p100?.title).toContain('Cross-Entropy')

    const pInvalid = getProblemById(999)
    expect(pInvalid).toBeUndefined()
  })

  it('verifies all 100 problems have non-empty titles, descriptions, complexity, and assigned specialist bot', () => {
    for (const p of WORLDS_HARDEST_100_PROBLEMS) {
      expect(p.title.trim().length).toBeGreaterThan(0)
      expect(p.description.trim().length).toBeGreaterThan(0)
      expect(p.assignedBotId.trim().length).toBeGreaterThan(0)
      expect(p.optimalComplexity.time.trim().length).toBeGreaterThan(0)
      expect(p.optimalComplexity.space.trim().length).toBeGreaterThan(0)
      expect(p.canonicalSolution.trim().length).toBeGreaterThan(0)
      expect(p.verificationAssertion.trim().length).toBeGreaterThan(0)
    }
  })
})

describe("World's Hardest 100 Coding Problems — Benchmark Engine Execution", () => {
  it('runs full 100 problem benchmark and achieves 100% syntax validity & zero placeholders', () => {
    const { results, summary } = runFull100Benchmark()

    expect(results.length).toBe(100)
    expect(summary.totalProblems).toBe(100)
    expect(summary.syntaxPassRate).toBe(100)
    expect(summary.placeholderFreeRate).toBe(100)
    expect(summary.verificationPassRate).toBe(100)
    expect(summary.averageCodeDensityPercent).toBeGreaterThanOrEqual(95)
    expect(summary.throughputProblemsPerSec).toBeGreaterThan(0)
  })

  it('validates each category achieves 100% pass rate in the summary breakdown', () => {
    const { summary } = runFull100Benchmark()

    const categories: ProblemCategory[] = [
      'Advanced Competitive & IOI/ICPC',
      'LeetCode Apex Hard',
      'Distributed Systems & Concurrency',
      'AI/ML & Deep Neural Mechanics',
    ]

    for (const cat of categories) {
      const breakdown = summary.categoryBreakdown[cat]
      expect(breakdown).toBeDefined()
      expect(breakdown.count).toBe(25)
      expect(breakdown.passRate).toBe(100)
      expect(breakdown.avgLatencyMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('evaluates individual problem code and computes density and balanced AST', () => {
    const dinic = getProblemById(1)!
    const res = evaluateProblemCode(dinic)

    expect(res.problemId).toBe(1)
    expect(res.syntaxValid).toBe(true)
    expect(res.hasPlaceholders).toBe(false)
    expect(res.verificationPassed).toBe(true)
    expect(res.codeLines).toBeGreaterThan(10)
    expect(res.codeDensityPercent).toBeGreaterThanOrEqual(90)
    expect(res.code).not.toMatch(/#(?![\w\s]*include)[\s\S]*?(?=\n|$)/)
  })
})

describe("World's Hardest 100 Coding Problems — Category Deep Dives", () => {
  it('verifies all 25 Competitive Programming solutions are complete and valid', () => {
    for (const p of COMPETITIVE_PROBLEMS) {
      const cleaned = stripTrivialComments(p.canonicalSolution)
      const ast = validateCodeBlock(cleaned, 'python')
      expect(ast.valid).toBe(true)
      expect(ast.balancedDelimiters).toBe(true)
      expect(cleaned).not.toContain('TODO')
      expect(cleaned).not.toContain('FIXME')
    }
  })

  it('verifies all 25 LeetCode Apex Hard solutions are complete and valid', () => {
    for (const p of LEETCODE_HARD_PROBLEMS) {
      const cleaned = stripTrivialComments(p.canonicalSolution)
      const ast = validateCodeBlock(cleaned, 'python')
      expect(ast.valid).toBe(true)
      expect(ast.balancedDelimiters).toBe(true)
      expect(cleaned).not.toContain('TODO')
      expect(cleaned).not.toContain('FIXME')
    }
  })

  it('verifies all 25 Distributed Systems & Concurrency solutions are complete and valid', () => {
    for (const p of DISTRIBUTED_PROBLEMS) {
      const cleaned = stripTrivialComments(p.canonicalSolution)
      const ast = validateCodeBlock(cleaned, 'python')
      expect(ast.valid).toBe(true)
      expect(ast.balancedDelimiters).toBe(true)
      expect(cleaned).not.toContain('TODO')
      expect(cleaned).not.toContain('FIXME')
    }
  })

  it('verifies all 25 AI/ML & Deep Neural Mechanics solutions are complete and valid', () => {
    for (const p of DEEP_LEARNING_PROBLEMS) {
      const cleaned = stripTrivialComments(p.canonicalSolution)
      const ast = validateCodeBlock(cleaned, 'python')
      expect(ast.valid).toBe(true)
      expect(ast.balancedDelimiters).toBe(true)
      expect(cleaned).not.toContain('TODO')
      expect(cleaned).not.toContain('FIXME')
    }
  })
})

describe("World's Hardest 100 Coding Problems — API Route Integration", () => {
  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader(k: string, v: string) {
        this.headers[k] = v
      },
      end(payload?: string) {
        this.body = payload || ''
      },
    }
    return res
  }

  it('handles GET /api/benchmark-100 catalog overview', async () => {
    const req: any = {
      method: 'GET',
      url: '/api/benchmark-100',
      headers: { host: 'localhost:3000' },
    }
    const res = createMockRes()

    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.totalProblems).toBe(100)
    expect(json.categories.length).toBe(4)
  })

  it('handles GET /api/benchmark-100?id=42 for single problem lookup', async () => {
    const req: any = {
      method: 'GET',
      url: '/api/benchmark-100?id=42',
      headers: { host: 'localhost:3000' },
    }
    const res = createMockRes()

    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.problem).toBeDefined()
    expect(json.problem.id).toBe(42)
  })

  it('handles GET /api/benchmark-100?run=true for live benchmark execution', async () => {
    const req: any = {
      method: 'GET',
      url: '/api/benchmark-100?run=true',
      headers: { host: 'localhost:3000' },
    }
    const res = createMockRes()

    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.success).toBe(true)
    expect(json.results.length).toBe(100)
    expect(json.summary.totalProblems).toBe(100)
    expect(json.summary.syntaxPassRate).toBe(100)
    expect(json.summary.verificationPassRate).toBe(100)
  })

  it('handles OPTIONS preflight with CORS headers', async () => {
    const req: any = {
      method: 'OPTIONS',
      url: '/api/benchmark-100',
      headers: { host: 'localhost:3000' },
    }
    const res = createMockRes()

    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*')
  })
})
