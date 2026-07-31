# Rules engine — geometry, validation, scoring and turn loop (SCRUM-2)

## Links

- Plan: `.claude/contract/SCRUM-2-rules-engine/plan.md`
- Ticket: https://amazerbeam.atlassian.net/browse/SCRUM-2

## Summary of the change

Builds the complete String Railway rules engine as pure TypeScript under `src/rules/`, with two supporting modules under `src/constants/` and one widened ESLint glob. No React component, no SVG, no rendering — this is the engine the UI stories (SCRUM-4 onward) will render and dispatch against.

**Created — production:**

- `src/constants/game.ts` — `PATH_KIND`, `TURN_PHASE`, `MOVE_KIND`, `REJECTION_REASON`, `STATION_REJECTION_REASON`, `SKIP_REASON`
- `src/constants/stations.ts` — `STATION_TYPE` and the §8 printed card values/flags for all 10 station types
- `src/rules/types.ts` — the §10 data model: `GameState`, `ColourSeat`, `StationCard`, `PlacedStation`, `PlacedPath`, `Move`, plus branded `ColourId` / `PlayerId` / `StationId` / `PathId` and their `as*` constructors
- `src/rules/config.ts` — the injected `RulesConfig` shape (type only — no values ship here)
- `src/rules/geometry.ts` — §10.1 path-against-path: `arcLength`, `selfIntersects`, `crossings`, `segmentsCrossTransversally`, the `EPSILON` constant
- `src/rules/containment.ts` — §10.1 rect predicates: `touchesRect`, `rectsOverlapOrTouch`, `rectFullyInside`, `pathFullyInside`, `pointInAnyRect`, `entryCount`, `passesThrough`, `endsOn`
- `src/rules/validate.ts` — the ten §10.2 checks in reject order (`validateStringPlacement`) plus the §5.2 station constraints (`validateStationPlacement`)
- `src/rules/scoring.ts` — §10.3 resolution (`resolveScoring`, `applyScoring`) returning an itemised `ScoringBreakdown`
- `src/rules/search.ts` — the bounded legal-placement search backing M4 and M9 (`hasLegalStationPlacement`, `hasAnyLegalStringPlacement`)
- `src/rules/turn.ts` — the §10.4 loop as resumable state transitions (`beginStationStep`, `commitStationPlacement`, `advanceTurn`, `isGameOver`)
- `src/rules/gameEnd.ts` — per-colour and per-owner standings with shared ties (`finalStandings`)
- `src/rules/reducer.ts` — `(state, move) => state` and the move log (`gameReducer`)

**Created — test:**

- `src/rules/__tests__/fixtures.ts` — shared synthetic `GameState`/`ColourSeat`/`PlacedStation`/`StationCard`/`PlacedPath` builders and `TEST_CONFIG`
- Nine spec files: `stations.test.ts`, `geometry.test.ts`, `containment.test.ts`, `validate.test.ts`, `scoring.test.ts`, `search.test.ts`, `turn.test.ts`, `gameEnd.test.ts`, `reducer.test.ts`

**Modified:**

- `eslint.config.js:26` — the purity override's `files` glob widened from `['src/rules/**/*.{ts,tsx}']` to `['src/rules/**/*.{ts,tsx}', 'src/constants/**/*.{ts,tsx}']`, so the DOM/React import ban covers `src/constants/` now that `src/rules/` imports station definitions from it. No rule body changed.

Also added in a post-review fix pass: two `commitStationPlacement` test cases in `turn.test.ts` closing an M11 (mountain-containment) coverage gap flagged independently by two reviewers — see "Known limitations" note 5 and the test list below.

## Decisions the developer must make

1. **The three unchosen M2 values in `rules.json`** — `shortStringLength`, `longStringLength`, `cardSize`. This story reads them only through the injected `RulesConfig`; nothing in production source has a value for any of them. §3 of the rulebook suggests 350 / 700 / 120, but SCRUM-3a owns actually putting numbers in `rules.json`. Test fixtures use synthetic numbers (400 / 800 / 20) that preserve ratios, not the real board.
2. **Whether `tangencyTolerance: 0.5` survives contact with play.** Chosen 2026-07-31 on reasoning about card width (~0.4% of a card, above any plausible intentional placement, below anything visible) — not validated against an actual drag. If placements that look plainly legal start being rejected with `DEGENERATE_TANGENCY`, this is the value to move first. It now governs two different relationships (near-a-card and near-a-string — see limitation 4 below), which is a reason it might eventually want to split into two tunables.
3. **Whether M12 (Railyard repeats at grey on every later connection) and M13 (Landmark/Depot fire on every scoring event, not just first connections) are the right readings of an ambiguous rulebook.** Both are hard-implemented and both are medium-confidence inventions. Disagreement in play is a §14 tuning signal, not evidence of a code defect — but overturning either reading is a design call, not something a reviewer or this engine can settle.

