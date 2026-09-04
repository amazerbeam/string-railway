/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffActivationRefusal,
  BuffTier,
  mintFromTemplate,
  wildcardBuff,
  wildenedBuff,
  type Buff,
  type BuffTemplate,
} from '../../../hunt'
import { buildBuffGallery } from '../buffGalleryModel'
import BuffGallery from '../BuffGallery'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE } from '../buffLabels'
import { MotionAnchorProvider } from '../MotionAnchors'

afterEach(cleanup)

function templateFor(predicate: (template: BuffTemplate) => boolean): BuffTemplate {
  const template = BUFF_TEMPLATES.find(predicate)
  if (template === undefined) throw new Error('fixture template not found — check the predicate')
  return template
}

const bellHighBladeTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'suitHigh' &&
    t.target?.suit === 'bells' &&
    t.axis === 'magnitude',
)
const keyHighBladeTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'suitHigh' &&
    t.target?.suit === 'keys' &&
    t.axis === 'magnitude',
)
const moonHighBladeTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'suitHigh' &&
    t.target?.suit === 'moons' &&
    t.axis === 'magnitude',
)
const bellLowTemplate = templateFor(
  (t) => t.form === 'condition' && t.kind === 'suitLow' && t.target?.suit === 'bells',
)
const skullLowTemplate = templateFor((t) => t.form === 'condition' && t.kind === 'skullLow')
const cheatTemplate = templateFor((t) => t.form === 'activated' && t.kind === 'cheat')

let nextId = 1
function mint(template: BuffTemplate, tier: BuffTier = BuffTier.Bronze): Buff {
  return mintFromTemplate(template, tier, nextId++)
}

const noRefusal = () => null

interface RenderOptions {
  readonly buffs: readonly Buff[]
  readonly refusalFor?: (buff: Buff) => BuffActivationRefusal | null
  readonly poised?: number | null
}

function renderGallery(options: RenderOptions) {
  const view = buildBuffGallery(options.buffs, options.refusalFor ?? noRefusal)
  const onTapBuff = vi.fn()
  const onCancelPoise = vi.fn()
  const onClose = vi.fn()
  render(
    // DLR-157 — `BuffGallery` now registers one anchor per card, which throws outside a
    // `MotionAnchorProvider`.
    <MotionAnchorProvider>
      <BuffGallery
        view={view}
        poised={options.poised ?? null}
        onTapBuff={onTapBuff}
        onCancelPoise={onCancelPoise}
        onClose={onClose}
      />
    </MotionAnchorProvider>,
  )
  return { view, onTapBuff, onCancelPoise, onClose }
}

describe('BuffGallery — the dialog identity WarCouncilRound depends on', () => {
  it('is a dialog named "Your buffs"', () => {
    renderGallery({ buffs: [mint(bellHighBladeTemplate)] })
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
  })
})

describe('BuffGallery — AC18 roving tabindex over the grid only', () => {
  it('ArrowRight moves from the first card to the second, stepping over the run tab (a <div>)', () => {
    renderGallery({
      buffs: [
        mint(bellHighBladeTemplate),
        mint(keyHighBladeTemplate),
        mint(moonHighBladeTemplate),
        mint(bellLowTemplate),
        mint(skullLowTemplate),
      ],
    })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    const buttons = within(grid).getAllByRole('button')
    expect(buttons).toHaveLength(5)
    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[1])
  })

  it('Home and End jump to the first and last card', () => {
    renderGallery({
      buffs: [mint(bellHighBladeTemplate), mint(keyHighBladeTemplate), mint(skullLowTemplate)],
    })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    const buttons = within(grid).getAllByRole('button')
    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'End' })
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' })
    expect(document.activeElement).toBe(buttons[0])
  })
})

describe('BuffGallery — AC18 Enter/Space poises then activates (native buttons translate both into a click)', () => {
  it('aria-pressed reflects whether this stack is the poised one', () => {
    const buff = mint(bellHighBladeTemplate)
    renderGallery({ buffs: [buff], poised: buff.id })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })

  it("tapping a card calls onTapBuff with the stack's first held id — the reducer decides poise vs. commit", () => {
    const buff = mint(bellHighBladeTemplate)
    const { onTapBuff } = renderGallery({ buffs: [buff], poised: null })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    fireEvent.click(within(grid).getByRole('button'))
    expect(onTapBuff).toHaveBeenCalledWith(buff.id)
  })
})

