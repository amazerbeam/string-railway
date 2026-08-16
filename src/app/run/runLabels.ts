import { RunOutcome, type Coins, type Health } from '../../hunt'

/**
 * Every user-visible string on the run verdict, and the run's own progress readout.
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `warCouncil/labels.ts` marks
 * its own. It deliberately names NO Quarry: at DLR-82 one character is configured for the whole
 * run, so a name here would print identically on every fight. DLR-85 lands the roster and updates
 * this file in the same change (see that ticket's Dependencies & Risks).
 */

/** AC6 — 0-based index in, 1-based fight number out. */
export function runProgressText(encounterIndex: number, encounterCount: number): string {
  return `Fight ${encounterIndex + 1} of ${encounterCount}`
}

/**
 * AC5 — the verdict's headline. `InProgress` reaching here means the Quarry is down and another
 * fight remains; the panel only renders once an encounter has resolved, so it is the
 * intermediate-win case rather than a live fight.
 */
export function runHeadline(outcome: RunOutcome): string {
  switch (outcome) {
    case RunOutcome.Won:
      return 'YOU WIN'
    case RunOutcome.Lost:
      return 'YOU LOSE'
    case RunOutcome.InProgress:
      return 'FIGHT WON'
  }
}

/** The supporting line under the headline: where the run stands, and what is carried. */
export function runVerdictDetail(
  outcome: RunOutcome,
  encounterIndex: number,
  encounterCount: number,
  carriedHealth: Health,
): string {
  switch (outcome) {
    case RunOutcome.Won:
      return `Every Quarry is down. You took all ${encounterCount} fights and finished on ${carriedHealth} health.`
    case RunOutcome.Lost:
      return `You went down on fight ${encounterIndex + 1} of ${encounterCount}. The run ends here.`
    case RunOutcome.InProgress:
      return `The Quarry is down. ${runProgressText(encounterIndex + 1, encounterCount)} is waiting, and you carry ${carriedHealth} health into it.`
  }
}

/** The tricks row's own sentence, for a reader who sees neither the bars nor their colour —
 *  `game-ux`: no state may depend on colour alone. */
export function tricksTakenText(taken: number, lost: number): string {
  return `${TRICKS_TAKEN_LABEL} — ${taken} of ${taken + lost}.`
}

export const TRICKS_TAKEN_LABEL = 'Tricks taken'
export const CARRIED_HEALTH_LABEL = 'Carried health'
export const NEXT_FIGHT_LABEL = 'Next fight'
export const NEW_RUN_LABEL = 'Start a new run'

/** The verdict's two forward controls (DLR-84, developer's gate decision 2026-08-16). The shop is
 *  OPT-IN: `Continue` goes to the fight, `Shop` goes to the shop. `NEXT_FIGHT_LABEL` above keeps
 *  its value and moves to the shop's own leave button, where it is literally true (AC9).
 *  ALL PLACEHOLDER COPY, exactly as this file's header states. */
export const CONTINUE_LABEL = 'Continue'
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
