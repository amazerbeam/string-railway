export type { Hunt, Quarry, Damage, Health, IncomingDamage, EncounterState, Coins } from './types'
export { QuarryCharacter, DuelSide } from './types'

export type { SkullRankWeights } from './config'

export {
  HAND_SIZE,
  SKULL_DENSITY,
  SKULL_WEIGHTS_UNIFORM,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_RANK_WEIGHTS,
  DAMAGE_PER_HIT,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  SLICE_QUARRY_CHARACTER,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  SIMULTANEOUS_DEPLETION_WINNER,
  CHEAT_SLOT_COUNT,
  RUN_STARTING_CHEATS,
  COINS_PER_ENCOUNTER_WIN,
  CHEAT_PRICE,
  HEAL_PRICE,
  HEAL_HEALTH_RESTORED,
} from './config'

export type { CheatCard, CheatCardId } from './cheats'
export { grantCheats, addCheat, removeCheat, hasCheat } from './cheats'

export { startEncounter, applyDamage, isEncounterResolved } from './encounter'

export type { ShopStock } from './shop'
export { ShopItem, SHOP_ITEMS, PurchaseRefusal, priceOf, refusalFor, canBuyAnything } from './shop'

export type { RunState } from './run'
export {
  RunOutcome,
  startRun,
  recordEncounter,
  canAdvanceRun,
  advanceRun,
  shopStockFor,
  buyFromShop,
} from './run'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'
