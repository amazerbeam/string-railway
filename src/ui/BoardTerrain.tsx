import { PATH_KIND } from '../constants/game'
import { TERRAIN_DISPLAY } from '../constants/setup'
import './BoardTerrain.css'
import type { PathKind, PlacedPath, Polyline } from '../rules/types'

/** The three terrain kinds, back to front. Railway strings are SCRUM-6's. */
const TERRAIN_ORDER: readonly PathKind[] = [PATH_KIND.BORDER, PATH_KIND.MOUNTAIN, PATH_KIND.RIVER]

const CLOSED: ReadonlySet<PathKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])

const LABEL: Readonly<Record<string, string>> = {
  [PATH_KIND.BORDER]: 'Border string',
  [PATH_KIND.MOUNTAIN]: 'Mountain string',
  [PATH_KIND.RIVER]: 'River string',
}

interface BoardTerrainProps {
  paths: readonly PlacedPath[]
}

function BoardTerrain({ paths }: BoardTerrainProps) {
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
            stroke={TERRAIN_DISPLAY[kind as keyof typeof TERRAIN_DISPLAY]}
            aria-label={LABEL[kind]}
          />
        )
      })}
    </g>
  )
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
