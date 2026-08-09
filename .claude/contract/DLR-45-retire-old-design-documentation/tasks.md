# Tasks: Retire the old-design documentation now that hybrid-design.md is the live design

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-09

**Goal:** Remove the abandoned Fox × Hex / US Civil War direction from the working tree — 8 design documents, `.docs/game_rules/hex.md`, all of `art/` and `public/art/`, and the 16 `SCRUM-*` contract folders — rescue `design-principles.md` up one level, repair every surviving reference into the deleted material, and correct `CLAUDE.md`, without touching `src/`.

**Spec:** `plan.md` in this folder.

**No code checks or tests are planned.** Per developer instruction, this contract runs no `npm run typecheck`, `npm run lint`, `npm test`, or `npm run build`. AC 6's purpose — proving the POC was not touched — is met by `git status --porcelain src` in Phase 5. No task in this contract names a file that TypeScript, ESLint, Vite, or Vitest reads.

---

## File map

**Created:**
- `.claude/contract/DLR-45-retire-old-design-documentation/pr-description.md` — the PR body for the developer to paste

**Moved:**
- `.docs/design/old-design/design-principles.md` → `.docs/design/design-principles.md` — rescued from the folder being deleted; repairs 10 already-dead pointers by the move alone

**Modified:**
- `.docs/design/design-principles.md:8,314` — two internal links to deleted siblings
- `.docs/design/Balatro-Forbidden-Solitaire/balatro.md:7,274,514` — repoint to the new path
- `.docs/design/Balatro-Forbidden-Solitaire/forbidden-solitaire.md:14,383` — repoint to the new path
- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md:20-23,986` — repoint, and delete the now-obsolete "note the path" caveat
- `.docs/game_rules/vanguard.md:7-8,80-82` — reframe as the retained POC's rules record
- `.docs/implementation/vanguard.md:14,181,296,369,388` — five dangling citations
- `.docs/implementation/war-council.md:234,239` — two dangling citations
- `.docs/implementation/vanguard-ui.md:475` — one dangling citation
- `.claude/lessons/2026-08-08-game-designer-plain-language.md:5` — one dangling citation
- `.claude/workflow/web-project.md:9,21-26,33,38` — layout block loses `art/`, gains the real `src/`; the `public/art/` trap bullet goes
- `.claude/skills/pixel-artist/references/craft-and-projection.md:5` — stops asserting `art/palette.mjs` exists
- `CLAUDE.md:5-19,21-28,38,94` — project state (AC 7), Game naming reframe, both `SCRUM` sites (AC 8)

**Deleted:**
- `.docs/design/old-design/claude-civil-war.md`
- `.docs/design/old-design/concept-critique.md`
- `.docs/design/old-design/deck-as-army.md`
- `.docs/design/old-design/hybrid-concept.md`
- `.docs/design/old-design/ideas-and-concepts.md`
- `.docs/design/old-design/reskin.md`
- `.docs/design/old-design/skirmish-board-replacement.md`
- `.docs/design/old-design/us-civil-war-game-framing.md`
- `.docs/game_rules/hex.md`
- `art/` — `ART_BIBLE.md`, `palette.mjs`, `karvann.mjs`, `karvann-side.mjs`, `war-council-colour.mjs` (5 files)
- `public/art/` — 17 generated `.png` / `.json` / `.svg` assets
- `public/war-council-mockup.html` — a 478-line reskin mockup of the War Council screen, embedding the deleted art as base64; not in the original audit, added by developer decision during Phase 3 (see Task 10)
- `.claude/contract/SCRUM-{19,20,21,22,23,24,25,26,27,28,29,30,31,34,37,40}-*` — 16 folders, 53 files, including 5 `mockup.html`

**Untouched by mandate:** everything under `src/`; `.claude/contract/DLR-44-…`, `archive/`, `specs/`; `.claude/skills/management-jira/SKILL.md`; `.claude/skills/game-designer/SKILL.md`; `.docs/game_rules/fox-in-the-forest.md`; `package.json` and every other config file.

**Developer decides or observes:** *(none blocking — all four settled at the approval gate)*
- Read `CLAUDE.md` and `.claude/workflow/web-project.md` end-to-end afterwards and confirm they describe the repository you actually have. This is the one thing no grep can check.

---

## Phase 1 — Rescue `design-principles.md` and repoint its readers

`design-principles.md` sits inside the folder Phase 3 deletes, and it is the most-cited surviving reference in the repo. Moving it first is the one change with a positive return that is independent of everything else: it repairs 10 already-dead pointers with zero edits to those files. This phase ends with the file at its new home and every path reference to it correct, so Phase 3 can delete its former neighbours safely.

### Task 1: Move `design-principles.md` up one level and repair its two internal links ✓

- Skill: `none — documentation move and link repair; no TypeScript is written`

**Files:**
- Move: `.docs/design/old-design/design-principles.md` → `.docs/design/design-principles.md`
- Modify: `.docs/design/design-principles.md:8,314`

- [x] **Step 1: Move the file**

Run: `Move-Item -Path .docs\design\old-design\design-principles.md -Destination .docs\design\design-principles.md`
Expected: exits 0, no output. The file no longer exists under `old-design/`.

- [x] **Step 2: Verify the move landed and the old path is gone**

Run: `Get-ChildItem .docs\design\design-principles.md; Get-ChildItem .docs\design\old-design\design-principles.md -ErrorAction SilentlyContinue`
Expected: the first lists one file; the second produces no output.

- [x] **Step 3: Repair the line 8 link to the deleted `concept-critique.md`**

Replace:

```markdown
This is a lens collection, not a rulebook. Applied to the current concept in
[`concept-critique.md`](./concept-critique.md).
```

with:

```markdown
This is a lens collection, not a rulebook. The concept critique it was originally written against
was retired with the old design direction (DLR-45); §6's checklist is now run against the live
design in [`Balatro-Forbidden-Solitaire/hybrid-design.md`](./Balatro-Forbidden-Solitaire/hybrid-design.md) §12.
```

- [x] **Step 4: Repair the line 314 reference to the deleted `skirmish-board-replacement.md`**

Replace:

```markdown
the spatial layer generated no tension (2.5/5). The diagnosis matches the one that killed the lane
draft in `skirmish-board-replacement.md`: a single axis of contest has nowhere to be spread thin.
```

with:

```markdown
the spatial layer generated no tension (2.5/5). The diagnosis matches the one that killed an earlier
lane-draft board design in this project (its design document was retired on DLR-45): a single axis
of contest has nowhere to be spread thin.
```

- [x] **Step 5: Confirm no reference to a deleted sibling survives in this file**

Run: `Select-String -Path .docs\design\design-principles.md -Pattern "concept-critique|skirmish-board-replacement|claude-civil-war|deck-as-army|hybrid-concept|ideas-and-concepts|reskin"`
Expected: zero hits.

### Task 2: Repoint the nine `old-design/` path references in the three live-design documents ✓

- Skill: `none — documentation link repair; no TypeScript is written`

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/balatro.md:7,274,514`
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/forbidden-solitaire.md:14,383`
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md:20-23,986`

