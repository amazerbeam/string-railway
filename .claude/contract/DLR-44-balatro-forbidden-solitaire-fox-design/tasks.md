# Tasks: Design — Balatro × Forbidden Solitaire treatment of The Fox in the Forest

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-09

**Goal:** Write one design document under `.docs/design/Balatro-Forbidden-Solitaire/` that commits to a
single specific single-player game — Fox in the Forest's 13-trick round as the inner loop of a
Balatro-shaped run with a Forbidden-Solitaire-shaped CPU — naming one equation, one shared object, and a
settled position on the opponent, escalation, catch-up, run length, the ruleset delta, the smallest
testable slice, and its own critique.

**Spec:** `plan.md` in this folder. The document's section map and vocabulary are owned by
`plan.md` Part 2 → Data shapes; do not invent section names outside it.

---

## File map

**Created:**

- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — the design document; the whole deliverable
- `.claude/contract/DLR-44-balatro-forbidden-solitaire-fox-design/pr-description.md` — PR body for the developer to paste

**Modified:** (none)

**Deleted:** (none)

**Read-only references** — cited, never edited:

- `.docs/design/Balatro-Forbidden-Solitaire/balatro.md`
- `.docs/design/Balatro-Forbidden-Solitaire/forbidden-solitaire.md`
- `.docs/game_rules/fox-in-the-forest.md`
- `.docs/design/old-design/design-principles.md`
- `.docs/design/old-design/hybrid-concept.md`, `.docs/design/old-design/skirmish-board-replacement.md`
- `src/warCouncil/` — read only, to size Task 11 honestly. **No file under `src/` is written.**

**Developer decides or observes:**

- **The spine itself** — `Score = Spoils × Standing`, the deck-and-decree as shared object, the
  Quarry-as-deck-character, roguelike run length. Approved at the `plan.md` gate; re-openable only by
  the developer.
- **Standing ×0 for the Greedy band** — zeroes a whole round, harder than the base game punishes. May
  need a small positive multiplier. Stated first-pass in §9, never as chosen.
- **Encounters per run, the Demand curve's base and shape, the Forage budget** — unchosen tuning values.
  §9 states shapes and ranges plus the settling measurement; the executor must not pick a number.
- **Naming** — "the Hunt / the Quarry / Spoils / Standing / the Demand / Forage". A copy judgement.
  Accepting it implies a follow-up `CLAUDE.md` naming-pointer edit that is **out of scope here**.
- **Catch-up position** — the Humble lane is a second strategy, not a comeback mechanic. Whether to
  accept the inherited "run is dead before the player can tell" problem or add a still-winnable signal
  has a visible cost either way.
- **Whether the CPU preserves the base game's read-the-opponent drama** — telegraphed intent + hidden
  hand + printed exception is the design's answer, but it is a feel question only playing settles. This
  is what Task 11's slice exists to test.
- **Slice sizing basis** — Task 11 sizes against the existing `src/warCouncil/` engine. If the developer
  wants it sized as a clean prototype instead, that section changes materially.
- **`CLAUDE.md` staleness** — describes an empty scaffold, points at two non-existent doc paths, names
  the Jira project as `SCRUM` when it is `DLR`. Recommend a separate `/fb-issue`; not fixed here.
- **DLR-18 position** — default is "independent alternative, neither supersedes" (Task 10).

---

## Phase 1 — The spine

The three sections everything else is commentary on. This phase establishes the equation, the shared
object, and the arithmetic that forces the outer loop to edit an input rather than hand over a number.
It is a safe stopping point because sections 1–3 are self-contained: they make no claim that depends on
the run structure, the opponent, or the ruleset delta, all of which arrive later. If the equation is
wrong, this is the cheapest place to discover it — nothing downstream has been written yet.

### Task 1: Create `hybrid-design.md` with its framing and §1 The equation ✓

- Skill: `game-designer`

**Files:**

- Create: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`

- [x] **Step 1: Write the title, the status framing paragraph, and the commitment statement**

The document opens by stating what it is and that it commits — this is the direct guard against AC 1's
named failure mode (a survey). Wrap prose at 100 columns to match `balatro.md` and
`forbidden-solitaire.md` in the same folder.

Required content:

- H1 title naming the game.
- A framing paragraph stating: this is a design, not research; it describes one specific game; where a
  fork was genuine it names the chosen branch and buries the discarded one in one line; the parent
  games' rules are **cited, not restated**, per the single-source-of-truth rule in `CLAUDE.md`.
- A line recording that the CPU opponent is a **given constraint** from DLR-44, not a design choice.
- A "Read alongside" list linking the four reference documents by relative path — note that
  `design-principles.md` lives at `../old-design/design-principles.md`, **not** `../design-principles.md`.

- [x] **Step 2: Write `## 1. The equation`**

Required content:

- The equation stated once, on its own line: `Score = Spoils × Standing`, evaluated at the end of each
  13-trick round.
- **Spoils** — the summed value of the cards you captured in tricks. The additive term.
- **Standing** — a multiplier read off the band your final trick count lands in, taken **unchanged**
  from the base game's printed end-of-round table (`fox-in-the-forest.md` → End-of-round scoring):
  Humble (0–3) ×6, Defeated (4/5/6) ×1/×2/×3, Victorious (7–9) ×6, Greedy (10–13) ×0.
