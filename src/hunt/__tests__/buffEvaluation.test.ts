import { describe, expect, it } from 'vitest'
import { PLAYER_START_HEALTH } from '../config'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  type Buff,
  type BuffId,
} from '../buffs'
import { mintFromTemplate, templateById } from '../buffTemplates'
import { startHandAccrual } from '../buffAccrual'
import {
  advanceTricksWithoutHit,
  buffFires,
  firedBuffs,
  firesOncePerHand,
  resolveTrickBuffs,
  type BuffHandContext,
  type BuffTrickContext,
} from '../buffEvaluation'

/** Defaults for every field of `BuffTrickContext` — false / empty / zero — overridable per case. */
function ctx(overrides: Partial<BuffTrickContext> = {}): BuffTrickContext {
  return {
    playerWon: false,
    skullTrick: false,
    playerHit: false,
    finalTrick: false,
    playerSuits: [],
    playerRanks: [],
    remainingSuits: [],
    bankAfterTrick: 0,
    tricksWithoutHit: 0,
    coins: 0,
    playerHealth: PLAYER_START_HEALTH,
    applyDamagePressed: false,
    ...overrides,
  }
}

const HAND_CONTEXT: BuffHandContext = {
  playerSuits: [],
  playerRanks: [],
  remainingSuits: [],
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: PLAYER_START_HEALTH,
  applyDamagePressed: false,
}

/** Mints a REAL v1 template through `templateById` + `mintFromTemplate` — never a synthetic
 *  literal, per AC5's requirement. A `templateById` miss fails loudly, not silently. Only usable
 *  for the three families DLR-145 kept mintable (Taker, Feeder, Sidestep) — the id must resolve. */
function fromTemplate(id: string, tier: BuffTier, buffId: BuffId): Buff {
  const template = templateById(id)
  if (template === undefined) {
    throw new Error(`No template for id '${id}' — AC5's sample must resolve a real v1 template`)
  }
  return mintFromTemplate(template, tier, buffId)
}

/** DLR-145 pruned the other eight condition families out of `BUFF_TEMPLATES` — they are still
 *  DECLARED on `BuffKind`, priced by `CONDITION_MODIFIER`, and read by `buffFires`'s own switch
 *  (`buffTemplates.ts`'s module docblock), so `buffFires` must still evaluate them correctly even
 *  though no template mints one any more. Builds the `Buff` directly rather than through
 *  `templateById`, which is exactly the `undefined` DLR-113's `reconcileVault` already expects for
 *  these ids. */
function directBuff(
  kind: BuffKind,
  buffId: BuffId,
  axis: BuffRewardAxis,
  target?: { suit?: BuffTargetSuit; rank?: number },
): Buff {
  return {
    id: buffId,
    kind,
    tier: BuffTier.Bronze,
    condition: target === undefined ? { kind } : { kind, target },
    reward: { axis, value: 1 },
  }
}

