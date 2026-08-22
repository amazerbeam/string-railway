# Version 5 — Developer Idea: The Buff Loadout, Slot Draws, and a Delayed Apply Damage

Captured 2026-08-22, from a live design conversation. **This is the developer's own idea, mid-shape —
not committed scope like [`version-5-scope.md`](./version-5-scope.md).** Several numbers below are
still open. Treat this the way `ideas.md` treats a strong entry: worth building toward, not yet a
queued ticket.

**Two lanes `version-5-scope.md` explicitly paused have both been reopened by this idea, on its own
logic, and the developer has now lifted both pauses.** Choosing which slot machine to pull from (§3)
is this cycle's answer to "choice under scarcity." The Vault (§8) is this cycle's answer to
cross-run meta-progression. Both were paused for a reason — neither was designed yet — and both got
designed anyway, by following where the buff-loadout idea actually led rather than by deciding up
front to build them.

## 0. The problem this answers

Apply Damage, as shipped, has no felt cost. Because the telegraph shows the Quarry's suit and stance
and the player can always see their own hand, almost every trick's outcome is foreseeable before it's
played — and Apply Damage is available right up until the card is committed. So a player can see
danger coming and cash out ahead of it, every time, at zero cost. The only thing in the whole game
that's currently invisible — and so the only genuinely unavoidable risk left — is a pending poison
hit. Everything else got engineered, on purpose, to be readable, which means Apply Damage ended up
insuring against essentially all of it for free. This idea is a structural answer to that, not a
number tweak.

## 1. A pre-hand buff loadout

Before each hand, the player can spend **Action Points** to activate owned buffs for that hand. The
bottom of the screen carries four actions: **Apply Buff**, **Cards** (select a card; greyed out until
one is chosen, then highlighted), **Swap** (the existing discard/reshape mechanic, given a home on the
same bar rather than its own separate rail), and **Apply Damage**.

