// DLR-93 Phase 2.5 — split out of `run.ts` once that file crossed the 400-line blocking budget
// (`CLAUDE.md`, `react-frontend`). This module owns the run's TRANSITIONS — the functions that
// take a `RunState` and produce the next one: `advanceRun`, `recordEncounter`, `buyFromShop`,
// `drinkFlask`, and the private helpers only they use (`outcomeFor`, `healedBy`). `run.ts` keeps
// the run's SHAPE — `RunState`, `startRun`, and the projections `shopStockFor` / `flaskStockFor` —
// and re-exports every name below so no existing importer (`src/hunt/index.ts`, the
// `run.*.test.ts` specs) needed to change. A pure move: no expression, name, or signature below
// differs from what `run.ts` held before this split.
//
// DLR-158 Phase 1 — the fight-boundary carry helpers (`guardAfter`, `feederCarryAfter`,
// `streakAfter`, `handOfFightAfter`, `flaskAfter`) moved out to `./runCarry`, a second pure move,
// to make room under the same 400-line budget for the max-health purchase. `healedBy` stayed here
// — it is the health writer two transitions in this file call.

import { COINS_PER_ENCOUNTER_WIN, DISCARDS_PER_FIGHT, HEAL_HEALTH_RESTORED } from './config'
import { BuffKind, BuffTier, type Buff } from './buffs'
import { type BuffCarry } from './buffAccrual'
import { cheatBuff } from './buffCatalog'
import { isEncounterResolved, startEncounter } from './encounter'
import { flaskHealAmount, flaskRefusalFor } from './flask'
import { quickKillPayout } from './quickKill'
import { priceOf, refusalFor, ShopItem, tieredRankOf } from './shop'
import { raisedMaxHealthFor } from './maxHealth'
import { steppedTo } from './rankTiers'
import { mintPullAwards, pullPriceFor, slotPullRefusalFor, type SlotPull } from './slotMachine'
import { DuelSide, type Coins, type EncounterState, type Health } from './types'
import {
  canAdvanceRun,
  flaskStockFor,
  RunOutcome,
  shopStockFor,
  slotVisitStockFor,
  type RunState,
} from './run'
import { feederCarryAfter, flaskAfter, handOfFightAfter, streakAfter } from './runCarry'
// DLR-156 — type-only, erased under `verbatimModuleSyntax` (see `run.ts`'s import).
import type { StreakState } from '../warCouncil'

/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * Refuses a run that has already ended: recording onto a finished run would silently resurrect
 * it, and there is no legitimate caller — the driver stops handing hands to a finished run.
 *
 * `flaskCharges` (DLR-93 AC5) is NOT a parameter: a hand cannot spend or
 * grant a flask charge (AC4 makes it a between-fights action), so there is nothing for a hand to
 * hand back. It is read off `run` and refilled by `flaskAfter` when the opponent just beaten was
 * a stage boss.
 *
 * `discardsRemaining` (DLR-100 AC5) is REQUIRED because the hand
 * owns it for its lifetime and hands the survivor back through `WarCouncilRoundResult`. Carried
 * through the returned spread unchanged — `advanceRun`, not this function, resets it at the fight
 * boundary.
 *
 * `unplayedCards` (DLR-95 AC2) is REQUIRED, not defaulted, for the same reason: the compiler must
 * enumerate every call site. A defaulted `null` would pay 0 forever the first time a driver
 * forgot to thread the figure through, and would do it silently. `null` is the legitimate value
 * for a hand that did not end the fight.
 *
 * DLR-132 — `cheats` was a REQUIRED parameter here; it is
 * deleted along with the `RunState` field it fed. A Cheat is a pile member now,
 * carried through `buffs` below like every other buff.
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  discardsRemaining: number,
  unplayedCards: number | null,
  /** DLR-125 — Purse coins this hand's fired buffs earned, already clipped at
   *  `MAX_COIN_BONUS_PER_HAND` by the accrual. OPTIONAL and defaulted to 0 so all 48 existing
   *  call sites are unchanged; `App.tsx` is the only caller that passes it. Added to the same
   *  sum the win payout and the quick kill already feed, never as a second coin path. */
  buffCoinsEarned: Coins = 0,
  /** DLR-126 — the owned buff pile after this hand, one fewer for each CONSUMABLE ITEM spent.
   *  OPTIONAL and defaulted to `undefined` — which keeps `run.buffs` — so all 52 existing call
   *  sites are unchanged; `App.tsx` is the only caller that passes it. `nextBuffId` is
   *  DELIBERATELY untouched: ids are minted forward-only, and reissuing a spent card's id would
   *  make two different cards indistinguishable to `activatedThisTrick` and `firedThisHand`. */
  buffs?: readonly Buff[],
  /** DLR-150 — OPTIONAL and defaulted to `undefined`, which keeps `run.feederCarry`, so all 48
   *  existing call sites are unchanged. `App.tsx` and `sim/playRun.ts` are the only callers that
   *  pass it. */
  feederCarry?: BuffCarry,
  /** DLR-156 AC8/AC9 — OPTIONAL, defaulted to `run.streak`, mirroring `feederCarry` immediately
   *  above. `App.tsx` and `sim/playRun.ts` are the only callers that pass it. */
  streak?: StreakState,
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
    discardsRemaining,
    buffs: buffs ?? run.buffs,
    // DLR-125 R3 step 5 — Purse coins are additive with the win payout and the quick kill, never
    // conditioned on `wonThisEncounter`: a buff's condition already decided whether it fired, and
    // the run's purse is not the place to re-judge that.
    coins:
      (wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN + quickKill : run.coins) +
      buffCoinsEarned,
    lastQuickKillPayout: quickKill,
    handOfFight: handOfFightAfter(run.handOfFight, encounter),
    flaskCharges: flaskAfter(run.encounterIndex, run.flaskCharges, wonThisEncounter),
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
    feederCarry: feederCarryAfter(encounter, feederCarry ?? run.feederCarry),
    streak: streakAfter(encounter, streak ?? run.streak),
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
    discardsRemaining: DISCARDS_PER_FIGHT,
    // DLR-116 — a shop visit is per resolved encounter, so the free pull returns at every fight
    // boundary exactly as the discard budget does. `runSeed` and `apCapacityBonus` are carried by
    // the spread above untouched.
    slotPullsThisVisit: 0,
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
 * DLR-158 — the ceiling is the run's OWN field now, not a defaulted parameter: there is no
 * argument left to get wrong. A spec that wants a different ceiling spreads
 * `{ ...run, maxPlayerHealth: N }`.
 */
