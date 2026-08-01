# Tasks: Reset the project to a clean prototype slate

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01

**Goal:** Strip String Railway out of this repository — all game code, the tuning surface, the rulebook, the 13 contract folders — leaving a working game-free Vite/React/TypeScript toolchain with all five gates green, and rewrite the pipeline prose and the `react-frontend` skill to describe a generic prototype rather than a deleted game.

**Spec:** `plan.md` in this folder.

---

## Before you start

**Everything this contract deletes is recoverable.** Verified at planning time: `HEAD` = `master` = `origin/master` = `2cf7ec7`, working tree clean, pushed to `https://github.com/amazerbeam/string-railway`. Recover any file with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show origin/master:<path>
```

**Two hard prohibitions for this contract specifically.** Both would destroy the recovery path this plan depends on:

- **Never rewrite git history** — no `filter-branch`, no `filter-repo`, no `rebase` over published commits, no `push --force`.
- **Never delete a git branch** and never run `push`, `remote`, `fetch`, `pull`, or `clone`. Local branches `master`, `SCRUM-2-4`, `Strings_back_Up`, `main` and every `origin/*` ref stay untouched.

**Do not delete this plan folder.** Task 9 removes sibling folders under `.claude/contract/` using a `SCRUM-*` glob precisely so that `.claude/contract/2026-08-01-reset-to-clean-prototype-slate/` survives the contract that is running from it.

---

## File map

**Created:**

- `src/App.tsx` — replaced wholesale; placeholder component with no import outside the JSX runtime
- `src/__tests__/smoke.test.ts` — keeps `npm test` from exiting 1 on an empty suite

**Modified:**

- `eslint.config.js:23-67` — remove the inert `src/rules/**` + `src/constants/**` purity override
- `package.json:2` — `name`: `string-railway` → `prototype`
- `index.html:7` — `<title>`: `String Railway` → `Prototype`
- `vite.config.ts:6-9` — host-neutral comment above `base`; the `base: './'` value is unchanged
- `.prettierignore:6` — drop the `.docs` entry
- `CLAUDE.md` — full rewrite, game-free
- `README.md` — full rewrite, game-free (**not** Prettier-ignored — must pass `format:check`)
- `.claude/workflow/web-project.md` — genericise layout, boundary section, traps
- `.claude/rules/README.md` — genericise the candidate-rules list
- `.claude/agents/code-evaluator.md`, `defender.md`, `implementer.md`, `qa.md` — genericise
- `.claude/commands/fb-plan.md`, `fb-apply.md`, `fb-archive.md`, `fb-issue.md`, `fb-report.md`, `CLAUDE.md` — genericise
- `.claude/skills/react-frontend/SKILL.md` — clean-sheet rewrite including the `description:` frontmatter
- `.claude/skills/react-frontend/references/engineering-standards.md` — clean-sheet rewrite

**Deleted:**

- `src/rules/` — 35 files
- `src/ui/` — 34 files
- `src/constants/` — 4 files
- `public/rules.json`
- `.github/workflows/deploy.yml`
- `.docs/` — `Game_Rules/Rules.pdf`, `Game_Rules/Rules.md`, `Unity_Migration.md`
- `.claude/contract/SCRUM-*` — 13 folders
- `.claude/workflow/unity/` — 12 files

**Untouched (stated so nobody edits them speculatively):** `src/main.tsx`, `src/styles/global.css`, `public/favicon.svg`, `package-lock.json`, `tsconfig*.json`, `.github/workflows/ci.yml`, `.nvmrc`, `.gitignore`, `.gitattributes`, `.prettierrc.json`, `.claude/skills/management-jira/`, `.claude/skills/skill-creator/`, `.claude/workflow/plan-resolution.md`, `.claude/lessons/` (already empty).

**Developer decides or observes:**

- **The project name.** `package.json` `name` and `index.html` `<title>` land as `prototype` / `Prototype` — neutral placeholders, not a choice. Substitute the real name in Task 5 if it is known by then.
- **Whether the GitHub Pages deploy stays.** Task 7 deletes `.github/workflows/deploy.yml` on an inference from the scope answer, not a stated instruction. Skip Task 7 to keep publishing.
- **Whether the agents and `/fb-*` commands are in scope.** Skip Tasks 14 and 15 if the intent was `.claude/skills/` alone.
- **Whether the ESLint purity override should survive as a live rule.** Task 4 deletes it and Task 16 preserves it as a documented paste-back block. Keeping it pointed at an invented `src/core/` instead is a legitimate call — it would mean scaffolding a design nobody has chosen, which is why the plan does not.
- **Whether the 13 contract folders should go.** They record *why* each past decision was made, not just what was planned. Recoverable from `origin/master`, but nobody greps git history by accident. Worth a moment before Task 9 runs.
- **The nine open SCRUM tickets** describing a prototype that will no longer exist. This contract does not touch Jira.
- **Whether the placeholder page reads as *"nothing built here yet"* rather than *"something is broken"*.** QA can confirm it mounts with a clean console; the copy call is yours.

---

## Phase 1 — Remove the game code and keep the gates green

Deletes every line of game logic and UI, then immediately lands the two files that keep the toolchain verifiable without a game. Both repairs belong in this phase rather than a later one: `src/App.tsx:1` imports `./ui/AppShell`, so deleting `src/ui/` alone leaves a tree that does not type-check, and deleting all 18 specs alone makes `npm test` exit 1 with *"No test files found"*. The phase boundary is safe only once Tasks 2 and 3 have both landed — expect a red typecheck between Task 1 and Task 2, and treat that as the plan working, not failing.

### Task 1: Delete the game trees and the tuning surface ✓

- Skill: `none — deletion only; no TypeScript is authored in this task`

**Files:**

- Delete: `src/rules/` (35 files), `src/ui/` (34 files), `src/constants/` (4 files)
- Config: `public/rules.json` — deleted; the entire tuning surface goes with the game

- [x] **Step 1: Remove the four paths**

```powershell
Remove-Item -Recurse -Force -Confirm:$false src\rules, src\ui, src\constants, public\rules.json
```

- [x] **Step 2: Confirm they are gone and that the survivors are intact**

Run: `Get-ChildItem src -Recurse -File | Select-Object -ExpandProperty FullName; Get-ChildItem public -File | Select-Object -ExpandProperty Name`

Expected: exactly three files under `src\` — `App.tsx`, `main.tsx`, `styles\global.css` — and exactly one file under `public\` — `favicon.svg`. No `rules`, `ui`, or `constants` directory remains.

### Task 2: Replace `src/App.tsx` with a placeholder that imports nothing ✓

- Skill: `none — developer override; see plan.md Part 2 "Skills to invoke during execution"`

**Files:**

- Modify: `src/App.tsx` — replaced in full (currently 7 lines importing `./ui/AppShell`)

- [x] **Step 1: Overwrite the file**

Replace the entire contents of `src/App.tsx` with the following. It must import nothing — an import of a deleted module is the exact failure this task exists to prevent, and `noUnusedLocals` is on so a leftover unused import fails the build too.

```tsx
function App() {
  return (
    <main>
      <h1>Prototype</h1>
      <p>Empty slate. Nothing is built here yet.</p>
    </main>
  )
}

export default App
```

- [x] **Step 2: Confirm the dangling import is resolved**

Run: `npm run typecheck`

Expected: exits 0, no errors reported. A `Cannot find module './ui/AppShell'` here means Step 1 did not save.

### Task 3: Add the placeholder spec that keeps `npm test` meaningful ✓

- Skill: `none — developer override; see plan.md Part 2 "Skills to invoke during execution"`

**Files:**

- Create: `src/__tests__/smoke.test.ts`
- Test: `src/__tests__/smoke.test.ts`

The path is deliberate. `vite.config.ts` sets `test.include` to `src/**/__tests__/**/*.test.ts`, and `**` matches zero path segments, so this location is collected **without editing `vite.config.ts`**. Step 2 proves that by running it rather than trusting the glob. The spec must stay DOM-free — `environment` is `node`, so a `document` reference throws.

- [x] **Step 1: Create the file**

```ts
import { describe, expect, it } from 'vitest'

