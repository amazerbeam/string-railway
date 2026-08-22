# Tasks: Verification and sign-off against the epic's Definition of Done

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox
> (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-22

**Goal:** Re-verify all six items of epic DLR-87's Definition of Done end to end against the real
shipped code, then trigger `implementation-doc-writer` to bring `the-hunt.md` and the touched
module docs current. Any genuine gap found is named as a finding, never fixed in this contract.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `.claude/contract/DLR-98-verification-and-sign-off/pr-description.md` — the sign-off report:
  per-item PASS/FAIL with evidence, plus any findings routed elsewhere.

**Modified:**
- `.docs/game_rules/the-hunt.md` — only via `implementation-doc-writer`, if Phase 4 finds it stale.
- `.docs/implementation/README.md` and any module `README.md` under it — only via
  `implementation-doc-writer`, if Phase 4 finds a module doc stale or missing.

**Deleted:** (none)

**Developer decides or observes:**
- None. Item 5's live-run scenario is QA's functional check (right-answer, driven via
  `chrome-devtools`), per `plan.md` Part 1 → Assumptions — not a developer feel judgement. If the
  developer prefers to run it personally instead, that's a plan red-line, not a task in this file.

---

## Phase 1 — Static gates, warm and fresh

Establishes the baseline for DoD item 6's first half before anything else is checked — a stale or
cold-cache gate run would poison every later step's confidence. This phase is a safe stopping point:
nothing is modified, only run.

### Task 1: Run typecheck, lint, and the full test suite ✓

- Skill: none — verification only, no code written.

**Files:** (none — read/run only)

- [x] **Step 1: Confirm dependencies are installed**

Run: `Get-ChildItem node_modules -ErrorAction SilentlyContinue | Select-Object -First 1`
Expected: at least one entry. If empty, run `npm ci` first.

- [x] **Step 2: Warm the Vitest cache by project, to avoid the cold-cache worker-start timeout**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0.

- [x] **Step 3: Run the full static gate set**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; the Vitest summary line reads `Tests  N passed` with 0 failed. Quote the
exact summary line in the sign-off report (Phase 5).

---

## Phase 2 — Code-level re-verification of DoD items 1–4

Each task below re-reads the shipped implementation and its existing tests for one DoD item,
confirms the tests actually exercise the rule the AC states (not just that a plausibly-named test
file exists), and runs that scoped test fresh. No code is touched. This phase is a safe stopping
point — nothing changes, only findings accumulate. **If any step finds a genuine gap** (the
described behaviour is not what the code does), stop marking that item PASS, write the gap into the
sign-off report's "Findings routed elsewhere" section per `plan.md` Part 1 → Explicitly out of
scope, and continue to the next item — do not attempt a fix.

### Task 2: DoD item 1 — shop UI shows all four categories, Heal outside them ✓

- Skill: react-frontend — informs whether the existing component test genuinely queries by role/label
  rather than incidentally passing.

**Files:**
- Test: `src/app/run/__tests__/ShopCategoryTabs.test.tsx`, `src/app/run/__tests__/ShopPanel.test.tsx`,
  `src/hunt/__tests__/shop.test.ts`

- [x] **Step 1: Read the shop category model and the panel component**

Read `src/hunt/shop.ts` and `src/app/run/ShopCategoryTabs.tsx` and `src/app/run/ShopPanel.tsx`.
Confirm: four categories are modelled (one-time use, fight-long, run-permanent, game-permanent, per
`the-hunt.md` §10's DLR-89 entry), and Heal renders in its own block outside the four-shelf tab
structure rather than as a fifth category.

- [x] **Step 2: Run the scoped tests fresh**

Run: `npx vitest run src/app/run/__tests__/ShopCategoryTabs.test.tsx src/app/run/__tests__/ShopPanel.test.tsx src/hunt/__tests__/shop.test.ts`
Expected: exits 0, all tests pass. Read the test bodies and confirm at least one test asserts all
four category tabs render and one asserts Heal is reachable outside them — if no such assertion
exists, that is a coverage gap to note in the sign-off report (not a DoD failure by itself, since
the code may still be correct — say so explicitly).

### Task 3: DoD item 2 — Envenom, Poison Guard, Whetstone purchasable and match the design doc ✓

- Skill: react-frontend — same test-coverage judgement role as Task 2.

**Files:**
- Test: `src/hunt/__tests__/envenom.test.ts`, `src/hunt/__tests__/poisonGuard.test.ts`,
  `src/hunt/__tests__/run.whetstone.test.ts`, `src/warCouncil/__tests__/envenom.test.ts`,
  `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`,
  `src/app/warCouncil/__tests__/roundReducer.poison.test.ts`,
  `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx`

- [x] **Step 1: Read each item's shop entry and its runtime mechanic**

Read `src/hunt/shop.ts` for the three items' prices and shelf placement. Read
`src/warCouncil/envenom.ts` and `src/warCouncil/bank.ts` for the delayed-hit and streak-climb
mechanics. Cross-check each against `the-hunt.md` §4 ("Envenom"), §7 ("A poisoned trick..."), and
the DLR-91/DLR-92 changelog entries at the top of the file: Envenom 2 coins/no cap, Poison Guard 1
coin/one fight/one at a time, Whetstone 4 coins/stacks/adds to bank-per-trick.

- [x] **Step 2: Run the scoped tests fresh**

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts src/hunt/__tests__/poisonGuard.test.ts src/hunt/__tests__/run.whetstone.test.ts src/warCouncil/__tests__/envenom.test.ts src/app/warCouncil/__tests__/roundReducer.envenom.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/EnvenomCharge.test.tsx`
Expected: exits 0, all tests pass. Confirm coverage exists for: purchase at the stated price, the
delayed-hit amounts (4 against the Quarry, 2 against the player), Poison Guard suppressing exactly
one self-poison hit while consuming itself regardless of a streak being saved, and Whetstone
stacking (`(1 + copies) × n²`). Note any of these four the tests don't actually cover.

### Task 4: DoD item 3 — the flask: 60% max HP, refills on stage-boss kill ✓

- Skill: react-frontend — same test-coverage judgement role as Task 2.

**Files:**
- Test: `src/hunt/__tests__/flask.test.ts`, `src/hunt/__tests__/run.flask.test.ts`

- [x] **Step 1: Read the flask mechanic and confirm the 60% figure against the constant**

Read `src/hunt/flask.ts`. Confirm the heal amount is computed as 60% of max HP (not a hard-coded
absolute like `6`, unless max HP is itself fixed at 10 and the constant is documented as derived
from it), and that the recharge path is wired specifically to a stage-boss kill, not any kill. Cross
check against `the-hunt.md`'s DLR-93 entry ("60% of your maximum health... a charge comes back only
from a stage boss").

- [x] **Step 2: Run the scoped tests fresh**

Run: `npx vitest run src/hunt/__tests__/flask.test.ts src/hunt/__tests__/run.flask.test.ts`
Expected: exits 0, all tests pass. Confirm a test exercises both the 60%-heal-with-overflow-discard
case and the refill-only-on-boss-kill case (an ordinary-opponent kill must leave an already-spent
flask empty).

### Task 5: DoD item 4 — Apply Damage pre-card, two-thirds-on-forced-hit rule ✓

- Skill: react-frontend — same test-coverage judgement role as Task 2.

**Files:**
- Test: `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`,
  `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`,
  `src/warCouncil/__tests__/voluntaryCashOut.test.ts`

- [x] **Step 1: Read the Apply Damage control and the two cash-out paths**

Read `src/warCouncil/voluntaryCashOut.ts` and `src/app/warCouncil/ApplyDamagePlate.tsx`. Confirm the
control is offered pre-card (before the player commits a card into the trick), that applying it
cashes `bank × multiplier` **in full** with no health cost, and that the *forced* cash-out path
(clean loss / eaten skull / poison landing) pays **two-thirds of `bank × multiplier`, rounded
down**, per `the-hunt.md` §7. Confirm the rounding is `Math.floor`, not `Math.round`.

- [x] **Step 2: Run the scoped tests fresh**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx src/warCouncil/__tests__/voluntaryCashOut.test.ts`
Expected: exits 0, all tests pass. Confirm at least one test pins the two-thirds-rounded-down figure
with a non-exact-multiple-of-3 bank value (e.g. a streak of 6 caught for 24 rather than a value that
would round the same either way), and confirm a separate test asserts Apply Damage is refused while
poison is pending (`the-hunt.md`'s DLR-94 entry: "It is locked while poison is pending").

---

## Phase 3 — Live-run confirmation of the quick-kill payout (DoD item 5)

This phase prepares the exact scenario QA must drive live and confirms the pinned regression test's
own correctness — it does not itself constitute the "by hand in a live run" confirmation the AC
requires, since the Implementer has no browser tooling. QA executes the live run in this contract's
end-of-run functional pass (`/fb-apply`'s single parallel reviewer dispatch), using the script this
phase produces. This is a safe stopping point: nothing is modified.

### Task 6: Confirm the pinned quick-kill regression test and draft the live-run script ✓

- Skill: react-frontend — informs what "pinned regression test" coverage should look like.

**Files:**
- Test: `src/hunt/__tests__/quickKill.test.ts`, `src/hunt/__tests__/run.quickKill.test.ts`,
  `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`

- [x] **Step 1: Read the quick-kill payout formula and confirm the 10-coin figure**

Read `src/hunt/quickKill.ts` and `QUICK_KILL_TIER_MULTIPLIERS` in `src/hunt/config.ts`.
`quickKillPayout` is `unplayedCards × tierMultiplier`, floored — `QUICK_KILL_TIER_MULTIPLIERS =
[2, 1, 0.5]`, so a first-hand kill (`handOfFight: 1`) uses multiplier 2. For **5 cards left**:
`5 × 2 = 10`, matching the AC exactly. This figure is `quickKillPayout` alone — the separate flat
1-coin win payout (DLR-84, paid on every fight win regardless of speed) is a different, additive
payment per `the-hunt.md`'s DLR-95 entry ("the two payments add") and is **not** part of the AC's
stated 10. Confirm the constant in source, not the design doc from memory, is what's quoted in the
sign-off report.

- [x] **Step 2: Run the scoped regression tests fresh**

Run: `npx vitest run src/hunt/__tests__/quickKill.test.ts src/hunt/__tests__/run.quickKill.test.ts src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`
Expected: exits 0, all tests pass, and at least one test pins the exact first-hand/5-cards-left
scenario the AC names.

- [x] **Step 3: Write the live-run script into `pr-description.md` for QA to execute**

Write a numbered play-by-play into the sign-off report under a "QA live-run script — item 5"
heading: start a run, reach the first fight, play down to a position with exactly 5 cards left in
hand, win the trick that kills the Quarry, and read the coin total shown on the verdict screen.
State the expected total from Step 1's derivation. This is a draft for QA to execute, not a claim
that it has been executed.

---

## Phase 4 — Documentation currency (DoD item 6, second half)

Invokes `implementation-doc-writer` once, scoped to the cumulative span DLR-89 through DLR-97 (plus
whatever has landed since, since the-hunt.md's own changelog already shows entries through DLR-100).
This phase is a safe stopping point — the skill's own Step 5 verification closes it out internally.

### Task 7: Invoke implementation-doc-writer for currency across the epic's span ✓

- Skill: implementation-doc-writer — owns this entirely; see `plan.md` Part 2 → Approach for why the
  scope is the whole epic span rather than a single ticket's diff.

**Files:**
- Modify (via the skill, not by hand): `.docs/game_rules/the-hunt.md`,
  `.docs/implementation/README.md`, and any stale module `README.md` under
  `.docs/implementation/`.

- [x] **Step 1: Invoke the skill**

Invoke `implementation-doc-writer`, directing it to run its Step 1 "what changed / what's stale"
check against the cumulative diff of DLR-89 through DLR-97 (shop categories, Envenom, Poison Guard,
Whetstone, the flask, Apply Damage, quick-kill payout, the integration and polish passes) rather
than a single contract's changed-files log, and to run its own Step 1 rule-change check, Steps 2–5
gather/validate/write/verify exactly as documented in its `SKILL.md`.

- [x] **Step 2: Confirm the skill's own verification ran and reported**

Read the skill's final report. Confirm it states, per its own Success Criteria, either that
`the-hunt.md` was updated or explicitly why it was not touched, and that every module doc's
`Built by`/`Status` agrees between the module `README.md` and the top-level
`.docs/implementation/README.md` table. Copy the skill's own summary into `pr-description.md` under
a "Documentation currency" heading — do not paraphrase it into a shorter claim.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative verification pass
is complete and correctly reported, plus the sign-off report itself.

### Task 8: Re-run the static gates and the production build ✓

- Skill: none — verification only.

**Files:** (none — read/run only)

- [x] **Step 1: Re-run typecheck, lint, and the full suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0, same as Phase 1 — confirms nothing regressed between phases (nothing
should have, since no `src/` file was touched, but this is the contract's own closing gate per
`.claude/workflow/web-project.md`).

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 9: Write the sign-off report ✓

- Skill: none — report only.

**Files:**
- Create: `.claude/contract/DLR-98-verification-and-sign-off/pr-description.md`

- [x] **Step 1: Assemble the per-item table**

Fill the table shape from `plan.md` Part 2 → Data shapes with the PASS/FAIL and evidence line for
each of the six DoD items, drawing on Phases 1–4's findings. Every FAIL carries a one-line pointer
to where the gap was found and a note that it is routed to a new ticket / `/fb-issue`, not fixed
here. Include the Phase 3 live-run script (already drafted in Task 6, Step 3) and, once QA has run
it during this contract's review pass, its result.

**Post-QA correction:** QA executed the item 5 live-run script during `/fb-apply`'s review pass and
found the scenario unreachable — item 5's row now reads **FAIL (live-run unreachable)**, not the
placeholder "PASS (code) / PENDING (live run)" this task originally wrote. The report was corrected
accordingly; see `pr-description.md`'s item-5 row, its "QA live-run script — item 5" section, and its
"Findings routed elsewhere" section.

- [x] **Step 2: List findings routed elsewhere, if any**

Under "Findings routed elsewhere," list every gap found in Phases 1–4 that did not get fixed, each
with enough detail (file, expected vs. actual) that a new ticket or `/fb-issue` invocation can be
opened directly from this line, with no re-investigation.

**Post-QA correction:** this section originally read "None" plus one minor test-organization
observation. That is now inaccurate — QA's live-run finding on item 5 (the AC's own worked example
describes an unreachable game state under the current bank-only damage economy) is a genuine gap and
has been added as the primary entry, with three candidate resolutions named and the choice between
them left to the developer / `/fb-issue`. The original test-organization observation still stands
underneath it, unchanged.

---

## Self-review

**Post-QA correction (applied after this contract's `/fb-apply` review pass):** the self-review below
was written before QA executed the item 5 live-run script. QA's execution found the AC's own worked
example unreachable under the shipped damage economy — a genuine gap, now recorded in
`pr-description.md`'s item-5 row and "Findings routed elsewhere" section, and in Task 9's notes above.
The claim implied by the original wording below — a clean pass across all six items with "no gap
found" — no longer holds for item 5. Items 1–4 and item 6 are undisputed by QA and stand as written.

**Spec coverage:**
- DoD item 1 (shop categories) — Task 2.
- DoD item 2 (Envenom/Poison Guard/Whetstone) — Task 3.
- DoD item 3 (flask) — Task 4.
- DoD item 4 (Apply Damage two-thirds) — Task 5.
- DoD item 5 (quick-kill live run) — Task 6 (script) + QA's live execution during `/fb-apply`'s
  review pass, reported back in Task 9.
- DoD item 6 (gates + doc currency) — Tasks 1, 7, 8, 9.
- "Trigger implementation-doc-writer" (In scope) — Task 7.
- "Findings routed elsewhere, not fixed here" (Explicitly out of scope) — enforced structurally by
  every Phase 2/3 task's framing paragraph and Task 9 Step 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, or "appropriate error handling." Every
step names a concrete `Read`/`Run`/`Expected` action or a specific file to write.

**Type / name consistency:** No new identifiers are introduced by this contract — all names
(`ShopCategoryTabs`, `envenom.ts`, `flask.ts`, `voluntaryCashOut.ts`, `quickKill.ts`) are read
verbatim from the existing source tree confirmed via Grep before this file was written.

**Phase boundary cleanliness:** Phase 1 ends with the gates run and their output recorded — nothing
mutated. Phase 2 ends with four items checked and any findings noted — nothing mutated. Phase 3 ends
with a drafted script and a confirmed regression test — nothing mutated. Phase 4 ends with the
doc-writer skill's own internal verification closed out — the only phase that writes files, and it
writes only docs, never `src/`. Phase 5 ends with gates green a second time and the sign-off report
written. No phase leaves a half-applied edit because no phase but 4 and 5 edits anything, and both
of those are terminal.
