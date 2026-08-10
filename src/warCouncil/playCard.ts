import { applyFoxExchange, applyWoodcutterDraw, nextLeaderAfterTrick } from './abilities'
import { containsCard, removeCard, sameCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { monarchFollowApplies } from './quarryRuleBreak'
import { resolveTrickWinner } from './resolveTrick'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  RoundPhase,
  TRICKS_PER_ROUND,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type TrickCard,
} from './types'

export function playCard(
  state: RoundState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
): PlayCardResult {
  if (state.phase === RoundPhase.Complete) {
    return { ok: false, reason: IllegalMoveReason.RoundComplete }
  }
  if (currentTurn(state) !== side) {
    return { ok: false, reason: IllegalMoveReason.NotYourTurn }
  }
  if (!containsCard(state.hands[side], card)) {
    return { ok: false, reason: IllegalMoveReason.CardNotInHand }
  }

  const legal = legalMoves(state, side)
  if (!legal.some((c) => sameCard(c, card))) {
    // The Monarch constraint can be in force for either reason: the led card is a Monarch,
    // or the encounter's round-long rule-break is (§4). Both must name the same reason, so
    // this asks the same predicate legalMoves used rather than re-deriving it.
    const monarchConstrained =
      (state.currentTrick.length === 1 && state.currentTrick[0].card.rank === CardRank.Monarch) ||
      monarchFollowApplies(state, side)
    return {
      ok: false,
      reason: monarchConstrained
        ? IllegalMoveReason.MustFollowMonarch
        : IllegalMoveReason.MustFollowLeadSuit,
    }
  }

  let next: RoundState = {
    ...state,
    hands: { ...state.hands, [side]: removeCard(state.hands[side], card) },
  }

  if (card.rank === CardRank.Fox) {
    if (!choice) {
      return { ok: false, reason: IllegalMoveReason.MissingAbilityChoice }
    }
    if (choice.kind === AbilityChoiceKind.FoxExchange) {
      if (!containsCard(next.hands[side], choice.handCard)) {
        return { ok: false, reason: IllegalMoveReason.InvalidFoxExchangeCard }
      }
      next = applyFoxExchange(next, side, choice.handCard)
    } else if (choice.kind !== AbilityChoiceKind.FoxDecline) {
      return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
    }
  } else if (card.rank === CardRank.Woodcutter) {
    if (!choice) {
      return { ok: false, reason: IllegalMoveReason.MissingAbilityChoice }
    }
    if (choice.kind !== AbilityChoiceKind.WoodcutterDiscard) {
      return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
    }
    const handWithDrawn = [...next.hands[side], next.drawPile[0]]
    if (!containsCard(handWithDrawn, choice.discard)) {
      return { ok: false, reason: IllegalMoveReason.InvalidWoodcutterDiscard }
    }
    next = applyWoodcutterDraw(next, side, choice.discard)
  } else if (choice) {
    return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
  }

  const trickCard: TrickCard = { side, card }
  const currentTrick = [...next.currentTrick, trickCard]

  if (currentTrick.length === 1) {
    return { ok: true, state: { ...next, currentTrick, phase: RoundPhase.AwaitingFollow } }
  }

  // safe: length===1 already returned above, so this is exactly 2
  const completedTrick = currentTrick as [TrickCard, TrickCard]
  const winner = resolveTrickWinner(completedTrick, next.trumpSuit)
  const nextLeader = nextLeaderAfterTrick(completedTrick, winner)
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const capturedCards = {
    ...next.capturedCards,
    [winner]: [...next.capturedCards[winner], completedTrick[0].card, completedTrick[1].card],
  }
  const phase = tricksPlayed === TRICKS_PER_ROUND ? RoundPhase.Complete : RoundPhase.AwaitingLead

  return {
    ok: true,
    state: {
      ...next,
      currentTrick: [],
      leader: nextLeader,
      tricksPlayed,
      tricksWon,
      capturedCards,
      phase,
    },
  }
}
