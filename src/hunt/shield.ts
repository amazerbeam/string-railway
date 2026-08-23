import { BuffTier } from './buffs'
import type { Damage, Health } from './types'

/**
 * DLR-110 AC2 — blue hearts granted by ONE activation, by tier.
 *
 * TRANSCRIBED, not chosen here: design doc §7a ("bronze adds 1, silver 2, gold 3") and AC2's own
 * `SHIELD_HEARTS = { bronze: 1, silver: 2, gold: 3 }`. The same 1/2/3 ladder
 * `CHEAT_DURATION_TRICKS` carries, and for the same reason — it is the only tier curve the design
 * sources actually state.
 *
 * UNIT: blue hearts, each absorbing one point of damage, added by one activation. NOT cumulative:
 * `activateShield` SETS this figure, so no cap is needed and none exists — 3 is the maximum
 * reachable count.
 */
export const SHIELD_HEARTS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/** No protection. What `startEncounter` seeds and what a fully spent shield returns to. */
export const NO_SHIELD_HEARTS: Health = 0

/**
 * One damage event, split by the shield. Named fields rather than a tuple for `HealthBarOverlays`'
 * reason: `absorbed` and `throughToHealth` are both `Damage` and a transposed pair would
 * type-check cleanly and deplete the wrong pool.
 */
export interface ShieldAbsorption {
  /** Taken by blue hearts. Never exceeds `shieldHearts`, never exceeds `damage`. */
  readonly absorbed: Damage
  /** The remainder, for `deplete` to subtract from red health. */
  readonly throughToHealth: Damage
  /** Blue hearts still standing after this event. */
  readonly shieldHeartsRemaining: Health
}

/**
 * AC4 — THE single statement of the absorption order: blue hearts take damage BEFORE ordinary
 * hearts, one point each.
 *
 * A BLUE HEART IS WORTH ONE POINT, NOT ONE HIT (`plan.md` Part 1 → Assumptions made). Three
 * damage into two blue hearts consumes both and lets one through; it does not negate the hit.
 * This is design §7a's "dividing what you take", and it is what keeps Shield distinct from
 * `Ward`, which `v1-buff-card-list.md` defines as absorbing up to N on the next hit and then
 * breaking regardless. **Ward is not touched by this ticket and its known tier defect is not
 * fixed here.**
 *
 * Performs NO clamping of red health — `deplete` in `encounter.ts` remains DLR-70's single clamp
 * point, and this function never touches `health`.
 *
 * GUARDS rather than diagnoses. `applyDamage`'s `assertApplicable` already rejects a negative or
 * non-finite `damage` before this runs, so both throws are guards rather than live paths — stated
 * so a future direct caller does not assume the check happened upstream. A `NaN` here would
 * produce `NaN` remaining hearts, reach a rendered row as nothing at all, and log nothing.
 *
 * Finite and non-negative, NOT integral, exactly as `assertApplicable` documents: under
 * `DAMAGE_ROUNDING = None` a ×0.5 band legitimately produces a half-point total, and an integer
 * guard would break a supported configuration.
 */
export function absorbWithShield(shieldHearts: Health, damage: Damage): ShieldAbsorption {
  if (!Number.isFinite(shieldHearts) || shieldHearts < 0) {
    throw new RangeError(
      `Cannot absorb damage against ${shieldHearts} blue hearts: it must be a non-negative finite number`,
    )
  }
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(
      `Cannot absorb ${damage} damage with a shield: damage must be a non-negative finite number`,
    )
  }
  const absorbed = Math.min(shieldHearts, damage)
  return {
    absorbed,
    throughToHealth: damage - absorbed,
    shieldHeartsRemaining: shieldHearts - absorbed,
  }
}

/**
 * How many blue hearts `tier` grants. THE only reader of `SHIELD_HEARTS`, so one tier has exactly
 * one answer — the discipline `cheatDurationTricksOf` sets for Cheat's duration.
 *
 * Throws on a tier outside the table rather than returning `undefined`, which would flow into
 * `activateShield` and set a shield of `undefined` blue hearts that renders as nothing.
 */
export function shieldHeartsForTier(tier: BuffTier): Health {
  const hearts = SHIELD_HEARTS[tier]
  if (hearts === undefined) {
    throw new RangeError(`No shield heart count is defined for tier ${tier}`)
  }
  return hearts
}
