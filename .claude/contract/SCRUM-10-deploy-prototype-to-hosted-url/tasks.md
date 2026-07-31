# Tasks: Deploy the prototype to a hosted URL for play-testing

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-07-31

**Goal:** Make the repository publish itself — a deployment-location-agnostic build, a visible commit indicator, a `rules.json` fetch that proves the base path resolves, a `noindex` access posture, and a GitHub Actions workflow that publishes to GitHub Pages on every push to `master`, so the placeholder shell goes live now and every later story reaches play-testers by merging.

**Spec:** `plan.md` in this folder.

---

## Entry conditions — re-verified 2026-07-31, after the developer completed SCRUM-9

**Condition 1 — SCRUM-9's artefacts: SATISFIED.** `.nvmrc` (`24.16.0`), `.gitattributes`, `.github/workflows/ci.yml`, and the README's `## Continuous integration` and `## Repository visibility` sections all exist. The repository has two commits (`b39bbfb`, `4247e62`) and `origin` points at `https://github.com/amazerbeam/string-railway.git`. Task 1 re-asserts all of this rather than trusting this note.

**Condition 2 — the GitHub account plan: STILL THE DEVELOPER'S TO CONFIRM.** SCRUM-9's `## Repository visibility` section commits the repository to being private, and GitHub Pages publishes from a **private** repository only on **Pro, Team, or Enterprise Cloud — not on Free**. If the repository is private on a Free plan, the workflow this contract writes will run green and publish nothing. Check `github.com/settings/billing`. If it is Free, decide between upgrading, making the repository public (which SCRUM-9 argues against on copyright grounds), or moving to Netlify or Vercel — only Tasks 9 and 10 would change, because everything under `src/` and `vite.config.ts` is host-agnostic by design.

**Condition 3 — the branch name.** The working branch is **`master`**, and it tracks `origin/master`. The remote also carries a stale `origin/main` holding only the initial commit, and GitHub's default branch pointer (`origin/HEAD`) still targets it. `master` is **1 commit ahead of `main` with zero divergence**, so nothing is stranded on `main`.

This contract triggers the deploy on **`master`**, per the developer's instruction on 2026-07-31: *"when I push into master a new build will show"*. A workflow's `on.push.branches` filter is independent of which branch GitHub calls default, so this works as-is with no settings change. The stale `origin/main` is left alone by this contract — deleting it and repointing the default branch is tidy-up the developer may want, but it is not required for the deploy to work, and doing it silently could break anything already pointing at `main`.

---

## Runner note — git is not on `PATH`

Carried from SCRUM-9. `Get-Command git` finds nothing in this shell, but `C:\Program Files\Git\cmd\git.exe` exists. PowerShell shell state does **not** persist between tool calls, so every step invoking git opens with this prepend, repeated verbatim rather than assumed from an earlier step:

```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"
```

Chain with `;`, never `&&`. Backslash paths for filesystem arguments; forward slashes inside npm script names and Vitest filters.

---

## File map

**Created:**
- `src/vite-env.d.ts` — ambient declaration merging `VITE_COMMIT_SHA` and `VITE_BUILD_TIME` into `ImportMetaEnv`
- `src/ui/configUrl.ts` — `CONFIG_FILENAME` and the pure `resolveConfigUrl(baseUrl)` join
- `src/ui/__tests__/configUrl.test.ts` — Vitest spec for the join, five cases
- `src/ui/useConfigProbe.ts` — the one-shot `rules.json` fetch hook, four async states, `AbortController` cleanup
- `src/ui/BuildInfo.tsx` — footer rendering the commit indicator and the probe state
- `src/ui/BuildInfo.css` — plain CSS for that footer, matching the `AppShell.tsx` / `AppShell.css` pair
- `public/robots.txt` — crawler exclusion, defence in depth
- `.github/workflows/deploy.yml` — build-and-publish to GitHub Pages on push to `master`
- `.claude/contract/SCRUM-10-deploy-prototype-to-hosted-url/pr-description.md` — developer handoff, written in Final verification

**Modified:**
- `vite.config.ts:5` — add `base: './'` inside `defineConfig`. No change to `plugins` or `test`
- `index.html:6` — add one `<meta name="robots" content="noindex, nofollow" />` line. `href="/favicon.svg"` at `:5` is left alone; Vite rewrites it per `base`
- `src/ui/AppShell.tsx` — one import and one `<BuildInfo />` element
- `README.md` — append one `## Deployment` section after the last existing section

**Deleted:** *(none)*

