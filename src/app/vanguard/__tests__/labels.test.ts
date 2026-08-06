import { describe, expect, it } from 'vitest'
import {
  ClashRejectionReason,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { ACTION_NAME, cellAccessibleName, REJECTION_MESSAGE } from '../labels'

const BASES = {
  [PlayerSide.Player]: { q: 0, r: 0 },
  [PlayerSide.Cpu]: { q: 10, r: 10 },
}

describe('cellAccessibleName', () => {
  it('names an empty cell by coordinate', () => {
    expect(cellAccessibleName({ q: 2, r: 7 }, undefined, BASES)).toBe('Cell 2, 7 — empty')
  })

  it('names the player base and its token together', () => {
    expect(
      cellAccessibleName(
        { q: 0, r: 0 },
        { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        BASES,
      ),
    ).toBe('Cell 0, 0 — your base, your token')
  })

  it('names a reinforced enemy token', () => {
    expect(
      cellAccessibleName(
        { q: 3, r: 4 },
        { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
        BASES,
      ),
    ).toBe('Cell 3, 4 — their token, reinforced')
  })

  it('names a defense cell', () => {
    expect(cellAccessibleName({ q: 5, r: 5 }, { kind: VanguardCellKind.Defense }, BASES)).toBe(
      'Cell 5, 5 — permanent defense',
    )
  })

  it('names an empty enemy base cell', () => {
    expect(cellAccessibleName({ q: 10, r: 10 }, undefined, BASES)).toBe(
      'Cell 10, 10 — their base, empty',
    )
  })
})

describe('the label maps', () => {
  it('names every action kind', () => {
    for (const kind of Object.values(VanguardActionKind)) expect(ACTION_NAME[kind]).toBeTruthy()
  })

  it('carries copy for every reason from both rejection unions', () => {
    for (const reason of Object.values(IllegalActionReason)) {
      expect(REJECTION_MESSAGE[reason]).toBeTruthy()
    }
    for (const reason of Object.values(ClashRejectionReason)) {
      expect(REJECTION_MESSAGE[reason]).toBeTruthy()
    }
  })
})
