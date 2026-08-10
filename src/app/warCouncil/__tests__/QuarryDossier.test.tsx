/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuarryCharacter, quarryCharacterInfo } from '../../../hunt'
import QuarryDossier from '../QuarryDossier'

afterEach(cleanup)

describe('QuarryDossier', () => {
  const info = quarryCharacterInfo(QuarryCharacter.Monarch)

  it('names the region by the character, carries a heading with the name, the rule-break sentence, and the trick count', () => {
    render(<QuarryDossier info={info} tricksWon={3} />)

    const region = screen.getByRole('region', { name: /the monarch/i })
    expect(region).toBeDefined()
    expect(screen.getByRole('heading', { name: 'The Monarch' })).toBeDefined()
    expect(info).toBeDefined()
    expect(screen.getByText(info!.description)).toBeDefined()
    expect(screen.getByLabelText('The Quarry has taken 3 tricks')).toBeDefined()
  })

  it('renders nothing when info is undefined', () => {
    const { container } = render(<QuarryDossier info={undefined} tricksWon={0} />)
    expect(container.firstChild).toBeNull()
  })
})
