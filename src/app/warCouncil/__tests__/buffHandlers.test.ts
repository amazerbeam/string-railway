import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  ACTIVATED_BUFF_CONDITION,
  apCostOf,
  BuffActivationRefusal,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  CHEAT_DURATION_TRICKS,
  cheatBuff,
  mintFromTemplate,
  shieldHeartsForTier,
  STARTING_AP,
  templateById,
  timebombBuff,
  WARD_ABSORPTION,
  type Buff,
} from '../../../hunt'
import {
  cheatArmed,
  createRoundUiState,
  loadoutOpen,
  offeredBuffs,
  RoundUiActionKind,
  type RoundUiSeed,
} from '../roundUiState'
import { handleRemoveBuff, loadoutBarRefusalFor, loadoutRefusalFor } from '../buffHandlers'
import { roundReducer } from '../roundReducer'
import { makeRound, encounterFixture } from './roundFixture'

const cheat = cheatBuff(BuffTier.Bronze, 1)
const card = (suit: Suit, rank: number): Card => ({ suit, rank })

function seed(overrides: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(overrides),
    encounter: encounterFixture,
    blastGuardHeld: false,
    baseDamageBonus: 0,
    discardsRemaining: 2,
    buffs: [cheat],
  }
}

const open = (s = createRoundUiState(seed())) =>
  roundReducer(s, { kind: RoundUiActionKind.ToggleLoadout })

describe('the loadout panel — opening and closing', () => {
  it('ToggleLoadout opens it when the buff window is open', () => {
    expect(loadoutOpen(open())).toBe(true)
  })

  it('ToggleLoadout closes an open panel and drops any poise', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const closed = roundReducer(poised, { kind: RoundUiActionKind.ToggleLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })

  it('opening clears an armed card, so the next hand-card tap is never ambiguous', () => {
    const armed = roundReducer(createRoundUiState(seed()), {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Bells, 7),
    })
    expect(armed.armed).not.toBeNull()
    expect(open(armed).armed).toBeNull()
  })

  it('is refused mid-trick when neither side can act — the trick is complete and awaits its own resolution', () => {
    const midTrick = createRoundUiState(
      seed({ currentTrick: [{ side: PlayerSide.Player, card: card(Suit.Bells, 2) }] }),
    )
    expect(loadoutOpen(open(midTrick))).toBe(false)
  })

  it('opens mid-trick while the player is following an already-committed lead (DLR-114 door widening)', () => {
    // The Quarry has led; the trick is non-empty so `discardWindowOpen` is false, but it is the
    // player's own turn to follow, so `canAct` is true. This is exactly the reach the pre-DLR-114
    // felt-rail plates offered and the panel's relocation must not have narrowed: arming a Cheat
    // or Timebomb has value only while following an already-committed lead.
    const followingLead = createRoundUiState(
      seed({
        leader: PlayerSide.Cpu,
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 9) }],
      }),
    )
    expect(loadoutOpen(open(followingLead))).toBe(true)
    // The bar's own reading agrees with the transition it gates — same discipline every other
    // stock function in this codebase documents.
    expect(loadoutBarRefusalFor(followingLead)).toBeNull()
  })

  it('CancelLoadout closes without spending', () => {
    const closed = roundReducer(open(), { kind: RoundUiActionKind.CancelLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })
})

describe('activating a buff — poise, then commit', () => {
  it('the first tap poises and spends nothing', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(poised.loadout?.poised).toBe(cheat.id)
    expect(poised.buffActivation.apPool).toBe(STARTING_AP)
    expect(poised.buffActivation.activatedThisTrick).toEqual([])
  })

  it('DLR-145 — the second tap records the activation but leaves the pool untouched, since AP_ENABLED is off', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const done = roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    // apCostOf(cheat) still prices the card — `spendAp` is what re-derives an effective cost of 0
    // through the disabled AP_ENABLED flag, exactly as `actionPoints.test.ts` pins.
    expect(apCostOf(cheat)).toBeGreaterThan(0)
    expect(done.buffActivation.apPool).toBe(STARTING_AP)
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])
    expect(loadoutOpen(done)).toBe(true)
    expect(done.loadout?.poised).toBeNull()
  })

  it('a second activation of the same buff in the same trick is refused, not double-charged', () => {
    const once = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    const again = roundReducer(
      roundReducer(once, { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(again.buffActivation.apPool).toBe(once.buffActivation.apPool)
    expect(again.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })

  it('an id not in the offered pile is a no-op, never a throw', () => {
    const opened = open()
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 })).not.toThrow()
    expect(
      roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 }).loadout?.poised,
    ).toBeNull()
  })

  it('an Unassigned placeholder is never offered and never priced', () => {
    const withPlaceholders = createRoundUiState({ ...seed(), buffs: [] })
    const opened = roundReducer(withPlaceholders, { kind: RoundUiActionKind.ToggleLoadout })
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 1 })).not.toThrow()
  })
})

