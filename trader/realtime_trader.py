"""
Real-Time Market Analysis & Autonomous Execution Daemon.

Continuously monitors live financial markets, computes multi-factor technical,
sentiment, and fundamental indicators across active tickers, and executes trades
STRICTLY when the estimated Bayesian win probability is 70% or higher.
"""
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional
from config import Config, CONFIG
from orchestrator import TradingSystem


class RealtimeTrader:
    def __init__(self, trading_system: Optional[TradingSystem] = None, config: Optional[Config] = None):
        self.config = config or CONFIG
        self.trading_system = trading_system or TradingSystem(self.config)
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._scan_count = 0
        self._last_scan_time: Optional[str] = None
        self._started_at: Optional[str] = None
        self._latest_market_analysis: Dict[str, dict] = {}
        self._evaluation_history: List[dict] = []
        self._max_history = 100

    def start(self, interval_seconds: Optional[int] = None):
        """Start the background real-time monitoring loop."""
        with self._lock:
            if self._running:
                return False
            self._running = True
            self._started_at = datetime.utcnow().isoformat()
            if interval_seconds:
                self.config.realtime_interval_seconds = interval_seconds

            self._thread = threading.Thread(
                target=self._run_loop,
                name="RealtimeTraderDaemon",
                daemon=True,
            )
            self._thread.start()
            return True

    def stop(self) -> bool:
        """Stop the background real-time monitoring loop gracefully."""
        with self._lock:
            if not self._running:
                return False
            self._running = False

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        return True

    def is_active(self) -> bool:
        return self._running

    def status(self) -> dict:
        """Return operational telemetry and gatekeeper status."""
        with self._lock:
            return {
                "running": self._running,
                "started_at": self._started_at,
                "last_scan_time": self._last_scan_time,
                "scan_count": self._scan_count,
                "interval_seconds": self.config.realtime_interval_seconds,
                "min_win_probability": self.config.min_win_probability,
                "confidence_threshold": self.config.confidence_threshold,
                "symbols_monitored": self.config.symbols,
                "dry_run": self.config.dry_run,
                "portfolio_equity": self.trading_system.portfolio.equity,
                "open_positions": self.trading_system.portfolio.open_position_count(),
            }

    def scan_symbol_now(self, symbol: str) -> dict:
        """
        Runs real-time multi-agent analysis for a single symbol and enforces
        the 70%+ win probability gatekeeper.
        """
        # 1. Pull latest market data
        df = self.trading_system.data_agent.fetch(symbol)
        if df.empty:
            raise ValueError(f"No price data available for {symbol}")

        # 2. Technical Analysis
        indicators = self.trading_system.technical_agent.compute(df)
        tech_score = self.trading_system.technical_agent.score(indicators)

        # 3. Sentiment Analysis
        headlines = self.trading_system.sentiment_agent._fetch_headlines(symbol)
        sent_score = self.trading_system.sentiment_agent.analyze(headlines)

        # 4. Fundamental Analysis
        info = self.trading_system.fundamental_agent._fetch_info(symbol)
        fund_score = self.trading_system.fundamental_agent.score(info)

        # 5. Bayesian Strategy Ensemble & 70%+ Gatekeeper
        strategy_eval = self.trading_system.strategy_agent.combine(
            technical_score=tech_score,
            sentiment_score=sent_score,
            fundamental_score=fund_score,
        )

        win_prob = strategy_eval["win_probability"]
        signal = strategy_eval["signal"]
        is_high_conviction = strategy_eval["is_high_conviction"]
        gatekeeper_passed = win_prob >= self.config.min_win_probability

        # 6. Risk Audit & Execution Check
        risk_decision = None
        execution_result = None

        if signal in ("BUY", "SELL") and gatekeeper_passed:
            risk_decision = self.trading_system.risk_agent.size_position(
                symbol=symbol,
                signal=signal,
                confidence=strategy_eval["confidence"],
                price=indicators["last_price"],
                atr=indicators["atr14"],
                win_probability=win_prob,
            )

            if risk_decision.get("approved"):
                if self.config.dry_run or not (self.config.alpaca_key_id and self.config.alpaca_secret_key):
                    execution_result = self.trading_system.execution_agent._simulate_fill(risk_decision)
                else:
                    execution_result = self.trading_system.execution_agent.place_bracket_order(risk_decision)

                self.trading_system.bus.publish("order_filled", {**risk_decision, **execution_result})
            else:
                self.trading_system.bus.publish("order_skipped", risk_decision)
        else:
            risk_decision = {
                "symbol": symbol,
                "approved": False,
                "reason": strategy_eval["gatekeeper_reason"],
                "win_probability": win_prob,
            }

        analysis_record = {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "last_price": indicators["last_price"],
            "technical_score": round(tech_score, 3),
            "sentiment_score": round(sent_score, 3),
            "fundamental_score": round(fund_score, 3),
            "composite_score": strategy_eval["composite_score"],
            "confidence": strategy_eval["confidence"],
            "win_probability": win_prob,
            "win_probability_pct": f"{win_prob * 100:.1f}%",
            "is_high_conviction": is_high_conviction,
            "gatekeeper_passed": gatekeeper_passed,
            "signal": signal,
            "gatekeeper_reason": strategy_eval["gatekeeper_reason"],
            "headline_count": len(headlines),
            "indicators": {
                "rsi14": round(indicators["rsi14"], 2),
                "macd": round(indicators["macd"], 3),
                "macd_signal": round(indicators["macd_signal"], 3),
                "macd_hist": round(indicators["macd_hist"], 3),
                "bb_low": round(indicators["bb_low"], 2),
                "bb_mid": round(indicators["bb_mid"], 2),
                "bb_high": round(indicators["bb_high"], 2),
                "atr14": round(indicators["atr14"], 2),
            },
            "risk_decision": risk_decision,
            "execution": execution_result,
        }

        with self._lock:
            self._latest_market_analysis[symbol] = analysis_record
            self._evaluation_history.append(analysis_record)
            if len(self._evaluation_history) > self._max_history:
                self._evaluation_history.pop(0)

        return analysis_record

    def scan_all_now(self, symbols: Optional[List[str]] = None) -> List[dict]:
        """Runs a complete real-time market analysis pass across all configured symbols."""
        target_symbols = symbols or self.config.symbols
        results = []
        for sym in target_symbols:
            try:
                rec = self.scan_symbol_now(sym)
                results.append(rec)
            except Exception as e:
                results.append({
                    "symbol": sym,
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "gatekeeper_passed": False,
                    "signal": "ERROR",
                })

        with self._lock:
            self._scan_count += 1
            self._last_scan_time = datetime.utcnow().isoformat()

        return results

    def get_market_analysis(self) -> List[dict]:
        """Returns the current real-time market analysis matrix sorted by win probability."""
        with self._lock:
            records = list(self._latest_market_analysis.values())
        return sorted(records, key=lambda r: r.get("win_probability", 0.0), reverse=True)

    def _run_loop(self):
        """Internal daemon worker thread."""
        while self._running:
            try:
                self.scan_all_now()
            except Exception as e:
                print(f"[REALTIME DAEMON ERROR] {e}")

            # Responsive sleep loop checking _running flag every 0.5 seconds
            elapsed = 0.0
            sleep_target = float(self.config.realtime_interval_seconds)
            while self._running and elapsed < sleep_target:
                time.sleep(0.5)
                elapsed += 0.5
