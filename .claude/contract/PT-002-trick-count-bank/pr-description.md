# PT-002 — The bank counts tricks, not card values

Plan: [`plan.md`](./plan.md)
Mockup (approved 2026-08-14): [`mockup.html`](./mockup.html)

## Summary

`resolveTrickBank` now adds **1 per trick taken** instead of both cards' printed ranks, so a
streak of _n_ cashes `n × n` — 1, 4, 9, 16, 25, 36 across a six-trick hand. `QUARRY_ENCOUNTER_HEALTH`
drops `[400]` → `[10]` to match the new, much smaller scale. The `× ` readout keeps its existing
form and two separate terms (`bank` and `multiplier` stay independent fields); the left term's
player-facing label changed from "Bank" to "Tricks", and the four outcome messages no longer say
"Both cards banked".

## Developer decides or observes

Carried verbatim from `tasks.md`'s File map → "Developer decides or observes":

- `src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH` — **planned as `[10]`, the developer's stated number.** At 10 the encounter is a walkover (random play wins 63.8%, ordinary play 73.3%, 1.9 hands, 36.6% of damage discarded as overkill). The consequence table for 15 / 20 / 25 / 30 is in `plan.md` → Risks. A different number is a one-line edit to this task.
- **The copy** — `TRICKS_LABEL`, `MULTIPLIER_LABEL`, and the four `TRICK_OUTCOME_MESSAGE` strings are the planner's placeholder wording, shown in context in `mockup.html`'s "Copy to red-line" table. `labels.ts` already marks this copy as the developer's.
- **Whether `n × n` feels better than the rank sum.** The measured claim is that the payout becomes predictable; the risk is that predictable reads as flat. Judge by calling the next cash-out before it fires — if you are right most of the time and it feels dull rather than readable, the rank jitter was load-bearing after all.
- **Whether the `bank` engine field should be renamed** (to `streakTricks` or similar) now that it holds a trick count. Deliberately not done here — see `plan.md` → Risks.

## Verification results (Phase 4)

**Task 5, Step 1 — pure-core boundary grep:**

```
Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"
```
Zero hits. Boundary holds.

**Task 6 — stale-name and retired-figure greps:**

- Step 1 (`BANK_LABEL`): zero hits.
- Step 2 (`card\.rank \+`): zero hits.
- Step 3 (`Both cards banked`): zero hits.
- Step 4 (`QUARRY_ENCOUNTER_HEALTH: readonly Health\[\] = \[10\]`): exactly one hit —
  `src\hunt\config.ts:24:export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [10]`.
- Step 5 (`wc-bank-figures`): one hit in `BankMeter.tsx:42` and one in `warCouncilHunt.css:207` — component and stylesheet still agree.

**Task 7, Step 2 — Prettier check, scoped to every file this contract changed:**

First run (all ten files) reported:
```
[warn] src/hunt/config.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```
This was a pre-existing formatting issue in `config.ts` unrelated to this contract's own edited
lines — multi-key-per-line object literals in the inactive `SKULL_WEIGHTS_*` maps, well outside the
`:14-27` range this contract's Task 3 touched. Ran `npx prettier --write src/hunt/config.ts` on
that file alone, then re-checked all ten files:
```
Checking formatting...
All matched files use Prettier code style!
```
Exit 0. Re-confirmed after the rewrite that the `QUARRY_ENCOUNTER_HEALTH` line (Task 6 Step 4) and
`npm run typecheck` both still hold.

**Task 7, Step 4 — line counts (400-line budget), extended to every file this contract changed:**

| File | Lines |
|---|---|
| `src/warCouncil/bank.ts` | 126 |
| `src/app/warCouncil/BankMeter.tsx` | 61 |
| `src/hunt/config.ts` | 181 |
| `src/warCouncil/playCard.ts` | 126 |
| `src/app/warCouncil/labels.ts` | 133 |
| `src/warCouncil/__tests__/bank.test.ts` | 118 |
| `src/app/warCouncil/__tests__/roundReducer.test.ts` | 308 |
| `src/app/warCouncil/__tests__/roundReducer.bank.test.ts` | 161 |
| `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` | 353 |
| `src/app/warCouncil/__tests__/BankMeter.test.tsx` | 34 |

All well under 400.

**Task 7, Steps 1 and 3 — PENDING QA.** The unfiltered `npm test` chain (Step 1: `npx vitest run
--project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`) and the
production build (Step 3: `npm run build`) are QA's alone per this contract's scope split. The
Implementer did not run either — no result to report here; do not treat this section's absence as
a pass.

## Note for future contributors

The `bank` field on `BankState` now holds a **trick count**, not a rank sum. `bank` and
`multiplier` are deliberately kept as two independent fields — not folded into one — so a later
"+1 ×" item can move one without moving the other.

## Review pass fixes

Three reviewers (Code-Evaluator, Defender, QA) ran in parallel over the finished contract; this
section covers the fixes applied in response.

- **`BankMeter.tsx`'s region `aria-label` fixed.** `<section aria-label="Bank and streak">` was a
  hardcoded string, not a `TRICKS_LABEL`/`MULTIPLIER_LABEL` read, so it survived the Phase 3
  rename and still used both retired words — the *only* accessible name the section itself
  carries, since its eyebrow and figures are all `aria-hidden`. Now built from the label
  constants: `` aria-label={`${TRICKS_LABEL} and ${MULTIPLIER_LABEL}`} ``, reading **"Tricks and
  Multiplier"**. Placeholder copy, same as the rest of this component's strings — for the
  developer to red-line alongside the rest. Added a regression test asserting the region's
  accessible name (`BankMeter.test.tsx`, `getByRole('region', { name: 'Tricks and Multiplier' })`)
  so it cannot silently drift again.
- **`src/warCouncil/types.ts`'s `RoundState.bank` JSDoc corrected.** This file was outside every
  phase's file map, so its comment still read "the summed ranks of every trick taken" — the
  pre-PT-002 meaning — after `bank.ts`'s parallel comments were already restated. Reworded to "the
  number of tricks taken in a row since the last cash-out," matching `bank.ts`. Comment-only; no
  type change.
- **Two test comments reworded**, in `roundReducer.bank.test.ts` and `WarCouncilRound.test.tsx`:
  both previously claimed the fixture's `500 × 2 = 1000` cash-out was "exactly this encounter's
  configured Quarry health," which was true when `QUARRY_ENCOUNTER_HEALTH` was `[1000]` but is now
  false at `[10]`. The tests still pass (`cashOut ≥ 10` empties the bar regardless), so this was a
  stale-comment defect, not a functional one. Now state the true relationship — the cash-out
  "comfortably exceeds" the encounter's 10-health Quarry. Fixtures and assertions unchanged.

`WarCouncilRound.test.tsx` held a second rank-sum assertion (`cashes for 11`, in the test titled
`'renders the shape readout for the dealt hand, and the bank readout climbs on a taken trick
(DLR-80 Task 20)'`, lines 319-346) outside every phase's stated line range. Found and fixed in
Phase 2 (corrected to `cashes for 1`), which the Phase 1 self-review's coverage claim had missed.

## Re-verification after the review-pass fixes

Scoped specs and static gates, all re-run after the fixes above:

```
npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx --project dom   -> 4 passed (4)
npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx --project dom -> 18 passed (18)
npx vitest run src/app/warCouncil/__tests__/roundReducer.bank.test.ts --project node -> 4 passed (4)
npm run typecheck  -> clean
npm run lint        -> clean
npx prettier --check <every file this pass touched> -> All matched files use Prettier code style!
```

The unfiltered `npm test` chain and `npm run build` remain QA's alone — not re-run here.
