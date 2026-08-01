# Fix: Hero banner artwork overlaps and sits behind the New Game panel

**Ticket:** [SCRUM-13](https://amazerbeam.atlassian.net/browse/SCRUM-13) — Hero banner artwork overlaps and sits behind the New Game panel
**Plan:** `.claude/contract/SCRUM-13-hero-banner-artwork-overlap/plan.md`

## Summary

The hero SVG was painting outside its own box. `src/ui/HeroScene.css` set `overflow: visible` on the root `<svg>`, overriding the user-agent default of `hidden`. Meanwhile the scene's three decorative hill ellipses are authored deliberately below the `viewBox` bottom edge (`cy=352 ry=96`, `cy=366 ry=110`, `cy=356 ry=84` against a 340-tall box) so they read as arcs cut off by the horizon — the largest reaches 136 user units past the box. With overflow set to visible, that cut-off never happened: the ink ran straight into the "Early prototype" caption and the New Game panel below it, since the browser lays out following content against the box, not against whatever the SVG actually paints.

**The fix:**

- `src/ui/HeroScene.tsx` — added a `<clipPath id="hero-scene-frame">` holding `<rect width="960" height="340" rx="28" />` to the existing `<defs>` beside the `hero-sky` gradient, mirroring the background rect exactly so the clip and the painted band share a coordinate system and cannot drift. Every painted element (background rect, hills, sparkles, coils, both `RAILS.map` passes, `STATIONS.map`, trains) was wrapped in a single `<g clipPath="url(#hero-scene-frame)">`. No coordinate, colour, duration, `park` transform, `key`, or class name was edited.
- `src/ui/HeroScene.css` — `overflow: visible` → `overflow: hidden`, so a future element authored outside the `viewBox` can't reintroduce the bug while the clip quietly fails to cover it.
- `src/ui/AppShell.css` — added `gap: 1.5rem` to `.app-shell`; zeroed the now-redundant vertical margins on `.app-shell__status`, `.app-shell__error` (both were `1rem 0`) and `.app-shell__game` (was `margin-top: 1.2rem`), so one rule owns vertical rhythm instead of two systems stacking.

An SVG `clipPath` was used instead of CSS `border-radius` + `overflow: hidden` because the band's `rx="28"` is in user units and scales with the element, whereas a CSS `28px` radius would not — at 520px wide the CSS corner would be 28px against a painted corner of roughly 14px, showing a pale sliver at each corner.

## Things for the developer to check or decide

These are visual/judgement calls the contract deliberately left to you — nothing here is a code TODO.

- **The two repro viewports** — 1440×900 and 520×760 in Chrome. The hills must terminate at the rounded band edge; the caption and the New Game panel must sit on the page background with clear air above them.
- **Trains clipping at the band edges** — the rails run from `x = −60` to `x = 1020` in a 960-wide `viewBox`, so trains previously flew over the page margins and now vanish at a hard rounded edge. Judge whether that reads as a scene window or as an abrupt cut.
- **`gap: 1.5rem` in `.app-shell`** — the planner's choice of air between the band and the New Game panel. Stylesheet rhythm, not a `rules.json` tunable; change it in one place after seeing it.
- **`.hero-banner`'s `gap: 0.75rem` (12px) above the caption** — deliberately left as-is. If the caption still reads tight at 520px, that value in `HeroBanner.css` is the single thing to raise.
- **`.app-shell { justify-content: center }`** — out of scope by decision at the approval gate. Once a board renders taller than the viewport, centring makes the top of the page unreachable by scrolling. Wants its own ticket.
- **Reduced-motion parked trains** — with the OS "reduce motion" setting on, all three parked trains should sit fully inside the band. The Defender independently re-derived the `Train` bounding box (roughly x ∈ [-32, 16], y ∈ [-46, 0.5] relative to its origin) and the three `park` transforms, and found parked trains land at y ∈ [106, 152.5], [130, 176.5] and [212, 258.5] — all comfortably inside the 0–340 box. (The plan's stated "y ≈ 114–253" undersold the puff extent slightly; the conclusion — no half-clipped parked train — still holds.) One toggle away, and a half-clipped parked train would be an obvious regression, so it's worth a glance.

## Verification

**Phase 1 (Implementer):**
- `npm run format` — exit 0; rewrote only `src/ui/HeroScene.tsx`
- `npm run typecheck` — exit 0, no errors (run twice)
- `npm run format:check` — exit 0, "All matched files use Prettier code style!"
- `src/ui/HeroScene.tsx` line count — 243 (budget 400)

**Phase 2 (greps):**
- `hero-scene-frame` in `HeroScene.tsx` — exactly 2 hits (definition line 89, reference line 94)
- `overflow: visible` in `HeroScene.css` — 0 hits
- `cy="352"|cy="366"|cy="356"` in `HeroScene.tsx` — 3 hits (lines 98–100), hills unmoved
- `src/rules/` boundary grep — 0 hits, confirmed independently by QA with PowerShell-safe quoting

**QA (final gates):**
- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm run format:check` — exit 0
- `npm test` — **`Test Files  2 failed | 15 passed (17)`, `Tests  2 failed | 253 passed (255)`**
- `npm run build` — exit 0; `dist/index.html`, `dist/assets/index-*.css` (~6.7 kB), `dist/assets/index-*.js` (~236 kB / ~75 kB gzip); no bundler errors

**On the two test failures — read this before assuming the build is broken:** the suite is **not** green on this branch, and that is expected, not a regression from this PR. The two failures are:

- `scoring.test.ts :: charges −1 for crossing the mountain, the river and the border alike (M10)` — expected 3 crossings, got 4
- `setup.test.ts :: emits a board that passes validateSetup for every player count across 20 seeds (AC9)` — `RIVER_TOO_NEAR_MOUNTAIN`, seed 0, 3 players

Neither test touches anything in this PR's change set. Both belong to the in-flight `SCRUM-2-4` rules-engine work sharing this branch and working tree — QA further observed `src/rules/setupSamplers.ts` change content between two lint runs seconds apart, confirming concurrent uncommitted edits landing during validation. Do not read these two failures as caused by SCRUM-13.

Reviewer verdicts: Code-Evaluator APPROVED, Defender APPROVED (0 critical, 0 warning, 0 info), QA ALL PASSED for this contract's scope.

## Note for future contributors

Decorative SVG in this project is clipped to its own painted band — add new elements inside the `hero-scene-frame` group (`<g clipPath="url(#hero-scene-frame)">`) in `HeroScene.tsx`, not after it, or they will paint unclipped again.
