# Tasks: App shell — mode-select scaffold & game-mount contract

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-05
Completed: 2026-08-05

**Goal:** Add a new `src/app/` module giving War Council UI (SCRUM-28) and Vanguard UI (SCRUM-29) a typed mount-prop contract — initial state in, a completion callback out, plus a validated trick-count request path for Vanguard's standalone Muster feed — and two stub components proving that contract compiles and is genuinely callable before either real UI exists.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/appMode.ts` — `AppMode` const/type (Campaign | Test)
- `src/app/__tests__/appMode.test.ts` — membership/no-duplicate test, matching `battlePhase.test.ts`'s pattern
- `src/app/tricksWon.ts` — `TRICKS_PER_ROUND`, `TricksWon`, `isValidTricksWon`
- `src/app/__tests__/tricksWon.test.ts` — validator invariant tests
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps`, `WarCouncilRoundResult`
- `src/app/vanguardMount.ts` — `RequestTricksWon`, `VanguardMountProps`, `VanguardMatchResult`
- `src/app/index.ts` — barrel export
- `src/app/stubs/WarCouncilStub.tsx` — stub proving `WarCouncilMountProps` is usable
- `src/app/stubs/VanguardStub.tsx` — stub proving `VanguardMountProps` is usable

**Modified:**
- `src/App.tsx` — add `useState<AppMode>` mode slot, display it

**Deleted:** (none)

**Developer decides or observes:**
- Whether `requestTricksWon` should be async (`Promise`-returning) rather than sync — this plan assumes async because manual entry needs to wait on a human; confirm before SCRUM-28/29 build against it.
- Whether `isValidTricksWon` should reject an invalid split outright (this plan's choice) or the real SCRUM-29 form should make an invalid split nearly unrepresentable in the first place (e.g. deriving one side's count from the other) with the validator only as a backstop.
- The `onComplete` payload shape (`finalState` + derived `score`/`winner`) is invented by this plan, not stated in the brief — sanity-check it before SCRUM-28/29 treat it as fixed.
- `TRICKS_PER_ROUND` duplicates the existing hard-coded `13` in `src/warCouncil/deal.ts` and `playCard.ts` rather than consolidating them — flagged as follow-up debt, not fixed in this ticket.
- No `jsdom`/React Testing Library is added — stub "compiles" is proven by `npm run typecheck` + `npm run build` only, not a rendered/interaction test. Confirm this is acceptable before SCRUM-28/29 need real component tests.

---

## Phase 1 — Pure contract types and the trick-count validator

Everything in this phase is plain TypeScript with no React import — `AppMode`, the trick-count validator (the one piece of genuine logic this ticket adds, with a real invariant worth testing), and the two per-game mount-prop contracts. The phase ends with a barrel export. Nothing here can fail to type-check against a component, since no component exists yet — this phase is a safe stopping point because it is self-contained pure logic with its own passing tests.

### Task 1: Add `AppMode` to `src/app/appMode.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/appMode.ts`
- Test: `src/app/__tests__/appMode.test.ts`

- [x] **Step 1: Write `src/app/appMode.ts`**

```ts
export const AppMode = {
  Campaign: 'campaign',
  Test: 'test',
} as const
export type AppMode = (typeof AppMode)[keyof typeof AppMode]
```

- [x] **Step 2: Write `src/app/__tests__/appMode.test.ts`, following `src/battle/__tests__/battlePhase.test.ts`'s pattern**

```ts
import { describe, expect, it } from 'vitest'
import { AppMode } from '../appMode'

describe('AppMode', () => {
  it('names exactly Campaign and Test', () => {
    expect(Object.values(AppMode)).toEqual(['campaign', 'test'])
  })

  it('has no duplicate mode values', () => {
    const values = Object.values(AppMode)
    expect(new Set(values).size).toBe(values.length)
  })
})
```

- [x] **Step 3: Run the new test and typecheck**

Run: `npx vitest run src/app/__tests__/appMode.test.ts; npm run typecheck`
Expected: both tests pass, `npm run typecheck` exits 0.

### Task 2: Add the trick-count validator to `src/app/tricksWon.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/tricksWon.ts`
- Test: `src/app/__tests__/tricksWon.test.ts`

- [x] **Step 1: Write the failing test first**

```ts
// src/app/__tests__/tricksWon.test.ts
import { describe, expect, it } from 'vitest'
import { TRICKS_PER_ROUND, isValidTricksWon } from '../tricksWon'

describe('TRICKS_PER_ROUND', () => {
  it('is 13, matching the fixed round length in src/warCouncil', () => {
    expect(TRICKS_PER_ROUND).toBe(13)
  })
})

