import { describe, expect, it } from 'vitest'
import {
  BASE_DAMAGE,
  BuffTier,
  curseBuff,
  DAMAGE_PER_HIT,
  EMPTY_BUFF_ACCRUAL,
  mintFromTemplate,
  templateById,
  type Buff,
} from '../../hunt'
import type { BuffHandInput } from '../buffTrickFacts'
import { playCard } from '../playCard'
import { TrickOutcome } from '../streak'
import { PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'

/** DLR-167 — the curse's whole effect on a trick, against the REAL `playCard`. Its own local
 *  fixture rather than an import from a sibling spec, matching `playCard.bank.test.ts`'s note. */

const bells9: Card = { suit: Suit.Bells, rank: 9 }
const bells2: Card = { suit: Suit.Bells, rank: 2 }
const moons7: Card = { suit: Suit.Moons, rank: 7 }

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Keys, rank: 4 },
    trumpSuit: Suit.Keys,
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    cursedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingFollow,
    ...overrides,
  }
}

/** The Quarry has led `lead`; the player still holds `hand`. */
function quarryLed(lead: Card, hand: readonly Card[], cursedCards: readonly Card[]): RoundState {
  return stateWith({
    hands: { player: [...hand], cpu: [] },
    currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
    cursedCards,
  })
}

describe('playCard — a cursed card flips its trick', () => {
  it('AC5 — losing a trick carrying the player`s own curse is a DODGE: it banks, no health lost', () => {
    const state = quarryLed(bells9, [bells2], [bells2])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, { handFloor: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.Dodge)
    expect(result.state.lastResolution?.damageToPlayer).toBe(0)
    expect(result.state.total).toBeGreaterThan(0)
    expect(result.state.roll).toBe(1)
  })

  it('the same trick WITHOUT the curse is an ordinary clean loss that hurts', () => {
    const state = quarryLed(bells9, [bells2], [])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, { handFloor: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.CleanLoss)
    expect(result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(result.state.total).toBe(0)
  })

  it('AC5 — WINNING the trick you cursed eats the skull: it hurts and banks nothing', () => {
    const state = quarryLed(bells2, [bells9], [bells9])

    const result = playCard(state, PlayerSide.Player, bells9, undefined, { handFloor: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.SkullWin)
    expect(result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(result.state.total).toBe(0)
    expect(result.state.roll).toBe(0)
  })
})

/** The buffs riding this trick, as `playCard` takes them. */
function riding(active: readonly Buff[]): BuffHandInput {
  return {
    active,
    accrual: EMPTY_BUFF_ACCRUAL,
    firedThisHand: [],
    tricksWithoutHit: 0,
    coins: 0,
    playerHealth: 10,
    applyDamagePressed: false,
  }
}

/** A bronze Sidestep on the Blade axis — condition `skullTrick && !playerWon`, the exact shape a
 *  Curse-made dodge satisfies (AC9). */
function sidestepBuff(id: number): Buff {
  return mintFromTemplate(templateById('sidestep:magnitude')!, BuffTier.Bronze, id)
}

describe('playCard — Curse pays into the trick it cursed (AC6)', () => {
  it("adds a silver Curse's +2 to the dodged trick's damage", () => {
    const curse = curseBuff(BuffTier.Silver, 1)
    const state = quarryLed(bells9, [bells2], [bells2])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, {
      handFloor: 0,
      buffs: riding([curse]),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const damage = result.state.lastResolution?.trickDamage
    expect(damage?.base).toBe(BASE_DAMAGE + 2)
    expect(damage?.buffMult).toBe(1)
    expect(damage?.dealt).toBe(BASE_DAMAGE + 2)
  })

  it("adds a gold Curse's +1 multiplier as well", () => {
    const curse = curseBuff(BuffTier.Gold, 1)
    const state = quarryLed(bells9, [bells2], [bells2])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, {
      handFloor: 0,
      buffs: riding([curse]),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const damage = result.state.lastResolution?.trickDamage
    expect(damage?.base).toBe(BASE_DAMAGE + 2)
    expect(damage?.buffMult).toBe(2)
    expect(damage?.dealt).toBe((BASE_DAMAGE + 2) * 2)
  })

  it('pays NOTHING on a trick the player WON with the curse — self-gating (AC6)', () => {
    const curse = curseBuff(BuffTier.Gold, 1)
    const state = quarryLed(bells2, [bells9], [bells9])

    const result = playCard(state, PlayerSide.Player, bells9, undefined, {
      handFloor: 0,
      buffs: riding([curse]),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // The trick hurts, so it banks nothing at all; no "only on a dodge" condition exists.
    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.SkullWin)
    expect(result.state.lastResolution?.trickDamage).toBeNull()
    expect(result.state.total).toBe(0)
  })
})

describe('playCard — Sidestep fires on a Curse-made dodge (AC9)', () => {
  it('pays both cards on the same trick', () => {
    const curse = curseBuff(BuffTier.Silver, 1)
    const sidestep = sidestepBuff(2)
    const state = quarryLed(bells9, [bells2], [bells2])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, {
      handFloor: 0,
      buffs: riding([curse, sidestep]),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.Dodge)
    // Only Sidestep FIRES — a Curse is Activated and has no condition to come true.
    expect(result.state.lastResolution?.firedBuffIds).toEqual([sidestep.id])

    const damage = result.state.lastResolution?.trickDamage
    expect(damage?.base).toBe(BASE_DAMAGE + 2)
    expect(damage?.buffDamage).toBe(sidestep.reward.value)
    expect(damage?.dealt).toBe(BASE_DAMAGE + 2 + sidestep.reward.value)
  })

  it('does not fire Sidestep on the same trick without the curse', () => {
    const sidestep = sidestepBuff(2)
    const state = quarryLed(bells9, [bells2], [])

    const result = playCard(state, PlayerSide.Player, bells2, undefined, {
      handFloor: 0,
      buffs: riding([sidestep]),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.lastResolution?.outcome).toBe(TrickOutcome.CleanLoss)
    expect(result.state.lastResolution?.firedBuffIds).toEqual([])
  })
})

describe('playCard — the mark lapses at the trick`s resolution (AC7)', () => {
  it('clears the mark on the card that WAS played', () => {
    const state = quarryLed(bells9, [bells2], [bells2])
    const result = playCard(state, PlayerSide.Player, bells2, undefined, { handFloor: 0 })
    expect(result.ok && result.state.cursedCards).toEqual([])
  })

  it('clears the mark on a card that was NEVER played', () => {
    const state = quarryLed(bells9, [bells2, moons7], [moons7])
    const result = playCard(state, PlayerSide.Player, bells2, undefined, { handFloor: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The unplayed Moons 7 is still in hand, and no longer carries a skull.
    expect(result.state.hands[PlayerSide.Player]).toContainEqual(moons7)
    expect(result.state.cursedCards).toEqual([])
  })

  it('does NOT clear the mark on a LEAD — the trick has not resolved yet', () => {
    const state = stateWith({
      hands: { player: [bells2, moons7], cpu: [bells9] },
      currentTrick: [],
      leader: PlayerSide.Player,
      phase: RoundPhase.AwaitingLead,
      cursedCards: [moons7],
    })

    const result = playCard(state, PlayerSide.Player, bells2, undefined, { handFloor: 0 })
    expect(result.ok && result.state.cursedCards).toEqual([moons7])
  })
})
