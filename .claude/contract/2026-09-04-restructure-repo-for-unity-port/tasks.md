# Tasks: Restructure the repo for the Unity port

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-09-04

**Goal:** Move the whole Vite/React prototype into `prototype/`, leaving it green from inside that folder; create `unity/` as its empty future sibling; and update the Claude configuration for a two-toolchain repository. No `.ts`/`.tsx` file changes content.

**Spec:** `plan.md` in this folder.

---

## Two conventions this contract uses in every `Run:` step

**Git is not on `PATH`** (`.claude/workflow/web-project.md` → Verification commands), and PowerShell shell state does not persist between tool calls, so **every** git step prepends the path itself:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git <args>
```

**After Phase 1, every npm command runs inside `prototype/`.** Chaining with `;` would report `Pop-Location`'s exit code and mask a real failure, so each npm step prints the code explicitly:

```
Push-Location prototype; <npm command>; Write-Host "exit=$LASTEXITCODE"; Pop-Location
```

`Expected:` lines below are written in terms of that printed `exit=0` plus the command's own summary line.

---

## File map

**Created:**
- `prototype/` — the whole web project, moved (no new content)
- `unity/README.md` — one paragraph naming what will live here and linking the architecture doc
- `.claude/workflow/unity-project.md` — the Unity sibling to `web-project.md`
- `<plan>/pr-description.md` — written in the final phase

**Modified:**
- `.github/workflows/ci.yml` — npm steps run in `prototype/`; `node-version-file` and `cache-dependency-path` rebased
- `.claude/workflow/web-project.md` — layout, runner table, boundary paths rebased; pointer to the Unity sibling
- `.claude/rules/save-data-versioning.md` — two PowerShell greps and every `src/…` path rebased
- `.claude/agents/implementer.md`, `qa.md`, `code-evaluator.md`, `defender.md` — 16 `src/` lines and their npm commands
- `.claude/commands/fb-apply.md`, `fb-plan.md`, `fb-issue.md`, `fb-report.md` — 24 `src/` lines and their npm commands
- `.claude/skills/play-tester/SKILL.md` + `references/sim-architecture.md`, `.claude/skills/ai-play-tester/SKILL.md` + `references/game-state-and-labels.md`, `.claude/skills/batch-apply/SKILL.md`, `.claude/skills/implementation-doc-writer/SKILL.md` — 55 `src/` lines and their npm commands
- `.claude/skills/react-frontend/SKILL.md` + `references/engineering-standards.md` — scope header plus 30 `src/` lines
- `CLAUDE.md` — **Project state** and **Commands** sections rewritten; skills table updated
- `.docs/implementation/README.md` — one pointer note

**Deleted:** *(untracked, generated — not a git operation)*
- root `dist/`, `dist-ssr/`, `coverage/`

**Developer decides or observes:**
- The zero-byte `tasks.md` at the repository root — delete it, or say what it is for. Left in place by this contract.
- Whether narrowing prettier's scope to `prototype/` is acceptable: `.docs/**` and root `README.md` stop being format-checked by anything. Task 3 Step 5 reports the result either way.
- Whether `unity/` is the right name beside `prototype/` — the only thing here judged by eye.

---

## Phase 1 — Move the prototype, changing no file's content

Everything in this phase is a relocation. No file's bytes change, and by the end the prototype's full gate suite must pass from inside `prototype/`. That is the phase boundary and it is a hard one: **if a gate fails here, the move is incomplete — fix the move, never a source file, a `vite.config.ts` path, or an `eslint-disable`.** `plan.md` → Config and persisted-shape audit records why no build-tool config needs editing: every path in `vite.config.ts`, the four `tsconfig*.json` files and `eslint.config.js` is relative to the config file's own location.

**Deliberate deviation, stated so it is not mistaken for an oversight.** The pipeline's normal rule is that the unfiltered suite and the production build belong to QA alone, in the closing phase — the Implementer runs scoped Vitest and `npm run typecheck`. This phase runs both anyway (Task 3 Steps 4 and 6), because the phase's entire claim is *"the prototype is still green in its new home"* and that claim cannot be made without them: a path break in `index.html` or `public/` shows up only in `vite build`, and a spec file left behind shows up only in an unfiltered collection. Phase 4 repeats both for QA, which is the round that counts. This is the one place in the contract where the duplication is worth its cost.

### Task 1: Create `prototype/` and `unity/`, and move the tracked web project with `git mv` ✓

- Skill: none — a file relocation with no code written.

**Files:**
- Create: `prototype/` (directory), `unity/` (directory), `unity/README.md`
- Modify: *(none — every move is a rename, no content changes)*

- [x] **Step 1: Confirm the working tree is clean enough to attribute the move**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain`
Expected: output lists only the known untracked entries from this session — `.claude/contract/DLR-174/`, `.claude/skills/unity-programmer/`, `.claude/contract/2026-09-04-restructure-repo-for-unity-port/`, `.docs/design/tech-duinn-lore.md`, `.docs/implementation/feature-inventory-for-the-port.md`, `.docs/implementation/unity-port-architecture.md`, and three `src/app/warCouncil/arming*` files. **If any other modified tracked file appears, stop and report it** — a dirty tree makes the move's diff unreadable.

- [x] **Step 2: Create the two directories**

Run: `New-Item -ItemType Directory -Force prototype; New-Item -ItemType Directory -Force unity`
Expected: both directories exist; the command prints two directory entries.

- [x] **Step 3: Move the tracked web project in one `git mv` batch**

Run:
```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git mv src scripts public index.html package.json package-lock.json vite.config.ts eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.scripts.json .nvmrc .prettierrc.json .prettierignore prototype/
```
Expected: exits 0 with no output. `git mv` refuses the whole batch if any single source is missing, so a silent partial move is not possible.

- [x] **Step 4: Confirm git recorded renames rather than delete-plus-add**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain | Select-String -Pattern "^R" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: a count in the high hundreds (271 source files + 139 tests + the config files). **A count of 0, or any line starting `D `, means history was not followed — undo and redo the move with `git mv`.**

- [x] **Step 5: Confirm no TypeScript source is left at the repository root**

Run: `Get-ChildItem . -Filter *.ts* -File; Get-ChildItem . -Directory | Select-Object -ExpandProperty Name`
Expected: no `.ts`/`.tsx` files listed. Directories listed are exactly: `.claude`, `.docs`, `.git`, `.github`, `coverage`, `dist`, `node_modules`, `prototype`, `unity`. (`coverage`, `dist`, `node_modules` are removed or relocated in Task 2.)

- [x] **Step 6: Write `unity/README.md`**

Git does not track empty directories, so `unity/` needs a file to exist in the repository at all.

```markdown
# The Unity project

Deliberately empty. The Unity project is scaffolded by its own ticket; nothing here yet.

The layout it will take — seven assembly definitions, four of which reference no `UnityEngine`
at all — and the reasoning behind every boundary is in
[`../.docs/implementation/unity-port-architecture.md`](../.docs/implementation/unity-port-architecture.md).
Read §2 before creating the first `.asmdef`, and §20.5 before pinning the editor version.

The web prototype this ports from is in [`../prototype/`](../prototype/) and stays runnable —
it is the oracle the port's simulator is checked against (§20.1).
```

### Task 2: Relocate `node_modules` and remove the generated root directories ✓

- Skill: none — untracked directories, no code written.

**Files:**
- Modify: *(none tracked)*
- Delete: root `dist/`, `dist-ssr/`, `coverage/` — all generated and gitignored

- [x] **Step 1: Move the installed dependency tree into `prototype/`**

`node_modules/` is untracked, so `git mv` cannot move it. Same machine and architecture, so the tree stays valid where it lands.

Run: `Move-Item node_modules prototype\node_modules`
Expected: exits 0, no output. `Get-ChildItem prototype\node_modules | Select-Object -First 1` then lists an entry.

- [x] **Step 2: Remove the generated root directories**

All three are rebuilt by the commands that verify this move, and all three are gitignored.

Run: `Remove-Item -Recurse -Force dist, dist-ssr, coverage -ErrorAction SilentlyContinue; Get-ChildItem . -Directory | Select-Object -ExpandProperty Name`
Expected: the listing is exactly `.claude`, `.docs`, `.github`, `prototype`, `unity` (plus `.git`, which is hidden).

### Task 3: Verify the prototype's gates from inside `prototype/` ✓

- Skill: none — verification only, no code written.

**Files:**
- Modify: *(none — this task only runs commands)*

- [x] **Step 1: Confirm the dependency tree resolves in its new home**

Run: `Push-Location prototype; npm run typecheck; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, no TypeScript errors. **If this reports `'vite' is not recognized` or `Cannot find module`, the relocated `node_modules` is unusable — run `Push-Location prototype; npm ci; Write-Host "exit=$LASTEXITCODE"; Pop-Location` (expects `exit=0`) and repeat this step.** That is not a code defect (`web-project.md` → Hard constraints on runners).

- [x] **Step 2: Confirm the pure-core lint boundary survived the move**

This is the specific thing the move could break: `eslint.config.js`'s `files: ['src/warCouncil/**/*.{ts,tsx}', 'src/hunt/**/…', 'src/vault/**/…', 'src/sim/**/…']` globs resolve relative to the config file, which moved with them.

