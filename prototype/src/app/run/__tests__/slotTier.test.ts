import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, BuffTier, REEL_POOL_SIZE, resolvePull } from '../../../hunt'
import { reelTiers } from '../slotTier'

const reel = BUFF_TEMPLATES.slice(0, REEL_POOL_SIZE)

describe('reelTiers', () => {
  it('reads all three reels as Gold on a three-match pull', () => {
    const pull = resolvePull([reel[0], reel[0], reel[0]])
    expect(reelTiers(pull.symbols, pull.awards)).toEqual([
      BuffTier.Gold,
      BuffTier.Gold,
      BuffTier.Gold,
    ])
  })

  it('reads the matched pair as Silver and the odd one as Bronze, in reel order', () => {
    const pull = resolvePull([reel[0], reel[1], reel[0]])
    expect(reelTiers(pull.symbols, pull.awards)).toEqual([
      BuffTier.Silver,
      BuffTier.Bronze,
      BuffTier.Silver,
    ])
  })

  it('reads all three reels as Bronze on an all-different pull', () => {
    const pull = resolvePull([reel[0], reel[1], reel[2]])
    expect(reelTiers(pull.symbols, pull.awards)).toEqual([
      BuffTier.Bronze,
      BuffTier.Bronze,
      BuffTier.Bronze,
    ])
  })

  it('reads null for a symbol with no matching award, rather than guessing', () => {
    const pull = resolvePull([reel[0], reel[1], reel[2]])
    // A symbol not present in `awards` at all — the case `resolvePull` never produces today, but
    // this function's own contract must not silently coerce it into a tier.
    expect(reelTiers([reel[3]], pull.awards)).toEqual([null])
  })
})
