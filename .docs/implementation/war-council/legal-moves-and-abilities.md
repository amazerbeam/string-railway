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

### The Quarry has no rule-break — DLR-81 removed the one that existed

**The Quarry plays by exactly the player's rules.** Nothing in this module gives it a power, an
exemption, or a rule the player does not also play under. `legalMoves` reads only the led card and
the follower's hand — it never asks who is sitting in which seat, and there is no character-keyed
branch anywhere in the tree.

`monarchFollowSet(hand, suit)` lives in `legalMoves.ts` beside its single caller: the Swan of `suit`
then the highest card of `suit`, deduplicated when they are the same card, empty when `hand` holds
none of `suit`. "Highest" is recomputed from the hand at the moment of the follow rather than fixed
at deal time, matching the printed rule's own wording — a follower who sheds their Swan and top card
of a suit while still holding middle cards of it stays narrowed to their new highest, and is only
released once they hold none of that suit at all. `playCard`'s rejection-reason branch mirrors
`legalMoves`' own condition (`currentTrick.length === 1 && led.rank === CardRank.Monarch`) so the
legal set and `IllegalMoveReason.MustFollowMonarch` cannot disagree.

`QUARRY_SIDE` — the seat the Quarry plays (`PlayerSide.Cpu`) — now lives in `types.ts` with the
other seat vocabulary. It is a naming constant for `cpuPlayer.ts` and the reducer, and never had
anything to do with a power.

**What was removed, and why it is worth recording.** DLR-51 built a round-long rule-break for the
Monarch: on _every_ lead the Quarry made, the player narrowed to their Swan-or-highest of that suit,
whether or not a rank 11 was on the table. It was placeholder framing implemented as though it were
a design decision — the character names were meant to be "opponent 1, opponent 2" and nothing more,
and powers were intended for a final boss rather than for every opponent. A play session measured
the cost: five follows in twelve tricks, **every one with exactly one legal card**, which made both
eaten skulls undodgeable. DLR-81 deleted `quarryRuleBreak.ts` entirely, along with
`monarchFollowApplies`, the `quarryCharacter` field on `RoundState`, and `dealRound`'s third
parameter.

**The regression guard is a 60-seed soak** in `__tests__/cpuPlayer.test.ts` ("the Quarry has no
rule-break — simulated full hands"): across every trick of every seeded hand it asserts the legal
set equals plain follow-suit unless a rank 11 was actually led, and asserts the sample contains both
follows and led Monarchs so neither branch can pass vacuously.
`__tests__/legalMovesQuarry.test.ts` covers the same property per-position, including the explicit
case that the _middle_ card of a suit is legal against an ordinary Quarry lead.

`src/hunt/quarryCharacters.ts` (see [../hunt/README.md](../hunt/README.md)) still exports the
Quarry's display data, but it is now **a name only** — `QuarryCharacterInfo` has no rule field, by
design, so nothing can put a rule on screen that no code applies.

### The other four odd-card abilities

All three state-mutating effects live in `abilities.ts`, kept separate from `playCard.ts`'s
sequencing so each is independently testable against a hand-built `RoundState` fixture:

- **Fox** (`CardRank.Fox`, rank 3) — `applyFoxExchange` removes the chosen hand card, makes it the
  new decree (and thus the new `trumpSuit`), and gives the side the old decree card in return. See
  [Trick resolution and `playCard`](trick-resolution-and-play.md) for why its ordering relative to
  `resolveTrickWinner` is the module's single correctness-critical sequencing.
- **Woodcutter** (`CardRank.Woodcutter`, rank 5) — `applyWoodcutterDraw` draws the top card of
  `drawPile` into the side's hand, then removes the chosen discard (drawn or previously held) and
  appends it to the bottom of `drawPile`. **Invariant:** `drawPile`'s length stays fixed for the
  life of a round — **20 cards since DLR-80's six-card deal** — since every draw is paired with a
  discard back onto the pile. Documented in
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
