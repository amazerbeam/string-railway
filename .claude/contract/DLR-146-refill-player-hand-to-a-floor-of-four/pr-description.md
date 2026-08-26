# DLR-146 — Refill the player's hand to a floor of four cards, behind one revertible constant

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

The player's hand is now topped back up to a floor of four cards as each trick resolves, so the last tricks of a hand stay decisions instead of the one card left in hand. The floor lives in one exported constant, `PLAYER_HAND_FLOOR` (`src/hunt/config.ts`, value `4`, PROVISIONAL) — setting it to `0` restores pre-ticket behaviour exactly, on one line, in one file, with nothing else edited.

Because a hand now takes more cards off the draw pile than it used to, the pile can run short mid-hand for the first time. The ticket therefore also adds `drawCards` (`src/warCouncil/encounterDeck.ts`) — one pure draw primitive that takes from the front of the draw pile and, when the pile can't cover the draw, folds the spent pile back in under a seeded shuffle and continues. All three draw sites in the engine — the new per-trick refill, `applyDiscard`, and `applyWoodcutterDraw` — now route through it, so no draw anywhere in the engine can outrun the pile or hand back `undefined`. The reshuffle is reproducible via a new `RoundState.drawSeed`, seeded once by `dealRound` from the deal's own generator and advanced on each reshuffle.

The Quarry is untouched: dealt `HAND_SIZE`, plays `HAND_SIZE`, draws nothing, ever. The hand still ends after `HAND_SIZE` tricks; cards left in the player's hand at that point are swept to the spent pile by `closeHand`, and all 33 cards remain conserved throughout.

## Decisions the developer must make, and behaviour only playing can judge

- **`PLAYER_HAND_FLOOR`'s value.** `4` is transcribed from the ticket as PROVISIONAL. It trades choice width in the back half of a hand against how fast the deck cycles — nothing here derives it.
- **Whether the quick-kill payout should still count cards in hand.** `roundReducer.ts:84` freezes `hands[Player].length` at the moment of a quick kill. With a floor of 4, a trick-5 kill in a fight's first hand now pays `4 × 2 = 8` coins instead of the pre-ticket `1 × 2 = 2` — the frozen hand length no longer falls below 4 the way it used to fall to 1. Counting `HAND_SIZE - tricksPlayed` instead would restore the original intent, but that rewrites DLR-95's rule, so this contract deliberately left it alone.
- **Whether the felt should say a mid-hand reshuffle happened.** Nothing tells the player today when the spent pile has been folded back into the draw pile mid-hand. Copy and visual call.
- **Whether seen cards returning mid-hand reads as fine or as cheap.** A refill can hand back a card the player saw discarded or spent three tricks ago.
- **Whether tricks 4–6 are now actually decisions, or the hand drags.** This is the whole point of the ticket, and only playing answers it.
- Every simulated win-rate, tricks-taken, and damage-per-hand baseline recorded before this ticket is now stale. Re-measuring is out of scope here — that's `play-tester` work.

## The invariant this change retires

Before this ticket, `drawPile.length` was invariant for the life of a hand — nothing shortened it mid-hand, only swapped against it. Three sites relied on that directly: `applyDiscard` (guarded by a `RangeError` that was unreachable until this ticket made mid-hand shortening real), `applyWoodcutterDraw` (destructured the first card off `drawPile` with no length check at all — reachable exhaustion would have put `undefined` into a hand), and `deckCycle.test.ts`'s D5 test, which asserted the invariant by name ("the draw pile's length never changes for the life of a hand, so it cannot run out").

All three now go through `drawCards`, which degrades to a short draw rather than throwing or returning `undefined`, and folds the spent pile back in under a seeded shuffle when needed.

**For future contributors: every mid-hand draw goes through `drawCards`. Never read `state.drawPile` directly to take cards off it.**

## Verification results, Phases 1–4

- `npx vitest run src/warCouncil src/hunt src/app src/sim` — `Test Files 139 passed (139)`, `Tests 1785 passed (1785)`, at `PLAYER_HAND_FLOOR = 4` (config left at this value). The same command was also run at `PLAYER_HAND_FLOOR = 0` during Phase 3 (Task 7 Step 2b) with nothing else edited: `Test Files 33 passed (33)`, `Tests 474 passed (474)` (that earlier run was scoped to `src/warCouncil src/sim`, before the Phase 4 file split added one more test file to the wider four-tree run).
- `npm run typecheck` — exit 0, both at floor `0` and floor `4`.
- `npm run lint` — exit 0.
- Phase 3 measured the `deckCycle` draws array directly and confirmed `refillsPerHand = 3` at `HAND_SIZE = 6`, `PLAYER_HAND_FLOOR = 4` (`draws = [20, 4, 20, 4]`), rather than trusting the derived formula on paper.
- Phase 4 pure-core boundary grep (`src/warCouncil`, `src/hunt`, React/DOM/`localStorage` pattern) — zero hits. `Math.random` grep — 12 hits, all prose stating the tree does *not* call it; zero actual calls.
- Phase 4 found and fixed one stray hit of the retired-invariant grep (`every dealt card is played|...|length never changes`) outside the sites the plan anticipated: a comment in `src/hunt/__tests__/buffEvaluation.test.ts`'s Keepsake "known open defect" test. Reworded in place; the grep is now zero hits repo-wide.
- Phase 4 also found `src/warCouncil/__tests__/rankTiers.resolution.test.ts` had crossed 400 lines (402 → 403) as a side effect of Task 2's `drawSeed: 0,` addition to one of its fixtures — a pre-existing near-breach this contract's touch tipped over. Split into `rankTiers.resolution.test.ts` (216 lines) and a new sibling `rankTiers.playCard.test.ts` (202 lines), following the same pattern as the `playCard.test.ts` / `playCard.bank.test.ts` split from Phase 3. One stale cross-reference the split broke (`src/warCouncil/rankTierRules.ts`'s docblock naming the old file for a test that moved) was corrected in the same pass.

**Delegated to QA, not run here:** the unfiltered `npm test`, `npm run build`, and `npm run format:check` (Task 11). Task 11's exact commands and expected outcomes are listed in `tasks.md`.

## Test files touched, and why

Three `src/app` specs were re-derived from `HAND_SIZE`/`PLAYER_HAND_FLOOR` — not weakened, not skipped — because the refill changed the hand widths they had pinned as literals: `roundReducer.quickKill.test.ts`, `roundReducer.delayedApply.test.ts`, and `WarCouncilRound.duelHealthBars.test.tsx`. `src/app/warCouncil/roundReducer.ts` itself was deliberately left unchanged by this contract — the quick-kill payout question above is exactly why.
