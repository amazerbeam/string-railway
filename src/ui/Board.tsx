import BoardOverlays from './BoardOverlays'
import BoardTerrain from './BoardTerrain'
import StationCard from './StationCard'
import { COLOUR_SEATS } from '../constants/setup'
import { boardBounds } from '../rules/setup'
import './Board.css'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'
import type { ColourId, GameState } from '../rules/types'

interface BoardProps {
  state: GameState
  config: RulesConfig
  overlays: OverlayFlags
}

function Board({ state, config, overlays }: BoardProps) {
  const bounds = boardBounds(state, config)

  return (
    <svg
      className="board"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`String Railway board, ${state.seats.length} colour seats, round ${state.round}`}
    >
      <BoardTerrain paths={state.paths} />
      {state.stations.map((station) => (
        <StationCard
          key={String(station.card.id)}
          station={station}
          colour={displayFor(station.markerOwner)}
        />
      ))}
      <BoardOverlays state={state} flags={overlays} />
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
