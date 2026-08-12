import { cardValueSchemeFor, PaidPile, type CardValueScheme, type Spoils } from '../hunt'
import { declaredPath, otherSide, type PlayerSide, type RoundState } from './types'

/**
 * §1's additive term: the value of the one capture pile this side is paid for, under the scheme
 * the declaration puts in force. On Win that is the side's OWN pile at printed rank; on Lose it is
 * the OTHER side's pile at `12 − r` (hybrid-design.md lines 42-44 — "each pile is counted exactly
 * once, by the side that did not win it").
 *
 * That invariant needs no counter and no bookkeeping: it is a consequence of each side reading
 * exactly one pile and the two sides reading different ones. The discarded branch — both sides
 * counting the Quarry's pile — pays one pile out twice and flips the sign at `k = 0`, where a
 * player who declares Lose and wins zero tricks would finish 78 behind instead of 78 ahead
 * (hybrid-design.md lines 208-214).
 *
 * No modifier of any kind is applied: the Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11), and at ×5 a ±1 card modifier moved a Hunt by under 1% of the ceiling.
 *
 * `scheme` carries BOTH axes on purpose and defaults off the state's own declaration. Splitting
 * them into two parameters would let a caller inject the Lose value function while the pile
 * defaulted from an undeclared state — inverted values over the own pile, which is precisely the
 * DLR-67 interim this replaces. It stays injectable for tests, mirroring `resolveStanding`'s
 * table parameter in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: PlayerSide,
  scheme: CardValueScheme = cardValueSchemeFor(declaredPath(state)),
): Spoils {
  const paidFor = scheme.paidPile === PaidPile.Other ? otherSide(side) : side
  return state.capturedCards[paidFor].reduce((total, card) => total + scheme.value(card.rank), 0)
}
