# Tasks: The flask — a free heal that refills on a stage-boss kill

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-20

**Goal:** Add a free, player-triggered emergency heal — one charge of run state, restoring 60% of maximum health (clamped, overheal discarded), refused with a stated reason at zero charges or full health, refilling to one charge on a stage-boss kill and never on an ordinary one — drunk from the shop screen via a potion-icon button placed away from the priced Heal.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (functional placeholder — the developer's UX design supersedes its visuals).

---

## File map

**Created:**

- `src/hunt/flask.ts` — the flask's rules: `FlaskRefusal`, `FlaskStock`, `flaskHealAmount`, `flaskRefusalFor`. A `shop.ts` clone in shape.
- `src/hunt/__tests__/flask.test.ts` — the heal amount and both refusal conditions, without a renderer.
- `src/hunt/__tests__/run.flask.test.ts` — AC7's run-level cases: starting charge, drink-and-clamp, the boss refill, and no refill on an ordinary kill.
- `src/app/run/FlaskMark.tsx` — the potion glyph, on `HeartMark.tsx`'s `<symbol>`/`<use>` pattern.

**Modified:**

- `src/hunt/config.ts` — add `FLASK_STARTING_CHARGES` and `FLASK_HEAL_PERCENT`; correct line 215's now-false "there is no flask" comment.
- `src/hunt/encounter.ts:21-22` — correct the docblock sentence that says the flask stories still own `ENCOUNTER_PLAYER_RESTORE`.
- `src/hunt/run.ts` — `RunState.flaskCharges`, `startRun`'s literal, the shared `healedBy` clamp, `flaskStockFor`, `drinkFlask`, and `flaskAfter` wired into `recordEncounter`.
- `src/hunt/index.ts` — barrel exports for every new name.
- `src/hunt/__tests__/config.test.ts` — assert both new keys.
- `src/app/run/shopLabels.ts` — the flask's copy and its total refusal-message map.
- `src/app/run/ShopPanel.tsx` — three new props, the flask block, and the symbol sheet mount.
- `src/app/run/shop.css` — the `.shop-flask` block.
- `src/App.tsx` — `handleDrinkFlask` and the three new `ShopPanel` props.
- `src/app/run/__tests__/ShopPanel.test.tsx` — extend `baseProps`; cover the enabled control, both refusals, and the charge readout.
- `src/app/run/__tests__/shopLabels.test.ts` — cover `flaskBlurbText`, `flaskChargesText`, `flaskAccessibleName`, and `FLASK_REFUSAL_MESSAGE`'s totality.

**Deleted:** (none)

**Developer decides or observes:**

- `src/app/run/shop.css` → `.shop-panel`'s `max-height: min(20vmin, 10rem)` — the flask row adds height to a screen already tuned hard for a short viewport. QA reports the shop's fit at named viewport sizes; **the number, if it needs to move, is the developer's.** Do not retune it in this contract.
- The potion glyph's `d` path, `.shop-flask`'s spacing, and the icon's `clamp()` size bounds — placeholders transcribed from `mockup.html`, superseded wholesale by the developer's UX design.
- Whether the free-vs-paid separation actually reads at a glance with both the flask block and the priced Heal on screen — judgement, not a functional check.
- All new copy, including whether "Flask" is the shipped name (`version-4-scope.md`'s open-names list).
- Whether five charges of 6 health across 25 fights is the right answer to the run's health curve — a measurement taken by playing. The epic defers re-tuning the charge count.

---

## Phase 1 — The flask's rules and state, in the pure core

Everything in this phase is pure TypeScript inside `src/hunt/`'s lint-enforced React-free, DOM-free boundary, tested without a renderer. The phase boundary is safe because it ends with the whole mechanic working and covered while no component reads it yet — `RunState` gains a field that every existing spread already carries, so nothing outside `src/hunt/` needs to compile differently.

### Task 1: Add the two configuration keys and correct the false flask comment ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts:213-217`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `FLASK_STARTING_CHARGES` (1) and `FLASK_HEAL_PERCENT` (0.6); both values are TRANSCRIBED from DLR-93 AC1/AC2 and `version-4-scope.md` §2, neither is a developer decision

- [x] **Step 1: Write the failing assertions for both new keys**

In `src/hunt/__tests__/config.test.ts`, add `FLASK_HEAL_PERCENT` and `FLASK_STARTING_CHARGES` to the existing `from '../config'` import list, then append this `describe` block at the end of the file:

```ts
describe('DLR-93 — the flask (AC1, AC2)', () => {
  it('opens a run with exactly one charge, as a key rather than a literal', () => {
    expect(FLASK_STARTING_CHARGES).toBe(1)
    expect(Number.isInteger(FLASK_STARTING_CHARGES)).toBe(true)
    expect(FLASK_STARTING_CHARGES).toBeGreaterThan(0)
  })

  it('restores a proportion of maximum health, not a 0..100 percentage', () => {
    expect(FLASK_HEAL_PERCENT).toBe(0.6)
    expect(FLASK_HEAL_PERCENT).toBeGreaterThan(0)
    expect(FLASK_HEAL_PERCENT).toBeLessThanOrEqual(1)
  })

  it('is a bigger heal than the shop pays for, at the current maximum', () => {
    expect(Math.round(PLAYER_START_HEALTH * FLASK_HEAL_PERCENT)).toBeGreaterThan(
      HEAL_HEALTH_RESTORED,
    )
  })
})
```

`PLAYER_START_HEALTH` and `HEAL_HEALTH_RESTORED` must also be present in that file's `from '../config'` import — add whichever is missing.

- [x] **Step 2: Confirm the new block fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits non-zero; the three new tests fail on `FLASK_STARTING_CHARGES` / `FLASK_HEAL_PERCENT` being `undefined`. Every pre-existing test in the file still passes.

- [x] **Step 3: Add the keys**

In `src/hunt/config.ts`, immediately after the `HEAL_HEALTH_RESTORED` declaration (currently ending line 217), insert:

```ts
// DLR-93 AC1 — how many flask charges a run opens with, and the figure a stage-boss kill refills
// to. TRANSCRIBED from version-4-scope.md §2 ("Carried as a single charge ... refilled to one
// charge each time a stage boss is beaten"). NOT an open tuning value: the epic explicitly defers
// re-tuning the charge count ("revisit only if it plays too thin"). ONE key rather than a separate
// refill figure, because the run's full-flask amount is one number — a second key beside it is the
// one that gets raised without the other.
// UNIT: flask charges.
export const FLASK_STARTING_CHARGES = 1

// DLR-93 AC2 — the proportion of MAXIMUM health one flask restores, before the clamp. TRANSCRIBED
// from version-4-scope.md §2 ("Restores 60% of the player's maximum health — 6 points at today's
// provisional 10"). A PROPORTION in 0..1, exactly like SKULL_DENSITY below, NOT a 0..100
// percentage — AC2's formula is Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT).
// Deliberately a percentage of the maximum rather than a flat figure like HEAL_HEALTH_RESTORED
// above: it must stay an emergency heal if PLAYER_START_HEALTH moves again, as it already has once.
// UNIT: proportion of maximum health, 0..1.
export const FLASK_HEAL_PERCENT = 0.6
```

- [x] **Step 4: Correct the now-false comment above `HEAL_HEALTH_RESTORED`**

In `src/hunt/config.ts`, replace lines 213-215, which currently read:

```ts
// DLR-84 AC4 — health restored by one Heal, BEFORE the clamp to PLAYER_START_HEALTH. TRANSCRIBED.
// The ONLY source of healing in the game: the ticket states there is no flask and no rest site,
// and `ENCOUNTER_PLAYER_RESTORE` above stays deliberately unread.
```

with:

```ts
// DLR-84 AC4 — health restored by one Heal, BEFORE the clamp to PLAYER_START_HEALTH. TRANSCRIBED.
// No longer the only source of healing: DLR-93 landed the flask below, a FREE charge-limited heal
// sized as a proportion of the maximum rather than a flat figure. There is still no rest site, and
// `ENCOUNTER_PLAYER_RESTORE` above stays deliberately unread — the flask is a separate,
// player-triggered mechanic, not that tunable finally being wired in.
```

- [x] **Step 5: Confirm the block passes and nothing else moved**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 2: State the flask's rules in a new pure module ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/hunt/flask.ts`
- Test: `src/hunt/__tests__/flask.test.ts`

- [x] **Step 1: Write the failing spec for the heal amount and both refusals**

Create `src/hunt/__tests__/flask.test.ts`:

```ts
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
```

- [x] **Step 2: Confirm the spec fails on the missing module**

Run: `npx vitest run src/hunt/__tests__/flask.test.ts`
Expected: exits non-zero with a "Failed to load" / cannot-resolve error naming `../flask`. This is the collection-error case `web-project.md` warns about, and here it is the expected result.

- [x] **Step 3: Create the module**

Create `src/hunt/flask.ts`:

```ts
import { FLASK_HEAL_PERCENT } from './config'
import type { Health } from './types'

/**
 * DLR-93 AC3 — why the flask cannot be drunk. A reason CODE, not a sentence: `src/hunt/` holds no
 * user-facing copy, and `src/app/run/shopLabels.ts` maps these to words. `shop.ts`'s
 * `PurchaseRefusal` exactly.
 *
 * A SEPARATE union from `PurchaseRefusal`, deliberately. The flask is not a purchase — it is free
 * and charge-limited — and widening that union would force every shop item's exhaustive handling
 * (`PURCHASE_REFUSAL_MESSAGE`, `refusalFor`'s branches, 49 sites across `src/`) to grow a case
 * that can never occur for a purchase, and would let a flask reason reach a shop card's label.
 * `AlreadyFullHealth` duplicates the NAME of its `PurchaseRefusal` twin because it is the same
 * player-facing fact reached by a different rule.
 */
export const FlaskRefusal = {
  NoCharges: 'noCharges',
  AlreadyFullHealth: 'alreadyFullHealth',
} as const
export type FlaskRefusal = (typeof FlaskRefusal)[keyof typeof FlaskRefusal]

/** Everything the flask's rules need, and nothing else. Deliberately NOT `RunState` — the sibling
 *  of `ShopStock`, for the reason that interface states: this module holds the flask's rules and
 *  must not learn the run's shape. `run.ts`'s `flaskStockFor` builds it. */
export interface FlaskStock {
  readonly charges: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}

/**
 * AC2 — how much one flask restores, BEFORE the clamp. THE only reader of `FLASK_HEAL_PERCENT`.
 *
 * `Math.round` for the reason `config.ts`'s boss-health projection rounds: a fractional figure
 * cannot reach a heart row that renders whole hearts.
 *
 * Throws on a non-positive or non-finite maximum rather than returning `NaN`. A `NaN` heal would
 * poison `Math.min` in the clamp, land in `encounter.health`, and vanish from the health bar with
 * nothing logged anywhere — the exact failure `web-project.md`'s numeric-safety trap names.
 */
export function flaskHealAmount(maxPlayerHealth: Health): Health {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot size a flask against a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  return Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)
}

/**
 * AC3 — THE single statement of whether the flask can be drunk, read by `drinkFlask` (which throws
 * on a non-null result) and by the screen (which disables the control and prints the reason). Two
 * readings of one rule, never two rules — `shop.ts`'s `refusalFor` exactly.
 *
 * `NoCharges` comes FIRST deliberately, mirroring `refusalFor`'s item-before-coins order: with an
 * empty flask at full health, the empty flask is the reason that will still be true after the next
 * hit.
 *
 * A non-finite charge count refuses rather than passing the comparison. `NaN <= 0` is `false`,
 * which would otherwise read as "a charge in hand" and present a poisoned figure as a drinkable
 * flask — the same guard `refusalFor` puts on `stock.coins`.
 */
export function flaskRefusalFor(stock: FlaskStock): FlaskRefusal | null {
  if (!Number.isFinite(stock.charges) || stock.charges <= 0) {
    return FlaskRefusal.NoCharges
  }
  if (stock.playerHealth >= stock.maxPlayerHealth) {
    return FlaskRefusal.AlreadyFullHealth
  }
  return null
}
```

- [x] **Step 4: Confirm the spec passes and the pure boundary holds**

Run: `npx vitest run src/hunt/__tests__/flask.test.ts; npm run typecheck; npm run lint`
Expected: Vitest reports 0 failed; `typecheck` exits 0; `lint` exits 0 — a React import or a DOM global in `src/hunt/flask.ts` would fail `lint` here, not later.

### Task 3: Carry the charge on `RunState`, share the clamp, and drink ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/run.ts`
- Modify: `src/hunt/encounter.ts:21-22`
- Test: `src/hunt/__tests__/run.flask.test.ts`

- [x] **Step 1: Write the failing spec for AC1, AC2, AC4 and AC5**

Create `src/hunt/__tests__/run.flask.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FLASK_STARTING_CHARGES, OpponentKind, RUN_ENCOUNTERS } from '../config'
import { FlaskRefusal, flaskHealAmount } from '../flask'
import { advanceRun, drinkFlask, flaskStockFor, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { DuelSide, type EncounterState } from '../types'

const MAX = 10

/** The first index in the configured run holding each kind — read from the config rather than
 *  hard-coded, so reshaping the run cannot silently point these specs at the wrong opponent. */
const firstBossIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Boss)
const firstOrdinaryIndex = RUN_ENCOUNTERS.findIndex((e) => e.kind === OpponentKind.Ordinary)

/** A resolved encounter the player won, on the given carried health. Built by draining the
 *  Quarry through `applyDamage` rather than by hand, so `winner` and `isEncounterResolved` are
 *  set by the engine's own rules. */
function wonEncounter(encounter: EncounterState, carriedPlayerHealth: number): EncounterState {
  let next: EncounterState = {
    ...encounter,
    health: { ...encounter.health, [DuelSide.Player]: carriedPlayerHealth },
  }
  while (next.winner === null) {
    next = applyDamage(next, { [DuelSide.Quarry]: next.health[DuelSide.Quarry] })
  }
  return next
}

/** A run sitting on a resolved, won encounter at `index`, with the given health and charges. */
function runWonAt(index: number, health: number, charges: number) {
  let run = startRun(MAX)
  while (run.encounterIndex < index) {
    run = advanceRun({ ...run, encounter: wonEncounter(run.encounter, MAX) })
  }
  return {
    ...run,
    flaskCharges: charges,
    encounter: wonEncounter(run.encounter, health),
  }
}

describe('startRun (AC1)', () => {
  it('opens the run on the configured starting charges, not a literal', () => {
    expect(startRun(MAX).flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })
})

describe('flaskStockFor', () => {
  it('projects the run into exactly the three figures the rules need', () => {
    const run = startRun(MAX)
    expect(flaskStockFor(run, MAX)).toEqual({
      charges: FLASK_STARTING_CHARGES,
      playerHealth: MAX,
      maxPlayerHealth: MAX,
    })
  })
})

describe('drinkFlask (AC2, AC3, AC4)', () => {
  it('restores the configured proportion and spends the charge', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    const after = drinkFlask(run, MAX)
    expect(after.encounter.health[DuelSide.Player]).toBe(3 + flaskHealAmount(MAX))
    expect(after.flaskCharges).toBe(0)
  })

  it('clamps to the maximum and discards the overheal', () => {
    const run = runWonAt(firstOrdinaryIndex, 8, 1)
    const after = drinkFlask(run, MAX)
    expect(after.encounter.health[DuelSide.Player]).toBe(MAX)
    expect(after.flaskCharges).toBe(0)
  })

  it('leaves every other run field untouched', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    const after = drinkFlask(run, MAX)
    expect(after.coins).toBe(run.coins)
    expect(after.cheats).toBe(run.cheats)
    expect(after.envenomCharges).toBe(run.envenomCharges)
    expect(after.whetstones).toBe(run.whetstones)
    expect(after.encounter.health[DuelSide.Quarry]).toBe(run.encounter.health[DuelSide.Quarry])
  })

  it('throws naming the refusal at zero charges rather than taking a no-op turn', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 0)
    expect(() => drinkFlask(run, MAX)).toThrow(RangeError)
    expect(() => drinkFlask(run, MAX)).toThrow(FlaskRefusal.NoCharges)
  })

  it('throws naming the refusal at full health', () => {
    const run = runWonAt(firstOrdinaryIndex, MAX, 1)
    expect(() => drinkFlask(run, MAX)).toThrow(FlaskRefusal.AlreadyFullHealth)
  })

  it('throws on a maximum that is not a positive finite number', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    expect(() => drinkFlask(run, 0)).toThrow(RangeError)
    expect(() => drinkFlask(run, Number.NaN)).toThrow(RangeError)
  })

  // AC4 — a between-fights action. Reaching it mid-hand is a driver bug, so it throws rather
  // than wording a third reason the screen would have to render.
  it('throws mid-hand, when the encounter has not resolved', () => {
    const run = startRun(MAX)
    expect(() => drinkFlask({ ...run, flaskCharges: 1 }, MAX)).toThrow(RangeError)
    expect(() => drinkFlask({ ...run, flaskCharges: 1 }, MAX)).toThrow(/not resolved|in progress/i)
  })

  it('carries the drunk charge count across the fight boundary', () => {
    const run = runWonAt(firstOrdinaryIndex, 3, 1)
    expect(advanceRun(drinkFlask(run, MAX)).flaskCharges).toBe(0)
  })
})

describe("recordEncounter's flask refill (AC5)", () => {
  it('refills to the configured charges on a stage-boss kill from empty', () => {
    const at = runWonAt(firstBossIndex, 3, 0)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })

  it('refills on a stage-boss kill even when a charge was already held', () => {
    const at = runWonAt(firstBossIndex, 3, 1)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(FLASK_STARTING_CHARGES)
  })

  it('does NOT refill on an ordinary kill', () => {
    const at = runWonAt(firstOrdinaryIndex, 3, 0)
    const recorded = recordEncounter(
      at,
      wonEncounter(at.encounter, 3),
      at.cheats,
      at.envenomCharges,
      at.poisonGuardHeld,
    )
    expect(recorded.flaskCharges).toBe(0)
  })

  it('does NOT refill on a boss the player lost to', () => {
    const at = runWonAt(firstBossIndex, 3, 0)
    let lost = { ...at.encounter, winner: null } as EncounterState
    lost = { ...lost, health: { ...lost.health, [DuelSide.Player]: 1 } }
    while (lost.winner === null) {
      lost = applyDamage(lost, { [DuelSide.Player]: lost.health[DuelSide.Player] })
    }
    const recorded = recordEncounter(at, lost, at.cheats, at.envenomCharges, at.poisonGuardHeld)
    expect(recorded.flaskCharges).toBe(0)
  })
})
```

**Fixture note for the executor:** `runWonAt` and `wonEncounter` drive the engine's own transitions rather than hand-building an `EncounterState`. If `applyDamage`'s signature or `EncounterState`'s shape does not match the calls above, **adapt the fixture to the real signatures in `src/hunt/encounter.ts` and `src/hunt/types.ts` — do not change the assertions**, and read `src/hunt/__tests__/run.whetstone.test.ts` for the fixture idiom this file should match. Keep both `recordEncounter` refill assertions — from-empty and from-one-charge — even though they differ by a single argument: that pair is exactly what AC5's "regardless of whether the player had 0 or 1" requires, and collapsing them into one loses half the requirement.

- [x] **Step 2: Confirm the spec fails on the missing exports**

Run: `npx vitest run src/hunt/__tests__/run.flask.test.ts`
Expected: exits non-zero — `drinkFlask` and `flaskStockFor` are not exported from `../run`, and `flaskCharges` does not exist on `RunState`.

- [x] **Step 3: Add the field, the imports, and the starting charge**

In `src/hunt/run.ts`, extend the `from './config'` import to include `FLASK_STARTING_CHARGES`, `OpponentKind` and `runEncounterAt`, and add a new import line:

```ts
import { flaskHealAmount, flaskRefusalFor, type FlaskStock } from './flask'
```

Append this field to `interface RunState`, after `whetstones`:

```ts
  /** DLR-93 AC1 — flask charges held. A COUNT like `envenomCharges`, not a boolean: AC5 refills
   *  "regardless of whether the player had 0 or 1", and the epic's deferred re-tune of the charge
   *  count raises the ceiling without changing this type. Run-level like `coins` and carried by
   *  `advanceRun`'s and `recordEncounter`'s spreads — a free heal that reset at a fight boundary
   *  would be a per-fight heal. Unlike `cheats` and `envenomCharges` it is NEVER handed back by a
   *  hand, because a hand cannot drink it (AC4). NEVER persisted, exactly as `coins` above. */
  readonly flaskCharges: number
```

And add to `startRun`'s returned literal, after `whetstones: 0`:

```ts
    flaskCharges: FLASK_STARTING_CHARGES,
```

- [x] **Step 4: Move the clamp into one shared private helper**

In `src/hunt/run.ts`, replace `buyFromShop`'s `case ShopItem.Heal:` branch, which currently reads:

```ts
    case ShopItem.Heal:
      return {
        ...paid,
        encounter: {
          ...run.encounter,
          health: {
            ...run.encounter.health,
            // THE clamp, and therefore also the single place overheal is discarded (DLR-84 AC4).
            [DuelSide.Player]: Math.min(
              maxPlayerHealth,
              run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED,
            ),
          },
        },
      }
```

with:

```ts
    case ShopItem.Heal:
      // DLR-93 AC2 — the clamp moved to `healedBy` so the flask reuses it rather than writing a
      // second one. Byte-identical result for identical inputs; the paid Heal's behaviour is
      // unchanged.
      return healedBy(paid, HEAL_HEALTH_RESTORED, maxPlayerHealth)
```

Then add these two private functions beside `guardAfter` at the foot of the file:

```ts
/**
 * DLR-93 AC2 — THE single writer that raises player health, and therefore the single place
 * overheal is discarded (DLR-84 AC4). Read by `buyFromShop`'s Heal branch and by `drinkFlask`;
 * the two differ only in how much they restore, and neither owns the clamp.
 *
 * Writes into `encounter.health[Player]` because that IS the carried figure — this module's own
 * `RunState` docblock states a second copy beside it is the number that drifts, and `advanceRun`
 * seeds the next fight from it. Deliberately NOT through `applyDamage`, which refuses a resolved
 * encounter: a restore is not a damage event.
 */
function healedBy(run: RunState, restored: Health, maxPlayerHealth: Health): RunState {
  return {
    ...run,
    encounter: {
      ...run.encounter,
      health: {
        ...run.encounter.health,
        [DuelSide.Player]: Math.min(
          maxPlayerHealth,
          run.encounter.health[DuelSide.Player] + restored,
        ),
      },
    },
  }
}

/**
 * DLR-93 AC5 — ONE statement of "a stage-boss kill refills the flask; an ordinary kill does not".
 *
 * A named function rather than an inline ternary, following `guardAfter`'s precedent immediately
 * below: a second transition adopting a hand's end state is exactly the kind of thing that gets
 * added without remembering this rule, and a named rule is what a reviewer finds.
 *
 * `run.encounterIndex` is the encounter just FOUGHT — `advanceRun` has not run yet — so
 * `runEncounterAt` on it names the opponent just beaten. Refills to `FLASK_STARTING_CHARGES`
 * rather than a literal `1` so the run's full-flask figure is stated exactly once.
 *
 * Lives here rather than in `advanceRun` for `recordEncounter`'s own stated reason: `advanceRun`
 * never runs for the final fight of a won run, and Diarmuid — the last boss — is exactly that
 * fight.
 */
function flaskAfter(run: RunState, wonThisEncounter: boolean): number {
  const beatABoss =
    wonThisEncounter && runEncounterAt(run.encounterIndex).kind === OpponentKind.Boss
  return beatABoss ? FLASK_STARTING_CHARGES : run.flaskCharges
}
```

- [x] **Step 5: Wire the refill into `recordEncounter`**

In `src/hunt/run.ts`, add one line to `recordEncounter`'s returned object, directly after the `coins:` line:

```ts
    flaskCharges: flaskAfter(run, wonThisEncounter),
```

And extend that function's docblock with a paragraph before its closing `*/`:

```
 * `flaskCharges` (DLR-93 AC5) is NOT a parameter: unlike `cheats`, `envenomCharges` and
 * `poisonGuardHeld`, a hand cannot spend or grant a flask charge (AC4 makes it a between-fights
 * action), so there is nothing for a hand to hand back. It is read off `run` and refilled by
 * `flaskAfter` when the opponent just beaten was a stage boss.
```

- [x] **Step 6: Add `flaskStockFor` and `drinkFlask`**

In `src/hunt/run.ts`, immediately after `shopStockFor`, insert:

```ts
/** DLR-93 — projects a run into the three figures the flask's rules need, the sibling of
 *  `shopStockFor` and for the same reason: no screen assembles a `FlaskStock` by hand and gets one
 *  field wrong. */
export function flaskStockFor(
  run: RunState,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): FlaskStock {
  return {
    charges: run.flaskCharges,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth,
  }
}

/**
 * DLR-93 AC2/AC3/AC4 — the drink. Throws a `RangeError` naming the `FlaskRefusal` rather than
 * returning the run unchanged, exactly as `buyFromShop` does: a silent no-op is the "spent the
 * charge for nothing" failure this module already refuses to allow. Reaching that throw is a
 * driver bug, because the control is disabled whenever `flaskRefusalFor` is non-null.
 *
 * Throws separately, and with a different message, on an UNRESOLVED encounter. AC4 makes the flask
 * a between-fights action, gated by which `RunPhase` mounts the shop; reaching it mid-hand is a
 * driver bug rather than something to word for the player, so it gets `advanceRun`'s treatment
 * rather than a third reason code the screen would have to render.
 *
 * The restore goes through `healedBy`, which is the single writer that raises player health — AC2's
 * "reuse that clamp pattern rather than writing a second one".
 *
 * `maxPlayerHealth` is a defaulted parameter, matching `startEncounter`/`startRun`/`buyFromShop`'s
 * injectable pattern, so a spec varies the clamp without mutating module state.
 */
export function drinkFlask(
  run: RunState,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): RunState {
  if (!isEncounterResolved(run.encounter)) {
    throw new RangeError(
      `Cannot drink the flask while fight ${run.encounterIndex + 1} of ${run.encounterCount} is not resolved: it is a between-fights action`,
    )
  }
  const refusal = flaskRefusalFor(flaskStockFor(run, maxPlayerHealth))
  if (refusal !== null) {
    throw new RangeError(
      `Cannot drink the flask — ${refusal} (holding ${run.flaskCharges} charges, ${run.encounter.health[DuelSide.Player]} of ${maxPlayerHealth} health)`,
    )
  }
  return {
    ...healedBy(run, flaskHealAmount(maxPlayerHealth), maxPlayerHealth),
    flaskCharges: run.flaskCharges - 1,
  }
}
```

`flaskHealAmount` is called **before** `healedBy` spreads, so its non-finite-maximum guard fires before any health is written.

- [x] **Step 7: Correct the now-false comment in `encounter.ts`**

In `src/hunt/encounter.ts`, replace the docblock sentence at lines 20-22 reading:

```
 * restore between them (`ENCOUNTER_PLAYER_RESTORE`) remains DELIBERATELY UNREAD — DLR-82 forbids
 * wiring it in, and the flask stories own it.
```

with:

```
 * restore between them (`ENCOUNTER_PLAYER_RESTORE`) remains DELIBERATELY UNREAD — DLR-82 forbids
 * wiring it in, and DLR-93 landed the flask WITHOUT it: the flask is a separate, player-triggered
 * between-fights heal (`run.ts`'s `drinkFlask`), not this tunable finally being wired in.
```

- [x] **Step 8: Confirm the new spec passes and no existing run or shop spec regressed**

Run: `npx vitest run src/hunt/__tests__/run.flask.test.ts src/hunt/__tests__/run.test.ts src/hunt/__tests__/run.whetstone.test.ts src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across all four files — the paid Heal's existing clamp and overheal specs are what prove the `healedBy` refactor changed no behaviour. `typecheck` exits 0.

- [x] **Step 9: Confirm `run.ts` is inside the line budget — RESOLVED by Phase 2.5** (was 406; the transitions moved to `runTransitions.ts`, leaving `run.ts` at 175 and `runTransitions.ts` at 259)

Run: `(Get-Content src\hunt\run.ts).Count`
Expected: a number below 400. `Measure-Object -Line` undercounts by dropping blank lines and must not be used here. If the count is 400 or above, stop and report — the split is `run.ts` → a run-transitions module, never a suppression.

Actual: **406 lines**, applying the plan's Task 3 diffs verbatim with no extra content. Over budget. Not fixed unilaterally — a split was not in this task's `**Files:**` block. See the Implementer Report's "Developer Decisions Needed" section.

### Task 4: Export every new name from the barrel ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the config keys, the flask module, and the two run transitions**

In `src/hunt/index.ts`, add `FLASK_STARTING_CHARGES` and `FLASK_HEAL_PERCENT` to the value export list from `./config`; add `flaskStockFor` and `drinkFlask` to the value export list from `./run`; and insert a new block immediately after the existing `./shop` export block:

```ts
export type { FlaskStock } from './flask'
export { FlaskRefusal, flaskHealAmount, flaskRefusalFor } from './flask'
```

- [x] **Step 2: Verify the barrel type-checks and the whole `hunt` module still passes**

Run: `npm run typecheck; npx vitest run --project node`
Expected: `typecheck` exits 0; Vitest reports 0 failed.

---

## Phase 2 — The drink control on the shop screen

The pure core is complete and covered, so this phase is wiring plus one new glyph: copy, a symbol-sheet component, the flask block on `ShopPanel`, its CSS, and the driver's handler. The boundary is safe because each task leaves the project type-checking — copy and the glyph are additive with no reader until the panel task, and the panel's props and the driver's handler land in one task each, so no phase ends with `ShopPanel` requiring a prop `App.tsx` does not pass.

### Task 5: The flask's copy ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/run/shopLabels.ts`
- Test: `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Write the failing spec**

In `src/app/run/__tests__/shopLabels.test.ts`, add the new names to the `from '../shopLabels'` import and append:

```ts
describe("DLR-93 — the flask's copy", () => {
  it('names a sentence for every refusal code, so none renders blank', () => {
    for (const refusal of Object.values(FlaskRefusal)) {
      expect(FLASK_REFUSAL_MESSAGE[refusal].length).toBeGreaterThan(0)
    }
    expect(Object.keys(FLASK_REFUSAL_MESSAGE)).toHaveLength(Object.values(FlaskRefusal).length)
  })

  it('interpolates the computed heal figure rather than quoting a number', () => {
    expect(flaskBlurbText(flaskHealAmount(10))).toContain('6')
    expect(flaskBlurbText(flaskHealAmount(20))).toContain('12')
  })

  it('words the charge count singularly and plurally', () => {
    expect(flaskChargesText(1)).toContain('1')
    expect(flaskChargesText(1)).not.toMatch(/charges/)
    expect(flaskChargesText(0)).toMatch(/charges/)
    expect(flaskChargesText(2)).toMatch(/charges/)
  })

  it('folds the refusal into the accessible name, and omits it when available', () => {
    const available = flaskAccessibleName(1, 6, null)
    expect(available).not.toContain(FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges])
    expect(flaskAccessibleName(0, 6, FlaskRefusal.NoCharges)).toContain(
      FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges],
    )
  })

  it('says free in the accessible name, so it is never heard as a purchase', () => {
    expect(flaskAccessibleName(1, 6, null).toLowerCase()).toContain('free')
  })
})
```

- [x] **Step 2: Confirm it fails on the missing exports**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts`
Expected: exits non-zero on unresolved imports from `../shopLabels`.

