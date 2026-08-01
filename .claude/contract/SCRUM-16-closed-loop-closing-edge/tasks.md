# Tasks: Closed loops stored corners-only — the closing edge is invisible to touchesPath and crossings

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01
Completed: 2026-08-01

**Goal:** Keep closed loops stored corners-only, but give `src/rules/` one module that owns the wrap decision — `closeLoop` / `isClosedPathKind` / `edgePolyline` — record the convention on `PlacedPath.path`, route the four call sites that miss a ring's closing edge through the helper, and collapse the seven hand-rolled wraps already scattered through setup onto the same function.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/rules/pathGeometry.ts` — the one owner of the wrap decision: `closeLoop`, `isClosedPathKind`, `edgePolyline`.
- `src/rules/__tests__/pathGeometry.test.ts` — its spec, including the bug captured in one assertion (`crossings` finds nothing on the stored array and one point on the wrapped one).

**Modified:**
- `src/rules/types.ts:64-70` — doc comment on `PlacedPath.path` recording the corners-only convention and the three predicate families. No type change.
- `src/rules/containment.ts:112-135` — one-line note on `rectFullyInside` and `pathFullyInside` that their `loop` parameter takes the stored form.
- `src/rules/validate.ts:42-45` — **Fix 1**, §5.2 check 1: `touchesRect(edgePolyline(placedPath), …)`.
- `src/rules/validate.ts:201-209` — **Fix 2**, §10.2 check 10: both `crossings` and `touchesPath` take one hoisted `edgePolyline(otherPath)`.
- `src/rules/scoring.ts:134-136` — **Fix 3**, §10.3 crossing penalty: both arguments through `edgePolyline`.
- `src/ui/BoardOverlays.tsx:71-79` — **Fix 4**, debug crossing overlay: both sides through `edgePolyline`.
- `src/rules/setupValidation.ts:24-28,68,82,132,160` — private `closed()` deleted, four uses become `closeLoop`.
- `src/rules/setupSamplers.ts:138,148,185,186,305-311` — five hand-rolled wraps become `closeLoop`.
- `src/rules/setup.ts:102` — the `blockers` wrap becomes `closeLoop`.
- `src/ui/BoardTerrain.tsx:9,33` — private `CLOSED` set deleted, replaced by `isClosedPathKind`.
- `src/rules/__tests__/validate.test.ts` — two cases added, none modified.
- `src/rules/__tests__/scoring.test.ts` — one case added; one pre-existing case's
  mountain fixture amended (developer-approved 2026-08-01 — see Task 5).

**Deleted:** *(no files — three private helpers are deleted in place: `setupValidation.closed`, `BoardTerrain.CLOSED`)*

**Developer decides or observes:** *(nothing blocks execution — no tuning value, no rule reading, no dependency)*
- **Whether Phase 3 should have touched the seeded generator at all.** `setupSamplers.ts` is neither in SCRUM-16's file list nor buggy; its five wraps are collapsed so the wrap has one owner. Behaviour-preserving by inspection and covered by `setup.test.ts`'s unmodified determinism specs — but it is the developer's call whether a bug-fix contract edits the board generator. Phase 3 can be reverted whole without affecting Fixes 1–4.
- **`closeLoop`'s `length < 2` guard is stricter than the `closed()` it replaces** (`=== 0`). No production path produces a one-point loop, so this should be invisible; worth a glance at review.
- **`BoardOverlays.tsx` ships verified by typecheck and by the tested helper, not by a spec** — the suite is `environment: 'node'` with an `include` glob of `*.test.ts`, so a `.test.tsx` is not collected (the SCRUM-8 debt item).
- **After SCRUM-5 lands:** whether a card refusing to sit flush against that stretch of wall feels right or reads as a needlessly cramped board. An M2 `borderPerimeter` / `cardSize` question surfaced by a now-correct rule — see §12's symptom table. Nothing in this contract is observable by running the app today: the board renders identically and the crossing overlay is empty on a fresh board by construction.

---

## Phase 1 — The convention and its one owner

Creates `src/rules/pathGeometry.ts` and writes the convention down where a reader will be standing when they need it. Nothing consumes the helper yet, so this phase is purely additive: the project type-checks, every existing test still passes untouched, and no runtime behaviour changes. A safe stopping point precisely because the fixes have not landed.

### Task 1: Add `src/rules/pathGeometry.ts` — the wrap decision's single owner ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/pathGeometry.ts`
- Test: `src/rules/__tests__/pathGeometry.test.ts`

- [x] **Step 1: Write the failing spec, including the bug in one assertion**

