import { HAND_SIZE, PLAYER_HAND_FLOOR, TieredRank } from '../hunt'
import { applyFoxExchange, applyWoodcutterDraw, nextLeaderAfterTrick } from './abilities'
import { resolveTrickBank } from './streak'
import { buffTrickFactsFor } from './buffTrickFacts'
import { containsCard, removeCard, sameCard } from './cardUtils'
import { drawCards } from './encounterDeck'
import { legalMoves, type PlayCardOptions } from './legalMoves'
import { trickIsPrimed } from './timebomb'
import { resolveTrickWinner } from './resolveTrick'
import { swanTierFactsFor, tierForSide } from './rankTierRules'
import { trickIsSkulled } from './skulls'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type RoundState,
  type TrickCard,
} from './types'

export function playCard(
  state: RoundState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
  options?: PlayCardOptions,
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

  const legal = legalMoves(state, side, options)
  if (!legal.some((c) => sameCard(c, card))) {
    // The Monarch constraint has exactly one source since DLR-81: the led card is a Monarch.
    // Mirrors legalMoves' own condition, so the legal set and the reason code cannot disagree.
    const monarchConstrained =
      state.currentTrick.length === 1 && state.currentTrick[0].card.rank === CardRank.Monarch
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
    // DLR-146 fix pass — through `drawCards` rather than a raw `drawPile[0]` index, so this
    // preview agrees with what `applyWoodcutterDraw` will actually hand back, including a
    // mid-hand reshuffle, and never contains `undefined` when the pile has run dry.
    const preview = drawCards(next, 1)
    const handWithDrawn = [...next.hands[side], ...preview.drawn]
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
    return {
      ok: true,
      state: { ...next, currentTrick, lastResolution: null, phase: RoundPhase.AwaitingFollow },
    }
  }

  // safe: length===1 already returned above, so this is exactly 2
  const completedTrick = currentTrick as [TrickCard, TrickCard]
  // DLR-122 — the Witch ladder reaches the trick's own resolution. `tierForSide` is the ONLY
  // route to a tier in this tree (AC3); nothing here indexes the table itself.
  const winner = resolveTrickWinner(
    completedTrick,
    next.trumpSuit,
    tierForSide(options?.playerRankTiers, PlayerSide.Player, TieredRank.Witch),
  )
  const nextLeader = nextLeaderAfterTrick(completedTrick, winner)
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const finalTrick = tricksPlayed === HAND_SIZE

  // Every rule AC4-AC9 states lives in `resolveTrickBank`, DLR-90's AC5 with them, and DLR-91's
  // D1/D3 too; this function decides nothing about the outcome, it only reports the facts. The
  // three Timebomb facts arrive from the caller for the reason `PlayCardOptions` documents.
  const lastResolution = resolveTrickBank(
    { total: next.total, roll: next.roll },
    {
      playerWon: winner === PlayerSide.Player,
      skullTrick: trickIsSkulled(next.skulledCards, completedTrick),
      finalTrick,
      timebombTrick: trickIsPrimed(next.primedCards, completedTrick),
      timebombToPlayer: options?.timebombToPlayer ?? 0,
      timebombToQuarry: options?.timebombToQuarry ?? 0,
      blastGuarded: options?.blastGuarded ?? false,
      baseDamageBonus: options?.baseDamageBonus ?? 0,
      // DLR-122 AC4/AC5 — the Swan ladder as two plain facts, derived by `rankTierRules.ts`,
      // which owns AC3's player-only gate. `streak.ts` adds the clean-loss half of the rule.
      ...swanTierFactsFor(completedTrick, options?.playerRankTiers),
      // DLR-125 — `next.hands` is already post-removal, which is exactly "the hand at hand's
      // end" Keepsake reads. Derived by the ONE producer both this call site and the preview use.
      ...buffTrickFactsFor(completedTrick, next.hands[PlayerSide.Player], options?.buffs ?? null),
    },
  )

  // DLR-146 AC2/AC3 — the PLAYER only, at the trick's RESOLUTION. Three orderings are load-bearing
  // and none is stylistic:
  //   * AFTER `resolveTrickBank`, because `buffTrickFactsFor` was handed the hand as "the hand at
  //     hand's end" and Keepsake reads its suits — refilling first would change a buff's payout as
  //     a side effect of this ticket.
  //   * NEVER on the lead, which returned above, so a drawn card cannot enter the trick in
  //     progress.
  //   * NOT on the final trick: the hand is over, so a card drawn here could never be played and
  //     would only pull the pile a card further down before `closeHand` sweeps it.
  // AC3 is satisfied by construction rather than by a guard — the Quarry is simply never passed.
  // AC4: at a floor of 0 the `<` test is unreachable, so this is a no-op and no second code path
  // exists for the revert to miss.
  const floor = options?.handFloor ?? PLAYER_HAND_FLOOR
  const playerHand = next.hands[PlayerSide.Player]
  const refill =
    finalTrick || playerHand.length >= floor
      ? null
      : drawCards(
          {
            ...next,
            spentPile: [...next.spentPile, completedTrick[0].card, completedTrick[1].card],
          },
          floor - playerHand.length,
        )

  return {
    ok: true,
    state: {
      ...next,
      hands: refill
        ? { ...next.hands, [PlayerSide.Player]: [...playerHand, ...refill.drawn] }
        : next.hands,
      drawPile: refill ? refill.drawPile : next.drawPile,
      drawSeed: refill ? refill.drawSeed : next.drawSeed,
      currentTrick: [],
      // DLR-123 AC3 — the trick's two cards go face-down to the spent pile AS THE TRICK RESOLVES.
      // THE single place this pile grows: `dealRound` seeds it and `closeHand` reads it, and
      // nothing else in the engine writes it, so a card cannot be spent twice or spent early.
      // DLR-146 — the refill is handed this ALREADY-GROWN pile above, so a reshuffle it triggers
      // can reach the trick that just resolved. Taking `refill.spentPile` here rather than
      // rebuilding it is what keeps all 33 conserved when that happens.
      spentPile: refill
        ? refill.spentPile
        : [...next.spentPile, completedTrick[0].card, completedTrick[1].card],
      leader: nextLeader,
      tricksPlayed,
      tricksWon,
      total: lastResolution.total,
      roll: lastResolution.roll,
      lastResolution,
      phase: finalTrick ? RoundPhase.Complete : RoundPhase.AwaitingLead,
    },
  }
}
