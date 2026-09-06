import importlib.util
import tempfile
import unittest
from pathlib import Path


SPEC = importlib.util.spec_from_file_location('nemi_rag', Path(__file__).parents[1] / 'rag_server.py')
rag = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rag)


class RagPersistenceTest(unittest.TestCase):
    def setUp(self):
        rag.reset_memory_for_test()

    def tearDown(self):
        rag.reset_memory_for_test()
    def test_document_is_retrievable_after_store_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            rag.configure_store(directory)
            rag.embedding_mode = 'tfidf'
            rag.embedding_model = rag.TFIDFEmbedder()
            rag.index_document('abhi', 'profile.txt', 'Abhi uses NEMI for local AI assistance.')
            rag.reset_memory_for_test()
            rag.load_store()

            results = rag.retrieve('Who uses NEMI?')

            self.assertEqual(results[0]['doc_id'], 'abhi')
            self.assertTrue(Path(directory, 'rag-store.json').exists())

    def test_document_deletion_persists_after_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            rag.configure_store(directory)
            rag.embedding_mode = 'tfidf'
            rag.embedding_model = rag.TFIDFEmbedder()
            rag.index_document('doc1', 'doc1.txt', 'First test document.')
            rag.index_document('doc2', 'doc2.txt', 'Second test document.')

            self.assertEqual(len(rag.doc_registry), 2)
            deleted = rag.delete_document('doc1')
            self.assertTrue(deleted)
            self.assertNotIn('doc1', rag.doc_registry)

            # Reload from disk
            rag.reset_memory_for_test()
            rag.load_store()

            self.assertNotIn('doc1', rag.doc_registry)
            self.assertIn('doc2', rag.doc_registry)
            self.assertTrue(all(c['doc_id'] != 'doc1' for c in rag.chunks_store))

    def test_delete_nonexistent_document_returns_false(self):
        with tempfile.TemporaryDirectory() as directory:
            rag.configure_store(directory)
            rag.embedding_mode = 'tfidf'
            rag.embedding_model = rag.TFIDFEmbedder()
            self.assertFalse(rag.delete_document('nonexistent'))

    def test_recompute_chunk_embeddings_when_dimension_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            rag.configure_store(directory)
            rag.embedding_mode = 'tfidf'
            rag.embedding_model = rag.TFIDFEmbedder()
            rag.index_document('doc1', 'doc1.txt', 'Testing vector recomputation.')

            old_vec_len = len(rag.chunks_store[0]['embedding'])
            # Mock an embedder with different dimensions
            class Mock128Embedder:
                def encode(self, texts):
                    return [[0.5] * 128 for _ in texts]

            rag.embedding_model = Mock128Embedder()
            rag.recompute_chunk_embeddings_if_needed()

            self.assertEqual(len(rag.chunks_store[0]['embedding']), 128)


if __name__ == '__main__':
    unittest.main()
