import { PLAYER_START_HEALTH, QUARRY_ENCOUNTER_HEALTH } from './config'
import { isEncounterResolved, startEncounter } from './encounter'
import { DuelSide, type EncounterState, type Health } from './types'

/**
 * How a run has ended, or that it has not (DLR-82 AC4/AC5).
 *
 * `InProgress` covers BOTH "the fight is still being played" and "the fight is won and the next
 * one is waiting on the player" — the difference is `encounter.winner`, read through
 * `canAdvanceRun`, not a fourth outcome. One statement of "the run is over" means a screen and a
 * transition cannot disagree about it.
 */
export const RunOutcome = {
  InProgress: 'inProgress',
  Won: 'won',
  Lost: 'lost',
} as const
export type RunOutcome = (typeof RunOutcome)[keyof typeof RunOutcome]

/**
 * One run: a position in the configured encounter sequence, plus the encounter being fought at
 * that position.
 *
 * Holds NO separate player-health field. The carried figure is
 * `encounter.health[DuelSide.Player]`, and a second copy beside it is a number that drifts the
 * first time one is written without the other.
 */
export interface RunState {
  /** 0-based index into `QUARRY_ENCOUNTER_HEALTH`. */
  readonly encounterIndex: number
  /** `QUARRY_ENCOUNTER_HEALTH.length`, carried on the state so a renderer needs no config import. */
  readonly encounterCount: number
  readonly encounter: EncounterState
  readonly outcome: RunOutcome
}

/**
 * AC1 — a run at fight 0, both bars from configuration.
 *
 * `playerHealth` is a defaulted parameter rather than something this module closes over, matching
 * `startEncounter`'s own injectable pattern, so a spec varies it without mutating module state.
 * Its guard lives in `startEncounter`, which already refuses a non-positive or non-finite value.
 */
export function startRun(playerHealth: Health = PLAYER_START_HEALTH): RunState {
  return {
    encounterIndex: 0,
    encounterCount: QUARRY_ENCOUNTER_HEALTH.length,
    encounter: startEncounter(0, playerHealth),
    outcome: RunOutcome.InProgress,
  }
}

/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * Refuses a run that has already ended: recording onto a finished run would silently resurrect
 * it, and there is no legitimate caller — the driver stops handing hands to a finished run.
 */
export function recordEncounter(run: RunState, encounter: EncounterState): RunState {
  if (run.outcome !== RunOutcome.InProgress) {
    throw new RangeError(
      `Cannot record an encounter onto a run already ${run.outcome} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  return {
    ...run,
    encounter,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
}

/** AC2 — the Quarry is down and there is another fight. One statement, so a screen offering the
 *  control and the transition performing it cannot disagree. */
export function canAdvanceRun(run: RunState): boolean {
  return run.outcome === RunOutcome.InProgress && run.encounter.winner === DuelSide.Player
}

/**
 * AC3 — the next fight, opened on the health the player carried out of the last one. Nothing is
 * restored: `ENCOUNTER_PLAYER_RESTORE` is deliberately NOT read here, per DLR-82.
 *
 * Throws rather than returning the run unchanged — an un-advanceable run returned as-is would
 * present a stuck screen as a success and leave nothing in the console to find it by.
 */
export function advanceRun(run: RunState): RunState {
  if (!canAdvanceRun(run)) {
    throw new RangeError(
      `Cannot advance a run that is ${run.outcome} with the encounter won by ${run.encounter.winner ?? 'nobody yet'} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  const encounterIndex = run.encounterIndex + 1
  return {
    ...run,
    encounterIndex,
    encounter: startEncounter(encounterIndex, run.encounter.health[DuelSide.Player]),
    outcome: RunOutcome.InProgress,
  }
}

/**
 * AC4 before AC5, deliberately: the player being down ends the run wherever it happens, including
 * on the final fight, and including the simultaneous-depletion tie that `applyDamage` has already
 * resolved to the Quarry via `SIMULTANEOUS_DEPLETION_WINNER`.
 */
function outcomeFor(
  encounterIndex: number,
  encounterCount: number,
  encounter: EncounterState,
): RunOutcome {
  if (!isEncounterResolved(encounter)) return RunOutcome.InProgress
  if (encounter.winner === DuelSide.Quarry) return RunOutcome.Lost
  return encounterIndex === encounterCount - 1 ? RunOutcome.Won : RunOutcome.InProgress
}
