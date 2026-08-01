# SCRUM-3 + SCRUM-4 — Tuning config, debug toggles, and the New Game setup + board render

Plan: [`plan.md`](./plan.md) · Tasks: [`tasks.md`](./tasks.md) · Branch: `SCRUM-2-4`

## Why one PR closes two stories

**SCRUM-3** (tuning configuration and debug toggles) and **SCRUM-4** (New Game workflow: setup generation and board render) are mutually blocking, so splitting them would have produced two PRs neither of which could be verified:

- SCRUM-4 cannot generate a board without SCRUM-3 AC1–4 — the geometry constants, the deck composition, and a validated loader for them.
- SCRUM-3 AC5–8 (the debug panel: revealed scores, seed display and seed entry, overlays) have nothing to reveal, no seed to show, and nothing to overlay until SCRUM-4's board and seeded generator exist.

## What changed

- **`public/rules.json` is populated and validated.** Nine §3/§8.1 values now ship: `borderPerimeter`, `cardSize`, `shortStringLength`, `longStringLength`, `mountainLength`, `riverLength`, `arcLengthTolerance`, `tangencyTolerance`, and the nine-entry `deck.composition`. `parseRulesConfig` in `src/rules/config.ts` validates them on load and `describeConfigFailures` renders each failure by dotted key path; a bad or unreachable file produces a clear startup error and **never** a defaulted config.
- **Seeded generation.** `src/rules/rng.ts` (mulberry32 + `hashSeed`), `src/rules/deck.ts` (`buildDeck` from the config composition), `src/rules/setup.ts` + `src/rules/setupSamplers.ts` (`generateSetup`, `regularPolygon`, `inradius`, `sideCountFor`, `boardBounds`, the mountain/river/station samplers), and `src/rules/setupValidation.ts` (`validateSetup`, the setup-time legality gate). The same seed and player count produce a byte-identical board.
- **The SVG board.** `Board.tsx`, `BoardTerrain.tsx`, `StationCard.tsx`, `BoardOverlays.tsx`, `SeatLegend.tsx`, each with a sibling CSS file. `viewBox` + `preserveAspectRatio` from `boardBounds` handle the viewport fit — no resize listener, no `ResizeObserver`.
- **New Game and the debug panel.** `useRulesConfig.ts` (the one `fetch` in the app), `useGame.ts` (seed minting, `NEW_GAME`, generation-error capture), `NewGamePanel.tsx` (2/3/4/5 player counts), `DebugPanel.tsx` (revealed scores, seed display and entry, the three overlay toggles — all default off and visually distinct).

New constants: `CONFIG_FAILURE` / `SETUP_FAILURE` / `GAME_ACTION` in `src/constants/game.ts`, `DECK_SIZE = 35` in `src/constants/stations.ts`, the whole of `src/constants/setup.ts`, and `src/constants/overlays.ts`.

---

## ⚠️ Read this first: the shipped geometry cannot reliably generate a 3-player board

**This is a tuning decision for you, not a defect to patch.** Nothing was changed in `rules.json`, no retry ceiling was raised, and no predicate was loosened, because all three are your call under §12's symptom-to-cause table.

`src/rules/__tests__/setup.test.ts` contains one **failing** assertion, deliberately left red:

```
FAIL src/rules/__tests__/setup.test.ts
  > generateSetup against the shipped rules.json
  > emits a board that passes validateSetup for every player count across 20 seeds (AC9)

SetupGenerationError: generateSetup failed for 3 players at seed 0:
RIVER_TOO_NEAR_MOUNTAIN (no river placement found in 200 attempts — the board
may be too cramped for riverLength 700 to clear the mountain by cardSize 120 (see §12))
```

### The numbers

| | |
|---|---|
| Combinations attempted | 80 (4 player counts × 20 seeds) |
| Failed | **19 (23.75%)** |
| Failure code | `RIVER_TOO_NEAR_MOUNTAIN` — 19 of 19, no other code |
| By player count | **3 players: 17 of 20 seeds** · 2 players: 1 (seed 17) · 4 players: 1 (seed 17) · 5 players: 0 |
| Failing 3-player seeds | 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 16, 17, 18, 19 |

