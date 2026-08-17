# Start screen and run map showing the path to Diarmuid (DLR-85)

**Plan:** [`plan.md`](./plan.md)
**Mockup (approved 2026-08-17):** [`mockup.html`](./mockup.html)

## Summary

The run's opponent sequence is now generated from one configured source instead of
being implied by a three-entry health array. `src/hunt/config.ts` gains an
`OpponentKind` union, two named rosters (`ORDINARY_OPPONENT_NAMES`, 20 names;
`STAGE_BOSS_NAMES`, 5 names, closing on Diarmuid), a `RunEncounterConfig` shape, and
`buildRunEncounters`, which produces `RUN_ENCOUNTERS` — five stages of four ordinary
fights plus a boss, twenty-five encounters in total. `QUARRY_ENCOUNTER_HEALTH` is now
a derived projection of `RUN_ENCOUNTERS` (it must stay declared *below* it — see the
convention note at the end of this description) and grew from 3 entries to 25, still
opening on the same `10, 14, 18` curve.

A new pure module, `src/hunt/runPath.ts`, derives the run's stage/node structure from
the boss positions in `RUN_ENCOUNTERS` and the player's current position, tagging every
node beaten / current / upcoming. It has no React or DOM dependency and is covered by
13 unit tests, including the three-ordinary-no-boss edge case.

Two new screens are built on that model: `RunMap.tsx` (the horizontal path diagram —
pure render, no computation) and `RunPathScreen.tsx` (title + goal text + `RunMap` +
one action), which together serve both a **start screen** (shown before the first
fight) and a **between-fights map** (reachable from the post-fight outcome panel).

Every opponent's name now flows through the same roster across four run-level
surfaces: the run map, the start screen's `Fight <name>` action, the post-fight
outcome headline (`'<name> defeated'`, replacing the old `FIGHT WON`), and the shop's
leave control (`Next: <name>`, falling back to `NEXT_FIGHT_LABEL` beyond the roster —
this also fixed a real defect where the shop always printed "The Monarch" regardless
of who was actually next).

`App.tsx`'s run-phase state (`BetweenPhase` → `RunPhase`) widened to include `Start`
and `Map`, wiring both new surfaces into the existing fight/shop/outcome flow, and
`handleNewRun` now returns the player to the start screen rather than straight into a
fight.

The run's length grew from 3 fights to its full 25.

## Developer decisions needed

Copied verbatim from this contract's `tasks.md`, "Developer decides or observes":

- `src/hunt/config.ts` → **`BOSS_HEALTH_MULTIPLIER`** — ships at `1.5`, the one number
  in this contract nobody has chosen. Trades boss difficulty spike against a run that
  is already not winnable.
- `src/hunt/config.ts` → **`ORDINARY_HEALTH_BASE` / `ORDINARY_HEALTH_STEP`** — ship at
  `10` / `4`, reverse-engineered to reproduce the existing `10, 14, 18`. Confirm that
  curve is still what you want across twenty-five fights rather than three.
- `src/hunt/config.ts` → **`ORDINARY_PER_STAGE`** — ships at `4`, from the sketch.
- `src/app/run/runMap.css` → **every `clamp()` bound, the -52° name angle, the name
  font size, and the three state colours.** The angle and font size are the two that
  decide whether twenty-five names fit at a narrow viewport.
- `src/app/run/runLabels.ts` → **all new copy**: `START_TITLE` (`'The Hunt'`),
  `MAP_TITLE` (`'The path'`), `MAP_LABEL` (`'Map'`), `MAP_BACK_LABEL` (`'Back'`),
  `runGoalText`'s `'Beat all 25'`, and the `'<name> defeated'` headline that replaces
  `FIGHT WON`.
- **Whether the start screen's button should read `Fight Aoife` or `Begin run`.** The
  contract ships `Fight Aoife` (AC8 over AC1's phrasing), with the title carrying the
  "this is the start" framing.
- **Whether the two coexisting rosters are acceptable for one release** — "Aoife" on
  the map versus "The Monarch" in the fight screen's dossier and "The Quarry's health"
  on its bar. The ticket names that as a separate ticket; this is the moment to pull it
  in instead.
- **Whether the run feels right at twenty-five fights.** It is expected to be lost in
  stage one or two, and `YOU WIN` is effectively unreachable in play — checking that
  copy needs the run temporarily shortened.
- **Whether the map reads at a glance** — whether five stages of four ticks and a
  block communicate "five stages" without counting.

## Behaviours the developer must judge by playing

- Whether five stages of four ticks and a block read as five stages without counting.
- Whether the map is worth the extra click from the verdict.
- Whether `'<name> defeated'` still lands as a win now that `FIGHT WON` is gone.
- Whether the two coexisting rosters ("Aoife" on the map, "The Monarch" in the
  dossier) are tolerable for one release.

## What QA must confirm in a real browser

`jsdom` has no layout engine, so no test can prove either of these — they need a real
browser, at both a narrow mobile-width viewport and a standard desktop viewport (name
the specific sizes exercised when QA runs it):

1. Neither new surface (start screen, run map) scrolls or crops at twenty-five nodes
   (AC11).
2. Losing a run lands on the start screen with a fresh path (AC10's full loop).

## Expected balance state

The twenty-five-fight run is **not winnable** on the placeholder curve shipped here —
Oisín holds 86 and Diarmuid holds 129 against a player starting on 10 — so `YOU WIN`
is effectively unreachable in play. DLR-82 already recorded that the correct response
to this is the shop's economy, **not** raising `PLAYER_START_HEALTH`.

## Verification results (Task 12, quoted)

- **Vitest cache warm** (`npx vitest run --project node; npx vitest run --project dom`):
  both exited 0 — `Test Files  32 passed (32)` / `Tests  513 passed (513)` for `node`,
  `Test Files  18 passed (18)` / `Tests  120 passed (120)` for `dom`.
- **Typecheck, lint, full suite** (`npm run typecheck; npm run lint; npm test`): all
  three exited 0. Vitest: `Test Files  50 passed (50)` / `Tests  633 passed (633)`.
- **Formatting, scoped** (`npx prettier --check src\hunt\runPath.ts src\hunt\config.ts
  src\hunt\run.ts src\hunt\index.ts src\App.tsx src\app\run\RunMap.tsx
  src\app\run\RunPathScreen.tsx src\app\run\RunOutcomePanel.tsx src\app\run\ShopPanel.tsx
  src\app\run\runLabels.ts src\app\run\runMap.css`): exited 0 — "All matched files use
  Prettier code style!"
- **Production build** (`npm run build`): exited 0. `dist/index.html`,
  `dist/assets/index-BbfBBPjB.css` (28.04 kB, gzip 6.20 kB),
  `dist/assets/index-CLmvwvLK.js` (237.49 kB, gzip 73.96 kB) — built in 520ms, no
  bundler errors.
- **400-line budget sweep** (`Get-ChildItem src -Recurse -Include *.ts,*.tsx |
  ForEach-Object { ... (Get-Content $_.FullName).Count ... } | Where-Object Lines -gt
  400`): no rows returned — no file in `src/` breaches 400 lines.

## Convention note for future contributors

`RUN_ENCOUNTERS` is the run's single source, `QUARRY_ENCOUNTER_HEALTH` is a projection
of it, and it must stay declared above that projection — a forward reference evaluates
as `undefined` and throws on `.map` at module init.
