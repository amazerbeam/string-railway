import { describe, expect, it } from 'vitest'
import {
  ApplyDamageRefusal,
  IllegalMoveReason,
  Suit,
  TrickOutcome,
  type SuitShape,
} from '../../../warCouncil'
import { DuelSide } from '../../../hunt'
import {
  applyDamageAccessibleName,
  APPLY_DAMAGE_REFUSAL_MESSAGE,
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
  timebombFuseText,
  TRICK_OUTCOME_MESSAGE,
} from '../labels'
import type { CardDamagePreview } from '../cardDamage'
import { duelHealthBars, HeartState } from '../duelHealthBars'

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

  it('names a primed card', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { primed: true })).toBe(
      '4 of Bells, primed',
    )
  })

  it('names a card carrying both marks, skull first', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { skulled: true, primed: true })).toBe(
      '4 of Bells, skulled, primed',
    )
  })

  it('names a named rank with a mark, keeping the rank name before the marks', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 }, { primed: true })).toBe(
      '3 of Keys (Fox), primed',
    )
  })

  it('names the fuse on a primed card — R4', () => {
    expect(
      cardAccessibleName({ suit: Suit.Bells, rank: 5 }, { primed: true, fuseRemaining: 2 }),
    ).toMatch(/2 tricks/)
  })

  it('names skull before Timebomb, and leaves an unmarked card alone', () => {
    expect(
      cardAccessibleName(
        { suit: Suit.Bells, rank: 5 },
        { skulled: true, primed: true, fuseRemaining: 1 },
      ),
    ).toMatch(/skulled.*primed/)
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 5 })).not.toMatch(/primed/)
  })
})

