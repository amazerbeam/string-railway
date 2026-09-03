import { describe, expect, it } from 'vitest'
import {
  TRICK_OUTCOME_WHY,
  TRICK_OUTCOME_WORD,
  TrickOutcomeKind,
  trickOutcomeKindFor,
} from '../resolutionOutcome'

describe('trickOutcomeKindFor', () => {
  it('took it, no skull — a clean win', () => {
    expect(trickOutcomeKindFor(true, false)).toBe(TrickOutcomeKind.CleanWin)
  })
  it('took it, skull — ate the skull', () => {
    expect(trickOutcomeKindFor(true, true)).toBe(TrickOutcomeKind.AteTheSkull)
  })
  it('did not take it, no skull — a clean loss', () => {
    expect(trickOutcomeKindFor(false, false)).toBe(TrickOutcomeKind.CleanLoss)
  })
  it('did not take it, skull — a dodge', () => {
    expect(trickOutcomeKindFor(false, true)).toBe(TrickOutcomeKind.Dodge)
  })
  it('words and reasons cover every kind', () => {
    for (const kind of Object.values(TrickOutcomeKind)) {
      expect(TRICK_OUTCOME_WORD[kind]).toBeTruthy()
      expect(TRICK_OUTCOME_WHY[kind]).toBeTruthy()
    }
  })
})
