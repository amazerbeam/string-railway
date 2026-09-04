import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  mintFromTemplate,
  templateById,
  type Buff,
} from '../../../hunt'
import { legalMoves, PlayerSide, Suit } from '../../../warCouncil'
import { buffHandInputFor } from '../buffRoundState'
import { createRoundUiState, type RoundUiState } from '../roundUiState'
import {
  lightsForHand,
  ridingRowsFor,
  rideInputFor,
  skullReadingFor,
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
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

function activate(ui: RoundUiState, ids: readonly number[]): RoundUiState {
  return { ...ui, buffActivation: { ...ui.buffActivation, activatedThisTrick: ids } }
}

const bellsHigh = (id: number) =>
  mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, id)
const bellsHighMomentum = (id: number) =>
  mintFromTemplate(templateById('suitHigh:bells:multiplier')!, BuffTier.Bronze, id)
const bellsLow = (id: number) =>
  mintFromTemplate(templateById('suitLow:bells:multiplier')!, BuffTier.Bronze, id)
const skullLow = (id: number) =>
  mintFromTemplate(templateById('skullLow:magnitude')!, BuffTier.Bronze, id)
const cheat = (id: number) => mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, id)

describe('rideInputFor', () => {
  it('reuses buffHandInputFor(state) for every field it shares, so the preview and the commit cannot disagree', () => {
    const suitHigh = bellsHigh(1)
    const ui = activate(seededUi({}, [suitHigh]), [suitHigh.id])
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
  it('lights only the legal Bells cards for a riding Bell High (AC2)', () => {
    const suitHigh = bellsHigh(1)
    const ui = activate(seededUi({}, [suitHigh]), [suitHigh.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    expect(lights.has(cardKey(card(Suit.Bells, 2)))).toBe(true)
    expect(lights.has(cardKey(card(Suit.Bells, 7)))).toBe(true)
    expect(lights.has(cardKey(card(Suit.Keys, 3)))).toBe(false)
    expect(lights.has(cardKey(card(Suit.Moons, 5)))).toBe(false)
  })

  it('lights every legal card for a suitless riding Skull Low, as an estimate (AC2, Assumption 5)', () => {
    const card = skullLow(1)
    const ui = activate(seededUi({}, [card]), [card.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    for (const c of legal) {
      const light = lights.get(cardKey(c))
      expect(light).toBeDefined()
      expect(light!.estimate).toBe(true)
    }
  })

  it('never lights a card the follow-suit rule makes illegal, even when it would otherwise match (AC3)', () => {
    const suitHigh = bellsHigh(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [suitHigh],
      ),
      [suitHigh.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    expect(legal.some((c) => c.suit === Suit.Bells)).toBe(false)
    const lights = lightsForHand(ui, legal)
    expect(lights.size).toBe(0)
  })

  it('counts a card reached on both branches as ONE, never the sum of both branches (AC4)', () => {
    const suitHigh = bellsHigh(1)
    const suitLow = bellsLow(2)
    const ui = activate(seededUi({}, [suitHigh, suitLow]), [suitHigh.id, suitLow.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const light = lightsForHand(ui, legal).get(cardKey(card(Suit.Bells, 2)))
    expect(light!.count).toBe(1)
  })

  it('counts two buffs firing on the SAME branch as two (AC4)', () => {
    const suitHigh1 = bellsHigh(1)
    const suitHigh2 = bellsHighMomentum(2)
    const ui = activate(seededUi({}, [suitHigh1, suitHigh2]), [suitHigh1.id, suitHigh2.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const light = lightsForHand(ui, legal).get(cardKey(card(Suit.Bells, 2)))
    expect(light!.count).toBe(2)
  })
})

describe('ridingRowsFor', () => {
  it('returns one row per activated id, revocable for condition families and not for Cheat (AC9)', () => {
    const suitHigh = bellsHigh(1)
    const cheatCard = cheat(2)
    const ui = activate(seededUi({}, [suitHigh, cheatCard]), [suitHigh.id, cheatCard.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const rows = ridingRowsFor(ui, legal)
    expect(rows).toHaveLength(2)
    const suitHighRow = rows.find((row) => row.buff.id === suitHigh.id)!
    const cheatRow = rows.find((row) => row.buff.id === cheatCard.id)!
    expect(suitHighRow.revocable).toBe(true)
    expect(cheatRow.revocable).toBe(false)
  })

  it('reports a zero reach for a riding buff whose suit is absent from the legal hand, and still lists it (AC9)', () => {
    const suitHigh = bellsHigh(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [suitHigh],
      ),
      [suitHigh.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const rows = ridingRowsFor(ui, legal)
    expect(rows).toHaveLength(1)
    expect(rows[0].reach).toBe(0)
  })

  it('excludes an illegal matching card from reach (AC3)', () => {
    const suitHigh = bellsHigh(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [suitHigh],
      ),
      [suitHigh.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    // A Bells card is in the hand but not in `legal` — must not count.
    expect(legal.some((c) => c.suit === Suit.Bells)).toBe(false)
    expect(ridingRowsFor(ui, legal)[0].reach).toBe(0)
  })
})
