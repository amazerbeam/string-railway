# Tasks: Migrate Cheat and Timebomb into the ordinary buff pile

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Not developer-confirmed.** This contract runs inside the 2026-08-23 unattended sprint run, which
> overrides `/fb-plan`'s `AskUserQuestion` approval gate. `plan.md` was self-reviewed but never
> presented to the developer, and no gate was raised. No mockup was built or auto-approved — Step
> 1.5's classification found no UI component in scope, and this contract touches no `.tsx` file.
> Every default taken in place of a pause is recorded in
> `.claude/sprint-runs/2026-08-23-sprint/log.md` under `## DLR-107`, and in `plan.md` Part 1 →
> Assumptions made. `plan.md` Part 2 → Risks and judgement calls names four readings the developer
> still owns — chiefly that **AC3 is deliberately not done** and that
> **`TIMEBOMB_TIER_MULTIPLIER`'s 1/2/3 is an unchosen tuning value**.

**Goal:** Give Cheat and Timebomb a first-class `Buff` representation on the DLR-105 buff pile — an
identity discriminator on `Buff`, the two tier tables AC1 and AC2 name, the factories that mint each
card at a tier, and the readers that get the tier-scaled figure back — with the bronze row of each
table pinned by test to today's live figures, and with no activation, no UI, and no behaviour change.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/buffCatalog.ts` — the Cheat and Timebomb tier tables, their factories, and their readers.
- `src/hunt/__tests__/buffCatalog.test.ts` — the tier tables, the factories, the readers' refusals, and the bronze-equals-today equivalence assertions (AC4).

**Modified:**
- `src/hunt/buffs.ts` — add `BuffKind`, add the required `kind` field to `Buff`, add `ACTIVATED_BUFF_CONDITION`, and set `kind: BuffKind.Unassigned` in `seedStartingBuffPile`.
- `src/hunt/__tests__/buffs.test.ts` — the three literal `toEqual` shape assertions gain `kind`; add a case pinning `BuffKind`'s member set.
- `src/hunt/index.ts` — barrel exports for `BuffKind`, `ACTIVATED_BUFF_CONDITION`, and everything `buffCatalog.ts` exports.

**Deleted:** (none)

**Developer decides or observes:**
- `src/hunt/buffCatalog.ts` → `TIMEBOMB_TIER_MULTIPLIER` — the plan's default is `{ bronze: 1, silver: 2, gold: 3 }`, taken from AC1's Cheat-duration escalation and design doc §3's Shield bullet, which are the only tier curves the sources actually state. It yields 4/8/12 damage to the Quarry and 2/4/6 to the player. **This is a tuning value nobody has chosen** — a gold Timebomb costing the player 6 of a 10-point health bar may want a flatter curve. One place to change it.
- **AC3 is deliberately not done.** The two-click Cheat-slot and three-tap Envenom-plate state machines stay. Consequence to confirm: after this ticket Cheat and Timebomb exist twice — the live bespoke mechanic the UI drives, and an inert `Buff` representation nothing reads. See `plan.md` Part 1 → Assumptions made, first bullet.
- **`Buff` gains a required `kind` field**, a change to the data model DLR-105 shipped. Cheap to red-line now, expensive once the slot machine and the Vault both construct buffs.
- **`ACTIVATED_BUFF_CONDITION`'s `'activated'` string** enters a condition-catalog vocabulary design doc §5 explicitly does not own yet. Whoever authors the real catalog (DLR-103 T7a) should know the name is taken.
- Nothing in this contract can be judged by running the app — it renders nothing and changes no player-visible behaviour.

---

## Phase 1 — `Buff` gains an identity

Adding `kind` to `Buff` is a required-field widening, so the type, its one production construction
site, and every test that spells the shape out in full must change together — a phase boundary
between them would leave the tree not type-checking. The audit in `plan.md` found exactly four such
sites and they are all in this phase's two files, so the phase ends with `npm run typecheck` clean
and no half-applied change.

### Task 1: Add `BuffKind` and the `kind` field to `src/hunt/buffs.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffs.ts`
- Test: `src/hunt/__tests__/buffs.test.ts`

- [x] **Step 1: Add `BuffKind` and `ACTIVATED_BUFF_CONDITION` to `src/hunt/buffs.ts`**

