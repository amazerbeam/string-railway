import { describe, expect, it } from 'vitest'
import { IllegalMoveReason, Suit, TrickOutcome, type SuitShape } from '../../../warCouncil'
import { DuelSide } from '../../../hunt'
import {
  cardAccessibleName,
  cardDamageGlyphText,
  cardDamageText,
  CARD_DAMAGE_ESTIMATE_NOTE,
  quarryHealthLabel,
  HEALTH_BAR_LABEL,
  healthBarValueText,
  ILLEGAL_MOVE_MESSAGE,
  quarryLeadTelegraphText,
  quarryShapeText,
  RANK_NAME,
  suitShapeRowText,
  SUIT_NAME,
  TRICK_OUTCOME_MESSAGE,
} from '../labels'
import type { CardDamagePreview } from '../cardDamage'
import { HeartState } from '../duelHealthBars'

describe('cardAccessibleName', () => {
  it('names an ability-bearing rank', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 })).toBe('3 of Keys (Fox)')
  })

  it('omits the parenthetical for an ordinary rank', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 7 })).toBe('7 of Bells')
  })

  it('defaults to no marks, so every existing call site keeps compiling unchanged', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 })).toBe('4 of Bells')
  })

  it('names a skulled card', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { skulled: true })).toBe(
      '4 of Bells, skulled',
    )
  })
})

describe('the label maps', () => {
  it('names every suit', () => {
    for (const suit of Object.values(Suit)) expect(SUIT_NAME[suit]).toBeTruthy()
  })

  it('names exactly the five ability-bearing ranks', () => {
    expect(
      Object.keys(RANK_NAME)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 3, 5, 9, 11])
  })

  it('carries copy for every illegal-move reason', () => {
    for (const reason of Object.values(IllegalMoveReason)) {
      expect(ILLEGAL_MOVE_MESSAGE[reason]).toBeTruthy()
    }
  })

  it('carries copy for every trick outcome (§3.2)', () => {
    for (const outcome of Object.values(TrickOutcome)) {
      expect(TRICK_OUTCOME_MESSAGE[outcome]).toBeTruthy()
    }
  })
})

describe('healthBarValueText — the current total against the max (DLR-80)', () => {
  const base = {
    side: DuelSide.Player,
    secure: 20,
    pending: 0,
    current: 20,
    max: 25,
    hearts: [],
    lethal: false,
    // DLR-115 — the fixture is a hand-built HealthBarView, which Task 1's audit missed; these
    // two fields keep it assignable now that HealthBarView carries the shield dimension.
    shielded: 0,
    shieldPips: [],
  }

  it('names the current total against the max — no pending figure exists any more', () => {
    expect(healthBarValueText(base)).toBe('20 of 25.')
  })

  it('says lethal rather than making the reader compare two numbers', () => {
    expect(healthBarValueText({ ...base, secure: 0, current: 0, lethal: true })).toBe(
      'Lethal. 0 of 25.',
    )
  })

  it('names what the streak puts at risk, without disturbing the current-of-max reading', () => {
    expect(healthBarValueText({ ...base, secure: 14, pending: 6 })).toBe('20 of 25. 6 at risk.')
  })

  it('says both when a live streak would empty the bar', () => {
    expect(healthBarValueText({ ...base, secure: 0, pending: 20, lethal: true })).toBe(
      'Lethal. 20 of 25. 20 at risk.',
    )
  })
})

describe('healthBarValueText — DLR-115’s shield clause', () => {
  const base = {
    side: DuelSide.Player,
    secure: 10,
    pending: 0,
    current: 10,
    max: 10,
    hearts: [],
    lethal: false,
    shielded: 0,
    shieldPips: [] as HeartState[],
  }

  it('is byte-identical to today’s string when no shield stands', () => {
    expect(healthBarValueText(base)).toBe('10 of 10.')
  })

  it('names a standing shield between standing and at-risk', () => {
    expect(
      healthBarValueText({
        ...base,
        shielded: 2,
        shieldPips: [HeartState.Whole, HeartState.Whole],
      }),
    ).toBe('10 of 10. 2 shielded.')
  })

  it('states the worst case in full — shield, at-risk and lethal together', () => {
    expect(
      healthBarValueText({
        ...base,
        secure: 0,
        pending: 10,
        lethal: true,
        shielded: 2,
        shieldPips: [HeartState.Whole, HeartState.Whole],
      }),
    ).toBe('Lethal. 10 of 10. 2 shielded. 10 at risk.')
  })
})

describe('suitShapeRowText — the single owner `quarryShapeText` and `QuarryShape.tsx` both build from', () => {
  it('states one row’s held and skulled counts', () => {
    expect(suitShapeRowText({ suit: Suit.Keys, held: 2, skulled: 1 })).toBe(
      'Keys: 2 held, 1 skulled',
    )
  })

  it('names nothing skulled distinctly from a positive count', () => {
    expect(suitShapeRowText({ suit: Suit.Moons, held: 4, skulled: 0 })).toBe(
      'Moons: 4 held, none skulled',
    )
  })
})

