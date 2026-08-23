# Tasks: Cost the passive buff-stacking resolution rule

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Not developer-confirmed.** This contract runs inside the 2026-08-23 unattended sprint run. The
> `AskUserQuestion` gate on `plan.md` was not presented; the plan's own stated defaults were taken for
> every open question and each is recorded in `.claude/sprint-runs/2026-08-23-sprint/log.md`. No
> mockup gate applies — the work is not UI-classified.

**Goal:** Turn the Raw "passive buff stacking" idea into a decided, numbered, hand-wide resolution
rule — per-axis, additive, ordered, capped, with a stated firing cadence and contradiction rule — and
write it into the three design documents that own it, so DLR-108 and DLR-125 can build against it.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files; a fourth document would give each fact a second home)

**Modified:**
- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — new §5 subsection carrying the argued
  rule, its four caps, the worked example, and the degenerate-case containment proof
- `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — reconcile templates #13–16, add
  the three new caps beside `MAX_REFUND_PER_HAND`, add the firing-cadence column, add `Keepsake` as a
  fourth weak item, add the accumulator note to the code-shape section
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — move the "Passive buff stacking" entry from
  Raw to Promoted, recording that the ×count arithmetic was rejected and what replaced it
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — append the DLR-124 section (run bookkeeping)
- `.claude/contract/DLR-124-cost-the-passive-buff-stacking-rule/pr-description.md` — created by
  Task 7 (contract bookkeeping, not a project deliverable)

**Deleted:** (none)

**Developer decides or observes:**
- `MAX_MULTIPLIER_BONUS_PER_HAND = 6` — agent-chosen. Caps how much bought multiplier a hand can add.
  Trades a contained ceiling (72 damage, the one-Whetstone perfect hand) against ever feeling an
  uncapped jackpot.
- `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12` — agent-chosen. A third of a perfect hand's 36. Trades "Blade
  can finish a hand" against "Blade can replace the streak".
- `MAX_COIN_BONUS_PER_HAND = 10` — agent-chosen. One gold Purse. Trades shop-progression pace against
  coin inflation on the only run-permanent axis.
- The Overlap Bonus magnitude — `k − 1` Momentum on a trick where `k ≥ 2` buffs fire — and the
  decision to draw it from the same pool as Momentum buffs rather than giving it its own cap.
- The **event / threshold / terminal** firing cadence. Reversing it to once-per-hand for every family
  would remove the need for the multiplier cap but contradicts `v1-buff-card-list.md`'s shipped cost
  model. This is the second-largest lever in the contract.
- Whether the resolution order really is *forced* by the cost model's pricing, as the doc argues, or
  is an open choice.
- The `Keepsake` template's wording. Flagged as possibly unfireable (`HAND_SIZE = 6` and six tricks
  leaves an empty hand at hand's end); the contract reports it and invents no rewording.
- Whether `Miser` and `Cornered` are correctly classified as threshold rather than event conditions.
- Whether a follow-up ticket should be opened for the UI that shows a stacked resolution to the
  player. Not opened by this contract.

---

## Phase 1 — The rule, argued into the design treatment

The whole decision lands in one new subsection of `hybrid-design.md` §5, which is the section that
owns buffs and escalation. This phase is a safe stopping point on its own: after it, the rule exists
and is citable, and the other two documents' edits are references to it rather than restatements. No
code is touched in any phase of this contract, so "type-checks cleanly" holds trivially throughout.

### Task 1: Write the resolution rule into `hybrid-design.md` §5 ✓

- Skill: `game-designer`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — append a new `###` subsection
  at the end of §5 "Escalation", before the `## 6. Catch-up` heading (§5 opens at line 591, §6 at
  line 686 as read at planning time; re-locate by heading text, not by line number)

- [x] **Step 1: Read the three arithmetic sources the rule is checked against, before writing a number**

Read, in this order:
- `.docs/game_rules/the-hunt.md` §7 — "The bank", "The streak multiplier", the `n × n` table, the
  Whetstone table, and "Applying damage".
