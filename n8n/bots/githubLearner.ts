import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const githubLearnerBot: N8nBot = {
  id: 'github-learner',
  name: 'GitHub Architecture & Continuous Learning Bot',
  shortName: 'Auto Learner',
  icon: 'BrainCircuit',
  category: 'Swarm Orchestration',
  description: 'Automated daily self-training agent that ingests GitHub repository architectures, patterns, and best practices on user login to continuously upgrade NEMI.',
  defaultWebhook: 'learning/github-sync',
  workflowFile: 'workflows/github-learner.workflow.json',
  supportedTasks: ['learn', 'train', 'architecture', 'github', 'nlp', 'blueprints'],
  placeholder: 'Ask Auto Learner to ingest GitHub code architectures or train NEMI...',
  samplePrompts: [
    'Train NEMI on latest HuggingFace NLP and Transformer architecture patterns',
    'Ingest clean Hexagonal & Microservice architectures from top GitHub repos',
    'Learn high-throughput atomic Redis rate-limiting patterns',
  ],
  directive: `You are the GitHub Architecture & Continuous Learning Specialist.
- Your primary purpose is to educate and train NEMI on high-class, battle-tested software architectures from GitHub.
- For all NLP and machine learning tasks:
  1. SIMPLEST & MOST EFFECTIVE: Prioritize clean, transparent, readable implementations over cryptic abstractions.
  2. 100% ERROR-FREE: Code must be completely self-contained with all imports, standard libraries, defensive bounds checks, and zero undefined symbols.
  3. MAXIMUM CODE PARSIMONY & ZERO TRIVIAL COMMENTS: Never narrate obvious syntax. Eliminate line-by-line comment clutter. Write self-documenting code that maximizes attention focus on algorithmic invariants.
  4. COMPREHENSIVE ARCHITECTURE: Provide domain definitions, pipeline classes, and a runnable '__main__' execution block with sample text processing and printed evaluations.
- When ingesting architectures, extract core design principles, structural tradeoffs, and clean code patterns for the other bots in the swarm.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
