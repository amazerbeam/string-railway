import { describe, expect, it } from 'vitest'
import { RANKS } from '../../../warCouncil'
import { RANK_FACE, cardActs } from '../cardFace'
import { NO_RULE_MARK_LABEL, RANK_RULE_TEXT, cardTipTitle } from '../cardRuleText'

describe('cardRuleText', () => {
  it('carries copy for every rank in RANKS', () => {
    for (const rank of RANKS) expect(RANK_RULE_TEXT[rank]).toBeTruthy()
  })

  it('titles a named rank with its name and an unnamed one with the bare rank', () => {
    expect(cardTipTitle(9)).toBe('9 · Witch')
    expect(cardTipTitle(7)).toBe('7 · Treasure')
    expect(cardTipTitle(8)).toBe('8')
  })

  // The two inert named ranks must not read as though they do something, and the five acting
  // ranks must not read as though they do not. This is the ticket's whole problem statement.
  it('says plainly that the Treasure has no rule', () => {
    expect(RANK_RULE_TEXT[7]).toMatch(/no (effect|rule)/i)
  })

  it('gives every acting rank a rule longer than the plain sentence', () => {
    for (const rank of RANKS.filter(cardActs)) {
      expect({ rank, long: RANK_RULE_TEXT[rank].length > 60 }).toEqual({ rank, long: true })
    }
  })

  it('keeps the printed mark free of rule text (AC8)', () => {
    expect(NO_RULE_MARK_LABEL.split(/\s+/).length).toBeLessThanOrEqual(2)
  })

  it('names every rank the face model names', () => {
    for (const rank of RANKS) {
      const name = RANK_FACE[rank].name
      if (name !== null) expect(cardTipTitle(rank)).toContain(name)
    }
  })
})
