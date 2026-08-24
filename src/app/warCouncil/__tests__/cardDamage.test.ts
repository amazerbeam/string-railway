import { describe, expect, it } from 'vitest'
import {
  applyDamage,
  DAMAGE_PER_HIT,
  DuelSide,
  HAND_SIZE,
  queueTimebomb,
  startEncounter,
  ALL_BRONZE,
  steppedTo,
  TieredRank,
  type RankTierTable,
} from '../../../hunt'
import {
  CardRank,
  cashValue,
  forcedCashValue,
  PlayerSide,
  RoundPhase,
  Suit,
} from '../../../warCouncil'
import { createRoundUiState } from '../roundUiState'
import { cardDamagePreview } from '../cardDamage'
import {
  bankClimbBonusFixture,
  blastGuardHeldFixture,
  card,
  discardsRemainingFixture,
  encounterFixture,
  makeRound,
  timebombChargesFixture,
} from './roundFixture'

function seededUi(
  overrides: Parameters<typeof makeRound>[0] = {},
  encounter = encounterFixture,
  rankTiers?: RankTierTable,
) {
  return createRoundUiState({
    round: makeRound(overrides),
    encounter,
    cheats: [],
    timebombCharges: timebombChargesFixture,
    blastGuardHeld: blastGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
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

  it('reads the lose branch’s cash-out off forcedCashValue, never a recomputed figure', () => {
    const ui = seededUi({ bank: 3, multiplier: 2 })
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    expect(preview.lose.toQuarry).toBe(forcedCashValue(3, 2))
  })

  it('fires the end-of-hand cash on the final trick’s win branch', () => {
    const ui = seededUi({ bank: 1, multiplier: 1, tricksPlayed: HAND_SIZE - 1 })
    const preview = cardDamagePreview(ui, card(Suit.Bells, 2))!
    // A win banks the trick first (bank+1, multiplier+1), then the end-of-hand cash fires on that
    // post-take total — read off `cashValue`, never restated. Kept well under the Quarry's health
    // so the delta this module reads is the full cash-out, not a health floor truncating it.
    expect(preview.win.toQuarry).toBe(cashValue(2, 2))
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
    const encounter = queueTimebomb(encounterFixture, DuelSide.Player)
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
    const ui = seededUi({ bank: 3, multiplier: 2 })
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

  it('shows a clean loss costing health but not the bank once the Swan is at gold (AC5)', () => {
    const bronze = seededUi({ bank: 3, multiplier: 2 })
    const gold = seededUi({ bank: 3, multiplier: 2 }, encounterFixture, GOLD_SWAN)
    // Bronze: the forced cash-out is dealt to the Quarry, exactly as the assertion above states.
    expect(cardDamagePreview(bronze, swan)!.lose.toQuarry).toBe(forcedCashValue(3, 2))
    // Gold: nothing cashes, so the Quarry takes nothing — but the player still takes the hit.
    const goldLose = cardDamagePreview(gold, swan)!.lose
    expect(goldLose.toQuarry).toBe(0)
    expect(goldLose.toPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('leaves the preview unchanged for a card that is not a Swan', () => {
    const bronze = cardDamagePreview(seededUi({ bank: 3, multiplier: 2 }), card(Suit.Bells, 2))!
    const gold = cardDamagePreview(
      seededUi({ bank: 3, multiplier: 2 }, encounterFixture, GOLD_SWAN),
      card(Suit.Bells, 2),
    )!
    expect(gold).toEqual(bronze)
  })
})
