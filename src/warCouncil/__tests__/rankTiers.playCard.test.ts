import { describe, expect, it } from 'vitest'
import { ALL_BRONZE, DAMAGE_PER_HIT, steppedTo, TieredRank, type RankTierTable } from '../../hunt'
import { forcedCashValue } from '../bank'
import { resolveTrickWinner } from '../resolveTrick'
import { tierForSide } from '../rankTierRules'
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

// DLR-146 note: split out of `rankTiers.resolution.test.ts`, which grew past 400 lines once
// `RoundState` gained `drawSeed`. The Swan ladder and the AC3 gate stayed behind; this file holds
// the Witch ladder and the end-to-end `playCard` cases.

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
      spentPile: [],
      reshuffled: false,
      drawSeed: 0,
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
