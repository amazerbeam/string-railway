# Tasks: Shield redesign — blue hearts on the health bar

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Give the encounter a second, separately-tracked pool of hit points — blue hearts — that Shield's activation sets rather than adds to, that no heal path can refill, and that soaks the player's incoming damage before red health does. Engine only; DLR-115 renders it.

**Spec:** `plan.md` in this folder.

**Gate note (sprint run 2026-08-23):** the plan approval gate was auto-approved with every stated default taken. No mockup exists — `/fb-plan` Step 3.5 fires only for work touching a `.tsx` surface, `App.tsx`, or a `use*` hook, and this contract's file map contains none.

---

## File map

**Created:**
- `src/hunt/shield.ts` — the `SHIELD_HEARTS` tier table and the absorption arithmetic; imports no state shape.
- `src/hunt/__tests__/shield.test.ts` — unit coverage for the tier table and `absorbWithShield`.
- `src/hunt/__tests__/shield.encounter.test.ts` — AC2/AC3/AC4 against real `EncounterState` and `RunState` transitions.

**Modified:**
- `src/hunt/types.ts` — add `shieldHearts: Health` to `EncounterState`.
- `src/hunt/encounter.ts` — seed `shieldHearts` in `startEncounter`; add `activateShield` and `hasShieldHearts`; run absorption inside `applyDamage`.
- `src/hunt/buffs.ts` — add `BuffKind.Shield` and its `BUFF_CADENCE` row.
- `src/hunt/buffCosts.ts` — add `Shield` to `BuffConsumableKind` and a `CONSUMABLE_AP_COST` row.
- `src/hunt/buffCatalog.ts` — add `shieldBuff` and `shieldHeartsOf`.
- `src/hunt/index.ts` — barrel exports for the new surface.

**Deleted:** (none)

**Developer decides or observes:**
- `CONSUMABLE_AP_COST[BuffKind.Shield]` — shipped as bronze 2 / silver 3 / gold 4. **Nobody chose these.** No source document prices Shield; the ladder is copied from `SecondThoughts`/`Spyglass`. A price row is forced by adding the `BuffKind` member, since `apCostOf` throws on an unpriced kind.
- **Whether a blue heart absorbs 1 point or 1 whole hit.** Shipped as 1 point, per §7a's "dividing what you take". Settled by playing a gold Timebomb (6 damage) into 3 blue hearts and judging whether the shield helped or negated.
- **Whether blue hearts should expire at hand end, or survive an encounter.** Shipped as: survive a hand, die with the encounter. Moving them to `RunState` is the change if they should survive a fight.
- **Whether a fully-absorbed hit should spare a queued Apply Damage payout.** Shipped as yes. It is a second, undesigned benefit of holding a shield and it cuts against DLR-109's payout-destruction rule.
- Nothing visible changes. A browser would render a health bar identical to today's; there is nothing to look at until DLR-115.

---

## Phase 1 — The absorption rule as a standalone pure module

`shield.ts` lands first with no consumer, so the whole rule is testable before any state shape changes. The project type-checks throughout: nothing existing imports it yet. This is a safe stopping point — the module is additive and inert.

### Task 1: Add `src/hunt/shield.ts` with the tier table and `absorbWithShield` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/shield.ts`
- Test: `src/hunt/__tests__/shield.test.ts`

- [x] **Step 1: Read the governing skill and the shared rules**

Invoke `Skill: react-frontend`. Glob `.claude/rules/*.md` and Read `save-data-versioning.md` — confirm for yourself that nothing under `src/persistence/` stores `EncounterState` before adding a field to it (`plan.md` Part 1 → Config and persisted-shape audit records 0 hits for `createSaveStore` outside `src/persistence/`).

- [x] **Step 2: Write `src/hunt/shield.ts`**

Follow `src/hunt/flask.ts`'s shape: a small pure module that holds a mechanic's rules and does **not** import `EncounterState`. Import only `BuffTier` from `./buffs` and `Damage` / `Health` from `./types`.

