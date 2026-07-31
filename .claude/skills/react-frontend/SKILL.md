---
name: react-frontend
description: Apply String Railway React 19 + Vite + TypeScript conventions for the SVG board, the fixed-length string drag, the pure-TypeScript rules engine, config-driven tuning constants, and Vitest coverage. Use when building or editing anything under src/rules/ or src/ui/, wiring the game reducer, rendering the board, implementing placement or scoring UI, adding tutorial coaching, or reviewing a frontend change in the String Railway prototype.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  type: reference
---

# React Frontend (String Railway)

Conventions for the String Railway prototype — a hotseat browser implementation of the board game specified in `.docs/Game_Rules/Rules.md`. Read this before writing or editing anything under `src/`.

**Scope:** this file holds the hard contract plus String Railway specifics (the `src/rules/` boundary, colour-first keying, the drag hot path, config-driven tunables). General engineering standards — principles, component size budget, constants taxonomy, four async states, performance order, testing posture, Definition of Done — live in `references/engineering-standards.md`. Read that file when scaffolding something new, reviewing a large change, or when a rule below points at it.

**The specification is `.docs/Game_Rules/Rules.md`.** It is complete and buildable: §10 gives the data model, §10.1 the geometry predicates, §10.2 the validation order, §10.3 scoring resolution, §10.4 the turn loop. Do not invent a rule — look it up. Where the rulebook was silent, the document already made a decision and tagged it `[MADE UP — M#]`; §14 indexes all 17. Cite the M-number when your code depends on one.

## Engineering principles

Optimise for readability over cleverness, simplicity over abstraction, consistency over personal preference, maintainability over speed, reusability over duplication, predictability over complexity. Before declaring anything done: *will another developer understand this in six months, is it the simplest thing that works, does it match existing patterns here?* Code is read far more often than written.

## Hard floor (MUST / NEVER)

Everything below this section is rationale, detail, or template. These are the rules a change cannot ship without.

### MUST

- **Read the nearest existing equivalent before writing.** Match its file naming, type shape, CSS approach, and error handling.
- **Keep `src/rules/` pure.** No `react`, no `react-dom`, no DOM globals, no `window`, no `document`. It is plain TypeScript that runs under Vitest with no DOM. A lint rule or import test enforces this.
- **Key every player limit, marker trigger and connection map on `ColourId` — never `PlayerId`.** §9 makes each colour a separate player for all purposes, so 4-player and 2-player share identical code. `owner: PlayerId` exists solely for game-end score summing.
- **Route all state change through the reducer** as `(state: GameState, move: Move) => GameState`. The move log is the only history; undo and replay derive from it.
- **Adjudicate rules only in `src/rules/`.** A component may ask whether something is legal; it may never decide.
- **Read every tunable from `rules.json`** — string lengths, card size, border perimeter, tolerance, deck composition. These are M2 and M17, the two primary tuning levers.
- **Cover geometry, validation and scoring changes with Vitest.** The page-7 worked example (§5.4) is the canonical scoring test and stays green.
- **Measure every file you create or grow** (`(Get-Content <file> | Measure-Object -Line).Lines`) before declaring the work done. <200 lines fine, 200–400 needs a second look, **>400 is blocking** — split it in the same change (logic → `use*` hook, render concerns → sibling components).
- **Follow one file order:** imports → constants → component → helpers → export.
- **Extract significant logic into a `use*` hook** — components render UI, hooks hold logic.
- **Declare any repeated meaningful value once and import it** — station type keys, path kinds, rejection reason codes, storage keys. `UPPER_SNAKE_CASE` keys in `src/constants/`. Tunables belong in `rules.json`, not here.
- **Run TypeScript strict.** An `any` needs a stated reason in the summary.
- **Justify any new dependency out loud** in the change summary: what platform API or existing code could do it, bundle cost, maintenance activity.
- **State what you verified and what you did not.** There *is* a test runner — see NEVER below.

### NEVER

