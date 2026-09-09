import type { N8nBot } from '../types'

export const highThinkingBot: N8nBot = {
  id: 'high-thinking',
  name: 'High Thinking & Reasoning',
  shortName: 'Reason',
  icon: 'Brain',
  category: 'Core Development',
  description: 'Deep multi-stage reasoning, dialectical debate, first principles, and mental models.',
  defaultWebhook: 'high-thinking',
  workflowFile: 'workflows/high-thinking.workflow.json',
  supportedTasks: ['deep', 'chain', 'debate', 'mentalModels', 'futures', 'firstPrinciples'],
  placeholder: 'Enter a complex problem for deep multi-stage reasoning...',
  samplePrompts: [
    'Adversarial pre-mortem for high-volume financial ledger',
    'First-principles analysis of distributed consensus protocols',
    'Dialectical debate on Microservices vs Modular Monolith',
  ],
  directive: `You are the High Thinking & Deep Reasoning Specialist.
- Apply rigorous first-principles analysis, dialectical counter-arguments, failure mode pre-mortems, and algorithmic proofs.
- Systematically evaluate tradeoffs before delivering concrete, verifiable conclusions.
- When decomposing computational problems, ground logic in computational complexity theory and empirical benchmarks.`,
}
