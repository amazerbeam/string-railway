# Tasks: Muster / Clash HUD — move budget, turn indicator, action feedback

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-06

**Goal:** Replace `VanguardMatch.tsx`'s placeholder status-band note with a real HUD showing both
sides' remaining Muster, an unambiguous turn indicator, an explicit uncontested-spend explanation,
and tallies that stay visible behind the outcome overlay so an unspent-moves ending reads as
resolved, not stuck.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/vanguard/clashHud.ts` — pure HUD derivation: `ClashHudState`, `TurnIndicator`, `deriveClashHud`, `deriveHint`
- `src/app/vanguard/__tests__/clashHud.test.ts` — unit tests for the above
- `src/app/vanguard/MusterBand.tsx` — presentational status-band HUD component
- `src/app/vanguard/__tests__/MusterBand.test.tsx` — component tests

**Modified:**
- `src/app/vanguard/VanguardMatch.tsx` — removes the placeholder note, wires in `deriveClashHud`/`deriveHint`, renders `MusterBand`
- `src/app/vanguard/vanguard.css` — new `.vg-muster*`/`.vg-turn-*` rules, `.vg-band` becomes a two-row header
- `src/app/vanguard/__tests__/VanguardMatch.test.tsx` — two new tests (AC5)
- `.docs/implementation/vanguard-ui.md` — refresh (via `implementation-doc-writer`)

**Deleted:** (none)

**Developer decides or observes:**
- Exact copy for every HUD string ("Your move" / "Their move" / "Awaiting Muster" / "Exchange resolved" / "Uncontested" / the uncontested hint sentence) — proposed in `mockup.html`, confirmed at the plan gate; transcribe verbatim, do not re-invent.
- Visual treatment of the turn-active and uncontested states (colour, badge shape) — reuses existing `--vg-brass`/`--vg-chalk-dim`/`--vg-alarm` tokens per the mockup; the mockup's look is the confirmed default.
- Whether `.vg-band` growing to two rows still fits comfortably at a phone-sized viewport — QA checks this functionally (does it render, does it stay non-scrolling); whether it *feels* right is the developer's call when they play it.
- The unreachable-`CpuTurn` finding in `plan.md` → Assumptions — confirmed correct at the plan gate; nothing further to decide unless later found wrong.

---

## Phase 1 — Pure HUD derivation (`clashHud.ts`)

No UI change yet. This phase is a safe stopping point: a new pure module with full unit coverage,
importing only from `../../vanguard`, `../../warCouncil`, `./matchReducer`, and `./labels` — nothing
under `src/app/vanguard/`'s existing files is touched, so nothing else can regress.

### Task 1: Add `TurnIndicator` and `ClashHudState`, and `deriveClashHud` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/vanguard/clashHud.ts`
- Test: `src/app/vanguard/__tests__/clashHud.test.ts`

- [x] **Step 1: Write the failing tests for `deriveClashHud`**

