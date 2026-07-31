# Tasks: Scaffold the Vite + React + TypeScript application

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-07-31
Completed: 2026-07-31

**Goal:** A localhost running a placeholder homepage — `npm install` then `npm run dev` serves the String Railway placeholder page, and `npm run build` + `npm run preview` serve the same page from `dist/`. Everything else in this contract exists to make that page's foundations correct: pinned versions, the `src/rules/` · `__tests__/` · `src/ui/` split, Vitest running without watch mode, strict TypeScript, ESLint + Prettier green, `.gitignore`, README, an empty-but-valid `public/rules.json`, and an import-boundary rule that provably fails the build.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `package.json` — scaffolded, then given the project identity, the seven scripts, and three devDependencies
- `package-lock.json` — written by `npm install`; never hand-edited
- `index.html` — Vite entry; title set to String Railway
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — project references; `strict` added to the latter two
- `vite.config.ts` — Vite plugins plus the Vitest `test` block
- `eslint.config.js` — template flat config plus the `src/rules/` boundary override and `eslint-config-prettier`
- `.prettierrc.json` — formatter settings matching the template's own style
- `.prettierignore` — protects `.claude/`, `.docs/`, `CLAUDE.md`, and generated trees
- `.gitignore` — scaffolded, then extended with local env files and `coverage`
- `README.md` — install / run / test / build, pinned versions, the boundary paragraph
- `public/rules.json` — the value-free tuning shell
- `public/favicon.svg` — scaffolded
- `src/main.tsx` — scaffolded; the stylesheet import is repointed
- `src/App.tsx` — scaffolded, then reduced to rendering `<AppShell />`
- `src/ui/AppShell.tsx` — minimal shell so `src/ui/` holds a real file
- `src/ui/AppShell.css` — per-component stylesheet
- `src/styles/global.css` — global stylesheet, replacing the template's `src/index.css`
- `src/rules/__tests__/scaffold.test.ts` — the placeholder spec

**Modified:**

- `.claude/skills/react-frontend/SKILL.md:3,78,106` — React 19 + Vite 8; `rules.json` → `public/rules.json`
- `.claude/workflow/web-project.md:9,21-22,119` — `rules.json` under `public/`; scaffold-status note; React StrictMode wording
- `.claude/agents/defender.md:32,47` — React 19; React StrictMode wording

**Deleted:**

- `src/App.css` — template demo styling, replaced by `src/ui/AppShell.css`
- `src/index.css` — replaced by `src/styles/global.css`
- `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` — demo artwork with no consumer
- `public/icons.svg` — demo artwork, deleted only after a grep proves nothing references it
- `src/rules/__boundary-probe.ts` — created and deleted inside Task 8; must not survive the phase

**Developer decides or observes:**

- **The localhost homepage — this contract's headline deliverable, and the one thing only you can confirm.** Both `npm run dev` and `npm run preview` are non-terminating servers, so no agent may start either; Phase 6 proves the page compiled into `dist/` but cannot prove it paints. Run `npm run dev`, open the printed `http://localhost:5173`, and check four things: the browser tab reads **String Railway** (not "Vite + React + TS"); the page shows the `String Railway` heading and the one-line "Prototype shell…" placeholder; there is no Vite counter button, logo, or demo artwork left anywhere; and the browser console is clean — no 404, no React warning. Then `Ctrl+C`, run `npm run build; npm run preview`, and confirm the production build serves the identical page.
- **Whether `AppShell` should look like anything** — it ships as an `<h1>` and one line of prose, deliberately unstyled beyond spacing.
- **TypeScript `~6.0.2`** — the template's pin, while the registry's `latest` is 7.0.2. Taken as-is to avoid an unrequested compiler major; overrule if you want the jump.
- **`erasableSyntaxOnly: true`** — a template default that forbids `enum` and `namespace` project-wide. Harmless against the skill's `as const` maps, but every later story inherits it.
- **Every value inside `public/rules.json`** — the M2 geometry constants and the M17 deck composition. The shell ships with `geometry: {}` and `deck: {}` and no invented number.
- **`CLAUDE.md` goes stale when this lands** — its "Project state — read this first" section says there is no application on disk, that `npm run typecheck` has nothing to run, and that an empty `Glob src/**` means the project is unscaffolded. All three become false. This contract does **not** touch it, because the approved `plan.md` scoped documentation corrections to three files. Decide whether to fix it now or let `/fb-archive` handle it.

---

## Phase 1 — Scaffold safely and install