- The argument for why this equation and not another: Fox in the Forest's signature property — winning
  too many tricks is as bad as winning too few — becomes the *multiplicative* term, so overreach is
  punished by the arithmetic rather than by a bolted-on rule. Name Knizia's method in one plain sentence
  (the German designer whose approach is to find the single scoring principle that reshapes every
  decision, and to prefer a system that punishes overreach through its own arithmetic) and cite
  `design-principles.md` §2.
- The two growth classes named explicitly, in the sense of `balatro.md` §1.1 / §2.1: Spoils adds,
  Standing multiplies.
- A component table showing that every device the document later proposes is an intervention on one of
  the two terms. Columns: `Device | Intervenes on | How`. At minimum it must cover: capturing a trick,
  a Treasure (7), a Poison (8), a deck edit that raises a card's value, a deck edit that moves an
  ability, a Quarry rule-break, and the Demand. Any row that intervenes on neither term is a design
  defect, not a table entry — say so in one line beneath the table.

- [x] **Step 3: Confirm the file exists and the two sections are present**

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md; Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 1\. The equation"`
Expected: the file is listed, and exactly one match for the section heading.
Confirmed: file listed, exactly one match at line 27.

### Task 2: Write §2 The shared object ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 2. The shared object`

- [x] **Step 1: Write `## 2. The shared object`**

This is AC 3. The section must answer the conversion question head-on, not gesture at it.

Required content:

- The shared object named in one sentence: **the deck-and-decree**. The outer loop edits the 33-card
  deck the hand is dealt from and the decree card that sets trump; the inner loop plays and captures
  those same physical cards.
- The demonstration that no exchange rate exists anywhere in the design: both terms of the equation are
  read off the same object — the cards you captured *are* Spoils, and the count of the tricks they came
  in *is* Standing. There is no intermediate currency to balance.
- The evidence that the object was not invented for the hybrid: `fox-in-the-forest.md` already treats
  the deck as shared state — both hands are dealt from it, the decree sits on top of it, the Woodcutter
  (5) draws from it and discards to its bottom, and the Fox (3) exchanges the decree with a card from
  hand. Cite the rule, do not restate it.
- The counterexample, stated plainly because it is the closest one to home: *Fox in the Forest Duet*
  converts trick outcomes into movement on a separate track and the spatial layer reviewed at 2.5/5 for
  generating no tension (`design-principles.md` §7, §8). Cite `forbidden-solitaire.md` §4 for the
  general form of the argument — that any exchange rate turns the card game into a toll booth.
- One line naming the discarded branch: the alternative was an explicit conversion ("each trick won
  becomes N resource"), rejected because it is the toll-booth signature both parents avoid.

- [x] **Step 2: Confirm the section is present and cites both sources**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 2\. The shared object|forbidden-solitaire\.md|Duet"`
Expected: at least three matches — the heading, the `forbidden-solitaire.md` citation, and the Duet
counterexample.
Confirmed: 5 matches (heading, one `forbidden-solitaire.md` mention in the Read-alongside list, plus
two more citations in §2 body, and the Duet counterexample).

### Task 3: Write §3 What the run rewrites ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 3. What the run rewrites`

- [x] **Step 1: Write `## 3. What the run rewrites`, with the ceiling arithmetic shown**

This is AC 4, and the arithmetic is load-bearing — show the working, do not assert the result. The
`game-designer` skill forbids a balance claim without arithmetic.

Required content, in this order:

- The ceiling, derived on the page: a round is 13 tricks; each trick contains 2 cards; the winner takes
  both; so at most **26 cards** can be captured. With plain cards at base value and the best available
  multiplier of ×6, the round score cannot exceed **`26 × 6 = 156`** regardless of how well it is
  played.
- The consequence: a Demand that rises past 156 **cannot** be met by winning more tricks. It can only be
  met by making cards worth more — which only editing the deck does. The outer loop's job is therefore
  structurally forced to be "change what is in the deck and what the cards do", not "add a bonus".
- **Forage** named as the outer loop's only verb, with the four things it may edit: a card's value, a
  card's ability, a card's suit, and the decree. No shop of flat bonuses.
- Cook's loop test named in one plain sentence (the designer's rule that each outer loop must change the
  conditions of the inner one, or it is a wrapper rather than a loop) and shown to pass by construction.
  Cite `balatro.md` §2.6 and `design-principles.md` §4.
- The connection to Balatro's growth-class lesson (`balatro.md` §2.1): a build that only wins more
  tricks is arithmetically dead at a predictable point and the game never says so. Note explicitly that
  this costs **zero rules added** — it falls out of the 13-trick round and the printed table.
- One line naming the discarded branch: a Balatro-style shop selling flat score bonuses, rejected
  because a constant added to a capped additive term loses to an escalating requirement by the same
  arithmetic.

- [x] **Step 2: Confirm the ceiling arithmetic is written out, not asserted**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "26|156"`
Expected: at least two matches showing both the card count and the derived ceiling appear in the text.
Confirmed: 3 matches — the 26-card cap, the `26 cards × 6 = 156` line, and the 156 Demand-ceiling
reference.

---

## Phase 2 — The run

The four decisions that turn a scoring equation into a game with a shape: who the opponent is, how
difficulty rises, what a losing player has to hope for, and how long the whole thing lasts. Each of
these is a named acceptance criterion with a forced choice, so each task must end with a branch chosen
and the discarded one buried in one line. The phase boundary is safe because sections 1–3 stand without
it and sections 8–12 have not been written, so a rejected run structure invalidates four sections rather
than the whole document.

### Task 4: Write §4 The Quarry ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 4. The Quarry`

