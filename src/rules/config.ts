/**
 * Tuning values the engine is injected with. Every field is a tunable read from
 * rules.json (M2 / M6 / M8) — none may ever appear as a literal in src/.
 * SCRUM-3a owns the file, its loader and its validation.
 */
export interface RulesConfig {
  /** M2 — nominal arc length of a short railway string, world units. */
  readonly shortStringLength: number
  /** M2 — nominal arc length of a long railway string, world units. */
  readonly longStringLength: number
  /** M6 — permitted deviation from nominal, as a fraction (0.02 = ±2%). Inclusive. */
  readonly arcLengthTolerance: number
  /** M8 — how close a near-touch must be before §10.2 check 10 rejects it, world units. */
  readonly tangencyTolerance: number
  /** M2 — station card footprint (square), world units. Also the search sampling step. */
  readonly cardSize: number
}
