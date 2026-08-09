# DLR-46 — epic breakdown (ticket-creation worklist)

> **This file is a ticket-creation worklist, not an `/fb-plan` implementation contract.**
> It has no `^Status:` line and is never walked by `/fb-apply`. It exists to be reviewed by the
> developer and then handed to `/management-jira`, which creates every ticket below and wires the
> `Blocks` links from the sequencing diagram. Each created ticket then gets its own `/fb-plan`
> contract folder in the normal way.

**Epic:** DLR-46 — *The Hunt — playable run prototype: clear the 5th Demand to win*
**Project:** DLR (DeLorean 1.21), team-managed
**Design source:** `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` (read in full,
§1–§12), read alongside `balatro.md`, `forbidden-solitaire.md`, `.docs/game_rules/fox-in-the-forest.md`
**Ticket count:** 16

---

## Decomposition notes

**Checklist coverage** (`jira-epic-decomposition` Phase 3), stated so gaps are visible rather than
silent:

| Category | Covered by | Note |
|---|---|---|
| 1. Foundational scaffold | T1 (demolition), T2 (config + Hunt types) | T1 is the developer's added first task |
| 2. Core domain/rules logic | T3, T4, T5, T9, T11, T13 | |
| 3. Autonomous / reactive behaviour | T5 (round-long rule-break), T6 (intent telegraph), T13 (remaining four characters) | Ambition level stated per ticket: the CPU stays the existing legal-move-respecting heuristic in `cpuPlayer.ts`; **no search, no evaluation function, no difficulty scaling** |
| 4. User-facing interface | T7 (Hunt screen), T10 (run shell), T12 (Forage screen) | |
| 5. Visual / experience polish | T15 | |
| 6. Integration | T14 | Scheduled last among build work |
| 7. Deploy / release | **Excluded by the epic's own Deliverables** — "launchable with `npm run dev`". No deploy workflow exists on this branch (`.github/workflows/` holds `ci.yml` only; DLR-35's Pages pipeline is not on `Balatro-Forbidden-Solitaire`). CI-green is folded into T1's AC instead of inventing a ticket. **Flagged to the developer at the gate.** |
| 8. Verification & sign-off | T16 | Checks the epic's DoD as a whole; T8 separately gates §11's kill criterion |

**Two pause tickets, deliberately.** T8 (§11 kill-criterion playtest) and T16 (DoD sign-off +
band-distribution measurement) are *developer-owned judgement*, not agent work. T8 is a real gate:
if its kill criterion fires, T9–T16 are cancelled, not tuned.

**State a default, don't stall.** Every §9-undecided number below is implemented as a named
constant in T2's config module at a stated provisional value. None of those values is a decision
this breakdown makes — they are placeholders chosen so the prototype is playable before tuning,
and every one is retunable without a code change. The two that genuinely change the *shape* of the
game (card base values, the Demand curve) carry an explicit "confirm before T9" note.

**Reject conditions scanned:** `.claude/rules/` is empty (`README.md` only). Nothing applies.

---

## Sequencing diagram

```
PHASE 0 — DEMOLITION
  T1  Strip Vanguard + battle loop back to the War Council core
        │
        ▼
PHASE 1 — FOUNDATIONAL SCAFFOLD
  T2  Hunt config module + Hunt domain types
        │
        ├──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
PHASE 2 — CORE DOMAIN (the §11 slice engine — four small additions)
  T3 Spoils        T4 Standing ×    T5 Round-long   T6 Intent
  (captured        Demand check     rule-break      telegraph
   card value)     (needs T3)       (Monarch)       (split CPU move)
        │              │              │              │
        └──────────────┴──────┬───────┴──────────────┘
                              ▼
PHASE 3 — THE SLICE, PLAYABLE
  T7  The Hunt screen (full-viewport, no-scroll)
                              │
                              ▼
  T8  §11 SLICE PLAYTEST — KILL CRITERION GATE   ◄── developer-owned
                              │        (if it fires: STOP. T9–T16 are cancelled.)
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
PHASE 4 — RUN SCAFFOLD                    PHASE 6 — REMAINING CAST
  T9  Run state machine                     T13 Witch, Woodcutter,
        │                                        Fox, Swan rule-breaks
        ▼                                           │
  T10 Run shell UI                                  │
        │                                           │
        ▼                                           │
PHASE 5 — OUTER LOOP                                │
  T11 Forage domain                                 │
        │                                           │
        ▼                                           │
  T12 Forage screen + landed-edit readout           │
        │                                           │
        └─────────────────┬─────────────────────────┘
                          ▼
PHASE 7 — INTEGRATION & POLISH
  T14 Integration — run → Hunt → Forage as one whole
                          │
                          ▼
  T15 Visual / experience polish pass
                          │
                          ▼
PHASE 8 — SIGN-OFF
  T16 Epic DoD verification + Standing-band measurement   ◄── developer-owned
```

**Blocks links to create** (blocker → blocked):

```
T1  → T2
T2  → T3, T4, T5, T6
T3  → T4
T3  → T7 ;  T4 → T7 ;  T5 → T7 ;  T6 → T7
T7  → T8
T8  → T9, T13
T9  → T10
T10 → T11
T11 → T12
T12 → T14 ;  T13 → T14
T14 → T15
T15 → T16
```

---

# T1 — Strip the Vanguard and battle-loop layers back to the War Council core

- **Type:** Task
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** —
- **Blocks:** T2
- **Skill:** `react-frontend`

## Problem Statement

`src/` currently holds two games. The Fox in the Forest trick-taking engine (`src/warCouncil/`) is
the substrate DLR-46 builds on and §11's inventory confirms it ships tested. Everything else on
disk — the hex-board network-growth mechanic (`src/vanguard/`, `src/app/vanguard/`), the
orchestration layer that alternates the two (`src/battle/`, `src/app/battle/`), and the app shell
that mounts them (`src/App.tsx`, `src/app/appMode.ts`, `src/app/vanguardMount.ts`) — implements the
project's previous design direction, which DLR-45 retired at the documentation layer without
touching the code.

Leaving it in place is not neutral. It is roughly 70 of 142 source files that every reviewer reads,
every `npm test` run executes, and every future contract's file-scope has to route around; and
`CLAUDE.md`'s naming table still sends a reader of a Fox in the Forest layer to Vanguard
vocabulary. The new work in this epic touches `src/warCouncil/`'s state shape (T3 adds captured
cards, T5 adds a round-long rule-break) — and `src/battle/` and `src/app/battle/` consume that
shape, so they would have to be maintained through changes made for a game they are not part of.

## User Story

As the developer, I want the repository stripped to the War Council engine and a single mounted
round, so that every DLR-46 ticket after this one builds on one game instead of editing around a
retired one.

## Acceptance Criteria

1. These paths no longer exist: `src/vanguard/`, `src/app/vanguard/`, `src/app/vanguardMount.ts`,
   `src/battle/`, `src/app/battle/`, `src/app/appMode.ts`, `src/app/__tests__/appMode.test.ts`.
2. `src/App.tsx` mounts a single War Council round directly — it deals a fresh round via
   `src/warCouncil/deal.ts` and renders `src/app/warCouncil/WarCouncilRound.tsx` — and
   `npm run dev` opens a playable 13-trick round with no console error.
3. `src/app/tricksWon.ts` and its test are deleted. `TRICKS_PER_ROUND` is consolidated into
   `src/warCouncil/` as a single exported constant and the two places that currently assert 13
   inline (`src/warCouncil/playCard.ts`, `src/warCouncil/deal.ts`) read it, closing the follow-up
   that file's own header comment records. `isValidTricksWon` is deleted outright — its only
   consumers were the Vanguard trick-entry form and match reducer.
4. `src/app/index.ts` re-exports only what survives; no export in it resolves to a deleted file.
5. `.docs/implementation/vanguard.md`, `vanguard-ui.md`, `battle.md`, and `battle-ui.md` are
   deleted; `.docs/implementation/README.md`'s module table lists only surviving modules and its
   closing prose no longer describes a battle loop; `.docs/implementation/app.md` no longer
   documents `AppMode`, the trick-count validator, or the Vanguard mount contract.
6. `.docs/game_rules/vanguard.md` is deleted.
7. `CLAUDE.md`'s "Game naming — the retained POC's vocabulary" section is removed, and its
   "Project state" section's file/module counts are corrected to what is actually on disk after
   this ticket. **Adding §10's new Hunt vocabulary to `CLAUDE.md` is explicitly NOT part of this
   ticket** — the epic routes that to a separate follow-up, pending the developer red-lining §10.
8. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`
   are all green, and the CI workflow (`.github/workflows/ci.yml`) passes on the branch. Report
   the test count before and after so the drop is visible and attributable to deletion only.
9. No file under `src/warCouncil/` or `src/app/warCouncil/` changes behaviour. The only permitted
   edits there are the `TRICKS_PER_ROUND` consolidation in AC 3 and import-path fixes.

## Scope Boundaries

**In scope:**

- Deleting the Vanguard engine, Vanguard UI, battle-loop engine, and battle UI modules
- Rewiring `src/App.tsx` and `src/app/index.ts` to the surviving War Council mount
- Consolidating `TRICKS_PER_ROUND` into `src/warCouncil/`
- Retiring the four implementation docs, the Vanguard rules doc, and `CLAUDE.md`'s Vanguard
  vocabulary section
- Confirming all five gates and CI are green afterwards

**Out of scope:**

- Any new Hunt behaviour — Spoils, Standing, the Demand, Forage, the telegraph. All of that is T2
  onward. This ticket only removes and rewires.
- Adding §10's Hunt vocabulary to `CLAUDE.md` (separate follow-up, per the epic)
- Refactoring, renaming, or restructuring `src/warCouncil/` beyond AC 3 and AC 9
- Deleting `src/styles/global.css` or any War Council CSS
- Rewriting git history. Everything deleted stays recoverable via
  `git show <commit>:<path>` per `CLAUDE.md`.

## Dependencies & Risks

- **Blocks every other ticket in this epic.** Nothing else starts until this lands.
- **`src/app/warCouncil/WarCouncilRound.tsx` takes `WarCouncilMountProps` from
  `src/app/warCouncilMount.ts`**, whose `onComplete` currently feeds `BattleHost`. After deletion
  `App.tsx` becomes that callback's only consumer — the default is a plain "round over, deal
  again" restart, replaced by the real run loop in T9/T10.
- **Risk: over-deletion.** `src/app/warCouncil/` (nine components, six test files) is the UI this
  epic keeps and extends. A grep-for-`battle` sweep will hit `roundReducer.ts` comments and must
  not delete them. AC 9 is the guard.
- **Risk: recoverability.** This deletes ~70 files. Nothing is force-pushed and no branch is
  deleted, so `git show <commit>:<path>` restores any of it; the pre-deletion commit SHA should be
  recorded in the contract's summary.
- **Default taken:** `.docs/game_rules/vanguard.md` is deleted rather than archived, matching how
  DLR-45 retired the superseded design tree. Reversible via git.

## Design Assets

N/A — deletion and rewiring only. The surviving screen is unchanged from
`.docs/implementation/war-council-ui.md`.

---

# T2 — Hunt configuration module and Hunt domain types

- **Type:** Task
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T1
- **Blocks:** T3, T4, T5, T6
- **Skill:** `react-frontend`

## Problem Statement

DoD 8 requires that a search of `src/` finds no hard-coded Standing multiplier, Demand value, or
Forage budget. §9 is explicit that no number in it is a chosen value, and §11 states the
requirement precisely: the configurable band table "has to be true from the first commit, because
the slice is where the Humble-multiplier question gets measured." §6 has already proved one printed
value wrong — Victorious dominates Humble by construction at ×6, break-even ×18 — so a
transcribed constant would bake in a number the design has disproved.

Today `src/warCouncil/scoring.ts`'s `tricksToPoints` hard-codes the printed six. Every downstream
ticket needs somewhere to read from before it can avoid repeating that mistake, and every
downstream ticket needs the shared Hunt/run vocabulary (§10) to exist as types before it can plug
into it.

## User Story

As the developer, I want every tunable number in one editable module and the Hunt's vocabulary in
one type file, so that playtesting changes a value in one place and no ticket after this one has to
invent an incompatible shape.

## Acceptance Criteria

1. A configuration module exists (`src/hunt/config.ts` or equivalent under a new `src/hunt/`
   module) exporting, as named constants with a one-line comment each citing its §9 row:
   the Standing band table (boundaries **and** multipliers), card base values, the Demand curve
   (base and growth), the Forage budget per encounter, and encounters per run.
2. The Standing table is a data structure of `{ minTricks, maxTricks, name, multiplier }` — band
   *boundaries* and band *values* separately editable, because §1 fixes the boundaries and §9
   reopens the values.
3. Provisional values are set to: Standing ×6 / ×1 / ×2 / ×3 / ×6 / ×0 (Humble / Defeated 4,5,6 /
   Victorious / Greedy), card base value = **printed rank**, Forage budget = **4**, encounters per
   run = **5**. Each carries a comment marking it provisional and naming §9's stated measurement.
   These are placeholders, not decisions — see Dependencies & Risks.
4. A Hunt types file exports the §10 vocabulary as types: `Hunt`, `Quarry`, `Spoils`, `Standing`,
   `Demand`, plus `QuarryCharacter` as a union of the five odd-rank characters. No `Snare` type —
   §3's in-round layer is blocked and out of scope for this epic.
5. A single exported function resolves a trick count to its Standing band and multiplier by
   reading the table, and is the only place in `src/` that does so.
6. Vitest coverage proves: every trick count 0–13 resolves to exactly one band; the table has no
   gap and no overlap across 0–13; and changing a multiplier in the config changes the resolved
   value with no other edit.
7. Nothing in this ticket changes runtime behaviour of the existing round — `scoring.ts`'s
   `tricksToPoints` is migrated to read the table in T4, not here.
8. `npm run typecheck`, `npm run lint`, and the scoped Vitest run are green.

## Scope Boundaries

**In scope:**

- One configuration module holding every §9 value
- One types file holding §10's vocabulary
- The band-resolution function and its tests

**Out of scope:**

- Applying any of these values to gameplay — T3 (Spoils), T4 (Standing/Demand), T11 (Forage)
- A settings UI, a debug panel, or any runtime way to edit config. It is edited in source and the
  page is reloaded; that is sufficient for a prototype and adds no scope.
- Persisting config to disk or localStorage
- §3's in-round edit layer (Snare) — out of scope for the whole epic

## Dependencies & Risks

- **Blocked by T1** — needs a single-game repo to add a module to.
- **Blocks the four slice-engine tickets** (T3–T6), all of which read from it.
- **The provisional values in AC 3 are defaults stated so the prototype is playable, not decisions.**
  Two of them change the *shape* of the game and should be confirmed by the developer before T9
  builds the Demand curve on them:
  - **Card base value = printed rank.** Chosen over flat 1 because §3 and §9 both state that at
    flat 1, `Spoils = 2k` and `Score = Spoils × Standing` collapses to the single-variable function
    `2k × f(k)` — the equation has no genuine second axis. Rank weighting is what makes the two
    terms independent, which is the design's central claim. Consequence: the ceiling stops being a
    fixed 108 and becomes deal-dependent, ~650 typical and ~918 best case, so **T9's Demand curve
    must be plotted against the rank-weighted ceiling, not 108.**
  - **Standing multipliers left at the printed six.** §6 proves Humble ×6 is dominated and computes
    ×18 as break-even. The printed value is kept as the *starting* value only so the first
    measurement is taken against the transcription, per §9's stated method; expect it to move.
- **Risk:** a config module is only load-bearing if every downstream ticket actually reads it. Every
  ticket T3–T13 below carries an AC forbidding a hard-coded tunable, and T16 verifies DoD 8 by
  search.

## Design Assets

`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` §9 (the value table and each row's
measurement), §10 (vocabulary), §1 (band boundaries).

---

# T3 — Spoils: sum the value of captured cards

- **Type:** Story
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T2
- **Blocks:** T4, T7
- **Skill:** `react-frontend`

## Problem Statement

Spoils is the additive term of §1's equation — the summed value of the cards you captured in
tricks. §11's inventory names it as the first of four genuinely new things: the engine currently
tracks `tricksWon` as a count and discards the cards inside each trick when it resolves. Without
the captured cards retained, Spoils cannot be computed at all, and neither can the Demand check
that T4 builds on it.

This is deliberately small — §11 calls it "a small addition over trick resolution's existing
output, not a new subsystem" — but it is a change to `RoundState`'s shape, so it must land before
anything reads it.

## User Story

As a player, I want the cards I capture to add up to a score, so that winning a trick with high
cards is worth more than winning one with low cards and the round has something to build toward
beyond a trick count.

## Acceptance Criteria

1. `RoundState` retains the captured cards per side — a per-side list of the `Card`s taken in
   tricks that side won — alongside the existing `tricksWon` count, which is unchanged.
2. `playCard.ts` appends both cards of a resolved trick to the winner's captured list, in trick
   order, every trick.
3. A `spoils(state, side)` function returns the summed value of that side's captured cards, reading
   each card's base value from **T2's config**, never from a literal.
4. Poison 8s subtract and Treasure 7s add, per `fox-in-the-forest.md` and §1's component table:
   the trick's winner loses 1 per Poison in the trick and gains 1 per Treasure in it. Both are
   folded into `spoils`, not into a second number.
5. Invariant test: across a full 13-trick round, the two sides' captured lists together hold
   exactly 26 cards, with no card appearing twice and none missing.
6. Test: under a flat card value of 1, `spoils(state, side) === 2 × tricksWon[side]` — §3's stated
   identity, which is the cheapest proof the summation is correct.
7. Test: under the config's rank-weighted default, a hand-built round with a known capture set
   produces the hand-computed Spoils, including the Poison and Treasure adjustments.
8. Scoped Vitest run and `npm run typecheck` are green. No existing War Council test is weakened
   to accommodate the new field.

## Scope Boundaries

**In scope:**

- Retaining captured cards in `RoundState`
- The `spoils` function and Poison/Treasure adjustment
- Tests for the above

**Out of scope:**

- Standing, the Demand, `Score = Spoils × Standing` — T4
- Displaying Spoils on screen — T7
- Negative card values (§6 exit b) — undecided in §9, explicitly out of the epic's scope
- Forage edits to card value — T11

## Dependencies & Risks

- **Blocked by T2** (reads card base values from config). **Blocks T4** (which multiplies Spoils by
  Standing) and **T7** (which displays it).
- **Risk: `RoundState` shape change ripples.** After T1 the consumers are `src/warCouncil/` and
  `src/app/warCouncil/` only, which is why T1 is sequenced first — doing this before the demolition
  would have meant maintaining the same change through `src/battle/`.
- **Default taken:** captured cards are stored as a flat per-side list rather than grouped by
  trick. Grouping would support a per-trick replay view that nothing in this epic asks for; a flat
  list is what `spoils` needs. Reversible — the grouping can be added later without changing
  `spoils`'s signature.
- **Note:** Treasure/Poison are already implemented as scoring concepts in the base rules doc but
  the current engine scores on trick count alone, so AC 4 is new behaviour, not a port.

## Design Assets

§1 (component table — Treasure and Poison as Spoils interventions), §3 (the `Spoils = 2k`
identity), §11 (Spoils named as new work). `.docs/game_rules/fox-in-the-forest.md` → Poison cards.

---

# T4 — Standing from the band table, and `Score = Spoils × Standing` against the Demand

- **Type:** Story
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T2, T3
- **Blocks:** T7
- **Skill:** `react-frontend`

## Problem Statement

§1's equation is the whole of this game's scoring vocabulary, and it is evaluated once per Hunt
against the Demand. Two things are missing. First, `scoring.ts`'s `tricksToPoints` hard-codes the
printed multipliers and returns a *score*, not a *multiplier* — it must be migrated to read T2's
table so §9's live decision is measurable. Second, the Demand does not exist: §11 names it as new
but "pure arithmetic; no new game state beyond one number."

Until both land, a Hunt has no outcome. There is nothing to clear and nothing to miss.

## User Story

As a player, I want my round scored as Spoils multiplied by the band my trick count landed in, and
checked against a target, so that overreaching costs me the whole round's Spoils and I have a
number to play toward.

## Acceptance Criteria

1. `scoring.ts` reads the Standing band and multiplier from **T2's resolver**. No multiplier
   literal survives anywhere in `src/`.
2. A `scoreHunt(state, side)` function returns `{ spoils, tricks, band, standing, score }` where
   `score === spoils × standing`, computed once — not accumulated per trick.
3. A `checkDemand(score, demand)` function returns a cleared/missed result. The Demand is passed
   in; this ticket does not decide, store, or advance it — that is T9's run state.
4. Test: the full `2k × f(k)` table from §3 reproduces exactly under a flat card value of 1 — all
   fourteen values of `k`, `k=9` peaking at 108 and `k=10..13` scoring 0. This is the regression
   test that the equation matches the design's own derivation.
5. Test: raising the Humble multiplier to ×18 in config makes `k=3` also score 108 under flat
   values — §6's computed break-even — with no code change outside config. This proves the table is
   genuinely live.
6. Test: Greedy (×0) zeroes a round with maximal Spoils.
7. Test: `checkDemand` is exclusive-or-inclusive at the boundary in exactly one stated way — a
   score exactly equal to the Demand **clears** it. Stated as a default, documented in the summary.
8. Nothing in this ticket assumes a run, an encounter index, or more than one Demand.
9. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- Migrating `tricksToPoints` to the config-read band resolver
- `scoreHunt` and `checkDemand`
- The §3 table as a regression test

**Out of scope:**

- The Demand *curve* across encounters — T9
- Showing score, band, or Demand on screen — T7
- Scoring the Quarry. §8 establishes the Quarry does not score; only the player's side is scored,
  and building a second Standing would contradict the design.
- Any surplus-Spoils reward for overshooting the Demand (§12 smaller findings — unresolved, and
  §9 treats the Demand's shape as undecided)

## Dependencies & Risks

- **Blocked by T2** (band table) and **T3** (Spoils). **Blocks T7.**
- **Risk: the §3 table is stated for flat card values, but T2's default is rank-weighted.** AC 4
  therefore runs with a flat-value config override, which is itself a proof the config is
  swappable. This is deliberate, not an inconsistency — §3 states the ceiling argument holds "for
  the flat-value rule and must be recomputed if that fork is decided the other way."
- **Default taken (AC 7):** `score >= demand` clears. Reversible one-line change; flagged rather
  than assumed silently.
- **Open, not decided here:** whether Greedy ×0 reads as proportionate or as a null round (§9's
  second live row). T16 records the measurement; this ticket only makes it measurable.

## Design Assets

§1 (the equation), §3 (the `2k × f(k)` table and the 108 ceiling), §6 (the ×18 break-even), §9
(Standing multipliers row).

---

# T5 — The Quarry's round-long rule-break: the mechanism, plus the Monarch

- **Type:** Story
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T2
- **Blocks:** T7
- **Skill:** `react-frontend`

## Problem Statement

§4 is where the escalation vocabulary lives: each encounter takes one of the deck's odd-rank
characters and turns its printed ability on for the entire round rather than for the single card
that prints it. §11 names this as new engine logic — "every constraint in `legalMoves.ts` and every
ability in `abilities.ts` is scoped to the single card that carries it."

It is also the design's answer to its own most likely balance failure. §8's residual risk and §12's
Problem 1 both name Quarry pressure as the only thing stopping "aim for 7–9 every Hunt" from being
a fixed answer. Without a round-long rule-break the slice cannot test that at all, and §11's kill
criterion has nothing to fire against.

## User Story

As a player, I want the Quarry to break one rule for the whole round, so that the trick count I can
actually reach is pushed away from the band I am aiming for and choosing a band is a decision
rather than a default.

## Acceptance Criteria

1. A round-long rule-break is a first-class part of round state — one `QuarryCharacter` per Hunt,
   set at deal time, applying for all 13 tricks, never toggling mid-round.
2. `legalMoves.ts` consults the active rule-break when generating legal moves, and the existing
   single-card abilities in `abilities.ts` are unchanged — the round-long version is an additional
   condition, not a replacement.
3. **The Monarch (11)** is implemented: its follow constraint fires every time the Quarry leads a
   suit the player holds, for the whole round — a player holding cards of the lead suit must play
   their Swan (1) of that suit or their highest card of it. Per §4, the liability is real: a player
   who has already shed both cards of a suit is unconstrained in it.
4. Test: with the Monarch active, a hand holding the Swan and the highest card of the lead suit
   yields exactly those two as legal; shedding both makes every card of that suit legal again.
5. Test: with no character active, `legalMoves` returns exactly what it returns today — the
   existing legal-move test suite passes unchanged.
6. Test: the rule-break constrains the **player**, and the existing CPU (`cpuPlayer.ts`) continues
   to play only legal moves under it, across a full simulated round, without stalling or throwing.
7. The character and its rule-break are exposed as data — a name and a one-sentence player-facing
   description — so T7 can display it without restating the rule in the UI layer.
8. Any numeric aspect of a rule-break reads from **T2's config**; nothing tunable is inline.
9. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- The round-long rule-break mechanism in round state and legal-move generation
- One character — the Monarch (11) — implemented end to end
- The player-facing description data for T7 to render

**Out of scope:**

- **The other four characters (Witch, Woodcutter, Fox, Swan) — T13.** One character is sufficient
  for the slice: §11 states explicitly that "which of the five is not load-bearing for the test."
  Building all five before the kill criterion has fired would be four tickets of work at risk.
- Choosing which character appears in which encounter — T9's run scheduling
- Displaying the rule-break on screen — T7
- Any CPU strategy change. **Ambition level, stated:** the Quarry remains
  `cpuPlayer.ts`'s existing heuristic — legal moves only, prefers winning a trick cheaply. **No
  search, no evaluation function, no difficulty tiers, no learning.** Escalation comes from the
  rule-break, per §4's explicit rejection of "a neutral strong player" as a difficulty slider.

## Dependencies & Risks

- **Blocked by T2.** **Blocks T7.**
- **Risk: the Monarch's constraint can, in principle, interact badly with an empty legal-move set.**
  AC 6 exists to catch it — a round-long constraint that ever yields zero legal moves is a hard
  defect, not a tuning problem. The constraint narrows to two cards and only when the player holds
  the suit, so it should not, but it must be proven rather than argued.
- **Risk: this is the ticket §12 Problem 1 and Problem 2 are both downstream of.** Strengthening
  Quarry pressure worsens the "dead run" variance. This ticket implements the Monarch at §4's
  printed strength and changes nothing else; the joint measurement §12 asks for is T16's.
- **The Monarch is chosen over the other four** because its rule-break lands on the follow-suit
  obligation — the input §8 identifies as "the entire tension of a trick-taker" — so it is the
  character most likely to make the kill criterion informative.

## Design Assets

§4 (the cast, the Monarch worked example, the visibility table), §5 (the five inputs the Quarry
attacks), §11 (named as new engine logic). `.docs/game_rules/fox-in-the-forest.md` → Suit card
reference.

---

# T6 — The intent telegraph: split the CPU's move into intent and commit

- **Type:** Story
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T2
- **Blocks:** T7
- **Skill:** `react-frontend`

## Problem Statement

§4's visibility table makes the Quarry's next-trick intent telegraphed, and the reason is the
epic's headline risk, not a convenience: `forbidden-solitaire.md` §5/§10.5 argues telegraphing
converts an opponent from a die roll resolved after you commit into information you plan around.
DoD 6 requires the intent visible before the player commits, every trick.

§11 names the obstacle precisely: "`chooseCpuMove` computes and returns a completed move in one
call. Telegraphing needs that single call split into a visible 'intent' step and a later 'commit'
step." Without the split there is nothing to show, and §11's kill criterion — which turns on
whether a playtester *visibly plans a lead or a follow around the telegraph* — cannot be run.

## User Story

As a player, I want to see what the Quarry intends to do next before I commit my card, so that a
trick is a decision I plan around information rather than a coin flip resolved after I have
already chosen.

## Acceptance Criteria

1. The CPU's move selection is split into two steps: a pure `quarryIntent(state)` that computes and
   returns what the Quarry will do without mutating state, and a commit step that plays it.
2. The intent is stable — computing it twice on the same state returns the same move — so it can be
   rendered, re-rendered under StrictMode's double-invoke, and then committed without changing.
3. The intent is available for both cases: when the Quarry leads a trick, and when the Quarry
   follows the player's lead.
4. The telegraph exposes intent at a **stated fidelity**, not the raw card. Default taken: the
   Quarry's intent is surfaced as its *shape* — lead suit and whether it is pressing to win or
   ducking — not the exact card, because §4's table keeps the Quarry's hand hidden and naming the
   card would reveal a card from it. Documented in the summary; the fidelity constant lives in
   **T2's config** so it can be widened or narrowed without a code change.
5. Committing plays exactly the move the intent described — a test proves intent and committed move
   never disagree across a full simulated round.
6. The existing `cpuPlayer.ts` behaviour is preserved: the same move is chosen as before the split,
   proven by running the existing CPU test suite unchanged.
7. The split introduces no timer, no `setTimeout`, and no effect — the intent is derived from state,
   per the existing round's effect-free design.
8. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- Splitting move selection into intent and commit
- The intent's shape and stability guarantees
- Preserving existing CPU choice behaviour exactly

**Out of scope:**

- Rendering the telegraph — T7
- Changing what the CPU chooses. This is a restructure, not a strategy change.
- Revealing the Quarry's hand, its card count by suit, or anything else §4's table marks hidden
- Animating or pacing the reveal — T15

## Dependencies & Risks

- **Blocked by T2** (config, for the fidelity constant). **Blocks T7.**
- **Risk: AC 4's fidelity is a feel judgement the design does not settle.** Too vague and the
  telegraph is decorative; too precise and it leaks the hidden hand §4 preserves. The default above
  is the conservative reading of §4's table. **This is the single value most likely to need
  changing after T8's playtest**, which is exactly why it is a config constant rather than a code
  path.
- **Risk: stability under React 19 StrictMode.** The existing `WarCouncilRound` is deliberately
  effect-free and its reducer initializer pure; AC 2 and AC 7 keep the telegraph inside that
  discipline rather than reaching for an effect.

## Design Assets

§4 (visibility table, the honest caveat), §11 (the telegraph named as new work, and the kill
criterion that depends on it), `forbidden-solitaire.md` §5 / §10.5.

---

# T7 — The Hunt screen: play a full 13-trick Hunt against a telegraphing Quarry

- **Type:** Story
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T3, T4, T5, T6
- **Blocks:** T8
- **Skill:** `react-frontend` + `game-ux`

## Problem Statement

T3–T6 deliver §11's four engine additions, but none of them is playable. §11's slice is defined by
what a player can see and do: one Hunt, one Quarry with one round-long rule-break, the intent
telegraphed every trick, `Spoils × Standing` against one fixed Demand, and a visible cleared/missed
outcome. The existing War Council round screen (`src/app/warCouncil/`) renders a trick-taking round
and nothing else — no Spoils, no Standing band, no Demand, no Quarry character, no telegraph.

This is the ticket that makes the epic's headline risk testable. Everything before it is
infrastructure for it; everything after it is gated on what it reveals.

## User Story

As a player, I want a single screen where I can see the Demand I am chasing, what I have captured
so far, which band my trick count is in, what rule the Quarry is breaking, and what it intends to
do next — so that every card I play is a decision made with the information the design promises.

## Acceptance Criteria

1. A Hunt screen renders a full 13-trick round end to end, playable with mouse and keyboard, and
   reaching a cleared or missed outcome.
2. Persistently visible during play, per §4's visibility table: the current Demand; running Spoils;
   current trick count and the Standing band it currently sits in; the Quarry's trick count; the
   Quarry's character and its round-long rule-break in plain language.
3. The Quarry's next-trick intent is shown **before the player commits, every trick** — both when
   the Quarry leads and when it follows (DoD 6).
4. The end-of-Hunt panel shows the score as its parts — `Spoils × Standing = Score` — then the
   Demand and a cleared/missed verdict. The arithmetic is shown, not just the result, because §1's
   whole claim is that the equation is legible.
5. Full-viewport, no-scroll, per `game-ux`'s `references/full-viewport-layout.md`. The page body
   never scrolls at any supported viewport size.
6. Component tests query by accessible role and label. The telegraph, the Demand, the band, and the
   rule-break each have an accessible name a screen reader reaches.
7. Every number on screen derives from T2's config through T3/T4's functions. No layout constant,
   multiplier, or Demand value is hard-coded in a component.
8. Functional defaults are shipped and **visual judgement is explicitly deferred to T15** — the
   screen must be legible and complete, not finished-looking.
9. `npm run typecheck`, `npm run lint`, and the scoped Vitest run are green, and the screen has
   been driven in a real browser with no console error.

## Scope Boundaries

**In scope:**

- The Hunt screen and its persistent status surfaces
- The intent telegraph's presentation
- The end-of-Hunt scoring panel with the equation shown as parts
- Extending `src/app/warCouncil/` rather than rebuilding it

**Out of scope:**

- The run — encounter progression, the Demand curve, victory/defeat screens. T9/T10. This screen
  takes **one fixed Demand** from config.
- Forage — T11/T12
- Visual polish, motion, colour work — T15
- The other four Quarry characters — T13
- Revealing anything §4's table marks hidden

## Dependencies & Risks

- **Blocked by all four slice-engine tickets.** **Blocks T8**, the kill-criterion gate.
- **Risk: file size.** `src/app/warCouncil/WarCouncilRound.tsx` is already a substantial component
  and this ticket adds four persistent readouts to it. The 400-line blocking limit applies —
  measure with `(Get-Content <file> | Measure-Object -Line).Lines`, and split into child components
  rather than growing the round component.
- **Risk: information density.** §4 makes six things simultaneously visible. `game-ux`'s zoning and
  interaction-cost guidance governs the arrangement; if it cannot be laid out without scrolling at
  a normal viewport, that is a finding worth raising rather than working around with a scroll pane.
- **Pause condition — visual judgement.** Layout that is *legible* is this ticket's; layout that is
  *good* is the developer's, and is T15. Do not block this ticket on aesthetic sign-off.

## Design Assets

§4 (visibility table), §1 (the equation, shown as parts), §11 (what is in the slice and what is
out). `.claude/skills/game-ux/SKILL.md` and its `references/full-viewport-layout.md`.

---

# T8 — §11 slice playtest: run the kill criterion

- **Type:** Task
- **Priority:** Highest
- **Parent:** DLR-46
- **Blocked by:** T7
- **Blocks:** T9, T13
- **Skill:** `none` — this is a developer-run playtest and a judgement call, not code

## Problem Statement

§4's honest caveat and §11 both state the same thing: whether the base game's read-the-opponent
drama survives when the opponent is a CPU is not answerable on paper. §11 exists to answer it, and
names the condition for abandoning this direction rather than tuning it. DoD 10 requires the
criterion to have actually been run, by someone who has not read the design document, with their
verdict recorded on the ticket.

This is a gate, not a checkpoint. Everything from T9 onward — the run, Forage, four more
characters, polish — is built on the premise this test exists to falsify. Running it after that
work would be running it too late to be worth running.

## User Story

As the developer, I want the slice played by someone who has never read the design, so that I find
out whether a trick is a live decision before I build four more tickets of outer loop on the
assumption that it is.

## Acceptance Criteria

1. The slice is played by at least one person who has not read
   `hybrid-design.md`, across **several playthroughs, not one** (§11 is explicit on the sample).
2. Recorded per playthrough: whether the playtester read the telegraph, whether they visibly
   planned a lead or a follow around it, the final trick count and Standing band, the Spoils, the
   score, and whether the Demand was cleared.
3. Recorded as free text: whether the round felt like a decision they made or a number happening to
   them — §11's exact question, asked in the playtester's own words.
4. The Standing band landed in is recorded for every playthrough, giving §12 Problem 1 ("does 7–9
   dominate?") data rather than a prediction. This is DoD 11's dataset and feeds T16.
5. A verdict is written onto this ticket: **proceed** or **kill criterion fired**.
6. If the criterion fired: this ticket's comment states that plainly, DLR-46 is flagged, and T9–T16
   are not started. §11 is explicit that no amount of tuning Standing, the Demand, or Forage
   repairs it.
7. If the verdict is proceed: any tuning the playtest suggests is recorded as config changes with
   the reasoning, not applied silently.

## Scope Boundaries

**In scope:**

- Running the playtest, recording the observations, writing the verdict
- Recording suggested config changes with reasoning

**Out of scope:**

- Writing code. If a defect is found, raise a Bug against T7.
- Tuning to make the criterion pass. That is the one thing §11 forbids.
- Judging visual polish — T15's, and a rough-looking slice does not fail this test

## Dependencies & Risks

- **Blocked by T7.** **Blocks T9 and T13** — both branches of remaining build work.
- **Risk: recruiting a naive playtester.** The criterion specifically requires someone who has not
  read the document; the developer cannot self-administer it, because knowing the intended reading
  is precisely the confound. If no such person is available, that is a real scheduling
  dependency and should be flagged rather than substituted around.
- **Risk: a soft verdict.** "It was fine" does not resolve the criterion in either direction. AC 3
  asks the §11 question directly and in the playtester's own words for that reason.
- **This is a `CLAUDE.md` pause condition** — a question of feel, so it is the developer's, not
  QA's.

## Design Assets

§11 (the slice, the kill criterion, the sizing note), §4 (the honest caveat), §12 Problem 1 (the
band-distribution measurement this ticket collects).

---

# T9 — Run state machine: five encounters, the Demand curve, victory and defeat

- **Type:** Story
- **Priority:** High
- **Parent:** DLR-46
- **Blocked by:** T8
- **Blocks:** T10
- **Skill:** `react-frontend`

## Problem Statement

A single Hunt against a fixed Demand demonstrates the inner loop and nothing else. §3's central
argument — that a rising Demand must eventually outrun what winning more tricks can pay — only
becomes visible once there is a curve, and §7 fixes the run as the structure that carries it. The
epic's own framing is explicit: five encounters is the smallest thing that demonstrates the outer
loop at all, and it is the no-repeat length against §4's five-character roster, which sidesteps
§12 Problem 3's unresolved repeat-schedule gap.

§7 also settles two rules that only exist at run scope: Forage persists within a run and nothing
persists across one, and missing a Demand ends the run — because §6's whole answer to having no
catch-up mechanic is that losing is cheap and restarting free, which is only true if failure
actually ends the run.

## User Story

As a player, I want a run of five encounters with a Demand that rises each time, so that I find out
whether the deck I am building keeps pace — and clearing the fifth Demand means something.

## Acceptance Criteria

1. A run state machine holds: the encounter index (1–5), the Demand for the current encounter, the
   character assigned to each encounter, the run's deck-and-decree, and the run's outcome state.
2. Encounters per run and the Demand curve's base and growth read from **T2's config**. No literal.
3. Each of the five Quarry characters appears exactly once per run — the no-repeat schedule §12
   Problem 3's arithmetic requires at this length. The order is drawn per run rather than fixed, so
   two runs differ in which constraint arrives when (§7's own stated cheapest fix, costing nothing).
4. Clearing the 5th Demand transitions to a distinct **victory** state — not a sixth encounter that
   never arrives (DoD 3).
5. Missing any Demand transitions to a **run over** state and offers a restart. Restart deals a
   bare 33-card deck with every card at base value — §7's clean-test rule (DoD 4).
6. Test: an additive-only build — one that only raises Spoils and never changes Standing — first
   misses its Demand at a **predictable** encounter under the configured curve, not a random one.
   This is §9's stated measurement for whether the growth-class lesson is being taught, run as a
   test rather than left to playtest.
7. Test: the Demand curve crosses the achievable ceiling somewhere inside five encounters. **Under
   T2's rank-weighted default the ceiling is ~650 typical / ~918 best-case and deal-dependent, not
   108** — the test asserts the crossing against the configured card-value rule, whichever it is.
8. Test: run state transitions are exhaustive — every encounter outcome leads to exactly one of
   next-encounter, victory, or run-over, with no unreachable or dead state.
9. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- The run state machine, encounter sequencing, character schedule, Demand curve
- Victory and run-over states and the restart-to-bare-deck rule
- Tests for curve shape and state exhaustiveness

**Out of scope:**

- Run UI — encounter transitions, victory screen, defeat screen. T10.
- Forage — T11. This ticket carries the run's deck-and-decree but does not edit it.
- Banked progress across runs — held open by §7 and explicitly out of the epic's scope
- A still-winnable signal telling the player their build is arithmetically dead — §6 states the
  cost on both sides and does not choose; explicitly out of the epic's scope
- Scoring or defeating the Quarry. §7 records that a run has no defeated opponent as an open
  structural gap with nothing proposed; this ticket does not invent one.

## Dependencies & Risks

- **Blocked by T8's proceed verdict.** **Blocks T10.**
- **Confirm before starting: T2's card-base-value default.** AC 7 depends on it. Under flat 1 the
  ceiling is a fixed 108 and the curve is simple; under rank weighting it is deal-dependent and the
  curve must be plotted against a distribution rather than a constant. The two are one decision,
  not two (§3, §9).
- **Default taken (AC 3):** the character order is shuffled per run rather than fixed. §7 names
  both options and costs the shuffle at nothing; a fixed order makes every run identical, which §7
  itself flags as undercutting its own repeatability claim.
- **Risk: §12 Problem 2.** A run can be arithmetically dead several Hunts before the player can
  tell, and this ticket builds the structure in which that happens. It is an accepted risk of the
  epic, measured jointly with Problem 1 in T16 — not solved here.
- **Open, and out of scope by the epic:** no surplus reward for clearing a Demand with excess
  Spoils (§12 smaller findings). The moment a Hunt is arithmetically safe is currently dead air.

## Design Assets

§3 (the growth-class argument and the ceiling), §5 (the Demand's shape), §7 (run shape, what a run
keeps, what failure does), §9 (Demand curve and encounters-per-run rows), §12 Problem 3.

---

# T10 — Run shell UI: encounter progression, victory, and defeat

- **Type:** Story
- **Priority:** High
- **Parent:** DLR-46
- **Blocked by:** T9
- **Blocks:** T11
- **Skill:** `react-frontend` + `game-ux`

## Problem Statement

T9's run state machine has no surface. DoD 1 requires a player to start a run and play five Hunts
in sequence in the browser without a reload; DoD 3 requires clearing the 5th Demand to produce a
"distinct, unmistakable victory state"; DoD 4 requires a miss to end the run and offer a restart.
None of that is reachable from the Hunt screen T7 built, which knows about exactly one Hunt.

§7 also flags the specific place this is most likely to fall flat: a run has no defeated opponent,
so the moment of victory is a number being cleared and nothing else — and that lands at exactly the
point a design can least afford flatness. This ticket cannot solve that structural gap, but it is
where the gap becomes visible, so it should be recorded rather than papered over.

## User Story

As a player, I want to start a run, move through five encounters seeing which Quarry is next and
what the Demand has risen to, and reach an unmistakable ending — so the run reads as one arc rather
than five disconnected rounds.

## Acceptance Criteria

1. A run can be started, and five Hunts played in sequence, in the browser with no reload and no
   console error (DoD 1).
2. Between encounters, a transition surface shows: which encounter is next (n of 5), which Quarry
   character it is and its rule-break, and the new Demand alongside the one just cleared — so the
   rise is visible as a rise, not just a new number.
3. Clearing the 5th Demand shows a **victory** screen that is distinct in content and layout from
   an ordinary encounter-cleared transition (DoD 3).
4. Missing any Demand shows a **run over** screen naming which encounter and how far short the
   score fell, with a restart control that begins a fresh run on a bare deck (DoD 4).
5. The run's progress — encounter index and the Demand — is visible during a Hunt, not only between
   them, so the player can plan against the curve.
6. Full-viewport, no-scroll, per `game-ux`. Component tests query by accessible role and label.
7. Every value shown comes from T9's run state; nothing is recomputed or hard-coded in a component.
8. Functional defaults only; visual judgement deferred to T15.
9. `npm run typecheck`, `npm run lint`, and the scoped Vitest run are green, and the flow has been
   driven end to end in a real browser.

## Scope Boundaries

**In scope:**

- The run shell that hosts five Hunts, the between-encounter transition, victory and run-over
  screens, and the restart path
- Surfacing run progress inside a Hunt

**Out of scope:**

- Forage's screen — T12 slots into the between-encounter transition this ticket builds
- Visual polish, motion, celebration animation — T15. §7 notes Balatro spends its whole climax on
  the reveal and that this design has not claimed that aesthetic; building one is out of scope here
  and a candidate for T15.
- Saving or resuming a run — no persistence in this epic
- Any run-over analysis screen beyond the shortfall in AC 4

## Dependencies & Risks

- **Blocked by T9.** **Blocks T11** — Forage needs a between-encounter moment to live in.
- **Risk, recorded not solved: §7's "a run has no defeated opponent."** The victory screen is a
  number being cleared. AC 3 makes it distinct; it cannot make it *earned-feeling*, and §7 proposes
  nothing. Note in the ticket summary how it actually reads once playable, as input to T15 and T16.
- **Pause condition:** whether the victory moment lands is a feel judgement and the developer's.
  Do not tune it inside this ticket.

## Design Assets

§7 (run shape, the ending gap), §5 (the rising Demand), DoD 1/3/4. `game-ux` skill.

---

# T11 — Forage: the four deck edits, persisting within a run

- **Type:** Story
- **Priority:** High
- **Parent:** DLR-46
- **Blocked by:** T10
- **Blocks:** T12
- **Skill:** `react-frontend`

## Problem Statement

§3 names Forage as the outer loop's **only** verb, and §2 makes the deck-and-decree the design's one
shared object precisely so that no exchange rate exists anywhere: a deck edit changes what is
available to be captured, and what gets captured is the score. §3's Cook's-loop argument is that an
outer loop only counts as a loop if it changes the conditions the inner loop runs under, and
editing the deck is the only thing in this design that does.

It is also the only unbounded lever. §3 establishes Standing is a gate that cannot be built and
Spoils has a hard ceiling at plain card values, so a Demand rising past that ceiling can only be
met by making captured cards worth more.

## User Story

As a player, I want to edit the deck the next Hunt is dealt from — a card's value, its ability, its
suit, or the decree — so that the deck I play encounter five with is one I built rather than one I
was dealt.

## Acceptance Criteria

1. Forage grants a budget of edits between encounters, read from **T2's config** (provisional 4).
2. Exactly four edit types are supported, and no fifth: a card's **value**, a card's **ability**, a
   card's **suit**, and the **decree**.
3. Edits apply to the 33-card deck the *next* Hunt is dealt from, and persist for the remainder of
   the run — an edit made before encounter 1 is still in effect at encounter 5 (§7).
4. A new run starts on a bare 33-card deck with every card at base value, no moved abilities, no
   changed suits (§7's clean-test rule).
5. **The three unspecified rules §3 names as blocking an implementation are decided here as stated
   defaults, each documented in the summary:** (a) two abilities may **not** be stacked on one
   card; (b) the source card **loses** its ability when it is moved; (c) Forage may target **any of
   the 33 cards**, not only cards the player captured. Each is a config-level or single-branch
   choice, reversible without restructuring.
6. The suit edit uses the base game's existing *unsuited* grammar — a card counting as the trick's
   other suit regardless of its own — per §8, rather than inventing new vocabulary.
7. A "where did it land" resolution exists as data: for each edited card, whether it was dealt to
   the player's hand, the Quarry's hand, or the undealt seven — computed after the next deal,
   available for T12 to display.
8. Test: an edit made at encounter 1 is still present in the deck dealt at encounter 5.
9. Test: a value edit changes the Spoils the card contributes when captured; an ability edit moves
   the ability's effect to the target card and removes it from the source.
10. Test: across many simulated deals, edited cards land in the player's hand / the Quarry's hand /
    the undealt seven at roughly 39.4% / 39.4% / 21.2% — §3's stated distribution, which is the
    cheapest proof the deal is not biased.
11. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- The four edit types, the budget, application to the deck-and-decree, run-scoped persistence
- The landed-edit resolution as data

**Out of scope:**

- The Forage screen — T12
- **Snare, §3's in-round edit layer.** Explicitly out of the epic's scope: "pump the card I am
  about to win with" is a dominant strategy until it has a cost, and no cost is chosen.
- **Negative card values** (§6 exit b) — undecided in §9, out of the epic's scope. The value edit's
  floor is 0.
- Any shop, currency, or purchasable bonus — ruled out by §3 and §1's component table
- Doing anything about the 21% dead-edit rate. §3 states the mitigation is the readout (T12), and
  that the dead-edit rate itself "needs a different answer" that is not proposed.

## Dependencies & Risks

- **Blocked by T10.** **Blocks T12.**
- **Risk, accepted by the epic:** roughly one edit in five is a no-op, on the outer loop's only
  verb, against a rising Demand (§3). §9's Forage-budget row sets 4 partly to halve that impact.
  §7 records the larger version — one progression system against Balatro's four — as this design's
  accepted "runs out of steam quickly" risk.
- **Risk: an ability edit landing in the Quarry's hand is pure downside** — you spent an edit arming
  your opponent (§3). This is a real design consequence, not a defect, and T12's readout is the
  only mitigation the design proposes.
- **Defaults taken (AC 5):** three genuinely unspecified rules. §3 flags the third as the
  interesting one — restricting edits to captured cards would tie the loops tighter — but that
  couples Forage to Hunt performance in a way nothing else in the design does, so the looser
  default ships first and the tighter one stays available as a tuning change.

## Design Assets

§2 (the shared object, no exchange rate), §3 (Forage's four verbs, the landing distribution, the
ability-edit worked plays, the three unspecified rules), §7 (persistence rules), §8 (the *unsuited*
grammar), §9 (Forage budget row).

---

# T12 — The Forage screen and the landed-edit readout

- **Type:** Story
- **Priority:** High
- **Parent:** DLR-46
- **Blocked by:** T11
- **Blocks:** T14
- **Skill:** `react-frontend` + `game-ux`

## Problem Statement

Forage is the whole of the build layer, so its screen is where a run stops being five rounds and
starts being a build. DoD 7 requires Forage to run between encounters, grant the budget, apply to
the next deal, and report where the edited cards landed.

That last part is not cosmetic. §3 states plainly that without the readout the 39% "landed in the
Quarry's hand" case is invisible variance rather than a hunt — you cannot chase what you cannot
locate, because §4 keeps the Quarry's hand hidden. A value edit in the Quarry's hand is arguably
the *best* case and the round is named after chasing it, but only if the player knows it is there.

## User Story

As a player, I want to spend my edits on a deck I can see, and then be told where those cards
ended up, so that a card I pumped into the Quarry's hand becomes something to hunt rather than
variance I never learn about.

## Acceptance Criteria

1. A Forage screen appears between encounters, inside T10's transition, showing the current
   deck-and-decree and the remaining edit budget.
2. All four edit types are performable from the screen: retarget a card's value, move an ability,
   change a card's suit, change the decree.
3. The screen shows what each edit will do before it is committed, and the budget decrements
   visibly as edits are spent.
4. After the next deal, a readout reports where the player's edited cards landed — "2 in your hand,
   1 with the Quarry, 1 undealt" — **and reveals nothing else about the hidden hand** (§3's exact
   mitigation, and its exact limit).
5. Test: the readout's counts match T11's resolution data exactly, and no card identity from the
   Quarry's hand is present in the rendered output.
6. Full-viewport, no-scroll, per `game-ux`. Editing a card is low-interaction-cost — selecting a
   target and an edit should not require navigating a modal stack.
7. Component tests query by accessible role and label; the budget, each edit control, and the
   readout each have an accessible name.
8. Functional defaults only; visual judgement deferred to T15.
9. `npm run typecheck`, `npm run lint`, and the scoped Vitest run are green, and the screen has
   been driven in a real browser.

## Scope Boundaries

**In scope:**

- The Forage screen, its four edit controls, the budget display
- The landed-edit readout after the next deal

**Out of scope:**

- Forage's rules and application — T11
- Revealing which specific cards the Quarry holds, or anything beyond the three counts in AC 4
- Visual polish and motion — T15
- Undo of a committed edit. Default taken: edits are committed on confirm and not undoable within
  a Forage; a pre-commit preview (AC 3) is the mitigation. Reversible if playtest disagrees.
- Any in-round editing — Snare is out of the epic's scope

## Dependencies & Risks

- **Blocked by T11.** **Blocks T14.**
- **Risk: the readout is the design's only answer to a 39% failure case, and it is a weak one.** It
  converts invisible variance into a stated objective; it does not reduce the variance. §3 accepts
  this explicitly. Worth recording in playtest whether "1 with the Quarry" reads as a hunt or as
  bad luck.
- **Risk: interaction cost.** Four edit types over 33 cards is a lot of surface. `game-ux`'s
  "navigating a collection of controls" guidance governs; a deck of 33 cards needs a browsing
  pattern, not 33 individually tabbed controls.
- **Pause condition:** whether the readout's wording lands is copy judgement and the developer's.

## Design Assets

§3 (the landing table, the readout mitigation and its stated limit), §4 (what stays hidden), DoD 7.
`game-ux` skill and its interaction-cost guidance.

---

# T13 — The remaining four Quarry characters: Witch, Woodcutter, Fox, Swan

- **Type:** Story
- **Priority:** Medium
- **Parent:** DLR-46
- **Blocked by:** T8
- **Blocks:** T14
- **Skill:** `react-frontend`

## Problem Statement

DoD 5 requires all five Quarry characters to appear once each across a run, each applying its
round-long rule-break for the whole round with the rule-break shown on screen at all times. T5
built the mechanism and one character; T9's run schedule assigns five. Without the other four, a
run either repeats the Monarch — which §12 Problem 3 identifies as the thing to avoid — or has four
empty encounters.

§5 is where the four rule-breaks are specified, and its structural point is that they must attack
*inputs to the engine* rather than the score: 20 of Balatro's 23 Boss Blinds attack an input, and
that is why a boss reads as a test of your build rather than a difficulty spike.

## User Story

As a player, I want each of the five encounters to break a different rule, so that a run tests
whether my deck still works with a different part removed each time rather than just asking for a
bigger number.

## Acceptance Criteria

1. **The Swan (1)** — follow-suit obligation. When the player has no card of the lead suit, they
   must play their lowest-ranked card rather than any card, all round (§5).
2. **The Fox (3)** — decree and trump. At the start of every trick the Quarry may swap the decree
   with a card from its hand, so trump can shift between tricks. Per §4's liability, **the swap is
   never hidden**: the new decree card is shown the instant it lands.
3. **The Woodcutter (5)** — hand size. One card is removed from the player's hand before the round
   starts and never returned, so all 13 tricks are played a card short (§5).
4. **The Witch (9)** — the odd-rank abilities. A trick holding exactly one odd-ranked card resolves
   as if that card were trump, all round (§5).
5. Each character exposes a name and a one-sentence player-facing description through T5's data
   shape, and T7's screen renders it with no per-character special-casing.
6. Test per character: the rule-break applies for all 13 tricks and never toggles mid-round; and
   the existing CPU plays only legal moves under it across a full simulated round without stalling
   or throwing.
7. Test: the Woodcutter's round is genuinely 13 tricks with a 12-card player hand — the round's
   fixed shape holds and the deal accounts for the removed card.
8. Test: the Fox's decree swap is visible in state the moment it happens, and trick resolution uses
   the decree in force at the time the trick resolves.
9. Every numeric aspect reads from **T2's config**.
10. Scoped Vitest run, `npm run typecheck`, and `npm run lint` are green.

## Scope Boundaries

**In scope:**

- The four remaining round-long rule-breaks and their tests
- Their player-facing descriptions

**Out of scope:**

- The rule-break mechanism itself — T5
- Cross-character difficulty balancing. §12's smaller findings record that nothing compares the
  five characters' pressure against each other and route it to §9 as tuning, not structure. Each
  character ships at §5's printed strength.
- Any CPU strategy change. **Ambition level unchanged from T5:** existing heuristic only, no
  search, no difficulty tiers.
- New characters beyond the five odd ranks — out of the epic's scope

## Dependencies & Risks

- **Blocked by T8** — deliberately, not by T5. Building four more characters before the kill
  criterion has fired is four tickets of work at risk. Once T8 says proceed, this runs in parallel
  with the T9→T12 run/Forage branch.
- **Blocks T14.**
- **Risk: the Woodcutter changes the round's shape**, which §8 fixes as invariant (13-card hands,
  13 tricks, 33-card deck) and on which every quantitative claim in the design depends. AC 7 is the
  guard: the *deal* changes, the *round length* does not.
- **Risk: the Fox's per-trick decree swap interacts with trick resolution ordering.** AC 8 pins the
  reading: the decree in force when the trick resolves is the one used.
- **Risk: an empty legal-move set.** The Swan's constraint narrows the one case where the base rules
  grant free choice; combined with a nearly-empty hand it must still yield at least one legal move.
  AC 6 covers it per character.

## Design Assets

§4 (the cast, the Fox worked example and its liability), §5 (the four worked rule-breaks and the
20-of-23 argument), §12 smaller findings (no cross-character difficulty read).
`.docs/game_rules/fox-in-the-forest.md` → Suit card reference.

---

# T14 — Integration: run, Hunt, and Forage as one running whole

- **Type:** Story
- **Priority:** Medium
- **Parent:** DLR-46
- **Blocked by:** T12, T13
- **Blocks:** T15
- **Skill:** `react-frontend` + `implementation-doc-writer`

## Problem Statement

T7, T10, T12, and T13 were each built and tested against their own slice of state. Integration is
where independently-built pieces reveal interface mismatches, and this epic has three seams that
have never been exercised together: Forage's edits reaching the deck a Hunt is *actually* dealt
from, the run's character schedule reaching the Hunt's rule-break, and the landed-edit readout
reconciling against a real deal rather than a fixture.

DoD 1 asks for five Hunts in sequence without a reload or a console error — a claim about the whole
machine, which no ticket above has been in a position to make.

## User Story

As a player, I want a run to play end to end — start, Hunt, Forage, Hunt, through to victory or run
over — with everything I edited and everything the Quarry does actually connected, so that the
prototype is one game rather than four screens.

## Acceptance Criteria

1. A full run plays end to end in the browser: start → five Hunts, each with a different Quarry
   character, Forage between each → victory on clearing Demand 5, or run over on any miss. No
   reload, no console error (DoD 1).
2. A run restarted after a miss deals a genuinely bare deck — no Forage edit from the previous run
   survives (DoD 4, §7's clean-test rule).
3. Integration test at the run level: a scripted run with a fixed seed produces the same five
   Hunts, the same Demands, the same character order, and the same outcome on every execution.
4. Integration test: a Forage edit made at encounter 1 is observable in encounter 5's dealt deck
   and in the Spoils that card contributes when captured.
5. Every seam surfaced by integration is fixed at its owner, not patched at the call site, per
   `CLAUDE.md`'s single-source-of-truth rule.
6. Per-module documentation under `.docs/implementation/` exists for every module this epic shipped,
   written by `implementation-doc-writer`, and `.docs/implementation/README.md`'s module table is
   accurate (an epic Deliverable).
7. All five gates green: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`,
   `npm run build` (DoD 9).
