import { QuarryCharacter, type Demand } from './types'

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

// DLR-63 AC3's `12 − r`. NOT a tuning value: 12 is max(RANKS) + 1 for the 1-11 deck,
// so the inversion is symmetric (rank 1 <-> 11) and its own inverse. Named rather than
// inlined so a future deck-size change has exactly one place to look.
export const RANK_INVERSION_PIVOT = 12

/**
 * DLR-63 AC3 — a card's value on the Lose path. Deliberately the same
 * `(rank: number) => number` signature as `cardBaseValue`, so it drops into `spoils`'s
 * injectable value parameter with no new plumbing.
 */
export function invertedCardValue(rank: number): number {
  return RANK_INVERSION_PIVOT - rank
}

// DLR-63 AC3 "a capped number of Lose-credits".
// UNIT: credits per Hunt — each spendable on exactly one lost trick.
// VALUE: a DEVELOPER DECISION (DLR-63 plan.md -> Risks). The number below is derived
// arithmetic offered for review, not a chosen value: against FIXED_DEMAND (220) and
// STANDING_BANDS' Humble x6, a credited trick is worth the two cards' inverted values —
// about 12 on an average trick, up to 22 on a two-Swan trick. Clearing 220 therefore
// needs roughly 220 / (6 * 12) ~= 3 average credited tricks, or 2 in the best case.
// 3 sits at that break-even and is the number most likely to move after the first
// playtest. Typed `number`, never `number | null`, so no consumer can coerce a null to 0.
export const LOSE_CREDITS_PER_HUNT = 3

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

export const TelegraphFidelity = {
  Suit: 'suit', // narrowest — only the lead suit is telegraphed
  SuitAndStance: 'suitAndStance', // §4's stated default — suit plus pressing/ducking
} as const
export type TelegraphFidelity = (typeof TelegraphFidelity)[keyof typeof TelegraphFidelity]

// §4's visibility table / DLR-52 AC4 — the Quarry's next-trick intent is telegraphed at this
// fidelity, never as the exact card, so §4's hidden-hand row is never violated. Conservative
// default named at the DLR-52 planning gate; the single value most likely to move after T8's
// playtest.
export const TELEGRAPH_FIDELITY: TelegraphFidelity = TelegraphFidelity.SuitAndStance

// §11 "one fixed Demand": the slice checks Score against a single target rather than a
// curve. DEMAND_CURVE stays null-valued — the rising curve is T9's run state, not this.
// UNIT: score points, compared against `Spoils × Standing` by `checkDemand`.
// VALUE: a developer decision (DLR-53 plan.md → Risks). 220 is the placeholder recorded
// at the DLR-53 planning gate so the slice is playable — it is not a derived constant and
// it is the number most likely to move after T8's playtest.
export const FIXED_DEMAND: Demand = 220

// §11 "any single character is sufficient; which of the five is not load-bearing". Not a
// tuning value: DLR-51 enforces only the Monarch's rule-break and QUARRY_CHARACTERS holds
// only its copy, so this is forced by what is implemented. It exists as a key so T13 has
// exactly one place to change when the other four characters land.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch
