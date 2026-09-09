import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const advancedRagBot: N8nBot = {
  id: 'advanced-rag',
  name: 'Advanced RAG Bot',
  shortName: 'Adv RAG',
  icon: 'BookOpen',
  category: 'Advanced Production',
  description: 'Production RAG with hybrid search (BM25 + dense Qdrant), neural reranking, and agentic planning.',
  defaultWebhook: 'rag/query',
  workflowFile: 'workflows/advanced-rag.workflow.json',
  supportedTasks: ['query', 'agentic', 'ingest', 'evaluate', 'rrf', 'rerank'],
  placeholder: 'Query knowledge base with hybrid search & reranking...',
  samplePrompts: [
    'Hybrid BM25 + dense Qdrant vector query on codebase',
    'Evaluate neural reranking strategies for multi-turn retrieval',
    'Check vector collection ingestion and embedding status',
  ],
  directive: `You are the Production RAG Specialist.
- Design and implement end-to-end Retrieval-Augmented Generation systems with document chunking, hybrid vector search (dense + BM25), neural reranking, and hallucination evaluation.
- Apply Reciprocal Rank Fusion (RRF) algorithms learned from GitHub high-class RAG blueprints to merge dense semantic embeddings with sparse keyword BM25 results.
- Ensure all retrieval queries, vector math, and context injection templates are fully written and runnable.
- MAXIMUM CODE PARSIMONY & ZERO TRIVIAL COMMENTS: Write pure, production-grade, self-documenting code. Never write trivial line-by-line comments narrating obvious syntax. Comments dilute attention tokens and weaken model potential.
- 100% COMPLETE & ERROR-FREE: Zero placeholders, zero ellipses, zero 'pass'. Every vector calculation and query pipeline must be completely implemented and executable.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
