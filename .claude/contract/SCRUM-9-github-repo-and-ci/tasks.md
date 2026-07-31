# Tasks: Set up the GitHub repository and CI

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-07-31

**Goal:** Put the project under version control and make every push report whether the prototype still builds — `git init -b main`, demonstrably working ignore rules, normalised line endings, Node pinned in one place both local development and CI read, a GitHub Actions workflow running install → lint → typecheck → test → build, a README documenting setup and the private-visibility decision, and one initial commit; creating the GitHub repository and pushing stay with the developer.

**Spec:** `plan.md` in this folder.

---

## Runner note — git is not on `PATH`

`Get-Command git` finds nothing in this shell, but `C:\Program Files\Git\cmd\git.exe` exists (v2.55.0.windows.3). PowerShell shell state does **not** persist between tool calls, so **every** step that invokes git opens with the prepend below, repeated verbatim rather than assumed from an earlier step:

```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"
```

Chain with `;`, never `&&`. Backslash paths for filesystem arguments; forward slashes inside npm script names, git pathspecs, and Vitest filters.

---

## File map

**Created:**
- `.gitattributes` — line-ending normalisation for a Windows working tree against Ubuntu CI, plus explicit `binary` for committed assets
- `.nvmrc` — the single source of the Node version (`24.16.0`), read by both the local version manager and `actions/setup-node`
- `.github/workflows/ci.yml` — the `CI` workflow: one `verify` job, five named steps, on every push and pull request
- `.claude/contract/SCRUM-9-github-repo-and-ci/pr-description.md` — the developer handoff, written in Final verification
- `.git/` — repository metadata created by `git init -b main`; not a source file and never an edit target

**Modified:**
- `.gitignore` — append `.vite/`, `*.tsbuildinfo`, `.claude/settings.local.json`, each only if absent. No existing pattern is removed or reordered
- `package.json` — add an `engines.node` field holding the floor that matches `.nvmrc`. No dependency change, so `package-lock.json` is not touched
- `README.md` — modify `## Requirements` (add the `.nvmrc` pin) and `## Getting started` (add clone + `nvm use` ahead of the existing `npm ci`); append `## Continuous integration` and `## Repository visibility`. **`Getting started` already exists** — SCRUM-8 wrote it, so it is edited, not duplicated. No existing prose is deleted
- `.claude/workflow/web-project.md` — Layout block (lines 13-31), Verification commands table (lines 58-72), and the Developer-owned work bullet at line 101

**Deleted:** (none)

**Developer decides or observes:**
- **Create the private GitHub repository `amazerbeam/string-railway`** — the action half of criterion 7. Do not initialise it with a README, `.gitignore`, or licence; this repository already has all three and an unrelated initial commit on the remote would force a merge.
- **`git remote add origin https://github.com/amazerbeam/string-railway.git` then `git push -u origin main`** — closes criterion 2 in full. No `gh` CLI is installed and `git config credential.helper` is empty, so no agent can authenticate from this machine.
- **Confirm the first Actions run is green on the commit, and open one throwaway pull request to confirm checks appear on it** — closes criterion 5's "visible on the commit and any pull request" and the Actions-schema half of criterion 4. Locally the workflow is only proven to be valid YAML, not a valid Actions schema.
- **Node pin `24.16.0` exact vs a `24` major-only pin** — exact is what criterion 8's "cannot diverge" asks for; major-only picks up patch releases automatically. One line in `.nvmrc` plus a matching `engines` floor either way.
- **Commit-author email** — commits will carry `jossduffy.jd@gmail.com` from the global git config, not the `eidasolutions.com` address. Private repo means collaborators only, but it enters history permanently. Setting `git config user.email <addr>` inside the repo before Phase 5 is the developer's call.
- **Whether `.gitattributes` stays** — no criterion asks for it; it exists because Prettier defaults to `lf` and a CRLF working tree fails `format:check` for reasons unrelated to the code.
- **Whether to drop lint from the `build` script** to stop `npm run lint` running twice per CI run. Doing so weakens SCRUM-8's reading of its own criterion 4, so this contract does not change it unilaterally.
- **Whether to SHA-pin `actions/checkout@v5` and `actions/setup-node@v5`** — real supply-chain hardening, real maintenance overhead, and adjacent to the ticket's out-of-scope "repository automation".
- **Whether to restrict `on: push` to `main`** — would halve runs on same-repo pull requests, at the cost of narrowing criterion 4's literal "every push".
- **Whether `CLAUDE.md` lines 11 and 16 get corrected** (they still claim no application exists). SCRUM-8 landing falsifies them and SCRUM-8's scope excludes fixing it, so nothing currently owns the correction. Out of scope here by choice, not oversight.

---

## Phase 1 — Preflight and repository initialisation

The only phase that can hard-stop. `SCRUM-8-scaffold-vite-app` reads `Status: COMPLETE` and its output was verified on disk on 2026-07-31, so this is a regression check rather than a gamble — but it stays, because the workflow written in Phase 3 invokes four npm scripts **by string** and a script rename between planning and execution produces CI that fails as `npm ERR! Missing script`, which reads like a defect and is not one. So this phase re-reads the real `package.json` before anything else, then initialises the repository. It is a safe stopping point because it writes no file: either the scaffold is present and `.git/` now exists on `main`, or nothing has changed and the contract is `BLOCKED`.

### Task 1: Preflight — confirm the scaffold and the four script names CI will invoke ✓

- Skill: `none` — read-only environment gate; no file is written and no code is authored

**Files:**
- (none — read-only preflight. Nothing is created, modified, or deleted.)

- [x] **Step 1: Confirm `package.json` and `package-lock.json` are on disk**