### Why the triangle specifically

For a fixed `borderPerimeter` the triangle has the smallest inradius of the three border shapes, so the 3-player board is the tightest one the generator ever has to fill. The arithmetic:

| Quantity | Value |
|---|---|
| Inradius of a perimeter-4000 equilateral triangle | ≈ 385 |
| Radius of the 1400-unit closed mountain loop | ≈ 223 |
| `MOUNTAIN_OFFSET_FRACTION` 0.15 × inradius | ≈ 58 |
| §4.3's one-card-width river clearance (`cardSize`) | 120 |
| **Exclusion zone the river must route around** | **≈ 401** |
| **Room actually available** | **≈ 385** |

The exclusion zone is larger than the board. The river sampler is not failing to find a solution — on most 3-player seeds there is no solution to find.

### What this looks like in the running app

**Clicking "3 players" will usually show the "Could not generate a board" error** rather than a board. 2, 4 and 5 players work on almost every seed. The error is legible and names the seed and the failure code, which is the designed behaviour for an exhausted ceiling (SCRUM-4 AC9) — but it is not a playable 3-player game.

### The levers, all yours (§12)

Any of these fixes it; which one is a design question about how the game should feel, not an engineering question:

- **`riverLength` 700** — a shorter river needs less room to route.
- **`mountainLength` 1400** — a smaller loop shrinks the exclusion disc directly.
- **`cardSize` 120** — the §4.3 clearance is exactly one card width, so this scales the buffer.
- **`borderPerimeter` 4000** — a bigger board relieves all three at once, at the cost of every distance in the game.
- Not a `rules.json` value, but adjacent: **`MOUNTAIN_OFFSET_FRACTION` 0.15** in `src/constants/setup.ts` contributes ≈58 of the 401. §4.3 states the 0–15% range, so shrinking it is a rule reading rather than a tuning change.

The plan already predicted this — see `plan.md` → Risks, "The river sampler is the piece most likely to need tuning."

---

## Decisions you need to make

Copied from `plan.md` → Risks and judgement calls. None of these was decided unilaterally.

1. **The nine `rules.json` values themselves.** They are transcriptions of §3 and §8.1, not inventions, but this contract is the moment the file stops being empty and the prototype acquires a difficulty setting. §3 itself says to tune the string lengths first. Confirm the table reads correctly — and note that the 3-player finding above is a live argument for changing at least one of them.
2. **Per-player-count edge lengths are derived, not stored — a deliberate deviation from SCRUM-3 AC1.** §3's 1333 / 1000 / 800 are `4000 ÷ n` rounded. Storing them alongside `borderPerimeter` would give one number two owners and turn SCRUM-4 AC2's "perimeter preserved" from an identity into a tolerance. Say so if you want the keys present anyway.
3. **`DECK_SIZE = 35` is a rulebook constant, not a config-derived total.** SCRUM-3 AC4 names 35 explicitly, so the validator asserts the composition sums to it. This means a play-tester cannot experiment with a 40-card deck by editing `rules.json` alone. If counting the physical cards (the M17 correction — yours) gives a different total, this constant changes with the rulebook. Tell us if you would rather the total be derived and only non-emptiness validated.
4. **`MOUNTAIN_OFFSET_FRACTION = 0.15` sits in `src/constants/setup.ts`, not `rules.json`.** §4.3 and AC5 both state the 0–15% range so it is not an unchosen number, but it *is* a difficulty lever — a mountain always near centre plays differently from one that can sit off to one side. Promote it to config if you want to tune it.
5. **`tangencyTolerance: 0.5` is inherited, not re-derived.** SCRUM-2 recorded it as your decision, and its `pr-description.md` flagged "whether 0.5 survives contact with play" as still open. This contract carries the number into the file unchanged and does not revisit it.
6. **The colour palette is visual judgement.** Five hexes in `COLOUR_SEATS` chosen for mutual distinguishability and contrast against the terrain strokes, but WCAG AA and whether they read as distinct on your monitor are things only you can check. SCRUM-4 AC12's legibility depends on it.
7. **Two dev dependencies declined, pending your approval.** The renderer has **no automated coverage** — all pure logic is unit-tested, but `Board.tsx`, `StationCard.tsx`, `SeatLegend.tsx`, `NewGamePanel.tsx`, `DebugPanel.tsx` and `BoardOverlays.tsx` are verified only by you looking at them. Reversing that means approving **`jsdom`** and **`@testing-library/react`** plus a Vitest environment split (the global `environment: 'node'` must not simply be flipped — that is half of what enforces the `src/rules/` purity boundary at runtime). Approving them would also pay off the known-debt item in `react-frontend/SKILL.md`. Two new dev dependencies is your call.
8. **SCRUM-4 AC9 versus §5.2 is a genuine contradiction, resolved by a new validator — confirm the reading.** §4.1 step 6 requires a starting station to *touch* the border; `validateStationPlacement` rejects any station touching any string, and the border is a `PlacedPath`. So "passes the rules engine's own legality checks" is implemented as `validateSetup` over the §4.1 invariants, built from the same §10.1 predicates, with §5.2 continuing to govern in-play placement only. The alternative — exempting the border inside `validateStationPlacement` — would weaken an in-play check to serve setup.