```ts
import { BuffTier } from './buffs'
import type { Damage, Health } from './types'

/**
 * DLR-110 AC2 — blue hearts granted by ONE activation, by tier.
 *
 * TRANSCRIBED, not chosen here: design doc §7a ("bronze adds 1, silver 2, gold 3") and AC2's own
 * `SHIELD_HEARTS = { bronze: 1, silver: 2, gold: 3 }`. The same 1/2/3 ladder
 * `CHEAT_DURATION_TRICKS` carries, and for the same reason — it is the only tier curve the design
 * sources actually state.
 *
 * UNIT: blue hearts, each absorbing one point of damage, added by one activation. NOT cumulative:
 * `activateShield` SETS this figure, so no cap is needed and none exists — 3 is the maximum
 * reachable count.
 */
export const SHIELD_HEARTS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/** No protection. What `startEncounter` seeds and what a fully spent shield returns to. */
export const NO_SHIELD_HEARTS: Health = 0

/**
 * One damage event, split by the shield. Named fields rather than a tuple for `HealthBarOverlays`'
 * reason: `absorbed` and `throughToHealth` are both `Damage` and a transposed pair would
 * type-check cleanly and deplete the wrong pool.
 */
export interface ShieldAbsorption {
  /** Taken by blue hearts. Never exceeds `shieldHearts`, never exceeds `damage`. */
  readonly absorbed: Damage
  /** The remainder, for `deplete` to subtract from red health. */
  readonly throughToHealth: Damage
  /** Blue hearts still standing after this event. */
  readonly shieldHeartsRemaining: Health
}

/**
 * AC4 — THE single statement of the absorption order: blue hearts take damage BEFORE ordinary
 * hearts, one point each.
 *
 * A BLUE HEART IS WORTH ONE POINT, NOT ONE HIT (`plan.md` Part 1 → Assumptions made). Three
 * damage into two blue hearts consumes both and lets one through; it does not negate the hit.
 * This is design §7a's "dividing what you take", and it is what keeps Shield distinct from
 * `Ward`, which `v1-buff-card-list.md` defines as absorbing up to N on the next hit and then
 * breaking regardless. **Ward is not touched by this ticket and its known tier defect is not
 * fixed here.**
 *
 * Performs NO clamping of red health — `deplete` in `encounter.ts` remains DLR-70's single clamp
 * point, and this function never touches `health`.
 *
 * GUARDS rather than diagnoses. `applyDamage`'s `assertApplicable` already rejects a negative or
 * non-finite `damage` before this runs, so both throws are guards rather than live paths — stated
 * so a future direct caller does not assume the check happened upstream. A `NaN` here would
 * produce `NaN` remaining hearts, reach a rendered row as nothing at all, and log nothing.
 *
 * Finite and non-negative, NOT integral, exactly as `assertApplicable` documents: under
 * `DAMAGE_ROUNDING = None` a x0.5 band legitimately produces a half-point total, and an integer
 * guard would break a supported configuration.
 */
export function absorbWithShield(shieldHearts: Health, damage: Damage): ShieldAbsorption {
  if (!Number.isFinite(shieldHearts) || shieldHearts < 0) {
    throw new RangeError(
      `Cannot absorb damage against ${shieldHearts} blue hearts: it must be a non-negative finite number`,
    )
  }
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(
      `Cannot absorb ${damage} damage with a shield: damage must be a non-negative finite number`,
    )
  }
  const absorbed = Math.min(shieldHearts, damage)
  return {
    absorbed,
    throughToHealth: damage - absorbed,
    shieldHeartsRemaining: shieldHearts - absorbed,
  }
}

/**
 * How many blue hearts `tier` grants. THE only reader of `SHIELD_HEARTS`, so one tier has exactly
 * one answer — the discipline `cheatDurationTricksOf` sets for Cheat's duration.
 *
 * Throws on a tier outside the table rather than returning `undefined`, which would flow into
 * `activateShield` and set a shield of `undefined` blue hearts that renders as nothing.
 */
export function shieldHeartsForTier(tier: BuffTier): Health {
  const hearts = SHIELD_HEARTS[tier]
  if (hearts === undefined) {
    throw new RangeError(`No shield heart count is defined for tier ${tier}`)
  }
  return hearts
}
```