- `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — the reward master tier list, the
  family-word and reward-suffix tables, the AP cost table, and "#13–16 held back".
- `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — the Raw entry "Passive buff stacking —
  co-triggering buffs sum then multiply by count", including its 2→12 / 3→36 / 5→125 table.

Expected: the four axis names, the eleven family words, the natural six-trick multiplier ceiling of 6,
the perfect-hand figure of 36, and the one-Whetstone perfect-hand figure of 72 are all confirmed
present in those documents before any of them is quoted.

- [x] **Step 2: Write the subsection, in seven parts, in this order**

Heading: `### Resolving several buffs on one trick — the stacking rule`. Marked with the same
agent-chosen blockquote `v1-buff-card-list.md`'s "The cost model" section uses, naming DLR-124's
sprint-run override of `CLAUDE.md`'s tuning-value pause.

The seven parts, each of which the plan's Approach section derives:

1. **Why "sum the rewards" has no arithmetic.** The four axes — Blade (flat damage), Purse (coins),
   Second Wind (AP), Momentum (multiplier) — are incommensurate units, so no scalar "reward total"
   exists and the `ideas.md` table's "avg reward each: 3, 4, 5" quietly invents one. Verdict on AC3:
   the table is rejected on definition before magnitude.
2. **R1–R2, the combination rule.** Resolution is per-axis; contributions within an axis **add**.
   State the two rejected alternatives by name: multiply (cubic, because the cash-out is already a
   product) and take-the-highest (makes the second card on an axis worth zero, so a wide loadout
   becomes strictly worse than a tall one).
3. **R3, the resolution order** — the five-step per-trick pipeline: Second Wind → Momentum →
   the cash-out product → Blade → Purse. State that the order is *forced* by
   `v1-buff-card-list.md`'s cost model, which prices multiplier above flat damage precisely because
   one is multiplied by the bank and one is not. Cite the section; do not reproduce its reasoning.
4. **R4, the firing cadence** — the event / threshold / terminal table from `plan.md` Part 2 → Data
   shapes, with the reason per-trick firing is taken (once-per-hand would make gold `Bell-Taker` at
   6 AP strictly worse than bronze `Mark of the 9` at 1 AP).
5. **R5, the Overlap Bonus.** `k ≥ 2` buffs fired on a trick adds `k − 1` to the Momentum axis. AC1's
   answer: the basis is **count of buffs fired (linear)**, not pairs — pairs is `k(k−1)/2`, which at
   the AP-affordable `k = 6` yields 15 from the bonus alone, two and a half times the entire natural
   multiplier ceiling, and grows as the square of exactly what the shop's `+5 AP` item sells. State
   the designed consequence of sharing the Momentum pool: a Momentum-heavy loadout gets no bonus, so
   the bonus rewards *width*, which is what the original idea was reaching for.
6. **R6, the four caps** (AC2), as a table with a one-line derivation each — the four rows from
   `plan.md` Part 2 → Data shapes. Plus the load-bearing asymmetry: **the per-hand cap counters reset
   per hand and NOT on a hit**; a hit resets the multiplier itself to zero and does not refund the
   cap.
7. **R7, contradictions.** No buff on the 78-card list has a negative or preventive effect and a trick
   is won or lost but never both, so a reward-stage contradiction is structurally impossible in v1. A
   condition that is false simply does not fire, and no buff ever cancels another. Two forward
   constraints: any future buff with a negative or suppressive effect must be re-costed against this
   rule before it ships, and an apply-to-card conflict (`Sidestep` and `Glutton` on one card) is
   refused at attachment time rather than resolved at reward time.

- [x] **Step 3: Write the degenerate-case section and prove the cap contains it**

Heading: `#### The worst case is not the one the ticket names`.

