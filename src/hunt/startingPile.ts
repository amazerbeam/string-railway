import { BuffTier, type Buff, type BuffId } from './buffs'
import { BUFF_TEMPLATES, mintFromTemplate, type BuffTemplate } from './buffTemplates'
import { createSeededRng, mixSeed, type Rng } from './seededRng'
import { SLOT_MACHINE_IDS } from './slotConfig'
import { templateWeightFor, weightedDrawWithoutReplacement } from './slotWeights'

/**
 * DLR-135 — the run's OPENING PILE, drawn for real.
 *
 * This module replaces the placeholder factory DLR-105 shipped in `buffs.ts`, which minted
 * `STARTING_BUFF_COUNT` `BuffKind.Unassigned` stubs "since the real catalog (design doc §5) is not
 * yet authored". DLR-111 authored it and DLR-112 built the reel that draws from it; the scaffold
 * outlived its reason, and every one of its four cards was filtered straight back out by
 * `activatableBuffs`, so a run opened holding exactly one usable card.
 *
 * It lives HERE and not in `buffs.ts` because it must import `buffTemplates.ts` and
 * `slotWeights.ts`, and both of those import `buffs.ts` — keeping it there would open exactly the
 * cycle `slotWeights.ts`'s own docblock refuses to open for `warCouncil`.
 *
 * Deliberately the sibling of `slotMachine.ts`'s `drawReelPool`: derive a named seed from
 * `runSeed`, weight the pool, draw distinct templates without replacement, throw on a short draw,
 * mint at a fixed tier with consecutive ids. One pattern applied twice, not two designs.
 *
 * Nothing here calls `Math.random()` — `src/hunt/` is lint-enforced pure and DLR-130's simulator
 * and the developer's balance pass both require the same seed to reproduce the same opening hand.
 */

/** The opening pile's own seed stream, folded from `runSeed`. A ONE-part `mixSeed` fold, distinct
 *  in shape from `dealSeedFor`'s and `slotSeedFor`'s three-part folds, and a named function for
 *  the reason every other seed in this tree has one. Pure; always a non-negative 32-bit integer.
 *  UNIT: 32-bit unsigned integer. */
export function startingPileSeedFor(runSeed: number): number {
  return mixSeed(runSeed)
}

/**
 * A template's weight for the OPENING pile: the SUM of its per-machine reel weight across every
 * `SLOT_MACHINE_IDS` member.
 *
 * DERIVED, and that is the whole point — it contributes NO NUMBER OF ITS OWN. DLR-135's AC3
 * forbids changing a tuning value, and a third `SLOT_FAMILY_WEIGHTS`-shaped table for the opening
 * pile would have been eleven-plus unchosen numbers needing their own balance pass. Summing is
 * also machine-NEUTRAL: the opening pile is not a slot machine, and taking one machine's table
 * would silently hand every run that machine's lean (Skirmisher's trick bias, Strongbox's coin
 * bias) with nobody having chosen it.
 *
 * `templateWeightFor` already returns 0 rather than dividing when its denominator is 0, so no
 * `NaN` can enter this sum, and a sum of non-negative finite terms is non-negative and finite.
 * UNIT: relative weight, >= 0, unitless.
 */
export function openingPileWeightOf(template: BuffTemplate): number {
  return SLOT_MACHINE_IDS.reduce(
    (total, machineId) => total + templateWeightFor(machineId, template),
    0,
  )
}

/**
 * `count` DISTINCT real BRONZE cards drawn from `BUFF_TEMPLATES`, with consecutive ids from
 * `firstId` — the same `(count, firstId)` shape `mintGrants` and `mintPullAwards` already use.
 *
 * `rng` is REQUIRED, not defaulted. A defaulted generator would let a call site drop determinism
 * with no compile error, and determinism is the one property this function must not lose.
 *
 * Drawn WITHOUT replacement, so the opening hand holds four different cards rather than four
 * copies of one. THROWS `RangeError` on a short draw for `drawReelPool`'s stated reason: a pile
 * shorter than asked is a configuration bug (an all-zero weight table), not a legal state, and it
 * would otherwise surface far from its cause. Unreachable with the shipped tables — 73 templates,
 * every family weighted >= 1 on both machines — but a zeroed row is one edit away.
 *
 * `weightOf` is a DEFAULTED parameter rather than something this function closes over, exactly as
 * `drawReelPool`'s is: a curve can then be tested without mutating module state.
 */
export function seedStartingBuffPile(
  count: number,
  firstId: BuffId,
  rng: Rng,
  weightOf: (template: BuffTemplate) => number = openingPileWeightOf,
): readonly Buff[] {
  const drawn = weightedDrawWithoutReplacement(BUFF_TEMPLATES, weightOf, rng, count)
  if (drawn.length !== count) {
    throw new RangeError(
      `Opening pile drew ${drawn.length} of ${count} cards — check SLOT_FAMILY_WEIGHTS and SLOT_AXIS_WEIGHTS for an all-zero table`,
    )
  }
  return drawn.map((template, index) =>
    mintFromTemplate(template, BuffTier.Bronze, firstId + index),
  )
}

/** The opening pile for ONE run, seeded from `runSeed`. THE call `startRun` makes, so the seed
 *  derivation is stated once rather than at every caller. */
export function startingBuffPileFor(
  count: number,
  firstId: BuffId,
  runSeed: number,
): readonly Buff[] {
  return seedStartingBuffPile(count, firstId, createSeededRng(startingPileSeedFor(runSeed)))
}
