# Web project layout, runners, and developer-owned work

The canonical statement of **where code lives**, **how to verify it**, and **what only the developer can do**. `/fb-plan` reads it to write runnable `Run:` steps; `/fb-apply` and the four agents read it instead of carrying their own copies of the paths.

Change a path or a command **here only**. A runner stated in five files gets updated in four.

**Conventions are not here.** How to write the code — the `src/rules/` purity contract, colour-first keying, the drag hot path, tunables, component budgets, testing posture — belongs to `.claude/skills/react-frontend/SKILL.md` and its `references/engineering-standards.md`. This file owns paths, commands, and the traps that decide whether a *verification* is trustworthy.

> **Status: scaffolded.** SCRUM-8 has landed. The layout and script names below are the ones SCRUM-8 actually created, and `react-frontend/SKILL.md` documents the same. **`package.json` remains the authority on script names** — Read it before writing a `Run:` step. Correct anything wrong *here*, and the whole pipeline follows.

## Layout

```
<repo root>/
  package.json            scripts + the two runtime deps (react, react-dom)
  package-lock.json       committed, machine-written — regenerate, never hand-edit
  tsconfig.json           strict mode on
  vite.config.ts          Vite + Vitest config
  eslint.config.js        includes the src/rules/ import-boundary rule
  index.html              Vite entry
  public/                 static assets served verbatim; the only tree copied into dist/
    rules.json            M2 geometry constants + M17 deck composition — the tuning surface
  .gitignore              node_modules, dist, local env files, build caches
  .gitattributes          text=auto eol=lf — Windows working tree, Ubuntu CI
  .nvmrc                  the single source of the Node version (SCRUM-9)
  .github/workflows/      ci.yml — install, lint, typecheck, test, build
  src/
    rules/                pure TypeScript — zero React, zero DOM
      __tests__/          Vitest specs for the rules engine
    ui/                   React components
    constants/            UPPER_SNAKE_CASE maps of fixed-meaning values
    styles/               plain CSS
    App.tsx  main.tsx     reducer owner and Vite mount point
  node_modules/  dist/  coverage/     GENERATED — never an edit target
```

- `src/rules/**` is the only tree where game logic belongs; `src/rules/__tests__/**` is where its tests belong. A test for pure logic that lives anywhere else is misplaced.
- `node_modules/`, `dist/`, `coverage/`, and any `*.tsbuildinfo` are generated. Never plan an edit to them and never treat one as evidence of source state. Vite's cache is `node_modules/.vite`, not a repo-root `.vite/` — the `node_modules` ignore already covers it.
- **`package-lock.json` is not generated garbage.** It is committed and it pins the dependency tree, so it must not be hand-edited — but it also must not be ignored: it changes whenever `package.json` dependencies change, and that change belongs in the same task.
- `rules.json` is **data, not code**. It is the tuning surface the prototype exists to exercise. Changing a value in it is a design decision (see Developer-owned work).

## The `src/rules/` boundary

The one architectural constraint the whole epic rests on (SCRUM-8 criterion 4): nothing under `src/rules/` may import `react`, `react-dom`, or touch a DOM global (`window`, `document`, `navigator`, `localStorage`).

This is **enforced, not documented** — the `eslint.config.js` override on `src/rules/**/*.{ts,tsx}` combines `no-restricted-imports` (react, react-dom) with `no-restricted-globals`, and `npm run build` runs `npm run lint` before compiling. That matters for planning in the same way an `.asmdef` reference did in a Unity project: it is a real gate that fails a build, so a task that would cross the boundary is not a style disagreement, it is a task that cannot pass.

Two things the rule does **not** do, both of which review has to cover:

- **`no-restricted-globals` matches named globals only, and the list is not exhaustive.** It denies `window`, `document`, `navigator`, `localStorage`, `fetch`, `sessionStorage`, `location`, `history`, `XMLHttpRequest`, `requestAnimationFrame`, `cancelAnimationFrame`, `alert`, `confirm`, `matchMedia`, `getComputedStyle`, `Image`, and `Worker`. `globals.browser` holds 200+ more — `WebSocket`, `ResizeObserver`, `IntersectionObserver`, `MutationObserver`, `postMessage`, `customElements`, `indexedDB` all pass lint today, and none needs an `import`, so `no-restricted-imports` will not catch them either. Adding a name to the denylist is the fix when one turns up; treat the boundary as review-enforced too, not lint-enforced alone.
- **The override never removes `globals.browser`.** It must not: `no-restricted-globals` only fires on globals ESLint has been told exist, and `typescript-eslint`'s recommended config switches `no-undef` off. Stripping the browser globals would silently disable the rule rather than tighten it. Likewise, `tsconfig.app.json` includes the `DOM` lib across all of `src`, so `window` type-checks fine under `src/rules/` — ESLint is the only real gate.

**A `.tsx` file anywhere under `src/rules/` is itself a violation.** Pure logic has no JSX. The override globs `{ts,tsx}` so such a file is still linted, but the extension alone is the smell.

Verify it directly when a change touches `src/rules/`:

