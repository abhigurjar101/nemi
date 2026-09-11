"""
Agent 8 — Execution Agent

Takes an approved, sized trade proposal from the Risk Agent and places a
bracket order (entry + stop-loss + take-profit) via Alpaca's REST API.
Defaults to Alpaca's PAPER trading endpoint. If dry_run=True (default) or
no API keys are configured, it simulates the fill instead of calling Alpaca —
so the whole 10-agent system runs end-to-end with zero external accounts.
"""
import requests
from bus import EventBus
from config import Config


class ExecutionAgent:
    def __init__(self, bus: EventBus, config: Config):
        self.bus = bus
        self.config = config
        self.bus.subscribe("risk_decision", self._on_risk_decision)

    def _on_risk_decision(self, payload):
        if not payload.get("approved"):
            self.bus.publish("order_skipped", payload)
            return

        if self.config.dry_run or not (self.config.alpaca_key_id and self.config.alpaca_secret_key):
            result = self._simulate_fill(payload)
        else:
            result = self.place_bracket_order(payload)

        self.bus.publish("order_filled", {**payload, **result})

    def _simulate_fill(self, decision: dict) -> dict:
        return {"order_id": "SIMULATED", "status": "filled_dry_run"}

    def place_bracket_order(self, decision: dict) -> dict:
        side = "buy" if decision["signal"] == "BUY" else "sell"
        body = {
            "symbol": decision["symbol"],
            "qty": decision["qty"],
            "side": side,
            "type": "market",
            "time_in_force": "day",
            "order_class": "bracket",
            "take_profit": {"limit_price": decision["target_price"]},
            "stop_loss": {"stop_price": decision["stop_price"]},
        }
        headers = {
            "APCA-API-KEY-ID": self.config.alpaca_key_id,
            "APCA-API-SECRET-KEY": self.config.alpaca_secret_key,
            "Content-Type": "application/json",
        }
        resp = requests.post(f"{self.config.alpaca_base_url}/v2/orders", json=body, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return {"order_id": data.get("id"), "status": data.get("status")}
