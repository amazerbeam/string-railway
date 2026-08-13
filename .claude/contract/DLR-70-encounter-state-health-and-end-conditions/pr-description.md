# DLR-70 — Encounter state: two health bars, damage application, and the end conditions

Plan: [`plan.md`](./plan.md) in this folder.
Ticket: https://amazerbeam.atlassian.net/browse/DLR-70

## Summary

Adds the pure arithmetic core of an encounter:

- **`src/hunt/encounter.ts`** (new) — `startEncounter`, `applyHunt`, `isEncounterResolved`, plus the module-private `deplete`, `resolveWinner`, and `assertApplicable` helpers. `startEncounter` seeds both bars from DLR-66's configured totals (`PLAYER_START_HEALTH`, `quarryHealthForEncounter`). `applyHunt` subtracts each side's incoming damage exactly once — the other side's dealt damage, never a side's own — and resolves the encounter the instant a bar reaches zero.
- **The single clamp** — `deplete` (`Math.max(0, current - damage)`) is the one place in the module that writes a health value. That single line is simultaneously AC6 (health never goes negative) and AC5 (surplus/overkill damage is discarded and leaves no trace anywhere in the returned state) — the two acceptance criteria collapse to one line seen from two directions.
- **`pendingHuntDamage`** (`src/warCouncil/scoring.ts`) — the same §1 equation evaluated against a mid-Hunt `RoundState`, for a readout drawn every trick rather than only at Hunt-end. It shares the extracted `outcomeFor` helper with the existing `huntDamage`, so there is exactly one arithmetic path and no way for the two to drift (AC3).
- **`duelSideDamage`** (`src/warCouncil/scoring.ts`) — the one `PlayerSide` → `DuelSide` crossing adapter, turning a `HuntOutcome` into the two plain `DuelSide`-keyed numbers `applyHunt` accepts.

## Scope extension into `src/warCouncil/scoring.ts`

The plan's Phase 1 covers `src/hunt/` alone; Phase 2 extends into `src/warCouncil/scoring.ts`. **The developer approved this scope extension at the planning gate (2026-08-12).** The reason: AC3's pending damage needs the §1 equation evaluated against a mid-Hunt `RoundState`, and `src/hunt/` cannot reach a `RoundState` — that type, and the `PlayerSide` vocabulary it's keyed by, live in `src/warCouncil/`. `outcomeFor` was extracted there as a private helper shared by both `huntDamage` (existing) and `pendingHuntDamage` (new), with `huntDamage`'s exported signature and guards unchanged — verified as a pure cut-and-paste refactor before any new behaviour was added (see Defender note below).

## Two decisions the developer owns

1. **§9's "486 left" reading.** Both figures in `hybrid-design.md` §9 are asserted directly in `encounter.test.ts`'s AC8 boundary case, so nothing was blocked: 486 is the player's health *entering* Hunt 4 at the 7-tricks-a-Hunt boundary line; 198 is the health at the moment the Quarry's bar empties on that same Hunt, because both bars deplete simultaneously. If 486 was intended as the *post-victory* figure, it is `hybrid-design.md` §9's wording that wants amending — not this code, which computes both instants correctly and just needed the ambiguity pinned down as two separate assertions.
2. **Whether `applyHunt` should throw or no-op on an already-resolved encounter.** Currently throws a `RangeError`, treated as a design reading rather than a documented rule. If DLR-71 would rather call it idempotently (e.g. a render loop that calls `applyHunt` defensively), changing the throw to a no-op `return encounter` is a one-line change.

## Verification results (Phase 3, quoted)

- `npm run typecheck` — `tsc -b` exits 0, no output.
- `npm run lint` — `eslint .` exits 0, no output.
- `npx vitest run --project node` → `Test Files  28 passed (28)`, `Tests  552 passed (552)`.
- `npx vitest run --project dom` → `Test Files  9 passed (9)`, `Tests  52 passed (52)`.
- `npm test` (unfiltered) → `Test Files  37 passed (37)`, `Tests  604 passed (604)`, exit 0.
- `npm run build` — exit 0, `dist/` written, **63 modules transformed**, no bundler errors.
- Scoped `npx prettier --check` over the 7 contract files (post-fix re-run):
  ```
  Checking formatting...
  All matched files use Prettier code style!
  ```
- Repo-wide `npm run format:check` — exit 1, `Code style issues found in 27 files.` All 27 are **pre-existing** `.docs/**` and `.github/**` offenders (design docs, implementation docs, `.github/copilot-instructions.md`, `.github/instructions/mermaid.instructions.md`); **none belongs to this contract**.
- Defender's independent full-module run, evidence the `outcomeFor` extraction regressed no existing `huntDamage` consumer: `npx vitest run src/warCouncil` (17 files) → **370/370 passed**, confirming `WarCouncilRound.tsx`, `RoundOverPanel.tsx`, `huntEnumeration.test.ts`, and `standingSegments.ts` all behave identically after the extraction. `git diff HEAD -- src/warCouncil/scoring.ts` confirmed the extraction is a pure cut-and-paste with only the parameter renamed (`finalState`→`state`) and a comment reworded — no logic changed.

One fix pass was needed: `src/hunt/encounter.ts:6`'s type-only import from `./types` was written on one line (102 characters against the project's `printWidth: 100`), the only file in either changed tree to fail `prettier --check`. Fixed with `npx prettier --write src\hunt\encounter.ts` — a whitespace-only wrap, no semantic change, confirmed by re-running the scoped Vitest suite (62/62 passed) and both gates (typecheck, lint) after the reformat.

## Note for future contributors

**`src/hunt/` must not import `src/warCouncil/`** — `src/warCouncil/` already imports `src/hunt/`, so the reverse would be a cycle. This is why damage crosses the module boundary as two plain `DuelSide`-keyed numbers via `duelSideDamage`, rather than as a `HuntOutcome` (which is keyed by `PlayerSide` and defined in `src/warCouncil/`). This boundary is convention-enforced by this contract's design, not lint-enforced — there is no ESLint rule blocking the import today.

## Not playable yet

This contract adds the arithmetic core only — no surface, no interaction, no bars rendered anywhere. DLR-71 adds the health bars and wires them to this module.
