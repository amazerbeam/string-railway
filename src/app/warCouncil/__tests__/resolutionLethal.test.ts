import { describe, expect, it } from 'vitest'
import { applyDamage, quarryHealthForEncounter, startEncounter } from '../../../hunt'
import { incomingFromPot } from '../../../warCouncil'
import { potIsLethal } from '../resolutionLethal'

// DLR-160 AC6 — built through `startEncounter`/`quarryHealthForEncounter` rather than a hand-written
// literal, so the shield and ward fields cannot drift from the real shape.

describe('potIsLethal', () => {
  it('is false when the pot is below the Quarry’s remaining health', () => {
    const encounter = startEncounter(0)
    const quarryHealth = quarryHealthForEncounter(0)

    expect(potIsLethal(encounter, quarryHealth - 1)).toBe(false)
  })

  it('is true when the pot exactly equals the Quarry’s remaining health', () => {
    const encounter = startEncounter(0)
    const quarryHealth = quarryHealthForEncounter(0)

    expect(potIsLethal(encounter, quarryHealth)).toBe(true)
  })

  it('is true when the pot exceeds the Quarry’s remaining health', () => {
    const encounter = startEncounter(0)
    const quarryHealth = quarryHealthForEncounter(0)

    expect(potIsLethal(encounter, quarryHealth + 100)).toBe(true)
  })

  it('is true, without calling applyDamage again, when the encounter is already resolved', () => {
    // DLR-160 QA fix — the deciding trick's own damage (a skull's health loss
    // detonation, or earlier pot damage) routinely resolves the encounter before this
    // function is asked about it. `applyDamage` throws deliberately on an already-resolved
    // encounter, so this is the real shape `resolutionViewFor` (`commitHandlers.ts`) hands in.
    const quarryHealth = quarryHealthForEncounter(0)
    const resolved = applyDamage(startEncounter(0), incomingFromPot(quarryHealth))

    expect(potIsLethal(resolved, 0)).toBe(true)
  })
})