8. No file in `src/` exceeds 400 lines — measured, not estimated.

## Scope Boundaries

**In scope:**

- Wiring the run, Hunt, Forage, and character-schedule seams together
- Run-level integration tests
- The implementation docs for every module this epic shipped
- Fixing defects integration surfaces

**Out of scope:**

- New gameplay features. Anything that turns out to be missing rather than mis-wired is a new
  ticket, not scope creep here.
- Visual polish — T15
- The epic's DoD sign-off as a whole — T16

## Dependencies & Risks

- **Blocked by T12 and T13** — both build branches must land first.
- **Blocks T15.**
- **Risk: this is where the two build branches meet for the first time.** T13's four characters were
  developed against T5's mechanism while T9–T12 developed the run and Forage; the character schedule
  is the seam neither branch owned.
- **Risk: seed/determinism.** AC 3 requires a run to be reproducible, which means the shuffle and
  the character draw both need a seed reaching them. If nothing seedable exists by this point, that
  is a real finding and the test cannot be written honestly without it.

## Design Assets

The epic's Deliverables and DoD 1/4/9. `.claude/skills/implementation-doc-writer/SKILL.md`.

---

# T15 — Visual and experience polish pass

- **Type:** Story
- **Priority:** Medium
- **Parent:** DLR-46
- **Blocked by:** T14
- **Blocks:** T16
- **Skill:** `game-ux` + `react-frontend`

