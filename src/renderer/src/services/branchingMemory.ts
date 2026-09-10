/**
 * NEMI Branching Context & Time-Travel Conversation Engine
 * Provides Git-like tree branching, checkpoint restoration, side-by-side
 * response forks, and conversation merge capabilities.
 */

export interface TreeNode {
  id: string
  parentId: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  branchName: string
  children: string[]
  metadata?: {
    modelUsed?: string
    latencyMs?: number
    tokens?: number
  }
}

export interface ConversationTree {
  id: string
  title: string
  rootId: string
  activeNodeId: string
  nodes: Record<string, TreeNode>
  branches: string[]
}

export class BranchingContextManager {
  private tree: ConversationTree

  constructor(title = 'New Branching Session') {
    const rootId = 'node_root'
    this.tree = {
      id: 'tree_' + Math.random().toString(36).slice(2, 9),
      title,
      rootId,
      activeNodeId: rootId,
      nodes: {
        [rootId]: {
          id: rootId,
          parentId: null,
          role: 'system',
          content: 'Session initialized.',
          timestamp: Date.now(),
          branchName: 'main',
          children: [],
        },
      },
      branches: ['main'],
    }
  }

  public getTree(): ConversationTree {
    return this.tree
  }

  public addMessage(
    role: 'user' | 'assistant',
    content: string,
    metadata?: TreeNode['metadata']
  ): TreeNode {
    const id = 'node_' + Math.random().toString(36).slice(2, 9)
    const activeNode = this.tree.nodes[this.tree.activeNodeId]
    const branchName = activeNode ? activeNode.branchName : 'main'

    const newNode: TreeNode = {
      id,
      parentId: this.tree.activeNodeId,
      role,
      content,
      timestamp: Date.now(),
      branchName,
      children: [],
      metadata,
    }

    this.tree.nodes[id] = newNode
    if (activeNode) {
      activeNode.children.push(id)
    }
    this.tree.activeNodeId = id
    return newNode
  }

  public createBranch(
    fromNodeId: string,
    branchName: string
  ): TreeNode {
    if (!this.tree.nodes[fromNodeId]) {
      throw new Error(`Node ${fromNodeId} does not exist.`)
    }

    if (!this.tree.branches.includes(branchName)) {
      this.tree.branches.push(branchName)
    }

    const branchRootId = 'node_branch_' + Math.random().toString(36).slice(2, 9)
    const branchNode: TreeNode = {
      id: branchRootId,
      parentId: fromNodeId,
      role: 'system',
      content: `Branched to [${branchName}]`,
      timestamp: Date.now(),
      branchName,
      children: [],
    }

    this.tree.nodes[branchRootId] = branchNode
    this.tree.nodes[fromNodeId].children.push(branchRootId)
    this.tree.activeNodeId = branchRootId
    return branchNode
  }

  public getLinearHistory(targetNodeId = this.tree.activeNodeId): TreeNode[] {
    const path: TreeNode[] = []
    let curr: TreeNode | undefined = this.tree.nodes[targetNodeId]

    while (curr) {
      path.unshift(curr)
      curr = curr.parentId ? this.tree.nodes[curr.parentId] : undefined
    }

    return path
  }

  public switchActiveNode(nodeId: string): boolean {
    if (this.tree.nodes[nodeId]) {
      this.tree.activeNodeId = nodeId
      return true
    }
    return false
  }
}