Run: `Get-ChildItem package.json, package-lock.json | Select-Object Name, Length`
Expected: both listed with non-zero `Length`. If either is missing, **STOP**: set this contract's `Status:` to `BLOCKED` and report — "SCRUM-9 requires SCRUM-8's scaffold. Run `/fb-apply SCRUM-8-scaffold-vite-app` to completion first." Do not scaffold anything here; that is another contract's work.

- [x] **Step 2: Assert the four script names exist, and that `test` is `vitest run` and not watch mode**

Run:
```powershell
node --input-type=commonjs -e "const s=require('./package.json').scripts||{};const need=['lint','typecheck','test','build'];const miss=need.filter(k=>!s[k]);if(miss.length){console.error('MISSING: '+miss.join(', '));process.exit(1)}if(!/vitest\s+run/.test(s.test)){console.error('test script is not vitest run: '+s.test);process.exit(1)}need.forEach(k=>console.log(k+' = '+s[k]))"
```
Expected: exits 0 and prints exactly these four lines, verified against the real `package.json` on 2026-07-31 — `lint = eslint .`, `typecheck = tsc -b`, `test = vitest run`, `build = npm run lint && tsc -b && vite build`. If any string differs from these, a later change renamed or rewired a script: **stop and reconcile** before Phase 3 writes the workflow against it.
If it prints `MISSING: …`, **STOP** as `BLOCKED` with the message from Step 1. If it prints `test script is not vitest run`, **STOP** — a bare `vitest` is watch mode and would hang the CI runner until it times out; that is SCRUM-8's `package.json` to fix, not this contract's.

- [x] **Step 3: Confirm dependencies are installed**

Run: `Get-ChildItem node_modules -ErrorAction SilentlyContinue | Select-Object -First 1`
Expected: one directory listed. Empty output means `node_modules` is absent — run `npm ci` and re-run this step. A missing `node_modules` is not a code defect.

- [x] **Step 4: Confirm the two SCRUM-8 files this contract extends rather than creates**

Run: `Get-ChildItem .gitignore, README.md | Select-Object Name, Length`
Expected: both listed with non-zero `Length`. If `.gitignore` is missing, **STOP** — Task 3 verifies and extends it and must not author it, since SCRUM-8 criterion 7 owns its creation. If `README.md` is missing, the same applies to Task 7 and SCRUM-8 criterion 8.

### Task 2: Initialise the repository with `main` as the default branch ✓

- Skill: `none` — git plumbing; no skill on disk covers it

**Files:**
- (none — `git init` creates `.git/`, which is repository metadata rather than a source file.)

- [x] **Step 1: Confirm git is reachable at its absolute path**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git --version`
Expected: `git version 2.55.0.windows.3` (any `2.x` is acceptable). If PowerShell reports the term is not recognised, **STOP** — git has moved and `.claude/workflow/web-project.md` needs correcting at its source before this contract can proceed.

- [x] **Step 2: Confirm the project root is not already a repository**

Run: `Get-ChildItem .git -Force -ErrorAction SilentlyContinue | Select-Object -First 1`
Expected: no output. If anything is listed, `git init` has already run — **STOP** and report, rather than re-initialising over existing history.

- [x] **Step 3: Initialise on `main`**

`init.defaultBranch` is `master` on this machine (corrected from the plan's "unset" during orchestrator preflight), so a bare `git init` would produce `master`. Name the branch at init rather than renaming later.

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git init -b main`
Expected: `Initialized empty Git repository in E:/Game Dev/StringsAndStations/.git/`

- [x] **Step 4: Confirm the branch name and report the inherited commit identity**

`git symbolic-ref` is used rather than `git rev-parse --abbrev-ref HEAD` because no commit exists yet and `rev-parse` fails on an unborn branch.

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git symbolic-ref --short HEAD; git config user.name; git config user.email`
Expected: `main`, then `amazerbeam`, then `jossduffy.jd@gmail.com`. **Report the identity in the summary and change nothing** — choosing a commit identity is a developer decision listed under "Developer decides or observes". If either config value is empty, **STOP** and ask, because `git commit` in Phase 5 will fail without them.

---

## Phase 2 — Make the tree safe to stage

Three properties that must hold **before** anything is staged: ignore rules that demonstrably work, line endings normalised at the git layer, and the Node version pinned in one place. The ordering is load-bearing — staging first and fixing `.gitignore` afterwards means the initial commit permanently contains `node_modules`, and un-committing it means rewriting history rather than deleting a file. The phase is a safe stopping point because each task ends with a command that proves its own claim, and `package.json` is re-type-checked after being edited.

### Task 3: Verify the ignore rules behaviourally, then extend them minimally ✓

- Skill: `none` — repository hygiene; no skill on disk covers `.gitignore`

**Files:**
- Modify: `.gitignore` — append up to three entries, only where absent

- [x] **Step 1: Read the current file and note which of the three candidate entries already exist**

Run: `Get-Content .gitignore`
Expected: the Vite `react-ts` template block (`logs`, `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `pnpm-debug.log*`, `lerna-debug.log*`, `node_modules`, `dist`, `dist-ssr`, `*.local`, `.vscode/*`, `!.vscode/extensions.json`, `.idea`, `.DS_Store`, `*.suo`, `*.ntvs*`, `*.njsproj`, `*.sln`, `*.sw?`) plus SCRUM-8's two additions — a `# Local environment files` block (`.env`, `.env.*`, `!.env.example`) and a `# Test coverage` block (`coverage`).
All three of this task's candidate additions were confirmed **absent** on 2026-07-31, so Step 3 appends all three. If any is now present, skip that line and say so.

**Actual result:** all three candidate entries (`.vite/`, `*.tsbuildinfo`, `.claude/settings.local.json`) were already present at lines 34-39 when read at execution time — the block had already landed by an earlier session. Step 3's edit is therefore skipped per its own fallback instruction ("If all three are present, make no edit").

- [x] **Step 2: Prove the criterion-3 paths are actually ignored, rather than reasoning about patterns**

