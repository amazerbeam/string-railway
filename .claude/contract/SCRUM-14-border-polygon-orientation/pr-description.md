# SCRUM-14 — Decide border polygon orientation (even-sided borders present a flat edge at the top)

- Plan: [`plan.md`](./plan.md) (this folder)
- Ticket: <https://amazerbeam.atlassian.net/browse/SCRUM-14>

## The AC1 decision

**Even side counts are rotated by half a step so an edge is centred at the top; odd side counts keep a vertex at the top.** Decided 2026-08-01, during planning, as the answer to AC1's "a decision is recorded on whether even-sided borders should be rotated." This is the durable record AC1 asks for, alongside `regularPolygon`'s doc comment in `src/rules/setupSamplers.ts`, which states the same rule and the reasoning behind it.

Concretely: the start angle is `-pi/2 - pi/n` for even `n`, and stays `-pi/2` for odd `n`. The developer chose this over a narrower `sideCount === 4` special case, accepting that the 48-gon mountain loop (also even) rotates by 3.75 degrees as a side effect, and that a given seed therefore regenerates a marginally different mountain than the pre-SCRUM-14 build.

## Summary of the change

One hoisted `startAngle` local inside `regularPolygon` (`src/rules/setupSamplers.ts`), its doc comment rewritten to state the per-parity orientation rule and why, and three orientation specs in `src/rules/__tests__/setup.test.ts` replacing the single "vertex 0 is topmost" assertion. No view code, no config, no new types, no `rules.json` key.

- `src/rules/setupSamplers.ts` — the loop's angle expression now reads `startAngle + (2 * Math.PI * i) / sideCount` instead of a fixed `-Math.PI / 2 + …`; `startAngle` is computed once above the loop as `-Math.PI / 2 - (sideCount % 2 === 0 ? Math.PI / sideCount : 0)`. Nothing else in the function (perimeter, circumradius, edge length, the throw guards, the returned array shape) changed.
- `src/rules/__tests__/setup.test.ts` — the old clockwise-winding-plus-topmost-vertex test is now three specs: clockwise winding for every side count tested (3, 4, 5, 48), a vertex-at-top spec for odd counts (3, 5), and a flat-top/axis-aligned-box spec for the 4-gon.

## Measured before/after

At perimeter 4000 (the value used throughout the existing `describe('regularPolygon')` block), the 4-gon's axis-aligned bounding box goes from **1414.214 per side to 1000.000 per side** — a factor of exactly √2. That factor is where the viewport gain comes from: the pre-existing vertex-at-top orientation puts the square's diagonal, not its side, along each axis.

## Developer decides or observes

Copied verbatim from `tasks.md`'s File map:

- **AC1 — the orientation decision.** Answered 2026-08-01: rotate all even side counts. No further action unless it looks wrong on screen; the revert is one expression.
- **Whether the axis-aligned square reads better and uses the space better** — the ticket's whole premise. Needs `npm run dev` and your eyes on a 4-player and a 2-player board.
- **Whether the triangle and pentagon still look right beside it** — they are geometrically unchanged, but the square now looks different next to them.
- **Whether the larger effective board changes how cramped the M2 constants feel.** If it does, that is a `rules.json` change and yours to make (§12).
- **If a seed in the 30-seed legality sweep now fails** — real information about how cramped the shipped M2 constants are, routed to you via §12. Not to be resolved by changing the seed in the test.
  **OBSERVED 2026-08-01 (Task 2, Step 1):** seed 0 at 3 players now fails —
  `SetupGenerationError: generateSetup failed for 3 players at seed 0:
  RIVER_TOO_NEAR_MOUNTAIN (no river placement found in 200 attempts — the board
  may be too cramped for riverLength 700 to clear the mountain by cardSize 120
  (see §12))`. Left untouched per this file's instruction; routed here for your
  §12 call. `Status` set to `BLOCKED` in `tasks.md` pending your decision.
- **Whether §4.3 or §14 of `.docs/Game_Rules/Rules.md` should absorb a sentence about orientation.** Rules.md is the specification; this contract does not edit it.
- **Every seeded board changes.** A bug previously reproduced by quoting a seed will not reproduce from that seed on this build. Nothing is persisted, so there is nothing to migrate.
- **SCRUM-14 is not transitioned and no Jira comment is posted** — `management-jira` was deliberately not ticked.

## Pre-existing shipped-`rules.json` sampler failure — NOT caused by this contract

`npm test` on this build reports one failing test in `src/rules/__tests__/setup.test.ts`:

```
generateSetup against the shipped rules.json > emits a board that passes validateSetup
for every player count across 20 seeds (AC9)

SetupGenerationError: generateSetup failed for 3 players at seed 0: RIVER_TOO_NEAR_MOUNTAIN
(no river placement found in 200 attempts — the board may be too cramped for riverLength 700
to clear the mountain by cardSize 120 (see §12))
```

