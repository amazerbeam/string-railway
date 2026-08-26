/**
 * play-tester (2026-08-25) — WHAT-IF opening piles, for measuring
 * `.docs/ai-play-tester/buffs-weak-at-run-start.md`'s recommendation before anyone commits it.
 *
 * DLR-145 SUPERSEDED both named variants: `conditionsOnlyOpeningWeightOf` zeroed exactly the three
 * families (`miser`, `keepsake`, `cornered`) DLR-145 has already pruned out of `BUFF_TEMPLATES`
 * entirely, and `recommendedOpeningWeightOf` compared a template's axis against `apRefund` and
 * `coins` — both cut from `ConditionBuffTemplate.axis`'s type, so that comparison no longer
 * compiles (`MintableRewardAxis` has no `'coins'` or `'apRefund'` member). The reduced pool now *IS*
 * the recommendation those variants existed to measure: nothing left in `BUFF_TEMPLATES` pays on the
 * removed axis or belongs to a removed family, so weighting them out again would be a no-op over an
 * already-pruned pool.
 *
 * `withOpeningPile` and `OPENING_PILE_VARIANTS` are KEPT, empty of named variants, so
 * `SimConfig.openingPileVariant`, `playRun.ts`'s lookup and the `--pile` flag need no edit — an
 * unknown `--pile <name>` still fails the same way it always did, just with no names left to ask
 * for. A future what-if pile is a new entry in `OPENING_PILE_VARIANTS`, not a structural change
 * here.
 */
import {
  createSeededRng,
  seedStartingBuffPile,
  startingPileSeedFor,
  STARTING_BUFF_COUNT,
  type BuffTemplate,
  type RunState,
} from '../hunt'

/**
 * `run` with its OPENING PILE redrawn under `weightOf`, everything else untouched.
 *
 * Replaces exactly the `STARTING_BUFF_COUNT` cards `startRun` seeded at ids `1..STARTING_BUFF_COUNT`
 * and keeps every later pile member — the Vault's grants and `RUN_STARTING_CHEATS`' opening Cheat —
 * in place, so this varies the drawn pile and nothing else. Ids and `nextBuffId` are therefore
 * unchanged, which matters: `nextBuffId` is what every later mint counts from.
 *
 * Uses the run's OWN `startingPileSeedFor(runSeed)` stream, so variant and baseline runs of the same
 * seed differ only by the weighting, not by a different random sequence.
 */
export function withOpeningPile(
  run: RunState,
  weightOf: (template: BuffTemplate) => number,
): RunState {
  const redrawn = seedStartingBuffPile(
    STARTING_BUFF_COUNT,
    1,
    createSeededRng(startingPileSeedFor(run.runSeed)),
    weightOf,
  )
  return { ...run, buffs: [...redrawn, ...run.buffs.slice(STARTING_BUFF_COUNT)] }
}

/** The variants `--pile <name>` selects, mirroring `POLICIES`' shape. Empty as of DLR-145 — see
 *  this module's docblock for why both named variants were superseded rather than ported.
 *  `baseline` is absent on purpose: "no transform" is expressed by passing no variant at all, not
 *  by a function that returns `openingPileWeightOf` unchanged. */
export const OPENING_PILE_VARIANTS: Readonly<Record<string, (template: BuffTemplate) => number>> =
  {}
