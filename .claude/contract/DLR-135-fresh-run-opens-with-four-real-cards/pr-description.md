# DLR-135 — A fresh run opens with four real bronze cards

Plan: [`plan.md`](plan.md) · Tasks: [`tasks.md`](tasks.md) · Base commit `f56a51f` · Branch `Version-5`

## Summary

`seedStartingBuffPile` minted four `BuffKind.Unassigned` stubs carrying `UNASSIGNED_BUFF_CONDITION`
and a zero-value reward. `activatableBuffs` correctly filtered every one of them out, so **a player
opened a run holding exactly one usable card** — the guaranteed bronze Cheat from
`RUN_STARTING_CHEATS = 1`.

The stub factory's own docblock explained why it existed: *"since the real catalog (design doc §5) is
not yet authored (DLR-103 T7a)"*. That was DLR-105 — before DLR-111 authored the cards and DLR-112
built the reel that draws from them. The scaffold outlived its reason.

It now draws **four distinct, real, bronze-tier cards** from the full 73-template `BUFF_TEMPLATES`
pool, in a new pure module `src/hunt/startingPile.ts`:

- **Seeded.** `startRun` derives `startingPileSeedFor(runSeed) = mixSeed(runSeed)` and passes
  `createSeededRng` of it in. `rng` is a **required** parameter, never defaulted — a default would let
  a call site drop determinism with no compile error. Same `runSeed` ⇒ same opening hand.
- **Weighted with no new number.** `openingPileWeightOf` is the **sum of the existing
  `templateWeightFor` across both `SLOT_MACHINE_IDS`** — a derivation over the two shipped tables,
  contributing no coefficient of its own.
- **Distinct.** Drawn via `weightedDrawWithoutReplacement`, so four different cards, never duplicates.
- **Guarded.** A short draw throws `RangeError`, mirroring `drawReelPool`'s short-strip guard.

The module is deliberately the sibling of `slotMachine.ts`'s `drawReelPool` — one pattern applied
twice, not two designs. It could not stay in `buffs.ts`: it must import `buffTemplates.ts` and
`slotWeights.ts`, and both of those import `buffs.ts`. That is a forced move, not a preference.

## A run opens with five cards, and all five are now activatable

Four random real bronze draws plus the one guaranteed bronze Cheat. **The count is unchanged — it was
five before too.** What changed is that four of those five were inert placeholders the player could do
nothing with, so they effectively opened with **one**. They now open with **five**.

`RUN_STARTING_CHEATS` was deliberately left alone. **Whether a run should open holding a guaranteed
Cheat at all, and whether five is the right number, is a separate standing question that was not this
ticket's to settle.** Flagged because it is a number worth seeing stated.

## Simulator — AC2. An observation. Nothing was retuned.

`npm run sim -- --runs 200 --seed 1`:

| Figure | Before (`f56a51f`) | After |
|---|---|---|
| **Win rate** | **0.0%** (0 won / 200 lost / 0 stalled) | **0.0%** (0 won / 200 lost / 0 stalled) |
| **Mean buff activations per hand** | **1.50** | **2.86** |
| **Mean AP spent per hand** | **4.35** | **4.41** |
| **Hands holding NO activatable buff** | **0.0%** | **0.0%** |
| Mean fight reached | 0.46 | 0.52 |
| Mean coins earned | 0.84 | 1.07 |
| Mean damage to Quarry per hand | 2.29 | 2.44 |
| Max damage to player in one hand | 9 | 6 |

Activations per hand **nearly doubled**, which is exactly what the change was for. AP spent barely
moved — the AP pool, not the card supply, is the binding constraint.

**The win rate did not move off 0.0%.** DLR-120 measured 0 wins in 1,600 runs with 67.3–71.3% of hands
holding nothing activatable; DLR-132 took that to 0.0% with the win rate unchanged; this takes
activations to 2.86/hand with the win rate *still* unchanged. **DLR-135 was the last known confound.**
The player is demonstrably no longer starved of cards, so a 0% win rate now means the numbers are
wrong rather than the supply being empty. That is a finding for the balance pass — **nothing was
retuned in response to it.**

## AC3 — no tuning value changed

`git diff --stat f56a51f -- src/hunt/config.ts src/hunt/slotWeights.ts src/hunt/slotConfig.ts src/hunt/buffCosts.ts src/hunt/apConfig.ts`
returns **empty output**. `STARTING_BUFF_COUNT` is still 4, `RUN_STARTING_CHEATS` still 1. Verified
independently by the Defender and by QA.

## Three sub-decisions, each a one-line reversal

| Decision | Why | Reverse with |
|---|---|---|
| Draw from the **full 73-template pool** | A second, separate opening pool is a new tuning surface nobody asked for | Filter `BUFF_TEMPLATES` in `openingPileWeightOf`'s caller |
| **Cheat and Timebomb are eligible** | Ordinary pool members since DLR-132; excluding them re-introduces the special-casing that ticket removed. Bronze Cheat 3 AP, bronze Timebomb 2 AP — neither degenerate at bronze | `if (template.form === 'activated') return 0` in `openingPileWeightOf` |
| Weights are the **sum across both machines** | Machine-neutral; the opening pile is not a slot machine, and one machine's table would silently impose its lean | `templateWeightFor(SlotMachineId.Skirmisher, template)` |

