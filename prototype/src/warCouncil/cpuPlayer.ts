import { TelegraphFidelity, TELEGRAPH_FIDELITY } from '../hunt'
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { playCard } from './playCard'
import { resolveTrickWinner } from './resolveTrick'
import { isSkulled } from './skulls'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  QUARRY_SIDE,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'

export interface CpuMove {
  readonly card: Card
  readonly choice?: AbilityChoice
}

function suitOrder(suit: Suit): number {
  return ALL_SUITS.indexOf(suit)
}

function compareCards(a: Card, b: Card): number {
  return a.rank - b.rank || suitOrder(a.suit) - suitOrder(b.suit)
}

function lowestCard(cards: readonly Card[]): Card {
  return [...cards].sort(compareCards)[0]
}

// Card selection only — always drawn from legalMoves()'s own output, so this can never
// produce an illegal card. Leading: the lowest legal card, unchanged. Following, in priority
// order:
//   1. AC12 — the lowest legal card that would LOSE the trick and carries a skull, so the
//      player is the one who wins it. Without this the mechanic is toothless and a play-test
//      measures nothing.
//   2. unchanged — the lowest legal card that would win.
//   3. unchanged — the lowest legal card at all.
// The LEAD is deliberately unchanged: DLR-80 names AC12 as the minimum CPU change, and
// avoiding a skulled lead is a second behaviour with its own feel consequences.
export function chooseCpuCard(state: RoundState, side: PlayerSide): Card {
  const legal = legalMoves(state, side)
  if (state.currentTrick.length === 0) {
    return lowestCard(legal)
  }
  const lead = state.currentTrick[0]
  const wouldWin = (card: Card) =>
    // DLR-122 — evaluated at BRONZE deliberately, with no tier threaded in. This is the Quarry's
    // own EVALUATION of a candidate card, not the rule that resolves the trick — `playCard` owns
    // that and does thread the ladder. The consequence is that a player's gold Witch is
    // occasionally misjudged by the Quarry, which is a fair consequence of the upgrade rather
    // than a defect, and it keeps `chooseCpuMove`'s signature and its call sites unchanged.
    resolveTrickWinner([lead, { side, card }], state.trumpSuit) === side

  // DLR-167 — `skulledCards`, NOT `skullsOn`: this reasons about the QUARRY's own dealt skulls.
  // A skull the player just put on their own card is not something the Quarry knows or is shown,
  // and `legal` here is the Quarry's own hand in any case.
  const skulledLosers = legal.filter(
    (card) => !wouldWin(card) && isSkulled(state.skulledCards, card),
  )
  if (skulledLosers.length > 0) {
    return lowestCard(skulledLosers)
  }

  const winners = legal.filter(wouldWin)
  return lowestCard(winners.length > 0 ? winners : legal)
}

/**
 * DLR-163 AC4 — the Quarry names the suit it holds MOST of, and declines when that suit is
 * already trump. This is `chooseCpuFoxChoice`'s own heuristic with the cost removed: it no longer
 * has to give up a card, so the empty-hand decline it used to need is gone — a 3 played as the
 * Quarry's last card can still change trump.
 *
 * Ties break on `ALL_SUITS` order through `reduce`'s strict `>`, unchanged, so the choice stays
 * deterministic and a seeded encounter reproduces it.
 */
export function chooseCpuTrumpChoice(
  handAfterFox: readonly Card[],
  trumpSuit: Suit,
): AbilityChoice {
  const strongest = ALL_SUITS.map((suit) => ({
    suit,
    count: cardsOfSuit(handAfterFox, suit).length,
  })).reduce((best, row) => (row.count > best.count ? row : best))
  if (strongest.count === 0 || strongest.suit === trumpSuit) {
    return { kind: AbilityChoiceKind.DeclineTrump }
  }
  return { kind: AbilityChoiceKind.NameTrump, suit: strongest.suit }
}

// Composes card selection with the matching ability choice, mirroring the same
// hand-shape construction playCard.ts itself uses internally, so the two stay
// in lockstep. Every value this can produce is drawn from a set the engine
// itself already treats as legal.
//
// DLR-163 — the Woodcutter branch is GONE: the Quarry's 5 takes no choice at all, and the swap it
// performs is `playCard`'s own business through `applyQuarrySwap`.
export function chooseCpuMove(state: RoundState, side: PlayerSide): CpuMove {
  const card = chooseCpuCard(state, side)
  if (card.rank === CardRank.Fox) {
    return {
      card,
      choice: chooseCpuTrumpChoice(removeCard(state.hands[side], card), state.trumpSuit),
    }
  }
  return { card }
}

