import { describe, expect, it } from 'vitest'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { autoPlayWarCouncilRound } from './battleTestHelpers'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  legalMoves,
  PlayerSide,
  RoundPhase,
  Suit,
} from '../../warCouncil'
import type { BattleState } from '../battleState'

describe('submitWarCouncilCard', () => {
  it('rejects a card submitted outside the WarCouncilRound phase', () => {
    const started = startBattle(() => 0.5)
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: started.vanguard,
      winner: PlayerSide.Player,
    }
    const result = submitWarCouncilCard(resolved, PlayerSide.Player, { suit: Suit.Bells, rank: 2 })
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotWarCouncilPhase })
  })

  it('bubbles an illegal-move rejection from playCard unchanged', () => {
    const state = startBattle(() => 0.5)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    const side = currentTurn(state.warCouncil)
    const result = submitWarCouncilCard(state, side, { suit: Suit.Bells, rank: 999 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('advances the round and stays in WarCouncilRound after one legal card', () => {
    const state = startBattle(() => 0.5)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    const side = currentTurn(state.warCouncil)
    const card = legalMoves(state.warCouncil, side)[0]
    const choice = card.rank === CardRank.Fox ? { kind: AbilityChoiceKind.FoxDecline } : undefined
    const result = submitWarCouncilCard(state, side, card, choice)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.WarCouncilRound)
  })

  it('reaches MusterConversion after a full round of legal play', () => {
    const state = startBattle(() => 0.42)
    const after = autoPlayWarCouncilRound(state)
    expect(after.phase).toBe(BattlePhase.MusterConversion)
    if (after.phase !== BattlePhase.MusterConversion) throw new Error('expected MusterConversion')
    expect(after.warCouncil.phase).toBe(RoundPhase.Complete)
    expect(after.warCouncil.tricksPlayed).toBe(13)
    expect(after.warCouncil.tricksWon.player + after.warCouncil.tricksWon.cpu).toBe(13)
  })
})
