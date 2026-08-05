import { describe, expect, it } from 'vitest'
import { AppMode } from '../appMode'

describe('AppMode', () => {
  it('names exactly Campaign and Test', () => {
    expect(Object.values(AppMode)).toEqual(['campaign', 'test'])
  })

  it('has no duplicate mode values', () => {
    const values = Object.values(AppMode)
    expect(new Set(values).size).toBe(values.length)
  })
})