- [x] **Step 1: Write `## 4. The Quarry`**

This is AC 5. It must settle four things: which parent's model, the fiction, whether the CPU is bound by
the player's rules, and exactly what of its state is visible.

Required content:

- **The model chosen: per-encounter character**, not a neutral skilled trick-taker. The discarded branch
  in one line: a neutral strong player can only escalate by playing better, which is a difficulty
  slider rather than a design.
- **The fiction: the characters are the deck's own odd-rank cards** — the Monarch (11), the Witch (9),
  the Woodcutter (5), the Fox (3), the Swan (1). Each encounter turns that character's printed ability
  on for the entire round rather than for a single card. State why this is the cheap move: the cast is
  already in the deck, so the escalation vocabulary costs nothing to teach. Name Rosewater's resonance
  lesson in one plain sentence (a rule that matches what the theme already implies needs less
  explaining) and cite `design-principles.md` §2.
- **Bound by the player's rules, with one printed exception per character.** Name Wehrle's asymmetry
  rule in one plain sentence (balance a strong position with a readable liability rather than by shaving
  numbers) and cite `design-principles.md` §5. Give at least two worked examples of a character's
  round-long rule-break paired with its liability — e.g. the Fox moving the decree under you, the
  Monarch constraining what you may follow with.
- **A visibility table.** Columns: `What | Visible to the player | Why`. Rows must cover at minimum: the
  Quarry's hand (hidden), its next-trick intent (telegraphed), its trick count (public, exactly as the
  base game already makes it), its printed exception (on screen always), and the current Demand and your
  running Spoils (open). For the telegraphed intent, cite `forbidden-solitaire.md` §5 / §10.5 and state
  the mechanism in one sentence: telegraphing converts the opponent from a die roll resolved after you
  commit into information you plan around.
- **The honest caveat.** The hidden hand is the only thing preserving the base game's read-the-opponent
  drama, and whether it survives against a CPU is the ticket's headline risk. State that it cannot be
  settled on paper and point forward to §11.

- [x] **Step 2: Confirm the visibility table and the chosen branch are both present**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 4\. The Quarry|telegraph"`
Expected: at least two matches — the heading and the telegraphed-intent treatment.
Confirmed: 2 matches — heading at line 175, and the telegraphed-intent row of the visibility table.

### Task 5: Write §5 Escalation ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 5. Escalation`

- [x] **Step 1: Write `## 5. Escalation`**

This is AC 6.

Required content:

- **Both dials, kept independent**: the Demand rises per encounter, *and* the Quarry's rule-break changes
  per encounter. Cite `balatro.md` §2.7 for why they must stay independent — The Wall (4× target, no
  rule broken) and The Needle (1× target, one hand only) demonstrate that "how hard is this round" and
  "what rule is broken" are separate knobs, and most designs wrongly conflate them.
- The structural argument for attacking an input rather than the score, with the count quoted:
  `balatro.md` §2.3 enumerates 23 boss blinds, of which **only 3 touch the score** and 20 attack an input
  — the cards usable, the information held, the resources spent, or the hand types nameable. That is why
  a boss reads as a test of your specific build rather than a difficulty spike. State that this design
  follows the 20, not the 3.
- The mapping from that finding onto Fox in the Forest's inputs: the follow-suit obligation, the decree
  and trump, hand size, the abilities on the odd ranks, and which cards are in the deck at all. Give a
  worked example of a rule-break for at least three of those inputs.
- One line on the Demand's *shape* only — that it rises per encounter and must eventually cross the 156
  plain-card ceiling from §3, which is the moment the design's lesson lands. **The curve's base and rate
  are not chosen here**; they are routed to §9.

- [x] **Step 2: Confirm the section states both dials and cites the enumeration**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 5\. Escalation|23|20 of"`
Expected: the heading plus at least one match quoting the boss-blind enumeration.
Confirmed: 3 matches — heading, the "23 Boss Blinds" enumeration line, and the "20 of the 23" line.

### Task 6: Write §6 Catch-up ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 6. Catch-up`

- [x] **Step 1: Write `## 6. Catch-up`**

This is AC 7, and `plan.md` names it the design's weakest claim. Write it as such — do not oversell it.

Required content:

- **The position chosen: cheap restart plus the Humble lane as a bounded second route.** The two
  discarded branches in one line each: a gentler requirement curve (rejected — it removes the growth-class
  lesson from §3, which is the design's main source of depth) and sub-run checkpointing (rejected — it
  is the linear-narrative answer and §7 does not choose that structure).
- **Why the Humble lane is real, with arithmetic.** The base game's 0–3 band already pays ×6. Worked
  comparison: a Victorious round at 8 tricks captures ~16 cards, so at flat card value `16 × 6 = 96`; a
  Humble round at 3 tricks captures 6 cards, so `6 × 6 = 36`. Humble therefore only competes when the
  build makes *few cards very valuable* — which makes it a distinct build lane with its own growth
  class, not a consolation prize.
