# Tasks: Hero banner artwork overlaps and sits behind the New Game panel

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01
Completed: 2026-08-01

**Goal:** Bound the `HeroScene` artwork to the rounded band it already paints as its own background, and give `.app-shell` owned vertical rhythm, so the "Early prototype" caption and the New Game panel sit clearly below the hero at every viewport width.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `src/ui/HeroScene.tsx:80-86` — add a `clipPath#hero-scene-frame` to the existing `<defs>`; `:88-198` — wrap every painted element in a single clipped `<g>`
- `src/ui/HeroScene.css:5` — `overflow: visible` → `overflow: hidden`
- `src/ui/AppShell.css:1-46` — add `gap: 1.5rem` to `.app-shell`; zero the now-redundant vertical margins on `.app-shell__status`, `.app-shell__error`, `.app-shell__game`

**Deleted:** (none)

**Developer decides or observes:**
- **The two repro viewports** — 1440×900 and 520×760 in Chrome. The hills must terminate at the rounded band edge; the caption and the New Game panel must sit on the page background with clear air above them.
- **Trains clipping at the band edges** — the rails run from `x = −60` to `x = 1020` in a 960-wide `viewBox`, so trains previously flew over the page margins and now vanish at a hard rounded edge. Judge whether that reads as a scene window or as an abrupt cut.
- **`gap: 1.5rem` in `.app-shell`** — planner's choice of air between the band and the New Game panel. Stylesheet rhythm, not a `rules.json` tunable; change it in one place after seeing it.
- **`.hero-banner`'s `gap: 0.75rem` (12px) above the caption** — deliberately left as-is. If the caption still reads tight at 520px, that value in `HeroBanner.css` is the single thing to raise.
- **`.app-shell { justify-content: center }`** — out of scope by decision at the approval gate. Once a board renders taller than the viewport, centring makes the top of the page unreachable by scrolling. Wants its own ticket.
- **Reduced-motion parked trains** — with the OS "reduce motion" setting on, all three parked trains should sit fully inside the band (`y ≈ 114–253` of 340 by arithmetic). One toggle away, and a half-clipped parked train would be an obvious regression.

---

## Phase 1 — Bound the artwork and space the shell

The whole fix. Task 1 clips the scene and closes the overflow hole in the same edit — splitting them would leave a boundary where `overflow: hidden` clips to the square element box while the painted background is rounded, showing green square corners. Task 2 is an independent stylesheet change. The phase ends type-checking, lint-clean and format-clean, with the app in its final intended state; everything after it is verification only.

### Task 1: Clip `HeroScene` to its rounded band ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/HeroScene.tsx:80-199`
- Modify: `src/ui/HeroScene.css:1-6`

- [x] **Step 1: Add the `clipPath` to the existing `<defs>` block**

In `src/ui/HeroScene.tsx`, immediately after the closing `</linearGradient>` and before `</defs>`, insert the clip. Its rect mirrors the background rect at `:88` exactly — same four values, same user-unit coordinate system, so the clip and the painted band can never disagree.

```tsx
        {/* The scene is authored to bleed past the viewBox — the hills are arcs meant to be
            cut off by the band edge. Clip to the same rect the background paints (SCRUM-13). */}
        <clipPath id="hero-scene-frame">
          <rect width="960" height="340" rx="28" />
        </clipPath>
```

- [x] **Step 2: Wrap every painted element in the clipped group**

Still in `src/ui/HeroScene.tsx`, open a single `<g>` immediately after `</defs>` and close it immediately before `</svg>`. Everything currently between those two points — the background `<rect>`, `hero-scene__hills`, the sparkles, `hero-scene__coils`, both `RAILS.map(...)` blocks and the `STATIONS.map(...)` block — moves inside it, indented one level.

```tsx
      </defs>

      <g clipPath="url(#hero-scene-frame)">
        <rect width="960" height="340" rx="28" fill="url(#hero-sky)" />

        {/* …every existing painted element, unchanged, re-indented by two spaces… */}
      </g>
    </svg>
```

Change nothing else: no coordinate, colour, duration, `park` transform, `key`, or class name is edited. The `<animateMotion>` elements stay exactly where they are inside their train groups.

- [x] **Step 3: Close the overflow hole in the stylesheet**

In `src/ui/HeroScene.css`, replace line 5. The clip does the work; this stops a future element authored outside the `viewBox` from reintroducing the same bug while the clip quietly fails to cover it.

