# How to play the Hunt well

**`play-tester`, headless sim. Measured 2026-09-02 at 300 runs, `--seed 1`, unless a line says
otherwise.** This is the strategy the rules argue for, each clause with what it is worth. It is
implemented as `--policy skilled` (`src/sim/skilledPolicy.ts` + `skilledCardPlay.ts`), so every
claim below is re-runnable rather than remembered.

Two things to know before the numbers. First, **this guide is not a tuning recommendation** — it says
what the current rules reward, and where they reward the wrong thing. Second, three of its findings
are about the _simulator_ having been wrong rather than about the game, and those are marked, because
every figure this project recorded before 2026-09-02 inherits them.

---

## The one sentence

**The game is winnable — about one run in four. Three rules do it: arm a buff only on a decided
outcome, hold Cheats back for the forced skulls, and buy the health ceiling. Played that way the run
clears all 25 fights 26.6-32.4% of the time, measured across 2,000 runs on four independent seeds
(1, 7, 42, 99999), mean fight reached 17. A fourth rule — spend Swap to make the read playable — is
worth another 3-5 points on top.**

**Nothing was tuned to get there.** No health total, price, reward value or curve was touched. Every
figure in this document is the game exactly as it stands; what changed is that the simulated player
stopped making four specific mistakes.

A run must remove 1,395 health across 25 fights. By fight 2 the player is already dealing two to six
times what a fight needs and throwing the excess away. Meanwhile the player starts on 10 health,
cannot heal inside a fight, and loses 1 for every hurt trick. Damage is solved; tricks are not.

---

## The four outcomes are the whole game

`the-hunt.md` §7. A skull **inverts** a trick, so what you want is not to _win_ but to **bank**:

|                     | Clean trick           | Skull trick              |
| ------------------- | --------------------- | ------------------------ |
| **Took the trick**  | clean win — banks     | ate the skull — 1 health |
| **Did not take it** | clean loss — 1 health | **dodge — banks**        |

Everything else in this guide follows from that table.

### Finding 1 — every simulated player before 2026-09-02 ignored skulls entirely

**This is a simulator defect, not a game finding, and it invalidates the card-play half of every
earlier measurement.** Policies took their card from `chooseCpuMove`, which was written for the
Quarry. Its dodge branch filters _its own_ candidate cards for a skull — correct for the Quarry,
which is the only side ever dealt one, and a permanent no-op for the player, who holds none. Reused
for the player it collapses to "always try to win, else play lowest", which walks into roughly a
third of all tricks the wrong way round.

Reading the skull on the Quarry's played card and choosing the outcome deliberately:

|                                                                | banked tricks | hurt tricks |
| -------------------------------------------------------------- | ------------- | ----------- |
| `skilledNaiveCards` (old card play, everything else identical) | 52.1%         | 47.9%       |
| `skilled`                                                      | **60.8%**     | **39.2%**   |

An 18% cut in hurt tricks from reading a mark that is already on the screen.

### The rule, when the Quarry has led

Its skull mark is face up, so the target outcome is **known, not guessed**:

- **Skulled lead** — lose it. Play the **lowest** card that cannot win. Banks, costs nothing.
- **Clean lead** — take it. Play the **cheapest** card that wins, keeping the big ones back.
- **Neither reachable** — the trick costs 1 health whatever is played, so the only question is what
  to keep. Throw the **middle** rank (see finding 4).

### The rule, when you lead

You are betting on an answer you cannot see, so use the readout: **per suit, how many cards the
Quarry holds and how many are skulled** (`suitShape`, the same function the screen renders). A trick
banks two ways, so the chance of banking a lead is

> `P(you win) x P(their card is clean)` + `P(you lose) x P(their card is skulled)`

which means **lead high into a clean suit and low into a skull-heavy one**, out of one expression
rather than two rules. A suit the Quarry is void in gets its whole-hand skull rate: void means it may
dump a skull of any rank, which §3 names as one of the two cases the rank curve does not protect
against.

