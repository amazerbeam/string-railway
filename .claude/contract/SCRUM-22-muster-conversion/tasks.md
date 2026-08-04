# Tasks: Muster conversion — War Council score band to move budget

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-04

**Goal:** Add a pure `convertScoreToMuster` function to `src/vanguard/` that turns a War Council round's score into that round's Muster — a fixed baseline move budget for both sides, plus a bonus for the round's winner only, so the losing side's Muster can never fall to zero.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/vanguard/musterConversion.ts` — `convertScoreToMuster`, the pure score-to-Muster conversion
- `src/vanguard/__tests__/musterConversion.test.ts` — full scenario-table coverage, floor guarantee, tie edge case, purity check

**Modified:**
- `src/vanguard/types.ts` — adds the `Muster` type
- `src/vanguard/config.ts` — adds `MUSTER_BASELINE` and `MUSTER_BONUS`
- `src/vanguard/index.ts` — re-exports `Muster`, `MUSTER_BASELINE`, `MUSTER_BONUS`, `convertScoreToMuster`

**Deleted:** (none)

**Developer decides or observes:**
- config → `MUSTER_BASELINE` (currently `7`, taken directly from `skirmish-board-replacement.md`'s own illustrative figure) — retune after first playtest
- config → `MUSTER_BONUS` (currently `3`, an invented placeholder — no design document names any bonus figure) — this is the plan's least-grounded number; retune or replace the whole scaling approach after first playtest
- Judgement call: the bonus is flat for the winner regardless of score margin (an ambush and the tightest pitched battle produce identical Muster values) — confirm this reading, or say if the bonus should scale with how decisively the round was won
- Judgement call: a tied score band (unreachable from `scoreRound` today) grants the bonus to neither side — confirm this reading
- No behaviour in this ticket needs `npm run dev` — the module has no UI surface; everything is machine-verifiable by Vitest and `npm run typecheck`

---

## Phase 1 — Muster type and configuration

This phase adds the shared type and the two tunable constants the conversion function will read from. It ends type-checking with no new logic wired up yet — a safe, inert stopping point, exactly like SCRUM-21's first phase.

### Task 1: Add the `Muster` type to `src/vanguard/types.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/types.ts`

- [x] **Step 1: Append the `Muster` type after the existing `VanguardActionResult` type**

```ts
export type Muster = Readonly<Record<PlayerSide, number>>
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add `MUSTER_BASELINE` and `MUSTER_BONUS` to `src/vanguard/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/config.ts`
- Config: `src/vanguard/config.ts` — adds `MUSTER_BASELINE` (value `7`, taken from `skirmish-board-replacement.md`'s illustrative figure) and `MUSTER_BONUS` (value `3`, an invented placeholder — both are developer-owned tuning values, see File map)

- [x] **Step 1: Append the new configuration block after the existing `REINFORCE_MAX_STACK` line**

```ts
// --- Configuration: Muster baseline and bonus for SCRUM-22, illustrative only —
// retunable without a design change (see plan.md Part 1 -> Risks and judgement calls) ---
export const MUSTER_BASELINE = 7
export const MUSTER_BONUS = 3
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Conversion function, tests, and barrel export

This phase adds the function itself, its full test coverage, and wires both into the public `src/vanguard/` surface. It ends with the new function tested, typechecked, and reachable from `src/vanguard/index.ts` exactly like every other Vanguard export.

### Task 3: `convertScoreToMuster` and its tests ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/musterConversion.ts`
- Test: `src/vanguard/__tests__/musterConversion.test.ts`

- [x] **Step 1: Write the failing test file**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide, scoreRound } from '../../warCouncil'
import { MUSTER_BASELINE, MUSTER_BONUS } from '../config'
import { convertScoreToMuster } from '../musterConversion'

const WINNER_MUSTER = MUSTER_BASELINE + MUSTER_BONUS

