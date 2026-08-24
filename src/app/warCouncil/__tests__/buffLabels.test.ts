import { describe, expect, it } from 'vitest'
import {
  apCostOf,
  BuffActivationRefusal,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  cheatBuff,
  shieldBuff,
  timebombBuff,
  type Buff,
} from '../../../hunt'
import {
  BUFF_CONDITION_SENTENCE,
  BUFF_FAMILY_WORD,
  BUFF_REWARD_SUFFIX,
  buffLine,
  buffName,
  buffRewardPhrase,
  buffRowAccessibleName,
} from '../buffLabels'

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

  it('states condition and reward in one line, ending with the AP cost', () => {
    expect(buffLine(bellTaker, apCostOf(bellTaker))).toBe(
      `Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. ${apCostOf(bellTaker)} AP.`,
    )
  })

  it('names every activated card the catalog can mint, without throwing', () => {
    for (const buff of [
      cheatBuff(BuffTier.Bronze, 1),
      timebombBuff(BuffTier.Gold, 2),
      shieldBuff(BuffTier.Silver, 3),
    ]) {
      expect(buffLine(buff, apCostOf(buff))).toContain(' AP.')
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
    const name = buffRowAccessibleName(bellTaker, 4, false, BuffActivationRefusal.InsufficientAp)
    expect(name).toContain('Not enough action points.')
  })
})
