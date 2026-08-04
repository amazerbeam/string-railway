# Tasks: Battle module scaffold and shared game-state types

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-03

**Goal:** Establish `src/warCouncil/`, `src/vanguard/`, and `src/battle/` as the module layout for the SCRUM-18 epic, plus shared `BattlePhase`/`BattleState` types the later engine tickets compose against instead of each inventing their own.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/index.ts` — placeholder `WarCouncilState` type
- `src/vanguard/index.ts` — placeholder `VanguardState` type
- `src/battle/battlePhase.ts` — `BattlePhase` const map and derived type
- `src/battle/battleState.ts` — `BattleState` interface
- `src/battle/index.ts` — barrel re-exporting `BattlePhase` and `BattleState`
- `src/battle/__tests__/battlePhase.test.ts` — regression test for `BattlePhase`'s value set

**Modified:**
- `eslint.config.js` — adds the pure-core boundary override (`no-restricted-imports` / `no-restricted-globals`) scoped to `src/warCouncil/**` and `src/vanguard/**`

**Deleted:** (none)

**Developer decides or observes:** (none — no tuning value, dependency, or app-visible behaviour in this ticket)

---

## Phase 1 — Module folders and shared types

This phase creates every file in the File map. It ends with the codebase fully type-checking and lint-clean: two placeholder engine modules, the shared `BattlePhase`/`BattleState` types that reference them, the pure-core ESLint boundary, and one regression test. No production behaviour changes — nothing consumes these types yet outside the test.

### Task 1: Placeholder state type for the War Council engine ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/index.ts`

- [x] **Step 1: Create the module with a placeholder state type**

```ts
export type WarCouncilState = unknown
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Placeholder state type for the Vanguard engine ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/index.ts`

- [x] **Step 1: Create the module with a placeholder state type**

```ts
export type VanguardState = unknown
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 3: `BattlePhase` const map and its regression test ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/battlePhase.ts`
- Test: `src/battle/__tests__/battlePhase.test.ts`

- [x] **Step 1: Write the failing test for `BattlePhase`'s value set**

```ts
import { describe, expect, it } from 'vitest'
import { BattlePhase } from '../battlePhase'

describe('BattlePhase', () => {
  it('names exactly the four battle-loop stages', () => {
    expect(Object.values(BattlePhase)).toEqual([
      'warCouncilRound',
      'musterConversion',
      'clash',
      'resolved',
    ])
  })

  it('has no duplicate phase values', () => {
    const values = Object.values(BattlePhase)
    expect(new Set(values).size).toBe(values.length)
  })
})
```

- [x] **Step 2: Run the test and confirm it fails (module does not exist yet)**

Run: `npx vitest run src/battle/__tests__/battlePhase.test.ts`
Expected: fails — `battlePhase.ts` does not exist yet, so the import cannot resolve.

- [x] **Step 3: Implement `BattlePhase`**

```ts
export const BattlePhase = {
  WarCouncilRound: 'warCouncilRound',
  MusterConversion: 'musterConversion',
  Clash: 'clash',
  Resolved: 'resolved',
} as const

export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase]
```

- [x] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/battle/__tests__/battlePhase.test.ts`
Expected: 2 passed.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 4: `BattleState` interface and the `battle` barrel ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/battleState.ts`
- Create: `src/battle/index.ts`

- [x] **Step 1: Write `BattleState`, referencing the two engine placeholder types and `BattlePhase`**

```ts
import type { WarCouncilState } from '../warCouncil'
import type { VanguardState } from '../vanguard'
import { BattlePhase } from './battlePhase'

export interface BattleState {
  readonly phase: BattlePhase
  readonly warCouncil: WarCouncilState
  readonly vanguard: VanguardState
}
```

- [x] **Step 2: Write the `battle` barrel**

```ts
export { BattlePhase } from './battlePhase'
export type { BattleState } from './battleState'
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 5: Pure-core ESLint boundary for `src/warCouncil/` and `src/vanguard/` ✓

- Skill: react-frontend

**Files:**
- Modify: `eslint.config.js`

- [x] **Step 1: Add the boundary block to the `defineConfig([...])` array**

Insert as an additional array entry, after the existing `files: ['**/*.{ts,tsx}']` block and before `eslintConfigPrettier` — do not remove or alter the existing block, and in particular do not touch its `languageOptions.globals: globals.browser` line, since `no-restricted-globals` only fires on globals ESLint has been told exist in scope.

