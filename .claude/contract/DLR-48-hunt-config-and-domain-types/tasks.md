# Tasks: Hunt configuration module and Hunt domain types

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Give every downstream Hunt ticket one place to read tunable numbers from (`src/hunt/config.ts`) and one place the Hunt/run vocabulary is typed (`src/hunt/types.ts`), so playtesting changes a value in one place and no ticket after this one invents an incompatible shape.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/types.ts` — the §10 vocabulary as types: `Hunt`, `Quarry`, `Spoils`, `Standing`, `Demand`, `QuarryCharacter`.
- `src/hunt/config.ts` — the Standing band table + resolver, card base value rule, Demand curve shape, Forage budget, encounters per run.
- `src/hunt/__tests__/config.test.ts` — Vitest coverage for everything in `config.ts`.
- `src/hunt/index.ts` — barrel export, mirrors `src/warCouncil/index.ts`.

**Modified:**
- `eslint.config.js:23-24` — extend the existing pure-core rule block's `files` array to also cover `src/hunt/**/*.{ts,tsx}`.
- `.claude/workflow/web-project.md` → "Architectural boundaries" section — correct the stale claim that no import boundary is enforced; the `src/warCouncil/**` block already exists and this ticket extends it.

**Deleted:** (none)

**Developer decides or observes:** (none — see plan.md → Risks; the one open item, `DEMAND_CURVE`'s actual numbers, is explicitly deferred past this ticket to a future playtest/UI pass per the developer's own direction at the approval gate, not something this contract routes back mid-execution)

---

## Phase 1 — Hunt vocabulary types

Adds `src/hunt/types.ts` with no dependency on anything else this contract creates. Type-only file — the phase boundary is safe because it type-checks standalone and nothing yet imports it.

### Task 1: Create `src/hunt/types.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/types.ts`

- [x] **Step 1: Write the vocabulary types**

```ts
export const QuarryCharacter = {
  Swan: 'swan',
  Fox: 'fox',
  Woodcutter: 'woodcutter',
  Witch: 'witch',
  Monarch: 'monarch',
} as const
export type QuarryCharacter = (typeof QuarryCharacter)[keyof typeof QuarryCharacter]

/** The CPU opponent for one encounter — a character cast from the deck's odd ranks (§4). */
export interface Quarry {
  readonly character: QuarryCharacter
}

/** Summed value of cards captured — the additive term of §1's equation. */
export type Spoils = number

/** The multiplier read off the trick-count band — the multiplicative term of §1's equation. */
export type Standing = number

/** The encounter's score target; rises per encounter (§5). */
export type Demand = number