export function drinkFlask(run: RunState): RunState {
  if (!isEncounterResolved(run.encounter)) {
    throw new RangeError(
      `Cannot drink the flask while fight ${run.encounterIndex + 1} of ${run.encounterCount} is not resolved: it is a between-fights action`,
    )
  }
  const refusal = flaskRefusalFor(flaskStockFor(run))
  if (refusal !== null) {
    throw new RangeError(
      `Cannot drink the flask — ${refusal} (holding ${run.flaskCharges} charges, ${run.encounter.health[DuelSide.Player]} of ${run.maxPlayerHealth} health)`,
    )
  }
  return {
    ...healedBy(run, flaskHealAmount(run.maxPlayerHealth), run.maxPlayerHealth),
    flaskCharges: run.flaskCharges - 1,
  }
}

/**
 * AC4/AC5/AC7 — the purchase. Throws a `RangeError` naming the `PurchaseRefusal` rather than
 * returning the run unchanged: a silent no-op is exactly the "took payment for nothing" failure
 * `pullSlotMachine` below already refuses to allow. Reaching the throw is a driver bug, because
 * the control is disabled whenever `refusalFor` is non-null.
 *
 * The heal writes into `encounter.health[Player]` because that IS the carried figure — this
 * module's own docblock states a second copy beside it is the number that drifts, and
 * `advanceRun` seeds the next fight from it. It deliberately does NOT go through `applyDamage`,
 * which refuses a resolved encounter: a restore is not a damage event.
 *
 * DLR-158 — the ceiling is the run's OWN field now, not a defaulted parameter: there is no
 * argument left to get wrong. A spec that wants a different ceiling spreads
 * `{ ...run, maxPlayerHealth: N }`.
 */
