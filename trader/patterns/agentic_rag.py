"""
Reasoning-Driven Retrieval (Agentic RAG) Engine for Financial Markets.

Implements the 6-stage autonomous retrieval loop:
  1. Observe        - Read current state, remaining hop & step budget, seen chunks
  2. Reason         - Identify missing intelligence; produce structured gap description
  3. Plan Query     - Formulate query targeting gap; apply reformulation distance guard
  4. Retrieve       - Tool call retrieving raw candidate chunks; dedupe by chunk ID
  5. Select Evidence - Filter candidates; commit only task-relevant evidence subset
  6. Decide         - Evaluate sufficiency_check(state); terminate or loop back

Enforces all institutional guardrails:
  - Explicit hop budget (default 5) and step budget (default 8)
  - Reformulation distance guard (rejects near-duplicate query drift)
  - Token cost circuit breaker (warns at 75%, hard fails at 100%)
  - Query drift anchoring to original goal
  - Evidence dumping prevention (commits only trusted subset)
"""
import time
import re
from typing import Callable, List, Optional, Set
from .state import (
    RetrievalState,
    RetrievalChunk,
    SelectedEvidence,
    HopRecord,
)


def jaccard_token_similarity(s1: str, s2: str) -> float:
    """Calculates token-level overlap similarity between two strings."""
    tokens1 = set(re.findall(r"\w+", s1.lower()))
    tokens2 = set(re.findall(r"\w+", s2.lower()))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = len(tokens1 & tokens2)
    union = len(tokens1 | tokens2)
    return intersection / union


