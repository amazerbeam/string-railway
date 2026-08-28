# The roll-over damage model

Ticket-ready specification, written 2026-08-27 from a live design conversation. **Supersedes nothing
in `version-6-developer-idea.md`** — that pass's card pool, consumption rule and starting counts all
stand. This changes only how damage is calculated and when it is paid.

**Suggested summary line:** Replace `bank × multiplier` with a per-trick roll-over pot the player
chooses to cash or push.

**Layer:** `engine` + `ui`

---

## Why

Apply Damage exists to make holding a streak a bet, and it does not. A hit currently returns
two-thirds of the pot, so pushing one more trick only needs the player to be about a fifth to a
third confident of winning it — and since streaks die at two or three tricks in practice, the honest
play is **always push**. The control is a chore rather than a decision.

`the-hunt.md`'s Known tensions already flags this and guesses the opposite way: it feared the answer
would be "always cash". The arithmetic says "never cash", which is worse, because the bet is
invisible rather than merely trivial.

There is a second dominant line. A Momentum card's points are pooled and added to the multiplier at
cash-out, so they multiply the whole pot however late the card was fired. **Holding every card back
and dumping them on the final trick is therefore strictly better** than spending as you go.

---

## Current behaviour

Bank counts tricks taken. The multiplier counts the same tricks, so the two always hold the same
number and a streak of _n_ pays exactly `n × n`. Buff rewards pool across the hand and land once, at
whichever cash-out fires:

```
voluntary (Apply Damage) and end-of-hand:  bank × (streak + momentum) + blade
forced (a hit):                            floor(bank × (streak + momentum) × 2/3) + blade
```

Momentum is inside the product; Blade is added outside it, after the two-thirds floor. The hand's
final trick force-cashes the bank in full. Apply Damage is refused unless the player is on lead with
no card yet on the table.

---

## New behaviour

```
base = baseDamage      bd = buffDamage      bm = buffMult      roll = tricks in the streak

trick damage = (base + bd) × bm
total        = every trick damage added up across the streak
pot          = total × roll
```

`baseDamage` is a configured constant — **1**. `buffDamage` is the flat damage of the Blade cards
fired **on that trick**. `buffMult` is 1 plus the points of the Momentum cards fired **on that
trick**. Neither pools across tricks any more.

**This is keyed to the outcome axis, not the mechanical one.** A skull inverts a trick, so "took the
trick" is not the test — see `the-hunt.md` §7's four outcomes. The two branches below are
**banked** (a clean win, or a dodge — a skull trick the player did not take) and **hurt** (a clean
loss, or eating a skull — a skull trick the player did take). Eating a skull must not accrue damage
or raise the prompt, and a dodge must not wipe the pot.

**On a banked trick:** the trick damage is added to the running total, the roll increments
by one, and the player is asked to **apply** or **roll over**. Applying deals the pot to the Quarry
and resets the total and the roll to zero. Rolling keeps both and play continues.

**On a trick that hurts the player:** no choice is offered. The player takes the hit's damage, the
whole pot is lost, and the total and the roll are both zero for the next trick. There is no
two-thirds consolation.

**The hand boundary does nothing.** A streak carries from trick 6 into trick 7 of the next hand. The
end-of-hand force-cash is removed.

---

## Worked example

Every trick the player fires cards worth +2 flat damage and +2 multiplier points, and wins all six
tricks of the hand.

**New**

```
  trick 1   (base 1 + bd 2) × bm 3 = 9       total 9  × roll 1 = pot 9
  trick 2   (base 1 + bd 2) × bm 3 = 9       total 18 × roll 2 = pot 36
  trick 3   (base 1 + bd 2) × bm 3 = 9       total 27 × roll 3 = pot 81
  trick 4   (base 1 + bd 2) × bm 3 = 9       total 36 × roll 4 = pot 144
  trick 5   (base 1 + bd 2) × bm 3 = 9       total 45 × roll 5 = pot 225
  trick 6   (base 1 + bd 2) × bm 3 = 9       total 54 × roll 6 = pot 324
```

**Today, same cards**

```
  trick 1   bank 1 × (mult 1 + mom 2)  + blade 2  = pot 4
  trick 2   bank 2 × (mult 2 + mom 4)  + blade 4  = pot 16
  trick 3   bank 3 × (mult 3 + mom 6)  + blade 6  = pot 33
  trick 4   bank 4 × (mult 4 + mom 8)  + blade 8  = pot 56
  trick 5   bank 5 × (mult 5 + mom 10) + blade 10 = pot 85
  trick 6   bank 6 × (mult 6 + mom 12) + blade 12 = pot 120   <- force-cashed here
```

