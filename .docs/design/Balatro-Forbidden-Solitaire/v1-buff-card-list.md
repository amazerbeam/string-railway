# v1 Buff & Consumable Card List

Decided 2026-08-23, closing DLR-111 (T7a). Source grid: `version-5-developer-idea.md` §5.
Working notes and the full Q&A this was derived from: `DLR-111-v1-buff-list-review.txt` in this
same folder.

Three card categories (settled this session, not in the original §5 grid):

- **Goals** — a persistent buff, owned and equipped, that pays out when its condition is met during
  a hand.
- **Apply-to-card** — a persistent buff the player attaches to one specific card in hand at play
  time; suit/rank is never printed on the card itself.
- **Utilities / consumables** — one-shot, used immediately for an effect, no trigger condition.

Every printed template crosses with every reward listed under it to produce one **card template**
(each template carries its own bronze/silver/gold tier ladder, resolved at draw or use time — this
is a pool of *distinct templates*, not of individual tiered card objects). Rewards use a shared
master tier list, kept once and referenced by every template below.

## Reward master tier list

| Reward | Bronze | Silver | Gold |
|---|---|---|---|
| Flat damage bonus | +1 | +3 | +5 |
| Coin bonus | +2 | +5 | +10 |
| AP refund | 1 | 2 | 3 |
| +1 multiplier | +2 | +3 | +5 |

