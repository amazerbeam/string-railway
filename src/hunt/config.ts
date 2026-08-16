import { QuarryCharacter, DuelSide, type Health, type Damage } from './types'

// §5 "Player health" — DECIDED, and small on purpose: Balatro tracks 4 hands and 3 discards as
// integers held in the head against score requirements in the hundreds and thousands, and §5
// says the asymmetry here is the same shape.
// SET BY THE DEVELOPER 2026-08-14, down from 25. At 2-4 health lost a hand, 25 was roughly eight
// hands and the player's bar was never actually under threat inside a three-hand encounter —
// which made losing a trick cheap enough that throwing trick 1 (no bank to forfeit yet) was close
// to free. 10 makes a hand's worth of losses matter. Replaces DLR-66's 1,350, which belonged to
// the retired Standing arithmetic.
// UNIT: health points, depleted 1 at a time.
export const PLAYER_START_HEALTH: Health = 10

// The Quarry's health, one entry per encounter, in run order.
// AC1 (DLR-82) — at least three entries, rising, not all the same.
// PLACEHOLDER VALUES: the SHAPE is the ticket's, the NUMBERS are the DEVELOPER'S and are listed
// under "Developer decides or observes" in this contract's tasks.md. DLR-82's own risk note
// predicts the player losing around fight three on these numbers and states that this is the
// arithmetic working — the answer is the shop and the flask in later stories, NOT raising
// PLAYER_START_HEALTH.
// Entry 0 keeps 10, set by the developer 2026-08-14 (PT-002) alongside the trick-counting bank:
// at 10 the encounter lasts ~1.9 hands and random legal play wins 63.8%.
// UNIT: health points, indexed 0..n-1 by encounter.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [10, 14, 18]

/**
 * Throws a `RangeError` rather than returning `undefined`: an out-of-range index would
 * otherwise become `NaN` on the first subtraction and vanish from a health bar with no error
 * logged anywhere — a bad index is a caller bug.
 */
export function quarryHealthForEncounter(index: number): Health {
  const health = QUARRY_ENCOUNTER_HEALTH[index]
  if (health === undefined) {
    throw new RangeError(
      `No Quarry health configured for encounter ${index} (${QUARRY_ENCOUNTER_HEALTH.length} configured)`,
    )
  }
  return health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §5 / §9 "Simultaneous depletion" — DECIDED 2026-08-11: both bars empty on the same Hunt and
// the player loses. Data rather than a hardcoded branch, so DLR-65 T5 reads an attributed
// ruling instead of an unexplained `if`.
export const SIMULTANEOUS_DEPLETION_WINNER: DuelSide = DuelSide.Quarry

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — DERIVED, never chosen. `QUARRY_ENCOUNTER_HEALTH` is the single source
// of truth for run length (DLR-82 AC1); a free-standing number beside it is the second source that
// drifts, and any value larger than the array is a RangeError from `quarryHealthForEncounter`
// waiting to happen. Replaces DLR-48 AC3's provisional 5, which sat beside a one-entry array.
export const ENCOUNTERS_PER_RUN = QUARRY_ENCOUNTER_HEALTH.length

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

// Which opponent the single encounter is fought against. Purely an IDENTITY LABEL — it selects
// a name for the dossier panel and nothing else. No character carries a mechanical power:
// DLR-81 deleted the Monarch's round-long rule-break, and powers are deferred to a final-boss
// ticket rather than given to every opponent. Forced by what QUARRY_CHARACTERS holds, so not a
// tuning value; it exists as a key so the later roster ticket has one place to change.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch

// §3.1/§5 — six cards each, six tricks. ONE constant, not two: every card dealt is played, so
// hand size and trick count cannot differ, and two constants that must be equal is a bug waiting
// for one of them to be edited. SETTLED (§5).
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6

// §5 "Skull density, first CPU" — roughly 30% of the CPU's dealt cards carry a skull. SETTLED as
// a proportion; the count it produces is Math.round(HAND_SIZE * SKULL_DENSITY) = 2 of 6, which is
// 33%. AC2 requires this be named rather than written at its point of use.
// UNIT: proportion of the CPU's dealt hand, 0..1.
export const SKULL_DENSITY = 0.3

/**
 * How likely each rank is to carry a skull, keyed by rank. Weight 0 means never; a higher weight
 * means likelier. Only the RATIOS matter — the absolute scale is arbitrary, so a curve can be
 * re-shaped without renormalising it.
 *
 * Replaces the old rank-floor rule: "never rank 1" is now expressed as `1: 0` in every curve
 * rather than as a separate minimum-rank constant, so the rule is stated once.
 * UNIT: relative weight per rank, >= 0, unitless.
 */
export type SkullRankWeights = Readonly<Record<number, number>>

// Every eligible rank equally likely — the behaviour before PT-001. NOT ACTIVE: kept as the
// reference point a play-test compares a shaped curve against.
export const SKULL_WEIGHTS_UNIFORM: SkullRankWeights = {
  1: 0,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
  11: 1,
}

// Weight climbs with rank, so skulls land on high cards. NOT ACTIVE. High skulls mostly WIN their
// own trick, and a skull trick the Quarry wins is a dodge for the player — so this is the gentlest
// curve, not the harshest. Transcribed from the developer's sketch as `weight = rank - 1`.
export const SKULL_WEIGHTS_RAMP: SkullRankWeights = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  11: 10,
}

// ACTIVE (see SKULL_RANK_WEIGHTS). Weight on the middle ranks, where the player's own card decides
// who takes the trick: their skulled 6 loses to a 9 and beats a 4, so the outcome is the player's
// choice rather than the deal's. The extremes are deliberately light — a very low skull is one the
// Quarry can only lose with, so it is dumped into a trick the player has already won and eaten with
// no counterplay; a very high skull wins its own trick, which is a dodge the player did not earn.
export const SKULL_WEIGHTS_HUMP: SkullRankWeights = {
  1: 0,
  2: 2,
  3: 5,
  4: 8,
  5: 10,
  6: 10,
  7: 8,
  8: 5,
  9: 2,
  10: 1,
  11: 1,
}

// The ramp mirrored: weight on low cards. NOT ACTIVE, and the harshest curve — a low skull is one
// the Quarry can only lose with, so most of these are eaten with no counterplay.
export const SKULL_WEIGHTS_AMBUSH: SkullRankWeights = {
  1: 0,
  2: 10,
  3: 9,
  4: 8,
  5: 7,
  6: 6,
  7: 5,
  8: 4,
  9: 3,
  10: 2,
  11: 1,
}

// The curve in force. CHANGE THIS ONE REFERENCE to play-test a different shape.
// Set to HUMP by the developer on 2026-08-14, from a rendered comparison of all four curves and a
// 300,000-hand simulation of the per-rank skull rates each produces.
//
// The three inactive curves above are exported and unused ON PURPOSE — they are the difficulty and
// variety lever for later opponents, so a boss can be differentiated by its skull curve rather than
// by a rule-break. DO NOT DELETE THEM AS DEAD CODE. See `ideas.md` → "Worth costing".
export const SKULL_RANK_WEIGHTS: SkullRankWeights = SKULL_WEIGHTS_HUMP

// §5 "Damage to the player" — 1, every time they take damage (AC10). SETTLED.
// UNIT: health points per damage event.
export const DAMAGE_PER_HIT: Damage = 1
