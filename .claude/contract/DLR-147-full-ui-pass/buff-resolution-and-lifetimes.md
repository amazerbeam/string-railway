# DLR-147 — How a buff resolves, and how long it lasts

Reference for whoever plans **DLR-148** (the buff gallery). It answers one question the mockup
cannot: *given a card on screen, when can it be used, when is it checked, when does it disappear,
and what does the player need to see while that happens.*

Written 2026-08-26 against the code as it stands on `Version-5.1`. Everything below is verified
against `src/`, not against a design document — where the two disagree, this file follows the code
and says so.

**Two things it deliberately does not do.** It states no tuning value, and it does not restate the
rules: `.docs/game_rules/the-hunt.md` owns the ruleset and `.docs/implementation/hunt/` owns the
mechanics. This is the UI-facing view of both.

**One forward reference.** Items marked **[DLR-150]** are the Feeder carry, which is ticketed and
not built. They are included because the gallery has to have somewhere to put the carry readout, and
discovering that after the panel is laid out is expensive.

---

## 1. What is actually in the pool

**Thirteen templates, each at bronze / silver / gold.** DLR-145 pared the pool and narrowed the
template's own types, so everything outside this set is *unconstructible*, not merely unweighted.

| Family | Parameter | Reward axes | Templates |
|---|---|---|---|
| Taker — took a trick playing suit S | Bells, Keys, Moons | Blade (flat damage), Momentum (multiplier) | 6 |
| Feeder — did not take a trick, playing suit S | Bells, Keys, Moons | Blade only | 3 |
| Sidestep — did not take a skull trick | none | Blade, Momentum | 2 |
| Cheat, Timebomb — activated, no condition | none | none | 2 |

**[DLR-150] adds 3** — the Momentum row returns to Feeder, taking the pool to 16.

**The gallery mockup shows cards that cannot exist.** That is fine as a grid load-test and must not
be read as a card list. Absent from the live pool: the eight cut condition families (Mark of the
*R*, Glutton, Hoarder, Unbloodied, Debt Collector, Keepsake, Miser, Cornered); **every `(Purse)` and
`(Second Wind)` card**, because the coins and AP-refund axes are unconstructible; and all five
consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass), which have timings and tier
tables but no template and no slot weight.

The opening pile is **four bronze cards**, drawn for real from the thirteen. A gallery designed
around twenty-three simultaneous cards is designing for a case the game does not currently produce.

---

## 2. Getting a buff active

Two taps: the first poises the row, the second commits. `Escape` or closing the panel drops an
unspent poise.

| Gate | Rule | Owner |
|---|---|---|
| Panel opens at all | `discardWindowOpen \|\| canAct` — deliberately **wider** than the activation window, so a row can be read mid-trick even when it cannot be used | `buffHandlers.ts` → `loadoutDoorOpen` |
| A row is usable | **Cheat**: `canAct`. **Every other card**: `discardWindowOpen` | `roundUiState.ts` → `buffActivationWindowOpen` |
| At the commit tap | the card **leaves the pile immediately**, before the trick resolves | `buffActivation.ts` → `activateFromPile` |

`discardWindowOpen` means *between tricks*: the current trick is empty, no reveal is being held, no
prompt is open, the round is not complete.

### CARRY — the mockup's usability fence is inverted

The gallery fences Cheat, Timebomb and Ward into a group reading *"these are pressed, and only
between tricks"*, with the condition cards shown as usable mid-trick. **The code is the other way
round.** Twelve of the thirteen cards are between-tricks only, and the single exception is **Cheat**,
which is reachable mid-trick deliberately — gating it on `discardWindowOpen` would make its
follow-suit break unreachable at the only moment it is worth anything, with a lead already on the
table.

This is not a mockup bug to silently correct in the port; it is a **question for the developer**,
because the two readings produce different surfaces. Under the code, the gallery is a
**between-tricks planning screen** with one mid-trick escape hatch, and it probably wants to open
itself at the trick boundary rather than be a button the player remembers. Under the mockup, it is a
live tray — which is a rule change to `buffActivationWindowOpen` and belongs in its own ticket, not
in a UI port.

