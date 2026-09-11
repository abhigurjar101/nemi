"""
Agent 9 — Backtesting Agent

Replays the Technical Agent's rule-based scoring logic across history to
estimate whether the strategy has any edge before it ever touches paper
or live money. Deliberately independent of the live event bus so it can
run in isolation on years of data quickly.
"""
import numpy as np
import pandas as pd
from agents.technical_agent import TechnicalAnalysisAgent


class BacktestAgent:
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold
        # Reuse the same scoring math the live system uses — this is what
        # makes the backtest meaningful rather than a separate, drifted copy.
        self._ta = TechnicalAnalysisAgent.__new__(TechnicalAnalysisAgent)

    def run(self, df: pd.DataFrame, warmup: int = 60) -> dict:
        closes = df["close"]
        equity = 1.0
        equity_curve = [equity]
        position = None  # {"side": "long"/"short", "entry": price}
        trades = []

        for i in range(warmup, len(df) - 1):
            window = df.iloc[: i + 1]
            indicators = self._ta.compute(window)
            score = self._ta.score(indicators)
            price_today = closes.iloc[i]
            price_tomorrow = closes.iloc[i + 1]

            if position is None:
                if score >= self.confidence_threshold:
                    position = {"side": "long", "entry": price_today}
                elif score <= -self.confidence_threshold:
                    position = {"side": "short", "entry": price_today}
            else:
                exit_signal = (
                    (position["side"] == "long" and score <= 0)
                    or (position["side"] == "short" and score >= 0)
                )
                if exit_signal:
                    ret = (price_today / position["entry"] - 1) if position["side"] == "long" else (1 - price_today / position["entry"])
                    equity *= (1 + ret)
                    trades.append(ret)
                    position = None

            equity_curve.append(equity)

        return self._summarize(equity_curve, trades)

    def _summarize(self, equity_curve: list, trades: list) -> dict:
        curve = pd.Series(equity_curve)
        returns = curve.pct_change().dropna()
        running_max = curve.cummax()
        drawdown = (curve - running_max) / running_max

        sharpe = 0.0
        if returns.std() > 0:
            sharpe = float(np.sqrt(252) * returns.mean() / returns.std())

        win_rate = float(np.mean([1 if t > 0 else 0 for t in trades])) if trades else 0.0

        return {
            "total_return_pct": round((curve.iloc[-1] - 1) * 100, 2),
            "num_trades": len(trades),
            "win_rate_pct": round(win_rate * 100, 2),
            "sharpe_ratio": round(sharpe, 2),
            "max_drawdown_pct": round(float(drawdown.min()) * 100, 2),
        }