Create `src/rules/__tests__/pathGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PATH_KIND } from '../../constants/game'
import { crossings } from '../geometry'
import { closeLoop, edgePolyline, isClosedPathKind } from '../pathGeometry'
import { makePath } from './fixtures'
import type { Polyline } from '../types'

const p = (x: number, y: number) => ({ x, y })

/** Corners only, no repeated closing point — the SQUARE convention used across
 *  containment.test.ts and fixtures.ts. Its closing edge is the left wall,
 *  (0,100) back to (0,0). */
const SQUARE: Polyline = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)]

describe('isClosedPathKind', () => {
  it('is true for the two terrain loops (§4.1 steps 2 and 4)', () => {
    expect(isClosedPathKind(PATH_KIND.BORDER)).toBe(true)
    expect(isClosedPathKind(PATH_KIND.MOUNTAIN)).toBe(true)
  })

  it('is false for the river (§4.1 step 3) and both railway kinds', () => {
    expect(isClosedPathKind(PATH_KIND.RIVER)).toBe(false)
    expect(isClosedPathKind(PATH_KIND.SHORT_RAIL)).toBe(false)
    expect(isClosedPathKind(PATH_KIND.LONG_RAIL)).toBe(false)
  })
})

describe('closeLoop', () => {
  it('repeats the first point so the closing edge becomes walkable', () => {
    expect(closeLoop(SQUARE)).toEqual([...SQUARE, p(0, 0)])
  })

  it('returns an empty loop unchanged', () => {
    expect(closeLoop([])).toEqual([])
  })

  it('returns a single point unchanged rather than manufacturing a zero-length segment', () => {
    const single: Polyline = [p(5, 5)]
    expect(closeLoop(single)).toEqual(single)
  })

  it('wraps a two-point loop into a there-and-back pair', () => {
    expect(closeLoop([p(0, 0), p(10, 0)])).toEqual([p(0, 0), p(10, 0), p(0, 0)])
  })
})

describe('edgePolyline', () => {
  it('wraps a BORDER path', () => {
    expect(edgePolyline(makePath(PATH_KIND.BORDER, SQUARE))).toEqual([...SQUARE, p(0, 0)])
  })

  it('wraps a MOUNTAIN path', () => {
    expect(edgePolyline(makePath(PATH_KIND.MOUNTAIN, SQUARE))).toEqual([...SQUARE, p(0, 0)])
  })

  it('returns the stored array BY REFERENCE for an open kind, so calling it costs nothing on a rail', () => {
    const river = makePath(PATH_KIND.RIVER, SQUARE)
    const rail = makePath(PATH_KIND.SHORT_RAIL, SQUARE)
    expect(edgePolyline(river)).toBe(river.path)
    expect(edgePolyline(rail)).toBe(rail.path)
  })

  it('makes the closing edge visible to an edge-walking predicate (SCRUM-16)', () => {
    // The whole bug in one assertion. crossings() iterates `j < other.length - 1`,
    // so on the stored array it never reaches the closing edge — the left wall
    // at x = 0 — and reports no crossing for a segment that plainly cuts it.
    const border = makePath(PATH_KIND.BORDER, SQUARE)
    const acrossTheClosingEdge: Polyline = [p(-10, 50), p(10, 50)]

    expect(crossings(acrossTheClosingEdge, border.path)).toHaveLength(0)
    expect(crossings(acrossTheClosingEdge, edgePolyline(border))).toHaveLength(1)
  })
})
```

- [x] **Step 2: Confirm the spec fails because the module does not exist yet**

Run: `npx vitest run src/rules/__tests__/pathGeometry.test.ts`
Expected: non-zero exit. Vitest reports a collection/transform failure — `Failed to load .../pathGeometry` or `Cannot find module`. This is the expected pre-implementation state, **not** a test failure to debug.

- [x] **Step 3: Create `src/rules/pathGeometry.ts`**

```ts
import { PATH_KIND } from '../constants/game'
import type { PathKind, PlacedPath, Polyline } from './types'

/**
 * SCRUM-16 — the one place that knows whether a PlacedPath's stored `path` is a
 * ring or an arc.
 *
 * §4.1 steps 2 and 4 make the border and the mountain closed loops; §4.1 step 3
 * makes the river an open arc, and both railway kinds are open strings. Every
 * one of them is stored CORNERS-ONLY (see PlacedPath.path), so a predicate that
 * walks `points[i] -> points[i + 1]` never reaches a loop's closing edge unless
 * the first point is repeated first. Before this module every consumer
 * re-derived that for itself, and four of them got it wrong.
 */

/** The path kinds stored as a closed ring. Queried with `.has()` only — never
 *  iterated, so its insertion order cannot reach a generated board. */
const CLOSED_PATH_KINDS: ReadonlySet<PathKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])

/** Whether a kind's stored `path` is a ring. Also what BoardTerrain.tsx asks in
 *  order to choose between an SVG `Z` and an open polyline. */
export function isClosedPathKind(kind: PathKind): boolean {
  return CLOSED_PATH_KINDS.has(kind)
}

/**
 * Repeats the first point at the end so consecutive-pair iteration reaches the
 * closing edge.
 *
 * A loop of fewer than two points has no closing edge and is returned
 * unchanged: wrapping a single point would manufacture a zero-length segment,
 * and a zero-length segment is exactly the degenerate input the predicates
 * downstream have to guard their divisors against
 * (geometry.segmentsCrossTransversally, containment.pointOnSegment). Guard the
 * input rather than rely on the symptom being caught later.
 */
export function closeLoop(loop: Polyline): Polyline {
  return loop.length < 2 ? loop : [...loop, loop[0]]
}

/**
 * The polyline to hand any predicate that walks `points[i] -> points[i + 1]` —
 * touchesPath, touchesRect, crossings, selfIntersects, arcLength,
 * pointTouchesPath.
 *
 * Returns a wrapped copy for a closed kind and the STORED ARRAY BY REFERENCE
 * for an open one, so calling it unconditionally on any PlacedPath costs
 * nothing when that path is a railway string. That is deliberate: it makes
 * "always call this when the source is a PlacedPath and the predicate walks
 * edges" a rule with no reason not to obey it.
 *
 * NOT for the endpoint-sensitive predicates (entryCount, passesThrough,
 * endsOn) — they read path[0] and path[length - 1], which a wrap collapses onto
 * the same vertex. NOT needed for rectFullyInside / pathFullyInside's `loop`
 * parameter, which wraps internally via containment.loopEdges. See the doc
 * comment on PlacedPath.path for all three families.
 */
export function edgePolyline(placedPath: PlacedPath): Polyline {
  return isClosedPathKind(placedPath.kind) ? closeLoop(placedPath.path) : placedPath.path
}
```

