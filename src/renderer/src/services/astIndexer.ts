/**
 * NEMI Semantic Abstract Syntax Tree (AST) & Codebase Indexer
 * Parses source code (JS, TS, Python, Go, Rust), extracts structural symbols,
 * computes cyclomatic complexity, maps call dependencies, and detects dead code.
 */

export interface CodeSymbol {
  name: string
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'method'
  line: number
  character: number
  signature?: string
  complexity?: number
}

export interface ImportDependency {
  module: string
  specifiers: string[]
  isDefault: boolean
  isDynamic: boolean
  line: number
}

export interface ASTAnalysisReport {
  language: string
  loc: number
  symbols: CodeSymbol[]
  imports: ImportDependency[]
  averageComplexity: number
  maxComplexity: number
  maintainabilityIndex: number
  callGraph: Record<string, string[]>
  deadCodeCandidates: string[]
}

export function detectLanguage(filename: string, code: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx'].includes(ext)) return 'typescript'
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'javascript'
  if (['py'].includes(ext)) return 'python'
  if (['go'].includes(ext)) return 'go'
  if (['rs'].includes(ext)) return 'rust'

  // Fallback heuristics
  if (/def\s+\w+\(|import\s+\w+|from\s+\w+\s+import/.test(code)) return 'python'
  if (/interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean)/.test(code)) return 'typescript'
  return 'javascript'
}

export function computeCyclomaticComplexity(body: string): number {
  let complexity = 1
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?/g,
    /&&/g,
    /\|\|/g,
    /\?\?/g,
  ]

  for (const pattern of patterns) {
    const matches = body.match(pattern)
    if (matches) {
      complexity += matches.length
    }
  }
  return complexity
}

export function analyzeSourceAST(filename: string, code: string): ASTAnalysisReport {
  const lang = detectLanguage(filename, code)
  const lines = code.split('\n')
  const loc = lines.length

  const symbols: CodeSymbol[] = []
  const imports: ImportDependency[] = []
  const callGraph: Record<string, string[]> = {}
  const declaredNames = new Set<string>()

  lines.forEach((line, idx) => {
    const lineNum = idx + 1
    const trimmed = line.trim()

    // ── TypeScript / JavaScript Symbol Matching ──────────
    const funcMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/)
    if (funcMatch) {
      const name = funcMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'function',
        line: lineNum,
        character: line.indexOf(name),
        signature: `function ${name}(${funcMatch[2]})`,
        complexity: computeCyclomaticComplexity(line),
      })
    }

    const constFuncMatch = trimmed.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>/)
    if (constFuncMatch) {
      const name = constFuncMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'function',
        line: lineNum,
        character: line.indexOf(name),
        signature: `const ${name} = (${constFuncMatch[2]}) => ...`,
        complexity: computeCyclomaticComplexity(line),
      })
    }

    const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/)
    if (classMatch) {
      const name = classMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'class',
        line: lineNum,
        character: line.indexOf(name),
        signature: `class ${name}${classMatch[2] ? ' extends ' + classMatch[2] : ''}`,
        complexity: 2,
      })
    }

    const interfaceMatch = trimmed.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/)
    if (interfaceMatch) {
      const name = interfaceMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'interface',
        line: lineNum,
        character: line.indexOf(name),
        signature: `interface/type ${name}`,
        complexity: 1,
      })
    }

    // ── Python Symbol Matching ──────────
    const pyDefMatch = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\):/)
    if (pyDefMatch) {
      const name = pyDefMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'function',
        line: lineNum,
        character: line.indexOf(name),
        signature: `def ${name}(${pyDefMatch[2]})`,
        complexity: computeCyclomaticComplexity(line),
      })
    }

    const pyClassMatch = trimmed.match(/^class\s+(\w+)(?:\(([^)]*)\))?:/)
    if (pyClassMatch) {
      const name = pyClassMatch[1]
      declaredNames.add(name)
      symbols.push({
        name,
        kind: 'class',
        line: lineNum,
        character: line.indexOf(name),
        signature: `class ${name}`,
        complexity: 2,
      })
    }

    // ── Imports Matching ──────────
    if (['typescript', 'javascript'].includes(lang)) {
      const importMatch = trimmed.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        const specifiers = (importMatch[1] || importMatch[2] || importMatch[3] || '')
          .split(',')
          .map((s) => s.trim().split(/\s+as\s+/)[0])
          .filter(Boolean)
        imports.push({
          module: importMatch[4],
          specifiers,
          isDefault: Boolean(importMatch[3]),
          isDynamic: false,
          line: lineNum,
        })
      }
    } else if (lang === 'python') {
      const pyImportMatch = trimmed.match(/from\s+([\w.]+)\s+import\s+(.+)|import\s+([\w.,\s]+)/)
      if (pyImportMatch) {
        const mod = pyImportMatch[1] || pyImportMatch[3] || ''
        const specs = (pyImportMatch[2] || pyImportMatch[3] || '').split(',').map((s) => s.trim())
        imports.push({
          module: mod,
          specifiers: specs,
          isDefault: false,
          isDynamic: false,
          line: lineNum,
        })
      }
    }
  })

  // Build Call Graph & Identify Dead-Code Candidates
  const deadCodeCandidates: string[] = []
  symbols.forEach((sym) => {
    callGraph[sym.name] = []
    const occurrences = (code.match(new RegExp(`\\b${sym.name}\\b`, 'g')) || []).length
    if (occurrences <= 1 && sym.kind === 'function') {
      deadCodeCandidates.push(sym.name)
    }

    // Check what other functions this symbol calls
    symbols.forEach((targetSym) => {
      if (sym.name !== targetSym.name && code.includes(`${targetSym.name}(`)) {
        if (!callGraph[sym.name].includes(targetSym.name)) {
          callGraph[sym.name].push(targetSym.name)
        }
      }
    })
  })

  const complexities = symbols.map((s) => s.complexity || 1)
  const maxComplexity = complexities.length > 0 ? Math.max(...complexities) : 1
  const averageComplexity =
    complexities.length > 0
      ? +(complexities.reduce((a, b) => a + b, 0) / complexities.length).toFixed(1)
      : 1

  // Maintainability Index (MI = 171 - 5.2 * ln(Halstead V) - 0.23 * (Cyclomatic) - 16.2 * ln(LOC))
  const approxV = Math.max(10, loc * 8)
  const maintainabilityIndex = Math.max(
    0,
    Math.min(
      100,
      Math.round(171 - 5.2 * Math.log(approxV) - 0.23 * averageComplexity - 16.2 * Math.log(Math.max(1, loc)))
    )
  )

  return {
    language: lang,
    loc,
    symbols,
    imports,
    averageComplexity,
    maxComplexity,
    maintainabilityIndex,
    callGraph,
    deadCodeCandidates,
  }
}
