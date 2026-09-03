import { describe, expect, it } from 'vitest'
import {
  BUFF_CADENCE,
  BuffActivationRefusal,
  BuffCadence,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  cheatBuff,
  mintFromTemplate,
  shieldBuff,
  templateById,
  wildcardBuff,
  wildenedBuff,
  type Buff,
} from '../../../hunt'
import type { BuffStack } from '../buffGalleryModel'
import {
  BUFF_ACTIVATION_REFUSAL_MESSAGE,
  BUFF_CONDITION_SENTENCE,
  BUFF_FAMILY_WORD,
  BUFF_POISED_HINT,
  BUFF_POISED_HINT_PRESS,
  BUFF_REWARD_SUFFIX,
  buffCadenceWord,
  buffCardAccessibleName,
  buffConditionSentence,
  buffLine,
  buffName,
  buffRewardPhrase,
  buffRowAccessibleName,
} from '../buffLabels'

function mintedBuff(id: string, tier: BuffTier, buffId = 1): Buff {
  const template = templateById(id)
  if (template === undefined) throw new Error(`No template for id '${id}'`)
  return mintFromTemplate(template, tier, buffId)
}

function stackOf(buff: Buff, count = 1): BuffStack {
  return {
    buff,
    ids: Array.from({ length: count }, (_, i) => buff.id + i),
    count,
    run: 'bells',
    refusal: null,
  }
}

const bellTaker: Buff = {
  id: 1,
  kind: BuffKind.Taker,
  tier: BuffTier.Silver,
  condition: { kind: 'taker', target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
}

describe('buffLabels — one glanceable line', () => {
  it('names a suit-parameterised family with its suit prefix and reward suffix', () => {
    expect(buffName(bellTaker)).toBe('Bell-Taker (Momentum)')
  })

  it('states condition and reward in one line, prefixed with the tier — DLR-145 AC2, no trailing AP cost', () => {
    expect(buffLine(bellTaker)).toBe(
      'Silver Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier.',
    )
  })

  it('names every activated card the catalog can mint, without throwing or mentioning AP', () => {
    for (const buff of [
      cheatBuff(BuffTier.Bronze, 1),
      shieldBuff(BuffTier.Silver, 3),
    ]) {
      const line = buffLine(buff)
      expect(line).not.toContain('AP')
      expect(line).not.toContain('action point')
    }
  })

  it('covers every BuffKind and every BuffRewardAxis, so nothing renders undefined', () => {
    for (const kind of Object.values(BuffKind)) {
      expect(BUFF_FAMILY_WORD[kind]).toBeTruthy()
      expect(BUFF_CONDITION_SENTENCE[kind]).toBeTruthy()
    }
    for (const axis of Object.values(BuffRewardAxis)) {
      expect(BUFF_REWARD_SUFFIX[axis]).toBeTruthy()
    }
  })

  it('pluralises the singular reward figures', () => {
    expect(
      buffRewardPhrase({ ...bellTaker, reward: { axis: BuffRewardAxis.ApRefund, value: 1 } }),
    ).toBe('+1 action point back')
  })

  it('appends the refusal reason to the accessible name so no control is dead without a cause', () => {
    const name = buffRowAccessibleName(bellTaker, false, BuffActivationRefusal.AlreadyActive)
    expect(name).toContain('Already active this trick.')
  })

  it('the rendered line and accessible name never mention AP or action points (DLR-145 AC2)', () => {
    const name = buffRowAccessibleName(bellTaker, false, null)
    expect(name).not.toContain('AP')
    expect(name).not.toContain('action point')
  })
})

describe('BUFF_ACTIVATION_REFUSAL_MESSAGE — DLR-126, every refusal has copy', () => {
  it('carries a non-empty line for every member of BuffActivationRefusal', () => {
    for (const refusal of Object.values(BuffActivationRefusal)) {
      expect(BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal].length).toBeGreaterThan(0)
    }
  })
})