- [x] **Step 4: Run the spec and the type gate**

Run: `npx vitest run src/rules/__tests__/pathGeometry.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  10 passed`, exit 0 (2 for `isClosedPathKind`, 4 for `closeLoop`, 4 for `edgePolyline`); `npm run typecheck` exits 0 with no errors.

### Task 2: Record the convention where a reader will be standing ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/types.ts:64-70`
- Modify: `src/rules/containment.ts:112-135`

- [x] **Step 1: Document `PlacedPath.path` in `src/rules/types.ts`**

Replace the `path` member of `PlacedPath` (currently the bare `readonly path: Polyline` at line 68) with the same member carrying this comment. `id`, `kind`, `owner` and `placedOnTurn` are unchanged.

```ts
export interface PlacedPath {
  readonly id: PathId
  readonly kind: PathKind
  readonly owner: ColourId | null
  /**
   * Vertices in order. A CLOSED loop (BORDER, MOUNTAIN — §4.1 steps 2 and 4) is
   * stored CORNERS-ONLY: the first point is NOT repeated at the end, so the
   * ring's closing edge is implied, never present. RIVER (§4.1 step 3) and both
   * railway kinds are open and need no wrap.
   *
   * SCRUM-16 — three predicate families, three calling conventions:
   *  - EDGE-WALKING (touchesPath, touchesRect, crossings, selfIntersects,
   *    arcLength, pointTouchesPath) iterates `i < length - 1` and MISSES the
   *    closing edge if handed this array. Pass `edgePolyline(placedPath)` from
   *    './pathGeometry' instead.
   *  - LOOP-ARGUMENT (rectFullyInside, pathFullyInside — their `loop`
   *    parameter) wraps internally via containment.loopEdges. Pass this array.
   *  - ENDPOINT-SENSITIVE (entryCount, passesThrough, endsOn) reads path[0] and
   *    path[length - 1]. Pass this array — a wrapped copy collapses start onto
   *    end. Only ever called on open railway strings.
   */
  readonly path: Polyline
  readonly placedOnTurn: number
}
```

- [x] **Step 2: Note the loop-argument convention on the two predicates that wrap internally**

In `src/rules/containment.ts`, append one sentence to each existing doc comment. Do not change either function body.

On `rectFullyInside` (comment at lines 112-114, immediately above `export function rectFullyInside`), append after the existing final sentence:

```ts
 *  `loop` takes a PlacedPath's stored corners-only `path` — loopEdges wraps it
 *  here, so do NOT pass edgePolyline's already-wrapped result (SCRUM-16). */
```

On `pathFullyInside` (comment at lines 131-134), append after the existing final sentence:

```ts
 *  `path` is edge-walked and must be wrapped by the caller if it is a loop;
 *  `loop` takes the stored corners-only form and is wrapped here (SCRUM-16). */
```

- [x] **Step 3: Confirm the comments compile and nothing else moved**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/containment.test.ts`
Expected: `npm run typecheck` exits 0; Vitest reports 0 failed — a comment-only edit cannot change containment behaviour, and this proves it did not.

---

## Phase 2 — The four fixes

Routes the four defective call sites through `edgePolyline`, each behind a test that fails first. Every change is an argument swap: no signature moves, no check is reordered, and §10.2's normative reject order is untouched. The phase boundary is safe because each task is independently complete — the project type-checks and the suite is green after any one of them.

### Task 3: Fix 1 — a station flush against the border's closing edge (§5.2 check 1) ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/validate.ts:42-45`
- Test: `src/rules/__tests__/validate.test.ts`

- [x] **Step 1: Add the failing regression test**

In `src/rules/__tests__/validate.test.ts`, inside the existing `describe('validateStationPlacement (§5.2)')` block, add after the `rejects a card touching any string with TOUCHES_STRING` case (which ends at line 33):

```ts
  it('rejects a card flush against the border’s CLOSING edge with TOUCHES_STRING (SCRUM-16)', () => {
    // BORDER is stored corners-only, so its final edge — (0,500) back to (0,0),
    // the left wall at x = 0 — is implied, never in the array. Before SCRUM-16
    // this card passed check 1 (touchesRect never walked that edge) AND check 3
    // (rectFullyInside wraps internally, and a card whose own left edge is
    // COLLINEAR with the wall has every corner inside with no transversal
    // crossing). On a real 4-player board that is 1000 of 4000 world units of
    // wall a card could sit flush against.
    const state = makeState()
    const rect: Rect = { x: 0, y: 240, width: 20, height: 20 }

    expect(validateStationPlacement(state, rect, TEST_CONFIG)).toEqual({
      ok: false,
      reason: STATION_REJECTION_REASON.TOUCHES_STRING,
    })
  })
```

- [x] **Step 2: Confirm it fails against the current code**

Run: `npx vitest run src/rules/__tests__/validate.test.ts -t "flush against the border"`
Expected: non-zero exit, 1 failed. The failure reads `expected { ok: true } to deeply equal { ok: false, reason: 'TOUCHES_STRING' }` — the placement is currently accepted, which is the bug.

