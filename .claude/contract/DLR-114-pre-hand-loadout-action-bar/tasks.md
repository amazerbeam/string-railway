# Tasks: DLR-114 — Pre-hand loadout action bar

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **Sprint-run note.** `plan.md` was **not developer-confirmed** — the plan-approval gate was auto-approved on the plan's stated defaults under the unattended sprint dispatch. `mockup.html` in this folder was generated but **went unseen** and was not published as an Artifact. Every default taken is logged in `.claude/sprint-runs/2026-08-23-sprint/log.md`.

**Goal:** Give the felt one bottom-of-screen action bar carrying Apply Buff, Cards, Swap and Apply Damage, retire the four separate felt-rail plates, and wire `RunState.buffs` + `activateBuff` + a single unified AP pool onto that bar — the first player-reachable path into the buff system.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/app/warCouncil/buffHandlers.ts` — the loadout panel's three reducer transitions
- `src/app/warCouncil/buffLabels.ts` — buff name / condition / reward copy, transcribed from `v1-buff-card-list.md`
- `src/app/warCouncil/actionBarLabels.ts` — the bar's own copy and accessible names
- `src/app/warCouncil/ActionBar.tsx` — the four-button bar
- `src/app/warCouncil/BuffLoadoutPanel.tsx` — the Apply Buff selection
- `src/app/warCouncil/warCouncilActionBar.css` — the bar and the panel
- `src/hunt/__tests__/buffActivation.priced.test.ts`
- `src/app/warCouncil/__tests__/buffHandlers.test.ts`
- `src/app/warCouncil/__tests__/buffLabels.test.ts`
- `src/app/warCouncil/__tests__/actionBarLabels.test.ts`
- `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`
- `src/app/warCouncil/__tests__/ActionBar.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`

**Modified:**
- `src/hunt/buffActivation.ts` — add `isPricedBuff`, `activatableBuffs`
- `src/hunt/index.ts` — export both
- `src/app/warCouncil/roundUiState.ts` — `apPool` → `buffActivation`; add `buffs`, `loadout`, three action kinds, `loadoutOpen`, `offeredBuffs`
- `src/app/warCouncil/roundReducer.ts` — three new cases, `openWindowOnTrickResolved`, `handleTapApplyDamage` spends from `buffActivation`
- `src/app/warCouncilMount.ts` — new required `buffs` prop
- `src/App.tsx:315-330` — pass `buffs={run.buffs}`
- `src/app/warCouncil/WarCouncilRound.tsx` — mount `ActionBar`, drop the four rail mounts
- `src/app/warCouncil/warCouncil.css` — the shell's fourth grid row
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts:122,125` — read the pool through `buffActivation`
- `src/app/warCouncil/__tests__/buffActivationStock.test.ts` — `makeSeed` gains `buffs`
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `WarCouncilRound.timebomb.test.tsx`, `WarCouncilRound.readouts.test.tsx`, `WarCouncilRound.telegraph.test.tsx`, `WarCouncilRound.duelHealthBars.test.tsx` — pass the new `buffs` prop

**Deleted:**
- `src/app/warCouncil/ApplyDamagePlate.tsx`
- `src/app/warCouncil/DiscardPlate.tsx`
- `src/app/warCouncil/warCouncilApplyDamage.css`
- `src/app/warCouncil/warCouncilDiscard.css`
- `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`
- `src/app/warCouncil/__tests__/DiscardPlate.test.tsx`

**Developer decides or observes:**
- **Does the bar feel like one ritual, or four buttons in a row?** Play a hand: open Apply Buff, activate a buff, arm a Cheat from inside the panel, Swap, then Apply Damage. The whole ticket rests on this reading and no test can answer it.
- **Is two taps the right cost for activating a buff?** The poise stage is this plan's default (see `plan.md` → Assumptions made). One tap is cheaper and irreversible; two is the grammar every other control here uses.
- **Should condition-family buffs be offered at all before `buffAccrual.ts` has a caller?** Today activating one spends AP and does nothing else. A one-line change to `isPricedBuff` would hide them until they fire.
- **Should `seedStartingBuffPile` mint real content instead of four `Unassigned` placeholders?** Until it does, a fresh run with an empty Vault shows an empty buff list and only the relocated Cheat and Timebomb rows. That is a content decision, not this ticket's.
- **Every CSS value in `warCouncilActionBar.css` is a placeholder** copied from the sibling rail stylesheets. The polish ticket owns them.
- **The four AP figures behind the bar** (`STARTING_AP = 6`, `APPLY_DAMAGE_AP_COST = 3`, `REWARD_BASE`, `CONSUMABLE_AP_COST`) are agent-chosen and never played. This ticket is the first surface that makes them visible; the first hand played against them is the first evidence anyone has.

---

## Phase 1 — The priced-buff filter

Closes the `apCostOf` `RangeError` trap in the pure layer, before anything renders. One self-contained pure addition; the phase ends type-checking with no consumer yet, which is a clean boundary.

### Task 1: Add `isPricedBuff` / `activatableBuffs` to `src/hunt/buffActivation.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts`
- Modify: `src/hunt/index.ts:141-150`
- Test: `src/hunt/__tests__/buffActivation.priced.test.ts`

- [x] **Step 1: Write the failing spec for the filter**

Create `src/hunt/__tests__/buffActivation.priced.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BuffTier, seedStartingBuffPile } from '../buffs'
import { cheatBuff, shieldBuff, timebombBuff } from '../buffCatalog'
import { apCostOf } from '../buffCosts'
import { activatableBuffs, isPricedBuff } from '../buffActivation'
import { mintGrants } from '../buffTemplates'
import { BUFF_TEMPLATES } from '../buffTemplates'

describe('isPricedBuff / activatableBuffs — the Unassigned placeholder trap', () => {
  it('rejects every buff seedStartingBuffPile mints, because apCostOf throws on them', () => {
    for (const placeholder of seedStartingBuffPile(4, 1)) {
      expect(isPricedBuff(placeholder)).toBe(false)
      expect(() => apCostOf(placeholder)).toThrow(RangeError)
    }
  })

  it('accepts the three activated cards the catalog mints', () => {
    expect(isPricedBuff(cheatBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isPricedBuff(timebombBuff(BuffTier.Silver, 2))).toBe(true)
    expect(isPricedBuff(shieldBuff(BuffTier.Gold, 3))).toBe(true)
  })

  it('accepts every condition-family buff a template can mint', () => {
    const minted = mintGrants(
      BUFF_TEMPLATES.slice(0, 8).map((t) => ({ templateId: t.id, tier: BuffTier.Bronze })),
      1,
    )
    expect(minted.length).toBeGreaterThan(0)
    for (const buff of minted) expect(isPricedBuff(buff)).toBe(true)
  })

  it('activatableBuffs drops the placeholders and keeps the rest, in order', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 10)
    const pile = [...seedStartingBuffPile(2, 1), cheat, ...seedStartingBuffPile(1, 20)]
    expect(activatableBuffs(pile)).toEqual([cheat])
  })

  it('every buff activatableBuffs keeps can be priced without throwing', () => {
    const pile = [...seedStartingBuffPile(4, 1), cheatBuff(BuffTier.Gold, 9)]
    for (const buff of activatableBuffs(pile)) {
      expect(() => apCostOf(buff)).not.toThrow()
    }
  })
})
```

If `BUFF_TEMPLATES` or `mintGrants`'s `TemplateGrant` shape differs from the above, read `src/hunt/buffTemplates.ts` and adjust the spec to the real exports — do not change `buffTemplates.ts`.

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/buffActivation.priced.test.ts`
Expected: FAIL — `activatableBuffs` and `isPricedBuff` are not exported.

- [x] **Step 3: Implement both in `src/hunt/buffActivation.ts`**

Append to `src/hunt/buffActivation.ts`, importing `isConditionFamily` and `isConsumableKind` from `./buffCosts` alongside the existing `apCostOf` import:

```ts
/**
 * DLR-114 — whether `apCostOf` can price this buff. TRUE for the 11 condition families and the 8
 * consumable/activated cards; FALSE for `BuffKind.Unassigned`, which `seedStartingBuffPile` mints
 * and `buffApCost` throws a `RangeError` on.
 *
 * The predicate is a MIRROR of `buffApCost`'s own two branches rather than a second rule, so a
 * kind added to one table is admitted here automatically and a kind added to neither is refused
 * here rather than throwing at a render.
 */
export function isPricedBuff(buff: Buff): boolean {
  return isConsumableKind(buff.kind) || isConditionFamily(buff.kind)
}

/**
 * The subset of an owned pile that may be offered to the player. THE guard between
 * `RunState.buffs` — which opens every run holding `STARTING_BUFF_COUNT` placeholders — and
 * `apCostOf`'s `RangeError`. Order is preserved: the pile's order is the player's mental order.
 */
export function activatableBuffs(buffs: readonly Buff[]): readonly Buff[] {
  return buffs.filter(isPricedBuff)
}
```

- [x] **Step 4: Export both from the barrel**

In `src/hunt/index.ts`, add `isPricedBuff` and `activatableBuffs` to the existing `export { … } from './buffActivation'` block at lines 142-150.

- [x] **Step 5: Re-run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/buffActivation.priced.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 2 — One AP pool, and the pile reaching the felt

Collapses the felt's two independent AP numbers into one and threads `RunState.buffs` down to the reducer. Both are shape changes with string-adjacent readers, so each is done with every reader in a single task per `plan.md` → Config and persisted-shape audit. The phase ends with the felt compiling and behaving exactly as before — no new control yet.

### Task 2: Replace `RoundUiState.apPool` with `buffActivation`, and add `buffs` + `loadout` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts:140-220,260-270`
- Modify: `src/app/warCouncil/roundReducer.ts:235-245`
- Modify: `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts:120-126`
- Modify: `src/app/warCouncil/__tests__/buffActivationStock.test.ts:20-32`
- Test: `src/app/warCouncil/__tests__/buffActivationStock.test.ts`

- [x] **Step 1: Change the state shape in `roundUiState.ts`**

Replace the `readonly apPool: ActionPoints` field on `RoundUiState` with:

```ts
  /** DLR-114 — the run's owned buff pile at the START of this hand, mirrored from the mount's
   *  prop. Run state carried for the life of the hand — the same contract `cheats` documents.
   *  NEVER written by an action: a hand spends action points, not cards. */
  readonly buffs: readonly Buff[]
  /** DLR-114 — the hand's action-point pool AND this trick's activations, as one value.
   *  REPLACES DLR-109's separate `apPool: ActionPoints`, which was a second number claiming to be
   *  the same pool: Apply Damage spent from that one and `activateBuff` spends from this one, and
   *  two pools diverge the first time one is spent without the other. Seeded by
   *  `startBuffActivation()` at mount, which IS the per-hand refresh because `App.tsx` remounts
   *  the felt per hand (`key={hand}`) — the identical argument the old `apPool` seed made. */
  readonly buffActivation: BuffActivationState
  /** DLR-114 — `null` when the loadout panel is closed; an object while it is open, holding the
   *  buff awaiting its confirming second tap (or `null` for "open, nothing poised"). ONE nullable
   *  field rather than a boolean-plus-id pair, for `CheatSelection`'s stated reason: two fields
   *  would admit "closed but holding a stale poise". Mirrors `discardSelection`'s `null` / `[]`
   *  shape exactly. The hand's OWN transient — dies on remount, never touches `RunState`. */
  readonly loadout: LoadoutSelection | null
```

Add above `RoundUiState`:

```ts
export interface LoadoutSelection {
  readonly poised: BuffId | null
}
```

Add `readonly buffs: readonly Buff[]` to `RoundUiSeed`. Update the imports from `../../hunt` to add `startBuffActivation`, `activatableBuffs`, `type Buff`, `type BuffId`; drop `refreshActionPointsForNewHand` and `STARTING_AP` if nothing else in the file uses them (check first — `ActionPoints` is still needed by `applyDamageStock`'s return type).

- [x] **Step 2: Update `createRoundUiState`**

Replace `apPool: refreshActionPointsForNewHand(STARTING_AP),` with:

```ts
    buffs: seed.buffs,
    buffActivation: startBuffActivation(),
    loadout: null,
```

- [x] **Step 3: Update `applyDamageStock` and add the two new predicates**

In `applyDamageStock`, change `apPool: state.apPool,` to `apPool: state.buffActivation.apPool,`.

Append beside `discardSelecting` / `discardWindowOpen`:

```ts
/** `true` while the loadout panel is open — the sibling of `discardSelecting`, and read by both
 *  the bar's `aria-pressed` and the reducer's mutual-exclusion guards so the two cannot disagree. */
export function loadoutOpen(state: RoundUiState): boolean {
  return state.loadout !== null
}

/** The buffs this hand may actually be offered: the owned pile with `BuffKind.Unassigned`
 *  placeholder content filtered out by `activatableBuffs`, so `apCostOf`'s `RangeError` can never
 *  reach a render. Stated ONCE here so the panel's rows and `handleTapBuff`'s guard cannot
 *  disagree about which buffs exist. */
export function offeredBuffs(state: RoundUiState): readonly Buff[] {
  return activatableBuffs(state.buffs)
}
```

- [x] **Step 4: Update the reducer's one write of the pool**

In `src/app/warCouncil/roundReducer.ts`'s `handleTapApplyDamage`, replace
`apPool: spendAp(state.apPool, APPLY_DAMAGE_AP_COST),` with:

```ts
    buffActivation: {
      ...state.buffActivation,
      apPool: spendAp(state.buffActivation.apPool, APPLY_DAMAGE_AP_COST),
    },
```

- [x] **Step 5: Update the two specs that read the old field**

In `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`, change `poised.apPool` → `poised.buffActivation.apPool` and `committed.apPool` → `committed.buffActivation.apPool`.

In `src/app/warCouncil/__tests__/buffActivationStock.test.ts`, add `buffs: []` to `makeSeed`'s returned `RoundUiSeed`.

- [x] **Step 6: Add a spec pinning the ONE-pool invariant**

Append to `src/app/warCouncil/__tests__/buffActivationStock.test.ts`:

```ts
describe('DLR-114 — the felt has exactly one AP pool', () => {
  it('buffActivationStock reads the same pool applyDamageStock does', () => {
    const state = createRoundUiState(makeSeed())
    expect(buffActivationStock(state, state.buffActivation, cheat).apPool).toBe(
      applyDamageStock(state).apPool,
    )
  })

  it('the pool opens the hand at STARTING_AP with nothing activated', () => {
    const state = createRoundUiState(makeSeed())
    expect(state.buffActivation.apPool).toBe(STARTING_AP)
    expect(state.buffActivation.activatedThisTrick).toEqual([])
  })
})
```

Add `applyDamageStock` and `STARTING_AP` to that file's existing imports.

- [x] **Step 7: Run both specs and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffActivationStock.test.ts src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0 (`WarCouncilRound.tsx` still compiles — its `useReducer` seed gains `buffs` in Task 3).

### Task 3: Thread `RunState.buffs` through the mount to the reducer ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts`
- Modify: `src/App.tsx:315-330`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:88-115`
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx`
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.telegraph.test.tsx`
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Add the prop to `WarCouncilMountProps`**

In `src/app/warCouncilMount.ts`, add `Buff` to the `import type { … } from '../hunt'` line and add, after `discardsRemaining`:

```ts
  /** DLR-114 — the run's owned buff pile at the START of this hand. The same contract `cheats`
   *  above documents: an opening figure the reducer owns for the life of the hand. REQUIRED rather
   *  than optional so the compiler enumerates every mount site instead of letting one silently
   *  render an empty loadout. Unlike `cheats` and `timebombCharges` it does NOT come back on
   *  `WarCouncilRoundResult` — a hand spends action points, not cards, so it cannot change the
   *  pile. */
  readonly buffs: readonly Buff[]
```

`WarCouncilRoundResult` is unchanged.

- [x] **Step 2: Destructure it and seed the reducer**

In `WarCouncilRound.tsx`, add `buffs,` to the props destructuring and `buffs,` to the `useReducer` seed object.

- [x] **Step 3: Pass it at the one production mount site**

In `src/App.tsx`, add `buffs={run.buffs}` to the `<WarCouncilRound …>` element, beside `cheats={run.cheats}`.

- [x] **Step 4: Pass it in every test mount**

Add `buffs={[]}` (or the file's own fixture override pattern, matching how each file already handles `discardsRemaining`) to the `<WarCouncilRound …>` element in all five `WarCouncilRound.*.test.tsx` files.

- [x] **Step 5: Typecheck and run the mount specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.telegraph.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`
Expected: `tsc -b` exits 0; Vitest reports 0 failed.

---

## Phase 3 — The loadout's reducer transitions

Adds the three new actions and the per-trick window boundary. All pure and fully testable with no renderer; the phase ends with a reducer that can open, poise, activate and close, and a felt that does not yet expose any of it.

### Task 4: Add `buffHandlers.ts` and wire it into the reducer ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/buffHandlers.ts`
- Modify: `src/app/warCouncil/roundUiState.ts` — three `RoundUiActionKind` members and three `RoundUiAction` variants
- Modify: `src/app/warCouncil/roundReducer.ts` — three `switch` cases and `openWindowOnTrickResolved`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`

- [x] **Step 1: Add the three action kinds**

In `roundUiState.ts`, add to `RoundUiActionKind`:

```ts
  ToggleLoadout: 'toggleLoadout',
  CancelLoadout: 'cancelLoadout',
  TapBuff: 'tapBuff',
```

and to `RoundUiAction`:

```ts
  | { readonly kind: typeof RoundUiActionKind.ToggleLoadout }
  | { readonly kind: typeof RoundUiActionKind.CancelLoadout }
  | { readonly kind: typeof RoundUiActionKind.TapBuff; readonly id: BuffId }
```

- [x] **Step 2: Write the failing spec for the three transitions and the per-trick boundary**

Create `src/app/warCouncil/__tests__/buffHandlers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import { apCostOf, BuffTier, cheatBuff, STARTING_AP } from '../../../hunt'
import { createRoundUiState, loadoutOpen, RoundUiActionKind, type RoundUiSeed } from '../roundUiState'
import { roundReducer } from '../roundReducer'
import { makeRound, encounterFixture } from './roundFixture'

const cheat = cheatBuff(BuffTier.Bronze, 1)
const card = (suit: Suit, rank: number): Card => ({ suit, rank })

function seed(overrides: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(overrides),
    encounter: encounterFixture,
    cheats: [],
    timebombCharges: 0,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: 2,
    buffs: [cheat],
  }
}