describe('toolchain', () => {
  it('runs the test suite', () => {
    expect(true).toBe(true)
  })
})
```

- [x] **Step 2: Prove the glob collects it**

Run: `npx vitest run src/__tests__/smoke.test.ts`

Expected: exits 0 and prints `Tests  1 passed (1)`. If it prints `No test files found, exiting with code 1`, the glob did not match — move the file to `src/rules/__tests__/smoke.test.ts` **or** widen `test.include` in `vite.config.ts` to `src/**/*.test.ts`, then re-run.

- [x] **Step 3: Close the phase with both fast gates**

Run: `npm run typecheck; npm run lint`

Expected: both exit 0. Lint passes even though `eslint.config.js` still globs the deleted `src/rules/**` — a flat-config `files` glob matching nothing is inert, not an error. Task 4 removes it.

---

## Phase 2 — De-game the toolchain metadata

Nothing here is game logic; it is the build configuration and project identity that outlived the code but still names the game. Separated from Phase 1 so that a failure in "retune the build" cannot be mistaken for a failure in "remove the game". Every task ends with a real gate, and the phase boundary is clean at every point — none of these edits can leave the tree half-consistent.

### Task 4: Remove the inert `src/rules/` purity override from ESLint ✓

- Skill: `none — config edit; no TypeScript is authored in this task`

**Files:**

- Config: `eslint.config.js:23-67` — delete the second config object in the `defineConfig` array

Its two globs (`src/rules/**/*.{ts,tsx}` and `src/constants/**/*.{ts,tsx}`) now match nothing, so the block is dead config describing an architecture that no longer exists. The mechanism is not lost — Task 16 documents it in the rewritten skill, with a paste-back override.

- [x] **Step 1: Delete the override block**

Remove the entire object beginning with the comment `// src/rules/ imports the station definitions from src/constants/` and ending with the closing `},` before `eslintConfigPrettier`. That is the whole `no-restricted-imports` + `no-restricted-globals` block. The resulting array has exactly three entries:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
])
```

Leave every `import` at the top of the file in place — all seven are still used by the surviving entries.

- [x] **Step 2: Confirm no game path remains in the ESLint config**

Run: `Select-String -Path eslint.config.js -Pattern "src/rules|src/constants|String Railway"`

Expected: zero hits.

- [x] **Step 3: Confirm lint still passes**

Run: `npm run lint`

Expected: exits 0. An `'globals' is defined but never used` error here means Step 1 removed an import it should not have.

### Task 5: Rename the project in `package.json` and `index.html` ✓

- Skill: `none — metadata edit; no TypeScript is authored in this task`

**Files:**

- Config: `package.json:2` — `"name": "string-railway"` → `"name": "prototype"`
- Modify: `index.html:7` — `<title>String Railway</title>` → `<title>Prototype</title>`

`prototype` / `Prototype` are neutral placeholders. If the developer has supplied a real project name by the time this task runs, use it in both places instead — the name must be a valid npm package name (lowercase, no spaces) in `package.json`, and may be free text in the `<title>`.

- [x] **Step 1: Change the package name**

In `package.json`, replace line 2:

```json
  "name": "prototype",
```

Change nothing else — no dependency, no script, no `engines` entry. `package-lock.json` is **not** hand-edited and `npm install` is **not** run: the lockfile's own `name` field is cosmetic and regenerates on the next natural install.

- [x] **Step 2: Change the document title**

In `index.html`, replace line 7:

```html
    <title>Prototype</title>
```

- [x] **Step 3: Confirm the old name is gone from both files**

Run: `Select-String -Path package.json,index.html -Pattern "string-railway|String Railway"`

Expected: zero hits.

### Task 6: Genericise the build-config comments and drop the stale ignore entry ✓

- Skill: `none — config edit; no TypeScript is authored in this task`

**Files:**

- Config: `vite.config.ts:6-9` — replace the comment above `base`; `.prettierignore:6` — remove the `.docs` line

- [x] **Step 1: Replace the `base` comment in `vite.config.ts`**

The value `base: './'` is **unchanged** — a relative base is correct on any static host at any depth. Only the comment, which names the old GitHub Pages path, is replaced:

```ts
  // A relative base keeps asset URLs correct whether this is served from a domain
  // root or a sub-path. Safe while this is a single view with no router — switch to
  // an explicit path before adding the first client-side route.
  base: './',
