# Tasks: Hold Cheat cards in two slots and play one to ignore follow-suit

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-16

**Goal:** Give the player two run-level Cheat slots, rendered as card frames joined to the decree pile on the felt, where two clicks arm a held Cheat, the next card committed ignores follow-suit and consumes it, and with both slots empty the game plays exactly as it does today.

**Spec:** `plan.md` in this folder. Layout and interaction: `mockup.html` in this folder (approved at the 2026-08-16 gate, after the developer's red-line moved the slots from the hand zone onto the deck's plate).

---

## File map

**Created:**
- `src/hunt/cheats.ts` — `CheatCard`, `CheatCardId`, and the two-slot cap: `grantCheats`, `addCheat`, `removeCheat`, `hasCheat`
- `src/hunt/__tests__/cheats.test.ts` — the cap, the grant, the spend, and every refusal
- `src/app/warCouncil/CheatSlots.tsx` — `CHEAT_SLOT_COUNT` frames, filled head-first, poised/armed in form as well as colour
- `src/app/warCouncil/warCouncilCheats.css` — `.wc-felt-rail`, `.wc-felt-rail-split`, `--wc-cheat-slot-w`, and every `.wc-cheat-*` rule
- `src/app/warCouncil/__tests__/CheatSlots.test.tsx` — by role and label, including `Escape`

**Modified:**
- `src/hunt/config.ts` — add `CHEAT_SLOT_COUNT` and `RUN_STARTING_CHEATS`
- `src/hunt/run.ts` — `RunState.cheats` + `RunState.nextCheatId`; `startRun` grants; `recordEncounter` takes a required third parameter
- `src/hunt/index.ts` — export the new module and the two new keys
- `src/hunt/__tests__/run.test.ts` — the changed `recordEncounter` arity, plus the carry and grant assertions
- `src/hunt/__tests__/config.test.ts` — assert the two new keys
- `src/warCouncil/legalMoves.ts` — `LegalMoveOptions`, the follow-suit bypass
- `src/warCouncil/playCard.ts:22-38` — thread `options` into its own `legalMoves` call
- `src/warCouncil/index.ts` — export `LegalMoveOptions`
- `src/warCouncil/__tests__/legalMoves.test.ts` — the bypass, and that Monarch is untouched
- `src/warCouncil/__tests__/playCard.test.ts` — a cheated play commits; an uncheated one still rejects
- `src/app/warCouncilMount.ts` — `cheats` on both `WarCouncilMountProps` and `WarCouncilRoundResult`
- `src/app/warCouncil/roundReducer.ts` — `CheatStage`, `CheatSelection`, `cheatArmed`, the two new actions, the consume in `commit`
- `src/app/warCouncil/__tests__/roundReducer.test.ts` — seed fixture + arm/disarm/consume transitions
- `src/app/warCouncil/__tests__/roundReducer.bank.test.ts:seed` — seed fixture only
- `src/app/warCouncil/WarCouncilRound.tsx` — reducer seed, widened `legal`, `onComplete` payload, the felt-left plate, `deriveHint`
- `src/app/warCouncil/labels.ts` — the rail's placeholder copy and `cheatAccessibleName`
- `src/app/warCouncil/warCouncil.css:249-258` — `.wc-pile` sheds four properties to `.wc-felt-rail` (**net deletion; this file is at 398 of 400 lines**)
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — mount fixture
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` — two mount fixtures
- `src/app/warCouncil/__tests__/labels.test.ts` — the new label function
- `src/App.tsx` — pass `cheats`, adopt them in `handleComplete`

**Deleted:** (none)

**Developer decides or observes:**
- `src/hunt/config.ts` → `RUN_STARTING_CHEATS` — the placeholder is `2` (fills both slots so the mechanic is exercisable). `1` sharpens the "when do I spend it" question from fight one, which is the question the ticket says a play session must answer. **The value is yours.**
- `--wc-cheat-slot-w` and every `clamp()` bound in `warCouncilCheats.css`, plus the hairline's weight and width — tuning values, all placeholders.
- All new copy: `Cheats`, `Empty Cheat slot`, `Cheat armed — play any card in your hand`, `Tap the Cheat again to arm it`. The armed hint is what tells the player AC5's state, so read it on screen.
- **Whether arming feels like a detour** now the slots are on the felt rather than beside the hand. If it does, the fix is a second affordance in the hand zone, not moving the plate back.
- **Whether holding a Cheat changes how a hand is played before it is spent** — the ticket's own open question. If it is spent reflexively on the first illegal-looking moment, that is a `game-designer` follow-up, not a defect here.
- **Whether `nextCheatId` earns its place in this ticket** — nothing here increments it past the opening grant; DLR-84's purchase is what needs it.

---

## Phase 1 — The Cheat card and the slot cap, as pure logic

Everything with an invariant lands here first, inside the lint-enforced pure-core boundary, with no React and no DOM anywhere in reach. The phase ends type-checking with a fully tested module that nothing imports yet — a safe stopping point because no existing behaviour has changed.

### Task 1: Add the two configuration keys to `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts` — append after `ENCOUNTERS_PER_RUN` (`:60`)
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `CHEAT_SLOT_COUNT` and `RUN_STARTING_CHEATS` (the second value is a developer decision)

- [x] **Step 1: Add both keys with their attribution comments**

```ts
// DLR-83 AC1/AC2 — exactly two slots. TRANSCRIBED FROM THE TICKET, not chosen: its Dependencies
// section defends the cap at length ("the skull is the only thing stopping 'take every trick'
// from being correct, so unlimited Cheats would remove the game's only inversion"). A key so the
// number is stated once, NOT so it is easy to raise.
// UNIT: slots available to the player, for the whole run.
export const CHEAT_SLOT_COUNT = 2

// DLR-83 AC3 — how many Cheats a run opens with. PLACEHOLDER VALUE: the ticket requires the grant
// come from configuration and says cards are granted free "so they can be played with", but names
// no number. 2 fills both slots so the mechanic is exercisable in a play session.
// THE VALUE IS THE DEVELOPER'S — see this contract's tasks.md, "Developer decides or observes".
// Must be 0..CHEAT_SLOT_COUNT; `grantCheats` throws outside that range rather than clamping.
// UNIT: Cheat cards granted once, at the start of a run.
export const RUN_STARTING_CHEATS = 2
```

- [x] **Step 2: Assert both keys, including the relationship between them**

Add to `src/hunt/__tests__/config.test.ts`, importing both names:

```ts
it('offers exactly two Cheat slots (DLR-83 AC1/AC2)', () => {
  expect(CHEAT_SLOT_COUNT).toBe(2)
})

