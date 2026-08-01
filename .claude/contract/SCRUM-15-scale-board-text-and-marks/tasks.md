# Tasks: Station card text and overlay marks scale with the geometry constants

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01

**Goal:** Make every rendered dimension on the board proportional to the tunable it belongs to — card text, border and pawn strokes from the card's own `rect.width`; terrain strokes, dash patterns and overlay radii from `config.borderPerimeter` — with the fractions in one pure, unit-tested module, and the card's type sizes retuned so the shipped `cardSize` of 120 reads clearly.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/ui/boardScale.ts` — every render-size fraction and the three derivations (`cardMetrics`, `terrainStrokes`, `overlayMarks`)
- `src/ui/__tests__/boardScale.test.ts` — proportionality plus exact reproduction of the shipped appearance at `borderPerimeter` 4000

**Modified:**
- `src/ui/StationCard.tsx:1-66` — sizes as computed SVG attributes from `cardMetrics(rect.width)`; doc comment corrected (AC6)
- `src/ui/StationCard.css:1-36` — every `font-size` and `stroke-width` declaration deleted
- `src/ui/BoardTerrain.tsx:1-52` — new `config` prop; per-kind `strokeWidth` and the mountain `strokeDasharray` as computed attributes
- `src/ui/BoardTerrain.css:1-18` — the three per-kind stroke widths and the mountain dash deleted
- `src/ui/BoardOverlays.tsx:1-81` — new `config` prop; `VERTEX_RADIUS` / `CROSSING_RADIUS` module constants replaced by `overlayMarks(config)`; rect and crossing stroke widths and the rect dash as computed attributes
- `src/ui/BoardOverlays.css:1-17` — `stroke-width` and `stroke-dasharray` declarations deleted
- `src/ui/Board.tsx:28,36` — pass the `config` it already holds to `BoardTerrain` and `BoardOverlays`

**Deleted:** (none)

**Developer decides or observes:**
- **AC2 — card legibility at `cardSize` 120.** Run the app and look at a generated board: is the station type name readable without zooming, and is the black connection bonus clearly separated from and visually dominant over the grey one (§7.2)? Predicted at 120: type 18 world units, black bonus 31.2, grey 18.6, roughly 9 units of clear air between the two numbers. If wrong, `TYPE_SIZE` / `BONUS_FIRST_SIZE` / `BONUS_LATER_SIZE` in `src/ui/boardScale.ts` are one line each.
- **AC3 — pawn row countable at a glance (§7.1).** Worst case is a 5-pawn card (STARTING, TOWN, TERMINUS, LANDMARK, DEPOT): pawns of radius 6.6 at 20-unit spacing on a 120 card. Confirm by eye that five reads as five.
- **"STARTING" is the widest label and sets the type-size ceiling.** If it overhangs on your font stack: drop `TYPE_SIZE` to 0.135, or add `textLength` + `lengthAdjust="spacingAndGlyphs"` for guaranteed fit at any size. Not planned by default — typography is out of scope per the ticket.
- **Scaling behaviour under retuning (AC1/AC4).** The spec proves proportionality arithmetically; whether a halved or doubled `cardSize` / `borderPerimeter` actually *looks* right is a play-test observation. Editing `public/rules.json` to try it is a developer decision — no task here changes a value in it.
- **Order against SCRUM-5.** `.claude/contract/SCRUM-5-station-placement-workflow/tasks.md` is `PLANNED` and already edits `StationCard.tsx` / `.css`, including a `StationGhost.tsx` that hand-copies StationCard's fraction constants. If SCRUM-15 lands first, that contract needs a refresh pass — the ghost should import `cardMetrics` rather than re-declare fractions, and its `**Files:**` line ranges will have moved.
- **Whether to fold in SCRUM-12.** This contract deliberately does not touch `.station-card__body`'s `stroke: #2b2b2b` declaration, which is where the seat-colour defect lives. Say so before execution if you want both in one change.

---

## Phase 1 — The scale module and its spec

Creates `src/ui/boardScale.ts` and its Vitest spec. Nothing consumes the module yet, so the phase is a clean stopping point by construction: the app renders exactly as it does today, the new module type-checks, and its spec proves the fractions before a single component depends on them. Getting the numbers pinned here is what makes the three consumer edits mechanical.

### Task 1: Create `src/ui/boardScale.ts` and its spec ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/boardScale.ts`
- Test: `src/ui/__tests__/boardScale.test.ts`

- [x] **Step 1: Write `src/ui/boardScale.ts`**

