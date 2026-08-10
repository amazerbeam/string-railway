## DLR-48 — Hunt configuration module and Hunt domain types

Plan: [`plan.md`](./plan.md)

### Summary

Adds `src/hunt/` (`types.ts` + `config.ts` + `index.ts`) holding the Hunt vocabulary and every §9-cited tunable behind one resolver; extends the existing `src/warCouncil/**` pure-core ESLint boundary to also cover `src/hunt/**`; corrects `web-project.md`'s stale "no boundary enforced" claim.

Nothing in the running game changes — `scoring.ts` is untouched per AC7.

### What's new

- `src/hunt/types.ts` — the §10 vocabulary as types: `Hunt`, `Quarry`, `Spoils`, `Standing`, `Demand`, `QuarryCharacter`.
- `src/hunt/config.ts` — the Standing band table (`STANDING_BANDS`) + resolver (`resolveStanding`), card base value rule (`cardBaseValue`), Demand curve shape (`DemandCurve` / `DEMAND_CURVE`), Forage budget (`FORAGE_BUDGET_PER_ENCOUNTER`), encounters per run (`ENCOUNTERS_PER_RUN`).
- `src/hunt/__tests__/config.test.ts` — Vitest coverage for everything in `config.ts`, including the 0–13 full-coverage/no-gap/no-overlap invariant and a mutation test proving the resolver is table-driven.
- `src/hunt/index.ts` — barrel export, mirrors `src/warCouncil/index.ts`.
- `eslint.config.js` — the existing pure-core rule block's `files` array now also matches `src/hunt/**/*.{ts,tsx}` (no second block).
- `.claude/workflow/web-project.md` — "Architectural boundaries" section corrected: it previously claimed no import boundary is enforced anywhere in this repo, which was stale as of the `src/warCouncil/**` boundary already on disk; now states both trees the boundary covers.

### Decisions already made at the planning/approval gate

- `DEMAND_CURVE` ships with `base` and `growthPerEncounter` both `null`. No number was chosen — this is deliberate and explicitly deferred to a future playtest/UI pass, not invented here. A consumer must not coerce `null` to `0`; this is documented at the constant's definition and covered by a test asserting both fields stay `null`.
- `FORAGE_BUDGET_PER_ENCOUNTER = 4` and `ENCOUNTERS_PER_RUN = 5` are provisional developer-set values transcribed per DLR-48 AC3, not invented mid-implementation.
- The Standing multiplier table (`STANDING_BANDS`) is transcribed from the printed table per §9; band *boundaries* are fixed by §1, only the multiplier column is a live/undecided design question, called out in a comment at its definition.

### Verification

Run this phase (Implementer, scoped gates):
- `npm run typecheck` — exit 0, no errors.
- `npm run lint` — exit 0, no errors.
- Task 9 grep (React/DOM references inside `src/hunt/`) — zero hits.
- Task 10 grep (duplicate declaration of any of the six new config exports outside `src/hunt/config.ts`) — zero hits.
- Task 10 grep (`DEMAND_CURVE` unset) — exactly one match each for `base: null` and `growthPerEncounter: null`.

**Pending QA** (unfiltered suite and production build are QA-only per `.claude/workflow/web-project.md`'s runner policy — not run by the Implementer this phase):
- `npm test` — unfiltered full suite.
- `npm run build` — production build.

### Note for future contributors

`src/hunt/**` now carries the same pure-core ESLint boundary as `src/warCouncil/**` — extend the `files` array in `eslint.config.js`, don't add a second block, the next time a pure-logic tree is added.