This was investigated thoroughly before this contract began work, and the measured facts are:

- Measured against a pristine `HEAD` worktree (before this contract's change), the shipped `rules.json` sweep fails **19 of the 80 seed × player-count combinations** in the test's 0–19 seed range. With this contract's rotation applied it fails **18** — one fewer. The rotation marginally *improved* matters; it did not cause the failure class.
- Across 100 seeds on the shipped config: 3-player generation fails **91/100 at HEAD** and **90/100 with the rotation**. 2-player and 4-player each fail **2/100**. 5-player **never fails**.
- The shipped `riverLength` 700 / `cardSize` 120 clearance is simply too cramped for the 3-player triangle border to reliably fit a legal river placement within the sampler's attempt ceiling.
- The river sampler path (`sampleRiver` in `setupSamplers.ts`, and `setupValidation.ts`) was **not modified** by this contract.
- Resolving it means changing a value in `public/rules.json` — a developer decision under §12, not this contract's to make.

**This contract leaves the repository with one red test in `setup.test.ts` that it did not cause and did not fix.** Do not attribute it to the orientation change; do not resolve it by editing a seed, tolerance, or `TEST_CONFIG`.

## An unrelated second test failure, also out of scope

The Final-verification full-suite run (Phase 2, Task 5) surfaced a **second, different** failing test that is neither the failure above nor caused by this contract:

```
resolveScoring (§10.3) > charges −1 for crossing the mountain, the river and the border alike (M10)
AssertionError: expected [ …(4) ] to have a length of 3 but got 4
```

This contract's file scope was exactly `src/rules/setupSamplers.ts` and `src/rules/__tests__/setup.test.ts`; it never touched `src/rules/scoring.ts` or `src/rules/__tests__/scoring.test.ts`. The working tree at the time of this run contains substantial in-flight work from other contracts (SCRUM-13, SCRUM-15, SCRUM-16), which is known to modify `scoring.ts`, `containment.ts`, `validate.ts`, `types.ts`, and several `src/ui/` files. This failure is almost certainly a symptom of that concurrent, unmerged work rather than of anything in this PR — flagging it for the developer/QA to attribute correctly rather than assuming it belongs to SCRUM-14.

## Verification results

**Phase 1** (`tasks.md` Task 1, Task 2):
- `npx vitest run src/rules/__tests__/setup.test.ts -t "regularPolygon"` — exit 0, all `regularPolygon` specs pass (orientation, clockwise winding, exact perimeter, one-vertex-per-side, equal edge length, no self-intersection, centroid, throw guards).
- `npm run typecheck` — exit 0.
- `npx vitest run src/rules/__tests__/setup.test.ts src/rules/__tests__/setupValidation.test.ts` — `Tests 1 failed | 49 passed (50)`. The one failure is the pre-existing shipped-`rules.json` sampler failure described above (seed 0, 3 players). Left untouched.
- `Select-String` for stale "topmost"/"diamond" orientation claims outside the new doc comment and AC3 spec name — no hits.

**Phase 2** (`tasks.md` Tasks 3–5):
- `src/rules/` boundary grep (`from 'react'|from "react"|\bwindow\.|\bdocument\.|localStorage` over `src\rules\*.ts,src\rules\**\*.ts`) — zero hits.
- Tunable-literal grep (`\b(350|700|1400|4000|120)\b` over `src\rules\*.ts,src\ui\*.ts,src\ui\*.tsx,src\constants\*.ts`) — two hits, both in files this contract did not touch (`src\ui\boardScale.ts:33`, a comment; `src\ui\HeroScene.tsx:22`, unrelated SVG path coordinate data) — reported as out-of-scope observations, not edited.
- File sizes: `src\rules\setupSamplers.ts` = **314 lines**, `src\rules\__tests__\setup.test.ts` = **353 lines** — both under the 400-line budget.
- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0, clean.
- `npm run format:check` — exit 0, "All matched files use Prettier code style!".
- `npm test` (unfiltered) — exit 1: `Test Files  2 failed | 15 passed (17)`, `Tests  2 failed | 253 passed (255)`. The two failures are the pre-existing sampler failure and the unrelated `scoring.test.ts` failure, both detailed above and both out of this contract's scope to fix.
- `npm run build` — exit 0. `dist/index.html` 0.46 kB, `dist/assets/index-*.css` 6.66 kB, `dist/assets/index-*.js` 236.82 kB — "built in 430ms". Confirms the two test failures do not affect the production build (build does not run the test suite).

## Note for future contributors

`regularPolygon`'s vertex-0 position is a documented contract keyed on side-count parity, because §4.1 step 7's clockwise seat order is defined by walking the returned array — read the doc comment before changing the start angle.
