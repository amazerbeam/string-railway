import { describe, expect, it } from 'vitest'
import { CardRank, PlayerSide, Suit, type TrickCard } from '../../../warCouncil'
import {
  ConsequenceBranch,
  ConsequenceClauseKind,
  trickConsequence,
  type TrickConsequenceFacts,
} from '../trickConsequenceModel'
import { CONSEQUENCE_CLAUSE_TEXT } from '../consequenceLabels'

function ledBy(
  side: (typeof PlayerSide)[keyof typeof PlayerSide],
  rank: number,
  suit = Suit.Bells,
): TrickCard {
  return { side, card: { suit, rank } }
}

function facts(overrides: Partial<TrickConsequenceFacts> = {}): TrickConsequenceFacts {
  return {
    led: ledBy(PlayerSide.Cpu, 4),
    skulled: false,
    trumpSuit: Suit.Bells,
    witchCount: 0,
    ...overrides,
  }
}

describe('trickConsequence — silence (AC14)', () => {
  it('returns null when there is no led card', () => {
    expect(trickConsequence(facts({ led: null }))).toBeNull()
  })

  it('returns null when the player led the card', () => {
    expect(trickConsequence(facts({ led: ledBy(PlayerSide.Player, 4) }))).toBeNull()
  })

  it('returns null for a clean (unskulled) 4 led by the Quarry', () => {
    expect(trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, 4), skulled: false }))).toBeNull()
  })

  it('returns null for a clean Treasure (7) — a named card with no rule attached', () => {
    expect(
      trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, CardRank.Treasure), skulled: false })),
    ).toBeNull()
  })
})

describe('trickConsequence — the skull pair (AC13)', () => {
  it('a skulled 4 produces exactly two rows, Win then Lose, with the dodge-quadrant tones', () => {
    const view = trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, 4), skulled: true }))
    expect(view).not.toBeNull()
    expect(view!.rows).toHaveLength(2)
    expect(view!.rows[0].branch).toBe(ConsequenceBranch.Win)
    expect(view!.rows[0].clauses).toEqual([
      { kind: ConsequenceClauseKind.YouEatSkull, tone: 'costly' },
    ])
    expect(view!.rows[1].branch).toBe(ConsequenceBranch.Lose)
    expect(view!.rows[1].clauses).toEqual([
      { kind: ConsequenceClauseKind.TheyEatSkull, tone: 'worthwhile' },
    ])
  })
})

describe('trickConsequence — the Swan clause', () => {
  it('a skulled Swan adds SwanLoserLeads to the Win row only', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Swan), skulled: true }),
    )
    expect(view).not.toBeNull()
    const winRow = view!.rows.find((row) => row.branch === ConsequenceBranch.Win)!
    const loseRow = view!.rows.find((row) => row.branch === ConsequenceBranch.Lose)!
    expect(winRow.clauses.map((c) => c.kind)).toContain(ConsequenceClauseKind.SwanLoserLeads)
    expect(loseRow.clauses.map((c) => c.kind)).not.toContain(ConsequenceClauseKind.SwanLoserLeads)
  })

  it('an unskulled Swan returns a single Win row carrying only SwanLoserLeads', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Swan), skulled: false }),
    )
    expect(view).not.toBeNull()
    expect(view!.rows).toHaveLength(1)
    expect(view!.rows[0].branch).toBe(ConsequenceBranch.Win)
    expect(view!.rows[0].clauses).toEqual([
      { kind: ConsequenceClauseKind.SwanLoserLeads, tone: 'neutral' },
    ])
  })
})

describe('trickConsequence — the Monarch (AC13)', () => {
  it('a led Monarch produces a Rule row carrying MonarchNarrowsFollow, unskulled', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Monarch), skulled: false }),
    )
    expect(view).not.toBeNull()
    const ruleRow = view!.rows.find((row) => row.branch === ConsequenceBranch.Rule)
    expect(ruleRow).toBeDefined()
    expect(ruleRow!.clauses).toEqual([
      { kind: ConsequenceClauseKind.MonarchNarrowsFollow, tone: 'neutral' },
    ])
  })

  it('a led Monarch produces the same Rule row when skulled, alongside the skull pair', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Monarch), skulled: true }),
    )
    expect(view).not.toBeNull()
    expect(view!.rows.map((row) => row.branch)).toEqual([
      ConsequenceBranch.Win,
      ConsequenceBranch.Lose,
      ConsequenceBranch.Rule,
    ])
  })
})

describe('trickConsequence — the lone Witch', () => {
  it('exactly one Witch face up produces a Rule row carrying LoneWitchIsTrump', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Witch), witchCount: 1 }),
    )
    expect(view).not.toBeNull()
    expect(view!.rows).toEqual([
      {
        branch: ConsequenceBranch.Rule,
        clauses: [{ kind: ConsequenceClauseKind.LoneWitchIsTrump, tone: 'neutral' }],
      },
    ])
  })

  it('two Witches cancel — no rule row, and the return is null with nothing else to say', () => {
    const view = trickConsequence(
      facts({ led: ledBy(PlayerSide.Cpu, CardRank.Witch), witchCount: 2 }),
    )
    expect(view).toBeNull()
  })
})

describe('trickConsequence — Fox and Woodcutter produce no clause', () => {
  it('a clean led Fox produces no readout', () => {
    expect(trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, CardRank.Fox) }))).toBeNull()
  })

  it('a clean led Woodcutter produces no readout', () => {
    expect(trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, CardRank.Woodcutter) }))).toBeNull()
  })
})

describe('trickConsequence — AC15, no branch is emphasised and no hidden info leaks', () => {
  it('the Win and Lose rows differ only in branch and clauses — no flag, weight or ordering marks one as likely', () => {
    const view = trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, 4), skulled: true }))
    expect(view).not.toBeNull()
    const [winRow, loseRow] = view!.rows
    expect(Object.keys(winRow).sort()).toEqual(['branch', 'clauses'])
    expect(Object.keys(loseRow).sort()).toEqual(['branch', 'clauses'])
  })

  it('no clause kind mentions the Quarry hand or unplayed card', () => {
    for (const kind of Object.values(ConsequenceClauseKind)) {
      const text = CONSEQUENCE_CLAUSE_TEXT[kind].toLowerCase()
      expect(text).not.toMatch(/hand|unplayed/)
    }
  })
})

describe('trickConsequence — structural invariants', () => {
  it('rows is never empty when the return is non-null, and no row has empty clauses', () => {
    const view = trickConsequence(facts({ led: ledBy(PlayerSide.Cpu, 4), skulled: true }))
    expect(view).not.toBeNull()
    expect(view!.rows.length).toBeGreaterThan(0)
    for (const row of view!.rows) {
      expect(row.clauses.length).toBeGreaterThan(0)
    }
  })

  it('every ConsequenceClauseKind has a non-empty entry in CONSEQUENCE_CLAUSE_TEXT', () => {
    for (const kind of Object.values(ConsequenceClauseKind)) {
      expect(CONSEQUENCE_CLAUSE_TEXT[kind].length).toBeGreaterThan(0)
    }
  })
})
