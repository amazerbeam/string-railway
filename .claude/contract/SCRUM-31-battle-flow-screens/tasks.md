# Tasks: Battle-flow screens — round transition and Breach win/loss

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-07

**Goal:** Add two standalone, presentational components — a round-transition summary and a Breach win/loss screen — giving the Battle layer the two DoD-required screens it currently has no UI for, each taking pre-computed props so both are buildable and testable ahead of the not-yet-planned battle-loop orchestrator (`SCRUM-34`) that will eventually mount them.

**Spec:** `plan.md` in this folder. Layout and copy for both screens follow `mockup.html` in this folder (approved), which transcribes the palette verbatim from `src/app/vanguard/vanguard.css` / `src/app/warCouncil/warCouncil.css`.

---

## File map

**Created:**
- `src/app/battle/labels.ts` — `SIDE_LABEL`, the shared "You" / "The opponent" copy map
- `src/app/battle/battle.css` — the full-viewport shell and panel styles for both screens, palette transcribed from `mockup.html`
- `src/app/battle/RoundTransitionPanel.tsx` — the round-transition summary (AC1)
- `src/app/battle/__tests__/RoundTransitionPanel.test.tsx`
- `src/app/battle/BattleOverPanel.tsx` — the Breach win/loss screen (AC2)
- `src/app/battle/__tests__/BattleOverPanel.test.tsx`

**Modified:** (none — neither component is wired into `App.tsx`; see `plan.md` Part 1 → Assumptions made)

**Deleted:** (none)

**Developer decides or observes:**
- Whether the round-transition screen belongs at the `MusterConversion` boundary (this plan's placement) or after Clash resolves without Breach — `plan.md` Part 2 → Risks and judgement calls.
- Whether a win/loss screen with no button at all (no restart flow) reads as acceptable until `SCRUM-34` exists to give it somewhere to go.
- That neither screen is reachable from the running app yet — both ship complete and tested, unmounted, pending `SCRUM-34`.
- Visual and copy polish beyond what `mockup.html` already shows and you approved.

---

## Phase 1 — Shared battle-level scaffolding

Both components need the same copy map and the same shell/panel stylesheet, so this phase builds those first. Nothing renders yet — the phase ends with two new files that type-check (for `labels.ts`) or exist as written (for `battle.css`, which has no compiler to check it against), neither imported by anything yet, so there is nothing to break.

### Task 1: Add the shared side-name copy at `src/app/battle/labels.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/labels.ts`

- [x] **Step 1: Write `src/app/battle/labels.ts`**

```ts
import type { PlayerSide } from '../../warCouncil'

// Copy, not an engine string leaking into the UI — mirrors the convention
// already established in src/app/warCouncil/TrickWell.tsx, shared here
// because two components (RoundTransitionPanel, BattleOverPanel) need
// identical wording.
export const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  player: 'You',
  cpu: 'The opponent',
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add the full-viewport shell stylesheet at `src/app/battle/battle.css` ✓

- Skill: game-ux

**Files:**
- Create: `src/app/battle/battle.css`

- [x] **Step 1: Write `src/app/battle/battle.css`**, transcribing the palette and layout from the approved `mockup.html` (chamber/felt/brass/chalk/parchment tokens copied verbatim from `vanguard.css`/`warCouncil.css`, not invented here):

```css
/* The Battle layer — the two full-viewport screens that frame a battle
   between War Council rounds: the round-transition summary and the
   Breach win/loss screen. Sibling to vanguard.css / warCouncil.css;
   the :root block below is the same chamber/felt/brass/chalk/parchment
   palette both of those already declare verbatim — this game's one
   design system, not a third one invented for the Battle layer. Values
   are transcribed from the approved mockup
   (.claude/contract/SCRUM-31-battle-flow-screens/mockup.html). */

:root {
  --battle-chamber: #0c1013;
  --battle-chamber-lift: #141a1f;
  --battle-felt: #16241f;
  --battle-felt-line: #2b4038;
  --battle-brass: #c99a4e;
  --battle-brass-dim: #7d6132;
  --battle-chalk: #cdd6d2;
  --battle-chalk-dim: #6f7d78;
  --battle-alarm: #d1705f;
  --battle-parchment: #e9e1cd;
  --battle-player: #9575c4;
  --battle-cpu: #5f9e6b;

  --battle-serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --battle-sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --battle-radius: 0.55rem;
}

.battle-shell {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding:
    env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  background: radial-gradient(ellipse at 50% 30%, var(--battle-felt) 0%, var(--battle-chamber) 70%);
  box-sizing: border-box;
}

.battle-panel {
  width: min(30rem, calc(100% - 2rem));
  background: var(--battle-chamber-lift);
  border: 1px solid var(--battle-brass);
  border-radius: var(--battle-radius);
  padding: clamp(1.25rem, 4vmin, 2rem);
  display: grid;
  gap: 1.1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
}

.battle-panel[data-outcome] {
  text-align: center;
}
.battle-panel[data-outcome='player'] h1 {
  color: var(--battle-player);
}
.battle-panel[data-outcome='cpu'] h1 {
  color: var(--battle-alarm);
}

.battle-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--battle-brass-dim);
  margin: 0;
}

