# SCRUM-9 — Set up the GitHub repository and CI

Plan: [`plan.md`](./plan.md) (this folder)
Jira: https://amazerbeam.atlassian.net/browse/SCRUM-9

## Summary

Puts the project under version control and adds a CI workflow that reports whether the
prototype still builds on every push.

- Repository initialised with `git init -b main`.
- `.gitignore` verified **behaviourally** with `git check-ignore -v` against real paths, not
  by reading patterns.
- Line endings normalised at the git layer with `.gitattributes` (`* text=auto eol=lf`), so a
  Windows working tree cannot fail Prettier's `lf` default in CI.
- Node pinned in one place, `.nvmrc` (`24.16.0`), with a guarded `engines.node` floor
  (`>=24.16.0`) in `package.json` that a script asserts cannot diverge from it.
- `.github/workflows/ci.yml` — workflow `CI`, one `verify` job, five named steps
  (install, lint, typecheck, test, build) on every push and pull request, reading the Node
  version from `.nvmrc` via `node-version-file` rather than restating it.
- `README.md` extended: `## Requirements` and `## Getting started` updated in place,
  `## Continuous integration` and `## Repository visibility` appended.
- `.claude/workflow/web-project.md` corrected — the stale "not an agent's to set up unasked"
  git bullet replaced with an accurate agent-may / agent-may-not command split, plus the new
  layout entries, verification-table rows, and the `PATH`-prepend note.
- Exactly one commit made: `b39bbfb`, `67 files changed, 13207 insertions(+)`, author
  `amazerbeam` (see `git log` for the address — deliberately not restated here; see
  "Commit-author email" below).

## Exact commands to run, in order

```powershell
# The PRIVATE repository amazerbeam/string-railway already exists on GitHub and origin is
# already configured to point at it — confirm with: git remote -v
$env:Path = "C:\Program Files\Git\cmd;$env:Path"
git push -u origin main
```

`origin` is already set to `https://github.com/amazerbeam/string-railway.git`; there is no
remote to add, so running `git remote add origin …` here will fail with `error: remote origin
already exists`. If you expected to add it fresh, run `git remote -v` first to see the current
configuration before assuming otherwise.

What each step closes:

- **The private repository already exists on GitHub** — the action half of criterion 7
  (visibility is *recorded*, in `README.md`; the repository itself was already created as
  private).
- **`git push -u origin main`** — the "the default branch is pushed and tracking" half of
  criterion 2, and it is also what makes the Actions workflow run for the first time, which is
  the only way to close criterion 5's "visible on the commit and any pull request" and the
  Actions-schema half of criterion 4 (locally, the workflow file was only proven to be valid
  YAML via `npx prettier --check`, never proven to be a valid GitHub Actions schema).

No `gh` CLI is installed on this machine, and creating a remote repository or pushing to one
publishes content outward — both are the developer's call regardless of what credentials
happen to be configured locally. No agent ran, or was permitted to run, `git remote add`,
`git push`, `git fetch`, `git pull`, or `git clone` at any point in this contract.

## Acceptance criteria — closed here vs. closed only by the push

**Closed by this contract's work:**
- 1 — repository initialised, scaffold + `.docs/` + `.claude/` + `CLAUDE.md` committed.
- 3 — ignore rules verified behaviourally (`git check-ignore -v`) and re-proven after a real
  `npm run build` left the tree clean (see numbers below).
- 4 — **partially.** The workflow authors all five named steps and the four `npm run`
  targets are asserted to exist; only a real push proves the file parses as a valid Actions
  schema, not just valid YAML.
- 6 — `README.md` `## Getting started` now starts from `git clone`, not from an assumed
  checkout.
- 7 — the repository-private decision is recorded in `README.md` `## Repository visibility`,
  with the reasoning.
- 8 — `.nvmrc` is the single source of the Node version; `engines.node` is a guarded floor;
  the workflow reads `.nvmrc` and restates the number nowhere.

**Closed only by the push, above:**
- 2 — **partially.** `origin` is already configured, pointing at
  `https://github.com/amazerbeam/string-railway.git`, and the commit (`b39bbfb`) already exists
  locally. What remains is the push itself — `git push -u origin main` — which is the
  developer's step, per "Exact commands to run, in order" above.
- 5 — the "visible on the commit and any pull request" half. Locally the workflow's *content*
  was checked (no failure-masking, all five commands present); nothing about how GitHub
  renders a run was or could be checked.
- 4 — the Actions-schema half, as above.

**No agent verified a green CI run, because none could — there is no remote and no `gh` CLI
on this machine to query one.**

