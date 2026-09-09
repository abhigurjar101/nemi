/**
 * NEMI Conversational Speech Pre-Processor
 * Converts dense technical markdown, code blocks, tables, and lists
 * into warm, natural, human-like spoken English for Kokoro TTS.
 * The chat drawer retains the original rich visual markdown.
 */

/**
 * Phonetically smooth technical abbreviations, units, currency, and acronyms
 * so Kokoro's Misaki G2P engine pronounces them naturally as a human speaker would.
 */
export function naturalizePhonetics(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return ''

  let text = rawText

  // 1. Currency formatting ($100 -> 100 dollars, $50.25 -> 50 dollars and 25 cents, $50.5 -> 50 dollars and 50 cents)
  text = text.replace(/\$([0-9,]+)\.([0-9]{2})\b/g, '$1 dollars and $2 cents')
  text = text.replace(/\$([0-9,]+)\.([0-9])\b/g, (_m, dollars, cents) => `${dollars} dollars and ${cents}0 cents`)
  text = text.replace(/\$([0-9,]+)\b/g, '$1 dollars')

  // 2. Technical symbols & relations
  text = text.replace(/\s*!==?\s*/g, ' is not equal to ')
  text = text.replace(/\s*=>\s*/g, ' leads to ')
  text = text.replace(/(^|\s+)&(\s+|$)/g, '$1and$2')

  // 3. Percentages (95% -> 95 percent)
  text = text.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '$1 percent')

  // 3. Technical units and frequencies
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*kHz\b/gi, '$1 kilohertz')
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*MHz\b/gi, '$1 megahertz')
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*GHz\b/gi, '$1 gigahertz')
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*ms\b/gi, '$1 milliseconds')
  text = text.replace(/\b(?![12][0-9]{3}\s*s\b)([0-9]+(?:\.[0-9]+)?)\s*s\b(?=[,\s.!?]|$)/g, '$1 seconds')
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*fps\b/gi, '$1 frames per second')
  text = text.replace(/\b([0-9]+(?:\.[0-9]+)?)\s*px\b/gi, '$1 pixels')

  // 4. Common conversational abbreviations
  text = text.replace(/\be\.g\.,?\s*/gi, 'for example, ')
  text = text.replace(/\bi\.e\.,?\s*/gi, 'that is, ')
  text = text.replace(/\betc\.\s*/gi, 'et cetera. ')
  text = text.replace(/\betc\b/gi, 'et cetera')
  text = text.replace(/\bvs\.\s*/gi, 'versus ')
  text = text.replace(/\bvs\s+/gi, 'versus ')
  text = text.replace(/\bw\/o\b/gi, 'without')
  text = text.replace(/\bw\/\b/gi, 'with')
  text = text.replace(/\bapprox\.\s*/gi, 'approximately ')

  // 5. Letter-spaced acronyms for natural human phonetics
  text = text.replace(/\bAI\b/g, 'A.I.')
  text = text.replace(/\bUI\b/g, 'U.I.')
  text = text.replace(/\bAPI\b/g, 'A.P.I.')
  text = text.replace(/\bAPIs\b/g, 'A.P.I.s')
  text = text.replace(/\bLLM\b/g, 'L.L.M.')
  text = text.replace(/\bLLMs\b/g, 'L.L.M.s')
  text = text.replace(/\bTTS\b/g, 'T.T.S.')
  text = text.replace(/\bSTT\b/g, 'S.T.T.')
  text = text.replace(/\bIPC\b/g, 'I.P.C.')
  text = text.replace(/\bCPU\b/g, 'C.P.U.')
  text = text.replace(/\bGPU\b/g, 'G.P.U.')
  text = text.replace(/\bOS\b/g, 'O.S.')
  text = text.replace(/\bURL\b/g, 'U.R.L.')
  text = text.replace(/\bURLs\b/g, 'U.R.L.s')
  text = text.replace(/\bID\b/g, 'I.D.')
  text = text.replace(/\bIDs\b/g, 'I.D.s')

  return text
}

