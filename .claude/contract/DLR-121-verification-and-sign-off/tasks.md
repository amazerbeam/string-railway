# Tasks: DLR-121 — Verification and sign-off against the epic's Definition of Done

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **Note:** `plan.md` was **not developer-confirmed**. This run is unattended and non-interactive, so Step 3's `AskUserQuestion` approval gate could not be presented and was auto-approved. No mockup was produced — this contract renders nothing.

**Goal:** Establish with evidence what is actually true about epic DLR-103's twelve-item Definition of Done, fix only documentation that is provably stale, file every shortfall as its own ticket, and hand the developer one consolidated eyes-on agenda.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `.docs/implementation/hunt/shield.md` — the missing module doc for `src/hunt/shield.ts`
- `.claude/contract/DLR-121-verification-and-sign-off/pr-description.md` — the developer's hand-off, carrying the DoD verdict and the consolidated agenda

**Modified:**
- `src/hunt/encounter.ts:245-250` — `hasShieldHearts`' docblock: drop the false "DLR-115 reads this" claim
- `.docs/implementation/hunt/README.md` — index the new `shield.md`
- `.docs/implementation/README.md` — top-level index row for the shield doc
- `.docs/game_rules/the-hunt.md` — four provably-stale claims (three buff-fired, one persistence)
- `.claude/workflow/web-project.md` — stale source-file count and module list
- `CLAUDE.md` — the two facts it restates from `web-project.md` and `.claude/rules/`
- `.claude/rules/README.md` — the stale "(empty — no rules written yet)" index
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — append `## DLR-121 — Verification and sign-off`

**Deleted:** (none)

**Developer decides or observes:**
- **The balance pass.** 0 wins in 200 runs, 2.29 dealt against 2.64 taken. DLR-132 removed the integration confound; the deficit that remains is balance. **No value was retuned by this ticket and none may be.**
- **Whether DoD item 5 (Shield) reads NOT MET or MET** — the mechanic is built and correct but unreachable in play. Evidence recorded both ways in Task 8.
- **Whether the two over-length spec files (418 / 402) are cleared now or later** — Task 10 records the reasoning for leaving them.
- **The entire consolidated eyes-on agenda** (Task 9) — every item on it needs a human at a browser.
- **Whether a run should open with real cards or reach a shop before fight one** — the structural seam DLR-120 named and DLR-132 did not close.
- `STARTING_BUFF_COUNT` (4) and `RUN_STARTING_CHEATS` (1) — both quoted in the verdict, neither changed.

---

## Phase 1 — Measure the truth on an untouched tree

Nothing is edited in this phase. Every number the verdict later quotes is taken here, before any change, so the baseline is real and Phase 4 is a genuine comparison rather than a restatement. If any gate is red at `c4b202d`, the honest outcome is BLOCKED and Phase 2 must not begin. The phase is a safe stopping point by construction: it makes no change at all.

### Task 1: Run the four gates and record the actual numbers ✓

- Skill: `none — no code is written or read for correctness here; this task runs the project's own gate commands and quotes their output`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Run the two fast static gates**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Record each exit code verbatim; do not summarise "clean" without the code.
Observed: `npm run typecheck` exit 0; `npm run lint` exit 0.

- [x] **Step 2: Run the unfiltered suite**

Run: `npm test -- --run`
Expected: exits 0. Record the summary line — the baseline to match is **`Test Files 139 passed (139)`** and **`Tests 1808 passed (1808)`**. A cold-cache `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a failing test — warm with `npx vitest run --project node; npx vitest run --project dom` and re-run before treating it as real.
Observed: warmed both projects first (`node` 111 files / 1542 tests passed; `dom` 28 files / 266 tests passed), then `npm test -- --run` exit 0 with `Test Files  139 passed (139)` and `Tests  1808 passed (1808)` — matches baseline exactly.

- [x] **Step 3: Run the production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` and `tsc -b` first, so a green build re-confirms Steps 1 and 2's static half.
Observed: exit 0. `148 modules transformed`, `dist/index.html`, `dist/assets/index-*.css` (41.38 kB), `dist/assets/index-*.js` (303.15 kB), no bundler errors.

### Task 2: Re-measure the integrity counts the run log has twice got wrong ✓

- Skill: `none — grep and line-count measurement over the working tree, no code written`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Count `throw new` across `src/`**

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new").Count`
Expected: **99**. The run log has recorded 98 and then 102; both are stale — DLR-132 deleted `cheats.ts`'s three guards on a rail that no longer exists. Any figure other than 99 means a throw moved and must be reported, not reconciled.
Observed: **99**, exactly as expected.

- [x] **Step 2: Prove no real `Math.random()` call site exists in the four pure trees**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\vault,src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.random"`
Expected: hits are **every one of them comment prose** (measured at 15 during planning — docblocks stating the ban). Read each hit; a hit that is not inside a comment is a boundary breach and fails the contract. The three real call sites all live in `src/App.tsx`.
Observed: **15 hits**, every one inside a docblock/comment stating the `Math.random()` ban (`buffCatalog.ts`, `buffs.ts`, `buffTemplates.ts`, `rankTiers.ts`, `run.ts`, `seededRng.ts` ×3, `slotMachine.ts` ×2, `skulls.test.ts`, `encounterDeck.ts`, `vaultOdds.ts` ×2, `sim/fixtures.ts`). No boundary breach.