describe('isValidTricksWon', () => {
  it('accepts a split that sums to TRICKS_PER_ROUND', () => {
    expect(isValidTricksWon({ player: 3, cpu: 10 })).toBe(true)
    expect(isValidTricksWon({ player: 0, cpu: 13 })).toBe(true)
    expect(isValidTricksWon({ player: 13, cpu: 0 })).toBe(true)
  })

  it('rejects a split that does not sum to TRICKS_PER_ROUND', () => {
    expect(isValidTricksWon({ player: 10, cpu: 10 })).toBe(false)
    expect(isValidTricksWon({ player: 5, cpu: 5 })).toBe(false)
  })

  it('rejects a negative trick count', () => {
    expect(isValidTricksWon({ player: -1, cpu: 14 })).toBe(false)
  })

  it('rejects a non-integer trick count', () => {
    expect(isValidTricksWon({ player: 6.5, cpu: 6.5 })).toBe(false)
  })
})
```

- [x] **Step 2: Run the test and confirm it fails because `src/app/tricksWon.ts` does not exist yet**

Run: `npx vitest run src/app/__tests__/tricksWon.test.ts`
Expected: fails with a module-not-found / import error — the test exists before the implementation.

- [x] **Step 3: Write `src/app/tricksWon.ts`**

```ts
import type { PlayerSide } from '../warCouncil'

// Mirrors the fixed round length already asserted in src/warCouncil/playCard.ts:93
// (tricksPlayed === 13) and src/warCouncil/deal.ts:7-8 (13-card hands). Declared
// separately here rather than imported — see plan.md Part 1 -> Assumptions made
// and Risks for why, and the follow-up to consolidate this into one export.
export const TRICKS_PER_ROUND = 13

export type TricksWon = Readonly<Record<PlayerSide, number>>

export function isValidTricksWon(tricks: TricksWon): boolean {
  return (
    Number.isInteger(tricks.player) &&
    Number.isInteger(tricks.cpu) &&
    tricks.player >= 0 &&
    tricks.cpu >= 0 &&
    tricks.player + tricks.cpu === TRICKS_PER_ROUND
  )
}
```

- [x] **Step 4: Run the test again and typecheck**

Run: `npx vitest run src/app/__tests__/tricksWon.test.ts; npm run typecheck`
Expected: all tests pass, `npm run typecheck` exits 0.

### Task 3: Add `WarCouncilMountProps`/`WarCouncilRoundResult` to `src/app/warCouncilMount.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncilMount.ts`

- [x] **Step 1: Write `src/app/warCouncilMount.ts`**

```ts
import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  readonly score: Readonly<Record<PlayerSide, number>>
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. (Pure type declarations — no runtime invariant to test.)

### Task 4: Add `VanguardMountProps`/`VanguardMatchResult` to `src/app/vanguardMount.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/vanguardMount.ts`

- [x] **Step 1: Write `src/app/vanguardMount.ts`**

```ts
import type { PlayerSide, VanguardState } from '../vanguard'
import type { TricksWon } from './tricksWon'

// Return type feeds scoreRound (src/warCouncil/scoring.ts), then
// convertScoreToMuster (src/vanguard/musterConversion.ts) — the same pipeline
// a real completed match's tricksWon goes through. No parallel scoring rule
// for the manual-entry path.
export type RequestTricksWon = (round: number) => Promise<TricksWon>

export interface VanguardMountProps {
  readonly initialState: VanguardState
  readonly requestTricksWon: RequestTricksWon
  readonly onComplete: (result: VanguardMatchResult) => void
}

export interface VanguardMatchResult {
  readonly finalState: VanguardState
  readonly winner: PlayerSide
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. (Pure type declarations — no runtime invariant to test.)

### Task 5: Add the barrel `src/app/index.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/index.ts`

- [x] **Step 1: Write `src/app/index.ts`**

```ts
export { AppMode } from './appMode'
export type { WarCouncilMountProps, WarCouncilRoundResult } from './warCouncilMount'
export { TRICKS_PER_ROUND, isValidTricksWon } from './tricksWon'
export type { TricksWon } from './tricksWon'
export type { VanguardMountProps, VanguardMatchResult, RequestTricksWon } from './vanguardMount'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

---

## Phase 2 — Stub components and the App-level mode slot

This phase adds the only `.tsx` this ticket introduces: two stub components that accept and genuinely exercise each mount-prop contract (AC5), plus the `AppMode` state slot in `App.tsx` (AC1). The phase ends with the whole `src/app/` tree — types, validator, and stubs — type-checking and linting clean together; nothing here is wired into `main.tsx`.

### Task 6: Add the `AppMode` state slot to `src/App.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Add the `useState<AppMode>` slot and display it**

