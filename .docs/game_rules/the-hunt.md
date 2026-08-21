# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-21**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

> **Killing quickly now pays — DLR-95, 2026-08-21.** Winning a fight used to pay one coin whether it
> took a single trick or five hands. It still pays that coin, and now it pays **another for every card
> still unplayed in your hand** when the Quarry goes down — doubled if you killed them in the fight's
> first hand, halved in the third, and nothing from the fourth hand on (section 10). The two payments
> **add**; the flat coin is what stops a long win paying nothing at all. Engine and screen landed
> together and the verdict names both payments, so this is playable right now.

> **You can cash your streak yourself now, and being caught pays less — DLR-94, 2026-08-20.** Until
> now the bank only ever cashed when you were hit, or when the sixth trick arrived; you never chose the
> moment. Now you do. Before you commit a card, you may **apply damage**: the bank cashes at the current
> multiplier into the Quarry **in full**, both counters reset, and it costs you **no health** (section 7).
>
> **And the automatic cash-out got worse, which is the whole point.** A hit you did not choose — a clean
> loss, a skull you ate, or poison landing on you — now pays only **two-thirds** of `bank × multiplier`,
> rounded down. So a six-trick streak is worth **36** if you cash it yourself and **24** if you are caught
> holding it. The end-of-hand cash-out is **untouched** and still pays in full.
>
> That turns a growing bank into a bet rather than a number the game spends for you at the worst moment:
> take the certain full value now, or push the streak and risk being paid a third less. **Engine and screen
> landed together**, and QA drove the poise-then-commit through a real browser.
>
> **It is locked while poison is pending**, which is the design decision recorded here as `[not built]`
> since 2026-08-19 and enforced from today (section 8).

