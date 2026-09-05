_Part of [War Council](README.md)._

### Trick-winner resolution

`resolveTrickWinner` in `resolveTrick.ts` takes a completed `[leadCard, followCard]` trick — **this
order is load-bearing** (stated in a comment directly above the function) — plus the trump suit
_as it stands at the moment the function is called_. A card is "effectively trump" if its suit
matches `trumpSuit`, **or** it is the sole rank-9 (Witch) card present in the trick (the "one Witch
counts as trump, two Witches neutralise each other" rule). If either card is effectively trump, the
higher-ranked effectively-trump card wins; otherwise, if both cards share the lead suit, higher rank
wins, and if the follower is off-suit entirely, the lead card wins unconditionally.

### The Fox's mid-trick trump mutation (AC2)

`playCard` (see below) applies `applyNameTrump` — which mutates `trumpSuit` on the returned state
— **before** it ever calls `resolveTrickWinner` for that trick. Because the trump suit passed to
`resolveTrickWinner` is read off `next.trumpSuit` after any Fox exchange earlier in the same
`playCard` call, a trick where Fox was played uses the **post-exchange** trump suit to determine its
winner, exactly as `.docs/game_rules/fox-in-the-forest.md`'s Appendix specifies. This ordering is
the single correctness-critical sequencing in the whole reducer, and is the one the shipped test
`playCard.test.ts :: 'a full trick resolves using the trump suit as of after the Fox exchange'` is
built to distinguish (its fixture is constructed so the pre- and post-exchange trump suits produce
different winners — an earlier draft of this test used a fixture where they coincided, which was
caught in review and rewritten).

### `playCard` — the single reducer-shaped entry point

`playCard` in `playCard.ts` is the only function in this module that produces a new `RoundState`; no
other exported function mutates state. Its order of operations:

1. Reject if the round is already `RoundPhase.Complete` (`IllegalMoveReason.RoundComplete`).
2. Reject if it isn't `side`'s turn per `currentTurn` (`NotYourTurn`).
3. Reject if the card isn't in `side`'s hand (`CardNotInHand`).
4. Reject if the card isn't in `legalMoves(state, side)` — distinguishing `MustFollowMonarch` from
   the general `MustFollowLeadSuit` based on whether Monarch was the led card.
5. Remove the card from the hand, then dispatch by rank:
   - **Fox** — requires an `AbilityChoice` naming a **suit**; applying it calls `applyNameTrump`.
     Declining does nothing, anything else is `UnexpectedAbilityChoice`, and no choice at all is
     `MissingAbilityChoice`. **No hand card is named and none is given up**, so there is no
     invalid-card rejection to make.
   - **Woodcutter** — takes **no choice at all**. For the player it does nothing here; for the
     Quarry, `applyQuarrySwap` swaps a card and may mint a skull. See
     [Legal moves and abilities](legal-moves-and-abilities.md).
   - **Any other rank** — a supplied `choice` at all is rejected as `UnexpectedAbilityChoice` (only
     the Fox expects one).
6. Append the card to `currentTrick`. If this is the trick's first card, the result is `{ ok: true,
state }` with `phase: AwaitingFollow`. If it's the second, `resolveTrickWinner` and
   `nextLeaderAfterTrick` run, `tricksWon`/`tricksPlayed` increment, and `phase` becomes `Complete`
   once `tricksPlayed` reaches `HAND_SIZE`, else `AwaitingLead`.
7. **(DLR-146) Refill the player's hand to `PLAYER_HAND_FLOOR`**, last, and only on the second-card
   path. It runs **after** `resolveTrickBank` has produced `lastResolution`, is **skipped on the
   final trick**, and is never reached from the lead — so a drawn card can neither enter the trick in
   progress nor change what the trick's buff evaluation saw. The Quarry is never passed to it. See
   [the hand refill](the-hand-refill.md).

Every rejection returns `{ ok: false, reason }` and leaves the **input** `state` untouched — no
partial mutation, no thrown exception; a caller (a future CPU or UI ticket) branches on the named
`IllegalMoveReason` rather than parsing an exception message.

### Resolving the trick's bank effect (DLR-80)

The same second-card branch that increments `tricksWon[winner]` calls `resolveTrickBank` once and
writes its result onto `lastResolution`, copying the returned `total` and `roll` onto the state
alongside it. It passes the completed trick, whether the **player went high** (`winner ===
PlayerSide.Player`), whether the trick was skulled (`trickIsSkulled`, called with `skullsOn(state)`
so a **cursed** card counts), whether a **Treasure** was played into it by either side, and whether
this was the final trick (`tricksPlayed === HAND_SIZE`).

**The curse is lifted in the same return**, after `skullTrick` has been computed — so the trick it
was made for still reads as skulled, and every reader after the play sees an empty list. That is why
`ResolvedTrick.skulledInTrick` is *captured* rather than recomputed; see
[The Curse](the-curse.md).

`playCard` decides nothing about the outcome itself — it reports those facts and lets `streak.ts`
apply the rule. See [the streak and the pot](the-streak-and-the-pot.md).

The one-card early return writes `lastResolution: null`, so a lead always clears the previous trick's
resolution rather than leaving it to be rendered against the wrong trick.

> **`capturedCards` was removed by DLR-80.** Until then this branch also appended the trick's two
> cards to a per-side capture pile, which existed solely to be summed by `spoils` at the end of the
> round. The bank replaced the only thing the piles fed, so both the field and the invariant test
> that cross-checked the two lists against every card played are gone.
