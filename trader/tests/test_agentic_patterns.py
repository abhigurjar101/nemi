"""
Comprehensive Test Suite for Reasoning-Driven Retrieval (Agentic RAG),
Model Context Protocol (MCP), and Composed Agent Design Patterns.

Validates:
  1. ReasoningRetriever 6-stage loop, hop/step budgets, reformulation guard, cost circuit breaker
  2. Generator + Critic + Verifier composed cascade with strict 70%+ gatekeeper
  3. ReflexiveMemory cross-run persistence and empirical prior adjustment
  4. Model Context Protocol (MCP) JSON-RPC 2.0 specification (tools, resources, prompts)
  5. FastAPI REST & Webhook endpoints
"""
import unittest
import json
import os
import shutil
from patterns.state import (
    RetrievalChunk,
    RetrievalState,
    SelectedEvidence,
    CriticFeedback,
    VerifierResult,
)
from patterns.agentic_rag import ReasoningRetriever, jaccard_token_similarity
from patterns.cascade import (
    TradeGenerator,
    TradeCritic,
    TradeVerifier,
    ComposedTradingCascade,
)
from patterns.reflexive_memory import ReflexiveMemory
from mcp.server import TradingMCPServer
from fastapi.testclient import TestClient
from server import app


class TestReasoningDrivenRetrieval(unittest.TestCase):
    def setUp(self):
        # Mock retriever returning domain-specific chunks
        def mock_retriever(query: str):
            q = query.lower()
            if "technical" in q or "momentum" in q:
                return [
                    RetrievalChunk(id="c1", content="AAPL RSI is at 52.4 with MACD histogram crossing above signal line.", source="technical_feed", score=0.88),
                    RetrievalChunk(id="c2", content="AAPL 20 EMA is trending above 50 EMA showing healthy upward continuation.", source="technical_feed", score=0.82),
                ]
            elif "sentiment" in q or "news" in q:
                return [
                    RetrievalChunk(id="c3", content="Institutional analysts raised target price citing AI cloud ecosystem growth.", source="news_wire", score=0.85),
                ]
            elif "fundamental" in q or "valuation" in q:
                return [
                    RetrievalChunk(id="c4", content="Trailing P/E ratio is 28.5 with gross profit margin expanding to 45.2%.", source="sec_10k", score=0.90),
                ]
            else:
                return [
                    RetrievalChunk(id="c5", content="General market environment remains in risk-on regime with expanding liquidity.", source="macro_feed", score=0.75),
                ]
        self.mock_tool = mock_retriever

    def test_reasoning_retriever_multi_hop_sufficiency(self):
        """Reasoning-driven loop iterates across hypotheses and terminates on sufficiency."""
        retriever = ReasoningRetriever(retrieval_tool=self.mock_tool, max_hops=4, max_steps=6)
        state = retriever.execute(goal="Evaluate AAPL technical momentum and fundamental valuation")

        self.assertTrue(state.terminated)
        self.assertGreaterEqual(state.hops_used, 1)
        self.assertLessEqual(state.hops_used, 4)
        self.assertGreaterEqual(len(state.evidence), 2)
        self.assertIn("sufficiency", state.termination_reason.lower())
        self.assertGreater(len(state.hop_trace), 0)

        # Evidence must be trusted subset, not raw chunk dumping
        for ev in state.evidence:
            self.assertIsInstance(ev, SelectedEvidence)
            self.assertTrue(len(ev.text) >= 20)

    def test_reformulation_distance_guard(self):
        """Reformulation distance guard detects near-duplicate queries and stops loops."""
        sim = jaccard_token_similarity("AAPL technical breakout momentum", "AAPL technical momentum breakout")
        self.assertGreaterEqual(sim, 0.85)

        # Static tool that returns nothing new to force loop
        retriever = ReasoningRetriever(retrieval_tool=lambda q: [], max_hops=5, similarity_cutoff=0.80)
        state = retriever.execute(goal="AAPL stagnant loop check")
        self.assertTrue(state.terminated)

    def test_hop_budget_circuit_breaker(self):
        """Retriever strictly respects max_hops cap to prevent runaway token expenditure."""
        retriever = ReasoningRetriever(retrieval_tool=lambda q: [], max_hops=2, max_steps=5)
        state = retriever.execute(goal="AAPL impossible search without results")
        self.assertTrue(state.terminated)
        self.assertLessEqual(state.hops_used, 2)
        self.assertIn("budget", state.termination_reason.lower())

    def test_cost_circuit_breaker(self):
        """Token cost circuit breaker trips when token budget is exhausted."""
        def large_chunk_retriever(q: str):
            return [RetrievalChunk(id=f"big_{i}", content="word " * 600, source="heavy_source") for i in range(3)]

        retriever = ReasoningRetriever(retrieval_tool=large_chunk_retriever, max_hops=5, token_budget=500)
        state = retriever.execute(goal="AAPL heavy tokens")
        self.assertTrue(state.terminated)
        self.assertTrue(state.circuit_breaker_tripped)


