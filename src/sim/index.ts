// DLR-130 — the module barrel. `scripts/sim.ts` imports through this rather than reaching into
// individual files, so the CLI's surface area is exactly what is exported here.
export { simulate } from './simulate'
export { formatSummary } from './report'
export { playRun } from './playRun'
export { playHand, type HandOutcome } from './playHand'
export {
  apCapacityFocusedPolicy,
  baselinePolicy,
  maximalistPolicy,
  noBuffsPolicy,
  rerollFocusedPolicy,
  BASELINE_CASH_AT_MULTIPLIER,
  HEAL_FLOOR_HEALTH,
} from './baselinePolicy'
export { cardAwarePolicy } from './cardAwarePolicy'
export { POLICIES } from './policies'
export { mintableBuffKinds, unreachableBuffKinds, unshelvedShopItems } from './reachability'
export {
  conditionsOnlyOpeningWeightOf,
  recommendedOpeningWeightOf,
  withOpeningPile,
  OPENING_PILE_VARIANTS,
  EXCLUDED_OPENING_KINDS,
  EXCLUDED_OPENING_AXIS,
  COINS_WEIGHT_FACTOR,
  SIDESTEP_WEIGHT_FACTOR,
} from './openingPileVariants'
export { MAX_ACTIONS_PER_HAND, MAX_HANDS_PER_FIGHT, MAX_SHOP_ACTIONS_PER_VISIT } from './simConfig'
export {
  fixtureRunAfterFirstFight,
  fixtureHandWithPrimedTimebomb,
  fixtureHandWithStackedBuffs,
} from './fixtures'
export { RunEnding } from './types'
export type {
  BuffFireOutcome,
  BuffWindowObservation,
  CardChoice,
  HandReport,
  RunReport,
  ShopAction,
  SimOptions,
  SimPolicy,
  SimSummary,
} from './types'
