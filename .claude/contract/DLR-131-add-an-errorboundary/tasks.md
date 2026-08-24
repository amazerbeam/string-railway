# Tasks: Add an ErrorBoundary — a readable fallback over 98 deliberate throws

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> `plan.md` was **not** developer-confirmed: this is an out-of-band item in an unattended sprint run, so the approval gate was not presented and every stated default was taken and logged. `mockup.html` was generated and went **UNSEEN**. No browser pass was requested.

**Goal:** Mount one `ErrorBoundary` class component around `<App />` in `src/main.tsx` so an escaping throw lands on a readable fallback instead of a blank page — root-only, argued, with no existing `throw` touched.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/errorLabels.ts` — every string the fallback renders, as named constants.
- `src/app/ErrorBoundary.tsx` — the class component. The only class in `src/`.
- `src/app/errorBoundary.css` — the fallback's plain-CSS styling.
- `src/app/__tests__/ErrorBoundary.test.tsx` — a throwing child renders the fallback; reset remounts children.

**Modified:**
- `src/main.tsx` — wrap `<App />` in `<ErrorBoundary>` inside `<StrictMode>`.
- `src/hunt/buffEvaluation.ts:60` — **comment prose only.** Correct a docblock line that asserts no `ErrorBoundary` exists.
- `src/hunt/encounter.ts:267` — **comment prose only.** Same correction.
- `src/warCouncil/encounterDeck.ts:79` — **comment prose only.** Same correction.
- `.docs/implementation/app/` — record the root-versus-per-screen decision, the only-class-in-`src/` note, and what a boundary does not catch.
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — the run-log entry this out-of-band item owes.

**Deleted:** (none)

**Developer decides or observes:**
- **The fallback copy.** Every string in `src/app/errorLabels.ts` is a stated default taken unattended, not an approved string — in particular whether `ERROR_FALLBACK_VAULT`'s "should still be there" hedges the right amount about a `SaveWriteOutcome.Rejected` write.
- **Whether `error.message` belongs on a player-facing panel.** Invaluable in a prototype, wrong in a shipped game. Confirm it is wanted now and note it as something to gate later.
- **The root-only decision itself** (`plan.md` Part 2 → Approach). The alternative is a second boundary inside `App`, which forces splitting `App.tsx` (394/400 lines) in the same ticket.
- **The panel rendered in a real browser.** `mockup.html` went unseen and no browser pass ran: nobody has confirmed the panel is centred, fits the viewport without scrolling, reads legibly in both light and dark colour schemes, has ≥44px controls in practice, or that "Reload the page" actually reloads.

---

## Phase 1 — The boundary, its copy, and its mount

Everything the ticket's scope items 1–3 ask for. The phase ends with the boundary written, unit-tested, and mounted in `main.tsx`; the app type-checks throughout because each task adds a self-contained file before anything imports it. **No file named in this phase contains a `throw` in production code** — if a step appears to require editing one, stop.

### Task 1: Add the fallback copy to `src/app/errorLabels.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/errorLabels.ts`

- [x] **Step 1: Write the copy constants, following `src/app/run/runLabels.ts`'s shape**

```ts
/**
 * Every string the `ErrorBoundary` fallback renders. Separated from the component for the same
 * reason `runLabels.ts` and `vaultLabels.ts` are: the copy is greppable, the spec asserts against
 * the same constant the component renders rather than a second copy of it, and the developer can
 * retune the wording without reading JSX.
 *
 * These strings make exactly one promise about persistence and no more. The run is in memory only
 * and is gone; the Vault is written through `saveVault` on every `commit`, so it SHOULD be intact
 * — "should", not "is", because a write can come back `SaveWriteOutcome.Rejected` on a quota error
 * or in private browsing, and the Vault screen is where that is already reported.
 */
export const ERROR_FALLBACK_TITLE = 'Something went wrong'

export const ERROR_FALLBACK_LOST =
  'The Hunt hit an error it could not recover from, and the run you were in has been lost.'

export const ERROR_FALLBACK_VAULT =
  'Vault progress is written to storage as you bank it, so anything already banked should still be there. Nothing else carries between runs.'

export const ERROR_FALLBACK_DETAIL_LABEL = 'What went wrong'

export const ERROR_FALLBACK_RESTART_LABEL = 'Start a new run'