The highest-consequence phase. `create-vite` will not write into a non-empty directory without `--overwrite`, and that flag *removes existing files* — aimed at this repo root it would destroy `.claude/` and `.docs/`. The scaffold therefore runs into a directory under `$env:TEMP` and the result is copied in. The boundary is safe to stop at because the repo either has a complete generated project plus its original two documentation trees, or it has nothing new at all.

### Task 1: Scaffold the `react-ts` template into a scratch directory and copy it into the repo root ✓

- Skill: react-frontend

**Files:**

- Create: `package.json`, `index.html`, `eslint.config.js`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.gitignore`, `README.md`, `public/favicon.svg`, `public/icons.svg`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`

- [x] **Step 1: Confirm the repo root holds only the two documentation trees before copying anything into it**

Run: `Get-ChildItem -Force -Name`
Expected: exactly three entries — `.claude`, `.docs`, `CLAUDE.md`. If anything else is present, stop and re-read this contract before continuing; the copy in Step 3 uses `-Force` and will overwrite same-named files.

- [x] **Step 2: Scaffold into a scratch directory outside the repository**

Never run `create-vite` in the repo root, and never pass `--overwrite` — the CLI documents it as "remove existing files if target directory is not empty", which would take `.claude/` and `.docs/` with it.

Run:

```powershell
$tmp = Join-Path $env:TEMP 'sr-scaffold'; if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }; New-Item -ItemType Directory -Path $tmp | Out-Null; Set-Location $tmp; npm create vite@latest app -- --template react-ts --eslint --no-immediate --no-interactive
```

Expected: exits 0 and prints `Scaffolding project in ...\sr-scaffold\app`. All three flags are load-bearing: `--eslint` because create-vite 9's React templates default to **Oxlint** and criterion 6 names ESLint; `--no-immediate` because the default installs dependencies and **starts the dev server**, which never terminates; `--no-interactive` so no prompt can hang the run.

- [x] **Step 3: Copy the generated tree into the repo root and remove the scratch directory**

Run:

```powershell
$app = Join-Path $env:TEMP 'sr-scaffold\app'; Copy-Item -Path (Join-Path $app '*') -Destination . -Recurse -Force; Remove-Item (Join-Path $env:TEMP 'sr-scaffold') -Recurse -Force
```

Expected: exits 0, no output.

- [x] **Step 4: Verify the generated files arrived and the documentation trees survived**

Run: `Get-ChildItem -Force -Name; '--- src ---'; Get-ChildItem src -Recurse -Name; '--- public ---'; Get-ChildItem public -Name`
Expected: `.claude`, `.docs`, and `CLAUDE.md` all still present, alongside `package.json`, `index.html`, `eslint.config.js`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.gitignore`, `README.md`; `src` contains `main.tsx`, `App.tsx`, `App.css`, `index.css`, `assets\hero.png`, `assets\react.svg`, `assets\vite.svg`; `public` contains `favicon.svg` and `icons.svg`.

### Task 2: Set the project identity, the seven scripts, and the three devDependencies ✓

- Skill: react-frontend

**Files:**

- Modify: `package.json`
- Config: `package.json` — `name`, the `scripts` block, and three devDependencies; `package-lock.json` is regenerated by `npm install`

- [x] **Step 1: Replace the `name` and `scripts` fields**

Set `"name": "string-railway"` (the template writes `"app"` from the scratch directory name), and replace the whole `scripts` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "npm run lint && tsc -b && vite build",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
```

`test` is `vitest run`, never bare `vitest` — the bare form is watch mode and hangs any agent that calls `npm test`. `build` runs `lint` first so the boundary rule from Task 8 literally fails the build (criterion 4). Both generated tsconfigs already set `noEmit: true`, so `tsc -b` emits nothing and serves as the fast gate.

- [x] **Step 2: Install everything, adding the three devDependencies in one pass**

Run: `npm install --save-dev vitest prettier eslint-config-prettier`
Expected: exits 0; `node_modules/` and `package-lock.json` are created. Runtime dependencies stay at exactly two — `react` and `react-dom`. Do not hand-edit `package-lock.json` at any point.

- [x] **Step 3: Confirm the fast gate resolves and passes on the generated source**

Run: `npm run typecheck`
Expected: exits 0, no errors reported. A `Missing script` error here means Step 1 was not saved.

---

## Phase 2 — Strict TypeScript, the folder layout, and the config shell

Strict mode goes on before anything is written against the compiler, so no code is authored under looser rules and fixed later. The demo counter is then replaced by a minimal shell, which is what makes criterion 2's `src/ui/` a real directory rather than an empty one. The boundary is safe to stop at because the app still type-checks and every file on disk has a consumer.

