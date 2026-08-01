import BoardOverlays from './BoardOverlays'
import BoardTerrain from './BoardTerrain'
import StationCard from './StationCard'
import { COLOUR_SEATS } from '../constants/setup'
import { boardBounds } from '../rules/setup'
import './Board.css'
import type { ReactNode, RefObject } from 'react'
import type { OverlayFlags } from './BoardOverlays'
import type { UseStationPlacementResult } from './useStationPlacement'
import type { RulesConfig } from '../rules/config'
import type { ColourId, GameState } from '../rules/types'

interface BoardProps {
  state: GameState
  config: RulesConfig
  overlays: OverlayFlags
  svgRef?: RefObject<SVGSVGElement | null>
  pointerHandlers?: UseStationPlacementResult['handlers']
  ghost?: ReactNode
}

function Board({ state, config, overlays, svgRef, pointerHandlers, ghost }: BoardProps) {
  const bounds = boardBounds(state, config)

  return (
    <svg
      className={`board${ghost ? ' board--placing' : ''}`}
      ref={svgRef}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`String Railway board, ${state.seats.length} colour seats, round ${state.round}`}
      {...pointerHandlers}
    >
      <BoardTerrain paths={state.paths} config={config} />
      {state.stations.map((station) => (
        <StationCard
          key={String(station.card.id)}
          station={station}
          colour={displayFor(station.markerOwner)}
        />
      ))}
      <BoardOverlays state={state} flags={overlays} config={config} />
      {ghost}
    </svg>
  )
}

/** COLOUR_SEATS is the single source of a colour's display hex; a station's own
 *  colour comes from its markerOwner, which generation set to its seat's colour. */
function displayFor(colour: ColourId | null): string | null {
  if (colour === null) {
    return null
  }
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? null
}

export default Board
