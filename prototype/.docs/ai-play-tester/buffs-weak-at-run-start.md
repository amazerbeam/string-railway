# Buffs that are not useful at the start of a run

**Measured:** 2026-08-25. **Policy:** `baseline`. **Sample:** 1000 runs, `--seed 1`.
**Scope:** fight 0 (Aoife, 10 HP) — the run's opening encounter, which every run attempts exactly
once, so this is a clean won-vs-lost split with no run-length confound.

Re-run with `npm run sim -- --runs 1000 --seed 1 --policy baseline`; the per-buff split comes from
`HandReport.buffFireOutcomes` and `HandReport.buffWindowObservations` (`src/sim/types.ts`).

## The question

The opening buff pile is four real bronze cards (`startingPile.ts`). Do they actually help win
fight 0? For a third of the pool the answer is **no, and structurally so** — not "they are weak,"
but "their condition cannot be true yet."

## Index — what each card does

Conditions are stated once in `buffEvaluation.ts` → `buffFires`; tier thresholds in
`buffTemplates.ts` → `CONDITION_THRESHOLD`; firing cadence in `buffs.ts` → `BUFF_CADENCE`.

| Card | Fires when | Cadence |
|---|---|---|
| **taker** | You **win** a trick playing a named suit | every time |
| **feeder** | You **lose** a trick playing a named suit | every time |
| **markOfRank** | You **win** a trick playing a named rank (1–11) | every time |
| **sidestep** | A skull trick that **you lose** — you dodged the skull | every time |
| **glutton** | A skull trick that **you win** — you ate the skull | every time |
| **debtCollector** | You press Apply Damage | every time |
| **hoarder** | Your bank reaches 2 / 3 / 4 (bronze/silver/gold) | once per hand |
| **unbloodied** | 2 / 3 / 4 tricks in a row without taking damage | once per hand |
| **miser** | You hold 5 / 10 / 20 coins | once per hand |
| **cornered** | Health drops below 60% / 45% / 33% of starting | once per hand |
| **keepsake** | Final trick, and you still hold a named suit | once, at hand end |
| **cheat** | *You press it* — ignore follow-suit for 1 / 2 / 3 tricks | on demand |
| **timebomb** | *You press it* — prime a card, detonates for damage | on demand |

### The other half of a card: its reward axis

A card is **a condition CROSSED WITH a reward axis** (`buffTemplates.ts` → `TEMPLATE_FAMILIES`), so
the index above names only half of it. Bell-Taker paying flat damage and Bell-Taker paying coins
share a trigger and are different cards. Values are `REWARD_TIER_VALUE`, bronze/silver/gold:

| Axis | In-game name | You get | Bronze | Silver | Gold |
|---|---|---|---|---|---|
| `magnitude` | Blade | flat damage | 1 | 3 | 5 |
| `multiplier` | Momentum | multiplier points | 2 | 3 | 5 |
| `coins` | Purse | coins | 2 | 5 | 10 |
| `apRefund` | Second Wind | action points back | 1 | 2 | 3 |

Most families fan out over all four; `markOfRank`, `sidestep`, `miser` and `cornered` carry only
Blade and Momentum, and `keepsake` carries only Purse.

## How the opening pile is drawn

`startingBuffPileFor` draws **4 distinct bronze cards from all 73 templates**, weighted by
`openingPileWeightOf` — the sum of both slot machines' family weights (`SLOT_FAMILY_WEIGHTS`,
`slotWeights.ts`). `templateWeightFor` normalises within a family, so **a family's draw share equals
its family weight**:

| Weight | Cards |
|---|---|
| 7 | taker |
| 6 | feeder, glutton, hoarder |
| 5 | unbloodied, debtCollector |
| 4 | markOfRank, cheat, timebomb |
| **3** | **sidestep**, miser, cornered |
| 2 | keepsake |

Total 58. **The weighting runs against the measured value below**: `sidestep` — the strongest card in
the data — is tied second-rarest at 3/58, while `glutton` — the weakest — is twice as likely at 6/58.