- [x] **Step 3: Add the copy**

In `src/app/run/shopLabels.ts`, add `FlaskRefusal` and `type Health` to the `from '../../hunt'` import, then append:

```ts
/* ── DLR-93, the flask. ALL PLACEHOLDER COPY, exactly as everything above it. The heal figure and
   the charge count are always INTERPOLATED from the engine, never quoted, so re-tuning
   `FLASK_HEAL_PERCENT` or `FLASK_STARTING_CHARGES` cannot leave the screen reading a number the
   engine no longer uses. ─────────────────────────────────────────────────────────────────────── */

/** The block's accessible group label — `game-ux` puts the group label on the container. */
export const SHOP_FLASK_GROUP_LABEL = 'Your flask'

/** The control's own name. PLACEHOLDER copy — and "Flask" itself is on `version-4-scope.md`'s
 *  open-names list beside Envenom, Poison Guard and Whetstone. */
export const SHOP_FLASK_LABEL = 'Drink the flask'

/** AC6 — the flask's answer to every shop card's price line. Words, not a colour or a glyph alone,
 *  so a static screenshot still says free-and-limited rather than paid-and-unlimited. */
export const SHOP_FLASK_FREE_TAG = 'Free'
export const SHOP_FLASK_NO_COIN = 'No coin'

/** AC2/AC5 — what the flask does, from the COMPUTED figure. PLACEHOLDER copy. */
export function flaskBlurbText(healAmount: Health): string {
  return `Restore ${healAmount} health, now. Anything over your maximum is lost. Refills when you beat a stage boss.`
}

/** The charge count, in words. Reads sensibly at 0, 1, and any deferred higher ceiling. */
export function flaskChargesText(charges: number): string {
  return `${charges} charge${charges === 1 ? '' : 's'}`
}

/** AC3 — the reason, in words. Total over `FlaskRefusal`, so a third reason code is a compile
 *  error here rather than a blank sentence on screen — exactly what `PURCHASE_REFUSAL_MESSAGE`
 *  guarantees for a purchase. */
export const FLASK_REFUSAL_MESSAGE: Readonly<Record<FlaskRefusal, string>> = {
  [FlaskRefusal.NoCharges]: 'Your flask is empty. Beat a stage boss to refill it.',
  [FlaskRefusal.AlreadyFullHealth]: 'You are already at full health.',
}

/** The control's accessible name — folds in the refusal so a screen-reader user hears WHY it is
 *  disabled without hunting for the sentence beside it, and states FREE so it is never heard as a
 *  purchase (AC6). Mirrors `shopItemAccessibleName`. */
export function flaskAccessibleName(
  charges: number,
  healAmount: Health,
  refusal: FlaskRefusal | null,
): string {
  const base = `${SHOP_FLASK_LABEL} — ${SHOP_FLASK_FREE_TAG} — ${flaskChargesText(charges)}, restores ${healAmount}`
  return refusal === null ? base : `${base} — ${FLASK_REFUSAL_MESSAGE[refusal]}`
}
```

