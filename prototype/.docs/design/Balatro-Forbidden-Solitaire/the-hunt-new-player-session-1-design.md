# The Hunt — new-player session 1, design feedback

**2026-08-14.** The design half of the first session played by someone who did not build the game.
The UX half is `the-hunt-new-player-session-1.md`; this file takes the four notes that document
routed out, because in each of them the action was clear and she wanted the game to be shaped
differently.

---

## Source

First-time player, no prior exposure to the rules or to *The Fox in the Forest*. Post-PT-002 build:
trick-count bank, `n × n` cash-out, both health totals at 10, hump skull curve, Quarry with no
powers. She won the encounter in one hand, and on a second hand beat the Quarry with one card
unplayed.

Observed play relayed by the developer — behaviour is first-hand, wording is paraphrase. Per
Rosewater's lesson 19 (your audience is good at recognising problems and bad at solving them),
everything below keeps what she noticed and discards what she asked for, except where the request
is itself close to a measurement.

**Nothing in this document is a decision.** Both health totals, the skull curve, every payout value
and every price are the developer's.

---

## The four notes

| # | Observed | Prescribed (set aside) | Where the cause lives |
|---|---|---|---|
| **D1** | Won the encounter in one hand. | *"too fast, or should be hard to do"* | `QUARRY_ENCOUNTER_HEALTH = 10`, and an unimproved Quarry lead |
| **D2** | Learned what the Poison card was and wanted to use it. | *"be able to use it"* | Rank 8 is named and inert (§5) |
| **D3** | *"7 should do something."* | — | Rank 7 is named and inert (§5) |
| **D4** | Beat the Quarry with one card unplayed and wanted it rewarded. | *"a reward for having cards left over"* | The encounter has no success gradient at all |

---

## The connection worth acting on first

**D1 and D4 are the same problem, and it is not the health number.**

The encounter currently lasts about 1.9 hands — roughly eleven tricks — and when it ends, nothing
happens. No payout, no score, no carry-forward; `the-hunt.md` §10 records the flat win payout, the
currency, the shop and the run itself as **[not built]**, and only one Quarry is configured. So the
whole game is one short fight that stops.

She noticed both halves of that in one session. "Too fast" is the fight being short. "Reward me for
finishing early" is the fight having no opinion about *how well* it was won — you either killed it or
you didn't, and killing it in one hand looks identical to killing it in four.

That second half is Knizia's point about designing the scoring first — the scoring principle is
supposed to reshape every decision, and this game has a scoring principle inside a hand (`n × n`) and
**none at all across an encounter.** Her request is the player-side symptom of that gap. It matters
that it arrived unprompted from someone who had read nothing.

**D2 and D3 are connected to D1 too, but more weakly** — see the arithmetic under D2, which corrects
a claim the docs currently make.

---

## D1 — The walkover

### The cause is measured, and she is not an outlier

`ideas.md` → *Replace the rank-sum bank with a trick-count bank* §3 already holds the numbers, taken
against the shipped engine on 2026-08-14. At a 10-point Quarry bar:

| Quarry HP | random legal wins | simple greedy wins | PIMC wins | hands | damage wasted as overkill | **PIMC − random** |
|---|---|---|---|---|---|---|
| **10** | **63.8%** | 73.3% | 85.0% | 1.9 | 36.6% | **21.2** |
| 20 | 33.9% | 43.5% | 63.3% | 2.8 | 25.3% | 29.4 |
| 25 | 21.6% | 28.8% | 52.3% | 3.0 | 18.9% | **30.7** |
| 30 | 13.8% | 20.5% | 42.7% | 3.3 | 14.1% | 28.9 |
| 40 | 6.0% | 10.7% | 26.7% | 3.6 | 7.3% | 20.7 |

A player choosing **legal moves at random** wins about two encounters in three at 10 HP. A first-time
player is at or a little above that line, so her one-hand win is the modal outcome rather than a
lucky one. `the-hunt.md` §8 already states this outright — *"a 10-health Quarry is a walkover, and
that was accepted when it was set"* — and 24% of hands reach `Σn² ≥ 10` on their own, so about a
quarter of hands end the encounter single-handed. She hit one.

**Credit where it is due: this was a known, accepted consequence, not an oversight.** What the
session adds is that it is visible to an outside player within one sitting, which the docs could not
have known.

### The new number in that table is the last column

Nobody has written down the *skill separation* — how much winning depends on playing well rather than
on the bar. Subtracting the random column from the PIMC column gives a curve that **peaks at about
25 and is flat across 20–30**: 21 points of separation at 10, about 30 at 25, back to 21 at 40. Below
20 the bar decides the fight; above 30 the deal does, because even perfect play loses most encounters
and the variance of the deal swamps the decision.

