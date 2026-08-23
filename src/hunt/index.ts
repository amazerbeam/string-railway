export type {
  Hunt,
  Quarry,
  Damage,
  Health,
  IncomingDamage,
  EncounterState,
  Coins,
  ActionPoints,
} from './types'
export { QuarryCharacter, DuelSide } from './types'

export type { SkullRankWeights } from './skullWeights'
export type { RunEncounterConfig } from './config'

export {
  SKULL_WEIGHTS_UNIFORM,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_RANK_WEIGHTS,
} from './skullWeights'

export {
  HAND_SIZE,
  SKULL_DENSITY,
  DAMAGE_PER_HIT,
  FORCED_CASH_OUT_NUMERATOR,
  FORCED_CASH_OUT_DENOMINATOR,
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
  STARTING_BUFF_COUNT,
  COINS_PER_ENCOUNTER_WIN,
  CHEAT_PRICE,
  HEAL_PRICE,
  HEAL_HEALTH_RESTORED,
  ENVENOM_PRICE,
  ENVENOM_QUARRY_DAMAGE,
  ENVENOM_PLAYER_DAMAGE,
  POISON_GUARD_PRICE,
  WHETSTONE_PRICE,
  QUICK_KILL_TIER_MULTIPLIERS,
  FLASK_STARTING_CHARGES,
  FLASK_HEAL_PERCENT,
  DISCARDS_PER_FIGHT,
  MAX_CARDS_PER_DISCARD,
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
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

export type { Buff, BuffId, BuffCondition, BuffReward } from './buffs'
export {
  BuffTier,
  BuffRewardAxis,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  seedStartingBuffPile,
} from './buffs'

export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  hasPendingEnvenom,
  queueEnvenom,
  envenomDamageFor,
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

export type { FlaskStock } from './flask'
export { FlaskRefusal, flaskHealAmount, flaskRefusalFor } from './flask'

export type { QuickKill } from './quickKill'
export { quickKillTierMultiplier, quickKillPayout } from './quickKill'

export type { RunState } from './run'
export {
  RunOutcome,
  startRun,
  canAdvanceRun,
  beatenCount,
  shopStockFor,
  flaskStockFor,
  bankClimbBonusFor,
} from './run'

// DLR-93 Phase 2.5 — the run's transitions moved to `./runTransitions`; the barrel's exported set
// is unchanged.
export { recordEncounter, advanceRun, drinkFlask, buyFromShop } from './runTransitions'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'

export {
  apCostGiven,
  apCostFor,
  canAffordAp,
  spendAp,
  refreshActionPointsForNewHand,
} from './actionPoints'
