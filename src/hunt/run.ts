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
  }
}

/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * Refuses a run that has already ended: recording onto a finished run would silently resurrect
 * it, and there is no legitimate caller — the driver stops handing hands to a finished run.
 *
 * `cheats` (DLR-83) is REQUIRED: the hand owns the Cheats for its lifetime and hands the
 * survivors back through `WarCouncilRoundResult`. A second transition the caller must remember
 * to make beside this one is the transition that eventually gets forgotten.
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
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
  if (item === ShopItem.Cheat) {
    return {
      ...paid,
      cheats: addCheat(run.cheats, { id: run.nextCheatId }),
      nextCheatId: run.nextCheatId + 1,
    }
  }
  return {
    ...paid,
    encounter: {
      ...run.encounter,
      health: {
        ...run.encounter.health,
        // THE clamp, and therefore also the single place overheal is discarded (AC4).
        [DuelSide.Player]: Math.min(
          maxPlayerHealth,
          run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED,
        ),
      },
    },
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