const open = (s = createRoundUiState(seed())) =>
  roundReducer(s, { kind: RoundUiActionKind.ToggleLoadout })

describe('the loadout panel — opening and closing', () => {
  it('ToggleLoadout opens it when the buff window is open', () => {
    expect(loadoutOpen(open())).toBe(true)
  })

  it('ToggleLoadout closes an open panel and drops any poise', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const closed = roundReducer(poised, { kind: RoundUiActionKind.ToggleLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })

  it('opening clears an armed card, so the next hand-card tap is never ambiguous', () => {
    const armed = roundReducer(createRoundUiState(seed()), {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Bells, 7),
    })
    expect(armed.armed).not.toBeNull()
    expect(open(armed).armed).toBeNull()
  })

  it('is refused mid-trick, when the buff window is closed', () => {
    const midTrick = createRoundUiState(
      seed({ currentTrick: [{ side: PlayerSide.Player, card: card(Suit.Bells, 2) }] }),
    )
    expect(loadoutOpen(open(midTrick))).toBe(false)
  })

  it('CancelLoadout closes without spending', () => {
    const closed = roundReducer(open(), { kind: RoundUiActionKind.CancelLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })
})

describe('activating a buff — poise, then commit', () => {
  it('the first tap poises and spends nothing', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(poised.loadout?.poised).toBe(cheat.id)
    expect(poised.buffActivation.apPool).toBe(STARTING_AP)
    expect(poised.buffActivation.activatedThisTrick).toEqual([])
  })

  it('the second tap on the same buff spends its AP cost and records it', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const done = roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(done.buffActivation.apPool).toBe(STARTING_AP - apCostOf(cheat))
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])
    expect(loadoutOpen(done)).toBe(true)
    expect(done.loadout?.poised).toBeNull()
  })

  it('a second activation of the same buff in the same trick is refused, not double-charged', () => {
    const once = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    const again = roundReducer(
      roundReducer(once, { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(again.buffActivation.apPool).toBe(once.buffActivation.apPool)
    expect(again.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })

  it('an id not in the offered pile is a no-op, never a throw', () => {
    const opened = open()
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 })).not.toThrow()
    expect(roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 }).loadout?.poised).toBeNull()
  })

  it('an Unassigned placeholder is never offered and never priced', () => {
    const withPlaceholders = createRoundUiState({ ...seed(), buffs: [] })
    const opened = roundReducer(withPlaceholders, { kind: RoundUiActionKind.ToggleLoadout })
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 1 })).not.toThrow()
  })
})
```

Adjust the fixture import to whatever `roundFixture.ts` actually exports for the encounter — read it first.

- [x] **Step 3: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts`
Expected: FAIL — the three action kinds have no reducer case.

- [x] **Step 4: Write `buffHandlers.ts`**

