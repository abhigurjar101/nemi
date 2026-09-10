import type { HardestProblem } from './types'

export const DEEP_LEARNING_PROBLEMS: HardestProblem[] = [
  {
    id: 76,
    title: 'Causal Multi-Head Self-Attention with Pre-LN (nanoGPT style)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Grandmaster',
    assignedBotId: 'ml-pipeline',
    description: 'Compute causal masked multi-head attention matrix with lower-triangular causal masking.',
    optimalComplexity: { time: 'O(B * H * T^2 * d)', space: 'O(B * H * T^2)' },
    canonicalSolution: `import math

def causal_multi_head_attention(
    q: list[list[list[float]]],
    k: list[list[list[float]]],
    v: list[list[list[float]]],
    d_k: int
) -> list[list[list[float]]]:
    # Shapes: [H, T, d_k]
    heads, seq_len = len(q), len(q[0])
    output = [[[0.0] * d_k for _ in range(seq_len)] for _ in range(heads)]

    for h in range(heads):
        scores = [[0.0] * seq_len for _ in range(seq_len)]
        for i in range(seq_len):
            for j in range(i + 1):
                dot = sum(q[h][i][d] * k[h][j][d] for d in range(d_k))
                scores[i][j] = dot / math.sqrt(d_k)
            for j in range(i + 1, seq_len):
                scores[i][j] = -1e9

        # Softmax per row
        attn = []
        for i in range(seq_len):
            max_val = max(scores[i][:i + 1])
            exps = [math.exp(scores[i][j] - max_val) if j <= i else 0.0 for j in range(seq_len)]
            sum_exp = sum(exps)
            attn.append([x / sum_exp for x in exps])

        # Multiply with Value matrix
        for i in range(seq_len):
            for d in range(d_k):
                output[h][i][d] = sum(attn[i][j] * v[h][j][d] for j in range(seq_len))
    return output`,
    verificationAssertion: 'q = [[[1.0, 0.0], [0.0, 1.0]]]; k = [[[1.0, 0.0], [0.0, 1.0]]]; v = [[[2.0, 3.0], [4.0, 5.0]]]; out = causal_multi_head_attention(q, k, v, 2); assert len(out[0]) == 2 and len(out[0][0]) == 2',
  },
  {
    id: 77,
    title: 'Rotary Position Embedding (RoPE) for Key-Query Vectors',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Rotate 2D coordinate pairs of query and key embeddings based on position indices.',
    optimalComplexity: { time: 'O(T * D)', space: 'O(T * D)' },
    canonicalSolution: `import math

def apply_rotary_pos_emb(x: list[list[float]], base: float = 10000.0) -> list[list[float]]:
    seq_len, dim = len(x), len(x[0])
    out = [[0.0] * dim for _ in range(seq_len)]
    for pos in range(seq_len):
        for i in range(0, dim, 2):
            theta = 1.0 / (base ** (i / dim))
            angle = pos * theta
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            x0 = x[pos][i]
            x1 = x[pos][i + 1]
            out[pos][i] = x0 * cos_a - x1 * sin_a
            out[pos][i + 1] = x0 * sin_a + x1 * cos_a
    return out`,
    verificationAssertion: 'v = [[1.0, 0.0], [1.0, 0.0]]; r = apply_rotary_pos_emb(v); assert r[0][0] == 1.0 and r[0][1] == 0.0',
  },
  {
    id: 78,
    title: 'FlashAttention-2 Tiled Online Softmax Forward Algorithm',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Grandmaster',
    assignedBotId: 'ml-pipeline',
    description: 'Online running maximum and normalization factor updates in block tiles to avoid materializing N^2 attention.',
    optimalComplexity: { time: 'O(T^2 * d)', space: 'O(T * d)' },
    canonicalSolution: `import math

class OnlineSoftmaxBlock:
    def __init__(self, d: int):
        self.d = d
        self.m = -float('inf')
        self.l = 0.0
        self.o = [0.0] * d

    def update(self, block_scores: list[float], block_values: list[list[float]]):
        m_block = max(block_scores)
        m_new = max(self.m, m_block)
        exp_old = math.exp(self.m - m_new) if self.m != -float('inf') else 0.0
        exp_block = [math.exp(s - m_new) for s in block_scores]
        l_new = self.l * exp_old + sum(exp_block)
        for i in range(self.d):
            val_term = sum(exp_block[j] * block_values[j][i] for j in range(len(block_scores)))
            self.o[i] = (self.o[i] * self.l * exp_old + val_term) / l_new
        self.m = m_new
        self.l = l_new`,
    verificationAssertion: 'b = OnlineSoftmaxBlock(2); b.update([1.0, 2.0], [[1.0, 1.0], [2.0, 2.0]]); assert len(b.o) == 2 and b.l > 0',
  },
  {
    id: 79,
    title: 'PagedAttention Virtual KV-Cache Memory Block Manager',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Zero internal memory fragmentation table managing non-contiguous physical KV cache blocks (vLLM architecture).',
    optimalComplexity: { time: 'O(1) allocation/lookup', space: 'O(B * S)' },
    canonicalSolution: `class PagedKVCacheManager:
    def __init__(self, block_size: int = 16, num_physical_blocks: int = 128):
        self.block_size = block_size
        self.free_blocks = list(range(num_physical_blocks))
        self.block_tables = {}

    def allocate_sequence(self, seq_id: str, prompt_len: int) -> list[int]:
        num_blocks = (prompt_len + self.block_size - 1) // self.block_size
        allocated = [self.free_blocks.pop() for _ in range(num_blocks)]
        self.block_tables[seq_id] = allocated
        return allocated

    def append_token(self, seq_id: str, current_len: int) -> int:
        table = self.block_tables[seq_id]
        if current_len % self.block_size == 0:
            new_block = self.free_blocks.pop()
            table.append(new_block)
        return table[-1]

    def free_sequence(self, seq_id: str):
        if seq_id in self.block_tables:
            self.free_blocks.extend(self.block_tables.pop(seq_id))`,
    verificationAssertion: 'pm = PagedKVCacheManager(4, 10); blocks = pm.allocate_sequence("s1", 6); assert len(blocks) == 2; pm.append_token("s1", 8); assert len(pm.block_tables["s1"]) == 3',
  },
  {
    id: 80,
    title: 'Byte-Pair Encoding (BPE) Subword Tokenizer Training & Inference',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Train statistical merge dictionary on character frequencies and segment novel text without external dependencies.',
    optimalComplexity: { time: 'O(K * N)', space: 'O(V)' },
    canonicalSolution: `from collections import Counter

class BpeTokenizer:
    def __init__(self, num_merges: int = 10):
        self.num_merges = num_merges
        self.merges = {}

    def train(self, corpus: list[str]):
        vocab = Counter(' '.join(list(w)) + ' </w>' for w in corpus)
        for _ in range(self.num_merges):
            pairs = Counter()
            for word, freq in vocab.items():
                symbols = word.split()
                for i in range(len(symbols) - 1):
                    pairs[(symbols[i], symbols[i + 1])] += freq
            if not pairs:
                break
            best_pair = pairs.most_common(1)[0][0]
            self.merges[best_pair] = ''.join(best_pair)
            new_vocab = {}
            bigram = ' '.join(best_pair)
            replacement = ''.join(best_pair)
            for word, freq in vocab.items():
                new_word = word.replace(bigram, replacement)
                new_vocab[new_word] = freq
            vocab = new_vocab

    def tokenize(self, word: str) -> list[str]:
        tokens = list(word) + ['</w>']
        for pair, merged in self.merges.items():
            i = 0
            new_tokens = []
            while i < len(tokens):
                if i < len(tokens) - 1 and tokens[i] == pair[0] and tokens[i + 1] == pair[1]:
                    new_tokens.append(merged)
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            tokens = new_tokens
        return tokens`,
    verificationAssertion: 'bpe = BpeTokenizer(5); bpe.train(["low", "lowest", "newer", "wider"]); toks = bpe.tokenize("low"); assert "</w>" in toks[-1] or "low</w>" in toks',
  },
  {
    id: 81,
    title: 'Reciprocal Rank Fusion (RRF) for Hybrid Vector + BM25 Search',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'advanced-rag',
    description: 'Merge ranked result lists from disparate scoring algorithms (dense vector and sparse BM25).',
    optimalComplexity: { time: 'O(K * L)', space: 'O(N)' },
    canonicalSolution: `def reciprocal_rank_fusion(
    ranked_lists: list[list[str]],
    k: int = 60
) -> list[tuple[str, float]]:
    rrf_scores = {}
    for r_list in ranked_lists:
        for rank, doc_id in enumerate(r_list):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))
    return sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)`,
    verificationAssertion: 'l1 = ["docA", "docB", "docC"]; l2 = ["docB", "docA", "docD"]; fused = reciprocal_rank_fusion([l1, l2]); assert fused[0][0] in ["docA", "docB"]',
  },
  {
    id: 82,
    title: 'Vector Similarity Engine (Cosine, Inner Product, L2 Norm)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Pure standard library vector distance operations with zero external binary packages.',
    optimalComplexity: { time: 'O(D)', space: 'O(1)' },
    canonicalSolution: `import math

class VectorMetrics:
    @staticmethod
    def dot_product(a: list[float], b: list[float]) -> float:
        return sum(x * y for x, y in zip(a, b))

    @staticmethod
    def l2_norm(a: list[float]) -> float:
        return math.sqrt(sum(x * x for x in a))

    @classmethod
    def cosine_similarity(cls, a: list[float], b: list[float]) -> float:
        norm_a = cls.l2_norm(a)
        norm_b = cls.l2_norm(b)
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return cls.dot_product(a, b) / (norm_a * norm_b)

    @staticmethod
    def euclidean_distance(a: list[float], b: list[float]) -> float:
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))`,
    verificationAssertion: 'v1 = [1.0, 0.0]; v2 = [0.0, 1.0]; assert VectorMetrics.cosine_similarity(v1, v2) == 0.0 and VectorMetrics.cosine_similarity(v1, v1) == 1.0',
  },
  {
    id: 83,
    title: 'Automatic Differentiation Computation Graph Engine (Scalar Autograd)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Grandmaster',
    assignedBotId: 'ml-pipeline',
    description: 'Reverse-mode automatic differentiation DAG building gradients backwards.',
    optimalComplexity: { time: 'O(V + E) backward', space: 'O(V)' },
    canonicalSolution: `class Value:
    def __init__(self, data: float, children: tuple = (), op: str = ''):
        self.data = float(data)
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(children)
        self._op = op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def backward(self):
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)
        self.grad = 1.0
        for v in reversed(topo):
            v._backward()`,
    verificationAssertion: 'a = Value(2.0); b = Value(-3.0); c = Value(10.0); d = a * b + c; d.backward(); assert a.grad == -3.0 and b.grad == 2.0 and d.data == 4.0',
  },
  {
    id: 84,
    title: 'Beam Search Text Generation Decoder with N-Gram Repetition Block',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Generate sequence tokens tracking beam width candidates with length penalty and repetition suppression.',
    optimalComplexity: { time: 'O(T * B * V)', space: 'O(B * T)' },
    canonicalSolution: `import math

def beam_search_decode(
    step_prob_fn,
    start_token: int,
    beam_width: int = 3,
    max_steps: int = 5,
    no_repeat_ngram_size: int = 2
) -> list[int]:
    beams = [([start_token], 0.0)]

    for _ in range(max_steps):
        candidates = []
        for seq, score in beams:
            probs = step_prob_fn(seq)
            # N-gram repetition blocking
            banned = set()
            if no_repeat_ngram_size > 0 and len(seq) >= no_repeat_ngram_size - 1:
                prefix = tuple(seq[-(no_repeat_ngram_size - 1):])
                for i in range(len(seq) - no_repeat_ngram_size + 1):
                    if tuple(seq[i: i + no_repeat_ngram_size - 1]) == prefix:
                        banned.add(seq[i + no_repeat_ngram_size - 1])
            for token_id, prob in enumerate(probs):
                if token_id in banned:
                    continue
                new_score = score + math.log(max(prob, 1e-12))
                candidates.append((seq + [token_id], new_score))
        candidates.sort(key=lambda x: x[1] / len(x[0]), reverse=True)
        beams = candidates[:beam_width]

    return beams[0][0]`,
    verificationAssertion: 'fn = lambda seq: [0.1, 0.7, 0.2]; res = beam_search_decode(fn, 0, 2, 3); assert len(res) == 4 and res[1] == 1',
  },
  {
    id: 85,
    title: 'Low-Rank Adaptation (LoRA) Layer Decomposition (W + alpha/r * B * A)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Parameter-efficient adaptation layer decomposing weight update matrix into rank r matrices.',
    optimalComplexity: { time: 'O(B * (D_in * r + r * D_out))', space: 'O(r * (D_in + D_out))' },
    canonicalSolution: `class LoRALinear:
    def __init__(self, in_features: int, out_features: int, rank: int = 4, alpha: float = 8.0):
        self.in_features = in_features
        self.out_features = out_features
        self.rank = rank
        self.scaling = alpha / rank
        self.base_w = [[0.1] * in_features for _ in range(out_features)]
        self.lora_a = [[0.05] * in_features for _ in range(rank)]
        self.lora_b = [[0.0] * rank for _ in range(out_features)]

    def forward(self, x: list[float]) -> list[float]:
        # Base forward
        out = [sum(self.base_w[i][j] * x[j] for j in range(self.in_features)) for i in range(self.out_features)]
        # LoRA forward
        a_out = [sum(self.lora_a[r][j] * x[j] for j in range(self.in_features)) for r in range(self.rank)]
        b_out = [sum(self.lora_b[i][r] * a_out[r] for r in range(self.rank)) * self.scaling for i in range(self.out_features)]
        return [base + lora for base, lora in zip(out, b_out)]`,
    verificationAssertion: 'lora = LoRALinear(2, 2, 2); res = lora.forward([1.0, 2.0]); assert len(res) == 2',
  },
  {
    id: 86,
    title: 'KV-Cache with Speculative Decoding Verification Loop',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Grandmaster',
    assignedBotId: 'ml-pipeline',
    description: 'Draft model token generation verified in parallel by target model in speculative decoding.',
    optimalComplexity: { time: 'O(K) parallel validation', space: 'O(K * D)' },
    canonicalSolution: `def speculative_verification_loop(
    draft_tokens: list[int],
    target_logits_fn,
    draft_logits_fn
) -> list[int]:
    accepted = []
    for i, token in enumerate(draft_tokens):
        p_target = target_logits_fn(accepted, token)
        p_draft = draft_logits_fn(accepted, token)
        if p_target >= p_draft:
            accepted.append(token)
        else:
            accept_prob = p_target / max(p_draft, 1e-12)
            if accept_prob > 0.5:
                accepted.append(token)
            else:
                break
    return accepted`,
    verificationAssertion: 't_fn = lambda a, t: 0.8; d_fn = lambda a, t: 0.6; res = speculative_verification_loop([1, 2, 3], t_fn, d_fn); assert res == [1, 2, 3]',
  },
  {
    id: 87,
    title: 'RMSNorm (Root Mean Square Layer Normalization)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Llama 3 style normalization enforcing scale invariance without mean centering overhead.',
    optimalComplexity: { time: 'O(D)', space: 'O(D)' },
    canonicalSolution: `import math

def rms_norm(x: list[float], gamma: list[float], eps: float = 1e-6) -> list[float]:
    dim = len(x)
    rms = math.sqrt(sum(v * v for v in x) / dim + eps)
    return [(v / rms) * g for v, g in zip(x, gamma)]`,
    verificationAssertion: 'x = [2.0, -2.0]; g = [1.0, 1.0]; res = rms_norm(x, g); assert round(res[0], 2) == 1.0 and round(res[1], 2) == -1.0',
  },
  {
    id: 88,
    title: 'SwiGLU Gated Linear Unit Activation Function',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Swish-gated linear transformation applied in PaLM and modern LLM feedforward networks.',
    optimalComplexity: { time: 'O(D)', space: 'O(D)' },
    canonicalSolution: `import math

def swish(x: float) -> float:
    return x / (1.0 + math.exp(-max(min(x, 20.0), -20.0)))

def swiglu_forward(x_gate: list[float], x_up: list[float]) -> list[float]:
    return [swish(g) * u for g, u in zip(x_gate, x_up)]`,
    verificationAssertion: 'out = swiglu_forward([0.0, 2.0], [5.0, 3.0]); assert round(out[0], 2) == 0.0 and out[1] > 2.0',
  },
  {
    id: 89,
    title: 'Grouped-Query Attention (GQA) Head Broadcast Projection',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Group Q query heads across smaller shared set of KV heads for memory compression.',
    optimalComplexity: { time: 'O(H_q * T * D)', space: 'O(H_q * T * D)' },
    canonicalSolution: `def expand_kv_for_gqa(
    kv_heads: list[list[list[float]]],
    num_query_heads: int
) -> list[list[list[float]]]:
    num_kv = len(kv_heads)
    group_size = num_query_heads // num_kv
    expanded = []
    for h in range(num_kv):
        for _ in range(group_size):
            expanded.append([row[:] for row in kv_heads[h]])
    return expanded`,
    verificationAssertion: 'kv = [[[1.0, 2.0]], [[3.0, 4.0]]]; gqa = expand_kv_for_gqa(kv, 4); assert len(gqa) == 4 and gqa[0] == gqa[1]',
  },
  {
    id: 90,
    title: 'Int8 Symmetric Tensor Quantization with Dynamic Scale',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Quantize floating-point tensor to int8 [-127, 127] with dynamic max-abs calibration and dequantization.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `def quantize_int8(tensor: list[float]) -> tuple[list[int], float]:
    max_val = max(abs(x) for x in tensor)
    if max_val == 0.0:
        return [0] * len(tensor), 1.0
    scale = max_val / 127.0
    q_tensor = [max(-127, min(127, round(x / scale))) for x in tensor]
    return q_tensor, scale

def dequantize_int8(q_tensor: list[int], scale: float) -> list[float]:
    return [q * scale for q in q_tensor]`,
    verificationAssertion: 'orig = [-1.0, 0.0, 2.0]; q, s = quantize_int8(orig); deq = dequantize_int8(q, s); assert abs(orig[2] - deq[2]) < 0.05',
  },
  {
    id: 91,
    title: 'Okapi BM25 Sparse Inverted Index & Scoring',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'advanced-rag',
    description: 'Exact TF-IDF Okapi BM25 document relevance scoring with saturation k1 and length normalization b.',
    optimalComplexity: { time: 'O(Q * |D|)', space: 'O(V * D)' },
    canonicalSolution: `import math
from collections import Counter

class BM25Index:
    def __init__(self, corpus: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs = [doc.lower().split() for doc in corpus]
        self.n = len(self.docs)
        self.avgdl = sum(len(d) for d in self.docs) / max(1, self.n)
        self.df = Counter()
        for d in self.docs:
            for term in set(d):
                self.df[term] += 1

    def score(self, query: str) -> list[tuple[int, float]]:
        q_terms = query.lower().split()
        scores = []
        for idx, doc in enumerate(self.docs):
            doc_len = len(doc)
            tf = Counter(doc)
            s = 0.0
            for term in q_terms:
                if term in tf:
                    idf = math.log((self.n - self.df[term] + 0.5) / (self.df[term] + 0.5) + 1.0)
                    term_score = (tf[term] * (self.k1 + 1)) / (tf[term] + self.k1 * (1 - self.b + self.b * (doc_len / self.avgdl)))
                    s += idf * term_score
            scores.append((idx, s))
        return sorted(scores, key=lambda x: x[1], reverse=True)`,
    verificationAssertion: 'corpus = ["machine learning in python", "distributed neural consensus", "deep learning architecture"]; bm = BM25Index(corpus); assert bm.score("python")[0][0] == 0',
  },
  {
    id: 92,
    title: 'Hierarchical Softmax Tree for Rapid Word Prediction',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Binary Huffman tree probability decomposition accelerating vocabulary computation to O(log V).',
    optimalComplexity: { time: 'O(log V)', space: 'O(V)' },
    canonicalSolution: `import math

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(x, 20.0), -20.0)))

def hierarchical_softmax_prob(path_bits: list[int], node_logits: list[float]) -> float:
    prob = 1.0
    for bit, logit in zip(path_bits, node_logits):
        p_turn = sigmoid(logit)
        prob *= p_turn if bit == 1 else (1.0 - p_turn)
    return prob`,
    verificationAssertion: 'assert round(hierarchical_softmax_prob([1, 0], [0.0, 0.0]), 4) == 0.25',
  },
  {
    id: 93,
    title: 'Teacher-Student Knowledge Distillation Loss (KL Divergence with Temperature)',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Compress large model representation by aligning softened logits distribution with temperature.',
    optimalComplexity: { time: 'O(V)', space: 'O(V)' },
    canonicalSolution: `import math

def distillation_loss(
    student_logits: list[float],
    teacher_logits: list[float],
    temperature: float = 2.0
) -> float:
    def softmax_t(logits: list[float], t: float) -> list[float]:
        max_l = max(logits)
        exps = [math.exp((x - max_l) / t) for x in logits]
        s = sum(exps)
        return [e / s for e in exps]

    p_s = softmax_t(student_logits, temperature)
    p_t = softmax_t(teacher_logits, temperature)
    kl = sum(t * math.log(max(t / max(s, 1e-12), 1e-12)) for t, s in zip(p_t, p_s))
    return kl * (temperature ** 2)`,
    verificationAssertion: 'loss = distillation_loss([1.0, 2.0], [1.0, 2.0], 2.0); assert abs(loss) < 1e-4',
  },
  {
    id: 94,
    title: 'Cross-Entropy Loss with Label Smoothing Regularization',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Prevent overconfidence by distributing epsilon probability mass uniformly across all classes.',
    optimalComplexity: { time: 'O(K)', space: 'O(K)' },
    canonicalSolution: `import math

def cross_entropy_label_smoothing(
    logits: list[float],
    target_idx: int,
    smoothing: float = 0.1
) -> float:
    k = len(logits)
    max_l = max(logits)
    exps = [math.exp(x - max_l) for x in logits]
    log_probs = [math.log(e / sum(exps)) for e in exps]
    smooth_target = [smoothing / k] * k
    smooth_target[target_idx] += (1.0 - smoothing)
    return -sum(t * lp for t, lp in zip(smooth_target, log_probs))`,
    verificationAssertion: 'loss = cross_entropy_label_smoothing([2.0, 0.5], 0, 0.1); assert loss > 0.0',
  },
  {
    id: 95,
    title: 'AdamW Optimizer Step with Decoupled Weight Decay',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'First and second moment vector update with true decoupled weight decay and bias correction.',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    canonicalSolution: `import math

class AdamWOptimizer:
    def __init__(self, lr: float = 1e-3, beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8, weight_decay: float = 0.01):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.weight_decay = weight_decay
        self.m = {}
        self.v = {}
        self.t = 0

    def step(self, param: list[float], grad: list[float]) -> list[float]:
        self.t += 1
        n = len(param)
        if 0 not in self.m:
            self.m[0] = [0.0] * n
            self.v[0] = [0.0] * n
        m, v = self.m[0], self.v[0]
        out = [0.0] * n
        for i in range(n):
            param[i] -= self.lr * self.weight_decay * param[i]
            m[i] = self.beta1 * m[i] + (1.0 - self.beta1) * grad[i]
            v[i] = self.beta2 * v[i] + (1.0 - self.beta2) * (grad[i] ** 2)
            m_hat = m[i] / (1.0 - (self.beta1 ** self.t))
            v_hat = v[i] / (1.0 - (self.beta2 ** self.t))
            out[i] = param[i] - self.lr * m_hat / (math.sqrt(v_hat) + self.eps)
        return out`,
    verificationAssertion: 'opt = AdamWOptimizer(); p = [1.0, 2.0]; g = [0.1, -0.1]; p_new = opt.step(p, g); assert p_new[0] < p[0] and p_new[1] > p[1]',
  },
  {
    id: 96,
    title: 'InfoNCE Contrastive Loss for Representation Learning',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Contrastive estimation maximizing positive pair mutual information against negative distractors.',
    optimalComplexity: { time: 'O(B * D)', space: 'O(B)' },
    canonicalSolution: `import math

def info_nce_loss(
    query: list[float],
    positive: list[float],
    negatives: list[list[float]],
    temperature: float = 0.07
) -> float:
    def cos_sim(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        n_a = math.sqrt(sum(x * x for x in a))
        n_b = math.sqrt(sum(y * y for y in b))
        return dot / (n_a * n_b + 1e-12)

    pos_sim = cos_sim(query, positive) / temperature
    neg_sims = [cos_sim(query, neg) / temperature for neg in negatives]
    max_val = max([pos_sim] + neg_sims)
    pos_exp = math.exp(pos_sim - max_val)
    denom = pos_exp + sum(math.exp(ns - max_val) for ns in neg_sims)
    return -math.log(pos_exp / denom)`,
    verificationAssertion: 'q = [1.0, 0.0]; pos = [0.9, 0.1]; negs = [[0.0, 1.0], [-1.0, 0.0]]; loss = info_nce_loss(q, pos, negs); assert loss >= 0.0',
  },
  {
    id: 97,
    title: 'Top-P (Nucleus) & Top-K Sampling Distribution Filter',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Filter next-token probability distribution truncating tail tokens above cumulative threshold p.',
    optimalComplexity: { time: 'O(V log V)', space: 'O(V)' },
    canonicalSolution: `def top_k_top_p_filtering(
    probs: list[float],
    top_k: int = 5,
    top_p: float = 0.9
) -> list[float]:
    indexed = sorted(enumerate(probs), key=lambda x: x[1], reverse=True)
    if top_k > 0:
        indexed = indexed[:top_k]
    cum_sum = 0.0
    filtered_pairs = []
    for idx, p in indexed:
        filtered_pairs.append((idx, p))
        cum_sum += p
        if cum_sum >= top_p:
            break
    total = sum(p for _, p in filtered_pairs)
    out = [0.0] * len(probs)
    for idx, p in filtered_pairs:
        out[idx] = p / total
    return out`,
    verificationAssertion: 'probs = [0.6, 0.25, 0.1, 0.05]; filtered = top_k_top_p_filtering(probs, 2, 0.8); assert sum(filtered) > 0.99 and filtered[2] == 0.0',
  },
  {
    id: 98,
    title: 'Mixture of Experts (MoE) Top-2 Softmax Gating Layer',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Grandmaster',
    assignedBotId: 'ml-pipeline',
    description: 'Dynamically route tokens to top-2 expert networks with normalized softmax weighting (Mixtral style).',
    optimalComplexity: { time: 'O(E + 2 * D)', space: 'O(D)' },
    canonicalSolution: `import math

class MoEGating:
    def __init__(self, num_experts: int = 8, d_model: int = 4):
        self.num_experts = num_experts
        self.gate_w = [[0.1 * (i + j) for j in range(d_model)] for i in range(num_experts)]

    def route(self, token_emb: list[float]) -> list[tuple[int, float]]:
        logits = [sum(self.gate_w[e][d] * token_emb[d] for d in range(len(token_emb))) for e in range(self.num_experts)]
        top2 = sorted(enumerate(logits), key=lambda x: x[1], reverse=True)[:2]
        max_l = max(top2[0][1], top2[1][1])
        e1 = math.exp(top2[0][1] - max_l)
        e2 = math.exp(top2[1][1] - max_l)
        s = e1 + e2
        return [(top2[0][0], e1 / s), (top2[1][0], e2 / s)]`,
    verificationAssertion: 'moe = MoEGating(4, 2); routes = moe.route([1.0, 1.0]); assert len(routes) == 2 and abs(routes[0][1] + routes[1][1] - 1.0) < 1e-5',
  },
  {
    id: 99,
    title: 'Trie-Based Lexicon Constrained Decoding with Prefix Masking',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Extreme',
    assignedBotId: 'ml-pipeline',
    description: 'Mask next token probability logits strictly allowing transitions that follow valid trie paths.',
    optimalComplexity: { time: 'O(L) per token', space: 'O(sum|words|)' },
    canonicalSolution: `class ConstrainedTrie:
    def __init__(self):
        self.trie = {}

    def insert(self, tokens: list[int]):
        node = self.trie
        for t in tokens:
            node = node.setdefault(t, {})
        node[-1] = True

    def get_allowed_tokens(self, prefix: list[int]) -> list[int]:
        node = self.trie
        for t in prefix:
            if t not in node:
                return []
            node = node[t]
        return [t for t in node if t != -1]`,
    verificationAssertion: 't = ConstrainedTrie(); t.insert([1, 2, 3]); t.insert([1, 4]); assert set(t.get_allowed_tokens([1])) == {2, 4}',
  },
  {
    id: 100,
    title: 'Perplexity and Cross-Entropy Evaluation Loop for Language Models',
    category: 'AI/ML & Deep Neural Mechanics',
    difficulty: 'Hard',
    assignedBotId: 'ml-pipeline',
    description: 'Calculate average cross-entropy loss and exponential perplexity (PPL) across token sequence.',
    optimalComplexity: { time: 'O(T * V)', space: 'O(1)' },
    canonicalSolution: `import math

def evaluate_model_perplexity(
    token_ids: list[int],
    logits_sequence: list[list[float]]
) -> tuple[float, float]:
    total_loss = 0.0
    count = len(token_ids)
    for target, logits in zip(token_ids, logits_sequence):
        max_l = max(logits)
        exps = [math.exp(x - max_l) for x in logits]
        prob = exps[target] / sum(exps)
        total_loss -= math.log(max(prob, 1e-12))
    avg_loss = total_loss / max(1, count)
    perplexity = math.exp(avg_loss)
    return avg_loss, perplexity`,
    verificationAssertion: 'tokens = [0, 1]; logits = [[2.0, 0.0], [0.0, 2.0]]; loss, ppl = evaluate_model_perplexity(tokens, logits); assert loss > 0.0 and ppl >= 1.0',
  },
]