```powershell
Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage"
```

Expected: zero hits. A hit inside `__tests__/` is the same violation — a rules test that needs the DOM means the logic under test is not pure.

## Verification commands

Commands run in **PowerShell on Windows**. Chain with `;`, never `&&`. Use backslash paths for filesystem arguments; npm script names and Vitest path filters use forward slashes.

Node and npm are on `PATH`. There is no machine-specific executable to configure — nothing here needs an `$env:` variable.

| To verify | Command |
|---|---|
| Dependencies are installed | `Get-ChildItem node_modules -ErrorAction SilentlyContinue \| Select-Object -First 1` |
| Install from the lockfile | `npm ci` |
| Install after a `package.json` dependency change | `npm install` |
| **Types are sound (the fast gate)** | `npm run typecheck` |
| Lint is clean | `npm run lint` |
| Formatting is clean | `npm run format:check` — confirm the script exists in `package.json` first |
| Full test suite | `npm test` |
| One test file | `npx vitest run src/rules/__tests__/geometry.test.ts` |
| One test or describe block by name | `npx vitest run -t "counts each crossing separately"` |
| Production build | `npm run build` |
| A file exists | `Get-ChildItem <path>` |
| A pattern is gone | `Select-String -Path <glob> -Pattern "<pattern>"` → Expected: zero hits |
| A file's line count | `(Get-Content <path> \| Measure-Object -Line).Lines` |
| Invoke git (**not on `PATH`**) | `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git <args>` |
| The working tree is clean | `git status --porcelain` → Expected: no output |
| What CI will run | `npm ci; npm run lint; npm run typecheck; npm test; npm run build` |

`npm run typecheck` is the fast gate: it type-checks without emitting and takes a second or two. Prefer it over `npm run build` for "does this compile" — the build is a Final-verification concern.

Git is installed at `C:\Program Files\Git\cmd\git.exe` (2.55.0) but is **not on this shell's `PATH`**, and PowerShell shell state does not persist between tool calls — so every git step must prepend the path itself. `init.defaultBranch` is `master` on this machine, so always pass `-b main` to `git init`.

The five commands in the last row are exactly what `.github/workflows/ci.yml` runs. A clean local pass therefore predicts a green CI run; it does not prove the workflow's Actions schema is valid, which only a push can.

### Hard constraints on runners

- **Vitest defaults to watch mode and will hang forever.** This is the single most common way to stall this pipeline. Always run `vitest run` (the `run` subcommand), never bare `vitest`. If `npm test` is wired to watch, use `npm test -- --run` or `npx vitest run`. A test command that has produced no output for a minute is watch mode, not a slow suite.
- **`npm run dev` never terminates.** It is a server. Never invoke it as a foreground command — it will consume the whole timeout and return nothing useful. Nobody in this pipeline needs it: verification is `typecheck` / `lint` / `test` / `build`. If a human needs to *look* at something, that is developer-owned work and they start the server themselves.
- **Pass/fail is the exit code plus stdout.** There is no results file to parse. `0` means everything passed; Vitest prints a `Tests  N passed` summary line. Quote it.
- **`Select-String` reports one match per physical line, and a bundled asset is one line.** Grepping `dist/assets/*.js` for `"A|B"` surfaces whichever alternative appears first and looks like proof that only A is present. Any check that must prove *two* strings shipped needs `-AllMatches`, two separate greps, or a raw `-match` against `Get-Content -Raw`. This bit the SCRUM-8 closing phase and read as a missing string rather than a grep artefact.
- **A TypeScript error inside a test file is not a failing test.** Vitest reports it as a collection/transform error and the file's tests never run. Read the output for "Failed to load" or "Transform failed" before concluding anything about coverage.
- **Missing `node_modules` is not a code defect.** It surfaces as `'vite' is not recognized`, `Cannot find module`, or `npm ERR! Missing script`. Run `npm ci` and re-run; do not "fix" source in response.
- **`npm run lint` and `npm run typecheck` are required gates, and they exist.** Unlike a Unity project, this stack has real static analysis wired up — every contract touching `.ts`/`.tsx` plans both. Never skip them, and never record them as `N/A` while TypeScript files are in the diff.
- **Nothing holds an exclusive lock.** Several commands can run concurrently and the developer having the app open in a browser breaks nothing. There is no equivalent of the Unity Editor lock.
- **Unfiltered full-suite runs (`npm test`, `npm run build`) belong only to QA** in the closing `Final verification` phase. The Implementer runs path- or name-scoped Vitest runs and `npm run typecheck`.

## Developer-owned work

Some work cannot be done by an agent, because the answer lives in a human's eyes and hands. **Never dispatch these to the Implementer and never fabricate the outcome.**

The Implementer writes the code; the developer judges it:

- **Whether the fixed-length drag feels right** (M6). Latency, weight, whether laying a string is satisfying or fiddly. This is the question the prototype exists to answer; no test can answer it.
- **Whether the game is any good** — pacing over five turns, whether the geometry constants (M2) make a tight puzzle or a cramped one.
- **Changing a tunable in `rules.json`.** Reading it is code's job; deciding its value is a design call, informed by play-testing and by §12's symptom-to-cause table. An agent may not invent a tuning change.
- **Replacing M17 with the real deck composition** — that means counting the physical cards.
- **Resolving a rulebook ambiguity, or overturning a `[MADE UP — M#]` decision.** A design call, raised rather than coded around. `.docs/Game_Rules/Rules.md` is the specification: it is not edited to match the code.
- **Approving a new dependency.** Two runtime deps is deliberate. A third needs a stated justification and a yes.
- **Visual judgement** — layout, readability, colour contrast by eye, whether a coaching message lands at the right moment.
- **Anything requiring the running app**: they run `npm run dev` themselves and look.
- **Creating the GitHub repository, adding the remote, and pushing.** Pushing publishes content to a remote — an outward-facing action that stays the developer's call, and one an agent must never take on its own initiative even though a credential helper happens to be configured on this machine. No `gh` CLI is installed, so repository creation is not available to an agent at all. Reading the result of a CI run is developer work for the same reason. Authoring `.github/workflows/ci.yml`, initialising the repository, verifying ignore rules, and committing are **agent** work — SCRUM-9 asked for them. An agent may run `git init`, `add`, `commit`, `status`, `check-ignore`, `check-attr`, `ls-files`, and `log`; it may not run `push`, `remote add`, `fetch`, `pull`, or `clone`.

Treat reaching one of these as a **pause condition**: stop dispatching, state precisely what the developer must do or decide, wait for their answer, then continue.

**Scaffolding is not on this list.** `npm create vite@latest . -- --template react-ts` is non-interactive and an agent can run it. Unlike a Unity project — where only the Editor could create the project — the first contract here is ordinary agent work.

## Correctness traps

These produce bugs that type-check cleanly and pass a naive review. Planning and review must account for them.

- **The `src/rules/` boundary erodes in one line.** A single `import { useMemo }` or a `window.` reference for "just this one thing" ends the purity contract, and with it the ability to unit-test the rules engine without a renderer. The lint rule catches it — do not disable the rule to land a change.
- **`rules.json` keys, storage keys, and persisted move-log fields are bound by string, outside the compiler's view.** Renaming a config key breaks a value into `undefined` at runtime; renaming a move kind or a `Move` field breaks every saved game and every stored move log. This is the closest analogue to Unity's serialized-field rename: type-safe, review-clean, and silently wrong. Grep both sides of any such rename, and change the type, the parser, the tutorial copy, and the test fixtures in the same task.
- **A hard-coded tunable defeats the whole prototype.** A literal `350` or a deck count in source *or in tutorial copy* is a defect, not a shortcut — it becomes a lie the first time §12's tuning table is acted on.
- **`PlayerId` where `ColourId` belongs.** §9 makes each colour a separate player for every limit, marker trigger, and connection map. Both are strings, so nothing catches the mix-up but a failing 2-player game. Brand the types or accept that review is the only gate.
- **`Math.random()` in setup generation destroys reproducibility.** Generation is seeded (SCRUM-4 criterion 8); a board that cannot be regenerated cannot be debugged, and a play-test conclusion drawn from it cannot be checked.
- **Floating-point epsilon is a decision, not a detail.** The ±2% arc-length tolerance (M6) is specified; the intersection epsilon is not. Name it, test it at the degenerate cases — tangency, a grazed card edge, a crossing exactly on a boundary — and do not tune it later by feel.
- **`NaN` propagates silently.** One division by a zero-length segment poisons a coordinate, and the string renders nowhere with no error. Guard the divisor, not the symptom.
- **Every listener and observer needs its cleanup.** A `pointermove` handler, `addEventListener`, `requestAnimationFrame`, `setInterval`, `ResizeObserver`, or `AbortController` created in an effect must be released in that effect's cleanup. An orphan leaks *and* double-fires after the next mount — the direct analogue of an unmatched `+=`.
- **React StrictMode mounts effects twice in development.** A non-idempotent effect (appending a node, pushing to a module array, starting a second timer) breaks only in dev, or reveals a cleanup you never wrote. Neither symptom appears in a test.
- **Module-level mutable state survives.** A `let` at module scope persists across HMR updates and across every test in the same file, so a test that passes alone fails in the suite. Same failure shape as an un-reset static; same fix — reset it explicitly, or don't have it.
- **The ref-mutated drag bypasses React by design, and that is a contract.** The in-progress path's `d` attribute is written directly; committed state still flows through the reducer. Mutating anything *else* through a ref makes the DOM and `GameState` diverge, and the board becomes untrustworthy exactly when you are trying to judge a rule.
- **Stale closures in pointer handlers.** A handler registered once and holding the first render's `state` will validate a placement against a board three turns old. Read live state through a ref, or re-register with the right deps — and never silence the exhaustive-deps rule to make it quiet.
- **Other string-bound names the compiler ignores:** `data-testid` values, CSS class names, SVG element and `aria-*` ids, and the rejection reason codes surfaced to the UI. Grep both sides of any rename that touches one.
