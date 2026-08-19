import {
  COINS_PER_ENCOUNTER_WIN,
  HEAL_HEALTH_RESTORED,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  RUN_STARTING_CHEATS,
} from './config'
import { addCheat, grantCheats, type CheatCard, type CheatCardId } from './cheats'
import { isEncounterResolved, startEncounter } from './encounter'
import { priceOf, refusalFor, ShopItem, type ShopStock } from './shop'
import { DuelSide, type Coins, type EncounterState, type Health } from './types'

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
  /** AC3 — held Cheats, capped at `CHEAT_SLOT_COUNT` by `cheats.ts` and carried across every
   *  fight boundary. Run state, not hand state: `advanceRun` passes it through untouched. */
  readonly cheats: readonly CheatCard[]
  /** The next id to mint. Monotonic and never reused, so DLR-84's mid-run purchase cannot
   *  re-issue the id of a card already spent — which would collide as a React key. */
  readonly nextCheatId: CheatCardId
  /** AC2 — the run's purse. Starts at 0, credited by `recordEncounter` on a won encounter, spent
   *  by `buyFromShop`, and carried through `advanceRun` untouched by the spread. NEVER persisted:
   *  the ticket puts cross-run carry-over out of scope. */
  readonly coins: Coins
  /** DLR-90 AC2 — Envenom charges held, bought in the shop and carried across every fight by
   *  `advanceRun`'s spread. A COUNT, not a list of objects like `cheats`: unlike a Cheat, a charge
   *  has no identity to spend by name — the card it marks IS the identity, and it lives on
   *  `RoundState.envenomedCards`. No cap; the price is the limiter. NEVER persisted, exactly as
   *  `coins` above. */
  readonly envenomCharges: number
  /** DLR-91 AC2 — a bought-but-unspent Poison Guard. Run-level like `coins` rather than on
   *  `EncounterState`, and that placement is load-bearing: the shop is reachable only AFTER an
   *  encounter resolves and BEFORE `advanceRun` runs, and `advanceRun` re-seeds the encounter
   *  through `startEncounter` — so a flag on the encounter would be bought onto the finished fight
   *  and destroyed by the very transition that opens the fight it was bought for. Carried by
   *  `advanceRun`'s spread and cleared by `guardAfter` when that fight resolves, which is what
   *  makes "fight-long" a real duration. NEVER persisted, exactly as `coins` above. */
  readonly poisonGuardHeld: boolean
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
    cheats: grantCheats(RUN_STARTING_CHEATS, 1),
    nextCheatId: RUN_STARTING_CHEATS + 1,
    coins: 0,
    envenomCharges: 0,
    poisonGuardHeld: false,
  }
}

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
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
  poisonGuardHeld: boolean,
): RunState {
  if (run.outcome !== RunOutcome.InProgress) {
    throw new RangeError(
      `Cannot record an encounter onto a run already ${run.outcome} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  // AC1 — THE payout, here and nowhere else. `advanceRun` would never pay for the final fight of
  // a won run, and the driver is a component and must not hold the rule.
  const wonThisEncounter = encounter.winner === DuelSide.Player
  return {
    ...run,
    encounter,
    cheats,
    envenomCharges,
    poisonGuardHeld: guardAfter(encounter, poisonGuardHeld),
    coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN : run.coins,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
}

/** AC2 — the Quarry is down and there is another fight. One statement, so a screen offering the
 *  control and the transition performing it cannot disagree. */
export function canAdvanceRun(run: RunState): boolean {
  return run.outcome === RunOutcome.InProgress && run.encounter.winner === DuelSide.Player
}

/**
 * DLR-85 AC6/AC7 — how many encounters of the run are behind the player, as one integer.
 *
 * `encounterIndex` alone is WRONG: a won-but-not-yet-advanced run sits at index n with
 * `encounter.winner === Player`, so without the +1 the map marks the opponent just beaten
 * as the one about to be fought. One exported statement, beside `canAdvanceRun` and for the
 * same reason — the screen drawing the path and the transition advancing it must not each
 * do their own arithmetic.
 */
export function beatenCount(run: RunState): number {
  return run.encounterIndex + (run.encounter.winner === DuelSide.Player ? 1 : 0)
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

/** Projects a run into the four figures the shop's rules need, so no screen assembles a
 *  `ShopStock` by hand and gets one field wrong. */
export function shopStockFor(
  run: RunState,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): ShopStock {
  return {
    coins: run.coins,
    cheatCount: run.cheats.length,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth,
    poisonGuardHeld: run.poisonGuardHeld,
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
    case ShopItem.Heal:
      return {
        ...paid,
        encounter: {
          ...run.encounter,
          health: {
            ...run.encounter.health,
            // THE clamp, and therefore also the single place overheal is discarded (DLR-84 AC4).
            [DuelSide.Player]: Math.min(
              maxPlayerHealth,
              run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED,
            ),
          },
        },
      }
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