```

- [x] **Step 2: Remove the `.docs` entry from `.prettierignore`**

`.docs/` is deleted in Phase 3, so the entry becomes stale. Prettier tolerates a nonexistent ignore path, so this is tidiness. The resulting file is exactly:

```
node_modules
dist
coverage
package-lock.json
.claude
CLAUDE.md
```

Keep `CLAUDE.md` — Task 11 rewrites that file and relies on it staying Prettier-ignored. Do **not** add `README.md`; it is deliberately formatted, and Task 12 depends on that.

- [x] **Step 3: Confirm the config is clean and still valid**

Run: `Select-String -Path vite.config.ts,.prettierignore -Pattern "string-railway|String Railway|\.docs"; npm run typecheck`

Expected: zero `Select-String` hits, and `typecheck` exits 0.

### Task 7: Delete the GitHub Pages deploy workflow ✓

- Skill: `none — deletion only; no TypeScript is authored in this task`

**Files:**

- Delete: `.github/workflows/deploy.yml`

**Developer decision — skip this task to keep publishing.** `plan.md` → Risks records that this deletion is inferred from the scope answer rather than stated. Deleting it stops pushes to `master` from publishing to `https://amazerbeam.github.io/string-railway/`; the existing site stays up but goes stale.

- [x] **Step 1: Remove the workflow**

```powershell
Remove-Item -Force -Confirm:$false .github\workflows\deploy.yml
```

- [x] **Step 2: Confirm CI survives and deploy is gone**

Run: `Get-ChildItem .github\workflows -File | Select-Object -ExpandProperty Name`

Expected: exactly one file — `ci.yml`. `ci.yml` is **not** touched by this contract.

---

## Phase 3 — Delete the non-code trees

Removes the rulebook, the completed contract folders, and the parked Unity pipeline. Nothing in this phase can break a gate — no source, config, or test file is involved — which makes it the cheapest phase to re-run or partially revert. The phase boundary is trivially safe: the tree still type-checks, lints, tests and builds exactly as it did at the end of Phase 2.

### Task 8: Delete the game documentation ✓

- Skill: `none — deletion only; no TypeScript is authored in this task`

**Files:**

- Delete: `.docs/Game_Rules/Rules.pdf`, `.docs/Game_Rules/Rules.md`, `.docs/Unity_Migration.md` — the whole `.docs/` tree

This removes the files from the working tree only. `Rules.pdf` and `Rules.md` remain readable in public git history from the initial commit; `README.md` documents that, and undoing it would require a history rewrite, which is out of scope for this contract.

- [x] **Step 1: Remove the tree**

```powershell
Remove-Item -Recurse -Force -Confirm:$false .docs
```

- [x] **Step 2: Confirm it is gone**

Run: `Test-Path .docs`

Expected: `False`.

### Task 9: Delete the 13 completed contract folders ✓

- Skill: `none — deletion only; no TypeScript is authored in this task`

**Files:**

- Delete: `.claude/contract/SCRUM-10-deploy-prototype-to-hosted-url`, `SCRUM-11-tutorial-mode-core`, `SCRUM-12-station-card-seat-colour`, `SCRUM-13-hero-banner-artwork-overlap`, `SCRUM-14-border-polygon-orientation`, `SCRUM-15-scale-board-text-and-marks`, `SCRUM-16-closed-loop-closing-edge`, `SCRUM-2-rules-engine`, `SCRUM-3-4-config-setup-and-board`, `SCRUM-3-tuning-config-and-debug-shell`, `SCRUM-5-station-placement-workflow`, `SCRUM-8-scaffold-vite-app`, `SCRUM-9-github-repo-and-ci`

**The `SCRUM-*` glob is load-bearing.** It is what stops this task deleting the plan folder it is running from. Do not broaden it to `.claude\contract\*`.

**Pre-deletion enumeration (Implementer, Phase 3):** `Get-ChildItem .claude\contract -Directory` before Step 1 returned exactly 15 entries: the two reserved folders (`archive`, `specs`), this contract's own folder (`2026-08-01-reset-to-clean-prototype-slate`), and all 13 named `SCRUM-*` folders — including `SCRUM-3-tuning-config-and-debug-shell`, which the plan flagged as possibly absent but which was in fact present on disk. So the actual count deleted is **13**, matching the plan exactly, not a mismatch.

- [x] **Step 1: Remove only the `SCRUM-` prefixed folders**

```powershell
Remove-Item -Recurse -Force -Confirm:$false .claude\contract\SCRUM-*
```

- [x] **Step 2: Confirm the 13 are gone and this contract survived**

Run: `Get-ChildItem .claude\contract -Directory | Select-Object -ExpandProperty Name`

Expected: exactly three entries — `2026-08-01-reset-to-clean-prototype-slate`, `archive`, `specs`. If `2026-08-01-reset-to-clean-prototype-slate` is missing, the glob was broadened; recover it with `git show origin/master` is **not** possible (this plan is newer than the last commit), so stop and report rather than continuing.

Confirmed: the command returned exactly `2026-08-01-reset-to-clean-prototype-slate`, `archive`, `specs`. This contract's own folder survived.

### Task 10: Delete the parked Unity pipeline ✓

- Skill: `none — deletion only; no TypeScript is authored in this task`

**Files:**

- Delete: `.claude/workflow/unity/` — 12 files (`CLAUDE.md`, `README.md`, `agents/` ×4, `commands/` ×5, `workflow/unity-project.md`)

- [x] **Step 1: Remove the tree**

```powershell
Remove-Item -Recurse -Force -Confirm:$false .claude\workflow\unity
```

- [x] **Step 2: Confirm only the two live workflow references remain**

Run: `Get-ChildItem .claude\workflow -Recurse | Select-Object -ExpandProperty Name`

Expected: exactly two entries — `plan-resolution.md` and `web-project.md`.

---

## Phase 4 — Genericise the pipeline prose

Rewrites the documentation layer so it describes a game-free React prototype. Ordered owner-before-caller, which is the single-source-of-truth rule this repo is built on applied to its own docs: the reader-facing files first (`CLAUDE.md`, `README.md`), then the references the agents and commands cite (`web-project.md`, `.claude/rules/README.md`), then the agents and commands that do the citing. Every task in this phase ends with the same objective gate — a zero-hit grep for game vocabulary — so "genericised" is verified rather than asserted. The phase boundary is safe throughout: no source file is touched, so all five gates hold at every step.

**The shared verification pattern.** Every task below runs this grep against the files it just rewrote. Define it once and reuse it verbatim:

```
-Pattern "String Railway|string-railway|rules\.json|src/rules|src/ui|ColourId|PlayerId|MADE UP|M17|Game_Rules|Rules\.md|rulebook|transversal|hotseat|station|railway|scoring|SCRUM"
```

Expected: **zero hits**, in every task in this phase. Two deliberate exceptions, both called out in the task that owns them: `management-jira` prose may name the `SCRUM` Jira project, and any documented ESLint override must use a neutral example path (`src/core/**`), never `src/rules/**`.

### Task 11: Rewrite `CLAUDE.md` ✓

