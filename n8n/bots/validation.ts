import type { AstValidationResult } from '../types'

/**
 * Validates syntax, balances delimiters, and analyzes functions/classes in generated code.
 */
export function validateCodeBlock(code: string, language = 'python'): AstValidationResult {
  const detectedFunctions: string[] = []
  const detectedClasses: string[] = []
  const syntaxErrors: string[] = []

  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Python function
    const pyFnMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/)
    if (pyFnMatch) detectedFunctions.push(pyFnMatch[1])

    // JS/TS function
    const jsFnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/)
    if (jsFnMatch) detectedFunctions.push(jsFnMatch[1])

    const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/)
    if (arrowMatch) detectedFunctions.push(arrowMatch[1])

    // Class
    const classMatch = trimmed.match(/^(?:export\s+)?class\s+([a-zA-Z0-9_]+)/)
    if (classMatch) detectedClasses.push(classMatch[1])

    // Placeholders check
    if (
      trimmed.includes('# ... rest of code') ||
      trimmed.includes('// ... rest of code') ||
      trimmed.includes('# TODO: implement') ||
      trimmed.includes('// TODO: implement')
    ) {
      syntaxErrors.push(`Code contains placeholder: "${trimmed}"`)
    }
  }

  // Check balanced delimiters outside string literals
  let paren = 0
  let bracket = 0
  let brace = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inBacktick = false

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    const prev = i > 0 ? code[i - 1] : ''

    if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote
      continue
    }
    if (char === '`' && prev !== '\\' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === '(') paren++
      else if (char === ')') paren--
      else if (char === '[') bracket++
      else if (char === ']') bracket--
      else if (char === '{') brace++
      else if (char === '}') brace--

      if (paren < 0) syntaxErrors.push('Unmatched closing parenthesis ")"')
      if (bracket < 0) syntaxErrors.push('Unmatched closing bracket "]"')
      if (brace < 0) syntaxErrors.push('Unmatched closing brace "}"')
    }
  }

  if (paren > 0) syntaxErrors.push(`${paren} unclosed parenthesis "("`)
  if (bracket > 0) syntaxErrors.push(`${bracket} unclosed bracket "["`)
  if (brace > 0) syntaxErrors.push(`${brace} unclosed brace "{"`)

  return {
    valid: syntaxErrors.length === 0,
    language,
    detectedFunctions,
    detectedClasses,
    syntaxErrors: syntaxErrors.length > 0 ? syntaxErrors : undefined,
    balancedDelimiters: paren === 0 && bracket === 0 && brace === 0,
  }
}
