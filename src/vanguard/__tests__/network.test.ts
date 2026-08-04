import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { cellKey } from '../hexGrid'
import { connectedNetwork, minDistanceToNetwork } from '../network'
import { VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

describe('connectedNetwork', () => {
  it('includes the base and every chain-connected token the side owns', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const network = connectedNetwork(board, PlayerSide.Player)
    expect(new Set(network.map(cellKey))).toEqual(new Set(['0,0', '1,0', '2,0']))
  })

  it('excludes a same-owner token that is not chain-connected to the base', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '3,3': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([{ q: 0, r: 0 }])
  })

  it('does not cross an enemy token or a defense cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '0,1': { kind: VanguardCellKind.Defense },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([{ q: 0, r: 0 }])
  })

  it('returns [] when the side no longer owns its own base cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([])
  })
})

describe('minDistanceToNetwork', () => {
  it('is Infinity for an empty network', () => {
    expect(minDistanceToNetwork({ q: 0, r: 0 }, [])).toBe(Infinity)
  })

  it('is the minimum hex distance to any network cell', () => {
    const network = [
      { q: 0, r: 0 },
      { q: 5, r: 5 },
    ]
    expect(minDistanceToNetwork({ q: 1, r: 0 }, network)).toBe(1)
  })
})
