import { COLOUR_SEATS } from '../constants/setup'
import './SeatLegend.css'
import type { PlayerCount } from '../rules/setup'
import type { ColourId, ColourSeat, PlayerId } from '../rules/types'

interface SeatLegendProps {
  seats: readonly ColourSeat[]
  turnOrder: readonly ColourId[]
  playerCount: PlayerCount
}

function SeatLegend({ seats, turnOrder, playerCount }: SeatLegendProps) {
  const groups = groupByOwner(seats, turnOrder)
  const sharing = playerCount === 2

  return (
    <section className="seat-legend" aria-label="Players and their colours">
      {sharing && (
        <p className="seat-legend__note">
          Two players, four colours — each player controls the two colours shown together. Every
          colour counts as a separate player for station limits and marker triggers (§9).
        </p>
      )}
      <ul className="seat-legend__owners">
        {groups.map(([owner, ownedSeats], index) => (
          <li className="seat-legend__owner" key={String(owner)}>
            <span className="seat-legend__owner-name">Player {index + 1}</span>
            <span className="seat-legend__colours">
              {ownedSeats.map((seat) => (
                <span className="seat-legend__colour" key={String(seat.colour)}>
                  <span
                    className="seat-legend__swatch"
                    style={{ background: displayFor(seat.colour) }}
                    aria-hidden="true"
                  />
                  {labelFor(seat.colour)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Groups colour-seats by owner, in turn order. A Map keyed on PlayerId, not an
 * object: insertion order is defined on a Map, and object-key order is a
 * determinism hazard. This is the only PlayerId read in src/ui/ — every limit
 * and trigger stays keyed on ColourId (§9).
 */
function groupByOwner(
  seats: readonly ColourSeat[],
  turnOrder: readonly ColourId[],
): ReadonlyArray<readonly [PlayerId, readonly ColourSeat[]]> {
  const grouped = new Map<PlayerId, ColourSeat[]>()
  for (const colour of turnOrder) {
    const seat = seats.find((candidate) => candidate.colour === colour)
    if (!seat) {
      continue
    }
    const existing = grouped.get(seat.owner)
    if (existing) {
      existing.push(seat)
    } else {
      grouped.set(seat.owner, [seat])
    }
  }
  return [...grouped.entries()]
}

function displayFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? '#888888'
}

function labelFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.label ?? String(colour)
}

export default SeatLegend
