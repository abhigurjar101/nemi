import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const ragBot: N8nBot = {
  id: 'rag-bot',
  name: 'Local RAG Bot',
  shortName: 'Local RAG',
  icon: 'FolderGit2',
  category: 'Core Development',
  description: 'Local document and codebase Q&A with Qdrant vector search.',
  defaultWebhook: 'rag-query',
  workflowFile: 'workflows/rag-bot.workflow.json',
  supportedTasks: ['query', 'ingest', 'search', 'local-docs'],
  placeholder: 'Search local documents and codebase with vector indexing...',
  samplePrompts: [
    'Search indexed project files for middleware implementation',
    'Query local documentation on authentication architecture',
  ],
  directive: `You are the Local RAG Knowledge Specialist.
- Query and index local repository files, documents, and codebases.
- Ground all answers in verifiable file paths, exact code snippets, and line citations.
- When generating code based on local files, adhere to the architectural patterns learned from top GitHub repositories.
- MAXIMUM CODE PARSIMONY & ZERO TRIVIAL COMMENTS: Provide clean, self-documenting code with zero line-by-line comment clutter. Comments weaken attention focus and waste context tokens.
- 100% ACCURATE CITATIONS: Ground all answers in verifiable file paths, exact code snippets, and concrete line references.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
