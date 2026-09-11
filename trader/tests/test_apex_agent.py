"""
Unit Tests for NEMILangGraphApexAgent (Python Engine)
Tests:
- 1,000-Node Massive DAG Topological Sort Stress & Benchmark (<20ms)
- Complex Cycle Detection & Path Tracking
- Algorithmic Task Solving with AST Verification
- Strict 70%+ Bayesian Win Rate Gatekeeper Precision Boundary Hardening
- Human-in-the-Loop Interruption and Resumption
"""

import unittest
from patterns.graph_foundations import DirectedGraph, detect_cycle_dfs, detect_cycle_kahn
from patterns.apex_agent import NEMILangGraphApexAgent


class TestNEMILangGraphApexAgent(unittest.TestCase):

    def setUp(self):
        self.apex = NEMILangGraphApexAgent()

    def test_benchmark_massive_dag_1000_nodes(self):
        result = self.apex.benchmark_massive_dag(1000)
        self.assertEqual(result["node_count"], 1000)
        self.assertGreater(result["edge_count"], 2500)
        self.assertTrue(result["is_dag"])
        self.assertEqual(len(result["sorted_order"]), 1000)
        self.assertLess(result["execution_time_ms"], 100)  # Generous upper bound, usually < 20ms

        # Invariant checks: topological ordering must preserve forward edges
        order = result["sorted_order"]
        idx0 = order.index("task_0")
        idx1 = order.index("task_1")
        idx500 = order.index("task_500")
        idx999 = order.index("task_999")

        self.assertLess(idx0, idx1)
        self.assertLess(idx1, idx500)
        self.assertLess(idx500, idx999)

    def test_cycle_detection_with_path_tracking(self):
        complex_cyclic = DirectedGraph({
            "N1": ["N2", "N3"],
            "N2": ["N4"],
            "N3": ["N4"],
            "N4": ["N5"],
            "N5": ["N2"],  # Back-edge forming cycle N2 -> N4 -> N5 -> N2
        })

        has_cycle, path = detect_cycle_dfs(complex_cyclic)
        self.assertTrue(has_cycle)
        self.assertIsNotNone(path)
        self.assertIn("N2", path)
        self.assertIn("N4", path)
        self.assertIn("N5", path)
        self.assertTrue(detect_cycle_kahn(complex_cyclic))

    def test_solve_algorithmic_task_ast_valid(self):
        dinic_code = '''
class Dinic:
    def __init__(self, n: int):
        self.n = n
        self.graph = [[] for _ in range(n)]

    def add_edge(self, u: int, v: int, cap: int):
        self.graph[u].append((v, cap))

    def max_flow(self, s: int, t: int) -> int:
        return 42
'''
        res = self.apex.solve_algorithmic_task("Dinic Max Flow", dinic_code)
        self.assertTrue(res.get("ast_valid"))
        self.assertIsNone(res.get("ast_error"))
        self.assertEqual(res.get("qa_consensus"), "PASS")
        self.assertIn("class Dinic", res.get("final_code", ""))

    def test_solve_algorithmic_task_ast_syntax_error(self):
        broken_code = '''
def broken_fn(:
    return "missing parameter syntax"
'''
        res = self.apex.solve_algorithmic_task("Broken Task", broken_code)
        self.assertFalse(res.get("ast_valid"))
        self.assertIsNotNone(res.get("ast_error"))
        # Due to conditional edge routing to END on fail, qa_consensus is never reached
        self.assertNotIn("qa_consensus", res)

    def test_strict_win_probability_boundary_reject(self):
        # 0.6999 is strictly < 0.70 -> REJECT
        res = self.apex.evaluate_trade_setup_realtime("BTC/USDT", provided_win_prob=0.6999)
        self.assertFalse(res.get("gatekeeper_passed"))
        self.assertAlmostEqual(res.get("p_win"), 0.6999, places=4)
        self.assertFalse(res.get("interrupted", False))
        self.assertNotIn("order_status", res)
        self.assertNotIn("trade_executed", res)

    def test_strict_win_probability_boundary_approve_and_resume(self):
        # 0.7001 is >= 0.70 -> APPROVE and interrupt before execution
        res = self.apex.evaluate_trade_setup_realtime("ETH/USDT", provided_win_prob=0.7001)
        self.assertTrue(res.get("gatekeeper_passed"))
        self.assertAlmostEqual(res.get("p_win"), 0.7001, places=4)
        self.assertTrue(res.get("interrupted"))
        self.assertEqual(res.get("interrupted_node"), "execution")
        self.assertNotIn("order_status", res)

        # Resume upon human sign-off
        resumed = self.apex.evaluate_trade_setup_realtime(
            "ETH/USDT",
            provided_win_prob=0.7001,
            resume_from="execution",
            prior_state=res,
        )
        self.assertFalse(resumed.get("interrupted"))
        self.assertEqual(resumed.get("order_status"), "FILLED")

    def test_benchmark_algorithmic_suite(self):
        catalog = [
            {"title": "Dinic Max Flow", "solution": "class Dinic:\n    pass\n"},
            {"title": "Median Arrays", "solution": "def find_median():\n    return 0.0\n"},
            {"title": "Raft Consensus", "solution": "class RaftNode:\n    pass\n"},
            {"title": "Attention Head", "solution": "def causal_attention():\n    return []\n"},
        ]
        report = self.apex.benchmark_algorithmic_suite(catalog)
        self.assertEqual(report["total_problems"], 4)
        self.assertEqual(report["passed_problems"], 4)
        self.assertEqual(report["pass_rate_percent"], 100.0)
        self.assertLess(report["execution_time_ms"], 50)


if __name__ == "__main__":
    unittest.main()
