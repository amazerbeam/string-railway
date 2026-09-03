// DLR-163 — the buff subsystem's slice of the `src/hunt/` barrel, moved out of `index.ts` when
// that file reached its 400-line blocking budget, exactly as `config.ts` → `apConfig.ts` and
// `run.ts` → `runTransitions.ts` already did. `index.ts` re-exports this whole file, so the
// barrel's exported set is UNCHANGED and no importer moves.

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
  buffIsWild,
  isShopOnlyBuff,
  isValidBuffTarget,
} from './buffs'

export {
  openingPileWeightOf,
  seedStartingBuffPile,
  startingBuffPileFor,
  startingPileSeedFor,
} from './startingPile'

export type { CurseBonus } from './buffCatalog'
export {
  CHEAT_DURATION_TRICKS,
  CURSE_REWARD,
  cheatBuff,
  curseBuff,
  curseRewardOf,
  wildcardBuff,
  shieldBuff,
  cheatDurationTricksOf,
  shieldHeartsOf,
} from './buffCatalog'

export type { ShieldAbsorption } from './shield'
export { SHIELD_HEARTS, NO_SHIELD_HEARTS, absorbWithShield, shieldHeartsForTier } from './shield'

export type { BuffCostAxis, BuffMintedAxis } from './buffCosts'
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
  narrowToMintedAxis,
  isProtectiveAxis,
} from './buffCosts'

export type { StreakProtection, BuffProtectiveKind } from './buffProtection'
export {
  NO_STREAK_PROTECTION,
  isProtectiveKind,
  protectionCoversCleanLoss,
  conditionIsWidened,
  streakProtectionFor,
} from './buffProtection'

export type { BuffBonusAccrual, BuffCarry, TrickBuffBonus } from './buffAccrual'
export {
  EMPTY_BUFF_ACCRUAL,
  EMPTY_BUFF_CARRY,
  EMPTY_CURSE_BONUS,
  curseBonusOf,
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
  templateIdForBuff,
  templateForBuff,
  mintGrants,
} from './buffTemplates'

export {
  CombineRefusal,
  buffCombineKey,
  buffCombineFamilyKey,
  combinePairFor,
  combineProductFor,
  nextBuffTierAfter,
  combineRefusalFor,
  combineBuffs,
} from './buffCombine'

// DLR-162 — the wild transition.
export {
  WildRefusal,
  wildRefusalFor,
  isWildcardCard,
  mintWildAtTier,
  wildenedBuff,
  spendWildcard,
} from './buffWild'