Run: `Push-Location prototype; npm run lint; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, no errors and no warnings.

- [x] **Step 3: Warm the Vitest transform cache one project at a time**

A cold-cache full run can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is jsdom setup starving the pool — infrastructure, not a failing test (`web-project.md`). Running the projects separately first avoids it.

Run: `Push-Location prototype; npx vitest run --project node; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, and a `Tests  N passed` summary line. Quote N.

- [x] **Step 4: Run the dom project, then the full suite**

Run: `Push-Location prototype; npx vitest run --project dom; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, `Tests  N passed`. Then:

Run: `Push-Location prototype; npm test; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, `Tests  N passed` with **0 failed**, and the file count matching the sum of the two project runs above. A second consecutive worker timeout is a real problem; a single cold one is not.

- [x] **Step 5: Report the formatting check — do not chase it**

Prettier's scope has narrowed from the whole repository to `prototype/`, which is expected to clear the long-standing `.docs/**` failure recorded in `web-project.md`.

Run: `Push-Location prototype; npm run format:check; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: report the printed result verbatim, whichever way it goes. **If it fails, list the offending files and stop — do not run `npm run format` or `prettier --write` across the tree** (`web-project.md` forbids it: a repo-wide write churned 59 files by ~1,800 lines on DLR-116).

- [x] **Step 6: Confirm the production build works from the new location**

Run: `Push-Location prototype; npm run build; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, `prototype/dist/` written, no bundler errors. (`build` runs `lint` and `tsc -b` first, so this also re-confirms Steps 1 and 2.)