`git check-ignore -v` answers the real question — *is this path ignored, and by which line* — and works on pathnames whether or not they exist on disk.

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git check-ignore -v node_modules dist coverage .env .env.local`
Expected: five lines, each of the form `.gitignore:<line>:<pattern>	<path>`. Every one of the five paths must appear. A path **missing from the output is not ignored** — add the pattern that covers it before continuing, and do not proceed to staging with a gap here.

**Result:** all five paths appeared — confirmed.

- [x] **Step 3: Append the entries that Step 1 found absent**

All three candidates were already present (see Step 1), so no append was made.

- [x] **Step 4: Prove the appended patterns match**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git check-ignore -v .vite tsconfig.app.tsbuildinfo .claude/settings.local.json`
Expected: three lines naming `.gitignore` and the newly appended line numbers. Any path absent from the output means its pattern does not match — fix the pattern, not the expectation.

**Result on first run:** only 2 of 3 lines appeared — `.vite` (bare, no trailing slash, non-existent on disk) did not match the directory-only pattern `.vite/`, a documented git quirk: a trailing-slash pattern only matches a path git can confirm is a directory, and a nonexistent bare path is ambiguous. Per the step's own fallback ("fix the pattern, not the expectation"), changed `.vite/` to `.vite` in `.gitignore` (drops the directory-only restriction; still covers `node_modules/.vite`, already covered separately by the `node_modules` pattern). Re-ran: all three lines now appear.

### Task 4: Normalise line endings with `.gitattributes` ✓

- Skill: `none` — repository hygiene; no skill on disk covers `.gitattributes`

**Files:**
- Create: `.gitattributes`

- [x] **Step 1: Create `.gitattributes` with the normalisation and binary rules**

Development is on Windows and CI runs on Ubuntu. Prettier's default `endOfLine` is `lf`, so a CRLF working tree fails `format:check` for reasons that have nothing to do with the code. Normalising once at the git layer fixes it for every future contributor.

```gitattributes
# Windows development, Linux CI: normalise line endings once, at the git layer,
# so a CRLF working tree cannot fail Prettier's lf default in CI.
* text=auto eol=lf

# Binary assets — never diffed, never line-ending converted.
*.pdf binary
*.png binary
*.jpg binary
*.jpeg binary
*.ico binary

# SVG is XML and benefits from diffing.
*.svg text eol=lf
```

- [x] **Step 2: Confirm the attributes resolve against real files**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git check-attr text eol -- README.md .docs/Game_Rules/Rules.pdf`
Expected: `README.md: text: auto` and `README.md: eol: lf`; `.docs/Game_Rules/Rules.pdf: text: unset` (the `binary` macro expands to `-text -diff`, which clears `text`) and `.docs/Game_Rules/Rules.pdf: eol: unspecified`. If `README.md` reports `text: unspecified`, the `*` line is not being read — check the filename is exactly `.gitattributes` at the project root.

**Actual result:** `README.md` matched exactly (`text: auto`, `eol: lf`). `Rules.pdf` matched on `text: unset` but reported `eol: lf`, not `unspecified` as predicted — because the `binary` macro (`-diff -merge -text`) does not clear `eol`, so the file-wide `* text=auto eol=lf` line's `eol=lf` still applies as an attribute value. This has no practical effect: git only honours `eol` when `text` is true or auto-detected as text, and here `text` is explicitly unset, so no line-ending conversion occurs on the PDF regardless of the reported `eol` value. Content matches the task's fenced block verbatim; no edit made. Flagged as a planning-prediction inaccuracy, not an implementation defect.

### Task 5: Pin Node in `.nvmrc` and record the matching floor in `package.json` ✓

- Skill: `react-frontend` — governs `package.json`; read it plus `references/engineering-standards.md` before editing, and note that this task adds **no** dependency, so the two-runtime-dependency rule is untouched and `package-lock.json` is not modified

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`
- Config: `package.json` — add an `engines.node` field (semver range; no M-number, because a toolchain version is not a game tunable and does not belong in `rules.json`)

- [x] **Step 1: Read the versions this machine actually runs**

Run: `node --version; npm --version`
Expected: `v24.16.0` and `11.13.0`. If Node reports a different version, **pin the version reported here** rather than the one written below, and carry that same value into `engines.node`, the `.nvmrc` file, and the README section in Task 7. Never pin a version this machine does not run — the whole point of criterion 8 is that local and CI agree.

**Result:** `v24.16.0` and `11.13.0` — matches exactly.

- [x] **Step 2: Create `.nvmrc` holding only the version**

One line, no `v` prefix, trailing newline. This is the single source of the Node version: `actions/setup-node` reads it via `node-version-file`, and `nvm` / `fnm` / `volta` read it locally.

```
24.16.0
```

- [x] **Step 3: Add the `engines` field to `package.json`**

Insert immediately after the `"type": "module",` line, so the field sits before `"scripts"` following npm's conventional field order. If the real file's field order differs from SCRUM-8's plan, insert `"engines"` immediately before the `"scripts"` key instead.

Replace:
```json
  "type": "module",
  "scripts": {
```
with:
```json
  "type": "module",
  "engines": {
    "node": ">=24.16.0"
  },
  "scripts": {
```

Real file's field order matched the plan exactly — inserted as specified.

- [x] **Step 4: Assert the two mentions of the version agree**

The value now appears twice, which is the exact divergence criterion 8 forbids. Guard it with a script rather than a convention.

Run:
```powershell
node --input-type=commonjs -e "const fs=require('fs');const v=fs.readFileSync('.nvmrc','utf8').trim();const e=(require('./package.json').engines||{}).node||'';console.log('.nvmrc='+v+'  engines.node='+e);if(e!=='>='+v){console.error('DIVERGED');process.exit(1)}console.log('CONSISTENT')"
```
Expected: prints `.nvmrc=24.16.0  engines.node=>=24.16.0` then `CONSISTENT`, and exits 0. A `DIVERGED` line with exit 1 means the two files disagree — fix whichever is wrong before continuing.