Insert `BuffKind` immediately after the existing `BuffTier` block (it is the same `as const` idiom
and belongs beside it), and `ACTIVATED_BUFF_CONDITION` immediately after the existing
`UNASSIGNED_BUFF_CONDITION` / `UNASSIGNED_BUFF_REWARD` pair.

```ts
/**
 * DLR-107 — WHICH card a buff is. DLR-105 shipped `Buff` with no identity field: `condition.kind`
 * describes a TRIGGER, not a card, and overloading it would make "when this fires" and "what this
 * is" the same string. A closed `as const` map, not an `enum` — `erasableSyntaxOnly` is on
 * (`tsconfig.app.json`), the same reason `BuffTier` above takes this shape.
 *
 * `Unassigned` is what `seedStartingBuffPile` mints: the run's opening pile is still placeholder
 * content (DLR-105 AC4), and naming that keeps it obviously placeholder rather than silently
 * turning the four opening buffs into Cheats.
 */
export const BuffKind = {
  Unassigned: 'unassigned',
  Cheat: 'cheat',
  Timebomb: 'timebomb',
} as const
export type BuffKind = (typeof BuffKind)[keyof typeof BuffKind]
```

```ts
/**
 * DLR-107 — the condition for a buff the PLAYER pulls rather than one that fires on a trigger.
 * Cheat and Timebomb are both activated deliberately, per design doc §1 ("held in the pile and
 * sprung in response to what's actually happening"), so neither has a trigger to describe.
 * Shared by both rather than one per card: there is one thing being said here, not two.
 */
export const ACTIVATED_BUFF_CONDITION: BuffCondition = { kind: 'activated' }
```

- [x] **Step 2: Add the required `kind` field to the `Buff` interface**

Replace the existing `Buff` interface with:

```ts
/** One owned buff. Carries no evaluation logic — condition matching and reward application are
 *  a later ticket's job (T5). */
export interface Buff {
  readonly id: BuffId
  /** DLR-107 — WHICH card this is. Required: every construction site names it, so a buff can never
   *  exist without an identity. */
  readonly kind: BuffKind
  readonly tier: BuffTier
  readonly condition: BuffCondition
  readonly reward: BuffReward
}
```

- [x] **Step 3: Set `kind` on the seeded placeholder buffs**

In `seedStartingBuffPile`, replace the minted object literal with:

```ts
  return Array.from({ length: count }, (_, i) => ({
    id: firstId + i,
    kind: BuffKind.Unassigned,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }))
```

- [x] **Step 4: Update the three shape assertions in `src/hunt/__tests__/buffs.test.ts` and pin `BuffKind`'s member set**

Add `BuffKind` to the existing import from `../buffs`. Each of the three `toEqual` object literals
in that file gains `kind: BuffKind.Unassigned` — for example the first case becomes:

```ts
    expect(pile).toEqual([
      {
        id: 1,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
      {
        id: 2,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
    ])
```

Then append this case inside the existing `describe`:

```ts
  it('seeds placeholder content as `unassigned`, never as a real card (DLR-107)', () => {
    expect(Object.values(BuffKind)).toEqual(['unassigned', 'cheat', 'timebomb'])
    expect(seedStartingBuffPile(3, 1).every((b) => b.kind === BuffKind.Unassigned)).toBe(true)
  })
```

- [x] **Step 5: Run the buff specs and the fast type gate**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts src/hunt/__tests__/run-buffs.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed and names both files.

---

## Phase 2 — The Cheat and Timebomb catalog

The substance of the ticket: the two tier tables AC1 and AC2 name, the factories that mint each card,
and the readers a later activation ticket will call. Test-first, because every function here has a
real invariant — chiefly that the bronze row equals today's live figures, which is the assertion that
makes this a migration rather than a second parallel system. The phase ends with the barrel updated,
so the tree type-checks and every new export is reachable from `../hunt`.

### Task 2: Write the failing spec for `src/hunt/buffCatalog.ts` ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/hunt/__tests__/buffCatalog.test.ts`

- [x] **Step 1: Create `src/hunt/__tests__/buffCatalog.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  CHEAT_DURATION_TRICKS,
  TIMEBOMB_DAMAGE,
  TIMEBOMB_TIER_MULTIPLIER,
  cheatBuff,
  cheatDurationTricksOf,
  timebombBuff,
  timebombDamageOf,
} from '../buffCatalog'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, seedStartingBuffPile } from '../buffs'
import { ENVENOM_PLAYER_DAMAGE, ENVENOM_QUARRY_DAMAGE } from '../config'

describe('CHEAT_DURATION_TRICKS (AC1)', () => {
  it('is the transcribed 1 / 2 / 3 table', () => {
    expect(CHEAT_DURATION_TRICKS[BuffTier.Bronze]).toBe(1)
    expect(CHEAT_DURATION_TRICKS[BuffTier.Silver]).toBe(2)
    expect(CHEAT_DURATION_TRICKS[BuffTier.Gold]).toBe(3)
  })

  it('escalates strictly with tier, so a higher tier is never worse', () => {
    expect(CHEAT_DURATION_TRICKS[BuffTier.Silver]).toBeGreaterThan(CHEAT_DURATION_TRICKS[BuffTier.Bronze])
    expect(CHEAT_DURATION_TRICKS[BuffTier.Gold]).toBeGreaterThan(CHEAT_DURATION_TRICKS[BuffTier.Silver])
  })
})

describe('TIMEBOMB_DAMAGE (AC2)', () => {
  // AC4's equivalence assertion: bronze IS today's live pair. Asserted against the CONSTANTS, not
  // against 4 and 2, so retuning the live mechanic moves this with it rather than reddening here.
  it('bronze is exactly the live Envenom pair, so the migration changes nothing', () => {
    expect(TIMEBOMB_DAMAGE[BuffTier.Bronze]).toEqual({
      quarry: ENVENOM_QUARRY_DAMAGE,
      player: ENVENOM_PLAYER_DAMAGE,
    })
  })

  it('scales BOTH sides — the reading AC2 resolves design doc §3 to', () => {
    expect(TIMEBOMB_DAMAGE[BuffTier.Gold].player).toBeGreaterThan(TIMEBOMB_DAMAGE[BuffTier.Bronze].player)
  })

  it('holds the live 2:1 Quarry-to-player ratio at every tier', () => {
    for (const tier of Object.values(BuffTier)) {
      const row = TIMEBOMB_DAMAGE[tier]
      expect(row.quarry * ENVENOM_PLAYER_DAMAGE).toBe(row.player * ENVENOM_QUARRY_DAMAGE)
    }
  })

  it('is the tier multiplier applied to both of the live figures', () => {
    for (const tier of Object.values(BuffTier)) {
      expect(TIMEBOMB_DAMAGE[tier]).toEqual({
        quarry: ENVENOM_QUARRY_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
        player: ENVENOM_PLAYER_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
      })
    }
  })

  it('every figure is a whole number of health points', () => {
    for (const tier of Object.values(BuffTier)) {
      expect(Number.isInteger(TIMEBOMB_DAMAGE[tier].quarry)).toBe(true)
      expect(Number.isInteger(TIMEBOMB_DAMAGE[tier].player)).toBe(true)
    }
  })
})

describe('cheatBuff (AC1)', () => {
  it('mints a Cheat buff whose reward is a DURATION, not a magnitude', () => {
    expect(cheatBuff(BuffTier.Gold, 7)).toEqual({
      id: 7,
      kind: BuffKind.Cheat,
      tier: BuffTier.Gold,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[BuffTier.Gold] },
    })
  })

  it('bronze grants one trick — the single-card behaviour shipping today (AC1/AC4)', () => {
    expect(cheatDurationTricksOf(cheatBuff(BuffTier.Bronze, 1))).toBe(1)
  })
})

describe('timebombBuff (AC2)', () => {
  it('mints a Timebomb buff whose reward carries the Quarry-side figure', () => {
    expect(timebombBuff(BuffTier.Silver, 3)).toEqual({
      id: 3,
      kind: BuffKind.Timebomb,
      tier: BuffTier.Silver,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.Magnitude, value: TIMEBOMB_DAMAGE[BuffTier.Silver].quarry },
    })
  })

  it('bronze owes exactly the live pair (AC4)', () => {
    expect(timebombDamageOf(timebombBuff(BuffTier.Bronze, 1))).toEqual({
      quarry: ENVENOM_QUARRY_DAMAGE,
      player: ENVENOM_PLAYER_DAMAGE,
    })
  })
})

describe('the readers refuse a buff of the wrong kind rather than answering', () => {
  it('cheatDurationTricksOf throws on a Timebomb', () => {
    expect(() => cheatDurationTricksOf(timebombBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('cheatDurationTricksOf throws on a placeholder seed', () => {
    const [placeholder] = seedStartingBuffPile(1, 1)
    expect(() => cheatDurationTricksOf(placeholder)).toThrow(RangeError)
  })

  it('timebombDamageOf throws on a Cheat', () => {
    expect(() => timebombDamageOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(RangeError)
  })

  it('names the kind it was actually given, so the message identifies the caller bug', () => {
    expect(() => timebombDamageOf(cheatBuff(BuffTier.Bronze, 1))).toThrow(/cheat/)
  })
})

describe('nothing in this ticket puts a gold Cheat on a player-reachable path', () => {
  // The ticket's own Dependencies & Risks: gold Cheat needs a costing pass before it ships. Nothing
  // activates a buff yet, and the run's opening pile is still all-bronze placeholder content.
  it('the run-seeding path still mints only bronze, unassigned buffs', () => {
    expect(
      seedStartingBuffPile(4, 1).every(
        (b) => b.tier === BuffTier.Bronze && b.kind === BuffKind.Unassigned,
      ),
    ).toBe(true)
  })
})
```

- [x] **Step 2: Confirm the spec fails for the right reason — the module does not exist yet**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts`
Expected: exits non-zero with a resolution failure naming `../buffCatalog`. This is the expected red;
it must NOT be a passing run.

### Task 3: Implement `src/hunt/buffCatalog.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/buffCatalog.ts`
- Test: `src/hunt/__tests__/buffCatalog.test.ts`

- [x] **Step 1: Create `src/hunt/buffCatalog.ts`**

The tier tables live here rather than in `src/hunt/config.ts` because that file measures 385 lines
against a blocking 400-line budget — see `plan.md` Part 1 → Assumptions made. Values stay named,
exported, and retunable in one place, and `src/hunt/index.ts` re-exports them so no consumer can tell
the difference.

```ts
import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  type Buff,
  type BuffId,
} from './buffs'
import { ENVENOM_PLAYER_DAMAGE, ENVENOM_QUARRY_DAMAGE } from './config'
import type { Damage } from './types'

/**
 * DLR-107 — Cheat and Timebomb as ordinary `Buff` objects, per design doc §1 ("both become ordinary
 * buff cards, owned and drawn the same way everything else in the pile is").
 *
 * This module ships REPRESENTATION ONLY. Nothing here activates a buff, spends one, or reads the
 * pile — activation is DLR-103 T5's, and the felt-rail UI still drives the old bespoke mechanics
 * (`CheatStage` in `app/warCouncil/roundUiState.ts`, `EnvenomStage` beside it), which this ticket's
 * Scope Boundaries explicitly leave in place. So Cheat and Timebomb currently exist twice: the live
 * mechanic, and this inert representation. That is the intended intermediate state of a migration
 * split across tickets, not an oversight.
 */

/** A Timebomb's two figures at one tier. A PAIR, not one number, for the reason `config.ts` already
 *  gives for `ENVENOM_QUARRY_DAMAGE` and `ENVENOM_PLAYER_DAMAGE` being two keys: the player's hit
 *  is deliberately smaller because it ALSO forces the streak's cash-out, and a single shared figure
 *  is the bug that type-checks, reads correctly, and pays the wrong side. */
export interface TimebombDamage {
  readonly quarry: Damage
  readonly player: Damage
}

// DLR-107 AC1 — how many tricks a Cheat's follow-suit break lasts, by tier. TRANSCRIBED verbatim
// from AC1 ("{ bronze: 1, silver: 2, gold: 3 }") and from design doc §3 ("Cheat's tier is duration
// — how many tricks the follow-suit break lasts, not a magnitude"). NOT chosen here.
//
// Bronze's 1 IS today's behaviour: `LegalMoveOptions.ignoreFollowSuit` lifts follow-suit for
// exactly one committed card, so a bronze Cheat under the new model is the Cheat that ships today.
//
// GOLD IS NOT SAFE TO SHIP ACTIVE. This ticket's own Dependencies & Risks, and design doc §3, both
// flag three tricks of no-follow-suit as needing a costing pass first ("close to a guaranteed run
// of wins rather than one clutch save"). Nothing in `src/` activates a buff, so no player-reachable
// path can reach this row; the tiered-AP-cost ticket is what prices it.
// UNIT: tricks of no-follow-suit granted by one activation.
export const CHEAT_DURATION_TRICKS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

