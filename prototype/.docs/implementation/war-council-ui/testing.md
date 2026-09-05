_Part of [War Council UI](README.md)._

### The two-project Vitest layout

`vite.config.ts` carries a `test.projects` array rather than a flat `test` block: a `node` project
(`environment: 'node'`, `include: ['src/**/__tests__/**/*.test.ts']`) and a `dom` project
(`environment: 'jsdom'`, `include: ['src/**/__tests__/**/*.test.tsx']`), both `extends: true` so the
React plugin is inherited. **A `.test.tsx` file is collected only by the `dom` project and a
`.test.ts` only by the `node` one** — put a component spec in a `.ts` file and it silently never
runs.

The split exists so the DOM environment does not become global: flipping `environment` to `jsdom`
wholesale would remove the no-DOM guarantee from every pure-logic spec in the repo at once. `jsdom`,
`@testing-library/react`, and `@testing-library/dom` are devDependencies — **no runtime dependency
was added.** `afterEach(cleanup)` is declared per spec file rather than in a `setupFiles` entry,
because a global setup file would import `@testing-library/react` into every node-environment spec
and break them.

Specs query by accessible role and name only — `data-testid` has zero hits in `src/` and this module
adds none.
