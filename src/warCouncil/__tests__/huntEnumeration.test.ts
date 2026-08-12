import { describe, expect, it } from 'vitest'
import { huntDamage, PlayerSide, TRICKS_PER_ROUND, type Card, type RoundState } from '..'
import { RoundPhase, Suit } from '../types'
import { HuntDeclaration, standingTableFor } from '../../hunt'

// §8's frame is "printed rank, average rank 6 — a trick's two cards worth roughly 12 between
// them" (hybrid-design.md:996-999). Rank 6 is also the fixed point of the Lose inversion
// (12 − 6 = 6), so a pile of rank-6 cards is worth the same under BOTH value schemes. Post-DLR-69
// the schemes differ on a second axis — WHICH pile a side is paid for — and both piles here are
// rank-6 cards, so the figures below still fall out of `huntDamage(finalState)` with no injected
// scheme, which is what lets a signature taking only a state be checked against the design table.
const AVERAGE_RANK = 6

function averageCards(count: number): Card[] {
  return Array.from({ length: count }, () => ({ suit: Suit.Bells, rank: AVERAGE_RANK }))
}

/** A finished, declared Hunt in which the player won `k` of the thirteen tricks. */
function finishedHunt(k: number, path: HuntDeclaration): RoundState {
  const quarryTricks = TRICKS_PER_ROUND - k
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 2 },
    trumpSuit: Suit.Bells,
    tricksWon: { player: k, cpu: quarryTricks },
    capturedCards: { player: averageCards(2 * k), cpu: averageCards(2 * quarryTricks) },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: TRICKS_PER_ROUND,
    phase: RoundPhase.Complete,
    declaration: { path },
  }
}

/** `[k, damage the player deals, damage the Quarry deals]`. */
type Split = readonly [number, number, number]

// TRANSCRIBED from hybrid-design.md §8, lines 1003-1016, Win column — all fourteen rows.
// Frozen on purpose: if src/hunt/config.ts's tables are retuned, these fail, which is the
// point. They are products the design document publishes, not multipliers.
const WIN_SPLITS: readonly Split[] = [
  [0, 0, 78],
  [1, 12, 72],
  [2, 24, 66],
  [3, 36, 60],
  [4, 96, 540],
  [5, 180, 480],
  [6, 288, 420],
  [7, 420, 288],
  [8, 480, 180],
  [9, 540, 96],
  [10, 60, 36],
  [11, 66, 24],
  [12, 72, 12],
  [13, 78, 0],
]

// TRANSCRIBED from hybrid-design.md §8, lines 1003-1016, Lose column — all fourteen rows, in the
// same frozen-on-purpose spirit as WIN_SPLITS above. Replaces DLR-68's interim own-pile column,
// the handover DLR-68 AC7 named. Under the pile swap each side is paid for the OTHER side's pile,
// so this column is the Win column with its two damage figures exchanged — which is §8 line 1020's
// "the Lose column the exact negative of the Win column at every row", stated as data.
// The four rows §8 flags in bold: k=0, k=4, k=9, k=13 (DLR-69 AC4).
const LOSE_SPLITS: readonly Split[] = [
  [0, 78, 0],
  [1, 72, 12],
  [2, 66, 24],
  [3, 60, 36],
  [4, 540, 96],
  [5, 480, 180],
  [6, 420, 288],
  [7, 288, 420],
  [8, 180, 480],
  [9, 96, 540],
  [10, 36, 60],
  [11, 24, 66],
  [12, 12, 72],
  [13, 0, 78],
]

describe.each([
  ['Win (§8 in full)', HuntDeclaration.Win, WIN_SPLITS],
  ['Lose (§8 in full)', HuntDeclaration.Lose, LOSE_SPLITS],
])(
  'huntDamage — the fourteen splits at average card values, %s (DLR-69 AC4)',
  (_label, path, splits) => {
    it.each(splits)('k=%i: the player deals %i and takes %i', (k, playerDeals, quarryDeals) => {
      const outcome = huntDamage(finishedHunt(k, path))

      expect(outcome.declaration).toBe(path)
      // incoming is keyed by the side DEPLETED, so what the player dealt is the Quarry's entry.
      expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(playerDeals)
      expect(outcome.incoming[PlayerSide.Player].damage).toBe(quarryDeals)
      // Every figure in both tables is an integer, so roundDamage is the identity here —
      // this spec is not covertly testing AC4.
      expect(Number.isInteger(outcome.incoming[PlayerSide.Cpu].damage)).toBe(true)
      expect(Number.isInteger(outcome.incoming[PlayerSide.Player].damage)).toBe(true)
    })
  },
)

describe('huntDamage — the k = 0 Lose edge case, the discarded branch’s own falsifier (AC5)', () => {
  it('pays the player 78 and the Quarry 0 when a declared-Lose player wins zero tricks', () => {
    const outcome = huntDamage(finishedHunt(0, HuntDeclaration.Lose))

    // hybrid-design.md:208-214. Only one pile exists in this split — the Quarry's 13-trick,
    // 26-card sweep. The rule counts it once, for the side that did not win it, so it pays the
    // PLAYER: 26 × 6 = 156, at Lose(0) = ×0.5 → 78. The discarded branch (both sides counting the
    // Quarry's pile) pays it to the Quarry instead, finishing a plan executed as well as it can be
    // executed 78 BEHIND rather than 78 ahead. That sign is what this test exists to pin.
    expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(78)
    expect(outcome.incoming[PlayerSide.Player].damage).toBe(0)
    expect(
      outcome.incoming[PlayerSide.Cpu].damage - outcome.incoming[PlayerSide.Player].damage,
    ).toBe(78)
  })
})

describe.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
  'huntDamage — Net(k) = −Net(13 − k) over the configured table pair, %s (AC6)',
  (path) => {
    // DERIVED, not transcribed: nothing here names a multiplier or a damage total, so this
    // property survives any table pair the developer swaps into src/hunt/config.ts. It is the
    // complement of the enumeration above — that one is a canary, this one is a property.
    const net = (k: number): number => {
      const outcome = huntDamage(finishedHunt(k, path))
      return outcome.incoming[PlayerSide.Cpu].damage - outcome.incoming[PlayerSide.Player].damage
    }

    // k = 0…6 covers all seven mirror pairs of a thirteen-trick round (0↔13 … 6↔7).
    it.each([0, 1, 2, 3, 4, 5, 6])('the net at k=%i is the exact negative of its mirror', (k) => {
      expect(net(k)).toBe(-net(TRICKS_PER_ROUND - k))
    })

    it('reads a real configured table, not an empty one', () => {
      // Guards the property above from passing vacuously if the table pair were ever emptied.
      expect(standingTableFor(path).length).toBeGreaterThan(0)
    })
  },
)