State the case: a persistent suit-Taker on the Momentum axis re-firing on every trick it wins. Gold
`Bell-Taker (Momentum)` at 5 AP plus gold `Mark of the 9 (Momentum)` at 4 AP — a 9-AP loadout inside
the 11 AP the shop's capacity item allows. On a hand holding four Bells and winning with all of them:

- Uncapped: `+5 × 4` firings `= +20` Momentum, plus `+5` from the Mark `= +25`. Against a full bank of
  6 and a natural multiplier of 6, the cash-out is `6 × (6 + 25) = 186`. Diarmuid holds 135. That is
  every opponent in the run one-shot on hand one.
- Capped at `MAX_MULTIPLIER_BONUS_PER_HAND = 6`: `6 × (6 + 6) = 72` — **exactly** the one-Whetstone
  perfect hand `the-hunt.md` §7 already prints in its Whetstone table. The ceiling introduces no
  figure the design has not already blessed.

Also state the secondary corner the dispatch named: `Mark of the R` is 22 templates deep, but a
winning card has exactly one rank, so at most **two** Marks (its Blade and its Momentum crossing) can
fire on a single trick. The family's depth is pool breadth, not stack depth.

- [x] **Step 4: Write the worked example, with its two counterfactuals**

Heading: `#### A worked hand`. Loadout of seven buffs at exactly 11 AP (the capacity item bought),
every cost transcribed from `v1-buff-card-list.md`'s AP table and every reward from its master tier
list:

| Card | Tier | AP | Reward |
|---|---|---|---|
| `Mark of the 9 (Momentum)` | bronze | 1 | +2 multiplier |
| `Mark of the 9 (Blade)` | bronze | 1 | +1 damage |
| `Bell-Taker (Blade)` | bronze | 1 | +1 damage |
| `Bell-Taker (Second Wind)` | bronze | 1 | refund 1 AP |
| `Sidestep (Momentum)` | bronze | 1 | +2 multiplier |
| `Hoarder (Purse)` | silver | 3 | reach bank 3 → +5 coins |
| `Debt Collector (Blade)` | silver | 3 | Apply Damage this hand → +3 damage |

Opponent: an ordinary Quarry holding **34** health (`ORDINARY_HEALTH_BASE 10 + STEP 4 × 6`).
Hand: 9 of Bells, 4 of Bells, 11 of Keys, 7 of Moons, 2 of Moons, 5 of Keys.
`Sidestep (Momentum)` is attached to the 11 of Keys.

Walk all six tricks and show the running caps:

- **Trick 1** — wins with the 9 of Bells. Fires `k = 4`: Mark(Mom) +2 M, Mark(Blade) +1 B,
  Bell-Taker(Blade) +1 B, Bell-Taker(2nd Wind) +1 AP. Overlap Bonus `+3` M. Momentum pool `5/6`;
  Blade `2/12`; refund `1/6`. Bank 1, multiplier `1 + 5 = 6`.
- **Trick 2** — wins with the 4 of Bells. Fires `k = 2` (both Bell-Takers; Mark is an event condition
  and there is no 9). Overlap Bonus `+1` M → Momentum pool `6/6`, **cap reached**. Blade `3/12`;
  refund `2/6`. Bank 2, multiplier `2 + 6 = 8`.
- **Trick 3** — wins with the 11 of Keys, dodging a revealed skull. Fires `k = 2`: `Sidestep (Momentum)`
  `+2` M **clipped to 0**; `Hoarder (Purse)` fires on the bank reaching 3 (threshold, once per hand)
  → coins `5/10`. Overlap Bonus `+1` M also **clipped**. Bank 3, multiplier `3 + 6 = 9`. A cash-out
  here would be 27 against an unbuffed 9 — and 36 without the cap.
- **Trick 4** — the player presses **Apply Damage** before committing a card. Cash-out
  `3 × 9 = 27`, paid in full (voluntary). `Debt Collector (Blade)` fires, `k = 1`, no Overlap Bonus →
  Blade `6/12`. Per R3 step 4, Blade is added **after** the product: `27 + 6 = 33` damage. Bank and
  multiplier reset; **the Momentum pool stays spent at 6/6 and does not refill.** Quarry 34 → 1.
