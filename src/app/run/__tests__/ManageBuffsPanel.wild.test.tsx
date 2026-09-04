/** @vitest-environment jsdom */
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BuffTier,
  PLAYER_START_HEALTH,
  buffCombineKey,
  mintFromTemplate,
  spendWildcard,
  startRun,
  templateById,
  wildcardBuff,
  wildenedBuff,
  type Buff,
  type BuffId,
} from '../../../hunt'
import { manageBuffsView } from '../manageBuffs'
import ManageBuffsPanel from '../ManageBuffsPanel'
import {
  MANAGE_BUFFS_WILD_BAND,
  MANAGE_BUFFS_WILD_CANCEL_LABEL,
  MANAGE_BUFFS_WILD_COMMIT_LABEL,
  MANAGE_BUFFS_WILD_REFUSED_BAND,
  MANAGE_BUFFS_WILD_SPEND_LABEL,
  MANAGE_BUFFS_WILD_TARGET_BAND,
  MANAGE_BUFFS_READY_BAND,
  WILD_REFUSAL_MESSAGE,
} from '../manageBuffsLabels'
import { WildRefusal } from '../../../hunt'

afterEach(cleanup)

const BELL_HIGH = templateById('suitHigh:bells:magnitude')!
const SKULL_LOW = templateById('skullLow:magnitude')!

const bellHigh = (id: BuffId, tier: BuffTier = BuffTier.Bronze): Buff =>
  mintFromTemplate(BELL_HIGH, tier, id)
const skullLow = (id: BuffId): Buff => mintFromTemplate(SKULL_LOW, BuffTier.Bronze, id)

function renderPanel(buffs: readonly Buff[]) {
  const view = manageBuffsView(buffs)
  const onSpendWild = vi.fn(() => '')
  render(
    <ManageBuffsPanel
      view={view}
      onCombine={vi.fn(() => '')}
      onSpendWild={onSpendWild}
      onLeave={vi.fn()}
    />,
  )
  return { view, onSpendWild }
}

/** The stateful wrapper `ManageBuffsPanel.test.tsx` already establishes, for the spend gesture:
 *  the real engine write and re-render, so a post-commit assertion sees what a driver would show. */
function LiveWild({ initial }: { readonly initial: readonly Buff[] }) {
  const [buffs, setBuffs] = useState(initial)
  const run = startRun(PLAYER_START_HEALTH, [], 1)
  const view = manageBuffsView(buffs)
  function spendWild(targetId: BuffId): string {
    const tile = view.wildTargets.find((candidate) => candidate.ids.includes(targetId))!
    const producedKey = buffCombineKey(tile.produces!)
    setBuffs(spendWildcard({ ...run, buffs, nextBuffId: 900 }, view.wildcards[0], targetId).buffs)
    return producedKey
  }
  return (
    <ManageBuffsPanel view={view} onCombine={() => ''} onSpendWild={spendWild} onLeave={() => {}} />
  )
}

describe('the wildcard band (DLR-162)', () => {
  it('renders no band at all when the player holds no wildcard', () => {
    renderPanel([bellHigh(1), bellHigh(2)])
    expect(screen.queryByText(new RegExp(MANAGE_BUFFS_WILD_BAND))).toBeNull()
    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL })).toBeNull()
  })

  it('shows the band with its held count once a wildcard is held', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), wildcardBuff(BuffTier.Bronze, 2), bellHigh(3)])
    expect(screen.getByText(new RegExp(`${MANAGE_BUFFS_WILD_BAND} · 2`))).toBeTruthy()
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL })).toBeTruthy()
  })

  it('arms the target mode from the band, replacing the combine bands', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), bellHigh(3)])
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_READY_BAND })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))

    expect(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })).toBeTruthy()
    expect(screen.queryByRole('group', { name: MANAGE_BUFFS_READY_BAND })).toBeNull()
  })

  it('renders a refused target as a non-interactive tile carrying its reason', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), skullLow(3)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))

    // Two targets refuse for want of a suit here: the Skull Low and the wildcard itself.
    expect(
      screen.getAllByText(WILD_REFUSAL_MESSAGE[WildRefusal.NoSuit], { selector: 'span' }),
    ).toHaveLength(2)
    // A refused target is an <li>, never a button — an affordance that cannot act would lie.
    expect(screen.queryByRole('button', { name: /Skull Low/ })).toBeNull()
  })

  it('puts the confirmation on the target tile, naming what is destroyed and what is made', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    fireEvent.click(screen.getByRole('button', { name: /Bell High \(Blade\)/ }))

    expect(screen.getByText('1 × Bronze Wildcard')).toBeTruthy()
    expect(screen.getByText(/1 × Bronze Wild High \(Blade\)/)).toBeTruthy()
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_COMMIT_LABEL })).toBeTruthy()
  })

  it('commits the spend, converts the card, and announces it through the ledger', () => {
    render(<LiveWild initial={[wildcardBuff(BuffTier.Bronze, 1), bellHigh(2)]} />)
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    fireEvent.click(screen.getByRole('button', { name: /Bell High \(Blade\)/ }))
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_COMMIT_LABEL }))

    // The band is gone — the wildcard was spent — and the converted card names itself.
    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Bronze Wild High (Blade)')
  })

  it('cancels the armed target with Escape, then leaves the mode with a second Escape', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), bellHigh(3)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    const grid = screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })
    fireEvent.click(screen.getByRole('button', { name: /Bell High \(Blade\)/ }))
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_COMMIT_LABEL })).toBeTruthy()

    fireEvent.keyDown(grid, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_COMMIT_LABEL })).toBeNull()
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })).toBeTruthy()

    fireEvent.keyDown(grid, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })).toBeNull()
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_READY_BAND })).toBeTruthy()
  })

  it('returns focus to the band after leaving the mode', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), bellHigh(3)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    fireEvent.keyDown(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND }), {
      key: 'Escape',
    })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }),
    )
  })

  it('moves between targets with the arrow keys, one tab stop for the whole grid', () => {
    renderPanel([
      wildcardBuff(BuffTier.Bronze, 1),
      bellHigh(2),
      mintFromTemplate(templateById('suitHigh:keys:magnitude')!, BuffTier.Bronze, 3),
    ])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    const grid = screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })
    const tiles = grid.querySelectorAll<HTMLElement>('button[data-wild-key]')
    expect(tiles).toHaveLength(2)
    expect([...tiles].filter((tile) => tile.tabIndex === 0)).toHaveLength(1)

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tiles[1])
  })
})

