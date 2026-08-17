# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-16**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

> **Winning pays, and there is somewhere to spend it — DLR-84, 2026-08-16.** Beating a Quarry pays
> you **1 coin**, which carries for the rest of the run and is on screen while you fight for it.
> Between fights you now choose: go straight on, or **visit a shop** selling exactly two things at 1
> coin each — a **Cheat** into a free slot, or **4 health** restored on the spot. You may buy
> nothing, or buy again while you can pay. Try to walk past with money you could spend and the game
> stops to say so. See [section 10](#10-between-hands-and-the-run). **This is the first thing in the
> game that costs something, and the first answer to a run you were expected to lose.** Engine and
> screen landed together.

> **You can break follow-suit twice a run — DLR-83, 2026-08-16.** You hold **two Cheat slots**, drawn
> as two card frames beside the decree. A held Cheat is **armed with two clicks**, and while it is
> armed **follow-suit does not bind you** — every card in your hand becomes legal, so a trick you
> would have been forced to take can be refused. The next card you commit **spends** that Cheat and
> empties its slot; the slots carry across fights like health does. It lifts **follow-suit only** —
> the led-Monarch narrowing still binds — and the Quarry gets nothing. See
> [section 4](#4-playing-a-trick). **Engine and screen landed together.** A run starts with two, and
> since DLR-84 you can buy more.

> **The game is a run now — DLR-82, 2026-08-15.** Three fights in order, against Quarries of rising
> health, on **one health bar that never refills**. Win and you carry your remaining health into a
> tougher fight; empty and the run is over. A full-screen verdict states which of the three things
> just happened. See [section 10](#10-between-hands-and-the-run). **Engine and screen landed
> together — nothing in that section is enforced but unreachable.**

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
> - Taking a trick banks it and climbs a **streak multiplier**; taking damage costs **1 health**,
>   cashes `bank × multiplier` into the Quarry, and resets both to zero (sections 7–8).
> - Damage now lands **per trick, mid-hand** — so an encounter can end on trick 3 (section 8).
>
> **The whole of it is playable, and it has been won.**

> **The bank counts tricks, not card values — PT-002, 2026-08-14.** DLR-80's bank added **both cards'
> printed ranks** on every trick taken. It now adds **1 per trick**, so both terms of the cash-out are
> the same number — the length of your streak — and a streak of _n_ cashes exactly **`n × n`**: 1, 4,
> 9, 16, 25, 36 across a hand (section 7). Nothing else about the loop moved. **Both health totals now
> stand at 10** (section 8), because a hand that used to deal about 84 now deals about 7.

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

**[settled]** — the procedure and the ~30% density; which ranks the skulls land on is
**[provisional]**, below.

Roughly **30% of the Quarry's dealt cards carry a skull**. In a six-card hand that is **2 of 6**.
How _many_ skulls a hand carries and _which ranks_ they land on are two separate dials: the density
below is settled, the rank curve below it is not.

**No skull is ever on a rank 1.** A skulled 1 could not lose its trick, so it would be an undodgeable
tax rather than a decision — excluding it is what leaves foreknowledge worth having (play-test 2
§3.4). Rank 1 carries **zero weight in every rank curve the game ships**, so the rule holds whichever
curve is in force — including any curve added later.

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

### How skulls are spread across ranks — **[provisional]**

Skulls are **not** spread evenly. Each rank carries a **weight** — how likely a card of that rank is
to be the one skulled — and the Quarry's skulls are drawn against those weights. Rank 1's weight is
zero, which is where "never rank 1" now lives.

The curve in force concentrates skulls on the **middle ranks** and leaves the extremes light:

| Rank   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weight | 0   | 2   | 5   | 8   | 10  | 10  | 8   | 5   | 2   | 1   | 1   |

In play that means a **5 or a 6 in the Quarry's hand is skulled far more often than a 10 or an 11**.
The reasoning is that the extremes take the decision away from you: a very low skull is one the Quarry
can only lose with, so it goes into a trick you have already won and you eat it with no counterplay,
while a very high skull wins its own trick, which is a dodge you did not earn. Only the middle band
leaves the outcome to the card you choose. Play-test 2 §6 Q1 raised the question and ranks it as the
one the game's feel depends on most; `hybrid-design.md` does not cover rank weighting, so the
reasoning is recorded in `ideas.md` → "Worth costing" rather than in a design section.

**Why provisional and not settled:** the curve was chosen from a simulation, not from play. It is a
deliberate choice rather than a placeholder — but nobody has yet played a hand under it, and the
weights are expected to move. Three other curves ship unused (an even one, one rising with rank, and
one falling with rank) so a later opponent can be given a different curve as a difficulty setting;
**none of that is wired to an opponent yet** — the game has one curve for everyone.

**Whose decision:** the developer's, after playing. Whether this reads as tense or merely noisy is
the thing to watch.

> **Rank weighting does not fix every unfair skull, and two cases survive it.** A skull in the
> **trump suit** is near-harmless at any rank, because a trump wins its trick and a skull trick the
> Quarry wins is a dodge for you. And a Quarry **holding nothing in the led suit** can dump a skull
> whatever its rank, which you cannot dodge. Both are recorded in `ideas.md` and neither is addressed.

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

### Cheats — refusing a trick follow-suit would force on you

**[settled]** — the procedure; **how many Cheats a run starts with** is **[open]**, below.

You hold **two Cheat slots**. A Cheat is a card you hold, not a counter: each is one use, and
spending one frees its slot. The slots sit beside the decree and are on screen for the whole hand,
whether they hold anything or not.

**Playing a held Cheat takes two clicks on it.**

1. **The first click selects it.** Nothing about the rules changes yet — this exists so a single
   misclick can never spend one.
2. **The second click arms it.** While a Cheat is armed, **follow-suit does not bind you**: every
   card in your hand is legal, including the off-suit cards it would otherwise forbid. Your whole
   hand becomes playable on screen, which is how you can tell.
3. **The next card you commit spends it.** The Cheat is gone and its slot is empty.

**A third click gives an armed Cheat back**, unspent. So does pressing Escape. Nothing is committed
until you play a card.

**The Cheat lifts follow-suit and nothing else.** A led Monarch still narrows you to your Swan or
your highest of that suit (above), and every other rule in these sections is untouched. If you play
a card that some other rule forbids, the play is refused and the Cheat is **not** spent — a refusal
is not a commitment.

> **The Cheat is spent whether or not it was needed.** Committing any card while one is armed
> consumes it, even a card that was perfectly legal anyway. Arming is therefore itself the decision;
> there is no refund for changing your mind after the fact, only for disarming before you play. It is
> recorded under [Known tensions](#known-tensions-recorded-not-resolved).

**The Quarry holds no Cheats and can never break follow-suit.** This is a thing the player can do
that the opponent cannot — the first such asymmetry in the game.

#### How many you get — **[open]**

A run **starts with two**, filling both slots, and that number is a placeholder chosen so the
mechanic can be exercised at all. **Whose decision:** the developer's — one would make _when_ to
spend it a sharper question from the first fight, which is the question this mechanic exists to
raise.

**Since 2026-08-16 you can also buy them.** A Cheat costs 1 coin at the shop between fights, and
goes into a free slot ([section 10](#10-between-hands-and-the-run)). You still hold no more than
two at once: with both slots full the shop refuses the purchase and says so. So a run's total supply
is two at a time, replenished for a coin whenever you have spent one.

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

**[settled]** — the whole of this section. The four outcomes and the cash-out equation are play-test
2 §3.2 and §3.3; **what the bank counts is not, and no design document covers it** — play-test 2 §3.3
specifies the rank sum this section no longer describes. The trick-count bank was decided in session
on 2026-08-14 and the measurement behind it is recorded in `ideas.md` → "Worth costing" rather than in
a design section. Where the two disagree, this document follows the code.

Every trick resolves into exactly one of four outcomes, decided by two facts: **did you win it**, and
**was it a skull trick**.

| You…               | Clean trick (no skull)           | Skull trick                             |
| ------------------ | -------------------------------- | --------------------------------------- |
| **won the trick**  | **Clean win** — you take it      | **You ate the skull** — you take damage |
| **lost the trick** | **Clean loss** — you take damage | **Dodge** — you take it                 |

So the skull **inverts the trick**: on a clean trick you want to win it, on a skull trick you want to
lose it.

### Taking a trick — a clean win, or a dodge

**One is added to your bank**, and your **multiplier goes up by one**. Nothing else happens: no damage
is dealt in either direction.

A clean win and a dodge are **identical in every respect** but their name.

### Taking damage — a clean loss, or eating a skull

Three things happen at once:

1. You take **1 damage**. Always exactly 1, whatever the cards were worth.
2. Your bank **cashes out**: `bank × multiplier` is dealt to the Quarry's health.
3. The bank and the multiplier both **reset to zero**.

A clean loss and eating a skull are **identical in every respect** but their name.

### The bank

**The bank only ever climbs** until it cashes. It is **the number of tricks you have taken** since the
last cash-out — one per trick, whatever the cards in it were.

**The cards you take are worth nothing in themselves.** A trick of two 11s and a trick of two 2s bank
exactly the same: one. Ranks decide who _wins_ a trick (section 6) and nothing else.

### The streak multiplier

**The multiplier is the number of tricks you have taken in a row.** Clean wins and dodges both count;
it starts at zero each time it resets, and any damage you take resets it.

### So a streak of _n_ cashes `n × n`

The bank and the multiplier climb together — by exactly one each, per trick taken — so while a streak
runs they are the same number, and a cash-out is worth its square:

| Tricks taken in a row | 1   | 2   | 3   | 4   | 5   | 6   |
| --------------------- | --- | --- | --- | --- | --- | --- |
| **Cashes for**        | 1   | 4   | 9   | 16  | 25  | 36  |

A whole hand taken in one unbroken run pays **36**. One loss in the middle of that same hand costs far
more than a sixth of it: taking three, losing the fourth, then taking the last two pays **9 + 4 = 13**.
So **where** your losses fall matters more than how many you take, and a loss in the middle of a hand
is worse than one at either end.

The two terms are shown separately on screen rather than as one number, and they are kept separate in
the rules for the same reason: an item that raises the multiplier without adding tricks is a thing
this game intends to have. Nothing does it yet.

> **This replaced `Spoils × Standing`, and the shape of the reward is the point of the change.** The
> old equation was scored once, at the end of thirteen tricks, off a multiplier table read from the
> final trick count — so a total could _fall_ when you won a trick, and nothing was settled until the
> last card. The bank only climbs, the multiplier only climbs, and both cash on an event the player
> can see coming.

> **Card values left the bank on 2026-08-14, and this is what changed.** The bank was the summed
> printed ranks of every card in every trick taken. The payout is now **exactly predictable from the
> tricks alone** — the same shape of hand always pays the same number, where before the printed ranks
> swung it by roughly ±20% with no decision controlling that swing. Whether predictable reads as
> _readable_ or merely as _flat_ is the open question, and it is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

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

**[settled]** — the procedure; both health totals are **[provisional]**, below.

Both sides hold **health**, and the encounter ends when either total reaches zero.

| Value                              | Status                                                        |
| ---------------------------------- | ------------------------------------------------------------- |
| Player's starting health           | **10** — **[provisional]** (set 2026-08-14)                   |
| Quarry's health                    | **10** — **[provisional]** (set 2026-08-14, with the new bank) |
| Damage to the player, per event    | **1**, every time — **[settled]**                             |
| Health restored on winning a fight | **None** — **[not built]**, and nothing reads the tunable yet |
| Health restored by buying a heal   | **4**, clamped to your maximum — **[provisional]** (DLR-84)   |
| Both bars emptying together        | **The player loses**                                          |

**There is exactly one source of healing in the game, and you have to pay for it.** Winning a fight
restores nothing automatically; the only way health comes back is buying a heal at the shop between
fights, for a coin ([section 10](#10-between-hands-and-the-run)). There is no flask and no rest
site.

**The two numbers are now the same, and they were not before.** The Quarry's total sat in the
hundreds for as long as the bank summed card values and a hand dealt about 84. Once the bank counted
tricks instead, a hand dealt about **7** — so 400 would have been roughly 55 hands, and the figure
came down with the payout it was sized against.

### Both totals were set by playing — **[provisional]**

**Neither figure is derived, and both came from the table rather than the page.** Play-test 2 §5 had
stated outright that the Quarry's health could not be derived honestly from arithmetic, because it
depends on how large real cash-outs get and that is a function of play.

The Quarry went to **450 on 2026-08-13** from the first winning session, and to **400** on
2026-08-14 alongside the cut in player health. It came down to **10** later the same day, set by the
developer in the session that changed what the bank counts. The player's **10** has not moved since.
Both are provisional because each has moved more than once and neither has been played at its
current value.

**What the player's 10 changes.** At 25 the player's bar never came under threat inside a
three-hand encounter — it was sized as a **run-level** resource spent across several encounters, not
as tension within one, and the cheapness of a single health point had a second cost: losing the
**first** trick of a hand forfeits no cash-out, because the bank is still zero, so throwing trick 1
was close to free. At 10, a hand's worth of losses is a real fraction of the bar. Whether that makes
the fight tense or merely punishing is the thing to watch.

**A 10-health Quarry is a walkover, and that was accepted when it was set.** A single good hand can
pay 36, which is more than three times what it takes to win — so about a quarter of hands end the
encounter on their own, a fight lasts under two hands, and even random legal play wins most of the
time. The whole top of the payout table is invisible in practice, because everything past 10 is
discarded. The stated intent is that later upgrades raise the player's damage and the health numbers
move with them; both are expected to change after playing.

> **The retired 1,000 was not wrong by arithmetic so much as by opponent.** Every figure it was
> reasoned from had been measured against the Quarry's since-removed rule-break (section 9), which
> roughly halved a hand's damage. Play-test 3 §6.3 concluded 1,000 made the encounter unwinnable;
> play-test 4 §7.1 closed that finding when the same hands started dealing more than twice as much.

**One thing worth knowing before retuning the Quarry's total:** damage is **exactly quadratic in
streak length** — a streak of _n_ pays `n × n` and nothing else feeds it. So that number is far more
sensitive to how often a streak breaks than to how many tricks are won overall: a hand that trades
evenly deals a small fraction of one that runs five in a row. This used to be only _roughly_ true,
with the printed ranks adding noise around it.

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
Cashing 36 into a bar with 4 left is exactly the same as cashing 4. **Health is never negative** — a
bar stops at zero.

> **This is no longer a rare edge case.** With the Quarry at 10 and a good hand paying up to 36, more
> than a third of all damage dealt is thrown away. Paying the surplus back as currency is a stated
> intention and is **[not built]** — see [section 10](#10-between-hands-and-the-run).

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
| **Your tricks and your multiplier** | **Open — on screen throughout** as two separate figures, plus what the streak would cash for now.                                                                                                                         |
| What the last trick did             | **Stated** — which of the four outcomes it was, and what it cost or banked.                                                                                                                                                |
| **Your Cheat slots**                | **Open — two frames beside the decree**, filled or empty, all hand. A selected Cheat and an armed one differ in frame as well as tone, and the hint line names which state you are in (section 4).                          |
| **Your coins**                      | **Open — a plate on the status band**, beside the fight counter, all hand. Also stated on the verdict and throughout the shop (section 10).                                                                                 |
| **Both sides' health**              | **Open — two rows of hearts**, one heart per health point against each side's own maximum. The hearts a trick just took break as it resolves. While a streak is banked, the Quarry's last _bank × multiplier_ standing hearts flash as a preview of what cashing right now would take.                                                                                                                                    |

The telegraph's fidelity — suit only, or suit and stance — is **[provisional]**; it currently shows
both.

---

## 10. Between hands, and the run

Since 2026-08-15 most of this section is playable, and since 2026-08-16 the economy is too. The run
and the shop are both real; **Forage is not**.

### A run is three fights on one health bar — **[settled]**

A run is a fixed sequence of encounters, fought in order. **Three** are configured, and each Quarry
has more health than the last.

- **Your health carries from fight to fight, and nothing restores it.** You begin the next fight on
  exactly the health you finished the last one on. There is no rest, no heal, and no flask.
- **Beating a Quarry does not end the session.** The fight resolves, you are told you won it, and
  you choose to go on to the next one.
- **Your health emptying ends the run**, wherever it happens — including on the last fight. No
  further fight is offered.
- **Beating the last Quarry ends the run as a win**, and it is stated differently from beating any
  earlier one.
- **Your Cheat slots carry from fight to fight exactly as your health does** (section 4). A Cheat
  spent in fight one is still gone in fight two; one held is still held. They are granted once, at
  the start of the run, and are replenished only by buying one.
- **Your coins carry too**, and nothing takes them away but spending them.

> **Deviation from the base game.** There is no 21-point match and no symmetric contest. A run is
> one-directional: you accumulate damage and never recover it, and the only question is how far you
> get.

### The Quarries' health — **[provisional]**

**10, then 14, then 18.** The shape is fixed — at least three, rising, not all the same — and the
three numbers are the developer's to set from play.

At these values a run was **expected to be lost around the third fight**: a fight costs the player
roughly four health and the player starts with ten. That is the arithmetic working as designed, not
a fault. The intended answers were the shop and the flask in later work; **raising the player's
starting health is explicitly the wrong response** and is ruled out.

**The shop landed on 2026-08-16 and these numbers were deliberately left alone.** A heal buys back
4 health for a coin, and a fight pays a coin — so a player who spends every coin on health roughly
breaks even against a fight's cost. Whether that is enough of an answer is the thing to watch, and
retuning the curve before playing under the economy would answer nothing.

### The run's length — **[settled]**

**Three fights**, and the length is not separately settable: it is however many Quarry health values
are configured. Adding a fourth number adds a fourth fight.

### What you are told when a fight ends — **[settled]**

The fight's last trick is shown like any other, and clearing it takes you to a full-screen verdict:
a headline naming which of the three things happened, which fight of the run it was, the health you
carry, and how many of the deciding hand's tricks you took. There is exactly one thing to do from
it — go on to the next fight, or start a new run.

> This replaced a one-line message on a tally table that a play session showed the player did not
> read as having won or lost. The wording of every line on the verdict is placeholder and the
> developer's.

### Winning a fight pays a coin — **[settled]**; the amount is **[provisional]**

Beating a Quarry pays you **1 coin**. It is paid at the moment the fight is won, and only then —
nothing else in the game pays anything. Overkill damage pays nothing, taking tricks pays nothing,
and health remaining pays nothing.

Coins **carry for the whole run** and are on screen throughout: on a plate beside the fight counter
while you play, on the verdict, and in the shop while you choose. They do not survive a new run.

**Whose decision:** the developer's — 1 coin a fight is transcribed from the ticket, not derived.

### Between fights you choose: go on, or visit the shop — **[settled]**

Beating a Quarry with another still to come offers **two** things to do: **continue** straight to the
next fight, or **visit the shop**. The shop is never forced, and you can always go and look.

**Trying to walk past money you could spend stops you.** Choosing to continue while at least one
purchase is currently affordable replaces the two controls with a line naming what you are holding,
and offers the shop or the fight again. If nothing is affordable — you have no coins, or both slots
are full and you are at full health — you are not stopped, because there would be nothing to stop
for. Backing out of that prompt returns you to the verdict without doing either.

### What the shop sells — **[settled]**; both prices are **[provisional]**

Exactly **two** things, **1 coin** each:

| Buy         | You get                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| **Cheat**   | One Cheat card into a free slot (section 4)                                      |
| **Heal**    | **4 health**, immediately, and never above your maximum — the excess is lost     |

The screen states which opponent is coming next, and shows your coins, your health against its
maximum, and how many Cheat slots you are holding while you choose.

**You may buy nothing**, and the screen says so. **You may buy more than once in a visit** while you
still have the coins — two heals in one visit is eight health if you have the room and the money.

**A purchase you cannot make is refused with the reason on the screen**, never silently. Three
things can refuse one:

- **Both Cheat slots are full** — a Cheat has nowhere to go.
- **You are already at full health** — a heal would do nothing at all, so it is not sold to you.
- **You do not have the coins.**

When more than one applies, the shop names the one that will still be true when the money
arrives — full slots rather than an empty purse.

> **Refusing a heal at full health is this game's own rule, not the base game's and not the
> ticket's.** It was added deliberately: the clamp already discards overheal, but selling a heal to a
> player at full health takes a coin for provably nothing. Buying at 9 of 10 is still allowed and
> still costs a coin — only the wholly wasted purchase is refused.

**Leaving the shop starts the next fight**, with everything you bought already in effect: the health
you healed to, the Cheats in your slots, and whatever coins you did not spend.

### Which fight you are on — **[settled]**

Shown throughout play, beside the opponent's plate: `Fight 2 of 3`. It is stated on the shop screen
too, alongside who is coming next.

### Not built

- **Forage** — the only thing you would do between hands: edit the 33-card deck the next hand is
  dealt from, in exactly four ways — a card's **value**, its **ability**, its **suit**, and the
  **decree**. The budget is **4 edits per encounter** (**[provisional]**). **[not built]** — nothing
  reads the budget. **The player holds no skulls of their own**, and Forage could not add any.
- **Surplus cash-out damage paid back as money** — **[not built]**. The intention stated at PT-002
  was that overkill (section 8) becomes currency; the coin you actually get is a **flat payment for
  winning a fight** instead, and nothing reads overkill. That flat payout is the part of the
  intention that shipped.
- **Anything in the shop that raises the player's damage** — **[not built]**. The stated intention
  is that upgrades are what make the `n × n` payout scale past the early game; the shop currently
  sells survivability and a rule-break, and nothing touching the bank, the multiplier or damage. A
  card's **value** is one of the four things Forage may edit, and since 2026-08-14 a card's rank
  decides only who wins a trick — it feeds no scoring at all (section 7).
- **Any third item, a price curve, rerolls, or a rotating shelf** — **[not built]**. The shop shows
  the same two things at the same two prices on every visit.
- **Anything in the shop that reduces skull density** — **[not built]**, and ruled out rather than
  merely absent. The skull is the game's only inversion (section 7), and selling a way past it would
  remove the reason taking every trick is not simply correct.
- **A restore between fights** — **[not built]**, and deliberately so. The tunable exists and is
  read by nothing; wiring it in was explicitly forbidden until the flask is designed. **The shop's
  heal is not this** — it costs a coin and you must choose it.
- **Coins carrying between runs** — **[not built]**. A new run starts at zero.
- **Different Quarries.** Every fight of the run is against the same character, and every opponent
  plays identically — only its health differs. A roster of named opponents is later work.
- **Stages, stage gimmicks, and a boss.** The run is a flat sequence.
- **Persistence.** Reloading the page starts a new run; nothing is saved.
- **Snare** — an in-hand edit layer — is **[open]** and explicitly blocked: "raise the value of the
  card I am about to win with" is a dominant strategy until it has a cost.

---

## 11. What this game does not have

Two tables: what the base game had, and what this game itself had until 2026-08-13.

### From the base game

| Base-game rule                    | Here                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The 21-point match**            | **Dropped.** It ends a symmetric two-player contest. The run, and the health both sides hold, replace it — and since DLR-82 the run genuinely exists ([section 10](#10-between-hands-and-the-run)). |
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
| **Health at 1,350 / 1,600**                         | 10 and 10, both set from play (section 8).                                                                       |

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

| Rule area                                     | Status                           | Where enforced                                                                                                                   | Who decides what's open                                 |
| --------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Deck, decree, draw pile                       | settled                          | `src/warCouncil/deck.ts`, `deal.ts`                                                                                              | —                                                       |
| Hand size and trick count (6)                 | settled                          | `src/hunt/config.ts` — `HAND_SIZE`; sliced in `src/warCouncil/deal.ts`, ends the hand in `playCard.ts`                           | —                                                       |
| First dealer, alternation                     | provisional                      | `src/app/dealerForRound.ts`                                                                                                      | Developer                                               |
| Skull density (~30%, 2 of 6)                  | settled                          | `src/hunt/config.ts` — `SKULL_DENSITY`; applied by `src/warCouncil/skulls.ts` — `assignSkulls`                                   | —                                                       |
| Skulls never on rank 1                        | settled                          | `src/hunt/config.ts` — every `SKULL_WEIGHTS_*` curve sets rank `1: 0`; filtered by `src/warCouncil/skulls.ts` — `skullableCards` | —                                                       |
| Skull rank curve (hump — mid-ranks heaviest)  | **provisional**                  | `src/hunt/config.ts` — `SKULL_RANK_WEIGHTS`; drawn against by `src/warCouncil/skulls.ts` — `weightedDraw`                        | Developer, after playing                                |
| A curve per opponent                          | **not built**                    | nothing — `SKULL_RANK_WEIGHTS` is one module-level curve; the other three are exported and unread                                | Developer — a later ticket                              |
| Skulls assigned to the Quarry's deal only     | settled                          | `src/warCouncil/deal.ts` — `assignSkulls(cpuHand, rng)`; the draw pile is never skulled                                          | —                                                       |
| A trick is skulled if any card in it is       | settled                          | `src/warCouncil/skulls.ts` — `trickIsSkulled`                                                                                    | Developer — whether it should die with a Fox exchange   |
| Shape readout shows no rank                   | settled                          | `src/warCouncil/skulls.ts` — `suitShape`; drawn by `src/app/warCouncil/QuarryShape.tsx`                                          | —                                                       |
| A skulled card is marked once face up         | settled                          | `src/app/warCouncil/PlayingCard.tsx` — the `skulled` prop; passed by `TrickWell.tsx`                                             | —                                                       |
| Follow-suit, led-Monarch narrowing            | settled                          | `src/warCouncil/legalMoves.ts` — `legalMoves`, `monarchFollowSet`                                                                | —                                                       |
| An armed Cheat lifts follow-suit only         | settled — since DLR-83           | `src/warCouncil/legalMoves.ts` — `LegalMoveOptions.ignoreFollowSuit`, read after the Monarch branch returns; threaded by `playCard.ts` | —                                                 |
| Two Cheat slots, one card each                | settled                          | `src/hunt/config.ts` — `CHEAT_SLOT_COUNT`; the cap is stated once, in `src/hunt/cheats.ts` — `addCheat`                          | —                                                       |
| Two clicks to arm, a third to give it back    | settled                          | `src/app/warCouncil/roundReducer.ts` — `TapCheat`, `CancelCheat`, `cheatArmed`; rendered by `CheatSlots.tsx`                     | Developer — whether arming feels like a detour          |
| Committing while armed spends the Cheat       | settled                          | `src/app/warCouncil/roundReducer.ts` — `commit`; removal in `src/hunt/cheats.ts` — `removeCheat`                                 | Developer — whether spending it on an already-legal card is right |
| A refused play does not spend the Cheat       | settled                          | `src/app/warCouncil/roundReducer.ts` — `commit`'s rejection branch returns before the removal                                    | —                                                       |
| Cheats carried fight to fight                 | settled                          | `src/hunt/run.ts` — `RunState.cheats`; `advanceRun`'s spread carries it, `recordEncounter` adopts the hand's survivors           | —                                                       |
| Cheats a run starts with (2)                  | **open** — a placeholder         | `src/hunt/config.ts` — `RUN_STARTING_CHEATS`; granted by `src/hunt/cheats.ts` — `grantCheats`                                    | **Developer** — 1 sharpens the "when" question          |
| The Quarry holds no Cheats                    | settled                          | nothing to enforce — the bypass is an argument the Quarry's call sites never pass; a grep guards the absence                     | —                                                       |
| Buying a Cheat (1 coin, into a free slot)     | settled — since DLR-84           | `src/hunt/run.ts` — `buyFromShop` calls `addCheat` and advances `nextCheatId`; priced by `src/hunt/config.ts` — `CHEAT_PRICE`    | Developer — the price                                   |
| Selling or replacing a Cheat                  | **not built**                    | nothing — the shop only adds                                                                                                     | Developer — a later ticket                              |
| Odd-rank abilities                            | settled                          | `src/warCouncil/abilities.ts`, `resolveTrick.ts`                                                                                 | —                                                       |
| Whether abilities survive six-card hands      | **open**                         | nothing — abilities are unchanged and ability-free hands are accepted                                                            | Developer, after playtest                               |
| Trick resolution, Witch-as-trump              | settled                          | `src/warCouncil/resolveTrick.ts`                                                                                                 | —                                                       |
| Winner leads next, Swan's exception           | settled                          | `src/warCouncil/playCard.ts`, `abilities.ts`                                                                                     | —                                                       |
| The four outcomes                             | settled                          | `src/warCouncil/bank.ts` — `trickOutcomeFor`, `isTaken`                                                                          | —                                                       |
| Cards have no value; the bank counts tricks   | settled — since PT-002           | `src/warCouncil/bank.ts` — `resolveTrickBank` banks a literal 1 per trick taken; it reads no card at all, and no value function exists | —                                                  |
| A streak of _n_ cashes `n × n`                | settled                          | `src/warCouncil/bank.ts` — both terms climb by 1 per take, so the product is a square; pinned by `bank.test.ts`'s `[1,4,9,16,25,36]` spec | —                                               |
| The bank, and that it only climbs             | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                                                    | —                                                       |
| The streak multiplier, and its reset          | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                                                    | —                                                       |
| Cash-out on damage (`bank × multiplier`)      | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                                                    | —                                                       |
| Cash-out at the end of the sixth trick        | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`'s `finalTrick` fold                                                                | —                                                       |
| Damage to the player = 1 per event            | settled                          | `src/hunt/config.ts` — `DAMAGE_PER_HIT`                                                                                          | —                                                       |
| Player health (10)                            | **provisional** — set 2026-08-14 | `src/hunt/config.ts` — `PLAYER_START_HEALTH`                                                                                     | Developer, after playing                                |
| Quarry health (10)                            | **provisional** — set 2026-08-14 | `src/hunt/config.ts` — `QUARRY_ENCOUNTER_HEALTH`                                                                                 | Developer, after playing                                |
| Damage applied per trick, mid-hand            | settled                          | `src/hunt/encounter.ts` — `applyDamage`; called per resolution by `src/app/warCouncil/roundReducer.ts`                           | —                                                       |
| The seat → side crossing, once                | settled                          | `src/warCouncil/bank.ts` — `incomingFrom`                                                                                        | —                                                       |
| Health never negative; surplus discarded      | settled                          | `src/hunt/encounter.ts` — `deplete`, the single clamp                                                                            | —                                                       |
| Both bars settle before either is checked     | settled                          | `src/hunt/encounter.ts` — `applyDamage` depletes both, then `resolveWinner`                                                      | —                                                       |
| Simultaneous depletion → player loses         | settled                          | `src/hunt/config.ts` — `SIMULTANEOUS_DEPLETION_WINNER`; read by `resolveWinner`                                                  | —                                                       |
| An encounter can end mid-hand, and play stops | settled                          | `src/app/warCouncil/roundReducer.ts` — the `isEncounterResolved` guard in `canAct`                                               | Developer — whether it feels abrupt                     |
| Health carried hand to hand                   | settled                          | `src/app/warCouncil/roundReducer.ts` owns the live `EncounterState`; `src/App.tsx` carries it between hands                      | —                                                       |
| No cap on hands per encounter                 | settled — deliberately none      | no cap key exists to read                                                                                                        | Developer, if the tail stalls                           |
| Tricks and multiplier on screen throughout    | settled                          | `src/app/warCouncil/BankMeter.tsx`; wording in `labels.ts` — `TRICKS_LABEL`, `MULTIPLIER_LABEL`                                  | Developer — the wording and the visual values           |
| The two terms stay separately addressable     | settled — an affordance, unused  | `src/warCouncil/bank.ts` — `bank` and `multiplier` are two fields; nothing moves them apart yet                                  | —                                                       |
| Surplus damage paid back as money             | **not built**                    | nothing reads overkill — the coin is a flat payment for winning, not a share of the cash-out                                     | Developer — a later ticket                              |
| Both sides' health on screen                  | settled                          | `src/app/warCouncil/DuelHealthBars.tsx`, `duelHealthBars.ts`, `HeartMark.tsx` — one heart per point since DLR-86                 | Developer — whether 10 (and 18) hearts read well        |
| The Quarry's hearts preview the banked streak | **provisional**                  | `src/app/warCouncil/duelHealthBars.ts` — `projectedFromStreak`; styling in `warCouncilHealthBars.css`                            | Developer — whether it reads as pending or as spent     |
| The hand-over tally (between hands only)      | settled                          | `src/app/warCouncil/RoundOverPanel.tsx` — its terminal branch was **deleted** by DLR-82; a resolved fight is the verdict's       | Developer — whether losing the felt's tally costs anything |
| The Quarry dumps skulls into losing tricks    | settled                          | `src/warCouncil/cpuPlayer.ts` — `chooseCpuCard`'s first branch                                                                   | —                                                       |
| The Quarry's **lead** ignores skulls          | settled — deliberately minimal   | `src/warCouncil/cpuPlayer.ts` — the lead branch is unchanged                                                                     | Developer — the obvious next CPU change                 |
| The Quarry has no rule-break of any kind      | settled                          | nothing to enforce — `legalMoves.ts` reads only the led card; guarded by `cpuPlayer.test.ts`'s 60-seed soak                      | —                                                       |
| Quarry character = a name only                | settled                          | `src/hunt/quarryCharacters.ts` — `QuarryCharacterInfo` has no rule field                                                         | —                                                       |
| What any character's power is                 | **not built** — undecided        | —                                                                                                                                | **Developer — a final-boss ticket, not every opponent** |
| Telegraph fidelity                            | provisional                      | `src/hunt/config.ts` — `TELEGRAPH_FIDELITY`                                                                                      | Developer, after playtest                               |
| Rank 8's name ("Poison")                      | **open** — misleading            | `src/app/warCouncil/labels.ts` — `RANK_NAME`                                                                                     | Developer                                               |
| Between-encounter restore (none, automatic)   | **not built** — deliberately     | `src/hunt/config.ts` — `ENCOUNTER_PLAYER_RESTORE`; still **no consumer**, and DLR-82 forbade adding one. A grep guards it        | Developer — the flask stories own it                    |
| Winning a fight pays 1 coin                   | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `COINS_PER_ENCOUNTER_WIN`; credited by `src/hunt/run.ts` — `recordEncounter`, the single payout site      | Developer — transcribed, not derived                    |
| Coins carry across the run, and are on screen | settled — since DLR-84           | `src/hunt/run.ts` — `RunState.coins`, carried by `advanceRun`'s spread; drawn by `src/app/warCouncil/RoundStatusBand.tsx`'s `.wc-coins` plate | —                                          |
| The shop, and its exactly two items           | settled — since DLR-84           | `src/hunt/shop.ts` — `SHOP_ITEMS`; rendered by `src/app/run/ShopPanel.tsx`, which maps it rather than listing the items          | —                                                       |
| The shop is opt-in, reached from the verdict  | settled — the developer's ruling | `src/App.tsx` — the `BetweenPhase` union; controls in `src/app/run/RunOutcomePanel.tsx`                                          | Developer — whether the pair reads at a glance          |
| Continue warns when something is affordable   | settled                          | `src/hunt/shop.ts` — `canBuyAnything`, `some()` over `refusalFor`; raised by `src/App.tsx`'s `handleContinue`                    | **Developer** — safety net or nag; a threshold is one line |
| Backing out of the warning takes no action    | settled                          | `src/app/run/RunOutcomePanel.tsx` — `onDismissWarning` on the swapped block's `Escape`                                           | Developer — whether it should mean "continue anyway"    |
| Both prices (1 coin each)                     | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `CHEAT_PRICE`, `HEAL_PRICE`, deliberately two keys                                                        | **Developer** — if Heal wins every visit, the Cheat is mispriced |
| A heal restores 4, clamped, surplus discarded | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `HEAL_HEALTH_RESTORED`; the `Math.min` in `src/hunt/run.ts` — `buyFromShop` is the single clamp           | Developer — the amount                                  |
| A heal is the only healing in the game        | settled                          | `src/hunt/run.ts` — `buyFromShop` is the sole writer that raises player health; no flask and no rest site exist                  | —                                                       |
| A refused purchase states its reason          | settled                          | `src/hunt/shop.ts` — `refusalFor`; worded by `src/app/run/shopLabels.ts` — `PURCHASE_REFUSAL_MESSAGE`                            | Developer — the wording                                 |
| The durable reason wins over the coin check   | settled                          | `src/hunt/shop.ts` — `refusalFor` tests slots and health **before** the balance                                                  | —                                                       |
| A heal at full health is refused, not sold    | settled — this game's own rule   | `src/hunt/shop.ts` — `PurchaseRefusal.AlreadyFullHealth`; the ticket did not state it                                            | Developer — selling it and discarding is the alternative |
| Buy nothing, or buy repeatedly while you can  | settled                          | nothing to enforce — leaving is always offered, and `buyFromShop` is a plain transition with no per-visit cap                    | —                                                       |
| Leaving the shop starts the next fight        | settled                          | `src/App.tsx` — `leaveForNextFight`, the one call to `advanceRun`, reached from all three forward controls                       | Developer — whether `Escape` should do this             |
| Nothing in the shop reduces skull density     | settled — ruled out              | nothing to enforce — no key, no item, and no code path touches `SKULL_DENSITY` or the curves                                     | —                                                       |
| Coins carrying between runs                   | **not built**                    | nothing is persisted anywhere; `startRun` seeds `coins: 0`                                                                       | Developer — a later ticket                              |
| Forage                                        | **not built**                    | `src/hunt/config.ts` — `FORAGE_BUDGET_PER_ENCOUNTER` (no consumer)                                                               | Developer — budget is provisional                       |
| The run — a sequence of encounters            | settled — since DLR-82           | `src/hunt/run.ts` — `RunState`, `startRun`, `advanceRun`; driven by `src/App.tsx`                                                | —                                                       |
| Health carried fight to fight, no restore     | settled                          | `src/hunt/run.ts` — `advanceRun` passes `encounter.health[Player]` into `startEncounter`                                         | —                                                       |
| Your health emptying ends the run             | settled                          | `src/hunt/run.ts` — `outcomeFor` checks the Quarry's win before the last-fight case                                             | —                                                       |
| Winning the last fight wins the run           | settled                          | `src/hunt/run.ts` — `outcomeFor`'s `encounterIndex === encounterCount - 1`                                                       | —                                                       |
| The Quarries' health (10, 14, 18)             | **provisional** — set 2026-08-15 | `src/hunt/config.ts` — `QUARRY_ENCOUNTER_HEALTH`                                                                                 | **Developer, after playing** — entries 1–2 are placeholders |
| Run length (3)                                | settled — derived, not chosen    | `src/hunt/config.ts` — `ENCOUNTERS_PER_RUN` is `QUARRY_ENCOUNTER_HEALTH.length`                                                  | — (add a health value to add a fight)                   |
| The end-of-fight verdict screen               | settled                          | `src/app/run/RunOutcomePanel.tsx`; copy in `src/app/run/runLabels.ts`                                                            | Developer — all wording, and whether it reads as unmissable |
| Which fight of the run you are on             | settled                          | `src/app/run/runLabels.ts` — `runProgressText`; rendered by `src/app/warCouncil/RoundStatusBand.tsx`'s `.wc-run` block           | —                                                       |
| Every Quarry plays identically                | settled — only health differs    | `src/hunt/config.ts` — `SLICE_QUARRY_CHARACTER` is one character for the whole run                                               | Developer — a roster is later work                      |
| Snare (in-hand edits)                         | **open**, blocked                | —                                                                                                                                | Needs a cost before it's viable                         |

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

### The skull rank curve landed — PT-001, 2026-08-14

**What a player does now that they did not before:** reads the shape readout knowing that a skull is
far likelier to be sitting on a mid-rank card than on a 10 or an 11. Nothing about the _procedure_
changed — no new decision point, no new legal-move constraint — but **the game plays differently from
the moment this landed**, because which cards carry skulls moved.

**What is gone:** the separate "never below rank 2" constant. That rule is now rank 1's zero weight in
every curve, which makes it hold for any curve added later rather than only for the current one.

**Engine only, and that is complete.** The curve is a deal-time property; nothing about it is shown,
and nothing should be — the shape readout still shows suit and count and never a rank
([section 3](#what-you-are-shown-and-what-you-are-not)). There is no unreachable rule here.

**What the developer owns:** whether hump is the right curve, and whether its weights want moving.
Both answer only to playing. Reverting to an even spread is a one-line change.

### The bank started counting tricks — PT-002, 2026-08-14

**What a player does now that they did not before:** nothing procedurally — no new decision point, no
new legal-move constraint, no new phase. **What changed is what a decision is worth.** The payout for
a streak is now readable off the trick count alone (`n × n`: 1, 4, 9, 16, 25, 36), where it used to
depend on which cards happened to be in the tricks you took. A player can call their next cash-out
before it fires, which they could not do the day before.

**What is gone:** card values, as a concept. Nothing in this game reads a rank except to decide who
wins a trick. Rank inversion had already gone at DLR-80; the printed-rank sum was the last thing that
made a card worth more than another, and it is now the case that a 2 and an 11 are worth the same to
your bank.

**Engine and screen landed together.** The readout was relabelled in the same contract — "Tricks ×
Multiplier" rather than "Bank × Streak" — and the four outcome messages no longer say "Both cards
banked". No rule here is enforced but unreachable, or reachable but unenforced.

**The Quarry's health came down with the payout**, 400 → 10, because a hand's damage fell from about
84 to about 7 ([section 8](#8-damage-and-the-duel)). That figure is knowingly generous and is
the developer's to move.

**What the developer owns:** whether `n × n` feels better than the rank sum (below), whether 10 is
the right Quarry health, the placeholder wording on the readout, and whether the engine's `bank`
field should be renamed now that it holds a trick count.

### The run landed — DLR-82, 2026-08-15

**What a player does now that they did not before:** plays a **second and third fight**. Beating a
Quarry no longer ends the session with a sentence — it takes you into a tougher opponent on the
health you have left, and that health is never given back. Losing at any point ends the run rather
than the encounter. There is now a difference between winning a fight and winning **the run**, and
the game says which happened.

**What is gone:** the felt's terminal panel. When a bar emptied, the screen used to show a tally
table with a one-line outcome message and no control — and that branch sat *ahead of* the
resolved-trick reveal, so the trick that ended a fight was never shown at all. Both are fixed by the
same deletion: the deciding trick now gets its beat, and one tap reaches the verdict where two were
needed before.

**Engine and screen landed together.** Every rule in [section 10](#10-between-hands-and-the-run)
that is not marked **[not built]** is reachable by playing.

**What the developer owns:** the three health values (10, 14, 18 — the shape is fixed, the numbers
are not), every word of the verdict's copy, whether the headline actually reads as unmissable, and
whether losing the felt's hand tally at the end of a fight costs anything worth restoring.

**One thing was deliberately left unwired.** `ENCOUNTER_PLAYER_RESTORE` still has no consumer, and
the ticket forbade adding one — a between-fight heal is the flask's job, and the flask is not
designed. The run being hard is not a reason to wire it in.

### The Cheat landed — DLR-83, 2026-08-16

**What a player does now that they did not before:** **refuses a trick they had no legal way to
refuse.** Follow-suit could not be broken by anything, at any price, so a hand that dealt you one
card of the led suit made your next move for you. You now hold two Cheats, and arming one makes your
whole hand legal for exactly one card.

**It is the first thing in this game the player can do and the Quarry cannot.** Every rule until now
bound both sides identically — that was the whole point of removing the Quarry's power
([section 9](#9-the-quarry)) — and this deliberately breaks the symmetry in the player's favour
rather than the opponent's.

**What is gone:** nothing. No rule was removed, no reason code retired, and with both slots empty the
game plays exactly as it did the day before — the bypass is an argument nobody passes.

**Engine and screen landed together.** The slots are on the felt beside the decree, the two-click arm
is on the card itself, and the strongest signal that a Cheat is live is the hand fan un-greying.

**What the developer owns:** how many Cheats a run starts with (2 is a placeholder), every word of
the new copy, the slots' size and spacing, whether arming feels like a detour now the slots sit by
the decree rather than by the hand — and the design question the ticket itself raised and deferred:
**whether holding a Cheat changes how a hand is played before it is spent.**

### The economy landed — DLR-84, 2026-08-16

**What a player does now that they did not before:** **spends something.** Every decision in this
game until now was made with cards you were dealt; beating a Quarry now pays a coin, and between
fights you choose what to do with it. It is also the first time the player chooses **whether to see
a screen at all** — the shop is opt-in, and continuing past it is a decision the game will question.

**It is the first answer to a run the player was expected to lose.** DLR-82 shipped a health curve
its own ticket predicted losing around fight three, and named the shop as the answer rather than a
bigger health bar. Half of that answer now exists — 4 health for a coin, against a fight costing
about four — and **the curve was deliberately not retuned**, so whether it is enough is now
measurable rather than argued.

**What is gone:** nothing. No rule was removed and nothing was deferred to make room. The verdict's
single `Next fight` control became a `Continue` / `Shop` pair, and the words "Next fight" moved to
the shop's own leave button where they are literally true.

**Engine and screen landed together.** Every rule in
[section 10](#10-between-hands-and-the-run) that is not marked **[not built]** is reachable by
playing, and every purchase, refusal and carry was confirmed in a running browser.

**One rule here is this game's own and appears in no ticket:** a heal at full health is **refused
with a reason** rather than sold and discarded. The clamp already throws away overheal; taking a
coin for a purchase that provably does nothing is a different thing, and it is the developer's to
overturn.

**What the developer owns:** every price and the payout (all four transcribed, none derived —
and the ticket's own warning stands, that **buying Heal every single visit means the Cheat is
mispriced, not uninteresting**), whether 4 health a fight is the right size of answer, whether the
`Continue` / `Shop` pair reads at a glance, whether the warning is a safety net or a nag, whether
`Escape` in the shop should really start the next fight, and every word of the new copy.

### Known tensions, recorded not resolved

- **The shop may have exactly one right answer, in which case it is not a decision** (new
  2026-08-16, DLR-84). A heal is a guaranteed 4 health against a fight that costs about 4; a Cheat is
  worth roughly 1 health directly, and more only when it saves a long streak. At 1 coin each the
  ticket predicts the player taking Heal every single time — and if they do, **the Cheat is
  mispriced rather than uninteresting**, which is a one-line change because the two prices are two
  keys. **The cheapest measurement is what you bought**: if you never once hesitated, there was no
  decision on that screen.
- **The warning fires on nearly every visit, which is how a safety net becomes a nag** (new
  2026-08-16, DLR-84). It stops you whenever anything is affordable, and with a 1-coin payout against
  1-coin prices that is every visit where you have not already spent. It was built to stop a player
  walking past a purchase they did not notice; the failure mode is that it becomes a keypress you
  learn to dismiss without reading, which is worse than not having it. Firing it only above a
  threshold, or dropping it, are both one line.
- **`Escape` in the shop starts the next fight, and it is also the obvious way to back out** (new
  2026-08-16, DLR-84). The shop's "cancel" gesture and its "commit and move on" gesture are the same
  key, so a reflexive press permanently burns the between-fights moment — the very moment the
  warning above exists to protect. The alternatives are returning to the verdict or doing nothing.
- **Two slots is a cap, and the shop can now refill it every fight** (new 2026-08-16, DLR-84;
  sharpens DLR-83's entry below). Buying does not raise the ceiling — with both slots full the
  purchase is refused — but a coin a fight means a Cheat spent is a Cheat replaceable, so the
  *effective* supply across a run is no longer two. DLR-83's own tension asked what stops a player
  buying their way past the number that makes skulls matter; the answer today is the two-slot cap
  and the price, and neither has been played against.
- **A Cheat may only ever be spent reflexively, which would make holding one worth nothing** (new
  2026-08-16, DLR-83). The ticket's own open question. A Cheat has **no value while held** — it does
  not change a legal set, a payout, or a readout until it is armed — so if the right play is always
  "spend it the first time follow-suit pinches", then the two slots are a consumable with no decision
  attached and the interesting version of this mechanic has not been built. **The cheapest measurement
  is when you spent them**: if both went in the first fight, at the first forced trick, without a
  moment's thought, the answer is no. The fix would be to give holding one visible value, not to add
  more of them.
- **Arming spends the Cheat even when the card was legal anyway** (new 2026-08-16, DLR-83). The rule
  is deliberately literal: committing any card while armed consumes it. The alternative — spend it
  only when the bypass was actually needed — makes arming free, and "always arm first" then becomes
  correct, which is worse. But it means a careless tap after arming costs a card with nothing to show
  for it, and a player who does not notice will read that as the game taking something. Worth watching
  for in the first session.
- **Two slots is a cap, and the skull is what it protects** (new 2026-08-16, DLR-83). Refusing tricks
  is exactly the thing the skull exists to punish — "take every trick" is only wrong because some
  tricks are traps — so an unbounded supply of follow-suit breaks would remove the game's only
  inversion. Two is nowhere near that line, and the cap is what keeps it that way. The tension is that
  the shop (section 10) is intended to **sell** these, and nothing yet says what stops a player buying
  their way past the number that makes skulls matter.
- **The run is expected to be lost around fight three, and that is shipped knowingly** (new
  2026-08-15, DLR-82). A fight costs the player roughly four health; the player starts with ten and
  gets nothing back. Three fights against 10, 14 and 18 health therefore do not add up, and the
  ticket says so outright: the arithmetic is working, and the gap is what a shop, an upgrade and a
  flask exist to close. **Updated 2026-08-16, DLR-84: the shop now exists and the curve was left
  alone deliberately.** A coin a fight buys back 4 health, against a fight costing about four — so a
  player spending everything on health roughly breaks even, and the gap is closed only if they were
  going to win anyway. Upgrades and the flask are still absent, and the two obvious rule changes
  (raise starting health, wire up the between-fight restore) remain explicitly ruled out. The honest
  measurement is still *how far* a run gets, but it is now a measurement of the economy rather than
  of its absence. The cheapest disproof that
  something is wrong rather than merely unfinished: if fight two is routinely unreachable rather than
  fight three being unwinnable, the curve is too steep and the numbers want moving.
- **A run that can only be lost has no ending to see** (new 2026-08-15, DLR-82). The `YOU WIN`
  screen is built, tested and — on the shipped curve — very unlikely to be reached in ordinary play.
  A verdict nobody sees is a verdict nobody can judge, which is awkward given that "does this read
  as clear" is exactly the question the developer asked. Worth reaching deliberately once, by
  lowering the curve for one session, before trusting that the screen works.
- **Predictable may read as flat, and that is the whole risk of this change** (new 2026-08-14,
  PT-002). Removing card values from the bank removed roughly ±20% of payout swing that no decision
  controlled — 1,251 hands of identical trick shape had paid anywhere between 20 and 93. The measured
  claim is that the payout became _readable_. The risk is that the jitter was doing work as
  **spectacle**, and that a number you can always predict stops being interesting to watch. **The
  cheapest disproof is to call the next cash-out before it fires**: if you are right most of the time
  and it feels dull rather than legible, the rank sum was load-bearing after all and this was the
  wrong trade.
- **A 10-health Quarry hides the top of its own payout table** (new 2026-08-14, PT-002). A streak of
  four already pays 16, and the Quarry has 10 — so 16, 25 and 36 are numbers a player can reach but
  never see land, and better than about a quarter of hands is indistinguishable from exactly that
  much. More than a third of all damage dealt is discarded. The fight also lasts under two hands,
  which leaves little room for a streak to break and recover. Raising the Quarry's health is a
  one-line change; the trade is against the stated intent that upgrades raise the player's damage
  later instead.
- **Leftover damage is meant to become money, and there is nothing to spend it on** (new 2026-08-14,
  PT-002). Overkill can only occur on the cash-out that kills, so it fires **about 0.8 times per
  encounter** whatever the Quarry's size — and about 19% of wins overkill by nothing at all. A fixed
  share of _every_ cash-out is the measured alternative if this is wanted as an economy rather than a
  flourish. Neither is built, deliberately: a currency with no consumer is a number that goes up and
  does nothing.
- **The multiplier and the bank are now always the same number** (new 2026-08-14, PT-002). They are
  kept as two separate terms on screen and in the engine because a one-time-use "+1 ×" item is
  intended, and that item needs a term to push. Until something moves them apart, showing `3 × 3`
  states the same fact twice — which may read as redundant rather than as two dials.

- ~~**The Quarry's health is a placeholder**~~ — **resolved 2026-08-13.** Set to 450 from play
  (section 8). Three hands, and the first encounter anyone has won. Trimmed to 400 on 2026-08-14
  alongside the cut in player health, then **cut to 10 the same day when the bank stopped counting
  card values** — a hand's damage fell by roughly 12×, so the bar came down with it. Both totals are
  provisional until the pair is played together.
- **One health point was too cheap, and the fix has not been played yet** (new 2026-08-13, play-test
  4 §7.3 and §7.6; **acted on 2026-08-14**). Losing the **first** trick of a hand forfeits no
  cash-out, because the bank is zero — so the only price was 1 health in 25, which made throwing
  trick 1 close to free and the one move that is right without reading the board. The same cheapness
  meant the player's bar never came under threat inside a three-hand encounter. **Player health was
  cut from 25 to 10 in response**, which makes each point worth 2.5× what it was; whether that is
  enough, too much, or aimed at the wrong thing is unmeasured. Section 10's unbuilt run remains the
  structural fix — health was sized as a **run-level** resource spent inside a single fight, and a
  smaller number does not change what it is, only what it costs.
- **The trick count does not predict the outcome, and it is the biggest thing on screen** (new
  2026-08-13, play-test 4 §7.5; **sharpened 2026-08-14 by PT-002**). A hand pays `a² + b²` for streaks
  of length _a_ and _b_ — **exactly**, now that the printed ranks no longer add noise around it — so
  **where** the losses fall matters about twice as much as how many there are. The winning encounter
  went 2–4, 3–3, 4–2. The status band and the hand-over panel both lead with the trick count.
  **And that counter is inverted on the skull tricks**: a **dodge** — which banks and climbs your
  streak — is scored to the Quarry, while **eating a skull** — which costs you 1 health — is scored
  to you. It agrees with section 7's **taken** on clean tricks and disagrees on both skulled ones, so
  the panel reports the design's own one-line summary backwards. Confirmed against the source
  2026-08-13; what the panel should show instead is the developer's call (play-test 4 §7.5).
- **The slippery slope may need a brake** (new 2026-08-13, play-test 2 §6 Q4). Losing a trick punishes
  you **twice** — 1 damage _and_ an early cash-out at a small multiplier — while winning compounds
  both terms. That is Balatro's shape and may be exactly right, but it means a bad hand is very bad.
  Play-test 2 says explicitly: watch for it before adding anything. **Play-test 4 sharpens it:** the
  punishment is quadratic rather than linear, and it lands hardest on a loss in the _middle_ of a
  hand, which is the position the player controls least.
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
  continuous figure may read badly for a small integer count. **Sharpened 2026-08-14:** the total is
  now **10**, so the bar has ten steps rather than twenty-five and each loss moves it a tenth — which
  makes the question more pressing, not less. **Answered in kind, not yet settled, 2026-08-16:**
  DLR-86 replaced both bars with rows of countable hearts that break as damage lands, which is the
  treatment a small integer count calls for. Whether it actually reads better is a play observation
  and the entry stays open until someone plays it. It also raises its own version of the question at
  the other end — the third fight's Quarry holds **18** hearts in the same band, and whether 18 stay
  legible once shrunk to fit is the same kind of question at the opposite scale.
- **A pending preview on a health bar can read as damage already dealt** (new 2026-08-16, DLR-86).
  The Quarry's at-risk hearts are the reading DLR-80 removed when it retired the bars' pending
  segment, reintroduced deliberately and in a different grammar — dimmed and flashing rather than
  solid, Quarry-side only, and never touching the stated current-of-max figure. The measurement is
  cheap and has one right answer: ask a player mid-hand what the flashing hearts will do.
- **Rank 8 is still called "Poison" and now means nothing at all** (new 2026-08-13, play-test 2 §6
  Q3). It has no play-time ability and no scoring intervention, and the skull is a _separate_ marker
  — so the name actively suggests a connection that does not exist. It will read as a bug in the
  play-test.
- **Two unfair skulls survive the rank curve, and shipping the curve may look like it fixed them**
  (new 2026-08-14, PT-001; observed play-test 4). Weighting decides which _rank_ carries a skull, so
  it cannot touch either case that does not turn on rank. A skull in the **trump suit** is
  near-harmless whatever its rank, because a trump wins its trick and a skull trick the Quarry wins
  is a dodge for the player. And a Quarry **void in the led suit** may discard a skull at any rank,
  which the player cannot dodge at all. Both are recorded in `ideas.md`; neither is built against.
- **Many six-card hands will contain no named rank at all** (new 2026-08-13, play-test 2 §6 Q2). The
  Fox, Witch, Woodcutter, Swan and Monarch are much of what makes this feel like Fox in the Forest,
  and a six-card hand draws from the same 33-card deck. Ability-free hands are accepted as normal
  today by default rather than by decision.
- **Whether a skull should survive changing hands** (new 2026-08-13). The rule tests the trick, not
  the seat, so a skulled card the Quarry's Fox exchanges into the decree still carries its skull if
  the player's Fox later takes it. Rare, but expressible in one hand.
- **No card is worth declining, and PT-002 made this stronger rather than weaker.** There is no
  negative card value anywhere in this game, so there is no card a player would rather leave behind. A
  future Forage ticket wanting "cards you would rather leave behind" must create that property
  deliberately — nothing in the deck supplies it. _(Carried from 2026-08-12; DLR-80 did not change it,
  and PT-002 went further: a card now has **no value at all** outside deciding who wins its trick, so
  Forage editing "a card's value" (section 10) currently edits a property that only affects trick
  resolution.)_
- **Aiming for the same line every hand may not be a decision.** Carried forward in a new form: the
  old version was "aim for Victorious every Hunt". The new equivalent is whether the streak
  multiplier ever actually changes a choice, or whether taking every trick you can is simply always
  right. Play-test 2 §8's fourth measurement asks exactly this — did the multiplier ever change a
  decision?
