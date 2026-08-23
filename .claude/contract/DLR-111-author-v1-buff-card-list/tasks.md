# Tasks: Author the v1 buff card list from the template grid

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Gate note.** `plan.md` was **not developer-confirmed**. This contract runs inside an unattended sprint run whose dispatch explicitly overrides the `AskUserQuestion` approval gate and instructs the planner to take its own stated default for every open question. No mockup was built (non-UI work), so no mockup was auto-approved unseen. Every default taken is recorded in `.claude/sprint-runs/2026-08-23-sprint/log.md`.

**Goal:** Finish the developer's draft v1 buff list into a named, AP-costed, tier-complete card list with `MAX_REFUND_PER_HAND` set and the `buffCatalog.ts` shape gaps stated, so DLR-108 and DLR-112 build against real content.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** *(none — no new files)*

**Modified:**
- `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — rewritten in place: naming scheme, per-card AP costs, `MAX_REFUND_PER_HAND`, Cheat/Timebomb added, the six open items resolved, and a code-shape alignment section.
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — append the `## DLR-111` section with every default taken and the full costed table.

**Deleted:** *(none)* — `DLR-111-v1-buff-list-review.txt` is retained as the developer's provenance record for the ship/no-ship calls.

**Developer decides or observes:**
- All 78 templates' AP costs — agent-chosen under this run's override of the tuning-value pause. The cost formula is two small tables; retuning is a two-number change, not 78.
- `MAX_REFUND_PER_HAND = 6` — set equal to `STARTING_AP` on the argument that a refund engine should at most double a hand's budget. Unplayed.
- Whether Ward silver/gold survive at all — identical in effect to bronze while `DAMAGE_PER_HIT = 1`.
- Whether the bronze AP-refund card stays net-zero, or the refund ladder rises to 2/3/4.
- Whether Miser (≥N coins) ships — it pays an in-hand reward for a run-long behaviour and fights the shop.
- Whether gold Cheat stays at 7 AP (unplayable before the `+5 AP` capacity item) or drops to 6 AP with a shorter duration.
- All card names — copy, offered rather than settled.

---

## Phase 1 — Author the finished list

One phase, because the deliverable is one document and a half-rewritten card list is not a safe stopping point — a reader could not tell which costs were authored and which were still missing. The phase ends with the document internally consistent: every card named, every card costed, every count summing to the stated pool total.

### Task 1: Rewrite `v1-buff-card-list.md` into the finished, costed v1 list ✓

- Skill: `game-designer`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` (full rewrite in place)

- [x] **Step 1: Load the design skill and re-read the two source documents**

Read `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` (the draft) and `DLR-111-v1-buff-list-review.txt` (the developer's ship/no-ship reasoning) in full before writing. The draft's three-category taxonomy, per-template card counts, reward pairings and reward tier magnitudes are **inputs, not questions** — preserve every one except open item 5, which `plan.md` Risks explicitly re-decides.

- [x] **Step 2: Write the naming scheme and the cost model sections**

The document opens with the developer's existing preamble and reward master tier list unchanged, then gains two new sections before the template tables:

A **naming scheme** section: a family word per condition template (`Taker`, `Feeder`, `Mark of the <rank>`, `Sidestep`, `Glutton`, `Hoarder`, `Unbloodied`, `Long Fall` (deferred), `Debt Collector`, `Keepsake`, `Miser`, `Cornered`) crossed with a reward suffix (`Blade` = flat damage, `Purse` = coin, `Second Wind` = AP refund, `Momentum` = multiplier). Suit-parameterised families prefix the suit: `Bell-Taker (Momentum)`.

A **cost model** section stating the formula verbatim from `plan.md` Part 2 → Data shapes:

```
apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)

REWARD_BASE          bronze  silver  gold
  flat damage           1       2      3
  coin                  2       3      4
  AP refund             1       1      1
  multiplier            2       3      5