export const ERROR_FALLBACK_RELOAD_LABEL = 'Reload the page'
```

- [x] **Step 2: Confirm the file compiles**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Write `ErrorBoundary`, its stylesheet, and its spec ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/ErrorBoundary.tsx`
- Create: `src/app/errorBoundary.css`
- Test: `src/app/__tests__/ErrorBoundary.test.tsx`

Layout and control placement per `.claude/contract/DLR-131-add-an-errorboundary/mockup.html` — a centred panel in a full-viewport `role="alert"` region, title, two body paragraphs, a monospace detail block, and a two-button action row. That mockup went unseen, so treat it as this plan's own intent rather than as an approved design.

- [x] **Step 1: Write the failing spec at `src/app/__tests__/ErrorBoundary.test.tsx`**

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'
import {
  ERROR_FALLBACK_DETAIL_LABEL,
  ERROR_FALLBACK_LOST,
  ERROR_FALLBACK_RELOAD_LABEL,
  ERROR_FALLBACK_RESTART_LABEL,
  ERROR_FALLBACK_TITLE,
  ERROR_FALLBACK_VAULT,
} from '../errorLabels'

afterEach(cleanup)

// Shaped like the real thing this boundary exists to catch: `apCostOf`'s deliberate RangeError on
// an unpriced BuffKind, which the `Unassigned` placeholder trap reached three times during the V5
// build. This spec ADDS a throw in a test double; it does not touch any production throw.
const BOOM = 'apCostOf: no AP price for buff kind "unassigned"'

/**
 * React logs a caught error and its component stack to `console.error` by design. Suppressed for
 * the duration of ONE test and restored in the same test's `finally` — never a global console mock,
 * and never a module mock. There is no other mocking in this codebase and one noisy spec is not a
 * reason to start.
 */
function withSuppressedReactErrorLog(body: () => void): void {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    body()
  } finally {
    spy.mockRestore()
  }
}

describe('ErrorBoundary', () => {
  it('renders its children untouched while nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>the felt</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('the felt')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeNull()
  })

  it('renders the fallback instead of unmounting the tree when a child throws', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <p>the felt</p>
          <Boom />
        </ErrorBoundary>,
      )
      // The fallback is on screen — not a blank page.
      expect(screen.getByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeTruthy()
      expect(screen.getByText(ERROR_FALLBACK_LOST)).toBeTruthy()
      expect(screen.getByText(ERROR_FALLBACK_VAULT)).toBeTruthy()
      expect(screen.getByRole('alert')).toBeTruthy()
      // The failed subtree is gone, which is what React does and what the fallback replaces.
      expect(screen.queryByText('the felt')).toBeNull()
    })
  })

  it('shows the error message as technical detail, never the stack', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      const { container } = render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getByText(ERROR_FALLBACK_DETAIL_LABEL)).toBeTruthy()
      expect(screen.getByText(BOOM, { exact: false })).toBeTruthy()
      expect(container.textContent).not.toContain('at Boom')
    })
  })

  it('offers exactly two controls, both named by their label constants', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getAllByRole('button')).toHaveLength(2)
      expect(screen.getByRole('button', { name: ERROR_FALLBACK_RESTART_LABEL })).toBeTruthy()
      expect(screen.getByRole('button', { name: ERROR_FALLBACK_RELOAD_LABEL })).toBeTruthy()
    })
  })

  it('clears the error and remounts its children when the restart control is used', () => {
    // Closure-scoped, NOT module-scoped: module-level mutable state leaks between the tests in a
    // file and survives HMR.
    let explode = true
    function Flaky() {
      if (explode) throw new RangeError(BOOM)
      return <p>the felt</p>
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>,
      )
      expect(screen.getByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeTruthy()
      explode = false
      fireEvent.click(screen.getByRole('button', { name: ERROR_FALLBACK_RESTART_LABEL }))
      expect(screen.getByText('the felt')).toBeTruthy()
      expect(screen.queryByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeNull()
    })
  })

  it('normalises a non-Error throw so the detail line is always renderable', () => {
    function Boom(): never {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberate: the boundary
      // must survive a throw of something that is not an Error, which JavaScript permits.
      throw 'a bare string'
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getByText('a bare string', { exact: false })).toBeTruthy()
    })
  })
})
```

If `@typescript-eslint/only-throw-error` is not configured on this project, delete that disable comment rather than leaving an unused suppression — `npm run lint` reports unused disable directives.

- [x] **Step 2: Run the spec and confirm it fails because the module does not exist yet**

Run: `npx vitest run src/app/__tests__/ErrorBoundary.test.tsx`
Expected: non-zero exit; the failure is `Failed to resolve import "../ErrorBoundary"`, not an assertion failure.

- [x] **Step 3: Write `src/app/errorBoundary.css`**

Plain CSS, per-component, matching `src/app/run/run.css`'s approach. Full-viewport `100dvh` grid with the panel centred, so the document never scrolls (`body { overflow: hidden }` is already set in `src/styles/global.css`). Controls are `min-height: 44px; min-width: 44px` with `touch-action: manipulation`; the focus ring is `:focus-visible`, never bare `:focus`; the hover rule is wrapped in `@media (hover: hover)` and paired with `:active`. Class names, all confirmed zero-hit across `src/**` before this contract: `.error-fallback`, `.error-fallback__panel`, `.error-fallback__title`, `.error-fallback__body`, `.error-fallback__detail`, `.error-fallback__detail-label`, `.error-fallback__actions`, `.error-fallback__action`, `.error-fallback__action--primary`. Colours follow `mockup.html` and must stay legible under `color-scheme: light dark`, which `:root` in `src/styles/global.css` already declares.

- [x] **Step 4: Write `src/app/ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode } from 'react'
import './errorBoundary.css'
import {
  ERROR_FALLBACK_DETAIL_LABEL,
  ERROR_FALLBACK_LOST,
  ERROR_FALLBACK_RELOAD_LABEL,
  ERROR_FALLBACK_RESTART_LABEL,
  ERROR_FALLBACK_TITLE,
  ERROR_FALLBACK_VAULT,
} from './errorLabels'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  /** The caught error, or `null` while the subtree is healthy. The error itself rather than a
   *  `hasError` boolean, because that is what lets the fallback show `error.message`. */
  readonly error: Error | null
}

