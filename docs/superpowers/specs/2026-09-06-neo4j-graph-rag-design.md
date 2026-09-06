# NEMI Neo4j Graph RAG Design

## Goal

Make NEMI's existing local document RAG client-demo ready with a Docker-hosted
Neo4j knowledge graph. Uploaded documents must be retrieved both semantically
and through their extracted entity relationships. Users must be able to inspect
the relevant entities and relationships using a dedicated Graph view.

## Scope and deployment boundary

The first release runs locally:

- Neo4j Community runs through Docker Compose and persists data in named Docker
  volumes.
- `rag_server.py` remains the local HTTP service on `127.0.0.1:5003` and is
  the sole process that talks to Neo4j.
- NEMI's renderer never receives a database credential.
- A future AuraDB deployment uses the same service through `NEO4J_URI`,
  `NEO4J_USERNAME`, and `NEO4J_PASSWORD`; no client-facing contract changes.

If Neo4j is unavailable, document indexing and vector retrieval continue using
the existing durable JSON store. The graph UI declares that graph data is
unavailable instead of presenting stale or fabricated data.

## Data model

The graph has a stable, source-grounded schema:

```text
(:Document {id, name, content_hash, added_at})
  -[:HAS_CHUNK]-> (:Chunk {id, index, text, embedding, word_count})
  -[:MENTIONS {chunk_id, evidence, confidence, extractor}]-> (:Entity {id, name, canonical_name, type})

(:Entity)-[:RELATED_TO {type, evidence, confidence, chunk_id, extractor}]->(:Entity)
```

All IDs are deterministic. A document replacement first removes its document,
chunks, and source-specific facts, then writes the replacement as one logical
ingestion. `Entity` nodes are shared by their normalized canonical name and
type. Relationships retain a chunk ID and evidence string, so every displayed
fact can be traced to uploaded text.

Required constraints/indexes:

- unique `Document.id`, `Chunk.id`, and `Entity.id`
- range indexes on `Document.name` and `Entity.canonical_name`
- a vector index on `Chunk.embedding` only when Neo4j supports it; otherwise
  the existing in-process cosine retrieval is used and graph traversal starts
  from those chunks.

## Extraction

For each uploaded chunk, extraction produces strict JSON:

```json
{
  "entities": [{"name": "NEMI", "type": "PRODUCT"}],
  "relationships": [{
    "source": "NEMI", "target": "Neo4j", "type": "USES",
    "evidence": "NEMI uses Neo4j for Graph RAG", "confidence": 0.92
  }]
}
```

The default extractor calls a locally configured Ollama model with a bounded,
injection-resistant prompt and validates its JSON against the schema. An
optional OpenAI-compatible endpoint is selected only when the user has
configured an API key. If either model is unavailable, a deterministic local
extractor creates title-cased/acronym entities and co-occurrence `RELATED_TO`
facts, marked `extractor: "heuristic"`; ingestion never fails because a model
is offline. Model responses can only supply data, never Cypher.

## Retrieval and answer grounding

`POST /query` performs:

1. semantic retrieval of top vector chunks;
2. graph expansion from mentioned entities in those chunks, capped by depth 2,
   40 nodes, and 80 edges;
3. reciprocal-rank fusion of vector and graph evidence;
4. source payload construction with chunks and graph facts, each including
   document/chunk/evidence provenance.

The existing renderer chat augmentation uses returned `chunks` unchanged. It
also receives `graph_context` as supporting evidence. The system prompt tells
the answer model to treat these as untrusted reference text, cite only provided
sources, and say when the knowledge base does not establish an answer.

## Service API

Existing endpoints remain backward compatible. New contracts:

- `GET /health`: adds `graph: {enabled, connected, nodes, relationships,
  extractor}`.
- `GET /graph?doc_id=&query=&limit=`: returns `{ nodes, edges, summary }`.
  Values are bounded and sanitized; either a document ID or query optionally
  scopes the graph.
- `POST /upload`: adds `graph: {entities, relationships, extractor, status}`.
- `POST /query`: adds `graph_context`, `graph_nodes`, and `graph_edges`.

`/delete` and `/clear` remove graph facts as well as vector data. Service calls
have explicit connect/read timeouts and structured, non-secret errors.

## Electron and UI

The main process exposes a single `ragGraph` IPC method that proxies `GET
/graph`. It continues to proxy existing RAG operations; the preload bridge
contains typed graph result contracts.

`RagPanel` receives a **Graph** button next to its current knowledge-base
controls. It opens an in-panel Graph view with:

- a canvas/SVG force layout for the document/query-scoped subgraph;
- color-coded entity types and labeled relationship arrows;
- zoom, fit, selected-node details, and a readable entity/relation list;
- a source evidence panel linking each relationship to its original document
  chunk;
- empty/loading/error states, with no fake graph when the service is offline.

The graph is capped and rendered with no new heavyweight visualization package;
the result remains responsive for a client demonstration.

## Reliability and security

- all service binding remains loopback-only;
- request payload limits, content validation, and top-k/graph expansion caps
  prevent accidental resource exhaustion;
- graph credentials come exclusively from process environment variables and
  are never logged, serialized, or exposed through IPC;
- retries are limited to idempotent Neo4j connection startup; each mutation is
  idempotent by deterministic IDs;
- Docker health checks make local readiness observable; NEMI displays a
  recoverable graph-disabled state if Docker is not running.

## Verification

Tests will cover JSON extraction validation/fallback, graph writes/deletes,
query graph expansion and provenance, HTTP/IPC contracts, Graph UI state
rendering, legacy JSON-store fallback, existing RAG persistence, the full
Vitest suite, Python tests, and a production Electron build. A manual demo
check will upload a sample document, show its graph, and ask a relationship
question in NEMI chat.
