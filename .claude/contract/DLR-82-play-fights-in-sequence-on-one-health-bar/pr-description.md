# DLR-82 — Play fights in sequence on one carried health bar

Jira: **DLR-82**
Plan: [`plan.md`](./plan.md)
Mockup (approved 2026-08-15): [`mockup.html`](./mockup.html)

## Summary

The player's single encounter becomes a **run** of at least three configured Quarries fought in
order on one player health bar that is never restored between fights, with a full-screen verdict
shown whenever a fight or the run resolves.

- **`src/hunt/run.ts`** — a new pure module, inside the lint-enforced `src/hunt/**` boundary. Adds
  `RunState`, `RunOutcome` (`InProgress` / `Won` / `Lost`), and the four transitions
  (`startRun`, `recordEncounter`, `canAdvanceRun`, `advanceRun`). This is the single place a run's
  outcome is decided.
- **The run length is derived, not configured twice.** `QUARRY_ENCOUNTER_HEALTH` widened to a
  three-entry rising placeholder curve (`[10, 14, 18]`); `ENCOUNTERS_PER_RUN` is now
  `QUARRY_ENCOUNTER_HEALTH.length` rather than a free-standing number that could drift from it.
- **`src/app/run/RunOutcomePanel.tsx`** — the full-viewport verdict screen (`src/app/run/run.css`,
  copy in `src/app/run/runLabels.ts`). Three states — fight won mid-run, run won, run lost —
  distinguishable without colour or motion (headline text, rule form, control label all differ).
  Shows the run's position, the carried health, and a tricks-taken bar row for the deciding hand.
- **`src/App.tsx`** rewritten as the run driver: it owns `RunState`, mounts the felt while the
  encounter is live, and mounts `RunOutcomePanel` once it resolves.
- **Deleted:** the felt's terminal hand panel (the old in-place "you won/lost" branch in
  `WarCouncilRound.tsx`'s render chain, `RoundOverPanel`'s `winner`-dependent branch, the
  `ENCOUNTER_OUTCOME` labels, and the `.wc-terminal` CSS rule). The developer's play-session
  feedback was that this panel did not read as a clear win/lose and offered no control — it is
  fully replaced by the run verdict.

## Developer decides or observes

Copied verbatim from `tasks.md`'s File map:

> **Developer decides or observes:**
> - `src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH` — the curve's values. `[10, 14, 18]` ships as a documented placeholder satisfying AC1 (three entries, rising, not all equal). The ticket predicts a loss around fight three at these numbers and calls that correct; the choice is whether to ship them, soften the ramp, or add fights.
> - Whether `ENCOUNTERS_PER_RUN` should stay independently settable (a run shorter than the curve, slicing the first N) rather than becoming an alias of the array's length. That is a different design and changes `run.ts`'s `encounterCount`.
> - Whether the "Start a new run" control stays. It is an assumption, not an AC — without it a finished run is a dead screen needing a browser reload.
> - Whether the tricks row belongs on all three verdicts or only the wins. The developer named the win screen at the gate; the panel and the data are identical in all three, so it ships everywhere and can be narrowed.
> - Whether the trick bars must run in play order. They ship **grouped** (all taken, then all lost) because `WarCouncilState` keeps no per-trick winner history; chronological order means adding one to `src/warCouncil/`, which AC7 puts out of bounds here — a clean follow-up ticket if the order matters.
> - All new copy: `FIGHT WON` / `YOU WIN` / `YOU LOSE`, `Tricks taken`, `Next fight`, `Start a new run`, and the supporting detail line.
> - The verdict headline's `clamp()` bounds, and the `--wc-poison` / `--wc-alarm` hues on the trick bars.
> - **Judge by playing:** whether the headline actually reads as unmissable (the whole point of the feedback); whether a full surface beats an overlay over the frozen felt; whether losing the felt's hand tally at fight's end costs anything, since only the trick split carries onto the verdict.
> - **Judge by playing:** whether the deciding trick's new reveal beat — it is skipped today — reads well or delays the verdict.

Two further items surfaced during QA's live pass, also for the developer:
- The exact **390×844** viewport could not be driven on QA's machine (Chrome floored the window at
  ~500px width); at 500×844 there was no scroll and the layout was legible, but 390×844 itself is
  still unconfirmed.
- Whether losing the felt's old terminal tally panel costs anything — restated above, and worth
  judging in play.

## Verification results

**Phase 1 — the run module and its configuration**
`npx vitest run src/hunt/__tests__/` — passed, 0 failed, including `run.test.ts`, `config.test.ts`,
`encounter.test.ts`, `quarryCharacters.test.ts`. `npm run typecheck` and `npm run lint` both exited
0.

