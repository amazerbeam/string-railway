import { describe, expect, it } from 'vitest'
import { AbilityTier, ALL_BRONZE, DAMAGE_PER_HIT, steppedTo, TieredRank } from '../../hunt'
import { resolveTrickBank, type StreakState, type TrickFacts } from '../streak'
import { swanTierFactsFor, tierForSide } from '../rankTierRules'
import { CardRank, PlayerSide, Suit, type TrickCard } from '../types'

// DLR-146 note: this file was split — the Witch ladder and the end-to-end `playCard` cases now
// live in `rankTiers.playCard.test.ts`, so this file stayed under the 400-line budget after the
// `drawSeed` field landed on `RoundState`.

const SILVER_SWAN = steppedTo(ALL_BRONZE, TieredRank.Swan)
const GOLD_SWAN = steppedTo(SILVER_SWAN, TieredRank.Swan)

const card = (side: PlayerSide, suit: Suit, rank: number): TrickCard => ({
  side,
  card: { suit, rank },
})

/* ── AC3 — the gate itself ──────────────────────────────────────────────────────────────── */

describe('tierForSide — the deck asymmetry (AC3)', () => {
  it('reports the bought tier for the player', () => {
    expect(tierForSide(GOLD_SWAN, PlayerSide.Player, TieredRank.Swan)).toBe(AbilityTier.Gold)
  })

  it('reports bronze for the Quarry, whatever the player bought', () => {
    expect(tierForSide(GOLD_SWAN, PlayerSide.Cpu, TieredRank.Swan)).toBe(AbilityTier.Bronze)
    const goldWitch = steppedTo(steppedTo(ALL_BRONZE, TieredRank.Witch), TieredRank.Witch)
    expect(tierForSide(goldWitch, PlayerSide.Cpu, TieredRank.Witch)).toBe(AbilityTier.Bronze)
  })

  it('reports bronze when no table was threaded through at all', () => {
    expect(tierForSide(undefined, PlayerSide.Player, TieredRank.Swan)).toBe(AbilityTier.Bronze)
  })
})

describe('swanTierFactsFor — whose Swan it is (AC3/AC4/AC5)', () => {
  const playersSwan = [card(PlayerSide.Player, Suit.Bells, CardRank.Swan)]
  const quarrysSwan = [card(PlayerSide.Cpu, Suit.Bells, CardRank.Swan)]
  const noSwan = [card(PlayerSide.Player, Suit.Bells, 4)]

  it('reads silver as the roll alone', () => {
    expect(swanTierFactsFor(playersSwan, SILVER_SWAN)).toEqual({
      swanKeepsMultiplier: true,
      swanKeepsBank: false,
    })
  })

  it('reads gold as both, because gold is above silver on the ladder', () => {
    expect(swanTierFactsFor(playersSwan, GOLD_SWAN)).toEqual({
      swanKeepsMultiplier: true,
      swanKeepsBank: true,
    })
  })

  it('reads nothing off a Swan the QUARRY played, even at gold', () => {
    expect(swanTierFactsFor(quarrysSwan, GOLD_SWAN)).toEqual({
      swanKeepsMultiplier: false,
      swanKeepsBank: false,
    })
  })

  it('reads nothing off a trick with no Swan in it', () => {
    expect(swanTierFactsFor(noSwan, GOLD_SWAN)).toEqual({
      swanKeepsMultiplier: false,
      swanKeepsBank: false,
    })
  })

  it('reads nothing at bronze', () => {
    expect(swanTierFactsFor(playersSwan, ALL_BRONZE)).toEqual({
      swanKeepsMultiplier: false,
      swanKeepsBank: false,
    })
  })
})

/* ── AC4/AC5 — the Swan ladder at the total ──────────────────────────────────────────────── */

