# Tasks: Action Points — core resource, single-source-of-truth toggle

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Ship one small, pure, unit-tested `src/hunt/` module that gives the game an Action Points resource — a starting pool, a per-hand refresh rule, and cost/spend primitives that already respect a single `AP_ENABLED` toggle — with no consumer wired up yet.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/actionPoints.ts` — the AP module: refresh rule, toggle-aware cost/afford/spend primitives.
- `src/hunt/__tests__/actionPoints.test.ts` — unit tests for the module.

**Modified:**
- `src/hunt/types.ts` — add the `ActionPoints` type alias.
- `src/hunt/config.ts` — add `AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`, `AP_REFRESH_CADENCE`.
- `src/hunt/__tests__/config.test.ts` — add coverage for the four new config exports.
- `src/hunt/index.ts` — barrel re-exports for the new type, config keys, and module functions.

**Deleted:** (none)

**Developer decides or observes:**
- config → `STARTING_AP` — currently `6`, an unplayed placeholder pending T5's `BUFF_ACTIVATION_COST` table and T6's `APPLY_DAMAGE_AP_COST` existing to test it against.
- config → `AP_ENABLED` — currently defaults `true`; a judgement call (see `plan.md` Part 2 → Risks and judgement calls) since the brief didn't state a default and no consumer yet makes the choice visible either way.
- design → whether `actionPoints.ts`'s functions taking plain `pool`/`cost` values (rather than a `RunState`/`RoundState` field seeded in this ticket) is the right shape for T5/T6 to build against — flagged in `plan.md` Part 2 → Risks and judgement calls as the most consequential scope call in this plan.

---

## Phase 1 — Types, config keys, and the AP module

This phase adds every new name the ticket introduces — the `ActionPoints` type, the four config keys, and the `actionPoints.ts` module itself — end to end with its own tests, so the phase boundary leaves `src/hunt/` fully type-checking with no dangling export. Task 3's tests are written and run within this same phase; there is no later phase to defer them to.

### Task 1: Add the `ActionPoints` type to `src/hunt/types.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/types.ts`

- [x] **Step 1: Add the type alias**

Append after the existing `Coins` type (end of file):

```ts
/** DLR-104 AC1 — the resource buff activation (T5) and Apply Damage (T6) will draw against.
 *  A whole number, never fractional or negative in practice — spendAp in actionPoints.ts
 *  refuses rather than going below zero, exactly as Coins already does for coins. */
export type ActionPoints = number
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add AP config keys to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts:1` (import line) and end of file (new exports)
- Config: `src/hunt/config.ts` — add `AP_ENABLED` (value `true`, developer decision), `STARTING_AP` (value `6`, developer-chosen placeholder), `ApRefreshCadence` + `AP_REFRESH_CADENCE` (value `ApRefreshCadence.PerHand`)

- [x] **Step 1: Widen the `types` import**

Change line 1 from:

```ts
import { QuarryCharacter, type Health, type Damage, type Coins } from './types'
```

to:

```ts
import { QuarryCharacter, type Health, type Damage, type Coins, type ActionPoints } from './types'
```

- [x] **Step 2: Append the four new exports**

Add at the end of `src/hunt/config.ts`, after `MAX_CARDS_PER_DISCARD`:

```ts
// DLR-104 AC1 — a single flag such that flipping it off makes every AP-gated action free,
// with no consuming code writing its own bypass (see actionPoints.ts's apCostFor).
// DEVELOPER DECISION: defaults true so the module is exercisable in its own tests; flip to
// false at any time before a consumer lands with no other code change required.
// UNIT: on/off.
export const AP_ENABLED = true

// DLR-104 AC1 — the player's opening AP pool, and what a perHand refresh resets to.
// DEVELOPER-CHOSEN PLACEHOLDER pending the first playtest — no consumer exists yet (AC4), so
// this number has never been played against.
// UNIT: action points.
export const STARTING_AP: ActionPoints = 6

