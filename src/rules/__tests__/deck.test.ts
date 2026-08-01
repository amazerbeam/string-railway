import { describe, expect, it } from 'vitest'
import { DECK_SIZE, STATION_DEFINITIONS, STATION_TYPE } from '../../constants/stations'
import { buildDeck } from '../deck'
import { createRng } from '../rng'
import { TEST_CONFIG } from './fixtures'

const composition = TEST_CONFIG.deckComposition

describe('buildDeck', () => {
  it('builds exactly DECK_SIZE cards from the M17 composition (§8.1)', () => {
    expect(buildDeck(composition, createRng(1))).toHaveLength(DECK_SIZE)
  })

  it('honours every per-type count', () => {
    const deck = buildDeck(composition, createRng(1))
    for (const [type, count] of Object.entries(composition)) {
      expect(deck.filter((card) => card.type === type)).toHaveLength(count)
    }
  })

  it('never includes a STARTING card — §2 ships those separately', () => {
    const deck = buildDeck(composition, createRng(1))
    expect(deck.some((card) => card.type === STATION_TYPE.STARTING)).toBe(false)
  })

  it('copies the §8 printed values from STATION_DEFINITIONS, not from config', () => {
    const deck = buildDeck(composition, createRng(1))
    const scenic = deck.find((card) => card.type === STATION_TYPE.SCENIC)
    expect(scenic).toBeDefined()
    const definition = STATION_DEFINITIONS[STATION_TYPE.SCENIC]
    expect(scenic?.bonusFirst).toBe(definition.bonusFirst)
    expect(scenic?.bonusLater).toBe(definition.bonusLater)
    expect(scenic?.playerLimit).toBe(definition.playerLimit)
    expect(scenic?.flags.mountainBonus).toBe(true)
  })

  it('gives every card a unique id so a move log can name one unambiguously', () => {
    const deck = buildDeck(composition, createRng(1))
    expect(new Set(deck.map((card) => card.id)).size).toBe(DECK_SIZE)
  })

  it('shuffles deterministically for a given seed (SCRUM-4 AC8)', () => {
    const a = buildDeck(composition, createRng(42)).map((card) => card.id)
    const b = buildDeck(composition, createRng(42)).map((card) => card.id)
    expect(a).toEqual(b)
  })

  it('shuffles differently for a different seed', () => {
    const a = buildDeck(composition, createRng(1)).map((card) => card.id)
    const b = buildDeck(composition, createRng(2)).map((card) => card.id)
    expect(a).not.toEqual(b)
  })

  it('tolerates a zero count for a type', () => {
    const deck = buildDeck({ ...composition, DEPOT: 0, TOWN: 7 }, createRng(1))
    expect(deck.some((card) => card.type === STATION_TYPE.DEPOT)).toBe(false)
    expect(deck).toHaveLength(DECK_SIZE)
  })
})
