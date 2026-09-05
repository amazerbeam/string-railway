# Forbidden Solitaire — play-through notes (framing, teaching, legibility)

Recorded from a developer play session, 2026-08-12. Five observations, taken while playing rather
than while reading a wiki.

**Scope and ownership.** [`forbidden-solitaire.md`](./forbidden-solitaire.md) owns this game's
*rules* and the ranked reading of what is load-bearing in them; `../design-principles.md` §8 owns
its *transferable design lessons*. Neither covers what this file covers: how the game **frames**
itself, how it **teaches** itself, and where its own information fails to land. Nothing from those
two files is restated here.

This file is deliberately one notch wider than its sibling
[`balatro-play-notes.md`](./balatro-play-notes.md), which is purely the presentation layer. Two of
the five notes here are structural rather than presentational — note 1 removes a constraint the
design thought it had, and note 3 is a complexity-budget finding. They are kept in because
splitting them out would put half a thought in two files.

**What this file is for.** Part 1 is the session, as observed. Part 2 maps each note onto
[`hybrid-design.md`](./hybrid-design.md) — The Hunt, in its current duel direction — and says for
each one whether it is already taken, a live gap, structurally unavailable, or already argued and
closed. Part 3 ranks the live transfers by how often a player would hit them, per
`.claude/skills/game-ux/SKILL.md`.

**Nothing here is a decision.** Several notes land on pacing, copy, and how many teaching hands a
player gets, all of which `CLAUDE.md` reserves for the developer. Where a note implies a number or
a phrasing, it is named as an open question, not answered.

---

## Part 1 — the session, as observed

### Framing

1. **The game frames the play against a CPU health bar** — "something I didn't think I could do."
   The solitaire is not graded against a target; it is aimed at an opponent that visibly depletes.

### Teaching

2. **The game gave a hint when I played badly.** Two separate mechanisms arrived together: it
   taught the **redo** after a card was missed that could have been played, and then **the cards
   shook** to show a move that was available. A useful way to teach the player.
3. **The complexity of The Hunt will need several teaching hands.** The proposed ladder, as stated
   in the session: a static hand just to teach the rules; then high/low with the cards' abilities;
   then the scoring system; then the Lose path.
4. **The game counts a combo for playing well.**

### The one complaint

5. **The damage is built as potential damage, like The Hunt — and it is not clear that is
   happening.** "I can't tell that I'm going to take damage." The mechanism is there; the readout
   does not land.

---

## Part 2 — what transfers to The Hunt

The Hunt's current direction, for reference: a duel in which both sides hold **1,350 health**, both
read the player's single Win/Lose declaration, and each side's `card value × multiplier` for the
Hunt is **damage** dealt to the other. Damage accumulates visibly as pending totals and lands once,
at the thirteenth trick (`hybrid-design.md` — the direction, §5, §6). Shipped today: the deal,
legal-move generation, the abilities, trick resolution, the declaration (DLR-63), and a CPU that
only ever plays legal moves — see
[`../../implementation/war-council-ui/`](../../implementation/war-council-ui/) and
[`../../implementation/hunt/`](../../implementation/hunt/).

| # | Note | Where it lands in The Hunt | Status |
|---|---|---|---|
| 1 | Play framed against a CPU health bar | **Already taken, and taken further** — `ideas.md` → _Health replaces the Demand_ and _The Quarry deals damage too_, both promoted 2026-08-11 into the current direction. The Hunt gives health to **both** sides | Confirms a decision already made — but the coupling underneath differs, see §2.1 |
| 2 | Redo taught after a miss; cards shake to show a legal move | Legal-move generation already ships, so the **data for a legality hint exists today**. Redo does not transfer in this form — a trick-taker cannot safely rewind past an opponent's response | Split verdict — see §2.2 |
| 3 | Several teaching hands, staged: rules → abilities → scoring → the Lose path | **No teaching layer exists at any level.** The Hunt has ~12 teachable items against Forbidden Solitaire's three, and that game still shipped a hint system | Largest gap in this session, and it gates §11's kill criterion — see §3.3 |
| 4 | A combo counted for playing well | **Already argued and closed** — `ideas.md` → _The combo bonus_, rejected 2026-08-11 because pending damage does the job for free; the pattern reading is parked separately | Closed, and this session supplies a second, sharper reason — see §2.3 |
| 5 | Pending damage does not read | The Hunt has bet on exactly this: pending totals on both bars, every trick (§6, §11). §6 already names the risk in its own words — "whether that reads as tension or as noise is a feel question" | Strongest transfer, because it is a shipped game failing at the thing this design is betting on — see §3.1 |

