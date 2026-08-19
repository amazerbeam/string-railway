# Tasks: Envenom — the poison consumable and the delayed-hit rule

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-18

**Goal:** Add a 2-coin one-time-use consumable that marks one card in the player's hand, so the trick that card is played into pays 4 damage to whichever side won it at the deal of the next hand — with the Quarry-side clean loss replaced rather than added to, and the queued hit discarded if the fight ends first.

**Spec:** `plan.md` in this folder.

**Layout and interaction reference:** `mockup.html` in this folder, approved at the plan gate. **Cite it for interaction grammar and rail placement only.** The developer noted at the gate that its visuals read too differently from the live app — so **appearance comes from the live stylesheets** (`warCouncilCheats.css` for the charge plate, `warCouncilCards.css` for the card mark, `shop.css` for the purse cell), never from the mockup's colours, sizes, or spacing. What the mockup settles: the charge plate sits in the felt rail beneath the Cheat rail; the stage cycle is one tap to select, a second to arm, a third to give the charge back; while armed every card in hand becomes tappable including illegal ones; the mark is a small badge that does not collide with the skull mark.

---

## File map

**Created:**

- `src/hunt/__tests__/envenom.test.ts` — the whole hunt-layer mechanic: the queue, its payment, encounter/run-boundary discard, and the purchase
- `src/warCouncil/envenom.ts` — `isEnvenomed`, `trickIsEnvenomed`, `envenomCard`; the marker's engine module, deliberately separate from `skulls.ts`
- `src/warCouncil/__tests__/envenom.test.ts` — marker membership, the trick discriminator, `envenomCard`'s guards
- `src/app/warCouncil/roundUiState.ts` — the reducer's state, seed, action and selection types plus `createRoundUiState`, `cheatArmed`, `envenomArmed`; extracted so `roundReducer.ts` stays under budget
- `src/app/warCouncil/roundHint.ts` — `deriveHint`, extracted from `WarCouncilRound.tsx`
- `src/app/warCouncil/__tests__/roundHint.test.ts` — the hint cascade's priority order, its first unit test
- `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts` — the stage cycle, the marking branch, mutual exclusion with the Cheat, and the queue write
- `src/app/warCouncil/EnvenomCharge.tsx` — the charge plate in the felt rail
- `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx` — its three stages, its accessible names, `Escape`, and the interactive gate
- `src/app/warCouncil/warCouncilEnvenom.css` — the charge plate's styles, mirroring `warCouncilCheats.css`
- `src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx` — the end-to-end marking path on the mounted felt

**Modified:**

- `src/hunt/config.ts` — add `ENVENOM_PRICE`, `ENVENOM_DAMAGE`
- `src/hunt/index.ts` — export the two keys, the three encounter functions, `beginNextHand`
- `src/hunt/shop.ts` — `ShopItem.Envenom`, `SHOP_ITEMS`, `priceOf`, `categoryOf`
- `src/hunt/types.ts` — `EncounterState.pendingEnvenom`
- `src/hunt/encounter.ts` — `NO_PENDING_ENVENOM`, `queueEnvenom`, `applyPendingEnvenom`, `hasPendingEnvenom`; `startEncounter` seeds the queue
- `src/hunt/run.ts` — `RunState.envenomCharges`, `startRun`, `buyFromShop` made explicitly total, `recordEncounter`'s fourth parameter, `beginNextHand`
- `src/hunt/__tests__/config.test.ts` — the two new keys
- `src/hunt/__tests__/shop.test.ts` — `SHOP_ITEMS` now three members; Envenom's price and rung
- `src/hunt/__tests__/run.test.ts` — 3 `EncounterState` literals, ~20 `recordEncounter` call sites
- `src/warCouncil/types.ts` — `RoundState.envenomedCards`
- `src/warCouncil/deal.ts` — seed `envenomedCards: []`
- `src/warCouncil/bank.ts` — `TrickFacts`, `TrickResolution.envenomTarget`, the replaced-`CleanLoss` rule
- `src/warCouncil/playCard.ts:106-111` — pass the fifth fact
- `src/warCouncil/index.ts` — export the envenom module and `TrickFacts`
- `src/warCouncil/__tests__/bank.test.ts` — 14 `resolveTrickBank` call sites, plus the new rule's cases
- `src/warCouncil/__tests__/playCard.test.ts` — base literal, plus a marked-trick case
- `src/warCouncil/__tests__/{abilities,cpuPlayer,legalMoves,legalMovesQuarry,quarryIntent,types}.test.ts` — base `RoundState` literals
- `src/app/warCouncil/roundReducer.ts` — types moved out; envenom handlers, actions, and the queue write in
- `src/app/warCouncil/PlayingCard.tsx` — the `envenomed` prop and its mark
- `src/app/warCouncil/labels.ts` — `cardAccessibleName`'s `marks` object, the envenom copy
- `src/app/warCouncil/HandFan.tsx` — `envenomedCards`, `envenomArmed`
- `src/app/warCouncil/TrickWell.tsx` — `envenomedCards` pass-through
- `src/app/warCouncil/AbilityPrompt.tsx` — `envenomedCards` pass-through
- `src/app/warCouncil/DecreePile.tsx` — `envenomed` pass-through
- `src/app/warCouncil/WarCouncilRound.tsx` — the charge plate, the props, `deriveHint` imported
- `src/app/warCouncil/warCouncilCards.css` — `.wc-venom-mark`
- `src/app/warCouncil/__tests__/roundFixture.ts` — `envenomedCards: []` on `makeRound`, plus `envenomChargesFixture`
- `src/app/warCouncil/__tests__/{roundReducer,roundReducer.bank,labels,TrickWell,CheatSlots,PlayingCard,BankMeter}.test.*` and `__tests__/WarCouncilRound{,.duelHealthBars}.test.tsx` — import paths, `RoundState`/`TrickResolution` literals, new mount props
- `src/app/warCouncilMount.ts` — `envenomCharges` on the props and on the result
- `src/App.tsx` — `beginNextHand`, the fourth `recordEncounter` argument, the refusals record, the two new props
- `src/app/run/shopLabels.ts` — Envenom's name and blurb, `SHOP_ENVENOM_LABEL`
- `src/app/run/ShopPanel.tsx` — the `envenomCharges` purse cell
- `src/app/run/__tests__/shopLabels.test.ts`, `src/app/run/__tests__/ShopPanel.test.tsx` — the third item, the new cell

**Deleted:** *(none)*

**Developer decides or observes:**

- **Nothing on screen says the delayed hit landed.** After this contract the 4 damage arrives between hands and the hearts simply start lower. Judge it by playing; the two costed options are one mount prop plus a line in the hint cascade (~15 lines) or a beat on the status band. Not built here — no AC asks for it and the surface is a visual call.
- **The marker glyph and its position.** `⚗` is a placeholder beside the skull's `☠`. Judge whether both marks stay legible on a card carrying each, and whether the badge reads at a glance in the fan.
- **Whether three taps to mark a card feels deliberate rather than fiddly** (Envenom → Envenom → card, then the usual two to play it).
- **Whether the felt rail reads well with a second consumable plate** beneath the Cheat rail, at the viewport sizes you play at.
- **Whether a marked trick the player wins that is *also* a skull trick should still cost the skull's damage** on top of the delayed hit. Implemented as "yes" — the harshest reading of a case no AC names.
- **Whether Envenom charges should have a cap.** Implemented as "no cap; coins are the limiter". A cap is a config key, one `refusalFor` clause, and a `PurchaseRefusal` code.
- **All placeholder copy:** `SHOP_ITEM_NAME[Envenom]`, `SHOP_ITEM_BLURB[Envenom]`, `SHOP_ENVENOM_LABEL`, `VENOM_MARK_LABEL`, `ENVENOM_RAIL_LABEL`, `ENVENOM_EMPTY_LABEL`, `ENVENOM_POISED_HINT`, `ENVENOM_ARMED_HINT`, and `envenomAccessibleName`'s wording.
- **Whether 2 coins is the right price** against a 1-coin Cheat and 1 coin per fight won. Transcribed from `version-4-scope.md`, so nothing is blocked — but it is a play-test question.

---

## Phase 1 — The hunt layer: two keys, a third shop item, and the delayed-hit queue

Everything in this phase is pure TypeScript inside the lint-enforced DOM-free `src/hunt/**` tree. The boundary is a safe stopping point because each task changes a shape *together with every reader the audit found*, so the tree type-checks at the end of every task rather than only at the end of the phase. Two tasks reach outside `src/hunt/` — T2 into `shopLabels.ts` and `App.tsx`, T4 into `App.tsx` — and both do so **only** because those files hold exhaustive readers of a shape being widened; leaving them for a later phase would end this phase not type-checking.

### Task 1: Add `ENVENOM_PRICE` and `ENVENOM_DAMAGE` to `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts` — append after `HEAL_HEALTH_RESTORED` (currently the last shop key, around line 224)
- Modify: `src/hunt/index.ts` — add both names to the `from './config'` export block
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Add the two keys, with their transcription attributed**

Append to `src/hunt/config.ts` immediately after `HEAL_HEALTH_RESTORED`:

```ts
// DLR-90 AC1 — the Envenom price. TRANSCRIBED from version-4-scope.md's own heading ("2 coins"),
// which prices it at twice Poison Guard's cost because unlike Guard this is a guaranteed,
// unconditional hit rather than insurance against a risk. NOT chosen here and NOT a tuning value
// open today. A separate key from CHEAT_PRICE and HEAL_PRICE for the reason those two are already
// separate: re-pricing one item must not move another.
// UNIT: coins per purchase.
export const ENVENOM_PRICE: Coins = 2

// DLR-90 AC4 — the delayed hit. TRANSCRIBED: version-4-scope.md states the 4 is "the same figure
// the doc already uses for 'one fight's worth of damage' (the-hunt.md §9) and for the shop's own
// Heal", so poison reads on a scale the player already knows rather than a new one. Equal to
// HEAL_HEALTH_RESTORED today BY DESIGN, and deliberately its OWN key — the two are the same number
// for a stated reason, not the same value, and they must be able to move apart.
// UNIT: health points, applied once, to one side, at the start of the following hand.
export const ENVENOM_DAMAGE: Damage = 4
```

`Coins` and `Damage` are both already imported at the top of `config.ts` — no import change.

- [x] **Step 2: Export both from the module barrel**

In `src/hunt/index.ts`, add `ENVENOM_PRICE,` and `ENVENOM_DAMAGE,` to the existing `export { … } from './config'` block, beside `HEAL_HEALTH_RESTORED`.

- [x] **Step 3: Assert both keys, and the stated relationship between the damage and the heal**

Append to `src/hunt/__tests__/config.test.ts` (add `ENVENOM_PRICE`, `ENVENOM_DAMAGE` to the existing `from '../config'` import list):

```ts
describe('Envenom constants (DLR-90 AC1, AC4)', () => {
  it('prices Envenom at the transcribed 2 coins', () => {
    expect(ENVENOM_PRICE).toBe(2)
  })

  it('sets the delayed hit to the transcribed 4', () => {
    expect(ENVENOM_DAMAGE).toBe(4)
  })

  // Not a tautology: version-4-scope.md justifies the 4 by pointing at the Heal, so a future edit
  // that moves one without deciding about the other should surface here rather than silently
  // decoupling a figure the design doc tied together.
  it('matches the shop’s Heal, which is where the design doc took the figure from', () => {
    expect(ENVENOM_DAMAGE).toBe(HEAL_HEALTH_RESTORED)
  })

  it('costs more than the Cheat, per the design doc’s pricing argument', () => {
    expect(ENVENOM_PRICE).toBeGreaterThan(CHEAT_PRICE)
  })
})
```

- [x] **Step 4: Verify**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and the new `describe` block's 4 tests passing; `typecheck` exits 0.

### Task 2: Put `ShopItem.Envenom` on the one-time-use rung, with every exhaustive reader ✓

- Skill: `react-frontend`

This is the mandatory single-task shape for a name-bound shape change: `ShopItem` is a `Record` key in four total maps and a `switch` subject in two functions, so the member and **every** reader change together. Splitting them would end this task with `shopLabels.ts` and `App.tsx` not compiling.

**Files:**

- Modify: `src/hunt/shop.ts` — `ShopItem`, `SHOP_ITEMS`, `priceOf`, `categoryOf`
- Modify: `src/app/run/shopLabels.ts` — `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`
- Modify: `src/App.tsx:181-184` — the `refusals` object literal
- Test: `src/hunt/__tests__/shop.test.ts`, `src/app/run/__tests__/shopLabels.test.ts`, `src/app/run/__tests__/ShopPanel.test.tsx`

- [x] **Step 1: Add the member, list it, price it, and shelve it**

In `src/hunt/shop.ts`:

```ts
import { CHEAT_PRICE, CHEAT_SLOT_COUNT, ENVENOM_PRICE, HEAL_PRICE } from './config'

export const ShopItem = {
  Cheat: 'cheat',
  Envenom: 'envenom',
  Heal: 'heal',
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** DLR-90 — three now. THE statement of the catalogue: a screen maps this, it never lists the
 *  items itself. Envenom sits beside the Cheat because both are one-time use. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Cheat, ShopItem.Envenom, ShopItem.Heal]
```

Add one case to each total `switch`:

```ts
// in priceOf
    case ShopItem.Envenom:
      return ENVENOM_PRICE

// in categoryOf — DLR-90 AC1: the one-time-use rung, which DLR-89 built for exactly this.
    case ShopItem.Envenom:
      return ShopCategory.OneTimeUse
```

