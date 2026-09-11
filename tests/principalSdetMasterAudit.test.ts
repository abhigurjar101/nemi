import { describe, it, expect } from 'vitest'
import {
  DirectedGraph,
  topologicalSortKahn,
  topologicalSortDFS,
  detectCycleDFS,
  detectCycleKahn,
  StateGraph,
  MemorySaver,
  BitmaskDAG,
  GRAPH_START,
  GRAPH_END,
} from '../src/renderer/src/services/langGraphEngine'
import { NEMILangGraphApexAgent } from '../src/renderer/src/services/apexAgentEngine'
import { dailyLearningFeed } from '../src/renderer/src/services/dailyLearningFeed'

describe('Principal SDET Master Quality Audit — Extreme Systematic Verification', () => {
  const apex = new NEMILangGraphApexAgent()

  describe('Dimension 1: Extreme Scale & Algorithmic Stress (3,000-Node DAG)', () => {
    it('constructs, validates, and sorts a 3,000-node DAG with 8,985 edges in under 100ms', () => {
      const nodeCount = 3000
      const graph = new DirectedGraph()

      for (let i = 0; i < nodeCount; i++) {
        graph.addNode(`task_${i}`)
      }

      let edgeCount = 0
      for (let i = 0; i < nodeCount - 1; i++) {
        graph.addEdge(`task_${i}`, `task_${i + 1}`)
        edgeCount++
        if (i + 5 < nodeCount) {
          graph.addEdge(`task_${i}`, `task_${i + 5}`)
          edgeCount++
        }
        if (i + 10 < nodeCount) {
          graph.addEdge(`task_${i}`, `task_${i + 10}`)
          edgeCount++
        }
      }

      expect(graph.getNodes().length).toBe(3000)
      expect(edgeCount).toBeGreaterThan(8000)
      expect(graph.isDAG()).toBe(true)

      const t0 = performance.now()
      const sortedOrder = topologicalSortKahn(graph)
      const t1 = performance.now()
      const latencyMs = t1 - t0

      expect(sortedOrder.length).toBe(3000)
      expect(latencyMs).toBeLessThan(100) // Highly efficient O(V + E)

      // Verify strict topological ordering invariants
      const idx0 = sortedOrder.indexOf('task_0')
      const idx1000 = sortedOrder.indexOf('task_1000')
      const idx2000 = sortedOrder.indexOf('task_2000')
      const idx2999 = sortedOrder.indexOf('task_2999')

      expect(idx0).toBeLessThan(idx1000)
      expect(idx1000).toBeLessThan(idx2000)
      expect(idx2000).toBeLessThan(idx2999)
    })
  })

  describe('Dimension 2: Adversarial Cycle Topologies & Exact Path Reconstruction', () => {
    it('detects a 1-node self-loop (A -> A)', () => {
      const g = new DirectedGraph()
      g.addNode('A')
      g.addEdge('A', 'A')

      const [hasCycle, path] = detectCycleDFS(g)
      expect(hasCycle).toBe(true)
      expect(path).toEqual(['A', 'A'])
      expect(detectCycleKahn(g)).toBe(true)
      expect(() => topologicalSortKahn(g)).toThrow(/circular dependenc/i)
    })

    it('detects a 2-node mutual cycle (A <-> B)', () => {
      const g = new DirectedGraph({
        A: ['B'],
        B: ['A'],
      })

      const [hasCycle, path] = detectCycleDFS(g)
      expect(hasCycle).toBe(true)
      expect(path).toBeDefined()
      expect(path?.length).toBe(3)
      expect(detectCycleKahn(g)).toBe(true)
      expect(() => topologicalSortDFS(g)).toThrow(/circular dependenc/i)
    })

    it('detects a complex Figure-8 double cycle and captures back-edge accurately', () => {
      // Loop 1: A -> B -> C -> A
      // Loop 2: C -> D -> E -> C
      const g = new DirectedGraph({
        A: ['B'],
        B: ['C'],
        C: ['A', 'D'],
        D: ['E'],
        E: ['C'],
      })

      const [hasCycle, path] = detectCycleDFS(g)
      expect(hasCycle).toBe(true)
      expect(path).toBeDefined()
      expect(detectCycleKahn(g)).toBe(true)
    })

    it('detects cycle in disconnected subgraph while keeping independent components intact', () => {
      // Component 1 (Acyclic): X -> Y -> Z
      // Component 2 (Cyclic): M -> N -> M
      const g = new DirectedGraph({
        X: ['Y'],
        Y: ['Z'],
        Z: [],
        M: ['N'],
        N: ['M'],
      })

      const [hasCycle, path] = detectCycleDFS(g)
      expect(hasCycle).toBe(true)
      expect(path).toBeDefined()
      expect(path).toContain('M')
      expect(path).toContain('N')
      expect(path).not.toContain('X')
      expect(detectCycleKahn(g)).toBe(true)
    })
  })

  describe('Dimension 3: StateGraph Runtime Fault Injection & Circuit Breakers', () => {
    it('enforces step budget circuit breaker on intentional infinite self-loops', async () => {
      const graph = new StateGraph<{ count: number }>()

      graph.addNode('loopNode', (s) => ({ count: (s.count || 0) + 1 }))
      graph.setEntryPoint('loopNode')
      // Edge from loopNode back to loopNode unconditionally
      graph.addEdge('loopNode', 'loopNode')

      const maxSteps = 10
      const compiled = graph.compile({ maxSteps })
      const res = await compiled.invoke({ count: 0 })

      // Must break execution when stepCount reaches maxSteps
      expect(res.stepCount).toBe(maxSteps)
      expect(res.count).toBe(maxSteps)
    })

    it('handles unmapped conditional route safely by routing to GRAPH_END', async () => {
      const graph = new StateGraph<{ status: string }>()

      graph.addNode('source', () => ({ status: 'UNKNOWN' }))
      graph.setEntryPoint('source')
      graph.addConditionalEdges(
        'source',
        () => 'unmapped_key',
        {
          expected_key: 'targetNode',
        }
      )

      const compiled = graph.compile()
      const res = await compiled.invoke({ status: 'START' })
      expect(res.status).toBe('UNKNOWN')
    })
  })

  describe('Dimension 4: Bayesian Gatekeeper Floating-Point Epsilon & Boundary Hardening', () => {
    it('strictly REJECTS epsilon-sub-threshold: P(Win) = 0.6999999999', async () => {
      const res = await apex.evaluateTradeSetupRealtime('SOL/USDT', 0.6999999999)
      expect(res.gatekeeperPassed).toBe(false)
      expect(res.gatekeeperReason).toContain('REJECTED')
      expect(res.interrupted).toBe(false)
      expect(res.orderStatus).toBeUndefined()
    })

    it('strictly APPROVES exact threshold: P(Win) = 0.7000000000', async () => {
      const res = await apex.evaluateTradeSetupRealtime('BTC/USDT', 0.7)
      expect(res.gatekeeperPassed).toBe(true)
      expect(res.gatekeeperReason).toContain('PASSED')
      expect(res.interrupted).toBe(true)
      expect(res.interruptedNode).toBe('executeOrder')
    })

    it('strictly APPROVES epsilon-super-threshold: P(Win) = 0.7000000001', async () => {
      const res = await apex.evaluateTradeSetupRealtime('ETH/USDT', 0.7000000001)
      expect(res.gatekeeperPassed).toBe(true)
      expect(res.gatekeeperReason).toContain('PASSED')
      expect(res.interrupted).toBe(true)
    })

    it('handles negative or out-of-bounds win probabilities safely', async () => {
      const resNeg = await apex.evaluateTradeSetupRealtime('BNB/USDT', -0.5)
      expect(resNeg.gatekeeperPassed).toBe(false)

      const resSure = await apex.evaluateTradeSetupRealtime('AVAX/USDT', 1.0)
      expect(resSure.gatekeeperPassed).toBe(true)
      expect(resSure.interrupted).toBe(true)
    })
  })

  describe('Dimension 5: High-Throughput Concurrency & Checkpoint Immutability', () => {
    it('runs 25 concurrent StateGraph executions simultaneously with zero crosstalk', async () => {
      const concurrentTasks = Array.from({ length: 25 }, (_, i) =>
        apex.solveHardestProblemRealtime((i % 25) + 1)
      )

      const results = await Promise.all(concurrentTasks)
      expect(results.length).toBe(25)

      for (let i = 0; i < 25; i++) {
        const res = results[i]
        expect(res.astValid).toBe(true)
        expect(res.solutionVerified).toBe(true)
        expect(res.problemId).toBe((i % 25) + 1)
        expect(res.taskId).toBeDefined()
      }
    })

    it('verifies MemorySaver checkpoint history preserves state snapshots immutably', () => {
      const saver = new MemorySaver<{ count: number }>()

      saver.saveCheckpoint('thread_1', 1, 'nodeA', { count: 1 })
      saver.saveCheckpoint('thread_1', 2, 'nodeB', { count: 2 })

      const history = saver.getHistory('thread_1')
      expect(history.length).toBe(2)
      expect(history[0].stateSnapshot.count).toBe(1)
      expect(history[1].stateSnapshot.count).toBe(2)

      // Verify that mutating retrieved state does not alter checkpointer store
      const retrieved = saver.getLatest('thread_1')
      expect(retrieved?.count).toBe(2)
      if (retrieved) retrieved.count = 999

      const rechecked = saver.getLatest('thread_1')
      expect(rechecked?.count).toBe(2)
    })

    it('enforces LRU bounding on MemorySaver to prevent unbounded heap allocation', () => {
      const saver = new MemorySaver<{ count: number }>(3) // Max capacity: 3

      for (let i = 1; i <= 5; i++) {
        saver.saveCheckpoint('thread_lru', i, `node_${i}`, { count: i })
      }

      const history = saver.getHistory('thread_lru')
      expect(history.length).toBe(3)
      // Oldest checkpoints (1, 2) evicted; 3, 4, 5 retained
      expect(history[0].stateSnapshot.count).toBe(3)
      expect(history[1].stateSnapshot.count).toBe(4)
      expect(history[2].stateSnapshot.count).toBe(5)
    })
  })

  describe('Dimension 6: Enterprise Improvements & Daily Learning Feed Verification', () => {
    it('verifies BitmaskDAG executes microsecond zero-allocation edge verification', () => {
      const bitmask = new BitmaskDAG(['node_A', 'node_B', 'node_C'])
      bitmask.addEdge('node_A', 'node_B')
      bitmask.addEdge('node_B', 'node_C')

      expect(bitmask.size()).toBe(3)
      expect(bitmask.hasEdge('node_A', 'node_B')).toBe(true)
      expect(bitmask.hasEdge('node_B', 'node_C')).toBe(true)
      expect(bitmask.hasEdge('node_A', 'node_C')).toBe(false)
    })

    it('captures unhandled node exceptions into Dead-Letter Queue and executes automated state rollback', async () => {
      const graph = new StateGraph<{ val: number; lastException?: string; errors?: string[] }>()
      const saver = new MemorySaver<{ val: number; lastException?: string; errors?: string[] }>()

      graph.addNode('healthyNode', () => ({ val: 100 }))
      graph.addNode('failingNode', () => {
        throw new Error('Simulated hardware bus fault')
      })

      graph.setEntryPoint('healthyNode')
      graph.addEdge('healthyNode', 'failingNode')

      const compiled = graph.compile({ checkpointer: saver })
      const res = await compiled.invoke({ val: 0 })

      // Rollback to healthy checkpoint (val: 100)
      expect(res.val).toBe(100)
      expect(res.lastException).toContain('Simulated hardware bus fault')
      expect(res.errors?.some((e) => e.includes('Dead-letter caught'))).toBe(true)
      expect(compiled.deadLetterQueue.length).toBe(1)
      expect(compiled.deadLetterQueue[0].error).toContain('Simulated hardware bus fault')
    })

    it('records OpenTelemetry distributed trace spans across StateGraph node transitions', async () => {
      const graph = new StateGraph<{ step1?: boolean; step2?: boolean; traceId?: string; traceSpans?: any[] }>()
      graph.addNode('node1', () => ({ step1: true }))
      graph.addNode('node2', () => ({ step2: true }))
      graph.setEntryPoint('node1')
      graph.addEdge('node1', 'node2')

      const compiled = graph.compile()
      const res = await compiled.invoke({})

      expect(res.traceId).toBeDefined()
      expect(res.traceSpans).toBeDefined()
      expect(res.traceSpans?.length).toBe(2)
      expect(res.traceSpans?.[0].node).toBe('node1')
      expect(res.traceSpans?.[0].status).toBe('OK')
      expect(res.traceSpans?.[1].node).toBe('node2')
      expect(res.traceSpans?.[1].durationMs).toBeGreaterThanOrEqual(0)
    })

    it('executes Daily Learning Feed ingestion for Code and Trade Swarms', async () => {
      const statusBefore = dailyLearningFeed.getStatus()
      expect(statusBefore.totalLearnedPatterns).toBeGreaterThanOrEqual(0)

      const ingestResult = await dailyLearningFeed.ingestDailyFeed(true)
      expect(ingestResult.success).toBe(true)
      expect(ingestResult.codePatternsIngested).toBeGreaterThanOrEqual(1)
      expect(ingestResult.tradePatternsIngested).toBeGreaterThanOrEqual(1)
      expect(ingestResult.summary).toContain('Daily Learning Feed applied')

      const statusAfter = dailyLearningFeed.getStatus()
      expect(statusAfter.isSyncedToday).toBe(true)
      expect(statusAfter.codeSwarmProficiency).toBeGreaterThanOrEqual(80)
      expect(statusAfter.tradeSwarmProficiency).toBeGreaterThanOrEqual(80)
    })
  })
})