export function toConversationalScript(rawText: string): string {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return ''

  let text = rawText.trim()

  // 1. Convert code blocks into a natural spoken reference
  text = text.replace(/```[\s\S]*?```/g, " I've placed the code snippet in our chat notes. ")

  // 2. Convert markdown tables into a courteous spoken summary (supports indented tables)
  const tableRegex = /^[ \t]*\|[^\n]+\|\r?\n[ \t]*\|[-:\s|]+\|\r?\n(?:[ \t]*\|[^\n]+\|\r?\n?)*/gm
  text = text.replace(tableRegex, " I've organized the detailed comparison table in your chat notes. ")

  // Expand double hyphens to em-dash for natural breath cadence
  text = text.replace(/\s+--\s+/g, ' — ')

  // 3. Convert inline code `foo` to just foo
  text = text.replace(/`([^`]+)`/g, '$1')

  // 4. Convert markdown links [Label](url) to just Label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // 5. Remove bare URLs
  text = text.replace(/https?:\/\/[^\s]+/g, 'the link in our notes')

  // 6. Convert markdown headers (# Title) into natural speech transitions
  text = text.replace(/^#{1,6}\s+(.+)$/gm, 'Regarding $1: ')

  // 7. Convert bullet lists into smooth verbal cadence (preserves numbered lists)
  text = text.replace(/^[ \t]*[\*\-\+]\s+(.+)$/gm, '$1, ')

  // 8. Strip bold, italic, and strikethrough markdown
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2')
  text = text.replace(/(\*|_)(.*?)\1/g, '$2')
  text = text.replace(/~~(.*?)~~/g, '$1')

  // 9. Strip markdown blockquotes (> Quote)
  text = text.replace(/^>\s+/gm, '')

  // 10. Strip markdown horizontal rules (---)
  text = text.replace(/^---$/gm, '')

  // Protect intentional ellipses (...) before period deduplication
  const ELLIPSIS_TOKEN = '___INTENTIONAL_ELLIPSIS___'
  text = text.replace(/\.{3,}/g, ELLIPSIS_TOKEN)

  // 11. Clean up duplicate punctuation and whitespace before sentence boundary analysis
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/,\s*,/g, ',')
  text = text.replace(/\.\s*\./g, '.')
  text = text.trim()

  // 12. Conversational pacing: if the answer is lengthy (>250 chars and >2 sentences),
  // summarize the first 2 natural sentences and add a courteous signoff so Kokoro doesn't lecture the user.
  // Executed BEFORE naturalizePhonetics so acronym periods (e.g. A.I., A.P.I.) do not break sentence boundaries.
  // Decimal numbers (\d+\.\d+) are protected so values like 2.5 do not split across sentences.
  if (text.length > 250) {
    const DECIMAL_TOKEN = '___DECIMAL_POINT___'
    const maskedText = text.replace(/(?<=\d)\.(?=\d)/g, DECIMAL_TOKEN)
    const sentences = maskedText.match(/[^.!?]+[.!?]+/g)
    if (sentences && sentences.length > 2) {
      const firstTwo = sentences
        .slice(0, 2)
        .map((s) => s.replace(new RegExp(DECIMAL_TOKEN, 'g'), '.').trim())
        .join(' ')
      text = `${firstTwo} I've placed the full breakdown in our chat notes for you to review.`
    }
  }

  // 13. Apply phonetic naturalization (units, currency, technical terms, acronyms)
  text = naturalizePhonetics(text)

  // 14. Final cleanup of duplicate punctuation and whitespace
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/,\s*,/g, ',')
  text = text.replace(/\.\s*\./g, '.')
  text = text.replace(new RegExp(ELLIPSIS_TOKEN, 'g'), '...')
  text = text.trim()

  return text
}