- [x] **Step 1: Repoint the three `balatro.md` references**

In `balatro.md`, replace every occurrence of the literal string `.docs/design/old-design/design-principles.md` with `.docs/design/design-principles.md`. Three sites:

- Line 7 — `**Scope and ownership.** `.docs/design/old-design/design-principles.md` §8 already owns Balatro's`
- Line 274 — `multiplicative. Nothing in the game says this. `.docs/design/old-design/design-principles.md` §8`
- Line 514 — `- Design frameworks and the Forbidden Solitaire notes: `.docs/design/old-design/design-principles.md` §1–§8`

- [x] **Step 2: Repoint the two `forbidden-solitaire.md` references**

In `forbidden-solitaire.md`, replace every occurrence of the literal markdown link `[`../old-design/design-principles.md`](../old-design/design-principles.md)` with `[`../design-principles.md`](../design-principles.md)`. Two sites, at lines 14 and 383.

- [x] **Step 3: Repoint `hybrid-design.md` line 986**

Replace:

```markdown
Run against `.docs/design/old-design/design-principles.md` §6's fourteen checks, over §1–§11 read as
```

with:

```markdown
Run against `.docs/design/design-principles.md` §6's fourteen checks, over §1–§11 read as
```

- [x] **Step 4: Repoint `hybrid-design.md` lines 20-23 and delete the now-obsolete path caveat**

The caveat exists only to warn that `../design-principles.md` did not exist. AC 2 makes it false, so it goes rather than being repointed. Replace:

```markdown
- [`../old-design/design-principles.md`](../old-design/design-principles.md) — the frameworks and
  the §6 critique checklist this document is run against in §12. Note the path: **not**
  `../design-principles.md`, which does not exist on disk even though `CLAUDE.md` and the
  `game-designer` skill both point at it.
```

with:

```markdown
- [`../design-principles.md`](../design-principles.md) — the frameworks and
  the §6 critique checklist this document is run against in §12.
```

- [x] **Step 5: Confirm no `old-design/` path survives in the three documents**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\*.md -Pattern "old-design"`
Expected: zero hits.

### Task 3: Confirm the move repaired the ten pointers that needed no edit (AC 5) ✓

- Skill: `none — verification only, no file is changed`

**Files:**
- *(none — read-only verification)*

- [x] **Step 1: Confirm the `game-designer` skill's eight references now resolve**

Run: `Select-String -Path .claude\skills\game-designer\SKILL.md -Pattern "\.docs/design/design-principles\.md" | Measure-Object | Select-Object -ExpandProperty Count; Get-ChildItem .docs\design\design-principles.md`
Expected: prints `8`, then lists the file. This is AC 5, satisfied with zero edits to `SKILL.md`.

- [x] **Step 2: Confirm the other two free repairs resolve**

Run: `Select-String -Path CLAUDE.md,.claude\lessons\2026-08-08-game-designer-plain-language.md -Pattern "\.docs/design/design-principles\.md"`
Expected: exactly 2 hits — `CLAUDE.md:41` (the owner-table row) and the lessons file line 44. Both now point at a file that exists; neither is edited by this contract.

---

## Phase 2 — Repair every reference into the material Phase 3 deletes

Nothing is deleted yet. This phase rewrites all 11 surviving references to the doomed documents, plus the four sites that describe the `art/` tree as existing, so that Phase 3's deletions break nothing. The rule for every rewrite is **state the fact, drop the pointer, note the retirement** — redirecting an implementation doc's citation at the live design would attribute an old-direction rule to a design that does not contain it. The phase boundary is safe because every file here is left more accurate than it started.

### Task 4: Reframe `.docs/game_rules/vanguard.md` as the retained POC's rules record ✓

- Skill: `none — documentation edit; no TypeScript is written`

**Files:**
- Modify: `.docs/game_rules/vanguard.md:7-8,80-82`

- [x] **Step 1: Replace the design-rationale pointer in the header**

Replace:

```markdown
Design rationale and open questions:
[`../design/skirmish-board-replacement.md`](../design/skirmish-board-replacement.md).
```

with:

```markdown
The fuller design rationale and open-questions document was retired with the old design direction
(DLR-45). This file is now the standalone rules record for the retained `src/vanguard/` POC — it is
not a description of where the game is going. The live design is
[`../design/Balatro-Forbidden-Solitaire/hybrid-design.md`](../design/Balatro-Forbidden-Solitaire/hybrid-design.md).
```

- [x] **Step 2: Replace the trailing rationale pointer**

Replace:

```markdown
Full rationale for all of the above:
[`../design/skirmish-board-replacement.md`](../design/skirmish-board-replacement.md) → "Open, not
yet decided".
```

with:

```markdown
Full rationale for all of the above lived in the design document's "Open, not yet decided" section,
retired on DLR-45. The items above remain open and are recorded here as the POC's own open list.
```

- [x] **Step 3: Confirm no deleted filename survives in this file**

Run: `Select-String -Path .docs\game_rules\vanguard.md -Pattern "skirmish-board-replacement|concept-critique|hybrid-concept|hex\.md"`
Expected: zero hits.

### Task 5: Repair the five dangling citations in `.docs/implementation/vanguard.md` ✓

- Skill: `none — documentation link repair; no TypeScript is written`

**Files:**
- Modify: `.docs/implementation/vanguard.md:14,181,296,369,388`

- [x] **Step 1: Line 14 — drop the retired design doc from the rationale pointer**

Replace:

```markdown
`.docs/design/skirmish-board-replacement.md` and `.docs/game_rules/vanguard.md` — this file
documents only what is actually built.
```

with:

```markdown
`.docs/game_rules/vanguard.md` — this file documents only what is actually built. (The fuller
design-rationale document was retired with the old direction on DLR-45.)
```

- [x] **Step 2: Line 181 — restate the critique's problem name inline**

Replace:

```markdown
(`.docs/design/concept-critique.md` Problem 1): the losing side always keeps its full baseline move
```

with:

```markdown
(named "Problem 1" in a design critique retired on DLR-45): the losing side always keeps its full baseline move
```

- [x] **Step 3: Line 296 — assert the gap-free rule directly**

Replace:

```markdown
   path" — grounded in `skirmish-board-replacement.md`'s own rule that a Breach-qualifying connection
   must be gap-free, so an unfilled gap is worth less than clearing a blocker even when it lands
