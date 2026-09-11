"""
Agent 1 — Data Ingestion Agent

Pulls OHLCV price history for each symbol via yfinance (no API key required).
Publishes 'market_data' events that downstream agents (Technical, Fundamental,
Sentiment) consume.
"""
import yfinance as yf
import pandas as pd
from bus import EventBus
from config import Config


class DataAgent:
    def __init__(self, bus: EventBus, config: Config):
        self.bus = bus
        self.config = config

    def fetch(self, symbol: str) -> pd.DataFrame:
        df = yf.download(
            symbol,
            period=self.config.lookback_period,
            interval=self.config.lookback_interval,
            progress=False,
            auto_adjust=True,
        )
        if df.empty:
            raise ValueError(f"No price data returned for {symbol}")
        # yfinance sometimes returns MultiIndex columns for single tickers; flatten.
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df.rename(columns=str.lower)
        return df

    def run(self, symbol: str) -> pd.DataFrame:
        df = self.fetch(symbol)
        self.bus.publish("market_data", {"symbol": symbol, "df": df})
        return df
