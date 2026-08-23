# Tasks: Buff pile — data model, tiers, and per-run ownership

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Add one shared `Buff` data type and an owned, per-run "buff pile" to the Hunt engine —
mirroring how `CheatCard` and `RUN_STARTING_CHEATS` already work — seeded with 4 bronze buffs at
`startRun` and carried across fight boundaries. No activation logic, no UI, no slot-machine draw.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/buffs.ts` — `Buff` type, `BuffTier`, `BuffId`, `BuffCondition`, `BuffReward`,
  `BuffRewardAxis`, the placeholder content constants, and `seedStartingBuffPile`.
- `src/hunt/__tests__/buffs.test.ts` — unit tests for `seedStartingBuffPile`.

**Modified:**
- `src/hunt/config.ts` — add `STARTING_BUFF_COUNT`.
- `src/hunt/run.ts` — add `buffs`/`nextBuffId` to `RunState`; seed them in `startRun`.
- `src/hunt/index.ts` — export the new `buffs.ts` symbols and `STARTING_BUFF_COUNT`.
- `src/hunt/__tests__/run.test.ts` — persistence tests carrying `buffs`/`nextBuffId` across
  `advanceRun`/`recordEncounter`, and a starting-seed test. (Implementer note: these tests were
  written here per-spec, then split into a new sibling file — see below — once the edit pushed
  `run.test.ts` to 446 lines, over the project's 400-line budget.)

**Created (Implementer addition, Phase 3):**
- `src/hunt/__tests__/run-buffs.test.ts` — the three DLR-105 AC2/AC3 tests (starting-seed shape,
  persistence across one and two fight boundaries), split out of `run.test.ts` to keep both files
  under the 400-line budget. Test content is unchanged from the spec's exact code; only the file
  location and a duplicated `winEncounter`/`damage` helper pair moved.

**Deleted:** (none)

**Developer decides or observes:** (none — no tuning value, no UI, no runtime-judgement item.
The one open question in `plan.md` → Risks and judgement calls, "placeholder condition/reward
content," was resolved by the Part 1 approval gate rather than deferred here.)

---

## Phase 1 — The `Buff` type and its pure module

This phase adds `src/hunt/buffs.ts` in isolation — no other file changes yet — so it type-checks
and unit-tests entirely on its own before anything in `run.ts` depends on it. A safe stopping
point: the module compiles, its tests pass, and nothing else in the tree references it yet.

### Task 1: Add the `Buff` type and `seedStartingBuffPile` to `src/hunt/buffs.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/buffs.ts`
- Test: `src/hunt/__tests__/buffs.test.ts`

- [x] **Step 1: Write the failing tests for `seedStartingBuffPile`**

Create `src/hunt/__tests__/buffs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  BuffRewardAxis,
  BuffTier,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  seedStartingBuffPile,
} from '../buffs'

describe('seedStartingBuffPile', () => {
  it('mints `count` buffs with consecutive ids from `firstId`, all bronze (AC1/AC3)', () => {
    const pile = seedStartingBuffPile(2, 1)
    expect(pile).toEqual([
      { id: 1, tier: BuffTier.Bronze, condition: UNASSIGNED_BUFF_CONDITION, reward: UNASSIGNED_BUFF_REWARD },
      { id: 2, tier: BuffTier.Bronze, condition: UNASSIGNED_BUFF_CONDITION, reward: UNASSIGNED_BUFF_REWARD },
    ])
  })

  it('seeds nothing for 0 rather than throwing', () => {
    expect(seedStartingBuffPile(0, 1)).toEqual([])
  })

  it('starts ids at `firstId`, not always 1', () => {
    expect(seedStartingBuffPile(1, 7)).toEqual([
      { id: 7, tier: BuffTier.Bronze, condition: UNASSIGNED_BUFF_CONDITION, reward: UNASSIGNED_BUFF_REWARD },
    ])
  })

  it('the reward axis is a value from the three known axes (AC1)', () => {
    expect(Object.values(BuffRewardAxis)).toEqual(['magnitude', 'durationTricks', 'heartCount'])
  })
})
```

- [x] **Step 2: Run the new spec and confirm it fails on a missing module**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts`
Expected: fails — `../buffs` does not exist yet.

