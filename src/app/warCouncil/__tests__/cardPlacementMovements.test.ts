import { expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { HAND_SIZE } from '../../../hunt/config'
import { card, makeRound } from './roundFixture'
import { PlaceKind, diffPlacements, faceAt, placementsOf } from '../cardPlacement'
import { PILE_COLLAPSE_THRESHOLD, planMovements } from '../cardMotionPlan'
import { cardKey } from '../labels'

/**
 * DLR-157 Task 12 — one assertion per animated felt movement the inventory names, titled by its
 * own identifier so a regression names itself. Split out of `cardPlacement.test.ts` (QA fix,
 * DLR-157 review) once that file passed 400 lines — same PURE, function-in/value-out posture,
 * same fixtures.
 */

it('M2 — the Quarry leads: hand back → trick well, and flips', () => {
  const round = makeRound()
  const led = round.hands[PlayerSide.Cpu][0] // card(Suit.Bells, 4) in the default fixture
  const prev = placementsOf(round)

  const afterLead = makeRound({
    currentTrick: [{ side: PlayerSide.Cpu, card: led }],
    hands: {
      ...round.hands,
      [PlayerSide.Cpu]: round.hands[PlayerSide.Cpu].filter((c) => cardKey(c) !== cardKey(led)),
    },
  })
  const next = placementsOf(afterLead)

  const movements = diffPlacements(prev, next)
  expect(movements).toEqual([
    {
      cardKey: cardKey(led),
      from: { kind: PlaceKind.QuarryHand },
      to: { kind: PlaceKind.TrickWell },
    },
  ])
  expect(faceAt(movements[0].from)).toBe('down')
  expect(faceAt(movements[0].to)).toBe('up') // flips (AC6)
})

it('M5/M6/M7 — the deal: draw pile → both hands and the decree, all revealing except the Quarry', () => {
  const p1 = card(Suit.Bells, 1)
  const p2 = card(Suit.Bells, 2)
  const c1 = card(Suit.Keys, 3)
  const d1 = card(Suit.Moons, 4)
  const oldDecree = card(Suit.Moons, 99) // a sentinel — replaced by the deal, tracked nowhere else

  const round = makeRound({
    hands: { [PlayerSide.Player]: [], [PlayerSide.Cpu]: [] },
    drawPile: [p1, p2, c1, d1],
    decree: oldDecree,
  })
  const prev = placementsOf(round)

  const dealt = makeRound({
    hands: { [PlayerSide.Player]: [p1, p2], [PlayerSide.Cpu]: [c1] },
    drawPile: [],
    decree: d1,
  })
  const next = placementsOf(dealt)

  const movements = diffPlacements(prev, next)
  expect(movements).toHaveLength(4)
  expect(movements).toEqual(
    expect.arrayContaining([
      {
        cardKey: cardKey(p1),
        from: { kind: PlaceKind.DrawPile },
        to: { kind: PlaceKind.PlayerHand, slot: cardKey(p1) },
      },
      {
        cardKey: cardKey(p2),
        from: { kind: PlaceKind.DrawPile },
        to: { kind: PlaceKind.PlayerHand, slot: cardKey(p2) },
      },
      {
        cardKey: cardKey(c1),
        from: { kind: PlaceKind.DrawPile },
        to: { kind: PlaceKind.QuarryHand },
      },
      {
        cardKey: cardKey(d1),
        from: { kind: PlaceKind.DrawPile },
        to: { kind: PlaceKind.DecreePlate },
      },
    ]),
  )
  // M5 (player hand) and M7 (decree) flip; M6 (the Quarry's own hand) stays face down.
  const playerCardMove = movements.find((m) => m.cardKey === cardKey(p1))!
  const cpuCardMove = movements.find((m) => m.cardKey === cardKey(c1))!
  const decreeMove = movements.find((m) => m.cardKey === cardKey(d1))!
  expect(faceAt(playerCardMove.to)).toBe('up')
  expect(faceAt(cpuCardMove.to)).toBe('down')
  expect(faceAt(decreeMove.to)).toBe('up')
})

it('M5 at the real HAND_SIZE — a six-card deal into the player hand yields six separate, un-collapsed requests (QA Finding 1 regression)', () => {
  // HAND_SIZE (6) is above PILE_COLLAPSE_THRESHOLD (3). Above that threshold a genuine
  // pile-to-pile group collapses (see M8/M14 below) — but the player's hand IS addressable per
  // card (`PlaceKind.PlayerHand` is slotted by `cardKey`), so this group must never collapse.
  // Collapsing it resolves to an anchor `HandFan` never registers (`playerHand` with no `slot`),
  // and the entire deal lands instantly with zero animation.
  expect(HAND_SIZE).toBeGreaterThan(PILE_COLLAPSE_THRESHOLD)

  const dealt = Array.from({ length: HAND_SIZE }, (_, i) => card(Suit.Bells, i + 1))
  const round = makeRound({
    hands: { [PlayerSide.Player]: [], [PlayerSide.Cpu]: [] },
    drawPile: dealt,
  })
  const prev = placementsOf(round)

  const afterDeal = makeRound({
    hands: { [PlayerSide.Player]: dealt, [PlayerSide.Cpu]: [] },
    drawPile: [],
  })
  const next = placementsOf(afterDeal)

  const movements = diffPlacements(prev, next)
  expect(movements).toHaveLength(HAND_SIZE)

  const requests = planMovements(movements, 70)
  expect(requests).toHaveLength(HAND_SIZE) // NOT collapsed to one
  expect(requests.map((r) => r.delayMs)).toEqual([0, 70, 140, 210, 280, 350])
  for (const request of requests) {
    expect(request.cardKey).toBeDefined()
    expect(request.to.slot).toBeDefined()
  }
})

it('M8 — a reshuffle collapses to one pile-to-pile request, not one per card', () => {
  // Ranks well outside the default fixture's own cards (ranks 1–11), so none of these collides
  // with a card `makeRound`'s untouched fields (the hands, in particular) already place — a
  // collision would have the hand's own placement win and silently swallow the movement
  // `diffPlacements` is meant to report.
  const spent = Array.from({ length: PILE_COLLAPSE_THRESHOLD + 1 }, (_, i) =>
    card(Suit.Bells, 90 + i),
  )
  const round = makeRound({ spentPile: spent, drawPile: [] })
  const prev = placementsOf(round)

  const reshuffled = makeRound({ spentPile: [], drawPile: spent })
  const next = placementsOf(reshuffled)

  const movements = diffPlacements(prev, next)
  expect(movements).toHaveLength(spent.length)

  const requests = planMovements(movements, 70)
  expect(requests).toHaveLength(1)
  expect(requests[0].from).toEqual({ kind: PlaceKind.SpentPile })
  expect(requests[0].to).toEqual({ kind: PlaceKind.DrawPile })
  expect(requests[0].cardKey).toBeUndefined()
})

// DLR-163 AC1/AC2 — M11 was the Fox EXCHANGE, where a hand card and the decree card crossed. That
// rule is gone: naming a suit takes nothing from hand and sends the decree card to the spent pile,
// so the movement is one card in one direction and the hand does not move at all.
it('M11 — naming a suit: the decree card leaves for the spent pile and no hand card moves', () => {
  const round = makeRound()
  const decreeCard = round.decree
  if (decreeCard === null) throw new Error('expected a decree on the fixture')
  const prev = placementsOf(round)

  const named = makeRound({
    decree: null,
    spentPile: [...round.spentPile, decreeCard],
  })
  const next = placementsOf(named)

  const movements = diffPlacements(prev, next)
  expect(movements).toEqual([
    {
      cardKey: cardKey(decreeCard),
      from: { kind: PlaceKind.DecreePlate },
      to: { kind: PlaceKind.SpentPile },
    },
  ])
})

// DLR-163 — the PLAYER'S Woodcutter no longer draws and buries; the QUARRY'S still does, through
// `applyQuarrySwap`. The movement shape this pins is unchanged and is now the Quarry's, plus the
// player's own refill, which produces the same draw-pile-to-hand movement.
it('M12+M13 — a swap: the drawn card enters a hand as the buried card leaves it, in one commit', () => {
  const drawnCard = card(Suit.Moons, 2) // present in the default fixture's draw pile
  const buriedCard = card(Suit.Bells, 2) // an existing hand card
  const round = makeRound()
  const prev = placementsOf(round)

  // Mirrors `applyQuarrySwap` (`abilities.ts`): the drawn card joins the hand and the buried
  // card leaves it, landing at the bottom of the draw pile, in the SAME commit.
  const afterWoodcutter = makeRound({
    drawPile: round.drawPile.filter((c) => cardKey(c) !== cardKey(drawnCard)).concat(buriedCard),
    hands: {
      ...round.hands,
      [PlayerSide.Player]: round.hands[PlayerSide.Player]
        .filter((c) => cardKey(c) !== cardKey(buriedCard))
        .concat(drawnCard),
    },
  })
  const next = placementsOf(afterWoodcutter)

  const movements = diffPlacements(prev, next)
  expect(movements).toEqual(
    expect.arrayContaining([
      {
        cardKey: cardKey(drawnCard),
        from: { kind: PlaceKind.DrawPile },
        to: { kind: PlaceKind.PlayerHand, slot: cardKey(drawnCard) },
      },
      {
        cardKey: cardKey(buriedCard),
        from: { kind: PlaceKind.PlayerHand, slot: cardKey(buriedCard) },
        to: { kind: PlaceKind.DrawPile },
      },
    ]),
  )
})

it('M14 — the hand ends: the decree, both hands and the trick all sweep to the spent pile as one group', () => {
  const handCards = Array.from({ length: PILE_COLLAPSE_THRESHOLD + 1 }, (_, i) =>
    card(Suit.Bells, i + 1),
  )
  const decreeCard = card(Suit.Moons, 20)
  const round = makeRound({
    hands: { [PlayerSide.Player]: handCards, [PlayerSide.Cpu]: [] },
    currentTrick: [],
    decree: decreeCard,
    spentPile: [],
  })
  const prev = placementsOf(round)

  const closed = makeRound({
    hands: { [PlayerSide.Player]: [], [PlayerSide.Cpu]: [] },
    currentTrick: [],
    decree: decreeCard, // decree is non-optional on RoundState — the spent copy is untracked
    spentPile: [...handCards, decreeCard],
  })
  const next = placementsOf(closed)

  const movements = diffPlacements(prev, next)
  // The decree's own card key collides with its own unchanged placement (still "decree" at rest
  // per `placementsOf`'s single `map.set` for it) — this fixture pins the hand sweep, the shape
  // `closeHand` actually produces for the player's cards.
  expect(movements).toHaveLength(handCards.length)

  const requests = planMovements(movements, 70)
  expect(requests).toHaveLength(1) // collapses to one representative sweep, not n flights
  expect(requests[0].from).toEqual({ kind: PlaceKind.PlayerHand })
  expect(requests[0].to).toEqual({ kind: PlaceKind.SpentPile })
  expect(requests[0].cardKey).toBeUndefined()
})
