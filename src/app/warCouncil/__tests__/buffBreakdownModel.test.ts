import { describe, expect, it } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { legalMoves, PlayerSide, Suit } from '../../../warCouncil'
import { breakdownFor, BreakdownBranch } from '../buffBreakdownModel'
import { lightsForHand } from '../buffRideModel'
import { createRoundUiState, type RoundUiState } from '../roundUiState'
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

const bellsTakerBlade = (id: number) =>
  mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, id)
const bellsTakerMomentum = (id: number) =>
  mintFromTemplate(templateById('taker:bells:multiplier')!, BuffTier.Bronze, id)
const moonsTaker = (id: number) =>
  mintFromTemplate(templateById('taker:moons:magnitude')!, BuffTier.Bronze, id)
const keysTaker = (id: number) =>
  mintFromTemplate(templateById('taker:keys:magnitude')!, BuffTier.Bronze, id)
const moonsFeeder = (id: number) =>
  mintFromTemplate(templateById('feeder:moons:magnitude')!, BuffTier.Bronze, id)
const bellsFeederMomentum = (id: number) =>
  mintFromTemplate(templateById('feeder:bells:multiplier')!, BuffTier.Bronze, id)

describe('breakdownFor', () => {
  it('returns null for a card with no light-map entry', () => {
    const ui = seededUi()
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    expect(breakdownFor(ui, legal, lights, card(Suit.Bells, 2))).toBeNull()
  })

  it('reports totals with exactly two entries, in branch order, carrying no preferred flag (AC11)', () => {
    const taker = bellsTakerBlade(1)
    const ui = activate(seededUi({}, [taker]), [taker.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    expect(breakdown.totals).toHaveLength(2)
    expect(breakdown.totals[0].branch).toBe(BreakdownBranch.Took)
    expect(breakdown.totals[1].branch).toBe(BreakdownBranch.DidNotTake)
    for (const totals of breakdown.totals) {
      expect(Object.keys(totals).sort()).toEqual(
        ['branch', 'carryText', 'damage', 'estimate', 'multiplier'].sort(),
      )
    }
  })

  it('marks the totals as an estimate when the skull is not yet knowable, rather than picking a reading silently (Fix 3)', () => {
    // makeRound's defaults are a lead (leader: Player, currentTrick: []) with an unskulled
    // candidate — `skullReadingFor` returns null, so `projectBuffBranches` returns TWO outcomes
    // per branch and `totalsFor` used to pick outcomes[0] and render it as a flat certainty.
    const taker = bellsTakerBlade(1)
    const ui = activate(seededUi({}, [taker]), [taker.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    for (const totals of breakdown.totals) {
      expect(totals.estimate).toBe(true)
    }
  })

  it('does not mark the totals as an estimate once the skull is known — a follow with the Quarry already on the table', () => {
    const taker = bellsTakerBlade(1)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 9) }],
          leader: PlayerSide.Cpu,
        },
        [taker],
      ),
      [taker.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    for (const totals of breakdown.totals) {
      expect(totals.estimate).toBe(false)
    }
  })

  it('rates the Overlap Bonus off the higher-firing branch and hides the row when it is zero (AC11)', () => {
    const single = bellsTakerBlade(1)
    const soloUi = activate(seededUi({}, [single]), [single.id])
    const soloLegal = legalMoves(soloUi.round, PlayerSide.Player)
    const soloLights = lightsForHand(soloUi, soloLegal)
    expect(breakdownFor(soloUi, soloLegal, soloLights, card(Suit.Bells, 2))!.overlapText).toBeNull()

    const blade = bellsTakerBlade(1)
    const momentum = bellsTakerMomentum(2)
    const pairUi = activate(seededUi({}, [blade, momentum]), [blade.id, momentum.id])
    const pairLegal = legalMoves(pairUi.round, PlayerSide.Player)
    const pairLights = lightsForHand(pairUi, pairLegal)
    const pairBreakdown = breakdownFor(pairUi, pairLegal, pairLights, card(Suit.Bells, 2))!
    expect(pairBreakdown.overlapText).not.toBeNull()
    expect(pairBreakdown.overlapText).toContain('1')
  })

  it('names the buff on every condition row, and two Takers of the same suit share the condition text but not the name (AC11)', () => {
    const blade = bellsTakerBlade(1)
    const momentum = bellsTakerMomentum(2)
    const ui = activate(seededUi({}, [blade, momentum]), [blade.id, momentum.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    const took = breakdown.groups.find((g) => g.branch === BreakdownBranch.Took)!
    expect(took.rows).toHaveLength(2)
    for (const row of took.rows) {
      expect(row.buffNameText.length).toBeGreaterThan(0)
    }
    expect(took.rows[0].conditionText).toBe(took.rows[1].conditionText)
    expect(took.rows[0].buffNameText).not.toBe(took.rows[1].buffNameText)
  })

  it('strikes a riding buff that cannot fire on this card, naming both suits and its reach elsewhere (AC12)', () => {
    const lighter = moonsTaker(1)
    const dead = keysTaker(2)
    const ui = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
          leader: PlayerSide.Cpu,
        },
        [lighter, dead],
      ),
      [lighter.id, dead.id],
    )
    const legal = legalMoves(ui.round, PlayerSide.Player)
    expect(legal.some((c) => c.suit === Suit.Keys)).toBe(false)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Moons, 5))!
    expect(breakdown.dead).toHaveLength(1)
    const [row] = breakdown.dead
    expect(row.buff.id).toBe(dead.id)
    expect(row.reasonText).toContain('Keys')
    expect(row.reasonText).toContain('Moons')
    expect(row.elsewhereText).toBe(' No card in your hand can fire it.')
  })

  it('names a dead buff’s reach elsewhere when it is non-zero (AC12)', () => {
    const bells = bellsTakerBlade(1)
    const moons = moonsFeeder(2)
    const ui = activate(seededUi({}, [bells, moons]), [bells.id, moons.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    const row = breakdown.dead.find((d) => d.buff.id === moons.id)!
    expect(row.elsewhereText).toContain('2')
    expect(row.elsewhereText).toContain('instead')
  })

  it('places dead rows first, furthest from the card, in the returned shape', () => {
    const bells = bellsTakerBlade(1)
    const moons = moonsFeeder(2)
    const ui = activate(seededUi({}, [bells, moons]), [bells.id, moons.id])
    const legal = legalMoves(ui.round, PlayerSide.Player)
    const lights = lightsForHand(ui, legal)
    const breakdown = breakdownFor(ui, legal, lights, card(Suit.Bells, 2))!
    expect(Object.keys(breakdown).indexOf('dead')).toBeLessThan(
      Object.keys(breakdown).indexOf('totals'),
    )
  })

  it('carries a Feeder’s reward on a Clean Loss and pays it ordinarily on a Dodge (DLR-150)', () => {
    const feeder = bellsFeederMomentum(1)
    const led = card(Suit.Bells, 9)
    const candidate = card(Suit.Bells, 2)

    const cleanLossUi = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: led }],
          leader: PlayerSide.Cpu,
          skulledCards: [],
        },
        [feeder],
      ),
      [feeder.id],
    )
    const cleanLegal = legalMoves(cleanLossUi.round, PlayerSide.Player)
    const cleanLights = lightsForHand(cleanLossUi, cleanLegal)
    const cleanBreakdown = breakdownFor(cleanLossUi, cleanLegal, cleanLights, candidate)!
    expect(cleanBreakdown.totals[1].branch).toBe(BreakdownBranch.DidNotTake)
    expect(cleanBreakdown.totals[1].carryText).not.toBeNull()
    expect(cleanBreakdown.totals[1].multiplier).toBe(0)

    const dodgeUi = activate(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: led }],
          leader: PlayerSide.Cpu,
          skulledCards: [led],
        },
        [feeder],
      ),
      [feeder.id],
    )
    const dodgeLegal = legalMoves(dodgeUi.round, PlayerSide.Player)
    const dodgeLights = lightsForHand(dodgeUi, dodgeLegal)
    const dodgeBreakdown = breakdownFor(dodgeUi, dodgeLegal, dodgeLights, candidate)!
    expect(dodgeBreakdown.totals[1].carryText).toBeNull()
    expect(dodgeBreakdown.totals[1].multiplier).toBeGreaterThan(0)
  })
})
