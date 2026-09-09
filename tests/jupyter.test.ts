import { describe, it, expect } from 'vitest'
import {
  extractCodeBlocks,
  buildNotebookFromResponse,
  executeCodeSnippet,
  formatCodeForJupyter,
  formatNotebookAsJupyterScript,
  copyNotebookAsJson,
  copyTextToClipboard,
} from '../src/renderer/src/utils/jupyter'

describe('NEMI Jupyter Notebook Utility Suite', () => {
  it('extracts fenced python and shell code blocks accurately', () => {
    const markdown = `
Here is a data analysis script:

\`\`\`python
import pandas as pd
df = pd.DataFrame({"a": [1, 2, 3]})
print(df)
\`\`\`

And here is the bash runner:

\`\`\`bash
python script.py
\`\`\`
`
    const blocks = extractCodeBlocks(markdown)
    expect(blocks.length).toBe(2)
    expect(blocks[0].language).toBe('python')
    expect(blocks[0].code).toContain('import pandas as pd')
    expect(blocks[1].language).toBe('bash')
    expect(blocks[1].code).toBe('python script.py')
  })

  it('builds a compliant Jupyter Notebook v4 object with markdown and code cells', () => {
    const replyText = `
### Task Overview
We will compute the Fibonacci sequence.

\`\`\`python
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)

print(fib(10))
\`\`\`

Execution completes in O(2^n).
`
    const notebook = buildNotebookFromResponse({
      taskName: 'fibonacci_calculation',
      prompt: 'Write a python fibonacci script',
      responseText: replyText,
    })

    expect(notebook.nbformat).toBe(4)
    expect(notebook.nbformat_minor).toBe(5)
    expect(notebook.metadata.kernelspec.name).toBe('python3')
    expect(notebook.metadata.kernelspec.language).toBe('python')
    expect(notebook.cells.length).toBeGreaterThanOrEqual(3)

    // Cell 0 is header markdown
    expect(notebook.cells[0].cell_type).toBe('markdown')
    expect(notebook.cells[0].source.join('')).toContain('fibonacci calculation')

    // Find the code cell
    const codeCells = notebook.cells.filter((c) => c.cell_type === 'code')
    expect(codeCells.length).toBe(1)
    expect(codeCells[0].source.join('')).toContain('def fib(n):')
  })

  it('executes python print expressions in the sandbox runner', async () => {
    const code = `
x = 10 + 20
print("Computed result: 30")
`
    const result = await executeCodeSnippet(code)
    expect(result.success).toBe(true)
    expect(result.output).toContain('Computed result: 30')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('executes NLP tokenization, strings, and Counter in the sandbox runner', async () => {
    const nlpCode = `
import re
from collections import Counter

text = "NLP natural language processing is great and natural"
tokens = text.lower().split()
counts = Counter(tokens)

print("Total tokens:", len(tokens))
print("Unique words:", len(counts))
`
    const result = await executeCodeSnippet(nlpCode)
    expect(result.success).toBe(true)
    expect(result.output).toContain('Total tokens: 8')
    expect(result.output).toContain('Unique words: 7')
  })

  it('catches syntax errors like unmatched parentheses', async () => {
    const brokenCode = `print("Missing close parenthesis"`
    const result = await executeCodeSnippet(brokenCode)
    expect(result.success).toBe(false)
    expect(result.error).toContain('SyntaxError')
  })

  it('catches syntax errors like unmatched brackets', async () => {
    const brokenCode = `data = [1, 2, 3`
    const result = await executeCodeSnippet(brokenCode)
    expect(result.success).toBe(false)
    expect(result.error).toContain('SyntaxError')
  })

  it('formats code cleanly for Jupyter and Google Colab by stripping markdown ticks', () => {
    const rawWithTicks = `\`\`\`python
def calculate_metrics():
    return {"acc": 0.98}
\`\`\``
    const clean = formatCodeForJupyter(rawWithTicks)
    expect(clean).not.toContain('```')
    expect(clean).toContain('def calculate_metrics():')

    // Test with cell marker (# %%)
    const withCell = formatCodeForJupyter(rawWithTicks, { asCell: true })
    expect(withCell.startsWith('# %%\n')).toBe(true)
    expect(withCell).toContain('def calculate_metrics():')
  })

  it('formats a full JupyterNotebook into an interactive script with # %% markers', () => {
    const notebook = buildNotebookFromResponse({
      taskName: 'linear_regression',
      prompt: 'Fit line',
      responseText: `# Linear Model\n\`\`\`python\nimport numpy as np\nx = np.array([1, 2, 3])\n\`\`\``,
    })

    const script = formatNotebookAsJupyterScript(notebook)
    expect(script).toContain('# %% [markdown]')
    expect(script).toContain('# %%')
    expect(script).toContain('import numpy as np')
  })

  it('copies text and notebook json with fallback support', async () => {
    const notebook = buildNotebookFromResponse({
      taskName: 'test_notebook',
      prompt: 'test',
      responseText: '```python\nprint("hello")\n```',
    })

    // In node/vitest environment, copyTextToClipboard safely returns boolean without crashing
    const copied = await copyNotebookAsJson(notebook)
    expect(typeof copied).toBe('boolean')

    const copiedText = await copyTextToClipboard('sample code')
    expect(typeof copiedText).toBe('boolean')
  })
})
