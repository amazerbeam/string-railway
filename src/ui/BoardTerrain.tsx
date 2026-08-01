import { PATH_KIND } from '../constants/game'
import { TERRAIN_DISPLAY } from '../constants/setup'
import { isClosedPathKind } from '../rules/pathGeometry'
import { terrainStrokes } from './boardScale'
import './BoardTerrain.css'
import type { TerrainStrokes } from './boardScale'
import type { RulesConfig } from '../rules/config'
import type { PlacedPath, Polyline } from '../rules/types'

/** The three terrain kinds, back to front. Railway strings are SCRUM-6's. */
type TerrainKind = typeof PATH_KIND.BORDER | typeof PATH_KIND.MOUNTAIN | typeof PATH_KIND.RIVER

const TERRAIN_ORDER: readonly TerrainKind[] = [
  PATH_KIND.BORDER,
  PATH_KIND.MOUNTAIN,
  PATH_KIND.RIVER,
]

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
            d={toPathData(path.path, isClosedPathKind(kind))}
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
