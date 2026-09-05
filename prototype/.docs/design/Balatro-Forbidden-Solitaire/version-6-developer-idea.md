# Version 6 — Developer Idea: Spent Cards, No Action Points, and a Pared Buff Pool

Captured 2026-08-25, from a live design conversation held immediately after an `ai-play-tester`
browser session and a read of the shipped implementation docs. **This is the single document for
this direction.** It supersedes `version-5-developer-idea.md`'s buff-loadout economy — the loadout
panel, the slot machine and the tiered rank abilities all survive; the _resource model underneath
them_ does not.

Numbers below marked **[open]** are deliberately unchosen. The developer's stated position on this
pass is **ship rough, then tune by feel** — build it as written, play it, and move numbers
afterwards.

---

## 0. The problem this answers

The developer's own words: _"I have a vision but don't think I've managed to get there"_, and
_"I feel under power now."_

The vision, stated in the same conversation:

> "I wanted to put more weight into each trick. the idea was the player would be gambling resources
> on whether they think they'll win or lose and if they can win one more. the resources they'd
> gamble is the 'buff' card and getting it right more and more would lead to more damage or putting
> more into 1 hand would pay off lots of damage."

> "what I want really is for Aoife to go down in 1 or 2 tricks once the player learns about buffs.
> but have her beatable without, and once the player gets access to silver and gold tier cards at the
> start she'd start to be a cake."

Three things were established against the shipped code, and together they explain why the built game
does not feel like that:

1. **Nothing is ever spent.** The eleven condition buffs are not consumed. They are re-activated and
   re-paid _every trick_ — `activatedThisTrick` clears at each trick boundary, and under
   `ApRefreshCadence.PerTrick` (developer-set 2026-08-25) `openBuffWindow` refills `apPool` to full
   `capacity` on that same edge. The model is **per-trick rental with free rent**. A bet whose stake
   is refunded before the next bet is not a bet.

2. **The gamble the vision wants already exists structurally, and was not the problem.** The buff
   window is gated on `discardWindowOpen`, which requires `currentTrick.length === 0`. When the
   Quarry leads, the player sees only the telegraphed **suit and stance** — a genuine partial read.
   When the player leads, the telegraph reads "waiting on your lead", and opening the loadout panel
   clears the armed card, so the speculative `previewQuarryIntent` reading is not on screen beside
   the buff rows. When the player follows, the window is shut for ordinary buffs entirely. The
   information design is careful and is **not** what removed the weight.

3. **A third of the pool cannot pay, and one axis pays nothing at all.** Measured over 1000 seeded
   runs at fight 0: `miser` and `keepsake` fired **0.0%**; `glutton` measured **−9.6pp** and
   `cornered` **−6.3pp**; the `coins` axis **−2.4pp** and `apRefund` **−5.3pp**. The refund axis is
   worse than weak — it is **structurally dead**: `foldBuffOutcome` credits refunded AP to the pool
   immediately before `openWindowOnTrickResolved` overwrites that pool with full capacity, so the
   refund is credited and discarded on the same edge.

**The correction is to make the player overpowered.** Every measurement taken says the shipped game
errs the other way — a 0.0% run win rate across every configuration tested, most runs dead by fight
two, the best run of 900 reaching fight 8 of 25. Aiming high early is the correction, not an
indulgence, and it is the shape the reference game already uses: the first ante is free for a
competent player, and the run is about how far the build stretches.

---

## 1. The pool that survives

**13 templates, down from 73.** Two reward axes, three tiers (bronze / silver / gold — **no fourth
tier**; the "diamond" discussed in conversation was an illustrative example, not a proposal).

| Card                      | Fires when                                                          | Axes              | Templates |
| ------------------------- | ------------------------------------------------------------------- | ----------------- | --------- |
| **Taker** (one per suit)  | You **win** a trick playing that suit                               | Blade + Momentum  | 6         |
| **Feeder** (one per suit) | You **lose** a trick playing that suit                              | Blade only        | 3         |
| **Sidestep**              | You **dodge** a skull — a skull trick you lost and therefore banked | Blade + Momentum  | 2         |
| **Cheat**                 | Pressed. Ignore follow-suit for 1 / 2 / 3 tricks                    | tiers on duration | 1         |
| **Timebomb**              | Pressed. Prime a card; it detonates at the next trick's resolution  | tiers on damage   | 1         |

- **Blade** = flat damage, paying 1 / 3 / 5 by tier.
- **Momentum** = multiplier points, paying 2 / 3 / 5 by tier.

### Why Feeder is Blade-only — and the option left open

`buffFires` reads `feeder` as `!ctx.playerWon`, which is the player losing the _trick_. Per the four
outcomes, that covers **both** a clean loss (damage, and the bank cashes at two-thirds and resets)
**and** a dodge (a skull trick the player drops and therefore banks). So a Momentum reward on Feeder
is not worthless — it pays properly on the dodge half and is wiped on the clean-loss half, because a
clean loss resets the multiplier it just raised.

