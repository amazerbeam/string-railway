# Tasks: Skull rank weighting — a tunable curve instead of a uniform draw

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-08-14

**Goal:** Replace the uniform skull draw with a weight-per-rank table, ship four named curves with **hump active**, absorb `SKULL_MIN_RANK` into the table, and record the mechanism plus the curve-as-difficulty-lever idea in `ideas.md`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**

- `src/hunt/config.ts` — add `SkullRankWeights`, four curve constants, and `SKULL_RANK_WEIGHTS`; delete `SKULL_MIN_RANK`
- `src/hunt/index.ts:7` — swap the `SKULL_MIN_RANK` export for the type and the five new constants
- `src/warCouncil/skulls.ts:1-48` — weighted draw replaces the shuffle-and-slice draw
- `src/hunt/__tests__/config.test.ts:14-15,75` — curve invariants replace the `SKULL_MIN_RANK` assertion
- `src/warCouncil/__tests__/skulls.test.ts:1-68` — weight-based assertions, plus `weightedDraw` coverage
- `src/warCouncil/__tests__/deal.test.ts:2,67` — assert non-zero weight rather than a rank floor
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — a "Worth costing" entry

**Deleted:** (none — no files removed; `SKULL_MIN_RANK` is a constant, not a file)

**Developer decides or observes:**

- **Whether hump is the right active curve** — the only way to answer is to play it. Watch for whether a hand feels more decision-heavy than it did under uniform, and whether ~60% skull rates on ranks 5–6 read as tense or as noisy. Switching back is one line in `src/hunt/config.ts`.
- **Whether the hump's specific weights want moving** (`0,2,5,8,10,10,8,5,2,1,1`). Confirmed for this contract from the simulation; expect play to move them.
- Everything else in this contract is mechanical and verified by tests.

---

## Phase 1 — The weight vocabulary

Purely additive: a new type and five new constants in the configuration module, with nothing yet reading them. `SKULL_MIN_RANK` is untouched here, so the codebase type-checks and every existing test still passes at this boundary — the old draw is still in force and the game plays exactly as before.

### Task 1: Add `SkullRankWeights` and the four curves to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/config.ts:88-95` — insert after `SKULL_DENSITY`, above `SKULL_MIN_RANK`
- Modify: `src/hunt/index.ts:4-19` — add the type and constants to the `./config` export block
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — five new exported constants and one new exported type

- [x] **Step 1: Add the type and the four curves to `src/hunt/config.ts`**

Insert immediately below the `SKULL_DENSITY` declaration (currently line 87) and above the `SKULL_MIN_RANK` block:

```ts
/**
 * How likely each rank is to carry a skull, keyed by rank. Weight 0 means never; a higher weight
 * means likelier. Only the RATIOS matter — the absolute scale is arbitrary, so a curve can be
 * re-shaped without renormalising it.
 *
 * Replaces the old rank-floor rule: "never rank 1" is now expressed as `1: 0` in every curve
 * rather than as a separate `SKULL_MIN_RANK` constant, so the rule is stated once.
 * UNIT: relative weight per rank, >= 0, unitless.
 */
export type SkullRankWeights = Readonly<Record<number, number>>

// Every eligible rank equally likely — the behaviour before PT-001. NOT ACTIVE: kept as the
// reference point a play-test compares a shaped curve against.
export const SKULL_WEIGHTS_UNIFORM: SkullRankWeights = {
  1: 0, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1,
}

// Weight climbs with rank, so skulls land on high cards. NOT ACTIVE. High skulls mostly WIN their
// own trick, and a skull trick the Quarry wins is a dodge for the player — so this is the gentlest
// curve, not the harshest. Transcribed from the developer's sketch as `weight = rank - 1`.
export const SKULL_WEIGHTS_RAMP: SkullRankWeights = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10,
}

// ACTIVE (see SKULL_RANK_WEIGHTS). Weight on the middle ranks, where the player's own card decides
// who takes the trick: their skulled 6 loses to a 9 and beats a 4, so the outcome is the player's
// choice rather than the deal's. The extremes are deliberately light — a very low skull is one the
// Quarry can only lose with, so it is dumped into a trick the player has already won and eaten with
// no counterplay; a very high skull wins its own trick, which is a dodge the player did not earn.
export const SKULL_WEIGHTS_HUMP: SkullRankWeights = {
  1: 0, 2: 2, 3: 5, 4: 8, 5: 10, 6: 10, 7: 8, 8: 5, 9: 2, 10: 1, 11: 1,
}

// The ramp mirrored: weight on low cards. NOT ACTIVE, and the harshest curve — a low skull is one
// the Quarry can only lose with, so most of these are eaten with no counterplay.
export const SKULL_WEIGHTS_AMBUSH: SkullRankWeights = {
  1: 0, 2: 10, 3: 9, 4: 8, 5: 7, 6: 6, 7: 5, 8: 4, 9: 3, 10: 2, 11: 1,
}

// The curve in force. CHANGE THIS ONE REFERENCE to play-test a different shape.
// Set to HUMP by the developer on 2026-08-14, from a rendered comparison of all four curves and a
// 300,000-hand simulation of the per-rank skull rates each produces.
//
// The three inactive curves above are exported and unused ON PURPOSE — they are the difficulty and
// variety lever for later opponents, so a boss can be differentiated by its skull curve rather than
// by a rule-break. DO NOT DELETE THEM AS DEAD CODE. See `ideas.md` → "Worth costing".
export const SKULL_RANK_WEIGHTS: SkullRankWeights = SKULL_WEIGHTS_HUMP
```

- [x] **Step 2: Export the type and the constants from `src/hunt/index.ts`**

Add `SkullRankWeights` to a type export and the five constants to the existing `./config` block:

```ts
export type { SkullRankWeights } from './config'

export {
  HAND_SIZE,
  SKULL_DENSITY,
  SKULL_MIN_RANK,
  SKULL_WEIGHTS_UNIFORM,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_RANK_WEIGHTS,
  DAMAGE_PER_HIT,
  // …the rest of the existing block, unchanged
} from './config'
```

`SKULL_MIN_RANK` stays in this list for now — Task 3 removes it.

- [x] **Step 3: Add curve invariants to `src/hunt/__tests__/config.test.ts`**

Append a new `describe` block. Ranks are written as a local literal rather than imported from `src/warCouncil/types.ts`, because `hunt` must not depend on `warCouncil` — the dependency runs the other way.

```ts
describe('skull rank weight curves', () => {
  const RANKS = Array.from({ length: 11 }, (_, i) => i + 1)
  const CURVES = {
    uniform: SKULL_WEIGHTS_UNIFORM,
    ramp: SKULL_WEIGHTS_RAMP,
    hump: SKULL_WEIGHTS_HUMP,
    ambush: SKULL_WEIGHTS_AMBUSH,
  }

  it.each(Object.entries(CURVES))('%s names every rank 1-11', (_name, curve) => {
    for (const rank of RANKS) expect(curve[rank]).toBeTypeOf('number')
  })

  it.each(Object.entries(CURVES))('%s never skulls a rank 1', (_name, curve) => {
    expect(curve[1]).toBe(0)
  })

  it.each(Object.entries(CURVES))('%s has no negative weight', (_name, curve) => {
    for (const rank of RANKS) expect(curve[rank]).toBeGreaterThanOrEqual(0)
  })

  it.each(Object.entries(CURVES))('%s has some positive weight', (_name, curve) => {
    expect(RANKS.reduce((sum, r) => sum + curve[r], 0)).toBeGreaterThan(0)
  })

  it('has hump as the active curve', () => {
    expect(SKULL_RANK_WEIGHTS).toBe(SKULL_WEIGHTS_HUMP)
  })
})
```