- **Trick 5** — wins with the 7 of Moons. `k = 0`. Bank 1, multiplier 1.
- **Trick 6** — wins with the 5 of Keys. `k = 0`. Bank 2, multiplier 2. End-of-hand cash-out
  `2 × 2 = 4`. Quarry dies.

**Result:** `33 + 4 = 37` damage, `+5` coins, 2 AP refunded, for 11 AP of buffs.

Two counterfactuals, computed beside it:
- **Unbuffed, same six tricks, same Apply Damage at trick 4:** `3 × 3 = 9`, then `2 × 2 = 4` — **13
  damage**. The loadout multiplied output **2.85×**, which is what an 11-AP investment should look
  like.
- **Under the rejected ×count rule**, reading the summed rewards onto the multiplier: trick 1
  `(2+1+1+1) × 4 = 20`; trick 2 `(1+1) × 2 = 4`; trick 3 `(2+5) × 2 = 14`. Multiplier at trick 3 is
  `3 + 38 = 41` against a bank of 3 — **123 damage on trick 3 of hand one**, from a loadout that is
  five-sevenths bronze. The 34-health opponent dies on trick 3; Diarmuid's 135 nearly does.

- [x] **Step 5: Write the closing register and confirm the section's shape**

Close with `#### Every number here is the developer's to move` — a list of the four caps, the Overlap
Bonus magnitude, and the firing cadence, each with one line on what it trades off, matching
`v1-buff-card-list.md`'s precedent of naming its agent-chosen figures rather than burying them.

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md | Select-String -Pattern "Resolving several buffs on one trick"`
Expected: exactly one hit.

Run: `(Get-Content .docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md).Count`
Expected: a count greater than the 1385 measured at planning time, confirming the section was
appended rather than replacing existing prose. (The 400-line budget is a `src/` rule and does not
apply to design documents.)

---

## Phase 2 — Reconcile the card list against the rule

`v1-buff-card-list.md` is where templates #13–16 are held back and where `MAX_REFUND_PER_HAND` is
stated, so AC4 and the three new caps land there. This phase depends on Phase 1 only for something to
cite; it changes no decision Phase 1 made. It is a safe stopping point because the card list is
internally consistent after it whether or not Phase 3 runs.

### Task 2: Reconcile templates #13–16 and record the three new caps ✓

- Skill: `game-designer`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — the `#13–16 held back`
  section, the `MAX_REFUND_PER_HAND` section, the condition-template table, and the `Open items —
  resolutions` section

- [x] **Step 1: Replace the `#13–16 held back` section with a per-template reconciliation (AC4)**

Retitle it `### #13–16 resolved against the stacking rule (DLR-124)` and give each of the four its own
verdict, none ambiguous:

- **#13 `For every other buff active this hand` — superseded, permanently excluded.** The Overlap
  Bonus is the hand-wide version of it, done once as a rule rather than as a card. And #13 counts
  buffs *active* (which the player buys with AP) rather than buffs *fired* (which requires the
  conditions to actually come true), so it pays for width with no condition risk — the
  self-reinforcing loop DLR-111 AC4 flags.
- **#14 `If you also hold a gold-tier card` — still excluded, independent reason.** It is a doubler on
  a reward rather than an overlap rule, and doubling is the one operation R2 forbids. It also
  references a card's tier rather than a game event, which is unreadable at the point of play.
- **#15 `If bank ≥ 2× multiplier` — killed permanently, and it is arithmetically dead.** Per
  `the-hunt.md` §7 the bank climbs by `1 + Whetstone copies` per taken trick while the multiplier
  climbs by exactly 1, so `bank = (1 + copies) × n` and `multiplier = n`. The condition therefore
  reduces to `copies ≥ 1` — it is a Whetstone-ownership check wearing a condition's clothes: never
  true with no Whetstone, always true with one. It is not a condition at all.