.battle-panel h1 {
  margin: 0;
  font-family: var(--battle-serif);
  font-size: clamp(1.4rem, 4vmin, 1.9rem);
  color: var(--battle-brass);
  text-wrap: balance;
}

.battle-panel p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--battle-chalk-dim);
  text-wrap: pretty;
}

.battle-round-note {
  font-size: 0.76rem;
  color: var(--battle-brass-dim);
  letter-spacing: 0.03em;
}

table.battle-tally {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-size: 0.88rem;
  font-family: var(--battle-sans);
}
table.battle-tally caption {
  text-align: left;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--battle-brass-dim);
  margin-bottom: 0.4rem;
}
table.battle-tally th,
table.battle-tally td {
  padding: 0.4rem 0.5rem;
  text-align: right;
  border-bottom: 1px solid var(--battle-felt-line);
}
table.battle-tally th:first-child,
table.battle-tally td:first-child {
  text-align: left;
  color: var(--battle-chalk);
}
table.battle-tally thead th {
  color: var(--battle-chalk-dim);
  font-weight: 400;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
td[data-side='player'] {
  color: var(--battle-player);
}
td[data-side='cpu'] {
  color: var(--battle-cpu);
}

.battle-dealer {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--battle-chalk-dim);
  background: var(--battle-felt);
  border-radius: 4px;
  padding: 0.55rem 0.75rem;
  font-family: var(--battle-sans);
}
.battle-dealer strong {
  color: var(--battle-chalk);
  font-weight: 600;
}

.battle-primary {
  min-height: 44px;
  border-radius: var(--battle-radius);
  border: 0;
  background: var(--battle-brass);
  color: #16150f;
  font-family: var(--battle-serif);
  font-size: 0.98rem;
  cursor: pointer;
  touch-action: manipulation;
  justify-self: stretch;
}
.battle-primary:focus-visible {
  outline: 3px solid var(--battle-parchment);
  outline-offset: 2px;
}
@media (hover: hover) {
  .battle-primary:hover {
    background: #dcae64;
  }
}
.battle-primary:active {
  background: #b98c44;
}
```

- [x] **Step 2: Confirm the file was written**

Run: `Get-ChildItem src\app\battle\battle.css`
Expected: the file is listed (CSS has no compiler to type-check against; this confirms it exists for the components in Phase 2/3 to import).

---

## Phase 2 — Round-transition summary (AC1)

Implements the round-transition screen as a pure, tested component. TDD shape: the test is written and run failing before the component exists, then the component is added to make it pass. The phase ends with a passing scoped Vitest run and a clean typecheck — nothing outside `src/app/battle/` is touched, so the rest of the app is unaffected either way.

### Task 3: Add `src/app/battle/RoundTransitionPanel.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/RoundTransitionPanel.tsx`
- Test: `src/app/battle/__tests__/RoundTransitionPanel.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import RoundTransitionPanel from '../RoundTransitionPanel'