- Skill: `none — documentation; no TypeScript is authored in this task`

**Files:**

- Modify: `CLAUDE.md` — full rewrite (currently 156 lines; not Prettier-checked, so formatting is free)

The current file is both game-specific *and* factually stale — it claims the app is "scaffolded and empty of game logic" while a full prototype sits in the tree. The rewrite must be true of the post–Phase 3 repository.

- [x] **Step 1: Write the replacement**

Keep exactly these sections, dropping every other heading in the current file:

- **Project state — read this first.** State plainly: a Vite + React 19 + TypeScript prototype scaffold with no application code. `src/` holds `main.tsx`, `App.tsx` (a placeholder) and `styles/global.css`. There is one placeholder spec at `src/__tests__/smoke.test.ts`. Note that the String Railway prototype that previously lived here was removed on 2026-08-01 and is recoverable at `origin/master` commit `2cf7ec7`. Do **not** describe an architecture the next prototype has not chosen.
- **The single-source-of-truth rule.** Keep the principle and the ownership table, with the game rows removed. Remaining rows: code layout / runners / developer-owned work → `.claude/workflow/web-project.md`; plan layout and slug grammar → `.claude/workflow/plan-resolution.md`; Jira status vocabulary → `.claude/skills/management-jira/SKILL.md`; React/TypeScript conventions → `.claude/skills/react-frontend/SKILL.md`; project-wide domain rules → `.claude/rules/`.
- **Commands.** The PowerShell note (chain with `;`, never `&&`) and the verification table, copied from `package.json`: `typecheck`, `lint`, `format:check`, `test`, `build`, plus `npx vitest run <path>` and `npx vitest run -t "<name>"`. Keep all four "not a code defect" failure modes — Vitest watch mode hanging, `npm run dev` never returning, missing `node_modules`, and a TypeScript error in a test file being a collection error rather than a failing test. These are toolchain facts, not game facts.
- **Architecture: the `/fb-*` contract pipeline.** Keep in full, minus the game examples in the pause condition. The pause condition becomes: visual and copy judgement, approving a new dependency, anything needing judgement of the running app, and any tuning or design value that is the developer's to choose.
- **Code conventions.** Point at `.claude/skills/react-frontend/SKILL.md` as the authority. Restate only the toolchain-level rules that survive with no game: strict TypeScript with a stated reason for any `any`; effect cleanup for every listener, observer, timer and `requestAnimationFrame`; no module-level mutable state without an explicit reset; files over 400 lines blocking, measured not estimated; no `memo`/`useMemo`/`useCallback` without profiling evidence; no second state manager; no `console.log`/`console.debug`; Vitest, with the rule that a test is never claimed to pass without being run.
- **Skills.** Glob `.claude/skills/*/SKILL.md` rather than working from a remembered roster. Table: `react-frontend` (anything under `src/`), `management-jira`, `skill-creator`.

Delete the entire **Game domain** section and every reference to `.docs/Game_Rules/`, `rules.json`, M-numbers, `ColourId`, the two-runtime-dependency justification framed around the game, and the Unity migration.

- [x] **Step 2: Verify**

Run: `Select-String -Path CLAUDE.md -Pattern "String Railway|string-railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M17|Game_Rules|Rules\.md|rulebook|transversal|hotseat|station|railway|scoring|Unity"`

Expected: zero hits.

### Task 12: Rewrite `README.md` ✓

- Skill: `none — documentation; no TypeScript is authored in this task`

**Files:**

- Modify: `README.md` — full rewrite (currently 128 lines)

**`README.md` is not in `.prettierignore`**, so it is the one prose file in this contract subject to `npm run format:check`. Prettier settings that matter for markdown here: `printWidth: 100`, `proseWrap` at its default `preserve` (so prose is not rewrapped, but tables are realigned).

- [x] **Step 1: Write the replacement**

Sections to keep, rewritten game-free:

- **Title and one-line description** — the project name from Task 5, described as an empty Vite + React 19 + TypeScript prototype scaffold.
- **Requirements** — Node pinned in `.nvmrc` as the single source, read by `nvm`/`fnm`/`volta` locally and by `actions/setup-node` via `node-version-file` in CI; `engines.node` states the matching floor.
- **Getting started** — `git clone`, `cd`, `nvm use`, `npm ci`, `npm run dev`. Update the clone URL only if the remote changes; it does not change in this contract.
- **The script table** — all nine scripts verbatim from `package.json`: `dev`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`, `preview`. Keep the note that `npm test` runs once and exits while `test:watch` is the watch variant.
- **Pinned versions** — the existing table is accurate; keep react 19.2.8, react-dom 19.2.8, vite 8.2.0, typescript 6.0.3, vitest 4.1.10, eslint 10.8.0, prettier 3.9.6.
- **Project layout** — the post–Phase 3 truth and nothing more: `src/main.tsx`, `src/App.tsx`, `src/styles/global.css`, `src/__tests__/smoke.test.ts`, `public/favicon.svg`. State that the application structure is deliberately undecided.
- **Two inherited constraints** — runtime dependencies are exactly `react` and `react-dom`, a third needs justification and approval; `erasableSyntaxOnly` is on, so `enum` and `namespace` are unavailable and constant maps use the `as const` object form.
- **Continuous integration** — workflow `CI` at `.github/workflows/ci.yml`, on every push and pull request, one `ubuntu-latest` job running `npm ci` → `lint` → `typecheck` → `test` → `build`, requesting `contents: read`.

Delete entirely: **The `src/rules/` boundary**, **Configuration**, **Deployment**, **Base path**, and **Repository visibility**. The first two describe deleted trees; Deployment and Base path describe the workflow Task 7 removes; Repository visibility is written around the rules extraction that Task 8 deletes.

- [x] **Step 2: Verify content and formatting together**

Run: `Select-String -Path README.md -Pattern "String Railway|string-railway|rules\.json|src/rules|Game_Rules|Rules\.md|GitHub Pages|deploy\.yml|hotseat|station|railway"; npm run format; npm run format:check`

Expected: zero `Select-String` hits; `format` rewrites in place; `format:check` exits 0. If `format` reports changes to files other than `README.md`, inspect them before continuing — nothing else in this contract should be unformatted.

### Task 13: Genericise `web-project.md` and `.claude/rules/README.md` ✓

- Skill: `none — documentation; no TypeScript is authored in this task`

**Files:**

- Modify: `.claude/workflow/web-project.md` (150 lines) — layout, boundary section, developer-owned work, traps
- Modify: `.claude/rules/README.md` (40 lines) — the candidate-rules list

These two are the *owners* that Tasks 14 and 15 reference, so they are fixed before their callers.

- [x] **Step 1: Rewrite `web-project.md`**

- **Layout** — the post–Phase 3 tree only. Remove `src/rules/`, `src/ui/`, `src/constants/`, and `public/rules.json` from the diagram; keep `public/` described as the only tree Vite copies into `dist/`. Keep the generated-directories warning (`node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`) and the `package-lock.json` note — both are toolchain facts.
- **The `src/rules/` boundary** — replace the whole section with a short **Architectural boundaries** section stating that this project has no enforced import boundary yet, that the previous prototype enforced a pure-core boundary via an ESLint override, and that `.claude/skills/react-frontend/SKILL.md` carries the paste-back override for when the next prototype has a pure tree. Do not leave a verification grep for a directory that does not exist.
- **Verification commands** — keep the whole table as-is; every command is still correct. Keep the git-not-on-`PATH` row verbatim, it is a live machine fact. Keep all of **Hard constraints on runners** unchanged — Vitest watch mode, `npm run dev`, exit codes, the `Select-String` one-match-per-line trap, TypeScript errors in test files, missing `node_modules`, lint and typecheck being real gates.
- **Developer-owned work** — drop the drag-feel, tuning-value, deck-composition and rulebook-ambiguity bullets. Keep: approving a new dependency, visual and copy judgement, anything needing judgement of the running app, and the full git paragraph (agents may run `init`/`add`/`commit`/`status`/`log`; never `push`/`remote`/`fetch`/`pull`/`clone`; no `gh` CLI installed).
- **Correctness traps** — keep the ones that are toolchain- or React-level: string-bound names outside the compiler's view (config keys, storage keys, `data-testid`, CSS class names, ARIA ids); `NaN` propagating silently from an unguarded divisor; every listener and observer needing its cleanup; StrictMode double-mounting effects in development; module-level mutable state surviving HMR and leaking between tests; stale closures in event handlers. Drop the `ColourId`/`PlayerId`, `Math.random()`-in-setup, arc-length-epsilon, hard-coded-tunable and ref-mutated-drag traps — all four are game-specific.

- [x] **Step 2: Rewrite `.claude/rules/README.md`**

Keep the convention, the "how skills use this folder" snippet, the here-vs-skill-vs-workflow guidance, and the empty index. Replace the three game-specific candidate first rules (saved-game/move-log versioning, determinism and seeding, the `rules.json` schema) with a single honest line: no candidate rules yet, and the folder is correctly empty until the next prototype has domain constraints worth stating once.

- [x] **Step 3: Verify**

Run: `Select-String -Path .claude\workflow\web-project.md,.claude\rules\README.md -Pattern "String Railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M6|M17|Game_Rules|Rules\.md|arc-length|transversal|station|railway|Unity"`

Expected: zero hits.

### Task 14: Genericise the four agents ✓

- Skill: `none — documentation; no TypeScript is authored in this task`

**Files:**

- Modify: `.claude/agents/code-evaluator.md` (111 lines, 11 game references), `defender.md` (112 lines, 13), `implementer.md` (205 lines, 27), `qa.md` (265 lines, 23)

**Developer decision — skip this task and Task 15 if the intent was `.claude/skills/` alone.** See `plan.md` → Risks.

Edit in place rather than rewriting: the structure, the dispatch contract and the review dimensions of all four are sound and generic. Only the examples and checklists are contaminated.

- [x] **Step 1: Strip the game vocabulary from all four agents**

In each file, keep the role definition, the tool list, the output format and the escalation rules unchanged. Replace only:

- Every reference to `.docs/Game_Rules/Rules.md`, a `§` section, or an `M#` decision — delete the sentence, or restate it as "the specification named in the plan" where the surrounding logic needs a referent.
- Every `src/rules/` purity check — restate as "the architectural boundaries named in the plan, if any", since Task 13 removed the enforced one.
- Every `ColourId` / `PlayerId` review item — delete; it has no generic equivalent.
- Every hard-coded-tunable / `rules.json` check — restate generically as "no magic number that belongs in configuration".
- Every drag / geometry / scoring / station example — replace with a neutral example drawn from the agent's own domain (a reducer action, an effect cleanup, an async state).
- In `qa.md`, keep **Step 4.5** and the whole `chrome-devtools` MCP browser-driving procedure intact, including the detached `--port 5199 --strictPort` start and the kill-only-what-you-started rule. It is toolchain machinery, not game machinery. Replace only the game-specific functional checks it gives as examples (does the score read `+2 −1`) with neutral ones (does the page mount, is the console clean, does the interaction commit).

- [x] **Step 2: Verify**

Run: `Select-String -Path .claude\agents\*.md -Pattern "String Railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M6|M17|Game_Rules|Rules\.md|transversal|arc length|station|railway|scoring|deck"`

Expected: zero hits.

### Task 15: Genericise the five `/fb-*` commands ✓

- Skill: `none — documentation; no TypeScript is authored in this task`

**Files:**

- Modify: `.claude/commands/fb-plan.md` (522 lines, 41 game references), `fb-apply.md` (419, 27), `fb-archive.md` (143, 5), `fb-issue.md` (128, 1), `fb-report.md` (138, 3), `CLAUDE.md` (90, 2)

The heaviest task in the contract by volume. As with Task 14, edit in place — the pipeline logic is generic and correct; the examples are not.

- [x] **Step 1: Strip the game vocabulary from all six files**

Preserve without change: the lifecycle, the two-part `plan.md` template and its fourteen required sections, the `tasks.md` phase/task/step shape, the approval gate, the plan-resolution reference, the Jira transition steps, the no-placeholders list, and the cross-file consistency rules. Replace only:

- Every worked example phrased in game terms — `crossesTransversally`, `intersectionEpsilon`, the geometry-core task, the page-7 scoring example, the `350`/`700`/`1400`/`4000`/`120` literal greps in the Final-verification template. Substitute neutral equivalents that keep each example's *shape*: a named exported function, a config key whose value is a developer decision, a literal-scan grep with a placeholder pattern.
- Every `.docs/Game_Rules/Rules.md` citation instruction — restate as "cite the specification the brief names, where one exists".
- Every `src/rules/` reference in the classification section (`fb-plan.md` Step 1.5b) — replace the "Rules-engine code" and "UI code" categories with generic ones: pure logic, UI components, hooks, config and tunables, toolchain and scaffolding, process.
- Every `rules.json` mention in the tuning-value rules — generalise to "a configuration value nobody has chosen is a developer decision, not an assumption". This rule is genuinely valuable and must survive in generic form.
- In `fb-plan.md`'s Final-verification template, replace the `src/rules/` boundary grep task with a neutral placeholder noting that a boundary check belongs here only if the plan established a boundary.
- The `Skill:` guidance that says `react-frontend` is the normal value stays — it is still true after Task 16.