## Baseline for comparison: what fight 0 looks like

| | Won (n=677) | Lost (n=323) |
|---|---|---|
| Hands | mean 2.17 | mean 3.09 |
| Tricks | mean 11.91, median 12 | mean 16.26, median 16 |
| Fastest | 3 tricks | 12 tricks (the fastest loss) |

A hand is up to 6 tricks. **The shortest loss (12 tricks) is longer than the median win (12) —
losing fight 0 is always the slow path.** 22.3% of wins finish inside a single hand; no loss does.

Hand 1 alone decides most of it: winners deal **5.78** and take 2.34 in hand 1; losers deal **2.21**
and take 3.68. Both sides start identical — 10 HP, 0 coins, four bronze cards — so that gap is the
deal, and it rarely reverses.

## The finding

"Fired" means the buff's condition actually came true and paid off, not merely that it was activated.

The two right-hand columns are **tricks to win** — measured among WINS only, split by whether that
buff fired. Read them against the population figure of **11.9 tricks**: below it, the fight ended
faster when the buff fired; above it, slower. Tricks rather than hands because a hand is up to 6
tricks, so hand counts round away most of the difference between these cards.

| Buff | What it does | fired WON | fired LOST | diff | tricks to win (fired) | (not fired) |
|---|---|---|---|---|---|---|
| sidestep | Skull trick **and you lose it** — you dodged the skull | 21.3% | 11.8% | **+9.5pp** | **11.3** | 13.1 |
| unbloodied | N consecutive tricks without taking damage (2/3/4) | 25.1% | 15.8% | +9.3pp | 11.8 | 11.4 |
| hoarder | Bank reaches N after a trick (2/3/4) | 27.2% | 22.6% | +4.6pp | 11.5 | 11.3 |
| debtCollector | You pressed Apply Damage (the press, not the landing) | 9.5% | 8.7% | +0.8pp | 14.0 | 12.0 |
| **miser** | You hold N+ coins (5/10/20) | **0.0%** | **0.0%** | 0.0pp | n/a | 12.8 |
| **keepsake** | Final trick **and** you still hold that suit | **0.0%** | **0.0%** | 0.0pp | n/a | 12.4 |
| **cheat** | *(activated)* ignore follow-suit for 1/2/3 tricks | **0.0%** | **0.0%** | 0.0pp | n/a | 11.9 |
| **timebomb** | *(activated)* prime a card, detonates for tier damage | **0.0%** | **0.0%** | 0.0pp | n/a | 10.7 |
| taker | You **win** a trick playing that suit | 25.7% | 26.3% | −0.6pp | 12.7 | 10.7 |
| markOfRank | You **win** a trick playing that rank (1–11) | 6.4% | 7.7% | −1.4pp | 12.7 | 12.0 |
| feeder | You **lose** a trick playing that suit | 13.1% | 16.1% | −3.0pp | 13.3 | 10.5 |
| cornered | Your health below N% of start (60/45/33) | 11.4% | 17.6% | −6.3pp | **15.1** | 9.8 |
| glutton | Skull trick **and you win it** — you ate the skull | 16.7% | 26.3% | −9.6pp | 13.9 | 10.1 |

`maximalist` reproduces the same ordering (sidestep/unbloodied/hoarder on top, glutton bottom), so
this is not an artefact of one policy's card play.

### What the trick columns add

- **`sidestep` is the only buff that speeds up the kill** — 11.3 tricks vs 13.1. It is simultaneously
  the biggest win-rate edge and the only genuine tempo gain, which is what a damage-prevention card
  should look like.
- **The other "positive" buffs are neutral or slightly slower on tempo.** `unbloodied` (11.8 vs 11.4)
  and `hoarder` (11.5 vs 11.3) raise the win rate but do not shorten the fight — further evidence
  they report an already-winning position rather than create one.
- **`cornered` carries the largest tempo penalty in the table**: 15.1 tricks to win when it fires vs
  9.8 when it does not. It cannot fire until health is below 60%, so it exclusively tags long, ugly
  wins. The ~5-trick gap is the situation, not the card.
