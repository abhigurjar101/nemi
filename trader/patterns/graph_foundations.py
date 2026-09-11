"""
Graph Foundations for DAG-Based Multi-Agent Systems
Implements formal graph data structures and algorithms based on
Graph Foundations for DAG-Based Systems:
- Directed Graph representations (Adjacency Lists, In/Out-Degrees)
- Traversal Engines: Depth-First Search (DFS) & Breadth-First Search (BFS)
- Dual Cycle Detection: DFS Recursion Path Tracking & Kahn In-Degree Method
- Deterministic Topological Sorting: Kahn's Algorithm & DFS Post-Order Reversal
- State Flow Transition Modeling for Agent Execution Pipelines
"""

import sys
from collections import deque
from typing import Dict, List, Set, Optional, Tuple, Any

# Ensure generous recursion limit for deep recursion graphs if needed
if sys.getrecursionlimit() < 50000:
    sys.setrecursionlimit(50000)


class DirectedGraph:
    """
    Formal Directed Graph representation using adjacency list dictionary.
    Nodes represent tasks, agents, or system states.
    Directed edges represent execution dependencies ('must happen before') or state transitions.
    """

    def __init__(self, adjacency_dict: Optional[Dict[str, List[str]]] = None):
        self._adj: Dict[str, List[str]] = {}
        if adjacency_dict:
            for node, neighbors in adjacency_dict.items():
                self.add_node(node)
                for neighbor in neighbors:
                    self.add_edge(node, neighbor)

    def add_node(self, node: str) -> None:
        if node not in self._adj:
            self._adj[node] = []

    def add_edge(self, u: str, v: str) -> None:
        self.add_node(u)
        self.add_node(v)
        if v not in self._adj[u]:
            self._adj[u].append(v)

    def get_nodes(self) -> List[str]:
        return list(self._adj.keys())

    def get_neighbors(self, node: str) -> List[str]:
        return self._adj.get(node, [])

    def get_adjacency_dict(self) -> Dict[str, List[str]]:
        return {node: list(neighbors) for node, neighbors in self._adj.items()}

    def in_degrees(self) -> Dict[str, int]:
        """Calculates in-degree (number of incoming edges / prerequisites) for each node."""
        indeg = {node: 0 for node in self._adj}
        for u in self._adj:
            for v in self._adj[u]:
                indeg[v] += 1
        return indeg

    def out_degrees(self) -> Dict[str, int]:
        """Calculates out-degree for each node."""
        return {node: len(neighbors) for node, neighbors in self._adj.items()}

    def is_dag(self) -> bool:
        """Returns True if the graph is a Directed Acyclic Graph (DAG)."""
        has_cycle, _ = detect_cycle_dfs(self)
        return not has_cycle

    def compute_diameter(self) -> int:
        """Computes the maximum topological depth (longest dependency path)."""
        dist: Dict[str, int] = {node: 0 for node in self._adj}
        has_cycle, _ = detect_cycle_dfs(self)
        order = topological_sort_kahn(self) if not has_cycle else list(self._adj.keys())
        max_dist = 0

        for u in order:
            u_dist = dist.get(u, 0)
            for v in self.get_neighbors(u):
                if u_dist + 1 > dist.get(v, 0):
                    dist[v] = u_dist + 1
                    if dist[v] > max_dist:
                        max_dist = dist[v]
        return max_dist


class BitmaskDAG:
    """
    Zero-Allocation Bitmask DAG for Ultra-Low Latency High-Frequency Trading.
    Maps node names to contiguous integer indices (0..N-1) using integer bitmasks.
    """

    def __init__(self, nodes: Optional[List[str]] = None):
        self._node_to_idx: Dict[str, int] = {}
        self._idx_to_node: List[str] = []
        self._adj_bits: List[int] = []
        if nodes:
            for n in nodes:
                self.add_node(n)

    def add_node(self, node: str) -> int:
        if node in self._node_to_idx:
            return self._node_to_idx[node]
        idx = len(self._idx_to_node)
        self._node_to_idx[node] = idx
        self._idx_to_node.append(node)
        self._adj_bits.append(0)
        return idx

    def add_edge(self, u: str, v: str) -> None:
        u_idx = self.add_node(u)
        v_idx = self.add_node(v)
        self._adj_bits[u_idx] |= (1 << v_idx)

    def has_edge(self, u: str, v: str) -> bool:
        u_idx = self._node_to_idx.get(u)
        v_idx = self._node_to_idx.get(v)
        if u_idx is None or v_idx is None:
            return False
        return bool(self._adj_bits[u_idx] & (1 << v_idx))

    def size(self) -> int:
        return len(self._idx_to_node)


def dfs_traversal(graph: DirectedGraph, start_node: str) -> List[str]:
    """
    Depth-First Search (DFS) traversal with visited tracking.
    Explores one path deeply before backtracking.
    Resembles deep cognitive reasoning and recursive task expansion.
    Enterprise iterative implementation supporting arbitrary recursion depth.
    """
    visited: Set[str] = set()
    order: List[str] = []

    if start_node not in graph.get_nodes():
        return order

    stack = [start_node]
    while stack:
        node = stack.pop()
        if node not in visited:
            visited.add(node)
            order.append(node)
            for neighbor in reversed(graph.get_neighbors(node)):
                if neighbor not in visited:
                    stack.append(neighbor)

    return order