it('grants a starting number of Cheats that the slots can actually hold (AC3)', () => {
  expect(Number.isInteger(RUN_STARTING_CHEATS)).toBe(true)
  expect(RUN_STARTING_CHEATS).toBeGreaterThanOrEqual(0)
  expect(RUN_STARTING_CHEATS).toBeLessThanOrEqual(CHEAT_SLOT_COUNT)
})
```

The second test is deliberately a *range*, not a value — it stays true when the developer changes the placeholder, and it catches the one configuration mistake that would throw at startup.

- [x] **Step 3: Run the config spec**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 2: Write `src/hunt/cheats.ts` and its spec ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/cheats.ts`
- Test: `src/hunt/__tests__/cheats.test.ts`

- [x] **Step 1: Write the failing spec first**

`src/hunt/__tests__/cheats.test.ts` — a `.test.ts`, so it lands in the `node` Vitest project and must stay DOM-free.

```ts
import { describe, expect, it } from 'vitest'
import { CHEAT_SLOT_COUNT } from '../config'
import { addCheat, grantCheats, hasCheat, removeCheat } from '../cheats'

describe('grantCheats', () => {
  it('mints `count` cards with consecutive ids from `firstId` (AC3)', () => {
    expect(grantCheats(2, 1)).toEqual([{ id: 1 }, { id: 2 }])
    expect(grantCheats(1, 7)).toEqual([{ id: 7 }])
  })

  it('grants nothing for 0 rather than throwing', () => {
    expect(grantCheats(0, 1)).toEqual([])
  })

  it('refuses a count above the slot cap rather than clamping (AC2)', () => {
    expect(() => grantCheats(CHEAT_SLOT_COUNT + 1, 1)).toThrow(RangeError)
  })

  it('refuses a negative or non-integer count', () => {
    expect(() => grantCheats(-1, 1)).toThrow(RangeError)
    expect(() => grantCheats(1.5, 1)).toThrow(RangeError)
  })
})

describe('addCheat', () => {
  it('appends to a list with room', () => {
    expect(addCheat([{ id: 1 }], { id: 2 })).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('refuses a third card when both slots are full (AC2)', () => {
    const full = grantCheats(CHEAT_SLOT_COUNT, 1)
    expect(() => addCheat(full, { id: 99 })).toThrow(RangeError)
  })

  it('refuses an id already held', () => {
    expect(() => addCheat([{ id: 1 }], { id: 1 })).toThrow(RangeError)
  })

  it('does not mutate its input', () => {
    const held = [{ id: 1 }]
    addCheat(held, { id: 2 })
    expect(held).toEqual([{ id: 1 }])
  })
})

describe('removeCheat', () => {
  it('drops exactly the named card and frees its slot (AC7)', () => {
    expect(removeCheat([{ id: 1 }, { id: 2 }], 1)).toEqual([{ id: 2 }])
  })

  it('refuses an id that is not held, so a double-consume is loud', () => {
    expect(() => removeCheat([{ id: 1 }], 2)).toThrow(RangeError)
  })

  it('does not mutate its input', () => {
    const held = [{ id: 1 }, { id: 2 }]
    removeCheat(held, 1)
    expect(held).toHaveLength(2)
  })
})

describe('hasCheat', () => {
  it('answers whether an id is still held', () => {
    expect(hasCheat([{ id: 1 }], 1)).toBe(true)
    expect(hasCheat([{ id: 1 }], 2)).toBe(false)
    expect(hasCheat([], 1)).toBe(false)
  })
})
```

- [x] **Step 2: Run it and confirm it fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/cheats.test.ts`
Expected: fails to resolve `../cheats` — a "Failed to load" / transform error, not an assertion failure. That distinction matters: an assertion failure here would mean the module already exists.

- [x] **Step 3: Write the module**

`src/hunt/cheats.ts`. Imports `./config` and nothing else — no React, no DOM global, inside the lint-enforced pure boundary.

```ts
import { CHEAT_SLOT_COUNT } from './config'

/** A Cheat's identity. Minted from `RunState.nextCheatId`, never from `Math.random()` —
 *  `src/hunt/` is lint-enforced DOM-free and must stay deterministic. */
export type CheatCardId = number

/**
 * One held Cheat. An OBJECT, not a counter (DLR-83 scope): it carries an identity so a spend
 * names a specific card, so React has a stable key, and so DLR-84 has somewhere to attach a
 * price without reshaping the field. Deliberately carries nothing else — no kind, no name, no
 * cost. Those are DLR-84's.
 */
export interface CheatCard {
  readonly id: CheatCardId
}

/**
 * AC3 — the run's opening grant. Throws rather than clamping: a `RUN_STARTING_CHEATS` above the
 * slot cap is a configuration mistake, and silently handing back fewer cards than the key asks
 * for hides it until someone counts the frames on screen.
 */
export function grantCheats(count: number, firstId: CheatCardId): readonly CheatCard[] {
  if (!Number.isInteger(count) || count < 0 || count > CHEAT_SLOT_COUNT) {
    throw new RangeError(
      `Cannot grant ${count} Cheats — must be a whole number from 0 to ${CHEAT_SLOT_COUNT}`,
    )
  }
  return Array.from({ length: count }, (_, i) => ({ id: firstId + i }))
}

/**
 * AC2 — THE single statement of the two-slot cap. Throws when the slots are full rather than
 * returning the list unchanged: a silent no-op would let DLR-84 take payment for a card that was
 * never added.
 */
export function addCheat(
  cheats: readonly CheatCard[],
  card: CheatCard,
): readonly CheatCard[] {
  if (cheats.length >= CHEAT_SLOT_COUNT) {
    throw new RangeError(
      `Cannot hold a third Cheat — all ${CHEAT_SLOT_COUNT} slots are full`,
    )
  }
  if (hasCheat(cheats, card.id)) {
    throw new RangeError(`Cheat ${card.id} is already held`)
  }
  return [...cheats, card]
}

/** AC7 — the spend. Throws when `id` is not held, so a double-consume is a loud bug rather than
 *  a no-op that leaves the slot looking correct. */
export function removeCheat(
  cheats: readonly CheatCard[],
  id: CheatCardId,
): readonly CheatCard[] {
  if (!hasCheat(cheats, id)) {
    throw new RangeError(`Cannot spend Cheat ${id} — it is not held`)
  }
  return cheats.filter((c) => c.id !== id)
}

/** Whether `id` is still held — read by the reducer before honouring a stale selection. */
export function hasCheat(cheats: readonly CheatCard[], id: CheatCardId): boolean {
  return cheats.some((c) => c.id === id)
}
```

- [x] **Step 4: Run the spec and the typecheck together**

Run: `npx vitest run src/hunt/__tests__/cheats.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `typecheck` exits 0 with no errors.

### Task 3: Put the cheats on `RunState` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Add the two fields and the grant**

In `src/hunt/run.ts`, import `grantCheats` and the two new keys, then extend the interface and `startRun`:

```ts
export interface RunState {
  // …existing members unchanged…
  /** AC3 — held Cheats, capped at `CHEAT_SLOT_COUNT` by `cheats.ts` and carried across every
   *  fight boundary. Run state, not hand state: `advanceRun` passes it through untouched. */
  readonly cheats: readonly CheatCard[]
  /** The next id to mint. Monotonic and never reused, so DLR-84's mid-run purchase cannot
   *  re-issue the id of a card already spent — which would collide as a React key. */
  readonly nextCheatId: CheatCardId
}
```

`startRun` keeps its signature and gains two fields:

```ts
    cheats: grantCheats(RUN_STARTING_CHEATS, 1),
    nextCheatId: RUN_STARTING_CHEATS + 1,
```

`advanceRun` and `canAdvanceRun` are **not edited** — `advanceRun`'s existing `...run` spread already carries both fields into the next fight, which is AC3.

- [x] **Step 2: Make `recordEncounter` take the hand's surviving cheats**

Required, not optional: an optional parameter would let `App` silently drop a spend and the run would quietly refill the slot.

```ts
/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * `cheats` (DLR-83) is REQUIRED: the hand owns the Cheats for its lifetime and hands the
 * survivors back through `WarCouncilRoundResult`. A second transition the caller must remember
 * to make beside this one is the transition that eventually gets forgotten.
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
): RunState {
  // …existing outcome guard unchanged…
  return {
    ...run,
    encounter,
    cheats,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
}
```

- [x] **Step 3: Re-export from the hunt barrel**

In `src/hunt/index.ts`, add to the `./config` export list `CHEAT_SLOT_COUNT` and `RUN_STARTING_CHEATS`, and add:

```ts
export type { CheatCard, CheatCardId } from './cheats'
export { grantCheats, addCheat, removeCheat, hasCheat } from './cheats'
```

- [x] **Step 4: Update `run.test.ts` for the new arity and add the run-level assertions**

Every existing `recordEncounter(run, encounter)` call in `src/hunt/__tests__/run.test.ts` takes a third argument — pass `run.cheats` where the test is not about cheats, so those cases assert unchanged behaviour. Then add:

```ts
it('grants Cheats from configuration at the start of a run (AC3)', () => {
  const run = startRun()
  expect(run.cheats).toHaveLength(RUN_STARTING_CHEATS)
  expect(run.nextCheatId).toBe(RUN_STARTING_CHEATS + 1)
})

it('carries the slots across a fight boundary untouched (AC3)', () => {
  const won = recordEncounter(startRun(), quarryDownEncounter, [{ id: 2 }])
  const next = advanceRun(won)
  expect(next.cheats).toEqual([{ id: 2 }])
  expect(next.nextCheatId).toBe(won.nextCheatId)
})

it('adopts a spend reported by the hand', () => {
  const run = startRun()
  const after = recordEncounter(run, liveEncounter, [])
  expect(after.cheats).toEqual([])
})
```

`quarryDownEncounter` and `liveEncounter` are the fixtures that spec already builds for its outcome cases — reuse them by whatever names they carry rather than adding new ones.

- [x] **Step 5: Run the hunt specs and the typecheck**

Run: `npx vitest run src/hunt; npm run typecheck`
Expected: Vitest exits 0 with 0 failed. `typecheck` **will report errors in `src/App.tsx`** — `recordEncounter` now takes three arguments and `App` passes two. That is expected at this phase boundary and is fixed in Phase 4; note it and continue.

---

## Phase 2 — The follow-suit bypass in the engine

The rules half, and it is small: one optional parameter threaded through two functions. The phase boundary is safe because the parameter is trailing and optional — every existing caller compiles and behaves identically, which is AC9 proved by construction rather than by assertion.

### Task 4: Add `LegalMoveOptions` to `src/warCouncil/legalMoves.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/legalMoves.ts:34-50`
- Modify: `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/legalMoves.test.ts`

- [x] **Step 1: Write the failing spec**

Add to `src/warCouncil/__tests__/legalMoves.test.ts`, using whatever hand/state builders that file already has:

```ts
describe('the Cheat bypass (DLR-83)', () => {
  it('returns the whole hand when follow-suit would otherwise narrow it (AC5)', () => {
    // player holds the led suit, so without the bypass they are narrowed to it
    const narrowed = legalMoves(stateWithLedSuitInHand, PlayerSide.Player)
    const widened = legalMoves(stateWithLedSuitInHand, PlayerSide.Player, {
      ignoreFollowSuit: true,
    })
    expect(narrowed.length).toBeLessThan(widened.length)
    expect(widened).toEqual(stateWithLedSuitInHand.hands[PlayerSide.Player])
  })

  it('leaves the led-Monarch narrowing binding (AC8)', () => {
    const withBypass = legalMoves(stateWithMonarchLed, PlayerSide.Player, {
      ignoreFollowSuit: true,
    })
    expect(withBypass).toEqual(legalMoves(stateWithMonarchLed, PlayerSide.Player))
  })

  it('changes nothing on a lead, where nothing narrows anyway', () => {
    expect(legalMoves(emptyTrickState, PlayerSide.Player, { ignoreFollowSuit: true })).toEqual(
      legalMoves(emptyTrickState, PlayerSide.Player),
    )
  })

  it('is off by default, so today is unchanged (AC9)', () => {
    expect(legalMoves(stateWithLedSuitInHand, PlayerSide.Player, {})).toEqual(
      legalMoves(stateWithLedSuitInHand, PlayerSide.Player),
    )
  })
})
```

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/legalMoves.test.ts`
Expected: fails — a TypeScript arity error on the three-argument calls, surfacing as a transform/collection error rather than an assertion failure.

- [x] **Step 3: Add the interface and the branch**

```ts
/**
 * AC8 — the ONLY thing a Cheat lifts is the follow-suit narrowing. `legalMoves` reaches the
 * follow-suit branch only when the led card is NOT a Monarch, so the Monarch follow set is a
 * different branch and is untouched by construction rather than by a guard someone could delete.
 *
 * AC10 — an OPTIONS parameter rather than a field on `RoundState` deliberately: the Quarry's
 * call sites (`cpuPlayer.ts`, and `roundReducer`'s lead and follow advances) simply pass nothing,
 * so the Quarry cannot be handed a bypass without editing a line that has no reason to change.
 */