## `BuffKind.Unassigned` survived — deliberately

**Nothing mints it any more**, which was the precondition for considering its deletion. It was still
not deleted, and that is a decision rather than an omission: it is the codebase's canonical *unpriced
kind*, read **by name** in five guard suites — `buffActivation.priced.test.ts`, `buffCosts.test.ts`,
`consumables.test.ts`, `ErrorBoundary.test.tsx` (which asserts the literal string
`apCostOf: no AP price for buff kind "unassigned"`), and `src/sim/reachability.ts`.

Deleting the member would force each of those to fabricate an unpriced kind through a cast, which
**weakens the very guard the ticket asked to preserve**. The *cause* is removed; the *guard* is
untouched — `isPricedBuff` and `activatableBuffs` are byte-identical, verified by the Defender.

A follow-up ticket could delete the member, but it must own rewriting those five fixture sites.

## Specs rewritten — none weakened

Verified against `f56a51f` originals independently by both the Code-Evaluator and QA.

| Spec | Change |
|---|---|
| `buffs.test.ts` | The `seedStartingBuffPile` describe block (4 tests) deleted — the function moved module, and `startingPile.test.ts` covers every property it asserted plus determinism and distinctness |
| `buffActivation.priced.test.ts` | Fixture swapped from live `seedStartingBuffPile` output to an explicit `unassignedPlaceholder()` literal. **Same assertions, same strength** — and arguably more robust, since the guard no longer depends on a production path continuing to mint its own test fixture |
| `buffCatalog.test.ts` | The all-bronze-and-`Unassigned` assertion is now false by design. **Replaced with a stronger three-assertion version** over the real `startRun().buffs`: all bronze, none `Unassigned`, all priced |
| `buffCatalog.test.ts` (2nd site) | **Planner gap, flagged.** A second `seedStartingBuffPile` use outside the audited line range broke at typecheck. Rewritten honestly against an explicit literal, not weakened. See *For future contributors* below |
| `reachability.test.ts` | Both opening-pile tests stopped being true statements of intent (Cheat is an eligible draw now). **Both replacements assert more:** the guaranteed Cheats are asserted as the pile's *final members* — a position claim the count-only original could not make — and every opening card is asserted activatable |
| `fixtures.ts`, `baselinePolicy.test.ts`, `consumables.test.ts` | **Comments only.** The code was still correct; only its stated reason changed |

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS — exits 0 |
| `npm run lint` | PASS — exits 0, no warnings, no `eslint-disable` added |
| `npm test` | PASS — **1816 passed / 1816, 140 files, 0 failures** (baseline 1808 / 139). Delta reconciles exactly: +12 from `startingPile.test.ts`, −4 from the deleted describe block |
| `npm run build` | PASS — exits 0, `dist/` written, no bundler errors |

Plus: 100 `throw new` sites (99 + the one new guard, **none weakened**); pure-core boundary holds; 3
real `Math.random()` call sites, all still in `App.tsx`; every changed file under 400 lines measured
post-Prettier with `(Get-Content <path>).Count`.

**Reviewers: Code-Evaluator APPROVED, Defender APPROVED (0 Critical, 0 Warning, 3 Info), QA ALL
PASSED — all on round 1, no fix pass needed.**

## The developer decides or observes

- **Whether the opening hand reads as a hand with a plan in it.** Four random bronze cards can be four
  Threshold-cadence cards that never fire in fight one, or four Event cards that all pay. The
  simulator reports the aggregate; it cannot report this. Start a run and look at the five cards.
- **The 0% win rate.** With the last confound removed, this is now a numbers problem. Nothing here was
  retuned toward it.
- **Whether five opening cards is right**, and whether the guaranteed Cheat should be one of them.
- **The three sub-decisions above**, each reversible in one line.
- **Whether to delete `BuffKind.Unassigned`** in a follow-up that owns the fixture rewrite.
- **Browser pass was not requested and did not run.** A dev server was already on 5173; none was
  started, none was killed. What a browser would have checked: the loadout panel on a fresh run
  showing **five named cards with real AP prices** rather than four "Blank card" rows reading "nothing
  yet", and a clean console on load and after a remount.

## For future contributors

- `src/hunt/startingPile.ts` establishes the second instance of `drawReelPool`'s shape: **derive a
  named seed from `runSeed` → weight the shipped tables → draw without replacement → throw on a short
  draw → mint at a fixed tier with consecutive ids.** If a third consumer appears, that is the point
  to extract a shared helper; at two, the shared portion is thin enough that extraction would mostly
  relocate a `RangeError` message.
- **`/fb-plan` Step 1.6 check 7 under-scoped a file, not a type.** The construction-site audit counted
  `seedStartingBuffPile`'s references correctly in aggregate but recorded one file as
  `buffCatalog.test.ts:169-178`, missing a second use at line 116 that broke at typecheck mid-phase.
  **The check should count sites per file, never per line range.** Worth an `/fb-issue`.