## What can only be judged by playing

Nothing below was or could be verified by an agent. All of it needs `npm run dev` and your eyes.

- **Is the board legible and unclipped at your window sizes?** The fit is `viewBox` + `preserveAspectRatio` with no resize listener, so it should scale, but whether the result is *readable* at a laptop width is not something a test can answer.
- **Do the station cards read without final art?** They are placeholder rects carrying the type name, the black-over-grey bonus pair, and the pawn count.
- **Is the 2-player pairing obvious?** Four colour-seats, two owners, turn order `[A1, B1, A2, B2]`, opposite corners, grouped by owner in `SeatLegend`. §9 makes each colour a separate player for every limit and trigger, which reads as a bug unless the UI makes the pairing plain.
- **Does the geometry make a tight puzzle or a cramped one?** A 4000-perimeter border with a 1400 mountain and 120 cards — whether the corners leave usable room is exactly what §12 says to watch on a first play. The 3-player finding above is a strong hint that the answer is "cramped".
- **Are the debug overlays useful and unobtrusive?** Dashed magenta, monospace, default off.
- Note that **the crossing overlay renders nothing until SCRUM-6.** SCRUM-3 AC7 asks for detected crossing points, and at setup there are no railway strings to cross anything. The overlay is correct and computed from the real `crossings()` predicate; it will simply be empty on a fresh board. Worth knowing before it reads as broken.

## Verification results — as observed, not as claimed

Every command below was actually run on this branch. Output quoted verbatim.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** — exit 0 |
| Lint | `npm run lint` | **PASS** — exit 0, no warnings |
| Format | `npm run format:check` | **PASS** — "All matched files use Prettier code style!" |
| Test suite | `npm test` | **1 FAILED, 230 passed** — see below |
| Production build | `npm run build` | **PASS** — exit 0 |

**The test suite is not green, and that is the known 3-player finding, not a regression:**

```
 Test Files  1 failed | 14 passed (15)
      Tests  1 failed | 230 passed (231)
```

The single failure is `setup.test.ts > generateSetup against the shipped rules.json > emits a board that passes validateSetup for every player count across 20 seeds (AC9)`, documented at the top of this file. There were no transform or collection errors — all 35 tests in that file were collected and ran, and 34 of them passed.

**The build passes despite the red test** because `"build": "npm run lint && tsc -b && vite build"` runs lint but not Vitest. Build output:

```
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-w3Pj8AHt.css    6.96 kB │ gzip:  2.03 kB
dist/assets/index-CJTo6qST.js   235.36 kB │ gzip: 74.70 kB
✓ built in 2.26s
```

