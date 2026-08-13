import { describe, expect, it } from 'vitest'
import {
  IllegalMoveReason,
  QuarryIntentStance,
  Suit,
  TrickOutcome,
  type SuitShape,
} from '../../../warCouncil'
import { DuelSide } from '../../../hunt'
import {
  cardAccessibleName,
  healthBarValueText,
  ILLEGAL_MOVE_MESSAGE,
  intentAccessibleName,
  quarryShapeText,
  RANK_NAME,
  STANCE_PHRASE,
  suitShapeRowText,
  SUIT_NAME,
  TRICK_OUTCOME_MESSAGE,
} from '../labels'

describe('cardAccessibleName', () => {
  it('names an ability-bearing rank', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 })).toBe('3 of Keys (Fox)')
  })

  it('omits the parenthetical for an ordinary rank', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 7 })).toBe('7 of Bells')
  })

  it('appends a skulled suffix when told the card is skulled', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, true)).toBe('4 of Bells, skulled')
  })

  it('defaults to not skulled, so every existing call site keeps compiling unchanged', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 })).toBe('4 of Bells')
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

  it('carries a stance phrase for every QuarryIntentStance', () => {
    for (const stance of Object.values(QuarryIntentStance)) {
      expect(STANCE_PHRASE[stance]).toBeTruthy()
    }
  })

  it('carries copy for every trick outcome (§3.2)', () => {
    for (const outcome of Object.values(TrickOutcome)) {
      expect(TRICK_OUTCOME_MESSAGE[outcome]).toBeTruthy()
    }
  })
})

describe('intentAccessibleName', () => {
  it('names the suit and the stance for a live intent', () => {
    expect(
      intentAccessibleName({ suit: Suit.Bells, stance: QuarryIntentStance.Pressing }, false),
    ).toBe('The Quarry will press with Bells.')
  })

  it('prefixes with "If you lead that card" when speculative', () => {
    expect(
      intentAccessibleName({ suit: Suit.Keys, stance: QuarryIntentStance.Ducking }, true),
    ).toBe('If you lead that card: The Quarry will duck with Keys.')
  })

  it('returns a distinct sentence for null in each mode', () => {
    const live = intentAccessibleName(null, false)
    const speculative = intentAccessibleName(null, true)
    expect(live).not.toBe(speculative)
    expect(live).toBeTruthy()
    expect(speculative).toBeTruthy()
  })

  it('omits the stance without crashing when stance is absent (suit-only fidelity)', () => {
    expect(intentAccessibleName({ suit: Suit.Moons }, false)).toBe('The Quarry will play Moons.')
  })
})

describe('healthBarValueText — the current total against the max (DLR-80)', () => {
  const base = {
    side: DuelSide.Player,
    secure: 20,
    pending: 0,
    current: 20,
    max: 25,
    securePct: 80,
    pendingPct: 0,
    lethal: false,
  }

  it('names the current total against the max — no pending figure exists any more', () => {
    expect(healthBarValueText(base)).toBe('20 of 25.')
  })

  it('says lethal rather than making the reader compare two numbers', () => {
    expect(healthBarValueText({ ...base, secure: 0, current: 0, lethal: true })).toBe(
      '0 of 25. Lethal.',
    )
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
