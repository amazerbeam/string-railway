# DLR-45 — Retire the old-design documentation

Plan: [`plan.md`](./plan.md) in this folder.
Issue: **DLR-45**

## Summary

The repository's live design is `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`, but the
abandoned Fox-in-the-Forest × Hex / US Civil War direction was still all over the working tree. This
change removes it and repairs everything that pointed at it.

**Deleted:**
- 8 design documents under `.docs/design/old-design/` (`claude-civil-war.md`, `concept-critique.md`,
  `deck-as-army.md`, `hybrid-concept.md`, `ideas-and-concepts.md`, `reskin.md`,
  `skirmish-board-replacement.md`, `us-civil-war-game-framing.md`), plus the now-empty
  `old-design/` folder itself
- `.docs/game_rules/hex.md`
- `art/` (5 files: `ART_BIBLE.md`, `palette.mjs`, `karvann.mjs`, `karvann-side.mjs`,
  `war-council-colour.mjs`) and `public/art/` (17 generated `.png` / `.json` / `.svg` assets)
- 16 `SCRUM-*` contract folders under `.claude/contract/` (53 files total, including 5
  `mockup.html`)
- `public/war-council-mockup.html` — see Deviation 3 below

**Moved:**
- `.docs/design/old-design/design-principles.md` → `.docs/design/design-principles.md`

**Repaired:**
- 11 dangling citations into the deleted documents, across `design-principles.md`,
  `.docs/game_rules/vanguard.md`, `.docs/implementation/vanguard.md`,
  `.docs/implementation/war-council.md`, `.docs/implementation/vanguard-ui.md`, and
  `.claude/lessons/2026-08-08-game-designer-plain-language.md`
- 4 descriptions of the now-deleted `art/` tree as present, in `.claude/workflow/web-project.md`
  (3 sites) and `.claude/skills/pixel-artist/references/craft-and-projection.md`
- `CLAUDE.md` — project-state section, Game naming section, both `SCRUM` sites

## Deliberate deviations from the ticket's acceptance criteria

There are four, stated plainly:

1. **AC 4's grep excludes `src/` as well as `.claude/contract/`.** Five in-code comments under
   `src/` name deleted documents (`skirmish-board-replacement.md`, `concept-critique.md`), and AC 6
   forbids touching anything under `src/`. Confirmed via Task 13 Step 2: exactly 5 such references
   remain, all in `src/`, all deliberate.

2. **AC 6's four npm gates were not run**, per developer instruction. `git status --porcelain src`
   stands in as a *direct* proof the POC was untouched — a green build would only have been an
   indirect one. Confirmed clean in Task 15 Step 1 (no output).

3. **`public/war-council-mockup.html` was deleted mid-run on an explicit developer decision.** The
   plan's audit asserted `public/` held only the generated art plus `favicon.svg`; that was wrong —
   a third file was present. Phase 3 (Task 10, Step 3) stopped on the mismatch rather than deleting
   an unlisted path, the developer was asked, and chose deletion: it is a 478-line reskin mockup of
   the retired direction, embedding the deleted art as base64, referenced by nothing, and — living
   in `public/` — it shipped into `dist/` on every build regardless. Recoverable at commit
   `e999201`.

4. **The AC 8 verification grep (Task 12 Step 5 / Task 13 Step 1) has a false positive that cannot
   be removed.** Both patterns include the substring `old-design`, and the contract's own plan slug
   — `DLR-45-retire-old-design-documentation`, which Task 12 Step 4 mandates writing into
   `CLAUDE.md` as the slug-grammar example — contains that substring. `SCRUM` and
   `skirmish-board-replacement` are both confirmed absent from `CLAUDE.md`, so AC 8 is genuinely
   satisfied; the residual hit (`CLAUDE.md:95`) is self-referential, not a surviving pointer. Worth
   an `/fb-issue` so a future run doesn't misread it as a failure.

## The two developer-added scope items

Neither of these was in the original ticket. Both are recoverable from git history (commit
`2cf7ec7` on `origin/master` for the pre-2026-08-01 state; nothing was force-pushed or rewritten):

- **Art cleanup** — `art/` and `public/art/` (developer instruction 2). Deleted in Task 10.
- **`SCRUM-*` contract-folder cleanup** — the 16 folders and 5 mockups from the POC build
  (developer instruction 3). Deleted in Task 11.

## AC 5 — zero edits required

