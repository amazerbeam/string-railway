// DLR-93 Phase 2.5 — split from a single `run.ts` once that file crossed the 400-line blocking
// budget (`CLAUDE.md`, `react-frontend`). This module owns the run's SHAPE — `RunState`,
// `startRun`, and the projections `shopStockFor` / `flaskStockFor` — plus the small pure
// queries (`canAdvanceRun`, `beatenCount`, `baseDamageBonusFor`) that read a `RunState` without
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
import { BuffTier, type Buff, type BuffId } from './buffs'
import { EMPTY_BUFF_CARRY, type BuffCarry } from './buffAccrual'
import { cheatBuff } from './buffCatalog'
import { ALL_BRONZE, type RankTierTable } from './rankTiers'
import { mintGrants, type TemplateGrant } from './buffTemplates'
import { startEncounter } from './encounter'
import { startingBuffPileFor } from './startingPile'
import type { FlaskStock } from './flask'
import type { ShopStock } from './shop'
import type { SlotVisitStock } from './slotMachine'
import { DuelSide, type Coins, type EncounterState, type Health } from './types'
// DLR-156 AC8/AC9 — TYPE-ONLY, erased under `verbatimModuleSyntax`. `src/warCouncil/**` imports
// FROM `src/hunt/**` at runtime (see `streak.ts`), never the reverse; importing `StreakState` as
// a value here would open a real circular runtime import. A type-only import has no such cost —
// it disappears at compile time — so the streak's SHAPE stays single-sourced in `streak.ts`
// without hunt learning anything about the card layer at runtime.
import type { StreakState } from '../warCouncil'

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
  /** AC2 — the run's purse. Starts at 0, credited by `recordEncounter` on a won encounter, spent
   *  by `buyFromShop`, and carried through `advanceRun` untouched by the spread. NEVER persisted:
   *  the ticket puts cross-run carry-over out of scope. */
  readonly coins: Coins
  /** DLR-92 AC2/AC3 — Whetstones owned. A COUNT, not a flag: each copy stacks, and the price is
   *  the only limiter. Run-level like `coins` rather than on `EncounterState`, and carried by
   *  `advanceRun`'s and `recordEncounter`'s spread — a run-permanent buff that reset at a fight
   *  boundary would be a fight-long one. Unlike `discardsRemaining` it is NEVER handed back by a
   *  hand, because a hand cannot spend one. NEVER persisted, exactly
   *  as `coins` above. */
  readonly whetstones: number
  /** DLR-158 AC3 — the run's LIVE maximum health, raised by `ShopItem.MaxHealth`. Was
   *  `PLAYER_START_HEALTH`, a module constant threaded through four defaulted parameters, which
   *  meant the health bar's denominator, the flask's percentage heal and Heal's at-full-health
   *  refusal were all pinned to the figure the run opened on. Run-permanent like `whetstones`
   *  and carried by `advanceRun`'s and `recordEncounter`'s spreads. NEVER persisted, exactly as
   *  `coins` above. */
  readonly maxPlayerHealth: Health
  /** DLR-158 AC4 — max-health copies bought this run. A COUNT, not a flag: each stacks and the
   *  climbing price is the only limiter (AC6), exactly as `whetstones` and `apCapacityBonus`
   *  stack. `maxHealthPriceFor` owns the arithmetic, so the growth step is stated once. NEVER
   *  persisted, exactly as `coins` above. */
  readonly maxHealthPurchases: number
  /** DLR-93 AC1 — flask charges held. A COUNT, not a boolean: AC5 refills
   *  "regardless of whether the player had 0 or 1", and the epic's deferred re-tune of the charge
   *  count raises the ceiling without changing this type. Run-level like `coins` and carried by
   *  `advanceRun`'s and `recordEncounter`'s spreads — a free heal that reset at a fight boundary
   *  would be a per-fight heal. Unlike `discardsRemaining` it is NEVER handed back by a
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
  /** DLR-100 AC5 — the discard's per-fight budget. Carried across every hand within a fight —
   *  NOT on `EncounterState`, which `advanceRun`
   *  re-seeds. Reset to `DISCARDS_PER_FIGHT` by `startRun` and by `advanceRun`; carried through
   *  `recordEncounter`'s spread otherwise, because the hand owns it for its life and hands the
   *  survivor back through `WarCouncilRoundResult`.
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
   *  `whetstones`, because no consumer in this ticket spends or replaces a
   *  buff mid-hand (that is T5's job). NEVER persisted across runs, exactly as `coins` is not. */
  readonly buffs: readonly Buff[]
  /** The next id to mint — monotonic, never reused. */
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
  /** DLR-122 AC2 — where every tierable rank stands for THIS run. Run-permanent like `whetstones`
   *  rather than on `EncounterState`, and carried by `advanceRun`'s and `recordEncounter`'s
   *  spreads: a bought tier that reset at a fight boundary would be a fight-long asset, not a
   *  run-permanent one. Unlike `discardsRemaining` it is NEVER
   *  handed back by a hand, because a hand cannot buy or spend a tier — only the shop between
   *  fights can. A TABLE rather than a count, and that is the point: unlike `whetstones` and
   *  `apCapacityBonus`, which stack, a rank is a RUNG and `steppedTo` refuses a third step.
   *  NEVER persisted, exactly as `coins` above. */
  readonly rankTiers: RankTierTable
  /** DLR-150 AC3/AC4 — the Feeder carry, carried across every hand WITHIN a fight and wiped at
   *  the fight boundary, exactly as `discardsRemaining` is. The hand owns it for its life and hands
   *  the survivor back through `WarCouncilRoundResult`. NEVER persisted, exactly as `coins`. */
  readonly feederCarry: BuffCarry
  /** DLR-156 AC8/AC9 — the streak carried between the HANDS of one fight. Lives on the run
   *  rather than on `EncounterState` for `feederCarry`'s stated reason: the card layer owns it
   *  for the life of a hand and hands it back, and the run is what survives between hands.
   *  Wiped at the fight boundary by `streakAfter`. NEVER persisted, exactly as `coins` above. */
  readonly streak: StreakState
}

