import { describe, expect, it } from 'vitest'
import { RunOutcome } from '../../../hunt'
import {
  CONTINUE_ANYWAY_LABEL,
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  SHOP_LABEL,
  VISIT_SHOP_LABEL,
  fightLabel,
  runGoalText,
  runHeadline,
  runPositionLabel,
  runProgressText,
  runVerdictDetail,
  rewardText,
  tricksTakenText,
  unspentCoinsText,
} from '../runLabels'

describe('runProgressText (AC6)', () => {
  it('reads 1-based from a 0-based index, so fight 0 of 3 is "Fight 1 of 3"', () => {
    expect(runProgressText(0, 3)).toBe('Fight 1 of 3')
    expect(runProgressText(2, 3)).toBe('Fight 3 of 3')
  })
})

describe('runHeadline (AC5)', () => {
  it('distinguishes winning the last fight from winning an intermediate one', () => {
    const intermediate = runHeadline(RunOutcome.InProgress, undefined)
    const final = runHeadline(RunOutcome.Won, undefined)
    expect(final).not.toBe(intermediate)
    expect(final).toContain('WIN')
  })

  it('names losing distinctly from either win', () => {
    const lost = runHeadline(RunOutcome.Lost, undefined)
    expect(lost).not.toBe(runHeadline(RunOutcome.Won, undefined))
    expect(lost).not.toBe(runHeadline(RunOutcome.InProgress, undefined))
  })

  it('names no Quarry when no opponent is known', () => {
    for (const outcome of Object.values(RunOutcome)) {
      expect(runHeadline(outcome, undefined)).not.toMatch(/monarch|quarry/i)
    }
  })
})

describe('runVerdictDetail', () => {
  it('names the fight that is waiting when the run continues', () => {
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 3, 7, undefined)).toContain('Fight 2 of 3')
  })

  it('names the fight the player went down on when the run is lost', () => {
    expect(runVerdictDetail(RunOutcome.Lost, 2, 3, 0, undefined)).toContain('3 of 3')
  })

  it('states the run length when the run is won', () => {
    expect(runVerdictDetail(RunOutcome.Won, 2, 3, 2, undefined)).toContain('3')
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

  it('names all five controls mutually distinctly, so a role query never matches two', () => {
    const labels = [
      NEXT_FIGHT_LABEL,
      NEW_RUN_LABEL,
      SHOP_LABEL,
      VISIT_SHOP_LABEL,
      CONTINUE_ANYWAY_LABEL,
    ]
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('unspentCoinsText', () => {
  it('names the balance, reading singular at 1 and plural at 2', () => {
    expect(unspentCoinsText(1)).toContain('1 coin')
    expect(unspentCoinsText(1)).not.toContain('1 coins')
    expect(unspentCoinsText(2)).toContain('2 coins')
  })
})

describe('rewardText (DLR-95 AC1, AC6)', () => {
  it('names both payouts when the quick kill fired', () => {
    expect(rewardText(1, 10)).toBe('Fight won +1 coin · Quick kill +10 coins')
  })

  it('drops the quick-kill clause entirely when it paid nothing (AC5)', () => {
    expect(rewardText(1, 0)).toBe('Fight won +1 coin')
  })

  it('singularises a one-coin quick kill', () => {
    expect(rewardText(1, 1)).toBe('Fight won +1 coin · Quick kill +1 coin')
  })
})

describe('naming (DLR-85)', () => {
  it('names a continue control after its opponent', () => {
    expect(fightLabel('Cillian')).toBe('Fight Cillian')
  })

  it('states the goal from the configured length', () => {
    expect(runGoalText(25)).toBe('Beat all 25')
  })

  it('names the opponent just beaten in the headline', () => {
    expect(runHeadline(RunOutcome.InProgress, 'Aoife')).toBe('Aoife defeated')
  })

  it('falls back to the generic headline with no name', () => {
    expect(runHeadline(RunOutcome.InProgress, undefined)).toBe('FIGHT WON')
  })

  it('keeps the terminal headlines about the run, not one opponent', () => {
    expect(runHeadline(RunOutcome.Won, 'Diarmuid')).toBe('YOU WIN')
    expect(runHeadline(RunOutcome.Lost, 'Aoife')).toBe('YOU LOSE')
  })

  it('names the coming opponent in the verdict detail', () => {
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 25, 7, 'Cillian')).toContain('Cillian')
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 25, 7, 'Cillian')).toContain('Fight 2 of 25')
  })

  it('names the opponent in the felt’s position readout', () => {
    expect(runPositionLabel(0, 25, 'Aoife')).toBe('Fight 1 of 25 — Aoife')
  })
})
