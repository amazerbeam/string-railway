import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import { playCpuWarCouncilTurn } from '../playCpuWarCouncilTurn'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { AbilityChoiceKind, CardRank, currentTurn, legalMoves, PlayerSide } from '../../warCouncil'
import type { AbilityChoice } from '../../warCouncil'
import type { BattleState } from '../battleState'

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// A fixed, non-adaptive single-turn helper — the same shape as
// battleTestHelpers.ts's autoPlayWarCouncilRound, scoped to one turn so this
// file can interleave it with playCpuWarCouncilTurn. Not CPU decision-making.
function submitFirstLegalCard(state: BattleState, side: PlayerSide): BattleState {
  if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
  const card = legalMoves(state.warCouncil, side)[0]
  const choice: AbilityChoice | undefined =
    card.rank === CardRank.Fox
      ? { kind: AbilityChoiceKind.FoxDecline }
      : card.rank === CardRank.Woodcutter
        ? { kind: AbilityChoiceKind.WoodcutterDiscard, discard: state.warCouncil.drawPile[0] }
        : undefined
  const result = submitWarCouncilCard(state, side, card, choice)
  if (!result.ok) throw new Error(`setup move rejected: ${result.reason}`)
  return result.state
}

describe('playCpuWarCouncilTurn — rejections', () => {
  it('rejects when the battle is not in the WarCouncilRound phase', () => {
    const opened = startBattle(lcg(1))
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: opened.vanguard,
      winner: PlayerSide.Player,
    }
    const result = playCpuWarCouncilTurn(resolved)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotWarCouncilPhase })
  })

  it("rejects when it is not the CPU's turn", () => {
    const opened = startBattle(lcg(2))
    expect(currentTurn(opened.warCouncil)).toBe(PlayerSide.Cpu)
    const afterCpuLead = submitFirstLegalCard(opened, PlayerSide.Cpu)
    if (afterCpuLead.phase !== BattlePhase.WarCouncilRound)
      throw new Error('expected WarCouncilRound')
    expect(currentTurn(afterCpuLead.warCouncil)).toBe(PlayerSide.Player)

    const result = playCpuWarCouncilTurn(afterCpuLead)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotCpuTurn })
  })
})

describe('playCpuWarCouncilTurn — plays a legal CPU move', () => {
  it('submits a move accepted by submitWarCouncilCard and advances the round', () => {
    const state = startBattle(lcg(3))
    expect(currentTurn(state.warCouncil)).toBe(PlayerSide.Cpu)

    const result = playCpuWarCouncilTurn(state)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    if (result.state.phase !== BattlePhase.WarCouncilRound)
      throw new Error('expected WarCouncilRound')
    expect(result.state.warCouncil.currentTrick.length).toBe(1)
  })
})

describe('playCpuWarCouncilTurn — drives a full round to MusterConversion', () => {
  it('completes 13 tricks alternating playCpuWarCouncilTurn (cpu) with a fixed script (player)', () => {
    let state: BattleState = startBattle(lcg(4))
    let guard = 0

    while (state.phase === BattlePhase.WarCouncilRound) {
      guard += 1
      if (guard > 100) throw new Error('runaway loop — round never completed')

      if (currentTurn(state.warCouncil) === PlayerSide.Cpu) {
        const result = playCpuWarCouncilTurn(state)
        if (!result.ok) throw new Error(`cpu turn rejected: ${result.reason}`)
        state = result.state
      } else {
        state = submitFirstLegalCard(state, PlayerSide.Player)
      }
    }

    expect(state.phase).toBe(BattlePhase.MusterConversion)
  })
})
