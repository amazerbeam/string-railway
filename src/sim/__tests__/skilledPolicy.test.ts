import { describe, expect, it, vi } from 'vitest'
import { POLICIES, playRun } from '../index'
import {
  cheatEscape,
  chooseSkilledCard,
  deadness,
  leadBankOdds,
  quarrySkullOdds,
} from '../skilledCardPlay'
import { skilledPolicy } from '../skilledPolicy'
import { isSkulled, PlayerSide, type Card, type RoundState } from '../../warCouncil'
import { SKULL_RANK_WEIGHTS } from '../../hunt'

/** A minimal `RoundState` carrying only the fields the card play reads. Built by hand because the
 *  boundary cases below (a void suit, an all-skulled suit) cannot be steered to from a real deal. */
function stateWith(over: Partial<RoundState>): RoundState {
  return {
    hands: { player: [], cpu: [] },
    skulledCards: [],
    currentTrick: [],
    trumpSuit: 'bells',
    ...over,
  } as unknown as RoundState
}

const card = (suit: string, rank: number): Card => ({ suit, rank }) as unknown as Card

// This file's "strategy as a whole" and "Manage Buffs upgrade path" tests each run 40 seeds x 2
// policies of a full simulation (`playRun`) — measured locally at up to ~1.5s. GitHub's CI runners
// have measured roughly 3.4x slower than this machine, which puts the heaviest of them (~1.5s local
// -> ~5.1s on CI) right past Vitest's 5000ms default. Raising the default for this file only, with
// real headroom over the CI estimate, rather than shrinking the seed count these tests' statistical
// claims depend on. Scoped to this file via `vi.setConfig`, not raised globally in `vite.config.ts`,
// so a genuinely hung test elsewhere in the suite still fails fast.
vi.setConfig({ testTimeout: 15000 })

describe('information discipline', () => {
  it('reads the Quarry only as per-suit counts, never as ranks', () => {
    // Two Quarry hands with IDENTICAL shape (same suits, same skull counts) and totally different
    // ranks must be indistinguishable to the policy. If a rank ever leaked into a decision, these
    // two would produce different odds.
    const skulledA = [card('bells', 5)]
    const skulledB = [card('bells', 6)]
    const a = stateWith({
      hands: { player: [], cpu: [card('bells', 5), card('bells', 11)] } as never,
      skulledCards: skulledA,
    })
    const b = stateWith({
      hands: { player: [], cpu: [card('bells', 6), card('bells', 2)] } as never,
      skulledCards: skulledB,
    })
    expect(quarrySkullOdds(a)).toEqual(quarrySkullOdds(b))
  })

  it('falls back to the whole-hand skull rate for a suit the Quarry is void in', () => {
    const state = stateWith({
      hands: { player: [], cpu: [card('bells', 4), card('bells', 5)] } as never,
      skulledCards: [card('bells', 4)],
    })
    const odds = quarrySkullOdds(state)
    // Void in keys and moons; the Quarry may legally dump a skull there, so the estimate is its
    // overall rate (1 of 2), not zero.
    expect(odds.keys).toBeCloseTo(0.5)
    expect(odds.moons).toBeCloseTo(0.5)
  })
})

describe('leadBankOdds', () => {
  it('prefers leading HIGH into a clean suit and LOW into a skull-heavy one', () => {
    const clean = { bells: 0 }
    const skully = { bells: 1 }
    const high = card('bells', 11)
    const low = card('bells', 1)
    // A suit with no skulls: the high card banks by winning.
    expect(leadBankOdds(high, 'keys' as never, clean)).toBeGreaterThan(
      leadBankOdds(low, 'keys' as never, clean),
    )
    // Every card in the suit skulled: the low card banks by losing — a dodge.
    expect(leadBankOdds(low, 'keys' as never, skully)).toBeGreaterThan(
      leadBankOdds(high, 'keys' as never, skully),
    )
  })
})

describe('chooseFollow — the decision that costs health', () => {
  const quarryLeads = (lead: Card, hand: readonly Card[], skulled: readonly Card[]): RoundState =>
    stateWith({
      hands: { player: hand, cpu: [] } as never,
      skulledCards: skulled,
      currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
      trumpSuit: 'moons' as never,
    })

  it('DUCKS a skulled lead with the lowest loser rather than taking the trick', () => {
    const lead = card('bells', 6)
    const hand = [card('bells', 2), card('bells', 9), card('bells', 11)]
    const state = quarryLeads(lead, hand, [lead])
    expect(isSkulled(state.skulledCards, lead)).toBe(true)
    // Winning this is eating the skull — 1 health. Losing it is a dodge, which banks.
    expect(chooseSkilledCard(state)).toEqual(card('bells', 2))
  })

  it('TAKES a clean lead with the cheapest winner, keeping the big cards back', () => {
    const lead = card('bells', 6)
    const hand = [card('bells', 2), card('bells', 7), card('bells', 11)]
    const state = quarryLeads(lead, hand, [])
    expect(chooseSkilledCard(state)).toEqual(card('bells', 7))
  })

  it('throws the junkiest card when the trick is a hurt whatever is played', () => {
    // A clean lead of 10 that nothing in hand beats: the trick costs 1 health regardless, so the
    // choice is only what to KEEP — and it keeps the extremes, throwing the dead middle.
    // Rank 10 and not 11 deliberately: a led Monarch narrows the follow to the highest card of the
    // suit, which would decide this for the policy rather than leaving it a choice.
    // Every rank here is deliberately ability-free: rank 9 is the Witch, which counts as trump and
    // so WOULD take this trick, and rank 11 is the Monarch, which narrows the follow.
    const lead = card('bells', 10)
    const hand = [card('bells', 1), card('bells', 4), card('bells', 6)]
    const state = quarryLeads(lead, hand, [])
    expect(chooseSkilledCard(state)).toEqual(card('bells', 6))
  })
})

