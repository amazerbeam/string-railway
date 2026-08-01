# Tasks: Station cards render with no seat colour — CSS stroke overrides the per-seat colour

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01

**Goal:** Make each station card's outline render in its owning colour-seat's hex by moving the colour one level up the cascade — from an SVG presentation attribute, which loses to any author rule, onto the element's inline `style`, which outranks them — while leaving `.station-card__body { stroke: #2b2b2b; }` in place as the genuine fallback for a card with no `markerOwner`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** *(none — no new files)*

**Modified:**
- `src/ui/StationCard.tsx:12-15,30` — correct the `colour` prop's doc comment; replace the `stroke` presentation attribute with a conditional inline `style`.
- `src/ui/StationCard.css:1-5` — add the comment recording that this `stroke` is the no-owner fallback. **No declaration changes** — every existing declaration stays byte-identical.

**Deleted:** *(none)*

**Developer decides or observes:**
- **The decoy-declaration judgement call.** After this fix, `stroke: #2b2b2b` in `StationCard.css` governs only unowned cards yet still reads like the outline colour. The in-scope comment is the whole mitigation. This is the strongest argument for the rejected constant-based variant — say the word and it is a small rewrite of the plan.
- **The `COLOUR_SEATS` palette** (`src/constants/setup.ts:16-22`), which this fix exists to make judgeable. Check the five hexes for mutual distinguishability, against the card fill `#fdfaf3`, against the terrain strokes (border `#2b2b2b`, river `#3f9fd0`, mountain `#3f7d4a`), and for WCAG AA. Green `#3aa757` beside mountain green `#3f7d4a` is the first pair to look at. No agent changes a hex.
- **Whether the outline reads "at a glance"** (SCRUM-4 AC12) — `npm run dev`, start a 2-player game, compare each of the four starting cards' outlines against the legend swatch for the same colour name. No agent can perform this step and no test in this repo covers it.
- **That `#2b2b2b` is also the border terrain stroke.** Pre-existing, invisible until SCRUM-5 puts unowned drawn cards on the board — but an unowned card outlined in border-black may then read as terrain rather than as a card.
- **Whether the card `aria-label` should name the owning colour.** Colour becomes the only channel carrying ownership (WCAG 1.4.1). Deliberately deferred because SCRUM-5 Task 7 restructures that same label into a shared `describeStationCard()`.
- **Whether to approve `jsdom` + `@testing-library/react` and a Vitest environment split.** Every static gate and all existing tests pass on the *broken* code — that is what let this ship. Two new devDependencies are your call, not the executor's.
- **Whether to consolidate the three `displayFor` copies** — `Board.tsx:43` (returns `null`), `SeatLegend.tsx:73` and `DebugPanel.tsx:143` (both `'#888888'`) — with their divergent null behaviour.
- **Ordering against SCRUM-5 and SCRUM-15**, both `PLANNED` and both editing these same two files. Whichever lands second needs a trivial reconcile; order affects the diff, not correctness.

---

## Phase 1 — Move the seat colour onto the inline style, and label the fallback

Two tasks, one file each. Task 1 is the fix; Task 2 is the comment that stops the retained CSS declaration reading as the live outline colour — the plan treats it as part of the fix, not tidying, because it is the mitigation for the one real objection to this approach. The phase ends type-checking and lint-clean with the board internally consistent: an owned card takes its inline seat colour, an unowned card falls through to the stylesheet exactly as it does today.

### Task 1: Apply the seat colour as an inline style in `src/ui/StationCard.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/StationCard.tsx:12-15,30`

- [x] **Step 1: Correct the `colour` prop's doc comment**

Lines 11-15 currently read:

```ts
interface StationCardProps {
  station: PlacedStation
  /** The owning colour's display hex for a starting station, else null. */
  colour: string | null
}
```

Replace with:

```ts
interface StationCardProps {
  station: PlacedStation
  /** The display hex of the colour owning this card's §7.3 player marker, or
   *  null when the card carries no marker. */
  colour: string | null
}
```