describe('buffFires — one case per condition family (AC5)', () => {
  it('Taker — wins the trick with the named suit', () => {
    const taker = fromTemplate('taker:bells:magnitude', BuffTier.Bronze, 1)
    expect(buffFires(taker, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells] }))).toBe(
      true,
    )
    // Near-miss: right suit, but the trick was lost.
    expect(buffFires(taker, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Bells] }))).toBe(
      false,
    )
  })

  it('Feeder — loses the trick with the named suit', () => {
    const feeder = fromTemplate('feeder:keys:magnitude', BuffTier.Bronze, 2)
    expect(buffFires(feeder, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Keys] }))).toBe(
      true,
    )
    // Near-miss: right suit, but the trick was won.
    expect(buffFires(feeder, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Keys] }))).toBe(
      false,
    )
  })

  it('Mark of the R — wins the trick with the named rank (DLR-145: still declared, no longer mintable)', () => {
    const markOfRank = directBuff(BuffKind.MarkOfRank, 3, BuffRewardAxis.Magnitude, { rank: 9 })
    expect(buffFires(markOfRank, ctx({ playerWon: true, playerRanks: [9] }))).toBe(true)
    // Near-miss: won, but with a different rank.
    expect(buffFires(markOfRank, ctx({ playerWon: true, playerRanks: [8] }))).toBe(false)
  })

  it('Sidestep — dodges (loses) a skull trick with this card', () => {
    const sidestep = fromTemplate('sidestep:magnitude', BuffTier.Bronze, 4)
    expect(buffFires(sidestep, ctx({ skullTrick: true, playerWon: false }))).toBe(true)
    // Near-miss: no skull in the trick at all.
    expect(buffFires(sidestep, ctx({ skullTrick: false, playerWon: false }))).toBe(false)
  })

  it('Glutton — eats (wins) a skull trick with this card (DLR-145: still declared, no longer mintable)', () => {
    const glutton = directBuff(BuffKind.Glutton, 5, BuffRewardAxis.Coins)
    expect(buffFires(glutton, ctx({ skullTrick: true, playerWon: true }))).toBe(true)
    // Near-miss: a skull trick that was lost, not eaten.
    expect(buffFires(glutton, ctx({ skullTrick: true, playerWon: false }))).toBe(false)
  })

  it('DLR-161 — Skull Helmet bronze fires on an eaten skull only', () => {
    const bronzeHelmet = fromTemplate('skullHelmet:protection', BuffTier.Bronze, 20)
    expect(buffFires(bronzeHelmet, ctx({ skullTrick: true, playerWon: true }))).toBe(true) // skull win
    expect(buffFires(bronzeHelmet, ctx({ skullTrick: true, playerWon: false }))).toBe(false) // dodge
    expect(buffFires(bronzeHelmet, ctx({ skullTrick: false, playerWon: false }))).toBe(false) // clean loss
    expect(buffFires(bronzeHelmet, ctx({ skullTrick: false, playerWon: true }))).toBe(false) // clean win
  })

  it('DLR-161 — Skull Helmet silver fires on the skull win AND the clean loss', () => {
    const silverHelmet = fromTemplate('skullHelmet:protection', BuffTier.Silver, 21)
    expect(buffFires(silverHelmet, ctx({ skullTrick: true, playerWon: true }))).toBe(true)
    expect(buffFires(silverHelmet, ctx({ skullTrick: false, playerWon: false }))).toBe(true)
    expect(buffFires(silverHelmet, ctx({ skullTrick: true, playerWon: false }))).toBe(false) // dodge
    expect(buffFires(silverHelmet, ctx({ skullTrick: false, playerWon: true }))).toBe(false) // clean win
  })

  it('DLR-161 — Skull Tether bronze fires on an eaten skull only', () => {
    const bronzeTether = fromTemplate('skullTether:protection', BuffTier.Bronze, 22)
    expect(buffFires(bronzeTether, ctx({ skullTrick: true, playerWon: true }))).toBe(true)
    expect(buffFires(bronzeTether, ctx({ skullTrick: true, playerWon: false }))).toBe(false)
    expect(buffFires(bronzeTether, ctx({ skullTrick: false, playerWon: false }))).toBe(false)
    expect(buffFires(bronzeTether, ctx({ skullTrick: false, playerWon: true }))).toBe(false)
  })

  it('DLR-161 — Skull Tether silver fires on the skull win AND the clean loss', () => {
    const silverTether = fromTemplate('skullTether:protection', BuffTier.Silver, 23)
    expect(buffFires(silverTether, ctx({ skullTrick: true, playerWon: true }))).toBe(true)
    expect(buffFires(silverTether, ctx({ skullTrick: false, playerWon: false }))).toBe(true)
    expect(buffFires(silverTether, ctx({ skullTrick: true, playerWon: false }))).toBe(false)
    expect(buffFires(silverTether, ctx({ skullTrick: false, playerWon: true }))).toBe(false)
  })

  it("Hoarder — the bank after this trick reaches bronze's threshold (2) (DLR-145: still declared, no longer mintable)", () => {
    const hoarder = directBuff(BuffKind.Hoarder, 6, BuffRewardAxis.Magnitude)
    expect(buffFires(hoarder, ctx({ bankAfterTrick: 2 }))).toBe(true)
    expect(buffFires(hoarder, ctx({ bankAfterTrick: 1 }))).toBe(false)
  })

  it("Unbloodied — survives silver's threshold (3) tricks without a hit (DLR-145: still declared, no longer mintable)", () => {
    const unbloodied = {
      ...directBuff(BuffKind.Unbloodied, 7, BuffRewardAxis.Coins),
      tier: BuffTier.Silver,
    }
    expect(buffFires(unbloodied, ctx({ tricksWithoutHit: 3 }))).toBe(true)
    expect(buffFires(unbloodied, ctx({ tricksWithoutHit: 2 }))).toBe(false)
  })

  it("Debt Collector — Apply Damage was PRESSED this hand (DLR-109's reading) (DLR-145: still declared, no longer mintable)", () => {
    const debtCollector = directBuff(BuffKind.DebtCollector, 8, BuffRewardAxis.Magnitude)
    expect(buffFires(debtCollector, ctx({ applyDamagePressed: true }))).toBe(true)
    expect(buffFires(debtCollector, ctx({ applyDamagePressed: false }))).toBe(false)
  })

  it("Keepsake — holds the named suit at hand's end (the final trick) (DLR-145: still declared, no longer mintable)", () => {
    const keepsake = directBuff(BuffKind.Keepsake, 9, BuffRewardAxis.Coins, {
      suit: BuffTargetSuit.Moons,
    })
    expect(
      buffFires(keepsake, ctx({ finalTrick: true, remainingSuits: [BuffTargetSuit.Moons] })),
    ).toBe(true)
    // Near-miss: the final trick, but the named suit is not in the remaining hand.
    expect(buffFires(keepsake, ctx({ finalTrick: true, remainingSuits: [] }))).toBe(false)
  })

  it("Miser — the purse reaches bronze's threshold (5 coins) (DLR-145: still declared, no longer mintable)", () => {
    const miser = directBuff(BuffKind.Miser, 10, BuffRewardAxis.Magnitude)
    expect(buffFires(miser, ctx({ coins: 5 }))).toBe(true)
    expect(buffFires(miser, ctx({ coins: 4 }))).toBe(false)
  })

  it("Cornered — health falls below bronze's threshold (60% of PLAYER_START_HEALTH) (DLR-145: still declared, no longer mintable)", () => {
    const cornered = directBuff(BuffKind.Cornered, 11, BuffRewardAxis.Multiplier)
    expect(buffFires(cornered, ctx({ playerHealth: 5 }))).toBe(true)
    expect(buffFires(cornered, ctx({ playerHealth: 6 }))).toBe(false)
  })

  it('every consumable and activated kind fires on nothing (AC5 negative half)', () => {
    for (const kind of [
      BuffKind.Cheat,
      BuffKind.Ward,
      BuffKind.Puppeteer,
      BuffKind.SecondThoughts,
      BuffKind.Foresight,
      BuffKind.Spyglass,
      BuffKind.Shield,
      BuffKind.Unassigned,
    ]) {
      expect(
        buffFires(
          {
            id: 1,
            kind,
            tier: BuffTier.Bronze,
            condition: { kind },
            reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
          },
          ctx({ playerWon: true, skullTrick: true, finalTrick: true, bankAfterTrick: 9 }),
        ),
      ).toBe(false)
    }
  })

  it('a threshold family already fired this hand does not fire again', () => {
    const hoarder = directBuff(BuffKind.Hoarder, 7, BuffRewardAxis.Magnitude)
    const c = ctx({ bankAfterTrick: 4 })
    expect(firedBuffs([hoarder], [], c)).toHaveLength(1)
    expect(firedBuffs([hoarder], [7], c)).toHaveLength(0)
  })

  it('an event family fires on every trick its condition holds', () => {
    const taker = fromTemplate('taker:bells:magnitude', BuffTier.Bronze, 8)
    const c = ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells] })
    expect(firedBuffs([taker], [8], c)).toHaveLength(1)
  })

  it('Keepsake fires only at the final trick', () => {
    const k = directBuff(BuffKind.Keepsake, 9, BuffRewardAxis.Coins, { suit: BuffTargetSuit.Moons })
    const held = { remainingSuits: [BuffTargetSuit.Moons] }
    expect(firedBuffs([k], [], ctx({ ...held, finalTrick: false }))).toHaveLength(0)
    expect(firedBuffs([k], [], ctx({ ...held, finalTrick: true }))).toHaveLength(1)
  })
})

