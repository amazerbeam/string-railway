import { isProtectiveAxis, narrowToCostAxis, type BuffCostAxis } from './buffCosts'
import type { Buff } from './buffs'
import {
  MAX_COIN_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_REFUND_PER_HAND,
} from './apConfig'
import { BuffKind, BuffRewardAxis } from './buffs'

/**
 * DLR-108/DLR-124 — the per-hand accrual R1/R2/R5/R6 describe: four independent running totals,
 * one per reward axis, each clipped at its own named cap.
 *
 * **R6's asymmetry, stated in full, because both source documents call it the single most likely
 * thing to be lost in translation: every cap resets PER HAND and NOT on a hit.** A per-streak
 * allowance refreshed by the very event the player is avoiding would pay three full pools in a
 * hand containing three hits — the containment mechanism R6 exists for would be gone. That is why
 * `startHandAccrual()` is the ONLY exported reset in this module, and why there is deliberately
 * **no** `resetOnHit` or similarly-shaped function — leaving the function an obvious wrong reading
 * would need absent is what makes sure it never gets written.
 *
 * Nothing here decides WHEN a buff fires — condition evaluation is a later ticket's job
 * (`plan.md` → Explicitly out of scope). This module receives already-fired buffs and resolves
 * their contribution.
 */

/** The two axes that cross a hand boundary — structurally identical to `TrickBuffBonus`'s two
 *  damage fields, and deliberately so: the carry seeds exactly the two figures a trick can pay.
 *  A distinct NAMED type because it lives on `RunState` and crosses the mount seam in both
 *  directions, where `TrickBuffBonus`'s "this trick's own contribution" meaning would be a lie. */
export interface BuffCarry {
  readonly multiplierBonus: number
  readonly flatDamageBonus: number
}

export const EMPTY_BUFF_CARRY: BuffCarry = { multiplierBonus: 0, flatDamageBonus: 0 }

/** One hand's four running totals, one per reward axis R1 prices, each already clipped at its cap
 *  (R6) so a reader never has to re-check a bound. */
export interface BuffBonusAccrual {
  readonly multiplierBonus: number
  readonly flatDamageBonus: number
  readonly coinBonus: number
  readonly apRefunded: number
  /** DLR-150 AC3 — what seeded this hand's `multiplierBonus`/`flatDamageBonus`. DISPLAY ONLY:
   *  nothing reads it to decide a payout, because the seed is already inside those two figures.
   *  Kept so AC6's opening figure is legible for the whole hand, not only at trick 0. */
  readonly carriedIn: BuffCarry
  /** DLR-150 AC1 — rewards a Feeder earned on a LOSS this hand. Never payable this hand;
   *  UNCAPPED, because R6's caps bound what a hand may PAY and this pays nothing. Handed to the
   *  run at hand end and wiped at the fight boundary by `feederCarryAfter`. */
  readonly carryOut: BuffCarry
}

export const EMPTY_BUFF_ACCRUAL: BuffBonusAccrual = {
  multiplierBonus: 0,
  flatDamageBonus: 0,
  coinBonus: 0,
  apRefunded: 0,
  carriedIn: EMPTY_BUFF_CARRY,
  carryOut: EMPTY_BUFF_CARRY,
}

/** The value a new hand's accrual starts at. The ONLY reset this module exports — see the module
 *  docblock's R6 note. `carriedIn` (DLR-150 AC3) seeds `multiplierBonus`/`flatDamageBonus`
 *  directly, exactly as any other hand-long contribution to those axes (coins, AP refund and the
 *  Feeder carry — DLR-156 moved the damage axes off this pool onto `trickBonusFor`, per trick).
 *  The carry itself sits outside R6's caps deliberately — R6 bounds what a hand may PAY, and the
 *  carry paid nothing in the hand that earned it. A distinct named function rather than exporting
 *  the constant directly under two names, so a caller's intent ("start a new hand") is legible at
 *  the call site the way `refreshActionPointsForNewHand` already is for AP. */