**Developer decides or observes:**
- **The GitHub account plan** — `github.com/settings/billing`. Pages from a private repository needs Pro/Team/Enterprise. Check before Phase 1; see Entry conditions.
- **Publishing the repository** from GitHub Desktop, creating the remote and pushing `main`. `gh` is not installed on this machine, so there is no CLI path.
- **Enabling Pages** — repository Settings → Pages → Source: **GitHub Actions**. The workflow cannot deploy until this is set.
- **The live URL** — unknown until the first successful deploy. Add it to the README's `## Deployment` section and as a comment on SCRUM-10 (AC7). No placeholder URL is committed.
- **Whether the deployed footer reads acceptably** — the short SHA, the timestamp, and the `rules.json v1 — no tuning values set yet` line, at both light and dark `color-scheme`. Visual judgement.
- **AC1 stays false on completion** — no 4-player game exists to play. Worth a comment on SCRUM-10 so the criterion is knowingly deferred rather than quietly failed.
- **AC6 is obscurity, not authentication** — anyone with the URL gets in. Confirm that is acceptable, or accept a cost and revisit.
- **`src/ui/__tests__/` is a new test location** for this project; `CLAUDE.md` defaults tests to `src/rules/__tests__/`. Confirm the precedent.
- **`base: './'` bets on this staying a single view with no router.** If a router is expected, say so — the design switches to a `BASE_PATH` environment variable.

*(No `rules.json` value is added, read for its value, or chosen by this contract.)*

---

## Phase 1 — Preflight and the deployment base path

Establishes that the SCRUM-9 artefacts this contract consumes actually exist, then makes the build deployment-location agnostic. The base-path change is one line and is verified here by `npm run typecheck` only — proving it in the built output requires a production build, which `.claude/workflow/web-project.md` reserves for Final verification, so the `dist/` audit lives in Task 11.5. The phase boundary is clean: `vite.config.ts` type-checks and no source file has changed.

### Task 1: Preflight — confirm dependencies and the SCRUM-9 artefacts this contract consumes

- Skill: `none` — verification only; no file is created or modified

**Files:**
- *(no file is written by this task)*

- [ ] **Step 1: Confirm dependencies are installed**

Run: `Get-ChildItem node_modules -ErrorAction SilentlyContinue | Select-Object -First 1`
Expected: one directory entry is printed. If nothing is printed, run `npm ci` and repeat before continuing — a missing `node_modules` surfaces later as `'vite' is not recognized`, which reads like a defect and is not one.

- [ ] **Step 2: Confirm `.nvmrc` exists — the workflow in Task 9 reads it**

Run: `Get-ChildItem .nvmrc; Get-Content .nvmrc`
Expected: the file exists and holds a bare version such as `24.16.0` with no `v` prefix. **If it does not exist, stop the contract and mark it `BLOCKED`** — SCRUM-9 Task 5 owns this file, and inventing it here would create a second source of the Node version, which is exactly what SCRUM-9 criterion 8 forbids.

- [ ] **Step 3: Confirm the repository has at least one commit and report whether a remote exists**

Run:
```powershell
$env:Path = "C:\Program Files\Git\cmd;$env:Path"
git log --oneline -1
git remote -v
```
Expected: `git log` prints one commit line. **If it prints `does not have any commits yet`, stop and mark the contract `BLOCKED`** — SCRUM-9 Task 9 owns the initial commit. `git remote -v` printing nothing is expected and is *not* blocking: adding the remote is developer work in GitHub Desktop, and every task in this contract is verified locally.

- [ ] **Step 4: Confirm the two script names the deploy workflow will invoke**

Run: `npm pkg get scripts.build scripts.test`
Expected: prints `{"scripts.build":"npm run lint && tsc -b && vite build","scripts.test":"vitest run"}`. If either name differs, use the name printed here in Task 9 rather than the one written there — `package.json` is the authority. Note that `build` already chains `lint` and `tsc -b`, which is why Task 9 does not add separate lint and typecheck steps.

### Task 2: Set a deployment-location-agnostic base path in `vite.config.ts`

- Skill: `react-frontend` — owns `vite.config.ts`; read it plus `references/engineering-standards.md` before editing. This task adds no dependency, so the two-runtime-dependency rule is untouched and `package-lock.json` is not modified

**Files:**
- Modify: `vite.config.ts:5`
- Config: `vite.config.ts` — add the `base` key (no M-number; a bundler base path is a deployment setting, not a game tunable, and does not belong in `rules.json`)

- [ ] **Step 1: Add the `base` key as the first entry inside `defineConfig`**

Vite's default is `/`, which bakes root-absolute URLs into `dist/index.html` and every emitted asset reference. Served from `https://<owner>.github.io/<repo>/` each one 404s. `'./'` is correct at any depth on any host.

Replace:
```ts
export default defineConfig({
  plugins: [react()],
```
with:
```ts
export default defineConfig({
  // AC4 (SCRUM-10): relative base, so the bundle is correct under a GitHub Pages
  // project path, a Netlify or Vercel root, and `npm run preview` alike. Safe only
  // while this is a single view with no router — see README, "Deployment".
  base: './',
  plugins: [react()],
```

Do not touch `plugins` or the `test` block. `environment: 'node'` and the `include` glob stay exactly as they are — flipping the environment would silently un-enforce the `src/rules/` boundary, and that debt belongs to whichever story needs a real component test.

- [ ] **Step 2: Confirm the config still compiles**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — The build indicator and the `rules.json` probe

