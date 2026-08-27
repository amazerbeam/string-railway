# DLR-152 — Two-branch buff projection: what would fire if you play THIS card, take it or not

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

Adds one new pure module, `src/warCouncil/buffProjection.ts`, that answers, for a single candidate
card in the player's hand, "which activated buffs would fire and what would they pay — if the
player takes this trick, and if the player does not." It answers both branches by calling the
**same** `firedBuffs` and `resolveFiredBuffs` the real trick resolution calls, so a preview can
never disagree with the commit. Where the answer genuinely is not knowable because the Quarry's
card is face down, the module reports the indeterminacy (`indeterminate`, `skullKnown`) instead of
guessing it. It also exposes `buffReach`, counting how many of the player's currently-legal cards
could fire a given buff.

Alongside it: a small widening in `src/warCouncil/buffTrickFacts.ts` — the existing `Suit →
BuffTargetSuit` crossing is now also exported as `targetSuitOf(suit)`, so the projection reuses the
single existing statement of that map rather than restating it (`TARGET_SUIT` itself stays private
and total). `src/warCouncil/index.ts` re-exports `targetSuitOf`, `buffReach`,
`projectBuffBranches`, and the five projection types.

**Nothing visible changes.** No component consumes the new module yet — that is the activation-UI
ticket this one blocks. The whole ticket is verified by Vitest and the static gates.

## The one design departure from the ticket, stated plainly

DLR-150 gave `resolveFiredBuffs` a third argument, `trickIsLoss`, so the `playerWon: false` branch
is a **Dodge** under a skull and a **Clean Loss** without one — and a fired Feeder pays into this
hand in the first case and carries into the next hand in the second (DLR-150's Feeder carry). To
honour that without guessing, each branch returns `outcomes: readonly BuffBranchOutcome[]` — one
entry per still-possible `TrickOutcome` (one when the skull is known, two while the player leads) —
rather than a single accrual. This was approved by the developer at the plan gate (Step 3 approval,
recorded in `tasks.md`'s File map section).

## Recorded limits

- `playerHit` and `bankAfterTrick` are **caller-supplied**, not branch-derived. Only the two cut
  condition families — Unbloodied (`tricksWithoutHit`) and Hoarder — read them; deriving them here
  would mean restating the outcome→damage and outcome→bank-climb rules `bank.ts` already owns. A
  ticket that restores either family will need to revisit this.
- **No `gain` delta is exposed.** The UI can subtract two accruals itself; adding a second
  arithmetic surface here would be the duplication this ticket exists to prevent.
- **`reach` counts a card whose buff is indeterminate.** "Could" includes "might" — reporting 0 for
  a buff that may well pay would read as "this buff is dead" at exactly the moment the player is
  deciding whether to activate it.

## Verification results (Phase 3)

- **File line counts** (`(Get-Content <path>).Count`): `buffProjection.ts` 206, its spec
  `buffProjection.test.ts` 297, `buffTrickFacts.ts` 68 — all under the 400-line budget.
- **Pure-core boundary grep** (Task 9 Step 1): 2 hits in `src/warCouncil/**`, both docblock prose
  in pre-existing, unrelated files — `encounterDeck.ts:8` and `skulls.test.ts:29`, both mentioning
  `Math.random()` in prose rather than calling it. Zero hits in the files this contract touches.
- **Second condition-switch grep** (Task 9 Step 2): zero hits in `buffProjection.ts` — every
  condition decision is delegated to `buffFires` via `firedBuffs`.
- **Scoped Prettier check** (Task 10 Step 2): `buffProjection.ts` and its spec initially failed
  formatting; `npx prettier --write` applied to exactly those two paths, then all four touched
  files (`buffProjection.ts`, `buffProjection.test.ts`, `buffTrickFacts.ts`, `index.ts`) reported
  clean.
- **Scoped Vitest**: `Test Files  2 passed (2)`, `Tests  24 passed (24)` across
  `buffProjection.test.ts` and `buffTrickFacts.test.ts`, re-run after the Prettier rewrite to
  confirm nothing broke.
- **Static gates (typecheck / lint / format:check / unfiltered `npm test`) and `npm run build`**
  are QA's Task 11, not run by the Implementer — see below.

## Delegated to QA

- Task 11, Step 1 — `npx vitest run --project node; npx vitest run --project dom` — Expected: both
  exit 0.
- Task 11, Step 2 — `npm run typecheck; npm run lint; npm test` — Expected: all three exit 0; quote
  the `Tests  N passed` line for the full suite.
- Task 11, Step 3 — `npm run format:check` — Expected: reported, not gated; pre-existing `.docs/**`
  failures (if any) are not this contract's to fix.
- Task 11, Step 4 — `npm run build` — Expected: exits 0, `dist/` written, no bundler errors.

## Note for future contributors

`buffProjection.ts` is a thin adapter and must stay one — no `switch` over `BuffConditionKind` may
ever be added to it, because `buffFires` is deliberately total so a new family fails to compile
there rather than silently never firing.
