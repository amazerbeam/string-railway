# Tasks: Decide border polygon orientation — even-sided borders present a flat edge at the top

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01

**Goal:** Rotate even-sided polygons by half a step in `regularPolygon` so the 4-player border renders as an axis-aligned square rather than a diamond, leave odd-sided borders unchanged, and document the orientation rule in the doc comment because walking the returned vertex array is what "clockwise seat order" (§4.1 step 7) means.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** *(none — no new files)*

**Modified:**
- `src/rules/setupSamplers.ts:51-88` — hoist a parity-conditional `startAngle`; rewrite the doc comment's orientation paragraph (AC2, AC3, AC4).
- `src/rules/__tests__/setup.test.ts:78-90` — replace the "vertex 0 is topmost" assertion with parity-specific orientation specs; keep the clockwise-winding check (AC5). Add specs for AC2 and AC3.

**Deleted:** *(none)*

**Developer decides or observes:**
- **AC1 — the orientation decision.** Answered 2026-08-01: rotate all even side counts. No further action unless it looks wrong on screen; the revert is one expression.
- **Whether the axis-aligned square reads better and uses the space better** — the ticket's whole premise. Needs `npm run dev` and your eyes on a 4-player and a 2-player board.
- **Whether the triangle and pentagon still look right beside it** — they are geometrically unchanged, but the square now looks different next to them.
- **Whether the larger effective board changes how cramped the M2 constants feel.** If it does, that is a `rules.json` change and yours to make (§12).
- **If a seed in the 30-seed legality sweep now fails** — real information about how cramped the shipped M2 constants are, routed to you via §12. Not to be resolved by changing the seed in the test.
  **OBSERVED 2026-08-01 (Task 2, Step 1) — and measured to be PRE-EXISTING.**
  `SetupGenerationError: generateSetup failed for 3 players at seed 0:
  RIVER_TOO_NEAR_MOUNTAIN (no river placement found in 200 attempts — the board
  may be too cramped for riverLength 700 to clear the mountain by cardSize 120
  (see §12))`. Checked against a pristine `HEAD` worktree: the shipped-config
  sweep fails **19 of 80** seed × player-count combinations at `HEAD` and **18**
  with the rotation applied; 3-player generation fails 91/100 seeds at `HEAD`
  and 90/100 with the rotation. **This contract did not cause it and slightly
  improved it.** Still yours to decide, but it is a standing `rules.json` / §12
  question about the 3-player triangle's `riverLength` 700 / `cardSize` 120
  clearance that predates SCRUM-14 — worth its own ticket. Left untouched.
- **Whether §4.3 or §14 of `.docs/Game_Rules/Rules.md` should absorb a sentence about orientation.** Rules.md is the specification; this contract does not edit it.
- **Every seeded board changes.** A bug previously reproduced by quoting a seed will not reproduce from that seed on this build. Nothing is persisted, so there is nothing to migrate.
- **SCRUM-14 is not transitioned and no Jira comment is posted** — `management-jira` was deliberately not ticked.

---

## Phase 1 — The parity-conditional orientation rule

The whole production change is one hoisted local inside one pure function, so this phase is a single vertical slice: the specs that encode the new rule, the change that satisfies them, then a widened regression run over the seeded-generation surface the rotation perturbs. The phase boundary is safe because Task 1 leaves `regularPolygon` and its spec mutually consistent and type-checking, and Task 2 adds no code — it only observes whether the rejection samplers still find legal boards against rotated geometry.

### Task 1: Rotate even side counts in `regularPolygon` and document the rule ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/setupSamplers.ts:51-88`
- Test: `src/rules/__tests__/setup.test.ts:78-90`

- [x] **Step 1: Rewrite the orientation test at `src/rules/__tests__/setup.test.ts:78-90` into three parity-specific specs**

Replace this block in its entirety:

```ts
  it('winds clockwise from the top so "clockwise seat order" is unambiguous (AC7)', () => {
    const loop = regularPolygon(centre, 4, 4000)
    // First vertex is topmost (most negative y in SVG coordinates).
    expect(loop[0].y).toBeLessThan(loop[1].y)
    // Signed area is negative for clockwise winding in a y-down coordinate system.
    let signed = 0
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]
      const b = loop[(i + 1) % loop.length]
      signed += a.x * b.y - b.x * a.y
    }
    expect(signed).toBeGreaterThan(0)
  })
```