Adds everything AC5 and AC8 need, in dependency order: the environment typing, then the pure URL join with its spec, then the hook that uses it, then the component that renders both. Each task ends type-checking with its consumer already present or not yet written, so no phase-internal step leaves a dangling import. The phase boundary is clean — the footer renders, the suite passes, and nothing under `src/rules/` has been touched.

### Task 3: Type the two build-time environment variables in `src/vite-env.d.ts`

- Skill: `react-frontend` — governs everything under `src/`; strict TypeScript, and an `any` needs a stated reason

**Files:**
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create the ambient declaration file**

`vite/client`'s `ImportMetaEnv` carries an index signature, so reading `import.meta.env.VITE_COMMIT_SHA` without this file yields `any`. Declaration merging is cheaper than justifying an `any`. Both members are optional because a local `npm run build` sets neither — that is a type-level fact rather than a runtime surprise.

The file must contain **no top-level `import` or `export`**, or it stops being an ambient declaration and the merge silently does nothing.

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full commit SHA the build came from. Set by .github/workflows/deploy.yml; undefined in a local build. */
  readonly VITE_COMMIT_SHA?: string
  /** ISO 8601 timestamp of the deploying workflow run. Set by .github/workflows/deploy.yml; undefined in a local build. */
  readonly VITE_BUILD_TIME?: string
}
```

- [ ] **Step 2: Confirm the declaration compiles and merges**

Run: `npm run typecheck`
Expected: exits 0, no errors reported. A `Duplicate identifier 'ImportMetaEnv'` error means the file was written as a module — remove any `import`/`export` line.

### Task 4: Add the pure config-URL join at `src/ui/configUrl.ts`, test first

- Skill: `react-frontend` — pure TypeScript under `src/`, Vitest coverage required for anything with an invariant

**Files:**
- Create: `src/ui/configUrl.ts`
- Test: `src/ui/__tests__/configUrl.test.ts`

- [ ] **Step 1: Write the failing spec**

A wrong join — a doubled or a missing slash — is exactly the silent 404 AC5 exists to catch, and it is the one part of this feature with a testable invariant. The file is pure and DOM-free, so it runs under the existing `environment: 'node'` config with no change; the Vitest `include` glob is `src/**/__tests__/**/*.test.ts`, so `src/ui/__tests__/` is collected today.

```ts
import { describe, expect, it } from 'vitest'
import { CONFIG_FILENAME, resolveConfigUrl } from '../configUrl'

describe('resolveConfigUrl', () => {
  it('resolves the relative base Vite emits for a project-path deployment', () => {
    expect(resolveConfigUrl('./')).toBe('./rules.json')
  })

  it('resolves a root-served base', () => {
    expect(resolveConfigUrl('/')).toBe('/rules.json')
  })

  it('resolves a named sub-path base without doubling the slash', () => {
    expect(resolveConfigUrl('/string-railway/')).toBe('/string-railway/rules.json')
  })

  it('adds the separator when the base has no trailing slash', () => {
    expect(resolveConfigUrl('/string-railway')).toBe('/string-railway/rules.json')
  })

  it('returns the bare filename for an empty base rather than a root-absolute path', () => {
    expect(resolveConfigUrl('')).toBe(CONFIG_FILENAME)
  })
})
```

- [ ] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/ui/__tests__/configUrl.test.ts`
Expected: the run fails. The failure must be a **resolution error** naming `../configUrl` — "Failed to load" or "Cannot find module". A different failure means the spec itself is wrong; fix it before writing the implementation.

- [ ] **Step 3: Implement the module**

The empty-base guard is the case worth having: falling through to the trailing-slash branch would return `/rules.json`, a root-absolute path, which is the precise failure AC4 forbids.

```ts
/** The tuning surface's filename under public/. Bound by string to public/rules.json. */
export const CONFIG_FILENAME = 'rules.json'

/**
 * Join Vite's BASE_URL to the config filename without doubling or dropping a slash.
 * AC4/AC5 (SCRUM-10): a wrong join is a silent 404 on the deployed site.
 */
export function resolveConfigUrl(baseUrl: string): string {
  if (baseUrl === '') return CONFIG_FILENAME
  return baseUrl.endsWith('/') ? `${baseUrl}${CONFIG_FILENAME}` : `${baseUrl}/${CONFIG_FILENAME}`
}
```

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/ui/__tests__/configUrl.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  5 passed` and exits 0; `npm run typecheck` exits 0 with no errors.

### Task 5: Add the `rules.json` probe hook at `src/ui/useConfigProbe.ts`

- Skill: `react-frontend` — read `references/engineering-standards.md` "Four async states" (lines 97-108) and "never swallow an error into a success shape" (line 113); both are what this task is judged against

**Files:**
- Create: `src/ui/useConfigProbe.ts`

- [ ] **Step 1: Write the hook**

A discriminated union of string literals rather than an `enum` — `erasableSyntaxOnly` is on (`tsconfig.app.json:23`). File order is imports → constants → component → helpers → export. The `signal.aborted` guard is load-bearing: `main.tsx:7` wraps the app in `StrictMode`, so in development the effect mounts, cleans up, and mounts again — the first fetch aborts, and an `AbortError` from a teardown is not a load failure and must not render one.

This is a deployment smoke check, **not** the config loader. It reads `configVersion` and whether the two sections hold entries; it validates no deck total, no positive length, no long-versus-short comparison. Those belong to the configuration story, which should absorb this file rather than extend it.

```ts
import { useEffect, useState } from 'react'
import { resolveConfigUrl } from './configUrl'

