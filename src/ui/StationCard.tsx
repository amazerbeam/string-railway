import './StationCard.css'
import type { PlacedStation } from '../rules/types'

/** Fractions of the card's own size, so the layout scales with cardSize (M2)
 *  rather than assuming a pixel footprint. */
const TITLE_Y = 0.28
const BONUS_Y = 0.58
const PAWN_Y = 0.84
const PAWN_RADIUS = 0.05

interface StationCardProps {
  station: PlacedStation
  /** The owning colour's display hex for a starting station, else null. */
  colour: string | null
}

function StationCard({ station, colour }: StationCardProps) {
  const { rect, card } = station
  const size = rect.width
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
      />
      <text className="station-card__type" x={rect.x + size / 2} y={rect.y + size * TITLE_Y}>
        {card.type}
      </text>
      <text className="station-card__bonus-first" x={rect.x + size / 2} y={rect.y + size * BONUS_Y}>
        {card.bonusFirst}
      </text>
      <text
        className="station-card__bonus-later"
        x={rect.x + size / 2}
        y={rect.y + size * (BONUS_Y + 0.16)}
      >
        {card.bonusLater}
      </text>
      {pawns(station).map((cx, index) => (
        <circle
          key={index}
          className="station-card__pawn"
          cx={cx}
          cy={rect.y + size * PAWN_Y}
          r={size * PAWN_RADIUS}
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
