# Tasks: Retire the Envenom name and the duplicate mechanic — Timebomb is canonical

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note:** `plan.md` was NOT developer-confirmed. This is an out-of-band item in an unattended sprint run; the coordinator's instruction was to take the plan's stated defaults and skip the approval gate. The mockup gate was also skipped, and this is a UI ticket that changes what the player reads — the developer has not seen the new copy on screen.

Status: IN PROGRESS
Started: 2026-08-23

**Goal:** Make Timebomb the only name for the delayed-damage mechanic — every identifier, file name, CSS class, test name, and player-facing string — with no number and no behaviour changed.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** *(none — every new file is a `git mv` of an existing one)*

**Modified:**
- `src/hunt/config.ts` — four tuning constants renamed, values unchanged
- `src/hunt/{index.ts,types.ts,encounter.ts,run.ts,runTransitions.ts,shop.ts,buffCatalog.ts}` — Envenom/poison family renames
- `src/warCouncil/{index.ts,types.ts,bank.ts,playCard.ts,legalMoves.ts,deal.ts,discard.ts,voluntaryCashOut.ts}` — engine renames
- `src/app/warCouncil/{roundUiState.ts,roundReducer.ts,commitHandlers.ts,discardHandlers.ts,duelHealthBars.ts,roundBars.ts,roundHint.ts,labels.ts,WarCouncilRound.tsx,HandFan.tsx,PlayingCard.tsx,TrickWell.tsx,ApplyDamagePlate.tsx,AbilityPrompt.tsx,DecreePile.tsx,DiscardPlate.tsx}` — app-layer renames
- `src/app/warCouncil/{warCouncil.css,warCouncilCards.css,warCouncilHealthBars.css,warCouncilHunt.css,warCouncilTable.css,warCouncilApplyDamage.css,warCouncilDiscard.css}` — class and `data-state` renames
- `src/app/run/{ShopPanel.tsx,shopLabels.ts,run.css}` — shop path renames and copy
- `src/app/warCouncilMount.ts`, `src/App.tsx` — prop and state renames
- every spec under `src/**/__tests__/` that names an Envenom or poison identifier

**Renamed (`git mv`):** see `plan.md` Part 2 → Data shapes → "Files renamed" for the full 11-row table.

**Deleted:** (none)

**Developer decides or observes:**
- The copy decision — fuse vocabulary over poison vocabulary — and its largest consequence, `Poison Guard` → `Blast Guard`. Reversible from the before/after table in `plan.md`.
- Whether the new strings read well in the running app: the health bar's `10 of 10. 4 ticking.`, the reveal's `Timebomb primed — you take 2 at the next trick.`, the felt rail's `Timebomb` / `No Timebomb held`, and the shop's `Blast Guard`. No mockup was produced.
- Whether `timebombDamageFor` sitting beside `timebombDamageOf` is tolerable until DLR-114/DLR-116 collapses them.

---

## Phase 1 — The Envenom family

A blanket case-preserving substitution of the `envenom` token, which appears nowhere in this repo except as this mechanic, followed by targeted corrections that put the mark-on-a-card identifiers onto the lexicon's word, and the file renames. Safe stopping point because the substitution is total: no reader is left on an old name, so the tree type-checks at the end of it.

### Task 1: Substitute the Envenom token across `src/**` ✓

- Skill: `react-frontend`

**Files:**
- Modify: every file under `src/` matching `envenom` case-insensitively (67 files, per `grep -ril envenom src/`)

**The rename tool.** Bulk substitution is performed with `node`, never with PowerShell string replacement: this source is UTF-8 and dense with em-dashes, and PowerShell reads it as ANSI and corrupts every one it writes back — a silent diff no gate catches. Node reads and writes UTF-8 natively. The tool is already on disk at:

`C:\Users\jossd\AppData\Local\Temp\claude\E--Game-Dev-StringsAndStations\a0a4041f-68cb-4acc-8aba-95a62213dfc8\scratchpad\bulkRename.mjs`

It takes a JSON file of `[["regexSource","replacement"], …]` pairs applied **in order** to every `.ts`/`.tsx`/`.css` file under `src/`, and prints a per-pair replacement count plus a changed-file list. Add `--dry` to preview. Write each pairs file with the `Write` tool into the same scratchpad directory.

- [x] **Step 1: Run the three case-preserving substitutions**

Write `pairs-1.json` into the scratchpad directory with exactly:

```json
[["ENVENOM", "TIMEBOMB"], ["Envenom", "Timebomb"], ["envenom", "timebomb"]]
```

