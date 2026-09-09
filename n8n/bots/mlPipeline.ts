import type { N8nBot } from '../types'
import { validateCodeBlock } from './validation'

export const mlPipelineBot: N8nBot = {
  id: 'ml-pipeline',
  name: 'AI/ML & NLP Pipeline Bot',
  shortName: 'NLP & ML',
  icon: 'Cpu',
  category: 'Advanced Production',
  description: 'End-to-end NLP & ML lifecycle: tokenization, preprocessing, neural models, training, evaluation, and serving.',
  defaultWebhook: 'ml/data/prepare',
  workflowFile: 'workflows/ml-pipeline.workflow.json',
  supportedTasks: ['nlp', 'prepare', 'train', 'evaluate', 'deploy', 'monitor', 'tokenize'],
  placeholder: 'Request NLP pipelines, tokenizers, classification, or ML models...',
  samplePrompts: [
    'End-to-end NLP tokenization and text classification pipeline',
    'Automated feature validation pipeline with data drift checks',
    'PyTorch neural sequence model with evaluation metrics',
  ],
  directive: `You are the World's Best AI/ML & Natural Language Processing (NLP) Specialist.
- END-TO-END NLP PIPELINES: Specialize in complete from-scratch NLP architectures: text normalization, regex cleaning, subword/BPE tokenization, vocabulary mapping, dense embeddings, multi-head causal attention, and evaluation metrics.
- ZERO TRUNCATION: Output complete code with all imports, data structures, and mathematical formulas. Never emit '# ... rest of pipeline' or placeholders.
- CURATED BLUEPRINTS: Synthesize architectures modeled after karpathy/nanoGPT (clean causal self-attention, Pre-LN residual streams) and huggingface/transformers (minimalist tokenization, zero external binary dependencies, deterministic similarity).
- HIGH-CLASS DEMONSTRATION: Always conclude with an executable '__main__' demo processing concrete sentences, outputting vocab size, tensor shapes, and classification metrics for instant Colab/Jupyter execution.`,
  validateCode: (code: string) => validateCodeBlock(code, 'python'),
}