- **The four dead cards' "not fired" figures are just the population mean** (~11–13 tricks). That is
  the finding: they ride along and move nothing in either direction.

## The reward axis matters as much as the condition

**Separate batch: 2000 runs, `--seed 1`, `baseline`** — won 1379, lost 621. Fields
`BuffFireOutcome.axis` / `.tier` / `.rewardValue` (added 2026-08-25) are what make this measurable;
before them the sim recorded only which condition fired, never what it paid.

| Axis | You get | fired WON | fired LOST | diff | tricks to win (fired) | (not) |
|---|---|---|---|---|---|---|
| `multiplier` | multiplier points | 40.8% | 30.3% | **+10.5pp** | 12.4 | 11.5 |
| `magnitude` | flat damage | 45.9% | 41.2% | +4.7pp | 12.6 | 10.8 |
| `coins` | coins | 27.0% | 29.5% | −2.4pp | 12.5 | 12.0 |
| `apRefund` | action points back | 35.5% | 40.7% | **−5.3pp** | 13.1 | 10.6 |

**Multiplier is the strongest axis; AP-refund is actively counter-indicated.** The cause is the same
reachability argument that kills `miser`: in fight 0 there is nothing to spend the other two on.
**Coins** buy nothing until the fight ends and the shop opens — a mid-fight coin is a promissory
note. **AP refund** returns action points, but AP is not the binding constraint in fight 0 (the
baseline already activates ~17 buffs a hand); refunding it only buys more presses of buffs that are
not paying. Only `multiplier` and `magnitude` convert into damage *this fight*, and multiplier
compounds against the bank where flat damage does not.

`durationTricks` reads 0.0% because it is the activated cards' axis (Cheat's duration) — the same
measurement boundary that zeroes `cheat` and `timebomb` below, not a finding about the axis.

### The axis can flip the verdict on an identical condition

Pairs with ≥40 fires, same batch. This is why a condition-only table misleads:

| Condition × axis | diff | | Condition × axis | diff |
|---|---|---|---|---|
| **sidestep** × multiplier | **+6.3pp** | | **feeder** × magnitude | +1.5pp |
| **sidestep** × magnitude | **+4.2pp** | | **feeder** × apRefund | **−4.8pp** |
| **taker** × multiplier | +3.1pp | | **glutton** × multiplier | −0.1pp |
| **taker** × coins | −1.5pp | | **glutton** × apRefund | −4.1pp |

`feeder` swings **6.3 points** between its Blade and its Second Wind version. The condition-only
figure of −3.0pp reported earlier in this document is those two averaged together, and describes
neither card. The same caution applies to every row of that table.

The two strongest pairs measured are **`sidestep` × multiplier** and **`sidestep` × magnitude** —
the damage-prevention condition, paid on the two axes that convert to damage in-fight.

## Three structural reasons a buff is dead at the start

### 1. The condition needs state the run has not accumulated yet

Thresholds are `CONDITION_THRESHOLD` (`buffTemplates.ts`); the opening pile is all **bronze**, so the
bronze figure is the one that applies.

| Buff | Bronze threshold | Why it cannot fire early |
|---|---|---|
| **miser** | 5 coins | The run starts on 0 coins and fight 0 precedes the first shop. Fired in **0.0%** of fight 0. |
| **cornered** | health < 60% of start | Requires having already lost 4+ HP. Only true once the fight is going badly. |
| **hoarder** | bank ≥ 2 | Needs a bank built up first — fires, but never on the opening tricks. |
| **unbloodied** | 2 clean tricks | Needs at least two tricks to have happened. |

### 2. The condition is a symptom, not a cause

Several buffs correlate with the outcome **backwards**, and the length column exposes it:

- **cornered** (health below 60% of start) — 15.1 tricks to win when it fires vs 9.8 when it does
  not. It fires *because* the fight is long and going badly; it does not make it so.
- **unbloodied** (N tricks in a row without being hit) — that is a measurement of already being
  ahead. Its +9.3pp is largely reverse causation.
