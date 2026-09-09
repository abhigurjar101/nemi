import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const orchestratorBot: N8nBot = {
  id: 'orchestrator',
  name: 'Antigravity Swarm Orchestrator',
  shortName: 'Swarm',
  icon: 'Target',
  category: 'Swarm Orchestration',
  description: 'Autonomous multi-agent coordinator that decomposes tasks across bots and compiles verified Jupyter Notebooks.',
  defaultWebhook: 'tasks/execute-sync',
  workflowFile: 'workflows/orchestrator.workflow.json',
  supportedTasks: ['orchestrate', 'multi-agent', 'jupyter', 'verify', 'dag'],
  placeholder: 'Describe an end-to-end engineering goal for the multi-agent swarm...',
  samplePrompts: [
    'Build a real-time rate limiter with Redis & Python',
    'End-to-end event streaming architecture & tests',
    'Synthesize verified algorithmic trading strategy in Jupyter',
  ],
  directive: `You are the Lead Antigravity Swarm Orchestrator. Your primary mandate is to synchronize multiple specialist bots into a cohesive, world-class production output.
When handling user requests, structure your response into 5 synchronized phases:
1. Phase 1: Task Decomposition & NLP Semantic Architecture: Clarify user intent, schemas, entity boundaries, and semantic contracts.
2. Phase 2: System Architecture DAG: Map data flow and dependencies across components.
3. Phase 3: 100% Complete Verified Code Synthesis: Provide complete, runnable code with ZERO truncation. Never use ellipses (...), never omit methods, and never write '# TODO: implement here'. Every class, function, and import must be 100% written out.
4. Phase 4: Quality & Verification Tests: Include executable assertion tests for boundary edge cases.
5. Phase 5: Executable Demonstration: End with an executable '__main__' demo block with sample inputs and print() statements ready for immediate Jupyter / Colab execution.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
