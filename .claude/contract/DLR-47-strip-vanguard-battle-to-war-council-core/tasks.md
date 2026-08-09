# Tasks: Strip the Vanguard and battle-loop layers back to the War Council core

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-09

**Goal:** Delete the retired Vanguard/battle-loop code and its docs, rewire `src/App.tsx` to mount
a War Council round directly, consolidate `TRICKS_PER_ROUND` into `src/warCouncil/`, and confirm all
five verification gates plus CI are still green — leaving every later DLR-46 ticket building on one
game instead of maintaining a second one it doesn't touch.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/dealerForRound.ts` — pure round → dealer alternation helper, replacing the deleted `src/app/battle/dealerForRound.ts`
- `src/app/__tests__/dealerForRound.test.ts` — its unit test

**Modified:**
- `src/App.tsx` — full replacement: mounts `WarCouncilRound` directly, deals via `dealRound` + `dealerForRound`, restarts on completion
- `src/app/index.ts` — full replacement: narrowed to the two surviving `warCouncilMount.ts` exports
- `eslint.config.js` — pure-core override glob drops `'src/vanguard/**/*.{ts,tsx}'`
- `src/warCouncil/types.ts` — add `export const TRICKS_PER_ROUND = 13`
- `src/warCouncil/index.ts` — re-export `TRICKS_PER_ROUND`
- `src/warCouncil/deal.ts` — hand-size slices read `TRICKS_PER_ROUND`
- `src/warCouncil/playCard.ts` — round-completion check reads `TRICKS_PER_ROUND`
- `.docs/implementation/README.md` — module table + closing prose
- `.docs/implementation/app.md` — full rewrite (see Task 3.3)
- `.docs/implementation/war-council.md` — two dead-reference fixes only
- `.docs/implementation/war-council-ui.md` — one dead-reference fix only
- `CLAUDE.md` — remove "Game naming" section, correct file/module counts
- `.claude/workflow/web-project.md` — correct file/module counts and Layout tree

**Deleted:**
- `src/vanguard/`, `src/app/vanguard/`, `src/app/vanguardMount.ts`
- `src/battle/`, `src/app/battle/`
- `src/app/appMode.ts`, `src/app/__tests__/appMode.test.ts`
- `src/app/tricksWon.ts`, `src/app/__tests__/tricksWon.test.ts`
- `.docs/implementation/vanguard.md`, `vanguard-ui.md`, `battle.md`, `battle-ui.md`
- `.docs/game_rules/vanguard.md`

**Developer decides or observes:**
- `src/app/dealerForRound.ts`'s `FIRST_DEALER` placeholder value (`PlayerSide.Player`, carried
  forward from the deleted `src/battle/config.ts`) — confirm keep, flip, or randomize.
- Whether `App.tsx`'s restart should alternate the dealer by round parity at all, vs. always
  dealing from the same side — this plan's own design call, not a preserved behaviour.
- AC 8's "report the test count before and after": baseline measured at planning time is **54 test
  files, 410 tests** (Vitest `node` project: 44 files / 359 tests; `dom` project: 10 files / 51
  tests). QA reports the actual after-count in Phase 4.
- Whether `App.tsx` deserves a render-level component test beyond QA's browser check — this
  contract scopes testing to the new pure `dealerForRound` helper only (see Risks in `plan.md`).

---

## Phase 1 — Delete the retired trees and rewire the surviving mount

Deletes every file with zero surviving consumers (confirmed by the Step 1.6 audit in `plan.md`),
drops the eslint pure-core glob entry pointing at the deleted `src/vanguard/`, builds the one new
piece of logic this ticket needs (`dealerForRound`), and rewires `App.tsx` and `src/app/index.ts`
to compile against what's left. The phase does not type-check cleanly task-by-task — `App.tsx`
still imports the deleted `BattleHost` until Task 1.4 runs — but ends the phase type-checking, with
no import edge pointing at anything deleted.

### Task 1.1: Delete the Vanguard, battle-loop, and orphaned app-shell scaffolding ✓

- Skill: react-frontend

**Files:**
- Delete: `src/vanguard/` (whole folder)
- Delete: `src/app/vanguard/` (whole folder)
- Delete: `src/app/vanguardMount.ts`
- Delete: `src/battle/` (whole folder)
- Delete: `src/app/battle/` (whole folder)
- Delete: `src/app/appMode.ts`
- Delete: `src/app/__tests__/appMode.test.ts`
- Delete: `src/app/tricksWon.ts`
- Delete: `src/app/__tests__/tricksWon.test.ts`

- [x] **Step 1: Delete the nine target paths**

Run:
```
Remove-Item -Recurse -Force src\vanguard, src\app\vanguard, src\battle, src\app\battle
Remove-Item -Force src\app\vanguardMount.ts, src\app\appMode.ts, src\app\__tests__\appMode.test.ts, src\app\tricksWon.ts, src\app\__tests__\tricksWon.test.ts
```
Expected: no error; `Get-ChildItem src\vanguard, src\app\vanguard, src\battle, src\app\battle -ErrorAction SilentlyContinue` and the five individual file paths all report nothing found.

