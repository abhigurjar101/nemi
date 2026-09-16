/**
 * NEMI Per-Agent Mistake Journal & Bounded Self-Improvement — Test Suite
 *
 * Verifies Part 2 requirements:
 * 1. After each cycle outcome: logs prediction, confidence, cited evidence, and actual outcome.
 * 2. If wrong: validates specific, falsifiable error hypothesis:
 *    - Rejects vague excuses ("market was unpredictable", "I was just unlucky")
 *    - Accepts specific, testable diagnoses
 * 3. If right: checks whether it was right for the stated reason or by coincidence
 *    (right-for-wrong-reason detection).
 * 4. Weekly proposals:
 *    - Enforces minimum sample size (N_MIN = 50 entries) before proposals generate
 *    - Proposals are plain, specific, and falsifiable
 *    - Human approval queue: proposals do NOT silently take effect
 *    - Permanent logging even if rejected (longitudinal audit)
 * 5. Invariants: no automatic model retraining, prompt rewriting, or risk profile shifts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage for test environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

import {
  validateHypothesis,
  detectRightForWrongReason,
  logJournalEntry,
  getAgentJournal,
  getJournalStats,
  generateWeeklyProposals,
  approveSelfProposal,
  rejectSelfProposal,
  getPendingSelfProposals,
  clearJournal,
} from '../src/renderer/src/services/mistakeJournal'

describe('Part 2: Per-Agent Mistake Journal & Bounded Self-Improvement', () => {
  beforeEach(() => {
    localStorageMock.clear()
    clearJournal()
  })

  // ── 1. Hypothesis Validation ──────────────────────────────────────────────

  it('rejects vague hypotheses such as "market was unpredictable" or "just unlucky"', () => {
    expect(validateHypothesis('The market was unpredictable and moved against me')).toBe('VAGUE_REJECTED')
    expect(validateHypothesis('I was just unlucky this time with the order flow')).toBe('VAGUE_REJECTED')
    expect(validateHypothesis('Bad luck on timing; could not have known this event')).toBe('VAGUE_REJECTED')
    expect(validateHypothesis('Too short')).toBe('VAGUE_REJECTED')
  })

  it('accepts specific, testable, and falsifiable error hypotheses', () => {
    const validHypothesis =
      'I weighted the sentiment spike heavily but did not verify volume was corroborated across at least 3 independent sources.'
    expect(validateHypothesis(validHypothesis)).toBe('SPECIFIC_FALSIFIABLE')

    const validIndicatorHypothesis =
      'RSI oversold signal below 30 triggered BUY without checking EMA 50 trend alignment; price continued lower in downtrend.'
    expect(validateHypothesis(validIndicatorHypothesis)).toBe('SPECIFIC_FALSIFIABLE')
  })

  // ── 2. Right-for-Wrong-Reason Detection ───────────────────────────────────

  it('detects when an agent was right for the wrong reason (right by coincidence)', () => {
    // Agent BUYs citing RSI oversold, but outcome was driven by extreme 5% macro move
    const rwrResult = detectRightForWrongReason({
      botId: 'technical-analyst',
      predictedAction: 'BUY',
      citedEvidence: 'RSI at 28 oversold reversal bounce',
      actualOutcome: 'WIN',
      postTradeChange24h: 5.2,
    })

    expect(rwrResult.rightForWrongReason).toBe(true)
    expect(rwrResult.explanation).toBeDefined()
    expect(rwrResult.explanation).toContain('unrelated to the stated oversold thesis')
  })

  it('marks right-for-wrong-reason as false when outcome matches normal thesis without anomaly', () => {
    const normalResult = detectRightForWrongReason({
      botId: 'technical-analyst',
      predictedAction: 'BUY',
      citedEvidence: 'EMA 20 crossover confirmation with moderate volume',
      actualOutcome: 'WIN',
      postTradeChange24h: 1.2,
    })

    expect(normalResult.rightForWrongReason).toBe(false)
  })

  // ── 3. Journal Entry Logging & Stats ──────────────────────────────────────

  it('logs journal entries with verified hypotheses for losses and flags for wins', () => {
    const entryLoss = logJournalEntry({
      cycleId: 'cycle_1',
      botId: 'technical-analyst',
      predictedAction: 'BUY',
      predictedConfidence: 84,
      citedEvidence: 'RSI at 29 oversold condition',
      actualOutcome: 'LOSS',
      wasCorrectDirection: false,
      errorHypothesis: 'RSI signal fired in low-volume regime without checking 24h volume threshold vs 7-day average.',
    })

    expect(entryLoss.hypothesisQuality).toBe('SPECIFIC_FALSIFIABLE')
    expect(entryLoss.wasCorrectDirection).toBe(false)

    const entryWin = logJournalEntry({
      cycleId: 'cycle_2',
      botId: 'technical-analyst',
      predictedAction: 'BUY',
      predictedConfidence: 82,
      citedEvidence: 'RSI at 28 oversold reversal bounce',
      actualOutcome: 'WIN',
      wasCorrectDirection: true,
      postTradeChange24h: 4.8,
    })

    expect(entryWin.rightForWrongReason).toBe(true)

    const journal = getAgentJournal('technical-analyst')
    expect(journal.length).toBe(2)

    const stats = getJournalStats('technical-analyst')
    expect(stats.wins).toBe(1)
    expect(stats.losses).toBe(1)
    expect(stats.rightForWrongReason).toBe(1)
    expect(stats.specificHypotheses).toBe(1)
  })

  // ── 4. Weekly Proposals & N_MIN Hard Rule ──────────────────────────────────

  it('requires N_MIN = 50 entries before generating self-improvement proposals', () => {
    // Only 10 entries — should NOT generate proposals
    for (let i = 0; i < 10; i++) {
      logJournalEntry({
        cycleId: `c_${i}`,
        botId: 'technical-analyst',
        predictedAction: 'BUY',
        predictedConfidence: 80,
        citedEvidence: 'RSI oversold signal',
        actualOutcome: 'LOSS',
        wasCorrectDirection: false,
        errorHypothesis: 'RSI signal without volume confirmation in low-volume session.',
      })
    }

    const proposals = generateWeeklyProposals('technical-analyst')
    expect(proposals.length).toBe(0)
  })

  it('generates specific, falsifiable proposals once N >= 50 entries accumulate', () => {
    // Populate 55 entries with recurring RSI-without-volume pattern
    for (let i = 0; i < 55; i++) {
      logJournalEntry({
        cycleId: `c_${i}`,
        botId: 'technical-analyst',
        predictedAction: 'BUY',
        predictedConfidence: 82,
        citedEvidence: 'RSI at 29 oversold signal',
        actualOutcome: i < 30 ? 'WIN' : 'LOSS',
        wasCorrectDirection: i < 30,
        errorHypothesis: i >= 30
          ? 'RSI signal fired in low-volume session without checking 24h volume threshold vs 7-day average.'
          : undefined,
        postTradeChange24h: 1.0,
      })
    }

    const proposals = generateWeeklyProposals('technical-analyst')
    expect(proposals.length).toBeGreaterThan(0)

    const newCheckProposal = proposals.find((p) => p.proposalType === 'NEW_CHECK')
    expect(newCheckProposal).toBeDefined()
    expect(newCheckProposal?.isFalsifiable).toBe(true)
    expect(newCheckProposal?.proposalText).toContain('1.5×')
    expect(newCheckProposal?.status).toBe('PENDING')
  })

  // ── 5. Human Approval Gate & Permanent Logging ────────────────────────────

  it('surfaces proposals to human approval queue; nothing applies silently', () => {
    // Seed 55 entries
    for (let i = 0; i < 55; i++) {
      logJournalEntry({
        cycleId: `c_${i}`,
        botId: 'technical-analyst',
        predictedAction: 'BUY',
        predictedConfidence: 82,
        citedEvidence: 'RSI oversold signal',
        actualOutcome: i < 30 ? 'WIN' : 'LOSS',
        wasCorrectDirection: i < 30,
        errorHypothesis: i >= 30
          ? 'RSI signal fired in low-volume session without checking 24h volume threshold vs 7-day average.'
          : undefined,
      })
    }

    const proposals = generateWeeklyProposals('technical-analyst')
    const pending = getPendingSelfProposals()
    expect(pending.length).toBe(proposals.length)

    const targetProposal = pending[0]
    expect(targetProposal.status).toBe('PENDING')

    // Approve proposal
    const approved = approveSelfProposal(targetProposal.id)
    expect(approved).toBe(true)

    // Verify it is no longer pending
    const pendingAfter = getPendingSelfProposals()
    expect(pendingAfter.some((p) => p.id === targetProposal.id)).toBe(false)
  })

  it('permanently preserves rejected proposals for longitudinal audit', () => {
    for (let i = 0; i < 55; i++) {
      logJournalEntry({
        cycleId: `c_${i}`,
        botId: 'technical-analyst',
        predictedAction: 'BUY',
        predictedConfidence: 82,
        citedEvidence: 'RSI oversold signal',
        actualOutcome: i < 30 ? 'WIN' : 'LOSS',
        wasCorrectDirection: i < 30,
        errorHypothesis: i >= 30
          ? 'RSI signal fired in low-volume session without checking 24h volume threshold vs 7-day average.'
          : undefined,
      })
    }

    const proposals = generateWeeklyProposals('technical-analyst')
    const targetProposal = proposals[0]

    const rejected = rejectSelfProposal(targetProposal.id)
    expect(rejected).toBe(true)

    // Verify it is logged as REJECTED in storage
    const allProposals = JSON.parse(localStorage.getItem('nemi_agent_self_proposals') ?? '[]')
    const stored = allProposals.find((p: any) => p.id === targetProposal.id)
    expect(stored).toBeDefined()
    expect(stored.status).toBe('REJECTED')
    expect(stored.decidedBy).toBe('HUMAN')
  })
})