## Developer decisions and observations (from the plan's File map)

- **Create the private GitHub repository `amazerbeam/string-railway`** — the action half of
  criterion 7. Do not initialise it with a README, `.gitignore`, or licence; this repository
  already has all three and an unrelated initial commit on the remote would force a merge.
- **`git remote add origin https://github.com/amazerbeam/string-railway.git` then
  `git push -u origin main`** — closes criterion 2 in full.
  *Correction to the plan's own reasoning here, found during execution:* the plan states
  `git config credential.helper` is empty. On this machine it is **not** — it returns
  `manager` (Git Credential Manager is configured). The real reason this step stays with the
  developer is that pushing publishes content to a remote, which is an outward-facing action
  the developer must take deliberately, and separately, that no `gh` CLI is installed so no
  agent could create the remote repository even if pushing were in scope. See "Contract
  defects found during execution" below.
- **Confirm the first Actions run is green on the commit, and open one throwaway pull request
  to confirm checks appear on it** — closes criterion 5's "visible on the commit and any pull
  request" and the Actions-schema half of criterion 4. Locally the workflow is only proven to
  be valid YAML, not a valid Actions schema.
- **Node pin `24.16.0` exact vs. a `24` major-only pin** — exact is what criterion 8's "cannot
  diverge" asks for; major-only picks up patch releases automatically. One line in `.nvmrc`
  plus a matching `engines` floor either way.
- **Commit-author email** — commits carry the identity from the global git config (name and
  address are discoverable with `git log`; deliberately not restated here). That trades a
  personal address for the convenience of not reconfiguring identity per-repo, and once
  committed the address enters history permanently. The private-repo setting keeps it visible
  to collaborators only for now, but making the repository public later would expose the
  address across the *entire* history, not just future commits, since removing it at that
  point means rewriting history rather than deleting a file. The developer's decision at
  preflight was to keep the global identity as-is rather than set `git config user.email
  <addr>` inside the repository before the commit was made.
- **Whether `.gitattributes` stays** — no criterion asks for it; it exists because Prettier
  defaults to `lf` and a CRLF working tree fails `format:check` for reasons unrelated to the
  code.
- **Whether to drop lint from the `build` script** to stop `npm run lint` running twice per CI
  run. Doing so weakens SCRUM-8's reading of its own criterion 4, so this contract does not
  change it unilaterally.
- **Whether to SHA-pin `actions/checkout@v5` and `actions/setup-node@v5`** — real
  supply-chain hardening, real maintenance overhead, and adjacent to the ticket's out-of-scope
  "repository automation".
- **Whether to restrict `on: push` to `main`** — would halve runs on same-repo pull requests,
  at the cost of narrowing criterion 4's literal "every push".
- **Whether `CLAUDE.md` lines 11 and 16 get corrected** (they still claim no application
  exists). SCRUM-8 landing falsifies them and SCRUM-8's scope excludes fixing it, so nothing
  currently owns the correction. Out of scope here by choice, not oversight.

## Verification results (Phase 6, this machine, 2026-07-31)

**Task 10.2 — local dry-run of the exact five commands `ci.yml` runs:**
- `npm run lint` — exit 0, zero errors, zero warnings, no output.
- `npm run typecheck` (`tsc -b`) — exit 0, no errors.
- `npm test` (`vitest run`) — exit 0. Quoted verbatim: `Test Files  1 passed (1)`,
  `Tests  1 passed (1)`, duration 146ms. No `Failed to load` / `Transform failed` in the
  output.
- `npm run build` — exit 0. `dist/` written: `dist/index.html` 0.46 kB, one CSS chunk
  2.38 kB, one JS chunk 196.72 kB (gzip 62.12 kB). `build` runs `npm run lint` a second time
  by SCRUM-8's design; no errors on that second pass either.

**Task 10.3 — nothing untracked that should be ignored, proven after the build above:**
- `git status --porcelain` (excluding `.claude/contract/`) — **no output**; the tree is clean
  immediately after `dist/` was written.
- `git check-ignore -v dist node_modules coverage .vite` — all four resolved:
  `.gitignore:11:dist`, `.gitignore:10:node_modules`, `.gitignore:32:coverage`,
  `.gitignore:35:.vite`.
