import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  Volume2,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Download,
  ExternalLink,
  Play,
  AlertCircle,
  Terminal,
  BookOpen,
} from 'lucide-react'
import type { Message } from './ChatPanel'
import {
  buildNotebookFromResponse,
  downloadNotebookFile,
  openInGoogleColab,
  executeCodeSnippet,
  extractCodeBlocks,
} from '../utils/jupyter'

// ── Markdown Table parser & renderer ──
export interface ParsedTable {
  headers: string[]
  rows: string[][]
  alignments: Array<'left' | 'center' | 'right' | 'default'>
}

export function parseMarkdownTable(text: string): ParsedTable | null {
  if (!text || typeof text !== 'string' || !text.trim()) return null

  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const placeholder = '___ESCAPED_PIPE___'

  let headerIndex = -1
  let sepCells: string[] = []

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && lines[i + 1].includes('|')) {
      const cleanSep = lines[i + 1].replace(/\\\|/g, placeholder)
      const rawCells = cleanSep
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (rawCells.length > 0 && rawCells.every((s) => /^:?-+:?$/.test(s))) {
        headerIndex = i
        sepCells = rawCells
        break
      }
    }
  }

  if (headerIndex === -1) return null

  const splitRow = (line: string): string[] => {
    const trimmed = line.trim()
    const masked = trimmed.replace(/\\\|/g, placeholder)
    const rawTokens = masked.split('|')
    return rawTokens
      .map((c) => c.replace(new RegExp(placeholder, 'g'), '|').trim())
      .filter((_, idx, arr) => (idx > 0 && idx < arr.length - 1) || (!trimmed.startsWith('|') && idx === 0) || (!trimmed.endsWith('|') && idx === arr.length - 1))
  }

  const headers = splitRow(lines[headerIndex])
  if (headers.length === 0) return null

  const alignments: ParsedTable['alignments'] = headers.map((_, idx) => {
    const col = sepCells[idx] || ''
    const left = col.startsWith(':')
    const right = col.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return 'default'
  })

  const rows: string[][] = []
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('|')) break
    const cells = splitRow(line)
    if (cells.length === 0) continue
    const normalized = cells.length < headers.length
      ? [...cells, ...Array(headers.length - cells.length).fill('')]
      : cells.slice(0, headers.length)
    rows.push(normalized)
  }

  return { headers, rows, alignments }
}