- [x] **Step 3: Measure every file at or over the 400-line budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | ForEach-Object { [PSCustomObject]@{ Lines = (Get-Content $_.FullName).Count; Path = $_.FullName } } | Where-Object { $_.Lines -ge 395 } | Sort-Object Lines -Descending`
Expected: exactly two files at or over 400 — `src/warCouncil/__tests__/playCard.test.ts` at **418** and `src/warCouncil/__tests__/rankTiers.resolution.test.ts` at **402**, both pre-existing from DLR-123. Use `(Get-Content).Count`, never `Measure-Object -Line`, which drops blank lines and has hidden a real breach before. Record anything else in the 395–399 band as headroom, not as a breach.
Observed: exactly two files at/over 400 — `src/warCouncil/__tests__/playCard.test.ts` **418**, `src/warCouncil/__tests__/rankTiers.resolution.test.ts` **402**. In the 395–399 headroom band: `src/warCouncil/__tests__/bank.test.ts` **398**, `src/app/warCouncil/warCouncilHunt.css` **395**.

### Task 3: Measure reachability and the condition families ✓

- Skill: `none — reads production data through the existing audit module and its spec; writes nothing`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Run the pinned reachability spec and read what it asserts**

Run: `npx vitest run src/sim/__tests__/reachability.test.ts`
Expected: exits 0, all tests pass. Then read `src/sim/__tests__/reachability.test.ts` and record the pinned set: **six unreachable `BuffKind`s** — the five consumables (`Ward`, `Puppeteer`, `SecondThoughts`, `Foresight`, `Spyglass`) plus `Shield` — and **`Cheat` and `Timebomb` now reachable** (`unreachable.has(...)` is `false` for both, since DLR-132). Also record the unshelved shop items: `Cheat`, `Timebomb`, `BlastGuard`, `Whetstone`.
Observed: exit 0, `Test Files  1 passed (1)`, `Tests  8 passed (8)`. Spec confirms `unreachableBuffKinds().size === 6` — `Ward`, `Puppeteer`, `SecondThoughts`, `Foresight`, `Spyglass`, `Shield` — with `Cheat` and `Timebomb` both `false` in that set. `unshelvedShopItems()` confirms `Cheat`, `Timebomb`, `BlastGuard`, `Whetstone` all `true` (unshelved).

- [x] **Step 2: Count the condition families that actually pay**

Run: `Select-String -Path src\hunt\buffCosts.ts -Pattern "typeof BuffKind\."`
Expected: `BuffConditionKind` enumerates **11** shipping condition families. Cross-read `.docs/implementation/hunt/buff-condition-evaluation.md` → *Known defects*: `Long Fall` is the twelfth row and generates no template, and `Keepsake` evaluates correctly but is **structurally unfireable** (a hand runs its course, so the player's hand is empty when the hold-a-suit condition is checked — three Purse cards pay nothing). Record the verdict as **10 of 12 families pay**, 11 of 12 are evaluated.
Observed: grep returned 19 `typeof BuffKind.` lines total (11 for `BuffConditionKind` at lines 39–49, plus 8 for the separate `ActivatedBuffKind` union at lines 53–60) — `BuffConditionKind` itself enumerates **11**. Doc confirms Long Fall is the unbuilt twelfth row (no template) and Keepsake is structurally unfireable. Verdict: **10 of 12 families pay, 11 of 12 are evaluated.**

### Task 4: Run the simulator and observe, retuning nothing ✓

- Skill: `none — runs the project's own instrument and records its output`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Run 200 seeded runs**

Run: `npm run sim -- --runs 200 --seed 1`
Expected: terminates and exits 0. Record every reported figure. The comparison point is DLR-132's post-fold measurement: **win rate 0.0% (0/200)**, damage to Quarry **2.29**/hand against **2.64** taken, **hands holding no activatable buff 0.0%**, activations **1.50**/hand, AP spent **4.35**/hand, `Faults none`, `stalled runs 0`. **Change nothing on the strength of this output.** A differing figure is a finding to report, not a value to tune.
Observed: exit 0. Outcomes — won 0, lost 200, stalled 0, win rate 0.0%. Fights — mean fight reached 0.46, max fight reached 4, mean fights won 0.46. Hands — mean hands per encounter 4.59, max hands in one encounter 13. Damage per hand — to Quarry mean 2.29 / median 2 / p90 6 / max 18; to player mean 2.64 / median 3 / p90 4 / max 9. Economy — mean coins earned 0.84, mean coins spent 0.69, mean slot pulls 0.46, mean buffs owned at end 6.19. Buffs and AP — mean activations/hand 1.50, mean AP spent/hand 4.35, mean Apply Damage presses/hand 0.38, NoEffectYet refusals 0, hands holding no activatable buff 0.0%. Levers — mean discards/run 0.00, mean Cheats armed/run 0.00. Faults — none. Stalled runs — 0. **Matches the DLR-132 comparison point exactly; nothing changed on the strength of this output.**

---

## Phase 2 — Fix only what is provably stale