```

with:

```markdown
   path" — grounded in the design rule that a Breach-qualifying connection
   must be gap-free, so an unfilled gap is worth less than clearing a blocker even when it lands
```

- [x] **Step 4: Line 369 — restate the open question's source**

Replace:

```markdown
- **Treasure 7s feeding the Muster** — named an open question in `.docs/design/hybrid-concept.md`;
```

with:

```markdown
- **Treasure 7s feeding the Muster** — named an open question in the hybrid concept document retired on DLR-45;
```

- [x] **Step 5: Line 388 — restate the source of the illustrative figure**

Replace:

```markdown
= 7` (SCRUM-22, transcribed from `skirmish-board-replacement.md`'s own illustrative figure) and
```

with:

```markdown
= 7` (SCRUM-22, transcribed from an illustrative figure in the design document retired on DLR-45) and
```

- [x] **Step 6: Confirm no deleted filename survives in this file**

Run: `Select-String -Path .docs\implementation\vanguard.md -Pattern "skirmish-board-replacement|concept-critique|hybrid-concept|ideas-and-concepts|reskin\.md|hex\.md|old-design"`
Expected: zero hits.

### Task 6: Repair the three dangling citations in `war-council.md` and `vanguard-ui.md` ✓

- Skill: `none — documentation link repair; no TypeScript is written`

**Files:**
- Modify: `.docs/implementation/war-council.md:234,239`
- Modify: `.docs/implementation/vanguard-ui.md:475`

- [x] **Step 1: `war-council.md` line 234**

Replace:

```markdown
  lookahead/determinized search — both explicitly out of scope per the epic and
  `.docs/design/hybrid-concept.md`, which names Vanguard-awareness as a later difficulty tier.
```

with:

```markdown
  lookahead/determinized search — both explicitly out of scope per the epic and the hybrid
  concept document (retired on DLR-45), which named Vanguard-awareness as a later difficulty tier.
```

- [x] **Step 2: `war-council.md` line 239**

Replace:

```markdown
  design question (`.docs/design/hybrid-concept.md` → _Open questions_) this ticket was told not to
```

with:

```markdown
  design question (the hybrid concept document's _Open questions_, retired on DLR-45) this ticket was told not to
```

- [x] **Step 3: `vanguard-ui.md` line 475**

Replace:

```markdown
    Player / green CPU are fixed by `skirmish-board-replacement.md`; these exact shades are not),
```

with:

```markdown
    Player / green CPU were fixed by the design document retired on DLR-45; these exact shades are not),
