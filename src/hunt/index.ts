export type { Hunt, Quarry, Damage, Health, IncomingDamage, EncounterState, Coins } from './types'
export { QuarryCharacter, DuelSide } from './types'

export type { SkullRankWeights } from './config'
export type { RunEncounterConfig } from './config'

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
  CHEAT_SLOT_COUNT,
  RUN_STARTING_CHEATS,
  COINS_PER_ENCOUNTER_WIN,
  CHEAT_PRICE,
  HEAL_PRICE,
  HEAL_HEALTH_RESTORED,
  ENVENOM_PRICE,
  ENVENOM_QUARRY_DAMAGE,
  ENVENOM_PLAYER_DAMAGE,
  POISON_GUARD_PRICE,
  WHETSTONE_PRICE,
  OpponentKind,
  RUN_ENCOUNTERS,
  ORDINARY_OPPONENT_NAMES,
  STAGE_BOSS_NAMES,
  ORDINARY_PER_STAGE,
  ORDINARY_HEALTH_BASE,
  ORDINARY_HEALTH_STEP,
  BOSS_HEALTH_MULTIPLIER,
  runEncounterAt,
} from './config'

export type { PathNode, PathStage } from './runPath'
export { PathNodeStatus, runPath } from './runPath'

export type { CheatCard, CheatCardId } from './cheats'
export { grantCheats, addCheat, removeCheat, hasCheat } from './cheats'

export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  hasPendingEnvenom,
  queueEnvenom,
} from './encounter'

export type { ShopStock } from './shop'
export {
  ShopItem,
  SHOP_ITEMS,
  ShopCategory,
  SHOP_CATEGORIES,
  SHOP_ITEMS_BY_CATEGORY,
  UNCATEGORISED_SHOP_ITEMS,
  PurchaseRefusal,
  priceOf,
  categoryOf,
  isShopCategoryAvailable,
  refusalFor,
  canBuyAnything,
} from './shop'

export type { RunState } from './run'
export {
  RunOutcome,
  startRun,
  recordEncounter,
  canAdvanceRun,
  advanceRun,
  beatenCount,
  shopStockFor,
  buyFromShop,
  bankClimbBonusFor,
} from './run'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'