```ts
/**
 * DLR-114 — the loadout panel's three reducer transitions, separated from the reducer that calls
 * them, mirroring `discardHandlers.ts`'s own split for that file's stated reason: this is a
 * self-contained block that decides nothing about the rest of the felt.
 *
 * Nothing here throws. `activateBuff` throws by design on a refused activation, so every path
 * below asks `buffActivationRefusalFor` FIRST — a throw inside a reducer during an event handler
 * unmounts the tree, which is the discipline `handleTapApplyDamage` and `handleTapCheat` already
 * set.
 */
import {
  activateBuff,
  buffActivationRefusalFor,
  type Buff,
  type BuffId,
} from '../../hunt'
import {
  buffActivationStock,
  discardWindowOpen,
  offeredBuffs,
  type RoundUiState,
} from './roundUiState'

/** THE one statement of whether a given buff can be activated right now. Both the panel's row
 *  `disabled` state and `handleTapBuff`'s guard call this, so they cannot read availability
 *  differently — the discipline `applyDamageRefusalFor` sets. */
export function loadoutRefusalFor(state: RoundUiState, buff: Buff) {
  return buffActivationRefusalFor(buffActivationStock(state, state.buffActivation, buff))
}

/**
 * Open or close the panel. Opening clears `armed`, `cheatSelection`, `timebombStage` and
 * `discardSelection`: all four reinterpret the next hand-card tap, and allowing two at once makes
 * that tap ambiguous — `handleTapDiscard`'s own rule, extended by one control. Closing drops any
 * poise unspent. Refused (no-op) while the buff window is closed, which is the same
 * `discardWindowOpen` signal Swap reads.
 */
export function handleToggleLoadout(state: RoundUiState): RoundUiState {
  if (state.loadout !== null) return handleCancelLoadout(state)
  if (!discardWindowOpen(state)) return state
  return {
    ...state,
    loadout: { poised: null },
    armed: null,
    cheatSelection: null,
    timebombStage: null,
    discardSelection: null,
  }
}

/** Close without spending, dropping any poise — `Escape`'s transition, mirroring
 *  `handleCancelDiscard`. */
export function handleCancelLoadout(state: RoundUiState): RoundUiState {
  return state.loadout === null ? state : { ...state, loadout: null }
}

/**
 * Three outcomes on one row, mirroring `handleTapApplyDamage`'s shape. A refusal drops the poise
 * and changes nothing else; nothing poised (or a different buff poised) poises this one; the same
 * buff poised COMMITS through `activateBuff` and leaves the panel OPEN, because AC2 allows one or
 * more activations per trick.
 *
 * The refusal is re-read on BOTH taps, for `handleTapApplyDamage`'s stated reason: the felt can
 * change under a poised row — the Quarry leads, a reveal is held — and re-reading is what stops a
 * poise made while the row was live from committing after it stopped being.
 */
export function handleTapBuff(state: RoundUiState, id: BuffId): RoundUiState {
  if (state.loadout === null) return state
  const buff = offeredBuffs(state).find((b) => b.id === id)
  if (buff === undefined) return { ...state, loadout: { poised: null } }
  if (loadoutRefusalFor(state, buff) !== null) return { ...state, loadout: { poised: null } }
  if (state.loadout.poised !== id) return { ...state, loadout: { poised: id } }
  return {
    ...state,
    buffActivation: activateBuff(state.buffActivation, buff, discardWindowOpen(state)),
    loadout: { poised: null },
  }
}
```

- [x] **Step 5: Wire the three cases and the per-trick boundary into `roundReducer.ts`**

Add to `applyAction`'s `switch`:

```ts
    case RoundUiActionKind.ToggleLoadout:
      return handleToggleLoadout(state)
    case RoundUiActionKind.CancelLoadout:
      return handleCancelLoadout(state)
    case RoundUiActionKind.TapBuff:
      return handleTapBuff(state, action.id)
```

Change the exported entry point and add the boundary helper:

```ts
export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  return openWindowOnTrickResolved(state, captureUnplayed(applyAction(state, action)))
}

/**
 * DLR-114 — DLR-108 AC4's per-trick boundary, applied at the ONE transition where a trick actually
 * resolves. `openBuffWindow` clears `activatedThisTrick` and leaves the pool untouched.
 *
 * Fires on the `null` -> non-null edge of `resolvedTrick`, NOT on "the current trick is empty": a
 * buff is activated WHILE the trick is empty (that is what `discardWindowOpen` means), so an
 * empty-trick rule would erase every activation the instant it was made. Two-argument and pure, so
 * StrictMode's development double dispatch recomputes an identical value — the same property
 * `captureUnplayed` beside it relies on.
 */
function openWindowOnTrickResolved(prev: RoundUiState, next: RoundUiState): RoundUiState {
  if (prev.resolvedTrick !== null || next.resolvedTrick === null) return next
  return { ...next, buffActivation: openBuffWindow(next.buffActivation) }
}
```

Add `openBuffWindow` to the `from '../../hunt'` import block and the three handlers to a new `from './buffHandlers'` import.

- [x] **Step 6: Add the per-trick boundary spec**

Append to `src/app/warCouncil/__tests__/buffHandlers.test.ts`:

```ts
describe('the per-trick activation window', () => {
  it('clears activatedThisTrick when a trick resolves, and leaves the pool alone', () => {
    const done = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])

    // Play a card and let the Quarry answer, so a trick resolves.
    const closed = roundReducer(done, { kind: RoundUiActionKind.ToggleLoadout })
    const lead = closed.round.hands[PlayerSide.Player][0]
    const armedCard = roundReducer(closed, { kind: RoundUiActionKind.TapCard, card: lead })
    const played = roundReducer(armedCard, { kind: RoundUiActionKind.TapCard, card: lead })

    expect(played.resolvedTrick).not.toBeNull()
    expect(played.buffActivation.activatedThisTrick).toEqual([])
    expect(played.buffActivation.apPool).toBe(done.buffActivation.apPool)
  })
})
```

If the fixture's first hand card happens to trigger an `AbilityPrompt` (Fox or Woodcutter), pick a plain-rank card from `makeRound`'s hand instead — `card(Suit.Bells, 7)` is safe.

- [x] **Step 7: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 4 — The copy

Two label modules, both pure, both fully testable without a renderer. `labels.ts` is at 291 of its 400-line budget so neither goes there. The phase ends with copy that nothing renders yet.

### Task 5: Write `buffLabels.ts` — the one glanceable line ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/buffLabels.ts`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [x] **Step 1: Write `buffLabels.ts`**

Every family word, condition sentence and reward suffix below is **transcribed verbatim** from `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` → *How a card is named*. Do not invent a phrase; if a `BuffKind` has no row in that table (the five consumables, Cheat, Timebomb, Shield, Unassigned), use the wording given here and mark it as this ticket's own placeholder copy in a comment.