Create the file with exactly this content. The fractions are the ones tabulated in `plan.md` Part 2 → Data shapes; every board fraction reproduces the pre-SCRUM-15 world unit exactly at the shipped `borderPerimeter` of 4000, and the card's three type sizes and three lower `*_Y` values are retuned for AC2/AC3.

```ts
import type { RulesConfig } from '../rules/config'

/**
 * Render sizes for the SVG board, derived from the M2 geometry tunables (§3)
 * rather than pinned to world units.
 *
 * The board's viewBox is boardBounds (src/rules/setup.ts), which grows with
 * borderPerimeter, and preserveAspectRatio fits that box to the element — so a
 * mark given a fixed world size renders thinner as the board grows and fatter
 * as it shrinks, and card text pinned to a pixel size overflows a smaller card.
 * Every size here is therefore a fraction: card sizes of the card's own
 * footprint, board marks of borderPerimeter. Retuning rules.json rescales the
 * render instead of breaking it (SCRUM-15).
 *
 * The fractions themselves are presentation defaults, NOT tunables — the same
 * category as src/constants/setup.ts's MOUNTAIN_OFFSET_FRACTION. They never
 * belong in rules.json, which owns difficulty levers, not typography.
 */

/** Fractions of a station card's own width. §7.2 bonus pair, §7.1 pawn row. */
const BODY_STROKE = 0.025
const TYPE_Y = 0.24
const TYPE_SIZE = 0.15
const BONUS_FIRST_Y = 0.56
const BONUS_FIRST_SIZE = 0.26
const BONUS_LATER_Y = 0.75
const BONUS_LATER_SIZE = 0.155
const PAWN_Y = 0.9
const PAWN_RADIUS = 0.055
const PAWN_STROKE = 0.0125

/** Fractions of borderPerimeter. Each reproduces the pre-SCRUM-15 world unit
 *  exactly at the shipped 4000, so today's board is unchanged — only its
 *  behaviour under retuning is. */
const BORDER_STROKE = 0.002
const MOUNTAIN_STROKE = 0.0015
const RIVER_STROKE = 0.00175
const MOUNTAIN_DASH_ON = 0.0045
const MOUNTAIN_DASH_OFF = 0.0025
const VERTEX_RADIUS = 0.001
const CROSSING_RADIUS = 0.00175
const CROSSING_STROKE = 0.00075
const RECT_STROKE = 0.0005
const RECT_DASH_ON = 0.0015
const RECT_DASH_OFF = 0.001

/** World-unit render sizes for one station card. Every `*Y` is an offset from
 *  the card's own rect.y, not an absolute coordinate. */
export interface CardMetrics {
  readonly bodyStroke: number
  readonly typeY: number
  readonly typeSize: number
  readonly bonusFirstY: number
  readonly bonusFirstSize: number
  readonly bonusLaterY: number
  readonly bonusLaterSize: number
  readonly pawnY: number
  readonly pawnRadius: number
  readonly pawnStroke: number
}

/** World-unit stroke sizes for the three terrain paths. */
export interface TerrainStrokes {
  readonly border: number
  readonly mountain: number
  readonly river: number
  /** Ready-to-use strokeDasharray value, e.g. "18 10". */
  readonly mountainDash: string
}

/** World-unit sizes for the debug overlay layer. */
export interface OverlayMarks {
  readonly vertexRadius: number
  readonly crossingRadius: number
  readonly crossingStroke: number
  readonly rectStroke: number
  /** Ready-to-use strokeDasharray value, e.g. "6 4". */
  readonly rectDash: string
}

/** Card face sizes from the card's own footprint (AC5 — "the element's own
 *  dimensions"), so a ghost or preview card at any size stays consistent. */
export function cardMetrics(size: number): CardMetrics {
  return {
    bodyStroke: size * BODY_STROKE,
    typeY: size * TYPE_Y,
    typeSize: size * TYPE_SIZE,
    bonusFirstY: size * BONUS_FIRST_Y,
    bonusFirstSize: size * BONUS_FIRST_SIZE,
    bonusLaterY: size * BONUS_LATER_Y,
    bonusLaterSize: size * BONUS_LATER_SIZE,
    pawnY: size * PAWN_Y,
    pawnRadius: size * PAWN_RADIUS,
    pawnStroke: size * PAWN_STROKE,
  }
}

export function terrainStrokes(config: RulesConfig): TerrainStrokes {
  const span = config.borderPerimeter
  return {
    border: span * BORDER_STROKE,
    mountain: span * MOUNTAIN_STROKE,
    river: span * RIVER_STROKE,
    mountainDash: `${span * MOUNTAIN_DASH_ON} ${span * MOUNTAIN_DASH_OFF}`,
  }
}

export function overlayMarks(config: RulesConfig): OverlayMarks {
  const span = config.borderPerimeter
  return {
    vertexRadius: span * VERTEX_RADIUS,
    crossingRadius: span * CROSSING_RADIUS,
    crossingStroke: span * CROSSING_STROKE,
    rectStroke: span * RECT_STROKE,
    rectDash: `${span * RECT_DASH_ON} ${span * RECT_DASH_OFF}`,
  }
}
```

- [x] **Step 2: Format, then type-check the new module before writing its spec**

Run: `npm run format; npm run typecheck`
Expected: Prettier lists the files it rewrote (`printWidth` is 100 — let it settle line breaks rather than hand-predicting them); `tsc -b` exits 0 with no errors reported.

- [x] **Step 3: Write `src/ui/__tests__/boardScale.test.ts`**

Create the file with exactly this content. `SHIPPED` is built from `src/rules/__tests__/fixtures.ts`-style literals rather than by reading `public/rules.json`, so the spec pins the *relationship* and does not break the moment the developer retunes a value. The exact-equality assertions on the board marks are safe: every board fraction produces an integer or a clean half at both 4000 and 2000 (verified), while the card assertions use `toBeCloseTo` because fractions like `0.155 * 120` carry float noise.

```ts
import { describe, expect, it } from 'vitest'
import { cardMetrics, overlayMarks, terrainStrokes } from '../boardScale'
import type { RulesConfig } from '../../rules/config'

/** Only borderPerimeter is read by the two board derivations; the rest of the
 *  shape is present because RulesConfig requires it. */
function configWith(borderPerimeter: number): RulesConfig {
  return {
    shortStringLength: 350,
    longStringLength: 700,
    arcLengthTolerance: 0.02,
    tangencyTolerance: 0.5,
    cardSize: 120,
    borderPerimeter,
    mountainLength: 1400,
    riverLength: 700,
    deckComposition: {
      HAMLET: 6,
      VILLAGE: 6,
      TOWN: 5,
      SCENIC: 4,
      RURAL: 4,
      TERMINUS: 3,
      RAILYARD: 3,
      LANDMARK: 2,
      DEPOT: 2,
    },
  }
}

/** The borderPerimeter the prototype ships with. The board fractions are chosen
 *  so this reproduces the pre-SCRUM-15 appearance exactly. */
const SHIPPED_PERIMETER = 4000

describe('cardMetrics', () => {
  it('scales every dimension linearly with the card size (AC1)', () => {
    const small = cardMetrics(60)
    const large = cardMetrics(120)

    for (const key of Object.keys(large) as (keyof typeof large)[]) {
      expect(large[key]).toBeCloseTo(small[key] * 2, 10)
    }
  })

  it('keeps the black bonus dominant over and clear of the grey one (AC2, §7.2)', () => {
    const metrics = cardMetrics(120)

    expect(metrics.bonusFirstSize).toBeGreaterThan(metrics.bonusLaterSize * 1.5)
    // Cap height is ~0.72em, so the grey number's top sits this far above its
    // baseline. The gap below the black number's baseline must stay positive.
    const greyTop = metrics.bonusLaterY - metrics.bonusLaterSize * 0.72
    expect(greyTop - metrics.bonusFirstY).toBeGreaterThan(0)
  })

  it('keeps the whole face inside the card at any size (AC1)', () => {
    for (const size of [40, 120, 400]) {
      const metrics = cardMetrics(size)
      expect(metrics.typeY - metrics.typeSize * 0.72).toBeGreaterThan(0)
      expect(metrics.pawnY + metrics.pawnRadius + metrics.pawnStroke).toBeLessThan(size)
      // §7.1's pawn row must clear the grey bonus above it.
      expect(metrics.pawnY - metrics.pawnRadius).toBeGreaterThan(metrics.bonusLaterY)
    }
  })

  it('is a pure function of its argument', () => {
    expect(cardMetrics(120)).toEqual(cardMetrics(120))
  })
})

describe('terrainStrokes', () => {
  it('reproduces the shipped world units exactly at the shipped perimeter', () => {
    const strokes = terrainStrokes(configWith(SHIPPED_PERIMETER))

    expect(strokes.border).toBe(8)
    expect(strokes.mountain).toBe(6)
    expect(strokes.river).toBe(7)
    expect(strokes.mountainDash).toBe('18 10')
  })

  it('halves every stroke when the perimeter halves (AC4)', () => {
    const strokes = terrainStrokes(configWith(SHIPPED_PERIMETER / 2))

    expect(strokes.border).toBe(4)
    expect(strokes.mountain).toBe(3)
    expect(strokes.river).toBe(3.5)
    expect(strokes.mountainDash).toBe('9 5')
  })
})

describe('overlayMarks', () => {
  it('reproduces the shipped world units exactly at the shipped perimeter', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER))

    expect(marks.vertexRadius).toBe(4)
    expect(marks.crossingRadius).toBe(7)
    expect(marks.crossingStroke).toBe(3)
    expect(marks.rectStroke).toBe(2)
    expect(marks.rectDash).toBe('6 4')
  })

  it('halves every mark when the perimeter halves (AC4)', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER / 2))

    expect(marks.vertexRadius).toBe(2)
    expect(marks.crossingRadius).toBe(3.5)
    expect(marks.crossingStroke).toBe(1.5)
    expect(marks.rectStroke).toBe(1)
    expect(marks.rectDash).toBe('3 2')
  })

  it('keeps a crossing ring visibly larger than a vertex dot', () => {
    const marks = overlayMarks(configWith(SHIPPED_PERIMETER))

    expect(marks.crossingRadius).toBeGreaterThan(marks.vertexRadius)
  })
})
```