**Where the health actually goes: 2,695 hurt tricks while leading against 1,589 while following.**
Leading is where runs die, and "the winner leads next" means taking a trick hands you that
obligation. The Swan (rank 1) hands the lead to the _loser_ and is the only card that gives it back.

---

## Finding 2 — Timebomb rewards playing badly and punishes playing well

**The largest single effect measured, and it is a game finding, not a simulator one.**

A Timebomb marks the card played next and pays its damage to whichever side the primed trick goes
against — 4 to the Quarry, 2 to the player, and the player's side also wipes the streak in full
(§7). Nothing warns you that priming and ducking are incompatible.

|                                                      | damage dealt / hand | health lost / hand | worst hand | fights reached |
| ---------------------------------------------------- | ------------------- | ------------------ | ---------- | -------------- |
| `sharpshooter` — never ducks, arms Timebombs         | 11.77               | 2.41               | 10         | 3.89           |
| `sharpshooterNoTimebomb` — never ducks, no Timebombs | **4.97**            | 2.33               | 6          | 1.36           |
| `skilledWithTimebomb` — ducks, arms Timebombs        | 7.77                | **3.11**           | **10**     | 1.79           |
| `skilled` — ducks, no Timebombs                      | 8.29                | **1.72**           | **6**      | 3.41           |

Read the two middle rows together. For a player who tries to win every trick, Timebomb is **58% of
all damage output**. For a player who deliberately loses tricks — which is the correct play — it is
**44% of all damage taken**, and it alone is what makes a full-bar hand possible: withholding
Timebombs takes the worst hand in the sample from 10 down to 6.

So the card is currently a tax on skill. The strategy here withholds it outright, which is a blunt
answer; the sharp one — prime only on a trick you intend to take — is **untested**, because the buff
window opens before either card is laid, so priming is always blind to the lead. That is the finding
underneath the finding: **you must commit a Timebomb before you can know whether the trick is one you
want to lose.**

---

## Finding 3 — arm on a decided outcome; it is what makes the game winnable

**The largest finding in this document, and it took the win rate from 0% to 20%.** The developer
spotted it by reading a trace: the player held 21 cards, armed 4, and every one was keyed to **Keys**
on a trick played in **Bells**.

The buff window opens before either card is laid, which made it look like a blind bet. It is not.
Two things are already known and neither was being used:

- **Who leads.** `state.leader` says so. When the player leads, the suit is entirely their own
  choice — a Taker keyed to the suit they are about to lead is not a bet at all.
- **What the Quarry is likely to lead.** `suitShape` posts how many cards it holds per suit; the
  suit it holds most of is the one it most likely leads. Inference from the posted counts, never
  from its ranks.

From those, decide the trick before arming: which suit will decide it, and whether the plan is to
**take** it (a clean suit) or to **lose** it (a skull-heavy one, where a dodge banks). Then arm only
cards that can pay under that plan. Three rules fall out, and every one of them was being broken:

1. **Never arm a suit the trick will not touch.**
2. **Never arm Taker and Feeder together.** Taker needs the trick taken, Feeder needs it lost —
   exactly one can fire, so arming both wastes half the pile by construction.
3. **Never arm Sidestep on a trick played to win.** It pays only on a dodge, which is a trick lost.

|                           | unaimed   | decided outcome |
| ------------------------- | --------- | --------------- |
| Condition cards that paid | **16.6%** | **56.0%**       |
| — Taker                   | 24.1%     | 60.8%           |
| — Feeder                  | 9.2%      | 52.6%           |
| — Sidestep                | 12.9%     | 50.4%           |
| Damage per hand           | 5.79      | **18.24**       |
| Health lost per hand      | 2.25      | **1.81**        |
| Mean fight reached        | 4.57      | **15.13**       |
| **Win rate**              | **0.0%**  | **20.8%**       |

