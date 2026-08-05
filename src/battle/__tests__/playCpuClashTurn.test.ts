import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { beginClash } from '../beginClash'
import { playCpuClashTurn } from '../playCpuClashTurn'
import { submitClashAction } from '../submitClashAction'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { autoPlayWarCouncilRound } from './battleTestHelpers'
import { chooseCpuClashAction, ClashStatus } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'
import type { BattleState } from '../battleState'

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function reachClash(seed: number): BattleState {
  const afterWarCouncil = autoPlayWarCouncilRound(startBattle(lcg(seed)))
  const result = beginClash(afterWarCouncil)
  if (!result.ok) throw new Error(`beginClash rejected: ${result.reason}`)
  return result.state
}

describe('playCpuClashTurn — rejections', () => {
  it('rejects when the battle is not in the Clash phase', () => {
    const opened = startBattle(lcg(1))
    const result = playCpuClashTurn(opened, lcg(1))
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotClashPhase })
  })

  it("rejects when it is not the CPU's turn", () => {
    const state = reachClash(2)
    if (state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    if (state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    // Deterministic, not seed-dependent: round 1's Clash always opens with
    // openingSideForRound(1) === CLASH_FIRST_ROUND_OPENER === PlayerSide.Cpu.
    expect(state.clash.turn).toBe(PlayerSide.Cpu)

    // Advance one turn with the function under test itself, which flips the
    // turn to Player (both sides still have Muster left after one action).
    const afterCpuTurn = playCpuClashTurn(state, lcg(2))
    if (!afterCpuTurn.ok) throw new Error(`setup move rejected: ${afterCpuTurn.reason}`)
    if (afterCpuTurn.state.phase !== BattlePhase.Clash) throw new Error('expected still Clash')
    if (afterCpuTurn.state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(afterCpuTurn.state.clash.turn).toBe(PlayerSide.Player)

    const result = playCpuClashTurn(afterCpuTurn.state, lcg(2))
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotCpuTurn })
  })
})

describe('playCpuClashTurn — plays a legal CPU action', () => {
  it("submits an action accepted by submitClashAction on the CPU's turn", () => {
    const state = reachClash(3)
    if (state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    if (state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(state.clash.turn).toBe(PlayerSide.Cpu) // deterministic, see rejection test above

    const result = playCpuClashTurn(state, lcg(3))
    expect(result.ok).toBe(true)
  })
})

describe('playCpuClashTurn — drives a full Clash phase forward across several seeds', () => {
  // playCpuClashTurn only ever acts on the CPU's turn (see the rejection tests
  // above), so driving the Clash phase to completion needs a Player-turn move
  // too. The Player's turn is submitted directly through submitClashAction,
  // using the same side-agnostic chooseCpuClashAction heuristic — this is a
  // test-only driver, not a second production entry point.
  it.each([4, 5, 6])('completes several turns with both sides advancing (seed %i)', (seed) => {
    let state = reachClash(seed)
    let guard = 0

    while (state.phase === BattlePhase.Clash) {
      guard += 1
      if (guard > 200) throw new Error('runaway loop — clash never resolved')
      if (state.clash.status !== ClashStatus.InProgress) break

      const result =
        state.clash.turn === PlayerSide.Cpu
          ? playCpuClashTurn(state, lcg(seed))
          : submitClashAction(
              state,
              PlayerSide.Player,
              chooseCpuClashAction(state.clash.board, PlayerSide.Player, state.clash.muster[PlayerSide.Player]),
              lcg(seed),
            )
      if (!result.ok) throw new Error(`clash turn rejected: ${result.reason}`)
      state = result.state
      if (state.phase !== BattlePhase.Clash) break
    }

    expect(state.phase === BattlePhase.Resolved || state.phase === BattlePhase.WarCouncilRound).toBe(true)
  })
})