- [x] **Step 4: Run the new spec**

Run: `npm run format; npx vitest run src/ui/__tests__/boardScale.test.ts`
Expected: exits 0; Vitest reports `Tests  9 passed`. If it instead reports "Failed to load" or "Transform failed", that is a TypeScript error in the spec, not a failing assertion — fix the type error and re-run.

---

## Phase 2 — The station card face

Rewrites `StationCard.tsx` to take its sizes from `cardMetrics` and strips the matching length declarations from `StationCard.css`. The two files change in one task on purpose: a CSS declaration beats an SVG presentation attribute in the cascade, so a surviving `font-size: 16px` would silently override the computed value and the change would appear to do nothing while type-checking and linting clean. The phase ends with the card fully converted and the board still rendering — the terrain and overlay layers are untouched and keep their existing fixed sizes until Phase 3.

### Task 2: Drive `StationCard` sizes from `cardMetrics` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/StationCard.tsx:1-66`
- Modify: `src/ui/StationCard.css:1-36`

- [x] **Step 1: Replace `src/ui/StationCard.tsx` with the metrics-driven version**

The four module constants (`TITLE_Y`, `BONUS_Y`, `PAWN_Y`, `PAWN_RADIUS`) and their doc comment are deleted — they now live in `boardScale.ts`. The corrected doc comment moves onto the component and states what the code actually does (AC6). `pawns()` is unchanged. Full new file:

```tsx
import { cardMetrics } from './boardScale'
import './StationCard.css'
import type { PlacedStation } from '../rules/types'

interface StationCardProps {
  station: PlacedStation
  /** The owning colour's display hex for a starting station, else null. */
  colour: string | null
}

/**
 * Every position AND every size is a fraction of the card's own footprint, so
 * the whole face scales with cardSize (M2) rather than assuming a pixel
 * footprint. The fractions live in boardScale.ts; the sizes are set as SVG
 * presentation attributes rather than in StationCard.css because a CSS length
 * declaration would override the attribute and pin the face to world units
 * again (SCRUM-15). The stylesheet keeps paint and typeface only.
 */
function StationCard({ station, colour }: StationCardProps) {
  const { rect, card } = station
  const size = rect.width
  const metrics = cardMetrics(size)
  const centreX = rect.x + size / 2
  const label = `${card.type} station, connection bonus ${card.bonusFirst} first or ${card.bonusLater} later, player limit ${card.playerLimit}`

  return (
    <g className="station-card" role="img" aria-label={label}>
      <rect
        className="station-card__body"
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        stroke={colour ?? undefined}
        strokeWidth={metrics.bodyStroke}
      />
      <text
        className="station-card__type"
        x={centreX}
        y={rect.y + metrics.typeY}
        fontSize={metrics.typeSize}
      >
        {card.type}
      </text>
      <text
        className="station-card__bonus-first"
        x={centreX}
        y={rect.y + metrics.bonusFirstY}
        fontSize={metrics.bonusFirstSize}
      >
        {card.bonusFirst}
      </text>
      <text
        className="station-card__bonus-later"
        x={centreX}
        y={rect.y + metrics.bonusLaterY}
        fontSize={metrics.bonusLaterSize}
      >
        {card.bonusLater}
      </text>
      {pawns(station).map((cx, index) => (
        <circle
          key={index}
          className="station-card__pawn"
          cx={cx}
          cy={rect.y + metrics.pawnY}
          r={metrics.pawnRadius}
          strokeWidth={metrics.pawnStroke}
        />
      ))}
    </g>
  )
}

/** §7.1 — one pawn per allowed distinct player, evenly spaced along the bottom. */
function pawns(station: PlacedStation): readonly number[] {
  const { rect, card } = station
  const count = card.playerLimit
  const spacing = rect.width / (count + 1)
  return Array.from({ length: count }, (_unused, index) => rect.x + spacing * (index + 1))
}

export default StationCard
```