describe('buffCadenceWord — AC9, derived from BUFF_CADENCE, never authored per card', () => {
  it("returns 'PRESS' for every activated card, derived through BUFF_CADENCE", () => {
    for (const kind of Object.values(BuffKind)) {
      if (BUFF_CADENCE[kind] !== BuffCadence.Activated) continue
      const buff: Buff = { ...cheatBuff(BuffTier.Bronze, 1), kind }
      expect(buffCadenceWord(buff)).toBe('PRESS')
    }
  })

  it('resolves the mechanical word per live family: Taker TAKE, Feeder MISS, Sidestep DODGE', () => {
    const taker: Buff = {
      id: 1,
      kind: BuffKind.Taker,
      tier: BuffTier.Bronze,
      condition: { kind: 'taker', target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    const feeder: Buff = { ...taker, kind: BuffKind.Feeder }
    const sidestep: Buff = { ...taker, kind: BuffKind.Sidestep, condition: { kind: 'sidestep' } }
    expect(buffCadenceWord(taker)).toBe('TAKE')
    expect(buffCadenceWord(feeder)).toBe('MISS')
    expect(buffCadenceWord(sidestep)).toBe('DODGE')
  })

  it("resolves Threshold families ('WHEN') and Terminal families ('HAND END')", () => {
    const hoarder: Buff = {
      id: 1,
      kind: BuffKind.Hoarder,
      tier: BuffTier.Bronze,
      condition: { kind: 'hoarder' },
      reward: { axis: BuffRewardAxis.Coins, value: 1 },
    }
    const keepsake: Buff = { ...hoarder, kind: BuffKind.Keepsake }
    expect(buffCadenceWord(hoarder)).toBe('WHEN')
    expect(buffCadenceWord(keepsake)).toBe('HAND END')
  })

  it('every BuffKind resolves to a non-empty word, including the eight cut families', () => {
    const template: Buff = {
      id: 1,
      kind: BuffKind.Unassigned,
      tier: BuffTier.Bronze,
      condition: { kind: 'unassigned' },
      reward: { axis: BuffRewardAxis.None, value: 0 },
    }
    for (const kind of Object.values(BuffKind)) {
      expect(buffCadenceWord({ ...template, kind }).length).toBeGreaterThan(0)
    }
  })

  it("DLR-161 — resolves 'HURT' for Skull Helmet and Skull Tether, not 'WHEN'", () => {
    expect(buffCadenceWord(mintedBuff('skullHelmet:protection', BuffTier.Bronze))).toBe('HURT')
    expect(buffCadenceWord(mintedBuff('skullTether:protection', BuffTier.Bronze))).toBe('HURT')
  })
})

describe('DLR-161 — Skull Helmet and Skull Tether copy', () => {
  it('a bronze gold-minted pair reads the bronze condition sentence', () => {
    const bronzeHelmet = mintedBuff('skullHelmet:protection', BuffTier.Bronze)
    expect(buffLine(bronzeHelmet)).toBe(
      'Bronze Skull Helmet (Guard) — eat a skull with this card: your total survives.',
    )
  })

  it('a silver Tether uses the widened sentence', () => {
    const silverTether = mintedBuff('skullTether:protection', BuffTier.Silver)
    expect(buffLine(silverTether)).toBe(
      'Silver Skull Tether (Guard) — eat a skull, or lose a trick: your roll survives.',
    )
  })

  it('a gold Helmet ends with the +1 gold bonus', () => {
    const goldHelmet = mintedBuff('skullHelmet:protection', BuffTier.Gold)
    expect(buffLine(goldHelmet)).toBe(
      'Gold Skull Helmet (Guard) — eat a skull, or lose a trick: your total survives, +1.',
    )
  })
})


describe('buffCardAccessibleName — AC5, count, and the poise hint ladder', () => {
  const bellTaker: Buff = {
    id: 1,
    kind: BuffKind.Taker,
    tier: BuffTier.Silver,
    condition: { kind: 'taker', target: { suit: BuffTargetSuit.Bells } },
    reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
  }

  it('contains buffName(buff) verbatim, so existing accessible-name queries keep matching', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const name = buffCardAccessibleName(stackOf(cheat), false, null)
    expect(name).toContain(buffName(cheat))
  })

  it('a stack with count > 1 states the count; count === 1 says nothing about it', () => {
    const one = buffCardAccessibleName(stackOf(bellTaker, 1), false, null)
    const many = buffCardAccessibleName(stackOf(bellTaker, 3), false, null)
    expect(one).not.toContain('1 held')
    expect(one).not.toContain('×1')
    expect(many).toContain('×3')
  })

  it('a press card poised reads BUFF_POISED_HINT_PRESS; every other card reads BUFF_POISED_HINT', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const pressName = buffCardAccessibleName(stackOf(cheat), true, null)
    expect(pressName).toContain(BUFF_POISED_HINT_PRESS)

    const takerName = buffCardAccessibleName(stackOf(bellTaker), true, null)
    expect(takerName).toContain(BUFF_POISED_HINT)
    expect(takerName).not.toContain(BUFF_POISED_HINT_PRESS)
  })
})

describe('a wild card names itself (DLR-162 AC9)', () => {
  const wildTakerBlade = wildenedBuff(mintedBuff('taker:bells:magnitude', BuffTier.Bronze, 1))
  const wildFeederMomentum = wildenedBuff(mintedBuff('feeder:keys:multiplier', BuffTier.Bronze, 2))

  it('takes a Wild prefix where the suit prefix would go', () => {
    expect(buffName(wildTakerBlade)).toBe('Wild Taker (Blade)')
    expect(buffName(wildFeederMomentum)).toBe('Wild Feeder (Momentum)')
  })

  it('leaves every suited and suitless name exactly as it was', () => {
    expect(buffName(mintedBuff('taker:bells:magnitude', BuffTier.Bronze, 3))).toBe(
      'Bell-Taker (Blade)',
    )
    expect(buffName(mintedBuff('sidestep:magnitude', BuffTier.Bronze, 4))).toBe('Sidestep (Blade)')
  })

  it('words its condition as "any suit" with no new copy - the substitution already exists', () => {
    expect(buffConditionSentence(wildTakerBlade)).toBe('win a trick with any suit')
  })

  it('names the wildcard itself, and words its ShopOnly refusal', () => {
    expect(buffName(wildcardBuff(BuffTier.Bronze, 5))).toBe('Wildcard (No reward)')
    expect(BUFF_ACTIVATION_REFUSAL_MESSAGE[BuffActivationRefusal.ShopOnly]).toContain(
      'Manage Buffs',
    )
  })
})