### Task 3: Enable TypeScript strict mode in both project-reference configs ✓

- Skill: react-frontend

**Files:**

- Modify: `tsconfig.app.json`, `tsconfig.node.json`
- Config: both tsconfigs — add `strict`

The generated template sets `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `noFallthroughCasesInSwitch` but **not** `strict`. Criterion 5 requires it, and the type system is load-bearing here for the later `ColourId` versus `PlayerId` distinction.

- [x] **Step 1: Add `strict` to the `/* Linting */` block of `tsconfig.app.json`**

```jsonc
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
```

- [x] **Step 2: Add the same line to the `/* Linting */` block of `tsconfig.node.json`**

```jsonc
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
```

- [x] **Step 3: Confirm the generated source still type-checks under strict**

Run: `npm run typecheck`
Expected: exits 0. If the demo `App.tsx` reports an error, do not loosen the config — Task 4 replaces that file anyway; note the error and continue.

### Task 4: Replace the Vite demo with a minimal `src/ui/AppShell` and establish `src/styles/` ✓

- Skill: react-frontend

**Files:**

- Create: `src/ui/AppShell.tsx`, `src/ui/AppShell.css`, `src/styles/global.css`
- Modify: `src/App.tsx`, `src/main.tsx`
- Delete: `src/App.css`, `src/index.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`

- [x] **Step 1: Create `src/ui/AppShell.tsx`**

File order is imports → component → export, per the skill. No state, no logic, no rule — this component exists so `src/ui/` holds something real.

```tsx
import './AppShell.css'

function AppShell() {
  return (
    <main className="app-shell">
      <h1>String Railway</h1>
      <p>
        Prototype shell. The board, the station deck and the fixed-length string drag arrive in
        later stories.
      </p>
    </main>
  )
}

export default AppShell
```

- [x] **Step 2: Create `src/ui/AppShell.css`**

```css
.app-shell {
  margin: 0 auto;
  max-width: 40rem;
  padding: 2rem 1.5rem;
}

.app-shell h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.app-shell p {
  margin: 0;
  opacity: 0.8;
}
```

- [x] **Step 3: Create `src/styles/global.css`**

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
  min-height: 100vh;
}
```

- [x] **Step 4: Reduce `src/App.tsx` to rendering the shell**

Replace the entire file — the demo's `useState` counter, its `hero.png` / `react.svg` / `vite.svg` imports, and its `./App.css` import all go.

```tsx
import AppShell from './ui/AppShell'

function App() {
  return <AppShell />
}

export default App
```

- [x] **Step 5: Repoint the stylesheet import in `src/main.tsx`**

Change `import './index.css'` to `import './styles/global.css'`. Leave the `StrictMode` wrapper and the `createRoot` call exactly as generated.

- [x] **Step 6: Prove nothing references the demo assets, then delete them**

Run:

```powershell
Select-String -Path index.html -Pattern "icons\.svg|hero\.png|react\.svg|vite\.svg"; Get-ChildItem src -Recurse -Include *.tsx,*.ts,*.css | Select-String -Pattern "icons\.svg|hero\.png|react\.svg|vite\.svg|App\.css|index\.css"
```

Expected: zero hits from both halves. `index.html` is grepped separately because `-Include` filters on the leaf name and would silently skip it. `AppShell.css` does not match the `App\.css` pattern — the pattern requires `App` immediately followed by `.css`. Then run:

```powershell
Remove-Item src\App.css, src\index.css, public\icons.svg -Force; Remove-Item src\assets -Recurse -Force
```

Expected: exits 0, no output.

- [x] **Step 7: Type-check and measure the new files against the 400-line budget**

Run: `npm run typecheck; (Get-Content src\ui\AppShell.tsx | Measure-Object -Line).Lines; (Get-Content src\App.tsx | Measure-Object -Line).Lines`
Expected: typecheck exits 0; both counts well under 200.

### Task 5: Add the `public/rules.json` shell and set the document title ✓

- Skill: react-frontend

**Files:**

- Create: `public/rules.json`
- Modify: `index.html`
- Config: `public/rules.json` — the tuning surface shell; **every value inside it is a developer decision and none is chosen here**

- [x] **Step 1: Create `public/rules.json`**

`public/` is the only tree Vite copies into `dist/`, so this is the path that survives a production build and stays editable by a play-tester without a rebuild. Valid JSON, two empty sections, no invented number.

