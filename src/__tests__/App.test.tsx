import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { RUN_ENCOUNTERS } from '../hunt'
import { fightLabel, runGoalText, START_TITLE } from '../app/run/runLabels'

afterEach(cleanup)

describe('App run flow (DLR-85)', () => {
  it('shows the start screen before the first fight (AC1)', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: START_TITLE })).toBeTruthy()
    expect(screen.getByText(runGoalText(RUN_ENCOUNTERS.length))).toBeTruthy()
  })

  it('names every opponent of the run on the start screen (AC4)', () => {
    render(<App />)
    for (const encounter of RUN_ENCOUNTERS) {
      expect(screen.getByText(encounter.name)).toBeTruthy()
    }
  })

  it('offers one action, named after the first opponent (AC1, AC8)', () => {
    render(<App />)
    const first = RUN_ENCOUNTERS[0]?.name as string
    expect(screen.getByRole('button', { name: fightLabel(first) })).toBeTruthy()
  })

  it('leaves the start screen for the felt when the action is pressed', () => {
    render(<App />)
    const first = RUN_ENCOUNTERS[0]?.name as string
    fireEvent.click(screen.getByRole('button', { name: fightLabel(first) }))
    expect(screen.queryByRole('heading', { name: START_TITLE })).toBeNull()
  })
})