- [x] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 6: The potion glyph ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/run/FlaskMark.tsx`

- [x] **Step 1: Create the component**

Create `src/app/run/FlaskMark.tsx`, following `src/app/warCouncil/HeartMark.tsx`'s pattern exactly:

```tsx
// The potion glyph binds to its <symbol> by this id — a rename here type-checks cleanly and
// renders an empty <svg> with no console error, so this map and the sheet below are the only two
// places it may be written. Same rule as HEART_SYMBOL_ID in HeartMark.tsx and SUIT_SYMBOL_ID in
// SuitMark.tsx.
const FLASK_SYMBOL_ID = {
  potion: 'shop-flask-potion',
} as const

/**
 * Mounted ONCE, by `ShopPanel`, beside `HeartSymbolSheet` — never from a component that renders
 * more than once, which would duplicate the id.
 *
 * The `d` values are PLACEHOLDERS transcribed from this ticket's `mockup.html`, exactly as
 * `HeartMark.tsx` marks its own; the glyph shape is the developer's to judge at final rendered
 * size, and their UX design supersedes this wholesale.
 *
 * A stoppered flask with two bubbles: deliberately distinct in SILHOUETTE from the heart, not
 * merely in colour, so the two never read as the same thing at a glance and neither depends on
 * colour vision (AC6, and `game-ux`'s "state reads without motion or colour alone"). No path
 * carries a `stroke-width`: it is an inherited SVG property, so leaving it unset lets CSS set the
 * weight and have it reach the cloned content through the `<use>` shadow tree.
 */
