# DLR-143: Rework Apply Damage — leader-only press, Timebomb stacking, 1-trick settle, ⅓ loss retention

Plan: [`plan.md`](./plan.md) in this contract folder.

## Summary

Apply Damage's press-time gating, settle delay, and hit-retention math didn't match the intended design. This corrects all three in one pass:

- **Leader-only press.** `applyDamageRefusalFor` now refuses whenever `state.round.currentTrick.length > 0` — Apply Damage must be pressed before any card, including the Quarry's own lead, is on the table. Previously it was pressable mid-trick.
- **Timebomb stacking (reverses D6, version-4-scope §3, decided 2026-08-19).** A pending Timebomb no longer refuses the press — `ApplyDamageRefusal.TimebombPending` is **deleted**, not renamed. A Timebomb detonating on the same trick and a due Apply Damage payout now both resolve in that trick's fold, through `commitHandlers.ts`'s existing four-step order (unchanged — no new fold logic was needed).
- **1-trick settle.** `APPLY_DAMAGE_DELAY_TRICKS` changed from `1` to `0`, so a queued payout now settles at the resolution of the very next trick after the press, not two tricks later.
- **⅓ retention on a hit.** `APPLY_DAMAGE_HIT_RETENTION` changed from `0.6` to `1/3` (still floored). A trick that costs the player red health while a payout is queued now keeps a third of the frozen figure instead of 60%. The reduction mechanism itself is unchanged — only the fraction moved.

## Reason vocabulary

New five-clause refusal order: `NotYourMove → TrickInProgress → PayoutPending → InsufficientAp → EmptyBank`. `TrickInProgress` takes `TimebombPending`'s exact ordinal slot — this order is this plan's placement, not a brief-specified one, and is flagged for the developer to sanity-check by feel in the running app (see Developer sanity-checks below).

## Developer sanity-checks (nothing here blocks the ticket — flagged for a look, not a decision)

- **The five-clause refusal order.** Whether reporting `TrickInProgress` immediately after `NotYourMove` reads right in the two-tap flow — a player mid-poise when the Quarry leads should see "the table is already live," not a stale AP or empty-bank message.
- **The refusal copy** (`'Only before a trick starts — the table is already live.'`) is placeholder, exactly as every other string in `labels.ts` is documented to be. The developer's to rewrite by feel.
- **Whether the leader-only gate and the one-trick settle feel right in actual play** — a running-app question, not a static one. No browser pass ran this invocation (not requested).

## Verification results

- Typecheck: PASS (`tsc -b`, exit 0)
- Lint: PASS (`eslint .`, exit 0, zero warnings)
- Full test suite: PASS — 140 test files, 1841 tests, 0 failed
- Production build: PASS — `dist/` written, no bundler errors

## Review notes

Two rounds of review ran. Round 1 (Code-Evaluator + Defender + QA, all three dispatched since this changes production logic) converged on one real defect: `src/app/warCouncil/__tests__/actionBarLabels.test.ts` — a file outside every task's stated file list — hardcoded the pre-change "60%" wording (derived via `PAYOUT_QUEUE_RISK_HINT` from `APPLY_DAMAGE_HIT_RETENTION`) and broke the moment the retention constant changed. Fixed in a single combined fix pass; round 2 (Code-Evaluator) approved.

**Worth remembering for future reason-code removals:** an identifier-only grep for `TimebombPending` during planning missed two behavioural tests in `roundReducer.applyDamage.test.ts` that exercised the same D6 rule through the real reducer without ever naming the string. The plan caught this itself at the gate and scoped a rewrite for both tests plus a new stacked-fold test — worth the same care next time a reason code is removed rather than renamed.

## Docs

`.docs/game_rules/the-hunt.md` and the relevant `.docs/implementation/` pages (`war-council/voluntary-cash-out.md`, `hunt/delayed-apply-damage-payout.md`, `war-council-ui/apply-damage-plate.md`, plus a correction in `hunt/timebomb-and-the-delayed-hit.md`) were updated by `implementation-doc-writer` in the same pass, not by hand.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
