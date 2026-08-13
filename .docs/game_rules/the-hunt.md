# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-13**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

> **The Quarry has no powers — DLR-81, the same day.** It plays by exactly the player's rules, with
> no exceptions. A character is a name only. The Monarch previously carried a whole-hand narrowing
> of the player's follow; it was placeholder framing built as though it were a decision, and it is
> **deferred to a final boss, not deleted** — see [section 9](#9-the-quarry). Every measurement taken
> before this date was taken against that power.

> **DLR-80 replaced the whole scoring layer, and this document was rewritten around it.** The
> declaration, the Standing tables, Spoils, the capture piles and the once-per-Hunt damage
> application are **gone from the game**, not deferred — see
> [What this game does not have](#11-what-this-game-does-not-have). In their place:
>
> - A hand is **six cards each and six tricks**, then it re-deals (section 2).
> - Roughly a third of the Quarry's cards carry a **skull**, and you can see which before you commit
>   (section 3).
> - The skull **inverts the trick**: on a clean trick you want to win it, on a skull trick you want
>   to lose it (section 7).
> - Taking a trick banks both cards' ranks and climbs a **streak multiplier**; taking damage costs
>   **1 health**, cashes `bank × multiplier` into the Quarry, and resets both to zero (sections 7–8).
> - Damage now lands **per trick, mid-hand** — so an encounter can end on trick 3 (section 8).
>
> **The whole of it is playable.** The one figure that is not decided is the Quarry's health, which
> is a deliberate placeholder awaiting a play session (section 8).

---

## What this document is, and is not

| Doc                            | Owns                                                     | Answers                    |
| ------------------------------ | -------------------------------------------------------- | -------------------------- |
| **`the-hunt.md`** (this file)  | The playable procedure as it currently stands            | "What are the rules?"      |
| `../design/…/hybrid-design.md` | Why each rule exists, the discarded branches, open forks | "Why this rule?"           |
| `../implementation/<module>/`  | What the code does, per module                           | "How does the code do it?" |

So: **no argument, no rationale, no code.** Where a rule needs justifying, this file cites its design
section and stops. Where a reader needs to know what enforces a rule, the
[Status register](#status-register) at the foot carries the pointer — once, in one table.

The redesign's own specification is
`../design/Balatro-Forbidden-Solitaire/the-hunt-play-test-2-feedback.md`, cited below as
**play-test 2 §N**. `hybrid-design.md` has **not** been rewritten around it and still describes the
retired direction in places; where the two disagree, this document follows the code.

`fox-in-the-forest.md` in this folder is the **base game**, transcribed. This game is not a variant
of it that you play with the rulebook open: everything you need is below. The base game is cited
where a rule is carried over unchanged, so a reader can see what was inherited rather than designed.

### A note on vocabulary

A **hand** is one deal of six cards a side, played out over six tricks. An **encounter** is the whole
fight against one Quarry — hand after hand until a health bar empties. The app's closing panel says
"The hand is over" for the first and "The Hunt is over" for the second.

### Status markers

Every rule below carries one. A rules document for a game still being designed is only useful if it
distinguishes what is decided from what is being played to find out.

| Marker            | Means                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| **[settled]**     | Decided and playable. Changing it is a design change, not a tuning pass.          |
| **[provisional]** | Playable, but the value or the reading is expected to move after a playtest.      |
| **[open]**        | Not decided. The procedure stated is a placeholder, and may not survive.          |
| **[not built]**   | Decided in design, but nothing enforces it — you cannot do this in the app today. |

---

## 1. Components

**[settled]**

One deck of **33 cards**: three suits — **Bells**, **Keys**, **Moons** — each ranked **1–11**.

Seven ranks carry a name, and the name is what the rules refer to:

| Rank | Name           |
| ---- | -------------- |
| 1    | **Swan**       |
| 3    | **Fox**        |
| 5    | **Woodcutter** |
| 7    | **Treasure**   |
| 8    | **Poison**     |
| 9    | **Witch**      |
| 11   | **Monarch**    |

There are no other cards. The base game's three expansion modules — special cards, goal cards, and
the Poison-8 swap — are not in this game (see
[What this game does not have](#11-what-this-game-does-not-have)). The **Poison** name sits on the
ordinary rank 8 of all three suits, not on a separate module card.

> **The Poison name is now actively misleading, and that is a known problem.** The skull (section 3)
> is a **separate marker** that can sit on any rank from 2 upward — it is not rank 8, and rank 8 has
> nothing to do with it. Play-test 2 §6 Q3 records renaming rank 8 as an open question. It is
> recorded under [Known tensions](#known-tensions-recorded-not-resolved).

---

## 2. The shape of a hand

**[settled]** — six cards, six tricks (play-test 2 §3.1, §5).

A **hand** is one deal of **6 cards to each side**, played out over **6 tricks**. Every card dealt is
played; the hand ends when the sixth trick resolves, and another is dealt immediately unless the
encounter has ended.

### Setup

1. Shuffle the 33 cards.
2. Deal **6** to the player and **6** to the Quarry, each hidden from the other.
3. Assign the Quarry's skulls — see section 3.
4. The **13th card** is turned face up as the **decree**. Its suit is the **trump suit** for the
   hand.
5. The remaining **20 cards** form the **draw pile**, face down.

The Fox exchanges with the decree; the Woodcutter draws from the pile and discards back to it, so the
pile stays at 20 for the whole hand.

> **Deviation from the base game — the deal.** The base game deals 13 and 13 and leaves a 6-card
> draw pile. Here the hand is less than half that and the draw pile is more than three times it. The
> decree is still one card turned face up from what remains.

### Who deals, who leads

**[provisional]** — the first dealer is a placeholder, not a decision.

The **player deals the first hand**, and the deal alternates every hand after. The **non-dealer leads
the first trick**.

### The hand re-deals until the encounter ends

**[settled]**

There is no limit on the number of hands. An encounter runs hand after hand until a health bar
empties (section 8) — and because damage now lands per trick, a hand can be cut off part-way through
rather than always running its full six tricks.

---

## 3. What you can see before you commit — the skulls

**[settled]** — the procedure and the ~30% density; the distribution across ranks is
**[open]**, below.

Roughly **30% of the Quarry's dealt cards carry a skull**. In a six-card hand that is **2 of 6**.

**No skull is ever on a rank 1.** A skulled 1 could not lose its trick, so it would be an undodgeable
tax rather than a decision — excluding it is what leaves foreknowledge worth having (play-test 2
§3.4).

### What a skull does

A skull **inverts what winning the trick is worth** — the full rule is section 7. In short: a trick
containing a skulled card is one you want to **lose**.

**A trick is a skull trick if _any_ card played into it is skulled** — not merely the Quarry's card.
Skulls are only ever dealt to the Quarry, so in practice this is the Quarry's card; but a card can
change hands mid-hand (the Quarry's Fox can exchange a skulled card into the decree, and your Fox can
later take that decree into hand), and a skull stays with its card when it does.

> **Whether a skull should survive changing hands is the developer's call** and it is currently
> answered "yes" — the rule tests the trick, not the seat. It is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### What you are shown, and what you are not

**[settled]**

Two readouts carry the skulls, and neither ever reveals a rank:

- **The shape readout.** For each suit, how many cards the Quarry **holds** and how many of those are
  **skulled**. So you know there are two skulls in Bells; you do not know whether they are the 2 and
  the 4 or the 10 and the 11.
- **The skull mark on a played card.** Once a skulled card is face up on the table, it is marked as
  skulled.

That split is the whole design of it: counting suits is bookkeeping and reading ranks is judgement,
so the readout removes the first and keeps the second (play-test 2 §3.5).

### How skulls are spread across ranks — **[open]**

Only "never rank 1" is settled. Today skulls are drawn **uniformly at random from the Quarry's
eligible cards (ranks 2–11)**. Whether they should instead **skew low** (more ambushes — a low skull
is hard to avoid winning) or **skew high** (more announcements — a high skull is easy to see coming)
is untested, and play-test 2 §6 Q1 ranks it as the open question the game's feel depends on most.

**Whose decision:** the developer's, after playing.

---

## 4. Playing a trick

**[settled]** — unchanged from the base game, and unchanged by DLR-80.

Both sides play one card face up per trick: one **leads**, the other **follows**.

**Leading.** The leader may play any card in hand. That card's suit is the **lead suit**.

**Following.** The follower **must play a card of the lead suit if they hold one** — any rank of it.
Holding none of the lead suit, they may play any card.

**One exception narrows the follow further**, and it comes from the Monarch card:

- **A led Monarch.** If the lead card is a Monarch and the follower holds any card of that suit,
  they may play **only** their Swan of that suit (if held) or their **highest** card of that suit —
  nothing else. Holding none of that suit, the normal freedom applies.

**This applies to whichever side is following — the player and the Quarry alike.** There is no
second, whole-hand version of it. One existed until 2026-08-13, attached to the Monarch _character_
rather than the card; section 9 records why it was removed.

"Highest" is read from the hand **at the moment you follow**, not fixed at the deal. Shedding your
Swan and your top card of a suit leaves you narrowed to your new highest; you are only free of the
constraint in a suit once you hold none of that suit at all.

---

## 5. Abilities

**[settled]** — the rules; **[open]** whether they survive a six-card hand, below.

Each named rank does one thing — except two. The odd ranks act during play; the **Treasure (7) and
the Poison (8) do nothing at all**, and are named cards with no rule attached. Every other even rank
does nothing either.

| Rank | Name           | Effect                                                                                                                                                                              |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Swan**       | If a Swan is in a trick and belongs to the side that **lost** it, that side **leads the next trick**. Two Swans: the loser leads either way.                                        |
| 3    | **Fox**        | On playing it, you **may** exchange the decree card for a card from your hand. The exchanged card becomes the new decree, and its suit becomes the new trump suit. You may decline. |
| 5    | **Woodcutter** | On playing it, **draw the top card of the draw pile**, then put **one card** from your hand — the drawn card or one you already held — on the **bottom** of the pile.               |
| 7    | **Treasure**   | **No effect at all.** A named card with no rule attached.                                                                                                                           |
| 8    | **Poison**     | **No effect at all.** A named card with no rule attached. It has nothing to do with skulls.                                                                                         |
| 9    | **Witch**      | If a trick contains **exactly one** Witch, that Witch counts as trump when the winner is decided. **Two Witches cancel** — neither is treated as trump.                             |
| 11   | **Monarch**    | Narrows the follower's legal play — see section 4.                                                                                                                                  |

**Timing.** The Fox and the Woodcutter resolve **the instant the card is played**, before the other
card is played and before the winner is decided. So if the Fox changes the decree, the **new** trump
suit decides the **current** trick — as the base game's own appendix specifies.

**A drawn card is never skulled.** The Woodcutter draws from the pile, and the pile carries no
skulls — skulls are a property of the deal (section 3).

### Whether the abilities survive at six cards — **[open]**

A six-card hand contains far fewer named ranks than a thirteen-card one, and **many hands will
contain none at all**. Play-test 2 §6 Q2 names three exits — weight the deal toward odd ranks, shrink
the deck so they are proportionally commoner, or accept ability-free hands as normal — and DLR-80
deliberately took none of them, keeping every ability's behaviour verbatim. Ability-free hands are
therefore **normal today, by default rather than by decision**.

**Whose decision:** the developer's, after playing.

---

## 6. Deciding the trick

**[settled]**

A card is **effectively trump** if its suit is the trump suit **or** it is the sole Witch in the
trick. Then, in order:

1. If **either** card is effectively trump, the **higher-ranked effectively-trump card wins**.
2. Otherwise, if **both** cards are of the lead suit, the **higher rank wins**.
3. Otherwise the follower is off-suit and cannot win: the **lead card wins**.

The trump suit used is the one in force **at that moment** — after any Fox exchange made in this same
trick.

**The next lead** is the trick's winner, unless the Swan's rule (section 5) hands it to the loser.

> **"Winner leads next" now costs something.** The rule is unchanged from the base game, but with
> skulls on the table leading is sometimes a liability — so winning a trick hands you that
> obligation. Play-test 2 §3.6 keeps the rule precisely because skulls give it a job it did not have
> before.

**There are no capture piles.** Winning a trick no longer takes the two cards into a pile that is
scored later. What a trick does is section 7, and it happens immediately.

---

## 7. The four outcomes, the bank and the streak

**[settled]** — the whole of this section (play-test 2 §3.2, §3.3).

Every trick resolves into exactly one of four outcomes, decided by two facts: **did you win it**, and
**was it a skull trick**.

| You…               | Clean trick (no skull)           | Skull trick                             |
| ------------------ | -------------------------------- | --------------------------------------- |
| **won the trick**  | **Clean win** — you take it      | **You ate the skull** — you take damage |
| **lost the trick** | **Clean loss** — you take damage | **Dodge** — you take it                 |

So the skull **inverts the trick**: on a clean trick you want to win it, on a skull trick you want to
lose it.

### Taking a trick — a clean win, or a dodge

Both cards' **printed ranks are added to your bank**, and your **streak multiplier goes up by one**.
Nothing else happens: no damage is dealt in either direction.

A clean win and a dodge are **identical in every respect** but their name.

### Taking damage — a clean loss, or eating a skull

Three things happen at once:

1. You take **1 damage**. Always exactly 1, whatever the cards were worth.
2. Your bank **cashes out**: `bank × multiplier` is dealt to the Quarry's health.
3. The bank and the multiplier both **reset to zero**.

A clean loss and eating a skull are **identical in every respect** but their name.

### The bank

**The bank only ever climbs** until it cashes. It is the summed printed ranks of every card in every
trick you have taken since the last cash-out — both cards from each trick, yours and the Quarry's.

A card's value is its **printed rank**, always. There is no inversion, no modifier, and no
per-card exception anywhere in this game.

### The streak multiplier

**The multiplier is the number of tricks you have taken in a row.** Clean wins and dodges both count;
it starts at zero each time it resets, and any damage you take resets it.

So the bank and the multiplier climb together while you keep taking tricks, and a cash-out is worth
the product of the two. Six tricks taken in a row cash for far more than six tricks taken with a loss
in the middle.

> **This replaced `Spoils × Standing`, and the shape of the reward is the point of the change.** The
> old equation was scored once, at the end of thirteen tricks, off a multiplier table read from the
> final trick count — so a total could _fall_ when you won a trick, and nothing was settled until the
> last card. The bank only climbs, the multiplier only climbs, and both cash on an event the player
> can see coming.

### At the end of the sixth trick, the bank cashes

**[settled]**

When the sixth trick resolves, the bank **cashes out at the current multiplier** and both reset —
whatever the sixth trick itself did.

In practice exactly one cash-out can ever fire on the sixth trick, never two: if the sixth trick was
one you took, the end-of-hand cash pays out the bank it just added to; if the sixth trick took damage,
that damage already cashed the bank and reset it, so there is nothing left to pay. A hand therefore
never double-counts its last trick.

---

## 8. Damage, and the duel

**[settled]** — except the Quarry's health, which is **[open]**.

Both sides hold **health**, and the encounter ends when either total reaches zero.

| Value                              | Status                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| Player's starting health           | **25** — **[settled]** (play-test 2 §5)                |
| Quarry's health                    | **1,000** — **[open]**, a plainly-labelled placeholder |
| Damage to the player, per event    | **1**, every time — **[settled]**                      |
| Health restored between encounters | **None** — **[not built]**, and nothing reads it yet   |
| Both bars emptying together        | **The player loses**                                   |

**The two numbers are asymmetric on purpose.** The player's 25 is a small integer you can hold in
your head; the Quarry's total lands in the hundreds or thousands because it absorbs `bank ×
multiplier`. Play-test 2 §5 names Balatro's _4 hands, 3 discards_ against score requirements in the
thousands as the same shape.

### The Quarry's health is a placeholder — **[open]**

**1,000 is not a decision.** Play-test 2 §5 states outright that CPU health cannot be derived
honestly yet: it depends on how large real cash-outs get, which depends on how long streaks actually
run, and that is a function of play rather than arithmetic. The figure in configuration is labelled
as a placeholder and the reasoning behind it is written beside it so it can be argued with rather
than trusted.

**Whose decision:** the developer's, from the first play session. Play-test 2 §8 names the
measurement: record your biggest cash-out each hand.

If it is badly wrong the encounter is either over in two hands or a grind — and neither tells you
anything about the six tricks, which is what the play-test is for.

### Damage lands per trick, and an encounter can end mid-hand

**[settled]**

Damage is applied **as each trick resolves**, not once at the end. A trick that deals damage moves
both bars immediately: yours by 1, the Quarry's by the cash-out.

**Both bars are depleted before either is checked.** Then:

| After the damage lands         | Outcome                    |
| ------------------------------ | -------------------------- |
| Only the Quarry's bar is empty | **You win the encounter.** |
| Only your bar is empty         | **The run ends.**          |
| **Both, on the same event**    | **You lose.**              |
| Neither                        | Play continues.            |

That both bars settle simultaneously is what makes the third row reachable at all.

**An encounter can therefore end on trick 3.** When it does, the hand **stops where it is** — the
remaining tricks are not played, and the outcome is stated in place of the table.

> **This is a change of kind, not of degree.** Damage used to land once, at the end of thirteen
> tricks, on a confirmation press. It now lands several times a hand, automatically, with no
> confirmation anywhere. Whether a hand being cut off in the middle feels abrupt is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

**Surplus damage is discarded.** Damage past a depleted bar is not carried, banked, or converted.
Dealing 5,000 into a bar with 200 left is exactly the same as dealing 200. **Health is never
negative** — a bar stops at zero.

### What closing a hand takes

**[settled]** — one press, and it is not a decision.

When the sixth trick resolves, a panel states that hand's own tally: tricks you took, tricks the
Quarry took, health you lost, and health you dealt to the Quarry. One press deals the next hand.

If a bar emptied instead, the encounter's outcome is stated in its place and no further hand is
offered.

> **The old two-stage close is gone.** There used to be a press to _apply_ the damage and a second to
> deal the next Hunt. Damage now lands as it happens, so there is nothing left to commit — the panel
> reports what already occurred.

---

## 9. The Quarry

**[settled]** — it has no powers, and no character does.

The Quarry is the CPU opponent. It **plays by the player's rules, with no exceptions at all**: it
follows suit, holds six cards, plays one card per trick, and is bound by every rule in sections 4–7
exactly as the player is. There is no rule-break, no round-long ability, and nothing it may do that
you may not.

Its character is a **name only** — an identity for the encounter, shown on screen so one opponent is
distinguishable from the next. Nothing mechanical hangs off it.

> **Character powers were removed on 2026-08-13, and they are deferred, not deleted.** The Monarch
> previously carried a round-long rule-break, and it should never have shipped: it was placeholder
> framing that was implemented as though it were a decision. Session 3 measured its cost — five
> follows in twelve tricks, every one of them with exactly one legal card. When powers return they
> are intended for a **final boss**, not for every opponent, and the design for them has not been
> written. See [What this game does not have](#11-what-this-game-does-not-have).

### It plays its skulls against you — **[settled]**

**When following, the Quarry prefers to play a skulled card into a trick it is losing** — so that you
are the one who wins it, and eat the skull. Among its skulled losing cards it plays the lowest.

Failing that, it plays as it always has: the lowest card that would win the trick, or failing that
the lowest legal card at all.

**Its lead is unchanged**, and this is the deliberate minimum. The Quarry does **not** avoid leading a
skulled card, so it will sometimes lead a skull and be trivially dodged. That is recorded under
[Known tensions](#known-tensions-recorded-not-resolved) as the obvious next improvement.

### The character roster — a name each, and nothing more

Five names exist, cast from the deck's own odd ranks: **Swan**, **Fox**, **Woodcutter**, **Witch**,
**Monarch**. Only the Monarch is configured, and every hand in the app today runs against it — as a
label on a panel, with no mechanical effect whatsoever.

**What each of them will do is undecided — [not built].** Sketches for round-long rule-breaks were
written before powers were deferred, and they are deliberately not reproduced here: a rules document
should not carry rules nobody has decided to have. Whoever designs the final boss starts from the
design document, not from this section.

> **The rank-11 card still narrows a follow** — see section 4. That is the _printed card ability_: it
> fires only on the trick where an 11 is actually led, and it binds **both sides equally**. It shares
> a name with the character and has nothing to do with it.

### What you can see

| What                                | Visible?                                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Quarry's hand                   | **Hidden**                                                                                                                                                                                                                 |
| **Which of its cards are skulled**  | **Open — by suit, never by rank.** Per suit: how many it holds, and how many of those are skulled (section 3).                                                                                                             |
| A skulled card once played          | **Marked**, face up on the table                                                                                                                                                                                           |
| The Quarry's next-trick intent      | **Telegraphed** before you commit — the suit it is about to play, plus its stance: **leading**, or, when it is following you, **pressing** (this card takes the trick) or **ducking** (it does not). Never the exact card. |
| The Quarry's trick count            | Public                                                                                                                                                                                                                     |
| The Quarry's character and its rule | Always on screen                                                                                                                                                                                                           |
| **Your bank and your streak**       | **Open — on screen throughout**, together with what the streak would cash for at its current size.                                                                                                                         |
| What the last trick did             | **Stated** — which of the four outcomes it was, and what it cost or banked.                                                                                                                                                |
| **Both sides' health**              | **Open — two bars**, each against its own maximum, moving as each trick's damage lands.                                                                                                                                    |

The telegraph's fidelity — suit only, or suit and stance — is **[provisional]**; it currently shows
both.

---

## 10. Between hands, and the run

**[not built]** — none of this section is playable. It is recorded so the rules read as one game
rather than as one hand.

- **Forage** is the only thing you do between hands: edit the 33-card deck the next hand is dealt
  from. It may edit exactly four things — a card's **value**, its **ability**, its **suit**, and the
  **decree**. There is no shop and no flat score bonus. The budget is **4 edits per encounter**
  (**[provisional]**). **The player holds no skulls of their own**, and Forage cannot add any.
- **A run** is a fixed sequence of encounters against different Quarries. **Your health emptying ends
  the run**, and that is both enforced and reachable. What is not built is the _sequence_: nothing
  runs one encounter after another, and the between-encounter restore is read by nothing. Only
  **one** Quarry is configured.
- **The run length** is **[open]** (a placeholder 5 exists in config).
- **Snare** — an in-hand edit layer — is **[open]** and explicitly blocked: "raise the value of the
  card I am about to win with" is a dominant strategy until it has a cost.

The app today plays **one encounter** against one Quarry: hand after hand, both bars visible, until a
bar empties. A session can therefore end, in victory or in defeat. What it cannot do is carry on
afterwards.

---

## 11. What this game does not have

Two tables: what the base game had, and what this game itself had until 2026-08-13.

### From the base game

| Base-game rule                    | Here                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The 21-point match**            | **Dropped.** It ends a symmetric two-player contest. The run, and the health both sides hold, replace it.                                            |
| **13-card hands, 13 tricks**      | **Dropped.** Six and six (section 2).                                                                                                                |
| **Goal cards (16)**               | **Dropped.** A second scoring channel.                                                                                                               |
| **Special cards (9)**             | **Dropped as cards.** The _unsuited_ concept is kept as the grammar for a Forage suit edit.                                                          |
| **The Poison-8 swap**             | **Dropped entirely.** Rank 8 is an ordinary card that happens to be named — and the skull is a separate marker with no connection to it (section 3). |
| **The Treasure's point**          | **Dropped.** Rank 7 has no rule.                                                                                                                     |
| **The end-of-round points table** | **Dropped entirely.** Its bands were repurposed into the Standing multiplier, which has since been deleted too (below). Nothing of it survives.      |

### From this game's own earlier direction — removed 2026-08-13

Removed by DLR-80, **not deferred**. Nothing in the code refers to any of it.

| Retired rule                                        | What replaced it                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **The Win/Lose declaration**                        | Nothing. It selected a multiplier table and a card-value scheme; both are gone.                                  |
| **The four Standing bands, both multiplier tables** | The streak multiplier (section 7). Six tricks give seven outcomes, which cannot carry four bands.                |
| **Rank inversion (`12 − r`)**                       | Nothing. A card is worth its printed rank, always.                                                               |
| **The Lose-path pile swap**                         | Nothing. It died with the declaration.                                                                           |
| **Spoils and the capture piles**                    | The bank (section 7), which is per-streak rather than per-hand, and cashes.                                      |
| **Damage rounding**                                 | Nothing. No fractional damage is producible — the bank is a sum of integers and the multiplier an integer count. |
| **Pending damage on the health bars**               | The bank, which unlike the pending figure **only climbs**.                                                       |
| **Damage applied once, at the end**                 | The cash-out (section 8), which fires several times a hand.                                                      |
| **The confirmation press**                          | Nothing. Damage lands as it happens.                                                                             |
| **Health at 1,350 / 1,600**                         | 25 and a placeholder (section 8).                                                                                |

### The Quarry's character power — removed 2026-08-13, deferred not deleted

Removed by DLR-81, separately and for a different reason from everything above: the rest of this
section lists rules that were _decided and then superseded_, while this one **was never decided at
all**.

| Retired rule                                                                                                                   | Why it went                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Monarch's round-long rule-break** — every lead the Quarry made narrowed the player to their Swan or highest of that suit | It was placeholder framing ("opponent 1, opponent 2") that got built as though it were a design decision. Nobody had chosen how powers would work, and the intent was for powers to belong to a **final boss**, not to every opponent |

**What it cost while it was live.** Session 3 measured it: five follows in twelve tricks, **every one
with exactly one legal card**, and both eaten skulls undodgeable as a direct consequence. The
character's own stated liability — shed your Swan and your top card of a suit early — needs an
_early_, and a six-card hand does not have one. Session 2's _"I had no choince but to take the
trick"_ is very likely this power rather than follow-suit.

**Every measurement taken before 2026-08-13 was taken against it**, including all of sessions 2 and 3
and the play-test-2 redesign they produced. Treat those numbers as provisional.

Character powers return in a **final-boss ticket** that will design them properly. Nothing about their
shape is decided.

---

## Status register

One row per rule area. `Where enforced` is a pointer for checking this document has not gone stale —
the mechanics themselves are documented in `../implementation/`.

| Rule area                                     | Status                            | Where enforced                                                                                              | Who decides what's open                                 |
| --------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Deck, decree, draw pile                       | settled                           | `src/warCouncil/deck.ts`, `deal.ts`                                                                         | —                                                       |
| Hand size and trick count (6)                 | settled                           | `src/hunt/config.ts` — `HAND_SIZE`; sliced in `src/warCouncil/deal.ts`, ends the hand in `playCard.ts`      | —                                                       |
| First dealer, alternation                     | provisional                       | `src/app/dealerForRound.ts`                                                                                 | Developer                                               |
| Skull density (~30%, 2 of 6)                  | settled                           | `src/hunt/config.ts` — `SKULL_DENSITY`; applied by `src/warCouncil/skulls.ts` — `assignSkulls`              | —                                                       |
| Skulls never on rank 1                        | settled                           | `src/hunt/config.ts` — `SKULL_MIN_RANK`; filtered by `src/warCouncil/skulls.ts` — `skullableCards`          | —                                                       |
| Skull rank distribution (uniform)             | **open**                          | `src/warCouncil/skulls.ts` — `assignSkulls` takes it as a parameter                                         | Developer, after playtest                               |
| Skulls assigned to the Quarry's deal only     | settled                           | `src/warCouncil/deal.ts` — `assignSkulls(cpuHand, rng)`; the draw pile is never skulled                     | —                                                       |
| A trick is skulled if any card in it is       | settled                           | `src/warCouncil/skulls.ts` — `trickIsSkulled`                                                               | Developer — whether it should die with a Fox exchange   |
| Shape readout shows no rank                   | settled                           | `src/warCouncil/skulls.ts` — `suitShape`; drawn by `src/app/warCouncil/QuarryShape.tsx`                     | —                                                       |
| A skulled card is marked once face up         | settled                           | `src/app/warCouncil/PlayingCard.tsx` — the `skulled` prop; passed by `TrickWell.tsx`                        | —                                                       |
| Follow-suit, led-Monarch narrowing            | settled                           | `src/warCouncil/legalMoves.ts` — `legalMoves`, `monarchFollowSet`                                           | —                                                       |
| Odd-rank abilities                            | settled                           | `src/warCouncil/abilities.ts`, `resolveTrick.ts`                                                            | —                                                       |
| Whether abilities survive six-card hands      | **open**                          | nothing — abilities are unchanged and ability-free hands are accepted                                       | Developer, after playtest                               |
| Trick resolution, Witch-as-trump              | settled                           | `src/warCouncil/resolveTrick.ts`                                                                            | —                                                       |
| Winner leads next, Swan's exception           | settled                           | `src/warCouncil/playCard.ts`, `abilities.ts`                                                                | —                                                       |
| The four outcomes                             | settled                           | `src/warCouncil/bank.ts` — `trickOutcomeFor`, `isTaken`                                                     | —                                                       |
| Card value = printed rank                     | settled                           | `src/warCouncil/bank.ts` — `resolveTrickBank` sums `card.rank`; no value function exists                    | —                                                       |
| The bank, and that it only climbs             | settled                           | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                               | —                                                       |
| The streak multiplier, and its reset          | settled                           | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                               | —                                                       |
| Cash-out on damage (`bank × multiplier`)      | settled                           | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                               | —                                                       |
| Cash-out at the end of the sixth trick        | settled                           | `src/warCouncil/bank.ts` — `resolveTrickBank`'s `finalTrick` fold                                           | —                                                       |
| Damage to the player = 1 per event            | settled                           | `src/hunt/config.ts` — `DAMAGE_PER_HIT`                                                                     | —                                                       |
| Player health (25)                            | settled                           | `src/hunt/config.ts` — `PLAYER_START_HEALTH`                                                                | —                                                       |
| Quarry health (1,000)                         | **open** — a labelled placeholder | `src/hunt/config.ts` — `QUARRY_ENCOUNTER_HEALTH`                                                            | **Developer, from a play session**                      |
| Damage applied per trick, mid-hand            | settled                           | `src/hunt/encounter.ts` — `applyDamage`; called per resolution by `src/app/warCouncil/roundReducer.ts`      | —                                                       |
| The seat → side crossing, once                | settled                           | `src/warCouncil/bank.ts` — `incomingFrom`                                                                   | —                                                       |
| Health never negative; surplus discarded      | settled                           | `src/hunt/encounter.ts` — `deplete`, the single clamp                                                       | —                                                       |
| Both bars settle before either is checked     | settled                           | `src/hunt/encounter.ts` — `applyDamage` depletes both, then `resolveWinner`                                 | —                                                       |
| Simultaneous depletion → player loses         | settled                           | `src/hunt/config.ts` — `SIMULTANEOUS_DEPLETION_WINNER`; read by `resolveWinner`                             | —                                                       |
| An encounter can end mid-hand, and play stops | settled                           | `src/app/warCouncil/roundReducer.ts` — the `isEncounterResolved` guard in `canAct`                          | Developer — whether it feels abrupt                     |
| Health carried hand to hand                   | settled                           | `src/app/warCouncil/roundReducer.ts` owns the live `EncounterState`; `src/App.tsx` carries it between hands | —                                                       |
| No cap on hands per encounter                 | settled — deliberately none       | no cap key exists to read                                                                                   | Developer, if the tail stalls                           |
| Bank and streak on screen throughout          | settled                           | `src/app/warCouncil/BankMeter.tsx`                                                                          | Developer — the visual values                           |
| Both sides' health on screen                  | settled                           | `src/app/warCouncil/DuelHealthBars.tsx`, `duelHealthBars.ts`                                                | Developer — whether 25 reads well in 1-point steps      |
| The hand-over tally                           | settled                           | `src/app/warCouncil/RoundOverPanel.tsx`                                                                     | —                                                       |
| The Quarry dumps skulls into losing tricks    | settled                           | `src/warCouncil/cpuPlayer.ts` — `chooseCpuCard`'s first branch                                              | —                                                       |
| The Quarry's **lead** ignores skulls          | settled — deliberately minimal    | `src/warCouncil/cpuPlayer.ts` — the lead branch is unchanged                                                | Developer — the obvious next CPU change                 |
| The Quarry has no rule-break of any kind      | settled                           | nothing to enforce — `legalMoves.ts` reads only the led card; guarded by `cpuPlayer.test.ts`'s 60-seed soak | —                                                       |
| Quarry character = a name only                | settled                           | `src/hunt/quarryCharacters.ts` — `QuarryCharacterInfo` has no rule field                                    | —                                                       |
| What any character's power is                 | **not built** — undecided         | —                                                                                                           | **Developer — a final-boss ticket, not every opponent** |
| Telegraph fidelity                            | provisional                       | `src/hunt/config.ts` — `TELEGRAPH_FIDELITY`                                                                 | Developer, after playtest                               |
| Rank 8's name ("Poison")                      | **open** — misleading             | `src/app/warCouncil/labels.ts` — `RANK_NAME`                                                                | Developer                                               |
| Between-encounter restore (none)              | **not built**                     | `src/hunt/config.ts` — `ENCOUNTER_PLAYER_RESTORE` (still no consumer)                                       | Developer — most likely to change                       |
| Forage                                        | **not built**                     | `src/hunt/config.ts` — `FORAGE_BUDGET_PER_ENCOUNTER` (no consumer)                                          | Developer — budget is provisional                       |
| The run — a sequence of encounters            | **not built**                     | `src/hunt/config.ts` — `QUARRY_ENCOUNTER_HEALTH` holds one entry                                            | —                                                       |
| Run length                                    | **open** — placeholder 5          | `src/hunt/config.ts` — `ENCOUNTERS_PER_RUN` (no consumer)                                                   | Developer                                               |
| Snare (in-hand edits)                         | **open**, blocked                 | —                                                                                                           | Needs a cost before it's viable                         |

### The redesign landed whole — DLR-80 closed 2026-08-13

**What a player does now that they did not before:** deal six cards instead of thirteen; read which of
the Quarry's cards are skulled before committing; dodge a skull deliberately; watch a bank and a
streak climb; and take damage — or deal it — several times within one hand rather than once at the
end.

**What is gone:** the declaration and its gate, both Standing tables and their four bands, rank
inversion, the Lose-path pile swap, Spoils and the capture piles, damage rounding, pending damage,
and the once-per-Hunt damage application with its confirmation press. All of it is deleted from the
code, not deferred.

**Engine and screen landed together.** There is no rule in this document that is enforced but
unreachable, and none reachable but unenforced — which is the first time that has been true since
this file was written.

**Five things the developer owns**, none blocking, all named in their sections above: the Quarry's
health placeholder, the skull rank distribution, whether the Quarry should avoid _leading_ skulls,
whether a skull should survive changing hands, and whether rank 8 keeps the name "Poison".

### The Quarry's power was removed — DLR-81, 2026-08-13

**What a player does now that they did not before:** follows the Quarry's lead with **every card of
that suit legal**, rather than only their Swan or their highest of it. The narrowing survives on a
led rank 11 alone, and binds both sides.

**What is gone:** the Quarry's whole-hand narrowing, and the rule sentence the dossier panel printed
to describe it. A character is now a name and a trick count. Nothing in the engine reads which
character you are facing.

**Deferred, not deleted.** Powers are intended for a final boss and will be designed then. See
[What this game does not have](#the-quarrys-character-power--removed-2026-08-13-deferred-not-deleted).

### Known tensions, recorded not resolved

- **The Quarry's health is a placeholder, and every other measurement depends on it** (new
  2026-08-13). Too low and the encounter is over in two hands; too high and it is a grind. Neither
  tells you anything about the six tricks, which is what the play-test is for. Play-test 2 §8 names
  the measurement that sets it: record your biggest cash-out each hand.
- **The slippery slope may need a brake** (new 2026-08-13, play-test 2 §6 Q4). Losing a trick punishes
  you **twice** — 1 damage _and_ an early cash-out at a small multiplier — while winning compounds
  both terms. That is Balatro's shape and may be exactly right, but it means a bad hand is very bad.
  Play-test 2 says explicitly: watch for it before adding anything.
- **The Quarry does not avoid leading a skull, so some dodges are free** (new 2026-08-13). Its skull
  play is adversarial only when following. Leading a skulled card hands the player a dodge that was
  not a decision. Play-test 2 §8's first measurement — count the tricks you deliberately dodge — is
  what will surface it: free dodges will inflate that count without being reads.
- **An encounter can end on trick 3, cutting a hand off in the middle** (new 2026-08-13). This is the
  honest reading of "the encounter ends when either total reaches zero" given that damage now lands
  per trick. Whether it reads as a decisive finish or as an interruption is a question only playing
  answers.
- **Whether the player's health bar reads well at 25** (new 2026-08-13). It is nine-ish discrete
  steps of 1, where the same bar previously drained smoothly from 1,350. A bar treatment tuned for a
  continuous figure may read badly for a small integer count.
- **Rank 8 is still called "Poison" and now means nothing at all** (new 2026-08-13, play-test 2 §6
  Q3). It has no play-time ability and no scoring intervention, and the skull is a _separate_ marker
  — so the name actively suggests a connection that does not exist. It will read as a bug in the
  play-test.
- **Many six-card hands will contain no named rank at all** (new 2026-08-13, play-test 2 §6 Q2). The
  Fox, Witch, Woodcutter, Swan and Monarch are much of what makes this feel like Fox in the Forest,
  and a six-card hand draws from the same 33-card deck. Ability-free hands are accepted as normal
  today by default rather than by decision.
- **Whether a skull should survive changing hands** (new 2026-08-13). The rule tests the trick, not
  the seat, so a skulled card the Quarry's Fox exchanges into the decree still carries its skull if
  the player's Fox later takes it. Rare, but expressible in one hand.
- **No card is worth declining.** There is no negative card value anywhere in this game, so there is
  no card a player would rather leave behind. A future Forage ticket wanting "cards you would rather
  leave behind" must create that property deliberately — nothing in the deck supplies it. _(Carried
  from 2026-08-12; DLR-80 did not change it, and the bank summing printed ranks preserves it.)_
- **Aiming for the same line every hand may not be a decision.** Carried forward in a new form: the
  old version was "aim for Victorious every Hunt". The new equivalent is whether the streak
  multiplier ever actually changes a choice, or whether taking every trick you can is simply always
  right. Play-test 2 §8's fourth measurement asks exactly this — did the multiplier ever change a
  decision?
