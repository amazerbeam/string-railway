// DLR-93 Phase 2.5 — split from a single `run.ts` once that file crossed the 400-line blocking
// budget (`CLAUDE.md`, `react-frontend`). This module owns the run's SHAPE — `RunState`,
// `startRun`, and the projections `shopStockFor` / `flaskStockFor` — plus the small pure
// queries (`canAdvanceRun`, `beatenCount`, `bankClimbBonusFor`) that read a `RunState` without
// producing a new one. The run's TRANSITIONS — `advanceRun`, `recordEncounter`, `buyFromShop`,
// `drinkFlask` and their private helpers — live in `./runTransitions` and are re-exported below
// so every existing importer (`src/hunt/index.ts`, the `run.*.test.ts` specs) needed no change.

import {
  FLASK_STARTING_CHARGES,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  RUN_STARTING_CHEATS,
} from './config'
import { grantCheats, type CheatCard, type CheatCardId } from './cheats'
import { startEncounter } from './encounter'
import type { FlaskStock } from './flask'
import type { ShopStock } from './shop'
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
  /** DLR-92 AC2/AC3 — Whetstones owned. A COUNT, not a flag: each copy stacks, and the price is
   *  the only limiter. Run-level like `coins` rather than on `EncounterState`, and carried by
   *  `advanceRun`'s and `recordEncounter`'s spread — a run-permanent buff that reset at a fight
   *  boundary would be a fight-long one. Unlike `cheats`, `envenomCharges` and `poisonGuardHeld`
   *  it is NEVER handed back by a hand, because a hand cannot spend one. NEVER persisted, exactly
   *  as `coins` above. */
  readonly whetstones: number
  /** DLR-93 AC1 — flask charges held. A COUNT like `envenomCharges`, not a boolean: AC5 refills
   *  "regardless of whether the player had 0 or 1", and the epic's deferred re-tune of the charge
   *  count raises the ceiling without changing this type. Run-level like `coins` and carried by
   *  `advanceRun`'s and `recordEncounter`'s spreads — a free heal that reset at a fight boundary
   *  would be a per-fight heal. Unlike `cheats` and `envenomCharges` it is NEVER handed back by a
   *  hand, because a hand cannot drink it (AC4). NEVER persisted, exactly as `coins` above. */
  readonly flaskCharges: number
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
    whetstones: 0,
    flaskCharges: FLASK_STARTING_CHARGES,
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

/** DLR-93 — projects a run into the three figures the flask's rules need, the sibling of
 *  `shopStockFor` and for the same reason: no screen assembles a `FlaskStock` by hand and gets one
 *  field wrong. */
export function flaskStockFor(
  run: RunState,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): FlaskStock {
  return {
    charges: run.flaskCharges,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth,
  }
}

/**
 * DLR-92 AC2 — THE statement of "each Whetstone adds +1 to the bank's per-trick climb", so the
 * rule is stated once rather than at whichever wiring site happens to need it. `App` reads this
 * and hands the RESULT to the card layer as a plain number, which is what keeps `src/warCouncil/`
 * free of `RunState` (AC4). The multiplier-side twin named as future scope would contribute its
 * own figure through a sibling of this function, never by reinterpreting this one.
 */
export function bankClimbBonusFor(run: RunState): number {
  return run.whetstones
}

// The run's TRANSITIONS live in ./runTransitions (DLR-93 Phase 2.5) and are re-exported here so
// every existing importer of `./run` keeps working unchanged.
export { advanceRun, recordEncounter, buyFromShop, drinkFlask } from './runTransitions'