### 2.1 — Note 1: the constraint was real, but The Hunt's health bar is not Forbidden Solitaire's

The note's content is that a self-imposed constraint turned out not to be one, and that is worth
recording as design history: the health bar arrived here on 2026-08-11 through `ideas.md` and now
carries the whole direction.

What the note should not be read as saying is that The Hunt has adopted Forbidden Solitaire's
health bar. It has adopted the *framing* and not the *coupling*. In Forbidden Solitaire the bar
works because clearing a card **is** the damage — one card, one point, no exchange rate, no
intermediate currency (`forbidden-solitaire.md` §10.1). The Hunt converts: `card value × multiplier`,
with two mirrored multiplier tables between the play and the bar.

That is not a toll booth — the trick-taking is what produces card value, so there is no minigame
being paid to reach the real game — but it is a genuine difference with a cost on each side:

- **Forbidden Solitaire has exactly one difficulty knob and it is shared.** §10.1 states the
  caveat: if chains run long, damage inflates, enemy health rises, required chain length rises. One
  dial. A virtue in a 2–3 hour game, a constraint in a longer one.
- **The Hunt has at least three** — health, the multiplier tables, and card value — and §9 marks
  the multiplier column open. More tuning surface is the price of a game meant to run longer than
  three hours, and it is the right trade for a roguelike-repeatable shape (§7). It is still a price,
  and this note is the moment to write it down rather than to enjoy the resemblance.

### 2.2 — Note 2: the hint transfers, the redo does not, and the good hint is blocked on the CPU

Three things are tangled in one note and they have three different answers.

**The shake — showing that a legal move exists — is close to free.** §11's inventory confirms
legal-move generation already ships, including the Monarch's single-trick follow constraint. The
set of playable cards is computed every trick already; nothing renders it as an affordance. This is
the cheapest item in this file and it reuses a component that exists, which is the kind of fix worth
preferring.

**The redo does not transfer, and the reason is structural rather than a matter of taste.**
Forbidden Solitaire's tableau is a solitaire: no hidden opponent responds to a move, so rewinding
one leaks nothing. In The Hunt, when the player leads, the Quarry follows. Undo after seeing that
response would hand the player free information about the Quarry's hand and its policy, repeatedly,
for nothing. The only safe window is **after selection and before commitment** — which is a confirm
step, not an undo. Whether one extra interaction per trick, thirteen times a Hunt, is worth buying
back the misclick is an interaction-cost question and the developer's; `game-ux` is the lens, not
the decider.

**Hinting *which* legal move is good is not cheap, and it is the same problem as the slice's
largest engineering item.** A quality hint has to know which band the player is steering toward
under their declaration — which means it has to encode a band-position policy. That is precisely
the **band-position CPU** §11 names as the slice's largest cost and says the slice does not work
without. One component answers both: the thing that lets the Quarry play toward a band is the thing
that lets a hint say "this play moves you away from the ×5 you declared for." Building it once buys
the opponent and the teacher together, and that is worth knowing before either is costed alone.

### 2.3 — Note 4: closed, and this session gives the rejection a second leg

`ideas.md` rejected the combo bonus on 2026-08-11 and reasoned it out properly — it fixed no
documented problem, added no decision, and pending damage delivers the felt escalation for free.
That reasoning stands and is not re-litigated here.