describe('timebombFuseText — R4', () => {
  it('names the tricks remaining when more than one is left', () => {
    expect(timebombFuseText(2)).toMatch(/2 tricks/)
  })

  it('singularises the last trick', () => {
    expect(timebombFuseText(1)).toMatch(/this trick/)
  })

  it('says it is going off now once the fuse has run out', () => {
    expect(timebombFuseText(0)).toMatch(/going off now/)
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
    ticking: 0,
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

describe('healthBarValueText — DLR-101’s committed-Timebomb clause', () => {
  const MAX = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
  const CURRENT = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }

  it('names the ticking figure separately from what the streak still puts at risk', () => {
    const [view] = duelHealthBars(CURRENT, { ...CURRENT, [DuelSide.Player]: 3 }, MAX, {
      ticking: { [DuelSide.Player]: 4, [DuelSide.Quarry]: 0 },
    })
    expect(view.pending).toBe(7)
    expect(view.ticking).toBe(4)
    expect(healthBarValueText(view)).toBe('10 of 10. 3 at risk. 4 ticking.')
  })

  it('is byte-identical to the pre-DLR-101 string when nothing is booked', () => {
    const [view] = duelHealthBars(CURRENT, { ...CURRENT, [DuelSide.Player]: 4 }, MAX)
    expect(view.ticking).toBe(0)
    expect(healthBarValueText(view)).toBe('10 of 10. 6 at risk.')
  })

  it('omits the at-risk clause entirely when the whole pending band is booked', () => {
    const [view] = duelHealthBars(CURRENT, { ...CURRENT, [DuelSide.Player]: 6 }, MAX, {
      ticking: { [DuelSide.Player]: 4, [DuelSide.Quarry]: 0 },
    })
    expect(view.pending).toBe(4)
    expect(view.ticking).toBe(4)
    expect(healthBarValueText(view)).toBe('10 of 10. 4 ticking.')
  })
})

describe('healthBarValueText — DLR-115’s shield clause', () => {
  const base = {
    side: DuelSide.Player,
    secure: 10,
    pending: 0,
    ticking: 0,
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

  it('names a standing shield, with no Timebomb claimed, between standing and at-risk', () => {
    expect(
      healthBarValueText({
        ...base,
        shielded: 2,
        shieldPips: [HeartState.Whole, HeartState.Whole],
      }),
    ).toBe('10 of 10. 2 shielded.')
  })

  it('names a shield partly claimed by a booked Timebomb, disambiguated with "of them"', () => {
    expect(
      healthBarValueText({
        ...base,
        shielded: 2,
        shieldPips: [HeartState.Whole, HeartState.Ticking],
      }),
    ).toBe('10 of 10. 2 shielded, 1 of them ticking.')
  })

  it('states the worst case in full — shield, at-risk, red ticking, and lethal together', () => {
    expect(
      healthBarValueText({
        ...base,
        secure: 0,
        pending: 10,
        ticking: 4,
        lethal: true,
        shielded: 2,
        shieldPips: [HeartState.Whole, HeartState.Ticking],
      }),
    ).toBe('Lethal. 10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking.')
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

describe('applyDamageAccessibleName — DLR-94', () => {
  it('names the figure the apply would deal', () => {
    expect(applyDamageAccessibleName(9, false, null)).toMatch(/9 to the Quarry/)
  })

  it('gives the three readings three different names', () => {
    const live = applyDamageAccessibleName(9, false, null)
    const poised = applyDamageAccessibleName(9, true, null)
    const refused = applyDamageAccessibleName(0, false, ApplyDamageRefusal.EmptyBank)
    expect(new Set([live, poised, refused]).size).toBe(3)
  })

  it('puts the reason in the name of a refused control, not only in the styling', () => {
    expect(applyDamageAccessibleName(0, false, ApplyDamageRefusal.TrickInProgress)).toContain(
      APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.TrickInProgress],
    )
  })

  it('a refusal outranks a poise — a stranded poise must never sound available', () => {
    expect(applyDamageAccessibleName(9, true, ApplyDamageRefusal.NotYourMove)).toMatch(
      /unavailable/,
    )
  })
})

describe('cardDamageGlyphText and cardDamageText — DLR-117', () => {
  const exactPreview: CardDamagePreview = {
    win: { toQuarry: 6, toPlayer: 0, shielded: 0 },
    lose: { toQuarry: 0, toPlayer: 1, shielded: 0 },
    exact: true,
  }

  it('reads the two card-dependent figures for an exact preview, with no caveat in the sentence', () => {
    expect(cardDamageGlyphText(exactPreview)).toBe('W6 L1')
    const sentence = cardDamageText(exactPreview)
    expect(sentence).toBe(
      'If you win this trick: 6 damage to the Quarry. If you lose: 1 damage to you.',
    )
    expect(sentence).not.toContain(CARD_DAMAGE_ESTIMATE_NOTE)
  })

  it('marks an inexact preview with the leading glyph and appends the estimate note to the sentence', () => {
    const inexactPreview: CardDamagePreview = { ...exactPreview, exact: false }
    expect(cardDamageGlyphText(inexactPreview)).toBe('~W6 L1')
    expect(cardDamageText(inexactPreview)).toBe(
      'If you win this trick: 6 damage to the Quarry. If you lose: 1 damage to you. ' +
        CARD_DAMAGE_ESTIMATE_NOTE,
    )
  })

  it('renders a branch that costs nobody anything as "no damage" rather than "0 damage to you"', () => {
    const cleanPreview: CardDamagePreview = {
      win: { toQuarry: 6, toPlayer: 0, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 0, shielded: 0 },
      exact: true,
    }
    expect(cardDamageText(cleanPreview)).toBe(
      'If you win this trick: 6 damage to the Quarry. If you lose: no damage.',
    )
  })

  it('names both sides of a branch that costs the player even on a win, so the cross-term is not dropped', () => {
    const crossTermPreview: CardDamagePreview = {
      win: { toQuarry: 6, toPlayer: 2, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 1, shielded: 0 },
      exact: true,
    }
    const sentence = cardDamageText(crossTermPreview)
    expect(sentence).toContain('6 damage to the Quarry')
    expect(sentence).toContain('2 damage to you')
  })

  it('names shield absorption when a branch spends one', () => {
    const shieldedPreview: CardDamagePreview = {
      win: { toQuarry: 6, toPlayer: 0, shielded: 0 },
      lose: { toQuarry: 0, toPlayer: 0, shielded: 1 },
      exact: true,
    }
    expect(cardDamageText(shieldedPreview)).toContain('1 absorbed by your shield')
  })
})
