# The Discard

Design decided 2026-08-19, in conversation with the developer. **Committed direction, not a
parking-lot idea** — `ideas.md` holds the speculative material; this document holds a mechanic that
is going to be built.

It is scoped ahead of the remaining Version 4 tickets (DLR-92 through DLR-98). That ordering is
deliberate and stated in [§7](#7-why-this-goes-before-the-rest-of-version-4).

---

## 1. The problem this exists to solve

The player is regularly given a decision that is not a decision. The developer hit it in play on
2026-08-19 and screenshotted it; the numbers below come from 1,500 seeded runs driven through the
real engine and reducer (`src/__tests__/sim.test.ts`, best available player policy).

Measured over 32,919 follows:

| Fact                                                             | Rate      |
| ---------------------------------------------------------------- | --------- |
| Follows where the player holds **exactly one legal card**         | **44.4%** |
| Follows where **every legal card produces the same outcome**      | **80.2%** |
| Follows that are a **guaranteed hit** whatever the player plays   | **30.5%** |

So roughly one follow in five is a genuine decision. The rest are a result being delivered.

In absolute terms that is about **one forced hit per hand, two per fight**. Of the 10,042 forced
hits measured, 4,427 landed on a live streak and 2,043 on a streak of two or more — which is the
case the developer screenshotted, and the case that stings, because it destroys something that was
being built.

### The mechanism, precisely

Three independently reasonable decisions compound:

1. **The Quarry always leads its lowest legal card.** `chooseCpuCard`'s lead branch is
   `lowestCard(legal)`, unconditionally. Its own comment records that skull-awareness on the lead
   was deliberately left out of scope; the skull-dodging filter exists only on the **follow**
   branch.
2. **The active skull curve (`SKULL_WEIGHTS_HUMP`) puts the skull weight on ranks 3–6** — weights
   5, 8, 10, 10.
3. **Follow-suit binds hardest against a low lead**, because almost everything the player holds in
   that suit beats it.

The result: **24% of the Quarry's leads carry a skull, and 47.3% of those force the player to eat
it.** Conditioned on the leading rank:

| Skulled lead rank | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   |
| ----------------- | --- | --- | --- | --- | --- | --- | --- | --- |
| P(forced eat)     | 74% | 61% | 54% | 46% | 44% | 35% | 27% | 11% |

**The curve's own justification is written for the other case.** `config.ts` defends HUMP on the
grounds that a mid-rank skull means "the player's own card decides who takes the trick: their
skulled 6 loses to a 9 and beats a 4, so the outcome is the player's choice rather than the deal's."
That is correct when the Quarry **follows** with a skull. It is exactly inverted when the Quarry
**leads** one — the same rank that creates a choice on the follow removes it on the lead. The curve
was reasoned about carefully for one of the two positions and then applied to both.

### Why the fix is not a shop item

The forced trick occurs about twice a fight. **The shop opens once every fight.** A purchased,
one-shot escape answers a per-trick problem on a per-fight cadence, so the player saves up to buy
one exit from something that will happen to them a dozen more times before they can buy another.
The developer rejected this route on 2026-08-19 and the arithmetic supports it: measured, spending
the coin on a Cheat rather than a Heal **costs 0.6 fights of run progress**, so the game's existing
designed escape from a forced follow is already the wrong purchase.

**The answer has to live at the same tempo as the problem.** Balatro's discards are baseline for
that reason — you never buy a discard; you buy things that change what discards do.

---

## 2. The mechanic

**Between tricks, the player may throw away up to three cards from hand and draw the same number of
replacements from the draw pile.** Three such discards per fight.

### D1 — It is a swap, not a burn. **[decided]**

`n` cards out, `n` cards in. Hand size is unchanged, so the six-cards/six-tricks invariant holds and
`HAND_SIZE` keeps its single meaning (`config.ts` states that hand size and trick count "cannot
differ, and two constants that must be equal is a bug waiting for one of them to be edited").

### D2 — Timing: between tricks, before the trick's first card is laid. **[decided]**

Not mid-trick. When the Quarry leads, this means the player discards **before seeing her lead**.

This is the load-bearing decision in the whole mechanic and it was chosen against the alternative
knowingly. A discard permitted after the lead is on the table defuses every forced trick on sight —
satisfying twice, then a tax paid with a button. A discard permitted only before the lead is a
**read**: the "What the Quarry holds" panel already shows her suit counts and which of them carry
skulls, so the collision is visible in advance and acting on it is the skill.

**This is what finally makes that panel load-bearing.** Today it is information the player cannot
act on. With a discard it becomes the most important thing on the screen.

### D3 — Chaining is allowed. **[decided]**

More than one discard may be spent in the same gap between tricks. Throw three, look at what
arrived, throw three more.

The developer's reasoning, 2026-08-19: *"if you are one hand away from killing the Quarry then it's
worth the risk."* Committing the fight's entire discard budget to rescuing one streak is a
gut-check, and gut-checks are the genre's currency. The cost is understood and accepted — see
[§5](#5-what-this-costs-and-what-to-watch).

### D4 — Three discards per fight. **[provisional — the developer's value]**

Carried across the hands within a fight, reset when a new fight begins. **Three, not five**, set by
the developer on 2026-08-19 with an explicit instruction to make it easy to change: *"if it's too
little we'll know easier than too much."*

The arithmetic behind three rather than five: a fight generates about **two forced hits**. Five
attempts at two problems is not scarcity — the player would never decide *whether* to spend one,
only *when*, and "when" is written on the panel. Three means at least one forced hit has to be
eaten.

A named config constant (`DISCARDS_PER_FIGHT`), stated once, sitting with the other tunables.

### D5 — Up to three cards per discard. **[provisional — the developer's value]**

Enough to strip a suit from a six-card hand in one action. Also a config constant
(`MAX_CARDS_PER_DISCARD`).

### D6 — Discarded cards go to the bottom of the draw pile. **[decided]**

**No discard pile, and no reshuffle rule.** Both were proposed and are unnecessary:

- **The deck is reshuffled from scratch every deal.** `dealRound` calls `shuffle(createDeck(), rng)`
  each hand — 6 to the player, 6 to the Quarry, 1 decree, leaving **20 in the draw pile every single
  hand**. Three discards of three cards is nine, so the pile cannot be exhausted.
- **The convention already exists.** The Woodcutter's printed ability draws one and discards one to
  the bottom of the pile, in the design (`hybrid-design.md` §5) and in the code
  (`abilities.ts`: `drawPile: [...restOfPile, discard]`). The discard reuses it exactly.

This removes a whole concept — a pile, a reshuffle trigger, and a surface to render it on.

### D7 — The draw is blind. **[decided]**

The player cannot see the pile. Roughly a quarter to a third of it is any given suit, so throwing
two Bells and drawing two returns at least one Bell about half the time.

That is a feature. **The discard is a bet that improves the odds, not a hard counter** — the skulled
lead stays threatening instead of becoming solved. Chaining (D3) is what lets the player pay more to
improve the bet, which is the whole reason D3 is interesting.

### D8 — The Quarry gets nothing. **[decided]**

Per DLR-81, the Quarry plays by exactly the player's rules and holds no powers. The discard is the
player's alone, exactly as the Cheat is.

---

## 3. The interesting decision this creates

A discard does not merely improve a hand. **It can make the player void in a suit** — and
follow-suit only binds a player who actually holds the led suit.

So stripping every Bell from hand buys **total immunity to Bell tricks for the rest of the hand**,
at the price of never being able to take one. That is a chunky, legible, committing decision of a
kind the game does not currently contain anywhere, and it falls out of the existing rules at no
cost.

It also means the discard is not an undo button. It is a trade with a downside the player has to
weigh.

### Worked example — the developer's own screenshot, replayed

Fight 1, Aoife. Trump is Bells (decree: 11 of Bells). Bank 2 × 2, cashing for 4. Player holds
**7♭, 10♭, 9 Keys, 10 Keys**. The panel shows Aoife holding two Bells — one skulled — and one Key.

**Today:** Aoife leads the 3 of Bells, skulled. Follow-suit binds the player to `{7♭, 10♭}` and both
beat a 3. Every legal card wins a skulled trick → SkullWin → one heart lost, and the 2 × 2 cashes 4
into Aoife. The player chooses which of two identical outcomes to spend a card on.

**Under this design:** before Aoife leads, the panel already says a skulled Bell is coming and the
player holds two Bells. Spend a discard, throw both, draw two. Roughly half the time the player is
now void in Bells — Aoife's skulled 3 wins a trick the player was never forced into, the player
sheds their worst Key, and the streak survives. The other half a Bell comes straight back, and the
player decides whether to chain a second discard or accept the hit.

The forced outcome becomes a read, a bet, and a resource decision.

---

## 4. What it reuses

Scored by rules added, per Rosewater's lesson that you rarely need to change much to change
everything:

| Piece                                       | Status                                       |
| ------------------------------------------- | -------------------------------------------- |
| Draw pile (20 cards, idle except Woodcutter) | **Exists** — only the Woodcutter touches it   |
| Draw-and-discard-to-bottom machinery         | **Exists** — `applyWoodcutterDraw`            |
| "What the Quarry holds" panel                | **Exists** — gains its first actionable use   |
| Void-in-suit freeing the follow              | **Exists** — `legalMoves`' own fallback       |
| Per-fight resource carried across hands      | **Exists** — the pattern `cheats` already use |

**New concepts: one** — a counted, spendable discard action. Everything else is wiring.

---

## 5. What this costs, and what to watch

**Chaining (D3) is the risk, and it was taken deliberately.** Three chained discards dig nine cards
into a twenty-card pile, which makes the escape close to reliable at the moment the player most
wants it. That is precisely the "one hand away from the kill" fantasy the developer asked for, and
it is also the thing most likely to make three discards behave like five. **Watch it first.** If the
mechanic feels toothless, the lever to try before changing the count is capping the chain, not
cutting `DISCARDS_PER_FIGHT`.

**Do not tune the discard count to fix pacing.** A generous discard budget improves hands, which
lengthens streaks, which shortens fights — so it will read as a pacing fix and drift upward, quietly
defanging the skull as a side effect. Pacing has its own lever (§7). Set the discard count purely on
how threatening a skulled lead should feel.

**The Quarry's lead rule is still wrong and this does not fix it.** Teaching `chooseCpuCard` not to
lead its skulls remains the cheaper, more direct fix for the same complaint — the filter already
exists on the follow branch. It is not in this scope because the developer judged that a forced
lead will happen anyway and the player needs an answer regardless. Recorded here so it is not lost;
**re-measure after the discard ships**, because with an answer in hand the Quarry's lead rule may
become a virtue rather than a defect.

---

## 6. Open — the developer's calls

Both are tuning, both are already shipped as constants, and neither blocks the build.

- **`DISCARDS_PER_FIGHT` = 3.** Ship it, play it, move it.
- **`MAX_CARDS_PER_DISCARD` = 3.** Same.

**The Cheat is explicitly out of scope.** The developer's position, 2026-08-19: *"that's just there
to get the shop up and running."* The overlap between "ignore follow-suit once" and this mechanic is
real and worth revisiting later; it is not worth revisiting now.

---

## 7. Why this goes before the rest of Version 4

The developer's stated priority on 2026-08-19 was that **reaching the shop is a slog**. It is, and
the cause is measurable: beating Aoife takes about fourteen tricks, of which roughly five do
anything at all, and it pays **one coin**. Playing the fight brilliantly also pays one coin.
**Nothing in the game currently converts skill into money.**

That is not a shop-frequency problem and more shop visits will not fix it. It is a payout-rate
problem, and the fix is already specified and sitting in the backlog: **DLR-95, the quick-kill
payout** — a coin per unplayed card, doubled on a first-hand kill, worth ten coins on its own worked
example.

The two mechanics compound, and that is the argument for this ordering:

> discards let the player dodge the forced hits that break streaks → longer streaks cash bigger →
> bigger cash-outs kill faster → faster kills pay more under DLR-95 → coins make the shop worth
> reaching.

Today that chain is broken at the **first** link, and every fight pays the same coin regardless of
how it was played. Fixing the first link is what makes the last one pay. So: **the discard, then
DLR-95, then re-evaluate the rest of Version 4** — DLR-94 in particular, whose value changes once
skulls stop arriving unduckably (see below).

### A note on DLR-94, measured

Simulated over 1,500 runs: cashing out voluntarily with **perfect foresight** — applying exactly and
only when a forced hit was about to land — changed the outcome by **nothing**. Mean fight reached
3.33 either way, identical distribution. A forced hit already cashes the full bank, so applying
first merely moves the same damage a moment earlier.

**All of DLR-94's value is in its AC4** — the two-thirds penalty on an unchosen cash-out. The button
is not a bonus, it is an avoided penalty, and that fraction is doing 100% of the work.

There is at least a wrong answer available, which is what the ticket wants: cashing at every
opportunity collapses the player to **1.78** fights against a 3.33 baseline.

**AC1's wording needs settling before it is built.** "Available before playing a card each trick
(not after, not mid-trick)" reads both ways, because when the player follows, the moment before they
play a card **is** mid-trick. Pre-lead means cashing blind; post-lead means seeing the trap and
banking safely first. Those are different games. Note that **D2 above already answers the same
question for the discard** — pre-lead — and the two should almost certainly agree.

---

## 8. What to measure once it is built

The harness at `src/__tests__/sim.test.ts` produces all of these in about two seconds.

1. **Forced-hit rate**, against today's 30.5% of follows. If it does not move, the discard is not
   reaching the problem.
2. **Streak length distribution**, against today's 71% of streaks dying at length 0 or 1. This is
   the number the mechanic exists to move.
3. **Discards spent per fight**, and how many of the three go unused. A budget that is never
   exhausted is too large.
4. **Chain length distribution** — how often two or three are spent in one gap. This is the D3 risk,
   quantified.
5. **Void-in-suit frequency** — how often a discard actually achieves immunity rather than merely
   churning the hand. If it is rare, `MAX_CARDS_PER_DISCARD` is too low.
6. **Mean fight reached**, against today's 3.33 of 25. Expect movement, and expect it to be modest —
   the run's ceiling is set by the health curve, not by the card play.

---

## Status register

| Rule                                       | Marker          | Owner                                   |
| ------------------------------------------ | --------------- | --------------------------------------- |
| Swap, not burn (D1)                        | **[decided]**   | this document                           |
| Between tricks, pre-lead (D2)              | **[decided]**   | this document                           |
| Chaining allowed (D3)                      | **[decided]**   | this document — developer, 2026-08-19   |
| `DISCARDS_PER_FIGHT` = 3 (D4)              | **[provisional]** | developer                             |
| `MAX_CARDS_PER_DISCARD` = 3 (D5)           | **[provisional]** | developer                             |
| Discard to bottom of pile, no pile (D6)    | **[decided]**   | `hybrid-design.md` §5, `abilities.ts`   |
| Blind draw (D7)                            | **[decided]**   | this document                           |
| Quarry gets nothing (D8)                   | **[decided]**   | DLR-81                                  |
| Quarry's skulled-lead rule                 | **[open]**      | deferred, §5                            |
| The Cheat's future                         | **[open]**      | deferred, §6                            |

Nothing here has reached `the-hunt.md` — that document is maintained by `implementation-doc-writer`
from shipped code and is never edited by hand.