export function FlaskSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id={FLASK_SYMBOL_ID.potion} viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          <path d="M10 2.8h4v3.1l3.1 4.4a6.2 6.2 0 1 1-10.2 0L10 5.9Z" />
          <path d="M8.1 14.4a6.2 6.2 0 0 0 7.8 0" />
          <path d="M9.4 2.8h5.2" />
        </g>
        <circle cx="10.4" cy="17" r="1.05" fill="currentColor" />
        <circle cx="13.7" cy="18.4" r="0.75" fill="currentColor" />
      </symbol>
    </svg>
  )
}

/**
 * One potion, tinted by the surrounding CSS `color` (every path is `currentColor`). Always
 * `aria-hidden`: the button around it carries the accessible name from `flaskAccessibleName`, so a
 * screen reader announcing the glyph too would read the same thing twice.
 */
export function FlaskMark() {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`#${FLASK_SYMBOL_ID.potion}`} />
    </svg>
  )
}
```

- [x] **Step 2: Verify it compiles and lints**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `react-refresh/only-export-components` is satisfied — this file exports two components and nothing else.

### Task 7: The flask block on the shop screen ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/run/ShopPanel.tsx`
- Modify: `src/app/run/shop.css`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`

- [x] **Step 1: Write the failing component spec**

In `src/app/run/__tests__/ShopPanel.test.tsx`, add `FlaskRefusal` and `flaskHealAmount` to the `from '../../../hunt'` import, and `flaskAccessibleName`, `flaskChargesText`, `SHOP_FLASK_GROUP_LABEL` and `FLASK_REFUSAL_MESSAGE` to the `from '../shopLabels'` import. Extend `baseProps` with:

```ts
  flaskCharges: 1,
  flaskRefusal: null as FlaskRefusal | null,
  onDrinkFlask: vi.fn(),