describe('convertScoreToMuster', () => {
  it.each([
    [0, 13, PlayerSide.Player],
    [1, 12, PlayerSide.Player],
    [2, 11, PlayerSide.Player],
    [3, 10, PlayerSide.Player],
    [4, 9, PlayerSide.Cpu],
    [5, 8, PlayerSide.Cpu],
    [6, 7, PlayerSide.Cpu],
  ] as const)(
    'trick split %i/%i: winner gets baseline + bonus, loser gets baseline only',
    (playerTricks, cpuTricks, winner) => {
      const score = scoreRound({ player: playerTricks, cpu: cpuTricks })
      const muster = convertScoreToMuster(score)
      const loser = winner === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player

      expect(muster[winner]).toBe(WINNER_MUSTER)
      expect(muster[loser]).toBe(MUSTER_BASELINE)
    },
  )

  it('never lets the losing side fall to zero moves, even at the most extreme ambush', () => {
    const score = scoreRound({ player: 0, cpu: 13 })
    const muster = convertScoreToMuster(score)
    expect(muster.player).toBe(MUSTER_BASELINE)
    expect(muster.player).toBeGreaterThan(0)
  })

  it('grants the bonus to neither side on a tied score band', () => {
    const muster = convertScoreToMuster({ player: 3, cpu: 3 })
    expect(muster).toEqual({ player: MUSTER_BASELINE, cpu: MUSTER_BASELINE })
  })

  it('is pure: the same score band always produces the same Muster', () => {
    const score = { player: 2, cpu: 6 }
    expect(convertScoreToMuster(score)).toEqual(convertScoreToMuster(score))
  })
})
```

- [x] **Step 2: Run the test and confirm it fails (module does not exist yet)**

Run: `npx vitest run src/vanguard/__tests__/musterConversion.test.ts`
Expected: fails — `musterConversion.ts` does not exist yet, so the import cannot resolve.
Confirmed: `Cannot find module '../musterConversion'`.

- [x] **Step 3: Implement `convertScoreToMuster`**

```ts
import { PlayerSide } from '../warCouncil'
import { MUSTER_BASELINE, MUSTER_BONUS } from './config'
import type { Muster } from './types'

// Both sides always receive MUSTER_BASELINE; only the round's winner adds
// MUSTER_BONUS on top, so the losing side's Muster can never fall below the
// floor no matter how lopsided the round was (concept-critique.md Problem 1).
export function convertScoreToMuster(score: Readonly<Record<PlayerSide, number>>): Muster {
  const winner =
    score[PlayerSide.Player] > score[PlayerSide.Cpu]
      ? PlayerSide.Player
      : score[PlayerSide.Cpu] > score[PlayerSide.Player]
        ? PlayerSide.Cpu
        : undefined

  return {
    [PlayerSide.Player]: MUSTER_BASELINE + (winner === PlayerSide.Player ? MUSTER_BONUS : 0),
    [PlayerSide.Cpu]: MUSTER_BASELINE + (winner === PlayerSide.Cpu ? MUSTER_BONUS : 0),
  }
}
```

- [x] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/vanguard/__tests__/musterConversion.test.ts`
Expected: 10 passed (7 scenario-table cases + floor guarantee + tie case + purity check).
Confirmed: `Test Files 1 passed (1)`, `Tests 10 passed (10)` — after correcting the "extreme ambush" fixture (see Notes below).

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.
Confirmed: exit 0, no output.

### Task 4: Re-export the new surface from `src/vanguard/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/index.ts`

- [x] **Step 1: Add three lines to the existing barrel, after the `applyVanguardAction` export**

```ts
export type { Muster } from './types'
export { MUSTER_BASELINE, MUSTER_BONUS } from './config'
export { convertScoreToMuster } from './musterConversion'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.
Confirmed: exit 0, no output.

**Test fixture correction (Task 3, Step 1):** the "never lets the losing side fall to zero moves, even at the most extreme ambush" test as originally drafted called `scoreRound({ player: 0, cpu: 13 })`. `scoreRound`'s `tricksToPoints` curve (out of scope for this ticket) penalizes sweeping — 13 tricks scores 0 points while 0 tricks scores 6 — so that trick split actually makes `player` the *winner* by score, not the loser, and the test failed against the correct implementation. Fixed by constructing the score directly (`convertScoreToMuster({ player: 0, cpu: 999 })`), matching how the tie-case test already bypasses `scoreRound`, since the function under test takes a score band, not tricks. No production code changed for this fix.

---

## Phase 3 — Final verification

No production changes in this phase — only sanity-checks that the new module is clean and the pure-core boundary it lives inside still holds.

### Task 5: Confirm the pure-core boundary still holds for `src/vanguard/` ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep the whole `src/vanguard/` tree for a React import or a DOM global**

Run: `Get-ChildItem -Path src\vanguard -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'from ''react''|from "react"|\bwindow\.|\bdocument\.|localStorage|sessionStorage'`
Expected: zero hits.
Confirmed: zero hits.

Note: use the single-quoted PowerShell string form above, not double-quoted with `\"` escapes — SCRUM-19's Task 6 hit exactly this quoting failure (`\"` is not a recognized escape inside a double-quoted PowerShell string) and confirmed the single-quoted form works.

