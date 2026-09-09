import { describe, it, expect } from 'vitest'
import {
  stripTrivialComments,
  calculateCodeDensity,
} from '../src/renderer/src/utils/swarmCollaboration'
import { GITHUB_ARCHITECTURE_BLUEPRINTS } from '../n8n/blueprints'
import { compileBotSystemPrompt } from '../n8n/botEngine'

describe('NEMI Code Parsimony & Zero Trivial Comments Engine', () => {
  it('strips redundant line-by-line comment spam while preserving docstrings and logic', () => {
    const clutteredCode = `
# Import required modules
import math
import sys

class VectorMath:
    """Production vector calculator."""
    def __init__(self):
        # Initialize internal cache
        self.cache = {}

    def norm(self, vec: list[float]) -> float:
        # Loop over items and calculate Euclidean norm
        res = math.sqrt(sum(x * x for x in vec))
        # Return the final magnitude
        return res
`

    const cleaned = stripTrivialComments(clutteredCode)

    expect(cleaned).not.toContain('# Import required modules')
    expect(cleaned).not.toContain('# Initialize internal cache')
    expect(cleaned).not.toContain('# Loop over items')
    expect(cleaned).not.toContain('# Return the final magnitude')

    // Preserves essential code and docstrings
    expect(cleaned).toContain('"""Production vector calculator."""')
    expect(cleaned).toContain('import math')
    expect(cleaned).toContain('def norm(self, vec: list[float]) -> float:')
  })

  it('calculates code density and signal-to-noise ratio accurately', () => {
    const sample = `
# Comment 1
# Comment 2
def hello():
    return "world"
`
    const stats = calculateCodeDensity(sample)
    expect(stats.commentLines).toBe(2)
    expect(stats.codeLines).toBe(2)
    expect(stats.totalLines).toBe(4)
    expect(stats.densityPercent).toBe(50)
  })

  it('verifies that all curated GitHub blueprints contain zero trivial inline comment clutter', () => {
    for (const bp of GITHUB_ARCHITECTURE_BLUEPRINTS) {
      const lines = bp.codeSnippet.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('#') && !trimmed.startsWith('#!')) {
          throw new Error(`Found unwanted inline comment in ${bp.repo}: ${trimmed}`)
        }
      }
    }
  })

  it('verifies that compiled bot system prompts enforce Zero Trivial Comments and Code Parsimony', () => {
    const { systemPrompt } = compileBotSystemPrompt('coding-assistant')
    expect(systemPrompt).toContain('MAXIMUM CODE PARSIMONY')
    expect(systemPrompt).toContain('ZERO TRIVIAL COMMENTS')
    expect(systemPrompt).toContain('self-documenting code')
  })

  it('verifies that all 11 bot directives enforce parsimony and zero comment clutter', async () => {
    const { ALL_N8N_BOTS } = await import('../n8n/botEngine')
    for (const bot of ALL_N8N_BOTS) {
      const { systemPrompt } = compileBotSystemPrompt(bot.id)
      expect(systemPrompt).toContain('MAXIMUM CODE PARSIMONY')
      expect(systemPrompt).toContain('ZERO TRIVIAL COMMENTS')
      // Bot individual directives also demand purity and zero placeholders
      expect(bot.directive.length).toBeGreaterThan(50)
    }
  })

  it('strips JS/TS double-slash trivial comment clutter properly', () => {
    const tsCode = `
// import modules
import { useState } from 'react'

// initialize state
const [count, setCount] = useState(0)

// return component
return <div>{count}</div>
`
    const cleaned = stripTrivialComments(tsCode)
    expect(cleaned).not.toContain('// import modules')
    expect(cleaned).not.toContain('// initialize state')
    expect(cleaned).not.toContain('// return component')
    expect(cleaned).toContain("import { useState } from 'react'")
    expect(cleaned).toContain('return <div>{count}</div>')
  })

  it('detects diverse weak placeholders with enhanced validateCodeBlock', async () => {
    const { validateCodeBlock } = await import('../n8n/bots/validation')
    const badCases = [
      'def fn():\n    # TODO: implement rest\n',
      'function test() {\n    // TODO: implement later\n}\n',
      'def calc():\n    # FIXME: broken calculation\n',
      'def run():\n    # ... rest of pipeline\n',
      'const f = () => {\n    // ... rest of code\n}\n',
    ]

    for (const code of badCases) {
      const res = validateCodeBlock(code)
      expect(res.valid).toBe(false)
      expect(res.syntaxErrors?.some((e) => e.includes('placeholder'))).toBe(true)
    }
  })
})
