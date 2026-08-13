import { DuelSide, type Damage, type Health } from '../../hunt'

/** The two sides, in the order the mirror draws them. Player anchors the left edge, the Quarry
 *  the right, and both deplete toward the centre. */
const BAR_ORDER: readonly DuelSide[] = [DuelSide.Player, DuelSide.Quarry]

/** One side's bar, ready to render. Percentages are of that side's OWN maximum, so the pair stays
 *  comparable by length only while `P = H` holds in config — a fact these views read, never
 *  assume. */
export interface HealthBarView {
  readonly side: DuelSide
  /** Health that survives this Hunt — the solid part of the bar. */
  readonly secure: Health
  /** Health at risk but not yet lost — the lighter segment, carved out of current health. */
  readonly pending: Damage
  readonly current: Health
  readonly max: Health
  readonly securePct: number
  /** `securePct + pendingPct === current / max × 100`, exactly — asserted by the spec. */
  readonly pendingPct: number
  /** This Hunt's pending damage would empty the bar. Rendered as a form change, never colour
   *  alone (`game-ux`). */
  readonly lethal: boolean
}

/**
 * Converts three health records into render geometry.
 *
 * Performs NO damage arithmetic and NO clamping: `applyHunt` — DLR-70's single clamp point — did
 * both before `projected` arrived. That is what keeps DLR-71 AC2's single-function guarantee
 * intact, and it is what DLR-70's own `applyHunt` docblock asks of this caller.
 *
 * Refuses a non-positive or non-finite `max`. The division by `max` is the only one here, and a
 * `NaN` percentage collapses a bar to nothing while logging nothing anywhere — the same reasoning
 * `standingSegments` uses for an empty table. Both configured maxima are positive, so this is a
 * guard rather than a live path.
 *
 * Returns an ARRAY, which is what makes §6's net-only fallback (AC8) a one-line change here —
 * return a single view whose `pending` is the net — rather than a rewrite in the component.
 *
 * PRECONDITION (caller's responsibility, not asserted here): `projected[side] <= current[side]`
 * for both sides. This module performs no clamping by design — `applyHunt` is DLR-70's single
 * clamp point, and a second guard here would duplicate it — so a caller that violates this
 * renders a negative `pending` (and a `pendingPct` below zero) rather than being rejected. It
 * currently holds because every caller derives `projected` either as `current` itself (pending
 * forced to exactly 0) or via `applyHunt`, whose `deplete` is `Math.max(0, current - damage)` and
 * therefore never increases health, and whose `assertApplicable` rejects negative damage. A new
 * caller — a healing mechanic, a different projection source — must preserve this invariant
 * itself.
 */
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
): readonly HealthBarView[] {
  return BAR_ORDER.map((side) => {
    const sideMax = max[side]
    if (!Number.isFinite(sideMax) || sideMax <= 0) {
      throw new RangeError(
        `Cannot draw the ${side}'s health bar against a maximum of ${sideMax}: it must be a positive finite number`,
      )
    }

    const secure = projected[side]
    const pending = current[side] - secure

    return {
      side,
      secure,
      pending,
      current: current[side],
      max: sideMax,
      securePct: (secure / sideMax) * 100,
      pendingPct: (pending / sideMax) * 100,
      lethal: pending > 0 && secure <= 0,
    }
  })
}
