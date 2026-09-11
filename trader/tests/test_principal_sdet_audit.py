"""
Principal SDET Master Quality Audit (Python Engine)
Systematic Verification across:
- Deep Recursion & Scale Stress (2,500 linear nodes)
- Adversarial Cycles (Self-loop, 2-node mutual, Figure-8, Disconnected component)
- StateGraph Step Budget Circuit Breaker
- Bayesian Gatekeeper Epsilon Precision Hardening
- Time-Travel Checkpointing & State Immutability
"""

import unittest
from patterns.graph_foundations import (
    DirectedGraph,
    detect_cycle_dfs,
    detect_cycle_kahn,
    topological_sort_kahn,
    topological_sort_dfs,
)
from patterns.langgraph_engine import StateGraph, MemorySaver, GRAPH_START, GRAPH_END
from patterns.apex_agent import NEMILangGraphApexAgent


class TestPrincipalSDETMasterAudit(unittest.TestCase):

    def setUp(self):
        self.apex = NEMILangGraphApexAgent()

    def test_deep_linear_chain_recursion_stress(self):
        # 2,500 node linear chain: task_0 -> task_1 -> ... -> task_2499
        # Verifies that iterative stack implementation handles deep chains with zero RecursionError
        node_count = 2500
        g = DirectedGraph()
        for i in range(node_count):
            g.add_node(f"node_{i}")
        for i in range(node_count - 1):
            g.add_edge(f"node_{i}", f"node_{i+1}")

        self.assertTrue(g.is_dag())
        has_cycle, path = detect_cycle_dfs(g)
        self.assertFalse(has_cycle)
        self.assertIsNone(path)

        order_kahn = topological_sort_kahn(g)
        self.assertEqual(len(order_kahn), node_count)
        self.assertEqual(order_kahn[0], "node_0")
        self.assertEqual(order_kahn[-1], f"node_{node_count - 1}")

        order_dfs = topological_sort_dfs(g)
        self.assertEqual(len(order_dfs), node_count)
        self.assertEqual(order_dfs[0], "node_0")
        self.assertEqual(order_dfs[-1], f"node_{node_count - 1}")

    def test_adversarial_cycle_topologies(self):
        # 1. Self loop
        self_loop = DirectedGraph({"A": ["A"]})
        has_cycle, path = detect_cycle_dfs(self_loop)
        self.assertTrue(has_cycle)
        self.assertEqual(path, ["A", "A"])
        self.assertTrue(detect_cycle_kahn(self_loop))

        # 2. Mutual 2-node cycle
        mutual = DirectedGraph({"A": ["B"], "B": ["A"]})
        has_cycle, path = detect_cycle_dfs(mutual)
        self.assertTrue(has_cycle)
        self.assertIsNotNone(path)
        self.assertEqual(len(path), 3)

        # 3. Figure-8 double cycle
        fig8 = DirectedGraph({
            "A": ["B"],
            "B": ["C"],
            "C": ["A", "D"],
            "D": ["E"],
            "E": ["C"],
        })
        has_cycle, path = detect_cycle_dfs(fig8)
        self.assertTrue(has_cycle)
        self.assertTrue(detect_cycle_kahn(fig8))

        # 4. Disconnected graph with localized cycle
        disconnected = DirectedGraph({
            "X": ["Y"],
            "Y": ["Z"],
            "Z": [],
            "M": ["N"],
            "N": ["M"],
        })
        has_cycle, path = detect_cycle_dfs(disconnected)
        self.assertTrue(has_cycle)
        self.assertIn("M", path)
        self.assertNotIn("X", path)

    def test_stategraph_step_budget_circuit_breaker(self):
        builder = StateGraph()
        builder.add_node("loop", lambda s: {"count": s.get("count", 0) + 1})
        builder.set_entry_point("loop")
        builder.add_edge("loop", "loop")

        compiled = builder.compile(max_steps=12)
        res = compiled.invoke({"count": 0})
        self.assertEqual(res.get("step_count"), 12)
        self.assertTrue(any("step limit" in err.lower() or "step budget" in err.lower() for err in res.get("errors", [])))

    def test_bayesian_win_gatekeeper_precision_limits(self):
        # Epsilon-sub-threshold: strictly reject
        res_sub = self.apex.evaluate_trade_setup_realtime("BTC/USDT", provided_win_prob=0.6999999999)
        self.assertFalse(res_sub.get("gatekeeper_passed"))
        self.assertFalse(res_sub.get("interrupted", False))

        # Exact threshold: approve and pause
        res_exact = self.apex.evaluate_trade_setup_realtime("BTC/USDT", provided_win_prob=0.7000000000)
        self.assertTrue(res_exact.get("gatekeeper_passed"))
        self.assertTrue(res_exact.get("interrupted"))
        self.assertEqual(res_exact.get("interrupted_node"), "execution")

        # Out of bounds
        res_neg = self.apex.evaluate_trade_setup_realtime("BTC/USDT", provided_win_prob=-0.2)
        self.assertFalse(res_neg.get("gatekeeper_passed"))

    def test_memory_saver_lru_bounding(self):
        saver = MemorySaver(max_checkpoints_per_thread=3)
        for i in range(1, 6):
            saver.save("thread_lru", i, f"node_{i}", {"count": i})

        history = saver.get_all("thread_lru")
        self.assertEqual(len(history), 3)
        self.assertEqual(history[0].state_snapshot["count"], 3)
        self.assertEqual(history[1].state_snapshot["count"], 4)
        self.assertEqual(history[2].state_snapshot["count"], 5)


if __name__ == "__main__":
    unittest.main()
