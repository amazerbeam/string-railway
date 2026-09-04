/**
 * DLR-161 — split out of `streak.ts` to keep it under the 400-line budget. What a streak is
 * worth when CASHED (`potValue`, `applyPot`, `incomingFromPot`) is a separable concept from what
 * ONE TRICK does to the streak, which stays in `streak.ts`. Behaviour-neutral: every symbol here
 * is moved verbatim, docblocks included.
 */
import { DuelSide, type IncomingDamage } from '../hunt'
import { EMPTY_STREAK, type StreakState } from './streak'

/**
 * The figure a total of `total` at a roll of `roll` is worth IN FULL — the plain
 * product. THE one statement of it: `applyPot` is now the only cash-out this game has, so there
 * is only one caller left to disagree about what it is a share OF.
 *
 * Floors a non-integer, non-positive, NaN or infinite input to 0 rather than propagating it, for
 * the reason `safeBonus`'s own guard (in `streak.ts`) states: this figure feeds damage, then a
 * rendered heart row, so a NaN would vanish into a health bar with nothing logged anywhere
 * (`web-project.md` → "NaN propagates silently"). Every real input is a non-negative integer, so
 * this is a guard rather than a live path.
 *
 * Renamed from `cashValue`. Guard and reasoning kept verbatim.
 */
export function potValue(total: number, roll: number): number {
  if (!Number.isInteger(total) || !Number.isInteger(roll) || total <= 0 || roll <= 0) {
    return 0
  }
  return total * roll
}

/** DLR-156 AC5 — the apply choice: deals `potValue(total, roll)` to the Quarry and zeroes both.
 *  Cannot fail — a `StreakState` in, a dealt figure and `EMPTY_STREAK` out. Lifted from
 *  `voluntaryCashOut.ts`'s `cashBankNow`, and renamed to `applyPot`/`incomingFromPot` to match:
 *  there is no longer a second, forced cash-out for this to be a VOLUNTARY alternative to. */
export interface PotApplication {
  readonly streak: StreakState
  readonly dealt: number
}

export function applyPot(streak: StreakState): PotApplication {
  return {
    streak: EMPTY_STREAK,
    dealt: potValue(streak.total, streak.roll),
  }
}

/**
 * The `PlayerSide` -> `DuelSide` crossing for the apply choice, in one named place for the reason
 * `incomingFrom`'s docblock (in `streak.ts`) gives: a caller assembling this record by hand is one
 * transposition away from depleting the wrong bar forever.
 *
 * The player's entry is a hard 0 — AC5's "deals no damage to the player" is this line.
 */
export function incomingFromPot(dealt: number): IncomingDamage {
  return {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: dealt,
  }
}