Bare, with no cards fired at all, the two are **identical** — both pay 1, 4, 9, 16, 25, 36. The gap
opens only once buffs are involved, because `bd` moves inside the multiplication and the roll
multiplies the accumulated total rather than being one term added to the streak count.

---

## The apply-or-roll prompt, and where Apply Damage goes

### Today

Apply Damage is a **button in the action bar**. It is pressable only while the player is on lead
with no card yet on the table, and `applyDamageRefusalFor` refuses it with a printed reason in five
cases — not your move, trick in progress, a payout already pending, and an empty bank. It is a
control the player may go a whole hand without touching.

### Under this ticket

**The button is removed.** The decision becomes a **prompt raised at the moment a taken trick
resolves**, before the next trick begins, and it is the only place the pot can be cashed.

The moment, precisely:

```
trick resolves
  → player took it?
      yes → trick damage added to total, roll +1
          → PROMPT:  apply  |  roll over
              apply     → pot dealt to the Quarry, total and roll to zero
              roll over → total and roll stand, next trick begins
      no  → player takes the hit's damage, total and roll to zero
          → no prompt, next trick begins
```

Three consequences of moving it there:

1. **Every refusal reason disappears except one.** "Not your move", "trick in progress" and "payout
   pending" cannot occur at a moment that is by definition after a trick has resolved. The only
   remaining case is a pot of zero, which cannot happen either — the prompt only follows a taken
   trick, and a taken trick has just added damage to the total.
2. **The player can no longer cash mid-trick or on lead.** Cashing is now something that happens
   between tricks and only after a win, never while a trick is in flight.
3. **It fires up to six times a hand**, where the old button might be pressed once or never. That
   is the point of the change and it is also the main interaction-cost risk in it.

### What the prompt has to show — **the developer's call**

The layout, wording and whether the prompt blocks play or can be skipped with a default are visual
and feel judgements, and are not decided here. What it has to make available to the decision:

- the pot as it stands — what applying pays right now;
- what the pot becomes if the next trick is also taken;
- the current roll, since that is what is really being wagered.

**[open] — does the prompt block, or does play continue until the player acts?** A blocking prompt
six times a hand may read as a nag; a non-blocking one risks the player rolling by accident. This is
a play-and-see judgement.
## Acceptance criteria

1. A trick the player **takes** computes `(baseDamage + buffDamage) × buffMult`, adds it to a running
   total, and increments the roll by one.
2. The pot is `total × roll`, and it is on screen with its parts legible.
3. After a taken trick resolves, and before the next trick begins, the player is offered **apply** or
   **roll over**. This prompt is the only place the pot can be cashed.
4. The Apply Damage **button is removed** from the action bar, along with its leader-only and
   trick-in-progress refusals — `applyDamageRefusalFor` has no caller left.
5. Applying deals the pot to the Quarry and sets the total and the roll to zero.
6. Rolling over leaves both untouched and play continues.
7. A trick the player **loses** deals the hit's damage to the player, sets the total and the roll to
   zero, deals nothing to the Quarry, and offers no choice.
8. The end of a hand does **not** cash the pot. Total and roll carry into the next hand unchanged.
9. The pot, the total and the roll all reset to zero when a fight ends.
10. `baseDamage` is a single configured constant, **1**, read in one place.
11. A Blade card contributes to `buffDamage` on the trick it was fired on only; a Momentum card
    contributes to `buffMult` on the trick it was fired on only. Neither pools across tricks.
12. Tier values are **unchanged**: Blade pays 1 / 3 / 5 and Momentum pays 2 / 3 / 5 at bronze /
    silver / gold.
13. Bare play — no cards fired — pays 1, 4, 9, 16, 25, 36 across a six-trick hand, matching today.

---

## Out of scope

- **Any balancing.** This lands unbalanced on purpose. The developer's position: _"I want to see how
  this works before balancing it."_ It is expected to be roughly two and a half to three times
  today's payout for identical cards, with no hand-end cap. No health total, shop price or tier
  value moves in this ticket.
