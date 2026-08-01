# SCRUM-5 — Station placement workflow: draw, position and legality feedback

Plan: [`plan.md`](./plan.md) in this folder. Full task-by-task record: [`tasks.md`](./tasks.md).

## Summary

Step 1 of every turn (§5.2 — draw a station, position it, commit it) was fully decided by the rules engine but invisible and undispatchable from the UI: nothing ever sent `BEGIN_TURN`, and `beginStationStep` already ran its draw-and-recycle sequence (marker-starved redraw, the M4 three-failure skip, the M5 empty-deck skip) but reported only the final outcome — so a Landmark bounced for want of a marker and two failed draws before a third card succeeded were indistinguishable from one clean draw.

This change:

- Adds an additive `DrawEvent` trace (`GameState.lastDraw`), emitted by `beginStationStep` and assembled by the reducer (including the two Rural extra-draw events), so every recycle, skip and extra draw in §5.2's sequence is now reportable instead of silent (AC5, AC7, AC8, AC9).
- Adds two pure derivations in `src/rules/staging.ts` — `cardRectAt` (the pending card's footprint at a pointer position) and `stationStepStage` (which of awaiting-draw / placing / skipped / done the state is in) — both unit-tested with no DOM.
- Narrows `validateStationPlacement`'s return type to a new `StationPlacementResult` (three §5.2 codes only), so the UI reads a reason with no cast.
- Builds the player-facing surface: `StationStepPanel` (deck count, drawn card's type/bonuses/player limit, live legality verdict, and the draw trace rendered as player-facing sentences), a pointer-tracked `StationGhost` positioned by ref-mutation (never through React), the `useStationPlacement` drag hook (pointer capture, live per-constraint legality, a commit guarded on the engine's own verdict), and a marker glyph on `StationCard` for any station with `markerOwner !== null`.
- Promotes the existing `{state !== null && …}` block in `AppShell` into `src/ui/PlayArea.tsx` so `useStationPlacement` can be called unconditionally.

No `rules.json` value was read, added, or changed. No new dependency was added.

## Developer decisions needed

Carried verbatim from `tasks.md`'s "Developer decides or observes" list — none of these were decided unilaterally by this contract:

1. **Whether the "Draw station" click is acceptable for AC1**, or whether `BEGIN_TURN` should instead run synchronously inside `newGame`. The click avoids a React StrictMode double-dispatch into `applyBeginTurn`'s throw; the synchronous alternative only covers the first turn.
2. **Whether to add jsdom + a Vitest environment split** so the drag gets component tests. This is a new devDependency and needs explicit approval. Until it's added, AC2/AC3/AC4 are covered only by unit tests on the logic beneath the interaction, not by driving a pointer (see "What was verified" below).
3. **Whether the ghost tracks the pointer without lag, whether legal-versus-illegal reads at a glance, whether the rejection sentences land, and whether picking the card up by pressing on the board feels natural.** Run `npm run dev` and look — no test can answer any of these.
4. **Whether `RURAL_CHAIN_CAPPED` earns its place in the panel copy.** AC5 requires only the behaviour (the chain not extending to a third card), not that specific message.
5. **Whether the marker glyph should appear on starting stations.** Current implementation: yes, wherever `markerOwner !== null`, matching where §7.3's owner penalty fires. Alternative: restrict it to Landmark/Depot only (`&& card.flags.needsMarker`).
6. **The board `<svg>`'s `role="group"`** (changed from `role="img"` so the drag surface's subtree is addressable) changes what a screen reader announces for SCRUM-4's delivered board — worth a deliberate look rather than an incidental one.
7. Two items noted but not this contract's work: `SCRUM-3-4-config-setup-and-board/tasks.md` still reads `Status: IN PROGRESS` with all 93 steps checked and is worth flipping to `COMPLETE`; and reaching M4's three-failure skip or M5's empty-deck path in actual play needs a contrived seed or a debug affordance, neither of which is built here.

## What was verified, and what was not

**Covered by unit tests on the logic beneath the interaction, not by driving a pointer:** AC2 (live legality), AC3 (specific per-constraint reason), and AC4 (illegal placement cannot commit) are all exercised through `validateStationPlacement`, `staging.ts`'s `stationStepStage`/`cardRectAt`, and the reducer's `applyPlaceStation`/`applyBeginTurn` — never through a simulated `PointerEvent`. There is no jsdom/component-test environment in this repo yet (see Developer Decision 2), so nothing here actually drags a ghost across a rendered board. **The drag itself has no keyboard equivalent** — a known, stated accessibility gap in the prototype, not fixed by this contract.

**This story ends at a dead end by design.** Committing a station (`PLACE_STATION`) moves `phase` to `STRING`, where nothing is built yet — no string-placement UI exists until SCRUM-6. Reaching that phase in the running app is expected to look unfinished, not broken.

**Gate results actually run, quoted from the phase-by-phase record in `tasks.md`:**