- [x] **Step 3: Implement `src/hunt/buffs.ts`**

```ts
export const BuffTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
} as const
export type BuffTier = (typeof BuffTier)[keyof typeof BuffTier]

/** Minted from `RunState.nextBuffId`, never from `Math.random()` — `src/hunt/` is
 *  lint-enforced DOM-free and must stay deterministic, exactly as `CheatCardId` already is. */
export type BuffId = number

/** AC1's three known reward axes — the tier-scaled quantity varies PER CARD, not a fixed
 *  "damage" field. Closed union deliberately: this is exactly what AC1's own risk note asks
 *  to be reviewed before this ticket is marked done. A fourth axis is a type change for
 *  whichever later ticket needs it. */
export const BuffRewardAxis = {
  Magnitude: 'magnitude',
  DurationTricks: 'durationTricks',
  HeartCount: 'heartCount',
} as const
export type BuffRewardAxis = (typeof BuffRewardAxis)[keyof typeof BuffRewardAxis]

/** A data-only descriptor — no evaluator. AC4 defers activation logic to a later ticket;
 *  `kind` is an open string because the real condition catalog (design doc §5) is explicitly
 *  "TO BE REVIEWED, not committed." */
export interface BuffCondition {
  readonly kind: string
}

/** The tier-scaled payoff. `axis` names WHICH quantity this buff's tier scales (magnitude,
 *  duration, or heart count); `value` is this buff's current tier's figure on that axis. */
export interface BuffReward {
  readonly axis: BuffRewardAxis
  readonly value: number
}

/** One owned buff. Carries no evaluation logic — condition matching and reward application are
 *  a later ticket's job (T5). */
export interface Buff {
  readonly id: BuffId
  readonly tier: BuffTier
  readonly condition: BuffCondition
  readonly reward: BuffReward
}

/**
 * The starting pile's placeholder content — every seeded buff shares this inert condition and
 * a zero-value reward, since the real catalog (design doc §5) is not yet authored (DLR-103 T7a)
 * and AC4 rules out anything reading these values yet. Exported so the seeding test can assert
 * against it without duplicating the literal.
 */
export const UNASSIGNED_BUFF_CONDITION: BuffCondition = { kind: 'unassigned' }
export const UNASSIGNED_BUFF_REWARD: BuffReward = { axis: BuffRewardAxis.Magnitude, value: 0 }

/**
 * AC3 — the run's opening pile: `count` bronze buffs, all placeholder content, with
 * consecutive ids starting at `firstId`. Mirrors `grantCheats`'s `(count, firstId)` shape but
 * carries no upper-bound throw: unlike `CHEAT_SLOT_COUNT`, no capacity cap is stated anywhere in
 * this ticket's scope for the buff pile (see plan.md's Assumptions).
 */
export function seedStartingBuffPile(count: number, firstId: BuffId): readonly Buff[] {
  return Array.from({ length: count }, (_, i) => ({
    id: firstId + i,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }))
}
```

- [x] **Step 4: Run the spec again and confirm it passes**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts`
Expected: exits 0, all 4 tests pass.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 2 — Wire the buff pile into `RunState`

This phase adds `buffs`/`nextBuffId` to `RunState`, seeds them in `startRun`, and re-exports the
new symbols through the barrel. `runTransitions.ts` needs no edit — its `{ ...run, ... }` spreads
already carry any field neither `advanceRun` nor `recordEncounter` explicitly overrides, exactly as
`whetstones` proves today. A safe stopping point: the whole `src/hunt/` tree type-checks and every
existing test (which asserts nothing about `buffs`/`nextBuffId` yet) still passes unchanged.

### Task 2: Add `buffs`/`nextBuffId` to `RunState` and seed them in `startRun` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts`
- Modify: `src/hunt/run.ts`

- [x] **Step 1: Add `STARTING_BUFF_COUNT` to `src/hunt/config.ts`**

Add beside `RUN_STARTING_CHEATS`:

```ts
// DLR-105 AC3 — the run's opening buff-pile size, all bronze. TRANSCRIBED from the ticket's AC3
// and design doc §8 ("a fresh run starts with 4 buff cards already in the player's pile... all
// four arrive at bronze") — not chosen here.
// UNIT: buffs granted once, at the start of a run, all at BuffTier.Bronze.
export const STARTING_BUFF_COUNT = 4
```