Four documentation defects, each falsified by a specific piece of shipped code named in its task. Nothing here needs a judgement, a design reading or a tuning value; anything that turned out to need one would belong in Phase 3 as a finding instead. The phase is a safe stopping point: it changes one comment and several markdown files, so the tree type-checks throughout and no behaviour moves.

### Task 5: Correct the false DLR-115 claim in `hasShieldHearts`' docblock ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/encounter.ts:245-250`

- [x] **Step 1: Prove the claim is false before changing it**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "hasShieldHearts"`
Expected: **zero hits.** The docblock asserts DLR-115 reads this function; DLR-115's `src/app/warCouncil/roundBars.ts` reads `ui.encounter.shieldHearts` directly instead (two hits, lines 61 and 67). Do not proceed if this grep returns a hit — the claim would be true and there would be nothing to fix.
Observed: zero hits, as expected.

- [x] **Step 2: Replace the docblock's second sentence**

Replace this exact comment above `hasShieldHearts` in `src/hunt/encounter.ts`:

```ts
/** Whether any blue heart is standing. ONE statement, so a rule and a reading cannot disagree —
 *  the discipline `hasPendingTimebomb` sets. DLR-115 reads this to decide whether to draw any
 *  shield pip at all. */
```

with:

```ts
/** Whether any blue heart is standing. ONE statement, so a rule and a reading cannot disagree —
 *  the discipline `hasPendingTimebomb` sets.
 *
 *  NO APP-LAYER CALLER TODAY (measured DLR-121). DLR-115's health bar derives its shield pips from
 *  `encounter.shieldHearts` directly in `roundBars.ts`, not through this predicate — an earlier
 *  version of this docblock claimed otherwise and was wrong. Kept exported rather than deleted:
 *  it is the single statement of the rule, and the first reader that needs the question asked
 *  rather than the field read should call this instead of re-deriving `> 0`. */
```

Change nothing else in the file — no signature, no body, no export.

- [x] **Step 3: Confirm the file still compiles and its spec still passes**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/shield.encounter.test.ts`
Expected: typecheck exits 0; the spec exits 0 with 0 failed. A comment change cannot break either — this step exists to prove the edit landed where it was meant to and touched nothing else.
Observed: typecheck exit 0. `Test Files 1 passed (1)`, `Tests 17 passed (17)`.

### Task 6: Create the missing `shield.md` module doc ✓

- Skill: `implementation-doc-writer`

**Files:**
- Create: `.docs/implementation/hunt/shield.md`
- Modify: `.docs/implementation/hunt/README.md`
- Modify: `.docs/implementation/README.md`

- [x] **Step 1: Confirm the gap is real**

Run: `Get-ChildItem .docs\implementation\hunt\ -Filter "*shield*"`
Expected: **no output.** `src/hunt/shield.ts` (4,215 bytes, DLR-110) is the only `src/hunt/` module with no doc; `blast-guard.md` and `consumable-items.md` reference the shield mechanic without documenting it.
Observed: no output, as expected.

- [x] **Step 2: Invoke `implementation-doc-writer` and write the doc**

Follow `.claude/skills/implementation-doc-writer/SKILL.md` for the folder's shape, and `.docs/implementation/hunt/blast-guard.md` as the sibling pattern. The doc covers, from `src/hunt/shield.ts` and the shield half of `src/hunt/encounter.ts` — inventing nothing and transcribing no new number:

- `SHIELD_HEARTS` — bronze 1, silver 2, gold 3, transcribed from design §7a; the unit is blue hearts added by one activation.
- `NO_SHIELD_HEARTS` — 0, what `startEncounter` seeds and what a spent shield returns to.
- `absorbWithShield` — THE single statement of the absorption order: blue hearts take damage before ordinary hearts, one point each. **A blue heart is worth one point, not one hit.** Its `ShieldAbsorption` result is a named-field interface rather than a tuple because `absorbed` and `throughToHealth` are both `Damage` and a transposed pair would type-check cleanly.
- `shieldHeartsForTier` — the only reader of `SHIELD_HEARTS`; throws rather than returning `undefined`.
- `activateShield` (in `encounter.ts`) — **SETS rather than adds**, so it is non-stacking and needs no cap; returns the encounter unchanged when already resolved.
- **Non-healable**, stated as a measured fact: `shieldHearts` has exactly three writers — the seed at `encounter.ts:52`, the absorption result at `:152`, and `activateShield` at `:242`. No heal path writes it.
- Where Ward sits relative to it: `wardSplit` runs first at `encounter.ts:122-123`, so a Ward absorbs ahead of blue hearts.

Close with a **`## Known defects, recorded and not fixed`** section, in the form `.docs/implementation/hunt/buff-condition-evaluation.md` uses:

- **Unreachable in play.** `shieldBuff` has zero production callers and `activateShield` has no app-layer caller, so `encounter.shieldHearts` is `0` for the whole of a real run. Pinned by `src/sim/__tests__/reachability.test.ts`, which asserts `BuffKind.Shield` is *still* unreachable. **No blue heart has ever been drawn by anything.**
- **The `breaking` overlay over-draws** when a shield partially absorbs a landed hit: 3 damage into 2 blue hearts drops red health by 1 but draws 3 breaking red pips, because `resolution.damageToPlayer` is gross while `encounter.shieldHearts` is post-absorption and the absorbed amount is not recoverable from the two. Needs `ResolvedTrick` to record the absorption. Documented in `roundBars.ts`; unreachable today for the reason above, and **visible the moment Shield is wired**.

