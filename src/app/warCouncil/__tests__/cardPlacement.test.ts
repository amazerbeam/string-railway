import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { card, makeRound } from './roundFixture'
import { PlaceKind, diffPlacements, faceAt, placementsOf } from '../cardPlacement'
import { cardKey } from '../labels'

/**
 * DLR-157 Task 3 — `cardPlacement.ts` is PURE, so this spec is function-in, value-out: no
 * renderer, no DOM, plain `RoundState` fixtures built with `roundFixture.ts`'s `makeRound`
 * (`react-frontend`'s pure-logic testing posture).
 */

describe('placementsOf', () => {
  it('is total — every card across the six sources appears exactly once', () => {
    const round = makeRound()
    const placements = placementsOf(round)
    const expectedSize =
      round.drawPile.length +
      round.spentPile.length +
      round.hands[PlayerSide.Player].length +
      round.hands[PlayerSide.Cpu].length +
      round.currentTrick.length +
      1 // the decree
    expect(placements.size).toBe(expectedSize)
    for (const c of round.hands[PlayerSide.Player]) {
      expect(placements.get(cardKey(c))).toEqual({ kind: PlaceKind.PlayerHand, slot: cardKey(c) })
    }
    for (const c of round.hands[PlayerSide.Cpu]) {
      expect(placements.get(cardKey(c))).toEqual({ kind: PlaceKind.QuarryHand })
    }
    for (const c of round.drawPile) {
      expect(placements.get(cardKey(c))).toEqual({ kind: PlaceKind.DrawPile })
    }
    expect(placements.get(cardKey(round.decree))).toEqual({ kind: PlaceKind.DecreePlate })
  })
})

describe('faceAt', () => {
  it('is down for DrawPile, SpentPile and QuarryHand', () => {
    expect(faceAt({ kind: PlaceKind.DrawPile })).toBe('down')
    expect(faceAt({ kind: PlaceKind.SpentPile })).toBe('down')
    expect(faceAt({ kind: PlaceKind.QuarryHand })).toBe('down')
  })

  it('is up for every other kind', () => {
    expect(faceAt({ kind: PlaceKind.PlayerHand, slot: 'x' })).toBe('up')
    expect(faceAt({ kind: PlaceKind.TrickWell })).toBe('up')
    expect(faceAt({ kind: PlaceKind.DecreePlate })).toBe('up')
    expect(faceAt({ kind: PlaceKind.AbilityPrompt })).toBe('up')
    expect(faceAt({ kind: PlaceKind.BuffGallery })).toBe('up')
    expect(faceAt({ kind: PlaceKind.RidingStrip })).toBe('up')
    expect(faceAt({ kind: PlaceKind.HeldTray })).toBe('up')
  })
})

describe('diffPlacements', () => {
  it('returns no movements for two identical maps', () => {
    const round = makeRound()
    const placements = placementsOf(round)
    expect(diffPlacements(placements, placements)).toEqual([])
  })

  it('emits no movement for a card present in next but absent from prev', () => {
    const prev = new Map<string, { kind: PlaceKind }>()
    const next = new Map([[cardKey(card(Suit.Bells, 2)), { kind: PlaceKind.PlayerHand }]])
    expect(diffPlacements(prev, next)).toEqual([])
  })

  it('M3+M4 — the trick closes and the player refills in the same commit', () => {
    const played1 = card(Suit.Bells, 3)
    const played2 = card(Suit.Keys, 4)
    const refill = card(Suit.Moons, 4)
    const round = makeRound({
      currentTrick: [
        { side: PlayerSide.Player, card: played1 },
        { side: PlayerSide.Cpu, card: played2 },
      ],
      drawPile: [refill],
    })
    const prev = placementsOf(round)

    const closed = makeRound({
      currentTrick: [],
      spentPile: [played1, played2],
      drawPile: [],
      hands: {
        ...round.hands,
        [PlayerSide.Player]: [...round.hands[PlayerSide.Player], refill],
      },
    })
    const next = placementsOf(closed)

    const movements = diffPlacements(prev, next)
    expect(movements).toHaveLength(3)
    expect(movements).toEqual(
      expect.arrayContaining([
        {
          cardKey: cardKey(played1),
          from: { kind: PlaceKind.TrickWell },
          to: { kind: PlaceKind.SpentPile },
        },
        {
          cardKey: cardKey(played2),
          from: { kind: PlaceKind.TrickWell },
          to: { kind: PlaceKind.SpentPile },
        },
        {
          cardKey: cardKey(refill),
          from: { kind: PlaceKind.DrawPile },
          to: { kind: PlaceKind.PlayerHand, slot: cardKey(refill) },
        },
      ]),
    )
  })

  it('M9+M10 — a discard goes to the bottom of the draw pile, not a discard/spent pile', () => {
    const discarded = card(Suit.Bells, 2)
    const drawn = card(Suit.Moons, 6)
    const round = makeRound({ drawPile: [drawn] })
    const prev = placementsOf(round)

    const afterDiscard = makeRound({
      drawPile: [discarded],
      hands: {
        ...round.hands,
        [PlayerSide.Player]: round.hands[PlayerSide.Player]
          .filter((c) => cardKey(c) !== cardKey(discarded))
          .concat(drawn),
      },
    })
    const next = placementsOf(afterDiscard)

    const movements = diffPlacements(prev, next)
    expect(movements).toEqual(
      expect.arrayContaining([
        {
          cardKey: cardKey(discarded),
          from: { kind: PlaceKind.PlayerHand, slot: cardKey(discarded) },
          to: { kind: PlaceKind.DrawPile },
        },
        {
          cardKey: cardKey(drawn),
          from: { kind: PlaceKind.DrawPile },
          to: { kind: PlaceKind.PlayerHand, slot: cardKey(drawn) },
        },
      ]),
    )
  })

  // DLR-157 Task 12's pinned per-movement assertions (M2, M5/M6/M7, M8, M11, M12+M13, M14) live in
  // `cardPlacementMovements.test.ts` — split out (QA fix, DLR-157 review) once this file passed
  // 400 lines.
})
