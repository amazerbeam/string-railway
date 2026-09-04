import { describe, expect, it } from 'vitest'
import { STARTING_AP } from '../apConfig'
import { BuffActivationRefusal, buffActivationRefusalFor } from '../buffActivation'

/**
 * `buffActivationRefusalFor` alone — the ONE statement of whether a card can be activated right
 * now, and the ORDER its reasons are reported in.
 *
 * Split out of `buffActivation.test.ts` on the DLR-162..167 fix pass, once that file passed its
 * 400-line budget (four of the five tickets in that run grew it). The seam is the subject, not the
 * line count: every test here is a pure question-in, reason-out call on one predicate and needs
 * none of the `Buff` fixtures or `BuffActivationState` the sibling file's transition tests are
 * built on. `buffActivation.test.ts` keeps the transitions — activate, spend, revoke, the window.
 */
describe('buffActivationRefusalFor — AC5, refusal with a reason', () => {
  it('DLR-145 AC2 — InsufficientAp is now unreachable: canAffordAp re-derives the cost through the disabled AP_ENABLED flag, so even a pool below the raw apCost passes', () => {
    // InsufficientAp stays in the BuffActivationRefusal union (BUFF_ACTIVATION_REFUSAL_MESSAGE
    // stays a total Record over it) but nothing can reach it any more: canAffordAp calls
    // apCostFor(cost) internally, which reads AP_ENABLED — not the apCost this stock carries.
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: true,
        curseLive: false,
        windowOpen: true,
        apPool: 1,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBeNull()
  })

  it('refuses WindowClosed when the window is not open', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: true,
        curseLive: false,
        windowOpen: false,
        apPool: 6,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('refuses AlreadyActive when the buff is already active this trick', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: true,
        curseLive: false,
        windowOpen: true,
        apPool: 6,
        apCost: 2,
        alreadyActive: true,
      }),
    ).toBe(BuffActivationRefusal.AlreadyActive)
  })

  it('permits activation — null — when window is open, affordable, and not already active', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: true,
        curseLive: false,
        windowOpen: true,
        apPool: 6,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBeNull()
  })

  it('reports WindowClosed before InsufficientAp — a closed window is true of the whole felt', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: true,
        curseLive: false,
        windowOpen: false,
        apPool: 0,
        apCost: 5,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('DLR-126 — reports NoEffectYet before every other reason, because it is true of the CARD', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: false,
        curseLive: false,
        windowOpen: false,
        apPool: 0,
        apCost: 5,
        alreadyActive: true,
      }),
    ).toBe(BuffActivationRefusal.NoEffectYet)
  })

  it('DLR-126 — refuses NoEffectYet even on a wide-open felt with a full pool', () => {
    expect(
      buffActivationRefusalFor({
        shopOnly: false,
        effectLive: false,
        curseLive: false,
        windowOpen: true,
        apPool: STARTING_AP,
        apCost: 1,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.NoEffectYet)
  })
})
