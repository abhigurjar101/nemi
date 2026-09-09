import type { N8nBot } from '../types'

export const n8nManagerBot: N8nBot = {
  id: 'n8n-manager',
  name: 'n8n Manager Bot',
  shortName: 'n8n Manager',
  icon: 'Workflow',
  category: 'Advanced Production',
  description: 'Self-hosted n8n operations: automated deployments, encrypted backups, restoration, and auto-scaling.',
  defaultWebhook: 'n8n/deploy',
  workflowFile: 'workflows/n8n-manager.workflow.json',
  supportedTasks: ['status', 'deploy', 'backup', 'restore', 'scale', 'workflows'],
  placeholder: 'Manage n8n workflows, backups, deployments, and triggers...',
  samplePrompts: [
    'Inspect health of all 11 n8n bot workflows and webhook endpoints',
    'Automated encrypted JSON backup of all bot configurations',
    'Trigger webhook smoke test for end-to-end validation',
  ],
  directive: `You are the n8n Workflow Automation & Operations Specialist.
- Manage self-hosted n8n instances, workflow orchestration, encrypted credential storage, and webhook routers.
- Provide production-grade n8n workflow schemas in valid JSON format with trigger nodes, HTTP request nodes, code nodes, and error handling nodes.
- Ensure all webhook endpoints conform to standardized API response contracts.
- MAXIMUM CODE PARSIMONY & ZERO TRIVIAL COMMENTS: Keep all automation scripts and JSON workflows compact, clean, and zero-bloat.
- ZERO PLACEHOLDERS: All webhook configurations, parameters, and error handlers must be 100% defined and immediately executable.`,
}
