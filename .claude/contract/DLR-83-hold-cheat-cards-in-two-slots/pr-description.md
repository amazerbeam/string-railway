# DLR-83 — Hold Cheat cards in two slots

Plan: [`plan.md`](./plan.md) · Mockup: [`mockup.html`](./mockup.html)

## Summary

Adds two run-level Cheat slots, rendered as card frames joined to the decree
pile on the felt-left plate. Two taps arm a held Cheat; the next card
committed while it is armed ignores follow-suit and consumes the Cheat.
With both slots empty, the game plays exactly as it does today (AC9).

## The one breaking change

`recordEncounter(run, encounter, cheats)` now takes a **required** third
parameter — the hand's surviving Cheats. It is required rather than optional
because an optional parameter would let a caller silently drop a spend: the
hand owns the Cheats for the life of a fight and hands the survivors back
through `WarCouncilRoundResult.cheats`, and if `App.tsx` forgot to pass that
value through, the run would quietly refill the slot on the next fight
instead of throwing a compiler error. Making it required turns that mistake
into a type error at every call site instead of a silent gameplay bug.
`src/App.tsx`'s `handleComplete` is the only production call site, and it
now passes `result.cheats`.

## Developer decisions needed

Copied verbatim from `tasks.md` → File map → "Developer decides or observes":

- `src/hunt/config.ts` → `RUN_STARTING_CHEATS` — the placeholder is `2`
  (fills both slots so the mechanic is exercisable). `1` sharpens the "when
  do I spend it" question from fight one, which is the question the ticket
  says a play session must answer. **The value is yours.**
- `--wc-cheat-slot-w` and every `clamp()` bound in `warCouncilCheats.css`,
  plus the hairline's weight and width — tuning values, all placeholders.
- All new copy: `Cheats`, `Empty Cheat slot`, `Cheat armed — play any card in
  your hand`, `Tap the Cheat again to arm it`. The armed hint is what tells
  the player AC5's state, so read it on screen.
- **Whether arming feels like a detour** now the slots are on the felt
  rather than beside the hand. If it does, the fix is a second affordance in
  the hand zone, not moving the plate back.
- **Whether holding a Cheat changes how a hand is played before it is
  spent** — the ticket's own open question. If it is spent reflexively on
  the first illegal-looking moment, that is a `game-designer` follow-up, not
  a defect here.
- **Whether `nextCheatId` earns its place in this ticket** — nothing here
  increments it past the opening grant; DLR-84's purchase is what needs it.

## Verification results (Phase 5)

**Grep — Task 11, Step 1** (`ignoreFollowSuit` under `src\warCouncil`,
`src\app\warCouncil`): 10 hits — `legalMoves.ts:34,65`,
`WarCouncilRound.tsx:105`, `roundReducer.ts:273`, `legalMoves.test.ts:121,
129,135`, `playCard.test.ts:295,304,327`. Zero in `cpuPlayer.ts`, zero
containing `QUARRY_SIDE`. Matches expectation — the Quarry's call sites take
no options argument.

**Grep — Task 11, Step 2** (React/DOM/`localStorage`/`Math.random` under
`src\hunt`, `src\warCouncil`): 2 hits, both prose in doc comments explaining
that an id is deliberately *not* minted from `Math.random()`
(`src\hunt\cheats.ts:3`, `src\warCouncil\__tests__\skulls.test.ts:29`). No
actual usage of any of the five patterns in either tree.

**Grep — Task 11, Step 3** (`CHEAT_SLOT_COUNT =` / `RUN_STARTING_CHEATS =`
under `src\app`, `src\warCouncil`): zero hits — both keys are declared only
in `src\hunt\config.ts`.

**File sizes — Task 12** (all under the 400-line budget):

| File | Lines |
|---|---|
| `WarCouncilRound.tsx` | 336 |
| `roundReducer.ts` | 382 |
| `warCouncil.css` | 397 (down from 398) |
| `warCouncilCheats.css` | 114 |
| `CheatSlots.tsx` | 77 |
| `run.ts` | 132 |
| `cheats.ts` | 61 |
| `config.ts` | 198 |

**Scoped test counts recorded by the phase dispatches** (Phases 1–4, quoted
as scoped runs, not the unfiltered suite): `src/hunt` 84 passed;
`src/warCouncil` 260 passed; `src/app/warCouncil` 166 passed. Typecheck and
lint both exited 0 at the end of Phase 4.

**Not run by the Implementer — delegated to QA (Task 13):** the unfiltered
`npm test`, `npm run typecheck` + `npm run lint` as a final combined gate,
the scoped `npx prettier --check` over this contract's files, and
`npm run build`. None of these had been run as of this writing; treat them
as outstanding until QA reports.

## Note for future contributors

`LegalMoveOptions` is the only sanctioned way to bypass a legality rule, and
only the player's call sites may pass it. DLR-84 adds purchase on top of
`addCheat` and `nextCheatId`; it does not need a new rule path.
