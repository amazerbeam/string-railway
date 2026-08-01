import { describeStationCard } from './stationCardText'
import './StationGhost.css'
import type { Ref } from 'react'
import type { StationCard } from '../rules/types'

/** Fractions of the card's own size, matching StationCard.tsx's convention so
 *  the ghost and the placed card read as the same object. */
const TITLE_Y = 0.28
const BONUS_Y = 0.58

interface StationGhostProps {
  card: StationCard
  cardSize: number
  illegal: boolean
  ghostRef: Ref<SVGGElement>
}

/**
 * The card being positioned. Drawn at the origin: `ghostRef`'s `transform` is
 * written directly by useStationPlacement on every pointer move, bypassing the
 * reconciler (react-frontend architecture rule 4). NEVER add a `transform` prop
 * to the outer <g> — React would then own the attribute and overwrite it on the
 * next legality-driven render.
 */
function StationGhost({ card, cardSize, illegal, ghostRef }: StationGhostProps) {
  return (
    <g
      className={`station-ghost${illegal ? ' station-ghost--illegal' : ''}`}
      ref={ghostRef}
      aria-hidden="true"
    >
      <rect className="station-ghost__body" x={0} y={0} width={cardSize} height={cardSize} />
      <text className="station-ghost__type" x={cardSize / 2} y={cardSize * TITLE_Y}>
        {card.type}
      </text>
      <text className="station-ghost__bonus" x={cardSize / 2} y={cardSize * BONUS_Y}>
        {card.bonusFirst} / {card.bonusLater}
      </text>
      <title>{describeStationCard(card)}</title>
    </g>
  )
}

export default StationGhost