## Problem Statement

Every UI ticket above ships a stated functional default and explicitly defers visual judgement.
That is the right sequencing, and it leaves a real debt: an epic with three interactive surfaces
that skips a dedicated pass reads as unfinished even when every functional AC passes. "It works" is
not "it looks decent."

There is also one design-level gap this pass is the natural place to address. §7 records that a run
has no defeated opponent and that this bites hardest at the end of a run, noting Balatro spends its
whole climax on the reveal — an aesthetic this design has not claimed and would have to build
deliberately. §12 records that the document never names its target emotion. Neither is solvable by
spacing and colour, but the victory moment is where the absence is felt, and this is the ticket
that can do something about it within the epic's scope.

## User Story

As a player, I want the prototype to look and feel deliberate — readable states, coherent spacing
and colour, a victory that registers as an ending — so that judging the loop is judging the game
rather than judging a wireframe.

## Acceptance Criteria

1. A pass over all three surfaces — Hunt, run transition/victory/run-over, Forage — covering
   spacing, colour, typographic hierarchy, and interactive states (hover, focus, active, disabled,
   selected).
2. Focus states are visible and keyboard navigation is coherent across every surface, per `game-ux`.
3. Motion, where added, is purposeful and respects `prefers-reduced-motion`. Every animation,
   timer, and `requestAnimationFrame` created in an effect is released in that effect's cleanup.
