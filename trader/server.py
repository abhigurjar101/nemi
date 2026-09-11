"""
FastAPI Webhook Server for the 10-Agent Trading System.
Provides a REST / Webhook interface for n8n workflows and the NEMI desktop app.

Endpoints:
  GET  /health           - System health & agent count
  GET  /portfolio        - Current portfolio snapshot & PnL
  GET  /config           - View central trading configuration
  POST /config           - Update trading configuration on the fly
  POST /trade/evaluate   - Evaluate a symbol through all 10 agents
  POST /trade/backtest   - Run backtesting engine over historical data

Run with:
  uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import Config, CONFIG
from orchestrator import TradingSystem
from agents.backtest_agent import BacktestAgent
from realtime_trader import RealtimeTrader
from mcp.server import TradingMCPServer
import yfinance as yf

app = FastAPI(
    title="10-Agent Algorithmic Trading Server",
    description="REST, Webhook & Model Context Protocol (MCP) bridge for 10-agent trading swarm",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trading_system = TradingSystem(CONFIG)
realtime_trader = RealtimeTrader(trading_system=trading_system, config=CONFIG)
mcp_server = TradingMCPServer(trading_system=trading_system)


class AgenticResearchRequest(BaseModel):
    symbol: str = "AAPL"
    goal: Optional[str] = None


class CascadeEvaluateRequest(BaseModel):
    symbol: str = "AAPL"


class EvaluateRequest(BaseModel):
    symbols: Optional[List[str]] = None
    dry_run: Optional[bool] = None


class BacktestRequest(BaseModel):
    symbols: List[str] = ["AAPL"]
    period: str = "1y"
    initial_capital: float = 100000.0


class ConfigUpdateRequest(BaseModel):
    symbols: Optional[List[str]] = None
    min_win_probability: Optional[float] = None
    risk_pct_per_trade: Optional[float] = None
    max_notional_per_trade: Optional[float] = None
    max_portfolio_heat: Optional[float] = None
    max_open_positions: Optional[int] = None
    daily_loss_limit_pct: Optional[float] = None
    weight_technical: Optional[float] = None
    weight_sentiment: Optional[float] = None
    weight_fundamental: Optional[float] = None
    confidence_threshold: Optional[float] = None
    realtime_interval_seconds: Optional[int] = None
    dry_run: Optional[bool] = None


class RealtimeStartRequest(BaseModel):
    interval_seconds: Optional[int] = None
    symbols: Optional[List[str]] = None


class RealtimeScanRequest(BaseModel):
    symbols: Optional[List[str]] = None


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "system": "10-Agent Algorithmic Trading Swarm",
        "agents": [
            "DataAgent",
            "TechnicalAnalysisAgent",
            "SentimentAgent",
            "FundamentalAgent",
            "StrategyAgent",
            "RiskAgent",
            "PortfolioAgent",
            "ExecutionAgent",
            "BacktestAgent",
            "MonitorAgent",
        ],
        "dry_run": CONFIG.dry_run,
        "default_symbols": CONFIG.symbols,
        "min_win_probability": CONFIG.min_win_probability,
        "realtime_daemon_running": realtime_trader.is_active(),
    }


@app.get("/portfolio")
def get_portfolio():
    return trading_system.portfolio.snapshot()


@app.get("/config")
def get_config():
    return {
        "symbols": CONFIG.symbols,
        "min_win_probability": CONFIG.min_win_probability,
        "risk_pct_per_trade": CONFIG.risk_pct_per_trade,
        "max_notional_per_trade": CONFIG.max_notional_per_trade,
        "max_portfolio_heat": CONFIG.max_portfolio_heat,
        "max_open_positions": CONFIG.max_open_positions,
        "daily_loss_limit_pct": CONFIG.daily_loss_limit_pct,
        "stop_loss_atr_multiple": CONFIG.stop_loss_atr_multiple,
        "take_profit_atr_multiple": CONFIG.take_profit_atr_multiple,
        "weight_technical": CONFIG.weight_technical,
        "weight_sentiment": CONFIG.weight_sentiment,
        "weight_fundamental": CONFIG.weight_fundamental,
        "confidence_threshold": CONFIG.confidence_threshold,
        "realtime_interval_seconds": CONFIG.realtime_interval_seconds,
        "alpaca_base_url": CONFIG.alpaca_base_url,
        "dry_run": CONFIG.dry_run,
    }


@app.post("/config")
def update_config(req: ConfigUpdateRequest):
    if req.symbols is not None:
        CONFIG.symbols = req.symbols
    if req.min_win_probability is not None:
        CONFIG.min_win_probability = req.min_win_probability
    if req.risk_pct_per_trade is not None:
        CONFIG.risk_pct_per_trade = req.risk_pct_per_trade
    if req.max_notional_per_trade is not None:
        CONFIG.max_notional_per_trade = req.max_notional_per_trade
    if req.max_portfolio_heat is not None:
        CONFIG.max_portfolio_heat = req.max_portfolio_heat
    if req.max_open_positions is not None:
        CONFIG.max_open_positions = req.max_open_positions
    if req.daily_loss_limit_pct is not None:
        CONFIG.daily_loss_limit_pct = req.daily_loss_limit_pct
    if req.weight_technical is not None:
        CONFIG.weight_technical = req.weight_technical
    if req.weight_sentiment is not None:
        CONFIG.weight_sentiment = req.weight_sentiment
    if req.weight_fundamental is not None:
        CONFIG.weight_fundamental = req.weight_fundamental
    if req.confidence_threshold is not None:
        CONFIG.confidence_threshold = req.confidence_threshold
    if req.realtime_interval_seconds is not None:
        CONFIG.realtime_interval_seconds = req.realtime_interval_seconds
    if req.dry_run is not None:
        CONFIG.dry_run = req.dry_run

    return {"message": "Config updated successfully", "config": get_config()}


# --- Real-Time Market Analysis & Autonomous Execution Endpoints ---

@app.get("/realtime/status")
def realtime_status():
    """Returns live telemetry, uptime, scan statistics, and gatekeeper parameters."""
    return {
        "success": True,
        "telemetry": realtime_trader.status(),
    }


@app.post("/realtime/start")
def realtime_start(req: RealtimeStartRequest = RealtimeStartRequest()):
    """Starts the real-time background market scanning & execution loop."""
    if req.symbols:
        CONFIG.symbols = req.symbols
    started = realtime_trader.start(interval_seconds=req.interval_seconds)
    return {
        "success": True,
        "message": "Real-time market analysis daemon started" if started else "Daemon was already running",
        "telemetry": realtime_trader.status(),
    }


@app.post("/realtime/stop")
def realtime_stop():
    """Stops the real-time background market scanning daemon."""
    stopped = realtime_trader.stop()
    return {
        "success": True,
        "message": "Real-time market analysis daemon stopped" if stopped else "Daemon was not running",
        "telemetry": realtime_trader.status(),
    }


@app.post("/realtime/scan-now")
def realtime_scan_now(req: RealtimeScanRequest = RealtimeScanRequest()):
    """
    Triggers an immediate real-time market analysis pass across symbols.
    Applies the 70%+ win probability gatekeeper and executes any qualified setups.
    """
    symbols = req.symbols or CONFIG.symbols
    scan_results = realtime_trader.scan_all_now(symbols=symbols)
    qualified = [r for r in scan_results if r.get("gatekeeper_passed")]
    disqualified = [r for r in scan_results if not r.get("gatekeeper_passed")]

    return {
        "success": True,
        "scanned_count": len(scan_results),
        "qualified_count": len(qualified),
        "disqualified_count": len(disqualified),
        "min_win_probability_required": f"{CONFIG.min_win_probability:.0%}",
        "qualified_trades": qualified,
        "disqualified_trades": disqualified,
        "portfolio": trading_system.portfolio.snapshot(),
    }


@app.get("/realtime/market-analysis")
def realtime_market_analysis():
    """
    Returns the latest real-time market analysis matrix for all monitored assets,
    highlighting sure-shot trades (>=70% win probability) vs holding/rejected setups.
    """
    analysis = realtime_trader.get_market_analysis()
    qualified = [r for r in analysis if r.get("gatekeeper_passed")]
    disqualified = [r for r in analysis if not r.get("gatekeeper_passed")]

    return {
        "success": True,
        "timestamp": realtime_trader._last_scan_time,
        "total_assets": len(analysis),
        "qualified_trades_count": len(qualified),
        "min_win_probability_threshold": CONFIG.min_win_probability,
        "high_conviction_trades": qualified,
        "monitoring_setups": disqualified,
        "all_matrix": analysis,
    }


@app.post("/trade/evaluate")
def evaluate(req: EvaluateRequest):
    symbols = req.symbols or CONFIG.symbols
    if req.dry_run is not None:
        CONFIG.dry_run = req.dry_run

    results = []
    for sym in symbols:
        try:
            trading_system.data_agent.run(sym)
            results.append({"symbol": sym, "status": "processed"})
        except Exception as e:
            results.append({"symbol": sym, "status": "error", "error": str(e)})

    return {
        "success": True,
        "evaluated_symbols": symbols,
        "results": results,
        "portfolio": trading_system.portfolio.snapshot(),
    }


@app.post("/trade/backtest")
def run_backtest(req: BacktestRequest):
    agent = BacktestAgent(confidence_threshold=CONFIG.confidence_threshold)
    results = {}
    for sym in req.symbols:
        try:
            df = yf.download(sym, period=req.period, interval="1d", progress=False, auto_adjust=True)
            if df.empty:
                results[sym] = {"error": "no data returned from Yahoo Finance"}
                continue
            if hasattr(df.columns, "get_level_values"):
                try:
                    df.columns = df.columns.get_level_values(0)
                except Exception:
                    pass
            df = df.rename(columns=str.lower)
            metrics = agent.run(df)
            results[sym] = metrics
        except Exception as e:
            results[sym] = {"error": str(e)}

    return {
        "success": True,
        "period": req.period,
        "metrics": results,
    }


# --- Model Context Protocol (MCP) & Agent Design Patterns Endpoints ---

@app.post("/mcp")
def mcp_endpoint(request: Dict[str, Any]):
    """Official Model Context Protocol (MCP) JSON-RPC 2.0 dispatch endpoint."""
    return mcp_server.dispatch(request)


@app.post("/agentic-rag/research")
def agentic_rag_research(req: AgenticResearchRequest):
    """Executes multi-hop Reasoning-Driven Retrieval (Agentic RAG) on a ticker."""
    res = trading_system.run_agentic_research(req.symbol, req.goal)
    return {
        "success": True,
        "symbol": req.symbol,
        "research": res,
    }


@app.post("/patterns/cascade/evaluate")
def cascade_evaluate(req: CascadeEvaluateRequest):
    """Executes the Generator + Critic + Verifier Composed Cascade with 70%+ gatekeeper."""
    result = trading_system.evaluate_with_cascade(req.symbol)
    return {
        "success": True,
        "symbol": req.symbol,
        "cascade": result,
    }


@app.get("/patterns/reflexive/lessons")
def get_reflexive_lessons():
    """Returns persistent cross-run lessons learned from historical trading sessions."""
    lessons = trading_system.reflexive_memory.get_all_lessons()
    return {
        "success": True,
        "lesson_count": len(lessons),
        "lessons": [l.model_dump() for l in lessons],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