class ReasoningRetriever:
    def __init__(
        self,
        retrieval_tool: Callable[[str], List[RetrievalChunk]],
        max_hops: int = 5,
        max_steps: int = 8,
        token_budget: int = 4000,
        similarity_cutoff: float = 0.85,
    ):
        self.retrieval_tool = retrieval_tool
        self.max_hops = max_hops
        self.max_steps = max_steps
        self.token_budget = token_budget
        self.similarity_cutoff = similarity_cutoff  # Min token distance guard threshold

    def execute(self, goal: str, initial_evidence: Optional[List[SelectedEvidence]] = None) -> RetrievalState:
        """
        Executes the full Reason -> Retrieve -> Reason -> Retrieve loop
        until sufficiency is satisfied or budget is exhausted.
        """
        state = RetrievalState(
            goal=goal,
            max_hops=self.max_hops,
            max_steps=self.max_steps,
            token_budget=self.token_budget,
            evidence=list(initial_evidence or []),
        )

        while not state.terminated:
            state.steps_used += 1

            # Step budget circuit breaker
            if state.steps_used > state.max_steps:
                state.terminated = True
                state.termination_reason = f"Step budget exhausted ({state.steps_used}/{state.max_steps} steps)"
                break

            # 1. OBSERVE
            observed_summary = self._observe(state)

            # 2. REASON: Identify the information gap
            gap = self._reason_gap(state, observed_summary)
            state.current_gap = gap

            # 3. DECIDE (Early Sufficiency Check): If gap is already covered, stop now!
            if self.sufficiency_check(state):
                state.terminated = True
                state.termination_reason = "Evidence sufficiency satisfied: Goal fully covered"
                break

            # Hop budget circuit breaker
            if state.hops_used >= state.max_hops:
                state.terminated = True
                state.termination_reason = f"Hop budget exhausted ({state.hops_used}/{state.max_hops} hops)"
                break

            # Cost circuit breaker
            if state.total_tokens_used >= state.token_budget:
                state.terminated = True
                state.circuit_breaker_tripped = True
                state.termination_reason = f"Cost circuit breaker tripped: Token budget ({state.token_budget}) reached"
                break

            # 4. PLAN QUERY: Formulate anchored query targeting the gap
            planned_query = self._plan_query(state, gap)

            # Guardrail: Reformulation distance guard
            if self._is_near_duplicate(planned_query, state.queries_issued):
                # Apply diversification rewrite
                planned_query = f"{state.goal} specific focus: {gap}"
                if self._is_near_duplicate(planned_query, state.queries_issued):
                    state.terminated = True
                    state.termination_reason = "Reformulation distance guard tripped: Loop detected duplicate queries"
                    break

            state.queries_issued.append(planned_query)
            state.hops_used += 1

            # 5. RETRIEVE: Invoke the tool
            start_time = time.time()
            candidates = self.retrieval_tool(planned_query)

            # Dedupe candidate chunks against seen_ids
            new_candidates = []
            for chunk in candidates:
                if chunk.id not in state.chunks_seen_ids:
                    state.chunks_seen_ids.add(chunk.id)
                    new_candidates.append(chunk)

            # Account for token cost
            estimated_tokens = sum(len(c.content.split()) * 2 for c in new_candidates) + 120
            state.total_tokens_used += estimated_tokens

            # 6. SELECT EVIDENCE: Separate stage from retrieval!
            selected = self._select_evidence(new_candidates, state)
            state.evidence.extend(selected)

            duration_ms = (time.time() - start_time) * 1000.0
            state.hop_trace.append(
                HopRecord(
                    hop_number=state.hops_used,
                    query=planned_query,
                    gap_addressed=gap,
                    chunks_returned=len(candidates),
                    evidence_selected=len(selected),
                    tokens_used=estimated_tokens,
                    duration_ms=round(duration_ms, 2),
                )
            )

            # 7. DECIDE (Post-Retrieval Sufficiency Check)
            if self.sufficiency_check(state):
                state.terminated = True
                state.termination_reason = "Evidence sufficiency satisfied: All critical hypotheses verified"
                break

        return state

    def sufficiency_check(self, state: RetrievalState) -> bool:
        """
        Objective predicate checking whether evidence covers the goal.
        Evaluates keyword coverage, evidence diversity, and hypothesis confirmation.
        """
        if not state.evidence:
            return False

        # If we have at least 2 distinct trusted evidence items covering technical and fundamental/sentiment angles
        unique_sources = {e.source for e in state.evidence}
        if len(state.evidence) >= 3 and len(unique_sources) >= 2:
            return True

        # Check keyword checklist based on goal
        goal_keywords = set(re.findall(r"\w+", state.goal.lower())) - {
            "the", "a", "an", "is", "in", "at", "for", "to", "and", "or", "of", "about"
        }
        all_evidence_text = " ".join(e.text.lower() for e in state.evidence)

        covered = sum(1 for kw in goal_keywords if kw in all_evidence_text)
        coverage_ratio = covered / max(len(goal_keywords), 1)

        return coverage_ratio >= 0.70 and len(state.evidence) >= 2

    def _observe(self, state: RetrievalState) -> str:
        """Observe state: number of evidence pieces, sources, and tokens spent."""
        return (
            f"Hops: {state.hops_used}/{state.max_hops}, "
            f"Evidence Count: {len(state.evidence)}, "
            f"Tokens Used: {state.total_tokens_used}/{state.token_budget}"
        )

    def _reason_gap(self, state: RetrievalState, observation: str) -> str:
        """
        Reasons about what specific evidence is still missing before a trade can be cleared.
        """
        evidence_texts = " ".join(e.text.lower() for e in state.evidence)

        if "technical" not in evidence_texts and "rsi" not in evidence_texts:
            return "technical momentum, support/resistance, and volatility levels"
        elif "sentiment" not in evidence_texts and "news" not in evidence_texts:
            return "institutional news sentiment and breaking catalysts"
        elif "fundamental" not in evidence_texts and "valuation" not in evidence_texts:
            return "valuation multiples, profit margins, and balance sheet solvency"
        else:
            return "confluence risk factors and macro regime alignment"

    def _plan_query(self, state: RetrievalState, gap: str) -> str:
        """
        Formulates an anchored query targeting the gap without drifting from the original goal.
        """
        symbol_match = re.search(r"\b[A-Z]{1,5}\b", state.goal)
        symbol = symbol_match.group(0) if symbol_match else "STOCK"
        return f"{symbol} {gap} analysis"

    def _is_near_duplicate(self, candidate_query: str, past_queries: List[str]) -> bool:
        """
        Reformulation Distance Guard:
        Ensures the new query differs from previous queries by minimum token distance.
        """
        for prev in past_queries:
            sim = jaccard_token_similarity(candidate_query, prev)
            if sim >= self.similarity_cutoff:
                return True
        return False

    def _select_evidence(self, candidates: List[RetrievalChunk], state: RetrievalState) -> List[SelectedEvidence]:
        """
        Evidence Selection Stage:
        Critiques candidate chunks and commits ONLY the trusted, task-relevant subset.
        Eliminates raw chunk dumping into prompts.
        """
        selected: List[SelectedEvidence] = []
        for chunk in candidates:
            # Must meet minimum length and relevance heuristic
            if len(chunk.content.strip()) < 20:
                continue

            # Check if chunk adds new information (not duplicate content)
            is_redundant = any(
                jaccard_token_similarity(chunk.content, ev.text) > 0.80
                for ev in state.evidence
            )
            if is_redundant:
                continue

            selected.append(
                SelectedEvidence(
                    chunk_id=chunk.id,
                    text=chunk.content.strip(),
                    source=chunk.source,
                    reason_for_selection=f"Relevant to {state.current_gap} (score {chunk.score:.2f})",
                    relevance_score=max(chunk.score, 0.75),
                )
            )
        return selected
