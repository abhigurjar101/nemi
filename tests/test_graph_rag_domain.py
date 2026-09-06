import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location('nemi_rag_graph', Path(__file__).parents[1] / 'rag_server.py')
rag = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rag)


class GraphRagDomainTest(unittest.TestCase):
    def test_normalizes_a_valid_extracted_relationship(self):
        parsed = rag.parse_graph_extraction({
            'entities': [{'name': 'NEMI', 'type': 'product'}],
            'relationships': [{
                'source': 'NEMI',
                'target': 'Neo4j',
                'type': 'uses',
                'evidence': 'NEMI uses Neo4j.',
                'confidence': 0.9,
            }],
        }, 'doc::chunk::0')

        self.assertEqual(parsed.entities[0].canonical_name, 'nemi')
        self.assertEqual(parsed.relationships[0].type, 'USES')
        self.assertEqual(parsed.relationships[0].chunk_id, 'doc::chunk::0')

    def test_store_is_truthfully_disabled_without_neo4j_environment(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(rag.GraphStore.from_environment().status(), {
                'enabled': False,
                'connected': False,
                'nodes': 0,
                'relationships': 0,
                'extractor': 'heuristic',
            })

    def test_heuristic_extraction_keeps_relationship_evidence(self):
        graph = rag.extract_graph_facts(
            'NEMI uses Neo4j for Graph RAG.', 'a::chunk::0', 'heuristic')

        self.assertEqual([entity.name for entity in graph.entities], ['NEMI', 'Neo4j'])
        self.assertEqual(graph.relationships[0].type, 'USES')
        self.assertEqual(graph.relationships[0].evidence, 'NEMI uses Neo4j for Graph RAG.')

    def test_graph_context_is_bounded_and_retains_chunk_provenance(self):
        context = rag.build_graph_context('What does NEMI use?', [{
            'id': 'a::chunk::0',
            'doc_id': 'a',
            'doc_name': 'overview.txt',
            'text': 'NEMI uses Neo4j for Graph RAG.',
            'similarity': 0.9,
        }])

        self.assertEqual(context['edges'][0]['source_chunk_id'], 'a::chunk::0')
        self.assertEqual(context['edges'][0]['evidence'], 'NEMI uses Neo4j for Graph RAG.')
        self.assertLessEqual(len(context['nodes']), 40)


if __name__ == '__main__':
    unittest.main()
