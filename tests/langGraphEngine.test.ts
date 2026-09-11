import { describe, it, expect } from 'vitest'
import {
  DirectedGraph,
  dfsTraversal,
  bfsTraversal,
  detectCycleDFS,
  detectCycleKahn,
  topologicalSortKahn,
  StateGraph,
  GRAPH_START,
  GRAPH_END,
  buildCodeSwarmGraph,
  buildTradeSwarmGraph,
} from '../src/renderer/src/services/langGraphEngine'

describe('Enterprise LangGraph & Graph Foundations Suite', () => {
  // Canonical cooking workflow from Chapter 1 & 6:
  // Get Bread -> Add Butter -> Sandwich Ready
  // Boil Water -> Add Tea Leaves -> Tea Ready
  // Sandwich Ready -> Serve Meal; Tea Ready -> Serve Meal
  const cookingGraph = new DirectedGraph({
    'Get Bread': ['Add Butter'],
    'Add Butter': ['Sandwich Ready'],
    'Boil Water': ['Add Tea Leaves'],
    'Add Tea Leaves': ['Tea Ready'],
    'Sandwich Ready': ['Serve Meal'],
    'Tea Ready': ['Serve Meal'],
    'Serve Meal': [],
  })

  // Cyclic graph from Chapter 4 & 5
  const cyclicGraph = new DirectedGraph({
    A: ['B'],
    B: ['C'],
    C: ['A'],
  })

  describe('1. Graph Representation & Degree Metrics', () => {
    it('accurately computes in-degrees and identifies sources and sinks', () => {
      const indeg = cookingGraph.inDegrees()
      expect(indeg.get('Get Bread')).toBe(0)
      expect(indeg.get('Boil Water')).toBe(0)
      expect(indeg.get('Serve Meal')).toBe(2)
      expect(cookingGraph.isDAG()).toBe(true)
      expect(cyclicGraph.isDAG()).toBe(false)
    })
  })

  describe('2. Traversals (DFS vs BFS)', () => {
    it('executes DFS deep traversal exploration', () => {
      const order = dfsTraversal(cookingGraph, 'Get Bread')
      expect(order).toContain('Get Bread')
      expect(order).toContain('Add Butter')
      expect(order).toContain('Sandwich Ready')
      expect(order).toContain('Serve Meal')
      expect(order.indexOf('Get Bread')).toBeLessThan(order.indexOf('Add Butter'))
    })

    it('executes BFS layer-by-layer exploration', () => {
      const order = bfsTraversal(cookingGraph, 'Get Bread')
      expect(order[0]).toBe('Get Bread')
      expect(order[1]).toBe('Add Butter')
    })
  })

  describe('3. Cycle Detection (DFS Path Tracking & Kahn In-Degree)', () => {
    it('identifies acyclic graphs correctly in both algorithms', () => {
      const [hasCycleDFS, cyclePath] = detectCycleDFS(cookingGraph)
      expect(hasCycleDFS).toBe(false)
      expect(cyclePath).toBeNull()
      expect(detectCycleKahn(cookingGraph)).toBe(false)
    })

    it('detects cycles and back-edges correctly in cyclic graphs', () => {
      const [hasCycleDFS, cyclePath] = detectCycleDFS(cyclicGraph)
      expect(hasCycleDFS).toBe(true)
      expect(cyclePath).toEqual(['A', 'B', 'C', 'A'])
      expect(detectCycleKahn(cyclicGraph)).toBe(true)
    })
  })

  describe('4. Deterministic Topological Sorting (Kahn In-Degree)', () => {
    it('computes valid dependency order satisfying all precedence constraints', () => {
      const order = topologicalSortKahn(cookingGraph)
      expect(order.length).toBe(7)
      expect(order.indexOf('Get Bread')).toBeLessThan(order.indexOf('Add Butter'))
      expect(order.indexOf('Add Butter')).toBeLessThan(order.indexOf('Sandwich Ready'))
      expect(order.indexOf('Sandwich Ready')).toBeLessThan(order.indexOf('Serve Meal'))
      expect(order.indexOf('Boil Water')).toBeLessThan(order.indexOf('Add Tea Leaves'))
      expect(order.indexOf('Add Tea Leaves')).toBeLessThan(order.indexOf('Tea Ready'))
      expect(order.indexOf('Tea Ready')).toBeLessThan(order.indexOf('Serve Meal'))
    })

    it('throws error when attempting to sort a cyclic graph', () => {
      expect(() => topologicalSortKahn(cyclicGraph)).toThrow(
        'Circular dependency detected in graph; topological ordering impossible.'
      )
    })
  })

  describe('5. LangGraph StateGraph & Subgraphs Execution', () => {
    it('executes Code Swarm Subgraph with autonomous self-healing AST loop', async () => {
      const codeGraph = buildCodeSwarmGraph()
      const res = await codeGraph.invoke({ task: 'Build fast matrix multiplier' })
      expect(res.qaApproved).toBe(true)
      expect(res.astValid).toBe(true)
      expect(res.codeIteration).toBe(2)
      expect(res.consensus).toContain('11 Bots Consensus Validated')
    })

    it('executes Trade Swarm Subgraph with 70%+ Bayesian gatekeeper and human interrupt', async () => {
      const tradeGraph = buildTradeSwarmGraph()
      // Initial invocation: reaches interruptBefore=['execution']
      const interruptedState = await tradeGraph.invoke({ symbol: 'BTC/USDT' })
      expect(interruptedState.interrupted).toBe(true)
      expect(interruptedState.interruptedNode).toBe('execution')
      expect(interruptedState.gatekeeperPassed).toBe(true)
      expect(interruptedState.pWin).toBeGreaterThanOrEqual(0.70)

      // Resume execution (simulating user approval)
      const finalState = await tradeGraph.invoke(interruptedState, 'execution')
      expect(finalState.interrupted).toBe(false)
      expect(finalState.tradeExecuted).toBe(true)
      expect(finalState.orderStatus).toBe('FILLED')
    })
  })
})
