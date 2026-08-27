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
  shieldBuff,
  timebombBuff,
  TIMEBOMB_DAMAGE,
  DuelSide,
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
  buffLine,
  buffName,
  buffPayoff,
  buffPayoffFace,
  buffRewardPhrase,
  buffRowAccessibleName,
} from '../buffLabels'

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
      timebombBuff(BuffTier.Gold, 2),
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
  it("returns 'PRESS' for Cheat and Timebomb, derived through BUFF_CADENCE", () => {
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
})

describe('buffPayoff — AC5, the Timebomb pays one figure and costs another', () => {
  it('a Timebomb returns both figures at its own tier, reading TIMEBOMB_DAMAGE', () => {
    const timebomb = timebombBuff(BuffTier.Gold, 1)
    const payoff = buffPayoff(timebomb)
    const damage = TIMEBOMB_DAMAGE[BuffTier.Gold]
    expect(payoff.gain).toContain(String(damage[DuelSide.Quarry]))
    expect(payoff.risk).not.toBeNull()
    expect(payoff.risk).toContain(String(damage[DuelSide.Player]))
  })

  it('risk is null on every other kind', () => {
    expect(buffPayoff(cheatBuff(BuffTier.Bronze, 1)).risk).toBeNull()
    expect(buffPayoff(shieldBuff(BuffTier.Bronze, 1)).risk).toBeNull()
  })
})

describe('buffPayoffFace — AC10 fix pass, the split bar must fit the card at both required viewports', () => {
  // jsdom has no layout engine (game-ux's own verification note), so this cannot assert the
  // rendered pixel width QA measured live (46px of content in a 33px box at 1440x900, 39px in
  // 33px at 1280x720). What IS honestly assertable here: the face copy is short enough, by
  // character count, that it can no longer be the same overflow QA found — the clipped strings
  // were 9 characters ("+4 damage", "−2 to you"); this budget is under half that — and every
  // figure still traces back to TIMEBOMB_DAMAGE rather than a literal. The pixel-level "does it
  // now fit" claim stays QA's to re-check in a real browser at both named viewports.
  const FACE_CHAR_BUDGET = 5

  it("a Timebomb's face payoff is the bare signed numeral, short enough to fit the split bar", () => {
    const timebomb = timebombBuff(BuffTier.Gold, 1)
    const damage = TIMEBOMB_DAMAGE[BuffTier.Gold]
    const face = buffPayoffFace(timebomb)
    expect(face.gain).toBe(`+${damage[DuelSide.Quarry]}`)
    expect(face.risk).toBe(`−${damage[DuelSide.Player]}`)
    expect(face.gain.length).toBeLessThanOrEqual(FACE_CHAR_BUDGET)
    expect(face.risk).not.toBeNull()
    expect((face.risk as string).length).toBeLessThanOrEqual(FACE_CHAR_BUDGET)
  })

  it('every tier reads TIMEBOMB_DAMAGE, never a literal', () => {
    for (const tier of [BuffTier.Bronze, BuffTier.Silver, BuffTier.Gold]) {
      const damage = TIMEBOMB_DAMAGE[tier]
      const face = buffPayoffFace(timebombBuff(tier, 1))
      expect(face.gain).toBe(`+${damage[DuelSide.Quarry]}`)
      expect(face.risk).toBe(`−${damage[DuelSide.Player]}`)
    }
  })

  it('is unchanged from buffPayoff on every non-Timebomb kind', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    const shield = shieldBuff(BuffTier.Gold, 1)
    expect(buffPayoffFace(cheat)).toEqual(buffPayoff(cheat))
    expect(buffPayoffFace(shield)).toEqual(buffPayoff(shield))
  })

  it("does not shrink buffPayoff or buffCardAccessibleName — AC5's full sentence stays intact", () => {
    const timebomb = timebombBuff(BuffTier.Gold, 1)
    const damage = TIMEBOMB_DAMAGE[BuffTier.Gold]
    expect(buffPayoff(timebomb).gain).toBe(`+${damage[DuelSide.Quarry]} damage`)
    expect(buffPayoff(timebomb).risk).toBe(`−${damage[DuelSide.Player]} to you`)
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

  it("a Timebomb's accessible name contains both figures in one sentence", () => {
    const timebomb = timebombBuff(BuffTier.Gold, 1)
    const damage = TIMEBOMB_DAMAGE[BuffTier.Gold]
    const name = buffCardAccessibleName(stackOf(timebomb), false, null)
    expect(name).toContain(String(damage[DuelSide.Quarry]))
    expect(name).toContain(String(damage[DuelSide.Player]))
  })

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