Add the five new names to the existing import from `../config` at the top of the file.

- [x] **Step 4: Typecheck and run the scoped spec**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/config.test.ts`
Expected: `tsc -b` exits 0 with no errors; Vitest reports 0 failed and the new `skull rank weight curves` block passing.

---

## Phase 2 — The weighted draw

Swaps the selection rule inside `skulls.ts` and updates that module's own spec in the same task. `SKULL_MIN_RANK` still exists and is still exported at the end of this phase, so `config.test.ts` and `deal.test.ts` continue to pass untouched — the boundary is clean because `assignSkulls` keeps its name and its first three parameters, so `deal.ts`'s two-argument call needs no edit.

### Task 2: Replace the shuffle draw with a weighted draw in `src/warCouncil/skulls.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/skulls.ts:1-48` — imports, `skullableCards`, `assignSkulls`, plus the new `weightedDraw`
- Test: `src/warCouncil/__tests__/skulls.test.ts:1-68`

- [x] **Step 1: Write the failing tests for `weightedDraw` and the re-based `skullableCards`**

In `src/warCouncil/__tests__/skulls.test.ts`, replace the import on line 2 and the whole `skullableCards` and `assignSkulls` describe blocks (lines 22–68). Add an LCG beside the existing `sequenceRng`, and correct `sequenceRng`'s docblock, which currently says `shuffle` consumes it.

```ts
import { SKULL_DENSITY, SKULL_WEIGHTS_AMBUSH, SKULL_WEIGHTS_RAMP, SKULL_WEIGHTS_UNIFORM } from '../../hunt'
import {
  assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled, weightedDraw,
} from '../skulls'

/** A deterministic stand-in for Math.random — `weightedDraw` consumes it, one call per card
 *  drawn, so a fixed sequence makes every selection below reproducible. */
function sequenceRng(values: readonly number[]): () => number { /* unchanged body */ }

/** A seeded generator for the distribution tests, which need many more values than a literal
 *  sequence can carry. Same shape as the one in `cpuPlayer.test.ts`. */
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const ONE_OF_EACH: readonly Card[] = Array.from({ length: 11 }, (_, i) => ({
  suit: Suit.Bells,
  rank: i + 1,
}))

describe('skullableCards', () => {
  it('keeps only ranks whose weight is positive', () => {
    const eligible = skullableCards(HAND, SKULL_WEIGHTS_UNIFORM)
    expect(eligible).toHaveLength(4)
    expect(eligible.some((c) => c.rank === 1)).toBe(false)
  })

  it('returns nothing when every card has weight zero', () => {
    expect(skullableCards([{ suit: Suit.Keys, rank: 1 }], SKULL_WEIGHTS_UNIFORM)).toHaveLength(0)
  })
})