CONDITION_MODIFIER   Taker 0 · Feeder +1 · Mark-of-rank -1 · Sidestep -1 · Glutton 0
                     Hoarder 0 · Unbloodied 0 · Debt Collector +1 · Keepsake 0
                     Miser -1 · Cornered -1
```

State the calibration in prose: `STARTING_AP = 6` refreshing per hand; the design doc's own `3 AP` working figure is one standard buff; the bank counts tricks and the multiplier climbs 1 per trick taken and cashes as their product, so at a typical bank of 3 a `+2 multiplier` is worth about 6 damage where `+1 damage` is worth 1 — which is *why* multiplier and coin carry a surcharge over flat damage. State that the condition modifier is a **discount for unreliability**, not a surcharge for difficulty.

Mark the whole section **agent-chosen, 2026-08-23, under DLR-111's sprint-run override of the tuning-value pause** — not a developer decision, unlike the reward magnitudes above it.

- [x] **Step 3: Add the AP-cost column to every condition-template row**

Expand the condition-template table so each template carries its family name and one costed row per reward it crosses with. Costs, computed from the formula in Step 2:

| Family | Template | dmg B/S/G | coin B/S/G | refund B/S/G | mult B/S/G |
|---|---|---|---|---|---|
| Taker | Win a trick with suit S | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Feeder | Lose a trick with suit S | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 |
| Mark of the *R* | Win a trick with rank R | 1/1/2 | — | — | 1/2/4 |
| Sidestep | Dodge a skull with this card | 1/1/2 | — | — | 1/2/4 |
| Glutton | Eat a skull with this card | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Hoarder | Reach a bank of N (2/3/4) | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Unbloodied | Survive N tricks unhit (2/3/4) | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 |
| Debt Collector | Apply Damage this hand | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 |
| Keepsake | Hold suit S at hand's end | — | 2/3/4 | — | — |
| Miser | Have >= N coins (5/10/20) | 1/1/2 | — | — | 1/2/4 |
| Cornered | Below N% health (60/45/33) | 1/1/2 | — | — | 1/2/4 |

Each row carries **one sentence** on why that cost is right relative to its neighbours — the ticket's own bar. Feeder costs a point more than Taker at every cell because you can always throw away a trick in a suit you hold, so it fires close to every hand; Mark-of-rank and Sidestep cost a point less because both need a card or an event the player does not control.

- [x] **Step 4: Add the consumables table with costs, and add Cheat and Timebomb**

| Card | Effect | Tiers B/S/G | AP cost B/S/G |
|---|---|---|---|
| Ward | Single-use shield, absorbs up to N on the next hit, then breaks | 1/3/5 absorbed | **2/2/2** |
| Puppeteer | Pick which of the opponent's legal moves they must play | single tier | **4** |
| Second Thoughts | Extra discard charges this fight | +1/+2/+3 | 2/3/4 |
| Foresight | Peek the draw pile | 1/3/5 cards | 1/2/3 |
| Spyglass | Rule out N candidates of a chosen suit | 1/2/3 ruled out | 2/3/4 |
| Cheat | Follow-suit lifted for N tricks | 1/2/3 tricks | **3/5/7** |
| Timebomb | Delayed hit: N to the Quarry, N/2 to you | 4/8/12 vs 2/4/6 | **2/2/2** |

State the three flat-cost or off-curve justifications explicitly, because each is a design claim rather than an arithmetic one:

- **Ward is flat at 2 AP** because `DAMAGE_PER_HIT = 1` makes absorbing 1, 3, or 5 the same outcome against every hit the game currently deals. Charging more for a better reel would tax the player for luck that buys nothing.
- **Cheat's gold is 7 AP, above `STARTING_AP = 6`** — deliberately unplayable until the `+5 AP` capacity item is bought. This is the costing pass design doc §3 asked for on "three tricks of no-follow-suit is close to a guaranteed run of wins".
- **Timebomb is flat at 2 AP** because its tier price is paid in health (2/4/6 of a 10-point bar), not AP. This **agrees with `TIMEBOMB_TIER_MULTIPLIER = {1,2,3}`** rather than implying a different curve — stated because DLR-111's dispatch asks for a disagreement to be surfaced if one exists, and none does.

Add Cheat and Timebomb to the pool total with a note that the developer's draft omitted them, that design doc §1 folds both into the buff pile, and that `src/hunt/buffCatalog.ts` already mints them as `Buff` objects — so DLR-112's `REEL_POOL_SIZE` is understated by two without them. New total: **71 condition + 7 consumable/activated = 78 distinct card templates.**

- [x] **Step 5: Set `MAX_REFUND_PER_HAND` and resolve the six carried-forward open items**

Replace the draft's `MAX_REFUND_PER_HAND: TBD` with **6**, and state the reasoning: equal to `STARTING_AP`, so a hand can at most double its budget and a refund chain cannot fund an unbounded number of activations. Note it is a design-doc figure only — DLR-108 is the ticket that creates the `config.ts` key. This satisfies AC4.

Resolve each of the five remaining open items with the reading taken and one line of reason: passive buff stacking stays a separate ticket; combo template #16 stays excluded either way pending that ticket; Hoarder and Unbloodied keep all four rewards (both are hand-shaped goals, so all four payoffs read naturally) — flagged as overturning the developer's "worth a second look"; and record the three weakest items (Ward silver/gold, the net-zero bronze Second Wind, and Miser) so the developer's review starts there.

- [x] **Step 6: Add the code-shape alignment section**

A closing section stating exactly where the list fits `src/hunt/buffCatalog.ts` and `src/hunt/buffs.ts` and where it does not, per `plan.md` Part 2 → Data shapes: three ordinary widenings (`BuffKind` gains a member per family; `BuffRewardAxis` gains `Coins`, `ApRefund`, `Multiplier`, `CardsRevealed`, `CandidatesEliminated`, `DiscardCharges`, `DamageAbsorbed`, `None` — which DLR-105's own comment already anticipates; the bronze/silver/gold `BuffTier` ladder fits unchanged), one genuine misfit (`BuffCondition` is `{ kind: string }` with no payload, but Taker/Feeder/Keepsake are suit-parameterised and Mark-of-rank is rank-parameterised — recommend an optional `target` payload over baking 33 suits into `BuffKind`, with the reason), and one missing field (`Buff` carries **no** `apCost`, verified as 0 hits in `buffs.ts` and `buffCatalog.ts`, so every cost this list authors has no home on the type today — DLR-108's first job).

Also record that DLR-107's deferred AC3 leaves Cheat and Timebomb existing twice (the live felt mechanic and the inert `buffCatalog.ts` representation), and that **this list targets the `buffCatalog.ts` representation**.

- [x] **Step 7: Verify the document is internally consistent**

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\v1-buff-card-list.md | Select-String -Pattern "TBD|TODO|\bN/A\b"`
Expected: zero hits — no cost, tier, or constant left unfilled. (`MAX_REFUND_PER_HAND` must now read `6`, not `TBD`.)