/** One 13-trick round — the inner loop, scored once via Spoils × Standing checked against the Demand (§1, §10). */
export interface Hunt {
  readonly quarry: Quarry
  readonly demand: Demand
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Standing band table and resolver

Adds the Standing table and its one reader to `src/hunt/config.ts`, TDD-first since `resolveStanding` has a real invariant (AC6: full 0–13 coverage, no gap, no overlap, table-driven). The phase boundary is safe: the file type-checks and every test added in this phase passes before moving on.

### Task 2: Add `STANDING_BANDS` and `resolveStanding` to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/config.ts`
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Write the failing tests for `resolveStanding`**

```ts
import { describe, expect, it } from 'vitest'
import { STANDING_BANDS, StandingBandName, resolveStanding, type StandingBand } from '../config'

describe('resolveStanding', () => {
  it.each([
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 0],
    [11, 0],
    [12, 0],
    [13, 0],
  ])('tricks=%i -> multiplier %i', (tricks, multiplier) => {
    expect(resolveStanding(tricks).multiplier).toBe(multiplier)
  })

  it('resolves every trick count 0-13 to exactly one band, with no gap and no overlap', () => {
    for (let tricks = 0; tricks <= 13; tricks++) {
      const matches = STANDING_BANDS.filter(
        (band) => tricks >= band.minTricks && tricks <= band.maxTricks,
      )
      expect(matches).toHaveLength(1)
    }
  })

  it('changes the resolved value when a multiplier changes in the table, with no other edit', () => {
    const baseline = resolveStanding(0)
    const mutatedTable: readonly StandingBand[] = STANDING_BANDS.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 99 } : band,
    )
    const mutated = resolveStanding(0, mutatedTable)
    expect(mutated.multiplier).toBe(99)
    expect(mutated.multiplier).not.toBe(baseline.multiplier)
    expect(resolveStanding(0).multiplier).toBe(baseline.multiplier)
  })

  it('throws for a trick count outside the configured 0-13 range', () => {
    expect(() => resolveStanding(14)).toThrow(RangeError)
    expect(() => resolveStanding(-1)).toThrow(RangeError)
  })
})
```

- [x] **Step 2: Run the new test file and confirm it fails on missing module**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails — `src/hunt/config.ts` does not exist yet (`Cannot find module '../config'` or equivalent).

- [x] **Step 3: Implement `StandingBandName`, `StandingBand`, `STANDING_BANDS`, and `resolveStanding`**

```ts
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
```

- [x] **Step 4: Run the test file again and confirm it passes**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: all tests in this file pass.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 3 — Card value rule, Demand curve, and the two provisional constants

Adds the remaining four `config.ts` exports named in AC1. Each is a small, independent addition to the same file and the same test file from Phase 2; the phase boundary is safe because the file and its tests stay internally consistent after each task.

### Task 3: Add `cardBaseValue` to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts` (append)
- Test: `src/hunt/__tests__/config.test.ts` (append)

- [x] **Step 1: Write the failing test**

Append to `src/hunt/__tests__/config.test.ts`:

```ts
import { cardBaseValue } from '../config'

describe('cardBaseValue', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('rank %i is worth its printed rank', (rank) => {
    expect(cardBaseValue(rank)).toBe(rank)
  })
})
```

(Add `cardBaseValue` to the existing `import { ... } from '../config'` line rather than a second import statement.)

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails — `cardBaseValue` is not exported yet.

- [x] **Step 3: Implement `cardBaseValue`**

Append to `src/hunt/config.ts`:

```ts
// §9 "Card base values" — provisional: a card's value is its printed rank,
// not flat 1 (§3, §9 — flat 1 collapses Spoils×Standing to the
// single-variable function 2k×f(k); rank weighting keeps the two terms
// independent).
export function cardBaseValue(rank: number): number {
  return rank
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 4: Add `DemandCurve` and `DEMAND_CURVE` to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts` (append)
- Test: `src/hunt/__tests__/config.test.ts` (append)

- [x] **Step 1: Write the failing test**

Append to `src/hunt/__tests__/config.test.ts`, adding `DEMAND_CURVE` to the existing import:

```ts
describe('DEMAND_CURVE', () => {
  it('ships with no chosen value — both fields stay null until the developer sets them', () => {
    expect(DEMAND_CURVE.base).toBeNull()
    expect(DEMAND_CURVE.growthPerEncounter).toBeNull()
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails — `DEMAND_CURVE` is not exported yet.

- [x] **Step 3: Implement `DemandCurve` and `DEMAND_CURVE`**

Append to `src/hunt/config.ts`:

```ts
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
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 5: Add `FORAGE_BUDGET_PER_ENCOUNTER` and `ENCOUNTERS_PER_RUN` to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts` (append)
- Test: `src/hunt/__tests__/config.test.ts` (append)

- [x] **Step 1: Write the failing test**

Append to `src/hunt/__tests__/config.test.ts`, adding `FORAGE_BUDGET_PER_ENCOUNTER` and `ENCOUNTERS_PER_RUN` to the existing import:

```ts
describe('Forage and run-length constants', () => {
  it('matches the provisional values from DLR-48 AC3', () => {
    expect(FORAGE_BUDGET_PER_ENCOUNTER).toBe(4)
    expect(ENCOUNTERS_PER_RUN).toBe(5)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails — neither constant is exported yet.

- [x] **Step 3: Implement both constants**

Append to `src/hunt/config.ts`:

```ts
// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — undecided in §9 itself; DLR-48 AC3 sets a
// provisional 5 so the prototype is playable.
export const ENCOUNTERS_PER_RUN = 5
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

- [x] **Step 5: Confirm `src/hunt/config.ts` is still within the file-size budget**

Run: `(Get-Content src\hunt\config.ts | Measure-Object -Line).Lines`
Expected: well under 400 (expect roughly 60–70 lines at this point).

---

## Phase 4 — Barrel export and the pure-core boundary

Wires `src/hunt/`'s exports into one importable surface for future tickets and extends the existing pure-core ESLint boundary to cover it, correcting the one doc paragraph that currently says no such boundary exists. Safe stopping point: the module has no consumer yet, so nothing outside `src/hunt/` can be affected by either change.

### Task 6: Create `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/index.ts`

- [x] **Step 1: Write the barrel export**

```ts
export type { Hunt, Quarry, Spoils, Standing, Demand } from './types'
export { QuarryCharacter } from './types'

export type { StandingBand, DemandCurve } from './config'
export {
  StandingBandName,
  STANDING_BANDS,
  resolveStanding,
  cardBaseValue,
  DEMAND_CURVE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
} from './config'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 7: Extend the pure-core ESLint boundary to `src/hunt/**` ✓

- Skill: react-frontend

**Files:**
- Config: `eslint.config.js:23-24` — widen the existing pure-core rule block's `files` array.

- [x] **Step 1: Add `src/hunt/**` to the existing rule block's `files` array**

In `eslint.config.js`, change:

```js
  {
    files: ['src/warCouncil/**/*.{ts,tsx}'],
```

to:

```js
  {
    files: ['src/warCouncil/**/*.{ts,tsx}', 'src/hunt/**/*.{ts,tsx}'],
```

Leave the rest of the block (the `no-restricted-imports` and `no-restricted-globals` rule bodies) unchanged — it already applies to whatever the `files` array matches.

- [x] **Step 2: Lint the new module**

Run: `npx eslint src/hunt`
Expected: exits 0, no errors — confirms `src/hunt/` has no React import and no restricted global.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 8: Correct the stale "Architectural boundaries" claim in `web-project.md` ✓

- Skill: none — documentation correction, no source code change

**Files:**
- Modify: `.claude/workflow/web-project.md` (the "Architectural boundaries" section)

- [x] **Step 1: Replace the stale paragraph**

The current text reads:

```
This project has **no enforced import boundary yet** — there is no subfolder convention, module split, or lint-enforced purity rule beyond the ESLint recommended config and the Vite/React defaults. A previous prototype that lived in this repository enforced a pure-core boundary (a logic tree with no React import and no DOM access) via an ESLint override combining `no-restricted-imports` and `no-restricted-globals`. That mechanism was removed with the prototype it protected, but the pattern is worth re-establishing once the next prototype has a logic tree worth keeping pure.
```

Replace it with:

```
This project enforces a pure-core boundary — no React import, no DOM access — on `src/warCouncil/**` and `src/hunt/**` via an ESLint override in `eslint.config.js` combining `no-restricted-imports` and `no-restricted-globals`. Extend that block's `files` array, don't paste a second copy, when a future pure-logic tree earns the same protection.
```

Leave the remainder of the "Architectural boundaries" section (the paste-back code block reference in `react-frontend`'s `SKILL.md`) as-is — this correction only concerns the paragraph stating the boundary doesn't exist.

- [x] **Step 2: Confirm the file still reads correctly**

Run: `Select-String -Path ".claude\workflow\web-project.md" -Pattern "no enforced import boundary yet"`
Expected: zero hits — the stale claim is gone.

---

## Phase 5 — Final verification

No production changes — only sanity-checks that the cumulative work is clean.

### Task 9: Confirm the pure-core boundary holds for `src/hunt/` ✓

- [x] **Step 1: Grep for React and DOM references inside `src/hunt/`**

Run: `Select-String -Path "src\hunt\**\*.ts" -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

### Task 10: Confirm no new Standing/Demand/Forage constant is duplicated outside `src/hunt/config.ts`, and the Demand curve is still unset ✓

- [x] **Step 1: Grep for a duplicate definition of any new config export**

Run: `Select-String -Path "src\**\*.ts" -Pattern "export const STANDING_BANDS|export const FORAGE_BUDGET_PER_ENCOUNTER|export const ENCOUNTERS_PER_RUN|export const DEMAND_CURVE|export function resolveStanding|export function cardBaseValue" | Where-Object { $_.Path -notlike "*src\hunt\config.ts" }`
Expected: zero hits — every one of these six is declared exactly once, in `src/hunt/config.ts`.

- [x] **Step 2: Confirm `DEMAND_CURVE` still ships unset**

Run: `Select-String -Path "src\hunt\config.ts" -Pattern "base: null" ; Select-String -Path "src\hunt\config.ts" -Pattern "growthPerEncounter: null"`
Expected: exactly one match each — no invented number crept in during Phase 3.

### Task 11: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

Implementer ran the scoped portion (`npm run typecheck`, `npm run lint`, both clean). The unfiltered `npm test` was run by QA per policy (unfiltered suite is QA-only per `.claude/workflow/web-project.md`) — round 1: `Test Files 20 passed (20)` / `Tests 217 passed (217)`; re-confirmed with the same result in round 2 after the fix pass.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Run by QA per policy (production build is QA-only). Round 1 and round 2 both green — `dist/index.html` + assets written, no bundler errors.

### Task 12: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds `src/hunt/` (`types.ts` + `config.ts` + `index.ts`) holding the Hunt vocabulary and every §9-cited tunable behind one resolver; extends the existing `src/warCouncil/**` pure-core ESLint boundary to also cover `src/hunt/**`; corrects `web-project.md`'s stale "no boundary enforced" claim. Nothing in the running game changes — `scoring.ts` is untouched per AC7.
- Decisions the developer already made at the planning gate: `DEMAND_CURVE` ships with `base`/`growthPerEncounter` both `null` — no number chosen, explicitly deferred to a future playtest/UI pass rather than invented here.
- Verification results from Task 11 (typecheck/lint/test/build).
- One-line note for future contributors: `src/hunt/**` now carries the same pure-core ESLint boundary as `src/warCouncil/**` — extend the `files` array in `eslint.config.js`, don't add a second block, the next time a pure-logic tree is added.

---

## Post-review fix pass (2026-08-10)

Defender flagged two Warning-level issues after the parallel review; both fixed in this pass, no new task numbers:
- `eslint.config.js:32` — generalized the `no-restricted-imports` message from `'src/warCouncil/ is pure TypeScript — no React.'` to `'This module is pure TypeScript — no React.'` so it names the violating file correctly now that the block also covers `src/hunt/**`.
- `.claude/workflow/web-project.md` → `Layout` section — updated the stale "53 source files across four modules, 19 test files" line and the directory tree (missing `hunt/`) to "57 source files across five modules, 20 test files" and added `hunt/` to the tree. Counts verified against disk via `Get-ChildItem -Recurse`.

Re-verified: `npm run typecheck` (exit 0), `npx eslint eslint.config.js src/hunt` (exit 0, no output), `Select-String -Path ".claude\workflow\web-project.md" -Pattern "no enforced import boundary yet"` (zero hits).

## Self-review

**Spec coverage:**
- AC1 (config module, all five §9 rows as named constants with citing comments) — Tasks 2, 3, 4, 5.
- AC2 (`{minTricks, maxTricks, name, multiplier}` shape, boundaries/values separately editable) — Task 2.
- AC3 (provisional values: Standing six multipliers, card value = rank, Forage budget 4, encounters 5) — Tasks 2, 3, 5.
- AC4 (Hunt types file: `Hunt`, `Quarry`, `Spoils`, `Standing`, `Demand`, `QuarryCharacter`, no `Snare`) — Task 1.
- AC5 (single resolver function, only place in `src/` doing this lookup — scoped to this ticket's new logic per plan.md's Assumption) — Task 2.
- AC6 (0–13 full coverage, no gap/overlap, mutation test) — Task 2, Step 1.
- AC7 (no runtime behaviour change; `scoring.ts` untouched) — confirmed by the File map (no `warCouncil/` entry) and Task 10's duplicate-definition grep.
- AC8 (`typecheck`, `lint`, scoped Vitest run green) — every task's own verify step, plus Task 11 for the unfiltered run.
- Plan's own additions (ESLint boundary extension, `web-project.md` correction) — Tasks 7, 8, 9.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command. `DEMAND_CURVE`'s `null` fields are a deliberate, tested, documented value — not a placeholder standing in for missing plan content.

**Type / name consistency:** `StandingBandName`, `StandingBand`, `STANDING_BANDS`, `resolveStanding`, `cardBaseValue`, `DemandCurve`, `DEMAND_CURVE`, `FORAGE_BUDGET_PER_ENCOUNTER`, `ENCOUNTERS_PER_RUN` (all `config.ts`) and `Hunt`, `Quarry`, `Spoils`, `Standing`, `Demand`, `QuarryCharacter` (all `types.ts`) are spelled identically everywhere they appear — Tasks 1–6, the barrel in Task 6, and the grep in Task 10 all reference the same nine `config.ts` identifiers and six `types.ts` identifiers, matching `plan.md` → Data shapes verbatim.

**Phase boundary cleanliness:** Phase 1 ends with a type-checking, standalone `types.ts` with no consumer yet. Phase 2 ends with `config.ts` exporting a fully tested `resolveStanding` over a complete `STANDING_BANDS` table. Phase 3 ends with `config.ts` complete (all five AC1 rows present) and every addition covered by a passing test. Phase 4 ends with the module wired into `index.ts`, the ESLint boundary extended, and the stale doc line corrected — no half-applied rename anywhere, since nothing outside `src/hunt/` imports from it yet. Phase 5 makes no production change.
