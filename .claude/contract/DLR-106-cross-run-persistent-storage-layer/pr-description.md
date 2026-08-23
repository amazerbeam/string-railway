# DLR-106 — Cross-run persistent storage layer

Plan: [`plan.md`](plan.md)

## Summary

Adds one new top-level module, `src/persistence/`, giving the codebase a single typed, namespaced, version-enveloped way to store a small JSON blob and read it back on a later page load — never throwing, and always naming why a read produced no stored data.

- Five source files: `config.ts`, `storageDriver.ts`, `browserStorage.ts`, `saveStore.ts`, `index.ts`.
- Two specs: `__tests__/storageDriver.test.ts`, `__tests__/saveStore.test.ts`.
- No pre-existing `src/` file was modified, apart from `eslint.config.js` gaining a new boundary override in this fix pass (see below) — the module was purely additive.
- No new dependency.
- Nothing in the app calls this module yet. It has no consumer today; DLR-113 (Vault), DLR-118 (Vault end-of-run screen) and DLR-123 (persistent deck) are the queued first callers.

This PR also adds `.claude/rules/save-data-versioning.md`, the project's first shared rule, constraining every future ticket that persists a value.

## Fix pass on review feedback

Three reviewers (code-evaluator, defender, QA) ran against the initial implementation. Code-evaluator approved outright. This pass addressed the defender's three warnings and QA's two documentation failures:

- `saveStore.ts`'s `read()` and `clear()` now guard `storage.getItem` and `storage.removeItem` with the same try/catch shape already used for `setItem`, so the module's documented "never throws" guarantee is actually true for all three operations, not two of three. Two new specs cover the added branches.
- The rule's own "How to verify" grep is rewritten to anchor on real storage access (`globalThis\.localStorage` / `.getItem(` etc.) rather than the bare word, and the file records the real output of running it.
- The boundary the rule promises is now lint-enforced: `eslint.config.js` gained a `no-restricted-globals` override on `src/**/*.{ts,tsx}` restricting `localStorage`/`sessionStorage`, with `src/persistence/browserStorage.ts` as the sole exemption. `npm run lint` now fails if any future file calls either global directly instead of going through `createSaveStore`.
- `.claude/rules/README.md` no longer asserts its index is or was recently empty.
- This file was written.

## Developer decisions (copied from `tasks.md` → File map → Developer decides or observes)

- **`src/persistence/config.ts` → `SAVE_NAMESPACE = 'strings-and-stations'`** — the one literal that cannot be changed after a real save exists in a real browser without orphaning it. Chosen from the repository name over the game's working title because the title has already changed once. Ten seconds of attention now, none ever again.
- **`createSaveStore`'s mandatory `isValidData` guard** — heavier API for DLR-113 in exchange for making an unchecked `as T` cast impossible. Reversible in one line if the developer would rather the Vault ticket trust the envelope.
- **Whether a save whose version cannot be migrated should be discarded rather than ignored.** This ticket detects `VersionMismatch` and returns the default; deleting a stale Vault balance is a player-facing design call and belongs to DLR-113.
- `.claude/rules/save-data-versioning.md`'s reject conditions — read by `/fb-plan` and all four reviewers from the moment the file exists, so this is the part of the ticket whose blast radius extends past the module. Worth reading in full.
- Nothing on this ticket is judgeable by running the app. Nothing renders and no code path is reachable from the UI; QA finding the app unchanged is the correct result, not a gap.

## Verification (re-run after the fix pass)

- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0 (includes the new `src/**` storage-global boundary).
- `npx vitest run src/persistence` — `Test Files  2 passed (2)`, `Tests  29 passed (29)`.
- `npm test` — `Test Files  1 failed | 83 passed (84)`, `Tests  1 failed | 1061 passed (1062)`. The sole failure is `src/hunt/__tests__/envenom.test.ts :: "does NOT add a Cheat"`, a known pre-existing failure that predates this work, fails identically on clean `master`, and is out of this contract's scope.
- `npm run build` — exit 0, `dist/` written, no bundler errors.
- `npx prettier --check` on every file this contract touched, including `eslint.config.js` — all pass.

## New convention

Anything that must survive a run goes through `src/persistence/`, in a `{ version, data }` envelope, under a key composed by `saveKeyFor` — written down as `.claude/rules/save-data-versioning.md`, now lint-enforced.