- [x] **Step 2: Add the two fields to `RunState` in `src/hunt/run.ts`**

Add the import:

```ts
import { seedStartingBuffPile, type Buff, type BuffId } from './buffs'
```

Add `STARTING_BUFF_COUNT` to the existing `import { ... } from './config'` block.

Add to the `RunState` interface, after `lastQuickKillPayout`:

```ts
  /** DLR-105 AC2/AC3 — the player's owned buff pile, seeded at `startRun` and carried through
   *  every `advanceRun`/`recordEncounter` spread untouched — no explicit parameter, mirroring
   *  `whetstones` rather than `cheats`, because no consumer in this ticket spends or replaces a
   *  buff mid-hand (that is T5's job). NEVER persisted across runs, exactly as `coins` is not. */
  readonly buffs: readonly Buff[]
  /** The next id to mint — monotonic, never reused, mirroring `nextCheatId`. */
  readonly nextBuffId: BuffId
```

- [x] **Step 3: Seed the fields in `startRun`**

In `startRun`'s returned object, add after `nextCheatId: RUN_STARTING_CHEATS + 1,`:

```ts
    buffs: seedStartingBuffPile(STARTING_BUFF_COUNT, 1),
    nextBuffId: STARTING_BUFF_COUNT + 1,
```

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

### Task 3: Export the new symbols from `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the `buffs.ts` exports**

Add a new export block (placed after the existing `CheatCard`/`cheats.ts` block):

```ts
export type { Buff, BuffId, BuffCondition, BuffReward } from './buffs'
export {
  BuffTier,
  BuffRewardAxis,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  seedStartingBuffPile,
} from './buffs'
```

- [x] **Step 2: Add `STARTING_BUFF_COUNT` to the existing `config.ts` export block**

Add `STARTING_BUFF_COUNT,` to the existing `export { ... } from './config'` list (alongside
`RUN_STARTING_CHEATS`).

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 3 — Persistence and starting-seed tests on `RunState`

This phase adds the tests AC2 and AC3 explicitly ask for: the starting pile's shape, and that it
survives two fight boundaries. A safe stopping point: `src/hunt/` type-checks, and every test in
the tree — old and new — passes.

### Task 4: Assert the starting seed and cross-fight persistence in `run.test.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/__tests__/run.test.ts`
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Add the starting-seed test**

Add a new `describe` block (following the existing `describe('Cheats on RunState (DLR-83 AC3)', ...)`
block's placement and import style — `startRun`, `advanceRun`, `recordEncounter` are already
imported in this file):

```ts
describe('Buff pile on RunState (DLR-105 AC2/AC3)', () => {
  it('seeds STARTING_BUFF_COUNT bronze buffs at the start of a run (AC3)', () => {
    const run = startRun()
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT)
    expect(run.buffs.every((b) => b.tier === BuffTier.Bronze)).toBe(true)
    expect(run.nextBuffId).toBe(STARTING_BUFF_COUNT + 1)
  })

  it('carries the buff pile across a fight boundary untouched (AC2)', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.envenomCharges,
      false,
      run.discardsRemaining,
      null,
    )
    const next = advanceRun(won)
    expect(next.buffs).toEqual(run.buffs)
    expect(next.nextBuffId).toBe(run.nextBuffId)
  })

  it('carries the buff pile across two fight boundaries (AC2)', () => {
    const first = startRun()
    const wonFirst = recordEncounter(
      first,
      winEncounter(first.encounter),
      first.cheats,
      first.envenomCharges,
      false,
      first.discardsRemaining,
      null,
    )
    const second = advanceRun(wonFirst)
    const wonSecond = recordEncounter(
      second,
      winEncounter(second.encounter),
      second.cheats,
      second.envenomCharges,
      false,
      second.discardsRemaining,
      null,
    )
    const third = advanceRun(wonSecond)
    expect(third.buffs).toEqual(first.buffs)
  })
})
```

Add `BuffTier` and `STARTING_BUFF_COUNT` to this file's existing top-of-file imports from `'../buffs'`
and `'../config'` respectively (matching how `RUN_STARTING_CHEATS` is already imported from
`'../config'` in this file).