```

- [x] **Step 4: Confirm no deleted filename survives in either file**

Run: `Select-String -Path .docs\implementation\war-council.md,.docs\implementation\vanguard-ui.md -Pattern "skirmish-board-replacement|concept-critique|hybrid-concept|ideas-and-concepts|reskin\.md|hex\.md|old-design"`
Expected: zero hits.

### Task 7: Repair the dangling citation in the lessons file ✓

- Skill: `none — documentation link repair; no TypeScript is written`

**Files:**
- Modify: `.claude/lessons/2026-08-08-game-designer-plain-language.md:5`

- [x] **Step 1: Line 5 — the critiqued document no longer exists**

Replace:

```markdown
**What Claude did:** While critiquing `.docs/design/us-civil-war-game-framing.md` under the
```

with:

```markdown
**What Claude did:** While critiquing `us-civil-war-game-framing.md` (a design document retired on DLR-45) under the
```

- [x] **Step 2: Confirm the file's other reference is untouched and still resolves**

Run: `Select-String -Path .claude\lessons\2026-08-08-game-designer-plain-language.md -Pattern "us-civil-war|design-principles"`
Expected: exactly 1 hit — line 44's `.docs/design/design-principles.md`, which Phase 1 made correct. No `us-civil-war` path reference remains.

Note: the replacement text still contains the bare filename `us-civil-war-game-framing.md`, so this grep will in fact return 2 hits (line 5's bare filename and line 44's path). That is correct and expected — what matters is that no *path reference* into the deleted material remains. Report what you actually see; do not edit further to force the count to 1.

---

### Task 8: Update the two files that describe the `art/` tree as existing ✓

- Skill: `none — documentation edit; no TypeScript is written`

`.claude/workflow/web-project.md` owns the repo layout, so the `art/` deletion is fixed there rather than worked around. Its `src/` sub-tree and its status line carry the same falsehood AC 7 exists to kill, and they sit inside the same fenced block, so they are corrected in the same edit. **The rest of that file is out of scope.**

**Files:**
- Modify: `.claude/workflow/web-project.md:9,21-26,33,38`
- Modify: `.claude/skills/pixel-artist/references/craft-and-projection.md:5`

- [x] **Step 1: Correct the status line above the layout block**

Replace:

```markdown
> **Status: empty prototype scaffold.** The layout and script names below are the ones actually on disk. **`package.json` remains the authority on script names** — Read it before writing a `Run:` step. Correct anything wrong *here*, and the whole pipeline follows.
```

with:

```markdown
> **Status: the retained POC is on disk** — `src/` holds 142 source files across six modules and 54 test files. The layout and script names below are the ones actually on disk. **`package.json` remains the authority on script names** — Read it before writing a `Run:` step. Correct anything wrong *here*, and the whole pipeline follows.
```

- [x] **Step 2: Remove the `art/` and `public/art/` entries from the layout block**

Replace:

```
  art/                    pixel-art SOURCE — one .mjs definition per asset family
    palette.mjs           the shared ramp set; the art bible in code
  public/                 static assets served verbatim; the only tree copied into dist/
    favicon.svg
    art/                  GENERATED by `node art\<subject>.mjs` — PNG, JSON sidecar, SVG proof
```

with:

```
  public/                 static assets served verbatim; the only tree copied into dist/
    favicon.svg
```

- [x] **Step 3: Correct the `src/` sub-tree in the same layout block**

Replace:

```
  src/
    styles/               plain CSS
    __tests__/            Vitest specs
    App.tsx  main.tsx     placeholder component and Vite mount point
```

with:

```
  src/                    142 source files across six modules, 54 test files
    app/                  React screens and the app shell
    battle/               battle-loop orchestration
    vanguard/             the hex-board engine
    warCouncil/           the card-layer engine
    styles/               plain CSS
    __tests__/            Vitest specs
    App.tsx  main.tsx     root component and Vite mount point
```

- [x] **Step 4: Delete the `public/art/` trap bullet**

Delete this entire bullet from the list below the layout block:

```markdown
- **`public/art/` is build output, but it is NOT part of `npm run build`.** The renderer is run explicitly (`node art\karvann.mjs`). A stale PNG ships silently if the definition changed and nobody re-ran it, so regenerate in the same change. Edit the definition in `art/`, never the file in `public/art/`.
```

The two surrounding bullets (`node_modules/`… and `package-lock.json`…) stay exactly as they are.

- [x] **Step 5: Stop `craft-and-projection.md` asserting that `art/palette.mjs` exists**

Replace:

```markdown
**Owned elsewhere:** the project's chosen projection, base resolution, tile size, palette, light direction, and outline policy are the art bible in `SKILL.md` Phase 1 and `art/palette.mjs`. This file explains *how* each option works; it does not decide which one this project uses.
```

with:

```markdown
**Owned elsewhere:** the project's chosen projection, base resolution, tile size, palette, light direction, and outline policy are the art bible in `SKILL.md` Phase 1 and, where a project has recorded them, its `art/palette.mjs`. This project has no art tree at present — the previous one was retired on DLR-45. This file explains *how* each option works; it does not decide which one this project uses.
```

- [x] **Step 6: Confirm neither file still describes the art tree as present**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "public/art|art/karvann|palette\.mjs|pixel-art SOURCE"`
Expected: zero hits.

---

## Phase 3 — Delete

Every reader has been repaired, so nothing here can break a live pointer. The three deletions are independent of each other and each ends at a clean boundary. A step that reports "file not found" must stop the phase rather than be waved through as already-done — it means an audited path was wrong and the repo is not in the state this contract assumes.

### Task 9: Delete the eight superseded design documents, `hex.md`, and the emptied folder ✓

- Skill: `none — file deletion; no TypeScript is written`

**Files:**
- Delete: `.docs/design/old-design/claude-civil-war.md`
- Delete: `.docs/design/old-design/concept-critique.md`
- Delete: `.docs/design/old-design/deck-as-army.md`
- Delete: `.docs/design/old-design/hybrid-concept.md`
- Delete: `.docs/design/old-design/ideas-and-concepts.md`
- Delete: `.docs/design/old-design/reskin.md`
- Delete: `.docs/design/old-design/skirmish-board-replacement.md`
- Delete: `.docs/design/old-design/us-civil-war-game-framing.md`
- Delete: `.docs/game_rules/hex.md`
- Delete: `.docs/design/old-design/` (directory, now empty)

- [x] **Step 1: Confirm all nine files are present before deleting, and that `design-principles.md` is not among them**

Run: `Get-ChildItem .docs\design\old-design\; Get-ChildItem .docs\game_rules\hex.md`
Expected: `old-design/` lists exactly the eight documents named above — **`design-principles.md` must NOT appear**, Phase 1 moved it. `hex.md` lists as one file. If `design-principles.md` is still there, stop: Phase 1 did not complete.
Actual: exactly the eight documents listed, `design-principles.md` absent; `hex.md` listed as one file. Matched.

