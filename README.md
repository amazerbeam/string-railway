# String Railway

A browser prototype of the board game specified in `.docs/Game_Rules/Rules.md`.

## Requirements

This scaffold was created and verified against:

- Node **v24.16.0**
- npm **11.13.0**

It was generated from the `create-vite` `react-ts` template with `--eslint`.

The Node version is pinned in **one** place: `.nvmrc`. `nvm use` / `fnm use` / `volta` read it locally, and `actions/setup-node` reads the same file in CI via `node-version-file`, so local and CI cannot diverge. `package.json` `engines.node` states the matching floor, so `npm install` warns a contributor on an older major.

## Getting started

Starting from nothing:

```sh
git clone https://github.com/amazerbeam/string-railway.git
cd string-railway
nvm use
npm ci
npm run dev
```

`nvm use` selects the Node version in `.nvmrc` (`fnm use` and `volta` read the same file). `npm ci` installs exactly what `package-lock.json` pins — use it rather than `npm install`, which may update the lockfile. `npm run dev` starts the dev server and prints the local URL; it runs until you stop it.

| Script                 | What it does                                  | When to use it                               |
| ---------------------- | --------------------------------------------- | -------------------------------------------- |
| `npm run dev`          | Starts the Vite dev server with HMR           | Interactive development                      |
| `npm run build`        | Runs `lint`, then `tsc -b`, then `vite build` | Producing the static `dist/` bundle          |
| `npm run typecheck`    | Runs `tsc -b` with no emit                    | Fast compile check                           |
| `npm run lint`         | Runs ESLint over the project                  | Checking style and the `src/rules/` boundary |
| `npm run format`       | Runs Prettier and rewrites files in place     | Formatting before a commit                   |
| `npm run format:check` | Runs Prettier in check-only mode              | Verifying formatting in CI or before a PR    |
| `npm test`             | Runs the Vitest suite once and exits          | Verifying tests pass                         |
| `npm run test:watch`   | Runs Vitest in watch mode                     | Interactive test-driven work                 |
| `npm run preview`      | Serves the built `dist/` output               | Confirming a production build                |

`npm test` runs once and exits — it does not watch. `npm run test:watch` is the watch-mode variant for interactive work.

## Pinned versions

Resolved versions actually installed, from `npm ls --depth=0`:

| Package    | Version |
| ---------- | ------- |
| react      | 19.2.8  |
| react-dom  | 19.2.8  |
| vite       | 8.2.0   |
| typescript | 6.0.3   |
| vitest     | 4.1.10  |
| eslint     | 10.8.0  |
| prettier   | 3.9.6   |

## Project layout

```
src/
  rules/          pure TypeScript game logic — no React, no DOM
    __tests__/    Vitest specs for the rules engine
  ui/             React components
  styles/         plain CSS
  App.tsx         reducer owner, wires ui/ to rules/
  main.tsx        Vite mount point
public/
  rules.json      the tuning surface (see Configuration below)
```

`src/constants/` does not exist yet — it belongs to the first story that needs a constant map.

## The `src/rules/` boundary

Game logic under `src/rules/` is pure TypeScript with no React import and no DOM access, so it can be unit-tested with no renderer, reasoned about without React semantics, and survive a UI rewrite. This is enforced three ways: an ESLint override in `eslint.config.js` that `npm run build` runs before compiling; the `node` Vitest environment, in which a DOM reference throws; and by convention — the boundary is cheap to keep now and expensive to retrofit once a component imports a geometry helper directly.

## Configuration

`public/rules.json` is the tuning surface. It currently holds only `configVersion` and two empty sections, `geometry` and `deck`. The M2 geometry constants and the M17 deck composition are chosen by the developer, not by code. It lives under `public/` because that is the only tree Vite copies into `dist/`.

## Two constraints later stories inherit

- Runtime dependencies are exactly `react` and `react-dom`. A third dependency needs explicit justification and the developer's approval.
- `erasableSyntaxOnly` is on, so `enum` and `namespace` are unavailable project-wide; constant maps use the `as const` object form instead.

## Continuous integration

Workflow `CI`, at `.github/workflows/ci.yml`, runs on **every push and every pull request**. One job on `ubuntu-latest`:

| Step                 | Command             |
| -------------------- | ------------------- |
| Install dependencies | `npm ci`            |
| Lint                 | `npm run lint`      |
| Typecheck            | `npm run typecheck` |
| Test                 | `npm test`          |
| Build                | `npm run build`     |

Any failing step fails the run. Results appear on the commit and as checks on any pull request. The job requests `contents: read` only — this project needs no secret and defines none.

Running those five commands locally is a dry-run of CI. If they pass on your machine, the run should be green.

## Repository visibility

**This repository is private, deliberately.** Two reasons, recorded so the decision survives:

1. `.docs/Game_Rules/` contains a full rules extraction of **String Railway**, a published game credited to Hisashi Hayashi, with art, development and design by named contributors at Forgenext. Publishing that transcription — and `Rules.pdf` alongside it — would republish someone else's rulebook content. A private repository avoids the question entirely and costs nothing for a prototype.
2. A private repository keeps commit-author email addresses out of public view.

Both files are in the initial commit, so making the repository public later republishes them from history — removing them at that point means rewriting history, not deleting a file. Revisit the decision by removing `.docs/Game_Rules/` first.
