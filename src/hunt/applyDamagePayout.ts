import { APPLY_DAMAGE_DELAY_TRICKS } from './config'

/** A cash-out pressed but not yet dealt. Every figure FROZEN at the press. */
export interface PendingApplyPayout {
  /** The full `cashValue` at the press. Never recomputed. */
  readonly cashOut: number
  /** Trick resolutions still to survive. Strictly positive while queued. */
  readonly resolutionsOwed: number
  /** AC4 — the player's hand size at the press, for `quickKillPayout`. */
  readonly unplayedAtPress: number
}

/** AC5's hook. Both fields are optional and every caller today passes nothing. */
export interface ApplyDamageDelayModifiers {
  /** Buffs that SHORTEN the delay. Summed by the caller; clamped at 0 here. */
  readonly shortenBy?: number
  /** Buffs that REMOVE the delay outright. Wins over `shortenBy`. */
  readonly removeDelay?: boolean
}

/**
 * AC5 — THE single statement of how long the delay is. Never a literal `1` at a call site.
 *
 * Returns `0` when `modifiers.removeDelay` is true, which wins over `shortenBy` outright.
 * Otherwise returns `APPLY_DAMAGE_DELAY_TRICKS - shortenBy`, clamped at `0` — a non-finite or
 * absent `shortenBy` falls back to `0` rather than propagating a `NaN`.
 */
export function applyDamageDelayTricks(modifiers?: ApplyDamageDelayModifiers): number {
  if (modifiers?.removeDelay) return 0
  const rawShortenBy = modifiers?.shortenBy
  const shortenBy = rawShortenBy !== undefined && Number.isFinite(rawShortenBy) ? rawShortenBy : 0
  return Math.max(0, APPLY_DAMAGE_DELAY_TRICKS - shortenBy)
}

/**
 * Freezes a press into a queued payout. Throws `RangeError` on a non-positive or non-finite
 * `cashOut`, or a negative or non-finite `unplayedAtPress` — a caller that skipped
 * `applyDamageRefusalFor` is a caller bug, and a NaN payout would vanish into a health bar with
 * nothing logged, the same guard discipline `quickKillPayout` and `flaskHealAmount` already use.
 */
export function queueApplyPayout(
  cashOut: number,
  unplayedAtPress: number,
  modifiers?: ApplyDamageDelayModifiers,
): PendingApplyPayout {
  if (!Number.isFinite(cashOut) || cashOut <= 0) {
    throw new RangeError(
      `Cannot queue an Apply Damage payout of ${cashOut}: cashOut must be a finite number greater than zero`,
    )
  }
  if (!Number.isFinite(unplayedAtPress) || unplayedAtPress < 0) {
    throw new RangeError(
      `Cannot queue an Apply Damage payout with unplayedAtPress ${unplayedAtPress}: it must be a finite count of zero or more`,
    )
  }
  return {
    cashOut,
    unplayedAtPress,
    resolutionsOwed: applyDamageDelayTricks(modifiers) + 1,
  }
}

/** One trick resolution's effect on the queue. `pending` is what to store; `due` is what to pay,
 *  and exactly one of them is non-null when the input was non-null. */
export interface ApplyPayoutTick {
  readonly pending: PendingApplyPayout | null
  readonly due: PendingApplyPayout | null
}

/**
 * Decrements, and reports the payout as due when it reaches zero OR when `handEnding` is true —
 * the plan's "an outstanding payout lands at the resolution of the hand's final trick". NEVER
 * throws: it runs inside a reducer, where a throw would unmount the tree. `null` in gives
 * `{ pending: null, due: null }`.
 *
 * Compares the decremented count with `<= 0` rather than `=== 0`, so a corrupted counter still
 * terminates rather than queueing forever.
 */
export function tickApplyPayout(
  pending: PendingApplyPayout | null,
  handEnding: boolean,
): ApplyPayoutTick {
  if (pending === null) return { pending: null, due: null }
  const next = pending.resolutionsOwed - 1
  if (next <= 0 || handEnding) return { pending: null, due: pending }
  return { pending: { ...pending, resolutionsOwed: next }, due: null }
}