- **Never hard-code a tunable.** A literal `350`, `120`, `4000` or a deck count in source or in tutorial copy is a defect. It becomes a lie the first time §12's tuning table is acted on, and a tutorial that misstates the rules is worse than none (SCRUM-11 criterion 16).
- **Never let a `PlayerId` reach a limit check or a marker trigger.** That single mistake converts the 2-player variant from half a day into a refactor through every rule path.
- **Never import React into `src/rules/`,** and never reach for the DOM there.
- **Never reconcile the in-progress drag through React.** The path grows every pointer move; mutate its `d` attribute through a ref and dispatch one move on release. Committed board state is what flows through the component tree.
- **Never claim a test passed without running it.** Vitest is wired — run it and report the result, or say plainly that you did not.
- **Never swallow an error into a success shape** (`catch { return [] }`) — that turns a failed `rules.json` load into "loaded, defaults applied" and silently plays a differently-tuned game.
- **Never let an illegal placement commit.** Validation runs before state changes, and the first failure surfaces as a specific reason from the §10.2 order — not a generic rejection.
- **Never use `Math.random()` in setup generation.** Generation is seeded and reproducible (SCRUM-4 criterion 8); a board that cannot be regenerated cannot be debugged.
- **Never leave `console.log` / `console.debug` in shipped code.**
- **Never add `memo` / `useMemo` / `useCallback` without profiling evidence** — excessive memoisation is itself an anti-pattern. The drag hot path is the one place where evidence is likely to exist; get the evidence anyway.
- **Never introduce a second state manager.** The reducer *is* the store — no Redux, no Zustand, no MobX. Context may inject the reducer's state and dispatch; it never owns a parallel copy.
- **Never add a backend, an API client, or a call to a remote server.** The prototype is static files. The only fetch is `rules.json`.
- **Never create dumping-ground folders** — `misc`, `helpers`, `temp`, `old`, `new`.
- **Never use `dangerouslySetInnerHTML`** without an explicit, reviewed justification.
- **Never knowingly introduce debt silently** — if a shortcut is right, say so in the summary so it's a decision, not a surprise.

## Use when

- Adding or editing anything under `src/rules/` or `src/ui/`.
- Implementing station placement, the railway string drag, scoring display, the HUD, or tutorial coaching.
- Rendering or changing the SVG board.
- Wiring or extending the game reducer, the move log, undo, or replay.
- Reviewing a frontend change for legality-enforcement, determinism, or accessibility.

## Do not use when

- Editing `.docs/Game_Rules/Rules.md` — that is the specification. Changing a rule or an M-decision is a design call, not a code change; raise it rather than editing it to match your code.
- Jira ticket work — use the `management-jira` skill.
- Anything under `.claude/`.

## Stack (authoritative — match what's in the repo)

Verify before relying on any line here (`Read package.json`) — this section will drift.

- **React 19 + Vite 8 + TypeScript (strict).** Scaffolded from the `react-ts` template. `.ts`/`.tsx` throughout — this project *is* TypeScript, and the type system is load-bearing for the colour-versus-owner distinction.
- **Two runtime dependencies: `react` and `react-dom`.** No router (single view), no HTTP client (no server), no geometry library. Predicates are hand-rolled because the project needs *transversal-only* intersection (M8), which general libraries do not distinguish cleanly.
- **Vitest** for unit tests, run with `npm test`. No DOM needed for `src/rules/`.
- **Rendering: SVG.** Stations are `rect`, strings are `path`. Chosen over canvas for free hit-testing and devtools-inspectable geometry while debugging crossings. ~60 nodes at a full board — React handles that comfortably.
- **Styling: plain CSS** in `src/styles/` and per-component files. No CSS Modules, no CSS-in-JS, no utility framework.
- **State: one `useReducer` over `GameState`,** plus `useState` for local UI. No global store library.
- **No backend.** Static build, deployed as static files.

## Project layout

```
src/
  rules/          pure TypeScript — zero React, zero DOM
    geometry.ts   §10.1 predicates
    validate.ts   §10.2 placement checks, in order
    scoring.ts    §10.3 resolution, returns an itemised breakdown
    turn.ts       §10.4 loop
    setup.ts      M3 seeded generation
    types.ts      GameState, ColourSeat, PlacedStation, PlacedPath, Move
    __tests__/
  ui/
    Board.tsx     SVG board, renders committed state
    StringDrag.tsx  the M6 fixed-length drag (ref-mutated path)
    Hud.tsx       round, active colour, string supply, face-down scores
    Tutorial/     contextual coaching
  constants/
  styles/
  App.tsx         reducer owner, wires ui/ to rules/
public/
  rules.json    M2 geometry constants + M17 deck composition (fetched at startup)
```