- [x] **Step 3: Write `src/hunt/__tests__/shield.test.ts`**

Cover, following the sibling specs' naming style:
- `SHIELD_HEARTS` is exactly `{ bronze: 1, silver: 2, gold: 3 }`, and `shieldHeartsForTier` returns each.
- **Absorption order (AC4):** 1 damage into 2 blue hearts absorbs 1, passes 0 through, leaves 1.
- **Exact absorption:** 2 damage into 2 blue hearts absorbs 2, passes 0, leaves 0.
- **Partial absorption — the point-not-hit rule:** 3 damage into 2 blue hearts absorbs 2, **passes 1 through**, leaves 0. This is the test that pins the assumption; name it so.
- **No shield:** 3 damage into 0 blue hearts absorbs 0 and passes 3 through unchanged.
- **Zero damage:** absorbs 0 and spends no heart.
- **Fractional damage survives** (`DAMAGE_ROUNDING = None`): 0.5 into 2 hearts absorbs 0.5, leaves 1.5 — no integer guard.
- Throws a `RangeError` on `NaN` / `Infinity` / negative for each of the two arguments.

- [x] **Step 4: Verify Phase 1**

Run in one block:
`npx vitest run src/hunt/__tests__/shield.test.ts` ; `npm run typecheck`
Expected: the new spec passes in full, typecheck exits 0.

---

## Phase 2 — The encounter carries and spends blue hearts

`EncounterState` gains its field and `applyDamage` gains the absorption step. This phase widens the state before anything reads it, so it type-checks at its boundary: the single literal construction site is updated in the same task.

### Task 2: Add `shieldHearts` to `EncounterState` and seed it ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/types.ts` — add one field to `EncounterState`
- Modify: `src/hunt/encounter.ts:41-47` — seed it in `startEncounter`

- [x] **Step 1: Add the field to `EncounterState`**

Append below `pendingApplyPayout`, matching that field's docblock style:

```ts
  /** DLR-110 — the player's blue hearts (design doc §7a). A second pool of hit points that is
   *  NOT part of `health`, cannot be restored by any heal path, and is spent before red health
   *  (AC4). A scalar rather than a `Record<DuelSide, Health>` because only the player can hold
   *  them — a side-keyed field would model a Quarry shield nothing can create and every reader
   *  would have to handle, unlike `pendingTimebomb`, which is side-keyed because Timebomb
   *  genuinely hits both sides. Seeded to `NO_SHIELD_HEARTS` by `startEncounter`, which is what
   *  clears it at an encounter boundary with no explicit clear step to forget — the reason
   *  `pendingTimebomb` and `pendingApplyPayout` live here too. NOT PERSISTED. */
  readonly shieldHearts: Health
```

- [x] **Step 2: Seed it in `startEncounter`**

Add `shieldHearts: NO_SHIELD_HEARTS,` to the returned literal and import `NO_SHIELD_HEARTS` from `./shield`. This is the **only** `EncounterState` object literal in `src/` (audit: 1 construction site), so no other producer needs an edit.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. A failure here means a second construction site exists that the audit missed — fix it, do not cast.

**Result:** the audit DID miss one. `applyDamage`'s return in `encounter.ts` is a second `EncounterState`
object literal (it writes `damageEventsApplied:`, so the plan's own grep should have found it — the
audit recorded 2 hits and attributed the second to the `types.ts` interface declaration, which is a
third site). Fixed by Task 3 Step 1's own edit, which adds `shieldHearts` to that literal. Nothing cast.

### Task 3: Absorb damage inside `applyDamage`, and add `activateShield` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/encounter.ts` — absorption inside `applyDamage`; new `activateShield` and `hasShieldHearts`
- Test: `src/hunt/__tests__/shield.encounter.test.ts`