What this session adds is a reason the entry does not have, and it is stronger than the ones it
does. **In Forbidden Solitaire the combo counter is not a bonus — it is a display of a quantity
that already is the score**, because chain length and damage are the same number (§10.1). The
counter is honest: it reports the thing the rules use.

In The Hunt, consecutive trick wins are **structurally meaningless**. Only the final count `k`
feeds the multiplier; capture order never enters the equation anywhere. A combo counter would
therefore display a quantity the rules do not consume — and under a **Lose** declaration it would
be actively backwards, cheering a streak that is dragging the player toward the ×0.5 tail. A
readout that teaches a false model of the scoring is worse than no readout, which is a different
and firmer objection than "it adds no decision."

The parked pattern reading of "combo" — the two cards in a trick forming a pattern — is untouched
by this. That version would be consumed by the rules, because it would be a rule.

---

## Part 3 — the live transfers, ranked by how often a player hits them

Per `game-ux`'s ranking rule: cost compounds with frequency. One entry below deliberately breaks
that ordering, and says so.

### 3.1 Pending damage that actually reads — four figures move on every one of 13 tricks

Note 5, and the most valuable observation in the session, because it is a **shipped game failing at
the exact thing this design is betting on**. Forbidden Solitaire built telegraphed, pre-committed
damage — `forbidden-solitaire.md` §10.5 credits the intent loop as the mechanism that converts
enemy behaviour from output randomness into information you can plan around — and a player who
liked the game still could not tell they were about to be hit. The mechanism was correct and the
readout lost it.

The Hunt's version is **strictly busier**. §6 states plainly what moves every trick: both sides'
pending totals and both health bars — four figures — and names the risk itself, "whether that reads
as tension or as noise is a feel question," with a cheap fallback already written down: show only
the **net** pending figure, one bar, one direction.

This note does not raise that question, which the document already asked. It changes the prior on
the answer. §6's fallback was recorded as the cautious option; a second game with fewer moving
figures failing at the same job is evidence that it may be the default rather than the retreat.
The choice remains the developer's and remains a feel call, checked in a browser rather than in a
test.

**This is the second session in a row to produce this complaint.** `balatro-play-notes.md` note 16
is the same shape — a state change the player was actively waiting for happened and did not
register — and `balatro.md` §2.5 documents a third version of it, a consequential rule whose effect
is never shown. Two published games, two independent sessions, one failure mode. That moves it from
a note to a pattern, and it is the single thing this project's screens are most likely to get
wrong.

### 3.2 A legal move shown as a legal move — every trick, 13 times a Hunt

Note 2's shake, applied and narrowed to what is cheap. The Hunt's legality rules are not obvious to
a new player: follow suit, the decree's trump suit, and the Monarch narrowing the follower's legal
play for a single trick (`the-hunt.md` §4). A player who does not yet hold those three rules cannot
distinguish "I may not play that" from "the game did not register my tap."

The data exists in the engine today. What does not exist is any rendering of it. This is the
lowest-cost item in the file.

### 3.3 The teaching ladder — hit once per player, and it gates the slice's own measurement

Note 3, ranked third by frequency and first by stakes. The frequency rule is broken here
deliberately, and the reason is specific rather than a general appeal to how important onboarding
is.

**First, the size of the problem, counted rather than asserted.** Before a player understands one
complete Hunt they must hold: the 13-trick shape; follow-suit; the decree and its trump suit; seven
named ranks with distinct effects — Swan, Fox, Woodcutter, Treasure, Poison, Witch, Monarch
(`the-hunt.md` §5); trick capture; Spoils as the additive term; Standing as a **non-monotonic**
multiplier where three tricks can beat four; the Win/Lose declaration made after the deal; card
value inverting to `12 − r` on Lose; the two mirrored tables; the capture-pile swap on Lose; both
health bars; pending damage; and the Quarry's character rule-break with its telegraph.

Forbidden Solitaire teaches three things — ±1 adjacency, clear-is-damage, and the enemy's intent —
and **still needed a hint system**, which is what note 2 is a record of. That comparison is the
argument, and it does not depend on the exact count being twelve or fourteen.

