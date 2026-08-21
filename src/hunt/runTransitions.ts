// DLR-93 Phase 2.5 — split out of `run.ts` once that file crossed the 400-line blocking budget
// (`CLAUDE.md`, `react-frontend`). This module owns the run's TRANSITIONS — the functions that
// take a `RunState` and produce the next one: `advanceRun`, `recordEncounter`, `buyFromShop`,
// `drinkFlask`, and the private helpers only they use (`outcomeFor`, `guardAfter`, `healedBy`,
// `flaskAfter`). `run.ts` keeps the run's SHAPE — `RunState`, `startRun`, and the projections
// `shopStockFor` / `flaskStockFor` — and re-exports every name below so no existing importer
// (`src/hunt/index.ts`, the `run.*.test.ts` specs) needed to change. A pure move: no expression,
// name, or signature below differs from what `run.ts` held before this split.

import {
  COINS_PER_ENCOUNTER_WIN,
  FLASK_STARTING_CHARGES,
  HEAL_HEALTH_RESTORED,
  OpponentKind,
  PLAYER_START_HEALTH,
  runEncounterAt,
} from './config'
import { addCheat, type CheatCard } from './cheats'
import { isEncounterResolved, startEncounter } from './encounter'
import { flaskHealAmount, flaskRefusalFor } from './flask'
import { quickKillPayout } from './quickKill'
import { priceOf, refusalFor, ShopItem } from './shop'
import { DuelSide, type Coins, type EncounterState, type Health } from './types'
import { canAdvanceRun, flaskStockFor, RunOutcome, shopStockFor, type RunState } from './run'

