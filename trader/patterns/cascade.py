"""
Composed Agent Cascades and Patterns for World-Class Quantitative Trading.

Implements:
  1. Planner-Executor (structured TradePlan first-class artifact)
  2. Generator Node (drafts trade setup thesis)
  3. Critic Node (subjective 0-10 quality scorer with explicit exit threshold)
  4. Verifier Node (objective pass/fail constraint checker enforcing the 70%+ win rate gatekeeper)
  5. Composed Cascade: Generator -> Critic Revision Loop -> Verifier Gate -> Dispatch
"""
from typing import Any, Dict, List, Optional
from .state import (
    TradePlan,
    CriticFeedback,
    VerifierResult,
)


class TradeGenerator:
    """Generator Node: synthesizes indicators and market intelligence into a trade setup."""
    def generate(
        self,
        symbol: str,
        technical_data: dict,
        sentiment_data: dict,
        fundamental_data: dict,
        win_probability: float,
        revision_feedback: Optional[CriticFeedback] = None,
    ) -> dict:
        tech_score = technical_data.get("technical_score", 0.0)
        sent_score = sentiment_data.get("score", 0.0)
        fund_score = fundamental_data.get("score", 0.0)

        # Apply revision feedback adjustments if provided by Critic
        direction = "BUY" if (tech_score + sent_score + fund_score) > 0 else "SELL"
        if revision_feedback and "tighten" in " ".join(revision_feedback.suggestions).lower():
            stop_mult = 1.2
            target_mult = 2.5
        else:
            stop_mult = 1.5
            target_mult = 3.0

        price = technical_data.get("last_price", 100.0)
        atr = technical_data.get("atr14", 2.0)
        stop_dist = atr * stop_mult

        if direction == "BUY":
            stop_price = round(price - stop_dist, 2)
            target_price = round(price + stop_dist * (target_mult / stop_mult), 2)
        else:
            stop_price = round(price + stop_dist, 2)
            target_price = round(price - stop_dist * (target_mult / stop_mult), 2)

        return {
            "symbol": symbol,
            "signal": direction,
            "price": price,
            "stop_price": stop_price,
            "target_price": target_price,
            "risk_reward_ratio": round(target_mult / stop_mult, 2),
            "win_probability": win_probability,
            "tech_score": tech_score,
            "sent_score": sent_score,
            "fund_score": fund_score,
            "thesis": (
                f"Multi-factor edge with {direction} conviction on {symbol}. "
                f"Technical score: {tech_score:.2f}, Sentiment: {sent_score:.2f}, Fundamentals: {fund_score:.2f}"
            ),
        }


class TradeCritic:
    """
    Critic Node: Subjective quality scorer (0-10 scale).
    Acts as the art teacher: 'This could be better, here is how.'
    Exits when score >= threshold or max revisions hit.
    """
    def __init__(self, pass_threshold: float = 8.0, max_revisions: int = 3):
        self.pass_threshold = pass_threshold
        self.max_revisions = max_revisions

    def critique(self, setup: dict, revision_count: int = 0) -> CriticFeedback:
        score = 5.0
        critique_points = []
        suggestions = []

        rr = setup.get("risk_reward_ratio", 1.5)
        if rr >= 2.0:
            score += 2.0
            critique_points.append("Favorable asymmetric Risk-to-Reward ratio (>= 2.0).")
        else:
            critique_points.append("Sub-optimal Risk-to-Reward ratio (< 2.0).")
            suggestions.append("Tighten stop distance to improve risk-reward asymmetry.")

        win_prob = setup.get("win_probability", 0.50)
        if win_prob >= 0.70:
            score += 2.5
            critique_points.append(f"Strong Bayesian win edge ({win_prob:.1%}).")
        else:
            score -= 2.0
            critique_points.append(f"Insufficient statistical edge ({win_prob:.1%} < 70%).")
            suggestions.append("Wait for unanimous 3-agent confluence before entering.")

        # Check directional alignment between tech, sentiment, and fundamentals
        scores = [setup.get("tech_score", 0), setup.get("sent_score", 0), setup.get("fund_score", 0)]
        pos = sum(1 for s in scores if s > 0.05)
        neg = sum(1 for s in scores if s < -0.05)

        if pos == 3 or neg == 3:
            score += 1.0
            critique_points.append("Unanimous directional alignment across all 3 analytical pillars.")
        elif pos > 0 and neg > 0:
            score -= 1.5
            critique_points.append("Warning: Cross-pillar divergence detected between technicals and fundamentals.")
            suggestions.append("Reduce position size or wait for fundamental realignment.")

        score = max(0.0, min(10.0, round(score, 1)))
        passed = score >= self.pass_threshold

        return CriticFeedback(
            score=score,
            threshold=self.pass_threshold,
            critique=" ".join(critique_points),
            suggestions=suggestions,
            revision_count=revision_count,
            max_revisions=self.max_revisions,
            passed=passed,
        )


