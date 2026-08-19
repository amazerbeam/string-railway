# Version 4 — Shop, Flask, and the Quick-Kill Economy

Design scope agreed 2026-08-17, covering the next release. This is committed direction, not a
parking-lot idea — see [`ideas.md`](./ideas.md) for the analysis this scope draws on (the
shop-and-payment-system entry, the buff-persistence-ladder entry, and the player-triggered-cash-out
entry).

## 1. The shop — rebuilt around Balatro's persistence categories

Today's shop (`the-hunt.md` §10) sells exactly two things: a Cheat and a flat Heal. Version 4
replaces that flat list with four categories, borrowed directly from how Balatro sorts its own items
by how long an effect lasts — the deck (game-permanent), a Joker (run-permanent), a consumable
(one-time use) — plus a fourth rung, **fight-long**, that this design has always had room for and
never filled (see `ideas.md` → "The buff persistence ladder").

This sprint builds three of the four. The fourth ships as a visible, disabled category rather than
being hidden — a **"Coming Soon"** tab, so the shape of the full shop reads even though it isn't
sellable yet.

### One-time use — the existing Cheat, plus a new poison consumable

The existing Cheat keeps its slot unchanged — a held charge, spent once, the decision is *when* not
*whether*.

**New: poison a chosen card (placeholder name: *Envenom*), 2 coins.** Pick one card in your hand; it
becomes poisoned. The next time that card is played into a trick, whoever wins that trick owes
damage. **D1–D4, decided 2026-08-19, replacing this subsection's original timing and figure:**

- **Damage is paid at the resolution of the *next trick*, not at the opening of the hand after
  this one.** This subsection originally timed the payment to that later hand's very first moment —
  changed because a hit paid at a hand boundary arrives after `resolveTrickBank` has already cashed
  and zeroed the streak for that hand, so it could never interact with the bank at all. Paying it at
  the next trick's own resolution is what lets poison behave like any other hit — see below.
- **The two sides no longer share one figure: 4 to the Quarry, 2 to the player.** The player's figure
  is halved because a hit landing on the player also forces the streak's cash-out (D3, next), which
  the Quarry has no equivalent of — the Quarry has no bank to lose, so its figure stays at the
  original 4, the same figure the doc already uses for "one fight's worth of damage" (`the-hunt.md`
  §9) and for the shop's own Heal.
- **Poison damage to the player behaves as any other damage does: the bank cashes out into the
  Quarry and both counters reset.** The original text's "replaced, not added to" no-cost-loss
  treatment is gone along with the capture-pile framing it was reasoning from — a poisoned trick the
  Quarry wins now costs the player the ordinary per-trick hit exactly as an unpoisoned loss would,
  and a poisoned trick the *player* wins still owes the delayed poison hit at the next trick,
  cashing the streak out even though the trick itself was a win.
- **Pending poison accumulates rather than overwriting, and it carries or discards at the two
  boundaries that matter.** Two bookings against the same side sum. A poisoned final trick's owed
  damage carries into the next hand, since the queue is paid at a trick's resolution regardless of
  which hand that trick falls in; it is discarded outright if the fight or the run ends first, since
  a fresh encounter re-seeds the queue to nothing.

Priced at twice Poison Guard's cost, below, because unlike Guard this is a guaranteed, unconditional
hit rather than insurance against a risk.

### Fight-long — new item: *Poison Guard*, 1 coin

**D7's revised sequencing (below) made this subsection's original one-hand duration wrong on its own
terms — a fight-long item that expired after a single hand was never coherent — so this is revised
to match its own heading: active for the whole fight it was bought for, not one hand of it.** The
next time the player's own poison lands on them, the health is still lost but the bank and
multiplier do not reset — the Guard
buys back the streak, never the health. This is the only way poison currently costs the player
anything, so it's also the only case this item needs to cover; it's live from the moment poison
ships, not waiting on a future Quarry-side power. Reuses the reset-protection math already costed for
the shop, scoped specifically to the poison backfire rather than every hit. Priced level with the
shop's Heal — both are a 1-coin-for-4-HP trade, just run in opposite directions (Heal buys HP back
after the fact, Guard buys it back before the backfire happens).