> **Implementer deviation:** the plan's `import { AppMode } from './app'` fails to typecheck on this Windows checkout — `TS2614`/`TS1149` — because the case-insensitive filesystem resolves the bare specifier `./app` against the sibling file `App.tsx` (same name, differing only by case) before it tries the `app/` directory's `index.ts`. Shipped as `import { AppMode } from './app/index'` instead, which disambiguates to the directory and barrel unambiguously. No export, type, or file was renamed — only the import specifier in this one file. Flagging as a plan defect worth a `/fb-issue`: any future `src/App.tsx` import of a same-named lowercase sibling folder will hit this on Windows.

```tsx
import { useState } from 'react'
import { AppMode } from './app'

function App() {
  const [mode] = useState<AppMode>(AppMode.Campaign)

  return (
    <main>
      <h1>Prototype</h1>
      <p>Empty slate. Nothing is built here yet.</p>
      <p>Mode: {mode}</p>
    </main>
  )
}

export default App
```

The setter is deliberately not destructured — `const [mode] = useState(...)`, not `const [mode, setMode] = ...` — because nothing calls it until the Campaign/Test menu ticket exists. A destructured-but-unused `setMode` fails this project's `noUnusedLocals` (`tsc`) and `@typescript-eslint/no-unused-vars` (`eslint`, no underscore-ignore pattern configured) alike; omitting the element from the destructuring pattern is the correct fix, not a suppression. When the menu ticket needs the setter, it re-destructures both elements at that call site.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. (Deferred to the Phase 2 verification block below; confirmed there.)

### Task 7: Add `WarCouncilStub` to `src/app/stubs/WarCouncilStub.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/stubs/WarCouncilStub.tsx`

- [x] **Step 1: Write `src/app/stubs/WarCouncilStub.tsx`**

```tsx
import { scoreRound } from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'

function WarCouncilStub({ initialState, onComplete }: WarCouncilMountProps) {
  const handleSimulateCompletion = () => {
    onComplete({
      finalState: initialState,
      score: scoreRound(initialState.tricksWon),
    })
  }

  return (
    <section>
      <h2>War Council (stub)</h2>
      <p>Dealer: {initialState.dealer}</p>
      <button type="button" onClick={handleSimulateCompletion}>
        Simulate completion
      </button>
    </section>
  )
}

export default WarCouncilStub
```

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. (Deferred to the Phase 2 verification block below; confirmed there.)

### Task 8: Add `VanguardStub` to `src/app/stubs/VanguardStub.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/stubs/VanguardStub.tsx`

- [x] **Step 1: Write `src/app/stubs/VanguardStub.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { scoreRound } from '../../warCouncil'
import { convertScoreToMuster } from '../../vanguard'
import type { Muster } from '../../vanguard'
import { isValidTricksWon } from '../tricksWon'
import type { VanguardMountProps } from '../vanguardMount'

type RequestStatus =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly muster: Muster }

function VanguardStub({ initialState, requestTricksWon, onComplete }: VanguardMountProps) {
  const [round, setRound] = useState(1)
  const [status, setStatus] = useState<RequestStatus>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setStatus({ kind: 'loading' })

    requestTricksWon(round).then((tricks) => {
      if (cancelled) return
      if (!isValidTricksWon(tricks)) {
        setStatus({ kind: 'error', message: 'Invalid trick split for this round.' })
        return
      }
      setStatus({ kind: 'success', muster: convertScoreToMuster(scoreRound(tricks)) })
    })

    return () => {
      cancelled = true
    }
  }, [round, requestTricksWon])

  const handleSimulateBreach = () => {
    onComplete({ finalState: initialState, winner: 'player' })
  }

  return (
    <section>
      <h2>Vanguard (stub)</h2>
      <p>Round: {round}</p>
      {status.kind === 'loading' && <p>Requesting this round's trick split...</p>}
      {status.kind === 'error' && <p role="alert">{status.message}</p>}
      {status.kind === 'success' && (
        <p>
          Muster — player: {status.muster.player}, cpu: {status.muster.cpu}
        </p>
      )}
      <button type="button" onClick={() => setRound((current) => current + 1)}>
        Next round
      </button>
      <button type="button" onClick={handleSimulateBreach}>
        Simulate breach
      </button>
    </section>
  )
}

export default VanguardStub
```

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. If `'player'` as a literal winner value fails to satisfy `PlayerSide`, import and use `PlayerSide.Player` from `../../warCouncil` instead of the string literal.

