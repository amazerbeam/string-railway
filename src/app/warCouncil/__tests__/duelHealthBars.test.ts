import { describe, expect, it } from 'vitest'
import { DuelSide, PLAYER_START_HEALTH, quarryHealthForEncounter, type Health } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars'

const MAX: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}
const FULL: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}

describe('duelHealthBars — one view per side, player first', () => {
  it('returns the player then the Quarry, so the mirror’s order is not a caller’s choice', () => {
    const views = duelHealthBars(FULL, FULL, MAX)
    expect(views.map((v) => v.side)).toEqual([DuelSide.Player, DuelSide.Quarry])
  })
})

describe('duelHealthBars — DLR-80: damage has already landed, so current and projected agree', () => {
  it('reports the current total with nothing pending — the only shape this app ever calls it with', () => {
    const dented: Readonly<Record<DuelSide, Health>> = {
      [DuelSide.Player]: PLAYER_START_HEALTH - 4,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    }
    const [player] = duelHealthBars(dented, dented, MAX)
    expect(player.pending).toBe(0)
    expect(player.pendingPct).toBe(0)
    expect(player.secure).toBe(PLAYER_START_HEALTH - 4)
    expect(player.securePct).toBeCloseTo(
      ((PLAYER_START_HEALTH - 4) / PLAYER_START_HEALTH) * 100,
      10,
    )
  })

  it('is not lethal at zero health with nothing pending — that side is already dead', () => {
    const empty: Readonly<Record<DuelSide, Health>> = {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    }
    const [player] = duelHealthBars(empty, empty, MAX)
    expect(player.lethal).toBe(false)
  })
})

describe('duelHealthBars — the only divisor is guarded', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a max of %s rather than emitting a NaN width',
    (bad) => {
      const ten: Readonly<Record<DuelSide, Health>> = {
        [DuelSide.Player]: 10,
        [DuelSide.Quarry]: 10,
      }
      expect(() =>
        duelHealthBars(ten, ten, {
          [DuelSide.Player]: bad,
          [DuelSide.Quarry]: quarryHealthForEncounter(0),
        }),
      ).toThrow(RangeError)
    },
  )
})
