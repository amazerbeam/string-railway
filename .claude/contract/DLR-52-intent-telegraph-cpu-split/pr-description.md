# DLR-52 — The intent telegraph: split the CPU's move into intent and commit

Plan: [`plan.md`](./plan.md) (this folder)

## Summary

Splits `chooseCpuMove`'s single "decide and play" call into two additive entry points on `src/warCouncil/cpuPlayer.ts`, with no change to the existing CPU heuristic:

- **`quarryIntent(state, fidelity?)`** — a pure read of what the Quarry (`QUARRY_SIDE`) will do next, telegraphed only as *shape*: the lead suit, plus (at the default fidelity) whether it's pressing to win the trick or ducking. It never exposes the exact card, so §4's hidden-hand table is never violated. Covers both the leading and the following case via the same `currentTrick.length` branch `chooseCpuCard` already uses internally.
- **`commitQuarryMove(state)`** — an additive commit step that plays exactly the move `quarryIntent` described, by calling the existing, unmodified `chooseCpuMove` + `playCard` sequence.
- **`TelegraphFidelity` / `TELEGRAPH_FIDELITY`** in `src/hunt/config.ts` — the fidelity gate `quarryIntent` reads (defaulting to the module constant, overridable per call), so the telegraph's fidelity can be widened or narrowed with no other code change.

Nothing about what the CPU chooses changes — `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`, and `chooseCpuMove` are untouched by this diff. This restructuring exists to give a future screen (T7) something stable to render before the Quarry's card actually lands on the table.

## Design choice already confirmed at the approval gate

The fidelity is a real **two-value enum** (`TelegraphFidelity.Suit` / `TelegraphFidelity.SuitAndStance`, an `as const` object map per this project's `erasableSyntaxOnly` convention), not a single fixed constant. `TELEGRAPH_FIDELITY` defaults to `SuitAndStance` (§4's stated default — suit plus pressing/ducking); `Suit` is the narrower level that omits `stance` entirely from the returned `QuarryIntent`, rather than setting it to `undefined`-as-a-value. This was flagged as a risk in `plan.md` and resolved by the developer at the plan's approval gate before implementation began.

## Verification results

**Phase 1** (`src/hunt/config.ts` — `TelegraphFidelity` / `TELEGRAPH_FIDELITY`):
- `npx vitest run src/hunt/__tests__/config.test.ts` — 32 passed, 0 failed.
- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0.

**Phase 2** (`quarryIntent`):
- `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts` — 6 passed, 0 failed (at that point in the contract).
- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0.

**Phase 3** (`commitQuarryMove` + the 60-seed full-round simulation proving AC5, and the AC6 unchanged-suite check):
- `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts` — 67 passed, 0 failed (final count for this file, includes the 60-seed simulation proving intent and the committed move never disagree).
- `npm run typecheck` — exit 0.
- `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts` — 133 passed, 0 failed. `git status --porcelain` on that file actually prints `M src/warCouncil/__tests__/cpuPlayer.test.ts` — that modification traces entirely to prior, unrelated DLR-51 Monarch-simulation work already in the working tree (confirmed via `git diff HEAD` and a content grep), not to this contract. AC6 is still MET: the file is 133/133 green and contains zero references to `quarryIntent`/`commitQuarryMove`/`TelegraphFidelity`.

**Phase 4** (this phase — no production changes):
- Task 5 grep audit — `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "===\s*'suitAndStance'|===\s*'suit'|stance\s*===\s*'(pressing|ducking|leading)'"` — zero hits. `cpuPlayer.ts`'s own fidelity check reads the exported `TelegraphFidelity.Suit` symbol, not a raw string; the `as const` key-value declarations in `config.ts` / `cpuPlayer.ts` don't match this comparison pattern.
- **Task 6 (static gates + unfiltered `npm test` + `npm run build`) is delegated to QA** and is still pending as of this write-up — the Implementer runs only scoped Vitest and `npm run typecheck` per this project's division of labor; the unfiltered suite and the production build belong to QA alone.

## Note for future contributors

Any future CPU-facing telegraph should read `TELEGRAPH_FIDELITY` from `src/hunt/config.ts` rather than inlining a fidelity check of its own. Any new `QuarryIntentStance` value needs a `never`-guarded exhaustive `switch` per `react-frontend`'s "Exhaustiveness checking" section — a plain `if`/`else` chain over the three current stances will compile silently once a fourth is added.
