import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OpponentKind, PathNodeStatus, runPath, type RunEncounterConfig } from '../../../hunt'
import RunMap from '../RunMap'
import { RUN_MAP_GROUP_LABEL } from '../runLabels'

afterEach(cleanup)

const ordinary = (name: string): RunEncounterConfig => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
})
const boss = (name: string): RunEncounterConfig => ({ name, kind: OpponentKind.Boss, health: 20 })

const FIVE = [
  ordinary('Aoife'),
  ordinary('Cillian'),
  boss('Bréanainn'),
  ordinary('Niamh'),
  boss('Muireann'),
]

describe('RunMap', () => {
  it('names every opponent on the path (AC4)', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    for (const name of ['Aoife', 'Cillian', 'Bréanainn', 'Niamh', 'Muireann']) {
      expect(screen.getByText(name)).toBeTruthy()
    }
  })

  it('states the run’s goal alongside the path (AC5)', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByText('Beat all 5')).toBeTruthy()
  })

  it('exposes the path as one labelled group', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByRole('list', { name: RUN_MAP_GROUP_LABEL })).toBeTruthy()
  })

  it('marks ordinary opponents and bosses with different glyphs (AC3)', () => {
    const { container } = render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(container.querySelectorAll('.run-path-tick')).toHaveLength(3)
    expect(container.querySelectorAll('.run-path-block')).toHaveLength(2)
  })

  it('keeps beaten opponents visible and struck out, not removed (AC6)', () => {
    const { container } = render(<RunMap stages={runPath(2, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByText('Aoife')).toBeTruthy()
    expect(container.querySelectorAll(`[data-status="${PathNodeStatus.Beaten}"]`)).toHaveLength(2)
    // Struck out in FORM, not by colour — game-ux requires a greyscale screenshot to read.
    expect(container.querySelectorAll('.run-path-name s')).toHaveLength(2)
  })

  it('distinguishes the current opponent from those beyond it (AC7)', () => {
    const { container } = render(<RunMap stages={runPath(2, FIVE)} goalText="Beat all 5" />)
    const current = container.querySelectorAll(`[data-status="${PathNodeStatus.Current}"]`)
    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Bréanainn')).toBeTruthy()
  })

  it('adds no tab stops — the path is a status display, not a control group', () => {
    const { container } = render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  })

  it('renders a flat run as one stage of ticks with no block', () => {
    const flat = [ordinary('a'), ordinary('b'), ordinary('c')]
    const { container } = render(<RunMap stages={runPath(0, flat)} goalText="Beat all 3" />)
    expect(container.querySelectorAll('.run-path-block')).toHaveLength(0)
    expect(container.querySelectorAll('.run-path-stage')).toHaveLength(1)
  })

  it('wraps each stage’s nodes in the class runMap.css lays out as a row (regression)', () => {
    // jsdom has no layout engine, so it cannot prove the nodes render horizontally — but it
    // can pin the structural contract the fix restores: every stage's nodes sit inside their
    // own `.run-path-stage-nodes` list, which is exactly the class `runMap.css` now gives
    // `display: flex`. A regression that drops this wrapper, or renames it without updating
    // the stylesheet, breaks this assertion.
    const { container } = render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    const stageNodeLists = container.querySelectorAll('.run-path-stage-nodes')
    // FIVE closes a stage at each boss (Bréanainn, Muireann) — two stages.
    expect(stageNodeLists).toHaveLength(2)
    for (const list of stageNodeLists) {
      expect(list.tagName).toBe('OL')
      // Nodes are DIRECT children of the flex row — no further nesting to stack them.
      const nodes = Array.from(list.children)
      expect(nodes.length).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(node.className).toBe('run-path-node')
      }
    }
  })
})
