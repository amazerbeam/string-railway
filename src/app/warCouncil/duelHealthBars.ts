import { DuelSide, NO_PENDING_TIMEBOMB, type Damage, type Health } from '../../hunt'

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
  /** DLR-101 — the committed subset of `pending`: booked poison, clamped to the band. At-risk
   *  alone is `pending - doomed`. */
  readonly doomed: Damage
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
 * The five readings a single heart can carry. An `as const` object map rather than an `enum` —
 * `erasableSyntaxOnly` is on in `tsconfig.app.json`.
 *
 * The VALUES are written straight into the DOM as `data-state`, so they are string-bound: this map
 * and `warCouncilHealthBars.css`'s attribute selectors are the only two places they may be
 * written. A rename here type-checks cleanly and renders an unstyled heart. `Doomed` was added on
 * DLR-101 for a standing heart that booked poison has already claimed.
 */
export const HeartState = {
  Whole: 'whole',
  AtRisk: 'atRisk',
  Doomed: 'doomed',
  Breaking: 'breaking',
  Broken: 'broken',
} as const
export type HeartState = (typeof HeartState)[keyof typeof HeartState]

/** No damage event on screen — the shape `duelHealthBars` defaults its `breaking` overlay to. */
export const NO_BREAKING: Readonly<Record<DuelSide, Damage>> = {
  [DuelSide.Player]: 0,
  [DuelSide.Quarry]: 0,
}

/** The two damage records a bar can overlay, keyed by the side each depletes.
 *
 *  An OPTIONS OBJECT rather than two positional arguments, for the reason `bank.ts`'s `TrickFacts`
 *  gives: both are `Readonly<Record<DuelSide, Damage>>`, so a transposed pair type-checks cleanly
 *  and produces a plausible but wrong picture. Naming them makes that a compile error.
 */
export interface HealthBarOverlays {
  /** The damage of the event currently on screen — the `breaking` hearts (DLR-86 AC2). */
  readonly breaking?: Readonly<Record<DuelSide, Damage>>
  /** DLR-101 — poison already booked against each side, i.e. `encounter.pendingTimebomb` passed
   *  through unchanged. COMMITTED, unlike the streak preview: it lands at the resolution of the
   *  next trick and nothing on the felt stops it, which is why it gets its own heart state
   *  rather than reusing `atRisk`. */
  readonly doomed?: Readonly<Record<DuelSide, Damage>>
}

/**
 * AC3's streak preview, plus DLR-101's booked poison — the two things that will deplete a bar
 * without another card being played.
 *
 * RENAMED from `projectedFromStreak` on DLR-101. The old name described half of what this now
 * does, and a second sibling projection function is exactly the drift this module's single-
 * statement discipline exists to prevent.
 *
 * The `Math.max(0, …)` floor is NOT a second damage clamp: `applyDamage` remains DLR-70's single
 * clamp point and this function never feeds it. The floor exists solely to uphold
 * `duelHealthBars`'s documented `projected <= current` precondition, which a negative projection
 * would violate and turn into a negative `pending`. It now covers BOTH sides, because poison is
 * booked symmetrically while the streak only ever depletes the Quarry.
 *
 * Surplus is discarded by the heart row's own length rather than here, which is what keeps AC5's
 * "overkill leaves no trace" a single rule rather than two that can drift.
 */
export function projectedDepletion(
  current: Readonly<Record<DuelSide, Health>>,
  bank: number,
  multiplier: number,
  pendingPoison: Readonly<Record<DuelSide, Damage>>,
): Readonly<Record<DuelSide, Health>> {
  return {
    [DuelSide.Player]: Math.max(0, current[DuelSide.Player] - pendingPoison[DuelSide.Player]),
    [DuelSide.Quarry]: Math.max(
      0,
      current[DuelSide.Quarry] - bank * multiplier - pendingPoison[DuelSide.Quarry],
    ),
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
 * `overlays.breaking` is the damage dealt by the event currently on screen, already keyed by the
 * side it depletes — `incomingFrom` performed that crossing before this module ever sees it. It
 * defaults to `NO_BREAKING` so every existing call site compiles unchanged; only a caller that
 * wants a "breaking" heart passes it. `overlays.doomed` is DLR-101's booked poison, defaulting to
 * `NO_PENDING_TIMEBOMB`.
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
 * whose `assertApplicable` rejects negative damage, or via `projectedDepletion`, which floors both
 * sides' projection at zero for the same reason. A new caller — a healing mechanic, a different
 * projection source — must preserve this invariant itself.
 */
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
  overlays: HealthBarOverlays = {},
): readonly HealthBarView[] {
  const breaking = overlays.breaking ?? NO_BREAKING
  const doomedBySide = overlays.doomed ?? NO_PENDING_TIMEBOMB

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
    // The ONE clamp on booked poison, and the only arithmetic this function performs on it.
    // `pending` is non-negative by the upheld precondition, so `doomed` is too.
    const doomed = Math.min(doomedBySide[side], pending)
    // The innermost standing heart the streak's conditional preview reaches. Below it the band is
    // committed: poison lands at the next trick and nothing on the felt stops it.
    const atRiskEnd = current[side] - doomed

    return {
      side,
      secure,
      pending,
      doomed,
      current: current[side],
      max: sideMax,
      lethal: pending > 0 && secure <= 0,
      hearts: Array.from({ length: sideMax }, (_, i) => {
        if (i < secure) return HeartState.Whole
        if (i < atRiskEnd) return HeartState.AtRisk
        if (i < current[side]) return HeartState.Doomed
        if (i < current[side] + broke) return HeartState.Breaking
        return HeartState.Broken
      }),
    }
  })
}
