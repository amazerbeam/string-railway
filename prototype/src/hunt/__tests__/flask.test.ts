import { describe, expect, it } from 'vitest'
import { FLASK_HEAL_PERCENT, PLAYER_START_HEALTH } from '../config'
import { FlaskRefusal, flaskHealAmount, flaskRefusalFor, type FlaskStock } from '../flask'

const stock = (over: Partial<FlaskStock> = {}): FlaskStock => ({
  charges: 1,
  playerHealth: 4,
  maxPlayerHealth: 10,
  ...over,
})

describe('flaskHealAmount (AC2)', () => {
  it('is the configured proportion of the maximum, rounded to whole health', () => {
    expect(flaskHealAmount(10)).toBe(Math.round(10 * FLASK_HEAL_PERCENT))
    expect(flaskHealAmount(10)).toBe(6)
  })

  it('rounds rather than returning a fraction a heart row could not render', () => {
    expect(Number.isInteger(flaskHealAmount(7))).toBe(true)
    expect(Number.isInteger(flaskHealAmount(PLAYER_START_HEALTH))).toBe(true)
  })

  it('refuses a maximum that is not a positive finite number', () => {
    expect(() => flaskHealAmount(0)).toThrow(RangeError)
    expect(() => flaskHealAmount(-1)).toThrow(RangeError)
    expect(() => flaskHealAmount(Number.NaN)).toThrow(RangeError)
    expect(() => flaskHealAmount(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('flaskRefusalFor (AC3)', () => {
  it('allows the drink with a charge in hand and health missing', () => {
    expect(flaskRefusalFor(stock())).toBeNull()
  })

  it('refuses with NoCharges at zero charges', () => {
    expect(flaskRefusalFor(stock({ charges: 0 }))).toBe(FlaskRefusal.NoCharges)
  })

  it('refuses with AlreadyFullHealth at the maximum', () => {
    expect(flaskRefusalFor(stock({ playerHealth: 10 }))).toBe(FlaskRefusal.AlreadyFullHealth)
  })

  it('refuses with AlreadyFullHealth above the maximum too, not just at it', () => {
    expect(flaskRefusalFor(stock({ playerHealth: 12 }))).toBe(FlaskRefusal.AlreadyFullHealth)
  })

  // The empty flask is the reason that will still be true after the next hit, so it comes first.
  it('names the empty flask ahead of full health when both hold', () => {
    expect(flaskRefusalFor(stock({ charges: 0, playerHealth: 10 }))).toBe(FlaskRefusal.NoCharges)
  })

  it('refuses rather than passing the comparison on a non-finite charge count', () => {
    expect(flaskRefusalFor(stock({ charges: Number.NaN }))).toBe(FlaskRefusal.NoCharges)
  })
})