**Leave `refusalFor` untouched.** Envenom falls through both item-specific guards to the coin check, which is the correct rule: there is no cap on charges held. Do not add a clause and do not add a `PurchaseRefusal` code.

- [x] **Step 2: Add the copy to both total `Record`s**

In `src/app/run/shopLabels.ts` — the blurb interpolates `ENVENOM_DAMAGE`, never a literal `4`, so re-tuning the key cannot leave the screen quoting a figure the engine no longer uses (add `ENVENOM_DAMAGE` to the existing `from '../../hunt'` import):

```ts
export const SHOP_ITEM_NAME: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'Cheat',
  [ShopItem.Envenom]: 'Envenom',
  [ShopItem.Heal]: 'Heal',
}

export const SHOP_ITEM_BLURB: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'A card for a slot. Play it later to ignore follow-suit.',
  [ShopItem.Envenom]: `Poison a card in your hand. Whoever wins the trick it is played into takes ${ENVENOM_DAMAGE} damage next hand.`,
  [ShopItem.Heal]: `Restore ${HEAL_HEALTH_RESTORED} health, now. Anything over your maximum is lost.`,
}
```

- [x] **Step 3: Add the third entry to `App.tsx`'s refusals record**

In `src/App.tsx`, inside the `<ShopPanel … />` props:

```tsx
        refusals={{
          [ShopItem.Cheat]: refusalFor(stock, ShopItem.Cheat),
          [ShopItem.Envenom]: refusalFor(stock, ShopItem.Envenom),
          [ShopItem.Heal]: refusalFor(stock, ShopItem.Heal),
        }}
```

- [x] **Step 4: Update the catalogue assertions and add Envenom's own**

In `src/hunt/__tests__/shop.test.ts`, replace the `SHOP_ITEMS` assertion at line 29-31 (it currently reads "holds exactly the two members") and extend the `priceOf` / `categoryOf` blocks (add `ENVENOM_PRICE` to the `from '../config'` import):

```ts
describe('SHOP_ITEMS', () => {
  it('holds exactly the three members, one-time use first', () => {
    expect(SHOP_ITEMS).toEqual([ShopItem.Cheat, ShopItem.Envenom, ShopItem.Heal])
  })
})

// add inside the existing `priceOf` describe
  it('reads ENVENOM_PRICE for Envenom', () => {
    expect(priceOf(ShopItem.Envenom)).toBe(ENVENOM_PRICE)
  })

// add inside the existing `categoryOf` describe
  it('shelves Envenom on the one-time-use rung (AC1)', () => {
    expect(categoryOf(ShopItem.Envenom)).toBe(ShopCategory.OneTimeUse)
  })

// add a new describe — the no-cap decision, pinned so a later cap is a deliberate edit
describe('refusalFor — Envenom (DLR-90)', () => {
  it('refuses only for coins: there is no cap on charges held', () => {
    expect(refusalFor(stock({ coins: ENVENOM_PRICE }), ShopItem.Envenom)).toBeNull()
    expect(refusalFor(stock({ coins: ENVENOM_PRICE - 1 }), ShopItem.Envenom)).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })

  it('is unaffected by full Cheat slots, which are the Cheat’s cap and not a shared one', () => {
    expect(refusalFor(stock({ cheatCount: CHEAT_SLOT_COUNT }), ShopItem.Envenom)).toBeNull()
  })
})
```

Also assert the rung's contents grew, inside the existing `SHOP_ITEMS_BY_CATEGORY` describe:

```ts
  it('puts both one-time-use items on that rung, in catalogue order', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.OneTimeUse]).toEqual([
      ShopItem.Cheat,
      ShopItem.Envenom,
    ])
  })
```

- [x] **Step 5: Fix any label or panel spec that counted the items**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts src/app/run/__tests__/ShopPanel.test.tsx`
Expected: any failure here is a spec asserting a two-item catalogue or a two-card shelf. Update the count or the expected list to three (and two on the one-time-use shelf) — **do not** change production code to satisfy an outdated count. Re-run until 0 failed.

- [x] **Step 6: Verify**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts src/app/run/__tests__/shopLabels.test.ts src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: all three specs report 0 failed; `typecheck` exits 0 — in particular no `Property '[ShopItem.Envenom]' is missing` error remains anywhere.

### Task 3: Add the delayed-hit queue to `EncounterState` ✓

- Skill: `react-frontend`

`pendingEnvenom` is a **required** field, matching `damageEventsApplied` and `winner`. Required is deliberate — `plan.md`'s audit records that "required → optional makes every consumer's assumption wrong" is exactly the loss this avoids — so the field and all four construction sites the audit found change in this one task.

**Files:**

- Modify: `src/hunt/types.ts` — `EncounterState`
- Modify: `src/hunt/encounter.ts` — `NO_PENDING_ENVENOM`, `startEncounter`, `applyDamage`'s return, the three new functions
- Modify: `src/hunt/index.ts` — export `NO_PENDING_ENVENOM`, `queueEnvenom`, `applyPendingEnvenom`, `hasPendingEnvenom`
- Modify: `src/hunt/__tests__/run.test.ts:263-291` — the 3 `EncounterState` literals
- Test: `src/hunt/__tests__/envenom.test.ts` (create)

- [x] **Step 1: Write the failing spec for the queue's four behaviours**

Create `src/hunt/__tests__/envenom.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ENVENOM_DAMAGE, PLAYER_START_HEALTH, quarryHealthForEncounter } from '../config'
import {
  applyDamage,
  applyPendingEnvenom,
  hasPendingEnvenom,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  queueEnvenom,
  startEncounter,
} from '../encounter'
import { DuelSide } from '../types'

describe('startEncounter — the queue opens empty (AC7)', () => {
  it('seeds pendingEnvenom to zeros on both sides', () => {
    expect(startEncounter(0).pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('reports nothing pending', () => {
    expect(hasPendingEnvenom(startEncounter(0))).toBe(false)
  })
})

describe('queueEnvenom — booking the hit (AC3)', () => {
  it('books ENVENOM_DAMAGE against the Quarry', () => {
    const queued = queueEnvenom(startEncounter(0), DuelSide.Quarry)
    expect(queued.pendingEnvenom[DuelSide.Quarry]).toBe(ENVENOM_DAMAGE)
    expect(queued.pendingEnvenom[DuelSide.Player]).toBe(0)
  })

  it('books ENVENOM_DAMAGE against the player — the symmetric case (AC6)', () => {
    const queued = queueEnvenom(startEncounter(0), DuelSide.Player)
    expect(queued.pendingEnvenom[DuelSide.Player]).toBe(ENVENOM_DAMAGE)
    expect(queued.pendingEnvenom[DuelSide.Quarry]).toBe(0)
  })

  it('accumulates, so two marked tricks in one hand both land', () => {
    const twice = queueEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry), DuelSide.Quarry)
    expect(twice.pendingEnvenom[DuelSide.Quarry]).toBe(ENVENOM_DAMAGE * 2)
  })

  it('books both sides independently', () => {
    const both = queueEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry), DuelSide.Player)
    expect(both.pendingEnvenom).toEqual({
      [DuelSide.Player]: ENVENOM_DAMAGE,
      [DuelSide.Quarry]: ENVENOM_DAMAGE,
    })
  })

  it('does not touch health, and does not count as a damage event', () => {
    const fresh = startEncounter(0)
    const queued = queueEnvenom(fresh, DuelSide.Quarry)
    expect(queued.health).toEqual(fresh.health)
    expect(queued.damageEventsApplied).toBe(fresh.damageEventsApplied)
  })

  it('discards the booking on an already-resolved encounter (AC7)', () => {
    const dead = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    })
    expect(isEncounterResolved(dead)).toBe(true)
    expect(queueEnvenom(dead, DuelSide.Quarry)).toBe(dead)
  })

  it('never mutates its input', () => {
    const fresh = startEncounter(0)
    queueEnvenom(fresh, DuelSide.Quarry)
    expect(fresh.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })
})

describe('applyPendingEnvenom — paying the hit (AC4)', () => {
  it('takes ENVENOM_DAMAGE off the queued side and clears the queue', () => {
    const paid = applyPendingEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry))
    expect(paid.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - ENVENOM_DAMAGE)
    expect(paid.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(paid.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('hits the player on the symmetric case (AC6)', () => {
    const paid = applyPendingEnvenom(queueEnvenom(startEncounter(0), DuelSide.Player))
    expect(paid.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - ENVENOM_DAMAGE)
  })

  it('counts as exactly one damage event however many sides are owed', () => {
    const both = queueEnvenom(queueEnvenom(startEncounter(0), DuelSide.Quarry), DuelSide.Player)
    expect(applyPendingEnvenom(both).damageEventsApplied).toBe(both.damageEventsApplied + 1)
  })

  it('can resolve the encounter, and the winner is derived not assumed', () => {
    // A player on ENVENOM_DAMAGE health exactly is emptied by the hit.
    const thin = startEncounter(0, ENVENOM_DAMAGE)
    const paid = applyPendingEnvenom(queueEnvenom(thin, DuelSide.Player))
    expect(paid.health[DuelSide.Player]).toBe(0)
    expect(paid.winner).toBe(DuelSide.Quarry)
  })

  it('clamps rather than going negative, discarding the surplus', () => {
    const thin = startEncounter(0, 1)
    expect(applyPendingEnvenom(queueEnvenom(thin, DuelSide.Player)).health[DuelSide.Player]).toBe(0)
  })

  it('returns the input object identically when nothing is owed', () => {
    const fresh = startEncounter(0)
    expect(applyPendingEnvenom(fresh)).toBe(fresh)
  })

  it('returns the input object identically on a resolved encounter (AC7)', () => {
    const dead = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    })
    expect(applyPendingEnvenom(dead)).toBe(dead)
  })
})
```

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts`
Expected: the file fails to collect — `applyPendingEnvenom`, `queueEnvenom`, `hasPendingEnvenom` and `NO_PENDING_ENVENOM` do not exist yet. That collection error, not a test failure, is the expected result of this step.

- [x] **Step 2: Add the field to `EncounterState`**

In `src/hunt/types.ts`, inside `EncounterState`, after `winner`:

```ts
  /** DLR-90 AC3/AC4/AC7 — damage owed to each side at the START OF THE NEXT HAND, keyed by the
   *  side it is APPLIED TO, exactly as `IncomingDamage` is and for exactly its reason: the
   *  `PlayerSide` -> `DuelSide` crossing is performed once, in `bank.ts`, and a dealer-keyed
   *  record would let a caller deplete the wrong bar and produce plausible numbers forever.
   *
   *  An ACCUMULATOR rather than a single side, so two marked tricks in one hand — or one on each
   *  side — need no second field and no branch. `startEncounter` seeds it to zeros, which is what
   *  discards it at an encounter boundary (AC7) with no explicit clear step to forget; that is
   *  why this lives here and not on `RunState`. */
  readonly pendingEnvenom: IncomingDamage
```

- [x] **Step 3: Seed and carry the field, and add the three functions**

In `src/hunt/encounter.ts` — import `ENVENOM_DAMAGE` from `./config`:

```ts
/** Nothing owed. Shared and only ever spread from, never assigned into — its `IncomingDamage`
 *  type is deeply `readonly`, the same discipline `duelHealthBars.ts`'s `NO_BREAKING` uses. */
export const NO_PENDING_ENVENOM: IncomingDamage = {
  [DuelSide.Player]: 0,
  [DuelSide.Quarry]: 0,
}
```

`startEncounter`'s returned object gains `pendingEnvenom: NO_PENDING_ENVENOM`. `applyDamage`'s returned object gains `pendingEnvenom: encounter.pendingEnvenom` — it carries the queue through untouched, because a trick's own damage neither pays nor cancels a booking.

Then, after `isEncounterResolved`:

```ts
/** Whether anything is owed. ONE statement, so a queue check and a payment cannot disagree about
 *  whether there is work to do. */
export function hasPendingEnvenom(encounter: EncounterState): boolean {
  return (
    encounter.pendingEnvenom[DuelSide.Player] > 0 || encounter.pendingEnvenom[DuelSide.Quarry] > 0
  )
}

/**
 * AC3 — book `ENVENOM_DAMAGE` against one side, to be paid at the deal of the next hand.
 *
 * Returns the encounter UNCHANGED when it is already resolved: that is AC7's other half, for the
 * marked trick whose own damage emptied a bar. NEVER throws — the reducer calls this during an
 * event handler, and a throw there unmounts the tree.
 */
export function queueEnvenom(encounter: EncounterState, target: DuelSide): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return {
    ...encounter,
    pendingEnvenom: {
      ...encounter.pendingEnvenom,
      [target]: encounter.pendingEnvenom[target] + ENVENOM_DAMAGE,
    },
  }
}

/**
 * AC4 — pay whatever is owed, once, and clear the queue. ONE `applyDamage` call over the
 * accumulated record, so a hit on either side or on both needs no branch and AC6's symmetry is
 * structural rather than a mirrored rule.
 *
 * Returns the INPUT OBJECT IDENTICALLY when nothing is owed or the encounter is already resolved.
 * That identity is load-bearing: `beginNextHand` reads it to skip a state write, and it also keeps
 * `damageEventsApplied` from bumping for an all-zero event.
 */
export function applyPendingEnvenom(encounter: EncounterState): EncounterState {
  if (isEncounterResolved(encounter) || !hasPendingEnvenom(encounter)) return encounter
  return {
    ...applyDamage(encounter, encounter.pendingEnvenom),
    pendingEnvenom: NO_PENDING_ENVENOM,
  }
}
```

- [x] **Step 4: Export the four names**

In `src/hunt/index.ts`, extend the encounter export line:

```ts
export {
  startEncounter,
  applyDamage,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  hasPendingEnvenom,
  queueEnvenom,
  applyPendingEnvenom,
} from './encounter'
```

- [x] **Step 5: Fix the three `EncounterState` literals in `run.test.ts`**

`src/hunt/__tests__/run.test.ts` builds an `EncounterState` by hand at lines 263-266, 275-278 and 287-290. Add `pendingEnvenom: NO_PENDING_ENVENOM` to each (importing `NO_PENDING_ENVENOM` from `../encounter`). These are the only hand-built `EncounterState` literals in the repo — every other site goes through `startEncounter` or `applyDamage`.

- [x] **Step 6: Verify**

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: all three specs report 0 failed — the 18 new tests pass and the pre-existing encounter and run specs pass unedited apart from the three literals; `typecheck` exits 0.

### Task 4: Hold the charge on `RunState` and pay the hit at the hand boundary ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/run.ts` — `RunState.envenomCharges`, `startRun`, `recordEncounter`, `buyFromShop`, `beginNextHand`
- Modify: `src/hunt/index.ts` — export `beginNextHand`
- Modify: `src/App.tsx:124` — the fourth `recordEncounter` argument (minimal; Task 15 completes it)
- Modify: `src/hunt/__tests__/run.test.ts` — ~20 `recordEncounter` call sites
- Test: `src/hunt/__tests__/envenom.test.ts`

- [x] **Step 1: Write the failing spec for the purchase, the carry, and the hand boundary**

Append to `src/hunt/__tests__/envenom.test.ts` (extend its imports with `ENVENOM_PRICE`, `COINS_PER_ENCOUNTER_WIN` from `../config`, `ShopItem` from `../shop`, and `advanceRun`, `beginNextHand`, `buyFromShop`, `recordEncounter`, `RunOutcome`, `startRun` from `../run`):

```ts
/** A run holding `coins`, at fight 0. */
const funded = (coins: number) => ({ ...startRun(), coins })

describe('buyFromShop — Envenom (AC1, AC2)', () => {
  it('opens a run with no charges held', () => {
    expect(startRun().envenomCharges).toBe(0)
  })

  it('credits a charge and debits the price', () => {
    const after = buyFromShop(funded(3), ShopItem.Envenom)
    expect(after.envenomCharges).toBe(1)
    expect(after.coins).toBe(3 - ENVENOM_PRICE)
  })

  it('does NOT heal — the regression the third item exposed', () => {
    const hurt = { ...funded(3), encounter: startEncounter(0, PLAYER_START_HEALTH - 3) }
    const after = buyFromShop(hurt, ShopItem.Envenom)
    expect(after.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 3)
  })

  it('does NOT add a Cheat', () => {
    expect(buyFromShop(funded(3), ShopItem.Envenom).cheats).toEqual([])
  })

  it('stacks, because there is no cap', () => {
    const twice = buyFromShop(buyFromShop(funded(10), ShopItem.Envenom), ShopItem.Envenom)
    expect(twice.envenomCharges).toBe(2)
  })

  it('throws rather than taking payment it cannot honour', () => {
    expect(() => buyFromShop(funded(ENVENOM_PRICE - 1), ShopItem.Envenom)).toThrow(RangeError)
  })
})

describe('recordEncounter and advanceRun — the charge is run state (AC2)', () => {
  it('adopts the charge count the hand handed back', () => {
    const run = buyFromShop(funded(3), ShopItem.Envenom)
    const after = recordEncounter(run, run.encounter, run.cheats, 0)
    expect(after.envenomCharges).toBe(0)
  })

  it('carries an unspent charge across a fight boundary', () => {
    const run = buyFromShop(funded(3), ShopItem.Envenom)
    const won = recordEncounter(
      run,
      { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player },
      run.cheats,
      run.envenomCharges,
    )
    expect(advanceRun(won).envenomCharges).toBe(1)
  })
})

describe('beginNextHand — the hit lands at the deal (AC4, AC7)', () => {
  it('pays a queued hit off the Quarry and clears the queue', () => {
    const run = startRun()
    const queued = { ...run, encounter: queueEnvenom(run.encounter, DuelSide.Quarry) }
    const dealt = beginNextHand(queued)
    expect(dealt.encounter.health[DuelSide.Quarry]).toBe(
      quarryHealthForEncounter(0) - ENVENOM_DAMAGE,
    )
    expect(hasPendingEnvenom(dealt.encounter)).toBe(false)
  })

  it('pays a queued hit off the player on the symmetric case (AC6)', () => {
    const run = startRun()
    const queued = { ...run, encounter: queueEnvenom(run.encounter, DuelSide.Player) }
    expect(beginNextHand(queued).encounter.health[DuelSide.Player]).toBe(
      PLAYER_START_HEALTH - ENVENOM_DAMAGE,
    )
  })

  it('returns the run object identically when nothing is queued', () => {
    const run = startRun()
    expect(beginNextHand(run)).toBe(run)
  })

  it('is idempotent — a second call pays nothing, because the queue is cleared', () => {
    const run = startRun()
    const once = beginNextHand({ ...run, encounter: queueEnvenom(run.encounter, DuelSide.Quarry) })
    expect(beginNextHand(once)).toBe(once)
  })

  it('re-derives the run outcome, so a delayed kill ends the run (AC4)', () => {
    // A player on exactly ENVENOM_DAMAGE health is emptied by the hit, and the Quarry wins.
    const thin = { ...startRun(ENVENOM_DAMAGE), encounter: startEncounter(0, ENVENOM_DAMAGE) }
    const queued = { ...thin, encounter: queueEnvenom(thin.encounter, DuelSide.Player) }
    const dealt = beginNextHand(queued)
    expect(dealt.encounter.winner).toBe(DuelSide.Quarry)
    expect(dealt.outcome).toBe(RunOutcome.Lost)
  })

  it('re-derives a won encounter mid-run as still in progress, not won', () => {
    const run = startRun()
    const queued = {
      ...run,
      encounter: queueEnvenom(
        { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: ENVENOM_DAMAGE } },
        DuelSide.Quarry,
      ),
    }
    const dealt = beginNextHand(queued)
    expect(dealt.encounter.winner).toBe(DuelSide.Player)
    expect(dealt.outcome).toBe(RunOutcome.InProgress)
  })
})

describe('the queue never crosses a boundary (AC7)', () => {
  it('is discarded by advanceRun, because startEncounter re-seeds it', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      queueEnvenom(
        { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
          winner: DuelSide.Player },
        DuelSide.Quarry,
      ),
      run.cheats,
      run.envenomCharges,
    )
    // The booking survives onto the recorded run — and dies the moment the next fight opens.
    expect(advanceRun(won).encounter.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })

  it('is discarded by startRun, so nothing crosses a run boundary', () => {
    expect(startRun().encounter.pendingEnvenom).toEqual(NO_PENDING_ENVENOM)
  })
})
```

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts`
Expected: collection error — `beginNextHand` and `RunState.envenomCharges` do not exist yet.

- [x] **Step 2: Add the field and open a run with none held**

In `src/hunt/run.ts`, inside `RunState` after `coins`:

```ts
  /** DLR-90 AC2 — Envenom charges held, bought in the shop and carried across every fight by
   *  `advanceRun`'s spread. A COUNT, not a list of objects like `cheats`: unlike a Cheat, a charge
   *  has no identity to spend by name — the card it marks IS the identity, and it lives on
   *  `RoundState.envenomedCards`. No cap; the price is the limiter. NEVER persisted, exactly as
   *  `coins` above. */
  readonly envenomCharges: number
```

`startRun`'s returned object gains `envenomCharges: 0`.

- [x] **Step 3: Make `buyFromShop` explicitly total, and credit the charge**

The existing function returns the heal as an **unconditional fallback**, so a third item silently heals. Replace the tail of `buyFromShop` (from `const paid = …` to the end) with an exhaustive `switch`:

```ts
  const paid = { ...run, coins: run.coins - priceOf(item) }
  // A `switch` with no `default`, so a FOURTH item is a compile error here rather than an item
  // that silently does whatever the last branch happened to do. That is not hypothetical: before
  // DLR-90 this function returned the heal unconditionally as its fallback, so adding Envenom
  // without this restructuring would have healed the player and type-checked cleanly.
  switch (item) {
    case ShopItem.Cheat:
      return {
        ...paid,
        cheats: addCheat(run.cheats, { id: run.nextCheatId }),
        nextCheatId: run.nextCheatId + 1,
      }
    case ShopItem.Envenom:
      return { ...paid, envenomCharges: run.envenomCharges + 1 }
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
  }
```

- [x] **Step 4: Take the charge count back through `recordEncounter`**

Add a **required** fourth parameter, and adopt it in the returned object beside `cheats`:

```ts
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
): RunState {
```

```ts
  return {
    ...run,
    encounter,
    cheats,
    envenomCharges,
    coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN : run.coins,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
```

Extend the existing docblock's `cheats` paragraph to cover both: `envenomCharges` is REQUIRED for the reason already stated there — a second transition the caller must remember to make beside this one is the transition that eventually gets forgotten.

- [x] **Step 5: Add `beginNextHand`**

After `advanceRun` in `src/hunt/run.ts`, importing `applyPendingEnvenom` from `./encounter`:

```ts
/**
 * DLR-90 AC4 — the delayed poison hit, paid at the deal of the next hand and NOWHERE else.
 *
 * TOTAL and THROW-FREE, unlike every other transition in this module. Those throw because they are
 * only ever reached deliberately; this one is on the common path, called before every hand whether
 * anything is owed or not, and returns the run object IDENTICALLY when the queue is empty — which
 * is what lets the driver skip a state write and makes a second call a no-op.
 *
 * Re-derives `outcome` through the same private `outcomeFor` every other transition uses, so a
 * delayed kill ends the fight and the run exactly the way any other killing blow does rather than
 * through a second reading of the same rule.
 *
 * Deliberately NOT folded into `advanceRun`: that crosses an ENCOUNTER boundary, where AC7 says the
 * queue is discarded. This crosses a HAND boundary, which is the only place it is paid.
 */
export function beginNextHand(run: RunState): RunState {
  const encounter = applyPendingEnvenom(run.encounter)
  if (encounter === run.encounter) return run
  return {
    ...run,
    encounter,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
}
```

Add `beginNextHand,` to the `export { … } from './run'` block in `src/hunt/index.ts`.

- [x] **Step 6: Update every `recordEncounter` call site**

In `src/hunt/__tests__/run.test.ts`, add a fourth argument to each of the ~20 calls (lines 66, 71, 80, 82, 91, 98, 103, 110, 117, 124, 133, 141, 152, 162, 170, 185, 194, 263, 275, 287). Pass `run.envenomCharges` — or the local run variable's field — so each spec asserts the pass-through rather than a magic number.

In `src/App.tsx:124`, pass the run's current count for now:

```tsx
    const next = recordEncounter(run, result.encounter, result.cheats, run.envenomCharges)
```

This is deliberately a placeholder so this phase ends type-checking: `WarCouncilRoundResult` has no `envenomCharges` field until Task 14. **Task 15 changes this to `result.envenomCharges`** — until then a charge spent during a hand is not yet given back to the run, which is why no phase before 4 claims the feature works end to end.

- [x] **Step 7: Verify**

Run: `npx vitest run src/hunt; npm run typecheck`
Expected: every spec under `src/hunt/__tests__/` reports 0 failed; `typecheck` exits 0. `src/hunt/` is now feature-complete for this contract.

---

## Phase 2 — The card engine: the marker and the replaced outcome

The mark and the rule it triggers, all inside the DOM-free `src/warCouncil/**` tree. This is a safe stopping point because the engine is self-consistent at the end of it and every app-side consumer still compiles — the two required-field additions (`RoundState.envenomedCards`, `TrickResolution.envenomTarget`) each change every construction site in the same task, including the app-side spec literals the audit found. Nothing in the app *uses* the marker yet, which is correct: Phase 3 wires it.

### Task 5: Add the marker to `RoundState` and its engine module ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/envenom.ts`
- Modify: `src/warCouncil/types.ts` — `RoundState.envenomedCards`
- Modify: `src/warCouncil/deal.ts:24-38` — seed `envenomedCards: []`
- Modify: `src/warCouncil/index.ts` — export the module
- Modify: `src/app/warCouncil/__tests__/roundFixture.ts:16-52` — `envenomedCards: []` on `makeRound`
- Modify: `src/warCouncil/__tests__/abilities.test.ts`, `cpuPlayer.test.ts`, `legalMoves.test.ts`, `legalMovesQuarry.test.ts`, `playCard.test.ts`, `quarryIntent.test.ts`, `types.test.ts` — the base `RoundState` literal in each
- Modify: `src/app/warCouncil/__tests__/roundReducer.test.ts`, `roundReducer.bank.test.ts`, `WarCouncilRound.test.tsx`, `WarCouncilRound.duelHealthBars.test.tsx` — only where a full literal is built rather than `makeRound` spread
- Test: `src/warCouncil/__tests__/envenom.test.ts` (create)

- [x] **Step 1: Write the failing spec for the marker**

Create `src/warCouncil/__tests__/envenom.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { envenomCard, isEnvenomed, trickIsEnvenomed } from '../envenom'
import { PlayerSide, Suit, type Card, type RoundState, type TrickCard } from '../types'
import { dealRound } from '../deal'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })
const played = (side: PlayerSide, c: Card): TrickCard => ({ side, card: c })

/** A real dealt hand, so the specs cannot drift from what `dealRound` actually produces. */
const dealt = (): RoundState => dealRound(PlayerSide.Cpu, () => 0.5)

describe('isEnvenomed', () => {
  it('matches on suit AND rank together', () => {
    const marked = [card(Suit.Bells, 4)]
    expect(isEnvenomed(marked, card(Suit.Bells, 4))).toBe(true)
    expect(isEnvenomed(marked, card(Suit.Keys, 4))).toBe(false)
    expect(isEnvenomed(marked, card(Suit.Bells, 5))).toBe(false)
  })

  it('is false against an empty list', () => {
    expect(isEnvenomed([], card(Suit.Bells, 4))).toBe(false)
  })
})

describe('trickIsEnvenomed (AC3)', () => {
  const marked = [card(Suit.Bells, 4)]

  it('is true when the player’s card carries the mark', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Bells, 4)),
    ]
    expect(trickIsEnvenomed(marked, trick)).toBe(true)
  })

  it('is true when the mark arrived on the opponent’s card — it tests the trick, not a seat', () => {
    const trick = [played(PlayerSide.Cpu, card(Suit.Bells, 4))]
    expect(trickIsEnvenomed(marked, trick)).toBe(true)
  })

  it('is false for a trick of unmarked cards', () => {
    const trick = [
      played(PlayerSide.Cpu, card(Suit.Keys, 6)),
      played(PlayerSide.Player, card(Suit.Keys, 9)),
    ]
    expect(trickIsEnvenomed(marked, trick)).toBe(false)
  })

  it('is false for an empty trick', () => {
    expect(trickIsEnvenomed(marked, [])).toBe(false)
  })
})

