/** @vitest-environment jsdom */
/**
 * DLR-174 — the arming surface's four states and its keyboard model. Builds real
 * `ArmingSurfaceView`s through `buildArmingSurface` (Phase 1, already pinned by its own spec)
 * rather than hand-rolling a second fixture shape, mirroring `BuffGallery.test.tsx`'s own
 * `buildBuffGallery` usage.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { PlayerSide, Suit } from '../../../warCouncil'
import ArmingSurface from '../ArmingSurface'
import {
  ARMING_CURSE_CLAIMED_TEXT,
  ARMING_CURSE_MODE_TEXT,
  ARMING_FOLLOW_SUIT_REASON,
  ARMING_NO_CHEAT_REMEDY,
  ARMING_NO_VALID_CARDS_TEXT,
  ARMING_SURFACE_LABEL,
} from '../armingLabels'
import { buildArmingSurface } from '../armingSurfaceModel'
import { MotionAnchorProvider } from '../MotionAnchors'
import { createRoundUiState, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

afterEach(cleanup)

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

function raised(ui: RoundUiState, raisedCard: ReturnType<typeof card>): RoundUiState {
  return { ...ui, armed: raisedCard }
}

const bellsHigh = (id: number) =>
  mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, id)
const bellsLow = (id: number) =>
  mintFromTemplate(templateById('suitLow:bells:multiplier')!, BuffTier.Bronze, id)
const cheat = (id: number) => mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, id)
const curse = (id: number) => mintFromTemplate(templateById('curse')!, BuffTier.Bronze, id)

interface RenderOptions {
  readonly ui: RoundUiState
  readonly legal: readonly ReturnType<typeof card>[]
  readonly offered: readonly Buff[]
  readonly poised?: number | null
}

function renderSurface(options: RenderOptions) {
  const view = buildArmingSurface({
    ui: options.ui,
    legal: options.legal,
    offered: options.offered,
    riding: [],
  })
  const onTapBuff = vi.fn()
  const onCancelPoise = vi.fn()
  const onCancelSelection = vi.fn()
  const onRemoveBuff = vi.fn()
  render(
    <MotionAnchorProvider>
      <ArmingSurface
        view={view}
        poised={options.poised ?? null}
        removeDisabled={false}
        onTapBuff={onTapBuff}
        onCancelPoise={onCancelPoise}
        onCancelSelection={onCancelSelection}
        onRemoveBuff={onRemoveBuff}
      />
    </MotionAnchorProvider>,
  )
  return { view, onTapBuff, onCancelPoise, onCancelSelection, onRemoveBuff }
}

describe('ArmingSurface — the Card state', () => {
  it('pins the raised card at the head and lists the filtered rows', () => {
    const suitHigh = bellsHigh(1)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(seededUi({}, [suitHigh]), bells2)
    const { view } = renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [suitHigh],
    })

    expect(view.rows).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: ARMING_SURFACE_LABEL })).toBeTruthy()
    expect(screen.getByText('2 of Bells')).toBeTruthy()
    const grid = screen.getByRole('group', { name: 'Buffs for this card' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)
  })

  it('reads "Cheat only" once the Quarry has led, and drops a non-Cheat buff from the list', () => {
    // DLR-174 review fix (QA Finding 2) — `offered` carries `suitHigh` TOO, so this actually
    // exercises the window-exclusion logic rather than only ever offering a Cheat a chance to
    // appear. `bells2` matches the buff's own suit, so it would otherwise be per-card-relevant.
    const cheatCard = cheat(1)
    const suitHigh = bellsHigh(2)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 6) }],
          leader: PlayerSide.Cpu,
        },
        [cheatCard, suitHigh],
      ),
      bells2,
    )
    renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [cheatCard, suitHigh],
    })
    expect(screen.getByText('Cheat only')).toBeTruthy()
    const grid = screen.getByRole('group', { name: 'Buffs for this card' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)
  })
})

describe('ArmingSurface — the NoValidCards state', () => {
  it('shows the reason and the remedy', () => {
    const ui = raised(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [],
      ),
      card(Suit.Bells, 2), // off-suit, no Cheat to break follow-suit
    )
    const legal = ui.round.hands[PlayerSide.Player].filter((c) => c.suit === Suit.Keys)
    renderSurface({ ui, legal, offered: [] })
    // The window tag ALSO states the same headline (AC14 — every state readable at a glance),
    // so it appears twice; the body's own reason and remedy each appear once.
    expect(screen.getAllByText(ARMING_NO_VALID_CARDS_TEXT).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(ARMING_FOLLOW_SUIT_REASON)).toBeTruthy()
    expect(screen.getByText(ARMING_NO_CHEAT_REMEDY)).toBeTruthy()
  })
})

describe('ArmingSurface — the CurseClaimed state', () => {
  it('states the mode in words rather than merely showing an empty list', () => {
    const curseCard = curse(1)
    const base = seededUi({}, [curseCard])
    const ui = { ...base, curseArmedBuff: curseCard }
    renderSurface({ ui, legal: ui.round.hands[PlayerSide.Player], offered: [curseCard] })
    expect(screen.getByText(ARMING_CURSE_MODE_TEXT)).toBeTruthy()
    // "Hand tap claimed" is stated in TWO places — the head title and the body — which is exactly
    // AC11's requirement that the mode is stated in words rather than signalled by an empty list.
    expect(screen.getAllByText(ARMING_CURSE_CLAIMED_TEXT).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('group', { name: 'Buffs for this card' })).toBeNull()
  })
})

describe('ArmingSurface — the keyboard model', () => {
  it('moves within the buff group with arrow keys', () => {
    const suitHigh = bellsHigh(1)
    const suitLow = bellsLow(2)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(seededUi({}, [suitHigh, suitLow]), bells2)
    renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [suitHigh, suitLow],
    })
    const grid = screen.getByRole('group', { name: 'Buffs for this card' })
    const buttons = within(grid).getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[1])
  })

  it('Enter (a native button click) activates a buff row', () => {
    const suitHigh = bellsHigh(1)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(seededUi({}, [suitHigh]), bells2)
    const { onTapBuff } = renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [suitHigh],
    })
    const grid = screen.getByRole('group', { name: 'Buffs for this card' })
    fireEvent.click(within(grid).getByRole('button'))
    expect(onTapBuff).toHaveBeenCalledWith(suitHigh.id)
  })

  it('Escape drops a held poise rather than clearing the card selection', () => {
    const suitHigh = bellsHigh(1)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(seededUi({}, [suitHigh]), bells2)
    const { onCancelPoise, onCancelSelection } = renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [suitHigh],
      poised: suitHigh.id,
    })
    fireEvent.keyDown(screen.getByRole('dialog', { name: ARMING_SURFACE_LABEL }), {
      key: 'Escape',
    })
    expect(onCancelPoise).toHaveBeenCalledOnce()
    expect(onCancelSelection).not.toHaveBeenCalled()
  })

  it('Escape clears the card selection once nothing is poised', () => {
    const suitHigh = bellsHigh(1)
    const bells2 = card(Suit.Bells, 2)
    const ui = raised(seededUi({}, [suitHigh]), bells2)
    const { onCancelPoise, onCancelSelection } = renderSurface({
      ui,
      legal: ui.round.hands[PlayerSide.Player],
      offered: [suitHigh],
      poised: null,
    })
    fireEvent.keyDown(screen.getByRole('dialog', { name: ARMING_SURFACE_LABEL }), {
      key: 'Escape',
    })
    expect(onCancelSelection).toHaveBeenCalledOnce()
    expect(onCancelPoise).not.toHaveBeenCalled()
  })
})
