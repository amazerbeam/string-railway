/**
 * §5.5 / §9 — final standings at game end. The one module in the entire
 * engine where reading PlayerId is correct: every OTHER limit, marker
 * trigger and connection map in this engine is keyed on ColourId (§9 makes
 * each colour a separate player for those purposes), but the game-end
 * question — "who won" — is asked of the human player, so their two
 * colour-seats (in the 2p variant) must be summed under their shared
 * PlayerId here, and only here.
 */
import type { ColourId, GameState, PlayerId } from './types'

export interface ColourStanding {
  readonly colour: ColourId
  readonly score: number
}

export interface OwnerStanding {
  readonly owner: PlayerId
  readonly colours: readonly ColourStanding[]
  readonly total: number
}

export interface FinalStandings {
  readonly byColour: readonly ColourStanding[]
  readonly byOwner: readonly OwnerStanding[]
  /** More than one entry means a shared victory (§5.5). */
  readonly winners: readonly PlayerId[]
}

/**
 * Groups seats with a Map<PlayerId, ...>, not an object, so both the group
 * order and the byOwner output stay insertion-ordered and deterministic —
 * an object's key order for a branded-string key is not something this
 * engine may rely on.
 */
export function finalStandings(state: GameState): FinalStandings {
  const byColour: ColourStanding[] = state.seats.map((seat) => ({
    colour: seat.colour,
    score: seat.score,
  }))

  const grouped = new Map<PlayerId, ColourStanding[]>()
  for (const seat of state.seats) {
    const colours = grouped.get(seat.owner) ?? []
    colours.push({ colour: seat.colour, score: seat.score })
    grouped.set(seat.owner, colours)
  }

  const byOwner: OwnerStanding[] = []
  for (const [owner, colours] of grouped) {
    const total = colours.reduce((sum, colourStanding) => sum + colourStanding.score, 0) // M14 — may be negative.
    byOwner.push({ owner, colours, total })
  }

  const highestTotal = byOwner.reduce(
    (max, owner) => (owner.total > max ? owner.total : max),
    -Infinity,
  )
  const winners = byOwner
    .filter((owner) => owner.total === highestTotal)
    .map((owner) => owner.owner)

  return { byColour, byOwner, winners }
}