export function startHandAccrual(carriedIn: BuffCarry = EMPTY_BUFF_CARRY): BuffBonusAccrual {
  return {
    ...EMPTY_BUFF_ACCRUAL,
    multiplierBonus: carriedIn.multiplierBonus,
    flatDamageBonus: carriedIn.flatDamageBonus,
    carriedIn,
  }
}

/** The per-hand cap for one of the four `BuffCostAxis` reward axes, transcribed from
 *  `apConfig.ts`'s `MAX_*_PER_HAND` constants (DLR-111/DLR-124). */
export function accrualCapFor(axis: BuffCostAxis): number {
  switch (axis) {
    case BuffRewardAxis.Multiplier:
      return MAX_MULTIPLIER_BONUS_PER_HAND
    case BuffRewardAxis.Magnitude:
      return MAX_FLAT_DAMAGE_BONUS_PER_HAND
    case BuffRewardAxis.Coins:
      return MAX_COIN_BONUS_PER_HAND
    case BuffRewardAxis.ApRefund:
      return MAX_REFUND_PER_HAND
  }
}

/** R1 — a contribution moves exactly one axis's counter, no other. R2 — within that axis,
 *  contributions add. R6 — the sum is clipped at the axis's cap and the remainder is lost by
 *  design; it is never banked for later. Never mutates `accrual`. */
export function accrueAxisBonus(
  accrual: BuffBonusAccrual,
  axis: BuffCostAxis,
  amount: number,
): BuffBonusAccrual {
  const cap = accrualCapFor(axis)
  switch (axis) {
    case BuffRewardAxis.Multiplier:
      return { ...accrual, multiplierBonus: Math.min(accrual.multiplierBonus + amount, cap) }
    case BuffRewardAxis.Magnitude:
      return { ...accrual, flatDamageBonus: Math.min(accrual.flatDamageBonus + amount, cap) }
    case BuffRewardAxis.Coins:
      return { ...accrual, coinBonus: Math.min(accrual.coinBonus + amount, cap) }
    case BuffRewardAxis.ApRefund:
      return { ...accrual, apRefunded: Math.min(accrual.apRefunded + amount, cap) }
  }
}

/** R5 — the Overlap Bonus: `max(0, firedCount - 1)`, linear in the count of buffs that fired on
 *  one trick, not in the number of pairs among them (`hybrid-design.md` §5, R5's own argument
 *  against a quadratic pairs basis). */
export function overlapBonusFor(firedCount: number): number {
  return Math.max(0, firedCount - 1)
}

/** AC1 — one Loss-firing Feeder's reward into `carryOut`. UNCAPPED: R6's caps bound what a hand
 *  may PAY, and this pays nothing this hand. Throws on an axis that cannot carry rather than
 *  accruing a plausible zero — `mintFromTemplate`'s discipline. Never mutates `accrual`. */
export function accrueCarry(
  accrual: BuffBonusAccrual,
  axis: BuffCostAxis,
  amount: number,
): BuffBonusAccrual {
  switch (axis) {
    case BuffRewardAxis.Multiplier:
      return {
        ...accrual,
        carryOut: {
          ...accrual.carryOut,
          multiplierBonus: accrual.carryOut.multiplierBonus + amount,
        },
      }
    case BuffRewardAxis.Magnitude:
      return {
        ...accrual,
        carryOut: {
          ...accrual.carryOut,
          flatDamageBonus: accrual.carryOut.flatDamageBonus + amount,
        },
      }
    case BuffRewardAxis.Coins:
    case BuffRewardAxis.ApRefund:
      throw new RangeError(
        `Axis ${axis} cannot carry across a hand boundary: only Momentum and Blade seed a hand`,
      )
  }
}

/** R1/R2/R5 for one trick's fired buffs, plus DLR-150 AC1/AC2's outcome split. `trickIsLoss` is
 *  supplied by `streak.ts` from `!isTaken(outcome)` — this module never re-derives the skull
 *  inversion, which is stated exactly once, in `streak.ts`'s `TAKEN` table. A FEEDER firing on a
 *  Loss carries; every other family and every Win is unchanged, and so is the Overlap Bonus.
 *  Reflects R3's five-step order (Second Wind → Momentum → cash-out → Blade → Purse) in the
 *  sequence contributions are applied, but does NOT perform the cash-out step itself — that is
 *  `streak.ts`'s job for the hand-long axes; `trickBonusFor` above does the per-trick damage
 *  axes directly. Never mutates `accrual` or `fired`. */