4. The victory moment is given deliberate treatment as an ending rather than a state change —
   scoped to what a prototype affords, and flagged in the summary as a partial answer to §7's
   "no defeated opponent" gap rather than a solution to it.
5. Still full-viewport and no-scroll at every supported viewport size after the pass.
6. No component test breaks. Tests query by accessible role and label, so a visual pass that breaks
   them is a signal the pass changed semantics, not just appearance.
7. No `memo` / `useMemo` / `useCallback` added without profiling evidence.
8. All five gates green.

## Scope Boundaries

**In scope:**

- Spacing, colour, hierarchy, interactive states, purposeful motion across the three surfaces
- Focus and keyboard-navigation coherence
- Deliberate treatment of the victory moment

**Out of scope:**

- New gameplay, new screens, or new information on screen
- Art assets, illustration, character portraits, sound — the epic scopes out "art polish beyond
  what makes the loop legible"
- Solving §7's "no defeated opponent" structurally — nothing is proposed in the design and this
  ticket does not invent it
- Changing what §4's visibility table exposes

## Dependencies & Risks

- **Blocked by T14** — polishing before integration means polishing screens that are about to move.
- **Blocks T16.**
- **This is a `CLAUDE.md` pause condition throughout.** Visual and copy judgement is the developer's.
  Ship a coherent proposal, then expect a round of direction rather than treating the first pass as
  final.
