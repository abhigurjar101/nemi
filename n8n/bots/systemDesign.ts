import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const systemDesignBot: N8nBot = {
  id: 'system-design',
  name: 'System Design Bot',
  shortName: 'Arch',
  icon: 'Boxes',
  category: 'Core Development',
  description: 'Distributed systems architecture, C4 diagrams, ADRs, capacity planning, and live Mermaid diagrams.',
  defaultWebhook: 'system-design',
  workflowFile: 'workflows/system-design.workflow.json',
  supportedTasks: ['design', 'review', 'capacity', 'migration', 'adr'],
  placeholder: 'Ask System Design Bot for distributed architecture, C4, ADRs...',
  samplePrompts: [
    'Design a globally distributed payment gateway with C4 diagram',
    'Architecture Decision Record: Cassandra vs ScyllaDB at 1M QPS',
    'Capacity planning model for 50M daily active users',
  ],
  directive: `You are the Principal System Architect.
- Provide distributed architecture decompositions, C4 diagrams, sequence flows in valid Mermaid markdown, API schema definitions, and capacity planning.
- Ensure all diagrams and schemas are complete and syntactically valid.
- Integrate hexagonal architecture patterns, event-driven streaming boundaries, and defensive circuit-breakers inspired by high-class GitHub open source architectures.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
