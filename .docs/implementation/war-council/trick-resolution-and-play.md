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

`playCard` (see below) applies `applyFoxExchange` — which mutates `trumpSuit` on the returned state
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
   - **Fox** — requires an `AbilityChoice`; `FoxExchange` applies `applyFoxExchange` (rejecting
     `InvalidFoxExchangeCard` if the named hand card isn't actually held), `FoxDecline` does
     nothing, anything else is `UnexpectedAbilityChoice`, and no choice at all is
     `MissingAbilityChoice`.
   - **Woodcutter** — requires a `WoodcutterDiscard` choice with the same missing/mismatched-kind
     split as Fox (`MissingAbilityChoice` / `UnexpectedAbilityChoice`), then rejects
     `InvalidWoodcutterDiscard` if the named discard isn't in the post-draw hand, else applies
     `applyWoodcutterDraw`.
   - **Any other rank** — a supplied `choice` at all is rejected as `UnexpectedAbilityChoice` (no
     rank other than Fox/Woodcutter expects one).
6. Append the card to `currentTrick`. If this is the trick's first card, the result is `{ ok: true,
state }` with `phase: AwaitingFollow`. If it's the second, `resolveTrickWinner` and
   `nextLeaderAfterTrick` run, `tricksWon`/`tricksPlayed` increment, and `phase` becomes `Complete`
   once `tricksPlayed` reaches `TRICKS_PER_ROUND`, else `AwaitingLead`.

Every rejection returns `{ ok: false, reason }` and leaves the **input** `state` untouched — no
partial mutation, no thrown exception; a caller (a future CPU or UI ticket) branches on the named
`IllegalMoveReason` rather than parsing an exception message.