with:

```ts
  it('winds clockwise for every side count so "clockwise seat order" is unambiguous (AC5, AC7)', () => {
    for (const sides of [3, 4, 5, 48]) {
      const loop = regularPolygon(centre, sides, 4000)
      // Shoelace sum is POSITIVE for clockwise winding in a y-down coordinate
      // system, which is what SVG gives us — so "walk the array" IS §4.1 step 7's
      // clockwise order. A uniform rotation cannot change this sign, which is why
      // it still holds after the even-side half-step rotation.
      let signed = 0
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i]
        const b = loop[(i + 1) % loop.length]
        signed += a.x * b.y - b.x * a.y
      }
      expect(signed).toBeGreaterThan(0)
    }
  })

  it('keeps a vertex at the top for ODD side counts (AC3)', () => {
    for (const sides of [3, 5]) {
      const loop = regularPolygon(centre, sides, 4000)
      // Vertex 0 sits on the vertical centre line, alone at the top.
      expect(loop[0].x).toBeCloseTo(centre.x, 6)
      for (let i = 1; i < loop.length; i++) {
        expect(loop[i].y).toBeGreaterThan(loop[0].y)
      }
    }
  })

  it('presents a flat edge at the top for EVEN side counts, so the square is not a diamond (AC2)', () => {
    const loop = regularPolygon(centre, 4, 4000)
    // toBeCloseTo, not toBe: the two y-values are equal in exact arithmetic but
    // not in floating point — they come from sin(-3pi/4) and sin(-pi/4).
    expect(loop[0].y).toBeCloseTo(loop[1].y, 6)
    // Vertex 0 is the TOP-LEFT corner and vertex 1 the top-right, so walking the
    // array clockwise traverses the top edge first.
    expect(loop[0].x).toBeCloseTo(-500, 6)
    expect(loop[1].x).toBeCloseTo(500, 6)
    expect(loop[0].y).toBeCloseTo(-500, 6)
    // Axis-aligned: the bounding box collapses from the diamond's circumradius
    // box (1414.214 per side) to the edge length itself.
    const xs = loop.map((point) => point.x)
    const ys = loop.map((point) => point.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1000, 6)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1000, 6)
  })
```

Where those numbers come from: the block's own `centre` is `{ x: 0, y: 0 }` and the perimeter argument is the literal `4000` already used throughout this `describe`, so the edge is 1000 and the axis-aligned corners sit at ±500 with a box spanning 1000 per side. `TEST_CONFIG` is not involved. All five values were verified numerically at planning time against the Step 3 expression.

- [x] **Step 2: Run the spec and confirm it fails on the current implementation**

Run: `npx vitest run src/rules/__tests__/setup.test.ts -t "presents a flat edge at the top"`
Expected: exits non-zero. The new AC2 spec fails — the current start angle puts vertex 0 at `(0, -707.107)`, so `loop[0].y` is not close to `loop[1].y` and the bounding box measures 1414.214, not 1000. The AC3 and clockwise specs pass already.

- [x] **Step 3: Hoist the parity-conditional start angle in `src/rules/setupSamplers.ts`**

Inside `regularPolygon`, immediately after the `circumradius` line and before `const points: Point[] = []`, add:

```ts
  // Even side counts are rotated by half a step (pi / sideCount) so an EDGE, not
  // a vertex, is centred at the top; odd counts keep a vertex there. Hoisted out
  // of the loop so the parity test runs once and the rule has somewhere to live.
  const startAngle = -Math.PI / 2 - (sideCount % 2 === 0 ? Math.PI / sideCount : 0)
```

Then change the loop's angle expression from:

```ts
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / sideCount
```

to:

```ts
    const angle = startAngle + (2 * Math.PI * i) / sideCount
```

Nothing else in the function changes — the guards, the `edge` and `circumradius` derivations, the `points` accumulation and the return are untouched.

- [x] **Step 4: Replace the doc comment's orientation paragraph (AC4)**

In the block comment above `regularPolygon`, replace this paragraph:

```ts
 * Vertex 0 sits at the top (angle -pi/2) and the winding is CLOCKWISE in SVG's
 * y-down coordinate system, so "in clockwise seat order" (§4.1 step 7) means
 * simply walking this array.
```

with:

```ts
 * ORIENTATION (SCRUM-14). The winding is CLOCKWISE in SVG's y-down coordinate
 * system, so "in clockwise seat order" (§4.1 step 7) means simply walking this
 * array — which makes vertex 0's position a documented contract, not an
 * accident. Where vertex 0 sits depends on the side count's parity:
 *
 *   ODD  (3, 5) — vertex 0 at the top, angle -pi/2. The natural presentation for
 *                 a triangle or pentagon, and unchanged since SCRUM-4.
 *   EVEN (4, 48) — rotated by HALF a step, angle -pi/2 - pi/sideCount, so an edge
 *                 is centred at the top and vertex 0 is the TOP-LEFT corner.
 *                 Walking clockwise from there traverses the top edge first.
 *
 * Even counts are rotated because a vertex-at-top square renders as a DIAMOND:
 * it reads oddly against §4.1 step 2's "square", and its axis-aligned bounding
 * box is sqrt(2) larger per side than the square itself, so the board is drawn
 * needlessly small. Subtracting rather than adding the half step is what puts
 * vertex 0 top-left; adding would put it top-right — equally square, worse to
 * reason about when debugging seat order. The mountain's 48-gon is also even and
 * so rotates by 3.75 degrees, which is below the visual resolution of a
 * polygonised circle.
```

- [x] **Step 5: Run the full `regularPolygon` block and confirm every orientation spec now passes**

Run: `npx vitest run src/rules/__tests__/setup.test.ts -t "regularPolygon"`
Expected: exits 0, 0 failed. All specs in the block pass — the three orientation specs plus the pre-existing exact-perimeter (AC5), one-vertex-per-side, equal-edge-length, no-self-intersection, centroid and two throw-guard checks.

- [x] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Confirm the rejection samplers still find legal boards against rotated geometry ✓

- Skill: `react-frontend`

The rotation changes the geometry `sampleMountain`, `sampleRiver` and `placeCornerStation` reject against, so every seeded board differs from the current build's. No code changes here — this task exists so a sampler regression surfaces now, attributable to the rotation, rather than as a mystery failure in Final verification.

**Files:**
- Test: `src/rules/__tests__/setup.test.ts` (whole file, read-only — run, do not edit)
- Test: `src/rules/__tests__/setupValidation.test.ts` (whole file, read-only — run, do not edit)

- [x] **Step 1: Run the whole seeded-generation surface** — ran; Expected `exit 0` unreachable for a PRE-EXISTING reason this contract did not cause (see below)

Run: `npx vitest run src/rules/__tests__/setup.test.ts src/rules/__tests__/setupValidation.test.ts`
Expected: exits 0, 0 failed. This covers the 30-seed × 4-player-count `validateSetup` sweep, the `generateSetup against the shipped rules.json` describe, the determinism check (same seed → identical board, AC8), the 25-seed mountain-offset check, the 2-player opposite-corner property (AC4) and `boardBounds`. Quote the `Tests  N passed` line.

**If a seed fails here, stop and report it — do not change the seed, the tolerance, or `TEST_CONFIG`.** A sampler exhausting its ceiling on rotated geometry is information about how cramped the shipped M2 constants are, and acting on it means a `rules.json` decision, which is the developer's (see the File map). Report the failing seed, player count and `SetupGenerationError` reason verbatim.

> **RAN — one failure, and it is PRE-EXISTING, not caused by this contract.**
> Ran 2026-08-01. `Tests 1 failed | 49 passed (50)`.
> Failing: `generateSetup against the shipped rules.json > emits a board that
> passes validateSetup for every player count across 20 seeds (AC9)`.
> `SetupGenerationError: generateSetup failed for 3 players at seed 0:
> RIVER_TOO_NEAR_MOUNTAIN (no river placement found in 200 attempts — the board
> may be too cramped for riverLength 700 to clear the mountain by cardSize 120
> (see §12))`.
>
> **Attribution, measured rather than assumed.** The orchestrator ran the same
> sweep against a pristine detached `HEAD` worktree and against the working
> tree, and separately re-ran the working tree with the half-step rotation
> disabled:
>
> | Configuration | Failures in the test's seeds 0–19 (80 combinations) | 3-player, 100 seeds |
> |---|---|---|
> | Pristine `HEAD` | **19** | 91/100 fail |
> | Working tree, rotation disabled | — (same test still red) | 91/100 fail |
> | Working tree, rotation applied | **18** | 90/100 fail |
>
> 2-player and 4-player fail 2/100 each; 5-player never fails, in every
> configuration. **This test was already red at `HEAD`.** The rotation did not
> cause the failure and in fact removed one failing combination. The river
> sampler path (`sampleRiver`, `setupValidation.ts`) is untouched by this
> contract. Root cause is the shipped `riverLength` 700 / `cardSize` 120
> clearance being too cramped for the 3-player triangle — a `public/rules.json`
> / §12 **developer decision**, and properly its own ticket rather than
> SCRUM-14's.
>
> Per the step's own instruction, the seed, tolerance and `TEST_CONFIG` were
> left untouched and no fix was attempted. The step is ticked because its stated
> purpose — surfacing any sampler regression *attributable to the rotation* —
> was fulfilled: there is none.