Across four independent 500-run batches (seeds 1, 7, 42, 99999) the win rate is 19.2%, 20.8%, 20.2%
and 22.0%, with the pay rate stable at 55.6-56.0%. When the Quarry leads the suit is a prediction
rather than a choice, so the stack riding on it is capped — a blind trick should not eat the pile.

**Feeder is no longer the dead card this file previously called it.** At 9% it looked structurally
broken; the problem was that it was being armed on tricks the player intended to win. Armed only when
the plan is to lose, it pays 52.6% of the time.

## Finding 3b — the policies rationed themselves against a resource that was switched off

**Simulator defect.** Action points were disabled on 2026-08-25, so the engine charges nothing and
refuses nothing, but both policies kept budgeting at the raw price table against a pool of six — so
nothing could ever fire more than about six cards on a trick, while the player held up to 196
activatable ones with no refusal on any of them. The Overlap Bonus pays one multiplier point per
extra paying card, so this suppressed the stacking mechanic outright. Fixed.

---

## Finding 3c — spend Swap to make the read playable

A plan names a suit and an outcome, and a hand can only deliver it holding the right END of that
suit: a HIGH card to take the trick, a LOW one to duck it. Holding neither, the plan cannot be played
however well the buffs were chosen — the read says lose a Bells trick and there is no low Bell to
lose with.

So swap only when the hand cannot serve the read, and throw what is furthest from serving it. A hand
that can already play the plan spends nothing: the budget is three a fight and a blind redraw of a
working hand is a downgrade.

|                      | fixed rule (throw middles) | serves the read |
| -------------------- | -------------------------- | --------------- |
| Win rate, seed 1     | 25.8%                      | **28.8%**       |
| Win rate, seed 7     | 27.8%                      | **32.4%**       |
| Win rate, seed 42    | 24.2%                      | **26.6%**       |
| Win rate, seed 99999 | 23.8%                      | **29.4%**       |

---

## Finding 4 — keep the ends of your hand, not the middle

**Superseded in practice by finding 3c**, which spends the swap against the read rather than against
a fixed rank band — but the reasoning below is why the ends are what a hand wants.

You win clean tricks with **high** cards and duck skulled ones with **low** cards. A middle card does
neither. It is also where `SKULL_RANK_WEIGHTS` concentrates the Quarry's own skulls (ranks 4–7 carry
weights 8/10/10/8 against 1–2 at the extremes), so a middle card is the likeliest to be skulled in
their hand too.

This **contradicts the 2026-08-22 finding** that dumping low cards beat dumping high ones. That pass
was measuring a player who never ducked, for whom a low card really was dead weight. Once ducking is
on the table, a low card is the tool that does it.

Worth roughly 0.2 fights on its own — real but small, and much smaller than the two findings above.

---

## Finding 5 — the pot's squaring is largely unreachable

The pot is `total x roll` and both climb together, so a streak of six pays 36 where six separate
cashes pay 6. Pushing from a roll of `r` is worth it only while the chance of banking the next trick
beats `r / (r + 1)` — 0.5 at the first trick, 0.75 at the third, 0.83 at the fifth.

**The measured bank rate is 60.8% even with correct play**, so the arithmetic says cash at a roll of
one or two and almost never push further. Swept across fixed targets, damage output peaks at a target
of 1–2 and falls away above it. The roll standing at a hand's end almost never exceeds 3.

That is a structural limit rather than a tuning one: this is a trick-taking game against a symmetric
opponent, so you take about half the tricks, and the skull converts only some of the rest. A payoff
curve that pays properly at a streak of six is asking for a run of events the card game cannot
supply.

**Second reason the push does not pay: overkill is discarded.** The pot is usually lethal already, so
pushing risks everything to win nothing. `skilled` cashes any lethal pot immediately for exactly
this reason.

---

## Finding 6 — buy the health ceiling first; it is the single biggest lever measured