describe('cheatEscape', () => {
  it('names an off-suit card exactly when every legal card is a hurt', () => {
    // Rank 10, NOT the Monarch: a led Monarch narrows the follow through `monarchFollowSet`, which
    // `legalMoves` applies BEFORE `ignoreFollowSuit`, so a Cheat cannot escape one. That is the
    // engine's rule, not a gap here.
    const lead = card('bells', 10)
    // Void of any bells that beats the lead; a trump moon would take it.
    const hand = [card('bells', 2), card('moons', 9)]
    const state = stateWith({
      hands: { player: hand, cpu: [] } as never,
      skulledCards: [],
      currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
      trumpSuit: 'moons' as never,
    })
    expect(cheatEscape(state)).toEqual(card('moons', 9))
  })

  it('returns null when a legal card already reaches the wanted outcome', () => {
    const lead = card('bells', 6)
    const hand = [card('bells', 9), card('moons', 9)]
    const state = stateWith({
      hands: { player: hand, cpu: [] } as never,
      skulledCards: [],
      currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
      trumpSuit: 'moons' as never,
    })
    expect(cheatEscape(state)).toBeNull()
  })

  it('returns null while leading — there is no follow-suit to break', () => {
    expect(cheatEscape(stateWith({}))).toBeNull()
  })
})

describe('deadness tracks the skull curve', () => {
  it('rates the ranks the Quarry is most likely to have skulled as the most disposable', () => {
    const heaviest = Object.entries(SKULL_RANK_WEIGHTS)
      .filter(([, weight]) => weight === Math.max(...Object.values(SKULL_RANK_WEIGHTS)))
      .map(([rank]) => Number(rank))
    for (const rank of heaviest) {
      expect(deadness(card('bells', rank))).toBeGreaterThan(deadness(card('bells', 1)))
      expect(deadness(card('bells', rank))).toBeGreaterThan(deadness(card('bells', 11)))
    }
  })
})

describe('the strategy as a whole', () => {
  it('banks a larger share of its tricks than the heuristic written for the Quarry', () => {
    const share = (policy: string): number => {
      let banked = 0
      let total = 0
      for (let seed = 1; seed <= 40; seed += 1) {
        for (const hand of playRun(seed, POLICIES[policy]).hands) {
          const o = hand.trickOutcomes
          banked += o.cleanWin + o.dodge
          total += o.cleanWin + o.dodge + o.cleanLoss + o.skullWin
        }
      }
      return total === 0 ? 0 : banked / total
    }
    // `skilledNaiveCards` is this policy in every respect EXCEPT the card decision, so the gap is
    // the card play and nothing else.
    expect(share('skilled')).toBeGreaterThan(share('skilledNaiveCards'))
  })

  it('withholds Timebombs, which is what keeps a dodging player from priming its own throwaways', () => {
    const damage = (policy: string): number => {
      let taken = 0
      let hands = 0
      for (let seed = 1; seed <= 40; seed += 1) {
        for (const hand of playRun(seed, POLICIES[policy]).hands) {
          taken += hand.damageToPlayer
          hands += 1
        }
      }
      return hands === 0 ? 0 : taken / hands
    }
    expect(damage('skilled')).toBeLessThan(damage('skilledWithTimebomb'))
  })

  it('is registered and brings its own stopping rule', () => {
    expect(POLICIES.skilled).toBe(skilledPolicy)
    expect(skilledPolicy.wantsApplyPot).toBeDefined()
  })
})

describe('combining, the Manage Buffs upgrade path', () => {
  it('is actually executed by the driver when a policy asks for it', () => {
    // `ShopAction` had no combine member until 2026-09-02, so this pins that the wiring exists at
    // all — a combine that silently never ran would look exactly like "combining does not help".
    const combined = playRun(1, POLICIES.skilledCombine)
    expect(combined.combines).toBeGreaterThan(0)
    expect(playRun(1, POLICIES.skilled).combines).toBe(0)
  })

  it('shrinks the pile, which shrinks the stack that earns the Overlap Bonus', () => {
    const stackOf = (policy: string): number => {
      let cards = 0
      let tricks = 0
      for (let seed = 1; seed <= 40; seed += 1) {
        for (const hand of playRun(seed, POLICIES[policy]).hands) {
          const perTrick = new Map<number, number>()
          for (const o of hand.buffFireOutcomes) {
            perTrick.set(o.trickOfHand, (perTrick.get(o.trickOfHand) ?? 0) + 1)
          }
          for (const n of perTrick.values()) {
            cards += n
            tricks += 1
          }
        }
      }
      return tricks === 0 ? 0 : cards / tricks
    }
    // Two cards become one, so fewer fire together — and the Overlap Bonus pays per EXTRA card on
    // a trick, which is why the tier gain does not cover the loss.
    expect(stackOf('skilledCombine')).toBeLessThan(stackOf('skilled'))
  })
})