class TestComposedAgentCascades(unittest.TestCase):
    def setUp(self):
        self.cascade = ComposedTradingCascade(min_win_probability=0.70, critic_threshold=8.0)

    def test_critic_revision_loop_and_threshold(self):
        """Critic evaluates subjective quality and suggestions (0-10 score scale)."""
        critic = TradeCritic(pass_threshold=8.0, max_revisions=3)
        # Sub-optimal setup: low win probability and tight 1:1 risk-reward
        setup_weak = {
            "symbol": "AAPL",
            "price": 100.0,
            "stop_price": 95.0,
            "target_price": 105.0,
            "risk_reward_ratio": 1.0,
            "win_probability": 0.52,
            "tech_score": 0.1,
            "sent_score": -0.2,
            "fund_score": 0.0,
        }
        feedback = critic.critique(setup_weak)
        self.assertFalse(feedback.passed)
        self.assertLess(feedback.score, 8.0)
        self.assertGreater(len(feedback.suggestions), 0)

        # Strong setup: favorable RR and high win probability
        setup_strong = {
            "symbol": "AAPL",
            "price": 100.0,
            "stop_price": 97.0,
            "target_price": 108.0,
            "risk_reward_ratio": 2.67,
            "win_probability": 0.78,
            "tech_score": 0.8,
            "sent_score": 0.6,
            "fund_score": 0.7,
        }
        feedback_strong = critic.critique(setup_strong)
        self.assertTrue(feedback_strong.passed)
        self.assertGreaterEqual(feedback_strong.score, 8.0)

    def test_verifier_pass_fail_strictly_enforces_70_percent(self):
        """Verifier acts as objective security gatekeeper; never rewrites."""
        verifier = TradeVerifier(min_win_probability=0.70)

        # Setup with 68% win prob -> Strictly rejected!
        setup_68 = {
            "symbol": "AAPL",
            "signal": "BUY",
            "price": 150.0,
            "stop_price": 145.0,
            "target_price": 162.0,
            "win_probability": 0.68,
        }
        res_68 = verifier.verify(setup_68)
        self.assertFalse(res_68.passed)
        self.assertIn("STRICT GATEKEEPER VIOLATION", " ".join(res_68.violations))

        # Setup with 75% win prob -> Passed!
        setup_75 = {
            "symbol": "AAPL",
            "signal": "BUY",
            "price": 150.0,
            "stop_price": 145.0,
            "target_price": 162.0,
            "win_probability": 0.75,
        }
        res_75 = verifier.verify(setup_75)
        self.assertTrue(res_75.passed)
        self.assertEqual(len(res_75.violations), 0)

    def test_composed_cascade_full_pipeline(self):
        """Generator + Critic + Verifier cascade end-to-end execution."""
        result = self.cascade.execute(
            symbol="MSFT",
            technical_data={"last_price": 420.0, "atr14": 5.0, "technical_score": 0.85},
            sentiment_data={"score": 0.75},
            fundamental_data={"score": 0.65},
            win_probability=0.74,  # >= 70%
        )
        self.assertTrue(result["approved_for_execution"])
        self.assertEqual(result["plan"]["status"], "COMPLETED")
        self.assertTrue(result["verifier_result"]["passed"])


class TestReflexiveMemory(unittest.TestCase):
    def setUp(self):
        self.test_dir = "test_memory_tmp"
        os.makedirs(self.test_dir, exist_ok=True)
        self.mem_file = os.path.join(self.test_dir, "test_lessons.json")
        self.memory = ReflexiveMemory(memory_path=self.mem_file)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_record_and_query_lessons(self):
        """Reflexive memory persists lessons across sessions and retrieves them by symbol."""
        self.memory.record_lesson(
            symbol="NVDA",
            setup_type="Earnings Breakout",
            outcome="PROFIT",
            realized_pnl=1240.50,
            win_probability_at_entry=0.78,
            post_mortem="Unanimous tech + sentiment confluence led to clean 1:2.5 target fill.",
        )
        self.memory.record_lesson(
            symbol="TSLA",
            setup_type="Mean Reversion",
            outcome="LOSS",
            realized_pnl=-350.00,
            win_probability_at_entry=0.71,
            post_mortem="High volatility wick stopped out before reversal.",
        )

        all_lessons = self.memory.get_all_lessons()
        self.assertEqual(len(all_lessons), 2)

        nvda_lessons = self.memory.get_relevant_lessons(symbol="NVDA")
        self.assertEqual(len(nvda_lessons), 1)
        self.assertEqual(nvda_lessons[0].symbol, "NVDA")

    def test_calculate_prior_adjustment(self):
        """Computes empirical Bayesian prior adjustments from cross-run track record."""
        # Record 4 winning trades for AAPL
        for _ in range(4):
            self.memory.record_lesson("AAPL", "Trend", "PROFIT", 0.75, "Clean win", 500)
        adj = self.memory.calculate_prior_adjustment("AAPL")
        self.assertGreater(adj, 0.0)


