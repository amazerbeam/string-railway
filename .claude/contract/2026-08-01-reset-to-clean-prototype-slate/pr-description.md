# Reset the project to a clean prototype slate

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

Strips String Railway out of this repository so the next prototype starts from a working,
game-free web toolchain rather than from someone else's dead game.

**Deleted:**

- `src/rules/` — 35 files (17 modules, 17 specs, `fixtures.ts`)
- `src/ui/` — 34 files (16 components with their CSS, 5 hooks, 1 spec)
- `src/constants/` — 4 files
- 18 `*.test.ts` files in total, across the two trees above
- `public/rules.json` — the entire tuning surface
- `.docs/` — 3 files (`Game_Rules/Rules.pdf`, `Game_Rules/Rules.md`, `Unity_Migration.md`)
- 13 `.claude/contract/SCRUM-*` folders (all 13 named in the plan were present on disk)
- `.claude/workflow/unity/` — 12 files (`CLAUDE.md`, `README.md`, `agents/` ×4, `commands/` ×5, `workflow/unity-project.md`)
- `.github/workflows/deploy.yml`
- the inert `src/rules/**` + `src/constants/**` ESLint purity override in `eslint.config.js`

**What survives:**

- The build system — Vite, TypeScript (strict), ESLint, Prettier, Vitest, the `ci.yml` workflow
- `src/main.tsx`, `src/styles/global.css` (unchanged)
- `src/App.tsx` — rewritten as a dependency-free placeholder (`<h1>Prototype</h1>` + one line of prose)
- `src/__tests__/smoke.test.ts` — new, keeps `npm test` from exiting 1 on an empty suite
- `package.json` (name → `prototype`), `index.html` (`<title>` → `Prototype`), `vite.config.ts` (comment
  reworded, `base: './'` value unchanged), `.prettierignore` (stale `.docs` entry dropped)
- `CLAUDE.md` and `README.md` — full rewrites, game-free
- `.claude/workflow/web-project.md`, `.claude/rules/README.md` — genericised
- The four agents (`code-evaluator`, `defender`, `implementer`, `qa`) and the five `/fb-*` commands
  plus `.claude/commands/CLAUDE.md` — genericised in place
- `.claude/skills/react-frontend/SKILL.md` and `references/engineering-standards.md` — clean-sheet
  rewrites, including the `description:` trigger line that the skill-matcher reads

## Recovery path

Nothing here is unrecoverable. `HEAD` = `master` = `origin/master` = commit `2cf7ec7` at planning
time, working tree clean, pushed to `https://github.com/amazerbeam/string-railway`. **No git history
was rewritten and no branch was deleted** — this contract never ran `push`, `remote`, `fetch`, `pull`,
`clone`, or any history-rewriting command. Recover any deleted file with:

```
$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git show origin/master:<path>
```

The one folder that is **not** recoverable this way is
`.claude/contract/2026-08-01-reset-to-clean-prototype-slate/` itself (this plan), because it is newer
than the last commit and was never pushed.

## Decisions the developer still owns

- **The real project name.** `package.json` `name` and `index.html` `<title>` currently land as the
  neutral placeholders `prototype` / `Prototype`. Substitute the real name whenever it's chosen.
