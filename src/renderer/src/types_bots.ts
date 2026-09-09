export interface N8nBot {
  id: string
  name: string
  shortName: string
  emoji: string
  category: 'Swarm Orchestration' | 'Core Development' | 'Advanced Production'
  description: string
  defaultWebhook: string
  supportedTasks: string[]
  samplePrompts: string[]
  placeholder: string
  directive?: string
}

export const N8N_BOTS: N8nBot[] = [
  {
    id: 'orchestrator',
    name: 'Antigravity Swarm Orchestrator',
    shortName: 'Swarm',
    emoji: '🎯',
    category: 'Swarm Orchestration',
    description: 'Autonomous multi-agent coordinator that decomposes tasks across bots and compiles verified Jupyter Notebooks.',
    defaultWebhook: 'tasks/execute-sync',
    supportedTasks: ['orchestrate', 'multi-agent', 'jupyter', 'verify'],
    placeholder: 'Describe an end-to-end engineering goal for the multi-agent swarm...',
    samplePrompts: [
      '⚡ Build a real-time rate limiter with Redis & Python',
      '🏛️ End-to-end event streaming architecture & tests',
      '📓 Synthesize verified algorithmic trading strategy in Jupyter',
    ],
    directive: `You are the Lead Antigravity Swarm Orchestrator 🎯. Your primary mandate is to synchronize multiple specialist bots into a cohesive, production-grade output.
When handling user requests, structure your response into synchronized phases:
1. 🎯 Phase 1: Task Decomposition & NLP Semantic Architecture: Clarify user intent, data schemas, entity boundaries, and semantic contracts.
2. 🏛️ Phase 2: System Architecture DAG: Map data flow and dependencies across components.
3. 💻 Phase 3: 100% Complete Verified Code Synthesis: Provide complete, runnable code with ZERO truncation. Never use ellipses (...), never omit methods, and never write '# TODO: implement here'. Every class, function, and import must be 100% written out.
4. 🧪 Phase 4: Quality & Verification Tests: Include executable assertion tests for boundary edge cases.
5. 📓 Phase 5: Executable Demonstration: End with an executable '__main__' demo block with sample inputs and print() statements ready for Jupyter / Colab execution.`,
  },
  {
    id: 'coding-assistant',
    name: 'Coding Assistant',
    shortName: 'Coding',
    emoji: '💻',
    category: 'Core Development',
    description: 'Code generation, in-depth review, refactoring, debugging, and AST syntax validation.',
    defaultWebhook: 'coding-assistant',
    supportedTasks: ['generate', 'review', 'refactor', 'debug', 'explain', 'validate'],
    placeholder: 'Ask Coding Assistant to write, debug, or refactor code...',
    samplePrompts: [
      '⚡ Write an async token-bucket rate limiter in Python',
      '🔍 Deep code review with typing & exception handling',
      '✨ AST syntax check and function decomposition',
    ],
    directive: `You are the Senior Coding Assistant 💻.
- Output 100% complete, fully implemented, clean code with zero placeholders or omissions.
- Never truncate code or use '# ... rest of code'.
- Provide type hints, docstrings, defensive exception handling, and a runnable '__main__' demonstration with sample inputs.
- Ensure all code blocks and parentheses are properly balanced and closed.`,
  },
  {
    id: 'system-design',
    name: 'System Design Bot',
    shortName: 'Arch',
    emoji: '🏛️',
    category: 'Core Development',
    description: 'Distributed systems architecture, C4 diagrams, ADRs, capacity planning, and live Mermaid diagrams.',
    defaultWebhook: 'system-design',
    supportedTasks: ['design', 'review', 'capacity', 'migration', 'adr'],
    placeholder: 'Ask System Design Bot for distributed architecture, C4, ADRs...',
    samplePrompts: [
      '🏛️ Design a globally distributed payment gateway with C4 diagram',
      '📋 Architecture Decision Record: Cassandra vs ScyllaDB at 1M QPS',
      '⚖️ Capacity planning model for 50M daily active users',
    ],
    directive: `You are the Principal System Architect 🏛️.
- Provide distributed architecture decompositions, C4 diagrams, sequence flows in Mermaid markdown, API schema definitions, and capacity planning.
- Ensure all diagrams and schemas are complete and syntactically valid.`,
  },
  {
    id: 'high-thinking',
    name: 'High Thinking & Reasoning',
    shortName: 'Reason',
    emoji: '🧠',
    category: 'Core Development',
    description: 'Deep multi-stage reasoning, dialectical debate, first principles, and mental models.',
    defaultWebhook: 'high-thinking',
    supportedTasks: ['deep', 'chain', 'debate', 'mentalModels', 'futures', 'firstPrinciples'],
    placeholder: 'Enter a complex problem for deep multi-stage reasoning...',
    samplePrompts: [
      '🧠 Adversarial pre-mortem for high-volume financial ledger',
      '🔬 First-principles analysis of distributed consensus protocols',
      '⚖️ Dialectical debate on Microservices vs Modular Monolith',
    ],
    directive: `You are the High Thinking & Deep Reasoning Specialist 🧠.
- Apply rigorous first-principles analysis, dialectical counter-arguments, failure mode pre-mortems, and algorithmic proofs.
- Systematically evaluate tradeoffs before delivering concrete, verifiable conclusions.`,
  },
  {
    id: 'testing-bot',
    name: 'Testing & QA Bot',
    shortName: 'Testing',
    emoji: '🧪',
    category: 'Core Development',
    description: 'Test generation (Pytest, Vitest, Jest), sandbox execution, edge case validation, and coverage.',
    defaultWebhook: 'testing/generate',
    supportedTasks: ['generate', 'execute', 'coverage'],
    placeholder: 'Generate test suites (pytest/vitest) or validate edge cases...',
    samplePrompts: [
      '🧪 Comprehensive Pytest suite with property-based tests',
      '⚡ Boundary edge case & fuzzing validation',
      '🎯 Mock external HTTP services for deterministic integration tests',
    ],
    directive: `You are the QA & Test Automation Specialist 🧪.
- Generate comprehensive, executable test suites using Pytest or Vitest.
- Include unit tests, boundary edge cases, mock fixtures, and assertion checks that can run directly in sandbox.`,
  },
  {
    id: 'advanced-rag',
    name: 'Advanced RAG Bot',
    shortName: 'Adv RAG',
    emoji: '📚',
    category: 'Advanced Production',
    description: 'Production RAG with hybrid search (BM25 + dense Qdrant), neural reranking, and agentic planning.',
    defaultWebhook: 'rag/query',
    supportedTasks: ['query', 'agentic', 'ingest', 'evaluate'],
    placeholder: 'Query knowledge base with hybrid search & reranking...',
    samplePrompts: [
      '📚 Hybrid BM25 + dense Qdrant vector query on codebase',
      '🔎 Evaluate neural reranking strategies for multi-turn retrieval',
      '📥 Check vector collection ingestion and embedding status',
    ],
    directive: `You are the Production RAG Specialist 📚.
- Design and implement end-to-end Retrieval-Augmented Generation systems with document chunking, hybrid vector search (dense + BM25), neural reranking, and hallucination evaluation.`,
  },
  {
    id: 'cloud-deployment',
    name: 'Cloud Deployment Bot',
    shortName: 'Cloud IaC',
    emoji: '☁️',
    category: 'Advanced Production',
    description: 'Infrastructure as Code: production Terraform modules, K8s manifests, Helm charts, and cloud cost estimation.',
    defaultWebhook: 'cloud/terraform/generate',
    supportedTasks: ['terraform', 'k8s', 'helm', 'deploy', 'validate', 'cost'],
    placeholder: 'Generate Terraform modules, K8s manifests, or Helm charts...',
    samplePrompts: [
      '☁️ Modular Terraform for AWS multi-region EKS cluster',
      '☸️ Production Kubernetes StatefulSet manifest with HPA & probes',
      '💰 Cloud cost estimation and egress optimization at 100TB/mo',
    ],
    directive: `You are the Cloud Infrastructure & DevOps Specialist ☁️.
- Produce complete, production-grade Terraform modules, Kubernetes manifests, Dockerfiles, and CI/CD pipelines with zero placeholders.`,
  },
  {
    id: 'ml-pipeline',
    name: 'AI/ML & NLP Pipeline Bot',
    shortName: 'NLP & ML',
    emoji: '🤖',
    category: 'Advanced Production',
    description: 'End-to-end NLP & ML lifecycle: tokenization, preprocessing, neural models, training, evaluation, and serving.',
    defaultWebhook: 'ml/data/prepare',
    supportedTasks: ['nlp', 'prepare', 'train', 'evaluate', 'deploy', 'monitor'],
    placeholder: 'Request NLP pipelines, tokenizers, classification, or ML models...',
    samplePrompts: [
      '🤖 End-to-end NLP tokenization and text classification pipeline',
      '📊 Automated feature validation pipeline with data drift checks',
      '📈 PyTorch neural sequence model with evaluation metrics',
    ],
    directive: `You are the Principal AI/ML & Natural Language Processing (NLP) Specialist 🤖.
- Specialize in end-to-end NLP pipelines: text normalization, regex cleaning, tokenization, vocabulary building, embeddings/TF-IDF, neural models, and classification.
- Always output the complete pipeline from scratch: Preprocessing -> Feature Extraction / Model -> Evaluation Metrics.
- NEVER truncate code. Always write the full implementation with a working demonstration block that processes real sample sentences and prints evaluation outputs.`,
  },
  {
    id: 'n8n-manager',
    name: 'n8n Manager Bot',
    shortName: 'n8n Manager',
    emoji: '⚙️',
    category: 'Advanced Production',
    description: 'Self-hosted n8n operations: automated deployments, encrypted backups, restoration, and auto-scaling.',
    defaultWebhook: 'n8n/deploy',
    supportedTasks: ['status', 'deploy', 'backup', 'restore', 'scale'],
    placeholder: 'Manage n8n workflows, backups, deployments, and triggers...',
    samplePrompts: [
      '⚙️ Inspect health of all 9 n8n workflows and webhook endpoints',
      '💾 Automated encrypted JSON backup of all bot configurations',
      '🚀 Trigger webhook smoke test for end-to-end validation',
    ],
  },
  {
    id: 'rag-bot',
    name: 'Local RAG Bot',
    shortName: 'Local RAG',
    emoji: '📁',
    category: 'Core Development',
    description: 'Local document and codebase Q&A with Qdrant vector search.',
    defaultWebhook: 'rag-query',
    supportedTasks: ['query', 'ingest'],
    placeholder: 'Search local documents and codebase with vector indexing...',
    samplePrompts: [
      '📁 Search indexed project files for middleware implementation',
      '🔍 Query local documentation on authentication architecture',
    ],
  },
]