- **#16 the co-trigger combo template — superseded.** It is the `k = 2` case of the Overlap Bonus,
  now a rule rather than a card.

State plainly that the v1 pool therefore **stays at 78** and DLR-112 is unblocked with a permanent
answer rather than a hold.

- [x] **Step 2: Update the condition-template table's four held-back rows**

Change rows #13, #14 and #15 from `**NOT SHIPPING**` to `**NOT SHIPPING — superseded/killed by
DLR-124**` per the verdicts above, and #16 from `**NOT SHIPPING** as its own template` to
`**SUPERSEDED** by DLR-124's Overlap Bonus`. Leave the subtotal line (71) and the total (78)
unchanged — no template count moves.

- [x] **Step 3: Add the three new caps beside `MAX_REFUND_PER_HAND`**

Retitle the `## MAX_REFUND_PER_HAND` section `## The four per-hand caps` and add
`MAX_MULTIPLIER_BONUS_PER_HAND = 6`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12` and
`MAX_COIN_BONUS_PER_HAND = 10` alongside the existing `MAX_REFUND_PER_HAND = 6`, with the one-line
derivation each from `plan.md` Part 2 → Data shapes. Keep the existing section's two closing caveats
and extend them to all four: none is a `config.ts` key yet (**DLR-108 creates all four**), and none
has been played.

- [x] **Step 4: Add the firing cadence to the AP cost table's context, and flag the `Keepsake` defect**

Add a short `### Firing cadence` subsection carrying the event / threshold / terminal classification,
citing the `hybrid-design.md` subsection rather than restating its reasoning.

Then add a fourth entry to `## The three weakest items on this list` — retitle it `## The four weakest
items on this list` — for `Keepsake`: with `HAND_SIZE = 6` and six tricks, the player's hand is empty
when the hand ends, so "hold a card of suit S at hand's end" can only be true when an encounter ends
mid-hand. Three templates are near-dead. State it as a defect found, not a rewording proposed — the
template's wording is the developer's.

- [x] **Step 5: Close open items 1–4 in the `Open items — resolutions` section**

Items 1, 2, 3 and 4 all currently read "unresolved here, stays its own ticket". Rewrite each to point
at DLR-124's answer: (1) the rule is decided and lives in `hybrid-design.md` §5; (2) the basis is
count of buffs fired, linear; (3) yes it needs a cap and there are four; (4) #16 is superseded, not
merely still excluded. Leave items 5 and 6 untouched.

- [x] **Step 6: Add the accumulator note to the code-shape section**

Append a fifth numbered item under `### 4. Missing field` — or a short `### 5.` after it — recording
that the resolution rule additionally needs a **per-hand accrual** (`multiplierBonus`,
`flatDamageBonus`, `coinBonus`, `apRefunded`), that it is state on the hand and **not** a field on
`Buff`, that it resets per hand and **not** on a hit, and that it belongs in `src/hunt/**` behind the
existing pure-core boundary so it stays unit-testable without a renderer.

- [x] **Step 7: Verify the edits landed and nothing was miscounted**

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\v1-buff-card-list.md | Select-String -Pattern "MAX_MULTIPLIER_BONUS_PER_HAND|MAX_FLAT_DAMAGE_BONUS_PER_HAND|MAX_COIN_BONUS_PER_HAND"`
Expected: at least three hits, one per new constant.

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\v1-buff-card-list.md | Select-String -Pattern "78 distinct card templates"`
Expected: at least one hit — the pool size is unchanged by this contract.

---

## Phase 3 — Move the idea out of the parking lot

`ideas.md` owns AC5. Its own stated vocabulary says a Promoted entry owes the `hybrid-design.md`
section it became and a Rejected one owes the reason it died; this entry owes both, because the
proposal as written was rejected and a replacement was promoted in its place. This phase is last
because it cites the section Phase 1 wrote.

