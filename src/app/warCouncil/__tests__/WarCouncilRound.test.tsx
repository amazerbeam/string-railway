/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { HuntDeclaration, roundDamage } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import { card, huntFixture, makeRound } from './roundFixture'

afterEach(cleanup)

// DLR-63: a round built already mid-trick or mid-round cannot be declared through the
// gate — `declareHunt` itself rejects once a card has been played (AC1) — so those fixtures
// carry this declaration directly rather than reaching `declareWin()` below.
const WIN_DECLARED = { path: HuntDeclaration.Win } as const

// A deterministic RNG, duplicated here to match the same local pattern
// `roundReducer.test.ts` and the engine's own `playCard.test.ts`/`deal.test.ts` already use —
// never `Math.random()` in anything that must be reproducible.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * Drives a full 13-trick round to completion through the rendered DOM alone — no reach into
 * reducer state. Mirrors `roundReducer.test.ts`'s driving loop (CarryOn whenever the Quarry
 * leads or a trick is held; two taps on the first legal, i.e. enabled, hand card otherwise)
 * but reads every branch off the accessible tree, the same surface a player has.
 */
function playFullRoundToCompletion() {
  let guard = 0
  while (screen.queryByRole('heading', { name: /the hunt is over/i }) === null) {
    guard += 1
    if (guard > 400) {
      throw new Error('round did not complete — infinite loop guard tripped')
    }
    const fault = screen.queryByRole('alert')
    if (fault) {
      throw new Error(`the engine rejected the Quarry's own move: ${fault.textContent}`)
    }
    const prompt = screen.queryByRole('group', { name: 'Choose what the card does' })
    if (prompt) {
      fireEvent.click(within(prompt).getAllByRole('button')[0])
      continue
    }
    const tapToCarryOn = screen.queryByRole('button', { name: /tap the table to carry on/i })
    if (tapToCarryOn) {
      fireEvent.click(tapToCarryOn)
      continue
    }
    const letThemLead = screen.queryByRole('button', { name: /let them lead/i })
    if (letThemLead) {
      fireEvent.click(letThemLead)
      continue
    }
    const hand = screen.getByRole('group', { name: /hand/i })
    const legalCard = within(hand)
      .getAllByRole('button')
      .find((button) => !(button as HTMLButtonElement).disabled)
    if (!legalCard) {
      throw new Error('no legal card found in hand, and no other branch applied')
    }
    fireEvent.click(legalCard)
    fireEvent.click(legalCard)
  }
}

// DLR-63: the declare gate is the felt cascade's first branch and every hand card is
// disabled until the Hunt is declared (AC1), so every pre-existing spec below that goes on
// to tap a hand card or reach a TrickWell control must declare first. Win, since none of
// these specs are concerned with the Lose path — the mockup's own copy ("Play to Win") is
// what both this file's and `DeclareGate.test.tsx`'s regexes are written to satisfy.
function declareWin() {
  fireEvent.click(screen.getByRole('button', { name: /play to win/i }))
}

