import { describe, expect, it } from 'vitest'
import { PlaceKind, type CardMovement } from '../cardPlacement'
import { PILE_COLLAPSE_THRESHOLD, planMovements } from '../cardMotionPlan'

/**
 * DLR-157 Task 4 — `cardMotionPlan.ts` is PURE: function-in, value-out, no DOM, no clock, no
 * randomness. Tested the same way `cardPlacement.test.ts` is.
 */

function movement(
  cardKey: string,
  from: CardMovement['from'],
  to: CardMovement['to'],
): CardMovement {
  return { cardKey, from, to }
}

describe('planMovements — the stagger', () => {
  it('assigns delays 0, s, 2s, … for n movements', () => {
    const movements = [
      movement('a', { kind: PlaceKind.PlayerHand, slot: 'a' }, { kind: PlaceKind.TrickWell }),
      movement('b', { kind: PlaceKind.DecreePlate }, { kind: PlaceKind.PlayerHand, slot: 'b' }),
      movement(
        'c',
        { kind: PlaceKind.BuffGallery, slot: 'c' },
        { kind: PlaceKind.RidingStrip, slot: 'c' },
      ),
    ]
    const requests = planMovements(movements, 70)
    expect(requests.map((r) => r.delayMs)).toEqual([0, 70, 140])
  })

  it('assigns every delay 0 under a zero stagger', () => {
    const movements = [
      movement('a', { kind: PlaceKind.PlayerHand, slot: 'a' }, { kind: PlaceKind.TrickWell }),
      movement('b', { kind: PlaceKind.DecreePlate }, { kind: PlaceKind.PlayerHand, slot: 'b' }),
    ]
    const requests = planMovements(movements, 0)
    expect(requests.map((r) => r.delayMs)).toEqual([0, 0])
  })
})

describe('planMovements — the flip', () => {
  it('flips the Quarry hand → trick well movement (down → up)', () => {
    const [request] = planMovements(
      [movement('a', { kind: PlaceKind.QuarryHand }, { kind: PlaceKind.TrickWell })],
      70,
    )
    expect(request.flip).toBe(true)
  })

  it('does not flip the player hand → trick well movement (up → up)', () => {
    const [request] = planMovements(
      [movement('a', { kind: PlaceKind.PlayerHand, slot: 'a' }, { kind: PlaceKind.TrickWell })],
      70,
    )
    expect(request.flip).toBe(false)
  })
})

describe('planMovements — hide', () => {
  it('hides "to" for an arrival into an addressable, face-up place', () => {
    const [request] = planMovements(
      [movement('a', { kind: PlaceKind.DrawPile }, { kind: PlaceKind.PlayerHand, slot: 'a' })],
      70,
    )
    expect(request.hide).toBe('to')
  })

  it('hides "from" for a departure into an unaddressable, face-down pile', () => {
    const [request] = planMovements(
      [movement('a', { kind: PlaceKind.TrickWell }, { kind: PlaceKind.SpentPile })],
      70,
    )
    expect(request.hide).toBe('from')
  })
})

describe('planMovements — the pile collapse (M8, M14)', () => {
  function pileMovements(count: number): CardMovement[] {
    return Array.from({ length: count }, (_, i) =>
      movement(`c${i}`, { kind: PlaceKind.SpentPile }, { kind: PlaceKind.DrawPile }),
    )
  }

  it('collapses a group above the threshold to a single representative request', () => {
    const requests = planMovements(pileMovements(PILE_COLLAPSE_THRESHOLD + 1), 70)
    expect(requests).toHaveLength(1)
    expect(requests[0].cardKey).toBeUndefined()
    expect(requests[0].from).toEqual({ kind: PlaceKind.SpentPile })
    expect(requests[0].to).toEqual({ kind: PlaceKind.DrawPile })
  })

  it('does not collapse a group at or under the threshold', () => {
    const requests = planMovements(pileMovements(PILE_COLLAPSE_THRESHOLD), 70)
    expect(requests).toHaveLength(PILE_COLLAPSE_THRESHOLD)
    for (const request of requests) {
      expect(request.cardKey).toBeDefined()
    }
  })
})

describe('planMovements — the deal at the real HAND_SIZE (QA Finding 1 regression)', () => {
  const HAND_SIZE = 6

  function dealMovements(count: number): CardMovement[] {
    return Array.from({ length: count }, (_, i) =>
      movement(
        `c${i}`,
        { kind: PlaceKind.DrawPile },
        { kind: PlaceKind.PlayerHand, slot: `c${i}` },
      ),
    )
  }

  it('does NOT collapse a six-card deal into per-slot hand destinations — every card must fly', () => {
    // HAND_SIZE (6) is above PILE_COLLAPSE_THRESHOLD (3), but the destination IS addressable per
    // card (each movement carries its own distinguishing `to.slot`), so this must never collapse.
    const requests = planMovements(dealMovements(HAND_SIZE), 70)
    expect(requests).toHaveLength(HAND_SIZE)
    expect(requests.map((r) => r.delayMs)).toEqual([0, 70, 140, 210, 280, 350])
    for (let i = 0; i < HAND_SIZE; i++) {
      expect(requests[i].cardKey).toBe(`c${i}`)
      expect(requests[i].to).toEqual({ kind: PlaceKind.PlayerHand, slot: `c${i}` })
    }
  })

  it('still collapses a genuine pile-to-pile group of the same size (no distinguishing to.slot)', () => {
    const requests = planMovements(
      Array.from({ length: HAND_SIZE }, (_, i) =>
        movement(`q${i}`, { kind: PlaceKind.DrawPile }, { kind: PlaceKind.QuarryHand }),
      ),
      70,
    )
    expect(requests).toHaveLength(1)
    expect(requests[0].cardKey).toBeUndefined()
    expect(requests[0].to).toEqual({ kind: PlaceKind.QuarryHand })
  })
})
