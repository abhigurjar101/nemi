#!/usr/bin/env python3
"""
Production-Level Full System In-Memory HTTP Integration Test for NEMI RAG Server
Tests full HTTP request/response parsing, headers, chunking, retrieval, persistence, and concurrency
without requiring OS network socket permissions.
"""

import io
import unittest
import json
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor

import rag_server


class MockHttpSocket:
    """Simulates a TCP client socket for BaseHTTPRequestHandler."""
    def __init__(self, request_bytes: bytes):
        self._rfile = io.BytesIO(request_bytes)
        self._wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self._rfile
        return self._wfile

    def sendall(self, data):
        self._wfile.write(data)

    def close(self):
        pass

    def get_response_bytes(self) -> bytes:
        return self._wfile.getvalue()


class MockServer:
    """Mock server context providing server attributes for BaseHTTPRequestHandler."""
    def __init__(self):
        self.server_name = '127.0.0.1'
        self.server_port = 5003


def execute_rag_http(method: str, path: str, body: dict = None) -> tuple[int, dict]:
    """Sends a raw HTTP request through RAGHandler and parses the HTTP response."""
    payload_bytes = json.dumps(body).encode('utf-8') if body is not None else b''
    headers = [
        f"{method} {path} HTTP/1.1",
        "Host: 127.0.0.1:5003",
        "Content-Type: application/json",
        f"Content-Length: {len(payload_bytes)}",
        "",
        ""
    ]
    raw_request = "\r\n".join(headers).encode('utf-8') + payload_bytes
    sock = MockHttpSocket(raw_request)
    server = MockServer()

    # Instantiate handler - this executes do_GET/do_POST
    rag_server.RAGHandler(sock, ('127.0.0.1', 54321), server)

    raw_response = sock.get_response_bytes()
    header_part, _, body_part = raw_response.partition(b'\r\n\r\n')
    status_line = header_part.split(b'\r\n')[0].decode('utf-8', errors='ignore')
    status_code = int(status_line.split(' ')[1]) if len(status_line.split(' ')) > 1 else 500

    parsed_body = {}
    if body_part:
        try:
            parsed_body = json.loads(body_part.decode('utf-8'))
        except Exception:
            parsed_body = {'raw': body_part.decode('utf-8', errors='ignore')}

    return status_code, parsed_body