/**
 * AC1 — a run at fight 0, both bars from configuration.
 *
 * `playerHealth` is a defaulted parameter rather than something this module closes over, matching
 * `startEncounter`'s own injectable pattern, so a spec varies it without mutating module state.
 * Its guard lives in `startEncounter`, which already refuses a non-positive or non-finite value.
 *
 * DLR-158 — `playerHealth` now seeds BOTH the opening health and the opening ceiling
 * (`maxPlayerHealth`): a run that starts hurt is not a thing the game has, and one parameter that
 * means "how big is your bar" is fewer moving parts than two that can disagree.
 *
 * `grants` (DLR-113 AC3) is the Vault's bought starting cards, minted into the opening pile
 * alongside the four real bronze cards the run's seed draws. DEFAULTED to `[]`, so every
 * existing call site is unchanged and a run started with no Vault behaves exactly as before.
 */
export function startRun(
  playerHealth: Health = PLAYER_START_HEALTH,
  grants: readonly TemplateGrant[] = [],
  runSeed: number = 1,
): RunState {
  const granted = mintGrants(grants, STARTING_BUFF_COUNT + 1)
  // DLR-132 — the opening Cheat is a PILE MEMBER now, not a rail card. Ids stay consecutive with
  // the seeded placeholders and the Vault's grants, so `nextBuffId` below is still the one true
  // next id regardless of how many of either this run happens to have.
  const openingCheats = Array.from({ length: RUN_STARTING_CHEATS }, (_, i) =>
    cheatBuff(BuffTier.Bronze, STARTING_BUFF_COUNT + 1 + granted.length + i),
  )
  return {
    encounterIndex: 0,
    encounterCount: QUARRY_ENCOUNTER_HEALTH.length,
    encounter: startEncounter(0, playerHealth),
    outcome: RunOutcome.InProgress,
    coins: 0,
    whetstones: 0,
    maxPlayerHealth: playerHealth,
    maxHealthPurchases: 0,
    flaskCharges: FLASK_STARTING_CHARGES,
    handOfFight: 1,
    discardsRemaining: DISCARDS_PER_FIGHT,
    lastQuickKillPayout: 0,
    buffs: [...startingBuffPileFor(STARTING_BUFF_COUNT, 1, runSeed), ...granted, ...openingCheats],
    nextBuffId: STARTING_BUFF_COUNT + 1 + granted.length + openingCheats.length,
    runSeed,
    apCapacityBonus: 0,
    slotPullsThisVisit: 0,
    // DLR-122 AC1 — every rank at bronze, which IS the ability printed today, so a run that buys
    // nothing plays exactly as it plays now.
    rankTiers: ALL_BRONZE,
    feederCarry: EMPTY_BUFF_CARRY,
    // DLR-156 AC8 — a literal, not the imported `EMPTY_STREAK`: that constant is a VALUE export
    // of `src/warCouncil/streak.ts`, and importing it here would be the runtime circular import
    // the type-only import above avoids. The shape is trivial and structural, not a tunable.
    streak: { total: 0, roll: 0 },
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

/** Projects a run into the figures the shop's rules need, so no screen assembles a `ShopStock`
 *  by hand and gets one field wrong. DLR-158 — `maxPlayerHealth` is READ off the run, not passed
 *  in: the ceiling is run state now, so there is no argument left to get wrong. */
export function shopStockFor(run: RunState): ShopStock {
  return {
    coins: run.coins,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth: run.maxPlayerHealth,
    rankTiers: run.rankTiers,
    maxHealthPurchases: run.maxHealthPurchases,
  }
}

/** DLR-93 — projects a run into the figures the flask's rules need, the sibling of `shopStockFor`
 *  and for the same reason: no screen assembles a `FlaskStock` by hand and gets one field wrong.
 *  DLR-158 — `maxPlayerHealth` is READ off the run, not passed in, for `shopStockFor`'s reason. */
export function flaskStockFor(run: RunState): FlaskStock {
  return {
    charges: run.flaskCharges,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth: run.maxPlayerHealth,
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
export function baseDamageBonusFor(run: RunState): number {
  return run.whetstones
}

/**
 * DLR-122 AC2/AC3 — THE statement of "the bought ladder the PLAYER's cards resolve at". The
 * sibling of `baseDamageBonusFor` above and for its stated reason: `App` reads this and hands the
 * RESULT to the card layer as a plain value, which is what keeps `src/warCouncil/` free of
 * `RunState`.
 *
 * The name carries AC3's asymmetry in the identifier itself — there is no Quarry counterpart to
 * reach for by mistake, and `src/warCouncil/rankTierRules.ts` refuses a non-player side before it
 * reads the table at all.
 */
export function playerRankTiersFor(run: RunState): RankTierTable {
  return run.rankTiers
}

// The run's TRANSITIONS live in ./runTransitions (DLR-93 Phase 2.5) and are re-exported here so
// every existing importer of `./run` keeps working unchanged.
export { advanceRun, recordEncounter, buyFromShop, drinkFlask } from './runTransitions'
