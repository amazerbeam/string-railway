_Part of [War Council](README.md)._

### Legal-move validation

`legalMoves` in `legalMoves.ts` is a pure query, consulted by `playCard` before anything changes:

- If `currentTrick` is empty, the leader may play any card in hand — no restriction.
- Otherwise the led card's suit must be followed if the side holds any card of that suit
  (`cardsOfSuit`); if they hold none, they may play anything.
- **Monarch exception** (`CardRank.Monarch`, rank 11): if Monarch was the led card and the follower
  holds any card of that suit, their legal set narrows to `{ their Swan of that suit, if held } ∪
{ their highest card of that suit }`, deduplicated when the two coincide. If they hold none of
  that suit, they may play anything, same as the general rule.

Every other ability (Fox, Woodcutter, Witch, Swan's leader-override) affects trick _outcome_ or
_state_, not what's legal to play, so none of them appear here — they live in `playCard`'s
post-validation ability dispatch and in `resolveTrickWinner` instead (see
[Trick resolution and `playCard`](trick-resolution-and-play.md)).

### The other four odd-card abilities

All three state-mutating effects live in `abilities.ts`, kept separate from `playCard.ts`'s
sequencing so each is independently testable against a hand-built `RoundState` fixture:

- **Fox** (`CardRank.Fox`, rank 3) — `applyFoxExchange` removes the chosen hand card, makes it the
  new decree (and thus the new `trumpSuit`), and gives the side the old decree card in return. See
  [Trick resolution and `playCard`](trick-resolution-and-play.md) for why its ordering relative to
  `resolveTrickWinner` is the module's single correctness-critical sequencing.
- **Woodcutter** (`CardRank.Woodcutter`, rank 5) — `applyWoodcutterDraw` draws the top card of
  `drawPile` into the side's hand, then removes the chosen discard (drawn or previously held) and
  appends it to the bottom of `drawPile`. **Invariant:** `drawPile`'s length stays fixed at 6 for
  the life of a round, since every draw is paired with a discard back onto the pile — documented in
  a comment directly above the function, since nothing type-checks this and a future mutator that
  breaks the pairing would silently corrupt the pile.
- **Swan** (`CardRank.Swan`, rank 1) — `nextLeaderAfterTrick` normally returns the trick's winner as
  the next leader, **unless** a Swan in the trick belongs to the losing side, in which case that
  side leads next instead (covers the two-Swans case: the trick's loser leads next either way).
- **Witch** (`CardRank.Witch`, rank 9) — has no separate ability function; its "counts as trump when
  alone" rule is folded directly into `resolveTrickWinner` (see
  [Trick resolution and `playCard`](trick-resolution-and-play.md)), since it only affects trick
  _outcome_, not any other state.
- **Monarch** (`CardRank.Monarch`, rank 11) — has no separate ability function either; its forced
  narrowing of the follower's legal set is folded into `legalMoves` (see above).
- **Treasure** (rank 7) has no ability function or special handling anywhere — it is an ordinary
  playable card. Its mid-round point-award rule is deliberately not implemented (see
  [Deferred](README.md#deferred--not-yet-implemented)).