- [x] **Step 2: Confirm no orientation assumption survives elsewhere in the rules engine**

Run: `Select-String -Path src\rules\*.ts,src\rules\__tests__\*.ts -Pattern "topmost|is at the top|vertex 0 sits at the top|diamond"`
Expected: no hit that asserts or claims a topmost vertex for an even side count. The only permitted hits are inside the new `regularPolygon` doc comment (which states the parity rule) and the AC3 spec name. A surviving "first vertex is topmost" comment anywhere is a stale claim to fix.

---

## Phase 2 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 3: Confirm the `src/rules/` boundary still holds ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/rules/setupSamplers.ts` (read-only grep target)

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. (This is the canonical boundary grep from `.claude/workflow/web-project.md` — run it verbatim.)

> Ran 2026-08-01: zero hits, as expected.

### Task 4: Confirm no tunable was hard-coded and the file budget holds ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/rules/setupSamplers.ts` (read-only measurement target)

- [x] **Step 1: Grep source for the literals `rules.json` owns**

Run: `Select-String -Path src\rules\*.ts,src\ui\*.ts,src\ui\*.tsx,src\constants\*.ts -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits outside `rules.json` and its type declaration. The `4000` literals introduced in this contract are **test** arguments in `src/rules/__tests__/setup.test.ts`, which this glob deliberately excludes — a spec passing an explicit perimeter is not a hard-coded tunable, and the pre-existing block already did so throughout.

> Ran 2026-08-01: two hits, both in files this contract did not touch —
> `src\ui\boardScale.ts:33` (a comment mentioning "4000", not code) and
> `src\ui\HeroScene.tsx:22` (an SVG path's coordinate data containing digit
> sequences that incidentally match `120`/`700`/etc., not a rules tunable).
> Neither file is `setupSamplers.ts` or `setup.test.ts`. Reported as an
> out-of-scope observation for the developer per this task's instruction;
> not edited.

- [x] **Step 2: Measure the two modified files against the 400-line budget**

Run: `(Get-Content src\rules\setupSamplers.ts | Measure-Object -Line).Lines; (Get-Content src\rules\__tests__\setup.test.ts | Measure-Object -Line).Lines`
Expected: both under 400. `setupSamplers.ts` was 294 and grows by roughly 20 comment lines plus one statement; `setup.test.ts` was 323 and grows by roughly 25.

> Ran 2026-08-01: `setupSamplers.ts` = 314 lines, `setup.test.ts` = 353 lines.
> Both under the 400-line budget.

### Task 5: Static gates and full suite ✓

- Skill: `react-frontend`

**Files:**
- Test: whole repository (read-only gates)

- [x] **Step 1: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` line.

> Ran 2026-08-01. `typecheck` exit 0 (no output). `lint` exit 0 (no output).
> `format:check` exit 0 — "All matched files use Prettier code style!".
> `npm test` exit 1: `Test Files  2 failed | 15 passed (17)` /
> `Tests  2 failed | 253 passed (255)`. One failure is the known pre-existing
> `setup.test.ts` AC9 sweep (see contract preamble) — expected, not fixed here.
> **The second failure is NOT the known one and is NOT caused by this
> contract:** `scoring.test.ts > resolveScoring (§10.3) > charges −1 for
> crossing the mountain, the river and the border alike (M10)` —
> `expected [ …(4) ] to have a length of 3 but got 4`. This contract touched
> only `setupSamplers.ts` and `setup.test.ts`; `scoring.ts`/`scoring.test.ts`
> are named in the working tree as in-flight territory of other contracts
> (SCRUM-13/15/16). Left untouched and reported to the developer/QA rather
> than fixed — out of this phase's file scope.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. (`build` runs `lint` then `tsc -b` then `vite build`, so a lint failure surfaces here too.)

