# NEMI Hybrid GraphRAG

NEMI is a local Electron AI assistant with a hybrid retrieval pipeline. It combines semantic document search with source-grounded knowledge-graph relationships before sending context to the language model.

## Retrieval architecture

```text
Documents
   |
   +--> chunking + embeddings --> vector retrieval
   |
   +--> entity/relationship extraction --> JSON graph fallback
                                      \--> optional Neo4j mirror

vector chunks + graph facts + provenance
                  |
                  v
          grounded LLM prompt
```

- **Vector retrieval** finds passages that are semantically relevant to a question.
- **Graph retrieval** exposes entities, relationships, and source evidence from those passages.
- **Prompt assembly** combines both as untrusted reference evidence and preserves document/chunk provenance.
- **Fallback behavior** keeps local JSON storage and heuristic extraction available when Neo4j or an embedding model is offline.

## Run locally

```bash
npm ci
python3 -m venv venv
cp .env.example .env
npm run dev
```

Install Ollama and pull a supported local model before using local chat. Python 3.11+ is needed for the RAG service. The minimal RAG service uses a TF-IDF fallback; optional `sentence-transformers` enables neural embeddings and may download model weights.

To enable the Neo4j mirror:

```bash
docker compose up -d
export NEO4J_URI=bolt://127.0.0.1:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=nemi-local-dev
```

Neo4j is optional. The RAG service remains usable without it.

## Client demonstration

1. Start NEMI and wait for the RAG service to become ready.
2. Open **Advanced RAG** and upload a document containing a relationship such as `NEMI uses Neo4j for Graph RAG.`
3. Inspect the knowledge graph and its source evidence.
4. Ask: `What does NEMI use for Graph RAG?`
5. Verify that the answer can use both the retrieved passage and the graph relationship.

## Verification

```bash
npm test
npm run build
./venv/bin/python3 -m unittest discover tests -v
```

## Portfolio scope

This repository demonstrates hybrid retrieval and graph provenance. No benchmark establishes that it outperforms vector-only RAG on multi-hop queries. Neo4j is optional; JSON graph storage and heuristic extraction provide a fallback. Local operation depends on the selected provider and configuration: optional cloud providers and initial model downloads can use the network.

For focused, standard-library RAG checks:

```bash
python3 -m unittest discover -s tests -p 'test_graph_rag_domain.py' -v
python3 -m unittest discover -s tests -p 'test_rag_persistence.py' -v
```

These checks cover graph evidence and persistence. They do not validate the complete Electron interface, cloud providers, voice pipeline, or a live Neo4j instance.

The RAG service exposes additive graph fields through `/health`, `/upload`, `/query`, and `/graph/query`. Neo4j credentials stay in the main process environment and are never exposed to the renderer.
