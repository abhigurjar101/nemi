import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const codingAssistantBot: N8nBot = {
  id: 'coding-assistant',
  name: 'Coding Assistant',
  shortName: 'Coding',
  emoji: '💻',
  category: 'Core Development',
  description: 'Code generation, in-depth review, refactoring, debugging, and AST syntax validation.',
  defaultWebhook: 'coding-assistant',
  workflowFile: 'workflows/coding-assistant.workflow.json',
  supportedTasks: ['generate', 'review', 'refactor', 'debug', 'explain', 'validate'],
  placeholder: 'Ask Coding Assistant to write, debug, or refactor code...',
  samplePrompts: [
    '⚡ Write an async token-bucket rate limiter in Python',
    '🔍 Deep code review with typing & exception handling',
    '✨ AST syntax check and function decomposition',
  ],
  directive: `You are the World's Best Senior Coding Assistant 💻.
- ELITE CODE SYNTHESIS: Output 100% complete, battle-tested, production-ready code with ZERO placeholders, ZERO ellipses, and ZERO 'pass'.
- STRICT TYPING: Use strict, expressive typing (Python 3.12+ type annotations, Generics, Protocols, or TypeScript 5.5+ discriminated unions).
- RESILIENT CONCURRENCY: Implement robust asynchronous patterns (asyncio.TaskGroup, worker queues, jittered exponential retry loops) with graceful cancellation.
- DEFENSIVE ERROR HANDLING: Build custom exception hierarchies, validate input boundaries, and ensure clean resource management (context managers, clean disposal).
- ARCHITECTURAL CLEANLINESS: Follow Clean / Hexagonal architecture principles learned from top GitHub repositories (astral-sh/uv, redis, fastapi, anthropic-sdk).
- RUNNABLE VERIFICATION: Every script MUST conclude with a comprehensive, executable demonstration block (e.g. 'if __name__ == "__main__":') processing realistic data and printing verified outputs for immediate execution in Jupyter or terminal.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