afterEach(cleanup)

describe('RoundTransitionPanel', () => {
  it('shows the round’s tricks, score, and Muster for both sides — AC1, AC3', () => {
    render(
      <RoundTransitionPanel
        round={3}
        dealer={PlayerSide.Player}
        tricksWon={{ player: 8, cpu: 5 }}
        score={{ player: 6, cpu: 2 }}
        muster={{ player: 10, cpu: 7 }}
        onContinue={() => {}}
      />,
    )
    const panel = screen.getByRole('region', { name: 'The War Council has spoken' })
    expect(within(panel).getByText('Round 3 complete')).toBeDefined()
    expect(within(panel).getByText('8')).toBeDefined()
    expect(within(panel).getByText('6')).toBeDefined()
    expect(within(panel).getByText('5')).toBeDefined()
    expect(within(panel).getByText('2')).toBeDefined()
    expect(within(panel).getByText('10')).toBeDefined()
    expect(within(panel).getByText('7')).toBeDefined()
  })

  it('names this round’s dealer and next round’s dealer distinctly — AC1', () => {
    render(
      <RoundTransitionPanel
        round={1}
        dealer={PlayerSide.Cpu}
        tricksWon={{ player: 4, cpu: 9 }}
        score={{ player: 1, cpu: 6 }}
        muster={{ player: 7, cpu: 10 }}
        onContinue={() => {}}
      />,
    )
    // dealer = Cpu this round, so next round's dealer alternates to Player.
    expect(screen.getByText('the opponent', { selector: 'strong' })).toBeDefined()
    expect(screen.getByText('you', { selector: 'strong' })).toBeDefined()
  })

  it('calls onContinue when the primary control is pressed', () => {
    const onContinue = vi.fn()
    render(
      <RoundTransitionPanel
        round={1}
        dealer={PlayerSide.Player}
        tricksWon={{ player: 8, cpu: 5 }}
        score={{ player: 6, cpu: 2 }}
        muster={{ player: 10, cpu: 7 }}
        onContinue={onContinue}
      />,
    )
    screen.getByRole('button', { name: 'Begin The Clash' }).click()
    expect(onContinue).toHaveBeenCalledOnce()
  })
})
```

- [x] **Step 2: Run the test and confirm it fails because the component doesn't exist yet**

Run: `npx vitest run src/app/battle/__tests__/RoundTransitionPanel.test.tsx`
Expected: fails — `Cannot find module '../RoundTransitionPanel'` (or equivalent resolution error).

- [x] **Step 3: Write `src/app/battle/RoundTransitionPanel.tsx`**

```tsx
import { otherSide, PlayerSide } from '../../warCouncil'
import type { Muster } from '../../vanguard'
import { SIDE_LABEL } from './labels'
import './battle.css'

export interface RoundTransitionPanelProps {
  readonly round: number
  readonly dealer: PlayerSide
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly score: Readonly<Record<PlayerSide, number>>
  readonly muster: Muster
  readonly onContinue: () => void
}

/**
 * The round-transition summary (SCRUM-31, AC1): shown once a War Council
 * round's score and Muster are both known, before The Clash begins.
 * Purely presentational — score and muster arrive already computed by
 * the caller (scoreRound / convertScoreToMuster), matching
 * RoundOverPanel's existing contract. `otherSide` is the only derivation
 * this component makes itself: narrating an already-known fact, not new
 * game logic.
 */