describe('WarCouncilRound', () => {
  it('renders the hand as buttons named by rank and suit', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
  })

  it('plays a legal card on the second tap of the same card', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    // Correction: a raw `element.click()` dispatches a real event, but under
    // React 19 + jsdom the resulting state update is not guaranteed to flush
    // synchronously outside an `act()` scope — confirmed empirically (the
    // DOM still showed the pre-click aria-pressed value immediately after a
    // raw `.click()`). `fireEvent.click` wraps the dispatch in `act()`, so
    // every click in this file uses it rather than the bare DOM method.
    fireEvent.click(bells7)
    expect(bells7.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bells7)
    // Correction: the committed card completes the trick (both fixture hands hold
    // exactly one Bells card each, and Bells is trump), so the played 7 of Bells is
    // now visible — condensed, disabled — in TrickWell's held reveal (AC2). A bare
    // `queryByRole` would find that card instead of correctly reporting "gone from
    // the hand". Scope the query to the hand's own labelled region.
    const hand = screen.getByRole('group', { name: /hand/i })
    expect(within(hand).queryByRole('button', { name: '7 of Bells' })).toBeNull()
  })

  it('shows the live trick counts and updates them once a trick resolves (AC4)', () => {
    // roundReducer.test.ts already asserts the reducer's internal `tricksWon`; this proves
    // the scoreboard itself is wired to it, not merely that the value exists somewhere in
    // state. Bells is trump, and both fixture hands hold exactly one Bells card each, so the
    // committed 7 of Bells resolves the trick in the same commit (AC2) and the player's card
    // (7) beats the CPU's forced follow (4) under trump.
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    // No `@testing-library/jest-dom` is installed in this project (see devDependencies),
    // so the assertion reads the element's own `textContent` rather than reaching for its
    // `toHaveTextContent` matcher.
    const scoreboard = screen.getByRole('group', { name: /tricks won/i })
    expect(scoreboard.textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    expect(scoreboard.textContent).toMatch(/You1/)
  })

  it('disables a card the engine says is illegal', () => {
    // Built already mid-trick, so declaring through the gate is unreachable here —
    // `declareHunt` itself rejects once `currentTrick.length > 0` (AC1) — hence the
    // declaration is written directly onto the fixture instead of clicked through the UI.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
      declaration: WIN_DECLARED,
    })
    render(<WarCouncilRound initialState={round} hunt={huntFixture} onComplete={vi.fn()} />)
    // The player holds Moons, so following suit is forced and Bells is out.
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    // Correction (see Task 18 Step 2): 11 of Moons is CardRank.Monarch, one of the
    // five ability-bearing ranks labels.ts decorates, so its accessible name carries
    // the parenthetical.
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('shows the trump suit and updates it when a Fox exchange lands', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    expect(screen.getByText(/Bells is trump/i)).toBeDefined()
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    // Once the prompt opens, AbilityPrompt renders a PlayingCard for every remaining
    // hand card alongside the now-non-interactive HandFan, so "5 of Moons
    // (Woodcutter)" — the corrected accessible name for CardRank.Woodcutter — exists
    // twice in the document. Scope the query to the prompt's own labelled region
    // (see AbilityPrompt.tsx's added role="group" aria-label) rather than weakening
    // the assertion.
    const prompt = screen.getByRole('group', { name: 'Choose what the card does' })
    fireEvent.click(within(prompt).getByRole('button', { name: '5 of Moons (Woodcutter)' }))
    expect(screen.getByText(/Moons is trump/i)).toBeDefined()
  })

  it('holds the deciding thirteenth trick before the round-over panel, then reports onComplete once', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: 12,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
      // Built already twelve tricks in, so `declareHunt` itself rejects `tricksPlayed > 0`
      // (AC1) — the declaration is written directly onto the fixture instead.
      declaration: WIN_DECLARED,
    })
    render(<WarCouncilRound initialState={round} hunt={huntFixture} onComplete={onComplete} />)
    const last = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(last)
    fireEvent.click(last)
    // The deciding trick resolves and completes the round in the same commit, but its
    // cards and winner must be visible before the round-over panel replaces them.
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /finish/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))
    fireEvent.click(screen.getByRole('button', { name: /finish/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).toBe(RoundPhase.Complete)
  })

  it('reaches the resolved trick’s carry-on control by keyboard alone', () => {
    // Every trick but the last resolves mid-round and holds the felt open — exactly the
    // state a keyboard-only player was previously unable to escape, since every hand card
    // is disabled the instant a trick resolves and nothing else in the tree is focusable.
    // The control is now a native <button> (Fix 4): confirming it is reachable by keyboard
    // (real focus lands on it with no explicit tabIndex needed) is this component's own
    // contract to prove. Activating it via `fireEvent.click` rather than
    // `fireEvent.keyDown(..., { key: 'Enter' })` — a native button's own Enter/Space
    // activation is the HTML platform's guarantee, not this component's to re-prove.
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    const carryOn = screen.getByRole('button', { name: /tap the table to carry on/i })
    carryOn.focus()
    expect(document.activeElement).toBe(carryOn)
    fireEvent.click(carryOn)
    expect(screen.queryByRole('button', { name: /tap the table to carry on/i })).toBeNull()
  })

  it('telegraphs the Quarry’s lead before it lands, and commits it on "Let them lead" (AC3)', () => {
    render(
      <WarCouncilRound
        initialState={makeRound({ leader: PlayerSide.Cpu })}
        hunt={huntFixture}
        onComplete={vi.fn()}
      />,
    )
    // Nothing has been committed yet — the trick row is still empty (no `wc-played` card).
    // The telegraph itself reads off `quarryIntent`, which has no dependency on the
    // declaration, so this holds true even while the gate is still showing.
    expect(screen.queryByText(/^They led/i)).toBeNull()
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toMatch(/will lead/i)

    declareWin()
    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    fireEvent.click(letThemLead)
    expect(screen.getByText(/^They led/i)).toBeDefined()
  })

  it('previews the Quarry’s answer to an armed card before it is played (AC3)', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toMatch(/^If you lead that card/)
    // Arming is a selection, not a commitment — the card has not been played.
    expect(screen.queryByText(/^You led/i)).toBeNull()
  })

  it('clears the speculative reading back to the live one on Escape', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    declareWin()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    expect(screen.getByRole('status').getAttribute('aria-label')).toMatch(/^If you lead that card/)
    const hand = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })
    expect(screen.getByRole('status').getAttribute('aria-label')).not.toMatch(/^If you lead/)
  })

  it('shows the running Spoils, Standing band, the Quarry’s trick count, and its rule-break sentence (AC2/AC6)', () => {
    const round = makeRound({ tricksWon: { [PlayerSide.Player]: 4, [PlayerSide.Cpu]: 2 } })
    render(<WarCouncilRound initialState={round} hunt={huntFixture} onComplete={vi.fn()} />)

    expect(screen.getByLabelText(/Running Spoils: \d+/)).toBeDefined()
    expect(screen.getByLabelText(/Standing band: \w+, multiplier \d+/)).toBeDefined()
    expect(screen.getByLabelText('The Quarry has taken 2 tricks')).toBeDefined()
    expect(
      screen.getByText(/Every time the Monarch leads a suit you hold, you must play your Swan/i),
    ).toBeDefined()
  })

  it('reaches "Let them lead" by keyboard alone (AC1)', () => {
    render(
      <WarCouncilRound
        initialState={makeRound({ leader: PlayerSide.Cpu })}
        hunt={huntFixture}
        onComplete={vi.fn()}
      />,
    )
    declareWin()
    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    letThemLead.focus()
    expect(document.activeElement).toBe(letThemLead)
    fireEvent.click(letThemLead)
    expect(screen.queryByRole('button', { name: /let them lead/i })).toBeNull()
  })

  describe('the end-of-Hunt panel (AC7)', () => {
    // The Standing multiplier can be fractional (`hunt/config.ts`'s Greedy/Humble bands are
    // ×0.5), so the number is matched as digits with an optional decimal part rather than
    // `\d+` alone — a plain `\d+` would silently truncate "0.5" to "0" or fail the label
    // query outright depending on where it sits in the pattern.
    function readValue(label: RegExp): number {
      const text = screen.getByLabelText(label).getAttribute('aria-label') ?? ''
      const match = text.match(/\d+(?:\.\d+)?/)
      if (!match) throw new Error(`no number found in aria-label: ${text}`)
      return Number(match[0])
    }

    it('shows Spoils × Standing = Damage for both sides, with no Demand and no verdict', () => {
      render(
        <WarCouncilRound
          initialState={dealRound(PlayerSide.Cpu, lcg(2026), huntFixture.quarry.character)}
          hunt={huntFixture}
          onComplete={vi.fn()}
        />,
      )
      declareWin()
      playFullRoundToCompletion()

      for (const name of ['You', 'Opponent']) {
        const spoilsValue = readValue(new RegExp(`^${name} Spoils: \\d+$`))
        const standingValue = readValue(
          new RegExp(`^${name} Standing multiplier: times \\d+(?:\\.\\d+)?$`),
        )
        // DLR-68 AC4 wrapped `scoreHunt`'s `damage` field in `roundDamage`, so the panel's
        // figure is the ROUNDED product, not the bare one — a ×0.5 band on an odd card sum no
        // longer reaches the screen as a fraction. Reading the engine's own rounding rule here
        // (rather than re-deriving the arithmetic) keeps this assertion meaningful and
        // non-tautological: it pins AC4's consequence at the UI layer instead of asserting the
        // raw product this test asserted before AC4 landed. Whether a rounded equation like
        // `123 × 0.5 = 62` reads correctly to a player is DLR-71's copy call, not this test's.
        expect(readValue(new RegExp(`^${name} Damage: \\d+(?:\\.\\d+)?$`))).toBe(
          roundDamage(spoilsValue * standingValue),
        )
      }

      expect(screen.queryByLabelText(/Demand/)).toBeNull()
      expect(screen.queryByText(/demand (cleared|missed)/i)).toBeNull()
    })
  })
})

