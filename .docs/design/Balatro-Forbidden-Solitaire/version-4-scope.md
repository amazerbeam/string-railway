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
becomes poisoned. The next time that card is played into a trick, **whoever wins that trick takes 4
damage at the start of the following hand** rather than immediately — the delayed-hit shape
`ideas.md`'s "response window" entry proposed, re-anchored to the trick's outcome rather than a
capture pile, since capture piles no longer exist in the current rules. The 4 is not arbitrary: it's
the same figure the doc already uses for "one fight's worth of damage" (`the-hunt.md` §9) and for the
shop's own Heal, so poison's damage reads on a scale the player already knows rather than a new one.
Priced at twice Poison Guard's cost, below, because unlike Guard this is a guaranteed, unconditional
hit rather than insurance against a risk.

**When the Quarry wins the poisoned trick, the trick's normal outcome for the player is replaced, not
added to:** no health is lost and the bank/multiplier survive instead of resetting, while the Quarry
still takes the delayed hit next hand. This is a deliberate no-cost sacrifice — the point is to give a
card the player already expects to lose with (a Swan, a stray low card) a reason to be played instead
of being dead weight in the hand.

This is symmetric by construction rather than by a second rule: the delayed hit already targets
whichever side wins the trick, so a poisoned card played into a trick the *player* wins instead lands
that same delayed damage on the player next hand — the one way this can still cost something. The
"no cost for losing" half doesn't need a mirrored Quarry-side rule to stay fair: the Quarry was never
charged anything for losing a single trick in the first place, so there's nothing on its side left to
waive.

### Fight-long — new item: *Poison Guard*, 1 coin

Active for one hand. The next time the delayed poison hit lands on the player — from a poisoned card
they ended up winning the trick with — the health is still lost but the bank and multiplier do not
reset. This is the only way poison currently costs the player anything, so it's also the only case
this item needs to cover; it's live from the moment poison ships, not waiting on a future Quarry-side
power. Reuses the reset-protection math already costed for the shop, scoped specifically to the
poison backfire rather than every hit. Priced level with the shop's Heal — both are a 1-coin-for-4-HP
trade, just run in opposite directions (Heal buys HP back after the fact, Guard buys it back before
the backfire happens).

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
