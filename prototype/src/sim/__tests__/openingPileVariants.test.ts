import { describe, expect, it } from 'vitest'
import { openingPileWeightOf, PLAYER_START_HEALTH, startRun, STARTING_BUFF_COUNT } from '../../hunt'
import { OPENING_PILE_VARIANTS, withOpeningPile } from '../openingPileVariants'

describe('withOpeningPile', () => {
  it('replaces only the drawn pile — later members, ids and nextBuffId are untouched', () => {
    const started = startRun(PLAYER_START_HEALTH, [], 7)
    const varied = withOpeningPile(started, openingPileWeightOf)

    expect(varied.buffs.length).toBe(started.buffs.length)
    expect(varied.nextBuffId).toBe(started.nextBuffId)
    // The opening Cheat (RUN_STARTING_CHEATS) sits past the drawn pile and must survive verbatim.
    expect(varied.buffs.slice(STARTING_BUFF_COUNT)).toEqual(
      started.buffs.slice(STARTING_BUFF_COUNT),
    )
    expect(varied.buffs.map((b) => b.id)).toEqual(started.buffs.map((b) => b.id))
  })

  it('is deterministic — the same seed and weighting give the identical pile', () => {
    const first = withOpeningPile(startRun(PLAYER_START_HEALTH, [], 11), openingPileWeightOf)
    const second = withOpeningPile(startRun(PLAYER_START_HEALTH, [], 11), openingPileWeightOf)
    expect(second.buffs).toStrictEqual(first.buffs)
  })

  it('draws STARTING_BUFF_COUNT cards into the opening pile', () => {
    const run = withOpeningPile(startRun(PLAYER_START_HEALTH, [], 13), openingPileWeightOf)
    expect(run.buffs.slice(0, STARTING_BUFF_COUNT)).toHaveLength(STARTING_BUFF_COUNT)
  })
})

describe('OPENING_PILE_VARIANTS', () => {
  it('holds no named variant — DLR-145 superseded both, see openingPileVariants.ts', () => {
    expect(Object.keys(OPENING_PILE_VARIANTS)).toEqual([])
  })
})