**Phase 2 — the run verdict screen**
`npx vitest run src/app/run/__tests__/` — passed, 0 failed (`runLabels.test.ts`,
`RunOutcomePanel.test.tsx`). `npm run typecheck` and `npm run lint` both exited 0. File sizes under
the 400-line budget: `RunOutcomePanel.tsx` 109, `runLabels.ts` 59, `run.css` 155.

**Phase 3 — wiring the run into the app**
`npx vitest run src/app/warCouncil/__tests__/` and `npx vitest run src/hunt/__tests__/ src/app/`
both passed, 0 failed. `npm run typecheck` and `npm run lint` exited 0 throughout. `App.tsx`
measured 127 lines. `Select-String -Path src\App.tsx -Pattern "\b(10|14|18)\b"` returned zero hits
— no tuning value hard-coded into the driver.

**Phase 4 — final verification (executed by QA)**
- `npx vitest run --project node` → **28 files / 401 tests passed**
- `npx vitest run --project dom` → **13 files / 74 tests passed**
- `npm test` (unfiltered) → **41 files / 475 tests passed**, exit 0
- `npm run typecheck` → exit 0, no output
- `npm run lint` → exit 0, zero errors, zero warnings; no `eslint-disable` anywhere in the diff
- `npm run build` → exit 0; `dist/index.html`, `dist/assets/index-*.css` (20.05 kB),
  `dist/assets/index-*.js` (224.35 kB), no bundler errors
- `npx prettier --check` (scoped) → initially failed on 2 files (`src/hunt/run.ts` — a line over
  print width; `src/app/warCouncil/WarCouncilRound.tsx` — line-ending normalisation only, no
  content diff). Both fixed with `npx prettier --write` in the review fix pass; the scoped check
  now exits 0 with **"All matched files use Prettier code style!"**
- Boundary greps: `src/hunt` React/DOM import — zero hits; `ENCOUNTER_OUTCOME|wc-terminal|SLICE_ENCOUNTER_INDEX` — zero hits; `100vh|100vw` in `src/**/*.css` — 1 hit, a comment in `run.css:3` forbidding the very pattern it names, no live declaration; `ENCOUNTER_PLAYER_RESTORE` — 7 hits (contract expected exactly 4; the 3 extra are documentation comments in `src/hunt/encounter.ts:20` and `src/hunt/run.ts:77` explaining the restore is deliberately unread — neither file imports or reads the constant, the guard holds).
- File sizes, all under the 400 budget: `run.ts` 110, `RunOutcomePanel.tsx` 109, `runLabels.ts` 59,
  `run.css` 155, `App.tsx` 127, `WarCouncilRound.tsx` 293, `RoundOverPanel.tsx` 68,
  `warCouncil.css` 393, `warCouncilHand.css` 46.
- Live browser pass (dev server on port 5199, since stopped): status band read `Fight 1 of 3` on
  load and `Fight 2 of 3` after advancing; the deciding trick got its own reveal and **one tap**
  reached the verdict; health carried into fight 2 at **5/10**, not reset to 10; the Quarry's bar
  opened fight 2 at **14/14**, its own configured maximum; the loss screen offered only "Start a
  new run" with no next-fight control; console clean throughout. Viewports with no page scroll:
  **1920×1080** and **1366×768** confirmed; **390×844 could not be driven** (Chrome floored the
  window at ~500px width) — outstanding for the developer.

## Two deviations from the contract's planned file map

1. `src/app/warCouncil/warCouncilHand.css` was created (not planned): adding `.wc-run` pushed
   `warCouncil.css` to 431 lines, over the blocking 400-line budget, so the pre-existing hand/fan
   rules were moved into a sibling file and imported from `WarCouncilRound.tsx`. Content only
   moved; both the code-evaluator and QA verified nothing was lost or duplicated.
2. Two component tests outside the listed `Test:` bullets were rewritten because they asserted
   against the deleted terminal panel — one in `WarCouncilRound.test.tsx`, and the "hand tally
   survives re-mount" block in `WarCouncilRound.duelHealthBars.test.tsx` whose premise no longer
   occurs in production. QA judged both rewrites meaningful, not weakened.

## Conventions introduced

- **Run rules live in `src/hunt/run.ts` and never in a component.** `RunState`'s transitions
  (`startRun`, `recordEncounter`, `canAdvanceRun`, `advanceRun`) are the only place a run's outcome
  is decided; `App.tsx` and `RunOutcomePanel` only read the result.
- **The card layer receives the run's position as a pre-formatted `runLabel` string**, not as
  `RunState` — `WarCouncilMountProps.runLabel` is a required `string` so the card layer can render
  the run's position without being able to read or change run state.

## Follow-up

**DLR-85** must rename the verdict's copy to the Irish roster ("Aoife defeated" / "Fight Cillian")
in the same change that lands the run map — its description already carries this note.