```js
{
  files: ['src/warCouncil/**/*.{ts,tsx}', 'src/vanguard/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
            message: 'src/warCouncil/ and src/vanguard/ are pure TypeScript — no React.',
          },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      { name: 'window', message: 'This module must not touch the DOM.' },
      { name: 'document', message: 'This module must not touch the DOM.' },
      { name: 'navigator', message: 'This module must not touch the DOM.' },
      { name: 'localStorage', message: 'This module must not touch browser storage.' },
      { name: 'sessionStorage', message: 'This module must not touch browser storage.' },
      { name: 'fetch', message: 'This module must not touch the network or the DOM.' },
      { name: 'location', message: 'This module must not touch the DOM.' },
      { name: 'history', message: 'This module must not touch the DOM.' },
      { name: 'XMLHttpRequest', message: 'This module must not touch the network or the DOM.' },
      { name: 'requestAnimationFrame', message: 'This module must not touch the DOM.' },
      { name: 'cancelAnimationFrame', message: 'This module must not touch the DOM.' },
      { name: 'alert', message: 'This module must not touch the DOM.' },
      { name: 'confirm', message: 'This module must not touch the DOM.' },
      { name: 'matchMedia', message: 'This module must not touch the DOM.' },
      { name: 'getComputedStyle', message: 'This module must not touch the DOM.' },
      { name: 'Image', message: 'This module must not touch the DOM.' },
      { name: 'Worker', message: 'This module must not touch the DOM.' },
    ],
  },
},
```

- [x] **Step 2: Lint**

Run: `npm run lint`
Expected: exits 0, no errors reported.

---

## Phase 2 — Final verification

No production changes in this phase — only sanity-checks that the scaffold is clean and the boundary it establishes actually holds.

### Task 6: Confirm the pure-core boundary holds for `src/warCouncil/` and `src/vanguard/` ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep both engine folders for a React import or a DOM global**

Run: `Get-ChildItem -Path src\warCouncil,src\vanguard -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

Result: the literal command as written hit a PowerShell quoting issue (`\"` is not a recognized escape inside a double-quoted PowerShell string — backslash isn't PowerShell's escape character). Re-ran with the same regex expressed via a single-quoted string literal (`'from ''react''|from "react"|\bwindow\.|\bdocument\.|localStorage|sessionStorage'`) — zero hits, confirmed.

### Task 7: Confirm no stray reference to the new types exists outside `src/battle/` ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep `src/` for the new type/const names outside their own definitions**

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'battle(Phase|State)\.ts$|battle\\index\.ts$|warCouncil\\index\.ts$|vanguard\\index\.ts$|battlePhase\.test\.ts$' } | Select-String -Pattern "BattlePhase|BattleState|WarCouncilState|VanguardState"`
Expected: zero hits — this ticket adds no consumer of these types outside the files that define, re-export, or test them.

Result: zero hits, confirmed.

### Task 8: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports all tests passed, including the two new `BattlePhase` assertions.

Result: `npm run typecheck` exit 0, no errors. `npm run lint` exit 0, no errors. `npm test` → `Test Files  2 passed (2)`, `Tests  3 passed (3)` (smoke test + the two `BattlePhase` assertions).

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result: exit 0. `dist/index.html`, `dist/assets/index-CbmgodH0.css`, `dist/assets/index-PDNcSK7V.js` written; built in 2.79s, no bundler errors.

### Task 9: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `pr-description.md` (in this plan folder)

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: establishes `src/warCouncil/`, `src/vanguard/`, `src/battle/` as the module layout for the SCRUM-18 epic, plus shared `BattlePhase`/`BattleState` types and the pure-core ESLint boundary for the two engine folders.
- Note that `BattleState` is deliberately minimal (`phase`, `warCouncil`, `vanguard` only) — later tickets (A1, A2, A6) are expected to extend it, per the ticket's own stated risk.
- Note that the pure-core ESLint boundary was established in this ticket rather than deferred to A1/A2 — flagged in `plan.md` → Risks and judgement calls as the plan's biggest judgement call, in case the developer wants it reverted.
- Verification results from Phase 2 (typecheck, lint, test counts, build).
- One-line note for future contributors: Muster conversion, The Clash, and The Breach detection all belong inside `src/vanguard/`, not a separate folder, per `CLAUDE.md`'s naming pointer.

---

## Self-review

**Spec coverage:**
- AC1 (module layout, three folders) — Tasks 1, 2, 4.
- AC2 (`BattlePhase` covering the four named states) — Task 3.
- AC3 (`BattleState` referencing, not duplicating, each engine's state) — Task 4.
- AC4 (`npm run typecheck` and `npm run lint` pass) — Steps embedded in Tasks 1–5, confirmed again in Task 8.
- AC5 (no React component, CPU logic, or rendering code) — no task in this file creates a component, CPU heuristic, or render path; Task 6 greps for it.
- Pure-core boundary (plan.md Assumptions/Approach) — Task 5, verified by Task 6.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `WarCouncilState`, `VanguardState`, `BattlePhase`, and `BattleState` are spelled identically across Tasks 1–4 and the plan's Data shapes section. The four `BattlePhase` string values (`warCouncilRound`, `musterConversion`, `clash`, `resolved`) appear identically in Task 3's test and implementation steps.

**Phase boundary cleanliness:** Phase 1 ends with every new file typechecking and lint-clean (each task's own verify step, plus Task 5's `npm run lint` covering the whole tree) — no half-applied rename, no dead import, nothing importing a module that doesn't exist yet by the time each task's steps complete. Phase 2 makes no production change; it only verifies Phase 1's result and writes the PR description.