`dist/rules.json` is present (1146 bytes) and is the populated file — checked with two separate greps (`borderPerimeter` → `True`, `HAMLET` → `True`) rather than one alternation, because `Select-String` reports one match per physical line and a single-line JSON asset would make an alternation prove only that the first branch is present.

Boundary and hygiene audits, all clean:

- No `react`, `react-dom`, `window`, `document`, `localStorage`, `sessionStorage` or `fetch(` anywhere under `src/rules/` — zero hits.
- No `.tsx` under `src/rules/`.
- No `Math.random()` or `Date.now()` call site under `src/rules/`. Two grep hits exist and both are **doc comments explaining why neither is used** (`rng.ts:4`, `setup.ts:78`). `Date.now()` is called once in the whole app, in `useGame.ts`, purely to mint a seed at the UI boundary — never inside a sampler.
- No `PlayerId` in a limit check, marker trigger, or connection-map lookup. It appears only in `types.ts` (the brand and `ColourSeat.owner`), `gameEnd.ts` (game-end score summing), `scoring.ts:98` (the `sameOwner` *report* field — the trigger itself compares `ColourId`), `setup.ts:156` (`asPlayerId` when building seats), and `SeatLegend.tsx` (grouping for display).
- No hard-coded tunable. One grep hit at `setupSamplers.ts:55` is prose noting that §3's tabulated 1333 / 1000 / 800 are *derived* rather than stored — the opposite of a hard-coded constant. (`HeroScene.tsx` is excluded by name from that grep: two of its lines are decorative hero-art SVG path coordinates that happen to contain the bare tokens `120` and `800`, and it reads nothing from `src/rules/`.)
- Deck composition counts appear only in `public/rules.json` and `TEST_CONFIG`. `DECK_TYPE_ORDER` names the types and carries no counts.
- Exactly one `fetch(` in the whole app — `useRulesConfig.ts:34`. No `XMLHttpRequest`, `axios`, or `WebSocket`.
- Zero `console.log` / `console.debug`.
- `package.json` and `package-lock.json` unchanged versus `master`. Still two runtime dependencies: `react`, `react-dom`.

File sizes, measured with `(Get-Content <file> | Measure-Object -Line).Lines`, not estimated. Nothing exceeds the 400-line budget:

| File | Lines | | File | Lines |
|---|---|---|---|---|
| `src/rules/containment.ts` | 369 | | `src/ui/AppShell.tsx` | 87 |
| `src/rules/setupSamplers.ts` | 294 | | `src/ui/useGame.ts` | 83 |
| `src/rules/setup.ts` | 243 | | `src/ui/SeatLegend.tsx` | 74 |
| `src/rules/config.ts` | 206 | | `src/ui/BoardOverlays.tsx` | 73 |
| `src/rules/setupValidation.ts` | 182 | | `src/ui/useRulesConfig.ts` | 66 |
| `src/ui/DebugPanel.tsx` | 138 | | `src/constants/setup.ts` | 63 |
| `src/constants/stations.ts` | 127 | | `src/ui/StationCard.tsx` | 60 |
| `src/constants/game.ts` | 98 | | `src/rules/rng.ts` | 59 |
| | | | `src/rules/deck.ts` | 55 |
| | | | `src/ui/Board.tsx` | 45 |
| | | | `src/ui/BoardTerrain.tsx` | 45 |
| | | | `src/ui/NewGamePanel.tsx` | 38 |
| | | | `src/constants/overlays.ts` | 21 |
| | | | `src/App.tsx` | 5 |

Four files sit in the 200–400 second-look band. `containment.ts` at 369 is the one to watch: it is pre-existing and grew by one export this contract, and it is closest to the ceiling.

## Deviations from the plan during execution

Five contract defects were found and fixed while implementing. Listed so review can check each.