describe('envenomCard (AC2)', () => {
  it('opens every dealt hand with no marks', () => {
    expect(dealt().envenomedCards).toEqual([])
  })

  it('marks a card held by that side', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const after = envenomCard(state, PlayerSide.Player, target)
    expect(after.envenomedCards).toEqual([target])
    expect(isEnvenomed(after.envenomedCards, target)).toBe(true)
  })

  it('leaves the hand, the skulls and the bank untouched', () => {
    const state = dealt()
    const after = envenomCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(after.hands).toEqual(state.hands)
    expect(after.skulledCards).toEqual(state.skulledCards)
    expect(after.bank).toBe(state.bank)
    expect(after.multiplier).toBe(state.multiplier)
  })

  it('never mutates its input', () => {
    const state = dealt()
    envenomCard(state, PlayerSide.Player, state.hands[PlayerSide.Player][0])
    expect(state.envenomedCards).toEqual([])
  })

  it('accumulates a second mark', () => {
    const state = dealt()
    const [first, second] = state.hands[PlayerSide.Player]
    const twice = envenomCard(envenomCard(state, PlayerSide.Player, first), PlayerSide.Player, second)
    expect(twice.envenomedCards).toEqual([first, second])
  })

  it('throws when the card is not in that side’s hand', () => {
    const state = dealt()
    const theirs = state.hands[PlayerSide.Cpu][0]
    expect(() => envenomCard(state, PlayerSide.Player, theirs)).toThrow(RangeError)
  })

  it('throws rather than double-marking, so a charge cannot be spent for nothing', () => {
    const state = dealt()
    const target = state.hands[PlayerSide.Player][0]
    const once = envenomCard(state, PlayerSide.Player, target)
    expect(() => envenomCard(once, PlayerSide.Player, target)).toThrow(RangeError)
  })
})
```

Run: `npx vitest run src/warCouncil/__tests__/envenom.test.ts`
Expected: collection error — `../envenom` does not exist.

- [x] **Step 2: Add the field to `RoundState`**

In `src/warCouncil/types.ts`, inside `RoundState` immediately after `skulledCards`:

```ts
  /** DLR-90 AC2 — cards the player has marked with Envenom this hand. Written by `envenomCard`
   *  and carried by every state spread thereafter, exactly as `skulledCards` above is, so a mark
   *  cannot appear or vanish mid-hand and a card that changes hands keeps it — which is what
   *  `trickIsEnvenomed` tests against.
   *
   *  A WHOLLY SEPARATE list from `skulledCards`, and nothing whatever to do with
   *  `CardRank.Poison`: the-hunt.md §1 records that rank 8's name is an ordinary card with no rule
   *  and no connection to the skull. That is why nothing in this feature is called `poison`.
   *
   *  Hand-scoped by construction: `dealRound` rebuilds this, so a mark cannot leak into the next
   *  hand. With `HAND_SIZE` cards and that many tricks every dealt card is played, so a mark
   *  normally resolves in the hand it was made — the exception being a card the Woodcutter buries
   *  or the Fox exchanges away and never takes back, which simply wastes the charge. */
  readonly envenomedCards: readonly Card[]
```

- [x] **Step 3: Create the engine module**

Create `src/warCouncil/envenom.ts`:

```ts
import { containsCard } from './cardUtils'
import type { Card, PlayerSide, RoundState, TrickCard } from './types'

/**
 * The Envenom marker. A SEPARATE module from `skulls.ts` on purpose: DLR-90 states poison is a
 * wholly separate marker from a skull, and two markers sharing a helper is how they stop being
 * separate. Nothing here reads `skulledCards` and nothing there reads `envenomedCards`.
 */

/** Membership by suit and rank together, which identifies a card uniquely across the deck. */
export function isEnvenomed(envenomedCards: readonly Card[], card: Card): boolean {
  return containsCard(envenomedCards, card)
}

/**
 * AC3's discriminator: a trick is marked iff ANY card played into it is marked.
 *
 * Tests the TRICK rather than a seat, for the reason `trickIsSkulled` gives about skulls: the Fox
 * can exchange a marked card into the decree and the player's Fox can later take that decree into
 * hand, so a marked card can be played by either side within one hand. Testing the trick survives
 * that path with no special case.
 */
export function trickIsEnvenomed(
  envenomedCards: readonly Card[],
  trick: readonly TrickCard[],
): boolean {
  return trick.some((play) => isEnvenomed(envenomedCards, play.card))
}

/**
 * AC2 — the mark.
 *
 * THROWS rather than returning the state unchanged, the discipline `cheats.ts`'s `addCheat` sets
 * and for its reason: a silent no-op would let the caller spend a charge for a mark that was never
 * made. The reducer guards BOTH conditions before calling — a reducer must not throw, because a
 * throw during an event handler unmounts the tree — so reaching either throw is a driver bug.
 */
export function envenomCard(state: RoundState, side: PlayerSide, card: Card): RoundState {
  if (!containsCard(state.hands[side], card)) {
    throw new RangeError(
      `Cannot poison the ${card.rank} of ${card.suit} — it is not in the ${side}'s hand`,
    )
  }
  if (isEnvenomed(state.envenomedCards, card)) {
    throw new RangeError(`The ${card.rank} of ${card.suit} is already poisoned`)
  }
  return { ...state, envenomedCards: [...state.envenomedCards, card] }
}
```

- [x] **Step 4: Seed the field in `dealRound` and export the module**

In `src/warCouncil/deal.ts`, add to the returned object immediately after `skulledCards`:

```ts
    // DLR-90 — a fresh deal carries no marks. Written here rather than defaulted on the type, so
    // `RoundState` stays a total shape with no optional field for a reader to forget about.
    envenomedCards: [],
```

In `src/warCouncil/index.ts`, add:

```ts
export { isEnvenomed, trickIsEnvenomed, envenomCard } from './envenom'
```

- [x] **Step 5: Add the field to every hand-built `RoundState` literal**

Run: `npm run typecheck`
Expected: a list of `Property 'envenomedCards' is missing` errors. Add `envenomedCards: [],` to each reported literal. The base literal in `src/app/warCouncil/__tests__/roundFixture.ts` covers every spec that uses `makeRound`, so fix that one first and re-run — the remaining errors are the per-file bases in `src/warCouncil/__tests__/` plus any full literal built inline in an app-side spec. Re-run until `typecheck` exits 0.

- [x] **Step 6: Verify**

Run: `npx vitest run src/warCouncil; npm run typecheck`
Expected: every spec under `src/warCouncil/__tests__/` reports 0 failed, including the new `envenom.test.ts`; `typecheck` exits 0.

### Task 6: Make a marked trick replace the clean loss, in `resolveTrickBank` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/bank.ts` — `TrickFacts`, `TrickResolution.envenomTarget`, `resolveTrickBank`
- Modify: `src/warCouncil/index.ts` — export the `TrickFacts` type
- Modify: `src/warCouncil/__tests__/bank.test.ts` — the 14 call sites, plus the new rule's cases
- Modify: `src/app/warCouncil/__tests__/BankMeter.test.tsx:16`, `roundReducer.test.ts:118`, `TrickWell.test.tsx:23` — the three `TrickResolution` literals
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Write the failing spec for the replaced outcome and the target**

Append to `src/warCouncil/__tests__/bank.test.ts` (add `DuelSide` from `../../hunt` to its imports):

```ts
/** The four facts, defaulted to an ordinary unmarked non-final trick. */
const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  envenomTrick: false,
  ...over,
})

describe('resolveTrickBank — a marked trick (DLR-90 AC3, AC5, AC6)', () => {
  const streak = { bank: 3, multiplier: 3 }

  it('AC5 — a clean loss the Quarry won costs no health and does not cash the bank', () => {
    const r = resolveTrickBank(streak, facts({ envenomTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.damageToPlayer).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.bank).toBe(3)
    expect(r.multiplier).toBe(3)
  })

  it('AC5 — the bank does not CLIMB either; the trick is replaced, not taken', () => {
    expect(resolveTrickBank(streak, facts({ envenomTrick: true })).bankAdded).toBe(0)
  })

  it('AC5 — the Quarry is the side owed the delayed hit', () => {
    expect(resolveTrickBank(streak, facts({ envenomTrick: true })).envenomTarget).toBe(
      DuelSide.Quarry,
    )
  })

  it('AC6 — a marked trick the player won is an ORDINARY clean win, with no special branch', () => {
    const marked = resolveTrickBank(streak, facts({ playerWon: true, envenomTrick: true }))
    const plain = resolveTrickBank(streak, facts({ playerWon: true }))
    expect(marked.outcome).toBe(TrickOutcome.CleanWin)
    expect(marked.bank).toBe(plain.bank)
    expect(marked.multiplier).toBe(plain.multiplier)
    expect(marked.bankAdded).toBe(plain.bankAdded)
    expect(marked.cashOut).toBe(plain.cashOut)
    expect(marked.damageToPlayer).toBe(plain.damageToPlayer)
  })

  it('AC6 — and the player is the side owed the delayed hit', () => {
    expect(
      resolveTrickBank(streak, facts({ playerWon: true, envenomTrick: true })).envenomTarget,
    ).toBe(DuelSide.Player)
  })

  it('leaves a DODGE alone — the Quarry won it, but the player BANKS it', () => {
    const marked = resolveTrickBank(streak, facts({ skullTrick: true, envenomTrick: true }))
    const plain = resolveTrickBank(streak, facts({ skullTrick: true }))
    expect(marked.outcome).toBe(TrickOutcome.Dodge)
    expect(marked.bankAdded).toBe(1)
    expect(marked.bank).toBe(plain.bank)
    expect(marked.multiplier).toBe(plain.multiplier)
    expect(marked.envenomTarget).toBe(DuelSide.Quarry)
  })

  it('still charges a SKULL the player chose to eat, on top of the delayed hit', () => {
    const r = resolveTrickBank(streak, facts({ playerWon: true, skullTrick: true, envenomTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.SkullWin)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.cashOut).toBe(9)
    expect(r.envenomTarget).toBe(DuelSide.Player)
  })

  it('AC5 on the final trick — the PRESERVED bank still cashes at hand end', () => {
    const r = resolveTrickBank(streak, facts({ envenomTrick: true, finalTrick: true }))
    expect(r.cashOut).toBe(9)
    expect(r.cashedAtHandEnd).toBe(true)
    expect(r.damageToPlayer).toBe(0)
    expect(r.bank).toBe(0)
  })

  it('reports no target on an unmarked trick', () => {
    expect(resolveTrickBank(streak, facts()).envenomTarget).toBeNull()
    expect(resolveTrickBank(streak, facts({ playerWon: true })).envenomTarget).toBeNull()
  })
})
```

- [x] **Step 2: Convert the 14 existing call sites to the parameter object**

Rewrite each `resolveTrickBank(before, a, b, c)` call in `src/warCouncil/__tests__/bank.test.ts` (lines 32, 42, 43, 52, 63, 64, 74, 76, 81, 89, 100, 102, 110, 115) using the `facts()` helper from Step 1 — e.g. `resolveTrickBank(START, true, false, false)` becomes `resolveTrickBank(START, facts({ playerWon: true }))`. Assertions are unchanged: this is a call-shape change, not a behaviour change, and every pre-existing expectation must still hold.

- [x] **Step 3: Add `TrickFacts`, the field, and the rule**

In `src/warCouncil/bank.ts`:

```ts
/**
 * The four facts about a completed trick that decide its whole effect on the bank, the streak and
 * both bars.
 *
 * A parameter object rather than four positional booleans, introduced on DLR-90 when the fourth
 * became a fifth: `resolveTrickBank(START, true, false, false, false)` is unreadable at the call
 * site, and a transposed pair of booleans type-checks cleanly and produces plausible numbers.
 */
export interface TrickFacts {
  readonly playerWon: boolean
  /** Any card played into the trick carries a skull (§3.2). */
  readonly skullTrick: boolean
  /** The last trick of the hand, so AC8's end-of-hand cash applies. */
  readonly finalTrick: boolean
  /** DLR-90 AC3 — any card played into the trick carries the Envenom mark. */
  readonly envenomTrick: boolean
}
```