```json
{
  "configVersion": 1,
  "_note": "Tuning surface for String Railway. 'geometry' holds the M2 constants (border perimeter, per-player-count edge lengths, card footprint, string lengths, arc-length tolerance); 'deck' holds the M17 composition. Values are developer decisions — see .docs/Game_Rules/Rules.md §12 and §14. SCRUM-8 ships the shell only.",
  "geometry": {},
  "deck": {}
}
```

- [x] **Step 2: Set the document title in `index.html`**

Replace the generated `<title>Vite + React + TS</title>` with `<title>String Railway</title>`. Leave the `favicon.svg` link and the `#root` div as generated.

(The template as actually scaffolded had `<title>app</title>`, not `<title>Vite + React + TS</title>` — presumably because create-vite derives the title from the scratch project name `app`. Replaced with `<title>String Railway</title>` regardless; intent satisfied.)

- [x] **Step 3: Confirm the shell is valid JSON with the expected keys**

Run: `Get-Content public\rules.json -Raw -Encoding UTF8 | ConvertFrom-Json | Select-Object -ExpandProperty configVersion`
Expected: prints `1`. Pass `-Encoding UTF8` explicitly — Windows PowerShell 5.1 defaults to the ANSI codepage and would garble the `§` and `—` characters in `_note`. A parse error means the file is malformed and the configuration story would inherit a broken location.

---

## Phase 3 — The test runner

Vitest is configured with a `node` environment, which is the runtime half of the purity contract: a rules spec that reaches for the DOM fails rather than passing quietly under a shim. The boundary is safe to stop at because `npm test` runs a real, passing assertion and the project still type-checks.

### Task 6: Configure Vitest and add the placeholder rules-engine spec ✓

- Skill: react-frontend

**Files:**

- Modify: `vite.config.ts`
- Test: `src/rules/__tests__/scaffold.test.ts`
- Config: `vite.config.ts` — the Vitest `test` block

- [x] **Step 1: Replace `vite.config.ts` with the Vitest-aware config**

`defineConfig` comes from `vitest/config`, not `vite`, so the `test` field is typed rather than a cast.

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
```

- [x] **Step 2: Create `src/rules/__tests__/scaffold.test.ts`**

The assertion is deliberately real — it proves the rules-engine specs run with no DOM, which is exactly what this ticket establishes. It is written as `'document' in globalThis` rather than a direct reference so the Final-verification boundary grep cannot match the spec's own text.

```ts
import { describe, expect, it } from 'vitest'

describe('rules engine test harness', () => {
  it('runs pure TypeScript specs with no DOM available', () => {
    expect('document' in globalThis).toBe(false)
  })
})
```

- [x] **Step 3: Run the spec on its own**

Run: `npx vitest run src/rules/__tests__/scaffold.test.ts`
Expected: exits 0 and prints `Tests  1 passed (1)`. Note the `run` subcommand — bare `vitest` is watch mode and will hang until the timeout with nothing to show for it.

- [x] **Step 4: Confirm the spec type-checks**

Run: `npm run typecheck`
Expected: exits 0. `tsconfig.app.json` includes all of `src`, so a type error in the spec surfaces here rather than as a silent Vitest collection failure.

---

## Phase 4 — Formatting, and the boundary rule that actually fires

Criterion 4 is the only architectural deliverable in this contract, and it is the one thing here that cannot be verified by reading the config. The phase ends by deliberately tripping the rule with a throwaway file, then deleting it. The boundary is safe to stop at only once that probe is gone — the phase must not end with `src/rules/__boundary-probe.ts` on disk.

### Task 7: Configure Prettier and stop it reformatting the documentation trees ✓

- Skill: react-frontend

**Files:**

- Create: `.prettierrc.json`, `.prettierignore`
- Modify: `eslint.config.js`
- Config: `.prettierrc.json`, `.prettierignore`

- [x] **Step 1: Create `.prettierrc.json`**

These settings match the template's own generated style — no semicolons, single quotes — so formatting produces a near-empty diff instead of rewriting every scaffolded file.

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

- [x] **Step 2: Create `.prettierignore`**

Without this, `prettier --write .` reformats every markdown file under `.claude/` and `.docs/` — rewriting the whole `/fb-*` pipeline and the rulebook extraction as a side effect of a formatting command.

```
node_modules
dist
coverage
package-lock.json
.claude
.docs
CLAUDE.md
```

- [x] **Step 3: Append `eslint-config-prettier` as the last element of the ESLint config array**

Add the import at the top of `eslint.config.js`:

```js
import eslintConfigPrettier from 'eslint-config-prettier'
```

and make it the final entry of the `defineConfig([...])` array, after the existing `**/*.{ts,tsx}` block, so it switches off the stylistic rules that would fight the formatter.

- [x] **Step 4: Format the source, then verify formatting and lint are both clean**

Run: `npm run format; npm run format:check; npm run lint`
Expected: `format` exits 0 and lists the files it touched; `format:check` exits 0 reporting all matched files use Prettier code style; `lint` exits 0 with no output. No file under `.claude/` or `.docs/` may appear in the `format` output — if one does, `.prettierignore` is wrong and the change must be reverted before continuing.

### Task 8: Enforce the `src/rules/` boundary in ESLint and prove it fails ✓

- Skill: react-frontend

**Files:**

- Modify: `eslint.config.js`
- Create: `src/rules/__boundary-probe.ts` — temporary; deleted in Step 4 of this task
- Config: `eslint.config.js` — the `src/rules/**` override

- [x] **Step 1: Add the boundary override to `eslint.config.js`**

Insert as a new element of the `defineConfig([...])` array, after the existing `**/*.{ts,tsx}` block and **before** `eslintConfigPrettier`.

```js
  {
    files: ['src/rules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'src/rules/ is pure TypeScript — no React. See README, "The src/rules/ boundary".',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/rules/ must not touch the DOM.' },
        { name: 'document', message: 'src/rules/ must not touch the DOM.' },
        { name: 'navigator', message: 'src/rules/ must not touch the DOM.' },
        { name: 'localStorage', message: 'src/rules/ must not touch browser storage.' },
      ],
    },
  },
