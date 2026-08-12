# DLR-69 — The Lose path's pile swap and the two card-value schemes

Plan: `.claude/contract/DLR-69-lose-path-pile-swap/plan.md`
Jira: **DLR-69**

## Summary

Closes DLR-68's deliberate interim in `spoils`, which valued each side's *own* capture pile
under whichever value scheme the declaration put in force. On Lose that is the wrong pile —
`hybrid-design.md` lines 42–44 say a player who declares Lose is paid for the cards **the
Quarry** captured, at inverted value (`12 − r`), and the Quarry is paid for the cards **the
player** captured, at inverted value. Each pile is counted exactly once, by the side that did
not win it.

The pile is now a second axis of the declaration, bound to the value axis in one
`CardValueScheme` (`{ value, paidPile }`) rather than travelling as two separable parameters —
a caller who injected the Lose value function while the pile defaulted from an undeclared state
would land on exactly the interim this ticket retires. `src/hunt/config.ts` states the rule as
data in a total `Readonly<Record<HuntDeclaration, CardValueScheme>>`; `spoils` resolves the
relative `paidPile` into a concrete seat via `otherSide`; `scoring.ts`'s `huntDamage` resolves one
scheme and hands it to both seats unchanged.

`src/warCouncil/__tests__/huntEnumeration.test.ts`'s `LOSE_SPLITS_OWN_PILE` — DLR-68's interim
fixture — is replaced by §8's transcribed Lose column in full (all fourteen rows,
`hybrid-design.md` lines 1001–1021), including the four flagged rows (`k = 0`, `k = 4`, `k = 9`,
`k = 13`) exactly as published. The `k = 0` row gets its own named test asserting **+78** to the
player — the discarded branch's own falsifier: if both sides counted the Quarry's pile, a player
who declares Lose and wins zero tricks would finish 78 *behind* instead of 78 ahead
(`hybrid-design.md` lines 208–214).

## Two decisions the developer owns

Restated verbatim from `tasks.md`'s "Developer decides or observes":

1. **The `src/hunt/config.ts` scope extension.** The ticket's own file list names
   `src/warCouncil/spoils.ts`, the damage module, `types.ts`, and `index.ts` — not `src/hunt/`.
   AC6 (the two schemes exhaustive over the declaration union) cannot be honoured on the value
   axis without converting `cardValueFor`'s `declaration === Lose ? inverted : base` ternary into
   a total record, and the pile axis had to live beside it or the declaration→value mapping would
   exist in two files. **This was approved at the Step 3 plan gate.** `plan.md`'s Risks section
   writes out options (b) — keep everything in `spoils.ts`, leaving AC6 half-satisfied — and (c) —
   duplicate the mapping into a warCouncil-side record, creating a second source of truth — if this
   is ever revisited.

2. **`DeclareGate.tsx:46-47`'s copy now states the opposite of the rule, and every UI file is out
   of scope for this contract.** It currently reads: "Cards invert — a 1 scores 11. Every trick
   you take still adds both its cards to **your** Spoils, at those inverted values." Under the
   swap, a trick you take now adds its cards to the **Quarry's** value, not yours. Three options,
   and the wording in any of them is the developer's:
   - Accept the wrong sentence in the prototype until a UI ticket lands.
   - Widen a follow-up ticket by exactly one file for a copy-only edit.
   - File that follow-up ticket now, unstarted.

## One behaviour only judgeable by playing

`HuntLedger.tsx:34-37`'s "Running Spoils" and `RoundOverPanel.tsx:87-90`'s "Spoils" labels are
neutral enough to survive compiling and typechecking untouched — they name the additive term
without claiming whose cards it came from. But on a Lose-declared Hunt they will now display the
**Quarry's** pile value under the **player's own heading**. Whether that reads honestly, or reads
as a bug, is a feel judgement answerable only by playing it — not a functional check, and not
QA's to close out.

## Verification (Phase 4, this run)

