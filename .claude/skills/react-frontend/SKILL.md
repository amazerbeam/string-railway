---
name: react-frontend
description: Apply this project's React 19 + Vite + TypeScript conventions — component structure, hooks, state management, configuration-driven values, and Vitest coverage. Use when building or editing anything under prototype/src/, wiring state, rendering UI, or reviewing a frontend change.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell
metadata:
  type: reference
---

# React Frontend

Conventions for this project's React 19 + Vite + TypeScript prototype. **This skill governs `prototype/src/**` only.** The prototype is retained as a runnable reference and an oracle the Unity port's own simulator is checked against — not as the shipping codebase — so a change here is now unusual rather than routine: a task naming this skill should be able to say why the prototype, rather than the Unity port under `unity/`, is the right place for the work. `unity-programmer` is the skill for anything under `unity/`.

**Scope:** this file holds the hard MUST/NEVER contract plus the project-specific stack facts and traps. General engineering standards — principles in practice, component size budget, constants taxonomy, the four async states, performance order, testing posture, Definition of Done — live in `references/engineering-standards.md`. Read that file when scaffolding something new, reviewing a large change, or when a rule below points at it.

## Engineering principles

Optimise for readability over cleverness, simplicity over abstraction, consistency over personal preference, maintainability over speed, reusability over duplication, predictability over complexity. Before declaring anything done: *will another developer understand this in six months, is it the simplest thing that works, does it match existing patterns here?* Code is read far more often than written.

## Hard floor (MUST / NEVER)

Everything below this section is rationale, detail, or template. These are the rules a change cannot ship without.

### MUST

- **Read the nearest existing equivalent before writing.** Match its file naming, type shape, CSS approach, and error handling.
- **Route state change through a single reducer where state is non-trivial.** `(state, action) => state`, with a clear owner component. Don't scatter the same piece of state across multiple `useState` calls when a reducer would make transitions explicit and testable.
- **Measure every file you create or grow** (`(Get-Content <file> | Measure-Object -Line).Lines`) before declaring the work done. <200 lines fine, 200–400 needs a second look, **>400 is blocking** — split it in the same change (logic → `use*` hook, render concerns → sibling components).
- **Follow one file order:** imports → constants → component → helper functions → export.
- **Extract significant logic into a `use*` hook** — components render UI, hooks hold logic.
- **Declare any repeated meaningful value once and import it** — action kinds, storage keys, status codes, route names. `UPPER_SNAKE_CASE` keys in `prototype/src/constants/` when that folder exists — it does not exist yet on a fresh prototype; create it the first time a value needs this treatment rather than assuming it is already there.
- **Run TypeScript strict.** An `any` needs a stated reason in the summary.
- **Justify any new dependency out loud** in the change summary: what platform API or existing code could do it, bundle cost, maintenance activity.
- **State what you verified and what you did not.** There *is* a test runner — see NEVER below.

### NEVER

- **Never hard-code a value that belongs in configuration.** A literal that a developer will want to retune without a code edit belongs in a configuration file or a named constant, not inline.
- **Never claim a test passed without running it.** Vitest is wired — run it and report the result, or say plainly that you did not.
- **Never swallow an error into a success shape** (`catch { return [] }`) — that turns a genuine failure into a silently degraded success and hides the defect from whoever is debugging it later.
- **Never leave `console.log` / `console.debug` in shipped code.**
- **Never add `memo` / `useMemo` / `useCallback` without profiling evidence** — excessive memoisation is itself an anti-pattern.
- **Never introduce a second state manager.** One reducer or one clear state owner *is* the store — no Redux, no Zustand, no MobX, no parallel copy of the same state in a second hook.
- **Never add a backend, an API client, or a call to a remote server without approval.** If the prototype is static files today, keep it that way unless a task explicitly adds a server dependency.
- **Never create dumping-ground folders** — `misc`, `helpers`, `temp`, `old`, `new`.
- **Never use `dangerouslySetInnerHTML`** without an explicit, reviewed justification.
- **Never knowingly introduce debt silently** — if a shortcut is right, say so in the summary so it's a decision, not a surprise.

## Use when

- Adding or editing anything under `prototype/src/`.
- Wiring or extending application state, a reducer, or a context.
- Rendering or changing UI.
- Reviewing a frontend change for correctness, performance, or accessibility.

## Do not use when

- Jira ticket work — use the `management-jira` skill.
- Anything under `.claude/` that is not source code (prose, prompts, skill files).
- Anything under `unity/` — use `unity-programmer`.

## Stack (authoritative — match what's in the repo)