- [x] **Step 2: Verify**

Run: `Select-String -Path .claude\commands\*.md -Pattern "String Railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M6|M17|Game_Rules|Rules\.md|transversal|arc length|station|railway|scoring|deck|geometry"`

Expected: zero hits. `SCRUM` is **allowed** here — the Jira project is real and the transition steps legitimately name it.

Actual: zero hits except three literal `Repo root: E:\Game Dev\StringsAndStations` path lines in `fb-apply.md` (lines 192, 269, 320) — the real absolute repo directory name on this machine, matched only because "Stations" contains "station" as a substring. This is the factual working-directory path dispatched agents need, not game vocabulary, and renaming the repo folder is out of scope for this whole contract. `SCRUM` hits confirmed present only in Jira-transition context across `CLAUDE.md`, `fb-archive.md`, `fb-apply.md`, `fb-plan.md`.

---

## Phase 5 — Rewrite the `react-frontend` skill

A clean-sheet rewrite, per the developer's confirmed choice to load no skills first: the outgoing 211-line `SKILL.md` and its 194-line reference are replaced, not salvaged. The single non-negotiable is the `description:` frontmatter — that line is the trigger text the model matches on, so a description naming String Railway would leave the skill unable to fire for the next prototype. The phase boundary is safe: `.claude/` is Prettier-ignored and contains no source, so no gate is affected.

### Task 16: Rewrite `.claude/skills/react-frontend/SKILL.md` ✓

- Skill: `none — developer override; clean-sheet rewrite without loading the outgoing skill or skill-creator`

**Files:**

- Modify: `.claude/skills/react-frontend/SKILL.md` — replaced in full

- [x] **Step 1: Write the frontmatter**

The `name` stays `react-frontend` — already generic, and the folder is not renamed. Replace `description` so it triggers on generic React work:

```yaml
---
name: react-frontend
description: Apply this project's React 19 + Vite + TypeScript conventions — component structure, hooks, state management, configuration-driven values, and Vitest coverage. Use when building or editing anything under src/, wiring state, rendering UI, or reviewing a frontend change.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell
metadata:
  type: reference
---
```

Note `allowed-tools` changes `Bash` → `PowerShell`: this is a Windows box and `Bash` in agent frontmatter leaves the agent with no working shell.

- [x] **Step 2: Write the body**

Sections, in order:

- **Engineering principles** — keep the existing paragraph; it is entirely generic already.
- **Hard floor (MUST / NEVER)** — carry over only the rules that survive with no game. MUST: read the nearest existing equivalent before writing; route state change through a single reducer where state is non-trivial; measure every file created or grown (`(Get-Content <file> | Measure-Object -Line).Lines`, >400 blocking); one file order (imports → constants → component → helpers → export); extract significant logic into a `use*` hook; declare repeated meaningful values once in `src/constants/` as `UPPER_SNAKE_CASE`; TypeScript strict with a stated reason for any `any`; justify any new dependency out loud; state what was verified and what was not. NEVER: hard-code a value that belongs in configuration; claim a test passed without running it; swallow an error into a success shape (`catch { return [] }`); leave `console.log`/`console.debug` in shipped code; add `memo`/`useMemo`/`useCallback` without profiling evidence; introduce a second state manager; add a backend or remote call without approval; create dumping-ground folders (`misc`, `helpers`, `temp`, `old`, `new`); use `dangerouslySetInnerHTML` without a reviewed justification; introduce debt silently.
- **Use when / Do not use when** — generic triggers: anything under `src/`; wiring state; rendering UI; reviewing a frontend change. Do not use for Jira work (`management-jira`) or anything under `.claude/`.
- **Stack** — React 19 + Vite 8 + TypeScript strict; two runtime dependencies (`react`, `react-dom`) with a third needing approval; Vitest with `environment: 'node'` and `test.include` of `src/**/__tests__/**/*.test.ts`; plain CSS in `src/styles/` and per-component files; `erasableSyntaxOnly` on, so no `enum` and no `namespace`. Prefix the section with the instruction to `Read package.json` before relying on any line, because it drifts.
- **The pure-core boundary (a pattern, not yet enforced)** — this is the section that preserves the deleted mechanism. Explain why a pure, DOM-free logic tree is worth establishing early and expensive to retrofit, then give the paste-back ESLint override verbatim. **Use `src/core/**` as the example glob, never `src/rules/**`** — Step 3's grep fails otherwise, and the next prototype should pick its own name. Note that the override must not strip `globals.browser`, since `no-restricted-globals` only fires on globals ESLint has been told exist, and that the denylist is not exhaustive — `ResizeObserver`, `IntersectionObserver`, `WebSocket`, `postMessage` and `indexedDB` all pass it — so the boundary is review-enforced as well as lint-enforced.
- **React correctness** — the traps that cost real debugging time: every listener, observer, timer, `requestAnimationFrame` and `AbortController` released in its effect's cleanup; StrictMode double-invoking effects in development; module-level mutable state surviving HMR and leaking between tests in one file; stale closures in handlers registered once; pointer capture released on `pointercancel` as well as `pointerup`; never silencing the exhaustive-deps rule.
- **Performance** — work in order and stop when solved: keep high-frequency updates off the reconciler by mutating a ref where a value changes every frame; do incremental rather than whole-collection work per event; only then consider memoisation, with evidence.
- **Accessibility and input** — interactive controls ≥44×44px; `:focus-visible` not bare `:focus`; hover styles wrapped in `@media (hover: hover)` and paired with `:active`; `touch-action: manipulation`; semantic HTML and ARIA, labels on icon-only buttons, focus management in modals, WCAG AA contrast.
- **Testing** — Vitest; specs under `src/**/__tests__/`; pure logic tested without a renderer; component tests query by accessible role and label. State the live constraint: `vite.config.ts` sets `environment: 'node'` and `test.include` matches `*.test.ts` only, so the **first component test must add an environment split** (`environmentMatchGlobs`, or a second Vitest project) and widen the glob to collect `.test.tsx` — flipping the global environment to `jsdom` is the wrong fix.
- **Shared rules (read on demand)** — keep the existing instruction to Glob `.claude/rules/*.md` and Read any matching file, noting the folder is currently empty and must be re-scanned rather than assumed.
- **Success criteria** — the generic, checkable subset: no hard-coded value that belongs in configuration; no file created or grown past 400 lines, measured; `npm test` and `npm run typecheck` clean; no new `console.log`/`console.debug`; no new runtime dependency without justification; interactive controls ≥44px with semantic HTML and `:focus-visible`; any new async surface handles loading, success, error and empty with no `catch` returning a success-shaped fallback.