Add to `TrickResolution`:

```ts
  /** DLR-90 AC3/AC6 — the side owed `ENVENOM_DAMAGE` at the start of the next hand, or `null` when
   *  the trick carried no mark. Keyed by the side the damage will be APPLIED TO, and typed
   *  `DuelSide` rather than `PlayerSide` deliberately: this module is already THE one crossing
   *  between the two vocabularies (see `incomingFrom` below), so the reducer receives a side it
   *  hands straight to `queueEnvenom` with no second crossing to get backwards. */
  readonly envenomTarget: DuelSide | null
```

Change the signature and add the rule:

```ts
export function resolveTrickBank(before: BankState, trick: TrickFacts): TrickResolution {
  const outcome = trickOutcomeFor(trick.playerWon, trick.skullTrick)

  let bank = before.bank
  let multiplier = before.multiplier
  let bankAdded = 0
  let cashOut = 0
  let damageToPlayer = 0

  // AC5 — REPLACED, not added to. A marked trick the Quarry won CLEANLY costs the player nothing:
  // no health lost, and the bank and multiplier survive uncashed even though this is a loss by the
  // normal rules. That is the item's whole point — it gives a card the player already expects to
  // lose with a reason to be played instead of being dead weight.
  //
  // Keyed on `CleanLoss` rather than on "the Quarry won" DELIBERATELY: a Dodge is also a trick the
  // Quarry won, and it is one the player BANKS, so treating every Quarry win as replaced would zero
  // a `bankAdded` the player had already earned. `CleanLoss` is the only outcome where a Quarry win
  // costs the player anything, so it is the only one with something to replace.
  //
  // AC6 needs no counterpart and gets none: a marked trick the player wins is already a `CleanWin`
  // and falls through to the ordinary branch below, banking 1 and climbing the multiplier. The
  // delayed hit is symmetric because `envenomTarget` follows the WINNER, not a mirrored rule.
  const replaced = trick.envenomTrick && outcome === TrickOutcome.CleanLoss

  if (isTaken(outcome)) {
    bankAdded = 1
    bank += bankAdded
    multiplier += 1
  } else if (!replaced) {
    cashOut = bank * multiplier
    damageToPlayer = DAMAGE_PER_HIT
    bank = 0
    multiplier = 0
  }

  const handEndCash = trick.finalTrick ? bank * multiplier : 0
  if (trick.finalTrick) {
    cashOut += handEndCash
    bank = 0
    multiplier = 0
  }

  return {
    outcome,
    bankAdded,
    cashOut,
    damageToPlayer,
    bank,
    multiplier,
    cashedAtHandEnd: handEndCash > 0,
    // The PHYSICAL winner of a marked trick, crossed to `DuelSide` here and only here.
    envenomTarget: trick.envenomTrick
      ? trick.playerWon
        ? DuelSide.Player
        : DuelSide.Quarry
      : null,
  }
}
```

Update the existing `finalTrick` paragraph in the docblock: exactly one of the two cash-outs can still fire, and a *replaced* clean loss now cashes neither — it leaves the bank standing for `finalTrick` or for a later trick to cash.

In `src/warCouncil/index.ts`, add `TrickFacts` to the type export beside `TrickResolution`.

- [x] **Step 4: Add the field to the three app-side `TrickResolution` literals**

Run: `npm run typecheck`
Expected: three `Property 'envenomTarget' is missing` errors at `src/app/warCouncil/__tests__/BankMeter.test.tsx:16`, `roundReducer.test.ts:118`, `TrickWell.test.tsx:23`. Add `envenomTarget: null,` to each. Re-run until `typecheck` exits 0.

- [x] **Step 5: Verify**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts; npm run typecheck`
Expected: 0 failed — every pre-existing bank assertion still holds through the call-shape change, and the 9 new cases pass; `typecheck` exits 0.

### Task 7: Hand the fifth fact down from `playCard` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/playCard.ts:104-111` — the `resolveTrickBank` call
- Test: `src/warCouncil/__tests__/playCard.test.ts`
- Test: `src/warCouncil/__tests__/playCard.envenom.test.ts` (create, IMPLEMENTER DEVIATION — see note
  below the tasks)

- [x] **Step 1: Write the failing spec — an end-to-end marked trick through the engine**

