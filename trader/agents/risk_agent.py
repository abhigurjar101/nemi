"""
Agent 6 — Risk Management Agent

Converts a strategy signal into a sized, risk-bounded trade proposal.
Uses ATR (volatility) for stop distance rather than a fixed percentage,
so position size automatically shrinks for volatile names and grows for
calm ones — same dollar risk either way.
"""
from bus import EventBus
from config import Config


class RiskAgent:
    def __init__(self, bus: EventBus, config: Config, portfolio):
        self.bus = bus
        self.config = config
        self.portfolio = portfolio  # reference to PortfolioAgent for live equity/exposure checks
        self._technical_cache = {}
        self.bus.subscribe("technical_indicators", self._cache_indicators)
        self.bus.subscribe("strategy_signal", self._on_signal)

    def _cache_indicators(self, payload):
        self._technical_cache[payload["symbol"]] = payload

    def _on_signal(self, payload):
        symbol = payload["symbol"]
        if payload["signal"] == "HOLD":
            self.bus.publish("risk_decision", {"symbol": symbol, "approved": False, "reason": "signal is HOLD"})
            return

        indicators = self._technical_cache.get(symbol)
        if not indicators:
            self.bus.publish("risk_decision", {"symbol": symbol, "approved": False, "reason": "no indicator data"})
            return

        decision = self.size_position(
            symbol=symbol,
            signal=payload["signal"],
            confidence=payload["confidence"],
            price=indicators["last_price"],
            atr=indicators["atr14"],
            win_probability=payload.get("win_probability", payload.get("confidence", 0.0)),
        )
        self.bus.publish("risk_decision", decision)

    def size_position(
        self,
        symbol: str,
        signal: str,
        confidence: float,
        price: float,
        atr: float,
        win_probability: float = 0.0,
    ) -> dict:
        min_win_prob = getattr(self.config, "min_win_probability", 0.70)
        if win_probability < min_win_prob:
            return {
                "symbol": symbol,
                "approved": False,
                "reason": f"win probability ({win_probability:.1%}) below required {min_win_prob:.0%} threshold",
                "win_probability": win_probability,
            }

        equity = self.portfolio.equity
        daily_pnl_pct = self.portfolio.daily_pnl_pct()

        if daily_pnl_pct <= -self.config.daily_loss_limit_pct:
            return {"symbol": symbol, "approved": False, "reason": "daily loss limit reached"}

        if self.portfolio.open_position_count() >= self.config.max_open_positions:
            return {"symbol": symbol, "approved": False, "reason": "max open positions reached"}

        if self.portfolio.total_risk_pct() >= self.config.max_portfolio_heat:
            return {"symbol": symbol, "approved": False, "reason": "portfolio heat limit reached"}

        stop_distance = atr * self.config.stop_loss_atr_multiple
        if stop_distance <= 0:
            return {"symbol": symbol, "approved": False, "reason": "invalid ATR / stop distance"}

        dollar_risk = min(equity * self.config.risk_pct_per_trade, self.config.max_notional_per_trade)
        qty = int(dollar_risk / stop_distance)

        if qty < 1:
            return {"symbol": symbol, "approved": False, "reason": "position size rounds to 0 shares"}

        if signal == "BUY":
            stop_price = round(price - stop_distance, 2)
            target_price = round(price + stop_distance * (self.config.take_profit_atr_multiple / self.config.stop_loss_atr_multiple), 2)
        else:  # SELL
            stop_price = round(price + stop_distance, 2)
            target_price = round(price - stop_distance * (self.config.take_profit_atr_multiple / self.config.stop_loss_atr_multiple), 2)

        return {
            "symbol": symbol,
            "approved": True,
            "signal": signal,
            "confidence": confidence,
            "win_probability": win_probability,
            "qty": qty,
            "entry_price": price,
            "stop_price": stop_price,
            "target_price": target_price,
            "dollar_risk": round(dollar_risk, 2),
        }