/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * Refuses a run that has already ended: recording onto a finished run would silently resurrect
 * it, and there is no legitimate caller — the driver stops handing hands to a finished run.
 *
 * `cheats` (DLR-83) and `envenomCharges` (DLR-90 AC2) are both REQUIRED: the hand owns each for
 * its lifetime and hands the survivors back through `WarCouncilRoundResult`. A second transition
 * the caller must remember to make beside this one is the transition that eventually gets
 * forgotten.
 *
 * `poisonGuardHeld` (DLR-91 AC2/AC4) is REQUIRED for the same reason — the hand owns it for its
 * whole life and hands the survivor back through `WarCouncilRoundResult`. It is passed through
 * `guardAfter`, not adopted verbatim: the Guard does not outlive the fight it was bought for, and
 * this is the ONE transition that adopts a hand's end state, so it is the one place that rule can
 * be enforced.
 *
 * `flaskCharges` (DLR-93 AC5) is NOT a parameter: unlike `cheats`, `envenomCharges` and
 * `poisonGuardHeld`, a hand cannot spend or grant a flask charge (AC4 makes it a between-fights
 * action), so there is nothing for a hand to hand back. It is read off `run` and refilled by
 * `flaskAfter` when the opponent just beaten was a stage boss.
 *
 * `unplayedCards` (DLR-95 AC2) is REQUIRED, not defaulted, for the reason `cheats` and
 * `envenomCharges` above are: the compiler must enumerate every call site. A defaulted `null`
 * would pay 0 forever the first time a driver forgot to thread the figure through, and would do it
 * silently. `null` is the legitimate value for a hand that did not end the fight.
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
  poisonGuardHeld: boolean,
  unplayedCards: number | null,
): RunState {
  if (run.outcome !== RunOutcome.InProgress) {
    throw new RangeError(
      `Cannot record an encounter onto a run already ${run.outcome} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  // AC1 — THE payout, here and nowhere else. `advanceRun` would never pay for the final fight of
  // a won run, and the driver is a component and must not hold the rule.
  const wonThisEncounter = encounter.winner === DuelSide.Player
  // DLR-95 AC1 — ADDITIVE, settled by the developer 2026-08-20: a win pays the flat coin AND the
  // quick kill. The alternative reading (this payout REPLACING the flat coin) would make a
  // fourth-hand kill pay literally nothing for winning a fight, which is the outcome the taper is
  // explicitly designed to avoid. Do not "simplify" the sum below back into a replacement.
  //
  // `run.handOfFight` is the hand just PLAYED — `handOfFightAfter` has not run yet — so it is the
  // hand the kill landed in, which is the figure AC2 scales by.
  const quickKill: Coins =
    wonThisEncounter && unplayedCards !== null
      ? quickKillPayout({ unplayedCards, handOfFight: run.handOfFight })
      : 0
  return {
    ...run,
    encounter,
    cheats,
    envenomCharges,
    poisonGuardHeld: guardAfter(encounter, poisonGuardHeld),
    coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN + quickKill : run.coins,
    lastQuickKillPayout: quickKill,
    handOfFight: handOfFightAfter(run, encounter),
    flaskCharges: flaskAfter(run, wonThisEncounter),
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
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
    handOfFight: 1,
  }
}

/**
 * DLR-93 AC2/AC3/AC4 — the drink. Throws a `RangeError` naming the `FlaskRefusal` rather than
 * returning the run unchanged, exactly as `buyFromShop` does: a silent no-op is the "spent the
 * charge for nothing" failure this module already refuses to allow. Reaching that throw is a
 * driver bug, because the control is disabled whenever `flaskRefusalFor` is non-null.
 *
 * Throws separately, and with a different message, on an UNRESOLVED encounter. AC4 makes the flask
 * a between-fights action, gated by which `RunPhase` mounts the shop; reaching it mid-hand is a
 * driver bug rather than something to word for the player, so it gets `advanceRun`'s treatment
 * rather than a third reason code the screen would have to render.
 *
 * The restore goes through `healedBy`, which is the single writer that raises player health — AC2's
 * "reuse that clamp pattern rather than writing a second one".
 *
 * `maxPlayerHealth` is a defaulted parameter, matching `startEncounter`/`startRun`/`buyFromShop`'s
 * injectable pattern, so a spec varies the clamp without mutating module state.
 */
export function drinkFlask(run: RunState, maxPlayerHealth: Health = PLAYER_START_HEALTH): RunState {
  if (!isEncounterResolved(run.encounter)) {
    throw new RangeError(
      `Cannot drink the flask while fight ${run.encounterIndex + 1} of ${run.encounterCount} is not resolved: it is a between-fights action`,
    )
  }
  const refusal = flaskRefusalFor(flaskStockFor(run, maxPlayerHealth))
  if (refusal !== null) {
    throw new RangeError(
      `Cannot drink the flask — ${refusal} (holding ${run.flaskCharges} charges, ${run.encounter.health[DuelSide.Player]} of ${maxPlayerHealth} health)`,
    )
  }
  return {
    ...healedBy(run, flaskHealAmount(maxPlayerHealth), maxPlayerHealth),
    flaskCharges: run.flaskCharges - 1,
  }
}

/**
 * AC4/AC5/AC7 — the purchase. Throws a `RangeError` naming the `PurchaseRefusal` rather than
 * returning the run unchanged: a silent no-op is exactly the "took payment for nothing" failure
 * `cheats.ts`'s `addCheat` already refuses to allow. Reaching the throw is a driver bug, because
 * the control is disabled whenever `refusalFor` is non-null.
 *
 * The heal writes into `encounter.health[Player]` because that IS the carried figure — this
 * module's own docblock states a second copy beside it is the number that drifts, and
 * `advanceRun` seeds the next fight from it. It deliberately does NOT go through `applyDamage`,
 * which refuses a resolved encounter: a restore is not a damage event.
 *
 * `maxPlayerHealth` is a defaulted parameter, matching `startEncounter`/`startRun`'s injectable
 * pattern, so a spec varies the clamp without mutating module state.
 */
export function buyFromShop(
  run: RunState,
  item: ShopItem,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): RunState {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot buy against a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  const refusal = refusalFor(shopStockFor(run, maxPlayerHealth), item)
  if (refusal !== null) {
    throw new RangeError(
      `Cannot buy ${item} — ${refusal} (holding ${run.coins} coins, ${run.cheats.length} Cheats, ${run.encounter.health[DuelSide.Player]} of ${maxPlayerHealth} health)`,
    )
  }
  const paid = { ...run, coins: run.coins - priceOf(item) }
  // A `switch` with no `default`, so a FOURTH item is a compile error here rather than an item
  // that silently does whatever the last branch happened to do. That is not hypothetical: before
  // DLR-90 this function returned the heal unconditionally as its fallback, so adding Envenom
  // without this restructuring would have healed the player and type-checked cleanly.
  switch (item) {
    case ShopItem.Cheat:
      return {
        ...paid,
        cheats: addCheat(run.cheats, { id: run.nextCheatId }),
        nextCheatId: run.nextCheatId + 1,
      }
    case ShopItem.Envenom:
      return { ...paid, envenomCharges: run.envenomCharges + 1 }
    case ShopItem.PoisonGuard:
      return { ...paid, poisonGuardHeld: true }
    case ShopItem.Whetstone:
      return { ...paid, whetstones: run.whetstones + 1 }
    case ShopItem.Heal:
      // DLR-93 AC2 — the clamp moved to `healedBy` so the flask reuses it rather than writing a
      // second one. Byte-identical result for identical inputs; the paid Heal's behaviour is
      // unchanged.
      return healedBy(paid, HEAL_HEALTH_RESTORED, maxPlayerHealth)
  }
}

/**
 * AC4 before AC5, deliberately: the player being down ends the run wherever it happens, including
 * on the final fight. There is no longer a simultaneous case to rule on — D7 (2026-08-19) makes
 * `applyDamage` spare the player whenever the Quarry goes down, so a mutual kill is a player win.
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

/**
 * AC2 — ONE statement of "a Guard does not outlive the fight it was bought for".
 *
 * A named function rather than an inline ternary deliberately: `recordEncounter` is the only
 * transition that adopts a hand's end state today, but a second one is exactly the kind of thing
 * that gets added without remembering to clear this, and a named rule is what a reviewer finds.
 */
function guardAfter(encounter: EncounterState, held: boolean): boolean {
  return isEncounterResolved(encounter) ? false : held
}

/**
 * DLR-95 AC3 — ONE statement of "a fight that continues moves on to its next hand; a fight that
 * ended stays on the hand it ended in, and `advanceRun` is what resets it".
 *
 * A named function rather than an inline ternary, following `guardAfter` and `flaskAfter`
 * immediately above and for their reason: a second transition adopting a hand's end state is
 * exactly the kind of thing that gets added without remembering this rule, and a named rule is
 * what a reviewer finds.
 *
 * Holding the counter still on the deciding hand — rather than incrementing past it — is what lets
 * the verdict and any later reader say which hand the kill landed in.
 */
function handOfFightAfter(run: RunState, encounter: EncounterState): number {
  return isEncounterResolved(encounter) ? run.handOfFight : run.handOfFight + 1
}

/**
 * DLR-93 AC2 — THE single writer that raises player health, and therefore the single place
 * overheal is discarded (DLR-84 AC4). Read by `buyFromShop`'s Heal branch and by `drinkFlask`;
 * the two differ only in how much they restore, and neither owns the clamp.
 *
 * Writes into `encounter.health[Player]` because that IS the carried figure — this module's own
 * `RunState` docblock states a second copy beside it is the number that drifts, and `advanceRun`
 * seeds the next fight from it. Deliberately NOT through `applyDamage`, which refuses a resolved
 * encounter: a restore is not a damage event.
 */
function healedBy(run: RunState, restored: Health, maxPlayerHealth: Health): RunState {
  return {
    ...run,
    encounter: {
      ...run.encounter,
      health: {
        ...run.encounter.health,
        [DuelSide.Player]: Math.min(
          maxPlayerHealth,
          run.encounter.health[DuelSide.Player] + restored,
        ),
      },
    },
  }
}

/**
 * DLR-93 AC5 — ONE statement of "a stage-boss kill refills the flask; an ordinary kill does not".
 *
 * A named function rather than an inline ternary, following `guardAfter`'s precedent immediately
 * below: a second transition adopting a hand's end state is exactly the kind of thing that gets
 * added without remembering this rule, and a named rule is what a reviewer finds.
 *
 * `run.encounterIndex` is the encounter just FOUGHT — `advanceRun` has not run yet — so
 * `runEncounterAt` on it names the opponent just beaten. Refills to `FLASK_STARTING_CHARGES`
 * rather than a literal `1` so the run's full-flask figure is stated exactly once.
 *
 * Lives here rather than in `advanceRun` for `recordEncounter`'s own stated reason: `advanceRun`
 * never runs for the final fight of a won run, and Diarmuid — the last boss — is exactly that
 * fight.
 */
function flaskAfter(run: RunState, wonThisEncounter: boolean): number {
  const beatABoss =
    wonThisEncounter && runEncounterAt(run.encounterIndex).kind === OpponentKind.Boss
  return beatABoss ? FLASK_STARTING_CHARGES : run.flaskCharges
}
