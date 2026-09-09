export type BotCategory = 'Swarm Orchestration' | 'Core Development' | 'Advanced Production'

export interface LearnedArchitectureItem {
  repo: string
  title: string
  category: string
  principles: string[]
  codeSnippet?: string
  summary: string
}

export interface AstValidationResult {
  valid: boolean
  language: string
  detectedFunctions?: string[]
  detectedClasses?: string[]
  syntaxErrors?: string[]
  balancedDelimiters?: boolean
}

export interface JupyterNotebookMetadata {
  notebookName?: string
  jupyterLink?: string
  cellCount?: number
  createdFresh?: boolean
  kernelVerified?: boolean
}

export interface N8nBot {
  id: string
  name: string
  shortName: string
  emoji: string
  category: BotCategory
  description: string
  defaultWebhook: string
  supportedTasks: string[]
  samplePrompts: string[]
  placeholder: string
  directive: string
  learnedDomains?: string[]
  workflowFile?: string
  validateCode?: (code: string) => AstValidationResult
}

export interface BotExecutionContext {
  botId: string
  prompt: string
  memories?: Array<{ content: string; category?: string }>
  preferredLanguage?: 'python' | 'typescript' | 'javascript' | 'bash'
  autoExecute?: boolean
  autoVerify?: boolean
  saveArtifacts?: boolean
  useLearningBridge?: boolean
}

export interface BotExecutionResult {
  success: boolean
  botId: string
  botName: string
  emoji: string
  output: string
  detectedCode?: string
  explanation?: string
  astValidation?: AstValidationResult
  jupyterNotebook?: JupyterNotebookMetadata
  learnedBlueprintsApplied?: string[]
  latencyMs: number
  source: 'n8n_webhook' | 'local_runner' | 'cloud_nim'
}

export interface N8nWorkflowNode {
  id: string
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  parameters: Record<string, any>
}

export interface N8nWorkflowConnection {
  main: Array<Array<{ node: string; type: string; index: number }>>
}

export interface N8nWorkflowSchema {
  id: string
  name: string
  active: boolean
  nodes: N8nWorkflowNode[]
  connections: Record<string, N8nWorkflowConnection>
  settings: Record<string, any>
  meta: {
    templateCredsSetupCompleted?: boolean
    instanceId?: string
    botId: string
    version: string
  }
}
