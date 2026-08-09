# Tasks: Wire the end-to-end battle loop into the app shell

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-07

**Goal:** Replace `App.tsx`'s temporary dev host with a real orchestrator (`BattleHost`) that mounts the already-built War Council and Vanguard screens into one continuous, playable loop — War Council round → transition summary → The Clash → Breach or another round — with both CPUs already driving themselves inside their own reducers.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/battle/dealerForRound.ts` — pure function computing the alternating dealer for a given round number.
- `src/app/battle/__tests__/dealerForRound.test.ts` — unit test for the above.
- `src/app/battle/battleHostReducer.ts` — the reducer modelling which screen `BattleHost` currently shows.
- `src/app/battle/__tests__/battleHostReducer.test.ts` — unit test for the above.
- `src/app/battle/BattleHost.tsx` — the new app-shell orchestrator.
- `src/app/battle/__tests__/BattleHost.test.tsx` — component test, `WarCouncilRound`/`VanguardMatch` mocked.

**Modified:**
- `src/app/battle/battle.css` — add the `.battle-overlay` rule.
- `src/App.tsx` — replace the dev-host content with a direct `BattleHost` mount.

**Deleted:** (none — `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, and `appMode.ts` are left on disk, unreferenced; see `plan.md` Part 1 → Assumptions made #4)

**Developer decides or observes:** (none — no unchosen tuning value in this plan; every behavioural question QA can settle by driving the app. Feel/visual judgement of the new overlay stacking is the developer's per `plan.md` → Risks, once running.)

---

## Phase 1 — Pure orchestration logic

Two small, fully pure, fully unit-tested modules with no rendering and no dependency on the components they'll later be composed with. This phase type-checks standalone and has zero runtime side effects — a safe stopping point before any component work begins.

### Task 1: Add `dealerForRound` to `src/app/battle/dealerForRound.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/dealerForRound.ts`
- Test: `src/app/battle/__tests__/dealerForRound.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { WAR_COUNCIL_FIRST_DEALER } from '../../../battle'
import { otherSide } from '../../../warCouncil'
import { dealerForRound } from '../dealerForRound'

describe('dealerForRound', () => {
  it('uses WAR_COUNCIL_FIRST_DEALER for round 1', () => {
    expect(dealerForRound(1)).toBe(WAR_COUNCIL_FIRST_DEALER)
  })

  it('alternates every subsequent round', () => {
    expect(dealerForRound(2)).toBe(otherSide(WAR_COUNCIL_FIRST_DEALER))
    expect(dealerForRound(3)).toBe(WAR_COUNCIL_FIRST_DEALER)
    expect(dealerForRound(4)).toBe(otherSide(WAR_COUNCIL_FIRST_DEALER))
    expect(dealerForRound(5)).toBe(WAR_COUNCIL_FIRST_DEALER)
  })
})
```

Run: `npx vitest run src/app/battle/__tests__/dealerForRound.test.ts`
Expected: fails — `dealerForRound` does not exist yet.

- [x] **Step 2: Implement `dealerForRound`**

```ts
import { otherSide, PlayerSide } from '../../warCouncil'
import { WAR_COUNCIL_FIRST_DEALER } from '../../battle'

/** Round 1 uses WAR_COUNCIL_FIRST_DEALER; every later round alternates by
 * parity alone — matches battle.md's rule that the dealer flips exactly
 * once per completed round, with no other trigger. */
export function dealerForRound(round: number): PlayerSide {
  const usesFirstDealer = (round - 1) % 2 === 0
  return usesFirstDealer ? WAR_COUNCIL_FIRST_DEALER : otherSide(WAR_COUNCIL_FIRST_DEALER)
}
```

- [x] **Step 3: Run the test and typecheck**

Run: `npx vitest run src/app/battle/__tests__/dealerForRound.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed; `tsc -b` exits 0.

### Task 2: Add `battleHostReducer` to `src/app/battle/battleHostReducer.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/battleHostReducer.ts`
- Test: `src/app/battle/__tests__/battleHostReducer.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import type { WarCouncilState } from '../../../warCouncil'
import type { VanguardState } from '../../../vanguard'
import {
  BattleHostActionKind,
  battleHostReducer,
  createBattleHostUiState,
} from '../battleHostReducer'

const FAKE_DEALT = { tricksWon: { player: 0, cpu: 0 } } as unknown as WarCouncilState

describe('battleHostReducer', () => {
  it('starts in the vanguard state at round 0', () => {
    expect(createBattleHostUiState()).toEqual({ kind: 'vanguard', round: 0 })
  })

  it('RoundRequested moves to warCouncilRound, carrying round/dealer/dealt', () => {
    const next = battleHostReducer(createBattleHostUiState(), {
      kind: BattleHostActionKind.RoundRequested,
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
    expect(next).toEqual({
      kind: 'warCouncilRound',
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
  })

  it('RoundComplete moves warCouncilRound to roundTransition with computed score and muster', () => {
    const inRound = battleHostReducer(createBattleHostUiState(), {
      kind: BattleHostActionKind.RoundRequested,
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
    const next = battleHostReducer(inRound, {
      kind: BattleHostActionKind.RoundComplete,
      result: {
        finalState: { tricksWon: { player: 9, cpu: 4 } } as unknown as WarCouncilState,
        score: { player: 6, cpu: 1 },
      },
    })
    expect(next).toEqual({
      kind: 'roundTransition',
      round: 1,
      dealer: PlayerSide.Player,
      tricksWon: { player: 9, cpu: 4 },
      score: { player: 6, cpu: 1 },
      muster: { player: 10, cpu: 7 },
    })
  })

  it('RoundComplete is a no-op outside warCouncilRound', () => {
    const state = createBattleHostUiState()
    const next = battleHostReducer(state, {
      kind: BattleHostActionKind.RoundComplete,
      result: { finalState: FAKE_DEALT, score: { player: 0, cpu: 0 } },
    })
    expect(next).toBe(state)
  })

  it('ContinueToClash moves roundTransition back to vanguard, keeping the round number', () => {
    const inTransition = {
      kind: 'roundTransition' as const,
      round: 2,
      dealer: PlayerSide.Cpu,
      tricksWon: { player: 3, cpu: 10 },
      score: { player: 6, cpu: 0 },
      muster: { player: 10, cpu: 7 },
    }
    const next = battleHostReducer(inTransition, { kind: BattleHostActionKind.ContinueToClash })
    expect(next).toEqual({ kind: 'vanguard', round: 2 })
  })

  it('BattleResolved moves vanguard to battleOver with the winner', () => {
    const inVanguard = { kind: 'vanguard' as const, round: 3 }
    const next = battleHostReducer(inVanguard, {
      kind: BattleHostActionKind.BattleResolved,
      result: { finalState: {} as VanguardState, winner: PlayerSide.Cpu },
    })
    expect(next).toEqual({ kind: 'battleOver', round: 3, winner: PlayerSide.Cpu })
  })

  it('BattleResolved is a no-op outside vanguard', () => {
    const state = { kind: 'battleOver' as const, round: 3, winner: PlayerSide.Player }
    const next = battleHostReducer(state, {
      kind: BattleHostActionKind.BattleResolved,
      result: { finalState: {} as VanguardState, winner: PlayerSide.Cpu },
    })
    expect(next).toBe(state)
  })
})
```

Run: `npx vitest run src/app/battle/__tests__/battleHostReducer.test.ts`
Expected: fails — `battleHostReducer.ts` does not exist yet.

- [x] **Step 2: Implement the state/action types and the reducer**

```ts
import { convertScoreToMuster, type Muster, type VanguardState } from '../../vanguard'
import type { PlayerSide, WarCouncilState } from '../../warCouncil'
import type { VanguardMatchResult } from '../vanguardMount'
import type { WarCouncilRoundResult } from '../warCouncilMount'
import type { TricksWon } from '../tricksWon'

export type BattleHostUiState =
  | { readonly kind: 'vanguard'; readonly round: number }
  | {
      readonly kind: 'warCouncilRound'
      readonly round: number
      readonly dealer: PlayerSide
      readonly dealt: WarCouncilState
    }
  | {
      readonly kind: 'roundTransition'
      readonly round: number
      readonly dealer: PlayerSide
      readonly tricksWon: TricksWon
      readonly score: Readonly<Record<PlayerSide, number>>
      readonly muster: Muster
    }
  | { readonly kind: 'battleOver'; readonly round: number; readonly winner: PlayerSide }

export const BattleHostActionKind = {
  RoundRequested: 'roundRequested',
  RoundComplete: 'roundComplete',
  ContinueToClash: 'continueToClash',
  BattleResolved: 'battleResolved',
} as const
export type BattleHostActionKind = (typeof BattleHostActionKind)[keyof typeof BattleHostActionKind]

export type BattleHostUiAction =
  | {
      readonly kind: typeof BattleHostActionKind.RoundRequested
      readonly round: number
      readonly dealer: PlayerSide
      readonly dealt: WarCouncilState
    }
  | { readonly kind: typeof BattleHostActionKind.RoundComplete; readonly result: WarCouncilRoundResult }
  | { readonly kind: typeof BattleHostActionKind.ContinueToClash }
  | { readonly kind: typeof BattleHostActionKind.BattleResolved; readonly result: VanguardMatchResult }

export function createBattleHostUiState(): BattleHostUiState {
  return { kind: 'vanguard', round: 0 }
}

export function battleHostReducer(
  state: BattleHostUiState,
  action: BattleHostUiAction,
): BattleHostUiState {
  switch (action.kind) {
    case BattleHostActionKind.RoundRequested:
      return {
        kind: 'warCouncilRound',
        round: action.round,
        dealer: action.dealer,
        dealt: action.dealt,
      }

    case BattleHostActionKind.RoundComplete: {
      if (state.kind !== 'warCouncilRound') return state
      const tricksWon = action.result.finalState.tricksWon
      const score = action.result.score
      return {
        kind: 'roundTransition',
        round: state.round,
        dealer: state.dealer,
        tricksWon,
        score,
        muster: convertScoreToMuster(score),
      }
    }

    case BattleHostActionKind.ContinueToClash: {
      if (state.kind !== 'roundTransition') return state
      return { kind: 'vanguard', round: state.round }
    }

    case BattleHostActionKind.BattleResolved: {
      if (state.kind !== 'vanguard') return state
      return { kind: 'battleOver', round: state.round, winner: action.result.winner }
    }
  }
}
```

Note: `VanguardState` is imported only for the type re-export chain to resolve cleanly — if `tsc` reports it unused once written, drop it; `Muster`, `WarCouncilState`, `PlayerSide`, `TricksWon` are the ones actually referenced in the type signatures above.

- [x] **Step 3: Run the test and typecheck**

Run: `npx vitest run src/app/battle/__tests__/battleHostReducer.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed; `tsc -b` exits 0.

---

## Phase 2 — The orchestrator component and its wiring into `App.tsx`

Builds `BattleHost` on top of Phase 1's pure pieces, adds the one CSS rule the overlay needs, and rewrites `App.tsx` to mount it. This phase ends with a fully wired, type-checked app — the loop is playable at the end of this phase, and Phase 3 is verification only.

### Task 3: Add the overlay rule to `src/app/battle/battle.css` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/battle/battle.css`

- [x] **Step 1: Append the overlay rule**

```css
.battle-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
}
```

- [x] **Step 2: Confirm the file still parses (no build step for CSS alone — verified in Task 4 once BattleHost imports it)**

Run: `Get-ChildItem src\app\battle\battle.css`
Expected: file exists, non-empty.

### Task 4: Create `src/app/battle/BattleHost.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/BattleHost.tsx`
- Config: none — no configuration file changes

- [x] **Step 1: Write the component**

```tsx
import { useCallback, useReducer, useRef, useState } from 'react'
import { createVanguardBoard, type VanguardState } from '../../vanguard'
import { dealRound } from '../../warCouncil'
import type { TricksWon } from '../tricksWon'
import type { RequestTricksWon, VanguardMatchResult } from '../vanguardMount'
import type { WarCouncilRoundResult } from '../warCouncilMount'
import VanguardMatch from '../vanguard/VanguardMatch'
import WarCouncilRound from '../warCouncil/WarCouncilRound'
import BattleOverPanel from './BattleOverPanel'
import {
  BattleHostActionKind,
  battleHostReducer,
  createBattleHostUiState,
} from './battleHostReducer'
import { dealerForRound } from './dealerForRound'
import './battle.css'
import RoundTransitionPanel from './RoundTransitionPanel'

export interface BattleHostProps {
  /** Test seam only — production always uses the default. Not a tuning value. */
  readonly rng?: () => number
}

interface PendingRoundRequest {
  readonly round: number
  readonly resolve: (tricks: TricksWon) => void
}

/**
 * The real app-shell orchestrator (SCRUM-34). Mounts VanguardMatch for the
 * life of the whole battle and overlays a freshly-dealt WarCouncilRound,
 * then RoundTransitionPanel, each time VanguardMatch's requestTricksWon
 * promise needs fulfilling. No effect of its own — see plan.md Part 2 ->
 * Runtime quality notes.
 */
export default function BattleHost({ rng = Math.random }: BattleHostProps) {
  const [initialBoard] = useState<VanguardState>(() => createVanguardBoard())
  const [ui, dispatch] = useReducer(battleHostReducer, undefined, createBattleHostUiState)
  const pendingRef = useRef<PendingRoundRequest | null>(null)

  const requestTricksWon: RequestTricksWon = useCallback(
    (round) =>
      new Promise<TricksWon>((resolve) => {
        pendingRef.current = { round, resolve }
        const dealer = dealerForRound(round)
        dispatch({
          kind: BattleHostActionKind.RoundRequested,
          round,
          dealer,
          dealt: dealRound(dealer, rng),
        })
      }),
    [rng],
  )

  function handleRoundComplete(result: WarCouncilRoundResult) {
    dispatch({ kind: BattleHostActionKind.RoundComplete, result })
  }

  function handleContinueToClash() {
    if (ui.kind !== 'roundTransition') return
    const pending = pendingRef.current
    pendingRef.current = null
    dispatch({ kind: BattleHostActionKind.ContinueToClash })
    pending?.resolve(ui.tricksWon)
  }

  function handleBattleResolved(result: VanguardMatchResult) {
    dispatch({ kind: BattleHostActionKind.BattleResolved, result })
  }

  if (ui.kind === 'battleOver') {
    return <BattleOverPanel round={ui.round} winner={ui.winner} />
  }

  return (
    <>
      <VanguardMatch
        initialState={initialBoard}
        requestTricksWon={requestTricksWon}
        onComplete={handleBattleResolved}
      />
      {ui.kind === 'warCouncilRound' && (
        <div className="battle-overlay">
          <WarCouncilRound key={ui.round} initialState={ui.dealt} onComplete={handleRoundComplete} />
        </div>
      )}
      {ui.kind === 'roundTransition' && (
        <div className="battle-overlay">
          <RoundTransitionPanel
            round={ui.round}
            dealer={ui.dealer}
            tricksWon={ui.tricksWon}
            score={ui.score}
            muster={ui.muster}
            onContinue={handleContinueToClash}
          />
        </div>
      )}
    </>
  )
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: `tsc -b` exits 0. If it reports `initialBoard` unused, that's expected to NOT happen — it's read by `VanguardMatch`'s `initialState` prop; if it does happen, re-check the JSX above for a typo before changing anything else.
(Deferred to the Phase 2 verification block; confirmed there.)

- [x] **Step 3: Measure the file**

Run: `(Get-Content src\app\battle\BattleHost.tsx | Measure-Object -Line).Lines`
Expected: comfortably under 200 lines (the component-size budget's first threshold).
Result: 93 lines.

### Task 5: Component test — `src/app/battle/__tests__/BattleHost.test.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/__tests__/BattleHost.test.tsx`

`WarCouncilRound` and `VanguardMatch` are mocked — their own engines are already tested in their own suites. `RoundTransitionPanel` and `BattleOverPanel` render for real (pure, prop-driven), so this test genuinely checks that `BattleHost` threads score/muster/tricks/winner through correctly — the only new logic this ticket adds.

- [x] **Step 1: Write the test**

Note: the sketch's `getByTestId('received-tricks')` assertion after clicking "Begin The Clash" needed a `waitFor` — `MockVanguardMatch`'s `requestTricksWon(1).then(setTricks)` resolves through a promise microtask, which hasn't flushed by the very next synchronous line. Wrapped that assertion in `waitFor` and made the test `async`; the rest of the sketch matched the real components' accessible output verbatim.

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { convertScoreToMuster, type VanguardState } from '../../../vanguard'
import { PlayerSide, scoreRound, type WarCouncilState } from '../../../warCouncil'
import type { TricksWon } from '../../tricksWon'
import type { VanguardMountProps } from '../../vanguardMount'
import type { WarCouncilMountProps } from '../../warCouncilMount'

afterEach(cleanup)

const SCRIPTED_TRICKS: TricksWon = { player: 9, cpu: 4 }

vi.mock('../../vanguard/VanguardMatch', () => ({
  default: function MockVanguardMatch({ requestTricksWon, onComplete }: VanguardMountProps) {
    const [tricks, setTricks] = useState<TricksWon | null>(null)
    useEffect(() => {
      requestTricksWon(1).then(setTricks)
    }, [requestTricksWon])
    return (
      <div data-testid="vanguard-match-stub">
        <span data-testid="received-tricks">
          {tricks ? `${tricks.player}-${tricks.cpu}` : 'pending'}
        </span>
        <button onClick={() => onComplete({ finalState: {} as VanguardState, winner: PlayerSide.Player })}>
          force-breach
        </button>
      </div>
    )
  },
}))

vi.mock('../../warCouncil/WarCouncilRound', () => ({
  default: function MockWarCouncilRound({ onComplete }: WarCouncilMountProps) {
    return (
      <button
        onClick={() =>
          onComplete({
            finalState: { tricksWon: SCRIPTED_TRICKS } as unknown as WarCouncilState,
            score: scoreRound(SCRIPTED_TRICKS),
          })
        }
      >
        complete-round
      </button>
    )
  },
}))

const { default: BattleHost } = await import('../BattleHost')

describe('BattleHost', () => {
  it('drives a full round through to Breach, threading score, muster, and tricks at each handoff', () => {
    render(<BattleHost />)

    // VanguardMatch's mocked effect has already requested round 1's tricks —
    // BattleHost deals it and overlays the War Council round.
    fireEvent.click(screen.getByRole('button', { name: 'complete-round' }))

    const expectedScore = scoreRound(SCRIPTED_TRICKS)
    const expectedMuster = convertScoreToMuster(expectedScore)
    const panel = screen.getByRole('region', { name: 'The War Council has spoken' })
    expect(within(panel).getByText(String(SCRIPTED_TRICKS.player))).toBeDefined()
    expect(within(panel).getByText(String(SCRIPTED_TRICKS.cpu))).toBeDefined()
    expect(within(panel).getByText(String(expectedScore.player))).toBeDefined()
    expect(within(panel).getByText(String(expectedMuster[PlayerSide.Player]))).toBeDefined()
    expect(within(panel).getByText(String(expectedMuster[PlayerSide.Cpu]))).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Begin The Clash' }))

    // The overlay is gone and VanguardMatch's pending promise resolved with
    // exactly the tricks the round produced.
    expect(screen.queryByRole('region', { name: 'The War Council has spoken' })).toBeNull()
    expect(screen.getByTestId('received-tricks').textContent).toBe(
      `${SCRIPTED_TRICKS.player}-${SCRIPTED_TRICKS.cpu}`,
    )

    // Now genuinely back in the vanguard state (matches the real
    // invariant — Breach can only resolve while no round is in flight).
    fireEvent.click(screen.getByRole('button', { name: 'force-breach' }))

    expect(screen.getByRole('heading', { name: /taken the Vanguard/i })).toBeDefined()
    expect(screen.getByText(/Breach reached in round 1/i)).toBeDefined()
  })
})
```

Run: `npx vitest run src/app/battle/__tests__/BattleHost.test.tsx`
Expected: fails — `BattleHost.tsx` isn't wired yet, or the mocks reveal a mismatch. Iterate against `BattleHost.tsx` (Task 4), not the test, unless the test itself is wrong.

- [x] **Step 2: Confirm it passes alongside the rest of the `dom` project**
(Deferred to the Phase 2 verification block; confirmed there.)

Run: `npx vitest run --project dom`
Expected: all `dom`-project tests pass, including this one.

### Task 6: Rewrite `src/App.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Replace the entire file**

```tsx
import BattleHost from './app/battle/BattleHost'

function App() {
  return <BattleHost />
}

export default App
```

- [x] **Step 2: Typecheck and run the full `dom` project**

Run: `npm run typecheck; npx vitest run --project dom`
Expected: `tsc -b` exits 0; Vitest reports all `dom`-project tests passed (including every pre-existing `.test.tsx` file — this change must not break any of them).
Result: `tsc -b` exited 0 with no output. `npx vitest run --project dom` reported `Test Files  10 passed (10)`, `Tests  51 passed (51)`.

---

## Phase 3 — Final verification

No production changes — only sanity-checks that the cumulative work is clean and the loop actually plays.

### Task M.1: Confirm the dev-host scaffolding is fully gone from `App.tsx` ✓

- [x] **Step 1: Grep for the deleted dev-host's own markers**

Run: `Select-String -Path src\App.tsx -Pattern "Switch to Test mode|AppMode|dealRound|WAR_COUNCIL_FIRST_DEALER"`
Expected: zero hits — `App.tsx` no longer references any of the dev host's own imports or controls.
Result: zero hits, confirmed.

### Task M.2: Confirm no tunable was hard-coded and `WAR_COUNCIL_FIRST_DEALER` isn't duplicated ✓

- [x] **Step 1: Grep for a second definition of the dealer constant**

Run: `Select-String -Path src\app\**\*.ts,src\app\**\*.tsx -Pattern "WAR_COUNCIL_FIRST_DEALER\s*="`
Expected: zero hits — `src/app/**` only ever *imports* `WAR_COUNCIL_FIRST_DEALER` from `src/battle`, never redefines it. (`dealerForRound.ts`'s own `import { WAR_COUNCIL_FIRST_DEALER } from '../../battle'` line is an import, not an assignment, so it correctly does not match `\s*=`.)
Result: zero hits, confirmed.

### Task M.3: Static gates and full suite ✓

- [x] **Step 1: Warm the Vitest cache, then run both projects, typecheck, and lint**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint`
Expected: all four exit 0; both Vitest runs report `0 failed`.
Result: `--project node` → `Test Files 44 passed (44)`, `Tests 357 passed (357)`. `--project dom` → `Test Files 10 passed (10)`, `Tests 51 passed (51)`. `npm run typecheck` (`tsc -b`) produced no output (exit 0). `npm run lint` (`eslint .`) produced no output (exit 0).

- [x] **Step 2: Formatting, scoped to the files this contract touched**

Run: `npx prettier --check src\App.tsx src\app\battle\BattleHost.tsx src\app\battle\dealerForRound.ts src\app\battle\battleHostReducer.ts src\app\battle\battle.css src\app\battle\__tests__\BattleHost.test.tsx src\app\battle\__tests__\dealerForRound.test.ts src\app\battle\__tests__\battleHostReducer.test.ts`
Expected: exits 0 — every file this plan created or modified is Prettier-clean. (The repo-wide `npm run format:check` is known to fail on pre-existing files outside this plan's scope — do not gate on it; report it separately if run, per `web-project.md`.)
Result: initial run flagged `src/app/battle/BattleHost.tsx` (one JSX prop block exceeded the print width). Ran `npx prettier --write src\app\battle\BattleHost.tsx` — a whitespace-only reflow of `WarCouncilRound`'s JSX props onto their own lines, no logic change — then re-ran `--check`: `All matched files use Prettier code style!`. Re-ran `npm run typecheck` and `npx vitest run src\app\battle\__tests__\BattleHost.test.tsx` after the fix to confirm nothing broke: typecheck clean, `Test Files 1 passed (1)`, `Tests 1 passed (1)`.

**Steps 3–4 below (unfiltered `npm test`, `npm run build`) are QA-exclusive — delegated to and executed by QA in the final review round.**

- [x] **Step 3: Full suite**

Run: `npm test`
Expected: exits 0, summary line reports every test file collected (no `.test.tsx` silently skipped — see `web-project.md`'s cold-cache timeout trap if this run is the first since Step 1's warm-up expired).
Result (QA): `Test Files 54 passed (54)`, `Tests 408 passed (408)` — matches 44 node + 10 dom exactly, no file skipped. Re-confirmed identically after the post-review fix pass.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Result (QA): exit 0. lint → `tsc -b` → `vite build` all clean; `dist/assets/index-*.js` 229.77 kB (gzip 71.63 kB), `dist/assets/index-*.css` 21.43 kB (gzip 5.02 kB), built in 1.76s, no warnings. Re-confirmed after the fix pass.

### Task M.4: QA — drive a full battle in the running app ✓

- [x] **Step 1: Start the dev server detached and drive it through `chrome-devtools`**

Run: `$p = Start-Process npm.cmd -ArgumentList "run","dev","--","--port","5199","--strictPort" -PassThru -WindowStyle Hidden; $p.Id`
Then, via the `chrome-devtools` MCP: navigate to `http://localhost:5199/`, confirm the app lands directly in a playable War Council round with no manual setup (AC1), play through at least one full round → transition → Clash, confirm both CPU opponents move on their own turns, confirm `list_console_messages` shows no errors at any point (AC2), and confirm every button reachable in the DOM stays consistent with `VanguardBoardView`'s `legalTargets`/`enabled` state — i.e. no illegal action is ever exposed as clickable (AC3).
Expected: a full battle is playable start to Breach with zero console errors; stop the server after with `taskkill /PID <pid> /T /F`.
Result (QA): AC1 met — navigating to `/` landed directly in a playable Round 1 War Council round, no setup screen, no mode toggle. AC2 met — played all 13 tricks of round 1 (7–6 tricks, 6–3 points) → `RoundTransitionPanel` showed tricks 7/6, score 6/3, Muster 10/7 (matching `scoreRound` + `convertScoreToMuster` exactly) → "Begin The Clash" dismissed the overlay and handed `YOU 10` muster to `VanguardMatch` → a board action committed and decremented muster 10→9; console clean throughout (only `[vite] connecting/connected` and the React DevTools notice). AC3 met — across every trick, only follow-suit-legal hand cards were enabled; all 121 hex cells reported `disableable disabled` while the War Council overlay was up; Fox and Woodcutter ability prompts resolved correctly with no illegal choice offered. Server stopped with `taskkill /PID <pid> /T /F`, port re-probed and confirmed down. Re-verified after the fix pass: overlay still fully covers the board post-`z-index` change, board still frozen beneath, console still clean on load and after reload.

### Task M.5: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; the summary above; the biggest judgement call (leaving `src/battle`'s state machine unused) flagged prominently for review; the decision to leave `TestModeVanguardHost.tsx`/`TrickEntryForm.tsx`/`appMode.ts` unreferenced rather than deleted; verification results from Task M.3 and M.4; and a one-line note that SCRUM-33 (UI polish) is the deliberately deferred next step, per the developer's sequencing decision recorded in `plan.md` Part 1.
Result: written to `pr-description.md` in this folder. Task M.3 Steps 1–2 results (Implementer-owned) are quoted with actual pass counts; Task M.3 Steps 3–4 and Task M.4 are noted as pending QA in the final review round, since they were out of scope for this dispatch.

---

## Self-review

**Spec coverage:**
- In scope → "new orchestrator component" — Tasks 4, 6.
- In scope → "`dealerForRound` helper" — Task 1.
- In scope → "`battleHostReducer`" — Task 2.
- In scope → "mount `BattleOverPanel` on Breach" — Task 4 (the `ui.kind === 'battleOver'` branch).
- In scope → "rewrite `App.tsx`, delete dev-host content" — Task 6, verified by Task M.1.
- In scope → "one new CSS rule for the overlay" — Task 3.
- In scope → "tests for the new pure and orchestration logic" — Tasks 1, 2, 5.
- AC4 (typecheck/lint/test green) — Task M.3.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows exact code or a `Run:`/`Expected:` pair.

**Type / name consistency:** `BattleHostActionKind`, `BattleHostUiState`, `BattleHostUiAction`, `createBattleHostUiState`, `battleHostReducer`, `dealerForRound`, and the `.battle-overlay` class name are spelled identically across Tasks 1, 2, 4, and 5 — checked by hand against `plan.md` Part 2 → Data shapes, which every task's code block matches verbatim.

**Phase boundary cleanliness:** Phase 1 ends with two new pure, tested, standalone modules — the codebase type-checks and nothing imports them yet, so there is nothing to break. Phase 2 ends with a fully wired, type-checked, fully-tested app — the loop is genuinely playable at this boundary, and Phase 3 touches no production code. No half-applied rename, no dead import, no task referencing a module a later task creates.
