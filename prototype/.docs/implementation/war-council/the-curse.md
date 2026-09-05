Part of [War Council](README.md).

A skull inverts a trick: a trick carrying one is a trick the player wants to go **low** on, because
going low on it is a Low Victory — it banks and costs no health. Until `curse.ts` the Quarry was the
only side that could ever hold one. Curse gives the player the lever: mark a card in your own hand,
play it, and the trick flips.

The card itself — its tier table, its reward and its activation window — is in
[Activated cards](../hunt/activated-cards.md). This file owns the mark.

## Two lists, one union

The mark lives on its own list, `RoundState.cursedCards`, rather than being appended to
`skulledCards`. The two have genuinely different lifetimes: **a dealt skull is written once at the
deal and never changes mid-hand, while a curse is written mid-hand and lapses at the next trick's
resolution.** Inside one list nothing could tell the two apart, so nothing would know what to lift.

`skullsOn(state)` is therefore the one place the two lists are read as one:

```ts
return state.cursedCards.length === 0
  ? state.skulledCards
  : [...state.skulledCards, ...state.cursedCards]
```

It returns `skulledCards` **itself** when nothing is cursed, which is the overwhelmingly common
case: no allocation on the ordinary render path.

`skulls.ts`'s `isSkulled` and `trickIsSkulled` keep their plain-list signatures and are _called_ with
the union rather than taught about two lists — one union, one function, greppable.

### `skullsOn` is a convention, not an enforced boundary

Nothing lints or type-checks a reader into calling it. Two readers deliberately do **not**, and both
are correct:

- **`cpuPlayer`'s card choice.** The Quarry reasons about its _own_ dealt skulls. A skull the player
  just put on their own card is not something the Quarry knows.
- **`suitShape`'s Quarry-shape readout.** The same fact from the other side: it tells the player
  about the Quarry's hand, and the player's own mark is not part of that.

A third reader is a diff rather than a membership test: `commitHandlers.ts`'s `skullArrivedSuit`
compares the two `skulledCards` lists before and after a transition to see whether the Quarry's
Woodcutter swap minted one. It reads `skulledCards` alone because a curse is never minted by that
path.

Because this is a convention, **a new reader that means "does this card show a skull" has to be
told**. The failure is silent: reading `skulledCards` alone type-checks and returns a plausible
answer.

## Making the mark

`curseCard(state, side, card)` puts a skull on a card that side is holding.

**Legality is deliberately not checked**, and that is the whole point of the card: marking is not a
move, so a card that could not legally be played this trick is still a legal target.

It **throws** a `RangeError` when the card is not in that side's hand or is already cursed, rather
than returning the state unchanged — a silent no-op would let the player spend the card and the
action points for a mark that was never made. `uncurseCard` is its mirror and throws for the same
reason.

The reducer guards both conditions before calling, because a throw inside a reducer during an event
handler unmounts the tree. `roundReducer.ts`'s `curseTapped` is that guard, and its two branches are
asymmetric on purpose: a card **not in hand** drops the arm rather than half-applying it, so the
player is never left armed with no visible cause; a card **already cursed** is a no-op that keeps
the mode open and returns `state` itself, so an idle re-tap cannot even cause a re-render.

## Arming, and the tap it claims

`curseTapped` sits in `handleTapCard` **beside** the discard branch and **above** the `canAct`
guard, not after it. A Curse is armed in the between-tricks window, which reaches the
Quarry-to-lead gap where `canAct` is false because the Quarry is next to move.

Because an armed Curse claims the next hand tap, two other controls must not be open at the same
time:

- **The Swap rail is refused** while one is armed. The rule lives once, in `discard.ts`'s
  `discardRefusalFor`, as `DiscardStock.curseArmed` → `DiscardRefusal.CurseArmed`, and both the
  rail's disabled state and the reducer read that one call. It is checked **second**, ahead of the
  budget, because it is a claim on the next tap rather than a fact about that control's stock: a
  player holding an armed Curse should be told what actually blocks them, not that they are out of
  swaps.
- **Carry-on is refused**, so the mark must be placed before the Quarry's lead is laid. Nothing else
  clears `curseArmedBuff`, so without this a Curse armed between tricks would survive the lead and
  the player would choose which card to mark having already seen it — the read the between-tricks
  window exists to deny.

## The mark lapses at the trick's resolution

`playCard` clears the whole list as the trick resolves:

```ts
// The mark is for ONE trick and lapses at its resolution, whether or not the
// cursed card was played.
cursedCards: [],
```

Clearing the whole list covers both branches with no per-card bookkeeping and no fuse counter — a
curse never spans more than one trick. It is written **after** `skullTrick` was computed, so the
trick it was made for still reads as skulled.

## Why the resolved trick captures its skulls

Because `playCard` lifts the curse the instant the trick resolves, **any reader that re-derives
skull membership from the state after the play sees an empty list** for a trick a Curse alone made
skulled — and words a banking Low Victory as a Low Defeat.

So `ResolvedTrick.skulledInTrick` is **captured** from the pre-play state at the moment the trick
resolved, and it is the one reading shared by the trick well (`TrickWell.tsx`) and the resolution
panel's `ResolutionView.skulledInTrick`. That is what makes "one trick can never be worded two ways"
actually true, including on the trick that ends the encounter.

## Where the reward is worked out

Not here. `resolveTrickBank` in [`streak.ts`](the-streak-and-the-pot.md) reads
`curseBonusOf(trick.buffs.active)` and folds the pair into that trick's own base damage and
multiplier. It reads the **activated** set rather than the fired set, because a Curse has no
condition to fire on.

Only a **banked** trick reaches that branch at all, which is what makes the reward self-gating with
no "only on a Low Victory" condition written anywhere.

> **An open rule question sits here, flagged in the code and not settled by anyone.** The reward is
> owed on any banked trick, not only on one the cursed card was played into — so marking a card and
> then never playing it earns the bonus with none of the risk the card is priced for. Whether that
> is the intended reading is the developer's decision; the behaviour is deliberately left exactly as
> it stands until a ticket decides it.

## A skulled card can reach the shared draw pile

`applyQuarrySwap` sends the swapped card to the bottom of the draw pile **without** lifting its
`skulledCards` entry, so a skulled Quarry card is expressible in the shared pile.
`trickIsSkulled`'s own docblock records why that is not reachable in practice.
