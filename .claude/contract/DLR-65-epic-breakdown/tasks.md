# DLR-65 — epic breakdown (ticket-creation worklist)

**This file is not an `/fb-plan` implementation contract.** It carries no `^Status:` line, it is not
resolved by `/fb-apply`, and no agent walks it. It is the worklist `/jira-epic-decomposition` hands
to `/management-jira` in Phase 5, and it stops mattering the moment the tickets exist. Each ticket
below still needs its own `/fb-plan` run before anyone writes code.

**Epic:** [DLR-65](https://amazerbeam.atlassian.net/browse/DLR-65) — _The Hunt — two-encounter duel
prototype: beat both Quarries on one health bar_ · project `DLR` (DeLorean 1.21) · epic priority High.

**Read before decomposing (Phase 2, done):**

- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — the direction, §1, §3, §4, §5, §6,
  §8, §9, §10, §11, §12 (read in full).
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — _The full net-damage enumeration_,
  _Fight length is symmetric about the middle, and bimodal_, _The declaration as a free option_,
  _The character roster as declaration counterweight_.
- `.docs/implementation/` — `hunt/README.md`, `hunt/scoring-tunables.md`, `war-council/README.md`,
  `war-council/cpu-heuristic.md`, `war-council-ui/README.md`, `app/README.md`.
- `.claude/rules/` — scanned, empty (its own `README.md` says an empty index is correct here).

**What reading the code changed about the decomposition, stated up front because it is the
breakdown's load-bearing finding.** The epic's Approach describes six phases of *addition*. The
shipped code carries two structures this direction *retires*, and neither is named in the epic:

1. **`STANDING_BANDS` is still the base game's single transcribed table** — `0–3 ×6, 4 ×1, 5 ×2,
   6 ×3, 7–9 ×6, 10–13 ×0` (`.docs/implementation/hunt/scoring-tunables.md`). It is not one of the
   two mirrored tables the direction designs. T1 replaces it.
2. **DLR-63's capped three-Lose-credit mechanic is on disk and on screen** — `LOSE_CREDITS_PER_HUNT`,
   `claimLostTrick`, `canClaimLostTrick`, `creditedTrickWorth`, `DeclarationState`'s three credit
   fields, `Hunt.loseCredits`, the claim control, and the ledger's credits cell. §1 says the
   pile-swap rule "replaces it outright." Likewise `FIXED_DEMAND`, `DEMAND_CURVE`, `checkDemand`, and
   `scoreRound`/`tricksToPoints` belong to the retired score-and-target model.

Deleting these is real work with a real file map, and doing it inside a ticket that is also adding
two-sided damage would make that ticket's diff unreviewable. **T2 exists for it**, sequenced second
so every later ticket builds on a clean scoring path rather than beside a dead one. After T2 the app
still runs and a Hunt still ends with `card value × Standing` shown for both sides — the interim is
playable, not broken.

---

## Phase 3 checklist — how each category was covered

| Checklist category | Covered by | Note |
|---|---|---|
| 1. Foundational scaffold | T1 | Every later ticket reads from it. |
| 2. Core domain/rules logic | T2, T3, T4, T5 | Retirement, damage, the pile swap, encounter resolution. |
| 3. Autonomous / reactive behaviour | T7 | The band-position CPU. Ambition level stated in the ticket: **heuristic, not search** — no lookahead, no determinized search, no ML. |
| 4. User-facing interface | T6, T9 | Two health bars with pending damage; encounter/run outcome screens. |
| 5. Visual / experience polish | T11 | Its own ticket, as the checklist requires. |
| 6. Integration | T10 | Scheduled last among build work. |
| 7. Deploy / release | **genuinely excluded** | See below. |
| 8. Verification & sign-off | T13 | Against DoD 1–10 as a whole, not a re-run of per-ticket tests. |

**Why deploy/release is excluded rather than ticketed.** There is no deploy target in this
repository — no CI workflow, no hosting config, no deploy script. `CLAUDE.md`'s command table is
`typecheck` / `lint` / `format:check` / `test` / `build`, and the epic's own deliverable is "a
playable prototype, **reachable in the browser**", which `npm run dev` already satisfies. DoD 8
makes `npm run build` a gate, and T13 verifies it. Inventing a deploy ticket against no pipeline
would produce a ticket nobody can close. If the developer wants the prototype hosted for
playtesters, that is a separate ticket and worth raising early — flagged, not assumed.

---

## Decisions this breakdown states as reversible defaults

Per the skill's *state a default, don't stall* rule. Each is recorded in the owning ticket's
Dependencies & Risks and is a one-line config edit to overturn.

| Open question | Default taken | Owner ticket |
|---|---|---|
| The ×0.5 rounding question (§9 Undecided; epic says it cannot be deferred past phase 2) | **Round half away from zero**, as a named `DAMAGE_ROUNDING` tunable whose other setting is the doubled-table presentation. Health totals stay at the epic's stated 1,350 / 1,600 rather than doubling. | T1 |
| Health restore entering encounter 2 | **No restore** (`ENCOUNTER_PLAYER_RESTORE = 0`), as the epic states — but shipped as a tunable so testing a restore is a one-line edit, which is what the epic asks for. | T1 |
| Which character the second Quarry is | **The Monarch again**, at 1,600 — the epic's own assumption, and the only character with round-long enforcement on disk. | T1 |
| The Hunts-per-encounter cap `R` | **No cap**, per the epic's Out of scope. The stall is the evidence. T13 records the observed Hunt counts. | T5 |
| Overkill past a depleted bar | **Discarded**, per §9 Deferred. | T5 |
| Band names (Humble / Defeated / Victorious / Greedy) misdescribing the Lose path (§10) | **Names stand.** §10 records this as a copy judgement and the developer's; T12 carries the mismatch forward in the docs rather than renaming. | T12 |

**Genuine pause conditions — the developer's, not this breakdown's.** T11 (visual and copy
judgement), T13's feel questions (does the declaration read as a live read; does encounter 2 read as
hard or as unwinnable), and any retune of the multiplier tables, the health totals, or the restore
after the first play session. No ticket below decides one of these.

---

## Sequencing

Blocker → blocked, grouped by checklist phase. This is the graph Phase 5 links literally.

```
FOUNDATION
  T1  Scoring, health and rounding configuration
        ├─> T2
        ├─> T3
        └─> T7

CORE RULES
  T2  Retire the Demand and the capped Lose-credit mechanic
        ├─> T3
        └─> T6
  T3  Two-sided damage, both directions, once at trick 13
        ├─> T4
        └─> T5
  T4  The Lose path's pile swap and the two card-value schemes
        ├─> T7
        └─> T12
  T5  Encounter state: health, damage application, end conditions
        ├─> T6
        └─> T8

AUTONOMOUS
  T7  The band-position CPU
        └─> T10

INTERFACE
  T6  Two health bars with live pending damage
        └─> T10
  T8  The two-encounter sequence, with health carry-over
        ├─> T9
        └─> T12
  T9  Encounter and run outcome screens
        └─> T10

INTEGRATION
  T10 Integration: both encounters playable end to end
        ├─> T11
        └─> T13

POLISH / DOCS / SIGN-OFF
  T11 Visual and experience polish pass
        └─> T13
  T12 Update hybrid-design.md and the-hunt.md
        └─> T13
  T13 Epic verification: Definition of Done end to end
```

Flat blocker list — all twenty links created 2026-08-11 and verified:

| Blocker | blocks |
|---|---|
| T1 · DLR-66 | DLR-67, DLR-68, DLR-72 |
| T2 · DLR-67 | DLR-68, DLR-71 |
| T3 · DLR-68 | DLR-69, DLR-70 |
| T4 · DLR-69 | DLR-72, DLR-77 |
| T5 · DLR-70 | DLR-71, DLR-73 |
| T6 · DLR-71 | DLR-75 |
| T7 · DLR-72 | DLR-75 |
| T8 · DLR-73 | DLR-74, DLR-77 |
| T9 · DLR-74 | DLR-75 |
| T10 · DLR-75 | DLR-76, DLR-78 |
| T11 · DLR-76 | DLR-78 |
| T12 · DLR-77 | DLR-78 |

That is **20** links, not 18 — the count stated when this file was dispatched to `/management-jira`
was wrong; the table itself was right, and all twenty landed.

---

## Ticket summary — created 2026-08-11

| # | Key | Summary | Type | Priority | Labels | Skill |
|---|---|---|---|---|---|---|
| T1 | **DLR-66** | Scoring, health and rounding configuration: two mirrored tables as data | Task | Highest | `engine` | `react-frontend` |
| T2 | **DLR-67** | Retire the Demand comparison and the capped Lose-credit mechanic | Task | Highest | `engine`, `playable` | `react-frontend` |
| T3 | **DLR-68** | Two-sided damage: card value × Standing, both directions, once at trick 13 | Story | Highest | `engine` | `react-frontend` |
| T4 | **DLR-69** | The Lose path's pile swap and the two card-value schemes | Story | Highest | `engine` | `react-frontend` |
| T5 | **DLR-70** | Encounter state: two health bars, damage application, and the end conditions | Story | High | `engine` | `react-frontend` |
| T6 | **DLR-71** | Two health bars with live pending damage, every trick | Story | High | `ui`, `playable` | `react-frontend` + `game-ux` |
| T7 | **DLR-72** | The band-position Quarry: a CPU that plays for a target band | Story | High | `engine` | `react-frontend` |
| T8 | **DLR-73** | The two-encounter sequence: health carry-over and the run-over state | Story | High | `engine` | `react-frontend` |
| T9 | **DLR-74** | Encounter and run outcome screens | Story | Medium | `ui` | `react-frontend` + `game-ux` |
| T10 | **DLR-75** | Integration: both encounters playable end to end in the browser | Story | High | `ui`, `playable` | `react-frontend` + `game-ux` |
| T11 | **DLR-76** | Visual and experience polish pass on the duel surface | Story | Low | `ui`, `playable` | `game-ux` + `react-frontend` |
| T12 | **DLR-77** | Update hybrid-design.md and the-hunt.md to the shipped duel rules | Task | Medium | `design` | `implementation-doc-writer` |
| T13 | **DLR-78** | Epic verification: Definition of Done end to end, and the trick-count distribution | Task | Medium | `spike` | none — verification and developer judgement |

All thirteen carry `parent: DLR-65` and assignee **Joss Duffy**
(`712020:1c5972ae-8cc9-4b30-a54d-edaab9e366d3`), and all twenty Blocks links below are live.

**Sprint: all thirteen are in sprint 101** — "SCRUM Sprint 4", active, board 1, 16–23 Aug 2026.
Verified: `parent = DLR-65 AND sprint = 101` returns 13, `sprint is EMPTY` returns 0. See
*Phase 5 notes* for how the id was finally obtained, which is the part worth reusing.

**The keys are sequential in build order**, so `DLR-66 … DLR-78` reads top to bottom as T1 … T13.
Where a ticket body names a dependency it uses the real key, not the T-number.

---

# The tickets

---

### T1 — Scoring, health and rounding configuration: two mirrored tables as data

**Type:** Task · **Priority:** Highest · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T2, T3, T7 · **Blocked by:** — · **Skill:** `react-frontend`

## Problem Statement

`src/hunt/config.ts` currently holds the base game's single transcribed Standing table
(`0–3 ×6, 4 ×1, 5 ×2, 6 ×3, 7–9 ×6, 10–13 ×0`), a fixed Demand, a Demand curve of two `null`s, and a
Lose-credit cap. None of that is the duel direction's scoring. The direction needs **two mirrored
tables, one per declaration**, whose **band boundaries differ between the two tables** — Win reads
`0–3 / 4 / 5 / 6 / 7–9 / 10–13`, Lose reads `0–3 / 4–6 / 7 / 8 / 9 / 10–13` — plus both health
totals, the per-declaration card-value scheme, and a rounding rule for the ×0.5 bands.

Every later ticket in DLR-65 reads a number from here. Retrofitting this module after damage is
implemented means touching every file that scores, which is why the epic ranks it Highest and first.

## User Story

As the developer, I want every scoring and health number in the duel to live in one module as data,
so that swapping the whole table pair — different multipliers **and** different band boundaries — is
a one-file edit I can make between play sessions without a rewrite.

## Acceptance Criteria

1. `HUNT_MULTIPLIER_TABLES` exports one `StandingBand[]` per `HuntDeclaration`. The shipped default
   is Win `0–3 ×1, 4 ×2, 5 ×3, 6 ×4, 7–9 ×5, 10–13 ×0.5` and Lose `0–3 ×0.5, 4–6 ×5, 7 ×4, 8 ×3,
   9 ×2, 10–13 ×1`. **Band boundaries are per-table row data, never an `if` branch or a shared
   boundary set** — the two tables' boundaries genuinely differ, which is the whole reason this AC is
   written this way.
2. `resolveStanding` resolves against a caller-supplied table, keeping DLR-48's injectable-table
   pattern, and continues to throw a `RangeError` outside 0–13. A declaration-aware accessor returns
   the right table for a declaration; no consumer outside this module names a table by identifier.
3. A test asserts the **complementarity invariant** `Lose(k) = Win(13 − k)` at all fourteen splits,
   over whatever pair is configured — so a future hand-edit that breaks it fails loudly rather than
   quietly deleting the same-path rule (epic Deliverable 3).
4. A test swaps in the epic's alternative pair — Win `0–3 ×1, 4 ×2, 5 ×3, 6 ×4, 7 ×5, 8 ×5, 9 ×5,
   10–13 ×6`, Lose `0–3 ×6, 4–6 ×5, 7 ×4, 8 ×3, 9 ×2, 10–13 ×1` — and asserts the resolved
   multipliers change accordingly, **with the Lose side's different boundaries**, and that the real
   exports are unaffected. This is the proof the swap is a one-file edit (epic DoD 5).
5. `PLAYER_START_HEALTH` (`1350`), the per-encounter Quarry health sequence (`[1350, 1600]`), and
   `ENCOUNTER_PLAYER_RESTORE` (`0`) are named exports, each with a comment citing its source: §9
   Decided 2026-08-11 for the first, new-to-this-epic for the other two.
6. `cardValueFor(declaration)` returns `cardBaseValue` on Win and `invertedCardValue` on Lose, both
   already on disk, both `(rank: number) => number`. No modifier of any kind is applied — no
   Treasure `+1`, no Poison `−1` (§1).
7. `DAMAGE_ROUNDING` names the rounding rule for the ×0.5 bands and `roundDamage` applies it. The
   default is **half away from zero**; the alternative — doubling both tables and both health
   totals — is expressible by editing this module alone. A test covers an odd card sum under a ×0.5
   band in both settings.
8. `SIMULTANEOUS_DEPLETION_WINNER` names the §5/§9 ruling (the Quarry) as data rather than a
   hardcoded branch in a later ticket.
9. `STANDING_BANDS` no longer exists as a single-table export, and a grep over `src/` finds no band
   boundary or multiplier as a literal outside this module.
10. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest run pass.

## Scope Boundaries

**In scope:**
- `src/hunt/config.ts`, `src/hunt/types.ts`, `src/hunt/index.ts`, `src/hunt/__tests__/config.test.ts`.
- Whatever mechanical edit `src/warCouncil/scoring.ts` and its callers need to keep compiling against
  the new `resolveStanding` shape — signature adaptation only, no behaviour change.
- Splitting `config.ts` if it passes 400 lines. Measure with `(Get-Content <file>).Count`, **not**
  `Measure-Object -Line` — the latter drops blank lines and hid a real breach on DLR-63.

**Out of scope:**
- Any damage arithmetic (T3), the pile swap (T4), health state (T5), and every UI file.
- Deleting `FIXED_DEMAND`, `DEMAND_CURVE`, `LOSE_CREDITS_PER_HUNT`, or the credit mechanism — T2
  owns that, deliberately separated so this ticket's diff is additive and reviewable.
- An in-app tuning UI. The epic forbids it outright: the requirement is that the *code* is easy to
  fiddle with.

## Dependencies & Risks

- **The rounding decision is taken here as a stated default, not deferred.** The epic says it cannot
  be deferred past phase 2; §9 records it Undecided and offers the doubling dissolution. This ticket
  ships **round half away from zero** with health at the epic's stated 1,350 / 1,600, and makes the
  doubled presentation a one-line alternative. If the developer prefers doubling, that is a
  single-file edit plus a fixture update — flagged as theirs to overturn.
- **No restore into encounter 2 is an assumption, and the epic names it the most likely thing to
  change.** `ENCOUNTER_PLAYER_RESTORE = 0` exists as a tunable precisely so testing a restore is
  cheap.
- **The second Quarry is assumed to be the Monarch at 1,600.** The epic describes it only by health,
  and the Monarch is the only character with round-long enforcement on disk
  (`src/warCouncil/quarryRuleBreak.ts`). A different character would start testing the roster, which
  §11 puts out of scope.
- **A table swap is a design change wearing tuning clothes.** The alternative pair moves both peaks
  to the extremes, reversing the Knizia property §1 is built on. This ticket makes the experiment
  cheap; it does not make it neutral. Nothing here may assume where a peak sits.
- **Not playable.** Closing this leaves nothing new to exercise by hand — the exports have no
  consumer until T3.

## Design Assets

`hybrid-design.md` — the direction section (both tables), §1 (the equation and complementarity),
§9 (the Decided/Undecided/Deferred register). Existing shape:
`.docs/implementation/hunt/scoring-tunables.md`.

---

### T2 — Retire the Demand comparison and the capped Lose-credit mechanic

**Type:** Task · **Priority:** Highest · **Labels:** `engine`, `playable` · **Parent:** DLR-65
**Blocks:** T3, T6 · **Blocked by:** T1 · **Skill:** `react-frontend`

## Problem Statement

Two structures on disk belong to the retired score-and-target model and actively contradict the duel
direction. Neither is named in the epic's Approach, and both have to go before anything is built on
top of them.

**The Demand.** `FIXED_DEMAND` (220), `DEMAND_CURVE` (`{ base: null, growthPerEncounter: null }`),
`checkDemand`, `DemandOutcome`, the `Demand` type alias, `Hunt.demand`, `scoreRound`,
`tricksToPoints`, and the end panel's cleared/missed verdict. §9 deletes the Demand row outright:
there is no comparator now, because a side's total is damage to the other's health.

**The three-Lose-credit mechanic.** DLR-63 built a capped pool of credits, each spendable on one
lost trick, with four guards and a `creditedThrough` watermark, plus a claim control on screen and a
credits cell in the ledger. §1 states plainly that the pile-swap rule "replaces it outright" — every
card the Quarry captures counts for the player, uncapped.

Leaving either in place while T3 and T4 add two-sided damage would produce two scoring paths, one of
them dead, and a screen showing a target that no longer exists.

## User Story

As the developer, I want the Demand and the Lose-credit mechanic removed in one reviewable pass, so
that the duel's damage arithmetic is built on a clean scoring path instead of beside a dead one.

## Acceptance Criteria

1. `checkDemand`, `DemandOutcome`, `scoreRound`, `tricksToPoints`, `FIXED_DEMAND`, `DEMAND_CURVE`,
   `DemandCurve`, the `Demand` type alias and `Hunt.demand` are gone from `src/`. A grep for each
   name returns zero hits outside git history.
2. `claimLostTrick`, `canClaimLostTrick`, `ClaimRejection`, `ClaimResult`, `creditedTrickWorth`,
   `LOSE_CREDITS_PER_HUNT` and `Hunt.loseCredits` are gone. `DeclarationState` loses
   `creditsRemaining`, `creditedCards` and `creditedThrough`, keeping `path`.
3. `RoundUiAction` loses its `ClaimTrick` member; the claim control, the ledger's credits cell, and
   `CLAIM_REJECTION_MESSAGE` are removed from `src/app/warCouncil/`.
4. `spoils` becomes single-branch again: each side's own captured cards, valued by the declaration's
   own scheme via T1's `cardValueFor`. **This is a deliberate interim** — T4 replaces it with the
   pile swap. It is stated here so the interim is a chosen, coherent state rather than an accident.
5. The declare gate still gates the first trick and still writes the declaration once; `declareHunt`
   keeps its two guards (`AlreadyDeclared`, `HuntUnderway`) and stops taking a credit pool.
6. Every test that asserted a credit guard, a Demand verdict, or a `tricksToPoints` band is deleted
   or rewritten — not skipped, not left asserting a removed behaviour.
7. The app still runs: a Hunt is playable start to finish, the end panel shows
   `card value × Standing` for both sides with no target and no verdict, and no screen references a
   Demand or a credit.
8. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:**
- Engine: `src/warCouncil/scoring.ts`, `spoils.ts`, `declareHunt.ts`, `claimLostTrick.ts` (delete),
  `types.ts`, `index.ts`, and the matching tests in `src/warCouncil/__tests__/`.
- Config: `src/hunt/config.ts`, `types.ts`, `index.ts`, `__tests__/config.test.ts`.
- Screen: `src/app/warCouncil/WarCouncilRound.tsx`, `roundReducer.ts`, `HuntLedger.tsx`,
  `RoundOverPanel.tsx`, `TrickWell.tsx`, `labels.ts`, `warCouncilHunt.css`, `warCouncilDeclare.css`,
  and their tests.
- Mount contract: `src/app/warCouncilMount.ts`, `src/App.tsx`.

**Out of scope:**
- Adding two-sided damage (T3) or the pile swap (T4). This ticket only removes.
- Health, health bars, pending damage, encounter sequencing.
- The stale `ILLEGAL_MOVE_MESSAGE[MustFollowMonarch]` copy — a known live copy defect
  (`.docs/implementation/war-council-ui/README.md`), and a developer copy call, not this ticket's.

## Dependencies & Risks

- **Blocked by T1**, because `spoils`'s interim single branch reads T1's `cardValueFor`.
- **The removal is not recoverable from the ticket alone if the pile swap turns out wrong.** It is
  recoverable from git — `CLAUDE.md`'s `git show <commit>:<path>` note covers it — and §1's argument
  against the credit mechanic is explicit, so the risk is low and stated rather than hedged.
- **`playable`, and honestly so**: the app runs after this, with a visibly simpler Lose path. What it
  does *not* have yet is health, which is T5/T6. A developer opening the app will see a Hunt that
  ends in arithmetic with nothing to spend it on.
- **This is the largest single deletion in the epic.** Expect the diff to touch both layers roughly
  evenly; it is labelled `engine` because the engine side is the larger half and the UI edits are
  consequences of it.

## Design Assets

`hybrid-design.md` §1's declaration subsection (the credit mechanic "replaced, not tuned"), §9 (the
deleted Demand row). On disk: `.docs/implementation/war-council/declaration-and-lose-path.md`,
`.docs/implementation/war-council-ui/declare-gate-and-claim.md`.

---

### T3 — Two-sided damage: card value × Standing, both directions, once at trick 13

**Type:** Story · **Priority:** Highest · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T4, T5 · **Blocked by:** T1, T2 · **Skill:** `react-frontend`

## Problem Statement

Only the player's side is ever scored today — `scoreHunt` takes a `PlayerSide` and would compute for
either, but nothing calls it for the Quarry
(`.docs/implementation/war-council/README.md`, Deferred). The direction makes both sides deal damage
by the same equation, off the **same** declaration, applied to the *other* side's health, evaluated
once at the end of the thirteenth trick.

Damage must be forced rather than chosen: the multiplier is read off the *final* trick count, so no
total can be applied — or even known — before the last trick resolves.

## User Story

As a player, I want the Hunt I just played to deal damage in both directions at once, so that a
round I won by a hair costs me something and a round I lost still hurts the Quarry.

## Acceptance Criteria

1. A `huntDamage(finalState)` entry point returns both sides' damage for one finished Hunt, each as
   `{ cardValue, tricks, band, standing, damage }`, computed once from a final `RoundState` and never
   accumulated per trick.
2. Both sides read the multiplier table for **whichever declaration the player made**. The Quarry
   never declares for itself, and there is no code path by which it could (§1).
3. Each side's damage is applied to the **other** side's health. The direction is asserted by test,
   not left to a caller's convention.
4. Damage rounds through T1's `roundDamage` at exactly one point, so a ×0.5 band on an odd card sum
   cannot produce a fractional health value.
5. `huntDamage` throws or rejects — never silently returns zero — on an unfinished Hunt or an
   undeclared one. A corrupt trick count still surfaces `resolveStanding`'s `RangeError` rather than
   being scored as 0.
6. A test asserts the antisymmetry property `Net(k) = −Net(13 − k)` at average card values, over the
   configured table pair.
7. Vitest covers both declarations at the fourteen splits at average card values, against §8's
   enumeration. **Note:** the Lose column is only correct once T4's pile swap lands — this ticket's
   fixtures assert the Win column in full and the Lose column against own-pile valuation, and T4
   updates them. Stated so the handover is explicit rather than discovered.
8. Nothing in `src/warCouncil/` holds a multiplier, a band boundary, or a health total as a literal.
9. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** a new damage module under `src/warCouncil/` (`damage.ts` or the reshaped `scoring.ts`),
`src/warCouncil/spoils.ts`, `types.ts`, `index.ts`, and their tests.

**Out of scope:** the pile swap (T4), health totals and bars (T5, T6), pending-damage display (T6),
and any UI file. Overkill past a depleted bar (§9 Deferred).

## Dependencies & Risks

- **Blocked by T1** for the tables and the rounding rule, **and by T2** because the Demand comparison
  it replaces must be gone first.
- **The Quarry's own declaration is a rule, not a missing symmetry.** §1 proves that letting the
  Quarry declare freely nets zero damage at every one of the fourteen splits at average values —
  it deletes the game. Any reviewer or later ticket tempted to "fix" the asymmetry should read that
  paragraph first.
- **Not playable.** The numbers exist but nothing shows them until T6.

## Design Assets

`hybrid-design.md` — the direction, §1 (the equation and why the Quarry never declares), §3 (the
ceiling: 540 typical, 765 best case, ±444 max swing), §8 (the fourteen-split enumeration).

---

### T4 — The Lose path's pile swap and the two card-value schemes

**Type:** Story · **Priority:** Highest · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T7, T12 · **Blocked by:** T3 · **Skill:** `react-frontend`

## Problem Statement

On the Lose path the two capture piles swap **both ways**: the player is paid for the cards the
Quarry captured, at inverted value, and the Quarry is paid for the cards the player captured, at
inverted value — each pile counted exactly once, by the side that did not win it. T2 left `spoils`
valuing each side's own pile as a deliberate interim; this ticket closes it.

§1 records the discarded branch and its reason, and the reason is the edge case that matters: if both
sides counted the Quarry's pile, a player who declares Lose and wins zero tricks — executing the plan
as well as it can be executed — would finish 78 *behind* instead of 78 ahead.

## User Story

As a player who declared Lose, I want to be paid for the cards the Quarry took and to have my own
captures pay the Quarry, so that every trick I win on that path is visibly material handed to my
opponent.

## Acceptance Criteria

1. On Win, each side's card value is the sum of its **own** captured cards at printed rank.
2. On Lose, each side's card value is the sum of the **other** side's captured cards at `12 − r`.
   Each pile is counted exactly once, by the side that did not win it.
3. No modifier of any kind touches either value — no Treasure `+1`, no Poison `−1`. A grep confirms
   no `CardRank.Treasure` / `CardRank.Poison` branch survives in the value path (§1).
4. The full fourteen-split enumeration from §8 passes under **both** declarations at average card
   values (a trick's two cards worth ~12), including the four flagged rows: `k = 0` → −78 / +78,
   `k = 4` → −444 / +444, `k = 9` → +444 / −444, `k = 13` → +78 / −78. This is epic DoD 4.
5. The `k = 0` Lose edge case is asserted explicitly as `+78` to the player — the discarded branch's
   own falsifier.
6. A test asserts the two card-value schemes are exhaustive over the declaration union, so a third
   declared path could not silently fall through to a default.
7. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** `src/warCouncil/spoils.ts`, the damage module from T3, `types.ts`, `index.ts`, and
their tests — including updating T3's provisional Lose-column fixtures to the swapped values.

**Out of scope:** Forage and the deferred "Forage value edits under inversion" question (§9) — there
is no Forage in this epic. Health, bars, sequencing, and every UI file.

## Dependencies & Risks

- **Blocked by T3**, whose Lose-column fixtures this ticket rewrites. The handover is named in T3
  AC7 so neither ticket assumes the other's numbers.
- **`invertedCardValue`'s pivot is not a tuning value.** `RANK_INVERSION_PIVOT = 12` is
  `max(RANKS) + 1` for the 1–11 deck, which is what makes the inversion its own mirror and keeps
  every output inside 1–11. Do not treat it as a knob
  (`.docs/implementation/hunt/scoring-tunables.md`).
- **Not playable.** Engine-only; verified by Vitest.

## Design Assets

`hybrid-design.md` — the direction (the pile swap), §1's declaration subsection (why the Lose table
peaks at 4–6, derived from the swap; and the discarded both-count-the-Quarry's-pile branch), §8's
enumeration, §9 (Decided — the piles swap both ways).

---

### T5 — Encounter state: two health bars, damage application, and the end conditions

**Type:** Story · **Priority:** High · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T6, T8 · **Blocked by:** T3 · **Skill:** `react-frontend`

## Problem Statement

Nothing in this repository tracks state across rounds. `src/App.tsx` re-deals on completion and
tracks a round number and a dealt state, nothing else
(`.docs/implementation/app/README.md`, Deferred). An encounter is a **sequence** of Hunts played
until a bar empties, which needs a state object that outlives one `RoundState`.

## User Story

As a player, I want the damage from each Hunt to carry into a running health total for both sides, so
that an encounter is a fight I can win or lose rather than a round that just ends.

## Acceptance Criteria

1. An encounter state holds both sides' current health, initialised from T1's configured totals, and
   an applied-Hunt count.
2. Applying a finished Hunt's `huntDamage` reduces each side's health by the *other* side's damage,
   once, at the end of the thirteenth trick — never per trick.
3. **Pending damage** is derivable at any point mid-Hunt for both sides, from the tricks captured so
   far, as the same equation evaluated early. It is shown but not applied, and it is one function —
   not a second arithmetic path that could drift from the applied total (epic DoD 7).
4. The encounter resolves the moment a bar reaches zero or below: the Quarry's alone → won; the
   player's alone → the run ends; **both on the same Hunt → the player loses** (§5, §9, via T1's
   `SIMULTANEOUS_DEPLETION_WINNER`).
5. Surplus damage past a depleted bar is **discarded**, not carried and not converted (§9 Deferred).
   Asserted by test so the discard is a chosen rule rather than an accident of arithmetic.
6. Health never renders or reports as negative; the underlying value clamps at zero at exactly one
   place.
7. There is **no** Hunt cap. An encounter runs as many Hunts as it takes, by choice — the stall is
   the evidence a cap is needed (§11).
8. Vitest covers: a fast-band encounter resolving in 3–4 Hunts at 7–9 tricks; a tail encounter
   running 18–23 Hunts at 0–3 or 10–13 tricks; the exact-simultaneous-depletion case; and the
   `P = H` boundary property at the 6/7 line — 7 tricks a Hunt wins on Hunt 4 with 486 left, 6 tricks
   loses on Hunt 4.
9. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** a new encounter module under `src/hunt/` (pure, inside the lint-enforced no-React
boundary), `src/hunt/types.ts`, `index.ts`, and tests.

**Out of scope:** the health bars on screen (T6), the two-encounter sequence and carry-over (T8), the
CPU (T7), and the Hunts-per-encounter cap `R` (§9 Deferred — out of scope by the epic's own choice).

## Dependencies & Risks

- **Blocked by T3** for `huntDamage`.
- **Session length is a step function, not a dial.** At `H = 1,350` the fast band resolves in 3–4
  Hunts and the tail in 18–23 — up to 299 tricks — with nothing in between (§5, §9,
  `ideas.md` → _Fight length is symmetric about the middle_). AC8's test at the tail will be a
  long-running simulation; keep it seeded and bounded.
- **Overkill matters more here than in §11's slice.** With carry-over (T8), a crushing win and a
  narrow one are worth the same going into encounter 2, which weakens the cost the carry-over exists
  to create. Worth watching in play (T13); not being designed here.
- **Not playable.** No surface until T6.

## Design Assets

`hybrid-design.md` §5 (health, the end conditions, the cap's real job, the `P = H` boundary
property), §6 (pending damage as the catch-up route the equation already pays for), §9 (health rows,
simultaneous depletion, overkill), §11. `ideas.md` → _Fight length is symmetric about the middle,
and bimodal_.

---

### T6 — Two health bars with live pending damage, every trick

**Type:** Story · **Priority:** High · **Labels:** `ui`, `playable` · **Parent:** DLR-65
**Blocks:** T10 · **Blocked by:** T2, T5 · **Skill:** `react-frontend` + `game-ux`

## Problem Statement

The Hunt screen's readouts were built for the retired model — a Demand, running Spoils, a Standing
band, a credits cell — and T2 strips them. What replaces them is **two health bars, each carrying its
side's pending damage, updated every trick**. §6 names this as the catch-up route the equation already
pays for, at zero new rules: because nothing is applied until trick 13, no Hunt is decided until the
last trick, and the player can see that.

§6 also flags the risk plainly: four figures move every trick — both pending totals and both bars —
and whether that reads as tension or as noise is a feel question. The cheap fallback it names is to
show only the **net** pending figure.

## User Story

As a player, I want to watch both health bars and both pending damage totals move as I take tricks,
so that I can see a Hunt turn on the last trick instead of being told the result afterwards.

## Acceptance Criteria

1. Both sides' health bars are on screen for the whole Hunt, each showing current health against its
   configured maximum.
2. Each bar carries its side's **pending** damage, updated after every trick resolves, and the
   pending figure at trick 13 **equals** the damage actually applied — the same function, not a
   parallel calculation (epic DoD 7).
3. Pending damage is visibly not-yet-applied — a player must be able to tell the difference between
   health lost and health at risk.
4. The end-of-Hunt panel shows both sides' `card value × Standing = damage` as arithmetic, then both
   bars moving.
5. No component holds a numeric literal standing in for a multiplier, a band boundary, a health
   total, or a rounding rule. Every number arrives already derived, per this module's existing
   invariant (`.docs/implementation/war-council-ui/README.md`).
6. The screen still obeys the module's standing constraints: full-viewport and non-scrolling, no
   `useEffect`/`useLayoutEffect` anywhere, no `memo`/`useMemo`/`useCallback`, no hex colour in any
   `.tsx`, no `vh`/`vw` unit, every visual value a named CSS custom property.
7. Component tests query by accessible role and label. A screen-reader user can read both bars'
   current and pending values.
8. The net-only fallback §6 names is reachable as a one-line change, not a rewrite — recorded in the
   ticket's summary, not built as a toggle.
9. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass, and
   the layout is checked in a real browser at 1920×1080, 1366×768, 1024×640 and phone portrait.

## Scope Boundaries

**In scope:** new health-bar components under `src/app/warCouncil/`, plus `WarCouncilRound.tsx`,
`RoundStatusBand.tsx`, `HuntLedger.tsx` (reshaped or retired), `RoundOverPanel.tsx`, `labels.ts`,
`roundReducer.ts`, `warCouncilHunt.css`, and their tests. `src/app/warCouncilMount.ts` and
`src/App.tsx` for the prop the bars need.

**Out of scope:** the encounter-transition and run-outcome screens (T9), integration wiring of both
encounters (T10), and the visual polish pass (T11) — this ticket ships a stated **functional**
default and defers visual judgement to T11 explicitly.

## Dependencies & Risks

- **Blocked by T5** for the health and pending-damage functions, **and by T2** because the readouts
  it replaces must be gone first.
- **Whether four moving figures read as tension or noise is the developer's judgement, not this
  ticket's** (§6). The ticket ships all four and names the net-only fallback; the call is a pause
  condition.
- **`jsdom` cannot prove the no-scroll layout.** That check belongs to QA in a real browser at named
  sizes, and it has caught a real defect exactly once — DLR-53 shipped a status band that pushed a
  cell off-screen at phone width with every component test passing.
- **`playable`, and honestly so**: closing this gives a single encounter playable with both bars
  live. The *sequence* is T8/T10.

## Design Assets

`hybrid-design.md` §6 (pending damage, the four-figures risk, the net-only fallback), §5, §11 (both
bars, pending totals per trick). `.docs/implementation/war-council-ui/hunt-readouts-and-telegraph.md`
for the readout layer this replaces. `.claude/skills/game-ux/references/full-viewport-layout.md`.

---

### T7 — The band-position Quarry: a CPU that plays for a target band

**Type:** Story · **Priority:** High · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T10 · **Blocked by:** T1, T4 · **Skill:** `react-frontend`

## Problem Statement

**This is the epic's largest engineering item and the prototype does not answer its own question
without it.** The CPU on disk maximises tricks: leading, it plays its lowest legal card; following,
it plays the lowest card that would win, and ducks only when it cannot win
(`.docs/implementation/war-council/cpu-heuristic.md`). Under the two mirrored tables that is close to
the worst policy available to it — on either declaration it lands near its own `k = 10–13`, where its
multiplier is ×0.5 or ×1, dealing roughly **24–78** against a competent player's **420–540** (§9,
§11).

A Quarry that never plays toward a band never threatens the 6/7 line the declaration commits the
player to. §5 gives it one precise job: **push the player across that line**, away from whichever
side the declaration commits them to.

## User Story

As a player, I want a Quarry that will decline a trick it could have won in order to stay inside its
own band, so that my declaration is a hard read rather than a free option.

## Acceptance Criteria

1. The Quarry plays toward a **target band** rather than maximising tricks: given its current trick
   count, its remaining hand, and the tricks left, it prefers a legal move that moves it toward its
   band and away from overshooting it.
2. Its target band is read **from T1's configuration**, derived from the declaration in force — so
   swapping the table pair changes what it plays for with no rewrite. A test proves it by injecting
   the alternative pair (whose peaks sit at the extremes) and asserting the target moves.
3. **It can be observed declining a trick it could have won.** A test constructs a state where a
   winning legal move exists, the Quarry is at or near its band ceiling, and asserts it plays a
   losing card instead (epic DoD 6).
4. It never plays an illegal move. Legality still comes from `legalMoves` alone — no re-derived
   trump or follow-suit comparison anywhere in the new policy.
5. The intent telegraph still works and still never names the exact card. `quarryIntent` continues to
   derive its `{ suit, stance? }` shape from the same choice function the commit path uses, so the
   preview and the actual play cannot drift (§4's hidden-hand rule).
6. **Ambition level, stated so scope cannot creep to the hardest version:** a stated deterministic
   **heuristic** over the current `RoundState` — no lookahead, no determinized search, no opponent
   hand modelling, no ML. Legal-and-band-aware, not optimal.
7. Both entry points keep guarding their own preconditions. The empty-legal-set trap that crashed
   `quarryIntent` before DLR-52 must not reopen; `chooseCpuCard`'s internal `lowestCard` is still
   `[...cards].sort(...)[0]` and still returns `undefined` on an empty array
   (`.docs/implementation/war-council/README.md`, Deferred). Fixing that at source is welcome here.
8. A seeded multi-round simulation records the Quarry's final trick-count distribution and asserts it
   sits inside its target band materially more often than the trick-maximising policy did.
9. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** `src/warCouncil/cpuPlayer.ts` (or a new policy module beside it),
`src/warCouncil/quarryRuleBreak.ts` if the Monarch's constraint interacts, `index.ts`, and the
`cpuPlayer` / `quarryIntent` tests.

**Out of scope:** the remaining four characters and the boss (§11 — testing five rule-breaks tests
the roster, not the declaration). Any search-based or run-aware CPU. Player-side assistance or
hinting. The Quarry declaring for itself — forbidden by §1.

## Dependencies & Risks

- **This is the schedule risk for the whole epic.** `ideas.md` → _The Quarry deals damage too_
  flagged it first: a CPU that knows when to dump a trick is materially harder to build than the one
  shipping today. If it slips, the prototype still runs but stops answering its own question.
  Reading the target band from configuration is **part of this item, not an extra**.
- **Blocked by T1** (the tables the band target is read from) **and T4** (the pile swap, which
  changes what a captured card is worth to whom on the Lose path — the Quarry's band incentive
  inverts with the declaration).
- **Tuning the Quarry's pressure and the player's health are one number, not two.**
  `ideas.md` → Finding 2 and §12's Problem 1 / Problem 2 coupling both say so: a Quarry tuned hard
  enough to make the declaration costly makes the losing tail longer and more frequent. A tuning that
  improves one while worsening the other by more is a transfer, not a fix. T13 measures both.
- **Not playable.** Observable in the app only after T10; verified by Vitest here.

## Design Assets

`hybrid-design.md` §4 (the Quarry, the Monarch, the visibility table), §5 (the Quarry's job — push
the player across the 6/7 line), §9 (the "not a value — an in-scope deliverable" row), §11 (why the
slice does not work without it), §12 (Problem 1 / Problem 2 coupling). `ideas.md` → _The Quarry deals
damage too_. On disk: `.docs/implementation/war-council/cpu-heuristic.md`.

---

### T8 — The two-encounter sequence: health carry-over and the run-over state

**Type:** Story · **Priority:** High · **Labels:** `engine` · **Parent:** DLR-65
**Blocks:** T9, T12 · **Blocked by:** T5 · **Skill:** `react-frontend`

## Problem Statement

The epic's whole reason for existing is the thing a single encounter cannot exercise: **whether
spending health to win encounter 1 is a real cost.** On §11's slice as written, health is a
per-encounter resource and a Hunt won by a hair is worth the same as one won cleanly. With
carry-over, it is not.

This reverses §7 as written — §7 says health resets each encounter and nothing persists across a run.
That reversal is the developer's decision, recorded on the epic, not this ticket's conclusion.

## User Story

As a player, I want to enter the second encounter with exactly the health I finished the first one
on, so that how cleanly I won matters as much as whether I won.

## Acceptance Criteria

1. A run state sequences two encounters: encounter 1 against 1,350 health, encounter 2 against
   1,600, both read from T1's configured sequence.
2. Winning encounter 1 starts encounter 2 with the player's health at **exactly** the value it ended
   encounter 1 with — no reset, no partial heal, unless `ENCOUNTER_PLAYER_RESTORE` is non-zero
   (epic DoD 2).
3. `ENCOUNTER_PLAYER_RESTORE` is genuinely live: a test sets it non-zero and asserts the carried
   health changes, with no code edit outside the fixture.
4. Emptying the player's bar in **either** encounter ends the run, and both bars emptying on the same
   Hunt is a loss for the player (epic DoD 3).
5. Clearing encounter 2's bar is a prototype win, and the run reaches a terminal state either way —
   no path leaves the run running with no encounter active.
6. Both Quarries run the **Monarch's** round-long rule-break, the only built character; which
   character each encounter draws is read from configuration, not hardcoded at a call site.
7. Vitest covers: a clean win into encounter 2 with high carried health; a narrow win into encounter
   2 with low carried health; a loss in encounter 1; a loss in encounter 2; and a simultaneous
   depletion in each encounter.
8. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** a run/sequence module under `src/hunt/` beside T5's encounter state, `src/hunt/types.ts`,
`index.ts`, and tests.

**Out of scope:** the five-encounter run, the remaining characters, and the boss (§7, §11). Forage
between encounters (§11 — nothing in this epic's question needs the deck editable). Cross-run banked
progress (§7 — power rejected). The outcome screens (T9) and the wiring (T10).

## Dependencies & Risks

- **Encounter 2 may be unwinnable rather than hard, and this is the risk most likely to need
  changing after the first play session.** A player who clears encounter 1 with ~150 health then
  faces 1,600 with no restore. At the design's own figures a Hunt landing at the 6/7 boundary puts
  708 damage on the table across both sides, so a low-health player loses encounter 2 to arithmetic
  rather than to play. **This ticket assumes no restore**, per the epic. The developer's three
  options — no restore, a fixed restore, or a restore proportional to how cleanly encounter 1 was
  won — are all one-line edits because health is a tunable. Flagged as a pause condition for T13.
- **Encounter 2 breaks `P = H` in both directions at once** — the Quarry is up 250 and the player is
  down by whatever encounter 1 cost them — so §5's win/lose boundary no longer sits on the 6/7 line.
  That is by design, and §5 warns explicitly that a rescaling which does not preserve the equality
  moves the boundary. T12 writes it back into the design document.
- **Blocked by T5.**
- **Not playable.** No screen until T9/T10.

## Design Assets

`hybrid-design.md` §5 (`P = H` boundary property, end conditions), §7 (what a run keeps — the section
this reverses), §9 (health rows), §11 (the slice this extends). Epic DLR-65's own Objective table and
Dependencies & Risks.

---

### T9 — Encounter and run outcome screens

**Type:** Story · **Priority:** Medium · **Labels:** `ui` · **Parent:** DLR-65
**Blocks:** T10 · **Blocked by:** T8 · **Skill:** `react-frontend` + `game-ux`

## Problem Statement

T8 produces a run that transitions between encounters and terminates, and nothing renders any of it.
The screen today re-deals silently on completion (`src/App.tsx`), so a player would move from
encounter 1 to encounter 2 with no acknowledgement, and a run would end with no ending.

§7 notes the honest gap here: the direction resolves the *structural* half of "a run has no defeated
opponent" — the Quarry now holds health and a stake — but not the emotional half, and the design has
never named its target emotion. This ticket ships the functional surface and leaves that judgement
to T11 and the developer.

## User Story

As a player, I want to be told I cleared the first Quarry and see what health I am carrying into the
second, so that the cost of how I won is legible before I commit to the next fight.

## Acceptance Criteria

1. An encounter-cleared surface names the encounter won, shows the player's carried health, and
   shows the next Quarry's health, then hands off to encounter 2 on an explicit player action.
2. A run-over surface distinguishes the three terminal states: both Quarries beaten (prototype win),
   the player's bar emptied, and both bars emptied on the same Hunt (a loss for the player, named as
   such rather than shown as a draw).
3. Each surface states the Hunt count for the encounter or run just finished — the raw material T13's
   session-length measurement needs, on screen rather than in a console.
4. Restarting from the run-over surface starts a fresh run at full configured health.
5. Both surfaces obey the module's standing constraints: full-viewport and non-scrolling, no
   `useEffect`/`useLayoutEffect`, no speculative memoisation, no hex colour in `.tsx`, no `vh`/`vw`,
   every visual value a named CSS custom property, no numeric literal standing in for a tunable.
6. Component tests query by accessible role and label; focus lands somewhere useful when each
   surface mounts.
7. A stated **functional** default only — copy and visual treatment are explicitly deferred to T11
   and the developer.
8. `npm run typecheck`, `npm run lint`, `npm run format:check` and the scoped Vitest runs pass.

## Scope Boundaries

**In scope:** new outcome components under `src/app/warCouncil/`, `labels.ts`, the relevant
stylesheet, and their tests.

**Out of scope:** wiring the run into `src/App.tsx` (T10), the polish pass (T11), any sound or
animation beyond what already exists, and naming the design's target emotion (§7, §12 — recorded as
open, not answered here).

## Dependencies & Risks

- **Blocked by T8** for the run state these surfaces read.
- **Not `playable` on close, and the label is deliberately withheld.** These screens are only
  reachable once T10 wires the sequence into the app. Marking them `playable` would be the label
  turning out not to be true, which is worse than none.
- **The run's ending answers the structural half of §7's "no defeated opponent", not the emotional
  half.** Balatro spends its whole climax on the reveal; this design has not claimed that aesthetic
  and would have to build it deliberately. Not proposed here.

## Design Assets

`hybrid-design.md` §5 (end conditions), §7 (what a run keeps; the run has no defeated opponent), §12
(no named target emotion). `.claude/skills/game-ux/references/full-viewport-layout.md`.

---

### T10 — Integration: both encounters playable end to end in the browser

**Type:** Story · **Priority:** High · **Labels:** `ui`, `playable` · **Parent:** DLR-65
**Blocks:** T11, T13 · **Blocked by:** T6, T7, T9 · **Skill:** `react-frontend` + `game-ux`

## Problem Statement

Six tickets build independent pieces — configuration, damage, the pile swap, encounter state, the
health bars, the band-position CPU, the sequence, and the outcome screens — and `src/App.tsx` still
mounts a single round against a module-scope constant and re-deals on completion. This is the ticket
where independently built pieces reveal their interface mismatches, which is why it is scheduled last
among build work.

## User Story

As the developer, I want to open the app and play the whole prototype — encounter 1, then encounter 2
on my remaining health, to a win or a loss — so that the epic's headline question can actually be
measured.

## Acceptance Criteria

1. `src/App.tsx` mounts the run rather than a single round: it holds run state from T8, deals each
   Hunt, applies damage at trick 13, advances encounters, and reaches a terminal state.
2. A player can start the prototype, play encounter 1 against a 1,350-health Monarch, and win or lose
   it **by health depletion rather than by a score comparison** (epic DoD 1).
3. Winning encounter 1 starts encounter 2 against a 1,600-health Quarry at exactly the player's
   remaining health (epic DoD 2).
4. Emptying the player's bar in either encounter ends the run; both bars emptying on the same Hunt is
   a loss (epic DoD 3).
5. Pending damage on both bars updates every trick and equals the applied damage at trick 13
   (epic DoD 7).
6. The band-position Quarry is live in the shipped app — not provable only under Vitest — and its
   declining of a winnable trick is observable by playing.
7. The dealer alternates across Hunts within an encounter, and `dealerForRound`'s placeholder
   first-dealer constant either survives with a stated reason or is replaced by the run's own rule.
8. No screen mentions a Demand, a Spoils target, a credit, or a cleared/missed verdict.
9. The stale `ILLEGAL_MOVE_MESSAGE[MustFollowMonarch]` copy is fixed — it has been factually wrong
   for the round-long trigger since DLR-51 and reachable since DLR-53
   (`.docs/implementation/war-council-ui/README.md`). The reword is the developer's copy call; the
   ticket surfaces the options rather than inventing wording.
10. The full suite, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run build`
    all pass, and the app is driven in a real browser through at least one complete two-encounter run.

## Scope Boundaries

**In scope:** `src/App.tsx`, `src/app/warCouncilMount.ts`, `src/app/dealerForRound.ts`,
`src/app/warCouncil/WarCouncilRound.tsx` and `roundReducer.ts` where the run's props reach them,
`labels.ts`, and the integration-level tests.

**Out of scope:** any new rule, any new screen, the polish pass (T11), and the documentation update
(T12). If a mismatch here needs a rule change, that is a defect ticket against the owning ticket, not
a quiet fix inside this one.

## Dependencies & Risks

- **Blocked by T6, T7 and T9.** T5 and T8 reach it transitively.
- **This is where mismatches surface, and the schedule should expect one.** The likeliest are the
  pending-damage function being read differently by the bar and the applier, and the Quarry's band
  target disagreeing with the declaration the run holds.
- **`playable`, and this is the ticket the developer plans their evening around.** Closing it is the
  first moment the epic's question can be asked of a real session.
- **Session length may make a full run long.** At the tail, two encounters run upwards of 40 Hunts —
  several hundred tricks. There is no cap in scope, by choice. If a QA pass cannot finish a run, that
  is the evidence a cap is needed, recorded rather than worked around.

## Design Assets

`hybrid-design.md` §11 (the slice this extends), §5, §6. Epic DLR-65's Definition of Done 1–3 and 7.
On disk: `.docs/implementation/app/README.md`.

---

### T11 — Visual and experience polish pass on the duel surface

**Type:** Story · **Priority:** Low · **Labels:** `ui`, `playable` · **Parent:** DLR-65
**Blocks:** T13 · **Blocked by:** T10 · **Skill:** `game-ux` + `react-frontend`

## Problem Statement

T6 and T9 ship stated functional defaults and defer visual judgement explicitly. "It works" is not
"it looks decent," and an epic whose deliverable is a playable prototype reads as unfinished when
every functional AC passes and nothing has had a deliberate pass over spacing, colour, state and
motion.

There is also a concrete list of known visual and pacing debt already recorded, which this pass is
the natural home for.

## User Story

As the developer, I want one deliberate pass over the duel surface's spacing, colour, interactive
states and motion, so that the prototype I put in front of a playtester reads as a game rather than
as a wired-up test harness.

## Acceptance Criteria

1. The two health bars, their pending-damage treatment, and the end-of-Hunt arithmetic get a
   deliberate pass: whether health lost and health at risk are distinguishable at a glance, whether
   four moving figures read as tension or as noise, and whether the net-only fallback §6 names should
   be taken.
2. The encounter-cleared and run-over surfaces get their copy and treatment reviewed and set — this
   is where T9's deferred copy judgement lands.
3. The known debt list is worked through, each item either fixed or explicitly left with a reason:
   the telegraph's redundant "Waiting on your lead" line beside a finished panel; the opening
   two-tap sequence on trick 1 (the declare gate's tap plus "Let them lead"); the mid-round hand
   re-order; and the `prefers-reduced-motion` suppression of the declare option's hover lift, which
   has only been checked statically.
4. Interactive states are complete and consistent across every new control: hover, focus-visible,
   active, disabled.
5. Motion honours `prefers-reduced-motion`, as everything already shipped does.
6. Every visual value stays a named CSS custom property or a named constant; no hex colour enters any
   `.tsx`; no `vh`/`vw` unit enters `src/`.
7. Layout is verified in a real browser at 1920×1080, 1366×768, 1024×640 and phone portrait, with no
   scroll and no crop.
8. `npm run typecheck`, `npm run lint`, `npm run format:check`, the full suite, and `npm run build`
   all pass.

## Scope Boundaries

**In scope:** `src/app/warCouncil/`'s stylesheets and the components' presentational layer,
`labels.ts` copy, `fanLayout.ts` constants, and the component tests that assert accessible names.

**Out of scope:** any rule, any engine file, card art (a separate ticket per
`.docs/implementation/war-council-ui/README.md`), a light theme (the shell is deliberately dark-only),
and sound.

## Dependencies & Risks

- **This ticket is a pause condition by construction.** Visual and copy judgement is the developer's
  — `CLAUDE.md` says so, and nobody in the pipeline decides a tuning value or a design reading on
  their own authority. The implementer's job is to surface options and implement the chosen one.
- **Blocked by T10**, because polishing a surface before the pieces are wired means polishing twice.
- **Every visual constant on disk is still a transcribed default, not a final value** — the
  felt/brass/parchment palette, the three suit hues, the `clamp()` card-size bounds, the fan's
  rotation step, lift factor and overlap, the card border width, the suit mark's corner offset, and
  the rank direction within a suit. All are the developer's to retune, and this is the ticket to do
  it in.
- **`playable`** — the whole point is that it is judged by playing.

## Design Assets

`hybrid-design.md` §6 (the four-figures risk and the net-only fallback), §7 (the run's ending), §10
(vocabulary, and the band-name mismatch that is a copy judgement), §12 (no named target emotion).
On disk: `.docs/implementation/war-council-ui/layout-and-styling.md`,
`.docs/implementation/war-council-ui/README.md`'s Deferred list.
`.claude/skills/game-ux/references/full-viewport-layout.md`.

---

### T12 — Update hybrid-design.md and the-hunt.md to the shipped duel rules

**Type:** Task · **Priority:** Medium · **Labels:** `design` · **Parent:** DLR-65
**Blocks:** T13 · **Blocked by:** T4, T8 · **Skill:** `implementation-doc-writer`

## Problem Statement

This epic knowingly departs from the design document in two places, and the document currently says
the opposite of what will ship. A reader who trusts it will be misled:

- **§7 states health resets each encounter and nothing persists across a run.** T8 reverses that.
- **§5 and §9 state that `P = H` is what puts the encounter's win/lose boundary exactly on the 6/7
  line**, and warn that a rescaling which does not preserve the equality moves that boundary.
  Encounter 2 breaks the equality in both directions at once, so the boundary sits against the player
  by design.

Two more updates fall out of the epic: the **rounding decision** (§9 records it Undecided) and the
**unequal Quarry health totals** (new to this epic). And `.docs/game_rules/the-hunt.md` — the game's
playable ruleset — has to match the shipped procedure, since the Demand, Spoils and the capped
Lose-credits it currently documents are all retired.

## User Story

As anyone reading the design or the rules six months from now, I want the documents to describe the
game that shipped, so that I do not build on a rule the code reversed.

## Acceptance Criteria

1. `hybrid-design.md` §7's health-resets-each-encounter statement is corrected to cross-encounter
   carry-over, with the reversal attributed to this epic's decision and dated — recorded, not argued.
2. §5 and §9's `P = H` boundary property is kept as the property it is, and annotated with what
   encounter 2's unequal totals do to it: the boundary moves against the player, deliberately.
3. §9's rounding row moves from **Undecided** to **Decided**, recording the direction actually
   shipped and the alternative (doubling both tables and both health totals) as the discarded branch
   with its reason — epic DoD 9.
4. §9 gains the unequal Quarry health totals (1,350 and 1,600) and the restore decision, each dated
   and attributed to the developer.
5. `.docs/game_rules/the-hunt.md` matches the shipped procedure end to end: the declaration pre-Hunt
   after the deal, both card-value schemes, the pile swap, two-sided damage once at trick 13, health
   and the encounter end conditions, the two-encounter sequence with carry-over, and no Demand,
   Spoils target, or Lose-credit anywhere. Every rule marked `[settled]` / `[provisional]` / `[open]`
   / `[not built]`, organised in playing order, citing `hybrid-design.md §N` rather than reproducing
   its reasoning.
6. The band-name mismatch §10 flags — Humble / Defeated / Victorious / Greedy misdescribing the Lose
   path — is carried forward as a recorded open copy judgement, **not** resolved. §10 says the names
   stand and the call is the developer's.
7. `.docs/implementation/` is updated for every module the epic touched, per the pipeline's normal
   `/fb-apply` behaviour — this ticket owns the two game-facing documents, and names the
   implementation docs so the boundary is explicit.
8. No section of `hybrid-design.md` still contradicts the shipped rules on health persistence or
   unequal Quarry health (epic DoD 10).

## Scope Boundaries

**In scope:** `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` §5, §7, §9, §10 and §11's
slice inventory; `.docs/game_rules/the-hunt.md`.

**Out of scope:** `.docs/design/Balatro-Forbidden-Solitaire/ideas.md`'s superseded entries — that
file's own rule is to annotate rather than rewrite, and the annotations are already in place.
`.docs/game_rules/fox-in-the-forest.md` (the base game's transcribed rulebook, which nothing in the
pipeline maintains). Any code file. Propagating a naming decision into `CLAUDE.md` — §10 says that is
the developer's to authorise separately.

## Dependencies & Risks

- **Blocked by T4 and T8** — the rounding decision and the carry-over must actually be built before
  they are written up as shipped. Writing them first would put the document back in the state this
  ticket exists to fix.
- **`the-hunt.md` is the ruleset, not a changelog.** No per-ticket section, no function names outside
  its Status register, and it is `implementation-doc-writer`'s to own — never edited by hand.
- **Whatever the prototype settles on has to be written back into the design document, not left
  living only in a config file.** The epic says this explicitly about the table pair: the band names
  and §5's statement of the Quarry's job both stop being accurate under a table whose peaks sit at
  the extremes.
- **No code, so no reviewers.** A docs-only contract gets no code-evaluator, defender, or QA
  dispatch.

## Design Assets

`hybrid-design.md` §5, §7, §9, §10, §11. `.docs/game_rules/the-hunt.md`. `CLAUDE.md`'s three-doc
split table and `.claude/skills/implementation-doc-writer/SKILL.md`.

---

### T13 — Epic verification: Definition of Done end to end, and the trick-count distribution

**Type:** Task · **Priority:** Medium · **Labels:** `spike` · **Parent:** DLR-65
**Blocks:** — · **Blocked by:** T10, T11, T12 · **Skill:** none — verification and developer judgement

## Problem Statement

Every prior ticket verifies its own acceptance criteria. Nothing verifies DLR-65's ten Definition of
Done items **as a whole, against the real integrated prototype** — and three of them are not
re-statements of any per-ticket test: that a table swap is genuinely a one-file edit, that the Quarry
can be *observed* declining a winnable trick, and that the design documents no longer contradict the
shipped rules.

This is also where the epic's own question gets asked. §11's kill criterion is a measurement, not an
opinion: whether a playtester who declares and watches both pending bars move still reports the
declaration as a coin flip they were not equipped to make. And `ideas.md` names a second measurement
this run produces for free — the distribution of final trick counts, which is the evidence for
whether the Hunts-per-encounter cap is needed at all.

## User Story

As the developer, I want one closing pass that checks the epic's own Definition of Done against the
running prototype and records what the first sessions actually measured, so that I know whether this
direction is worth continuing before anything else is built on it.

## Acceptance Criteria

1. All ten of DLR-65's Definition of Done items are checked against the deployed, integrated
   prototype and recorded pass or fail with evidence — not inferred from per-ticket ACs.
2. **DoD 5 is exercised for real:** swap in the epic's alternative table pair, change one file,
   update only its expected-value fixtures, and confirm the suite passes and the whole damage
   enumeration changed. Then change a health total, and then the rounding rule, each confirming a
   single-file edit. Revert afterwards.
3. **DoD 6 is exercised by playing:** observe the Quarry declining a trick it could have won, and
   confirm it follows the configured table rather than a hardcoded band by swapping the pair and
   watching what it plays for change.
4. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` all
   pass on a clean checkout (DoD 8). **Never recorded as `N/A`** while TypeScript files are in the
   diff.
5. At least one complete two-encounter run is played to a win and one to a loss, with the final trick
   count of **every** Hunt recorded and the distribution plotted — the measurement `ideas.md` and §9
   both name as the evidence for whether the cap `R` is needed.
6. The Hunt count per encounter is recorded, against §5's prediction: 3–4 Hunts inside the 4–9 band,
   18–23 outside it, nothing in between.
7. §11's kill criterion is run and its answer recorded: does the declaration read as a live read, and
   does the Monarch make it a hard one — across a small sample rather than one round.
8. Encounter 2's winnability is judged and recorded: hard, or unwinnable to arithmetic. If
   unwinnable, the restore option chosen is recorded as a developer decision, and the config edge
   proven cheap in AC2 is the fix.
9. Every finding that needs code becomes its own ticket rather than being fixed inside this one.

## Scope Boundaries

**In scope:** running the gates, driving the app in a real browser, the table/health/rounding swap
exercise, playing full runs, and writing up the findings and the measurements.

**Out of scope:** writing production code, changing a tuning value on this ticket's own authority,
and re-running the per-ticket unit tests as a substitute for end-to-end verification.

## Dependencies & Risks

- **Blocked by T10, T11 and T12** — verifying against an unpolished or undocumented prototype would
  measure the wrong thing for two of the ten DoD items.
- **This ticket is a pause condition throughout.** Every question it asks — does the declaration read
  as a live read, is encounter 2 hard or unwinnable, should the cap exist, should the table pair
  change — is the developer's judgement at the app, not a verdict any agent reaches. QA can drive the
  browser; judging how it feels cannot be delegated.
- **A full run at the tail may take several hundred tricks.** If a session cannot be finished, record
  that as the finding — it is precisely the evidence the cap is needed, collected for free rather
  than guessed at.
- **The kill criterion is a real exit.** §11 says plainly: if the declaration reads as a coin flip
  the playtester was not equipped to make, no amount of tuning health, the cap, or Forage repairs it,
  because all three operate one level above the choice being tested. That is the condition for
  abandoning this direction rather than tuning it — and this ticket is where that gets said out loud
  if it is true.

## Design Assets

`hybrid-design.md` §11 (the one question the slice answers, and the kill criterion), §12 (what to
measure — all three items), §5 and §9 (session length as a step function). `ideas.md` → _Fight length
is symmetric about the middle, and bimodal_ (what would prove it wrong, and what to measure), _The
declaration as a free option_. Epic DLR-65's Definition of Done 1–10.

---

## Phase 5 notes for `/management-jira`

- **Create in order T1 → T13**, so every blocker already has a real key when its link is made.
- **Every ticket takes `parent: DLR-65`.** DLR-65 is an Epic (`issuetype.id` 10001), confirmed live.
- **Assignee:** the developer asked for all thirteen assigned to them —
  `assignee_account_id: "712020:1c5972ae-8cc9-4b30-a54d-edaab9e366d3"` (Joss Duffy). Note this is
  outside `management-jira`'s normal remit, which forbids assignee edits; it is an explicit
  developer instruction for this run.
- **Sprint — all thirteen set to id 101** ("SCRUM Sprint 4", `state: active`, board 1). The field is
  `customfield_10020`; `editJiraIssue` takes it as a **bare scalar** (`{"customfield_10020": 101}`),
  `createJiraIssue` as a single-element array.

  **How the id was obtained, because this is the reusable part.** It could not be looked up: no issue
  in DLR had a sprint, so `sprint in openSprints()` returned nothing to read an id off, and this MCP
  exposes no board or sprint API (`fetch` takes only issue/page ARIs, not arbitrary REST paths). The
  Chrome extension was not connected, so the Sprint Report page could not be read either. **The
  developer moving one card (DLR-66) into the sprint by hand solved it outright** — `getJiraIssue` on
  that one issue then returns the full sprint object, and the remaining twelve were set in one
  parallel pass. Ask for that single manual move first next time.

  **Do not walk the id range.** Roughly eighteen probe calls established only that id 1 exists and is
  closed and ids 2–18 do not exist. The live sprint was **101**. Ids are a tenant-wide,
  non-contiguous sequence and bear no relation to the sprint's name — "Sprint 4" is id 101, not 4.

  Two error strings make `editJiraIssue` the right probe if one is ever needed:
  `"We could not find the sprint"` = no such sprint; `"Issue can be assigned only active or future
  sprints."` = exists but closed. `createJiraIssue` collapses both into
  `"Specify a valid value for Sprint"`, and a JQL probe is useless — `sprint = <id>` returns an empty
  result for a nonexistent id rather than erroring.
- **Priority is available on create in this project**, confirmed live from
  `getJiraIssueTypeMetaWithFields` (Highest → Lowest, default Medium). An older project note claiming
  priority is absent from the create screen is out of date — DLR-65 itself carries High.
- **`fixVersions`:** none exist in this project; omit the field.
- **Link direction:** `Blocks` is link type id `10000`, `inward: "is blocked by"`,
  `outward: "blocks"`. Per `createIssueLink`'s own contract, **`inwardIssue` is the blocker and
  `outwardIssue` is the blocked issue.** Confirm live before linking anyway.
- **Labels** are as tabulated. Epics carry none; DLR-65 already has none.