Append to `src/warCouncil/__tests__/playCard.test.ts` (importing `envenomCard` from `../envenom` and `DuelSide` from `../../hunt`; use the file's existing base-state helper):

```ts
describe('playCard — a marked trick reaches the bank rule (DLR-90 AC3)', () => {
  it('reports the target on the resolution, and replaces a clean loss', () => {
    // The player follows with a card that loses cleanly, having marked it first.
    const marked = envenomCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    const result = playCard(marked, PlayerSide.Player, losingFollowCard)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const resolution = result.state.lastResolution
    expect(resolution?.envenomTarget).toBe(DuelSide.Quarry)
    expect(resolution?.damageToPlayer).toBe(0)
    expect(result.state.bank).toBe(marked.bank)
    expect(result.state.multiplier).toBe(marked.multiplier)
  })

  it('reports no target for an unmarked trick, leaving every existing rule alone', () => {
    const result = playCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.lastResolution?.envenomTarget).toBeNull()
    expect(result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('carries the mark through the state spread, so it survives the trick', () => {
    const marked = envenomCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    const result = playCard(marked, PlayerSide.Player, losingFollowCard)
    if (!result.ok) return
    expect(result.state.envenomedCards).toEqual(marked.envenomedCards)
  })
})
```

Build `baseWithBank` and `losingFollowCard` from the file's existing fixture shape: a state with a non-zero `bank` and `multiplier`, a Quarry lead already on the table, and a player card of the led suit that loses to it. If the existing fixture cannot express that, add a local `const` in this `describe` rather than reshaping the file's shared base.

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: the two `envenomTarget` assertions fail with `undefined` — `playCard` is not passing the fact yet.

DEVIATION (Implementer, Phase 2): appending this block pushed `playCard.test.ts` to 442 lines,
over the project's 400-line file budget. Split into a new sibling
`src/warCouncil/__tests__/playCard.envenom.test.ts` with its own small local `stateWith`, in the
same change, per `react-frontend`'s file-size MUST. `playCard.test.ts` is back to 396 lines; the
new file is 81. Also observed: because `playCard.ts`'s call to `resolveTrickBank` still used the
pre-Task-6 four-positional-argument shape, running the new spec before Step 2 failed THREE tests,
not the two `envenomTarget` assertions predicted — the stale call passed its second positional
argument (a bare boolean) as the whole `TrickFacts` parameter, so every trick resolved as
`CleanLoss` regardless of who actually won, breaking two pre-existing assertions in
`playCard.test.ts` as a side effect. Confirmed the failure was this call-shape issue (not a new
defect) before proceeding to Step 2.

- [x] **Step 2: Pass the fact**

In `src/warCouncil/playCard.ts`, import `trickIsEnvenomed` from `./envenom` and replace the `resolveTrickBank` call:

```ts
  // Every rule AC4-AC9 states lives in `resolveTrickBank`, and DLR-90's AC5 with them; this
  // function decides nothing about the outcome, it only reports the four facts about the trick.
  const lastResolution = resolveTrickBank(
    { bank: next.bank, multiplier: next.multiplier },
    {
      playerWon: winner === PlayerSide.Player,
      skullTrick: trickIsSkulled(next.skulledCards, completedTrick),
      finalTrick,
      envenomTrick: trickIsEnvenomed(next.envenomedCards, completedTrick),
    },
  )
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/warCouncil; npm run typecheck`
Expected: every spec under `src/warCouncil/__tests__/` reports 0 failed; `typecheck` exits 0. The engine is now feature-complete.

---

## Phase 3 — The reducer: split it, then teach it the selection

`roundReducer.ts` sits at **382 lines** against a blocking 400-line budget, so the two extractions come first and are pure moves with no behaviour change — which is what makes them safe to stop after. Task 8 and Task 9 each end with the whole app compiling and every existing spec passing unedited apart from its import lines; Task 10 then adds the selection with room to spare.

### Task 8: Extract the reducer's state and action types into `roundUiState.ts` ✓

- Skill: `react-frontend`

A pure move. Nothing changes behaviour — if any spec's *assertions* need editing in this task, something has been moved wrongly.

**Files:**

- Create: `src/app/warCouncil/roundUiState.ts`
- Modify: `src/app/warCouncil/roundReducer.ts` — remove the moved declarations, import what it still needs
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`, `CheatSlots.tsx`, `labels.ts`, `TrickWell.tsx` — import paths
- Modify: `src/app/warCouncil/__tests__/roundReducer.test.ts`, `roundReducer.bank.test.ts`, `CheatSlots.test.tsx`, `labels.test.ts`, `TrickWell.test.tsx`, `WarCouncilRound.test.tsx` — import paths
- Test: no new spec — the existing six specs passing unedited apart from imports **is** the verification

- [x] **Step 1: Move the declarations verbatim**

Create `src/app/warCouncil/roundUiState.ts` and move these from `roundReducer.ts`, docblocks and all, unchanged: `ResolvedTrick`, `CheatStage`, `CheatSelection`, `RoundUiState`, `RoundUiSeed`, `CpuFault`, `RoundUiActionKind`, `RoundUiAction`, `createRoundUiState`, `cheatArmed`. Head the file:

```ts
/**
 * The felt's UI state, its seed, its actions, and the pure predicates over it — everything the
 * reducer operates ON, separated from the reducer that operates on it.
 *
 * Split out of `roundReducer.ts` on DLR-90: that file had reached 382 of its 400-line budget
 * before Envenom's handlers were written. The seam is deliberate rather than arbitrary — this file
 * is what a COMPONENT imports (the state shape, the action kinds, the predicates it renders from),
 * and `roundReducer.ts` is the transition function nothing but the mount needs. Nothing here
 * decides anything.
 */
```

Move only the imports each declaration actually needs (`WarCouncilState`, `Card`, `AbilityChoice`, `IllegalMoveReason`, `TrickCard`, `TrickResolution`, `CheatCard`, `CheatCardId`, `EncounterState`). `roundReducer.ts` re-imports the moved names from `./roundUiState`.

- [x] **Step 2: Do NOT re-export from `roundReducer.ts`**

Every importer updates its own import instead. A barrel re-export would leave two valid paths to the same type and the next reader would not know which is canonical — the ambiguity this project's single-source-of-truth rule exists to prevent.

- [x] **Step 3: Repoint the ten importers**

Run: `npm run typecheck`
Expected: `Module '"./roundReducer"' has no exported member` errors across the four production files and six specs the audit listed. Move each named import to `./roundUiState` (or `../roundUiState` from a spec). `roundReducer` and `roundReducer`-only names (`roundReducer` itself) stay where they are. Re-run until `typecheck` exits 0.

- [x] **Step 4: Verify the move changed nothing**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: every spec under `src/app/warCouncil/__tests__/` reports 0 failed, with **no assertion edited** — only import lines. `typecheck` exits 0.

- [x] **Step 5: Confirm the budget headroom the split bought**

Run: `(Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: both well under 400 — around 250 and 150 respectively. Use `(Get-Content <path>).Count`, **not** `Measure-Object -Line`, which drops blank lines and undercounts (`.claude/workflow/web-project.md`).

### Task 9: Extract `deriveHint` into `roundHint.ts` and give it a test ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/roundHint.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx` — remove the private helper, import it
- Test: `src/app/warCouncil/__tests__/roundHint.test.ts` (create)

- [x] **Step 1: Move the function**

Create `src/app/warCouncil/roundHint.ts` holding `deriveHint` moved verbatim from the bottom of `WarCouncilRound.tsx`, with its existing docblock plus:

```ts
/**
 * Extracted from `WarCouncilRound.tsx` on DLR-90. It was always a pure function of committed
 * state, but as a private helper inside a component it could only be exercised through a renderer
 * — so a cascade with six branches had no direct test. It has one now.
 */
```

It needs `RoundUiState` and `CheatStage` from `./roundUiState`, and `cardAccessibleName`, `CHEAT_ARMED_HINT`, `CHEAT_POISED_HINT`, `ILLEGAL_MOVE_MESSAGE` from `./labels`. Remove the helper and the now-unused imports from `WarCouncilRound.tsx`, and import `deriveHint` from `./roundHint`.

- [x] **Step 2: Write the spec for the cascade's priority order**

Create `src/app/warCouncil/__tests__/roundHint.test.ts`. Build states with `createRoundUiState` over `makeRound()` and `encounterFixture` from `./roundFixture`, then override the one field each case is about. Assert, in the cascade's own order: a rejection beats everything; an open prompt beats a held trick; a held trick beats the Quarry's pending lead; an armed card names itself; a Cheat selection reports its stage; an interactive state names lead-vs-follow; and a non-interactive state with nothing selected returns `''`. Assert against the exported constants (`ILLEGAL_MOVE_MESSAGE[…]`, `CHEAT_ARMED_HINT`, `CHEAT_POISED_HINT`), never against a quoted sentence — the copy is placeholder and a spec that quotes it breaks on a rewording that is not a defect.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/roundHint.test.ts src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: both report 0 failed — the mounted-felt spec still passes unedited, proving the move changed no behaviour; `typecheck` exits 0.

### Task 10: Teach the reducer the Envenom selection and the queue write ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts` — `EnvenomStage`, two `RoundUiState` fields, `RoundUiSeed`, two action kinds, `createRoundUiState`, `envenomArmed`
- Modify: `src/app/warCouncil/roundReducer.ts` — `handleTapEnvenom`, `commitEnvenom`, the `handleTapCard` branch, `handleTapCheat`'s clear, `applyResolution`'s queue write
- Modify: `src/app/warCouncil/__tests__/roundFixture.ts` — add `envenomChargesFixture`
- Test: `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts` (create)

- [x] **Step 1: Write the failing spec**

Create `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`, seeding with `createRoundUiState({ round: makeRound(), encounter: encounterFixture, cheats: [{ id: 1 }], envenomCharges: 1 })` and dispatching through `roundReducer`. Cover:

- **The stage cycle** — one `TapEnvenom` gives `EnvenomStage.Poised`; a second gives `Armed`; a third returns `null` **with the charge count unchanged**, so a give-back spends nothing.
- **No charges** — `TapEnvenom` on a state with `envenomCharges: 0` returns the state unchanged (assert object identity).
- **The gate** — `TapEnvenom` returns the state unchanged when `resolvedTrick` is non-null, when `prompt` is non-null, when `cpuFault` is non-null, and when it is the Quarry's turn. That is `canAct`, the same gate the Cheat uses.
- **Marking** — while `Armed`, `TapCard` on a card in the player's hand adds it to `round.envenomedCards`, decrements `envenomCharges` to 0, clears `envenomStage`, and does **not** play the card (`round.currentTrick` and `tricksPlayed` unchanged).
- **Marking reaches a card that is illegal to play** — mark a card of a suit that does not follow the Quarry's lead and assert it is marked anyway. This is the behaviour `HandFan` must not block.
- **A second tap on an already-marked card** clears the stage and spends nothing, rather than throwing.
- **Mutual exclusion** — `TapEnvenom` from a state with a `cheatSelection` clears that selection; `TapCheat` from a state with an `envenomStage` clears the stage. Neither may hold both.
- **Poising drops a card armed-to-play**, so a hand-card tap is never ambiguous.
- **`CancelEnvenom`** clears the stage and spends nothing.
- **The queue write** — play a marked card into a trick the Quarry wins cleanly and assert `encounter.pendingEnvenom[DuelSide.Quarry]` is `ENVENOM_DAMAGE`, `encounter.health[DuelSide.Player]` is unchanged, and `round.bank`/`round.multiplier` are unchanged. Then the mirror: a marked trick the player wins books against `DuelSide.Player`.
- **No queue write on an unmarked trick** — `pendingEnvenom` stays at `NO_PENDING_ENVENOM`.
- **AC7 in the reducer** — a marked trick whose own cash-out empties the Quarry's bar leaves `pendingEnvenom` at zeros, because `queueEnvenom` refuses a resolved encounter.
- **The reducer never throws** — dispatch `TapCard` while `Armed` with a card that is not in hand (build the action by hand) and assert a state comes back rather than a `RangeError` escaping.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`
Expected: collection error — `EnvenomStage` and the two action kinds do not exist yet.

- [x] **Step 2: Add the stage, the state fields, the seed field, and the actions**

In `src/app/warCouncil/roundUiState.ts`:

```ts
/** AC2 — the two stages of one Envenom selection, mirroring `CheatStage` exactly because AC2 asks
 *  for the Cheat's arm/commit shape rather than a new interaction grammar. */
export const EnvenomStage = {
  /** One tap — a selection, no effect. The misclick guard: the mark is irreversible. */
  Poised: 'poised',
  /** Two taps — the next tapped hand card is MARKED rather than played. */
  Armed: 'armed',
} as const
export type EnvenomStage = (typeof EnvenomStage)[keyof typeof EnvenomStage]
```

Add to `RoundUiState`:

```ts
  /** AC2 — charges held, mirrored from the mount's opening prop and decremented as a card is
   *  marked. Run state carried for the life of the hand — the same contract `cheats` documents. */
  readonly envenomCharges: number
  /** The hand's OWN transient — dies on remount, never touches `RunState`. ONE nullable field
   *  rather than two booleans, for `CheatSelection`'s stated reason: `poised` and `armed` are
   *  stages of one selection and two fields would admit the invalid pair "poised AND armed".
   *  No id, unlike `CheatSelection` — charges are fungible, and the card marked is the identity. */
  readonly envenomStage: EnvenomStage | null
```

Add `readonly envenomCharges: number` to `RoundUiSeed`; `createRoundUiState` copies it through and seeds `envenomStage: null`. Add `TapEnvenom: 'tapEnvenom'` and `CancelEnvenom: 'cancelEnvenom'` to `RoundUiActionKind` and their two payload-free variants to `RoundUiAction`. Then:

```ts
/** `true` when the next tapped hand card should be MARKED rather than played. EXPORTED so the
 *  mount's tappability and the reducer's branch read the SAME predicate — two readings of "is
 *  Envenom armed" is exactly how a greyed card and a reducer branch drift apart. */
export function envenomArmed(state: RoundUiState): boolean {
  return state.envenomStage === EnvenomStage.Armed
}
```

- [x] **Step 3: Add the handlers and the queue write**

In `src/app/warCouncil/roundReducer.ts`, add the two `switch` cases:

```ts
    case RoundUiActionKind.TapEnvenom:
      return handleTapEnvenom(state)
    case RoundUiActionKind.CancelEnvenom:
      return state.envenomStage === null ? state : { ...state, envenomStage: null }
```

```ts
/**
 * AC2 — three outcomes on one control, mirroring `handleTapCheat`. Nothing selected poises; poised
 * arms; armed gives the charge back UNSPENT.
 *
 * Poising clears the Cheat selection and any card armed-to-play: both reinterpret a hand-card tap,
 * so allowing two at once makes the next tap ambiguous.
 */
function handleTapEnvenom(state: RoundUiState): RoundUiState {
  if (!canAct(state) || state.envenomCharges <= 0) {
    return state
  }
  if (state.envenomStage === null) {
    return { ...state, envenomStage: EnvenomStage.Poised, cheatSelection: null, armed: null }
  }
  if (state.envenomStage === EnvenomStage.Poised) {
    return { ...state, envenomStage: EnvenomStage.Armed }
  }
  return { ...state, envenomStage: null }
}

/**
 * AC2 — spend one charge to mark the tapped card.
 *
 * Guards membership, the existing mark, and the charge count BEFORE calling `envenomCard`, which
 * throws on the first two: a reducer must not throw, because a throw during an event handler
 * unmounts the tree. Exactly the shape `handleTapCheat` uses when it checks `hasCheat` before
 * `removeCheat`. A guard that fails clears the selection rather than half-applying it, so the
 * player is never left armed with no visible cause.
 *
 * Legality is deliberately NOT checked: marking is not a move, and the whole point of the item is
 * marking a card the player expects to lose with.
 */
function commitEnvenom(state: RoundUiState, tapped: Card): RoundUiState {
  const hand = state.round.hands[PlayerSide.Player]
  if (
    state.envenomCharges <= 0 ||
    !containsCard(hand, tapped) ||
    isEnvenomed(state.round.envenomedCards, tapped)
  ) {
    return { ...state, envenomStage: null }
  }
  return {
    ...state,
    round: envenomCard(state.round, PlayerSide.Player, tapped),
    envenomCharges: state.envenomCharges - 1,
    envenomStage: null,
    armed: null,
    rejection: null,
  }
}
```

In `handleTapCard`, immediately after the `canAct` guard:

```ts
  // AC2 — while armed, a hand-card tap MARKS rather than plays.
  if (envenomArmed(state)) {
    return commitEnvenom(state, tapped)
  }
```

In `handleTapCheat`, clear the other selection when a Cheat is poised — add `envenomStage: null` to the object returned on the "poise this id" branch.

Then `applyResolution`, restructured so the early return cannot skip the booking:

```ts
/**
 * AC6/AC8 — one trick's damage, applied once, as it happens — and DLR-90 AC3's booking, made in
 * the same place for the same reason: this is where a resolved trick's whole effect on the
 * encounter is stated.
 *
 * ORDER IS LOAD-BEARING. The trick's own damage lands FIRST, and `queueEnvenom` then refuses a
 * resolved encounter — which is AC7 for the case where the marked trick's own cash-out emptied a
 * bar. Booking first would carry a hit into an encounter that is already over.
 *
 * The all-zero skip still avoids bumping `damageEventsApplied` for nothing, but it no longer
 * returns early: a REPLACED clean loss (AC5) is exactly an all-zero event that still owes a hit.
 */
function applyResolution(encounter: EncounterState, resolution: TrickResolution): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  const hit =
    resolution.cashOut === 0 && resolution.damageToPlayer === 0
      ? encounter
      : applyDamage(encounter, incomingFrom(resolution))
  return resolution.envenomTarget === null ? hit : queueEnvenom(hit, resolution.envenomTarget)
}
```

Add `envenomChargesFixture = 1` to `src/app/warCouncil/__tests__/roundFixture.ts` for the mount specs that follow.

- [x] **Step 4: Verify**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: every spec under `src/app/warCouncil/__tests__/` reports 0 failed — the new envenom spec passes and every pre-existing reducer spec passes unedited except for the seed's new required field; `typecheck` exits 0.

- [x] **Step 5: Confirm the reducer is still inside budget**

Run: `(Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: both under 400. If either is over, split further in this task — do not carry a breach into the next phase.

---

## Phase 4 — The surfaces: the mark, the charge plate, and the shop shelf

Everything the player sees. Each task ends with the app compiling and its own spec passing, so any of them is a stopping point. **Appearance follows the live stylesheets, not the mockup** — `mockup.html` settles placement and interaction only, per the note at the top of this file.

### Task 11: Render the mark on `PlayingCard` and announce it ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx` — the `envenomed` prop and its mark
- Modify: `src/app/warCouncil/labels.ts` — `CardMarks`, `cardAccessibleName`, `VENOM_MARK_LABEL`
- Modify: `src/app/warCouncil/warCouncilCards.css` — `.wc-venom-mark`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx`, `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Write the failing spec**

In `src/app/warCouncil/__tests__/labels.test.ts`, convert the existing positional-boolean assertion at line 37 to the object form and add the new cases:

```ts
  it('names a skulled card', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { skulled: true })).toBe(
      '4 of Bells, skulled',
    )
  })

  it('names a poisoned card', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { envenomed: true })).toBe(
      '4 of Bells, poisoned',
    )
  })

  it('names a card carrying both marks, skull first', () => {
    expect(
      cardAccessibleName({ suit: Suit.Bells, rank: 4 }, { skulled: true, envenomed: true }),
    ).toBe('4 of Bells, skulled, poisoned')
  })

  it('names a named rank with a mark, keeping the rank name before the marks', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 }, { envenomed: true })).toBe(
      '3 of Keys (Fox), poisoned',
    )
  })
```

In `src/app/warCouncil/__tests__/PlayingCard.test.tsx`, add: an unmarked card's accessible name carries no mark wording; `envenomed` renders the mark and appears in the accessible name; a card with both props announces both; and the mark is `aria-hidden` so it is announced once, through the name, rather than twice.

- [x] **Step 2: Change the name builder**

In `src/app/warCouncil/labels.ts`, replace `cardAccessibleName`:

```ts
/** Which markers a card is carrying. An OBJECT rather than positional booleans: DLR-90 added a
 *  second marker, and `cardAccessibleName(card, true, false)` is one transposition away from
 *  announcing the wrong one — on the exact surface a player who cannot see the card depends on. */
export interface CardMarks {
  readonly skulled?: boolean
  readonly envenomed?: boolean
}

/** `marks` is optional so every call site that names an unmarked card keeps compiling unchanged;
 *  a caller that knows a card's markers passes them. Skull before poison, matching the order the
 *  two marks are drawn in. PLACEHOLDER COPY, as this file's rest is. */
export function cardAccessibleName(card: Card, marks: CardMarks = {}): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  const name = named ? `${base} (${named})` : base
  const suffix = [marks.skulled && 'skulled', marks.envenomed && 'poisoned']
    .filter(Boolean)
    .join(', ')
  return suffix ? `${name}, ${suffix}` : name
}

/** The mark's own label, beside `SKULL_MARK_LABEL`. PLACEHOLDER copy. */
export const VENOM_MARK_LABEL = 'Poisoned'
```

The user-facing word stays "poisoned" — it is what the design doc and the ticket call the state, and it reads better than "envenomed". Only *identifiers* avoid `poison`, to stay clear of `CardRank.Poison`.

- [x] **Step 3: Add the prop and the mark**

In `src/app/warCouncil/PlayingCard.tsx`, add beside `skulled`:

```ts
  /** DLR-90 AC2 — a card carrying the Envenom mark. Defaults to `false` so every existing call
   *  site keeps compiling; a caller that knows the card's state passes it. The SAME rendering path
   *  as `skulled` — one more conditional `<span>` in one component, not a second component. */
  readonly envenomed?: boolean
```

Destructure `envenomed = false`, and render after the skull mark:

```tsx
      {envenomed && (
        <span className="wc-venom-mark" aria-hidden="true">
          ⚗
        </span>
      )}
```

Update the `aria-label` to `cardAccessibleName(card, { skulled, envenomed })`.

- [x] **Step 4: Style the mark**

In `src/app/warCouncil/warCouncilCards.css`, add `.wc-venom-mark` beside the existing `.wc-skull-mark`. Take every colour, size and offset from the tokens and idioms already in that file. Two requirements: it must occupy a **different corner** from `.wc-skull-mark` so a card carrying both stays legible, and it must read in **form as well as colour** — a ringed badge rather than a bare tinted glyph — per `game-ux`'s "state reads without motion or colour alone". The glyph `⚗` and the exact hue are placeholders for the developer.

- [x] **Step 5: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: both report 0 failed; `typecheck` exits 0 — in particular no error at `PlayingCard.tsx`'s `cardAccessibleName` call.

### Task 12: Build the `EnvenomCharge` plate ✓

- Skill: `react-frontend`, and `game-ux` for its place in the rail and its keyboard contract

**Files:**

- Create: `src/app/warCouncil/EnvenomCharge.tsx`
- Create: `src/app/warCouncil/warCouncilEnvenom.css`
- Modify: `src/app/warCouncil/labels.ts` — the rail copy and `envenomAccessibleName`
- Test: `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx` (create)

- [x] **Step 1: Add the copy**

In `src/app/warCouncil/labels.ts`, beside the Cheat rail's block:

```ts
/** The Envenom plate's copy (DLR-90). PLACEHOLDER — the wording is the developer's, exactly as
 *  `CHEAT_RAIL_LABEL` and the rest of this file are. */
export const ENVENOM_RAIL_LABEL = 'Envenom'
export const ENVENOM_EMPTY_LABEL = 'No Envenom held'
export const ENVENOM_POISED_HINT = 'Tap Envenom again to arm it'
export const ENVENOM_ARMED_HINT = 'Pick a card in your hand to poison'

/** The plate's accessible name. The three stages MUST differ, and the count is in the name rather
 *  than only in the glyph — `getByRole('button', { name })` is how the spec tells them apart, and
 *  a player who cannot see the plate needs to know how many are held. */
export function envenomAccessibleName(stage: EnvenomStage | null, charges: number): string {
  if (charges <= 0) return ENVENOM_EMPTY_LABEL
  const held = `${ENVENOM_RAIL_LABEL}, ${charges} held`
  if (stage === EnvenomStage.Armed) return `${held}, armed`
  if (stage === EnvenomStage.Poised) return `${held}, selected`
  return held
}
```

Import `EnvenomStage` from `./roundUiState` beside the existing `CheatStage` import.

- [x] **Step 2: Write the failing spec**

Create `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx`, querying by role and accessible name only. Cover:

- The plate renders with `charges: 0` and is **disabled** with the empty name — the rail's shape stays stable across a purchase, so it is inert rather than absent.
- With charges and no stage, the button carries the held name and `aria-pressed="false"`.
- `stage: Poised` gives the "selected" name; `stage: Armed` gives the "armed" name and `aria-pressed="true"`.
- Clicking calls `onTap` exactly once.
- `interactive: false` renders the button disabled, and clicking it calls nothing.
- `Escape` on the container calls `onCancel` — matching the Cheat rail's and the hand fan's keyboard contract.
- **The click does not bubble.** Assert it: attach a click handler to a wrapper around the rendered plate, click the button, and expect that handler not to fire. This is load-bearing, not defensive — the plate mounts inside `.wc-table`, which fires `handleCarryOn` on click, so without `stopPropagation` arming a charge while a trick reveal is held would also clear the reveal and commit the Quarry's lead.

- [x] **Step 3: Build the component**

Create `src/app/warCouncil/EnvenomCharge.tsx`, mirroring `CheatSlots.tsx`'s structure: a labelled `role="group"` container with `onClick={(e) => e.stopPropagation()}` and an `Escape` handler, holding one button. Its docblock must state the `stopPropagation` reason as `CheatSlots.tsx`'s does. One control is far below `game-ux`'s roving-tabindex threshold, so it is a plain tab stop.

It renders the charge count as text as well as by the glyph, computes nothing, and asserts nothing about the count — `run.ts` owns that. The three stages must be distinguishable in **form** (a class per stage driving a ring and a lift), not by colour alone.

- [x] **Step 4: Style it**

Create `src/app/warCouncil/warCouncilEnvenom.css`, mirroring `warCouncilCheats.css`'s selectors and tokens so the plate sits in the rail as a sibling of the Cheat rail rather than as a visitor. The control's hit area must be at least 44×44px per `react-frontend`; use `:focus-visible`, wrap any hover state in `@media (hover: hover)` with a paired `:active`, and set `touch-action: manipulation`.

- [x] **Step 5: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/EnvenomCharge.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

### Task 13: Show the mark wherever a card renders ✓

- Skill: `react-frontend`

AC2 requires the mark visible "on that card wherever it renders, including once played". Four surfaces render a `PlayingCard`; all four get it.

**Files:**

- Modify: `src/app/warCouncil/HandFan.tsx` — `envenomedCards`, `envenomArmed`, and the tappability change
- Modify: `src/app/warCouncil/TrickWell.tsx` — `envenomedCards` pass-through
- Modify: `src/app/warCouncil/AbilityPrompt.tsx` — `envenomedCards` pass-through
- Modify: `src/app/warCouncil/DecreePile.tsx` — `envenomed` pass-through
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx`, `src/app/warCouncil/__tests__/TrickWell.test.tsx`, `src/app/warCouncil/__tests__/AbilityPrompt.test.tsx`

- [x] **Step 1: Write the failing specs**

In `HandFan.test.tsx`: a card in `envenomedCards` is announced as poisoned; with `envenomArmed: false` an illegal card is disabled as it is today; with `envenomArmed: true` **every** card in hand is enabled and tapping an illegal one calls `onTap` with that card; and with `envenomArmed: true` the roving tabindex can reach an illegal card via arrow keys — the case that would otherwise leave a keyboard-only player unable to mark the very card the item exists for.

In `TrickWell.test.tsx`: a resolved trick's marked card is announced as poisoned, and a card carrying both a skull and the mark announces both. In `AbilityPrompt.test.tsx`: a marked hand card offered as a Fox exchange or Woodcutter discard is announced as poisoned.

- [x] **Step 2: Change `HandFan`**

Add the two props:

```ts
  /** DLR-90 AC2 — the marks, so the fan can draw them. Passed rather than derived: this component
   *  computes nothing about a card's state, exactly as it takes `legal` from the engine rather
   *  than comparing suits itself. */
  readonly envenomedCards: readonly Card[]
  /** DLR-90 AC2 — a hand-card tap MARKS rather than plays. While true, every held card is a valid
   *  target INCLUDING one illegal to play: marking is not a move, and the item exists precisely to
   *  give a card the player expects to lose with a reason to be played. Read from the reducer's own
   *  `envenomArmed` predicate, never re-derived here. */
  readonly envenomArmed: boolean
```

`isFocusable` and the per-card `illegal` both change to treat every held card as available while `envenomArmed` — so `illegal` becomes `!interactive || (!envenomArmed && !containsCard(legal, card))`, and `isFocusable` drops its `containsCard` term while armed. Pass `envenomed={isEnvenomed(envenomedCards, card)}` to each `PlayingCard`. Add a class on the fan container for the marking mode so the stylesheet can distinguish "pick a card to poison" from ordinary play — presentational only, changing nothing about behaviour or the accessible tree, exactly as `wc-is-inert` already does.

- [x] **Step 3: Pass the marks through the other three**

`TrickWell` and `AbilityPrompt` take `envenomedCards?: readonly Card[]` defaulting to `[]` — mirroring `TrickWell`'s existing `skulledCards` default and for its stated reason — and pass `envenomed={isEnvenomed(envenomedCards, card)}` to every `PlayingCard`. `DecreePile` takes `envenomed?: boolean` defaulting to `false` and passes it to its one card: the Fox can exchange a marked card into the decree, so the decree plate is a place a marked card renders.

- [x] **Step 4: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx src/app/warCouncil/__tests__/TrickWell.test.tsx src/app/warCouncil/__tests__/AbilityPrompt.test.tsx; npm run typecheck`
Expected: all three report 0 failed; `typecheck` exits 0.

### Task 14: Wire the felt — mount props, the rail, and the hint ✓

- Skill: `react-frontend`, and `game-ux` for the rail's zoning

**Files:**

- Modify: `src/app/warCouncilMount.ts` — `envenomCharges` on `WarCouncilMountProps` and on `WarCouncilRoundResult`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx` — the seed, the plate, the fan's props, the well's props
- Modify: `src/app/warCouncil/roundHint.ts` — two branches for the Envenom stages
- Modify: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `WarCouncilRound.duelHealthBars.test.tsx` — the new required mount prop
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx` (create), `src/app/warCouncil/__tests__/roundHint.test.ts`

- [x] **Step 1: Write the failing end-to-end spec**

Create `src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx` — `WarCouncilRound.test.tsx` is at **396 lines** and appending would breach the budget on the first test. Mount the felt with `envenomCharges={1}` and drive it by role and accessible name only:

- The charge plate renders in the felt rail with its held name; with `envenomCharges={0}` it renders inert rather than vanishing.
- Clicking it twice puts the hint at `ENVENOM_ARMED_HINT`, and the plate reports `aria-pressed="true"`.
- With it armed, clicking a hand card announces that card as poisoned and leaves the trick unplayed — the trick counter does not move.
- With it armed, a card **illegal to play** is enabled and can be marked.
- A third click on the plate returns the hint to normal with the plate still reporting a charge held — the give-back spends nothing.
- `Escape` from the plate cancels the selection.
- Marking while a trick reveal is held is impossible (the plate is disabled), and clicking the plate while a reveal is held does **not** clear the reveal — the `stopPropagation` guard, asserted at the mount level where it actually matters.
- Playing a marked card into a trick the Quarry wins cleanly leaves the player's hearts unchanged and the bank readout standing — AC5 as the player would see it.
- `onComplete` fires with `envenomCharges` reflecting what was spent.

- [x] **Step 2: Add the mount contract**

In `src/app/warCouncilMount.ts`, add to `WarCouncilMountProps`:

```ts
  /** DLR-90 AC2 — Envenom charges held at the START of this hand. The same contract `cheats` above
   *  documents: an opening figure the reducer owns for the hand's life and hands back through
   *  `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler enumerates every mount
   *  site instead of letting one silently render an inert plate. */
  readonly envenomCharges: number
```

and to `WarCouncilRoundResult`:

```ts
  /** DLR-90 AC2 — the charges still held after this hand. One fewer for each card marked; the run
   *  adopts it through `recordEncounter`'s fourth parameter. */
  readonly envenomCharges: number
```

- [x] **Step 3: Wire the component**

In `src/app/warCouncil/WarCouncilRound.tsx`: destructure `envenomCharges` from the props and add it to the `useReducer` seed. Render `<EnvenomCharge>` in `.wc-felt-rail` after `CheatSlots`, with `charges={ui.envenomCharges}`, `stage={ui.envenomStage}`, `interactive={interactive}` — the same gate the Cheat rail and the fan use — and the two dispatches. Pass `envenomedCards={ui.round.envenomedCards}` and `envenomArmed={envenomArmed(ui)}` to `HandFan`, and `envenomedCards={ui.round.envenomedCards}` to both `TrickWell` branches and to `AbilityPrompt`. Add `envenomCharges: ui.envenomCharges` to **both** `onComplete` calls in `handleCarryOn` — missing one would silently lose a spent charge on whichever exit path was forgotten. Import the new stylesheet beside the others.

- [x] **Step 4: Add the two hint branches**

In `src/app/warCouncil/roundHint.ts`, add the Envenom stages to the cascade **above** the Cheat's branch — while marking, "pick a card to poison" is the most specific true thing, and a Cheat selection cannot coexist with it anyway:

```ts
  if (ui.envenomStage) {
    return ui.envenomStage === EnvenomStage.Armed ? ENVENOM_ARMED_HINT : ENVENOM_POISED_HINT
  }
```

Add the two cases to `roundHint.test.ts`, asserting against the exported constants and asserting the priority: a state with both an `envenomStage` and a `cheatSelection` reports the Envenom hint. (The reducer makes that pair unreachable; the test pins the cascade's stated order regardless.)

- [x] **Step 5: Add the required prop to the two existing mount specs**

Run: `npm run typecheck`
Expected: `Property 'envenomCharges' is missing` at each `<WarCouncilRound … />` in `WarCouncilRound.test.tsx` and `WarCouncilRound.duelHealthBars.test.tsx`. Pass `envenomChargesFixture` (added in Task 10) so those specs read the fixture rather than a magic number. Re-run until 0.

- [x] **Step 6: Verify**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: every spec under `src/app/warCouncil/__tests__/` reports 0 failed; `typecheck` exits 0.

- [x] **Step 7: Confirm the component is inside budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: under 400. Task 9's extraction bought the headroom; if this is over, extract the felt rail into a sibling component in this task rather than carrying a breach forward.

### Task 15: Wire the run driver ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx` — `beginNextHand`, the fourth `recordEncounter` argument, the two new props
- Test: `src/__tests__/App.test.tsx`

- [x] **Step 1: Pay the queued hit at the hand boundary, and adopt the charge count**

In `src/App.tsx`, import `beginNextHand` from `./hunt` and replace `handleComplete`:

```tsx
  function handleComplete(result: WarCouncilRoundResult) {
    const recorded = recordEncounter(run, result.encounter, result.cheats, result.envenomCharges)
    if (isEncounterResolved(recorded.encounter)) {
      setRun(recorded)
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      return // The verdict is next, not another hand — and DLR-90 AC7 discards any queued hit,
      // because `advanceRun` and `startRun` both re-seed the encounter through `startEncounter`.
    }
    // DLR-90 AC4 — the delayed hit lands HERE, at the deal of the next hand and nowhere else.
    // `beginNextHand` returns the run untouched when nothing is owed, so this is a no-op on the
    // common path.
    const next = beginNextHand(recorded)
    setRun(next)
    // The hit can end an encounter the finished hand left alive, so resolution is re-checked
    // against the run `beginNextHand` produced rather than the one recorded above.
    if (isEncounterResolved(next.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      return
    }
    dealNextHand()
  }
```

The `setRun` call moves inside the branches because the run being committed now differs between them.

- [x] **Step 2: Pass the two new props**

On `<WarCouncilRound … />` add `envenomCharges={run.envenomCharges}`. On `<ShopPanel … />` add `envenomCharges={run.envenomCharges}` (its prop lands in Task 16 — expect one typecheck error until then, and complete both before verifying this task).

- [x] **Step 3: Verify**

Run: `npx vitest run src/__tests__/App.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0. If `App.test.tsx` asserts on a purchase or a hand transition, extend it rather than working around it.

### Task 16: Put Envenom on the shop shelf and show the charges held ✓

- Skill: `react-frontend`, and `game-ux` for the purse row

Task 2 already added the item, its price, its rung, and its copy — so the shelf renders it with **no change to `ShopPanel`'s item rendering at all**, which is the DLR-89 model working as designed. All that is left is telling the player how many they hold.

**Files:**

- Modify: `src/app/run/shopLabels.ts` — `SHOP_ENVENOM_LABEL`
- Modify: `src/app/run/ShopPanel.tsx` — the `envenomCharges` prop and its purse cell
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`, `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Write the failing spec**

In `ShopPanel.test.tsx`: the purse group reports the charges held; Envenom renders on the one-time-use shelf beside the Cheat with its price read from `priceOf`; clicking it calls `onBuy` with `ShopItem.Envenom`; and a refused Envenom card is disabled with `PURCHASE_REFUSAL_MESSAGE[NotEnoughCoins]` folded into its accessible name. In `shopLabels.test.ts`: `SHOP_ITEM_BLURB[Envenom]` contains `String(ENVENOM_DAMAGE)`, so the blurb is proven to interpolate the key rather than quote a number.

- [x] **Step 2: Add the label and the prop**

In `src/app/run/shopLabels.ts`:

```ts
/** DLR-90 — the purse cell for held Envenom charges. PLACEHOLDER copy. */
export const SHOP_ENVENOM_LABEL = 'Envenom held'
```

In `src/app/run/ShopPanel.tsx`, add the prop:

```ts
  /** DLR-90 AC2 — charges held, so the player can see what they already own before buying another.
   *  A count with no denominator, unlike `cheatCount` / `cheatSlotCount`: there is no cap. */
  readonly envenomCharges: number
```

and a third `.shop-purse-cell` in the existing purse group, between the Cheat slots and the health row, reusing the existing class so `shop.css` needs no change. This component still computes nothing.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/run; npm run typecheck`
Expected: every spec under `src/app/run/__tests__/` reports 0 failed; `typecheck` exits 0. The feature is now complete end to end.

---

## Phase 5 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, plus the PR description.

### Task 17: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code written`

**Files:**

- (no file changes)

- [x] **Step 1: Grep the two protected trees for a React import or a DOM global**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage|sessionStorage|\bfetch\("`
Expected: zero hits. The recursive `Get-ChildItem … | Select-String` form is required — `Select-String -Path 'src\**\*.ts'` reaches exactly one directory level and would silently report zero hits for a name two levels down (`.claude/workflow/web-project.md`).

- [x] **Step 2: Confirm lint agrees, since the boundary is also an ESLint override**

Run: `npm run lint`
Expected: exits 0. No `eslint-disable` was added anywhere in this contract; if lint fails, fix the code, never the rule.

### Task 18: Confirm no tunable was hard-coded and no stale name remains ✓

- Skill: `none — verification greps, no code written`

**Files:**

- (no file changes)

- [x] **Step 1: Prove `ENVENOM_DAMAGE`'s and `ENVENOM_PRICE`'s values are written in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "ENVENOM_DAMAGE|ENVENOM_PRICE" | Select-String -Pattern "= *[0-9]"`
Expected: exactly two hits, both in `src\hunt\config.ts`. Every other reference reads the key by name — no screen, blurb, spec expectation or engine branch may contain the literal `4` or `2` standing for either figure.

- [x] **Step 2: Prove no identifier in this feature is named after `poison`**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "poisonedCards|pendingPoison|poisonTrick|poisonTarget|isPoisoned|poisonCard|PoisonStage"`
Expected: zero hits. `CardRank.Poison` and the user-facing word "poisoned" in copy and accessible names are correct and must remain — this grep names only the identifiers `plan.md`'s assumption rules out, so it cannot match them.

- [x] **Step 3: Prove the old `resolveTrickBank` call shape is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "resolveTrickBank\([^,]+, *(true|false)"`
Expected: zero hits — every call now passes a `TrickFacts` object, so no positional-boolean call survives.

### Task 19: Confirm every file created or grown is inside the 400-line budget ✓

- Skill: `none — a measurement, no code written`

**Files:**

- (no file changes)

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\config.ts,src\hunt\run.ts,src\hunt\encounter.ts,src\hunt\shop.ts,src\warCouncil\bank.ts,src\warCouncil\envenom.ts,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\roundHint.ts,src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\EnvenomCharge.tsx,src\app\warCouncil\HandFan.tsx,src\app\run\ShopPanel.tsx,src\App.tsx | ForEach-Object { "$((Get-Content $_.FullName).Count)`t$($_.Name)" }`
Expected: every count under 400, and any file in the 200–400 band noted in the PR description as wanting a second look. `(Get-Content <path>).Count` is the array length and therefore counts every line; **do not** use `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.

- [x] **Step 2: Measure the specs too, since three were near the cap before this contract**

Run: `Get-ChildItem src -Recurse -Include *.test.ts,*.test.tsx | ForEach-Object { "$((Get-Content $_.FullName).Count)`t$($_.FullName)" } | Sort-Object -Descending`
Expected: every spec under 400. `WarCouncilRound.test.tsx` (396 before this contract) and `roundReducer.test.ts` (379) are the two to check first — new cases were deliberately routed into new files to keep both inside the budget.

### Task 20: Static gates and the full suite ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no file changes)

- [x] **Step 1: Warm the Vite transform cache by running the two projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This step exists because a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` — a jsdom worker-*start* timeout, not a failing test, in which case the `.test.tsx` files never execute at all and the summary reports fewer files than exist (`.claude/workflow/web-project.md`). Warming first makes the next step's result trustworthy.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `0 failed` and a file count covering every spec in the repo. Quote the summary line. A **second consecutive** worker timeout is a real problem; a single cold one is infrastructure.

- [x] **Step 3: Check formatting of the files this contract touched**

Run: `npx prettier --check src/hunt src/warCouncil src/app src/App.tsx`
Expected: exits 0. Use this scoped form, not `npm run format:check` — the repo-wide check currently fails on pre-existing files under `.docs/**` that no contract here has touched, and that failure must not be "fixed" as a side effect of this work. If a touched file is unformatted, run `npx prettier --write` on that path and re-check.

Fix-pass note: ran `npx prettier --write` on the 8 contract-touched spec files the check actually reported unformatted (`src/hunt/__tests__/envenom.test.ts`, `src/hunt/__tests__/run.test.ts`, `src/warCouncil/__tests__/bank.test.ts`, `src/warCouncil/__tests__/envenom.test.ts`, `src/app/warCouncil/__tests__/CheatSlots.test.tsx`, `src/app/warCouncil/__tests__/EnvenomCharge.test.tsx`, `src/app/warCouncil/__tests__/PlayingCard.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx`) — deliberately NOT `src/warCouncil/__tests__/skulls.test.ts` or `src/app/warCouncil/__tests__/duelHealthBars.test.ts`, which no contract here has touched. Re-ran the scoped check: only those same two pre-existing files remain flagged, exit 1 for the unrelated reason `web-project.md` already names, not this contract's.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that this script runs `npm run lint` and `tsc -b` before `vite build`, so it re-gates both.

### Task 21: Write the PR description ✓

- Skill: `none — a document, no code written`

**Files:**

- Create: `.claude/contract/DLR-90-envenom-and-the-delayed-hit-rule/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- A link to `plan.md` in this folder, and to `mockup.html`.
- A summary of the change, layer by layer: two config keys; a third `ShopItem` on the one-time-use rung; the `pendingEnvenom` queue on `EncounterState` and `beginNextHand` as its single payment point; `envenomedCards` on `RoundState` with `src/warCouncil/envenom.ts`; the replaced-`CleanLoss` rule and `envenomTarget` in `bank.ts`; the reducer's selection; the charge plate and the card mark.
- **The three refactors carried by this ticket, each with its reason:** `resolveTrickBank`'s `TrickFacts` object, `cardAccessibleName`'s `marks` object, and the `roundReducer.ts` → `roundUiState.ts` + `roundHint.ts` split forced by the 400-line budget.
- **The one in-scope defect fixed:** `buyFromShop` returned the heal as an unconditional fallback, so a third shop item would have healed the player and type-checked cleanly.
- Every item from this file's "Developer decides or observes" list, verbatim — especially that **nothing on screen says the delayed hit landed**.
- The verification results from Phase 5, with the actual numbers quoted.
- A one-line note for future contributors on the two conventions introduced: identifiers in this feature never use `poison` (it is `CardRank.Poison`'s name, and the-hunt.md §1 records that as an open question), and `pendingEnvenom` is `IncomingDamage`-shaped so a second delayed effect can accumulate into it without reshaping `EncounterState`.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage — every `plan.md` "In scope" bullet maps to a task:**

- `ENVENOM_PRICE` / `ENVENOM_DAMAGE` (AC1, AC4) — Task 1.
- `ShopItem.Envenom` on the one-time-use rung, every total-`Record` reader (AC1) — Task 2.
- `RunState.envenomCharges`, carried across fights (AC2) — Task 4.
- `EncounterState.pendingEnvenom`, zeroed by `startEncounter` (AC3, AC7) — Task 3.
- `queueEnvenom` / `applyPendingEnvenom` / `beginNextHand` (AC4, AC7) — Tasks 3, 4.
- `RoundState.envenomedCards` and `src/warCouncil/envenom.ts` (AC2, AC3) — Task 5.
- `TrickResolution.envenomTarget`, `TrickFacts`, the replaced outcome (AC3, AC5, AC6) — Tasks 6, 7.
- Reducer selection, the marking branch, the queue write (AC2, AC3) — Task 10.
- The `roundReducer.ts` split — Tasks 8, 9.
- `PlayingCard.envenomed`, `cardAccessibleName`'s marks, the mark on all four surfaces (AC2) — Tasks 11, 13.
- `EnvenomCharge.tsx` in the felt rail (AC2) — Tasks 12, 14.
- Mount props, result, and `App.tsx`'s wiring (AC2, AC4) — Tasks 14, 15.
- Shop name, blurb, charges cell (AC1) — Tasks 2, 16.
- **AC8's four required cases:** queuing on each side — Task 3 Step 1 and Task 6 Step 1; the Quarry-side no-reset override — Task 6 Step 1 (`resolveTrickBank`), Task 10 Step 1 (the reducer), Task 14 Step 1 (the mounted felt); the player-side symmetric case — Tasks 3, 4, 6, 10; discard-on-encounter-end — Task 3 Step 1 (`queueEnvenom` and `applyPendingEnvenom` on a resolved encounter), Task 4 Step 1 (`advanceRun` and `startRun` re-seeding), Task 10 Step 1 (the reducer's ordering).

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, `handle edge cases`, or "similar to Task N" reference. Every step is either a concrete code change or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/` or `dist/`. No step invents a tuning value; no step's fix is an `eslint-disable`.

**Type / name consistency:** `ENVENOM_PRICE`, `ENVENOM_DAMAGE`, `ShopItem.Envenom`, `pendingEnvenom`, `NO_PENDING_ENVENOM`, `hasPendingEnvenom`, `queueEnvenom`, `applyPendingEnvenom`, `beginNextHand`, `envenomCharges`, `envenomedCards`, `isEnvenomed`, `trickIsEnvenomed`, `envenomCard`, `TrickFacts`, `envenomTarget`, `EnvenomStage`, `envenomArmed`, `commitEnvenom`, `handleTapEnvenom`, `TapEnvenom`, `CancelEnvenom`, `CardMarks`, `envenomed`, `VENOM_MARK_LABEL`, `ENVENOM_RAIL_LABEL`, `ENVENOM_EMPTY_LABEL`, `ENVENOM_POISED_HINT`, `ENVENOM_ARMED_HINT`, `envenomAccessibleName`, `SHOP_ENVENOM_LABEL`, `envenomChargesFixture`, `.wc-venom-mark` — each spelled identically in every task that names it, and each present in `plan.md` Part 2 → Data shapes. No identifier uses `poison`; Task 18 Step 2 greps for that.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: each of the four tasks changes a shape together with every reader the audit found, including `shopLabels.ts` and `App.tsx` where they hold exhaustive readers. `App.tsx:124` carries a deliberate, documented placeholder fourth argument (`run.envenomCharges`) until Task 15, because `WarCouncilRoundResult` gains its field in Task 14 — stated in Task 4 Step 6 so it cannot read as an oversight.
- **Phase 2** ends type-checking: both required-field additions (`envenomedCards`, `envenomTarget`) fix every construction site in their own task, and the app-side specs that build those literals are named in the file lists. The engine is self-consistent and no app code uses the marker yet.
- **Phase 3** ends type-checking: Tasks 8 and 9 are pure moves verified by every existing spec passing with no assertion edited, and Task 10 adds the selection with a measured line-count check.
- **Phase 4** ends type-checking after Task 16. Task 15 Step 2 adds a `ShopPanel` prop whose declaration lands in Task 16, so those two tasks complete together — stated in Task 15 Step 2 rather than left for the executor to discover.
- **Phase 5** changes no production code at all.
