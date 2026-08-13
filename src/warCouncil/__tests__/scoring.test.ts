import { describe, expect, it } from 'vitest'
import {
  duelSideDamage,
  HuntNotScorable,
  HuntNotScorableError,
  huntDamage,
  pendingHuntDamage,
  scoreHunt,
} from '../scoring'
import { CardRank, PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'
import {
  applyHunt,
  cardValueSchemeFor,
  DuelSide,
  HuntDeclaration,
  PaidPile,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  resolveStanding,
  standingTableFor,
  StandingBandName,
  startEncounter,
  type CardValueScheme,
  type StandingBand,
} from '../../hunt'

function fillerCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({ suit: Suit.Bells, rank: (i % 11) + 1 }))
}

function huntState(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 2 },
    trumpSuit: Suit.Bells,
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
  }
}

const winTable = standingTableFor(HuntDeclaration.Win)

// Card value held flat at 1 over the own pile, so a spec can isolate the multiplier axis. The
// same role `() => 1` played before DLR-69 bound the two axes into one object.
const FLAT_OWN: CardValueScheme = { value: () => 1, paidPile: PaidPile.Own }

describe('scoreHunt — the product of the two terms, over the Win table', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'k=%i tricks -> spoils × the band multiplier',
    (k) => {
      const state = huntState({ player: fillerCards(2 * k), cpu: [] }, { player: k, cpu: 13 - k })
      const band = resolveStanding(k, winTable)
      const result = scoreHunt(state, PlayerSide.Player, FLAT_OWN)
      expect(result.spoils).toBe(2 * k)
      expect(result.tricks).toBe(k)
      expect(result.band.name).toBe(band.name)
      expect(result.damage).toBe(2 * k * band.multiplier)
    },
  )
})

describe('scoreHunt — the standing table is genuinely injectable', () => {
  it('scores off an injected table and leaves the real exports unaffected', () => {
    const raised: readonly StandingBand[] = winTable.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 18 } : band,
    )
    const state = huntState({ player: fillerCards(6), cpu: [] }, { player: 3, cpu: 10 })

    expect(scoreHunt(state, PlayerSide.Player, FLAT_OWN, raised).damage).toBe(6 * 18)

    // The same state, un-injected: the only thing that changed between the two calls is
    // the table passed in.
    const baseline = scoreHunt(state, PlayerSide.Player, FLAT_OWN)
    expect(baseline.damage).toBe(6 * resolveStanding(3, winTable).multiplier)
    expect(baseline.damage).not.toBe(6 * 18)
  })
})

describe('scoreHunt — the Greedy band still caps a round with maximal Spoils', () => {
  it('damage is capped by the Greedy multiplier at k=13 even though Spoils is large (26 Monarch captures, rank-weighted default)', () => {
    const monarchCards: Card[] = Array.from({ length: 26 }, () => ({
      suit: Suit.Bells,
      rank: CardRank.Monarch,
    }))
    const state = huntState({ player: monarchCards, cpu: [] }, { player: 13, cpu: 0 })

    const result = scoreHunt(state, PlayerSide.Player)
    expect(result.spoils).toBe(26 * CardRank.Monarch)
    expect(result.standing).toBe(resolveStanding(13, winTable).multiplier)
    expect(result.band.name).toBe(StandingBandName.Greedy)
    expect(result.damage).toBe(26 * CardRank.Monarch * result.standing)
  })
})

describe('scoreHunt — both defaults come from the state’s own declaration (DLR-67)', () => {
  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'reads cardValueFor(%s) and standingTableFor(%s) with no argument supplied',
    (path) => {
      const state = {
        ...huntState(
          // The Quarry's pile is non-empty on purpose: post-DLR-69 the Lose path scores the
          // player off it, and a `cpu: []` fixture would make this assertion 0 === 0.
          { player: fillerCards(8), cpu: fillerCards(18) },
          { player: 4, cpu: 9 },
        ),
        declaration: { path },
      }
      const expected = scoreHunt(
        state,
        PlayerSide.Player,
        cardValueSchemeFor(path),
        standingTableFor(path),
      )
      expect(scoreHunt(state, PlayerSide.Player)).toEqual(expected)
      expect(scoreHunt(state, PlayerSide.Player).standing).toBe(
        resolveStanding(4, standingTableFor(path)).multiplier,
      )
    },
  )

  it('reads the Win table on an undeclared round', () => {
    const state = huntState({ player: fillerCards(8), cpu: [] }, { player: 4, cpu: 9 })
    expect(scoreHunt(state, PlayerSide.Player).standing).toBe(
      resolveStanding(4, winTable).multiplier,
    )
  })
})

