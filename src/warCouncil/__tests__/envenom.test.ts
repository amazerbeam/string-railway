import { describe, expect, it } from 'vitest'
import { envenomCard, isEnvenomed, trickIsEnvenomed } from '../envenom'
import { PlayerSide, Suit, type Card, type RoundState, type TrickCard } from '../types'
import { dealRound } from '../deal'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })
const played = (side: PlayerSide, c: Card): TrickCard => ({ side, card: c })

/** A real dealt hand, so the specs cannot drift from what `dealRound` actually produces. */
const dealt = (): RoundState => dealRound(PlayerSide.Cpu, () => 0.5)

describe('isEnvenomed', () => {
  it('matches on suit AND rank together', () => {
    const marked = [card(Suit.Bells, 4)]
    expect(isEnvenomed(marked, card(Suit.Bells, 4))).toBe(true)
    expect(isEnvenomed(marked, card(Suit.Keys, 4))).toBe(false)
    expect(isEnvenomed(marked, card(Suit.Bells, 5))).toBe(false)
  })

  it('is false against an empty list', () => {
    expect(isEnvenomed([], card(Suit.Bells, 4))).toBe(false)
  })
})

describe('trickIsEnvenomed (AC3)', () => {
  const marked = [card(Suit.Bells, 4)]

  it('is true when the player’s card carries the mark', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Bells, 4)),
    ]
    expect(trickIsEnvenomed(marked, trick)).toBe(true)
  })

  it('is true when the mark arrived on the opponent’s card — it tests the trick, not a seat', () => {
    const trick = [played(PlayerSide.Cpu, card(Suit.Bells, 4))]
    expect(trickIsEnvenomed(marked, trick)).toBe(true)
  })

  it('is false for a trick of unmarked cards', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Keys, 9)),
    ]
    expect(trickIsEnvenomed(marked, trick)).toBe(false)
  })

  it('is false for an empty trick', () => {
    expect(trickIsEnvenomed(marked, [])).toBe(false)
  })
})

describe('envenomCard (AC2)', () => {
  it('opens every dealt hand with no marks', () => {
    expect(dealt().envenomedCards).toEqual([])
  })

  it('marks a card held by that side', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const after = envenomCard(state, PlayerSide.Player, target)
    expect(after.envenomedCards).toEqual([target])
    expect(isEnvenomed(after.envenomedCards, target)).toBe(true)
  })

  it('leaves the hand, the skulls and the bank untouched', () => {
    const state = dealt()
    const after = envenomCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(after.hands).toEqual(state.hands)
    expect(after.skulledCards).toEqual(state.skulledCards)
    expect(after.bank).toBe(state.bank)
    expect(after.multiplier).toBe(state.multiplier)
  })

  it('never mutates its input', () => {
    const state = dealt()
    envenomCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(state.envenomedCards).toEqual([])
  })

  it('accumulates a second mark', () => {
    const state = dealt()
    const [first, second] = state.hands[PlayerSide.Player]
    const twice = envenomCard(
      envenomCard(state, PlayerSide.Player, first),
      PlayerSide.Player,
      second,
    )
    expect(twice.envenomedCards).toEqual([first, second])
  })

  it('throws when the card is not in that side’s hand', () => {
    const state = dealt()
    const theirs = state.hands[PlayerSide.Cpu][0]
    expect(() => envenomCard(state, PlayerSide.Player, theirs)).toThrow(RangeError)
  })

  it('throws rather than double-marking, so a charge cannot be spent for nothing', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const once = envenomCard(state, PlayerSide.Player, target)
    expect(() => envenomCard(once, PlayerSide.Player, target)).toThrow(RangeError)
  })
})