**D8, accepted 2026-08-19: holding a Guard can now cost the player health it would otherwise have
dodged.** Because the Guard suppresses the poison hit's cash-out, a Quarry that would have died to
that cash-out (under D7's Quarry-first sequencing, below) instead survives — and the player, who
would have taken nothing from an event that kills the Quarry, now takes the 2 health the Guard didn't
stop. This is an accepted consequence of buying insurance against the streak reset, not a bug: the
Guard was never sold as insurance against the health, only against the bank.

### Run-permanent — new item: *Whetstone* (placeholder name), 4 coins

Permanently raises the bank's per-trick climb by 1 for the rest of the run — a streak of `n` now
cashes for more than `n²`. This plays the Joker role: it stacks with itself and with everything else
bought on this rung, and it's the strongest single purchase in the shop by the numbers already worked
out (roughly +100% on an average hand for one copy) — priced as the shop's one real splurge
accordingly. On flat win income alone (1 coin a fight, against a run expected to end in its first or
second stage) it eats most of a short attempt; one well-timed quick-kill payout closes that gap in a
single fight instead (a first-hand, one-trick kill with five cards left pays 10, per §4 below). That's
deliberate — this release's two pieces are meant to meet here, so playing well enough for a fast kill
is what makes the shop's biggest item reachable early rather than waiting on a long grind. A twin item
raising the *multiplier's* climb instead of the bank's is the natural next addition — same math, same
slot — but isn't part of this sprint.

### Game-permanent — "Coming Soon"

No item. The tab exists in the shop UI so the shape of the full system reads, but selecting it shows
a coming-soon state rather than anything purchasable. Nothing here is designed yet — when it is, it's
a genuinely different kind of decision (see the ladder entry's stacking-vs-pick-one fork) and
shouldn't be rushed to fit this sprint.

### What isn't touched

The existing Heal purchase continues as-is. It's an instant transfer, not a buff with a duration, so
it doesn't sit on this ladder at all — it stays outside the four categories rather than being forced
into one.

## 2. The flask

A free heal, separate from the shop's paid Heal. Restores 60% of the player's maximum health — 6
points at today's provisional 10. Carried as a single charge, drunk whenever the player chooses, and
refilled to one charge each time a stage boss is beaten — up to five charges across a full 25-fight
run. This is the thing DLR-82 named as part of the intended answer to the run's health curve and
explicitly refused to build ahead of its own design (`the-hunt.md` §10, Known tensions) — this is
that design.

## 3. Apply Damage

A new player action, available before playing a card: cash the current bank × multiplier into the
Quarry at will, resetting both, instead of only ever being forced into it by taking a hit. If the
player *is* hit before choosing to apply, the automatic cash-out that already exists pays two-thirds
of `bank × multiplier` instead of the full amount — the missing cost that turns this from a button
with no wrong answer into a real press-your-luck decision (see `ideas.md` → "A player-triggered
cash-out," sharpened here).

**D6, decided 2026-08-19, ahead of this control being built: Apply Damage must be disabled while
poison is pending.** A player able to cash the bank out on demand while a poison hit is still owed
could apply damage to dodge the interaction between the two systems in a way neither was designed
to allow for; the control's implementation must read the pending-poison predicate before it commits
to anything, not just the two-thirds/one-third split above.

## 4. Quick-kill payout

On winning a fight, pay **1 coin per card left unplayed** in the player's hand at the moment the
Quarry's health reaches zero, scaled by which hand of the fight the kill happened in: ×2 in the first
hand, ×1 in the second, ×0.5 in the third, ×0 from the fourth on. The last tier is a taper rather than
the flat cutoff first proposed, to avoid a hard cliff a player learns to resent. Confirmed as final: a
first-hand, one-trick kill with five cards left pays 10 coins, which is the figure Whetstone's price
above is sized against.

## Open questions the developer still owns

- The placeholder names *Envenom*, *Poison Guard*, and *Whetstone* — functional descriptions only,
  not chosen copy.
- Whether the Game-permanent tab's "Coming Soon" state needs any copy beyond that phrase.
- The flask's charge count (currently one per stage) if that proves too thin once played.