The existing wording is factually wrong: `src/rules/turn.ts:186` sets `markerOwner: card.flags.needsMarker ? colour : null`, so a *drawn* marker station carries a colour too. The prop is per-`markerOwner`, not per-starting-station. The name and type `colour: string | null` stay byte-identical — SCRUM-5 Task 7 (`PLANNED`) adds a `.station-card__marker` circle reading this same prop.

- [x] **Step 2: Replace the `stroke` presentation attribute with a conditional inline style**

Line 30, inside `<rect className="station-card__body">`, currently reads:

```tsx
stroke={colour ?? undefined}
```

Replace with:

```tsx
style={colour === null ? undefined : { stroke: colour }}
```

Delete the `stroke` attribute entirely — leaving both would restore the conflict. The explicit `colour === null` test is deliberate and must not be simplified to `style={{ stroke: colour ?? undefined }}`: both render identically, but the conditional states the two-state intent and guarantees no inline declaration exists in the fallback case, so the stylesheet applies cleanly rather than by omission. The type is inferred as `React.CSSProperties | undefined` from the `rect` element's `style` prop — no annotation, no cast, no `any`.

- [x] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0; no TypeScript errors and no ESLint errors or warnings.

### Task 2: Record in `src/ui/StationCard.css` that the retained `stroke` is the no-owner fallback ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/StationCard.css:1-5`

- [x] **Step 1: Add the comment above `.station-card__body`**

Lines 1-5 currently read:

```css
.station-card__body {
  fill: #fdfaf3;
  stroke: #2b2b2b;
  stroke-width: 3;
}
```

Replace with:

```css
/* stroke here is the fallback for a card with no markerOwner. An owned card's
   seat colour arrives as an inline style from StationCard.tsx, which outranks
   this rule — do not re-apply the colour as an SVG presentation attribute, it
   loses to any author rule (SCRUM-12). */
.station-card__body {
  fill: #fdfaf3;
  stroke: #2b2b2b;
  stroke-width: 3;
}
```

**Every declaration stays byte-identical** — `fill`, `stroke`, and `stroke-width` are unchanged, and no other rule in the file is touched. This step adds a comment and nothing else. Deleting `stroke: #2b2b2b;` here would leave every unowned card with the SVG initial `stroke: none` and no outline at all, which is the rejected design.

**Note (added during the review-fix pass):** the "currently reads" snippet above, quoted when this task was written, shows `stroke-width: 3;` inside `.station-card__body`. That declaration is no longer in the file — SCRUM-15 landed concurrently and moved the body stroke width to an SVG presentation attribute (`strokeWidth={metrics.bodyStroke}` in `StationCard.tsx`), removing the fixed `stroke-width: 3;` from the stylesheet. QA independently confirmed via `git diff HEAD -- src/ui/StationCard.css` that this contract's own diff added only the four-line comment above and that `stroke-width: 3;` was already absent beforehand — so the snippet is a stale illustration of the file's state at plan-writing time, not an unauthorised declaration change by this contract. The current file (verified) is:

```css
.station-card__body {
  fill: #fdfaf3;
  stroke: #2b2b2b;
}
```

- [x] **Step 2: Confirm formatting and lint are still clean after the CSS edit**

Run: `npm run format:check; npm run lint`
Expected: both exit 0; Prettier reports no unformatted files.

---

## Phase 2 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean, that the presentation attribute is genuinely gone rather than merely shadowed, and that the fallback survived.

### Task 3: Confirm the cascade fix is exactly as designed ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Confirm no `stroke` presentation attribute remains in the component**

Run: `Select-String -Path src\ui\StationCard.tsx -Pattern "stroke="`
Expected: zero hits. A hit means the attribute was left alongside the inline style, which restores the conflict this contract exists to remove.

Result: zero hits (no output). Matches expected.

- [x] **Step 2: Confirm the conditional inline style is present**

