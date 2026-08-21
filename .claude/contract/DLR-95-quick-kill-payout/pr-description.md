# DLR-95 — Quick-kill payout

Plan: [`plan.md`](./plan.md)
Mockup (verdict layout and copy, approved 2026-08-20): [`mockup.html`](./mockup.html)

## Summary

On top of the flat `COINS_PER_ENCOUNTER_WIN` a win already pays, the player is now credited one coin per card still unplayed in their hand at the instant the Quarry's bar empties, scaled by a tier depending on which hand *of that fight* the kill landed in.

- **`QUICK_KILL_TIER_MULTIPLIERS: readonly number[] = [2, 1, 0.5]`** in `src/hunt/config.ts` — one configuration key, transcribed verbatim from `version-4-scope.md` §4 ("×2 in the first hand, ×1 in the second, ×0.5 in the third, ×0 from the fourth on"), marked "Confirmed as final" there — not a tuning value this ticket chose. The array's *length* is the taper: a hand past the end of the curve pays 0 (AC5), so extending or shortening the curve is one edit here and no code change.
- **`src/hunt/quickKill.ts`** — a new pure module: the `QuickKill` shape (`unplayedCards`, `handOfFight`), `quickKillTierMultiplier` (throws `RangeError` on a non-positive-integer hand rather than indexing into `NaN`), and `quickKillPayout` — the *one* place `Math.floor` is applied to this figure (AC4), so a fractional third-tier result can never reach `Coins`. Exported from the `src/hunt` barrel.
- **`RunState.handOfFight`** (1-based, seeded `1` by `startRun`, held on the hand that ends a fight, advanced by `recordEncounter` only while the fight continues, reset to `1` by `advanceRun`) and **`RunState.lastQuickKillPayout`** (the receipt, written on every `recordEncounter` call, `0` included, so a stale figure never reads as this fight's).
- **The reducer's single capture site**: `roundReducer` in `src/app/warCouncil/roundReducer.ts` is now an exported wrapper (`captureUnplayed(applyAction(state, action))`) over a private `applyAction` holding the unchanged switch body. `captureUnplayed` freezes `RoundUiState.unplayedAtResolve` at the first transition after which the encounter reads resolved, and only there — covering all four ways a fight can currently end from one site instead of duplicating the read at each.
- **The verdict's receipt line**: `RunOutcomePanel` takes two new required props, `quickKillPayout` and `winCoins`, and renders `rewardText(winCoins, quickKillPayout)` in a `.run-reward` `<p role="status">`, gated on the outcome (not `canContinue`, since the final fight of a won run pays a quick kill too and `canContinue` is false there). The clause is entirely omitted at a 0 payout (AC5's taper read as copy).

## AC1's resolution — additive, developer, 2026-08-20

AC1 was ambiguous between the quick-kill payout **replacing** the flat win coin or being credited **beside** it. The developer resolved this additively on 2026-08-20: `recordEncounter` credits `run.coins + COINS_PER_ENCOUNTER_WIN + quickKill`. The alternative (replacement) would make a fourth-hand kill pay literally nothing for winning a fight — exactly the outcome the taper (AC5) is designed to avoid. **Do not "simplify" that sum back into a replacement** — it is a resolved ambiguity, not an oversight.

## Developer decisions and observations needed

Copied from the plan's File map:

- **The reward line's copy** — `Fight won +1 coin · Quick kill +10 coins` is placeholder, exactly as `runLabels.ts`'s own header states all its copy is. Whether it should also name *why* (how many cards, which hand) is a copy call; the richer form costs two more `RunState` fields.
- **Whether the shop is now too affordable.** A first-hand kill can pay up to 13 coins where a fight paid 1, against a `WHETSTONE_PRICE` of 4. What to look for: how many purchases are affordable at the first shop visit after a fast opening fight. No price is retuned in this ticket.
- **Whether the reward line sits well in the verdict column at a short viewport** — a look-and-feel call once QA has confirmed it renders.

Not developer observations — QA's, with right answers: that the verdict's quick-kill figure matches the purse's jump; that a mid-hand Apply Damage kill and a last-trick kill pay visibly different amounts; that no page scroll appears on the verdict at the viewport sizes QA names.

## Phase 5 verification results

- **Boundary grep** (`src/hunt`, `src/warCouncil` for `from 'react'`, `window.`, `document.`, `localStorage`) — zero hits.
- **Tunable-literal grep** (`QUICK_KILL_TIER_MULTIPLIERS` across `src`) — hits only in `src/hunt/config.ts` (declaration), `src/hunt/index.ts` (barrel), `src/hunt/quickKill.ts` (the one reader), and `src/hunt/__tests__/quickKill.test.ts`. No literal `2`, `1`, or `0.5` tier written anywhere else.
- **Line counts** (`(Get-Content <file>).Count`): `quickKill.ts` 61, `run.ts` 199, `runTransitions.ts` 296, `App.tsx` 308, `roundReducer.ts` 380, `roundUiState.ts` 235, `RunOutcomePanel.tsx` 189, `runLabels.ts` 137, `run.test.ts` 339, `run.shop.test.ts` 82, `run.quickKill.test.ts` 130, `quickKill.test.ts` 79, `roundReducer.quickKill.test.ts` 66, `RunOutcomePanel.test.tsx` 236, `runLabels.test.ts` 138 — every file under the 400-line budget.
- **Vitest, cache warm-up** (`--project node`, then `--project dom`): node — `Test Files  48 passed (48)`, `Tests  757 passed (757)`; dom — `Test Files  24 passed (24)`, `Tests  198 passed (198)`.
- **Typecheck**: `npm run typecheck` — exit 0, no errors.
- **Lint**: `npm run lint` — exit 0, no warnings or errors.
- **Unfiltered suite**: `npm test` — `Test Files  72 passed (72)`, `Tests  955 passed (955)`.
- **Scoped formatting**: `npx prettier --check` over the 13 files this contract touched in production code — **FAILED, exit 1**. `[warn] src/app/run/runLabels.ts` — the multi-line ternary in `rewardText` (as written verbatim by Task 14's own step) does not match this repo's Prettier config, which collapses it to one line. Not corrected in this phase — Phase 5 makes no production-code edits by design — and flagged here as a real finding for the fix pass or the developer.
- **Production build**: `npm run build` — exit 0. `dist/index.html`, `dist/assets/index-DBhihuYh.css` (34.80 kB), `dist/assets/index-BKPB_M46.js` (253.76 kB). `✓ built in 218ms`.

## Convention note for future contributors

`roundReducer` in `src/app/warCouncil/roundReducer.ts` is now a thin exported wrapper over a private `applyAction`. A new action's transition goes in `applyAction`'s switch, unchanged from before; any new "observe the state after every transition and possibly freeze something" rule (as `captureUnplayed` does for `unplayedAtResolve`) is added as its own function and chained into the wrapper — not folded into `applyAction`'s switch body.