/**
 * DLR-131 — the net under `src/`'s 98 deliberate `throw` sites across 37 files. Those throws are
 * correct and stay exactly as they are: `apCostOf` throws on an unpriced `BuffKind`,
 * `timebombDamageOf` throws rather than returning a plausible small integer, `drawReelPool` throws
 * on an empty strip. This adds the backstop, not a softer floor.
 *
 * **THIS IS THE ONLY CLASS IN `src/` AND IT MUST STAY ONE.** React has no hook equivalent for
 * `getDerivedStateFromError` or `componentDidCatch` — in React 19 there is no way to write an error
 * boundary as a function component at all. "Modernising" this file into a function silently deletes
 * the mechanism while everything still type-checks, lints, and renders.
 *
 * **Mounted at the ROOT ONLY, around `<App />` in `src/main.tsx` — not per screen.** React runs a
 * `useState` functional updater during the render of the component that OWNS that state, and
 * DLR-116/DLR-118 deliberately moved the shop's and the Vault's spend guards inside those updaters.
 * So when `buyFromShop` or `buyOddsBoost` throws, it throws while React is rendering `App`, above
 * every screen — a per-screen boundary is structurally incapable of catching the exact crash that
 * prompted this ticket. A per-screen boundary also could not honestly offer to keep the run: all
 * run state lives in `App` and the screens are pure views of it, so re-entering a crashed screen
 * with the same state re-throws at once.
 *
 * **What this does NOT catch, stated so nobody assumes otherwise:** throws inside an event handler,
 * a `setTimeout`, or a rejected promise. Those escape to `window.onerror` and still blank the
 * screen. That is a second reason the in-the-updater guard convention matters — it is what brings a
 * guarded spend under this net in the first place.
 *
 * `componentDidCatch` is deliberately absent. React already prints the error and its component
 * stack itself, this prototype has no telemetry sink, and `console.log`/`console.debug` are
 * forbidden in shipped code — an empty override or a duplicate log would both be worse than the
 * omission. Add it only when there is somewhere real to send an error.
 *
 * Holds no effect, no listener, no timer and no module-level state, so there is nothing to clean up
 * and nothing for StrictMode's development double-render to double-fire.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  /** `caught` is `unknown` because JavaScript permits throwing anything. Normalised to an `Error`
   *  so `error.message` is always a renderable string — a widening, not a swallow: the thrown
   *  value's `String()` form is exactly what reaches the screen. */
  static getDerivedStateFromError(caught: unknown): ErrorBoundaryState {
    return { error: caught instanceof Error ? caught : new Error(String(caught)) }
  }

  handleRestart = () => {
    // React destroyed the failed subtree when this boundary swapped to the fallback, so clearing
    // the error mounts `App` fresh: a new run, with the Vault re-read from storage. That is exactly
    // what ERROR_FALLBACK_RESTART_LABEL promises and nothing more.
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <main className="error-fallback" role="alert">
        <div className="error-fallback__panel">
          <h1 className="error-fallback__title">{ERROR_FALLBACK_TITLE}</h1>
          <p className="error-fallback__body">{ERROR_FALLBACK_LOST}</p>
          <p className="error-fallback__body error-fallback__body--quiet">{ERROR_FALLBACK_VAULT}</p>
          <p className="error-fallback__detail">
            <span className="error-fallback__detail-label">{ERROR_FALLBACK_DETAIL_LABEL}</span>
            {error.message}
          </p>
          <div className="error-fallback__actions">
            <button
              type="button"
              className="error-fallback__action error-fallback__action--primary"
              onClick={this.handleRestart}
            >
              {ERROR_FALLBACK_RESTART_LABEL}
            </button>
            <button
              type="button"
              className="error-fallback__action"
              onClick={this.handleReload}
            >
              {ERROR_FALLBACK_RELOAD_LABEL}
            </button>
          </div>
        </div>
      </main>
    )
  }
}
```

`error.message` is rendered; `error.stack` is never read. Class fields with arrow initialisers are standard JavaScript and survive `erasableSyntaxOnly` in `tsconfig.app.json`; parameter properties would not, so do not introduce a constructor that declares one.

- [x] **Step 5: Run the spec and the typecheck**

Run: `npx vitest run src/app/__tests__/ErrorBoundary.test.tsx; npm run typecheck`
Expected: Vitest reports all tests in that file passed and exits 0; `typecheck` exits 0.

- [x] **Step 6: Confirm neither new file is near the line budget**

Run: `(Get-Content src\app\ErrorBoundary.tsx).Count; (Get-Content src\app\errorLabels.ts).Count; (Get-Content src\app\errorBoundary.css).Count`
Expected: every value well under 400. **Use `(Get-Content …).Count`, never `Measure-Object -Line`** — the latter drops blank lines and hid a real breach on DLR-63.

### Task 3: Mount the boundary in `src/main.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/main.tsx:1-10`

- [x] **Step 1: Wrap `<App />` in `<ErrorBoundary>` inside `<StrictMode>`**

Replace the whole of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
// Imported by full path, NOT from the `./app` barrel: extensionless `./app` collides
// case-insensitively with `App.tsx` on NTFS — the trap documented at `src/App.tsx:41-45`.
import ErrorBoundary from './app/ErrorBoundary'

// DLR-131 — the boundary sits INSIDE StrictMode, not outside it. StrictMode's development
// double-render is exactly the condition under which a render-phase throw should be caught, and a
// boundary outside it would leave StrictMode's own subtree unguarded.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
```