describe('firesOncePerHand', () => {
  it('is true for Threshold and Terminal cadences, false for Event', () => {
    expect(firesOncePerHand(directBuff(BuffKind.Hoarder, 20, BuffRewardAxis.Magnitude))).toBe(true)
    expect(
      firesOncePerHand(
        directBuff(BuffKind.Keepsake, 21, BuffRewardAxis.Coins, { suit: BuffTargetSuit.Moons }),
      ),
    ).toBe(true)
    expect(firesOncePerHand(fromTemplate('taker:bells:magnitude', BuffTier.Bronze, 22))).toBe(false)
  })
})

describe('advanceTricksWithoutHit', () => {
  it('zeroes on a hit and increments otherwise', () => {
    expect(advanceTricksWithoutHit(3, true)).toBe(0)
    expect(advanceTricksWithoutHit(3, false)).toBe(4)
    expect(advanceTricksWithoutHit(0, false)).toBe(1)
  })
})

describe('AC3/AC4 — apply-to-card targeting and additive stacking', () => {
  it('AC3 — the same generic Sidestep template fires off two different played cards in one hand', () => {
    const sidestep = fromTemplate('sidestep:magnitude', BuffTier.Bronze, 3)
    // Trick 1: the player dodges with a Bells card. Trick 2: with a Keys card. The template names
    // neither, and fires on both — "this card" is the card played on the trick it was bought for.
    expect(
      buffFires(
        sidestep,
        ctx({ skullTrick: true, playerWon: false, playerSuits: [BuffTargetSuit.Bells] }),
      ),
    ).toBe(true)
    expect(
      buffFires(
        sidestep,
        ctx({ skullTrick: true, playerWon: false, playerSuits: [BuffTargetSuit.Keys] }),
      ),
    ).toBe(true)
    // …and does NOT fire on a trick with no skull, whichever card was played.
    expect(
      buffFires(sidestep, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Bells] })),
    ).toBe(false)
  })

  it('AC4 — two satisfied buffs on one trick add within their axis, plus the Overlap Bonus', () => {
    const blade = fromTemplate('taker:bells:magnitude', BuffTier.Silver, 1) // +3 damage
    const second = directBuff(BuffKind.MarkOfRank, 2, BuffRewardAxis.Magnitude, { rank: 9 }) // +1 damage
    const out = resolveTrickBuffs(
      {
        active: [blade, second],
        accrual: startHandAccrual(),
        firedThisHand: [],
        hand: HAND_CONTEXT,
      },
      ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells], playerRanks: [9] }),
      false,
    )
    expect(out.firedIds).toEqual([1, 2])
    expect(out.accrual.flatDamageBonus).toBe(4)
    expect(out.accrual.multiplierBonus).toBe(1) // R5 — Overlap Bonus, k - 1 with k = 2
  })
})

