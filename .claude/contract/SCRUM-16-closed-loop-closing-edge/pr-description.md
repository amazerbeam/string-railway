# SCRUM-16 — Closed loops stored corners-only: the closing edge is invisible to `touchesPath` and `crossings`

- Ticket: <https://amazerbeam.atlassian.net/browse/SCRUM-16>
- Plan: [`plan.md`](./plan.md) · Execution checklist: [`tasks.md`](./tasks.md)

## Summary

The border and the mountain are closed rings stored **corners-only** — the first point is not repeated at the end, so the edge from the last vertex back to the first exists in the game but not in the array. `containment.touchesPath` and `geometry.crossings` iterate `j < other.length - 1`, so that closing edge was never tested. On a 4-player board that is 1000 of 4000 world units of wall (1333 on the triangle) with no geometry behind it.

Two silent consequences, both now fixed:

1. **An illegal station placement could commit.** A card flush against the untested stretch passed §5.2 check 1, and `rectFullyInside` let it through too because the card's left edge is *collinear* with the wall. Contradicted SCRUM-1 Definition of Done item 10.
2. **A mountain crossing could score 0 instead of −1.** The §10.3 / M10 penalty missed the mountain's 48th edge — the §5.4 page-7 penalty, failing silently.

**Storage is unchanged.** Fix shape (b) was chosen: `generateSetup` still writes corners-only, and a new module owns the wrap decision so no consumer re-derives it.

### What changed

- **New `src/rules/pathGeometry.ts`** (55 lines, pure) — the one owner of the wrap decision:
  - `isClosedPathKind(kind)` — true for `BORDER` and `MOUNTAIN` (§4.1 steps 2 and 4).
  - `closeLoop(loop)` — repeats the first point; returns the input unchanged when `length < 2`, so a one-point loop cannot become a zero-length segment.
  - `edgePolyline(placedPath)` — a wrapped copy for a closed kind, the stored array **by reference** for an open one. That no-op is load-bearing: calling it unconditionally costs nothing on a railway string, so "always call it when the source is a `PlacedPath` and the predicate walks edges" is a rule with no reason not to obey.
- **The convention is recorded on the type**, where a reader will be standing: a doc comment on `PlacedPath.path` in `src/rules/types.ts` (comment only, no type change) and a note on `rectFullyInside` / `pathFullyInside` in `src/rules/containment.ts` (comment only, no body change).
- **Four call sites routed through the helper** — `validate.ts` check 1; `validate.ts` §10.2 check 10 (one hoisted `otherEdges` shared by `crossings` and `touchesPath`, so the two branches cannot drift apart); `scoring.ts` §10.3 crossing penalty (both arguments); `BoardOverlays.tsx`'s debug crossing overlay (both sides, since either path in a pair can be a loop).
- **Seven hand-rolled `[...loop, loop[0]]` wraps and one duplicated closed-kind set collapsed** onto the shared exports — `setupValidation.ts`'s private `closed()` (4 uses), five in `setupSamplers.ts`, one in `setup.ts`, and `BoardTerrain.tsx`'s private `CLOSED` set. Behaviour-preserving; `generateSetup` stays byte-identical for a given seed.

### The convention, for future contributors

**Anything walking `points[i] → points[i+1]` over a `PlacedPath` calls `edgePolyline`.** The three predicate families are documented on `PlacedPath.path`:

| Family | Members | Argument |
|---|---|---|
| Edge-walking | `touchesPath`, `touchesRect`, `crossings`, `selfIntersects`, `arcLength`, `pointTouchesPath` | `edgePolyline(p)` |
| Loop-argument | `rectFullyInside`, `pathFullyInside` (their `loop` parameter) | `p.path` — wraps internally via `loopEdges` |
| Endpoint-sensitive | `entryCount`, `passesThrough`, `endsOn` | `p.path` — a wrap collapses start onto end |

This is enforced by documentation and review, not by the compiler. A branded `ClosedPolyline` type would enforce it, but would touch every `containment.ts` signature and every existing spec — deliberately deferred. **If this regresses once more, the branded type is the answer and should be its own ticket.**

## Regression tests

Three tests assert the closing edge by name; each was written first and confirmed failing against the old code.

