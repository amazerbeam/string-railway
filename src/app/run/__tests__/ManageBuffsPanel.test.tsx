/** @vitest-environment jsdom */
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BuffTier,
  buffCombineKey,
  combineBuffs,
  mintFromTemplate,
  PLAYER_START_HEALTH,
  startRun,
  templateById,
  type Buff,
} from '../../../hunt'
import { manageBuffsView } from '../manageBuffs'
import ManageBuffsPanel from '../ManageBuffsPanel'
import {
  COMBINE_REFUSAL_MESSAGE,
  MANAGE_BUFFS_CANCEL_LABEL,
  MANAGE_BUFFS_COMMIT_LABEL,
  combineCostText,
} from '../manageBuffsLabels'

afterEach(cleanup)

const MOON_FEEDER = templateById('feeder:moons:magnitude')!
const BELL_FEEDER = templateById('feeder:bells:magnitude')!
const BELL_TAKER_GOLD_TEMPLATE = templateById('taker:bells:multiplier')!

function card(template = MOON_FEEDER, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

function renderPanel(buffs: readonly Buff[], onLeave = vi.fn()) {
  const view = manageBuffsView(buffs)
  const onCombine = vi.fn((key: string) => {
    const group = view.groups.find((candidate) => candidate.key === key)
    return group!.key
  })
  render(
    <ManageBuffsPanel
      view={view}
      onCombine={onCombine}
      onSpendWild={vi.fn(() => '')}
      onLeave={onLeave}
    />,
  )
  return { view, onCombine, onLeave }
}

/** A thin, STATEFUL wrapper mirroring `useManageBuffs` — the real run write and re-render, so a
 *  post-commit assertion can see the produced pile the driver would actually show, rather than
 *  the static view a mocked `onCombine` leaves unchanged. */
function LiveManageBuffs({ initial }: { readonly initial: readonly Buff[] }) {
  const [buffs, setBuffs] = useState(initial)
  const run = startRun(PLAYER_START_HEALTH, [], 1)
  const view = manageBuffsView(buffs)
  function combine(key: string): string {
    const group = view.groups.find((candidate) => candidate.key === key)!
    const producedKey = buffCombineKey(group.produces!)
    const next = combineBuffs({ ...run, buffs, nextBuffId: 900 }, key)
    setBuffs(next.buffs)
    return producedKey
  }
  return (
    <ManageBuffsPanel
      view={view}
      onCombine={combine}
      onSpendWild={() => ''}
      onLeave={() => {}}
    />
  )
}

describe('ManageBuffsPanel', () => {
  it('groups identical copies into one tile, with its count', () => {
    renderPanel([card(MOON_FEEDER, BuffTier.Bronze, 1), card(MOON_FEEDER, BuffTier.Bronze, 2)])
    expect(screen.getAllByRole('button', { name: /Combine two into one/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /2 held/ })).toBeTruthy()
  })

  it('offers a combine on a ready pile, and carries the exact refusal sentence with no button on a refused one', () => {
    renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
      card(BELL_FEEDER, BuffTier.Bronze, 3),
    ])
    expect(screen.getByRole('button', { name: /Combine two into one/ })).toBeTruthy()
    const refused = screen.getByText(COMBINE_REFUSAL_MESSAGE.noPair)
    expect(refused).toBeTruthy()
    // The refused pile's own list item carries no button.
    const refusedTile = refused.closest('li')!
    expect(within(refusedTile).queryByRole('button')).toBeNull()
  })

  it('arms on the first click, showing the destroyed and produced cards and the pile count dropping by one', () => {
    const { view } = renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    expect(screen.getByText(/2 × Bronze/)).toBeTruthy()
    expect(screen.getByText(/1 × Silver/)).toBeTruthy()
    expect(screen.getByText(combineCostText(view.held))).toBeTruthy()
    expect(screen.getByRole('button', { name: MANAGE_BUFFS_COMMIT_LABEL })).toBeTruthy()
  })

  it('commits on the second click, calling onCombine with the pile key', () => {
    const { view, onCombine } = renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_COMMIT_LABEL }))
    expect(onCombine).toHaveBeenCalledOnce()
    expect(onCombine).toHaveBeenCalledWith(view.groups[0].key)
  })

  it('cancels an armed pile on Escape without calling onCombine', () => {
    const { onCombine } = renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    fireEvent.keyDown(screen.getByRole('group', { name: /Ready to combine/ }), { key: 'Escape' })
    expect(onCombine).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Combine two into one/ })).toBeTruthy()
  })

  it('returns focus to the tile after Escape cancels it, rather than dropping to the body', () => {
    renderPanel([card(MOON_FEEDER, BuffTier.Bronze, 1), card(MOON_FEEDER, BuffTier.Bronze, 2)])
    const tile = screen.getByRole('button', { name: /Combine two into one/ })
    fireEvent.click(tile)
    fireEvent.keyDown(screen.getByRole('group', { name: /Ready to combine/ }), { key: 'Escape' })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /Combine two into one/ }),
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it('returns focus to the tile after Cancel is clicked, rather than dropping to the body', () => {
    renderPanel([card(MOON_FEEDER, BuffTier.Bronze, 1), card(MOON_FEEDER, BuffTier.Bronze, 2)])
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_CANCEL_LABEL }))
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /Combine two into one/ }),
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it('sends focus somewhere sensible after a commit, rather than dropping to the body', () => {
    render(
      <LiveManageBuffs
        initial={[
          card(BELL_TAKER_GOLD_TEMPLATE, BuffTier.Bronze, 1),
          card(BELL_TAKER_GOLD_TEMPLATE, BuffTier.Bronze, 2),
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_COMMIT_LABEL }))
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.hasAttribute('data-combine-key')).toBe(true)
  })

  it('leaves the screen on Escape when nothing is armed', () => {
    const { onLeave } = renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    fireEvent.keyDown(screen.getByRole('group', { name: /Ready to combine/ }), { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledOnce()
  })

  it('moves focus across ready piles with the arrow keys', () => {
    renderPanel([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
      card(BELL_FEEDER, BuffTier.Bronze, 3),
      card(BELL_FEEDER, BuffTier.Bronze, 4),
    ])
    const piles = screen.getAllByRole('button', { name: /Combine two into one/ })
    expect(piles).toHaveLength(2)
    const group = screen.getByRole('group', { name: /Ready to combine/ })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(piles[1])
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(piles[0])
  })

  it('badges the produced pile and announces both halves after a commit', () => {
    render(
      <LiveManageBuffs
        initial={[
          card(BELL_TAKER_GOLD_TEMPLATE, BuffTier.Bronze, 1),
          card(BELL_TAKER_GOLD_TEMPLATE, BuffTier.Bronze, 2),
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Combine two into one/ }))
    fireEvent.click(screen.getByRole('button', { name: MANAGE_BUFFS_COMMIT_LABEL }))
    expect(screen.getByText('Just made')).toBeTruthy()
    const status = screen.getByRole('status')
    expect(status.textContent).toMatch(/^Two Bronze .* became one Silver .*—.*\.$/)
  })
})
