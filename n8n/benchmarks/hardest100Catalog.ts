import type { HardestProblem, ProblemCategory } from './types'
import { COMPETITIVE_PROBLEMS } from './competitiveProblems'
import { LEETCODE_HARD_PROBLEMS } from './leetcodeHardProblems'
import { DISTRIBUTED_PROBLEMS } from './distributedProblems'
import { DEEP_LEARNING_PROBLEMS } from './deepLearningProblems'

export * from './types'
export { COMPETITIVE_PROBLEMS } from './competitiveProblems'
export { LEETCODE_HARD_PROBLEMS } from './leetcodeHardProblems'
export { DISTRIBUTED_PROBLEMS } from './distributedProblems'
export { DEEP_LEARNING_PROBLEMS } from './deepLearningProblems'

export const WORLDS_HARDEST_100_PROBLEMS: HardestProblem[] = [
  ...COMPETITIVE_PROBLEMS,
  ...LEETCODE_HARD_PROBLEMS,
  ...DISTRIBUTED_PROBLEMS,
  ...DEEP_LEARNING_PROBLEMS,
]

export function getProblemById(id: number): HardestProblem | undefined {
  return WORLDS_HARDEST_100_PROBLEMS.find((p) => p.id === id)
}

export function getProblemsByCategory(category: ProblemCategory): HardestProblem[] {
  return WORLDS_HARDEST_100_PROBLEMS.filter((p) => p.category === category)
}
