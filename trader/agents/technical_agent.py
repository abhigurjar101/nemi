"""
Agent 2 — Technical Analysis Agent

Computes indicators from raw OHLCV data: SMA, EMA, RSI, MACD, Bollinger Bands,
and ATR (used later by the Risk Agent for volatility-based position sizing).
No external TA library required — implemented directly on pandas Series so
the whole system has minimal dependencies.
"""
import pandas as pd
import numpy as np
from bus import EventBus


def sma(series: pd.Series, length: int) -> float:
    if len(series) < length:
        return float("nan")
    return series.tail(length).mean()


def ema_series(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def rsi(series: pd.Series, length: int = 14) -> float:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(length).mean().iloc[-1]
    avg_loss = loss.rolling(length).mean().iloc[-1]
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = ema_series(series, fast)
    ema_slow = ema_series(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema_series(macd_line, signal)
    return macd_line.iloc[-1], signal_line.iloc[-1], (macd_line.iloc[-1] - signal_line.iloc[-1])


def bollinger_bands(series: pd.Series, length: int = 20, num_std: float = 2.0):
    mid = series.rolling(length).mean().iloc[-1]
    std = series.rolling(length).std().iloc[-1]
    return mid - num_std * std, mid, mid + num_std * std


def atr(df: pd.DataFrame, length: int = 14) -> float:
    high, low, close = df["high"], df["low"], df["close"]
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(length).mean().iloc[-1]


class TechnicalAnalysisAgent:
    def __init__(self, bus: EventBus):
        self.bus = bus
        self.bus.subscribe("market_data", self._on_market_data)

    def _on_market_data(self, payload):
        indicators = self.compute(payload["df"])
        technical_score = self.score(indicators)
        self.bus.publish(
            "technical_indicators",
            {"symbol": payload["symbol"], **indicators, "technical_score": technical_score},
        )

    def compute(self, df: pd.DataFrame) -> dict:
        close = df["close"]
        macd_line, signal_line, hist = macd(close)
        bb_low, bb_mid, bb_high = bollinger_bands(close)
        last_price = close.iloc[-1]

        return {
            "last_price": float(last_price),
            "sma20": float(sma(close, 20)),
            "sma50": float(sma(close, 50)),
            "rsi14": float(rsi(close, 14)),
            "macd": float(macd_line),
            "macd_signal": float(signal_line),
            "macd_hist": float(hist),
            "bb_low": float(bb_low),
            "bb_mid": float(bb_mid),
            "bb_high": float(bb_high),
            "atr14": float(atr(df, 14)),
        }

    def score(self, indicators: dict) -> float:
        """Rule-based technical score in [-1, 1]. +1 = strongly bullish."""
        score = 0.0
        votes = 0

        if not np.isnan(indicators["sma20"]) and not np.isnan(indicators["sma50"]):
            score += 1 if indicators["sma20"] > indicators["sma50"] else -1
            votes += 1

        rsi_val = indicators["rsi14"]
        if rsi_val < 30:
            score += 1   # oversold -> bullish tilt
        elif rsi_val > 70:
            score -= 1   # overbought -> bearish tilt
        votes += 1

        if indicators["macd_hist"] > 0:
            score += 1
        else:
            score -= 1
        votes += 1

        price = indicators["last_price"]
        if price <= indicators["bb_low"]:
            score += 1
        elif price >= indicators["bb_high"]:
            score -= 1
        votes += 1

        return score / votes if votes else 0.0
