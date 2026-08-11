import { cardBaseValue, HuntDeclaration, invertedCardValue, type Spoils } from '../hunt'
import { CardRank, PlayerSide, type Card, type PlayerSide as Side, type RoundState } from './types'

/** Treasure (7) adds 1 and Poison (8) subtracts 1 for whoever the card scores for
 *  (fox-in-the-forest.md -> Poison cards; §1's component table). Shared by both branches:
 *  a credited trick is a Spoils event, so the same adjustment applies (DLR-63 plan.md
 *  -> Assumptions). */
function sumCards(cards: readonly Card[], value: (rank: number) => number): Spoils {
  return cards.reduce((total, card) => {
    const adjustment = card.rank === CardRank.Treasure ? 1 : card.rank === CardRank.Poison ? -1 : 0
    return total + value(card.rank) + adjustment
  }, 0)
}

/**
 * The Treasure/Poison-adjusted worth of a set of credited cards, at inverted values (AC3).
 * The single source of truth for "what a claimed trick is worth" — `spoils`'s Lose branch
 * and `TrickWell`'s claim-worth preview both call this rather than each summing cards with
 * their own copy of the ±1 fold, so the previewed number and the credited number can never
 * diverge (DLR-63 review fix).
 */
export function creditedTrickWorth(
  cards: readonly Card[],
  inverted: (rank: number) => number = invertedCardValue,
): Spoils {
  return sumCards(cards, inverted)
}

/**
 * §1's additive term, in two branches (DLR-63).
 *
 * **Lose declared, player side:** the cards credited from lost tricks, at their inverted
 * values (AC3). The capture pile is deliberately not read — the Quarry took those tricks.
 *
 * **Every other case** — undeclared, Win declared, or the Quarry's own side — is the
 * pre-DLR-63 behaviour byte for byte: the capture pile at base value. That equivalence is
 * what makes AC2 provable by the existing suite, none of whose fixtures declare.
 *
 * `cardValue`/`inverted` default to the live config and are overridable only for tests,
 * mirroring `resolveStanding`'s injectable-table pattern in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: Side,
  cardValue: (rank: number) => number = cardBaseValue,
  inverted: (rank: number) => number = invertedCardValue,
): Spoils {
  const declaration = state.declaration
  if (declaration?.path === HuntDeclaration.Lose && side === PlayerSide.Player) {
    return sumCards(declaration.creditedCards, inverted)
  }
  return sumCards(state.capturedCards[side], cardValue)
}