AC 5 (the `game-designer` skill's eight references to `design-principles.md` resolve) needed **no
edit to `SKILL.md` at all**. Moving `design-principles.md` up one level in Task 1 was the entire
fix — all eight references, plus two more in `CLAUDE.md` and the lessons file, resolved the moment
the file landed at the path they already pointed to.

## Verification results, Phases 1-5

**Phase 1** — Move landed, `old-design/design-principles.md` gone. `Select-String
design-principles.md` for deleted siblings → 0 hits (expected 0). `Select-String
.docs\design\Balatro-Forbidden-Solitaire\*.md -Pattern "old-design"` → 0 hits (expected 0).
`game-designer/SKILL.md` `.docs/design/design-principles.md` count → `8` (expected 8), file lists —
**AC 5 satisfied with zero edits**. `CLAUDE.md` + lessons file → exactly 2 hits (expected 2).
*Note:* `hybrid-design.md`'s cited line numbers had drifted (actual 966 and 15-23 vs. cited 986 and
20-23); the quoted literal text matched byte-for-byte at both sites.

**Phase 2** — `game_rules\vanguard.md` deleted-filename grep → 0 hits (expected 0).
`implementation\vanguard.md` → 0 hits (expected 0). `implementation\war-council.md` +
`vanguard-ui.md` → 0 hits (expected 0). Lessons file `us-civil-war|design-principles` → 2 hits
(line 5's bare filename, line 44's live path) — the task documented this as the expected outcome.
`web-project.md` art-tree grep → 0 hits (expected 0).

**Phase 3** — Task 9: all four steps matched exactly; `.docs/design/` now holds
`Balatro-Forbidden-Solitaire/` + `design-principles.md`, `.docs/game_rules/` holds
`fox-in-the-forest.md` + `vanguard.md`. Task 10: art-consumer grep → 0 hits (expected 0); file
count → `22` (expected 22); after the developer-decided mockup deletion, `public/` lists
`favicon.svg` only (expected). Task 11: `16` directories and `53` files confirmed (the literal
command returned `0` files due to a PowerShell wildcard+recurse trap — see Follow-ups below;
re-verified wildcard-free before deleting), `5` mockups; `.claude/contract/` now holds exactly
`archive`, `DLR-44-…`, `DLR-45-…`, `specs`.

**Phase 4** — Step 5 `Select-String CLAUDE.md -Pattern "SCRUM|skirmish-board-replacement|old-design"`
→ 1 hit, `CLAUDE.md:95`, the slug-grammar line containing the contract's own slug; `SCRUM` and
`skirmish-board-replacement` both absent. Step 6 → `app battle styles vanguard warCouncil __tests__
App.tsx main.tsx`, then `142`, then `54` — matching the figures written into `CLAUDE.md` exactly.

**Phase 5** —

