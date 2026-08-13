import { describe, expect, it } from 'vitest'
import { QUARRY_CHARACTERS, quarryCharacterInfo } from '../quarryCharacters'
import { QuarryCharacter } from '../types'

describe('quarryCharacterInfo', () => {
  it('resolves the Monarch to a name', () => {
    const info = quarryCharacterInfo(QuarryCharacter.Monarch)
    expect(info?.name).toBe('The Monarch')
  })

  it('carries no rule text — DLR-81 deleted every character power', () => {
    // A description field here would be a rule on screen that no code applies. Powers are
    // deferred to a final-boss ticket, which adds its own copy alongside its own enforcement.
    const info = quarryCharacterInfo(QuarryCharacter.Monarch)
    expect(info).not.toHaveProperty('description')
    expect(Object.keys(info!).sort()).toEqual(['character', 'name'])
  })

  it('resolves to undefined for a character with no entry yet', () => {
    expect(quarryCharacterInfo(QuarryCharacter.Witch)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Fox)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Woodcutter)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Swan)).toBeUndefined()
  })

  it('keys every entry by its own character, so a lookup cannot return another character', () => {
    for (const [key, info] of Object.entries(QUARRY_CHARACTERS)) {
      expect(info?.character).toBe(key)
    }
  })
})
