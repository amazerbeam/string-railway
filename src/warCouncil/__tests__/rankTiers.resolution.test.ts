import { describe, expect, it } from 'vitest'
import {
  AbilityTier,
  ALL_BRONZE,
  DAMAGE_PER_HIT,
  steppedTo,
  TieredRank,
  type RankTierTable,
} from '../../hunt'
import {
  cashValue,
  forcedCashValue,
  resolveTrickBank,
  type BankState,
  type TrickFacts,
} from '../bank'
import { resolveTrickWinner } from '../resolveTrick'
import { swanTierFactsFor, tierForSide } from '../rankTierRules'
import { playCard } from '../playCard'
import {
  CardRank,
  PlayerSide,
  RoundPhase,
  Suit,
  type Card,
  type RoundState,
  type TrickCard,
} from '../types'

const SILVER_SWAN = steppedTo(ALL_BRONZE, TieredRank.Swan)
const GOLD_SWAN = steppedTo(SILVER_SWAN, TieredRank.Swan)
const SILVER_WITCH = steppedTo(ALL_BRONZE, TieredRank.Witch)
const GOLD_WITCH = steppedTo(SILVER_WITCH, TieredRank.Witch)

const witchTierIn = (table: RankTierTable) =>
  tierForSide(table, PlayerSide.Player, TieredRank.Witch)

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
    expect(tierForSide(GOLD_WITCH, PlayerSide.Cpu, TieredRank.Witch)).toBe(AbilityTier.Bronze)
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

/* ── The Witch ladder at the trick ──────────────────────────────────────────────────────── */

describe('the Witch ladder through resolveTrickWinner (AC3/AC6)', () => {
  const TRUMP = Suit.Bells
  const OFF = Suit.Keys

  const bothWitches: [TrickCard, TrickCard] = [
    card(PlayerSide.Player, OFF, CardRank.Witch),
    card(PlayerSide.Cpu, Suit.Moons, CardRank.Witch),
  ]

  it('bronze still cancels two Witches — the printed rule, unchanged (AC1)', () => {
    // Neither is effective trump, and the follow is off the lead suit, so the lead takes it.
    expect(resolveTrickWinner(bothWitches, TRUMP)).toBe(PlayerSide.Player)
    // Reversed, the Quarry leads and takes it for the same reason: nothing here is trump.
    const reversed: [TrickCard, TrickCard] = [bothWitches[1], bothWitches[0]]
    expect(resolveTrickWinner(reversed, TRUMP)).toBe(PlayerSide.Cpu)
  })

  it("silver stops the cancellation for the PLAYER's Witch, even when the Quarry leads one", () => {
    const reversed: [TrickCard, TrickCard] = [bothWitches[1], bothWitches[0]]
    expect(resolveTrickWinner(reversed, TRUMP, witchTierIn(SILVER_WITCH))).toBe(PlayerSide.Player)
  })

  it('silver leaves a Quarry Witch cancelled against the player (AC3)', () => {
    // The player's Witch is the only effective trump, so the player takes it either way round.
    expect(resolveTrickWinner(bothWitches, TRUMP, witchTierIn(SILVER_WITCH))).toBe(
      PlayerSide.Player,
    )
  })

  it("leaves a lone Quarry Witch counting as trump, exactly as today's rule does (AC3)", () => {
    const loneQuarryWitch: [TrickCard, TrickCard] = [
      card(PlayerSide.Player, OFF, 10),
      card(PlayerSide.Cpu, Suit.Moons, CardRank.Witch),
    ]
    expect(resolveTrickWinner(loneQuarryWitch, TRUMP, witchTierIn(GOLD_WITCH))).toBe(PlayerSide.Cpu)
  })

  it("gold beats a higher trump — the Witch counts as the trump suit's highest card", () => {
    const witchVersusMonarch: [TrickCard, TrickCard] = [
      card(PlayerSide.Player, OFF, CardRank.Witch),
      card(PlayerSide.Cpu, TRUMP, CardRank.Monarch),
    ]
    expect(resolveTrickWinner(witchVersusMonarch, TRUMP)).toBe(PlayerSide.Cpu)
    expect(resolveTrickWinner(witchVersusMonarch, TRUMP, witchTierIn(SILVER_WITCH))).toBe(
      PlayerSide.Cpu,
    )
    expect(resolveTrickWinner(witchVersusMonarch, TRUMP, witchTierIn(GOLD_WITCH))).toBe(
      PlayerSide.Player,
    )
  })

  it("never lifts a QUARRY Witch above a player's trump, however high the table reads (AC3)", () => {
    const quarryWitchVersusPlayerMonarch: [TrickCard, TrickCard] = [
      card(PlayerSide.Player, TRUMP, CardRank.Monarch),
      card(PlayerSide.Cpu, OFF, CardRank.Witch),
    ]
    expect(resolveTrickWinner(quarryWitchVersusPlayerMonarch, TRUMP, witchTierIn(GOLD_WITCH))).toBe(
      PlayerSide.Player,
    )
  })

  it('resolves identically to the two-argument form when the table is all bronze', () => {
    const plain: [TrickCard, TrickCard] = [
      card(PlayerSide.Player, TRUMP, 4),
      card(PlayerSide.Cpu, TRUMP, 9),
    ]
    expect(resolveTrickWinner(plain, TRUMP, witchTierIn(ALL_BRONZE))).toBe(
      resolveTrickWinner(plain, TRUMP),
    )
  })
})

