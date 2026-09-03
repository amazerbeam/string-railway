import { SKULL_DENSITY, SKULL_RANK_WEIGHTS, type SkullRankWeights } from '../hunt'
import { containsCard } from './cardUtils'
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
 * The cards a curve permits a skull on: those whose rank carries a positive weight. Replaces the
 * old rank-floor filter — "never rank 1" is now `weights[1] === 0`, so the rule lives in the curve
 * rather than in this function.
 */
export function skullableCards(
  hand: readonly Card[],
  weights: SkullRankWeights = SKULL_RANK_WEIGHTS,
): readonly Card[] {
  return hand.filter((card) => (weights[card.rank] ?? 0) > 0)
}

/**
 * Draw `count` distinct cards, each picked with probability proportional to its rank's weight.
 *
 * Consumes EXACTLY ONE `rng` call per card drawn, which is what keeps a seeded deal reproducible —
 * rejection sampling would consume an unbounded number and make the skulls depend on how many
 * rejections happened. A rank with no entry reads as 0 through the explicit `?? 0`, so a missing
 * key can never become `NaN` in the running total. Returns fewer than `count` when the candidates
 * or the positive weight run out; that is legal, not an error.
 */
export function weightedDraw(
  candidates: readonly Card[],
  rng: () => number,
  weights: SkullRankWeights,
  count: number,
): readonly Card[] {
  const pool = [...candidates]
  const drawn: Card[] = []

  while (drawn.length < count && pool.length > 0) {
    const total = pool.reduce((sum, card) => sum + (weights[card.rank] ?? 0), 0)
    if (total <= 0) {
      break
    }
    let threshold = rng() * total
    // Falls back to the last candidate, which is what floating-point drift would otherwise leave
    // unselected when `threshold` never quite drops below zero.
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      threshold -= weights[pool[i].rank] ?? 0
      if (threshold < 0) {
        index = i
        break
      }
    }
    drawn.push(pool[index])
    pool.splice(index, 1)
  }

  return drawn
}

/**
 * AC2 — the skulls carried by one dealt hand.
 *
 * `density` decides HOW MANY and `weights` decides WHICH RANKS; they are orthogonal dials. Both are
 * defaulted parameters rather than values this module closes over, so a curve can be tested without
 * mutating module state.
 *
 * The count is clamped to the eligible cards: a hand of five rank-1s cannot carry two skulls, and
 * silently returning fewer is correct where throwing would make a legal deal a crash.
 */
export function assignSkulls(
  hand: readonly Card[],
  rng: () => number,
  density: number = SKULL_DENSITY,
  weights: SkullRankWeights = SKULL_RANK_WEIGHTS,
): readonly Card[] {
  const eligible = skullableCards(hand, weights)
  const wanted = Math.min(Math.round(hand.length * density), eligible.length)
  return weightedDraw(eligible, rng, weights, wanted)
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
 * DLR-163 closed the path this test was originally written for: the Fox used to exchange a card
 * into the decree, so a skulled Quarry card could reach the decree and from there the player's
 * hand. No card is ever moved onto the decree any more, and the Quarry's new Woodcutter mints its
 * skull into the Quarry's own hand. The trick-shaped test is RETAINED because it is TOTAL — it
 * needs no knowledge of which seat holds a skull, and DLR-167's curse, which marks a card in the
 * PLAYER's hand, is a live reason a player-held skull is expressible today.
 */
export function trickIsSkulled(
  skulledCards: readonly Card[],
  trick: readonly TrickCard[],
): boolean {
  return trick.some((played) => isSkulled(skulledCards, played.card))
}