Run: `node "<scratchpad>\bulkRename.mjs" "<scratchpad>\pairs-1.json"`
Expected: non-zero counts for all three pairs; total ~953 replacements.

Then verify: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "envenom" -CaseSensitive:$false`
Expected: zero hits.

- [x] **Step 2: Correct the four mark-on-a-card identifiers to the `primed` lexicon**

The blanket pass produced `timebombedCards`, `isTimebombed`, `trickIsTimebombed`, `timebombCard`, and a `timebombed` component prop. The lexicon calls the mark on a card *primed*.

Write `pairs-2.json` with exactly (order matters — the longest names first):

```json
[["timebombedCards", "primedCards"], ["trickIsTimebombed", "trickIsPrimed"], ["isTimebombed", "isPrimed"], ["timebombCard\\b", "primeCard"], ["\\btimebombed\\b", "primed"], ["\\bTimebombed\\b", "Primed"]]
```

Run: `node "<scratchpad>\bulkRename.mjs" "<scratchpad>\pairs-2.json"`

Then verify: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "timebombed" -CaseSensitive:$false`
Expected: zero hits.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Rename the Envenom-named files with `git mv` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/index.ts`, `src/app/warCouncil/WarCouncilRound.tsx`, and every file importing a renamed module
- Test: the six renamed spec files listed below

- [ ] **Step 1: `git mv` the ten files**

Run (PowerShell — git is installed but not on this shell's `PATH`, so prepend it; shell state does not persist between calls, so keep it all in one chained command):

```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"
git mv src/warCouncil/envenom.ts src/warCouncil/timebomb.ts
git mv src/warCouncil/__tests__/envenom.test.ts src/warCouncil/__tests__/timebomb.test.ts
git mv src/warCouncil/__tests__/playCard.envenom.test.ts src/warCouncil/__tests__/playCard.timebomb.test.ts
git mv src/hunt/__tests__/envenom.test.ts src/hunt/__tests__/timebomb.test.ts
git mv src/app/warCouncil/EnvenomCharge.tsx src/app/warCouncil/TimebombCharge.tsx
git mv src/app/warCouncil/warCouncilEnvenom.css src/app/warCouncil/warCouncilTimebomb.css
git mv src/app/warCouncil/__tests__/EnvenomCharge.test.tsx src/app/warCouncil/__tests__/TimebombCharge.test.tsx
git mv src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx
git mv src/app/warCouncil/__tests__/roundReducer.envenom.test.ts src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts
git mv src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/roundReducer.timebombQueue.test.ts
```

Expected: exits 0; `git status --porcelain` shows ten `R` entries.

- [x] **Step 2: Repoint every import and stylesheet reference at the new paths**

Substitute the module specifiers: `'./envenom'` → `'./timebomb'`, `'./EnvenomCharge'` → `'./TimebombCharge'`, `'./warCouncilEnvenom.css'` → `'./warCouncilTimebomb.css'`, and the same for any `../` form. Task 1's blanket pass has already rewritten these to `'./timebomb'` / `'./TimebombCharge'` / `'./warCouncilTimebomb.css'`, so this step is a verification, not an edit.

Run: `npm run typecheck`
Expected: exits 0 — a module-not-found error here means a specifier the blanket pass missed.

- [x] **Step 3: Run the renamed specs**

Run: `npx vitest run src/warCouncil/__tests__/timebomb.test.ts src/hunt/__tests__/timebomb.test.ts src/app/warCouncil/__tests__/TimebombCharge.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

---

## Phase 2 — The poison family

Cannot be a blanket pass: `CardRank.Poison` is a base-game card rank with no connection to this mechanic, and `src/hunt/flask.ts` uses "poison" as a metaphor about a clamp. Every substitution here is per-identifier, from `plan.md`'s enumerated audit. The `Doomed` enum member and the `[data-state='doomed']` selector that binds to its string value move in the same task, because the compiler sees neither side of that binding. Safe stopping point: the tree type-checks and no stylesheet selector is orphaned.