```ts
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  buffTargetRankOf,
  buffTargetSuitOf,
  type ActionPoints,
  type Buff,
  BuffActivationRefusal,
} from '../../hunt'

/** DLR-114 — the family word half of a card's name. TRANSCRIBED from `v1-buff-card-list.md` ->
 *  *How a card is named*; the eight activated/consumable kinds and `Unassigned` have no row there,
 *  so their words are this ticket's own PLACEHOLDER copy. Keyed over the closed `BuffKind` union so
 *  a member added later fails to compile here rather than rendering `undefined`. */
export const BUFF_FAMILY_WORD: Readonly<Record<BuffKind, string>> = {
  [BuffKind.Taker]: 'Taker',
  [BuffKind.Feeder]: 'Feeder',
  [BuffKind.MarkOfRank]: 'Mark of the',
  [BuffKind.Sidestep]: 'Sidestep',
  [BuffKind.Glutton]: 'Glutton',
  [BuffKind.Hoarder]: 'Hoarder',
  [BuffKind.Unbloodied]: 'Unbloodied',
  [BuffKind.DebtCollector]: 'Debt Collector',
  [BuffKind.Keepsake]: 'Keepsake',
  [BuffKind.Miser]: 'Miser',
  [BuffKind.Cornered]: 'Cornered',
  [BuffKind.Cheat]: 'Cheat',
  [BuffKind.Timebomb]: 'Timebomb',
  [BuffKind.Shield]: 'Shield',
  [BuffKind.Ward]: 'Ward',
  [BuffKind.Puppeteer]: 'Puppeteer',
  [BuffKind.SecondThoughts]: 'Second Thoughts',
  [BuffKind.Foresight]: 'Foresight',
  [BuffKind.Spyglass]: 'Spyglass',
  [BuffKind.Unassigned]: 'Blank card',
}

/** The condition half, in sentence form. The eleven family rows are TRANSCRIBED from the same
 *  table; the activated cards have no condition at all, which is what `ACTIVATED_BUFF_CONDITION`
 *  already says, so they read as an action the player takes. Suit and rank are substituted by
 *  `buffConditionSentence` below. */
export const BUFF_CONDITION_SENTENCE: Readonly<Record<BuffKind, string>> = {
  [BuffKind.Taker]: 'win a trick with {suit}',
  [BuffKind.Feeder]: 'lose a trick with {suit}',
  [BuffKind.MarkOfRank]: 'win a trick with a {rank}',
  [BuffKind.Sidestep]: 'dodge a skull with this card',
  [BuffKind.Glutton]: 'eat a skull with this card',
  [BuffKind.Hoarder]: 'reach a high bank this hand',
  [BuffKind.Unbloodied]: 'survive several tricks without a hit',
  [BuffKind.DebtCollector]: 'apply damage this hand',
  [BuffKind.Keepsake]: "hold a {suit} card at hand's end",
  [BuffKind.Miser]: 'hold enough coins',
  [BuffKind.Cornered]: 'be low on health',
  [BuffKind.Cheat]: 'play any card, ignoring follow-suit',
  [BuffKind.Timebomb]: 'prime a card in your hand',
  [BuffKind.Shield]: 'raise blue hearts',
  [BuffKind.Ward]: 'absorb the next hit',
  [BuffKind.Puppeteer]: "steer the Quarry's next card",
  [BuffKind.SecondThoughts]: 'take back your last card',
  [BuffKind.Foresight]: 'look at the draw pile',
  [BuffKind.Spyglass]: "look at the Quarry's hand",
  [BuffKind.Unassigned]: 'nothing yet',
}

/** The reward suffix half. The four priced axes are TRANSCRIBED from the same document's
 *  *Reward suffix* table (Blade / Purse / Second Wind / Momentum); the rest are this ticket's own
 *  placeholder copy for axes that table does not price. */
export const BUFF_REWARD_SUFFIX: Readonly<Record<BuffRewardAxis, string>> = {
  [BuffRewardAxis.Magnitude]: 'Blade',
  [BuffRewardAxis.Coins]: 'Purse',
  [BuffRewardAxis.ApRefund]: 'Second Wind',
  [BuffRewardAxis.Multiplier]: 'Momentum',
  [BuffRewardAxis.DurationTricks]: 'Free Rein',
  [BuffRewardAxis.HeartCount]: 'Blast Guard',
  [BuffRewardAxis.CardsRevealed]: 'Sight',
  [BuffRewardAxis.CandidatesEliminated]: 'Sight',
  [BuffRewardAxis.DiscardCharges]: 'Reshape',
  [BuffRewardAxis.DamageAbsorbed]: 'Blast Guard',
  [BuffRewardAxis.None]: 'No reward',
}

const SUIT_WORD: Readonly<Record<BuffTargetSuit, string>> = {
  [BuffTargetSuit.Bells]: 'Bells',
  [BuffTargetSuit.Keys]: 'Keys',
  [BuffTargetSuit.Moons]: 'Moons',
}

/** `Bell-Taker (Momentum)` / `Mark of the 9 (Blade)` / `Cheat (Free Rein)` — the naming grammar
 *  `v1-buff-card-list.md` sets: the three suit-parameterised families prefix the suit, ranks are
 *  substituted into the family word, and the reward suffix closes in parentheses. */
export function buffName(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const family = BUFF_FAMILY_WORD[buff.kind]
  const head =
    rank !== null
      ? `${family} ${rank}`
      : suit !== null
        ? `${SUIT_WORD[suit].replace(/s$/, '')}-${family}`
        : family
  return `${head} (${BUFF_REWARD_SUFFIX[buff.reward.axis]})`
}

/** The condition, with any suit or rank substituted in. */
export function buffConditionSentence(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  return BUFF_CONDITION_SENTENCE[buff.kind]
    .replace('{suit}', suit !== null ? SUIT_WORD[suit] : 'any suit')
    .replace('{rank}', rank !== null ? String(rank) : 'named rank')
}

/** `+2 multiplier` / `+3 damage` / `3 coins` / `1 action point back`. */
export function buffRewardPhrase(buff: Buff): string {
  const v = buff.reward.value
  switch (buff.reward.axis) {
    case BuffRewardAxis.Magnitude:
      return `+${v} damage`
    case BuffRewardAxis.Coins:
      return `+${v} coins`
    case BuffRewardAxis.ApRefund:
      return `+${v} action ${v === 1 ? 'point' : 'points'} back`
    case BuffRewardAxis.Multiplier:
      return `+${v} multiplier`
    case BuffRewardAxis.DurationTricks:
      return `${v} ${v === 1 ? 'trick' : 'tricks'} of no follow-suit`
    case BuffRewardAxis.HeartCount:
    case BuffRewardAxis.DamageAbsorbed:
      return `${v} blue ${v === 1 ? 'heart' : 'hearts'}`
    case BuffRewardAxis.CardsRevealed:
      return `${v} ${v === 1 ? 'card' : 'cards'} revealed`
    case BuffRewardAxis.CandidatesEliminated:
      return `${v} ${v === 1 ? 'card' : 'cards'} ruled out`
    case BuffRewardAxis.DiscardCharges:
      return `+${v} ${v === 1 ? 'swap' : 'swaps'}`
    case BuffRewardAxis.None:
      return 'nothing'
  }
}

/** THE one glanceable line, and the row's own accessible name — one string, so what a sighted
 *  player reads and what a screen reader announces cannot drift.
 *  `Bell-Taker (Momentum) — win a trick with Bells: +2 multiplier. 2 AP.` */
export function buffLine(buff: Buff, apCost: ActionPoints): string {
  return `${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}. ${apCost} AP.`
}

/** PLACEHOLDER copy, as this project's rest is. */
export const BUFF_ACTIVATION_REFUSAL_MESSAGE: Readonly<Record<BuffActivationRefusal, string>> = {
  [BuffActivationRefusal.WindowClosed]: 'Not between tricks.',
  [BuffActivationRefusal.AlreadyActive]: 'Already active this trick.',
  [BuffActivationRefusal.InsufficientAp]: 'Not enough action points.',
}

export const BUFF_POISED_HINT = 'Tap again to activate'

/** The row's full accessible name: the line, then the poise stage or the refusal reason. */
export function buffRowAccessibleName(
  buff: Buff,
  apCost: ActionPoints,
  poised: boolean,
  refusal: BuffActivationRefusal | null,
): string {
  const line = buffLine(buff, apCost)
  if (refusal !== null) return `${line} ${BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}`
  return poised ? `${line} ${BUFF_POISED_HINT}` : line
}
```

Check `src/hunt/index.ts` exports `buffTargetSuitOf`, `buffTargetRankOf`, `BuffTargetSuit` and `ActionPoints`; add any that are missing to the barrel rather than deep-importing.

- [x] **Step 2: Write the spec**