```

Do **not** add a `languageOptions.globals` key to this override. It inherits `globals.browser` from the block above, and that is what makes the rule work: `no-restricted-globals` only matches globals ESLint has been told exist. Removing them would leave `window` merely undefined, and `typescript-eslint`'s recommended config switches `no-undef` off — so the rule would silently never fire.

- [x] **Step 2: Create the throwaway probe that violates both halves of the boundary**

```ts
// TEMPORARY — proves the src/rules/ boundary rule fires. Deleted in Step 4 of this task.
import { StrictMode } from 'react'

export const probe = [StrictMode, window.location.href]
```

- [x] **Step 3: Confirm lint FAILS while the probe exists**

Run: `npm run lint; "EXIT=$LASTEXITCODE"`
Expected: **non-zero** `EXIT`, with output naming both `no-restricted-imports` (on the `react` import) and `no-restricted-globals` (on `window`), both pointing at `src/rules/__boundary-probe.ts`.

**This is an inverted check.** If `EXIT=0`, the boundary rule is inert — criterion 4 is not met, and a boundary everyone believes in but which never fires is worse than none. Stop, fix the override, and re-run this step. Do not delete the probe and do not proceed to Step 4 until lint has genuinely failed.

- [x] **Step 4: Delete the probe and confirm lint returns to clean**

Run: `Remove-Item src\rules\__boundary-probe.ts -Force; npm run lint; "EXIT=$LASTEXITCODE"`
Expected: `EXIT=0`, no output from ESLint, and no `__boundary-probe.ts` anywhere under `src/rules/`.

---

## Phase 5 — Ignore rules, the README, and the documentation this contract makes false

No behaviour changes here — this phase records what the previous four built and repairs the three pipeline documents that would otherwise state something untrue about the repo. The boundary is safe to stop at because nothing executable is touched.

### Task 9: Extend `.gitignore` with local environment files and coverage output ✓

- Skill: react-frontend

**Files:**

- Modify: `.gitignore`
- Config: `.gitignore`

The generated file already covers `node_modules`, `dist`, `dist-ssr`, and `*.local`. Criterion 7 also names local environment files, and Vitest writes `coverage/`.

- [x] **Step 1: Append the two blocks to `.gitignore`**

```
# Local environment files
.env
.env.*
!.env.example

