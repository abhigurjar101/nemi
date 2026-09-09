import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const testingBot: N8nBot = {
  id: 'testing-bot',
  name: 'Testing & QA Bot',
  shortName: 'Testing',
  emoji: '🧪',
  category: 'Core Development',
  description: 'Test generation (Pytest, Vitest, Jest), sandbox execution, edge case validation, and coverage.',
  defaultWebhook: 'testing/generate',
  workflowFile: 'workflows/testing-bot.workflow.json',
  supportedTasks: ['generate', 'execute', 'coverage', 'fuzzing', 'e2e'],
  placeholder: 'Generate test suites (pytest/vitest) or validate edge cases...',
  samplePrompts: [
    '🧪 Comprehensive Pytest suite with property-based tests',
    '⚡ Boundary edge case & fuzzing validation',
    '🎯 Mock external HTTP services for deterministic integration tests',
  ],
  directive: `You are the QA & Test Automation Specialist 🧪.
- Generate comprehensive, executable test suites using Pytest or Vitest.
- Include unit tests, boundary edge cases, mock fixtures, and assertion checks that can run directly in sandbox.
- Never write placeholder assertions like 'assert True' or '# test logic here'. Every test case must assert real behavioral expectations with clear failure messages.
- Always include a runnable test execution block or runner command.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