- [x] **Step 2: Typecheck and run the app-level specs that render the whole tree**

Run: `npm run typecheck; npx vitest run src/__tests__/App.test.tsx src/app/__tests__/ErrorBoundary.test.tsx`
Expected: `typecheck` exits 0; Vitest reports 0 failed.

---

## Phase 2 — Correct the record

Three production docblocks assert that no `ErrorBoundary` exists, and Phase 1 makes all three false. The project's single-source-of-truth rule says to fix a wrong fact where it is owned. This phase changes **comment prose only** and produces a zero-line behavioural diff, so the boundary between it and Phase 1 is safe by construction.

### Task 4: Correct the three docblocks that assert no boundary exists ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffEvaluation.ts:60` — comment prose only
- Modify: `src/hunt/encounter.ts:267` — comment prose only
- Modify: `src/warCouncil/encounterDeck.ts:79` — comment prose only

> **STOP CONDITION.** All three files contain deliberate `throw` statements. **Not one line of code in any of them may change** — no `throw` weakened, moved, removed, retyped, or converted to a return; no signature, no guard, no import. If a step here seems to require touching a `throw`, the step is wrong: stop and report it. The diff for this task must be comment lines only.

- [x] **Step 1: Read each site and rewrite only the clause that is now false**

Each currently claims some form of "no `ErrorBoundary` exists (DLR-131)", used to argue why a function must not throw or why an escaping throw would blank the screen. Replace that clause with the fact as it now stands, keeping each comment's surrounding argument intact:

- `src/hunt/buffEvaluation.ts:60` — the "NEVER THROWS" discipline stands on its own merits (this runs inside a reducer); the reason changes from "no boundary exists" to: a root `ErrorBoundary` now exists (DLR-131), but it catches a render-phase throw and replaces the whole app with a fallback — it is a net, not a licence for this function to throw.
- `src/hunt/encounter.ts:267` — same substitution: a root boundary now exists, so an escaping throw replaces the app with the fallback panel rather than blanking the screen; that is still a run lost, so the guard here stays.
- `src/warCouncil/encounterDeck.ts:79` — same substitution, same conclusion.

- [x] **Step 2: Confirm the claim is gone and nothing else moved**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "no ``ErrorBoundary`` exists|zero boundaries"`
Expected: zero hits.

- [x] **Step 3: Confirm the diff is comments only**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --stat -- src/hunt/buffEvaluation.ts src/hunt/encounter.ts src/warCouncil/encounterDeck.ts; git diff -- src/hunt/buffEvaluation.ts src/hunt/encounter.ts src/warCouncil/encounterDeck.ts`
Expected: every added and removed line is inside a `/** … */` or `//` comment. If any changed line contains `throw`, revert the file and report.

- [x] **Step 4: Run the specs covering those three modules**

Run: `npx vitest run src/hunt src/warCouncil`
Expected: Vitest reports 0 failed.

### Task 5: Record the decision in `.docs/implementation/app/` ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/app/` — the module doc for the app shell (extend `run-driver.md` or add a sibling, as that skill's folder shape dictates)

- [x] **Step 1: Invoke `implementation-doc-writer` and record four things**

1. **Where the boundary is and why root-only** — the full argument from `plan.md` Part 2 → Approach: a `useState` functional updater runs during the owning component's render, so a guarded-spend throw surfaces in `App`'s render, above every screen; and a per-screen boundary could not honestly offer to keep a run whose entire state lives in `App`.
2. **That `ErrorBoundary` is the only class in `src/`, and why it must stay one** — `getDerivedStateFromError` / `componentDidCatch` have no hook equivalent in React 19; converting the file to a function component deletes the mechanism silently.
3. **What the boundary does not catch** — event handlers, `setTimeout`, rejected promises, and its own fallback render. Tie this to the in-the-updater guard convention from DLR-116/DLR-118, which is what brings a guarded spend under the net.
4. **What the fallback says and what it deliberately does not promise** — the in-memory run is lost; Vault progress is written through on each `commit` and *should* be intact, hedged because a write can return `SaveWriteOutcome.Rejected`.

`.docs/game_rules/the-hunt.md` is **not** touched: this contract changes no game rule.

- [x] **Step 2: Confirm the doc file exists and mentions the decision**

Run: `Get-ChildItem .docs\implementation\app; Select-String -Path .docs\implementation\app\*.md -Pattern "ErrorBoundary"`
Expected: at least one hit.

---

## Phase 3 — Final verification

No production changes. Confirms the throws are untouched, no boundary was smuggled anywhere unintended, formatting is clean on this contract's files only, and the four gates are green.

### Task 6: Confirm not one existing `throw` was weakened ✓

- Skill: none — verification only, no code is written

**Files:** (none — read-only checks)

- [x] **Step 1: Re-count the throw sites and compare against the pre-contract measurement**

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new").Count`
Expected: **98 plus one per `throw new RangeError(BOOM)` test double in the new spec** — the pre-contract measurement at `352547d` was 98 `throw new` sites across 37 files. The count may only go **up**, and every added hit must be inside `src/app/__tests__/ErrorBoundary.test.tsx`. Confirm that with:

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new" | Where-Object { $_.Path -notlike "*ErrorBoundary.test.tsx" }).Count`
Expected: exactly **98**. Any number below 98 means a production throw was removed and the contract must be reverted.

- [x] **Step 2: Confirm the production diff contains no changed `throw` line**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff -- src | Select-String -Pattern "^[+-].*throw"`
Expected: hits only in `src/app/__tests__/ErrorBoundary.test.tsx`. Zero hits in any other file.

### Task 7: Confirm the line budget and the pure-core boundary ✓

- Skill: none — verification only, no code is written

**Files:** (none — read-only checks)

- [x] **Step 1: Measure every file this contract created or modified under `src/`**

Run: `Get-ChildItem src\app\ErrorBoundary.tsx, src\app\errorLabels.ts, src\app\errorBoundary.css, src\app\__tests__\ErrorBoundary.test.tsx, src\main.tsx, src\App.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. `App.tsx` must still read **394** — this contract does not modify it.

