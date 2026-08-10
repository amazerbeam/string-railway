# Tasks: Standing from the band table, and Score = Spoils × Standing against the Demand

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Migrate `tricksToPoints` onto T2's `resolveStanding` so the Standing multiplier table has exactly one owner, then add pure `scoreHunt(state, side)` and `checkDemand(score, demand)` so a Hunt has a computable outcome — Spoils × Standing, checked against a passed-in Demand.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files; the new tests extend the existing `scoring.test.ts`)

**Modified:**
- `src/warCouncil/scoring.ts` — migrate `tricksToPoints` onto `resolveStanding`; add `HuntScore`, `scoreHunt`, `DemandOutcome`, `checkDemand`
- `src/warCouncil/index.ts` — re-export `scoreHunt`, `checkDemand`, `DemandOutcome`, and the `HuntScore` type
- `src/hunt/types.ts` — add the `Score` type alias
- `src/hunt/index.ts` — export `Score`
- `src/warCouncil/__tests__/scoring.test.ts` — add the AC4/AC5/AC6/AC7 regression tests and a local `huntState`/`fillerCards` fixture

**Deleted:** (none)

**Developer decides or observes:** (none) — no tuning value is introduced by this ticket; `STANDING_BANDS`' real multipliers are untouched, and AC5's ×18 exists only inside a test fixture.

---

## Phase 1 — Migrate `tricksToPoints` onto T2's resolver

Mechanical, behaviour-preserving edit: `tricksToPoints` keeps its `(tricks: number) => number` signature and, under the live `STANDING_BANDS`, its exact numeric output — only its body changes, from a five-branch if-chain to one call into `resolveStanding`. Safe stopping point: the project type-checks and the existing `scoring.test.ts` suite (unmodified so far) still passes unchanged, proving the migration is behaviour-preserving before any new logic is added on top of it.

### Task 1: Migrate `tricksToPoints` in `src/warCouncil/scoring.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/scoring.ts:1-10`
- Test: `src/warCouncil/__tests__/scoring.test.ts` (no edit — run as a regression check)

- [x] **Step 1: Replace the if-chain body with a call to `resolveStanding`**

Replace:

```ts
import type { PlayerSide } from './types'

export function tricksToPoints(tricks: number): number {
  if (tricks <= 3) return 6
  if (tricks === 4) return 1
  if (tricks === 5) return 2
  if (tricks === 6) return 3
  if (tricks <= 9) return 6
  return 0
}
```

with:

```ts
import { resolveStanding } from '../hunt'
import type { PlayerSide } from './types'

export function tricksToPoints(tricks: number): number {
  return resolveStanding(tricks).multiplier
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [x] **Step 3: Confirm the migration is behaviour-preserving — run the existing scoring tests unmodified**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits 0, all existing `tricksToPoints`/`scoreRound` tests still pass with no edits to the test file — proving the migrated body produces identical output to the old if-chain under the live `STANDING_BANDS`.

---

## Phase 2 — `Score` type alias plumbing

A config/type-only addition alongside the existing `Spoils`/`Standing`/`Demand` aliases in `src/hunt/types.ts`. Safe stopping point: the alias compiles and is exported; nothing yet consumes it, so there is no behaviour to break.

### Task 2: Add `Score` to `src/hunt/types.ts` and export it from `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/types.ts:22-23`
- Modify: `src/hunt/index.ts:1`

- [x] **Step 1: Add the `Score` alias next to `Demand` in `src/hunt/types.ts`**

After the existing:

```ts
/** The encounter's score target; rises per encounter (§5). */
export type Demand = number
```

add:

```ts
/** The equation's result — Spoils × Standing, checked against the Demand (§1). */
export type Score = number
```

- [x] **Step 2: Export it from `src/hunt/index.ts`**

Change:

```ts
export type { Hunt, Quarry, Spoils, Standing, Demand } from './types'
```

to:

```ts
export type { Hunt, Quarry, Spoils, Standing, Demand, Score } from './types'
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 3 — `scoreHunt`: Spoils × Standing, computed once

The core of this ticket. `HuntScore` and `scoreHunt` are added to `scoring.ts`, calling T3's `spoils` and T2's `resolveStanding` once each from an already-final `RoundState` — never accumulated per trick. TDD throughout: each task adds its test(s) first. Safe stopping point: `scoreHunt` is fully implemented and covered by the §3 regression table (AC4), the injected-table break-even (AC5), and the Greedy zeroing case (AC6) — `checkDemand` does not exist yet, so nothing outside this phase depends on it.

