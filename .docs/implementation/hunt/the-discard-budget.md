# The discard budget — a third per-fight resource, and the seventh `recordEncounter` parameter

**Built by:** DLR-100

## What it is

`discardsRemaining` is a `RunState` field counting how many times, for the current fight, the
player may still spend a discard (`src/warCouncil/discard.ts` — see
[../war-council/the-discard.md](../war-council/the-discard.md) for the swap itself). It follows the
same wiring pattern `cheats`, `envenomCharges` and `poisonGuardHeld` already established: seeded by
`startRun`, reset by `advanceRun` at every fight boundary, and threaded through `recordEncounter` as
a required parameter so the hand can hand its ending value back.

**Its lifetime is a third shape, distinct from both existing patterns on `RunState`.** `whetstones`
is never cleared — it stacks for the whole run. `poisonGuardHeld` is spent once and then cleared by
`guardAfter` the moment its fight resolves. `discardsRemaining` is neither: it is **spent down
within a fight and reset — not cleared — at every fight boundary**, so a fresh fight always opens
with the full budget rather than with whatever was left over or with nothing at all.

## The two tunables

```ts
// UNIT: DISCARDS_PER_FIGHT — discard actions per fight, reset by advanceRun at every fight
// boundary. MAX_CARDS_PER_DISCARD — cards per single discard action.
export const DISCARDS_PER_FIGHT = 3
export const MAX_CARDS_PER_DISCARD = 3
```

Both live in `src/hunt/config.ts`, both are the developer's provisional values (design doc D4/D5,
set 2026-08-19), and both are transcribed rather than chosen here — the design doc's own instruction
is "ship it, play it, move it." **Two separate keys, not one shared number**, because they answer
different questions — how many TIMES a fight vs how BIG one throw can be — and retuning one must not
accidentally move the other. Neither is read anywhere outside `config.ts` as a bare literal; a grep
in the contract's final verification confirmed every other hit across `src/` is a named reference.

## The wiring

- `startRun` seeds `discardsRemaining: DISCARDS_PER_FIGHT`.
- `advanceRun`'s returned spread gains `discardsRemaining: DISCARDS_PER_FIGHT` beside `handOfFight:
  1` — a fresh fight resets the budget on the same line every other fight-scoped reset lives on.
- `recordEncounter` widened to a **required seventh parameter overall** — its own sixth carried
  figure — positioned between `poisonGuardHeld` and `unplayedCards`:

```ts
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
  poisonGuardHeld: boolean,
  discardsRemaining: number,
  unplayedCards: number | null,
): RunState
```

Its returned spread carries `discardsRemaining` through unchanged, exactly as `cheats` and
`envenomCharges` already do on the same line — the reset is `advanceRun`'s alone, never
`recordEncounter`'s, matching how `handOfFight` is reset only by `advanceRun`/`startRun`.

## The planning gap this widening exposed

Every prior widening of `recordEncounter` (DLR-83, DLR-90, DLR-91, DLR-95) added one required
parameter and updated its one production call site in `App.tsx`. DLR-100's own contract carried the
same "one call site, in scope" claim in its config-and-persisted-shape audit — and it was wrong.
Widening the signature surfaced **38** `TS2554` errors on the first typecheck: `App.tsx` plus **six**
pre-existing test files across `src/hunt/__tests__/` (`envenom.test.ts`, `poisonGuard.test.ts`,
`run.flask.test.ts`, `run.integration.test.ts`, `run.quickKill.test.ts`, `run.test.ts`,
`run.whetstone.test.ts`) still calling the old six-argument form. Every one was fixed inline in the
same implementation pass — a required parameter is exactly the discipline that makes a gap like this
loud and compile-time rather than silent and runtime, which is the reason every carried figure on
`RunState` arrives this way rather than as an optional parameter with a default.

The same pattern repeated, at smaller scale, when `RoundUiSeed`/`RoundUiState` widened in
`src/app/warCouncil/` (see
[../war-council-ui/discard-plate-and-selection.md](../war-council-ui/discard-plate-and-selection.md)):
every seed-object or mount-site test needed the new field threaded through, fixed inline rather than
deferred.

## What this buys, and what it costs

**What it buys:** the same three-line guarantee every sibling resource on `RunState` gets —
`discardsRemaining` cannot silently drift, cannot be forgotten by a caller (the compiler enumerates
every construction site), and cannot cross a fight boundary uncontrolled, because `advanceRun` is the
one function permitted to reset it.

**What it costs:** `recordEncounter` is now a seven-parameter call carrying six hand-returned run
figures — the same trajectory this doc's sibling entries have been noting since DLR-90 predicted it
and DLR-91 reached it. The right answer at some point is a single `HandOutcome` object rather than a
growing positional list; DLR-100 did not take that refactor, matching every prior widening's own
scope decision to add a parameter rather than restructure the function.

## Where this is not decided

Whether **3 discards a fight** and **3 cards a throw** are the right figures is unplayed — recorded
in [`the-hunt.md`](../../game_rules/the-hunt.md)'s Status register and its `[provisional]` marker.
Nothing else in this module was retuned in response to a third per-fight resource entering the run.