### Task 6: Confirm no stray reference to the new names exists outside their definition, barrel, or test ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep `src/` for the new identifiers outside the files that define, re-export, or test them**

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'vanguard\\types\.ts$|vanguard\\config\.ts$|vanguard\\musterConversion\.ts$|vanguard\\index\.ts$|musterConversion\.test\.ts$' } | Select-String -Pattern "MUSTER_BASELINE|MUSTER_BONUS|convertScoreToMuster|\bMuster\b"`
Expected: zero hits — this ticket adds no consumer of these names outside the files that define, re-export, or test them.
Confirmed: zero hits.

### Task 7: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1a: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0, no errors reported.
Confirmed: both exit 0, no output.

- [x] **Step 1b: Unfiltered suite** — `npm test`

Confirmed by QA: PASS — `Test Files 20 passed (20)`, `Tests 122 passed (122)`.

- [x] **Step 2: Production build** — `npm run build`

Confirmed by QA: PASS — exit 0, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written, no bundler errors.

### Task 8: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `pr-description.md` (in this plan folder)

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds `convertScoreToMuster` to `src/vanguard/` — a pure function converting a War Council score band into a Muster (baseline move budget for both sides, plus a bonus for the round's winner only), fixing the old Hex board's zero-Muster ambush problem by construction.
- Note that `MUSTER_BASELINE = 7` is taken from the design doc's own illustrative figure, while `MUSTER_BONUS = 3` is this plan's own invented placeholder with no design-document basis — flag for the developer's explicit attention before or during first playtest.
- Note the two judgement calls from the File map (flat bonus regardless of margin; tied score grants no bonus to either side) for developer sign-off.
- Verification results from Phase 3 (typecheck, lint, test counts, build).
- One-line note for future contributors: this ticket does not wire the Muster into `BattleState` or any orchestrator — it produces the value only; a future Clash-orchestrator ticket consumes it.

---

## Self-review

**Spec coverage:**
- AC1 (baseline for both sides + bonus for the winner only) — Task 3.
- AC2 (losing side's Muster never zero, floor not overridable by bonus logic) — Task 3 (implementation is structural — see plan.md Approach — plus the explicit floor test).
- AC3 (pure, no React/DOM) — Task 3 (purity test), Task 5 (boundary grep).
- AC4 (full scenario-table coverage, four ambush intensities + three pitched-battle margins) — Task 3's `it.each` table.
- Named, retunable baseline/bonus constants (Dependencies & Risks) — Task 2.
- Barrel export so the function is reachable from `src/vanguard/` (plan.md In scope) — Task 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `Muster`, `MUSTER_BASELINE`, `MUSTER_BONUS`, and `convertScoreToMuster` are spelled identically across Tasks 1–4, the test file, and `plan.md`'s Data shapes section. The test file's import path (`../../warCouncil` for `PlayerSide`/`scoreRound`, `../config` and `../musterConversion` for the new names) matches the actual file locations named in the File map.

**Phase boundary cleanliness:** Phase 1 ends with `Muster`, `MUSTER_BASELINE`, and `MUSTER_BONUS` all declared and type-checking, with nothing yet consuming them (no half-applied reference). Phase 2 ends with the conversion function implemented, tested, and re-exported — the whole new surface is reachable and green before Phase 3 begins. Phase 3 makes no production change; it only verifies Phase 1–2's result and writes the PR description.
