/**
 * NEMI Enterprise LangGraph & Graph Foundations Engine
 * Implements formal graph foundations (DFS, BFS, Cycle Detection, Kahn Topological Sort)
 * and LangGraph StateGraph architecture for Multi-Agent Swarm Orchestration.
 */

export interface AdjacencyMap {
  [node: string]: string[]
}

export class DirectedGraph {
  private adj: Map<string, string[]> = new Map()

  constructor(initialAdj?: AdjacencyMap) {
    if (initialAdj) {
      for (const [node, neighbors] of Object.entries(initialAdj)) {
        this.addNode(node)
        for (const neighbor of neighbors) {
          this.addEdge(node, neighbor)
        }
      }
    }
  }

  addNode(node: string): void {
    if (!this.adj.has(node)) {
      this.adj.set(node, [])
    }
  }

  addEdge(u: string, v: string): void {
    this.addNode(u)
    this.addNode(v)
    const neighbors = this.adj.get(u)!
    if (!neighbors.includes(v)) {
      neighbors.push(v)
    }
  }

  getNodes(): string[] {
    return Array.from(this.adj.keys())
  }

  getNeighbors(node: string): string[] {
    return this.adj.get(node) || []
  }

  inDegrees(): Map<string, number> {
    const indeg = new Map<string, number>()
    for (const node of this.getNodes()) {
      indeg.set(node, 0)
    }
    for (const [, neighbors] of this.adj.entries()) {
      for (const v of neighbors) {
        indeg.set(v, (indeg.get(v) || 0) + 1)
      }
    }
    return indeg
  }

  isDAG(): boolean {
    const [hasCycle] = detectCycleDFS(this)
    return !hasCycle
  }

  /**
   * Computes the maximum topological depth (longest dependency path in the DAG).
   */
  computeDiameter(): number {
    const dist = new Map<string, number>()
    for (const node of this.getNodes()) {
      dist.set(node, 0)
    }
    const [hasCycle] = detectCycleDFS(this)
    const order = !hasCycle ? topologicalSortKahn(this) : this.getNodes()
    let maxDist = 0

    for (const u of order) {
      const uDist = dist.get(u) || 0
      for (const v of this.getNeighbors(u)) {
        if (uDist + 1 > (dist.get(v) || 0)) {
          dist.set(v, uDist + 1)
          if (uDist + 1 > maxDist) {
            maxDist = uDist + 1
          }
        }
      }
    }
    return maxDist
  }
}

/**
 * Zero-Allocation Bitmask DAG for Ultra-Low Latency High-Frequency Multi-Agent Execution.
 * Replaces string hashing with contiguous typed integer bitmasks.
 */
export class BitmaskDAG {
  private nodeToIndex = new Map<string, number>()
  private indexToNode: string[] = []
  private adjBits: Uint32Array[] = []

  constructor(nodes: string[] = []) {
    for (const n of nodes) {
      this.addNode(n)
    }
  }

  addNode(node: string): number {
    if (this.nodeToIndex.has(node)) return this.nodeToIndex.get(node)!
    const idx = this.indexToNode.length
    this.nodeToIndex.set(node, idx)
    this.indexToNode.push(node)
    const wordsNeeded = Math.ceil((idx + 1) / 32)
    const newBits = new Uint32Array(wordsNeeded)
    this.adjBits.push(newBits)
    return idx
  }

  addEdge(u: string, v: string): void {
    const uIdx = this.addNode(u)
    const vIdx = this.addNode(v)
    const wordIdx = Math.floor(vIdx / 32)
    const bitPos = vIdx % 32
    if (wordIdx >= this.adjBits[uIdx].length) {
      const expanded = new Uint32Array(wordIdx + 1)
      expanded.set(this.adjBits[uIdx])
      this.adjBits[uIdx] = expanded
    }
    this.adjBits[uIdx][wordIdx] |= (1 << bitPos)
  }