- **Risk: scope drift.** A polish pass is the easiest place to accidentally add a feature. AC 6's
  "no component test breaks" is the tripwire.

## Design Assets

`.claude/skills/game-ux/SKILL.md` and its `references/full-viewport-layout.md`. §7 (the run's
ending gap), §12 smaller findings (no named target emotion), `balatro.md` §2.5 (the reveal).

---

# T16 — Epic verification: Definition of Done end to end, and the Standing-band measurement

- **Type:** Task
- **Priority:** Medium
- **Parent:** DLR-46
- **Blocked by:** T15
- **Blocks:** —
- **Skill:** `none` — verification and developer judgement, not implementation

## Problem Statement

Every ticket above verified its own slice. DLR-46's Definition of Done is eleven criteria about the
*whole* prototype, and two of them — DoD 10 (§11's kill criterion has been run and its verdict
recorded) and DoD 11 (the Standing band actually landed in, recorded across several playthroughs so
§12 Problem 1 has data rather than a prediction) — are measurements no build ticket produces.

§12 also asks for something none of the tickets above can deliver alone: Problems 1 and 2 must be
measured **jointly**, because strengthening Quarry pressure to stop Victorious from dominating
increases the variance that makes an already-dead run die faster. "A fix that improves one number
while worsening the other by more is not a fix, it is a transfer."

