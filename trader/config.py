"""
Central configuration for the 10-agent trading system.
Edit these values directly, or override via environment variables.
"""
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class Config:
    # --- Universe ---
    symbols: List[str] = field(default_factory=lambda: ["AAPL", "MSFT", "NVDA", "SPY", "QQQ"])

    # --- High-Conviction Win Rate Gatekeeper ---
    min_win_probability: float = 0.70      # Minimum estimated win probability (70%+) to execute a trade
    confidence_threshold: float = 0.70     # Minimum multi-agent ensemble conviction required

    # --- Real-Time Execution ---
    realtime_interval_seconds: int = 30    # Polling cadence for real-time market analysis
    realtime_intraday_interval: str = "5m" # Intraday candle resolution (e.g. "1m", "5m", "15m", "1d")

    # --- Risk ---
    risk_pct_per_trade: float = 0.01       # fraction of equity risked per trade
    max_notional_per_trade: float = 500.0  # hard $ cap per trade
    max_portfolio_heat: float = 0.06       # max total % of equity at risk across all open positions
    max_open_positions: int = 5
    daily_loss_limit_pct: float = 0.03     # halt trading for the day if equity drawdown exceeds this
    stop_loss_atr_multiple: float = 1.5
    take_profit_atr_multiple: float = 3.0  # 1:2.0 Risk-to-Reward minimum ratio

    # --- Strategy ensemble weights (must sum to 1.0) ---
    weight_technical: float = 0.5
    weight_sentiment: float = 0.2
    weight_fundamental: float = 0.3

    # --- Execution ---
    alpaca_base_url: str = "https://paper-api.alpaca.markets"  # PAPER by default. Do not change lightly.
    alpaca_key_id: str = os.getenv("ALPACA_KEY_ID", "")
    alpaca_secret_key: str = os.getenv("ALPACA_SECRET_KEY", "")
    dry_run: bool = os.getenv("DRY_RUN", "true").lower() != "false"  # true = simulate orders, don't call Alpaca

    # --- Optional LLM sentiment ---
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # --- Data ---
    # Use 5m candles over last 5 days for real-time intraday analysis.
    # The last candle's close = current live price (within ~5 minutes).
    lookback_period: str = "5d"
    lookback_interval: str = "5m"


    # --- Logging ---
    log_dir: str = "logs"


CONFIG = Config()
