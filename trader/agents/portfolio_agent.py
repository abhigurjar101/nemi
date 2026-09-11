"""
Agent 7 — Portfolio Manager Agent

Tracks equity, open positions, and running P&L. Other agents (Risk, Execution)
query this agent directly for live state rather than only listening on the bus,
since portfolio state needs to be read synchronously mid-decision.
"""
from datetime import date
from bus import EventBus


class PortfolioAgent:
    def __init__(self, bus: EventBus, starting_equity: float = 100_000.0):
        self.bus = bus
        self.equity = starting_equity
        self.starting_equity_today = starting_equity
        self.today = date.today()
        self.positions = {}  # symbol -> {qty, entry_price, stop_price, target_price, side}
        self.bus.subscribe("order_filled", self._on_fill)
        self.bus.subscribe("position_closed", self._on_close)

    def _roll_day_if_needed(self):
        if date.today() != self.today:
            self.today = date.today()
            self.starting_equity_today = self.equity

    def _on_fill(self, payload):
        self._roll_day_if_needed()
        self.positions[payload["symbol"]] = {
            "qty": payload["qty"],
            "entry_price": payload["entry_price"],
            "stop_price": payload["stop_price"],
            "target_price": payload["target_price"],
            "side": payload["signal"],
        }

    def _on_close(self, payload):
        self._roll_day_if_needed()
        pnl = payload.get("pnl", 0.0)
        self.equity += pnl
        self.positions.pop(payload["symbol"], None)

    def open_position_count(self) -> int:
        return len(self.positions)

    def total_risk_pct(self) -> float:
        if not self.positions or self.equity <= 0:
            return 0.0
        total_risk = sum(
            abs(p["entry_price"] - p["stop_price"]) * p["qty"] for p in self.positions.values()
        )
        return total_risk / self.equity

    def daily_pnl_pct(self) -> float:
        self._roll_day_if_needed()
        if self.starting_equity_today <= 0:
            return 0.0
        return (self.equity - self.starting_equity_today) / self.starting_equity_today

    def snapshot(self) -> dict:
        return {
            "equity": round(self.equity, 2),
            "open_positions": len(self.positions),
            "positions": self.positions,
            "daily_pnl_pct": round(self.daily_pnl_pct(), 4),
        }