**Cheat and Timebomb (Envenom, renamed in `version-5-scope.md`) fold into the buff pile rather than
staying separate mechanics.** Today each has its own bespoke arm-and-tap ritual and its own felt rail;
under this idea, both become ordinary buff cards, owned and drawn the same way everything else in the
pile is. This is a real simplification — one shared interaction model instead of three parallel ones
— but it isn't a demotion: the developer's own example (see a suit imbalance in the "what the Quarry
holds" readout — "they have 3 Bells, I have none" — and pop the Cheat right then) confirms these stay
**reactive**, held in the pile and sprung mid-hand in response to what's actually happening, not
locked in during a pre-hand-only pick. Whether *every* buff card behaves this way, or only some, is
still open — see §4.

Buffs are bought once from the shop and owned permanently, the way a Whetstone purchase is — but
unlike Whetstone, owning a buff doesn't make it always-on. Each hand, the player chooses which owned
buffs to bring, spending AP per buff (the working example is 3 AP each), and can stack several if the
budget allows. That splits *owning* a thing from *using* a thing into two separate decisions — the
mechanism that makes Balatro's shop feel like deck-building rather than shopping, reused here through
this game's own vocabulary instead of copied wholesale as a Joker system.

Example buffs given in the original conversation, verbatim:

- "Losing a trick with Bells, +2 damage multiplier."
- "Win a trick with a 2, +10 damage."
- "Choose a card to mark: avoid a skull with this card, +10 coins."
- "Choose a card from the opponent's hand that they must play, if legal."

The last one is a genuinely new kind of interaction — nothing else in the game lets the player
constrain the Quarry's choice directly — and needs its own costing pass before it ships; it's easy to
imagine it being disproportionately strong.

**AP capacity is itself a run-permanent purchase** — the developer's own confirmed answer: a shop item
grants **+5 AP**, the same shape as Whetstone raising the bank's climb. So the loadout genuinely grows
over a run rather than staying fixed, which is a second progression axis sitting alongside the always-on
passives (Whetstone, and the Bulwark idea from `version-5-scope.md`).

**Health-buffing is deliberately deferred**, on the developer's own instinct — build the AP economy
first, and design a purchasable max-health increase separately once that instinct can be checked
properly. Worth stating why the instinct is sound: DLR-82 already ruled out raising the player's
*starting* health as an answer to the run's difficulty, on the grounds that a bigger bar delays the
same wall rather than removing it. A purchasable increase to *maximum* health, earned rather than
free, isn't obviously the same thing — but the same argument plausibly still applies, and that's worth
resolving explicitly before this ships, not assumed away because the money changes hands differently.

## 2. Apply Damage becomes a real bet

Pressing Apply Damage no longer cashes the bank instantly. By default, the payment is **queued** and
resolves after the current trick plus the next trick's resolution — a one-trick delay — and **taking
damage during that window resets the queued value exactly as an ordinary hit would today.** This is
the piece that actually answers §0: the value isn't safe the instant you press the button, so cashing
out early is a real bet on surviving one more trick, not a guaranteed escape.

This reuses plumbing the game already has. Poison's delayed hit is already a queued figure on
`EncounterState` that can be discarded if the encounter ends before it resolves
(`hunt/envenom-and-the-delayed-hit.md`) — this is the same shape, applied to a voluntary cash-out
instead of an involuntary one.

Two buffs modify the delay directly: **"Apply damage time −1 trick"** shortens it, and **"Apply damage
immediately"** removes it entirely — meaning today's zero-risk instant version becomes a purchasable
upgrade rather than the baseline everyone starts with. That's a clean way to keep the current mechanic
reachable as an earned end-state without it being free from turn one.

**One complication that needs an answer before this is buildable:** the quick-kill payout counts the
player's unplayed cards *at the instant the Quarry's health reaches zero*. If a killing Apply Damage is
deferred a trick, that count either needs to freeze at the moment the button is pressed (so a "quick"
kill still means what it says) or the payout needs its own rule for a delayed kill — resolving it at
the delayed moment would count fewer unplayed cards than the play that actually earned it, quietly
punishing exactly the fast, decisive line this bonus exists to reward.

## 3. Buffs are drawn from a slot machine

Rather than a fixed shop menu, the player picks **which machine to play** before pulling — different
machines lean toward different kinds of buff (a permanent-upgrade machine versus a trick/fight-buff
machine) — then pulls **three reels**.

- **Three different cards** — the player gets all three, each at **bronze** (tier 1).
- **Two reels match** — that card becomes **silver** (tier 2); the third, different reel is still
  received as a separate bronze card.
- **All three reels match** — a single **gold** (tier 3) card.

Each buff has a fixed escalation across its three tiers, and **the tier doesn't have to scale the
same axis for every card** — the worked example, Bells damage bonus, is **+1** at bronze, **+3** at
silver, **+5** at gold, but Cheat and Timebomb each tier along a different axis entirely:

- **Cheat's tier is duration** — how many tricks the follow-suit break lasts, not a magnitude. A gold
  Cheat holding for three tricks is a large jump from today's single-card version — for those three
  tricks every card in hand is legal, which is close to a guaranteed run of wins rather than one
  clutch save, and needs real costing before it ships.
- **Timebomb's tier is damage.** Still open: does the tier raise only the Quarry-side damage (making
  a higher tier strictly better to pull, same 2-health risk either way), or does it keep today's 2:1
  ratio and scale both sides together (bigger reward, proportionally costlier backfire)? Not urgent,
  but worth deciding before real numbers go on it.

**Choosing a machine before pulling reopens something `version-5-scope.md` explicitly paused** —
choice between differently-weighted offers is the "choice under scarcity" gap that scope doc named as
future-build, not this cycle. This might be exactly the right vehicle for that gap once it arrived on
its own terms, or it might be worth keeping separate from this idea entirely. That's a real decision
point, not a foregone conclusion, and it's flagged here rather than resolved.

## 4. What's still open

- **How many distinct buffs sit on one machine's reels.** This single number decides whether gold
  cards feel like a rare jackpot or a routine outcome. Worked example, independent uniform reels: at
  **5** possible cards per machine, three reels land a gold triple about **4%** of the time and three
  different cards about **60%**; widen the pool to **10**, and gold drops to about **1%** while
  three-different climbs to **72%**. Same mechanic, very different feel.
- **Whether a pull costs anything** — coin per pull, one free pull per shop visit, or a reroll option —
  none of this was specified in the original conversation.
- **Whether buffs, once pulled, are owned permanently** (a growing pool drawn against with AP every
  hand, which is the reading used throughout this document) **or consumed on the hand they're pulled
  for.** These are very different economies and the rest of this document assumes the former; it's
  worth confirming explicitly rather than by default.
- **The opponent-forced-card buff's power level** — flagged in §1, not costed here.
- **Whether *every* buff card is reactive (held and sprung mid-hand, like Cheat) or whether some are
  genuinely pre-hand-only picks** (a hand-shaping choice made in the Apply Buff phase before a card is
  played). §1 confirms Cheat-like cards stay reactive; it doesn't settle whether the whole pile works
  that way.
- **The max-health purchase**, deliberately not designed here — see §1's closing note.

## 5. Draft card templates — **TO BE REVIEWED, not committed**