describe('quarryShapeText — AC11, never a rank', () => {
  it('states each suit’s held and skulled counts, in ALL_SUITS order', () => {
    const shape: readonly SuitShape[] = [
      { suit: Suit.Bells, held: 3, skulled: 1 },
      { suit: Suit.Keys, held: 0, skulled: 0 },
      { suit: Suit.Moons, held: 2, skulled: 2 },
    ]
    expect(quarryShapeText(shape)).toBe(
      'What the Quarry holds — Bells: 3 held, 1 skulled; Keys: 0 held, none skulled; Moons: 2 held, 2 skulled.',
    )
  })

  it('names a suit with nothing skulled distinctly from one held', () => {
    expect(quarryShapeText([{ suit: Suit.Bells, held: 4, skulled: 0 }])).toContain(
      'Bells: 4 held, none skulled',
    )
  })

  it('never mentions a card rank — SuitShape carries none to leak', () => {
    const shape: readonly SuitShape[] = [{ suit: Suit.Moons, held: 6, skulled: 2 }]
    // Every digit in the sentence is a count (held/skulled), never a rank — there is no rank
    // field on SuitShape for this function to read in the first place.
    expect(quarryShapeText(shape)).not.toMatch(/rank/i)
  })
})

describe('quarryLeadTelegraphText — DLR-155 AC2, the telegraph sentence', () => {
  it('names the suit and nothing else', () => {
    expect(quarryLeadTelegraphText(Suit.Bells)).toBe('The Quarry will lead with Bells')
  })

  it('draws every suit name from SUIT_NAME rather than typing one out', () => {
    for (const suit of [Suit.Bells, Suit.Keys, Suit.Moons]) {
      expect(quarryLeadTelegraphText(suit)).toBe(`The Quarry will lead with ${SUIT_NAME[suit]}`)
    }
  })

  it('never carries a rank (AC5)', () => {
    expect(quarryLeadTelegraphText(Suit.Moons)).not.toMatch(/\d/)
  })
})

describe('quarryHealthLabel', () => {
  it('names the bar after the opponent being fought', () => {
    expect(quarryHealthLabel('Aoife')).toBe('Aoife’s health')
    expect(quarryHealthLabel('Diarmuid')).toBe('Diarmuid’s health')
  })

  it('falls back to the generic wording when no opponent is known', () => {
    expect(quarryHealthLabel(undefined)).toBe(HEALTH_BAR_LABEL[DuelSide.Quarry])
  })

  it('stays distinct from the player bar, which is what a spec queries them by', () => {
    expect(quarryHealthLabel('Aoife')).not.toBe(HEALTH_BAR_LABEL[DuelSide.Player])
    expect(quarryHealthLabel(undefined)).not.toBe(HEALTH_BAR_LABEL[DuelSide.Player])
  })
})

describe('cardDamageGlyphText and cardDamageText — DLR-117, updated DLR-156 B1', () => {
  // DLR-156 AC5 — `win.toQuarry` is correctly 0 on every ordinary win now: nothing is dealt to
  // the Quarry immediately any more, only through the resolution screen's own Apply. `winPot` is
  // what carries "does this card matter" instead — this fixture's `pot: 42` is what proves the
  // sentence reads the WIN branch's own figures rather than the (now inert) `win.toQuarry`.
  const exactPreview: CardDamagePreview = {
    win: { toQuarry: 0, toPlayer: 0, shielded: 0 },
    lose: { toQuarry: 0, toPlayer: 1, shielded: 0 },
    winPot: { trickDamage: 6, total: 6, roll: 1, pot: 6 },
    exact: true,
  }

  it('reads the two card-dependent figures for an exact preview, with no caveat in the sentence', () => {
    expect(cardDamageGlyphText(exactPreview)).toBe('W6 L1')
    const sentence = cardDamageText(exactPreview)
    expect(sentence).toBe(
      'If you win this trick: adds 6 to the streak — the pot would stand at 6. ' +
        'If you lose: 1 damage to you.',
    )
    expect(sentence).not.toContain(CARD_DAMAGE_ESTIMATE_NOTE)
  })

  it('marks an inexact preview with the leading glyph and appends the estimate note to the sentence', () => {
    const inexactPreview: CardDamagePreview = { ...exactPreview, exact: false }
    expect(cardDamageGlyphText(inexactPreview)).toBe('~W6 L1')
    expect(cardDamageText(inexactPreview)).toBe(
      'If you win this trick: adds 6 to the streak — the pot would stand at 6. ' +
        'If you lose: 1 damage to you. ' +
        CARD_DAMAGE_ESTIMATE_NOTE,
    )
  })

  it('renders a win worth nothing as "adds nothing to the streak", and a lose branch that costs nobody anything as "no damage"', () => {
    const cleanPreview: CardDamagePreview = {
      win: { toQuarry: 0, toPlayer: 0, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 0, shielded: 0 },
      winPot: { trickDamage: 0, total: 0, roll: 0, pot: 0 },
      exact: true,
    }
    expect(cardDamageText(cleanPreview)).toBe(
      'If you win this trick: adds nothing to the streak. If you lose: no damage.',
    )
  })

  it('names the win branch’s own cross-terms alongside the pot figure', () => {
    const crossTermPreview: CardDamagePreview = {
      win: { toQuarry: 3, toPlayer: 2, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 1, shielded: 0 },
      winPot: { trickDamage: 6, total: 6, roll: 1, pot: 6 },
      exact: true,
    }
    const sentence = cardDamageText(crossTermPreview)
    expect(sentence).toContain('adds 6 to the streak — the pot would stand at 6')
    expect(sentence).toContain('3 damage to the Quarry')
    expect(sentence).toContain('2 damage to you')
  })

  it('names shield absorption when the lose branch spends one', () => {
    const shieldedPreview: CardDamagePreview = {
      win: { toQuarry: 0, toPlayer: 0, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 0, shielded: 1 },
      winPot: { trickDamage: 6, total: 6, roll: 1, pot: 6 },
      exact: true,
    }
    expect(cardDamageText(shieldedPreview)).toContain('1 absorbed by your shield')
  })
})
