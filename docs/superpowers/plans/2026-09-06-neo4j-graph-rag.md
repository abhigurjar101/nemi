# Neo4j Graph RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Docker-hosted, source-grounded Neo4j Graph RAG experience to NEMI without breaking current local RAG.

**Architecture:** `rag_server.py` remains the sole Neo4j client. It preserves JSON-vector retrieval as a fallback, adds graph-backed ingestion and retrieval, and exposes bounded graph data through the existing Electron bridge. The renderer displays a query/document-scoped graph and evidence.

**Tech Stack:** Python 3, Neo4j Python driver, Docker Compose, Electron, React, TypeScript, unittest, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-neo4j-graph-rag-design.md`

## Global Constraints

- Use Docker Compose and persistent volumes for local Neo4j.
- Never expose Neo4j credentials to the renderer.
- Ollama is the default extractor; API-key extraction is optional.
- Keep all existing RAG HTTP response fields and JSON-store fallback working.
- Every relationship has document/chunk evidence.
- Use a failing test before each behavior change.

---

### Task 1: Graph domain and local Docker service

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `tests/test_graph_rag_domain.py`
- Modify: `rag_server.py`

**Interfaces:**
- Produces `parse_graph_extraction(payload: dict, chunk_id: str) -> GraphExtraction`.
- Produces `GraphStore.from_environment()`, `status()`, `replace_document()`, `delete_document()`, and `clear()`.

- [ ] **Step 1: Write a failing parsing and disabled-store test**

```python
def test_normalizes_a_valid_extracted_relationship():
    parsed = rag_server.parse_graph_extraction({
        'entities': [{'name': 'NEMI', 'type': 'product'}],
        'relationships': [{'source': 'NEMI', 'target': 'Neo4j', 'type': 'uses',
                           'evidence': 'NEMI uses Neo4j.', 'confidence': 0.9}],
    }, 'doc::chunk::0')
    self.assertEqual(parsed.entities[0].canonical_name, 'nemi')
    self.assertEqual(parsed.relationships[0].type, 'USES')
    self.assertEqual(parsed.relationships[0].chunk_id, 'doc::chunk::0')

def test_store_is_truthfully_disabled_without_neo4j_environment(self):
    with patch.dict(os.environ, {}, clear=True):
        self.assertFalse(rag_server.GraphStore.from_environment().status()['enabled'])
```

- [ ] **Step 2: Verify the test fails because the graph API is absent**

Run: `./venv/bin/python3 -m unittest tests/test_graph_rag_domain.py -v`

Expected: FAIL with `AttributeError` for `parse_graph_extraction` / `GraphStore`.

- [ ] **Step 3: Implement minimal graph types and a disabled-safe adapter**

```python
@dataclass(frozen=True)
class GraphEntity:
    id: str
    name: str
    canonical_name: str
    type: str

class GraphStore:
    @classmethod
    def from_environment(cls) -> 'GraphStore': ...
    def status(self) -> dict: ...
```

The adapter accepts `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD`, uses only parameterized Cypher, and returns `{enabled: False, connected: False, nodes: 0, relationships: 0, extractor: 'heuristic'}` when unconfigured.

- [ ] **Step 4: Verify the focused test passes**

Run: `./venv/bin/python3 -m unittest tests/test_graph_rag_domain.py -v`

Expected: PASS.

- [ ] **Step 5: Add Docker Compose and environment template**

```yaml
services:
  neo4j:
    image: neo4j:5-community
    ports: ["127.0.0.1:7474:7474", "127.0.0.1:7687:7687"]
    environment: { NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-nemi-local-dev} }
    volumes: [neo4j_data:/data, neo4j_logs:/logs]
volumes: { neo4j_data: {}, neo4j_logs: {} }
```

- [ ] **Step 6: Re-run focused test and commit**

Run: `./venv/bin/python3 -m unittest tests/test_graph_rag_domain.py -v`

Expected: PASS.

Commit: `git add docker-compose.yml .env.example rag_server.py tests/test_graph_rag_domain.py && git commit -m 'feat: add Neo4j graph primitives'`

### Task 2: Source-grounded graph ingestion and Graph RAG API

**Files:**
- Modify: `rag_server.py`
- Modify: `tests/test_graph_rag_domain.py`
- Modify: `tests/test_full_system_rag.py`

**Interfaces:**
- Produces `extract_graph_facts(text, chunk_id, extractor) -> GraphExtraction`.
- Produces `build_graph_context(query, chunks) -> dict` with `nodes`, `edges`, and `context`.
- Adds `GET /graph` and additive graph fields to `/health`, `/upload`, and `/query`.

- [ ] **Step 1: Write failing graph provenance and HTTP contract tests**

```python
def test_heuristic_extraction_keeps_relationship_evidence(self):
    graph = rag_server.extract_graph_facts(
        'NEMI uses Neo4j for Graph RAG.', 'a::chunk::0', 'heuristic')
    self.assertEqual(graph.relationships[0].evidence, 'NEMI uses Neo4j for Graph RAG.')

def test_query_returns_empty_graph_contract_when_graph_is_offline(self):
    status, body = execute_rag_http('POST', '/query', {'query': 'NEMI'})
    self.assertEqual(status, 200)
    self.assertIn('graph_context', body)
    self.assertIn('graph_nodes', body)
    self.assertIn('graph_edges', body)