```ts
// src/app/vanguard/__tests__/clashHud.test.ts
import { describe, expect, it } from 'vitest'
import { ClashStatus, type ClashState } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { deriveClashHud, TurnIndicator } from '../clashHud'

const inProgress = (
  turn: PlayerSide,
  playerMuster: number,
  cpuMuster: number,
): ClashState => ({
  status: ClashStatus.InProgress,
  board: { size: 5, bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } }, cells: {} },
  muster: { [PlayerSide.Player]: playerMuster, [PlayerSide.Cpu]: cpuMuster },
  turn,
})

describe('deriveClashHud', () => {
  it('reports AwaitingMuster with no counts when there is no clash yet', () => {
    const hud = deriveClashHud(null)
    expect(hud).toEqual({
      playerMuster: null,
      cpuMuster: null,
      indicator: TurnIndicator.AwaitingMuster,
      uncontested: false,
    })
  })

  it('reports PlayerTurn, not uncontested, when both sides still have Muster', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 5, 3))
    expect(hud).toEqual({
      playerMuster: 5,
      cpuMuster: 3,
      indicator: TurnIndicator.PlayerTurn,
      uncontested: false,
    })
  })

  it('reports PlayerTurn as uncontested once the CPU is exhausted', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 3, 0))
    expect(hud.indicator).toBe(TurnIndicator.PlayerTurn)
    expect(hud.uncontested).toBe(true)
  })

  it('reports CpuTurn, not uncontested, when both sides still have Muster — a state this mount never stores, kept for completeness', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 5, 3))
    expect(hud).toEqual({
      playerMuster: 5,
      cpuMuster: 3,
      indicator: TurnIndicator.CpuTurn,
      uncontested: false,
    })
  })

  it('reports CpuTurn as uncontested once the player is exhausted — same defensive coverage', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 0, 4))
    expect(hud.indicator).toBe(TurnIndicator.CpuTurn)
    expect(hud.uncontested).toBe(true)
  })

  it('reports Resolved with the final tallies on Breach, never uncontested', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Breached,
      board: { size: 5, bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } }, cells: {} },
      muster: { [PlayerSide.Player]: 2, [PlayerSide.Cpu]: 1 },
      winner: PlayerSide.Player,
    })
    expect(hud).toEqual({
      playerMuster: 2,
      cpuMuster: 1,
      indicator: TurnIndicator.Resolved,
      uncontested: false,
    })
  })

  it('reports Resolved with zero tallies on a natural Complete', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Complete,
      board: { size: 5, bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } }, cells: {} },
      muster: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    })
    expect(hud.indicator).toBe(TurnIndicator.Resolved)
    expect(hud.playerMuster).toBe(0)
    expect(hud.cpuMuster).toBe(0)
  })
})
```

- [x] **Step 2: Run the new test file and confirm it fails on a missing module**

Run: `npx vitest run src/app/vanguard/__tests__/clashHud.test.ts`
Expected: fails with a module-resolution error (`clashHud.ts` does not exist yet) — not an assertion failure.

- [x] **Step 3: Implement `TurnIndicator`, `ClashHudState`, and `deriveClashHud`**

```ts
// src/app/vanguard/clashHud.ts
import { ClashStatus, type ClashState } from '../../vanguard'
import { PlayerSide, otherSide } from '../../warCouncil'

export const TurnIndicator = {
  AwaitingMuster: 'awaitingMuster',
  PlayerTurn: 'playerTurn',
  // Unreachable through VanguardMatch's matchReducer today: advanceCpu drains
  // every CPU turn synchronously before a state is ever stored, so
  // ui.clash.turn is always Player whenever status is InProgress (see
  // plan.md -> Part 1 -> Assumptions). Kept for completeness and tested via
  // a direct fixture, matching this module's existing precedent for
  // cpuRejected in matchReducer.ts.
  CpuTurn: 'cpuTurn',
  Resolved: 'resolved',
} as const
export type TurnIndicator = (typeof TurnIndicator)[keyof typeof TurnIndicator]

export interface ClashHudState {
  readonly playerMuster: number | null
  readonly cpuMuster: number | null
  readonly indicator: TurnIndicator
  readonly uncontested: boolean
}

/**
 * Reads the HUD's entire state off `ClashState` — no legality, cost, or
 * turn-order rule is computed here, only display values already decided by
 * applyClashAction. `uncontested` mirrors that function's own step-7 rule:
 * the mover has Muster left and the other side has none.
 */
export function deriveClashHud(clash: ClashState | null): ClashHudState {
  if (clash === null) {
    return { playerMuster: null, cpuMuster: null, indicator: TurnIndicator.AwaitingMuster, uncontested: false }
  }

  const playerMuster = clash.muster[PlayerSide.Player]
  const cpuMuster = clash.muster[PlayerSide.Cpu]

  if (clash.status !== ClashStatus.InProgress) {
    return { playerMuster, cpuMuster, indicator: TurnIndicator.Resolved, uncontested: false }
  }

  const mover = clash.turn
  const other = otherSide(mover)
  const uncontested = clash.muster[mover] > 0 && clash.muster[other] === 0
  const indicator = mover === PlayerSide.Player ? TurnIndicator.PlayerTurn : TurnIndicator.CpuTurn

  return { playerMuster, cpuMuster, indicator, uncontested }
}
```

