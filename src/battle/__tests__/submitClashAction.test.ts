import { describe, expect, it } from 'vitest'
import { submitClashAction } from '../submitClashAction'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { boardWith } from '../../vanguard/__tests__/testBoard'
import { PlayerSide } from '../../warCouncil'
import {
  ClashRejectionReason,
  VanguardActionKind,
  VanguardCellKind,
  startClash,
} from '../../vanguard'
import type { BattleState } from '../battleState'

describe('submitClashAction', () => {
  it('rejects an action submitted outside the Clash phase', () => {
    const board = boardWith({})
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: board,
      winner: PlayerSide.Player,
    }
    const result = submitClashAction(
      resolved,
      PlayerSide.Player,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.5,
    )
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotClashPhase })
  })

  it('bubbles a rejection from applyClashAction unchanged', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const clash = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Cpu,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.5,
    )
    expect(result).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })
  })

  it('resolves the battle on a Breach, naming the winner and the final board', () => {
    const bases = { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 2, r: 0 } }
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
      { size: 3, bases },
    )
    const clash = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Player,
      { kind: VanguardActionKind.Overwrite, target: { q: 2, r: 0 } },
      () => 0.5,
    )
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.Resolved)
    if (result.state.phase !== BattlePhase.Resolved) throw new Error('expected Resolved')
    expect(result.state.winner).toBe(PlayerSide.Player)
    expect(result.state.vanguard.cells['2,0']).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('deals the next War Council round on a natural Clash end, alternating the dealer and persisting the board', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const clash = startClash(board, { player: 1, cpu: 0 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Player,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.77,
    )
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.WarCouncilRound)
    if (result.state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    expect(result.state.round).toBe(2)
    expect(result.state.dealer).toBe(PlayerSide.Cpu)
    expect(result.state.vanguard.cells['0,0']).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 1,
    })
    expect(result.state.warCouncil.dealer).toBe(PlayerSide.Cpu)
  })
})
