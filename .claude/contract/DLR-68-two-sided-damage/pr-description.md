# DLR-68 — Two-sided damage: card value × Standing, both directions, once at trick 13

Jira: [DLR-68](https://amazerbeam.atlassian.net/browse/DLR-68)
Plan: [`plan.md`](./plan.md) in this folder. Task-by-task record: [`tasks.md`](./tasks.md).

## Summary

`huntDamage(finalState)` is the single engine entry point that computes both sides' damage
for one finished Hunt, off the one declaration the player made:

- `incoming` is keyed by the side the damage is **applied to** (depleted), never by the side
  that dealt it — the crossing happens once, inside `huntDamage`, via `otherSide()`, so no
  consumer has to remember to invert.
- `roundDamage` is applied at exactly one point — inside `scoreHunt`'s `damage` field — so
  every `HuntDamage` value in the program means "rounded, applicable damage" with no second
  meaning anywhere.
- Two guards throw rather than returning zero: an unfinished Hunt (`phase !== Complete`)
  throws `HuntNotScorableError` with `reason: 'unfinished'`; an undeclared one throws with
  `reason: 'undeclared'`. A corrupt per-side trick count is deliberately *not* caught — it
  propagates `resolveStanding`'s existing `RangeError` untouched, so it cannot be silently
  scored as 0.

Also added, by a mid-planning scope widening (see below): the Standing track in the HUD's
top bar, a live profile of the configured multiplier table with the player's current
bracket and per-trick pips marked.

## Decisions the developer must make

Copied from `tasks.md`'s File map → "Developer decides or observes":

- **The first `class` in `src/`.** `HuntNotScorableError` is the first `Error` subclass and
  the first non-`RangeError` throw anywhere in `src/`, approved at the plan gate. The
  classless fallback is two built-in error types plus message matching — a brittle,
  string-bound surface. Worth a second look if you'd rather stay classless.
- **The rounded on-screen equation.** `scoreHunt` feeds the live end panel, so a ×0.5 band on
  an odd card total now renders as e.g. `123 × 0.5 = 62` — correct, but it reads as
  arithmetically wrong to a player. Look at a Greedy-band Hunt with an odd card total. Copy
  call, owned by DLR-71.
- **`HuntLedger.tsx:20` duplicates the equation** (`spoils * band.multiplier`) inside the
  component rather than reading the engine's own `damage`. After this contract the mid-round
  preview is unrounded while the end panel is rounded — they can disagree by 0.5. Out of
  scope (UI file); **recommend filing its own ticket.**
- **`WarCouncilRound.tsx:71` holds a local `const huntDamage`** (a `Record<PlayerSide,
  HuntDamage>` built from two `scoreHunt` calls, unrelated to the engine's new export of the
  same name). Once the next ticket imports the engine's `huntDamage` into that file, it hits
  a shadowing hazard. Cannot be renamed from this contract — flagged for DLR-70/DLR-71, which
  restructure that component anyway.
- **The config↔design-doc coupling the enumeration fixture creates.** `huntEnumeration.test.ts`
  transcribes `hybrid-design.md` §8's fourteen-split table as a frozen fixture. Retuning
  `src/hunt/config.ts`'s tables breaks 28 transcribed assertions — by design, since the point
  is to catch config and the design doc drifting apart. A retune is therefore a two-file
  change (config + this fixture) plus DLR-77 for the doc rewrite. Your call whether that
  coupling is wanted; the alternative is deriving the fixture too, which would make it assert
  nothing about §8.

## AC1 deviation, stated plainly

`HuntDamage.spoils` is **not** renamed to `cardValue`, by developer decision on 2026-08-12
(*"spoils is an ok name to code with for a prototype and if we want to change the UI later I
can"*). This is what keeps the no-UI-file boundary intact at the point the decision was
made: the rename would have touched three read sites in two `.tsx` files
(`RoundOverPanel.tsx:89-90`, `WarCouncilRound.tsx:190`), which this ticket's own scope
boundaries forbade. The scope widening below put UI files back in scope, which makes the
rename cheap (three mechanical lines) if you want it done after all — left undone on your
stated preference; say the word and it goes in.

## AC7 handover

The Lose column in `huntEnumeration.test.ts` asserts **own-pile** valuation, not §8's Lose
column — the pile swap is DLR-69's work, explicitly out of this contract's scope. §8 publishes
`78 / 0` at `k=0`; own-pile gives `0 / 156`, and the whole column's sign inverts once DLR-69
lands and swaps the piles. AC7 names this explicitly in the fixture's own comment so it is
discovered here rather than in review. **DLR-69 replaces the `LOSE_SPLITS_OWN_PILE` array**
with §8's actual Lose column once the pile swap ships.

## Scope widening

DLR-68 was filed as an engine-only ticket. Mid-planning, on 2026-08-12, the developer
supplied an annotated screenshot of the running app with a bracket strip pasted into the top
bar and instructed *"add to the plan."* That made this **also a UI ticket** — `game-ux`
joined the skill list, `.tsx` and CSS files entered the file map, and an interactive mockup
([`mockup.html`](./mockup.html) in this folder) was built and approved at its own gate. It
was approved after **one revision round**: the first version had no per-trick pips, and the
developer asked for them because a flat bracket (0-3 at ×1, 10-13 at ×0.5) loses the
information that card value is still climbing even while the multiplier holds — a single pip
per trick makes that visible without adding a numeral.

## The track's six developer-owned visual values

All placeholders carried over from the mockup, none of them a choice made by this contract:

1. The current-bracket fill colour, `#4a3d22`.
2. The peak-bracket fill colour, `#3c4a33`.
3. The cliff-bracket fill colour, `#3a2724`.
4. The track's `clamp()` width bounds.
5. The track's fixed height and the `min-height` floor that keeps a ×0.5 bar visible.
6. The pip opacity, `rgba(233, 225, 205, 0.32)`.

**No new colour token was introduced.** All three fills are mixed from the existing `--wc-*`
custom properties already declared in `warCouncil.css`; the track's stylesheet header states
this as a standing rule for the sheet.

## The collapse rule

Below the existing `@media (max-width: 44rem), (max-height: 34rem)` breakpoint, the track is
set to `display: none` and the pre-existing compact `Standing` cell (`display: flex`) takes
its place — pure CSS, no `matchMedia`, no resize listener, no effect, nothing to clean up.
It **collapses rather than wraps** because `warCouncilHunt.css`'s own breakpoint comment
already records that `.wc-status`'s children exceed the viewport at this width — the status
band is already over-full there, so adding a wrapped second row would make an existing
problem worse rather than accommodate a new element. Below the floor, the bar carries no
more than it did before this contract. See [`qa-viewports.md`](./qa-viewports.md) for the
named sizes QA must drive the app at to confirm this holds, since jsdom has no layout engine
and cannot verify it.

## Facts from execution that postdate the plan

1. **A fifth stylesheet was carved.** Task 10 (styling the track) first added the track's
   rules verbatim to `warCouncilHunt.css` as the plan's step literally showed, which brought
   it to 419 lines — over the 400-line budget the plan's own "roughly 365" estimate did not
   anticipate. Per that task's own contingency instruction ("carve a fifth stylesheet rather
   than compressing the rules"), the entire Standing-track rule block plus its own
   self-contained `@media (max-width: 44rem), (max-height: 34rem)` block were moved into a
   new `src/app/warCouncil/warCouncilStandingTrack.css` (135 lines); `warCouncilHunt.css`
   reverted to its pre-Task-10 content (307 lines) plus a corrected header. It carries its
   own copy of the breakpoint **value** (44rem / 34rem) — not a duplicated rule, since the
   rules inside it are unique to the track. `warCouncilDeclare.css`'s own header comment was
   also corrected, from claiming four sheets exist to naming all five and where the new one
   sits in the import order (imported last, after `warCouncilDeclare.css`).
2. **`WarCouncilRound.test.tsx`'s end-panel assertion was updated.** It previously asserted
   the panel's displayed Damage equalled the exact, unrounded product of the two numbers
   displayed beside it (`spoilsValue * standingValue`) — a property AC4 (Task 1, Phase 1)
   deliberately ends by wrapping `scoreHunt`'s `damage` field in `roundDamage`. The assertion
   now reads `roundDamage(spoilsValue * standingValue)`, pinning AC4's actual consequence at
   the UI layer instead of the pre-AC4 contract. **The display consequence is real and
   unresolved:** a player can now read `123 × 0.5 = 62` in the end panel, which is arithmetically
   correct but looks wrong on its face — that copy call is DLR-71's, not this contract's.
3. **A wrong-ticket comment remains at `src/warCouncil/playCard.ts:108`**, reading *"DLR-68's
   pile swap reads these piles too."* The pile swap is DLR-69 — the same defect this contract's
   Task 6 already corrected at `src/warCouncil/spoils.ts`. `playCard.ts` is outside this
   contract's file map, so it was deliberately not touched. **Recommend folding the correction
   into DLR-69** when that ticket lands, alongside its actual pile-swap work.

## Verification results

**Phase 1** (Task 1) — `npx vitest run src/warCouncil/__tests__/scoring.test.ts`: all tests
passing, including the new fractional-product case; `npm run typecheck` exits 0.

**Phase 2** (Tasks 2–4) — `npx vitest run src/warCouncil/__tests__/scoring.test.ts`: `Test
Files 1 passed (1)`, `Tests 27 passed (27)`; `npm run typecheck` and `npm run lint` both
exit 0.

**Phase 3** (Tasks 5–6) — `npx vitest run src/warCouncil/__tests__/huntEnumeration.test.ts`:
`Test Files 1 passed (1)`, `Tests 44 passed (44)` — no divergence found between
`src/hunt/config.ts` and `hybrid-design.md` §8. `npx vitest run --project node`: `Test Files
26 passed (26)`, `Tests 500 passed (500)`.

**Phase 4** (Tasks 7–10) — `npx vitest run --project dom` (after this contract's CSS split
in Task 10 but *before* Part A's test-assertion fix below): 8 test files passed, 1 failed
(51 passed / 1 failed) — the single failure was the stale pre-AC4 assertion in
`WarCouncilRound.test.tsx` addressed next.

**Part A** (post-Phase-4 cleanup, this pass) — `WarCouncilRound.test.tsx` asserted the
panel's Damage against the raw, unrounded product, a property AC4 deliberately ends. Fixed
to assert `roundDamage(spoilsValue * standingValue)` instead. Re-run:
`npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` → `Test Files 1
passed (1)`, `Tests 16 passed (16)`. Whole `dom` project: `npx vitest run --project dom` →
`Test Files 9 passed (9)`, `Tests 52 passed (52)` — 0 failed. `npm run typecheck` exits 0.
`npm run lint` exits 0.

**Phase 5** (Tasks 11–14) — delegated to QA; not run by the Implementer. See "Delegated to
QA" below.

## Two pre-existing conditions this contract did not introduce

- **DLR-67's declare-gate CSS overflow at 680×520 / 700×544.** `DLR-67`'s `tasks.md` reads
  `Status: BLOCKED` on exactly this defect, in `warCouncilHunt.css`, a file this contract
  does touch for other reasons but did not introduce this regression to. It will still be
  visible at those sizes when QA drives the app there — see `qa-viewports.md`. It is
  DLR-67's to close, not this ticket's.
- **The repo-wide `npm run format:check` failure.** Fails on pre-existing `.docs/**` files no
  current contract has touched (a known condition per `.claude/workflow/web-project.md` →
  Hard constraints on runners). This contract gates on `npx prettier --check` scoped to the
  files it changed instead, and reports — without repairing — the repo-wide result.

## Convention note for future contributors

Rejection reasons for a throw follow `DeclareRejection`'s shape: an `as const` object map of
short string values plus a derived union type, carried as a `readonly reason` field on a
named `Error` subclass (here, `HuntNotScorableError`) rather than encoded only in the thrown
message. A test can therefore assert *which* guard fired (`error.reason ===
HuntNotScorable.Unfinished`) without matching a message string.

## Delegated to QA

The following are QA's, per this pipeline's split between the Implementer and QA — not run
in this pass:

- Task 11 — the pure-core boundary grep (`Get-ChildItem src\warCouncil, src\hunt -Recurse
  ... | Select-String ...`). Expected: zero hits.
- Task 12 — the AC8 literal-value grep across non-test `src/warCouncil/`, plus the two-hit
  enumeration-fixture check. Expected: zero hits on the first; exactly two hits (both in
  `huntEnumeration.test.ts`) on the second.
- Task 13 — the full file-size sweep across every file this contract created or grew, plus
  the `100vh`/`100vw` regression grep. Expected: every count under 400; zero `100vh`/`100vw`
  hits.
- Task 14 — the cold-cache warm-up, the unfiltered static gates (`npm run typecheck; npm run
  lint; npm test`), the scoped `npx prettier --check` plus the repo-wide `npm run
  format:check` report, and `npm run build`. Expected: all gates exit 0 except the known
  pre-existing `format:check` failure; the DLR-67 baseline of `495/495` plus this contract's
  52 new tests (44 in `huntEnumeration.test.ts`, 8 in `scoring.test.ts`) yields an expected
  **547 passing** — quote the actual summary line rather than this figure.
- The named viewport checks in `qa-viewports.md`, driven live through the `chrome-devtools`
  MCP — jsdom cannot verify layout, so this is QA's functional work on this contract, not a
  pause.