# Test coverage
coverage
```

- [x] **Step 2: Confirm all four required patterns are present**

Run: `Select-String -Path .gitignore -Pattern "^node_modules$|^dist$|^\.env$|^coverage$"`
Expected: four hits — `node_modules`, `dist`, `.env`, `coverage`.

### Task 10: Write the README with pinned versions and the boundary paragraph ✓

- Skill: react-frontend

**Files:**

- Modify: `README.md` — replaces the generated template README wholesale

- [x] **Step 1: Read the versions actually installed rather than transcribing any from this contract**

Run: `node --version; npm --version; npm ls react react-dom vite typescript vitest eslint prettier --depth=0`
Expected: exits 0 and prints the resolved version of each package. Use these exact numbers in Step 2 — the ticket's risk note asks for pinned versions so a second developer gets the same starting point, and a number copied from a plan written earlier is not evidence of what is on disk.

- [x] **Step 2: Replace `README.md` in full**

Required content, in this order:

1. **Title and one-line description** — String Railway, a browser prototype of the board game specified in `.docs/Game_Rules/Rules.md`.
2. **Requirements** — the Node and npm versions from Step 1, stated as the versions this scaffold was created and verified against, plus the `create-vite` template used (`react-ts`, with `--eslint`).
3. **Getting started** — `npm ci` to install; a table of every script with what it does and when to use it: `dev`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`, `preview`. State plainly that `npm test` runs once and exits, and that `npm run test:watch` is the watch-mode variant for interactive work.
4. **Pinned versions** — the table from Step 1: react, react-dom, vite, typescript, vitest, eslint, prettier.
5. **Project layout** — the tree as it exists: `src/rules/` with `__tests__/`, `src/ui/`, `src/styles/`, `App.tsx` and `main.tsx` at the root of `src/`, `public/rules.json`. Note that `src/constants/` is not yet created and belongs to the first story that needs a constant map.
6. **The `src/rules/` boundary** — one paragraph (criterion 8): game logic under `src/rules/` is pure TypeScript with no React import and no DOM access, so it can be unit-tested with no renderer, reasoned about without React semantics, and survive a UI rewrite. State that this is enforced three ways — the ESLint override in `eslint.config.js`, which `npm run build` runs before compiling; the `node` Vitest environment, in which a DOM reference throws; and that the boundary is cheap now and expensive to retrofit once a component imports a geometry helper directly.
7. **Configuration** — `public/rules.json` is the tuning surface; it currently holds only `configVersion` and two empty sections; the M2 geometry constants and M17 deck composition are chosen by the developer, not by code; it lives under `public/` because that is the only tree Vite copies into `dist/`.
8. **Two constraints later stories inherit** — runtime dependencies are exactly `react` and `react-dom`, and a third needs explicit justification; `erasableSyntaxOnly` is on, so `enum` and `namespace` are unavailable and constant maps use the `as const` object form.

- [x] **Step 3: Format the README, then confirm it covers the required ground**

`README.md` is not in `.prettierignore`, so a hand-written table or list that does not match Prettier's markdown style would fail `npm run format:check` in Task 14. Format it here rather than leaving that failure for the closing phase.

Run: `npm run format; Select-String -Path README.md -Pattern "npm ci|npm run dev|npm test|npm run build|src/rules|public/rules.json"`
Expected: `format` exits 0 and touches no file under `.claude/` or `.docs/`; the grep returns at least one hit for each of the six patterns.

### Task 11: Correct the three pipeline documents this contract makes false ✓

- Skill: none — documentation correction under `.claude/`, which the `react-frontend` skill's "Do not use when" section explicitly excludes

**Files:**

- Modify: `.claude/skills/react-frontend/SKILL.md:3,78,106`, `.claude/workflow/web-project.md:9,21-22,119`, `.claude/agents/defender.md:32,47`

Only claims that become **false** are touched. Conceptual mentions of `rules.json` ("a `rules.json` key", "validate `rules.json` on load") stay exactly as they are — they read correctly at either path, and the single-source-of-truth rule is about fixing the owner, not sweeping every occurrence.

- [x] **Step 1: Correct the stack and layout claims in `.claude/skills/react-frontend/SKILL.md`**

- Line 3, the `description:` frontmatter — `React 18 + Vite + TypeScript conventions` becomes `React 19 + Vite + TypeScript conventions`.
- Line 78 — `**React 18 + Vite 5 + TypeScript (strict).**` becomes `**React 19 + Vite 8 + TypeScript (strict).**`.
- Line 106, inside the project-layout fence — the root-level `rules.json        M2 geometry constants + M17 deck composition` line becomes:

```
public/
  rules.json    M2 geometry constants + M17 deck composition (fetched at startup)
```

- [x] **Step 2: Correct the layout and status claims in `.claude/workflow/web-project.md`**

- Lines 21-22, inside the layout fence — move `rules.json` beneath `public/` so it reads:

```
  public/                 static assets served verbatim; the only tree copied into dist/
    rules.json            M2 geometry constants + M17 deck composition — the tuning surface
```

- Line 9, the `> **Status: partly assumed.**` blockquote — the scaffold has now landed, so replace the "Until the scaffold lands" hedge with a statement that the layout and script names below are the ones SCRUM-8 actually created, while keeping the standing instruction that `package.json` remains the authority on script names.
- Line 119 — `**React 18 StrictMode mounts effects twice in development.**` becomes `**React StrictMode mounts effects twice in development.**`. The behaviour is unchanged in React 19; only the version number was wrong.

