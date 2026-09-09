import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateSwarmMastery,
  recordAutonomousLearning,
  startAutonomousLearningDaemon,
} from '../src/renderer/src/utils/autonomousLearning'
import type { MemoryItem } from '../src/renderer/src/chatMemory'

describe('NEMI Autonomous Learning & Swarm Mastery Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('calculates swarm mastery profiles for all 11 autonomous bots', () => {
    const mockMemories: MemoryItem[] = [
      { id: '1', content: '[Verified Swarm Code: Attention Mechanism] 100% verified', category: 'project', timestamp: Date.now() },
      { id: '2', content: '[Learned Defense: Division by Zero] Bot guarded zero div', category: 'project', timestamp: Date.now() },
    ]

    const stats = calculateSwarmMastery(mockMemories)
    expect(stats).toBeDefined()
    expect(stats.totalBots).toBe(11)
    expect(stats.overallScore).toBeGreaterThanOrEqual(85)
    expect(stats.overallScore).toBeLessThanOrEqual(100)
    expect(stats.overallLevel).toContain('World-Class')
    expect(stats.botProfiles.length).toBe(11)

    // Check specific bots
    const orchestrator = stats.botProfiles.find((b) => b.botId === 'orchestrator')
    expect(orchestrator).toBeDefined()
    expect(orchestrator?.proficiency).toBeGreaterThanOrEqual(88)
    expect(orchestrator?.masteredSkills).toContain('Zero-Placeholder Synthesis')

    const coding = stats.botProfiles.find((b) => b.botId === 'coding-assistant')
    expect(coding).toBeDefined()
    expect(coding?.proficiency).toBeGreaterThanOrEqual(88)

    const learner = stats.botProfiles.find((b) => b.botId === 'github-learner')
    expect(learner).toBeDefined()
    expect(learner?.level).toContain('World-Class')
  })

  it('extracts learned defense boundary pattern from an execution error', async () => {
    const existing: MemoryItem[] = []
    const result = await recordAutonomousLearning({
      botId: 'code-tester',
      userQuery: 'Calculate matrix inverse',
      responseText: 'Error executing code',
      executionError: 'LinAlgError: Singular matrix is not invertible',
      executedCode: 'np.linalg.inv(singular_mat)',
      existingMemories: existing,
    })

    expect(result.learned).toBe(true)
    expect(result.newMemory).toBeDefined()
    expect(result.newMemory?.content).toContain('[Learned Defense:')
    expect(result.newMemory?.content).toContain('Singular matrix')
    expect(result.allMemories.length).toBe(1)
  })

  it('extracts verified runnable pattern on sandbox execution success', async () => {
    const existing: MemoryItem[] = []
    const result = await recordAutonomousLearning({
      botId: 'ml-pipeline',
      userQuery: 'Build PyTorch Lightning Module',
      responseText: 'Here is the Lightning Module',
      executionSuccess: true,
      executedCode: 'class LitClassifier(pl.LightningModule): pass',
      existingMemories: existing,
    })

    expect(result.learned).toBe(true)
    expect(result.newMemory?.content).toContain('[Verified Swarm Code:')
    expect(result.newMemory?.content).toContain('100% verified')
    expect(result.allMemories.length).toBe(1)
  })

  it('extracts architectural blueprint pattern from assistant code response', async () => {
    const existing: MemoryItem[] = []
    const responseWithCode = `
### Clean FastAPI Endpoints
\`\`\`python
from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}
\`\`\`
`
    const result = await recordAutonomousLearning({
      botId: 'system-designer',
      userQuery: 'Design clean FastAPI service',
      responseText: responseWithCode,
      existingMemories: existing,
    })

    expect(result.learned).toBe(true)
    expect(result.newMemory?.content).toContain('[Swarm Architecture:')
    expect(result.allMemories.length).toBe(1)
  })

  it('ignores trivial short text without code blocks', async () => {
    const existing: MemoryItem[] = []
    const result = await recordAutonomousLearning({
      botId: 'orchestrator',
      userQuery: 'Hello',
      responseText: 'Hi there! How can I help you today?',
      existingMemories: existing,
    })

    expect(result.learned).toBe(false)
    expect(result.newMemory).toBeUndefined()
    expect(result.allMemories.length).toBe(0)
  })

  it('deduplicates existing learned topics cleanly', async () => {
    const existing: MemoryItem[] = [
      {
        id: 'dup-1',
        content: '[Swarm Architecture: Clean API & Dependency Injection] Mastered by system-designer with complete interfaces.',
        category: 'project',
        timestamp: Date.now(),
      },
    ]

    const result = await recordAutonomousLearning({
      botId: 'system-designer',
      userQuery: 'FastAPI Microservice architecture',
      responseText: '```python\n# fastapi code\n```',
      existingMemories: existing,
    })

    expect(result.learned).toBe(false)
    expect(result.allMemories.length).toBe(1)
  })

  it('starts and stops autonomous background learning daemon cleanly', () => {
    const mockMemories: MemoryItem[] = []
    const onUpdate = vi.fn()
    const stop = startAutonomousLearningDaemon(() => mockMemories, onUpdate, 1000)

    expect(typeof stop).toBe('function')
    stop()
  })
})
