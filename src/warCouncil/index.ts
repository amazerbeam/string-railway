export type { RoundState as WarCouncilState } from './types'

export {
  AbilityChoiceKind,
  ALL_SUITS,
  CardRank,
  currentTurn,
  declaredPath,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  RoundPhase,
  Suit,
  TRICKS_PER_ROUND,
} from './types'
export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'
export type { DeclarationState } from './types'
export { containsCard, sameCard } from './cardUtils'
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export { dealRound } from './deal'
export { legalMoves } from './legalMoves'
export { QUARRY_SIDE, monarchFollowApplies, monarchFollowSet } from './quarryRuleBreak'
export { resolveTrickWinner } from './resolveTrick'
export { playCard } from './playCard'
export {
  huntDamage,
  pendingHuntDamage,
  duelSideDamage,
  HuntNotScorable,
  HuntNotScorableError,
  scoreHunt,
} from './scoring'
export type { HuntDamage, HuntOutcome } from './scoring'
export { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
export type { CpuMove, QuarryIntent } from './cpuPlayer'
export { spoils } from './spoils'
export { declareHunt, DeclareRejection } from './declareHunt'
export type { DeclareResult } from './declareHunt'