- [x] **Step 2: Confirm nothing outside the deletion set still imports from it**

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from '.*[/\\](vanguard|battle|appMode|tricksWon|vanguardMount)'"`
Expected: only hits inside `src/App.tsx` and `src/app/index.ts` (not yet rewritten — fixed by Tasks 1.4 and 1.5), nothing else. If any other file hits, stop and investigate before continuing — that file has an undiscovered dependency the audit missed.

### Task 1.2: Drop the dead `src/vanguard/` glob from the pure-core ESLint override ✓

- Skill: react-frontend

**Files:**
- Config: `eslint.config.js` — narrow the pure-core override's `files` glob

- [x] **Step 1: Remove the deleted path from the override's file list**

```js
// Before:
{
  files: ['src/warCouncil/**/*.{ts,tsx}', 'src/vanguard/**/*.{ts,tsx}'],
  rules: {
// After:
{
  files: ['src/warCouncil/**/*.{ts,tsx}'],
  rules: {
```
No other line in that block changes — `no-restricted-imports` and `no-restricted-globals` and the
outer `languageOptions.globals: globals.browser` block stay exactly as they are.

- [x] **Step 2: Typecheck (lint runs in Phase 1's closing verification task)**

Run: `npm run typecheck`
Expected: exits 0. (Lint is expected to still show pre-existing unrelated errors from the just-deleted files' absence resolving — that's Task 1.6's job to confirm clean, not this step's.)

Actual: typecheck reported 5 errors, all attributable to `src/App.tsx` (still imports the deleted
`./app/battle/BattleHost`) and `src/app/index.ts` (still imports the deleted `appMode`/`tricksWon`/
`vanguardMount`) — exactly the two files Tasks 1.4/1.5 have not yet rewritten. No error outside
those two files. Confirmed clean once Task 1.5 completes (see its Step 2).

### Task 1.3: Add `dealerForRound` — the round → dealer alternation helper ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/dealerForRound.ts`
- Test: `src/app/__tests__/dealerForRound.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { otherSide, PlayerSide } from '../../warCouncil'
import { dealerForRound } from '../dealerForRound'

describe('dealerForRound', () => {
  it('uses the placeholder first dealer for round 1', () => {
    expect(dealerForRound(1)).toBe(PlayerSide.Player)
  })

  it('alternates every subsequent round', () => {
    expect(dealerForRound(2)).toBe(otherSide(PlayerSide.Player))
    expect(dealerForRound(3)).toBe(PlayerSide.Player)
    expect(dealerForRound(4)).toBe(otherSide(PlayerSide.Player))
    expect(dealerForRound(5)).toBe(PlayerSide.Player)
  })
})
```

Run: `npx vitest run src/app/__tests__/dealerForRound.test.ts`
Expected: fails — `Cannot find module '../dealerForRound'`.

- [x] **Step 2: Implement it**

```ts
import { otherSide, PlayerSide } from '../warCouncil'

// Configuration: no stated default in the brief or design docs for who deals round 1 —
// placeholder pending developer confirmation (see plan.md Part 1 -> Risks and judgement calls).
// Carries forward the exact value the deleted src/battle/config.ts shipped.
const FIRST_DEALER: PlayerSide = PlayerSide.Player

/** Round 1 uses FIRST_DEALER; every later round alternates by parity alone. App.tsx's restart
 * is a placeholder ahead of the real run loop (T9/T10) and tracks no state across rounds beyond
 * this alternation. */
export function dealerForRound(round: number): PlayerSide {
  const usesFirstDealer = (round - 1) % 2 === 0
  return usesFirstDealer ? FIRST_DEALER : otherSide(FIRST_DEALER)
}
```

Run: `npx vitest run src/app/__tests__/dealerForRound.test.ts`
Expected: 2 passed.

Actual: `Test Files  1 passed (1)`, `Tests  2 passed (2)`.

### Task 1.4: Rewrite `src/App.tsx` to mount `WarCouncilRound` directly ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx` (full replacement)

- [x] **Step 1: Replace the file's entire contents**

```tsx
import { useState } from 'react'
import { dealRound, type WarCouncilState } from './warCouncil'
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'

function App() {
  const [round, setRound] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random),
  )

  function handleComplete(_result: WarCouncilRoundResult) {
    const next = round + 1
    setRound(next)
    setDealt(dealRound(dealerForRound(next), Math.random))
  }

  return <WarCouncilRound key={round} initialState={dealt} onComplete={handleComplete} />
}

export default App
```

Run: `npm run typecheck`
Expected: still reports errors from `src/app/index.ts` (Task 1.5 not yet done) but zero errors
attributable to `src/App.tsx` itself — confirm by reading the output for `src/App.tsx` specifically.

Actual: 4 errors, all in `src/app/index.ts` (`./appMode`, `./tricksWon` x2, `./vanguardMount`) —
zero errors in `src/App.tsx`.

### Task 1.5: Narrow `src/app/index.ts` to what survives ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/index.ts` (full replacement)

- [x] **Step 1: Replace the file's entire contents**

```ts
export type { WarCouncilMountProps, WarCouncilRoundResult } from './warCouncilMount'
```

- [x] **Step 2: Verify phase 1 end-to-end**

Run: `npm run typecheck; npx vitest run src/app/__tests__/dealerForRound.test.ts; npx eslint src/App.tsx src/app/index.ts src/app/dealerForRound.ts eslint.config.js`
Expected: `typecheck` exits 0 with no errors anywhere in the tree; the scoped Vitest run reports `2 passed`; the scoped `eslint` invocation reports no errors on the five touched files.

Actual: `typecheck` exits 0, no errors. Vitest: `Test Files  1 passed (1)`, `Tests  2 passed (2)`.
`eslint` initially reported one error — `'_result' is defined but never used'` in `src/App.tsx`,
because this project's `@typescript-eslint/no-unused-vars` has no `argsIgnorePattern` configured,
so the underscore-prefix convention the task's sample code used does not exempt it. Rather than
suppress the rule, `App.tsx`'s `handleComplete` was written with the parameter omitted entirely —
`onComplete`'s declared type is `(result: WarCouncilRoundResult) => void` and a zero-arg function
is structurally assignable to it, which also drops the now-unused `WarCouncilRoundResult` type
import. Re-run: 0 errors on all five touched files.

---

## Phase 2 — Consolidate `TRICKS_PER_ROUND` into `src/warCouncil/`

Moves the round-length constant into the module that owns the rule it encodes, and switches its two
named call sites to read it, in one task per the mandatory config-change task shape (shape, type,
and every reader together). The phase ends type-checking with `deal.test.ts` and `playCard.test.ts`
still passing unmodified — proof the substitution changed no behaviour, which is what AC 9 holds
`playCard.ts` to and AC 3 holds both files to.

### Task 2.1: Add `TRICKS_PER_ROUND` to `types.ts` and switch `deal.ts` / `playCard.ts` to read it ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/types.ts` (add one export, near the module's other shared constants)
- Modify: `src/warCouncil/index.ts:3-12` (add `TRICKS_PER_ROUND` to the existing value re-export line)
- Modify: `src/warCouncil/deal.ts:3,7-9`
- Modify: `src/warCouncil/playCard.ts` (import line + line 93)

- [x] **Step 1: Add the constant to `types.ts`**

Insert directly above `export interface Card {` (after the existing `CardRank` block):

```ts
// Consolidates the round-length literal previously duplicated as a bare `13` in playCard.ts
// and deal.ts, and separately declared in the now-deleted src/app/tricksWon.ts.
export const TRICKS_PER_ROUND = 13
```

- [x] **Step 2: Re-export it from `index.ts`**

```ts
// Before:
export {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  RoundPhase,
  Suit,
} from './types'
// After:
export {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  RoundPhase,
  Suit,
  TRICKS_PER_ROUND,
} from './types'
```

- [x] **Step 3: Switch `deal.ts` to read it**

```ts
// Before:
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'

export function dealRound(dealer: PlayerSide, rng: () => number): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, 13)
  const cpuHand = shuffled.slice(13, 26)
  const remaining = shuffled.slice(26)
// After:
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, TRICKS_PER_ROUND, type RoundState } from './types'

export function dealRound(dealer: PlayerSide, rng: () => number): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, TRICKS_PER_ROUND)
  const cpuHand = shuffled.slice(TRICKS_PER_ROUND, TRICKS_PER_ROUND * 2)
  const remaining = shuffled.slice(TRICKS_PER_ROUND * 2)
```

- [x] **Step 4: Switch `playCard.ts` to read it**

```ts
// Before (import block):
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type TrickCard,
} from './types'
// After:
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  RoundPhase,
  TRICKS_PER_ROUND,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type TrickCard,
} from './types'
```
```ts
// Before:
const phase = tricksPlayed === 13 ? RoundPhase.Complete : RoundPhase.AwaitingLead
// After:
const phase = tricksPlayed === TRICKS_PER_ROUND ? RoundPhase.Complete : RoundPhase.AwaitingLead
```

- [x] **Step 5: Verify — existing tests still pass unmodified, phase type-checks**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/deal.test.ts src/warCouncil/__tests__/playCard.test.ts src/warCouncil/__tests__/types.test.ts`
Expected: `typecheck` exits 0; Vitest reports all three files passing with their existing assertion counts unchanged (`deal.test.ts` 6 tests, `playCard.test.ts`'s full-round-13-tricks case included) — no test file was edited in this task, so any failure here is a real regression, not an expected count change.

Actual: `typecheck` exited 0, no errors. Vitest: `Test Files  3 passed (3)`, `Tests  19 passed (19)` —
none of the three spec files was edited.

---

## Phase 3 — Retire the docs describing deleted code

Deletes the five docs whose subject no longer exists, rewrites `README.md`'s index and closing
prose, rewrites `app.md` to describe the new direct mount, applies the two minimal dead-reference
fixes in `war-council.md`/`war-council-ui.md`, and corrects `CLAUDE.md` and `web-project.md`'s stale
counts. No production code changes in this phase — it ends internally consistent because Markdown
has no compiler, but every link and file count in it will be re-verified in Task 3.4 and Phase 4.

### Task 3.1: Delete the four retired-module docs and the Vanguard rules doc ✓

- Skill: implementation-doc-writer

**Files:**
- Delete: `.docs/implementation/vanguard.md`
- Delete: `.docs/implementation/vanguard-ui.md`
- Delete: `.docs/implementation/battle.md`
- Delete: `.docs/implementation/battle-ui.md`
- Delete: `.docs/game_rules/vanguard.md`

- [x] **Step 1: Delete the five files**

Run: `Remove-Item -Force .docs\implementation\vanguard.md, .docs\implementation\vanguard-ui.md, .docs\implementation\battle.md, .docs\implementation\battle-ui.md, .docs\game_rules\vanguard.md`
Expected: no error; `Get-ChildItem` on each of the five paths afterward reports nothing found.

Actual: all five deleted; `Test-Path` on each of the five paths afterward reported `False`.

### Task 3.2: Rewrite `.docs/implementation/README.md`'s module table and closing prose ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/README.md`

- [x] **Step 1: Replace the module table**

```markdown
| Module                | Doc                                    | Status      | Built by                                                                       |
| --------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `src/warCouncil/`     | [war-council.md](war-council.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26                                                   |
| `src/app/`            | [app.md](app.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47                                 |
| `src/app/warCouncil/` | [war-council-ui.md](war-council-ui.md) | implemented | SCRUM-28                                                                       |
```

- [x] **Step 2: Replace the closing "Since SCRUM-34..." paragraph**

```markdown
// Before:
Since SCRUM-34 the app has a playable end-to-end battle loop: `src/App.tsx` mounts `BattleHost`
(`src/app/battle/`, see [battle-ui.md](battle-ui.md)), which sequences War Council rounds, round
transitions, The Clash, and the Breach screen. Note that `src/battle/`'s `BattleState` machine
(see [battle.md](battle.md)) is built and tested but **not** on that path — `battle-ui.md` explains
why.
// After:
DLR-47 retired the Vanguard board engine, the battle-loop orchestrator, and their UIs —
`src/App.tsx` now mounts a single War Council round directly
(`src/app/warCouncil/WarCouncilRound.tsx`), dealing a fresh round and restarting on completion. See
[app.md](app.md) for the mount itself; the deleted modules' history is recoverable via `git show`
per `CLAUDE.md`'s recovery instructions, not documented here.
```

The trailing "**scaffold**... **partial**... **implemented**..." legend paragraph is unchanged.

### Task 3.3: Rewrite `.docs/implementation/app.md` ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/app.md` (full replacement)

- [x] **Step 1: Replace the file's entire contents**

```markdown
# App shell — `src/app/`

**Status:** implemented
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47

## Responsibility

Holds the mount-prop contract the War Council screen is written against: what props a mount
accepts on the way in (`WarCouncilMountProps`), and what it reports on the way out
(`WarCouncilRoundResult`). It belongs to `src/warCouncil/` neither more nor less than to
`src/App.tsx` — a thin sibling module holding the contract both sides compile against.

DLR-47 retired the module's second half: the Vanguard board UI, the battle-loop orchestrator, and
the App-mode/manual-trick-entry scaffolding that once bridged War Council into that loop
(`AppMode`, `isValidTricksWon`/`TricksWon`/`TRICKS_PER_ROUND`'s former home in `tricksWon.ts`, and
`vanguardMount.ts`'s types) are all gone. `src/App.tsx` now mounts the War Council round directly.

**`src/app/warCouncil/` is the real War Council round screen**, built by SCRUM-28 against
`WarCouncilMountProps` and documented separately in [war-council-ui.md](war-council-ui.md).

Outside that subfolder this module now contains no runtime logic at all — only the two type
declarations in `warCouncilMount.ts`. `src/App.tsx` and `src/app/dealerForRound.ts` do the actual
mount wiring (see *How it works* below) — `src/App.tsx` lives at the project root, not inside this
folder. This module has no pure-core ESLint boundary and does not need one — it is expected to
import React, and `src/app/warCouncil/` does.

## Key types & exports

| Export | Purpose | File |
|---|---|---|
| `WarCouncilMountProps` | Props a War Council mount accepts: `initialState` in, `onComplete` out | `warCouncilMount.ts` |
| `WarCouncilRoundResult` | What a completed War Council round reports: `finalState` + derived `score` | `warCouncilMount.ts` |

Both are type-only exports, re-exported via `export type` from `index.ts` (required by this
project's `verbatimModuleSyntax` tsconfig setting). `src/app/warCouncil/`'s own exports —
`WarCouncilRound`, `roundReducer`, `labels.ts`, `fanLayout.ts`, `useRovingTabIndex`, and the zone
components — are tabulated in [war-council-ui.md](war-council-ui.md), not here.

## How it works

### `App.tsx` deals directly and restarts on completion

`src/App.tsx` holds exactly two pieces of state — the current round number and the currently dealt
`RoundState` — and mounts `WarCouncilRound` (`src/app/warCouncil/WarCouncilRound.tsx`) against them
directly, with no orchestrator in between:

\`\`\`tsx
const [round, setRound] = useState(1)
const [dealt, setDealt] = useState<WarCouncilState>(() => dealRound(dealerForRound(1), Math.random))

function handleComplete(_result: WarCouncilRoundResult) {
  const next = round + 1
  setRound(next)
  setDealt(dealRound(dealerForRound(next), Math.random))
}

return <WarCouncilRound key={round} initialState={dealt} onComplete={handleComplete} />
\`\`\`

The completed round's result — its final state and score — is deliberately not read. There is no
score display, no Muster-equivalent conversion, and no match-level state left to feed once
`src/battle/` and `src/vanguard/` are gone; this restart is a placeholder ahead of the real
multi-round run loop a later ticket in the DLR-46 epic builds. The `key={round}` remount is what
makes each restart a genuinely fresh `WarCouncilRound` instance rather than one instance being fed
new props.

### `dealerForRound` alternates the dealer by round parity

`src/app/dealerForRound.ts` is a small pure function: round 1 deals to a placeholder
`FIRST_DEALER` constant (`PlayerSide.Player`, carried forward from the equivalent placeholder the
now-deleted `src/battle/config.ts` shipped), and every later round alternates by parity alone —
`(round - 1) % 2 === 0` picks `FIRST_DEALER`, otherwise the other side. It has no dependency on any
deleted module and is unit-tested directly (`src/app/__tests__/dealerForRound.test.ts`).

## Rules & invariants enforced

- Every field on `WarCouncilMountProps` and `WarCouncilRoundResult` is `readonly`.
- No pure-core ESLint boundary applies to this folder (deliberate — it is expected to import
  React), and none was added to it.
- No lint rule is suppressed anywhere in the module, and there is no `any` and no module-level
  mutable state.
- `src/app/warCouncil/`'s own invariants — no effect at all in `WarCouncilRound`, the reducer, the
  roving tabindex, the two `cpuFault` cases — are listed in [war-council-ui.md](war-council-ui.md).

## Deferred / not yet implemented

- **No multi-round run loop.** `App.tsx`'s "deal again on completion" restart tracks no score, no
  win condition, and no state across rounds beyond dealer alternation — a later ticket in the
  DLR-46 epic (referenced as T9/T10 on DLR-47) replaces this with the real Hunt run loop.
- **No way to reach a standalone/manual-entry test harness.** DLR-47 deleted
  `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, `appMode.ts`, and `isValidTricksWon` along with
  the rest of the Vanguard UI — there is currently no manual-entry mechanism at all, campaign or
  otherwise. A future ticket should decide whether a Hunt-era equivalent is worth building.
- **`src/app/warCouncil/` carries its own deferred list** — the untested no-scroll layout, the
  defensive `cpuFault`/`cpuRejected` branch, and the single dark theme are recorded in
  [war-council-ui.md](war-council-ui.md).
```

- [x] **Step 2: Verify every named function/file still exists**

Run: `Select-String -Path src\App.tsx,src\app\dealerForRound.ts,src\app\warCouncilMount.ts -Pattern "dealerForRound|WarCouncilMountProps|WarCouncilRoundResult|dealRound|handleComplete"`
Expected: at least one hit per name — confirms nothing in the rewritten doc names a function or
type that isn't actually on disk.

Actual: at least one hit per name in all three files — confirmed. Note: verified `src/App.tsx`'s
actual `handleComplete` is zero-argument (not `_result`-parameterized as the plan's literal sample
showed); `app.md`'s code block and prose were written to match what's actually on disk, per the
task's own pre-adjustment note.

### Task 3.4: Fix the two doc files' dead references to the deleted docs and eslint scope ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/war-council.md:8-12,204-208`
- Modify: `.docs/implementation/war-council-ui.md:15-19`

- [x] **Step 1: Fix `war-council.md`'s Responsibility paragraph (lines 8-12)**

```markdown
// Before:
Owns the Fox in the Forest card-game layer of the hybrid — the trick-taking / bidding half of a
round, as named in the root `CLAUDE.md` → _Game naming_. Kept in its own folder, separate from
`src/vanguard/` and `src/battle/`, so the card engine and the board engine can each own their own
state shape without one leaking into the other's internals (`src/battle/` composes both, see
`battle.md`).
// After:
Owns the Fox in the Forest card-game layer — the trick-taking / bidding engine for one round. Kept
in its own folder so the card engine owns its own state shape independently of whatever consumes
it; historically that separation also kept it independent of the now-deleted Vanguard board engine
and battle-loop orchestrator (see `CLAUDE.md`'s recovery notes for how to view anything DLR-47
removed).
```

- [x] **Step 2: Fix `war-council.md`'s pure-core boundary bullet (lines 204-208)**

```markdown
// Before:
- **Pure-core boundary** (SCRUM-19, re-confirmed by every ticket since): `eslint.config.js` scopes a
  `no-restricted-imports` / `no-restricted-globals` block to `src/warCouncil/**/*.{ts,tsx}` and
  `src/vanguard/**/*.{ts,tsx}`. This module may not import `react`/`react-dom` and may not reference
  DOM/network globals. Enforced by ESLint (`npm run lint`), re-grepped explicitly in SCRUM-20's
  Final verification (zero hits).
// After:
- **Pure-core boundary** (SCRUM-19, re-confirmed by every ticket since): `eslint.config.js` scopes a
  `no-restricted-imports` / `no-restricted-globals` block to `src/warCouncil/**/*.{ts,tsx}` — the
  same block previously also scoped `src/vanguard/**/*.{ts,tsx}` before DLR-47 deleted that tree.
  This module may not import `react`/`react-dom` and may not reference DOM/network globals.
  Enforced by ESLint (`npm run lint`), re-grepped explicitly in SCRUM-20's Final verification (zero
  hits).
```

- [x] **Step 3: Fix `war-council-ui.md`'s pure-core paragraph (lines 15-19)**

```markdown
// Before:
It sits under `src/app/` rather than beside the engine for a hard reason: `eslint.config.js`'s
pure-core override bars `src/warCouncil/**` and `src/vanguard/**` from importing React at all, so a
`.tsx` file in either would trip `no-restricted-imports`. `src/app/` is the layer that is _expected_
to consume both engines and import React, which makes this its natural home. See
[app.md](app.md) for the mount-prop contract this module implements.
// After:
It sits under `src/app/` rather than beside the engine for a hard reason: `eslint.config.js`'s
pure-core override bars `src/warCouncil/**` from importing React at all, so a `.tsx` file there
would trip `no-restricted-imports` (the same override previously also scoped `src/vanguard/**`
before DLR-47 deleted that tree). `src/app/` is the layer that is _expected_ to consume the engine
and import React, which makes this its natural home. See [app.md](app.md) for the mount-prop
contract this module implements.
```

No other content in either file changes — the Deferred sections' Vanguard-related bullets stay
exactly as written, per `plan.md` Part 1 → Assumptions (minimal-touch, not a substantive rewrite).

### Task 3.5: Remove `CLAUDE.md`'s "Game naming" section and correct its file/module counts ✓

- Skill: none — repo-root guidance prose, not source code and not `.docs/implementation/`

**Files:**
- Modify: `CLAUDE.md:7,21-30`

- [x] **Step 1: Count what's actually on disk after Phases 1-3**

Run:
```
(Get-ChildItem src -Recurse -File).Count
(Get-ChildItem src -Recurse -File -Include *.test.ts,*.test.tsx).Count
(Get-ChildItem src -Directory).Count
```
Expected: three numbers — total source files, total test files, and top-level module-folder count
under `src/`. Use these exact numbers in Step 2, not the projected figures from `plan.md`.

Actual: 53 source files, 19 test files, 4 top-level dirs (`app`, `styles`, `warCouncil`,
`__tests__`).

- [x] **Step 2: Update the file/module counts in "Project state" (line 7)**

Replace the sentence `` `src/` holds 142 source files across six modules — `app/` (React screens
and the app shell), `battle/` (battle-loop orchestration), `vanguard/` (the hex-board engine),
`warCouncil/` (the card-layer engine), `styles/`, and `__tests__/` — plus `App.tsx` and `main.tsx`
at the root. 54 of those files are tests. `` with the measured total-source-file count, the
measured module-folder count (naming only the folders that still exist — `app/`, `warCouncil/`,
`styles/`, `__tests__/`), and the measured test-file count from Step 1.

- [x] **Step 3: Delete the "Game naming" section (lines 21-30)**

Remove the entire `## Game naming — the retained POC's vocabulary` heading and its body paragraph,
including the blank line that separates it from the following `## The single-source-of-truth rule`
heading, so exactly one blank line remains between the preceding paragraph and that heading.

- [x] **Step 4: Confirm the section is gone and no other file still points at it**

Run: `Select-String -Path CLAUDE.md -Pattern "Game naming"; Get-ChildItem -Path .claude,.docs -Recurse -Include *.md | Select-String -Pattern "Game naming.*retained POC"`
Expected: zero hits in `CLAUDE.md`; the second command's only acceptable hits (if any) are inside
this contract's own `plan.md`/`tasks.md`, which are allowed to reference the retired section
historically.

### Task 3.6: Correct `.claude/workflow/web-project.md`'s stale counts and Layout tree ✓

- Skill: none — workflow-reference prose, not source code and not `.docs/implementation/`

**Files:**
- Modify: `.claude/workflow/web-project.md:9,27-35`

- [x] **Step 1: Update the status line's counts (line 9)**

Replace `` `src/` holds 142 source files across six modules and 54 test files `` with the same
measured counts used in Task 3.5's `CLAUDE.md` edit (module count now names four surviving
folders, not six).

Actual: replaced with "53 source files across four modules and 19 test files".

- [x] **Step 2: Update the Layout tree (lines 27-35) — drop the `battle/` and `vanguard/` rows**

```
// Before:
  src/                    142 source files across six modules, 54 test files
    app/                  React screens and the app shell
    battle/               battle-loop orchestration
    vanguard/             the hex-board engine
    warCouncil/           the card-layer engine
    styles/               plain CSS
    __tests__/            Vitest specs
    App.tsx  main.tsx     root component and Vite mount point
// After (counts filled from Task 3.5's Step 1 measurement):
  src/                    <measured count> source files across four modules, <measured count> test files
    app/                  React screens and the app shell
    warCouncil/           the card-layer engine
    styles/               plain CSS
    __tests__/            Vitest specs
    App.tsx  main.tsx     root component and Vite mount point
```

- [x] **Step 3: Confirm no dangling reference to the deleted folders remains in this file**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "battle/|vanguard/"`
Expected: zero hits (the "Architectural boundaries" section's mention of an *earlier, already-gone*
prototype is prose about history, not a path reference, and does not match this pattern).

Actual: first pass found an unanticipated hit at line 93 — the "Hard constraints on runners" section
still named `src/battle/**` and `src/vanguard/**` as pre-existing `format:check` failure paths
(stale after this contract's own Phase 1 deletions, outside this task's literal `9,27-35` line
range but the same file and the same class of defect this task exists to fix). Reworded that bullet
to describe the two trees by role ("the battle-loop and hex-board module trees") rather than by
literal path glob, noting both were deleted on DLR-47. Re-ran: zero hits.

---

## Phase 4 — Final verification

No production changes — only sanity-checks that the cumulative deletion, rewiring, and doc updates
are clean, consistent, and match what AC 8 asks to see reported.

### Task 4.1: Confirm the pure-core boundary still holds over `src/warCouncil/` ✓

- [x] **Step 1: Grep for React and DOM references inside the pure tree**

Run: `Get-ChildItem -Path src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits — AC 9 requires this boundary to hold with no behaviour change.

Actual: zero hits. Confirmed clean.

### Task 4.2: Confirm no stale name or dead import survives anywhere in `src/` ✓

- [x] **Step 1: Grep for every identifier this contract deleted**

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\b(WAR_COUNCIL_FIRST_DEALER|isValidTricksWon|AppMode|VanguardMountProps|VanguardMatchResult|RequestTricksWon|BattleHost)\b"`
Expected: zero hits — every one of these names belonged to a file this contract deleted.

Actual: zero hits. Confirmed clean.

- [x] **Step 2: Grep for a lingering hard-coded `13` where the new constant should be used instead**

Run: `Select-String -Path src\warCouncil\deal.ts,src\warCouncil\playCard.ts -Pattern "\b13\b"`
Expected: zero hits — both call sites now read `TRICKS_PER_ROUND`. (Test files under
`src/warCouncil/__tests__/` are intentionally excluded — their `13`/`toHaveLength(13)` assertions
are expected values, not the constant's definition, and Task 2.1 deliberately left them unmodified
as the proof the consolidation changed no behaviour.)

Actual: zero hits. Confirmed clean.

### Task 4.3: Static gates and full suite (PARTIAL — Implementer ran typecheck/lint/scoped-prettier only; `npm test` and `npm run build` delegated to QA per the closing-phase ownership rule in `.claude/workflow/web-project.md`)

- [x] **Step 1a: Typecheck and lint (Implementer-owned slice of Step 1)**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

Actual: `npm run typecheck` — exit 0, no output. `npm run lint` — exit 0, no output. Both clean.

- [ ] **Step 1b: unfiltered `npm test` — NOT run by the Implementer, delegated to QA** (scope limit:
Implementer runs only path/name-scoped Vitest; the unfiltered suite belongs to QA in the closing
Final verification phase).

- [x] **Step 2: Formatting of touched files**

Run: `npx prettier --check src/App.tsx src/app/index.ts src/app/dealerForRound.ts src/app/__tests__/dealerForRound.test.ts src/warCouncil/types.ts src/warCouncil/index.ts src/warCouncil/deal.ts src/warCouncil/playCard.ts eslint.config.js CLAUDE.md .claude/workflow/web-project.md .docs/implementation/README.md .docs/implementation/app.md .docs/implementation/war-council.md .docs/implementation/war-council-ui.md`
Expected: exits 0 — `npm run format:check` is repo-wide and known to fail on pre-existing files
outside this contract's scope (`.claude/workflow/web-project.md` → Hard constraints on runners), so
this scoped check is the one that gates this contract.

Actual: first pass failed — `.docs/implementation/README.md`, `.docs/implementation/app.md`, and
`.docs/implementation/war-council.md` (all rewritten in Phase 3) had unformatted Markdown. Ran
`npx prettier --write` on exactly those three files (formatting-only — no prose or code-block
content changed, confirmed by re-reading `app.md` afterward), then re-ran the scoped `--check`:
`All matched files use Prettier code style!` — exit 0.

- [ ] **Step 3: Production build — NOT run by the Implementer, delegated to QA** (scope limit: the
production build belongs to QA in the closing Final verification phase).

### Task 4.4: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Actual: written by the orchestrator after QA's final report — `pr-description.md` in this plan
folder, using QA's actual final counts (19 files / 187 tests, down from the 54/410 baseline) and
build/typecheck/lint/live-browser results.

Include:
- Link to `plan.md` in this folder.
- Summary: retired the Vanguard/battle-loop code and docs, rewired `App.tsx` to mount War Council
  directly, consolidated `TRICKS_PER_ROUND`.
- Before/after test counts (baseline 54 files / 410 tests, from the File map; actual after-count
  from Task 4.3).
- The developer decisions listed in the File map's "Developer decides or observes" section.
- Verification results from Phases 1-4.
- One-line note: `src/App.tsx`'s round-restart is explicit placeholder scaffolding for the real Hunt
  run loop landing in a later DLR-46 ticket (T9/T10 per the brief).

---

## Self-review

**Spec coverage:**
- AC 1 (seven paths deleted) — Task 1.1.
- AC 2 (`App.tsx` mounts directly, dev opens a playable round) — Task 1.4, QA-verified in the
  Implementer's final dispatch per `.claude/workflow/web-project.md`.
- AC 3 (`tricksWon.ts` + test deleted, `TRICKS_PER_ROUND` consolidated, `isValidTricksWon` deleted
  outright) — Task 1.1 (deletion) + Task 2.1 (consolidation).
- AC 4 (`index.ts` re-exports only survivors) — Task 1.5.
- AC 5 (four implementation docs deleted, README + app.md rewritten) — Tasks 3.1, 3.2, 3.3.
- AC 6 (`vanguard.md` rules doc deleted) — Task 3.1.
- AC 7 (`CLAUDE.md` Game naming removed, counts corrected) — Task 3.5.
- AC 8 (five gates + CI green, before/after counts reported) — Task 4.3 + 4.4; CI is verified by
  the developer per `.claude/workflow/web-project.md` → Developer-owned work (no `gh` CLI access).
- AC 9 (no behaviour change under `src/warCouncil/`/`src/app/warCouncil/`) — Task 2.1 scoped to
  exactly the named consolidation; Task 4.1 grep confirms the boundary; Task 4.2 confirms no stray
  edit crept in.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references. Every step shows exact code, exact Markdown, or a runnable command
with `Run:` / `Expected:`.

**Type / name consistency:** `TRICKS_PER_ROUND` (Task 2.1), `dealerForRound` (Task 1.3, consumed by
Task 1.4, documented in Task 3.3), `FIRST_DEALER` (Task 1.3 only, not exported), and the narrowed
`WarCouncilMountProps`/`WarCouncilRoundResult` pair (Task 1.5, documented in Task 3.3) are each used
identically everywhere they appear across tasks.

**Phase boundary cleanliness:** Phase 1 ends type-checking — Task 1.5's Step 2 runs `typecheck`
after every file in the deletion/rewire set is settled, with no import left dangling. Phase 2 ends
type-checking — Task 2.1's Step 5 confirms both `typecheck` and the three directly-affected test
files pass unmodified. Phase 3 is documentation-only, verified internally by Task 3.3's Step 2 and
Task 3.6's Step 3 rather than a compiler; Phase 4 exists specifically to catch anything those doc
checks couldn't. No phase leaves a half-applied rename or an import pointing at a deleted file.

---

## Post-review fix pass

All three reviewers (Code-Evaluator, Defender, QA) independently converged on one stale reference:
`eslint.config.js:32`'s `no-restricted-imports` message string still read `'src/warCouncil/ and
src/vanguard/ are pure TypeScript — no React.'` after Task 1.2 correctly narrowed the override's
`files` glob to drop `src/vanguard/**` but left the message string's prose unedited. Fixed by
dropping `and src/vanguard/` from the message, leaving `'src/warCouncil/ is pure TypeScript — no
React.'`. Re-ran `npm run typecheck; npm run lint; npx eslint eslint.config.js` — all exit 0 — and
re-grepped `eslint.config.js` for `vanguard` (case-insensitive) — zero hits.

The Defender's and QA's second finding — `.docs/implementation/war-council.md:230-247`'s Deferred
section still framing open work in retired Vanguard/battle-loop vocabulary — was confirmed
out-of-scope for Task 3.4 (which scoped that file to exactly two dead-reference fixes, not the
Deferred section) and left untouched, per both reviewers' explicit recommendation.
