import { containsCard } from './cardUtils'
import type { Card, PlayerSide, RoundState, TrickCard } from './types'

/**
 * The Timebomb marker. A SEPARATE module from `skulls.ts` on purpose: DLR-90 states poison is a
 * wholly separate marker from a skull, and two markers sharing a helper is how they stop being
 * separate. Nothing here reads `skulledCards` and nothing there reads `primedCards`.
 */

/** Membership by suit and rank together, which identifies a card uniquely across the deck. */
export function isPrimed(primedCards: readonly Card[], card: Card): boolean {
  return containsCard(primedCards, card)
}

/**
 * AC3's discriminator: a trick is marked iff ANY card played into it is marked.
 *
 * Tests the TRICK rather than a seat, for the reason `trickIsSkulled` gives about skulls: the Fox
 * can exchange a marked card into the decree and the player's Fox can later take that decree into
 * hand, so a marked card can be played by either side within one hand. Testing the trick survives
 * that path with no special case.
 */
export function trickIsPrimed(
  primedCards: readonly Card[],
  trick: readonly TrickCard[],
): boolean {
  return trick.some((play) => isPrimed(primedCards, play.card))
}

/**
 * AC2 — the mark.
 *
 * THROWS rather than returning the state unchanged, the discipline `cheats.ts`'s `addCheat` sets
 * and for its reason: a silent no-op would let the caller spend a charge for a mark that was never
 * made. The reducer guards BOTH conditions before calling — a reducer must not throw, because a
 * throw during an event handler unmounts the tree — so reaching either throw is a driver bug.
 */
export function primeCard(state: RoundState, side: PlayerSide, card: Card): RoundState {
  if (!containsCard(state.hands[side], card)) {
    throw new RangeError(
      `Cannot poison the ${card.rank} of ${card.suit} — it is not in the ${side}'s hand`,
    )
  }
  if (isPrimed(state.primedCards, card)) {
    throw new RangeError(`The ${card.rank} of ${card.suit} is already poisoned`)
  }
  return { ...state, primedCards: [...state.primedCards, card] }
}