Blade pays on both halves and is therefore the legible version. **[open]** — whether Feeder regains
its Momentum version as a deliberately swingy card is the developer's, and reversible in one table
entry.

### Sidestep is the narrow slice of the same idea

`sidestep` reads `ctx.skullTrick && !ctx.playerWon` — the dodge case exactly, with no suit attached.
It is a strict subset of Feeder's condition. Both are kept because they ask different questions: a
Feeder is a bet on a suit, a Sidestep is a bet on a skull.

It is also **the best card in the game by measurement** — the only one that both raises the win rate
(+9.5pp) and _shortens_ the fight (11.3 tricks to win when it fires, against a population mean of
11.9 and 13.1 when it does not). It already carries only Blade and Momentum, so it needs no editing
to fit this pool.

---

## 2. What was cut, and why

Every removal below is backed by a measured figure from the same 1000-run fight-0 batch, not by
taste.

| Cut                                              | Reason                                                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mark of Rank**                                 | Fired 6.4%, −1.4pp. One rank in eleven is far narrower than one suit in three.                                                                                    |
| **Glutton** (win a skull trick)                  | **−9.6pp**, the worst card on the board. It pays the player for taking damage.                                                                                    |
| **Hoarder**, **Unbloodied**                      | Threshold cards, capped once per hand, and both largely report a position the player is already winning rather than creating one.                                 |
| **Debt Collector**                               | Fires on an Apply Damage press; a narrow trigger with no place in a pared pool.                                                                                   |
| **Miser** (hold 5 coins)                         | Fired **0.0%**. The run starts on 0 coins and fight 0 precedes the first shop — unreachable, not weak.                                                            |
| **Keepsake** (final trick, still holding a suit) | Fired **0.0%**, and independently verified unsatisfiable: six cards over six tricks leaves an empty hand at the moment it is checked.                             |
| **Cornered** (health below 60%)                  | −6.3pp, and the worst tempo figure measured — 15.1 tricks to win when it fires against 9.8 when it does not. It only fires once the fight is already going badly. |
| **Coins axis**                                   | −2.4pp. Coins buy nothing until the fight ends.                                                                                                                   |
| **AP-Refund axis**                               | −5.3pp, and structurally dead (see §0). Removed automatically by §3.2.                                                                                            |

**Assumed cut, needs confirmation — [open].** The five one-shot items (Ward, Puppeteer, Second
Thoughts, Foresight, Spyglass) were not mentioned in the conversation. Three of them
(Puppeteer, Foresight, Spyglass) are `[not built]` and refused with `NoEffectYet`. Ward and Second
Thoughts do work. Nothing currently mints any of them.

---

## 3. The mechanical changes

### 3.1 Buff cards are consumed on use

`isConsumableItem` in `src/hunt/consumables.ts` returns true for Taker, Feeder and Sidestep, as it
already does for the five items and — since DLR-142 — for Cheat, Timebomb and Shield.

**This is the change that creates the stake, and it is the whole point of the pass.** The machinery
is built and tested: `activateFromPile` already drops the card from the pile when the predicate is
true, the two-tap poise/commit already exists, and the rule that a wasted use is _allowed and
unwarned_ is already written — _"You may use an item even when it turns out to have been wasted.
Nothing stops you warding a trick that never hits you, and nothing warns you. Whether the trick is
worth guarding is the judgement the item exists to pose."_ That sentence is the vision, already
shipped, applied to the wrong five cards.

### 3.2 Action points are removed entirely

`AP_ENABLED = false` in `src/hunt/apConfig.ts`. It is read in exactly one place — `apCostFor` — and
both `canAffordAp` and `spendAp` route through it, so every AP-gated action becomes free with no
other code change. The toggle was built for exactly this.

**This is coherent only because of §3.1.** AP was containing how many buffs fire per trick, and it
was doing that badly (free refills). Consumed cards replace it with real scarcity: the limit on how
many cards you fire is how many you own. This is the design's own stated principle for one-time-use
items — _scarcity does the balancing, so the tuning knob is how many you hold and how easily one is
replaced_.

Two consequences:

- **The AP-refund axis dies on its own**, resolving the bug in §0 by deletion rather than repair.
- **The shop loses a shelf.** With AP gone, the 3-coin action-point purchase has nothing to sell.
  The shop drops to **Heal** and **a pull**. That is an item ceasing to exist, not a number.

### 3.3 The per-hand caps are raised out of the way, or removed

Currently `MAX_MULTIPLIER_BONUS_PER_HAND = 6` and `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`, and
contributions past a cap are **clipped and discarded — nothing is banked**.

With rented cards that is harmless. **With consumed cards it silently destroys irreplaceable
cards**: a second gold Momentum into a full cap loses a third of itself and is then gone for good.
The caps also bite hardest on exactly the high-tier cards that are supposed to be the reward for
reaching the shop.