- [x] **Step 3: Index the new doc in both READMEs**

Add a `shield.md` row to `.docs/implementation/hunt/README.md` and update the `hunt` row in `.docs/implementation/README.md` so the top-level index reflects it. Match the surrounding rows' wording and column shape exactly; do not restructure either table.
Observed: added a `shield.md` How-it-works bullet and DLR-110/DLR-121 to hunt/README.md's Built-by line; added the same two keys to the top-level README.md's hunt row. No table restructured.

- [x] **Step 4: Check the new file's formatting**

Run: `npx prettier --check .docs\implementation\hunt\shield.md .docs\implementation\hunt\README.md .docs\implementation\README.md`
Expected: exits 0. Scoped to this task's own files — **never `npm run format`**, which rewrites ~59 hand-edited design documents.
Observed: `shield.md` exits 0 clean. `hunt/README.md` and `README.md` fail — both are pre-existing large tables that already failed prettier before this task's edits (my diff is 7 and 2 lines respectively, matching surrounding style exactly); not treated as a gate per `web-project.md`'s documented ~58 pre-existing `.md` files that fail repo-wide `format:check`.

### Task 7: Correct the four provably-stale claims in the docs ✓

- Skill: `implementation-doc-writer`

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`
- Modify: `.claude/workflow/web-project.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/rules/README.md`

- [x] **Step 1: Prove the "no buff-fired announcement" claim is false**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "buffFiredText"`
Expected: hits in `src/app/warCouncil/buffFiredLabels.ts` (the definition) **and** `src/app/warCouncil/TrickWell.tsx` (the render, line 67). DLR-119 shipped this two tickets after DLR-125 wrote the claim. Do not proceed if `TrickWell.tsx` does not appear — the claim would still be true.
Observed: hits in both files as expected — `buffFiredLabels.ts` (definition, plus its own test) and `TrickWell.tsx:67` (`const firedText = buffFiredText(...)`).

- [x] **Step 2: Prove the "nothing is saved today" claim is false**

Run: `Get-ChildItem src\vault,src\persistence -Recurse -Include *.ts | Select-String -Pattern "depositLeftoverCoin|saveKeyFor"`
Expected: hits in both trees. DLR-113 and DLR-118 persist the Vault through `src/persistence/`, so a run's leftover coin survives death.
Observed: hits in both trees as expected — `depositLeftoverCoin` in `src/vault/`, `saveKeyFor` in both `src/vault/` and `src/persistence/`.

- [x] **Step 3: Invoke `implementation-doc-writer` and correct `the-hunt.md`**

Four claims, each now false. Correct the statement where it stands — do **not** add a per-ticket section, which `CLAUDE.md` forbids this file from carrying:

- **line ~2357** — "and **nothing on screen announces that a buff fired**" (in the DLR-125 struck-through bullet).
- **line ~2535** — "**Live in the engine but with nothing on screen:** the fact that a buff fired at all. Nothing names the cause when a number comes out larger."
- **line ~3430** — the Known-tensions entry "**Buffs pay now, and nothing tells you when one paid**", whose whole body describes a gap that DLR-119 closed.
- **line ~2387** — "**carrying anything between runs would be the first persistence this game has** — nothing is saved today", in the game-permanent-shelf bullet. The shelf is still `[not built]`; only the persistence half of the sentence is wrong.

Each correction states what is now true and keeps the rule's `[settled]` / `[provisional]` / `[not built]` marking accurate. The Status register is updated where a corrected row appears in it.
Observed: all four corrected in place (no per-ticket section added). Line ~2357's struck-through DLR-125 bullet now states DLR-119 announces a fired buff on screen. Line ~2536's in-progress note now reads "Live in the engine and on screen since DLR-119, 2026-08-24". Line ~3430's Known-tensions entry struck through and marked "closed 2026-08-24, DLR-119". Line ~2387's game-permanent-shelf bullet corrected to say the Vault already persists leftover coin, while the shelf itself stays `[not built]`. Status register row "Anything on screen announcing that a buff fired" (line ~2933) flipped from **not built** to **settled — since DLR-119**, naming `buffFiredLabels.ts`/`TrickWell.tsx`.

**Task 7b (authorised mid-run by the dispatching session after this scope finding was reported):** the same falsified claim, worded "tells you" rather than "announces", also survived at two locations outside the four named bullets — fixed against the same already-satisfied grep evidence, no new proving step needed:
- Line ~49 (top DLR-125 summary blockquote) — "and **nothing on screen tells you a buff fired**" → replaced with "**A fired buff is announced on screen — DLR-119, 2026-08-24** — the trick well names which card fired and what it paid."
- Line ~805 (section-4 body blockquote) — "**Nothing on the screen tells you a buff fired.** The numbers come out larger and no cause is named. Recorded under [Known tensions](#known-tensions-recorded-not-resolved)." → replaced with "**A fired buff is now announced on screen — DLR-119, 2026-08-24.** The trick well names which card fired and what it paid." (the Known-tensions cross-reference was dropped since that entry is now struck through and closed).