The useful part is the flatness. The developer is choosing inside a broad optimum, not balancing on a
knife edge — anywhere in the low-to-mid twenties buys most of the available skill signal, and being
five points out costs very little.

Two second-order gains come with it. Overkill waste halves from 37% to 19%, so the top of the payout
table stops being invisible — at 10 a streak of four (16) and a streak of six (36) are the same event.
And the encounter grows from 1.9 hands to about 3.0, which is roughly the length `ideas.md` measured
the skill signal needs to clear the noise, so a player would start to see evidence that their play
mattered.

### But do not tune health first, and this is the practical finding

`the-hunt.md` records that **the Quarry does not avoid leading a skulled card**, deliberately, as the
minimum viable CPU — and names it as the obvious next change. Its net effect has never been measured,
and it cuts both ways rather than one:

- A led skull the player can go under is a **free dodge** — it banks a trick and climbs the streak
  for no decision at all, which inflates every damage figure in the table above.
- A led *low* skull is the opposite: the player cannot get under it, is forced to win, and eats it
  with no counterplay. Under the hump curve, which concentrates skulls on ranks 5–6, both cases are
  live and neither dominates on paper.

So the Quarry's lead is currently moving the same number the health bar is being tuned against, by an
unknown amount and an unknown sign. **Fixing the lead after retuning health means retuning health
twice.** The harness that produced the table above already exists in method, so this is the cheapest
measurement in the document: re-run it with a skull-aware lead and read the win-rate column again.

### Four fixes

**A. Raise the Quarry's bar.** One constant, zero new rules. Buys the skill separation above, halves
overkill waste, roughly doubles encounter length. Risk: it is a plaster over the fact that the
encounter is the whole game — a longer single fight is still a single fight, and `ideas.md` §6 already
identifies the health *curve across a run* as the thing that actually prices everything.

**B. Improve the Quarry's lead first, then tune health once.** Zero new rules — a CPU change, not a
rule change. It is already named as the obvious next step, and it removes a source of free player
damage that no decision earns. Risk: it may make the game harder in a way that is invisible and
unattributable to the player, since a skull the Quarry *declines* to lead is a thing that does not
happen on screen.

**C. Lower the payout ceiling instead of raising the bar.** `ideas.md` ships three costed one-line
variants — `Σn(n+1)/2` (mean 5.1, ceiling 21), `Σn(n−1)` (mean 4.0, ceiling 30, a lone trick pays
nothing), `Σn²/2` (mean 3.3, ceiling 18). Risk: PT-002 chose `n × n` days ago specifically because the
payout became callable in advance; changing the curve again before it has been played twice spends
that legibility for a tuning effect the health bar delivers without touching the rule.

**D. Accept it, and build the run.** The stated intent is that the shop raises the player's damage and
the health numbers move with it. On that reading the encounter is *supposed* to be short and the fight
is the run. Cost: everything — `ENCOUNTERS_PER_RUN` has no consumer and `QUARRY_ENCOUNTER_HEALTH`
holds one entry. Risk: it is the honest long answer and it leaves the game a walkover until it lands.

**A and B are not alternatives; they are an order.** B, measure, then A once.

---

## D2 and D3 — Treasure and Poison do nothing

### What the docs currently say, and the one part that is wrong

Play-test 2 §6 Q3 already raises this and states the choice as *"cut them to ordinary ranks, or give
them a job."* `the-hunt.md` goes further and predicts the outcome almost exactly — *"it will read as
a bug in the play-test."* It read as a bug in the play-test. Nothing here is a new finding; what
follows is the arithmetic those entries do not carry, plus one correction.

Play-test 2 §6 Q2 argues that abilities may not survive a six-card hand because *"many six-card hands
will contain none of them."* **That is wrong, and by a wide margin.** Five ranks carry an effect —
Swan, Fox, Woodcutter, Witch, Monarch — which is fifteen cards in a thirty-three card deck. A six-card
hand therefore holds **2.7 ability cards on average**, and the chance of holding none is
`C(18,6) / C(33,6)` = **1.7%**. Ability-free hands are rare, not normal.

That correction makes D2 and D3 *sharper*, not softer. She was not playing an ability-free game — she
had roughly three working cards a hand. The two inert ones stood out precisely because everything
around them did something.

And she was very likely to meet one. Six cards of the deck are named-but-inert, so the chance a
six-card hand contains at least one Treasure or Poison is `1 − C(27,6)/C(33,6)` = **73%**. Across the
two hands she played, better than nine times in ten. This was not bad luck; it is the common case.

### The cause is a name pointing at a mechanic that moved

Worth stating plainly because it changes what the fix is. In the base game, Treasure (7) gives the
trick's winner a point and Poison (8) — an expansion module — costs the winner a point. Both exist to
make a specific trick worth wanting or worth avoiding.

