# The Hunt — play-test 2 and the redesign it produced (2026-08-13)

**What this file owns.** The design that came out of play-test session 2 — the rules as they would be
played, what is deleted to get there, and the numbers that are still open. It is a **proposal to build
against**, not a ruleset: nothing here is in
[`../../game_rules/the-hunt.md`](../../game_rules/the-hunt.md) until it ships.

**Where the observations live.**
[`the-hunt-play-test-feedback.md`](./the-hunt-play-test-feedback.md) §5 owns the raw session-2
feedback — the six verbatim observations and their diagnosis. This file does not restate them; it
starts from their conclusion.

**Scope.** One encounter. No Forage, no shop, no run.

---

## 1. The problem, in one line

The player could not steer the trick count, and nothing resolved until trick 13.

The declaration asked for a commitment to a three-wide band out of fourteen outcomes, while
follow-suit — the mechanic whose entire job is to take trick-count control away from you — decided
where you actually landed. And because the multiplier depended on the final count, no trick could be
scored when it was played. The developer's description of the resulting rhythm: *"boom, think ...
lose ... eh..... boom, oh no I'm fucked."*

The failure underneath the *"eh"* is worth stating precisely, because it is what the new design is
built to avoid: **pending damage on a band multiplier is non-monotonic.** Winning a trick could
*lower* your pending number by shoving you out of a band. Per-trick feedback existed and it read as
noise.

**One correction to the first reading of this.** The initial diagnosis blamed the *delay* — damage
arriving only at trick 13 — and proposed applying damage per trick. That was wrong, and the design
below is deferred on purpose. **Balatro is deferred too**: chips accumulate, the multiplier applies,
and *then* it fires. The satisfaction is the cash-out. What made ours bad was never the delay; it was
that the number moved in both directions. A bank that only ever climbs is the good version of the
same shape.

---

## 2. The frame

> **Balatro is poker *minus*. The Hunt was Fox in the Forest *plus*.**

Balatro discarded poker's entire game — no opponent, no bluffing, no betting — and kept only its
*vocabulary*, the nouns a player already owns. We kept the whole of Fox in the Forest and added a
declaration, an inversion, two multiplier tables, capture piles, a pile swap, health, pending damage,
rounding, rule-breaks and a telegraph on top of it. Roughly **fourteen concepts before the first
card**, against Balatro's four — and Balatro's fifth onward are *acquired*, one Joker at a time, by
the player's choice.

This redesign is the subtraction:

| Before | After |
| --- | --- |
| follow suit · trump/decree · 7 named abilities · declaration · rank inversion · which pile pays · 2 multiplier tables · 4 Standing bands · rounding · health · pending damage · rule-break · telegraph | follow suit · trump/decree · **skulls** · **the bank** · **the multiplier** · health · abilities |

---

## 3. The design

### 3.1 The hand

**Six cards each. Six tricks. Then re-deal.**

The decree sets trump, follow-suit applies, trick resolution is the base game's, and the winner of a
trick leads the next — all unchanged.

Six rather than thirteen does three jobs:

- **It makes information affordable.** Full visibility is paralysing at thirteen cards because
  thirteen tricks against thirteen known cards is a large tree to plan. At six, §3.5's readout can be
  generous without turning the hand into a computation.
- **It re-deals more often** — more fresh starts, more variance, Balatro's blind structure rather
  than one long grind.
- **Nothing depends on thirteen any more.** Once the bank is the scoring vehicle, hand length is only
  *"how many tricks before the bank is forced out."*

### 3.2 The four outcomes

This is the whole game, and it fits in a table:

| | Result |
| --- | --- |
| **Win a clean trick** | both cards go to your bank · multiplier climbs |
| **Lose a clean trick** | 1 damage · **bank cashes out** · bank and multiplier reset |
| **Win a skull trick** | 1 damage · **bank cashes out** · bank and multiplier reset |
| **Lose a skull trick** | both cards go to your bank · multiplier climbs |

