export type { Hunt, Quarry, Spoils, Standing, Damage, Health } from './types'
export { QuarryCharacter, HuntDeclaration, DuelSide } from './types'

export type { StandingBand } from './config'
export {
  StandingBandName,
  HUNT_MULTIPLIER_TABLES,
  standingTableFor,
  resolveStanding,
  cardBaseValue,
  cardValueFor,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  SLICE_QUARRY_CHARACTER,
  RANK_INVERSION_PIVOT,
  invertedCardValue,
  DamageRounding,
  DAMAGE_ROUNDING,
  roundDamage,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  SIMULTANEOUS_DEPLETION_WINNER,
} from './config'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'
