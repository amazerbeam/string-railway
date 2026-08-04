# Tasks: The Breach — win-condition detection

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-04

**Goal:** Add one pure function, `hasReachedBreach(board, side)`, to `src/vanguard/` that returns whether `side` has built an unbroken, gap-free chain of its own tokens from its own base to the opponent's base, by reusing the module's existing `connectedNetwork` reachability query.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/vanguard/breach.ts` — the pure `hasReachedBreach(board, side): boolean` query
- `src/vanguard/__tests__/breach.test.ts` — unit tests for all four AC5 scenarios

**Modified:**
- `src/vanguard/index.ts` — re-export `hasReachedBreach` alongside the module's other public exports

**Deleted:** (none)

**Developer decides or observes:** (none — pure function, no tuning value, no UI surface, no running-app judgement needed)

---

## Phase 1 — Breach detection

This phase adds the whole feature in one module: the query function, its export, and its tests. The phase ends with `src/vanguard/`'s public surface (`index.ts`) exposing `hasReachedBreach`, the project type-checking cleanly, and a scoped Vitest run green — a safe, self-contained stopping point since nothing outside `src/vanguard/` is touched.

### Task 1: Add `hasReachedBreach` to `src/vanguard/breach.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/breach.ts`
- Modify: `src/vanguard/index.ts`
- Test: `src/vanguard/__tests__/breach.test.ts`

- [x] **Step 1: Write the failing test file covering all four AC5 scenarios on a minimal hand-built fixture**

Create `src/vanguard/__tests__/breach.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { hasReachedBreach } from '../breach'
import { VanguardCellKind } from '../types'
import type { VanguardBoard } from '../types'

const BREACH_BOARD_SIZE = 3
const PLAYER_BASE = { q: 0, r: 0 }
const CPU_BASE = { q: 2, r: 0 }

function boardWithCells(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: BREACH_BOARD_SIZE,
    bases: { [PlayerSide.Player]: PLAYER_BASE, [PlayerSide.Cpu]: CPU_BASE },
    cells,
  }
}

