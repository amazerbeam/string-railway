import { SKULL_DENSITY, SKULL_MIN_RANK } from '../hunt'
import { containsCard } from './cardUtils'
import { shuffle } from './shuffle'
import { ALL_SUITS, type Card, type Suit, type TrickCard } from './types'

/** AC11's row shape: what the Quarry holds in one suit, and how much of it is mined. Carries
 *  no rank, because §3.5's whole claim is that counting suits is bookkeeping and reading ranks
 *  is judgement — the readout removes the first and keeps the second. */
export interface SuitShape {
  readonly suit: Suit
  readonly held: number
  readonly skulled: number
}

/**
 * §3.4's never-rank-1 rule, as a filter. A skulled 1 cannot lose its trick, so it is an
 * undodgeable tax rather than a decision — excluding it is what leaves foreknowledge worth
 * having.
 */
export function skullableCards(
  hand: readonly Card[],
  minRank: number = SKULL_MIN_RANK,
): readonly Card[] {
  return hand.filter((card) => card.rank >= minRank)
}

/**
 * AC2 — the skulls carried by one dealt hand.
 *
 * Draws through `shuffle` from the INJECTED `rng`, never `Math.random`, so a seeded deal is
 * reproducible and every spec above is deterministic. `density` and `minRank` are defaulted
 * parameters rather than values this module closes over — the same injectable pattern
 * `startEncounter`'s `playerHealth` uses — so §6 Q1's rank skew can be tested without mutating
 * module state.
 *
 * The count is clamped to the eligible cards: a hand of five rank-1s cannot carry two skulls,
 * and silently returning fewer is correct where throwing would make a legal deal a crash.
 */
export function assignSkulls(
  hand: readonly Card[],
  rng: () => number,
  density: number = SKULL_DENSITY,
  minRank: number = SKULL_MIN_RANK,
): readonly Card[] {
  const eligible = skullableCards(hand, minRank)
  const wanted = Math.min(Math.round(hand.length * density), eligible.length)
  return shuffle(eligible, rng).slice(0, wanted)
}

/** Membership by suit and rank together, which identifies a card uniquely across the deck. */
export function isSkulled(skulledCards: readonly Card[], card: Card): boolean {
  return containsCard(skulledCards, card)
}

/** AC11 — one row per suit, in `ALL_SUITS` order, including a suit that has been stripped. */
export function suitShape(
  hand: readonly Card[],
  skulledCards: readonly Card[],
): readonly SuitShape[] {
  return ALL_SUITS.map((suit) => {
    const held = hand.filter((card) => card.suit === suit)
    return {
      suit,
      held: held.length,
      skulled: held.filter((card) => isSkulled(skulledCards, card)).length,
    }
  })
}

/**
 * AC5/AC7's discriminator: a trick is a skull trick iff ANY card played into it is skulled.
 *
 * Skulls are dealt only to the Quarry, so in practice this reads "the Quarry's card is skulled"
 * — but the Quarry's Fox can exchange a skulled card into the decree and the player's Fox can
 * later take that decree into hand, so a player-held skull is expressible in one hand. Testing
 * the trick rather than the seat survives that path with no special case.
 */
export function trickIsSkulled(
  skulledCards: readonly Card[],
  trick: readonly TrickCard[],
): boolean {
  return trick.some((played) => isSkulled(skulledCards, played.card))
}
