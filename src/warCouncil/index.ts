export type { RoundState as WarCouncilState } from './types'

export {
  AbilityChoiceKind,
  ALL_SUITS,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  Suit,
} from './types'
export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'
export { containsCard, sameCard } from './cardUtils'
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export { dealRound } from './deal'
export { legalMoves, monarchFollowSet } from './legalMoves'
export type { LegalMoveOptions, PlayCardOptions } from './legalMoves'
export { resolveTrickWinner } from './resolveTrick'
export { tierForSide, swanTierFactsFor } from './rankTierRules'
export type { SwanTierFacts } from './rankTierRules'
export { playCard } from './playCard'
export { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from './skulls'
export { isPrimed, trickIsPrimed, primeCard } from './timebomb'
export type { SuitShape } from './skulls'
export {
  cashValue,
  forcedCashValue,
  incomingFrom,
  isTaken,
  resolveTrickBank,
  TrickOutcome,
  trickOutcomeFor,
} from './bank'
export type { BankState, TrickFacts, TrickResolution } from './bank'
export {
  ApplyDamageRefusal,
  applyDamageRefusalFor,
  cashBankNow,
  incomingFromCashOut,
} from './voluntaryCashOut'
export type { ApplyDamageStock, VoluntaryCashOut } from './voluntaryCashOut'
export { DiscardRefusal, discardRefusalFor, applyDiscard } from './discard'
export type { DiscardStock } from './discard'
export { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
export type { CpuMove, QuarryIntent } from './cpuPlayer'
