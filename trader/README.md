# 10-Agent Trading System

A real, runnable multi-agent trading pipeline in Python. Ten agents communicate
over a lightweight in-memory event bus — no framework lock-in, no hidden magic.
Tested end-to-end (see "Verified" below).

## The 10 agents

| # | Agent | File | Role |
|---|---|---|---|
| 1 | Data Ingestion | `agents/data_agent.py` | Pulls OHLCV price history (yfinance, free, no key) |
| 2 | Technical Analysis | `agents/technical_agent.py` | SMA/EMA/RSI/MACD/Bollinger/ATR + rule-based score |
| 3 | Sentiment Analysis | `agents/sentiment_agent.py` | News headline sentiment (OpenAI if key set, else keyword fallback) |
| 4 | Fundamental Analysis | `agents/fundamental_agent.py` | PE, PEG, margins, growth, leverage → score |
| 5 | Strategy Ensemble | `agents/strategy_agent.py` | Weighted combination of 2–4 into BUY/SELL/HOLD + confidence |
| 6 | Risk Management | `agents/risk_agent.py` | ATR-based position sizing, portfolio heat & daily-loss guardrails |
| 7 | Portfolio Manager | `agents/portfolio_agent.py` | Live equity, open positions, P&L tracking |
| 8 | Execution | `agents/execution_agent.py` | Bracket orders via Alpaca **paper** API (or dry-run simulation) |
| 9 | Backtesting | `agents/backtest_agent.py` | Replays the *same* scoring logic across history — no drift between backtest and live |
| 10 | Monitoring / Audit | `agents/monitor_agent.py` | Logs every decision to `logs/decisions.csv` + console |

`orchestrator.py` wires all 10 onto one `EventBus` (`bus.py`). Publishing one
`market_data` event for a symbol cascades through every downstream agent
automatically — that's the whole point of the pub/sub design: you can add an
11th agent later without touching the other 10.

## Quick start

```bash
pip install -r requirements.txt

# 1. Backtest FIRST — see if the strategy has any edge before running it live
python backtest.py --symbols AAPL MSFT SPY --period 2y

# 2. Run one pass, dry-run (no real orders, fully simulated fills)
python main.py --symbols AAPL MSFT

# 3. Run continuously every 15 min, still dry-run
python main.py --symbols AAPL MSFT --loop --interval 900
```

## Going to paper trading (real orders, fake money)

1. Get **paper** API keys from [alpaca.markets](https://alpaca.markets).
2. Set environment variables:
   ```bash
   export ALPACA_KEY_ID=your_key
   export ALPACA_SECRET_KEY=your_secret
   ```
3. Run with `--live` to disable dry-run:
   ```bash
   python main.py --symbols AAPL MSFT --live
   ```
   `config.py`'s `alpaca_base_url` still points at `paper-api.alpaca.markets`.
   **Do not change that URL to the live endpoint** until you've watched this
   run correctly for weeks and understand every failure mode.

## Optional: better sentiment via OpenAI
```bash
export OPENAI_API_KEY=your_key
```
Without this, Agent 3 falls back to a transparent keyword-count heuristic —
the system runs fully without any paid API.

## Tuning
Everything lives in `config.py` — one dataclass, no hunting through code:
- `weight_technical` / `weight_sentiment` / `weight_fundamental` — ensemble weights (must sum to 1.0)
- `confidence_threshold` — how convinced the ensemble must be to act
- `risk_pct_per_trade`, `max_notional_per_trade`, `max_portfolio_heat`, `max_open_positions`, `daily_loss_limit_pct` — guardrails
- `stop_loss_atr_multiple` / `take_profit_atr_multiple` — volatility-scaled exit distances

## What's deliberately NOT here
- No claim this strategy has positive expected value — the rule-based technical
  scoring is a reasonable, transparent starting point, not a proven edge. **Run
  `backtest.py` across your actual universe and time horizon before trusting it.**
- No live-money execution path. The default and only tested path is Alpaca paper
  trading or full dry-run simulation.
- Not financial advice. This is automation infrastructure; the decisions it
  makes are only as good as the strategy logic you put in `technical_agent.py`,
  `sentiment_agent.py`, and `fundamental_agent.py`.

## Connecting this to the earlier n8n pipeline
This Python system and the n8n workflow built earlier solve the same problem
two ways. You could wrap `orchestrator.py` in a small FastAPI/Flask endpoint
and have n8n's HTTP Request node call it — giving you n8n's scheduling/alerting
UI on top of this system's actual decision logic — if you want to combine them
later.
