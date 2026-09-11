"""
Comprehensive Test Suite for 10-Agent Algorithmic Trading Swarm.
Tests:
  1. Bayesian Multi-Factor Win Probability Engine
  2. 70%+ Win Probability Strict Gatekeeper
  3. Risk Management Agent 70% Guardrail
  4. Real-Time Market Analysis Daemon & State Management
  5. FastAPI REST & Webhook Server Endpoints
"""
import unittest
from unittest.mock import MagicMock
from bus import EventBus
from config import Config
from agents.strategy_agent import StrategyAgent
from agents.risk_agent import RiskAgent
from agents.portfolio_agent import PortfolioAgent
from realtime_trader import RealtimeTrader
from fastapi.testclient import TestClient
from server import app


class TestStrategyAgentWinProbability(unittest.TestCase):
    def setUp(self):
        self.bus = EventBus()
        self.config = Config(min_win_probability=0.70, confidence_threshold=0.70)
        self.agent = StrategyAgent(self.bus, self.config)

    def test_bayesian_win_probability_unanimous_bullish_exceeds_70_percent(self):
        """When technical, sentiment, and fundamental all agree bullishly with high conviction, P(Win) >= 0.70"""
        tech = 0.85
        sent = 0.75
        fund = 0.65
        composite = (
            self.config.weight_technical * tech
            + self.config.weight_sentiment * sent
            + self.config.weight_fundamental * fund
        )
        prob = self.agent.calculate_win_probability(tech, sent, fund, composite)
        self.assertGreaterEqual(prob, 0.70)

        decision = self.agent.combine(tech, sent, fund)
        self.assertEqual(decision["signal"], "BUY")
        self.assertTrue(decision["is_high_conviction"])
        self.assertGreaterEqual(decision["win_probability"], 0.70)

    def test_bayesian_win_probability_unanimous_bearish_exceeds_70_percent(self):
        """When technical, sentiment, and fundamental all agree bearishly, P(Win) >= 0.70 and signal is SELL"""
        tech = -0.85
        sent = -0.75
        fund = -0.65
        composite = (
            self.config.weight_technical * tech
            + self.config.weight_sentiment * sent
            + self.config.weight_fundamental * fund
        )
        prob = self.agent.calculate_win_probability(tech, sent, fund, composite)
        self.assertGreaterEqual(prob, 0.70)

        decision = self.agent.combine(tech, sent, fund)
        self.assertEqual(decision["signal"], "SELL")
        self.assertTrue(decision["is_high_conviction"])

    def test_conflicting_signals_disqualified_under_70_percent(self):
        """When signals conflict (e.g. bullish tech but bearish sentiment/fundamentals), P(Win) < 0.70 and signal is HOLD"""
        tech = 0.60
        sent = -0.50  # conflict!
        fund = -0.40  # conflict!
        decision = self.agent.combine(tech, sent, fund)
        self.assertLess(decision["win_probability"], 0.70)
        self.assertEqual(decision["signal"], "HOLD")
        self.assertFalse(decision["is_high_conviction"])
        self.assertIn("below required 70% threshold", decision["gatekeeper_reason"])

    def test_neutral_market_stays_near_50_percent(self):
        """When indicators are near zero, P(Win) stays near baseline ~50% and signal is HOLD"""
        decision = self.agent.combine(0.01, -0.02, 0.0)
        self.assertAlmostEqual(decision["win_probability"], 0.50, delta=0.05)
        self.assertEqual(decision["signal"], "HOLD")