### Task 3: Add `HuntScore` and `scoreHunt`, with AC4's §3 table as the driving test ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/scoring.ts` (append)
- Test: `src/warCouncil/__tests__/scoring.test.ts` (append)

- [x] **Step 1: Write the failing test — the full §3 table at flat card value 1**

The file's existing import block is:

```ts
import { describe, expect, it } from 'vitest'
import { scoreRound, tricksToPoints } from '../scoring'
```

Extend the `'../scoring'` line and add one for `'../types'` (one import statement per module — do not add a second `from '../scoring'` line):

```ts
import { describe, expect, it } from 'vitest'
import { scoreHunt, scoreRound, tricksToPoints } from '../scoring'
import { PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'
```

Add a local fixture (place above the first `describe`, after the imports):

```ts
// Ranks that carry no Treasure(7)/Poison(8) scoring adjustment, so a flat
// cardValue override of 1 gives exactly 1 point per card — mirrors
// spoils.test.ts's own flat-value fixture, which avoids the same two ranks.
const NEUTRAL_RANKS = [1, 2, 3, 4, 5, 6, 9, 10, 11]

function fillerCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    suit: Suit.Bells,
    rank: NEUTRAL_RANKS[i % NEUTRAL_RANKS.length],
  }))
}

function huntState(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 2 },
    trumpSuit: Suit.Bells,
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
  }
}
```

Add the test itself:

```ts
describe('scoreHunt — §3 flat-value table (AC4)', () => {
  it.each([
    [0, 0],
    [1, 12],
    [2, 24],
    [3, 36],
    [4, 8],
    [5, 20],
    [6, 36],
    [7, 84],
    [8, 96],
    [9, 108],
    [10, 0],
    [11, 0],
    [12, 0],
    [13, 0],
  ])('k=%i tricks -> score %i', (k, expectedScore) => {
    const state = huntState({ player: fillerCards(2 * k), cpu: [] }, { player: k, cpu: 13 - k })
    const result = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(result.spoils).toBe(2 * k)
    expect(result.tricks).toBe(k)
    expect(result.score).toBe(expectedScore)
  })

  it('k=9 peaks at 108, the §3 ceiling', () => {
    const state = huntState({ player: fillerCards(18), cpu: [] }, { player: 9, cpu: 4 })
    expect(scoreHunt(state, PlayerSide.Player, () => 1).score).toBe(108)
  })
})
```

- [x] **Step 2: Run the new test and confirm it fails — `scoreHunt` does not exist yet**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: fails to collect/run this file — `scoring.ts` has no exported member `scoreHunt`. This is the pre-implementation failing state, not a passing-suite regression.

- [x] **Step 3: Implement `HuntScore` and `scoreHunt` in `src/warCouncil/scoring.ts`**

Replace the file's two import lines from Phase 1 —

```ts
import { resolveStanding } from '../hunt'
import type { PlayerSide } from './types'
```

— with (one import per module, inline `type` prefixes, matching `spoils.ts`'s and `config.test.ts`'s existing style — do not leave two separate `from '../hunt'` or `from './types'` lines):

```ts
import {
  cardBaseValue,
  resolveStanding,
  STANDING_BANDS,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import type { PlayerSide, RoundState } from './types'
```

`Demand`/`Score` are not imported yet — nothing in this task uses them, and `tsconfig.app.json`'s `noUnusedLocals` fails the typecheck on an unused import. Task 6 extends this same `'../hunt'` import when `checkDemand` needs them.

Then add, after the `tricksToPoints`/`scoreRound` pair:

```ts
/** One round's finished outcome — every field derived once from a final `RoundState` (§1, AC2). */
export interface HuntScore {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly score: number
}

/**
 * Computes §1's equation once for `side`, from `state`'s already-final
 * `tricksWon`/`capturedCards` — never accumulated per trick. `cardValue` and
 * `standingTable` default to the live config (T2/T3) and exist so a test can
 * hold one axis flat while varying the other, mirroring `spoils`'s and
 * `resolveStanding`'s own injectable-parameter pattern.
 */
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardBaseValue,
  standingTable: readonly StandingBand[] = STANDING_BANDS,
): HuntScore {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, cardValue)
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    score: spoilsValue * band.multiplier,
  }
}
```

