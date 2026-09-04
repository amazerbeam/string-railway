import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import { IllegalMoveReason } from '../../../warCouncil'
import {
  BuffKind,
  BuffTier,
  cheatBuff,
  curseBuff,
  mintFromTemplate,
  templateById,
  type Buff,
} from '../../../hunt'
import { buildArmingSurface } from '../armingSurfaceModel'
import { roundReducer } from '../roundReducer'
import {
  armingSurfaceOpen,
  canAct,
  cheatArmed,
  createRoundUiState,
  discardWindowOpen,
  galleryOpen,
  loadoutOpen,
  RoundUiActionKind,
  type RoundUiSeed,
  type RoundUiState,
} from '../roundUiState'
import { makeRound, encounterFixture } from './roundFixture'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

const curse = curseBuff(BuffTier.Silver, 1)
const cheat = cheatBuff(BuffTier.Bronze, 2)

function seedWith(buffs: readonly Buff[], round: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(round),
    encounter: encounterFixture,
    baseDamageBonus: 0,
    discardsRemaining: 2,
    buffs: [...buffs],
  }
}

/** The Quarry-to-lead gap: `canAct` is false (it is the Quarry's own turn to lead), but the
 *  between-tricks window is open — the same gap DLR-100's discard rail and DLR-167's Curse both
 *  already reach. */
function quarryToLeadGap(buffs: readonly Buff[] = []): RoundUiState {
  const ui = createRoundUiState(seedWith(buffs, { leader: PlayerSide.Cpu }))
  expect(canAct(ui)).toBe(false)
  expect(discardWindowOpen(ui)).toBe(true)
  return ui
}

/** Player must follow suit on a Bells lead — a state where an off-suit tap is illegal. */
function followingBells(buffs: readonly Buff[] = []): RoundUiState {
  const ui = createRoundUiState(
    seedWith(buffs, {
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 4) }],
      phase: RoundPhase.AwaitingFollow,
    }),
  )
  expect(canAct(ui)).toBe(true)
  return ui
}

describe('raising a card in the Quarry-to-lead gap (AC1/AC5)', () => {
  it('sets armed and the shared poise holder, though canAct is false there', () => {
    const ui = quarryToLeadGap()
    const target = card(Suit.Bells, 2)

    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })

    expect(raised.armed).toEqual(target)
    expect(raised.loadout).toEqual({ poised: null })
  })

  it('does not commit on a second tap in the gap — playing still needs canAct', () => {
    const ui = quarryToLeadGap()
    const target = card(Suit.Bells, 2)
    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })

    const again = roundReducer(raised, { kind: RoundUiActionKind.TapCard, card: target })

    expect(again.armed).toEqual(target)
    expect(again.round.currentTrick).toHaveLength(0)
    expect(again.round).toEqual(raised.round)
  })
})

describe('an illegal card with a held, armable Cheat is a LOCK (AC7)', () => {
  it('raises the card rather than refusing it, and sets no rejection', () => {
    const ui = followingBells([cheat])
    // Off-suit: the hand holds Bells cards (2, 7), so a Moons/Keys card must follow-suit-refuse
    // absent a Cheat.
    const target = card(Suit.Moons, 5)

    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })

    expect(raised.armed).toEqual(target)
    expect(raised.rejection).toBeNull()
  })
})

describe('an illegal card with no Cheat held still RAISES it, refused (AC8, review fix — QA Finding 1)', () => {
  it('raises the card, names the rejection reason, and opens the surface on it', () => {
    // Superseded expectation: an earlier reading of `tasks.md`'s state diagram left `armed`
    // unchanged here, but AC8's own text ("gives a rejection animation on the card AND puts
    // 'No valid cards to play' in the surface's head") and the developer's browser-checked
    // `mockup.html` both raise on every tap, legal or not — the plan's diagram was the one that
    // had this wrong (see `pr-description.md`).
    const ui = followingBells([])
    const target = card(Suit.Moons, 5)

    const rejected = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })

    expect(rejected.armed).toEqual(target)
    expect(rejected.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
  })
})

describe('a Curse claims the hand tap and never sets armed (AC11, unchanged)', () => {
  it('marks the tapped card instead of raising it', () => {
    const state = createRoundUiState(seedWith([curse]))
    let armed = roundReducer(state, { kind: RoundUiActionKind.ToggleLoadout })
    armed = roundReducer(armed, { kind: RoundUiActionKind.TapBuff, id: curse.id })
    armed = roundReducer(armed, { kind: RoundUiActionKind.TapBuff, id: curse.id })

    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    expect(marked.round.cursedCards).toEqual([card(Suit.Moons, 5)])
    expect(marked.armed).toBeNull()
  })
})

describe('a successful commit clears the shared poise holder', () => {
  it('leaves loadout null so the gallery cannot pop open behind the next trick', () => {
    const state = createRoundUiState(seedWith([]))
    const target = card(Suit.Bells, 2)
    const armed = roundReducer(state, { kind: RoundUiActionKind.TapCard, card: target })
    expect(armed.loadout).toEqual({ poised: null })

    const played = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: target })

    // The player led, so the Quarry's automatic follow lands in this SAME commit and the trick
    // resolves — `rejection === null` is what proves the commit actually succeeded.
    expect(played.rejection).toBeNull()
    expect(played.round.tricksPlayed).toBe(1)
    expect(played.loadout).toBeNull()
  })
})

