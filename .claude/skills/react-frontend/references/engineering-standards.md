# Engineering Standards — Reference (String Railway)

General React/TypeScript engineering standards that apply regardless of feature. Read once, internalize, return when scaffolding something new or reviewing a large change.

**Not here:** String Railway specifics — the `src/rules/` boundary, colour-first keying, geometry traps, the drag hot path, tutorial copy rules. Those live in `SKILL.md`, along with the MUST/NEVER contract. This file is the rationale and the detail.

## Engineering principles

Optimise every implementation for, in order:

1. Readability over cleverness
2. Simplicity over abstraction
3. Consistency over personal preference
4. Maintainability over speed of implementation
5. Reusability over duplication
6. Predictability over complexity

Before calling a change done, answer:

- Will another developer understand this in six months?
- Is this the simplest solution that solves the problem?
- Does it align with existing patterns in this codebase?
- Can it be easily tested and maintained?

Code is read far more often than it is written. The goal is an app that stays simple, consistent and reliable as it grows — not a sophisticated one.

This matters more than usual here. The prototype exists to answer a design question — whether the fixed-length string drag (M6) and the geometry constants (M2) make a good game. Code that obscures the rules makes that question harder to answer, which defeats the point of building it.

## Component size budget

| Lines | Verdict |
|---|---|
| < 200 | fine |
| 200–400 | needs a second look — is there a hook or a sibling component hiding in here? |
| > 400 | **blocking** — split it in the same change |

Measure, don't estimate. Before declaring the work done:

```powershell
(Get-Content <file> | Measure-Object -Line).Lines
```

A file over 400 lines is not a review note for a human to catch later — split it now. Extract logic into a `use*` hook; extract per-concern render blocks into sibling components in the same folder.

No current offenders — the application is unstarted. The two files most likely to breach it first are `ui/Board.tsx` and `ui/StringDrag.tsx`; both attract mixed concerns quickly. In `src/rules/`, prefer splitting by predicate family (`geometry.ts` vs `validate.ts` vs `scoring.ts`) over one large module.

## Component file order

One order, every file:

```
imports → constants → component → helper functions → default export
```

Helpers that don't touch component state belong below the component (or in `src/rules/` if they are game logic, `src/utils/` if they are genuinely generic). Constants belong above it, not inline in JSX.

## One component, one responsibility

- Components render UI. Hooks hold logic. When a component body starts computing, aggregating or sequencing, that logic wants to be a `use*` hook.
- **Components never adjudicate rules.** Asking `src/rules/` whether a placement is legal is correct; deciding it in a component is not. This is the single most important application of the principle in this project.
- Custom hooks take **declarative props** and return values. A hook returning an imperative setter meant to be called during render forces `useRef` + force-render workarounds and is an infinite-loop trap with `useState`.
- Hooks are called at the top level of a component or another `use*` hook — never in a loop, condition, nested function, or a plain non-React function.

## Prefer duplication over premature abstraction

Shared abstractions should emerge from proven reuse, not anticipation. Keep code next to the feature it serves; promote to a shared location only once a second real consumer exists.

Never create dumping-ground folders: `misc`, `helpers`, `temp`, `old`, `new`. If a name doesn't say what's inside, it will collect everything.

## Constants, enumeration and tunables

Two distinct categories in this project, and conflating them is a defect.

**Constants** — values with fixed meaning that appear more than once. Magic strings and numbers are a primary source of silent defects: a typo in a literal fails at runtime, in one branch, quietly.

```ts
export const STATION_TYPE = {
  HAMLET:   'hamlet',
  VILLAGE:  'village',
  TOWN:     'town',
  SCENIC:   'scenic',
  RURAL:    'rural',
  TERMINUS: 'terminus',
  RAILYARD: 'railyard',
  LANDMARK: 'landmark',
  DEPOT:    'depot',
  STARTING: 'starting',
} as const
```

`UPPER_SNAKE_CASE` keys, one exported map, imported everywhere. Categories that always get this treatment: station types, path kinds, rejection reason codes from the §10.2 validation order, move kinds, storage keys, debug-panel toggles.

**Tunables** — values the design is still deciding. These go in `rules.json`, never in `src/constants/` and never as literals: border perimeter, per-player-count edge lengths, card footprint, short and long string lengths, mountain and river lengths, arc-length tolerance, deck composition. They are M2 and M17, both marked Low confidence, and §12 of the rulebook is a symptom-to-cause table that only works if they can be changed without a code edit.

The distinction: a station type will never change value. A string length will change repeatedly, and the first time it does, every hard-coded `350` becomes wrong — including in tutorial copy.

## Four async states

Every asynchronous surface has **four** states, not two:

| State | Requirement |
|---|---|
| loading | a visible indicator — never a frozen or blank UI |
| success | the data |
| error | a human-readable message, never a raw stack trace or a blank screen |
| empty | distinct from loading and from error |

The async surface here is small — `rules.json` at startup, and whatever the deployed build fetches. That makes it tempting to skip. Don't: a silently failed config load means playing a differently-tuned game than you think you are, which corrupts every play-test conclusion drawn from that session.

## Data loading and resilience

- **Validate `rules.json` on load.** Deck counts summing to the expected total, positive lengths, long string longer than short. A malformed config produces a clear startup error, not a silently broken board.
- **Never swallow an error into a success shape.** `catch { return DEFAULTS }` on a config load is the worst version of this — it plays a game with constants nobody chose and reports nothing.
- **Distinguish "failed to load" from "loaded and empty."** They need different copy and different recovery.
- **The config is read once.** A mid-game edit does not apply. Say so in the debug panel rather than letting a play-tester believe a change took effect.
- **No HTTP client, no server calls.** If a change appears to need one, that is a scope question for the epic, not an implementation detail.

