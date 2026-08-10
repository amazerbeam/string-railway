import { describe, expect, it } from 'vitest'
import { QUARRY_CHARACTERS, quarryCharacterInfo } from '../quarryCharacters'
import { QuarryCharacter } from '../types'

describe('quarryCharacterInfo', () => {
  it('resolves the Monarch to a name and a one-sentence player-facing description', () => {
    const info = quarryCharacterInfo(QuarryCharacter.Monarch)
    expect(info?.name).toBe('The Monarch')
    expect(info?.description).toBe(
      'Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it.',
    )
  })

  it('resolves to undefined for a character whose rule-break is not implemented yet', () => {
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
