import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from './buffs'
import type { ActionPoints } from './types'

/**
 * DLR-108 — the AP cost model, transcribed from DLR-111 `v1-buff-card-list.md` → *The formula*,
 * *AP costs, per family and reward*, and *Utilities, consumables and activated cards*.
 *
 * `apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], AP_COST_MIN, AP_COST_MAX)`
 * for the eleven condition families, and a flat `CONSUMABLE_AP_COST[kind][tier]` lookup for the
 * eight consumable/activated cards. DLR-111 sources seven of those eight and sets them off-curve
 * for stated reasons (Ward flat because its tier is paid in something other than
 * AP; Cheat's gold deliberately above `STARTING_AP`). The eighth, Shield, is NOT DLR-111's — see
 * the `CONSUMABLE_AP_COST` table's own comment on that row for where its figures came from.
 *
 * EVERY FIGURE BELOW EXCEPT SHIELD'S IS DLR-111'S, agent-chosen under that ticket's sprint-run
 * tuning-value override, never played against a real hand, and retunable by editing `REWARD_BASE`
 * and `CONDITION_MODIFIER` alone (or `CONSUMABLE_AP_COST` for the off-curve rows) — nothing else in
 * this module needs to change to retune the whole 78-card v1 pool.
 *
 * AC2's `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }` is deliberately NOT shipped.
 * AC2 predates DLR-111's family- and axis-priced pool, and a single tier table cannot price a list
 * where cost depends on family and reward axis as well as tier. Concretely: gold Cheat is priced
 * **7 AP** here, not 8 (`plan.md` Part 1 → Assumptions made).
 */

/** UNIT: action points. Bounds of the clamp (DLR-111 → The formula). */
export const AP_COST_MIN = 1
export const AP_COST_MAX = 6

/** The four REWARD axes a condition template can pay on, and their per-tier base. */
export type BuffCostAxis =
  | typeof BuffRewardAxis.Magnitude
  | typeof BuffRewardAxis.Coins
  | typeof BuffRewardAxis.ApRefund
  | typeof BuffRewardAxis.Multiplier

/** DLR-161 — every axis a TEMPLATE can be minted on: the four accrual axes plus Protection.
 *  Protection has an AP price base and a reward ladder but NO per-hand accrual counter, because
 *  it pays into the streak's reset rather than into a pool. Split from `BuffCostAxis` rather
 *  than widening it deliberately: widening would compile-force `accrualCapFor`,
 *  `accrueAxisBonus`, `accrueCarry` and `trickBonusFor` to each grow a Protection case that
 *  returns "nothing" — a plausible zero in four places, instead of one honest exclusion in two. */
export type BuffMintedAxis = BuffCostAxis | typeof BuffRewardAxis.Protection

/** The 11 shipping condition families DLR-111 finding 1 names, plus the two DLR-161 adds. */
export type BuffConditionKind =
  | typeof BuffKind.Taker
  | typeof BuffKind.Feeder
  | typeof BuffKind.MarkOfRank
  | typeof BuffKind.Sidestep
  | typeof BuffKind.Glutton
  | typeof BuffKind.Hoarder
  | typeof BuffKind.Unbloodied
  | typeof BuffKind.DebtCollector
  | typeof BuffKind.Keepsake
  | typeof BuffKind.Miser
  | typeof BuffKind.Cornered
  | typeof BuffKind.SkullHelmet
  | typeof BuffKind.SkullTether

/** Cheat, Shield and the 5 consumables — priced off the formula entirely. */
export type BuffConsumableKind =
  | typeof BuffKind.Cheat
  | typeof BuffKind.Ward
  | typeof BuffKind.Puppeteer
  | typeof BuffKind.SecondThoughts
  | typeof BuffKind.Foresight
  | typeof BuffKind.Spyglass
  | typeof BuffKind.Shield
  | typeof BuffKind.Wildcard
  | typeof BuffKind.Curse

// DLR-111 → The formula. UNIT: action points, per tier, before the condition modifier.
export const REWARD_BASE: Readonly<Record<BuffMintedAxis, Readonly<Record<BuffTier, number>>>> = {
  [BuffRewardAxis.Magnitude]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 2, [BuffTier.Gold]: 3 },
  [BuffRewardAxis.Coins]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  [BuffRewardAxis.ApRefund]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 1, [BuffTier.Gold]: 1 },
  [BuffRewardAxis.Multiplier]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 5 },
  // DLR-161 — NOBODY CHOSE THESE THREE NUMBERS. No source document prices a protective axis.
  // The ladder shape is copied from Coins'. UNIT: action points, added to CONDITION_MODIFIER
  // before the clamp. See `tasks.md` → Developer decides or observes.
  [BuffRewardAxis.Protection]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
}

