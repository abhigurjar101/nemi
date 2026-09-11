"""
Orchestrator — wires all 10 agents onto one event bus and drives the loop.

Agent roster:
 1. DataAgent            — market_data
 2. TechnicalAnalysisAgent — technical_indicators
 3. SentimentAgent       — sentiment
 4. FundamentalAgent     — fundamentals
 5. StrategyAgent        — strategy_signal (ensemble of 2-4)
 6. RiskAgent            — risk_decision (position sizing + guardrails)
 7. PortfolioAgent       — live equity/positions state (queried by 6 & 8)
 8. ExecutionAgent       — order_filled / order_skipped
 9. BacktestAgent        — standalone historical validation (see backtest.py)
10. MonitorAgent         — decisions.csv audit log + console output

Run with: python main.py
"""
import time
from typing import Optional, List, Dict, Any
from bus import EventBus
from config import Config, CONFIG
from agents.data_agent import DataAgent
from agents.technical_agent import TechnicalAnalysisAgent
from agents.sentiment_agent import SentimentAgent
from agents.fundamental_agent import FundamentalAgent
from agents.strategy_agent import StrategyAgent
from agents.risk_agent import RiskAgent
from agents.portfolio_agent import PortfolioAgent
from agents.execution_agent import ExecutionAgent
from agents.monitor_agent import MonitorAgent
from patterns.cascade import ComposedTradingCascade
from patterns.reflexive_memory import ReflexiveMemory
from patterns.agentic_rag import ReasoningRetriever, RetrievalChunk


class TradingSystem:
    def __init__(self, config: Config = CONFIG):
        self.config = config
        self.bus = EventBus()

        # Order of construction matters only in that subscribers must exist
        # before events are published — the bus itself doesn't care.
        self.portfolio = PortfolioAgent(self.bus)
        self.data_agent = DataAgent(self.bus, config)
        self.technical_agent = TechnicalAnalysisAgent(self.bus)
        self.sentiment_agent = SentimentAgent(self.bus, config)
        self.fundamental_agent = FundamentalAgent(self.bus)
        self.strategy_agent = StrategyAgent(self.bus, config)
        self.risk_agent = RiskAgent(self.bus, config, self.portfolio)
        self.execution_agent = ExecutionAgent(self.bus, config)
        self.monitor_agent = MonitorAgent(self.bus, config.log_dir)

        # Composed Patterns: Generator + Critic + Verifier Cascade & Reflexive Memory
        self.cascade = ComposedTradingCascade(min_win_probability=config.min_win_probability)
        self.reflexive_memory = ReflexiveMemory(memory_path=f"{config.log_dir}/reflexive_lessons.json")

    def run_once(self, symbols=None):
        symbols = symbols or self.config.symbols
        for symbol in symbols:
            try:
                self.data_agent.run(symbol)  # this one publish() call cascades through every other agent
            except Exception as e:
                print(f"[DATA]     {symbol}: failed — {e}")

    def evaluate_with_cascade(self, symbol: str) -> dict:
        """
        Runs the full Generator + Critic + Verifier Composed Cascade for a symbol,
        incorporating cross-run Reflexive Memory prior adjustments.
        """
        df = self.data_agent.fetch(symbol)
        indicators = self.technical_agent.compute(df)
        tech_score = self.technical_agent.score(indicators)
        headlines = self.sentiment_agent._fetch_headlines(symbol)
        sent_score = self.sentiment_agent.analyze(headlines)
        info = self.fundamental_agent._fetch_info(symbol)
        fund_score = self.fundamental_agent.score(info)

        base_strat = self.strategy_agent.combine(tech_score, sent_score, fund_score)
        win_prob = base_strat["win_probability"]

        # Incorporate cross-run reflexive prior adjustment
        prior_adj = self.reflexive_memory.calculate_prior_adjustment(symbol)
        adjusted_win_prob = round(max(0.10, min(0.95, win_prob + prior_adj)), 4)

        cascade_result = self.cascade.execute(
            symbol=symbol,
            technical_data={"last_price": indicators["last_price"], "atr14": indicators["atr14"], "technical_score": tech_score},
            sentiment_data={"score": sent_score},
            fundamental_data={"score": fund_score},
            win_probability=adjusted_win_prob,
            portfolio_snapshot=self.portfolio.snapshot(),
        )

        # Record reflexive lesson if trade was evaluated
        outcome = "APPROVED_70_PLUS" if cascade_result["approved_for_execution"] else "GATEKEEPER_REJECTED"
        self.reflexive_memory.record_lesson(
            symbol=symbol,
            setup_type="Multi-Pillar Confluence",
            outcome=outcome,
            win_probability_at_entry=adjusted_win_prob,
            post_mortem=f"Cascade review: {cascade_result['summary']}",
            realized_pnl=0.0,
            prior_adjustment={"reflexive_delta": prior_adj},
        )

        return cascade_result

    def run_agentic_research(self, symbol: str, goal: Optional[str] = None) -> dict:
        """
        Executes multi-hop Reasoning-Driven Retrieval for a symbol.
        """
        target_goal = goal or f"Examine {symbol} technical breakout viability and valuation margins"

        def search_source(query: str) -> List[RetrievalChunk]:
            chunks = []
            try:
                headlines = self.sentiment_agent._fetch_headlines(symbol, limit=5)
                for h in headlines:
                    chunks.append(RetrievalChunk(content=h, source=f"news_{symbol}", score=0.82))
            except Exception:
                pass

            try:
                info = self.fundamental_agent._fetch_info(symbol)
                pe = info.get("trailingPE", "N/A")
                margin = info.get("profitMargins", "N/A")
                chunks.append(RetrievalChunk(content=f"{symbol} trailing P/E: {pe}, profit margin: {margin}", source="sec_fundamentals", score=0.88))
            except Exception:
                pass

            chunks.append(RetrievalChunk(content=f"{symbol} query focus: {query}", source="query_synthesizer", score=0.75))
            return chunks

        rag = ReasoningRetriever(retrieval_tool=search_source, max_hops=4, max_steps=6)
        state = rag.execute(goal=target_goal)
        return {
            "symbol": symbol,
            "goal": state.goal,
            "hops_used": state.hops_used,
            "evidence_selected": [e.model_dump() for e in state.evidence],
            "termination_reason": state.termination_reason,
            "tokens_used": state.total_tokens_used,
            "trace": [h.model_dump() for h in state.hop_trace],
        }

    def run_loop(self, symbols=None, interval_seconds: int = 900):
        print(f"Starting trading system. Dry run: {self.config.dry_run}. "
              f"Interval: {interval_seconds}s. Symbols: {symbols or self.config.symbols}")
        while True:
            self.run_once(symbols)
            print("Portfolio snapshot:", self.portfolio.snapshot())
            time.sleep(interval_seconds)
