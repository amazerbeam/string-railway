# DLR-131 — Add an ErrorBoundary

Plan: [`plan.md`](./plan.md)

## Summary

Mounts one `ErrorBoundary` class component around `<App />` in `src/main.tsx`, inside `<StrictMode>`, so an escaping render-phase throw lands on a readable fallback panel instead of a blank page. The boundary is root-only — not per screen — because a `useState` functional updater runs during the render of the component that owns that state, and `App` owns all run state; a guarded-spend throw (e.g. `buyFromShop`, `buyOddsBoost`) therefore surfaces in `App`'s own render, above every screen, which a per-screen boundary is structurally incapable of catching. None of the codebase's 98 deliberate `throw` sites were touched, weakened, or removed — this adds a backstop under them, not a softer floor.

New files:
- `src/app/errorLabels.ts` — every fallback string as named constants.
- `src/app/ErrorBoundary.tsx` — the class component. The only class in `src/`.
- `src/app/errorBoundary.css` — the fallback's plain-CSS full-viewport styling.
- `src/app/__tests__/ErrorBoundary.test.tsx` — a throwing child renders the fallback; the restart control remounts children.

Modified:
- `src/main.tsx` — wraps `<App />` in `<ErrorBoundary>`.
- `src/hunt/buffEvaluation.ts`, `src/hunt/encounter.ts`, `src/warCouncil/encounterDeck.ts` — comment prose only, correcting docblock lines that asserted no `ErrorBoundary` existed.
- `.docs/implementation/app/` — records the root-versus-per-screen decision, the only-class-in-`src/` constraint, and what the boundary does not catch.

## Developer decisions needed

Carried over verbatim from the plan's File map — none of these were approved by the developer; this was an out-of-band, unattended sprint item, so every default below was taken and logged rather than confirmed:

- **The fallback copy.** Every string in `src/app/errorLabels.ts` is a stated default, not an approved string — in particular whether `ERROR_FALLBACK_VAULT`'s "should still be there" hedges the right amount about a `SaveWriteOutcome.Rejected` write.
- **Whether `error.message` belongs on a player-facing panel.** Invaluable in a prototype, wrong in a shipped game. Confirm it is wanted now and note it as something to gate later.
- **The root-only decision itself** (`plan.md` Part 2 → Approach). The alternative is a second boundary inside `App`, which forces splitting `App.tsx` (394/400 lines) in the same ticket.
- **The panel rendered in a real browser.** `mockup.html` went unseen and no browser pass ran: nobody has confirmed the panel is centred, fits the viewport without scrolling, reads legibly in both light and dark colour schemes, has ≥44px controls in practice, or that "Reload the page" actually reloads.

## Verification

- `npx prettier --check` on the five contract files (`src/app/ErrorBoundary.tsx`, `src/app/errorLabels.ts`, `src/app/errorBoundary.css`, `src/app/__tests__/ErrorBoundary.test.tsx`, `src/main.tsx`) — all matched files use Prettier code style.
- `npm run typecheck` — exits 0.
- `npm run lint` — exits 0.
- `npm run build` — exits 0.
- Full suite: `Test Files 138 passed (138)`, `Tests 1789 passed (1789)` (baseline 1783 + this contract's 6).
- `throw new` count across `src/`, excluding the new test file: exactly **98** — unchanged from the pre-contract measurement. Zero production `throw` lines appear in the diff.
- `src/App.tsx` — untouched, still 394 lines.
- Line counts of every file this contract created or grew: `ErrorBoundary.tsx` 106, `errorLabels.ts` 24, `errorBoundary.css` 118, `ErrorBoundary.test.tsx` 137, `main.tsx` 18 — all well under the 400-line budget.

## Note for future contributors

`src/app/ErrorBoundary.tsx` is deliberately the only class in `src/` — React has no hook equivalent for `getDerivedStateFromError`/`componentDidCatch`, so it must not be converted to a function component.