**Second, the connection that makes this structural rather than polish.** §11's kill criterion for
the whole direction reads: a playtester *who has never read this document* declares, watches both
pending bars, and either visibly plays toward or away from the 6/7 line, or reports the declaration
as a coin flip they were not equipped to make. If the game cannot teach the declaration, that
criterion measures **teaching failure and reports it as design failure** — and §12's one-line
summary makes the declaration the single question the slice exists to answer. A tutorial is
therefore not downstream of the slice; some minimum of one is a precondition for the slice's result
meaning anything.

**Third, what the ladder costs.** The session's staging — a static hand for the rules, then
abilities, then scoring, then the Lose path — needs one engine capability that does not exist: an
**authored deal**, a fixed hand rather than a shuffled one. Forbidden Solitaire has the precedent
(its boss encounters are hand-authored while ordinary levels are procedural,
`forbidden-solitaire.md` §7), and the same capability pays twice here, because a fixed deal is also
how you write a deterministic test for a scoring path. How many hands, and which item goes in
which, is a design and pacing call and is the developer's.

`balatro-play-notes.md` note 10 is the neighbouring finding — Balatro's tutorial shop *forces* one
purchase, and being made to do the thing is what made the screen legible. Same family: the ladder
above says what to teach in what order; note 10 says the first instance of each should probably be
chosen for the player rather than offered.

---

## What does not transfer, and why — stated plainly

- **Redo, in Forbidden Solitaire's form.** It is safe there because nothing responds to a move.
  Here it would leak the Quarry's response (§2.2). The confirm-step version is available; the
  rewind version is not.
- **A combo counter.** Not unbuilt — wrong. It would report a quantity the equation does not
  consume, and would read backwards under a Lose declaration (§2.3).
- **Clear-is-damage identity coupling.** Forbidden Solitaire's single best and cheapest idea
  (§10.1) is not available to The Hunt, because The Hunt's damage is `card value × multiplier` and
  the multiplier is the design. The cost of not having it is the extra tuning surface named in §2.1
  — worth recording so that "why don't we just do what Forbidden Solitaire does" has a written
  answer.

---

## Open questions this session raises, all the developer's

None of these is answered here.

- Whether pending damage shows four figures or §6's single net figure — a feel call this session
  supplies evidence about but does not settle (§3.1).
- Whether the selection→commit gap becomes a confirm step, at the cost of one extra interaction per
  trick, thirteen times a Hunt (§2.2).
- Whether a hint exists at all; and if it does, whether it hints **legality** only (cheap, available
  now) or **quality** (blocked on the band-position CPU) (§2.2).
- How many teaching hands there are and what each one teaches — the session proposed a four-rung
  ladder; the staging, the copy and the pacing are the developer's (§3.3).
- Whether the authored deal is a tutorial-only feature or a general seeded-deal capability the test
  suite also uses (§3.3).

---

## Sources

Developer play session of Forbidden Solitaire, recorded 2026-08-12 — the five notes in Part 1 are
that session's own record and are not sourced from documentation.

Cross-references: [`forbidden-solitaire.md`](./forbidden-solitaire.md) (§7, §10.1, §10.5 cited
above) · [`balatro-play-notes.md`](./balatro-play-notes.md) (notes 10 and 16) ·
[`balatro.md`](./balatro.md) (§2.5) · [`hybrid-design.md`](./hybrid-design.md) (the direction, §5,
§6, §7, §9, §11, §12) · [`ideas.md`](./ideas.md) (_Health replaces the Demand_, _The Quarry deals
damage too_, _The combo bonus_, _The pattern reading of "combo"_) ·
[`../../game_rules/the-hunt.md`](../../game_rules/the-hunt.md) (§4, §5) ·
[`../design-principles.md`](../design-principles.md) · `.claude/skills/game-ux/SKILL.md` ·
[`../../implementation/`](../../implementation/) for what ships today.
