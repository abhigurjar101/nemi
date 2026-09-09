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
  },
  {
    id: 'ml-pipeline',
    name: 'AI/ML Pipeline Bot',
    shortName: 'ML Pipeline',
    emoji: '🤖',
    category: 'Advanced Production',
    description: 'End-to-end ML lifecycle: data preparation, training code, model evaluation, serving, and drift monitoring.',
    defaultWebhook: 'ml/data/prepare',
    supportedTasks: ['prepare', 'train', 'evaluate', 'deploy', 'monitor'],
    placeholder: 'Request training pipelines, evaluation scripts, or drift monitors...',
    samplePrompts: [
      '🤖 PyTorch training script with mixed-precision and DDP',
      '📊 Automated feature validation pipeline with data drift checks',
      '📈 Model serving architecture with Triton inference specs',
    ],
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
