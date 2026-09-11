"""
Unit Tests for Graph Foundations and LangGraph Multi-Agent Engine
Verifies:
- DFS & BFS Traversals
- Cycle Detection via DFS Path Tracking & Kahn's In-Degree Elimination
- Topological Sorting (Kahn's Algorithm & DFS Stack Reversal)
- StateFlow Execution
- LangGraph StateGraph Compilation & Conditional Routing
- Self-Healing Cyclical Loops
- Strict 70%+ Bayesian Win Probability Gatekeeper
- Hierarchical Super-Orchestrator
"""

import unittest
from patterns.graph_foundations import (
    DirectedGraph,
    dfs_traversal,
    bfs_traversal,
    detect_cycle_dfs,
    detect_cycle_kahn,
    topological_sort_kahn,
    topological_sort_dfs,
    StateFlow,
)
from patterns.langgraph_engine import (
    StateGraph,
    START,
    END,
    MemorySaver,
    create_code_swarm_subgraph,
    create_trade_swarm_subgraph,
    HierarchicalSuperOrchestrator,
)


class TestGraphFoundations(unittest.TestCase):

    def setUp(self):
        # The canonical cooking workflow from the reference textbook:
        # Get Bread -> Add Butter -> Sandwich Ready
        # Boil Water -> Add Tea Leaves -> Tea Ready
        # Sandwich Ready -> Serve Meal; Tea Ready -> Serve Meal
        self.cooking_dag = DirectedGraph({
            "Get Bread": ["Add Butter"],
            "Add Butter": ["Sandwich Ready"],
            "Boil Water": ["Add Tea Leaves"],
            "Add Tea Leaves": ["Tea Ready"],
            "Sandwich Ready": ["Serve Meal"],
            "Tea Ready": ["Serve Meal"],
            "Serve Meal": [],
        })

        # Cyclic graph from Chapter 4 & 5
        self.cyclic_graph = DirectedGraph({
            "A": ["B"],
            "B": ["C"],
            "C": ["A"],
        })

    def test_graph_degrees(self):
        indeg = self.cooking_dag.in_degrees()
        self.assertEqual(indeg["Get Bread"], 0)
        self.assertEqual(indeg["Boil Water"], 0)
        self.assertEqual(indeg["Serve Meal"], 2)

    def test_dfs_and_bfs_traversal(self):
        dfs_order = dfs_traversal(self.cooking_dag, "Get Bread")
        self.assertIn("Get Bread", dfs_order)
        self.assertIn("Add Butter", dfs_order)
        self.assertIn("Sandwich Ready", dfs_order)
        self.assertIn("Serve Meal", dfs_order)

        bfs_order = bfs_traversal(self.cooking_dag, "Get Bread")
        self.assertEqual(bfs_order[0], "Get Bread")

    def test_cycle_detection_dfs_and_kahn(self):
        # Acyclic test
        has_cycle_dfs, cycle_path = detect_cycle_dfs(self.cooking_dag)
        self.assertFalse(has_cycle_dfs)
        self.assertIsNone(cycle_path)
        self.assertFalse(detect_cycle_kahn(self.cooking_dag))

        # Cyclic test
        has_cycle_dfs, cycle_path = detect_cycle_dfs(self.cyclic_graph)
        self.assertTrue(has_cycle_dfs)
        self.assertIsNotNone(cycle_path)
        self.assertTrue(detect_cycle_kahn(self.cyclic_graph))

    def test_topological_sorting_kahn(self):
        order = topological_sort_kahn(self.cooking_dag)
        self.assertEqual(len(order), 7)
        # Verify dependency order
        self.assertLess(order.index("Get Bread"), order.index("Add Butter"))
        self.assertLess(order.index("Add Butter"), order.index("Sandwich Ready"))
        self.assertLess(order.index("Sandwich Ready"), order.index("Serve Meal"))
        self.assertLess(order.index("Boil Water"), order.index("Add Tea Leaves"))
        self.assertLess(order.index("Add Tea Leaves"), order.index("Tea Ready"))
        self.assertLess(order.index("Tea Ready"), order.index("Serve Meal"))

    def test_topological_sorting_dfs(self):
        order = topological_sort_dfs(self.cooking_dag)
        self.assertEqual(len(order), 7)
        self.assertLess(order.index("Get Bread"), order.index("Serve Meal"))

    def test_topological_sort_raises_on_cycle(self):
        with self.assertRaises(ValueError):
            topological_sort_kahn(self.cyclic_graph)

    def test_state_flow_execution(self):
        dag = DirectedGraph({
            "Input": ["Process"],
            "Process": ["Analyze"],
            "Analyze": ["Output"],
            "Output": [],
        })
        flow = StateFlow(dag)
        callables = {
            "Input": lambda s: {"val": 10},
            "Process": lambda s: {"val": s["val"] * 2},
            "Analyze": lambda s: {"val": s["val"] + 5},
            "Output": lambda s: {"status": "COMPLETE"},
        }
        final = flow.execute_flow({}, callables)
        self.assertEqual(final["val"], 25)
        self.assertEqual(final["status"], "COMPLETE")


class TestLangGraphEngine(unittest.TestCase):

    def test_code_swarm_self_healing_loop(self):
        code_swarm = create_code_swarm_subgraph()
        res = code_swarm.invoke({"task": "Develop fast matrix multiplication"})
        self.assertTrue(res.get("qa_approved"))
        self.assertTrue(res.get("ast_valid"))
        # Verify it self-healed in 2 iterations
        self.assertEqual(res.get("code_iteration"), 2)
        self.assertIn("execute_solution", res.get("final_code", ""))

    def test_trade_swarm_gatekeeper_and_human_in_loop(self):
        trade_swarm = create_trade_swarm_subgraph()
        # Initial run: should pause at interrupt_before=['execution']
        res = trade_swarm.invoke({"symbol": "BTC/USDT"})
        self.assertTrue(res.get("interrupted"))
        self.assertEqual(res.get("interrupted_node"), "execution")
        self.assertTrue(res.get("gatekeeper_passed"))
        self.assertGreaterEqual(res.get("p_win"), 0.70)

        # Resume execution (simulate human approving trade)
        res_after = trade_swarm.invoke(res, resume_from="execution")
        self.assertFalse(res_after.get("interrupted"))
        self.assertTrue(res_after.get("trade_executed"))
        self.assertEqual(res_after.get("order_status"), "FILLED")

    def test_hierarchical_super_orchestrator(self):
        orchestrator = HierarchicalSuperOrchestrator()

        # Route Code task
        code_out = orchestrator.route_and_execute("Code optimization", {"task": "Refactor pipeline"})
        self.assertEqual(code_out["_swarm_executed"], "CODE_SWARM")
        self.assertTrue(code_out["qa_approved"])

        # Route Trade task
        trade_out = orchestrator.route_and_execute("Trade analysis for SOL", {"symbol": "SOL/USDT"})
        self.assertEqual(trade_out["_swarm_executed"], "TRADE_SWARM")
        self.assertTrue(trade_out["gatekeeper_passed"])


if __name__ == "__main__":
    unittest.main()