**The skull inverts the trick.** On a clean trick you want to win. On a skull trick you want to
*lose* — and dodging one is rewarded exactly as winning a clean trick is: you take the cards, and
your multiplier keeps climbing.

That is the property the Standing band was reaching for and failed at. The band made *"do I want this
trick?"* a question about the other twelve tricks, resolved at the end, via a lookup table. The skull
makes it a question about **this trick**, answerable **now**, from **what is on the table**.

Stated as one line, which is the version a player should be able to hold:

> **Make them eat the skulls. Win everything else.**

### 3.3 The bank and the multiplier

- **The bank** is the summed ranks of **both** cards in every trick you take — clean tricks you win,
  and skull tricks you dodge. It only ever climbs.
- **The multiplier** is the **number of tricks you have taken in a row**. A dodged skull counts. It
  resets to zero the moment you take damage.
- **Cashing out** is `bank × multiplier`, applied to the CPU's health. It fires automatically when
  you take damage, and again at the end of the sixth trick. Both are then reset to zero.

A worked hand:

| Trick | | Bank | Mult |
| --- | --- | --- | --- |
| 1 | win clean, 11 + 9 | 20 | ×1 |
| 2 | win clean, 10 + 7 | 37 | ×2 |
| 3 | **dodge** a skull, 4 + 2 | 43 | ×3 |
| 4 | lose clean → **1 damage** | **cash 43 × 3 = 129** → 0 | ×0 |
| 5 | win clean, 8 + 3 | 11 | ×1 |
| 6 | win clean, 9 + 2 | 22 | ×2 |
| — | end of hand | **cash 22 × 2 = 44** | — |

**Why the multiplier is here at all.** It is the one part of this design that is not a subtraction.
`Chips × Mult` is the thing being chased — the run-up, the explosion, the number that gets stupid.
Flat damage is entirely additive and has no peak. Removing the bands without replacing the multiplier
would have fixed the rhythm and deleted the pay-off.

**And it is the multiplier, not the health, that makes losing hurt.** One damage is a small thing; the
real cost of losing a trick is that you are **cashed out early at whatever multiplier you had reached**
instead of the one you were climbing toward. That is push-your-luck with the stop button held by the
opponent — and it produces the described shape by construction: **boom, boom, BOOM, ...oh no.**

### 3.4 Skulls

**Roughly 30% of the CPU's cards carry a skull. Never rank 1.**

**Why never rank 1, and what the rule actually is.** To dodge a skull you must *lose* its trick. So:

- A **high** skull, led at you, is easy to dodge — play low and let it win.
- A **low** skull, dumped into a trick you are already winning, is the dangerous one: you committed
  your card before you saw it. A skulled 1 is the extreme case, because nothing can lose to it.

> **A skull's threat is inversely proportional to its rank.** Low skulls are ambushes; high skulls are
> announcements.

The only defence against a low skull is knowing it exists *before* you lead into its suit — which is
what §3.5 is for. Excluding rank 1 removes the case where no amount of foreknowledge helps.