Two ways out, and the choice is **[open]**:

1. **Raise both well past what one hand can spend**, and let card scarcity be the only limit.
2. **Keep them and refuse a card that would be wholly clipped**, with the reason on the control —
   reusing the rule the shop already applies when it refuses to sell a heal at full health, on the
   grounds that taking payment for provably nothing is wrong.

Both are numbers-and-a-predicate, and both are reversible.

### 3.4 Twenty starting cards

`STARTING_BUFF_COUNT` moves from 4 (plus one guaranteed Cheat) to **20**.

The figure matches the fight it has to cover. A fight runs two to four hands at six tricks each —
roughly 13 to 24 tricks. Firing about one card a trick, twenty is close to exactly **one fight's
ammunition**, so the player arrives at the first shop nearly empty with coins to restock. That is
the rhythm the vision describes.

### 3.5 Ten coins per fight won

`COINS_PER_ENCOUNTER_WIN` moves from 1 to **10**.

### 3.6 Shop prices are deliberately NOT changed

**Developer decision, 2026-08-25, taken knowingly.** At 10 coins in and a 1-coin heal and 1-coin
pull, the player can buy everything on every visit and the shop poses no choice. The developer's
position: _"I know the shop will remove choice but we'll change numbers after."_

This is the ship-rough-then-tune posture applied deliberately. It is recorded here so it is not
later mistaken for an oversight, and so the first play session knows to look at it.

---

## 4. Does this reach the target?

The stated target: **Aoife (10 HP) dies in one or two tricks once the player understands buffs, is
beatable without them, and becomes trivial once silver and gold cards are held from the start.**

Cash-out is `bank × multiplier`, both climbing by one per trick taken.

| Line                                                                | Arithmetic                   | Result                                               |
| ------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| Bare, no cards                                                      | Two tricks in a row: `2 × 2` | 4 — Aoife takes several hands. **Beatable without.** |
| One bronze Bell-Taker (Momentum), winning two Bell tricks           | `bank 2 × (2 + 4)`           | **12 — dead on trick two.**                          |
| Three bronze Takers (Momentum) + three bronze Blades, one won trick | `bank 1 × (1 + 6)` + 3       | **10 — dead on trick one.**                          |
| Gold Taker (Momentum) + gold Taker (Blade), one won trick           | `bank 1 × (1 + 5)` + 5       | **11 — dead on trick one.**                          |

**The ladder the developer described falls out of the numbers as they already stand.** No new
scoring rule is required — the pass is a subtraction (fewer cards, no AP) plus two constants
(20 cards, 10 coins) plus one predicate (consumed).

---

## 5. Numbers deliberately not chosen

Every figure below is the developer's and is **[open]**:

- The new cap values, or whether caps are removed entirely (§3.3).
- Whether a wholly-clipped card is refused, or allowed to be wasted (§3.3).
- Whether Feeder regains its Momentum version (§1).
- Whether the five one-shot items stay in the game at all (§2).
- Every shop price, deferred by decision rather than undecided (§3.6).

---

## 6. What this document does not answer

- **Whether the run becomes winnable.** This pass targets _felt power_, not the 25-fight curve.
  Opponent health still climbs 10 → 135 while nothing multiplies the bank (the Whetstone remains
  pulled from the shop by version 5's pared-shop decision). Making fight one trivial does not by
  itself change what happens at fight twenty; it changes where the difficulty has to come from.
- **The streak-length problem.** A live browser session driving an exact one-ply lookahead — with the
  Quarry's hand and skull assignments fully visible — found that **five of eight leads had no
  outcome available that both won the trick and avoided a skull**. Since damage is the sum of
  squared streaks, a streak that breaks every other trick keeps realised damage near 2 against a
  ceiling of 36. More powerful cards amplify a streak; they do not make one easier to build. This is
  the deepest open question in the design and it is untouched by this pass.
- **Onboarding.** `src/` still contains no tutorial, no help screen and no first-run anything, and
  the one recorded outside-player session found a player who did not know what a skull was, did not
  know dodging one was good, and did not know which health bar was hers.

---

## 7. Provenance

- Live browser playthrough, `Version-5` @ `620afd9`, 2026-08-25 — lost fight 1 of 25 under near-optimal
  trick-level play. Logged in `.docs/ai-play-tester/live-playthrough-log.md`.
- Fight-0 buff measurements, 1000 runs seeded — `.docs/ai-play-tester/buffs-weak-at-run-start.md`.
- Run winnability, 900 runs across 6 configurations — `.docs/implementation/run-winnability-simulation.md`.
- Shipped behaviour verified against `src/hunt/apConfig.ts`, `src/hunt/buffActivation.ts`,
  `src/hunt/consumables.ts`, `src/hunt/buffTemplates.ts`, `src/hunt/buffEvaluation.ts`,
  `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/buffHandlers.ts`,
  `src/app/warCouncil/intentPreview.ts`.
