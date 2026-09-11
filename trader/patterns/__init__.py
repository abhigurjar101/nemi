"""
Agent Design Patterns & Composed Cascades package.
"""
from .state import (
    RetrievalState,
    RetrievalChunk,
    SelectedEvidence,
    HopRecord,
    TradePlan,
    CriticFeedback,
    VerifierResult,
    ReflexiveLesson,
)
from .agentic_rag import ReasoningRetriever, jaccard_token_similarity
from .cascade import (
    TradeGenerator,
    TradeCritic,
    TradeVerifier,
    ComposedTradingCascade,
)
from .reflexive_memory import ReflexiveMemory

__all__ = [
    "RetrievalState",
    "RetrievalChunk",
    "SelectedEvidence",
    "HopRecord",
    "TradePlan",
    "CriticFeedback",
    "VerifierResult",
    "ReflexiveLesson",
    "ReasoningRetriever",
    "jaccard_token_similarity",
    "TradeGenerator",
    "TradeCritic",
    "TradeVerifier",
    "ComposedTradingCascade",
    "ReflexiveMemory",
]
