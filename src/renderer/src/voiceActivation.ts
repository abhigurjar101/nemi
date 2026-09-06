export interface VoiceReadiness {
  ollama: boolean
  voice: boolean
  rag: boolean
}

export function isActivationPhrase(transcript: string): boolean {
  const normalized = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return false

  // Reject casual questions or sentences that merely contain 'abhi' or 'nemi'
  // Must match explicit wake intent: "hey/hi/hello nemi" optionally followed by "i am abhi" / "this is abhi"
  const wakeRegex = /\b(hey|hi|hello)\s+(nemi|nimmi|nemmi|nimy|nemy)(\s+(i\s+am|it\s+is|this\s+is)?\s*abhi)?\b/i
  const exactWake = /\b(hey|hi|hello)\s+.*?\b(nemi|nimmi)\b.*\babhi\b/i

  return wakeRegex.test(normalized) || exactWake.test(normalized)
}

export function readinessBriefing(status: VoiceReadiness): string {
  const parts = [
    status.ollama ? 'Ollama is ready' : 'Ollama is still starting',
    status.voice ? 'voice is ready' : 'I will use your system voice',
    status.rag ? 'your RAG knowledge base is ready' : 'RAG is still starting',
  ]
  return `Hello Abhi. ${parts.join(', ')}. What would you like to do?`
}

export interface VoiceIntent {
  hasWakeWord: boolean
  isWakeOnly: boolean
  query: string
}

export function extractVoiceIntent(rawTranscript: string): VoiceIntent {
  const text = (rawTranscript || '').trim()
  if (!text) {
    return { hasWakeWord: false, isWakeOnly: false, query: '' }
  }

  const wakePrefixRegex = /^(?:(?:hey|hi|hello)\s+)?(?:nemi|nimmi|nemmi|nimy|nemy)(?:\s*,?\s*(?:(?:i\s+am|it\s+is|this\s+is)\s+)?abhi)?[\s,!?:.-]*/i
  const greetingOnlyRegex = /^(?:hey|hi|hello)\s+(?:nemi|nimmi|nemmi|nimy|nemy)(?:\s*,?\s*(?:(?:i\s+am|it\s+is|this\s+is)\s+)?abhi)?[\s,!?:.-]*$/i

  if (greetingOnlyRegex.test(text)) {
    return { hasWakeWord: true, isWakeOnly: true, query: '' }
  }

  const match = text.match(wakePrefixRegex)
  if (match && match[0] && match[0].trim().length > 0) {
    const stripped = text.slice(match[0].length).trim()
    if (!stripped) {
      return { hasWakeWord: true, isWakeOnly: true, query: '' }
    }
    return { hasWakeWord: true, isWakeOnly: false, query: stripped }
  }

  if (isActivationPhrase(text)) {
    const stripped = text.replace(wakePrefixRegex, '').trim()
    if (!stripped) {
      return { hasWakeWord: true, isWakeOnly: true, query: '' }
    }
    return { hasWakeWord: true, isWakeOnly: false, query: stripped }
  }

  return { hasWakeWord: false, isWakeOnly: false, query: text }
}