## User Story

As the developer, I want the epic checked as a whole against its own Definition of Done, with the
two behavioural measurements actually taken, so that "done" means the prototype answers the
questions it was built to answer rather than that eleven tickets closed.

## Acceptance Criteria

1. Every one of DLR-46's eleven DoD criteria is walked against the real integrated build and
   recorded pass or fail with evidence — not a restatement of per-ticket tests that already passed.
2. **DoD 8 verified by search:** a search of `src/` finds no hard-coded Standing multiplier, Demand
   value, or Forage budget. Report the search performed and its output.
3. **DoD 9 verified:** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and
   `npm run build` all green, with numbers reported.
4. **DoD 11 / §12 Problem 1:** the Standing band landed in is recorded across several full
   playthroughs against different Quarry characters, and the sample is checked for whether 7–9
   dominates. Combine with T8's slice-level data.
5. **§12's joint measurement stated:** record, together, how often Victorious is the reachable band
   and how many Hunts an already-weak build survives — so any later tuning of Quarry pressure or
   the Greedy penalty can be judged as a fix rather than a transfer.
6. **§9's stated measurements recorded** for each undecided row the prototype now makes measurable:
   whether a Forage edit is ever left unspent or regretted (the budget-of-4 test); whether a
   Greedy-band round reads as a proportionate cost or a null round; whether an additive-only build
   dies at a predictable encounter.