- **glutton** (win a skull trick — eat the skull) — eating skulls means taking skull damage; −9.6pp,
  the worst on the board.

**`sidestep` (lose a skull trick — dodge the skull) is the one card with a clean causal story**: it
fires on damage actually prevented, and it is the only buff that both raises the win rate *and
shortens the fight* (11.3 tricks vs 13.1).

### 3. The card is activated and nothing presses it

`cheat` and `timebomb` are `BuffCadence.Activated` (`buffs.ts`) — they have no trigger, they wait for
a player action. The `baseline` policy never presses either, so both sit inert in the pile for the
whole of fight 0. This is a **measurement boundary, not a game defect**: `maximalist` does arm Cheats
and still shows no fight-0 benefit, but a human might use them better than either policy does.

Separately, five consumables (**Ward, Puppeteer, Second Thoughts, Foresight, Spyglass**) are declared
in `BuffKind` but are **absent from `BUFF_TEMPLATES`** — nothing mints them, so they cannot appear in
a run at all today.

## Cadence caps the ceiling too

`BUFF_CADENCE` (`buffs.ts`) means four of the eleven condition families — hoarder, unbloodied, miser,
cornered — are `Threshold`: they fire **at most once per hand** however often the condition holds.
`keepsake` is `Terminal`: at most once, at hand end. So more than a third of the pool is capped at a
single payoff per hand before the question of reachability even arises.

## Recommendation

**Status: proposed 2026-08-25, NOT implemented.** The developer will action this in a future ticket.
Nothing in `src/` has been changed by this document.

### Remove from the opening pile: `miser`, `keepsake`, `cornered`

| Card | What it does | Why it goes |
|---|---|---|
| **miser** | You hold 5+ coins | The run starts on 0 coins and fight 0 precedes the first shop, so 5 is unreachable. Fired **0.0%** across 1000 runs. Not weak — impossible. |
| **keepsake** | Final trick, still holding a named suit | Fired **0.0%**. One shot, last trick only, and its sole reward axis is Coins — which buy nothing until the fight is already over. |
| **cornered** | Health below 60% of start | Cannot fire until 4+ HP is already lost, so it only activates once you are losing. −6.3pp, and the worst tempo figure measured: 15.1 tricks to win vs 9.8. |

Frees 8/58 (~14%) of opening-pile weight.

### Remove from the opening pile: the `apRefund` axis; cut back `coins`

Independent of which condition carries them. Both fail fight 0 for the same reason `miser` does —
they pay in a currency the opening fight cannot spend.

| Axis | Verdict | Why |
|---|---|---|
| **`apRefund`** (Second Wind) | **Remove** | Worst axis measured, −5.3pp, and the worst tempo figure (13.1 tricks to win vs 10.6). AP is not the constraint in fight 0 — the baseline already presses ~17 buffs a hand — so refunding it just buys more presses of cards that are not paying. |
| **`coins`** (Purse) | **Cut back, do not remove** | −2.4pp. Coins buy nothing until the shop opens after the fight, so they are dead *during* fight 0 — but unlike AP they are banked and spent later, so the card is deferred rather than wasted. |
| `multiplier` (Momentum) | **Favour** | Best axis, +10.5pp. Converts to damage this fight and compounds against the bank. |
| `magnitude` (Blade) | **Favour** | +4.7pp. Converts to damage this fight. |

The current weighting runs the wrong way. `SLOT_AXIS_WEIGHTS` (`slotWeights.ts`) has Strongbox at
**Coins 4, ApRefund 3, Magnitude 1, Multiplier 1** — heaviest on the two axes that measure worst in
fight 0, lightest on the two that measure best. The opening pile sums both machines' tables, so that
lean reaches every run's opening hand.

**This may be the larger of the two levers.** Dropping three conditions removes ~14% of opening-pile
weight; re-pointing the axis table changes what the *remaining* cards pay in.

### Keep: `cheat` and `timebomb`

