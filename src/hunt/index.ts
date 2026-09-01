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
  PLAYER_HAND_FLOOR,
  SKULL_DENSITY,
  DAMAGE_PER_HIT,
  BASE_DAMAGE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  QUARRY_LEAD_TELEGRAPH_ENABLED,
  SLICE_QUARRY_CHARACTER,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
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
  AP_CAPACITY_STEP,
  AP_CAPACITY_PRICE,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
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
} from './buffs'

export {
  openingPileWeightOf,
  seedStartingBuffPile,
  startingBuffPileFor,
  startingPileSeedFor,
} from './startingPile'

export type { TimebombDamage } from './buffCatalog'
export {
  CHEAT_DURATION_TRICKS,
  TIMEBOMB_FUSE_TRICKS,
  TIMEBOMB_TIER_MULTIPLIER,
  TIMEBOMB_DAMAGE,
  cheatBuff,
  timebombBuff,
  shieldBuff,
  cheatDurationTricksOf,
  timebombDamageOf,
  shieldHeartsOf,
} from './buffCatalog'

export type { ShieldAbsorption } from './shield'
export { SHIELD_HEARTS, NO_SHIELD_HEARTS, absorbWithShield, shieldHeartsForTier } from './shield'

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

export type { BuffBonusAccrual, BuffCarry, TrickBuffBonus } from './buffAccrual'
export {
  EMPTY_BUFF_ACCRUAL,
  EMPTY_BUFF_CARRY,
  startHandAccrual,
  accrualCapFor,
  accrueAxisBonus,
  accrueCarry,
  overlapBonusFor,
  resolveFiredBuffs,
  trickBonusFor,
} from './buffAccrual'

export type {
  BuffHandContext,
  BuffTrickContext,
  BuffTrickInput,
  BuffTrickOutcome,
} from './buffEvaluation'
export {
  advanceTricksWithoutHit,
  buffFires,
  firedBuffs,
  firesOncePerHand,
  resolveTrickBuffs,
} from './buffEvaluation'

export type {
  BuffActivationStock,
  BuffActivationState,
  BuffActivationResult,
} from './buffActivation'
export {
  BuffActivationRefusal,
  startBuffActivation,
  buffActivationRefusalFor,
  buffActivationStockFor,
  activateBuff,
  activateFromPile,
  deactivateFromPile,
  isRevocableBuff,
  openBuffWindow,
  refreshBuffsForNewHand,
  isPricedBuff,
  activatableBuffs,
} from './buffActivation'

// DLR-126 — the consumable model. `ConsumableTiming` and `ConsumableItemKind` are exported as both
// a value and a type, the `as const` pattern `BuffTier` and `BuffKind` already use.
export type {
  ConsumableItemKind,
  ConsumableEffect,
  ConsumableStack,
  WardAbsorption,
} from './consumables'
export {
  ConsumableTiming,
  CONSUMABLE_TIMING,
  CONSUMABLE_EFFECT_LIVE,
  WARD_ABSORPTION,
  SECOND_THOUGHTS_CHARGES,
  FORESIGHT_CARDS,
  SPYGLASS_CANDIDATES,
  PUPPETEER_FORCED_CARDS,
  isConsumableItemKind,
  isConsumableItem,
  consumableTimingOf,
  consumableEffectOf,
  consumableEffectIsLive,
  consumableStacks,
  spendConsumable,
  extraDiscardCharges,
  absorbWithWard,
  wardAbsorptionForTier,
} from './consumables'

export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  hasPendingTimebomb,
  queueTimebomb,
  activateShield,
  hasShieldHearts,
  NO_WARD,
  activateWard,
  hasWard,
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
  tieredRankOf,
} from './shop'

// DLR-122 — the rank-tier ladder and its single pricing point.
export type { RankTierTable } from './rankTiers'
export {
  TieredRank,
  AbilityTier,
  TIER_LADDER,
  TIERED_RANKS,
  ALL_BRONZE,
  RANK_TIER_STEP_PRICE,
  tierIndexOf,
  tierAtLeast,
  nextTierAfter,
  isAtMaxTier,
  steppedTo,
} from './rankTiers'

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
  baseDamageBonusFor,
  playerRankTiersFor,
  slotVisitStockFor,
} from './run'

// DLR-93 Phase 2.5 — the run's transitions moved to `./runTransitions`; the barrel's exported set
// is unchanged.
export {
  recordEncounter,
  advanceRun,
  drinkFlask,
  buyFromShop,
  pullSlotMachine,
} from './runTransitions'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'

export {
  apCostGiven,
  apCostFor,
  canAffordAp,
  spendAp,
  refundAp,
  refreshActionPointsForNewHand,
  apCapacityFor,
} from './actionPoints'

export type { Rng } from './seededRng'
export { createSeededRng, dealSeedFor, mixSeed } from './seededRng'

export {
  SlotMachineId,
  SLOT_MACHINE_IDS,
  REEL_COUNT,
  REEL_POOL_SIZE,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_REROLL_PRICE,
} from './slotConfig'

export { slotOutcomeOdds, awardCountFor, expectedCardsPerPull } from './slotOdds'

export type { SlotFamilyWeights, SlotAxisWeights } from './slotWeights'
export {
  SLOT_FAMILY_WEIGHTS,
  SLOT_AXIS_WEIGHTS,
  templateWeightFor,
  weightedDrawWithoutReplacement,
} from './slotWeights'

export type {
  BuffTemplate,
  ConditionBuffTemplate,
  ActivatedBuffTemplate,
  BuffActivatedTemplateKind,
  MintableConditionKind,
  MintableRewardAxis,
  BuffThresholdFamily,
  TemplateGrant,
} from './buffTemplates'
export {
  REWARD_TIER_VALUE,
  CONDITION_THRESHOLD,
  BUFF_TEMPLATES,
  BUFF_TEMPLATE_COUNT,
  ACTIVATED_TEMPLATES,
  templatesForFamily,
  mintFromTemplate,
  conditionThresholdOf,
  templateById,
  mintGrants,
} from './buffTemplates'

export type { SlotMachine, SlotAward, SlotPull, SlotVisitStock } from './slotMachine'
export {
  SlotOutcome,
  SlotPullRefusal,
  slotSeedFor,
  spinSeedFor,
  drawReelPool,
  spinReels,
  resolvePull,
  pullMachine,
  mintPullAwards,
  pullPriceFor,
  slotPullRefusalFor,
} from './slotMachine'
