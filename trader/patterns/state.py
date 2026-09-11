"""
State schemas and first-class artifacts for Reasoning-Driven Retrieval (Agentic RAG)
and Composed Agent Design Patterns (Planner-Executor, Generator-Critic-Verifier, Reflexive Memory).
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field


class RetrievalChunk(BaseModel):
    """Raw material returned by a retriever before evidence selection."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str
    source: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    score: float = 0.0


class SelectedEvidence(BaseModel):
    """Trusted, task-relevant subset of chunks committed to the evidence state."""
    chunk_id: str
    text: str
    source: str
    reason_for_selection: str
    relevance_score: float = 1.0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class HopRecord(BaseModel):
    """Immutable trace record for an individual retrieval hop in the agent loop."""
    hop_number: int
    query: str
    gap_addressed: str
    chunks_returned: int
    evidence_selected: int
    tokens_used: int
    duration_ms: float
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RetrievalState(BaseModel):
    """
    Explicit retrieval state maintained across multi-hop reasoning iterations.
    Enforces step budgets, hop budgets, and token circuit breakers.
    """
    goal: str
    hops_used: int = 0
    max_hops: int = 5
    steps_used: int = 0
    max_steps: int = 8
    queries_issued: List[str] = Field(default_factory=list)
    chunks_seen_ids: Set[str] = Field(default_factory=set)
    evidence: List[SelectedEvidence] = Field(default_factory=list)
    current_gap: str = ""
    terminated: bool = False
    termination_reason: str = ""
    total_tokens_used: int = 0
    token_budget: int = 4000
    circuit_breaker_tripped: bool = False
    hop_trace: List[HopRecord] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True


class TradePlan(BaseModel):
    """First-class structured artifact produced by the Planner node."""
    plan_id: str = Field(default_factory=lambda: f"PLAN-{uuid.uuid4().hex[:8].upper()}")
    symbol: str
    goal: str
    hypothesis: str
    required_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    analytical_milestones: List[str] = Field(default_factory=list)
    status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED, REJECTED
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CriticFeedback(BaseModel):
    """Subjective quality score and suggestions from the Critic node."""
    score: float  # 0.0 to 10.0 scale
    threshold: float = 8.0
    critique: str
    suggestions: List[str] = Field(default_factory=list)
    revision_count: int = 0
    max_revisions: int = 3
    passed: bool = False


class VerifierResult(BaseModel):
    """
    Objective pass/fail constraint verification from the Verifier node.
    Verifiers gate; they never rewrite.
    """
    passed: bool
    win_probability: float
    min_win_probability_required: float = 0.70
    checks: Dict[str, bool] = Field(default_factory=dict)
    violations: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ReflexiveLesson(BaseModel):
    """Persistent cross-run memory record that informs subsequent agent runs."""
    lesson_id: str = Field(default_factory=lambda: f"LSN-{uuid.uuid4().hex[:8].upper()}")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    symbol: str
    setup_type: str
    outcome: str  # "PROFIT", "LOSS", "GATEKEEPER_PREVENTED_LOSS"
    realized_pnl: float = 0.0
    win_probability_at_entry: float
    post_mortem: str
    prior_adjustment: Dict[str, float] = Field(default_factory=dict)