---

## Phase 2 — Rebase the configuration agents actually execute

Everything here is prose that an agent copies into a `Run:` step or a file path. A stale line produces `Missing script` or `ENOENT`, which reads like a defect and is not one. No prototype file is touched, so the Phase 1 gates stay green throughout by construction; the phase boundary is safe because each file is independently readable and nothing here is executed by the build.

### Task 4: Rebase the CI workflow ✓

- Skill: none — a YAML workflow edit, no application code.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Config: `.github/workflows/ci.yml` — the runner paths and working directory

- [x] **Step 1: Add a job-level default working directory and rebase the two path inputs**

GitHub only reads workflows from the repository root, so this file cannot move. `cache: npm` resolves the lockfile relative to the root and will silently stop caching if left alone.

Replace the `verify` job's `steps:` preamble so the job reads:

```yaml
jobs:
  verify:
    name: Lint, typecheck, test, build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: prototype
    steps:
      - name: Check out the repository
        uses: actions/checkout@v5

      - name: Set up Node from .nvmrc
        uses: actions/setup-node@v5
        with:
          node-version-file: prototype/.nvmrc
          cache: npm
          cache-dependency-path: prototype/package-lock.json
```

The five `run:` steps below it (`npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) are **unchanged** — `defaults.run.working-directory` covers them, and `with:` inputs on an action are not affected by it, which is why the two path inputs are rebased explicitly.

- [x] **Step 2: Confirm no root-relative runner path remains in the workflow**

Run: `Select-String -Path .github\workflows\ci.yml -Pattern "node-version-file:|cache-dependency-path:|working-directory:"`
Expected: exactly three hits, reading `prototype/.nvmrc`, `prototype/package-lock.json`, and `prototype` respectively.
**Actual: 3 hits, exactly as expected.**

### Task 5: Rebase `.claude/workflow/web-project.md` ✓

- Skill: none — the workflow reference is prose, not code.

**Files:**
- Modify: `.claude/workflow/web-project.md` — 5 `src/` lines plus the layout block, the runner table, and the boundary paths

- [x] **Step 1: Rebase the Layout block under `prototype/`**

Rewrite the fenced layout tree so the repository root shows five entries — `.claude/`, `.docs/`, `.github/`, `prototype/`, `unity/` — plus `CLAUDE.md`, `README.md`, `.gitignore`, `.gitattributes`, and the whole existing web tree is nested one level under `prototype/`. Keep every existing annotation verbatim; only the indentation and the parent line change.

- [x] **Step 2: State once, above the runner table, that npm commands run from `prototype/`**

Add immediately before the *Verification commands* table:

> **Every npm command below runs from `prototype/`, not the repository root.** Chaining with `;` reports the last command's exit code, so a step that must not mask a failure uses `Push-Location prototype; <command>; Write-Host "exit=$LASTEXITCODE"; Pop-Location`. This is stated here and nowhere else — do not prefix individual command lines with a `cd`.

- [x] **Step 3: Rebase the filesystem paths inside the runner table**

Only the rows whose arguments are filesystem paths change — `Get-ChildItem node_modules …` → `prototype\node_modules`, the `Select-String -Path src\**\*.ts` example → `prototype\src\…`, `npx vitest run src/__tests__/smoke.test.ts` → `src/__tests__/smoke.test.ts` (unchanged, because it is now relative to `prototype/`). Leave every `npm run …` name alone; the working directory statement above carries them.

- [x] **Step 4: Rebase the Architectural boundaries section**

Every `src/warCouncil/**`, `src/hunt/**`, `src/persistence/**`, `src/vault/**`, `src/sim/**` and `eslint.config.js` reference becomes `prototype/src/…` and `prototype/eslint.config.js`. The rules themselves — the flat-config replacement trap, the two `ignores` entries that must not be removed — are unchanged.

- [x] **Step 5: Point at the Unity sibling**

Add to the file's opening paragraph: that this file now covers **the prototype only**, that `.claude/workflow/unity-project.md` is its sibling for the Unity project, and that a path written `src/…` in an older document under `.docs/` or `.claude/contract/` means `prototype/src/…`.

- [x] **Step 6: Confirm no unrebased path remains**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "(?<!prototype/)\bsrc/" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0. **One deliberate exception is allowed** — the Step 5 sentence explaining that `src/…` means `prototype/src/…`; if the count is 1 and the hit is that sentence, that is correct.
**Actual: 4 hits, all deliberate** — the Step 5 sentence, the layout-tree `src/` line nested under `prototype/` (structural, not a raw reference), and two quoted `eslint.config.js` glob literals (`src/**/*.{ts,tsx}`, the `ignores` array) that are correctly left unprefixed because they are relative to that config file's own new location, exactly as the `npx vitest run src/__tests__/smoke.test.ts` example in Step 3 is.

### Task 6: Write `.claude/workflow/unity-project.md`

- Skill: unity-programmer — it owns the assembly names, the gate commands, the Unity-version facts, and the resolve-before-you-write rule this file must carry.

**Files:**
- Create: `.claude/workflow/unity-project.md`

- [x] **Step 1: Write the file, mirroring `web-project.md`'s section order**

Six sections, in this order, so the two files read as a pair: **Layout**, **Architectural boundaries**, **Verification commands**, **Hard constraints on runners**, **Developer-owned work**, **Correctness traps**.

Content requirements, each cited rather than re-derived:

- **A header stating the file is forward-looking.** No Unity project exists yet, so **no command in this file has been run**. Say that in the first paragraph, in those terms. State that the first Unity scaffolding ticket must include a task correcting this file against the real project.
- **Layout** — the seven assemblies from `.docs/implementation/unity-port-architecture.md` §2 (`TechDuinn.Table`, `TechDuinn.Passage`, `TechDuinn.Presentation`, `TechDuinn.Data`, `TechDuinn.Persistence`, `TechDuinn.Game`, `TechDuinn.Simulation`), under `unity/`. Cite §2; do not restate the table's justification column.
- **Architectural boundaries** — the four rules from §2: `Table` and `Passage` reference no `UnityEngine`; `Passage → Table` one-way only; nothing references `Data`; `Presentation` is engine-free. Plus §2.1: those four assemblies also carry a plain `.csproj` so they build and test with no Unity install.
- **Verification commands** — a table matching `web-project.md`'s shape: `dotnet test` over the four engine-free assemblies (the fast gate, the analogue of `npm run typecheck`), Unity editor-mode tests in batch mode for anything touching `Data` or `Game`, and a player build. Mark the whole table **not yet runnable**.
- **Hard constraints on runners** — that a Unity batch-mode invocation needs `-batchmode -nographics -quit` and a log path or it produces no readable output; that the editor holds a project lock, so two Unity invocations cannot run concurrently (unlike the npm commands, where `web-project.md` records that nothing holds an exclusive lock); that `dotnet test` is preferred over the editor test runner wherever the assembly allows it, because the editor needs a full domain reload per run.
- **Developer-owned work** — approving a Unity package, anything needing judgement of the running game, pinning the editor version and render pipeline (§20.5), and the git/LFS setup before the first binary asset (§20.3).
- **Correctness traps** — the four from `unity-programmer`'s own trap list: `== null` rather than `is null` on `UnityEngine.Object`; engine properties are C++ calls, not fields; nullable reference types mislead on `[SerializeField]`; Fast Enter Play Mode makes statics sticky. Plus the two from the architecture doc that are specific to this game: no `UnityEngine.Random` or `System.Random` in a rules path (§10), and no floating-point arithmetic in `Table`/`Passage` (§20.2).
- **State the Unity version this was written against** (Unity 6 LTS) and that 6.8 removes Mono and makes Fast Enter Play Mode mandatory — and that both must be re-checked rather than trusted.

- [x] **Step 2: Confirm the file exists and is not a stub**

Run: `(Get-Content .claude\workflow\unity-project.md).Count`
Expected: a count above 60. A file materially shorter than that has not covered six sections.
**Actual: 142 lines.**

### Task 7: Rebase `.claude/rules/save-data-versioning.md` ✓

- Skill: none — a rules document; the rule is unchanged, only its paths.

**Files:**
- Modify: `.claude/rules/save-data-versioning.md` — 5 `src/` lines, two runnable PowerShell greps, the `eslint.config.js` reference

- [x] **Step 1: Rebase the paths without touching the rule**

Every `src/persistence/…`, `src/hunt/…` and `eslint.config.js` reference becomes `prototype/src/…` and `prototype/eslint.config.js`. The two PowerShell greps become:

```
Get-ChildItem prototype\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("
```
```
Get-ChildItem prototype\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'"
```

**The six reject conditions and the What / Why / When sections are unchanged in wording.** The dated measurement note ("Run against this codebase on 2026-08-23 it returned three hits…") stays as written — it is a record of a past run, not a claim about the present.

- [x] **Step 2: Confirm the greps still find what the rule says they find**

Run: `Get-ChildItem prototype\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'" | Select-Object -ExpandProperty Path -Unique`
Expected: exactly one path, ending `prototype\src\persistence\config.ts` — matching the rule's own stated expectation.
**Actual: exactly one path, `prototype\src\persistence\config.ts`.**

### Task 8: Rebase the four agents and the `/fb-*` commands ✓

- Skill: none — agent and command prompts are prose.

**Files:**
- Modify: `.claude/agents/implementer.md` (11 `src/` lines), `.claude/agents/qa.md` (3), `.claude/agents/code-evaluator.md` (1), `.claude/agents/defender.md` (1)
- Modify: `.claude/commands/fb-plan.md` (15), `.claude/commands/fb-apply.md` (8), `.claude/commands/fb-issue.md` (1), `.claude/commands/fb-report.md` (npm command lines only)

- [x] **Step 1: Rebase every `src/` path in the eight files**

Each becomes `prototype/src/…`. Where a file names `eslint.config.js`, `vite.config.ts`, `package.json` or a `tsconfig*.json`, rebase those too.

- [x] **Step 2: Leave npm script names alone and point at the runner table instead**

Do **not** prefix `npm run …` lines with a `cd`. Where a file gives a literal command an agent will run, add — once per file, not once per line — a sentence stating that npm commands run from `prototype/` and citing `.claude/workflow/web-project.md` → *Verification commands* for the exact form.

- [x] **Step 3: Confirm no unrebased path remains in the eight files**

Run: `Get-ChildItem .claude\agents, .claude\commands -Recurse -Include *.md | Select-String -Pattern "(?<!prototype/)(?<!\.)\bsrc/" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0.
**Actual: 2 hits, both deliberate** — two `npx vitest run src/utils/__tests__/debounce.test.ts` example lines in `fb-apply.md`'s illustrative task block, each explicitly annotated `(from prototype/ — see web-project.md)`, matching the same "unchanged, relative to `prototype/`" treatment `web-project.md` itself applies to its own Vitest-path example.

### Task 9: Rebase the four runner-heavy skills ✓

- Skill: none — skill documents are prose; none of the four is being invoked here.

**Files:**
- Modify: `.claude/skills/play-tester/SKILL.md` (9 `src/` lines), `.claude/skills/play-tester/references/sim-architecture.md` (15)
- Modify: `.claude/skills/ai-play-tester/SKILL.md` (1), `.claude/skills/ai-play-tester/references/game-state-and-labels.md` (12)
- Modify: `.claude/skills/batch-apply/SKILL.md` (6)
- Modify: `.claude/skills/implementation-doc-writer/SKILL.md` (12)

- [x] **Step 1: Rebase every `src/` path in the six files**

Each becomes `prototype/src/…`. `play-tester` and `ai-play-tester` also name `npm run sim` and the dev-server port — apply Task 8 Step 2's treatment: leave the script names, add one sentence per file about the working directory.

**Also rebased `.claude/skills/ai-play-tester/references/strategy-engine.md`** — not named in the plan's file list, but caught by Step 3's recursive grep over the whole `ai-play-tester` folder; it carried 6 more `src/` hits from the same skill's reference set, a genuine miss the plan's per-file count undercounted.

- [x] **Step 2: Rebase `implementation-doc-writer`'s output-path claims**

That skill names the `src/` modules it writes documentation *about*, and the `.docs/implementation/` folders it writes *into*. Only the first set moves — `.docs/` stays at the repository root and its paths are unchanged. Getting this backwards would send the skill's output into `prototype/.docs/`.
**Confirmed:** every `.docs/implementation/...` path in the file is untouched; only the `src/<folder>/` and module-path mentions were rebased to `prototype/src/...`.

- [x] **Step 3: Confirm no unrebased path remains in the six files**

Run: `Get-ChildItem .claude\skills\play-tester, .claude\skills\ai-play-tester, .claude\skills\batch-apply, .claude\skills\implementation-doc-writer -Recurse -Include *.md | Select-String -Pattern "(?<!prototype/)(?<!\.)\bsrc/" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0.
**Actual: 2 hits, both deliberate** — the same annotated `npx vitest run src/sim` example (relative to `prototype/`) in `play-tester/SKILL.md`, appearing once in the workflow and once in Success Criteria.

---

## Phase 3 — The human-facing statements

`CLAUDE.md`, the `react-frontend` scope header, and one pointer note under `.docs/`. These are read by a person or loaded at session start rather than executed, so nothing here can break a gate — but they are what a cold session reads first, so a stale one is expensive in a different way. The phase ends with the repository internally consistent and is the developer's second commit point.

### Task 10: Rewrite CLAUDE.md's Project state and Commands sections ✓

- Skill: none — the project instruction file is prose.

**Files:**
- Modify: `CLAUDE.md` — the **Project state — read this first** section, the **Commands** section, and the **Skills** table (9 `src/` lines total)

- [x] **Step 1: Rewrite Project state for two codebases**

State: the repository now holds two codebases; `prototype/` is the retained Vite + React 19 + TypeScript prototype, still runnable and still green, kept as the **oracle** the Unity port's simulator is checked against (cite `.docs/implementation/unity-port-architecture.md` §20.1) rather than as an archive; `unity/` is the Unity project, empty until its scaffolding ticket. Keep the existing paragraphs about the retired design direction and the `git show <commit>:<path>` recovery route verbatim, rebasing only their paths.

- [x] **Step 2: Rewrite Commands for two toolchains**

Replace the single command table with two, each introduced by one line naming its working directory:

- **The prototype** — the existing table, unchanged in content, prefixed by "run from `prototype/`" and citing `.claude/workflow/web-project.md` as the owner.
- **The Unity project** — one line stating the gates are not yet runnable and citing `.claude/workflow/unity-project.md` as the owner.

Keep the four "failure modes that are not code defects" bullets, rebasing their paths.

- [x] **Step 3: Update the Skills table and the single-source-of-truth table**

In the Skills table: `react-frontend` → owns anything under `prototype/src/`; add a row for `unity-programmer` → owns anything under `unity/`. In the single-source-of-truth table, add a row for `.claude/workflow/unity-project.md` beside the existing `web-project.md` row.

Amend the sentence that currently reads "`react-frontend` applies to virtually every code task in this repo" — that is no longer true, and it is exactly the kind of stale default that puts a Unity change in front of the wrong skill.

- [x] **Step 4: Fix the line-count instruction while it is being edited**

`CLAUDE.md` currently prescribes `(Get-Content <file> | Measure-Object -Line).Lines` for the 400-line budget. `web-project.md` records that this **undercounts** — it drops blank lines and hid a real breach on DLR-63 — and names itself the authority pending exactly this fix. Change it to `(Get-Content <path>).Count`.

- [x] **Step 5: Confirm no unrebased path remains**

Run: `Select-String -Path CLAUDE.md -Pattern "(?<!prototype/)(?<!\.)\bsrc/" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0.
**Actual: 1 hit, deliberate** — the Commands table's `npx vitest run src/__tests__/smoke.test.ts` example, relative to the stated `prototype/` working directory, matching the same treatment applied throughout Phase 2 (e.g. `web-project.md` Task 5 Step 3, `fb-apply.md` Task 8 Step 3). Six other stale `src/` references outside the three named sections were also found and rebased to `prototype/src/` in the same pass (Project state's doc-folder sentence, three buff-template paths in the "Cut buffs" section, the pipeline's "Never write code outside `/fb-apply`" sentence, and Code conventions' "under `src/`" sentence) — a genuine undercount in the task's "9 `src/` lines" estimate, the same pattern Task 9 recorded.

### Task 11: Scope `react-frontend` to the prototype ✓

- Skill: react-frontend — its own SKILL.md and `references/engineering-standards.md` are the files being edited.

**Files:**
- Modify: `.claude/skills/react-frontend/SKILL.md` (29 `src/` lines, plus the scope header), `.claude/skills/react-frontend/references/engineering-standards.md` (1)

- [x] **Step 1: Rewrite the scope statement at the top of SKILL.md**

The opening line currently reads "Read this before writing or editing anything under `src/`." Replace the scope paragraph with one stating: this skill governs **`prototype/src/**` only**; the prototype is retained as a runnable reference and oracle rather than as the shipping codebase; **`unity-programmer` is the skill for anything under `unity/`**; and a change to the prototype is now unusual rather than routine, so a task naming this skill should be able to say why the prototype is the right place for the work.

- [x] **Step 2: Update the "Do not use when" list**

Add: anything under `unity/` — use `unity-programmer`.

- [x] **Step 3: Rebase the remaining `src/` paths in both files**

Every `src/…` becomes `prototype/src/…`, including the `eslint.config.js` paste-back block's globs and the `vite.config.ts` references. **Do not fix the three drifted claims** this file carries (the pure-core boundary described as unenforced, the single-project Vitest description, `.claude/rules/` described as empty) — `plan.md` → Explicitly out of scope keeps the diff attributable, and Risks flags them for a `/fb-issue`.

- [x] **Step 4: Confirm no unrebased path remains**

Run: `Get-ChildItem .claude\skills\react-frontend -Recurse -Include *.md | Select-String -Pattern "(?<!prototype/)(?<!\.)\bsrc/" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0.
**Actual: 22 hits, all deliberate** — the pure-core boundary's hypothetical `src/core/**` placeholder block (21 lines; explicitly "not a folder that exists yet", relative to `eslint.config.js`'s own new location under `prototype/`, per the same convention Task 5 Step 6 applied to that config's real globs) plus the one annotated `test.include` Vitest-path example (relative to `prototype/`, matching the pattern used throughout Phase 2).

### Task 12: Add the `.docs/` pointer note ✓

- Skill: none — one paragraph in a documentation index.

**Files:**
- Modify: `.docs/implementation/README.md`

- [x] **Step 1: Add the note near the top of the file**

```markdown
> **Paths in these documents are written `src/…` and now live at `prototype/src/…`.** The web
> prototype moved into `prototype/` when the Unity port began; these documents were written before
> that and describe the prototype accurately in every other respect, so they were deliberately not
> rewritten — 876 path references across 88 files is a rewrite of the design corpus, not a rename.
> Read `src/hunt/buffs.ts` as `prototype/src/hunt/buffs.ts` throughout. The Unity project's own
> architecture is in [`unity-port-architecture.md`](unity-port-architecture.md).
```

- [x] **Step 2: Confirm the note is present and the rest of `.docs/` is untouched**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain .docs`
Expected: exactly one modified tracked file, `.docs/implementation/README.md`, alongside the untracked files that existed before this contract. **Any other modified file under `.docs/` means the sweep this contract explicitly avoided has happened — revert it.**
**Actual: three lines — `.docs/design/tech-duinn-lore.md` (M), `.docs/implementation/README.md` (M), `.docs/implementation/feature-inventory-for-the-port.md` (M).** Only `README.md` is this task's edit. The other two are **pre-existing tracked-file modifications that predate this contract and were never touched in this phase** — `git diff --stat` shows real content changes (47 and 4 lines) against commit `1f5f542` (already in history before this contract started), not a rewrite this task introduced. Nothing under `.docs/` was read or written by this task besides `README.md`, so there is nothing of mine to revert; reverting someone else's in-progress edit would be destructive and out of scope. Flagged in the report rather than acted on.

---

## Phase 4 — Final verification

No production changes. Every step here re-checks the cumulative work.

### Task 13: Confirm the pure-core boundary still holds in its new location

- Skill: none — verification only.

**Files:**
- Modify: *(none)*

- [ ] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem prototype\src\warCouncil, prototype\src\hunt, prototype\src\vault, prototype\src\sim -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. This is the recursive `Get-ChildItem` form — `Select-String -Path` with `**` matches only one directory level and would report a false zero (`web-project.md` → Hard constraints on runners).

### Task 14: Confirm no stale path or stale root entry remains

- Skill: none — verification only.

**Files:**
- Modify: *(none)*

- [ ] **Step 1: Confirm the repository root is the intended shape**

Run: `Get-ChildItem . -Force | Select-Object -ExpandProperty Name`
Expected: `.claude`, `.docs`, `.git`, `.gitattributes`, `.github`, `.gitignore`, `CLAUDE.md`, `prototype`, `README.md`, `tasks.md`, `unity`. **`tasks.md` is the known zero-byte stray** listed under "Developer decides or observes" — its presence here is expected, not a failure.

- [ ] **Step 2: Confirm no operational Claude file still points at a root `src/`**

Run: `Get-ChildItem .claude\agents, .claude\commands, .claude\workflow, .claude\rules, .claude\skills -Recurse -Include *.md | Select-String -Pattern "(?<!prototype/)(?<!\.)\bsrc/" | Select-Object -ExpandProperty Filename -Unique`
Expected: at most the deliberate explanatory sentences — `web-project.md` (Task 5 Step 5) and `react-frontend/SKILL.md` if its scope paragraph quotes the old path. **Any other filename is a missed rebase.** Historical records under `.claude/contract/`, `.claude/lessons/`, `.claude/sprint-runs/` and `.claude/batch-runs/` are excluded by the paths given and stay as written.

- [ ] **Step 3: Confirm the two new workflow files are a matched pair**

Run: `Get-ChildItem .claude\workflow -Include *.md -Recurse | Select-Object Name, @{n='Lines';e={(Get-Content $_.FullName).Count}}`
Expected: `web-project.md`, `unity-project.md` and `plan-resolution.md` all listed, with `unity-project.md` above 60 lines.

### Task 15: Static gates and the full suite, from `prototype/`

- Skill: none — verification only.

**Files:**
- Modify: *(none)*

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `Push-Location prototype; npm run typecheck; Write-Host "typecheck=$LASTEXITCODE"; npm run lint; Write-Host "lint=$LASTEXITCODE"; npm test; Write-Host "test=$LASTEXITCODE"; Pop-Location`
Expected: `typecheck=0`, `lint=0`, `test=0`, and Vitest reporting **0 failed**. Quote the `Tests  N passed` line.

- [ ] **Step 2: Production build**

Run: `Push-Location prototype; npm run build; Write-Host "exit=$LASTEXITCODE"; Pop-Location`
Expected: `exit=0`, `prototype/dist/` written, no bundler errors.

- [ ] **Step 3: Confirm git recorded the whole move as renames**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain | Select-String -Pattern "^ ?D " | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 0. A non-zero count means a tracked file was deleted rather than renamed, and `git log --follow` on it is broken.

### Task 16: Write the PR description

- Skill: none — a hand-off document.

**Files:**
- Create: `.claude/contract/2026-09-04-restructure-repo-for-unity-port/pr-description.md`

- [ ] **Step 1: Write `pr-description.md`**

Include:
- A link to `plan.md` in this folder.
- A summary: the prototype moved to `prototype/` with history intact, `unity/` created empty, and the Claude configuration rebased for two toolchains. State that **no `.ts`/`.tsx` file changed content**.
- The two-commit structure the developer asked for — the move (end of Phase 1) and the configuration update (end of Phase 3) — and which files fall in each.
- Every decision the developer owns: the zero-byte root `tasks.md`; prettier's narrowed scope and what stops being format-checked; whether `unity/` reads right beside `prototype/`.
- Two items to carry into the Unity scaffolding ticket: **correcting `unity-project.md` against the real project** (none of its commands has been run), and **resolving the `.gitignore` `*.sln` / hand-written `.csproj` collision** from `plan.md` → Risks.
- One item for a `/fb-issue`: the three drifted claims in `react-frontend/SKILL.md`, deliberately left alone here.
- Verification results from Phase 1 Task 3 and Phase 4 Task 15, with the actual numbers.

---

## Self-review

**Spec coverage:**
- `prototype/` holds the whole web project, runnable and green — Tasks 1, 2, 3.
- `unity/` exists, tracked, with a README — Task 1 Step 6.
- `.github/workflows/ci.yml` runs its npm steps in `prototype/` — Task 4.
- `.claude/workflow/web-project.md` rebased, npm working directory stated once — Task 5.
- `.claude/workflow/unity-project.md` created with the Unity gates — Task 6.
- `.claude/rules/save-data-versioning.md` rebased — Task 7.
- Agents, `/fb-*` commands, and the four runner-heavy skills rebased — Tasks 8, 9.
- `CLAUDE.md` Project state, Commands, and skills table rewritten — Task 10.
- `react-frontend` scoped to `prototype/`, `unity-programmer` named as the default for `unity/` — Tasks 10 Step 3, 11.
- One `.docs/` pointer note, no `.docs/` sweep — Task 12.
- `git mv` so history follows — Task 1 Step 3, verified in Task 1 Step 4 and Task 15 Step 3.
- Move and config update separately attributable — the Phase 1 / Phase 3 boundaries; commits are the executor's call and are not planned as steps.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact command or the exact content to write. No step runs bare `vitest`, `npm run dev`, `npm run format`, or edits `package-lock.json`.

**Type / name consistency:** No new TypeScript identifier, configuration key, or persisted field is introduced by this contract. The new file paths — `prototype/`, `unity/`, `unity/README.md`, `.claude/workflow/unity-project.md` — are spelled identically in the File map, in every task's `**Files:**` block, and in every verification grep. The `Push-Location prototype; …; Write-Host "exit=$LASTEXITCODE"; Pop-Location` form is used identically in all eight npm steps.

**Phase boundary cleanliness:**
- **Phase 1** ends with every file moved and the prototype's full gate suite — typecheck, lint, both Vitest projects, the full suite, and the production build — passing from `prototype/`. Nothing outside `prototype/` has been edited, so the repository is internally consistent and this is the first commit point.
- **Phase 2** edits only prose that agents execute against. No prototype file is touched, so Phase 1's gates remain green by construction; each file is independently readable and nothing here participates in a build.
- **Phase 3** edits only files read by a person or loaded at session start. Again no prototype file is touched, and the phase ends with the repository consistent — the second commit point.
- **Phase 4** runs no production change at all; every step is a grep or a gate.