- [x] **Step 3: Correct the stack claims in `.claude/agents/defender.md`**

- Line 32 — `Static Vite + React 18 + TypeScript (strict) app at the repo root.` becomes `Static Vite + React 19 + TypeScript (strict) app at the repo root.`
- Line 47 — `**React 18 StrictMode mounts effects twice in development**` becomes `**React StrictMode mounts effects twice in development**`.

- [x] **Step 4: Confirm no stale version or path claim survives in the three corrected files**

Run: `Select-String -Path .claude\skills\react-frontend\SKILL.md,.claude\workflow\web-project.md,.claude\agents\defender.md -Pattern "React 18|Vite 5"`
Expected: zero hits.

---

## Phase 6 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 12: Confirm the `src/rules/` boundary holds and the probe is gone ✓

- Skill: none — verification only, no code is written

> Delegated to QA and run in full. Both steps returned the expected zero hits / no output, in both review rounds. Step 2's glob was widened to `*probe*` so it also caught `__fix-probe.tsx`, the second throwaway probe created during the fix pass; neither probe survived.

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Get-ChildItem src\rules -Recurse -Filter *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. A hit inside `__tests__/` is the same violation, not an exemption.

- [x] **Step 2: Confirm the throwaway probe from Task 8 did not survive**

Run: `Get-ChildItem src\rules -Recurse -Filter "__boundary-probe*"`
Expected: no output.

### Task 13: Confirm no tunable was hard-coded, no debug logging shipped, and the dependency budget held ✓

- Skill: none — verification only, no code is written

> Delegated to QA and run in full. All three steps passed: zero literal hits, zero `console.log`/`console.debug`, and `npm ls --depth=0 --omit=dev` → `react@19.2.8` and `react-dom@19.2.8` only.

- [x] **Step 1: Grep source for the literals `rules.json` owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits.

- [x] **Step 2: Grep source for debug logging**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.(log|debug)"`
Expected: zero hits.

- [x] **Step 3: Confirm runtime dependencies are still exactly two**

Run: `npm ls --depth=0 --omit=dev`
Expected: `react` and `react-dom` only — no third runtime dependency, no HTTP client, no server. This is criterion 10's check.

### Task 14: Static gates and the full suite ✓

- Skill: none — verification only, no code is written

> Delegated to QA and run in full, in both review rounds. All four gates exit 0; Vitest reported `Test Files  1 passed (1)` / `Tests  1 passed (1)`, and `format:check` reported "All matched files use Prettier code style!".

- [x] **Step 1: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports `Tests  1 passed (1)` and `0 failed`. Quote the summary line rather than paraphrasing it.

### Task 15: Production build ✓

- Skill: none — verification only, no code is written

> Delegated to QA and run in full, in both review rounds. `npm run build` exits 0 (`18 modules transformed`); `dist/` holds `index.html`, `assets`, `favicon.svg`, `rules.json`; `dist/rules.json` parses with `configVersion` → `1`; `dist/index.html` carries `<title>String Railway</title>` and the bundle contains both `String Railway` and `Prototype shell`.
>
> **Step 3's command needs correcting for a future contract.** The emitted bundle is single-line minified JS, so `Select-String` reports only one match per physical line and surfaces just one of the two required strings. QA proved both present with a raw-content `-match` instead. Use `-AllMatches`, or a raw `-match`, if this check is reused.

- [x] **Step 1: Build, which now runs the boundary lint first**

Run: `npm run build`
Expected: exits 0; ESLint passes, `tsc -b` reports nothing, Vite writes `dist/`, no bundler errors.

- [x] **Step 2: Confirm the config shell shipped into the build output**

Run: `Get-ChildItem dist -Name; Get-Content dist\rules.json -Raw -Encoding UTF8 | ConvertFrom-Json | Select-Object -ExpandProperty configVersion`
Expected: `dist` contains `index.html`, `assets`, `favicon.svg`, and `rules.json`; the parse prints `1`. This is the check that justifies the `public/` location — a root-level `rules.json` would be absent here and would 404 in production.

- [x] **Step 3: Confirm the placeholder homepage actually compiled into the bundle**

This is the closest the pipeline can get to the contract's goal — a page that type-checks but was never wired into the render tree would pass every other gate in this phase. No agent may start a server to check the rest; that hand-off is in the File map.

Run:

```powershell
Select-String -Path dist\index.html -Pattern "<title>String Railway</title>"; Get-ChildItem dist\assets -Filter *.js | Select-String -Pattern "String Railway|Prototype shell" | Select-Object -First 2
```

Expected: the title matches in `dist\index.html`, and the emitted JS contains both the `String Railway` heading text and the `Prototype shell` placeholder copy. Zero hits in the bundle means `AppShell` is not reachable from `App.tsx` — the homepage would render empty and the goal is not met.

### Task 16: Update the PR description ✓

- Skill: none — documentation of completed work

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder, and the Jira key SCRUM-8.
- Summary of the change: what the scaffold contains and the resolved versions actually installed.
- A criterion-by-criterion table mapping each of the ticket's ten acceptance criteria to the evidence that satisfies it, marking criterion 1's `npm run dev` half as developer-verified.
- Every decision the developer must make and every behaviour they must judge — the full "Developer decides or observes" list from this file's File map, including the stale `CLAUDE.md` "Project state" section.
- Verification results from Phase 6, quoting the actual Vitest summary line and the build exit.
- A one-line note for future contributors on each new convention introduced: `public/rules.json` as the tuning path, `npm test` running once rather than watching, lint running inside `npm run build`, and `erasableSyntaxOnly` ruling out `enum`.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- **A localhost running a placeholder homepage (the stated goal, AC 1)** — built by Tasks 1, 2, 4, 5; statically proven in Task 15 Steps 1-3; the final browser confirmation is a developer observation, itemised with four specific things to look for in the File map.
- Scaffold safely without destroying `.claude/` and `.docs/` (AC 1) — Task 1.
- Pin and record the resolved toolchain (AC 1, ticket risk note) — Tasks 2, 10.
- `package.json` identity and the seven scripts (AC 1, 3, 5, 6) — Task 2.
- Strict TypeScript in both configs (AC 5) — Task 3.
- Folder layout `src/rules/` · `__tests__/` · `src/ui/` · `App.tsx` at root, plus `src/styles/` (AC 2) — Tasks 4, 6.
- Vitest installed, configured, one passing placeholder spec (AC 3) — Tasks 2, 6.
- Import-boundary rule that fails the build, proven by tripping it (AC 4) — Task 8, verified again in Task 12.
- ESLint and Prettier configured and passing (AC 6) — Tasks 7, 14.
- `.gitignore` covering node_modules, dist, local env files (AC 7) — Task 9.
- `README.md` with install/run/test/build and the boundary paragraph (AC 8) — Task 10.
- Valid, value-free `rules.json` shell at the agreed path (AC 9) — Task 5, shipped-artifact check in Task 15.
- No backend, server, API route, or database dependency (AC 10) — Task 13 Step 3.
- Documentation corrections for the claims this contract falsifies — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with an `Expected:` line. No step runs bare `vitest`, no step runs `npm run dev`, no step hand-edits `package-lock.json`, no step proposes an `eslint-disable`, and no step invents a tuning value.

**Type / name consistency:** `AppShell` is the component name in Tasks 4 and 10 and the basename of both `src/ui/AppShell.tsx` and `src/ui/AppShell.css`. `src/styles/global.css` is named identically in Tasks 4 and 10. `configVersion` is the key in Tasks 5, 10, and 15. `public/rules.json` is the path in Tasks 5, 10, 11, and 15. The script names `dev`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`, `preview` are defined once in Task 2 and every later `Run:` step uses only those. `src/rules/__boundary-probe.ts` is spelled identically in Task 8 Steps 2-4, the File map, and Task 12 Step 2. `src/rules/__tests__/scaffold.test.ts` matches the Vitest `include` glob `src/**/__tests__/**/*.test.ts` from Task 6.

**Phase boundary cleanliness:**

- *Phase 1* ends with a complete generated project that installs and passes `npm run typecheck`, with `.claude/` and `.docs/` intact and verified.
- *Phase 2* ends type-checking under strict mode with no dead files — every deleted asset had its references removed first and the deletion is gated on a zero-hit grep.
- *Phase 3* ends with `npm run typecheck` clean and one spec passing under an explicit `run`, with no watch process left behind.
- *Phase 4* ends with lint and formatting both clean and the probe file deleted; the phase explicitly may not end while `__boundary-probe.ts` exists, and Task 12 Step 2 re-checks that.
- *Phase 5* touches only markdown and `.gitignore`, so the compiled state is unchanged from the end of Phase 4.
- *Phase 6* makes no production change at all — every step is a grep, a gate, or a document.