Single view — no routes. If a second screen ever appears, question it before adding a router.

## Architecture rules

These six carry the design. Everything else is detail.

1. **The `src/rules/` boundary.** Game logic is pure and DOM-free so it can be unit-tested without a renderer, reasoned about without React semantics, and survive any UI rewrite. It is cheap to establish and expensive to retrofit — once a component imports a geometry helper and mutates a rect in place, the boundary is gone.

2. **Colour-first, always.** `PlacedStation.connections` and `firstConnector` are keyed on `ColourId`. Two colour-seats sharing an owner each consume their own slot against a station's player limit. In a 2-player game one owner's colour scoring at their *own other colour's* Landmark, Depot or Starting Station still fires the marker penalty — correct per §9, and it must be explained in the UI or it reads as a bug (SCRUM-7 criterion 12).

3. **One reducer, one move log.** `(state, move) => state`. Undo pops the log and replays; a saved game is a JSON array of moves. This is why the reducer exists rather than scattered `useState` — the tuning workflow means replaying the same turn a dozen times while checking whether a rule reading is right.

4. **SVG for committed state, ref mutation for the drag.** Committed board state changes rarely — once per turn — so React renders it declaratively. The in-progress path changes every pointer move, so it is one `<path>` whose `d` you write through a ref, bypassing reconciliation. Roughly twenty lines, and it is the difference between a drag that feels direct and one that feels laggy.

5. **Config-driven tunables.** `rules.json` is read once at startup and validated: counts summing to the expected deck total, positive lengths, long string longer than short. A mid-game edit does not apply — reload on new game, and say so in the UI. Document each tunable with its M-number so a play-tester knows what they are changing.

6. **No backend, deliberately.** The physical game is played by people around one table; hotseat reproduces that exactly while removing networking, accounts and sync. Keeping `src/rules/` pure means the same modules could later run server-side if remote play is ever wanted — but nothing in this prototype may assume a server exists.

## Geometry and determinism

The predicates are where the bugs will be (§11). Specific traps:

- **Crossing means transversal** (M8). A tangency that touches and returns to the same side is not a crossing. Reject degenerate tangency at placement time rather than adjudicating it.
- **Count each crossing point separately.** The page-7 example scores −2 for two crossings of one string. A boolean per path pair silently under-counts.
- **On-card crossings are free.** A crossing whose point falls inside any station rect costs nothing.
- **`entryCount` counts contiguous runs** inside a rect, not raw boundary intersections — a string grazing an edge twice in one pass entered once.
- **Arc length must equal nominal within ±2%** (M6). This is the whole game: you lay the entire string, and wiggling to reach a nearer station spends the same length as going straight.
- **State your epsilon in code.** The ±2% tolerance is specified; intersection epsilon is not. Pick one, name it, test it — do not tune it later by feel.
- **Seed everything random.** Setup generation takes a seed and is reproducible. Expose the seed in the debug panel.
- **Terrain counts as a previously placed string** for crossing penalties — the mountain is confirmed by the rulebook example, the river and border follow by M10.

## Performance — the drag is the hot path

Work in this order; stop when the problem is solved:

1. **Keep the drag off the reconciler** — ref-mutate the in-progress path (architecture rule 4).
2. **Check crossings incrementally** — test only the newest segment against existing paths, not the whole path every frame.
3. **Only then consider memoisation,** with profiling evidence.

The legal-placement search in SCRUM-5 criterion 8 is the other risk: asking whether *any* legal position exists for a card is a search over the board, not a single test. Sample at card-width granularity and refine near hits.

## Accessibility and input