- [x] **Step 1: Run absorption inside `applyDamage`**

Replace the player-health branch. `deplete` and the clamp stay exactly where they are; only what is handed to `deplete` changes.

```ts
  // DLR-110 AC4 — blue hearts take the player's damage BEFORE red health does, and only the
  // remainder reaches `deplete`. Inside this function deliberately: `applyDamage` is the single
  // damage funnel (DLR-70) and a shield that only works on the routes that remembered to check
  // is exactly the bug DLR-109 AC3's enforcement point argues against.
  //
  // A Quarry that goes down spends NO blue hearts: D7 already gives the player zero damage from
  // that event, so the shield is carried through untouched rather than absorbing a hit that never
  // landed.
  const absorption = quarryDown
    ? { throughToHealth: 0, shieldHeartsRemaining: encounter.shieldHearts, absorbed: 0 }
    : absorbWithShield(encounter.shieldHearts, incoming[DuelSide.Player])
  const playerHealth = quarryDown
    ? encounter.health[DuelSide.Player]
    : deplete(encounter.health[DuelSide.Player], absorption.throughToHealth)
```

Add `shieldHearts: absorption.shieldHeartsRemaining,` to the returned state.

Leave `playerLostHealth` **exactly as it is** — it compares red health before and after, so a fully-absorbed hit leaves it `false` and DLR-109's queued payout survives. Extend that line's existing comment rather than the expression:

```ts
  // DLR-110 — a hit FULLY ABSORBED by blue hearts leaves red health untouched, so this stays
  // false and the queued payout survives. Deliberate (`plan.md` Part 1 → Assumptions made): the
  // payout loss is the price of taking a hit, and a shield that ate the hit did its job. A
  // partially-absorbed hit that still drops red health destroys it exactly as before.
```

- [x] **Step 2: Add `activateShield` and `hasShieldHearts`**

Place beside `queueTimebomb`, whose shape they copy.

```ts
/**
 * AC2 — activating Shield SETS the player's blue hearts to `tier`'s count. It does NOT add to
 * hearts already standing, and it sets DOWNWARD too: a bronze Shield after a gold one leaves 1,
 * not 3. Design doc §7a — "they do not stack; re-activating Shield a later hand resets to the
 * tier's count, it doesn't add on top of hearts already there."
 *
 * The contrast with `queueTimebomb` immediately above is deliberate and is the thing to preserve
 * under a later edit: Timebomb ACCUMULATES (D4), Shield RESETS. Two adjacent functions with
 * opposite rules is exactly the pair that gets "made consistent" by mistake.
 *
 * Returns the encounter UNCHANGED when it is already resolved — protection must never be granted
 * in a fight that is over. NEVER throws: the reducer calls this during an event handler, and a
 * throw there unmounts the tree.
 */
export function activateShield(encounter: EncounterState, tier: BuffTier): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return { ...encounter, shieldHearts: shieldHeartsForTier(tier) }
}

/** Whether any blue heart is standing. ONE statement, so a rule and a reading cannot disagree —
 *  the discipline `hasPendingTimebomb` sets. DLR-115 reads this to decide whether to draw any
 *  shield pip at all. */
export function hasShieldHearts(encounter: EncounterState): boolean {
  return encounter.shieldHearts > 0
}
```

- [x] **Step 3: Write `src/hunt/__tests__/shield.encounter.test.ts`**

