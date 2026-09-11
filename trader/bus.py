"""
Minimal synchronous pub/sub event bus.

This is the "nervous system" connecting all 10 agents. Rather than agents
calling each other directly (tight coupling), each agent publishes what it
learned onto the bus, and any agent that cares subscribes to that topic.
This makes it trivial to add an 11th agent later without touching the others.
"""
from collections import defaultdict
from typing import Callable, Any, Dict, List


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Any], None]]] = defaultdict(list)
        self._history: List[tuple] = []  # (topic, payload) audit trail

    def subscribe(self, topic: str, handler: Callable[[Any], None]) -> None:
        self._subscribers[topic].append(handler)

    def publish(self, topic: str, payload: Any) -> None:
        self._history.append((topic, payload))
        for handler in self._subscribers.get(topic, []):
            handler(payload)

    def history(self) -> List[tuple]:
        return self._history
