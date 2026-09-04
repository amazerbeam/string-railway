import { describe, expect, it } from 'vitest'
import { DuelSide, PLAYER_START_HEALTH, quarryHealthForEncounter, type Health } from '../../../hunt'
import { duelHealthBars, HeartState, NO_BREAKING, projectedDepletion } from '../duelHealthBars'

const MAX: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}
const FULL: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}

function at(side: DuelSide, current: Health, breaking = 0) {
  const health = {
    [DuelSide.Player]: PLAYER_START_HEALTH,
    [DuelSide.Quarry]: quarryHealthForEncounter(0),
    ...{ [side]: current },
  }
  const views = duelHealthBars(health, health, MAX, {
    breaking: { ...NO_BREAKING, [side]: breaking },
  })
  return views.find((v) => v.side === side)!
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
    expect(player.secure).toBe(PLAYER_START_HEALTH - 4)
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

describe('duelHealthBars — max is an array length now, and it is guarded', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2.5])(
    'refuses a max of %s rather than emitting a wrong-length heart row',
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

describe('duelHealthBars — one heart per health point, counted from max', () => {
  it('returns exactly `max` hearts however dented the side is', () => {
    expect(at(DuelSide.Player, PLAYER_START_HEALTH).hearts).toHaveLength(PLAYER_START_HEALTH)
    expect(at(DuelSide.Player, 0).hearts).toHaveLength(PLAYER_START_HEALTH)
    expect(at(DuelSide.Quarry, 3).hearts).toHaveLength(quarryHealthForEncounter(0))
  })

  it('is all whole at full health with nothing banked and nothing breaking', () => {
    expect(
      at(DuelSide.Player, PLAYER_START_HEALTH).hearts.every((h) => h === HeartState.Whole),
    ).toBe(true)
  })

  it('paints the hearts past current as broken, in order, from the anchored edge inward', () => {
    const hearts = at(DuelSide.Player, PLAYER_START_HEALTH - 3).hearts
    expect(hearts.slice(0, PLAYER_START_HEALTH - 3).every((h) => h === HeartState.Whole)).toBe(true)
    expect(hearts.slice(PLAYER_START_HEALTH - 3).every((h) => h === HeartState.Broken)).toBe(true)
  })

  it('paints exactly the hearts this event took as breaking, sitting between whole and broken', () => {
    // 3 already gone, 2 breaking now: 5 whole, 2 breaking, 3 broken.
    const hearts = at(DuelSide.Player, PLAYER_START_HEALTH - 5, 2).hearts
    expect(hearts.filter((h) => h === HeartState.Whole)).toHaveLength(PLAYER_START_HEALTH - 5)
    expect(hearts.filter((h) => h === HeartState.Breaking)).toHaveLength(2)
    expect(hearts.filter((h) => h === HeartState.Broken)).toHaveLength(3)
    expect(hearts[PLAYER_START_HEALTH - 5]).toBe(HeartState.Breaking)
  })

  it('discards surplus damage against the row’s own length rather than clamping a second time', () => {
    const quarryMax = quarryHealthForEncounter(0)
    const hearts = at(DuelSide.Quarry, 0, quarryMax + 6).hearts
    expect(hearts).toHaveLength(quarryMax)
    expect(hearts.every((h) => h === HeartState.Breaking)).toBe(true)
  })
})

describe('projectedDepletion — AC3’s preview', () => {
  const quarryMax = quarryHealthForEncounter(0)
  const full = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }

  it('leaves the player untouched — the streak only ever threatens the Quarry', () => {
    expect(projectedDepletion(full, 3, 3)[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('takes bank × multiplier off the Quarry’s projection', () => {
    expect(projectedDepletion(full, 2, 2)[DuelSide.Quarry]).toBe(quarryMax - 4)
  })

  it('floors at zero so the module’s projected <= current precondition holds under overkill', () => {
    expect(projectedDepletion(full, 9, 9)[DuelSide.Quarry]).toBe(0)
  })

  it('AC5 — a reset streak previews nothing at all', () => {
    expect(projectedDepletion(full, 0, 0)[DuelSide.Quarry]).toBe(quarryMax)
    const [, quarry] = duelHealthBars(full, projectedDepletion(full, 0, 0), MAX)
    expect(quarry.pending).toBe(0)
    expect(quarry.hearts.some((h) => h === HeartState.AtRisk)).toBe(false)
  })

  it('AC3 — a live streak marks that many of the Quarry’s hearts at risk, and no more', () => {
    const projected = projectedDepletion(full, 3, 3)
    const [, quarry] = duelHealthBars(full, projected, MAX)
    expect(quarry.hearts.filter((h) => h === HeartState.AtRisk)).toHaveLength(
      Math.min(9, quarryMax),
    )
    expect(quarry.lethal).toBe(9 >= quarryMax)
  })
})

describe('duelHealthBars — the shield cluster (DLR-115)', () => {
  const quarryMax = quarryHealthForEncounter(0)
  const full = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }

  it('gives the Quarry no shield, always — shield is a player-only overlay', () => {
    const [, quarry] = duelHealthBars(full, full, MAX, { shield: 5 })
    expect(quarry.shielded).toBe(0)
    expect(quarry.shieldPips).toEqual([])
  })

  it('draws two whole shield pips for a player shield of 2', () => {
    const [player] = duelHealthBars(full, full, MAX, { shield: 2 })
    expect(player.shielded).toBe(2)
    expect(player.shieldPips).toEqual([HeartState.Whole, HeartState.Whole])
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a shield of %s rather than drawing a wrong-length cluster',
    (bad) => {
      expect(() => duelHealthBars(full, full, MAX, { shield: bad })).toThrow(RangeError)
    },
  )
})
