# Version 5 — Developer Idea: The Buff Loadout, Slot Draws, and a Delayed Apply Damage

Captured 2026-08-22, from a live design conversation. **This is the single document for this
direction.** An earlier, separate `version-5-scope.md` covered a smaller first pass at the same
release (scrapping Poison Guard, renaming Envenom to Timebomb, a first take on a hand-long shelf and
a run-permanent catch-up item, and Diarmuid's ignore-follow-suit rule) — that doc is retired now that
this idea has superseded most of its shop structure, and its still-live pieces are folded in below so
nothing is lost:

- **Poison Guard is scrapped** — stays scrapped; nothing in this document brings it back.
- **Envenom is renamed Timebomb** — carried forward as one of the buffs in §1/§3.
- **Diarmuid (the final boss) is meant to ignore follow-suit**, mirroring the player's own Cheat —
  unaffected by anything in this document, still owed, still unbuilt. Worth stating plainly: with Cheat
  now able to reach a three-trick duration at gold tier (§3), an ignore-follow-suit Diarmuid up against
  a player holding a long Cheat is worth a second look once both exist.
- **Graft (branding a card skull-immune) was cut** — it doesn't reduce the Quarry's skull count, it
  relocates one about 6% of the time, usually toward a worse rank. Stays cut.
- **Chisel (permanently removing a card from the 33) stays deferred** — the deal logic assumes a fixed
  33-card pool, and shrinking it needs its own costed pass before this or any other deck-modification
  idea ships.

Several numbers below are still open. Treat this the way `ideas.md` treats a strong entry: worth
building toward, not yet a queued ticket.

**Two lanes were explicitly paused in the earlier scope doc, and both got reopened by this idea on its
own logic — the developer has now lifted both pauses.** Choosing which slot machine to pull from (§3)
is this cycle's answer to "choice under scarcity." The Vault (§8) is this cycle's answer to
cross-run meta-progression. Neither was designed on purpose; both fell out of following where the
buff-loadout idea actually led.

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
**reactive**, held in the pile and sprung in response to what's actually happening, not locked in once
for the whole hand up front.

**Confirmed timing rule: a buff must be applied before that trick's first card is laid.** This isn't a
once-per-hand lock — Apply Buff opens again before every trick within the hand, so the player can
reconsider what to bring based on how the hand has gone so far, but the choice for a given trick has to
land before that trick's own card is committed, the same as it does for every other buff. This is also
the exact timing the discard window already uses — `the-hunt.md` describes it as open "before a
trick's first card is laid — including before the Quarry's own lead" — so Apply Buff doesn't need a new
gate built for it; it reuses `discardWindowOpen`'s existing timing rather than inventing a second
version of the same rule.

Buffs are bought once from the shop and owned permanently, the way a Whetstone purchase is — but
unlike Whetstone, owning a buff doesn't make it always-on. Each hand, the player chooses which owned
buffs to bring, spending AP per buff (the working example is 3 AP each), and can stack several if the
budget allows. That splits *owning* a thing from *using* a thing into two separate decisions — the
mechanism that makes Balatro's shop feel like deck-building rather than shopping, reused here through
this game's own vocabulary instead of copied wholesale as a Joker system.

**Build note: AP should be implemented so it can be switched off cleanly.** This is a genuinely new
resource layered on top of the whole card game, and the developer wants a real way to back out of it
if it doesn't play well — not by ripping the system out, but by however cheap a single toggle can make
that. Concretely: every AP cost (a buff, and Apply Damage — see §2) should read from one place, the way
`applyDamageRefusalFor` is already the single statement of whether that control is live rather than a
rule re-derived at each call site. Whatever that place is, flipping it off should make every action
available with no AP cost at all, rather than requiring each caller to be found and patched
individually.

Example buffs given in the original conversation, verbatim:

- "Losing a trick with Bells, +2 damage multiplier."
- "Win a trick with a 2, +10 damage."
- "Choose a card to mark: avoid a skull with this card, +10 coins."
- "Choose a card from the opponent's hand that they must play, if legal."

The last one is a genuinely new kind of interaction — nothing else in the game lets the player
constrain the Quarry's choice directly — and needs its own costing pass before it ships; it's easy to
imagine it being disproportionately strong.

**AP capacity is itself a run-permanent purchase** — the developer's own confirmed answer: a shop item
grants **+5 AP**, the same shape Whetstone used to raise the bank's climb. So the loadout genuinely
grows over a run rather than staying fixed. See §7 for the shelf this sits on and what else was
considered for it.

**Health-buffing is deliberately deferred**, on the developer's own instinct — build the AP economy
first, and design a purchasable max-health increase separately once that instinct can be checked
properly. Worth stating why the instinct is sound: DLR-82 already ruled out raising the player's
*starting* health as an answer to the run's difficulty, on the grounds that a bigger bar delays the
same wall rather than removing it. A purchasable increase to *maximum* health, earned rather than
free, isn't obviously the same thing — but the same argument plausibly still applies, and that's worth
resolving explicitly before this ships, not assumed away because the money changes hands differently.

## 2. Apply Damage becomes a real bet

**Pressing Apply Damage costs Action Points too**, the same as activating a buff does — it isn't a free
action sitting outside the AP economy, it competes for the same budget as everything else in the
loadout. The exact cost is open; nothing so far fixes it at 3 AP the way the buff working example does.

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
- **Shield's tier is a count of blue hearts** — see §7a for the redesigned mechanic. Bronze adds 1,
  silver 2, gold 3.

**Choosing a machine before pulling is this cycle's answer to "choice under scarcity."** Which build
axis a player lands on now depends on which machine they play and what the reels give them, rather than
a fixed menu always purchasable if affordable — see §7 for what's actually left to draw, now that
Whetstone-style build items have been pared back.

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
- **The starting buff pile's size and tier mix.** §8 says a run begins with "a small number" of buff
  cards rather than empty-handed, and never puts a figure on it or says what tier they arrive at. Both
  need answering together: a pile of four bronze cards and a pile of four gold ones are different games
  from the first fight. The Vault's tier purchases (§8) imply a low default, but the default itself is
  unwritten.
- **The starting AP pool.** The shop's capacity item grants **+5 AP** and the working activation cost is
  **3 AP** a buff — but nothing states what the player begins a run with, and `+5` means nothing without
  it. At 3 AP a buff, a starting pool of 5 is one buff a hand with 2 stranded; 6 is exactly two. This
  compounds with the bullet above: four owned buffs against 3 AP is a real choice, against 12 AP it
  isn't one at all.
- **When AP refreshes.** §1 says buffs are activated "each hand," which reads as a per-hand budget that
  resets at the deal — but it is never said outright, and a per-fight or per-run pool would be a
  different economy entirely. The AP-refund reward template (§5) only makes sense against one of these
  readings.
- **Whether AP cost scales with tier.** Effects are tiered carefully throughout §3; what a tier *costs
  to bring* is never asked. A gold Cheat — three tricks with follow-suit off — activating for the same
  3 AP as its bronze version is a very different loadout economy from tier-priced activation.
- **How a per-hand budget meets a per-trick window.** §4's resolved note opens Apply Buff before every
  trick, while §1 frames AP as a per-hand allowance. Drawing one budget down across up to six windows is
  its own decision — spend early, or hold reserve for a trick that goes wrong — and neither section
  addresses it. The two rules were written into the same section and don't quite meet.
- **The max-health purchase**, deliberately not designed here — see §1's closing note.

**Resolved:** every buff is applied per-trick, before that trick's card is laid, reusing the discard
window's existing timing (§1) — not a once-per-hand pre-lock. This closes the reactive-vs-pre-hand
question this section used to carry open.

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
| Ward this trick | No health lost this trick / this hand / this fight | A narrower, single-trick cousin of Shield's blue hearts (§7a) — same idea, smaller and cheaper |
| Force a legal card from the opponent | Choose 1 card / mark 2 in advance / mark for the whole hand | Your own example — the strongest and least-costed template here; a gold tier on this one especially needs its own pass before it ships |
| Extra discard | +1 / +2 discards this fight | Reuses `the-discard-budget.md`'s existing resource rather than inventing a new one |
| Peek the draw pile | See the next 1 / 3 / 5 cards | An information reward rather than a numeric one — cheap to build, untested as a *reward* rather than a passive readout |

**Multiplier boost, dropped.** A template scaling the streak's climb directly would have overlapped
with Whetstone — see §7 for why Whetstone itself is currently out of the shop rather than folded into
this pool.

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

## 7. The shop, pared down: capacity plus the buff list, everything else held back

**The shop currently sells exactly three things: the buff list (drawn through the slot machine, §3),
a Health purchase, and an AP purchase.** Everything else previously drafted for this release —
Whetstone, Reflex, the discard-budget increase, the odds-raising purchase — is **removed from the
shop for now, on the developer's explicit call, so this pared-down version can be tested before
anything else is added back.** None of it is deleted from the design, and once any of it is actually
implemented in code, the same rule applies going forward: pull it from the shop's purchasable list,
never delete the underlying mechanic, so bringing it back later costs nothing.

**Two items are cut outright, not held back** — a different thing from the paragraph above:

- **Berserk** (double damage dealt and taken for a hand) — removed from the design entirely.
- **Bulwark** (the stacking run-permanent hit-absorption count originally proposed as this release's
  catch-up item) — also removed entirely, superseded by Shield's redesign below, which does the same
  job through a different, more visible mechanism.

### 7a. Shield, redesigned — blue hearts on the health bar

Shield no longer works as a hidden per-hand counter. Instead, activating it adds **blue hearts**
directly onto the player's health bar for that hand — a visible, distinct pip type, separate from the
ordinary red hearts. Two hard rules: **blue hearts cannot be healed or restored** by anything (Heal,
the flask, or otherwise) once lost, and they **do not stack** — re-activating Shield a later hand
resets to the tier's count, it doesn't add on top of hearts already there. The tier sets how many:
bronze adds **1**, silver **2**, gold **3**.

This keeps the actual goal Bulwark was built for — dividing what you take, the way Whetstone used to
multiply what you deal — but makes the cost and the protection both fully visible on the felt instead
of living in an invisible counter, which is exactly the kind of legibility fix §6's card preview is
also built around.

### What's on the shelf now, plainly stated

- **Fixed shop, always purchasable, costly:** Health (permanent max-health increase — still
  deliberately undesigned per §1's DLR-82 note) and AP capacity (+5 AP).
- **The buff list, drawn through the slot machine:** Cheat, Timebomb, Shield, and the templated
  condition/reward cards from §5.
- **Held back from the shop, kept in reserve once built:** Whetstone, Reflex, the discard-budget
  increase, the odds-raising purchase (Vault-funded or otherwise).
- **Cut, not held back:** Berserk, Bulwark, Graft, Poison Guard.
- **Superseded, not built:** a suit-specific run-long item bought directly from the store (the
  original working example was "Bells +2 multiplier") was part of the earliest version of this idea,
  before the shelf split above existed. It was never explicitly cut, but nothing build-differentiating
  is directly purchasable any more — Whetstone itself moved to held-back-and-slot-drawn on the same
  logic — so a direct-buy suit scaler doesn't have a shop slot to sit in as this document currently
  stands. Worth an explicit call on whether it's dead or whether it wants reintroducing as one of the
  templated cards in §5 instead.

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
so far: a fresh run starts with **4 buff cards already in the player's pile**, not empty-handed. The
one thing already tested here — `RUN_STARTING_CHEATS` raised from 0 to 1 — was
measured directly and made no difference to the fight-zero death rate (see the simulation doc's
2026-08-22 addendum): a single narrow escape hatch isn't the same as an actual small toolkit from turn
one. Starting with a handful of real buff cards, and the ability to bias which ones show up via the
Vault, is a different and more promising shape of the same fix — but it hasn't been measured yet
either, and should be before it's trusted.

**Still fully open:** the Vault's exchange rate (how much run-coin becomes how much vault-currency),
whether it should be visible during a run as a coming attraction or only revealed at death, and
whether raising a card's odds and buying it directly into the starting pile are two separate spends or
the same upgrade path at different price points.

## 9. The UI needs a full pass, not a patch

Everything above changes enough about how a hand is actually played that the existing screens can't
just absorb it piecemeal. The felt rails documented in `war-council-ui/` today — separate Cheat slots,
a separate Envenom plate, a separate discard plate, a separate Apply Damage plate — are being replaced
by one four-button bar (§1). The health bar needs to render a second pip type that behaves differently
from the first (§7a's blue hearts). The shop screen needs to show a slot machine with a machine choice
and a three-reel pull instead of a fixed list (§3, §7). Cards need a live win/lose readout that updates
as buffs are applied (§6). And the run's meta-progression (§8) needs a screen of its own that doesn't
exist today at all — something shown at a run's end, distinct from the verdict panel, where Vault
currency gets spent.

This is flagged here rather than designed here — it's a `game-ux` and `react-frontend` question once
this direction is actually being built, not a `game-designer` one. But it's worth stating plainly now,
before anyone assumes the current screens mostly survive: they don't. Nearly every surface this game
has shipped so far — the dossier, the felt rail, the shop, the health bar — is touched by something in
this document.
