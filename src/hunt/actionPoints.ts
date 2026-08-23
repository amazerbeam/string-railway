import { AP_ENABLED, AP_REFRESH_CADENCE, ApRefreshCadence, STARTING_AP } from './config'
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
 * insufficient-AP spend attempt is a caller bug the same way src/hunt/cheats.ts's
 * removeCheat treats a double-spend, and clamping would silently let a consumer commit an
 * action it could not actually afford.
 */
export function spendAp(pool: ActionPoints, cost: ActionPoints): ActionPoints {
  const effectiveCost = apCostFor(cost)
  if (pool < effectiveCost) {
    throw new RangeError(`Cannot spend ${effectiveCost} AP — only ${pool} available`)
  }
  return pool - effectiveCost
}

/**
 * DLR-104 AC3 — the pool's value at the top of a new hand. Only `PerHand` is implemented
 * today; any other cadence value passes `currentAp` through untouched rather than throwing,
 * which is the shape the ticket's own risk note asks for so a later cadence (per-fight,
 * per-run) needs a new config entry and a new branch here, not a type change.
 */
export function refreshActionPointsForNewHand(currentAp: ActionPoints): ActionPoints {
  if (AP_REFRESH_CADENCE === ApRefreshCadence.PerHand) {
    return STARTING_AP
  }
  return currentAp
}