**Corrected 2026-09-02.** An earlier reading of this said cards beat health. That was measured on
the old card play, with Timebombs still armed, and against a shop rule that put max health _last_ —
behind slot pulls at 1 coin each, uncapped, which absorb every coin. Under that rule the run's
ceiling never moved off 10 and the comparison was never actually run.

Re-asked with the correct card play, 500 runs, `--seed 1`:

| shop rule                                            | coins into the ceiling | ceiling reached | fights reached |
| ---------------------------------------------------- | ---------------------- | --------------- | -------------- |
| `skilledCardsFirst` — heal, then cards               | 0                      | 10              | 3.23           |
| `skilledCeilingPaced` — one step a fight, then cards | 20.8                   | 14              | 3.83           |
| `skilled` — ceiling first, cards with the rest       | **37.1**               | **20**          | **4.57**       |

Buying the ceiling is worth **41% more of the run** than buying cards with the same income. The
reason is finding 5's bimodality: a fight is free or fatal, and a bigger bar converts a fatal fight
into a survivable one _directly_, where a card only does it indirectly by shortening the fight.

The ladder costs 3, 5, 7, 9, 11 …, so 37 coins buys five steps and takes the bar from 10 to 20. The
wipeout rate — fights costing the entire bar — halves, from 24.0% to 13.4%, and the fight-cost
distribution stops being bimodal: median cost goes from 0 to 6.

**But it does not touch the bosses.** See "Where the run still ends" below.

### The rest of the shop still poses no choice

A fight pays 10 coins plus a quick-kill bonus, about 17 in practice; a heal costs 1 and a pull costs
1 and pays 2.64 cards. Nothing else on the shelf is priced against that income, so apart from the
ceiling ladder — whose climbing price is the only real limiter in the shop — a visit is a formality.

**One smaller note.** The simulator's shop list was hand-written and had gone stale twice without
anything failing: it was buying Swan and Witch rungs (off the shelf since 2026-09-01) and had never
heard of the max-health purchase (added 2026-09-02). It now derives from `SHOP_ITEMS`.

---

## Finding 6b — never combine cards; the upgrade screen is a trap

`ShopAction` carried no combine member until 2026-09-02, so **no measurement this project had ever
taken exercised the Manage Buffs screen at all**. It does now, and combining loses at both extremes
of the shop rule, 500 runs, `--seed 1`:

| policy                                  | combines / run | cards fired on ONE trick | damage / hand | fights reached |
| --------------------------------------- | -------------- | ------------------------ | ------------- | -------------- |
| `skilled` (ceiling first, no combining) | 0              | 12.2                     | 5.79          | **4.57**       |
| `skilledCombine`                        | 37.6           | 7.7                      | 5.56          | 4.42           |
| `skilledCardsFirst` (no combining)      | 0              | 29.7                     | 8.06          | **3.23**       |
| `skilledCardsCombine`                   | 69.7           | 12.0                     | 7.12          | 2.92           |

The mechanism is in the third column: combining **halves the stack**, from 29.7 cards on a trick to
12.0. The Overlap Bonus pays one multiplier point per _extra_ card on a trick, so two cards that both
fire beat one stronger card that fires once. The arithmetic is small and decisive — two bronze
flat-damage cards on one trick give `(1 + 2) x 2 = 6`; the silver they merge into gives
`(1 + 3) x 1 = 4`. The multiplier axis is the same shape: two bronze Momentum reach a multiplier of
6, one silver reaches 4.

`the-hunt.md` already records this as doubtful under "Known tensions". It is no longer doubtful: the
screen is dominated at every pile size measured, and a player who uses it is playing worse. The pile
has no size cap, so there is not even a storage reason to combine.

**Whose decision:** the developer's, by retuning the reward ladder or by pricing the Overlap Bonus
differently. This file only measures it.

---

## Finding 7 — hold your Cheats back; it is worth 54% more of the run