describe('BuffGallery — AC18 Escape unwinds one level', () => {
  it('with a card poised, Escape calls onCancelPoise and not onClose', () => {
    const buff = mint(bellHighBladeTemplate)
    const { onCancelPoise, onClose } = renderGallery({ buffs: [buff], poised: buff.id })
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Your buffs' }), { key: 'Escape' })
    expect(onCancelPoise).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('with nothing poised, Escape calls onClose', () => {
    const buff = mint(bellHighBladeTemplate)
    const { onCancelPoise, onClose } = renderGallery({ buffs: [buff], poised: null })
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Your buffs' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCancelPoise).not.toHaveBeenCalled()
  })
})

describe('BuffGallery — AC7 duplicates collapse into one counted stack', () => {
  it('three identical Bell Highs render ONE card, named with the held count and showing ×3', () => {
    const buffs = [
      mint(bellHighBladeTemplate),
      mint(bellHighBladeTemplate),
      mint(bellHighBladeTemplate),
    ]
    const { view } = renderGallery({ buffs })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    const buttons = within(grid).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(view.runs[0].stacks[0].count).toBe(3)
    expect(buttons[0].getAttribute('aria-label')).toContain('×3')
    expect(buttons[0].textContent).toContain('×3')
  })
})

describe('BuffGallery — AC8 the fence', () => {
  it('fenced stacks are absent from the grid group, present in the fence, disabled, with the shared reason stated', () => {
    const usable = mint(bellHighBladeTemplate)
    const fenced = mint(skullLowTemplate)
    renderGallery({
      buffs: [usable, fenced],
      refusalFor: (buff) => (buff.id === fenced.id ? BuffActivationRefusal.WindowClosed : null),
    })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)

    const fenceRow = screen.getByText('NOT USABLE NOW').closest('.wc-fence') as HTMLElement
    const fencedButton = within(fenceRow).getByRole('button')
    expect((fencedButton as HTMLButtonElement).disabled).toBe(true)
    expect(
      within(fenceRow).getByText(
        new RegExp(
          BUFF_ACTIVATION_REFUSAL_MESSAGE[BuffActivationRefusal.WindowClosed].replace(/\.$/, ''),
          'i',
        ),
      ),
    ).toBeTruthy()
  })
})

describe('BuffGallery — AC4 Cheat sits under Press, not Suitless', () => {
  it('renders a "Press" run tab distinct from a suitless one', () => {
    renderGallery({
      buffs: [mint(cheatTemplate), mint(skullLowTemplate)],
    })
    // DLR-160 AC8 — scoped to the grid: the new suit filter row (outside the grid) renders its
    // own "Press" chip, so an unscoped `getByText` now matches two nodes.
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).getByText('Press')).toBeTruthy()
    expect(within(grid).getByText('No suit')).toBeTruthy()
  })
})

describe('BuffGallery — the empty pile does not crash', () => {
  it('renders with no cards and throws nothing — the isFocusable(0) probe on an empty collection', () => {
    expect(() => renderGallery({ buffs: [] })).not.toThrow()
    expect(screen.getByRole('group', { name: 'Usable buffs' })).toBeTruthy()
  })

  it('renders with every card fenced and throws nothing', () => {
    expect(() =>
      renderGallery({
        buffs: [mint(bellHighBladeTemplate)],
        refusalFor: () => BuffActivationRefusal.WindowClosed,
      }),
    ).not.toThrow()
    expect(screen.getByRole('group', { name: 'Usable buffs' }).children).toHaveLength(0)
  })
})

describe('BuffGallery — the tier filter narrows the grid and the fence follows', () => {
  it('selecting Gold hides bronze cards from both the grid and the fence', () => {
    const bronzeUsable = mint(bellHighBladeTemplate, BuffTier.Bronze)
    const goldUsable = mint(keyHighBladeTemplate, BuffTier.Gold)
    const bronzeFenced = mint(skullLowTemplate, BuffTier.Bronze)
    const goldFenced = mint(cheatTemplate, BuffTier.Gold)
    renderGallery({
      buffs: [bronzeUsable, goldUsable, bronzeFenced, goldFenced],
      refusalFor: (buff) =>
        buff.id === bronzeFenced.id || buff.id === goldFenced.id
          ? BuffActivationRefusal.WindowClosed
          : null,
    })

    fireEvent.click(screen.getByRole('button', { name: /Gold/ }))

    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)

    const fenceRow = screen.getByText('NOT USABLE NOW').closest('.wc-fence') as HTMLElement
    expect(within(fenceRow).getAllByRole('button')).toHaveLength(1)
  })
})