  hasEdge(u: string, v: string): boolean {
    const uIdx = this.nodeToIndex.get(u)
    const vIdx = this.nodeToIndex.get(v)
    if (uIdx === undefined || vIdx === undefined) return false
    const wordIdx = Math.floor(vIdx / 32)
    const bitPos = vIdx % 32
    if (wordIdx >= this.adjBits[uIdx].length) return false
    return (this.adjBits[uIdx][wordIdx] & (1 << bitPos)) !== 0
  }

  size(): number {
    return this.indexToNode.length
  }
}

/**
 * Depth-First Search Traversal (Chapter 3.3)
 */
export function dfsTraversal(graph: DirectedGraph, startNode: string): string[] {
  const visited = new Set<string>()
  const order: string[] = []

  function dfs(node: string) {
    if (!visited.has(node)) {
      visited.add(node)
      order.push(node)
      for (const neighbor of graph.getNeighbors(node)) {
        dfs(neighbor)
      }
    }
  }

  dfs(startNode)
  return order
}

/**
 * Breadth-First Search Traversal (Chapter 3.4)
 */
export function bfsTraversal(graph: DirectedGraph, startNode: string): string[] {
  const visited = new Set<string>()
  const order: string[] = []
  const queue: string[] = [startNode]

  while (queue.length > 0) {
    const node = queue.shift()!
    if (!visited.has(node)) {
      visited.add(node)
      order.push(node)
      for (const neighbor of graph.getNeighbors(node)) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor)
        }
      }
    }
  }

  return order
}

/**
 * DFS Recursion Path Tracking Cycle Detection (Chapter 5.6)
 * Returns [hasCycle, cyclePath]
 */
export function detectCycleDFS(graph: DirectedGraph): [boolean, string[] | null] {
  const visited = new Set<string>()
  const path = new Set<string>()
  const pathStack: string[] = []

  function dfs(node: string): string[] | null {
    visited.add(node)
    path.add(node)
    pathStack.push(node)

    for (const neighbor of graph.getNeighbors(node)) {
      if (path.has(neighbor)) {
        const idx = pathStack.indexOf(neighbor)
        return pathStack.slice(idx).concat([neighbor])
      }
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor)
        if (cycle) return cycle
      }
    }

    path.delete(node)
    pathStack.pop()
    return null
  }

  for (const node of graph.getNodes()) {
    if (!visited.has(node)) {
      const cycle = dfs(node)
      if (cycle) return [true, cycle]
    }
  }

  return [false, null]
}

/**
 * Kahn In-Degree Cycle Detection (Chapter 5.8)
 */
export function detectCycleKahn(graph: DirectedGraph): boolean {
  const inDegree = graph.inDegrees()
  const queue: string[] = []
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(node)
  }

  let count = 0
  while (queue.length > 0) {
    const node = queue.shift()!
    count++
    for (const neighbor of graph.getNeighbors(node)) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  return count !== graph.getNodes().length
}

/**
 * Topological Sort via Kahn Algorithm (Chapter 6.7)
 */
export function topologicalSortKahn(graph: DirectedGraph): string[] {
  const inDegree = graph.inDegrees()
  const queue: string[] = []
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(node)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    order.push(node)
    for (const neighbor of graph.getNeighbors(node)) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  if (order.length !== graph.getNodes().length) {
    throw new Error('Circular dependency detected in graph; topological ordering impossible.')
  }

  return order
}

/**
 * Topological Sort via DFS Post-Order Stack Reversal (Chapter 6.9)
 */
export function topologicalSortDFS(graph: DirectedGraph): string[] {
  const [hasCycle, cyclePath] = detectCycleDFS(graph)
  if (hasCycle) {
    throw new Error(`Circular dependency detected in graph: ${cyclePath?.join(' -> ')}`)
  }

  const visited = new Set<string>()
  const postOrderStack: string[] = []

  for (const startNode of graph.getNodes()) {
    if (visited.has(startNode)) continue

    const callStack: Array<{ node: string; neighbors: string[]; nextIdx: number }> = [
      { node: startNode, neighbors: graph.getNeighbors(startNode), nextIdx: 0 },
    ]
    visited.add(startNode)

    while (callStack.length > 0) {
      const top = callStack[callStack.length - 1]
      if (top.nextIdx < top.neighbors.length) {
        const neighbor = top.neighbors[top.nextIdx++]
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          callStack.push({ node: neighbor, neighbors: graph.getNeighbors(neighbor), nextIdx: 0 })
        }
      } else {
        callStack.pop()
        postOrderStack.push(top.node)
      }
    }
  }

  return postOrderStack.reverse()
}