Create `src/app/warCouncil/__tests__/buffLabels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  apCostOf,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  cheatBuff,
  shieldBuff,
  timebombBuff,
  type Buff,
} from '../../../hunt'
import {
  BUFF_CONDITION_SENTENCE,
  BUFF_FAMILY_WORD,
  BUFF_REWARD_SUFFIX,
  buffLine,
  buffName,
  buffRewardPhrase,
  buffRowAccessibleName,
} from '../buffLabels'

const bellTaker: Buff = {
  id: 1,
  kind: BuffKind.Taker,
  tier: BuffTier.Silver,
  condition: { kind: 'taker', target: { suit: 'bells' as never } },
  reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
}

describe('buffLabels — one glanceable line', () => {
  it('names a suit-parameterised family with its suit prefix and reward suffix', () => {
    expect(buffName(bellTaker)).toBe('Bell-Taker (Momentum)')
  })

  it('states condition and reward in one line, ending with the AP cost', () => {
    expect(buffLine(bellTaker, apCostOf(bellTaker))).toBe(
      `Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. ${apCostOf(bellTaker)} AP.`,
    )
  })

  it('names every activated card the catalog can mint, without throwing', () => {
    for (const buff of [
      cheatBuff(BuffTier.Bronze, 1),
      timebombBuff(BuffTier.Gold, 2),
      shieldBuff(BuffTier.Silver, 3),
    ]) {
      expect(buffLine(buff, apCostOf(buff))).toContain(' AP.')
    }
  })

  it('covers every BuffKind and every BuffRewardAxis, so nothing renders undefined', () => {
    for (const kind of Object.values(BuffKind)) {
      expect(BUFF_FAMILY_WORD[kind]).toBeTruthy()
      expect(BUFF_CONDITION_SENTENCE[kind]).toBeTruthy()
    }
    for (const axis of Object.values(BuffRewardAxis)) {
      expect(BUFF_REWARD_SUFFIX[axis]).toBeTruthy()
    }
  })

  it('pluralises the singular reward figures', () => {
    expect(buffRewardPhrase({ ...bellTaker, reward: { axis: BuffRewardAxis.ApRefund, value: 1 } }))
      .toBe('+1 action point back')
  })

  it('appends the refusal reason to the accessible name so no control is dead without a cause', () => {
    const name = buffRowAccessibleName(bellTaker, 4, false, 'insufficientAp' as never)
    expect(name).toContain('Not enough action points.')
  })
})
```

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 6: Write `actionBarLabels.ts` — the bar's own copy ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/actionBarLabels.ts`
- Test: `src/app/warCouncil/__tests__/actionBarLabels.test.ts`

- [x] **Step 1: Write `actionBarLabels.ts`**

Reuse the existing `APPLY_DAMAGE_RAIL_LABEL`, `APPLY_DAMAGE_REFUSAL_MESSAGE`, `DISCARD_REFUSAL_MESSAGE` and `cardAccessibleName` from `./labels` rather than restating any of them. All copy below is PLACEHOLDER, as this project's rest is.

```ts
export const ACTION_BAR_LABEL = 'Actions'
export const APPLY_BUFF_LABEL = 'Apply Buff'
export const CARDS_LABEL = 'Cards'
export const SWAP_LABEL = 'Swap'
export const APPLY_DAMAGE_BAR_LABEL = 'Apply Damage'
export const LOADOUT_PANEL_LABEL = 'Your buffs'
export const LOADOUT_EMPTY_MESSAGE =
  'No priced buffs held. Cheats and Timebomb charges are below.'
export const CARDS_NO_SELECTION_HINT = 'No card selected'
```

Plus these four composers, each returning ONE string used as both the visible sub-label and the control's `aria-label` where the plan's Data shapes say so:

```ts
export function applyBuffAccessibleName(
  apPool: ActionPoints, offeredCount: number, open: boolean, windowOpen: boolean,
): string
export function cardsAccessibleName(armed: Card | null): string
export function queuedPayoutText(pending: PendingApplyPayout | null): string | null
export function applyDamageBarAccessibleName(
  cashValue: number, apCost: ActionPoints, poised: boolean,
  refusal: ApplyDamageRefusal | null, pending: PendingApplyPayout | null,
): string
```

`queuedPayoutText` returns `null` for `null` and otherwise
`` `Payout queued: ${pending.cashOut} damage, ${pending.resolutionsOwed} ${pending.resolutionsOwed === 1 ? 'trick' : 'tricks'} to go.` ``
`cardsAccessibleName` returns `` `${CARDS_LABEL} — ${CARDS_NO_SELECTION_HINT}` `` when `armed` is `null`, and otherwise `` `${CARDS_LABEL} — play the ${cardAccessibleName(armed)}` ``.
`applyDamageBarAccessibleName` names the cash value and the AP cost, appends `APPLY_DAMAGE_POISED_HINT` when poised, `APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]` when refused, and `queuedPayoutText(pending)` when one is queued.
`applyBuffAccessibleName` names the remaining AP and the held count, says the panel is open when it is, and says the window is closed when `windowOpen` is false.

- [x] **Step 2: Write the spec**

Create `src/app/warCouncil/__tests__/actionBarLabels.test.ts` asserting, at minimum: `queuedPayoutText(null)` is `null`; a payout with `resolutionsOwed: 1` reads `1 trick to go` and one with `2` reads `2 tricks to go`; `cardsAccessibleName(null)` contains `No card selected`; `cardsAccessibleName({ suit: Suit.Bells, rank: 7 })` contains `7 of Bells`; `applyDamageBarAccessibleName` names both the cash value and the AP cost, and includes the queued sentence when a payout is pending; `applyBuffAccessibleName` names the AP figure it is given.

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/actionBarLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 5 — The bar, the panel, and the felt-rail retirement

The visible half. Layout follows `mockup.html` in this folder — a fourth grid row below the hand, the panel anchored to the bottom of the felt above it. The phase ends with the old plates gone, the bar in place, and every gate green.

### Task 7: Build `BuffLoadoutPanel.tsx` ✓

- Skill: game-ux

**Files:**
- Create: `src/app/warCouncil/BuffLoadoutPanel.tsx`
- Create: `src/app/warCouncil/warCouncilActionBar.css`
- Test: `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`

- [x] **Step 1: Build the panel**

Props exactly as `plan.md` Part 2 → Data shapes gives them. Structure, per `mockup.html`'s `.loadout` block:

- A container `<div role="dialog" aria-label={LOADOUT_PANEL_LABEL}>` with `onClick={(e) => e.stopPropagation()}` — load-bearing for `ApplyDamagePlate.tsx`'s stated reason — and `onKeyDown` calling `onClose()` on `Escape`.
- The remaining-AP line, always visible (never hover-only).
- One `<button>` per buff in `buffs`, `aria-pressed={poised === buff.id}`, `disabled={refusalFor(buff) !== null}`, `aria-label={buffRowAccessibleName(buff, apCostFor(buff), poised === buff.id, refusalFor(buff))}`, its visible text `buffLine(buff, apCostFor(buff))`, and the refusal sentence rendered on the row's own face when refused.
- `LOADOUT_EMPTY_MESSAGE` when `buffs` is empty.
- The relocated `<CheatSlots …>` and `<TimebombCharge …>`, unchanged, below a divider.
- The buff rows are a **roving-tabindex collection** via the existing `useRovingTabIndex` hook — the pile is unbounded and `game-ux` sets the threshold at about five. Read that hook's actual signature before wiring it.

State is distinguished by **form as well as colour**: `.is-poised` adds a dashed border and a lift, disabled adds a dashed border and reduced opacity. No new colour token is invented — reuse `--wc-brass`, `--wc-brass-dim`, `--wc-alarm`, `--wc-chalk-dim` from `warCouncil.css`, and copy every `clamp()` bound from `warCouncilCheats.css`. Add a header comment recording that every value is a placeholder the polish ticket owns.

- [x] **Step 2: Write the component spec, querying by role and label only**

Create `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`. Assert, all via `getByRole` / `getByLabelText` / `getByText` — never a class name or a test id:

- The panel is a `dialog` named `Your buffs`.
- One `button` per offered buff, each named with its full line including its AP cost.
- The remaining-AP figure is on screen.
- A row whose `refusalFor` returns `InsufficientAp` is `disabled` and its refusal sentence is in the document.
- Clicking a live row calls `onTapBuff` with that buff's id.
- A row with `poised === buff.id` has `aria-pressed="true"`; every other row has `"false"`.
- `Escape` calls `onClose`.
- With `buffs: []`, `LOADOUT_EMPTY_MESSAGE` is on screen and no buff row exists.
- The relocated Cheat group and Timebomb group are both present by their existing accessible names.
- `ArrowRight` moves focus from the first buff row to the second (the roving tabindex).

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 8: Build `ActionBar.tsx` ✓