describe('BuffGallery — the follow-up layout fix (suit rail beside the grid)', () => {
  it('both filter navs stay outside the roving-tabindex grid, regardless of how the rail is styled', () => {
    renderGallery({ buffs: [mint(bellHighBladeTemplate)] })
    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    const tierNav = screen.getByRole('navigation', { name: 'Filter by tier' })
    const suitNav = screen.getByRole('navigation', { name: 'Filter by suit' })
    expect(grid.contains(tierNav)).toBe(false)
    expect(grid.contains(suitNav)).toBe(false)
  })
})

describe('BuffGallery — AC8 the suit filter composes with the tier filter', () => {
  it('pressing a suit chip narrows the grid to that suit alone', () => {
    renderGallery({
      buffs: [mint(bellHighBladeTemplate), mint(keyHighBladeTemplate), mint(skullLowTemplate)],
    })

    const suitNav = screen.getByRole('navigation', { name: 'Filter by suit' })
    fireEvent.click(within(suitNav).getByRole('button', { name: /Keys/ }))

    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).getAllByRole('button')).toHaveLength(1)
    expect(within(grid).getByText('Key High (Blade)')).toBeTruthy()
  })

  it('pressing a tier chip and a suit chip together shows only their intersection', () => {
    const silverKeys = mint(keyHighBladeTemplate, BuffTier.Silver)
    const bronzeKeys = mint(keyHighBladeTemplate, BuffTier.Bronze)
    const silverBells = mint(bellHighBladeTemplate, BuffTier.Silver)
    renderGallery({ buffs: [silverKeys, bronzeKeys, silverBells] })

    fireEvent.click(screen.getByRole('button', { name: /^Silver/ }))
    const suitNav = screen.getByRole('navigation', { name: 'Filter by suit' })
    fireEvent.click(within(suitNav).getByRole('button', { name: /Keys/ }))

    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    const buttons = within(grid).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].className).toContain('wc-buffcard-silver')
    expect(buttons[0].getAttribute('aria-label')).toContain('Key High')
  })

  it('an empty intersection renders its own line rather than an empty grid', () => {
    renderGallery({
      buffs: [
        mint(bellHighBladeTemplate, BuffTier.Silver),
        mint(keyHighBladeTemplate, BuffTier.Bronze),
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /^Silver/ }))
    const suitNav = screen.getByRole('navigation', { name: 'Filter by suit' })
    fireEvent.click(within(suitNav).getByRole('button', { name: /Keys/ }))

    const grid = screen.getByRole('group', { name: 'Usable buffs' })
    expect(within(grid).queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('No buffs match this filter.')).toBeTruthy()
  })
})

describe('a wild card on the felt (DLR-162 AC9)', () => {
  it('draws the wild mark where a suit mark would go, and says Wild in its accessible name', () => {
    renderGallery({ buffs: [wildenedBuff(mint(bellHighBladeTemplate))] })
    const card = screen.getByRole('button', { name: /Wild High \(Blade\)/ })
    expect(card.querySelector('.wc-buffcard-wild-mark')).not.toBeNull()
    expect(card.querySelector('.wc-buffcard-suit-none')).toBeNull()
    expect(card.className).toContain('wc-buffcard-wild')
  })

  it('refuses the wildcard itself on the felt, saying where it IS spent', () => {
    renderGallery({
      buffs: [wildcardBuff(BuffTier.Bronze, 900)],
      refusalFor: () => BuffActivationRefusal.ShopOnly,
    })
    expect(
      screen.getByRole('button', {
        name: new RegExp(BUFF_ACTIVATION_REFUSAL_MESSAGE[BuffActivationRefusal.ShopOnly]),
      }),
    ).toBeTruthy()
  })
})