describe('WarCouncilRound — DLR-63', () => {
  // `DecreePile` renders the decree face-up through the same `PlayingCard` button — always
  // disabled, but its accessible name ("10 of Bells" for `makeRound()`'s default decree)
  // still matches `/of (Bells|Keys|Moons)/`, so every query below is scoped to the hand's
  // own labelled group to avoid counting that card as a hand card.
  function handCardButtons() {
    const hand = screen.getByRole('group', { name: /hand/i })
    return within(hand).getAllByRole('button', { name: /of (Bells|Keys|Moons)/ })
  }

  it('shows the declare gate before the first trick and no tappable card', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /play to win/i })).toBeDefined()
    for (const button of handCardButtons()) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('clears the gate and enables the hand once declared', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /play to win/i }))
    expect(screen.queryByRole('button', { name: /play to win/i })).toBeNull()
    expect(handCardButtons().some((b) => !(b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('renders the hand longest-suit-first, not in dealt order (AC6)', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    const names = handCardButtons().map((b) => b.getAttribute('aria-label') ?? '')
    // makeRound's hand holds 2 of each suit, so ALL_SUITS order applies throughout:
    // Bells 2, Bells 7, Keys 3, Keys 8, Moons 5, Moons 11.
    expect(names).toEqual([
      '2 of Bells',
      '7 of Bells',
      '3 of Keys (Fox)',
      '8 of Keys',
      '5 of Moons (Woodcutter)',
      '11 of Moons (Monarch)',
    ])
  })
})
