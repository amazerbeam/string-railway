import type { Damage } from '../hunt'
import { cardsOfSuit, highestOfSuit, sameCard } from './cardUtils'
import { CardRank, type Card, type PlayerSide, type RoundState, type Suit } from './types'

/**
 * The Monarch follow set (`fox-in-the-forest.md` → Suit card reference, rank 11): the Swan of
 * `suit` then the highest card of `suit`, deduplicated when they are the same card. Empty when
 * `hand` holds none of `suit` — a caller reads empty as "unconstrained in that suit", never as
 * "no legal move". "Highest" is recomputed from `hand` at the moment of the follow, matching the
 * printed rule.
 *
 * This fires on **the led card's rank only**. There is no whole-hand version — see `legalMoves`.
 */
export function monarchFollowSet(hand: readonly Card[], suit: Suit): readonly Card[] {
  const suitCards = cardsOfSuit(hand, suit)
  if (suitCards.length === 0) {
    return []
  }
  const swan = suitCards.find((c) => c.rank === CardRank.Swan)
  const highest = highestOfSuit(hand, suit)
  const options = [swan, highest].filter((c): c is Card => c !== undefined)
  return options.filter((c, i) => options.findIndex((o) => sameCard(o, c)) === i)
}

/**
 * AC8 — the ONLY thing a Cheat lifts is the follow-suit narrowing. `legalMoves` reaches the
 * follow-suit branch only when the led card is NOT a Monarch, so the Monarch follow set is a
 * different branch and is untouched by construction rather than by a guard someone could delete.
 *
 * AC10 — an OPTIONS parameter rather than a field on `RoundState` deliberately: the Quarry's
 * call sites (`cpuPlayer.ts`, and `roundReducer`'s lead and follow advances) simply pass nothing,
 * so the Quarry cannot be handed a bypass without editing a line that has no reason to change.
 */
export interface LegalMoveOptions {
  readonly ignoreFollowSuit?: boolean
}

/**
 * What `playCard` needs beyond the legality question. EXTENDS `LegalMoveOptions` so the same object
 * still satisfies `legalMoves` with no second parameter to keep in step.
 *
 * The poison figures are handed IN rather than read: the pending queue lives on `EncounterState` in
 * `src/hunt/`, the bank rules live on `RoundState` here, and `src/hunt/` must never learn about
 * `RoundState` — `hunt/types.ts` documents that cycle. The reducer holds both and is the one place
 * they can meet.
 */
export interface PlayCardOptions extends LegalMoveOptions {
  readonly poisonToPlayer?: Damage
  readonly poisonToQuarry?: Damage
  readonly poisonGuarded?: boolean
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand. Handed IN for the reason this
   *  interface's docblock already gives: it is a run figure and `src/warCouncil/` must not learn
   *  `RunState`. Absent means 0, so the Quarry's own call sites stay untouched. */
  readonly bankClimbBonus?: number
}

/**
 * Every card `side` may legally play right now.
 *
 * The Quarry plays by exactly the player's rules — it has no character power and no rule-break
 * of any kind. DLR-81 deleted the round-long Monarch narrowing that used to apply to every lead
 * the Quarry made: it had never been a design decision, it made five follows out of five a
 * single-card non-choice in play, and character powers are deferred to a final-boss ticket. The
 * only Monarch narrowing left is the printed one below, which fires on the led card's rank and
 * applies identically to both sides.
 */
export function legalMoves(
  state: RoundState,
  side: PlayerSide,
  options?: LegalMoveOptions,
): readonly Card[] {
  const hand = state.hands[side]

  if (state.currentTrick.length === 0) {
    return hand
  }

  const led = state.currentTrick[0].card

  if (led.rank === CardRank.Monarch) {
    const monarchOptions = monarchFollowSet(hand, led.suit)
    return monarchOptions.length > 0 ? monarchOptions : hand
  }

  if (options?.ignoreFollowSuit) {
    return hand
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