- **The honest consequence, stated plainly.** This is a second *strategy*, not a comeback *mechanic*: it
  does nothing for a player whose deck is too weak for either lane. The design therefore inherits
  `balatro.md` §2.4's problem verbatim — a run can be arithmetically dead several encounters before the
  player can tell — and its only mitigation is the short run from §7. Name Sirlin's slippery slope in one
  plain sentence (positive feedback, where being ahead makes you more ahead, which decides the game early
  and makes the rest a formality) and cite `design-principles.md` §3.
- **The open option, flagged as the developer's:** whether to add a still-winnable signal. State the cost
  on both sides — showing it removes the reveal-drama `balatro.md` §2.5 argues for; hiding it taxes the
  most engaged players, who will compute it anyway. Do not choose.

- [x] **Step 2: Confirm both discarded branches and the worked comparison are present**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 6\. Catch-up|96|36"`
Expected: the heading plus both numbers from the Victorious-vs-Humble comparison.
Confirmed: 3 matches — heading, the `16 × 6 = 96` line, and the `6 × 6 = 36` line.

### Task 7: Write §7 Run length and depth budget ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 7. Run length and depth budget`

- [x] **Step 1: Write `## 7. Run length and depth budget`**

This is AC 8. Both `balatro.md` §2.8 and `forbidden-solitaire.md` §10 argue this one choice decides which
critique the game receives — say which critique this design is accepting.

Required content:

- **The choice: roguelike-repeatable and short.** The discarded branch in one line: a linear-narrative
  arc, rejected because `balatro.md` §2.4 shows Balatro's slippery slope is only tolerable when a run is
  short and restarting is free, and a narrative spine inherits the slope while discarding the answer.
- The dependency made explicit: §6's catch-up position *only works* because of this choice. If the run
  structure changes, §6 must be rewritten. Say so.
- The depth-budget argument. Name Koster's framing in one plain sentence (games are pattern-learning
  machines, fun is the sensation of grokking a pattern, and the game is over once the pattern is
  mastered) and cite `design-principles.md` §1. State what the player is learning on encounter five that
  they were not on encounter one — the answer must be the growth class from §3, not a card.
- The critique this design is accepting, quoted from `forbidden-solitaire.md` §9: reviews split on
  exactly this decision between *"has the good sense to get out while the going is good"* and *"runs out
  of steam quickly"*, and both describe the same fact. Name which of those two this design is choosing to
  risk.
- One line on run *shape* only — a run is a fixed sequence of Quarry encounters ending in a final one.
  **The encounter count and target session length are not chosen here**; they are routed to §9.

- [x] **Step 2: Confirm the section names the choice, the discarded branch, and the accepted critique**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 7\. Run length|roguelike|steam"`
Expected: the heading plus matches for the chosen structure and the quoted review critique.
Confirmed: 4 matches — heading, "roguelike-repeatable" choice line, and two "steam" hits in the
quoted Shacknews/other-reviews critique.

---

## Phase 3 — The ruleset, the numbers, and the position

The delta against the base game, the numbers, and where this direction stands relative to DLR-18. The
ruleset audit is deliberately here rather than earlier: whether the trick curve survives is a question
about the run, and answering it before Phase 2 would have meant guessing. The boundary is safe because
sections 8–10 are backward-looking — they account for decisions already made in sections 1–7 and
introduce no new mechanism.

### Task 8: Write §8 The ruleset — kept, modified, dropped ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 8. The ruleset: kept, modified, dropped`

- [x] **Step 1: Write the audit table**

This is AC 9, and the ticket is explicit that a bare list fails it — every line needs a reason.

Table columns: `Rule | Kept / Modified / Dropped | Reason`. Rows required, at minimum:

- **Decree and trump** — kept, and promoted to the run's shared object per §2.
- **Follow-suit obligation** — kept unchanged. Reason: it is the entire tension of a trick-taker; without
  it card choice is free and the layer collapses. It is also the input the Quarry attacks in §5.
- **Odd-rank abilities (1, 3, 5, 7, 9, 11)** — kept as the substrate, and made editable by Forage.
  Reason: abilities already sit on cards, so "move or add an ability" is a deck edit needing no new
  vocabulary.
- **Trick-count scoring curve** — modified: from a points lookup to the Standing multiplier, bands
  preserved. See Step 2.
- **13-card hands / 13 tricks / 33-card base deck** — kept as the round's shape; the deck grows as Forage
  edits it.
- **The 21-point match** — dropped, replaced by the run. Reason: match-to-21 is the ending condition of a
  symmetric two-player contest, which no longer exists once the opponent does not score.
- **Goal cards (16)** — dropped. Reason: a second scoring channel competing with the equation, which §1
  forbids.
- **Poison 8s (3)** — kept. Reason: a negative-value card is an intervention on Spoils, and it doubles as
  the Quarry's "curse a card" device from `forbidden-solitaire.md` §5.
- **Special cards (9)** — the *unsuited* concept kept as Forage's vocabulary; the specific nine cards not
  carried wholesale. Reason: unsuited is the cheapest existing grammar for a deck edit.

- [x] **Step 2: Write the trick-curve asymmetry argument as its own sub-section**

The ticket singles this out, so it gets a `### The trick curve without a scoring opponent` heading under
§8 (a `###`, not a `##` — the section map in `plan.md` owns the `##` level).

Required content:

- **The enumeration first, not the reasoning.** With 13 tricks there are 14 possible splits. Walk them:
  at `k` tricks for the player the opponent has `13 − k`. `k` = 0–3 → player 6, opponent (13–10) Greedy
  0. `k` = 4 → 1 vs 6. `k` = 5 → 2 vs 6. `k` = 6 → 3 vs 6. `k` = 7 → 6 vs 3. `k` = 8 → 6 vs 2. `k` = 9 →
  6 vs 1. `k` = 10–13 → 0 vs 6. **Exactly one side scores 6 in every split** — the curve is a tug over a
  single threshold, and that is a property of the *symmetric* contest.
- What dies: with a CPU that does not score, the "exactly one side scores 6" structure is gone entirely.
  There is no opponent band to push into.
- What replaces it: the curve survives as a **self-limit on the player alone** — Standing punishes your
  own overreach whether or not anyone is competing for the other band. State plainly that this is a
  weaker version of the original property, and that the design is accepting that trade because §3's
  ceiling supplies the pressure the opponent's band used to.
- The residual risk, named: with no opponent competing for the Victorious band, the player may simply
  aim for 7–9 every round, which would make Standing a dominant strategy rather than a decision. Name
  Meier's test in one plain sentence (a decision is uninteresting if players almost always pick the same
  option) and state what stops it — the Quarry's rule-breaks pushing your achievable trick count away
  from the band you want. Flag this as the design's most likely balance failure and route the
  measurement to §9.

- [x] **Step 3: Confirm the audit covers every rule the ticket named**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "Follow-suit|decree|Goal cards|Poison|21-point"`
Expected: at least five matches, one per named rule family.
Confirmed: 21 matches across the framing, §1—§7, and the §8 audit table itself.

### Task 9: Write §9 First-pass values ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 9. First-pass values`

- [x] **Step 1: Write the values block with every number marked undecided**

The ticket puts rough tuning values in scope; the `game-designer` skill forbids presenting a tuning value
as a conclusion. Both hold only if every number here is explicitly illustrative and carries the cheapest
measurement that would settle it.

Open the section with one line stating that **no number in this document is a chosen value** and that all
of them are the developer's.

Table columns: `Value | First-pass | Status | What would settle it`. Rows required:

- **Standing multipliers** — ×6 / ×1 / ×2 / ×3 / ×6 / ×0. Status: *taken verbatim from the base game's
  printed table, not invented*. Note the ×0 is the most likely to be wrong: it zeroes a whole round,
  which is harsher than the base game, where 0 points still leaves your running total intact.
- **Plain-card Spoils ceiling — 156.** Status: *derived arithmetic, not tuning* (`26 × 6`). It moves only
  if the round length or the top multiplier moves.
- **Encounters per run** — a range only. Status: **undecided**.
- **Demand base and growth rate** — shape only (rising, and crossing 156 at some point). Status:
  **undecided**. The settling measurement is `balatro.md` Part 3's first suggestion, adapted: plot the
  Demand curve against the best achievable score for a build that only raises Spoils, and check whether
  it dies at a *predictable* encounter (the lesson is being taught) or a random one (it is noise).
- **Forage budget per encounter** — how many edits, and whether they are chosen or drafted. Status:
  **undecided**.
- **Card base values** — whether a plain card is worth 1 or its rank. Status: **undecided**. Note this
  changes the 156 ceiling and therefore §3's whole argument, so it is the highest-leverage number in the
  document.

- [x] **Step 2: Confirm no value is stated as chosen**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "undecided|first-pass|revisable"`
Expected: multiple matches inside §9; every unchosen row carries one.
Confirmed: 9 matches inside §9 — the heading, the opening line, the column header, and four
`**Undecided**` row markers, plus the closing paragraph naming the two exceptions.

### Task 10: Write §10 Relationship to the Vanguard direction ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 10. Relationship to the Vanguard direction`

- [x] **Step 1: Read the two prior-direction documents before writing**

Run: `Get-ChildItem .docs\design\old-design\hybrid-concept.md, .docs\design\old-design\skirmish-board-replacement.md`
Expected: both files listed. Read them; do not restate their contents in the new document — the position
statement is three short paragraphs, not a summary.
Confirmed: both files listed and read in full before drafting §10.

- [x] **Step 2: Write `## 10. Relationship to the Vanguard direction`**

Required content:

- **The position: independent alternative — neither supersedes the other, and they are not sequential.**
  This is DLR-44's own framing of DLR-18 and the document adopts it.
- **The shared-work note:** DLR-26 under the Vanguard epic is a War Council CPU heuristic card player.
  Both directions need a Fox in the Forest trick-taking CPU, so that work is a candidate for sharing
  whichever direction proceeds. Note that `src/warCouncil/` already ships one.
- **The naming position:** this direction names its card layer afresh — **the Hunt** — rather than
  inheriting "War Council", because `CLAUDE.md` defines War Council as the Fox in the Forest layer *of
  the Vanguard hybrid* and carries that direction's framing with it. Reproduce the full vocabulary table
  from `plan.md` Part 2 → Data shapes (the Hunt, the Quarry, Spoils, Standing, the Demand, Forage) and
  mark it **first-pass, the developer's to red-line**.
- One line flagging that if this naming is accepted, `CLAUDE.md`'s naming pointer needs a follow-up edit
  — **and that this document does not make it.**