7. Any DoD criterion that fails produces a follow-up ticket rather than a silent pass.
8. A closing summary states plainly which of §9's undecided values now have data and which are
   still guesses, so the next tuning pass starts from evidence.

## Scope Boundaries

**In scope:**

- Walking the epic's DoD end to end against the integrated build
- Taking the two behavioural measurements and recording the §9 rows
- Raising follow-up tickets for failures

**Out of scope:**

- Fixing anything found — each failure becomes its own ticket
- Tuning §9's values. This ticket produces the data; changing the numbers is a separate decision
  and the developer's.
- Deciding §3's Snare, §6's negative values, §7's banked progress, or a still-winnable signal — all
  out of the epic's scope

## Dependencies & Risks

- **Blocked by T15** — the last build ticket.
- **Risk: measurement fatigue.** AC 4 and AC 5 need several full five-encounter runs. That is real
  playing time and should be scheduled, not squeezed.
- **Risk: this ticket can only report.** If the data says Victorious dominates, the answer is a
  tuning pass with §9's rows, not a fix inside this ticket.
- **This is a `CLAUDE.md` pause condition** — the DoD's feel-based criteria are the developer's.

## Design Assets

DLR-46's Definition of Done (all eleven). §9 (every undecided row and its stated measurement), §12
(Problems 1 and 2, the joint measurement, "What to measure").

---

## Open questions for the developer

Raised at the approval gate rather than decided in this file:

1. **Sprint placement.** The epic's instruction was to put every ticket in the current sprint.
   **There is no open sprint on board 1** — `SCRUM Sprint 2` closed on 2026-08-09 and no future
   sprint holds any issue. Separately, `management-jira`'s Rules Summary states *"Never assign to a
   sprint — always land in backlog"* and lists a sprint write among its Forbidden Behaviors. Both
   need resolving before creation: start a sprint first, or create to the backlog and move the
   cards on the board afterwards.
2. **`CLAUDE.md` in T1.** T1 removes the Vanguard vocabulary section because it documents deleted
   code. Adding §10's *new* Hunt vocabulary is left out, per the epic's explicit routing. Confirm
   that split is what you want.
3. **Card base values (T2 AC 3).** Defaulted to **printed rank** over flat 1, because at flat 1 the
   equation collapses to a single variable and has no second axis. This changes T9's ceiling from a
   fixed 108 to ~650 typical / deal-dependent. Highest-leverage number in the document — worth
   confirming before T9 rather than after.
4. **Deploy.** Excluded — the epic's Deliverables scope the prototype to `npm run dev`, and no
   deploy workflow exists on this branch. Say if a Pages deploy should be a ticket.