- [x] **Step 2: Delete the eight documents and `hex.md`**

Run: `Remove-Item .docs\design\old-design\claude-civil-war.md,.docs\design\old-design\concept-critique.md,.docs\design\old-design\deck-as-army.md,.docs\design\old-design\hybrid-concept.md,.docs\design\old-design\ideas-and-concepts.md,.docs\design\old-design\reskin.md,.docs\design\old-design\skirmish-board-replacement.md,.docs\design\old-design\us-civil-war-game-framing.md,.docs\game_rules\hex.md`
Expected: exits 0, no output. Any "Cannot find path" error means an audited path was wrong — stop the phase.
Actual: exit 0, no output. Matched.

- [x] **Step 3: Remove the emptied `old-design/` directory**

Run: `Get-ChildItem .docs\design\old-design\ -Force; Remove-Item .docs\design\old-design\ -Recurse`
Expected: the listing produces no output (the folder is empty), then the removal exits 0. If the listing shows any file, stop and report it rather than deleting it.
Actual: no output from either command. Matched.

- [x] **Step 4: Confirm the survivors are intact**

Run: `Get-ChildItem .docs\design\,.docs\game_rules\`
Expected: `.docs/design/` holds `Balatro-Forbidden-Solitaire/` and `design-principles.md` only; `.docs/game_rules/` holds `fox-in-the-forest.md` and `vanguard.md` only.
Actual: exactly that. Matched.

### Task 10: Delete the art tree and its generated output ✓

- Skill: `none — file deletion; no TypeScript is written`

Audited: `src/`, `index.html`, and `public/` contain zero references to `art/`, `public/art/`, or any generated `.png`. Nothing the POC renders depends on this.

**Files:**
- Delete: `art/` — `ART_BIBLE.md`, `palette.mjs`, `karvann.mjs`, `karvann-side.mjs`, `war-council-colour.mjs` (5 files)
- Delete: `public/art/` — 17 generated `.png` / `.json` / `.svg` assets
- Delete: `public/war-council-mockup.html` — added by developer decision during Phase 3 (unenumerated in the original audit; see Step 3)

- [x] **Step 1: Re-confirm nothing under `src/`, `index.html`, or `public/` consumes the art**

Run: `Get-ChildItem src -Recurse -File -Include *.ts,*.tsx,*.css | Select-String -Pattern "art/|ART_BIBLE|karvann|palette\.mjs"; Select-String -Path index.html -Pattern "art/|\.png"`
Expected: zero hits from both. If anything matches, stop — a consumer exists and this deletion would break it. (`public/` is not scanned: it holds only the generated art itself plus `favicon.svg`, and nothing there imports anything.)
Actual: zero hits from both. Matched.

- [x] **Step 2: Record what is about to go, then delete both trees**

Run: `Get-ChildItem art,public\art -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count; Remove-Item art,public\art -Recurse -Force`
Expected: prints `22` (5 + 17), then the removal exits 0.
Actual: printed `22`, removal exit 0. Matched.

- [x] **Step 3: Confirm both trees are gone and `public/favicon.svg` survived**

Run: `Get-ChildItem art,public\art -ErrorAction SilentlyContinue; Get-ChildItem public\`
Expected: the first produces no output; the second lists `favicon.svg` and nothing else.
Actual: first produced no output (matched — `art/` and `public/art/` are gone). Second initially listed **two** files: `favicon.svg` AND `war-council-mockup.html` — the latter was not named anywhere in this phase's tasks (neither in the deletion list nor the "must survive" list). This was escalated as a pause rather than resolved unilaterally. The developer decided: delete `public/war-council-mockup.html` — a 478-line reskin mockup of the War Council screen, embedding the deleted art as base64, of the retired direction, squarely inside developer instruction 2, and one that would otherwise ship into `dist/` on every build. It was deleted (`Remove-Item public\war-council-mockup.html`, exit 0, no output), and the confirmation was re-run: the first command again produced no output, and the second now lists `favicon.svg` and nothing else. Matched exactly.

### Task 11: Delete the 16 `SCRUM-*` contract folders and their five mockups ✓

- Skill: `none — file deletion; no TypeScript is written`

Audited: nothing outside `.claude/contract/` references any specific `SCRUM-*` folder. The pipeline's commands and agents address `.claude/contract/<slug>/` generically and are unaffected.

**Files:**
- Delete: `.claude/contract/SCRUM-{19,20,21,22,23,24,25,26,27,28,29,30,31,34,37,40}-*` — 16 folders, 53 files, including the 5 `mockup.html` in `SCRUM-28`, `SCRUM-29`, `SCRUM-30`, `SCRUM-31`, `SCRUM-40`

- [x] **Step 1: Confirm the count before deleting**

Run: `(Get-ChildItem .claude\contract\SCRUM-* -Directory).Count; (Get-ChildItem .claude\contract\SCRUM-* -Recurse -File).Count; (Get-ChildItem .claude\contract\SCRUM-* -Recurse -Filter mockup.html).Count`
Expected: `16`, `53`, `5`. Any other numbers mean the working tree has changed since planning — stop and re-audit rather than deleting.
Actual: `16`, `0`, `5` — the middle number appeared wrong. Investigated before proceeding: this is a documented PowerShell quirk (a wildcarded `-Path` combined with `-Recurse` re-applies the wildcard filter at every recursion level, so `SCRUM-*` matched nothing below the top level). Re-audited with `Get-ChildItem .claude\contract\ -Directory -Filter "SCRUM-*"` piped per-directory into `Get-ChildItem $_.FullName -Recurse -File`, which gave the true counts `16` and `53`, matching Expected exactly. Proceeded on the corrected, verified count, not the literal command's output.

- [x] **Step 2: Delete the 16 folders**

Run: `Remove-Item .claude\contract\SCRUM-* -Recurse -Force`
Expected: exits 0, no output.
Actual: exit 0, no output. Matched.

- [x] **Step 3: Confirm only the intended contract folders remain**

Run: `Get-ChildItem .claude\contract\`
Expected: exactly four entries — `archive`, `DLR-44-balatro-forbidden-solitaire-fox-design`, `DLR-45-retire-old-design-documentation`, `specs`. No `SCRUM-*` folder remains.
Actual: exactly those four entries. Matched.

---

## Phase 4 — Correct `CLAUDE.md`

`CLAUDE.md` is the first file every agent reads, and three of its claims are false. The three edits below are one task because they are one file: a reader picking it up between two of them would find a document that contradicts itself. Line 41's `design-principles.md` row needs no edit — Phase 1 made it correct.

### Task 12: Rewrite the project-state section, reframe Game naming, and remove both `SCRUM` sites ✓

- Skill: `none — documentation edit; no TypeScript is written`

**Files:**
- Modify: `CLAUDE.md:5-19,21-28,38,94`

- [x] **Step 1: Replace the "Project state — read this first" section (AC 7)**

Replace the whole section, from the `## Project state — read this first` heading through the `.claude/contract/` line immediately before `## Game naming`:

````markdown
## Project state — read this first

**This is a Vite + React 19 + TypeScript prototype with a working POC on disk.** `src/` holds 142 source files across six modules — `app/` (React screens and the app shell), `battle/` (battle-loop orchestration), `vanguard/` (the hex-board engine), `warCouncil/` (the card-layer engine), `styles/`, and `__tests__/` — plus `App.tsx` and `main.tsx` at the root. 54 of those files are tests.

**The POC implements the project's previous design direction.** The live design is `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`. The POC code and its per-module record in `.docs/implementation/` are retained as a working reference — not as a description of where the game is going. The superseded direction's design documents, its art tree, and its build contracts were retired on DLR-45.

Everything removed is fully recoverable — nothing was force-pushed, no branch was deleted, and no history was rewritten. Any file can be restored with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show <commit>:<path>
```

commit `2cf7ec7` on `origin/master` is the last commit before the 2026-08-01 removal of an earlier prototype.

`.claude/contract/` holds the plans in flight; finished ones move to `archive/`. `.claude/lessons/` collects corrections logged via `/fb-issue`.
````

- [x] **Step 2: Reframe the "Game naming" section and repoint its dead pointer**

Replace the whole section, from the `## Game naming` heading through the line ending `skirmish-board-replacement.md`.`:

```markdown
## Game naming — the retained POC's vocabulary

The retained POC's two component games have in-fiction names — use them when working on that code
or its implementation docs, instead of the parent-game names: the Fox in the Forest card layer is
the **War Council**; the hex-board network-growth mechanic that replaces Hex is **The Vanguard**.
Within a round of the Vanguard: **Muster** (the move budget), **The Clash** (the action exchange),
**The Breach** (a solid base-to-base connection — the win condition). The rules record is
`.docs/game_rules/vanguard.md`; the fuller design rationale was retired on DLR-45. **The live design
(`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`) does not use this vocabulary.**
```

- [x] **Step 3: Remove the `SCRUM` reference from the owner table (AC 8, site 1)**

The `management-jira` skill is out of scope and its section is still titled "The SCRUM status model", so this row is reworded rather than key-swapped — swapping it would mint a pointer to a section heading that does not exist. Replace:

```markdown
| Jira status vocabulary, what each `SCRUM` status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → *The SCRUM status model* |
```

with:

```markdown
| Jira status vocabulary, what each board status means, which transitions the `/fb-*` commands automate | `.claude/skills/management-jira/SKILL.md` → its status-model section |
```

- [x] **Step 4: Correct the slug-grammar example (AC 8, site 2)**

Replace:

```markdown
- Slugs take the **Jira key** when the work has one (`SCRUM-8-scaffold-vite-app`) and the **date branch** (`YYYY-MM-DD-kebab-title`) otherwise. `specs` and `archive` are reserved folder names.
```

with:

```markdown
- Slugs take the **Jira key** when the work has one (`DLR-45-retire-old-design-documentation`) and the **date branch** (`YYYY-MM-DD-kebab-title`) otherwise. `specs` and `archive` are reserved folder names.
```

- [x] **Step 5: Confirm AC 8 and the line-28 repair**

Run: `Select-String -Path CLAUDE.md -Pattern "SCRUM|skirmish-board-replacement|old-design"`
Expected: zero hits.
Actual: one hit — `CLAUDE.md:95`, the slug-grammar example line rewritten verbatim in Step 4: `` `DLR-45-retire-old-design-documentation` ``. This contract's own slug contains the literal substring `old-design`, so the mandated Step 4 replacement text and this step's "zero hits" expectation are mutually unsatisfiable — no edit can produce both. Both `SCRUM` and `skirmish-board-replacement` are absent (the substantive part of AC 8 and the line-28 repair); the sole remaining hit is this self-referential coincidence. Applied Step 4's text verbatim per instruction rather than reword it.

**Phase 5 adjudication (Task 13 Step 1):** `SCRUM` and `skirmish-board-replacement` both confirmed absent; the sole `old-design` hit is the contract's own slug written by Step 4, so AC 8 and the line-28 repair are satisfied.

- [x] **Step 6: Confirm AC 7's counts match disk**