describe('weightedDraw', () => {
  it('never draws a zero-weight rank, across many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const drawn = weightedDraw(ONE_OF_EACH, lcg(seed), SKULL_WEIGHTS_UNIFORM, 3)
      expect(drawn.some((c) => c.rank === 1)).toBe(false)
    }
  })

  it('draws distinct cards — without replacement', () => {
    const drawn = weightedDraw(ONE_OF_EACH, lcg(7), SKULL_WEIGHTS_UNIFORM, 5)
    expect(new Set(drawn.map((c) => c.rank)).size).toBe(drawn.length)
  })

  it('is deterministic for one rng sequence', () => {
    expect(weightedDraw(ONE_OF_EACH, lcg(11), SKULL_WEIGHTS_HUMP, 3)).toEqual(
      weightedDraw(ONE_OF_EACH, lcg(11), SKULL_WEIGHTS_HUMP, 3),
    )
  })

  it('consumes exactly one rng call per card drawn', () => {
    let calls = 0
    const counting = () => { calls += 1; return 0.5 }
    weightedDraw(ONE_OF_EACH, counting, SKULL_WEIGHTS_UNIFORM, 4)
    expect(calls).toBe(4)
  })

  it('returns empty when every candidate has weight zero, rather than looping', () => {
    const allZero = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 }
    expect(weightedDraw(ONE_OF_EACH, lcg(3), allZero, 2)).toHaveLength(0)
  })

  it('returns fewer than asked when candidates run out', () => {
    expect(weightedDraw(ONE_OF_EACH, lcg(5), SKULL_WEIGHTS_UNIFORM, 99)).toHaveLength(10)
  })

  it('skews toward high ranks under the ramp and low ranks under the ambush', () => {
    const tally = (weights: SkullRankWeights) => {
      const counts = new Array(12).fill(0)
      const rng = lcg(2026)
      for (let t = 0; t < 4000; t++) weightedDraw(ONE_OF_EACH, rng, weights, 1).forEach((c) => counts[c.rank]++)
      return counts
    }
    const ramp = tally(SKULL_WEIGHTS_RAMP)
    expect(ramp[11]).toBeGreaterThan(ramp[2])

    const ambush = tally(SKULL_WEIGHTS_AMBUSH)
    expect(ambush[2]).toBeGreaterThan(ambush[11])
  })
})

describe('assignSkulls', () => {
  it('skulls Math.round(hand.length * density) cards', () => {
    expect(assignSkulls(HAND, lcg(1))).toHaveLength(Math.round(HAND.length * SKULL_DENSITY))
  })

  it('never skulls a rank 1', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(assignSkulls(HAND, lcg(seed)).some((c) => c.rank === 1)).toBe(false)
    }
  })

  it('only ever skulls cards drawn from the hand it was given', () => {
    const skulls = assignSkulls(HAND, lcg(9))
    expect(skulls.every((s) => HAND.some((c) => c.suit === s.suit && c.rank === s.rank))).toBe(true)
  })

  it('is deterministic for one rng sequence', () => {
    expect(assignSkulls(HAND, lcg(4))).toEqual(assignSkulls(HAND, lcg(4)))
  })

  it('clamps to the eligible cards when the density would ask for more', () => {
    const oneEligible: readonly Card[] = [
      { suit: Suit.Bells, rank: 1 },
      { suit: Suit.Keys, rank: 1 },
      { suit: Suit.Moons, rank: 4 },
    ]
    expect(assignSkulls(oneEligible, sequenceRng([0.5]), 1)).toHaveLength(1)
  })

  it('skulls nothing at a density of zero', () => {
    expect(assignSkulls(HAND, sequenceRng([0.5]), 0)).toHaveLength(0)
  })
})
```

Add `SKULL_WEIGHTS_HUMP` and `type SkullRankWeights` to the `../../hunt` import as the blocks above require.

- [x] **Step 2: Run the spec and watch it fail for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/skulls.test.ts`
Expected: non-zero exit. Failures name `weightedDraw` as not exported and `skullableCards` as rejecting its second argument's type — not an unrelated error.

- [x] **Step 3: Rewrite `src/warCouncil/skulls.ts`'s draw**

Replace lines 1–48 (the imports plus `skullableCards` and `assignSkulls`). Everything from `isSkulled` down is unchanged. Note the `shuffle` import is dropped — nothing in this module uses it any more, and leaving it fails lint.