### Refusals, in the order they are reported

`NoEffectYet` → `WindowClosed` → `AlreadyActive` → `InsufficientAp`. Action points are switched off,
so in practice only the middle two occur — the cost of a buff is the card. **A greyed row must say
which of these applies**; a row that is merely dim tells the player nothing about whether waiting
would help.

---

## 3. What happens when the trick resolves

1. **The outcome is decided** by two facts — did the player take the trick, and was there a skull.
2. **Each activated buff's condition is checked**, filtered by cadence. Every live condition card is
   `Event`, which fires every time its condition is true. (`Threshold` fires once per hand and
   `Terminal` only on the final trick; both exist in `BUFF_CADENCE` but no live card uses them.)
3. **Each fired reward accrues into its own pool** — flat damage, or multiplier.
4. **The Overlap Bonus adds `firedCount − 1` to the multiplier pool.** Two cards firing gives +1,
   three gives +2, regardless of what those cards themselves pay.
5. **On a Loss, the forced cash-out spends both pools**: `⅔ × bank × (multiplier + momentumPool)`,
   with `bladePool` added **outside** the reduction, so flat damage is never reduced and never lost
   to rounding.
6. **On the final trick the hand-end cash pays the same thing in full**, with no reduction.

**The pools pay once per hand.** Spending them through Apply Damage on trick 3 means they do not pay
again at hand end. Any readout that shows a banked figure must therefore also show when it has been
spent, or the player will expect it twice.

### The four outcomes, and why the words fight the player

| | Clean trick | Skull trick |
|---|---|---|
| **Took the trick** | clean win — +1 bank, +1 multiplier | **ate the skull** — −1 health, ⅔ cash-out, both reset |
| **Did not take it** | clean loss — −1 health, ⅔ cash-out, both reset | **dodge** — +1 bank, +1 multiplier |

Every buff condition reads *did the player take the cards*. The bank, the multiplier and the damage
read *did the player gain or get hurt*. A skull decouples the two, and both are currently called win
and lose. At ~30% skull density that is roughly two of six tricks a hand — **a third of the player's
decisions sit in the quadrant where the words invert**, which is the single largest comprehension
problem on this surface.

A `High` / `Low` rename is written up in `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` and is
**not built**. Do not use that vocabulary in the port. What the gallery *can* do without any rename
is stated in §6.

---

## 4. Lifetimes

| Card | Usable | Checked | Leaves the pile | Persists after |
|---|---|---|---|---|
| Taker ×6 | between tricks | at that trick's resolution | at the commit tap | — |
| Feeder ×3 | between tricks | at that trick's resolution | at the commit tap | **[DLR-150]** carry pool, if it fired on a **Loss** |
| Sidestep ×2 | between tricks | at that trick's resolution | at the commit tap | — |
| Cheat | **mid-trick** | never — no condition | at the commit tap | `cheatTricksRemaining` = 1 / 2 / 3, decremented per commit |
| Timebomb | between tricks | never — no condition | at the commit tap | `timebombArmedDamage`, lands at the **next** trick's resolution |

A card is spent whether or not it pays. A condition that did not come true is a legitimate player
mistake, not an error state, and must not be reported as one.

### The six clocks

Conflating any two of these is the defect to watch for in the port.

| Clock | Runs from | Ends at |
|---|---|---|
| Poise | first tap | second tap, or `Escape` / panel close |
| Card ownership | in the pile | the commit tap |
| Activation record | commit | the next trick boundary (`openBuffWindow`) |
| Accrual pools | a buff fires | spent at the next cash-out; zeroed at hand start |
| Cheat duration | commit | N commits later |
| Timebomb arming | commit | the next trick's resolution |
| **[DLR-150]** Carry pool | a Feeder fires on a Loss | seeds the next hand; **zeroed at the fight boundary** |

---

## 5. What [DLR-150] changes