> **This reverses an earlier reading, recorded so it is not re-derived.** Before the dodge rule was
> settled, the guidance here was "weight skulls toward high ranks, because a skull that can't win is
> an undodgeable tax." Under the inversion in §3.2 that is backwards: a high skull is the *safe* one.
> The rule about rank distribution is now an open question — see [§6](#6-open-questions).

### 3.5 What the player can see

**The CPU's hand stays face down. Its *shape* does not.**

> Per suit: how many cards the CPU holds, and how many of those are skulled.
> e.g. **Bells 3 (1 skull) · Keys 1 · Moons 2**

Two separate things are being fixed and they are worth keeping apart.

**Counting suits is bookkeeping; reading ranks is judgement.** Revealing the shape removes the
tedious half and keeps the interesting half. You know a keys lead strips them; you do not know
whether your 7 of keys wins.

**Revealing the skulls is what makes §3.4's ambush survivable.** Without it, low skulls are
undodgeable by construction and session 2's observation 11 — *"I had no choince but to take the
trick"* — comes straight back wearing a skull. With it, the ambush becomes a **planning problem**: you
can see which suits are mined and lead low into them deliberately, forcing the CPU's own skull to win.
That is a real, learnable play built out of rules that already exist.

**The full hand was considered and rejected** — see [§7](#7-discarded-branches).

### 3.6 What "winner leads next" is now worth

Unchanged from the base game, and it now earns its place. With mined suits on the table, leading is
sometimes a liability, and winning a trick hands you that obligation. So **winning carries a visible
cost**, which enriches the decision for free. The rule was inert before; skulls give it a job with no
edit.

The dealer rule is likewise unchanged and parked.

---

## 4. What is deleted

Removed by this design, not deferred.

| Deleted | Why it goes |
| --- | --- |
| The four Standing bands and both multiplier tables | Six tricks give seven possible outcomes, which cannot carry four bands without one trick swinging a whole band — and the streak multiplier replaces what they were for |
| The Win/Lose declaration | It selected the multiplier table and the card-value scheme. Both are gone, so it has nothing left to select |
| Rank inversion (`12 − rank`) | Dies with the declaration |
| The Lose-path pile swap and `CardValueScheme` | Dies with the declaration |
| Spoils and the capture piles | Replaced by the bank, which is per-streak rather than per-hand and cashes rather than accumulating |
| Damage rounding | No fractional damage is producible |
| Pending damage | The bank *is* the pending figure, and unlike the old one it only climbs |
| End-of-Hunt damage application | Replaced by the cash-out, which fires several times a hand |
| 13-trick hands | Replaced by six |
| Health at 1,350 / 1,600 | Replaced by §5 |

In implementation terms that retires most of DLR-63 through DLR-71. That is the correct trade: it is a
prototype and the reasoning is banked in `.docs/`.

---

## 5. The numbers

**Settled**

| | |
| --- | --- |
| Hand size | **6 cards each, 6 tricks** |
| Player health | **25** |
| Damage to the player | **1**, every time they take damage (losing a clean trick, or winning a skull trick) |
| Skull density, first CPU | **~30%** of its cards |
| Skull exclusion | **never rank 1** |

**Not settled, and deliberately not guessed**

**CPU health cannot be derived honestly yet.** It depends entirely on how large real cash-outs get,
which depends on how long streaks actually run — and that is a function of play, not arithmetic. The
worked hand in §3.3 deals 173 in six tricks, but that hand wins five of six tricks; a hand that trades
evenly might deal a third of it. **Take the figure from one play, not from this document.**

Two things are known about the shape of it, though:

- **The numbers are asymmetric, and that is correct.** Balatro tracks *4 hands, 3 discards* — small
  integers held in the head — against score requirements of 300, 800, 2,000. Same here: the player's
  25 stays small and readable, and the CPU's bar lands in the hundreds or thousands because it is
  absorbing `bank × multiplier`.
- **Skull density is the difficulty dial, not CPU health.** Raising health lengthens a fight; raising
  density makes it *harder*, because more tricks are ones you must dodge. It is also a dial the player
  can see getting worse.

**The rate, for setting health later.** The CPU takes 2–3 tricks a hand off a competent player, plus
whatever skulls land, so the player loses roughly **2–4 health a hand**. Health ÷ 3 ≈ hands per
encounter. 25 gives something like eight.

---

## 6. Open questions

Ranked by how much depends on the answer.

1. **How are skulls distributed across ranks?** §3.4 establishes that low skulls are the dangerous
   ones, which inverts the earlier guidance. Excluding rank 1 is settled; whether the rest should skew
   low (more ambushes), skew high (more announcements), or stay uniform is untested and changes how
   the game feels more than the 30% does.
2. **Do the abilities survive at six cards?** The Fox, Witch, Woodcutter, Swan and Monarch are much of
   what makes this feel like Fox in the Forest, and many six-card hands will contain none of them.
   Either the deal is weighted toward odd ranks, the deck shrinks so they are proportionally commoner,
   or ability-free hands are accepted as normal.
3. **Treasure (7) and Poison (8) still do nothing.** No play-time ability, and since DLR-67 no scoring
   intervention. The skull is a *marker*, not rank 8, so rank 8's name is now actively misleading. Cut
   them to ordinary ranks, or give them a job.
4. **Does the slippery slope need a brake?** Losing a trick punishes you twice — 1 damage *and* an
   early cash-out at a small multiplier — while winning compounds. That is Balatro's shape and may be
   exactly right, but it means a bad hand is very bad. Watch for it before adding anything.
5. **CPU health, per encounter.** Deliberately unset — see §5.

---

## 7. Discarded branches

Recorded so the reasons are not re-derived.

**Instant per-trick damage.** The first proposal, and the one this design replaces. Rejected once it
was clear the problem was the *non-monotonic* number rather than the delay, and that Balatro is itself
deferred. Its good property — that something resolves visibly on every trick — is preserved by the
bank, which moves on every trick and only ever climbs.

**Damage equal to the "pot" (summed ranks), applied instantly.** Keeps the trick two-sided but puts
mental arithmetic on every trick, which is what breaks the rhythm. The summed ranks survive as the
*bank*, where they are added up once and cashed rather than computed and applied thirteen times.

**Trump captures as the scoring rule** (*"remove the target band and make it about capturing
trumps"*). Rejected for having a dominant option — you always want the trick — which deletes the one
property that makes follow-suit interesting.

**Skulls that damage but still cash out.** The version where winning a skull trick and losing a clean
trick have identical consequences. Rejected because the skull then marks a trick where nothing good
can happen rather than one you should actively dodge — no decision attaches to it. The dodge rule in
§3.2 is what makes the skull a decision.

**Revealing the CPU's full hand.** Rejected on two grounds: it makes a hand *solvable* against a
deterministic CPU, so difficulty comes from the deal rather than the opponent; and planning a full
line is *more* thinking, not less, trading frozen-from-ignorance for frozen-from-analysis. §3.5
reveals exactly what the skull mechanic needs and nothing beyond it.

**A balanced deal — four cards of each suit.** Not rejected on merit; **parked**. It removes hand-shape
variance entirely, and §3.1's six-card hand plus §3.5's readout may already deliver what it was
reaching for. Worth revisiting if short suits still feel arbitrary in play.

**Per-side stakes rather than the player's own bank.** An earlier shared-number variant where the
stakes belonged to the table and either side could eat them. Superseded — the bank belongs to the
player, which is what makes the cash-out a pay-off rather than a coin flip.

**Player-held skulls.** Would restore the *squeeze* — leading a skull into a suit where the opponent
is short of low cards. Genuinely the best play the mechanic can produce, and out of scope here: this
build is one encounter and there is no shop in it. The obvious first thing a shop should sell.

**A player-triggered cash-out button.** Moved to
[`ideas.md`](./ideas.md) → Raw, where it is costed. The automatic cash-out is the simple case, not the
only one.

---

## 8. What to watch in the next play-test

Three counts and one question. None need instrumentation.

1. **Count the tricks you deliberately dodge.** If you never throw a skull trick, the inversion is not
   producing a decision and the mechanic has not fixed what the band failed at. This is the falsifier
   for the whole design.
2. **Count how often you were *forced* to eat a skull** — no legal card that lost the trick. If that
   is most of them, §3.5's readout is not enough and the rank distribution needs work. If it is almost
   none, density is too low to threaten.
3. **Record your biggest cash-out each hand.** That number is what CPU health has to be set against,
   and it is the only way to get it honestly.
4. **Did the multiplier ever change a decision?** If you never once played differently because the
   multiplier was high, it is decoration and should be cut rather than tuned.

**And re-run the standing benchmark.** Session 1's only comparative measurement — *"it should play
similar to the first hand of a fresh anti in balatore, and I don't think it does"* — has never been
repeated. Play one fresh Balatro ante, then one hand of this, and answer the same question. It is the
only measurement in this project's history that would produce a trend.

**One scoping note.** In a one-encounter build a competent player should beat the first CPU
comfortably. That is the design working, not the game being too easy. The test is not whether you won
— it is whether the six tricks felt good getting there.
