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

### The Cheat bypass — the only sanctioned way to break a legality rule

DLR-83 gave the player two **Cheat** cards that lift follow-suit for exactly one committed card. The
whole of the rules half is a **trailing optional parameter**:

```ts
export interface LegalMoveOptions {
  readonly ignoreFollowSuit?: boolean
}
legalMoves(state, side, options?)
playCard(state, side, card, choice?, options?)
```

When `ignoreFollowSuit` is set, the branch that would narrow to `cardsOfSuit(hand, led.suit)` returns
the **whole hand** instead. `playCard` threads the same options into its own `legalMoves` call — the
single body change — so the legal set and the rejection reason cannot disagree, which is the
invariant `playCard` already existed to hold.

**DLR-91 widened `playCard`'s parameter without widening `legalMoves`'s**, and the shape of that is
worth knowing before adding a third caller:

```ts
export interface PlayCardOptions extends LegalMoveOptions {
  readonly baseDamageBonus?: number      // DLR-92, renamed DLR-156
  readonly swanTier?: AbilityTier        // DLR-122
  readonly buffs?: BuffHandInput         // DLR-125
}
playCard(state, side, card, choice?, options?: PlayCardOptions)
```

`playCard`'s fifth parameter is typed `PlayCardOptions` rather than `LegalMoveOptions`; `legalMoves`
still takes the narrower type, and **`extends` is what lets one object satisfy both**, so `playCard`
threads the same value it was handed into its own `legalMoves` call with no projection step. The
extra fields are **not** legality at all — they are run figures `playCard` forwards into `TrickFacts`
and reads no further. They travel on this parameter because they live on `RunState` and
`src/warCouncil/` must not learn what a run is; the reducer holds both and is the only caller that
supplies them. See [the streak, the trick's damage, and the pot](the-streak-and-the-pot.md).

> **Three Timebomb-and-Guard fields (`timebombToPlayer`, `timebombToQuarry`, `blastGuarded`) rode
> this same parameter from DLR-91 until DLR-166 removed them with the mechanic.**

Three properties fall out of that shape, and each replaces a guard someone could later delete:

- **The Monarch narrowing is untouched by construction, not by a check.** `legalMoves` reaches the
  follow-suit branch only when the led card is *not* a Monarch — the Monarch branch above it returns
  first — so a Cheat cannot reach it. Nothing tests for "is this a Monarch trick" on the bypass path
  because nothing needs to.
- **The Quarry cannot be handed a bypass.** This is an *argument*, not a field on `RoundState`. The
  Quarry's call sites — `cpuPlayer.ts`'s `chooseCpuMove`, and the reducer's lead and follow advances
  — simply pass nothing, and cannot be given it without editing a line that has no reason to change.
  A `followSuitWaived` flag on the state would have reached `chooseCpuMove` automatically, since it
  calls `legalMoves(state, side)` on that same object; the parameter form makes the property
  structural and greppable. `ignoreFollowSuit` appears in exactly four production places —
  `legalMoves.ts`'s declaration and its one read, the reducer's `commit`, and the mount's `legal`
  computation — and **zero times in `cpuPlayer.ts`**.
- **With no Cheat armed, the code path is byte-identical to yesterday's.** The parameter is trailing
  and optional, so not one pre-existing call site changed and every engine spec passes untouched.

**No `IllegalMoveReason` was added, removed, or renamed.** The bypass widens the legal set *before*
the rejection branch is reached, so `MustFollowLeadSuit` simply stops being produced for a cheated
play — its wording and its key stand. Guards that run before legality is consulted are equally
unaffected: a card not in hand is still `CardNotInHand` with a Cheat armed, and a led Monarch still
produces `MustFollowMonarch`. Both are pinned by `__tests__/playCard.test.ts`.

One incidental change worth knowing when reading the file: the Monarch branch's local `options` was
renamed `monarchOptions` so it no longer shadows the new parameter. Its logic is unchanged.

**For future contributors: `LegalMoveOptions` is the only sanctioned way to bypass a legality rule,
and only the player's call sites may pass it.** A second mechanism is how AC10 stops being true. Note
that `PlayCardOptions` extends it and carries fields that are **not** legality bypasses — adding a
legality field there rather than to `LegalMoveOptions` would put a bypass on a type `legalMoves` reads
under a name suggesting it does not.
The holding, arming and spending of a Cheat are not here — see
[../hunt/cheats-and-slots.md](../hunt/cheats-and-slots.md) for the card and the cap, and
[../war-council-ui/interaction-and-state.md](../war-council-ui/interaction-and-state.md) for the
two-click arm.

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

The state-mutating effects live in `abilities.ts`, kept separate from `playCard.ts`'s sequencing so
each is independently testable against a hand-built `RoundState` fixture. **DLR-163 rewrote the 3,
the 5 and the 7 outright**, for both sides.

- **Fox** (`CardRank.Fox`, rank 3) — `applyNameTrump(state, suit)`. Playing it lets the side **name
  any suit**; that suit becomes `trumpSuit` and the decree plate is **emptied** (`decree: null`).
  The side gives up nothing, and declining is legal.

  Two consequences are load-bearing. **The decree can now be a bare suit** rather than a card, and
  **no card is ever moved onto the decree any more** — the replaced decree card joins `spentPile` at
  the instant it is replaced, which is why `closeHand` has to skip a `null` decree. And **naming the
  suit already in force returns the state unchanged**, which is what makes "the same as declining"
  true in code rather than asserted in a comment; it is enforced here rather than at the prompt so
  the felt and the engine cannot disagree about it.

  It replaced `applyFoxExchange`, which took a card out of the player's hand. The complaint the
  ticket quotes is that the old rule always cost a card the player wanted.

- **Woodcutter** (`CardRank.Woodcutter`, rank 5) — **the two sides do different things.**

  **The player's 5 has no engine effect at all.** It raises `RunState.discardCapBonus`, a run figure
  this tree has never been allowed to see, and `commitHandlers.ts` applies that through
  `swapPileAfterWoodcutter`. Both figures climb by `WOODCUTTER_SWAP_STEP` (1) — the cap **and** the
  Swaps remaining — which is what makes "never refused for a full pile" true by construction: 3 of 3
  becomes 4 of 4, and 0 of 3 becomes 1 of 4.

  **The Quarry's 5 swaps a card**, through `applyQuarrySwap`. It gives up the lowest-ranked card it
  holds (`chooseQuarrySwapCard`, mirroring the retired CPU heuristic's "keep your best cards"
  default so the Quarry's character does not change), draws one through `drawCards`, and sends the
  swapped card to the bottom of whatever pile the draw left. With a `QUARRY_SWAP_SKULL_CHANCE` (0.4)
  roll, **the drawn card may be minted as a skull mid-hand** — subject to the deal's own rank rule,
  read off the weight curve via `skullableCards` rather than restated ("never rank 1" is
  `SKULL_RANK_WEIGHTS[1] === 0`).

  That roll is the first randomness this tree has ever needed inside `playCard`, which takes no
  generator. Rather than thread one through every call site it is drawn from `state.drawSeed` —
  which exists precisely so mid-hand randomness is reproducible — mixed with `state.tricksPlayed`,
  so each trick gets its own stable value and a seeded encounter reproduces its minted skulls
  exactly as it reproduces its reshuffles. `drawSeed` is **read, never advanced**, so the existing
  reshuffle sequence for a given seed is bit-identical. There is **exactly one `rng()` call**, before
  the swap, so the roll cannot depend on how many times the generator was consumed.

- **Treasure** (`CardRank.Treasure`, rank 7) — **no longer a card with no rule.** It has no ability
  function, because its rule is a scoring intervention rather than a play-time trigger: a **7 played
  into a trick by either side** sets `TrickFacts.treasureTrick`, and `resolveTrickBank` reads it
  twice. On a **banked** trick the fight owes `TREASURE_BASE_DAMAGE_STEP` (+1) of base damage for the
  rest of that fight; on a **hurt** one the player pays `QUARRY_TREASURE_DAMAGE` (2) health
  **instead of** the usual 1. See
  [the streak, the trick's damage, and the pot](the-streak-and-the-pot.md).

- **Swan** (`CardRank.Swan`, rank 1) — `nextLeaderAfterTrick` normally returns the trick's winner as
  the next leader, **unless** a Swan in the trick belongs to the losing side, in which case that
  side leads next instead (covers the two-Swans case: the trick's loser leads next either way).
- **Witch** (`CardRank.Witch`, rank 9) — has no separate ability function; its "counts as trump when
  alone" rule is folded directly into `resolveTrickWinner` (see
  [Trick resolution and `playCard`](trick-resolution-and-play.md)), since it only affects trick
  _outcome_, not any other state.
- **Monarch** (`CardRank.Monarch`, rank 11) — has no separate ability function either; its forced
  narrowing of the follower's legal set is folded into `legalMoves` (see above).

**Retired with DLR-163:** `applyFoxExchange`, `applyWoodcutterDraw`, `chooseCpuFoxChoice`,
`chooseCpuWoodcutterChoice`, and the two rejection reasons `InvalidFoxExchangeCard` and
`InvalidWoodcutterDiscard`. None of them exists.