describe('the per-trick activation window', () => {
  it('2026-08-25 — clears activatedThisTrick when a trick resolves, and refills the pool to capacity', () => {
    const done = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])
    // DLR-145 — AP_ENABLED is off, so the activation records but never drops the pool below
    // capacity in the first place; there is nothing left for the trick boundary to refill.
    expect(done.buffActivation.apPool).toBe(done.buffActivation.capacity)

    // Play a card and let the Quarry answer, so a trick resolves.
    const closed = roundReducer(done, { kind: RoundUiActionKind.ToggleLoadout })
    const lead = closed.round.hands[PlayerSide.Player][0]
    const armedCard = roundReducer(closed, { kind: RoundUiActionKind.TapCard, card: lead })
    const played = roundReducer(armedCard, { kind: RoundUiActionKind.TapCard, card: lead })

    expect(played.resolvedTrick).not.toBeNull()
    expect(played.buffActivation.activatedThisTrick).toEqual([])
    // PerTrick cadence (2026-08-25): the trick boundary refills the pool, it doesn't just leave it.
    expect(played.buffActivation.apPool).toBe(played.buffActivation.capacity)
  })
})

// ── DLR-126 — spending a consumable item ────────────────────────────────────────────────────────

function itemBuff(kind: BuffKind, tier: BuffTier, id: number): Buff {
  return {
    id,
    kind,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

/** A felt whose pile is `buffs`, with the loadout panel already open. */
function openWith(buffs: readonly Buff[]) {
  return roundReducer(createRoundUiState({ ...seed(), buffs }), {
    kind: RoundUiActionKind.ToggleLoadout,
  })
}

/** Poise then commit — the two taps DLR-114's model requires. */
function spend(state: ReturnType<typeof openWith>, id: number) {
  const poised = roundReducer(state, { kind: RoundUiActionKind.TapBuff, id })
  return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id })
}

describe('handleTapBuff — a consumable item leaves the pile at the spend', () => {
  it('removes one Ward of a 2-count stack, spends its AP, and holds the absorption', () => {
    const wards = [
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 10),
      itemBuff(BuffKind.Ward, BuffTier.Bronze, 11),
    ]
    const after = spend(openWith(wards), 10)

    expect(after.buffs.map((b) => b.id)).toEqual([11])
    // DLR-145 — the item still leaves the pile (spending the CARD), but AP_ENABLED is off, so the
    // pool itself is untouched even though apCostOf(wards[0]) still prices it above zero.
    expect(apCostOf(wards[0])).toBeGreaterThan(0)
    expect(after.buffActivation.apPool).toBe(STARTING_AP)
    expect(after.encounter.wardAbsorbs).toBe(WARD_ABSORPTION[BuffTier.Bronze])
    // The panel stays open — AC2 allows more than one activation per trick.
    expect(loadoutOpen(after)).toBe(true)
  })

  it('a spent Ward cannot be re-activated on the next trick — the row is gone from the pile', () => {
    const ward = itemBuff(BuffKind.Ward, BuffTier.Silver, 12)
    const after = spend(openWith([ward]), 12)
    expect(after.buffs).toHaveLength(0)
    expect(offeredBuffs(after)).toHaveLength(0)
  })

  it('a Second Thoughts adds its charges to the fight’s discard budget and is consumed', () => {
    const item = itemBuff(BuffKind.SecondThoughts, BuffTier.Gold, 13)
    const before = openWith([item])
    const after = spend(before, 13)

    expect(after.discardsRemaining).toBe(before.discardsRemaining + 3)
    expect(after.buffs).toHaveLength(0)
    expect(after.encounter.wardAbsorbs).toBe(before.encounter.wardAbsorbs)
  })

  it('a Foresight is REFUSED — NoEffectYet — and costs neither AP nor the card', () => {
    const item = itemBuff(BuffKind.Foresight, BuffTier.Bronze, 14)
    const before = openWith([item])
    expect(loadoutRefusalFor(before, item)).toBe(BuffActivationRefusal.NoEffectYet)

    const after = spend(before, 14)
    expect(after.buffs.map((b) => b.id)).toEqual([14])
    expect(after.buffActivation.apPool).toBe(STARTING_AP)
  })

  it('a Cheat is spent and removed from the pile — DLR-142, Activated cards default to single-use', () => {
    const after = spend(openWith([cheat]), cheat.id)
    expect(after.buffs).toHaveLength(0)
    expect(after.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })
})