The card list doesn't need hand-authoring one at a time. A dozen or so **condition templates**
crossed with a dozen or so **reward templates**, tiered bronze/silver/gold, produces a large card
pool from a small amount of actual design work — and rarity weighting (§4) is the same weighted-draw
machinery `skullWeights.ts` already uses, pointed at this list instead of skull ranks. What follows is
a first pass at the slots to fill in, **not a final list** — every magnitude is a placeholder, and
several entries want a second look before anything is built from them.

### Condition templates

| Template | Example filled in | Notes |
|---|---|---|
| Win a trick with suit **S** | "Win a trick with Bells" | The workhorse template — 3 suits × win/lose = 6 cards on its own |
| Lose a trick with suit **S** | "Lose a trick with Keys" | Pairs naturally with the skull-inversion — losing on purpose is already a real move |
| Win a trick with rank **R** | "Win a trick with a 2" | Rank-specific; the named ranks (Swan, Fox, Woodcutter…) could read better than bare numbers |
| Dodge a skull with this card | "Play a card that avoids a skull" | Rewards the read-the-telegraph skill the game already asks for |
| Eat a skull with this card | "Take a skull on purpose" | The inverse — rewards deliberately losing, not just successfully avoiding |
| Reach a bank of **N** this hand | "Bank reaches 4" | A streak-length goal, ties the card to the existing bank/multiplier system directly |
| Survive **N** tricks without a hit | "Go 3 tricks clean" | A "goal" card in the sense you described — sets up a run-of-tricks target, not a single-trick one |
| Lose the next **N** tricks | "Lose the next 2 tricks" | Your own example — a forward-looking goal rather than a reactive trigger; needs a UI answer for "tracking a pending goal" |
| Apply Damage this hand | "Press Apply Damage at least once" | Rewards using the mechanic itself, could counteract over-caution rather than encourage it — worth weighing against the §0 diagnosis |
| Hold a card of suit **S** at hand's end | "End the hand holding a Moons card" | A hand-composition goal, rewards *not* playing something |
| Have at least **N** coins / be below **N** health | "Have 3+ coins" / "Below half health" | Resource-state conditions — cheap to write, but reward the state rather than a play, so they read more like a standing bonus than a decision |
| **(synergy)** For every other buff active this hand | "For each other buff active, +1 damage" | Scales with how many buffs you brought — rewards a wide loadout rather than one strong pick |
| **(synergy)** If you also hold a gold-tier card | "Doubled if you have a gold card equipped" | References another owned card directly, not just game state |
| **(synergy)** If bank ≥ 2× multiplier | "Bonus if your bank has outpaced your multiplier" | References the bank/multiplier relationship itself, not a trick outcome |

### Reward templates

| Template | Example filled in (bronze / silver / gold) | Notes |
|---|---|---|
| Flat damage bonus | +1 / +3 / +5 damage | The default reward, matches the worked Bells example from §3 |
| Coin bonus | +2 / +5 / +10 coins | Turns a card into an income lever rather than a combat one |
| AP refund | Refund 1 / 2 / 3 AP | Lets a loadout partly pay for itself — could combo dangerously with the "for every other buff" synergy condition above; worth flagging together |
| Ward this trick | No health lost this trick / this hand / this fight | A tiered version of the Ledger idea from `version-5-scope.md`'s abilities pass — same shape, different acquisition route |
| Force a legal card from the opponent | Choose 1 card / mark 2 in advance / mark for the whole hand | Your own example — the strongest and least-costed template here; a gold tier on this one especially needs its own pass before it ships |
| Extra discard | +1 / +2 discards this fight | Reuses `the-discard-budget.md`'s existing resource rather than inventing a new one |
| Multiplier boost | +1 / +2 / +3 to the streak's climb | Overlaps with Whetstone and `version-5-scope.md`'s Bulwark — needs a pass to make sure this doesn't quietly become a third way to buy the same axis |
| Peek the draw pile | See the next 1 / 3 / 5 cards | An information reward rather than a numeric one — cheap to build, untested as a *reward* rather than a passive readout |

### A few combined worked examples

- **Bronze:** "Win a trick with Bells, +1 damage." Straightforward, the baseline case.
- **Silver:** "Lose a trick with Keys, +3 damage, +2 coins" (two reward templates stacked on one
  condition — whether tiers should stack *two* reward templates rather than scale one is itself an
  open question).
- **Gold, synergy:** "For every other buff active this hand, +2 damage, doubled if you also hold a
  gold-tier card." This is the kind of card that rewards a wide, committed loadout rather than one
  strong pick — exactly the depth §0 (in the "what this reopens" note above) was arguing the template
  set needs at least some of.

### What review should actually decide