Cover, against real `startEncounter` / `applyDamage` / `activateShield`:
- `startEncounter` seeds `shieldHearts` to `NO_SHIELD_HEARTS`, and a fresh encounter after a shielded one has none (the encounter-boundary clear).
- **AC2, the named test:** gold then bronze leaves 1 blue heart, not 4 and not 3. Also silver then silver leaves 2, not 4.
- `activateShield` on a resolved encounter returns it unchanged.
- **AC4:** 1 damage to a player with 2 blue hearts and 10 health leaves 1 blue heart and **10 health** — red health untouched.
- **AC4, partial:** 3 damage with 2 blue hearts leaves 0 blue hearts and 9 health.
- **Overkill and the single clamp:** damage far exceeding hearts plus health still floors red health at 0 and blue hearts at 0, and the encounter resolves to the Quarry.
- **A shielded player cannot be killed while a blue heart stands:** damage equal to blue hearts leaves `winner` null.
- **The Quarry-down short-circuit spends no blue heart:** an event that kills the Quarry leaves `shieldHearts` unchanged.
- **The DLR-109 interaction, both directions:** a fully-absorbed hit leaves `pendingApplyPayout` intact; a partially-absorbed hit that drops red health wipes it.
- **AC3:** `drinkFlask` and `buyFromShop`'s Heal both raise red health and leave `shieldHearts` untouched — spend a shield down first, then heal, and assert the blue hearts did not come back. Build the run through the real transitions, not a hand-made literal.

- [x] **Step 4: Verify Phase 2**

Run in one block:
`npx vitest run src/hunt/__tests__/shield.test.ts src/hunt/__tests__/shield.encounter.test.ts src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/timebomb.test.ts src/hunt/__tests__/applyDamagePayout.test.ts src/hunt/__tests__/run.flask.test.ts` ; `npm run typecheck`
Expected: all pass, typecheck exits 0. The existing `encounter` / `timebomb` / payout specs are in the batch because `applyDamage`'s body changed underneath them.

---

## Phase 3 — Shield as an ownable card, and the barrel

Shield becomes a `BuffKind` so AC2's "activating Shield" has something to activate. Adding the member forces two table rows; both are done in the same task so the tree never sits in a state that compiles but throws.

### Task 4: Add `BuffKind.Shield` with its cadence and price rows ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffs.ts` — `BuffKind` member and `BUFF_CADENCE` row
- Modify: `src/hunt/buffCosts.ts` — `BuffConsumableKind` member and `CONSUMABLE_AP_COST` row
- Test: `src/hunt/__tests__/buffs.test.ts`, `src/hunt/__tests__/buffCosts.test.ts` (extend, do not rewrite)

- [x] **Step 1: Add the `BuffKind` member**

Append `Shield: 'shield',` to `BuffKind` beside `Cheat` and `Timebomb`, with a one-line note that design §7a puts Shield alongside them as an activated card. Every existing string value is unchanged, so all 128 existing `BuffKind.` references still compile untouched.

- [x] **Step 2: Add the `BUFF_CADENCE` row**

`[BuffKind.Shield]: BuffCadence.Activated,` — the player pulls it, it has no trigger. `BUFF_CADENCE` is `Readonly<Record<BuffKind, BuffCadence>>`, so this row is required to compile; that is the table's documented purpose.

- [x] **Step 3: Price it in `CONSUMABLE_AP_COST`**

Add `Shield` to `BuffConsumableKind` and this row, with the comment stated in full — the value is the developer's and must not be presentable as settled:

```ts
  // DLR-110 — NOBODY CHOSE THESE NUMBERS. No source document prices Shield: `v1-buff-card-list.md`
  // has no Shield row, and design §7a states the heart counts but no cost. The ladder shape is
  // copied from `SecondThoughts`/`Spyglass`. A price row is FORCED by adding `BuffKind.Shield` —
  // `apCostOf` throws on an unpriced kind — so the choice could not be deferred, only made
  // invisibly or made visibly. Made visibly. Shield's activation cost is out of DLR-110's scope;
  // this is the type system's minimum, not a costing pass. Nothing player-reachable mints a
  // Shield yet, so no player can pay this today. UNIT: action points.
  [BuffKind.Shield]: { [BuffTier.Bronze]: 2, [BuffTier.Silver]: 3, [BuffTier.Gold]: 4 },
```

- [x] **Step 4: Extend the existing specs**