export function TableBlock({ table }: { table: ParsedTable | { headers: string[]; rows: string[][]; alignments?: string[] } }) {
  const getAlignment = (align?: string) => {
    if (align === 'center' || align === 'right') return align
    return 'left'
  }

  return (
    <div className="my-2.5 overflow-x-auto nemi-scroll rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-inner">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {table.headers.map((h, i) => (
              <th
                key={i}
                style={{ textAlign: getAlignment(table.alignments?.[i]) }}
                className="px-3 py-2 font-semibold text-cyan-300 uppercase tracking-wider text-[10px]"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-mono text-[11px]">
          {table.rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/5 transition-colors">
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  style={{ textAlign: getAlignment(table.alignments?.[cIdx]) }}
                  className="px-3 py-2 text-white/80"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Simple markdown renderer ──
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') return []
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []
  let codeLang = ''
  let key = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code block start/end
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true
        codeLang = line.slice(3).trim()
        codeLines = []
      } else {
        inCode = false
        result.push(
          <CodeBlock key={key++} code={codeLines.join('\n')} language={codeLang} />
        )
        codeLines = []
        codeLang = ''
      }
      i++
      continue
    }

    if (inCode) {
      codeLines.push(line)
      i++
      continue
    }

    // Markdown Table block detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const parsed = parseMarkdownTable(tableLines.join('\n'))
      if (parsed) {
        result.push(<TableBlock key={key++} table={parsed} />)
      } else {
        tableLines.forEach((tl) => {
          result.push(<p key={key++} className="text-xs text-white/85 leading-relaxed">{renderInline(tl)}</p>)
        })
      }
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      result.push(<h3 key={key++} className="text-xs font-bold text-cyan-300 mt-2.5 mb-1">{line.slice(4)}</h3>)
      i++
      continue
    }
    if (line.startsWith('## ')) {
      result.push(<h2 key={key++} className="text-sm font-bold text-white mt-2.5 mb-1">{line.slice(3)}</h2>)
      i++
      continue
    }
    if (line.startsWith('# ')) {
      result.push(<h1 key={key++} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h1>)
      i++
      continue
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      result.push(
        <li key={key++} className="text-xs text-white/85 flex gap-1.5 leading-relaxed my-0.5 list-none">
          <span className="text-cyan-400 mt-0.5 flex-shrink-0">›</span>
          <span>{renderInline(line.slice(2))}</span>
        </li>
      )
      i++
      continue
    }

    // Empty line = spacing
    if (line.trim() === '') {
      result.push(<div key={key++} className="h-1" />)
      i++
      continue
    }

    // Regular paragraph
    result.push(
      <p key={key++} className="text-xs text-white/85 leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  // If text ended while inside a code block (streaming or unclosed fence), render the code block!
  if (inCode && codeLines.length > 0) {
    result.push(
      <CodeBlock key={key++} code={codeLines.join('\n')} language={codeLang} />
    )
  }

  return result
}

// ── Inline markdown: links, bold, italic, inline code ──
function renderInline(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return ''
  const parts: React.ReactNode[] = []
  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      // Markdown link [text](url)
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
        >
          {match[2]}
        </a>
      )
    } else if (match[4]) {
      // Bold
      parts.push(<strong key={match.index} className="font-semibold text-white">{match[4]}</strong>)
    } else if (match[5]) {
      // Inline code
      parts.push(
        <code key={match.index} className="font-mono text-[11px] bg-white/10 text-cyan-300 px-1 py-0.5 rounded">
          {match[5]}
        </code>
      )
    } else if (match[6]) {
      // Italic
      parts.push(<em key={match.index} className="italic text-white/80">{match[6]}</em>)
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

// ── Code block with line numbers, copy button, Colab launch, .ipynb/raw download, and execution console ──
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [showLines, setShowLines] = useState(true)
  const [execResult, setExecResult] = useState<{
    success: boolean
    output: string
    durationMs: number
    error?: string
  } | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRun = async () => {
    setIsRunning(true)
    try {
      const res = await executeCodeSnippet(code)
      setExecResult(res)
    } finally {
      setIsRunning(false)
    }
  }

  const handleDownloadIpynb = () => {
    const notebook = buildNotebookFromResponse({
      taskName: 'Code Cell',
      responseText: `\`\`\`${language || 'python'}\n${code}\n\`\`\``,
      language: language || 'python',
    })
    downloadNotebookFile(notebook, `nemi_cell_${Date.now()}.ipynb`)
  }

  const handleDownloadRaw = () => {
    const extMap: Record<string, string> = {
      python: 'py',
      py: 'py',
      typescript: 'ts',
      ts: 'ts',
      javascript: 'js',
      js: 'js',
      rust: 'rs',
      rs: 'rs',
      bash: 'sh',
      sh: 'sh',
      sql: 'sql',
      json: 'json',
    }
    const ext = extMap[(language || '').toLowerCase()] || 'py'
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nemi_code_${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleColab = async () => {
    const notebook = buildNotebookFromResponse({
      taskName: 'Code Cell',
      responseText: `\`\`\`${language || 'python'}\n${code}\n\`\`\``,
      language: language || 'python',
    })
    await openInGoogleColab(notebook)
  }

  const isExecutable = !language || ['python', 'py', 'sh', 'bash', 'sql'].includes(language.toLowerCase())
  const lines = code.split('\n')

  return (
    <div className="relative rounded-xl overflow-hidden my-2.5 border border-white/10 bg-slate-950/80 shadow-lg group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold text-cyan-400 uppercase tracking-wider">
            {language || 'code'}
          </span>
          {isExecutable && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono flex items-center gap-1">
              <Terminal className="w-2.5 h-2.5" />
              Sandbox Ready
            </span>
          )}
          <span className="text-[9px] text-white/40 font-mono">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle line numbers */}
          <button
            onClick={() => setShowLines((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              showLines ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40 hover:text-white'
            }`}
            title={showLines ? 'Hide line numbers' : 'Show line numbers'}
          >
            #
          </button>

          {/* Run button */}
          {isExecutable && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="Execute code in kernel sandbox"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          )}

          {/* Colab button */}
          {isExecutable && (
            <button
              onClick={handleColab}
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-medium transition-colors cursor-pointer"
              title="Open in Google Colab"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Colab</span>
            </button>
          )}

          {/* Download Raw file button */}
          <button
            onClick={handleDownloadRaw}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px] font-medium transition-colors cursor-pointer"
            title={`Download raw file (.${(language || 'py').toLowerCase()})`}
          >
            <Download className="w-2.5 h-2.5" />
            <span>Raw</span>
          </button>

          {/* Download .ipynb button */}
          {isExecutable && (
            <button
              onClick={handleDownloadIpynb}
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-medium transition-colors cursor-pointer"
              title="Download as Jupyter Notebook (.ipynb)"
            >
              <Download className="w-2.5 h-2.5" />
              <span>.ipynb</span>
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <><Check className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400 text-[9px]">Copied</span></>
            ) : (
              <><Copy className="w-2.5 h-2.5" /><span className="text-[9px]">Copy</span></>
            )}
          </button>
        </div>
      </div>

      {/* Code content with optional line numbering */}
      <pre className="px-3.5 py-2.5 overflow-x-auto nemi-scroll flex gap-3 text-[11px] font-mono leading-relaxed">
        {showLines && (
          <div className="select-none text-white/25 text-right font-mono pr-2 border-r border-white/5 flex flex-col">
            {lines.map((_, idx) => (
              <span key={idx}>{idx + 1}</span>
            ))}
          </div>
        )}
        <code className="text-white/90 whitespace-pre flex-1">
          {code}
        </code>
      </pre>

      {/* Interactive Execution Output Console */}
      {execResult && (
        <div className="border-t border-white/10 bg-black/80 px-3.5 py-2 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1 pb-1 border-b border-white/5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span className={execResult.success ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {execResult.success ? 'Execution Result' : 'Kernel Error'}
              </span>
            </span>
            <span>{execResult.durationMs}ms</span>
          </div>
          <pre className={`whitespace-pre-wrap leading-relaxed ${execResult.success ? 'text-emerald-300' : 'text-rose-300'}`}>
            {execResult.error || execResult.output}
          </pre>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ──────────────────────────────────────────────────────────
export interface MessageBubbleProps {
  message: Message
  onSpeak?: (text: string) => void
  onRemember?: (text: string) => void
  isSpeakingThis?: boolean
}

export default function MessageBubble({
  message,
  onSpeak,
  onRemember,
  isSpeakingThis,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [remembered, setRemembered] = useState(false)

  const timeStr = (() => {
    try {
      const d = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  })()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemember = () => {
    if (onRemember && message.content) {
      onRemember(message.content)
      setRemembered(true)
      setTimeout(() => setRemembered(false), 2500)
    }
  }

  const hasCode = !isUser && /```(?:python|py|sh|bash|sql)?[\s\S]*?```/.test(message.content)

  const handleDownloadFullNotebook = () => {
    const nb = buildNotebookFromResponse({
      taskName: 'NEMI Task Analysis',
      responseText: message.content,
    })
    downloadNotebookFile(nb, `nemi_task_${Date.now()}.ipynb`)
  }

  const handleOpenColabFull = async () => {
    const nb = buildNotebookFromResponse({
      taskName: 'NEMI Task Analysis',
      responseText: message.content,
    })
    await openInGoogleColab(nb)
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6, x: 8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        className="flex justify-end group"
      >
        <div className="max-w-[85%] space-y-1">
          <div className="
            user-bubble rounded-2xl rounded-br-xs px-3.5 py-2
            bg-gradient-to-br from-cyan-600/35 to-purple-600/25
            border border-cyan-400/20 shadow-[0_2px_12px_rgba(0,212,255,0.08)]
          ">
            <p className="text-xs text-white/95 leading-relaxed break-words">
              {renderInline(message.content)}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pr-1">
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-white/30 hover:text-white/70"
              title="Copy"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
            <span className="text-[9px] text-white/25 font-mono">{timeStr}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, x: -8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      className="flex items-start gap-2 group"
    >
      {/* NEMI avatar */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex-shrink-0 flex items-center justify-center mt-0.5 shadow-[0_0_8px_rgba(0,212,255,0.3)]">
        <span className="text-[10px] font-bold text-white">N</span>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="
          glass-bubble rounded-2xl rounded-tl-xs px-3.5 py-2.5
          bg-slate-900/60 backdrop-blur-md border border-white/8
          shadow-[0_4px_16px_rgba(0,0,0,0.3)] space-y-1
        ">
          {renderMarkdown(message.content)}
          {/* Streaming cursor */}
          {message.streaming && (
            <span className="inline-block w-1 h-3.5 bg-cyan-400 animate-pulse align-text-bottom ml-0.5 rounded-xs" />
          )}

          {/* Dedicated Full Notebook Action Banner if code exists */}
          {hasCode && !message.streaming && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-purple-300 font-medium text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dedicated Notebook Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownloadFullNotebook}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Download .ipynb"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .ipynb</span>
                </button>
                <button
                  onClick={handleOpenColabFull}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Launch Google Colab"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Colab</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action bar below bubble */}
        <div className="flex items-center justify-between pl-1 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/25 font-mono">{timeStr}</span>
            {remembered && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold"
              >
                <CheckCircle2 className="w-2.5 h-2.5" /> Saved to Memory
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className={`p-1 rounded-md transition-colors ${
                  isSpeakingThis ? 'text-cyan-400 bg-cyan-500/20' : 'text-white/35 hover:text-white/80 hover:bg-white/5'
                }`}
                title={isSpeakingThis ? 'Speaking...' : 'Read aloud'}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            )}
            {onRemember && (
              <button
                onClick={handleRemember}
                className="p-1 rounded-md text-white/35 hover:text-amber-300 hover:bg-white/5 transition-colors"
                title="Save to NEMI Memory Vault"
              >
                <Bookmark className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-white/35 hover:text-white/80 hover:bg-white/5 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
