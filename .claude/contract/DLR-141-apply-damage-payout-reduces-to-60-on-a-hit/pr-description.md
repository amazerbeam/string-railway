# DLR-141 — Apply Damage payout reduces to 60% (floored) on a hit, not destroyed

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

A queued Apply Damage payout no longer wipes to zero the moment a hit costs the player red
health. It now reduces to `APPLY_DAMAGE_HIT_RETENTION` (60%) of its frozen `cashOut`, rounded
down, and stays in the air on its existing countdown. The rule now has three outcomes, matching
the developer's confirmed table:

| Situation | Queued payout |
|---|---|
| Player loses health from a hit | **60% of its value, rounded down** |
| Hit fully absorbed by blue hearts | **100% — untouched** |
| Encounter ends (Quarry dies, or player dies) | **0 — evaporates** |

`PayoutOutcome` is now a three-member union (`Paid` / `Reduced` / `Evaporated`), replacing the old
two-member `Paid` / `Destroyed`. `TrickPayoutEvent` gained a required `remaining: number | null`
field so a `Reduced` event can narrate both the frozen figure and what survived. The felt's copy
and the queued-payout risk hint are updated to match, and both stop claiming a hit destroys the
payout outright. `.docs/game_rules/the-hunt.md` is corrected to describe the new rule and its
three outcomes.

## What changed

- **`src/hunt/apConfig.ts`** — new `APPLY_DAMAGE_HIT_RETENTION = 0.6` constant, the only new
  tuning value in this change (stated verbatim on the ticket).
- **`src/hunt/applyDamagePayout.ts`** — `PayoutOutcome` is now `Paid` / `Reduced` / `Evaporated`;
  `TrickPayoutEvent.remaining` added; new pure `reduceApplyPayoutOnHit` function.
- **`src/hunt/encounter.ts`** — `applyDamage`'s single enforcement point now reduces (not wipes)
  the queued payout on `playerLostHealth`, still evaporating it in full on `winner !== null`.
- **`src/app/warCouncil/commitHandlers.ts`** — derives the three-way payout event across the
  `applyDamage` call.
- **`src/app/warCouncil/payoutLabels.ts`** — three-outcome copy; the risk hint's percentage is
  derived from `APPLY_DAMAGE_HIT_RETENTION`, never a hard-coded literal.
- **`src/app/warCouncil/TrickWell.tsx`** / **`warCouncilTable.css`** — the outcome CSS class binds
  to `Evaporated` (renamed from `wc-is-destroyed` to `wc-is-evaporated`); `Reduced` reads in the
  same quiet tone as `Paid`.
- **`src/app/warCouncil/actionBarLabels.ts`** — no code change; the existing queued-payout
  countdown (`queuedPayoutText`, already derived from `applyDamageDelayTricks`) is verified and
  hardened with a test computed from `applyDamageDelayTricks() + 1` rather than a literal.
- **`.docs/game_rules/the-hunt.md`** — corrected via `implementation-doc-writer` to state the new
  three-outcome rule, citing the code and clearing the stale full-wipe `[provisional]` reading.

## Test files touched

Beyond the contract's own Task 6 (`roundReducer.delayedApply.test.ts`), three pre-existing spec
files were found — during Phase 4's final verification — to be real, uncovered consumers of the
same `applyDamage` enforcement point Phase 1 changed, still asserting the old "wipe to `null`"
behaviour. These were outside the plan's file map (a plan-audit gap, not a design ambiguity — the
correct assertions were already fully determined by the ticket's confirmed rule), so the
orchestrator rewrote them directly rather than routing a mechanical fix through a design decision:

- `src/hunt/__tests__/shield.encounter.test.ts`
- `src/hunt/__tests__/ward.encounter.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`

All three now assert `cashOut: Math.floor(<queued> * APPLY_DAMAGE_HIT_RETENTION)` rather than
`null`, importing the constant rather than hard-coding the reduced figure.

## Not corrected — a plan citation defect, verified rather than actioned

The plan's Task 10 instructed correcting three "full wipe" passages in
`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`. Both the Phase 3 implementer and the
orchestrator independently verified that `hybrid-design.md` never contained those passages, or any
description of the delayed Apply Damage payout mechanic's on-hit behaviour at all — the quoted
text actually lives in `.docs/game_rules/the-hunt.md` (correctly fixed by Task 11). This is a
citation mix-up in the plan's audit, not a stale line number, and not something this ticket's
scope covers filling — no content was invented to match a citation that was never written.
**Flagged for `/fb-issue`** against the plan's Task 10 audit step.

Also surfaced, out of this ticket's file scope: `.docs/implementation/hunt/delayed-apply-damage-payout.md`
still describes the old full-wipe rule and is now stale relative to the code and to
`the-hunt.md` — a follow-up for `implementation-doc-writer`'s next invocation (Step 6.5 of this
`/fb-apply` run should pick it up).

## Developer decisions and things to judge by playing

From `plan.md` → Risks and judgement calls:

- **All copy is unapproved and unseen.** The mockup gate was skipped and no browser pass ran.
  Every changed string is listed above and in `tasks.md` with its before/after, so reversing any
  wording is a find-and-replace.
- **Whether a 60% survival makes a late Apply Damage press feel worth taking is a play question**,
  not a test question — no sim run or browser pass answers it.
- **The five pre-existing uncommitted working-tree files** (`BankMeter.tsx`, `WarCouncilRound.tsx`,
  `BankMeter.test.tsx`, `warCouncilHunt.css`, and the `APPLY_DAMAGE_AP_COST: 3 → 1` line in
  `apConfig.ts`) are untouched by this contract and remain the developer's to handle.
- **Whether the existing action-bar countdown text is prominent enough** — verified, not rebuilt.
- **Whether a same-trick reduce-then-pay should narrate the intermediate reduction** — currently
  narrated only as `Paid` at the final (already-reduced) figure.

## Verification results

- `npm run typecheck` — exits 0
- `npm run lint` — exits 0
- `npm test` — `Test Files 140 passed (140)`, `Tests 1826 passed (1826)`
- `npm run build` — exits 0, `dist/` written (`index.html`, `index-CIkQRQPV.css`, `index-cvwCg5Ny.js`)
- `npx prettier --check` on every touched file — clean after one scoped `--write` pass on 4 files
  that had drifted independently of this contract's own edits

## Note for future contributors

`TrickPayoutEvent.remaining` is **required-but-nullable** — every future construction site must
state it explicitly: `null` for the two terminal outcomes (`Paid`, `Evaporated`), a number for
`Reduced` (which may itself be `0` when the floored value reached zero).
