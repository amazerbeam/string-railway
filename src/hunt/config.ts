export const StandingBandName = {
  Humble: 'humble',
  Defeated: 'defeated',
  Victorious: 'victorious',
  Greedy: 'greedy',
} as const
export type StandingBandName = (typeof StandingBandName)[keyof typeof StandingBandName]

export interface StandingBand {
  readonly minTricks: number
  readonly maxTricks: number
  readonly name: StandingBandName
  readonly multiplier: number
}

// §9 "Standing multipliers" — provisional, transcribed from the printed table.
// Undecided per §9/§6: at these values Victorious dominates Humble by
// construction; §6 computes the break-even at ×18. Band *boundaries* are
// fixed by §1 — only the multiplier column is a live decision.
export const STANDING_BANDS: readonly StandingBand[] = [
  { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 6 },
  { minTricks: 4, maxTricks: 4, name: StandingBandName.Defeated, multiplier: 1 },
  { minTricks: 5, maxTricks: 5, name: StandingBandName.Defeated, multiplier: 2 },
  { minTricks: 6, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 3 },
  { minTricks: 7, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 6 },
  { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 0 },
]

/**
 * Resolves a trick count to its Standing band by scanning `table` (default
 * STANDING_BANDS) — the only place in src/ that performs this lookup for the
 * Hunt config. `warCouncil/scoring.ts`'s `tricksToPoints` keeps its own copy
 * until a future ticket migrates it to call this (DLR-48 AC7).
 */
export function resolveStanding(
  tricks: number,
  table: readonly StandingBand[] = STANDING_BANDS,
): StandingBand {
  const band = table.find((b) => tricks >= b.minTricks && tricks <= b.maxTricks)
  if (!band) {
    throw new RangeError(`No Standing band configured for trick count ${tricks}`)
  }
  return band
}

// §9 "Card base values" — provisional: a card's value is its printed rank,
// not flat 1 (§3, §9 — flat 1 collapses Spoils×Standing to the
// single-variable function 2k×f(k); rank weighting keeps the two terms
// independent).
export function cardBaseValue(rank: number): number {
  return rank
}

export interface DemandCurve {
  readonly base: number | null
  readonly growthPerEncounter: number | null
}

// §9 "Demand base and growth rate" — shape only, undecided. No default is
// assumed: both fields stay null until the developer sets them, per playtest
// direction at the DLR-48 planning gate (2026-08-10). A consumer must not
// coerce null to 0.
export const DEMAND_CURVE: DemandCurve = {
  base: null,
  growthPerEncounter: null,
}

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — undecided in §9 itself; DLR-48 AC3 sets a
// provisional 5 so the prototype is playable.
export const ENCOUNTERS_PER_RUN = 5