// DLR-111 → The formula. A discount for an unreliable family, a surcharge for a reliable one —
// see that section's "Why the condition modifier is a discount, not a surcharge". UNIT: action
// points, added to REWARD_BASE before the clamp.
export const CONDITION_MODIFIER: Readonly<Record<BuffConditionKind, number>> = {
  [BuffKind.Taker]: 0,
  [BuffKind.Feeder]: 1,
  [BuffKind.MarkOfRank]: -1,
  [BuffKind.Sidestep]: -1,
  [BuffKind.Glutton]: 0,
  [BuffKind.Hoarder]: 0,
  [BuffKind.Unbloodied]: 0,
  [BuffKind.DebtCollector]: 1,
  [BuffKind.Keepsake]: 0,
  [BuffKind.Miser]: -1,
  [BuffKind.Cornered]: -1,
  // DLR-161 — NOBODY CHOSE THESE TWO NUMBERS. 0 is the neutral row Taker and Glutton already
  // take. UNIT: action points. See `tasks.md` → Developer decides or observes.
  [BuffKind.SkullHelmet]: 0,
  [BuffKind.SkullTether]: 0,
}

// DLR-111 → Utilities, consumables and activated cards. Off-curve by design: Ward
// is flat because its tier is paid in something other than AP (absorption); gold
// Cheat is deliberately priced above STARTING_AP. Puppeteer is single-tier only in the source
// document; all three cells carry its one price so the table stays total over BuffTier.
// UNIT: action points.
export const CONSUMABLE_AP_COST: Readonly<
  Record<BuffConsumableKind, Readonly<Record<BuffTier, ActionPoints>>>
> = {
  [BuffKind.Ward]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 2, [BuffTier.Gold]: 2 },
  [BuffKind.Puppeteer]: { [BuffTier.Bronze]: 4, [BuffTier.Silver]: 4, [BuffTier.Gold]: 4 },
  [BuffKind.SecondThoughts]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  [BuffKind.Foresight]: { [BuffTier.Bronze]: 1, [BuffTier.Silver]: 2, [BuffTier.Gold]: 3 },
  [BuffKind.Spyglass]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  [BuffKind.Cheat]: { [BuffTier.Bronze]: 3, [BuffTier.Silver]: 5, [BuffTier.Gold]: 7 },
  // DLR-110 — NOBODY CHOSE THESE NUMBERS. No source document prices Shield: `v1-buff-card-list.md`
  // has no Shield row, and design §7a states the heart counts but no cost. The ladder shape is
  // copied from `SecondThoughts`/`Spyglass`. A price row is FORCED by adding `BuffKind.Shield` —
  // `apCostOf` throws on an unpriced kind — so the choice could not be deferred, only made
  // invisibly or made visibly. Made visibly. Shield's activation cost is out of DLR-110's scope;
  // this is the type system's minimum, not a costing pass. Nothing player-reachable mints a
  // Shield yet, so no player can pay this today. UNIT: action points.
  [BuffKind.Shield]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
  // DLR-162 — UNREACHABLE BY CONSTRUCTION, and a row is nonetheless MANDATORY:
  // `buffActivationStockFor` calls `apCostOf` eagerly for every card in the loadout gallery, and
  // `buffApCost` throws on an unpriced kind — an omitted row here would take the felt down the
  // first time a player was dealt a wildcard. Zero is the honest figure rather than a plausible
  // default: action points left the buff layer on DLR-145, and `BuffActivationRefusal.ShopOnly`
  // refuses this card ahead of `InsufficientAp` in any case. UNIT: action points.
  [BuffKind.Wildcard]: { [BuffTier.Bronze]: 0, [BuffTier.Silver]: 0, [BuffTier.Gold]: 0 },
  // DLR-167 AC2 — "a tiered action-point cost from the existing cost table". That table had no
  // Curse row, and `apCostOf` THROWS on an unpriced kind, so a row is forced by the type system:
  // the choice could only be made invisibly or made visibly. Made visibly.
  // NOBODY CHOSE THESE THREE NUMBERS. The ladder shape is copied from Shield's. Worth pricing
  // against the card's own asymmetry: a misread Curse costs the card, the AP and the whole streak
  // at once. See `tasks.md` -> Developer decides or observes. UNIT: action points.
  [BuffKind.Curse]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
}

