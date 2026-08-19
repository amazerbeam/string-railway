Part of [Hunt](README.md).

# Cheats — the held card, the two-slot cap, and the run's grant

`cheats.ts` is the smallest module in `src/hunt/` and the only one whose entire job is an invariant:
**a player holds at most `CHEAT_SLOT_COUNT` Cheats, and that number is stated in exactly one place.**
Everything else about a Cheat — arming it, spending it, drawing it — lives elsewhere; this file owns
what a Cheat *is* and how many you may hold (DLR-83).

## A Cheat is an object, not a counter

```ts
export type CheatCardId = number
export interface CheatCard {
  readonly id: CheatCardId
}
```

An `id` and nothing else — no kind, no name, no price. The identity is doing three jobs and each one
would otherwise need solving separately: a spend names **a specific card** rather than decrementing a
number, React gets a **stable key** for a slot frame, and DLR-84's purchase has somewhere to attach a
price without reshaping the field. The ticket's own scope line asked for "a held, consumable object
rather than a counter" and named no other property, so no other property was invented.

**Slots are modelled as a capped list, not a fixed-length array with holes.** `readonly CheatCard[]`,
capped at `CHEAT_SLOT_COUNT`, rendered as that many frames filled from the head. Every Cheat is
identical, so *which* physical slot holds one carries no information a player could observe — a
`(CheatCard | null)[]` would add hole-bookkeeping to every transition to model a distinction that
does not exist. "A slot is emptied" is therefore a removal from a list, and "two slots, visible
whether filled or empty" is the renderer's business rather than the model's.

## The four transitions, and why three of them throw

| Export        | Signature                                    | Refuses                                                                |
| ------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `grantCheats` | `(count, firstId) => readonly CheatCard[]`   | a `count` that is non-integer, negative, or above `CHEAT_SLOT_COUNT`   |
| `addCheat`    | `(cheats, card) => readonly CheatCard[]`     | a card when the slots are full, or an `id` already held                |
| `removeCheat` | `(cheats, id) => readonly CheatCard[]`       | an `id` that is not held                                               |
| `hasCheat`    | `(cheats, id) => boolean`                    | nothing — it is the question the other three are asked before being used |

All three refusals are a `RangeError` naming the offending figure, following `run.ts`'s established
style, and **none of them clamps or no-ops**. That is the load-bearing decision in the file:

- `grantCheats` throwing on an over-cap `count` means a mis-set `RUN_STARTING_CHEATS` fails at
  startup rather than silently handing back fewer cards than configuration asked for — a discrepancy
  nobody would notice until they counted frames on screen.
- `addCheat` throwing on a full pair means DLR-84 cannot take payment for a card that was never
  added. A silent no-op is precisely how that bug ships.
- `removeCheat` throwing on an absent id means a double-consume is loud, rather than leaving the slot
  looking correct while a Cheat was spent twice.

**Nothing catches these.** There is no `catch { return [] }` anywhere in the module, and no default
is substituted for a refusal.

### The one caller that must never throw

A reducer cannot throw — a throw inside one during an event handler unmounts the tree — and
`roundReducer` is the only production caller of `removeCheat`. It is safe because it never asks a
question it has not already answered: `TapCheat` checks `hasCheat` before honouring any selection,
and `commit` calls `removeCheat` only for an id it has just read off an **armed** selection, which
`hasCheat` gated on the way in. The throwing contract and the reducer's safety are two halves of one
design; changing either alone breaks it. See
[../war-council-ui/interaction-and-state.md](../war-council-ui/interaction-and-state.md).

## The ids are minted, never random

`RunState.nextCheatId` is a monotonic integer counter starting at `1`. `src/hunt/` is lint-enforced
DOM-free and nothing in it may reach `Math.random()`, so an id could not be random even if that were
wanted — but determinism is not the only reason. A counter also stops DLR-84's mid-run purchase from
re-issuing the id of a card already spent, which would collide as a React key and render two frames
as one.

**Nothing in DLR-83 increments it past the opening grant.** `startRun` sets it to
`RUN_STARTING_CHEATS + 1` and no transition moves it again — it is forward-looking machinery for the
purchase that does not exist yet, and it is flagged as such in the contract rather than presented as
load-bearing today. The counter lives **on `RunState`** rather than in a module-level `let`
specifically so it cannot survive HMR or leak between tests in one file.

## The grant, and where the slots live

The Cheats are **run state, not hand state** — the same lifetime as carried health, and for the same
reason: what you hold has to survive a fight boundary.

```ts
export interface RunState {
  // …
  readonly cheats: readonly CheatCard[]
  readonly nextCheatId: CheatCardId
}
```

- **`startRun`** grants `grantCheats(RUN_STARTING_CHEATS, 1)` and sets `nextCheatId` past it. Its
  signature is unchanged.
- **`advanceRun`** carries both fields into the next fight **for free**, through the `...run` spread
  it already had. No line was added to it, and that is the whole of "slot contents carry across
  fights".
- **`recordEncounter`** gained a **required third parameter**, `cheats` — the survivors a hand reports
  upward. This is the one breaking signature change in the contract, and required rather than optional
  deliberately: an optional parameter would let a caller silently drop a spend, and the run would
  quietly refill the slot. Required makes the compiler enumerate every call site instead of trusting
  whoever writes the next one.

`canAdvanceRun` is untouched. See [the run](run-sequence.md) for the transitions themselves.

## The two configuration keys

| Key                   | Value | Status                                                                                                                                                                     |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHEAT_SLOT_COUNT`    | `2`   | **Transcribed, not chosen.** The ticket says "exactly two" twice and defends the cap at length. It is a key so the number is stated once — **not** so it is easy to raise.  |
| `RUN_STARTING_CHEATS` | `0`   | **The developer's, set 2026-08-17, down from 2** — a run opens empty-handed and every Cheat is bought. The ticket requires the grant come from configuration and names no number. `2` fills both slots so the mechanic is exercisable at all.   |

The cap is worth understanding before anyone widens it. Refusing tricks is exactly what the skull
exists to punish — "take every trick" is only wrong because some tricks are traps — so an unbounded
supply of follow-suit breaks would remove the game's only inversion. Two is far from that line, and
the cap is what keeps it there. `RUN_STARTING_CHEATS` must stay within `0..CHEAT_SLOT_COUNT`;
`grantCheats` throws outside it rather than clamping, and `config.test.ts` asserts the relationship
as a **range** rather than a value, so the assertion survives the developer changing the placeholder.

## Testing

`__tests__/cheats.test.ts` is a `.test.ts`, so it lands in the `node` Vitest project and is DOM-free
by construction. Twelve cases cover the grant (including `0`, which returns `[]` rather than
throwing), the cap, both duplicate and absent-id refusals, and — for all three transitions —
**that the input list is not mutated**, which is the property every caller assumes and none checks.
