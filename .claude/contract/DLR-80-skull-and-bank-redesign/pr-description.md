# DLR-80 — The Hunt: skull-and-bank redesign

- Plan: [`plan.md`](./plan.md)
- Layout/interaction reference: [`mockup.html`](./mockup.html) (approved 2026-08-13)
- Spec: `.docs/design/Balatro-Forbidden-Solitaire/the-hunt-play-test-2-feedback.md` (never edited by this contract)

## Summary

Replaces the Hunt's declaration-and-Standing scoring layer with one legible loop:

- **Six-trick hands.** Each side is dealt 6 cards (`HAND_SIZE`), one trick per card, then the hand re-deals. Follow-suit, trump/decree, trick resolution, and "winner leads next" are unchanged from the base game.
- **Skulls.** Roughly 30% of the CPU's dealt cards (`SKULL_DENSITY`) carry a skull, and a skull is never assigned to a rank-1 card (`SKULL_MIN_RANK`). Skulls are visible to the player as soon as the hand is dealt (via the per-suit shape readout) and a skulled card announces itself once it is played face-up.
- **The bank and the streak multiplier.** Taking a trick — winning it clean, or losing it when it carried a skull (the dodge) — adds both cards' ranks to a bank that only ever climbs, and increments a multiplier. Taking damage — losing a clean trick or winning a skull trick — costs the player exactly 1 health (`DAMAGE_PER_HIT`), cashes `bank × multiplier` into the Quarry's health, and resets both to zero. The same cash-out fires automatically at the end of the sixth trick.
- **Per-trick damage.** Health is no longer settled once at the end of a Hunt; it moves after every trick, and the encounter can now resolve mid-hand.
- **AC13's deletion list**, removed from `src/`, not deferred: the Win/Lose declaration and its gate, both Standing multiplier tables and the four bands, rank inversion (`12 − rank`), the Lose-path pile swap and `CardValueScheme`, Spoils and the capture piles, damage rounding, pending damage, and end-of-Hunt damage application.