describe('Keepsake — the known open defect, pinned', () => {
  it('evaluates correctly, and records that the live path hands it an empty hand', () => {
    const k = directBuff(BuffKind.Keepsake, 9, BuffRewardAxis.Coins, { suit: BuffTargetSuit.Moons })
    // The evaluator is right…
    expect(buffFires(k, ctx({ finalTrick: true, remainingSuits: [BuffTargetSuit.Moons] }))).toBe(
      true,
    )
    // …and the shape the live game actually reaches it with is this one. Before DLR-146 the player
    // was dealt HAND_SIZE cards and played exactly HAND_SIZE tricks, so `remainingSuits` was always
    // empty at the final trick and the three Purse Keepsake cards paid nothing. DLR-146 refills the
    // player mid-hand, so a hand can now end with cards still unplayed — but Purse is one of the
    // reward axes DLR-145 cut, so no live template can still observe the difference. Known open
    // defect — see `plan.md` → Risks. Not fixed here; pinned so a fix has a failing assertion to flip.
    expect(buffFires(k, ctx({ finalTrick: true, remainingSuits: [] }))).toBe(false)
  })
})

describe('a wild condition ignores the suit but nothing else (DLR-162 AC3)', () => {
  const wildTaker: Buff = {
    id: 40,
    kind: BuffKind.Taker,
    tier: BuffTier.Bronze,
    condition: { kind: BuffKind.Taker, wild: true },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
  const wildFeeder: Buff = {
    ...wildTaker,
    id: 41,
    kind: BuffKind.Feeder,
    condition: { kind: BuffKind.Feeder, wild: true },
  }

  it('fires a wild Taker on a won trick of a suit it never named', () => {
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Moons] }))).toBe(
      true,
    )
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Keys] }))).toBe(
      true,
    )
  })

  it('still refuses a wild Taker on a LOST trick - the mechanical term is untouched', () => {
    expect(
      buffFires(wildTaker, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Moons] })),
    ).toBe(false)
  })

  it('fires a wild Feeder on a lost trick of any suit, and never on a won one', () => {
    expect(
      buffFires(wildFeeder, ctx({ playerWon: false, playerSuits: [BuffTargetSuit.Bells] })),
    ).toBe(true)
    expect(buffFires(wildFeeder, ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells] }))).toBe(
      false,
    )
  })

  it('fires a wild card even when the player played NO suit this trick', () => {
    expect(buffFires(wildTaker, ctx({ playerWon: true, playerSuits: [] }))).toBe(true)
  })
})