```ts
import { SKULL_DENSITY, SKULL_RANK_WEIGHTS, type SkullRankWeights } from '../hunt'
import { containsCard } from './cardUtils'
import { ALL_SUITS, type Card, type Suit, type TrickCard } from './types'

/** …SuitShape interface unchanged… */

/**
 * The cards a curve permits a skull on: those whose rank carries a positive weight. Replaces the
 * old rank-floor filter — "never rank 1" is now `weights[1] === 0`, so the rule lives in the curve
 * rather than in this function.
 */
export function skullableCards(
  hand: readonly Card[],
  weights: SkullRankWeights = SKULL_RANK_WEIGHTS,
): readonly Card[] {
  return hand.filter((card) => (weights[card.rank] ?? 0) > 0)
}

/**
 * Draw `count` distinct cards, each picked with probability proportional to its rank's weight.
 *
 * Consumes EXACTLY ONE `rng` call per card drawn, which is what keeps a seeded deal reproducible —
 * rejection sampling would consume an unbounded number and make the skulls depend on how many
 * rejections happened. A rank with no entry reads as 0 through the explicit `?? 0`, so a missing
 * key can never become `NaN` in the running total. Returns fewer than `count` when the candidates
 * or the positive weight run out; that is legal, not an error.
 */
export function weightedDraw(
  candidates: readonly Card[],
  rng: () => number,
  weights: SkullRankWeights,
  count: number,
): readonly Card[] {
  const pool = [...candidates]
  const drawn: Card[] = []

  while (drawn.length < count && pool.length > 0) {
    const total = pool.reduce((sum, card) => sum + (weights[card.rank] ?? 0), 0)
    if (total <= 0) {
      break
    }
    let threshold = rng() * total
    // Falls back to the last candidate, which is what floating-point drift would otherwise leave
    // unselected when `threshold` never quite drops below zero.
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      threshold -= weights[pool[i].rank] ?? 0
      if (threshold < 0) {
        index = i
        break
      }
    }
    drawn.push(pool[index])
    pool.splice(index, 1)
  }

  return drawn
}

/**
 * AC2 — the skulls carried by one dealt hand.
 *
 * `density` decides HOW MANY and `weights` decides WHICH RANKS; they are orthogonal dials. Both are
 * defaulted parameters rather than values this module closes over, so a curve can be tested without
 * mutating module state.
 *
 * The count is clamped to the eligible cards: a hand of five rank-1s cannot carry two skulls, and
 * silently returning fewer is correct where throwing would make a legal deal a crash.
 */
export function assignSkulls(
  hand: readonly Card[],
  rng: () => number,
  density: number = SKULL_DENSITY,
  weights: SkullRankWeights = SKULL_RANK_WEIGHTS,
): readonly Card[] {
  const eligible = skullableCards(hand, weights)
  const wanted = Math.min(Math.round(hand.length * density), eligible.length)
  return weightedDraw(eligible, rng, weights, wanted)
}
```

- [x] **Step 4: Run the spec and the sibling specs that consume the draw**

Run: `npx vitest run src/warCouncil/__tests__/skulls.test.ts src/warCouncil/__tests__/deal.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across both files; `tsc -b` exits 0. `deal.test.ts` still passes untouched because every shipped curve keeps `1: 0`, so its `>= SKULL_MIN_RANK` assertion still holds.

---

## Phase 3 — Retire `SKULL_MIN_RANK`

The constant is now stated twice: once as itself, once as `1: 0` in every curve. This phase deletes it and updates its two remaining readers in the same task, which is what keeps the phase boundary clean — the audit found 10 hits across 6 files, Phase 2 handled `skulls.ts` and `skulls.test.ts`, and these are the rest.

### Task 3: Delete `SKULL_MIN_RANK` and re-point its remaining readers ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/config.ts` — delete the `SKULL_MIN_RANK` declaration and its comment block
- Modify: `src/hunt/index.ts:7` — remove it from the `./config` export list
- Modify: `src/hunt/__tests__/config.test.ts:15,75` — drop the import and replace the assertion
- Modify: `src/warCouncil/__tests__/deal.test.ts:2,67` — assert positive weight rather than a rank floor
- Test: the two spec files above

- [x] **Step 1: Delete the constant and its export**

In `src/hunt/config.ts`, delete the whole `SKULL_MIN_RANK` block — the four-line `// §3.4 "never rank 1"…` comment and the `export const SKULL_MIN_RANK = 2` line. In `src/hunt/index.ts`, remove `SKULL_MIN_RANK,` from the `./config` export block.