- [x] **Step 3: Route check 1 through `edgePolyline`**

In `src/rules/validate.ts`, add `edgePolyline` to the imports (a new `import { edgePolyline } from './pathGeometry'` line, placed after the `./containment` import block and before `import type { RulesConfig }`), then change the check-1 loop:

```ts
  for (const placedPath of state.paths) {
    if (touchesRect(edgePolyline(placedPath), rect, config.tangencyTolerance)) {
      return { ok: false, reason: STATION_REJECTION_REASON.TOUCHES_STRING }
    }
  }
```

- [x] **Step 4: Confirm the whole validate spec passes**

Run: `npx vitest run src/rules/__tests__/validate.test.ts; npm run typecheck`
Actual: Vitest exits 0, **24 passed, 0 failed** — the new case passes and every
pre-existing case still passes. `npm run typecheck` exits 0.

### Task 4: Fix 2 — a genuine crossing of the mountain's closing edge is not a tangency (§10.2 check 10, M8) ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/validate.ts:201-209`
- Test: `src/rules/__tests__/validate.test.ts`

- [x] **Step 1: Add the failing regression test**

In `src/rules/__tests__/validate.test.ts`, inside `describe('validateStringPlacement (§10.2)')`, add after the existing `does not reject a path that genuinely crosses another path, even within tangency tolerance of it elsewhere` case:

```ts
  it('does not reject a path that genuinely crosses the mountain’s CLOSING edge, even though it grazes the mountain elsewhere (SCRUM-16)', () => {
    const stationA = makeStation(STATION_TYPE.STARTING, { x: 40, y: 240, width: 20, height: 20 })
    const stationB = makeStation(STATION_TYPE.HAMLET, { x: 460, y: 240, width: 20, height: 20 })
    // The string runs straight along y = 250 from x = 60 to x = 460.
    //
    // The mountain is shaped so that its CLOSING edge — (150,280) back to
    // (150,220) — is the only edge that crosses the string, at (150,250), while
    // two of its stored edges graze the string at 0.3 units, inside
    // tangencyTolerance (0.5). Its one other crossing of the line y = 250 sits
    // at x = 490, beyond the string's own extent, so it is not a crossing OF
    // THE STRING (a closed loop must cross an infinite line an even number of
    // times; putting the second one off the end is what isolates the closing
    // edge here).
    //
    // Before SCRUM-16: crossings() missed the closing edge, so genuinelyCrosses
    // was false, touchesPath saw the 0.3 graze, and check 10 wrongly rejected a
    // string that plainly cuts through the mountain. Per M8 and §10.3 a genuine
    // crossing is SCORED, not rejected.
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      p(150, 220),
      p(300, 249.7),
      p(490, 220),
      p(490, 280),
      p(150, 280),
    ])
    const seat = makeSeat('PINK', 'P1', { startingStationId: stationA.card.id })
    const state = makeState({
      seats: [seat],
      stations: [stationA, stationB],
      paths: [makePath(PATH_KIND.BORDER, BORDER), mountain],
    })
    const path: Polyline = [p(60, 250), p(460, 250)]

    expect(validateStringPlacement(state, PINK, 'SHORT_RAIL', path, TEST_CONFIG)).toEqual({
      ok: true,
    })
  })
```

- [x] **Step 2: Confirm it fails against the current code**

Run: `npx vitest run src/rules/__tests__/validate.test.ts -t "genuinely crosses the mountain"`
Expected: non-zero exit, 1 failed, reporting `{ ok: false, reason: 'DEGENERATE_TANGENCY' }` where `{ ok: true }` was expected.

- [x] **Step 3: Hoist one `edgePolyline` and use it for both halves of check 10**

In `src/rules/validate.ts`, replace the final loop of `validateStringPlacement` (currently lines 201-209). Keep the existing block comment above it verbatim — only the loop body changes:

```ts
  for (const otherPath of state.paths) {
    if (otherPath.kind === PATH_KIND.BORDER) {
      continue
    }
    // One wrapped value for both branches: a closed loop's closing edge must be
    // visible to the crossing test and the tangency test alike, or the two
    // disagree about the same edge (SCRUM-16).
    const otherEdges = edgePolyline(otherPath)
    const genuinelyCrosses = crossings(path, otherEdges).length > 0
    if (!genuinelyCrosses && touchesPath(path, otherEdges, config.tangencyTolerance)) {
      return { ok: false, reason: REJECTION_REASON.DEGENERATE_TANGENCY }
    }
  }
```

- [x] **Step 4: Confirm the whole validate spec passes**

Run: `npx vitest run src/rules/__tests__/validate.test.ts; npm run typecheck`
Actual: Vitest exits 0, **25 passed, 0 failed**, including both cases added in
this phase. `npm run typecheck` exits 0.

### Task 5: Fix 3 — a crossing of the mountain's closing edge costs −1 (§10.3, M10) ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/scoring.ts:134-136`
- Test: `src/rules/__tests__/scoring.test.ts`

