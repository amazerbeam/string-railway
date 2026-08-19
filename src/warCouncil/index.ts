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
export { playCard } from './playCard'
export { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from './skulls'
export { isEnvenomed, trickIsEnvenomed, envenomCard } from './envenom'
export type { SuitShape } from './skulls'
export { incomingFrom, isTaken, resolveTrickBank, TrickOutcome, trickOutcomeFor } from './bank'
export type { BankState, TrickFacts, TrickResolution } from './bank'
export { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
export type { CpuMove, QuarryIntent } from './cpuPlayer'