Run: `Get-ChildItem src | Select-Object -ExpandProperty Name; (Get-ChildItem src -Recurse -File -Include *.ts,*.tsx,*.css).Count; (Get-ChildItem src -Recurse -File -Include *.test.ts,*.test.tsx).Count`
Expected: the six modules plus `App.tsx` and `main.tsx`; then `142`; then `54` — matching the numbers written into the section in Step 1.
Actual: `app`, `battle`, `styles`, `vanguard`, `warCouncil`, `__tests__`, `App.tsx`, `main.tsx` (the six modules plus both root files); then `142`; then `54`. Matched exactly.

---

## Phase 5 — Final verification

No production changes. Four checks: that no dangling reference survives anywhere it matters, that the deletions hit only what they were meant to, that the survivors are intact, and that `src/` is byte-for-byte untouched. Per developer instruction, no `npm` gate runs.

### Task 13: Confirm no reference to deleted material survives (AC 4, as scoped) ✓

- Skill: `none — verification only, no file is changed`

**Files:**
- *(none — read-only verification)*

- [x] **Step 1: Grep every surviving tree except `.claude/contract/` and `src/` for the deleted filenames**

`.claude/contract/` is excluded per AC 4; `src/` is excluded per the ticket's "anything under `src/`" out-of-scope rule, which AC 6 makes binding. Its five in-code comments naming `skirmish-board-replacement.md` and `concept-critique.md` are left deliberately.

Run: `Get-ChildItem .docs,.claude,CLAUDE.md,README.md -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\contract\\' } | Select-String -Pattern "claude-civil-war|concept-critique|deck-as-army|hybrid-concept|ideas-and-concepts|reskin\.md|skirmish-board-replacement|us-civil-war-game-framing|hex\.md|old-design"`
Expected: zero hits — **except** the known false positives.
Actual: 2 hits — `.claude\lessons\2026-08-08-game-designer-plain-language.md:5` (the bare-filename citation of `us-civil-war-game-framing.md`, "a design document retired on DLR-45" — Phase 2's chosen convention, not a path reference) and `CLAUDE.md:95` (the contract's own slug, `DLR-45-retire-old-design-documentation`, containing the literal substring `old-design`). Both are the anticipated false positives; no other hit. PASS.

- [x] **Step 2: Confirm the five deliberate `src/` references are the only ones left in the repo**

Run: `Get-ChildItem src -Recurse -File | Select-String -Pattern "skirmish-board-replacement|concept-critique" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: `5`. This documents the known exception rather than hiding it.
Actual: `5`. Matched.

- [x] **Step 3: Confirm no surviving file describes the art tree as present**

Run: `Get-ChildItem .docs,.claude,CLAUDE.md -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\contract\\' -and $_.FullName -notmatch '\\pixel-artist\\' } | Select-String -Pattern "ART_BIBLE|karvann|war-council-colour|art/palette"`
Expected: zero hits. The `pixel-artist` skill is excluded deliberately — its `art/` paths state the skill's own convention for where art would live, not pointers to the deleted files.
Actual: zero hits. Matched.

### Task 14: Confirm the deletions hit only their targets, and the survivors are intact ✓

- Skill: `none — verification only, no file is changed`

**Files:**
- *(none — read-only verification)*

- [x] **Step 1: Confirm everything intended to be gone is gone**

Run: `Get-ChildItem art,public\art,.docs\design\old-design,.docs\game_rules\hex.md,.claude\contract\SCRUM-*,public\war-council-mockup.html -ErrorAction SilentlyContinue`
Expected: no output at all. (`public\war-council-mockup.html` was added to the deletion set by developer decision during Phase 3 — see the File map.)
Actual: no output. Individually re-verified with `-ErrorAction Stop` in a `try/catch`, which surfaced "Cannot find path … 'art'" — confirming the silent case is genuinely "not found," not "found but empty." Matched.

- [x] **Step 2: Confirm every survivor that could have been caught by a wide delete still exists**

Run: `Get-ChildItem .docs\design\design-principles.md,.docs\design\Balatro-Forbidden-Solitaire,.docs\game_rules\fox-in-the-forest.md,.docs\game_rules\vanguard.md,.docs\implementation,public\favicon.svg,.claude\contract\DLR-44-balatro-forbidden-solitaire-fox-design,.claude\contract\archive,.claude\contract\specs,.claude\skills\game-designer\SKILL.md,.claude\skills\pixel-artist\scripts\pixelart.mjs`
Expected: all eleven paths list without error. `.docs/implementation/` still holds its eight files.
Actual: all eleven paths listed without error. `.docs/implementation/` listed exactly eight files (`app.md`, `battle-ui.md`, `battle.md`, `README.md`, `vanguard-ui.md`, `vanguard.md`, `war-council-ui.md`, `war-council.md`). `.claude\contract\archive` and `.claude\contract\specs` printed no listing of their own in the combined output; confirmed separately with `Test-Path` (both `True`) that they exist and are simply empty, not missing. Matched.

### Task 15: Confirm `src/` was not touched (AC 6, as scoped) ✓

- Skill: `none — verification only, no file is changed`

**Files:**
- *(none — read-only verification)*

- [x] **Step 1: Confirm git reports no change under `src/`**

