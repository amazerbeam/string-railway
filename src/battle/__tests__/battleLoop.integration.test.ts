import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { beginClash } from '../beginClash'
import { submitClashAction } from '../submitClashAction'
import { BattlePhase } from '../battlePhase'
import { autoPlayWarCouncilRound, scriptedClashAction, scriptedLocalAction } from './battleTestHelpers'
import { PlayerSide } from '../../warCouncil'
import { cellKey, ClashStatus, VanguardCellKind } from '../../vanguard'
import type { VanguardState } from '../../vanguard'
import type { BattleState } from '../battleState'

function seededRng(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function runBattleToResolution(seed: number) {
  const rng = seededRng(seed)
  let state: BattleState = startBattle(rng)
  const roundStartBoards: VanguardState[] = []

  while (state.phase !== BattlePhase.Resolved) {
    if (state.phase === BattlePhase.WarCouncilRound) {
      roundStartBoards.push(state.vanguard)
      state = autoPlayWarCouncilRound(state)
      continue
    }
    if (state.phase === BattlePhase.MusterConversion) {
      const result = beginClash(state)
      if (!result.ok) throw new Error(`beginClash rejected: ${result.reason}`)
      state = result.state
      continue
    }

    const clash = state.clash
    const side = clash.status === ClashStatus.InProgress ? clash.turn : PlayerSide.Player
    const action =
      side === PlayerSide.Player
        ? scriptedClashAction(clash.board, side, clash.muster[side])
        : scriptedLocalAction(clash.board, side, clash.muster[side])
    const result = submitClashAction(state, side, action, rng)
    if (!result.ok) throw new Error(`submitClashAction rejected: ${result.reason}`)
    state = result.state
  }

  return { state, roundStartBoards }
}

function claimedCellCount(board: VanguardState): number {
  return Object.values(board.cells).filter((cell) => cell?.kind === VanguardCellKind.Token).length
}

describe('battle loop integration', () => {
  it.each([1, 2])(
    'runs a full battle to a Breach with a persistent, ever-growing board (seed %i)',
    (seed) => {
      const { state, roundStartBoards } = runBattleToResolution(seed)

      expect(state.phase).toBe(BattlePhase.Resolved)
      if (state.phase !== BattlePhase.Resolved) throw new Error('expected Resolved')
      expect(state.winner).toBe(PlayerSide.Player)

      const loserBaseKey = cellKey(state.vanguard.bases[PlayerSide.Cpu])
      expect(state.vanguard.cells[loserBaseKey]).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 0,
      })

      expect(roundStartBoards.length).toBeGreaterThan(1)
      for (let i = 1; i < roundStartBoards.length; i++) {
        expect(claimedCellCount(roundStartBoards[i])).toBeGreaterThanOrEqual(
          claimedCellCount(roundStartBoards[i - 1]),
        )
      }
      expect(claimedCellCount(roundStartBoards[roundStartBoards.length - 1])).toBeGreaterThan(
        claimedCellCount(roundStartBoards[0]),
      )
    },
    20000,
  )
})