Run: `Select-String -Path src\ui\StationCard.tsx -Pattern "style=\{colour === null \? undefined : \{ stroke: colour \}\}"`
Expected: exactly one hit, on the `.station-card__body` rect.

Result: exactly one hit — `src\ui\StationCard.tsx:35:        style={colour === null ? undefined : { stroke: colour }}`. Matches expected.

**Note (added during the review-fix pass):** the line number recorded above was originally `31`; it is now `35` because SCRUM-15's `cardMetrics` refactor landed in this same file while this contract was executing, inserting a JSDoc block (lines 12-19) above the component. The reconcile was clean — SCRUM-15 moved *size* attributes (`strokeWidth={metrics.bodyStroke}`, `fontSize={...}`) onto SVG presentation attributes and removed the corresponding fixed values from the stylesheet; SCRUM-12 owns the *colour* via the inline `style` on the same `<rect>`. Different properties on the same element, no collision. Re-verified against the current tree: `Select-String -Path src\ui\StationCard.tsx -Pattern "style=\{colour === null \? undefined : \{ stroke: colour \}\}"` still returns exactly one hit, now at line 35.

- [x] **Step 3: Confirm the stylesheet fallback survived intact**

Run: `Select-String -Path src\ui\StationCard.css -Pattern "stroke: #2b2b2b"`
Expected: exactly one hit, inside the `.station-card__body` rule. Zero hits means the fallback was deleted and every unowned card now renders strokeless.

Result: exactly one hit — `src\ui\StationCard.css:7:  stroke: #2b2b2b;`. Matches expected.

- [x] **Step 4: Measure the changed file against the 400-line budget**

Run: `(Get-Content src\ui\StationCard.tsx | Measure-Object -Line).Lines`
Expected: well under 400 (roughly 68). Record the actual number rather than estimating.

Result (original, before SCRUM-15 landed): `61`. Cross-checked against `(Get-Content src\ui\StationCard.tsx).Count` = `67`.

**Note (added during the review-fix pass):** re-run against the current tree after SCRUM-15's concurrent `cardMetrics` refactor landed in this file: `(Get-Content src\ui\StationCard.tsx | Measure-Object -Line).Lines` now returns `79`, and `(Get-Content src\ui\StationCard.tsx).Count` now returns `84` (the file's last numbered line in a full read is 85, which is a trailing blank line after `export default StationCard`). `Measure-Object -Line` continues to silently exclude blank lines when its input comes from `Get-Content` — a PowerShell counting quirk, not a defect. Both current numbers (79, 84) are well under the 400-line budget, same conclusion as before, just larger because SCRUM-15 added a JSDoc block (lines 12-19) and moved several size attributes onto the JSX that were previously plain CSS declarations.

### Task 4: Confirm the `src/rules/` boundary still holds ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. The change is confined to `src/ui/` and creates no import into the pure tree, so this must match the pre-change result.

Result: zero hits (no output). Matches expected.

### Task 5: Static gates and full suite ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Prettier reports no unformatted files; Vitest reports 0 failed. Quote the `Tests  N passed` summary line. Note that these gates all passed on the *broken* code too — they prove nothing regressed, not that the bug is fixed.

Result (run by QA): `npm run typecheck` — PASS (exit 0). `npm run lint` — PASS (exit 0); scoped `npx eslint src/ui/StationCard.tsx` — 0 errors, 0 warnings. `npm run format:check` — PASS, "All matched files use Prettier code style!". `npm test` — **FAIL**: `Test Files  2 failed | 15 passed (17)`, `Tests  2 failed | 253 passed (255)`, reproduced across three runs. Both failures are outside this contract's scope: `src/rules/__tests__/scoring.test.ts :: charges −1 for crossing the mountain, the river and the border alike (M10)` (expected length 3, got 4) and `src/rules/__tests__/setup.test.ts :: emits a board that passes validateSetup for every player count across 20 seeds (AC9)` (`SetupGenerationError: RIVER_TOO_NEAR_MOUNTAIN`). QA traced both to an unrelated, concurrently in-flight contract's uncommitted rewrite of `regularPolygon`'s vertex-0 placement in `src/rules/setupSamplers.ts` (self-documented as SCRUM-14) — not a SCRUM-12 defect, and no SCRUM-12 file is in the call path of either failing test. Recorded here and in `pr-description.md` as an environment caveat; not fixed by this contract per the pipeline's own attribution rule.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result (run by QA): PASS — exit 0, `dist/` written, no bundler errors.