export default function RoundTransitionPanel({
  round,
  dealer,
  tricksWon,
  score,
  muster,
  onContinue,
}: RoundTransitionPanelProps) {
  const nextDealer = otherSide(dealer)

  return (
    <div className="battle-shell">
      <div className="battle-panel" role="region" aria-labelledby="battle-transition-title">
        <p className="battle-eyebrow">Round {round} complete</p>
        <h1 id="battle-transition-title">The War Council has spoken</h1>

        <table className="battle-tally">
          <caption>Tricks and points this round</caption>
          <thead>
            <tr>
              <th>Side</th>
              <th>Tricks</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Player]}</td>
              <td data-side="player">{tricksWon[PlayerSide.Player]}</td>
              <td data-side="player">{score[PlayerSide.Player]}</td>
            </tr>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Cpu]}</td>
              <td data-side="cpu">{tricksWon[PlayerSide.Cpu]}</td>
              <td data-side="cpu">{score[PlayerSide.Cpu]}</td>
            </tr>
          </tbody>
        </table>

        <table className="battle-tally">
          <caption>Muster awarded for The Clash</caption>
          <tbody>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Player]}</td>
              <td data-side="player" colSpan={2}>
                {muster[PlayerSide.Player]}
              </td>
            </tr>
            <tr>
              <td>{SIDE_LABEL[PlayerSide.Cpu]}</td>
              <td data-side="cpu" colSpan={2}>
                {muster[PlayerSide.Cpu]}
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Your Vanguard network carries into The Clash unchanged — nothing on the board resets
          between rounds.
        </p>

        <div className="battle-dealer">
          <span>
            This round dealt by <strong>{dealer === PlayerSide.Player ? 'you' : 'the opponent'}</strong>
          </span>
          <span>
            Next round dealt by{' '}
            <strong>{nextDealer === PlayerSide.Player ? 'you' : 'the opponent'}</strong>
          </span>
        </div>

        <button type="button" className="battle-primary" onClick={onContinue}>
          Begin The Clash
        </button>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/app/battle/__tests__/RoundTransitionPanel.test.tsx`
Expected: 3 passed, 0 failed.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 3 — Breach win/loss screen (AC2)

Implements the win/loss screen, same TDD shape as Phase 2. AC3 names two fixtures explicitly (Player-Breach, CPU-Breach) — both are covered in the one test file. The phase ends with a passing scoped Vitest run and a clean typecheck; `src/app/battle/` now holds both finished screens, still unwired from `App.tsx` by design.

### Task 4: Add `src/app/battle/BattleOverPanel.tsx` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/battle/BattleOverPanel.tsx`
- Test: `src/app/battle/__tests__/BattleOverPanel.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import BattleOverPanel from '../BattleOverPanel'

afterEach(cleanup)

describe('BattleOverPanel', () => {
  it('names the player as winner on a Player-Breach fixture — AC2, AC3', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.getByRole('heading', { name: 'You have taken the Vanguard' })).toBeDefined()
    expect(screen.queryByText(/opponent has taken/)).toBeNull()
  })

  it('names the opponent as winner on a CPU-Breach fixture — AC2, AC3', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Cpu} />)
    expect(
      screen.getByRole('heading', { name: 'The opponent has taken the Vanguard' }),
    ).toBeDefined()
    expect(screen.queryByText(/^You have taken/)).toBeNull()
  })

  it('renders no interactive control — active play ends here (AC2)', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the round the Breach was reached in', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.getByText('Breach reached in round 5')).toBeDefined()
  })
})
```

- [x] **Step 2: Run the test and confirm it fails because the component doesn't exist yet**

Run: `npx vitest run src/app/battle/__tests__/BattleOverPanel.test.tsx`
Expected: fails — `Cannot find module '../BattleOverPanel'` (or equivalent resolution error).

- [x] **Step 3: Write `src/app/battle/BattleOverPanel.tsx`**