- [x] **Step 3: Confirm the position and the vocabulary table are present**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "DLR-18|DLR-26|War Council|the Hunt"`
Expected: at least four matches covering both tickets, the inherited-name question, and the new name.
Confirmed: 16 matches, including the title, §2, §3, the §10 position paragraph, the shared-work note,
and the vocabulary table row.

---

## Phase 4 — The slice and the critique

The two sections that decide whether the document is usable rather than merely complete: the minimum
thing that would prove or kill the concept, and the design's own critique of itself. The critique comes
last because AC 11 requires it to be run against a finished argument and its failures acknowledged in
place. This boundary is safe because the document is internally complete at the end of Task 12 — every
acceptance criterion has a home.

### Task 11: Write §11 Smallest testable slice ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 11. Smallest testable slice`

- [x] **Step 1: Inventory what the existing War Council engine already provides**

Run: `Get-ChildItem src\warCouncil -Filter *.ts -Name`
Expected: a listing including `deck.ts`, `deal.ts`, `legalMoves.ts`, `abilities.ts`, `resolveTrick.ts`,
`scoring.ts`, `cpuPlayer.ts`, `types.ts`. Read the ones that bear on the slice. **Read only — no file
under `src/` is written by this contract.**
Confirmed: listing included all named files plus `cardUtils.ts`, `index.ts`, `playCard.ts`,
`shuffle.ts`. Read `types.ts`, `index.ts`, `scoring.ts`, `cpuPlayer.ts`, `abilities.ts`,
`legalMoves.ts`, `deal.ts`, `deck.ts` in full. No file under `src/` written.

- [x] **Step 2: Write `## 11. Smallest testable slice`**

This is AC 10, and it must be small enough to be a plausible `/fb-plan` brief.

Required content:

- **The one question the slice answers**, stated first and in one sentence. It should be the ticket's
  headline risk: does the trick layer stay tense against a CPU, or does it read as a slot machine with
  extra steps? Everything in the slice exists to answer that; anything that does not is cut.
- **What is in:** one encounter — one 13-trick round, one Quarry with one round-long rule-break and a
  telegraphed intent, `Score = Spoils × Standing` scored once against one fixed Demand.
- **What is out, explicitly:** no run, no Forage, no shop, no second encounter, no escalation curve, no
  deck editing. State that these are out precisely because none of them is needed to answer the question.
