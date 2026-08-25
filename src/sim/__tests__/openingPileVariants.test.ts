import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffKind,
  BuffRewardAxis,
  openingPileWeightOf,
  PLAYER_START_HEALTH,
  startRun,
  STARTING_BUFF_COUNT,
} from '../../hunt'
import {
  COINS_WEIGHT_FACTOR,
  conditionsOnlyOpeningWeightOf,
  EXCLUDED_OPENING_AXIS,
  EXCLUDED_OPENING_KINDS,
  OPENING_PILE_VARIANTS,
  recommendedOpeningWeightOf,
  SIDESTEP_WEIGHT_FACTOR,
  withOpeningPile,
} from '../openingPileVariants'

describe('conditionsOnlyOpeningWeightOf', () => {
  it('zeroes exactly the three excluded families and leaves every other weight untouched', () => {
    for (const template of BUFF_TEMPLATES) {
      const weight = conditionsOnlyOpeningWeightOf(template)
      if (EXCLUDED_OPENING_KINDS.has(template.kind)) {
        expect(weight).toBe(0)
      } else {
        expect(weight).toBe(openingPileWeightOf(template))
      }
    }
  })
})

describe('recommendedOpeningWeightOf', () => {
  it('zeroes the excluded families and the excluded axis', () => {
    for (const template of BUFF_TEMPLATES) {
      if (EXCLUDED_OPENING_KINDS.has(template.kind)) {
        expect(recommendedOpeningWeightOf(template)).toBe(0)
      }
      if (template.form === 'condition' && template.axis === EXCLUDED_OPENING_AXIS) {
        expect(recommendedOpeningWeightOf(template)).toBe(0)
      }
    }
  })

  it('scales coins down and sidestep up, relative to the production weighting', () => {
    const coinTemplate = BUFF_TEMPLATES.find(
      (t) =>
        t.form === 'condition' &&
        t.axis === BuffRewardAxis.Coins &&
        !EXCLUDED_OPENING_KINDS.has(t.kind) &&
        openingPileWeightOf(t) > 0,
    )
    if (coinTemplate === undefined) throw new Error('expected a weighted coins template')
    expect(recommendedOpeningWeightOf(coinTemplate)).toBeCloseTo(
      openingPileWeightOf(coinTemplate) * COINS_WEIGHT_FACTOR,
    )

    const sidestep = BUFF_TEMPLATES.find((t) => t.kind === BuffKind.Sidestep)
    if (sidestep === undefined) throw new Error('expected a sidestep template')
    expect(recommendedOpeningWeightOf(sidestep)).toBeCloseTo(
      openingPileWeightOf(sidestep) * SIDESTEP_WEIGHT_FACTOR,
    )
  })

  it('leaves the activated cards (cheat, timebomb) weighted — their 0% is a sim artefact', () => {
    for (const template of BUFF_TEMPLATES) {
      if (template.form !== 'activated') continue
      expect(recommendedOpeningWeightOf(template)).toBe(openingPileWeightOf(template))
    }
  })

  it('still leaves enough positively-weighted templates to fill an opening pile', () => {
    const usable = BUFF_TEMPLATES.filter((t) => recommendedOpeningWeightOf(t) > 0)
    expect(usable.length).toBeGreaterThan(STARTING_BUFF_COUNT)
  })
})

describe('withOpeningPile', () => {
  it('draws no excluded family into the opening pile, across many seeds', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const run = withOpeningPile(
        startRun(PLAYER_START_HEALTH, [], seed),
        recommendedOpeningWeightOf,
      )
      for (const buff of run.buffs.slice(0, STARTING_BUFF_COUNT)) {
        expect(EXCLUDED_OPENING_KINDS.has(buff.kind)).toBe(false)
        expect(buff.reward.axis).not.toBe(EXCLUDED_OPENING_AXIS)
      }
    }
  })

  it('replaces only the drawn pile — later members, ids and nextBuffId are untouched', () => {
    const started = startRun(PLAYER_START_HEALTH, [], 7)
    const varied = withOpeningPile(started, recommendedOpeningWeightOf)

    expect(varied.buffs.length).toBe(started.buffs.length)
    expect(varied.nextBuffId).toBe(started.nextBuffId)
    // The opening Cheat (RUN_STARTING_CHEATS) sits past the drawn pile and must survive verbatim.
    expect(varied.buffs.slice(STARTING_BUFF_COUNT)).toEqual(
      started.buffs.slice(STARTING_BUFF_COUNT),
    )
    expect(varied.buffs.map((b) => b.id)).toEqual(started.buffs.map((b) => b.id))
  })

  it('is deterministic — the same seed and weighting give the identical pile', () => {
    const first = withOpeningPile(startRun(PLAYER_START_HEALTH, [], 11), recommendedOpeningWeightOf)
    const second = withOpeningPile(startRun(PLAYER_START_HEALTH, [], 11), recommendedOpeningWeightOf)
    expect(second.buffs).toStrictEqual(first.buffs)
  })
})

describe('OPENING_PILE_VARIANTS', () => {
  it('holds exactly the two named variants, and no identity "baseline" entry', () => {
    expect(Object.keys(OPENING_PILE_VARIANTS).sort()).toEqual(['conditionsOnly', 'recommended'])
  })
})
