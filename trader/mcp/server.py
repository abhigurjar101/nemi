"""
Model Context Protocol (MCP) Standard Server for 10-Agent Algorithmic Trading Swarm.

Implements the official JSON-RPC 2.0 MCP standard specification:
  - Three Primitives: Tools (actions), Resources (read-only context), Prompts (templates)
  - Runtime Discovery: tools/list, resources/list, prompts/list at handshake
  - Clean error surface: structured JSON-RPC errors, no opaque tracebacks
  - Transport-agnostic: supports stdio streaming pipe and HTTP/JSON-RPC dispatch
"""
import sys
import json
import logging
from typing import Any, Dict, List, Optional
from config import CONFIG
from orchestrator import TradingSystem
from realtime_trader import RealtimeTrader
from patterns.agentic_rag import ReasoningRetriever, RetrievalChunk
from patterns.cascade import ComposedTradingCascade
from patterns.reflexive_memory import ReflexiveMemory

logger = logging.getLogger("mcp-server")


class TradingMCPServer:
    PROTOCOL_VERSION = "2024-11-05"
    SERVER_NAME = "nemi-10-agent-trading-mcp"
    SERVER_VERSION = "1.0.0"

    def __init__(self, trading_system: Optional[TradingSystem] = None, memory_path: str = "memory/reflexive_lessons.json"):
        self.config = CONFIG
        self.trading_system = trading_system or TradingSystem(self.config)
        self.realtime_trader = RealtimeTrader(trading_system=self.trading_system, config=self.config)
        self.cascade = ComposedTradingCascade(min_win_probability=self.config.min_win_probability)
        self.reflexive_memory = ReflexiveMemory(memory_path=memory_path)

        # Build tools catalog
        self.tools = self._build_tools_catalog()
        self.resources = self._build_resources_catalog()
        self.prompts = self._build_prompts_catalog()

    def _build_tools_catalog(self) -> Dict[str, dict]:
        return {
            "get_market_quote": {
                "name": "get_market_quote",
                "description": "Pulls latest OHLCV market candles and spot price for a ticker symbol.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string", "description": "Ticker symbol (e.g. AAPL, BTC, MSFT)"}
                    },
                    "required": ["symbol"],
                },
            },
            "compute_technical_indicators": {
                "name": "compute_technical_indicators",
                "description": "Calculates RSI 14, MACD (12, 26, 9), Bollinger Bands (20, 2.0), and ATR 14 volatility.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string", "description": "Ticker symbol to analyze"}
                    },
                    "required": ["symbol"],
                },
            },
            "evaluate_trading_swarm": {
                "name": "evaluate_trading_swarm",
                "description": "Evaluates symbols across all 10 agents and strictly enforces the 70%+ Bayesian Win Probability Gatekeeper.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbols": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of symbols to evaluate",
                        },
                        "dry_run": {"type": "boolean", "description": "Whether to simulate fills (default true)"}
                    },
                },
            },
            "run_agentic_rag_research": {
                "name": "run_agentic_rag_research",
                "description": "Executes multi-hop Reasoning-Driven Retrieval (Agentic RAG) with hypothesis gap analysis and sufficiency check.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string", "description": "Ticker symbol to research"},
                        "goal": {"type": "string", "description": "Research goal (e.g. 'Assess AAPL fundamental margin expansion and technical momentum')"}
                    },
                    "required": ["symbol", "goal"],
                },
            },
            "run_composed_cascade": {
                "name": "run_composed_cascade",
                "description": "Runs the Generator + Critic + Verifier composed cascade, evaluating subjective quality and strictly gating with the 70%+ verifier.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string", "description": "Ticker symbol"}
                    },
                    "required": ["symbol"],
                },
            },
            "run_risk_audit": {
                "name": "run_risk_audit",
                "description": "Audits a trade proposal against Fractional Kelly, ATR stop distances, portfolio heat, and 70%+ win probability.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "signal": {"type": "string", "enum": ["BUY", "SELL"]},
                        "price": {"type": "number"},
                        "atr": {"type": "number"},
                        "win_probability": {"type": "number", "description": "Estimated win probability (0.0 to 1.0)"}
                    },
                    "required": ["symbol", "signal", "price", "atr", "win_probability"],
                },
            },
            "get_realtime_matrix": {
                "name": "get_realtime_matrix",
                "description": "Returns the latest real-time market analysis matrix, highlighting sure-shot (>=70%) vs disqualified setups.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
        }

    def _build_resources_catalog(self) -> Dict[str, dict]:
        return {
            "market://universe": {
                "uri": "market://universe",
                "name": "Monitored Asset Universe",
                "description": "List of active ticker symbols monitored by the 10-agent trading swarm.",
                "mimeType": "application/json",
            },
            "market://portfolio": {
                "uri": "market://portfolio",
                "name": "Live Portfolio State",
                "description": "Current equity, open positions, daily PnL, and portfolio heat metrics.",
                "mimeType": "application/json",
            },
            "market://gatekeeper": {
                "uri": "market://gatekeeper",
                "name": "70%+ Win Rate Gatekeeper Configuration",
                "description": "Strict threshold rules, circuit breaker ceilings, and risk limits.",
                "mimeType": "application/json",
            },
            "market://reflexive/lessons": {
                "uri": "market://reflexive/lessons",
                "name": "Reflexive Cross-Run Memory Lessons",
                "description": "Historical lessons learned and failure modes recorded across past sessions.",
                "mimeType": "application/json",
            },
        }

    def _build_prompts_catalog(self) -> Dict[str, dict]:
        return {
            "review_trade_proposal": {
                "name": "review_trade_proposal",
                "description": "Reusable institutional prompt for reviewing a trade hypothesis against the 70%+ gatekeeper.",
                "arguments": [
                    {"name": "symbol", "description": "Target ticker symbol", "required": True},
                    {"name": "win_probability", "description": "Estimated Bayesian win probability", "required": True}
                ],
            },
            "critique_market_confluence": {
                "name": "critique_market_confluence",
                "description": "Prompt for Critic node to score subjective setup quality across technicals, sentiment, and fundamentals.",
                "arguments": [
                    {"name": "symbol", "description": "Target ticker symbol", "required": True}
                ],
            },
            "post_mortem_analysis": {
                "name": "post_mortem_analysis",
                "description": "Prompt for extracting reflexive cross-run lessons following trade exit.",
                "arguments": [
                    {"name": "symbol", "description": "Ticker symbol", "required": True},
                    {"name": "pnl", "description": "Realized PnL", "required": True}
                ],
            },
        }

    def dispatch(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches a single JSON-RPC 2.0 request and returns the JSON-RPC response."""
        req_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})

        if not method:
            return self._error(req_id, -32600, "Invalid Request: method is missing")

        try:
            if method == "initialize":
                return self._handle_initialize(req_id, params)
            elif method in ("tools/list", "list_tools"):
                return self._handle_tools_list(req_id)
            elif method in ("tools/call", "call_tool"):
                return self._handle_tools_call(req_id, params)
            elif method in ("resources/list", "list_resources"):
                return self._handle_resources_list(req_id)
            elif method in ("resources/read", "read_resource"):
                return self._handle_resources_read(req_id, params)
            elif method in ("prompts/list", "list_prompts"):
                return self._handle_prompts_list(req_id)
            elif method in ("prompts/get", "get_prompt"):
                return self._handle_prompts_get(req_id, params)
            elif method == "ping":
                return {"jsonrpc": "2.0", "id": req_id, "result": {}}
            else:
                return self._error(req_id, -32601, f"Method not found: {method}")
        except Exception as e:
            logger.exception("Error executing MCP method")
            return self._error(req_id, -32603, f"Internal error: {str(e)}")

    def _handle_initialize(self, req_id: Any, params: dict) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": self.PROTOCOL_VERSION,
                "serverInfo": {
                    "name": self.SERVER_NAME,
                    "version": self.SERVER_VERSION,
                },
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                    "prompts": {"listChanged": False},
                },
                "instructions": (
                    "NEMI 10-Agent Algorithmic Trading MCP Server. "
                    "Enforces the strict 70%+ Bayesian Win Probability Gatekeeper on all market proposals. "
                    "Features Reasoning-Driven Retrieval and Generator-Critic-Verifier Cascades."
                ),
            },
        }

    def _handle_tools_list(self, req_id: Any) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": list(self.tools.values())},
        }

    def _handle_tools_call(self, req_id: Any, params: dict) -> dict:
        name = params.get("name")
        arguments = params.get("arguments", {})

        if name not in self.tools:
            return self._error(req_id, -32602, f"Unknown tool: {name}")

        if name == "get_market_quote":
            symbol = arguments.get("symbol", "AAPL")
            df = self.trading_system.data_agent.fetch(symbol)
            last_price = float(df["close"].iloc[-1])
            res_text = f"{symbol} Last Price: ${last_price:.2f} (Total Bars: {len(df)})"
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": res_text}], "isError": False}}

        elif name == "compute_technical_indicators":
            symbol = arguments.get("symbol", "AAPL")
            df = self.trading_system.data_agent.fetch(symbol)
            ind = self.trading_system.technical_agent.compute(df)
            score = self.trading_system.technical_agent.score(ind)
            payload = {"symbol": symbol, "technical_score": round(score, 3), "indicators": ind}
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(payload, indent=2)}], "isError": False}}

        elif name == "evaluate_trading_swarm":
            symbols = arguments.get("symbols") or self.config.symbols
            dry_run = arguments.get("dry_run", True)
            self.config.dry_run = dry_run
            results = []
            for s in symbols:
                rec = self.realtime_trader.scan_symbol_now(s)
                results.append(rec)
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(results, indent=2)}], "isError": False}}

        elif name == "run_agentic_rag_research":
            symbol = arguments.get("symbol", "AAPL")
            goal = arguments.get("goal", f"Assess {symbol} market and fundamental edge")

            def mock_retriever(query: str) -> List[RetrievalChunk]:
                return [
                    RetrievalChunk(content=f"{symbol} 14-period RSI is 54.2 with bullish MACD histogram momentum.", source="technical_stream", score=0.88),
                    RetrievalChunk(content=f"{symbol} reported quarterly net profit margins of 24.5% with positive growth.", source="sec_10q", score=0.85),
                    RetrievalChunk(content=f"Institutional sentiment for {symbol} is net positive (+0.62) with rising analyst ratings.", source="news_feed", score=0.80),
                ]

            rag = ReasoningRetriever(retrieval_tool=mock_retriever, max_hops=4)
            state = rag.execute(goal=goal)
            summary = {
                "goal": state.goal,
                "hops_used": state.hops_used,
                "evidence_count": len(state.evidence),
                "terminated": state.terminated,
                "reason": state.termination_reason,
                "evidence": [e.model_dump() for e in state.evidence],
            }
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(summary, indent=2)}], "isError": False}}

        elif name == "run_composed_cascade":
            symbol = arguments.get("symbol", "AAPL")
            df = self.trading_system.data_agent.fetch(symbol)
            ind = self.trading_system.technical_agent.compute(df)
            tech_score = self.trading_system.technical_agent.score(ind)
            headlines = self.trading_system.sentiment_agent._fetch_headlines(symbol)
            sent_score = self.trading_system.sentiment_agent.analyze(headlines)
            info = self.trading_system.fundamental_agent._fetch_info(symbol)
            fund_score = self.trading_system.fundamental_agent.score(info)

            strat = self.trading_system.strategy_agent.combine(tech_score, sent_score, fund_score)
            win_prob = strat["win_probability"]

            cascade_res = self.cascade.execute(
                symbol=symbol,
                technical_data={"last_price": ind["last_price"], "atr14": ind["atr14"], "technical_score": tech_score},
                sentiment_data={"score": sent_score},
                fundamental_data={"score": fund_score},
                win_probability=win_prob,
                portfolio_snapshot=self.trading_system.portfolio.snapshot(),
            )
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(cascade_res, indent=2)}], "isError": False}}

        elif name == "run_risk_audit":
            symbol = arguments["symbol"]
            signal = arguments["signal"]
            price = arguments["price"]
            atr = arguments["atr"]
            win_prob = arguments["win_probability"]
            decision = self.trading_system.risk_agent.size_position(
                symbol=symbol,
                signal=signal,
                confidence=0.8,
                price=price,
                atr=atr,
                win_probability=win_prob,
            )
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(decision, indent=2)}], "isError": False}}

        elif name == "get_realtime_matrix":
            matrix = self.realtime_trader.get_market_analysis()
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(matrix, indent=2)}], "isError": False}}

        return self._error(req_id, -32602, f"Unhandled tool: {name}")

    def _handle_resources_list(self, req_id: Any) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"resources": list(self.resources.values())},
        }

    def _handle_resources_read(self, req_id: Any, params: dict) -> dict:
        uri = params.get("uri")
        if not uri:
            return self._error(req_id, -32602, "Missing uri parameter")

        if uri == "market://universe":
            data = {"symbols": self.config.symbols, "interval_seconds": self.config.realtime_interval_seconds}
        elif uri == "market://portfolio":
            data = self.trading_system.portfolio.snapshot()
        elif uri == "market://gatekeeper":
            data = {
                "min_win_probability": self.config.min_win_probability,
                "confidence_threshold": self.config.confidence_threshold,
                "max_portfolio_heat": self.config.max_portfolio_heat,
                "daily_loss_limit_pct": self.config.daily_loss_limit_pct,
                "stop_loss_atr_multiple": self.config.stop_loss_atr_multiple,
                "take_profit_atr_multiple": self.config.take_profit_atr_multiple,
            }
        elif uri == "market://reflexive/lessons":
            data = [l.model_dump() for l in self.reflexive_memory.get_all_lessons()]
        else:
            return self._error(req_id, -32602, f"Resource URI not found: {uri}")

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": json.dumps(data, indent=2),
                    }
                ]
            },
        }

    def _handle_prompts_list(self, req_id: Any) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"prompts": list(self.prompts.values())},
        }

    def _handle_prompts_get(self, req_id: Any, params: dict) -> dict:
        name = params.get("name")
        args = params.get("arguments", {})

        if name not in self.prompts:
            return self._error(req_id, -32602, f"Prompt not found: {name}")

        symbol = args.get("symbol", "AAPL")

        if name == "review_trade_proposal":
            win_prob = args.get("win_probability", "0.72")
            prompt_text = (
                f"You are the Risk Sentinel Verifier auditing an algorithmic trade proposal for {symbol}.\n"
                f"Estimated Win Probability: {win_prob} (Threshold: {self.config.min_win_probability:.0%}).\n"
                f"Task: Verify whether this trade qualifies for execution under the strict 70%+ win rate gatekeeper."
            )
        elif name == "critique_market_confluence":
            prompt_text = (
                f"You are the Trade Critic reviewing setup confluence for {symbol}.\n"
                f"Score the setup from 0.0 to 10.0 based on technical indicators, news sentiment, and fundamentals.\n"
                f"Identify subjective trade flaws and provide actionable suggestions to achieve an 8.0+ rating."
            )
        else:  # post_mortem_analysis
            pnl = args.get("pnl", "0.0")
            prompt_text = (
                f"Conduct a reflexive post-mortem analysis for {symbol} trade with realized PnL: ${pnl}.\n"
                f"Extract the primary failure mode or success factor to record in long-term reflexive memory."
            )

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "description": self.prompts[name]["description"],
                "messages": [
                    {
                        "role": "user",
                        "content": {"type": "text", "text": prompt_text},
                    }
                ],
            },
        }

    def _error(self, req_id: Any, code: int, message: str) -> dict:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": code, "message": message},
        }

    def run_stdio(self):
        """Runs the MCP server over standard I/O for command-line and agent hosts."""
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
                response = self.dispatch(request)
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
            except Exception as e:
                err_resp = self._error(None, -32700, f"Parse error: {str(e)}")
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()


if __name__ == "__main__":
    server = TradingMCPServer()
    server.run_stdio()