class TestFullSystemRagServer(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix='nemi-rag-full-test-')
        rag_server.configure_store(cls.temp_dir)
        rag_server.reset_memory_for_test()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    def setUp(self):
        rag_server.reset_memory_for_test()

    def test_http_health_contract(self):
        status, data = execute_rag_http('GET', '/health')
        self.assertEqual(status, 200)
        self.assertEqual(data.get('status'), 'ok')
        self.assertIn('embedding_mode', data)
        self.assertIn('doc_count', data)
        self.assertIn('chunk_count', data)
        self.assertIn('graph', data)

    def test_http_query_includes_graph_contract_when_graph_is_offline(self):
        status, data = execute_rag_http('POST', '/query', {'query': 'NEMI'})
        self.assertEqual(status, 200)
        self.assertIn('graph_context', data)
        self.assertIn('graph_nodes', data)
        self.assertIn('graph_edges', data)

    def test_http_upload_and_query_flow(self):
        # 1. Ingest knowledge doc
        doc_content = (
            "NEMI Architecture Specification:\n"
            "NEMI is a living AI brain for desktop running Electron and Python.\n"
            "It incorporates an ultra-fast Kokoro voice engine and BGE-M3 RAG pipeline.\n"
            "The default local LLM aggregator is OmniRoute on port 20128."
        )
        status, upload_res = execute_rag_http('POST', '/upload', {
            'doc_id': 'spec-01',
            'name': 'nemi-spec.txt',
            'text': doc_content,
        })
        self.assertEqual(status, 200)
        self.assertEqual(upload_res.get('doc_id'), 'spec-01')
        self.assertGreater(upload_res.get('chunks', 0), 0)

        # 2. Query knowledge
        status, query_res = execute_rag_http('POST', '/query', {
            'query': 'What is OmniRoute port?',
            'top_k': 3,
        })
        self.assertEqual(status, 200)
        chunks = query_res.get('chunks', [])
        self.assertGreater(len(chunks), 0)
        self.assertIn('OmniRoute', chunks[0].get('text', ''))

    def test_http_docs_listing_and_deletion(self):
        execute_rag_http('POST', '/upload', {
            'doc_id': 'doc-a', 'name': 'Doc A', 'text': 'Alpha content test'
        })
        execute_rag_http('POST', '/upload', {
            'doc_id': 'doc-b', 'name': 'Doc B', 'text': 'Beta content test'
        })

        status, docs_res = execute_rag_http('GET', '/docs')
        self.assertEqual(status, 200)
        self.assertEqual(len(docs_res.get('docs', [])), 2)

        # Delete doc-a
        status, del_res = execute_rag_http('POST', '/delete', {'doc_id': 'doc-a'})
        self.assertEqual(status, 200)
        self.assertEqual(del_res.get('status'), 'deleted')

        # Verify only doc-b remains
        status, docs_after = execute_rag_http('GET', '/docs')
        remaining_ids = [d['doc_id'] for d in docs_after.get('docs', [])]
        self.assertNotIn('doc-a', remaining_ids)
        self.assertIn('doc-b', remaining_ids)

    def test_http_clear_all_purge(self):
        execute_rag_http('POST', '/upload', {
            'doc_id': 'doc-1', 'name': 'Doc 1', 'text': 'Temporary data 1'
        })
        execute_rag_http('POST', '/upload', {
            'doc_id': 'doc-2', 'name': 'Doc 2', 'text': 'Temporary data 2'
        })

        status, clear_res = execute_rag_http('POST', '/clear')
        self.assertEqual(status, 200)
        self.assertEqual(clear_res.get('status'), 'cleared')

        status, health = execute_rag_http('GET', '/health')
        self.assertEqual(health.get('doc_count'), 0)
        self.assertEqual(health.get('chunk_count'), 0)

    def test_http_concurrent_queries_thread_safety(self):
        execute_rag_http('POST', '/upload', {
            'doc_id': 'concurrency-doc',
            'name': 'Concurrency Test Doc',
            'text': 'Parallel stress test document for verifying thread safety under concurrent requests.'
        })

        def perform_query(query_str: str):
            status, res = execute_rag_http('POST', '/query', {'query': query_str, 'top_k': 2})
            return status, len(res.get('chunks', []))

        queries = [
            'parallel stress', 'thread safety', 'concurrent requests',
            'verifying safety', 'test document', 'parallel test',
            'stress document', 'requests safety', 'verifying concurrent', 'stress parallel'
        ]

        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(perform_query, queries))

        for status, chunk_count in results:
            self.assertEqual(status, 200)
            self.assertGreater(chunk_count, 0)

    def test_query_returns_both_similarity_and_score(self):
        execute_rag_http('POST', '/upload', {
            'doc_id': 'score-contract-doc',
            'name': 'Score Contract Doc',
            'text': 'The NEMI neural architecture integrates BGE-M3 high precision embeddings.'
        })
        status, res = execute_rag_http('POST', '/query', {'query': 'neural architecture', 'top_k': 1})
        self.assertEqual(status, 200)
        chunks = res.get('chunks', [])
        self.assertGreater(len(chunks), 0)
        first = chunks[0]
        self.assertIn('similarity', first)
        self.assertIn('score', first)
        self.assertEqual(first['similarity'], first['score'])
        self.assertIsInstance(first['similarity'], float)

    def test_chunk_text_step_guard(self):
        # When chunk_size <= overlap, chunk_text must not hang in an infinite loop
        words = "word " * 60
        chunks = rag_server.chunk_text(words, chunk_size=10, overlap=10)
        self.assertGreater(len(chunks), 0)


if __name__ == '__main__':
    unittest.main()
