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
})