- **Pointer-driven, mouse primary.** Touch and stylus are explicitly out of scope for the prototype.
- **Every interactive control ≥44×44px** — buttons, HUD affordances, the tutorial dismiss. Keep a tight visual size if the design wants it and expand the hit area with padding.
- **Use `:focus-visible`,** not bare `:focus`, so keyboard outlines do not appear on pointer clicks.
- **Wrap hover styles in `@media (hover: hover)`** and pair every hover with `:active`.
- **Add `touch-action: manipulation`** on interactive elements.
- **Semantic HTML and ARIA** — `header`, `nav`, `main`; labels on icon-only buttons; focus management in modals; WCAG AA contrast.
- **Known gap to state, not hide:** the fixed-length freehand drag has no keyboard equivalent. That is a real accessibility limitation of the prototype. Say so in the summary rather than implying parity.

## Tutorial copy

Coaching fires just-in-time on the real board, once per concept per session, and never relaxes a rule — illegal stays illegal and scores are identical (SCRUM-11 criterion 17). Every number it states is read from `rules.json` and the station definitions. If the tutorial must be trimmed, the irreducible core is placement legality, the length budget, and black-versus-grey scoring.

## Known debt

One item, carried from the SCRUM-8 scaffold (2026-07-31):

| Debt | Detail |
|---|---|
| `vite.config.ts` sets `environment: 'node'` for the whole suite | Correct today — `src/rules/` specs need no DOM, and that setting is half of what enforces purity at runtime. The first component test (`.test.tsx`, querying by accessible role) needs a DOM environment, so that story must add an environment split (`environmentMatchGlobs`, or a second Vitest project) rather than flipping the global to `jsdom` — flipping it would silently un-enforce the rules-engine boundary. The `include` glob is also `*.test.ts` only, so a `.test.tsx` is not collected until it is widened. |

Add to the table the moment something exceeds the 400-line budget, a tunable gets hard-coded, or a `console.log` ships. What to watch for first, based on where this project's pressure will come from:

| Watch for | Why |
|---|---|
| A `PlayerId` in a limit or trigger path | Breaks the 2-player variant; near-impossible to retrofit |
| A literal geometry constant in source or copy | Silently defeats the tuning workflow |
| `Board.tsx` or `StringDrag.tsx` past 400 lines | Both attract mixed concerns fast |
| Geometry helpers drifting into `src/ui/` | Erodes the testability boundary |
| Scoring returning a number rather than a breakdown | Forces rework in the scoring UI |

## Output

When implementing a change, deliver:

- The edit, matching neighbouring file conventions.
- Vitest coverage for anything under `src/rules/`, actually run, with the result reported.
- Plain CSS following the existing per-component pattern.
- A note in your end-of-turn summary covering: what changed, **why this approach**, what you verified and how (including whether `npm test` and `npm run typecheck` passed), what you could not verify, any accessibility consideration skipped, and **any known risk or debt introduced**.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.

That folder is currently empty by design, and its README names the candidate first rules — determinism and save-data versioning are the two most likely to land and both would constrain this skill's territory. Re-scan rather than assuming it is still empty.

## Success criteria

- Edit lives under `src/` and matches neighbouring file structure.
- `src/rules/` imports no React and touches no DOM (`Grep -n "from 'react'" src/rules` → no hits).
- No `PlayerId` in a limit or trigger path (`Grep -n "PlayerId" src/rules` → only the `ColourSeat.owner` declaration and game-end summing).
- No hard-coded tunable (`Grep -nE "\b(350|700|4000|120|1400)\b" src` → no hits outside `rules.json` and its types).
- No `Math.random()` in generation (`Grep -n "Math.random" src/rules` → no hits).
- No file created or grown exceeds 400 lines — measured, not estimated.
- `npm test` passes, including the page-7 scoring example; `npm run typecheck` clean.
- No new `console.log` / `console.debug` (`Grep -nE "console\.(log|debug)" src` → no hits).
- No new runtime dependency without a stated justification; no HTTP client; no server call.
- Illegal placements cannot commit, and rejections name a specific §10.2 reason.
- Interactive controls ≥44px; semantic HTML and ARIA on interactive elements; `:focus-visible` for keyboard outlines.
- Any new async surface handles loading, success, error and empty; no `catch` returning a success-shaped fallback.
