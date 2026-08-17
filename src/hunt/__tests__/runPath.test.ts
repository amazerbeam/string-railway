import { describe, expect, it } from 'vitest'
import { OpponentKind, RUN_ENCOUNTERS, type RunEncounterConfig } from '../config'
import { PathNodeStatus, runPath } from '../runPath'

const ordinary = (name: string): RunEncounterConfig => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
})
const boss = (name: string): RunEncounterConfig => ({ name, kind: OpponentKind.Boss, health: 20 })

describe('runPath stage derivation', () => {
  it('groups a flat run of ordinary opponents into ONE stage with no boss', () => {
    const stages = runPath(0, [ordinary('Aoife'), ordinary('Cillian'), ordinary('Niamh')])
    expect(stages).toHaveLength(1)
    expect(stages[0]?.nodes).toHaveLength(3)
    expect(stages[0]?.closedByBoss).toBe(false)
    expect(stages[0]?.stageNumber).toBe(1)
  })

  it('closes a stage at every boss', () => {
    const stages = runPath(0, [ordinary('a'), boss('B1'), ordinary('b'), boss('B2')])
    expect(stages.map((s) => s.nodes.length)).toEqual([2, 2])
    expect(stages.map((s) => s.closedByBoss)).toEqual([true, true])
    expect(stages.map((s) => s.stageNumber)).toEqual([1, 2])
  })

  it('gives a trailing group with no boss its own final stage', () => {
    const stages = runPath(0, [ordinary('a'), boss('B1'), ordinary('b'), ordinary('c')])
    expect(stages.map((s) => s.closedByBoss)).toEqual([true, false])
    expect(stages[1]?.nodes.map((n) => n.name)).toEqual(['b', 'c'])
  })

  it('handles a boss in first position', () => {
    const stages = runPath(0, [boss('B1'), ordinary('a')])
    expect(stages.map((s) => s.nodes.length)).toEqual([1, 1])
  })

  it('derives five stages from the shipped configuration', () => {
    const stages = runPath(0, RUN_ENCOUNTERS)
    expect(stages).toHaveLength(5)
    expect(stages.every((s) => s.closedByBoss)).toBe(true)
    expect(stages.flatMap((s) => s.nodes)).toHaveLength(RUN_ENCOUNTERS.length)
  })

  it('defaults to the shipped configuration when none is supplied', () => {
    expect(runPath(0)).toEqual(runPath(0, RUN_ENCOUNTERS))
  })
})

describe('runPath status tagging', () => {
  const three = [ordinary('a'), ordinary('b'), ordinary('c')]
  const statuses = (beaten: number) =>
    runPath(beaten, three).flatMap((s) => s.nodes.map((n) => n.status))

  it('marks everything upcoming with the first node current on a fresh run', () => {
    expect(statuses(0)).toEqual([
      PathNodeStatus.Current,
      PathNodeStatus.Upcoming,
      PathNodeStatus.Upcoming,
    ])
  })

  it('marks beaten nodes beaten and keeps them in the path (AC6)', () => {
    expect(statuses(2)).toEqual([
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
      PathNodeStatus.Current,
    ])
  })

  it('has no current node once every encounter is beaten', () => {
    expect(statuses(3)).toEqual([
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
    ])
  })

  it('carries each node’s index, name and kind through', () => {
    const nodes = runPath(1, [ordinary('Aoife'), boss('Diarmuid')]).flatMap((s) => s.nodes)
    expect(nodes.map((n) => n.index)).toEqual([0, 1])
    expect(nodes.map((n) => n.name)).toEqual(['Aoife', 'Diarmuid'])
    expect(nodes.map((n) => n.kind)).toEqual([OpponentKind.Ordinary, OpponentKind.Boss])
  })
})

describe('runPath guards', () => {
  const three = [ordinary('a'), ordinary('b'), ordinary('c')]

  it('rejects an empty encounter list rather than returning an empty path', () => {
    expect(() => runPath(0, [])).toThrow(RangeError)
  })

  it('rejects a beatenCount outside 0..length', () => {
    expect(() => runPath(-1, three)).toThrow(RangeError)
    expect(() => runPath(4, three)).toThrow(RangeError)
  })

  it('rejects a non-integer or non-finite beatenCount', () => {
    expect(() => runPath(1.5, three)).toThrow(RangeError)
    expect(() => runPath(Number.NaN, three)).toThrow(RangeError)
  })
})