```

- [ ] **Step 2: Verify the tests fail for the missing graph behavior**

Run: `./venv/bin/python3 -m unittest tests/test_graph_rag_domain.py tests/test_full_system_rag.py -v`

Expected: FAIL because extraction, graph context, and response fields are absent.

- [ ] **Step 3: Implement extraction and bounded graph retrieval**

Default to Ollama with a 20-second request timeout and schema-validate JSON. Use an OpenAI-compatible endpoint only when configured. On unavailable/malformed model output, derive title-cased and acronym entities with heuristic `RELATED_TO` facts. Enforce at most 20 entities and 30 relationships per chunk, depth 2, 40 nodes, and 80 edges per query. Store every relation with `chunk_id` and evidence.

- [ ] **Step 4: Implement additive HTTP behavior**

Add `GET /graph?doc_id=&query=&limit=`. Add graph health status, upload counts, query evidence, and graph cleanup to delete/clear. Existing fields, response status codes, and JSON vector fallback must not change.

- [ ] **Step 5: Verify server behavior and commit**

Run: `./venv/bin/python3 -m unittest tests/test_graph_rag_domain.py tests/test_full_system_rag.py tests/test_rag_persistence.py -v`

Expected: PASS.

Commit: `git add rag_server.py tests/test_graph_rag_domain.py tests/test_full_system_rag.py && git commit -m 'feat: add source-grounded Graph RAG'`

### Task 3: Electron bridge and interactive Graph view

**Files:**
- Create: `src/renderer/src/components/GraphView.tsx`
- Create: `tests/graphView.test.tsx`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/components/RagPanel.tsx`

**Interfaces:**
- Produces `window.nemi.ragGraph(options?: { docId?: string; query?: string; limit?: number }): Promise<RagGraphResult>`.
- Produces `GraphView({ graph, loading, error, onClose })`.

- [ ] **Step 1: Write failing Graph view tests**

```tsx
it('shows source evidence after selecting a relationship', () => {
  render(<GraphView graph={{nodes: [{id: 'nemi', label: 'NEMI', type: 'PRODUCT'}],
    edges: [{id: 'uses', source: 'nemi', target: 'neo4j', label: 'USES',
      evidence: 'NEMI uses Neo4j.', source_chunk_id: 'd::chunk::0'}],
    summary: {available: true}}} loading={false} error="" onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', {name: /uses/i}))
  expect(screen.getByText('NEMI uses Neo4j.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify the test fails because `GraphView` is absent**

Run: `npm test -- tests/graphView.test.tsx`

Expected: FAIL with module-not-found for `GraphView`.

- [ ] **Step 3: Implement a secure bridge and Graph view**

Validate only `docId`, `query`, and a capped `limit` in the main process; proxy exclusively to `localhost:5003/graph` with a 10-second timeout. Expose typed results in preload. Add a Graph button to `RagPanel`, then render a deterministic SVG layout, readable entity/relationship list, selected-edge evidence, fit/reset control, and honest loading/empty/error states. Add no visualization dependency.

- [ ] **Step 4: Verify focused UI behavior and TypeScript**

Run: `npm test -- tests/graphView.test.tsx && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `git add src/main/index.ts src/preload/index.ts src/renderer/src/components/GraphView.tsx src/renderer/src/components/RagPanel.tsx tests/graphView.test.tsx && git commit -m 'feat: add Graph RAG explorer'`

### Task 4: Chat graph grounding and client demo verification

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `tests/graphView.test.tsx`
- Create: `README.md`

**Interfaces:**
- Produces `buildRagAugmentation(result: RagQueryResult) -> string` for tested, source-labeled chat context.

- [ ] **Step 1: Write a failing augmentation test**

```tsx
it('adds source-labeled graph evidence only when provided', () => {
  expect(buildRagAugmentation({chunks: [], graph_context:
    'NEMI —[USES]→ Neo4j [Source: overview.txt §1]'} as RagQueryResult))
    .toContain('GRAPH RELATIONSHIP EVIDENCE')
  expect(buildRagAugmentation({chunks: [], graph_context: ''} as RagQueryResult))
    .not.toContain('GRAPH RELATIONSHIP EVIDENCE')
})
```

- [ ] **Step 2: Verify expected missing-export failure**

Run: `npm test -- tests/graphView.test.tsx`

Expected: FAIL because `buildRagAugmentation` does not exist.

- [ ] **Step 3: Implement safe augmentation and demo instructions**

Extract the current RAG builder to a pure function, preserve chunk context, append graph context only when non-empty, and label all supplied knowledge-base content as untrusted evidence. Document Docker startup, a sample upload, Graph view verification, relationship-query verification, and Neo4j-off fallback.

- [ ] **Step 4: Run full verification**

Run: `./venv/bin/python3 -m unittest discover tests -v && npm test && npx tsc --noEmit && npm run build`

Expected: all Python and Vitest tests pass, TypeScript has zero errors, and Electron Vite builds successfully.

- [ ] **Step 5: Execute client demo smoke check and commit**

Run: `docker compose up -d && docker compose ps`

Expected: Neo4j is healthy. In NEMI, upload `NEMI uses Neo4j for Graph RAG.`, open Graph, observe the `USES` edge and source evidence, then ask what NEMI uses for Graph RAG.

Commit: `git add src/renderer/src/App.tsx tests/graphView.test.tsx README.md && git commit -m 'feat: ground NEMI chat with graph evidence'`
