import { N8N_BOTS, type N8nBot } from '../types_bots'
import type { MemoryItem } from '../chatMemory'
import { buildLearnedPromptContext } from '../types_bots'

export interface SwarmCollaborator {
  botId: string
  name: string
  shortName: string
  role: string
  icon: string
  contribution: string
}

export interface SwarmConsensusConfig {
  collaboratingBots: SwarmCollaborator[]
  systemPrompt: string
  appliedBlueprints: string[]
}

/**
 * Dynamically resolves the optimal collaborative swarm of bots for any engineering task.
 * Always includes Core-4: High-Thinking (Reasoning), System Architect (Design),
 * Coding Assistant (Implementation), QA Tester (Verification), plus domain specialists.
 */
export function resolveSwarmCollaborators(userQuery: string): SwarmCollaborator[] {
  const clean = userQuery.toLowerCase()
  const collaborators: SwarmCollaborator[] = [
    {
      botId: 'high-thinking',
      name: 'Deep Neural Thinker',
      shortName: 'Thinker',
      role: 'Algorithmic Optimality & Invariant Proofs',
      icon: 'BrainCircuit',
      contribution: 'Dissects edge cases, computational complexity, and guarantees mathematical correctness.',
    },
    {
      botId: 'system-designer',
      name: 'System Architect',
      shortName: 'Architect',
      role: 'Minimal Interface Design & Modular Contracts',
      icon: 'Layers',
      contribution: 'Enforces clean single-responsibility boundaries with zero bloated scaffolding.',
    },
    {
      botId: 'coding-assistant',
      name: 'Senior Coding Assistant',
      shortName: 'Coder',
      role: 'Ultra-Compact, Pythonic & Idiomatic Synthesis',
      icon: 'Code2',
      contribution: 'Writes the cleanest, shortest, 100% complete working implementation.',
    },
    {
      botId: 'testing-bot',
      name: 'QA & Test Engineer',
      shortName: 'Tester',
      role: 'AST Syntax Verification & Boundary Assertions',
      icon: 'CheckCircle2',
      contribution: 'Validates syntax integrity, import resolution, and compact execution tests.',
    },
  ]

  // Dynamic domain specialists based on query intent
  if (/(?:rag|vector|embedding|retriev|chunk|similarity|qdrant|chroma)/i.test(clean)) {
    collaborators.push({
      botId: 'advanced-rag',
      name: 'Advanced RAG Specialist',
      shortName: 'RAG',
      role: 'Vector Embeddings & Context Optimization',
      icon: 'Database',
      contribution: 'Injects high-density vector retrieval patterns and hybrid search schemas.',
    })
  }

  if (/(?:model|torch|tensorflow|train|neural|dataset|pipeline|nlp|transformer)/i.test(clean)) {
    collaborators.push({
      botId: 'ml-pipeline',
      name: 'ML Pipeline Specialist',
      shortName: 'MLOps',
      role: 'PyTorch / Lightning Pipeline Engineering',
      icon: 'Cpu',
      contribution: 'Enforces zero-copy tensor operations and vectorized matrix computations.',
    })
  }

  if (/(?:docker|container|k8s|kubernetes|deploy|aws|cloud|ci\/cd|pipeline)/i.test(clean)) {
    collaborators.push({
      botId: 'cloud-deployment',
      name: 'Cloud Deployment Bot',
      shortName: 'Cloud',
      role: 'Cloud-Native Containerization & CI/CD',
      icon: 'Cloud',
      contribution: 'Supplies production Dockerfiles, minimal multi-stage builds, and deployment YAMLs.',
    })
  }

  if (/(?:n8n|webhook|workflow|automation|trigger|integrate)/i.test(clean)) {
    collaborators.push({
      botId: 'n8n-manager',
      name: 'n8n Manager Bot',
      shortName: 'n8n',
      role: 'Autonomous Workflow Synthesis',
      icon: 'Workflow',
      contribution: 'Formats clean JSON DAG workflows ready for immediate execution.',
    })
  }

  return collaborators
}

/**
 * Compiles a synchronized Swarm Consensus System Prompt that commands all specialist bots
 * to work together, prioritizing the absolute shortest, most elegant code that 100% works and completes the logic.
 */
export function compileSwarmConsensusPrompt(
  userQuery: string,
  memories?: MemoryItem[]
): SwarmConsensusConfig {
  const collaborators = resolveSwarmCollaborators(userQuery)
  const { promptBlock: learnedArchitectureContext, appliedBlueprints } = buildLearnedPromptContext(
    'orchestrator',
    memories
  )

  const botListFormatted = collaborators
    .map((c) => `- **${c.name}** (${c.shortName}): ${c.role} — ${c.contribution}`)
    .join('\n')

  const systemPrompt = `=== NEMI AUTONOMOUS SWARM COLLABORATION ENGINE (ALL BOTS UNITED) ===
You are operating in UNIFIED SWARM CONSENSUS MODE.
Instead of a single bot answering in isolation, the top specialist bots in the NEMI Swarm are actively collaborating as a synchronized team to deliver the definitive solution.

ACTIVE SWARM COLLABORATORS FOR THIS TASK:
${botListFormatted}

${learnedArchitectureContext}

SUPREME MANDATES FOR BEST RESULTS & ULTRA-COMPACT WORKING CODE:
1. MAXIMUM CODE PARSIMONY (OCCAM'S RAZOR FOR CODE):
   - Prioritize the SHORTEST, CLEANEST, and MOST IDIOMATIC code that 100% completes the logic.
   - Never write 100 lines when 20 lines of clean, Pythonic, vectorized, or standard-library code does the job with superior performance.
   - Eliminate unnecessary boilerplate classes, verbose getters/setters, duplicate comments, and redundant scaffolding.
   - The best code is concise, readable, and mathematically optimal.

2. 100% ERROR-FREE & COMPLETE (NO PLACEHOLDERS):
   - Code must be completely self-contained with ALL necessary imports.
   - NEVER use placeholders like '# ... rest of code', 'pass', or '// TODO'.
   - Every single function, class, and method must be completely written out with zero missing symbols.

3. STRUCTURED SWARM CONSENSUS RESPONSE FORMAT:
   Structure your answer cleanly into 3 focused sections:
   - **⚡ Swarm Consensus Strategy**: 2-3 high-density bullet points from the collaborating bots (algorithm chosen, time/space complexity, and key invariant).
   - **💻 Definitive Complete Working Code**: The concise, 100% functional, and self-contained code snippet enclosed in standard fences (\`\`\`python ... \`\`\`).
   - **🧪 Verification & Colab Demo**: A minimal, executable verification block (e.g. \`if __name__ == '__main__':\`) with concrete assertions or print() tests demonstrating that the logic 100% completes and runs out-of-the-box.

Never write long verbose essays or filler text. Give the user the absolute best, cleanest, shortest working code that solves the prompt completely.`

  return {
    collaboratingBots: collaborators,
    systemPrompt,
    appliedBlueprints,
  }
}

/**
 * Determines if a query or bot selection warrants Swarm Collaboration Mode.
 */
export function isSwarmModeActive(
  selectedBotId: string,
  userQuery?: string
): boolean {
  if (selectedBotId === 'orchestrator' || selectedBotId === 'swarm') {
    return true
  }
  if (!userQuery) return false

  // Trigger swarm if prompt asks for multi-agent, swarm, collaboration, or end-to-end full system
  const multiAgentRegex = /(?:swarm|all bots|working together|collaborat|end-to-end|full system|best code|pipeline)/i
  return multiAgentRegex.test(userQuery)
}