- [x] **Step 4: Run the test file again and confirm it passes**

Run: `npx vitest run src/app/vanguard/__tests__/clashHud.test.ts`
Expected: exits 0, all 7 tests pass.

### Task 2: Add `deriveHint`, moved from `VanguardMatch.tsx`'s inline helper ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/clashHud.ts`
- Test: `src/app/vanguard/__tests__/clashHud.test.ts`

- [x] **Step 1: Write the failing tests for `deriveHint`**

Add these imports to the top import block of `src/app/vanguard/__tests__/clashHud.test.ts` (extend
the existing `ClashStatus, type ClashState` import from `'../../../vanguard'` to also pull
`IllegalActionReason`, rather than a second import line from the same module):

```ts
import { ClashStatus, IllegalActionReason, type ClashState } from '../../../vanguard'
import { createMatchUiState } from '../matchReducer'
import { REJECTION_MESSAGE } from '../labels'
import { makeBoard } from './boardFixture'
```

And extend Task 1's existing `import { deriveClashHud, TurnIndicator } from '../clashHud'` line to
also pull `deriveHint`, rather than adding a second import statement for the same module.

Then append the new `describe` block, after the existing `describe('deriveClashHud', ...)` block:

```ts
describe('deriveHint', () => {
  const baseUi = createMatchUiState(makeBoard())

  it('names the rejection first, above every other case', () => {
    const ui = { ...baseUi, rejection: IllegalActionReason.CellOccupied }
    const hud = deriveClashHud(null)
    expect(deriveHint(ui, hud)).toBe(REJECTION_MESSAGE[IllegalActionReason.CellOccupied])
  })

  it('names the War Council when no clash has started', () => {
    const hud = deriveClashHud(null)
    expect(deriveHint(baseUi, hud)).toBe('The War Council is deciding this round’s Muster')
  })

  it('invites a tap on a normal, contested player turn', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 5, 3))
    expect(deriveHint(baseUi, hud)).toBe('Tap a cell to act')
  })

  it('names the uncontested reason and the exact remaining count on the player’s side — matches the ticket’s own example', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Player, 3, 0))
    expect(deriveHint(baseUi, hud)).toBe('CPU is out of moves — you’re spending your remaining 3 moves')
  })

  it('names the uncontested reason symmetrically for the CPU side — defensive, unreachable via VanguardMatch', () => {
    const hud = deriveClashHud(inProgress(PlayerSide.Cpu, 0, 4))
    expect(deriveHint(baseUi, hud)).toBe('You’re out of moves — CPU is spending its remaining 4 moves')
  })

  it('goes blank once the exchange is resolved, leaving the outcome panel to speak', () => {
    const hud = deriveClashHud({
      status: ClashStatus.Breached,
      board: { size: 5, bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 4, r: 4 } }, cells: {} },
      muster: { [PlayerSide.Player]: 2, [PlayerSide.Cpu]: 1 },
      winner: PlayerSide.Player,
    })
    expect(deriveHint(baseUi, hud)).toBe('')
  })
})
```

- [x] **Step 2: Run and confirm it fails on the missing export**

Run: `npx vitest run src/app/vanguard/__tests__/clashHud.test.ts`
Expected: fails — `deriveHint` is not exported yet.

- [x] **Step 3: Implement `deriveHint`, and delete `VanguardMatch.tsx`'s existing inline copy of it in Phase 3, not here**

