import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES } from '../../hunt/buffTemplates'
import { createSeededRng } from '../../hunt/seededRng'
import { drawReelPool } from '../../hunt/slotMachine'
import { SlotMachineId } from '../../hunt/slotConfig'
import { templateWeightFor } from '../../hunt/slotWeights'
import { VAULT_ODDS_BOOST_MAX_STACKS, VAULT_ODDS_BOOST_STEP } from '../vaultConfig'
import { EMPTY_VAULT, type VaultState } from '../vaultState'
import { boostMultiplierFor, drawVaultReelPool, vaultReelWeightFor } from '../vaultOdds'

const KNOWN_TEMPLATE_ID = BUFF_TEMPLATES[0].id
const MACHINE_ID = SlotMachineId.Skirmisher

describe('boostMultiplierFor', () => {
  it('returns 1 for an unboosted template', () => {
    expect(boostMultiplierFor(EMPTY_VAULT, KNOWN_TEMPLATE_ID)).toBe(1)
  })

  it('returns 1 for an unknown template', () => {
    expect(boostMultiplierFor(EMPTY_VAULT, 'nope:nope')).toBe(1)
  })

  it.each([1, 2, VAULT_ODDS_BOOST_MAX_STACKS])(
    'returns 1 + STEP * stacks for %i stacks',
    (stacks) => {
      const vault: VaultState = { ...EMPTY_VAULT, oddsBoosts: { [KNOWN_TEMPLATE_ID]: stacks } }
      expect(boostMultiplierFor(vault, KNOWN_TEMPLATE_ID)).toBe(1 + VAULT_ODDS_BOOST_STEP * stacks)
    },
  )

  it('clamps at the cap', () => {
    const vault: VaultState = {
      ...EMPTY_VAULT,
      oddsBoosts: { [KNOWN_TEMPLATE_ID]: VAULT_ODDS_BOOST_MAX_STACKS + 5 },
    }
    expect(boostMultiplierFor(vault, KNOWN_TEMPLATE_ID)).toBe(
      1 + VAULT_ODDS_BOOST_STEP * VAULT_ODDS_BOOST_MAX_STACKS,
    )
  })
})

describe('vaultReelWeightFor', () => {
  it('returns exactly templateWeightFor for every template on the empty vault', () => {
    const weightOf = vaultReelWeightFor(EMPTY_VAULT, MACHINE_ID)
    for (const template of BUFF_TEMPLATES) {
      expect(weightOf(template)).toBe(templateWeightFor(MACHINE_ID, template))
    }
  })

  it('multiplies a boosted template weight by its multiplier', () => {
    const vault: VaultState = { ...EMPTY_VAULT, oddsBoosts: { [KNOWN_TEMPLATE_ID]: 2 } }
    const weightOf = vaultReelWeightFor(vault, MACHINE_ID)
    const template = BUFF_TEMPLATES.find((t) => t.id === KNOWN_TEMPLATE_ID)!
    expect(weightOf(template)).toBeCloseTo(
      templateWeightFor(MACHINE_ID, template) * (1 + VAULT_ODDS_BOOST_STEP * 2),
    )
  })
})

describe('drawVaultReelPool', () => {
  it('produces the identical strip to drawReelPool for several seeds on the empty vault', () => {
    for (const seed of [1, 2, 3, 42, 1000]) {
      const vaultMachine = drawVaultReelPool(EMPTY_VAULT, MACHINE_ID, createSeededRng(seed))
      const plainMachine = drawReelPool(MACHINE_ID, createSeededRng(seed))
      expect(vaultMachine.reel.map((t) => t.id)).toEqual(plainMachine.reel.map((t) => t.id))
    }
  })

  it('is deterministic for a fixed seed', () => {
    const a = drawVaultReelPool(EMPTY_VAULT, MACHINE_ID, createSeededRng(7))
    const b = drawVaultReelPool(EMPTY_VAULT, MACHINE_ID, createSeededRng(7))
    expect(a.reel.map((t) => t.id)).toEqual(b.reel.map((t) => t.id))
  })

  it('a heavily boosted template appears on the strip strictly more often than unboosted, across a sweep of seeds', () => {
    const boostedId = KNOWN_TEMPLATE_ID
    const unboostedId = BUFF_TEMPLATES[1].id
    const vault: VaultState = {
      ...EMPTY_VAULT,
      oddsBoosts: { [boostedId]: VAULT_ODDS_BOOST_MAX_STACKS },
    }

    let boostedCount = 0
    let unboostedCount = 0
    for (let seed = 0; seed < 200; seed++) {
      const machine = drawVaultReelPool(vault, MACHINE_ID, createSeededRng(seed))
      if (machine.reel.some((t) => t.id === boostedId)) boostedCount++
      if (machine.reel.some((t) => t.id === unboostedId)) unboostedCount++
    }
    expect(boostedCount).toBeGreaterThan(unboostedCount)
  })
})