**Read `package.json` before relying on any line here** — this section will drift as the toolchain is upgraded.

- **React 19 + Vite 8 + TypeScript (strict).** `.ts`/`.tsx` throughout.
- **Two runtime dependencies: `react` and `react-dom`.** A third dependency needs a stated justification and developer approval.
- **Vitest** for unit tests, run with `npm test`. `vite.config.ts` currently sets `environment: 'node'` and `test.include` to `src/**/__tests__/**/*.test.ts` (relative to `prototype/`, where `vite.config.ts` now lives) — verify both against the live file before writing a test, they are load-bearing for where a spec must live and what DOM access it can assume.
- **Styling: plain CSS** in `prototype/src/styles/` and per-component files. No CSS Modules, no CSS-in-JS, no utility framework, unless a task explicitly introduces one.
- **`erasableSyntaxOnly` is on** in `tsconfig.app.json` — no `enum`, no `namespace`. Use the `as const` object-map form for a fixed set of named values instead.
- **No backend.** Static build unless a task explicitly adds one.

## The pure-core boundary (a pattern, not yet enforced)

This project has no enforced import boundary today. But a pure, DOM-free logic tree — no `react`, no `react-dom`, no `window`/`document`/`fetch` — is worth establishing the moment there is meaningful non-UI logic (validation, calculation, parsing, anything with invariants worth unit-testing). It is cheap to establish before the first component imports a helper and mutates a DOM node in place, and expensive to retrofit after that happens even once.

A previous prototype in this repository enforced exactly this with an ESLint override combining `no-restricted-imports` and `no-restricted-globals`, scoped to its pure-logic folder. That override is gone along with the folder it protected, but the mechanism is worth pasting back the moment a new prototype has a tree worth protecting. Below is that override, adapted to a generic example glob — **`src/core/**` is a placeholder for whatever the next prototype names its pure-logic tree, not a folder that exists yet.** Do not create `prototype/src/core/` speculatively; add this block only once a real pure-logic folder exists, and change the glob to match its actual name.

```js
// Paste into prototype/eslint.config.js's defineConfig([...]) array, as an
// additional entry alongside the existing files: ['**/*.{ts,tsx}'] block.
// Replace 'src/core/**' with the actual name of the pure-logic tree
// (relative to prototype/, where eslint.config.js now lives).
{
  files: ['src/core/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
            message: 'src/core/ is pure TypeScript — no React.',
          },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      { name: 'window', message: 'src/core/ must not touch the DOM.' },
      { name: 'document', message: 'src/core/ must not touch the DOM.' },
      { name: 'navigator', message: 'src/core/ must not touch the DOM.' },
      { name: 'localStorage', message: 'src/core/ must not touch browser storage.' },
      { name: 'sessionStorage', message: 'src/core/ must not touch browser storage.' },
      { name: 'fetch', message: 'src/core/ must not touch the network or the DOM.' },
      { name: 'location', message: 'src/core/ must not touch the DOM.' },
      { name: 'history', message: 'src/core/ must not touch the DOM.' },
      { name: 'XMLHttpRequest', message: 'src/core/ must not touch the network or the DOM.' },
      { name: 'requestAnimationFrame', message: 'src/core/ must not touch the DOM.' },
      { name: 'cancelAnimationFrame', message: 'src/core/ must not touch the DOM.' },
      { name: 'alert', message: 'src/core/ must not touch the DOM.' },
      { name: 'confirm', message: 'src/core/ must not touch the DOM.' },
      { name: 'matchMedia', message: 'src/core/ must not touch the DOM.' },
      { name: 'getComputedStyle', message: 'src/core/ must not touch the DOM.' },
      { name: 'Image', message: 'src/core/ must not touch the DOM.' },
      { name: 'Worker', message: 'src/core/ must not touch the DOM.' },
    ],
  },
},
```

Two things to get right when pasting this back:

- **Do not strip `languageOptions.globals: globals.browser`** from the surrounding `files: ['**/*.{ts,tsx}']` block. `no-restricted-globals` only fires on a global that ESLint has been told exists in scope — remove `globals.browser` and the restriction silently stops firing everywhere, not just outside the pure tree.
- **The denylist above is not exhaustive.** `ResizeObserver`, `IntersectionObserver`, `WebSocket`, `postMessage`, and `indexedDB` all pass it untouched. Add names to the list as they come up, but treat the boundary as **review-enforced as well as lint-enforced** — a reviewer reading a diff to the pure-logic tree should still check for a DOM global the list doesn't yet know about.

## React correctness