Delete with no replacement: **Project layout** (it described a deleted tree), **Architecture rules** 1–6 as written, **Geometry and determinism**, **Tutorial copy**, **Known debt**, and the game-specific **Watch for** table.

- [x] **Step 3: Verify the skill is game-free and the trigger line changed**

Run: `Select-String -Path .claude\skills\react-frontend\SKILL.md -Pattern "String Railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M6|M17|Game_Rules|Rules\.md|transversal|arc length|station|railway|scoring|deck|hotseat"`

Expected: zero hits. A hit on `src/rules` specifically means the paste-back override still uses the old glob — change it to `src/core/**`.

Actual: zero hits (one initial hit on the word "scoring" inside a generic example list — "validation, scoring, geometry, parsing" — was reworded to "validation, calculation, parsing" and the grep re-run clean).

- [x] **Step 4: Confirm the frontmatter still parses as a valid skill**

Run: `Get-Content .claude\skills\react-frontend\SKILL.md -TotalCount 8`

Expected: a `---` fence on line 1, `name: react-frontend`, a `description:` line that does not contain "String Railway", `allowed-tools:` naming `PowerShell` and not `Bash`, and a closing `---`.

Confirmed: line 1 is `---`, line 2 is `name: react-frontend`, line 3 is the new generic `description:` line, line 4 is `allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell`, and line 7 closes with `---`.

### Task 17: Rewrite `references/engineering-standards.md` ✓

- Skill: `none — developer override; clean-sheet rewrite`

**Files:**

- Modify: `.claude/skills/react-frontend/references/engineering-standards.md` — replaced in full (194 lines, 22 game references)

- [x] **Step 1: Write the replacement**

This file is the progressive-disclosure half of the skill — the depth a reader loads when scaffolding something new or reviewing a large change. Cover, all game-free:

- **Principles in practice** — readability over cleverness, simplicity over abstraction, consistency over preference, with a concrete before/after for each.
- **Component size budget** — <200 lines fine, 200–400 a second look, >400 blocking; the two split strategies (logic → `use*` hook, render concerns → sibling components) and how to choose.
- **Constants taxonomy** — what belongs in `src/constants/` as an `UPPER_SNAKE_CASE` `as const` map, what belongs in a configuration file the developer owns, and what is a legitimate inline literal. `erasableSyntaxOnly` means the `as const` object form, never `enum`.
- **The four async states** — loading, success, error, empty; why an empty state is not a success state and why a `catch` returning a success-shaped fallback is a defect rather than resilience.
- **Performance order** — measure, then reduce work per event, then keep high-frequency updates off the reconciler, then memoise with evidence. Memoisation last, always.
- **Testing posture** — what is worth a test (behaviour with an invariant) and what is not (implementation detail, framework behaviour); why pure logic tested without a renderer is the cheapest coverage available; querying by accessible role and label in component tests.
- **Definition of Done** — the checklist a change is measured against before it is called finished, including the instruction to state what was verified and what was not.

- [x] **Step 2: Verify**

Run: `Select-String -Path .claude\skills\react-frontend\references\engineering-standards.md -Pattern "String Railway|rules\.json|src/rules|ColourId|PlayerId|MADE UP|M6|M17|Game_Rules|Rules\.md|transversal|station|railway|scoring|deck"`

Expected: zero hits.

Actual: zero hits.

---

## Phase 6 — Final verification

No production changes. Confirms the cumulative work: the game is gone from the tree, no stale reference to a deleted path survives, and all five gates pass on the clean slate.

### Task 18: Confirm the game code and docs are gone ✓

- Skill: `none — verification only`

- [x] **Step 1: Confirm the deleted trees do not exist**

Run: `@('src\rules','src\ui','src\constants','public\rules.json','.docs','.claude\workflow\unity','.github\workflows\deploy.yml') | ForEach-Object { "$_ = $(Test-Path $_)" }`

Expected: `False` for all seven. If Task 7 was skipped by developer decision, `deploy.yml` is `True` and that is correct — note it in the summary rather than deleting it.

Actual: `False` for all seven, verbatim:
```
src\rules = False
src\ui = False
src\constants = False
public\rules.json = False
.docs = False
.claude\workflow\unity = False
.github\workflows\deploy.yml = False
```

- [x] **Step 2: Confirm the surviving source tree is exactly the slate**

Run: `Get-ChildItem src -Recurse -File | Select-Object -ExpandProperty FullName`

Expected: exactly four files — `src\App.tsx`, `src\main.tsx`, `src\styles\global.css`, `src\__tests__\smoke.test.ts`.

Actual: exactly those four, verbatim:
```
E:\Game Dev\StringsAndStations\src\App.tsx
E:\Game Dev\StringsAndStations\src\main.tsx
E:\Game Dev\StringsAndStations\src\styles\global.css
E:\Game Dev\StringsAndStations\src\__tests__\smoke.test.ts
```

- [x] **Step 3: Confirm the contract folders went and this plan survived**

Run: `Get-ChildItem .claude\contract -Directory | Select-Object -ExpandProperty Name`

Expected: exactly three — `2026-08-01-reset-to-clean-prototype-slate`, `archive`, `specs`.

Actual: exactly those three, verbatim:
```
2026-08-01-reset-to-clean-prototype-slate
archive
specs
```

### Task 19: Confirm no stale reference to a deleted path survives ✓

- Skill: `none — verification only`

- [x] **Step 1: Sweep the whole repository for game vocabulary**

Run: `Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.js,*.json,*.md,*.html,*.yml | Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|\\.git\\|package-lock|\\.claude\\contract\\2026-08-01' } | Select-String -Pattern "String Railway|string-railway|src/rules|ColourId|MADE UP|Game_Rules|transversal|hotseat"`

Expected: zero hits. The plan folder is excluded deliberately — `plan.md` and `tasks.md` describe the removal and legitimately name what was removed.

Actual: zero hits — command completed with no output.

- [x] **Step 2: Confirm nothing still points at a deleted file**

Run: `Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.md,*.json,*.yml | Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|\\.git\\|package-lock|\\.claude\\contract\\2026-08-01' } | Select-String -Pattern "rules\.json|\.docs/|workflow/unity|deploy\.yml"`

