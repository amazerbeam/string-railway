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
  RANKS,
  RoundPhase,
  Suit,
} from './types'
export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'
export { containsCard, sameCard } from './cardUtils'
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export {
  CARDS_PER_DEAL,
  FRESH_ENCOUNTER_DECK,
  closeHand,
  dealPileFor,
  drawCards,
  isFreshDeck,
} from './encounterDeck'
export type { DealPile, DrawResult, DrawSource, EncounterDeck } from './encounterDeck'
export { dealRound } from './deal'
export { legalMoves, monarchFollowSet } from './legalMoves'
export type { LegalMoveOptions, PlayCardOptions } from './legalMoves'
export { resolveTrickWinner } from './resolveTrick'
export { tierForSide, swanTierFactsFor } from './rankTierRules'
export type { SwanTierFacts } from './rankTierRules'
export { buffTrickFactsFor, targetSuitOf } from './buffTrickFacts'
export type { BuffHandInput } from './buffTrickFacts'
export { buffReach, projectBuffBranches } from './buffProjection'
export type {
  BuffBranchOutcome,
  BuffBranchProjection,
  BuffProjection,
  BuffProjectionFacts,
  BuffProjectionInput,
} from './buffProjection'
export { playCard } from './playCard'
export { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from './skulls'
export { isPrimed, trickIsPrimed, primeCard, unprimeCard } from './timebomb'
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
