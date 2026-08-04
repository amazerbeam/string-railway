import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { hasReachedBreach } from '../breach'
import { VanguardCellKind } from '../types'
import { boardWith } from './testBoard'

const BREACH_BOARD_OVERRIDES = {
  size: 3,
  bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 2, r: 0 } },
}

describe('hasReachedBreach', () => {
  it('returns false when no chain exists', () => {
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      },
      BREACH_BOARD_OVERRIDES
    )
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })

  it('returns true when a solid chain connects the two bases', () => {
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      },
      BREACH_BOARD_OVERRIDES
    )
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(true)
  })

  it('returns false when the chain has a single gap cell (regression for the Expand gap rule)', () => {
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      },
      BREACH_BOARD_OVERRIDES
    )
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })

  it('returns false when only the opponent holds a solid chain', () => {
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
      BREACH_BOARD_OVERRIDES
    )
    expect(hasReachedBreach(board, PlayerSide.Cpu)).toBe(true)
    expect(hasReachedBreach(board, PlayerSide.Player)).toBe(false)
  })
})