**Result:** printed exactly as expected, exit 0.

- [x] **Step 5: Confirm `package.json` is still valid JSON and the project still type-checks**

Run: `npm pkg get engines; npm run typecheck`
Expected: `npm pkg get` prints `{ "node": ">=24.16.0" }` — it parses `package.json` and fails loudly on malformed JSON — and `npm run typecheck` exits 0 with no errors reported.

**Result:** both matched exactly, `tsc -b` exited 0 with no errors.

---

## Phase 3 — Continuous integration workflow

Authors the workflow that makes criteria 4 and 5 true. Five separately named `run` steps rather than one chained command, because a named step is what makes a lint failure legible in the Actions UI instead of hiding inside a shell exit code. Verification here is honest about its ceiling: `npx prettier --check` proves the file **parses as YAML**, which is the only dependency-free validation available on this machine (no PyYAML, no YAML parser in Node's standard library). It does not prove the Actions **schema** is valid — GitHub reports that on the developer's first push. The phase is a safe stopping point because the file is inert until a remote exists.

### Task 6: Author `.github/workflows/ci.yml` ✓

- Skill: `none` — GitHub Actions configuration; no skill on disk covers CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [x] **Step 1: Create the directory and the workflow file**

The four `npm run` targets must be the exact script names recorded in Task 1 Step 2. `npm ci` rather than `npm install`, because `ci` installs exactly `package-lock.json` and `install` may silently mutate it — that is what makes a CI result reproducible locally.

```yaml
name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Lint, typecheck, test, build
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v5

      - name: Set up Node from .nvmrc
        uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

- [x] **Step 2: Confirm the file parses as YAML, using the Prettier SCRUM-8 already installed**

Run: `npx prettier --check .github/workflows/ci.yml`
Expected: `All matched files use Prettier code style!` and exit 0. If it reports a **formatting** difference, run `npx prettier --write .github/workflows/ci.yml` and re-run this check. If it reports a **parse error** (`SyntaxError`), the YAML is malformed — fix the structure; do not reformat around it. This step adds no dependency: Prettier is already a devDependency.

**Result:** printed exactly `All matched files use Prettier code style!`.

- [x] **Step 3: Confirm nothing masks a failing step (criterion 5)**

Run: `Select-String -Path .github\workflows\ci.yml -Pattern "continue-on-error|\|\|\s*true|exit 0"`
Expected: zero hits. Any hit means a step could fail without failing the run, which is exactly what criterion 5 forbids.

**Result:** zero hits.

- [x] **Step 4: Confirm all five commands criterion 4 names are present**

Run: `Select-String -Path .github\workflows\ci.yml -Pattern "npm ci|npm run lint|npm run typecheck|npm test|npm run build"`
Expected: exactly five matching lines — one per command. Fewer means a step is missing; more means a command is duplicated inside the workflow.

**Result:** exactly five matching lines (lines 29, 32, 35, 38, 41 — one per command).

- [x] **Step 5: Confirm the Node version is read from `.nvmrc` and never restated inline (criterion 8)**

Run:
```powershell
Select-String -Path .github\workflows\ci.yml -Pattern "node-version-file: \.nvmrc"
Select-String -Path .github\workflows\ci.yml -Pattern "node-version:\s+\d"
```
Expected: the first search returns exactly one hit; the second returns **zero** hits. A literal version inside the workflow is a second copy of the number and reintroduces the divergence criterion 8 forbids.

**Result:** first search returned exactly one hit (line 25, `node-version-file: .nvmrc`); second search returned zero hits.

---

## Phase 4 — Documentation

Records the two things that must outlive this session: how a developer starting from nothing gets the app running (criterion 6), and why the repository is private (criterion 7). Also corrects the one pipeline document this contract falsifies, at its source rather than at a call site. Nothing here changes behaviour, so the phase boundary is trivially clean; `package.json` and the workflow are untouched.

### Task 7: Extend the README — two sections modified, two appended ✓

- Skill: `react-frontend` — keeps the README's stack, script, and Node claims consistent with what `package.json` actually says, and enforces the no-hard-coded-tunable rule against prose as well as source

**Files:**
- Modify: `README.md:5-12` — `## Requirements`, add the `.nvmrc` pin paragraph; `README.md:14-20` — `## Getting started`, add the clone and `nvm use` steps; append two new sections after `:77`

- [x] **Step 1: Read the existing README and confirm its shape has not changed**

Run: `Select-String -Path README.md -Pattern '^## '`
Expected: exactly seven headings, in this order — `Requirements` (L5), `Getting started` (L14), `Pinned versions` (L36), `Project layout` (L50), `The \`src/rules/\` boundary` (L66), `Configuration` (L70), `Two constraints later stories inherit` (L74). This is SCRUM-8's file as verified on 2026-07-31.
**`Getting started` already exists** — do not append a second one. Steps 2 and 3 modify existing sections in place; only Step 4 appends. If the heading list differs from the above, re-read the file and adapt the anchors rather than applying the diffs blind.

**Result:** confirmed exact match, all seven headings at the stated lines.

- [x] **Step 2: Add the `.nvmrc` pin paragraph to `## Requirements` (criterion 8)**

The section already states the Node and npm versions, so do not restate them — state where the pin *lives*. Insert after the existing `create-vite` line.

Replace:
```markdown
It was generated from the `create-vite` `react-ts` template with `--eslint`.
```
with:
```markdown
It was generated from the `create-vite` `react-ts` template with `--eslint`.

The Node version is pinned in **one** place: `.nvmrc`. `nvm use` / `fnm use` / `volta` read it locally, and `actions/setup-node` reads the same file in CI via `node-version-file`, so local and CI cannot diverge. `package.json` `engines.node` states the matching floor, so `npm install` warns a contributor on an older major.
```

- [x] **Step 3: Add clone and version-select steps to `## Getting started` (criterion 6)**

The section currently starts at `npm ci`, which assumes the repository is already on disk. Criterion 6 asks for a developer "starting from nothing". Replace the lead-in and its fence only — the script table below at L22-34 stays exactly as it is.

Replace:
```markdown
Install dependencies from the committed lockfile:

```sh
npm ci
```
```
with:
```markdown
Starting from nothing:

```sh
git clone https://github.com/amazerbeam/string-railway.git
cd string-railway
nvm use
npm ci
npm run dev
```

`nvm use` selects the Node version in `.nvmrc` (`fnm use` and `volta` read the same file). `npm ci` installs exactly what `package-lock.json` pins — use it rather than `npm install`, which may update the lockfile. `npm run dev` starts the dev server and prints the local URL; it runs until you stop it.
```

Use an `sh` fence to match the one already there, not `powershell`.

- [x] **Step 4: Append the two genuinely new sections**

Append to the end of the file, after the `erasableSyntaxOnly` bullet that closes `## Two constraints later stories inherit`. Append the inner content, not the outer four-backtick fence.

````markdown

## Continuous integration

Workflow `CI`, at `.github/workflows/ci.yml`, runs on **every push and every pull request**. One job on `ubuntu-latest`:

| Step | Command |
| --- | --- |
| Install dependencies | `npm ci` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Test | `npm test` |
| Build | `npm run build` |

Any failing step fails the run. Results appear on the commit and as checks on any pull request. The job requests `contents: read` only — this project needs no secret and defines none.

Running those five commands locally is a dry-run of CI. If they pass on your machine, the run should be green.

## Repository visibility

**This repository is private, deliberately.** Two reasons, recorded so the decision survives:

1. `.docs/Game_Rules/` contains a full rules extraction of **String Railway**, a published game credited to Hisashi Hayashi, with art, development and design by named contributors at Forgenext. Publishing that transcription — and `Rules.pdf` alongside it — would republish someone else's rulebook content. A private repository avoids the question entirely and costs nothing for a prototype.
2. A private repository keeps commit-author email addresses out of public view.

Both files are in the initial commit, so making the repository public later republishes them from history — removing them at that point means rewriting history, not deleting a file. Revisit the decision by removing `.docs/Game_Rules/` first.
````

**Result:** appended verbatim after the `erasableSyntaxOnly` bullet.

- [x] **Step 5: Confirm no heading was duplicated**

Run: `Select-String -Path README.md -Pattern '^## ' | Group-Object Line | Where-Object Count -gt 1`
Expected: no output. Any group returned means a heading appears twice — most likely `## Getting started`, which Step 3 modifies rather than adds.

**Result:** no output — confirmed.

- [x] **Step 6: Format the README and confirm it is clean**

`.prettierignore` covers `node_modules`, `dist`, `coverage`, `package-lock.json`, `.claude`, `.docs`, and `CLAUDE.md` — **not** `README.md`. So `npm run format:check` will fail on an unformatted README, and this step keeps that existing gate green.

Run: `npx prettier --write README.md; npx prettier --check README.md`
Expected: the check prints `All matched files use Prettier code style!` and exits 0. Note that Prettier will re-align the existing script table if the edits changed its widest cell — that is expected and correct.

**Result:** printed exactly `All matched files use Prettier code style!`; Prettier also re-aligned the new `Continuous integration` table's column widths on write, as expected.

- [x] **Step 7: Confirm no tunable value leaked into the copy**

A number that belongs in `rules.json` is a defect in prose as much as in source.

Run: `Select-String -Path README.md -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits. The toolchain versions `24.16.0` and `11.13.0` contain no bare match for any of these.

**Result:** zero hits — confirmed.

- [x] **Step 8: Confirm the four criteria these edits close are actually recorded**

Run: `Select-String -Path README.md -Pattern "amazerbeam/string-railway|node-version-file|private, deliberately|Continuous integration"`
Expected: at least one hit for each of the four patterns — the clone URL (criterion 6), the single Node source (criterion 8), the recorded visibility decision (criterion 7), and the CI section (criteria 4 and 5).

**Result:** all four patterns hit — confirmed.

### Task 8: Correct `.claude/workflow/web-project.md` ✓

- Skill: `none` — the `react-frontend` skill's "Do not use when" section names anything under `.claude/`, so invoking it here would be wrong

**Files:**
- Modify: `.claude/workflow/web-project.md:13-31` — Layout block; `:58-72` — Verification commands table; `:101` — Developer-owned work bullet

- [x] **Step 1: Add the four new repo-root files to the Layout block**

In the fenced layout block, after the `rules.json` line and before `public/`, insert:

```
  .gitignore              node_modules, dist, local env files, build caches
  .gitattributes          text=auto eol=lf — Windows working tree, Ubuntu CI
  .nvmrc                  the single source of the Node version (SCRUM-9)
  .github/workflows/      ci.yml — install, lint, typecheck, test, build
```

**Note:** the real file has only one `public/` occurrence, with `rules.json` nested directly under it and `src/` immediately following — there is no second `public/` line for "before" to anchor against. Inserted the four lines immediately after the `rules.json` line and before `src/`, which is the only placement consistent with "after `rules.json`" and does not require a second `public/`.

- [x] **Step 2: Add three rows to the Verification commands table**

Append to the table that ends with the file-line-count row:

```markdown
| Invoke git (**not on `PATH`**) | `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git <args>` |
| The working tree is clean | `git status --porcelain` → Expected: no output |
| What CI will run | `npm ci; npm run lint; npm run typecheck; npm test; npm run build` |
```

Immediately below the table, after the paragraph about `npm run typecheck` being the fast gate, add the paragraphs below. **Note the correction applied:** the contract's original draft wrote "`init.defaultBranch` is unset" — the orchestrator's preflight found it is actually `master` on this machine, so the wording below was written to state that, not the contract's original claim.

```markdown
Git is installed at `C:\Program Files\Git\cmd\git.exe` (2.55.0) but is **not on this shell's `PATH`**, and PowerShell shell state does not persist between tool calls — so every git step must prepend the path itself. `init.defaultBranch` is `master` on this machine, so always pass `-b main` to `git init`.

The five commands in the last row are exactly what `.github/workflows/ci.yml` runs. A clean local pass therefore predicts a green CI run; it does not prove the workflow's Actions schema is valid, which only a push can.
```

**Result:** applied with the `master` correction, not the contract's original "unset" claim.

- [x] **Step 3: Rewrite the Developer-owned work bullet that SCRUM-9 falsifies**

Replace:
```markdown
- **Git remote creation and CI** — explicitly out of scope on SCRUM-8, and not an agent's to set up unasked.
```
with (**corrected wording — see note below**):
```markdown
- **Creating the GitHub repository, adding the remote, and pushing.** Pushing publishes content to a remote — an outward-facing action that stays the developer's call, and one an agent must never take on its own initiative even though a credential helper happens to be configured on this machine. No `gh` CLI is installed, so repository creation is not available to an agent at all. Reading the result of a CI run is developer work for the same reason. Authoring `.github/workflows/ci.yml`, initialising the repository, verifying ignore rules, and committing are **agent** work — SCRUM-9 asked for them. An agent may run `git init`, `add`, `commit`, `status`, `check-ignore`, `check-attr`, `ls-files`, and `log`; it may not run `push`, `remote add`, `fetch`, `pull`, or `clone`.
```

**Note — deliberate deviation from the contract's original Step 3 wording:** `plan.md` and this file's original draft asserted `git config credential.helper` is empty. The orchestrator checked during preflight and it returns `manager` — Git Credential Manager *is* configured on this machine. The wording above was substituted per the dispatching agent's explicit correction: it does not claim credentials are unavailable, and instead states the real reason pushing stays developer-owned — publishing to a remote is an outward-facing action that is the developer's call regardless of whether credentials happen to be present, and no `gh` CLI is installed for repository creation. The agent-may / agent-may-not command split is unchanged from the original.

- [x] **Step 4: Confirm the stale claim is gone and the new content is present**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "not an agent's to set up unasked"`
Expected: zero hits.

**Result:** zero hits — confirmed.

- [x] **Step 5: Confirm the three new facts are recorded**

Run: `Select-String -Path .claude\workflow\web-project.md -Pattern "\.nvmrc|ci\.yml|Program Files\\\\Git"`
Expected: at least one hit for each of the three patterns.

**Result:** `.nvmrc` and `ci.yml` matched directly. The `Program Files\\Git` alternation (quadruple-backslash in the pattern as written) did not match the single-backslash text actually in the file — a grep-escaping artefact, not a content gap. Re-verified with `Select-String -Path .claude\workflow\web-project.md -Pattern "Program Files.Git"`, which hit at both the table row and the new paragraph. All three facts are recorded.

---

## Phase 5 — The initial commit

`/fb-plan` normally forbids planned commit steps, because a plan should not dictate git hygiene. That ban does not apply here: the commit **is** acceptance criterion 1, so it is the deliverable rather than punctuation between phases. Exactly one commit is made, isolated in its own phase, and only after a staged-file review — because committing `node_modules` and repairing afterwards means rewriting history rather than deleting a file. Everything the commit will contain already exists and has been verified by Phases 1-4.

### Task 9: Stage, review, and make the single initial commit

- Skill: `none` — git plumbing; the staged-secret check implements `react-frontend/references/engineering-standards.md` → Security ("never commit API keys, credentials, or secrets")

**Files:**
- (none — stages and commits files that already exist. No file is created, modified, or deleted.)

- [ ] **Step 1: Stage everything**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git add -A`
Expected: exits 0. `warning: in the working copy of '<file>', LF will be replaced by CRLF` messages are **expected and correct** — that is `.gitattributes` normalising line endings on the way into the index.

- [ ] **Step 2: Review the staged set — the check that makes this commit safe**

Run:
```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --cached --name-only | Measure-Object -Line; git diff --cached --name-only | Select-String -Pattern "^node_modules/|^dist/|^coverage/|\.env|settings\.local\.json|\.tsbuildinfo"
```
Expected: a `Lines` count **under 200** — the scaffold, `.claude/`, `.docs/`, `CLAUDE.md`, `package-lock.json`, and this contract's additions — and **zero** hits from the pattern.
A count in the thousands means `node_modules` is staged. Any pattern hit means an ignored path was staged anyway. In either case **STOP**: run `git reset` (which unstages without touching the working tree), return to Task 3, fix the ignore rules, and re-stage. Do not commit and repair afterwards.

- [ ] **Step 3: Confirm no credential or secret is staged**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --cached --name-only | Select-String -Pattern "\.pem$|\.key$|id_rsa|\.npmrc$|credentials|\.env"`
Expected: zero hits. The ticket states nothing in this epic needs a secret; this confirms none has appeared by accident.

- [ ] **Step 4: Commit**

Run:
```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git commit -m @'
Initialise repository with the scaffolded prototype and CI

Brings String Railway under version control (SCRUM-9). Before this commit
there was no version control at all, so a tuning change that made the game
worse had no way back.

- Vite + React + TypeScript scaffold from SCRUM-8, the .docs/ rulebook
  extraction, and the /fb-* pipeline under .claude/
- .gitignore verified with git check-ignore against real paths, not by
  reading patterns; .gitattributes normalises line endings for Windows
  development against Ubuntu CI
- Node pinned in .nvmrc, read by both the local version manager and
  actions/setup-node via node-version-file, so the two cannot diverge
- .github/workflows/ci.yml runs install, lint, typecheck, test and build
  on every push and pull request; any failing step fails the run

Repository visibility is private by decision — see README.md for the
reasoning, which is about third-party rulebook content, not preference.
'@
```
Expected: `[main (root-commit) <sha>] Initialise repository with the scaffolded prototype and CI` followed by a `N files changed, M insertions(+)` summary. The closing `'@` must sit at column 0 with no leading whitespace, or PowerShell fails to parse the here-string.

- [ ] **Step 5: Confirm the commit exists and the tree is clean**

Run:
```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git log --oneline -1; git status --porcelain | Select-String -NotMatch -Pattern "\.claude/contract/"
```
Expected: one commit line naming `main` and the root commit, and **no output** from the filtered status. The filter excludes this contract's own plan folder, because ticking checkboxes in `tasks.md` modifies a tracked file as a side effect of executing it — that is expected. Any path **outside** the plan folder appearing here means something was missed.

---

## Phase 6 — Final verification

No production changes — only sanity checks that the cumulative work is clean, plus the developer handoff. The commit is already made, so a failure found here means a second commit rather than an amend; that is normal and preferable to amending published-shaped history. Task 10.2 is deliberately the same five commands `ci.yml` runs, making this phase a local dry-run of CI.

### Task 10.1: Confirm the `src/rules/` boundary still holds

- Skill: `none` — read-only regression grep; this contract creates and modifies no file under `src/`

**Files:**
- (none — read-only.)

- [ ] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. A hit inside `__tests__/` is the same violation. This contract touches nothing under `src/`, so any hit is a pre-existing defect from another contract — report it rather than fixing it here.

### Task 10.2: Static gates and full suite — the local dry-run of CI

- Skill: `none` — runs existing gates; writes no code

**Files:**
- (none — `npm run build` writes `dist/`, which is generated and ignored.)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: exits 0 with zero errors and zero warnings reported.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [ ] **Step 3: Full unfiltered test suite**

Run: `npm test`
Expected: exits 0 and Vitest prints a `Tests  N passed` summary with `0 failed`. Read the output for `Failed to load` or `Transform failed` before concluding anything about coverage — a TypeScript error in a spec is a collection error, and that file's tests never ran.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` is written, no bundler errors. Note that `build` also runs `npm run lint` a second time, by SCRUM-8's design.

### Task 10.3: Prove criterion 3 — a full build leaves nothing untracked

- Skill: `none` — git verification; writes no code

**Files:**
- (none — read-only.)

- [ ] **Step 1: Confirm the working tree is clean after the build**

Task 10.2 Step 4 has just written `dist/`, so this runs against the exact state criterion 3 describes: "a clean clone plus install plus build succeeds with nothing untracked that should be ignored."

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain | Select-String -NotMatch -Pattern "\.claude/contract/"`
Expected: no output. Entries under `.claude/contract/` are excluded because ticking this file's own checkboxes modifies a tracked file. Any other path — especially `dist/`, `coverage/`, or a `*.tsbuildinfo` — means an ignore rule is missing.

- [ ] **Step 2: Confirm the generated trees are ignored, not merely absent**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git check-ignore -v dist node_modules coverage .vite`
Expected: `dist` and `node_modules` each appear with the `.gitignore` line that ignores them, since both exist on disk at this point. `coverage` and `.vite` appear if their patterns match.

- [ ] **Step 3: Confirm nothing that should be ignored got tracked**

Run:
```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git ls-files | Measure-Object -Line; git ls-files | Select-String -Pattern "^node_modules/|^dist/|^coverage/|\.env|settings\.local\.json|\.tsbuildinfo"
```
Expected: a `Lines` count under 200, and **zero** hits from the pattern. Quote the count in the summary — it is the concrete answer to "what is in this repository".

### Task 10.4: Confirm the Node pin is consistent across every place it appears

- Skill: `none` — verification greps; writes no code

**Files:**
- (none — read-only.)

- [ ] **Step 1: Re-assert `.nvmrc` against `engines.node`**

Run:
```powershell
node --input-type=commonjs -e "const fs=require('fs');const v=fs.readFileSync('.nvmrc','utf8').trim();const e=(require('./package.json').engines||{}).node||'';console.log('.nvmrc='+v+'  engines.node='+e);if(e!=='>='+v){console.error('DIVERGED');process.exit(1)}console.log('CONSISTENT')"
```
Expected: prints the two values then `CONSISTENT`, exits 0.

- [ ] **Step 2: Confirm the workflow reads the version and never restates it**

Run: `Select-String -Path .nvmrc,README.md,.github\workflows\ci.yml -Pattern "24\.16\.0"`
Expected: hits in `.nvmrc` and `README.md` only — **zero** hits in `.github/workflows/ci.yml`. A literal version in the workflow is a third copy of the number and defeats criterion 8.

- [ ] **Step 3: Confirm the four script names the workflow invokes still exist**

Run: `npm pkg get scripts.lint scripts.typecheck scripts.test scripts.build`
Expected: a JSON object with all four keys present and non-empty. An empty `{}` for any key means the workflow names a script that does not exist and would fail CI as `Missing script`.

### Task 10.5: Confirm the pipeline documentation matches reality

- Skill: `none` — the `react-frontend` skill excludes anything under `.claude/`

**Files:**
- (none — read-only.)

- [ ] **Step 1: Confirm the stale git bullet is gone and the new facts are recorded**

Run:
```powershell
Select-String -Path .claude\workflow\web-project.md -Pattern "not an agent's to set up unasked"; Select-String -Path .claude\workflow\web-project.md -Pattern "\.nvmrc|ci\.yml|credential\.helper"
```
Expected: the first search returns zero hits; the second returns at least one hit per pattern.

### Task 10.6: Write the PR description and the developer handoff

- Skill: `none` — a hand-off document, not code

**Files:**
- Create: `.claude/contract/SCRUM-9-github-repo-and-ci/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder, and the Jira link `https://amazerbeam.atlassian.net/browse/SCRUM-9`.
- A summary of the change: repository initialised on `main`, ignore rules verified behaviourally, line endings normalised, Node pinned in `.nvmrc` with a guarded `engines` floor, `CI` workflow with five named steps, README extended with setup and the private-visibility decision, and `web-project.md` corrected.
- **The exact commands the developer must run**, in order, and what each closes:
  ```powershell
  # Create the PRIVATE repository amazerbeam/string-railway on GitHub first.
  # Do NOT let GitHub add a README, .gitignore, or licence — this repo has all three.
  $env:Path = "C:\Program Files\Git\cmd;$env:Path"
  git remote add origin https://github.com/amazerbeam/string-railway.git
  git push -u origin main
  ```
- Which acceptance criteria the pipeline closed (1, 3, 4 partially, 6, 7, 8) and which only the push can close (2 in full; 5's "visible on the commit and any pull request"; the Actions-schema half of 4). State plainly that no agent verified a green CI run, because none could.
- Every decision from the File map's "Developer decides or observes" list, verbatim.
- The verification results from Task 10.2 and Task 10.3, with the actual numbers: lint/typecheck exit codes, the Vitest `Tests N passed` line, the build result, and the tracked-file count.
- A one-line note for future contributors on each new convention this contract introduced: git is invoked with an explicit `PATH` prepend because it is not on `PATH`; `.nvmrc` is the single source of the Node version and CI reads it; and an agent may commit here but may never push.

- [ ] **Step 2: Confirm the file exists and is non-trivial**

Run: `Get-ChildItem .claude\contract\SCRUM-9-github-repo-and-ci\pr-description.md | Select-Object Name, Length; (Get-Content .claude\contract\SCRUM-9-github-repo-and-ci\pr-description.md | Measure-Object -Line).Lines`
Expected: the file is listed with a non-zero `Length` and a line count above 40. This file is untracked at this point — leaving it so is correct; whether it joins the history is the developer's call.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage — `plan.md` Part 1 "In scope" bullets:**
- Preflight gate — Task 1.
- Repository initialisation on `main` via git's absolute path — Task 2.
- Ignore rules verified and extended (criterion 3) — Task 3; proven in Task 10.3.
- Line-ending normalisation — Task 4.
- Node pinning (criterion 8) — Task 5; re-checked in Task 10.4.
- CI workflow (criteria 4, 5) — Task 6.
- README extension (criteria 6, 7, 8) — Task 7.
- Initial commit (criterion 1) — Task 9.
- `web-project.md` correction — Task 8; verified in Task 10.5.
- Local dry-run of CI — Task 10.2.
- `pr-description.md` — Task 10.6.

**Acceptance-criteria coverage:**
- 1 — Task 9 (commit contains the scaffold, `.docs/`, `.claude/`, `CLAUDE.md`).
- 2 — **developer only**; commands in Task 10.6 and the File map. No task claims it.
- 3 — Task 3 (rules) + Task 10.3 (proven after a real build).
- 4 — Task 6 (five named steps) + Task 10.4 Step 3 (the script names resolve); Actions-schema validity is developer-verified.
- 5 — Task 6 Step 3 (no failure masking, grep-verified); "visible on the commit and any pull request" is developer-verified.
- 6 — Task 7 `Getting started`.
- 7 — Task 7 `Repository visibility`; creating the private repo is a developer step.
- 8 — Task 5 + Task 10.4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, `handle edge cases`, or "similar to Task N" references. Every step is either a concrete code block or a runnable command with `Run:` and `Expected:`. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No step contains an `eslint-disable`. No tuning value is invented anywhere.

**Type / name consistency:** `.nvmrc` (exactly that filename, no `v` prefix, value `24.16.0`) is used identically in Tasks 5, 6, 7, 8, 10.4. `engines.node` with the value `>=24.16.0` appears identically in Tasks 5 and 10.4. The script names `lint`, `typecheck`, `test`, `build` are read in Task 1 Step 2, written into the workflow in Task 6 Step 1, and re-asserted in Task 10.4 Step 3 — one spelling throughout, matching `plan.md` Part 2 Data shapes. The workflow path `.github/workflows/ci.yml`, the branch name `main`, the remote URL `https://github.com/amazerbeam/string-railway.git`, and the git `PATH` prepend string are byte-identical everywhere they appear. Every `- Skill:` value is either `react-frontend` (Tasks 5 and 7) or `none` with a stated reason, and both correspond to entries in `plan.md` Part 2 "Skills to invoke during execution".

**Phase boundary cleanliness:**
- **Phase 1** ends with `.git/` present on `main` and not a single tracked or working file changed — or with nothing changed at all and `Status: BLOCKED`. Type-checking is unaffected because no file was touched.
- **Phase 2** ends with `package.json` re-verified as valid JSON and `npm run typecheck` exiting 0 (Task 5 Step 5); `.gitignore` and `.gitattributes` are inert data with no compiler or runtime consumer. Nothing is staged, so no half-applied state can reach history.
- **Phase 3** ends with a workflow file that parses as YAML and is inert until a remote exists. No source file changed, so typecheck is unaffected.
- **Phase 4** ends with `README.md` and `web-project.md` as Markdown-only changes, both Prettier-clean where Prettier applies. No behaviour and no type changed.
- **Phase 5** ends with exactly one commit and a working tree clean apart from this file's own checkbox edits. All content it committed was already verified by Phases 1-4.
- **Phase 6** makes no production change; it only reads, runs existing gates, and writes one document inside the plan folder.
