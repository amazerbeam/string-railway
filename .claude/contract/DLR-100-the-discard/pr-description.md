# DLR-100 — The Discard: swap cards from hand between tricks

Full plan: [`plan.md`](./plan.md) (this folder).

## Summary

Adds the discard action (DLR-100) — a between-tricks player action that swaps up to
`MAX_CARDS_PER_DISCARD` cards from hand for the same number drawn blind from the pile, spendable up
to `DISCARDS_PER_FIGHT` times per fight, chainable within one gap:

- **Engine swap** — `src/warCouncil/discard.ts`: `applyDiscard` removes the chosen cards from the
  hand, draws the same count off the front of `drawPile`, and appends the discards to the pile's
  back (the same bottom-of-pile convention `applyWoodcutterDraw` already uses). No discard pile, no
  reshuffle. `discardRefusalFor`/`DiscardRefusal` state exactly why the rail can't be tapped or
  can't yet commit, as a reason code — never a thrown reducer.
- **Per-fight budget** — `RunState.discardsRemaining`, seeded by `startRun`, reset by `advanceRun`,
  carried hand-to-hand through `recordEncounter`, exactly as `cheats`/`envenomCharges` already are.
- **Felt-rail UI** — a new `DiscardPlate` sibling control (alongside `CheatSlots`/`EnvenomCharge`/
  `ApplyDamagePlate`), `HandFan`'s third "every card is a target" selection mode, `PlayingCard`'s
  third marker, and a hint-cascade branch — including **chaining** (open → toggle → commit → open
  again, in the same gap) and the **pre-Quarry-lead window**: AC1 requires the action to be
  available before the Quarry's own lead is chosen, which `discardWindowOpen` reaches by
  deliberately NOT checking `canAct`/`currentTurn`.

## Developer decides or observes

Carried verbatim from `tasks.md`'s File map:

- The discard window's exact boundary (closed while a trick reveal is held, open again once
  `CarryOn` clears it, including before the Quarry's own lead) — confirm this matches intent; see
  `plan.md` → Risks.
- Whether chaining should require a second tap to re-arm, or reopen automatically after a commit —
  see `plan.md` → Risks.
- All placeholder copy: `DISCARD_RAIL_LABEL`, `DISCARD_SELECT_HINT`, `DISCARD_READY_HINT`, the three
  `DISCARD_REFUSAL_MESSAGE` sentences.
- All visual values: the discard-selected marker's glyph/colour, the rail control's glyph, any
  `clamp()` bounds the felt rail needs now that it holds four controls.
- `DISCARDS_PER_FIGHT = 3` and `MAX_CARDS_PER_DISCARD = 3` are shipped as specified — not a decision
  for this contract, but the values to watch and retune after play per the design doc's own
  instruction.
- Re-measure `roundReducer.ts` and `roundUiState.ts` line counts at the end of Phase 4; split
  further only if either has crossed 400 (see `plan.md` → Risks). Both were re-split/trimmed during
  Phases 4/5 and are confirmed still under budget at close — see Verification below.

## Verification (Phase 6 — Final verification)

- **Task 22.1** — grep for `DISCARDS_PER_FIGHT`/`MAX_CARDS_PER_DISCARD` outside `config.ts`: 24
  hits, all named references (imports, seeding, test assertions, the cap check, copy templates) —
  zero bare literal `3` reintroducing either figure.
- **Task 22.2** — the two constants are declared exactly once in `src\hunt\config.ts`
  (`DISCARDS_PER_FIGHT = 3` line 349, `MAX_CARDS_PER_DISCARD = 3` line 350).
- **Task 22.3**:
  - `npm run typecheck` — exit 0.
  - `npm run lint` — exit 0.
  - `npm test` (unfiltered) — exit 0, `Test Files 78 passed (78)`, `Tests 993 passed (993)`.
  - `npm run build` — exit 0, `dist/` written (`index.html`, `assets/index-*.css` 37.74 kB,
    `assets/index-*.js` 257.76 kB), no bundler errors.
- **Task 22.4** — line counts (`(Get-Content <path>).Count`, the accurate form —
  `Measure-Object -Line` undercounts by dropping blank lines, per this project's own recorded
  lesson):
  - `roundReducer.ts` — 400 (at the ceiling, by design per Task 14's own note)
  - `roundUiState.ts` — 285
  - `WarCouncilRound.tsx` — 399
  - `discardHandlers.ts` (split out of `roundReducer.ts` in Phase 4) — 73
  - All four at or under the 400-line budget. No further split needed.

## Note for future contributors

`discardWindowOpen` (`src/app/warCouncil/roundUiState.ts`) is the one predicate in this codebase
deliberately independent of `canAct`/`currentTurn` — it reaches the Quarry-to-lead gap where
`canAct` is false because the Quarry, not the player, is next to move, but the trick has not yet
started. A future consumable control that also needs to be available before the Quarry's lead
should read `discardWindowOpen` (or a predicate built the same way) rather than inventing a second
version of the same reasoning.
