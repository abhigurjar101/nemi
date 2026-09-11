"""
Standalone backtest runner — validate the technical strategy on history
BEFORE trusting the live 10-agent system.

Usage:
    python backtest.py --symbols AAPL MSFT SPY --period 2y
"""
import argparse
import yfinance as yf
from agents.backtest_agent import BacktestAgent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", nargs="+", default=["AAPL", "MSFT", "SPY"])
    parser.add_argument("--period", default="2y")
    parser.add_argument("--interval", default="1d")
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()

    backtester = BacktestAgent(confidence_threshold=args.threshold)

    for symbol in args.symbols:
        df = yf.download(symbol, period=args.period, interval=args.interval, progress=False, auto_adjust=True)
        if df.empty:
            print(f"{symbol}: no data")
            continue
        if hasattr(df.columns, "get_level_values"):
            try:
                df.columns = df.columns.get_level_values(0)
            except Exception:
                pass
        df = df.rename(columns=str.lower)

        result = backtester.run(df)
        print(f"\n{symbol} — {args.period} backtest ({len(df)} bars):")
        for k, v in result.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