In `buffs.test.ts`: assert `BUFF_CADENCE[BuffKind.Shield]` is `Activated`, and that the cadence table is still total over every `BuffKind` member (extend whatever totality assertion is already there rather than adding a second one).
In `buffCosts.test.ts`: assert `isConsumableKind(BuffKind.Shield)` and the three prices, and that `apCostOf` on a Shield buff does not throw.

- [x] **Step 5: Verify**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts src/hunt/__tests__/buffCosts.test.ts src/hunt/__tests__/buffActivation.test.ts` ; `npm run typecheck`
Expected: all pass, typecheck exits 0.

### Task 5: Mint Shield buffs in `buffCatalog.ts` and export the surface ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffCatalog.ts` — `shieldBuff`, `shieldHeartsOf`
- Modify: `src/hunt/index.ts` — barrel exports
- Test: `src/hunt/__tests__/buffCatalog.test.ts` (extend)

- [x] **Step 1: Add `shieldBuff` and `shieldHeartsOf`**

Follow `cheatBuff` / `cheatDurationTricksOf` exactly, including the throw-on-wrong-kind discipline and its stated reason. Use `BuffRewardAxis.HeartCount` — the axis `buffs.ts` and `.docs/implementation/hunt/buff-pile.md` already name as Shield's — and `ACTIVATED_BUFF_CONDITION`. Read `SHIELD_HEARTS` through `shieldHeartsForTier`, never by re-indexing the table.

`shieldHeartsOf` reads `buff.reward.value` (the figure the buff was minted with), not the tier table, so one object has exactly one answer — `cheatDurationTricksOf`'s stated rule.

- [x] **Step 2: Export from the barrel**

Add to `src/hunt/index.ts`, grouped with the existing `./encounter` and `./buffCatalog` blocks:
- from `./shield`: type `ShieldAbsorption`; values `SHIELD_HEARTS`, `NO_SHIELD_HEARTS`, `absorbWithShield`, `shieldHeartsForTier`
- from `./encounter`: `activateShield`, `hasShieldHearts`
- from `./buffCatalog`: `shieldBuff`, `shieldHeartsOf`

- [x] **Step 3: Extend `buffCatalog.test.ts`**

Assert a minted Shield buff carries `kind: Shield`, the caller's `id`, `ACTIVATED_BUFF_CONDITION`, and a `heartCount` reward of 1/2/3 by tier; that `shieldHeartsOf` returns it; and that `shieldHeartsOf` throws a `RangeError` on a Cheat and on a Timebomb.

- [x] **Step 4: Verify Phase 3**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts src/hunt/__tests__/shield.test.ts src/hunt/__tests__/shield.encounter.test.ts` ; `npm run typecheck`
Expected: all pass, typecheck exits 0.

- [x] **Step 5: Measure every touched file against the 400-line limit**

**Measured with `(Get-Content <path>).Count` (includes blank lines), AFTER the Prettier reflow.**
No file is near the limit; nothing needed splitting.

| File | Lines |
|---|---|
| `src/hunt/shield.ts` | 94 |
| `src/hunt/encounter.ts` | 269 |
| `src/hunt/types.ts` | 106 |
| `src/hunt/buffs.ts` | 223 |
| `src/hunt/buffCosts.ts` | 168 |
| `src/hunt/buffCatalog.ts` | 191 |
| `src/hunt/index.ts` | 219 |
| `src/hunt/__tests__/shield.test.ts` | 91 |
| `src/hunt/__tests__/shield.encounter.test.ts` | 165 |
| `src/hunt/__tests__/buffs.test.ts` | 215 |
| `src/hunt/__tests__/buffCosts.test.ts` | 232 |
| `src/hunt/__tests__/buffCatalog.test.ts` | 178 |

`(Get-Content <file> | Measure-Object -Line).Lines` **undercounts — it drops blank lines** (recorded in the developer's memory from DLR-63, where it hid a real breach). Use a count that includes blank lines, and measure **after** any Prettier reflow, not before. `encounter.ts` starts at 223 lines and is the file at risk. If any file crosses 400, split it **in this ticket** — never report it as a finding.