class TestModelContextProtocolServer(unittest.TestCase):
    def setUp(self):
        self.mcp = TradingMCPServer(memory_path="test_memory_tmp/mcp_lessons.json")

    def tearDown(self):
        if os.path.exists("test_memory_tmp"):
            shutil.rmtree("test_memory_tmp")

    def test_initialize_handshake(self):
        """MCP server responds to JSON-RPC initialize with protocol version and capabilities."""
        req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"clientInfo": {"name": "test-client", "version": "1.0"}},
        }
        res = self.mcp.dispatch(req)
        self.assertEqual(res["jsonrpc"], "2.0")
        self.assertEqual(res["id"], 1)
        self.assertIn("capabilities", res["result"])
        self.assertIn("serverInfo", res["result"])
        self.assertEqual(res["result"]["serverInfo"]["name"], "nemi-10-agent-trading-mcp")

    def test_tools_list_and_call(self):
        """MCP server lists tools with JSON Schema and executes tool calls."""
        # List tools
        list_req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
        list_res = self.mcp.dispatch(list_req)
        tools = list_res["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        self.assertIn("get_market_quote", tool_names)
        self.assertIn("compute_technical_indicators", tool_names)
        self.assertIn("evaluate_trading_swarm", tool_names)
        self.assertIn("run_agentic_rag_research", tool_names)
        self.assertIn("run_composed_cascade", tool_names)
        self.assertIn("run_risk_audit", tool_names)

        # Call run_risk_audit
        call_req = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "run_risk_audit",
                "arguments": {
                    "symbol": "AAPL",
                    "signal": "BUY",
                    "price": 150.0,
                    "atr": 2.5,
                    "win_probability": 0.74,
                },
            },
        }
        call_res = self.mcp.dispatch(call_req)
        self.assertFalse(call_res["result"]["isError"])
        payload = json.loads(call_res["result"]["content"][0]["text"])
        self.assertTrue(payload["approved"])
        self.assertEqual(payload["win_probability"], 0.74)

    def test_resources_list_and_read(self):
        """MCP server exposes read-only context resources under URIs."""
        # List resources
        list_res = self.mcp.dispatch({"jsonrpc": "2.0", "id": 4, "method": "resources/list"})
        uris = [r["uri"] for r in list_res["result"]["resources"]]
        self.assertIn("market://universe", uris)
        self.assertIn("market://portfolio", uris)
        self.assertIn("market://gatekeeper", uris)

        # Read resource
        read_res = self.mcp.dispatch({
            "jsonrpc": "2.0",
            "id": 5,
            "method": "resources/read",
            "params": {"uri": "market://gatekeeper"},
        })
        text = read_res["result"]["contents"][0]["text"]
        data = json.loads(text)
        self.assertEqual(data["min_win_probability"], 0.70)

    def test_prompts_list_and_get(self):
        """MCP server exposes reusable prompt templates."""
        list_res = self.mcp.dispatch({"jsonrpc": "2.0", "id": 6, "method": "prompts/list"})
        prompts = [p["name"] for p in list_res["result"]["prompts"]]
        self.assertIn("review_trade_proposal", prompts)

        get_res = self.mcp.dispatch({
            "jsonrpc": "2.0",
            "id": 7,
            "method": "prompts/get",
            "params": {"name": "review_trade_proposal", "arguments": {"symbol": "NVDA", "win_probability": "0.76"}},
        })
        msg = get_res["result"]["messages"][0]["content"]["text"]
        self.assertIn("NVDA", msg)
        self.assertIn("70%", msg)


class TestFastAPIWithAgenticEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_mcp_post_endpoint(self):
        """FastAPI /mcp endpoint routes JSON-RPC requests cleanly."""
        resp = self.client.post("/mcp", json={"jsonrpc": "2.0", "id": 10, "method": "ping"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], 10)

    def test_agentic_rag_research_endpoint(self):
        """FastAPI /agentic-rag/research endpoint returns multi-hop trace."""
        resp = self.client.post("/agentic-rag/research", json={"symbol": "AAPL", "goal": "Assess AAPL margins"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["symbol"], "AAPL")
        self.assertIn("hops_used", data["research"])
        self.assertIn("evidence_selected", data["research"])

    def test_cascade_evaluate_endpoint(self):
        """FastAPI /patterns/cascade/evaluate endpoint returns composed cascade output."""
        resp = self.client.post("/patterns/cascade/evaluate", json={"symbol": "AAPL"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("plan", data["cascade"])
        self.assertIn("verifier_result", data["cascade"])


if __name__ == "__main__":
    unittest.main()