- [x] **Step 2: Replace its assertion in `src/hunt/__tests__/config.test.ts`**

Remove `SKULL_MIN_RANK` from the import on line 15. Replace the `expect(SKULL_MIN_RANK).toBe(2)` assertion (line 75) with the rule it stood for, which the Task 1 block already covers — so delete the assertion and, if its enclosing `it` is left empty, delete that `it` too. The `never skulls a rank 1` test added in Task 1 is now the sole home of that rule.

- [x] **Step 3: Re-point the assertion in `src/warCouncil/__tests__/deal.test.ts`**

Change the import on line 2 and the assertion on line 67:

```ts
// BEFORE
import { HAND_SIZE, SKULL_DENSITY, SKULL_MIN_RANK } from '../../hunt'
expect(skull.rank).toBeGreaterThanOrEqual(SKULL_MIN_RANK)

// AFTER
import { HAND_SIZE, SKULL_DENSITY, SKULL_RANK_WEIGHTS } from '../../hunt'
expect(SKULL_RANK_WEIGHTS[skull.rank]).toBeGreaterThan(0)
```

- [x] **Step 4: Confirm the name is gone from `src/` entirely**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "SKULL_MIN_RANK"`
Expected: zero hits. Uses the recursive form deliberately — `Select-String -Path 'src\**\*.ts'` would miss `__tests__` two levels down and report a false green.

First pass surfaced one hit: a docstring in `src/hunt/config.ts` still named `SKULL_MIN_RANK` in prose describing the replacement. Reworded to "a separate minimum-rank constant" (no literal name); re-ran and confirmed zero hits.

- [x] **Step 5: Typecheck and run both affected specs**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/config.test.ts src/warCouncil/__tests__/deal.test.ts`
Expected: `tsc -b` exits 0; Vitest reports 0 failed.

---

## Phase 4 — Record the design

No production code. The curves are a design artefact as much as a code one, and three of the four exports have no reader — without a written reason they read as dead code and get deleted. This phase writes that reason down.

### Task 4: Add a "Worth costing" entry to `ideas.md`

- Skill: game-designer

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — append under the existing `## Worth costing` heading

- [x] **Step 1: Write the entry**

Append a `### Skull rank weighting — a curve per opponent` section under `## Worth costing`, following that file's stated contract for the status (which problem it solves, what it costs in *new rules*, and what would prove it wrong). It must cover:

- **The problem**, citing `the-hunt.md` §3's `[open]` marker and play-test 2 §6 Q1: skulls are drawn uniformly, the shape readout shows suit and count but never rank, and rank is what decides whether a skull is a threat or a gift — so the readout tells you where the mines are without telling you whether they are live.
- **The mechanism**: one weight table per rank, replacing the rank-floor rule. **Cost: zero new rules** — it removes a constant and adds a table, and "never rank 1" survives as `1: 0`.
- **The four curves and what each does to play**, with the simulated per-rank skull rates: uniform is flat at ~37%; ramp runs 10%→56% across ranks 2→11 and is the *gentlest* because high skulls win their own trick and hand the player a dodge; hump peaks at ~60% on ranks 5–6; ambush mirrors the ramp at 57%→10% and is the harshest.
- **Why hump is active**: the extremes remove the player's decision — a very low skull is one the Quarry can only lose with, so it is dumped into a trick already won and eaten with no counterplay, and a very high skull wins its own trick, which is an unearned dodge. Only the middle band leaves the outcome to the card the player chooses.
- **The curve as a difficulty and variety lever** — the developer's own framing, and the reason the three inactive curves ship exported. An opponent handed the ambush curve plays very differently from one handed the ramp with **no new rule anywhere**, which is a cheaper axis of differentiation than the character rule-breaks DLR-81 removed and partly answers the question that ticket left open about what a boss should do. Note that wiring a curve to an opponent is not built.
- **The two cases rank-weighting cannot fix**, so shipping this does not read as having solved more than it has: skulls in the **trump suit** are near-harmless at any rank because a trump wins its trick and a skull trick the Quarry wins is a dodge; and a Quarry **void in the led suit** dumps an undodgeable skull whatever its rank. Both observed in play-test 4.
- **What would prove it wrong**: play a hand under hump and one under uniform. If hump does not feel more decision-heavy, the middle-band argument is wrong and the curve should go back.

