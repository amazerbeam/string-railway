# Prototype

An empty Vite + React 19 + TypeScript prototype scaffold.

## Requirements

This scaffold was created and verified against:

- Node — the version pinned in `.nvmrc`
- npm **11.13.0**

It was generated from the `create-vite` `react-ts` template with `--eslint`.

The Node version is pinned in **one** place: `.nvmrc`. `nvm use` / `fnm use` / `volta` read it locally, and
`actions/setup-node` reads the same file in CI via `node-version-file`, so local and CI cannot diverge.
`package.json` `engines.node` states the matching floor, so `npm install` warns a contributor on an older major.

## Getting started

Starting from nothing:

```sh
git clone <this repository's URL>
cd prototype
nvm use
npm ci
npm run dev
```

`nvm use` selects the Node version in `.nvmrc` (`fnm use` and `volta` read the same file). `npm ci` installs exactly
what `package-lock.json` pins — use it rather than `npm install`, which may update the lockfile. `npm run dev` starts
the dev server and prints the local URL; it runs until you stop it.

| Script                 | What it does                                  | When to use it                            |
| ---------------------- | --------------------------------------------- | ----------------------------------------- |
| `npm run dev`          | Starts the Vite dev server with HMR           | Interactive development                   |
| `npm run build`        | Runs `lint`, then `tsc -b`, then `vite build` | Producing the static `dist/` bundle       |
| `npm run typecheck`    | Runs `tsc -b` with no emit                    | Fast compile check                        |
| `npm run lint`         | Runs ESLint over the project                  | Checking style                            |
| `npm run format`       | Runs Prettier and rewrites files in place     | Formatting before a commit                |
| `npm run format:check` | Runs Prettier in check-only mode              | Verifying formatting in CI or before a PR |
| `npm test`             | Runs the Vitest suite once and exits          | Verifying tests pass                      |
| `npm run test:watch`   | Runs Vitest in watch mode                     | Interactive test-driven work              |
| `npm run preview`      | Serves the built `dist/` output               | Confirming a production build             |

`npm test` runs once and exits — it does not watch. `npm run test:watch` is the watch-mode variant for interactive
work.

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
  main.tsx        Vite mount point
  App.tsx         placeholder component
  styles/
    global.css    plain CSS
  __tests__/
    smoke.test.ts placeholder Vitest spec
public/
  favicon.svg
```

The application structure beyond this is deliberately undecided — no subfolder convention, module boundary, or
configuration surface has been chosen yet.

## Two inherited constraints

- Runtime dependencies are exactly `react` and `react-dom`. A third dependency needs explicit justification and the
  developer's approval.
- `erasableSyntaxOnly` is on, so `enum` and `namespace` are unavailable project-wide; constant maps use the
  `as const` object form instead.

## Continuous integration

Workflow `CI`, at `.github/workflows/ci.yml`, runs on **every push and every pull request**. One job on
`ubuntu-latest`:

| Step                 | Command             |
| -------------------- | ------------------- |
| Install dependencies | `npm ci`            |
| Lint                 | `npm run lint`      |
| Typecheck            | `npm run typecheck` |
| Test                 | `npm test`          |
| Build                | `npm run build`     |

Any failing step fails the run. Results appear on the commit and as checks on any pull request. The job requests
`contents: read` only — this project needs no secret and defines none.

Running those five commands locally is a dry-run of CI. If they pass on your machine, the run should be green.
