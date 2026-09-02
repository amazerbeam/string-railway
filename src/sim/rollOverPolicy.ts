/**
 * play-tester (2026-09-02) — THE ROLL-OVER POLICIES.
 *
 * `SimPolicy.wantsApplyPot` has existed since DLR-156 and NO policy has ever implemented it, so
 * every figure this simulator has ever printed was produced under `playHand.ts`'s modelling
 * default: apply the pot the instant a trick banks. That pins `roll` at 1 and `total` at one
 * trick's damage forever, which means the squaring at the heart of the game — the pot is
 * `total x roll`, and both climb together while a streak survives — has never once been measured.
 * Bare play is documented as paying 1, 4, 9, 16, 25, 36 for a streak of 1..6; the never-push floor
 * only ever collects the 1.
 *
 * This module supplies the missing half. It is a WRAPPER, not a new player: it takes an existing
 * policy and overrides `wantsApplyPot` alone, by reference for every other method, so any gap
 * between `cardAware` and `cardAwareRoll4` is attributable to the push and to nothing else.
 *
 * THE STOPPING RULE, in two clauses:
 *
 * 1. **Cash a kill immediately.** If the pot already standing meets or beats the Quarry's remaining
 *    health, apply — pushing a lethal pot risks everything to win nothing, since overkill damage is
 *    discarded and the streak dies with the fight anyway.
 * 2. **Otherwise push until `roll` reaches the target.** A pure threshold, and deliberately a crude
 *    one: the real optimum is to cash at roll `r` once the chance of banking the next trick falls
 *    below `r / (r + 1)`, and a scripted policy cannot know that probability. Sweeping the
 *    threshold across the registered variants is what recovers the curve empirically.
 *
 * WHAT IT DELIBERATELY DOES NOT READ: the player's health. A hurt trick costs 1 health whether a
 * pot was standing or not, so cashing early protects the pot and never the bar — folding health in
 * would measure a superstition rather than the bet.
 */
import { potValue } from '../warCouncil'
import { DuelSide } from '../hunt'
import type { RoundUiState } from '../app/warCouncil/roundUiState'
import type { SimPolicy } from './types'

/**
 * The roll thresholds the registry exposes, as `cardAwareRoll<N>`. A SWEEP rather than a chosen
 * value: nobody has played the push, so the point of these is to print the curve and let the
 * developer read the peak off it. `1` is the never-push floor stated as a policy rather than as an
 * absence, so the baseline appears in the same sweep on the same axis as every push above it.
 * UNIT: banked tricks held before cashing.
 */
export const ROLL_TARGET_SWEEP: readonly number[] = [1, 2, 3, 4, 5, 6, 8]

/** The pot standing on the resolution screen right now, in the same terms `applyPot` will pay it.
 *  Reads `potValue` — the engine's own single statement of `total x roll` — rather than
 *  multiplying here, so the policy and the payout cannot disagree about what is at stake. */
function standingPot(ui: RoundUiState): number {
  const resolution = ui.resolution
  if (resolution === null) return 0
  return potValue(resolution.resolution.total, resolution.resolution.roll)
}

/**
 * Wraps `base` with a roll threshold. Every other method is passed through BY REFERENCE — that is
 * what makes a difference in the printed figures attributable to the push alone, the same
 * discipline `cardAwarePolicy` follows in reusing the baseline's shop method.
 *
 * Throws on a non-integer or sub-1 target rather than clamping: a target of 0 would ask the driver
 * to roll over forever and report a stalled run, which reads as an engine bug rather than as the
 * caller error it is.
 */
export function withRollTarget(base: SimPolicy, targetRoll: number, name: string): SimPolicy {
  if (!Number.isInteger(targetRoll) || targetRoll < 1) {
    throw new RangeError(
      `Cannot build a roll-over policy at a target of ${targetRoll}: it must be an integer of 1 or more`,
    )
  }
  return {
    ...base,
    name,
    wantsApplyPot(ui: RoundUiState): boolean {
      const resolution = ui.resolution
      if (resolution === null) return true
      const quarryHealth = ui.encounter.health[DuelSide.Quarry]
      if (standingPot(ui) >= quarryHealth) return true
      return resolution.resolution.roll >= targetRoll
    },
  }
}

/** `{ cardAwareRoll1: …, cardAwareRoll2: …, … }` over `ROLL_TARGET_SWEEP`, built from `base`.
 *  A factory rather than seven hand-written objects: the sweep's VALUES are the thing worth
 *  reading, and seven near-identical literals is exactly the registry-maintenance cost this
 *  project's play-testing guidance warns about. */
export function rollTargetPolicies(
  base: SimPolicy,
  prefix: string,
): Readonly<Record<string, SimPolicy>> {
  const entries = ROLL_TARGET_SWEEP.map((target): readonly [string, SimPolicy] => {
    const name = `${prefix}Roll${target}`
    return [name, withRollTarget(base, target, name)]
  })
  return Object.fromEntries(entries)
}