describe('hasReachedBreach', () => {
  it('returns false when no chain exists', () => {
    const board = boardWithCells({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })

  it('returns true when a solid chain connects the two bases', () => {
    const board = boardWithCells({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(true)
  })

  it('returns false when the chain has a single gap cell (regression for the Expand gap rule)', () => {
    const board = boardWithCells({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })

  it('returns false when only the opponent holds a solid chain', () => {
    const board = boardWithCells({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(hasReachedBreach(board, PlayerSide.Cpu)).toBe(true)
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })
})
```

- [x] **Step 2: Run the scoped test and confirm it fails on the missing module**

Run: `npx vitest run src/vanguard/__tests__/breach.test.ts`
Expected: fails — `breach.ts` does not exist yet, so the import fails to resolve (a collection/transform error, not a passing-then-wrong-assertion failure).

- [x] **Step 3: Implement `hasReachedBreach` in `src/vanguard/breach.ts`**

Create `src/vanguard/breach.ts`:

```ts
import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { cellKey } from './hexGrid'
import { connectedNetwork } from './network'
import type { VanguardBoard } from './types'

export function hasReachedBreach(board: VanguardBoard, side: PlayerSide): boolean {
  const opponentBaseKey = cellKey(board.bases[otherSide(side)])
  return connectedNetwork(board, side).some((coord) => cellKey(coord) === opponentBaseKey)
}
```

- [x] **Step 4: Re-run the scoped test and confirm all four cases pass**

Run: `npx vitest run src/vanguard/__tests__/breach.test.ts`
Expected: exits 0, `Tests  4 passed`.

- [x] **Step 5: Export `hasReachedBreach` from `src/vanguard/index.ts`**

In `src/vanguard/index.ts`, add a new line immediately after the existing `export { connectedNetwork, minDistanceToNetwork } from './network'` line:

```ts
export { hasReachedBreach } from './breach'
```

- [x] **Step 6: Typecheck the whole project**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Final verification

No production changes in this phase — only sanity-checks that the cumulative work is clean.

### Task 2.1: Confirm the pure-core boundary still holds for `src/vanguard/` ✓

- Skill: react-frontend

**Files:** (none — read-only verification)

- [x] **Step 1: Grep the whole `src/vanguard/` tree for a React import or a DOM/browser global**

Run: `Select-String -Path src\vanguard\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|sessionStorage|\bfetch\("`
Expected: zero hits. **Confirmed: zero hits** (re-checked with a corrected glob covering top-level `src\vanguard\*.ts` files too, since the literal `**` pattern only matches subdirectories in this PowerShell — see Implementer Report; still zero hits either way).

### Task 2.2: Confirm `hasReachedBreach` is named consistently everywhere it is used ✓

- Skill: react-frontend

**Files:** (none — read-only verification)

- [x] **Step 1: Grep for the exported name and confirm every hit is the same identifier**

Run: `Select-String -Path src\vanguard\**\*.ts -Pattern "hasReachedBreach"`
Expected: exactly three hits — the declaration in `breach.ts`, the re-export in `index.ts`, and the import in `breach.test.ts` — all spelling the identifier identically. **Actual hit count differs from the expectation — see Implementer Report — but the substantive check (every hit spells the identifier identically, no variant casing/spelling) is confirmed.**

### Task 2.3: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — read-only verification)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. **Confirmed: all three exit 0; `Tests  126 passed (126)`.**

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. **Confirmed: exits 0, `dist/` written (`index.html`, `assets/`, `favicon.svg`), no bundler errors.**

### Task 2.4: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `pr-description.md` in this plan folder

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds `hasReachedBreach(board, side)` to `src/vanguard/`, reusing the existing `connectedNetwork` query so the Breach check is gap-free by construction rather than by a second hand-written traversal.
- Note that no tuning value, dependency, or UI judgement is involved — nothing for the developer to decide before merging, beyond the plan's flagged Risks (the invented function name, and inheriting `connectedNetwork`'s existing "lost your base ⇒ no Breach" behaviour rather than deciding a new base-loss rule).
- Verification results from Phase 2 (typecheck/lint/test/build all green, with the actual Vitest pass count).
- A one-line note that `src/vanguard/breach.ts` is the module's first read-only "query" style file (as opposed to the three `apply*` action files), for future contributors adding the next query in the same style.

---

## Self-review

**Spec coverage:**
- Plan.md In scope → "A pure function `hasReachedBreach(board, side): boolean`" — Task 1, Steps 1–4.
- Plan.md In scope → "Export from `src/vanguard/index.ts`" — Task 1, Step 5.
- Plan.md In scope → "Unit tests for all four AC5 scenarios, minimal fixture per AC3" — Task 1, Step 1 (all four `it` blocks present: no chain, solid chain, gapped chain, opponent-only chain).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references anywhere in this file. Every step shows the exact code or command.

**Type / name consistency:** `hasReachedBreach` is spelled identically in Task 1 Step 3 (`breach.ts`), Task 1 Step 5 (`index.ts` re-export), and Task 1 Step 1 (`breach.test.ts` import) — Task 2.2 makes this an explicit, automated check rather than an assumption. `VanguardBoard`, `PlayerSide`, `VanguardCellKind`, `otherSide`, `cellKey`, `connectedNetwork` are all imported from their existing locations (`./types`, `../warCouncil`, `./hexGrid`, `./network`) exactly as `plan.md` Part 2 → Data shapes declares — no new type or config key is introduced anywhere in this file.

**Phase boundary cleanliness:** Phase 1 ends with `hasReachedBreach` implemented, exported, scoped-tested green, and the whole project type-checking (Step 6) — no half-applied rename, no dead import, nothing outside `src/vanguard/` touched. Phase 2 makes no production change at all — it is verification-only, so it cannot leave the codebase inconsistent.