```

Then append:

```tsx
describe('ShopPanel — the flask (DLR-93)', () => {
  it('renders the drink control enabled, queried by its accessible name', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const btn = screen.getByRole('button', { name: flaskAccessibleName(1, flaskHealAmount(10), null) })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('fires onDrinkFlask exactly once per click', () => {
    const onDrinkFlask = vi.fn()
    render(<ShopPanel {...baseProps} onDrinkFlask={onDrinkFlask} refusals={noRefusals} />)
    fireEvent.click(
      screen.getByRole('button', { name: flaskAccessibleName(1, flaskHealAmount(10), null) }),
    )
    expect(onDrinkFlask).toHaveBeenCalledTimes(1)
  })

  it('disables the control and states the reason at zero charges', () => {
    const onDrinkFlask = vi.fn()
    render(
      <ShopPanel
        {...baseProps}
        flaskCharges={0}
        flaskRefusal={FlaskRefusal.NoCharges}
        onDrinkFlask={onDrinkFlask}
        refusals={noRefusals}
      />,
    )
    const btn = screen.getByRole('button', {
      name: flaskAccessibleName(0, flaskHealAmount(10), FlaskRefusal.NoCharges),
    })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges])).toBeTruthy()
    fireEvent.click(btn)
    expect(onDrinkFlask).not.toHaveBeenCalled()
  })

  it('disables the control and states the reason at full health', () => {
    render(
      <ShopPanel
        {...baseProps}
        playerHealth={10}
        flaskRefusal={FlaskRefusal.AlreadyFullHealth}
        refusals={noRefusals}
      />,
    )
    expect(screen.getByText(FLASK_REFUSAL_MESSAGE[FlaskRefusal.AlreadyFullHealth])).toBeTruthy()
  })

  // AC6 / `game-ux` — the charge count is on the face of the screen, not behind hover, so the
  // zero-charge refusal has a visible cause.
  it('shows the charge count outside the control as well as in it', () => {
    render(<ShopPanel {...baseProps} flaskCharges={0} refusals={noRefusals} />)
    expect(screen.getAllByText(flaskChargesText(0)).length).toBeGreaterThan(0)
  })

  it('groups the flask under its own accessible label, apart from the priced items', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.getByRole('group', { name: SHOP_FLASK_GROUP_LABEL })).toBeTruthy()
  })
})
```

- [x] **Step 2: Confirm it fails**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx`
Expected: exits non-zero — the new queries find no control. Existing tests in the file still pass.

- [x] **Step 3: Add the three props and the flask block to `ShopPanel`**

