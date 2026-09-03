import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  BUFF_TEMPLATES,
  BuffTier,
  mintFromTemplate,
  OpponentKind,
  runPath,
  type Buff,
  type BuffId,
  type RunEncounterConfig,
} from '../../../hunt'
import RunPathScreen from '../RunPathScreen'

afterEach(cleanup)

function mint(templateIndex: number, tier: BuffTier, id: BuffId): Buff {
  return mintFromTemplate(BUFF_TEMPLATES[templateIndex], tier, id)
}

const three: RunEncounterConfig[] = ['a', 'b', 'c'].map((name) => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
}))

const props = {
  title: 'The Hunt',
  stages: runPath(0, three),
  goalText: 'Beat all 3',
  actionLabel: 'Fight a',
}

describe('RunPathScreen', () => {
  it('shows the title, the goal and the path', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'The Hunt' })).toBeTruthy()
    expect(screen.getByText('Beat all 3')).toBeTruthy()
    expect(screen.getByText('a')).toBeTruthy()
  })

  it('offers exactly one action, named by its prop (AC1, AC8)', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toBe('Fight a')
  })

  it('fires onAction when the control is pressed', () => {
    const onAction = vi.fn()
    render(<RunPathScreen {...props} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fight a' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('fires onAction on Escape, matching ShopPanel’s keyboard contract', () => {
    const onAction = vi.fn()
    const { container } = render(<RunPathScreen {...props} onAction={onAction} />)
    fireEvent.keyDown(container.querySelector('.run-path-screen') as Element, { key: 'Escape' })
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('AC9 — renders no tray region at all when heldBuffs is not supplied', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} />)
    expect(screen.queryByRole('region', { name: 'What you hold' })).toBeNull()
  })

  it('AC9 — renders one card per held stack when heldBuffs is supplied', () => {
    const heldBuffs = [
      mint(0, BuffTier.Bronze, 1),
      mint(0, BuffTier.Bronze, 2),
      mint(1, BuffTier.Gold, 3),
    ]
    render(<RunPathScreen {...props} onAction={vi.fn()} heldBuffs={heldBuffs} />)
    const tray = screen.getByRole('region', { name: 'What you hold' })
    expect(within(tray).getAllByRole('listitem')).toHaveLength(2)
  })

  it('AC9 — states plainly that nothing is held rather than an empty frame', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} heldBuffs={[]} />)
    const tray = screen.getByRole('region', { name: 'What you hold' })
    expect(tray.textContent).toContain('You hold nothing yet.')
    expect(within(tray).queryAllByRole('listitem')).toHaveLength(0)
  })
})