- Skill: game-ux

**Files:**
- Create: `src/app/warCouncil/ActionBar.tsx`
- Modify: `src/app/warCouncil/warCouncilActionBar.css`
- Test: `src/app/warCouncil/__tests__/ActionBar.test.tsx`

- [x] **Step 1: Build the bar**

A `<nav role="group" aria-label={ACTION_BAR_LABEL}>` carrying exactly four `<button>`s, in order: Apply Buff, Cards, Swap, Apply Damage. Four controls is below `game-ux`'s roving-tabindex threshold, so these are plain tab stops. `onClick={(e) => e.stopPropagation()}` on the container, `Escape` on `onKeyDown` cancelling whichever poise is live.

Per button:
- **Apply Buff** — `aria-pressed={loadoutOpen}`, `aria-label={applyBuffAccessibleName(apPool, offeredBuffs.length, loadoutOpen, loadoutRefusal === null)}`, `disabled` only when the buff window is closed (`loadoutRefusal === WindowClosed`), never when the player merely cannot afford anything. Renders the remaining AP and the held count on its face.
- **Cards** — `disabled={!cardsEnabled || armed === null}`, `aria-pressed={armed !== null}`, `aria-label={cardsAccessibleName(armed)}`, `onClick={onPlayArmed}`. Greyed until a card is armed, highlighted after (AC3).
- **Swap** — `aria-pressed={discardSelecting}`, `disabled={discardRefusal !== null}`, `aria-label={discardAccessibleName(discardsRemaining, discardSelecting, discardSelectionSize, discardRefusal)}` from the existing `labels.ts`, refusal sentence on its own face (AC4).
- **Apply Damage** — `aria-pressed={applyPoised}`, `disabled={applyRefusal !== null}`, `aria-label={applyDamageBarAccessibleName(...)}`, showing `APPLY_DAMAGE_AP_COST` on its face and, when `pendingPayout !== null`, `queuedPayoutText(pendingPayout)` as a visible note (AC5).

The bar renders **always**, for the whole hand. Nothing is conditionally unmounted.

- [x] **Step 2: Write the component spec, querying by role and label only**

Create `src/app/warCouncil/__tests__/ActionBar.test.tsx`. Assert:

- The bar is a `group` named `Actions` containing exactly four buttons.
- Apply Buff's accessible name carries the remaining AP figure; it is enabled when `loadoutRefusal` is `null`; it is enabled when `loadoutRefusal` is `InsufficientAp`; it is disabled when `loadoutRefusal` is `WindowClosed`.
- Cards is disabled with `armed: null` and its name says `No card selected`.
- Cards is enabled with an armed card, `aria-pressed="true"`, its name names the card, and clicking it calls `onPlayArmed`.
- Swap's name carries the remaining discard count; clicking calls `onTapSwap`; a refusal disables it and puts the refusal sentence in the document.
- Apply Damage's face carries the AP cost; with a `pendingPayout` of `{ cashOut: 12, resolutionsOwed: 2, unplayedAtPress: 3 }` the text `2 tricks to go` is in the document; with `resolutionsOwed: 1` it reads `1 trick to go`.
- Clicking Apply Damage calls `onTapApplyDamage`; `Escape` calls `onCancelApplyDamage`.

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/ActionBar.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 9: Mount the bar, retire the four rails, add the fourth grid row ✓

- Skill: game-ux

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Modify: `src/app/warCouncil/warCouncil.css:80-100`
- Delete: `src/app/warCouncil/ApplyDamagePlate.tsx`
- Delete: `src/app/warCouncil/DiscardPlate.tsx`
- Delete: `src/app/warCouncil/warCouncilApplyDamage.css`
- Delete: `src/app/warCouncil/warCouncilDiscard.css`
- Delete: `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`
- Delete: `src/app/warCouncil/__tests__/DiscardPlate.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`

- [x] **Step 1: Add the fourth grid row to the shell**

In `src/app/warCouncil/warCouncil.css`, change `.wc-shell`'s rows and areas:

```css
  grid-template-rows: auto 1fr auto auto;
  grid-template-areas:
    'status  status'
    'dossier table'
    'hand    hand'
    'actions actions';
```

Nothing else in that rule changes — `height: 100dvh`, `overflow: hidden` and the `env(safe-area-inset-*)` padding all stay. The `1fr` table row absorbs the bar's height, which is what keeps the screen from scrolling.

- [x] **Step 2: Rewrite the felt rail and mount the bar in `WarCouncilRound.tsx`**

- Delete the `<CheatSlots>`, `<TimebombCharge>`, `<ApplyDamagePlate>` and `<DiscardPlate>` elements from `.wc-felt-rail`, leaving `<DecreePile>` and dropping the now-orphaned `.wc-felt-rail-split` divider.
- Delete the `ApplyDamagePlate` and `DiscardPlate` imports and the `./warCouncilApplyDamage.css` and `./warCouncilDiscard.css` imports; add `./warCouncilActionBar.css`.
- Render `<BuffLoadoutPanel …>` inside `.wc-table`, above `.wc-table-inner`, only when `loadoutOpen(ui)`.
- Render `<ActionBar …>` as the last child of `.wc-shell`, after `<HandFan>`.
- Derive, beside the existing `applyRefusal` / `discardRefusal` lines: `const offered = offeredBuffs(ui)` and `const loadoutRefusal = offered.length > 0 ? loadoutRefusalFor(ui, offered[0]) : (discardWindowOpen(ui) ? null : BuffActivationRefusal.WindowClosed)`. Give that expression its own named helper in `buffHandlers.ts` if it does not read cleanly inline — the file budget check in Step 5 decides.
- `onPlayArmed` dispatches `{ kind: RoundUiActionKind.TapCard, card: ui.armed }` when `ui.armed !== null` — the existing confirming-second-tap path, reached from a second control, so no reducer branch is added.

- [x] **Step 3: Delete the two superseded plates, their stylesheets and their specs**

Remove all six files listed in this task's `Delete:` block.

- [x] **Step 4: Write the integration spec**

Create `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`, mounting the real `WarCouncilRound` with a `buffs` prop holding one `cheatBuff(BuffTier.Bronze, 1)`. Assert, by role and label only:

- The `Actions` group renders with its four buttons on a freshly mounted hand.
- The old rails are gone: `queryByRole('group', { name: 'Cheats' })` and `queryByRole('group', { name: 'Timebomb' })` are `null` before the panel is opened.
- Clicking Apply Buff opens the `Your buffs` dialog, and the Cheat and Timebomb groups are then present inside it.
- The Cheat buff's row names its AP cost; clicking it twice reduces the AP figure on Apply Buff's own accessible name by exactly `apCostOf(cheatBuff(BuffTier.Bronze, 1))`.
- Tapping a hand card once enables Cards; clicking Cards plays that card (the trick well shows it).

- [x] **Step 5: Measure both changed components against the 400-line budget**

Run: `npx prettier --write src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/roundUiState.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/buffHandlers.ts src/app/warCouncil/ActionBar.tsx src/app/warCouncil/BuffLoadoutPanel.tsx src/app/warCouncil/buffLabels.ts src/app/warCouncil/actionBarLabels.ts src/app/warCouncil/warCouncilActionBar.css; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count; (Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\ActionBar.tsx).Count; (Get-Content src\app\warCouncil\BuffLoadoutPanel.tsx).Count; (Get-Content src\app\warCouncil\buffLabels.ts).Count`
Expected: every count is 400 or below. **A breach is fixed in this ticket, not reported** — split the offending file the way `discardHandlers.ts` and `warCouncilHand.css` were split, and re-measure.

