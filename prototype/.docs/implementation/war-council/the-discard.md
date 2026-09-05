# The discard — the swap and its refusal

**Built by:** DLR-100, DLR-146

## What it is

`src/warCouncil/discard.ts` is the pure engine module for the discard mechanic — a fifth standalone
mechanic file beside the then-live `voluntaryCashOut.ts` (deleted by DLR-156), following that file's exact shape: a `*Refusal` reason
code union, a `*Stock` interface of plain values, a `*RefusalFor(stock)` predicate, and an
`apply*` function.

## The swap

```ts
export function applyDiscard(
  state: RoundState,
  side: PlayerSide,
  discarded: readonly Card[],
): RoundState
```

`n` cards come off `side`'s hand; the same `n` come off the **front** of `drawPile`; the discarded
cards are appended to the pile's **back**. This is the Woodcutter draw's own one-card convention
(`drawPile: [...restOfPile, discard]`), generalised to n cards rather than reinvented.

**Since DLR-146 the draw goes through `drawCards`, and `drawPile.length` is no longer invariant
across the call.** It used to be — n out, n in — and that pairing was the whole reason the mechanic
could not exhaust a 20-card pile. The player's per-trick refill now shortens the pile itself, so the
pile a discard draws against can already be shorter than the throw; when it is, `drawCards` folds the
spent pile back in under a seeded shuffle and the two piles are repartitioned. All 33 cards are still
conserved, which is what `deckCycle.test.ts` pins, and the discarded cards still go to the **bottom
of whatever pile the draw left**, so they stay unseen whether or not the draw reshuffled. See
[the hand refill](the-hand-refill.md).

`applyDiscard` throws a `RangeError` on two preconditions the reducer must guard before calling:
`discarded.length` outside `1..MAX_CARDS_PER_DISCARD`, and a discarded card not held by `side`. A
**third guard was added in the post-review fix pass** and **re-aimed by DLR-146**: it now tests
`discarded.length > drawPile.length + spentPile.length` rather than `drawPile.length` alone. The
narrower form would have started firing on a state the game can now genuinely reach — a draw pile
drained below the discard size, which is a reshuffle rather than a bug — and firing there would have
thrown a `RangeError` inside a reducer. Against **both** piles it still names only what it was for:
a caller asking for more cards than the encounter holds at all. All three throws are
reachable only from a driver bug: the reducer (`src/app/warCouncil/discardHandlers.ts`) guards every
precondition before calling, exactly as `primeCard` and `cheats.ts`'s `addCheat` already do — a
reducer must not throw, because a throw during an event handler unmounts the tree.

## The refusal

```ts
export const DiscardRefusal = {
  NotAvailable: 'notAvailable',
  NoDiscardsRemaining: 'noDiscardsRemaining',
  EmptySelection: 'emptySelection',
} as const

export interface DiscardStock {
  readonly discardsRemaining: number
  readonly selecting: boolean
  readonly selectionSize: number
  readonly windowOpen: boolean
}

export function discardRefusalFor(stock: DiscardStock): DiscardRefusal | null
```

`discardRefusalFor` is checked in order — `windowOpen` first (true of the whole felt rather than of
one control, mirroring the stated ordering of the since-deleted `applyDamageRefusalFor`), then `discardsRemaining`, then
`selecting && selectionSize <= 0`. The `selecting` guard on the third check is what stops "nothing
chosen yet, mode not even open" from reporting `EmptySelection` before the rail control has ever been
tapped — a closed, unspent rail is not refused for having nothing selected.

`DiscardStock` is **plain values, never a `RoundUiState`** — this module owns the rule and must not
learn the shape of the layer that calls it, the same discipline `FlaskStock` (and, until DLR-156, `ApplyDamageStock`)
already carry. `discardRefusalFor` is **the single statement of whether the discard rail is
available**: read by the reducer before it commits anything, and by the rail control to disable
itself and print the reason — one rule read twice, never re-derived at either call site.

**`windowOpen` is deliberately not computed here.** It is assembled in
`src/app/warCouncil/roundUiState.ts`'s `discardWindowOpen`/`discardStock`, because the predicate
reads `RoundUiState` fields (`resolvedTrick`, `prompt`, `cpuFault`) that have no meaning inside
`RoundState` — this module has no way to know whether a trick's reveal is currently held on screen.
See
[../war-council-ui/discard-plate-and-selection.md](../war-council-ui/discard-plate-and-selection.md).

## The barrel

`src/warCouncil/index.ts` re-exports `DiscardRefusal`, `discardRefusalFor`, `applyDiscard` and the
`DiscardStock` type. (It sat beside `voluntaryCashOut.ts`'s exports until DLR-156 deleted that module.)

## What this module does not decide

- **How many discards remain, and how many the fight started with** — `RunState.discardsRemaining`
  lives in `src/hunt/`, and this module reads no `RunState`. See
  [../hunt/the-discard-budget.md](../hunt/the-discard-budget.md).
- **Whether the Quarry may discard** — it never can, because `applyDiscard` is never called with
  `QUARRY_SIDE` anywhere in the codebase; a grep guards the absence. The rule is enforced by omission
  at the call site, not by a branch inside this module.
- **The overlap with the Cheat** — design doc §6's own "open" ruling, untouched by this ticket. See
  [README.md](README.md)'s Deferred section.