> **Implementer deviation:** the `'player'` string literal typechecks fine as `PlayerSide` (it's a subtype of the `'player' | 'cpu'` union), so no change was needed there. But the plan's exact code as written — `setStatus({ kind: 'loading' })` called synchronously at the top of the effect body, before the async `requestTricksWon(round).then(...)` call — fails `npm run lint` with `react-hooks/set-state-in-effect` ("Calling setState() directly within an effect... Avoid calling setState() directly within an effect"). This is a real react-hooks rule, not `exhaustive-deps`, and per this contract's constraints it may not be suppressed to land the change. Fixed by deriving the `loading` status at render time instead of resetting it via effect: the effect now stores a `RequestOutcome` tagged with the round it resolved for, and `status` is computed each render as `outcome && outcome.round === round ? outcome : { kind: 'loading' }` — no synchronous `setState` call in the effect body, `setOutcome` is only ever called inside the async `.then()` callback (an external-system callback, which the rule allows). The rendered `RequestStatus` union (`loading` / `error` / `success`) and all prop/type contracts are unchanged. Both `npm run typecheck` and `npm run lint` pass clean on the result. Flagging as a plan defect worth a `/fb-issue`: the exact effect shape given in this step trips a live lint rule in this repo's config and cannot ship as written.

- [x] **Step 3 (added by Implementer): Confirm the rewritten effect still typechecks and lints clean**

Run: `npm run typecheck; npm run lint`
Result: both exited 0 with no output after the `RequestOutcome`-derived-status rewrite.

---

## Phase 3 — Final verification

No production changes — only sanity-checks that the cumulative work is clean and that the pure-core boundary and prior design decisions still hold.

### Task 9: Confirm the pure-core boundary still holds for `src/warCouncil/` and `src/vanguard/` ✓

- [x] **Step 1: Grep both trees for a React import, confirming this ticket did not accidentally add one**

Verified by QA: zero hits. `git status --porcelain` separately confirms neither tree appears in the diff. Note the literal command below does not parse under PowerShell 5.1 — backslash is not its escape character, so `\"react\"` is invalid; QA re-ran it with correct quoting for the same result. Plan defect, not a codebase one.

Run: `Select-String -Path src\warCouncil\*.ts,src\warCouncil\__tests__\*.ts,src\vanguard\*.ts,src\vanguard\__tests__\*.ts -Pattern "from 'react'|from \"react\""`
Expected: zero hits. This ticket's plan states neither tree is touched — this is the check that confirms it.

### Task 10: Confirm no leftover reference to the rejected raw-score design ✓

- [x] **Step 1: Grep `src/` for the type names used in this plan's first draft, before the developer's trick-count correction**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "\bWarCouncilScore\b|\bRequestScore\b"`
Expected: zero hits — confirms no stale reference to the raw-score contract survived the revision to trick-count validation.

### Task 11: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `0 failed`, including the new `appMode.test.ts` and `tricksWon.test.ts` files alongside every pre-existing spec.
Actual: all three exit 0. `Test Files 34 passed (34)`, `Tests 268 passed (268)`, 0 failed. No `eslint-disable` anywhere in the diff.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. This is also the check that both `.tsx` stubs compile against their contracts end to end — AC5's actual proof point.
Actual: exit 0, 19 modules transformed, `dist/index.html` + `dist/assets/*.css` + `dist/assets/*.js` written, no bundler errors.

### Task 12: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: new `src/app/` module — `AppMode`, per-game mount-prop contracts, a validated trick-count request path for Vanguard, two stub components proving both contracts compile and are callable.
- Every item from the File map's "Developer decides or observes" list above.
- Verification results from Phase 3 (typecheck / lint / test / build, all green).
- One-line note for SCRUM-28/29: build against `WarCouncilMountProps`/`VanguardMountProps` from `src/app`, and note the `TRICKS_PER_ROUND` duplication debt for whoever eventually consolidates it with `src/warCouncil/`.

---

## Self-review

**Spec coverage:**
- AC1 (App-level mode state/types) — Task 1, Task 6.
- AC2 (typed mount-prop contract, both games) — Task 3, Task 4.
- AC3 (manual score/trick-entry path feeding SCRUM-22's conversion) — Task 2, Task 4.
- AC4 (reachable at session start and every subsequent round) — Task 4 (`RequestTricksWon` signature), demonstrated in Task 8 (`round` state + repeat `requestTricksWon` calls).
- AC5 (stubs compile against the contract) — Task 7, Task 8, verified in Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows exact code or a runnable command with `Run:`/`Expected:`.

**Type / name consistency:** `AppMode`, `TRICKS_PER_ROUND`, `TricksWon`, `isValidTricksWon`, `WarCouncilMountProps`, `WarCouncilRoundResult`, `RequestTricksWon`, `VanguardMountProps`, `VanguardMatchResult` are each declared exactly once (Tasks 1–4) and referenced identically in every later task (barrel in Task 5, stubs in Tasks 7–8, App.tsx in Task 6). No task introduces a synonym or a renamed variant of any of these.

**Phase boundary cleanliness:** Phase 1 ends with five new pure `.ts` files and two passing test files, `npm run typecheck` clean — no component imports them yet, so nothing is half-wired. Phase 2 ends with `src/App.tsx` and two new stub components type-checking and linting against Phase 1's contract, still unmounted from `main.tsx` — no dead imports, no partial rename. Phase 3 makes no production change.