(`HuntScore.score` is typed `number` here rather than the `Score` alias, for the same unused-import reason — Task 6 changes this one field's type to `Score` in the same edit that imports it.)

- [x] **Step 4: Typecheck and re-run the scoped test, now expecting a pass**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: both exit 0; Vitest reports every case in the new `describe('scoreHunt — §3 flat-value table (AC4)')` block passing, including the fourteen-row table and the `k=9 → 108` case.

### Task 4: AC5 test — Humble break-even at an injected ×18, no code change outside the fixture ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/scoring.test.ts` (append)

- [x] **Step 1: Add the injected-table test**

Add one new import line for the config module (this test file has no `'../../hunt'` import yet):

```ts
import { STANDING_BANDS, StandingBandName, type StandingBand } from '../../hunt'
```

Then append:

```ts
describe('scoreHunt — Humble break-even at a raised multiplier (AC5)', () => {
  it('k=3 also scores 108 when Humble is raised to ×18 in an injected table, with no other change', () => {
    const raisedHumbleTable: readonly StandingBand[] = STANDING_BANDS.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 18 } : band,
    )
    const state = huntState({ player: fillerCards(6), cpu: [] }, { player: 3, cpu: 10 })

    const raised = scoreHunt(state, PlayerSide.Player, () => 1, raisedHumbleTable)
    expect(raised.score).toBe(108)

    // Proves the table is genuinely live: the same state, un-injected, still scores 36 —
    // the only thing that changed between the two calls is the table passed in.
    const baseline = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(baseline.score).toBe(36)
  })
})
```

- [x] **Step 2: Run and confirm both cases pass**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits 0; the new `describe('scoreHunt — Humble break-even at a raised multiplier (AC5)')` block passes — `raised.score` is 108, `baseline.score` is 36, and `STANDING_BANDS` itself was never mutated (confirmed by `.map` returning a new array, the same pattern `src/hunt/__tests__/config.test.ts` already uses).

### Task 5: AC6 test — Greedy zeroes a round with maximal Spoils ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/scoring.test.ts` (append)

- [x] **Step 1: Add the Greedy-band test**

Extend the existing `'../types'` import line to include `CardRank`, making it:

```ts
import { CardRank, PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'
```

Then append:

```ts
describe('scoreHunt — Greedy zeroes a round with maximal Spoils (AC6)', () => {
  it('score is 0 at k=13 even though Spoils is large (26 Monarch captures, rank-weighted default)', () => {
    const monarchCards: Card[] = Array.from({ length: 26 }, () => ({
      suit: Suit.Bells,
      rank: CardRank.Monarch,
    }))
    const state = huntState({ player: monarchCards, cpu: [] }, { player: 13, cpu: 0 })

    const result = scoreHunt(state, PlayerSide.Player)
    expect(result.spoils).toBe(26 * CardRank.Monarch)
    expect(result.standing).toBe(0)
    expect(result.score).toBe(0)
  })
})
```

- [x] **Step 2: Run and confirm it passes**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits 0; `result.spoils` is 286, `result.standing` is 0, `result.score` is 0 — a large, non-trivial Spoils total is still zeroed by the Greedy band's ×0.

---

## Phase 4 — `checkDemand`: the Demand boundary

`checkDemand` is a one-line, dependency-free comparison — it does not call `scoreHunt` or touch `RoundState`, matching AC3's "the Demand is passed in; this ticket does not decide, store, or advance it." Safe stopping point: both new functions from this ticket (`scoreHunt`, `checkDemand`) are implemented and independently tested; only the `index.ts` re-export remains.

### Task 6: Add `DemandOutcome` and `checkDemand`, with AC7's boundary tests ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/scoring.ts` (append)
- Test: `src/warCouncil/__tests__/scoring.test.ts` (append)

- [x] **Step 1: Write the failing boundary tests**

Append to the test file:

```ts
describe('checkDemand — the boundary is inclusive: equal clears (AC7)', () => {
  it('clears when score equals the demand', () => {
    expect(checkDemand(50, 50)).toBe(DemandOutcome.Cleared)
  })

  it('clears when score exceeds the demand', () => {
    expect(checkDemand(51, 50)).toBe(DemandOutcome.Cleared)
  })

  it('misses when score falls short of the demand', () => {
    expect(checkDemand(49, 50)).toBe(DemandOutcome.Missed)
  })
})
```

Extend the existing `'../scoring'` import line to include the two new names, making it:

```ts
import { checkDemand, DemandOutcome, scoreHunt, scoreRound, tricksToPoints } from '../scoring'
```

- [x] **Step 2: Run and confirm the new block fails to collect — neither name exists yet**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: fails to collect/run — `scoring.ts` has no exported members `checkDemand`/`DemandOutcome`.

- [x] **Step 3: Implement `DemandOutcome` and `checkDemand` in `src/warCouncil/scoring.ts`**

First extend the `'../hunt'` import added in Task 3 with `type Demand` and `type Score`:

```ts
import {
  cardBaseValue,
  resolveStanding,
  STANDING_BANDS,
  type Demand,
  type Score,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
```

and change `HuntScore.score`'s type from `number` to `Score`:

```ts
export interface HuntScore {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly score: Score
}
```

Then add, after `scoreHunt`:

```ts
/** A closed result for comparing a computed score against the Demand — AC7's
 *  boundary default lives here: equal to the Demand clears it. */
export const DemandOutcome = {
  Cleared: 'cleared',
  Missed: 'missed',
} as const
export type DemandOutcome = (typeof DemandOutcome)[keyof typeof DemandOutcome]

/** §11: "pure arithmetic; no new game state beyond one number." Does not
 *  decide, store, or advance `demand` — that is T9's run state. */
export function checkDemand(score: Score, demand: Demand): DemandOutcome {
  return score >= demand ? DemandOutcome.Cleared : DemandOutcome.Missed
}
```

- [x] **Step 4: Typecheck and re-run the scoped test, now expecting a full pass**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: both exit 0; every `describe` block in the file passes — the pre-existing `tricksToPoints`/`scoreRound` tests, and all four new blocks from Phases 3 and 4.

---

## Phase 5 — Wire the new exports through `src/warCouncil/index.ts`

The last production-code change: make `scoreHunt`, `checkDemand`, `DemandOutcome`, and `HuntScore` importable the same way every other engine export already is, so a later ticket (T7, T9) can consume them without reaching past the module boundary into `scoring.ts` directly. Safe stopping point: the module's public surface is complete and type-checks; no behaviour changes.

### Task 7: Export `scoreHunt`, `checkDemand`, `DemandOutcome`, and `HuntScore` from `src/warCouncil/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/index.ts:22`

- [x] **Step 1: Add the re-exports**

Change:

```ts
export { scoreRound, tricksToPoints } from './scoring'
```

to:

```ts
export { scoreRound, tricksToPoints, scoreHunt, checkDemand, DemandOutcome } from './scoring'
export type { HuntScore } from './scoring'
```

`DemandOutcome` needs only the value-export line — `scoring.ts` declares it as a merged `export const DemandOutcome = {...} as const` plus `export type DemandOutcome = ...` on the same name, exactly `IllegalMoveReason`'s shape in `src/warCouncil/types.ts`, and this file already re-exports `IllegalMoveReason`/`PlayerSide`/`RoundPhase` the same single-line way with no separate `export type` line.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 6 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 8: Confirm no Standing-multiplier literal survives outside `hunt/config.ts` ✓

- [x] **Step 1: Grep source for the migrated if-chain's condition shape**

Run: `Get-ChildItem -Recurse -Include *.ts,*.tsx -Path src | Select-String -Pattern "tricks <= 3|tricks === 4|tricks === 5|tricks === 6|tricks <= 9"`
Expected: zero hits — the if-chain from `tricksToPoints` is gone. `STANDING_BANDS` in `src/hunt/config.ts` is unaffected: it declares the bands as object literals with `minTricks`/`maxTricks` fields, not as these comparison expressions, so it is correctly not a hit even though the recursive glob does reach it.

(`-Recurse` with `-Include` is used rather than `Select-String -Path src\**\*.ts` because PowerShell's `**` does not cross more than one directory level — `src\warCouncil\**\*.ts` would match only `src\warCouncil\__tests__\*.ts` and silently skip `src\warCouncil\scoring.ts` itself, which is the one file this check most needs to read.)

### Task 9: Confirm the pure-core boundary still holds for `src/warCouncil/**` and `src/hunt/**` ✓

- [x] **Step 1: Grep for React and DOM references inside the pure-logic trees**

Run: `Get-ChildItem -Recurse -Include *.ts -Path src\warCouncil,src\hunt | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits — `scoreHunt`/`checkDemand` add no React import and no DOM/browser global. This grep backs up the ESLint override in `eslint.config.js` that already scopes `no-restricted-imports`/`no-restricted-globals` to these two trees (per `.claude/workflow/web-project.md` → Architectural boundaries); `npm run lint` in Task 10 is the enforcing gate, this step is the cheap independent confirmation.

### Task 10: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 11: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: migrated `tricksToPoints` onto T2's `resolveStanding`; added `scoreHunt(state, side)` and `checkDemand(score, demand)` so a Hunt has a computable outcome (Spoils × Standing, checked against a passed-in Demand); no UI touched.
- The two judgement calls flagged in `plan.md` → Risks and judgement calls: keeping `tricksToPoints`/`scoreRound` unrenamed with unchanged UI-facing output until T7; the `Score` type alias added for symmetry though not named in the ACs.
- Verification results from Phases 1–6 (typecheck, lint, scoped and full Vitest runs, build).
- One-line note for future contributors: `scoreHunt`/`checkDemand` are the first two consumers of T2's/T3's injectable-parameter pattern (`cardValue`, `standingTable`) outside their own definitions — the next ticket needing a config override in a test should reach for the same shape rather than mutating `STANDING_BANDS` in place.

---

## Self-review

**Spec coverage:**
- AC1 (no multiplier literal survives, reads T2's resolver) — Task 1, verified by Task 8's grep.
- AC2 (`scoreHunt` returns the five fields, computed once) — Task 3.
- AC3 (`checkDemand`, Demand passed in, no run/store/advance) — Task 6.
- AC4 (§3's full 14-row table at flat value 1) — Task 3, Step 1.
- AC5 (×18 Humble break-even via injected config, no other code change) — Task 4.
- AC6 (Greedy ×0 zeroes a round with maximal Spoils) — Task 5.
- AC7 (`checkDemand` boundary — equal clears) — Task 6, Step 1.
- AC8 (no run, no encounter index, no second Demand) — satisfied by `scoreHunt`/`checkDemand`'s signatures throughout Phases 3–4; nothing in any task reads `DemandCurve`/`DEMAND_CURVE` or an encounter index.
- AC9 (scoped Vitest, typecheck, lint green) — every phase's typecheck/scoped-test steps, plus Task 10's full gate.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `HuntScore`, `scoreHunt`, `DemandOutcome`, `checkDemand`, and `Score` are spelled identically across Phases 2–5 and the end state matches `plan.md` Part 2 → Data shapes exactly. `huntState`/`fillerCards`/`NEUTRAL_RANKS` are introduced once in Task 3 and reused, not redefined, by Tasks 4–6. One deliberate ordering detail: `HuntScore.score` is typed `number` when Task 3 creates it and becomes the `Score` alias in Task 6, because `tsconfig.app.json` sets `noUnusedLocals` and importing `Score`/`Demand` before `checkDemand` uses them would fail Task 3's own typecheck step. `plan.md`'s Data shapes shows the finished form; the split exists only so every phase boundary type-checks.

**Import hygiene:** Every task that adds an import states the full resulting import line rather than saying "extend the import", so the executor never creates a second `from '../scoring'`, `from '../types'`, or `from '../hunt'` statement in the same file. `verbatimModuleSyntax` is on, so type-only names carry an inline `type` prefix, matching `spoils.ts`'s existing style.

**Phase boundary cleanliness:** Phase 1 ends with `tricksToPoints` migrated and the untouched `scoring.test.ts` suite still green — no half-applied rename. Phase 2 ends with `Score` exported and unused, which type-checks cleanly. Phase 3 ends with `scoreHunt`/`HuntScore` fully implemented and three passing test blocks; `checkDemand` does not exist yet, but nothing yet references it, so this is not a dangling import. Phase 4 ends with both new functions implemented, exported from `scoring.ts`, and every test in the file passing. Phase 5 ends with the public `index.ts` surface complete. Phase 6 makes no production change.
