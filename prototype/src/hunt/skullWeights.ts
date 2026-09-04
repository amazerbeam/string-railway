// DLR-94 — split out of `config.ts`, which stood at 413 of its 400-line budget once that
// ticket's forced cash-out fraction was added (retired by DLR-156, since a hit now pays
// nothing). PURE MOVE: no curve, weight, or comment changed — the four skull-weight curves and
// the active selection are exactly what `config.ts` held, in their own file because they are one
// self-contained concept (the per-rank skull curve) that nothing else in `config.ts` reads or is
// read by.

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

// Weight climbs with rank, so skulls land on high cards. NOT ACTIVE. High skulls mostly TAKE their
// own trick, and a skull trick the Quarry takes is a Low Victory for the player — so this is the gentlest
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
// who takes the trick: their skulled 6 falls under a 9 and beats a 4, so the outcome is the player's
// choice rather than the deal's. The extremes are deliberately light — a very low skull is one the
// Quarry can never take with, so it is dumped into a trick the player was already going high on and
// eaten with no counterplay; a very high skull takes its own trick, which is a Low Victory the
// player did not earn.
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