1. **`setupValidation.ts` wrapped the open river with `closed()`.** That invented a phantom closing segment from the river's mouth back to its tail, so the validator was checking a shape the sampler had never produced — the sampler and its own gate disagreed. Fixed so only the mountain is closed.
2. **A seat-validation spec was vacuous.** The fixture's default `startingStationId` already matched the id the generator produced, so the "rejects a seat pointing at a station that does not exist" assertion passed without exercising anything. Fixed to name a genuinely absent station.
3. **Two `Expected:` outcomes in the contract were factually impossible** as written. They were recorded as observed rather than being made true by changing code.
4. **`pointTouchesPath`'s closed-loop spec used a coordinate 150 units outside its own tolerance**, so the assertion was false whichever way the implementation went and proved nothing about the wrap edge it claimed to test. Replaced with a point that actually exercises the closing segment.
5. **`NO_OVERLAYS` could not live in `BoardOverlays.tsx`.** `react-refresh/only-export-components` rejects a non-primitive const exported alongside a component. Rather than disabling the rule, `OverlayFlags` and `NO_OVERLAYS` moved to **`src/constants/overlays.ts`**; `BoardOverlays.tsx` re-exports the type only.

Two structural changes, both stated rather than silent:

- **`src/rules/setup.ts` was split.** It measured 495 lines, over the blocking 400-line budget, so the geometric primitives and the three samplers moved to **`src/rules/setupSamplers.ts`** (294 lines). `setup.ts` re-exports them, so `from './setup'` remains the public entry point and no consumer changed.
- **Task 22a was added to the contract during Phase 5.** Every other spec runs against `TEST_CONFIG`, whose values are deliberately synthetic and *not proportional* to the shipped ones — `cardSize / borderPerimeter` is `20/2000 = 0.01` in the fixture but `120/4000 = 0.03` in `rules.json`, a 3× relatively larger card, and `cardSize` is exactly the tolerance the river sampler uses for its §4.3 clearance. The real values had never been through the generator. Task 22a runs `generateSetup` for all four player counts across 20 seeds against the actual `public/rules.json`, validated through `parseRulesConfig`. It is verification of behaviour already built, not new scope — and it is what surfaced the 3-player finding.

## New conventions for future contributors

- **`validateSetup` is the setup-time counterpart to `validateStationPlacement`, and the two must not be conflated.** `validateSetup` (`src/rules/setupValidation.ts`) checks the §4.1 board invariants once, at generation. `validateStationPlacement` (`src/rules/validate.ts`) governs in-play placement under §5.2 and is unchanged. A starting station legally touches the border; an in-play station may not touch any string. Same predicates, different rule.
- **`NEW_GAME` is a UI action, not a `Move`.** `GameAction` is the reducer's input union and now carries `NEW_GAME` alongside `MOVE`; `Move` remains the *persisted* union that the move log is made of. Adding a UI concern to `Move` would invalidate every saved log.
- **`src/constants/setup.ts` holds numeric bounds and fixed-meaning values; every tunable stays in `rules.json`.** The split is: a colour, a §2.1 component count, a retry ceiling, a segment count, or a spec-stated range goes in `src/constants/`; anything §12 might tell you to change goes in `rules.json`. Each constant carries its reason in a doc comment.
- **`parseRulesConfig` takes an already-parsed `unknown`.** `fetch` and `JSON.parse` both stay in `useRulesConfig`, which is what keeps `config.ts` inside the `src/rules/` purity boundary.
- **No `catch` returns a success shape.** A defaulted config plays a differently-tuned game and silently corrupts every conclusion drawn from the session, so a failed load is a visible error state with the URL named, never a fallback.

## Known accessibility gap

The board is a static SVG with an `aria-label`. Nothing in this contract needs pointer input, so there is no keyboard gap *yet* — the New Game and debug controls are ordinary focusable elements using `:focus-visible`.

**SCRUM-6's fixed-length string drag will have no keyboard equivalent.** A freehand pointer gesture constrained to a fixed arc length has no obvious keyboard analogue, and that is a real accessibility limitation of the prototype rather than an oversight. Stating it now so it is a known decision when SCRUM-6 lands.