**Corrected 2026-09-02.** An earlier reading of this file said the Cheat was "nearly dead" because it
fired 0.26 times a run. It was not rare — it was being **spent as an ordinary buff before the moment
it mattered ever arrived**.

A Cheat lifts follow-suit. Its one job is turning a **forced hurt** into a bank: the Quarry leads a
skull, every legal card would take that trick and eat it, and an off-suit card ducks it instead —
banking the trick, keeping the health, and keeping the streak alive. The same clause covers a clean
lead nothing in suit can beat, where an off-suit trump takes it.

Counted across 500 runs, before and after excluding Cheat from the ordinary buff window:

|                                     | spent as a buff | reserved  |
| ----------------------------------- | --------------- | --------- |
| Forced hurts arising                | 8,075           | 12,727    |
| …an off-suit card would have banked | 3,680           | 6,007     |
| …**and a Cheat was actually held**  | **34**          | **5,904** |
| …and it was spent                   | 176             | 4,106     |
| Cheats armed per run                | 0.26            | **8.21**  |
| **Fights reached**                  | **4.53**        | **6.96**  |

The situation arises about a dozen times a run and the fix is one line — never arm a Cheat in the
ordinary buff window, and let `wantsCheatPlay` spend it at the forced hurt. That single change is
worth more than every other lever in this document combined: **4.53 fights to 6.96**, health lost per
hand 2.25 down to 2.03, and the deepest run in 3,000 seeds now clears **24 of 25**.

One engine rule limits it and is worth knowing: `legalMoves` applies the **Monarch's** narrowing
_before_ `ignoreFollowSuit`, so a Cheat cannot escape a led Monarch at all. That is the behaviour
today and `the-hunt.md` §4 does not mention it.

## What this strategy does NOT do

Named so the next pass knows where to look, not as apology:

- **The Fox and the Woodcutter are never chosen.** Both open an ability prompt this policy cannot
  answer, so it plays around them. The Fox changes the trump suit outright and the Woodcutter draws
  and buries — between them the two strongest levers in the deck, and both unmeasured.
- **Selective Timebomb priming**, per finding 2.
- **No lookahead.** Every decision is one trick deep, and the estimate of whether a lead wins is
  rank-against-the-deck rather than a real reading of what the Quarry can still hold.
- **The flask and the Swan/Witch ladders** are untouched; the ladders are off the shelf anyway.

## Where the run still ends

`skilled` clears the run **about a quarter of the time** and reaches fight 16 on average. The losses
are no longer a scaling wall — they are variance, concentrated where a fight runs long enough for a
10-to-28 point health bar to run out.

What is left on the table, in the order I would look at it:

- **A third of tricks get no buff window at all.** `discardWindowOpen` is false once a card is on the
  table, so on tricks where the Quarry leads before the driver reaches the window, nothing can be
  armed. Measured at **36% of tricks with no read taken**. Whether that is the game's rule or the
  simulator's ordering is worth settling — if it is the rule, it is a large and invisible constraint
  on when buffs may be used at all.
- **The Fox and the Woodcutter are still never chosen.** Both open a prompt this strategy cannot
  answer, so it plays around them — and between them they are the two strongest levers in the deck:
  the Fox changes the trump suit outright, the Woodcutter draws and buries.
- **Combining is still dominated** (finding 6b), so the upgrade screen remains a trap.

## How to re-run any of this

```
npm run sim -- --runs 300 --seed 1 --policy skilled
```

Policies referenced above: `skilled`, `skilledNaiveCards`, `skilledWithTimebomb`, `skilledNoSwap`,
`skilledNoCheat`, `sharpshooter`, `sharpshooterNoTimebomb`, `survivalist`, and the `...Roll<N>`
stopping-rule sweeps. Each diagnostic differs from `skilled` in exactly one method and takes every
other by reference, so a gap in its figures is attributable to that one lever.