/* ── End to end, through the real playCard ──────────────────────────────────────────────── */

describe('the ladder through playCard (AC2/AC3/AC6)', () => {
  /** The Quarry leads a trump the player must lose to, and the player follows with a Swan. */
  function lostTrickWithSwan(swanSide: PlayerSide): RoundState {
    const swan: Card = { suit: Suit.Keys, rank: CardRank.Swan }
    const quarryLead: Card = { suit: Suit.Bells, rank: 10 }
    return {
      dealer: PlayerSide.Player,
      hands: { player: [swan], cpu: [quarryLead] },
      drawPile: [{ suit: Suit.Moons, rank: 2 }],
      decree: { suit: Suit.Bells, rank: 4 },
      trumpSuit: Suit.Bells,
      tricksWon: { player: 0, cpu: 0 },
      skulledCards: [],
      primedCards: [],
      bank: 3,
      multiplier: 3,
      lastResolution: null,
      currentTrick: [{ side: PlayerSide.Cpu, card: quarryLead }],
      leader: PlayerSide.Cpu,
      tricksPlayed: 0,
      phase: RoundPhase.AwaitingFollow,
      // The Swan is dealt to whichever side the case under test needs to hold it.
      ...(swanSide === PlayerSide.Cpu
        ? { hands: { player: [quarryLead], cpu: [swan] } }
        : undefined),
    }
  }

  function loseWithPlayersSwan(tiers: RankTierTable | undefined) {
    const state = lostTrickWithSwan(PlayerSide.Player)
    const result = playCard(
      state,
      PlayerSide.Player,
      { suit: Suit.Keys, rank: CardRank.Swan },
      undefined,
      tiers === undefined ? undefined : { playerRankTiers: tiers },
    )
    if (!result.ok) throw new Error(`expected a legal play, got ${result.reason}`)
    return result.state
  }

  it('with no table threaded through, a clean loss resets bank and multiplier (AC1)', () => {
    const after = loseWithPlayersSwan(undefined)
    expect(after.bank).toBe(0)
    expect(after.multiplier).toBe(0)
    expect(after.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('at silver the multiplier survives the clean loss and the bank still cashes (AC4)', () => {
    const after = loseWithPlayersSwan(SILVER_SWAN)
    expect(after.multiplier).toBe(3)
    expect(after.bank).toBe(0)
    expect(after.lastResolution?.cashOut).toBe(forcedCashValue(3, 3))
    expect(after.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('at gold the bank survives too and nothing cashes (AC5)', () => {
    const after = loseWithPlayersSwan(GOLD_SWAN)
    expect(after.multiplier).toBe(3)
    expect(after.bank).toBe(3)
    expect(after.lastResolution?.cashOut).toBe(0)
    expect(after.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('the loser holding the Swan still leads the next trick, at every rung (AC4)', () => {
    for (const tiers of [ALL_BRONZE, SILVER_SWAN, GOLD_SWAN]) {
      expect(loseWithPlayersSwan(tiers).leader).toBe(PlayerSide.Player)
    }
  })

  it("a gold table does nothing for the QUARRY's Swan — the player's streak still dies (AC3)", () => {
    const state = lostTrickWithSwan(PlayerSide.Cpu)
    // The Quarry leads its Swan; the player follows and loses cleanly to it holding a trump 10.
    const withQuarryLead: RoundState = {
      ...state,
      hands: { player: [{ suit: Suit.Moons, rank: 2 }], cpu: [] },
      currentTrick: [{ side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 10 } }],
    }
    const result = playCard(
      withQuarryLead,
      PlayerSide.Player,
      { suit: Suit.Moons, rank: 2 },
      undefined,
      { playerRankTiers: GOLD_SWAN },
    )
    if (!result.ok) throw new Error(`expected a legal play, got ${result.reason}`)
    expect(result.state.bank).toBe(0)
    expect(result.state.multiplier).toBe(0)
  })
})
