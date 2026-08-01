import { STATION_DEFINITIONS, STATION_TYPE } from '../constants/stations'
import { asStationId } from './types'
import type { DeckComposition, DeckStationType } from './config'
import type { Rng } from './rng'
import type { StationCard } from './types'

/**
 * §4.1 step 5 + §8.1 — builds the shuffled station deck from the M17
 * composition. The composition is the tunable (rules.json); the per-card
 * values are §8 printed rulebook data and come from STATION_DEFINITIONS, so
 * retuning the deck can never accidentally retune a card's scoring.
 *
 * Card ids are `${TYPE}-${n}`, 1-based, assigned BEFORE the shuffle. That
 * makes an id stable for a given composition regardless of seed, so a move log
 * naming a card id replays identically even if the shuffle order differs.
 *
 * Iterates DECK_TYPE_ORDER — a fixed array — rather than Object.keys(
 * composition), because object-key iteration order is a determinism hazard the
 * moment rules.json is hand-edited and the keys come back in a different order.
 */
const DECK_TYPE_ORDER: readonly DeckStationType[] = [
  STATION_TYPE.HAMLET,
  STATION_TYPE.VILLAGE,
  STATION_TYPE.TOWN,
  STATION_TYPE.SCENIC,
  STATION_TYPE.RURAL,
  STATION_TYPE.TERMINUS,
  STATION_TYPE.RAILYARD,
  STATION_TYPE.LANDMARK,
  STATION_TYPE.DEPOT,
]

export function buildDeck(composition: DeckComposition, rng: Rng): readonly StationCard[] {
  const cards: StationCard[] = []
  for (const type of DECK_TYPE_ORDER) {
    const definition = STATION_DEFINITIONS[type]
    const count = composition[type]
    for (let n = 1; n <= count; n++) {
      cards.push({
        id: asStationId(`${type}-${n}`),
        type,
        bonusFirst: definition.bonusFirst,
        bonusLater: definition.bonusLater,
        playerLimit: definition.playerLimit,
        flags: definition.flags,
      })
    }
  }

  // Seeded Fisher-Yates, in place on our own local array.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    const swap = cards[i]
    cards[i] = cards[j]
    cards[j] = swap
  }

  return cards
}