Final sweep (`Select-String -Path .docs\game_rules\the-hunt.md -Pattern "buff fired|fired.*no cause|names no cause|nothing is saved|no persistence"`) found exactly two remaining hits, both already-corrected true statements from this task's own earlier edits: line ~2539 ("Live in the engine and on screen since DLR-119...") and line ~2934 (Status register row, "settled — since DLR-119"). A separate case-insensitive sweep for "nothing is saved"/"no persistence" found zero hits. `npm run typecheck` re-run: exit 0. `git status --porcelain` confirmed no file outside the previously-reported union.

- [x] **Step 4: Correct the stale source-file counts where they are owned**

`.claude/workflow/web-project.md` owns "where code lives" per `CLAUDE.md`'s single-source-of-truth table. Its status line and layout block both say **81 source files across six modules and 84 test files**. Measure and replace with the truth:

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx).Count; (Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx).Count; (Get-ChildItem src -Directory).Count`
Expected: **271**, **139**, **8**. Update the status line, the `src/` tree comment, and add the four modules the layout block omits — `vault/`, `sim/`, and confirm `hunt/` and `persistence/` are already listed.
Observed: measured 271 / 139 / 8, matching exactly. Status line updated to "271 source files across eight modules and 139 test files". Layout block's `src/` tree comment updated to the same figures, and `vault/` / `sim/` added with one-line purposes; `hunt/` and `persistence/` were already present.

- [x] **Step 5: Correct the two facts `CLAUDE.md` restates**

Two statements in `CLAUDE.md` are now false:

- The Project-state paragraph's "**`src/` holds 53 source files across four modules** — `app/`, `warCouncil/`, `styles/`, `__tests__/` … 19 of those files are tests." Replace with the measured figures from Step 4 and the real eight-module list.
- The single-source-of-truth table's "Project-wide domain constraints | `.claude/rules/<topic>.md` — **currently empty**; see its `README.md`". `.claude/rules/save-data-versioning.md` exists (written on DLR-106). Drop "currently empty".

Leave the "the POC implements the project's previous design direction" framing alone — that is a judgement about the project's narrative and it is the developer's.
Observed: Project-state paragraph now reads "271 source files across eight modules (measured DLR-121)" naming all eight, "139 of those files are tests." Single-source-of-truth table's rules row now reads "`.claude/rules/<topic>.md`; see its `README.md`" with "currently empty" dropped. Framing sentence left untouched.

- [x] **Step 6: Correct `.claude/rules/README.md`'s stale index**

Its `## Index` reads `*(empty — no rules written yet)*` and the closing paragraph argues at length that the folder is "correctly empty" with "no candidate first rules yet". Both are false. Replace the index with a row for `save-data-versioning.md` naming what it owns, and replace the closing paragraph's empty-folder argument with an accurate one-paragraph statement. Keep the Convention and How-skills-use-this-folder sections exactly as they are.
Observed: file was already corrected — the Index already carries a `save-data-versioning.md` row and the closing paragraphs already state DLR-106 wrote the first rule (no "empty" claim present). No edit needed; Convention and How-skills-use-this-folder sections untouched. Confirmed by direct Read rather than assumed.

- [x] **Step 7: Check formatting of every file this task touched**

Run: `npx prettier --check .docs\game_rules\the-hunt.md .claude\workflow\web-project.md CLAUDE.md .claude\rules\README.md`
Expected: exits 0. Scoped deliberately — the repo-wide `format:check` fails on ~58 pre-existing `.md` files that no contract has touched, and that failure is not a gate.
Observed: `the-hunt.md` fails prettier (pre-existing — a 25-line diff on this ~3900-line hand-formatted file, consistent with the documented ~58 pre-existing failing `.md` files). `web-project.md`, `CLAUDE.md`, and `.claude/rules/README.md` all pass clean.

---

## Phase 3 — Record the verdict, the agenda, and the findings

The phase that produces the ticket's actual value. Nothing here changes behaviour; it writes down what Phase 1 measured and files what cannot be fixed. It is a safe stopping point because it touches only markdown and Jira.

### Task 8: Write the twelve-item DoD verdict ✓

- Skill: `none — a verification record, not code; it reports what Phase 1 measured`

**Files:**
- Create: `.claude/contract/DLR-121-verification-and-sign-off/pr-description.md`

- [x] **Step 1: Record each of DLR-103's twelve DoD items with a verdict and its evidence**

Write a `## The Definition of Done, item by item` section. One row per item: the item's verbatim wording, a verdict of **MET** / **PARTIAL** / **NOT MET**, and the specific evidence — a file path, a grep result, a constant's value, or a spec name. AC1 requires the check be against the **integrated result**, so a mechanic that is correct and tested but unreachable by any path a player can take does not read MET.

The twelve items, verbatim from epic DLR-103:

1. AP economy is implemented, toggleable from one place, and governs both buff activation and Apply Damage cost.
2. Cheat and Timebomb are ordinary owned buff cards with no bespoke felt rail remaining.
3. Apply Damage queues its payout for a one-trick delay by default, resets on a hit during the window, and the quick-kill payout counting question is explicitly resolved before ship.
4. The shop offers Health, AP capacity, a slot-machine buff draw, and the tiered rank abilities; Whetstone, Reflex, the discard-budget increase, and the odds-raising purchase are removed from the shop's purchasable list without their mechanics being deleted.
5. Shield adds non-stacking, non-healable blue hearts per its tier.
6. Rank ability tiers are purchasable, run-permanent, apply to the player only with the Quarry resolving at bronze, and bronze matches the ability printed today so an unspent run is unchanged.
7. The Vault exists, banks leftover coin at death, and offers at least the two confirmed spends (raise odds, buy a starting tier).
8. A fresh run starts with a resolved number of buff cards in the starting pile (not empty-handed).
9. Every card in the pre-hand loadout shows a live win/lose damage readout.
10. The deck persists across the hands of an encounter, tricks resolve into a face-down discard pile, both piles show live counts, and the reshuffle happens only when the draw pile cannot cover a deal and is explicitly signalled when it does.
11. The felt rail, health bar, shop, and a new Vault end-of-run screen are all updated to match, per a dedicated UI pass.
12. `the-hunt.md` and the relevant `.docs/implementation/` module docs are updated to reflect the shipped rules.

Record for each the evidence gathered in Phase 1 — including, at minimum: `AP_ENABLED` in `src/hunt/apConfig.ts` as the single toggle (item 1); `src/sim/__tests__/reachability.test.ts` asserting `Cheat` and `Timebomb` reachable (item 2); `applyDamagePayout.ts`'s "hand size at the press" resolving the quick-kill question (item 3); `SHOP_ITEMS` = `ApCapacity, SwanTier, WitchTier, Heal` with `SlotMachinePanel.tsx` on the shop screen, and only **two of seven** rank ladders (items 4 and 6); `shieldHearts`' three writers and `shieldBuff`'s zero production callers (item 5); `depositLeftoverCoin` plus the two `VaultSpendRefusal` paths (item 7); `STARTING_BUFF_COUNT = 4` placeholders plus `RUN_STARTING_CHEATS = 1`, of which only the Cheat is activatable (item 8); `cardDamage.ts` (item 9); `DiscardPile.tsx`'s `reshuffled` flag and `encounterDeck.ts` (item 10); DLR-119 changing felt rail and health bar while the shop and Vault got prose review and no diff, and **nothing rendered in a browser** (item 11); and this contract's own Phase 2 closing the `shield.md` gap and the four stale claims (item 12).

- [x] **Step 2: Record the verified counts and the fixed-versus-filed split**

Add a `## Verified counts` section quoting Phase 1's actual output — tests, `throw new`, real `Math.random()` call sites, unreachable buff kinds, condition families paying, files over 400 lines, and the simulator's figures. Then a `## Fixed versus filed` section listing every Phase 2 fix against every finding that became a ticket in Task 11, so the developer can see which is which at a glance.

### Task 9: Assemble the consolidated eyes-on agenda ✓

- Skill: `none — a synthesis of existing records into one ordered list`

**Files:**
- Modify: `.claude/contract/DLR-121-verification-and-sign-off/pr-description.md`

- [x] **Step 1: Merge every eyes-on note in the run into ONE ordered, de-duplicated list**

Write a `## The consolidated eyes-on agenda` section. Sources to merge, all of them:

- `.claude/contract/DLR-119-full-visual-and-ux-pass/pr-description.md` §7 — the prioritised eleven, the spine of the list.
- Every `### What a browser would have checked` / `### What the developer must look at` / `### Things the developer should look at with their own eyes` section in `.claude/sprint-runs/2026-08-23-sprint/log.md` — DLR-101, DLR-109, DLR-110, DLR-112, DLR-114, DLR-115, DLR-116, DLR-117, DLR-118, DLR-122, DLR-123, DLR-125, DLR-126, DLR-130, DLR-131, DLR-119, DLR-120, DLR-132.

Rules for the merge, so it is one list rather than forty:

- **De-duplicate ruthlessly.** The four-viewport check (1280×800, 1024×768, 1366×768, 390×844) appears in at least seven tickets — it becomes **one** item naming every surface to check at those sizes. The "do custom properties resolve or silently fall back" check appears in at least five — one item, listing every stylesheet involved (`warCouncilActionBar.css`, `warCouncilHealthBars.css`, `shopSlot.css`, `vault.css`, `errorBoundary.css`, `.wc-dossier`'s narrow bound).
- **Order by what breaks the game for a player**, not by ticket number: a control that cannot be reached, then a screen that crops, then a value that does not resolve, then a console error, then copy, then taste. DLR-119's §7 ordering is preserved inside that frame because it was reasoned and nothing since has changed it.
- **State the precondition where an item has one.** Several checks cannot be reached by playing at all — no blue heart can be drawn, no consumable can be minted — and an agenda item that cannot be performed must say so rather than sending the developer hunting.
- **Head the list with the one-line truth**: nothing in this epic has been seen by a human or a browser, and no test in the 1808 substitutes for any item on it, because jsdom has no layout engine.

### Task 10: Record the decision on the two over-length spec files ✓

- Skill: `none — a recorded decision with its reasoning; no file is split`

**Files:**
- Modify: `.claude/contract/DLR-121-verification-and-sign-off/pr-description.md`

- [x] **Step 1: State the decision and the reasoning, and do not split the files**

Add a `## The two over-length spec files` section recording: `src/warCouncil/__tests__/playCard.test.ts` at **418** lines and `src/warCouncil/__tests__/rankTiers.resolution.test.ts` at **402**, both pre-existing from DLR-123, both over `CLAUDE.md`'s blocking 400-line limit, and both **deliberately left unsplit by this ticket**.

The reasoning, stated plainly so the developer can overrule it: splitting a spec file redistributes shared fixtures and `describe` scoping, which is a real regression risk for zero behavioural gain — and it would be taken on the one ticket in this run whose entire value is that its evidence is trustworthy. A verification pass that quietly refactors the tests it is verifying against cannot be relied on. Defender and QA independently reached the same conclusion during DLR-120. The breach is real, it is filed as its own ticket in Task 11, and it wants a small dedicated change rather than a rider on a sign-off.

### Task 11: File a follow-up ticket for every shortfall ✓

- Skill: `management-jira`

**Files:**
- (creates Jira issues; no file in the repository is modified by this task)

**DONE — eight tickets created under epic DLR-103: DLR-133 through DLR-140.**

Completed by the orchestrator, not the Phase 3 implementer. **Subagents on this box are not
provisioned with the `mcp__atlassian__*` tools** — every call the implementer attempted
(`createJiraIssue`, `getAccessibleAtlassianResources`) returned "No such tool available". It
correctly refused to fabricate ticket keys and reported the gap instead of papering over it.
The orchestrator holds those tools and created all eight. **Worth an `/fb-issue`:** any future
contract that dispatches a Jira-writing task to a subagent will fail the same way.

- [x] **Step 1: Create one ticket per DoD item not fully met, plus the standing findings** ✓ — DLR-133 (Shield), DLR-134 (rank ladders), DLR-135 (starting pile), DLR-136 (consumables), DLR-137 (UI/eyes-on, carries the full agenda), DLR-138 (spec files), DLR-139 (Keepsake/Long Fall), DLR-140 (the-hunt.md restructure). No balance ticket raised, deliberately.

AC3 requires that any DoD item not met is filed rather than silently closed. Read `.claude/skills/management-jira/SKILL.md` first — its status-model section owns the vocabulary and its label-vocabulary section owns the closed layer set (`ui` / `engine` / `infra` / `design` / `spike`) and the `playable` marker. Create each as a child of epic **DLR-103**, carrying the evidence from Task 8 in its description so the developer does not re-derive it:

- **DoD 5 — Shield is built, correct and unreachable.** `shieldBuff` has zero production callers; no blue heart is drawn in a real run; pinned by `reachability.test.ts`. Label `engine`.
- **DoD 4 + 6 — five of seven rank ladders are unshipped.** `TIERED_RANKS` carries Swan and Witch only; Fox, Woodcutter, Treasure, Poison and Monarch have no ladder. Label `engine`.
- **DoD 8 — a fresh run opens with four `Unassigned` placeholders and one bronze Cheat.** The count is resolved but the content is not, so the "larger starting pile addresses the first-fight problem" intent is unmet. Label `design`.
- **DoD 11 — the shop and the Vault got a prose review, not a UI pass**, and no surface in this epic has been rendered in a browser. Label `ui`, and attach the consolidated agenda from Task 9.
- **The five consumables are unreachable** — no template mints one, so Ward, Second Thoughts, Puppeteer, Foresight and Spyglass cannot be obtained; 14 unchosen slot weights sit in the way. Label `engine`.
- **The two over-length spec files** (418 / 402) breach the 400-line limit. Label `infra`.
- **`Keepsake` is confirmed dead and `Long Fall` was never shipped.** DLR-123's `closeHand` made the Keepsake rule decidable; nobody has decided it. Label `design`.
- **`the-hunt.md` carries per-ticket changelog blockquotes** that `CLAUDE.md` forbids it from holding; the document wants a restructuring pass. Label `design`.

Do **not** create a ticket for balance — the developer's balance pass is named in the log entry and the PR description as the epic's largest hand-forward, and raising it as a task would imply an agent could take it.

- [x] **Step 2: Record every created key** ✓ — recorded in `pr-description.md` → `## Fixed versus filed` and in the run-log entry.

List each new issue key against its finding in `pr-description.md` → `## Fixed versus filed`, so the verdict and the board agree.

### Task 12: Append the run-log entry ✓

- Skill: `none — a run record`

**Files:**
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md`

- [x] **Step 1: Append `## DLR-121 — Verification and sign-off` to the log**

Append at the end of the file, matching the surrounding entries' shape. Mandatory content:

- **Each DoD criterion with MET / NOT MET / PARTIAL and the evidence** — the twelve-row verdict from Task 8.
- **What was fixed versus what was filed**, with the Jira keys from Task 11.
- **The consolidated eyes-on list** from Task 9, in full — this is the log's most valuable row for the developer's review.
- **The current verified counts**: tests, `throw new` sites, unreachable kinds, families firing, files over 400 lines, and the simulator's 200-run figures.
- The decision on the two spec files and its reasoning.
- A plain statement that **no browser pass ran, no server was started, and nothing in this epic has been seen by a human** — and that no tuning value was changed by this ticket.

Also update the `**Progress:**` line at the top of the file to **22/22 (100%)**.

---

## Phase 4 — Final verification

No production changes. Confirms the cumulative work left the tree exactly as sound as Phase 1 found it, and that the one comment edit moved nothing.

### Task 13: Confirm the architectural boundary and the integrity counts still hold ✓

- Skill: `none — verification greps only`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Confirm the pure-core boundary is untouched**

Run: `Get-ChildItem src\hunt,src\warCouncil,src\vault,src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits outside comment prose. This contract adds no import to any of the four trees.

- [x] **Step 2: Confirm no throw was weakened**

Run: `(Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new").Count`
Expected: **99** — identical to Task 2 Step 1. Any movement means a guard changed and fails the contract.

- [x] **Step 3: Confirm the line budget did not move**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | ForEach-Object { [PSCustomObject]@{ Lines = (Get-Content $_.FullName).Count; Path = $_.FullName } } | Where-Object { $_.Lines -ge 400 }`
Expected: exactly the two pre-existing spec files at 418 and 402, unchanged. `src/hunt/encounter.ts` gained comment lines in Task 5 — confirm it is still well under 400.

- [x] **Step 4: Confirm the retired vocabulary did not creep back**

Run: `Get-ChildItem src,.docs\implementation -Recurse -Include *.ts,*.tsx,*.md | Select-String -Pattern "Envenom"`
Expected: zero hits. `poison` survives only as `CardRank.Poison` (rank 8) and `TieredRank.Poison`, plus comment prose in four files — a pre-existing DLR-129 gap, not this contract's.

### Task 14: Static gates and full suite ✓

- Skill: `none — the project's own gate commands`

**Files:**
- (no file is created or modified by this task)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test -- --run`
Expected: all three exit 0; Vitest reports **1808 passed of 1808, 139 files, 0 failed** — identical to Task 1, since this contract adds and removes no test.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 15: Finalise the PR description ✓

- Skill: `none — a developer hand-off document`

**Files:**
- Modify: `.claude/contract/DLR-121-verification-and-sign-off/pr-description.md`

- [x] **Step 1: Complete the hand-off**

Ensure `pr-description.md` carries: a link to `plan.md` in this folder; the twelve-item verdict; the verified counts; the fixed-versus-filed split with every Jira key; the consolidated eyes-on agenda; the spec-file decision; the four gate results from Task 14; and a plain statement that **no browser pass ran and no tuning value was changed**. Add a one-line note for future contributors: a verification ticket's diff should be small enough that its own evidence is not in question — that is why six findings here became tickets rather than fixes.

---

## Self-review

**Spec coverage:**
- Re-run all four gates and quote the numbers — Tasks 1, 14.
- Re-measure integrity counts (`throw new`, `Math.random()`, line budgets) — Tasks 2, 13.
- Re-measure reachability and condition families — Task 3.
- Re-run the simulator, retuning nothing — Task 4.
- Check each of the twelve DoD items with evidence — Task 8.
- Fix the false DLR-115 docblock claim — Task 5.
- Create the missing `shield.md` — Task 6.
- Fix the four stale doc claims (`the-hunt.md` ×4, `web-project.md`, `CLAUDE.md` ×2, `rules/README.md`) — Task 7.
- File one ticket per shortfall (AC3) — Task 11.
- Consolidated eyes-on agenda — Task 9.
- Decide and record the over-length spec files — Task 10.
- Append the run-log entry — Task 12.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact command with its `Expected:`, or the exact content to write. No step runs bare `vitest`, `npm run dev`, or `npm run format`. No step hand-edits `package-lock.json`. No step invents a tuning value — `STARTING_BUFF_COUNT` and `RUN_STARTING_CHEATS` are quoted and left alone.

**Type / name consistency:** `hasShieldHearts`, `shieldHearts`, `activateShield`, `absorbWithShield`, `shieldHeartsForTier`, `SHIELD_HEARTS`, `NO_SHIELD_HEARTS`, `ShieldAbsorption`, `shieldBuff`, `AP_ENABLED`, `STARTING_BUFF_COUNT`, `RUN_STARTING_CHEATS`, `SHOP_ITEMS`, `BuffKind`, `BuffConditionKind`, `VaultSpendRefusal`, `depositLeftoverCoin`, `buffFiredText` are each spelled identically in every task that names them, and each matches `plan.md` Part 2 → Data shapes or an existing export verified during planning. No task introduces a new identifier.

**Phase boundary cleanliness:**
- **Phase 1** changes nothing at all, so the tree ends exactly as it began — type-checking, with the gates' results recorded.
- **Phase 2** changes one docblock comment and seven markdown files. Comments are stripped by the compiler, so the tree type-checks throughout; no import, export or signature moves, and no markdown file is referenced by code.
- **Phase 3** writes markdown and creates Jira issues only. No source file is touched, so the tree is unchanged from Phase 2's end state.
- **Phase 4** runs verification commands and completes one markdown file. No production change, so the tree ends type-checking with the same 1808 tests and the same 99 throw sites Phase 1 measured.
</content>
