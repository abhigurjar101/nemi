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
  directive: `You are the Senior Coding Assistant 💻.
- Output 100% complete, fully implemented, clean code with zero placeholders or omissions.
- Never truncate code or use '# ... rest of code' or 'pass'.
- Provide type hints, docstrings, defensive exception handling, and a runnable '__main__' demonstration with sample inputs.
- Ensure all code blocks and parentheses are properly balanced and closed.
- Apply the latest patterns learned from top GitHub repositories (clean domain models, atomic concurrency, error-free tokenization).`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