- [x] **Step 8: Confirm the pool total still sums**

Run: `(Get-Content .docs\design\Balatro-Forbidden-Solitaire\v1-buff-card-list.md).Count`
Expected: a non-zero line count, and the per-template counts in the condition table sum to 71 (12+12+22+2+4+4+4+4+3+2+2), plus 7 consumable/activated templates = 78. Re-add the column by hand rather than trusting the draft's carried-over subtotal — a stale total silently mis-sizes DLR-112's reel.

---

## Phase 2 — Log the run

The sprint run's log is the developer's batch-review surface, and this ticket's whole output is numbers they must review. The log carries the full costed table so the list can be reviewed without opening the design doc.

### Task 2: Append the DLR-111 section to the sprint-run log ✓

- Skill: `none — a plain Markdown append to a run log, no code and no design decision`

**Files:**
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md` — append `## DLR-111 — Design: author the v1 buff card list`

- [x] **Step 1: Append the section**

Record: every plan default taken (the gate override, the mockup skip as non-UI, and each of the six open-item resolutions); the compact table of every card family, its tiers and its AP costs at bronze/silver/gold; `MAX_REFUND_PER_HAND = 6`; the three least-confident items with reasons; and the four `buffCatalog.ts` shape gaps DLR-108 and DLR-112 inherit.