### Task 3: Rename the poison-family identifiers

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/{config.ts,index.ts,types.ts,encounter.ts,run.ts,runTransitions.ts,shop.ts}`, `src/warCouncil/{types.ts,bank.ts,legalMoves.ts,playCard.ts,voluntaryCashOut.ts,index.ts}`, `src/app/warCouncil/{roundUiState.ts,roundReducer.ts,commitHandlers.ts,labels.ts,TrickWell.tsx,WarCouncilRound.tsx}`, `src/app/run/{ShopPanel.tsx,shopLabels.ts}`, `src/app/warCouncilMount.ts`, `src/App.tsx`
- Test: every spec naming one of these identifiers
- Config: `src/hunt/config.ts` — rename `POISON_GUARD_PRICE` to `BLAST_GUARD_PRICE`; value stays `1`

- [ ] **Step 1: Substitute each identifier by name**

Write `pairs-3.json` with exactly (order matters — longest first):

```json
[["POISON_GUARD_PRICE", "BLAST_GUARD_PRICE"], ["POISON_GUARD", "BLAST_GUARD"], ["PoisonGuard", "BlastGuard"], ["poisonGuardHeld", "blastGuardHeld"], ["poisonGuardSpent", "blastGuardSpent"], ["poisonGuarded", "blastGuarded"], ["poisonGuard", "blastGuard"], ["Poison Guard", "Blast Guard"], ["poisonToPlayer", "timebombToPlayer"], ["poisonToQuarry", "timebombToQuarry"], ["poisonPending", "timebombPending"], ["poisonBookedText", "timebombBookedText"], ["VENOM_MARK_LABEL", "PRIMED_MARK_LABEL"]]
```

Run: `node "<scratchpad>\bulkRename.mjs" "<scratchpad>\pairs-3.json"`

Then verify: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "poisonGuard|poisonTo|poisonPending|poisonBookedText|VENOM_MARK_LABEL|PoisonGuard|POISON_GUARD|Poison Guard"`
Expected: zero hits.

- [ ] **Step 2: `git mv` the Poison Guard spec**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git mv src/hunt/__tests__/poisonGuard.test.ts src/hunt/__tests__/blastGuard.test.ts`
Expected: exits 0; `git status --porcelain` shows the `R` entry.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 4: Rename the `Doomed` heart state and its `data-state` binding

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`, `src/app/warCouncil/roundBars.ts`, `src/app/warCouncil/labels.ts`, `src/app/warCouncil/DuelHealthBars.tsx` (if present), `src/app/warCouncil/warCouncilHealthBars.css`
- Test: `src/app/warCouncil/__tests__/{duelHealthBars.test.ts,DuelHealthBars.test.tsx,roundBars.test.ts,labels.test.ts,WarCouncilRound.duelHealthBars.test.tsx}`

- [ ] **Step 1: Substitute the enum member, the field, and the selector together**

Write `pairs-4.json` with exactly:

```json
[["Doomed", "Ticking"], ["doomed", "ticking"], ["DOOMED", "TICKING"]]
```

Run: `node "<scratchpad>\bulkRename.mjs" "<scratchpad>\pairs-4.json"`

Then verify: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "doomed" -CaseSensitive:$false`
Expected: zero hits.

And confirm the binding moved on both sides: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "ticking"`
Expected: the `DuelHeartState.Ticking` member, the `HealthBarView.ticking` field, and the `[data-state='ticking']` selector in `warCouncilHealthBars.css` all present.

- [ ] **Step 2: Typecheck and run the health-bar specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts src/app/warCouncil/__tests__/roundBars.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

### Task 5: Rename the three CSS class families

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/warCouncilTimebomb.css`, `src/app/warCouncil/warCouncilCards.css`, `src/app/warCouncil/warCouncilTable.css`, `src/app/warCouncil/TimebombCharge.tsx`, `src/app/warCouncil/PlayingCard.tsx`, `src/app/warCouncil/TrickWell.tsx`
- Test: `src/app/warCouncil/__tests__/{TimebombCharge.test.tsx,PlayingCard.test.tsx,TrickWell.test.tsx}`

- [ ] **Step 1: Substitute the class names in markup and stylesheets together**

Task 1's blanket pass already turned `wc-envenom-*` into `wc-timebomb-*`. The two remaining families are:

Write `pairs-5.json` with exactly:

```json
[["wc-venom-mark", "wc-primed-mark"], ["wc-poison-clause", "wc-timebomb-clause"]]
```

Run: `node "<scratchpad>\bulkRename.mjs" "<scratchpad>\pairs-5.json"`

Then verify: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-venom-mark|wc-poison-clause|wc-envenom"`
Expected: zero hits.