- **The damage penalty on buff cards — planned, and deliberately not in this ticket.** The intended
  next step is that firing a buff also stakes the player's health: each card carries a damage
  penalty, those penalties accumulate as the streak grows, and **the player pays them when the streak
  crashes** — so a hit costs the pot *and* a wound that scales with how greedy the run to that point
  was. That mirrors the pot exactly, and it is what stops this ticket's payout from being free.
  Still tentative, and two things about it are unanswered: whether the accumulated penalty clears
  when the pot does, and whether it is a flat figure per card or scales with tier. **Build and play
  this ticket first** — the point of landing the formula unbalanced is to find out how much
  counterweight it actually needs.
- **Anything that moves `baseDamage`.** It is a constant here. A card family that raises it — paying
  back only if the streak survives — is a separate design.

---

## Known, unresolved — must be addressed, not accepted

### Holding every buff back until the trick before you cash is still weakly dominant

The §"Why" section names holding cards to the final trick as one of the two dominant lines this
model exists to kill. It kills the **multiplication** reason — Momentum no longer multiplies the
whole pot from wherever it was fired — and then reintroduces the same line for an **exposure**
reason.

Timing is now value-neutral. A Blade fired on trick 1 and the same Blade fired on trick 6 both add
the same amount to a total that is multiplied by the same roll at cash-out. Exposure is not neutral:
a card fired early can be wiped by any of the tricks between it and the cash, and a card fired on the
trick you then cash on is wiped by nothing.

Worked, with buffs totalling +6 flat damage and +5 momentum points:

```
dump on trick 1, then roll five bare tricks
  total = (1 + 6) × 6 + 5 × 1 = 47      roll 6   pot 282   — five tricks of exposure
roll five bare tricks, then dump on trick 6 and cash
  total = 5 × 1 + (1 + 6) × 6 = 47      roll 6   pot 282   — zero exposure
```

Identical payout, strictly less risk. So the optimal line is: roll cheap bare tricks to build the
roll, dump everything on one trick, cash immediately.

**Two things currently soften it, and neither is a fix.** Buff conditions gate when a card may fire
at all — a hearts Taker needs a hearts trick that banks — so the schedule is not wholly the player's
to choose. And cards are consumed, so an unfired card is still an asset rather than a wasted one.

**The planned damage penalty makes it worse, not better.** If penalties accumulate across the streak
and are paid when it crashes, firing early buys more tricks of accumulated penalty than firing late
does, on top of the exposure. Read this section before designing that counterweight.

**Candidate levers, none chosen — the developer's call:**

- cap how many buffs may fire on one trick, so a dump has to be spread;
- decay or expire an unfired card, so holding has a carrying cost;
- pay a bonus for firing on a trick where the roll is already high, so early firing buys something
  late firing cannot.

### Does the roll survive a hit?

Wiping the total and the roll together makes a hit total, which is the accepted intent. Halving the
**roll** instead — keeping the pot wipe — would leave a long survivor something to rebuild on, and
it is the cheapest catch-up lever available without adding a rule anywhere else. Not decided.

---

## Known consequences, accepted

- **The payout is much larger and nothing caps it.** Removing the end-of-hand force-cash means a
  streak is limited only by losing a trick or choosing to cash, not by the hand running out.
- **Blade changes character.** It used to be added outside the product and be worth exactly its
  printed number; inside the bracket both `buffMult` and the roll multiply it, so on a long streak
  the same card is worth many times more. Momentum moves the other way — it now affects only its own
  trick instead of multiplying the whole pot.
- **A hit is total.** Losing a nine-trick streak now costs everything rather than a third. That is
  the change that makes the push a real decision, and it will feel harsh.

---

## Files likely touched

- `src/warCouncil/bank.ts` — `resolveTrickBank`, `cashValue`, `forcedCashValue`. The forced-rate
  constants have no caller left once a hit pays nothing.
- `src/warCouncil/voluntaryCashOut.ts` — `applyDamageRefusalFor`; the leader-only and
  trick-in-progress clauses go.
- `src/app/warCouncil/buffRoundState.ts` — `foldBuffOutcome`; buff rewards stop pooling across the
  hand.
- `src/app/warCouncil/roundUiState.ts` — `applyDamageStock`; the control becomes a per-trick prompt.
- `src/hunt/` — wherever the Blade and Momentum accrual pools and their cash-out spend live.

---

## Provenance

Design conversation, 2026-08-27. Today's equation verified against `src/warCouncil/bank.ts`; Apply
Damage's current gating against `src/warCouncil/voluntaryCashOut.ts`; tier values from
`version-6-developer-idea.md` §1; health benchmarks from `.docs/game_rules/the-hunt.md` §8.
