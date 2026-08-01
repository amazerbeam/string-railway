import { crossings } from '../rules/geometry'
import './BoardOverlays.css'
import type { OverlayFlags } from '../constants/overlays'
import type { GameState, Point } from '../rules/types'

/**
 * The overlay layer's flag type stays importable from here, because this
 * component is what the flags describe. The declaration itself — and the
 * NO_OVERLAYS default — live in src/constants/overlays.ts: react-refresh's
 * only-export-components rule fails a component file that also exports a value,
 * and it permits only primitive literals as constants. A type re-export is
 * invisible to that rule, so consumers keep one import path.
 */
export type { OverlayFlags } from '../constants/overlays'

const VERTEX_RADIUS = 4
const CROSSING_RADIUS = 7

interface BoardOverlaysProps {
  state: GameState
  flags: OverlayFlags
}

function BoardOverlays({ state, flags }: BoardOverlaysProps) {
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
              r={VERTEX_RADIUS}
            />
          )),
        )}

      {flags.crossings &&
        allCrossings(state).map((point, index) => (
          <g key={index} className="board-overlays__crossing">
            <circle cx={point.x} cy={point.y} r={CROSSING_RADIUS} />
          </g>
        ))}
    </g>
  )
}

/**
 * Every transversal crossing between every unordered pair of placed paths,
 * recomputed on render from state.paths — never stored, because a stored copy of
 * derived geometry drifts and then the board lies about the rules.
 *
 * On a freshly generated board this is empty: setup guarantees the mountain
 * touches neither the border nor the river, and there are no railway strings
 * until SCRUM-6. An empty crossing overlay on a new game is correct, not broken.
 */
function allCrossings(state: GameState): readonly Point[] {
  const points: Point[] = []
  for (let i = 0; i < state.paths.length; i++) {
    for (let j = i + 1; j < state.paths.length; j++) {
      points.push(...crossings(state.paths[i].path, state.paths[j].path))
    }
  }
  return points
}

export default BoardOverlays