export type ConfigProbeState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly configVersion: number }
  | { readonly status: 'empty'; readonly configVersion: number }
  | { readonly status: 'error'; readonly message: string }

const LOADING: ConfigProbeState = { status: 'loading' }

/**
 * Fetches rules.json once from the deployment base path and reports which of the four
 * async states applies (AC5, SCRUM-10). Never returns a defaulted config: a failed load
 * renders as an error, because playing with constants nobody chose corrupts every
 * play-test conclusion drawn from the session.
 */
export function useConfigProbe(): ConfigProbeState {
  const [state, setState] = useState<ConfigProbeState>(LOADING)

  useEffect(() => {
    const controller = new AbortController()
    const url = resolveConfigUrl(import.meta.env.BASE_URL)

    async function probe(): Promise<void> {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          setState({ status: 'error', message: `${url} returned HTTP ${response.status}.` })
          return
        }
        setState(readProbeState(await response.json(), url))
      } catch (cause) {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: `${url} could not be loaded: ${describeCause(cause)}` })
      }
    }

    void probe()
    return () => controller.abort()
  }, [])

  return state
}

function readProbeState(body: unknown, url: string): ConfigProbeState {
  if (typeof body !== 'object' || body === null) {
    return { status: 'error', message: `${url} did not contain a JSON object.` }
  }
  const record = body as Record<string, unknown>
  const { configVersion } = record
  if (typeof configVersion !== 'number') {
    return { status: 'error', message: `${url} has no numeric configVersion.` }
  }
  if (countEntries(record.geometry) + countEntries(record.deck) === 0) {
    return { status: 'empty', configVersion }
  }
  return { status: 'success', configVersion }
}

