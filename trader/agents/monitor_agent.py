"""
Agent 10 — Monitoring & Audit Agent

Listens to every topic on the bus and writes a structured, timestamped log
of every decision the system made — trades, skips, and reasoning. This is
what gives you an audit trail to review: which agent said what, and why the
system did or didn't trade.
"""
import csv
import os
from datetime import datetime
from bus import EventBus


class MonitorAgent:
    def __init__(self, bus: EventBus, log_dir: str = "logs"):
        self.bus = bus
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        self.log_path = os.path.join(log_dir, "decisions.csv")
        self._ensure_header()

        for topic in ("strategy_signal", "risk_decision", "order_filled", "order_skipped"):
            self.bus.subscribe(topic, self._make_logger(topic))

    def _ensure_header(self):
        if not os.path.exists(self.log_path):
            with open(self.log_path, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["timestamp", "topic", "symbol", "payload"])

    def _make_logger(self, topic: str):
        def handler(payload):
            with open(self.log_path, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([datetime.utcnow().isoformat(), topic, payload.get("symbol", ""), payload])
            self._print(topic, payload)
        return handler

    def _print(self, topic: str, payload: dict):
        symbol = payload.get("symbol", "?")
        if topic == "strategy_signal":
            win_prob = payload.get("win_probability")
            prob_str = f" [win_prob={win_prob:.1%}]" if win_prob is not None else ""
            print(f"[STRATEGY] {symbol}: {payload['signal']}{prob_str} (confidence={payload['confidence']})")
        elif topic == "risk_decision":
            if payload.get("approved"):
                win_prob = payload.get("win_probability")
                prob_str = f" [win_prob={win_prob:.1%}]" if win_prob is not None else ""
                print(f"[RISK]     {symbol}: APPROVED{prob_str} qty={payload['qty']} stop={payload['stop_price']} target={payload['target_price']}")
            else:
                print(f"[RISK]     {symbol}: rejected — {payload.get('reason')}")
        elif topic == "order_filled":
            print(f"[EXECUTE]  {symbol}: order {payload.get('order_id')} status={payload.get('status')}")
        elif topic == "order_skipped":
            print(f"[EXECUTE]  {symbol}: skipped — {payload.get('reason')}")