export function buyFromShop(run: RunState, item: ShopItem): RunState {
  if (!Number.isFinite(run.maxPlayerHealth) || run.maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot buy against a maximum health of ${run.maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  const stock = shopStockFor(run)
  const refusal = refusalFor(stock, item)
  if (refusal !== null) {
    // DLR-132 — was `run.cheats.length`; a Cheat is a pile member now, so the pile's own count of
    // them is the figure that still makes this message legible.
    const cheatsHeld = run.buffs.filter((b) => b.kind === BuffKind.Cheat).length
    throw new RangeError(
      `Cannot buy ${item} — ${refusal} (holding ${run.coins} coins, ${cheatsHeld} Cheats, ${run.encounter.health[DuelSide.Player]} of ${run.maxPlayerHealth} health)`,
    )
  }
  const paid = { ...run, coins: run.coins - priceOf(item, stock) }
  // A `switch` with no `default`, so a FOURTH item is a compile error here rather than an item
  // that silently does whatever the last branch happened to do. That is not hypothetical: before
  // DLR-90 this function returned the heal unconditionally as its fallback, so adding a new item
  // without this restructuring would have healed the player and type-checked cleanly.
  switch (item) {
    case ShopItem.Cheat:
      return withMintedBuff(paid, cheatBuff(BuffTier.Bronze, run.nextBuffId))
    case ShopItem.Whetstone:
      return { ...paid, whetstones: run.whetstones + 1 }
    case ShopItem.Heal:
      // DLR-93 AC2 — the clamp moved to `healedBy` so the flask reuses it rather than writing a
      // second one. Byte-identical result for identical inputs; the paid Heal's behaviour is
      // unchanged.
      return healedBy(paid, HEAL_HEALTH_RESTORED, run.maxPlayerHealth)
    case ShopItem.ApCapacity:
      // DLR-116 AC2 — a COUNT of purchases, not a point total; `apCapacityFor` owns the
      // multiplication, so the step size (`AP_CAPACITY_STEP`) is stated exactly once.
      return { ...paid, apCapacityBonus: run.apCapacityBonus + 1 }
    case ShopItem.SwanTier:
    case ShopItem.WitchTier: {
      // DLR-122 AC2 — one STEP up the ladder, never a counter: a rank is a rung, unlike
      // `whetstones` and `apCapacityBonus` above, which stack. `tieredRankOf` is the single
      // mapping from item to rank, so this branch cannot disagree with `refusalFor` about which
      // rank a card sells. `refusalFor` above has already refused a rank at gold, so
      // `steppedTo`'s own RangeError is a guard rather than a path a player reaches.
      const rank = tieredRankOf(item)
      if (rank === null) {
        throw new RangeError(`Cannot upgrade a rank from ${item}: it names no tiered rank`)
      }
      return { ...paid, rankTiers: steppedTo(run.rankTiers, rank) }
    }
    case ShopItem.MaxHealth: {
      // DLR-158 AC1/AC2 — the ceiling rises FIRST, then the bar fills to the new top, so the
      // clamp inside `healedBy` is measured against the raised figure rather than the old one.
      // `raisedMaxHealthFor` owns the step size, so `MAX_HEALTH_PER_PURCHASE` is read in exactly
      // one place. A COUNT is incremented, not a flag set: each copy stacks and the climbing
      // price is the only limiter (AC6).
      const raised = raisedMaxHealthFor(run.maxPlayerHealth)
      return {
        ...fullyHealed({ ...paid, maxPlayerHealth: raised }, raised),
        maxHealthPurchases: run.maxHealthPurchases + 1,
      }
    }
  }
}

/** DLR-132 — one bought activated card appended to the pile, with `nextBuffId` advanced. A
 *  named helper rather than an inline spread in `buyFromShop`'s Cheat branch, so
 *  "a purchase adds one card and burns one id" is stated once. */
function withMintedBuff(run: RunState, buff: Buff): RunState {
  return { ...run, buffs: [...run.buffs, buff], nextBuffId: run.nextBuffId + 1 }
}

/**
 * DLR-116 — one pull, ALREADY RESOLVED by the caller. Taking a `SlotPull` rather than an `Rng`
 * keeps this whole module randomness-free and keeps the seeding in exactly one place.
 *
 * Throws a `RangeError` naming the `SlotPullRefusal` rather than returning the run unchanged,
 * exactly as `buyFromShop` and `drinkFlask` do: a silent no-op is the "spent the coin for nothing"
 * failure this module refuses to allow. Reaching the throw is a driver bug — the control is
 * disabled whenever `slotPullRefusalFor` is non-null.
 *
 * Every award is taken; there is no choose-one gate. DLR-112's expected 2.64 cards per pull is a
 * per-pull YIELD that only holds if all of them land (`plan.md` Part 1 → Assumptions made).
 */
export function pullSlotMachine(run: RunState, pull: SlotPull): RunState {
  const refusal = slotPullRefusalFor(slotVisitStockFor(run))
  if (refusal !== null) {
    throw new RangeError(
      `Cannot pull the slot machine — ${refusal} (holding ${run.coins} coins, ${run.slotPullsThisVisit} pulls this visit)`,
    )
  }
  return {
    ...run,
    coins: run.coins - pullPriceFor(run.slotPullsThisVisit),
    slotPullsThisVisit: run.slotPullsThisVisit + 1,
    buffs: [...run.buffs, ...mintPullAwards(pull, run.nextBuffId)],
    nextBuffId: run.nextBuffId + pull.awards.length,
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
 * DLR-158 AC2 — restored to the TOP of the given ceiling. Goes through `healedBy` rather than
 * writing a second clamp, per DLR-93's own note on reusing that pattern: with the restored amount
 * equal to the ceiling, `Math.min(ceiling, current + ceiling)` is the ceiling for any positive
 * current health, which is AC2's "a player on 1 of 6 who buys a +2 increase leaves on 8 of 8".
 *
 * A named rule rather than an inline `healedBy(run, max, max)`, following this file's convention:
 * the doubled argument is opaque about what it means, and a named rule is what a reviewer finds.
 */
function fullyHealed(run: RunState, maxPlayerHealth: Health): RunState {
  return healedBy(run, maxPlayerHealth, maxPlayerHealth)
}