- [ ] **Step 2: Typecheck and run the affected component specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx src/app/warCouncil/__tests__/TrickWell.test.tsx src/app/warCouncil/__tests__/TimebombCharge.test.tsx`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 3 — Copy and prose

The player-facing strings are sentences, not tokens: several change more than the noun, so each is edited individually against `plan.md`'s 19-row before/after table. The comment prose that still describes this mechanic as poison is swept in the same phase, and the two protected sites are re-verified untouched at the end. Safe stopping point: the tree type-checks and the specs asserting on copy have been updated in the same task as the copy.

### Task 6: Apply the fuse vocabulary to every player-facing string

- Skill: `game-ux`

**Files:**
- Modify: `src/app/run/shopLabels.ts`, `src/app/warCouncil/labels.ts`, `src/warCouncil/timebomb.ts`
- Test: `src/app/run/__tests__/{shopLabels.test.ts,ShopPanel.test.tsx}`, `src/app/warCouncil/__tests__/{labels.test.ts,duelHealthBars.test.ts,DuelHealthBars.test.tsx,TrickWell.test.tsx,PlayingCard.test.tsx,HandFan.test.tsx,AbilityPrompt.test.tsx,TimebombCharge.test.tsx,WarCouncilRound.*.test.tsx}`, `src/warCouncil/__tests__/timebomb.test.ts`

- [ ] **Step 1: Edit each of the 19 strings to its "After" column**

Apply `plan.md` Part 2 → Data shapes → "Player-facing copy — the full before/after table", rows 1-19, verbatim. Constant names in that table that change (`SHOP_ENVENOM_LABEL` → `SHOP_TIMEBOMB_LABEL`, `ENVENOM_RAIL_LABEL` → `TIMEBOMB_RAIL_LABEL`, etc.) were already moved by Phase 1's blanket pass; this step changes the string **values** and the two names Phase 1 could not reach (`VENOM_MARK_LABEL`, handled in Task 3).

Row 10 is the one with a structural dependency: `labels.ts`'s health-bar clause reads `view.ticking` after Task 4, so the template becomes:

```ts
const ticking = view.ticking > 0 ? ` ${view.ticking} ticking.` : ''
```

- [ ] **Step 2: Update every spec that asserts on a changed string**

Change the expected strings to match, and change `describe`/`it` names that say "poison"/"Envenom" to the new vocabulary. **No assertion is weakened, relaxed to a substring match, or deleted** — in particular `src/hunt/__tests__/run.purchaseIsolation.test.ts` keeps its exactly-one-field-changed assertions intact; only the field name and the test's name move.

- [ ] **Step 3: Run every spec touching copy**

Run: `npx vitest run src/app/run src/app/warCouncil src/warCouncil/__tests__/timebomb.test.ts src/hunt/__tests__/run.purchaseIsolation.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 7: Sweep the comment prose that still calls the mechanic poison

- Skill: `react-frontend`

**Files:**
- Modify: every file where `grep -rn "poison" src/` still reports a hit after Task 6, excluding the two protected sites

- [ ] **Step 1: List the remaining hits and rewrite each in place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "poison" -CaseSensitive:$false`
Then rewrite each hit that describes **this mechanic** to the new vocabulary — "poison" → "the Timebomb" / "the blast" / "the booked hit" as the sentence requires; "poisoned" → "primed"; "Poison Guard" → "Blast Guard".

**Leave untouched, and confirm they survive:**
- `src/warCouncil/types.ts` — `Poison: 8` in `CardRank` and the two doc-comment lines explaining it (`fox-in-the-forest.md` → Poison cards). This is the base game's card rank, not this mechanic.
- `src/hunt/flask.ts:38,60` — "poison" used metaphorically about a `Math.min` clamp.

Where a comment cites a ticket by its historical title (`DLR-90 — Envenom and the delayed hit rule`), keep the citation honest: refer to the ticket by key and describe it in current vocabulary rather than asserting a title Jira no longer carries.

- [ ] **Step 2: Confirm only the protected sites remain**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "poison|venom" -CaseSensitive:$false`
Expected: hits only in `src/warCouncil/types.ts` (the `CardRank.Poison` member and its doc comment) and `src/hunt/flask.ts` (the clamp metaphor).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

---

## Phase 4 — Final verification

No production changes. Only checks that the cumulative rename is complete, that the protected names survived, that no file breached the 400-line budget, and that all four gates are green.

### Task 8: Confirm no stale name remains and the protected names survived

- Skill: `none — verification greps only, no code written`

**Files:**
- Modify: (none)

