/**
 * DLR-112 — the only randomness source `src/hunt/` is allowed to reach for. `Math.random()` is
 * barred from this whole tree: `src/hunt/` must stay reproducible for DLR-130's headless balance
 * simulator, and a fixed seed proving the same reel strip and the same spin twice is the property
 * that makes a simulation possible at all. Every function downstream of this file takes `rng: Rng`
 * as an explicit parameter — the convention `dealRound`, `shuffle` and `assignSkulls` already set
 * in `src/warCouncil/` — rather than reading a module-level generator, so nothing here survives
 * HMR or leaks between tests in one file.
 */

/** A source of uniform floats in [0, 1). The house shape — `dealRound`, `shuffle` and
 *  `assignSkulls` all already take exactly this. */
export type Rng = () => number

/** mulberry32. Pure, self-contained, no dependency. The same `seed` always yields the same
 *  sequence, which is what makes `src/hunt/` simulable (DLR-130). 32-bit integer state throughout
 *  — no float accumulation, no drift.
 *
 *  `seed >>> 0` is ordinary JS bitwise coercion, so a `NaN`, an `Infinity`, or a non-integer seed
 *  does NOT throw — each collapses onto a valid, in-bounds, non-degenerate sequence, and `NaN` and
 *  `Infinity` both collapse onto seed `0`'s. That is sane behaviour rather than a defect, and it is
 *  unreachable through the shipped API (the only production seed source is `slotSeedFor`, which
 *  goes through `mixSeed` and always yields an integer in `[0, 2^32)`). Worth knowing for a caller
 *  that supplies a raw, unvalidated seed — DLR-130's simulator being the obvious candidate: two
 *  "different" seeds of `NaN` and `0` would silently produce identical runs. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fold integers into one 32-bit seed, order-sensitive. Pure — no `Math.random()`. Uses
 *  `Math.imul` and `>>> 0` throughout, so the result is always a non-negative 32-bit integer. */
export function mixSeed(...parts: readonly number[]): number {
  let hash = 0x811c9dc5
  for (const part of parts) {
    hash = Math.imul(hash ^ (part | 0), 0x01000193) >>> 0
    hash = (hash ^ (hash >>> 13)) >>> 0
  }
  return hash >>> 0
}

/**
 * DLR-123 AC12 — the seed for one hand's deal AND, because the reshuffle happens inside
 * `dealRound` under the same generator, for its reshuffle too. Shaped exactly like
 * `slotMachine.ts`'s `slotSeedFor`, and for the same reason: a seeded encounter must reproduce
 * every deal, every skull and every reshuffle, or DLR-130's balance simulator is impossible.
 *
 * The triple is unique per hand of a run: `encounterIndex` separates the fights and `handOfFight`
 * the hands within one, and both already live on `RunState`. Pure — no `Math.random()`; the
 * driver chooses `runSeed` and hands it down, exactly as it does for the slot machine.
 */
export function dealSeedFor(runSeed: number, encounterIndex: number, handOfFight: number): number {
  return mixSeed(runSeed, encounterIndex, handOfFight)
}