def bfs_traversal(graph: DirectedGraph, start_node: str) -> List[str]:
    """
    Breadth-First Search (BFS) traversal using double-ended queue.
    Explores all immediate neighbors layer-by-layer before moving deeper.
    Resembles broad / parallel agent exploration.
    """
    visited: Set[str] = set()
    order: List[str] = []
    queue: deque = deque([start_node])

    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            order.append(node)
            for neighbor in graph.get_neighbors(node):
                if neighbor not in visited:
                    queue.append(neighbor)

    return order


def detect_cycle_dfs(graph: DirectedGraph) -> Tuple[bool, Optional[List[str]]]:
    """
    Cycle detection via DFS Recursion Path Tracking (Chapter 5.6).
    Maintains:
      - visited: nodes already processed across all components
      - path: nodes currently in the active traversal stack
      - path_stack: ordered list of nodes in current path for exact cycle reconstruction
    Returns (True, cycle_path) if a cycle exists, or (False, None) if acyclic.
    Enterprise iterative stack implementation supporting arbitrary depth without RecursionError.
    """
    visited: Set[str] = set()
    path: Set[str] = set()
    path_stack: List[str] = []

    for start_node in graph.get_nodes():
        if start_node in visited:
            continue

        # Stack holds tuples of (node, iterator_over_neighbors)
        stack = [(start_node, iter(graph.get_neighbors(start_node)))]
        visited.add(start_node)
        path.add(start_node)
        path_stack.append(start_node)

        while stack:
            curr_node, neighbors_iter = stack[-1]
            try:
                neighbor = next(neighbors_iter)
                if neighbor in path:
                    # Back-edge detected! Reconstruct the cycle
                    cycle_start_idx = path_stack.index(neighbor)
                    return True, path_stack[cycle_start_idx:] + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    path.add(neighbor)
                    path_stack.append(neighbor)
                    stack.append((neighbor, iter(graph.get_neighbors(neighbor))))
            except StopIteration:
                stack.pop()
                path.remove(curr_node)
                path_stack.pop()

    return False, None


def detect_cycle_kahn(graph: DirectedGraph) -> bool:
    """
    Alternative cycle detection via Kahn's In-Degree elimination (Chapter 5.8).
    Progressively eliminates nodes with in-degree == 0.
    If nodes remain that cannot be eliminated, a cycle is present.
    Returns True if cycle exists, False if acyclic.
    """
    in_degree = graph.in_degrees()
    queue = deque([node for node, deg in in_degree.items() if deg == 0])
    eliminated_count = 0

    while queue:
        node = queue.popleft()
        eliminated_count += 1
        for neighbor in graph.get_neighbors(node):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return eliminated_count != len(graph.get_nodes())


def topological_sort_kahn(graph: DirectedGraph) -> List[str]:
    """
    Topological Sorting via Kahn's Algorithm (In-Degree Method - Chapter 6.7).
    Guarantees that for every directed dependency A -> B, task A executes before task B.
    Raises ValueError if a cycle is detected.
    """
    in_degree = graph.in_degrees()
    queue = deque([node for node, deg in in_degree.items() if deg == 0])
    order: List[str] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph.get_neighbors(node):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(graph.get_nodes()):
        raise ValueError("Graph contains circular dependencies (cycles); topological ordering impossible.")

    return order


def topological_sort_dfs(graph: DirectedGraph) -> List[str]:
    """
    Topological Sorting via DFS Post-Order Stack Reversal (Chapter 6.9).
    Traverses to terminal leaf nodes and appends nodes to stack upon backtrack.
    The reversed stack yields a valid topological order.
    Enterprise iterative implementation supporting arbitrary recursion depth.
    """
    has_cycle, cycle_path = detect_cycle_dfs(graph)
    if has_cycle:
        raise ValueError(f"Graph contains circular dependencies: {cycle_path}")

    visited: Set[str] = set()
    post_order_stack: List[str] = []

    for start_node in graph.get_nodes():
        if start_node in visited:
            continue

        call_stack = [(start_node, iter(graph.get_neighbors(start_node)))]
        visited.add(start_node)

        while call_stack:
            curr_node, neighbors_iter = call_stack[-1]
            try:
                neighbor = next(neighbors_iter)
                if neighbor not in visited:
                    visited.add(neighbor)
                    call_stack.append((neighbor, iter(graph.get_neighbors(neighbor))))
            except StopIteration:
                call_stack.pop()
                post_order_stack.append(curr_node)

    return post_order_stack[::-1]


class StateFlow:
    """
    State Flow Engine for Agent Systems (Chapter 7.8 & 8.6).
    Enforces that execution moves forward deterministically across states:
      Input State -> Processing -> Decision/Branching -> Output State
    Guarantees no backward repetitions in acyclic pipelines.
    """

    def __init__(self, dag: DirectedGraph):
        if not dag.is_dag():
            raise ValueError("StateFlow requires a valid Directed Acyclic Graph (DAG).")
        self.dag = dag
        self.execution_order = topological_sort_kahn(dag)
        self.state_history: List[Dict[str, Any]] = []

    def execute_flow(self, initial_state: Dict[str, Any], node_callables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the state flow in topological order, transforming the state monotonically.
        """
        current_state = dict(initial_state)
        self.state_history = [dict(current_state)]

        for node in self.execution_order:
            fn = node_callables.get(node)
            if fn:
                update = fn(current_state)
                if isinstance(update, dict):
                    current_state.update(update)
            current_state["_current_node"] = node
            self.state_history.append(dict(current_state))

        return current_state
