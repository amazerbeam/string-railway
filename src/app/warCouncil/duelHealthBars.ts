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
  /** Exactly `max` entries, ordered from this side's anchored edge inward. Replaces the two
   *  percentages: with a row of fixed-size glyphs there is no width to communicate, so nothing
   *  divides by `max` any more. */
  readonly hearts: readonly HeartState[]
  /** This Hunt's pending damage would empty the bar. Rendered as a form change, never colour
   *  alone (`game-ux`). */
  readonly lethal: boolean
}

/**
 * The four readings a single heart can carry. An `as const` object map rather than an `enum` —
 * `erasableSyntaxOnly` is on in `tsconfig.app.json`.
 *
 * The VALUES are written straight into the DOM as `data-state`, so they are string-bound: this map
 * and `warCouncilHealthBars.css`'s attribute selectors are the only two places they may be
 * written. A rename here type-checks cleanly and renders an unstyled heart.
 */
export const HeartState = {
  Whole: 'whole',
  AtRisk: 'atRisk',
  Breaking: 'breaking',
  Broken: 'broken',
} as const
export type HeartState = (typeof HeartState)[keyof typeof HeartState]

/** No damage event on screen — the shape `duelHealthBars` defaults its fourth argument to. */
export const NO_BREAKING: Readonly<Record<DuelSide, Damage>> = {
  [DuelSide.Player]: 0,
  [DuelSide.Quarry]: 0,
}

/**
 * AC3 — the Quarry's health as the current streak would leave it, with the player untouched.
 *
 * The `Math.max(0, …)` floor is NOT a second damage clamp: `applyDamage` remains DLR-70's single
 * clamp point and this function never feeds it. The floor exists solely to uphold
 * `duelHealthBars`'s documented `projected <= current` precondition, which a negative projection
 * would violate and turn into a negative `pending`.
 *
 * Surplus is discarded by the heart row's own length rather than here, which is what keeps AC5's
 * "overkill leaves no trace" a single rule rather than two that can drift.
 */
export function projectedFromStreak(
  current: Readonly<Record<DuelSide, Health>>,
  bank: number,
  multiplier: number,
): Readonly<Record<DuelSide, Health>> {
  return {
    [DuelSide.Player]: current[DuelSide.Player],
    [DuelSide.Quarry]: Math.max(0, current[DuelSide.Quarry] - bank * multiplier),
  }
}

/**
 * Converts three health records into render geometry.
 *
 * Performs NO damage arithmetic and NO clamping: `applyDamage` — DLR-70's single clamp point — did
 * both before `projected` arrived. That is what keeps DLR-71 AC2's single-function guarantee
 * intact, and it is what DLR-70's own `applyDamage` docblock asks of this caller.
 *
 * Refuses a `max` that is not a positive integer. `max` stopped being a divisor once the bar
 * became a row of discrete hearts — it is now an array length, and `Array.from({ length: sideMax
 * }, …)` against a non-integer, non-positive, `NaN` or infinite value would silently produce a
 * wrong-length or empty row rather than throwing anywhere. The guard is the same
 * guard-rather-than-live-path reasoning this codebase applies to any other configured total; both
 * configured maxima are positive integers, so this is a guard rather than a live path.
 *
 * `breaking` is the damage dealt by the event currently on screen, already keyed by the side it
 * depletes — `incomingFrom` performed that crossing before this module ever sees it. It defaults
 * to `NO_BREAKING` so every existing call site compiles unchanged; only a caller that wants a
 * "breaking" heart passes it.
 *
 * Returns an ARRAY, which is what makes §6's net-only fallback (AC8) a one-line change here —
 * return a single view whose `pending` is the net — rather than a rewrite in the component.
 *
 * PRECONDITION (caller's responsibility, not asserted here): `projected[side] <= current[side]`
 * for both sides. This module performs no clamping by design — `applyDamage` is DLR-70's single
 * clamp point, and a second guard here would duplicate it — so a caller that violates this
 * renders a negative `pending` rather than being rejected. It currently holds because every caller
 * derives `projected` either as `current` itself (pending forced to exactly 0), via `applyDamage`,
 * whose `deplete` is `Math.max(0, current - damage)` and therefore never increases health, and
 * whose `assertApplicable` rejects negative damage, or via `projectedFromStreak`, which floors the
 * Quarry's projection at zero for the same reason. A new caller — a healing mechanic, a different
 * projection source — must preserve this invariant itself.
 */
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
  breaking: Readonly<Record<DuelSide, Damage>> = NO_BREAKING,
): readonly HealthBarView[] {
  return BAR_ORDER.map((side) => {
    const sideMax = max[side]
    if (!Number.isInteger(sideMax) || sideMax <= 0) {
      throw new RangeError(
        `Cannot draw the ${side}'s heart row against a maximum of ${sideMax}: it must be a positive integer, because it is the number of hearts`,
      )
    }

    const secure = projected[side]
    const pending = current[side] - secure
    const broke = breaking[side]

    return {
      side,
      secure,
      pending,
      current: current[side],
      max: sideMax,
      lethal: pending > 0 && secure <= 0,
      hearts: Array.from({ length: sideMax }, (_, i) => {
        if (i < secure) return HeartState.Whole
        if (i < current[side]) return HeartState.AtRisk
        if (i < current[side] + broke) return HeartState.Breaking
        return HeartState.Broken
      }),
    }
  })
}
