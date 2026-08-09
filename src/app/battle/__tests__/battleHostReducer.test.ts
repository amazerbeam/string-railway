import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import type { WarCouncilState } from '../../../warCouncil'
import type { VanguardState } from '../../../vanguard'
import {
  BattleHostActionKind,
  battleHostReducer,
  createBattleHostUiState,
} from '../battleHostReducer'

const FAKE_DEALT = { tricksWon: { player: 0, cpu: 0 } } as unknown as WarCouncilState

describe('battleHostReducer', () => {
  it('starts in the vanguard state at round 0', () => {
    expect(createBattleHostUiState()).toEqual({ kind: 'vanguard', round: 0 })
  })

  it('RoundRequested moves to warCouncilRound, carrying round/dealer/dealt', () => {
    const next = battleHostReducer(createBattleHostUiState(), {
      kind: BattleHostActionKind.RoundRequested,
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
    expect(next).toEqual({
      kind: 'warCouncilRound',
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
  })

  it('RoundComplete moves warCouncilRound to roundTransition with computed score and muster', () => {
    const inRound = battleHostReducer(createBattleHostUiState(), {
      kind: BattleHostActionKind.RoundRequested,
      round: 1,
      dealer: PlayerSide.Player,
      dealt: FAKE_DEALT,
    })
    const next = battleHostReducer(inRound, {
      kind: BattleHostActionKind.RoundComplete,
      result: {
        finalState: { tricksWon: { player: 9, cpu: 4 } } as unknown as WarCouncilState,
        score: { player: 6, cpu: 1 },
      },
    })
    expect(next).toEqual({
      kind: 'roundTransition',
      round: 1,
      dealer: PlayerSide.Player,
      tricksWon: { player: 9, cpu: 4 },
      score: { player: 6, cpu: 1 },
      muster: { player: 10, cpu: 7 },
    })
  })

  it('RoundComplete is a no-op outside warCouncilRound', () => {
    const state = createBattleHostUiState()
    const next = battleHostReducer(state, {
      kind: BattleHostActionKind.RoundComplete,
      result: { finalState: FAKE_DEALT, score: { player: 0, cpu: 0 } },
    })
    expect(next).toBe(state)
  })

  it('ContinueToClash moves roundTransition back to vanguard, keeping the round number', () => {
    const inTransition = {
      kind: 'roundTransition' as const,
      round: 2,
      dealer: PlayerSide.Cpu,
      tricksWon: { player: 3, cpu: 10 },
      score: { player: 6, cpu: 0 },
      muster: { player: 10, cpu: 7 },
    }
    const next = battleHostReducer(inTransition, { kind: BattleHostActionKind.ContinueToClash })
    expect(next).toEqual({ kind: 'vanguard', round: 2 })
  })

  it('BattleResolved moves vanguard to battleOver with the winner', () => {
    const inVanguard = { kind: 'vanguard' as const, round: 3 }
    const next = battleHostReducer(inVanguard, {
      kind: BattleHostActionKind.BattleResolved,
      result: { finalState: {} as VanguardState, winner: PlayerSide.Cpu },
    })
    expect(next).toEqual({ kind: 'battleOver', round: 3, winner: PlayerSide.Cpu })
  })

  it('BattleResolved is a no-op outside vanguard', () => {
    const state = { kind: 'battleOver' as const, round: 3, winner: PlayerSide.Player }
    const next = battleHostReducer(state, {
      kind: BattleHostActionKind.BattleResolved,
      result: { finalState: {} as VanguardState, winner: PlayerSide.Cpu },
    })
    expect(next).toBe(state)
  })
})