`MAX_REFUND_PER_HAND` (AP refund cap, required by DLR-111 AC4): **6**. DLR-124 added three more —
`MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND` and `MAX_COIN_BONUS_PER_HAND`, one
per remaining reward axis. All four values, their derivations, and the fact that these are
design-document figures rather than `config.ts` keys yet, are in
[The four per-hand caps](#the-four-per-hand-caps) below.

## How a card is named

The draft this document replaces addressed cards by grid coordinate — "template 3 crossed with
reward 1". That is fine for deciding what ships and useless as a content source for a generator, so
every card now has a name, and the naming is systematic rather than bespoke.

A card's name is two halves, because a card's identity is two things. A **family word** carries the
condition — what has to happen — and a **reward suffix** in parentheses carries the payoff. Twelve
family words and four suffixes between them name all 71 condition cards, and the point of the scheme
is that **a reader can decode any card name without a lookup**: `Bell-Taker (Momentum)` is *win a
trick with Bells, gain multiplier*, and nothing else it could be.

| Family word | Condition |
|---|---|
| Taker | Win a trick with suit S |
| Feeder | Lose a trick with suit S |
| Mark of the *R* | Win a trick with rank R |
| Sidestep | Dodge a skull with this card |
| Glutton | Eat a skull with this card |
| Hoarder | Reach a bank of N this hand |
| Unbloodied | Survive N tricks without a hit |
| Long Fall | Lose the next N tricks — **deferred**, see [#8 deferred](#8-deferred) |
| Debt Collector | Apply Damage this hand |
| Keepsake | Hold a card of suit S at hand's end |
| Miser | Have at least N coins |
| Cornered | Be below N% health |

| Reward suffix | Payoff |
|---|---|
| Blade | Flat damage bonus |
| Purse | Coin bonus |
| Second Wind | AP refund |
| Momentum | +1 multiplier (the reward's own tier ladder) |

The three suit-parameterised families — Taker, Feeder and Keepsake — prefix the suit, and the ranks
run 1–11, so `Moon-Feeder (Purse)`, `Key-Keepsake (Purse)` and `Mark of the 9 (Blade)` are all
well-formed names. The three suits are **Bells, Keys and Moons**.

The alternative considered and rejected was 71 bespoke names. Those read better on a card face and
are unmaintainable the moment a reward pairing moves: rename one reward and 71 names go stale.
**Every name here is copy and the developer's to overrule freely** — what matters is that DLR-112
has a stable identifier per template family to generate from, not which word each family got.

## The cost model

> **Agent-chosen, 2026-08-23, under DLR-111's sprint-run override of the tuning-value pause.**
> Everything in this section and every AP figure in the tables below was chosen by the agent
> authoring this document, not by the developer. This is unlike the reward master tier list above,
> the ship/no-ship calls, and the per-template reward pairings, all of which are developer
> decisions transcribed from `DLR-111-v1-buff-list-review.txt`. `CLAUDE.md`'s normal pause condition
> puts tuning values with the developer; this ticket's dispatch explicitly overrode that pause and
> required the numbers be chosen and justified so DLR-108 and DLR-112 are not blocked on them.
> Treat every number below as a first pass to be argued with, not as settled.

### The formula

```
apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)

REWARD_BASE          bronze  silver  gold
  flat damage           1       2      3
  coin                  2       3      4
  AP refund             1       1      1
  multiplier            2       3      5

CONDITION_MODIFIER   Taker 0 · Feeder +1 · Mark-of-rank -1 · Sidestep -1 · Glutton 0
                     Hoarder 0 · Unbloodied 0 · Debt Collector +1 · Keepsake 0
                     Miser -1 · Cornered -1
```

A formula rather than 78 hand-costed cards, deliberately. Seventy-eight numbers chosen individually
cannot be reviewed, retuned, or argued with — a formula can be argued with in one paragraph and
moved with two numbers, which is what a first-pass tuning artefact should be. Every operand is an
integer and the clamp is an integer clamp, so no cost is ever fractional and none can come out
`NaN`.

### What the numbers are calibrated against

The player starts a hand with `STARTING_AP = 6` and the pool refreshes **per hand**
(`AP_REFRESH_CADENCE`), so six is the whole budget for one hand's activations and the shop's
capacity item adds `+5` on top of it. Against that budget the cost bands read like this:

- **1–2 AP** — cheap enough to run two or three of these in the same hand.
- **3 AP** — one standard buff. This is the design doc's own working figure (§1: "the working
  example is 3 AP each"), and the model is anchored to it rather than to a number invented here.
- **4–5 AP** — this activation *is* your hand's play. You get one, and maybe nothing else.
- **6 AP and up** — not affordable at all until the `+5 AP` capacity item is bought.

### Why multiplier and coin cost more than flat damage

This is the load-bearing arithmetic in the whole model, and it is a **derived consequence, not a
preference**. Per `the-hunt.md` §7, the bank counts tricks and the multiplier climbs by exactly one
per trick taken, and the bank cashes as the *product* of the two. So a reward that adds to the
multiplier is multiplied by the bank when it cashes, and a reward that adds flat damage is not.

Worked, at a typical cash-out bank of 3: a bronze `+2 multiplier` turns a cash-out of `3 × 3 = 9`
into `3 × 5 = 15`, a swing of **6 damage**. A bronze `+1 damage` is worth **1**. Six times the
value, from cards that would otherwise sit in the same slot. If both cost the same, the multiplier
card is strictly correct and the damage card is strictly wrong at every tier, which is a dominant
option in Meier's sense — a choice with only one defensible answer is not a choice at all. The
multiplier base therefore starts at 2 and ramps to 5 at gold, where the flat-damage base runs 1/2/3.

Coin carries a smaller surcharge for a different reason: coins are **run-permanent**. A coin buys a
shop item that persists for the rest of the run, where damage is spent inside one hand and gone.
`COINS_PER_ENCOUNTER_WIN = 1`, so a bronze Purse paying `+2` is worth two encounter wins' income —
the coin base therefore sits one point above flat damage at every tier.

The AP refund base is flat at 1 across all three tiers for an arithmetic reason rather than a
judgement: the refund reward's own ladder is 1/2/3, so the tier already scales what the card gives
back. Charging more AP at a higher tier would claw back the exact thing the tier granted.

### Why the condition modifier is a discount, not a surcharge

The modifier prices **how often the card actually fires**, and it runs the opposite way to intuition:
a card that fires nearly every hand is *worth more AP*, not less. A hard-to-trigger card is
discounted for its unreliability, not surcharged for its difficulty.

That is why Feeder sits at `+1` and Mark-of-rank at `-1`. You can always throw away a trick in a
suit you hold, so `Lose a trick with Keys` fires close to every hand you are dealt a Key — it is
very nearly a free payout and should cost accordingly. `Win a trick with a 9` needs both the
specific card in a six-card hand (`HAND_SIZE = 6`) and the win, neither of which the player fully
controls, so it is discounted a point.

---

## Condition templates (persistent buffs)

Each template below lists its family name, its category, the rewards it crosses with, its card
count, and the AP cost of each of those crossings at bronze / silver / gold. Every figure is the
formula above applied to that family's modifier — transcribed, not re-derived per card.

| # | Family | Template | Category | Rewards crossed | Card count |
|---|---|---|---|---|---|
| 1 | Taker | Win a trick with suit S | Goal | Blade, Purse, Second Wind, Momentum | 3 suits × 4 = **12** |
| 2 | Feeder | Lose a trick with suit S | Goal | Blade, Purse, Second Wind, Momentum | 3 suits × 4 = **12** |
| 3 | Mark of the *R* | Win a trick with rank R | Goal | Blade, Momentum | 11 ranks × 2 = **22** |
| 4 | Sidestep | Dodge a skull with this card | Apply-to-card | Blade, Momentum | 1 generic × 2 = **2** |
| 5 | Glutton | Eat a skull with this card | Apply-to-card | Blade, Purse, Second Wind, Momentum | 1 generic × 4 = **4** |
| 6 | Hoarder | Reach a bank of N this hand (N = 2/3/4, tier axis) | Goal | Blade, Purse, Second Wind, Momentum | 1 × 4 = **4** |
| 7 | Unbloodied | Survive N tricks without a hit (N = 2/3/4, tier axis) | Goal | Blade, Purse, Second Wind, Momentum | 1 × 4 = **4** |
| 8 | Long Fall | Lose the next N tricks | Goal | — | **DEFERRED** (see below) |
| 9 | Debt Collector | Apply Damage this hand (prediction, no N) | Goal | Blade, Purse, Second Wind, Momentum | 1 × 4 = **4** |
| 10 | Keepsake | Hold a card of suit S at hand's end | Goal | Purse only (deliberate — damage is worthless at hand's end) | 3 suits × 1 = **3** |
| 11 | Miser | Have at least N coins (N = 5/10/20) | Goal | Blade, Momentum | 1 × 2 = **2** |
| 12 | Cornered | Be below N% health (60/45/33%, inverted — lower health, higher reward) | Goal | Blade, Momentum | 1 × 2 = **2** |
| 13 | — | (synergy) For every other buff active this hand | — | — | **NOT SHIPPING — superseded by DLR-124** |
| 14 | — | (synergy) If you also hold a gold-tier card | — | — | **NOT SHIPPING — still excluded, own reason (DLR-124)** |
| 15 | — | (synergy) If bank ≥ 2× multiplier | — | — | **NOT SHIPPING — killed by DLR-124** |
| 16 | — | (combo) Two co-triggering conditions on the same play | — | — | **SUPERSEDED** by DLR-124's Overlap Bonus |

**Condition template subtotal: 12 + 12 + 22 + 2 + 4 + 4 + 4 + 4 + 3 + 2 + 2 = 71 distinct card
templates.**

### AP costs, per family and reward

| Family | Modifier | Blade B/S/G | Purse B/S/G | Second Wind B/S/G | Momentum B/S/G |
|---|---|---|---|---|---|
| Taker | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Feeder | +1 | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 |
| Mark of the *R* | −1 | 1/1/2 | — | — | 1/2/4 |
| Sidestep | −1 | 1/1/2 | — | — | 1/2/4 |
| Glutton | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Hoarder | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Unbloodied | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Debt Collector | +1 | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 |
| Keepsake | 0 | — | 2/3/4 | — | — |
| Miser | −1 | 1/1/2 | — | — | 1/2/4 |
| Cornered | −1 | 1/1/2 | — | — | 1/2/4 |

Why each row sits where it does, relative to its neighbours:

**Taker (0)** is the model's zero point — winning a trick in a named suit is the ordinary thing a
player is trying to do anyway, neither reliable enough to tax nor rare enough to discount, so every
other family is priced as a deviation from it.

**Feeder (+1)** costs a point more than Taker at every single cell because you can always *throw
away* a trick in a suit you hold, so it fires close to every hand — losing on purpose is the one
outcome in this game that is entirely within the player's gift.

**Mark of the *R* (−1)** is discounted a point because it needs a specific one of eleven ranks to be
in a six-card hand *and* to win with it — two conditions the player does not control, where Taker
needs one they mostly do.

**Sidestep (−1)** carries the same discount for the same shape of reason: a dodge needs a poisoned
trick to exist and the player to attach the buff to the card that dodges it, and skulls do not
arrive on demand.

**Glutton (0)** sits at Taker's zero rather than Sidestep's discount because eating a skull is
something the player can *choose* to do once a skull is on the table, where dodging is contingent on
the trick going a particular way.

**Hoarder (0)** takes no modifier because its difficulty is already priced on the condition axis —
N runs 2/3/4 across the tiers, so a gold Hoarder is harder to fire *and* pays more, and applying a
discount on top would double-count the same escalation.

**Unbloodied (0)** is Hoarder's mirror image and priced identically for the identical reason: N is
the tier axis, so the tier ramp already does the work a modifier would otherwise do.

**Debt Collector (+1)** carries Feeder's surcharge because Apply Damage is the player's own button
(`the-hunt.md` §7 — you choose the moment the bank cashes), so this is a prediction the player can
simply decide to make true, which is exactly Feeder's reliability profile.

**Keepsake (0)** is priced flat at coin's base because holding a card of a named suit until hand's
end is neither hard nor automatic — it costs you the option of playing that card, which is a real
price paid in play rather than in AP.

**Miser (−1)** is discounted because its condition is a *run* state the player may simply not be in
— below 5 coins the card is dead in hand and refunds nothing, and a card that can be worthless on
arrival cannot be priced as if it always fires.

**Cornered (−1)** takes the same discount for the same reason from the other direction: the player
is usually above 60% of `PLAYER_START_HEALTH = 10`, so most hands this card does nothing, and the
hands where it fires are the hands they were losing anyway.

### Firing cadence

How often a template fires is decided by DLR-124's R4 and is a property of its **family**, not of its
reward. Transcribed here because it is what the AP costs above are calibrated against; the argument
for it — including why event families fire per trick rather than once a hand — is in
`hybrid-design.md` §5 → *Resolving several buffs on one trick — the stacking rule*, R4.

| Cadence | Families | Fires |
|---|---|---|
| **Event** | Taker, Feeder, Mark of the *R*, Sidestep, Glutton, Debt Collector | Once per trick on which the condition is true — so possibly many times in a hand |
| **Threshold** | Hoarder, Unbloodied, Miser, Cornered | Once per hand, on the trick where the condition first becomes true |
| **Terminal** | Keepsake | Once, at the moment the hand ends |

### #8 deferred

**Long Fall** — "Lose the next N tricks" — needs a UI answer for tracking a pending multi-trick goal
that hasn't been designed yet, and that design work is out of this ticket's time budget. Deferred,
not dropped — revisit once a UI answer exists (DLR-111 AC3). It is **not costed here**: pricing a
card whose interaction model is undesigned would be guesswork, and the family word is reserved so
the name is waiting when the template returns.

### #13–16 resolved against the stacking rule (DLR-124)

These four were previously "held back pending" the passive buff stacking idea. **That ticket has
run.** The hand-wide resolution rule is decided and argued in `hybrid-design.md` §5 → *Resolving
several buffs on one trick — the stacking rule*; each of the four now carries a permanent verdict
rather than a hold, and none is left ambiguous.

**#13 `For every other buff active this hand` — superseded, permanently excluded.** The **Overlap
Bonus** is the hand-wide version of exactly this, done once as a rule rather than as a card, so the
template would now be a second home for a fact the rule already owns. It is also worse than the rule
on its own terms: #13 counts buffs **active** — which the player simply buys with AP — where the
Overlap Bonus counts buffs **fired**, which requires the conditions to actually come true. Paying for
width with **no condition risk** is precisely the self-reinforcing loop DLR-111 AC4 flags.

**#14 `If you also hold a gold-tier card` — still excluded, for an independent reason that has
nothing to do with the stacking rule.** It is a **doubler on a reward** rather than an overlap rule,
and doubling is the one operation R2 forbids. Separately, it references another card's *tier* rather
than a game event, which makes it unreadable at the point of play — the player cannot see it fire.

**#15 `If bank ≥ 2× multiplier` — killed permanently, because it is arithmetically dead.** Per
`the-hunt.md` §7 ("The bank", "The streak multiplier", and the Whetstone table) a taken trick banks
`1 + Whetstone copies` while the multiplier climbs by exactly 1, so after *n* taken tricks
`bank = (1 + copies) × n` and `multiplier = n`. The condition `bank ≥ 2 × multiplier` therefore
reduces to `copies ≥ 1`: **never true with no Whetstone, always true with one.** It is a
Whetstone-ownership check wearing a condition's clothes — not a condition at all, at any tier, in any
hand.

**#16 the co-trigger combo template — superseded.** It is the `k = 2` case of the Overlap Bonus,
which is now a rule rather than a card.

**The v1 pool therefore stays at 78 as authored.** (What shipped is 73 — see *Total v1 pool size* below for the five consumables that were authored but never pooled.) No template count moves, and **DLR-112 is unblocked with a
permanent answer rather than a hold** — the hold is lifted in both directions: none of the four
returns under a later reading of the stacking rule, because the stacking rule is the reading.

---

## Utilities, consumables and activated cards

| # | Card | Effect | Tiers B/S/G | AP cost B/S/G | Card count |
|---|---|---|---|---|---|
| 1 | Ward | Single-use shield, absorbs up to N on the next hit, then breaks regardless | 1 / 3 / 5 absorbed | **2 / 2 / 2** | **1** |
| 2 | Puppeteer | Pick which of the opponent's legal moves they must play | single tier only | **4** | **1** |
| 3 | Second Thoughts | Extra discard charges this fight | +1 / +2 / +3 | 2 / 3 / 4 | **1** |
| 4 | Foresight | Peek the draw pile | 1 / 3 / 5 cards | 1 / 2 / 3 | **1** |
| 5 | Spyglass | Rule out N candidates of a chosen suit | rules out 1 / 2 / 3 | 2 / 3 / 4 | **1** |
| 6 | Cheat | Follow-suit lifted for N tricks | 1 / 2 / 3 tricks | **3 / 5 / 7** | **1** |
| 7 | Timebomb | Delayed hit: N to the Quarry, N/2 to you | 4/8/12 Quarry vs 2/4/6 player | **2 / 2 / 2** | **1** |

**Consumable / activated subtotal: 7 distinct card templates.**

**Ward** (the draft's "Protect N damage") is a single-use shield: it absorbs up to N on the **next**
hit taken and is consumed regardless of whether the hit was fully absorbed. Incoming damage at or
below N means the player takes 0 and the guard breaks; above N and the player takes the remainder
and the guard breaks.

**Puppeteer** is the reclassified force-a-card consumable (DLR-111 AC2, rewritten 2026-08-23). Play
it before playing your own card; from the opponent's legal moves, you choose which card they are
forced to play. **Hidden cards stay hidden** — but a *revealed* skull card can be routed around by
forcing a non-skull legal move instead. Reclassifying it from a repeatable buff reward to a one-shot
consumable bounds it to a single use, which is what resolved the original costing concern.

**Second Thoughts** stacks onto `DISCARDS_PER_FIGHT = 3`, so a gold one takes a fight's discards
from three to six.

**Spyglass** narrows a candidate list rather than scaling a number (design doc §5a). Worked example
from the developer's notes: the player holds 3 Bells and the opponent 2 more, with 3, 4 and 5
already played — 6 candidates remain (6b–11b), and the tier rules out 1, 2 or 3 of those 6.

**Foresight** is the cheapest ladder on the list because information is the weakest of these
effects: it changes what the player knows, not what they can do, and a peeked card still has to be
drawn and played.

### Three off-curve prices, and why each is a design claim rather than arithmetic

**Ward is flat at 2 AP at every tier.** `DAMAGE_PER_HIT = 1`, so against every hit the game
currently deals, absorbing 1, absorbing 3, and absorbing 5 are *the same outcome*: the player takes
zero and the guard breaks. Charging more for the gold version would tax the player for a better reel
that buys them nothing. The developer's own review file already marks the tiers above 1 as
"forward-looking"; this price is what a forward-looking tier is worth today, which is nothing extra.

**Cheat's gold is 7 AP, above `STARTING_AP = 6` — deliberately unplayable until the `+5 AP`
capacity item is bought.** Design doc §3 and DLR-107's own risk note both flag three tricks of
no-follow-suit as "close to a guaranteed run of wins rather than one clutch save", and both ask for
a costing pass before it ships active. This is that costing pass. The bronze rung at 3 AP is
deliberately the design doc's standard-buff figure, because a bronze Cheat *is* the Cheat that ships
today (`LegalMoveOptions.ignoreFollowSuit` lifts follow-suit for exactly one committed card), so
today's mechanic is priced as one ordinary buff and the escalation is what gets steep.

**Timebomb is flat at 2 AP at every tier**, because its tier price is already paid in **health**,
not AP: `TIMEBOMB_DAMAGE` puts 2, 4 or 6 on the player's side of a `PLAYER_START_HEALTH = 10` bar. A
gold Timebomb costs 60% of the player's total health to pull. Charging escalating AP on top would
bill the same escalation twice.

That flat price **agrees with `TIMEBOMB_TIER_MULTIPLIER = {1, 2, 3}` rather than implying a
different curve** — stated explicitly because DLR-111's dispatch asked for any disagreement between
this costing pass and that constant to be surfaced, and there is none. The whole tier cost lives in
the health figures the multiplier produces, and a flat AP price is what leaves it there.

### Cheat and Timebomb were missing from the draft

Neither appeared in the developer's draft list. They belong on it: design doc §1 folds both into the
buff pile ("both become ordinary buff cards, owned and drawn the same way everything else in the
pile is"), and `src/hunt/buffCatalog.ts` **already mints both as `Buff` objects today** via
`cheatBuff()` and `timebombBuff()`. Leaving them off understates DLR-112's `REEL_POOL_SIZE` by two.

## Total v1 pool size

**71 condition-template cards + 7 consumable/activated cards = 78 distinct card templates.**

> **What actually shipped is 73, and the difference is deliberate — DLR-132, 2026-08-24.**
> `BUFF_TEMPLATES` in `src/hunt/buffTemplates.ts` is the 71 condition templates **plus 2 activated
> cards (Cheat and Timebomb)**. The **five consumables — Ward, Second Thoughts, Puppeteer,
> Foresight and Spyglass — are authored here but not in the pool**, so nothing can draw them.
> DLR-132 established that adding them is five literals, five mint branches and ten weights, and
> deliberately left them out as a separate decision with its own weights; the boundary is pinned by
> `src/sim/reachability.test.ts` rather than by a comment. **DLR-136** tracks closing it.
>
> **78 remains the correct figure for this document**, which is the authoring record — all 78 were
> authored and costed here. Read it as "78 authored, 73 in the pool"; the count that governs
> `REEL_POOL_SIZE` today is 73.
>
> Also live and unreachable for the same class of reason: **Shield**, whose `shieldBuff` has zero
> production callers — the epic's one NOT MET Definition-of-Done criterion (**DLR-133**). And
> **Keepsake's 3 Purse cards are in the pool but can never fire** (**DLR-139**), so of the 73
> drawable templates, **70 do anything**.

This is the number that matters for DLR-112 (T8)'s `REEL_POOL_SIZE` sizing — each template carries
its own bronze/silver/gold ladder (resolved at draw or activation time via the reel-match rules, not
as separate pool entries), except Puppeteer, which is single-tier only.

## Worked examples (per AC1)

- **Bronze:** `Bell-Taker (Blade)` — "Win a trick with Bells: +1 damage." Costs **1 AP**.
- **Silver:** `Key-Feeder (Blade)` — "Lose a trick with Keys: +3 damage." Costs **3 AP**.
- **Gold:** `Mark of the 9 (Momentum)` — "Win a trick with a 9: +5 multiplier." Costs **4 AP**.
- **Coin:** `Moon-Keepsake (Purse)` at silver — "Hold a Moon at hand's end: +5 coins." Costs **3 AP**.
- **Consumable:** "Ward 3 — single use, absorbs up to 3 on your next hit, then breaks." Costs **2 AP**.
- **Activated:** "Timebomb, gold — 12 to the Quarry, 6 to you, on the next trick's resolution."
  Costs **2 AP**.

---

## The four per-hand caps

Each of the four reward axes accrues under its own named per-hand cap. Contributions past a cap are
clipped and lost. The three added by DLR-124 are argued in `hybrid-design.md` §5 → *Resolving several
buffs on one trick — the stacking rule*, R6; the arguments are **cited, not reproduced here**.

| Constant | Value | Unit | Derivation |
|---|---|---|---|
| `MAX_REFUND_PER_HAND` | 6 | action points per hand | `STARTING_AP` — a hand can at most double its budget (unchanged; full reasoning below) |
| `MAX_MULTIPLIER_BONUS_PER_HAND` | 6 | multiplier points per hand | the natural six-trick multiplier ceiling, so bought multiplier can at most *double* the earned one |
| `MAX_FLAT_DAMAGE_BONUS_PER_HAND` | 12 | damage per hand | one third of a perfect hand's 36, so Blade can *finish* a hand and never *replace* the streak |
| `MAX_COIN_BONUS_PER_HAND` | 10 | coins per hand | one gold Purse — the largest single coin reward the master tier list authorises; coins are the only run-permanent axis, so stacking never pays more than the best single card on it |

`MAX_MULTIPLIER_BONUS_PER_HAND = 6` is the identical move that set `MAX_REFUND_PER_HAND = STARTING_AP`
— a ceiling equal to what the hand earns unaided, so a bought axis can double the natural one and no
more.

### `MAX_REFUND_PER_HAND` — the original figure, reasoning unchanged

**`MAX_REFUND_PER_HAND` = 6 AP.** This satisfies DLR-111 AC4, which requires the AP-refund reward to
ship with a named, retunable cap stated alongside it.

Six is `STARTING_AP`. The cap is set equal to the starting pool so that **a hand can at most double
its budget** and a refund chain can never fund an unbounded number of activations. Without a cap the
failure mode is concrete rather than theoretical: gold Second Wind refunds 3, several
refund-carrying buffs can fire on the same trick, and the design doc's §5 table already flags the AP
refund reward as one that "could combo dangerously with the 'for every other buff' synergy
condition" — a synergy family this list holds back but does not delete.

### Two things all four figures are not

They are **not `config.ts` keys**: **DLR-108 is the ticket that creates all four**, and this document
only states the values they should be created with. And **none has been played** — each is reasoned
from the shape of the failure it prevents, not measured, and each is the developer's to move. The
three new ones are **agent-chosen**, under DLR-124's sprint-run override of `CLAUDE.md`'s
tuning-value pause, on the same footing as the AP costs in *The cost model* above; the register
naming every one of them is `hybrid-design.md` §5's closing *Every number here is the developer's to
move*.

## Open items — resolutions

The draft carried six open items forward. Each is resolved below, with the reading taken.

Items 1–4 were left open here on DLR-111 because they were parameters of a rule that had not shipped.
**DLR-124 shipped it**, and all four are now closed against it.

**1. Passive buff stacking — decided, on DLR-124.** The hand-wide resolution rule is per-axis and
additive, resolved in a five-step order per trick, bounded by four per-hand caps, with a linear
Overlap Bonus. It lives in `hybrid-design.md` §5 → *Resolving several buffs on one trick — the
stacking rule*, R1–R7. It is still a rules change rather than a content decision, which is why the
rule lives there and only its consequences for card content live here.

**2. Whether stacking multiplies by buffs fired or by co-triggering pairs — the basis is the count of
buffs fired, linear.** Pairs is `k(k−1)/2`, which at the AP-affordable `k = 6` pays 15 Momentum from
the bonus alone — two and a half times the entire natural six-trick multiplier ceiling — and grows as
the square of exactly what the shop's `+5 AP` capacity item sells. The argument is in
`hybrid-design.md` §5's R5.

**3. Whether stacking needs a cap — yes, and there are four,** in
[The four per-hand caps](#the-four-per-hand-caps) above. The previous text's observation still holds
and is now the reason there are four rather than one: `MAX_REFUND_PER_HAND` is the *AP* cap and
answers none of the rest, so `MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND` and
`MAX_COIN_BONUS_PER_HAND` answer the other three axes.

**4. Whether combo template #16 folds into passive stacking — it is superseded, not merely still
excluded.** That is the distinction this item asked for and could not make on DLR-111. #16 is the
`k = 2` case of the Overlap Bonus, so the rule does its job; it does not return under any later
reading. See [#13–16 resolved against the stacking rule (DLR-124)](#1316-resolved-against-the-stacking-rule-dlr-124)
above, where #13 is likewise superseded and #14 and #15 stay excluded for their own reasons.

**5. `MAX_REFUND_PER_HAND` — resolved to 6,** in the section above.

**6. Whether Hoarder (#6) and Unbloodied (#7) should really carry all four rewards — they keep all
four.**

> **This overturns a developer note rather than folding it in silently.** The review file marks
> #6/#7's full reward lists as "worth a second look... since bank/survive read more naturally as
> coin- or damage-only fits". They are kept at all four here, and the reason is that both conditions
> are **hand-shaped goals** rather than trick-shaped ones: they resolve over the whole hand, which
> is exactly the window every one of the four rewards is paid into. A Hoarder that pays multiplier
> is the most natural card on the entire list — reaching a bank of 4 *is* a multiplier of 4, and the
> reward compounds with the condition that earned it. A narrower subset would delete eight card
> templates for a readability intuition rather than an arithmetic problem. **The developer should
> confirm or reverse this**; it is a reversal of their own flag, not an agreement with it.

## The four weakest items on this list

Start a review here. These are the rows the author has least confidence in, and each fails for a
different reason.

**Ward silver and gold are identical in effect to bronze.** `DAMAGE_PER_HIT = 1`, so absorbing 1, 3
or 5 is the same zero-damage outcome against every hit the game currently deals. They are costed
flat at 2 AP precisely because the tiers buy nothing. **If `DAMAGE_PER_HIT` never moves, delete
these two rows rather than retuning them** — a tier ladder that changes no outcome is worse than no
ladder, because it teaches the player that gold means better and then lies.

**The bronze AP-refund card, `Second Wind` at bronze, is net-zero by construction.** The developer's
refund ladder is 1/2/3 and the cheapest activation on the whole list costs 1 AP, so a bronze Second
Wind on a Taker refunds exactly what it cost to activate. Two readings are available. Keep it as the
pool's deliberate floor card — the thing a bad reel gives you, which is a real design role — or
raise the refund ladder to 2/3/4 so the bronze rung pays a point of profit. **This document takes
the first**, because it preserves a developer-set ladder rather than moving one on the agent's
authority. The second is the better card, and it is the developer's to take.

**Miser (≥ N coins) fights the shop.** It pays an in-hand reward for a **run-long behaviour** — not
spending — and the shop is the run's only progression lever, so the card is asking the player to opt
out of the game's one meta system in exchange for a per-hand bonus. This is a structural awkwardness
rather than a costing one, and **no AP price fixes it**; the discount it carries makes it cheap, not
coherent. Flagged for deletion at the developer's discretion.

**`Keepsake` may be unfireable in an ordinary hand — a defect found on DLR-124, not a rewording
proposed.** Classifying `Keepsake` as the one **terminal** family (above) forced the question of what
"at hand's end" actually contains. With `HAND_SIZE = 6` and six tricks, the player's hand is **empty**
by the time the hand ends — every card has been played — so "hold a card of suit S at hand's end" is
false in every hand that runs its full six tricks. The only state that satisfies it is an encounter
that stops early (`the-hunt.md` §8, "Damage lands per trick, and an encounter can end mid-hand"),
which is a hand the player has just won or lost outright. That makes all **three** `Keepsake`
templates near-dead and, worse, dead in a way the card face does not admit — it reads as a normal
goal. It is priced at coin's flat base on the reasoning that holding a card "costs you the option of
playing that card", and that price assumes a hand in which holding one back is possible. **This
contract states the defect and invents no replacement**: the template's wording is the developer's,
and the fix could be a reworded condition, a different end-of-hand instant, or deleting the three
rows — three different games, and not an agent's call.

---

## Code-shape alignment: where this list fits `buffCatalog.ts`, and where it does not

DLR-111's dispatch requires this list either fit the shape `src/hunt/buffs.ts` and
`src/hunt/buffCatalog.ts` already define, or state with reasons where it must not. Both files were
read at authoring time. There are three ordinary widenings, one genuine misfit, and one field that
does not exist at all. **No code changes in this ticket** — this section states what DLR-108 and
DLR-112 must do.

### 1. Widening — `BuffKind` gains one member per template family

`BuffKind` currently holds exactly **three** members: `Unassigned`, `Cheat`, `Timebomb`. This list
needs **11 shipping condition families** (Taker, Feeder, Mark-of-rank, Sidestep, Glutton, Hoarder,
Unbloodied, Debt Collector, Keepsake, Miser, Cornered) plus **5 consumables** (Ward, Puppeteer,
Second Thoughts, Foresight, Spyglass), joining the existing three. Long Fall is reserved and not
added until the template ships.

This is an ordinary widening of a closed `as const` map — no existing member changes meaning, and
`Unassigned` stays exactly what it is, the placeholder `seedStartingBuffPile` mints. None of the 16
new names collides with an identifier already in `src/`.

### 2. Widening — `BuffRewardAxis` gains eight axes

`BuffRewardAxis` currently holds exactly **three**: `Magnitude`, `DurationTricks`, `HeartCount`.
This list needs `Coins`, `ApRefund`, `Multiplier`, `CardsRevealed`, `CandidatesEliminated`,
`DiscardCharges`, `DamageAbsorbed`, and `None` (for Puppeteer, whose effect is not a scaled
quantity).

This is **anticipated, not a break**: DLR-105's own comment on that union already says "A fourth
axis is a type change for whichever later ticket needs it." This is that ticket's list.

The `BuffTier` ladder — `Bronze` / `Silver` / `Gold` — **fits unchanged**. Every template on this
list is either a three-rung ladder on that exact vocabulary or single-tier (Puppeteer), and
single-tier is expressible by minting only at `Bronze`.

### 3. Genuine misfit — `BuffCondition` has no payload, but four families are parameterised

`BuffCondition` is, on disk today:

```ts
export interface BuffCondition {
  readonly kind: string
}
```

One string, no payload. But **Taker, Feeder and Keepsake are parameterised by suit** and **Mark of
the *R* is parameterised by rank**, and there is nowhere on this type to put either. That is 12 + 12
+ 3 + 22 = 49 of the 71 condition templates with no expressible identity.

Two ways out. Bake the parameter into `BuffKind` — `takerBells`, `takerKeys`, `takerMoons`,
`markOfThe1` … `markOfThe11` — which needs **33 suit-and-rank members** where 4 family members would
do, and which makes "is this a Taker?" a string-prefix test instead of an equality check.
Or give the condition an optional payload:

```ts
interface BuffCondition {
  readonly kind: string
  /** Present only on suit- or rank-parameterised families. */
  readonly target?: { readonly suit?: Suit; readonly rank?: number }
}
```

**The payload is recommended.** It keeps `BuffKind` one member per *concept* — which is what the
DLR-107 comment on that map says it is for, "WHICH card a buff is" — and it puts the suit where the
rest of the codebase already keeps a suit, as a `Suit`, rather than encoding it in a string that no
type checker can validate. It also means adding a fourth suit later costs zero new `BuffKind`
members instead of eleven.

### 4. Missing field — `Buff` carries no `apCost` at all

Verified at authoring time: **zero hits for `apCost` in `src/hunt/buffs.ts` and
`src/hunt/buffCatalog.ts`.** The only `apCost` hits anywhere in `src/` are `apCostFor` and
`apCostGiven` in `src/hunt/actionPoints.ts`, which are functions about the AP pool, not a field on
a buff.

So **every one of the 78 costs this document authors has no home on the type today.** This is the
largest shape gap on the list and DLR-108's first job. Two shapes are available: add
`readonly apCost: ActionPoints` to `Buff` and mint it at construction, or keep `Buff` as it is and
derive the cost from `(kind, tier)` through a lookup table beside `buffCatalog.ts`. The lookup is
the closer fit to how this document is written — the cost model is a formula over two small tables,
not 78 independent facts, and a lookup keeps it that way so retuning stays a two-number change.

Whichever shape wins, **`MAX_REFUND_PER_HAND = 6` belongs in `src/hunt/config.ts`** with the other
tunables, not inline at a call site — as do the three caps DLR-124 added beside it.

### 5. Missing state — the stacking rule needs a per-hand accrual

DLR-124's resolution rule needs one piece of state no current type carries: **four per-hand running
totals**, one per reward axis, each clamped at its cap —

```ts
/** Per-hand running totals, reset when a hand begins. NOT a field on `Buff`. */
interface BuffBonusAccrual {
  readonly multiplierBonus: number // clamped at MAX_MULTIPLIER_BONUS_PER_HAND
  readonly flatDamageBonus: number // clamped at MAX_FLAT_DAMAGE_BONUS_PER_HAND
  readonly coinBonus: number //       clamped at MAX_COIN_BONUS_PER_HAND
  readonly apRefunded: number //      clamped at MAX_REFUND_PER_HAND
}
```

Three properties of it, each of which is the kind of thing that gets lost in translation:

**It is state on the hand, not a field on `Buff`.** This is the same distinction finding 4 above
draws for `apCost` and it is drawn the same way: a `Buff` is the card the player owns, and how much
of an axis's cap has been consumed *this hand* is not a property of that card. Two copies of the same
card share one accrual, and the accrual outlives neither.

**It resets per hand and NOT on a hit.** A hit resets the multiplier itself to zero (`the-hunt.md`
§7) and **does not refund the cap** — a player who has spent all 6 of their Momentum bonus and then
takes a hit restarts the streak with no bonus left for the rest of the hand. That asymmetry is the
whole containment mechanism: without it the cap is a per-streak allowance refreshed by the very event
the player is trying to avoid, and a hand containing three hits would pay three full pools. "Reset
the buff state when the streak resets" is the obvious reading and the wrong one.

**It belongs in `src/hunt/**`,** behind the pure-core ESLint boundary that tree already carries, so
the whole rule stays unit-testable with no renderer. It is **DLR-108's to build**, alongside the four
`config.ts` keys.

### Cheat and Timebomb currently exist twice

DLR-107's deferred AC3 leaves both cards represented in two places: the **live felt mechanic** the
UI drives (`CheatStage` and `EnvenomStage` in `app/warCouncil/roundUiState.ts`), and the **inert
`buffCatalog.ts` representation** that nothing reads yet. `buffCatalog.ts`'s own header calls this
"the intended intermediate state of a migration split across tickets, not an oversight."

**This list targets the `buffCatalog.ts` representation.** The AP costs stated for Cheat (3/5/7) and
Timebomb (2/2/2) price the buff-pile cards, not today's bespoke felt-rail mechanics, and they take
effect when the migration completes — not before.

### Nothing here is persisted yet

No save record is invalidated by this document, because no code ships in this ticket and nothing on
this list is written to storage. **That window closes the moment DLR-112 writes a drawn buff into a
save**: from that point, renaming a `BuffKind` member or a `BuffRewardAxis` value breaks every
stored run. Worth stating now, while renaming is still free.
