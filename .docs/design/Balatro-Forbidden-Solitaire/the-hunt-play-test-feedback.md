# The Hunt — play-test feedback (session 1, 2026-08-10)

The developer's first play of The Hunt itself, as opposed to a reference game. Recorded
**retrospectively on 2026-08-12** from the session transcript, because it was never written down at
the time.

**Why that matters more than a missing file.** Three of the four things the developer *proposed* that
evening became tickets within the hour and are now in the design and on disk. The two things they
*observed* went nowhere. That is exactly the failure Rosewater's lesson #19 warns about — his rule is
that players recognise problems accurately and solve them badly, so playtest feedback should be read
as **diagnosis, never prescription** (`../design-principles.md` §2). The record kept the
prescriptions and lost the diagnosis. This file exists to put the diagnosis back.

**Scope and ownership.** This file owns *observed feedback on The Hunt*, and only that. It is not the
ruleset ([`../../game_rules/the-hunt.md`](../../game_rules/the-hunt.md)), not the reasoning
([`hybrid-design.md`](./hybrid-design.md)), not what the code does
([`../../implementation/`](../../implementation/)), and not notes on somebody else's game — those are
[`balatro-play-notes.md`](./balatro-play-notes.md) and
[`forbidden-solitaire-play-notes.md`](./forbidden-solitaire-play-notes.md), both of which record
sessions playing *published* games. Nothing from any of those files is restated here.

**Nothing here is a decision.** The session produced proposals about multiplier brackets, how often a
path may be chosen, and card presentation — all tuning and visual calls that `CLAUDE.md` reserves for
the developer. Where this file names a number, it is quoting the session, not ratifying it.