Both also read 0.0%, but that is **an artefact of the simulator, not a property of the cards**. Both
are `Activated` — the player presses them — and neither policy presses either during fight 0. A human
would. Removing them on a zero the simulator itself caused would be the wrong call; this document
cannot judge them.

### Keep this round: `glutton`

Worst win-rate figure (−9.6pp) but a *working* card, not a dead one: it fires normally, and its
condition (win a skull trick) simply correlates with taking damage. Whether that ought to be rewarded
is a design question, distinct from "this card cannot function yet."

### Also raise `sidestep`

Removing dead cards only stops the player drawing blanks; something has to replace them. `sidestep`
(dodge a skull) is the only card that both raises the win rate (+9.5pp) and shortens the fight
(11.3 tricks vs the 11.9 population mean), and at weight 3/58 it is rarely seen.

It also compounds with the axis recommendation for free: `sidestep` carries **only Blade and
Momentum** (`TEMPLATE_FAMILIES`), the two axes that measure best — there is no coins or AP-refund
version of it to draw. Raising it and re-pointing the axis table push in the same direction.

### Implementation note — do not edit `SLOT_FAMILY_WEIGHTS` or `SLOT_AXIS_WEIGHTS`

There is no opening-pile weight table. `openingPileWeightOf` derives from the slot machines' tables
deliberately (DLR-135 AC3 declined to add a third table of unchosen numbers), summing
`templateWeightFor` across both machines — which reads **both** `SLOT_FAMILY_WEIGHTS` (the condition)
and `SLOT_AXIS_WEIGHTS` (the reward axis).

So editing either table to fix the opening pile would **also reshape both slot machines**, and that
is not wanted in either direction:

- `miser` and `cornered` are reasonable later in a run, once coins exist and damage has been taken.
- `coins` and `apRefund` are the Strongbox machine's whole identity — it is the run-permanent-reward
  machine by design. Stripping those axes there would delete the machine's purpose to fix a fight-0
  problem.

**The fix belongs to the opening pile alone**, and the seam already exists.
`seedStartingBuffPile` takes `weightOf` as a defaulted parameter, documented for exactly this ("so a
curve can then be tested without mutating module state"). One opening-pile-only weight function can
carry every change above — drop the three conditions, drop the `apRefund` axis, cut `coins`, raise
`sidestep` — with both slot machines untouched.

### Not yet measured

**No part of this recommendation has been simulated.** Every figure above measures the game as it
stands today; none of them measures the game with these changes applied. The case for each removal
is its fire rate and its reachability argument, not an observed win-rate delta.

The obvious next step is to implement the override behind a new `SimPolicy`-independent weight
function, re-run fight 0, and compare the win rate against the 67.7% baseline recorded here.

## Observations, not decisions

Stated as measurements; which to act on and by how much is the developer's call.

1. **Four cards contribute exactly nothing to fight 0** — miser, keepsake, and (under both policies)
   cheat and timebomb. In a four-card opening pile, drawing one is a meaningful fraction of the
   player's opening capability.
2. **The buffs that do help are the ones that prevent damage**, and only `sidestep` does that
   cleanly. This matches the separate finding that fight 0 is lost to damage-taken spikes in hand 1
   rather than to insufficient damage output.
3. **Half of what a card is was invisible until 2026-08-25.** The reward axis moves the outcome as
   much as the condition does — `feeder` spans 6.3pp across its own two versions — so any earlier
   conclusion in this project drawn from a condition-only tally describes an average of cards that
   behave differently, not a card.
4. **The gap opens in hand 1 and rarely closes.** Any lever intended to help fight 0 has to work on
   the opening hand — the shop is unreachable, no buffs have accumulated, and AP capacity has nothing
   worth spending on that can fire.

## Related

- `.docs/implementation/run-winnability-simulation.md` — the simulator's own implementation record.
- `src/hunt/buffEvaluation.ts` → `buffFires` — the single statement of every condition above.
- `src/hunt/buffTemplates.ts` → `CONDITION_THRESHOLD`, `REWARD_TIER_VALUE` — the tier figures.