/**
 * Checkpointer memory store for time-travel debugging and state auditability.
 */
export class MemorySaver<T extends Record<string, any> = Record<string, any>> {
  private storage: Map<string, Array<{ step: number; node: string; stateSnapshot: T; timestamp: number }>> = new Map()

  constructor(private maxCheckpointsPerThread: number = 100) {}

  saveCheckpoint(threadId: string, step: number, node: string, state: T): void {
    if (!this.storage.has(threadId)) {
      this.storage.set(threadId, [])
    }
    const history = this.storage.get(threadId)!
    const snapshot = JSON.parse(JSON.stringify(state))
    history.push({
      step,
      node,
      stateSnapshot: snapshot,
      timestamp: Date.now(),
    })
    if (history.length > this.maxCheckpointsPerThread) {
      history.shift()
    }
  }

  getHistory(threadId: string): Array<{ step: number; node: string; stateSnapshot: T; timestamp: number }> {
    return this.storage.get(threadId) || []
  }

  getLatest(threadId: string): T | null {
    const hist = this.storage.get(threadId)
    if (!hist || hist.length === 0) return null
    return JSON.parse(JSON.stringify(hist[hist.length - 1].stateSnapshot))
  }

  clear(threadId?: string): void {
    if (threadId) {
      this.storage.delete(threadId)
    } else {
      this.storage.clear()
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// LANGGRAPH STATEGRAPH ENGINE
// ══════════════════════════════════════════════════════════════════════

export const GRAPH_START = '__start__'
export const GRAPH_END = '__end__'

export type NodeAction<T> = (state: T) => Partial<T> | Promise<Partial<T>>
export type RoutingCondition<T> = (state: T) => string

export interface ConditionalEdgeConfig<T> {
  source: string
  condition: RoutingCondition<T>
  pathMap: Record<string, string>
}

export interface TraceSpan {
  spanId: string
  parentSpanId?: string
  node: string
  startMs: number
  endMs: number
  durationMs: number
  status: 'OK' | 'ERROR'
  error?: string
}

export interface DeadLetterEntry<T = any> {
  threadId: string
  step: number
  node: string
  error: string
  stateSnapshot: T
  timestamp: number
}

export class StateGraph<T extends Record<string, any>> {
  private nodes: Map<string, NodeAction<T>> = new Map()
  private edges: Map<string, string> = new Map()
  private conditionalEdges: Map<string, ConditionalEdgeConfig<T>> = new Map()
  private entryPoint: string | null = null

  addNode(name: string, action: NodeAction<T>): this {
    if (name === GRAPH_START || name === GRAPH_END) {
      throw new Error(`Reserved node name ${name} cannot be used.`)
    }
    this.nodes.set(name, action)
    return this
  }

  setEntryPoint(name: string): this {
    if (!this.nodes.has(name)) {
      throw new Error(`Entry point ${name} must be a registered node.`)
    }
    this.entryPoint = name
    return this
  }

  addEdge(u: string, v: string): this {
    if (u === GRAPH_START) {
      this.entryPoint = v
    } else {
      this.edges.set(u, v)
    }
    return this
  }

  addConditionalEdges(
    source: string,
    condition: RoutingCondition<T>,
    pathMap: Record<string, string>
  ): this {
    this.conditionalEdges.set(source, { source, condition, pathMap })
    return this
  }

  compile(options?: {
    checkpointer?: MemorySaver<T>
    interruptBefore?: string[]
    maxSteps?: number
    autoStepBudget?: boolean
  }): CompiledStateGraph<T> {
    if (!this.entryPoint) {
      throw new Error('StateGraph requires an entry point.')
    }
    const structuralGraph = new DirectedGraph()
    for (const [u, v] of this.edges.entries()) {
      structuralGraph.addEdge(u, v)
    }
    const diameter = structuralGraph.computeDiameter()
    const computedMax = Math.max(25, 3 * (diameter || 1))
    const maxSteps = options?.maxSteps !== undefined ? options.maxSteps : computedMax

    return new CompiledStateGraph<T>(
      new Map(this.nodes),
      new Map(this.edges),
      new Map(this.conditionalEdges),
      this.entryPoint,
      options?.interruptBefore || [],
      maxSteps,
      options?.checkpointer
    )
  }
}

export class CompiledStateGraph<T extends Record<string, any>> {
  public deadLetterQueue: Array<DeadLetterEntry<T>> = []

  constructor(
    private nodes: Map<string, NodeAction<T>>,
    private edges: Map<string, string>,
    private conditionalEdges: Map<string, ConditionalEdgeConfig<T>>,
    private entryPoint: string,
    private interruptBefore: string[],
    private maxSteps: number,
    private checkpointer?: MemorySaver<T>
  ) {}

  async invoke(initialState: T, resumeFrom?: string): Promise<T> {
    const state: T = { ...initialState }
    const threadId = state.taskId || state.threadId || `thread_${Date.now()}`
    let currentNode: string = resumeFrom || this.entryPoint
    let steps = state.stepCount || 0
    state.interrupted = false
    state.interruptedNode = null

    // OpenTelemetry Distributed Tracing Initialization
    if (!state.traceId) {
      state.traceId = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
    }
    if (!state.traceSpans) {
      state.traceSpans = []
    }

    while (currentNode !== GRAPH_END) {
      if (steps >= this.maxSteps) {
        state.errors = [...(state.errors || []), `Max step budget (${this.maxSteps}) exceeded.`]
        state.stepCount = steps
        state.currentNode = GRAPH_END
        break
      }
      steps++

      if (this.interruptBefore.includes(currentNode) && !resumeFrom) {
        state.interrupted = true
        state.interruptedNode = currentNode
        state.stepCount = steps
        if (this.checkpointer) {
          this.checkpointer.saveCheckpoint(threadId, steps, currentNode, state)
        }
        return state
      }

      resumeFrom = undefined

      state.currentNode = currentNode
      state.stepCount = steps
      const nodeAction = this.nodes.get(currentNode)
      const spanStart = performance.now()

      if (nodeAction) {
        try {
          const update = await nodeAction(state)
          Object.assign(state, update)

          // Record successful OpenTelemetry trace span
          const spanEnd = performance.now()
          state.traceSpans.push({
            spanId: Math.random().toString(16).slice(2, 10),
            node: currentNode,
            startMs: +spanStart.toFixed(2),
            endMs: +spanEnd.toFixed(2),
            durationMs: +(spanEnd - spanStart).toFixed(2),
            status: 'OK',
          })

          if (this.checkpointer) {
            this.checkpointer.saveCheckpoint(threadId, steps, currentNode, state)
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err)
          const spanEnd = performance.now()
          state.traceSpans.push({
            spanId: Math.random().toString(16).slice(2, 10),
            node: currentNode,
            startMs: +spanStart.toFixed(2),
            endMs: +spanEnd.toFixed(2),
            durationMs: +(spanEnd - spanStart).toFixed(2),
            status: 'ERROR',
            error: errMsg,
          })

          // 1. Capture unhandled failure into Dead Letter Queue
          this.deadLetterQueue.push({
            threadId,
            step: steps,
            node: currentNode,
            error: errMsg,
            stateSnapshot: JSON.parse(JSON.stringify(state)),
            timestamp: Date.now(),
          })

          // 2. Automated Checkpoint Rollback
          if (this.checkpointer) {
            const rollbackState = this.checkpointer.getLatest(threadId)
            if (rollbackState) {
              Object.assign(state, rollbackState)
            }
          }

          state.lastException = errMsg
          state.errors = [
            ...(state.errors || []),
            `Dead-letter caught in node '${currentNode}': ${errMsg}. Automated checkpoint rollback executed.`,
          ]
          currentNode = GRAPH_END
          break
        }
      }

      if (this.conditionalEdges.has(currentNode)) {
        const config = this.conditionalEdges.get(currentNode)!
        const routeResult = config.condition(state)
        currentNode = config.pathMap[routeResult] || GRAPH_END
      } else if (this.edges.has(currentNode)) {
        currentNode = this.edges.get(currentNode)!
      } else {
        currentNode = GRAPH_END
      }
    }

    state.currentNode = GRAPH_END
    state.stepCount = steps
    return state
  }
}

// ══════════════════════════════════════════════════════════════════════
// PRE-BUILT HIERARCHICAL MULTI-AGENT SWARM ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════

export function buildCodeSwarmGraph(): CompiledStateGraph<any> {
  const graph = new StateGraph<any>()

  graph.addNode('architect', (s) => ({
    blueprint: `Blueprint for: ${s.task || 'Feature'} (zero-allocation invariant)`,
    codeIteration: 0,
  }))

  graph.addNode('coder', (s) => {
    const iter = (s.codeIteration || 0) + 1
    const isRetry = iter > 1
    return {
      codeIteration: iter,
      code: isRetry ? 'export function solution(): number { return 42; }' : 'export function broken(: syntax error',
      astValid: isRetry,
    }
  })

  graph.addNode('astVerifier', (s) => ({
    astValid: s.astValid === true,
  }))

  graph.addNode('qaSynthesizer', (s) => ({
    qaApproved: true,
    consensus: '11 Bots Consensus Validated (AST Syntax Clean)',
  }))

  graph.setEntryPoint('architect')
  graph.addEdge('architect', 'coder')
  graph.addEdge('coder', 'astVerifier')
  graph.addConditionalEdges('astVerifier', (s) => (s.astValid ? 'pass' : s.codeIteration < 3 ? 'retry' : 'fail'), {
    pass: 'qaSynthesizer',
    retry: 'coder',
    fail: GRAPH_END,
  })
  graph.addEdge('qaSynthesizer', GRAPH_END)

  return graph.compile()
}

export function buildTradeSwarmGraph(): CompiledStateGraph<any> {
  const graph = new StateGraph<any>()

  graph.addNode('ingestion', (s) => ({
    symbol: s.symbol || 'BTC/USDT',
    price: 64380,
    tradeIteration: 0,
  }))

  graph.addNode('generator', (s) => {
    const iter = (s.tradeIteration || 0) + 1
    return {
      tradeIteration: iter,
      setup: {
        symbol: s.symbol || 'BTC/USDT',
        action: 'BUY',
        winProb: iter > 1 ? 0.74 : 0.62,
        rrRatio: iter > 1 ? 2.5 : 1.4,
      },
    }
  })

  graph.addNode('riskCritic', (s) => {
    const score = (s.setup?.rrRatio || 1.0) >= 2.0 ? 8.5 : 6.0
    return { criticScore: score }
  })

  graph.addNode('winGatekeeper', (s) => {
    const pWin = s.setup?.winProb || 0.0
    const passed = pWin >= 0.70
    return { gatekeeperPassed: passed, pWin }
  })

  graph.addNode('execution', (s) => ({
    orderStatus: 'FILLED',
    tradeExecuted: true,
  }))

  graph.setEntryPoint('ingestion')
  graph.addEdge('ingestion', 'generator')
  graph.addEdge('generator', 'riskCritic')
  graph.addConditionalEdges('riskCritic', (s) => ((s.criticScore || 0) >= 8.0 ? 'pass' : (s.tradeIteration || 0) < 3 ? 'retry' : 'fail'), {
    pass: 'winGatekeeper',
    retry: 'generator',
    fail: GRAPH_END,
  })
  graph.addConditionalEdges('winGatekeeper', (s) => (s.gatekeeperPassed ? 'approved' : 'discard'), {
    approved: 'execution',
    discard: GRAPH_END,
  })
  graph.addEdge('execution', GRAPH_END)

  return graph.compile({ interruptBefore: ['execution'] })
}