/**
 * DLR-162 fix pass — the target mode used to be a dead end.
 *
 * The `targeting` ternary hides both combine bands, and the only way back was `Escape` handled on
 * the ready-targets `<div className="mb-grid">`. A mouse-only player could not get out at all, and
 * when NOTHING can take the spend that grid never renders — so the mode carried no `Escape` handler
 * for anyone. A wildcard plus a Skull Low is exactly that state: the Skull Low has no suit to take
 * off, and the wildcard is already wild.
 */
describe('leaving the wildcard target mode', () => {
  /** Enters the mode holding only cards that refuse the spend. */
  function enterDeadEnd() {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), skullLow(2)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    // The precondition: the ready band — the mode's only former exit — is not on screen.
    expect(screen.queryByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })).toBeNull()
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_REFUSED_BAND })).toBeTruthy()
  }

  it('offers a cancel control even when nothing can be made wild', () => {
    enterDeadEnd()
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL })).toBeTruthy()
  })

  it('the cancel control leaves the mode and returns focus to the band', () => {
    enterDeadEnd()
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL }))

    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL })).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }),
    )
  })

  it('Escape leaves the mode from the stage, with no ready grid to carry the handler', () => {
    enterDeadEnd()
    fireEvent.keyDown(screen.getByRole('main'), { key: 'Escape' })
    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL })).toBeNull()
  })

  it('offers the cancel control alongside a ready grid too', () => {
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), bellHigh(3)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_CANCEL_LABEL }))
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_READY_BAND })).toBeTruthy()
  })

  it('an Escape the target grid already answered is not answered twice by the stage', () => {
    // The armed tile's own Escape drops the confirmation and KEEPS the mode open. If the stage
    // handled the same bubbled event it would also leave the mode, unwinding two levels at once.
    renderPanel([wildcardBuff(BuffTier.Bronze, 1), bellHigh(2), bellHigh(3)])
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_WILD_SPEND_LABEL }))
    fireEvent.click(screen.getByRole('button', { name: /Bell High \(Blade\)/ }))

    fireEvent.keyDown(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND }), {
      key: 'Escape',
    })

    expect(screen.queryByRole('button', { name: MANAGE_BUFFS_WILD_COMMIT_LABEL })).toBeNull()
    expect(screen.getByRole('group', { name: MANAGE_BUFFS_WILD_TARGET_BAND })).toBeTruthy()
  })
})

describe('a wild pile names both cards it destroys (DLR-162)', () => {
  it('names both cards a wild combine destroys, not "2 ×" of a card the player owns one of', () => {
    renderPanel([wildenedBuff(bellHigh(1)), bellHigh(2)])
    fireEvent.click(screen.getByRole('button', { name: /Wild High \(Blade\)/ }))
    expect(
      screen.getByText('1 × Bronze Wild High (Blade) + 1 × Bronze Bell High (Blade)'),
    ).toBeTruthy()
  })

  it('still says "2 ×" for an ordinary same-card combine', () => {
    renderPanel([bellHigh(1), bellHigh(2)])
    fireEvent.click(screen.getByRole('button', { name: /Bell High \(Blade\)/ }))
    expect(screen.getByText('2 × Bronze Bell High (Blade)')).toBeTruthy()
  })
})
