import { describe, expect, it } from 'vitest'
import { RANKS } from '../../../warCouncil'
import { RANK_FACE, cardActs } from '../cardFace'
import {
  NO_RULE_MARK_LABEL,
  PLAIN_RANK_RULE_TEXT,
  RANK_RULE_TEXT,
  cardTipTitle,
} from '../cardRuleText'

describe('cardRuleText', () => {
  it('carries copy for every rank in RANKS', () => {
    for (const rank of RANKS) expect(RANK_RULE_TEXT[rank]).toBeTruthy()
  })

  it('titles a named rank with its name and an unnamed one with the bare rank', () => {
    expect(cardTipTitle(9)).toBe('9 · Witch')
    expect(cardTipTitle(7)).toBe('7 · Treasure')
    expect(cardTipTitle(8)).toBe('8')
  })

  // DLR-163 AC13 — the Treasure HAS a rule now, so the old assertion (that its text said it had
  // none) is inverted rather than deleted: it must state the rule and must not read as inert.
  it('AC13 — the three rewritten ranks state a real rule, distinct from the plain sentence', () => {
    for (const rank of [3, 5, 7]) {
      expect(RANK_RULE_TEXT[rank]).not.toBe(PLAIN_RANK_RULE_TEXT)
      expect(RANK_RULE_TEXT[rank]).not.toMatch(/no (effect|rule)/i)
      expect(RANK_RULE_TEXT[rank].length).toBeGreaterThan(60)
    }
    // Each names what it actually does, so a reader cannot confuse the three.
    expect(RANK_RULE_TEXT[3]).toMatch(/name any suit/i)
    expect(RANK_RULE_TEXT[5]).toMatch(/swap pile/i)
    expect(RANK_RULE_TEXT[7]).toMatch(/base damage/i)
  })

  it('AC13 — the three texts are distinct from one another', () => {
    expect(new Set([RANK_RULE_TEXT[3], RANK_RULE_TEXT[5], RANK_RULE_TEXT[7]]).size).toBe(3)
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
