import { describe, expect, it } from 'vitest'
import { RunPhase, screenFor } from '../screenFor'

describe('screenFor', () => {
  it('reports start when the phase is Start, even with an over encounter', () => {
    // Start wins over an over encounter — the ternary's ordering makes this easy to get wrong.
    expect(screenFor(RunPhase.Start, true)).toBe('start')
  })

  it('reports warCouncil when the encounter is unresolved, regardless of phase', () => {
    // An unresolved encounter wins over every non-Start phase.
    expect(screenFor(RunPhase.Map, false)).toBe('warCouncil')
  })

  it('reports map when the phase is Map and the encounter is over', () => {
    expect(screenFor(RunPhase.Map, true)).toBe('map')
  })

  it('reports shop when the phase is Shop and the encounter is over', () => {
    expect(screenFor(RunPhase.Shop, true)).toBe('shop')
  })

  it('reports vault when the phase is Vault and the encounter is over', () => {
    expect(screenFor(RunPhase.Vault, true)).toBe('vault')
  })

  it('reports verdict when the phase is Verdict and the encounter is over', () => {
    expect(screenFor(RunPhase.Verdict, true)).toBe('verdict')
  })

  it('reports verdict when the phase is Warned and the encounter is over', () => {
    expect(screenFor(RunPhase.Warned, true)).toBe('verdict')
  })

  it('shows the Manage Buffs screen only once the encounter is over', () => {
    expect(screenFor(RunPhase.ManageBuffs, true)).toBe('manageBuffs')
    expect(screenFor(RunPhase.ManageBuffs, false)).toBe('warCouncil')
  })
})