**Vitest — full unfiltered suite** (after warming both projects separately, per
`.claude/workflow/web-project.md`'s cold-cache note):

- `npx vitest run --project node` → 27 files, **516 passed**, exit 0.
- `npx vitest run --project dom` → 9 files, **52 passed**, exit 0.
- `npm test` (unfiltered) → 36 files, **`Tests  568 passed (568)`**, exit 0.

**Typecheck / lint:** `npm run typecheck` exit 0. `npm run lint` exit 0.

**The four greps the ticket asks for by name:**

1. **Pure-core boundary** (`Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx |
   Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`) —
   **zero hits.**
2. **AC3, no Treasure/Poison branch in the value path** (`Select-String -Path
   src\hunt\config.ts,src\warCouncil\spoils.ts,src\warCouncil\scoring.ts -Pattern
   "CardRank\.(Treasure|Poison)|Treasure|Poison"`) — **2 hits, both prose, neither a branch:**
   `config.ts:156` and `spoils.ts:16`, both doc-comment sentences stating the modifier is
   *Decided-removed* and does not apply. No `CardRank.Treasure` / `CardRank.Poison` identifier and
   no conditional branch appears in any of the three files. (The plan's audit predicted zero
   hits in these three files and 3 hits in `spoils.test.ts`; the two comment hits found here are
   a minor prediction miss, not a defect — they document the absence of the modifier rather than
   implementing one.)
3. **Retired fixture name** (`Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String
   -Pattern "LOSE_SPLITS_OWN_PILE|own-pile|interim own"`) — **1 hit, not the retired identifier:**
   `huntEnumeration.test.ts:61`, the descriptive prose Task 5 itself introduced ("Replaces DLR-68's
   interim own-pile column…"), matched by the `own-pile` alternative in the pattern. The retired
   identifier `LOSE_SPLITS_OWN_PILE` itself has **zero hits**, which is the actual claim this grep
   exists to prove.
4. **Exactly one place selects a pile** (`Get-ChildItem src -Recurse -Include *.ts,*.tsx |
   Where-Object { $_.FullName -notmatch '__tests__' } | Select-String -Pattern
   "capturedCards\["`) — **exactly 2 hits**, as predicted: `src/warCouncil/playCard.ts:111` (the
   accumulator writing a captured trick into the winner's pile) and `src/warCouncil/spoils.ts:31`
   (the single reader that decides which pile is valued).

**File line counts** (`(Get-Content <path>).Count`, not `Measure-Object -Line`):

| File | Lines | Baseline before this contract |
|---|---|---|
| `src/hunt/config.ts` | 270 | 221 |
| `src/hunt/index.ts` | 32 | — |
| `src/hunt/__tests__/config.test.ts` | 330 | 287 |
| `src/warCouncil/spoils.ts` | 32 | 26 |
| `src/warCouncil/scoring.ts` | 171 | 167 |
| `src/warCouncil/__tests__/spoils.test.ts` | 128 | 93 |
| `src/warCouncil/__tests__/scoring.test.ts` | 249 | 238 |
| `src/warCouncil/__tests__/huntEnumeration.test.ts` | 142 | 120 |

All eight files are under 400 lines. `config.ts` (270) and `config.test.ts` (330) land in the
200–400 "second look" band the task flagged in advance — both are reported rather than only
passed, and neither is close to the 400-line blocking threshold.

**Formatting:** the scoped `npx prettier --check` on this contract's eight files failed on first
run (`spoils.test.ts`, `huntEnumeration.test.ts` — whitespace/wrapping only). `npx prettier
--write` was run on those same eight paths, per the step's explicit authorisation, and the scoped
check now passes (exit 0). Both reformatted files were re-run through Vitest, typecheck, and lint
afterward with no change in result. `npm run format:check` (repo-wide, AC7's literal wording) was
run and **fails on 29 pre-existing files**, all under `.docs/**` and `.github/**` — none touched by
this or any current contract. Reported per the standing note in `.claude/workflow/web-project.md`,
not fixed.

**Production build:** `npm run build` → lint clean, `tsc -b` clean, Vite build succeeded, `dist/`
written (`index.html`, `index-*.css` 17.67 kB, `index-*.js` 222.01 kB), exit 0.

## Convention note for future contributors

A fact the declaration decides gets a total `Readonly<Record<HuntDeclaration, …>>` and an
accessor — never a ternary, because a ternary's "else" branch silently absorbs a third case a
`Record` would reject at compile time. And two facts that must not be read apart — here, *what a
rank is worth* and *whose pile you're paid for* — travel in one object (`CardValueScheme`), never
as two separately-defaulted parameters, because two parameters lets a caller supply one and let
the other default from an unrelated source.

## Known review item (closed in the post-review fix pass)

Phase 2's Task 2 Step 1 instructed keeping the pre-existing `'reads an undeclared round as Win'`
test in `spoils.test.ts` when replacing the surrounding `describe` block. It was removed along
with the block instead — a coverage loss on `spoils`'s default-parameter path against an
undeclared state, flagged by all three reviewers (Code-Evaluator, Defender, QA) in the same
review round.

The gap is now closed. A new test, `'reads an undeclared round as Win, identically to a declared
one'`, was added to the `'spoils — the declaration decides WHOSE pile a side is paid for (DLR-69
AC1, AC2)'` block in `spoils.test.ts`, reusing that block's own asymmetric `captured` fixture and
`declared()` helper. It builds an undeclared state over the same fixture and asserts the result
equals the explicitly-Win-declared result for **both** `'player'` and `'cpu'` — covering the
default `scheme` parameter on both axes (value function and paid pile), which is what the
original test covered before the rewrite. The test was confirmed non-tautological: a temporary
break of the default's declaration-presence handling in `spoils.ts` made it fail as expected,
then the production file was reverted to its exact prior state (`git diff` empty) and the suite
re-confirmed green. No production file was changed by this fix pass.

## Known review item (closed in the round-2 fix pass)

Round 1's own fixture — `player: [{ rank: 1 }]`, `cpu: [{ rank: 11 }]` — was found during round 1's
tautology check to be a mirror pair under `RANK_INVERSION_PIVOT` (12): `12 − 11 = 1` and
`12 − 1 = 11`, so own-pile-at-printed-rank (Win) and other-pile-at-inverted (Lose) both produced
`1` for the player and `11` for the Quarry. The AC1 and AC2 tests therefore asserted the same two
numbers as each other and could not distinguish the implemented pile-swap rule from an
implementation that never swapped the pile at all. The block's own comment claimed the fixture was
"deliberately asymmetric" and would prove the failure mode it named — it did not have that
property, because any rank pair summing to the pivot has this defect.

The fixture is now `player: [{ rank: 2 }]`, `cpu: [{ rank: 11 }]` — summing to 13, not 12. Win
gives `cardBaseValue(2) = 2` / `cardBaseValue(11) = 11`; Lose gives `invertedCardValue(11) = 1` /
`invertedCardValue(2) = 10`. All four numbers differ from their counterpart under the other
scheme. Falsified directly: `spoils.ts`'s pile selection was temporarily forced to always read the
side's own pile (`const paidFor = side`), and the AC2 test ("pays each side for the OTHER side's
pile … on Lose") failed as expected (`expected 10 to be 1`) — where under the old rank-1/rank-11
fixture it would have passed. `spoils.ts` was then reverted to its exact prior content (`git diff`
against this pass's start shows no net change) and the full suite re-confirmed green at
`Tests  569 passed (569)`. No production file was changed by this fix pass.