```css
.hero-scene {
  display: block;
  width: 100%;
  height: auto;
  /* The UA default, restated: nothing in this scene may paint outside its own box. */
  overflow: hidden;
}
```

- [x] **Step 4: Normalise formatting after the re-indent**

Run: `npm run format`
Expected: exits 0. Prettier rewrites the re-indented block; no other file should change.

- [x] **Step 5: Type-check**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [x] **Step 6: Confirm the file is still inside the size budget**

Run: `(Get-Content src\ui\HeroScene.tsx | Measure-Object -Line).Lines`
Expected: a number under 400 (239 before this change, so roughly 246 after). Actual: 243.

### Task 2: Give `.app-shell` owned vertical rhythm ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/AppShell.css:1-46`

- [x] **Step 1: Add the `gap` and zero the now-redundant child margins**

`HeroBanner` and `NewGamePanel` are adjacent flex items with nothing between them, so the panel sits flush against the band even once the artwork is clipped. One `gap` on the parent owns the spacing; the per-child vertical margins are removed in the same edit so two systems do not stack. Apply all four edits together — `src/ui/AppShell.css` ends as:

```css
.app-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* One owned value for vertical rhythm — children carry no top/bottom margins. */
  gap: 1.5rem;
  min-height: 100vh;
  margin: 0 auto;
  max-width: 64rem;
  padding: 2rem 1.5rem;
}

.app-shell__status {
  margin: 0;
  font-family: system-ui, sans-serif;
  color: #4a4a4a;
}

.app-shell__error {
  margin: 0;
  padding: 0.9rem 1.1rem;
  border: 1px solid #c2483f;
  border-left-width: 5px;
  border-radius: 8px;
  background: #fdf3f2;
  font-family: system-ui, sans-serif;
  max-width: 70ch;
}
```

`.app-shell__error h2`, `.app-shell__error p` and `.app-shell__error-detail` keep their current declarations untouched — those margins are internal to the error block, not shell rhythm.

- [x] **Step 2: Drop the margin from `.app-shell__game`**

The game section is a flex child of `.app-shell` and now inherits the `gap`.

```css
.app-shell__game {
  margin-top: 0;
}
```

- [x] **Step 3: Confirm formatting and types are still clean**

Run: `npm run format:check; npm run typecheck`
Expected: both exit 0.

---

## Phase 2 — Final verification

No production changes. Only checks that the cumulative work is clean, that the string-bound clip reference resolves, and that nothing outside the change set moved.

### Task 3: Confirm the clip is wired and the overflow hole is closed ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Confirm the clip id is defined and referenced as a matched pair**

An unresolvable `url(#…)` makes `clip-path` a silent no-op in Chrome, which restores the bug with no error anywhere — so both halves must be present.

Run: `Select-String -Path src\ui\HeroScene.tsx -Pattern "hero-scene-frame"`
Expected: exactly 2 hits — the `<clipPath id="hero-scene-frame">` definition and the `clipPath="url(#hero-scene-frame)"` reference. Actual: 2 hits, line 89 (`<clipPath id="hero-scene-frame">`) and line 94 (`<g clipPath="url(#hero-scene-frame)">`). Confirmed.

- [x] **Step 2: Confirm `overflow: visible` is gone from the hero stylesheet**

Run: `Select-String -Path src\ui\HeroScene.css -Pattern "overflow: visible"`
Expected: zero hits. Actual: zero hits. Confirmed.

- [x] **Step 3: Confirm the scene's artwork was not restyled**

The fix clips; it must not have moved a hill, a rail or a station. The three hill ellipses keep their authored out-of-`viewBox` positions.

Run: `Select-String -Path src\ui\HeroScene.tsx -Pattern 'cy="352"|cy="366"|cy="356"'`
Expected: 3 hits, one per hill ellipse. Actual: 3 hits — line 98 (`cy="352"`), line 99 (`cy="366"`), line 100 (`cy="356"`), all with their original `cx`/`rx`/`ry`/`fill` values intact. Confirmed.

### Task 4: Confirm the `src/rules/` boundary still holds ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