// ── DLR-132 — Cheat and Timebomb, as ordinary rows through the ordinary two-tap flow ───────────

describe('handleTapBuff — spending a Cheat row', () => {
  it('spends a Cheat on the second tap and lifts follow-suit for its tier of tricks', () => {
    const silverCheat = cheatBuff(BuffTier.Silver, 21)
    const after = spend(openWith([silverCheat]), silverCheat.id)
    expect(after.cheatTricksRemaining).toBe(CHEAT_DURATION_TRICKS[BuffTier.Silver])
    expect(cheatArmed(after)).toBe(true)
  })

  it('drops the poise on Escape (CancelLoadout) without spending the Cheat', () => {
    const opened = openWith([cheat])
    const poised = roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const cancelled = roundReducer(poised, { kind: RoundUiActionKind.CancelLoadout })
    expect(cancelled.cheatTricksRemaining).toBe(0)
    expect(cancelled.buffActivation.apPool).toBe(opened.buffActivation.apPool)
  })

  it('removes the Cheat from the pile once spent — DLR-142', () => {
    const before = openWith([cheat])
    const after = spend(before, cheat.id)
    expect(after.buffs).toHaveLength(before.buffs.length - 1)
  })
})

// ── DLR-142 — Shield wiring, mirroring Ward's own coverage above ──────────────────────────────

describe('handleTapBuff — spending a Shield row', () => {
  it('credits shieldHearts for the tier, spends its AP, and leaves the pile — DLR-142', () => {
    const shield = itemBuff(BuffKind.Shield, BuffTier.Silver, 22)
    const before = openWith([shield])
    const after = spend(before, shield.id)

    expect(after.encounter.shieldHearts).toBe(shieldHeartsForTier(BuffTier.Silver))
    // DLR-145 — same reading as the Ward case above: the pool is untouched with AP_ENABLED off.
    expect(apCostOf(shield)).toBeGreaterThan(0)
    expect(after.buffActivation.apPool).toBe(STARTING_AP)
    expect(after.buffs).toHaveLength(0)
  })
})

// ── DLR-154 AC5 — taking a riding Timebomb back off the trick ──────────────────────────────────

describe('handleRemoveBuff — reversing a riding Timebomb', () => {
  const timebombBronze = timebombBuff(BuffTier.Bronze, 31)
  const takerBuff = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 32)

  function primedUiFixture() {
    const opened = openWith([timebombBronze])
    const armed = spend(opened, timebombBronze.id)
    const closed = roundReducer(armed, { kind: RoundUiActionKind.ToggleLoadout })
    const target = closed.round.hands[PlayerSide.Player][0]
    return roundReducer(closed, { kind: RoundUiActionKind.TapCard, card: target })
  }

  function armedUiFixture() {
    const opened = openWith([timebombBronze])
    return spend(opened, timebombBronze.id)
  }

  function takerUiFixture() {
    const opened = openWith([takerBuff])
    return spend(opened, takerBuff.id)
  }

  it('clears the mark, both damages and the fuse when a primed Timebomb is taken back — AC5', () => {
    const primedUi = primedUiFixture()
    const back = handleRemoveBuff(primedUi, timebombBronze.id)
    expect(back.round.primedCards).toHaveLength(0)
    expect(back.timebombArmedDamage).toBeNull()
    expect(back.primedTimebombDamage).toBeNull()
    expect(back.timebombFuseRemaining).toBe(0)
    expect(back.buffs).toContainEqual(timebombBronze)
  })

  it('closes a pending priming mode when the Timebomb is taken back before a card is chosen', () => {
    const armedUi = armedUiFixture()
    const back = handleRemoveBuff(armedUi, timebombBronze.id)
    expect(back.timebombArmedDamage).toBeNull()
    expect(back.round.primedCards).toHaveLength(0)
  })

  it('leaves a Taker removal untouched', () => {
    const takerUi = takerUiFixture()
    const back = handleRemoveBuff(takerUi, takerBuff.id)
    expect(back.timebombFuseRemaining).toBe(takerUi.timebombFuseRemaining)
  })
})
