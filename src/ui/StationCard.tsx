import { cardMetrics } from './boardScale'
import { describeStationCard } from './stationCardText'
import './StationCard.css'
import type { PlacedStation } from '../rules/types'

interface StationCardProps {
  station: PlacedStation
  /** The display hex of the colour owning this card's §7.3 player marker, or
   *  null when the card carries no marker. */
  colour: string | null
}

/** Corner inset and radius for the §7.3 player-marker disc, kept clear of the
 *  §7.1 pawn row along the bottom edge so the two never read as one another. */
const MARKER_INSET = 0.16
const MARKER_RADIUS = 0.09

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
  const label =
    station.markerOwner === null
      ? describeStationCard(card)
      : `${describeStationCard(card)}, player marker placed`

  return (
    <g className="station-card" role="img" aria-label={label}>
      <rect
        className="station-card__body"
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        style={colour === null ? undefined : { stroke: colour }}
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
      {station.markerOwner !== null && (
        <circle
          className="station-card__marker"
          cx={rect.x + size * (1 - MARKER_INSET)}
          cy={rect.y + size * MARKER_INSET}
          r={size * MARKER_RADIUS}
          fill={colour ?? undefined}
        />
      )}
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
