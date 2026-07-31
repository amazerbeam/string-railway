import { describe, expect, it } from 'vitest'

describe('rules engine test harness', () => {
  it('runs pure TypeScript specs with no DOM available', () => {
    expect('document' in globalThis).toBe(false)
  })
})