// DLR-104 AC1 — when the AP pool resets. An ENUM-SHAPED CONSTANT, not a boolean: the
// ticket's own risk note is explicit that a boolean here is what forces a refactor the day a
// playtest wants per-fight or per-run pooling instead of per-hand. `erasableSyntaxOnly` rules
// out a real TypeScript `enum` (tsconfig.app.json) — this is the same `as const` shape
// TelegraphFidelity above already uses.
export const ApRefreshCadence = {
  PerHand: 'perHand',
} as const
export type ApRefreshCadence = (typeof ApRefreshCadence)[keyof typeof ApRefreshCadence]

// §1's "each hand" framing / the game-designer consult's recommended default, per the epic
// breakdown's T1.
export const AP_REFRESH_CADENCE: ApRefreshCadence = ApRefreshCadence.PerHand
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 3: Write `src/hunt/actionPoints.ts` test-first ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/actionPoints.ts`
- Test: `src/hunt/__tests__/actionPoints.test.ts`

- [x] **Step 1: Write the failing tests**

Create `src/hunt/__tests__/actionPoints.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { AP_ENABLED, STARTING_AP } from '../config'
import {
  apCostGiven,
  apCostFor,
  canAffordAp,
  spendAp,
  refreshActionPointsForNewHand,
} from '../actionPoints'

describe('apCostGiven (AC2 — the toggle logic, both branches)', () => {
  it('returns the cost unchanged when enabled', () => {
    expect(apCostGiven(5, true)).toBe(5)
    expect(apCostGiven(0, true)).toBe(0)
  })

  it('returns zero when disabled, regardless of the cost', () => {
    expect(apCostGiven(5, false)).toBe(0)
    expect(apCostGiven(8, false)).toBe(0)
  })
})

describe('apCostFor (wired to the live AP_ENABLED config value)', () => {
  it('matches apCostGiven at the current AP_ENABLED setting', () => {
    expect(apCostFor(7)).toBe(apCostGiven(7, AP_ENABLED))
  })
})

describe('canAffordAp', () => {
  it('is true when the pool covers the cost', () => {
    expect(canAffordAp(10, 5)).toBe(true)
    expect(canAffordAp(5, 5)).toBe(true)
  })

  it('is false when the pool falls short', () => {
    expect(canAffordAp(4, 5)).toBe(false)
  })
})

describe('spendAp (AC2 — the single place a cost is actually deducted)', () => {
  it('deducts the cost from the pool', () => {
    expect(spendAp(10, 3)).toBe(7)
  })

  it('refuses a spend the pool cannot cover, rather than clamping to zero', () => {
    expect(() => spendAp(2, 3)).toThrow(RangeError)
  })

  it('allows spending the pool down to exactly zero', () => {
    expect(spendAp(3, 3)).toBe(0)
  })
})

describe('refreshActionPointsForNewHand (AC3 — perHand reset)', () => {
  it('resets to STARTING_AP regardless of the incoming pool size', () => {
    expect(refreshActionPointsForNewHand(0)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP - 1)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP + 4)).toBe(STARTING_AP)
  })
})
```

- [x] **Step 2: Confirm the test file fails to run (the module doesn't exist yet)**

Run: `npx vitest run src/hunt/__tests__/actionPoints.test.ts`
Expected: fails — `actionPoints.ts` does not exist yet, so the import cannot resolve.

- [x] **Step 3: Write `src/hunt/actionPoints.ts`**

```ts
import { AP_ENABLED, AP_REFRESH_CADENCE, ApRefreshCadence, STARTING_AP } from './config'
import type { ActionPoints } from './types'

/**
 * DLR-104 AC2 — the toggle's decision logic, taking `enabled` as an explicit parameter so
 * both branches are directly unit-testable against `AP_ENABLED`'s current value rather than
 * only against whichever one it happens to default to. `apCostFor` below is the only caller
 * a real consumer should ever use.
 */
export function apCostGiven(cost: ActionPoints, enabled: boolean): ActionPoints {
  return enabled ? cost : 0
}

/**
 * THE single statement of what a cost actually is once AP_ENABLED is taken into account —
 * every future AP-gated consumer (buff activation, Apply Damage) calls this instead of
 * checking AP_ENABLED itself, mirroring src/warCouncil/voluntaryCashOut.ts's
 * applyDamageRefusalFor. Flip AP_ENABLED off in config.ts and every cost reads as free, with
 * no consuming code writing its own bypass.
 */