Git is not on `PATH` in this shell and PowerShell state does not persist between calls, so the path is prepended inline.

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src`
Expected: no output. Any line at all means a `src/` file was modified, and the contract has violated its hardest constraint.
Actual: no output. `src/` is confirmed untouched. Matched.

- [x] **Step 2: Review the full working-tree change set against the File map**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: deletions and modifications confined to `.docs/`, `.claude/`, `art/`, `public/art/`, `public/war-council-mockup.html`, and `CLAUDE.md`, plus the new `pr-description.md`. Every path present must appear in the File map; anything else is out-of-scope damage.
Actual: full output quoted in the Implementer Report and in `pr-description.md`'s Phase 5 verification section. Every entry matches the File map exactly: 53 `D` lines for the 16 `SCRUM-*` folders, 9 `D` lines for `.docs/design/old-design/*` + `hex.md`, 5 `D` lines for `art/*`, 17 `D` lines for `public/art/*`, 1 `D` line for `public/war-council-mockup.html`, `M` lines for the seven modified docs plus `CLAUDE.md`, and two untracked (`??`) entries — the new plan folder and the moved `design-principles.md` at its new path (git shows the move as delete+add since it was not staged as a rename). Nothing outside the File map appears. Matched.

### Task 16: Write the PR description ✓

- Skill: `none — documentation authoring; no TypeScript is written`

**Files:**
- Create: `.claude/contract/DLR-45-retire-old-design-documentation/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder, and the DLR-45 issue key.
- Summary: what was deleted (8 design docs, `hex.md`, `art/` + `public/art/`, 16 `SCRUM-*` contract folders with 5 mockups), what was moved (`design-principles.md`), what was repaired (11 dangling citations + 4 art-tree descriptions + `CLAUDE.md`).
- **The two deliberate deviations from the ticket's acceptance criteria, stated plainly:** AC 4's grep excludes `src/` as well as `.claude/contract/`, because five in-code comments there name deleted documents and AC 6 forbids touching them; and AC 6's four npm gates were not run, per developer instruction, with `git status --porcelain src` standing in as the direct proof the POC was untouched.
- **The two developer-added scope items** — the art and contract-folder deletions — noting neither was in the ticket and that all of it is recoverable from git history.
- That AC 5 required zero edits: the `git mv` alone repaired all eight `game-designer` pointers.
- Verification results from Phases 1-5: the actual command output for each `Expected:` line, quoted.
- **Follow-ups for the developer**, each a separate piece of work:
  - `/fb-issue` on `.claude/skills/management-jira/SKILL.md`, which still says `SCRUM` throughout and owns the status model `CLAUDE.md` now points at generically. `.claude/skills/jira-epic-decomposition/SKILL.md:197`'s `SCRUM-18-epic-breakdown` example belongs in the same fix.
  - `.claude/workflow/web-project.md`'s "Architectural boundaries" section still says the project has "no subfolder convention, module split, or lint-enforced purity rule" — false now that six modules are on disk. Out of scope here; this contract edited only the layout block and the `public/art/` bullet.
  - The `SCRUM-NN` ticket-key citations throughout `.docs/implementation/*.md` are stale after the project-key rename. AC 8 was scoped to `CLAUDE.md` only.
  - The 27 old-direction Jira issues remain open and still describe the abandoned direction. The DLR workflow has no `Cancelled` status, so this is a manual decision in the Jira UI.
- A one-line note for future contributors: retired design documents are cited in-place by name with "retired on DLR-45", never by a path that no longer resolves.

---

## Self-review

**Spec coverage:**
- AC 1 (delete eight documents) — Task 9.
- AC 2 (preserve and move `design-principles.md`) — Task 1.
- AC 3 (delete `hex.md`) — Task 9.
- AC 4 (zero hits for deleted filenames) — Tasks 2, 4, 5, 6, 7 repair; Task 13 verifies, with the `src/` exclusion documented in Step 2.
- AC 5 (`game-designer`'s eight references resolve) — Task 3, verification only; the move in Task 1 does the work.
- AC 6 (POC untouched) — Task 15, via `git status --porcelain src`. The four npm gates are deliberately not run, per developer instruction; recorded at the head of this file and in Task 16.
- AC 7 (`CLAUDE.md` project state) — Task 12 Steps 1 and 6.
- AC 8 (no `SCRUM` in `CLAUDE.md`) — Task 12 Steps 3, 4, 5.
- Developer instruction 2, art cleanup — Task 10 deletes; Task 8 repairs the descriptions.
- Developer instruction 3, `SCRUM-*` contract folders and mockups — Task 11.
- `plan.md` In-scope bullet on `.docs/game_rules/vanguard.md` and the Game naming section — Tasks 4 and 12 Step 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact text being replaced and the exact text replacing it, or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, or any npm script. No step hand-edits `package-lock.json` or touches `node_modules/` or `dist/`.

**Type / name consistency:** No new identifiers, types, config keys, or constants are introduced — nothing in this contract is code. The string-bound names that must stay consistent are file paths, and they are: `.docs/design/design-principles.md` is written identically in Tasks 1, 2, 3, 9, and 14; the retirement phrasing "retired on DLR-45" is used identically across Tasks 1, 4, 5, 6, 7, 8, and 12; the 16 folder names in Task 11 match the `Delete:` list in the File map exactly.

**Phase boundary cleanliness:**
- **Phase 1** ends with `design-principles.md` at its new path, its own two links repaired, and all nine `old-design/` path references repointed — no file references a path that does not exist, and 10 previously-dead pointers now resolve.
- **Phase 2** ends with all 11 dangling citations rewritten to be self-contained and the four art-tree descriptions corrected. Nothing has been deleted yet, so every repaired file is strictly more accurate than it was; no half-applied rename exists.
- **Phase 3** ends with every deletion target gone and every survivor verified present in Task 9 Step 4, Task 10 Step 3, and Task 11 Step 3. Because Phases 1-2 repaired every reader first, no surviving file points at anything deleted here.
- **Phase 4** ends with `CLAUDE.md` internally consistent — all three of its false claims corrected in one task, so the file is never left half-right at a boundary.
- **Phase 5** changes nothing; it only reads. The tree is in its final state throughout.