### Task 6: Update the PR description ✓

- Skill: `none — documentation for the developer, no code written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder and to [SCRUM-12](https://amazerbeam.atlassian.net/browse/SCRUM-12).
- Summary: the seat colour moves from an SVG presentation attribute to a conditional inline `style`, which outranks author rules; `.station-card__body { stroke: #2b2b2b; }` is retained deliberately as the no-owner fallback and now carries a comment saying so. The `colour` prop's doc comment is corrected — it applies to any card with a `markerOwner`, not only starting stations.
- Why this shape over the two rejected alternatives: a CSS custom property needs an `as CSSProperties` cast, and an attribute-guarded `:not([stroke])` fallback re-breaks silently the moment a plain `stroke:` returns to the class. Name the third design considered — dropping `stroke` from the CSS and always supplying one from a constant — and the decoy-declaration objection it answers.
- Every item from the **Developer decides or observes** list above, verbatim in substance.
- Verification results from Phases 1 and 2, with actual command output — and the explicit statement that **no automated test covers this fix**: the suite runs `environment: 'node'` with a `*.test.ts`-only include (`vite.config.ts:11-14`), so a cascade bug is invisible to it. Every gate passed on the broken code. The guard is the Task 3 greps plus the developer's eyes.
- A one-line note for future contributors: in `StationCard`, an owned card's outline colour arrives as an inline style — an SVG presentation attribute cannot be used for it, because any author rule beats it unconditionally.

---

## Self-review

**Spec coverage:**
- Inline style carrying the seat colour, null-guarded so the stylesheet fallback applies — Task 1 Step 2; verified Task 3 Steps 1-2.
- `colour` prop doc-comment correction — Task 1 Step 1.
- `StationCard.css` comment, declarations byte-identical — Task 2 Step 1; fallback verified Task 3 Step 3.
- Verification gates (`typecheck`, `lint`, `format:check`, `test`, `build`) — Task 1 Step 3, Task 2 Step 2, Task 5 Steps 1-2.
- Scoped greps proving the attribute is gone, the inline style present, the fallback intact — Task 3 Steps 1-3.
- `pr-description.md` naming everything the developer must judge by eye — Task 6.
- Out of scope and correctly absent: `Board.tsx`, `BoardTerrain.css`, `HeroScene.tsx`, any `src/rules/` change, any new constant or export, any test.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest` or the dev server, hand-edits the lockfile, proposes an `eslint-disable`, or invents a tuning value.

**Type / name consistency:** `StationCardProps.colour` stays `string | null` in Task 1 Step 1 and in `plan.md` Part 2 → Data shapes, matching SCRUM-5 Task 7's pending snippets. The class `station-card__body` matches `src/ui/StationCard.tsx:25` and `src/ui/StationCard.css:1` and is not renamed. The expression `style={colour === null ? undefined : { stroke: colour }}` is written identically in Task 1 Step 2 and Task 3 Step 2. No `rules.json` key, `src/constants/` entry, exported symbol, `Move` kind, reason code, or `data-testid` is added or changed.

**Phase boundary cleanliness:**
- *Phase 1* ends with both files edited and `typecheck`, `lint` and `format:check` clean. It is safe to stop after Task 1 alone — the fix renders correctly without Task 2's comment, which adds no declaration — but the plan treats the comment as part of the fix, so the phase is not complete until both land.
- *Phase 2* makes no production change — greps, a line count, gates, and a document — so it cannot leave the tree inconsistent.
