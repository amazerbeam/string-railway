import {
  cardValueFor,
  resolveStanding,
  standingTableFor,
  type Damage,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import { declaredPath, type PlayerSide, type RoundState } from './types'

/** One side's finished Hunt — every field derived once from a final `RoundState`, never
 *  accumulated per trick. Renamed from `HuntScore` on DLR-67: the product is damage to the
 *  other side, not a score checked against a target. DLR-68 renames `spoils` to `cardValue`
 *  and folds both sides into one `huntDamage(finalState)` entry point. */
export interface HuntDamage {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly damage: Damage
}

/**
 * Computes §1's equation once for `side`, from `state`'s already-final `tricksWon` /
 * `capturedCards`.
 *
 * Both terms default off the state's OWN declaration via `declaredPath` — they defaulted to
 * the Win table and base card value until DLR-67, which was correct only while the Demand
 * made the player's side the only one scored. They stay injectable so a test can hold one axis
 * flat while varying the other, mirroring `resolveStanding`'s pattern in src/hunt/config.ts.
 */
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardValueFor(declaredPath(state)),
  standingTable: readonly StandingBand[] = standingTableFor(declaredPath(state)),
): HuntDamage {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, cardValue)
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    damage: spoilsValue * band.multiplier,
  }
}