export const QuarryIntentStance = {
  Leading: 'leading',
  Pressing: 'pressing',
  Ducking: 'ducking',
} as const
export type QuarryIntentStance = (typeof QuarryIntentStance)[keyof typeof QuarryIntentStance]

export interface QuarryIntent {
  readonly suit: Suit
  // Omitted, not `undefined`-valued, when the configured fidelity is Suit-only — narrowing
  // the fidelity narrows the shape a caller actually receives (DLR-52 AC4).
  readonly stance?: QuarryIntentStance
}

// Derives the Quarry's stance for `card` against the trick already in progress — the exact
// win/duck test chooseCpuCard's own winners-filter performs internally, re-run here so
// quarryIntent never has to expose the card itself to get the same answer.
function deriveStance(state: RoundState, card: Card): QuarryIntentStance {
  if (state.currentTrick.length === 0) {
    return QuarryIntentStance.Leading
  }
  const lead = state.currentTrick[0]
  const wouldWin =
    // DLR-122 — evaluated at BRONZE deliberately, with no tier threaded in. This is the Quarry's
    // own EVALUATION of a candidate card, not the rule that resolves the trick — `playCard` owns
    // that and does thread the ladder. The consequence is that a player's gold Witch is
    // occasionally misjudged by the Quarry, which is a fair consequence of the upgrade rather
    // than a defect, and it keeps `chooseCpuMove`'s signature and its call sites unchanged.
    resolveTrickWinner([lead, { side: QUARRY_SIDE, card }], state.trumpSuit) === QUARRY_SIDE
  return wouldWin ? QuarryIntentStance.Pressing : QuarryIntentStance.Ducking
}

/**
 * The telegraph's read of the Quarry's next move (§4, DLR-52) — never the card itself. Pure:
 * reads `state` and the configured fidelity, mutates nothing, safe to call any number of times
 * including under StrictMode's double-invoke (AC2). Covers both the leading and the following
 * case (AC3) via the same `currentTrick.length` branch chooseCpuCard already uses.
 *
 * A polling caller has no way to know from the outside whether it's safe to ask, so this makes
 * that check its own responsibility rather than a precondition the caller must independently
 * enforce. Returns `null` — never throws — in either state where there is no Quarry move to
 * describe: the round is already complete (its hand is empty, the same empty-hand crash
 * `chooseCpuCard`'s `lowestCard` risks and `roundReducer.ts`'s `advanceCpu` already had to guard
 * against for its own caller), or it currently isn't the Quarry's turn (the Player is about to
 * lead, or the Quarry just led and it's the Player's turn to follow).
 */
export function quarryIntent(
  state: RoundState,
  fidelity: TelegraphFidelity = TELEGRAPH_FIDELITY,
): QuarryIntent | null {
  if (state.phase === RoundPhase.Complete || currentTurn(state) !== QUARRY_SIDE) {
    return null
  }
  const card = chooseCpuCard(state, QUARRY_SIDE)
  if (fidelity === TelegraphFidelity.Suit) {
    return { suit: card.suit }
  }
  return { suit: card.suit, stance: deriveStance(state, card) }
}

/**
 * The commit step DLR-52 AC1 names — plays exactly the move quarryIntent described, by calling
 * the existing, unmodified chooseCpuMove + playCard sequence. Named so a caller doesn't need to
 * know QUARRY_SIDE to invoke it.
 *
 * Returns `{ ok: false, reason }` rather than throwing for the same two states `quarryIntent`
 * returns `null` for: the round is already complete (`RoundComplete`), or it isn't currently
 * the Quarry's turn (`NotYourTurn`) — mirroring the reasons `playCard` itself would give for
 * the same states.
 */
export function commitQuarryMove(state: RoundState): PlayCardResult {
  if (state.phase === RoundPhase.Complete) {
    return { ok: false, reason: IllegalMoveReason.RoundComplete }
  }
  if (currentTurn(state) !== QUARRY_SIDE) {
    return { ok: false, reason: IllegalMoveReason.NotYourTurn }
  }
  const move = chooseCpuMove(state, QUARRY_SIDE)
  return playCard(state, QUARRY_SIDE, move.card, move.choice)
}
