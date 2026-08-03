# PR: Design a replacement for the Hex layer in the Skirmish (SCRUM-17)

Plan: [`plan.md`](./plan.md)

## Summary

Replaces the Hex board layer inside a Skirmish with a single-lane advance-with-entrenchment
mechanic, escalated only for strongholds and the goal node — ordinary campaign nodes resolve by a
single card round's score comparison alone, with no board phase. Adds an interactive, standalone
HTML report (`.docs/design/skirmish-board-report.html`) that lets a developer inspect the
conversion function, the AC3 worked example, and the AC6 campaign arithmetic live, with no build
step.

This is a documentation-only contract. No file under `src/` was touched; the only executable
artifact is the standalone HTML report, opened directly or via a static server.

**Files created:**
- `.docs/design/skirmish-board-replacement.md` — the AC1 design doc: mechanic model, conversion
  function (AC2), termination/tiebreak (AC4), randomness confinement (AC5), the map-layer hook,
  the two-tier resolution rule (feeds AC6), the AI-tractability argument (AC7), the rejected
  Halma-jumps alternative, and compatible future directions.
- `.docs/design/skirmish-board-report.html` — the AC8 interactive report: an intercept-driven
  allowance enumeration table, an AC3 before/after worked-example diagram with offensive/defensive
  branch buttons, and an adjustable AC6 campaign-arithmetic panel.

**Files modified:**
- `.docs/design/hybrid-concept.md` — points the "Battle loop" and "Settled" sections at the new
  design doc instead of describing Hex as the settled board substrate.
- `.docs/design/concept-critique.md` — adds a superseded-by header note; the historical Hex
  critique (Problems 1–3) is kept intact as the record of why the replacement was made.

## Developer decisions needed

Every number below is explicitly marked illustrative in both the design doc and the report — none
is a claim about the shipped game. These are the "Developer decides or observes" items from the
plan's File map, carried forward for this PR:

- **Final values for the intercept `b`, lane half-length `N`, round cap `R`, and entrenchment
  stack cap.** Illustrative throughout: `b = 2`, `N = 3`, `R = 4`, `stackCap = 3`.
- **A numeric target session length for the AC6 comparison.** The ticket names none; the report's
  campaign panel ships with a `90`-minute placeholder input the developer can change live.
- **How many campaign nodes are strongholds vs. ordinary**, which drives the campaign arithmetic.
  The report ships with `9` ordinary / `3` escalated as an illustrative split.
- **Whether rejecting Halma-style chained jumps is the right call.** The design doc's "Rejected
  alternative" section argues it fails AC3's specific offense/defense-fork requirement, but credits
  it as the least-new-invention candidate — flagged explicitly as a judgement call the developer
  may weigh differently (see `plan.md`'s Risks section).
- **Whether the HTML report reads clearly to someone unfamiliar with either parent game.** QA
  confirmed the report's slider and campaign inputs update the DOM without a console error
  (functional check); whether the report actually explains the concept well is a reading only the
  developer can make by opening it.

## Verification results (Tasks 8–10)

**Task 8 — AC coverage and cross-file parameter match:**
- Grep for the 7 AC-required section markers in the design doc: 6 hit directly (`allowance(points)`,
  `Termination and tiebreak`, `How the map layer feeds`, `Two-tier resolution`, `Rejected
  alternative`, `AI approach`). `Campaign arithmetic` had zero literal hits — the .md file has no
  heading spelled that way; the equivalent AC6 content (why the two-tier split shrinks the campaign
  total) is present under the heading "Two-tier resolution — most nodes never see a lane at all"
  (lines 137–151). Treated as present, not a gap.
- Grep for shared illustrative constants across the doc and the report: `N = 3` and `R = 4` hit in
  both files exactly. `b = 2` (with spaces) hit only in the report (`bSlider` `value="2"`) — the
  doc expresses the same value as `b=2` with no spaces inside a table header (line 83). Confirmed
  by a follow-up grep that the doc does contain `b=2` — this is a grep-pattern spacing artifact, not
  real drift between the two files.

**Task 9 — placeholder scan:** zero hits for `TBD|TODO|implement later|fill in details|appropriate
error handling` across all four new/modified files.

**Task 10 — static gates and build:**
- `git status --porcelain -- src`: no output — `src/` untouched by this contract.
- `npm run typecheck`: exit 0, no output.
- `npm run lint`: exit 0, no output (no errors or warnings).
- `npm test`: exit 0 — `Test Files  1 passed (1)`, `Tests  1 passed (1)` (the existing smoke suite,
  unchanged; this contract added no test coverage of its own since it touches no `.ts`/`.tsx`).
- `npm run build`: exit 0 — 16 modules transformed, `dist/index.html`, `dist/assets/index-*.css`,
  `dist/assets/index-*.js` written, built in 406ms, no bundler errors.

## Note for future contributors

The illustrative parameters (`b`, `N`, `R`, entrenchment stack cap) live in both
`skirmish-board-replacement.md` and `skirmish-board-report.html` by hand — there is no compiler or
build-time link between them, since the report is a standalone static file with no build step.
Re-run Task 8's cross-file grep in `tasks.md` after any future edit to either file to catch drift.
