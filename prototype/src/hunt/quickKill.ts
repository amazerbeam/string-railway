import { QUICK_KILL_TIER_MULTIPLIERS } from './config'
import type { Coins } from './types'

/**
 * DLR-95 AC2 — everything the quick-kill rule needs, and nothing else. The sibling of `FlaskStock`
 * and `ShopStock`, for their stated reason: this module owns the payout's rule and must not learn
 * the run's shape or the card layer's. `runTransitions.ts`'s `recordEncounter` builds it.
 */
export interface QuickKill {
  /** Cards still in the player's hand at the instant the Quarry's bar emptied. Counted AFTER the
   *  killing trick's own card has left the hand, which is what makes the design doc's worked
   *  example (five left after one trick of six) come out at 10. */
  readonly unplayedCards: number
  /** Which hand OF THE FIGHT the kill landed in. 1-BASED: the fight's first hand is 1, not 0.
   *  Deliberately NOT the run-global hand counter — see `RunState.handOfFight`. */
  readonly handOfFight: number
}

/**
 * AC2/AC5 — the tier, expressed as COINS PER UNPLAYED CARD. THE only reader of
 * `QUICK_KILL_TIER_MULTIPLIERS`.
 *
 * A hand past the end of the configured curve returns 0. That is AC5's taper rather than an error:
 * "a kill on the fourth hand or later pays exactly 0 from this mechanic — a deliberate taper, not
 * a bug". The array's LENGTH is therefore the rule, so re-shaping the curve is a config edit.
 *
 * Throws on a hand number that is not a positive integer rather than indexing with it. A
 * fractional or `NaN` index yields `undefined`, which would become `NaN` on the multiply, land in
 * `coins`, and vanish from the purse with nothing logged anywhere — the numeric-safety trap
 * `web-project.md` names. `flaskHealAmount` guards its own input for exactly this reason.
 */
export function quickKillTierMultiplier(handOfFight: number): number {
  if (!Number.isInteger(handOfFight) || handOfFight < 1) {
    throw new RangeError(
      `Cannot price a quick kill on hand ${handOfFight} of the fight: it must be a positive integer, counting from 1`,
    )
  }
  return QUICK_KILL_TIER_MULTIPLIERS[handOfFight - 1] ?? 0
}

/**
 * AC2/AC4 — the payout. THE only place `Math.floor` is applied to this figure, so a fractional
 * third-tier result can never reach `Coins`, which `types.ts` documents as "a whole number...
 * never fractional".
 *
 * Floors rather than rounds, deliberately: AC4 asks that the rounding artefact never fall in the
 * player's favour.
 *
 * The multiplication needs no numerator/denominator split — `2`, `1` and `0.5` are all exactly
 * representable in binary, so the product is exact and the floor only ever removes a genuine `.5`.
 */
export function quickKillPayout(kill: QuickKill): Coins {
  if (!Number.isFinite(kill.unplayedCards) || kill.unplayedCards < 0) {
    throw new RangeError(
      `Cannot pay a quick kill for ${kill.unplayedCards} unplayed cards: it must be a finite count of zero or more`,
    )
  }
  return Math.floor(kill.unplayedCards * quickKillTierMultiplier(kill.handOfFight))
}
