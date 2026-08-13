/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuarryCharacter, quarryCharacterInfo } from '../../../hunt'
import QuarryDossier from '../QuarryDossier'

afterEach(cleanup)

describe('QuarryDossier', () => {
  const info = quarryCharacterInfo(QuarryCharacter.Monarch)

  it('names the region by the character, carries a heading with the name and the trick count', () => {
    render(<QuarryDossier info={info} tricksWon={3} />)

    const region = screen.getByRole('region', { name: /the monarch/i })
    expect(region).toBeDefined()
    expect(screen.getByRole('heading', { name: 'The Monarch' })).toBeDefined()
    expect(info).toBeDefined()
    expect(screen.getByLabelText('The Quarry has taken 3 tricks')).toBeDefined()
  })

  it('prints no rule line — the Quarry plays by the same rules as the player', () => {
    // Regression guard for DLR-81. The old panel printed the Monarch's round-long rule-break;
    // there is no power to describe now, and a sentence here would misrepresent the engine.
    render(<QuarryDossier info={info} tricksWon={0} />)
    expect(screen.queryByText(/you must play your Swan/i)).toBeNull()
    expect(screen.queryByText(/highest card of it/i)).toBeNull()
  })

  it('renders nothing when info is undefined', () => {
    const { container } = render(<QuarryDossier info={undefined} tricksWon={0} />)
    expect(container.firstChild).toBeNull()
  })
})