export interface LegalMoveOptions {
  readonly ignoreFollowSuit?: boolean
}
```

and in `legalMoves`, replace the final two lines:

```ts
export function legalMoves(
  state: RoundState,
  side: PlayerSide,
  options?: LegalMoveOptions,
): readonly Card[] {
  // …everything above the follow-suit branch is UNCHANGED, including the Monarch branch…

  if (options?.ignoreFollowSuit) {
    return hand
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
```

The `if (options?.ignoreFollowSuit)` sits **after** the Monarch branch's `return`, which is what makes AC8 structural.

- [x] **Step 4: Export the type from the engine barrel**

In `src/warCouncil/index.ts`, alongside the existing `legalMoves` export:

```ts
export type { LegalMoveOptions } from './legalMoves'
```

- [x] **Step 5: Run the spec and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/legalMoves.test.ts; npm run typecheck`
Expected: both exit 0.

### Task 5: Thread the options through `playCard` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/playCard.ts:22-38`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [x] **Step 1: Write the failing spec**

Add to `src/warCouncil/__tests__/playCard.test.ts`:

```ts
describe('the Cheat bypass (DLR-83)', () => {
  it('commits an off-suit card that would otherwise be rejected (AC5)', () => {
    const without = playCard(state, PlayerSide.Player, offSuitCard)
    expect(without).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowLeadSuit })

    const withCheat = playCard(state, PlayerSide.Player, offSuitCard, undefined, {
      ignoreFollowSuit: true,
    })
    expect(withCheat.ok).toBe(true)
  })

  it('still rejects a card that is not in hand', () => {
    const result = playCard(state, PlayerSide.Player, cardNotHeld, undefined, {
      ignoreFollowSuit: true,
    })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('still enforces the led-Monarch narrowing (AC8)', () => {
    const result = playCard(monarchLedState, PlayerSide.Player, wrongCard, undefined, {
      ignoreFollowSuit: true,
    })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowMonarch })
  })
})
```

The second and third cases are the ones that matter: the bypass must lift follow-suit and *nothing else*, including the guards that run before legality is consulted.

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: fails on the five-argument calls.

- [x] **Step 3: Add the parameter and pass it on**

```ts
export function playCard(
  state: RoundState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
  options?: LegalMoveOptions,
): PlayCardResult {
```

and at `:38`, the single body change:

```ts
  const legal = legalMoves(state, side, options)
```

Everything else is untouched — including the `monarchConstrained` rejection-reason branch below it. No `IllegalMoveReason` is added, removed, or renamed; `MustFollowLeadSuit` simply stops being produced for a cheated play.

- [x] **Step 4: Run the whole engine suite and the typecheck**

Run: `npx vitest run src/warCouncil; npm run typecheck`
Expected: both exit 0, 0 failed. The engine's existing specs must all still pass untouched — that is AC9's evidence.

---

## Phase 3 — Arming, disarming and spending in the reducer

The hand's own state. The phase ends with the reducer fully wired and tested but no component reading it yet, so nothing on screen has changed and the app still type-checks apart from the `App.tsx` arity error Phase 1 left open.

### Task 6: Extend `RoundUiState` and add the two actions ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts`
- Modify: `src/app/warCouncilMount.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.bank.test.ts` — seed fixture only

- [x] **Step 1: Add `cheats` to both mount contracts**

In `src/app/warCouncilMount.ts`, importing `CheatCard` from `../hunt`:

```ts
export interface WarCouncilMountProps {
  // …unchanged members…
  /** AC1/AC3 — the run's held Cheats at the START of this hand. Same contract as `encounter`
   *  above: an opening figure the reducer owns for the life of the hand and hands back through
   *  `WarCouncilRoundResult.cheats`. Required, not optional, so the compiler enumerates every
   *  mount site rather than letting one render an empty rail. */
  readonly cheats: readonly CheatCard[]
}

export interface WarCouncilRoundResult {
  // …unchanged members…
  /** AC7 — the Cheats still held after this hand. One fewer for each Cheat spent; the run adopts
   *  it through `recordEncounter`'s third parameter. */
  readonly cheats: readonly CheatCard[]
}
```

- [x] **Step 2: Add the stage, the selection, the state fields and the seed**

In `src/app/warCouncil/roundReducer.ts`:

```ts
export const CheatStage = {
  /** One click — a selection, no rule effect. AC4's guard against a single misclick. */
  Poised: 'poised',
  /** Two clicks — follow-suit is lifted for the next committed card. AC5. */
  Armed: 'armed',
} as const
export type CheatStage = (typeof CheatStage)[keyof typeof CheatStage]

/** ONE field, not two nullables: `poised` and `armed` are stages of a single selection, and two
 *  nullable fields would admit the invalid pair "poised AND armed". */
export interface CheatSelection {
  readonly id: CheatCardId
  readonly stage: CheatStage
}
```

`RoundUiState` gains `readonly cheats: readonly CheatCard[]` and `readonly cheatSelection: CheatSelection | null`; `RoundUiSeed` gains `readonly cheats: readonly CheatCard[]`; `createRoundUiState` seeds `cheats: seed.cheats` and `cheatSelection: null` and stays a pure restructuring of its seed.

Add to `RoundUiActionKind`: `TapCheat: 'tapCheat'` and `CancelCheat: 'cancelCheat'`, with the matching `RoundUiAction` variants (`TapCheat` carries `readonly id: CheatCardId`).

- [x] **Step 3: Add the exported predicate and the two handlers**

```ts
/** `true` when the next committed card should ignore follow-suit. EXPORTED so the mount computes
 *  its `legal` set from the SAME predicate the reducer commits with — two readings of "is the
 *  Cheat armed" is exactly how a fan's greying and a rejection reason drift apart. */
export function cheatArmed(state: RoundUiState): boolean {
  return state.cheatSelection?.stage === CheatStage.Armed
}

/**
 * AC4/AC6 — four outcomes on one id. Nothing selected poises; poised on the same id arms; armed
 * on the same id gives it back unspent; a tap on a different id poises that one instead.
 *
 * Guards `hasCheat` rather than trusting the id: a selection can outlive its card if a future
 * caller ever removes one outside `commit`, and a reducer must not throw — a throw inside a
 * reducer during an event handler unmounts the tree.
 */
function handleTapCheat(state: RoundUiState, id: CheatCardId): RoundUiState {
  if (!canAct(state) || !hasCheat(state.cheats, id)) {
    return state
  }
  const current = state.cheatSelection
  if (current === null || current.id !== id) {
    return { ...state, cheatSelection: { id, stage: CheatStage.Poised } }
  }
  const stage = current.stage === CheatStage.Poised ? CheatStage.Armed : null
  return stage === null ? clearCheat(state) : { ...state, cheatSelection: { id, stage } }
}

/**
 * AC6 — disarm without spending. Also drops a poised hand card that the RE-NARROWED legal set has
 * just made illegal, so the player is never left holding a selection that will be rejected on its
 * next tap with no visible cause.
 */
function clearCheat(state: RoundUiState): RoundUiState {
  const stillLegal =
    state.armed === null || containsCard(legalMoves(state.round, PlayerSide.Player), state.armed)
  return { ...state, cheatSelection: null, armed: stillLegal ? state.armed : null }
}
```

Wire both into the `switch` in `roundReducer`: `TapCheat` → `handleTapCheat(state, action.id)`, `CancelCheat` → `clearCheat(state)`. Import `containsCard`, `hasCheat` and `removeCheat`.

- [x] **Step 4: Consume the Cheat inside `commit`**

Three edits to the existing `commit`, and nothing else in it changes:

```ts
function commit(state: RoundUiState, cardToPlay: Card, choice?: AbilityChoice): RoundUiState {
  const armedCheat = cheatArmed(state) ? state.cheatSelection : null
  const result = playCard(
    state.round,
    PlayerSide.Player,
    cardToPlay,
    choice,
    armedCheat ? { ignoreFollowSuit: true } : undefined,
  )
  if (!result.ok) {
    // A rejection is NOT a commit (AC7), so the Cheat survives and stays armed — the player can
    // try another card without paying twice.
    return { ...state, armed: null, prompt: null, rejection: result.reason }
  }
  // AC7 — consumed on ANY successful commit while armed, even if the card was legal anyway.
  // No "was it needed" check: that would put a legality judgement in the reducer that
  // `legalMoves` already owns, and would make arming free.
  const cheats = armedCheat ? removeCheat(state.cheats, armedCheat.id) : state.cheats

  // …the rest of `commit` is unchanged, except that both returned states also carry
  //    `cheats` and `cheatSelection: null`.
}
```

- [x] **Step 5: Update both reducer spec fixtures and add the transition tests**

Every `createRoundUiState({ round, encounter })` in `roundReducer.test.ts` (5 sites) and `roundReducer.bank.test.ts` (2 sites) gains `cheats: []` — `[]` for the existing cases, so they assert today's behaviour under AC9. Then add to `roundReducer.test.ts`:

```ts
describe('Cheat arm, disarm and spend (DLR-83)', () => {
  const held = [{ id: 1 }, { id: 2 }]
  const seeded = () => createRoundUiState({ round: followState, encounter, cheats: held })

  it('needs two taps to arm, so one misclick cannot spend it (AC4)', () => {
    const once = roundReducer(seeded(), { kind: RoundUiActionKind.TapCheat, id: 1 })
    expect(once.cheatSelection).toEqual({ id: 1, stage: CheatStage.Poised })
    expect(cheatArmed(once)).toBe(false)

    const twice = roundReducer(once, { kind: RoundUiActionKind.TapCheat, id: 1 })
    expect(cheatArmed(twice)).toBe(true)
    expect(twice.cheats).toHaveLength(2) // not spent yet
  })

  it('gives an armed Cheat back on a third tap, unspent (AC6)', () => {
    let ui = roundReducer(seeded(), { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    expect(ui.cheatSelection).toBeNull()
    expect(ui.cheats).toHaveLength(2)
  })

  it('moves the selection when the other slot is tapped', () => {
    let ui = roundReducer(seeded(), { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 2 })
    expect(ui.cheatSelection).toEqual({ id: 2, stage: CheatStage.Poised })
  })

  it('consumes the armed Cheat when a forbidden card is committed (AC7)', () => {
    let ui = seeded()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    expect(ui.cheats).toEqual([{ id: 2 }])
    expect(ui.cheatSelection).toBeNull()
    expect(ui.rejection).toBeNull()
  })

  it('rejects that same card with no Cheat armed, and holds every Cheat (AC9)', () => {
    let ui = seeded()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    expect(ui.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
    expect(ui.cheats).toHaveLength(2)
  })

  it('drops a poised card that disarming has just made illegal', () => {
    let ui = seeded()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    expect(ui.armed).toEqual(offSuitCard)
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelCheat })
    expect(ui.armed).toBeNull()
    expect(ui.cheats).toHaveLength(2)
  })
})
```

`followState` and `offSuitCard` are a state where the player holds the led suit and a card of another suit — build them from the fixtures that spec already uses for its `MustFollowLeadSuit` case at `:216`.

- [x] **Step 6: Run both reducer specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed. `typecheck` still reports the `App.tsx` arity error plus new errors at the mount sites that do not yet pass `cheats` — both expected here and closed in Phase 4.

---

## Phase 4 — The slots on the felt, and the run wired end to end

The visible half. This phase closes every compiler error the previous three opened, so it is the first point since Phase 1 where the whole project type-checks again.

### Task 7: Add the rail's copy to `labels.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Add the strings and the name function**

```ts
/** The Cheat rail's copy (DLR-83). PLACEHOLDER — the wording is the developer's, exactly as
 *  `FINISH_ROUND_LABEL` and `TRICK_OUTCOME_MESSAGE` above are. */
export const CHEAT_RAIL_LABEL = 'Cheats'
export const CHEAT_EMPTY_SLOT_LABEL = 'Empty Cheat slot'
export const CHEAT_ARMED_HINT = 'Cheat armed — play any card in your hand'
export const CHEAT_POISED_HINT = 'Tap the Cheat again to arm it'

/** One slot's accessible name. `null` is a held but unselected Cheat. The three must differ —
 *  `getByRole('button', { name })` is how the spec tells the stages apart. */
export function cheatAccessibleName(stage: CheatStage | null): string {
  if (stage === CheatStage.Armed) return 'Cheat, armed'
  if (stage === CheatStage.Poised) return 'Cheat, selected'
  return 'Cheat, held'
}
```

- [x] **Step 2: Assert the three names differ**

Add to `src/app/warCouncil/__tests__/labels.test.ts`:

```ts
it('names each Cheat stage distinctly, so a spec can tell them apart', () => {
  const names = [
    cheatAccessibleName(null),
    cheatAccessibleName(CheatStage.Poised),
    cheatAccessibleName(CheatStage.Armed),
  ]
  expect(new Set(names).size).toBe(3)
})
```

- [x] **Step 3: Run the labels spec**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: exits 0, 0 failed.

### Task 8: Build `CheatSlots.tsx` and its stylesheet ✓

- Skill: `react-frontend` for the component and the CSS conventions; `game-ux` for the plate's place in the no-scroll shell, the ≥44px hit area under a condensed frame, and the rule that all four slot states read without colour or motion alone

**Files:**
- Create: `src/app/warCouncil/CheatSlots.tsx`
- Create: `src/app/warCouncil/warCouncilCheats.css`
- Modify: `src/app/warCouncil/warCouncil.css:249-258` — `.wc-pile` sheds four properties
- Test: `src/app/warCouncil/__tests__/CheatSlots.test.tsx`

Layout per `mockup.html`'s felt-left plate: the decree pile above, a hairline, the Cheat slots side by side below, all at matching widths under matching `.wc-plate-label` captions.

- [x] **Step 1: Write the component**

```tsx
import { CHEAT_SLOT_COUNT, type CheatCard, type CheatCardId } from '../../hunt'
import { CHEAT_EMPTY_SLOT_LABEL, CHEAT_RAIL_LABEL, cheatAccessibleName } from './labels'
import { CheatStage, type CheatSelection } from './roundReducer'
import './warCouncilCheats.css'

interface CheatSlotsProps {
  /** Rendered into the first `CHEAT_SLOT_COUNT` frames, head first. Never longer than the cap —
   *  `cheats.ts` enforces that; this component asserts nothing and computes nothing. */
  readonly cheats: readonly CheatCard[]
  readonly selection: CheatSelection | null
  /** The same gate the fan uses, so a Cheat cannot be armed into a moment where no card can
   *  be played. */
  readonly interactive: boolean
  readonly onTap: (id: CheatCardId) => void
  readonly onCancel: () => void
}

/**
 * AC1 — exactly `CHEAT_SLOT_COUNT` frames, on screen during every hand whether filled or empty,
 * as the second register of the felt-left plate beneath the decree pile.
 *
 * `onClick` STOPS PROPAGATION, and that is load-bearing rather than defensive: this mounts inside
 * `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting — so without it,
 * arming a Cheat while a trick reveal is held would also clear the reveal and commit the Quarry's
 * lead as a side effect.
 *
 * Two controls is below `game-ux`'s roving-tabindex threshold of about five, so these are plain
 * tab stops. `Escape` cancels, matching the hand fan's own keyboard contract.
 */
export default function CheatSlots({
  cheats,
  selection,
  interactive,
  onTap,
  onCancel,
}: CheatSlotsProps) {
  const frames = Array.from({ length: CHEAT_SLOT_COUNT }, (_, i) => cheats[i] ?? null)

  return (
    <div
      className="wc-cheat-rail"
      role="group"
      aria-label={CHEAT_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{CHEAT_RAIL_LABEL}</span>
      <div className="wc-cheat-slots">
        {frames.map((card, index) => {
          if (card === null) {
            return (
              <span
                key={`empty-${index}`}
                className="wc-cheat-slot is-empty"
                aria-label={CHEAT_EMPTY_SLOT_LABEL}
              />
            )
          }
          const stage = selection?.id === card.id ? selection.stage : null
          return (
            <button
              key={card.id}
              type="button"
              className={`wc-cheat-slot is-held${stage ? ` is-${stage}` : ''}`}
              aria-pressed={stage === CheatStage.Armed}
              aria-label={cheatAccessibleName(stage)}
              disabled={!interactive}
              onClick={() => onTap(card.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [x] **Step 2: Write the stylesheet**

`src/app/warCouncil/warCouncilCheats.css` carries the felt-left plate *and* the slots, because `warCouncil.css` is at 398 of 400 lines and has no room. Per `plan.md` Part 2 → Data shapes: `.wc-felt-rail` (taking `.wc-pile`'s three positioning properties plus its padding), `.wc-felt-rail-split`, a `:root` block declaring `--wc-cheat-slot-w: clamp(2rem, 4vmin, 2.8rem)`, and `.wc-cheat-rail` / `.wc-cheat-slots` / `.wc-cheat-slot`.

Four states, each differing in **form** as well as tone so greyscale still separates them: `.is-empty` a faint dashed `--wc-chalk-dim` frame; `.is-held` a solid `--wc-brass-dim` edge; `.is-poised` a dashed `--wc-brass` edge with a small lift; `.is-armed` a solid `--wc-brass` edge, a larger lift, and a filled corner notch via `::after`. `.wc-cheat-slots` is `flex-direction: row`. Every slot carries `min-width: 2.75rem; min-height: 2.75rem` and `touch-action: manipulation`; `:focus-visible` gives the keyboard outline; any hover rule is wrapped in `@media (hover: hover)`. **No `100vh` and no `100vw`, and no new hue.**

- [x] **Step 3: Take the four properties off `.wc-pile`**

In `src/app/warCouncil/warCouncil.css`, `.wc-pile` loses `grid-column`, `justify-self`, `align-self` and `padding` — they move to `.wc-felt-rail`. Leave a comment saying where they went and why the block is not here:

```css
.wc-pile {
  /* grid-column, justify-self, align-self and padding MOVE to `.wc-felt-rail`, declared in
     warCouncilCheats.css — this file is 2 lines under the 400-line budget and cannot take a
     new block. Nothing else about the pile changes and it renders identically. */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.2rem, 0.7vmin, 0.4rem);
}
```

- [x] **Step 4: Write the component spec, by role and label**

`src/app/warCouncil/__tests__/CheatSlots.test.tsx` — a `.tsx`, so it lands in the `dom` Vitest project.

```tsx
it('shows exactly two slots whether they are filled or empty (AC1)', () => {
  render(<CheatSlots cheats={[]} selection={null} interactive onTap={noop} onCancel={noop} />)
  expect(screen.getAllByLabelText(CHEAT_EMPTY_SLOT_LABEL)).toHaveLength(CHEAT_SLOT_COUNT)
})

it('fills slots from the head and leaves the rest empty', () => {
  render(
    <CheatSlots cheats={[{ id: 1 }]} selection={null} interactive onTap={noop} onCancel={noop} />,
  )
  expect(screen.getByRole('button', { name: cheatAccessibleName(null) })).toBeTruthy()
  expect(screen.getAllByLabelText(CHEAT_EMPTY_SLOT_LABEL)).toHaveLength(CHEAT_SLOT_COUNT - 1)
})

it('reports a tap with the card id it belongs to', () => {
  const onTap = vi.fn()
  render(
    <CheatSlots cheats={[{ id: 7 }]} selection={null} interactive onTap={onTap} onCancel={noop} />,
  )
  fireEvent.click(screen.getByRole('button', { name: cheatAccessibleName(null) }))
  expect(onTap).toHaveBeenCalledWith(7)
})

it('names and presses the armed slot distinctly (AC5)', () => {
  render(
    <CheatSlots
      cheats={[{ id: 1 }]}
      selection={{ id: 1, stage: CheatStage.Armed }}
      interactive
      onTap={noop}
      onCancel={noop}
    />,
  )
  const slot = screen.getByRole('button', { name: cheatAccessibleName(CheatStage.Armed) })
  expect(slot.getAttribute('aria-pressed')).toBe('true')
})

it('cancels on Escape (AC6)', () => {
  const onCancel = vi.fn()
  render(
    <CheatSlots
      cheats={[{ id: 1 }]}
      selection={{ id: 1, stage: CheatStage.Armed }}
      interactive
      onTap={noop}
      onCancel={onCancel}
    />,
  )
  fireEvent.keyDown(screen.getByRole('group', { name: CHEAT_RAIL_LABEL }), { key: 'Escape' })
  expect(onCancel).toHaveBeenCalled()
})

it('disables its slots when the felt is not interactive', () => {
  render(
    <CheatSlots
      cheats={[{ id: 1 }]}
      selection={null}
      interactive={false}
      onTap={noop}
      onCancel={noop}
    />,
  )
  expect(screen.getByRole('button', { name: cheatAccessibleName(null) })).toHaveProperty(
    'disabled',
    true,
  )
})
```

- [x] **Step 5: Run the component spec**

Run: `npx vitest run src/app/warCouncil/__tests__/CheatSlots.test.tsx`
Expected: exits 0, 0 failed.

### Task 9: Mount the plate in `WarCouncilRound.tsx` ✓

- Skill: `react-frontend` for the component wiring; `game-ux` for whether the plate still fits the felt-left column beside the trick

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:67-79, 91, 175-187, 275-279, 300-308`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Take the prop, seed the reducer, and widen the legal set**

Destructure `cheats` from `WarCouncilMountProps`; seed with `{ round: initialState, encounter, cheats }`; and at `:91`:

```ts
// The SAME predicate the reducer commits with (`cheatArmed`), not a second reading of the
// selection — two readings is how the fan's greying and a rejection reason drift apart.
const legal = legalMoves(
  ui.round,
  PlayerSide.Player,
  cheatArmed(ui) ? { ignoreFollowSuit: true } : undefined,
)
```

- [x] **Step 2: Carry the cheats up in both `onComplete` calls**

Both calls in `handleCarryOn` (`:177` and `:185`) become:

```ts
onComplete({ finalState: ui.round, encounter: ui.encounter, cheats: ui.cheats })
```

- [x] **Step 3: Wrap the decree pile and the slots in the felt-left plate**

Replace the bare `<DecreePile …/>` at `:275-279`:

```tsx
<div className="wc-felt-rail">
  <DecreePile
    decree={ui.round.decree}
    trumpSuit={ui.round.trumpSuit}
    drawPileCount={ui.round.drawPile.length}
  />
  <div className="wc-felt-rail-split" aria-hidden="true" />
  <CheatSlots
    cheats={ui.cheats}
    selection={ui.cheatSelection}
    interactive={interactive}
    onTap={(id) => dispatch({ kind: RoundUiActionKind.TapCheat, id })}
    onCancel={() => dispatch({ kind: RoundUiActionKind.CancelCheat })}
  />
</div>
```

- [x] **Step 4: Add the hint case**

In `deriveHint`, immediately after the `ui.armed` line and before `quarryToLead`:

```ts
  if (ui.cheatSelection) {
    return ui.cheatSelection.stage === CheatStage.Armed ? CHEAT_ARMED_HINT : CHEAT_POISED_HINT
  }
```

`deriveHint` takes `ui` already, so its signature does not change.

- [x] **Step 5: Add `cheats` to all three mount fixtures**

`WarCouncilRound.test.tsx:23-31` and `WarCouncilRound.duelHealthBars.test.tsx:32-38` and `:152-158` each gain `cheats: []` — empty, so every existing assertion in both files continues to describe the no-Cheat path (AC9). Any assertion on the `onComplete` payload gains `cheats: []`.

- [x] **Step 6: Add a mount-level test that the fan actually opens up**

The one assertion that ties the rail to the rules. Add to `WarCouncilRound.test.tsx`:

```tsx
it('makes a forbidden card playable once a Cheat is armed (AC5)', async () => {
  render(<WarCouncilRound {...props} cheats={[{ id: 1 }]} />)
  const offSuit = screen.getByRole('button', { name: /* the off-suit card's name */ })
  expect(offSuit).toHaveProperty('disabled', true)

  const slot = screen.getByRole('button', { name: cheatAccessibleName(null) })
  fireEvent.click(slot)
  fireEvent.click(screen.getByRole('button', { name: cheatAccessibleName(CheatStage.Poised) }))

  expect(screen.getByRole('button', { name: /* same card */ })).toHaveProperty('disabled', false)
})
```

Build the off-suit card's accessible name with `cardAccessibleName` from `labels.ts` against the fixture's own hand rather than hard-coding a string.

- [x] **Step 7: Run both mount specs and the typecheck**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: Vitest exits 0 with 0 failed. `typecheck` reports errors **only** in `src/App.tsx` now — the `recordEncounter` arity and the missing `cheats` prop — both closed in the next task.

### Task 10: Wire the run driver in `src/App.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/App.tsx:72-83, 114-124`

- [x] **Step 1: Adopt the cheats and pass them down**

`handleComplete`'s first line becomes:

```ts
const next = recordEncounter(run, result.encounter, result.cheats)
```

and the mount gains one prop:

```tsx
      cheats={run.cheats}
```

No new state and no new effect. `handleNextFight` needs no change — `advanceRun`'s spread already carries the slots into the next fight (AC3) — and `handleNewRun` needs none either, since `startRun()` re-grants from configuration.

- [x] **Step 2: Typecheck the whole project clean**

Run: `npm run typecheck`
Expected: exits 0, **no errors anywhere**. This is the first clean typecheck since Phase 1 opened the `recordEncounter` arity change.

---

## Phase 5 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, that the two acceptance criteria which are structural rather than behavioural actually hold, and that nothing breached the file budget.

### Task 11: Confirm the Quarry was given nothing (AC10) and the pure boundary holds ✓

- Skill: `none — verification only, no code is written`

- [x] **Step 1: Confirm no Quarry call site passes the bypass**

Run: `Get-ChildItem src\warCouncil,src\app\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "ignoreFollowSuit"`
Expected: hits only in `src\warCouncil\legalMoves.ts` (the interface and its one read), `src\app\warCouncil\roundReducer.ts` (the `commit` call), `src\app\warCouncil\WarCouncilRound.tsx` (the `legal` call), and the two engine spec files. **Zero hits** in `cpuPlayer.ts`, and zero on any line containing `QUARRY_SIDE` — the Quarry's three `legalMoves` calls and its `playCard` call must be argument-free.

Actual: 10 hits — `legalMoves.ts:34,65`, `WarCouncilRound.tsx:105`, `roundReducer.ts:273`, `legalMoves.test.ts:121,129,135`, `playCard.test.ts:295,304,327`. Zero in `cpuPlayer.ts`, zero containing `QUARRY_SIDE`. Matches expected.

- [x] **Step 2: Confirm the pure-core trees took no React and no DOM**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `-Recurse` is required — `Select-String -Path` with `**` reaches exactly one directory level and would silently miss `__tests__`, reporting a false green in the phase that exists to catch this.

Actual: 2 hits, both prose in doc comments referencing `Math.random` to explain it is *not* used — `src\hunt\cheats.ts:3` ("Minted from `RunState.nextCheatId`, never from `Math.random()`") and `src\warCouncil\__tests__\skulls.test.ts:29` ("A deterministic stand-in for Math.random —"). No actual call to `Math.random`, `window.`, `document.`, `localStorage`, or a React import in either tree. Reported as-is per instructions rather than treated as a pass.

- [x] **Step 3: Confirm no tunable was hard-coded**

Run: `Get-ChildItem src\app,src\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "CHEAT_SLOT_COUNT\s*=|RUN_STARTING_CHEATS\s*="`
Expected: zero hits — both keys are declared only in `src\hunt\config.ts`, and every other file imports them.

Actual: zero hits. Matches expected.

### Task 12: Confirm the 400-line budget ✓

- Skill: `none — verification only, no code is written`

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\warCouncil.css,src\app\warCouncil\warCouncilCheats.css,src\app\warCouncil\CheatSlots.tsx,src\hunt\run.ts,src\hunt\cheats.ts,src\hunt\config.ts | ForEach-Object { "$((Get-Content $_).Count) $($_.Name)" }`
Expected: every count **under 400**. `warCouncil.css` must have gone **down** from 398. Use `(Get-Content <path>).Count`, never `Measure-Object -Line` — it drops blank lines and hid a real breach on DLR-63. If any file is over, split it (for `WarCouncilRound.tsx` the split is `deriveHint` into a sibling module); never raise the budget and never add an `eslint-disable`.

Actual: `WarCouncilRound.tsx` 336, `roundReducer.ts` 382, `warCouncil.css` 397, `warCouncilCheats.css` 114, `CheatSlots.tsx` 77, `run.ts` 132, `cheats.ts` 61, `config.ts` 198. All under 400; `warCouncil.css` went down from 398 to 397.

### Task 13: Static gates and the full suite ✓

- Skill: `none — verification only, no code is written`

- [x] **Step 1: Warm the Vitest transform cache, then run everything**

Run: `npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all three exit 0, 0 failed.

Actual (QA): `--project node` 445 passed (29 files); `--project dom` 85 passed (14 files); `npm test` 530 passed (43 files).

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

Actual (QA): both exit 0.

- [x] **Step 3: Check formatting of this contract's files only**

Run: `npx prettier --check src/hunt/cheats.ts src/hunt/run.ts src/hunt/config.ts src/hunt/index.ts src/warCouncil/legalMoves.ts src/warCouncil/playCard.ts src/warCouncil/index.ts src/app/warCouncilMount.ts src/app/warCouncil/CheatSlots.tsx src/app/warCouncil/roundReducer.ts src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/labels.ts src/app/warCouncil/warCouncilCheats.css src/app/warCouncil/warCouncil.css src/App.tsx`
Expected: exits 0. Scoped deliberately — the repo-wide `format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing that is not this ticket's work.

Actual: QA found `src/hunt/cheats.ts` (hand-wrapped `removeCheat` signature) and `src/app/warCouncil/warCouncilCheats.css` (never run through Prettier) failing `--check`. Fixed with `npx prettier --write` on those two files only, then re-ran the command above — exits 0, "All matched files use Prettier code style!". Re-verified `npx vitest run src/hunt/__tests__/cheats.test.ts` (12 passed), `npm run typecheck` (exit 0), `npm run lint` (exit 0) after the reformat. `cheats.ts` is now 58 lines, `warCouncilCheats.css` is 118 lines — both under 400.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Actual (QA): exit 0, `dist/` written in 695ms.

### Task 14: Update the PR description ✓

- Skill: `none — documentation, no code is written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` and `mockup.html` in this folder.
- Summary: two run-level Cheat slots joined to the decree pile on the felt; double click to arm; the next committed card ignores follow-suit and consumes the Cheat.
- **The one breaking change** — `recordEncounter` now takes a required third parameter — and why it is required rather than optional.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes".
- Verification results from Phase 5, with the actual numbers.
- A one-line note for future contributors: **`LegalMoveOptions` is the only sanctioned way to bypass a legality rule, and only the player's call sites may pass it.** DLR-84 adds purchase on top of `addCheat` and `nextCheatId`; it does not need a new rule path.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**
- Two Cheat slots in run state, carried across fights (AC1, AC3) — Tasks 1, 3, 8.
- The Cheat as a held, consumable object rather than a counter — Task 2.
- The two-slot cap; a third card refused (AC2) — Task 2.
- Arm / disarm / commit on double click, armed state visible (AC4, AC5, AC6, AC7) — Tasks 6, 8, 9.
- A bypass through follow-suit, used only when an armed Cheat is committed (AC5, AC7) — Tasks 4, 5, 6.
- The Monarch narrowing still binds (AC8) — Tasks 4, 5 (both have an explicit test).
- Cards granted at run start from configuration (AC3) — Tasks 1, 3.
- Empty slots leave play exactly as today (AC9) — Tasks 4, 5, 6 (the `cheats: []` fixtures and the two "is off by default" tests).
- The Quarry gains nothing (AC10) — Tasks 4, 11 (structural, then grepped).
- Developer's gate red-line: the slots joined to the deck — Tasks 8, 9.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `CheatCard`, `CheatCardId`, `CheatStage`, `CheatSelection`, `LegalMoveOptions`, `ignoreFollowSuit`, `cheatArmed`, `grantCheats`, `addCheat`, `removeCheat`, `hasCheat`, `CHEAT_SLOT_COUNT`, `RUN_STARTING_CHEATS`, `TapCheat`, `CancelCheat`, `cheatAccessibleName`, `CHEAT_RAIL_LABEL`, `CHEAT_EMPTY_SLOT_LABEL`, `CHEAT_ARMED_HINT`, `CHEAT_POISED_HINT`, `.wc-felt-rail`, `.wc-felt-rail-split`, `.wc-cheat-rail`, `.wc-cheat-slots`, `.wc-cheat-slot`, `--wc-cheat-slot-w` — each spelled identically in every task that uses it, and each present in `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- **Phase 1** ends with a tested pure module and two config keys. `src/hunt` type-checks; `App.tsx` carries a known, stated `recordEncounter` arity error — the deliberate cost of making that parameter required, and named at the step that opens it.
- **Phase 2** ends with the engine fully green and every pre-existing engine spec passing untouched, because the new parameter is trailing and optional. No half-applied rename; nothing imports the bypass yet.
- **Phase 3** ends with the reducer wired and tested. Open compiler errors are exactly the mount sites and `App.tsx` that do not yet pass `cheats` — enumerated by the compiler by design, and all closed in Phase 4.
- **Phase 4** ends with `npm run typecheck` clean across the whole project (Task 10 Step 2 asserts precisely this), no dead imports, and the felt rendering the plate.
- **Phase 5** changes no production code.
