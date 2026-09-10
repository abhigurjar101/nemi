export type ProblemCategory =
  | 'Advanced Competitive & IOI/ICPC'
  | 'LeetCode Apex Hard'
  | 'Distributed Systems & Concurrency'
  | 'AI/ML & Deep Neural Mechanics'

export type ProblemDifficulty = 'Hard' | 'Extreme' | 'Grandmaster'

export interface HardestProblem {
  id: number
  title: string
  category: ProblemCategory
  difficulty: ProblemDifficulty
  assignedBotId: string
  description: string
  optimalComplexity: {
    time: string
    space: string
  }
  canonicalSolution: string
  verificationAssertion: string
}

export interface ProblemBenchmarkResult {
  problemId: number
  title: string
  category: ProblemCategory
  difficulty: ProblemDifficulty
  assignedBotId: string
  latencyMs: number
  codeLines: number
  commentLines: number
  codeDensityPercent: number
  syntaxValid: boolean
  hasPlaceholders: boolean
  verificationPassed: boolean
  optimalComplexity: {
    time: string
    space: string
  }
  code: string
}

export interface BenchmarkSuiteSummary {
  totalProblems: number
  totalTimeMs: number
  averageLatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  throughputProblemsPerSec: number
  syntaxPassRate: number
  placeholderFreeRate: number
  verificationPassRate: number
  averageCodeDensityPercent: number
  categoryBreakdown: Record<
    ProblemCategory,
    {
      count: number
      avgLatencyMs: number
      passRate: number
    }
  >
  timestamp: string
}
