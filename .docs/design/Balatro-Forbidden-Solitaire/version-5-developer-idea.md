# Version 5 — Developer Idea: The Buff Loadout, Slot Draws, and a Delayed Apply Damage

Captured 2026-08-22, from a live design conversation. **This is the developer's own idea, mid-shape —
not committed scope like [`version-5-scope.md`](./version-5-scope.md).** Several numbers below are
still open, and one section (§4) reopens a lane that scope doc explicitly paused. Treat this the way
`ideas.md` treats a strong entry: worth building toward, not yet a queued ticket.

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
screen carries three actions: **Buff Hand**, **Play Trick** (select a card; greyed out until one is
chosen, then highlighted), and **Apply Damage**.

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

Each buff has a fixed escalation across its three tiers. The worked example: Bells damage bonus is
**+1** at bronze, **+3** at silver, **+5** at gold.

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
- **Whether choosing a machine is this cycle's answer to "choice under scarcity"**, or a separate
  question from the one `version-5-scope.md` paused.
- **The max-health purchase**, deliberately not designed here — see §1's closing note.