> **You have a flask, and it is free — DLR-93, 2026-08-20.** Everything that has ever restored your
> health cost a coin. Now one does not: you carry a **flask**, and drinking it restores **60% of your
> maximum health** — **6** on today's bar of 10 — immediately, with anything over your maximum thrown
> away. It costs nothing.
>
> **It holds one charge, and a charge comes back only from a stage boss.** Beat one of the five bosses
> and your flask is full again, whether you had drunk it or not. Beating an ordinary opponent does
> nothing for it. So across a full twenty-five-fight run there are **five flasks to drink**, and never
> two in hand at once.
>
> **You drink it from the shop screen, and it is not for sale.** It sits in its own block above the four
> shelves — a potion button with no price on it, marked `Free` and `No coin`, as far from the priced
> Heal as the screen allows. It is refused, with the reason on screen, when your flask is empty or when
> you are already at full health. See [section 8](#8-damage-and-the-duel) and
> [section 10](#10-between-hands-and-the-run). **Engine and screen landed together, and the drink was
> driven end to end in a browser.**
>
> **Nothing was retuned around it.** No health total, price or opponent curve moved, and the automatic
> between-fight restore that has sat unwired since DLR-82 is *still* unwired — that ticket forbade it
> "until the flask is designed", and designing the flask turned out not to change the answer. A restore
> the game hands you and a charge you choose to spend are different things.

> **The bank's climb is now something you can buy — DLR-92, 2026-08-19.** Until now a taken trick banked
> **1**, always, and a streak of _n_ cashed exactly `n × n`. The shop's run-permanent shelf — empty since it
> was built — now sells a **Whetstone** for 4 coins, and **each one you own adds 1 to what every taken trick
> banks, for the rest of the run**. It **stacks**: two of them bank 3 a trick. So a streak of _n_ now cashes
> `(1 + copies) × n²`, and a whole hand taken unbroken pays 36 with none, 72 with one, 108 with two.
>
> **The multiplier is untouched** — it still climbs by exactly 1 per trick taken, and the twin item that
> would raise *it* instead is deliberately a later ticket rather than half of this one. This is the first
> purchase in the game that **grows** a reward rather than protecting one, and the first that lasts the
> whole run rather than a fight or a use.
>
> **Not yet seen in play.** The purchase and the buff are both live and reachable, but a 4-coin item against
> 1 coin a fight put it out of reach of every QA run attempted — so the `+2` has been proven against the
> engine and **not yet watched on screen**. Recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

> **A mutual kill is now yours, and you can buy insurance against your own poison — DLR-91,
> 2026-08-19.** Three changes landed together, and the first one is easy to miss because it is a
> **reordering**: when an event would empty both bars, **the Quarry's is settled first and you take no
> damage from that event at all**. So a cash-out that kills the Quarry saves you the hit that would have
> landed with it, and a mutual kill is a **win**. It used to be a loss.
>
> **Second, poison now lands at the resolution of the next trick, not at the deal of the next hand** — and
> when it lands on you it **cashes out your streak** exactly as any other damage does, so a run you were
> building is spent at a moment you did not choose. The amounts are no longer the same on both sides: **4
> against the Quarry, 2 against you.**
>
> **Third, the fight-long shelf finally has something on it: a Poison Guard, 1 coin.** Buy it between
> fights and it is live for **exactly the next fight**. The first time your own poison lands on you, you
> still lose the 2 health but **your streak survives** — and the Guard is spent, whether or not there was a
> streak worth saving. It is gone when the fight ends either way, and you may only hold one at a time.
> See [section 4](#4-playing-a-trick), [section 7](#7-the-four-outcomes-the-bank-and-the-streak),
> [section 8](#8-damage-and-the-duel) and [section 10](#10-between-hands-and-the-run).
> **Engine and screen landed together.**
>
> **One consequence was accepted rather than smoothed out**: because the Guard suppresses the cash-out, a
> Quarry that would have died to that cash-out survives — so under the new ordering, **holding a Guard can
> cost you health.** The correct play is sometimes not to hold one, and nothing on screen warns you.
> Recorded under [Known tensions](#known-tensions-recorded-not-resolved).

> **You can poison a card, and the trick it wins pays for it — DLR-90, 2026-08-19.**
> The shop sells a third thing: **Envenom**, 2 coins, on the one-time-use shelf. It is not spent when you
> buy it — it is a **charge you carry across fights**, and you spend it during a hand. A plate in the felt
> rail beneath the Cheat rail takes **two taps to arm**, and then **a tap on any card in your hand poisons
> it** — including a card that would be illegal to play, because marking is not a move. Play that card and
> **the trick resolves by the normal rules**: the same side wins it, and it banks the same. Then, **at the
> next trick's resolution, whoever won the poisoned trick takes the damage** (DLR-90 paid it at the deal of
> the next hand; DLR-91 retimed it).
>
> **The reason it is worth 2 coins is what happens when you lose the trick.** A poisoned trick the Quarry
> wins **cleanly costs you nothing at all** — no health lost, and your bank and multiplier **survive
> uncashed** rather than resetting. So a card you expected to throw away becomes a free strike. If you win
> the poisoned trick instead, it is an ordinary clean win and **the damage lands on you** — **2, not 4**,
> and it cashes out your streak with it. **If the fight ends before the hit is paid, the queued damage is
> thrown away.** See [section 4](#4-playing-a-trick) and
> [section 7](#7-the-four-outcomes-the-bank-and-the-streak). **Engine and screen landed together.**
>
> **Nothing on screen tells you the delayed damage landed.** Hearts simply disappear mid-hand — 2 of them,
> on a bar of 10 — and your streak vanishes with them, with no line, no flash and no announcement naming
> the cause. Pending poison is invisible on the felt and so is a held Guard. No rule required a surface and
> choosing one is a judgement call, so none was invented. It is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved), and it is the thing most likely to read as a bug
> in a play session.

> **The shop has four shelves now — DLR-89, 2026-08-18.** What the shop *sells* has not changed, but
> how you browse it has: the two items are laid out on a **four-shelf ladder sorted by how long a
> purchase lasts** — **one-time use**, **fight-long**, **run-permanent**, **game-permanent** — and you
> open one shelf at a time. The **Cheat** is on one-time use, which is the shelf you arrive on and the
> only one holding anything. Fight-long and run-permanent are **empty and say so**, and can still be
> opened. **Game-permanent cannot be opened**: it is drawn with a dashed edge and states "Coming
> soon.", shown deliberately so the shape of the finished shop is visible before the items that fill
> it exist. The **heal is on no shelf**, in its own "Also for sale" block below them, because an
> instant transfer has no duration to sort on. Arrow keys move between the shelves, the refused one
> included. See [section 10](#10-between-hands-and-the-run). **Engine and screen landed together, and
> no price, refusal or purchase changed.**

> **The run is twenty-five fights and you can see all of them — DLR-85, 2026-08-17.** The game now
> **opens on a start screen** showing the whole run as one horizontal path: a short **tick** for each of
> the twenty ordinary opponents and a filled **block** for each of the five **stage bosses**, in the
> order you will fight them, with **every opponent named**. Four ordinary opponents then a boss, five
> times over, closing on **Diarmuid**. The goal is stated in words, and one button starts the run by
> naming who you fight first. **Between fights the same path is reachable again** from a `Map` control on
> the verdict, where opponents you have beaten are **struck out and still on the path** and the next one
> is marked out from those beyond it. **Losing the run returns you to the start screen** with a fresh
> path. Every forward control now names the opponent it leads to — `Fight Aoife`, then `Fight Cillian` —
> and so do the verdict headline, the shop's leave button and the fight counter. See
> [section 10](#10-between-hands-and-the-run). **Engine and screen landed together.**
>
> **The health bar names them too, added 2026-08-17 after a play session.** The Quarry's heart row is
> headed **"Aoife's health"** rather than "The Quarry's health", so the bar agrees with the map. The
> **dossier still says "The Monarch"** — that is the remaining half of the seam, and it is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).
>
> **Two caveats stated up front.** The run is **not expected to be winnable** on today's health curve —
> that is DLR-82's arithmetic working, not a fault — so `YOU WIN` is effectively unreachable in play. And
> **the path does not currently fit a viewport narrower than about 1088px**: it is cropped rather than
> scrolled, so opponents at the end of the run (Diarmuid included) simply are not on screen. That is a
> known defect awaiting a tuning decision, not a rule.

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
> [section 4](#4-playing-a-trick). **Engine and screen landed together.** A run started with two when
> this landed; **since 2026-08-17 it starts with none** and every Cheat is bought (DLR-84).

> **The game is a run now — DLR-82, 2026-08-15.** *(Superseded on length by DLR-85 above: the run is
> twenty-five fights, not three. Everything else here still holds.)* Three fights in order, against
> Quarries of rising health, on **one health bar that never refills**. Win and you carry your remaining health into a
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

**[settled]** — the procedure; **how many Cheats a run starts with** is **[provisional]**, below.

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

#### How many you get — **[provisional]**

A run **starts with none**, and every Cheat you ever hold is bought at the shop. That was **set by the
developer on 2026-08-17**, down from two: a run should open empty-handed, with Cheats earned rather than
granted. **Whose decision:** the developer's, and it has already moved once — which is why it is
provisional rather than settled. The permitted range is none up to the slot count.

> **The practical consequence is that the first fight has no Cheat in it at all**, and cannot: the
> earliest you can hold one is after the first fight is won and a coin is spent. So "when do I spend it",
> the question this mechanic exists to raise, does not arise until fight two at the earliest.

**Since 2026-08-16 you can also buy them.** A Cheat costs 1 coin at the shop between fights, and
goes into a free slot ([section 10](#10-between-hands-and-the-run)). You still hold no more than
two at once: with both slots full the shop refuses the purchase and says so. So a run's total supply
is two at a time, replenished for a coin whenever you have spent one.

### Envenom — poisoning a card before you play it

**[settled]** — the procedure; **the price and the damage** are **[provisional]**, below, and
**whether three taps to mark a card feels right** is **[open]**.

You hold some number of **Envenom charges**, bought at the shop for 2 coins each and carried across
fights exactly as Cheats and health are. **There is no cap** — coins are the only limit — and a plate in
the felt rail beneath the Cheat rail shows how many you hold for the whole hand, whether that is any or
none.

**Spending one takes three taps.**

1. **The first tap on the plate selects it.** Nothing changes yet. This is the same misclick guard the
   Cheat has, and it is here for a stronger reason: **the mark cannot be taken back.**
2. **The second tap arms it.** Every card in your hand becomes tappable — **including cards that are
   illegal to play**, which is the point, because the item exists to give a card you expect to lose with
   a reason to be played.
3. **The third tap is on a card in your hand, and poisons it.** One charge is spent, and the card is
   marked from then on.

**A third tap on the plate instead gives the charge back**, unspent. So does pressing Escape. Nothing is
spent until you tap a card.

**A poisoned card is marked wherever it renders** — in your hand, in the trick once you have played it,
in an ability prompt that offers it, and on the decree if the Fox exchanges it there. The mark is
announced as part of the card's name, so it does not depend on seeing the glyph.

**Arming Envenom and arming a Cheat are mutually exclusive.** Both change what a tap on a hand card
means, so tapping either control clears the other, and arming Envenom also drops a card you had armed to
play.

**Playing a poisoned card changes nothing about the trick itself.** The same side wins it by the same
rules, and it banks the same. What it adds is a **delayed hit** owed to **whichever side won that
trick**, paid when the **next** trick resolves — **4 if the Quarry won it, 2 if you did.** Section 7
states what the trick's own outcome does and what the hit does to your streak, and section 8 states when
the damage lands.

**You may poison more than one card in a hand** if you hold more than one charge, and the hits accumulate
— on either side, or on both.

> **A poisoned card can leave your hand without ever being played, and the charge is simply wasted.** The
> Woodcutter can bury it on the bottom of the draw pile, and the Fox can exchange it into the decree and
> you may never take it back. Nothing warns you and nothing refunds you.

#### How many taps it should take — **[open]**

Three taps to mark, then the usual two to play the card. The alternative is arming in one tap, which
makes marking two — but puts an **irreversible** mark one misclick away. **Whose decision:** the
developer's, after playing it.

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
| 8    | **Poison**     | **No effect at all.** A named card with no rule attached. It has nothing to do with skulls — **and nothing to do with Envenom's poisoned cards** (section 4), a second collision on this name.                                                                                         |
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
2. Your bank **cashes out at a reduced rate**: **two-thirds of `bank × multiplier`, rounded down**, is
   dealt to the Quarry's health.
3. The bank and the multiplier both **reset to zero**.

A clean loss and eating a skull are **identical in every respect** but their name.

**The two-thirds is the cost of being caught, and it is the only cash-out that pays it.** Since
2026-08-20 you can cash the bank yourself, in full, whenever it is your move (below) — so a hit you did
not choose pays less than one you did. Applying yourself and the end-of-hand cash both pay the **whole**
`bank × multiplier`; a clean loss, an eaten skull and poison landing on you all pay **two-thirds of it**.
See `hybrid-design.md` version-4-scope §3.

**It always rounds down**, so the Quarry is never paid more than the rule says by a rounding artefact. A
streak worth 1 therefore pays **nothing at all** when it is caught, and a streak worth 4 pays 2.

### A poisoned trick the Quarry wins cleanly costs you nothing — **[settled]**

Since 2026-08-19 there is **one exception** to the paragraph above, and it is the whole reason Envenom
(section 4) is worth buying.

If a **poisoned** card was played into the trick **and** the outcome would have been a **clean loss**, the
outcome is **replaced rather than added to**:

- you take **no damage**;
- your bank does **not** cash out;
- your bank and your multiplier **both survive**, at the values they already held.

You still lose the trick, and the Quarry still leads next. You simply pay nothing for it — and your streak
carries on as though the trick had not happened. **The Quarry still takes the delayed 4 damage** when the
next trick resolves (section 8).

**It applies to a clean loss only, and that is deliberate.** A **dodge** is also a trick the Quarry won,
but a dodge is one you **bank** — so there is nothing there to replace, and treating it as replaced would
delete a bank you had already earned. A dodge on a poisoned trick therefore banks exactly as it always
does, *and* queues the delayed hit against the Quarry.

**Winning a poisoned trick is an ordinary win, with no exception at all.** A clean win banks 1 and climbs
the multiplier; **eating a skull still costs you the damage and still cashes and resets your bank**, on
top of the delayed hit landing on you at the next trick. Nothing about poison softens a skull you chose to
eat — and neither does a Poison Guard, which covers the delayed hit alone.

> **The skull case is the harshest available reading, and no design document covers it.** Poison waives
> only the Quarry-win case; nothing says it should also waive a skull. So a poisoned trick you win that is
> *also* a skull trick costs you the skull's damage now **and** 2 more at the next trick. Confirming that, or
> deciding the mark should suppress that case too, is the developer's — it is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

> **A dodge on a poisoned trick is a free bonus, and nobody designed it.** You bank the trick, keep your
> streak, and the Quarry takes 4 at the next trick — for a card you played expecting to lose with it. It falls out
> of the two rules above rather than from a decision, and it is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

**On the sixth trick, a preserved bank still cashes.** If the replaced clean loss is the last trick of the
hand, the bank that survived it cashes at the end of the hand under the ordinary rule below — there is
something left to pay, precisely because the loss did not reset it.

### Poison landing on you cashes out your streak — **[settled]**; the amounts are **[provisional]**

Since 2026-08-19 there is a **second** way your streak can end, and it is not a trick you lost.

When poison you owe (section 4) lands on **you**, it behaves like any other damage you take: you lose the
health, your bank **cashes out** at the current multiplier into the Quarry, and bank and multiplier both
**reset to zero**. It makes no difference whether you won or lost the trick that the poison was paid at.

**It is a hit you did not choose, so it cashes at the reduced two-thirds rate** like every other forced
cash-out (above). Poison is the case this document calls "the moment you cannot choose", which is exactly
what the reduction charges for — paying it in full would make being poisoned the *cheapest* way to lose a
streak, which inverts the item the rule sits beside.

- **On a trick you also lost, the two add up.** You take 1 for the trick plus 2 for the poison — **3**,
  and one cash-out, not two.
- **On a trick you won, the trick banks first and then the poison cashes it.** So a streak of four that
  wins the fifth trick while poisoned cashes on a bank of five rather than four — **16**, not 10: the
  trick was won, so it counts, and then the poison spends it at two-thirds.
- **The Quarry has no equivalent.** Poison landing on the Quarry is health and nothing else; the Quarry
  holds no bank and no streak to lose.

**This is why the two amounts differ.** Your 2 is half the Quarry's 4 (both figures and their status: section 8) because your side of the hit also
takes the streak, which is often worth far more than the health (`hybrid-design.md` version-4-scope §1).

> **The moment you cannot choose is the whole point.** Every other cash-out in the game is triggered by a
> trick you played into. This one is triggered by a trick you played **two moves ago**, and it fires
> whatever you do next — so a streak in progress is spent at a moment you did not pick. Whether that reads
> as tension or as an ambush is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### A Poison Guard buys back the streak, not the health — **[settled]**; its price and the amount it lets through are **[provisional]**

If you are holding a **Poison Guard** (section 10) when your own poison lands on you:

- you still take the **2 damage**;
- your bank and your multiplier **survive**, at the values they already held;
- the Guard is **spent** — even if your bank was zero and there was nothing to save.

It covers that one case and nothing else. **A trick you simply lose still cashes and resets your streak
while a Guard is held, and does not consume it**; so does eating a skull. A Guard is not a shield against
damage and never was: a 1-coin item that insured against every hit in the game would remove the reason
losing a trick matters.

**It does nothing at all when the poison lands on the Quarry**, because that case already costs you
nothing.

### The bank

**The bank only ever climbs** until it cashes. It counts **the tricks you have taken** since the last
cash-out — whatever the cards in them were. A taken trick adds **1**, plus **1 for every Whetstone you
own** (section 10); with none, the bank is simply the number of tricks taken.

**The cards you take are worth nothing in themselves.** A trick of two 11s and a trick of two 2s bank
exactly the same: one. Ranks decide who _wins_ a trick (section 6) and nothing else.

### The streak multiplier

**The multiplier is the number of tricks you have taken in a row.** Clean wins and dodges both count;
it starts at zero each time it resets, and any damage you take resets it.

### So a streak of _n_ cashes `n × n` — with nothing bought

The bank and the multiplier climb together — by exactly one each, per trick taken — so while a streak
runs they are the same number, and a cash-out is worth its square:

| Tricks taken in a row              | 1   | 2   | 3   | 4   | 5   | 6   |
| ---------------------------------- | --- | --- | --- | --- | --- | --- |
| **Cashed by you, or at hand's end** | 1   | 4   | 9   | 16  | 25  | 36  |
| **Caught holding it** — two-thirds, rounded down | 0 | 2 | 6 | 10 | 16 | 24 |

**The top row is what the streak is worth; the bottom row is what it pays if you are caught.** Which row
you land on is a decision you make, not a dice roll: cash it yourself at any point when it is your move
(below) and you take the top row. The gap between the rows is the price of pushing one trick further.

A whole hand taken in one unbroken run pays **36**. One loss in the middle of that same hand costs far
more than a sixth of it: taking three, losing the fourth, then taking the last two pays **6 + 4 = 10** —
the first streak was caught and paid two-thirds, the second survived to the end of the hand and paid in
full. So **where** your losses fall matters more than how many you take, and a loss in the middle of a
hand is worse than one at either end.

That is the table with an empty shop. **A Whetstone changes the first row of the arithmetic and not the
second** — see below.

### A Whetstone raises what every taken trick banks, for the rest of the run — **[settled]**; its price is **[provisional]**

Each **Whetstone** you own (bought on the run-permanent shelf, section 10) adds **1** to what a taken
trick banks. **They stack**: with two, every taken trick banks 3. The multiplier is untouched — it still
climbs by exactly 1 per trick taken — so a streak of _n_ cashes `(1 + copies) × n²`:

| Tricks taken in a row | 1   | 2   | 3   | 4   | 5   | 6   |
| --------------------- | --- | --- | --- | --- | --- | --- |
| **Cashes for** — no Whetstone | 1 | 4 | 9 | 16 | 25 | 36 |
| **one Whetstone**     | 2   | 8   | 18  | 32  | 50  | 72  |
| **two Whetstones**    | 3   | 12  | 27  | 48  | 75  | 108 |

Those are the figures for a streak you cash yourself or carry to the end of the hand. **Being caught takes
two-thirds of whichever row you are on**, rounded down — so one Whetstone pays 1, 5, 12, 21, 33, 48 when
the streak is caught, and two pay 2, 8, 18, 32, 50, 72. The Whetstone raises what you stand to lose at the
same rate as what you stand to win.

**It multiplies the whole curve rather than shifting it**, so it is worth most on the hands you were
already playing well: one copy doubles a six-trick hand from 36 to 72, but a lone taken trick only goes
from 1 to 2. It rewards the long streak you were already chasing rather than changing which trick you
want.

**It is permanent for the run and never spent.** There is no charge to use, nothing to arm, and nothing
that consumes it — once bought it applies to every taken trick of every remaining fight. It is the first
purchase in the game with that duration, and the first that **grows** a reward rather than preserving one.

**Only the bank moves.** The multiplier's climb is deliberately untouched, and an item that raises *it*
instead is a stated future addition rather than part of this one — the two terms are shown separately on
screen and kept separate in the rules precisely so one can be bought without the other. **Nothing raises
the multiplier yet.**

> **The engine tolerates a nonsensical figure rather than breaking on it.** A bank climb that is not a
> whole number above zero is ignored and the bare `+1` rule applies. This cannot happen in play — the
> count only ever grows by one at a time — but the bank feeds a health bar, and a spoiled number there
> would empty a bar with nothing said. It fails back to the plain rule instead.

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

### Applying damage — cashing your streak when you choose to — **[settled]** since 2026-08-20

**Before you commit a card, you may cash your bank yourself.** It pays the **full** `bank × multiplier`
into the Quarry's health, resets bank and multiplier to zero, and **costs you no health at all**.

- **It is available whenever your own card is the next thing to be played** — on your lead, and on your
  follow to a lead already on the table. Not during a trick's reveal, not while an ability is prompting,
  and not on the Quarry's move.
- **It takes two taps.** The first poises the control; the second spends the streak. The cash-out cannot
  be undone, so a single misclick must not be able to spend a hand's work. Pressing `Escape`, or tapping
  away, cancels a poise.
- **It is refused, with the reason stated on the control**, when your bank is empty, when a poison hit is
  still owed (below), or when it is not your move.
- **The trick then proceeds exactly as normal.** You still play your card, it still resolves by the
  ordinary rules — just against a bank and multiplier of zero. Applying damage is not a turn, and it does
  not skip, end or replace anything.

**It is a third kind of cash-out**, alongside the forced one and the end-of-hand one, and the only one
you choose the moment of. It is what makes the two-thirds penalty a decision rather than a tax: the
streak is worth its full square the whole time you are holding it, and being caught is what costs you a
third of it.

**It can win the fight.** A cash-out large enough to empty the Quarry's health ends the encounter there,
the same as any other damage — and you take nothing for it.

> **The hearts simply drop.** A trick that takes damage breaks the Quarry's hearts with a visible beat,
> because a trick resolved. A voluntary apply resolves no trick, so there is no beat to hang it on and the
> hearts fall without one. Whether that reads as abrupt is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### At the end of the sixth trick, the bank cashes

**[settled]**

When the sixth trick resolves, the bank **cashes out at the current multiplier** and both reset —
whatever the sixth trick itself did.

**It pays in full**, and since 2026-08-20 that is worth stating outright rather than leaving implied: the
sixth trick merely arriving is not being caught, so the two-thirds reduction does not apply to it. Only a
hit you did not choose pays the reduced rate.

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
| Health restored by drinking the flask | **60% of your maximum** — **6** today, clamped — **[provisional]** (DLR-93) |
| Both bars emptying together        | **The player wins** — since 2026-08-19                        |

**There are two sources of healing in the game, and only one of them costs money.** Winning a fight
restores nothing automatically. Health comes back by **buying a heal** at the shop for a coin, or by
**drinking your flask**, which is free and limited to the charge you are carrying
([section 10](#10-between-hands-and-the-run)). Both clamp to your maximum and throw the excess away.
There is still no rest site, and nothing at all restores health during a fight.

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
both bars: yours by 1, the Quarry's by the cash-out.

**An encounter can therefore end on trick 3.** When it does, the hand **stops where it is** — the
remaining tricks are not played, and the outcome is stated in place of the table.

> **This is a change of kind, not of degree.** Damage used to land once, at the end of thirteen
> tricks, on a confirmation press. It now lands several times a hand, automatically, with no
> confirmation anywhere. Whether a hand being cut off in the middle feels abrupt is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### The Quarry's bar is settled first, and a Quarry that dies spares you — **[settled]**

Since 2026-08-19 the two bars are **not** settled together. The order is fixed:

1. **The Quarry's bar takes its damage.**
2. **If that emptied it, the encounter is over and you take no damage from this event at all.**
3. Otherwise your bar takes its damage.

| After the damage lands   | Outcome                    |
| ------------------------ | -------------------------- |
| The Quarry's bar is empty | **You win the encounter.** |
| Your bar is empty         | **The run ends.**          |
| Neither                   | Play continues.            |

**So a killing blow is its own protection.** Cash out enough to empty the Quarry on a trick that would
also have cost you your last health, and you win — the hit that would have killed you is simply never
applied. There is no third row and no tie: both bars cannot be empty at once.

> **This overturned a dated ruling: the player used to lose a mutual kill** (decided 2026-08-11, reversed
> 2026-08-19). Both bars were depleted before either was checked, and a tie went to the Quarry. See
> `hybrid-design.md` §9, which records the reversal rather than the argument for it.

> **It applies to all damage, not only to poison.** The reordering was made for poison's sake and then
> deliberately generalised, so there is one rule about which bar settles first rather than one per source.
> Nothing was retuned in response — **no health total, damage figure or Quarry curve moved** — so the game
> is measurably easier at exactly the moments that used to be fatal. That is a choice, not a side effect.

**Surplus damage is discarded.** Damage past a depleted bar is not carried, banked, or converted.
Cashing 36 into a bar with 4 left is exactly the same as cashing 4. **Health is never negative** — a
bar stops at zero.

> **This is no longer a rare edge case.** With the Quarry at 10 and a good hand paying up to 36, more
> than a third of all damage dealt is thrown away. Paying the surplus back as currency is a stated
> intention and is **[not built]** — see [section 10](#10-between-hands-and-the-run).

### A poisoned trick's damage lands at the resolution of the next trick — **[settled]**; its amounts are **[provisional]**

One kind of damage does **not** land when the trick that caused it resolves. A poisoned card
(section 4) books damage **against whichever side won the trick it was played into**, and that damage is
paid **as part of the next trick's own damage** instead — folded in, not applied as a second event.

- It hits the **Quarry** if the Quarry won the trick, and **you** if you won it — but **not for the same
  amount**: **4 against the Quarry, 2 against you.**
- **Your share cashes out your streak**, exactly as damage from a lost trick does, unless you are holding
  a Poison Guard. Section 7 states that rule; the Quarry has no counterpart to it.
- Two poisoned tricks both land, on either side or on both, and the amounts add up.
- It goes through the same clamp as every other damage: a bar stops at zero and the surplus is discarded.
  It is also subject to the Quarry-first ordering above.
- **It can kill.** A delayed hit that empties a bar ends the fight, and ends the run if the bar was
  yours — exactly as any other killing blow does.
- **A poisoned trick that is the last of a hand carries over**: the hit is paid at the first trick of the
  next hand, because nothing happens at a hand boundary.
- **If the fight ends before the hit is paid, the queued damage is discarded.** It is never carried into
  the next fight, and never into the next run. That includes the case where the poisoned trick's own
  cash-out is what ended the fight.

**The Quarry's 4** is the same figure as one fight's worth of damage and as the shop's heal,
deliberately, so poison reads on a scale you already know — it is transcribed from the design doc. **Your
own 2** is a separate, smaller figure the developer chose on 2026-08-19, halved because your side of the
hit also takes the streak. Whether 2-and-3 is the right size only shows in play, which is why the amounts
are **[provisional]** while the timing is settled.

> **The timing moved once already.** Until 2026-08-19 the hit landed at the **deal of the next hand**,
> which meant it could not interact with a streak at all — a hand boundary already cashes everything.
> Moving it inside the hand is what gave it teeth. See `hybrid-design.md` version-4-scope §1.

> **Two poisoned cards in the SAME trick still owe only one hit.** A trick is either poisoned or it is
> not; nothing counts how many marked cards were in it. Separate poisoned tricks do stack. Recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

> **Nothing on screen tells you it landed.** Hearts disappear mid-hand and your streak vanishes with them,
> with nothing naming the cause — and you were never shown that poison was pending in the first place. On
> a player bar of 10 that is 20% of your health plus a streak, and it is the change in this game most
> likely to be read as a bug. Recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### Applying damage cannot be delayed while poison is pending — **[settled]** since 2026-08-20

The design decided (2026-08-19) that **Apply Damage** (section 7) must be **disabled while poison is
pending**, so a player cannot dodge a booked hit by cashing out ahead of it. **It is now enforced.** The
control is refused, and says so, while a poison hit is owed to either side — and the refusal is re-checked
on the confirming second tap, not only on the first, so a poise made while the control was live cannot
commit after a booking has landed under it. See `hybrid-design.md` version-4-scope §3.

**A poison hit owed to the Quarry locks it too, not only one owed to you.** The rule reads the pending
queue rather than your side of it, which is the stricter reading of the two.

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

### The opponents — twenty-five of them, each a name and a health total

**[settled]** — the roster and the order; every health figure is **[provisional]** (section 10).

Since 2026-08-17 the run has **twenty-five named opponents**, fought in a fixed order:

**Ordinary opponents**, in order — Aoife, Cillian, Niamh, Eoin, Saoirse, Rónán, Maeve, Fergus, Órla,
Declan, Sinéad, Pádraig, Bríd, Lorcán, Clodagh, Tadhg, Róisín, Cormac, Aisling, Oisín.

**Stage bosses**, in order — Bréanainn, Muireann, Conchobhar, Gráinne, **Diarmuid**, who closes the run.

**A name is all that distinguishes them, and so is a boss.** Every one of the twenty-five plays by
exactly the rules in sections 4–7, with no exceptions, and **a boss is not a different kind of
opponent** — it is drawn differently on the path and holds more health, and that is the whole of it. No
opponent has a power, a gimmick, or a rule it may break.

> **Diarmuid is intended to ignore follow-suit, and does not — [not built].** The design's plan for the
> final boss is that it breaks the rule the player's Cheat breaks. Nothing enforces that today; Diarmuid
> is a block on the map with 135 health.

#### The deck-rank names are still on part of the fight screen — a narrowing seam

The five earlier names cast from the deck's own odd ranks — **Swan**, **Fox**, **Woodcutter**, **Witch**,
**Monarch** — have **not** been removed. They still name the opponent in the fight screen's **dossier
panel**, and the readout beside it still reads "What the Quarry holds", on every fight of the run.

**The health bar was named on 2026-08-17**: it reads **"Aoife's health"** against the opponent you are
actually fighting, so the bar now agrees with the map, the verdict and the fight counter.

So the same fight is fought against **"Aoife" everywhere except the dossier**, which still says "The
Monarch". That remainder is a deliberate scope boundary rather than an oversight, and it is recorded under
[Known tensions](#known-tensions-recorded-not-resolved).

> **The trade the roster made is knowing.** Swan / Fox / Woodcutter / Witch / Monarch were free to teach,
> because they are the names of cards the player already reads. Twenty-five human names are not, and buy
> nothing mechanically. The developer took that trade deliberately in exchange for a run whose shape can
> be seen; it is recorded so it is not mistaken for an oversight.

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
| **Your tricks and your multiplier** | **Open — on screen throughout** as two separate figures, plus **both** cash-out figures since DLR-94: what the streak pays if you cash it yourself, and what it pays if you are hit first.                                  |
| **Whether you can apply damage now** | **Open — on the control itself** (section 7). When it is refused, the reason is printed on its face rather than hidden behind a hover, and the figure it would deal is on the plate.                                       |
| What the last trick did             | **Stated** — which of the four outcomes it was, and what it cost or banked.                                                                                                                                                |
| **Your Cheat slots**                | **Open — two frames beside the decree**, filled or empty, all hand. A selected Cheat and an armed one differ in frame as well as tone, and the hint line names which state you are in (section 4).                          |
| **Your coins**                      | **Open — a plate on the status band**, beside the fight counter, all hand. Also stated on the verdict and throughout the shop (section 10).                                                                                 |
| **Both sides' health**              | **Open — two rows of hearts**, one heart per health point against each side's own maximum. The Quarry's row is **named after the opponent** — "Aoife's health" (since 2026-08-17). The hearts a trick just took break as it resolves. While a streak is banked, the Quarry's last _bank × multiplier_ standing hearts flash as a preview of what cashing right now would take. **That preview shows the FULL figure and deliberately still does, since DLR-94** — you can realise it on demand, so the full figure is what the streak is genuinely worth to you; the reduced figure sits beside the bank readout instead of competing with this one on the same bar. |

The telegraph's fidelity — suit only, or suit and stance — is **[provisional]**; it currently shows
both.

---

## 10. Between hands, and the run

Since 2026-08-15 most of this section is playable, since 2026-08-16 the economy is too, and since
2026-08-17 the run is twenty-five fights you can see laid out in front of you. The run, the shop and the
map are all real; **Forage is not**.

### The run starts on a screen showing the whole path — **[settled]**

**[settled]** — the procedure; every word of the copy is **[provisional]** and the developer's.

Before the first fight you are shown the run itself: **one horizontal path** with every opponent on it,
in the order you will meet them.

- **An ordinary opponent is a short tick. A stage boss is a filled block.** They are marked out by shape,
  not by colour, so the shape of the run reads at a glance: four ticks, a block, four ticks, a block, and
  so on.
- **Every opponent on the path is named**, angled below its mark.
- **The goal is stated in words** beside the path — "Beat all 25".
- **There is exactly one thing to do**, and it names who you fight first: `Fight Aoife`.

**Nothing on the path is clickable.** It is something you read, not something you choose from — there are
no branches, no route to pick, and no node that does anything other than tell you who is there.

### The same path is reachable between fights — **[settled]**

Beating an opponent offers a **`Map`** control, beside the one that goes on to the next fight and the one
that visits the shop. It shows the same path, with your progress on it:

- **Opponents you have beaten are struck through, and stay on the path.** They are not removed — how far
  you have come is part of what the path is for.
- **The opponent you fight next is marked out from those beyond it** — a taller mark and a caret, again
  distinguishable without relying on colour.
- **One control returns you to the verdict**, and `Escape` does the same. Looking at the map costs you
  nothing and commits you to nothing.

The map is offered only **between** fights. A run that has ended offers `Start a new run` and nothing
else.

> **The path does not currently fit a narrow viewport, and it crops rather than scrolls.** Below roughly
> 1088px of width the opponents at the end of the run are simply not drawn — at a phone width barely half
> the path is visible, Diarmuid included, and the title and button are cut off too. Nothing on screen
> indicates this. It is a defect awaiting a tuning decision (a smaller name size, a steeper angle, or
> letting the path scroll sideways), and it is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

### A run is twenty-five fights on one health bar — **[settled]**

A run is a fixed sequence of encounters, fought in order. **Twenty-five** are configured — **four
ordinary opponents then a stage boss, five times over** — and each opponent has more health than the last
of its kind.

**A stage is not a rule.** It is a group of four opponents and the boss that closes it, and it changes
nothing about how a fight is played: there is no stage gimmick, no reward for finishing one, and nothing
happens between stages that does not happen between any two fights. What a stage does is make the run's
length legible.

- **Your health carries from fight to fight, and nothing restores it on its own.** You begin the next
  fight on exactly the health you finished the last one on. Nothing is given back for winning, and
  there is no rest site. **What you can do between fights is spend for it**: buy a heal for a coin, or
  drink your flask for nothing — both below, and both only ever by your choosing.
- **Beating a Quarry does not end the session.** The fight resolves, you are told **by name** that you
  beat them, and you choose to go on to the next one.
- **Your health emptying ends the run**, wherever it happens — including on the last fight. No
  further fight is offered, and **starting again returns you to the start screen** with the whole path
  fresh: nothing struck out, and the first opponent current again.
- **Beating the last Quarry — Diarmuid — ends the run as a win**, and it is stated differently from
  beating any earlier one. In practice you will not see it: see the health curve below.
- **Your Cheat slots carry from fight to fight exactly as your health does** (section 4). A Cheat
  spent in fight one is still gone in fight two; one held is still held. They are granted once, at
  the start of the run, and are replenished only by buying one.
- **Your coins carry too**, and nothing takes them away but spending them.
- **Your flask carries as well**, and it is the one thing in the run that is **given back** rather than
  only spent — a stage-boss kill refills it. See below.

> **Deviation from the base game.** There is no 21-point match and no symmetric contest. A run is
> one-directional: you accumulate damage and never recover it, and the only question is how far you
> get.

### The opponents' health — **[provisional]**

Every opponent's health is **generated from three numbers**, not written out one by one:

| Number                                            | Value  |
| ------------------------------------------------- | ------ |
| The first opponent's health                       | **10** |
| Added for each ordinary opponent already fought   | **4**  |
| A boss's multiplier over the step it sits on      | **1.5**|

So the ordinary opponents run **10, 14, 18, 22**, then Bréanainn holds **39**; the next four run 26, 30,
34, 38 and Muireann holds **63**; and so on to **Oisín at 86 and Diarmuid at 135**. The five bosses hold
**39, 63, 87, 111, 135**.

The first three figures are unchanged from the three-fight run they replaced — the formula was chosen to
reproduce `10, 14, 18` exactly, so nothing measured at those values was disturbed.

**Whose decision:** the developer's. The step and the base are not new choices, but **the boss multiplier
is** — it is the one number in the change nobody has decided. Whether a formula is even the right shape is
also open: twenty-five editable numbers is the alternative, and swapping to it changes nothing else.

> **This run is not winnable, and that is the arithmetic working rather than a fault.** A fight costs the
> player roughly four health and the player starts with **ten**. The healing available is 4 health for a
> coin at one coin a fight, plus — since 2026-08-20 — a **free 6 from the flask, once per stage**, which
> is real but small against opponents ending at 135. Expect to lose in the first or second stage. DLR-82
> already recorded that the answer is the shop and later upgrades, and that **raising the player's
> starting health is explicitly the wrong response**. Both named answers have now shipped and **neither
> has been played against this curve**. The practical consequence: **`YOU WIN` is effectively unreachable in
> play**, so checking that screen needs the run temporarily shortened.

### The run's length — **[settled]**

**Twenty-five fights**, and the length is not separately settable: it is however many opponents are
configured. Adding a name adds a fight.

**The number of stages is not settable either — it is derived from where the bosses sit.** A stage closes
wherever a boss is; five bosses make five stages. Removing the bosses would leave one long stage of ticks
and no blocks, and the path would draw that correctly rather than breaking. Nothing anywhere states "five"
or "four".

### What you are told when a fight ends — **[settled]**

The fight's last trick is shown like any other, and clearing it takes you to a full-screen verdict:
a headline naming which of the three things happened, which fight of the run it was, the health you
carry, and how many of the deciding hand's tricks you took.

**Since 2026-08-17 the headline names the opponent you just beat** — "Aoife defeated" — where it used to
say "FIGHT WON". Winning or losing the **run** is still stated as `YOU WIN` / `YOU LOSE`, because that is
about the run rather than about one opponent; the opponent is named in the line beneath instead.

From an intermediate verdict there are **three** things to do: go on to the next fight, visit the shop, or
look at the map. From a finished run there is one: start a new run.

> This replaced a one-line message on a tally table that a play session showed the player did not
> read as having won or lost. The wording of every line on the verdict is placeholder and the
> developer's.

### Winning a fight pays a coin — **[settled]**; the amount is **[provisional]**

Beating a Quarry pays you **1 coin**, whatever else happens. It is paid at the moment the fight is
won. Overkill damage pays nothing and health remaining pays nothing.

Coins **carry for the whole run** and are on screen throughout: on a plate beside the fight counter
while you play, on the verdict, and in the shop while you choose. They do not survive a new run.

**Whose decision:** the developer's — 1 coin a fight is transcribed from the ticket, not derived.

### Killing quickly pays more, on top of that coin — **[settled]** since 2026-08-21

Ending a fight fast pays you **a coin for every card still unplayed in your hand** at the instant the
Quarry's health reaches zero, multiplied by which hand **of that fight** you killed them in:

| You kill them in the fight's… | Each unplayed card pays | A kill with five cards left pays |
| ----------------------------- | ----------------------- | -------------------------------- |
| **first hand**                | 2 coins                 | 10                               |
| **second hand**               | 1 coin                  | 5                                |
| **third hand**                | half a coin             | 2                                |
| **fourth hand or later**      | nothing                 | 0                                |

Two things about the arithmetic. **A fraction is always rounded down** — a third-hand kill with five
cards left pays 2, not 2.5 — so the rounding never falls in your favour. And **the count is taken
after the killing card has left your hand**: winning on the first trick of the first hand leaves five
of your six, which is where the ten-coin figure above comes from.

**This is paid on top of the coin for winning, not instead of it.** So the worst this can do is pay
you nothing extra: a fight that drags to its fourth hand still pays the flat coin for having won it.

Killing on the last trick of a hand pays nothing from this, however early that hand was — there is
nothing left unplayed to count. The reward is for ending it *early*, not merely for ending it.

The verdict names both payments separately when this one fires — `Fight won +1 coin · Quick kill
+10 coins` — and says nothing about it when it paid nothing.

> This is the first thing in the game that pays a **variable** amount. Before it, every win paid the
> same coin whether it took one trick or five hands.

**Whose decision:** the curve is settled — version-4-scope §4 marks it final, and the values are
transcribed rather than chosen. **That the two payments add rather than replace one another** was
the developer's call, made 2026-08-20. Whether the shop is now too cheap against this income is an
open play-session question — see [Known tensions](#known-tensions-recorded-not-resolved).

### Between fights you choose: go on, visit the shop, or look at the map — **[settled]**

Beating a Quarry with another still to come offers **three** things to do: **go on** straight to the
next fight, **visit the shop**, or **look at the map**. The shop is never forced, and you can always go
and look; the map costs nothing and commits you to nothing.

**The control that goes on names who it takes you to** — `Fight Cillian`, not `Continue`. So does the
button that leaves the shop.

**Trying to walk past money you could spend stops you.** Choosing to continue while at least one
purchase is currently affordable replaces the two controls with a line naming what you are holding,
and offers the shop or the fight again. If nothing is affordable — you have no coins, or both slots
are full and you are at full health — you are not stopped, because there would be nothing to stop
for. Backing out of that prompt returns you to the verdict without doing either.

### What the shop sells — **[settled]**; every price is **[provisional]**

Exactly **five** things:

| Buy              | Costs   | You get                                                                       |
| ---------------- | ------- | ----------------------------------------------------------------------------- |
| **Cheat**        | 1 coin  | One Cheat card into a free slot (section 4)                                   |
| **Envenom**      | 2 coins | One charge to poison a card with, held until you spend it (section 4)         |
| **Poison Guard** | 1 coin  | For **the next fight only**: the first time your own poison lands on you, your streak survives it (section 7) |
| **Whetstone**    | 4 coins | For **the rest of the run**: every trick you take banks **1 more**. Stacks with itself (section 7) |
| **Heal**         | 1 coin  | **4 health**, immediately, and never above your maximum — the excess is lost  |

**Envenom arrived on 2026-08-19 and is the only thing in the shop costing more than a coin** — twice the
Cheat, because it is a guaranteed unconditional hit rather than a rule-break you may not need. **It is not
spent when you buy it**: what you buy is a charge you carry into the fight and spend during a hand.

**There is no cap on Envenom charges.** Unlike a Cheat, which has nowhere to go once both slots are full,
you may buy as many as you can afford — so the only refusal it can raise is not having the coins.

**Poison Guard arrived the same day, and it is the first purchase with a duration rather than a use.** It
is priced level with the heal, because both are a coin against roughly 4 health of value run in opposite
directions. Three things about it are the rules:

- **It is live for exactly the fight you bought it for** — not the rest of the run, and not until you
  spend it. Leave the shop, fight, and when that fight ends the Guard is gone whether it fired or not.
- **You may hold only one at a time.** Buying a second while one is unspent is refused with the reason
  stated, rather than stacking or silently replacing it (see the refusals below).
- **It is spent the first time it fires** — the first time your own poison lands on you — and spent even
  if your bank was empty and there was nothing for it to save.

**The Whetstone arrived on 2026-08-19 and is by some way the most expensive thing in the shop** — four
coins, against one coin per fight won. That is deliberate: it is the shop's one real splurge, and on flat
fight winnings alone it costs most of a short run. Three things about it are the rules:

- **It lasts the rest of the run**, not a fight and not a use. Nothing spends it and nothing expires it.
- **You may buy it as many times as you can afford**, and each copy adds another +1 to the bank's climb.
  There is no cap — the price is the only limiter, so the only refusal it can raise is not having the coins.
- **It changes the bank's climb only.** The multiplier is untouched (section 7).

The screen states which opponent is coming next, and shows your coins, your health against its
maximum, how many Cheat slots you are holding, how many Envenom charges you hold, whether a Poison
Guard is **Held** or **None**, and how many Whetstones you own, while you choose.

### The shop is laid out as four shelves, by how long a purchase lasts — **[settled]**

Since 2026-08-18 the shop is organised into **four shelves**, browsed one at a time, named for **how
long what you buy stays with you**:

| Shelf              | What belongs on it                                    | Holds today            |
| ------------------ | ----------------------------------------------------- | ---------------------- |
| **One-time use**   | Spent when you use it                                 | The **Cheat**, the **Envenom** charge |
| **Fight-long**     | Lasts the rest of the current fight                   | The **Poison Guard**   |
| **Run-permanent**  | Lasts the rest of the run                             | The **Whetstone**      |
| **Game-permanent** | Carries between runs                                  | *nothing — and refused* |

**One-time use is open when you arrive**, and it holds two things since 2026-08-19. **Fight-long and
run-permanent both stopped being empty the same day** — the Poison Guard on the first, the Whetstone on
the second — so **three of the four shelves now hold something**. **Game-permanent cannot be opened at
all**: it is shown, marked out with a dashed edge, and
states **"Coming soon."** It is deliberately visible rather than hidden, so the shape of the finished
shop reads before the things that fill it exist (`hybrid-design.md` version-4-scope §1).

> **"Nothing on this shelf yet." is now unreachable by playing.** Every shelf you can open holds an item,
> and the one that is empty is also the one that is refused — so the wording exists for the next shelf to
> be added rather than for anything a player can currently see.

**The heal is not on any shelf.** It sits in its own block below them, headed "Also for sale", and it
is there whichever shelf you have open. A heal is an instant transfer with no duration, so none of the
four rungs is an honest answer for it.

Nothing about what is for sale, what it costs, or what refuses a purchase changed when the shelves
arrived — that was a **rearrangement**. **The shelves then earned their keep three times**: Envenom
appeared on the one-time-use shelf, the Poison Guard filled the fight-long shelf, and the Whetstone filled
run-permanent — each with no change to the shop screen beyond one readout.

> **The four names are this game's own, not Balatro's.** The obvious borrowing would be deck / Joker /
> consumable, and it was refused: this game has no deck-building layer for those words to mean
> anything against, so the shelves are named for the property they actually sort on.

**Switching shelves works from the keyboard**: the four are one stop in the tab order, and the arrow
keys move between them — including onto the refused shelf, which announces why it cannot be opened
rather than being skipped over silently.

**You may buy nothing**, and the screen says so. **You may buy more than once in a visit** while you
still have the coins — two heals in one visit is eight health if you have the room and the money.

**A purchase you cannot make is refused with the reason on the screen**, never silently. Four
things can refuse one:

- **Both Cheat slots are full** — a Cheat has nowhere to go.
- **You are already at full health** — a heal would do nothing at all, so it is not sold to you.
- **You are already holding a Poison Guard** — only one may be held at a time.
- **You do not have the coins.**

**Envenom and the Whetstone can only ever raise the last.** Neither has a cap — charges and Whetstones
alike are limited only by the purse — so nothing else can refuse either, and full Cheat slots do not,
because that is the Cheat's own cap and not a shared one.

Each of the first three belongs to **one** item and to no other: a full Cheat slot never refuses a heal, a
held Guard never refuses a Cheat.

When more than one applies, the shop names the one that will still be true when the money
arrives — full slots rather than an empty purse.

> **Refusing a heal at full health is this game's own rule, not the base game's and not the
> ticket's.** It was added deliberately: the clamp already discards overheal, but selling a heal to a
> player at full health takes a coin for provably nothing. Buying at 9 of 10 is still allowed and
> still costs a coin — only the wholly wasted purchase is refused.

**Leaving the shop starts the next fight**, with everything you bought already in effect: the health
you healed to, the Cheats in your slots, the Envenom charges you hold, any Poison Guard, every Whetstone
you own, and whatever coins you did not spend. **The Guard is the one purchase that expires**: it lasts
that fight and no longer. **The Whetstone is at the other extreme** — it survives every remaining fight of
the run.

### The flask — a free heal you carry, refilled by a stage boss — **[settled]**; both its figures are **[provisional]**

Since 2026-08-20 you carry a **flask**. It is on the shop screen but it is **not for sale**: it costs
nothing, and what limits it is charges rather than coins.

- **Drinking it restores 60% of your maximum health, immediately** — **6** on today's bar of 10.
  Anything above your maximum is thrown away, exactly as a bought heal's excess is.
- **You hold one charge**, and drinking spends it.
- **Beating a stage boss fills it back to one charge** — whether you had drunk it or not, so there is
  never a second charge banked and never a boss kill that does nothing for it. **Beating an ordinary
  opponent does not refill it.** Across a full run that is **five flasks**, one per stage.
- **You may only drink it between fights**, on the same shop screen and under the same conditions the
  shop itself is reachable. There is no way to drink it mid-hand.
- **It is refused, with the reason on the screen, in exactly two cases**: your flask is empty, or you
  are already at full health. An empty flask is named first when both are true, because that is the
  one still true after the next hit. Nothing else can refuse it — there is no coin check, because
  there is no price.

**It is deliberately unmistakable for the shop's paid heal**, and none of the ways it is marked out is
a colour. It sits in a block of its own **above the four shelves** and far from the "Also for sale"
block the heal lives in; it is a **potion button with an icon** where every purchase is a text card;
it carries the words **"Free"** and **"No coin"** where they carry a price; and the purse row gains a
cell stating how many charges you hold. The wording of all of it is placeholder, and **"Flask" itself
is not a settled name** (`hybrid-design.md` version-4-scope §2).

**The two figures, and who owns them:**

| Figure                            | Value | Status                                                                                   |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| What one drink restores           | **60% of maximum** (6 today) | **[provisional]** — transcribed from the design, never played |
| Charges the flask holds, and refills to | **1** | **[provisional]** — the design defers re-tuning it "only if it plays too thin" |

**Whose decision:** the developer's, both of them, and neither is a number anyone has chosen here —
they are transcribed from `hybrid-design.md` version-4-scope §2. The charge count and the refill are
**one number, not two**, so raising it would give a boss kill more back as well.

> **Deviation from the base game.** *The Fox in the Forest* has no health, so it has nothing to
> restore and nothing to carry between deals. The flask exists because this game's run is one
> unrefilled bar across twenty-five fights, and it is the second of the two answers to that — the shop
> being the first.

### Which fight you are on, and who you are fighting — **[settled]**

Shown throughout play, beside the opponent's plate: **`Fight 1 of 25 — Aoife`**. Until 2026-08-17 it read
a bare `Fight 1 of 3`; it now names the opponent as well as the position. It is stated on the shop screen
too, alongside who is coming next.

### Not built

- **Forage** — the only thing you would do between hands: edit the 33-card deck the next hand is
  dealt from, in exactly four ways — a card's **value**, its **ability**, its **suit**, and the
  **decree**. The budget is **4 edits per encounter** (**[provisional]**). **[not built]** — nothing
  reads the budget. **The player holds no skulls of their own**, and Forage could not add any.
- **Surplus cash-out damage paid back as money** — **[not built]**. The intention stated at PT-002
  was that overkill (section 8) becomes currency, and nothing reads overkill to this day. What
  shipped in its place is a payment for **speed** rather than for surplus: the flat coin for winning,
  plus the quick-kill payout counted from your **unplayed cards** (section 10). Both reward ending a
  fight decisively, but neither reads the damage you overshot by. Deliberately a different mechanic,
  not this one built late.
- **Anything in the shop that raises the player's damage — MOSTLY BUILT since 2026-08-19.** Two purchases
  now do it, in different ways. Envenom deals a flat **4 damage** to the Quarry when the Quarry wins the
  trick it is played into — a **fixed one-off hit**, not a multiplier on anything. **The Whetstone is the
  scaling one**: it raises what every taken trick banks, permanently, so it multiplies the whole `n × n`
  curve rather than adding to it once. The stated intention was that upgrades are what make the payout
  scale past the early game, and **that half is now built for the bank**.
  **What is still missing is the multiplier's side of it** — nothing raises the multiplier's climb; a twin
  to the Whetstone that does is named as the natural next addition (`hybrid-design.md` version-4-scope §1)
  and is **[not built]**. Envenom's clean-loss rule and the Poison Guard both still *preserve* a streak
  rather than growing one. A
  card's **value** is one of the four things Forage may edit, and since 2026-08-14 a card's rank
  decides only who wins a trick — it feeds no scoring at all (section 7).
- **A price curve or rerolls** — **[not built]**. The shop shows the same **five** things at the same
  five prices on every visit. **Three items shipped on 2026-08-19** — Envenom onto the one-time-use shelf,
  the Poison Guard onto fight-long and the Whetstone onto run-permanent — so **every shelf a player can open
  now holds something**, and the only empty one is the refused game-permanent shelf below. A **rotating**
  shelf — a different selection each visit — is still **[not built]** and is a separate idea from the four
  fixed shelves. **A price that climbs with each copy bought** is the specific version of this that the
  Whetstone raises, since it is the first item that stacks without limit: there is none, and the flat 4
  coins is what a second copy costs too.
- **Anything at all on the game-permanent shelf** — **[not built]**, and **nothing is designed for it**.
  The shelf is shown and refused precisely so that this gap is visible rather than hidden.
  `hybrid-design.md` version-4-scope §1 explicitly declines to design it yet, and **carrying anything
  between runs would be the first persistence this game has** — nothing is saved today.
- **Anything in the shop that reduces skull density** — **[not built]**, and ruled out rather than
  merely absent. The skull is the game's only inversion (section 7), and selling a way past it would
  remove the reason taking every trick is not simply correct.
- **An *automatic* restore between fights** — **[not built]**, and deliberately so. The tunable exists
  and is read by nothing; wiring it in was forbidden until the flask was designed. **The flask has
  since been designed and built (2026-08-20) and the tunable is still unwired** — that is a decision,
  not an oversight, because a restore the game performs on you is a different mechanic from a charge
  you choose to spend. **Neither the shop's heal nor the flask is this**: one costs a coin, the other
  costs a charge, and both need you to choose them.
- **Coins carrying between runs** — **[not built]**. A new run starts at zero.
- **Different Quarries — HALF BUILT.** The twenty-five opponents now have **names of their own**
  (section 9), and the map, the verdict, the shop and the fight counter all use them. But **every opponent
  still plays identically** and differs only in health: no power, no gimmick, nothing it may do that
  another may not. The **fight screen's own dossier still says "The Monarch"** on every fight, which is
  the seam recorded under [Known tensions](#known-tensions-recorded-not-resolved).
- **Stage gimmicks, and a boss that plays differently — HALF BUILT.** The run **is** grouped into five
  stages of four opponents and a boss, and the path draws that shape. But a stage does nothing: no
  gimmick, no reward for closing one, nothing that happens between stages and not between any two fights.
  And **a boss is only a bigger health total and a different mark** — Diarmuid is intended to ignore
  follow-suit and does not.
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

> **A note on two file names, 2026-08-20.** `src/hunt/run.ts` was split by DLR-93 when it crossed this
> project's file-size ceiling. It keeps the run's **shape** — `RunState`, `startRun`, and the
> projections — while the **transitions** (`recordEncounter`, `advanceRun`, `buyFromShop`,
> `drinkFlask` and their private helpers) moved to `src/hunt/runTransitions.ts` and are re-exported from
> the old file. Rows below name whichever of the two actually holds the code; a row naming `run.ts` for
> a `RunState` field and a transition in the same breath means exactly that.

> **Where the last contract stands, 2026-08-21 (DLR-95).** Engine and screen landed together, and QA
> drove it end to end in a real browser: a first-hand kill with two cards still in hand paid **+4**
> beside the flat **+1**, the verdict read `FIGHT WON +1 COIN · QUICK KILL +4 COINS`, and the purse
> moved 0 → 5 — so the figure on screen and the jump in the purse agree, and **all of it is reachable
> by playing right now**. A lost run correctly shows no reward line at all. **The curve is `settled`,
> not `provisional`** — version-4-scope §4 marks it final and the values are transcribed, not chosen
> here. **One reading was the developer's and is recorded as theirs**: that the quick kill **adds to**
> the flat coin rather than replacing it (2026-08-20), which is what stops a fourth-hand win paying
> literally nothing. **All of the reward line's copy is placeholder**, as every label in that file is,
> and whether it should also name *why* — how many cards, which hand — was flagged rather than
> decided. **Nothing was retuned**: no price, health total or damage figure moved in response to the
> new income, and `WHETSTONE_PRICE` in particular is untouched. **What has not been measured is
> whether the economy still holds** at up to 13 coins a fight against a 4-coin item. Recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

> **Where DLR-94 stands, 2026-08-20.** Engine and screen landed together, and QA drove
> it end to end in a real browser: the plate on the felt rail, the poise, the commit paying the **full**
> `bank × multiplier` with the player's hearts untouched, the bank readout zeroing, the trick carrying on
> and resolving normally afterwards, and the empty-bank refusal with its reason **on screen** are **all
> reachable by playing right now** — none of it is enforced-but-unreachable. **One row above graduated from
> `not built`**: poison pending now locks the control, which had been recorded as a design decision since
> 2026-08-19 with nothing to enforce it. **The two-thirds fraction is `settled`, not `provisional`** — it is
> transcribed from version-4-scope §3 rather than chosen here, and no test hard-codes it independently of
> the two constants. **Two readings in this contract were the planner's rather than the ticket's**, both
> recorded and both the developer's to overturn: that a **poison** hit pays the reduced rate like any other
> forced hit (the ticket enumerated only a clean loss and an eaten skull), and that the control is available
> on a **follow** as well as on a lead. **All of the control's copy is placeholder**, as every label in that
> file is. **Nothing was retuned** in response to forced cash-outs paying a third less: no health total,
> damage figure, price or opponent curve moved. **What has not been measured is whether the choice is a real
> one** — whether players cash early or push, and whether two taps is right, are both only answerable by
> playing. Recorded under [Known tensions](#known-tensions-recorded-not-resolved).

> **Where DLR-93 stands, 2026-08-20.** Engine and screen landed together, and QA
> drove the drink end to end in a real browser: the charge on the run, the 6-health restore, the clamp
> that discards overheal, both refusals with their reasons on screen, the boss refill, the
> ordinary-kill non-refill, the potion button and the purse cell are **all reachable by playing right
> now** — none of it is enforced-but-unreachable. **Both of the flask's figures are `provisional` and
> both are transcribed rather than chosen**: the 60% comes from the design doc, and the single charge is
> a number the design explicitly defers re-tuning ("revisit only if it plays too thin"), which is why it
> is not `open`. **One row below stays `not built` by decision rather than oversight**: the automatic
> between-fight restore. DLR-82 forbade wiring it in "until the flask is designed", and the flask being
> designed did not change the answer — its row's "who decides" column said the flask stories owned it,
> and that has been corrected rather than left to read as an outstanding task. **Nothing was retuned**:
> no health total, price or opponent curve moved in response to a free heal entering the run. **What has
> not been measured is the only thing that matters about it** — whether five flasks across
> twenty-five fights changes how far a run gets. Recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

> **Where DLR-92 stood, 2026-08-19.** Engine and screen landed together: the
> Whetstone on the run-permanent shelf, its 4-coin price, its stacking purchase, the purse cell counting how
> many you own, the coins-only refusal, and the bank's raised climb are **all reachable by playing right
> now** — none of it is enforced-but-unreachable. **The multiplier's twin item is `not built` by decision
> rather than oversight**: the design names it as the natural next addition and the ticket refused to build
> both under one item. **One thing was verified against the engine and not on screen**: QA reached the shop
> but never accumulated the 4 coins to buy a Whetstone in two full runs, so the `+2`-a-trick climb is pinned
> by a spec against the same function the browser calls and has **not yet been watched happening**. That is
> the item's price meeting a 1-coin-a-fight income, which is itself the datum — recorded under
> [Known tensions](#known-tensions-recorded-not-resolved). **Nothing was retuned** in response to the bank's
> ceiling tripling: no health total, damage figure or Quarry curve moved.

> **Where DLR-91 stood, 2026-08-19.** Engine and screen landed together, and QA
> confirmed the whole of it in a browser: the retimed poison, the two amounts, the streak cashing out when
> poison lands on you, the Quarry-first ordering that spares you a mutual kill, the Poison Guard on the
> fight-long shelf, its purchase, its refusal, and the purse cell that says whether one is held are **all
> reachable by playing right now**. **One row below is `not built` by design decision rather than
> oversight**: Apply Damage must be disabled while poison is pending, and Apply Damage does not exist yet.
> **Two rows stay `not built` from DLR-90 and were deliberately not addressed** — nothing announces the
> delayed hit landing, and nothing shows a held Guard during a fight, so poison is legible only through its
> effects. **One accepted oddity shipped knowingly**: a held Guard suppresses the cash-out, so a Quarry that
> would have died to that cash-out survives and you take damage you would otherwise have dodged. The
> developer confirmed that as a real decision when the consequence was put to them. **Nothing was retuned**
> in response to mutual kills now favouring the player.

> **Where DLR-90 stood, 2026-08-19.** Engine and screen landed together: the third
> shop item, the charge carried across fights, the felt-rail plate, the three-tap arm-and-mark, the mark on
> all four surfaces a card renders on, the replaced clean loss and the delayed hit at the next deal are
> **all reachable by playing right now**. **Two rows below are `open` and both are the developer's**:
> whether three taps to mark is right, and whether a poisoned trick you win that is *also* a skull trick
> should still cost the skull. One row is **`not built` and deliberately so** — nothing announces that the
> delayed damage landed, because no rule required it and choosing the surface is a judgement call. **Two
> residuals were found in review rather than shipped**: the decree pile's mark was built and never wired at
> its mount, and the reducer's commit path cleared a poised Cheat but not a poised Envenom. Both now have
> regression tests that drive the reachable path rather than the field. **Not verified by playing:** QA
> could not earn 2 coins in five full playthroughs, so the whole purchase-to-payoff loop is proven by a
> mounted-component test against the real component tree and **not yet by a hand on a mouse.**

> **Where DLR-89 stood, 2026-08-18.** Engine and screen landed together: the four
> shelves, the item→shelf assignment, the stated empty shelves and the refused game-permanent tab are
> **all reachable by playing right now**. **No rule about what the shop sells, what it costs, or what
> refuses a purchase moved** — the eleven pre-existing shop-screen specs pass unedited, which is the
> evidence for that. Three rows below are **`not built`** and are the point rather than an oversight:
> nothing is designed for the game-permanent shelf, and two shelves are empty until Envenom, Poison
> Guard and Whetstone land on their own tickets. **(All three have since landed — DLR-90, DLR-91 and
> DLR-92, all on 2026-08-19 — so only the game-permanent shelf is still empty.)** One **known residual**: after clicking a shelf with the
> mouse, the very next arrow-key press can move from the previously-focused shelf rather than the one
> just clicked; it corrects itself on the next `Home`/`End`. Logged, not fixed — the fix means changing
> a hook three screens share.

> **Where DLR-85 stood, 2026-08-17.** Engine and screen landed together: the start
> screen, the map, the twenty-five-fight run and the naming across four surfaces are **all reachable by
> playing right now** — none of it is enforced-but-unreachable. **One row below is marked `NOT MET`** —
> the path does not fit a viewport narrower than about 1088px and crops silently — and it is a defect
> awaiting a tuning decision, not an undecided rule. Two rules the change *implies* are **not** built:
> a boss that plays differently (Diarmuid should ignore follow-suit), and the **dossier** naming the
> opponent the rest of the game names — the health bar half of that was closed on 2026-08-17.

| Rule area                                     | Status                           | Where enforced                                                                                                                   | Who decides what's open                                 |
| --------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Deck, decree, draw pile                       | settled                          | `src/warCouncil/deck.ts`, `deal.ts`                                                                                              | —                                                       |
| Hand size and trick count (6)                 | settled                          | `src/hunt/config.ts` — `HAND_SIZE`; sliced in `src/warCouncil/deal.ts`, ends the hand in `playCard.ts`                           | —                                                       |
| First dealer, alternation                     | provisional                      | `src/app/dealerForRound.ts`                                                                                                      | Developer                                               |
| Skull density (~30%, 2 of 6)                  | settled                          | `src/hunt/config.ts` — `SKULL_DENSITY`; applied by `src/warCouncil/skulls.ts` — `assignSkulls`                                   | —                                                       |
| Skulls never on rank 1                        | settled                          | `src/hunt/skullWeights.ts` (moved out of `config.ts` by DLR-94) — every `SKULL_WEIGHTS_*` curve sets rank `1: 0`; filtered by `src/warCouncil/skulls.ts` — `skullableCards` | —                                                       |
| Skull rank curve (hump — mid-ranks heaviest)  | **provisional**                  | `src/hunt/skullWeights.ts` (moved out of `config.ts` by DLR-94) — `SKULL_RANK_WEIGHTS`; drawn against by `src/warCouncil/skulls.ts` — `weightedDraw`                        | Developer, after playing                                |
| A curve per opponent                          | **not built**                    | nothing — `SKULL_RANK_WEIGHTS` is one module-level curve; the other three are exported and unread                                | Developer — a later ticket                              |
| Skulls assigned to the Quarry's deal only     | settled                          | `src/warCouncil/deal.ts` — `assignSkulls(cpuHand, rng)`; the draw pile is never skulled                                          | —                                                       |
| A trick is skulled if any card in it is       | settled                          | `src/warCouncil/skulls.ts` — `trickIsSkulled`                                                                                    | Developer — whether it should die with a Fox exchange   |
| Shape readout shows no rank                   | settled                          | `src/warCouncil/skulls.ts` — `suitShape`; drawn by `src/app/warCouncil/QuarryShape.tsx`                                          | —                                                       |
| A skulled card is marked once face up         | settled                          | `src/app/warCouncil/PlayingCard.tsx` — the `skulled` prop; passed by `TrickWell.tsx`                                             | —                                                       |
| Follow-suit, led-Monarch narrowing            | settled                          | `src/warCouncil/legalMoves.ts` — `legalMoves`, `monarchFollowSet`                                                                | —                                                       |
| An armed Cheat lifts follow-suit only         | settled — since DLR-83           | `src/warCouncil/legalMoves.ts` — `LegalMoveOptions.ignoreFollowSuit`, read after the Monarch branch returns; threaded by `playCard.ts` | —                                                 |
| Two Cheat slots, one card each                | settled                          | `src/hunt/config.ts` — `CHEAT_SLOT_COUNT`; the cap is stated once, in `src/hunt/cheats.ts` — `addCheat`                          | —                                                       |
| Two clicks to arm, a third to give it back    | settled                          | `src/app/warCouncil/roundUiState.ts` — `TapCheat`, `CancelCheat`, `cheatArmed` (moved there by DLR-90); handled in `roundReducer.ts`, rendered by `CheatSlots.tsx`                     | Developer — whether arming feels like a detour          |
| Committing while armed spends the Cheat       | settled                          | `src/app/warCouncil/roundReducer.ts` — `commit`; removal in `src/hunt/cheats.ts` — `removeCheat`                                 | Developer — whether spending it on an already-legal card is right |
| A refused play does not spend the Cheat       | settled                          | `src/app/warCouncil/roundReducer.ts` — `commit`'s rejection branch returns before the removal                                    | —                                                       |
| Cheats carried fight to fight                 | settled                          | `src/hunt/run.ts` — `RunState.cheats`; `advanceRun`'s spread carries it, `recordEncounter` adopts the hand's survivors           | —                                                       |
| Cheats a run starts with (0)                  | **provisional** — set 2026-08-17 | `src/hunt/config.ts` — `RUN_STARTING_CHEATS`, **0** since 2026-08-17 (was 2); granted by `src/hunt/cheats.ts` — `grantCheats`, which throws outside `0..CHEAT_SLOT_COUNT` rather than clamping | **Developer** — it has moved once already; every Cheat is now bought |
| The Quarry holds no Cheats                    | settled                          | nothing to enforce — the bypass is an argument the Quarry's call sites never pass; a grep guards the absence                     | —                                                       |
| Buying a Cheat (1 coin, into a free slot)     | settled — since DLR-84           | `src/hunt/runTransitions.ts` — `buyFromShop` calls `addCheat` and advances `nextCheatId`; priced by `src/hunt/config.ts` — `CHEAT_PRICE`    | Developer — the price                                   |
| Selling or replacing a Cheat                  | **not built**                    | nothing — the shop only adds                                                                                                     | Developer — a later ticket                              |
| Odd-rank abilities                            | settled                          | `src/warCouncil/abilities.ts`, `resolveTrick.ts`                                                                                 | —                                                       |
| Whether abilities survive six-card hands      | **open**                         | nothing — abilities are unchanged and ability-free hands are accepted                                                            | Developer, after playtest                               |
| Trick resolution, Witch-as-trump              | settled                          | `src/warCouncil/resolveTrick.ts`                                                                                                 | —                                                       |
| Winner leads next, Swan's exception           | settled                          | `src/warCouncil/playCard.ts`, `abilities.ts`                                                                                     | —                                                       |
| The four outcomes                             | settled                          | `src/warCouncil/bank.ts` — `trickOutcomeFor`, `isTaken`                                                                          | —                                                       |
| Cards have no value; the bank counts tricks   | settled — since PT-002           | `src/warCouncil/bank.ts` — `resolveTrickBank` banks `1` per trick taken plus the run's bank-climb bonus (DLR-92); it reads no card at all, and no value function exists | —                          |
| A streak of _n_ cashes `n × n` with nothing bought | settled                     | `src/warCouncil/bank.ts` — both terms climb by 1 per take when no Whetstone is owned, so the product is a square; pinned by `bank.test.ts`'s `[1,4,9,16,25,36]` spec, which DLR-92 left unedited | —                     |
| A Whetstone adds 1 to the bank's climb, and stacks | settled — since DLR-92      | `src/warCouncil/bank.ts` — `resolveTrickBank` reads `TrickFacts.bankClimbBonus`; the count lives on `src/hunt/run.ts` — `RunState.whetstones`, and `bankClimbBonusFor` is the one statement of "+1 per copy" | —                |
| The Whetstone's price (4 coins)               | **provisional** — set 2026-08-19 | `src/hunt/config.ts` — `WHETSTONE_PRICE`; charged by `src/hunt/shop.ts` — `priceOf`                                               | **Developer** — transcribed from the design doc, and never yet afforded in a QA run |
| Whetstones carried fight to fight             | settled — since DLR-92           | `src/hunt/run.ts` — `RunState.whetstones`, carried by `advanceRun`'s and `recordEncounter`'s spread, exactly as `coins` is        | —                                                       |
| Nothing raises the multiplier's climb         | **not built** — by decision      | nothing — `resolveTrickBank`'s `multiplier += 1` takes no bonus, and no `ShopItem` maps to one                                    | **Developer — the twin item, a later ticket**           |
| A bank climb that is not a positive integer is ignored | settled — since DLR-92  | `src/warCouncil/bank.ts` — `resolveTrickBank` floors the bonus to 0 unless `Number.isInteger` and `> 0`, so a spoiled figure degrades to the bare rule rather than reaching a health bar | —                       |
| The bank, and that it only climbs             | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                                                    | —                                                       |
| The streak multiplier, and its reset          | settled                          | `src/warCouncil/bank.ts` — `resolveTrickBank`                                                                                    | —                                                       |
| Cash-out on damage, at **two-thirds** rounded down | settled — since DLR-94      | `src/warCouncil/bank.ts` — `forcedCashValue`, the only reader of `FORCED_CASH_OUT_NUMERATOR`/`_DENOMINATOR` in `src/hunt/config.ts`; `resolveTrickBank`'s forced branch calls it for every forced hit, poison included | —                                     |
| The fraction is a numerator over a denominator, not a float | settled — since DLR-94 | `src/hunt/config.ts` — two constants, multiplied before dividing in `forcedCashValue`, because `x * (2 / 3)` floors wrong on every multiple of 3; pinned by `bank.test.ts`'s multiples-of-three spec | —                                 |
| Cash-out at the end of the sixth trick, **in full** | settled                    | `src/warCouncil/bank.ts` — `resolveTrickBank`'s `finalTrick` fold calls `cashValue`, deliberately not `forcedCashValue`; pinned by `bank.test.ts`'s AC5 spec, which cashes one streak both ways | —                          |
| One statement of what a streak is worth       | settled — since DLR-94           | `src/warCouncil/bank.ts` — `cashValue`; all three cash-outs compute through it, so they cannot disagree about what they are a share of | —                                                       |
| Applying damage — full payout, both counters reset, no health cost | settled — since DLR-94 | `src/warCouncil/voluntaryCashOut.ts` — `cashBankNow` zeroes only bank and multiplier; `incomingFromCashOut` keys the player's share to a hard 0. Committed by `src/app/warCouncil/roundReducer.ts` — `handleTapApplyDamage` | —                     |
| The trick carries on afterwards               | settled — since DLR-94           | nothing to enforce — `cashBankNow` returns the round with `currentTrick`, `phase`, `leader` and both hands untouched, and writes no `lastResolution`, so the ordinary play path resumes | —                                  |
| One statement of whether Apply Damage is live | settled — since DLR-94           | `src/warCouncil/voluntaryCashOut.ts` — `applyDamageRefusalFor`, read by both the reducer's guard and the plate's disabled state; `src/app/warCouncil/roundUiState.ts` — `applyDamageStock` is the one place the app's shape is translated for it | —      |
| Two taps to spend a streak, `Escape` to cancel | settled — the grammar; the tap count is **provisional** | `src/app/warCouncil/roundUiState.ts` — `RoundUiState.applyPoised`, a hand-transient boolean; `ApplyDamagePlate.tsx` carries `aria-pressed` and the `Escape` handler | **Developer** — whether two taps is right, or one. Only felt by playing |
| The reduced figure is shown beside the full one | settled — since DLR-94          | `src/app/warCouncil/BankMeter.tsx` — computes it through `forcedCashValue` rather than restating the fraction, so the copy cannot drift from the constants | —                                                       |
| Damage to the player = 1 per event            | settled                          | `src/hunt/config.ts` — `DAMAGE_PER_HIT`                                                                                          | —                                                       |
| Player health (10)                            | **provisional** — set 2026-08-14 | `src/hunt/config.ts` — `PLAYER_START_HEALTH`                                                                                     | Developer, after playing                                |
| Quarry health (10)                            | **provisional** — set 2026-08-14 | `src/hunt/config.ts` — `QUARRY_ENCOUNTER_HEALTH`                                                                                 | Developer, after playing                                |
| Damage applied per trick, mid-hand            | settled                          | `src/hunt/encounter.ts` — `applyDamage`; called per resolution by `src/app/warCouncil/roundReducer.ts`                           | —                                                       |
| The seat → side crossing, once                | settled                          | `src/warCouncil/bank.ts` — `incomingFrom`                                                                                        | —                                                       |
| Health never negative; surplus discarded      | settled                          | `src/hunt/encounter.ts` — `deplete`, the single clamp                                                                            | —                                                       |
| The Quarry's bar settles first                | settled — since 2026-08-19       | `src/hunt/encounter.ts` — `applyDamage` depletes the Quarry, then the player **only if the Quarry survived**       | —                                                       |
| A mutual kill is a player win                 | settled — **overturns a 2026-08-11 ruling** | `src/hunt/encounter.ts` — `resolveWinner` has no tie branch and no constant to read; a Quarry-down event never touches the player, so the case is unreachable. `SIMULTANEOUS_DEPLETION_WINNER` was **deleted** | — (the reversal is recorded in `hybrid-design.md` §9) |
| Poison pending locks Apply Damage             | settled — since DLR-94           | `src/warCouncil/voluntaryCashOut.ts` — `applyDamageRefusalFor` returns `PoisonPending`; the predicate is `src/hunt/encounter.ts` — `hasPendingEnvenom`, which reads **both** sides of the queue. Re-asked on the confirming tap, so a booking landing under a poise stops the commit | — |
| An encounter can end mid-hand, and play stops | settled                          | `src/app/warCouncil/roundReducer.ts` — the `isEncounterResolved` guard in `canAct`                                               | Developer — whether it feels abrupt                     |
| Health carried hand to hand                   | settled                          | `src/app/warCouncil/roundReducer.ts` owns the live `EncounterState`; `src/App.tsx` carries it between hands                      | —                                                       |
| No cap on hands per encounter                 | settled — deliberately none      | no cap key exists to read                                                                                                        | Developer, if the tail stalls                           |
| Tricks and multiplier on screen throughout    | settled                          | `src/app/warCouncil/BankMeter.tsx`; wording in `labels.ts` — `TRICKS_LABEL`, `MULTIPLIER_LABEL`                                  | Developer — the wording and the visual values           |
| The two terms stay separately addressable     | settled — **and used since DLR-92** | `src/warCouncil/bank.ts` — `bank` and `multiplier` are two fields, and the Whetstone moves only the first; the affordance PT-002 kept them apart for is now load-bearing                                  | —                                                       |
| Surplus damage paid back as money             | **not built**                    | nothing reads overkill — winning pays a flat coin plus a payout counted from unplayed cards, neither a share of the cash-out     | Developer — a later ticket                              |
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
| Between-encounter restore (none, automatic)   | **not built** — by decision      | `src/hunt/config.ts` — `ENCOUNTER_PLAYER_RESTORE`; still **no consumer** after DLR-93. A grep in DLR-82's, DLR-84's and DLR-93's final verification guards it | **Developer** — the flask has now shipped *without* wiring this, so it is a separate decision rather than a story waiting to land |
| Winning a fight pays 1 coin                   | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `COINS_PER_ENCOUNTER_WIN`; credited by `src/hunt/runTransitions.ts` — `recordEncounter`, the single crediting site      | Developer — transcribed, not derived                    |
| A quick kill pays per unplayed card           | **settled** — 2026-08-21          | `src/hunt/quickKill.ts` — `quickKillPayout`, the one place the fraction is floored; curve in `src/hunt/config.ts` — `QUICK_KILL_TIER_MULTIPLIERS`  | — transcribed from version-4-scope §4, marked final     |
| The two payments add rather than replace      | **settled** — 2026-08-20          | `src/hunt/runTransitions.ts` — `recordEncounter` credits `COINS_PER_ENCOUNTER_WIN + quickKill` in one expression                              | — the developer resolved it; do not collapse the sum    |
| Which hand of the fight the kill landed in    | **settled**                       | `src/hunt/run.ts` — `RunState.handOfFight`, 1-based; advanced and reset by `src/hunt/runTransitions.ts` — `handOfFightAfter` and `advanceRun` | —                                                       |
| The unplayed count is taken at the kill       | **settled**                       | `src/app/warCouncil/roundReducer.ts` — `captureUnplayed`, frozen at the resolving transition, not re-read later                                | —                                                       |
| The verdict names what the win paid           | **settled**                       | `src/app/run/RunOutcomePanel.tsx` — the `.run-reward` line; wording in `src/app/run/runLabels.ts` — `rewardText`                              | Developer — all of the copy is placeholder              |
| Coins carry across the run, and are on screen | settled — since DLR-84           | `src/hunt/run.ts` — `RunState.coins`, carried by `advanceRun`'s spread; drawn by `src/app/warCouncil/RoundStatusBand.tsx`'s `.wc-coins` plate | —                                          |
| The shop, and its exactly five items          | settled — since DLR-84           | `src/hunt/shop.ts` — `SHOP_ITEMS`, unchanged in order by DLR-89 and widened by DLR-90, DLR-91 and DLR-92 (the Whetstone inserted before `Heal`, which must stay last); rendered by `src/app/run/ShopPanel.tsx`, which reads the groupings below rather than listing the items | —              |
| Four shelves, by how long a purchase lasts    | settled — since DLR-89           | `src/hunt/shop.ts` — `ShopCategory` and `SHOP_CATEGORIES` (which fixes the order); drawn by `src/app/run/ShopCategoryTabs.tsx`   | Developer — the four labels are placeholder copy         |
| Which shelf an item sits on                   | settled — since DLR-89           | `src/hunt/shop.ts` — `categoryOf`, an exhaustive `switch`; grouped once at module load into `SHOP_ITEMS_BY_CATEGORY`             | —                                                       |
| The heal is on no shelf at all                | settled — since DLR-89           | `src/hunt/shop.ts` — `categoryOf` returns `null` for it, collected by `UNCATEGORISED_SHOP_ITEMS`; rendered outside the tabs      | —                                                       |
| One-time use is the shelf you arrive on       | settled — since DLR-89           | `src/app/run/ShopPanel.tsx` — the `useState` initial value; deliberately **not** persisted across visits                          | Developer — whether the shelf should survive re-entry    |
| An empty shelf says it is empty               | settled — **unreachable since DLR-92** | `src/app/run/shopLabels.ts` — `SHOP_CATEGORY_EMPTY`; branched on in `ShopPanel.tsx` when the shelf holds nothing. Every openable shelf now holds an item, so no player can see this | Developer — whether the wording is still worth keeping |
| Game-permanent is shown and refused           | settled — since DLR-89           | `src/hunt/shop.ts` — `isShopCategoryAvailable`, false only for that rung; the tab carries `aria-disabled` and states `SHOP_CATEGORY_COMING_SOON` | Developer — the wording, and `aria-disabled` vs native `disabled` |
| What is on the game-permanent shelf           | **not built** — nothing designed  | nothing — no item maps to that rung, and version-4-scope §1 declines to design one                                              | **Developer — a later ticket**                          |
| Shelves switchable from the keyboard          | settled — since DLR-89           | `src/app/warCouncil/useRovingTabIndex.ts`, reused by `ShopCategoryTabs.tsx` — one tab stop, arrows within it, manual activation   | —                                                       |
| The shop is opt-in, reached from the verdict  | settled — the developer's ruling | `src/App.tsx` — the `RunPhase` union (was `BetweenPhase`; DLR-85 widened it with `Start` and `Map`); controls in `src/app/run/RunOutcomePanel.tsx` | Developer — whether the three controls read at a glance |
| Continue warns when something is affordable   | settled                          | `src/hunt/shop.ts` — `canBuyAnything`, `some()` over `refusalFor`; raised by `src/App.tsx`'s `handleContinue`                    | **Developer** — safety net or nag; a threshold is one line |
| Backing out of the warning takes no action    | settled                          | `src/app/run/RunOutcomePanel.tsx` — `onDismissWarning` on the swapped block's `Escape`                                           | Developer — whether it should mean "continue anyway"    |
| Both prices (1 coin each)                     | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `CHEAT_PRICE`, `HEAL_PRICE`, deliberately two keys                                                        | **Developer** — if Heal wins every visit, the Cheat is mispriced |
| Buying a Whetstone (4 coins, no cap, stacks)   | settled — since DLR-92           | `src/hunt/runTransitions.ts` — `buyFromShop`'s `Whetstone` case increments `RunState.whetstones`; `src/hunt/shop.ts` — `refusalFor` needed no clause, so only `NotEnoughCoins` can refuse it | Developer — the price, and whether stacking wants a cap |
| A heal restores 4, clamped, surplus discarded | **provisional** — set 2026-08-16 | `src/hunt/config.ts` — `HEAL_HEALTH_RESTORED`; the clamp moved into `src/hunt/runTransitions.ts` — the private `healedBy`, shared with the flask since DLR-93 | Developer — the amount                                  |
| Health is raised in exactly one place         | settled — since DLR-93           | `src/hunt/runTransitions.ts` — `healedBy` is the sole writer that raises player health, read by `buyFromShop`'s `Heal` arm and by `drinkFlask`; overheal is discarded there and nowhere else | —                                                       |
| Two sources of healing, one of them free      | settled — since DLR-93           | the paid Heal in `src/hunt/shop.ts` / `buyFromShop`, and the flask in `src/hunt/flask.ts` / `drinkFlask`. No rest site exists, and nothing restores health during a fight | —                                                       |
| The flask — one charge, drunk by choice, free | settled — since DLR-93           | `src/hunt/run.ts` — `RunState.flaskCharges`, seeded by `startRun` and carried by `advanceRun`'s and `recordEncounter`'s spreads; spent by `src/hunt/runTransitions.ts` — `drinkFlask`. It is **not** a `ShopItem`, so no price or shelf exists for it | —                                                       |
| What one drink restores (60% of maximum)      | **provisional** — set 2026-08-20 | `src/hunt/config.ts` — `FLASK_HEAL_PERCENT`, a proportion in 0..1; the amount is computed by `src/hunt/flask.ts` — `flaskHealAmount`, its only reader | **Developer** — transcribed from `hybrid-design.md` version-4-scope §2, never played |
| Charges held, and the figure a boss refills to | **provisional** — set 2026-08-20 | `src/hunt/config.ts` — `FLASK_STARTING_CHARGES`, **one key for both** so the run's full-flask figure is stated once | **Developer** — the design defers re-tuning it "only if it plays too thin", so it is deferred rather than undecided |
| A stage-boss kill refills it; an ordinary kill does not | settled — since DLR-93  | `src/hunt/runTransitions.ts` — the private `flaskAfter`, inside `recordEncounter` (not `advanceRun`, which never runs for the final fight of a won run); it reads `runEncounterAt(...).kind === OpponentKind.Boss` | —                                                       |
| The refill is unconditional on what you held  | settled — since DLR-93           | `src/hunt/runTransitions.ts` — `flaskAfter` returns the configured figure rather than incrementing, so 0 and 1 both become 1 and no second charge can bank | —                                                       |
| Drinking is refused, empty flask named first  | settled — since DLR-93           | `src/hunt/flask.ts` — `flaskRefusalFor` tests charges before full health, mirroring `refusalFor`'s durable-reason-first order; worded by `src/app/run/shopLabels.ts` — `FLASK_REFUSAL_MESSAGE` | Developer — the wording                                 |
| It can only be drunk between fights           | settled — since DLR-93           | `src/App.tsx` — the control renders only under `RunPhase.Shop`; `drinkFlask` also throws on an unresolved encounter, so a driver bug is loud rather than a mid-hand heal | —                                                       |
| It is never sold, and never on a shelf        | settled — since DLR-93           | nothing to enforce — no `ShopItem` member exists for it, so `priceOf`, `categoryOf` and `PurchaseRefusal` are untouched; the control is a separate block in `src/app/run/ShopPanel.tsx` | —                                                       |
| Free reads as free, without colour            | settled — since DLR-93           | `src/app/run/shopLabels.ts` — `SHOP_FLASK_FREE_TAG` / `SHOP_FLASK_NO_COIN` as words, an icon-led button rather than a text card, its own zone above the tablist, and a purse cell counting charges | Developer — every word of it is placeholder, and "Flask" is an unsettled name |
| Nothing shows the flask during a fight        | **not built** — deliberately     | nothing — the shop screen is its only surface, exactly as with the Poison Guard and the Whetstone                                 | **Developer** — the same call as the two rows like it   |
| A refused purchase states its reason          | settled                          | `src/hunt/shop.ts` — `refusalFor`; worded by `src/app/run/shopLabels.ts` — `PURCHASE_REFUSAL_MESSAGE`                            | Developer — the wording                                 |
| The durable reason wins over the coin check   | settled                          | `src/hunt/shop.ts` — `refusalFor` tests slots and health **before** the balance                                                  | —                                                       |
| A heal at full health is refused, not sold    | settled — this game's own rule   | `src/hunt/shop.ts` — `PurchaseRefusal.AlreadyFullHealth`; the ticket did not state it                                            | Developer — selling it and discarding is the alternative |
| Buy nothing, or buy repeatedly while you can  | settled                          | nothing to enforce — leaving is always offered, and `buyFromShop` is a plain transition with no per-visit cap                    | —                                                       |
| Leaving the shop starts the next fight        | settled                          | `src/App.tsx` — `leaveForNextFight`, the one call to `advanceRun`, reached from all three forward controls                       | Developer — whether `Escape` should do this             |
| Nothing in the shop reduces skull density     | settled — ruled out              | nothing to enforce — no key, no item, and no code path touches `SKULL_DENSITY` or the curves                                     | —                                                       |
| Coins carrying between runs                   | **not built**                    | nothing is persisted anywhere; `startRun` seeds `coins: 0`                                                                       | Developer — a later ticket                              |
| Forage                                        | **not built**                    | `src/hunt/config.ts` — `FORAGE_BUDGET_PER_ENCOUNTER` (no consumer)                                                               | Developer — budget is provisional                       |
| The run — a sequence of encounters            | settled — since DLR-82           | `src/hunt/run.ts` — `RunState`, `startRun`; `src/hunt/runTransitions.ts` — `advanceRun`; driven by `src/App.tsx`                                                | —                                                       |
| Health carried fight to fight, no restore     | settled                          | `src/hunt/runTransitions.ts` — `advanceRun` passes `encounter.health[Player]` into `startEncounter`                                         | —                                                       |
| Your health emptying ends the run             | settled                          | `src/hunt/runTransitions.ts` — `outcomeFor` checks the Quarry's win before the last-fight case                                             | —                                                       |
| Winning the last fight wins the run           | settled                          | `src/hunt/runTransitions.ts` — `outcomeFor`'s `encounterIndex === encounterCount - 1`                                                       | —                                                       |
| The opponents' health (10…86; bosses 39…135)  | **provisional** — set 2026-08-17 | `src/hunt/config.ts` — generated by `buildRunEncounters` from `ORDINARY_HEALTH_BASE` (10), `ORDINARY_HEALTH_STEP` (4) and `BOSS_HEALTH_MULTIPLIER` (1.5); projected into `QUARRY_ENCOUNTER_HEALTH` | **Developer** — the multiplier is the one number nobody chose, and whether a formula beats 25 literals is open |
| The run is not winnable as configured         | **provisional** — accepted       | nothing to enforce — Oisín holds 86 and Diarmuid 135 against a `PLAYER_START_HEALTH` of 10; DLR-82 ruled the answer is the shop, **not** a bigger bar | Developer — `YOU WIN` is unreachable in play until the curve or the upgrades move |
| Run length (25)                               | settled — derived, not chosen    | `src/hunt/config.ts` — `ENCOUNTERS_PER_RUN` is `QUARRY_ENCOUNTER_HEALTH.length`, itself a projection of `RUN_ENCOUNTERS`          | — (add a roster name to add a fight)                    |
| The run's sequence has ONE source             | settled — since DLR-85           | `src/hunt/config.ts` — `RUN_ENCOUNTERS` is authoritative and **must stay declared above** the `QUARRY_ENCOUNTER_HEALTH` projection that reads it at module init | —                          |
| Stage count derived from boss position        | settled — since DLR-85           | `src/hunt/runPath.ts` — `runPath` closes a stage at each `OpponentKind.Boss`; no stage count appears in it, and it never reads `ORDINARY_PER_STAGE` | —                                       |
| Ordinary opponents per stage (4)              | **provisional** — from a sketch  | `src/hunt/config.ts` — `ORDINARY_PER_STAGE`, read only by `buildRunEncounters`                                                    | Developer                                               |
| Every opponent has a name                     | settled — since DLR-85           | `src/hunt/config.ts` — `ORDINARY_OPPONENT_NAMES` (20), `STAGE_BOSS_NAMES` (5); read via `runEncounterAt`                          | Developer — the names themselves                        |
| A boss is health and a mark, nothing more     | settled — deliberately minimal   | nothing to enforce — `OpponentKind` feeds only the map's glyph and the health formula; no game rule reads it                       | **Developer — a final-boss ticket** (Diarmuid should ignore follow-suit) |
| The start screen precedes the first fight     | settled — since DLR-85           | `src/App.tsx` — `RunPhase.Start`, the initial state, checked before every other branch; drawn by `src/app/run/RunPathScreen.tsx`  | Developer — all of its copy                             |
| The map is reachable between fights           | settled — since DLR-85           | `src/App.tsx` — `RunPhase.Map`, entered from `RunOutcomePanel.tsx`'s third control; the **same** `RunPathScreen` the start screen uses | Developer — whether it earns the extra click        |
| Beaten opponents struck out, still on the path | settled — since DLR-85          | `src/hunt/runPath.ts` — `PathNodeStatus.Beaten`; drawn as an `<s>` element by `src/app/run/RunMap.tsx`, so it reads without colour | —                                                       |
| The next opponent marked out from those beyond | settled — since DLR-85          | `src/hunt/runPath.ts` — `PathNodeStatus.Current`, at most one; `aria-current="step"` plus a caret and a taller glyph in `runMap.css` | —                                                  |
| Nothing on the path is clickable              | settled — no route choice        | `src/app/run/RunMap.tsx` — an `<ol>` of `<li>`s with zero tab stops, pinned by a spec; branching is out of scope                   | Developer — if route choice is ever wanted              |
| **The path fits the viewport**                | **NOT MET** — crops below ~1088px | `src/app/run/run.css` — `.run-shell` is `overflow: hidden`, so the path is **cropped, not scrolled**: 21/25 nodes at 1024×768, 14/25 at 500×844 | **Developer** — name size, name angle, or a scrolling path region |
| Losing returns to the start screen            | settled — since DLR-85           | `src/App.tsx` — `handleNewRun` sets `RunPhase.Start`; the path resets by construction, because `startRun` returns `encounterIndex: 0` | —                                                  |
| Forward controls name their opponent          | settled — since DLR-85           | `src/app/run/runLabels.ts` — `fightLabel`, one function read by the start screen, the verdict and the shop; `CONTINUE_LABEL` was deleted | Developer — the wording                          |
| The end-of-fight verdict screen               | settled                          | `src/app/run/RunOutcomePanel.tsx`; copy in `src/app/run/runLabels.ts`                                                            | Developer — all wording, and whether it reads as unmissable |
| The verdict names the opponent just beaten    | settled — since DLR-85           | `src/app/run/runLabels.ts` — `runHeadline(outcome, beatenName)`; only the intermediate-win case takes a name, so `YOU WIN`/`YOU LOSE` stay run-level | Developer — whether "<name> defeated" lands as a win |
| Which fight, and against whom                 | settled — named since DLR-85     | `src/app/run/runLabels.ts` — `runPositionLabel`, built on `runProgressText`; rendered by `src/app/warCouncil/RoundStatusBand.tsx`'s `.wc-run` block | —                                     |
| Every opponent plays identically              | settled — health and name only   | nothing to enforce — no game rule reads `OpponentKind` or an opponent's name; `SLICE_QUARRY_CHARACTER` is still the one *character* the felt shows | Developer — powers are a final-boss ticket   |
| The health bar names the opponent             | settled — since 2026-08-17        | `src/app/warCouncil/labels.ts` — `quarryHealthLabel(name)`; threaded from `src/App.tsx` as a pre-worded string, like `runLabel`. `HEALTH_BAR_LABEL[Quarry]` is now only the unnamed fallback | Developer — the possessive wording |
| The dossier still says "The Monarch"          | **open** — the remaining seam     | `src/hunt/quarryCharacters.ts` — `QUARRY_CHARACTERS`; rendered by `src/app/warCouncil/QuarryDossier.tsx`, with "What the Quarry holds" beside it | **Developer** — accept the seam for a release, or pull the follow-on in |
| Envenom — a charge bought, not spent on buying | settled — since DLR-90 | `src/hunt/run.ts` — `RunState.envenomCharges`, credited by `runTransitions.ts`'s `buyFromShop`'s `ShopItem.Envenom` arm and carried by `advanceRun`'s spread | — |
| Its price (2 coins) | **provisional** — transcribed | `src/hunt/config.ts` — `ENVENOM_PRICE`; read by `priceOf` | Developer — from `version-4-scope.md`, not derived; **unmeasured in play** |
| No cap on charges held | settled | `src/hunt/shop.ts` — `refusalFor` has **no** Envenom clause, so it falls through to the coin check | Developer — a cap is a key, one clause and one code |
| Three taps to mark: select, arm, then a card | **open** — a feel question | `src/app/warCouncil/roundUiState.ts` — `EnvenomStage`; cycled by `roundReducer.ts`'s `handleTapEnvenom`, drawn by `EnvenomCharge.tsx` | **Developer** — one tap to arm makes marking two, but puts an irreversible mark one misclick away |
| A third tap on the plate refunds the charge | settled | `src/app/warCouncil/roundReducer.ts` — `handleTapEnvenom`'s third branch; `CancelEnvenom` and `Escape` do the same | — |
| Every card in hand is markable while armed | settled — including illegal ones | `src/app/warCouncil/HandFan.tsx` — `illegal` and `isFocusable` both widen under `envenomArmed`, so the tappable and focusable sets cannot drift | — |
| Marking is not a move, and never plays a card | settled | `src/app/warCouncil/roundReducer.ts` — `handleTapCard` routes to `commitEnvenom` before the play branch | — |
| Envenom and a Cheat cannot both be armed | settled | `src/app/warCouncil/roundReducer.ts` — each poise branch clears the other's selection, and `commit`'s `settled` object clears both | — |
| The mark is drawn wherever the card renders | settled — all four surfaces | `src/app/warCouncil/PlayingCard.tsx` — the `envenomed` prop; threaded by `HandFan`, `TrickWell`, `AbilityPrompt` and `DecreePile` (the last **fixed in review**, having been built and never passed) | Developer — the glyph and its colour are placeholders |
| A poisoned trick resolves by the normal rules | settled | `src/warCouncil/playCard.ts` — it reports `trickIsEnvenomed` as a fact and judges none of it; the winner and the bank are decided as ever | — |
| A poisoned clean loss is replaced, not added to | settled | `src/warCouncil/bank.ts` — `resolveTrickBank`'s `replaced` flag skips the hit half, so damage and cash-out stay 0 and bank/multiplier pass through | — |
| …and a **dodge** is deliberately not replaced | settled — the outcome, not the winner | `src/warCouncil/bank.ts` — keyed on `TrickOutcome.CleanLoss`; a Dodge is a Quarry win the player **banks**, so replacing it would delete an earned bank | Developer — the free-bonus interaction it creates |
| A poisoned skull trick you win still costs it | settled — the harshest reading | nothing suppresses it — the override waives only the clean loss, so `SkullWin` resolves in full | **Developer** — no design document covers this case |
| The delayed hit follows the trick's winner | settled — no branch, but **no longer symmetric** | `src/warCouncil/bank.ts` — `TrickResolution.envenomTarget`, typed `DuelSide` because this module is already the one seat → side crossing | — |
| Its amount — 4 to the Quarry, 2 to the player | **provisional** — split 2026-08-19 | `src/hunt/config.ts` — `ENVENOM_QUARRY_DAMAGE` (4, transcribed) and `ENVENOM_PLAYER_DAMAGE` (2, **the developer's own**); which side owes which is decided once by `encounter.ts`'s private `envenomDamageFor`, read by `queueEnvenom` | **Developer** — the player-side figure is a choice, not a transcription, and 2-and-3 is unmeasured in play |
| It lands at the resolution of the NEXT trick | settled — retimed 2026-08-19 | `src/app/warCouncil/roundReducer.ts` — `poisonOptions` reads `encounter.pendingEnvenom` into `playCard`, and `applyResolution` pays, clears and re-books in that order; folded into the trick's own damage by `src/warCouncil/bank.ts` — `resolveTrickBank`. It landed at the next hand's deal until this date | — |
| A poisoned last trick carries into the next hand | settled | `src/hunt/types.ts` — the queue hangs off `EncounterState`, which outlives a hand; nothing at a hand boundary reads or clears it | — |
| Your share of the hit cashes out your streak | settled — since 2026-08-19, at **two-thirds** since DLR-94 | `src/warCouncil/bank.ts` — `resolveTrickBank`'s cash-out branch has a **second trigger**, `poisonToPlayer > 0 && !poisonGuarded`, reaching the same statement a lost trick reaches — and therefore the same `forcedCashValue` reduction | Developer — the reading that poison pays the reduced rate rather than full |
| A poisoned trick you win banks BEFORE it cashes | settled — a chosen reading | `src/warCouncil/bank.ts` — the `isTaken` climb runs above the cash-out branch, so a streak of 4 winning trick 5 cashes 25 rather than 16 | Developer — reversing it is one line, and a different feel |
| The Quarry's share never touches a bank | settled | `src/warCouncil/bank.ts` — `poisonToQuarry` rides on `TrickResolution` and is summed into the Quarry's total by `incomingFrom`; the Quarry holds no bank or multiplier at all | — |
| Two poisoned tricks both land | settled | `src/hunt/types.ts` — `EncounterState.pendingEnvenom` is a per-side `IncomingDamage` **accumulator**, not a single side | — |
| Two marks in ONE trick still owe one hit | settled — a predicate, not a count | `src/warCouncil/envenom.ts` — `trickIsEnvenomed` is a boolean over the trick | Developer — a count instead of a predicate is a small follow-up |
| A delayed hit can kill, and end the run | settled | `src/hunt/encounter.ts` — the hit goes through the same `applyDamage`/`resolveWinner` as any other damage, and `src/hunt/runTransitions.ts` — `outcomeFor` re-derives the run's end from the result | — |
| A queued hit dies with the fight | settled | `src/hunt/encounter.ts` — `startEncounter` seeds `pendingEnvenom` to zeros and `advanceRun`/`startRun` both route through it; `queueEnvenom` also refuses a resolved encounter | — |
| Nothing announces the delayed hit landing | **not built** — deliberately | nothing — hearts and the streak simply drop mid-hand, and nothing showed the poison was pending either | **Developer** — a mount prop plus a hint line (~15 lines), or a beat on the status band |
| Poison Guard — bought, and live for one fight | settled — since 2026-08-19 | `src/hunt/run.ts` — `RunState.poisonGuardHeld`, set by `runTransitions.ts`'s `buyFromShop`, carried by `advanceRun`'s spread and cleared by its private `guardAfter` the moment the encounter resolves | — |
| Its price (1 coin) | **provisional** — transcribed | `src/hunt/config.ts` — `POISON_GUARD_PRICE`; read by `priceOf`. Its own key, level with `HEAL_PRICE` | Developer — from `version-4-scope.md`, not derived; **unmeasured in play** |
| It sits on the fight-long shelf | settled — since 2026-08-19 | `src/hunt/shop.ts` — `categoryOf` returns `ShopCategory.FightLong`; `SHOP_ITEMS_BY_CATEGORY` derives the shelf at module load, so the screen needed no edit | — |
| Only one may be held at a time | settled | `src/hunt/shop.ts` — `PurchaseRefusal.GuardAlreadyActive`, returned by `refusalFor` before the coin check; worded by `src/app/run/shopLabels.ts` | Developer — a count instead of a flag is a small change |
| It suppresses the poison reset only | settled | `src/warCouncil/bank.ts` — `poisonGuarded` gates the poison trigger and not `trickHit`, so a lost trick still resets the streak and does not spend the Guard | — |
| It is spent whenever it fires, streak or not | settled — AC4 read literally | `src/warCouncil/bank.ts` — `TrickResolution.poisonGuardSpent`; flipped by `src/app/warCouncil/roundReducer.ts` at both settle points | — |
| It does nothing on the Quarry-side hit | settled | nothing to enforce — `poisonGuarded` is read only against `poisonToPlayer` | — |
| Nothing shows a held Guard during a fight | **not built** — deliberately | nothing — `src/app/run/ShopPanel.tsx`'s purse cell is its only surface, and the felt renders none of it | **Developer** — the same call as the announcement row above |
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

**What the developer owns:** how many Cheats a run starts with (2 when this shipped; **set to 0 on
2026-08-17**), every word of
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

### The run got a shape — DLR-85, 2026-08-17

**What a player does now that they did not before:** **sees where they are going.** Until now the run's
length was a number on a status band — "Fight 1 of 3" — and the opponents were anonymous. The game now
opens on the whole path, drawn: twenty ticks and five blocks in the order you will meet them, everyone
named, the goal stated in words, and one button that names who is first. The path is reachable again
between every fight, with what you have beaten struck out and still on it.

**The run went from three fights to twenty-five**, and that was a deliberate widening of the ticket's own
scope, taken on the developer's ruling: the map exists to make the run's shape legible, and a three-node
path shows no shape. Four ordinary opponents then a stage boss, five times over, closing on Diarmuid.

**Naming spread to four surfaces in one pass**, because a named map beside an unnamed verdict reads as two
different games — the verdict headline, the verdict's forward control, the shop's leave button and the
fight counter all name the opponent now.

**What is gone:** the word "Continue" from the verdict's forward control, which now reads `Fight <name>`.
No rule was removed and nothing was deferred to make room.

**Engine and screen landed together.** Every rule in
[section 10](#10-between-hands-and-the-run) that is not marked **[not built]** is reachable by playing —
the start screen, the map, the naming, and the return to the start screen on a loss were all confirmed in
a running browser, including a run played to a real loss and restarted.

**One structural rule is worth carrying forward:** the run's sequence has **one source**,
`RUN_ENCOUNTERS`, and the health array is a projection of it. That is why growing the run from three
fights to twenty-five needed no test to change. The stages are **derived from where the bosses sit**, so
neither a stage count nor a per-stage figure appears anywhere in the code.

**Two things did not land, and both are on the record rather than hidden.** The run is **not winnable** on
today's curve, so `YOU WIN` cannot be reached by playing — DLR-82's ruling that the answer is the shop
rather than a bigger health bar still stands. And **the path does not fit a viewport narrower than about
1088px**: it is cropped rather than scrolled, silently, which is the first acceptance criterion in this
epic to ship unmet.

**What the developer owns:** the boss health multiplier (the one number in the change nobody chose) and
whether a formula is the right shape for twenty-five health figures at all; the fix for the crop — a
smaller name size, a steeper name angle, or letting the path scroll sideways; every word of the new copy,
including whether `Fight Aoife` or `Begin run` is the right thing on the start screen and whether
"Aoife defeated" still lands as a win; whether the map earns the extra click; whether five stages of four
ticks and a block read as five stages **without counting**; and whether the two coexisting rosters are
tolerable for a release.

### The shop got its shelves — DLR-89, 2026-08-18

**A rearrangement, not a rule change.** The shop's two items were laid out on a **four-shelf ladder
sorted by how long a purchase lasts** — one-time use, fight-long, run-permanent, game-permanent — browsed
one shelf at a time. The Cheat is on one-time use, the shelf you arrive on. Fight-long and run-permanent
are empty and say so. Game-permanent cannot be opened and states "Coming soon.". The heal left the
shelves entirely for its own "Also for sale" block, because an instant transfer has no duration to sort
on.

**Nothing a player can buy, pay, or be refused changed**, and that was the constraint the whole ticket
was built around: the eleven existing shop-screen specs pass **unedited**, which is the evidence. What
changed is what the shop *looks like it will become* — the empty shelves are the point, not a gap, and
the refused fourth one exists so that the finished shape reads before the items that fill it do.

Two decisions worth recording. **The four names are this game's own** rather than Balatro's deck /
Joker / consumable, because there is no deck-building layer here for those words to sort against. And
the refused shelf is **marked out but still reachable by keyboard** rather than genuinely disabled: a
truly disabled control leaves both the tab order and the arrow keys, so the one shelf whose entire job
is to announce that something is coming would never reach the player it is announcing to.

**What the developer owns:** every one of the four shelf labels, the "Coming soon." and "Nothing on this
shelf yet." sentences, and the "Also for sale" heading — all placeholder copy; whether the refused shelf
should be genuinely `disabled` instead (reversible in one attribute); whether the open shelf should stay
selected when you leave and come back (it does not today); how much of a shelf is visible before it
scrolls; and **whether the screen still reads well now it is the tallest it has ever been** — the fix
for it fitting was a real defect fix, but the resulting tightness is an eye question.

### Envenom landed — DLR-90, 2026-08-19

> **Read this as a record of what DLR-90 shipped, not as the rules.** DLR-91 retimed the hit to the
> resolution of the **next trick**, split the amount (**4** to the Quarry, **2** to the player), and made
> the player's share **cash out the streak**. Sections 4, 7 and 8 above are current; this section is not.

**The first effect in this game that resolves later than the thing that caused it.** A third shop item at
2 coins buys a charge you carry across fights; three taps during a hand mark a card in your own hand; the
trick that card is played into resolves by the normal rules; and **4 damage lands on whoever won that
trick at the deal of the next hand.** Engine and screen landed together, and the whole loop is reachable
by playing.

**The rule that makes it worth buying is a subtraction, not an addition.** A poisoned trick the Quarry
wins **cleanly** costs the player nothing — no damage, and the bank and multiplier survive uncashed
instead of resetting. That is what turns a card you expected to throw away into a free strike. Win the
poisoned trick yourself and the 4 lands on **you**, which is the symmetric case rather than a penalty:
the hit follows the trick's winner, so there is no mirrored rule anywhere.

**Two readings were chosen where the ticket was ambiguous, and both are recorded rather than buried.**
The override is keyed on the trick's **outcome** (a clean loss) rather than on **which side won**,
because a *dodge* is also a Quarry win and it is one the player banks — the literal reading would have
deleted an earned bank. And a poisoned trick you win that is *also* a skull trick **still costs you the
skull**, which is the harshest available reading of a case no design document covers.

**The discard rules cost nothing to enforce, which was the point of where the queue lives.** It sits on
the encounter rather than the run, and the encounter's own opening seeds it to zeros — so a queued hit
cannot cross a fight and cannot cross a run. (DLR-90 also had it discarded at a **hand** boundary, because
that was where it was paid; under DLR-91 a hit booked on a hand's last trick **carries** into the next
hand's first trick instead.)

**What the developer owns:** whether **2 coins** is right against a 1-coin Cheat and 1 coin a fight;
whether **4 damage** is right; whether **three taps** to mark reads as deliberate or as fiddly; whether
the felt rail reads well with a second plate on it; whether the mark is legible at a glance and whether
it stays legible on a card also carrying a skull; the `⚗` glyph and its colour; every word of placeholder
copy; whether charges should have a **cap** (built as: no cap, coins are the limiter); whether the skull
reading above should stand; and — the largest one — **whether the delayed hit needs to announce itself.**

**It has not been played end to end.** QA drove the shop, the inert plate, the purse cell and the
`buyFromShop` fix in a real browser, but **could not earn 2 coins in five full playthroughs** before
dying — which is a datum about the price and the difficulty rather than about the item. The
purchase-to-payoff loop is proven by a mounted-component test against the real component tree with real
DOM events, and not yet by a hand on a mouse.

### The flask landed — DLR-93, 2026-08-20

**What a player does now that they did not before:** heals **without paying for it**. Every restore in
this game has cost a coin since the shop existed; the flask costs a charge instead, and a charge comes
back for beating a stage boss. So the run now has a resource that is *earned by progress* rather than
by income — the first one, and the only thing in the run that is given back rather than only spent.

**What it changes about a decision:** the shop's heal has always competed with everything else for the
same coin, and DLR-84 predicted it would win every visit. The flask does not compete with anything. What
it introduces instead is a **holding decision** — a full flask is worth 6 health whenever you want it,
so drinking early to top up a small gap wastes most of it, and the refusal at full health is the only
part of that the game enforces for you.

**What is gone:** nothing. No rule was removed or replaced, and the paid heal is untouched in price,
amount, refusal and placement.

**Engine and screen landed together**, and the drink was driven end to end in a browser rather than
proven only against the engine — which is not how the last three item tickets went, because none of
them could be afforded in a QA run. A free item cannot have that problem.

**What the developer owns:** whether **60%** is the right size; whether **one charge per stage** is
enough (the design defers this until it plays too thin); whether the potion glyph and the flask block
read at final size; whether the free-versus-paid separation actually lands at a glance; every word of
the placeholder copy; and **whether "Flask" is the name**.

**What has not been measured is the point of it.** The flask exists to answer a run recorded as
unwinnable, and nobody has yet played a run with it in. Five drinks of 6 across twenty-five fights
against opponents ending at 135 is a real change that may still be far too small, and **nothing else
was retuned in response** — deliberately, so the measurement is of the flask rather than of a rebalance
around it. Recorded under [Known tensions](#known-tensions-recorded-not-resolved).

### Known tensions, recorded not resolved

- **The shop was priced for an income that has just arrived, and nobody has played against it** (new
  2026-08-21, DLR-95). The Whetstone costs 4 coins and was priced against exactly this payout — the
  design's own answer to "the shop's best item is unreachable", after QA never afforded one in two
  full runs at 1 coin a fight. A first-hand kill can now pay up to 13 coins in a single fight. So the
  wall has moved, and the open question flipped direction: whether the shop is now **too cheap**
  rather than too dear. **No price was retuned.** The cheapest measurement is how many purchases are
  affordable at the first shop visit after a fast opening fight.
- **The reward is largest exactly when you needed it least** (new 2026-08-21, DLR-95). The payout
  counts cards you did **not** have to play, so it pays most for the fights that were already
  comfortable, and nothing for the grinding ones where coins would help most. That is the intended
  shape — it is a reward for decisive play, not a rubber band — but it compounds: a good run gets
  richer and a bad one stays poor. Whether that reads as a satisfying skill payoff or as a
  rich-get-richer spiral is a play question, not an arithmetic one.
- **"Kill on the last trick" pays nothing, and it may not feel like a taper** (new 2026-08-21,
  DLR-95). Winning on a hand's final trick leaves nothing unplayed, so it pays zero from this
  mechanic even in the fight's **first** hand — the tier was ×2, and twice nothing is nothing. That is
  the rule working as written, but it is the case most likely to read as the reward having failed to
  fire rather than as having been earned at zero. The verdict omits the clause entirely at zero,
  which helps; whether it is enough is unmeasured.
- **Apply Damage may have no wrong answer, which is the one thing it was built to avoid** (new
  2026-08-20, DLR-94). The two-thirds penalty exists to make holding a streak a bet. But the reduction is
  a *flat* third at every streak length, while the risk of being caught is not flat — it rises with each
  trick you push. If the honest play turns out to be "cash whenever the plate is live", the control is a
  chore rather than a decision, and the fraction is the dial. **The cheapest measurement is whether you
  ever deliberately hold a bank past a trick you could have cashed it on**, and why. Nothing here has been
  played yet.
- **Two taps to spend a streak, on a rail where two other controls also take two taps** (new 2026-08-20,
  DLR-94). The poise stage guards an irreversible cash-out against a misclick, and it matches the Cheat
  and Envenom grammar. But Apply Damage is not a per-trick reflex, so the tap cost barely compounds —
  which cuts both ways: it is cheap to keep, and it is also the reason one tap would be safe enough. Only
  felt by playing.
- **A poison hit now pays a third less than it used to, and poison was already the harshest thing in the
  game** (new 2026-08-20, DLR-94). The planner's reading — that poison reaches the same forced branch and
  so pays the same reduced rate — is defensible and is what shipped. Its consequence is that the moment
  the rules call "the moment you cannot choose" also became the moment you are paid least for. Whether
  that compounds poison's existing reputation as the change most likely to read as a bug is unmeasured.
- **The Quarry's hearts drop with no beat on a voluntary apply** (new 2026-08-20, DLR-94). A trick that
  takes damage breaks hearts visibly; a voluntary apply resolves no trick, so there is nothing for the
  breaking frame to read off and the hearts simply fall. Functionally correct, possibly abrupt, and the
  fix is a second breaking-damage source rather than a tweak.
- **The felt rail now carries three plates** (new 2026-08-20, DLR-94). Cheats, Envenom and Apply Damage
  share one column. QA confirmed the page does not scroll at 1920×1080, 1440×900 or 1280×720, which is
  the checkable half; whether it *reads* as crowded at a short viewport is not, and is the developer's eye.
- **The flask is the answer to a run recorded as unwinnable, and the run has not been played with it
  in** (new 2026-08-20, DLR-93). DLR-82 named the flask as part of the fix and refused to build it
  early; it is now built, and **the curve it was meant to answer was deliberately left untouched**. Five
  drinks of 6 health across twenty-five fights, against a fight costing roughly four and opponents
  ending at 135, is a real change that may still be nowhere near large enough — or, coming free on top
  of a 4-health heal for a coin, may be more than intended. **Nobody has played it yet**, so the honest
  measurement is unchanged from DLR-82's: *how far does a run get*. Until someone takes it, this is the
  single most consequential unknown in the game.
- **A free heal has no cost to weigh, so the only decision it carries is when** (new 2026-08-20,
  DLR-93). Every other thing you can spend competes for the same coin; the flask competes with nothing.
  The one real choice it offers is **timing** — drink at 9 of 10 and five of the six points are thrown
  away, and the game only stops you at exactly full. Whether that reads as a meaningful judgement call
  or as a button you press whenever it lights up is a play observation. **The cheapest measurement is
  whether you ever deliberately hold a full flask into a fight**; if not, the charge is functionally
  automatic and might as well be the between-fight restore that is still ruled out.
- **The flask is invisible during the fight it might save you in** (new 2026-08-20, DLR-93). Its charge
  count is on the shop screen and nowhere else, so a player deciding whether to push on cannot see
  whether they have one in hand — and the moment they most want to know is mid-fight, when it is
  unreachable anyway. This is the **fourth** item whose state is legible only where it is bought, after
  the Poison Guard, the Whetstone and pending poison. No rule required a readout, so none was invented,
  but the pattern is now a habit rather than a one-off.
- **A boss kill refills to exactly one, so a boss beaten on a full flask gives nothing** (new
  2026-08-20, DLR-93). The refill sets the count rather than adding to it, deliberately — there is
  never a second charge banked. The consequence is a small perverse incentive: drinking a nearly-wasted
  flask *before* a boss fight is strictly better than carrying a full one into it, since the refill
  would otherwise be worth nothing. Whether that is a nice bit of planning or an accident to close is
  unjudged, and it is the same shape as the Poison Guard's accepted oddity below.
- **The strongest item in the shop costs four times what a fight pays, and nobody has yet bought one**
  (new 2026-08-19, DLR-92). A Whetstone is 4 coins against **1 coin per fight won**, so on flat winnings it
  is four fights of saving while the run is expected to end in its first or second stage. QA played two full
  runs, reached the shop, and **never got past 2 coins** — which is the same wall DLR-90 hit at 2 coins for
  Envenom, one item further out. The design's answer is the **quick-kill payout** (a fast fight paying more
  than a coin), which is a separate ticket and **is not built** — so today the item is priced for an income
  that does not exist yet. The consequence worth naming: **the shop's most interesting purchase is
  currently its least reachable**, and the two cheap items already predicted to win every visit sit in front
  of it. `WHETSTONE_PRICE` is its own key, so re-pricing is one line — but the honest fix is probably the
  payout, not the price.
- **Stacking has no cap and no price curve, so a long run's ceiling is unbounded** (new 2026-08-19,
  DLR-92). Each copy adds another +1 flat, at the same flat 4 coins, and nothing limits how many you own.
  Three copies quadruple the whole cash-out curve — a six-trick hand pays 144. Whether that is the intended
  power fantasy or a curve that breaks the late run only shows in a run long enough to afford several, which
  **no session has reached**. The two levers are a cap (a `refusalFor` clause and a reason code) or a price
  that climbs per copy; neither is built and neither is designed.
- **Nothing on the felt says the bank is climbing faster** (new 2026-08-19, DLR-92). The bank meter shows
  the running total and the multiplier, so a player who owns two Whetstones sees the bank jump by 3 a trick
  with **nothing naming why** — the only surface stating what they own is the shop's purse cell, which is
  not on screen during a fight. This is the same shape of gap already recorded for poison and the Poison
  Guard below, and it is now the third item whose effect is legible only through its consequences. No rule
  required a readout, so none was invented.
- **Holding a Poison Guard can cost you health, which is the opposite of how insurance reads** (new
  2026-08-19, DLR-91; **accepted, not open**). The Guard suppresses the poison-driven cash-out — so the
  cash-out does not happen — so a Quarry that would have died to it **survives**. And under the
  Quarry-first ordering (section 8), a Quarry that survives is a Quarry that lets your damage through. So
  there are positions where **buying the Guard strictly loses you 2 health** you would otherwise have
  dodged, and the correct play is not to hold one. Nothing on screen hints at it and no hint is designed.
  The developer accepted this as a real decision rather than smoothing it out — *"that's fine, this is
  just a play test for buying items from the shop."* **The cheapest measurement is whether it ever bites
  you and whether you notice why.**
- **Poison is legible only through its effects, and DLR-91 made that worse before it made it better**
  (new 2026-08-19, DLR-90; **sharpened by DLR-91**). Three things are invisible: **pending poison** never
  appears on the felt, a **held Guard** never appears during a fight, and **the moment poison fires** shows
  as hearts disappearing plus a streak that vanished, with nothing naming the cause. When the hit landed at
  the deal of the next hand that was survivable, because the drop coincided with a visible boundary.
  Landing it **mid-hand** removes even that, and it now takes a streak with it — so the single most
  expensive event in a hand is also the least explained. No rule required a surface and choosing one is a
  judgement call, so none was invented. The costed options are **one mount prop plus a line in the hint
  cascade** (~15 lines) or **a beat on the status band**. Until one lands, the mechanic is at its least
  legible exactly when it matters most.
- **Two poisoned cards in one trick owe one hit, and that is a predicate rather than a decision** (new
  2026-08-19, DLR-91). Poison stacks across *separate* poisoned tricks, which is the case the developer was
  asked about and answered. But a trick is only ever "poisoned or not" — nothing counts the marks in it — so
  spending two charges on two cards that meet in the same trick wastes one. Whether that should owe double
  is a count instead of a predicate, and a small follow-up either way.
- **A cash-out that kills the Quarry is now strictly better than it was, and nothing was retuned** (new
  2026-08-19, DLR-91). Mutual kills used to lose the run; they now win the fight. That makes the game
  measurably easier at exactly the moments that were previously fatal, and no health total, damage figure
  or Quarry curve moved in response — by decision, so that it is a choice rather than a side effect. **The
  measurement is whether a fight ever felt like it should have killed you and did not.**
- **A dodge on a poisoned trick is a free bonus nobody designed** (new 2026-08-19, DLR-90). Poison waives
  the *clean loss*, deliberately, because a dodge is a Quarry win the player **banks** and replacing it
  would delete an earned bank. The consequence is that poisoning a card and then dodging with it **banks
  the trick, keeps the streak, and still bills the Quarry 4** — strictly better than either outcome alone,
  for a card played expecting to lose. It falls out of two correct rules rather than from a decision.
  Whether that is a nice discovery or an accident to close is unjudged.
- **Two prices now compete for the same coin, and one of them was already predicted to win** (new
  2026-08-19, DLR-90). DLR-84 already recorded the expectation that **Heal is bought every visit**,
  because a guaranteed 4 health beats a rule-break you may not need. Envenom is **twice the price** of
  either existing item, and QA could not reach 2 coins in five playthroughs. So the item most likely to
  go unbought is the one that just shipped, and the fix — if it needs one — is a price rather than a
  mechanic. **`ENVENOM_PRICE` and `HEAL_PRICE` are separate keys**, so it is one line either way.
- **The shop screen is at the edge of its viewport, and getting there took three attempts** (new
  2026-08-18, DLR-89). The tab row pushed the shop's content past the height of the window, and because
  the shell crops rather than scrolls, **the button that leaves the shop was drawn off the bottom of the
  screen** — leaving `Escape`, which is nowhere on screen, as the only way out. It is fixed, and now sits
  on screen with room to spare at every size measured (including one narrower than any originally
  tested). But the shop now spends its whole height budget: the shelf itself yields space and scrolls to
  keep the exit visible, and at a short window that shelf shows part of one card. **Every list in this
  shop is expected to grow**, so the next few items will press on this again. The tension is that the
  screen's structure is now correct while its proportions are unjudged.
- **The path is cropped, not scrolled, and nothing tells you** (new 2026-08-17, DLR-85). Below roughly
  1088px of width the opponents at the end of the run are not drawn at all — 21 of 25 at 1024×768, 14 of
  25 at a phone width, where the title and the button are cut off too. The shell is `overflow: hidden`, so
  there is no scrollbar and no visual edge to suggest anything is missing: **a player at a narrow window
  would believe the run ends at Clodagh.** This is the sharpest kind of layout failure — silent — and it
  was invisible until the path was fixed to draw horizontally at all, because the broken vertical layout
  happened to be more compact. The three exits are a smaller name size, a steeper name angle, or letting
  the path itself be the one region that scrolls sideways. **All three are tuning decisions, so nothing
  was chosen.**
- **The player sees two different names for the same opponent** (new 2026-08-17, DLR-85; **narrowed the
  same day**). The map, the verdict, the shop, the fight counter **and now the health bar** say "Aoife";
  the dossier still says "The Monarch", and the readout beside it still says "What the Quarry holds". Both
  are on screen during the same fight. The health bar was the most prominent half and is closed; what is
  left is the dossier, which is where a player looks to find out **who** they are fighting — so the seam
  is narrower but sits in the worst remaining place. Closing it or accepting it for a release is the
  developer's call.
- **Twenty-five names buy nothing mechanically, and cost what the old names taught** (new 2026-08-17,
  DLR-85). Swan, Fox, Woodcutter, Witch and Monarch were free to teach, because they name cards the player
  already reads; Aoife and Diarmuid are twenty-five strings to learn that carry no rule. The trade was
  made knowingly, for a run whose shape can be seen — but if the names never come to mean anything (no
  power, no tell, no reason to remember which is which), they are decoration on a number. **What would
  settle it is a boss that plays differently**, which is a later ticket.
- **A twenty-five-fight run that ends in stage one may read as failure rather than as a run** (new
  2026-08-17, DLR-85). The path now shows the player exactly how far they did not get. That is the point
  of drawing it — and it is also the risk: seeing twenty-one untouched opponents behind a loss at fight
  four is either motivating or dispiriting, and which one it is cannot be argued from the page. **The
  cheapest measurement is whether you wanted to press "Start a new run" immediately.**
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
- **The run is expected to be lost in the first stage or two, and that is shipped knowingly** (new
  2026-08-15, DLR-82; **restated 2026-08-17, DLR-85** — the run is now twenty-five fights rather than
  three, so the loss is expected in stage one or two rather than "around fight three", and the sums are
  further apart, not closer: Oisín holds 86 and Diarmuid 135). A fight costs the player roughly four
  health; the player starts with ten and gets nothing back. Twenty-five rising health totals against ten
  therefore do not add up, and the ticket says so outright: the arithmetic is working, and the gap is what a shop, an upgrade and a
  flask exist to close. **Updated 2026-08-16, DLR-84: the shop now exists and the curve was left
  alone deliberately.** A coin a fight buys back 4 health, against a fight costing about four — so a
  player spending everything on health roughly breaks even, and the gap is closed only if they were
  going to win anyway. **Updated 2026-08-20, DLR-93: the flask now exists too, and the curve was
  again left alone deliberately** — a free 6 health once per stage is the second of the two named
  answers landing, and the two obvious rule changes (raise starting health, wire up the automatic
  between-fight restore) remain explicitly ruled out. Upgrades that raise the player's damage are
  partly built (Envenom, the Whetstone) and both are priced out of reach on today's income. The honest
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
