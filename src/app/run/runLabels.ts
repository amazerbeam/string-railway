import { RunOutcome, type Coins, type Health } from '../../hunt'

/**
 * Every user-visible string on the run verdict, and the run's own progress readout.
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `warCouncil/labels.ts` marks
 * its own. DLR-85 landed the roster: the verdict headline, the continue-style controls, and the
 * felt's position readout now name the opponent they concern, everywhere one is known.
 */

/** AC6 — 0-based index in, 1-based fight number out. */
export function runProgressText(encounterIndex: number, encounterCount: number): string {
  return `Fight ${encounterIndex + 1} of ${encounterCount}`
}

/**
 * AC5 — the verdict's headline. `InProgress` reaching here means the Quarry is down and another
 * fight remains; the panel only renders once an encounter has resolved, so it is the
 * intermediate-win case rather than a live fight. Only the `InProgress` case names an opponent
 * (AC8 / the ticket's scope extension) — the two terminal cases are about the run, not one
 * opponent, and keep DLR-82's wording.
 */
export function runHeadline(outcome: RunOutcome, beatenName: string | undefined): string {
  switch (outcome) {
    case RunOutcome.Won:
      return 'YOU WIN'
    case RunOutcome.Lost:
      return 'YOU LOSE'
    case RunOutcome.InProgress:
      return beatenName === undefined ? 'FIGHT WON' : `${beatenName} defeated`
  }
}

/** The supporting line under the headline: where the run stands, and what is carried. */
export function runVerdictDetail(
  outcome: RunOutcome,
  encounterIndex: number,
  encounterCount: number,
  carriedHealth: Health,
  nextName: string | undefined,
): string {
  switch (outcome) {
    case RunOutcome.Won:
      return `Every Quarry is down. You took all ${encounterCount} fights and finished on ${carriedHealth} health.`
    case RunOutcome.Lost:
      return `You went down on fight ${encounterIndex + 1} of ${encounterCount}. The run ends here.`
    case RunOutcome.InProgress:
      return nextName === undefined
        ? `The Quarry is down. ${runProgressText(encounterIndex + 1, encounterCount)} is waiting, and you carry ${carriedHealth} health into it.`
        : `${runProgressText(encounterIndex + 1, encounterCount)} — ${nextName} — is waiting, and you carry ${carriedHealth} health into it.`
  }
}

/** AC8 — every continue-style control's label. ONE function, three call sites: the start
 *  screen's begin action, the verdict's primary control, and the shop's leave control. */
export function fightLabel(name: string): string {
  return `Fight ${name}`
}

/** AC5 — the run's goal, in words, from the configured length. Never a quoted number. */
export function runGoalText(total: number): string {
  return `Beat all ${total}`
}

/** The felt's status-band readout, now naming the opponent being fought (the ticket's
 *  explicit scope extension). Built ON runProgressText so the position is worded once. */
export function runPositionLabel(
  encounterIndex: number,
  encounterCount: number,
  name: string,
): string {
  return `${runProgressText(encounterIndex, encounterCount)} — ${name}`
}

/** PLACEHOLDER COPY, as this file's header states — all of it the developer's. */
export const START_TITLE = 'The Hunt'
export const MAP_TITLE = 'The path'
export const MAP_LABEL = 'Map'
export const MAP_BACK_LABEL = 'Back'

/** The tricks row's own sentence, for a reader who sees neither the bars nor their colour —
 *  `game-ux`: no state may depend on colour alone. */
export function tricksTakenText(taken: number, lost: number): string {
  return `${TRICKS_TAKEN_LABEL} — ${taken} of ${taken + lost}.`
}

/** The path list's accessible name (DLR-85). */
export const RUN_MAP_GROUP_LABEL = 'The run’s path'

export const TRICKS_TAKEN_LABEL = 'Tricks taken'
export const CARRIED_HEALTH_LABEL = 'Carried health'
export const NEXT_FIGHT_LABEL = 'Next fight'
export const NEW_RUN_LABEL = 'Start a new run'

/** The verdict's forward controls (DLR-84, developer's gate decision 2026-08-16). The shop is
 *  OPT-IN: the primary control goes to the fight, `Shop` goes to the shop. `NEXT_FIGHT_LABEL`
 *  above keeps its value and moves to the shop's own leave button, where it is literally true
 *  (AC9). The primary now reads `Fight <next>` (DLR-85, `fightLabel`), naming the opponent it
 *  leads to rather than the generic `Continue`.
 *  ALL PLACEHOLDER COPY, exactly as this file's header states. */
export const SHOP_LABEL = 'Shop'

/** The unspent-coin warning's own pair. Both must differ from the two above — a component test
 *  tells the warned verdict from the plain one by button name. */
export const VISIT_SHOP_LABEL = 'Visit the shop'
export const CONTINUE_ANYWAY_LABEL = 'Continue anyway'

/** The warning sentence. Takes the balance so it names what is being left behind; the driver
 *  decides WHETHER to warn (`canBuyAnything`), this only decides the words. */
export function unspentCoinsText(coins: Coins): string {
  return `You still have ${coins} coin${coins === 1 ? '' : 's'} to spend.`
}