This section is deliberately rougher than the rest of the document — it's meant to be argued with, not
built from as-is. Specifically still open: which condition/reward pairings are actually worth writing
(not every cell of the grid deserves a card), how many synergy templates versus flat ones the final
pool should carry, whether AP-refund and multiplier-boost templates double up on mechanics that
already exist elsewhere in this scope, and whether "lose the next N tricks" needs a UI answer before
it's buildable at all, since it's the one template that requires tracking a goal across multiple
future tricks rather than judging the one just played.

## 6. The card preview — making the loadout's cost visible

Once buffs are applied for the hand, looking at any card in hand shows two numbers: the damage if it
**wins** its trick above the card, and the damage if it **loses** below. This is the concrete answer to
§0's actual diagnosis — the cost of a decision was invisible, so it didn't feel like a decision — and
it generalizes past Apply Damage specifically: every buff now shows its effect on every card it could
apply to, live, rather than the player having to remember what they activated and do the arithmetic
themselves. Cheap in spirit (it's a readout, not a rule), though real to build once the buff pile can
contain conditions layered several deep on the same card.

## 7. The run-permanent shelf splits: capacity, fixed; builds, random

The run-permanent shelf no longer holds Whetstone-style build items directly. Two kinds of purchase
now live in two different places:

**Fixed, always on the shelf, costly:** pure capacity, where there's no strategic differentiation in
buying it — more is simply better, and nobody would ever choose less. Confirmed for this list:

- **Health** — a permanent increase to max health. Still deliberately undesigned (§1) pending the
  DLR-82 question about whether this runs into the same argument that ruled out raising starting
  health.
- **AP capacity** — the existing +5 AP purchase from §1.

Two more candidates were raised and checked against the same test. **Discard budget** (a permanent
+1-per-fight increase) passes it — pure capacity, no build-differentiation — and is a real candidate
for this shelf. **Cheat slot count does not**, and shouldn't be added even though it looks like the
same shape at a glance: `config.ts` records an explicit, deliberate decision that `CHEAT_SLOT_COUNT` is
capped at 2 "not so it is easy to raise" — an uncapped Cheat count was argued, at the time, to remove
the skull's status as the only thing stopping "take every trick" from being correct. That's a decided
constraint on record, not an oversight to fix.

A further candidate, not yet decided either way: **raising the odds a specific card shows up** in the
slot machine's pool, bought with otherwise-idle leftover coin. It passes the same capacity test — there's
no build choice in wanting better odds — so if it's built, it belongs here, on the fixed shelf,
**not** inside the slot machine itself (using the machine to bias the machine would be circular).

**Random, drawn through the slot machine (§3), not purchased directly:** the actual build-differentiating
items — Whetstone, Bulwark (`version-5-scope.md` §4), and Reflex (the Quarry skill-nerf from the earlier
abilities pass) all move here. This is what resolves "choice under scarcity" for this shelf: which build
axis you land on now depends on which machine you play and what the reels give you, rather than a fixed
menu you can always just buy from if you can afford it.

## 8. The Vault — cross-run meta-progression, pause lifted

When a run ends in a loss, whatever coin the player is holding can't come with them — a fresh run
starts from zero, same as always. **The Vault banks it instead.** Leftover coin at death converts into
a persistent currency that survives across runs, spent on things that shape how a *future* run starts,
not anything mid-run.

Two confirmed uses, both anchored to what a player might actually want after liking a specific card:

- **Raise a card's odds of appearing** in the slot machine's pool on future runs.
- **Buy a better starting tier of a liked card directly into the player's starting pile** — bronze,
  silver, and gold versions each purchasable, each pricier than the last, so a player who's grown
  fond of Timebomb, say, can make sure a strong version of it is already in hand from the very first
  fight of the next run.

**This is also the concrete fix for the first-fight problem**, and a stronger one than anything tried
so far: a fresh run starts with a **small number of buff cards already in the player's pile**, not
empty-handed. The one thing already tested here — `RUN_STARTING_CHEATS` raised from 0 to 1 — was
measured directly and made no difference to the fight-zero death rate (see the simulation doc's
2026-08-22 addendum): a single narrow escape hatch isn't the same as an actual small toolkit from turn
one. Starting with a handful of real buff cards, and the ability to bias which ones show up via the
Vault, is a different and more promising shape of the same fix — but it hasn't been measured yet
either, and should be before it's trusted.

**Still fully open:** the Vault's exchange rate (how much run-coin becomes how much vault-currency),
whether it should be visible during a run as a coming attraction or only revealed at death, and
whether raising a card's odds and buying it directly into the starting pile are two separate spends or
the same upgrade path at different price points.