In `src/app/run/ShopPanel.tsx`: add `type FlaskRefusal` and `flaskHealAmount` to the `from '../../hunt'` import; add `flaskAccessibleName`, `flaskBlurbText`, `flaskChargesText`, `FLASK_REFUSAL_MESSAGE`, `SHOP_FLASK_FREE_TAG`, `SHOP_FLASK_GROUP_LABEL`, `SHOP_FLASK_LABEL` and `SHOP_FLASK_NO_COIN` to the `from './shopLabels'` import; and add `import { FlaskMark, FlaskSymbolSheet } from './FlaskMark'`.

Add to `ShopPanelProps`, after `whetstones`:

```ts
  /** DLR-93 AC1 — charges held, so the refusal at zero has a visible cause without hover. A count
   *  with no denominator, exactly as `envenomCharges`: the epic defers raising the ceiling. */
  readonly flaskCharges: number
  /** Derived by the driver from `flaskRefusalFor` — never re-derived here, exactly as `refusals`.
   *  `null` means the flask can be drunk. */
  readonly flaskRefusal: FlaskRefusal | null
  readonly onDrinkFlask: () => void
```

Add `flaskCharges`, `flaskRefusal` and `onDrinkFlask` to the destructured parameter list.

Add `<FlaskSymbolSheet />` immediately after the existing `<HeartSymbolSheet />`.

Add a purse cell as the LAST cell inside `.shop-purse`:

```tsx
          <span className="shop-purse-cell is-flask">
            <span className="shop-purse-label">{SHOP_FLASK_FREE_TAG}</span>
            <span className="shop-purse-value">{flaskChargesText(flaskCharges)}</span>
          </span>
```

And insert the flask block immediately AFTER the closing `</div>` of `.shop-health` and BEFORE `<ShopCategoryTabs …/>` — the placement `mockup.html` settles, and three zones away from the priced Heal in `.shop-aside` (AC6):

```tsx
        {/* AC6 — the flask's own zone: beneath the health it restores, above the ladder, and
            nowhere near `Also for sale`, where the PRICED Heal lives. Distinctness is structural
            rather than cosmetic — a different zone, no price line, an icon-led control where every
            shop item is a text card, and a `Free` tag where they carry a price. Layout per this
            contract's `mockup.html`; every CSS figure there is a placeholder the developer's UX
            design supersedes. */}
        <div className="shop-flask" role="group" aria-label={SHOP_FLASK_GROUP_LABEL}>
          <button
            type="button"
            className="shop-flask-btn"
            disabled={flaskRefusal !== null}
            onClick={onDrinkFlask}
            aria-label={flaskAccessibleName(
              flaskCharges,
              flaskHealAmount(maxPlayerHealth),
              flaskRefusal,
            )}
          >
            <span className="shop-flask-icon" aria-hidden="true">
              <FlaskMark />
            </span>
            <span className="shop-flask-text">
              <span className="shop-flask-name">{SHOP_FLASK_LABEL}</span>
              <span className="shop-flask-charges">{flaskChargesText(flaskCharges)}</span>
            </span>
            <span className="shop-flask-free">{SHOP_FLASK_NO_COIN}</span>
          </button>
          <span className="shop-flask-side">
            <p className="shop-flask-blurb">{flaskBlurbText(flaskHealAmount(maxPlayerHealth))}</p>
            <p className="shop-flask-refusal" role="status">
              {flaskRefusal === null ? '' : FLASK_REFUSAL_MESSAGE[flaskRefusal]}
            </p>
          </span>
        </div>
```

`flaskHealAmount(maxPlayerHealth)` is the component's one call into the engine, and it is a projection of a prop rather than a decision — the same shape as `priceText(item)` already used on every shop card.

- [x] **Step 4: Add the block's styles**

Append to `src/app/run/shop.css`. Every number is a PLACEHOLDER, marked as such — `.shop-panel`'s `max-height` is **not** touched, per the File map:

```css
/* DLR-93 AC6 — the flask's own zone, between the health meter and the ladder. `flex: 0 0 auto`
   like `.shop-aside`, so it takes its natural height and `.shop-panel` remains the ONE region on
   this screen allowed to scroll. A dashed edge rather than the solid one every priced surface
   uses: `game-ux` requires state to read in FORM, not colour alone, so a greyscale screenshot
   still separates the free thing from the paid ones.
   Every colour, spacing and size figure here is a PLACEHOLDER transcribed from this contract's
   `mockup.html` — the developer's UX design supersedes it. */
.shop-flask {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1.8vmin, 1rem);
  width: 100%;
  box-sizing: border-box;
  padding: clamp(0.35rem, 1.3vmin, 0.7rem) clamp(0.5rem, 1.6vmin, 0.9rem);
  border: 1px dashed var(--wc-brass);
  border-radius: 4px;
}

/* ≥44px per `react-frontend`'s input floor — the icon is small, the target is not. */
.shop-flask-btn {
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 1.4vmin, 0.75rem);
  min-height: 44px;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--wc-brass);
  border-radius: 4px;
  background: transparent;
  color: var(--wc-parchment);
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

@media (hover: hover) {
  .shop-flask-btn:hover:not(:disabled) {
    background: rgba(201, 154, 78, 0.16);
  }
}

.shop-flask-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.shop-flask-btn:focus-visible {
  outline: 2px solid var(--wc-parchment);
  outline-offset: 2px;
}

/* Dotted, not merely dimmer — the disabled state reads without colour. */
.shop-flask-btn:disabled {
  border-style: dotted;
  border-color: var(--wc-chalk-dim);
  color: var(--wc-chalk-dim);
  cursor: not-allowed;
}

.shop-flask-icon {
  flex: 0 0 auto;
  width: clamp(1.3rem, 3.4vmin, 1.9rem);
  height: clamp(1.3rem, 3.4vmin, 1.9rem);
}

/* `stroke-width` set here, not on the paths, so it reaches the cloned symbol through `<use>`. */
.shop-flask-icon svg {
  width: 100%;
  height: 100%;
  display: block;
  stroke-width: 1.5;
}

.shop-flask-btn:disabled .shop-flask-icon svg {
  opacity: 0.55;
}

.shop-flask-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.shop-flask-name {
  font-size: clamp(0.74rem, 1.9vmin, 0.94rem);
  letter-spacing: 0.05em;
}

.shop-flask-charges {
  font-size: clamp(0.56rem, 1.3vmin, 0.7rem);
  color: var(--wc-chalk-dim);
  font-variant-numeric: tabular-nums;
}

/* Where every `.shop-item` carries `.shop-item-price`, the flask carries this. */
.shop-flask-free {
  flex: 0 0 auto;
  padding: 0.1rem 0.4rem;
  border: 1px solid currentColor;
  border-radius: 2px;
  font-size: clamp(0.5rem, 1.1vmin, 0.6rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.shop-flask-side {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.shop-flask-blurb {
  margin: 0;
  font-size: clamp(0.56rem, 1.3vmin, 0.7rem);
  color: var(--wc-chalk-dim);
  line-height: 1.35;
}

/* Reserves its line so the layout does not jump when a refusal appears — the same discipline
   `.shop-refusal` uses. */
.shop-flask-refusal {
  margin: 0;
  min-height: 1em;
  font-size: clamp(0.56rem, 1.3vmin, 0.7rem);
  font-style: italic;
  color: var(--wc-brass);
}

.shop-purse-cell.is-flask .shop-purse-value {
  font-variant-numeric: tabular-nums;
}
```

- [x] **Step 5: Confirm the component spec passes**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 — `App.tsx` does not yet pass the three new props, so if `typecheck` reports errors in `src/App.tsx`, that is Task 8's work and the ONLY acceptable failure at this step. Report it and continue.

- [x] **Step 6: Confirm `ShopPanel.tsx` and `shop.css` are inside budget**

Run: `(Get-Content src\app\run\ShopPanel.tsx).Count; (Get-Content src\app\run\shop.css).Count`
Expected: `ShopPanel.tsx` below 400. `shop.css` will exceed 400 — it is a stylesheet, not a component, and `react-frontend`'s budget targets code files; report the figure and do not split it in this contract.

### Task 8: Wire the driver ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx`

- [x] **Step 1: Add the handler and the three props**

In `src/App.tsx`, add `drinkFlask`, `flaskRefusalFor` and `flaskStockFor` to the `from './hunt'` import list (keeping it alphabetical, as it currently is).