Do **not** touch the `**Progress:**` line in the log header — the sprint coordinator owns it.

- [x] **Step 2: Confirm the header was not disturbed**

Run: `Select-String -Path .claude\sprint-runs\2026-08-23-sprint\log.md -Pattern "^\*\*Progress:\*\*"`
Expected: exactly one hit, unchanged from before this task ran.

---

## Phase 3 — Final verification

No production changes — this contract ships no code at all. The gates run anyway, because the sprint run's bar is four green gates per ticket regardless of whether the diff touches `src/`, and because a docs-only ticket is exactly when a pre-existing red gate would otherwise be missed.

### Task 3: Confirm no source file was touched ✓

- Skill: `none — a verification grep, no code written`

**Files:**
- (no files modified — verification only)

- [x] **Step 1: Confirm the working tree holds no `src/` change**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src`
Expected: no output. This contract's file map contains no `src/` path, so any hit is out-of-scope work to revert.

### Task 4: Static gates and full suite ✓

- Skill: `none — running the project's verification commands, no code written`

**Files:**
- (no files modified — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports **1089 passed of 1089, 0 failed**, across 86 files — the run's stated baseline. Any failure is out-of-baseline and blocks the commit.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 5: Update the PR description ✓

- Skill: `none — a plan-folder document, no code`

**Files:**
- Create: `.claude/contract/DLR-111-author-v1-buff-card-list/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include: a link to `plan.md` in this folder; a summary of what the list now contains; the full list of agent-chosen tuning values the developer must review (all 78 costs, `MAX_REFUND_PER_HAND`, every card name); the three weakest items; the four `buffCatalog.ts` shape gaps DLR-108 and DLR-112 inherit; and the four gate results with numbers.

---

## Self-review

**Spec coverage:**
- Finished list, each card naming condition template, reward template and tier progression (AC1) — Task 1, Steps 2–4.
- Force-a-card ships as a one-shot consumable (AC2) — Task 1, Step 4 (`Puppeteer`, single tier, 4 AP).
- "Lose the next N tricks" deferred with reason (AC3) — Task 1, Step 3 (family named `Long Fall`, marked deferred, not costed) and Step 5.
- `MAX_REFUND_PER_HAND` stated as a named, retunable constant (AC4) — Task 1, Step 5.
- Written to `.docs/design/Balatro-Forbidden-Solitaire/` as one authoritative source (AC5) — Task 1, rewrite in place.
- Fits `buffCatalog.ts`'s shape or states with reasons where it must not (dispatch) — Task 1, Step 6.
- Every buff named, costed, and justified against its neighbours (dispatch) — Task 1, Steps 2–4.
- Weakest items flagged for the developer's review (dispatch) — Task 1, Step 5; Task 2, Step 1.
- Four gates run and reported green even with no code (dispatch) — Task 4.
- Log section with the full costed table, `**Progress:**` untouched (dispatch) — Task 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every cost figure is stated numerically in the task steps themselves, so the executor transcribes rather than invents. Task 1 Step 7 greps the output for the same patterns.

**Type / name consistency:** `MAX_REFUND_PER_HAND`, `STARTING_AP`, `DAMAGE_PER_HIT`, `TIMEBOMB_TIER_MULTIPLIER`, `BuffKind`, `BuffRewardAxis`, `BuffCondition`, `BuffTier`, `apCost`, and the twelve family names plus four reward suffixes are used identically in `plan.md` Part 2 and in every task step above. The pool total is 78 in both files.

**Phase boundary cleanliness:** Phase 1 ends with one document rewritten whole and self-consistent (Steps 7–8 verify it), and no source file touched, so the project type-checks exactly as it did at `c43253f`. Phase 2 ends with an append-only log edit, which cannot break a build. Phase 3 makes no changes at all — it only verifies, so it cannot leave the tree half-applied.
