# The Hunt — play-test feedback (sessions 1–4, from 2026-08-10)

The developer's first play of The Hunt itself, as opposed to a reference game. Recorded
**retrospectively on 2026-08-12** from the session transcript, because it was never written down at
the time.

**Why that matters more than a missing file.** Three of the four things the developer _proposed_ that
evening became tickets within the hour and are now in the design and on disk. The two things they
_observed_ went nowhere. That is exactly the failure Rosewater's lesson #19 warns about — his rule is
that players recognise problems accurately and solve them badly, so playtest feedback should be read
as **diagnosis, never prescription** (`../design-principles.md` §2). The record kept the
prescriptions and lost the diagnosis. This file exists to put the diagnosis back.

**Scope and ownership.** This file owns _observed feedback on The Hunt_, and only that. It is not the
ruleset ([`../../game_rules/the-hunt.md`](../../game_rules/the-hunt.md)), not the reasoning
([`hybrid-design.md`](./hybrid-design.md)), not what the code does
([`../../implementation/`](../../implementation/)), and not notes on somebody else's game — those are
[`balatro-play-notes.md`](./balatro-play-notes.md) and
[`forbidden-solitaire-play-notes.md`](./forbidden-solitaire-play-notes.md), both of which record
sessions playing _published_ games. Nothing from any of those files is restated here.

**Nothing here is a decision.** The session produced proposals about multiplier brackets, how often a
path may be chosen, and card presentation — all tuning and visual calls that `CLAUDE.md` reserves for
the developer. Where this file names a number, it is quoting the session, not ratifying it.

