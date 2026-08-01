# SCRUM-15 — Station card text and overlay marks scale with the geometry constants

Plan: [`plan.md`](./plan.md) (this folder) · Jira: [SCRUM-15](https://amazerbeam.atlassian.net/browse/SCRUM-15)

## What changed

Every rendered size on the board is now a fraction of the tunable it belongs to, instead of a fixed SVG world unit. The fractions live once, in `src/ui/boardScale.ts`, and the card's type sizes and vertical rhythm were retuned for AC2/AC3.

- **Card face** — text, border stroke, and pawn strokes derive from the card's own `rect.width` via `cardMetrics(size)`. A ghost or preview card at any size stays consistent, because nothing here reads a fixed pixel value.
- **Board marks** — terrain strokes, the mountain dash pattern, and overlay radii derive from `config.borderPerimeter` via `terrainStrokes(config)` / `overlayMarks(config)`.
- Every board fraction reproduces the pre-SCRUM-15 world unit *exactly* at the shipped configuration, so the current board's appearance is unchanged — only its behaviour under retuning is. Retuning `cardSize` or `borderPerimeter` in `rules.json` now rescales the render instead of breaking it.

## The cascade note — read this before touching a board stylesheet

This is the single most important thing to carry forward from this change.

Sizes on the SVG board are **presentation attributes** (`fontSize`, `strokeWidth`, `strokeDasharray`, `r`), computed from `boardScale.ts`. A `font-size` / `stroke-width` / `stroke-dasharray` declaration added to `StationCard.css`, `BoardTerrain.css`, or `BoardOverlays.css` will **silently override them** — a CSS author rule beats an SVG presentation attribute in the cascade. The change would type-check, lint clean, and render exactly as before, which is the one failure mode no other gate catches. **Length belongs in `boardScale.ts`; the stylesheets keep paint and typeface only** — `fill`, `stroke` colour, `fill-opacity`, `font-family`, `font-weight`, `text-anchor`, `letter-spacing` (as an `em`), `paint-order`, `stroke-linejoin`, `stroke-linecap`.

The inverse trap exists too, in the opposite direction: an **inline `style`** outranks a CSS author rule. That is why `StationCard.tsx` keeps `style={colour === null ? undefined : { stroke: colour }}` for the seat colour rather than a `stroke=` attribute — a plain attribute would lose to `.station-card__body { stroke: #2b2b2b }` and silently kill the seat-colour marker. That CSS rule is SCRUM-12's defect and is deliberately left untouched by this contract.

## Developer decides or observes

Reproduced verbatim from `tasks.md`'s File map:

- **AC2 — card legibility at `cardSize` 120.** Run the app and look at a generated board: is the station type name readable without zooming, and is the black connection bonus clearly separated from and visually dominant over the grey one (§7.2)? Predicted at 120: type 18 world units, black bonus 31.2, grey 18.6, roughly 9 units of clear air between the two numbers. If wrong, `TYPE_SIZE` / `BONUS_FIRST_SIZE` / `BONUS_LATER_SIZE` in `src/ui/boardScale.ts` are one line each.
- **AC3 — pawn row countable at a glance (§7.1).** Worst case is a 5-pawn card (STARTING, TOWN, TERMINUS, LANDMARK, DEPOT): pawns of radius 6.6 at 20-unit spacing on a 120 card. Confirm by eye that five reads as five.
- **"STARTING" is the widest label and sets the type-size ceiling.** If it overhangs on your font stack: drop `TYPE_SIZE` to 0.135, or add `textLength` + `lengthAdjust="spacingAndGlyphs"` for guaranteed fit at any size. Not planned by default — typography is out of scope per the ticket.
- **Scaling behaviour under retuning (AC1/AC4).** The spec proves proportionality arithmetically; whether a halved or doubled `cardSize` / `borderPerimeter` actually *looks* right is a play-test observation. Editing `public/rules.json` to try it is a developer decision — no task here changes a value in it.
- **Order against SCRUM-5.** `.claude/contract/SCRUM-5-station-placement-workflow/tasks.md` is `PLANNED` and already edits `StationCard.tsx` / `.css`, including a `StationGhost.tsx` that hand-copies StationCard's fraction constants. If SCRUM-15 lands first, that contract needs a refresh pass — the ghost should import `cardMetrics` rather than re-declare fractions, and its `**Files:**` line ranges will have moved.
- **Whether to fold in SCRUM-12.** This contract deliberately does not touch `.station-card__body`'s `stroke: #2b2b2b` declaration, which is where the seat-colour defect lives. Say so before execution if you want both in one change.

## Verification results actually observed

- `npm run typecheck` — exit 0, no errors
- `npm run lint` — exit 0, no errors, no warnings
- `npm run format:check` — exit 0, "All matched files use Prettier code style!"
- `npm run build` — exit 0; `dist/index.html`, `dist/assets/index-*.css` (6.66 kB) and `dist/assets/index-*.js` (236.82 kB) written, no bundler errors
- `npx vitest run src/ui/__tests__/boardScale.test.ts` — `Tests  9 passed (9)`
- `npm test` (unfiltered) — `Test Files 2 failed | 15 passed (17)`, `Tests  2 failed | 253 passed (255)`. **Both failures are outside this contract's scope**: `src/rules/__tests__/scoring.test.ts` and `src/rules/__tests__/setup.test.ts`, both under `src/rules/`, a directory SCRUM-15 does not touch. They belong to SCRUM-16 (`.claude/contract/SCRUM-16-closed-loop-closing-edge/`), which was mid-flight in the same working tree — its `src/rules/pathGeometry.ts` is new and uncommitted. This PR does not claim a green unfiltered suite.
- All three reviewers approved on the first round: Code-Evaluator APPROVED, Defender APPROVED (0 Critical / 0 Warning / 0 Info), QA ALL PASSED for SCRUM-15's scope.

## File sizes

All far under the 400-line budget:

| File | Lines |
|---|---|
| `boardScale.ts` | 108 |
| `boardScale.test.ts` | 98 |
| `StationCard.tsx` | 79 |
| `BoardTerrain.tsx` | 69 |
| `BoardOverlays.tsx` | 87 |
| `Board.tsx` | 45 |

## Note for the reviewer — a concurrent SCRUM-16 change in one shared file

`src/ui/BoardOverlays.tsx` also carries a concurrent SCRUM-16 change: `allCrossings` now wraps both operands in `edgePolyline` from `src/rules/pathGeometry`. That change is not part of SCRUM-15 and was deliberately preserved rather than reverted while working in this file. Whoever reviews this PR should know two contracts touched `BoardOverlays.tsx`.

## Testing posture — a first for this repo

A pure unit test now lives under `src/ui/__tests__/` (`boardScale.test.ts`) — the first non-`src/rules/` spec in the project. It is collected by the existing `vite.config.ts` glob, needs no toolchain change, and is explicitly *not* the component test the brief declined: jsdom and testing-library remain declined, and `environment: 'node'` is unchanged.