- `git ls-files | Measure-Object -Line` — **67** tracked files (same count as the initial
  commit's `67 files changed`, confirming nothing has been added or removed since). Zero hits
  from the pattern `^node_modules/|^dist/|^coverage/|\.env|settings\.local\.json|\.tsbuildinfo`.

**Task 10.4 — Node pin consistency:**
- `.nvmrc=24.16.0  engines.node=>=24.16.0` → `CONSISTENT`, exit 0.
- `24.16.0` appears in `.nvmrc` and `README.md` only — zero hits in
  `.github/workflows/ci.yml`.
- All four script names (`lint`, `typecheck`, `test`, `build`) resolve via `npm pkg get`.

**Task 10.1 and 10.5 — regression checks:**
- `src/rules/` boundary grep (React/DOM/`localStorage` references) — zero hits, and a real
  file exists under `src/rules/` for the pattern to have matched against
  (`src/rules/__tests__/scaffold.test.ts`).
- `.claude/workflow/web-project.md` — the stale "not an agent's to set up unasked" bullet is
  gone (zero hits); `.nvmrc` and `ci.yml` are both recorded. `credential\.helper` (with the
  literal dot) returns zero hits, which is **correct and expected** — Phase 4 deliberately
  wrote the accurate replacement wording instead of that false claim, and it is present at
  line 120 ("Pushing publishes content to a remote — an outward-facing action... even though
  a credential helper happens to be configured on this machine. No `gh` CLI is installed...").

**Commit:** `b39bbfb` — `Initialise repository with the scaffolded prototype and CI` —
`67 files changed, 13207 insertions(+)`.

## New conventions for future contributors

- Git is invoked with an explicit `PATH` prepend
  (`$env:Path = "C:\Program Files\Git\cmd;$env:Path"`) because `git` is installed but not on
  this shell's `PATH`, and PowerShell shell state does not persist between tool invocations —
  every git-touching step repeats the prepend rather than assuming an earlier one is still in
  effect.
- `.nvmrc` is the single source of the Node version. Both the local version manager
  (`nvm use` / `fnm use` / `volta`) and CI (`actions/setup-node` via `node-version-file`) read
  the same file — never add a second copy of the version number anywhere, including the
  workflow.
- An agent may run `git init`, `add`, `commit`, `status`, `check-ignore`, `check-attr`,
  `ls-files`, and `log` in this repository. It may never run `push`, `remote add`, `fetch`,
  `pull`, or `clone` — those publish or pull from a remote and are the developer's call every
  time, not a one-off exception for this contract.

## Contract defects found during execution

Concrete items for `/fb-issue` to work from — none were fixed at their source by this
contract because doing so was out of scope for a documentation/verification phase, but all are
worked around and none blocks the deliverable:

1. **`git config credential.helper` is not empty.** `plan.md` and `tasks.md` both assert it
   is; on this machine it returns `manager` (Git Credential Manager is configured). Phase 4
   wrote the accurate reason into `web-project.md` instead of repeating the false claim: no
   `gh` CLI is installed for repository creation, and pushing is an outward-facing action that
   stays the developer's call regardless of what credentials are present.
2. **`init.defaultBranch` is `master` on this machine**, not "unset" as `plan.md` states.
   Phase 4 recorded the corrected wording. This made passing `-b main` to `git init` matter
   more, not less.
3. **Task 4 Step 2's `Expected:` line is wrong for `Rules.pdf`.** It predicts
   `eol: unspecified`; the real answer is `eol: lf`, because the `binary` macro expands to
   `-diff -merge -text` and does not clear `eol`. No practical effect — git only performs
   line-ending conversion when `text` is set, and here it is explicitly unset.
4. **Task 8 Step 5's grep pattern over-escapes backslashes** (`Program Files\\Git`, matched
   against single-backslash text in the file) and cannot match as written. Re-verified with a
   working single-backslash pattern instead.
5. **Phase 2 changed `.gitignore`'s `.vite/` to `.vite`** (dropping the trailing slash)
   because the directory-only pattern did not satisfy Task 3 Step 4's own verification
   command against a non-existent bare path. This diverged from `plan.md` Part 2's stated data
   shape. Fixed in the review pass: the pattern is reverted to `.vite/` and Task 3 Step 4's
   command now queries `.vite/` (trailing slash) instead of a bare path, which is what actually
   proves a directory-only pattern.
6. **The first push went to the wrong repository.** `origin` was initially pointed at
   `amazerbeam/StringsAndStations`, not `amazerbeam/string-railway`; that repository was
   private throughout, so nothing was exposed. The remote has since been repointed to
   `string-railway`, the stale remote-tracking refs were cleared, and `StringsAndStations` is
   being deleted. `README.md` and this file's clone URL already named `string-railway`, so no
   documentation change was needed — they now agree with the configured remote.