**Provenance.** Session `1d90e186-348d-4ffe-95c6-9b8d5bebef5a`, 2026-08-10, 20:41–21:13 BST, eight
messages. The app was launched in the preceding session (`04a24df9`, 19:25 — _"get it runningg for
me"_). Quotations are verbatim, including typos.

---

## Part 1 — the session, as observed

### What was actually on screen

The play happened at **20:41–21:13**, between commit `5427314` (16:03) and `3a1ed97` "First game"
(22:05) — so the working tree of that afternoon, one ticket after DLR-53 put the Hunt screen up. What
existed: the 33-card deal, follow-suit legality, the seven named ranks and their abilities, trick
resolution, a Quarry with the Monarch rule-break and its telegraph, Spoils, the Standing multiplier,
and a Demand target to clear.

What did **not** exist, and bears directly on both observations below: no declaration (it was
invented in this session), no health, no damage, no pending anything. One Hunt, played to a target.

### The diagnosis — two observations, and a benchmark

> **1.** "I feel like it's hard to get a handle on what I should I shouldn't be trying to do, it's
> not clear what a good decision is"

> **2.** "and there's no good feedback each time I lay a card, like in balator"

> **3.** "well it should play similar to the first hand of a fresh anti in balatore, and I don't
> think it does."

Observation 3 is the useful one to keep as a **benchmark** rather than as a complaint: the stated
target is the felt quality of the opening hand of a fresh ante in Balatro, and the stated verdict is
that The Hunt did not reach it. It is the only comparative measurement the session produced, and it
has never been re-run.

### The prescriptions — four, offered in the same session

4. **Declare a path after seeing the hand.** "the player should get a look at their hand and declare
   which path they want to go down, taking trumps or losing trumps. We assign values to the cards.
   1-11, chose win and the values stay, chose lose and the invert." On Lose, the tricks you shed are
   effectively won — you take those cards and their values. "The multiplier is also set by the chose
   of win/ lose, lose the higer muliter is 0-3, then we reduce for each bracket until getting to a
   low multipleir."
5. **Keep the greedy Lose path, but ration it.** "maybe we could make teh losing path a stronger
   path, but we limit the amount of times the playre can chose it, like how discard is limited."
   Offered against advice — "I get what you are saying and it's right, however I don't want to dicard
   the greedy path just yet, maybe we can get some good design out of it?"
6. **Hand presentation.** "To order the cards by suit then number and. move the icon to the bottom
   left and put a color border around the cards to match the suit."
7. **A scope observation, worth keeping.** "Right now we only can play 1 hand, so the choice would be
   binary and reset right? The Demand doesn't go up?" — correctly noticing that with a single Hunt,
   the declaration has no escalation behind it.

### What the session got right, mechanically

Two things, credited because they are method rather than luck.

- **The diagnosis was accurate and it was separable.** Two distinct failures — an unclear objective
  and an absent per-action readout — were named separately rather than fused into "it isn't fun."
  Both survive as live problems eleven days later, which is the test of a real observation.
- **It asked about iteration order before changing anything**: "would you recommand trying them all
  at once or 1 by 1?" Schell's _rule of the loop_ — the more times you test and revise, the better
  the game gets (`../design-principles.md` §1) — is the whole justification for that question, and
  four simultaneous changes would have made the next play unattributable.

---

## Part 2 — where each item landed

| #    | From the session                                                                                   | Status today                                                                                                                                                                                          | Where                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 4    | Declare Win/Lose after the deal; values 1–11 inverting on Lose; declaration selects the multiplier | **Built, and now the design's spine.** Shipped as the declare gate with `12 − r` inversion and two mirrored Standing tables selected by the declaration                                               | DLR-63 · `hybrid-design.md` §1 · `the-hunt.md` (settled) · `../../implementation/war-council/declaration-and-lose-path.md` |
| 5    | Ration the Lose path "like how discard is limited"                                                 | **Built, then retired.** Became the three-credit mechanic (`LOSE_CREDITS_PER_HUNT`, `claimLostTrick`, four guards); deleted outright by DLR-67, whose brief records that it was "replaced, not tuned" | DLR-63 → DLR-67                                                                                                            |
| 6    | Suit-then-rank hand order, icon to bottom-left, suit-coloured border                               | **Built**                                                                                                                                                                                             | DLR-63 · `../../implementation/war-council-ui/declare-gate-and-hand-order.md`                                              |
| 7    | One Hunt means the declaration has no escalation behind it                                         | **Still true, now by design.** The duel direction removed the Demand escalation entirely; the slice is deliberately one encounter                                                                     | `hybrid-design.md` §5, §9 · DLR-67                                                                                         |
| 1    | "it's not clear what a good decision is"                                                           | **Never recorded anywhere until this file.** See §3.2 — and note the twist: the fix for it is now itself under suspicion                                                                              | —                                                                                                                          |
| 2    | "there's no good feedback each time I lay a card"                                                  | **Never recorded anywhere until this file.** See §3.1                                                                                                                                                 | —                                                                                                                          |
| 3    | The Balatro fresh-ante benchmark                                                                   | **Never recorded, never re-run**                                                                                                                                                                      | See §3.3                                                                                                                   |
| 8–13 | Session 2 (2026-08-13) — cannot steer the trick count                                              | **Open, undiagnosed before this entry**                                                                                                                                                               | See §5.1–§5.4                                                                                                              |
| 14   | "the player should always deal"                                                                    | **Recorded as a prescription, not adopted**                                                                                                                                                           | See §5.4                                                                                                                   |

The pattern in that table is worth stating plainly: **every prescription was actioned, no diagnosis
was.** Prescriptions convert into tickets and tickets leave a trail; an observation about feel has
nowhere to go unless somebody writes it down.

---

## Part 3 — the diagnosis, read against the design as it stands

Ranked by how much of the design currently rests on the answer.

### 3.1 "No good feedback each time I lay a card" — the origin sighting of this project's most-repeated failure

This is the **first** of three independent records of the same complaint, and the only one about The
Hunt itself:

| Date           | Game                | The complaint                                                                                                                                                                                  |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2026-08-10** | **The Hunt**        | **"there's no good feedback each time I lay a card"**                                                                                                                                          |
| 2026-08-12     | Forbidden Solitaire | "the damage is bult as potential damge like my game, but it's actually not clear that's happening and I can't tell that I'm going to take damage" (`forbidden-solitaire-play-notes.md` note 5) |
| —              | Balatro             | a state change the player was actively waiting for happened and did not register (`balatro-play-notes.md` note 16; a third variant in `balatro.md` §2.5)                                       |

`forbidden-solitaire-play-notes.md` §3.1 already calls this "the single thing this project's screens
are most likely to get wrong" and reaches that verdict from the two published games. **It did not
know the earliest instance was our own game.** That strengthens the finding rather than repeating it:
the failure mode was observed in The Hunt _before_ it was observed in either reference game, so it is
not a lesson borrowed from games we admire — it is a defect we already had.

**Where the design's answer stands.** §6 and §11 bet on pending damage shown on both health bars —
four figures moving on every one of thirteen tricks — with a cheaper fallback written down (show only
the net figure, one bar, one direction). Two honest qualifications:

- Nothing links that bet to this observation. §6 presents pending damage as the mechanism the duel
  direction needs, and names its own risk in feel terms; it does not cite an observed absence of
  per-trick feedback as the problem it solves.
- **No per-trick readout is built.** Damage is computed and settled (`the-hunt.md` Status register),
  but the pending-damage display is explicitly out of scope in DLR-68's plan, alongside the health
  bars themselves. So as of today the 2026-08-10 complaint is unaddressed in the app, not merely
  unrecorded.

### 3.2 "It's not clear what a good decision is" — the fix introduced a decision the design now doubts

The connection this file exists to state, because neither half is visible from the other's document.

The developer could not tell what they were trying to do, so the session invented the declaration —
choose Win or Lose after seeing your hand, and everything downstream inverts. That is a good answer
in Meier's terms: it gives the round a stated objective, and it is Knizia's "design the scoring
first" applied honestly, since the declaration reshapes every subsequent trick rather than adding a
side rule (`../design-principles.md` §2).

Then the design's own arithmetic turned on it. `ideas.md` → _The declaration as a free option_
(2026-08-11, "the session's largest finding") and _Measured: the declaration is a live 50/50 read, and
the Monarch tilts it the wrong way_ (2026-08-12) argue that the declaration may be a coin flip the
player is not equipped to make; `hybrid-design.md` §9 Problem 1 and §11's kill criterion are built
around that risk.

**So the two problems are one problem.** The cure for "I don't know what a good decision is" was a
new decision — and the open question about that new decision is, in the same words, whether the
player knows what a good one looks like. Any fix that makes the declaration readable also answers the
2026-08-10 complaint; any fix that only makes it _consequential_ does not. That distinction is not
currently drawn anywhere, and it is the one worth holding the §6 mitigations against.

There is a second-order consequence in §3.3 of `forbidden-solitaire-play-notes.md` that lands harder
now: with no teaching layer, §11's kill criterion cannot distinguish "the declaration is a bad
decision" from "the declaration was never explained." The 2026-08-10 session is evidence that a
player _who designed the game_ found the objective unclear before the declaration existed — which
says nothing about the declaration, but does say the screen has never yet succeeded at making an
objective legible.

### 3.3 The Balatro fresh-ante benchmark — one cheap comparative measurement, never repeated

"it should play similar to the first hand of a fresh anti in balatore, and I don't think it does."

The value here is that it is comparative and repeatable: play the opening hand of a fresh Balatro
ante, then play one Hunt, and answer the same question. It costs one sitting, it needs no
instrumentation, and it is the only measurement in the project's history that has been run once and
would produce a trend if run twice. It has not been re-run across the declaration, the duel
direction, or DLR-66–68.

Whether the answer is _yes_ is a feel judgement and the developer's alone.

---

## Part 4 — what to measure next

Cheapest first. All three are sittings, not instrumentation.

1. **Re-run the fresh-ante comparison** (§3.3) at the end of the current slice. It is the only
   benchmark with a prior result to compare against.
2. **Ask the 2026-08-10 question again, unprompted, after a Hunt**: can you say what you were trying
   to do, and did laying each card tell you anything? Same two questions, so the answers are
   comparable to this session.
3. **Separate the two failures in §3.2 before tuning.** Have a player declare and then say aloud
   _why_. A player who declares confidently and is then surprised by the result has a legibility
   problem in the readout; a player who cannot say why they declared at all has the §3.1 problem, and
   no amount of Quarry pressure will fix it.

**What would prove this file's main reading wrong.** §3.1 claims the per-trick feedback gap is this
project's most-repeated failure. If the pending-damage readout ships and a player who has never read
these documents can, unprompted, say whether the last card helped or hurt them, then the three
sightings were three descriptions of one missing widget rather than a standing tendency in how these
screens get built — and this file should be demoted to a historical record. §3.2's claim is
falsifiable the same way `hybrid-design.md` §11's kill criterion is, and deliberately shares it: if
the declaration reads as a genuine read rather than a coin flip, the connection drawn above cost
nothing to state and can be closed.

---

## Session 2 — 2026-08-13, the first play of the duel

> **The redesign this session produced lives in
> [`the-hunt-play-test-2-feedback.md`](./the-hunt-play-test-2-feedback.md)** — six-card hands, skulls,
> stakes, and what is deleted to get there. This section owns the **observations**; that file owns the
> **design**. Neither restates the other.

**What was on screen.** The slice as DLR-71 left it: the declare gate, both mirrored Standing tables,
the pile swap, two health bars carrying pending damage every trick, damage applied at trick 13, and an
encounter that ends. The Quarry is the Monarch with its round-long rule-break — and still the
**trick-maximising CPU**, not the band-aware one §11 names as the slice's largest unbuilt item.

This is the first session where the developer played the duel rather than a Hunt against a target, and
the first where the complaint is about **control** rather than about legibility.

### The observations, verbatim

> **8.** "I think it's too balanced, I'm playing to win and I can't land in the 7-9 range, everytime I
> think I'm about to do something good the CPU out plays me and ruins my plan."

> **9.** "The play to win/play to lose to me seems like an arbatary choice, reading the hand is too
> complex to gauge where I should aim to land, and even if I spent time trying to land in that point
> bracked I can't."

> **10.** "Once the cards get closer to 1/2 I feel like I have no choice, that it just a fore gone
> conclusion."

> **11.** "the whole they lead and I follow, if I have very little cards of that suit, so for example
> the led with bells and I had 1 bell the 8, I had no choince but to take the trick."

> **12.** "Keys are trumos and my hihgers is a 7, I don't know that playing teh 7 will let me win, and
> it didn't he had a 10, fustrated, not only do I lose I also lose the deal"

> **13.** "I'm to lead know, but since I have no idea what cards they have I'm actually frozen and
> don't konw what I shold do, what I should do isn't obvious to me."

One prescription was offered alongside them, and is recorded as a prescription per Rosewater #19:

> **14.** "maybe the player should always deal"

### 5.1 The finding: the declaration commits the player to a number the ruleset is designed to deny them

Every one of observations 8–13 is the same sentence said six ways: **I cannot steer the trick count.**

The declaration asks for a pre-commitment to a _band_ — on Win, the peak is 7–9 tricks. That is a
three-wide window out of fourteen possible outcomes. Base Fox in the Forest never asks for that
commitment: you play, you land where you land, and the six printed values make the landing zone a
source of emergent tension rather than a target you promised to hit. **Follow-suit exists precisely to
take control of the trick count away from you** — that is its entire function as a mechanic, and §8
keeps it for exactly that reason ("without it, card choice is free and the layer collapses").

So the design currently stacks a precision commitment on top of a mechanic engineered to deny
precision. Observation 9 is the honest report of that: not "I chose wrong," but "I could not have
chosen, and could not have executed either." That is the difference between input and output
randomness (Engelstein, `../design-principles.md`) landing on the wrong side — the player loses to the
system rather than to their own decision.

This is the **executable half** of §12's Problem 1. That problem asks whether the declaration is a
_readable_ choice at the moment it is made. Session 2 adds the question after it: even given a correct
read, **is the declaration a plan that can be carried out?** Observation 8 says no, and it says no in
the presence of a CPU that is not even trying.

### 5.2 The trick-maximising Quarry is simultaneously weak and maximally disruptive

§11 records that the shipped CPU is close to the _worst_ policy available to it — maximising tricks
lands it at `k = 10–13`, its own ×0.5 band, dealing 24–78 against a competent player's 420–540. That
reading is about the Quarry's own scoring, and it is correct.

Session 2 supplies the other half, and it is not a contradiction: **a trick-maximiser is the single
most disruptive opponent to a player trying to hit a precise trick count.** It contests every trick,
so it pushes the player _down_ out of 7–9 on every hand while scoring almost nothing for doing it.
From the player's seat that reads as "the CPU outplays me and ruins my plan" (obs. 8) even though the
CPU is losing badly on the arithmetic.

The consequence for sequencing: the band-aware Quarry is not only an _escalation_ item. Replacing the
trick-maximiser may **reduce** the steering problem, because a Quarry playing for its own band will
deliberately shed tricks the player wants. Whether that is enough on its own is unknown and untested.

### 5.3 Short suits are the normal deal, not the bad deal

Observation 11's singleton is not variance to be tuned out. A 13-card hand drawn from 33 cards across
three suits averages **4.3 cards per suit**, so holding one or zero of a suit is routine, not unlucky.
Every time it happens, follow-suit reduces the player's choice for that trick to a single legal card —
and, as observed, that card can _win a trick they did not want_. Agency does not degrade at the
endgame; it is absent on those tricks from the first deal.

Observation 10 ("once the cards get closer to 1/2… a foregone conclusion") is the aggregate of this
across a hand: as cards are shed, void suits accumulate and the proportion of tricks with exactly one
legal play climbs. **The number of tricks the player actually decides is materially lower than 13**,
and nobody has counted it. See Part 6.

### 5.4 The lead is a burden, and it is handed out by the mechanic the player least controls

Base rules: the non-dealer leads the first trick, then **the winner of a trick leads the next**. So the
lead is awarded for winning — and observations 11–13 describe being handed it as a _punishment_: no
information about the opponent's hand, no obvious right move, "frozen."

Two distinct complaints are tangled in observation 12 and worth separating before anything is changed:

- **Trump uncertainty** — "I don't know that playing the 7 will let me win, and it didn't." This is
  ordinary trick-taker hidden information. It is not obviously a defect.
- **Losing the lead as a compounded loss** — losing the trick _and_ the initiative in one event. This
  is base-game behaviour, but the duel direction raises its cost, because the lead is what steers the
  trick count the declaration commits to.

**Prescription 14 — "the player should always deal" — is recorded, not adopted.** Read as diagnosis
(Rosewater #19), the underlying report is _"I hate leading with no information."_ Note that the
prescription as stated would give the player the **follow** seat on trick 1, which is the _informed_
seat — so the instinct is pointing at information, not at the deal. Whether the fix is dealer control,
an information device, or something that makes leading legible is open, and it is the developer's.

### 5.5 What is now suspected of being the same problem

Session 1's diagnosis was **legibility** — "it's not clear what a good decision is." Session 2's is
**authority** — "even when it is clear, I cannot execute it." The fix for the first was the
declaration. If §5.1 is right, the declaration made the second one worse, because it converted an
emergent landing zone into a promise the player is held to.

That does not mean the declaration should go. It means **the two mitigations in §6 aimed at making the
declaration _readable_ do not touch this**, and a redesign that only improves the read will not move
observations 8–13.

---

## Part 6 — what to measure, session 2

Two of these are counts, not feelings, and neither has been taken.

4. **Count the tricks the player actually decides.** Over one Hunt, record for each trick how many
   legal moves the player had. A trick with one legal card is not a decision. If the count is (say) 7
   of 13, then §5.1's "precision target" is being aimed with half the control the design assumes, and
   that number — not a feel report — is what a redesign should be aimed at.
5. **Count where the player lands versus where they declared.** Play ten Hunts declaring Win and
   record the final trick count each time. If the distribution is not centred on 7–9, the player is
   not steering; if it is centred there but wide, they are steering and the variance is the problem.
   These are different repairs.
6. **Re-run 4 and 5 against a band-aware Quarry** once one exists (§5.2), before concluding anything
   about the declaration itself. The current opponent contests every trick, which is the maximally
   adversarial case for steering.

**What would prove §5.1 wrong.** If measurement 5 shows the player landing in 7–9 more often than
chance would give (roughly 3 in 14), then trick-count control exists and the problem is that it is
_invisible_ rather than absent — which is a readout problem and a much cheaper one. If the
distribution is flat, the declaration is a promise the ruleset does not let the player keep, and that
is a structural redesign.

---

## Session 3 — 2026-08-13, the first play of the redesign (played by Claude, not the developer)

**Provenance and its one caveat.** The developer asked for this one — _"I keep drawing lol, maybe you
try play and see how you get on and what you think."_ So the player here is **not a human**, and every
"feel" reading below is worth less than a developer's would be. What survives that caveat is the
**arithmetic and the legal-move counts**, which are properties of the rules rather than of the player.
Read this section for the counts; discount the adjectives.

**What was on screen.** DLR-80 as shipped: six-card hands, skulls, the bank and the streak, damage per
trick, both bars. Two hands played to completion against the Monarch, plus one trick of a third.
Player health 25 → 20. Quarry 1,000 → 870.

### 6.1 The counts

| Figure                                  | Hand 1      | Hand 2      | Session    |
| --------------------------------------- | ----------- | ----------- | ---------- |
| Tricks taken / conceded                 | 4 / 2       | 3 / 3       | **7 / 5**  |
| Health lost                             | 2           | 3           | **5**      |
| Dealt to the Quarry                     | 74          | 56          | **130**    |
| Largest single cash-out                 | 42 (21 × 2) | 36 (18 × 2) | **42**     |
| Skulls dealt to the Quarry              | 2           | 2           | **4**      |
| — dodged                                | 1           | 1           | **2**      |
| — eaten                                 | 1           | 1           | **2**      |
| Skull eats that had a legal alternative | 0           | 0           | **0 of 2** |

Play-test 2 §8 asked for four measurements. All four now have a first reading:

1. **Deliberate dodges: 2 of 12 tricks**, and one of the two was fully engineered — see §6.4. The
   inversion does produce a decision. It is not decoration.
2. **Forced skull eats: 2 of 2.** Both eaten skulls arrived on a trick where exactly one card was
   legal. See §6.2, which is the session's main finding.
3. **Largest cash-out: 42.** Damage rate 65 per hand. See §6.3.
4. **Did the multiplier change a decision?** **Yes, twice** — see §6.4.

### 6.2 The finding: against the Monarch the player never makes a follow decision, and the skull now punishes that

**Five follows, five tricks with exactly one legal card.**

| Trick | Their lead              | Legal cards in the player's hand | Why                                          |
| ----- | ----------------------- | -------------------------------- | -------------------------------------------- |
| H1 T1 | 2 of Keys               | 1 — the 9 of Keys                | Monarch: no Swan of Keys, so highest Keys    |
| H1 T3 | **3 of Bells, skulled** | 1 — the 10 of Bells              | Monarch: highest Bells. **Forced to win it** |
| H1 T6 | 7 of Bells              | 1 — last card in hand            | End of hand                                  |
| H2 T2 | 2 of Bells              | 1 — the 5 of Bells               | Monarch: highest Bells                       |
| H2 T4 | 8 of Keys               | 1 — the 1 of Keys                | Monarch: Swan of Keys (the only Keys held)   |

Every decision made in twelve tricks was a **lead**. Seven leads, six of them real choices; five
follows, zero choices. That is the first reading of session 2's measurement 4 ("count the tricks the
player actually decides") — **7 of 12, and the split is not random: it is exactly the lead/follow
line.**

**Session 2's observation 11 is still live, and the redesign gave it teeth.** Verbatim, from the
session above: _"they led with bells and I had 1 bell the 8, I had no choince but to take the trick."_
H1 T3 is that sentence, replayed, with a skull on it. The Quarry led its skulled **3 of Bells**; the
player held exactly one Bells, the 10; the Monarch narrows the follow to _the Swan of that suit or the
highest of it_; the 10 was the only legal card; 10 beats 3; the trick was taken; the skull was eaten.
One damage, and a 32-point cash-out fired two tricks early.

The player **knew all of it in advance**. The shape readout said Bells held a skull. The telegraph said
_"The Quarry will lead Bells."_ Play-test 2 §3.5 is explicit that this foreknowledge is what makes
§3.4's ambush survivable — _"you can see which suits are mined and lead low into them deliberately."_
Against the Monarch that defence is unavailable by construction, because **the Monarch does not wait
for you to lead into the mined suit; it leads into the suit itself, and then dictates your reply.**

**The enumeration.** When the Monarch leads suit _S_ and the player holds at least one card of _S_,
the legal set is `{Swan of S, if held} ∪ {highest S held}`. So a skull of rank _r_ led in _S_ is
dodgeable **only** if:

- the player holds the **Swan of _S_** — one specific card in 33, so roughly **18%** of hands; or
- the player's **entire holding in _S_ is below _r_** — which for a low skull (_r_ ≤ 4) requires every
  card of that suit in hand to be a 2 or a 3; or
- the player is **void in _S_** — in which case the Monarch's narrowing does not apply at all.

**Why this is a six-card problem specifically, and nobody noticed.** The Monarch's printed liability
(`the-hunt.md` §9) is _"shedding your Swan and your top card of a suit early neutralises the Monarch
in that suit before it is ever led."_ At thirteen cards there is an _early_ in which to do that. At
six cards there are six tricks, you hold roughly two cards per suit, and shedding your top card of a
suit means playing it — into a trick. **DLR-80 shrank the hand from thirteen to six and carried the
character over verbatim, and the shrink deleted the character's only counterplay.** Play-test 2 §3.1
lists three jobs the six-card hand does; none of them is this, and §4's deletion list does not mention
the Monarch.

### 6.3 Quarry health at 1,000 makes the encounter arithmetically unwinnable

The one figure `the-hunt.md` §8 marks as a placeholder awaiting a play session. Here is the session.

- **Damage dealt: 65 per hand** (130 over two hands, in which the trick count was won 7–5).
- **Health lost: 2.5 per hand** — which lands squarely inside play-test 2 §5's own estimate of 2–4.
- **Hands needed to empty 1,000:** 1000 ÷ 65 ≈ **15.4**.
- **Hands of health available:** 25 ÷ 2.5 = **10**.

So the player dies with roughly **350 of the Quarry's 1,000 still on the bar** — while winning the
trick count. §5's estimate of "something like eight hands" was a health-rate prediction and it was
close; what was never estimated was the damage rate, and 1,000 is out by a factor of about two.

Scaled off this session, an encounter that ends in _N_ hands wants Quarry health near `65 × N`: about
**520** for the eight hands §5 reasoned toward, or **650** for a fight that goes the full distance the
player's health allows. **Both numbers are the developer's to set, and two hands is a thin sample** —
the damage rate is the term with the variance, since one six-trick sweep at ×6 would deal more than
either hand here did in total. What the session establishes is not the value but the **order of
magnitude**: it is in the hundreds, not the thousands.

**One knock-on.** Play-test 2 §5's closing note — _"in a one-encounter build a competent player should
beat the first CPU comfortably"_ — is not currently reachable at any level of play, so the scoping note
cannot be used to judge difficulty until the health figure moves.

### 6.4 What is genuinely working — three mechanisms, named

**The skull inversion produces a real, learnable, engineered play.** H1 T2 was the best moment of the
session and it was built entirely out of rules that already existed. The readout showed _Moons 1, one
skull_: the Quarry's only Moon was skulled. The player held the 2 and the 6 of Moons. Leading the **2**
forces the Quarry to follow suit with its single Moon, which cannot be lower than a 2, so it **must**
win the trick — and the trick is a skull trick, so winning it is the player's dodge. Both cards banked,
streak to ×2. That is a read, executed, off the shape readout, and it is exactly the play play-test 2
§3.5 predicted the readout would enable. **It works.**

**The bank only climbing removed the noise, as designed.** Across twelve tricks the number never once
moved in the unexpected direction. Session 2's _"eh....."_ — the non-monotonic pending figure that
could _fall_ when you won a trick — is gone, and nothing replaced it.

**The multiplier changed decisions, twice, and in a way the design did not anticipate.** Both times the
lever was not the multiplier's size but the **bank's emptiness**:

- **H2 T1 — throwing a trick on purpose because it was free.** With the bank at 0, losing a trick costs
  1 health and cashes _nothing_. Losing the same trick at bank 30 × ×3 costs 1 health _and_ discards 90
  damage. So the player led their lowest card (3 of Bells) deliberately to lose the first trick of the
  hand, while a loss was cheapest.
- **H1 T4 — taking the risky line to keep the streak alive.** Holding 5 and 8 of Keys plus the 6 of
  Moons against a Quarry with one trump left, the safe play banks less; leading the highest trump to
  strip their trump set up a three-trick sweep at ×3 instead of a scattered ×1. The multiplier is what
  made the greedier line correct.

**This is worth stating as a positive answer to §8's fourth question and a new entry on §6 Q4's
slippery-slope watch list at the same time.** The incentive the bank creates is _"get your losses over
with at the start of a hand, then run the streak."_ That is a genuine strategic texture, and it also
means the front of every hand is something the player deliberately throws away. Balatro's comparable
move — spending a discard — costs a metered resource; here throwing a trick costs 1 of 25 health, which
is 4%, and buys a much larger swing. Whether that reads as clever sequencing or as an exploit is a feel
question and therefore the developer's.

### 6.5 Two corrections to claims in play-test 2, both cheap and both closing an open question

**Q2 — "many six-card hands will contain none of the named ranks at all" — is wrong by two orders of
magnitude.** The arithmetic was never done. Five ranks carry an actual effect (Swan 1, Fox 3,
Woodcutter 5, Witch 9, Monarch 11), which is 15 of the 33 cards; Treasure 7 and Poison 8 do nothing, so
they count with the plain ranks.

- Expected effect-bearing cards in a six-card hand: `6 × 15/33` = **2.7**.
- Probability a six-card hand holds **none**: `C(18,6) / C(33,6)` = `18,564 / 1,107,568` = **1.7%**, or
  about **one hand in sixty**.

The session bears it out: hand 1 held 2 and drew a third, hand 2 held 5, hand 3 held 2 — and the Fox,
the Woodcutter, the Witch, the Swan and the Monarch narrowing all fired at least once in twelve tricks.
**Q2 needs no rule change and no deck weighting.** It can be closed as answered by arithmetic, which
also retires the three exits §6 Q2 offered.

**"A skull's threat is inversely proportional to its rank" (§3.4) holds only while the Quarry must
follow suit.** Two counter-cases, one per hand:

- **When the Quarry is void in the lead suit, rank is irrelevant and the threat is 1.** H2 T5: the
  Quarry was void in trump, held one skulled **10 of Bells**, and the player held nothing but trumps.
  The player led; the Quarry dumped the 10 into a trick it was guaranteed to lose; the player ate it. A
  rank-10 skull — the _"announcement"_, the safe one by §3.4's rule — was a **100% hit**.
- **When the Monarch leads a low skull, §6.2 makes it near-undodgeable** rather than an ambush the
  readout defends against.

So the rule wants re-scoping to: _a skull's threat is inversely proportional to its rank **when the
Quarry must follow suit**, and independent of rank when it is void or when the Monarch is dictating the
follow._

**And the emergent corollary, which is not in any document and was the most interesting thing the
session produced: holding only trumps is a curse.** With no card that can lose, you cannot dodge
anything. In H2 the player used the Woodcutter to _discard a trump_ and keep the **1 of Keys** purely
as a card capable of losing a trick — and it paid off immediately at H2 T4, where it was the only legal
card and it guaranteed the loss. **"Keep one card that can lose"** is a real skill this design teaches,
and it is Koster's mastery test answered honestly (`../design-principles.md` §1): it is not a thing a
first-hand player would know.

### 6.6 The connection — and why the queued CPU improvement points the wrong way

**§6.2 and the void case in §6.5 are one problem: the player has no card that can lose.** The Monarch
narrows the legal set to cards that win; holding only trumps means every card wins. Both produce the
same experience, which is session 2's observation 11.

That reframes two open items:

- **§6 Q1 — the skull rank distribution — cannot be answered while the Monarch is the only opponent.**
  Skewing skulls **low** is the option that makes ambushes more common, and against the Monarch a low
  skull led is close to free damage. Answering Q1 off play against this character would tune the whole
  game around one broken interaction. Q1 is downstream of §6.2.
- **The known tension _"the Quarry does not avoid leading a skull, so some dodges are free"_ is
  backwards against the Monarch.** The Quarry led a skull once in this session and it was its **best
  play of the session**, not a giveaway. The queued "obvious next CPU change" — teach it to avoid
  leading skulls — would make its skull play _worse for the player_, because the remaining route is the
  follow-dump into a trick it is losing, which §6.5 shows is undodgeable. Both of the session's skull
  eats came from routes that change would keep or strengthen. **The two fixes pull in opposite
  directions**, and the tension as written should be narrowed to the case it was reasoned about: a
  _high_ skull led at a _non-Monarch_ Quarry.

### 6.7 Options, with what each costs in new rules

> **Resolved the same day — DLR-81 took none of these four, and removed the power outright.** The
> developer's answer reframed the finding: the character powers were never a design decision at all.
> They were placeholder framing — _"like opponent 1, opponent 2 and nothing more"_ — and the intent
> was for powers to belong to a **final boss**, not to every opponent. So the Monarch's round-long
> rule-break was not a mechanic to be tuned, scoped, or counterbalanced; it was something that had
> been built without ever being chosen.
>
> **What shipped:** the whole-hand narrowing is gone, and the Quarry now plays by exactly the
> player's rules. The rank-11 card's _printed_ narrowing survives, fires only on the trick where an
> 11 is actually led, and binds both sides. A character is now a name on a panel. Powers are deferred
> to a final-boss ticket that will design them first.
>
> **What that does to the table below:** row 1 is superseded — there is no contaminated sample to
> separate any more, because the contaminant is gone rather than isolated. Rows 2 and 4 are moot.
> **Row 3 — guarantee the player one rank-1 card — survives on its own merits**, since §6.6's
> "no card that can lose" also arises from an all-trump hand, which the removal does not touch. It is
> now the only live option here, and still the developer's call.
>
> Kept rather than deleted because the reasoning is what identified the problem, and because the
> outcome is the argument for the pause condition: the fix was one the analysis could not have
> proposed, and only the developer knew.

For §6.2. All four are the developer's call; they are ordered by rules added, cheapest first.

| Option                                                              | New rules              | What it buys                                                                                                                                                                                                      | What it risks                                                                                                                                                                          |
| ------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build a second character before touching any skull rule**         | 0                      | Separates _"skulls are unfair"_ from _"the Monarch plus skulls is unfair."_ Every hand ever played of this design has been against the one opponent that deletes the follow decision — the sample is contaminated | Costs a build, answers nothing on its own                                                                                                                                              |
| **Scope the Monarch's narrowing to one suit** instead of every lead | 0 — a scope change     | Forced follows drop from 5 of 5 toward 1 of 5; the character keeps its identity and its printed liability becomes exercisable again                                                                               | Weakens the only built character; the round-long rule-break is the whole point of the character design                                                                                 |
| **Guarantee the player one rank-1 card in the deal**                | 1 deal rule            | Restores the Monarch's stated liability, and gives the player the "card that can lose" §6.6 identifies as the missing piece. Reuses a printed card and adds no subsystem                                          | Not free, which is good: the Swan hands the lead to the loser, and in H2 T4→T5 that lead was itself a liability. Also a candidate for Forage to sell rather than the deal to guarantee |
| **Exempt skull tricks from the narrowing**                          | 1 rule, a special case | Targets the interaction precisely                                                                                                                                                                                 | A special case rather than a general principle, which is the shape Knizia's method warns against (`../design-principles.md` §2)                                                        |

### 6.8 Smaller findings

Presentation and copy. Every one of these is the developer's to judge; they are recorded, not ruled on.

- **`"Deal the next Hunt"` is one word wrong.** The panel above it reads _"The hand is over"_, and
  `the-hunt.md`'s vocabulary note reserves _Hunt_ for the encounter and _hand_ for the deal. The button
  should say **hand**. `src/app/warCouncil/RoundOverPanel.tsx`.
- **`"You take the trick."` is printed when you eat a skull**, in the largest type on screen, directly
  above _"You ate the skull. 1 damage — the bank cashes."_ Two contradictory readings of one event, and
  the winning one is bigger and more central.
- **The telegraph goes stale.** _"THEIR INTENT: Waiting on your lead."_ stayed on screen while it was
  the Quarry's lead with its card already face up, and again after it had taken a trick — i.e. when it
  leads next.
- **A forced play costs four taps.** On a trick with exactly one legal card: `LET THEM LEAD` → tap the
  card → tap it _again_ to confirm → tap the table. The confirm tap is ceremony when there is no choice,
  and `LET THEM LEAD` gates information the sidebar has already shown. Half the tricks in this session
  were forced (§6.2), so this is not a rare path. `game-ux` territory.
- **The Quarry's Fox changed trump inside the same tap as its lead.** H1 T3: it played the 3 of Bells,
  exchanged the decree, moved trump from Bells to Keys and took a Swan into hand — a strong-looking
  play, and the single largest state change the game can make, arriving with no beat of its own.
- **Rank 8 read as a bug, exactly as predicted.** An 8 of Keys was led at H2 T4 and the player looked
  for a skull interaction that does not exist. Play-test 2 §6 Q3 called this and it is confirmed.
- **The player's health bar reads fine at 25** in 1-point steps — 20/25 was legible at a glance. The
  known tension can probably be closed.
- **The layout reflowed to a cramped single column** when the window size changed mid-session: the left
  rail wrapped _"The Monarch"_ onto two lines and the hand shrank. No scroll break, but worth a look.

### 6.9 What to measure next

Ranked. The first two are the ones that would change a decision.

1. **Play four to six more hands and record dealt-per-hand and health-lost-per-hand each time.** Two
   hands is a thin sample and the damage term is where the variance is — a single six-trick sweep at ×6
   would exceed either hand here. The **median**, not the mean, is what Quarry health should be set
   against.
2. **Re-run §6.1's counts now the power is gone (DLR-81).** This was written as "build one
   non-Monarch character"; the removal is a stronger version of the same experiment, and it is
   already done — so this measurement is **available now and costs one play session**. It is still
   the falsifier for §6.2. Count forced follows again: if they fall from 5 of 5 to something like
   1 of 5, the character was the problem and the skull rules are sound; if they stay high,
   follow-suit at six cards is the problem and the skull merely inherits it. **Everything else in
   this section was measured against the power and should be re-taken with it.**
3. **On every skull you eat, record whether a legal card existed that would have lost the trick.** This
   session: 0 of 2. It is the single number that separates _"I misplayed"_ from _"I was taxed"_, and it
   costs nothing to write down.
4. **Count the tricks where you hold no card that can lose.** §6.6's unified reading of the problem;
   if it is common, the fix belongs in the deal rather than in the character.
5. **Re-run the standing benchmark.** Still never repeated since session 1, and still the only
   comparative measurement in this project's history — one fresh Balatro ante, then one hand of this,
   same question. A non-human player cannot answer it; this one is the developer's alone.

### 6.10 The one-line summary

The skull inversion works, the bank feels right, and the numbers say two things: **the Monarch did not
survive the shrink from thirteen cards to six** — five follows, five forced, both skull eats
undodgeable — **and 1,000 Quarry health makes the encounter unwinnable while winning the trick count.**

### 6.11 What the session changed, and the one lesson worth keeping

**Shipped the same day (DLR-81):** the Quarry's character power was removed entirely — see §6.7's
resolution note. Section 9 of `the-hunt.md` and four module docs were rewritten around it.

**Still open, and unchanged by that:** Quarry health (§6.3), the skull rank distribution — which
§6.6 argued is downstream of §6.2 and is therefore **now answerable**, since the blocker is gone —
and every presentation item in §6.8.

**The lesson, and it is a process one rather than a design one.** The finding in §6.2 was measured
correctly and diagnosed correctly, and every fix §6.7 proposed was still wrong, because all four
assumed the power was a design decision to be tuned. It never had been. Nothing in the code, the
ruleset, or the design documents recorded that the five characters were meant to be inert framing —
`the-hunt.md` had the Monarch's rule-break marked **[settled]**, which is the strongest marker the
document has, and the implementation docs described it as a deliberate mechanism with a liability and
a test suite.

So a placeholder became a settled rule with nobody deciding it, and it then survived two play
sessions and a whole redesign. That is Rosewater's lesson #19 (`../design-principles.md` §2 —
players diagnose accurately and prescribe badly) with the roles swapped: the _analysis_ diagnosed
accurately and prescribed badly, and the developer's one sentence about original intent was worth
more than the four costed options. **When a rule looks structurally indefensible, ask whether anyone
chose it before proposing how to fix it.**

---

## Session 4 — 2026-08-13, the first encounter anyone has won

**What was played.** Two sittings on the same build, after DLR-81 removed the Quarry's power.
First the **developer played one hand** against Quarry health 1,000. Then, on the strength of that
hand, the developer **set Quarry health to 450** — the first time this figure has come from play
rather than from arithmetic — and **Claude played the encounter through to its end**. The same
caveat as session 3 applies to the second half: the player was not a human, so read the counts and
discount the adjectives.

### 7.1 The counts, and the comparison that matters

|                                        | Tricks | Health lost | Dealt                                   |
| -------------------------------------- | ------ | ----------- | --------------------------------------- |
| **Developer's hand** (at 1,000 health) | 5–1    | 1           | **136**                                 |
| Claude, hand 1 (at 450)                | 2–4    | 2           | **156**                                 |
| Claude, hand 2                         | 3–3    | 2           | **166**                                 |
| Claude, hand 3                         | 4–2    | 0           | **128** — capped; the cash-out was ~420 |
| **Encounter total**                    | —      | **4 of 25** | **450, in three hands**                 |

For contrast, the same player's two session-3 hands **with** the power in force dealt **74** and
**56**.

**Quarry health 450 is now settled by play.** Three hands, which is what the developer predicted when
setting it. §6.3's finding that 1,000 made the encounter unwinnable is closed — it was not the
number that was wrong so much as the opponent.

### 7.2 What is genuinely strong

**The payoff is quadratic in streak length, and that is the best structural property this design
has.** The bank and the multiplier both climb per trick taken and cash as their product, so a hand's
output is not a function of how many tricks you took but of **how they were clustered**. Take _n_
tricks with one loss splitting them into runs of _a_ and _b_: since the bank grows roughly linearly
with run length, the hand pays about `a² + b²`. For `a + b = 5`:

| Split                       | Pays like |
| --------------------------- | --------- |
| 5 + 0 — loss at either edge | **25**    |
| 4 + 1                       | 17        |
| 3 + 2 — loss in the middle  | **13**    |

**A loss in the middle of a hand costs about half of one at the edge, for the same trick count.**
That is why Claude's 2–4 hand outdealt the developer's 5–1 hand, and it is a rare thing to find: a
scoring rule where the obvious metric (tricks won) genuinely does not determine the outcome. Meier's
test for a decision worth making is that its value changes with board state
(`../design-principles.md` §2) — here the _same_ action is worth twice as much depending on when it
happens.

**It also explains the removed power's cost exactly, and retroactively.** The Monarch's narrowing
forced losses to arrive scattered rather than clustered, so the damage penalty was quadratic rather
than linear. That is why removing it more than doubled output rather than improving it a little.

**Where the skulls sit changes the whole plan, not one card.** Three positions from this session,
all real reads made off the shape readout:

- **Skulls in a side suit the player holds** — lead it low and force their own skull to win. Two
  dodges taken this way in hand 1.
- **Skulls in trump** — the inverse: _never_ lead trump, because a trump lead wins the trick and
  wins you the skull with it. Hand 3 was played entirely around this.
- **Skulls held by a Quarry void in the led suit** — undodgeable, as §6.5 established.

**"A card that can lose" is a scarce resource, and the game teaches it without stating it.** Claude
used the Woodcutter to keep a drawn rank-1 off-suit over a stronger card, purely because a card that
cannot win is the only reliable way to dodge. This was noted in §6.5 and it recurred unprompted.
Koster's mastery test (`../design-principles.md` §1) — what is round five teaching that round one
wasn't — has a real answer here.

### 7.3 Problem — throwing the first trick is close to free, and it is the one position-independent move

> **In plain terms, because the version below is a report and this is the thing to remember.**
> Throwing the very first trick of a hand costs you almost nothing. You lose 1 health out of 25, and
> that is it, because your bank is empty so there is no cash-out to forfeit. Meanwhile you get
> something real: the Quarry takes the lead, and your streak stays intact for one long run instead
> of two short ones.
>
> So it is more or less always the right opening. **A move that is always right is not a choice, it
> is a thing you do every hand before the game starts** — and that is the objection. Not that it is
> powerful; that it is automatic.
>
> It is also not urgent. Build the run (§7.6) and health starts mattering across five encounters
> instead of one, at which point the free health point stops being free and this probably dissolves
> on its own.

Ranked first because it is the only line in this session that was correct _without reading the
board_.

Losing a trick is supposed to cost two things: 1 health, and the cash-out you forfeit by resetting
the multiplier early. **At bank 0 the second cost does not exist**, so the designed penalty is
structurally absent on the first trick of every hand. What remains is 1 health out of 25 — **4%** —
against a positional gain that is often large: it hands the lead to the Quarry, which is a liability
while it holds skulls, and it buys an unbroken run afterwards, worth up to 2× by §7.2's table.

Claude played this deliberately in hand 2 and it was plainly right. It is the same move §6.4 first
recorded, now confirmed on a second occasion with the power gone, so it is not an artefact of the
removed rule.

**What makes it a problem rather than a skill:** §7.2's clustering rule is genuine skill — it depends
on the deal, the shape readout and what you can actually steer. _"Throw trick 1"_ does not. It is
available in every hand, costs the same in every hand, and needs no read. Soren Johnson's warning
applies (`../design-principles.md` §2): players will find the joyless line if it wins.

**Options, cheapest first. All are the developer's.**

| Option                                                                                                                            | New rules                                          | What it buys                                                                                                                                                                                                              | What it risks                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build the run** — 5 encounters, no restore between, which §10 already specifies and configures (`ENCOUNTER_PLAYER_RESTORE = 0`) | **0** — it is designed and unbuilt, not undesigned | At ~4 health an encounter, 25 health is almost exactly a five-encounter run. A health point stops being 4% of one fight and becomes 4% of the _run_, which is what the throw is spending. **This also fixes §7.4**, below | Costs a build. Does not change anything about a single encounter played in isolation                                                                                     |
| **Lower player health**                                                                                                           | 0 — a tuning change                                | Raises the price of the throw directly                                                                                                                                                                                    | Health is currently readable at 25; a smaller number makes each hit heavier but the bar coarser. And it treats the symptom in the wrong loop if the run is coming anyway |
| **Accept it**                                                                                                                     | 0                                                  | It is a real opening decision with a real cost, and Balatro's discard is also "free" in the sense of being budgeted rather than penalised                                                                                 | If it is always correct it stops being a decision after the third hand                                                                                                   |

### 7.4 Problem — the player's health bar is not a resource inside one encounter

Claude finished the encounter on **21 of 25**, having never been within fifteen points of losing.
Across all four hands ever played on this build, health lost per hand is **1–2**. An encounter lasts
three hands. So the player's bar moves about 15% and then the fight ends.

**One of the two health bars is therefore doing nothing in the game as built.** All tension lives in
the Quarry's bar, which is one-directional: the question is only ever _"how large can I make the
cash-out"_, never _"can I survive this"_. Rosewater's interaction check
(`../design-principles.md` §2) — do the players have to react to each other — is only half-answered:
the Quarry's skulls shape your play, but its damage never threatens you.

This is **not** an argument for raising damage. It is an argument that the player's health is a
**run-level** resource that is currently being asked to do an encounter-level job it was never
designed for. §5 of the redesign says as much — 25 was chosen as _"roughly eight hands"_, which is
two to three encounters, not one.

### 7.5 Problem — the trick count is prominent, and it does not predict winning

The status band's largest element after the health bars is **YOU / TRICK / THEM**, dead centre. The
hand-over panel leads with **Tricks taken** and **Opponent's tricks**.

The encounter was won with hand results of **2–4, 3–3, 4–2** — losing or tying the trick count in two
hands of three. §7.2 explains why: clustering dominates count. So the most visually prominent
readout on the screen is tracking the statistic that predicts the outcome _least_ well, and a new
player will reasonably read it as the score.

**And the counter is inverted on exactly the tricks the game is about.** This was first written up
as a vocabulary collision — two meanings of _taken_ — which understated it. The developer spotted it
in play and it was then confirmed against the source: `playCard.ts` increments
`tricksWon[resolveTrickWinner(...)]` with **no skull logic at all**, and the panel prints that number
directly. So:

| Trick outcome                    | Good for the player?           | Counted as the player's trick? |
| -------------------------------- | ------------------------------ | ------------------------------ |
| Clean win                        | yes — banks, streak climbs     | **yes** ✓                      |
| **Dodge** (losing a skull trick) | **yes** — banks, streak climbs | **no** — scored to the Quarry  |
| **Eating a skull** (winning one) | **no** — 1 damage, bank cashes | **yes** ✗                      |
| Clean loss                       | no — 1 damage                  | no ✓                           |

It agrees on the two clean outcomes and is **inverted on both skull outcomes**. The headline figure
counts the thing that damages you and excludes the thing that pays you — which is the precise
opposite of what `the-hunt.md` §7 means by _taking_ a trick, and of what the multiplier counts.

Session-4 hand 1 is the worked case: clean win, dodge, dodge, clean win, loss, loss. The panel read
**"Tricks taken 2 / Opponent's tricks 4"** while the streak that cashed 156 was **4**. The two dodges
— the best tricks in the hand, and the whole point of the skull mechanic — were scored to the
opponent.

**This is worse than a wrong label, because the skull inversion is the design's central idea.**
Play-test 2 §3.2 states it as the line a player should be able to hold: _"Make them eat the skulls.
Win everything else."_ The end-of-hand panel reports the first half backwards. A player learning the
game from the screen is being taught the opposite of the rule.

**Whose decision, and what it is not.** The engine is not wrong — `tricksWon` is a faithful
trick-count and other things may want it. What to _show_ is the call: the trick-taking count, the
streak-relevant count (clean wins + dodges), both, or neither. That is a display and copy decision,
so it is the developer's.

### 7.6 The connection, and the one fix that closes two problems

**§7.3 and §7.4 are the same problem seen from two ends: one health point is too cheap.** It is too
cheap to make throwing a trick cost anything, and too cheap for the bar to ever feel at risk. Both
are consequences of spending a run-scale resource inside a single encounter.

**The run closes both, and it adds no rules.** A five-encounter sequence with no restore between them
is already designed (§10), already configured, and already marked `[not built]`. At the measured
~4 health an encounter, 25 health is almost exactly five encounters — so the number is _already
tuned for the run_, which is why it reads as slack inside one fight. Build the sequence and a
thrown trick is spending 4% of the whole run rather than 4% of a fight you were going to win anyway.

Scored by Rosewater's lesson #17 — you don't have to change much to change everything
(`../design-principles.md` §2) — this is the cheapest available fix: **zero new rules, one unbuilt
feature that already exists on paper.**

**What it does not fix:** §7.5, which is presentation, and the open skull-distribution question.

### 7.7 Smaller findings

- **The final blow reports the wrong number.** Hand 3's panel says _"Dealt to the Quarry 128"_ — the
  capped figure. The actual cash-out was about **420**. Surplus damage is correctly discarded
  (`the-hunt.md` §8), but the panel reports what _landed_ rather than what the player _did_, so the
  most spectacular hand of the encounter reads as its smallest. The kill is the one moment the design
  should be loudest about.
- **The Witch is doing excellent work and needs no change.** It beat the player once (a Moons 9
  taking a Moons 11) and saved them once (a Bells 9 taking a Bells 11). Both were surprises, both
  were fair, both were the player's own failure to track a known rule. This is Garfield's drama
  argument working (`../design-principles.md` §3).
- **Two Witches cancelling produced a genuinely subtle resolution** — a skulled Keys 9 against a
  Bells 9 with Keys as trump. The Witches cancelled, but the Keys was trump _by suit_ regardless, so
  it still won. Correct by §6, and not obvious.
- **The Quarry's Fox hid a skull in the decree**, changing trump mid-hand and removing a skull from
  the shape readout in the same action. Effective, and it made the remaining skull _trump_ — which
  by §7.2's logic was actually good for the player. Worth knowing the CPU can do this accidentally
  well.
- **`"Deal the next Hunt"` still says Hunt** where it means _hand_ (carried from §6.8, unfixed).
- Skulls-in-trump is a distinct tactical case from anything §3.4 of the redesign anticipated, and it
  is the one where the readout pays off most.

### 7.8 What to measure

1. **Play one hand deliberately never throwing trick 1, and compare total damage** against a hand
   where you do. §7.3 predicts the throw is worth up to 2× on the hand. If it is under ~30%, the
   problem is smaller than stated and can be left alone.
2. **Record, per hand, the trick count and the damage.** §7.2 predicts they correlate weakly and
   that clustering predicts far better. Four hands exist; ten would settle it, and it is the number
   that decides whether §7.5's readout should change.
3. **The skull rank distribution (§6 Q1) is now answerable and is the biggest open question.** It was
   blocked on the removed power. Play a few hands with skulls skewed low, then a few skewed high.
4. **Play five encounters back to back without restoring health**, even by hand, before building the
   run. §7.6's whole argument rests on ~4 health an encounter holding up across five, and it is one
   session's work to check.
5. **Re-run the standing benchmark.** Still never repeated since session 1. One fresh Balatro ante,
   then one hand of this. The developer's alone.

### 7.9 The one-line summary

The game is now winnable, the skulls produce real reads, and the scoring has a genuinely good shape —
**damage is quadratic in how well you cluster your losses, not linear in how many tricks you win** —
but one health point is too cheap to price the first trick of a hand or to make the player's bar
matter, and the run that is already designed would fix both without adding a rule.

---

## Housekeeping — how this file stays honest

Feedback on The Hunt goes **here**, at the time it is given, as a new dated session section. It is
the only file in the project that carries observed reactions to our own game; the reference-game
siblings carry reactions to other people's. When an item here becomes a ticket, add the key to Part 2
rather than deleting the observation — the whole lesson of this document is that the observation
outlives the ticket.
