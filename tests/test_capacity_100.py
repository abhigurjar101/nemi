import json
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPConnection
from pathlib import Path
import importlib.util


SPEC = importlib.util.spec_from_file_location('nemi_rag_capacity', Path(__file__).parents[1] / 'rag_server.py')
rag = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rag)


class Capacity100Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rag.reset_memory_for_test()
        rag.embedding_mode = 'tfidf'
        rag.embedding_model = rag.TFIDFEmbedder()
        rag.index_document('capacity', 'capacity.txt', 'NEMI handles concurrent local knowledge retrieval safely.')
        cls.server = rag.NemiRAGServer(('127.0.0.1', 0), rag.RAGHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        rag.reset_memory_for_test()

    def request(self):
        connection = HTTPConnection('127.0.0.1', self.server.server_port, timeout=10)
        connection.request('POST', '/query', json.dumps({'query': 'knowledge retrieval', 'top_k': 1}), {
            'Content-Type': 'application/json',
            'Content-Length': str(len(json.dumps({'query': 'knowledge retrieval', 'top_k': 1}))),
        })
        response = connection.getresponse()
        body = response.read()
        connection.close()
        return response.status, json.loads(body)

    def test_one_hundred_concurrent_queries_complete_successfully(self):
        with ThreadPoolExecutor(max_workers=100) as executor:
            results = list(executor.map(lambda _index: self.request(), range(100)))

        self.assertTrue(all(status == 200 for status, _body in results))
        self.assertTrue(all(body.get('chunks') for _status, body in results))


if __name__ == '__main__':
    unittest.main()