- **Whether the GitHub Pages deploy should return.** `.github/workflows/deploy.yml` was deleted this
  run (confirmed instruction, not the plan's alternate "skip Task 7" branch). The existing published
  site at `https://amazerbeam.github.io/string-railway/` stays up but goes stale. Restoring the
  workflow is a one-file `git show` away if publishing should resume.
- **The nine open SCRUM tickets** describing a prototype that no longer exists in this repo. This
  contract does not touch Jira — they are untouched and still open.
- **Whether the placeholder page reads as "nothing built here yet" rather than "something is
  broken."** Automation can confirm it mounts cleanly; the copy call is the developer's.
- (Also still open from `plan.md`'s own list: whether the ESLint pure-core boundary should be
  re-pointed at a real module now rather than left as a documented pattern, and whether the four
  agents / five commands genericisation — the largest scope call in the plan — matches what was
  actually intended by "skills too.")
- **Outstanding manual browser check.** QA's `chrome-devtools` MCP session was blocked for this
  entire run — every launch attempt reported the managed browser profile already in use, with no
  stale lock file to explain it. This is an MCP tooling limitation, not a defect in the work: QA
  substituted direct HTTP probes against the developer's already-running dev server on port 5173,
  which confirmed `GET /` returns 200 with `<title>Prototype</title>` and `<div id="root">`, that
  `GET /src/App.tsx` transforms cleanly and renders `<h1>Prototype</h1>` and `<p>Empty slate.
  Nothing is built here yet.</p>` importing only the JSX runtime (no dangling import), and that
  `favicon.svg` returns 200. What that substitute cannot cover is the browser console. The developer
  should: run `npm run dev`, open `http://localhost:5173/`, confirm the page shows "Prototype" and
  "Empty slate. Nothing is built here yet.", and confirm the DevTools console is empty.

## Verification results (Phase 6)

### Task 18 — game code and docs are gone

**Step 1** — `Test-Path` on all seven deleted trees, verbatim output:

```
src\rules = False
src\ui = False
src\constants = False
public\rules.json = False
.docs = False
.claude\workflow\unity = False
.github\workflows\deploy.yml = False
```

**Step 2** — `Get-ChildItem src -Recurse -File`, verbatim output:

```
E:\Game Dev\StringsAndStations\src\App.tsx
E:\Game Dev\StringsAndStations\src\main.tsx
E:\Game Dev\StringsAndStations\src\styles\global.css
E:\Game Dev\StringsAndStations\src\__tests__\smoke.test.ts
```

Exactly the four files the slate should contain.

**Step 3** — `Get-ChildItem .claude\contract -Directory`, verbatim output:

```
2026-08-01-reset-to-clean-prototype-slate
archive
specs
```

Exactly the three folders expected — the 13 `SCRUM-*` folders are gone and this plan's own folder
survived.

### Task 19 — no stale reference to a deleted path

**Step 1** — repo-wide sweep for game vocabulary (`String Railway|string-railway|src/rules|ColourId|MADE UP|Game_Rules|transversal|hotseat`),
excluding `node_modules`, `dist`, `.git`, `package-lock.json`, and this plan folder: **zero hits**
(command completed with no output).

**Step 2** — sweep for references to deleted files (`rules\.json|\.docs/|workflow/unity|deploy\.yml`),
same exclusions: **zero hits** (command completed with no output).

**Accepted exception, not fixed:** the known `Repo root: E:\Game Dev\StringsAndStations` lines in
`.claude/commands/fb-apply.md`, previously flagged in Task 15's own verification because "Stations"
contains the substring "station". Neither of the two grep patterns above includes a bare `station`
term, so they do not resurface here either way. This is the real absolute working-directory path
handed to isolated-context agents on this machine, not leftover game vocabulary — renaming it is out
of scope for the whole contract, per the plan.

### Task 20 — static gates, full suite, production build

**Run by QA, not by this phase.** Per the contract's Phase 6 boundary, the unfiltered `npm test` and
`npm run build` — along with `npm run typecheck`, `npm run lint`, and `npm run format:check` in this
same task — belong to QA alone, once, at the end of the whole `/fb-apply` run. This document does not
fabricate their output. Slots below are QA's to fill directly from what it observes running the gates:

- `npm run typecheck` — QA result: PASS, exit 0
- `npm run lint` — QA result: PASS, exit 0, 0 errors, 0 warnings
- `npm run format:check` — QA result: PASS, "All matched files use Prettier code style!"
- `npm test` (unfiltered) — QA result, expected `Tests  1 passed (1)` from the smoke spec: PASS,
  `Test Files  1 passed (1)` / `Tests  1 passed (1)`
- `npm run build` — QA result, expected `dist/` written with no bundler errors: PASS, exit 0,
  "✓ built in 308ms", `dist/index.html`, `dist/assets/index-CbmgodH0.css`, and
  `dist/assets/index-PDNcSK7V.js` written
- `dist/index.html` title check (`String Railway` zero hits, `Prototype` at least one hit) — QA
  result: PASS, zero hits for "String Railway"; one hit: `dist\index.html:7: <title>Prototype</title>`

## Note for future contributors

The pure-core boundary this repo previously enforced via an ESLint `no-restricted-imports` +
`no-restricted-globals` override is not gone — it now lives as a documented pattern, with a
paste-back block using `src/core/**` as the example glob, in
`.claude/skills/react-frontend/SKILL.md`. Re-establish it for real once the next prototype has a pure
logic tree worth keeping DOM-free.
