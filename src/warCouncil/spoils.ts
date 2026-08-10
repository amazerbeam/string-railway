import { cardBaseValue, type Spoils } from '../hunt'
import { CardRank, type PlayerSide, type RoundState } from './types'

// §1's additive term — the trick's winner gains 1 per Treasure (7) captured and
// loses 1 per Poison (8) captured (fox-in-the-forest.md → Poison cards; §1's
// component table). `cardValue` defaults to T2's `cardBaseValue`; the override is
// only ever used in tests, mirroring `resolveStanding`'s injectable-table pattern
// in src/hunt/config.ts, so §3's flat-value identity is testable without mutating
// shared config.
export function spoils(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardBaseValue,
): Spoils {
  return state.capturedCards[side].reduce((total, card) => {
    const adjustment =
      card.rank === CardRank.Treasure ? 1 : card.rank === CardRank.Poison ? -1 : 0
    return total + cardValue(card.rank) + adjustment
  }, 0)
}