No file under `src/rules/` is in this change set; this is the standing regression check.

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. Actual: the command as literally written failed to parse in PowerShell — the embedded `\"react\"` inside a double-quoted `-Pattern` argument split into a second positional argument (`ParameterBindingException: PositionalParameterNotFound`). Re-ran the identical regex with single-quoted escaping (`-Pattern 'from ''react''|from "react"|\bwindow\.|\bdocument\.|localStorage'`): zero hits. Confirmed the glob matched real content first (`src/rules/**/*.ts` resolved to 30 files — the engine has grown well past the scaffold's single `scaffold.test.ts`), so the zero-hit result reflects a real, non-trivial boundary check, not an empty search.

### Task 5: Static gates, full suite and production build ✓ — with a caveat on the suite, see below

- Skill: `none — verification only, no code written`

- [x] **Step 1: Type-check, lint, formatting and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0. Vitest reports 0 failed — the suite is untouched by this change, so its pass count must match the pre-change baseline.
Actual (run by QA): `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run format:check` exit 0 ("All matched files use Prettier code style!"); `npm test` → `Test Files  2 failed | 15 passed (17)`, `Tests  2 failed | 253 passed (255)`.

**The suite is NOT green on this branch, and the `Expected:` line above is not met.** The two failures are `scoring.test.ts :: charges −1 for crossing the mountain, the river and the border alike (M10)` (expected 3 crossings, got 4) and `setup.test.ts :: emits a board that passes validateSetup for every player count across 20 seeds (AC9)` (`RIVER_TOO_NEAR_MOUNTAIN`, seed 0, 3 players). Neither file is in this contract's change set; both are rules-engine tests belonging to the in-flight `SCRUM-2-4` work sharing this branch and working tree. QA additionally observed `src/rules/setupSamplers.ts` change content between two `npm run lint` runs seconds apart, confirming concurrent uncommitted edits landing mid-validation. The step's premise — that the pre-change baseline was 0 failed — did not hold, because the baseline itself moved underneath this contract. Ticked as executed and correctly attributed, not as green.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual (run by QA): exit 0 on both runs. `dist/index.html`, `dist/assets/index-*.css` (~6.7 kB), `dist/assets/index-*.js` (~236 kB / ~75 kB gzip). No bundler errors or warnings. Note `npm run build` is wired as `npm run lint && tsc -b && vite build`, so lint passed inside it too.

### Task 6: Update the PR description ✓

- Skill: `none — documentation for the developer, no code written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder and the SCRUM-13 ticket.
- Summary: the root cause (`overflow: visible` plus hills authored up to 136 user units below the `viewBox`), and the fix (`clipPath#hero-scene-frame` mirroring the painted band, `overflow: hidden`, `.app-shell` gap).
- Every entry from this file's "Developer decides or observes" list, verbatim — especially the two repro viewports, the reduced-motion glance, and the clipped trains.
- Verification results from Phases 1 and 2, quoting the actual Vitest summary line and the exit status of each gate.
- A one-line note for future contributors: decorative SVG in this project is clipped to its own painted band; add new elements inside the `hero-scene-frame` group, not after it.

---

## Self-review

**Spec coverage:**
- Clip every painted element to the rounded rect — Task 1, Steps 1–2; verified in Task 3, Step 1.
- Replace `overflow: visible` with `overflow: hidden` — Task 1, Step 3; verified in Task 3, Step 2.
- Add vertical rhythm to `.app-shell` — Task 2, Steps 1–2.
- Keep `HeroBanner` mounted and unchanged — no task touches `AppShell.tsx` or `HeroBanner.tsx`/`HeroBanner.css`; the File map lists neither.
- Confirm by static gates plus a developer visual check — Tasks 4–5 (gates), File map "Developer decides or observes" and Task 6 (the visual check, which is the developer's).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line.

**Type / name consistency:** One new identifier across the whole contract — the SVG id `hero-scene-frame`, spelled identically in Task 1 Step 1 (definition), Task 1 Step 2 (`clipPath="url(#hero-scene-frame)"`), Task 3 Step 1 (the grep), Task 6 (the contributor note), and `plan.md` Part 2 → Data shapes. No type, prop, export, `rules.json` key, or `Move` variant changes. Existing class names (`.hero-scene`, `.app-shell`, `.app-shell__status`, `.app-shell__error`, `.app-shell__game`) are reused verbatim; none is renamed.

**Phase boundary cleanliness:**
- **Phase 1** ends with the clip in place, the overflow closed and the shell spaced — `npm run typecheck` and `npm run format:check` both run inside it (Task 1 Steps 4–5, Task 2 Step 3), so the tree type-checks and is format-clean with no half-applied edit. Task 1 keeps the clip and the `overflow` change together, so there is no intermediate state with square-clipped corners against a rounded background.
- **Phase 2** makes no production change at all — three greps, a line-count-free boundary check, the four static gates, the build, and one markdown file written into this plan folder.
