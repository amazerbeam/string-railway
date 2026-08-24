// DLR-93 Phase 2.5 — split from a single `run.ts` once that file crossed the 400-line blocking
// budget (`CLAUDE.md`, `react-frontend`). This module owns the run's SHAPE — `RunState`,
// `startRun`, and the projections `shopStockFor` / `flaskStockFor` — plus the small pure
// queries (`canAdvanceRun`, `beatenCount`, `bankClimbBonusFor`) that read a `RunState` without
// producing a new one. The run's TRANSITIONS — `advanceRun`, `recordEncounter`, `buyFromShop`,
// `drinkFlask` and their private helpers — live in `./runTransitions` and are re-exported below
// so every existing importer (`src/hunt/index.ts`, the `run.*.test.ts` specs) needed no change.

import {
  DISCARDS_PER_FIGHT,
  FLASK_STARTING_CHARGES,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  RUN_STARTING_CHEATS,
  STARTING_BUFF_COUNT,
} from './config'
import { seedStartingBuffPile, type Buff, type BuffId } from './buffs'
import { mintGrants, type TemplateGrant } from './buffTemplates'
import { grantCheats, type CheatCard, type CheatCardId } from './cheats'
import { startEncounter } from './encounter'
import type { FlaskStock } from './flask'
import type { ShopStock } from './shop'
import type { SlotVisitStock } from './slotMachine'
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
  /** DLR-90 AC2 — Timebomb charges held, bought in the shop and carried across every fight by
   *  `advanceRun`'s spread. A COUNT, not a list of objects like `cheats`: unlike a Cheat, a charge
   *  has no identity to spend by name — the card it marks IS the identity, and it lives on
   *  `RoundState.primedCards`. No cap; the price is the limiter. NEVER persisted, exactly as
   *  `coins` above. */
  readonly timebombCharges: number
  /** DLR-91 AC2 — a bought-but-unspent Blast Guard. Run-level like `coins` rather than on
   *  `EncounterState`, and that placement is load-bearing: the shop is reachable only AFTER an
   *  encounter resolves and BEFORE `advanceRun` runs, and `advanceRun` re-seeds the encounter
   *  through `startEncounter` — so a flag on the encounter would be bought onto the finished fight
   *  and destroyed by the very transition that opens the fight it was bought for. Carried by
   *  `advanceRun`'s spread and cleared by `guardAfter` when that fight resolves, which is what
   *  makes "fight-long" a real duration. NEVER persisted, exactly as `coins` above. */
  readonly blastGuardHeld: boolean
  /** DLR-92 AC2/AC3 — Whetstones owned. A COUNT, not a flag: each copy stacks, and the price is
   *  the only limiter. Run-level like `coins` rather than on `EncounterState`, and carried by
   *  `advanceRun`'s and `recordEncounter`'s spread — a run-permanent buff that reset at a fight
   *  boundary would be a fight-long one. Unlike `cheats`, `timebombCharges` and `blastGuardHeld`
   *  it is NEVER handed back by a hand, because a hand cannot spend one. NEVER persisted, exactly
   *  as `coins` above. */
  readonly whetstones: number
  /** DLR-93 AC1 — flask charges held. A COUNT like `timebombCharges`, not a boolean: AC5 refills
   *  "regardless of whether the player had 0 or 1", and the epic's deferred re-tune of the charge
   *  count raises the ceiling without changing this type. Run-level like `coins` and carried by
   *  `advanceRun`'s and `recordEncounter`'s spreads — a free heal that reset at a fight boundary
   *  would be a per-fight heal. Unlike `cheats` and `timebombCharges` it is NEVER handed back by a
   *  hand, because a hand cannot drink it (AC4). NEVER persisted, exactly as `coins` above. */
  readonly flaskCharges: number
  /** DLR-95 AC3 — which hand OF THE CURRENT FIGHT is being played. 1-BASED: a fight's first hand
   *  is 1.
   *
   *  DISTINCT from `App.tsx`'s `hand`, which AC3 forbids repurposing: that one is monotonic across
   *  the WHOLE run because it is React's remount `key` and feeds `dealerForRound`'s parity, so it
   *  can never reset. This one must reset at every fight boundary and answers a different
   *  question.
   *
   *  Lives on the run rather than in the driver because AC3's requirement is a reset "whenever a
   *  new encounter starts", and `startRun`/`advanceRun` are exactly the two functions that start
   *  one — which makes the reset structural instead of something three separate callbacks have to
   *  remember. `recordEncounter` advances it. NEVER persisted, exactly as `coins` above. */
  readonly handOfFight: number
  /** DLR-100 AC5 — the discard's per-fight budget. Carried across every hand within a fight,
   *  exactly as `cheats` and `timebombCharges` are — NOT on `EncounterState`, which `advanceRun`
   *  re-seeds. Reset to `DISCARDS_PER_FIGHT` by `startRun` and by `advanceRun`; carried through
   *  `recordEncounter`'s spread otherwise, because the hand owns it for its life and hands the
   *  survivor back through `WarCouncilRoundResult`, exactly as `cheats` and `timebombCharges` do.
   *  NEVER persisted, exactly as `coins` above. */
  readonly discardsRemaining: number
  /** DLR-95 AC6 — the receipt: what the quick-kill payout paid for the encounter just recorded, so
   *  the verdict renders a figure the run RECORDED rather than re-deriving the rule from state a
   *  component would have to hold in parallel. `RunOutcomePanel` computes nothing, and this is
   *  what keeps that true.
   *
   *  Written on EVERY `recordEncounter`, `0` included — a field written only on a win is the field
   *  that shows the last fight's payout on this one's verdict. NEVER persisted, exactly as `coins`
   *  above. */
  readonly lastQuickKillPayout: Coins
  /** DLR-105 AC2/AC3 — the player's owned buff pile, seeded at `startRun` and carried through
   *  every `advanceRun`/`recordEncounter` spread untouched — no explicit parameter, mirroring
   *  `whetstones` rather than `cheats`, because no consumer in this ticket spends or replaces a
   *  buff mid-hand (that is T5's job). NEVER persisted across runs, exactly as `coins` is not. */
  readonly buffs: readonly Buff[]
  /** The next id to mint — monotonic, never reused, mirroring `nextCheatId`. */
  readonly nextBuffId: BuffId
  /** DLR-116 — the run's reproducibility anchor. Chosen by the DRIVER and passed in, never by
   *  this tree: `src/hunt/` may not call `Math.random()`. Every strip and spin in the run is
   *  recomputed from this seed, `slotSeedFor`/`spinSeedFor`, never stored. NEVER persisted,
   *  exactly as `coins` above. */
  readonly runSeed: number
  /** DLR-116 AC2 — action points bought this run, `AP_CAPACITY_STEP` per purchase. A COUNT of
   *  purchases, not a point total — `apCapacityFor` owns the multiplication. NEVER persisted,
   *  exactly as `coins` above. */
  readonly apCapacityBonus: number
  /** DLR-116 — pulls taken at THIS shop visit, feeding `pullPriceFor` and the spin seed. Reset by
   *  `advanceRun` at the fight boundary, exactly as `discardsRemaining` is. NEVER persisted,
   *  exactly as `coins` above. */
  readonly slotPullsThisVisit: number
}

