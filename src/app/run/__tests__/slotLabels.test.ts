import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffTier,
  REEL_POOL_SIZE,
  SLOT_MACHINE_IDS,
  SlotOutcome,
  SlotPullRefusal,
  mintFromTemplate,
} from '../../../hunt'
import { buffConditionSentence, buffName } from '../../warCouncil/buffLabels'
import {
  SLOT_FREE_TAG,
  SLOT_MACHINE_NAME,
  SLOT_OUTCOME_LABEL,
  SLOT_REFUSAL_MESSAGE,
  slotOddsRows,
  slotStripSummaryText,
  slotPullAccessibleName,
  slotPullPriceText,
  slotSymbolText,
} from '../slotLabels'

describe('slotLabels', () => {
  it('names every SLOT_MACHINE_IDS member, and the names differ', () => {
    for (const id of SLOT_MACHINE_IDS) {
      expect(typeof SLOT_MACHINE_NAME[id]).toBe('string')
      expect(SLOT_MACHINE_NAME[id].length).toBeGreaterThan(0)
    }
    const names = SLOT_MACHINE_IDS.map((id) => SLOT_MACHINE_NAME[id])
    expect(new Set(names).size).toBe(names.length)
  })

  it('answers for every SlotOutcome', () => {
    for (const outcome of Object.values(SlotOutcome)) {
      expect(typeof SLOT_OUTCOME_LABEL[outcome]).toBe('string')
      expect(SLOT_OUTCOME_LABEL[outcome].length).toBeGreaterThan(0)
    }
  })

  it('renders a free pull as SLOT_FREE_TAG and a priced one in words', () => {
    expect(slotPullPriceText(0)).toBe(SLOT_FREE_TAG)
    expect(slotPullPriceText(1)).toBe('1 coin')
  })

  it('builds one payout row per SlotOutcome, every chance derived from the engine', () => {
    const rows = slotOddsRows()
    expect(rows).toHaveLength(Object.values(SlotOutcome).length)
    expect(new Set(rows.map((row) => row.outcome)).size).toBe(rows.length)
    expect(rows.find((row) => row.outcome === SlotOutcome.ThreeMatch)?.chance).toBe('1.6%')
    for (const row of rows) {
      expect(row.match.length).toBeGreaterThan(0)
      expect(row.pays.length).toBeGreaterThan(0)
    }
  })

  it('builds the strip summary entirely from the derived engine figures', () => {
    const text = slotStripSummaryText()
    expect(text).toContain(String(REEL_POOL_SIZE))
    expect(text).toContain('2.64')
  })

  it('words a strip symbol through the ONE buff grammar — no second way to describe a buff', () => {
    const template = BUFF_TEMPLATES[0]
    const expected = (() => {
      const wordingOnly = mintFromTemplate(template, BuffTier.Bronze, 0)
      return `${buffName(wordingOnly)} — ${buffConditionSentence(wordingOnly)}`
    })()
    expect(slotSymbolText(template)).toBe(expected)
  })

  it('folds the refusal into the pull control accessible name', () => {
    const name = slotPullAccessibleName(1, SlotPullRefusal.NotEnoughCoins)
    expect(name.endsWith(SLOT_REFUSAL_MESSAGE[SlotPullRefusal.NotEnoughCoins])).toBe(true)
  })
})