// DLR-107 AC2 — RESOLVES design doc §3's open question, and this comment IS the record AC2 asks for
// rather than a silent decision.
//
// §3 asked: does a higher Timebomb tier raise ONLY the Quarry-side damage (strictly better to pull,
// the same 2-health risk at every tier), or does it keep today's 2:1 ratio and scale BOTH sides
// (bigger reward, proportionally costlier backfire)?
//
// RESOLVED: scale BOTH sides, on today's ratio — the reading AC2 names as the default. The rejected
// reading makes a gold Timebomb a free upgrade with no added downside, which removes the very
// decision the mechanic exists to pose.
//
// THE VALUES 1/2/3 ARE A TUNING DECISION THE DEVELOPER OWNS. Neither the ticket nor §3 states
// Timebomb's tier magnitudes; this default is taken from the only tier curves the sources do state
// — AC1's Cheat duration above, and §3's Shield bullet ("Bronze adds 1, silver 2, gold 3"). It
// yields 4/8/12 to the Quarry and 2/4/6 to the player. A gold Timebomb costing 6 of a 10-point
// player bar is a large self-inflicted hit and may want a flatter curve after a playtest.
// UNIT: dimensionless multiplier applied to today's bronze figures.
export const TIMEBOMB_TIER_MULTIPLIER: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/**
 * The table AC2 names. DERIVED, not hand-written: the multiplier above is applied to BOTH of
 * today's live figures, so the 2:1 ratio AC2 asks to preserve holds as arithmetic rather than as
 * three pairs of numbers that could drift apart under an edit.
 *
 * It also means the bronze row IS today's live pair by construction rather than by coincidence —
 * retuning `ENVENOM_QUARRY_DAMAGE` moves this table with it, which is what makes the migration
 * incapable of silently diverging from the mechanic it migrates.
 *
 * Both operands are integers and the multipliers are integers, so every product is exact — this
 * needs none of the numerator/denominator treatment `FORCED_CASH_OUT_*` required in `config.ts`.
 * UNIT: health points, applied once, to one side, at the resolution of the next trick.
 */
export const TIMEBOMB_DAMAGE: Readonly<Record<BuffTier, TimebombDamage>> = {
  [BuffTier.Bronze]: timebombRow(BuffTier.Bronze),
  [BuffTier.Silver]: timebombRow(BuffTier.Silver),
  [BuffTier.Gold]: timebombRow(BuffTier.Gold),
}

/** AC1 — mint a Cheat buff at `tier`. `id` is the caller's, minted from `RunState.nextBuffId` the
 *  same way `seedStartingBuffPile`'s are; this module never invents one and never calls
 *  `Math.random()`, because `src/hunt/` must stay deterministic. */
export function cheatBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Cheat,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[tier] },
  }
}

/** AC2 — mint a Timebomb buff at `tier`. The reward carries the QUARRY-side figure, which is the
 *  headline number; the paired player figure comes back from `timebombDamageOf`. `BuffReward` is
 *  deliberately one axis and one value (DLR-105, which flags multi-value rewards as an open
 *  question design doc §5 itself defers), and widening it is not this ticket's call. */
export function timebombBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Timebomb,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.Magnitude, value: TIMEBOMB_DAMAGE[tier].quarry },
  }
}

/**
 * Tricks of no-follow-suit this Cheat buff grants. Reads `buff.reward.value` — the figure the buff
 * was MINTED with — rather than re-indexing the table, so one object has exactly one answer.
 *
 * THROWS on a buff of any other kind rather than returning a number, the discipline `cheats.ts`'s
 * `removeCheat` already sets in this tree and for a sharper version of its reason: a Timebomb's
 * `reward.value` is also a small integer, so the swallowed version would silently lift follow-suit
 * for the wrong card and look entirely reasonable doing it.
 */
