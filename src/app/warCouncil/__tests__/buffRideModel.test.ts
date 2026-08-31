import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  mintFromTemplate,
  templateById,
  timebombBuff,
  timebombDamageOf,
  type Buff,
} from '../../../hunt'
import { legalMoves, PlayerSide, Suit } from '../../../warCouncil'
import { buffHandInputFor } from '../buffRoundState'
import { createRoundUiState, type RoundUiState } from '../roundUiState'
import {
  lightsForHand,
  ridingTimebombId,
  ridingRowsFor,
  rideInputFor,
  skullReadingFor,
  timebombTargetFor,
} from '../buffRideModel'
import { cardKey } from '../labels'
import { card, discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

function seededUi(
  overrides: Parameters<typeof makeRound>[0] = {},
  buffs: readonly Buff[] = [],
): RoundUiState {
  return createRoundUiState({
    round: makeRound(overrides),
    encounter: encounterFixture,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

function activate(ui: RoundUiState, ids: readonly number[]): RoundUiState {
  return { ...ui, buffActivation: { ...ui.buffActivation, activatedThisTrick: ids } }
}

const bellsTaker = (id: number) =>
  mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, id)
const bellsTakerMomentum = (id: number) =>
  mintFromTemplate(templateById('taker:bells:multiplier')!, BuffTier.Bronze, id)
const bellsFeeder = (id: number) =>
  mintFromTemplate(templateById('feeder:bells:multiplier')!, BuffTier.Bronze, id)
const sidestep = (id: number) =>
  mintFromTemplate(templateById('sidestep:magnitude')!, BuffTier.Bronze, id)
const cheat = (id: number) => mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, id)

describe('rideInputFor', () => {
  it('reuses buffHandInputFor(state) for every field it shares, so the preview and the commit cannot disagree', () => {
    const taker = bellsTaker(1)
    const ui = activate(seededUi({}, [taker]), [taker.id])
    const rideInput = rideInputFor(ui)
    const commitInput = buffHandInputFor(ui)
    expect(rideInput.active).toEqual(commitInput.active)
    expect(rideInput.accrual).toEqual(commitInput.accrual)
    expect(rideInput.firedThisHand).toEqual(commitInput.firedThisHand)
    expect(rideInput.facts.tricksWithoutHit).toBe(commitInput.tricksWithoutHit)
    expect(rideInput.facts.coins).toBe(commitInput.coins)
    expect(rideInput.facts.playerHealth).toBe(commitInput.playerHealth)
    expect(rideInput.facts.applyDamagePressed).toBe(commitInput.applyDamagePressed)
  })
})

describe('skullReadingFor', () => {
  it('reads true when the candidate itself carries a skull, even while the player leads (Assumption 4)', () => {
    const bells2 = card(Suit.Bells, 2)
    const ui = seededUi({ skulledCards: [bells2], currentTrick: [] })
    expect(skullReadingFor(ui, bells2)).toBe(true)
  })

  it('is null (not knowable) for an unskulled candidate while the player leads', () => {
    const ui = seededUi({ currentTrick: [] })
    expect(skullReadingFor(ui, card(Suit.Bells, 2))).toBeNull()
  })

  it('reads the visible trick once the Quarry has led', () => {
    const quarryLead = card(Suit.Keys, 6)
    const candidate = card(Suit.Bells, 2)
    const ui = seededUi({
      currentTrick: [{ side: PlayerSide.Cpu, card: quarryLead }],
      leader: PlayerSide.Cpu,
      skulledCards: [quarryLead],
    })
    expect(skullReadingFor(ui, candidate)).toBe(true)
    const clean = seededUi({
      currentTrick: [{ side: PlayerSide.Cpu, card: quarryLead }],
      leader: PlayerSide.Cpu,
      skulledCards: [],
    })
    expect(skullReadingFor(clean, candidate)).toBe(false)
  })
})

describe('lightsForHand', () => {
  it('lights only the legal Bells cards for a riding Bells Taker (AC2)', () => {
    const taker = bellsTaker(1)
    const ui = activate(seededUi({}, [taker]), [taker.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    expect(lights.has(cardKey(card(Suit.Bells, 2)))).toBe(true)
    expect(lights.has(cardKey(card(Suit.Bells, 7)))).toBe(true)
    expect(lights.has(cardKey(card(Suit.Keys, 3)))).toBe(false)
    expect(lights.has(cardKey(card(Suit.Moons, 5)))).toBe(false)
  })

  it('lights every legal card for a suitless riding Sidestep, as an estimate (AC2, Assumption 5)', () => {
    const dodge = sidestep(1)
    const ui = activate(seededUi({}, [dodge]), [dodge.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    for (const c of legal) {
      const light = lights.get(cardKey(c))
      expect(light).toBeDefined()
      expect(light!.estimate).toBe(true)
    }
  })

  it('never lights a card the follow-suit rule makes illegal, even when it would otherwise match (AC3)', () => {
    const taker = bellsTaker(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [taker],
      ),
      [taker.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    expect(legal.some((c) => c.suit === Suit.Bells)).toBe(false)
    const lights = lightsForHand(ui, legal)
    expect(lights.size).toBe(0)
  })

  it('counts a card reached on both branches as ONE, never the sum of both branches (AC4)', () => {
    const taker = bellsTaker(1)
    const feeder = bellsFeeder(2)
    const ui = activate(seededUi({}, [taker, feeder]), [taker.id, feeder.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const light = lightsForHand(ui, legal).get(cardKey(card(Suit.Bells, 2)))
    expect(light!.count).toBe(1)
  })

  it('counts two buffs firing on the SAME branch as two (AC4)', () => {
    const taker1 = bellsTaker(1)
    const taker2 = bellsTakerMomentum(2)
    const ui = activate(seededUi({}, [taker1, taker2]), [taker1.id, taker2.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const light = lightsForHand(ui, legal).get(cardKey(card(Suit.Bells, 2)))
    expect(light!.count).toBe(2)
  })
})

describe('ridingRowsFor', () => {
  it('returns one row per activated id, revocable for condition families and not for Cheat (AC9)', () => {
    const taker = bellsTaker(1)
    const cheatCard = cheat(2)
    const ui = activate(seededUi({}, [taker, cheatCard]), [taker.id, cheatCard.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const rows = ridingRowsFor(ui, legal)
    expect(rows).toHaveLength(2)
    const takerRow = rows.find((row) => row.buff.id === taker.id)!
    const cheatRow = rows.find((row) => row.buff.id === cheatCard.id)!
    expect(takerRow.revocable).toBe(true)
    expect(cheatRow.revocable).toBe(false)
  })

  it('reports a zero reach for a riding buff whose suit is absent from the legal hand, and still lists it (AC9)', () => {
    const taker = bellsTaker(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [taker],
      ),
      [taker.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const rows = ridingRowsFor(ui, legal)
    expect(rows).toHaveLength(1)
    expect(rows[0].reach).toBe(0)
  })

  it('excludes an illegal matching card from reach (AC3)', () => {
    const taker = bellsTaker(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [taker],
      ),
      [taker.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    // A Bells card is in the hand but not in `legal` — must not count.
    expect(legal.some((c) => c.suit === Suit.Bells)).toBe(false)
    expect(ridingRowsFor(ui, legal)[0].reach).toBe(0)
  })
})

describe('timebombTargetFor / ridingTimebombId', () => {
  const five = card(Suit.Bells, 7)
  const timebombCard = timebombBuff(BuffTier.Bronze, 9)

  it('names the primed card as the Timebomb row target — Assumption 3', () => {
    const primedUi = activate(seededUi({ primedCards: [five] }, [timebombCard]), [timebombCard.id])
    expect(timebombTargetFor(primedUi)).toEqual(five)
  })

  it('reports no target while the mode is still waiting for a card', () => {
    const armedUi = {
      ...activate(seededUi({}, [timebombCard]), [timebombCard.id]),
      timebombArmedDamage: timebombDamageOf(timebombCard),
    }
    expect(timebombTargetFor(armedUi)).toBeNull()
  })

  it('resolves the riding Timebomb id so Escape reaches the same removal — AC13', () => {
    // DLR-154 FIX 2 — `ridingTimebombId` reads `timebombBuff` directly, not `activatedThisTrick`
    // (which R3's two-trick fuse deliberately outlives past a trick boundary), so the fixture sets
    // that field rather than the trick-scoped list `activate` above simulates.
    const armedUi = { ...seededUi({}, [timebombCard]), timebombBuff: timebombCard }
    expect(ridingTimebombId(armedUi)).toBe(timebombCard.id)
  })
})