### Task 3: Move the "Passive buff stacking" entry from Raw to Promoted ✓

- Skill: `game-designer`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/ideas.md` — cut the entry from the `## Raw`
  section (heading `### Passive buff stacking — co-triggering buffs sum then multiply by count`, at
  line 247 as read at planning time) and rewrite it under `## Promoted`

- [x] **Step 1: Cut the entry from Raw and place it under Promoted, following the file's own heading convention**

The `## Promoted` entries all take the form
`### <title> — became \`hybrid-design.md\` §N …, <date>`. Follow it exactly:

`### Passive buff stacking — became \`hybrid-design.md\` §5's stacking rule, 2026-08-23 — the ×count arithmetic rejected, the intent kept`

Do not delete the original text. Per the file's own preamble ("Move entries down rather than deleting
them"), the entry keeps its original What / Problem / blocking-risk table so the rejected reasoning
stays killed with its reason recorded.

- [x] **Step 2: Append the resolution to the moved entry, in four short paragraphs**

1. **What was rejected and why** — "sum the rewards, then multiply by the count" has no arithmetic:
   the four reward axes are incommensurate units, so the 2→12 / 3→36 / 5→125 table's "avg reward each"
   is a quantity that does not exist. Rejected on definition, and then again on magnitude: applied to
   an ordinary 11-AP bronze-heavy loadout it produces 123 damage on trick 3 of hand one against a
   34-health opponent.
2. **What replaced it** — per-axis, additive, five-step ordered resolution with four per-hand caps and
   a linear `k − 1` Overlap Bonus on the Momentum axis. One sentence each, then a pointer to the
   `hybrid-design.md` subsection for the argument. Do not restate the derivations.
3. **What it superseded** — templates #13 and #16 permanently, per Phase 2, with #14 and #15 still
   excluded for their own reasons. One line, citing `v1-buff-card-list.md`.
4. **What is still the developer's** — the four cap values, the Overlap Bonus magnitude, and the
   firing cadence. One line, pointing at the `hybrid-design.md` register Task 1 Step 5 writes.

- [x] **Step 3: Confirm the entry moved rather than being duplicated**

Run: `Get-ChildItem .docs\design\Balatro-Forbidden-Solitaire\ideas.md | Select-String -Pattern "Passive buff stacking"`
Expected: hits only under the `## Promoted` section — none between the `## Raw` and `## Worth costing`
headings. Read the surrounding lines to confirm placement; a line-number hit alone does not prove
which section it sits in.

---

## Phase 4 — Final verification

No production changes. The contract writes no TypeScript, so every gate is expected to be a no-op
pass against the baseline — but all four are run and reported anyway, per this run's standing rule
that a docs-only contract still proves it broke nothing.

### Task 4: Confirm no `src/` file was touched

- Skill: `none — a verification grep over the working tree, no code written`

**Files:**
- Modify: (none — verification only)

- [ ] **Step 1: Confirm the diff contains no source file**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: modified paths under `.docs/design/Balatro-Forbidden-Solitaire/`, `.claude/contract/DLR-124-cost-the-passive-buff-stacking-rule/`
and `.claude/sprint-runs/` only. **Zero paths beginning `src/`.** A `src/` path in this output means
the contract exceeded its scope and must be reverted before proceeding.

### Task 5: Static gates and full suite

- Skill: `none — running the project's own gates, no code written`

**Files:**
- Modify: (none — verification only)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `1089 passed` of 1089 across 86 files and 0 failed —
the baseline this run started from. Any failure is this contract's and must be investigated, not
excused, even though no TypeScript changed.

Note the cold-cache trap from `.claude/workflow/web-project.md`: a single
`[vitest-pool-runner]: Timeout waiting for worker to respond` is a worker-start timeout, not a failing
test. Warm the cache with `npx vitest run --project node; npx vitest run --project dom` and re-run
`npm test` before treating it as real.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 6: Formatting of the files this contract changed

- Skill: `none — running the project's own gate, no code written`

