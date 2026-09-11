"""
Reflexive Memory (Cross-Run Learning) for Quantitative Trading Swarm.

Persists lessons, failure modes, and post-mortems across trading sessions so that
future runs start with empirical priors.
Reflexive memory is a policy across runs, modifying state at run t+1 based on reflection at run t.
"""
import json
import os
from typing import Dict, List, Optional
from .state import ReflexiveLesson


class ReflexiveMemory:
    def __init__(self, memory_path: str = "memory/reflexive_lessons.json"):
        self.memory_path = memory_path
        self._ensure_storage()

    def _ensure_storage(self):
        os.makedirs(os.path.dirname(self.memory_path), exist_ok=True)
        if not os.path.exists(self.memory_path):
            with open(self.memory_path, "w") as f:
                json.dump([], f, indent=2)

    def record_lesson(
        self,
        symbol: str,
        setup_type: str,
        outcome: str,
        win_probability_at_entry: float,
        post_mortem: str,
        realized_pnl: float = 0.0,
        prior_adjustment: Optional[Dict[str, float]] = None,
    ) -> ReflexiveLesson:
        """Records a new post-trade or post-session lesson to persistent memory."""
        lesson = ReflexiveLesson(
            symbol=symbol,
            setup_type=setup_type,
            outcome=outcome,
            realized_pnl=realized_pnl,
            win_probability_at_entry=win_probability_at_entry,
            post_mortem=post_mortem,
            prior_adjustment=prior_adjustment or {},
        )

        lessons = self.get_all_lessons()
        lessons.append(lesson)

        # Keep last 500 lessons
        if len(lessons) > 500:
            lessons = lessons[-500:]

        with open(self.memory_path, "w") as f:
            json.dump([l.model_dump() for l in lessons], f, indent=2)

        return lesson

    def get_all_lessons(self) -> List[ReflexiveLesson]:
        try:
            with open(self.memory_path, "r") as f:
                data = json.load(f)
                return [ReflexiveLesson(**item) for item in data]
        except Exception:
            return []

    def get_relevant_lessons(
        self,
        symbol: Optional[str] = None,
        setup_type: Optional[str] = None,
        limit: int = 5,
    ) -> List[ReflexiveLesson]:
        """Queries lessons relevant to a symbol or setup type to inform current plan."""
        lessons = self.get_all_lessons()
        filtered = []
        for l in reversed(lessons):
            if symbol and l.symbol.upper() == symbol.upper():
                filtered.append(l)
            elif setup_type and l.setup_type.upper() == setup_type.upper():
                filtered.append(l)

        return filtered[:limit] if filtered else lessons[-limit:]

    def calculate_prior_adjustment(self, symbol: str) -> float:
        """
        Computes a Bayesian prior correction factor in [-0.10, +0.05] based on
        past historical execution outcomes for this asset.
        """
        relevant = self.get_relevant_lessons(symbol=symbol, limit=10)
        if not relevant:
            return 0.0

        wins = sum(1 for l in relevant if l.outcome == "PROFIT")
        losses = sum(1 for l in relevant if l.outcome == "LOSS")
        total = wins + losses

        if total == 0:
            return 0.0

        win_rate = wins / total
        # If past win rate was exceptional (>75%), small positive kicker (+0.03)
        # If past win rate was poor (<40%), conservative penalty (-0.08)
        if win_rate >= 0.75:
            return 0.03
        elif win_rate <= 0.40:
            return -0.08
        return 0.0