| Test | Before | After |
|---|---|---|
| `validate.test.ts` — *rejects a card flush against the border's CLOSING edge with TOUCHES_STRING (SCRUM-16)* | A 20×20 card at `(0, 240)` against the 500×500 border was **accepted** — `touchesRect` never walked the left wall, and `rectFullyInside` accepted a collinear edge | Rejected with `STATION_REJECTION_REASON.TOUCHES_STRING` |
| `scoring.test.ts` — *counts a crossing of the mountain's CLOSING edge as −1 (§10.3, M10 — SCRUM-16)* | A rail cutting the mountain's final edge produced **0 crossings** and scored 0 | `crossings` length 1, `lost: 1`, `net: -1` |
| `validate.test.ts` — *does not reject a path that genuinely crosses the mountain's CLOSING edge, even though it grazes the mountain elsewhere (SCRUM-16)* | Rejected `DEGENERATE_TANGENCY` — `crossings` missed the closing edge so `genuinelyCrosses` was false while `touchesPath` saw a 0.3-unit graze | `{ ok: true }`; per M8 and §10.3 a genuine crossing is **scored, not rejected** |

Plus 10 unit cases in the new `pathGeometry.test.ts`, one of which captures the entire bug in two lines: `crossings(seg, border.path)` has length 0 while `crossings(seg, edgePolyline(border))` has length 1.

### One pre-existing fixture amended (developer-approved, 2026-08-01)

`scoring.test.ts`'s pre-existing *"charges −1 for crossing the mountain, the river and the border alike (M10)"* used a **two-point** `PATH_KIND.MOUNTAIN` fixture — a bare segment enclosing no area. `edgePolyline` correctly wrapped it into a retraced edge, so the rail crossed the same physical segment twice and the case failed with 4 crossings where 3 were expected.

This was reported rather than silently patched, per `plan.md`'s own instruction. The developer approved amending the fixture to a genuine 4-vertex polygon `[p(150,200), p(350,200), p(350,460), p(150,460)]`, shaped so its second crossing of the rail's line falls beyond the rail's `y` extent — a closed loop always crosses an infinite line an even number of times, which is why a naive box straddling the rail would still give two. **Every original assertion is preserved verbatim**; only the fixture geometry changed. `closeLoop`'s `length < 2` guard and the Phase 1 spec case asserting the two-point there-and-back wrap were deliberately left unchanged.

No production path can reach `edgePolyline` with a degenerate `BORDER` or `MOUNTAIN` — `sideCountFor` always returns 3/4/5 and `sampleMountain` always builds a `MOUNTAIN_SEGMENTS`-gon — so the risk is confined to hand-written fixtures, which is where it surfaced and where it was fixed.

## Verification results

Quoted, not paraphrased.

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, no output |
| `npm run lint` | exit 0, no errors, no warnings, no `eslint-disable` in any changed file |
| `npm run format:check` | `All matched files use Prettier code style!` |
| `npm test` | `Test Files  1 failed \| 16 passed (17)` · `Tests  1 failed \| 254 passed (255)` |
| `npm run build` | exit 0 — `dist/index.html`, CSS 6.66 kB, JS 236.71 kB, `✓ built in 671ms` |

The single failure is **pre-existing and unrelated to SCRUM-16** — see below.

`plan.md` predicted a 231 → 244 baseline. The real total is 255 because other contracts have added tests since planning; the prediction is stale, not a lost test.

**Greps (Task 10–11):**

- `src/rules/` boundary (`from 'react'|\bwindow\.|\bdocument\.|localStorage`) — **zero hits**
- Surviving hand-rolled wraps in production source (`\.\.\.\w+,\s*\w+\[0\]\]`) — **exactly one hit, `pathGeometry.ts:38`**, which is `closeLoop`'s own body: the sanctioned single owner. The plan's grep does not exclude the defining line. The four deliberate spellings in `__tests__/setup.test.ts` and `__tests__/containment.test.ts` are untouched — a test that spells the wrap out asserts *against* the convention rather than consuming it.
- `function closed` in `setupValidation.ts` / `const CLOSED` in `BoardTerrain.tsx` — **zero hits from both**, confirming the private helpers are gone
- Tunable literals (`350|700|1400|4000|120`) across the nine touched files — **zero hits**

**File sizes (Task 12)**, measured with `(Get-Content <file> | Measure-Object -Line).Lines`, the command `CLAUDE.md` mandates:

```
src\rules\pathGeometry.ts               = 55
src\rules\types.ts                      = 162
src\rules\containment.ts                = 373
src\rules\validate.ts                   = 200
src\rules\scoring.ts                    = 191
src\rules\setupValidation.ts            = 178
src\rules\setupSamplers.ts              = 312
src\rules\setup.ts                      = 244
src\ui\BoardOverlays.tsx                = 87
src\ui\BoardTerrain.tsx                 = 69
src\rules\__tests__\pathGeometry.test.ts = 60
src\rules\__tests__\validate.test.ts    = 377
src\rules\__tests__\scoring.test.ts     = 380
```

All under the 400 budget. **Note for reviewers:** the defensive review measured with raw `(Get-Content <file>).Count`, which counts blank lines and reports `containment.ts` 401, `validate.test.ts` 429, `scoring.test.ts` 457. The project's gate is the `Measure-Object -Line` form above, so no file breaches it — but the two spec files are larger than `plan.md` forecast (~355–365) and are natural split candidates along their existing `describe` boundaries if the raw count is the standard you actually want. That is your call, not a defect.

## Pre-existing failure, NOT introduced by this PR

```
src/rules/__tests__/setup.test.ts > generateSetup against the shipped rules.json >
  emits a board that passes validateSetup for every player count across 20 seeds (AC9)

SetupGenerationError: generateSetup failed for 3 players at seed 0: RIVER_TOO_NEAR_MOUNTAIN
  (no river placement found in 200 attempts — the board may be too cramped for
   riverLength 700 to clear the mountain by cardSize 120 (see §12))
```

**Verified by stashing every SCRUM-16 change and re-running: it still fails.** It originates in another contract's uncommitted `setupSamplers.ts` work, currently in the working tree. The message reads as an M2 tuning symptom — `riverLength 700` versus `cardSize 120` on a cramped 3-player board — which §12's symptom-to-cause table covers and which is a `rules.json` decision, i.e. yours. Whoever owns the concurrent `setupSamplers.ts` change owns this.

## Developer decides or observes

Copied verbatim from `tasks.md`. *(Nothing blocked execution — no tuning value, no rule reading, no dependency.)*

- **Whether Phase 3 should have touched the seeded generator at all.** `setupSamplers.ts` is neither in SCRUM-16's file list nor buggy; its five wraps are collapsed so the wrap has one owner. Behaviour-preserving by inspection and covered by `setup.test.ts`'s unmodified determinism specs — but it is the developer's call whether a bug-fix contract edits the board generator. **Phase 3 can be reverted whole without affecting Fixes 1–4.**
- **`closeLoop`'s `length < 2` guard is stricter than the `closed()` it replaces** (`=== 0`). No production path produces a one-point loop, so this should be invisible; worth a glance at review.
- **`BoardOverlays.tsx` ships verified by typecheck and by the tested helper, not by a spec** — the suite is `environment: 'node'` with an `include` glob of `*.test.ts`, so a `.test.tsx` is not collected (the SCRUM-8 debt item).
- **After SCRUM-5 lands:** whether a card refusing to sit flush against that stretch of wall feels right or reads as a needlessly cramped board. An M2 `borderPerimeter` / `cardSize` question surfaced by a now-correct rule — see §12's symptom table. Nothing in this contract is observable by running the app today: the board renders identically and the crossing overlay is empty on a fresh board by construction.

Additionally, from this run:

- **The M10 fixture amendment above** is already approved; noted here so the reviewer sees why a pre-existing test changed.
- **The two spec files' raw line counts** (429 / 457 including blanks) — split or accept, as described under File sizes.

## Notes

- No `rules.json` key added, renamed, or revalued. No `Move`, `GameState`, or persisted shape touched — nothing is persisted yet, and the plan records that the window for changing a stored shape without migration is **still open** as of this contract.
- No new dependency. No `any`. No `eslint-disable`. No `console.log` / `console.debug`.
- `src/rules/` purity boundary holds — `pathGeometry.ts` imports only `../constants/game` and `./types`.
- `entryCount(newPath.path, …)` in `scoring.ts` and `validate.ts` is deliberately left on the stored array: it is endpoint-sensitive, and a wrap would collapse `path[0]` onto `path[length-1]`.
- `BoardTerrain.tsx` keeps `toPathData(path.path, …)` unwrapped — `toPathData` reads vertices and emits `Z`, so a wrapped copy would repeat a vertex before the `Z`.
