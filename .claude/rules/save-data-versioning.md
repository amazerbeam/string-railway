# Save data versioning

## What

Every value this game persists goes through `src/persistence/`. It is written as a `{ version, data }` envelope stamped with `SAVE_SCHEMA_VERSION`. Its key is composed only by `saveKeyFor(section)` — never by string concatenation at a call site. A reader that meets a version it does not recognise returns its default and reports `SaveReadOutcome.VersionMismatch` rather than deserialising the payload.

## Why

Storage keys and persisted field names bind by string and sit outside the type checker's view (`.claude/workflow/web-project.md` → Correctness traps), so a rename type-checks cleanly and silently orphans every save. Unlike every other kind of breakage in this prototype, a bad save shape damages data the developer cannot regenerate by re-running the app — there is no rebuild step that fixes a corrupted or orphaned record on a player's disk.

## When to enforce

Any ticket that adds a field to a persisted shape, changes an existing field's type, renames a section, or reads/writes storage at all. Queued consumers as of DLR-106: DLR-113 (Vault), DLR-118 (Vault end-of-run screen), and DLR-123 (persistent deck).

## How to verify

- **Lint-enforced, not just grep-checked.** `eslint.config.js` restricts the `localStorage` and `sessionStorage` globals across `src/**/*.{ts,tsx}`, with `src/persistence/browserStorage.ts` as the sole `ignores` entry — `npm run lint` fails on any other file that names either global directly.
- A manual grep is still useful for a quick, no-lint check: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`. Run against this codebase on 2026-08-23 it returned three hits, all in files the pattern is expected to touch: two in `src/persistence/browserStorage.ts` (the real, sanctioned access — one in a docblock describing it, one the actual `globalThis.localStorage` read) and one in `src/persistence/saveStore.ts` (docblock prose referencing `localStorage.clear()` while explaining why `clear()` never calls it) — not real storage access. The pattern still can't distinguish prose from code, so treat any hit outside `browserStorage.ts` as something to read, not something to auto-fail on; the ESLint rule above is the actual gate.
- `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'"` returns hits only in `src/persistence/config.ts`.
- A breaking payload change is accompanied by a `SAVE_SCHEMA_VERSION` bump in the same task.

## Reject conditions

1. Reject a change that calls `localStorage` or `sessionStorage` outside `src/persistence/browserStorage.ts` — lint-enforced via `eslint.config.js`'s `no-restricted-globals` override on `src/**/*.{ts,tsx}` (ignoring `browserStorage.ts`), so `npm run lint` catches this before review does.
2. Reject a change that composes a storage key by string concatenation rather than through `saveKeyFor`.
3. Reject a change that writes a bare payload instead of a `{ version, data }` envelope.
4. Reject a change that changes a persisted shape incompatibly without bumping `SAVE_SCHEMA_VERSION` in the same task.
5. Reject a change that casts a parsed payload with `as T` instead of narrowing it through a type guard.
6. Reject a change that turns a read failure into a silent success — a `catch` that returns the default without also returning the non-`Loaded` outcome that names why.