- [x] **Step 2: Delete every length declaration from `src/ui/StationCard.css`**

Removes `font-size: 16px` / `26px` / `20px` and `stroke-width: 3` / `1.5` — all five are now attributes. `stroke: #2b2b2b` on `.station-card__body` is left in place deliberately: that line is SCRUM-12's defect and is out of scope here. Full new file:

```css
.station-card__body {
  fill: #fdfaf3;
  stroke: #2b2b2b;
}

.station-card__type,
.station-card__bonus-first,
.station-card__bonus-later {
  text-anchor: middle;
  font-family: system-ui, sans-serif;
  font-weight: 600;
  paint-order: stroke fill;
}

.station-card__type {
  fill: #2b2b2b;
  letter-spacing: 0.04em;
}

.station-card__bonus-first {
  fill: #111111;
}

.station-card__bonus-later {
  fill: #8a8a8a;
}

.station-card__pawn {
  fill: #ffffff;
  stroke: #4a4a4a;
}
```

- [x] **Step 3: Confirm no length declaration survives in the card stylesheet**

Run: `Select-String -Path src\ui\StationCard.css -Pattern "font-size|stroke-width|stroke-dasharray"`
Expected: zero hits. Any hit means the cascade will override the computed attribute and the card will still be pinned to world units.

- [x] **Step 4: Format, type-check, and lint**

Run: `npm run format; npm run typecheck; npm run lint`
Expected: `tsc -b` and `eslint .` both exit 0, no errors reported.

---

## Phase 3 — Terrain strokes and overlay marks

Converts the two board-level layers and wires `config` down to them from `Board.tsx`, which already receives it. Each task changes its component, its stylesheet, and its one call site together, so the phase type-checks after each task rather than only at the end — a required prop added without its call site would leave the tree broken mid-phase.

### Task 3: Drive `BoardTerrain` stroke widths from `terrainStrokes` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/BoardTerrain.tsx:1-52`
- Modify: `src/ui/BoardTerrain.css:1-18`
- Modify: `src/ui/Board.tsx:28`

- [x] **Step 1: Replace `src/ui/BoardTerrain.tsx`**

`TERRAIN_ORDER` narrows from `readonly PathKind[]` to a three-member `TerrainKind` union, which lets `strokeFor` be an exhaustive switch with no `default` branch and removes the existing `as keyof typeof TERRAIN_DISPLAY` cast on line 34. Full new file:

```tsx
import { PATH_KIND } from '../constants/game'
import { TERRAIN_DISPLAY } from '../constants/setup'
import { terrainStrokes } from './boardScale'
import './BoardTerrain.css'
import type { TerrainStrokes } from './boardScale'
import type { RulesConfig } from '../rules/config'
import type { PlacedPath, Polyline } from '../rules/types'

/** The three terrain kinds, back to front. Railway strings are SCRUM-6's. */
type TerrainKind =
  | typeof PATH_KIND.BORDER
  | typeof PATH_KIND.MOUNTAIN
  | typeof PATH_KIND.RIVER

const TERRAIN_ORDER: readonly TerrainKind[] = [
  PATH_KIND.BORDER,
  PATH_KIND.MOUNTAIN,
  PATH_KIND.RIVER,
]

const CLOSED: ReadonlySet<TerrainKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])

const LABEL: Readonly<Record<TerrainKind, string>> = {
  [PATH_KIND.BORDER]: 'Border string',
  [PATH_KIND.MOUNTAIN]: 'Mountain string',
  [PATH_KIND.RIVER]: 'River string',
}

interface BoardTerrainProps {
  paths: readonly PlacedPath[]
  config: RulesConfig
}

function BoardTerrain({ paths, config }: BoardTerrainProps) {
  const strokes = terrainStrokes(config)

  return (
    <g className="board-terrain">
      {TERRAIN_ORDER.map((kind) => {
        const path = paths.find((candidate) => candidate.kind === kind)
        if (!path || path.path.length < 2) {
          return null
        }
        return (
          <path
            key={kind}
            className={`board-terrain__path board-terrain__path--${kind.toLowerCase()}`}
            d={toPathData(path.path, CLOSED.has(kind))}
            stroke={TERRAIN_DISPLAY[kind]}
            strokeWidth={strokeFor(kind, strokes)}
            strokeDasharray={kind === PATH_KIND.MOUNTAIN ? strokes.mountainDash : undefined}
            aria-label={LABEL[kind]}
          />
        )
      })}
    </g>
  )
}

/** Stroke width per terrain kind. Exhaustive over TerrainKind, so adding a
 *  fourth terrain is a type error here rather than a silently hairline path. */
function strokeFor(kind: TerrainKind, strokes: TerrainStrokes): number {
  switch (kind) {
    case PATH_KIND.BORDER:
      return strokes.border
    case PATH_KIND.MOUNTAIN:
      return strokes.mountain
    case PATH_KIND.RIVER:
      return strokes.river
  }
}

/** Polyline to SVG path data. Loops are stored corners-only, so `Z` closes them
 *  rather than repeating the first point. */
function toPathData(points: Polyline, close: boolean): string {
  const body = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  return close ? `${body} Z` : body
}

export default BoardTerrain
```