Expected: zero hits.

Actual: zero hits — command completed with no output.

**Note (not fixed, accepted exception):** the known `Repo root: E:\Game Dev\StringsAndStations` lines in `.claude\commands\fb-apply.md` (reported by Task 15 as matching the substring "station") do not surface in either of the above patterns — neither sweep's pattern list includes a bare `station` term. Confirmed by inspection this is unchanged from Task 15's report and is the real working-directory path handed to isolated-context agents; renaming it is out of scope for this whole contract, per the plan's stated exception.

### Task 20: Static gates, full suite, and production build ✓

- Skill: `none — verification only`

- [x] **Step 1: All four static and test gates** — run by QA, not by the Implementer, per the
  contract's Phase 6 boundary (unfiltered test run belongs to QA alone).

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`

Expected: all four exit 0. Vitest reports `Tests  1 passed (1)` — the smoke spec. `No test files found, exiting with code 1` means Task 3's file is missing or the include glob does not match it.

QA result: all four PASS — `typecheck` exit 0; `lint` exit 0, 0 errors/0 warnings; `format:check`
"All matched files use Prettier code style!"; `test` `Test Files  1 passed (1)` / `Tests  1 passed (1)`.

- [x] **Step 2: Production build** — run by QA, not by the Implementer, per the contract's Phase 6
  boundary.

Run: `npm run build`

Expected: exits 0, `dist/` written, no bundler errors. `build` chains `lint` and `tsc -b` before `vite build`, so this also re-confirms Step 1's first two gates.

QA result: PASS, exit 0, "✓ built in 308ms", `dist/index.html`,
`dist/assets/index-CbmgodH0.css`, `dist/assets/index-PDNcSK7V.js` written. `dist/index.html` title
check: zero hits for "String Railway"; one hit `dist\index.html:7: <title>Prototype</title>`.

- [x] **Step 3: Confirm the built bundle carries the new title, not the old one** — run by QA, not by
  the Implementer, per the contract's Phase 6 boundary.

Run: `Select-String -Path dist\index.html -Pattern "String Railway"; Select-String -Path dist\index.html -Pattern "Prototype"`

Expected: zero hits on the first, at least one on the second. Two separate greps rather than an alternation — `Select-String` reports one match per physical line, and a bundled file is often one line, so an alternation would report whichever came first and read as proof.

QA result: PASS, run as two separate greps in both review rounds. `"String Railway"` → zero hits (no
output). `"Prototype"` → one hit, `dist\index.html:7:    <title>Prototype</title>`.

### Task 21: Write the PR description ✓

- Skill: `none — documentation`

**Files:**

- Create: `.claude/contract/2026-08-01-reset-to-clean-prototype-slate/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder.
- Summary: what was deleted (with counts — 35 + 34 + 4 source files, 18 specs, the tuning surface, 3 docs, 13 contract folders, 12 Unity files) and what survives.
- The recovery path, stated explicitly: everything is at `origin/master` commit `2cf7ec7`, recoverable with `git show origin/master:<path>`; no history was rewritten and no branch was deleted.
- Every decision the developer still owns: the real project name, whether the Pages deploy should return, the nine open SCRUM tickets, and whether the placeholder copy reads right.
- Verification results from Phase 6, quoting the actual gate output rather than asserting it passed.
- A one-line note for future contributors: the pure-core boundary that this repo previously enforced via an ESLint override now lives as a documented pattern in `.claude/skills/react-frontend/SKILL.md`, with a paste-back block, and should be re-established when the next prototype has a pure logic tree.

---

## Self-review

**Spec coverage:**

- Delete `src/rules/`, `src/ui/`, `src/constants/`, `public/rules.json` — Task 1.
- Rewrite `src/App.tsx` as a placeholder; keep `main.tsx` and `global.css` — Task 2.
- Add `src/__tests__/smoke.test.ts` so `npm test` does not exit 1 — Task 3.
- Remove the inert ESLint purity override — Task 4.
- De-game toolchain metadata (`package.json`, `index.html`, `vite.config.ts`, `.prettierignore`) — Tasks 5, 6.
- Delete `.github/workflows/deploy.yml` — Task 7.
- Delete `.docs/` — Task 8.
- Delete the 13 contract folders — Task 9.
- Delete `.claude/workflow/unity/` — Task 10.
- Rewrite `CLAUDE.md` and `README.md` — Tasks 11, 12.
- Genericise `web-project.md` and `.claude/rules/README.md` — Task 13.
- Genericise the four agents and the five commands — Tasks 14, 15.
- Rewrite the `react-frontend` skill and its reference, including the `description:` trigger — Tasks 16, 17.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is either an exact code/content block or a runnable command with `Run:` and `Expected:`. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No step commits, pushes, deletes a branch, or rewrites history. Unfiltered `npm test` and `npm run build` appear only in Phase 6.

**Type / name consistency:** `src/__tests__/smoke.test.ts` is named identically in Tasks 3, 20 and 18. The placeholder name `prototype` / `Prototype` is used consistently in Tasks 5, 12 and 20 Step 3. The game-vocabulary grep pattern is defined once in the Phase 4 preamble and each task's variant is a subset of it. The paste-back ESLint override glob is `src/core/**` in Task 16 and is the reason Task 16 Step 3's grep can require zero `src/rules` hits. `origin/master` commit `2cf7ec7` is quoted identically in the preamble, Task 9 and Task 21.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking, linting and testing green: Task 1's deletion breaks `App.tsx` and empties the suite, and Tasks 2 and 3 repair both inside the same phase, with Task 3 Step 3 running `typecheck` and `lint` as the boundary check.
- **Phase 2** touches only config and metadata; each task ends with its own gate (`lint` in Task 4, greps in Tasks 5–7, `typecheck` in Task 6), and no edit can leave the tree half-consistent.
- **Phase 3** deletes only non-source trees, so every gate holds exactly as it did at the end of Phase 2; Task 9's `SCRUM-*` glob is what keeps the running plan folder intact.
- **Phase 4** touches only Prettier-ignored `.claude/` prose plus `README.md`, whose formatting gate is run inside Task 12; no source file is involved, so all five gates hold throughout.
- **Phase 5** touches only `.claude/skills/`, which is Prettier-ignored and contains no source; gates are unaffected, and Task 16 Step 4 confirms the frontmatter still parses.
- **Phase 6** makes no production change — every step is a `Test-Path`, a `Select-String`, or a gate command.
</content>
