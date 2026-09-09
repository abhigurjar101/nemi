import { describe, it, expect } from 'vitest'
import {
  resolveSwarmCollaborators,
  compileSwarmConsensusPrompt,
  isSwarmModeActive,
} from '../src/renderer/src/utils/swarmCollaboration'
import type { MemoryItem } from '../src/renderer/src/chatMemory'

describe('NEMI Multi-Agent Swarm Collaboration & Code Parsimony Suite', () => {
  it('resolves Core-4 specialist bots for general programming tasks', () => {
    const collaborators = resolveSwarmCollaborators('Write a fast LRU Cache')
    expect(collaborators.length).toBeGreaterThanOrEqual(4)

    const botIds = collaborators.map((c) => c.botId)
    expect(botIds).toContain('high-thinking')
    expect(botIds).toContain('system-designer')
    expect(botIds).toContain('coding-assistant')
    expect(botIds).toContain('testing-bot')
  })

  it('dynamically activates domain specialists based on query context', () => {
    const ragCollaborators = resolveSwarmCollaborators('Build hybrid vector similarity retrieval with Qdrant')
    expect(ragCollaborators.some((c) => c.botId === 'advanced-rag')).toBe(true)

    const mlCollaborators = resolveSwarmCollaborators('Train PyTorch Lightning transformer pipeline')
    expect(mlCollaborators.some((c) => c.botId === 'ml-pipeline')).toBe(true)

    const cloudCollaborators = resolveSwarmCollaborators('Deploy multi-stage Docker container on Kubernetes')
    expect(cloudCollaborators.some((c) => c.botId === 'cloud-deployment')).toBe(true)

    const n8nCollaborators = resolveSwarmCollaborators('Create webhook workflow trigger for n8n')
    expect(n8nCollaborators.some((c) => c.botId === 'n8n-manager')).toBe(true)
  })

  it('compiles a unified Swarm Consensus prompt with Code Parsimony mandates', () => {
    const mockMemories: MemoryItem[] = [
      { id: '1', content: '[Swarm Architecture: Clean API] Mastered pattern', category: 'project', timestamp: Date.now() },
    ]

    const config = compileSwarmConsensusPrompt('Create an ultra-fast rate limiter', mockMemories)
    expect(config).toBeDefined()
    expect(config.collaboratingBots.length).toBeGreaterThanOrEqual(4)
    expect(config.systemPrompt).toContain('UNIFIED SWARM CONSENSUS MODE')
    expect(config.systemPrompt).toContain("MAXIMUM CODE PARSIMONY (OCCAM'S RAZOR FOR CODE)")
    expect(config.systemPrompt).toContain('100% ERROR-FREE & COMPLETE (NO PLACEHOLDERS)')
    expect(config.systemPrompt).toContain('⚡ Swarm Consensus Strategy')
    expect(config.systemPrompt).toContain('💻 Definitive Complete Working Code')
    expect(config.systemPrompt).toContain('🧪 Verification & Colab Demo')
    expect(Array.isArray(config.appliedBlueprints)).toBe(true)
  })

  it('correctly detects when Swarm Collaboration Mode is active', () => {
    // Orchestrator bot id
    expect(isSwarmModeActive('orchestrator')).toBe(true)
    expect(isSwarmModeActive('swarm')).toBe(true)

    // Swarm keywords in user query
    expect(isSwarmModeActive('coding-assistant', 'Are all bots working together on this?')).toBe(true)
    expect(isSwarmModeActive('coding-assistant', 'Run full system end-to-end swarm')).toBe(true)
    expect(isSwarmModeActive('coding-assistant', 'Give me the best code with collaboration')).toBe(true)

    // Single bot without swarm keywords
    expect(isSwarmModeActive('coding-assistant', 'format this string')).toBe(false)
  })
})