describe('scoreHunt — the ×0.5 bands cannot produce a fractional damage value (DLR-68 AC4)', () => {
  it('rounds an odd card sum in a ×0.5 band through roundDamage, at one point', () => {
    // 19 × rank 6 + 1 × rank 5 = 119, deliberately odd. k=10 is Greedy (×0.5) on the
    // Win table, so the raw product is 59.5 — the exact case AC4 exists to forbid
    // reaching a health bar.
    const odd: Card[] = [
      ...Array.from({ length: 19 }, () => ({ suit: Suit.Bells, rank: 6 })),
      { suit: Suit.Bells, rank: 5 },
    ]
    const state = huntState({ player: odd, cpu: [] }, { player: 10, cpu: 3 })

    const result = scoreHunt(state, PlayerSide.Player)

    expect(result.spoils).toBe(119)
    expect(result.standing).toBe(resolveStanding(10, winTable).multiplier)
    expect(result.damage).toBe(60)
    expect(Number.isInteger(result.damage)).toBe(true)
  })
})

/** A finished, declared Hunt built on the file's existing `huntState` helper. */
function finished(state: RoundState, path: HuntDeclaration): RoundState {
  return { ...state, phase: RoundPhase.Complete, tricksPlayed: 13, declaration: { path } }
}

/** `count` cards of rank 6 — the fixed point of the Lose inversion (12 − 6 = 6), so the same
 *  pile is worth the same under BOTH value schemes. §8's frame is average rank 6. */
function averageCards(count: number): Card[] {
  return Array.from({ length: count }, () => ({ suit: Suit.Bells, rank: 6 }))
}

describe('huntDamage — refuses rather than returning zero (AC5)', () => {
  it('throws Unfinished on a Hunt that has not reached the thirteenth trick', () => {
    const state = {
      ...huntState({ player: [], cpu: [] }, { player: 4, cpu: 5 }),
      declaration: { path: HuntDeclaration.Win },
    }
    expect(() => huntDamage(state)).toThrow(HuntNotScorableError)
    try {
      huntDamage(state)
      expect.unreachable('huntDamage must throw on an unfinished Hunt')
    } catch (error) {
      expect((error as HuntNotScorableError).reason).toBe(HuntNotScorable.Unfinished)
    }
  })

  it('throws Undeclared on a finished Hunt that was never declared', () => {
    const state = {
      ...huntState({ player: [], cpu: [] }, { player: 7, cpu: 6 }),
      phase: RoundPhase.Complete,
      tricksPlayed: 13,
    }
    expect(() => huntDamage(state)).toThrow(HuntNotScorableError)
    try {
      huntDamage(state)
      expect.unreachable('huntDamage must throw on an undeclared Hunt')
    } catch (error) {
      expect((error as HuntNotScorableError).reason).toBe(HuntNotScorable.Undeclared)
    }
  })

  it('lets resolveStanding’s RangeError surface on a corrupt trick count rather than scoring 0', () => {
    // Legitimately Complete and declared, but the per-side count is nonsense. The guards must
    // NOT absorb this — it has to reach resolveStanding.
    const state = finished(
      huntState({ player: averageCards(4), cpu: [] }, { player: 14, cpu: 0 }),
      HuntDeclaration.Win,
    )
    expect(() => huntDamage(state)).toThrow(RangeError)
    expect(() => huntDamage(state)).not.toThrow(HuntNotScorableError)
  })
})