- Task 13 Step 1 (`Get-ChildItem .docs,.claude,CLAUDE.md,README.md -Recurse -File | Where-Object
  { $_.FullName -notmatch '\\contract\\' } | Select-String -Pattern
  "claude-civil-war|concept-critique|deck-as-army|hybrid-concept|ideas-and-concepts|reskin\.md|skirmish-board-replacement|us-civil-war-game-framing|hex\.md|old-design"`):
  2 hits, both anticipated false positives per the plan — `.claude\lessons\2026-08-08-game-designer-plain-language.md:5`
  (the bare-filename citation "retired on DLR-45", the contract's own convention) and
  `CLAUDE.md:95` (the contract's own slug, `DLR-45-retire-old-design-documentation`). No other hit.
  PASS.
- Task 13 Step 2 (`Get-ChildItem src -Recurse -File | Select-String -Pattern
  "skirmish-board-replacement|concept-critique" | Measure-Object | Select-Object -ExpandProperty Count`):
  `5` (expected `5`). PASS.
- Task 13 Step 3 (art-tree-present grep excluding `pixel-artist`): 0 hits (expected 0). PASS.
- Task 14 Step 1 (`Get-ChildItem art,public\art,.docs\design\old-design,.docs\game_rules\hex.md,.claude\contract\SCRUM-*,public\war-council-mockup.html -ErrorAction SilentlyContinue`):
  no output — all six deletion targets confirmed absent (verified individually with `-ErrorAction
  Stop` in a `try/catch`, which surfaced "Cannot find path … 'art'", confirming the silent case is
  "not found," not "found but empty"). PASS.
- Task 14 Step 2 (the eleven-path survivor check): all eleven paths listed without error.
  `.docs/implementation/` holds its eight files (`app.md`, `battle-ui.md`, `battle.md`,
  `README.md`, `vanguard-ui.md`, `vanguard.md`, `war-council-ui.md`, `war-council.md`).
  `.claude\contract\archive` and `.claude\contract\specs` exist (`Test-Path` → `True`, `True`) but
  are empty, which is why they printed no listing of their own in the combined command — not an
  error. PASS.
- Task 15 Step 1 (`git status --porcelain src`): no output. `src/` is confirmed untouched. PASS.
- Task 15 Step 2 (`git status --porcelain`, full output):

  ```
   D .claude/contract/SCRUM-19-battle-module-scaffold/plan.md
   D .claude/contract/SCRUM-19-battle-module-scaffold/pr-description.md
   D .claude/contract/SCRUM-19-battle-module-scaffold/tasks.md
   D .claude/contract/SCRUM-20-war-council-rules-engine/plan.md
   D .claude/contract/SCRUM-20-war-council-rules-engine/pr-description.md
   D .claude/contract/SCRUM-20-war-council-rules-engine/tasks.md
   D .claude/contract/SCRUM-21-vanguard-board-engine/plan.md
   D .claude/contract/SCRUM-21-vanguard-board-engine/pr-description.md
   D .claude/contract/SCRUM-21-vanguard-board-engine/tasks.md
   D .claude/contract/SCRUM-22-muster-conversion/plan.md
   D .claude/contract/SCRUM-22-muster-conversion/pr-description.md
   D .claude/contract/SCRUM-22-muster-conversion/tasks.md
   D .claude/contract/SCRUM-23-breach-win-condition/plan.md
   D .claude/contract/SCRUM-23-breach-win-condition/pr-description.md
   D .claude/contract/SCRUM-23-breach-win-condition/tasks.md
   D .claude/contract/SCRUM-24-the-clash-turn-engine/plan.md
   D .claude/contract/SCRUM-24-the-clash-turn-engine/pr-description.md
   D .claude/contract/SCRUM-24-the-clash-turn-engine/tasks.md
   D .claude/contract/SCRUM-25-battle-loop-orchestrator/plan.md
   D .claude/contract/SCRUM-25-battle-loop-orchestrator/pr-description.md
   D .claude/contract/SCRUM-25-battle-loop-orchestrator/tasks.md
   D .claude/contract/SCRUM-26-war-council-cpu-heuristic/plan.md
   D .claude/contract/SCRUM-26-war-council-cpu-heuristic/pr-description.md
   D .claude/contract/SCRUM-26-war-council-cpu-heuristic/tasks.md
   D .claude/contract/SCRUM-27-vanguard-cpu-heuristic/plan.md
   D .claude/contract/SCRUM-27-vanguard-cpu-heuristic/pr-description.md
   D .claude/contract/SCRUM-27-vanguard-cpu-heuristic/tasks.md
   D .claude/contract/SCRUM-28-war-council-ui/mockup.html
   D .claude/contract/SCRUM-28-war-council-ui/plan.md
   D .claude/contract/SCRUM-28-war-council-ui/pr-description.md
   D .claude/contract/SCRUM-28-war-council-ui/tasks.md
   D .claude/contract/SCRUM-29-vanguard-ui/mockup.html
   D .claude/contract/SCRUM-29-vanguard-ui/plan.md
   D .claude/contract/SCRUM-29-vanguard-ui/pr-description.md
   D .claude/contract/SCRUM-29-vanguard-ui/tasks.md
   D .claude/contract/SCRUM-30-clash-hud/mockup.html
   D .claude/contract/SCRUM-30-clash-hud/plan.md
   D .claude/contract/SCRUM-30-clash-hud/pr-description.md
   D .claude/contract/SCRUM-30-clash-hud/tasks.md
   D .claude/contract/SCRUM-31-battle-flow-screens/mockup.html
   D .claude/contract/SCRUM-31-battle-flow-screens/plan.md
   D .claude/contract/SCRUM-31-battle-flow-screens/pr-description.md
   D .claude/contract/SCRUM-31-battle-flow-screens/tasks.md
   D .claude/contract/SCRUM-34-wire-battle-loop-into-app-shell/plan.md
   D .claude/contract/SCRUM-34-wire-battle-loop-into-app-shell/pr-description.md
   D .claude/contract/SCRUM-34-wire-battle-loop-into-app-shell/tasks.md
   D .claude/contract/SCRUM-37-app-shell-mode-select-scaffold/plan.md
   D .claude/contract/SCRUM-37-app-shell-mode-select-scaffold/pr-description.md
   D .claude/contract/SCRUM-37-app-shell-mode-select-scaffold/tasks.md
   D .claude/contract/SCRUM-40-vanguard-targeting-and-layout-fixes/mockup.html
   D .claude/contract/SCRUM-40-vanguard-targeting-and-layout-fixes/plan.md
   D .claude/contract/SCRUM-40-vanguard-targeting-and-layout-fixes/pr-description.md
   D .claude/contract/SCRUM-40-vanguard-targeting-and-layout-fixes/tasks.md
   M .claude/lessons/2026-08-08-game-designer-plain-language.md
   M .claude/skills/pixel-artist/references/craft-and-projection.md
   M .claude/workflow/web-project.md
   M .docs/design/Balatro-Forbidden-Solitaire/balatro.md
   M .docs/design/Balatro-Forbidden-Solitaire/forbidden-solitaire.md
   M .docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md
   D .docs/design/old-design/claude-civil-war.md
   D .docs/design/old-design/concept-critique.md
   D .docs/design/old-design/deck-as-army.md
   D .docs/design/old-design/design-principles.md
   D .docs/design/old-design/hybrid-concept.md
   D .docs/design/old-design/ideas-and-concepts.md
   D .docs/design/old-design/reskin.md
   D .docs/design/old-design/skirmish-board-replacement.md
   D .docs/design/old-design/us-civil-war-game-framing.md
   D .docs/game_rules/hex.md
   M .docs/game_rules/vanguard.md
   M .docs/implementation/vanguard-ui.md
   M .docs/implementation/vanguard.md
   M .docs/implementation/war-council.md
   M CLAUDE.md
   D art/ART_BIBLE.md
   D art/karvann-side.mjs
   D art/karvann.mjs
   D art/palette.mjs
   D art/war-council-colour.mjs
   D public/art/proof-foot-30k.svg
   D public/art/proof-horse-100k.svg
   D public/art/proof-mono-foot-90k.svg
   D public/art/proof-mono-horse-90k.svg
   D public/art/proof-mono-siege-90k.svg
   D public/art/proof-siege-1m.svg
   D public/art/proof-stack-5.svg
   D public/art/war-council-colour-silhouette.json
   D public/art/war-council-colour-silhouette.png
   D public/art/war-council-colours-mono.json
   D public/art/war-council-colours-mono.png
   D public/art/war-council-colours.json
   D public/art/war-council-colours.png
   D public/art/war-council-furled.json
   D public/art/war-council-furled.png
   D public/art/war-council-stack-2.png
   D public/art/war-council-stack-5.png
   D public/war-council-mockup.html
  ?? .claude/contract/DLR-45-retire-old-design-documentation/
  ?? .docs/design/design-principles.md
  ```

  Every path matches the File map: the 16 `SCRUM-*` folders and their 53 files (D), the 9
  `.docs/design/old-design/` files plus `hex.md` (D), `art/` (5 files, D) and `public/art/` (17
  files, D), `public/war-council-mockup.html` (D, Deviation 3), the modified docs and `CLAUDE.md`
  (M), the untracked new plan folder and the untracked `design-principles.md` at its new home (`??`
  — git sees the move as a delete-and-add pair because it was not staged as a rename). Nothing
  outside the File map appears. PASS.
- Task 16 (this file) — created at
  `.claude/contract/DLR-45-retire-old-design-documentation/pr-description.md`.

## Follow-ups for the developer

Each of the following is a separate piece of work, out of scope for this contract:

- **`/fb-issue` on `.claude/skills/management-jira/SKILL.md`**, which still says `SCRUM` throughout
  and owns the status model `CLAUDE.md` now points at generically.
  `.claude/skills/jira-epic-decomposition/SKILL.md:197`'s `SCRUM-18-epic-breakdown` example belongs
  in the same fix.
- **`.claude/workflow/web-project.md`'s "Architectural boundaries" section** still says the project
  has "no subfolder convention, module split, or lint-enforced purity rule" — false now that six
  modules are on disk. This contract edited only that file's layout block and the `public/art/`
  bullet; the boundaries section is untouched and out of scope here.
- **The `SCRUM-NN` ticket-key citations throughout `.docs/implementation/*.md`** are stale after the
  project-key rename to `DLR`. AC 8 was scoped to `CLAUDE.md` only.
- **The 27 old-direction Jira issues remain open** and still describe the abandoned direction. The
  DLR workflow has no `Cancelled` status, so retiring them is a manual decision in the Jira UI.
- **`/fb-issue` on the plan's `public/` audit** — it enumerated `public/art/` and `favicon.svg` and
  missed a third file (`public/war-council-mockup.html`, see Deviation 3). A directory-level audit
  that lists contents rather than asserting them would have caught it.
- **A PowerShell counting trap worth recording** — `Get-ChildItem <wildcard-path> -Recurse -File`
  re-applies the wildcard at every recursion level, so `Get-ChildItem .claude\contract\SCRUM-*
  -Recurse -File` returned `0` instead of `53`. Task 11 Step 1 would have read as a stop condition on
  a correct repo. The wildcard-free form (`Get-ChildItem -Directory -Filter "SCRUM-*" |
  ForEach-Object { Get-ChildItem $_.FullName -Recurse -File }`) is correct.
- **The AC 8 verification grep's self-referential false positive** (Deviation 4 above) — worth its
  own `/fb-issue` so a future contract whose slug happens to contain a word its own grep searches
  for doesn't misread the hit as a failure.

## Note for future contributors

Retired design documents are cited in-place by name with "retired on DLR-45", never by a path that
no longer resolves.
