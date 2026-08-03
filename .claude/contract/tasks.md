# Tasks: Child tickets for SCRUM-18 — single-city War Council → Vanguard battle loop

> **What this file is.** This is **not** an `/fb-plan` contract's `tasks.md` — no `^Status:` line,
> no `/fb-apply` walk. It's a working list, ready to feed the `management-jira` skill one ticket at
> a time, to break [SCRUM-18](https://amazerbeam.atlassian.net/browse/SCRUM-18) into child Story/Task
> tickets. Create them **in the order listed** — later tickets link `Blocks`/`is blocked by` against
> earlier ones by key, so earlier keys need to exist first. Every ticket below sets `parent: SCRUM-18`.
>
> Source material: the epic description itself, `.docs/design/hybrid-concept.md`,
> `.docs/design/skirmish-board-replacement.md`, and `.docs/design/concept-critique.md`. Project
> issue types confirmed live via `getVisibleJiraProjects`: **Epic, Story, Task, Bug** (no Subtask use
> per skill rules; no Test type configured on this project).

---

## Why this breakdown, and what it deliberately excludes

SCRUM-18 is the smallest slice that proves the one thing about this design that's unproven: that a
War Council round genuinely funds a Vanguard fight, and that the fight resolves to a clear win. That
means three engines (War Council, Vanguard, the Muster/Clash glue), two CPU opponents, two UI
surfaces, and a deploy target — nothing about a campaign, map, or the deferred design modules.

Everything the epic marks **out of scope** stays out of every ticket below: no campaign map, no
multiple cities, no card special/goal/poison modules, no search-based AI, no stalemate/tiebreak rule
for the Vanguard (an unfilled/no-Breach board is a known, accepted gap for this slice — see Risks in
Ticket 12).

**Numbers used in acceptance criteria below (Muster baseline, overwrite costs, board size, reinforce
cap) are illustrative, transcribed from `skirmish-board-replacement.md`, not final.** Per that
document's own "Open, not yet decided" section, the developer sets shipped values once there's
something playable — tickets should not block on picking a final number, only on wiring the formula/
mechanism correctly. Flag this in each relevant ticket's Dependencies & Risks section rather than
re-deciding it here.

Two design questions genuinely have **no default yet** and each engine ticket below picks a stated,
reversible default rather than stalling:
- **Who opens The Clash each round** — default: CPU opens round 1, alternates every round after
  (per `concept-critique.md`'s "Smaller findings" recommendation over a permanent CPU-first edge).
- **Unspent Muster moves at round end** — default: lost, not banked (per
  `concept-critique.md`, "the right default... would create a second currency").

---

## Sequencing

```
Phase A — Engines (no UI, no CPU)
  A0 Battle module scaffold & shared types
   ├─▶ A1 War Council rules engine
   ├─▶ A2 Vanguard board engine
   └─▶ A3 Muster conversion  ───────────┐
        A2 ──▶ A5 Breach detection      │
        A2, A3, A5 ──▶ A4 The Clash turn engine
   A1, A3, A4, A5 ──▶ A6 Battle loop orchestrator

Phase B — CPU (needs its matching engine)
  A1 ──▶ B1 War Council CPU
  A2, A4 ──▶ B2 Vanguard CPU

Phase C — UI (needs its matching engine; C5 can run any time)
  A1 ──▶ C1 War Council UI
  A2 ──▶ C2 Vanguard UI
  A3, A4, C1, C2 ──▶ C3 Muster/Clash HUD
  A6 ──▶ C4 Battle-flow screens (round transition, win/loss)
  (none) C5 Visual/asset direction for cards & board — developer pause point
  C1, C2, C3, C4, C5 ──▶ C6 UI polish pass (spacing, colour, states, motion)

Phase D — Integration, deploy, sign-off
  A6, B1, B2, C1, C2, C3, C4, C6 ──▶ D1 Wire the end-to-end battle loop
  (none, run any time before D3) D2 GitHub Pages deploy pipeline
  D1, D2 ──▶ D3 Full-loop QA & Definition of Done sign-off
```

18 tickets. Phase A is the critical path — nothing in B or C can be honestly scoped until the engine
it wraps exists, because none of War Council, Vanguard, or the Muster formula has a single line of
code yet.

---

## Phase A — Engines

### Ticket A0: Battle module scaffold and shared game-state types

- **Type:** Task
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocks:** A1, A2, A3
- **Skill:** react-frontend

**Description**

```
## Problem Statement
No subfolder structure, module boundary, or shared type exists yet in this repo (CLAUDE.md:
"no architecture the next prototype has not chosen"). Every other ticket in this epic needs a
place to put its code and a shared vocabulary for battle phase, score, and Muster — without this
ticket first, each subsequent ticket invents its own incompatible shape.

## User Story
As a developer picking up any ticket in this epic, I want an established module layout and a
shared BattlePhase/BattleState type, so that the War Council, Vanguard, and Muster engines compose
instead of each inventing incompatible state shapes.

## Acceptance Criteria
1. A documented module layout exists under `src/` separating War Council, Vanguard, and
   battle-orchestration concerns (exact folder names are this ticket's call — e.g.
   `src/warCouncil/`, `src/vanguard/`, `src/battle/`).
2. A shared `BattlePhase` type/enum exists covering at minimum: War Council round in progress,
   Muster conversion, The Clash in progress, Breach reached / battle resolved.
3. A shared top-level `BattleState` type exists that a later orchestrator (Ticket A6) can hold as
   its single source of truth, referencing (not duplicating) each engine's own state shape.
4. `npm run typecheck` and `npm run lint` pass with only this scaffold in place (empty engines are
   fine — this ticket does not implement rules).
5. No React component, CPU logic, or rendering code is added in this ticket — types and folders only.

## Scope Boundaries
**In scope:** module folder layout, shared phase/state types, barrel/index files if useful.
**Out of scope:** any actual War Council, Vanguard, or Muster logic (Tickets A1–A3); UI (Phase C).

## Dependencies & Risks
No dependencies — this is the first ticket in the epic. Risk: over-designing the shared state shape
before the engines it wraps exist. Keep it minimal; each engine ticket may need to extend it, and
that's expected, not a defect in this ticket.

## Design Assets
N/A
```

---

### Ticket A1: War Council rules engine — Fox in the Forest, base 33-card deck

- **Type:** Story
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocked by:** A0
- **Blocks:** A6, B1, C1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The War Council is the only source of Muster for both sides — if its rules are wrong, everything
downstream (Muster, the Clash, the Breach) is funded incorrectly. This is the harder of the two
engines per `hybrid-concept.md` ("The War Council AI is the hard half") and must be correct and
fully tested before any CPU or UI work depends on it.

## User Story
As a player, I want a full 13-trick Fox in the Forest round played correctly against the base
33-card deck, so that the score I earn honestly reflects my play and correctly determines my side's
Muster.

## Acceptance Criteria
1. A full round deals and plays out exactly 13 tricks using the base 33-card deck only — no
   special/goal/poison modules (explicit scope note in `hybrid-concept.md`).
2. Trick-taking, trump/decree resolution, and any odd-card ability that mutates the trump suit
   mid-trick are implemented per `../game_rules/fox-in-the-forest.md` and enforced as legal-move
   constraints — an illegal play cannot be submitted by either side.
3. End-of-round scoring produces the correct points → band per the scenario table in
   `hybrid-concept.md`: 0–3 tricks → 6 pts, 4 → 1 pt, 5 → 2 pts, 6 → 3 pts, 7–9 → 6 pts,
   10–13 → 0 pts, and this always sums to a valid pair (both sides' bands are locked together,
   since tricks always sum to 13).
4. The engine module has no React import and no DOM access (pure logic, testable headless) —
   establishes the pure-core boundary CLAUDE.md notes was dropped with the previous prototype and
   is worth re-establishing.
5. Unit tests (Vitest) cover: a full round dealing exactly 13 tricks, trump/decree resolution,
   the odd-card trump-mutation ability, and the scoring-band table for every possible trick split.

## Scope Boundaries
**In scope:** deck, deal, trick resolution, trump/decree, scoring bands, legal-move validation.
**Out of scope:** any CPU decision-making (Ticket B1), any rendering (Ticket C1), the Treasure-7s
mid-round bonus question (open in `hybrid-concept.md` — implement the base end-of-round band only;
do not invent a Treasure-7s rule here).

## Dependencies & Risks
Depends on Ticket A0's module scaffold. Risk: this is explicitly called out as the harder half of
the whole epic (hidden hands, 13 tricks of lookahead-relevant state, an ability that mutates trump
mid-trick) — budget review time accordingly. Open question carried forward, not resolved here: dealer
alternation across a battle (whether it resets or continues) — implement dealer alternation
per-round and flag the cross-round-boundary question in this ticket's Dependencies rather than
guessing; Ticket A6 (orchestrator) is where that boundary actually gets decided.

## Design Assets
N/A
```

---

### Ticket A2: Vanguard board engine — hex grid, bases, Expand/Overwrite/Reinforce

- **Type:** Story
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocked by:** A0
- **Blocks:** A4, A5, A6, B2, C2
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The Vanguard is the board both sides fight over, and it's the newer, less-proven half of the
design (superseding two earlier rejected boards — see `skirmish-board-replacement.md`, "Why the
lane version didn't work"). Its legality rules (adjacency for Overwrite, 2-hex range with a 1-cell
gap allowed for Expand) are the entire offense/defense tension the design is built on and must be
enforced exactly.

## User Story
As a player, I want a hex-grid board with two fixed bases where Expand, Overwrite, and Reinforce
each behave per their documented legality and cost, so that the board fight is a real spatial
decision, not an arbitrary one.

## Acceptance Criteria
1. A hex-grid rhombus board exists with two fixed base cells (Player, CPU) in roughly opposite
   corners, each pre-seeded with a small starting cluster of that side's own connected tokens
   (cluster size is an illustrative/tunable constant, not hardcoded logic).
2. Permanent grey "defense" cells exist as a per-map fixed set that no side may ever place on.
3. **Expand** places a token on an empty cell within 2 hex-spaces of the acting side's existing
   connected network (a 1-cell gap is legal); illegal outside that range.
4. **Overwrite** replaces an enemy token only on a cell adjacent (touching) to the acting side's
   existing network — no gap allowed; illegal otherwise. Cost is 2 moves normally, 3 if the target
   cell is reinforced (per Ticket description below).
5. **Reinforce** adds defense to a token the acting side already holds; a token can hold at most
   +1 reinforcement (does not stack further); illegal to reinforce an unowned or already-maxed cell.
6. The engine module has no React import and no DOM access (pure logic, headless-testable),
   consistent with Ticket A1's boundary.
7. Unit tests cover: Expand range/gap legality at the boundary (exactly 2 away, exactly 3 away),
   Overwrite adjacency legality and the 2-vs-3-move reinforced-target cost, and the Reinforce +1 cap.

## Scope Boundaries
**In scope:** hex grid model, base cells, defense cells, the three actions' legality + cost.
**Out of scope:** the Breach connectivity check (Ticket A5), CPU action selection (Ticket B2),
rendering (Ticket C2), any stalemate/tiebreak rule (explicitly out of scope for the whole epic).

## Dependencies & Risks
Depends on Ticket A0. Risk: board size, starting-cluster size, and the 2/3 overwrite cost are all
illustrative numbers in `skirmish-board-replacement.md` — implement them as named constants the
developer can retune after first playtest, not inlined magic numbers. No stalemate handling means a
battle can theoretically run indefinitely if neither side reaches the Breach — accepted per the
epic's explicit out-of-scope list; Ticket A6 should still expose round count so this is visible, not
silent.

## Design Assets
N/A
```

---

### Ticket A3: Muster conversion — War Council score band to move budget

- **Type:** Task
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A0
- **Blocks:** A4, A6, C3
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The epic calls out the Muster conversion as its own deliverable, separate from either engine —
it's the coupling itself, and getting it wrong (e.g. a zero-floor allowance) is exactly the failure
mode `concept-critique.md` Problem 1 documents against the old Hex board.

## User Story
As a player, I want my War Council score to convert into a move budget that always includes a
non-zero baseline, so that losing the card round is a tempo setback in the Vanguard, not an
elimination.

## Acceptance Criteria
1. A pure function converts a War Council score band (per Ticket A1's output) into a Muster: a
   fixed baseline move count for both sides (illustrative: 7, per `skirmish-board-replacement.md`),
   plus bonus moves for the round's winner only.
2. The losing side's Muster is never zero — the baseline floor applies regardless of how lopsided
   the War Council round was (this is the specific fix for the old Hex board's 6–0 ambush problem;
   do not let bonus-move logic override the floor).
3. The function is pure (same score band always produces the same Muster) and has no React import
   or DOM access.
4. Unit tests cover the full scenario table from `hybrid-concept.md` (four ambush intensities,
   three pitched-battle margins) confirming both sides' Muster values for each.

## Scope Boundaries
**In scope:** the conversion function only.
**Out of scope:** how the Muster is spent (Ticket A4), whether Treasure 7s grant extra moves (open
question in `hybrid-concept.md`, not resolved by this ticket — implement the end-of-round band only).

## Dependencies & Risks
Depends on Ticket A0; feeds Tickets A4, A6, and the HUD (C3). The baseline (7) and bonus values are
illustrative — implement as named, easily-retuned constants.

## Design Assets
N/A
```

---

### Ticket A5: The Breach — win-condition detection

- **Type:** Task
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A2
- **Blocks:** A4, A6
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The Breach is the epic's win condition, and it's specifically stricter than the Expand action's own
gap rule — a gap that's legal for scouting is *not* legal for winning. Getting this wrong either
lets a scouted-but-unfilled path falsely win, or fails to detect a genuine win.

## User Story
As a player, I want the game to detect the instant my tokens form an unbroken, gap-free chain from
my base to the opponent's base, so that reaching the Breach ends the battle immediately and fairly.

## Acceptance Criteria
1. A pure function takes a Vanguard board state and a side, and returns whether that side has an
   unbroken chain of its own adjacent tokens connecting its base to the opponent's base.
2. A path that includes any Expand-style 1-cell gap does **not** count — only fully adjacent,
   solid chains satisfy the Breach.
3. The function correctly detects a Breach on a minimal hand-built board fixture and correctly
   rejects a chain that has a single gap cell in it (regression test for Acceptance Criterion 2).
4. The function is pure, headless-testable, no React import or DOM access.
5. Unit tests cover: no chain exists, a solid chain exists, a gapped near-chain is correctly
   rejected, and a chain that only the opponent (not the checked side) holds is correctly rejected.

## Scope Boundaries
**In scope:** connectivity/reachability check only.
**Out of scope:** what happens if neither side ever reaches the Breach (explicitly out of scope for
the whole epic — no stalemate/tiebreak rule).

## Dependencies & Risks
Depends on Ticket A2's board model. Low risk — this is a standard graph-reachability check once the
adjacency model from A2 exists; the only subtlety is Acceptance Criterion 2 (gap exclusion), which
is also the thing most likely to be missed in a naive flood-fill implementation.

## Design Assets
N/A
```

---

### Ticket A4: The Clash — turn engine (alternating spend, uncontested leftover)

- **Type:** Story
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A2, A3, A5
- **Blocks:** A6, B2, C3
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The Clash is where the Muster actually gets spent, and its two-part structure (strict alternation,
then uncontested leftover) is the concrete, structural payoff for winning the War Council — "free,
unanswered actions at the end of the exchange, not just a bigger number to spend"
(`skirmish-board-replacement.md`).

## User Story
As a player, I want both sides to alternate spending their Muster one action at a time, with
whichever side has leftover moves spending them consecutively and uncontested at the end, so that
winning the War Council pays off as a tangible advantage rather than just a bigger number.

## Acceptance Criteria
1. Both sides alternate exactly one action (Expand/Overwrite/Reinforce, per Ticket A2's legality)
   at a time until one side's Muster is exhausted.
2. Once one side is out of moves, the other side's remaining moves are spent consecutively,
   uncontested — no further alternation once one side is out.
3. Which side opens The Clash follows the stated default: CPU opens round 1, alternates every round
   thereafter (see this file's header — no default existed in the design docs; this ticket
   implements the stated default and exposes it as a single named function/flag so the developer
   can flip it after playtest without touching the rest of the engine).
4. The engine checks for the Breach (Ticket A5) after every single action, not just at the end of
   the exchange, per `hybrid-concept.md`'s "assumed to fire after every single action" note — a
   round can end with moves unspent once a Breach fires mid-exchange.
5. Unspent moves at the natural end of a Clash (both sides exhausted, no Breach) are lost, not
   banked to the next round — per this file's header default.
6. Unit tests cover: strict alternation while both sides have moves, uncontested leftover spend
   once one side is exhausted, a Breach firing mid-exchange (round ends immediately, remaining
   moves are simply unspent), and the round-opener alternation across two consecutive rounds.

## Scope Boundaries
**In scope:** turn alternation, leftover-spend handling, per-action Breach check, opener alternation.
**Out of scope:** what either side actually chooses to do with an action (Ticket B2 for CPU,
Ticket C2/C3 for the human's UI-driven choice) — this ticket only enforces *whose turn it is* and
*when the round ends*, not *what* gets played.

## Dependencies & Risks
Depends on Tickets A2 (action legality), A3 (Muster amounts), and A5 (Breach check). Risk: the
round-opener default (Acceptance Criterion 3) and unspent-moves-lost default (Acceptance Criterion 5)
are both this ticket's own stated defaults, not settled developer decisions — implement them as
named, single-point-of-change choices so a later developer call doesn't require re-touching the
whole turn engine.

## Design Assets
N/A
```

---

### Ticket A6: Battle loop orchestrator — War Council → Muster → Clash → Breach/loop

- **Type:** Story
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocked by:** A1, A3, A4, A5
- **Blocks:** B1, B2, C1, C2, C4, D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
No engine ticket above owns the loop itself — War Council round, feed Muster, run the Clash, check
the Breach, and if no Breach, deal straight into the next War Council round without resetting the
Vanguard board. Without this ticket, the four engines are four disconnected pieces.

## User Story
As a player, I want consecutive War Council rounds to keep feeding the same, never-reset Vanguard
board until one side reaches the Breach, so that a battle plays out as one continuous war rather
than a series of disconnected duels.

## Acceptance Criteria
1. The orchestrator holds a single `BattleState` (per Ticket A0's shared type) through the full
   sequence: deal and play a War Council round (A1) → convert its score to Muster (A3) → run The
   Clash (A4, which itself checks the Breach via A5) → if no Breach, start the next War Council
   round with the *same* Vanguard board state (tokens persist, per `hybrid-concept.md`: "never
   reset between rounds").
2. Dealer alternates every War Council round; the alternation is a single, named piece of state
   that a later ticket could carry across a hypothetical multi-battle boundary without rewriting
   this orchestrator (the campaign layer itself is out of scope for this epic).
3. The loop terminates cleanly the instant a Breach is detected mid-Clash, producing a final
   `BattleState` that unambiguously names the winning side.
4. No round count cap exists (none is in scope) — the loop must not hang or throw if many rounds
   pass without a Breach; it simply keeps dealing War Council rounds.
5. Integration-level Vitest tests run at least 2 full simulated battles (using scripted or
   randomized-but-seeded card play and CPU-free scripted board actions) to a Breach, confirming the
   board state truly persists round-to-round and the final winner matches the side that achieved
   the Breach.

## Scope Boundaries
**In scope:** the phase-sequencing loop, board persistence across rounds, dealer alternation, clean
termination on Breach.
**Out of scope:** CPU decision-making (B1/B2), any UI (Phase C), anything above "one battle" (no
campaign, no map — explicitly out of scope for the whole epic).

## Dependencies & Risks
Depends on Tickets A1, A3, A4, A5 all being complete. This is the integration point for all of
Phase A — schedule it last within Phase A, and expect it to surface any interface mismatches between
the engines built independently in A1–A5.

## Design Assets
N/A
```

---

## Phase B — CPU opponent

### Ticket B1: War Council CPU — heuristic card player

- **Type:** Story
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A1, A6
- **Blocks:** D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The epic's Definition of Done requires a player to "play a full War Council round against the CPU."
`hybrid-concept.md` calls this CPU "the hard half" of the design (hidden hands, 13 tricks, an
ability that mutates trump mid-trick) — but the epic's own scope caps ambition here deliberately:
heuristic/random-level play that's always legal, not the eventual search-based AI.

## User Story
As a player, I want the CPU to always play a legal card on its turn using a simple heuristic (not
pure random, not deep search), so that a full round is playable end-to-end without the CPU stalling
or cheating.

## Acceptance Criteria
1. The CPU selects a legal card every turn, respecting all of Ticket A1's legal-move constraints
   (suit-following, trump/decree rules, the trump-mutating odd-card ability) with zero illegal plays
   across a full 13-trick round.
2. The CPU's card choice uses a stated, simple heuristic (e.g. "follow suit with the lowest card
   that still wins the trick if ahead, otherwise play lowest legal card" or an equivalent documented
   rule) — not a uniformly random legal card, and explicitly not determinized/Monte Carlo search
   (out of scope, per the epic and `hybrid-concept.md`).
3. The CPU completes a full round within a reasonable per-decision time bound suitable for a
   synchronous UI turn (no artificial "thinking" delay required, but no unbounded search either).
4. Unit tests confirm zero illegal plays across many simulated full rounds (e.g. 50+ seeded runs)
   against a range of hands.

## Scope Boundaries
**In scope:** legal-move selection via a simple, stated heuristic.
**Out of scope:** any awareness of Vanguard board state when choosing card play (the "CPU should be
informed by how badly it needs Muster on the current board" idea is flagged in `hybrid-concept.md`
as future difficulty, not this epic's scope) — this CPU treats every War Council round the same way
regardless of board state; search-based/Monte Carlo play (explicitly out of scope for the epic).

## Dependencies & Risks
Depends on Ticket A1 (rules engine) and A6 (needs a loop to plug into for the "full round against
the CPU" DoD item to be checkable at all). Risk: even a simple heuristic still has to correctly
navigate the trump-mutating odd-card ability — verify that specifically, not just suit-following.

## Design Assets
N/A
```

---

### Ticket B2: Vanguard CPU — heuristic action selection

- **Type:** Story
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A2, A4, A6
- **Blocks:** D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
`skirmish-board-replacement.md`'s "Open, not yet decided" section flags that evaluating a partial
Vanguard network's chance of reaching the Breach is "a similar class of problem" to what made Hex
need Monte Carlo rollouts — the epic explicitly scopes this ticket down to heuristic/random-level
play, not that harder problem, to keep this slice buildable.

## User Story
As a player, I want the CPU to spend its Muster on legal Expand/Overwrite/Reinforce actions using a
simple heuristic, so that the Vanguard phase is playable end-to-end without the CPU stalling,
wasting its whole Muster on no-op choices, or cheating on legality.

## Acceptance Criteria
1. On each of its turns in The Clash (per Ticket A4's alternation), the CPU selects a legal action
   (per Ticket A2's legality rules) with zero illegal actions across full simulated battles.
2. The CPU's action choice uses a stated, simple heuristic (e.g. "prefer Overwrite when adjacent to
   an enemy token blocking the shortest path toward the opponent's base, otherwise Expand toward
   that base, Reinforce only when no productive Expand/Overwrite is available") — not uniformly
   random, and explicitly not full board-evaluation search (out of scope).
3. The CPU never spends an action that has no legal target when a legal alternative exists (i.e. it
   doesn't pass or stall when it has moves and legal options remain).
4. Unit tests confirm zero illegal actions and non-degenerate play (the CPU's network grows over
   the course of a battle, not just sits at its starting cluster) across several seeded simulated
   battles.

## Scope Boundaries
**In scope:** legal action selection via a simple, stated heuristic informed by proximity to the
opponent's base.
**Out of scope:** genuine path-evaluation / lookahead of Breach probability (flagged as future,
possibly Monte-Carlo-class difficulty in `skirmish-board-replacement.md` — explicitly not this
ticket); any awareness of the *next* War Council round's card play (cross-phase CPU awareness is
future work per `hybrid-concept.md`, not this epic's scope).

## Dependencies & Risks
Depends on Tickets A2, A4 (needs actions and turn structure to act within), and A6 (loop to plug
into). Risk: "non-degenerate play" (Acceptance Criterion 4) is a soft, judgement-shaped bar — write
the test to check directional growth toward the opponent's base, not a specific win rate; a CPU that
sometimes loses is fine and expected at heuristic level.

## Design Assets
N/A
```

---

## Phase C — UI / graphics

### Ticket C1: War Council UI — hand, trick area, trump/decree, score

- **Type:** Story
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A1, A6
- **Blocks:** C3, C6, D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The player needs a real surface to play the War Council round on — select and play cards, see the
current trick, see what's trump/decree, and see the running score. Without this, Ticket A1's engine
is unplayable by a human.

## User Story
As a player, I want to see my hand, the current trick, the trump/decree card, and both sides' trick
counts, and to play a card by selecting it, so that I can actually play a War Council round.

## Acceptance Criteria
1. The player's hand renders as a set of selectable cards; selecting and confirming a card submits
   it to the engine (Ticket A1) and is rejected/disabled if illegal per the engine's own legality
   check (no client-side re-implementation of legality — the UI defers to the engine).
2. The current trick-in-progress (cards played so far this trick, by whom) is visible.
3. The active trump/decree card is visible and updates immediately when the odd-card ability
   mutates it mid-trick.
4. Running trick counts for both sides are visible and update after each trick resolves.
5. Component tests (Vitest, React Testing Library conventions per the react-frontend skill) query by
   accessible role and label — e.g. a card is a `button` with an accessible name identifying rank
   and suit — and cover: selecting and playing a legal card, and a disabled/rejected state for an
   illegal one.
6. `.docs/design/*` mentions no card art assets exist yet — this ticket may ship with CSS/text-based
   card faces (suit symbol + rank) as the default; see Ticket C5 for the visual-direction decision
   this ticket should not block on.

## Scope Boundaries
**In scope:** hand rendering, trick area, trump/decree display, score display, card selection/play
interaction.
**Out of scope:** the Vanguard board (Ticket C2), the Muster/Clash HUD (Ticket C3), final visual
polish/art direction (Ticket C5 — this ticket ships a functional default, not final visuals).

## Dependencies & Risks
Depends on Ticket A1 (engine to render/submit against) and A6 (a loop to actually be shown inside).
Risk: card art direction is a visual-judgement pause condition per `CLAUDE.md` — do not let this
ticket stall on it; ship the CSS/text default and let Ticket C5 revisit if the developer wants more.

## Design Assets
N/A — see Ticket C5.
```

---

### Ticket C2: Vanguard UI — hex board renderer and action selection

- **Type:** Story
- **Priority:** High
- **Parent epic:** SCRUM-18
- **Blocked by:** A2, A6
- **Blocks:** C3, C6, D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The Vanguard board needs to be visible and interactive — a hex grid with two bases, defense cells,
and each side's tokens, with a way to choose and target Expand/Overwrite/Reinforce. `hybrid-concept.md`
also specifically calls for the board to stay on screen during the War Council phase, since (until
any future card↔board coupling fill) it's the only channel through which board state can inform card
play at all.

## User Story
As a player, I want to see the hex board with both bases, all placed tokens, and defense cells, and
to choose Expand/Overwrite/Reinforce and a target cell during The Clash, so that I can actually play
the Vanguard phase and read board state throughout the battle.

## Acceptance Criteria
1. The hex-grid rhombus renders with both bases, all currently placed tokens (owner distinguishable
   by colour, per `skirmish-board-replacement.md`: purple Player, green CPU), permanent defense
   cells, and the reinforced (+1) state of any token that holds it.
2. During the player's turn in The Clash, selecting an action (Expand/Overwrite/Reinforce) and then
   a target cell submits it to the engine (Ticket A2/A4) and is rejected/disabled if illegal — no
   client-side re-implementation of legality.
3. The board remains visible (not hidden behind a phase transition) during the War Council phase,
   per `hybrid-concept.md`'s point that it's currently the only board→card information channel.
4. Component tests query by accessible role/label (a cell is e.g. a `button` with an accessible name
   identifying its coordinate and occupant) and cover: a legal Expand submission, a legal Overwrite
   submission, and a rejected/disabled illegal target.
5. Board and token visuals may ship as a functional default (solid-colour hex cells, simple token
   markers) — see Ticket C5 for final visual direction; this ticket should not block on it.

## Scope Boundaries
**In scope:** board rendering, token/base/defense-cell rendering, action + target selection UI.
**Out of scope:** the Muster/turn HUD (Ticket C3 — whose-turn-is-it and moves-remaining live there),
final visual polish (Ticket C5).

## Dependencies & Risks
Depends on Ticket A2 (engine to render/submit against) and A6 (loop to be shown inside). Risk: a
full hex-grid board (illustrative size not yet fixed by the developer, per
`skirmish-board-replacement.md`) needs a coordinate system decided early (axial/cube hex coordinates
are the standard choice) — get this right before C3/D1 build on top of it, since a coordinate-system
change later touches every consumer.

## Design Assets
N/A — see Ticket C5.
```

---

### Ticket C3: Muster / Clash HUD — move budget, turn indicator, action feedback

- **Type:** Task
- **Priority:** Medium
- **Parent epic:** SCRUM-18
- **Blocked by:** A3, A4, C1, C2
- **Blocks:** C6, D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
`concept-critique.md`'s "Smaller findings" explicitly warns that a segment ending with unspent
moves "needs to look like a resolved battle, not a bug" — the player needs to see their Muster,
whose turn it is in The Clash, and when leftover moves are being spent uncontested, or the whole
phase reads as broken.

## User Story
As a player, I want to see both sides' remaining Muster, whose turn it currently is, and a clear
indicator when I'm spending leftover moves uncontested, so that The Clash's turn structure is
legible rather than confusing.

## Acceptance Criteria
1. Both sides' remaining Muster (moves left this round) is visible and updates after every action.
2. Whose turn it currently is in The Clash's alternation is visually unambiguous.
3. When one side is spending leftover moves uncontested (per Ticket A4), the UI clearly indicates
   this is happening and why (e.g. "CPU is out of moves — you're spending your remaining N moves").
4. When a round ends with moves unspent (Muster exhausted or a Breach fired mid-exchange), the UI
   state clearly reads as a resolved, intentional end — not a stuck or broken screen.
5. Component tests query by accessible role/label and cover: Muster counts updating after an action,
   and the turn indicator switching between sides.

## Scope Boundaries
**In scope:** Muster display, turn indicator, uncontested-spend indicator, unspent-moves-at-end
messaging.
**Out of scope:** the board itself (Ticket C2), the card hand (Ticket C1), round-transition and
win/loss screens (Ticket C4).

## Dependencies & Risks
Depends on Tickets A3, A4 (data to display) and C1, C2 (needs both phase UIs to sit alongside). Low
risk — this is a straightforward display-and-update ticket once its dependencies exist.

## Design Assets
N/A
```

---

### Ticket C4: Battle-flow screens — round transition and Breach win/loss

- **Type:** Task
- **Priority:** Medium
- **Parent epic:** SCRUM-18
- **Blocked by:** A6
- **Blocks:** C6, D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
The Definition of Done requires "a battle ends in a clear win/loss for one side" — without a
dedicated screen for that, and for the transition between War Council rounds, the loop from Ticket
A6 has no player-visible framing and a Breach would just silently stop updating the board.

## User Story
As a player, I want a clear transition between War Council rounds and an unambiguous win/loss screen
when the Breach is reached, so that I always know what phase I'm in and how the battle ended.

## Acceptance Criteria
1. A visible transition marks the end of one War Council round and the start of the next (e.g. a
   brief summary of that round's score-band result and the Muster it produced), consistent with
   Ticket A6's dealer-alternation and board-persistence behaviour.
2. When the Breach is detected (Ticket A5, surfaced through A6), a dedicated screen names the
   winning side unambiguously and ends active play — no further card or board interaction is
   possible after this screen appears.
3. Component tests query by accessible role/label and cover: the round-transition summary
   appearing with the correct score-band result, and the win/loss screen naming the correct winner
   for both a Player-Breach and a CPU-Breach fixture.

## Scope Boundaries
**In scope:** round-transition summary, win/loss screen.
**Out of scope:** any "play again" / restart flow beyond what's trivially needed to satisfy DoD
item 4 (a restart flow is reasonable to include if cheap, but is not itself a DoD requirement —
don't let it expand this ticket).

## Dependencies & Risks
Depends on Ticket A6 (the loop and its Breach signal). Low risk, mostly a display concern once A6's
state shape is settled.

## Design Assets
N/A
```

---

### Ticket C5: Visual and asset direction for cards and board tokens

- **Type:** Task
- **Priority:** Low
- **Parent epic:** SCRUM-18
- **Blocked by:** (none — can run any time, informs C1/C2 if resolved early)
- **Blocks:** C6 (C1/C2 themselves ship with a functional default regardless of this ticket)
- **Skill:** none — this is a developer visual-judgement call, not an implementation task

**Description**

```
## Problem Statement
Neither `hybrid-concept.md` nor `skirmish-board-replacement.md` specifies final visual treatment for
cards or board tokens, and CLAUDE.md/`web-project.md` both name visual judgement — layout,
readability, colour — as work only the developer can do. Left completely open, Tickets C1 and C2
have no stated fallback and could stall waiting on art that doesn't exist yet.

## User Story
As the developer, I want to decide (or explicitly defer) the visual treatment for cards and board
tokens early, so that Tickets C1 and C2 have a clear default to build against instead of guessing.

## Acceptance Criteria
1. A decision is recorded (even if the decision is "ship the CSS/text-based default and revisit
   later"): are card faces CSS/text-based (suit symbol + rank, no image assets) or do they use
   sourced/created art?
2. Same decision recorded for board tokens and base markers: solid-colour shapes, or sourced/
   created art?
3. If image assets are chosen, their source and licensing is noted (this project has no asset
   pipeline or CDN dependency today — adding one is itself a dependency decision per
   `web-project.md`'s "Approving a new dependency" pause condition, and should be flagged as such,
   not silently added).
4. The decision (whatever it is) is written down somewhere Tickets C1/C2's implementer will see it
   before or during their work — a comment on this ticket is sufficient; it does not need its own doc.

## Scope Boundaries
**In scope:** the visual-direction decision itself.
**Out of scope:** actually implementing the chosen visuals (that's Tickets C1/C2 doing their own
rendering work against whatever this ticket decides).

## Dependencies & Risks
No engineering dependencies. This is flagged as a **pause condition** per `CLAUDE.md` — visual
judgement is explicitly the developer's call, not an agent's. The pre-approved default (per this
project's "developer defers game-domain decisions" pattern) is the CSS/text-based option in
Acceptance Criteria 1–2, since it needs no new dependency and both C1 and C2 already plan to ship
against it if this ticket isn't resolved first.

## Design Assets
N/A — this ticket produces the decision, not the asset.
```

---

### Ticket C6: UI polish pass — spacing, colour, interactive states, motion

- **Type:** Task
- **Priority:** Medium
- **Parent epic:** SCRUM-18
- **Blocked by:** C1, C2, C3, C4, C5
- **Blocks:** D1
- **Skill:** react-frontend

**Description**

```
## Problem Statement
Tickets C1–C4 each ship a stated functional default so Phase C isn't blocked on visual direction —
that default is deliberately plain (unstyled/lightly-styled cards, hex cells, HUD, and transition
screens). Left as-is, the epic would satisfy every Definition of Done item on a UI that reads as
unfinished. The developer wants the four surfaces pulled into one visually considered whole before
this counts as done.

## User Story
As a player, I want the War Council, Vanguard board, Muster/Clash HUD, and transition/win-loss
screens to share a consistent, considered look — spacing, colour, and clear interactive states —
so that the game reads as a finished small prototype rather than a wireframe.

## Acceptance Criteria
1. A shared spacing scale (e.g. CSS custom properties / design tokens for a small set of spacing
   steps) is defined once and applied consistently across all four surfaces from C1–C4, replacing
   any ad hoc per-component spacing values introduced while those tickets shipped their functional
   defaults.
2. A shared colour palette is defined and applied consistently — extending the two colours already
   fixed by design (`skirmish-board-replacement.md`: purple Player, green CPU) with a full
   background/text/border/state palette, with readable contrast between text and its background
   (not a full WCAG audit — a plain-language readability check is sufficient for this prototype).
3. Every interactive element (hand cards, hex cells, action buttons) has a visually distinct
   default, hover, focus, and disabled state, and the disabled/illegal state introduced by the
   engines in Tickets A1/A2 is visually obvious, not just functionally inert.
4. Key state changes (a card played, a token placed/overwritten/reinforced, a Muster count
   changing, the Breach being reached) get a simple, non-blocking CSS transition or animation —
   plain CSS only, no new animation dependency (see Dependencies & Risks) — and every such
   transition respects `prefers-reduced-motion` (no motion is also a fully correct, tested state).
5. Component tests added in C1–C4 still pass unmodified where they query by accessible role and
   label — this pass changes appearance and CSS classes, not DOM structure or accessible names,
   so no test should need to change to accommodate it. Where a test does need to change, it's a
   signal this ticket drifted into restructuring and should be scoped back.
6. `npm run lint`, `npm run typecheck`, and `npm test` stay green; no new console warnings or
   errors are introduced by the styling/animation changes.
7. The qualitative call — does it actually look decent — is the developer's, per CLAUDE.md's
   visual-judgement rule: this ticket's automated acceptance criteria (1–6) are the mechanical
   floor; final sign-off happens when the developer runs `npm run dev`, plays a battle, and agrees
   it reads as finished. This ticket is not closed by green tests alone.

## Scope Boundaries
**In scope:** CSS/styling pass across the four existing C1–C4 surfaces; a shared spacing and colour
token set; hover/focus/disabled states; simple `prefers-reduced-motion`-respecting transitions.
**Out of scope:** new components or structural/DOM changes (style existing markup, don't
restructure it); sourced image/art assets — still Ticket C5's call, and this ticket proceeds on
whatever C5 decided (CSS-drawn by default); any campaign-level theming, since no campaign exists in
this epic's scope.

## Dependencies & Risks
Depends on Tickets C1–C4 (needs the functional surfaces to polish) and C5 (needs the visual-
direction decision settled first, so this pass isn't guessing at art direction C5 was supposed to
own). Risk: it's tempting to reach for an animation/motion library to get transitions "for free" —
don't; this project deliberately holds at two runtime dependencies (`web-project.md`), and a third
needs a stated justification and the developer's yes, which is out of scope for a polish pass. Risk:
"looks decent" is inherently a judgement call (Acceptance Criterion 7) — don't let this ticket's
automated checks alone stand in for the developer actually looking at it.

## Design Assets
N/A — see Ticket C5 for any asset decision this pass builds on.
```

---

## Phase D — Integration, deploy, sign-off

### Ticket D1: Wire the end-to-end battle loop into the app shell

- **Type:** Story
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocked by:** A6, B1, B2, C1, C2, C3, C4, C6
- **Blocks:** D3
- **Skill:** react-frontend

**Description**

```
## Problem Statement
Every prior ticket builds one piece — this is the ticket where they all get mounted together behind
a single entry point, since the epic's scope is one battle with no map/campaign layer in front of it
(App.tsx today is still the placeholder scaffold noted in CLAUDE.md).

## User Story
As a player, I want to open the app and land directly in a playable battle against the CPU, so that
the full War Council → Muster → Clash → Breach loop is playable start to finish in one session.

## Acceptance Criteria
1. `App.tsx` (replacing the current placeholder) mounts the battle loop (Ticket A6) with both CPU
   opponents (B1, B2) and all UI surfaces (C1–C4, styled per C6) wired together, with no manual
   setup required to start a battle.
2. A player can complete an entire battle — one or more War Council rounds, Muster, Clash, and a
   final Breach — using only the UI, with no console errors during play.
3. All engines' legal-move constraints are enforced end-to-end through the UI (no illegal action
   reachable via a button click).
4. `npm run typecheck`, `npm run lint`, and the full `npm test` suite pass with everything wired
   together.

## Scope Boundaries
**In scope:** app-shell wiring only — every piece it wires already exists from prior tickets.
**Out of scope:** any new game logic or UI surface not already built in Phases A–C; deploy
(Ticket D2); final QA sign-off (Ticket D3).

## Dependencies & Risks
Depends on every ticket in Phases A, B, and C, including C6's polish pass — wiring an unpolished UI
together and polishing it after would mean touching every mount point twice. This is the true
integration point of the epic —
schedule it last before deploy/QA, and expect it to surface interface mismatches between pieces
built independently (same caution as Ticket A6, one level up).

## Design Assets
N/A
```

---

### Ticket D2: GitHub Pages deploy pipeline

- **Type:** Task
- **Priority:** Medium
- **Parent epic:** SCRUM-18
- **Blocked by:** (none — can be built any time; only needs `npm run build` to exist, which it
  already does)
- **Blocks:** D3
- **Skill:** react-frontend

**Description**

```
## Problem Statement
DoD item 5 requires "the build deploys to GitHub Pages and is playable via a shared link." Nothing
in `.github/workflows/ci.yml` today does a deploy — `web-project.md` confirms CI currently runs
install/lint/typecheck/test/build only, with no publish step.

## User Story
As the developer, I want the production build to deploy to GitHub Pages automatically (or via a
documented one-step trigger), so that the battle loop is playable via a shared link without a manual
publish process every time.

## Acceptance Criteria
1. A deploy job (extending `.github/workflows/ci.yml` or a new workflow) builds the app
   (`npm run build`) and publishes `dist/` to GitHub Pages.
2. `vite.config.ts`'s `base` path is set correctly for a GitHub Pages project-page URL (not root),
   or documented if a custom domain/root deployment is intended instead.
3. The deployed URL loads the app with no console errors and the battle loop is playable exactly as
   it is locally.
4. Per `web-project.md`'s Developer-owned work list, actually creating/confirming the GitHub
   repository, adding a remote, and pushing are **not** part of this ticket's automatable work —
   this ticket authors the workflow file and any config change; the developer performs the push and
   confirms the live Pages URL.

## Scope Boundaries
**In scope:** the deploy workflow and any `vite.config.ts` base-path change it requires.
**Out of scope:** pushing to the remote, creating the repository, or verifying the live CI run's
result (all developer-owned per `web-project.md` — no `gh` CLI access from an agent on this machine).

## Dependencies & Risks
No engineering dependencies on other tickets. Risk: this is a good candidate to schedule *early* in
parallel with Phase A/B/C, not saved for last — a broken deploy pipeline is cheap to catch against
the current placeholder `App.tsx` and expensive to debug for the first time under DoD deadline
pressure at the very end.

## Design Assets
N/A
```

---

### Ticket D3: Full-loop QA and Definition of Done sign-off

- **Type:** Task
- **Priority:** Highest
- **Parent epic:** SCRUM-18
- **Blocked by:** D1, D2
- **Blocks:** (none — closes the epic)
- **Skill:** none — this is a QA/verification pass, not new implementation

**Description**

```
## Problem Statement
SCRUM-18 names six explicit Definition of Done items. Nothing in Phases A–D checks all six together
in one pass — each prior ticket verifies its own slice, but the epic isn't done until someone plays
a real battle end-to-end on the deployed build and confirms every DoD item together.

## User Story
As the developer, I want a single verification pass against every Definition of Done item on
SCRUM-18, so that closing the epic reflects a genuinely playable, deployed battle loop and not just
green unit tests in isolation.

## Acceptance Criteria
1. DoD 1 — a player can play a full War Council round against the CPU: confirmed by actually
   playing one on the deployed build (or locally via `npm run dev`/`preview` if Pages isn't ready).
2. DoD 2 — the round's score correctly funds both sides' Muster (baseline + bonus): confirmed by
   observing the Muster HUD (Ticket C3) match the expected conversion for the actual score achieved.
3. DoD 3 — The Clash resolves to either a Breach or both Musters exhausted: confirmed by playing at
   least one battle to each outcome (or via Ticket A6's integration tests plus one manual playthrough
   of each).
4. DoD 4 — a battle ends in a clear win/loss for one side: confirmed via Ticket C4's win/loss screen
   appearing correctly for both a Player win and a CPU win.
5. DoD 5 — the build deploys to GitHub Pages and is playable via a shared link: confirmed by opening
   the actual deployed URL and playing a battle there, not just locally.
6. DoD 6 — typecheck/lint/test gates are green, no console errors during play: confirmed by running
   `npm run typecheck; npm run lint; npm test; npm run build` all green, and checking the browser
   console during a full manual playthrough (per `web-project.md`, this is exactly the kind of check
   the `chrome-devtools`-driving QA path exists for).

## Scope Boundaries
**In scope:** verification against the six stated DoD items only.
**Out of scope:** fixing anything this pass finds broken — if a DoD item fails, that's a new Bug
ticket linked back to SCRUM-18 and to whichever Phase A–D ticket owns the failing piece, not scope
creep into this ticket.

## Dependencies & Risks
Depends on Tickets D1 (wired app) and D2 (live deploy). This is deliberately the last ticket in the
epic — closing it is equivalent to closing SCRUM-18 itself.

## Design Assets
N/A
```

---

## Self-review

**Coverage against the epic's own Scope/Deliverables/DoD:**
- War Council rules engine + card UI → A1, C1.
- Vanguard board engine + hex UI → A2, C2.
- Muster conversion linking the two phases → A3.
- The Clash (alternation + uncontested leftover) → A4.
- The Breach win condition → A5.
- Baseline CPU for both phases → B1, B2.
- GitHub Pages deploy of the static build → D2.
- Battle-loop orchestration and persistence across rounds → A6.
- HUD/legibility for Muster and turn state (a named risk in `concept-critique.md`, not itself a DoD
  line, but load-bearing for DoD 2–4 being *checkable* by a human) → C3, C4.
- Foundational module structure (CLAUDE.md's explicit "no architecture chosen yet") → A0.
- Visual/graphics judgement calls flagged, not silently decided → C5, C6.
- Final sign-off against all six DoD items together, not just per-ticket → D3.

**Explicitly excluded, matching the epic's Out of scope list:** campaign map / multiple cities, card
special/goal/poison modules, search-based AI (both CPUs are stated as heuristic-only), Vanguard
stalemate/tiebreak handling.

**Open design questions surfaced but not resolved here** (each ticket above states its own default
rather than blocking): who opens The Clash each round (A4), whether unspent moves are lost (A4),
dealer alternation across a battle boundary that doesn't exist yet in this epic's scope (A1/A6),
Treasure-7s mid-round bonus (A1 — deferred, base band only), card/token visual direction (C5).
