import type { StationCard } from '../rules/types'

/**
 * One description for a card's §7.1 player limit and §7.2 black/grey connection
 * bonus, shared by the placed card's aria-label and the in-hand panel so the two
 * cannot drift. Every number comes from the card itself (§8 printed values via
 * STATION_DEFINITIONS) — none is a literal and none is a rules.json tunable.
 */
export function describeStationCard(card: StationCard): string {
  return `${card.type} station, connection bonus ${card.bonusFirst} first or ${card.bonusLater} later, player limit ${card.playerLimit}`
}