function countEntries(section: unknown): number {
  return typeof section === 'object' && section !== null ? Object.keys(section).length : 0
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
```

`body as Record<string, unknown>` is a narrowing cast after an explicit `typeof` guard, not an `any` — nothing here needs an `any` justification.

- [ ] **Step 2: Confirm it compiles and lints**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `react-hooks/exhaustive-deps` must not warn — the effect closes over nothing reactive, since `import.meta.env.BASE_URL` is substituted at build time.

- [ ] **Step 3: Confirm no DOM or React reference leaked into `src/rules/`**

This task adds `fetch` and a React import, both of which `eslint.config.js:38-63` denies under `src/rules/`. Confirm they landed in `src/ui/` where they belong.

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|fetch\("`
Expected: zero hits.

### Task 6: Add `src/ui/BuildInfo.tsx` and `BuildInfo.css`, and wire them into `AppShell.tsx`

- Skill: `react-frontend` — components render UI and hooks hold logic; plain CSS per component; accessible markup; measure the file before declaring it done

**Files:**
- Create: `src/ui/BuildInfo.tsx`, `src/ui/BuildInfo.css`
- Modify: `src/ui/AppShell.tsx:1-13`

- [ ] **Step 1: Write `src/ui/BuildInfo.tsx`**

Both `VITE_*` reads fall back to a literal that is *true of a local build* rather than a fabricated SHA. `verbatimModuleSyntax` is on (`tsconfig.app.json:14`), so the type import must use `import type` or the build fails. `describeConfig` is deliberately not exported — `reactRefresh.configs.vite` flags a file that exports both a component and a non-component.

```tsx
import type { ConfigProbeState } from './useConfigProbe'
import { useConfigProbe } from './useConfigProbe'
import './BuildInfo.css'

const UNKNOWN_COMMIT = 'local'
const UNKNOWN_TIME = 'not recorded'
const SHORT_SHA_LENGTH = 7

function BuildInfo() {
  const config = useConfigProbe()
  const commit = import.meta.env.VITE_COMMIT_SHA
  const buildTime = import.meta.env.VITE_BUILD_TIME

  return (
    <footer className="build-info" aria-label="Build and configuration status">
      <span className="build-info__item">
        Build <code>{commit ? commit.slice(0, SHORT_SHA_LENGTH) : UNKNOWN_COMMIT}</code>
      </span>
      <span className="build-info__item">Built {buildTime ?? UNKNOWN_TIME}</span>
      <span className={config.status === 'error' ? 'build-info__error' : 'build-info__item'}>
        {describeConfig(config)}
      </span>
    </footer>
  )
}

function describeConfig(config: ConfigProbeState): string {
  switch (config.status) {
    case 'loading':
      return 'Checking rules.json…'
    case 'success':
      return `rules.json v${config.configVersion} loaded`
    case 'empty':
      return `rules.json v${config.configVersion} — no tuning values set yet`
    case 'error':
      return config.message
  }
}

export default BuildInfo
```

- [ ] **Step 2: Write `src/ui/BuildInfo.css`**

`src/styles/global.css:2` declares `color-scheme: light dark` and sets no colours, so the UA supplies them. Never hard-code a colour that fails contrast in one scheme — `currentColor` inherits correctly, and `light-dark()` pairs with the existing declaration for the one case that needs its own colour.

```css
.build-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid currentColor;
  font-size: 0.8125rem;
}

.build-info__item {
  color: currentColor;
  opacity: 0.75;
}

.build-info__error {
  color: light-dark(#8a1c1c, #ff9d9d);
  font-weight: 600;
}
```

- [ ] **Step 3: Wire the footer into `AppShell.tsx`**

One import and one element. The existing heading and prose are unchanged — the prose is the copy the developer's brief quoted, and it stays exactly as it is.

Replace:
```tsx
import './AppShell.css'
```
with:
```tsx
import BuildInfo from './BuildInfo'
import './AppShell.css'
```

Replace:
```tsx
      </p>
    </main>
```
with:
```tsx
      </p>
      <BuildInfo />
    </main>
```

- [ ] **Step 4: Confirm the three files compile, lint, and stay inside the size budget**

Run:
```powershell
npm run typecheck
npm run lint
(Get-Content src\ui\BuildInfo.tsx | Measure-Object -Line).Lines
(Get-Content src\ui\AppShell.tsx | Measure-Object -Line).Lines
```
Expected: both npm commands exit 0; `BuildInfo.tsx` is well under 200 lines and `AppShell.tsx` under 20. Anything over 400 is blocking and must be split in this task.

- [ ] **Step 5: Confirm the previously written spec still passes**

Run: `npx vitest run src/ui/__tests__/configUrl.test.ts`
Expected: `Tests  5 passed`, exit 0.

---

## Phase 3 — Access posture

AC6 asks for restriction rather than open publication. Neither file here is authentication — the deployed site stays reachable by anyone holding the URL, which is AC6's own "unlisted URL" reading and the only one compatible with AC9's zero-cost constraint. The `noindex` meta tag is the half that actually works; `robots.txt` is defence in depth for a future custom domain. The phase changes no TypeScript, so the boundary is trivially clean.

### Task 7: Add `public/robots.txt`

- Skill: `none` — a static asset with no TypeScript, no React, and no game logic

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create the file**

`public/` is the only tree Vite copies into `dist/`, so this is the correct location — a repo-root `robots.txt` would never ship.

```
User-agent: *
Disallow: /
```

- [ ] **Step 2: Confirm it landed in the right tree**

Run: `Get-ChildItem public`
Expected: three entries — `favicon.svg`, `robots.txt`, `rules.json`.

### Task 8: Add the `noindex` meta tag to `index.html`

- Skill: `react-frontend` — owns `index.html`, the Vite entry point

**Files:**
- Modify: `index.html:6`

- [ ] **Step 1: Insert the robots meta tag after the viewport tag**

This is the half of the access posture that is honoured wherever the page is served. A `robots.txt` under a project sub-path is not read by crawlers, which fetch it only from the domain root — and the root of `*.github.io` is not ours.

Replace:
```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
with:
```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
```

Leave `href="/favicon.svg"` at `index.html:5` exactly as it is — Vite rewrites root-absolute public paths in `index.html` according to `base` at build time, and Task 11.5 proves it.

- [ ] **Step 2: Confirm the tag is present and the file is still well-formed**

Run: `Select-String -Path index.html -Pattern 'name="robots"'; npx prettier --check index.html`
Expected: exactly one match for the robots pattern, and Prettier reports the file uses its code style. If Prettier reports a formatting difference, run `npx prettier --write index.html` and re-run the check.

---

## Phase 4 — The deploy workflow

Authors the file that makes AC2 and AC3 true. It mirrors SCRUM-9's `ci.yml` conventions exactly — `actions/checkout@v5`, `actions/setup-node@v5` reading `node-version-file: .nvmrc`, `npm ci` rather than `npm install`, separately named `run` steps, an explicit `permissions` block — because a second workflow inventing its own idiom is how the two drift. The phase is a safe stopping point: the file is inert until a remote exists, and it changes no source.

### Task 9: Author `.github/workflows/deploy.yml`

- Skill: `none` — GitHub Actions configuration; no skill on disk covers CI/CD, and `react-frontend`'s "Do not use when" excludes non-`src/` infrastructure. Matches SCRUM-9 Task 6

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow**

Use the exact `build` and `test` script names Task 1 Step 4 printed. `npm run build` already chains `lint` and `tsc -b`, which is why there are no separate lint and typecheck steps. `npm test` runs anyway: `package.json` wires it to `vitest run`, and nothing else would stop a red suite from publishing.

The two `VITE_*` names must match `src/vite-env.d.ts` and `src/ui/BuildInfo.tsx` character for character — nothing between the workflow and the bundle type-checks that binding.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build the static bundle
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

      - name: Test
        run: npm test

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Build
        run: npm run build
        env:
          VITE_COMMIT_SHA: ${{ github.sha }}
          VITE_BUILD_TIME: ${{ github.run_started_at }}

      - name: Upload the Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    name: Publish to GitHub Pages
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy the uploaded artifact
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Confirm the file parses as YAML**

Prettier is already a devDependency and is the only dependency-free parse check available on this machine. This proves the YAML **parses**; it does **not** prove the Actions schema is valid — GitHub reports that on the developer's first push.

Run: `npx prettier --check .github/workflows/deploy.yml`
Expected: `All matched files use Prettier code style!` and exit 0. A **formatting** difference: run `npx prettier --write .github/workflows/deploy.yml` and re-check. A **parse error** (`SyntaxError`): the YAML is malformed — fix the structure rather than reformatting around it.

- [ ] **Step 3: Confirm nothing can fail silently**

Run: `Select-String -Path .github\workflows\deploy.yml -Pattern "continue-on-error|\|\|\s*true|exit 0"`
Expected: zero hits. Any hit means a step could fail without failing the run, and a broken bundle would publish.

- [ ] **Step 4: Confirm the Node version is read from `.nvmrc` and never restated inline**

Run:
```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "node-version-file: \.nvmrc"
Select-String -Path .github\workflows\deploy.yml -Pattern "node-version:\s+\d"
```
Expected: the first returns exactly one hit; the second returns **zero**. A literal version inside the workflow is a second copy of the number and reintroduces the divergence SCRUM-9 criterion 8 forbids.

- [ ] **Step 5: Confirm the three Pages permissions and the artifact path**

Run: `Select-String -Path .github\workflows\deploy.yml -Pattern "contents: read|pages: write|id-token: write|path: dist"`
Expected: exactly four matching lines, one per pattern. `actions/deploy-pages` fails at runtime without all three permissions, and the artifact path must match Vite's default `build.outDir`.

- [ ] **Step 6: Confirm the trigger is the default branch and the two build variables are wired**

Run: `Select-String -Path .github\workflows\deploy.yml -Pattern "branches: \[main\]|VITE_COMMIT_SHA|VITE_BUILD_TIME"`
Expected: three matching lines. `branches: [main]` is AC2 — publication is a consequence of merging, with no manual upload step.

---

## Phase 5 — Documentation

Records the three things that must outlive this session: how the site publishes, why the base path is relative, and what the access posture actually protects against. The README is the only file touched and nothing here changes behaviour, so the boundary is clean.

### Task 10: Append a `## Deployment` section to `README.md`

- Skill: `react-frontend` — keeps the README's claims consistent with what `package.json`, `vite.config.ts`, and the workflow actually say, and enforces the no-hard-coded-tunable rule against prose as well as source

**Files:**
- Modify: `README.md` — append one section after the last existing section

- [ ] **Step 1: Confirm the README's current shape before appending**

Run: `Select-String -Path README.md -Pattern '^## '`
Expected: the SCRUM-8 headings — `Requirements`, `Getting started`, `Pinned versions`, `Project layout`, `The \`src/rules/\` boundary`, `Configuration`, `Two constraints later stories inherit` — plus `Continuous integration` and `Repository visibility` if SCRUM-9 Task 7 has landed. **`Deployment` must not already be present.** If it is, this task has already run — read the file and reconcile rather than appending a second copy.

- [ ] **Step 2: Append the section to the end of the file**

Append the inner content, not the outer four-backtick fence. No URL is written — it does not exist until the developer has published the repository and enabled Pages, and a placeholder URL in a README is worse than an absent one.

````markdown

## Deployment

The site is published by the `Deploy to GitHub Pages` workflow at `.github/workflows/deploy.yml`, which runs on every push to `main` and on manual dispatch. Two jobs on `ubuntu-latest`:

| Job | What it does |
| --- | --- |
| `build` | `npm ci` → `npm test` → `npm run build`, then uploads `dist/` as a Pages artifact |
| `deploy` | Publishes that artifact via `actions/deploy-pages` |

`npm run build` already chains `lint` and `tsc -b`, so a lint or type error fails the deploy. `npm test` runs separately, because nothing else would stop a red suite from publishing. Merging to `main` is the only publication step — there is no manual upload.

**The live URL is recorded here once the first deploy succeeds.** Two things must be done by hand first: publish the repository and push `main`, then set Settings → Pages → Source to **GitHub Actions**.

### Base path

`vite.config.ts` sets `base: './'`. A GitHub Pages project site serves from `https://<owner>.github.io/<repo>/`, not from a domain root, so a default `base: '/'` would emit asset URLs that 404. A relative base is correct at any depth and on any host, which also means the deployment can move to Netlify or Vercel without a code change.

This is safe **only while the app is a single view with no router**. Relative bases break for nested client-side routes. If a router is ever added, switch `base` to an explicit path supplied by the workflow before adding the first route.

`public/rules.json` is fetched through the same base path, so a tuning change reaches the hosted build through an ordinary deploy. The footer reports which version of the file the running build loaded.

### Build indicator

Every deployed page carries a footer showing the short commit SHA it was built from, the build timestamp, and the state of `rules.json`. The workflow supplies `VITE_COMMIT_SHA` and `VITE_BUILD_TIME`; a local `npm run build` sets neither, and the footer says `local` rather than inventing a SHA. This exists so play-test feedback can be tied to a specific build and a specific set of constants — without it, a report like "the strings felt too short" cannot be matched to the values that were live.

### Access

`index.html` carries `<meta name="robots" content="noindex, nofollow" />` and `public/robots.txt` disallows all crawlers. **Be clear about what this is:** the meta tag is the effective half, honoured wherever the page is served; `robots.txt` under a project sub-path is *not* read by crawlers, which fetch it only from the domain root, so it only starts working behind a custom domain.

Neither is authentication. Anyone with the URL can open the site — treat the URL as unlisted, not private. Genuine access control costs money: GitHub's access-controlled Pages requires Enterprise Cloud, and password protection on Netlify and Vercel is a paid tier. See `## Repository visibility` for why the source itself stays private.
````

- [ ] **Step 3: Confirm no heading was duplicated**

Run: `Select-String -Path README.md -Pattern '^## ' | Group-Object Line | Where-Object Count -gt 1`
Expected: no output. Any group returned means a heading appears twice.

- [ ] **Step 4: Format the README and confirm it is clean**

`.prettierignore` covers `node_modules`, `dist`, `coverage`, `package-lock.json`, `.claude`, `.docs`, and `CLAUDE.md` — **not** `README.md`, so `npm run format:check` fails on an unformatted README.

Run: `npx prettier --write README.md; npx prettier --check README.md`
Expected: the check prints `All matched files use Prettier code style!` and exits 0.

- [ ] **Step 5: Confirm no tunable value leaked into the copy**

A number belonging in `rules.json` is a defect in prose as much as in source.

Run: `Select-String -Path README.md -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits.

---

## Phase 6 — Final verification

The closing phase. No production changes — only sanity checks that the cumulative work is clean, plus the `dist/` audit that Phase 1 deferred here because it needs a production build.

### Task 11.1: Confirm the `src/rules/` boundary still holds

- [ ] **Step 1: Grep for React, DOM, and network references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|fetch\("`
Expected: zero hits. This contract creates and modifies nothing under `src/rules/`, so any hit is a misplaced file.

### Task 11.2: Confirm no tunable was hard-coded and no debug logging shipped

- [ ] **Step 1: Grep source for the literals `rules.json` owns**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits.

- [ ] **Step 2: Grep for console logging**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "console\.(log|debug)"`
Expected: zero hits. The probe's failure message renders in the footer, not the console.

### Task 11.3: Confirm the string-bound names match at both ends

The four names introduced here bind by string and no compiler checks them.

- [ ] **Step 1: Confirm each `VITE_*` name appears in both the workflow and the source**

Run:
```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "VITE_COMMIT_SHA|VITE_BUILD_TIME"
Select-String -Path src\vite-env.d.ts -Pattern "VITE_COMMIT_SHA|VITE_BUILD_TIME"
Select-String -Path src\ui\BuildInfo.tsx -Pattern "VITE_COMMIT_SHA|VITE_BUILD_TIME"
```
Expected: exactly two matching lines from each of the three files. A name present in one but not another means the indicator renders its fallback on the deployed site and AC8 silently fails.

- [ ] **Step 2: Confirm the config filename matches the file that exists**

Run: `Select-String -Path src\ui\configUrl.ts -Pattern "rules\.json"; Get-ChildItem public\rules.json`
Expected: one match for the literal, and `public/rules.json` exists.

- [ ] **Step 3: Confirm every CSS class used in the TSX is defined in the stylesheet**

Run:
```powershell
Select-String -Path src\ui\BuildInfo.tsx -Pattern "build-info__error|build-info__item|build-info"
Select-String -Path src\ui\BuildInfo.css -Pattern "build-info__error|build-info__item|build-info"
```
Expected: both files reference all three class names. A class used in the TSX but absent from the CSS renders unstyled with no error.

### Task 11.4: Static gates and the full suite

- [ ] **Step 1: Typecheck, lint, format check, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed and includes the five `resolveConfigUrl` cases plus the pre-existing scaffold spec. Quote the `Tests  N passed` line.

### Task 11.5: Production build and the `dist/` audit — the proof for AC4 and AC5

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [ ] **Step 2: Confirm no root-absolute path survives in the built HTML (AC4)**

`index.html:5` carries `href="/favicon.svg"` in source. Vite rewrites root-absolute public paths per `base`, so the built file must contain none.

Run: `Select-String -Path dist\index.html -Pattern 'src="/|href="/'`
Expected: **zero hits**. Any hit means `base` did not apply and every asset will 404 under the Pages project path.

- [ ] **Step 3: Confirm the relative base actually landed**

Run: `Select-String -Path dist\index.html -Pattern 'src="\./|href="\./'`
Expected: at least two hits — the favicon link and the module script. Run as a separate grep from Step 2 rather than as one alternation: `Select-String` reports one match per physical line, so a single combined pattern can report a hit for one alternative and mask the other.

- [ ] **Step 4: Confirm the tuning surface and the crawler files were copied into the bundle (AC5, AC6)**

Run: `Get-ChildItem dist\rules.json, dist\robots.txt; Select-String -Path dist\index.html -Pattern 'name="robots"'`
Expected: both files listed, and exactly one robots meta match. `public/` is the only tree Vite copies, so this proves a tuning change reaches the hosted build through an ordinary deploy.

- [ ] **Step 5: Confirm the build indicator's fallback shipped rather than a fabricated SHA**

No `VITE_COMMIT_SHA` is set for a local build, so the bundle must carry the fallback literal.

Run: `Select-String -Path dist\assets\*.js -Pattern "local" -AllMatches | Select-Object -First 1`
Expected: at least one match. A bundled asset is one physical line, so `-AllMatches` is required — a bare `Select-String` reports only the first match on that line and reads like a missing string.

### Task 11.6: Confirm no file exceeds the size budget

- [ ] **Step 1: Measure every file this contract created or grew**

Run:
```powershell
Get-ChildItem src\ui\BuildInfo.tsx, src\ui\useConfigProbe.ts, src\ui\configUrl.ts, src\ui\AppShell.tsx, src\ui\__tests__\configUrl.test.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }
```
Expected: every file well under 200 lines. Over 400 is blocking and must be split before the contract closes.

### Task 11.7: Write the PR description and the developer handoff

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary of the change: relative base path, build indicator, `rules.json` probe, access posture, deploy workflow, README section.
- **Every developer action still outstanding**, in order: check the account plan supports Pages from a private repository; publish the repository and push `main` from GitHub Desktop; set Settings → Pages → Source to **GitHub Actions**; open the deployed URL and confirm the footer, the assets and `rules.json` all resolve; record the URL in the README's `## Deployment` section and as a comment on SCRUM-10.
- **The criteria this contract does not close**, stated plainly: AC1 (no 4-player game exists to play yet) and AC7 (the URL cannot be known until the site is live). AC6 is closed only in its "unlisted URL" reading — the site is not authenticated.
- Verification results from the prior phases, quoting the actual `Tests  N passed` line and the `dist/` audit outcomes.
- A one-line note for future contributors: `src/ui/__tests__/` is a new test location for pure non-game helpers, and `useConfigProbe.ts` is a deployment smoke check that the configuration story should absorb rather than extend.

