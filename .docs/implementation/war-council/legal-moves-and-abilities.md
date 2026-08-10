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

### The Quarry's round-long rule-break — the Monarch (DLR-51)

§4 of the design gives the Hunt's CPU opponent (the Quarry) one character per round whose printed
ability applies for the *whole round* rather than just the single card that prints it. `RoundState`
carries this as an optional `quarryCharacter` field, written once by `dealRound` and never written
again anywhere else — since every state update in `playCard`/`abilities.ts` rebuilds `RoundState`
by spreading (`{ ...state, … }`), the field survives every trick unchanged by construction, not by
convention. `dealRound`'s third parameter is optional, but since DLR-53 `src/App.tsx` passes it —
`SLICE_QUARRY_CHARACTER`, the Monarch — so **every round in the shipped app now runs with a
character active** and its round-long rule enforced. Which character appears in which encounter is
still a later ticket's run-scheduling job; today it is one constant.

Only the Monarch (`CardRank.Monarch`, rank 11) is implemented; the other four characters named in
§4 (Witch, Fox, Woodcutter, Swan) have no round-long enforcement. `quarryRuleBreak.ts` holds the
whole mechanism, factored so the single-card and round-long paths cannot disagree:

- `QUARRY_SIDE` — a named constant for the seat the Quarry plays (`PlayerSide.Cpu`, per §4's "The
  CPU opponent for one encounter"), so a future mode that ever seats the Quarry as the player has
  one place to change.
- `monarchFollowSet(hand, suit)` — the base Monarch option set: the Swan of `suit` then the highest
  card of `suit`, deduplicated when they're the same card, empty when `hand` holds none of `suit`.
  This is the *exact* logic the single-card exception above already used, lifted into its own
  function rather than duplicated — both `legalMoves`'s single-card branch and its round-long
  branch call this one function, so their output can never drift apart. "Highest" is recomputed
  from the hand at the moment of the follow, not fixed at deal time — matching the printed rule's
  own wording (evaluated when the trick is played) — so a player who sheds their Swan and top card
  of a suit while still holding middle cards of it stays narrowed to their new highest, rather than
  being freed in that suit. The suit is only fully released once the hand holds none of it at all.
- `monarchFollowApplies(state, side)` — true when the round-long constraint narrows `side`'s follow
  options on the current trick: the Monarch is the active character, `side` is not the Quarry, and
  the Quarry led this trick. `legalMoves` reads this as an *added* condition alongside the existing
  `led.rank === CardRank.Monarch` check (`if (led.rank === CardRank.Monarch ||
  monarchFollowApplies(state, side))`) — the round-long version narrows the follower exactly like
  the single-card exception already did, it just fires on a different trigger.

`playCard`'s rejection-reason branch calls the same `monarchFollowApplies` predicate rather than
re-deriving "was a Monarch constraint in force" from the led card's rank, so a round-long rejection
reports `IllegalMoveReason.MustFollowMonarch` — the same reason code the single-card case already
used — instead of the generic `MustFollowLeadSuit`. No new reason code was added.

`src/hunt/quarryCharacters.ts` (see [../hunt/README.md](../hunt/README.md)) exports the Monarch's
display data — a name and one player-facing sentence — for a later UI ticket to render without
restating the rule; nothing under `src/app/**` reads it yet.

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