describe('ToggleLoadout with a card raised (Assumption 6)', () => {
  it('clears armed and opens the gallery — the button always means "show me everything"', () => {
    const state = createRoundUiState(seedWith([]))
    const target = card(Suit.Bells, 2)
    const raised = roundReducer(state, { kind: RoundUiActionKind.TapCard, card: target })

    const toggled = roundReducer(raised, { kind: RoundUiActionKind.ToggleLoadout })

    expect(toggled.armed).toBeNull()
    expect(loadoutOpen(toggled)).toBe(true)
  })
})

describe('TapCard then CancelSelection returns to the felt, not the gallery (review fix — Defender Critical 2)', () => {
  it('clears the shared poise holder too, so neither surface claims the stage', () => {
    const state = createRoundUiState(seedWith([]))
    const target = card(Suit.Bells, 2)
    const raised = roundReducer(state, { kind: RoundUiActionKind.TapCard, card: target })
    expect(armingSurfaceOpen(raised)).toBe(true)

    const cancelled = roundReducer(raised, { kind: RoundUiActionKind.CancelSelection })

    // `ArmingSurface`'s own SECOND `Escape` press dispatches exactly this action
    // (`plan.md`'s state diagram: Arming -> Felt). Before this fix, `loadout` survived the
    // cancel, so `galleryOpen` read `true` and `FeltRegion.tsx`'s three-way ternary rendered the
    // full, unfiltered `BuffGallery` instead of the plain felt.
    expect(cancelled.armed).toBeNull()
    expect(cancelled.loadout).toBeNull()
    expect(armingSurfaceOpen(cancelled)).toBe(false)
    expect(galleryOpen(cancelled)).toBe(false)
  })
})

describe('a second tap on a still-illegal raised card re-raises rather than committing (review fix — Defender Critical)', () => {
  it('with no Cheat held, keeps armed and rejection set instead of falling into commit', () => {
    const ui = followingBells([])
    const target = card(Suit.Moons, 5)
    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(raised.armed).toEqual(target)
    expect(raised.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)

    const again = roundReducer(raised, { kind: RoundUiActionKind.TapCard, card: target })

    // Before the fix this fell into `commit`, which rejects the play but clears `armed` to
    // `null` — unmounting the whole arming surface instead of re-shaking the card.
    expect(again.armed).toEqual(target)
    expect(again.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
    expect(again.round.currentTrick).toHaveLength(1) // unchanged — no card was played
  })

  it('with a Cheat held but not yet ARMED, keeps the card raised as a lock rather than committing', () => {
    const ui = followingBells([cheat])
    const target = card(Suit.Moons, 5)
    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(raised.armed).toEqual(target)
    expect(raised.rejection).toBeNull()

    const again = roundReducer(raised, { kind: RoundUiActionKind.TapCard, card: target })

    expect(again.armed).toEqual(target)
    expect(again.rejection).toBeNull()
    expect(again.round.currentTrick).toHaveLength(1) // unchanged — no card was played
  })

  it('positive control: once the Cheat IS armed, a second tap on the off-suit card commits (AC7)', () => {
    let ui = followingBells([cheat])
    ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(cheatArmed(ui)).toBe(true)

    const target = card(Suit.Moons, 5)
    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(raised.armed).toEqual(target)

    const played = roundReducer(raised, { kind: RoundUiActionKind.TapCard, card: target })

    // The Cheat lifted follow-suit and the player was completing the Quarry's lead, so the
    // trick resolves in this same commit — `rejection === null` proves the play went through.
    expect(played.armed).toBeNull()
    expect(played.rejection).toBeNull()
    expect(played.round.tricksPlayed).toBe(1)
  })
})

describe('AC6, structurally — nothing but a held Cheat pays once the Quarry has led', () => {
  it('buildArmingSurface offers no non-Cheat row, driven by the window predicate itself', () => {
    // DLR-174 review fix (QA Finding 2) — `offered` now carries a NON-Cheat buff too
    // (`suitHigh:moons:magnitude`, minted for the raised card's own suit, so it would otherwise
    // both fire-eligible AND per-card-relevant were the window not what excludes it). The
    // original spec passed `offered: [cheat]` alone, so `view.rows.every(...)` was true whether
    // or not the window-exclusion logic worked at all — nothing else was ever offered a chance to
    // appear. Driven by the window predicate itself, not a named card family, so the guarantee
    // survives a cut family being restored later.
    const moonsHigh = mintFromTemplate(
      templateById('suitHigh:moons:magnitude')!,
      BuffTier.Bronze,
      3,
    )
    const ui = followingBells([cheat, moonsHigh])
    const raised = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Moons, 5) })

    // The window predicate is what the ticket promises stays unchanged — assert THAT, not a named
    // card family, so the guarantee survives a cut family being restored later.
    expect(discardWindowOpen(raised)).toBe(false)

    const legal = ui.round.hands[PlayerSide.Player].filter((c) => c.suit === Suit.Bells)
    const view = buildArmingSurface({
      ui: raised,
      legal,
      offered: [cheat, moonsHigh],
      riding: [],
    })
    expect(view.rows.every((row) => row.stack.buff.kind === BuffKind.Cheat)).toBe(true)
    expect(view.rows.some((row) => row.stack.buff.id === moonsHigh.id)).toBe(false)
  })
})