- [x] **Step 2: Confirm no React import or DOM global entered the pure-core tree**

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `npm run lint` in Task 8 is the actual gate; this is the cheap cross-check.

### Task 8: Static gates and full suite ✓

- Skill: none — verification only, no code is written

**Files:** (none — read-only checks)

- [x] **Step 1: Format this contract's files only, then check them**

Run: `npx prettier --write src/app/ErrorBoundary.tsx src/app/errorLabels.ts src/app/errorBoundary.css src/app/__tests__/ErrorBoundary.test.tsx src/main.tsx; npx prettier --check src/app/ErrorBoundary.tsx src/app/errorLabels.ts src/app/errorBoundary.css src/app/__tests__/ErrorBoundary.test.tsx src/main.tsx`
Expected: `--check` reports all matched files use Prettier code style. **Never run `npm run format`** — it rewrites ~58 pre-existing `.md` files nobody asked to touch. Re-run Task 7 Step 1's line counts after this, since Prettier changes line counts.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed, on a baseline of **1783 passed of 1783 across 137 files** plus this contract's new spec file. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a failure — warm the cache with `npx vitest run --project node; npx vitest run --project dom` and re-run.

*(Full suite, typecheck and lint executed by QA in the reviewer pass: `Test Files 138 passed (138)`, `Tests 1789 passed (1789)`, typecheck 0, lint 0.)*

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

*(Executed by QA in the reviewer pass: build exited 0.)*

### Task 9: Write the run-log entry and the PR description ✓

- Skill: none — documentation hand-off, no code is written

**Files:**
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md`
- Create: `.claude/contract/DLR-131-add-an-errorboundary/pr-description.md`

- [x] **Step 1: Append `## DLR-131 — ErrorBoundary (out-of-band)` to the sprint log**

Record: the measured counts (98 `throw new` sites across 37 files at `352547d`; zero real boundaries — the three `ErrorBoundary` grep hits were docblocks naming this ticket); every plan default taken unattended; the root-versus-per-screen decision with its argument; what the fallback offers and what it deliberately does not promise; that `mockup.html` went unseen; and precisely what a browser would have checked. Write it with the Write/Edit tools, **not** PowerShell — PowerShell reads UTF-8 as ANSI and corrupts em-dashes.

*(Orchestrator's step — not the Implementer's. Left unticked.)*

- [x] **Step 2: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; the summary of the change; every developer decision from the File map's "Developer decides or observes"; the verification results from Phase 3 with real numbers; and a one-line note for future contributors that `src/app/ErrorBoundary.tsx` is deliberately the only class in `src/` and must not be converted to a function component.

---

## Self-review

**Spec coverage:**
- Ticket scope 1 — an `ErrorBoundary` with a readable fallback, not a stack trace, not a blank page — Tasks 1, 2.
- Ticket scope 2 — decide and document root versus per-screen versus both — `plan.md` Part 2 → Approach, the docblock in Task 2 Step 4, and Task 5.
- Ticket scope 3 — a test that a throwing child renders the fallback rather than unmounting the tree — Task 2 Step 1, test 2, which asserts both the fallback's presence and the sibling's absence.
- Ticket scope 4 — no throw weakened or removed — enforced by Phase 1 naming no file that contains one, by Task 4's stop condition, and verified by Task 6.
- Fallback wording versus `src/persistence/` and the Vault — Task 1's docblock and copy constants; routed to the developer in the File map.
- The only-class-in-`src/` note with its reason — Task 2 Step 4's docblock and Task 5 item 2.
- Mockup generated and marked unseen — `mockup.html`, cited by Task 2.
- Run log — Task 9 Step 1.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or the exact command with its expected result.

**Type / name consistency:** `ErrorBoundary` (default export), `ErrorBoundaryProps`, `ErrorBoundaryState`, the six `ERROR_FALLBACK_*` constants, and the nine `error-fallback*` class names are spelled identically in `plan.md` Part 2 → Data shapes, in Task 2's component and spec, and in Task 3's mount. `hasError` appears nowhere: the state field is `error`, per Data shapes.

**Phase boundary cleanliness:**
- *Phase 1* ends type-checking: each file is created before anything imports it (labels → component → mount), the new spec passes, and `App.tsx` is untouched.
- *Phase 2* changes comment prose only and `src/hunt` / `src/warCouncil` specs are re-run, so it cannot leave a half-applied change.
- *Phase 3* writes no production code at all; every task is a read-only check or a documentation file outside `src/`.
