import { cardValueFor, type Spoils } from '../hunt'
import { declaredPath, type PlayerSide, type RoundState } from './types'

/**
 * §1's additive term: the cards on a side's own side of the table, at the value scheme the
 * declaration puts in force — printed rank on Win, `12 − r` on Lose (DLR-66's `cardValueFor`).
 * No modifier of any kind is applied: the Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11), and at ×5 a ±1 card modifier moved a Hunt by under 1% of the ceiling.
 *
 * ONE branch, deliberately. DLR-63's Lose branch summed a capped pool of credited cards from
 * the Quarry's pile; DLR-67 retires that mechanic, and DLR-68's pile swap replaces this
 * own-pile reading with the uncapped two-way swap §1 specifies. **This is a chosen interim,
 * not an accident** — for one ticket both sides are simply paid for what they captured.
 *
 * `cardValue` defaults off the state's own declaration and is overridable only for tests,
 * mirroring `resolveStanding`'s injectable-table pattern in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardValueFor(declaredPath(state)),
): Spoils {
  return state.capturedCards[side].reduce((total, card) => total + cardValue(card.rank), 0)
}
