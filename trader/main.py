"""
Entry point for the 10-Agent Algorithmic Trading System.

Usage:
    python main.py                      # run single analysis pass, dry-run
    python main.py --realtime           # run continuous real-time market analysis & 70%+ gatekeeper
    python main.py --min-win-prob 0.70  # enforce custom win probability threshold (e.g. 70%+)
    python main.py --symbols AAPL MSFT  # override symbol universe
    python main.py --live               # disable dry-run (requires Alpaca keys)
    python main.py --server             # launch REST / Webhook FastAPI server
"""
import argparse
import time
from config import CONFIG
from orchestrator import TradingSystem
from realtime_trader import RealtimeTrader


def main():
    parser = argparse.ArgumentParser(description="10-Agent High-Conviction Algorithmic Trading System")
    parser.add_argument("--symbols", nargs="+", default=None, help="Ticker symbols to trade / monitor")
    parser.add_argument("--realtime", action="store_true", help="Run real-time continuous market analysis loop")
    parser.add_argument("--loop", action="store_true", help="Run classic batch loop on schedule")
    parser.add_argument("--interval", type=int, default=30, help="Seconds between real-time market scans")
    parser.add_argument("--min-win-prob", type=float, default=None, help="Minimum win probability (e.g. 0.70 for 70%+)")
    parser.add_argument("--live", action="store_true", help="Disable dry-run and place real orders via Alpaca paper")
    parser.add_argument("--server", action="store_true", help="Start FastAPI REST and Webhook server")
    args = parser.parse_args()

    if args.min_win_prob is not None:
        CONFIG.min_win_probability = args.min_win_prob

    if args.symbols:
        CONFIG.symbols = args.symbols

    if args.live:
        CONFIG.dry_run = False

    if args.server:
        import uvicorn
        from server import app
        print("Starting 10-Agent FastAPI Server on http://0.0.0.0:8000...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
        return

    system = TradingSystem(CONFIG)

    if args.realtime:
        trader = RealtimeTrader(trading_system=system, config=CONFIG)
        print(f"\n=======================================================")
        print(f" 🚀 REAL-TIME 10-AGENT MARKET ANALYSIS & TRADING DAEMON")
        print(f" Gatekeeper: ONLY executing setups with P(Win) >= {CONFIG.min_win_probability:.0%}")
        print(f" Universe: {CONFIG.symbols}")
        print(f" Interval: {args.interval}s | Dry-run: {CONFIG.dry_run}")
        print(f"=======================================================\n")
        trader.start(interval_seconds=args.interval)
        try:
            while True:
                time.sleep(args.interval)
                analysis = trader.get_market_analysis()
                print(f"\n[{time.strftime('%X')}] --- Real-Time Market Scan Matrix ---")
                for item in analysis:
                    gatekeeper_str = "✅ QUALIFIED (>=70%)" if item.get("gatekeeper_passed") else "❌ DISQUALIFIED (<70%)"
                    print(
                        f"  {item['symbol']:<5} | Price: ${item.get('last_price', 0.0):<8.2f} "
                        f"| WinProb: {item.get('win_probability_pct', 'N/A'):<7} "
                        f"| Signal: {item.get('signal', 'HOLD'):<4} "
                        f"| Status: {gatekeeper_str}"
                    )
        except KeyboardInterrupt:
            print("\nShutting down real-time trader...")
            trader.stop()
            print("Realtime trader stopped.")
    elif args.loop:
        system.run_loop(symbols=args.symbols, interval_seconds=args.interval)
    else:
        system.run_once(symbols=args.symbols)
        print("\nPortfolio snapshot:", system.portfolio.snapshot())


if __name__ == "__main__":
    main()