**FINDING (originally reported, since resolved by developer-approved amendment):**
Step 4's fix made the pre-existing case `charges −1 for crossing the mountain, the
river and the border alike (M10)` (line ~146, predates this contract) fail: 4
crossings observed where it expected 3. Root cause: that test's
`PATH_KIND.MOUNTAIN` fixture was only 2 points — `[p(200,200), p(300,200)]`, a
single segment, not a real enclosed polygon. Any real mountain (§4.1) always has
≥3 vertices with actual area; a 2-point "loop" is a degenerate shape nothing in
the real game can produce. Because `isClosedPathKind` treats every
`MOUNTAIN`-kind path as closed regardless of point count, `edgePolyline` wrapped it
into `[p(200,200), p(300,200), p(200,200)]` — the same physical segment retraced
forward and backward — so the vertical test rail crossed that one physical line
twice instead of once. Per plan.md's own instruction for this exact shape of
problem ("An existing test failing … would be a finding, not a fixture problem …
the executor must report it rather than adjusting the fixture"), this fixture was
initially left untouched and the finding reported instead of silently patched.

**Amendment approved by the developer, 2026-08-01:** fix the fixture only. The
mountain in this one pre-existing case is now a genuine ≥3-vertex closed polygon
— `[p(150,200), p(350,200), p(350,460), p(150,460)]` — shaped so its second
crossing of the line `x = 250` falls at `y = 460`, beyond the rail's own y-extent
of `[-10, 410]`, giving exactly one genuine crossing instead of the there-and-back
pair a 2-point segment produces once wrapped. `closeLoop`, `edgePolyline`,
`isClosedPathKind` and `src/rules/__tests__/pathGeometry.test.ts` were **not**
touched — `closeLoop`'s `length < 2` guard and the Phase 1 spec case asserting
that a two-point loop wraps into a there-and-back pair stay exactly as they were.
See the Implementer Report for the full geometric reasoning.

- [x] **Step 1: Add the failing regression test**

In `src/rules/__tests__/scoring.test.ts`, inside `describe('resolveScoring (§10.3)')`, add alongside the existing crossing-penalty cases:

```ts
  it('counts a crossing of the mountain’s CLOSING edge as −1 (§10.3, M10 — SCRUM-16)', () => {
    // The mountain is stored corners-only, so its final edge — (100,300) back to
    // (100,100) — is implied, never in the array. crossings() iterates
    // `j < other.length - 1` and never reached it, so this rail scored 0 where
    // §5.4's page-7 example says a mountain crossing costs −1. On a real board
    // that is the 48th of 48 mountain edges, and the failure is silent.
    const mountain = makePath(PATH_KIND.MOUNTAIN, [
      p(100, 100),
      p(300, 100),
      p(300, 300),
      p(100, 300),
    ])
    const state = makeState({ seats: [makeSeat('PINK', 'P1')] })
    const withMountain = { ...state, paths: [...state.paths, mountain] }
    // Cuts the closing edge at (100,200) and touches nothing else.
    const newPath = makePath(PATH_KIND.SHORT_RAIL, [p(80, 200), p(120, 200)], PINK)

    const breakdown = resolveScoring(withMountain, PINK, newPath, TEST_CONFIG)

    expect(breakdown.crossings).toHaveLength(1)
    expect(breakdown.crossings[0]?.otherPathId).toBe(mountain.id)
    expect(breakdown.crossings[0]?.onCard).toBe(false)
    expect(breakdown.lost).toBe(1)
    expect(breakdown.net).toBe(-1)
  })