describe('the Swan ladder through resolveTrickBank (AC4/AC5/AC6)', () => {
  /** A real streak, so both the total and the roll have something to lose. */
  const STREAK: StreakState = { total: 3, roll: 3 }

  const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
    playerWon: false,
    skullTrick: false,
    finalTrick: false,
    baseDamageBonus: 0,
    swanKeepsMultiplier: false,
    swanKeepsBank: false,
    buffs: null,
    ...over,
  })

  it('bronze on a clean loss resets both and cashes nothing — DLR-156 AC7 (AC1)', () => {
    const r = resolveTrickBank(STREAK, facts())
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('silver on a clean loss spares the roll only — damage lands, nothing ever cashed anyway (AC4)', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsMultiplier: true }))
    expect(r.roll).toBe(STREAK.roll)
    expect(r.total).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('gold on a clean loss spares the total too — the whole streak stands, the damage still lands (AC5)', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsMultiplier: true, swanKeepsBank: true }))
    expect(r.total).toBe(STREAK.total)
    expect(r.roll).toBe(STREAK.roll)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('gold spares the streak even if the caller reports only the gold fact', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsBank: true }))
    expect(r.roll).toBe(STREAK.roll)
    expect(r.total).toBe(STREAK.total)
  })

  it('silver does nothing against an EATEN SKULL — that is AC4 excluding it by name', () => {
    const bronze = resolveTrickBank(STREAK, facts({ playerWon: true, skullTrick: true }))
    const silver = resolveTrickBank(
      STREAK,
      facts({ playerWon: true, skullTrick: true, swanKeepsMultiplier: true }),
    )
    expect(silver).toEqual(bronze)
    expect(silver.roll).toBe(0)
    expect(silver.total).toBe(0)
  })

  it('gold does nothing against an EATEN SKULL either (AC4/AC5)', () => {
    const bronze = resolveTrickBank(STREAK, facts({ playerWon: true, skullTrick: true }))
    const gold = resolveTrickBank(
      STREAK,
      facts({
        playerWon: true,
        skullTrick: true,
        swanKeepsMultiplier: true,
        swanKeepsBank: true,
      }),
    )
    expect(gold).toEqual(bronze)
  })

  it('changes nothing on a trick the player took — there is no hit to spare', () => {
    const bronzeWin = resolveTrickBank(STREAK, facts({ playerWon: true }))
    const goldWin = resolveTrickBank(
      STREAK,
      facts({ playerWon: true, swanKeepsMultiplier: true, swanKeepsBank: true }),
    )
    expect(goldWin).toEqual(bronzeWin)
  })

  /* DLR-156 AC8 — the end-of-hand fold is GONE: `finalTrick` no longer folds a cash-out in, so
     the sixth trick behaves exactly like any other. These three cases replace the ones that used
     to pin the fold, and now pin its absence instead. */

  it('at bronze, a clean loss on the final trick still just wipes the streak and cashes nothing', () => {
    const r = resolveTrickBank(STREAK, facts({ finalTrick: true }))
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
  })

  it('at silver, the final trick still only spares the roll — the total still wipes, nothing cashes', () => {
    const r = resolveTrickBank(STREAK, facts({ finalTrick: true, swanKeepsMultiplier: true }))
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(STREAK.roll)
  })

  it('at gold, the final trick spares the whole streak and still cashes nothing — no fold to reach', () => {
    const r = resolveTrickBank(
      STREAK,
      facts({ finalTrick: true, swanKeepsMultiplier: true, swanKeepsBank: true }),
    )
    // The streak survives the hand boundary untouched (AC8) — there is no end-of-hand rule left
    // to pay it out, gold rung or not.
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(STREAK.total)
    expect(r.roll).toBe(STREAK.roll)
    // And the player still took the hit — no rung insures against health.
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('changes nothing on a Dodge — a marked trick the Quarry won is already banked', () => {
    const bronzeDodge = resolveTrickBank(STREAK, facts({ skullTrick: true }))
    const goldDodge = resolveTrickBank(
      STREAK,
      facts({ skullTrick: true, swanKeepsMultiplier: true, swanKeepsBank: true }),
    )
    expect(goldDodge).toEqual(bronzeDodge)
  })
})
