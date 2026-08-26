import { describe, expect, it } from 'vitest'
import { AbilityTier, ALL_BRONZE, DAMAGE_PER_HIT, steppedTo, TieredRank } from '../../hunt'
import {
  cashValue,
  forcedCashValue,
  resolveTrickBank,
  type BankState,
  type TrickFacts,
} from '../bank'
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

  it('reads silver as the multiplier alone', () => {
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

/* ── AC4/AC5 — the Swan ladder at the bank ──────────────────────────────────────────────── */

describe('the Swan ladder through resolveTrickBank (AC4/AC5/AC6)', () => {
  /** A real streak, so both the bank and the multiplier have something to lose. */
  const STREAK: BankState = { bank: 3, multiplier: 3 }
  const FULL_CASH = forcedCashValue(STREAK.bank, STREAK.multiplier)

  const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
    playerWon: false,
    skullTrick: false,
    finalTrick: false,
    timebombTrick: false,
    timebombToPlayer: 0,
    timebombToQuarry: 0,
    blastGuarded: false,
    bankClimbBonus: 0,
    swanKeepsMultiplier: false,
    swanKeepsBank: false,
    buffs: null,
    ...over,
  })

  it('bronze on a clean loss still resets both and cashes the reduced figure (AC1)', () => {
    const r = resolveTrickBank(STREAK, facts())
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.cashOut).toBe(FULL_CASH)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('silver on a clean loss spares the multiplier only — damage and cash still land (AC4)', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsMultiplier: true }))
    expect(r.multiplier).toBe(STREAK.multiplier)
    expect(r.bank).toBe(0)
    expect(r.cashOut).toBe(FULL_CASH)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('gold on a clean loss spares the bank too — nothing cashes, the damage still lands (AC5)', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsMultiplier: true, swanKeepsBank: true }))
    expect(r.bank).toBe(STREAK.bank)
    expect(r.multiplier).toBe(STREAK.multiplier)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('gold spares the streak even if the caller reports only the gold fact', () => {
    const r = resolveTrickBank(STREAK, facts({ swanKeepsBank: true }))
    expect(r.multiplier).toBe(STREAK.multiplier)
    expect(r.bank).toBe(STREAK.bank)
  })

  it('silver does nothing against an EATEN SKULL — that is AC4 excluding it by name', () => {
    const bronze = resolveTrickBank(STREAK, facts({ playerWon: true, skullTrick: true }))
    const silver = resolveTrickBank(
      STREAK,
      facts({ playerWon: true, skullTrick: true, swanKeepsMultiplier: true }),
    )
    expect(silver).toEqual(bronze)
    expect(silver.multiplier).toBe(0)
    expect(silver.bank).toBe(0)
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

  /* The sixth trick, where the ladder meets the end-of-hand fold. Raised by DLR-122's defender
     review: the fold runs AFTER the branch above, so a spared bank reaches it intact. `cashOut`
     is damage dealt TO THE QUARRY, so paying more there is the upgrade working, not inverting —
     but it is a behavioural read, so it is pinned here rather than left to be rediscovered. */

  it('at bronze, a clean loss on the final trick pays the reduced figure and nothing more', () => {
    const r = resolveTrickBank(STREAK, facts({ finalTrick: true }))
    expect(r.cashOut).toBe(FULL_CASH)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('at silver, the final trick still cashes the bank at the reduced figure — only the streak was spared', () => {
    const r = resolveTrickBank(STREAK, facts({ finalTrick: true, swanKeepsMultiplier: true }))
    // The bank was zeroed by the forced cash, so the end-of-hand fold has nothing left to cash:
    // `cashValue(0, 3)` is 0 and the total is the reduced figure alone.
    expect(r.cashOut).toBe(FULL_CASH)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('at gold, the spared streak reaches the end-of-hand fold and cashes IN FULL, not two-thirds', () => {
    const r = resolveTrickBank(
      STREAK,
      facts({ finalTrick: true, swanKeepsMultiplier: true, swanKeepsBank: true }),
    )
    // The forced two-thirds reduction is what gold buys out of; the ordinary end-of-hand rule
    // still applies to the surviving bank and pays the whole product to the Quarry.
    expect(r.cashOut).toBe(cashValue(STREAK.bank, STREAK.multiplier))
    expect(r.cashOut).toBeGreaterThan(FULL_CASH)
    expect(r.cashedAtHandEnd).toBe(true)
    // The hand is over either way, so both counters still finish at zero.
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
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