const CONDITION_FAMILY_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONDITION_MODIFIER) as BuffConditionKind[],
)
const CONSUMABLE_KINDS: ReadonlySet<BuffKind> = new Set(
  Object.keys(CONSUMABLE_AP_COST) as BuffConsumableKind[],
)

/** Whether `kind` is one of the 11 condition families priced through `REWARD_BASE` +
 *  `CONDITION_MODIFIER`, rather than through `CONSUMABLE_AP_COST` or unpriced entirely. */
export function isConditionFamily(kind: BuffKind): kind is BuffConditionKind {
  return CONDITION_FAMILY_KINDS.has(kind)
}

/** Whether `kind` is one of the 8 consumable/activated cards priced through `CONSUMABLE_AP_COST`. */
export function isConsumableKind(kind: BuffKind): kind is BuffConsumableKind {
  return CONSUMABLE_KINDS.has(kind)
}

/** Narrows a `BuffRewardAxis` to the four axes `REWARD_BASE` prices (and `buffAccrual.ts`'s four
 *  per-hand accrual axes share), throwing rather than defaulting to zero — a condition family
 *  minted on an axis with no base (e.g. `heartCount`) is a construction bug, and a silent zero
 *  would price it at the clamp floor and look reasonable. `contextLabel` lets each call site word
 *  its own error without duplicating the narrowing chain. */
export function narrowToCostAxis(axis: BuffRewardAxis, contextLabel: string): BuffCostAxis {
  if (
    axis === BuffRewardAxis.Magnitude ||
    axis === BuffRewardAxis.Coins ||
    axis === BuffRewardAxis.ApRefund ||
    axis === BuffRewardAxis.Multiplier
  ) {
    return axis
  }
  throw new RangeError(`${contextLabel} ${axis} has no AP cost base — it cannot price it`)
}

/** DLR-161 — an axis that pays by protecting a streak figure. It contributes to NO per-hand
 *  accrual counter and to NO trick's damage, so `buffAccrual.ts` checks this ABOVE
 *  `narrowToCostAxis` rather than asking that function to grow a fifth case. */
export function isProtectiveAxis(axis: BuffRewardAxis): axis is typeof BuffRewardAxis.Protection {
  return axis === BuffRewardAxis.Protection
}

/** Narrows to the axes the two reward LADDERS (`REWARD_BASE`, `REWARD_TIER_VALUE`) are keyed by.
 *  Throws rather than defaulting to zero, for `narrowToCostAxis`'s own stated reason: a template
 *  minted on an axis with no base is a construction bug, and a silent zero would price it at the
 *  clamp floor and look reasonable. */
export function narrowToMintedAxis(axis: BuffRewardAxis, contextLabel: string): BuffMintedAxis {
  if (axis === BuffRewardAxis.Protection) return axis
  return narrowToCostAxis(axis, contextLabel)
}

function clampApCost(cost: number): ActionPoints {
  return Math.min(Math.max(cost, AP_COST_MIN), AP_COST_MAX)
}

/** The formula: `clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[kind], AP_COST_MIN,
 *  AP_COST_MAX)` for a condition family, `CONSUMABLE_AP_COST[kind][tier]` for a consumable.
 *  Throws on any other kind — placeholder content (`Unassigned`) has no price. */
export function buffApCost(kind: BuffKind, axis: BuffRewardAxis, tier: BuffTier): ActionPoints {
  if (isConsumableKind(kind)) return CONSUMABLE_AP_COST[kind][tier]
  if (!isConditionFamily(kind)) {
    throw new RangeError(`Buff kind ${kind} has no AP price — it is placeholder content`)
  }
  const base = REWARD_BASE[narrowToMintedAxis(axis, 'Reward axis')][tier]
  return clampApCost(base + CONDITION_MODIFIER[kind])
}

/** The single entry point a consumer calls: reads `(kind, reward.axis, tier)` off `buff`, so one
 *  buff has exactly one answer. Throws `RangeError` on `BuffKind.Unassigned` rather than returning
 *  a number — a placeholder with a plausible price is the bug that type-checks, per
 *  `cheatDurationTricksOf`'s discipline in `buffCatalog.ts`. */
export function apCostOf(buff: Buff): ActionPoints {
  return buffApCost(buff.kind, buff.reward.axis, buff.tier)
}
