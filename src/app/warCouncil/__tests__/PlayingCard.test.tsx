/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ALL_SUITS, Suit } from '../../../warCouncil'
import PlayingCard from '../PlayingCard'
import { SuitSymbolSheet } from '../SuitMark'

afterEach(cleanup)

describe('PlayingCard', () => {
  it('names a skulled card as skulled', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" skulled />)
    expect(screen.getByRole('button', { name: /skulled/i })).toBeTruthy()
  })

  it('does not call a clean card skulled', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />)
    expect(screen.queryByRole('button', { name: /skulled/i })).toBeNull()
  })

  it('folds the caller-supplied describedBy id in among the always-present rule id (DLR-117, DLR-149)', () => {
    const { rerender } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" describedBy="dmg-1" />,
    )
    const describedWithCaller = screen
      .getByRole('button', { name: '6 of Bells' })
      .getAttribute('aria-describedby')
    expect(describedWithCaller?.split(' ')).toContain('dmg-1')

    // Even with no caller-supplied id, aria-describedby is now always non-empty — the rule
    // text (AC8) is in the accessible tree unconditionally, not only while described.
    rerender(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />)
    const describedWithoutCaller = screen
      .getByRole('button', { name: '6 of Bells' })
      .getAttribute('aria-describedby')
    expect(describedWithoutCaller).toBeTruthy()
    expect(describedWithoutCaller?.split(' ')).not.toContain('dmg-1')
  })

  // D-W1 (defender fix-loop) — a pip's suit glyph binds by id through `SUIT_SYMBOL_ID`
  // (`CardFacePanel.tsx`), the same map `SuitMark.tsx` exports and `SuitSymbolSheet` renders
  // from. A name-only check (does the id string look right) would not have caught the id
  // convention diverging — this resolves the `<use href>` against a live mounted `<symbol id>`.
  it('D-W1 — resolves a pip’s suit glyph against a live mounted symbol', () => {
    render(
      <>
        <SuitSymbolSheet />
        <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />
      </>,
    )
    const use = document.querySelector('.wc-card-pip use')
    const href = use?.getAttribute('href')
    expect(href).toBeTruthy()
    const symbolId = href!.slice(1)
    expect(document.getElementById(symbolId)?.tagName.toLowerCase()).toBe('symbol')
  })

  it('renders the suit mark for every suit', () => {
    for (const suit of ALL_SUITS) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank: 4 }} variant="hand" />)
      expect(container.querySelector(`.wc-suit-${suit} .wc-card-suit`)).toBeTruthy()
      unmount()
    }
  })

  // AC12 — a skull is a property of the trick, not of a character: every rank and every suit
  // must render the identical skull markup, so a player recognises it across the table without
  // reading it. The five acting ranks (RANK_NAME's keys) plus one plain rank, across all three
  // suits.
  const ACTING_RANKS = [1, 3, 5, 9, 11]
  const PLAIN_RANK = 6

  it('AC12 — the skull face is byte-identical for every rank and suit', () => {
    const markups = new Set<string>()
    for (const suit of ALL_SUITS) {
      for (const rank of [...ACTING_RANKS, PLAIN_RANK]) {
        const { container, unmount } = render(
          <PlayingCard card={{ suit, rank }} variant="hand" skulled />,
        )
        const face = container.querySelector('.wc-card-skull-face')
        expect(face).toBeTruthy()
        markups.add(face!.innerHTML)
        unmount()
      }
    }
    expect(markups.size).toBe(1)
  })

  it('AC12 — the corner survives: a skulled card still shows its rank and suit', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Keys, rank: 11 }} variant="hand" skulled />,
    )
    expect(container.querySelector('.wc-card-rank')?.textContent).toBe('11')
    expect(container.querySelector('.wc-suit-keys .wc-card-suit')).toBeTruthy()
  })

  it('AC12 — an unskulled card renders the pip and no skull element', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />,
    )
    expect(container.querySelector('.wc-card-pip')).toBeTruthy()
    expect(container.querySelector('.wc-card-skull-face')).toBeNull()
  })

  it('AC1 — paints the six named ranks and no other', () => {
    for (const rank of [1, 3, 5, 7, 9, 11]) {
      const { container, unmount } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
      )
      expect(container.querySelector('.wc-card-art')).toBeTruthy()
      expect(container.querySelector('.wc-card-pips')).toBeNull()
      unmount()
    }
    for (const rank of [2, 4, 6, 8, 10]) {
      const { container, unmount } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
      )
      expect(container.querySelector('.wc-card-art')).toBeNull()
      expect(container.querySelector('.wc-card-pips')).toBeTruthy()
      unmount()
    }
  })

  it('AC1 — the Treasure’s figure differs by suit', () => {
    const used = new Set<string>()
    for (const suit of ALL_SUITS) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank: 7 }} variant="hand" />)
      used.add(container.querySelector('.wc-card-art use')!.getAttribute('href')!)
      unmount()
    }
    expect(used).toEqual(new Set(['#wc-fig-harp', '#wc-fig-chalice', '#wc-fig-sword']))
  })

  // DLR-163 AC12 — the Treasure was the only face carrying the printed "no rule" mark, and it
  // has a rule now. It joins the acting ranks and the mark comes off; NO face prints it today.
  it('AC12 — the six acting ranks act, and no face carries the “no rule” mark', () => {
    for (const rank of [1, 3, 5, 7, 9, 11]) {
      const { container, unmount } = render(
        <PlayingCard card={{ suit: Suit.Keys, rank }} variant="hand" />,
      )
      expect(container.querySelector('.wc-face-act')).toBeTruthy()
      expect(container.querySelector('.wc-card-no-rule')).toBeNull()
      expect(container.querySelector('.wc-face-inert')).toBeNull()
      unmount()
    }
  })

  // AC3 — rank 8 is a plain number, not a second inert card.
  it('AC3 — rank 8 renders exactly as rank 6 does, structurally', () => {
    const shape = (rank: number) => {
      const { container, unmount } = render(
        <PlayingCard card={{ suit: Suit.Moons, rank }} variant="hand" />,
      )
      const out = {
        face: container.querySelector('.wc-card')!.className.includes('wc-face-plain'),
        named: Boolean(container.querySelector('.wc-card-name')),
        mark: Boolean(container.querySelector('.wc-card-no-rule')),
        corners: container.querySelectorAll('.wc-card-corner').length,
      }
      unmount()
      return out
    }
    expect(shape(8)).toEqual(shape(6))
    expect(shape(8)).toEqual({ face: true, named: false, mark: false, corners: 2 })
  })

  // AC4 — the count and the rotation, in the DOM this time. The lattice ARITHMETIC is proven
  // without a renderer in cardFace.test.ts; this only checks the component wired it up.
  //
  // The contract's own draft of this spec asserted 4 inverted pips. `cardFace.ts`'s
  // `PIP_LAYOUT[10]` (Phase 1, already spec'd by `cardFace.test.ts`) is
  // [{1,1},{1,3},{3,1},{3,3},{5,1},{5,3},{7,1},{7,3},{2,2},{6,2}] — five spots (rows 5,5,6,7,7)
  // sit below `PIP_MID_ROW` (4), not four. Corrected to match the already-built, already-tested
  // geometry module rather than loosening it.
  it('AC4 — lays out `rank` pips with the lower half inverted', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 10 }} variant="hand" />,
    )
    const pips = container.querySelectorAll('.wc-card-pip')
    expect(pips.length).toBe(10)
    expect(container.querySelectorAll('.wc-card-pip.wc-is-inverted').length).toBe(5)
  })

  // AC6 — the mirrored index appears only where nothing else is printed there.
  it('AC6 — mirrors the corner index on plain ranks only', () => {
    for (const [rank, expected] of [
      [6, 2],
      [8, 2],
      [7, 1],
      [9, 1],
    ] as const) {
      const { container, unmount } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
      )
      expect({ rank, corners: container.querySelectorAll('.wc-card-corner').length }).toEqual({
        rank,
        corners: expected,
      })
      unmount()
    }
  })

  it('AC6 — prints the name on a named rank and nothing on an unnamed one', () => {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 5 }} variant="hand" />,
    )
    expect(container.querySelector('.wc-card-name')?.textContent).toBe('Woodcutter')
    unmount()
    const plain = render(<PlayingCard card={{ suit: Suit.Bells, rank: 8 }} variant="hand" />)
    expect(plain.container.querySelector('.wc-card-name')).toBeNull()
  })

  // AC8 — no face prints rule text. The rule reaches the player through the tooltip and the
  // accessible tree (DLR-149's always-present `.wc-sr-only` span), and this is the assertion
  // that stops a well-meaning later change printing it. Checked against `CardFace`'s own
  // `aria-hidden` wrapper — the VISUAL content — rather than the whole button, since the
  // button's full textContent now legitimately includes the hidden rule sentence too.
  it('AC8 — prints no rule text on any face, at every rank and suit', () => {
    for (const suit of ALL_SUITS) {
      for (const rank of [1, 3, 5, 7, 8, 9, 11]) {
        const { container, unmount } = render(<PlayingCard card={{ suit, rank }} variant="hand" />)
        const printed =
          container.querySelector('.wc-card > span[aria-hidden="true"]')!.textContent ?? ''
        expect({ suit, rank, length: printed.length < 40 }).toEqual({
          suit,
          rank,
          length: true,
        })
        unmount()
      }
    }
  })

  describe('the buff light (DLR-153)', () => {
    it('renders no badge and no halo with no buffCount — every existing call site keeps compiling', () => {
      const { container } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />,
      )
      expect(container.querySelector('.wc-card-buff-badge')).toBeNull()
      expect(container.querySelector('.wc-card-buff')).toBeNull()
    })

    it('carries the badge text in the accessible tree and shows the numeral with buffCount', () => {
      const { container } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" buffCount={2} />,
      )
      expect(screen.getByText(/2 buffs could fire on this card/i)).toBeTruthy()
      const badge = container.querySelector('.wc-card-buff-badge')
      expect(badge?.textContent).toContain('2')
    })

    it('renders the ~ estimate form and its class with buffCount and buffEstimate', () => {
      const { container } = render(
        <PlayingCard
          card={{ suit: Suit.Bells, rank: 6 }}
          variant="hand"
          buffCount={2}
          buffEstimate
        />,
      )
      const badge = container.querySelector('.wc-card-buff-badge')
      expect(badge?.classList.contains('wc-is-estimate')).toBe(true)
      expect(badge?.textContent).toContain('~2')
      expect(screen.getByText(/up to 2 buffs could fire on this card/i)).toBeTruthy()
    })

    it('renders the badge as a real text node, so it survives a greyscale screenshot (AC5)', () => {
      const { container } = render(
        <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" buffCount={3} />,
      )
      const numeral = container.querySelector('.wc-card-buff-badge > span[aria-hidden="true"]')
      expect(numeral?.textContent).toBe('3')
    })
  })
})