- [x] **Step 6: Run the felt's whole spec folder and typecheck**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 6 — Final verification

No production changes. Only cumulative sanity checks.

### Task 10: Confirm the pure-core boundary still holds ✓

- Skill: none — verification only, no code written

**Files:**
- (no files changed)

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Confirm `src/hunt/` is still free of `Math.random()`**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits.

### Task 11: Confirm no stale name and no retired vocabulary survives ✓

- Skill: none — verification only, no code written

**Files:**
- (no files changed)

- [x] **Step 1: Confirm the old state field and the deleted components have no readers left**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "ApplyDamagePlate|DiscardPlate|wc-apply-|wc-discard-|state\.apPool"`
Expected: zero hits.

- [x] **Step 2: Confirm the retired vocabulary did not creep into the new copy**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Envenom|envenom|poison" | Where-Object { $_.Line -notmatch "CardRank" }`
Expected: zero hits.

- [x] **Step 3: Confirm every AP figure is read, never written as a literal**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "STARTING_AP\s*=|APPLY_DAMAGE_AP_COST\s*="`
Expected: zero hits (both are read-only imports in `src/app/`; their declarations live in `src/hunt/apConfig.ts`).

### Task 12: Static gates and the full suite ✓

- Skill: none — verification only, no code written

**Files:**
- (no files changed)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The **file and test counts will be lower than the 1403/107 baseline** by whatever `ApplyDamagePlate.test.tsx` and `DiscardPlate.test.tsx` contributed, and higher by the seven new spec files — that is expected, not a regression.

- [x] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --check src/hunt/buffActivation.ts src/hunt/index.ts src/App.tsx src/app/warCouncilMount.ts src/app/warCouncil/*.ts src/app/warCouncil/*.tsx src/app/warCouncil/*.css src/app/warCouncil/__tests__/*.ts src/app/warCouncil/__tests__/*.tsx src/hunt/__tests__/buffActivation.priced.test.ts`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not a gate for this contract.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 13: Record what a browser would have checked ✓

- Skill: none — documentation of an un-run verification

**Files:**
- Modify: `.claude/sprint-runs/2026-08-23-sprint/log.md`

- [x] **Step 1: Append the browser-check list to this ticket's log section**

The browser pass is **off** for this run, so the following went **unverified by anything**. jsdom has no layout engine, so no test in this contract can substitute for any of it. Record it verbatim under `## DLR-114 — Pre-hand loadout action bar`:

1. **The shell still does not scroll with a fourth grid row**, at 1280×800, 1024×768, 1366×768 and 390×844. The bar's `auto` row plus the hand's `auto` row must both fit while `.wc-table`'s `1fr` shrinks. This is the single highest-risk unverified claim in the ticket.
2. **The hand fan is not cropped or overlapped** by the bar at the short viewports above.
3. **The loadout panel does not overflow the felt** when the pile is large — the panel's own `max-height` / `overflow-y` must scope the scroll to the panel, never to the page.
4. **Every CSS custom property the new stylesheet references resolves**, rather than silently falling back: `--wc-brass`, `--wc-brass-dim`, `--wc-alarm`, `--wc-chalk`, `--wc-chalk-dim`, `--wc-chamber-lift`, `--wc-serif`, `--wc-ui-transition-ms`. All are declared in `warCouncil.css`, which the mount still imports — but that import order is exactly what a deleted stylesheet can break.
5. **No orphaned rule survives** the deletion of `warCouncilApplyDamage.css` and `warCouncilDiscard.css` — the felt rail must not leave a gap or a stray divider where four plates used to sit.
6. **A clean console** on mount, on opening the loadout, on activating a buff, and on pressing Apply Damage.
7. **The queued-payout note is legible on the button's face** rather than clipped by the button's own bounds.
8. **The four bar buttons meet the 44×44px hit-area floor** at the smallest viewport.

### Task 14: Update the PR description ✓

- Skill: none — documentation

**Files:**
- Create: `.claude/contract/DLR-114-pre-hand-loadout-action-bar/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include: a link to `plan.md` in this folder; a summary of the change; every item from the File map's *Developer decides or observes*; every item from Task 13's browser-check list; the verification results from Phase 6; and a one-line note for future contributors that `RoundUiState` now has exactly one AP pool (`buffActivation.apPool`) and that `activatableBuffs` is the mandatory filter before any call to `apCostOf` on an owned pile.

---

## Self-review

**Spec coverage:**
- AC1 (one bar replacing the separate rails) — Tasks 8, 9.
- AC2 (Apply Buff opens the pile, shows each cost and the remaining AP, activates one or more) — Tasks 1, 2, 4, 5, 7.
- AC3 (Cards greyed until a card is selected, then highlighted) — Task 8, and the integration assertion in Task 9 Step 4.
- AC4 (Swap = today's discard, rules unchanged, relocated) — Task 8; no reducer branch changes, which Task 9's spec confirms end to end.
- AC5 (Apply Damage shows its AP cost and a queued-payout indicator with tricks remaining) — Tasks 6, 8.
- AC6 (component tests query by accessible role and label) — Tasks 7, 8, 9, each of which forbids class names and test ids explicitly.
- `plan.md` In-scope: the pure `Unassigned` filter — Task 1. The unified AP pool — Task 2. The pile reaching the felt — Task 3. The per-trick window — Task 4. The copy — Tasks 5, 6. The panel and bar — Tasks 7, 8. The rail retirement and the fourth grid row — Task 9.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact assertion list, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `isPricedBuff`, `activatableBuffs`, `LoadoutSelection`, `RoundUiState.buffs`, `RoundUiState.buffActivation`, `RoundUiState.loadout`, `RoundUiActionKind.ToggleLoadout` / `.CancelLoadout` / `.TapBuff`, `loadoutOpen`, `offeredBuffs`, `handleToggleLoadout`, `handleCancelLoadout`, `handleTapBuff`, `loadoutRefusalFor`, `openWindowOnTrickResolved`, `buffName`, `buffConditionSentence`, `buffRewardPhrase`, `buffLine`, `buffRowAccessibleName`, `BUFF_FAMILY_WORD`, `BUFF_CONDITION_SENTENCE`, `BUFF_REWARD_SUFFIX`, `BUFF_ACTIVATION_REFUSAL_MESSAGE`, `ACTION_BAR_LABEL`, `APPLY_BUFF_LABEL`, `CARDS_LABEL`, `SWAP_LABEL`, `LOADOUT_PANEL_LABEL`, `LOADOUT_EMPTY_MESSAGE`, `applyBuffAccessibleName`, `cardsAccessibleName`, `queuedPayoutText`, `applyDamageBarAccessibleName`, `WarCouncilMountProps.buffs` and `RoundUiSeed.buffs` are each spelled identically in `plan.md` Part 2 → Data shapes and in every task that references them.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: a pure addition with no consumer.
- Phase 2 ends type-checking: the state field is renamed together with all seven of its readers in one task, and the new mount prop is added together with all six of its call sites in the next.
- Phase 3 ends type-checking: the three action variants and their three reducer cases land together, so the non-defaulted `switch` stays exhaustive.
- Phase 4 ends type-checking: two self-contained label modules with their own specs and no consumer yet.
- Phase 5 ends type-checking: the two new components, their mount, the shell's fourth row and the six deletions land in one task, so no phase boundary leaves a deleted component still imported.
- Phase 6 changes no production file.