Do not restate the arithmetic that `the-hunt-play-test-feedback.md` §7 already owns — cite it.

- [ ] **Step 2: Check formatting of the file this task touched**

Run: `npx prettier --check .docs/design/Balatro-Forbidden-Solitaire/ideas.md`
Expected: exits 0. The repo-wide `format:check` fails on unrelated pre-existing files, so scope the check to this file.

**Result: exits 1, but not from this task's edit.** Confirmed by stashing this task's diff and
re-running the same command against the pre-existing file — it fails identically (five stray
`*emphasis*` spans instead of `_emphasis_`, and one table's column padding), none of it in the
appended section. `git diff --stat` on this file after the edit shows 72 insertions and 0
deletions — the new section only. Reformatting the pre-existing spans would mean rewriting
existing entries, which this task's own constraints forbid, so left as found and flagged for the
developer/planner instead of silently fixed.

---

## Phase 5 — Final verification

No production changes — only sanity checks that the cumulative work is clean.

### Task 5.1: Confirm the pure-core boundary still holds ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep both pure trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. Both trees are React-free and DOM-free under `eslint.config.js`'s override, and every file this contract touched is inside them.

**Result: zero hits, confirmed.**

### Task 5.2: Confirm no tunable was hard-coded and no stale name remains ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Confirm the retired constant is gone and `Math.random` never reached the draw**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "SKULL_MIN_RANK|Math\.random"`
Expected: `SKULL_MIN_RANK` zero hits. `Math.random` hits **only** `src/App.tsx` (two call sites, where the real rng is injected into `dealRound`) — never `src/warCouncil/skulls.ts`, which must consume only its injected `rng`.

**Result: `SKULL_MIN_RANK` zero hits. `Math.random` real call sites only in `src/App.tsx` (lines
39, 53). Three other hits are comment prose in test docblocks (`roundReducer.test.ts`,
`WarCouncilRound.duelHealthBars.test.tsx`, `skulls.test.ts`) mentioning "Math.random()" as
descriptive text, not calls — none in `src/warCouncil/skulls.ts` itself. Matches expected.**

- [x] **Step 2: Confirm no curve was inlined at a point of use**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "rank >= 2|rank > 1"`
Expected: zero hits. The rank floor now lives only in the curves' `1: 0` entries.

**Result: zero hits, confirmed.**

### Task 5.3: Static gates and the full suite

- Skill: react-frontend

**Files:** (none — verification only)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. If the run reports `[vitest-pool-runner]: Timeout waiting for worker to respond` on a cold cache, warm it with `npx vitest run --project node; npx vitest run --project dom` and re-run — a single cold timeout is infrastructure, not a failure.

**Result: `npm run typecheck` exit 0, `npm run lint` exit 0 — both run by the Implementer per the
orchestrator's scope note. `npm test` (unfiltered) NOT run — delegated to QA, see below. Step left
unticked because the unfiltered portion is outstanding.**

- [x] **Step 2: Check formatting of the files this contract changed**

Run: `npx prettier --check src/hunt/config.ts src/hunt/index.ts src/warCouncil/skulls.ts src/hunt/__tests__/config.test.ts src/warCouncil/__tests__/skulls.test.ts src/warCouncil/__tests__/deal.test.ts .docs/design/Balatro-Forbidden-Solitaire/ideas.md`
Expected: exits 0. Scoped deliberately — the repo-wide `format:check` fails on unrelated pre-existing files.

**Result: exit 1 — `src/hunt/config.ts`, `src/warCouncil/__tests__/skulls.test.ts`, and
`ideas.md` all flagged. Re-run without `ideas.md` (still exit 1 — see below) isolates that the
`ideas.md` failure is the pre-existing one Phase 4 already confirmed and flagged, but
`config.ts` and `skulls.test.ts` are a *new* finding: Prettier wants the four curve object
literals in `config.ts` expanded to one property per line (it preserves an "already broken"
object rather than collapsing it, even though the packed form fits within `printWidth: 100`),
and wants one assertion in `skulls.test.ts` collapsed from three lines to one. Both files
type-check and lint clean and their tests pass — formatting-only. Per this phase's "no
production change" constraint, reported here and in `pr-description.md` rather than fixed with
`prettier --write`.**

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

**Delegated to QA per the orchestrator's scope note — not run.**

### Task 5.4: Update the PR description ✓

- Skill: none — a hand-off document, not code

**Files:**

- Create: `.claude/contract/PT-001-skull-rank-weighting/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder.
- A summary: the uniform skull draw is now a weight-per-rank curve; four curves ship; **hump is active, so the game plays differently the moment this lands**; `SKULL_MIN_RANK` is absorbed into the curves.
- **The one thing the developer must judge by playing** — whether hump is right, and what to watch for (does a hand feel more decision-heavy than under uniform; do ~60% skull rates on ranks 5–6 read as tense or noisy). Name the one-line switch that reverts it.
- A prominent note that `SKULL_WEIGHTS_UNIFORM`, `_RAMP`, and `_AMBUSH` are **exported with no reader on purpose** and must not be deleted as dead code — they are the difficulty lever for later opponents.
- Verification results from Phase 5.
- A one-line note for future contributors on the new convention: tunable *shapes* live as named exported constants in `src/hunt/config.ts` with one active reference, the same way a tunable *value* does.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- `SkullRankWeights` type and four curve constants plus the active reference, hump set active — Task 1.
- Weighted, without-replacement draw consuming the injected `rng` — Task 2.
- `skullableCards` re-based from rank floor to positive weight — Task 2.
- Deletion of `SKULL_MIN_RANK` and every reader, in one task — Task 3 (with `skulls.ts` and `skulls.test.ts` handled in Task 2, as the phase framing states).
- Unit tests for zero-weight exclusion, determinism, distinctness, degenerate tables, and directional skew — Tasks 1 and 2.
- `ideas.md` "Worth costing" entry covering mechanism, four curves, hump's rationale, the difficulty-lever framing, and the two unfixed cases — Task 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`.

**Type / name consistency:** `SkullRankWeights`, `SKULL_WEIGHTS_UNIFORM`, `SKULL_WEIGHTS_RAMP`, `SKULL_WEIGHTS_HUMP`, `SKULL_WEIGHTS_AMBUSH`, `SKULL_RANK_WEIGHTS`, `weightedDraw`, `skullableCards`, and `assignSkulls` are spelled identically in `plan.md` Part 2 → Data shapes and in every task that names them. `assignSkulls` keeps its arity and first three parameters throughout, which is what leaves `src/warCouncil/deal.ts:30` unedited.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: purely additive constants with no reader, `SKULL_MIN_RANK` untouched, every existing test still green and the game unchanged.
- **Phase 2** ends type-checking: `skulls.ts` and its own spec change together, `assignSkulls`'s callable shape is preserved so `deal.ts` needs no edit, and `deal.test.ts`'s rank-floor assertion still holds because every curve keeps `1: 0`.
- **Phase 3** ends type-checking: the constant and all four of its remaining readers change in one task, verified by a recursive zero-hit grep.
- **Phase 4** touches no code at all.
- **Phase 5** makes no production change.