- [x] **Step 2: Strip the length declarations from `src/ui/BoardTerrain.css`**

The three per-kind rules become empty once their `stroke-width` and `stroke-dasharray` go, so they are deleted. The modifier classes stay on the elements as devtools handles — they cost nothing and nothing else references them. Full new file:

```css
.board-terrain__path {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}
```

- [x] **Step 3: Pass `config` to `BoardTerrain` in `src/ui/Board.tsx`**

Replace line 28:

```tsx
      <BoardTerrain paths={state.paths} />
```

with:

```tsx
      <BoardTerrain paths={state.paths} config={config} />
```

- [x] **Step 4: Format, type-check, and lint**

Run: `npm run format; npm run typecheck; npm run lint`
Expected: `tsc -b` and `eslint .` both exit 0, no errors reported. Prettier owns the line breaking of the new `TerrainKind` union and of `TERRAIN_ORDER` — both sit near the 100-column boundary, so let the formatter settle them rather than matching the block above character for character.

### Task 4: Drive `BoardOverlays` marks from `overlayMarks` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/BoardOverlays.tsx:1-81`
- Modify: `src/ui/BoardOverlays.css:1-17`
- Modify: `src/ui/Board.tsx:36`

- [x] **Step 1: Replace the module constants and props in `src/ui/BoardOverlays.tsx`**

Delete lines 16-17:

```tsx
const VERTEX_RADIUS = 4
const CROSSING_RADIUS = 7
```

Add the import alongside the existing ones at the top of the file:

```tsx
import { overlayMarks } from './boardScale'
```

and add the config type import with the other `import type` lines:

```tsx
import type { RulesConfig } from '../rules/config'
```

Widen the props interface:

```tsx
interface BoardOverlaysProps {
  state: GameState
  flags: OverlayFlags
  config: RulesConfig
}
```

Replace the component body's signature and opening line, and the three mark sites, so the function reads:

```tsx
function BoardOverlays({ state, flags, config }: BoardOverlaysProps) {
  const marks = overlayMarks(config)

  return (
    <g className="board-overlays" aria-hidden="true">
      {flags.rects &&
        state.stations.map((station) => (
          <rect
            key={String(station.card.id)}
            className="board-overlays__rect"
            x={station.rect.x}
            y={station.rect.y}
            width={station.rect.width}
            height={station.rect.height}
            strokeWidth={marks.rectStroke}
            strokeDasharray={marks.rectDash}
          />
        ))}

      {flags.vertices &&
        state.paths.flatMap((path) =>
          path.path.map((point, index) => (
            <circle
              key={`${String(path.id)}-${index}`}
              className="board-overlays__vertex"
              cx={point.x}
              cy={point.y}
              r={marks.vertexRadius}
            />
          )),
        )}

      {flags.crossings &&
        allCrossings(state).map((point, index) => (
          <g key={index} className="board-overlays__crossing">
            <circle
              cx={point.x}
              cy={point.y}
              r={marks.crossingRadius}
              strokeWidth={marks.crossingStroke}
            />
          </g>
        ))}
    </g>
  )
}
```

Leave the `export type { OverlayFlags }` re-export and its comment, and `allCrossings` and its comment, exactly as they are.

- [x] **Step 2: Strip the length declarations from `src/ui/BoardOverlays.css`**

Removes `stroke-width: 2`, `stroke-dasharray: 6 4`, and `stroke-width: 3`. Full new file:

```css
.board-overlays__rect {
  fill: none;
  stroke: #d81b8f;
}

.board-overlays__vertex {
  fill: #d81b8f;
  fill-opacity: 0.75;
}

.board-overlays__crossing circle {
  fill: none;
  stroke: #d81b8f;
}
```

- [x] **Step 3: Pass `config` to `BoardOverlays` in `src/ui/Board.tsx`**

Replace line 36:

```tsx
      <BoardOverlays state={state} flags={overlays} />
```

with:

```tsx
      <BoardOverlays state={state} flags={overlays} config={config} />
```

- [x] **Step 4: Format, type-check, and lint**

Run: `npm run format; npm run typecheck; npm run lint`
Expected: `tsc -b` and `eslint .` both exit 0, no errors reported.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean, that no length declaration survives to override a computed attribute, and that no tunable was hard-coded to get there.

### Task 4.1: Confirm the `src/rules/` boundary still holds ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. Nothing under `src/rules/` was edited by this contract, so any hit is a pre-existing regression, not this change.

- [x] **Step 2: Confirm the new UI module imports no React and touches no DOM**

Run: `Select-String -Path src\ui\boardScale.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `boardScale.ts` must stay pure — that purity is what lets its spec run under the existing `environment: 'node'` Vitest config without a DOM.

### Task 4.2: Confirm no length declaration survives in any board stylesheet ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep the three stylesheets for length declarations**

Run: `Select-String -Path src\ui\StationCard.css,src\ui\BoardTerrain.css,src\ui\BoardOverlays.css -Pattern "font-size|stroke-width|stroke-dasharray"`
Expected: zero hits. A surviving declaration wins over the SVG presentation attribute in the cascade, so the change would type-check, lint clean, and render exactly as before — the one failure mode of this contract that no other gate catches.

### Task 4.3: Confirm no tunable was hard-coded ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Grep the files this contract touches for the literals `rules.json` owns**

Run: `Select-String -Path src\ui\boardScale.ts,src\ui\StationCard.tsx,src\ui\StationCard.css,src\ui\BoardTerrain.tsx,src\ui\BoardTerrain.css,src\ui\BoardOverlays.tsx,src\ui\BoardOverlays.css,src\ui\Board.tsx -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits. The `boardScale.ts` fractions are all sub-unit decimals, and the retuned card values are fractions, not world units.

The path list is scoped to this contract's files on purpose. A repo-wide sweep of `src/` returns **three pre-existing hits that are not defects and are not this contract's to fix**: `HeroScene.tsx:22` (a `120` inside decorative SVG path data with its own private viewBox, driven by no tunable) and `DebugPanel.css:53` / `NewGamePanel.css:58` (`font-weight: 700`, a CSS keyword weight that the digit pattern matches by coincidence). Do not widen this grep and then report those as regressions.

- [x] **Step 2: Confirm the spec's fixture is the only place those literals appear**

Run: `Select-String -Path src\ui\__tests__\boardScale.test.ts,src\rules\__tests__\*.ts -Pattern "\b(350|700|1400|4000|120)\b" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: a non-zero count, all inside `__tests__/`. Test fixtures may state concrete values — that is what makes the "reproduces the shipped world units" assertions meaningful. Production source must not.

### Task 4.4: Static gates, full suite, and file sizes ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Typecheck, lint, format check, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed and a total that is the pre-existing count plus the 9 new `boardScale` tests. Quote the `Tests  N passed` line. `format:check` is a real gate here rather than a formality — every implementation task ran `npm run format`, so a hit at this point means a file was edited after its last format.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 3: Measure every file created or grown**

Run: `Get-ChildItem src\ui\boardScale.ts,src\ui\__tests__\boardScale.test.ts,src\ui\StationCard.tsx,src\ui\BoardTerrain.tsx,src\ui\BoardOverlays.tsx,src\ui\Board.tsx | ForEach-Object { "{0,6} {1}" -f (Get-Content $_.FullName | Measure-Object -Line).Lines, $_.Name }`
Expected: every count under 200. Anything over 400 is blocking and must be split in this contract, not deferred.

### Task 4.5: Update the PR description ✓

- Skill: `none — documentation for the developer, no code written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Create `.claude/contract/SCRUM-15-scale-board-text-and-marks/pr-description.md` covering:

- A link to `plan.md` in this folder and to [SCRUM-15](https://amazerbeam.atlassian.net/browse/SCRUM-15).
- What changed: every rendered size is now a fraction of the tunable it belongs to, the fractions live once in `src/ui/boardScale.ts`, and the card's type sizes and vertical rhythm were retuned for AC2/AC3.
- The **cascade note** for future contributors: sizes on the SVG board are presentation attributes, and a `font-size` / `stroke-width` / `stroke-dasharray` added to one of these stylesheets will silently override them. Length belongs in `boardScale.ts`; stylesheets keep paint and typeface only.
- Every item from the "Developer decides or observes" list above, verbatim — especially the AC2/AC3 visual confirmation, the "STARTING" overhang fallback, and the SCRUM-5 ordering decision.
- Verification results actually observed: the exact `Tests  N passed` line, and the exit status of `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build`.
- A one-line statement that a pure unit test now lives under `src/ui/__tests__/` — a first for this repo, collected by the existing `vite.config.ts:13` glob, needing no toolchain change, and explicitly *not* the component test the brief declined.

---

## Self-review

(Filled by the planner before handing off so the executor can confirm coverage.)

**Spec coverage:**

- `plan.md` In-scope — new pure module `src/ui/boardScale.ts` with the three derivations → Task 1 Step 1.
- `plan.md` In-scope — Vitest coverage asserting proportionality and exact reproduction at 4000 → Task 1 Steps 3-4.
- `plan.md` In-scope — `StationCard.tsx` computed attributes, retuned fractions, corrected doc comment (AC6) → Task 2 Step 1.
- `plan.md` In-scope — `StationCard.css` length declarations deleted → Task 2 Steps 2-3.
- `plan.md` In-scope — `BoardOverlays.tsx` config prop and computed marks → Task 4 Step 1.
- `plan.md` In-scope — `BoardOverlays.css` length declarations deleted → Task 4 Step 2.
- `plan.md` In-scope — `BoardTerrain.tsx` config prop and computed strokes → Task 3 Step 1.
- `plan.md` In-scope — `BoardTerrain.css` length declarations deleted → Task 3 Step 2.
- `plan.md` In-scope — `Board.tsx` passes `config` down → Task 3 Step 3 and Task 4 Step 3.
- AC1 (card text scales) → Task 1 Step 3 first `cardMetrics` test; Task 2 Step 1.
- AC2 (legible and dominant at 120) → Task 1 Step 3 second `cardMetrics` test proves the ratio and the gap; the visual half is a developer observation in the File map.
- AC3 (pawns countable) → Task 1 Step 3 third `cardMetrics` test proves the row clears the grey bonus and stays inside the card; visual confirmation is a developer observation.
- AC4 (overlay radii and terrain strokes scale) → Tasks 3 and 4; `terrainStrokes` / `overlayMarks` halving tests in Task 1 Step 3.
- AC5 (nothing hard-coded) → Task 4.3 Steps 1-2.
- AC6 (doc comment matches the code) → Task 2 Step 1.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or the exact command with its expected result. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No step invents a tuning value or reaches for an `eslint-disable`. No commit is planned.

**Type / name consistency:** `cardMetrics`, `terrainStrokes`, `overlayMarks`, `CardMetrics`, `TerrainStrokes`, `OverlayMarks`, `TerrainKind` and `strokeFor` are spelled identically in every task and match `plan.md` Part 2 → Data shapes. The `CardMetrics` field names (`bodyStroke`, `typeY`, `typeSize`, `bonusFirstY`, `bonusFirstSize`, `bonusLaterY`, `bonusLaterSize`, `pawnY`, `pawnRadius`, `pawnStroke`) are used identically in Task 1 Step 1 and Task 2 Step 1. `mountainDash` and `rectDash` are strings in the interface, in the implementation, in the tests, and at both consumer sites. No CSS class name is renamed anywhere in this contract, so every `station-card__*`, `board-terrain__*` and `board-overlays__*` string binding is preserved. No `rules.json` key is added, renamed or retyped.

**Phase boundary cleanliness:**

- **Phase 1** ends with `boardScale.ts` and its spec present, type-checking, and passing, and with no consumer importing them — the app renders exactly as it did before, so the boundary is safe.
- **Phase 2** ends with the card fully converted and its stylesheet stripped in the same task; `StationCard`'s props are unchanged so `Board.tsx` needs no edit, and the terrain and overlay layers still carry their existing fixed sizes without conflict.
- **Phase 3** ends with both board layers converted and both call sites in `Board.tsx` updated; each task changes its component, its stylesheet and its call site together, so the tree type-checks after Task 3 as well as after Task 4 — no required prop is ever added without its caller.
- **Phase 4** makes no production change at all: every step is a grep, a gate, or a document written into the plan folder.