**This game already has that mechanic. It is the skull.** DLR-80 built "a trick you want to lose" as a
separate marker that can sit on any rank from 2 upward, dropped the base game's Poison-8 swap
entirely, and kept the card's name. So rank 8 is not an ability waiting to be designed — it is a
label left behind when its job was generalised onto a marker and reassigned to different cards.

That is Rosewater's resonance lesson running backwards. A familiar name teaches a mechanic for free;
a familiar name attached to nothing spends that subsidy and hands back a false promise. She went
looking for a mechanic because the card told her there was one.

### Three fixes

**A. Cut both names.** Rank 7 and rank 8 become ordinary numbered cards. **Zero new rules — it
deletes one**, since `RANK_NAME` is the only place the names live. It is the *Into the Breach* move:
remove the thing that cannot be communicated rather than explaining it. Risk: it spends two of the
seven pieces of borrowed vocabulary that make this feel like Fox in the Forest, and the deck gets
blander in exchange for being honest.

**B. Put the skull back on rank 8.** Weight rank 8 heavily in `SKULL_RANK_WEIGHTS`, so "Poison" names
a card that really is the dangerous one. **Zero new rules** — the curve is already a tunable with four
shipped variants. A stronger version costs one rule: *if the Quarry holds an 8, one of its skulls goes
there.* That makes the name true rather than merely likely, and it does not change what the shape
readout displays — it changes what the player can reason about, which is exactly what PT-001's hump
curve already does. Risk: it fights PT-001 directly. Hump peaks on ranks 5–6 because the middle band
is where the player's own card decides the trick; moving weight to 8 shifts skulls toward ranks that
win their own trick, which `ideas.md` measured as the *gentlest* setting. Naming coherence would be
bought with decision quality, and the trade is real.

**C. Give each a job in the live equation.** The shop analysis in `ideas.md` established the
vocabulary — every intervention must land on the bank, the multiplier, or which tricks you take — and
these two cards can use it. Treasure's natural analogue of "+1 point" is **+1 to the bank**: taking a
trick containing a Treasure banks 2 instead of 1. Poison's is a term on the other side. **One rule
each**, reusing fields that already exist.

The objection to C is that PT-002 removed card values from the bank on purpose, and this puts one
back. The answer is already written in `ideas.md`, in an entry about a different mechanic: the
superseded poison-as-damage entry found that **uniform** card-level effects are arithmetically a no-op
that shift no decision, and that such an effect is only ever a decision when it is *"concentrated and
visible: a named card, on the table, in a trick the player can choose to lose."* That is the exact
distinction. PT-002 removed a value spread invisibly across all thirty-three cards; this would add one
to three named cards the player can see and plan around.

It also closes something `the-hunt.md` records as missing — *"no card is worth declining"* — because a
**skulled Treasure** is a card worth taking and costly to take at the same time, which is the first
genuinely conflicted card the deck would contain.

---

## D4 — She wanted finishing early to count for something

### The observation is right and the prescription has a trap in it

Strip the request back. In a six-card hand every card is played, so "cards left over" can only mean
*the encounter ended before the hand did* — she is asking for **efficiency to be paid**.

`ideas.md` already contains this idea, twice, and both entries are better than the literal request.
Balatro's `$1 per unused hand` is recorded there as *"the device that rewards playing well… it fires
every single round and the player can see it coming"*, and the entry then sharpens the analogue: **a
streak break costs exactly 1 health, so health remaining is a count of streaks not broken.** It pays
for the one skill the game has, fires every encounter, needs no new quantity, and is already on
screen. It also passes the toll-booth test — the money-maximising line and the damage-maximising line
are the same line.

**So her instinct matches a device that is already costed, and it should not be re-proposed.** What is
new is the trap in the literal version.

### Paying for unplayed tricks pays the player to break their own streak

A cash-out only fires when the player **takes damage**, or at the end of the sixth trick. So to kill
the Quarry in the *middle* of a hand rather than at the end of it, you must deliberately lose a trick
to trigger the cash.

Worked, with the Quarry on 4 health entering a hand:

| Line | Play | Result | Unplayed tricks |
|---|---|---|---|
| **Play it out** | Take all six. Bank cashes at end of hand for 36. | Quarry dies on trick 6. | **0** |
| **Cash early** | Take tricks 1–2, then deliberately lose trick 3. Bank cashes `2 × 2 = 4`. | Quarry dies on trick 3. | **3** |

The second line trades **1 health for 3 unplayed tricks** and is strictly worse play. If unplayed
tricks pay more than a health point is worth, it is also the correct line. That is the identical
inversion that disqualified overkill as a payment basis — `ideas.md` §5 found overkill pays *"the
player to break their own streaks, which is precisely the skill the developer named as the only one
the game has"* — and Soren Johnson's warning applies unchanged: given the opportunity, players
optimise the fun out.