export function cheatDurationTricksOf(buff: Buff): number {
  if (buff.kind !== BuffKind.Cheat) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Cheat — it has no duration`)
  }
  return buff.reward.value
}

/**
 * Both figures this Timebomb buff owes. Reads the TIER table rather than `buff.reward.value`,
 * because the caller needs the pair and `reward` carries only the Quarry half.
 *
 * THROWS on a buff of any other kind, for `cheatDurationTricksOf`'s reason.
 */
export function timebombDamageOf(buff: Buff): TimebombDamage {
  if (buff.kind !== BuffKind.Timebomb) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Timebomb — it owes no damage`)
  }
  return TIMEBOMB_DAMAGE[buff.tier]
}

/** One row of `TIMEBOMB_DAMAGE`. A helper rather than three inline expressions so the "multiply
 *  BOTH sides" rule is stated once and cannot be applied to one side by mistake. */
function timebombRow(tier: BuffTier): TimebombDamage {
  return {
    quarry: ENVENOM_QUARRY_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
    player: ENVENOM_PLAYER_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
  }
}
```

Note the file order this needs: `timebombRow` is a function declaration and is therefore hoisted, so
`TIMEBOMB_DAMAGE` may reference it above its definition, while `TIMEBOMB_TIER_MULTIPLIER` is a
`const` and MUST be declared before `TIMEBOMB_DAMAGE` evaluates — a forward reference there is a
`ReferenceError` at module init, the trap `config.ts` already documents for `RUN_ENCOUNTERS`.

- [x] **Step 2: Run the new spec green plus the fast type gate**

Run: `npx vitest run src/hunt/__tests__/buffCatalog.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed and all cases in `buffCatalog.test.ts` passing.

- [x] **Step 3: Confirm the new file is inside the 400-line budget**

Run: `(Get-Content src\hunt\buffCatalog.ts).Count`
Expected: a number below 400. (`(Get-Content).Count`, not `Measure-Object -Line` — the latter drops
blank lines and undercounts; see `.claude/workflow/web-project.md`.)

### Task 4: Export the new surface from the `src/hunt` barrel ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add `BuffKind` and `ACTIVATED_BUFF_CONDITION` to the existing `./buffs` export block**

Replace the existing `export { ... } from './buffs'` block with:

```ts
export {
  BuffTier,
  BuffKind,
  BuffRewardAxis,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  ACTIVATED_BUFF_CONDITION,
  seedStartingBuffPile,
} from './buffs'
```

- [x] **Step 2: Add the `./buffCatalog` export block immediately after it**

```ts
export type { TimebombDamage } from './buffCatalog'
export {
  CHEAT_DURATION_TRICKS,
  TIMEBOMB_TIER_MULTIPLIER,
  TIMEBOMB_DAMAGE,
  cheatBuff,
  timebombBuff,
  cheatDurationTricksOf,
  timebombDamageOf,
} from './buffCatalog'
```

- [x] **Step 3: Typecheck and run every spec in the hunt module**

Run: `npm run typecheck; npx vitest run src/hunt`
Expected: both exit 0; Vitest reports 0 failed across every `src/hunt/__tests__/` spec, including
`run.purchaseIsolation.test.ts` — which must stay green untouched, since this contract changes no
transition and no `RunState` field.

---

## Phase 3 — Final verification

No production changes. Confirms the pure-core boundary still holds, that no figure this contract
owns was hard-coded at a call site, and that the cumulative work passes every gate.

### Task 5: Confirm the `src/hunt/**` purity boundary still holds ✓

- Skill: `none — a verification grep, no code written`

**Files:**
- (no files changed — verification only)

- [x] **Step 1: Grep the hunt module for React imports and DOM globals**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

### Task 6: Confirm no tunable was hard-coded and the bronze row is not a literal ✓

- Skill: `none — a verification grep, no code written`

**Files:**
- (no files changed — verification only)

- [x] **Step 1: Confirm `buffCatalog.ts` derives its bronze row rather than restating 4 and 2**

Run: `Select-String -Path src\hunt\buffCatalog.ts -Pattern "quarry: 4|player: 2|: 4,|: 2,"`
Expected: zero hits. The bronze figures must come from `ENVENOM_QUARRY_DAMAGE` and
`ENVENOM_PLAYER_DAMAGE`, never as literals — that derivation is what AC4's equivalence rests on.

