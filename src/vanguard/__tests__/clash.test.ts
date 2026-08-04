import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { applyClashAction, startClash } from '../clash'
import { OVERWRITE_COST } from '../config'
import {
  ClashRejectionReason,
  ClashStatus,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
} from '../types'
import { boardWith } from './testBoard'

describe('startClash', () => {
  it('builds an in-progress state with the given board, muster, and opening side', () => {
    const board = boardWith({})
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Cpu)
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) {
      expect(state.turn).toBe(PlayerSide.Cpu)
      expect(state.muster).toEqual({ player: 5, cpu: 5 })
      expect(state.board).toBe(board)
    }
  })
})

describe('applyClashAction', () => {
  it('alternates strictly, one action at a time, while both sides still have Muster', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    let state = startClash(board, { player: 2, cpu: 2 }, PlayerSide.Player)

    const first = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!first.ok) throw new Error('expected ok')
    state = first.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)
    expect(state.muster).toEqual({ player: 1, cpu: 2 })

    const second = applyClashAction(state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 4, r: 4 },
    })
    if (!second.ok) throw new Error('expected ok')
    state = second.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Player)
    expect(state.muster).toEqual({ player: 1, cpu: 1 })
  })

  it('locks the turn to the side with leftover Muster once the other side is exhausted, uncontested', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '2,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '1,1': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    let state = startClash(board, { player: 1, cpu: 3 }, PlayerSide.Player)

    const playerMove = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!playerMove.ok) throw new Error('expected ok')
    state = playerMove.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)

    const outOfTurn = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(outOfTurn).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })

    for (const target of [
      { q: 4, r: 4 },
      { q: 2, r: 2 },
      { q: 1, r: 1 },
    ]) {
      const cpuMove = applyClashAction(state, PlayerSide.Cpu, {
        kind: VanguardActionKind.Reinforce,
        target,
      })
      if (!cpuMove.ok) throw new Error('expected ok')
      state = cpuMove.state
      if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)
    }

    expect(state.status).toBe(ClashStatus.Complete)
    expect(state.muster).toEqual({ player: 0, cpu: 0 })
  })

  it('ends the exchange immediately on a Breach, leaving both sides Muster unspent', () => {
    const bases = { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 2, r: 0 } }
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
      { size: 3, bases },
    )
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)

    const result = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 2, r: 0 },
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.state.status).toBe(ClashStatus.Breached)
    if (result.state.status === ClashStatus.Breached) {
      expect(result.state.winner).toBe(PlayerSide.Player)
    }
    expect(result.state.muster).toEqual({ player: 5 - OVERWRITE_COST, cpu: 5 })

    const afterResolution = applyClashAction(result.state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 2, r: 0 },
    })
    expect(afterResolution).toEqual({ ok: false, reason: ClashRejectionReason.ClashAlreadyResolved })
  })

  it('rejects an action submitted by the side that is not currently up', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const state = startClash(board, { player: 3, cpu: 3 }, PlayerSide.Player)
    const result = applyClashAction(state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(result).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })
  })

  it('rejects an action the side cannot afford, and the rejection spends nothing', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const state = startClash(board, { player: 1, cpu: 3 }, PlayerSide.Player)

    const tooExpensive = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 1, r: 0 },
    })
    expect(tooExpensive).toEqual({ ok: false, reason: ClashRejectionReason.InsufficientMuster })

    const affordable = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!affordable.ok) throw new Error('expected ok')
    expect(affordable.state.muster.player).toBe(0)
  })

  it('rejects an action when the acting side has a NaN Muster value, rather than silently accepting it', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const state = startClash(board, { player: NaN, cpu: 3 }, PlayerSide.Player)

    const result = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(result).toEqual({ ok: false, reason: ClashRejectionReason.InsufficientMuster })
  })

  it('bubbles a board-legality rejection from applyVanguardAction unchanged', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)

    const result = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 4, r: 4 },
    })
    expect(result).toEqual({ ok: false, reason: IllegalActionReason.TargetNotOwnToken })
  })
})