Traps that cost real debugging time, independent of any particular feature:

- **Every listener, observer, timer, `requestAnimationFrame`, and `AbortController` created in an effect is released in that effect's cleanup.** An orphan leaks *and* double-fires after the next mount.
- **StrictMode mounts effects twice in development.** A non-idempotent effect (appending a node, pushing to a module-level array, starting a second timer) breaks only in dev, or reveals a cleanup you never wrote. Neither symptom shows up in a test running outside StrictMode.
- **Module-level mutable state survives HMR and leaks between tests in one file.** A `let` at module scope persists across hot updates and across every test sharing that module. Reset it explicitly, or don't have it.
- **Stale closures in handlers registered once.** A handler that captured the first render's state will validate against data that is stale by the time it fires. Read live state through a ref, or re-register with the correct deps.
- **Release pointer capture on `pointercancel` as well as `pointerup`.** A drag or gesture handler that only listens for `pointerup` leaves the pointer captured — and the interaction stuck — the moment the OS or browser cancels the gesture (alt-tab, a system gesture, a device disconnect).
- **Never silence `react-hooks/exhaustive-deps`.** A suppressed dependency warning is exactly how a stale closure or a missed re-run gets shipped; fix the dependency, don't hide the lint.

## Performance

Work in this order; stop as soon as the problem is solved:

1. **Keep high-frequency updates off the reconciler.** A value that changes every frame or every pointer move (a drag position, a live measurement) belongs in a ref that's read on the next meaningful event, not in state that re-renders on every change.
2. **Do incremental work per event, not whole-collection work.** Recomputing an entire list or scanning every element on each event is the more common bottleneck than React's own re-render cost.
3. **Only then consider memoisation** (`memo`, `useMemo`, `useCallback`) — and only with profiling evidence that it fixes a measured problem. Memoisation added speculatively is itself a maintenance cost.

## Accessibility and input

- **Every interactive control ≥44×44px** — buttons, toggles, dismiss controls. Keep a tight visual size if the design wants it and expand the hit area with padding.
- **Use `:focus-visible`,** not bare `:focus`, so keyboard outlines do not appear on pointer clicks.
- **Wrap hover styles in `@media (hover: hover)`** and pair every hover state with `:active`, so touch and stylus input aren't left with a "stuck hover" or no feedback at all.
- **Add `touch-action: manipulation`** on interactive elements to remove the tap-delay on touch devices.
- **Semantic HTML and ARIA** — `header`, `nav`, `main`; labels on icon-only buttons; focus management in modals and dialogs; WCAG AA contrast.

The rules above are the floor for any surface. A **playable game surface** — a hand, a board, a HUD — has a further layer that this file does not own: the full-viewport no-scroll shell, screen zoning, the tap cost of a repeated action, and keyboard navigation across a collection of sibling controls. That is `.claude/skills/game-ux/SKILL.md`; load it alongside this one when the change renders something the player plays on.

## Testing

- **Vitest.** Specs live under `prototype/src/**/__tests__/`.
- **Pure logic is tested without a renderer** — plain function-in, value-out assertions, no DOM required.
- **Component tests query by accessible role and label** (`getByRole`, `getByLabelText`) — those queries double as an accessibility check, since a component that's hard to query by role is usually hard to use with a screen reader.
- **Live constraint to check before writing the first component test:** `vite.config.ts` currently sets `environment: 'node'` for the whole suite and `test.include` matches `*.test.ts` only. Neither is wrong today — `prototype/src/**/__tests__/` specs need no DOM, so `node` is the right, cheap environment, and enforcing it is itself a boundary check. The **first test that needs a DOM (a `.test.tsx` component test) must add an environment split** — `environmentMatchGlobs` in `vite.config.ts`, or a second Vitest project scoped to `.tsx` specs — and widen `test.include` to also collect `.test.tsx`. **Do not fix this by flipping the global `environment` to `jsdom`** — that silently removes the "no DOM in this spec" guarantee for every existing pure-logic test at once.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index. That folder is currently empty; re-scan rather than assuming it stays that way.

## Success criteria

- No hard-coded value that belongs in configuration.
- No file created or grown past 400 lines — measured with `(Get-Content <file> | Measure-Object -Line).Lines`, not estimated.
- `npm test` and `npm run typecheck` both clean, and both actually run.
- No new `console.log` / `console.debug`.
- No new runtime dependency without a stated justification.
- Interactive controls ≥44px, semantic HTML, `:focus-visible` for keyboard outlines.
- Any new async surface handles loading, success, error, and empty, with no `catch` returning a success-shaped fallback.