/**
 * AC1 — a run at fight 0, both bars from configuration.
 *
 * `playerHealth` is a defaulted parameter rather than something this module closes over, matching
 * `startEncounter`'s own injectable pattern, so a spec varies it without mutating module state.
 * Its guard lives in `startEncounter`, which already refuses a non-positive or non-finite value.
 *
 * `grants` (DLR-113 AC3) is the Vault's bought starting cards, minted into the opening pile
 * alongside the seeded placeholders. DEFAULTED to `[]`, so every existing call site is
 * unchanged and a run started with no Vault behaves exactly as before.
 */
export function startRun(
  playerHealth: Health = PLAYER_START_HEALTH,
  grants: readonly TemplateGrant[] = [],
  runSeed: number = 1,
): RunState {
  const granted = mintGrants(grants, STARTING_BUFF_COUNT + 1)
  return {
    encounterIndex: 0,
    encounterCount: QUARRY_ENCOUNTER_HEALTH.length,
    encounter: startEncounter(0, playerHealth),
    outcome: RunOutcome.InProgress,
    cheats: grantCheats(RUN_STARTING_CHEATS, 1),
    nextCheatId: RUN_STARTING_CHEATS + 1,
    coins: 0,
    timebombCharges: 0,
    blastGuardHeld: false,
    whetstones: 0,
    flaskCharges: FLASK_STARTING_CHARGES,
    handOfFight: 1,
    discardsRemaining: DISCARDS_PER_FIGHT,
    lastQuickKillPayout: 0,
    buffs: [...seedStartingBuffPile(STARTING_BUFF_COUNT, 1), ...granted],
    nextBuffId: STARTING_BUFF_COUNT + 1 + granted.length,
    runSeed,
    apCapacityBonus: 0,
    slotPullsThisVisit: 0,
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
    blastGuardHeld: run.blastGuardHeld,
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

/** DLR-116 — projects a run into the two figures the pull-cost rule needs, the sibling of
 *  `shopStockFor` and `flaskStockFor` and for the same reason: no screen assembles a
 *  `SlotVisitStock` by hand and gets one field wrong. */
export function slotVisitStockFor(run: RunState): SlotVisitStock {
  return { coins: run.coins, pullsThisVisit: run.slotPullsThisVisit }
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