- [ ] **Step 1: Grep recursively for every retired name**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "envenom|wc-venom|wc-poison|doomed|poisonGuard|POISON_GUARD|poisonTo|poisonPending" -CaseSensitive:$false`

Expected: zero hits. (`Select-String -Path` does **not** recurse and `**` in its glob matches exactly one directory level — the `Get-ChildItem -Recurse` form is mandatory here, per `web-project.md`.)

- [ ] **Step 2: Confirm the base-game card rank and the flask metaphor survived**

Run: `Select-String -Path src\warCouncil\types.ts -Pattern "Poison"; Select-String -Path src\hunt\flask.ts -Pattern "poison"`
Expected: `CardRank.Poison`'s member and doc comment present in the first; two metaphor lines present in the second.

- [ ] **Step 3: Confirm the bronze figures still flow from the two constants**

Run: `Select-String -Path src\hunt\config.ts,src\hunt\buffCatalog.ts -Pattern "TIMEBOMB_QUARRY_DAMAGE|TIMEBOMB_PLAYER_DAMAGE"`
Expected: declared once each in `config.ts` at `4` and `2`; read by `timebombRow()` in `buffCatalog.ts`. No literal `4` or `2` was substituted for either name.

- [ ] **Step 4: Confirm no file breached the 400-line budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | ForEach-Object { [pscustomobject]@{ n=$_.FullName; c=(Get-Content $_.FullName).Count } } | Where-Object { $_.c -gt 400 }`
Expected: no output. A breach is fixed in this ticket, never reported as a finding.

### Task 9: Static gates, full suite, and build

- Skill: `none — verification only, no code written`

**Files:**
- Modify: (none)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `Tests  1192 passed (1192)` across 91 files. Any movement in that count is a defect to explain, not a consequence of a rename.

- [ ] **Step 2: Formatting of the files this contract changed**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; $f = git diff --name-only HEAD | Where-Object { $_ -match '\.(ts|tsx|css)$' }; npx prettier --check @f`
Expected: exits 0. Run `npx prettier --write` on any file it flags, then re-check. Do **not** run the repo-wide `format:check` as a gate — it fails on ~58 pre-existing `.md` files this contract has not touched.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 10: Update the PR description

- Skill: `none — documentation hand-off, no code written`

**Files:**
- Create: `.claude/contract/DLR-129-retire-the-envenom-name/pr-description.md`

- [ ] **Step 1: Write `pr-description.md`**

Include: a link to `plan.md` in this folder; the copy decision and the rejected alternative; the full before/after string table; the statement that the de-duplication (scope item 2) was deliberately not delivered and why; the four gate results with real numbers; and the list of what only the developer can judge.

---

## Self-review

**Spec coverage:**
- Rename every Envenom identifier across `src/hunt/`, `src/warCouncil/`, `src/app/` — Tasks 1, 3.
- `git mv` the Envenom-named files, collisions resolved — Task 2.
- Rename the four tuning constants, values unchanged — Tasks 1, 3; verified in Task 8 Step 3.
- Rename the poison-family identifiers — Task 3.
- Rename `Doomed` and its `data-state` binding — Task 4.
- Rename the CSS class families — Tasks 1, 5.
- Apply the chosen copy vocabulary to every player-facing string — Task 6.
- Update test names honestly, no assertion weakened — Task 6 Step 2.
- Comment prose sweep, protected names preserved — Task 7; verified in Task 8 Steps 1-2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact command or names the exact table row it applies.

**Type / name consistency:** `TIMEBOMB_QUARRY_DAMAGE`, `TIMEBOMB_PLAYER_DAMAGE`, `TIMEBOMB_PRICE`, `BLAST_GUARD_PRICE`, `TimebombStage`, `timebombArmed`, `primedCards`, `isPrimed`, `trickIsPrimed`, `primeCard`, `pendingTimebomb`, `hasPendingTimebomb`, `queueTimebomb`, `NO_PENDING_TIMEBOMB`, `timebombDamageFor`, `timebombCharges`, `blastGuardHeld`, `blastGuardSpent`, `blastGuarded`, `timebombToPlayer`, `timebombToQuarry`, `timebombPending`, `timebombTarget`, `timebombTrick`, `timebombBookedText`, `PRIMED_MARK_LABEL`, `DuelHeartState.Ticking`, `HealthBarView.ticking` are each used identically in `plan.md` Part 2 → Data shapes and in every task that names them. No task introduces a name absent from Data shapes.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking — the blanket substitution is total for the `envenom` token, so no reader is left on an old name, and the file renames are accompanied by their (already-substituted) import specifiers.
- Phase 2 ends type-checking — each identifier is substituted across every file that names it in one pass, and the `Doomed` enum member and its stylesheet selector move together, so no selector is orphaned.
- Phase 3 ends type-checking — copy and the specs asserting on it change in the same task, so no spec is left expecting a retired string.
- Phase 4 makes no production change.
</content>
</invoke>
