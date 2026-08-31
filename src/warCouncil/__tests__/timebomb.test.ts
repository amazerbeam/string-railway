import { describe, expect, it } from 'vitest'
import { primeCard, unprimeCard, isPrimed, trickIsPrimed } from '../timebomb'
import { PlayerSide, Suit, type Card, type RoundState, type TrickCard } from '../types'
import { dealRound } from '../deal'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })
const played = (side: PlayerSide, c: Card): TrickCard => ({ side, card: c })

/** A real dealt hand, so the specs cannot drift from what `dealRound` actually produces. */
const dealt = (): RoundState => dealRound(PlayerSide.Cpu, () => 0.5)

describe('isPrimed', () => {
  it('matches on suit AND rank together', () => {
    const marked = [card(Suit.Bells, 4)]
    expect(isPrimed(marked, card(Suit.Bells, 4))).toBe(true)
    expect(isPrimed(marked, card(Suit.Keys, 4))).toBe(false)
    expect(isPrimed(marked, card(Suit.Bells, 5))).toBe(false)
  })

  it('is false against an empty list', () => {
    expect(isPrimed([], card(Suit.Bells, 4))).toBe(false)
  })
})

describe('trickIsPrimed (AC3)', () => {
  const marked = [card(Suit.Bells, 4)]

  it('is true when the player’s card carries the mark', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Bells, 4)),
    ]
    expect(trickIsPrimed(marked, trick)).toBe(true)
  })

  it('is true when the mark arrived on the opponent’s card — it tests the trick, not a seat', () => {
    const trick = [played(PlayerSide.Cpu, card(Suit.Bells, 4))]
    expect(trickIsPrimed(marked, trick)).toBe(true)
  })

  it('is false for a trick of unmarked cards', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Keys, 9)),
    ]
    expect(trickIsPrimed(marked, trick)).toBe(false)
  })

  it('is false for an empty trick', () => {
    expect(trickIsPrimed(marked, [])).toBe(false)
  })
})

describe('primeCard (AC2)', () => {
  it('opens every dealt hand with no marks', () => {
    expect(dealt().primedCards).toEqual([])
  })

  it('marks a card held by that side', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const after = primeCard(state, PlayerSide.Player, target)
    expect(after.primedCards).toEqual([target])
    expect(isPrimed(after.primedCards, target)).toBe(true)
  })

  it('leaves the hand, the skulls and the bank untouched', () => {
    const state = dealt()
    const after = primeCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(after.hands).toEqual(state.hands)
    expect(after.skulledCards).toEqual(state.skulledCards)
    expect(after.bank).toBe(state.bank)
    expect(after.multiplier).toBe(state.multiplier)
  })

  it('never mutates its input', () => {
    const state = dealt()
    primeCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(state.primedCards).toEqual([])
  })

  it('accumulates a second mark', () => {
    const state = dealt()
    const [first, second] = state.hands[PlayerSide.Player]
    const twice = primeCard(primeCard(state, PlayerSide.Player, first), PlayerSide.Player, second)
    expect(twice.primedCards).toEqual([first, second])
  })

  it('throws when the card is not in that side’s hand', () => {
    const state = dealt()
    const theirs = state.hands[PlayerSide.Cpu][0]
    expect(() => primeCard(state, PlayerSide.Player, theirs)).toThrow(RangeError)
  })

  it('throws rather than double-marking, so a charge cannot be spent for nothing', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const once = primeCard(state, PlayerSide.Player, target)
    expect(() => primeCard(once, PlayerSide.Player, target)).toThrow(RangeError)
  })
})

describe('unprimeCard — DLR-154 AC5', () => {
  it('removes the mark and leaves every other primed card in place', () => {
    const state = dealt()
    const [five, seven] = state.hands[PlayerSide.Player]
    const primed = primeCard(primeCard(state, PlayerSide.Player, five), PlayerSide.Player, seven)
    const lifted = unprimeCard(primed, five)
    expect(isPrimed(lifted.primedCards, five)).toBe(false)
    expect(isPrimed(lifted.primedCards, seven)).toBe(true)
  })

  it('throws on a card that is not primed, the discipline primeCard sets', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    expect(() => unprimeCard(state, target)).toThrow(RangeError)
  })

  it('does not mutate the state it is given', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const primed = primeCard(state, PlayerSide.Player, target)
    unprimeCard(primed, target)
    expect(isPrimed(primed.primedCards, target)).toBe(true)
  })
})
