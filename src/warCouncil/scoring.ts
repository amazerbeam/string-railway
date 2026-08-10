import {
  cardBaseValue,
  resolveStanding,
  STANDING_BANDS,
  type Demand,
  type Score,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import type { PlayerSide, RoundState } from './types'

export function tricksToPoints(tricks: number): number {
  return resolveStanding(tricks).multiplier
}

export function scoreRound(
  tricksWon: Readonly<Record<PlayerSide, number>>,
): Record<PlayerSide, number> {
  return { player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }
}

/** One round's finished outcome — every field derived once from a final `RoundState` (§1, AC2). */
export interface HuntScore {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly score: Score
}

/**
 * Computes §1's equation once for `side`, from `state`'s already-final
 * `tricksWon`/`capturedCards` — never accumulated per trick. `cardValue` and
 * `standingTable` default to the live config (T2/T3) and exist so a test can
 * hold one axis flat while varying the other, mirroring `spoils`'s and
 * `resolveStanding`'s own injectable-parameter pattern.
 */
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardBaseValue,
  standingTable: readonly StandingBand[] = STANDING_BANDS,
): HuntScore {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, cardValue)
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    score: spoilsValue * band.multiplier,
  }
}

/** A closed result for comparing a computed score against the Demand — AC7's
 *  boundary default lives here: equal to the Demand clears it. */
export const DemandOutcome = {
  Cleared: 'cleared',
  Missed: 'missed',
} as const
export type DemandOutcome = (typeof DemandOutcome)[keyof typeof DemandOutcome]

/** §11: "pure arithmetic; no new game state beyond one number." Does not
 *  decide, store, or advance `demand` — that is T9's run state. */
export function checkDemand(score: Score, demand: Demand): DemandOutcome {
  return score >= demand ? DemandOutcome.Cleared : DemandOutcome.Missed
}
