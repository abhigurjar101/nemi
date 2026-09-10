import type { HardestProblem } from './types'

export const COMPETITIVE_PROBLEMS: HardestProblem[] = [
  {
    id: 1,
    title: "Dinic's Algorithm with Capacity Scaling (Maximum Flow)",
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Compute maximum s-t flow in a directed network using level-graph BFS and blocking-flow DFS with scaling.',
    optimalComplexity: { time: 'O(V^2 E)', space: 'O(V + E)' },
    canonicalSolution: `from collections import deque

class Dinic:
    def __init__(self, n: int):
        self.n = n
        self.graph = [[] for _ in range(n)]
        self.edges = []

    def add_edge(self, u: int, v: int, cap: int):
        self.graph[u].append(len(self.edges))
        self.edges.append([u, v, cap, 0])
        self.graph[v].append(len(self.edges))
        self.edges.append([v, u, 0, 0])

    def bfs(self, s: int, t: int, level: list[int]) -> bool:
        level[:] = [-1] * self.n
        level[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for idx in self.graph[u]:
                _, v, cap, flow = self.edges[idx]
                if cap - flow > 0 and level[v] == -1:
                    level[v] = level[u] + 1
                    q.append(v)
        return level[t] != -1

    def dfs(self, u: int, t: int, pushed: int, level: list[int], ptr: list[int]) -> int:
        if pushed == 0 or u == t:
            return pushed
        for cid in range(ptr[u], len(self.graph[u])):
            ptr[u] = cid
            idx = self.graph[u][cid]
            _, v, cap, flow = self.edges[idx]
            tr = cap - flow
            if level[u] + 1 != level[v] or tr <= 0:
                continue
            tr_pushed = self.dfs(v, t, min(pushed, tr), level, ptr)
            if tr_pushed == 0:
                continue
            self.edges[idx][3] += tr_pushed
            self.edges[idx ^ 1][3] -= tr_pushed
            return tr_pushed
        return 0

    def max_flow(self, s: int, t: int) -> int:
        flow = 0
        level = [-1] * self.n
        while self.bfs(s, t, level):
            ptr = [0] * self.n
            while True:
                pushed = self.dfs(s, t, float('inf'), level, ptr)
                if pushed == 0:
                    break
                flow += pushed
        return flow`,
    verificationAssertion: 'd = Dinic(4); d.add_edge(0, 1, 10); d.add_edge(0, 2, 5); d.add_edge(1, 2, 15); d.add_edge(1, 3, 10); d.add_edge(2, 3, 10); assert d.max_flow(0, 3) == 15',
  },
  {
    id: 2,
    title: 'Hopcroft-Karp Maximum Bipartite Matching',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Find the maximum cardinality matching in a bipartite graph in O(E * sqrt(V)) time.',
    optimalComplexity: { time: 'O(E * sqrt(V))', space: 'O(V + E)' },
    canonicalSolution: `from collections import deque

class HopcroftKarp:
    def __init__(self, n: int, m: int):
        self.n, self.m = n, m
        self.adj = [[] for _ in range(n + 1)]
        self.pair_u = [0] * (n + 1)
        self.pair_v = [0] * (m + 1)
        self.dist = [0] * (n + 1)

    def add_edge(self, u: int, v: int):
        self.adj[u].append(v)

    def bfs(self) -> bool:
        q = deque()
        for u in range(1, self.n + 1):
            if self.pair_u[u] == 0:
                self.dist[u] = 0
                q.append(u)
            else:
                self.dist[u] = float('inf')
        self.dist[0] = float('inf')
        while q:
            u = q.popleft()
            if self.dist[u] < self.dist[0]:
                for v in self.adj[u]:
                    nxt = self.pair_v[v]
                    if self.dist[nxt] == float('inf'):
                        self.dist[nxt] = self.dist[u] + 1
                        q.append(nxt)
        return self.dist[0] != float('inf')

    def dfs(self, u: int) -> bool:
        if u == 0:
            return True
        for v in self.adj[u]:
            nxt = self.pair_v[v]
            if self.dist[nxt] == self.dist[u] + 1 and self.dfs(nxt):
                self.pair_v[v] = u
                self.pair_u[u] = v
                return True
        self.dist[u] = float('inf')
        return False

    def max_matching(self) -> int:
        matching = 0
        while self.bfs():
            for u in range(1, self.n + 1):
                if self.pair_u[u] == 0 and self.dfs(u):
                    matching += 1
        return matching`,
    verificationAssertion: 'hk = HopcroftKarp(3, 3); hk.add_edge(1, 1); hk.add_edge(1, 2); hk.add_edge(2, 2); hk.add_edge(3, 2); hk.add_edge(3, 3); assert hk.max_matching() == 3',
  },
  {
    id: 3,
    title: 'Min-Cost Max-Flow (Primal-Dual with SPFA/Potentials)',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Find maximum flow with minimum overall cost across all augmenting paths.',
    optimalComplexity: { time: 'O(F * E log V)', space: 'O(V + E)' },
    canonicalSolution: `import heapq

class MinCostMaxFlow:
    def __init__(self, n: int):
        self.n = n
        self.graph = [[] for _ in range(n)]

    def add_edge(self, u: int, v: int, cap: int, cost: int):
        self.graph[u].append([v, cap, cost, len(self.graph[v])])
        self.graph[v].append([u, 0, -cost, len(self.graph[u]) - 1])

    def solve(self, s: int, t: int) -> tuple[int, int]:
        flow, cost = 0, 0
        potential = [0] * self.n
        while True:
            dist = [float('inf')] * self.n
            parent_edge = [-1] * self.n
            parent_node = [-1] * self.n
            dist[s] = 0
            pq = [(0, s)]
            while pq:
                d, u = heapq.heappop(pq)
                if d > dist[u]:
                    continue
                for idx, (v, cap, cst, rev) in enumerate(self.graph[u]):
                    r_cost = cst + potential[u] - potential[v]
                    if cap > 0 and dist[v] > dist[u] + r_cost:
                        dist[v] = dist[u] + r_cost
                        parent_node[v] = u
                        parent_edge[v] = idx
                        heapq.heappush(pq, (dist[v], v))
            if dist[t] == float('inf'):
                break
            for i in range(self.n):
                if dist[i] < float('inf'):
                    potential[i] += dist[i]
            push = float('inf')
            curr = t
            while curr != s:
                p = parent_node[curr]
                idx = parent_edge[curr]
                push = min(push, self.graph[p][idx][1])
                curr = p
            flow += push
            cost += push * potential[t]
            curr = t
            while curr != s:
                p = parent_node[curr]
                idx = parent_edge[curr]
                rev = self.graph[p][idx][3]
                self.graph[p][idx][1] -= push
                self.graph[curr][rev][1] += push
                curr = p
        return flow, cost`,
    verificationAssertion: 'mcmf = MinCostMaxFlow(4); mcmf.add_edge(0, 1, 3, 1); mcmf.add_edge(0, 2, 2, 4); mcmf.add_edge(1, 2, 1, 2); mcmf.add_edge(1, 3, 2, 3); mcmf.add_edge(2, 3, 3, 1); f, c = mcmf.solve(0, 3); assert f == 4 and c == 17',
  },
  {
    id: 4,
    title: 'Segment Tree with Lazy Propagation (Range Affine Updates)',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'coding-assistant',
    description: 'Support range affine transform (a*x + b) and range sum queries modulo 998244353.',
    optimalComplexity: { time: 'O(log N) per query', space: 'O(N)' },
    canonicalSolution: `class RangeAffineSegTree:
    def __init__(self, arr: list[int], mod: int = 998244353):
        self.mod = mod
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.lazy_mul = [1] * (4 * self.n)
        self.lazy_add = [0] * (4 * self.n)
        self._build(arr, 0, 0, self.n - 1)

    def _build(self, arr: list[int], node: int, l: int, r: int):
        if l == r:
            self.tree[node] = arr[l] % self.mod
            return
        mid = (l + r) // 2
        self._build(arr, 2 * node + 1, l, mid)
        self._build(arr, 2 * node + 2, mid + 1, r)
        self.tree[node] = (self.tree[2 * node + 1] + self.tree[2 * node + 2]) % self.mod

    def _apply(self, node: int, l: int, r: int, m: int, a: int):
        sz = r - l + 1
        self.tree[node] = (self.tree[node] * m + a * sz) % self.mod
        self.lazy_mul[node] = (self.lazy_mul[node] * m) % self.mod
        self.lazy_add[node] = (self.lazy_add[node] * m + a) % self.mod

    def _push(self, node: int, l: int, r: int):
        if self.lazy_mul[node] == 1 and self.lazy_add[node] == 0:
            return
        mid = (l + r) // 2
        self._apply(2 * node + 1, l, mid, self.lazy_mul[node], self.lazy_add[node])
        self._apply(2 * node + 2, mid + 1, r, self.lazy_mul[node], self.lazy_add[node])
        self.lazy_mul[node] = 1
        self.lazy_add[node] = 0

    def update_affine(self, ql: int, qr: int, m: int, a: int, node: int = 0, l: int = 0, r: int = -1):
        if r == -1:
            r = self.n - 1
        if ql <= l and r <= qr:
            self._apply(node, l, r, m, a)
            return
        self._push(node, l, r)
        mid = (l + r) // 2
        if ql <= mid:
            self.update_affine(ql, qr, m, a, 2 * node + 1, l, mid)
        if qr > mid:
            self.update_affine(ql, qr, m, a, 2 * node + 2, mid + 1, r)
        self.tree[node] = (self.tree[2 * node + 1] + self.tree[2 * node + 2]) % self.mod

    def query_sum(self, ql: int, qr: int, node: int = 0, l: int = 0, r: int = -1) -> int:
        if r == -1:
            r = self.n - 1
        if ql <= l and r <= qr:
            return self.tree[node]
        self._push(node, l, r)
        mid = (l + r) // 2
        res = 0
        if ql <= mid:
            res = (res + self.query_sum(ql, qr, 2 * node + 1, l, mid)) % self.mod
        if qr > mid:
            res = (res + self.query_sum(ql, qr, 2 * node + 2, mid + 1, r)) % self.mod
        return res`,
    verificationAssertion: 'st = RangeAffineSegTree([1, 2, 3, 4, 5]); st.update_affine(1, 3, 2, 1); assert st.query_sum(0, 4) == 27',
  },
  {
    id: 5,
    title: 'Fenwick Tree (Binary Indexed Tree) for Inversion Counting',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Count array inversions and support point updates and prefix sums in O(log N).',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `class FenwickTree:
    def __init__(self, size: int):
        self.tree = [0] * (size + 1)

    def add(self, idx: int, delta: int):
        while idx < len(self.tree):
            self.tree[idx] += delta
            idx += idx & (-idx)

    def query(self, idx: int) -> int:
        total = 0
        while idx > 0:
            total += self.tree[idx]
            idx -= idx & (-idx)
        return total

def count_inversions(arr: list[int]) -> int:
    sorted_unique = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
    bit = FenwickTree(len(sorted_unique))
    inversions = 0
    for i, x in enumerate(reversed(arr)):
        r = rank[x]
        inversions += bit.query(r - 1)
        bit.add(r, 1)
    return inversions`,
    verificationAssertion: 'assert count_inversions([8, 4, 2, 1]) == 6 and count_inversions([1, 2, 3]) == 0',
  },
  {
    id: 6,
    title: 'Heavy-Light Decomposition (HLD) on Trees',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Decompose tree into vertex-disjoint paths to answer maximum path weight queries in O(log^2 N).',
    optimalComplexity: { time: 'O(log^2 N) query', space: 'O(N)' },
    canonicalSolution: `class HeavyLightDecomp:
    def __init__(self, n: int, values: list[int]):
        self.n = n
        self.values = values
        self.adj = [[] for _ in range(n)]
        self.parent = [-1] * n
        self.depth = [0] * n
        self.heavy = [-1] * n
        self.head = [0] * n
        self.pos = [0] * n
        self.cur_pos = 0
        self.seg = [0] * (4 * n)

    def add_edge(self, u: int, v: int):
        self.adj[u].append(v)
        self.adj[v].append(u)

    def dfs_sz(self, u: int, p: int) -> int:
        size, max_c_size = 1, 0
        self.parent[u] = p
        self.depth[u] = self.depth[p] + 1 if p != -1 else 0
        for v in self.adj[u]:
            if v != p:
                c_size = self.dfs_sz(v, u)
                size += c_size
                if c_size > max_c_size:
                    max_c_size = c_size
                    self.heavy[u] = v
        return size

    def dfs_hld(self, u: int, h: int):
        self.head[u] = h
        self.pos[u] = self.cur_pos
        self.cur_pos += 1
        if self.heavy[u] != -1:
            self.dfs_hld(self.heavy[u], h)
        for v in self.adj[u]:
            if v != self.parent[u] and v != self.heavy[u]:
                self.dfs_hld(v, v)

    def build_seg(self, node: int, l: int, r: int, rev_pos: list[int]):
        if l == r:
            self.seg[node] = self.values[rev_pos[l]]
            return
        mid = (l + r) // 2
        self.build_seg(2 * node + 1, l, mid, rev_pos)
        self.build_seg(2 * node + 2, mid + 1, r, rev_pos)
        self.seg[node] = max(self.seg[2 * node + 1], self.seg[2 * node + 2])

    def query_seg(self, node: int, l: int, r: int, ql: int, qr: int) -> int:
        if ql <= l and r <= qr:
            return self.seg[node]
        mid = (l + r) // 2
        res = -float('inf')
        if ql <= mid:
            res = max(res, self.query_seg(2 * node + 1, l, mid, ql, qr))
        if qr > mid:
            res = max(res, self.query_seg(2 * node + 2, mid + 1, r, ql, qr))
        return res

    def query_path_max(self, u: int, v: int) -> int:
        ans = -float('inf')
        while self.head[u] != self.head[v]:
            if self.depth[self.head[u]] > self.depth[self.head[v]]:
                u, v = v, u
            ans = max(ans, self.query_seg(0, 0, self.n - 1, self.pos[self.head[v]], self.pos[v]))
            v = self.parent[self.head[v]]
        if self.depth[u] > self.depth[v]:
            u, v = v, u
        ans = max(ans, self.query_seg(0, 0, self.n - 1, self.pos[u], self.pos[v]))
        return ans`,
    verificationAssertion: 'hld = HeavyLightDecomp(4, [10, 20, 30, 40]); hld.add_edge(0, 1); hld.add_edge(1, 2); hld.add_edge(1, 3); hld.dfs_sz(0, -1); hld.dfs_hld(0, 0); rev = [0]*4\nfor i, p in enumerate(hld.pos): rev[p] = i\nhld.build_seg(0, 0, 3, rev); assert hld.query_path_max(2, 3) == 40',
  },
  {
    id: 7,
    title: 'Centroid Decomposition of Trees',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Decompose tree recursively on centroids into a hierarchy of depth O(log N) for path queries.',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `class CentroidDecomposition:
    def __init__(self, n: int):
        self.n = n
        self.adj = [[] for _ in range(n)]
        self.removed = [False] * n
        self.size = [0] * n

    def add_edge(self, u: int, v: int):
        self.adj[u].append(v)
        self.adj[v].append(u)

    def get_sizes(self, u: int, p: int) -> int:
        self.size[u] = 1
        for v in self.adj[u]:
            if v != p and not self.removed[v]:
                self.size[u] += self.get_sizes(v, u)
        return self.size[u]

    def find_centroid(self, u: int, p: int, total: int) -> int:
        for v in self.adj[u]:
            if v != p and not self.removed[v] and self.size[v] > total // 2:
                return self.find_centroid(v, u, total)
        return u

    def decompose(self, u: int) -> int:
        total = self.get_sizes(u, -1)
        c = self.find_centroid(u, -1, total)
        self.removed[c] = True
        for v in self.adj[c]:
            if not self.removed[v]:
                self.decompose(v)
        return c`,
    verificationAssertion: 'cd = CentroidDecomposition(5); cd.add_edge(0, 1); cd.add_edge(1, 2); cd.add_edge(2, 3); cd.add_edge(2, 4); assert cd.decompose(0) == 2',
  },
  {
    id: 8,
    title: 'Aho-Corasick Multi-Pattern String Automaton',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'coding-assistant',
    description: 'Construct suffix/failure links on Trie for exact matching of multiple patterns in linear time.',
    optimalComplexity: { time: 'O(sum|P| + |T|)', space: 'O(sum|P| * Sigma)' },
    canonicalSolution: `from collections import deque

class AhoCorasick:
    def __init__(self):
        self.trie = [{}]
        self.fail = [0]
        self.output = [[]]

    def add_pattern(self, pattern: str, pattern_id: int):
        node = 0
        for ch in pattern:
            if ch not in self.trie[node]:
                self.trie[node][ch] = len(self.trie)
                self.trie.append({})
                self.fail.append(0)
                self.output.append([])
            node = self.trie[node][ch]
        self.output[node].append(pattern_id)

    def build(self):
        q = deque()
        for ch, child in self.trie[0].items():
            self.fail[child] = 0
            q.append(child)
        while q:
            u = q.popleft()
            for ch, v in self.trie[u].items():
                f = self.fail[u]
                while f > 0 and ch not in self.trie[f]:
                    f = self.fail[f]
                if ch in self.trie[f]:
                    self.fail[v] = self.trie[f][ch]
                else:
                    self.fail[v] = 0
                self.output[v].extend(self.output[self.fail[v]])
                q.append(v)

    def search(self, text: str) -> list[tuple[int, int]]:
        matches = []
        u = 0
        for i, ch in enumerate(text):
            while u > 0 and ch not in self.trie[u]:
                u = self.fail[u]
            u = self.trie[u].get(ch, 0)
            for pat_id in self.output[u]:
                matches.append((i, pat_id))
        return matches`,
    verificationAssertion: 'ac = AhoCorasick(); ac.add_pattern("he", 1); ac.add_pattern("she", 2); ac.add_pattern("his", 3); ac.build(); res = ac.search("ushers"); assert len(res) == 3',
  },
  {
    id: 9,
    title: 'Suffix Automaton (SAM)',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Directed acyclic word graph representing all substrings of a string in linear space O(N) and time O(N).',
    optimalComplexity: { time: 'O(N)', space: 'O(N * Sigma)' },
    canonicalSolution: `class SuffixAutomaton:
    def __init__(self):
        self.len = [0]
        self.link = [-1]
        self.next = [{}]
        self.sz = 1
        self.last = 0

    def extend(self, c: str):
        cur = self.sz
        self.sz += 1
        self.len.append(self.len[self.last] + 1)
        self.link.append(0)
        self.next.append({})
        p = self.last
        while p != -1 and c not in self.next[p]:
            self.next[p][c] = cur
            p = self.link[p]
        if p == -1:
            self.link[cur] = 0
        else:
            q = self.next[p][c]
            if self.len[p] + 1 == self.len[q]:
                self.link[cur] = q
            else:
                clone = self.sz
                self.sz += 1
                self.len.append(self.len[p] + 1)
                self.next.append(dict(self.next[q]))
                self.link.append(self.link[q])
                while p != -1 and self.next[p].get(c) == q:
                    self.next[p][c] = clone
                    p = self.link[p]
                self.link[q] = clone
                self.link[cur] = clone
        self.last = cur

    def contains(self, s: str) -> bool:
        u = 0
        for ch in s:
            if ch not in self.next[u]:
                return False
            u = self.next[u][ch]
        return True`,
    verificationAssertion: 'sam = SuffixAutomaton()\nfor ch in "abbab": sam.extend(ch)\nassert sam.contains("bba") and not sam.contains("bbb")',
  },
  {
    id: 10,
    title: "Manacher's Algorithm for Longest Palindromic Substring",
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Find the longest palindromic substring in strictly linear O(N) time.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `def longest_palindromic_substring(s: str) -> str:
    if not s:
        return ""
    t = '#' + '#'.join(s) + '#'
    n = len(t)
    p = [0] * n
    c, r = 0, 0
    max_len, center = 0, 0

    for i in range(n):
        i_mirror = 2 * c - i
        if i < r:
            p[i] = min(r - i, p[i_mirror])
        while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
            p[i] += 1
        if i + p[i] > r:
            c = i
            r = i + p[i]
        if p[i] > max_len:
            max_len = p[i]
            center = i

    start = (center - max_len) // 2
    return s[start: start + max_len]`,
    verificationAssertion: 'assert longest_palindromic_substring("babad") in ["bab", "aba"] and longest_palindromic_substring("cbbd") == "bb"',
  },
  {
    id: 11,
    title: 'Knuth-Morris-Pratt (KMP) String Search',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Linear pattern search with precomputed longest prefix-suffix (LPS) table.',
    optimalComplexity: { time: 'O(N + M)', space: 'O(M)' },
    canonicalSolution: `def kmp_search(text: str, pattern: str) -> list[int]:
    if not pattern:
        return []
    lps = [0] * len(pattern)
    length = 0
    for i in range(1, len(pattern)):
        while length > 0 and pattern[i] != pattern[length]:
            length = lps[length - 1]
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length

    matches = []
    j = 0
    for i in range(len(text)):
        while j > 0 and text[i] != pattern[j]:
            j = lps[j - 1]
        if text[i] == pattern[j]:
            j += 1
        if j == len(pattern):
            matches.append(i - len(pattern) + 1)
            j = lps[j - 1]
    return matches`,
    verificationAssertion: 'assert kmp_search("ABABDABACDABABCABAB", "ABABCABAB") == [10]',
  },
  {
    id: 12,
    title: 'Z-Algorithm for Exact String Matching',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Calculate longest common prefix between suffix starting at i and original string.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `def compute_z_array(s: str) -> list[int]:
    n = len(s)
    z = [0] * n
    l, r = 0, 0
    for i in range(1, n):
        if i <= r:
            z[i] = min(r - i + 1, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] - 1 > r:
            l = i
            r = i + z[i] - 1
    return z

def z_search(text: str, pattern: str) -> list[int]:
    concat = pattern + "$" + text
    z = compute_z_array(concat)
    p_len = len(pattern)
    return [i - p_len - 1 for i in range(p_len + 1, len(concat)) if z[i] == p_len]`,
    verificationAssertion: 'assert z_search("GEEKS FOR GEEKS", "GEEK") == [0, 10]',
  },
  {
    id: 13,
    title: "Tarjan's Strongly Connected Components (SCC) & Bridge Detection",
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Find all strongly connected components and graph bridges using low-link discovery time.',
    optimalComplexity: { time: 'O(V + E)', space: 'O(V + E)' },
    canonicalSolution: `class TarjanSCC:
    def __init__(self, n: int):
        self.n = n
        self.graph = [[] for _ in range(n)]

    def add_edge(self, u: int, v: int):
        self.graph[u].append(v)

    def find_sccs(self) -> list[list[int]]:
        disc = [-1] * self.n
        low = [-1] * self.n
        in_stack = [False] * self.n
        stack = []
        timer = 0
        sccs = []

        def dfs(u: int):
            nonlocal timer
            disc[u] = low[u] = timer
            timer += 1
            stack.append(u)
            in_stack[u] = True

            for v in self.graph[u]:
                if disc[v] == -1:
                    dfs(v)
                    low[u] = min(low[u], low[v])
                elif in_stack[v]:
                    low[u] = min(low[u], disc[v])

            if low[u] == disc[u]:
                scc = []
                while True:
                    v = stack.pop()
                    in_stack[v] = False
                    scc.append(v)
                    if v == u:
                        break
                sccs.append(scc)

        for i in range(self.n):
            if disc[i] == -1:
                dfs(i)
        return sccs`,
    verificationAssertion: 't = TarjanSCC(4); t.add_edge(0, 1); t.add_edge(1, 2); t.add_edge(2, 0); t.add_edge(2, 3); res = t.find_sccs(); assert any(set(c) == {0, 1, 2} for c in res)',
  },
  {
    id: 14,
    title: '2-Satisfiability (2-SAT) Solver via Implication Graph',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Solve 2-SAT boolean clauses by finding SCCs in linear time.',
    optimalComplexity: { time: 'O(V + E)', space: 'O(V + E)' },
    canonicalSolution: `def solve_2sat(n_vars: int, clauses: list[tuple[int, int]]) -> tuple[bool, list[bool]]:
    # Variable x -> 2*x, not x -> 2*x + 1
    n_nodes = 2 * n_vars
    adj = [[] for _ in range(n_nodes)]

    for u, v in clauses:
        u_node = (abs(u) - 1) * 2 + (1 if u < 0 else 0)
        v_node = (abs(v) - 1) * 2 + (1 if v < 0 else 0)
        adj[u_node ^ 1].append(v_node)
        adj[v_node ^ 1].append(u_node)

    disc = [-1] * n_nodes
    low = [-1] * n_nodes
    in_stack = [False] * n_nodes
    stack = []
    timer = 0
    scc_id = [-1] * n_nodes
    cur_scc = 0

    def dfs(u: int):
        nonlocal timer, cur_scc
        disc[u] = low[u] = timer
        timer += 1
        stack.append(u)
        in_stack[u] = True
        for v in adj[u]:
            if disc[v] == -1:
                dfs(v)
                low[u] = min(low[u], low[v])
            elif in_stack[v]:
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:
            while True:
                v = stack.pop()
                in_stack[v] = False
                scc_id[v] = cur_scc
                if v == u:
                    break
            cur_scc += 1

    for i in range(n_nodes):
        if disc[i] == -1:
            dfs(i)

    assignment = [False] * n_vars
    for i in range(n_vars):
        if scc_id[2 * i] == scc_id[2 * i + 1]:
            return False, []
        assignment[i] = scc_id[2 * i] < scc_id[2 * i + 1]
    return True, assignment`,
    verificationAssertion: 'sat, assign = solve_2sat(2, [(1, 2), (-1, 2), (-1, -2)]); assert sat and assign[1] == True',
  },
  {
    id: 15,
    title: 'Convex Hull Trick & Li Chao Tree for Dynamic Programming',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Insert linear functions and query minimum value at x in O(log N).',
    optimalComplexity: { time: 'O(log C) per operation', space: 'O(N)' },
    canonicalSolution: `class LiChaoTree:
    def __init__(self, x_min: int, x_max: int):
        self.x_min, self.x_max = x_min, x_max
        self.lines = {}

    def _eval(self, line: tuple[int, int], x: int) -> int:
        return line[0] * x + line[1]

    def add_line(self, line: tuple[int, int], node: int = 1, l: int = None, r: int = None):
        if l is None:
            l, r = self.x_min, self.x_max
        mid = (l + r) // 2
        if node not in self.lines:
            self.lines[node] = line
            return
        cur = self.lines[node]
        mid_cur = self._eval(cur, mid)
        mid_new = self._eval(line, mid)
        if mid_new < mid_cur:
            self.lines[node], line = line, cur
        if l == r:
            return
        if self._eval(line, l) < self._eval(self.lines[node], l):
            self.add_line(line, 2 * node, l, mid)
        elif self._eval(line, r) < self._eval(self.lines[node], r):
            self.add_line(line, 2 * node + 1, mid + 1, r)

    def query(self, x: int, node: int = 1, l: int = None, r: int = None) -> int:
        if l is None:
            l, r = self.x_min, self.x_max
        if node not in self.lines:
            return float('inf')
        res = self._eval(self.lines[node], x)
        if l == r:
            return res
        mid = (l + r) // 2
        if x <= mid:
            return min(res, self.query(x, 2 * node, l, mid))
        else:
            return min(res, self.query(x, 2 * node + 1, mid + 1, r))`,
    verificationAssertion: 'lct = LiChaoTree(0, 100); lct.add_line((2, 10)); lct.add_line((1, 15)); assert lct.query(10) == 25 and lct.query(2) == 14',
  },
  {
    id: 16,
    title: 'Knuth-Yao Dynamic Programming Optimization',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Optimize interval dynamic programming from O(N^3) to O(N^2) using quadrangle inequality monotonicity.',
    optimalComplexity: { time: 'O(N^2)', space: 'O(N^2)' },
    canonicalSolution: `def optimal_bst_cost(freq: list[int]) -> int:
    n = len(freq)
    pref = [0] * (n + 1)
    for i in range(n):
        pref[i + 1] = pref[i] + freq[i]

    dp = [[0] * n for _ in range(n)]
    opt = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = freq[i]
        opt[i][i] = i

    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            w = pref[j + 1] - pref[i]
            dp[i][j] = float('inf')
            k_low = opt[i][j - 1]
            k_high = opt[i + 1][j] if i + 1 <= j else j
            for k in range(k_low, min(k_high + 1, j + 1)):
                left = dp[i][k - 1] if k > i else 0
                right = dp[k + 1][j] if k < j else 0
                cost = left + right + w
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    opt[i][j] = k
    return dp[0][n - 1]`,
    verificationAssertion: 'assert optimal_bst_cost([34, 8, 50]) == 142',
  },
  {
    id: 17,
    title: 'Held-Karp Bitmask DP for Travelling Salesperson Problem (TSP)',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Exact optimal tour solving TSP via state compression in O(2^N * N^2) time.',
    optimalComplexity: { time: 'O(2^N * N^2)', space: 'O(2^N * N)' },
    canonicalSolution: `def held_karp_tsp(dist_matrix: list[list[int]]) -> int:
    n = len(dist_matrix)
    memo = {}

    def solve(mask: int, u: int) -> int:
        if mask == (1 << n) - 1:
            return dist_matrix[u][0]
        state = (mask, u)
        if state in memo:
            return memo[state]
        ans = float('inf')
        for v in range(n):
            if not (mask & (1 << v)):
                ans = min(ans, dist_matrix[u][v] + solve(mask | (1 << v), v))
        memo[state] = ans
        return ans

    return solve(1, 0)`,
    verificationAssertion: 'd = [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]]; assert held_karp_tsp(d) == 80',
  },
  {
    id: 18,
    title: 'Edmonds-Karp Maximum Flow (BFS Shortest Augmenting Path)',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Ford-Fulkerson realization with shortest path BFS ensuring O(V * E^2) convergence.',
    optimalComplexity: { time: 'O(V * E^2)', space: 'O(V + E)' },
    canonicalSolution: `from collections import deque

def edmonds_karp(n: int, s: int, t: int, capacity: list[list[int]]) -> int:
    flow = 0
    parent = [-1] * n

    def bfs() -> bool:
        parent[:] = [-1] * n
        parent[s] = s
        q = deque([(s, float('inf'))])
        while q:
            u, cur_flow = q.popleft()
            for v in range(n):
                if parent[v] == -1 and capacity[u][v] > 0:
                    parent[v] = u
                    new_flow = min(cur_flow, capacity[u][v])
                    if v == t:
                        return new_flow
                    q.append((v, new_flow))
        return 0

    while True:
        pushed = bfs()
        if pushed == 0:
            break
        flow += pushed
        curr = t
        while curr != s:
            prev = parent[curr]
            capacity[prev][curr] -= pushed
            capacity[curr][prev] += pushed
            curr = prev
    return flow`,
    verificationAssertion: 'cap = [[0, 16, 13, 0, 0, 0], [0, 0, 10, 12, 0, 0], [0, 4, 0, 0, 14, 0], [0, 0, 9, 0, 0, 20], [0, 0, 0, 7, 0, 4], [0, 0, 0, 0, 0, 0]]; assert edmonds_karp(6, 0, 5, cap) == 23',
  },
  {
    id: 19,
    title: 'Treap (Cartesian Tree) with Implicit Split and Merge',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Self-balancing binary tree utilizing randomized heap priorities and subtree size splitting.',
    optimalComplexity: { time: 'O(log N)', space: 'O(N)' },
    canonicalSolution: `import random

class TreapNode:
    def __init__(self, val: int):
        self.val = val
        self.priority = random.random()
        self.size = 1
        self.left = None
        self.right = None

class ImplicitTreap:
    @staticmethod
    def get_size(node: TreapNode | None) -> int:
        return node.size if node else 0

    @classmethod
    def update(cls, node: TreapNode | None):
        if node:
            node.size = 1 + cls.get_size(node.left) + cls.get_size(node.right)

    @classmethod
    def split(cls, node: TreapNode | None, k: int) -> tuple[TreapNode | None, TreapNode | None]:
        if not node:
            return None, None
        left_sz = cls.get_size(node.left)
        if left_sz >= k:
            l, r = cls.split(node.left, k)
            node.left = r
            cls.update(node)
            return l, node
        else:
            l, r = cls.split(node.right, k - left_sz - 1)
            node.right = l
            cls.update(node)
            return node, r

    @classmethod
    def merge(cls, l: TreapNode | None, r: TreapNode | None) -> TreapNode | None:
        if not l or not r:
            return l or r
        if l.priority > r.priority:
            l.right = cls.merge(l.right, r)
            cls.update(l)
            return l
        else:
            r.left = cls.merge(l, r.left)
            cls.update(r)
            return r`,
    verificationAssertion: 't = ImplicitTreap(); root = None\nfor v in [10, 20, 30]: root = t.merge(root, TreapNode(v))\nassert t.get_size(root) == 3',
  },
  {
    id: 20,
    title: 'Disjoint Set Union (DSU) with Union-by-Rank & Path Compression',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Equivalence class connectivity with Ackermann alpha(N) amortized time per operation.',
    optimalComplexity: { time: 'O(alpha(N))', space: 'O(N)' },
    canonicalSolution: `class DisjointSetUnion:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.num_sets = n

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: int, j: int) -> bool:
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                root_i, root_j = root_j, root_i
            self.parent[root_j] = root_i
            if self.rank[root_i] == self.rank[root_j]:
                self.rank[root_i] += 1
            self.num_sets -= 1
            return True
        return False`,
    verificationAssertion: 'dsu = DisjointSetUnion(5); dsu.union(0, 1); dsu.union(1, 2); assert dsu.find(0) == dsu.find(2) and dsu.num_sets == 3',
  },
  {
    id: 21,
    title: 'Lowest Common Ancestor (LCA) via Binary Lifting',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Extreme',
    assignedBotId: 'high-thinking',
    description: 'Answer tree LCA queries in O(log N) with O(N log N) precomputed binary jumping table.',
    optimalComplexity: { time: 'O(log N) per query', space: 'O(N log N)' },
    canonicalSolution: `class BinaryLiftingLCA:
    def __init__(self, n: int, adj: list[list[int]], root: int = 0):
        self.n = n
        self.log_n = (n).bit_length() + 1
        self.depth = [0] * n
        self.up = [[0] * self.log_n for _ in range(n)]

        def dfs(u: int, p: int, d: int):
            self.depth[u] = d
            self.up[u][0] = p
            for j in range(1, self.log_n):
                self.up[u][j] = self.up[self.up[u][j - 1]][j - 1]
            for v in adj[u]:
                if v != p:
                    dfs(v, u, d + 1)

        dfs(root, root, 0)

    def get_lca(self, u: int, v: int) -> int:
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        diff = self.depth[u] - self.depth[v]
        for j in range(self.log_n):
            if (diff >> j) & 1:
                u = self.up[u][j]
        if u == v:
            return u
        for j in reversed(range(self.log_n)):
            if self.up[u][j] != self.up[v][j]:
                u = self.up[u][j]
                v = self.up[v][j]
        return self.up[u][0]`,
    verificationAssertion: 'adj = [[1, 2], [0, 3, 4], [0], [1], [1]]; lca = BinaryLiftingLCA(5, adj, 0); assert lca.get_lca(3, 4) == 1 and lca.get_lca(3, 2) == 0',
  },
  {
    id: 22,
    title: 'Fast Fourier Transform (FFT) Polynomial Multiplication',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Multiply two polynomials of degree N in O(N log N) time using Cooley-Tukey FFT.',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `import cmath

def fft(a: list[complex], invert: bool = False):
    n = len(a)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j ^= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        ang = 2 * cmath.pi / length * (-1 if invert else 1)
        wlen = cmath.rect(1, ang)
        for i in range(0, n, length):
            w = 1 + 0j
            for k in range(length // 2):
                u = a[i + k]
                v = a[i + k + length // 2] * w
                a[i + k] = u + v
                a[i + k + length // 2] = u - v
                w *= wlen
        length <<= 1
    if invert:
        for i in range(n):
            a[i] /= n

def multiply_polynomials(p1: list[int], p2: list[int]) -> list[int]:
    n = 1
    while n < len(p1) + len(p2):
        n <<= 1
    fa = [complex(x) for x in p1] + [0j] * (n - len(p1))
    fb = [complex(x) for x in p2] + [0j] * (n - len(p2))
    fft(fa, False)
    fft(fb, False)
    for i in range(n):
        fa[i] *= fb[i]
    fft(fa, True)
    res = [round(x.real) for x in fa]
    while len(res) > 1 and res[-1] == 0:
        res.pop()
    return res`,
    verificationAssertion: 'assert multiply_polynomials([1, 2], [3, 4]) == [3, 10, 8]',
  },
  {
    id: 23,
    title: 'Floyd-Warshall with Negative Cycle Detection',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Compute all-pairs shortest paths in O(V^3) and check for negative cycle propagation.',
    optimalComplexity: { time: 'O(V^3)', space: 'O(V^2)' },
    canonicalSolution: `def floyd_warshall(n: int, edges: list[tuple[int, int, int]]) -> tuple[list[list[float]], bool]:
    dist = [[float('inf')] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)

    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] < float('inf') and dist[k][j] < float('inf'):
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])

    has_negative_cycle = any(dist[i][i] < 0 for i in range(n))
    return dist, has_negative_cycle`,
    verificationAssertion: 'edges = [(0, 1, 1), (1, 2, -1), (2, 0, -1)]; d, cycle = floyd_warshall(3, edges); assert cycle == True',
  },
  {
    id: 24,
    title: 'Stoer-Wagner Global Minimum Cut',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Grandmaster',
    assignedBotId: 'high-thinking',
    description: 'Find the global minimum cut in an undirected positive-weight graph without a source/sink in O(V^3).',
    optimalComplexity: { time: 'O(V^3)', space: 'O(V^2)' },
    canonicalSolution: `def global_min_cut(n: int, matrix: list[list[int]]) -> int:
    nodes = list(range(n))
    min_cut = float('inf')
    w = [row[:] for row in matrix]

    while len(nodes) > 1:
        v = nodes[0]
        added = [False] * n
        added[v] = True
        weights = [w[v][x] for x in range(n)]
        prev, last = v, v

        for _ in range(len(nodes) - 1):
            next_node = -1
            max_w = -1
            for u in nodes:
                if not added[u] and weights[u] > max_w:
                    max_w = weights[u]
                    next_node = u
            added[next_node] = True
            for u in nodes:
                weights[u] += w[next_node][u]
            prev, last = last, next_node

        min_cut = min(min_cut, weights[last] - w[last][last])
        for u in nodes:
            w[prev][u] += w[last][u]
            w[u][prev] = w[prev][u]
        nodes.remove(last)
    return min_cut`,
    verificationAssertion: 'w = [[0, 2, 3], [2, 0, 1], [3, 1, 0]]; assert global_min_cut(3, w) == 3',
  },
  {
    id: 25,
    title: 'Graham Scan Convex Hull in 2D Space',
    category: 'Advanced Competitive & IOI/ICPC',
    difficulty: 'Hard',
    assignedBotId: 'coding-assistant',
    description: 'Construct the minimal convex polygon containing all points in O(N log N) using cross product turn orientation.',
    optimalComplexity: { time: 'O(N log N)', space: 'O(N)' },
    canonicalSolution: `def convex_hull_graham(points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cross_product(o: tuple[int, int], a: tuple[int, int], b: tuple[int, int]) -> int:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross_product(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross_product(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]`,
    verificationAssertion: 'pts = [(0, 0), (0, 4), (-4, 0), (5, 0), (0, -6), (1, 1)]; hull = convex_hull_graham(pts); assert len(hull) == 4 and (1, 1) not in hull',
  },
]
