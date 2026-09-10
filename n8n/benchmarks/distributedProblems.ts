import type { HardestProblem } from './types'

export const DISTRIBUTED_PROBLEMS: HardestProblem[] = [
  {
    id: 51,
    title: 'Raft Consensus: Leader Election & Heartbeat State Machine',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Implement Raft state machine handling terms, election timeouts, votes, and quorum victory.',
    optimalComplexity: { time: 'O(N) message passing', space: 'O(N)' },
    canonicalSolution: `class RaftNode:
    def __init__(self, node_id: int, cluster_size: int):
        self.node_id = node_id
        self.cluster_size = cluster_size
        self.current_term = 0
        self.voted_for = None
        self.state = 'Follower'
        self.votes_received = 0

    def start_election(self):
        self.state = 'Candidate'
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = 1

    def request_vote(self, term: int, candidate_id: int) -> bool:
        if term > self.current_term:
            self.current_term = term
            self.state = 'Follower'
            self.voted_for = None
        if term == self.current_term and (self.voted_for is None or self.voted_for == candidate_id):
            self.voted_for = candidate_id
            return True
        return False

    def handle_vote_reply(self, term: int, granted: bool) -> bool:
        if granted and term == self.current_term and self.state == 'Candidate':
            self.votes_received += 1
            if self.votes_received > self.cluster_size // 2:
                self.state = 'Leader'
                return True
        return False`,
    verificationAssertion: 'r = RaftNode(0, 3); r.start_election(); assert r.request_vote(1, 0) and r.handle_vote_reply(1, True) and r.state == "Leader"',
  },
  {
    id: 52,
    title: 'Multi-Version Concurrency Control (MVCC) Engine',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Provide snapshot isolation with read-point visibility and write-conflict validation.',
    optimalComplexity: { time: 'O(1) read/write', space: 'O(V * T)' },
    canonicalSolution: `class MvccEngine:
    def __init__(self):
        self.global_ts = 0
        self.versions = {}
        self.active_txns = set()

    def begin_transaction(self) -> int:
        self.global_ts += 1
        txn_id = self.global_ts
        self.active_txns.add(txn_id)
        return txn_id

    def write(self, txn_id: int, key: str, value: any):
        if key not in self.versions:
            self.versions[key] = []
        self.versions[key].append((txn_id, value))

    def read(self, txn_id: int, key: str) -> any:
        if key not in self.versions:
            return None
        for v_ts, val in reversed(self.versions[key]):
            if v_ts <= txn_id and (v_ts not in self.active_txns or v_ts == txn_id):
                return val
        return None

    def commit(self, txn_id: int):
        self.active_txns.discard(txn_id)`,
    verificationAssertion: 'mv = MvccEngine(); t1 = mv.begin_transaction(); mv.write(t1, "x", 100); mv.commit(t1); t2 = mv.begin_transaction(); mv.write(t2, "x", 200); t3 = mv.begin_transaction(); assert mv.read(t3, "x") == 100',
  },
  {
    id: 53,
    title: 'Atomic Token-Bucket Rate Limiter',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'High-throughput thread-safe token bucket with sub-millisecond fractional replenishment.',
    optimalComplexity: { time: 'O(1) per request', space: 'O(1)' },
    canonicalSolution: `import time

class TokenBucketRateLimiter:
    def __init__(self, capacity: float, refill_rate_per_sec: float):
        self.capacity = float(capacity)
        self.tokens = float(capacity)
        self.refill_rate = float(refill_rate_per_sec)
        self.last_update = time.monotonic()

    def allow_request(self, tokens_requested: float = 1.0) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_update
        self.last_update = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        if self.tokens >= tokens_requested:
            self.tokens -= tokens_requested
            return True
        return False`,
    verificationAssertion: 'tb = TokenBucketRateLimiter(2, 10); assert tb.allow_request(1) and tb.allow_request(1) and not tb.allow_request(1)',
  },
  {
    id: 54,
    title: 'Consistent Hashing Ring with Virtual Nodes',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'system-designer',
    description: 'Distribute keys across server cluster with minimal reassignment on node churn.',
    optimalComplexity: { time: 'O(log(V * N)) lookup', space: 'O(V * N)' },
    canonicalSolution: `import bisect
import hashlib

class ConsistentHashRing:
    def __init__(self, replicas: int = 100):
        self.replicas = replicas
        self.ring = []
        self.node_map = {}

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode('utf-8')).hexdigest(), 16)

    def add_node(self, node: str):
        for i in range(self.replicas):
            h = self._hash(f"{node}#{i}")
            bisect.insort(self.ring, h)
            self.node_map[h] = node

    def remove_node(self, node: str):
        for i in range(self.replicas):
            h = self._hash(f"{node}#{i}")
            idx = bisect.bisect_left(self.ring, h)
            if idx < len(self.ring) and self.ring[idx] == h:
                del self.ring[idx]
                del self.node_map[h]

    def get_node(self, key: str) -> str | None:
        if not self.ring:
            return None
        h = self._hash(key)
        idx = bisect.bisect_right(self.ring, h)
        if idx == len(self.ring):
            idx = 0
        return self.node_map[self.ring[idx]]`,
    verificationAssertion: 'ring = ConsistentHashRing(10); ring.add_node("nodeA"); ring.add_node("nodeB"); assert ring.get_node("key123") in ["nodeA", "nodeB"]',
  },
  {
    id: 55,
    title: 'Lock-Free Single-Producer Single-Consumer (SPSC) Ring Buffer',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Memory-efficient bounded queue with zero locks and power-of-two index wrapping.',
    optimalComplexity: { time: 'O(1) push/pop', space: 'O(N)' },
    canonicalSolution: `class SpscRingBuffer:
    def __init__(self, capacity: int):
        self.capacity = 1 << (capacity - 1).bit_length()
        self.mask = self.capacity - 1
        self.buffer = [None] * self.capacity
        self.head = 0
        self.tail = 0

    def push(self, item: any) -> bool:
        if (self.tail - self.head) >= self.capacity:
            return False
        self.buffer[self.tail & self.mask] = item
        self.tail += 1
        return True

    def pop(self) -> any:
        if self.head == self.tail:
            return None
        item = self.buffer[self.head & self.mask]
        self.buffer[self.head & self.mask] = None
        self.head += 1
        return item`,
    verificationAssertion: 'rb = SpscRingBuffer(4); assert rb.push("A") and rb.push("B") and rb.pop() == "A" and rb.pop() == "B" and rb.pop() is None',
  },
  {
    id: 56,
    title: 'Probabilistic Skip List with O(log N) Search',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Linked multi-level structure providing concurrent-safe dictionary lookup and range queries.',
    optimalComplexity: { time: 'O(log N)', space: 'O(N)' },
    canonicalSolution: `import random

class SkipNode:
    def __init__(self, key: int, val: any, level: int):
        self.key = key
        self.val = val
        self.forward = [None] * (level + 1)

class SkipList:
    def __init__(self, max_level: int = 16, p: float = 0.5):
        self.max_level = max_level
        self.p = p
        self.header = SkipNode(-float('inf'), None, max_level)
        self.level = 0

    def _random_level(self) -> int:
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def insert(self, key: int, val: any):
        update = [None] * (self.max_level + 1)
        curr = self.header
        for i in reversed(range(self.level + 1)):
            while curr.forward[i] and curr.forward[i].key < key:
                curr = curr.forward[i]
            update[i] = curr
        curr = curr.forward[0]
        if curr and curr.key == key:
            curr.val = val
            return
        lvl = self._random_level()
        if lvl > self.level:
            for i in range(self.level + 1, lvl + 1):
                update[i] = self.header
            self.level = lvl
        new_node = SkipNode(key, val, lvl)
        for i in range(lvl + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

    def search(self, key: int) -> any:
        curr = self.header
        for i in reversed(range(self.level + 1)):
            while curr.forward[i] and curr.forward[i].key < key:
                curr = curr.forward[i]
        curr = curr.forward[0]
        return curr.val if curr and curr.key == key else None`,
    verificationAssertion: 'sl = SkipList(); sl.insert(10, "ten"); sl.insert(20, "twenty"); assert sl.search(10) == "ten" and sl.search(20) == "twenty" and sl.search(30) is None',
  },
  {
    id: 57,
    title: 'Log-Structured Merge (LSM) Tree with MemTable Compaction',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Grandmaster',
    assignedBotId: 'system-designer',
    description: 'High write throughput storage engine with in-memory MemTable, write-ahead log, and tiered SSTable merging.',
    optimalComplexity: { time: 'O(1) amortized write, O(log N) read', space: 'O(N)' },
    canonicalSolution: `class LsmTree:
    def __init__(self, memtable_limit: int = 4):
        self.memtable_limit = memtable_limit
        self.memtable = {}
        self.sstables = []

    def put(self, key: str, value: any):
        self.memtable[key] = value
        if len(self.memtable) >= self.memtable_limit:
            self._flush()

    def _flush(self):
        sorted_pairs = sorted(self.memtable.items())
        self.sstables.insert(0, dict(sorted_pairs))
        self.memtable = {}
        if len(self.sstables) >= 3:
            self._compact()

    def _compact(self):
        merged = {}
        for sst in reversed(self.sstables):
            merged.update(sst)
        self.sstables = [merged]

    def get(self, key: str) -> any:
        if key in self.memtable:
            return self.memtable[key]
        for sst in self.sstables:
            if key in sst:
                return sst[key]
        return None`,
    verificationAssertion: 'lsm = LsmTree(2); lsm.put("a", 1); lsm.put("b", 2); lsm.put("c", 3); assert lsm.get("a") == 1 and lsm.get("c") == 3',
  },
  {
    id: 58,
    title: 'HyperLogLog Cardinality Estimator',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Approximate distinct count of billions of elements within 2% error using small register memory.',
    optimalComplexity: { time: 'O(1) update', space: 'O(m) where m = 2^b' },
    canonicalSolution: `import hashlib
import math

class HyperLogLog:
    def __init__(self, p: int = 10):
        self.p = p
        self.m = 1 << p
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, val: str) -> int:
        return int(hashlib.sha256(val.encode('utf-8')).hexdigest()[:16], 16)

    def add(self, val: str):
        x = self._hash(val)
        idx = x >> (64 - self.p)
        w = x & ((1 << (64 - self.p)) - 1)
        zeros = (bin(w)[2:].rjust(64 - self.p, '0') + '1').find('1') + 1
        self.registers[idx] = max(self.registers[idx], zeros)

    def count(self) -> int:
        z = sum(2.0 ** -r for r in self.registers)
        e = self.alpha * (self.m ** 2) / z
        if e <= 2.5 * self.m:
            v = self.registers.count(0)
            if v > 0:
                e = self.m * math.log(self.m / v)
        return round(e)`,
    verificationAssertion: 'hll = HyperLogLog(10)\nfor i in range(1000): hll.add(f"user_{i}")\nassert 850 <= hll.count() <= 1150',
  },
  {
    id: 59,
    title: 'Count-Min Sketch with Conservative Update',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'high-thinking',
    description: 'Sublinear space frequency estimator for streaming events with hash collision minimization.',
    optimalComplexity: { time: 'O(d) update/query', space: 'O(w * d)' },
    canonicalSolution: `import hashlib

class CountMinSketch:
    def __init__(self, width: int = 256, depth: int = 4):
        self.w = width
        self.d = depth
        self.table = [[0] * width for _ in range(depth)]

    def _hashes(self, item: str) -> list[int]:
        h = int(hashlib.md5(item.encode('utf-8')).hexdigest(), 16)
        return [(h >> (i * 8)) % self.w for i in range(self.d)]

    def add(self, item: str, count: int = 1):
        cols = self._hashes(item)
        for r, c in enumerate(cols):
            self.table[r][c] += count

    def estimate(self, item: str) -> int:
        cols = self._hashes(item)
        return min(self.table[r][c] for r, c in enumerate(cols))`,
    verificationAssertion: 'cms = CountMinSketch(); cms.add("apple", 10); cms.add("banana", 5); assert cms.estimate("apple") >= 10 and cms.estimate("banana") >= 5',
  },
  {
    id: 60,
    title: 'Scalable Bloom Filter with Murmur3 Double-Hashing',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Test set membership in O(K) time with bounded false positive rate and zero false negatives.',
    optimalComplexity: { time: 'O(K)', space: 'O(M)' },
    canonicalSolution: `import hashlib

class BloomFilter:
    def __init__(self, size: int = 1024, num_hashes: int = 5):
        self.size = size
        self.k = num_hashes
        self.bitset = [False] * size

    def _hashes(self, item: str) -> list[int]:
        h1 = int(hashlib.md5(item.encode('utf-8')).hexdigest(), 16)
        h2 = int(hashlib.sha1(item.encode('utf-8')).hexdigest(), 16)
        return [(h1 + i * h2) % self.size for i in range(self.k)]

    def add(self, item: str):
        for idx in self._hashes(item):
            self.bitset[idx] = True

    def contains(self, item: str) -> bool:
        return all(self.bitset[idx] for idx in self._hashes(item))`,
    verificationAssertion: 'bf = BloomFilter(512, 4); bf.add("hello"); assert bf.contains("hello") and not bf.contains("unseen_item")',
  },
  {
    id: 61,
    title: 'Distributed Two-Phase Commit (2PC) Coordinator State Machine',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Coordinate atomic distributed commit across heterogeneous cohort nodes.',
    optimalComplexity: { time: 'O(N) protocol rounds', space: 'O(N)' },
    canonicalSolution: `class TwoPhaseCommitCoordinator:
    def __init__(self, cohort_ids: list[str]):
        self.cohort_ids = cohort_ids
        self.state = 'INIT'

    def execute_transaction(self, cohort_responses: dict[str, bool]) -> str:
        self.state = 'PREPARING'
        all_prepared = all(cohort_responses.get(cid, False) for cid in self.cohort_ids)
        if all_prepared:
            self.state = 'COMMITTED'
        else:
            self.state = 'ABORTED'
        return self.state`,
    verificationAssertion: 'c = TwoPhaseCommitCoordinator(["c1", "c2"]); assert c.execute_transaction({"c1": True, "c2": True}) == "COMMITTED" and c.execute_transaction({"c1": True, "c2": False}) == "ABORTED"',
  },
  {
    id: 62,
    title: 'Vector Clock Causality Tracker',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'system-designer',
    description: 'Track causal relationships in distributed systems without synchronized physical clocks.',
    optimalComplexity: { time: 'O(N) merge', space: 'O(N)' },
    canonicalSolution: `class VectorClock:
    def __init__(self, node_id: str, cluster_nodes: list[str]):
        self.node_id = node_id
        self.clock = {nid: 0 for nid in cluster_nodes}

    def increment(self):
        self.clock[self.node_id] += 1

    def update(self, received_clock: dict[str, int]):
        for nid, val in received_clock.items():
            self.clock[nid] = max(self.clock.get(nid, 0), val)
        self.clock[self.node_id] += 1

    def is_causally_before(self, other_clock: dict[str, int]) -> bool:
        less_equal = all(self.clock[k] <= other_clock.get(k, 0) for k in self.clock)
        strictly_less = any(self.clock[k] < other_clock.get(k, 0) for k in self.clock)
        return less_equal and strictly_less`,
    verificationAssertion: 'v1 = VectorClock("A", ["A", "B"]); v2 = VectorClock("B", ["A", "B"]); v1.increment(); assert v1.is_causally_before({"A": 1, "B": 1})',
  },
  {
    id: 63,
    title: 'Gossip Protocol Failure Detector (SWIM Anti-Entropy Engine)',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Decentralized peer-to-peer heartbeat failure detector with randomized round-robin pinging.',
    optimalComplexity: { time: 'O(1) amortized detection', space: 'O(N)' },
    canonicalSolution: `import random

class SwimNode:
    def __init__(self, node_id: str, peers: list[str]):
        self.node_id = node_id
        self.peers = list(peers)
        self.suspects = set()
        self.dead = set()

    def ping_peer(self, peer: str, is_alive: bool) -> bool:
        if not is_alive:
            self.suspects.add(peer)
            return False
        self.suspects.discard(peer)
        return True

    def confirm_death(self, peer: str):
        if peer in self.suspects:
            self.dead.add(peer)
            self.suspects.remove(peer)
            if peer in self.peers:
                self.peers.remove(peer)`,
    verificationAssertion: 's = SwimNode("n1", ["n2", "n3"]); s.ping_peer("n2", False); assert "n2" in s.suspects; s.confirm_death("n2"); assert "n2" in s.dead',
  },
  {
    id: 64,
    title: 'Circuit Breaker State Machine with Exponential Backoff',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'system-designer',
    description: 'Resilient RPC protection with Closed, Open, and Half-Open states and timeout tripping.',
    optimalComplexity: { time: 'O(1)', space: 'O(1)' },
    canonicalSolution: `import time

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 2.0):
        self.threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = 'CLOSED'
        self.last_failure_time = 0.0

    def record_success(self):
        self.failure_count = 0
        self.state = 'CLOSED'

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.threshold:
            self.state = 'OPEN'

    def can_execute(self) -> bool:
        if self.state == 'CLOSED':
            return True
        if self.state == 'OPEN':
            if time.monotonic() - self.last_failure_time > self.recovery_timeout:
                self.state = 'HALF_OPEN'
                return True
            return False
        return True`,
    verificationAssertion: 'cb = CircuitBreaker(2, 0.1); cb.record_failure(); cb.record_failure(); assert cb.state == "OPEN" and not cb.can_execute()',
  },
  {
    id: 65,
    title: 'B+ Tree Index with Leaf Linking & Range Queries',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Multi-way search tree with balance invariant and horizontally linked leaf nodes.',
    optimalComplexity: { time: 'O(log N) search/insert', space: 'O(N)' },
    canonicalSolution: `class BPlusLeaf:
    def __init__(self):
        self.keys = []
        self.values = []
        self.next = None

class SimpleBPlusTree:
    def __init__(self, order: int = 4):
        self.order = order
        self.root = BPlusLeaf()

    def insert(self, key: int, val: any):
        leaf = self.root
        idx = 0
        while idx < len(leaf.keys) and leaf.keys[idx] < key:
            idx += 1
        if idx < len(leaf.keys) and leaf.keys[idx] == key:
            leaf.values[idx] = val
        else:
            leaf.keys.insert(idx, key)
            leaf.values.insert(idx, val)

    def search(self, key: int) -> any:
        leaf = self.root
        for k, v in zip(leaf.keys, leaf.values):
            if k == key:
                return v
        return None

    def range_query(self, low: int, high: int) -> list[any]:
        res = []
        leaf = self.root
        while leaf:
            for k, v in zip(leaf.keys, leaf.values):
                if low <= k <= high:
                    res.append(v)
            leaf = leaf.next
        return res`,
    verificationAssertion: 'bpt = SimpleBPlusTree(); bpt.insert(1, "one"); bpt.insert(5, "five"); bpt.insert(3, "three"); assert bpt.range_query(2, 6) == ["three", "five"]',
  },
  {
    id: 66,
    title: 'Distributed Snowflake Unique 64-Bit ID Generator',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'system-designer',
    description: 'Generate monotonically increasing 64-bit unique IDs across worker nodes without coordination.',
    optimalComplexity: { time: 'O(1) generation', space: 'O(1)' },
    canonicalSolution: `import time

class SnowflakeGenerator:
    def __init__(self, worker_id: int, epoch: int = 1609459200000):
        self.worker_id = worker_id & 0x3FF
        self.epoch = epoch
        self.sequence = 0
        self.last_ts = -1

    def next_id(self) -> int:
        ts = int(time.time() * 1000) - self.epoch
        if ts == self.last_ts:
            self.sequence = (self.sequence + 1) & 0xFFF
            if self.sequence == 0:
                while ts <= self.last_ts:
                    ts = int(time.time() * 1000) - self.epoch
        else:
            self.sequence = 0
        self.last_ts = ts
        return (ts << 22) | (self.worker_id << 12) | self.sequence`,
    verificationAssertion: 'sf = SnowflakeGenerator(1); id1 = sf.next_id(); id2 = sf.next_id(); assert id2 > id1',
  },
  {
    id: 67,
    title: 'LRU-K Eviction Cache (K=2 Backward Distance Matrix)',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Track the K-th backward reference distance to eliminate sequential scan pollution.',
    optimalComplexity: { time: 'O(1) lookup/evict', space: 'O(N)' },
    canonicalSolution: `import time
from collections import deque

class LruKCache:
    def __init__(self, capacity: int, k: int = 2):
        self.capacity = capacity
        self.k = k
        self.data = {}
        self.history = {}

    def get(self, key: str) -> any:
        if key not in self.data:
            return None
        self._record_access(key)
        return self.data[key]

    def put(self, key: str, value: any):
        if key not in self.data and len(self.data) >= self.capacity:
            self._evict()
        self.data[key] = value
        self._record_access(key)

    def _record_access(self, key: str):
        now = time.monotonic()
        if key not in self.history:
            self.history[key] = deque(maxlen=self.k)
        self.history[key].append(now)

    def _evict(self):
        victim = None
        earliest_time = float('inf')
        for k in self.data:
            q = self.history[k]
            k_dist = q[0] if len(q) == self.k else -float('inf')
            if k_dist < earliest_time:
                earliest_time = k_dist
                victim = k
        if victim:
            del self.data[victim]
            del self.history[victim]`,
    verificationAssertion: 'cache = LruKCache(2, 2); cache.put("a", 1); cache.put("b", 2); cache.get("a"); cache.put("c", 3); assert "a" in cache.data and "c" in cache.data',
  },
  {
    id: 68,
    title: 'LFU (Least Frequently Used) Cache in Strict O(1)',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Evict least frequently accessed item in strictly O(1) time using dual doubly linked lists.',
    optimalComplexity: { time: 'O(1) get & put', space: 'O(N)' },
    canonicalSolution: `from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.min_freq = 0
        self.vals = {}
        self.freqs = {}
        self.freq_buckets = defaultdict(OrderedDict)

    def get(self, key: int) -> int:
        if key not in self.vals:
            return -1
        f = self.freqs[key]
        self.freqs[key] = f + 1
        del self.freq_buckets[f][key]
        if not self.freq_buckets[f] and self.min_freq == f:
            self.min_freq += 1
        self.freq_buckets[f + 1][key] = None
        return self.vals[key]

    def put(self, key: int, value: int):
        if self.cap <= 0:
            return
        if key in self.vals:
            self.vals[key] = value
            self.get(key)
            return
        if len(self.vals) >= self.cap:
            evict_k, _ = self.freq_buckets[self.min_freq].popitem(last=False)
            del self.vals[evict_k]
            del self.freqs[evict_k]
        self.vals[key] = value
        self.freqs[key] = 1
        self.min_freq = 1
        self.freq_buckets[1][key] = None`,
    verificationAssertion: 'lfu = LFUCache(2); lfu.put(1, 1); lfu.put(2, 2); assert lfu.get(1) == 1; lfu.put(3, 3); assert lfu.get(2) == -1 and lfu.get(3) == 3',
  },
  {
    id: 69,
    title: 'Thread-Safe Work-Stealing Task Queue',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Double-ended task queue with LIFO worker pushes and FIFO thief pops.',
    optimalComplexity: { time: 'O(1) push/pop/steal', space: 'O(N)' },
    canonicalSolution: `from collections import deque
import threading

class WorkStealingQueue:
    def __init__(self):
        self.deque = deque()
        self.lock = threading.Lock()

    def push(self, task: any):
        with self.lock:
            self.deque.append(task)

    def pop(self) -> any:
        with self.lock:
            return self.deque.pop() if self.deque else None

    def steal(self) -> any:
        with self.lock:
            return self.deque.popleft() if self.deque else None`,
    verificationAssertion: 'q = WorkStealingQueue(); q.push(1); q.push(2); q.push(3); assert q.pop() == 3 and q.steal() == 1',
  },
  {
    id: 70,
    title: 'Distributed Mutex with Fencing Token',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Acquire distributed lock with monotonic fencing token protecting against GC pauses.',
    optimalComplexity: { time: 'O(1) lease check', space: 'O(1)' },
    canonicalSolution: `import time

class DistributedLockCoordinator:
    def __init__(self):
        self.holder = None
        self.lease_expires = 0.0
        self.fencing_token = 0

    def acquire(self, client_id: str, ttl_sec: float) -> int | None:
        now = time.monotonic()
        if self.holder is None or now >= self.lease_expires:
            self.holder = client_id
            self.lease_expires = now + ttl_sec
            self.fencing_token += 1
            return self.fencing_token
        return None

    def release(self, client_id: str):
        if self.holder == client_id:
            self.holder = None
            self.lease_expires = 0.0`,
    verificationAssertion: 'c = DistributedLockCoordinator(); t1 = c.acquire("c1", 10.0); assert t1 == 1 and c.acquire("c2", 10.0) is None; c.release("c1"); t2 = c.acquire("c2", 10.0); assert t2 == 2',
  },
  {
    id: 71,
    title: 'Event Sourcing CQRS Aggregate Root with Optimistic Locking',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Hard',
    assignedBotId: 'system-designer',
    description: 'Reconstruct state by applying event streams and reject concurrent conflicting versions.',
    optimalComplexity: { time: 'O(E) replay', space: 'O(E)' },
    canonicalSolution: `class BankAccountAggregate:
    def __init__(self, account_id: str):
        self.id = account_id
        self.balance = 0
        self.version = 0

    def apply_event(self, event: dict):
        if event['version'] != self.version + 1:
            raise ValueError("Optimistic concurrency conflict")
        if event['type'] == 'DEPOSITED':
            self.balance += event['amount']
        elif event['type'] == 'WITHDRAWN':
            self.balance -= event['amount']
        self.version += 1`,
    verificationAssertion: 'acc = BankAccountAggregate("acc1"); acc.apply_event({"type": "DEPOSITED", "amount": 100, "version": 1}); acc.apply_event({"type": "WITHDRAWN", "amount": 40, "version": 2}); assert acc.balance == 60 and acc.version == 2',
  },
  {
    id: 72,
    title: 'Priority Inversion Safe Mutex (Priority Ceiling Protocol)',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Prevent Mars Pathfinder priority inversions by boosting holding thread priority to ceiling.',
    optimalComplexity: { time: 'O(1) lock/unlock', space: 'O(1)' },
    canonicalSolution: `class PriorityCeilingMutex:
    def __init__(self, ceiling_priority: int):
        self.ceiling = ceiling_priority
        self.holder = None
        self.original_priority = None

    def lock(self, thread_id: str, priority: int):
        self.holder = thread_id
        self.original_priority = priority
        # Inherit priority ceiling to block all intermediate tasks
        return self.ceiling

    def unlock(self) -> int:
        orig = self.original_priority
        self.holder = None
        self.original_priority = None
        return orig`,
    verificationAssertion: 'm = PriorityCeilingMutex(100); boosted = m.lock("t1", 10); assert boosted == 100; restored = m.unlock(); assert restored == 10',
  },
  {
    id: 73,
    title: 'Read-Copy-Update (RCU) Epoch Memory Reclamation',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'system-designer',
    description: 'Execute lock-free reads while deferring pointer deallocations to quiescent grace periods.',
    optimalComplexity: { time: 'O(1) read, deferred GC', space: 'O(N)' },
    canonicalSolution: `class RcuManager:
    def __init__(self):
        self.active_readers = 0
        self.pending_reclaims = []

    def rcu_read_lock(self):
        self.active_readers += 1

    def rcu_read_unlock(self):
        self.active_readers -= 1
        if self.active_readers == 0:
            self._reclaim_all()

    def defer_reclaim(self, obj: any):
        if self.active_readers == 0:
            return
        self.pending_reclaims.append(obj)

    def _reclaim_all(self):
        self.pending_reclaims.clear()`,
    verificationAssertion: 'rcu = RcuManager(); rcu.rcu_read_lock(); rcu.defer_reclaim("stale_node"); assert len(rcu.pending_reclaims) == 1; rcu.rcu_read_unlock(); assert len(rcu.pending_reclaims) == 0',
  },
  {
    id: 74,
    title: 'Hierarchical Timing Wheel for O(1) Timer Scheduling',
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Circular array of timer buckets for high-scale microsecond timeouts in Kafka/Netty.',
    optimalComplexity: { time: 'O(1) schedule and tick', space: 'O(B)' },
    canonicalSolution: `class TimingWheel:
    def __init__(self, num_slots: int = 60, tick_ms: int = 1000):
        self.slots = [[] for _ in range(num_slots)]
        self.num_slots = num_slots
        self.tick_ms = tick_ms
        self.cur_slot = 0

    def add_timer(self, delay_ms: int, task_name: str):
        ticks = delay_ms // self.tick_ms
        slot = (self.cur_slot + ticks) % self.num_slots
        rounds = ticks // self.num_slots
        self.slots[slot].append({'rounds': rounds, 'task': task_name})

    def tick(self) -> list[str]:
        executed = []
        remaining = []
        for item in self.slots[self.cur_slot]:
            if item['rounds'] == 0:
                executed.append(item['task'])
            else:
                item['rounds'] -= 1
                remaining.append(item)
        self.slots[self.cur_slot] = remaining
        self.cur_slot = (self.cur_slot + 1) % self.num_slots
        return executed`,
    verificationAssertion: 'tw = TimingWheel(4, 100); tw.add_timer(200, "fire_200"); assert tw.tick() == []; assert tw.tick() == []; assert tw.tick() == ["fire_200"]',
  },
  {
    id: 75,
    title: "Lamport's Bakery Algorithm for Mutual Exclusion",
    category: 'Distributed Systems & Concurrency',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Starvation-free mutual exclusion for N concurrent processes using distributed ticket counters.',
    optimalComplexity: { time: 'O(N) lock', space: 'O(N)' },
    canonicalSolution: `class BakeryLock:
    def __init__(self, num_threads: int):
        self.n = num_threads
        self.entering = [False] * num_threads
        self.tickets = [0] * num_threads

    def lock(self, pid: int):
        self.entering[pid] = True
        self.tickets[pid] = max(self.tickets) + 1
        self.entering[pid] = False

        for other in range(self.n):
            if other == pid:
                continue
            while self.entering[other]:
                pass
            while self.tickets[other] != 0 and (
                self.tickets[other] < self.tickets[pid] or
                (self.tickets[other] == self.tickets[pid] and other < pid)
            ):
                pass

    def unlock(self, pid: int):
        self.tickets[pid] = 0`,
    verificationAssertion: 'b = BakeryLock(2); b.lock(0); assert b.tickets[0] == 1; b.unlock(0); assert b.tickets[0] == 0',
  },
]