class TestRiskAgentGatekeeper(unittest.TestCase):
    def setUp(self):
        self.bus = EventBus()
        self.config = Config(min_win_probability=0.70)
        self.portfolio = PortfolioAgent(self.bus, starting_equity=100000.0)
        self.risk_agent = RiskAgent(self.bus, self.config, self.portfolio)

    def test_risk_agent_rejects_sub_70_win_probability(self):
        """Risk agent must strictly reject any trade with estimated win probability < 70%"""
        decision = self.risk_agent.size_position(
            symbol="AAPL",
            signal="BUY",
            confidence=0.85,
            price=150.0,
            atr=2.5,
            win_probability=0.68,  # Under 70%!
        )
        self.assertFalse(decision["approved"])
        self.assertIn("below required 70% threshold", decision["reason"])

    def test_risk_agent_approves_qualified_70_plus_setup(self):
        """Risk agent approves and sizes position when win probability >= 70% and within risk limits"""
        decision = self.risk_agent.size_position(
            symbol="AAPL",
            signal="BUY",
            confidence=0.80,
            price=150.0,
            atr=2.0,
            win_probability=0.74,  # >= 70%
        )
        self.assertTrue(decision["approved"])
        self.assertGreater(decision["qty"], 0)
        self.assertEqual(decision["win_probability"], 0.74)
        self.assertLess(decision["stop_price"], 150.0)
        self.assertGreater(decision["target_price"], 150.0)


class TestRealtimeTrader(unittest.TestCase):
    def setUp(self):
        self.config = Config(symbols=["AAPL"], min_win_probability=0.70, realtime_interval_seconds=60)
        self.trader = RealtimeTrader(config=self.config)

    def test_trader_lifecycle(self):
        """Trader daemon should start, report status, and stop cleanly"""
        self.assertFalse(self.trader.is_active())
        started = self.trader.start(interval_seconds=10)
        self.assertTrue(started)
        self.assertTrue(self.trader.is_active())

        telemetry = self.trader.status()
        self.assertTrue(telemetry["running"])
        self.assertEqual(telemetry["min_win_probability"], 0.70)

        stopped = self.trader.stop()
        self.assertTrue(stopped)
        self.assertFalse(self.trader.is_active())

    def test_market_analysis_structure(self):
        """Realtime scanner produces valid analysis record with win_probability and gatekeeper status"""
        record = self.trader.scan_symbol_now("AAPL")
        self.assertEqual(record["symbol"], "AAPL")
        self.assertIn("win_probability", record)
        self.assertIn("gatekeeper_passed", record)
        self.assertIn("signal", record)
        self.assertIn("indicators", record)
        self.assertIn("risk_decision", record)
        self.assertEqual(record["gatekeeper_passed"], record["win_probability"] >= 0.70)


class TestFastAPIServer(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["min_win_probability"], 0.70)
        self.assertEqual(len(data["agents"]), 10)

    def test_realtime_status_endpoint(self):
        resp = self.client.get("/realtime/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("telemetry", data)
        self.assertEqual(data["telemetry"]["min_win_probability"], 0.70)

    def test_realtime_market_analysis_endpoint(self):
        resp = self.client.get("/realtime/market-analysis")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("high_conviction_trades", data)
        self.assertIn("monitoring_setups", data)
        self.assertEqual(data["min_win_probability_threshold"], 0.70)

    def test_realtime_start_stop_endpoints(self):
        start_resp = self.client.post("/realtime/start", json={"interval_seconds": 45})
        self.assertEqual(start_resp.status_code, 200)
        start_data = start_resp.json()
        self.assertTrue(start_data["success"])
        self.assertTrue(start_data["telemetry"]["running"])

        stop_resp = self.client.post("/realtime/stop")
        self.assertEqual(stop_resp.status_code, 200)
        stop_data = stop_resp.json()
        self.assertTrue(stop_data["success"])
        self.assertFalse(stop_data["telemetry"]["running"])

    def test_config_update_min_win_probability(self):
        resp = self.client.post("/config", json={"min_win_probability": 0.75})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["config"]["min_win_probability"], 0.75)

        # Restore to 0.70
        resp_restore = self.client.post("/config", json={"min_win_probability": 0.70})
        self.assertEqual(resp_restore.status_code, 200)
        self.assertEqual(resp_restore.json()["config"]["min_win_probability"], 0.70)

    def test_realtime_scan_now_endpoint(self):
        resp = self.client.post("/realtime/scan-now", json={"symbols": ["AAPL"]})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["scanned_count"], 1)
        self.assertIn("qualified_count", data)
        self.assertIn("disqualified_count", data)
        self.assertEqual(data["min_win_probability_required"], "70%")


if __name__ == "__main__":
    unittest.main()