## What can only be judged by playing

Nothing in this story renders. **None of it has been seen on a board.** The page-7 worked example (§5.4) is verified against synthetic geometry chosen to preserve that example's topology — a mountain loop, a Scenic station inside it, a first connection, two mountain crossings, one on-card crossing — and asserts the net `+3`. That proves the resolution rules are internally consistent; it does not prove a generated board (SCRUM-4) will produce anything like that shape, and it says nothing about whether the M6 fixed-length drag, the M4/M9 search bounds, or the marker triggers feel right in a real hotseat game.

## Verification results (final round)

- `npm run typecheck` — PASS, exit 0, zero errors
- `npm run lint` — PASS, exit 0, zero errors and zero warnings
- `npm run format:check` — PASS, "All matched files use Prettier code style!"
- `npm test` — PASS, `Test Files 10 passed (10)` / `Tests 141 passed (141)` (139 from the round-2 QA pass, plus 2 added afterward — see below; **those 2 have not been through a reviewer pass**)
- `npm run build` — PASS, exit 0, `dist/` written (196.72 kB JS, gzip 62.12 kB; 2.38 kB CSS), no bundler errors
- All 15 ticket acceptance criteria MET with cited evidence (see `tasks.md` → Self-review for the criterion-to-task trace)
- Boundary grep: zero `react` / `window.` / `document.` / `localStorage` hits under `src/rules/` and `src/constants/`
- Colour-first grep: `PlayerId` appears only in `types.ts`, `gameEnd.ts`, and `scoring.ts`'s `sameOwner` seat lookup; zero hits in `validate.ts`, `turn.ts`, `search.ts`, `containment.ts`, `reducer.ts`
- Hard-coded tunable grep: zero hits in production source

### The two tests added after round 2

`turn.test.ts`'s `commitStationPlacement` describe block gained two cases: a station rect placed fully inside a real `MOUNTAIN` polyline (built with the `makePath` fixture, not with `insideMountain` set on the input) asserting the committed `PlacedStation.insideMountain` is `true`, and the same shape placed outside the mountain asserting `false`. These close a gap the Code-Evaluator and QA both raised independently: once `scoring.ts`'s duplicate containment check was removed so that `turn.ts`'s `commitStationPlacement` became the sole writer of `insideMountain`, no test exercised that computation directly — the two `scoring.test.ts` fixtures that used to cover it set the field directly on the input and bypass the calculation. **These two tests were written test-only, with no further code review round** — flag them for a look in the next pass along with everything else in this PR.

## A note for future contributors

Three conventions are new here and worth carrying forward: branded id types (`ColourId`, `PlayerId`, `StationId`, `PathId`) constructed only through their `as*` helper (`asColourId`, etc.) in `types.ts`, so a `PlayerId` can never be passed where a `ColourId` is expected without an explicit, greppable cast; `ColourId`-keyed `Map`s (e.g. `PlacedStation.connections`) in preference to `Record`s, because a branded key does not survive as an object property key but does survive on a `Map`, and `Map` iteration is insertion-ordered where object-key order is a determinism hazard; and the ESLint purity override (`eslint.config.js`) now guards `src/constants/**` as well as `src/rules/**` — anything added under either tree that imports React or a DOM global fails lint, not just review.

## Known limitations to disclose