Only the Feeder, and only on the loss half.

- **Fires on a dodge** — unchanged. Pays into this hand's pool, stacks with everything else that
  fired, counts toward the Overlap Bonus.
- **Fires on a Loss** — the reward leaves the hand into a carry pool. This hand's cash-out pays
  nothing from it.
- The carry seeds the next hand's pool, compounds hand to hand within a fight, and is zeroed at the
  fight boundary whether the fight was won or lost.
- **Momentum Feeders return**, taking the pool from 13 to 16 templates.

Sidestep never carries: its condition is *skull trick and did not take it*, which is a win by
definition, so it is the only condition card that can never fire on a bad outcome.

**The carry needs two readouts, not one** — accumulating during the hand it is earned in, and as an
opening figure at the top of the next hand. The whole effect is a promise made during a hand the
player is losing and redeemed at the start of the next one; with only one half on screen the player
experiences a bad hand followed by a slightly better one and never connects them.

---

## 6. What the surface has to show

Ranked by how much each changes a decision the player is actually making.

**The consequence readout — already designed, in `mockup-trick-readout.html`.** This is the single
biggest lever on the comprehension problem in §3, and it exists: an *if you win / if you lose* pair
beneath the trick, describing what the led card means for the player, rendered only when there is
something to say. It needs **no vocabulary change to ship**.

Two things about it are worth carrying into the buff surface specifically. First, it deliberately
**never predicts the outcome** — both branches are shown, neither highlighted — because the ruleset
withholds the Quarry's card and a readout that leaned would leak it. That constraint binds any buff
readout too: a gallery row must not imply which way a trick will go.

Second, the constraint is asymmetric and the buff panel can exploit that. When the **Quarry has
led a skulled card**, the skull is face up and the player's own choice decides the quadrant — so a
hovered hand-card *can* state its outcome outright, and a Sidestep row *can* say it will fire.
When the **player leads**, nothing is decided: the Quarry's card is face down and whether the trick
carries a skull is not yet determined. The buff panel therefore has real information to offer on the
follow and none on the lead, which is the same shape as the readout's own open question about what
replaces "Their intent" in the lead state.

**The window state per row, with its reason.** Twelve of thirteen cards are between-tricks and Cheat
is not; no player will infer that. A disabled row must distinguish *not yet* from *not ever*.

**The two accrual pools, live.** Banked damage and banked multiplier, visible as they accumulate,
because the player has to decide when to spend them through Apply Damage — and visibly emptied when
they are spent, since they pay once per hand.

**[DLR-150] The carry, in both places.** See §5.

**Cheat's remaining tricks, and Timebomb's armed state.** Both are promises made on one trick that
resolve on a later one, and both currently vanish from view when the panel closes.

**Overlap, at the moment it happens.** Two cards firing on one trick is the game's only combo, and
the +1 it pays is invisible today. It is the cheapest available moment of drama on this screen.

---

## Open questions for the developer

1. **Is the gallery a between-tricks planning screen, or a live tray?** §2. The code says the
   former; the mockup implies the latter. This decides whether the panel opens itself at the trick
   boundary or waits to be summoned, and changing it is a rules ticket, not a UI one.
2. **Does the gallery show unobtainable cards at all?** The mockup's twenty-three include eight cut
   families and every coins-paying card. A gallery of the live thirteen looks very different, and a
   real hand is four bronze cards.
3. **How does a spent card leave?** ~~Nothing currently animates the pile losing a card at the commit
   tap, and the card is gone before the trick it was bought for has resolved — so the player sees it
   vanish, then sees the payout, with nothing joining the two.~~ **Answered in the mockups.**
   `mockup-buff-loading.html`, folded into `mockup-buff-gallery.html`, has the card leave the pile and
   land on the hand card you are about to play — where it is counted, drives that card's load ring,
   and can be taken back off. The gap is closed by an object rather than by the player's memory. Note
   this shifts the question rather than deleting it: it now needs a rule on what happens to a load
   when the trick actually resolves.
