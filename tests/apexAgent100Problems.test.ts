import { describe, it, expect } from 'vitest'
import { NEMILangGraphApexAgent } from '../src/renderer/src/services/apexAgentEngine'
import { WORLDS_HARDEST_100_PROBLEMS } from '../n8n/benchmarks/hardest100Catalog'

describe('NEMI LangGraph Apex Agent — Full 100 Problems Real-Time Test Suite', () => {
  const apex = new NEMILangGraphApexAgent()

  it('runs all 100 World Hardest Problems through compiled LangGraph StateGraphs with 100% pass rate', async () => {
    const report = await apex.runFull100ProblemsBenchmark()

    // 1. Overall Suite Metrics
    expect(report.results.length).toBe(100)
    expect(report.summary.totalProblems).toBe(100)
    expect(report.summary.passedProblems).toBe(100)
    expect(report.summary.passRatePercent).toBe(100)
    expect(report.summary.zeroPlaceholderRatePercent).toBe(100)
    expect(report.summary.averageLatencyMs).toBeLessThan(50) // Real-time sub-50ms per problem

    // 2. All 4 Specialist Categories must have 25 problems each with 100% pass rate
    const breakdown = report.summary.categoryBreakdown
    expect(breakdown['Advanced Competitive & IOI/ICPC'].count).toBe(25)
    expect(breakdown['Advanced Competitive & IOI/ICPC'].passed).toBe(25)
    expect(breakdown['Advanced Competitive & IOI/ICPC'].passRate).toBe(100)

    expect(breakdown['LeetCode Apex Hard'].count).toBe(25)
    expect(breakdown['LeetCode Apex Hard'].passed).toBe(25)
    expect(breakdown['LeetCode Apex Hard'].passRate).toBe(100)

    expect(breakdown['Distributed Systems & Concurrency'].count).toBe(25)
    expect(breakdown['Distributed Systems & Concurrency'].passed).toBe(25)
    expect(breakdown['Distributed Systems & Concurrency'].passRate).toBe(100)

    expect(breakdown['AI/ML & Deep Neural Mechanics'].count).toBe(25)
    expect(breakdown['AI/ML & Deep Neural Mechanics'].passed).toBe(25)
    expect(breakdown['AI/ML & Deep Neural Mechanics'].passRate).toBe(100)
  })

  it('verifies Category 1: Advanced Competitive & IOI/ICPC (Problems 1–25) solved cleanly by Apex Agent', async () => {
    for (let id = 1; id <= 25; id++) {
      const state = await apex.solveHardestProblemRealtime(id)
      expect(state.astValid).toBe(true)
      expect(state.solutionVerified).toBe(true)
      expect(state.code).toBeDefined()
      expect(state.code).not.toContain('TODO')
      expect(state.code).not.toContain('FIXME')
      expect(state.code).not.toContain('...')
    }
  })

  it('verifies Category 2: LeetCode Apex Hard (Problems 26–50) solved cleanly by Apex Agent', async () => {
    for (let id = 26; id <= 50; id++) {
      const state = await apex.solveHardestProblemRealtime(id)
      expect(state.astValid).toBe(true)
      expect(state.solutionVerified).toBe(true)
      expect(state.code).toBeDefined()
      expect(state.code).not.toContain('TODO')
      expect(state.code).not.toContain('FIXME')
      expect(state.code).not.toContain('...')
    }
  })

  it('verifies Category 3: Distributed Systems & Concurrency (Problems 51–75) solved cleanly by Apex Agent', async () => {
    for (let id = 51; id <= 75; id++) {
      const state = await apex.solveHardestProblemRealtime(id)
      expect(state.astValid).toBe(true)
      expect(state.solutionVerified).toBe(true)
      expect(state.code).toBeDefined()
      expect(state.code).not.toContain('TODO')
      expect(state.code).not.toContain('FIXME')
      expect(state.code).not.toContain('...')
    }
  })

  it('verifies Category 4: AI/ML & Deep Neural Mechanics (Problems 76–100) solved cleanly by Apex Agent', async () => {
    for (let id = 76; id <= 100; id++) {
      const state = await apex.solveHardestProblemRealtime(id)
      expect(state.astValid).toBe(true)
      expect(state.solutionVerified).toBe(true)
      expect(state.code).toBeDefined()
      expect(state.code).not.toContain('TODO')
      expect(state.code).not.toContain('FIXME')
      expect(state.code).not.toContain('...')
    }
  })

  it('validates benchmark state graph structure & invariants across boundary problems (1, 25, 26, 50, 51, 75, 76, 100)', async () => {
    const boundaryIds = [1, 25, 26, 50, 51, 75, 76, 100]

    for (const id of boundaryIds) {
      const state = await apex.solveHardestProblemRealtime(id)
      expect(state.taskId).toContain(`solve_p${id}_`)
      expect(state.taskType).toBe('coding_hardest')
      expect(state.problemId).toBe(id)
      expect(state.astValid).toBe(true)
      expect(state.solutionVerified).toBe(true)
      expect(state.verificationOutput).toContain('passed')
      expect(state.iteration).toBeGreaterThanOrEqual(1)
    }
  })
})
