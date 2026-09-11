"""
Agent 4 — Fundamental Analysis Agent

Pulls company fundamentals via yfinance (PE ratio, forward growth, margins,
debt/equity) and converts them into a single [-1, 1] fundamental score.
This is intentionally simple and transparent (not a full DCF model) — it's
meant to catch cases where a stock looks technically strong but fundamentally
overextended, or vice versa.
"""
import numpy as np
import yfinance as yf
from bus import EventBus


class FundamentalAgent:
    def __init__(self, bus: EventBus):
        self.bus = bus
        self.bus.subscribe("market_data", self._on_market_data)

    def _on_market_data(self, payload):
        symbol = payload["symbol"]
        info = self._fetch_info(symbol)
        score = self.score(info)
        self.bus.publish("fundamentals", {"symbol": symbol, "score": score, "raw": info})

    def _fetch_info(self, symbol: str) -> dict:
        try:
            return yf.Ticker(symbol).info or {}
        except Exception:
            return {}

    def score(self, info: dict) -> float:
        """
        Combines a handful of normalized signals into one score.
        Each sub-signal contributes in [-1, 1]; missing data is skipped
        (not penalized), and the final score is the mean of what's available.
        """
        signals = []

        pe = info.get("trailingPE")
        if pe and pe > 0:
            # Cheap (<15) tilts bullish, expensive (>40) tilts bearish.
            signals.append(np.clip((25 - pe) / 25, -1, 1))

        peg = info.get("pegRatio")
        if peg and peg > 0:
            # PEG < 1 = growth priced cheaply relative to earnings growth.
            signals.append(np.clip((1.2 - peg) / 1.2, -1, 1))

        profit_margin = info.get("profitMargins")
        if profit_margin is not None:
            signals.append(np.clip(profit_margin * 5, -1, 1))  # 20% margin -> +1

        rev_growth = info.get("revenueGrowth")
        if rev_growth is not None:
            signals.append(np.clip(rev_growth * 4, -1, 1))  # 25% growth -> +1

        debt_to_equity = info.get("debtToEquity")
        if debt_to_equity is not None:
            # Lower leverage tilts bullish; heavy leverage tilts bearish.
            signals.append(np.clip((100 - debt_to_equity) / 100, -1, 1))

        if not signals:
            return 0.0
        return float(np.mean(signals))
