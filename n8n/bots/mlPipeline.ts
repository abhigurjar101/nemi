import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const mlPipelineBot: N8nBot = {
  id: 'ml-pipeline',
  name: 'AI/ML & NLP Pipeline Bot',
  shortName: 'NLP & ML',
  emoji: '🤖',
  category: 'Advanced Production',
  description: 'End-to-end NLP & ML lifecycle: tokenization, preprocessing, neural models, training, evaluation, and serving.',
  defaultWebhook: 'ml/data/prepare',
  workflowFile: 'workflows/ml-pipeline.workflow.json',
  supportedTasks: ['nlp', 'prepare', 'train', 'evaluate', 'deploy', 'monitor', 'tokenize'],
  placeholder: 'Request NLP pipelines, tokenizers, classification, or ML models...',
  samplePrompts: [
    '🤖 End-to-end NLP tokenization and text classification pipeline',
    '📊 Automated feature validation pipeline with data drift checks',
    '📈 PyTorch neural sequence model with evaluation metrics',
  ],
  directive: `You are the Principal AI/ML & Natural Language Processing (NLP) Specialist 🤖.
- Specialize in end-to-end NLP pipelines: text normalization, regex cleaning, tokenization, vocabulary building, embeddings/TF-IDF, neural models, and classification.
- Always output the complete pipeline from scratch: Preprocessing -> Feature Extraction / Model -> Evaluation Metrics.
- NEVER truncate code. Always write the full implementation with a working demonstration block that processes real sample sentences and prints evaluation outputs.
- Apply the HuggingFace minimalist NLP architecture blueprint learned by NEMI: zero external dependencies, robust whitespace tokenization, and cosine similarity calculations.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
