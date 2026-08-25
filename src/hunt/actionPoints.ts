import {
  AP_CAPACITY_STEP,
  AP_ENABLED,
  AP_REFRESH_CADENCE,
  ApRefreshCadence,
  STARTING_AP,
} from './config'
import type { ActionPoints } from './types'

/**
 * DLR-104 AC2 — the toggle's decision logic, taking `enabled` as an explicit parameter so
 * both branches are directly unit-testable against `AP_ENABLED`'s current value rather than
 * only against whichever one it happens to default to. `apCostFor` below is the only caller
 * a real consumer should ever use.
 */
export function apCostGiven(cost: ActionPoints, enabled: boolean): ActionPoints {
  return enabled ? cost : 0
}

/**
 * THE single statement of what a cost actually is once AP_ENABLED is taken into account —
 * every future AP-gated consumer (buff activation, Apply Damage) calls this instead of
 * checking AP_ENABLED itself, mirroring src/warCouncil/voluntaryCashOut.ts's
 * applyDamageRefusalFor. Flip AP_ENABLED off in config.ts and every cost reads as free, with
 * no consuming code writing its own bypass.
 */
export function apCostFor(cost: ActionPoints): ActionPoints {
  return apCostGiven(cost, AP_ENABLED)
}

/** Whether `pool` covers `cost`, honouring AP_ENABLED through apCostFor. */
export function canAffordAp(pool: ActionPoints, cost: ActionPoints): boolean {
  return pool >= apCostFor(cost)
}

/**
 * Spends `cost` (through apCostFor) from `pool`. Throws rather than clamping to zero — an
 * insufficient-AP spend attempt is a caller bug the same way `spendConsumable` in
 * src/hunt/consumables.ts treats spending an id that is not in the pile, and clamping would
 * silently let a consumer commit an action it could not actually afford.
 */
export function spendAp(pool: ActionPoints, cost: ActionPoints): ActionPoints {
  const effectiveCost = apCostFor(cost)
  if (pool < effectiveCost) {
    throw new RangeError(`Cannot spend ${effectiveCost} AP — only ${pool} available`)
  }
  return pool - effectiveCost
}

/**
 * DLR-104 AC3 — the pool's value at the top of a new hand. `PerHand` and `PerTrick` both reset
 * here: 2026-08-25's `PerTrick` is a STRICTLY MORE frequent refill than `PerHand`, never a coarser
 * one, so a hand boundary resets under it too — only a future COARSER cadence (per-fight,
 * per-run) would carry the pool past a hand boundary instead of resetting it, which is the shape
 * the ticket's own risk note asks for: a later coarser cadence needs a new config entry and a new
 * branch here, not a type change.
 *
 * DLR-116 note: this hard-resets to plain `STARTING_AP` and is NOT capacity-aware — it does not
 * read `apCapacityFor`/`apCapacityBonus`. That is dead code in production today only because
 * `App.tsx` remounts the felt per hand (`key={hand}`), so `createRoundUiState`'s
 * `startBuffActivation(seed.apCapacity ?? STARTING_AP)` is the real per-hand reset path and this
 * function is never actually called on the live per-hand transition. If a future refactor stops
 * remounting per hand, this function becomes live again and will silently drop purchased AP
 * capacity unless it is made capacity-aware first.
 */
export function refreshActionPointsForNewHand(currentAp: ActionPoints): ActionPoints {
  if (
    AP_REFRESH_CADENCE === ApRefreshCadence.PerHand ||
    AP_REFRESH_CADENCE === ApRefreshCadence.PerTrick
  ) {
    return STARTING_AP
  }
  return currentAp
}

// actionPoints.ts — THE statement of the per-hand pool once bought capacity is counted.
/**
 * DLR-116 AC2 — `bonus` is a COUNT of purchases, not a point total; `AP_CAPACITY_STEP` is the
 * one place the multiplication happens. A negative or non-finite `bonus` returns `STARTING_AP`
 * rather than producing a `NaN` pool — a `NaN` pool renders nothing and logs nothing.
 */
export function apCapacityFor(bonus: number): ActionPoints {
  if (!Number.isFinite(bonus) || bonus < 0) {
    return STARTING_AP
  }
  return STARTING_AP + AP_CAPACITY_STEP * bonus
}
