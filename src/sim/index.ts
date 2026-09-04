// DLR-130 — the module barrel. `scripts/sim.ts` imports through this rather than reaching into
// individual files, so the CLI's surface area is exactly what is exported here.
export { simulate } from './simulate'
export { formatSummary } from './report'
export { playRun } from './playRun'
export { playHand, type HandOutcome } from './playHand'
export {
  baselinePolicy,
  maximalistPolicy,
  noBuffsPolicy,
  rerollFocusedPolicy,
  HEAL_FLOOR_HEALTH,
} from './baselinePolicy'
export { cardAwarePolicy } from './cardAwarePolicy'
export {
  survivalistPolicy,
  survivalistBaselinePolicy,
  sharpshooterPolicy,
} from './survivalistPolicy'
export { skilledPolicy } from './skilledPolicy'
export {
  chooseSkilledCard,
  cheatEscape,
  leadBankOdds,
  bestLeadBankOdds,
  quarrySkullOdds,
  deadness,
} from './skilledCardPlay'
export { POLICIES } from './policies'
export { withRollTarget, rollTargetPolicies, ROLL_TARGET_SWEEP } from './rollOverPolicy'
export { mintableBuffKinds, unreachableBuffKinds, unshelvedShopItems } from './reachability'
export { withOpeningPile, OPENING_PILE_VARIANTS } from './openingPileVariants'
export { MAX_ACTIONS_PER_HAND, MAX_HANDS_PER_FIGHT, MAX_SHOP_ACTIONS_PER_VISIT } from './simConfig'
export { fixtureRunAfterFirstFight, fixtureHandWithStackedBuffs } from './fixtures'
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
