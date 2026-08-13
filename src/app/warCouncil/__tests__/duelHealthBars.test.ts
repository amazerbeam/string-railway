import { describe, expect, it } from 'vitest'
import { DuelSide, type Health } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars'

const MAX: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: 1350,
  [DuelSide.Quarry]: 1350,
}

describe('duelHealthBars — one view per side, player first', () => {
  it('returns the player then the Quarry, so the mirror’s order is not a caller’s choice', () => {
    const views = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(views.map((v) => v.side)).toEqual([DuelSide.Player, DuelSide.Quarry])
  })
})

describe('duelHealthBars — pending is carved out of current health', () => {
  it('secure and pending sum to exactly current health as a percentage of max', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 1062, [DuelSide.Quarry]: 810 },
      { [DuelSide.Player]: 966, [DuelSide.Quarry]: 270 },
      MAX,
    )
    expect(player.pending).toBe(96)
    expect(player.securePct + player.pendingPct).toBeCloseTo((1062 / 1350) * 100, 10)
  })

  it('shrinks the pending segment when a tenth trick collapses the band (540 → 60)', () => {
    const atPeak = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 810 },
      MAX,
    )[1]
    const pastCliff = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1290 },
      MAX,
    )[1]
    expect(atPeak.pending).toBe(540)
    expect(pastCliff.pending).toBe(60)
    expect(pastCliff.pendingPct).toBeLessThan(atPeak.pendingPct)
  })

  it('reports no pending at all before a declaration, rather than a zero-width segment lie', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.pending).toBe(0)
    expect(player.pendingPct).toBe(0)
    expect(player.securePct).toBe(100)
  })
})

describe('duelHealthBars — lethal is a state of the bar, not a colour', () => {
  it('marks a side lethal when the pending damage empties it', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 96, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.lethal).toBe(true)
    expect(player.pendingPct).toBeCloseTo((96 / 1350) * 100, 10)
  })

  it('is not lethal at zero health with nothing pending — that side is already dead', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.lethal).toBe(false)
  })
})

describe('duelHealthBars — the only divisor is guarded', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a max of %s rather than emitting a NaN width',
    (bad) => {
      expect(() =>
        duelHealthBars(
          { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
          { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
          { [DuelSide.Player]: bad, [DuelSide.Quarry]: 1350 },
        ),
      ).toThrow(RangeError)
    },
  )
})