Add `handleDrinkFlask` immediately after `handleBuy`:

```tsx
  // AC2/AC3 — the FUNCTIONAL updater, mirroring `handleBuy` exactly and for the same reason: the
  // refusal is RE-DERIVED inside the updater against whichever run this call actually sees, not
  // read from the render's stale closure. `disabled` only takes effect on the render FOLLOWING a
  // drink, so a double-click or a fast repeated key-activation would otherwise reach `drinkFlask`
  // with the charge already spent and hit its deliberate throw. No-op instead, so `flaskRefusalFor`
  // stays the only source of truth and that throw stays reachable only from a genuine driver bug.
  // `drinkFlask` is pure, so StrictMode's development double-invocation recomputes an identical
  // value.
  function handleDrinkFlask() {
    setRun((r) => (flaskRefusalFor(flaskStockFor(r)) !== null ? r : drinkFlask(r)))
  }
```

In the `RunPhase.Shop` branch, add these three props to the `<ShopPanel …/>` call, after `whetstones`:

```tsx
        flaskCharges={run.flaskCharges}
        flaskRefusal={flaskRefusalFor(flaskStockFor(run))}
        onDrinkFlask={handleDrinkFlask}
```

`flaskStockFor(run)` defaults `maxPlayerHealth` to `PLAYER_START_HEALTH`, which is the same figure this branch already passes as `maxPlayerHealth` — so the screen's clamp denominator and the engine's cannot disagree.

**AC4 is satisfied by this placement and nothing else is needed:** the three props are inside `if (encounterOver && phase === RunPhase.Shop)`, so the control exists only when the encounter has resolved and the shop phase is showing. Neither `WarCouncilRound`, `RunOutcomePanel` nor `RunPathScreen` receives a flask prop, so there is no mid-hand route to `drinkFlask` from any surface.

- [x] **Step 2: Confirm the whole project type-checks, lints, and the DOM suite passes**

Run: `npm run typecheck; npm run lint; npx vitest run --project dom`
Expected: all three exit 0; Vitest reports 0 failed. This is the step at which Task 7's expected `App.tsx` type error clears.

- [x] **Step 3: Confirm `App.tsx` is inside the line budget**

Run: `(Get-Content src\App.tsx).Count`
Expected: a number below 400.

---
## Phase 2.5 — Extract a run-transitions module

**Added during `/fb-apply` on 2026-08-20, on the developer's explicit approval.** Phase 1 left `src/hunt/run.ts` at 406 lines, over the 400-line blocking budget in `CLAUDE.md` and `react-frontend`. The plan anticipated this ("If a later flask story pushes it over, the split is `run.ts` -> a run-transitions module, not a suppression") but Task 3's `**Files:**` block authorised no new module, so the Implementer correctly stopped rather than restructuring unilaterally. This phase carries out the plan's own stated remedy. It is a pure move-and-re-export refactor: no behaviour changes, and every existing spec must pass untouched.

### Task 14: Move the run's transitions into their own module ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/hunt/runTransitions.ts`
- Modify: `src/hunt/run.ts`
- Modify: `src/hunt/index.ts`
- Test: (no new spec — the existing `run.test.ts`, `run.flask.test.ts`, `run.whetstone.test.ts` and `shop.test.ts` are the proof, and must pass unchanged)

- [x] **Step 1: Measure and choose the split line**

Run: `(Get-Content src\hunt\run.ts).Count`
Expected: 406. Read the whole file and group its contents into (a) the run's *shape* — `RunState`, `startRun`, and the projections `shopStockFor` / `flaskStockFor` — and (b) the run's *transitions* — `advanceRun`, `recordEncounter`, `buyFromShop`, `drinkFlask` and their private helpers `healedBy`, `guardAfter`, `flaskAfter`. Group (b) moves. Keep each module's docblock accurate about what it now owns.

Confirmed 406 lines. Read the whole file: the plan's grouping matched the file's actual structure exactly, with one addition the plan's grouping didn't name — `outcomeFor`, a private helper used only inside `recordEncounter` (which moves), so it necessarily moved with it. `canAdvanceRun`, `beatenCount` and `bankClimbBonusFor` are pure queries over `RunState` that produce no new run, so they stayed with the shape in `run.ts` rather than the transitions.

- [x] **Step 2: Create `src/hunt/runTransitions.ts` and move group (b) into it verbatim**

Move the functions unchanged — same names, same signatures, same docblocks, same bodies. Import `RunState` and the projections from `./run`. Do not rename anything, do not "improve" any body, and do not change a single expression: a behavioural change here is indistinguishable from a bug and the existing specs are the only guard.

Done. `recordEncounter`, `advanceRun`, `drinkFlask`, `buyFromShop`, `outcomeFor`, `guardAfter`, `healedBy`, `flaskAfter` moved verbatim (bodies and docblocks byte-identical); imports adjusted to the new module boundaries, importing `canAdvanceRun`, `flaskStockFor`, `shopStockFor`, `RunOutcome` and `type RunState` back from `./run`.

- [x] **Step 3: Re-export from `src/hunt/run.ts` so no existing importer breaks**

Every name that `run.ts` exported before this task must still be importable from `run.ts`. Re-export the moved names. Verify with a grep that no importer anywhere in `src/` needed editing.

`run.ts` re-exports `advanceRun`, `recordEncounter`, `buyFromShop`, `drinkFlask` from `./runTransitions`. Grepped `from ['"]\.\./run['"]|from ['"]\./run['"]` across `src/` — only `src/hunt/index.ts` and four `__tests__` files import `./run` directly; all four import at least one moved name, and all four passed unchanged (see Step 6).

- [x] **Step 4: Update the barrel**

`src/hunt/index.ts` keeps exporting exactly the same set of names it did before. Point the moved ones at `./runTransitions` if that reads more honestly than going through `run.ts`; either is acceptable so long as the barrel's exported set is byte-identical.

Pointed the barrel's `recordEncounter`, `advanceRun`, `drinkFlask`, `buyFromShop` directly at `./runTransitions` — the exported name set is unchanged.

- [x] **Step 5: Confirm both modules are under budget**

Run: `(Get-Content src\hunt\run.ts).Count; (Get-Content src\hunt\runTransitions.ts).Count`
Expected: both comfortably under 400. Measure with `(Get-Content <path>).Count`, never `Measure-Object -Line`, which drops blank lines and undercounts.

`run.ts`: 175 lines. `runTransitions.ts`: 262 lines. Both comfortably under 400.

- [x] **Step 6: Prove nothing changed**

Run: `npx vitest run --project node; npm run lint`
Expected: every previously-passing spec still passes with **no spec file edited**, and lint exits 0. If any assertion had to change, the move was not verbatim — revert and redo it.