export function apCostFor(cost: ActionPoints): ActionPoints {
  return apCostGiven(cost, AP_ENABLED)
}

/** Whether `pool` covers `cost`, honouring AP_ENABLED through apCostFor. */
export function canAffordAp(pool: ActionPoints, cost: ActionPoints): boolean {
  return pool >= apCostFor(cost)
}

/**
 * Spends `cost` (through apCostFor) from `pool`. Throws rather than clamping to zero — an
 * insufficient-AP spend attempt is a caller bug the same way src/hunt/cheats.ts's
 * removeCheat treats a double-spend, and clamping would silently let a consumer commit an
 * action it could not actually afford.
 */
export function spendAp(pool: ActionPoints, cost: ActionPoints): ActionPoints {
  const effectiveCost = apCostFor(cost)
  if (pool < effectiveCost) {
    throw new RangeError(`Cannot spend ${effectiveCost} AP — only ${pool} available`)
  }
  return pool - effectiveCost
}

/**
 * DLR-104 AC3 — the pool's value at the top of a new hand. Only `PerHand` is implemented
 * today; any other cadence value passes `currentAp` through untouched rather than throwing,
 * which is the shape the ticket's own risk note asks for so a later cadence (per-fight,
 * per-run) needs a new config entry and a new branch here, not a type change.
 */
export function refreshActionPointsForNewHand(currentAp: ActionPoints): ActionPoints {
  if (AP_REFRESH_CADENCE === ApRefreshCadence.PerHand) {
    return STARTING_AP
  }
  return currentAp
}
```

- [x] **Step 4: Run the test file and confirm it passes**

Run: `npx vitest run src/hunt/__tests__/actionPoints.test.ts`
Expected: exits 0, all tests in the file pass.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 4: Extend `src/hunt/__tests__/config.test.ts` with the four new config exports ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Widen the `../config` import**

Add `AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`, `AP_REFRESH_CADENCE` to the existing `import { ... } from '../config'` block at the top of the file.

- [x] **Step 2: Add a describe block**

Append near the end of the file, after the `DLR-93 — the flask` describe block:

```ts
describe('Action Points (DLR-104 AC1)', () => {
  it('starts with a positive, finite, whole-number pool', () => {
    expect(Number.isInteger(STARTING_AP)).toBe(true)
    expect(STARTING_AP).toBeGreaterThan(0)
  })

  it('defaults AP_ENABLED to a real boolean, not a truthy placeholder', () => {
    expect(typeof AP_ENABLED).toBe('boolean')
  })

  it('defaults the refresh cadence to perHand, the game-designer-recommended default', () => {
    expect(AP_REFRESH_CADENCE).toBe(ApRefreshCadence.PerHand)
  })

  it('names the cadence as an enum-shaped constant, not a boolean', () => {
    expect(Object.values(ApRefreshCadence)).toContain('perHand')
  })
})
```

- [x] **Step 3: Run the file**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, all tests pass.

---

## Phase 2 — Barrel export and final verification

This phase wires the new names into `src/hunt/index.ts` so a later ticket can import them the same way it imports `CheatCard` or `FlaskStock` today, then runs the full closing gate. No production behaviour changes in this phase beyond the barrel re-export — everything else is a sanity check.

### Task 5: Re-export the new type, config keys, and module functions from `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts:1` (types line), `src/hunt/index.ts:15-55` (config block), and end of file (new module export)

- [x] **Step 1: Add `ActionPoints` to the types export line**

Change:

```ts
export type { Hunt, Quarry, Damage, Health, IncomingDamage, EncounterState, Coins } from './types'
```

to:

```ts
export type { Hunt, Quarry, Damage, Health, IncomingDamage, EncounterState, Coins, ActionPoints } from './types'
```

- [x] **Step 2: Add the four config exports to the existing `config` export block**

In the existing `export { ... } from './config'` block, add `AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`, `AP_REFRESH_CADENCE` alongside the existing entries (e.g. next to `DISCARDS_PER_FIGHT`, `MAX_CARDS_PER_DISCARD`).

- [x] **Step 3: Add a new export block for `actionPoints.ts`**

Append at the end of `src/hunt/index.ts`:

```ts
export {
  apCostGiven,
  apCostFor,
  canAffordAp,
  spendAp,
  refreshActionPointsForNewHand,
} from './actionPoints'
```

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [x] **Step 5: Scoped Vitest run over `src/hunt/`**

Run: `npx vitest run src/hunt/__tests__/actionPoints.test.ts src/hunt/__tests__/config.test.ts`
Expected: exits 0, all tests in both files pass.

## Phase 3 — Final verification

No production changes — only sanity-checks that the cumulative work is clean, per `.claude/workflow/web-project.md`'s hard constraints on runners.

### Task 6: Confirm the pure-core boundary still holds ✓

- [x] **Step 1: Grep `src/hunt/` for a React or DOM reference**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits — `actionPoints.ts` and the modified `config.ts`/`types.ts`/`index.ts` import only from `./config` and `./types`, both already inside the pure boundary.

### Task 7: Confirm no tunable was hard-coded and no stale name remains ✓

- [x] **Step 1: Grep for the AP literals outside their config keys**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\bAP_ENABLED\b|\bSTARTING_AP\b|\bAP_REFRESH_CADENCE\b|\bApRefreshCadence\b"`
Expected: hits only in `src/hunt/config.ts` (the definitions), `src/hunt/actionPoints.ts` (imports), `src/hunt/index.ts` (the barrel re-export), and the two test files — no bare literal `6` masquerading as the AP pool size, no bare `'perHand'` string outside `config.ts`'s own `ApRefreshCadence` object and its own value assignment.