1. **`hasAnyLegalStringPlacement` is not false-negative-safe.** It enumerates every unordered station pair × each string kind in supply × up to 3 candidate paths (a straight segment, plus two symmetric closed-form single-bend detours). A board where both bend directions are blocked but a more elaborate zig-zag would fit produces a false M9 forfeit — a player loses their string placement when a legal move existed, with no error and no log entry distinguishing it from a genuine forfeit. Deliberately left unchanged; whether to make the search more exhaustive is a design decision, not a bug fix.
2. **§10.2 check 10's crossing exemption is per path *pair*, not per location.** If the new path crosses an existing path transversally anywhere, the whole pair is exempted from the tangency test — so a path can cross a mountain boundary once and then run parallel to it within `tangencyTolerance` for a long stretch without rejection. The Defender demonstrated this is reachable today with a 3-point path (cross at `(250,0)`, then hug at 0.3–0.4 units offset for 950 units). This under-rejects; it does not corrupt scoring, since `resolveScoring` counts the genuine crossing correctly regardless.
3. **Check 10 has no exemption for two paths meeting at a shared station.** Check 5 *requires* a new string to touch the colour's own network at a shared card, so two strings converging on one hub station can sit within `tangencyTolerance` of each other near that card without crossing — and would be rejected `DEGENERATE_TANGENCY`, blocking a legal move. Untested, and whether it bites depends on `cardSize` versus `tangencyTolerance`, both still unchosen (see decision 1 above). This is the more serious of the two check-10 gaps, because it over-rejects rather than under-rejects.
4. **`tangencyTolerance: 0.5`'s blast radius grew.** It now governs two different geometric relationships — near-a-card (`touchesRect`) and near-a-string (`touchesPath`) — so one number tunes both. The developer may eventually want two separate tunables for these.
5. **`PlacedStation.insideMountain` is a cross-story contract for SCRUM-4.** `scoring.ts` trusts the field; `turn.ts`'s `commitStationPlacement` is the only writer. Any `PlacedStation` that SCRUM-4's generator constructs directly into the initial `GameState` — notably each seat's starting station, which setup places rather than the turn loop — must set `insideMountain` itself by testing against the mountain path. If it defaults to `false` for a station genuinely inside the mountain, the Scenic bonus silently never fires: no error, no failing test, just a quietly wrong score. State this as an invariant SCRUM-4 must honour.
6. **The mid-chain Rural skip is not logged.** `applyPlaceStation` discards `beginStationStep`'s `outcome.skipped` on a post-Rural recycle-to-skip, so the move log cannot distinguish "the Rural extra draw placed a station" from "the Rural extra draw was wasted". SCRUM-7 will have no data source for narrating that. Fixing it needs a new `GameState` field, beyond this contract's plan.
7. **`beginStationStep` throws** when a marker-starved seat faces a deck whose remaining cards all require a marker. That replaced an unbounded loop that would have hung the main thread. A throw was chosen over a new `SkipReason` because a new skip reason would be a player-visible turn outcome present in neither §10.4 nor §14 — i.e. a game rule, which is the developer's call. If graceful degradation to a skipped station step is preferred, that is a decision to record in §14.
8. **`PlacedStation.connections`'s stored count has no reader** — legality and scoring both use `.has()` / `.keys()`. Harmless, but it is unused data.
9. **The `Move` union is not yet persisted anywhere**, so renaming a move kind or field is still free. That window closes the moment SCRUM-3 or SCRUM-7 writes a move log, after which any change needs a migration. If a different move granularity is preferred — e.g. one move per turn rather than five — now is the cheap moment to say so.

### Two deliberate deviations from `plan.md`'s data shapes

- `ConnectionLine`, `CrossingLine`, `MarkerEffectLine` and `ScoringBreakdown` live in `src/rules/types.ts`, not `scoring.ts` (which re-exports them), because `GameState.lastScoring` references `ScoringBreakdown` and declaring them in `scoring.ts` would have been a circular import.
- `geometry.ts`'s epsilon side-test normalises the cross product by segment length rather than comparing a raw signed area, because a raw area test scales with the other segment's length and misclassifies a sub-`EPSILON` deviation. `containment.ts`'s `pointOnSegment` was brought into line with the same normalisation during the fix pass.

## File sizes

Measured with `(Get-Content <file>).Count`, not `(Get-Content <file> | Measure-Object -Line).Lines` — the latter is what `CLAUDE.md` and the `react-frontend` skill prescribe, but it undercounts by the file's blank-line count and should not be relied on for the 400-line gate:

| File | Lines |
|---|---|
| `containment.ts` | 370 |
| `search.ts` | 301 |
| `turn.ts` | 246 |
| `reducer.ts` | 237 |
| `validate.ts` | 212 |
| `scoring.ts` | 201 |
| `types.ts` | 160 |
| `stations.ts` | 126 |
| `geometry.ts` | 116 |
| `gameEnd.ts` | 64 |
| `game.ts` | 49 |
| `config.ts` | 17 |

All under the 400-line blocking budget. `containment.ts` at 370 has effectively no headroom left — the next predicate added there should go in a new module instead.