New pure modules: `src/warCouncil/skulls.ts` (skull assignment, the never-rank-1 exclusion, the per-suit shape) and `src/warCouncil/bank.ts` (the four-outcome table, `resolveTrickBank`, the `PlayerSide → DuelSide` crossing). New UI: `src/app/warCouncil/QuarryShape.tsx` (AC11's shape-and-skull readout) and `src/app/warCouncil/BankMeter.tsx` (the bank/streak/cash-out-preview readout), both mounted in the dossier column.

## Convention note for future contributors

Every rule of the four-outcome loop (clean win, dodge, clean loss, skull win) lives in **`src/warCouncil/bank.ts`** — nowhere else computes an outcome. A component that needs to know what a trick just did should read `RoundState.lastResolution` rather than re-deriving the outcome from the played cards.

## Decisions the developer must make

Copied verbatim from `tasks.md`'s File map → *Developer decides or observes*:

1. **`src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH[0]`** ships as the plainly-labelled placeholder `1000`. The real figure comes from the first play session — specifically §8's third measurement below (record your biggest cash-out each hand). Too low and the encounter is over in two hands; too high and it is a grind.
2. **`src/hunt/config.ts` → the skull rank distribution** — uniform across ranks 2–11 today. §6 Q1: low-skew makes ambushes commoner, high-skew makes skulls announcements. `assignSkulls` takes it as a parameter, so testing a skew is a one-line change.
3. **Whether the CPU should also avoid *leading* a skulled card.** Out of scope by AC12. Watch §8's first count (tricks deliberately dodged) below for dodges that were free rather than decisions.
4. **Visual calls** — card and panel size bounds, the skull glyph, the suit-border weight, and how long a resolved trick holds on screen. `mockup.html` proposes; these are the developer's to confirm by eye.
5. **Whether the player's health bar reads acceptably at 25** (nine discrete steps of 1) rather than 1,350. May want a different bar treatment at this scale.
6. **Whether the mid-hand encounter end feels abrupt** — a big cash-out can now end the fight on trick 3, cutting the hand off before it plays out.
7. **Whether a skull that has changed hands should still make its trick a skull trick.** `trickIsSkulled` tests the trick, not the seat — a card the Quarry's Fox exchanged into the decree, later taken by the player, still carries its skull. One line in `src/warCouncil/skulls.ts` if the skull should instead die with the exchange.
8. **Whether rank 8 keeps the name "Poison."** It has no play-time ability and no scoring intervention since DLR-67, and the skull is now a separate marker, so the name is actively misleading beside a skull mechanic. Out of scope by the ticket (§6 Q3); it will read as a bug in the play-test if not addressed.
9. **Whether `.docs/game_rules/the-hunt.md` should in fact be rewritten by `/fb-apply`'s Step 6.5.** The ticket defers it; the `implementation-doc-writer` skill mandates it on every run that changes a rule. Say so before that step runs if the ticket's deferral should win.

## Behaviour to judge by playing — §8's four measurements

None of these need instrumentation; play a few hands and watch:

1. **Count the tricks you deliberately dodge.** If you never throw a skull trick, the inversion is not producing a decision and the mechanic has not fixed what the old Standing band failed at. **This is the falsifier for the whole design.**
2. **Count how often you were *forced* to eat a skull** — no legal card that lost the trick. If that's most of them, the shape readout (AC11) isn't enough and the rank distribution needs work; if it's almost none, density is too low to threaten.
3. **Record your biggest cash-out each hand.** That number is what the Quarry's health placeholder (decision 1 above) has to be set against — it's the only honest way to get it.
4. **Did the multiplier ever change a decision?** If you never once played differently because the multiplier was high, it is decoration and should be cut rather than tuned.

## Verification results (Phase 4), quoted

Run in this order — projects warmed first, per `web-project.md`'s cold-cache note:

- `npx vitest run --project node` → `Test Files  27 passed (27)`, `Tests  419 passed (419)`, exit 0.
- `npx vitest run --project dom` → `Test Files  12 passed (12)`, `Tests  62 passed (62)`, exit 0.
- `npm run typecheck` → exit 0, no output.
- `npm run lint` → exit 0, no output, 0 warnings.
- `npx prettier --check` scoped to this contract's changed files → **first run failed**, exit 1, 5 files needing reformatting (`src/warCouncil/__tests__/bank.test.ts`, `src/warCouncil/__tests__/skulls.test.ts`, `src/warCouncil/skulls.ts`, `src/app/warCouncil/QuarryShape.tsx`, `src/app/warCouncil/TrickWell.tsx`). Reformatted with a scope-matched `prettier --write` (not the repo-wide `npm run format`, to avoid touching pre-existing non-conformant `.docs/**` files as a side effect) — re-check then passed: `"All matched files use Prettier code style!"`, exit 0. All of the above (Vitest projects, typecheck, lint) re-run clean afterward with identical pass counts, confirming the reformat was whitespace-only.
- Task 21's pure-core boundary grep (`src/warCouncil`, `src/hunt`, pattern `from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random`) → 2 hits, both inside comments *documenting* that `Math.random` is not used (the injected `rng` is used instead). No live violation. Boundary holds.
- Task 22 Step 1's AC13 deletion-name grep → 3 genuine stale-comment leftovers found and fixed in files this contract already modifies (`src/App.tsx`, `src/hunt/config.ts`, `src/hunt/encounter.ts` — all referenced the retired `applyHunt`/`resolveStanding` names in prose; fixed as unambiguous comment-only edits, re-grep confirms gone). 9 hits remain: 4 are this contract's own deliberate "retired on DLR-80" documentation (kept — they name what's gone, not something still live); 5 are a **genuine finding outside this contract's scope** — see below.
- Task 22 Step 2's literal-configuration grep (`\b(13|1350|1600)\b`) → 10 hits; 1 is the named exception (`FAN_LIFT_FACTOR = 0.13`), the other 9 are benign generic test inputs or an unrelated CSS sizing ratio (`font-size: calc(var(--wc-card-w) * 0.13)`) — none is a hard-coded trick-count, health, or damage literal.
- Task 23's 400-line budget scan (`(Get-Content <path>).Count` over every `.ts`/`.tsx` file) → **no output** — zero files over 400 lines.

**Not run by the Implementer — QA's, per this contract's division of labour for Final verification:**

- Task 24 Step 2's unfiltered `npm test` — `Run: npm test` — Expected: exit 0, Vitest reports 0 failed, quote the `Tests  N passed` line.
- Task 24 Step 4's repo-wide format gate — `Run: npm run format:check` — Expected: report the actual result and name which failing files are pre-existing (`.docs/**`, per `web-project.md`) versus introduced by this contract; do not fix the pre-existing failure as a side effect.
- Task 24 Step 5's production build — `Run: npm run build` — Expected: exit 0, `dist/` written, no bundler errors (note: `build` runs `lint` first, so a lint regression would surface here too).

## Findings for reviewers (not fixed — outside this contract's scope)

- **`src/app/warCouncil/duelHealthBars.ts` (lines 29, 31, 43, 47) and `src/app/warCouncil/DuelHealthBars.tsx` (line 27) still say `applyHunt` in prose docblocks.** The actual exported function was renamed `applyDamage` by Phase 2 (`src/hunt/encounter.ts`). Neither file is in this contract's file map at any phase, so it was left unedited here per the Implementer's scope rule and reported instead. A one-line comment fix in each ("`applyHunt`" → "`applyDamage`"), no behaviour change.
- **`roundReducer.test.ts` was split.** It measured 428 lines after Task 12's rewrite, over the 400-line budget, and the bank cash-out tests moved to a sibling `src/app/warCouncil/__tests__/roundReducer.bank.test.ts`, matching the codebase's existing split pattern (`WarCouncilRound.duelHealthBars.test.tsx`).
- **`quarryShapeText` has a minor duplication.** `QuarryShape.tsx` reproduces the per-row phrase inline because `labels.ts` exports only the whole-shape joined sentence, and extending it was outside Phase 3's file scope. Extracting a shared `suitShapeRowText` in `labels.ts` is a clean follow-up, not a defect.

## Unverified

This report covers typecheck, lint, scoped Vitest runs (both projects), the 400-line budget, the boundary/deletion/literal greps, and scoped formatting — all actually run, with output quoted above. It does **not** cover: the unfiltered test suite or the production build (QA's, listed above); anything about how the game *feels* to play — whether a dodge reads as a decision, whether the bank climbing is satisfying, whether the shape readout is legible at a glance, whether the health bar at 25 steps reads well, whether the mid-hand cash-out ending a fight feels abrupt. None of that can be observed without a human running the app; see the "Decisions the developer must make" and "Behaviour to judge by playing" sections above.