export function resolveFiredBuffs(
  accrual: BuffBonusAccrual,
  fired: readonly Buff[],
  trickIsLoss: boolean,
): BuffBonusAccrual {
  let next = fired.reduce((running, buff) => {
    // DLR-161 — a protective card pays into NO per-hand pool: its reward is the streak figure
    // `resolveTrickBank` keeps through the reset. Excluded here rather than by widening
    // `BuffCostAxis`, so the four accrual switches keep exactly the four cases they can answer.
    // It is still counted by `overlapBonusFor` below — AC9's "the second card fired earns the
    // Overlap Bonus exactly as any other pair would".
    if (isProtectiveAxis(buff.reward.axis)) return running
    const axis = narrowToCostAxis(buff.reward.axis, 'Fired buff reward axis')
    return trickIsLoss && buff.kind === BuffKind.Feeder
      ? accrueCarry(running, axis, buff.reward.value)
      : accrueAxisBonus(running, axis, buff.reward.value)
  }, accrual)
  const overlap = overlapBonusFor(fired.length)
  if (overlap > 0) {
    next = accrueAxisBonus(next, BuffRewardAxis.Multiplier, overlap)
  }
  return next
}

/** DLR-156 AC11 — ONE trick's buff contribution, for THAT trick only. Nothing pools. */
export interface TrickBuffBonus {
  readonly flatDamageBonus: number
  readonly multiplierBonus: number
  /** `overlapBonusFor(fired.length)`, carried out separately so the screen can beat it alone. */
  readonly overlapBonus: number
}

const EMPTY_TRICK_BONUS: TrickBuffBonus = {
  flatDamageBonus: 0,
  multiplierBonus: 0,
  overlapBonus: 0,
}

/** DLR-156 AC11 — ONE trick's buff contribution, for THAT trick only. Nothing pools across
 *  tricks any more: a Blade fired on trick 1 and the same Blade fired on trick 6 both pay into
 *  their own trick's `(base + bd) x bm` and neither survives it.
 *
 *  Reads `buff.reward` through the same `narrowToCostAxis` and the same `BuffKind.Feeder` /
 *  `trickIsLoss` split `resolveFiredBuffs` uses, so cadence, the Feeder carry and the tier
 *  table are inherited rather than restated. The Overlap Bonus is returned SEPARATELY rather
 *  than folded into `multiplierBonus`, so the resolution screen can give it its own beat
 *  (AC16) without re-deriving `overlapBonusFor`.
 *
 *  R6's four per-hand caps are deliberately NOT applied here. They bound what a HAND may pay,
 *  and this figure is per TRICK; both damage caps are `Number.POSITIVE_INFINITY` today, so no
 *  number moves either way. Coins, the AP refund and the Feeder carry still run through
 *  `resolveFiredBuffs` and its caps, untouched. */
export function trickBonusFor(fired: readonly Buff[], trickIsLoss: boolean): TrickBuffBonus {
  const totals = fired.reduce((running, buff) => {
    if (trickIsLoss && buff.kind === BuffKind.Feeder) {
      // DLR-150 AC1 — carries out instead of paying this trick.
      return running
    }
    // DLR-161 — see `resolveFiredBuffs`'s comment above: a protective card pays into no pool.
    if (isProtectiveAxis(buff.reward.axis)) return running
    const axis = narrowToCostAxis(buff.reward.axis, 'Fired buff reward axis')
    switch (axis) {
      case BuffRewardAxis.Multiplier:
        return { ...running, multiplierBonus: running.multiplierBonus + buff.reward.value }
      case BuffRewardAxis.Magnitude:
        return { ...running, flatDamageBonus: running.flatDamageBonus + buff.reward.value }
      case BuffRewardAxis.Coins:
      case BuffRewardAxis.ApRefund:
        return running
    }
  }, EMPTY_TRICK_BONUS)
  return { ...totals, overlapBonus: overlapBonusFor(fired.length) }
}
