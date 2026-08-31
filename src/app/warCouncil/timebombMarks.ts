/**
 * Lifting a Timebomb's mark off `RoundState.primedCards` — the two ways a detonation retires the
 * card it marked, kept in their own module because `commitHandlers.ts`'s DLR-154 FIX B work pushed
 * it past its 400-line budget. Split out for the same reason `quarryAdvance.ts` (DLR-94) and
 * `discardHandlers.ts` (DLR-100) were: a self-contained pair of helpers `commit` calls and nothing
 * else needs to know about.
 */
import {
  containsCard,
  isPrimed,
  unprimeCard,
  type Card,
  type RoundState,
  type TrickCard,
} from '../../warCouncil'

/**
 * R3 — lifts the mark from any primed card whose fuse just expired, so the same card cannot
 * detonate twice. Guards each lift with `isPrimed` before calling `unprimeCard`, which THROWS on
 * a card that is not primed — a reducer must not throw during an event handler.
 */
export function liftExpiredMarks(
  round: RoundState,
  candidateCards: readonly Card[],
  nextHand: readonly Card[],
  fuseExpired: boolean,
): RoundState {
  if (!fuseExpired) return round
  const expiredCards = candidateCards.filter((card) => containsCard(nextHand, card))
  return expiredCards.reduce(
    (nextRound, card) =>
      isPrimed(nextRound.primedCards, card) ? unprimeCard(nextRound, card) : nextRound,
    round,
  )
}

/**
 * DLR-154 FIX B — lifts the mark from a primed card that just detonated by being PLAYED into a
 * trick, as opposed to `liftExpiredMarks`'s in-hand fuse expiry. The marked card has already left
 * the hand by the time this runs, so it cannot be found via `containsCard(nextHand, ...)`; it is
 * found instead among the trick's own two played cards, which `resolution.timebombTarget !==
 * null` says one of them is. Guarded with `isPrimed` for the same reason `liftExpiredMarks` is —
 * `unprimeCard` throws on a card that is not primed, and a reducer must not throw.
 */
export function liftDetonatedMark(round: RoundState, trickCards: readonly TrickCard[]): RoundState {
  return trickCards.reduce(
    (nextRound, played) =>
      isPrimed(nextRound.primedCards, played.card)
        ? unprimeCard(nextRound, played.card)
        : nextRound,
    round,
  )
}
