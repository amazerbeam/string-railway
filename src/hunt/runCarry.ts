// DLR-158 Phase 1 — split out of `runTransitions.ts` once that file crossed the 400-line blocking
// budget (`CLAUDE.md`, `react-frontend`). This module owns the fight-boundary CARRY helpers — the
// five functions that answer "what survives the end of a fight". A pure move: no expression below
// differs from what `runTransitions.ts` held before this split, except that `handOfFightAfter` and
// `flaskAfter` take the figures they read rather than the whole `RunState`, so this module does not
// import `run.ts` and no import cycle is created. `healedBy` deliberately stays in
// `runTransitions.ts` — it is the health writer two transitions in that file call, and DLR-158's new
// full-restore helper belongs beside it.

import { OpponentKind, FLASK_STARTING_CHARGES, runEncounterAt } from './config'
import { EMPTY_BUFF_CARRY, type BuffCarry } from './buffAccrual'
import { isEncounterResolved } from './encounter'
import type { EncounterState } from './types'
import type { StreakState } from '../warCouncil'

/** AC2 — "a Guard does not outlive the fight it was bought for", a named function rather than an
 *  inline ternary: a second transition adopting a hand's end state is exactly the kind of thing
 *  that gets added without remembering to clear this, and a named rule is what a reviewer finds. */
export function guardAfter(encounter: EncounterState, held: boolean): boolean {
  return isEncounterResolved(encounter) ? false : held
}

/** AC4 — ONE statement of "a carry does not outlive the fight that earned it". A named function
 *  rather than an inline ternary, exactly as `guardAfter` immediately above is and for its
 *  reason: a second transition adopting a hand's end state is what gets added without
 *  remembering this rule, and a named rule is what a reviewer finds. */
export function lowCarryAfter(encounter: EncounterState, carry: BuffCarry): BuffCarry {
  return isEncounterResolved(encounter) ? EMPTY_BUFF_CARRY : carry
}

/** DLR-156 AC9 — "a streak does not outlive the fight that earned it", mirroring
 *  `lowCarryAfter` immediately above. Literal below, not an imported `EMPTY_STREAK` — see
 *  `startRun`'s note on the runtime-cycle reason. */
export function streakAfter(encounter: EncounterState, streak: StreakState): StreakState {
  return isEncounterResolved(encounter) ? { total: 0, roll: 0 } : streak
}

/**
 * DLR-95 AC3 — "a fight that continues moves on to its next hand; a fight that ended stays on
 * the hand it ended in, and `advanceRun` is what resets it" — a named function, following
 * `guardAfter` and `lowCarryAfter` above and for their reason.
 *
 * Holding the counter still on the deciding hand — rather than incrementing past it — is what
 * lets the verdict and any later reader say which hand the kill landed in.
 */
export function handOfFightAfter(handOfFight: number, encounter: EncounterState): number {
  return isEncounterResolved(encounter) ? handOfFight : handOfFight + 1
}

/**
 * DLR-93 AC5 — "a stage-boss kill refills the flask; an ordinary kill does not", a named function
 * following `guardAfter`'s precedent above and for its reason.
 *
 * `encounterIndex` is the encounter just FOUGHT — `advanceRun` has not run yet — so
 * `runEncounterAt` on it names the opponent just beaten. Refills to `FLASK_STARTING_CHARGES`
 * rather than a literal `1` so the run's full-flask figure is stated exactly once. Lives here
 * rather than in `advanceRun` because `advanceRun` never runs for the final fight of a won run,
 * and Diarmuid — the last boss — is exactly that fight.
 */
export function flaskAfter(
  encounterIndex: number,
  flaskCharges: number,
  wonThisEncounter: boolean,
): number {
  const beatABoss = wonThisEncounter && runEncounterAt(encounterIndex).kind === OpponentKind.Boss
  return beatABoss ? FLASK_STARTING_CHARGES : flaskCharges
}
