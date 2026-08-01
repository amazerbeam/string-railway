# Station cards render with no seat colour — fix

**Plan:** [`plan.md`](./plan.md) (this folder)
**Ticket:** [SCRUM-12](https://amazerbeam.atlassian.net/browse/SCRUM-12)

## Summary

The seat colour on a station card's outline moves from an SVG presentation
attribute (`stroke={colour ?? undefined}`) to a conditional inline `style`
(`style={colour === null ? undefined : { stroke: colour }}`). Presentation
attributes sit at the bottom of the CSS cascade and lose to *any* author rule,
including `.station-card__body { stroke: #2b2b2b; }` — so every card, owned or
not, was rendering the stylesheet's near-black fallback regardless of seat.
Inline `style` outranks author rules, so an owned card now shows its own seat
colour while an unowned card still falls through to the stylesheet.

`.station-card__body { stroke: #2b2b2b; }` is retained **deliberately** as the
genuine no-owner fallback (deleting it would leave unowned cards with no
outline at all — the SVG initial value is `stroke: none`), and now carries a
comment recording that it only governs the unowned case, so a future reader
does not mistake it for the live outline colour.

The `colour` prop's doc comment on `StationCardProps` is also corrected. It
previously said the hex was supplied "for a starting station" — factually
wrong, since `src/rules/turn.ts:186` sets `markerOwner: card.flags.needsMarker
? colour : null`, meaning any drawn card that needs a marker also carries a
colour. The comment now says the prop applies to any card with a
`markerOwner`.

## Design: why an inline style, and what was rejected

Three shapes were considered for carrying the colour past the stylesheet:

1. **A CSS custom property** (e.g. `--seat-stroke`, consumed by
   `stroke: var(--seat-stroke, #2b2b2b)`) — rejected because setting it from
   React requires widening the inline `style` object with an index-signature
   cast (`as CSSProperties`), which is the kind of cast this codebase avoids
   without a stated reason.
2. **An attribute-guarded fallback** (`.station-card__body:not([stroke])`) —
   rejected because it re-breaks silently the moment a plain `stroke:`
   declaration returns to the class for any other reason (e.g. a future
   contributor "simplifying" the rule) — the selector would then simply never
   match, with no compiler or lint signal.
3. **Dropping `stroke` from the CSS entirely and always supplying a colour
   from a constant** (i.e. no cascade fallback at all, every card gets an
   explicit colour, owned or not) — this is the strongest alternative and
   answers the "decoy declaration" objection below directly, since there
   would be no CSS declaration left to misread. It was not taken for this
   fix because it requires inventing what an "unowned" card's colour
   constant should be, which is a design decision, not a mechanical cascade
   fix — flagged below for the developer to reconsider.

The shipped fix (conditional inline `style`, CSS fallback retained with a
comment) was chosen as the smallest change that repairs the cascade order
without introducing a new constant or a cast.

## Developer decides or observes

Carried over verbatim from `tasks.md`'s "Developer decides or observes" list:

- **The decoy-declaration judgement call.** After this fix, `stroke:
  #2b2b2b` in `StationCard.css` governs only unowned cards yet still reads
  like the outline colour. The in-scope comment is the whole mitigation.
  This is the strongest argument for the rejected constant-based variant
  (option 3 above) — say the word and it is a small rewrite of the plan.
- **The `COLOUR_SEATS` palette** (`src/constants/setup.ts:16-22`), which this
  fix exists to make judgeable. Check the five hexes for mutual
  distinguishability, against the card fill `#fdfaf3`, against the terrain
  strokes (border `#2b2b2b`, river `#3f9fd0`, mountain `#3f7d4a`), and for
  WCAG AA. Green `#3aa757` beside mountain green `#3f7d4a` is the first pair
  to look at. No agent changes a hex.
- **Whether the outline reads "at a glance"** (SCRUM-4 AC12) — `npm run dev`,
  start a 2-player game, compare each of the four starting cards' outlines
  against the legend swatch for the same colour name. No agent can perform
  this step and no test in this repo covers it.
- **That `#2b2b2b` is also the border terrain stroke.** Pre-existing,
  invisible until SCRUM-5 puts unowned drawn cards on the board — but an
  unowned card outlined in border-black may then read as terrain rather than
  as a card.
- **Whether the card `aria-label` should name the owning colour.** Colour
  becomes the only channel carrying ownership (WCAG 1.4.1). Deliberately
  deferred because SCRUM-5 Task 7 restructures that same label into a shared
  `describeStationCard()`.
- **Whether to approve `jsdom` + `@testing-library/react` and a Vitest
  environment split.** Every static gate and all existing tests pass on the
  *broken* code — that is what let this ship. Two new devDependencies are
  your call, not the executor's.
- **Whether to consolidate the three `displayFor` copies** —
  `Board.tsx:43` (returns `null`), `SeatLegend.tsx:73` and
  `DebugPanel.tsx:143` (both `'#888888'`) — with their divergent null
  behaviour.
- **Ordering against SCRUM-5 and SCRUM-15**, both editing these same two
  files. SCRUM-15 landed concurrently while this contract was executing (see
  below) — order affected the diff, not correctness, and the reconcile was
  clean.

## Verification results

### Phase 1 (Task 1 — `StationCard.tsx`, Task 2 — `StationCard.css`)

- `npm run typecheck` — exit 0, no TypeScript errors.
- `npm run lint` — exit 0, no ESLint errors or warnings.
- `npm run format:check` — "All matched files use Prettier code style!"

### Phase 2 (Tasks 3-5 — final verification)

- **Task 3, Step 1** — `Select-String -Path src\ui\StationCard.tsx -Pattern
  "stroke="` — zero hits (no bare presentation attribute left alongside the
  inline style).
- **Task 3, Step 2** — `Select-String -Path src\ui\StationCard.tsx -Pattern
  "style=\{colour === null \? undefined : \{ stroke: colour \}\}"` — exactly
  one hit, at `src\ui\StationCard.tsx:35`. (Originally recorded at line 31;
  now line 35 because SCRUM-15's concurrent refactor inserted a JSDoc block
  above the component — see the reconcile note below.)
- **Task 3, Step 3** — `Select-String -Path src\ui\StationCard.css -Pattern
  "stroke: #2b2b2b"` — exactly one hit, inside `.station-card__body`. The
  fallback survived intact.
- **Task 3, Step 4** — file-size budget on `src/ui/StationCard.tsx`:
  `(Get-Content src\ui\StationCard.tsx | Measure-Object -Line).Lines` = `79`;
  `(Get-Content src\ui\StationCard.tsx).Count` = `84`. (Originally recorded as
  61 / 67 before SCRUM-15 landed; both current numbers are still well under
  the 400-line budget — the increase is SCRUM-15's JSDoc block and moved size
  attributes, not anything SCRUM-12 added.)
- **Task 4** — `src/rules/` boundary grep (`from 'react'|\bwindow\.|\bdocument\.|localStorage`
  across `src\rules\*.ts,src\rules\**\*.ts`) — zero hits. This change touches
  no pure-rules file.
- **Task 5** — `npm run typecheck` PASS, `npm run lint` PASS (0
  errors/warnings, incl. scoped `npx eslint src/ui/StationCard.tsx`),
  `npm run format:check` PASS. `npm test` **FAIL**: `Test Files  2 failed |
  15 passed (17)`, `Tests  2 failed | 253 passed (255)` — see the environment
  caveat below; neither failure is reachable from this change. `npm run
  build` PASS — exit 0, `dist/` written, no bundler errors.

### No automated test covers this fix

**No automated test exists for this cascade fix, and that is the plan's
documented, developer-approved scope — not an omission of this pass.** The
Vitest suite runs with `environment: 'node'` and a `*.test.ts`-only include
(`vite.config.ts:11-14`), so it never renders a component or reads computed
style — a cascade bug like this one (an SVG presentation attribute losing to
an author rule) is structurally invisible to it. Every static gate
(typecheck, lint, format, and — before this fix — even `npm test`) passed on
the *broken* code, which is exactly what let the bug ship unnoticed. The
guard against a regression is the Task 3 greps above plus the developer's own
eyes at the manual-verification step below — there is no substitute currently
in this repo.

## Environment caveat — unrelated `npm test` failures at time of verification

At the time of this contract's verification, the unfiltered `npm test` was
**red with 2 failures**, reproduced across three separate runs:

- `src/rules/__tests__/scoring.test.ts :: charges −1 for crossing the
  mountain, the river and the border alike (M10)` — expected a crossing-count
  array of length 3, got length 4.
- `src/rules/__tests__/setup.test.ts :: emits a board that passes
  validateSetup for every player count across 20 seeds (AC9)` — threw
  `SetupGenerationError: RIVER_TOO_NEAR_MOUNTAIN`.

Both were traced by QA to an **unrelated, concurrently in-flight contract's
uncommitted rewrite** of `regularPolygon`'s vertex-0 placement in
`src/rules/setupSamplers.ts` (self-documented in that file as SCRUM-14).
Neither failure is reachable from a `stroke`/`style` change on an SVG
`<rect>` in `src/ui/StationCard.tsx` — this contract touches no file under
`src/rules/`. `npm run typecheck`, `npm run lint`, `npm run format:check`,
and `npm run build` were all clean throughout.

**Action for the developer:** re-confirm `npm test` is green once SCRUM-14's
work lands or is reverted, rather than assuming SCRUM-12 left the suite red —
it did not touch the file responsible.

## Concurrent-landing note — SCRUM-15's `cardMetrics` refactor

While this contract was executing, a concurrent session landed SCRUM-15's
`cardMetrics` refactor into the same two files this contract touches
(`src/ui/StationCard.tsx`, `src/ui/StationCard.css`). This was anticipated in
`plan.md`'s "Developer decides or observes" list ("Ordering against SCRUM-5
and SCRUM-15 … whichever lands second needs a trivial reconcile; order
affects the diff, not correctness") and reconciled cleanly:

- SCRUM-15 moved **size** attributes onto SVG presentation attributes
  (`strokeWidth={metrics.bodyStroke}`, `fontSize={...}` for the three text
  elements) and removed the corresponding fixed `stroke-width` / `font-size`
  declarations from `StationCard.css`.
- SCRUM-12 owns the **stroke colour** via the conditional inline `style` on
  the same `<rect>`.

Different CSS properties on the same element, set through two different
mechanisms for two different reasons — no collision. The line numbers
recorded in `tasks.md` for Task 3 Steps 2 and 4 were re-run against the
current tree and updated accordingly (see that file for the detail); the
underlying fix itself required no further change.

## For future contributors

In `StationCard`, an owned card's outline colour arrives as an inline
`style`, not an SVG presentation attribute — a presentation attribute sits at
the bottom of the cascade and loses to any author rule unconditionally, which
is exactly the bug this fix corrects. Do not move it back.
