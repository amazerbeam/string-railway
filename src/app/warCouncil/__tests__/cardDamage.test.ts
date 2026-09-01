import { describe, expect, it } from 'vitest'
import {
  applyDamage,
  BuffTier,
  DAMAGE_PER_HIT,
  DuelSide,
  HAND_SIZE,
  queueTimebomb,
  startEncounter,
  ALL_BRONZE,
  steppedTo,
  TieredRank,
  TIMEBOMB_DAMAGE,
  type RankTierTable,
} from '../../../hunt'
import { CardRank, PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { createRoundUiState } from '../roundUiState'
import { cardDamagePreview } from '../cardDamage'
import {
  baseDamageBonusFixture,
  blastGuardHeldFixture,
  card,
  discardsRemainingFixture,
  encounterFixture,
  makeRound,
} from './roundFixture'

function seededUi(
  overrides: Parameters<typeof makeRound>[0] = {},
  encounter = encounterFixture,
  rankTiers?: RankTierTable,
) {
  return createRoundUiState({
    round: makeRound(overrides),
    encounter,
    blastGuardHeld: blastGuardHeldFixture,
    baseDamageBonus: baseDamageBonusFixture,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
    rankTiers,
  })
}

describe('cardDamagePreview — the hand fan’s per-card win/lose readout, derived through the live resolution path (DLR-117)', () => {
  it('previews a clean lead with an empty bank: win costs the Quarry nothing, losing costs the player DAMAGE_PER_HIT', () => {
    const ui = seededUi()
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    expect(preview.win.toQuarry).toBe(0)
    expect(preview.lose.toPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('DLR-156 B1 — winPot states what taking a bare trick from an empty streak is worth: BASE_DAMAGE into the pot, at roll 1', () => {
    const ui = seededUi()
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    expect(preview.winPot.trickDamage).toBe(1)
    expect(preview.winPot.total).toBe(1)
    expect(preview.winPot.roll).toBe(1)
    expect(preview.winPot.pot).toBe(1)
  })

  it('DLR-156 B1 — winPot climbs with the seeded streak, which is what actually varies the readout now that win.toQuarry never does', () => {
    const empty = cardDamagePreview(seededUi(), card(Suit.Bells, 2))!
    const seeded = cardDamagePreview(seededUi({ total: 3, roll: 2 }), card(Suit.Bells, 2))!
    expect(seeded.winPot.pot).toBeGreaterThan(empty.winPot.pot)
    // The trick's OWN contribution is unchanged by the streak it lands on top of — only the
    // resulting total/roll/pot climb, per AC1/AC11 (nothing pools INTO this trick's own bracket).
    expect(seeded.winPot.trickDamage).toBe(empty.winPot.trickDamage)
  })

  it('DLR-156 AC7 — a hit pays the Quarry nothing, whatever the streak was worth', () => {
    const ui = seededUi({ total: 3, roll: 2 })
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    expect(preview.lose.toQuarry).toBe(0)
  })

  it('DLR-156 AC8 — the final trick of a hand still banks rather than cashing anything', () => {
    const ui = seededUi({ total: 1, roll: 1, tricksPlayed: HAND_SIZE - 1 })
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    // The end-of-hand cash-out is gone: a win on the last trick banks its own damage exactly as
    // any other taken trick would, and deals nothing to the Quarry through a resolution.
    expect(preview.win.toQuarry).toBe(0)
    // …but it is still real, and the pot readout still says so: total 1 -> 2, roll 1 -> 2, pot 4.
    expect(preview.winPot.pot).toBe(4)
  })

  it('is inexact while the player leads and exact once the Quarry’s lead is on the table', () => {
    const leading = seededUi({ currentTrick: [] })
    expect(cardDamagePreview(leading, card(Suit.Bells, 2))!.exact).toBe(false)

    const following = seededUi({
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 4) }],
      leader: PlayerSide.Cpu,
    })
    expect(cardDamagePreview(following, card(Suit.Bells, 2))!.exact).toBe(true)
  })

  it('inverts the branches on a skulled trick: winning costs the player, losing (dodging) costs nobody', () => {
    const quarryLead = card(Suit.Bells, 4)
    const ui = seededUi({
      currentTrick: [{ side: PlayerSide.Cpu, card: quarryLead }],
      leader: PlayerSide.Cpu,
      skulledCards: [quarryLead],
    })
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    expect(preview.win.toPlayer).toBe(DAMAGE_PER_HIT)
    expect(preview.lose.toPlayer).toBe(0)
    expect(preview.lose.toQuarry).toBe(0)
  })

  it('shows a Timebomb queued against the player in both branches, since it detonates whichever way the trick goes', () => {
    const encounter = queueTimebomb(
      encounterFixture,
      DuelSide.Player,
      TIMEBOMB_DAMAGE[BuffTier.Bronze],
    )
    const ui = seededUi({}, encounter)
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    // The Timebomb's own figure lands even on the WIN branch, where nothing else would hit the
    // player; the lose branch carries the same figure plus the ordinary DAMAGE_PER_HIT.
    expect(preview.win.toPlayer).toBeGreaterThan(0)
    expect(preview.lose.toPlayer).toBe(preview.win.toPlayer + DAMAGE_PER_HIT)
  })

  it('costs nothing to lose a primed card cleanly — DLR-90 AC5’s REPLACED clean loss', () => {
    const leadCard = card(Suit.Bells, 2)
    const ui = seededUi({ primedCards: [leadCard] })
    const preview = cardDamagePreview(ui, leadCard)!
    expect(preview.lose.toPlayer).toBe(0)
    expect(preview.lose.toQuarry).toBe(0)
  })

  it('returns null once the hand is complete', () => {
    const ui = seededUi({ phase: RoundPhase.Complete })
    expect(cardDamagePreview(ui, card(Suit.Bells, 2))).toBeNull()
  })

  it('returns null once the encounter is already resolved', () => {
    const lethal = { [DuelSide.Player]: 0, [DuelSide.Quarry]: quarryStartHealth() }
    const resolved = applyDamage(startEncounter(0), lethal)
    const ui = seededUi({}, resolved)
    expect(cardDamagePreview(ui, card(Suit.Bells, 2))).toBeNull()
  })

  it('is pure: calling it twice on the same state returns deeply equal values and leaves the encounter unchanged', () => {
    const ui = seededUi({ total: 3, roll: 2 })
    const before = ui.encounter
    const first = cardDamagePreview(ui, card(Suit.Bells, 2))
    const second = cardDamagePreview(ui, card(Suit.Bells, 2))
    expect(first).toEqual(second)
    expect(ui.encounter).toBe(before)
  })
})

/** The Quarry's starting health for encounter 0 — enough to build a lethal `IncomingDamage`
 *  without restating the encounter's own arithmetic. */
function quarryStartHealth(): number {
  return startEncounter(0).health[DuelSide.Quarry]
}

describe('the preview reads the rank-tier ladder the commit will (DLR-122)', () => {
  const GOLD_SWAN = steppedTo(steppedTo(ALL_BRONZE, TieredRank.Swan), TieredRank.Swan)
  const swan = card(Suit.Bells, CardRank.Swan)

  it('shows a clean loss costing health either way — DLR-156 AC7 pays the Quarry nothing at any tier', () => {
    const bronze = seededUi({ total: 3, roll: 2 })
    const gold = seededUi({ total: 3, roll: 2 }, encounterFixture, GOLD_SWAN)
    const bronzeLose = cardDamagePreview(bronze, swan)!.lose
    const goldLose = cardDamagePreview(gold, swan)!.lose
    expect(bronzeLose.toQuarry).toBe(0)
    expect(goldLose.toQuarry).toBe(0)
    expect(goldLose.toPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('leaves the preview unchanged for a card that is not a Swan', () => {
    const bronze = cardDamagePreview(seededUi({ total: 3, roll: 2 }), card(Suit.Bells, 2))!
    const gold = cardDamagePreview(
      seededUi({ total: 3, roll: 2 }, encounterFixture, GOLD_SWAN),
      card(Suit.Bells, 2),
    )!
    expect(gold).toEqual(bronze)
  })
})
