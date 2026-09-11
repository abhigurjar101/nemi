"""
Agent 5 — Strategy Agent (Signal Ensemble)

Waits until it has technical, sentiment, and fundamental scores for a symbol,
then combines them into one weighted signal: BUY / SELL / HOLD + confidence.
This is the "decision maker" — every other analytical agent feeds it, and it
feeds the Risk Agent.
"""
from bus import EventBus
from config import Config


class StrategyAgent:
    def __init__(self, bus: EventBus, config: Config):
        self.bus = bus
        self.config = config
        self._cache = {}  # symbol -> partial scores collected so far
        self.bus.subscribe("technical_indicators", self._on_component)
        self.bus.subscribe("sentiment", self._on_component)
        self.bus.subscribe("fundamentals", self._on_component)

    def _on_component(self, payload):
        symbol = payload["symbol"]
        entry = self._cache.setdefault(symbol, {})
        if "technical_score" in payload:
            entry["technical_score"] = payload["technical_score"]
        elif "headline_count" in payload:
            entry["sentiment_score"] = payload["score"]
        elif "raw" in payload:
            entry["fundamental_score"] = payload["score"]

        if all(k in entry for k in ("technical_score", "sentiment_score", "fundamental_score")):
            signal = self.combine(entry["technical_score"], entry["sentiment_score"], entry["fundamental_score"])
            self.bus.publish("strategy_signal", {"symbol": symbol, **signal})
            del self._cache[symbol]

    def calculate_win_probability(
        self, technical_score: float, sentiment_score: float, fundamental_score: float, composite: float
    ) -> float:
        """
        Multi-factor Bayesian win probability model.
        Returns estimated win probability in [0.10, 0.95].
        A trade requires high composite score + directional confluence across
        technical, sentiment, and fundamental agents to reach >= 70% (0.70).
        """
        # Baseline prior in liquid markets (random walk expectation)
        prob = 0.50

        # Magnitude factor: stronger composite signal pushes edge up by up to 22%
        prob += 0.22 * min(abs(composite), 1.0)

        # Directional confluence analysis across active signals
        scores = [technical_score, sentiment_score, fundamental_score]
        bullish_count = sum(1 for s in scores if s >= 0.05)
        bearish_count = sum(1 for s in scores if s <= -0.05)
        neutral_count = sum(1 for s in scores if abs(s) < 0.05)

        target_direction = 1 if composite > 0 else (-1 if composite < 0 else 0)

        if target_direction == 1:
            if bullish_count == 3:
                prob += 0.15  # unanimous 3-agent bullish confluence
            elif bullish_count == 2 and neutral_count == 1:
                prob += 0.08  # strong 2-agent alignment with 1 neutral
            elif bearish_count > 0:
                prob -= 0.18  # conflict penalty (e.g. bearish divergence)
        elif target_direction == -1:
            if bearish_count == 3:
                prob += 0.15  # unanimous 3-agent bearish confluence
            elif bearish_count == 2 and neutral_count == 1:
                prob += 0.08  # strong 2-agent alignment with 1 neutral
            elif bullish_count > 0:
                prob -= 0.18  # conflict penalty
        else:
            prob = 0.50

        # Technical conviction kicker: strong trend/momentum alignment adds edge
        if abs(technical_score) >= 0.75:
            prob += 0.05

        # Clamp cleanly to empirical limits [0.10, 0.95]
        return round(max(0.10, min(0.95, prob)), 4)

    def combine(self, technical_score: float, sentiment_score: float, fundamental_score: float) -> dict:
        composite = (
            self.config.weight_technical * technical_score
            + self.config.weight_sentiment * sentiment_score
            + self.config.weight_fundamental * fundamental_score
        )
        confidence = min(abs(composite), 1.0)
        win_prob = self.calculate_win_probability(
            technical_score, sentiment_score, fundamental_score, composite
        )

        min_win_prob = getattr(self.config, "min_win_probability", 0.70)
        min_conf = getattr(self.config, "confidence_threshold", 0.70)

        # Strict Gatekeeper: Trade is ONLY executed if win_probability >= 70%
        if win_prob < min_win_prob:
            signal = "HOLD"
            gatekeeper_reason = (
                f"Win probability ({win_prob:.1%}) below required {min_win_prob:.0%} threshold"
            )
        elif confidence < min_conf:
            signal = "HOLD"
            gatekeeper_reason = (
                f"Confidence ({confidence:.1%}) below required {min_conf:.0%} threshold"
            )
        elif composite > 0:
            signal = "BUY"
            gatekeeper_reason = f"High-conviction BUY: Win prob {win_prob:.1%} >= {min_win_prob:.0%}"
        elif composite < 0:
            signal = "SELL"
            gatekeeper_reason = f"High-conviction SELL: Win prob {win_prob:.1%} >= {min_win_prob:.0%}"
        else:
            signal = "HOLD"
            gatekeeper_reason = "Neutral composite score"

        return {
            "signal": signal,
            "confidence": round(confidence, 3),
            "win_probability": round(win_prob, 4),
            "is_high_conviction": bool(win_prob >= min_win_prob),
            "composite_score": round(composite, 3),
            "components": {
                "technical": round(technical_score, 3),
                "sentiment": round(sentiment_score, 3),
                "fundamental": round(fundamental_score, 3),
            },
            "gatekeeper_reason": gatekeeper_reason,
        }