- **What already exists**, from Step 1: `src/warCouncil/` supplies the deck, deal, legal moves,
  abilities, trick resolution, scoring, and a CPU player. The slice is therefore substantially smaller
  than a from-scratch reading suggests — name which parts are genuinely new (the Standing multiplier, the
  Demand, the Quarry's round-long rule-break, the intent telegraph) and which are reuse.
- **The kill criterion**, stated so it can actually fire: what the playtest would have to show for the
  concept to be abandoned rather than tuned. A slice with no kill criterion is a demo, not a test.
- One line noting that if the developer wants this sized as a clean prototype rather than against the
  existing engine, this section changes materially — flagged in `plan.md` as their call.

- [x] **Step 3: Confirm the slice names its question and its kill criterion**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## 11\. Smallest testable slice|kill"`
Expected: the heading plus at least one match for the kill criterion.
Confirmed: heading at line 513 plus 3 matches for "kill" (the kill-criterion label, its closing
sentence, and the §12 cross-reference to it).

### Task 12: Write §12 Critique ✓

- Skill: `game-designer`

**Files:**

- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append `## 12. Critique`

- [x] **Step 1: Re-read the critique checklist, then run all fourteen checks against the finished document**

Run: `Select-String -Path .docs\design\old-design\design-principles.md -Pattern "^## 6\. A critique checklist" -Context 0,30`
Expected: the fourteen numbered checks are printed. Run every one of them against sections 1–11.
Confirmed: checklist re-read in full (already read at phase start alongside the whole document); all
fourteen checks run against §1—§11, surfacing three ranked problems and three smaller findings.

- [x] **Step 2: Write `## 12. Critique` using the `game-designer` report template**

Use the skill's headings and order — strengths first, because a critique that opens with problems reads
as a verdict rather than as analysis.

Required content:

- `### What is genuinely strong` — name the *mechanism*, not the vibe. Candidates the document has
  earned: the printed table reused as a multiplier at zero invented numbers; the 156 ceiling forcing the
  outer loop to edit an input; the cast already being in the deck.
- `### Problem N — <one-sentence claim>` for each surviving problem, **ranked by severity × likelihood,
  not discovery order**. Each carries evidence (an enumeration, a computed number, or a rules citation),
  what the player actually experiences when it bites, and what it connects to elsewhere in the design.
  At minimum the Standing-as-dominant-strategy risk from §8 and the dead-run-before-you-can-tell problem
  from §6 must appear.
- **At least one stated connection between two problems** — the skill's strongest-output rule. The
  candidate already visible: §6's catch-up weakness and §8's dominant-band risk are both consequences of
  removing the scoring opponent, so a fix to one moves the other.
- `### Smaller findings`, then `### What to measure` — the cheapest measurements that would settle the
  document's main claims. Cross-reference §9's settling measurements rather than duplicating them.
- `### The one-line summary`.
- **Any framework the design fails is acknowledged in place**, per AC 11 — either fixed in the section it
  belongs to, or stated here as an accepted cost with the reason. Nothing is quietly dropped.

- [x] **Step 3: Confirm the critique is ranked and closes on measurements**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^### What is genuinely strong|^### What to measure|^### The one-line summary"`
Expected: all three headings present.
Confirmed: all three headings present at lines 595, 705, 720.

---

## Phase 5 — Final verification

No content changes. Only checks that the document is complete, that every path it cites resolves, that
it commits rather than surveys, and that it does not break the repo's formatting gate.

**This contract adds no TypeScript.** `npm run typecheck` and `npm run lint` are genuinely not applicable
to its diff — there is not a single `.ts` or `.tsx` file in it. Task 13.4 still runs the full suite and
build as a regression baseline, because `/fb-apply` dispatches QA to run them regardless and the expected
result should be written down rather than discovered.

### Task 13.1: Confirm every acceptance criterion has a section ✓

- Skill: none — verification only, no code and no prose written

- [x] **Step 1: List the document's top-level sections**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "^## "`
Expected: exactly 12 matches, numbered 1–12, matching the section map in `plan.md` Part 2 → Data shapes:
The equation · The shared object · What the run rewrites · The Quarry · Escalation · Catch-up · Run length
and depth budget · The ruleset: kept, modified, dropped · First-pass values · Relationship to the Vanguard
direction · Smallest testable slice · Critique.
**Confirmed: exactly 12 matches, numbered 1–12, in the section map's order.** PASS.

- [x] **Step 2: Confirm the file is a reasonable length for the argument it carries**

Run: `(Get-Content .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md | Measure-Object -Line).Lines`
Expected: a number reported. There is no line limit on a design document — the 400-line rule in
`CLAUDE.md` governs source files. Record the count in `pr-description.md`; a document materially shorter
than its two sibling references (`balatro.md` 514 lines, `forbidden-solitaire.md` 383 lines) is a signal
that a section was written thin, not a failure on its own.
**Confirmed: this command returns 607, but that is an under-count — PowerShell's `Measure-Object -Line`
skips blank separator lines when fed a string array. The true count is 726 (`wc -l`). 726 recorded in
`pr-description.md`; comfortably above both siblings, so no section was written thin.** PASS.
**Step-defect note:** the `Run:` command in this step is unreliable on this platform. A future contract
should use `wc -l` via the Bash tool, or `((Get-Content -Raw <path>) -split "\n").Count`.

### Task 13.2: Confirm every path and document the file cites actually resolves ✓

- Skill: none — verification only

- [x] **Step 1: Confirm the four reference documents exist at the paths the document cites**

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\balatro.md, .docs\design\Balatro-Forbidden-Solitaire\forbidden-solitaire.md, .docs\game_rules\fox-in-the-forest.md, .docs\design\old-design\design-principles.md`
Expected: all four listed, no errors.
**Confirmed: all four listed, no errors.** PASS.

- [x] **Step 2: Confirm the document does not cite the two known-dead paths**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "design/design-principles\.md|design/skirmish-board-replacement\.md"`
Expected: **zero hits.** Both of those paths appear in `CLAUDE.md` and in `game-designer/SKILL.md` but do
not exist on disk — the correct paths carry `old-design/`. A hit here means the document copied a stale
pointer.
**Confirmed: 0 genuinely stale hits.** PASS — but the raw grep returns **2**, both false positives.
**Step-defect note:** this pattern cannot distinguish a stale pointer from a correct one, because the
correct citation `../old-design/design-principles.md` contains the searched string as a substring
(`old-`**`design/design-principles.md`**). Re-running anchored with a negative lookbehind —
`"(?<!old-)design/design-principles\.md|(?<!old-)design/skirmish-board-replacement\.md"` — returns **0**,
which is the true result. A future contract should use the anchored pattern.

### Task 13.3: Confirm the document commits rather than surveys ✓

- Skill: none — verification only

- [x] **Step 1: Scan for placeholders**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "TBD|TODO|implement later|fill in details|to be decided|open question"`
Expected: zero hits for the first five. A match on "open question" is only acceptable inside §9 or §12,
where an explicitly-flagged developer decision is the intended content — check each hit's section rather
than accepting it blind.
**Confirmed: 0 hits for the first five, and 0 hits for "open question" as well — no per-hit section
inspection was needed.** PASS.

- [x] **Step 2: Confirm every fork names its discarded branch**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md -Pattern "discarded|rejected|not chosen"`
Expected: at least six matches — §2, §3, §4, §6 (two branches), and §7 each close a fork, and AC 1
requires the discarded branch named in one line every time.
**Confirmed: 12 matches (≥6 required).** PASS.

### Task 13.4: Formatting gate and regression baseline ✓ — Step 3 skipped at the developer's instruction

- Skill: none — verification only

- [x] **Step 1: Check formatting of the new file only**

Run: `npx prettier --check .docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`
Expected: exits 0 with "All matched files use Prettier code style!". `.docs/` is **not** in
`.prettierignore`, so the file is in scope. If it fails, run
`npx prettier --write .docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` and re-check. Do **not**
run the repo-wide `npm run format:check` as a gate — `.claude/workflow/web-project.md` records that it
already fails on pre-existing `.docs/**` files this contract has not touched.
**Confirmed: exits 0, "All matched files use Prettier code style!"** PASS.

- [x] **Step 2: Confirm no source file was modified**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: only the new `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` and files under
`.claude/contract/DLR-44-balatro-forbidden-solitaire-fox-design/`. **Any entry under `src/` is a scope
violation** — this contract writes no code.
**Confirmed: no scope violation.** PASS, judged against a baseline rather than the literal Expected.
**Step-defect note:** the stated Expected was unachievable from the start — the working tree was already
dirty before this contract began (31 entries, including `M src/App.tsx`, `M src/vanguard/overwrite.ts`,
and untracked `src/app/battle/`, all from prior contracts). The baseline was captured before the first
dispatch; `git status --porcelain` after Phase 5 is **byte-identical to it** — same 31 entries, no new
entry, no changed state. This contract added exactly two files: `hybrid-design.md` (inside the already
untracked `Balatro-Forbidden-Solitaire/` directory) and `pr-description.md` (inside the already untracked
contract folder). A future contract should compare against a captured baseline, not against "clean".

- [x] **Step 3: Regression baseline — full suite and production build** ✗ — **skipped at the developer's
      instruction**

Run: `npx vitest run --project node; npx vitest run --project dom; npm test; npm run build`
Expected: all exit 0. The two scoped runs first are the documented warm-up for the cold-cache
`[vitest-pool-runner]: Timeout waiting for worker to respond` trap in `.claude/workflow/web-project.md`
— a single cold timeout is infrastructure, not a defect, and must not be reported as a test failure.
Since this contract changes no source, any genuine failure here is pre-existing; report it as such rather
than attributing it to this work.
**NOT RUN.** The developer directed that `npm test` and `npm run build` were not needed for this contract.
Since it changes no source, this step could only ever have reported pre-existing state — no regression
signal was lost. **No test or build result is claimed for this contract.**

### Task 13.5: Write the PR description ✓

- Skill: none — developer hand-off document, no code

**Files:**

- Create: `.claude/contract/DLR-44-balatro-forbidden-solitaire-fox-design/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

**Confirmed: written.** Carries the ticket and `plan.md` links, the three-line spine, the seven developer
decisions as a table, the one thing only playing settles (pointing at §11), the full Phase 5 verification
results, the three known quirks stated plainly so they do not mislead, the future-contributor note, and
the `CLAUDE.md` staleness flag with the `/fb-issue` recommendation.

Include:

- Link to `plan.md` in this folder, and the DLR-44 ticket.
- Summary: one design document added under `.docs/design/Balatro-Forbidden-Solitaire/`; no code changed.
- The spine in three lines — the equation, the shared object, the 156 ceiling — so a reviewer can judge
  the design without opening the file.
- **Every decision the developer must make**, copied from the File map's "Developer decides or observes"
  block: the Standing ×0 value, the unchosen tuning values, the naming and its `CLAUDE.md` follow-up, the
  catch-up open option, the slice sizing basis, and the DLR-18 position.
- **The one thing only playing settles:** whether the trick layer stays tense against a CPU. Point at
  §11 as the test.
- Verification results from Phase 5, including the line count from Task 13.1 Step 2 and the
  `git status --porcelain` output from Task 13.4 Step 2.
- A one-line note for future contributors: this folder now holds two research references plus one
  committed design; the design cites the research and does not restate it.
- A one-line flag that `CLAUDE.md` is stale (empty-scaffold claim, two dead doc paths, `SCRUM` vs `DLR`)
  and that a separate `/fb-issue` is recommended — **not fixed by this contract.**

---

## Self-review

**Spec coverage:**

- AC 1 (one specific game, forks named) — Tasks 1, 13.3.
- AC 2 (core equation, every component an intervention) — Task 1.
- AC 3 (conversion question / shared object) — Task 2.
- AC 4 (what the outer loop rewrites) — Task 3.
- AC 5 (CPU in fiction and mechanics, bindings, visibility) — Task 4.
- AC 6 (escalation structure) — Task 5.
- AC 7 (catch-up position and consequence) — Task 6.
- AC 8 (run length and depth budget) — Task 7.
- AC 9 (kept / modified / dropped, trick-curve attention) — Task 8.
- AC 10 (smallest testable slice) — Task 11.
- AC 11 (critique against `design-principles.md`) — Task 12.
- In-scope: first-pass tuning values, marked — Task 9.
- Ticket risk: naming and the DLR-18 position — Task 10.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to
Task N" references. Every writing step states the claims, citations, and table columns the section must
carry; every verification step is a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** The six vocabulary terms — the Hunt, the Quarry, Spoils, Standing, the
Demand, Forage — are used identically in Tasks 1–12 and match `plan.md` Part 2 → Data shapes. The twelve
`##` section names in Tasks 1–12 match the section map exactly and are re-asserted by Task 13.1 Step 1.
The file path `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` is identical in every task. The
two numbers that recur — 156 (the ceiling) and 26 (the card cap) — are introduced in Task 3 and reused
consistently in Tasks 5, 9, and 11.

**Phase boundary cleanliness:**

- **Phase 1** ends with sections 1–3 written and self-contained; they depend on nothing later, so a
  rejected equation invalidates three sections rather than twelve.
- **Phase 2** ends with sections 4–7 written; §6 depends on §7's run-structure choice and Task 7 states
  that dependency in the document, so no forward reference is left dangling.
- **Phase 3** ends with sections 8–10 written; these are backward-looking accounts of decisions already
  made and introduce no new mechanism, so nothing downstream is left half-applied.
- **Phase 4** ends with the document internally complete — every acceptance criterion has a home and §12
  has been run against the finished argument.
- **Phase 5** changes no content; it only verifies. The repository is consistent at the end of every
  phase because no source file is touched at any point.
