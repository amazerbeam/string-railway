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
  WHETSTONE_PRICE,
  QUICK_KILL_TIER_MULTIPLIERS,
  FLASK_STARTING_CHARGES,
  FLASK_HEAL_PERCENT,
  DISCARDS_PER_FIGHT,
  MAX_CARDS_PER_DISCARD,
  TREASURE_BASE_DAMAGE_STEP,
  QUARRY_TREASURE_DAMAGE,
  WOODCUTTER_SWAP_STEP,
  QUARRY_SWAP_SKULL_CHANCE,
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

// DLR-163 — the buff subsystem's re-exports moved to `./buffIndex` when this barrel reached its
// 400-line blocking budget, the same split `config.ts` → `apConfig.ts` already made. The barrel's
// exported set is unchanged.
export * from './buffIndex'

export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
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

// DLR-158 — the max-health purchase's price formula and its raise rule.
export {
  MAX_HEALTH_PER_PURCHASE,
  MAX_HEALTH_PRICE_BASE,
  MAX_HEALTH_PRICE_STEP,
  maxHealthPriceFor,
  raisedMaxHealthFor,
} from './maxHealth'

// DLR-163 AC5 — the Swap pile's rule, stated once outside `run.ts` so the arithmetic is
// unit-testable with no renderer.
export type { SwapPile } from './swapPile'
export { swapPileAfterWoodcutter, swapCapFor } from './swapPile'

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