`npx vitest run --project node`: **43 test files passed, 696 tests passed**, 0 failed, no spec file edited. `npm run lint`: exits 0, no output (clean). `npm run typecheck` also run: only the three pre-existing, out-of-scope `src/__tests__/sim.test.ts` errors named in the dispatch remain. `npx prettier --write` applied to `runTransitions.ts` only (whitespace-only reflow of the moved `drinkFlask` signature onto one line, matching this project's Prettier config) — re-ran the full `node`-project suite afterward and it stayed at 696 passed, confirming the reformat changed no behaviour.

---

## Phase 3 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, the deliberately-unread tunable stayed unread, and no tuning value was hard-coded.

### Task 9: Confirm the `src/hunt/` purity boundary still holds ✓

- Skill: `none — a verification grep, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep the pure tree for React imports and DOM globals**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits. `src/hunt/flask.ts` and the `run.ts` additions must both be inside the boundary `eslint.config.js` enforces. Note the recursive `Get-ChildItem` form — `Select-String -Path 'src\hunt\**\*.ts'` would miss `__tests__/` entirely.

### Task 10: Confirm `ENCOUNTER_PLAYER_RESTORE` is still read by nothing ✓

- Skill: `none — a verification grep, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep every occurrence and confirm each is a declaration, an export, a comment, or a spec**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "ENCOUNTER_PLAYER_RESTORE"`
Expected: 8 hits, matching `plan.md`'s audit — `config.ts` (the declaration plus one prose comment), `encounter.ts` (one prose comment, reworded by Task 3), `run.ts` (one prose comment), `index.ts` (the barrel export), and `__tests__/config.test.ts` (three). **No production read.** Any hit that is an actual read of the value outside a test is a blocking finding: this ticket must not wire it in.

### Task 11: Confirm no flask tunable was hard-coded and no false prose survives ✓

- Skill: `none — verification greps, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep for the literals configuration owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "0\.6|\* 0\.6|60%"`
Expected: hits only in `src/hunt/config.ts` (the `FLASK_HEAL_PERCENT` declaration and its comment) and `src/hunt/__tests__/config.test.ts` / `flask.test.ts`. Zero hits in any `.tsx` file, in `shopLabels.ts`, or in `run.ts` — the proportion is read in exactly one function, `flaskHealAmount`.

- [x] **Step 2: Grep for a quoted heal figure in the copy**

Run: `Select-String -Path src\app\run\shopLabels.ts -Pattern "restores? 6|6 health"`
Expected: zero hits. The blurb and the accessible name interpolate `flaskHealAmount`'s result; a quoted `6` would leave the screen lying the moment the key is retuned.

- [x] **Step 3: Confirm the two false flask comments are gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "there is no flask|the flask stories own it"`
Expected: zero hits. Both sentences were true before this ticket and are false after it (Task 1 Step 4 and Task 3 Step 7).

- [x] **Step 4: Confirm no debug logging was left behind**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.(log|debug)"`
Expected: zero hits.

### Task 12: Static gates, full suite, and the production build ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Warm the Vitest cache, then run every gate**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: every command exits 0; the final `npm test` reports 0 failed and collects both projects' files. The projects run separately first on purpose — `web-project.md` records that a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is jsdom setup starving the pool and **not** a failing test. Only a second consecutive timeout is a real problem.

- [x] **Step 2: Confirm formatting of the files this contract touched**

Run: `npx prettier --check src/hunt/flask.ts src/hunt/run.ts src/hunt/config.ts src/hunt/index.ts src/hunt/encounter.ts src/app/run/FlaskMark.tsx src/app/run/ShopPanel.tsx src/app/run/shopLabels.ts src/app/run/shop.css src/App.tsx src/hunt/__tests__/flask.test.ts src/hunt/__tests__/run.flask.test.ts src/hunt/__tests__/config.test.ts src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/shopLabels.test.ts`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no contract here has touched, and fixing that is not this ticket's work.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that this project's `build` script runs `lint` first, so a lint regression fails here too.

- [x] **Step 4: Confirm the shop screen still fits with the flask row added**

QA drives the running app through the `chrome-devtools` MCP: start the dev server detached per `web-project.md`'s table (`--port 5199 --strictPort`), reach the shop screen (Start → play a fight to a verdict → Shop), and confirm at **1920×1080**, **1366×768**, and **390×844** that `document.documentElement.scrollHeight <= window.innerHeight` — the shop shell must not introduce a page scroll — and that the flask control, the health meter, the tablist, and the `Also for sale` block are all visible without page scrolling. Also confirm the console is clean and that clicking the flask control raises the health meter and disables the control.
Expected: no page scroll at any of the three sizes, no console errors, the drink commits. **Report the three measured `scrollHeight`/`innerHeight` pairs by name.** If it scrolls at 1366×768 or 390×844, that is a real finding, and the fix is a `.shop-panel` `max-height` retune — which is the **developer's number**, so report the measurement and stop rather than choosing one.

### Task 13: Update the PR description ✓

- Skill: `none — a document, no code written`

**Files:**

- Create: `.claude/contract/DLR-93-the-flask-a-free-heal-refilled-on-a-boss-kill/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder, and to `mockup.html` as the layout reference.
- A summary of the change: the two config keys, the new `src/hunt/flask.ts` module, `RunState.flaskCharges`, the shared `healedBy` clamp, `flaskAfter`'s boss refill, and the shop screen's flask block.
- **The `healedBy` refactor called out explicitly**, with the specs that prove the paid Heal's behaviour is unchanged.
- Every decision the developer must make and every behaviour they must judge by playing — the full "Developer decides or observes" list from this file's File map, verbatim.
- Verification results from every phase, quoting the actual Vitest summary lines, the three measured viewport `scrollHeight`/`innerHeight` pairs from Task 12 Step 4, and every grep's hit count from Tasks 9-11.
- A one-line note for future contributors: **`src/hunt/run.ts`'s `healedBy` is now the single writer that raises player health.** Any future healing mechanic goes through it rather than beside it.
- A one-line note that **nothing in this project is persisted yet**, so `RunState.flaskCharges` needed no migration — and that the first ticket to persist `RunState` closes that window.

---

## Self-review

**Spec coverage:**

- AC1 — `RunState` gains a flask-charge field starting at `FLASK_STARTING_CHARGES` — Tasks 1, 3.
- AC2 — `Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)`, clamped by the *reused* Heal clamp — Tasks 1, 2, 3 (Steps 4, 6).
- AC3 — refused with a stated reason at zero charges and at full health, in `refusalFor`'s exact shape — Tasks 2, 5, 7.
- AC4 — available only between fights — Task 3 (Step 6's unresolved-encounter throw), Task 8 (Step 1's `RunPhase.Shop` gate), Task 7 (the control renders only inside `ShopPanel`).
- AC5 — refill on an `OpponentKind.Boss` kill, not on an ordinary one — Task 3 (Steps 4, 5).
- AC6 — visually distinct from the paid Heal — Tasks 5, 6, 7; verified by Task 12 Step 4 and listed as developer judgement.
- AC7 — Vitest coverage for all six named cases — Tasks 1, 2, 3, 5, 7.
- In-scope: the new pure module — Task 2. Config keys — Task 1. `RunState` field, `drinkFlask`, `flaskStockFor`, the shared clamp, the refill — Task 3. Barrel — Task 4. Potion glyph — Task 6. Control, copy, CSS — Tasks 5, 7. Driver wiring — Task 8. The two false comments — Tasks 1, 3.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact text being replaced, or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev` in the foreground, or hand-edits `package-lock.json`; no step invents a tuning value or reaches for an `eslint-disable`. Every unfiltered suite run and the build appear only in Phase 3.

**Type / name consistency:** `FLASK_STARTING_CHARGES`, `FLASK_HEAL_PERCENT`, `FlaskRefusal` (`NoCharges` / `AlreadyFullHealth`), `FlaskStock` (`charges` / `playerHealth` / `maxPlayerHealth`), `flaskHealAmount`, `flaskRefusalFor`, `flaskStockFor`, `drinkFlask`, `healedBy`, `flaskAfter`, `RunState.flaskCharges`, `FLASK_SYMBOL_ID.potion` → `'shop-flask-potion'`, `FlaskMark`, `FlaskSymbolSheet`, `SHOP_FLASK_LABEL`, `SHOP_FLASK_GROUP_LABEL`, `SHOP_FLASK_FREE_TAG`, `SHOP_FLASK_NO_COIN`, `flaskBlurbText`, `flaskChargesText`, `FLASK_REFUSAL_MESSAGE`, `flaskAccessibleName`, and the props `flaskCharges` / `flaskRefusal` / `onDrinkFlask` are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly. `recordEncounter`'s five-parameter signature is unchanged in every task. The CSS class names `.shop-flask`, `-btn`, `-icon`, `-text`, `-name`, `-charges`, `-free`, `-side`, `-blurb`, `-refusal` are written identically in Task 7's TSX and its CSS.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking with the whole mechanic complete and covered inside `src/hunt/`, exported from the barrel, and read by no component. `RunState`'s new field is carried by every existing spread, so nothing outside `src/hunt/` compiles differently — Task 4 Step 2 proves it with `typecheck` plus the full `node` project.
- **Phase 2** has one deliberate intra-phase gap, stated where it occurs: Task 7 adds three required props to `ShopPanel` and Task 8 passes them, so `typecheck` reports errors in `src/App.tsx` between those two tasks. Task 7 Step 5 names that as the only acceptable failure and Task 8 Step 2 clears it. The phase itself ends with `typecheck`, `lint` and the `dom` project all clean, no dead imports, and no half-applied rename.
- **Phase 3** changes no production file and ends with every gate green plus the browser fit measured at three named viewport sizes.