describe('huntDamage — each side’s damage lands on the OTHER side (AC3)', () => {
  it('keys incoming by the side depleted, proven with asymmetric trick counts', () => {
    // Deliberately asymmetric: player 9 / Quarry 4. A symmetric fixture would pass under
    // either keying and prove nothing.
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const outcome = huntDamage(state)

    // The player's 9 tricks (108 × ×5) deplete the QUARRY.
    expect(outcome.incoming[PlayerSide.Cpu].tricks).toBe(9)
    expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(540)

    // The Quarry's 4 tricks (48 × ×2) deplete the PLAYER.
    expect(outcome.incoming[PlayerSide.Player].tricks).toBe(4)
    expect(outcome.incoming[PlayerSide.Player].damage).toBe(96)
  })
})

describe('huntDamage — both sides read the player’s one declaration (AC2)', () => {
  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'scores both seats off standingTableFor(%s), never a per-side table',
    (path) => {
      const state = finished(
        huntState({ player: averageCards(12), cpu: averageCards(14) }, { player: 6, cpu: 7 }),
        path,
      )
      const outcome = huntDamage(state)
      const table = standingTableFor(path)

      expect(outcome.declaration).toBe(path)
      expect(outcome.incoming[PlayerSide.Cpu].standing).toBe(resolveStanding(6, table).multiplier)
      expect(outcome.incoming[PlayerSide.Player].standing).toBe(
        resolveStanding(7, table).multiplier,
      )
    },
  )

  it('cannot represent a Quarry declaration at all — DeclarationState has no side key', () => {
    // The structural half of AC2, asserted rather than asserted-about: the declaration is one
    // object on RoundState with a single `path` field (types.ts:65-67), so "the Quarry declared
    // something else" is not a state this engine can express. hybrid-design.md lines 67-72
    // proves why that is a rule and not a missing symmetry.
    const state = finished(
      huntState({ player: averageCards(2), cpu: averageCards(24) }, { player: 1, cpu: 12 }),
      HuntDeclaration.Lose,
    )
    expect(Object.keys(state.declaration ?? {})).toEqual(['path'])
  })
})

describe('pendingHuntDamage — the same equation evaluated early, never a second path (AC3)', () => {
  it('agrees exactly with huntDamage on a finished Hunt', () => {
    // The real guarantee against DoD 7's drift: an edit to the equation that touched only one
    // path would fail here. Deep equality over the whole outcome, not just the damage figure.
    const state = finished(
      huntState({ player: averageCards(14), cpu: averageCards(12) }, { player: 7, cpu: 6 }),
      HuntDeclaration.Win,
    )
    expect(pendingHuntDamage(state)).toEqual(huntDamage(state))
  })

  it('returns a partial total mid-Hunt where huntDamage refuses', () => {
    const midHunt = {
      ...huntState({ player: averageCards(8), cpu: averageCards(6) }, { player: 4, cpu: 3 }),
      declaration: { path: HuntDeclaration.Win },
    }
    expect(() => huntDamage(midHunt)).toThrow(HuntNotScorableError)

    const pending = pendingHuntDamage(midHunt)
    // The player's 4 tricks (48 x2 on the Win table) are pending against the QUARRY.
    expect(pending?.incoming[PlayerSide.Cpu].damage).toBe(96)
    // The Quarry's 3 tricks (36 x1) are pending against the PLAYER.
    expect(pending?.incoming[PlayerSide.Player].damage).toBe(36)
  })

  it('returns null on an undeclared Hunt rather than defaulting to the Win table', () => {
    const undeclared = huntState({ player: averageCards(8), cpu: [] }, { player: 4, cpu: 3 })
    expect(pendingHuntDamage(undeclared)).toBeNull()
  })
})

describe('duelSideDamage — maps the Cpu seat onto the Quarry without re-crossing (DLR-70)', () => {
  it('preserves the applied-to keying, proven with asymmetric trick counts', () => {
    // Deliberately asymmetric — player 9 / Quarry 4. A symmetric fixture would pass under
    // either mapping and prove nothing.
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const incoming = duelSideDamage(huntDamage(state))

    // The player's 9 tricks (108 x5) deplete the QUARRY; the Quarry's 4 (48 x2) deplete the PLAYER.
    expect(incoming[DuelSide.Quarry]).toBe(540)
    expect(incoming[DuelSide.Player]).toBe(96)
  })

  it('produces damage applyHunt accepts, end to end', () => {
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const after = applyHunt(startEncounter(0), duelSideDamage(huntDamage(state)))
    expect(after.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 540)
    expect(after.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 96)
  })
})
