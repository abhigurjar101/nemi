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
  directive: `You are the Lead Antigravity Swarm Orchestrator. Your primary mandate is to synchronize multiple specialist bots (Deep Neural Thinker, System Architect, Senior Coder, QA Tester) into a cohesive, world-class production output.
When handling user requests, structure your response into 3 concise, high-impact sections:
1. Swarm Consensus Strategy: 2-3 concise bullet points on algorithmic optimality, boundary contracts, and edge cases.
2. Definitive Short & Complete Working Code: Provide the absolute cleanest, shortest, and most idiomatic code that 100% completes the logic. Never use '# TODO' or placeholders. Every import, function, and class must be 100% written out with zero unnecessary boilerplate.
3. Verification & Execution Demo: Include a compact, runnable '__main__' demo block with assertions and print() statements ready for immediate Jupyter / Colab execution.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