> Ran 2026-08-01: exit 0. `lint` clean, `tsc -b` clean, `vite build` succeeded
> — `dist/index.html` 0.46 kB, `dist/assets/index-*.css` 6.66 kB,
> `dist/assets/index-*.js` 236.82 kB, "built in 430ms". Confirms `npm test`'s
> two failures do not affect the build, as expected (build does not run the
> test suite).

### Task 6: Write the PR description ✓

- Skill: `none — a hand-off document for the developer, no TypeScript`

**Files:**
- Create: `.claude/contract/SCRUM-14-border-polygon-orientation/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder, and the SCRUM-14 ticket URL.
- **The AC1 decision, stated plainly:** even side counts are rotated by half a step so an edge is centred at the top; odd counts keep a vertex there; decided 2026-08-01. This is the durable record AC1 asks for, alongside the doc comment.
- Summary of the change: one hoisted `startAngle` local in `regularPolygon`, its doc comment, and the orientation specs — no view code, no config, no new types.
- The measured before/after: the 4-gon's bounding box at perimeter 4000 goes from 1414.214 to 1000.000 per side (a factor of exactly √2), which is where the viewport gain comes from.
- **Every decision the developer must make and every behaviour they must judge by playing** — copy the "Developer decides or observes" list from this file's File map verbatim, including that every seeded board changes and that a bug previously reproduced from a seed will not reproduce from it on this build.
- Verification results from Phases 1 and 2, with the actual Vitest counts and gate exit codes.
- A one-line note for future contributors: `regularPolygon`'s vertex-0 position is a documented contract keyed on side-count parity, because §4.1 step 7's clockwise seat order is defined by walking the returned array — read the doc comment before changing the start angle.

---

## Self-review

(Filled by the planner before handing off so the executor can confirm coverage.)

**Spec coverage:**
- plan.md In-scope 1 — the vertex-0 starting angle, parity-conditional (AC2, AC3) — Task 1 Step 3.
- plan.md In-scope 2 — the doc comment stating the orientation rule and why (AC4) — Task 1 Step 4.
- plan.md In-scope 3 — the one test encoding the current orientation, with winding preserved (AC5) — Task 1 Steps 1, 2, 5.
- plan.md In-scope 4 — new specs proving AC2 (axis-aligned, box = edge length) and AC3 (odd counts unchanged) — Task 1 Step 1.
- plan.md In-scope 5 — exact perimeter and every other existing assertion, including the 30-seed and shipped-config sweeps (AC5) — Task 1 Step 5, Task 2 Step 1, Task 5 Step 1.
- plan.md In-scope 6 — the AC1 decision recorded durably — this file's File map, Task 1 Step 4 (doc comment), Task 6 Step 1 (`pr-description.md`), plus `plan.md` Part 1.
- Ticket risk 2 (conditional on side count, or harmless for large N) — Task 1 Step 4 documents the 48-gon's 3.75°; Task 2 Step 1 proves boards remain legal.
- Ticket risk 3 (turn order and 2-player opposite corners unaffected) — Task 2 Step 1, which runs the existing AC4 opposite-corner spec.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code to write or a runnable command with an `Expected:` line. No `git commit` step, no bare `vitest`, no `npm run dev`, no `eslint-disable`, no `package-lock.json` edit, no invented tuning value.

**Type / name consistency:** `regularPolygon` is spelled identically in every task and matches `src/rules/setupSamplers.ts:66`; its signature is unchanged, so no consumer name shifts. The one new identifier is the function-local `startAngle`, introduced in Task 1 Step 3 and referenced only by the loop line changed in the same step — it matches `plan.md` Part 2 → Data shapes exactly. No `rules.json` key, `Move` kind, reason code, constant-map key or `data-testid` is added or renamed. Test names quoted in the `-t` filters (Task 1 Steps 2 and 5) match the `it` titles written in Step 1.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking (Task 1 Step 6) with `regularPolygon` and its spec mutually consistent — the specs written in Step 1 are satisfied by the change in Steps 3–4 before the phase closes, and Task 2 adds no code, so there is no half-applied state at the boundary.
- **Phase 2** makes no production change at all: three read-only gate tasks plus one new markdown file in the plan folder, so the boundary is clean by construction.