- Phase 1 (Task 2): typecheck exits 0; Vitest 36/37 passing. The one failure — `emits a board that passes validateSetup for every player count across 20 seeds (AC9)`, throwing `RIVER_TOO_NEAR_MOUNTAIN` at seed 0 / 3 players — is **pre-existing, not introduced by this contract**: a §12 tuning symptom against the shipped `public/rules.json`'s real M2 values, which is a developer-owned config value, not a code defect. It is not fixed here and `rules.json` was not touched.
- Phase 1 (Task 3): typecheck exits 0; Vitest `Tests 23 passed (23)`.
- Phase 1 (Task 4): typecheck exits 0; Vitest `Tests 38 passed (38)`.
- Phase 2 (Task 5): Vitest `Tests 7 passed (7)`; typecheck exits 0; lint exits 0.
- Phase 2 (Task 6): typecheck exits 0; Vitest `Tests 56 passed (56)` across `staging.test.ts`, `validate.test.ts`, `search.test.ts`, `reducer.test.ts` run together.
- Phase 3 (batched verification block): typecheck exits 0; lint's first pass surfaced one real defect (`react-hooks/set-state-in-effect` on `useStationPlacement.ts`'s stale-verdict-reset effect), fixed by deriving the reset at render time rather than disabling the rule; re-run both exit 0 (lint: 0 errors, 0 warnings). No `src/rules/` file was touched in Phase 3, so the boundary grep didn't apply there; no new spec was created in Phase 3, so no additional scoped Vitest run applied.
- Phase 3 (Task 13): typecheck exits 0; lint exits 0; `StationStepPanel.tsx` measured 91 lines.
- Phase 3 (Task 14): typecheck exits 0; lint exits 0 (0 errors, 0 warnings); `PlayArea.tsx` measured 92 lines; `AppShell.tsx` measured 78 lines.
- Phase 4 (Task 15 — this phase): `src/rules/` boundary grep — zero hits.
- Phase 4 (Task 16 — this phase): tunable-literal grep — one hit, judged a non-defect (a decorative SVG path coordinate in `HeroScene.tsx`, a file outside this contract's scope, containing the bare token `120` among freehand curve coordinates — not a `cardSize`/etc. read); M4-ceiling grep — 3 hits, all the expected `MAX_STATION_STEP_FAILURES` import/uses in `placementMessages.ts`, zero hits for a literal `of 3`; debug-logging/`Math.random()` grep — 2 hits, both inside pre-existing doc comments stating the pattern is *not* used, zero actual call sites.
- Phase 4 (Task 17 — this phase): every file this contract created or grew measured under 400 lines — `staging.ts` 45, `turn.ts` 256, `reducer.ts` 233, `types.ts` 183, `useStationPlacement.ts` 136, `StationStepPanel.tsx` 91, `PlayArea.tsx` 92, `StationGhost.tsx` 40, `Board.tsx` 53, `StationCard.tsx` 96, `AppShell.tsx` 78, `placementMessages.ts` 46.

**Not run by this contract, delegated to QA per the pipeline's division of labour (Task 18):** the unfiltered `npm test` suite, `npm run format:check`, and `npm run build`. No full-suite or production-build result is claimed here — those numbers do not exist yet at the time of writing.

## Post-review fix pass

Three-reviewer parallel review (Code-Evaluator, Defender, QA) surfaced one critical and two warning-level issues, all inside `src/ui/useStationPlacement.ts` and its immediate consumers, plus one formatting failure. All four are fixed:

- **CRITICAL — stale-rect commit in `onPointerUp`.** The original code bound the rect dispatched with `PLACE_STATION` *before* the final `track(event)` call for the release, then gated the dispatch on the `reasonRef` that `track()` recomputed *after* — so the gate and the payload could disagree about which candidate position they meant whenever the release coordinates differed from the last sampled pointermove (routine at high pointer rates or on a flick). One failure mode committed a station at a stale position rather than where the pointer was released; the other silently dropped a legal release with no error and no explanation. Fixed by reading both the gate and the dispatched rect fresh, from the same `track(event)` call, at release time. The reducer's own re-validation meant nothing illegal ever actually committed, but the "why did nothing happen" case was a real, silent UX bug. This bug originated in `tasks.md` Task 11's pasted snippet — corrected there too so a future re-read of the plan does not restore it.
- **The hook's `StationPlacementResult` type renamed to `UseStationPlacementResult`,** to stop colliding by name with `src/rules/validate.ts`'s unrelated, differently-shaped `StationPlacementResult`. `Board.tsx`'s import was updated to match.
- **`StationStepPanel` no longer renders "Legal position." before a position has ever been tracked.** `reason === null` was overloaded to mean both "legal" and "no drag yet," so the live region announced a validated fact before the player had touched the board once, and again for one render after a Rural's extra draw swapped in a new pending card. The hook now also returns `hasPosition: boolean`, and the panel gates the sentence on it.
- **`PlayArea.tsx` failed `npm run format:check`** — its multi-line destructuring function signature fits Prettier's 100-char `printWidth` on one line. Reformatted; `format:check` now clean across the whole tree.

Re-verified after the fix pass: `npm run typecheck` (0), `npm run lint` (0 errors, 0 warnings), `npm run format:check` (clean), `npx vitest run` (`1 failed | 271 passed (272)`, the one failure the same pre-existing AC9 `RIVER_TOO_NEAR_MOUNTAIN` seed-0/3-player failure noted above — unrelated, not touched), `src/rules/` boundary grep (zero hits — no `src/rules/` file was touched in this pass).

## Two conventions introduced, for future contributors

- **Transient UI-facing state on `GameState` follows the existing `lastScoring` precedent.** `lastDraw: readonly DrawEvent[]` is exactly like `lastScoring`: derived, not persisted history, reset at the same points (`advanceTurn` clears it just as it does not carry `lastScoring` forward), and read by components but never mutated by them.
- **A ref-positioned SVG element must never declare that attribute in JSX.** `StationGhost`'s outer `<g>` draws at the origin with no `transform` prop; `useStationPlacement` writes `transform` directly via `ghostRef` on every pointer move. If a future change adds `transform={...}` to that element's JSX, React will own the attribute again and silently snap the ghost back to a stale position on the next legality-driven re-render.
