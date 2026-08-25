# PR: Cheat, Timebomb and Shield become single-use (reversibly); buff tier shown on the loadout rail

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

Cheat, Timebomb and Shield are single-use by default via the reversible `ACTIVATED_CARD_SINGLE_USE` toggle in `src/hunt/consumables.ts`; `activateShield` is now wired into the felt layer (`handleTapBuff` in `src/app/warCouncil/buffHandlers.ts`); and every buff row on the loadout rail states its tier (Bronze / Silver / Gold), via a new `BUFF_TIER_WORD` prefix in `buffLine` (`src/app/warCouncil/buffLabels.ts`).

Also included: a necessary but originally-unlisted fix discovered during Phase 3 — `spendConsumable`'s own guard in `src/hunt/consumables.ts` still checked `isConsumableItemKind` (the unchanged five-item DLR-111 set) instead of `isConsumableItem`. Without this fix, `activateFromPile` calling `spendConsumable` on a Cheat/Timebomb/Shield threw a `RangeError` instead of removing the card, because the guard and the caller's decision predicate had silently diverged. The fix makes the guard call `isConsumableItem(found)`, consistent with the exact predicate `activateFromPile` already uses to decide whether to call `spendConsumable` at all. It required flipping one additional pre-existing test in `src/hunt/__tests__/consumables.test.ts` and one additional latent assertion in `roundReducer.test.ts` (AC7) that weren't in the original Task 5–9 list but asserted the same stale pile-persistence behaviour.

## Judgement calls for the developer to sanity-check

1. **Wiring `activateShield` and defaulting its toggle to `true` even though nothing mints a Shield yet.** `roundBars.ts` already notes `shieldHearts` stays `0` in real play until something drops a Shield buff into a drawable pool — this PR wires the mechanism correctly (confirmed by direct unit coverage of `activateShield` and `handleTapBuff`) but the effect remains unreachable through actual play until a separate ticket adds a Shield source. See `plan.md` Part 2 → Risks and judgement calls.
2. **The `Bronze` / `Silver` / `Gold` tier-word wording** prefixed onto every loadout row's visible text and accessible name (e.g. `Bronze Cheat (Free Rein) — ...`). Confirm this is the wording you want on the felt.

## Verification results (Task 13)

- **Typecheck** (`npm run typecheck`) — **PASS**, exit 0, no errors.
- **Lint** (`npm run lint`) — **PASS**, exit 0, no warnings.
- **Full suite** (`npm test`) — **FAIL**. `Test Files 3 failed | 137 passed (140)`, `Tests 12 failed | 1821 passed (1833)`.
- **Production build** (`npm run build`) — **PASS**, exit 0, `dist/` written (`index.html`, `index-*.css`, `index-*.js`), no bundler errors. (The build script runs lint + `tsc -b` + `vite build` internally, all three succeeded.)

### The 12 test failures — a real regression from this contract's own Phase 3 / Phase 4 interaction, not the known pre-existing `scripts/query-furthest.ts` issue

Phase 4 (Task 10) prefixes `buffLine`'s output with the tier word (`Bronze ` / `Silver ` / `Gold `), and that string flows into `buffRowAccessibleName`, which composes the aria-label every loadout-rail button test queries. Phase 3's own test files (updated earlier in this contract, before Phase 4 ran) query those buttons by role name using regexes anchored to the *un-prefixed* name — `screen.getByRole('button', { name: /^Cheat \(/ })` and `/^Timebomb \(/`. Those anchors no longer match now that the accessible name starts with `Bronze Cheat (...)` / `Bronze Timebomb (...)`.

Failing files and exact anchor locations:
- `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx:91` and `:147` — `/^Cheat \(/`
- `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx:185` — `/^Cheat \(/`
- `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx:52` and `:71` (the `timebombRow()` helper, called from 9 of that file's tests) — `/^Timebomb \(/`

This is not the pre-existing, out-of-scope `scripts/query-furthest.ts` issue mentioned in this phase's task brief — that issue did not surface in this typecheck run at all. This is a genuine interaction between two of this contract's own phases: Phase 4's file map (`buffLabels.ts` + `buffLabels.test.ts` only) never touched the three `WarCouncilRound.*.test.tsx` files whose role-name regexes assume the pre-Phase-4 accessible-name shape. Phase 3's self-review claimed "after this phase the full suite is expected to pass," which was true only until Phase 4 landed afterward.

**Not fixed in this phase** — Phase 5's task brief scopes this phase to verification only ("No production changes — only sanity-checks"), and a test-file edit to loosen or update these three regex anchors is outside this phase's own file map. Flagging as a blocker for the orchestrator to route: the fix is mechanical (update each anchor to tolerate the tier prefix, e.g. `/^(Bronze|Silver|Gold) Cheat \(/` or query by a stable non-text attribute instead) and touches only the three test files named above — no further production code.

## Reverting to "stays in the pile"

Reverting any one of Cheat/Timebomb/Shield to "stays in the pile" is a single boolean flip in `ACTIVATED_CARD_SINGLE_USE` (`src/hunt/consumables.ts`) — no other file changes.
