import { describe, expect, it } from 'vitest'
import { RunOutcome } from '../../../hunt'
import {
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  runHeadline,
  runProgressText,
  runVerdictDetail,
  tricksTakenText,
} from '../runLabels'

describe('runProgressText (AC6)', () => {
  it('reads 1-based from a 0-based index, so fight 0 of 3 is "Fight 1 of 3"', () => {
    expect(runProgressText(0, 3)).toBe('Fight 1 of 3')
    expect(runProgressText(2, 3)).toBe('Fight 3 of 3')
  })
})

describe('runHeadline (AC5)', () => {
  it('distinguishes winning the last fight from winning an intermediate one', () => {
    const intermediate = runHeadline(RunOutcome.InProgress)
    const final = runHeadline(RunOutcome.Won)
    expect(final).not.toBe(intermediate)
    expect(final).toContain('WIN')
  })

  it('names losing distinctly from either win', () => {
    const lost = runHeadline(RunOutcome.Lost)
    expect(lost).not.toBe(runHeadline(RunOutcome.Won))
    expect(lost).not.toBe(runHeadline(RunOutcome.InProgress))
  })

  it('names no Quarry — the roster is DLR-85’s', () => {
    for (const outcome of Object.values(RunOutcome)) {
      expect(runHeadline(outcome)).not.toMatch(/monarch|quarry/i)
    }
  })
})

describe('runVerdictDetail', () => {
  it('names the fight that is waiting when the run continues', () => {
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 3, 7)).toContain('Fight 2 of 3')
  })

  it('names the fight the player went down on when the run is lost', () => {
    expect(runVerdictDetail(RunOutcome.Lost, 2, 3, 0)).toContain('3 of 3')
  })

  it('states the run length when the run is won', () => {
    expect(runVerdictDetail(RunOutcome.Won, 2, 3, 2)).toContain('3')
  })
})

describe('tricksTakenText', () => {
  it('states both figures, so the bars do not depend on colour alone', () => {
    expect(tricksTakenText(4, 2)).toContain('4')
    expect(tricksTakenText(4, 2)).toContain('6')
  })
})

describe('control labels', () => {
  it('names the two forward controls differently, so a role query tells them apart', () => {
    expect(NEXT_FIGHT_LABEL).not.toBe(NEW_RUN_LABEL)
  })
})
