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
  BUFF_EVENT_WORD,
  BUFF_FAMILY_WORD,
  BUFF_WIDENED_CONDITION_SENTENCE,
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

const bellHigh: Buff = {
  id: 1,
  kind: BuffKind.SuitHigh,
  tier: BuffTier.Silver,
  condition: { kind: 'suitHigh', target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
}

describe('buffLabels — one glanceable line', () => {
  it('names a suit-parameterised family with its suit prefix and reward suffix', () => {
    expect(buffName(bellHigh)).toBe('Bell High (Momentum)')
  })

  it('states condition and reward in one line, prefixed with the tier — DLR-145 AC2, no trailing AP cost', () => {
    expect(buffLine(bellHigh)).toBe(
      'Silver Bell High (Momentum) — go high on Bells: +3 multiplier.',
    )
  })

  it('names every activated card the catalog can mint, without throwing or mentioning AP', () => {
    for (const buff of [cheatBuff(BuffTier.Bronze, 1), shieldBuff(BuffTier.Silver, 3)]) {
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
      buffRewardPhrase({ ...bellHigh, reward: { axis: BuffRewardAxis.ApRefund, value: 1 } }),
    ).toBe('+1 action point back')
  })

  it('appends the refusal reason to the accessible name so no control is dead without a cause', () => {
    const name = buffRowAccessibleName(bellHigh, false, BuffActivationRefusal.AlreadyActive)
    expect(name).toContain('Already active this trick.')
  })

  it('the rendered line and accessible name never mention AP or action points (DLR-145 AC2)', () => {
    const name = buffRowAccessibleName(bellHigh, false, null)
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

  it('DLR-165 — resolves the mechanical word per live family: HIGH, LOW, LOW', () => {
    const suitHigh: Buff = {
      id: 1,
      kind: BuffKind.SuitHigh,
      tier: BuffTier.Bronze,
      condition: { kind: 'suitHigh', target: { suit: BuffTargetSuit.Bells } },
      reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
    }
    const suitLow: Buff = { ...suitHigh, kind: BuffKind.SuitLow }
    const skullLow: Buff = { ...suitHigh, kind: BuffKind.SkullLow, condition: { kind: 'skullLow' } }
    expect(buffCadenceWord(suitHigh)).toBe('HIGH')
    expect(buffCadenceWord(suitLow)).toBe('LOW')
    // The pill names the MECHANICAL branch and nothing else, so Skull Low takes the same word its
    // suited sibling does — the skull is stated in the card's name and its condition sentence.
    expect(buffCadenceWord(skullLow)).toBe('LOW')
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

  it("DLR-165 — resolves 'SKULL' for Skull Helmet and Skull Tether, not 'WHEN' and not 'HURT'", () => {
    // `HURT` named the OUTCOME axis on a card face, which AC5 forbids. No single High/Low word is
    // true at both tiers, so `SKULL` is the developer-facing placeholder recorded in the contract.
    expect(buffCadenceWord(mintedBuff('skullHelmet:protection', BuffTier.Bronze))).toBe('SKULL')
    expect(buffCadenceWord(mintedBuff('skullTether:protection', BuffTier.Bronze))).toBe('SKULL')
  })
})

describe('DLR-165 AC5 — no card face may name the outcome axis', () => {
  it('no condition sentence names Victory, Defeat, or any win/lose word', () => {
    const outcomeWords = /\b(victor(y|ious)|defeat|win|won|wins|lose|loses|lost|loss|dodge)\b/i
    for (const kind of Object.values(BuffKind)) {
      expect(BUFF_CONDITION_SENTENCE[kind]).not.toMatch(outcomeWords)
      const widened = BUFF_WIDENED_CONDITION_SENTENCE[kind]
      if (widened !== undefined) expect(widened).not.toMatch(outcomeWords)
    }
  })

  it('no mechanical pill word names the outcome axis either', () => {
    const outcomeWords = /\b(victory|defeat|win|won|lose|loss|dodge|hurt)\b/i
    for (const word of Object.values(BUFF_EVENT_WORD)) {
      expect(word).not.toMatch(outcomeWords)
    }
  })
})

describe('DLR-161 — Skull Helmet and Skull Tether copy', () => {
  it('a bronze gold-minted pair reads the bronze condition sentence', () => {
    const bronzeHelmet = mintedBuff('skullHelmet:protection', BuffTier.Bronze)
    expect(buffLine(bronzeHelmet)).toBe(
      'Bronze Skull Helmet (Guard) — go high on a skull: your total survives.',
    )
  })

  it('a silver Tether uses the widened sentence', () => {
    const silverTether = mintedBuff('skullTether:protection', BuffTier.Silver)
    expect(buffLine(silverTether)).toBe(
      'Silver Skull Tether (Guard) — go high on a skull, or low on a clean trick: your roll survives.',
    )
  })

  it('a gold Helmet ends with the +1 gold bonus', () => {
    const goldHelmet = mintedBuff('skullHelmet:protection', BuffTier.Gold)
    expect(buffLine(goldHelmet)).toBe(
      'Gold Skull Helmet (Guard) — go high on a skull, or low on a clean trick: your total survives, +1.',
    )
  })
})

describe('buffCardAccessibleName — AC5, count, and the poise hint ladder', () => {
  const bellHigh: Buff = {
    id: 1,
    kind: BuffKind.SuitHigh,
    tier: BuffTier.Silver,
    condition: { kind: 'suitHigh', target: { suit: BuffTargetSuit.Bells } },
    reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
  }

  it('contains buffName(buff) verbatim, so existing accessible-name queries keep matching', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const name = buffCardAccessibleName(stackOf(cheat), false, null)
    expect(name).toContain(buffName(cheat))
  })

  it('a stack with count > 1 states the count; count === 1 says nothing about it', () => {
    const one = buffCardAccessibleName(stackOf(bellHigh, 1), false, null)
    const many = buffCardAccessibleName(stackOf(bellHigh, 3), false, null)
    expect(one).not.toContain('1 held')
    expect(one).not.toContain('×1')
    expect(many).toContain('×3')
  })

  it('a press card poised reads BUFF_POISED_HINT_PRESS; every other card reads BUFF_POISED_HINT', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const pressName = buffCardAccessibleName(stackOf(cheat), true, null)
    expect(pressName).toContain(BUFF_POISED_HINT_PRESS)

    const suitHighName = buffCardAccessibleName(stackOf(bellHigh), true, null)
    expect(suitHighName).toContain(BUFF_POISED_HINT)
    expect(suitHighName).not.toContain(BUFF_POISED_HINT_PRESS)
  })
})

describe('a wild card names itself (DLR-162 AC9)', () => {
  const wildHighBlade = wildenedBuff(mintedBuff('suitHigh:bells:magnitude', BuffTier.Bronze, 1))
  const wildLowMomentum = wildenedBuff(mintedBuff('suitLow:keys:multiplier', BuffTier.Bronze, 2))

  it('takes a Wild prefix where the suit prefix would go', () => {
    expect(buffName(wildHighBlade)).toBe('Wild High (Blade)')
    expect(buffName(wildLowMomentum)).toBe('Wild Low (Momentum)')
  })

  it('names every suited and suitless card on the DLR-165 grammar', () => {
    expect(buffName(mintedBuff('suitHigh:bells:magnitude', BuffTier.Bronze, 3))).toBe(
      'Bell High (Blade)',
    )
    expect(buffName(mintedBuff('skullLow:magnitude', BuffTier.Bronze, 4))).toBe('Skull Low (Blade)')
  })

  it('words its condition as "any suit" with no new copy - the substitution already exists', () => {
    // DLR-165 — the sentence is "go high on {suit}" rather than "go high on a {suit} trick" for
    // exactly this substitution: the article would produce "go high on a any suit trick".
    expect(buffConditionSentence(wildHighBlade)).toBe('go high on any suit')
  })

  it('names the wildcard itself, and words its ShopOnly refusal', () => {
    expect(buffName(wildcardBuff(BuffTier.Bronze, 5))).toBe('Wildcard (No reward)')
    expect(BUFF_ACTIVATION_REFUSAL_MESSAGE[BuffActivationRefusal.ShopOnly]).toContain(
      'Manage Buffs',
    )
  })
})