- [x] **Step 2: Confirm no consumer writes a `BuffKind` value as a bare string**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'timebomb'|""timebomb""|'activated'|""activated"""`
Expected: exactly two hits, both declarations — `BuffKind.Timebomb` in `src/hunt/buffs.ts` and
`ACTIVATED_BUFF_CONDITION` in the same file. Any third hit is a call site binding by string instead
of through the exported map.

### Task 7: Static gates and the full suite ✓

- Skill: `none — verification only, no code written`

**Files:**
- (no files changed — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The baseline entering this contract was
**1072 passed of 1072 across 85 files**, so the expected result is that figure plus this contract's
new cases, with 0 failures.

- [x] **Step 2: Formatting of this contract's files only**

Run: `npx prettier --check src\hunt\buffs.ts src\hunt\buffCatalog.ts src\hunt\index.ts src\hunt\__tests__\buffs.test.ts src\hunt\__tests__\buffCatalog.test.ts`
Expected: exits 0. (Scoped, not repo-wide — `npm run format:check` fails on pre-existing `.docs/**`
files this contract has not touched; see `.claude/workflow/web-project.md`.)

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 8: Update the PR description ✓

- Skill: `none — a plan-folder document, no source code`

**Files:**
- Create: `.claude/contract/DLR-107-migrate-cheat-and-timebomb-into-the-buff-pile/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary of the change: `Buff` gains a `kind` identity; a new `buffCatalog.ts` holds the Cheat
  duration table, the Timebomb damage table, their factories and their readers.
- **Every decision the developer must make**, verbatim from the File map's "Developer decides or
  observes" block — chiefly `TIMEBOMB_TIER_MULTIPLIER`'s unchosen 1/2/3, and that AC3's removal of
  the two old state machines is deliberately deferred.
- Verification results from Phase 3, quoting the real Vitest summary line.
- A one-line note for future contributors: `Buff.kind` is the identity discriminator, and a
  tier-scaled figure is read through `cheatDurationTricksOf` / `timebombDamageOf`, never by indexing
  a table at a call site.

---

## Self-review

**Spec coverage:**
- `BuffKind` and the `kind` field on `Buff` — Task 1.
- `CHEAT_DURATION_TRICKS` (AC1) — Tasks 2, 3.
- `TIMEBOMB_DAMAGE` and its derivation, with AC2's §3 resolution recorded in a comment — Tasks 2, 3.
- `cheatBuff` / `timebombBuff` factories — Tasks 2, 3.
- `cheatDurationTricksOf` / `timebombDamageOf` readers, with wrong-kind refusals — Tasks 2, 3.
- Barrel exports — Task 4.
- AC4's equivalence coverage (bronze equals today's live figures, asserted against the constants) —
  Task 2's `TIMEBOMB_DAMAGE` and `cheatBuff` describes.
- Updating `buffs.test.ts`'s three shape literals for the widened required-field set — Task 1.
- AC3 — deliberately **not** covered by any task; deferred with its reason stated in the File map's
  "Developer decides or observes" block, in `plan.md` Part 1 → Assumptions made, and in the docblock
  at the top of `buffCatalog.ts`.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, "appropriate error handling", or
"similar to Task N" references. Every step carries either the exact code or a `Run:` / `Expected:`
pair. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json` or anything generated.

**Type / name consistency:** `BuffKind`, `ACTIVATED_BUFF_CONDITION`, `TimebombDamage`,
`CHEAT_DURATION_TRICKS`, `TIMEBOMB_TIER_MULTIPLIER`, `TIMEBOMB_DAMAGE`, `cheatBuff`, `timebombBuff`,
`cheatDurationTricksOf`, `timebombDamageOf` and the private `timebombRow` are spelled identically in
`plan.md` Part 2 → Data shapes, in every task's code block, in the spec in Task 2, and in the barrel
in Task 4. `BuffKind`'s member values (`'unassigned'`, `'cheat'`, `'timebomb'`) and
`ACTIVATED_BUFF_CONDITION`'s `'activated'` appear as string literals only at their declarations, which
is what Task 6 Step 2 asserts.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: the required-field widening, its one production construction site,
  and all four test assertion sites change inside the phase, so there is no half-applied change and
  no spec importing a module that does not exist yet.
- **Phase 2** ends type-checking with `buffCatalog.ts` created, its spec green, and the barrel
  updated, so every new export is reachable from `../hunt` and no dead import exists. Task 2 leaves
  a deliberate red between itself and Task 3; both sit inside this phase, so the boundary is clean.
- **Phase 3** changes no production file at all — greps, gates, and a plan-folder document only.
