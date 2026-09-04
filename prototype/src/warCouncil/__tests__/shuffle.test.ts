import { describe, expect, it } from 'vitest'
import { shuffle } from '../shuffle'

function fixedSequence(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('shuffle', () => {
  it('returns a permutation containing exactly the same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input, fixedSequence([0.9, 0.1, 0.5, 0.2, 0.8]))
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input, fixedSequence([0.5, 0.5, 0.5]))
    expect(input).toEqual([1, 2, 3])
  })

  it('is deterministic for a given rng sequence', () => {
    const input = [1, 2, 3, 4, 5]
    const rngValues = [0.9, 0.1, 0.5, 0.2, 0.8]
    const first = shuffle(input, fixedSequence(rngValues))
    const second = shuffle(input, fixedSequence(rngValues))
    expect(first).toEqual(second)
  })
})