## Performance — priority order

Work in this order; stop when the problem is solved:

1. **Keep the drag off the reconciler.** The in-progress string path grows every pointer move; mutate its `d` attribute through a ref and dispatch one move on release.
2. **Make crossing detection incremental.** Test the newest segment against existing paths, not the whole path every frame.
3. **Bound the legal-placement search.** Asking whether *any* legal position exists for a drawn card is a board-wide search. Sample at card-width granularity, refine near hits.
4. **Only then minimise re-renders** — first by placing state at the right level, and only after that by memoising.

Anti-patterns: heavy calculation inside render, fresh anonymous functions passed to memoised children, re-rendering the whole board when only the drag changed, and **excessive memoisation** — `memo` / `useMemo` / `useCallback` added without profiling evidence is itself an anti-pattern, adding cost and noise for no measured gain.

## State placement

| State | Where |
|---|---|
| Game state — board, seats, deck, scores, turn | the single `useReducer` over `GameState` |
| Local UI — panel open/closed, hover, drag in progress | `useState` (or a ref) in the component |
| Derived values | computed from `GameState`, never stored alongside it |

Own state at the lowest level that works. Lift only when genuinely shared.

**One sanctioned store: the reducer.** No Redux, no Zustand, no MobX, no second `useReducer` holding a parallel copy of game state. Context may inject the reducer's state and dispatch to avoid prop drilling; it never owns game state itself.

Derived state is the trap to watch. Anything computable from `GameState` — connected station sets, reachability, current scores — is computed, not stored. A stored duplicate will drift, and in this project a drifted copy means the rules are being applied to a stale board.

## Security

- Validate and sanitise any user-supplied input at the boundary. The prototype's surface is small — a seed field and a config file — but a seed is still input.
- `dangerouslySetInnerHTML` needs an explicit, reviewed justification. Default answer is no. Tutorial copy is authored content and still does not need it.
- Never commit API keys, credentials, or secrets. Client-side env vars are public by definition — anything in `VITE_*` is shipped to the browser. This project should need none.

## Logging

- No `console.log` / `console.debug` in shipped code. Current debt: none.
- Errors that *are* logged must be actionable — include enough context (which predicate, which seed, which move) to diagnose without a repro. A seed plus a move log reproduces any situation exactly; log those rather than a snapshot.

## Testing

Vitest is wired and `src/rules/` needs no DOM to test. That changes the posture from the usual "state what you verified manually" — here, **run the tests and report the result**.

- **Never claim a test passed without running it.** Run `npm test`, and say what passed and what you did not cover.
- **Coverage is risk-based, deepest where the bugs are.** §11 of the rulebook is explicit that the geometry predicates are where bugs will live. Order: geometry predicates → validation ordering → scoring resolution → turn loop → presentational components last.
- **The page-7 worked example (§5.4) is the canonical scoring test.** +3 for a Scenic station inside the mountain, +2 for another first connection, −1 −1 for two mountain crossings, 0 for an on-card crossing, net +3. It stays green.
- **Cover the degenerate geometry cases explicitly** — tangency that does not cross, a path grazing a station edge twice in one pass, a crossing exactly on a card boundary. These are where an epsilon choice shows up as a wrong score.
- **Cover the §9 same-owner trigger.** One colour scoring at its own owner's other colour's Landmark must still fire the penalty. It is the assertion that proves the engine is colour-first.
- **Test behaviour, not implementation.** For components, query through accessible roles and labels (`getByRole`, `getByLabelText`) — those queries double as an accessibility audit, so a component that is hard to query is usually hard to use with a screen reader.
- **A seeded board makes a test reproducible.** Pass a fixed seed rather than asserting against whatever generation produced.

## Dependencies

Two runtime dependencies: `react` and `react-dom`. That is a feature, not an accident. No router, no HTTP client, no geometry library, no state manager, no UI kit.

The geometry library omission is deliberate rather than austere: the project needs transversal-only intersection with a controlled epsilon (M8), and general-purpose libraries do not distinguish tangency from crossing in a way this game can rely on. Hand-rolled predicates are roughly 300 lines and fully testable.

Before adding a dependency, justify it: what existing code or platform API could do this, bundle-size cost, maintenance activity, security surface, and whether it is still supportable in two years. A 20-line utility beats a transitive dependency tree. Say the justification out loud in the change summary — don't add one silently.

## Definition of Done

A change is done when:

- Functionality works, verified by actually exercising it (or explicitly stated as unverified and why).
- `npm test` and `npm run typecheck` both pass, and you say so having run them.
- `src/rules/` still imports no React and touches no DOM.
- No `PlayerId` has entered a limit check or marker trigger.
- No tunable is hard-coded — in source or in tutorial copy.
- All four async states are handled on any new async surface.
- Accessibility is satisfied: keyboard reachable where a keyboard equivalent exists, semantic elements, ARIA on icon-only controls, ≥44px targets, AA contrast. Where no keyboard equivalent exists — notably the freehand drag — that gap is stated, not hidden.
- Errors are handled — no blank screens, no raw stack traces, no swallowed failures.
- No file left over 400 lines; no new `console.log`; no new magic string that should be a constant.
- The summary states: what changed, why this approach, what was verified and how, what wasn't verified, and any known risk or debt.

## Change size and debt

- Smaller incremental changes beat one giant change. Past ~500 lines of diff, flag it explicitly and say why it couldn't be split.
- Leave the code better than you found it — readability, duplication, naming, dead code.
- **Never knowingly introduce technical debt silently.** If a shortcut is the right call, say so in the summary so it's a decision, not a surprise.
- **Distinguish debt from a tuning decision.** Changing a value in `rules.json` because the game felt wrong is the intended workflow, not debt. Hard-coding that value so it cannot be changed again is debt.