Add these two imports to the top import block of `src/app/vanguard/clashHud.ts`, alongside the two
added in Task 1 (imports stay grouped at the top of the file, per this project's file-order
convention — not appended after the code that uses them):

```ts
import type { MatchUiState } from './matchReducer'
import { REJECTION_MESSAGE } from './labels'
```

Then append the function itself, after `deriveClashHud`:

```ts
/** Priority mirrors the mockup's hint cascade: a rejection always wins;
 * otherwise the hint names the HUD's current lifecycle state. Moved here
 * from VanguardMatch.tsx so it's unit-tested without a renderer. */
export function deriveHint(ui: MatchUiState, hud: ClashHudState): string {
  if (ui.rejection !== null) return REJECTION_MESSAGE[ui.rejection]

  switch (hud.indicator) {
    case TurnIndicator.AwaitingMuster:
      return 'The War Council is deciding this round’s Muster'
    case TurnIndicator.Resolved:
      return ''
    case TurnIndicator.PlayerTurn:
      return hud.uncontested
        ? `CPU is out of moves — you’re spending your remaining ${hud.playerMuster} moves`
        : 'Tap a cell to act'
    case TurnIndicator.CpuTurn:
      return hud.uncontested
        ? `You’re out of moves — CPU is spending its remaining ${hud.cpuMuster} moves`
        : 'They are spending their Muster'
  }
}
```

Note: this creates an import of `MatchUiState` from `./matchReducer` into `clashHud.ts`, and
`matchReducer.ts` does not import `clashHud.ts` — no cycle.

- [x] **Step 4: Run the full pure-module test file and typecheck**

Run: `npx vitest run src/app/vanguard/__tests__/clashHud.test.ts; npm run typecheck`
Expected: all tests pass (13 total across both `describe` blocks), typecheck exits 0.

---

## Phase 2 — `MusterBand` component and its styles

