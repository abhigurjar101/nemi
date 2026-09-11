"""
Agent 3 — Sentiment Analysis Agent

Pulls recent news headlines for a symbol via yfinance and scores sentiment.
Uses OpenAI if an API key is configured (better quality); otherwise falls
back to a transparent keyword-based heuristic so the system still runs
with zero paid dependencies.
"""
import json
import requests
import yfinance as yf
from bus import EventBus
from config import Config

POSITIVE_WORDS = {
    "beat", "beats", "surge", "soar", "rally", "upgrade", "record", "growth",
    "profit", "strong", "outperform", "bullish", "gain", "expand", "win",
}
NEGATIVE_WORDS = {
    "miss", "misses", "plunge", "crash", "downgrade", "loss", "weak",
    "layoffs", "recall", "lawsuit", "bearish", "decline", "cut", "fraud", "probe",
}


class SentimentAgent:
    def __init__(self, bus: EventBus, config: Config):
        self.bus = bus
        self.config = config
        self.bus.subscribe("market_data", self._on_market_data)

    def _on_market_data(self, payload):
        symbol = payload["symbol"]
        headlines = self._fetch_headlines(symbol)
        score = self.analyze(headlines)
        self.bus.publish("sentiment", {"symbol": symbol, "score": score, "headline_count": len(headlines)})

    def _fetch_headlines(self, symbol: str, limit: int = 10) -> list:
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news or []
            titles = [item.get("title", "") for item in news if item.get("title")]
            return titles[:limit]
        except Exception:
            return []

    def analyze(self, headlines: list) -> float:
        if not headlines:
            return 0.0
        if self.config.openai_api_key:
            score = self._analyze_with_llm(headlines)
            if score is not None:
                return score
        return self._analyze_with_keywords(headlines)

    def _analyze_with_keywords(self, headlines: list) -> float:
        pos = neg = 0
        for h in headlines:
            words = set(h.lower().split())
            pos += len(words & POSITIVE_WORDS)
            neg += len(words & NEGATIVE_WORDS)
        total = pos + neg
        if total == 0:
            return 0.0
        return (pos - neg) / total  # in [-1, 1]

    def _analyze_with_llm(self, headlines: list):
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": (
                            "Score the aggregate sentiment of these headlines toward the "
                            "company's stock on a scale from -1 (very negative) to 1 (very "
                            "positive). Respond ONLY with JSON: {\"score\": number}."
                        )},
                        {"role": "user", "content": "\n".join(headlines)},
                    ],
                    "temperature": 0.0,
                },
                timeout=15,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return float(json.loads(content)["score"])
        except Exception:
            return None