```

- [x] **Step 2: Confirm it fails against the current code**

Run: `npx vitest run src/rules/__tests__/scoring.test.ts -t "CLOSING edge"`
Expected: non-zero exit, 1 failed — `expected [] to have a length of 1 but got +0`, because the crossing is not detected at all.

- [x] **Step 3: Route the crossing scan through `edgePolyline`**

In `src/rules/scoring.ts`, add `import { edgePolyline } from './pathGeometry'` after the existing `./containment` import, then change the crossing loop. The surrounding `stationRects` / `crossingLines` / `lost` declarations and the existing block comment above the loop are unchanged.

```ts
  for (const otherPath of state.paths) {
    // Both sides through edgePolyline: `otherPath` may be the border or the
    // mountain, whose closing edges are implied rather than stored, and
    // `newPath` goes through it too so no reader has to work out why one side
    // is wrapped and the other is not — it is a by-reference no-op on a rail
    // (SCRUM-16).
    for (const point of crossings(edgePolyline(newPath), edgePolyline(otherPath))) {
```

Leave `entryCount(newPath.path, station.rect)` at line 48 exactly as it is — `entryCount` is endpoint-sensitive and must keep the stored array.

- [x] **Step 4: Confirm the whole scoring spec passes, page-7 example included**

Run: `npx vitest run src/rules/__tests__/scoring.test.ts; npm run typecheck`
Actual (after the developer-approved fixture amendment above): Vitest exits 0 —
**26 passed, 0 failed**. The previously-failing pre-existing case
(`charges −1 for crossing the mountain, the river and the border alike (M10)`)
and the new SCRUM-16 case (`counts a crossing of the mountain's CLOSING edge as
−1`) both pass. The §5.4 page-7 worked example is fully green (all 6 of its
sub-cases pass, verbatim-confirmed via `--reporter=verbose`). `npm run typecheck`
exits 0.

### Task 6: Fix 4 — the debug crossing overlay agrees with the engine ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/BoardOverlays.tsx:71-79`

**Note:** `BoardOverlays.tsx` grew a `config: RulesConfig` prop and an
`overlayMarks(config)` call between planning time and this dispatch (unrelated,
concurrent work — visual scale marks for rects/vertices/crossings). The two
target lines the plan named (the `crossings` import and the `allCrossings` inner
push) were unchanged in substance; the edit below was applied against the current
file content rather than the line numbers in the plan.

- [x] **Step 1: Wrap both sides of the pair in `allCrossings`**

In `src/ui/BoardOverlays.tsx`, add `import { edgePolyline } from '../rules/pathGeometry'` beneath the existing `import { crossings } from '../rules/geometry'`, then change the inner push. Both sides go through the helper because either path in a pair can be a loop.

```ts
      points.push(...crossings(edgePolyline(state.paths[i]), edgePolyline(state.paths[j])))
```

Extend the existing doc comment above `allCrossings` with a final paragraph:

```ts
 * Both sides go through edgePolyline: the border and the mountain are stored
 * corners-only, and an overlay that missed their closing edges would agree with
 * the bug it exists to help a play-tester find (SCRUM-16).
```

- [x] **Step 2: Type-check and lint the UI change**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. There is no spec for this file — the suite runs `environment: 'node'` and its `include` glob collects `*.test.ts` only, so a component test is out of scope here (see plan.md). The change is a call-site swap onto a helper covered by Task 1.

---

## Phase 3 — One owner for the wrap, everywhere

Collapses the seven hand-rolled `[...loop, loop[0]]` expressions and the duplicated closed-kind set onto the Phase 1 exports. Every change here is behaviour-preserving by inspection — the replacement produces identical array contents and draws no RNG value — so `generateSetup` stays byte-identical for a given seed. The phase boundary is safe because it is a pure refactor: if any spec moves, that is a finding, not a fixture to adjust.

### Task 7: Delete `setupValidation.ts`'s private `closed()` in favour of `closeLoop` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/setupValidation.ts:24-28,68,82,132,160`
- Test: `src/rules/__tests__/setupValidation.test.ts` *(run, not edited)*

- [x] **Step 1: Delete the private helper and import the shared one**

Remove the whole `closed` function including its doc comment (lines 24-28):

```ts
/** A closed loop is stored corners-only, so wrap it to measure or to test
 *  containment along its final edge. */
function closed(loop: Polyline): Polyline {
  return loop.length === 0 ? loop : [...loop, loop[0]]
}
```

Add `import { closeLoop } from './pathGeometry'` after the existing `./containment` import block.

- [x] **Step 2: Point all four uses at `closeLoop`**

Four call sites, unchanged except for the function name:

```ts
const borderLoop = closeLoop(border.path)                                          // line 68
const mountainLoop = closeLoop(mountain.path)                                      // line 82
if (mountain && touchesPath(river.path, closeLoop(mountain.path), config.cardSize))// line 132
if (mountain && touchesRect(closeLoop(mountain.path), station.rect, config.tangencyTolerance)) // line 160
```

Leave the line 155-159 comment (the one explaining why the mountain is wrapped and the river is not) exactly as written — it is still correct and is the clearest statement of the distinction in the file. If `Polyline` becomes an unused type import after the helper is deleted, remove it from the `import type` list; `npm run lint` will say.

- [x] **Step 3: Confirm setup validation and generation are unchanged**

Run: `npx vitest run src/rules/__tests__/setupValidation.test.ts src/rules/__tests__/setup.test.ts; npm run typecheck`
Actual: `setupValidation.test.ts` 0 failed. `setup.test.ts` shows exactly the one
pre-existing AC9 `RIVER_TOO_NEAR_MOUNTAIN` failure ("generateSetup failed for 3
players at seed 0 … no river placement found in 200 attempts …") and nothing
else — 1 failed, 49 passed across both files, determinism specs green.
`npm run typecheck` exits 0.

### Task 8: Collapse the six hand-rolled wraps in the setup samplers and generator ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/setupSamplers.ts:138,148,185,186,305-311`
- Modify: `src/rules/setup.ts:102`
- Test: `src/rules/__tests__/setup.test.ts` *(run, not edited)*

- [x] **Step 1: Replace the five wraps in `setupSamplers.ts`**

Add `import { closeLoop } from './pathGeometry'` after the existing `./geometry` import. Then:

```ts
const closedBorder = closeLoop(borderLoop)      // sampleMountain, line 138
const closedLoop = closeLoop(loop)              // sampleMountain, line 148 (inside the attempt loop)
const closedBorder = closeLoop(borderLoop)      // sampleRiver, line 185
const closedMountain = closeLoop(mountainLoop)  // sampleRiver, line 186
```

For the fifth (line 307, inside `placeCornerStation`'s attempt loop), hoist it to a `const` beside the existing `maxOffset` declaration rather than re-wrapping on every attempt — matching what `sampleMountain` and `sampleRiver` already do:

```ts
  // The bisector can never need more than the card's diagonal plus the
  // inradius, so that bounds the bisection interval.
  const maxOffset = size * 2 + inradius(borderLoop.length, config.borderPerimeter)
  const closedBorder = closeLoop(borderLoop)
```

and then at the former line 307:

```ts
    if (found && touchesRect(closedBorder, found, config.tangencyTolerance) && clear(found)) {
      return found
    }
```

- [x] **Step 2: Replace the wrap in `setup.ts`**

Add `import { closeLoop } from './pathGeometry'` after the existing `./containment` import, then change the `blockers` line. Keep the comment above it verbatim — it explains exactly why the river is not wrapped and the mountain is.

```ts
    const blockers: readonly Polyline[] = [riverPath, closeLoop(mountainLoop)]
```

- [x] **Step 3: Confirm generation is byte-identical for a given seed**

Run: `npx vitest run src/rules/__tests__/setup.test.ts src/rules/__tests__/setupValidation.test.ts; npm run typecheck`
Actual: exactly the one pre-existing AC9 `RIVER_TOO_NEAR_MOUNTAIN` failure and
nothing else (1 failed, 49 passed across both files); `setup.test.ts`'s
same-seed-same-board specs are green. `npm run typecheck` exits 0.

### Task 9: Replace `BoardTerrain.tsx`'s private `CLOSED` set with `isClosedPathKind` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/BoardTerrain.tsx:9,33`

- [x] **Step 1: Delete the local set and call the shared predicate**

Remove line 9 entirely:

```ts
const CLOSED: ReadonlySet<PathKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])
```

Add `import { isClosedPathKind } from '../rules/pathGeometry'` after the existing `TERRAIN_DISPLAY` import, and change the `d` attribute:

```ts
            d={toPathData(path.path, isClosedPathKind(kind))}
```

`path.path` is correct here and stays — `toPathData` reads vertices and emits `Z`, so it needs the stored form, not a wrapped copy that would repeat a point before the `Z`. Keep `TERRAIN_ORDER`, `LABEL`, the class names and the `aria-label`s exactly as they are. `PathKind` is still needed for `TERRAIN_ORDER`'s annotation and `PATH_KIND` for its contents, so neither import is removed.

- [x] **Step 2: Type-check and lint**

Run: `npm run typecheck; npm run lint`
Actual: both exit 0, no output beyond the script banner — no unused import or
unused variable reported in this file.

---

## Phase 4 — Final verification

No production changes. Confirms the boundary still holds, that the wrap now has exactly one owner in production source, that no file breached the size budget, and that the cumulative work is clean under every gate.

### Task 10: Confirm the `src/rules/` boundary still holds ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Actual: **zero hits.** `pathGeometry.ts` imports only `../constants/game` and `./types`. Confirmed independently by QA and by the defensive review.

### Task 11: Confirm the wrap has exactly one owner in production source ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep for surviving hand-rolled wraps in production source**

Run: `Select-String -Path src\rules\*.ts,src\ui\*.tsx -Pattern "\.\.\.\w+,\s*\w+\[0\]\]"`
Actual: **exactly one hit — `pathGeometry.ts:38`, `closeLoop`'s own body.** That is the sanctioned single owner; the plan's grep simply does not exclude the defining line. Zero stragglers anywhere else in production source. The four deliberate spellings in `__tests__/setup.test.ts` and `__tests__/containment.test.ts` are untouched and out of this glob's reach, as intended.

- [x] **Step 2: Grep for the two deleted private helpers**

Run: `Select-String -Path src\rules\setupValidation.ts -Pattern "function closed"; Select-String -Path src\ui\BoardTerrain.tsx -Pattern "const CLOSED"`
Actual: **zero hits from both.** Both private helpers confirmed deleted.

- [x] **Step 3: Confirm no tunable became a literal**

Run: `Select-String -Path src\rules\pathGeometry.ts,src\rules\validate.ts,src\rules\scoring.ts,src\rules\setupValidation.ts,src\rules\setupSamplers.ts,src\rules\setup.ts,src\rules\types.ts,src\ui\BoardOverlays.tsx,src\ui\BoardTerrain.tsx -Pattern "\b(350|700|1400|4000|120)\b"`
Actual: **zero hits.** No tunable became a literal in any of the nine files.

### Task 12: Confirm no file breached the size budget ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Measure every file created or grown**

Run: `foreach ($f in @("src\rules\pathGeometry.ts","src\rules\types.ts","src\rules\containment.ts","src\rules\validate.ts","src\rules\scoring.ts","src\rules\setupValidation.ts","src\rules\setupSamplers.ts","src\rules\setup.ts","src\ui\BoardOverlays.tsx","src\ui\BoardTerrain.tsx","src\rules\__tests__\pathGeometry.test.ts","src\rules\__tests__\validate.test.ts","src\rules\__tests__\scoring.test.ts")) { "$f = " + (Get-Content $f | Measure-Object -Line).Lines }`
Actual, measured with the `Measure-Object -Line` form `CLAUDE.md` mandates — **every file under 400**:

```
src\rules\pathGeometry.ts                = 55
src\rules\types.ts                       = 162
src\rules\containment.ts                 = 373
src\rules\validate.ts                    = 200
src\rules\scoring.ts                     = 191
src\rules\setupValidation.ts             = 178
src\rules\setupSamplers.ts               = 312
src\rules\setup.ts                       = 244
src\ui\BoardOverlays.tsx                 = 87
src\ui\BoardTerrain.tsx                  = 69
src\rules\__tests__\pathGeometry.test.ts = 60
src\rules\__tests__\validate.test.ts     = 377
src\rules\__tests__\scoring.test.ts      = 380
```

**Measurement note.** The defensive review measured with raw `(Get-Content <file>).Count`, which counts blank lines and reports `containment.ts` 401, `validate.test.ts` 429, `scoring.test.ts` 457. The project's gate is the `Measure-Object -Line` form above, so no file breaches it and no split was performed. The two spec files are nonetheless larger than this plan forecast (~355-365) and are natural split candidates along their existing `describe` boundaries — surfaced to the developer, not actioned.

### Task 13: Static gates, full suite, and production build ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Typecheck, lint, format, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Actual: `npm run typecheck` exit 0, no output. `npm run lint` exit 0, no errors or warnings. `npm run format:check` → `All matched files use Prettier code style!`. `npm test` → **`Test Files  1 failed | 16 passed (17)`** / **`Tests  1 failed | 254 passed (255)`**.

The plan's predicted 244 is **stale**: other contracts have added tests since planning, so the real total is 255. No pre-existing test was lost.

The single failure is **pre-existing and not this contract's** — `setup.test.ts > … 20 seeds (AC9)`, `SetupGenerationError: generateSetup failed for 3 players at seed 0: RIVER_TOO_NEAR_MOUNTAIN`. Verified by stashing every SCRUM-16 change and re-running: it still fails. It originates in another contract's uncommitted `setupSamplers.ts` work. Developer decided (2026-08-01) to report and leave it.

- [x] **Step 2: Production build**

Run: `npm run build`
Actual: **exit 0.** `dist/index.html`, CSS 6.66 kB, JS 236.71 kB, `✓ built in 671ms`, no bundler errors. `build` runs `npm run lint` first and it passed; `build` does not run tests, so the pre-existing AC9 failure could not and did not affect it.

### Task 14: Write the PR description ✓

- Skill: `none — documentation for the developer, no code written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder and to `https://amazerbeam.atlassian.net/browse/SCRUM-16`.
- The summary: closed loops stay corners-only; `src/rules/pathGeometry.ts` now owns the wrap decision; four call sites that missed a ring's closing edge were routed through it; seven hand-rolled wraps and one duplicated closed-kind set were collapsed onto it.
- The two regression tests by name, with what each asserted before and after.
- Every decision the developer must make and every behaviour they must judge by playing — copy the "Developer decides or observes" block from this file verbatim, including the note that Phase 3 touched the seeded generator and can be reverted whole.
- Verification results from Tasks 10-13: the actual Vitest summary line, the actual line counts, and the actual grep outcomes — quoted, not paraphrased.
- A one-line note for future contributors on the new convention: **anything walking `points[i] → points[i+1]` over a `PlacedPath` calls `edgePolyline`; the three predicate families are documented on `PlacedPath.path`.**
- State plainly that `BoardOverlays.tsx` is covered by typecheck and by the tested helper, not by a spec, and why (`environment: 'node'`, `include` glob is `*.test.ts` — the SCRUM-8 debt item).

---

## Self-review

**Spec coverage:**
- New `src/rules/pathGeometry.ts` with `closeLoop` / `isClosedPathKind` / `edgePolyline` and its spec — Task 1.
- Doc comment on `PlacedPath.path` recording the convention and the three families — Task 2 Step 1.
- Doc note on `rectFullyInside` / `pathFullyInside` — Task 2 Step 2.
- Fix 1, `validate.ts:43` + regression test — Task 3.
- Fix 2, `validate.ts:205-206` + regression test — Task 4.
- Fix 3, `scoring.ts:135` + regression test — Task 5.
- Fix 4, `BoardOverlays.tsx:75` — Task 6.
- Collapse duplicated wrap knowledge: `setupValidation.ts` — Task 7; `setupSamplers.ts` and `setup.ts` — Task 8; `BoardTerrain.tsx` — Task 9.
- Every consumer named in plan.md's Step 1.6 audit appears in a `**Files:**` block above, or was explicitly cleared in the audit as correct-as-written (`validate.ts:59,119,169`, `scoring.ts:48`, `turn.ts:145`, `setup.ts:151,238`, `search.ts:135`, `BoardOverlays.tsx:41`, `BoardTerrain.tsx:26`) — and the two false-positive groups (`reducer.ts:145,154`, `HeroScene.tsx`) are named so they are not swept in.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. No `git commit` step, no bare `vitest`, no `npm run dev`, no `eslint-disable`, no `package-lock.json` edit, no invented tuning value.

**Type / name consistency:** `closeLoop`, `isClosedPathKind`, `edgePolyline` and the private `CLOSED_PATH_KINDS` are spelled identically in Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9 and 11, and match plan.md Part 2 "Data shapes". Reason codes are imported by name, never as string literals: `STATION_REJECTION_REASON.TOUCHES_STRING` (Task 3), `REJECTION_REASON.DEGENERATE_TANGENCY` (Task 4, in the prose only — the test asserts `{ ok: true }`), `PATH_KIND.BORDER` / `PATH_KIND.MOUNTAIN` / `PATH_KIND.RIVER` / `PATH_KIND.SHORT_RAIL` / `PATH_KIND.LONG_RAIL` (Tasks 1, 4, 5, 9). No `rules.json` key, `Move` kind, `data-testid`, CSS class or `aria-*` id is added, renamed or removed anywhere in this contract.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking with a new module and its passing spec, consumed by nothing — purely additive, zero behaviour change, no dead import (Task 2 Step 3 proves `containment.ts` is untouched behaviourally).
- **Phase 2** ends type-checking with all four fixes landed and three new specs green; each task independently completes its own import, edit and test, so no half-applied change survives a task boundary either.
- **Phase 3** ends type-checking with the three private helpers deleted, every reference repointed in the same task that deletes them, and `setup.test.ts`'s determinism specs run at the end of Tasks 7 and 8 to prove generation is unchanged.
- **Phase 4** makes no production change at all.