**Provenance.** Session `1d90e186-348d-4ffe-95c6-9b8d5bebef5a`, 2026-08-10, 20:41–21:13 BST, eight
messages. The app was launched in the preceding session (`04a24df9`, 19:25 — *"get it runningg for
me"*). Quotations are verbatim, including typos.

---

## Part 1 — the session, as observed

### What was actually on screen

The play happened at **20:41–21:13**, between commit `5427314` (16:03) and `3a1ed97` "First game"
(22:05) — so the working tree of that afternoon, one ticket after DLR-53 put the Hunt screen up. What
existed: the 33-card deal, follow-suit legality, the seven named ranks and their abilities, trick
resolution, a Quarry with the Monarch rule-break and its telegraph, Spoils, the Standing multiplier,
and a Demand target to clear.

What did **not** exist, and bears directly on both observations below: no declaration (it was
invented in this session), no health, no damage, no pending anything. One Hunt, played to a target.

### The diagnosis — two observations, and a benchmark

> **1.** "I feel like it's hard to get a handle on what I should I shouldn't be trying to do, it's
> not clear what a good decision is"

> **2.** "and there's no good feedback each time I lay a card, like in balator"

> **3.** "well it should play similar to the first hand of a fresh anti in balatore, and I don't
> think it does."

Observation 3 is the useful one to keep as a **benchmark** rather than as a complaint: the stated
target is the felt quality of the opening hand of a fresh ante in Balatro, and the stated verdict is
that The Hunt did not reach it. It is the only comparative measurement the session produced, and it
has never been re-run.

### The prescriptions — four, offered in the same session

4. **Declare a path after seeing the hand.** "the player should get a look at their hand and declare
   which path they want to go down, taking trumps or losing trumps. We assign values to the cards.
   1-11, chose win and the values stay, chose lose and the invert." On Lose, the tricks you shed are
   effectively won — you take those cards and their values. "The multiplier is also set by the chose
   of win/ lose, lose the higer muliter is 0-3, then we reduce for each bracket until getting to a
   low multipleir."
5. **Keep the greedy Lose path, but ration it.** "maybe we could make teh losing path a stronger
   path, but we limit the amount of times the playre can chose it, like how discard is limited."
   Offered against advice — "I get what you are saying and it's right, however I don't want to dicard
   the greedy path just yet, maybe we can get some good design out of it?"
6. **Hand presentation.** "To order the cards by suit then number and. move the icon to the bottom
   left and put a color border around the cards to match the suit."
7. **A scope observation, worth keeping.** "Right now we only can play 1 hand, so the choice would be
   binary and reset right? The Demand doesn't go up?" — correctly noticing that with a single Hunt,
   the declaration has no escalation behind it.

### What the session got right, mechanically

Two things, credited because they are method rather than luck.

- **The diagnosis was accurate and it was separable.** Two distinct failures — an unclear objective
  and an absent per-action readout — were named separately rather than fused into "it isn't fun."
  Both survive as live problems eleven days later, which is the test of a real observation.
- **It asked about iteration order before changing anything**: "would you recommand trying them all
  at once or 1 by 1?" Schell's *rule of the loop* — the more times you test and revise, the better
  the game gets (`../design-principles.md` §1) — is the whole justification for that question, and
  four simultaneous changes would have made the next play unattributable.

---

## Part 2 — where each item landed

| # | From the session | Status today | Where |
|---|---|---|---|
| 4 | Declare Win/Lose after the deal; values 1–11 inverting on Lose; declaration selects the multiplier | **Built, and now the design's spine.** Shipped as the declare gate with `12 − r` inversion and two mirrored Standing tables selected by the declaration | DLR-63 · `hybrid-design.md` §1 · `the-hunt.md` (settled) · `../../implementation/war-council/declaration-and-lose-path.md` |
| 5 | Ration the Lose path "like how discard is limited" | **Built, then retired.** Became the three-credit mechanic (`LOSE_CREDITS_PER_HUNT`, `claimLostTrick`, four guards); deleted outright by DLR-67, whose brief records that it was "replaced, not tuned" | DLR-63 → DLR-67 |
| 6 | Suit-then-rank hand order, icon to bottom-left, suit-coloured border | **Built** | DLR-63 · `../../implementation/war-council-ui/declare-gate-and-hand-order.md` |
| 7 | One Hunt means the declaration has no escalation behind it | **Still true, now by design.** The duel direction removed the Demand escalation entirely; the slice is deliberately one encounter | `hybrid-design.md` §5, §9 · DLR-67 |
| 1 | "it's not clear what a good decision is" | **Never recorded anywhere until this file.** See §3.2 — and note the twist: the fix for it is now itself under suspicion | — |
| 2 | "there's no good feedback each time I lay a card" | **Never recorded anywhere until this file.** See §3.1 | — |
| 3 | The Balatro fresh-ante benchmark | **Never recorded, never re-run** | See §3.3 |

The pattern in that table is worth stating plainly: **every prescription was actioned, no diagnosis
was.** Prescriptions convert into tickets and tickets leave a trail; an observation about feel has
nowhere to go unless somebody writes it down.

---

## Part 3 — the diagnosis, read against the design as it stands

Ranked by how much of the design currently rests on the answer.

### 3.1 "No good feedback each time I lay a card" — the origin sighting of this project's most-repeated failure

This is the **first** of three independent records of the same complaint, and the only one about The
Hunt itself:

| Date | Game | The complaint |
|---|---|---|
| **2026-08-10** | **The Hunt** | **"there's no good feedback each time I lay a card"** |
| 2026-08-12 | Forbidden Solitaire | "the damage is bult as potential damge like my game, but it's actually not clear that's happening and I can't tell that I'm going to take damage" (`forbidden-solitaire-play-notes.md` note 5) |
| — | Balatro | a state change the player was actively waiting for happened and did not register (`balatro-play-notes.md` note 16; a third variant in `balatro.md` §2.5) |

`forbidden-solitaire-play-notes.md` §3.1 already calls this "the single thing this project's screens
are most likely to get wrong" and reaches that verdict from the two published games. **It did not
know the earliest instance was our own game.** That strengthens the finding rather than repeating it:
the failure mode was observed in The Hunt *before* it was observed in either reference game, so it is
not a lesson borrowed from games we admire — it is a defect we already had.

**Where the design's answer stands.** §6 and §11 bet on pending damage shown on both health bars —
four figures moving on every one of thirteen tricks — with a cheaper fallback written down (show only
the net figure, one bar, one direction). Two honest qualifications:

- Nothing links that bet to this observation. §6 presents pending damage as the mechanism the duel
  direction needs, and names its own risk in feel terms; it does not cite an observed absence of
  per-trick feedback as the problem it solves.
- **No per-trick readout is built.** Damage is computed and settled (`the-hunt.md` Status register),
  but the pending-damage display is explicitly out of scope in DLR-68's plan, alongside the health
  bars themselves. So as of today the 2026-08-10 complaint is unaddressed in the app, not merely
  unrecorded.

### 3.2 "It's not clear what a good decision is" — the fix introduced a decision the design now doubts

The connection this file exists to state, because neither half is visible from the other's document.

The developer could not tell what they were trying to do, so the session invented the declaration —
choose Win or Lose after seeing your hand, and everything downstream inverts. That is a good answer
in Meier's terms: it gives the round a stated objective, and it is Knizia's "design the scoring
first" applied honestly, since the declaration reshapes every subsequent trick rather than adding a
side rule (`../design-principles.md` §2).

Then the design's own arithmetic turned on it. `ideas.md` → *The declaration as a free option*
(2026-08-11, "the session's largest finding") and *Measured: the declaration is a live 50/50 read, and
the Monarch tilts it the wrong way* (2026-08-12) argue that the declaration may be a coin flip the
player is not equipped to make; `hybrid-design.md` §9 Problem 1 and §11's kill criterion are built
around that risk.

**So the two problems are one problem.** The cure for "I don't know what a good decision is" was a
new decision — and the open question about that new decision is, in the same words, whether the
player knows what a good one looks like. Any fix that makes the declaration readable also answers the
2026-08-10 complaint; any fix that only makes it *consequential* does not. That distinction is not
currently drawn anywhere, and it is the one worth holding the §6 mitigations against.

There is a second-order consequence in §3.3 of `forbidden-solitaire-play-notes.md` that lands harder
now: with no teaching layer, §11's kill criterion cannot distinguish "the declaration is a bad
decision" from "the declaration was never explained." The 2026-08-10 session is evidence that a
player *who designed the game* found the objective unclear before the declaration existed — which
says nothing about the declaration, but does say the screen has never yet succeeded at making an
objective legible.

### 3.3 The Balatro fresh-ante benchmark — one cheap comparative measurement, never repeated

"it should play similar to the first hand of a fresh anti in balatore, and I don't think it does."

The value here is that it is comparative and repeatable: play the opening hand of a fresh Balatro
ante, then play one Hunt, and answer the same question. It costs one sitting, it needs no
instrumentation, and it is the only measurement in the project's history that has been run once and
would produce a trend if run twice. It has not been re-run across the declaration, the duel
direction, or DLR-66–68.

Whether the answer is *yes* is a feel judgement and the developer's alone.

---

## Part 4 — what to measure next

Cheapest first. All three are sittings, not instrumentation.

1. **Re-run the fresh-ante comparison** (§3.3) at the end of the current slice. It is the only
   benchmark with a prior result to compare against.
2. **Ask the 2026-08-10 question again, unprompted, after a Hunt**: can you say what you were trying
   to do, and did laying each card tell you anything? Same two questions, so the answers are
   comparable to this session.
3. **Separate the two failures in §3.2 before tuning.** Have a player declare and then say aloud
   *why*. A player who declares confidently and is then surprised by the result has a legibility
   problem in the readout; a player who cannot say why they declared at all has the §3.1 problem, and
   no amount of Quarry pressure will fix it.

**What would prove this file's main reading wrong.** §3.1 claims the per-trick feedback gap is this
project's most-repeated failure. If the pending-damage readout ships and a player who has never read
these documents can, unprompted, say whether the last card helped or hurt them, then the three
sightings were three descriptions of one missing widget rather than a standing tendency in how these
screens get built — and this file should be demoted to a historical record. §3.2's claim is
falsifiable the same way `hybrid-design.md` §11's kill criterion is, and deliberately shares it: if
the declaration reads as a genuine read rather than a coin flip, the connection drawn above cost
nothing to state and can be closed.

---

## Housekeeping — how this file stays honest

Feedback on The Hunt goes **here**, at the time it is given, as a new dated session section. It is
the only file in the project that carries observed reactions to our own game; the reference-game
siblings carry reactions to other people's. When an item here becomes a ticket, add the key to Part 2
rather than deleting the observation — the whole lesson of this document is that the observation
outlives the ticket.
