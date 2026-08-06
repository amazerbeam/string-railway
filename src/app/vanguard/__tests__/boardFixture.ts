import {
  VanguardCellKind,
  cellKey,
  type HexCoord,
  type VanguardBoard,
  type VanguardCell,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'

const token = (owner: PlayerSide, reinforced = 0): VanguardCell => ({
  kind: VanguardCellKind.Token,
  owner,
  reinforced,
})

const defense = (): VanguardCell => ({ kind: VanguardCellKind.Defense })

export const SMALL_SIZE = 5

/**
 * A 5x5 board. Player holds a connected cluster off {0,0}; the CPU holds one off
 * {4,4} with a single token at {2,1} adjacent to the player's network, so an
 * Overwrite target exists. {2,2} is a permanent defense.
 */
export function makeBoard(overrides: Partial<VanguardBoard> = {}): VanguardBoard {
  const cells: Record<string, VanguardCell | undefined> = {}

  for (const c of [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: 1 },
  ]) {
    cells[cellKey(c)] = token(PlayerSide.Player)
  }
  cells[cellKey({ q: 1, r: 1 })] = token(PlayerSide.Player, 1)

  for (const c of [
    { q: 4, r: 4 },
    { q: 3, r: 4 },
    { q: 2, r: 1 },
  ]) {
    cells[cellKey(c)] = token(PlayerSide.Cpu)
  }

  cells[cellKey({ q: 2, r: 2 })] = defense()

  return {
    size: SMALL_SIZE,
    bases: {
      [PlayerSide.Player]: { q: 0, r: 0 },
      [PlayerSide.Cpu]: { q: 4, r: 4 },
    },
    cells,
    ...overrides,
  }
}

export const coord = (q: number, r: number): HexCoord => ({ q, r })
export { token, defense }
