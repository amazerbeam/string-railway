import { crossings } from '../rules/geometry'
import { edgePolyline } from '../rules/pathGeometry'
import { overlayMarks } from './boardScale'
import './BoardOverlays.css'
import type { OverlayFlags } from '../constants/overlays'
import type { RulesConfig } from '../rules/config'
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

interface BoardOverlaysProps {
  state: GameState
  flags: OverlayFlags
  config: RulesConfig
}

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

/**
 * Every transversal crossing between every unordered pair of placed paths,
 * recomputed on render from state.paths — never stored, because a stored copy of
 * derived geometry drifts and then the board lies about the rules.
 *
 * On a freshly generated board this is empty: setup guarantees the mountain
 * touches neither the border nor the river, and there are no railway strings
 * until SCRUM-6. An empty crossing overlay on a new game is correct, not broken.
 *
 * Both sides go through edgePolyline: the border and the mountain are stored
 * corners-only, and an overlay that missed their closing edges would agree with
 * the bug it exists to help a play-tester find (SCRUM-16).
 */
function allCrossings(state: GameState): readonly Point[] {
  const points: Point[] = []
  for (let i = 0; i < state.paths.length; i++) {
    for (let j = i + 1; j < state.paths.length; j++) {
      points.push(...crossings(edgePolyline(state.paths[i]), edgePolyline(state.paths[j])))
    }
  }
  return points
}

export default BoardOverlays