class TradeVerifier:
    """
    Verifier Node: Objective constraint checker.
    Acts as security: 'Pass or do not pass.'
    Verifiers gate; they do NOT rewrite.
    Enforces the formal spec and the strict 70%+ Win Probability Gatekeeper.
    """
    def __init__(self, min_win_probability: float = 0.70, max_portfolio_heat: float = 0.06):
        self.min_win_probability = min_win_probability
        self.max_portfolio_heat = max_portfolio_heat

    def verify(
        self,
        setup: dict,
        portfolio_snapshot: Optional[dict] = None,
    ) -> VerifierResult:
        violations: List[str] = []
        checks: Dict[str, bool] = {}

        # 1. Parameter & Schema Validity
        schema_valid = (
            bool(setup.get("symbol"))
            and setup.get("price", 0) > 0
            and setup.get("stop_price", 0) > 0
            and setup.get("target_price", 0) > 0
            and setup.get("signal") in ("BUY", "SELL")
        )
        checks["schema_valid"] = schema_valid
        if not schema_valid:
            violations.append("Invalid order parameters or missing price levels.")

        # 2. Stop Distance Validity
        price = setup.get("price", 0)
        stop = setup.get("stop_price", 0)
        target = setup.get("target_price", 0)
        signal = setup.get("signal")

        if signal == "BUY":
            price_order_valid = stop < price < target
        else:
            price_order_valid = target < price < stop

        checks["bracket_geometry_valid"] = price_order_valid
        if not price_order_valid:
            violations.append(f"Inverted bracket geometry for {signal} (Price: {price}, Stop: {stop}, Target: {target}).")

        # 3. Portfolio Heat & Drawdown Check
        portfolio = portfolio_snapshot or {"open_positions": 0, "daily_pnl_pct": 0.0}
        daily_loss = portfolio.get("daily_pnl_pct", 0.0)
        loss_limit_ok = daily_loss > -0.03  # 3% circuit breaker
        checks["circuit_breaker_safe"] = loss_limit_ok
        if not loss_limit_ok:
            violations.append(f"Daily drawdown limit reached ({daily_loss:.2%}). All trading halted.")

        # 4. Strict 70%+ Win Probability Gatekeeper
        win_prob = setup.get("win_probability", 0.0)
        win_prob_ok = win_prob >= self.min_win_probability
        checks["win_probability_ge_70"] = win_prob_ok
        if not win_prob_ok:
            violations.append(
                f"STRICT GATEKEEPER VIOLATION: Win probability ({win_prob:.1%}) is below the required "
                f"{self.min_win_probability:.0%} high-conviction threshold."
            )

        passed = len(violations) == 0

        return VerifierResult(
            passed=passed,
            win_probability=win_prob,
            min_win_probability_required=self.min_win_probability,
            checks=checks,
            violations=violations,
        )


class ComposedTradingCascade:
    """
    Full Composed Cascade:
      Plan -> Generator -> Critic Loop -> Verifier Gate -> Execution Decision.
    """
    def __init__(
        self,
        min_win_probability: float = 0.70,
        critic_threshold: float = 8.0,
        max_revisions: int = 3,
    ):
        self.generator = TradeGenerator()
        self.critic = TradeCritic(pass_threshold=critic_threshold, max_revisions=max_revisions)
        self.verifier = TradeVerifier(min_win_probability=min_win_probability)

    def execute(
        self,
        symbol: str,
        technical_data: dict,
        sentiment_data: dict,
        fundamental_data: dict,
        win_probability: float,
        portfolio_snapshot: Optional[dict] = None,
    ) -> dict:
        """
        Executes the Composed Cascade:
          1. Generator produces initial draft
          2. Critic evaluates subjective polish and edge (iterative loop)
          3. Verifier strictly gates pass/fail against 70%+ gatekeeper
        """
        plan = TradePlan(
            symbol=symbol,
            goal=f"Evaluate institutional trade clearance for {symbol}",
            hypothesis=f"Assess high-conviction opportunity with P(Win)={win_probability:.1%}",
            required_evidence=[
                {"name": "technical_confirmation", "satisfied": bool(technical_data)},
                {"name": "sentiment_catalysts", "satisfied": bool(sentiment_data)},
                {"name": "fundamental_solvency", "satisfied": bool(fundamental_data)},
            ],
            analytical_milestones=["draft_setup", "critic_review", "verifier_gate"],
            status="IN_PROGRESS",
        )

        current_setup = None
        critic_feedback = None
        revision_count = 0

        # Generator + Critic Loop
        while revision_count < self.critic.max_revisions:
            current_setup = self.generator.generate(
                symbol=symbol,
                technical_data=technical_data,
                sentiment_data=sentiment_data,
                fundamental_data=fundamental_data,
                win_probability=win_probability,
                revision_feedback=critic_feedback,
            )

            critic_feedback = self.critic.critique(current_setup, revision_count=revision_count)
            if critic_feedback.passed or revision_count == self.critic.max_revisions - 1:
                break
            revision_count += 1

        # Verifier Gate (Objective pass/fail against formal spec)
        verifier_result = self.verifier.verify(current_setup, portfolio_snapshot=portfolio_snapshot)

        plan.status = "COMPLETED" if verifier_result.passed else "REJECTED"

        return {
            "symbol": symbol,
            "plan": plan.model_dump(),
            "final_setup": current_setup,
            "critic_feedback": critic_feedback.model_dump() if critic_feedback else None,
            "verifier_result": verifier_result.model_dump(),
            "approved_for_execution": verifier_result.passed,
            "summary": (
                f"Trade proposal {symbol}: {'APPROVED (>=70% Win Prob)' if verifier_result.passed else 'REJECTED by Verifier'}. "
                f"Critic Score: {critic_feedback.score if critic_feedback else 0}/10. "
                f"Win Probability: {verifier_result.win_probability:.1%}."
            ),
        }