---

## Self-review

**Spec coverage:**
- Relative base path so `dist/` carries no root-absolute path (AC4) — Task 2, proven in Task 11.5 Steps 2-3.
- Build indicator showing commit and build time (AC8) — Tasks 3, 6, 9; name binding checked in Task 11.3 Step 1.
- `rules.json` fetch probe resolving from the base path, four async states (AC5) — Tasks 4, 5, 6; bundle presence proven in Task 11.5 Step 4.
- `src/vite-env.d.ts` typing the two build variables — Task 3.
- `robots.txt` and `noindex` meta (AC6) — Tasks 7, 8; proven in Task 11.5 Step 4.
- `.github/workflows/deploy.yml` publishing on push to `main` (AC2, AC3) — Task 9.
- `## Deployment` README section (AC7, partial — URL is developer-added) — Task 10.
- Preflight blocking on the SCRUM-9 artefacts — Task 1.
- AC1 and the live URL are explicitly out of scope; both are carried into the File map's "Developer decides or observes" and into Task 11.7's handoff.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No `eslint-disable` appears anywhere. No step invents a tuning value — this contract needs none.

**Type / name consistency:** `resolveConfigUrl` and `CONFIG_FILENAME` are spelled identically in Tasks 4, 5 and 11.3. `ConfigProbeState` and its four `status` literals (`loading`, `success`, `empty`, `error`) match between Task 5's union and Task 6's `switch`. `useConfigProbe` is spelled identically in Tasks 5 and 6. `VITE_COMMIT_SHA` and `VITE_BUILD_TIME` are identical across Tasks 3, 6, 9 and 11.3. The class names `build-info`, `build-info__item`, `build-info__error` match between Task 6 Steps 1 and 2 and Task 11.3 Step 3. Every identifier matches `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- *Phase 1* — ends with `vite.config.ts` type-checking and no source file changed; the deferred `dist/` proof is explicitly assigned to Task 11.5.
- *Phase 2* — each task type-checks and lints before the next begins; `BuildInfo.tsx` is written in the same task that wires it into `AppShell.tsx`, so no import ever dangles, and the phase ends with the suite green.
- *Phase 3* — no TypeScript changes; `index.html` is verified well-formed by Prettier.
- *Phase 4* — creates one inert YAML file that no source imports; nothing can break.
- *Phase 5* — README only, formatted and heading-deduplicated in the same task.
- *Phase 6* — no production changes at all.
