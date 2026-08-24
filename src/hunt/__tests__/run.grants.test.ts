import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES } from '../buffTemplates'
import { BuffTier } from '../buffs'
import { PLAYER_START_HEALTH, STARTING_BUFF_COUNT } from '../config'
import { startRun } from '../run'

describe('startRun grants', () => {
  it('returns the unchanged default path when called with no grants', () => {
    const run = startRun()
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT)
    expect(run.nextBuffId).toBe(STARTING_BUFF_COUNT + 1)
  })

  it('mints a granted starting card at the requested tier, appended to the seeded pile', () => {
    const template = BUFF_TEMPLATES[0]
    const run = startRun(PLAYER_START_HEALTH, [{ templateId: template.id, tier: BuffTier.Gold }])
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT + 1)
    const last = run.buffs[run.buffs.length - 1]
    expect(last.tier).toBe(BuffTier.Gold)
    expect(last.kind).toBe(template.kind)
  })

  it('mints unique ids across the whole pile, with nextBuffId one past the highest', () => {
    const template = BUFF_TEMPLATES[1]
    const run = startRun(PLAYER_START_HEALTH, [{ templateId: template.id, tier: BuffTier.Bronze }])
    const ids = run.buffs.map((buff) => buff.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(run.nextBuffId).toBe(Math.max(...ids) + 1)
  })

  it('adds nothing for an unknown template and leaves nextBuffId unmoved', () => {
    const run = startRun(PLAYER_START_HEALTH, [{ templateId: 'nope:nope', tier: BuffTier.Silver }])
    expect(run.buffs).toHaveLength(STARTING_BUFF_COUNT)
    expect(run.nextBuffId).toBe(STARTING_BUFF_COUNT + 1)
  })
})
