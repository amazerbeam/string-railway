import { narrowToCostAxis, type BuffCostAxis } from './buffCosts'
import type { Buff } from './buffs'
import {
  MAX_COIN_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_REFUND_PER_HAND,
} from './apConfig'
import { BuffRewardAxis } from './buffs'

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

/** One hand's four running totals, one per reward axis R1 prices, each already clipped at its cap
 *  (R6) so a reader never has to re-check a bound. */
export interface BuffBonusAccrual {
  readonly multiplierBonus: number
  readonly flatDamageBonus: number
  readonly coinBonus: number
  readonly apRefunded: number
}

export const EMPTY_BUFF_ACCRUAL: BuffBonusAccrual = {
  multiplierBonus: 0,
  flatDamageBonus: 0,
  coinBonus: 0,
  apRefunded: 0,
}

/** The value a new hand's accrual starts at. The ONLY reset this module exports — see the module
 *  docblock's R6 note. Equal to `EMPTY_BUFF_ACCRUAL`; a distinct named function rather than
 *  exporting the constant directly under two names, so a caller's intent ("start a new hand") is
 *  legible at the call site the way `refreshActionPointsForNewHand` already is for AP. */
export function startHandAccrual(): BuffBonusAccrual {
  return EMPTY_BUFF_ACCRUAL
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

/** R1/R2/R5 resolved for one trick's fired buffs: each buff's reward adds into its own axis, then
 *  the Overlap Bonus — drawn from the SAME `MAX_MULTIPLIER_BONUS_PER_HAND` pool Momentum cards
 *  themselves draw from (R5) — adds to the multiplier axis. Reflects R3's five-step order (Second
 *  Wind → Momentum → cash-out → Blade → Purse) in the sequence contributions are applied, but does
 *  NOT perform the cash-out step itself — nothing in `src/` reads a buff yet, so wiring this into
 *  `bank.ts`'s live cash-out is a later ticket's job (`plan.md` → Explicitly out of scope). Never
 *  mutates `accrual` or `fired`. */
export function resolveFiredBuffs(
  accrual: BuffBonusAccrual,
  fired: readonly Buff[],
): BuffBonusAccrual {
  let next = fired.reduce(
    (running, buff) =>
      accrueAxisBonus(
        running,
        narrowToCostAxis(buff.reward.axis, 'Fired buff reward axis'),
        buff.reward.value,
      ),
    accrual,
  )
  const overlap = overlapBonusFor(fired.length)
  if (overlap > 0) {
    next = accrueAxisBonus(next, BuffRewardAxis.Multiplier, overlap)
  }
  return next
}
