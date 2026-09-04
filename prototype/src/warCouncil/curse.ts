/**
 * DLR-167 — the player's own skull.
 *
 * A skull inverts a trick: a trick carrying one is a trick you want to go LOW on, because going low
 * on it is a Low Victory — it banks and costs no health. Until this module the Quarry was the only side that could
 * ever hold one. Curse gives the player the lever: mark a card in your own hand, play it, and the
 * trick flips.
 *
 * The mark lives on its OWN list (`RoundState.cursedCards`) rather than being appended to
 * `skulledCards`, and `RoundState`'s own docblock says why: a dealt skull is written once and never
 * changes mid-hand, while a curse is written mid-hand and LAPSES at the next trick's resolution.
 * Inside one list nothing could tell the two apart, so nothing would know what to lift.
 *
 * `skullsOn` is therefore the ONE place the two lists are read as one. `skulls.ts`'s `isSkulled`
 * and `trickIsSkulled` keep their plain-list signatures and are CALLED with the union rather than
 * taught about two lists — one union, one function, greppable.
 */
import { containsCard } from './cardUtils'
import type { Card, PlayerSide, RoundState } from './types'

/** Membership by suit and rank together, exactly as `isSkulled` tests `skulledCards`. */
export function isCursed(cursedCards: readonly Card[], card: Card): boolean {
  return containsCard(cursedCards, card)
}

/**
 * AC4/AC5 — every card that SHOWS a skull and makes a trick a skull trick, from BOTH sources.
 *
 * THE single union. Two readers deliberately do NOT call this — `cpuPlayer`'s card choice and
 * `suitShape`'s Quarry-shape readout — because both reason about the QUARRY's own dealt skulls,
 * and a skull the player just put on their own card is neither something the Quarry knows nor
 * something the player is being told about the Quarry's hand.
 *
 * Returns `skulledCards` ITSELF when nothing is cursed, which is the overwhelmingly common case:
 * no allocation on the ordinary render path.
 */
export function skullsOn(state: Pick<RoundState, 'skulledCards' | 'cursedCards'>): readonly Card[] {
  return state.cursedCards.length === 0
    ? state.skulledCards
    : [...state.skulledCards, ...state.cursedCards]
}

/**
 * AC3 — put a skull on a card `side` is holding.
 *
 * LEGALITY IS DELIBERATELY NOT CHECKED, and that is the whole point of the card: marking is not a
 * move, so a card that could not legally be played this trick is still a legal target.
 *
 * THROWS a `RangeError` when the card is not in that side's hand or is already cursed, rather than
 * returning the state unchanged — a silent no-op would let the player spend the card and the action
 * points for a mark that was never made. The REDUCER guards both conditions before calling
 * (`curseTapped`), because a throw inside a reducer during an event handler unmounts the tree.
 */
export function curseCard(state: RoundState, side: PlayerSide, card: Card): RoundState {
  if (!containsCard(state.hands[side], card)) {
    throw new RangeError(`Cannot curse the ${card.suit} ${card.rank}: it is not in ${side}'s hand`)
  }
  if (isCursed(state.cursedCards, card)) {
    throw new RangeError(`Cannot curse the ${card.suit} ${card.rank}: it already carries a skull`)
  }
  return { ...state, cursedCards: [...state.cursedCards, card] }
}

/** `curseCard`'s mirror. THROWS when the card is not cursed, for `curseCard`'s stated reason. */
export function uncurseCard(state: RoundState, card: Card): RoundState {
  if (!isCursed(state.cursedCards, card)) {
    throw new RangeError(`Cannot lift the curse on the ${card.suit} ${card.rank}: it has none`)
  }
  return {
    ...state,
    cursedCards: state.cursedCards.filter((c) => !(c.suit === card.suit && c.rank === card.rank)),
  }
}
