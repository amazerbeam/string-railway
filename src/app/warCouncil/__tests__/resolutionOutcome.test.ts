import { describe, expect, it } from 'vitest'
import {
  TRICK_OUTCOME_WHY,
  TRICK_OUTCOME_WORD,
  TrickOutcomeKind,
  trickOutcomeKindFor,
} from '../resolutionOutcome'

describe('trickOutcomeKindFor', () => {
  it('went high, no skull — a High Victory', () => {
    expect(trickOutcomeKindFor(true, false)).toBe(TrickOutcomeKind.HighVictory)
  })
  it('went high, skull — a High Defeat', () => {
    expect(trickOutcomeKindFor(true, true)).toBe(TrickOutcomeKind.HighDefeat)
  })
  it('went low, no skull — a Low Defeat', () => {
    expect(trickOutcomeKindFor(false, false)).toBe(TrickOutcomeKind.LowDefeat)
  })
  it('went low, skull — a Low Victory', () => {
    expect(trickOutcomeKindFor(false, true)).toBe(TrickOutcomeKind.LowVictory)
  })
  it('words and reasons cover every kind', () => {
    for (const kind of Object.values(TrickOutcomeKind)) {
      expect(TRICK_OUTCOME_WORD[kind]).toBeTruthy()
      expect(TRICK_OUTCOME_WHY[kind]).toBeTruthy()
    }
  })
  it('DLR-165 AC3/AC4 — the headline is the four-way name, not a colour word', () => {
    expect(TRICK_OUTCOME_WORD[TrickOutcomeKind.HighVictory]).toBe('High Victory')
    expect(TRICK_OUTCOME_WORD[TrickOutcomeKind.LowVictory]).toBe('Low Victory')
    expect(TRICK_OUTCOME_WORD[TrickOutcomeKind.LowDefeat]).toBe('Low Defeat')
    expect(TRICK_OUTCOME_WORD[TrickOutcomeKind.HighDefeat]).toBe('High Defeat')
  })
})