```tsx
import { PlayerSide } from '../../warCouncil'
import { SIDE_LABEL } from './labels'
import './battle.css'

export interface BattleOverPanelProps {
  readonly round: number
  readonly winner: PlayerSide
}

/**
 * The Breach win/loss screen (SCRUM-31, AC2): shown once
 * BattleState.phase === 'resolved'. Renders no interactive element —
 * "no further card or board interaction is possible" (AC2) is satisfied
 * structurally, by having nothing else on the screen, not by disabling
 * controls that exist. No restart control: the brief calls that optional
 * and out of scope for this ticket (plan.md Part 1 -> Explicitly out of
 * scope).
 */
export default function BattleOverPanel({ round, winner }: BattleOverPanelProps) {
  const playerWon = winner === PlayerSide.Player

  return (
    <div className="battle-shell">
      <div
        className="battle-panel"
        data-outcome={playerWon ? 'player' : 'cpu'}
        role="region"
        aria-labelledby="battle-over-title"
      >
        <p className="battle-eyebrow">The Breach</p>
        <h1 id="battle-over-title">
          {SIDE_LABEL[winner]} {playerWon ? 'have' : 'has'} taken the Vanguard
        </h1>
        <p>
          {playerWon
            ? "Your tokens formed an unbroken chain from base to base. The battle is over — the opponent's Vanguard is yours."
            : 'Their tokens formed an unbroken chain from base to base. The battle is over — your Vanguard has fallen.'}
        </p>
        <p className="battle-round-note">Breach reached in round {round}</p>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/app/battle/__tests__/BattleOverPanel.test.tsx`
Expected: 4 passed, 0 failed.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 4 — Final verification

No production changes — sanity-checks only. No architectural-boundary grep is included: this plan establishes no pure-core boundary (neither component crosses one). No hard-coded-tunable grep is included: this plan introduces no configuration key or tunable value — `SIDE_LABEL` is copy, not a tunable.

### Task 5: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.
Actual (QA, round 2): typecheck exit 0; lint exit 0; `Test Files 51 passed (51)`, `Tests 398 passed (398)`.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual (QA, round 2): exit 0, `dist/index.html` + `dist/assets/*` written, no bundler errors.

### Task 6: Update the PR description ✓

- Skill: none — writing a plain-text handoff document, not source code

**Files:**
- Create: `pr-description.md` (in this plan folder)

- [x] **Step 1: Write `.claude/contract/SCRUM-31-battle-flow-screens/pr-description.md`**

Include:
- Link to `plan.md` in this folder.
- Summary: adds `RoundTransitionPanel` and `BattleOverPanel` under `src/app/battle/`, satisfying the Definition of Done's round-transition and Breach win/loss screens; neither is wired into `App.tsx` yet (reserved for the not-yet-planned `SCRUM-34` orchestrator).
- Every decision the developer must make: the `MusterConversion`-boundary placement of the round-transition screen, whether a button-less win/loss screen is acceptable pending `SCRUM-34`, and any further visual/copy polish beyond the approved `mockup.html`.
- Verification results from Task 5 (typecheck/lint/test/build, each with its pass/fail and the Vitest summary line).
- A one-line note for future contributors: `src/app/battle/` is the new sibling to `src/app/warCouncil/` and `src/app/vanguard/` for Battle-level (not per-subgame) screens.

---

## Self-review

**Spec coverage:**
- AC1 (round-transition summary, score-band result + Muster, dealer-alternation/board-persistence copy) — Task 3.
- AC2 (Breach win/loss screen, unambiguous winner, no further interaction) — Task 4.
- AC3 (component tests by role/label; round-transition score-band coverage; win/loss winner-naming for both Player-Breach and CPU-Breach fixtures) — Task 3 Step 1, Task 4 Step 1.
- Scope boundary (no restart flow) — honoured by omission; `BattleOverPanel` in Task 4 has no button, documented in its own comment.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `RoundTransitionPanelProps`, `BattleOverPanelProps`, `SIDE_LABEL`, and the CSS class names (`battle-shell`, `battle-panel`, `battle-eyebrow`, `battle-tally`, `battle-dealer`, `battle-primary`, `battle-round-note`) are each introduced once (Phase 1/2/3) and used identically everywhere else they appear, matching `plan.md` Part 2 → Data shapes exactly.

**Phase boundary cleanliness:** Phase 1 adds two files nothing yet imports — type-checks trivially, nothing else in the tree references them. Phase 2 adds one component and its test, self-contained under `src/app/battle/`, importing only Phase 1's two files plus existing exports from `warCouncil`/`vanguard` — type-checks and its own scoped Vitest run passes before moving on. Phase 3 does the same for the second component. Phase 4 touches no production file.
