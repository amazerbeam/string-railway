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
  TIMEBOMB_PRICE,
  TIMEBOMB_QUARRY_DAMAGE,
  TIMEBOMB_PLAYER_DAMAGE,
  BLAST_GUARD_PRICE,
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
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_DELAY_TRICKS,
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

export type { Buff, BuffId, BuffCondition, BuffReward, BuffTarget } from './buffs'
export {
  BuffTier,
  BuffKind,
  BuffRewardAxis,
  BuffCadence,
  BuffTargetSuit,
  BUFF_CADENCE,
  BUFF_TARGET_RANK_MIN,
  BUFF_TARGET_RANK_MAX,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  ACTIVATED_BUFF_CONDITION,
  buffTargetSuitOf,
  buffTargetRankOf,
  isValidBuffTarget,
  seedStartingBuffPile,
} from './buffs'

export type { TimebombDamage } from './buffCatalog'
export {
  CHEAT_DURATION_TRICKS,
  TIMEBOMB_TIER_MULTIPLIER,
  TIMEBOMB_DAMAGE,
  cheatBuff,
  timebombBuff,
  cheatDurationTricksOf,
  timebombDamageOf,
} from './buffCatalog'

export type { BuffCostAxis } from './buffCosts'
export {
  AP_COST_MIN,
  AP_COST_MAX,
  REWARD_BASE,
  CONDITION_MODIFIER,
  CONSUMABLE_AP_COST,
  buffApCost,
  apCostOf,
  isConditionFamily,
  isConsumableKind,
} from './buffCosts'

export type { BuffBonusAccrual } from './buffAccrual'
export {
  EMPTY_BUFF_ACCRUAL,
  startHandAccrual,
  accrualCapFor,
  accrueAxisBonus,
  overlapBonusFor,
  resolveFiredBuffs,
} from './buffAccrual'

export type { BuffActivationStock, BuffActivationState } from './buffActivation'
export {
  BuffActivationRefusal,
  startBuffActivation,
  buffActivationRefusalFor,
  buffActivationStockFor,
  activateBuff,
  openBuffWindow,
  refreshBuffsForNewHand,
} from './buffActivation'

export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  hasPendingTimebomb,
  queueTimebomb,
  timebombDamageFor,
  hasPendingApplyPayout,
  queueApplyDamagePayout,
} from './encounter'

export type {
  PendingApplyPayout,
  ApplyDamageDelayModifiers,
  ApplyPayoutTick,
} from './applyDamagePayout'
export { applyDamageDelayTricks, queueApplyPayout, tickApplyPayout } from './applyDamagePayout'

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