### Task 8: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.
Actual: typecheck PASS, lint PASS, `npm test` reported 1 failed | 1010 passed (1011) — the one failure (`src/hunt/__tests__/envenom.test.ts`) is pre-existing and unrelated to this ticket's files, confirmed by re-running against the clean (pre-dispatch) tree via `git stash`. See Implementer Report / pr-description.md for detail.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 9: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: adds a standalone, unit-tested Action Points resource module (`src/hunt/actionPoints.ts`) plus its config keys (`AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`/`AP_REFRESH_CADENCE`) and `ActionPoints` type — no consumer wired, no UI, per DLR-104 AC4.
- Developer decisions: `STARTING_AP = 6` (unplayed placeholder), `AP_ENABLED` default `true`, and whether the pure-function shape (no `RunState` field yet) is right for T5/T6 to build against — all three listed in `plan.md` Part 2 → Risks and judgement calls.
- Verification results from Task 8.
- One-line note: future AP-spending code should call `apCostFor` / `canAffordAp` / `spendAp` rather than reading `AP_ENABLED` directly, per AC2.

---

## Self-review

**Spec coverage:**
- Plan.md In scope bullet 1 (`ActionPoints` type) — Task 1.
- Plan.md In scope bullet 2 (config keys) — Task 2, Task 4 (tests).
- Plan.md In scope bullet 3 (`actionPoints.ts` module) — Task 3.
- Plan.md In scope bullet 4 (unit tests, no consumer) — Task 3 Steps 1-4, Task 4.
- Plan.md In scope bullet 5 (barrel re-exports) — Task 5.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `ActionPoints`, `AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence`, `AP_REFRESH_CADENCE`, `apCostGiven`, `apCostFor`, `canAffordAp`, `spendAp`, and `refreshActionPointsForNewHand` are named identically across Tasks 1-5 and match `plan.md` Part 2 → Data shapes exactly.

**Phase boundary cleanliness:** Phase 1 ends with `src/hunt/types.ts`, `config.ts`, and the new `actionPoints.ts` all type-checking and unit-tested, with no dangling export (the barrel hasn't been touched yet, so nothing outside `src/hunt/`'s own test files references the new names before Phase 2). Phase 2 ends with the barrel updated and re-verified by a scoped Vitest run plus a full typecheck — internally consistent, no half-applied export. Phase 3 makes no production change.
