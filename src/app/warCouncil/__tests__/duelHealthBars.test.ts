import { describe, expect, it } from 'vitest'
import {
  DuelSide,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  NO_PENDING_TIMEBOMB,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  type Health,
} from '../../../hunt'
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
  const health = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryHealthForEncounter(0), ...{ [side]: current } }
  const views = duelHealthBars(health, health, MAX, { breaking: { ...NO_BREAKING, [side]: breaking } })
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
    expect(at(DuelSide.Player, PLAYER_START_HEALTH).hearts.every((h) => h === HeartState.Whole)).toBe(true)
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

describe('projectedDepletion — AC3’s preview plus DLR-101’s booked poison', () => {
  const quarryMax = quarryHealthForEncounter(0)
  const full = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }

  it('leaves the player untouched — the streak only ever threatens the Quarry', () => {
    expect(projectedDepletion(full, 3, 3, NO_PENDING_TIMEBOMB)[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('takes bank × multiplier off the Quarry’s projection', () => {
    expect(projectedDepletion(full, 2, 2, NO_PENDING_TIMEBOMB)[DuelSide.Quarry]).toBe(quarryMax - 4)
  })

  it('floors at zero so the module’s projected <= current precondition holds under overkill', () => {
    expect(projectedDepletion(full, 9, 9, NO_PENDING_TIMEBOMB)[DuelSide.Quarry]).toBe(0)
  })

  it('AC5 — a reset streak previews nothing at all', () => {
    expect(projectedDepletion(full, 0, 0, NO_PENDING_TIMEBOMB)[DuelSide.Quarry]).toBe(quarryMax)
    const [, quarry] = duelHealthBars(full, projectedDepletion(full, 0, 0, NO_PENDING_TIMEBOMB), MAX)
    expect(quarry.pending).toBe(0)
    expect(quarry.hearts.some((h) => h === HeartState.AtRisk)).toBe(false)
  })

  it('AC3 — a live streak marks that many of the Quarry’s hearts at risk, and no more', () => {
    const projected = projectedDepletion(full, 3, 3, NO_PENDING_TIMEBOMB)
    const [, quarry] = duelHealthBars(full, projected, MAX)
    expect(quarry.hearts.filter((h) => h === HeartState.AtRisk)).toHaveLength(Math.min(9, quarryMax))
    expect(quarry.lethal).toBe(9 >= quarryMax)
  })
})

describe('DLR-101 — booked poison on the projection and the row', () => {
  const quarryMax = quarryHealthForEncounter(0)
  const full = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }

  it('subtracts the Quarry’s booked poison as well as the streak', () => {
    const projected = projectedDepletion(full, 2, 2, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: TIMEBOMB_QUARRY_DAMAGE,
    })
    expect(projected[DuelSide.Quarry]).toBe(quarryMax - 4 - TIMEBOMB_QUARRY_DAMAGE)
  })

  it('subtracts the player’s booked poison, which the streak never touches', () => {
    const projected = projectedDepletion(full, 3, 3, {
      [DuelSide.Player]: TIMEBOMB_PLAYER_DAMAGE,
      [DuelSide.Quarry]: 0,
    })
    expect(projected[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
  })

  it('floors both sides at zero, so `projected <= current` still holds', () => {
    const projected = projectedDepletion(full, 99, 99, {
      [DuelSide.Player]: 999,
      [DuelSide.Quarry]: 999,
    })
    expect(projected[DuelSide.Player]).toBe(0)
    expect(projected[DuelSide.Quarry]).toBe(0)
  })

  it('marks the innermost standing hearts `doomed`, with at-risk outside them', () => {
    const current = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 3 }
    const [, quarry] = duelHealthBars(current, projected, MAX, {
      doomed: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 4 },
    })
    expect(quarry.doomed).toBe(4)
    expect(quarry.pending).toBe(7)
    expect(quarry.hearts.slice(0, 3)).toEqual([
      HeartState.Whole,
      HeartState.Whole,
      HeartState.Whole,
    ])
    expect(quarry.hearts.slice(3, 6)).toEqual([
      HeartState.AtRisk,
      HeartState.AtRisk,
      HeartState.AtRisk,
    ])
    expect(quarry.hearts.slice(6, 10)).toEqual([
      HeartState.Doomed,
      HeartState.Doomed,
      HeartState.Doomed,
      HeartState.Doomed,
    ])
  })

  it('clamps `doomed` to the pending band, so overkill leaves no trace', () => {
    const current = { [DuelSide.Player]: 2, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 0, [DuelSide.Quarry]: 10 }
    const [player] = duelHealthBars(current, projected, MAX, {
      doomed: { [DuelSide.Player]: 99, [DuelSide.Quarry]: 0 },
    })
    expect(player.doomed).toBe(2)
    expect(player.hearts.filter((s) => s === HeartState.Doomed)).toHaveLength(2)
    expect(player.lethal).toBe(true)
  })

  it('is byte-identical to the pre-DLR-101 row when nothing is booked', () => {
    const current = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 7 }
    const [, withOverlay] = duelHealthBars(current, projected, MAX, {})
    const [, withNone] = duelHealthBars(current, projected, MAX)
    expect(withOverlay.hearts).toEqual(withNone.hearts)
    expect(withNone.doomed).toBe(0)
  })
})
