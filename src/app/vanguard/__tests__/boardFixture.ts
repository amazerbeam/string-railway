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
 * {4,4} with a single outpost token at {1,2}, adjacent to the player's reinforced
 * token at {1,1} — an Overwrite target for the player once it's their turn.
 *
 * {1,2} is deliberately NOT {2,1} (an earlier position): SCRUM-40 broadened
 * Expand/Overwrite legality to key off `ownedCells` rather than
 * `connectedNetwork`, and round 1 opens with the CPU (`CLASH_FIRST_ROUND_OPENER`).
 * A token merely adjacent to the player's network would let the CPU's own
 * opening-move heuristic Overwrite it before the player ever acts, which would
 * flip {1,1} to CPU ownership and orphan the intended Overwrite target. {1,2}
 * avoids this: {1,2}'s own empty neighbour {0,2} ties the Overwrite-of-{1,1}
 * candidate on both tier (adjacent to a CPU cell) and distance-to-the-player's-
 * base (2 hexes either way), and `chooseCpuClashAction`'s tie-break (`cellKey`
 * ascending — `"0,2"` sorts before `"1,1"`) picks the Expand into {0,2} instead
 * — which is itself distance 2 from both {0,0} (the base) and {2,0} (the
 * fixture's other Expand-test target), so it creates no fresh threat on a later
 * turn either. This leaves the player's cluster and the {1,2} outpost untouched
 * until the player taps. {2,2} is a permanent defense.
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
    { q: 1, r: 2 },
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