- [x] **Step 2: Run the file's scoped spec**

Run: `npx vitest run src/hunt/__tests__/run.test.ts`
Expected: exits 0, all tests pass including the 3 new ones.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 5: Confirm the `src/hunt/**` purity boundary still holds ✓

- [x] **Step 1: Grep the new and modified files for React or DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Actual (QA):** zero hits. PASS.

### Task 6: Confirm no tunable was hard-coded and no stale name remains ✓

- [x] **Step 1: Grep source and copy for the literal `STARTING_BUFF_COUNT` owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "seedStartingBuffPile\(4,"`
Expected: zero hits — the literal `4` must only ever appear as `STARTING_BUFF_COUNT`'s definition
in `config.ts`, never inlined at a call site. **Actual (QA):** zero hits. PASS.

### Task 7: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.
**Actual (QA):** typecheck and lint both exit 0, clean. `npm test` exits 1 with 1 failed test —
`src/hunt/__tests__/envenom.test.ts` → `buyFromShop — Envenom (AC1, AC2) > does NOT add a Cheat`.
Confirmed via `git stash`/base-commit re-run to already fail on `e37dd68`, the commit before this
contract started — caused by an earlier, unrelated commit that raised `RUN_STARTING_CHEATS` from 0
to 1 without updating this test's expectation. This contract touches none of `envenom.ts`,
`shop.ts`, `runTransitions.ts`, or `run.test.ts`. Recorded as a pre-existing, out-of-scope defect,
not a regression introduced here — not fixed in this contract's fix pass per its own scope
boundary. Every test this contract added or touched (`buffs.test.ts`, `run-buffs.test.ts`) passes.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. **Actual (QA):** exits 0, `dist/` written
(`index.html`, css, js), no errors. PASS.

### Task 8: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: adds `Buff` type, `BuffTier`/`BuffCondition`/`BuffReward`/`BuffRewardAxis`, and an
  owned per-run buff pile (`RunState.buffs`/`nextBuffId`), seeded with `STARTING_BUFF_COUNT` (4)
  bronze buffs at `startRun` and carried across fight boundaries. No activation, UI, or
  slot-machine logic — those are later DLR-103 tickets (T4/T5/T7/T8).
- Note that the seeded buffs' `condition`/`reward` content is inert placeholder data pending the
  real catalog (DLR-103 T7a) — flagged and approved in `plan.md`'s Assumptions.
- Verification results from Task 7.
- One-line note for future contributors: the buff pile has no capacity cap, unlike Cheat's
  2-slot cap — a deliberate scope decision, not an oversight, per `plan.md`'s Risks section.

---

## Self-review

**Spec coverage:**
- In-scope bullet "`Buff` type... reward descriptor whose axis varies per card" — Task 1.
- In-scope bullet "`RunState` gains an owned buff pile... carried through `advanceRun` and
  `recordEncounter`" — Task 2, verified by Task 4.
- In-scope bullet "`STARTING_BUFF_COUNT`... and a seeding function" — Tasks 1, 2, verified by
  Task 4.
- In-scope bullet "Unit tests: the type shape, the starting seed... and persistence across two
  fight boundaries" — Task 1 (type shape), Task 4 (seed + two-boundary persistence).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or "similar to Task N" references.
Every step shows the exact code or command.

**Type / name consistency:** `Buff`, `BuffId`, `BuffTier`, `BuffCondition`, `BuffReward`,
`BuffRewardAxis`, `UNASSIGNED_BUFF_CONDITION`, `UNASSIGNED_BUFF_REWARD`, `seedStartingBuffPile`,
and `STARTING_BUFF_COUNT` are spelled identically across Tasks 1, 2, 3, and 4, and match
`plan.md` Part 2 → Data shapes exactly.

**Phase boundary cleanliness:** Phase 1 ends with `buffs.ts` compiling and unit-tested in
isolation, with no other file referencing it yet — no half-applied rename, no dead import. Phase 2
ends with the whole `src/hunt/` tree type-checking and every pre-existing test still passing
unchanged, with the new fields wired but not yet asserted on. Phase 3 ends with the new
persistence/seed assertions passing alongside every existing test. Phase 4 performs no production
change, only verification.