**Total tricks the encounter took** is a meaningfully better version of the same instinct. Over a
whole encounter the damage required is fixed, so dealing it in fewer tricks means longer streaks, and
the inversion only bites on the final cash-out rather than on every one. It is still weaker than
health remaining, which counts breaks exactly.

### But the honest reading of her note is not about money at all

There is no shop, no currency, and no consumer for either, and `ideas.md` is explicit that a currency
with no sink is a number that goes up and does nothing. Shipping an economy to answer this note would
be building the fifth thing first.

What she actually met was an encounter that **ended without an opinion**. She won efficiently and the
game said the same thing it would have said after a scrappy four-hand win. The design gap is that the
encounter has no success gradient — and that is answerable without any economy at all, by deciding
what this game considers a *good* win and stating it when the encounter ends.

That decision is the prerequisite for the payout rather than a substitute for it: whatever the
gradient measures is what the money should later read off.

### Three fixes

**A. Decide the encounter's success gradient and state it.** Name what a good win is — health
remaining, hands taken, longest streak, tricks the encounter needed — and report it when the fight
ends. **Zero new rules**; every candidate quantity is already tracked. Risk: none structurally, but it
is a genuine design decision about what this game rewards, and picking the wrong quantity now means
the later economy reads off the wrong thing.

**B. Pay it in health remaining, when there is something to spend it on.** Already costed in
`ideas.md`; not repeated here. Cost: one currency, one payout rule, one sink. Risk: it is a slippery
slope, and it makes `ENCOUNTER_PLAYER_RESTORE = 0` load-bearing rather than a placeholder, since health
becomes survival and wages at once.

**C. Pay it on tricks the encounter took.** Closest to what she actually said, and it survives the
worked trap above better than "cards left in hand" does. Cost: one currency and one payout rule.
Risk: still partly rewards where the killing blow happened to land, and it needs the run to exist
before it can be priced.

**Order: A now, B or C when the run exists.**

---

## How these fixes interact

Raising the Quarry's bar (D1-A) lengthens the encounter to about three hands, which is roughly what
the skill signal needs to become visible — so it is **compounding** with D4-A, because a success
gradient only reads as a gradient if wins actually differ from each other. At 1.9 hands they mostly
do not.

Fixing the Quarry's lead (D1-B) and raising the bar (D1-A) are **dependent, in that order**, for the
reason given above: the lead moves the number the bar is being tuned against.

Putting the skull on rank 8 (D2-B) and the hump curve (PT-001) are **clashing** — they compete for
the same weight table and pull toward opposite ends of the rank range. Naming coherence against
decision quality, and neither the hard floor nor frequency decides it. It is a developer call, and the
middle option (weight 8 comparably to 5–6 rather than above them) is a tuning value, not a design
answer.

Giving Treasure a bank term (D2-C) and PT-002's legibility claim are **in tension but not clashing**,
for the reason set out under D2 — three visible named cards is a different object from a value spread
invisibly across the deck. Worth watching rather than avoiding.

Cutting the names (D2-A) and giving them jobs (D2-C) are the two ends of the same axis; **shipping
both is incoherent**, and A is much the cheaper if the answer is that the deck does not need them.

---

## What to measure

Ranked by what they unblock.

1. **Re-run the harness with a skull-aware Quarry lead**, and read the win-rate column again. This
   gates every health decision, and the harness method is already recorded. Until it exists, any
   health number is being fitted to a CPU that is about to change.
2. **Play one encounter at a Quarry bar in the low-to-mid twenties** and ask whether the fight has a
   shape — whether a bad hand can be recovered from, and whether the second hand feels different
   from the first. That is what the flat 20–30 optimum is buying.
3. **Count how often a Treasure or a Poison is actually noticed** in the next session. The 73%
   figure says one is in hand most hands; the question is whether a player who has not been told
   still goes looking for what it does. If she was the only one, the name is a first-session problem
   rather than a permanent one.
4. **Log health remaining, hands taken, and longest streak for every encounter.** Three free numbers
   that decide D4's gradient question empirically rather than by argument — whichever of them
   actually separates a good win from a scrappy one is the one worth paying on.
5. **Ask her, unprompted, what she thinks a good win looks like.** She raised the gradient question
   without being asked; the answer to what it should measure is more likely to come from the same
   place than from this document.

---

## What is the developer's

The Quarry's health, and whether it moves at all before the run exists. Whether the payout curve
changes rather than the bar. Whether Treasure and Poison are cut, renamed, re-skulled, or given jobs
— and if given jobs, what each does. What quantity the encounter's success gradient measures. Every
price, every payout, and the shape of any curve.

**One thing that is not a tuning value and should be decided as a sequence rather than a number:**
the Quarry's lead comes before the health bar, and the success gradient comes before the currency. In
both cases doing it the other way round means doing it twice.
