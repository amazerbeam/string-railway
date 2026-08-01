/**
 * Seeded PRNG. Determinism is an acceptance criterion (SCRUM-4 AC8) — the same
 * seed and player count must produce an identical board so a situation can be
 * reproduced — and Math.random() is a defect anywhere reachable from
 * generation. mulberry32 is used because it is ~15 lines, has no dependency,
 * and passes well enough for layout sampling; nothing here is cryptographic.
 *
 * Each createRng closes over its OWN counter. There is deliberately no
 * module-level mutable state: a `let` at module scope would survive HMR and
 * leak across every test in a file, so a spec that passes alone would fail in
 * the suite.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  nextFloat(): number
  /** Uniform integer in [0, maxExclusive). Throws for maxExclusive <= 0. */
  nextInt(maxExclusive: number): number
  /** Uniform in [min, max). */
  nextRange(min: number, max: number): number
}

export function createRng(seed: number): Rng {
  // Coerced to a 32-bit unsigned integer so a fractional or negative seed is
  // still usable rather than poisoning the state with NaN.
  let state = Math.trunc(seed) >>> 0

  const nextFloat = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    nextFloat,
    nextInt(maxExclusive: number): number {
      if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        throw new Error(
          `Rng.nextInt: maxExclusive must be a positive number, received ${maxExclusive}`,
        )
      }
      return Math.floor(nextFloat() * maxExclusive)
    },
    nextRange(min: number, max: number): number {
      return min + nextFloat() * (max - min)
    },
  }
}

/**
 * Deterministic 32-bit hash of a user-typed seed (SCRUM-3 AC6 accepts a typed
 * seed, and engineering-standards treats a seed as input to sanitise). FNV-1a:
 * any string, including empty, maps to a usable unsigned integer.
 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