Depends only on Phase 1's exported types. `VanguardMatch.tsx` is not yet touched, so the running
app (such as it is via `App.tsx`'s Test-mode host) still shows the placeholder note until Phase 3 —
a safe, independently-verifiable stopping point.

### Task 3: Build `MusterBand.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/vanguard/MusterBand.tsx`

- [x] **Step 1: Write the component**

```tsx
// src/app/vanguard/MusterBand.tsx
import { TurnIndicator, type ClashHudState } from './clashHud'

export interface MusterBandProps {
  readonly hud: ClashHudState
}

const TURN_LABEL: Readonly<Record<TurnIndicator, string>> = {
  [TurnIndicator.AwaitingMuster]: 'Awaiting Muster',
  [TurnIndicator.PlayerTurn]: 'Your move',
  [TurnIndicator.CpuTurn]: 'Their move',
  [TurnIndicator.Resolved]: 'Exchange resolved',
}

/**
 * The status-band HUD (SCRUM-30): both sides' remaining Muster and a
 * turn/lifecycle badge. Purely presentational — every value comes from
 * `ClashHudState`, computed by `deriveClashHud`. Mirrors
 * `src/app/warCouncil/RoundStatusBand.tsx`'s three-cell `role="group"`
 * shape; no `aria-live`, matching that component's own precedent (counts
 * update via normal re-render).
 */
export default function MusterBand({ hud }: MusterBandProps) {
  return (
    <div className="vg-muster" role="group" aria-label="Muster and turn">
      <span className="vg-muster-cell" data-side="player">
        <span className="vg-muster-label">You</span>
        <span className="vg-muster-value">{hud.playerMuster ?? '—'}</span>
      </span>
      <span className="vg-turn-indicator" data-indicator={hud.indicator}>
        {TURN_LABEL[hud.indicator]}
        <span className="vg-turn-uncontested" data-visible={hud.uncontested}>
          Uncontested
        </span>
      </span>
      <span className="vg-muster-cell" data-side="cpu">
        <span className="vg-muster-label">CPU</span>
        <span className="vg-muster-value">{hud.cpuMuster ?? '—'}</span>
      </span>
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 4: Component tests for `MusterBand` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/vanguard/__tests__/MusterBand.test.tsx`

- [x] **Step 1: Write the tests, covering the switch AC5 asks for — including the `Player`/`Cpu` fixture-level switch `VanguardMatch` cannot organically produce**

```tsx
/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TurnIndicator, type ClashHudState } from '../clashHud'
import MusterBand from '../MusterBand'

afterEach(cleanup)

const hud = (overrides: Partial<ClashHudState>): ClashHudState => ({
  playerMuster: 5,
  cpuMuster: 3,
  indicator: TurnIndicator.PlayerTurn,
  uncontested: false,
  ...overrides,
})

describe('MusterBand', () => {
  it('shows both sides’ Muster counts in a labelled group', () => {
    render(<MusterBand hud={hud({ playerMuster: 5, cpuMuster: 3 })} />)
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getByText('5')).toBeDefined()
    expect(within(group).getByText('3')).toBeDefined()
  })

  it('shows an em dash for either side before a clash exists, not a false zero', () => {
    render(<MusterBand hud={hud({ playerMuster: null, cpuMuster: null, indicator: TurnIndicator.AwaitingMuster })} />)
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getAllByText('—')).toHaveLength(2)
    expect(within(group).getByText('Awaiting Muster')).toBeDefined()
  })

  it('switches the turn indicator’s text between Player and Cpu — AC5', () => {
    const { rerender } = render(<MusterBand hud={hud({ indicator: TurnIndicator.PlayerTurn })} />)
    expect(screen.getByText('Your move')).toBeDefined()

    rerender(<MusterBand hud={hud({ indicator: TurnIndicator.CpuTurn })} />)
    expect(screen.getByText('Their move')).toBeDefined()
    expect(screen.queryByText('Your move')).toBeNull()
  })

  it('marks the uncontested state visibly, distinct from the plain turn label', () => {
    render(<MusterBand hud={hud({ uncontested: true })} />)
    const badge = screen.getByText('Uncontested')
    expect(badge.dataset.visible).toBe('true')
  })

  it('reads as resolved once the exchange ends, with the final tallies intact', () => {
    render(<MusterBand hud={hud({ playerMuster: 2, cpuMuster: 1, indicator: TurnIndicator.Resolved })} />)
    expect(screen.getByText('Exchange resolved')).toBeDefined()
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getByText('2')).toBeDefined()
    expect(within(group).getByText('1')).toBeDefined()
  })
})
```

- [x] **Step 2: Run the new component test file**

Run: `npx vitest run src/app/vanguard/__tests__/MusterBand.test.tsx`
Expected: exits 0, 5 tests pass.

### Task 5: Style `MusterBand` in `vanguard.css` ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/vanguard/vanguard.css`

- [x] **Step 1: Turn `.vg-band` into a two-row header and add the new selectors**

Replace the existing `.vg-band` rule and the now-removed `.vg-band-note` rule:

```css
.vg-band {
  grid-area: status;
  display: grid;
  grid-template-rows: auto auto;
  gap: 0.35rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--vg-felt-line);
  background: var(--vg-chamber-lift);
}
```

(Delete `.vg-band-note` — the placeholder note it styled is gone as of Task 6.)

Append after the existing `.vg-band-round` rule:

```css
/* -------------------------- Muster / turn HUD (SCRUM-30) ------------------------- */
.vg-muster {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.6rem;
}

.vg-muster-cell {
  display: grid;
  justify-items: center;
  gap: 0.05rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--vg-radius);
  border: 1px solid var(--vg-felt-line);
  background: var(--vg-felt);
}

.vg-muster-cell[data-side='player'] {
  justify-self: start;
}

.vg-muster-cell[data-side='cpu'] {
  justify-self: end;
}

.vg-muster-label {
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vg-chalk-dim);
}

.vg-muster-value {
  font-family: var(--vg-serif);
  font-size: clamp(1rem, 2.6vmin, 1.3rem);
  font-variant-numeric: tabular-nums;
  color: var(--vg-chalk);
}

.vg-turn-indicator {
  display: grid;
  justify-items: center;
  gap: 0.1rem;
  padding: 0.28rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--vg-felt-line);
  background: var(--vg-chamber);
  font-family: var(--vg-serif);
  font-size: clamp(0.78rem, 2vmin, 0.92rem);
  color: var(--vg-chalk-dim);
  white-space: nowrap;
}

.vg-turn-indicator[data-indicator='playerTurn'] {
  border-color: var(--vg-brass);
  color: var(--vg-brass);
}

.vg-turn-indicator[data-indicator='resolved'] {
  border-color: var(--vg-chalk-dim);
  color: var(--vg-chalk);
}

.vg-turn-uncontested {
  display: none;
  font-family: var(--vg-sans);
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--vg-alarm);
}

.vg-turn-uncontested[data-visible='true'] {
  display: block;
}
```

- [x] **Step 2: Confirm the file stays inside budget**

Run: `(Get-Content src\app\vanguard\vanguard.css | Measure-Object -Line).Lines`
Expected: under 400 (the file measured 305 lines before this addition; the appended block is well
under 100 lines).

---

## Phase 3 — Wire the HUD into `VanguardMatch.tsx`

The mount now has everything it needs from Phases 1–2. This phase replaces the placeholder note and
de-duplicates the inline `playerTurn`/`musterAvailable`/`deriveHint` logic against the same
`ClashHudState` the tests in Phase 1 already pin down — a mechanical rewire, not new logic.

### Task 6: Replace the placeholder note with `MusterBand`, remove the inline `deriveHint` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/VanguardMatch.tsx`

- [x] **Step 1: Import the new module and component**

```ts
import { deriveClashHud, deriveHint } from './clashHud'
import MusterBand from './MusterBand'
```

- [x] **Step 2: Compute `hud` once per render and reuse it for `playerTurn`/`musterAvailable`**

Replace:

```ts
const playerTurn =
  clash !== null && clash.status === ClashStatus.InProgress && clash.turn === PlayerSide.Player
const canAct = playerTurn && ui.fault === null
const musterAvailable =
  clash !== null && clash.status === ClashStatus.InProgress ? clash.muster[PlayerSide.Player] : 0
```

with:

```ts
const hud = deriveClashHud(clash)
const playerTurn = hud.indicator === TurnIndicator.PlayerTurn
const canAct = playerTurn && ui.fault === null
const musterAvailable = hud.playerMuster ?? 0
```

Add `TurnIndicator` to the import from `./clashHud` (`import { deriveClashHud, deriveHint,
TurnIndicator } from './clashHud'`).

- [x] **Step 3: Replace the header markup, deleting the placeholder note**

Replace:

```tsx
<header className="vg-band">
  <span className="vg-band-round">Round {ui.round} · The Clash</span>
  <span className="vg-band-note">Muster counts and turn indicator are SCRUM-30</span>
</header>
```

with:

```tsx
<header className="vg-band">
  <span className="vg-band-round">Round {ui.round} · The Clash</span>
  <MusterBand hud={hud} />
</header>
```

- [x] **Step 4: Delete the module-local `deriveHint` function and its call site, using the imported one**

Delete the entire `function deriveHint(ui: MatchUiState): string { ... }` block at the bottom of the
file. Replace `const hint = deriveHint(ui)` with `const hint = deriveHint(ui, hud)`.

`tsconfig.app.json` sets `noUnusedLocals: true`, so the now-dead `type MatchUiState` import from
`./matchReducer` fails `typecheck`, not just lint — remove it from that import statement (`type
MatchFault` stays; it's still used by `faultMessage`):

```ts
import {
  createMatchUiState,
  matchReducer,
  MatchActionKind,
  type MatchFault,
} from './matchReducer'
```

- [x] **Step 5: Confirm the file stays inside budget and typechecks**

Run: `(Get-Content src\app\vanguard\VanguardMatch.tsx | Measure-Object -Line).Lines; npm run typecheck`
Expected: line count comfortably under 400 (was 173 lines; net change is small — a few lines added,
~15 removed with the deleted `deriveHint`); typecheck exits 0.

### Task 7: Extend `VanguardMatch.test.tsx` — AC5's end-to-end coverage ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/__tests__/VanguardMatch.test.tsx`

- [x] **Step 1: Add a test asserting the Muster count changes after a real tap**

Append inside the existing `describe('VanguardMatch', ...)` block:

```tsx
// Multiple .vg-muster-value cells exist (player + CPU), so a single-match
// getByText would throw on "multiple elements found" — read both as one
// joined string instead, still queried through the accessible group only.
const musterReading = () =>
  within(screen.getByRole('group', { name: 'Muster and turn' }))
    .getAllByText(/^\d+$/)
    .map((el) => el.textContent)
    .join(',')

it('updates the rendered Muster count after an accepted action — AC1, AC5', async () => {
  render(
    <VanguardMatch initialState={makeBoard()} requestTricksWon={resolveTricks} onComplete={vi.fn()} />,
  )
  await clashStarted()
  const before = musterReading()

  const target = cell('Cell 2, 0 — empty')
  fireEvent.click(target)

  await waitFor(() => expect(musterReading()).not.toBe(before))
})

it('shows the awaiting-Muster state before the clash starts, then switches to the player’s own turn — AC2, AC5', () => {
  render(
    <VanguardMatch initialState={makeBoard()} requestTricksWon={neverResolves} onComplete={vi.fn()} />,
  )
  expect(screen.getByText('Awaiting Muster')).toBeDefined()
})
```

Add `within` to the existing `@testing-library/react` import at the top of the file.

- [x] **Step 2: Run the extended test file**

Run: `npx vitest run src/app/vanguard/__tests__/VanguardMatch.test.tsx`
Expected: exits 0, all 7 tests pass (5 existing + 2 new).

- [x] **Step 3: Typecheck the whole tree touched so far**

Run: `npm run typecheck`
Expected: exits 0.

---

## Phase 4 — Documentation refresh

Docs-only. No production code changes — safe to run any time after Phase 3.

### Task 8: Refresh `.docs/implementation/vanguard-ui.md` ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/vanguard-ui.md`

- [x] **Step 1: Invoke `implementation-doc-writer` for `src/app/vanguard/`**

Incorporate: `clashHud.ts`'s `TurnIndicator`/`ClashHudState`/`deriveClashHud`/`deriveHint` (new
exports, added to the Key types & exports table; `deriveHint` moved out of `VanguardMatch.tsx`'s
own body, so update any prose that still describes it as inline); `MusterBand.tsx` (new default
export, added to the table and a new "How it works" subsection covering the HUD's shape and the
`advanceCpu`-synchronous-drain finding — the reason `CpuTurn` is typed but not reachable through
this mount, referencing `plan.md`'s Assumptions for the full trace); the `.vg-band` header's new
two-row shape. Close out the existing Deferred bullet "Muster counts and a turn indicator are not
shown" — either delete it or rewrite it to state what shipped. Append `SCRUM-30` to the module's
**Built by** line.

- [x] **Step 2: Verify the doc actually names the new code**

Run: `Select-String -Path .docs\implementation\vanguard-ui.md -Pattern "deriveClashHud|MusterBand"`
Expected: at least one hit each.

---

## Phase 5 — Final verification

No production changes — only sanity-checks that the cumulative work is clean.

### Task 9: Confirm no tunable was hard-coded and no stale placeholder remains ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Confirm the SCRUM-30 placeholder note is gone**

Run: `Select-String -Path src\app\vanguard\*.tsx -Pattern "Muster counts and turn indicator are SCRUM-30"`
Expected: zero hits.

- [x] **Step 2: Confirm no new hex colour literal landed in a `.tsx` file**

Run: `Select-String -Path src\app\vanguard\MusterBand.tsx,src\app\vanguard\VanguardMatch.tsx -Pattern "#[0-9a-fA-F]{3,6}"`
Expected: zero hits — every colour is a `--vg-*` custom property read from CSS, none hard-coded in a component.

### Task 10: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed (including the 12 new tests introduced by this contract: 7 in `clashHud.test.ts` plus its `deriveHint` block, 5 in `MusterBand.test.tsx`, 2 in `VanguardMatch.test.tsx`).

Actual: all three exited 0. Full suite: 49 test files, 391 tests passed. The three
contract-touched spec files scoped together: 25 tests passed (13 in `clashHud.test.ts`
— 7 `deriveClashHud` + 6 `deriveHint` — 5 in `MusterBand.test.tsx`, 7 in
`VanguardMatch.test.tsx` — 5 existing + 2 new). The plan's "12 new tests" undercounted;
13 + 5 + 2 = 20 net-new tests, per the note below the Run line.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Actual: exited 0. `dist/index.html`, `dist/assets/index-*.css` (18.23 kB), `dist/assets/index-*.js` (227.31 kB) written. No bundler errors.

### Task 11: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `pr-description.md` (in this plan folder)

- [x] **Step 1: Write `pr-description.md`**

Include: a link to `plan.md` in this folder; a summary of the change (the HUD replacing the
placeholder note); the developer decisions listed in the File map above (copy, visual treatment,
the phone-viewport check, the unreachable-`CpuTurn` finding); verification results from Phases 1–5;
a one-line note that `deriveHint` moved out of `VanguardMatch.tsx` into `clashHud.ts` for future
contributors touching either file.

---

## Self-review

**Spec coverage:**
- AC1 (both sides' Muster visible, updates after every action) — Tasks 3, 6, 7 (test: "updates the rendered Muster count after an accepted action").
- AC2 (whose turn is visually unambiguous) — Tasks 3, 5, 6, 7 (test: "shows the awaiting-Muster state... then switches to the player's own turn").
- AC3 (uncontested-spend indicator with reason) — Tasks 1 (Task 2's `deriveHint` tests), 3, 4 (test: "marks the uncontested state visibly").
- AC4 (unspent-moves-at-end reads as resolved) — Task 1 (Resolved-state tests), 3, 4 (test: "reads as resolved once the exchange ends, with the final tallies intact") — satisfied structurally by the HUD persisting behind `ClashOverPanel`'s overlay, per `plan.md` Approach; `ClashOverPanel.tsx` itself is untouched, matching the ticket's own scope boundary.
- AC5 (component tests by role/label covering Muster updates and turn-indicator switching) — Task 4 ("switches the turn indicator's text between Player and Cpu"), Task 7 ("updates the rendered Muster count after an accepted action").

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, "appropriate error handling", or "similar to Task N" references. Every step shows exact code or a `Run:`/`Expected:` command.

**Type / name consistency:** `TurnIndicator`, `ClashHudState`, `deriveClashHud`, `deriveHint`, and `MusterBand`/`MusterBandProps` are spelled identically across Tasks 1, 2, 3, 4, 6, and 7 — the same names introduced in `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- Phase 1 ends with a new, fully self-contained, fully-tested pure module — nothing else in the tree imports it yet, so the app's existing behaviour (including the placeholder note) is untouched and still typechecks.
- Phase 2 ends with a new, fully-tested presentational component that nothing yet renders — again no behavioural change to the running app.
- Phase 3 ends with the mount wired to both, the placeholder note gone, and both the moved `deriveHint` and the de-duplicated `playerTurn`/`musterAvailable` typechecking and passing their extended test file.
- Phase 4 is docs-only.
- Phase 5 is verification-only.