**Files:**
- Modify: (none — verification only)

- [ ] **Step 1: Check formatting, repo-wide and scoped**

Run: `npm run format:check`
Expected: **fails on roughly 58 pre-existing `.md` files repo-wide.** This is the documented
pre-existing state (`.claude/workflow/web-project.md`) and is not a defect this contract introduces.
Report the result; do not "fix" it as a side effect.

Run: `npx prettier --check .docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md .docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md .docs/design/Balatro-Forbidden-Solitaire/ideas.md`
Expected: this is the gate that actually binds. If any of the three fails, run
`npx prettier --write` on that file and re-check — but only if the file already passed before this
contract touched it. If it was already failing at `2b33332`, leave it, and say so.

### Task 7: Update the PR description

- Skill: `none — contract bookkeeping, no code written`

**Files:**
- Create: `.claude/contract/DLR-124-cost-the-passive-buff-stacking-rule/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- The resolution rule stated compactly — R1 through R7, with every chosen number.
- The worked example's result (`37` damage, `+5` coins, 2 AP refunded, from 11 AP) and both
  counterfactuals (`13` unbuffed; `123` under the rejected rule).
- The worst degenerate case (`186` uncapped) and the number that contains it (`72`).
- Every decision the developer must make, copied from this file's "Developer decides or observes".
- Verification results from Phase 4, quoted as exit codes and the Vitest summary line.
- A one-line note that the four per-hand caps are design-document figures DLR-108 must create in
  `src/hunt/config.ts`, and that nothing is persisted yet.

---

## Self-review

**Spec coverage:**
- Decided resolution rule (per-axis, combination, order, cadence, contradictions) — Task 1, Step 2.
- AC1 multiplier basis decided and stated — Task 1, Step 2, part 5; restated in Task 2, Step 5.
- AC2 cap decision with named retunable constants — Task 1, Step 2, part 6; Task 2, Step 3.
- AC3 growth curve checked against the `ideas.md` table, verdict recorded — Task 1, Steps 2 (part 1)
  and 4; Task 3, Step 2.
- AC4 templates #13–16 each explicitly reconciled — Task 2, Steps 1 and 2.
- AC5 `ideas.md` entry moved out of Raw — Task 3, Steps 1–3.
- Worked example on a realistically stacked hand — Task 1, Step 4.
- Degenerate-corner attack, incl. the 22-deep Mark family — Task 1, Step 3.
- Developer-decision register — Task 1, Step 5; File map; Task 7.
- Four gates run and reported despite no code — Tasks 4, 5 and 6.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar
to Task N" references. Every step names the exact heading, the exact verdict, the exact number, or a
runnable command with `Run:` / `Expected:`.

**Type / name consistency:** The four constant names (`MAX_REFUND_PER_HAND`,
`MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND`, `MAX_COIN_BONUS_PER_HAND`), the
four axis names (Blade, Purse, Second Wind, Momentum), the eleven family words, the three cadence
labels (event / threshold / terminal), and the accrual field names (`multiplierBonus`,
`flatDamageBonus`, `coinBonus`, `apRefunded`) are used identically in `plan.md` Part 2 → Data shapes,
Task 1, Task 2 and Task 3. The rule identifiers R1–R7 are introduced in Task 1 Step 2 and referenced
by number in Task 2 Step 1 and Task 3 Step 2.

**Phase boundary cleanliness:**
- Phase 1 ends with the rule written and self-contained in `hybrid-design.md`; nothing else cites it
  yet, so the tree is consistent.
- Phase 2 ends with `v1-buff-card-list.md` citing a section that exists and its 71/78 counts
  unchanged; no template count is half-moved.
- Phase 3 ends with the `ideas.md` entry in exactly one section, citing a section that exists.
- Phase 4 makes no change at all. No phase touches `src/`, so "type-checks cleanly" holds at every
  boundary trivially, and Task 4 proves it rather than asserting it.
