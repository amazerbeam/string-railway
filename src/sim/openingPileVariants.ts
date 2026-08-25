/**
 * play-tester (2026-08-25) — WHAT-IF opening piles, for measuring
 * `.docs/ai-play-tester/buffs-weak-at-run-start.md`'s recommendation before anyone commits it.
 *
 * Lives in `src/sim/` and NOT in `src/hunt/startingPile.ts` deliberately: nothing here changes the
 * game. `openingPileWeightOf` remains the production default and every real run still draws exactly
 * as it does today. When the developer adopts a variant, its weight function moves to
 * `startingPile.ts` and becomes that module's default — this file is the measurement, not the fix.
 *
 * Every variant is expressed as a TRANSFORM OF `openingPileWeightOf`, never as a fresh table of
 * numbers. That is DLR-135 AC3's reasoning reused: a second hand-authored weight table would be
 * eleven-plus unchosen figures needing their own balance pass, and a transform states only what the
 * recommendation actually claims — that three families and one axis should not appear, that coins
 * should appear less, and that `sidestep` should appear more.
 *
 * THE FOUR TUNING FIGURES BELOW ARE THIS SKILL'S, not the developer's, and exist to be measured
 * rather than shipped — see that document's "Not yet measured" section.
 */
import {
  BuffKind,
  BuffRewardAxis,
  createSeededRng,
  openingPileWeightOf,
  seedStartingBuffPile,
  startingPileSeedFor,
  STARTING_BUFF_COUNT,
  type BuffTemplate,
  type RunState,
} from '../hunt'

/** The three condition families the recommendation removes: each cannot fire in fight 0 at all
 *  (`miser` needs coins that do not exist yet, `keepsake` needs a final trick it never reaches) or
 *  can only fire once the fight is already lost (`cornered`). */
export const EXCLUDED_OPENING_KINDS: ReadonlySet<string> = new Set([
  BuffKind.Miser,
  BuffKind.Keepsake,
  BuffKind.Cornered,
])

/** The reward axis the recommendation removes. AP is not the binding constraint in fight 0, so a
 *  refund buys more presses of cards that are not paying. Measured at −5.3pp. */
export const EXCLUDED_OPENING_AXIS: BuffRewardAxis = BuffRewardAxis.ApRefund

/** Coins are DEFERRED rather than wasted — unspendable during fight 0, but banked for the shop
 *  after it — so the recommendation cuts them back instead of removing them. UNIT: multiplier on
 *  the template's existing weight. SKILL-CHOSEN. */
export const COINS_WEIGHT_FACTOR = 0.5

/** `sidestep` is the only card measured to both raise the win rate and shorten the fight, and it
 *  sits at 3/58 of opening weight. UNIT: multiplier on the template's existing weight.
 *  SKILL-CHOSEN. */
export const SIDESTEP_WEIGHT_FACTOR = 3

/** Removals only — the three dead condition families, nothing else. Isolates what excluding them is
 *  worth before the axis change and the `sidestep` boost are layered on. */
export function conditionsOnlyOpeningWeightOf(template: BuffTemplate): number {
  return EXCLUDED_OPENING_KINDS.has(template.kind) ? 0 : openingPileWeightOf(template)
}

/**
 * The full recommendation: the three dead families removed, the `apRefund` axis removed, `coins`
 * halved, `sidestep` tripled.
 *
 * Reads `template.form` before `template.axis` because an ACTIVATED template (Cheat, Timebomb) has
 * no axis — the same guard `familyAxisTotalsFor` already makes for the same reason. Those two are
 * deliberately left at their existing weight: their 0.0% fire rate is an artefact of no policy
 * pressing them, not a property of the cards.
 */
export function recommendedOpeningWeightOf(template: BuffTemplate): number {
  if (EXCLUDED_OPENING_KINDS.has(template.kind)) return 0
  const base = openingPileWeightOf(template)
  if (base === 0) return 0
  if (template.kind === BuffKind.Sidestep) return base * SIDESTEP_WEIGHT_FACTOR
  if (template.form !== 'condition') return base
  if (template.axis === EXCLUDED_OPENING_AXIS) return 0
  if (template.axis === BuffRewardAxis.Coins) return base * COINS_WEIGHT_FACTOR
  return base
}

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

/** The variants `--pile <name>` selects, mirroring `POLICIES`' shape. `baseline` is absent on
 *  purpose: "no transform" is expressed by passing no variant at all, not by a function that
 *  returns `openingPileWeightOf` unchanged. */
export const OPENING_PILE_VARIANTS: Readonly<
  Record<string, (template: BuffTemplate) => number>
> = {
  conditionsOnly: conditionsOnlyOpeningWeightOf,
  recommended: recommendedOpeningWeightOf,
}
