# Tasks: Rewrite the 3, the 5 and the 7 so all three are worth playing — for both sides

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-03

> **Note on the mockup:** `mockup.html` in this folder exists and was presented at the approval
> gate, but the `Artifact` publish was refused by the permission classifier, so the developer
> reviewed it as a local file rather than a published link. The approval covers it either way.

**Goal:** Replace the printed rule of the 3, the 5 and the 7 with rules a player would choose to play, give each a mirrored effect in the Quarry's hand, and rework the decree plate and the Swap pile so the two new rules are readable.

**Spec:** `plan.md` in this folder. Layout and interaction for the three changed surfaces: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/hunt/swapPile.ts` — the Swap-pile rule (`swapPileAfterWoodcutter`, `swapCapFor`), out of `run.ts` for its line budget
- `src/hunt/__tests__/swapPile.test.ts` — its spec
- `src/app/warCouncil/potHandlers.ts` — `applyPotAction` / `rollOverAction`, moved out of `commitHandlers.ts` for its line budget
- `src/app/run/useRunTransitions.ts` — `handleBuy` / `handleDrinkFlask` / `leaveForNextFight` / `handleContinue`, moved out of `App.tsx` for its line budget
- `src/warCouncil/__tests__/nameTrump.test.ts` — the 3's engine spec
- `src/warCouncil/__tests__/quarrySwap.test.ts` — the Quarry's 5 engine spec
- `src/warCouncil/__tests__/streak.treasure.test.ts` — the 7's two halves in the streak module
- `src/app/warCouncil/__tests__/roundReducer.treasure.test.ts` — the fight's base-damage figure across tricks
- `src/app/warCouncil/__tests__/roundReducer.swapPile.test.ts` — the Swap-pile bump on a committed 5

**Modified:**
- `src/hunt/config.ts` — four new keys
- `src/hunt/run.ts` — `RunState.discardCapBonus`, `RunState.treasureDamageBonus`, `startRun`
- `src/hunt/runTransitions.ts` — `recordEncounter`'s two new optional parameters, `advanceRun`'s reset
- `src/hunt/index.ts` — re-export the new keys and `swapPile.ts`
- `src/warCouncil/types.ts` — `decree: Card | null`, `AbilityChoiceKind`, `AbilityChoice`, `IllegalMoveReason`
- `src/warCouncil/abilities.ts` — `applyNameTrump` and `applyQuarrySwap` replace `applyFoxExchange` and `applyWoodcutterDraw`
- `src/warCouncil/playCard.ts` — the rank-3 and rank-5 branches, the `treasureTrick` fact
- `src/warCouncil/cpuPlayer.ts` — `chooseCpuTrumpChoice` replaces `chooseCpuFoxChoice`; `chooseCpuWoodcutterChoice` deleted
- `src/warCouncil/encounterDeck.ts` — `closeHand` skips an already-spent decree
- `src/warCouncil/streak.ts` — `TrickFacts.treasureTrick`, `TrickResolution.treasureBonusEarned`, the replaced hit damage
- `src/warCouncil/skulls.ts:105-115` — `trickIsSkulled`'s docblock, which cites the retired Fox path
- `src/warCouncil/timebomb.ts:15-25` — `trickIsPrimed`'s docblock, same citation
- `src/warCouncil/index.ts` — the changed exports
- `src/app/warCouncil/AbilityPrompt.tsx` — the suit picker replaces both branches
- `src/app/warCouncil/DecreePile.tsx` — the suit placeholder
- `src/app/warCouncil/FeltRail.tsx:22,47-64` — the nullable decree prop
- `src/app/warCouncil/cardPlacement.ts:93` — skip a null decree
- `src/app/warCouncil/resolutionView.ts:25-26` — `decree: Card | null`
- `src/app/warCouncil/roundControlsProps.ts:97,119-122,204-206` — decree, prompt props, Swap cap
- `src/app/warCouncil/commitHandlers.ts` — the Swap bump, the 7's accumulation, the pot-handler split
- `src/app/warCouncil/roundReducer.ts:170` — only a 3 arms a prompt
- `src/app/warCouncil/roundUiState.ts` — `discardCapBonus`, `treasureDamageBonus`, `swapJustRaised`, `skullArrivedIn`
- `src/app/warCouncil/roundUiSeed.ts` — seed the two new figures
- `src/app/warCouncil/roundResult.ts` — hand both back
- `src/app/warCouncil/ActionBar.tsx:20,61,133-146` — the "N of M" readout and the raised mark
- `src/app/warCouncil/QuarryShape.tsx` — the skull-arrived mark
- `src/app/warCouncil/WarCouncilTable.tsx:154,192,216-217,282` — the prompt-free predicate, `skullArrivedIn`
- `src/app/warCouncil/labels.ts:85-88,22-23` — the removed reason codes' copy
- `src/app/warCouncil/cardFace.ts:44-56` — rank 7 becomes `RankFaceClass.Act`
- `src/app/warCouncil/cardRuleText.ts:21-31` — the rule text for 3, 5 and 7
- `src/app/warCouncil/warCouncilCards.css` — the prompt's suit rows
- `src/app/warCouncil/warCouncilTable.css` — the decree placeholder
- `src/app/warCouncil/warCouncilActionBar.css` — the raised Swap mark
- `src/app/warCouncil/warCouncilHunt.css` — the skull-arrived mark on `.wc-shape-row` (this is where that selector is declared; `quarryShapeCss.test.ts` reads this file by name)
- `src/app/warCouncilMount.ts` — the two optional props and the two required result fields
- `src/App.tsx` — thread the two figures; extract `useRunTransitions`
- `src/sim/baselinePolicy.ts:232`, `src/sim/cardAwarePolicy.ts:87`, `src/sim/skilledCardPlay.ts:176` — the 5 is prompt-free now
- `src/sim/playRun.ts` — pass the two new figures through `recordEncounter`
- `src/sim/playHand.ts:111-112,214` — the comments naming the Woodcutter prompt
- `src/sim/types.ts:221` — the comment naming "any Fox exchange"
- Existing specs enumerated by the compiler — see each task's `Test:` block

**Deleted:** *(no files; three functions are removed in place)*

**Developer decides or observes:**
- The four transcribed constants — `TREASURE_BASE_DAMAGE_STEP` (1), `QUARRY_TREASURE_DAMAGE` (2), `WOODCUTTER_SWAP_STEP` (1), `QUARRY_SWAP_SKULL_CHANCE` (0.4). Transcribed from the ticket, not chosen; confirm each is a decision rather than a placeholder.
- **Whose 7 counts.** Settled ownership-blind in `plan.md` → Assumptions: any trick that carried a 7 pays whichever side was victorious. The consequence to confirm is that the Quarry's clean 7, taken cleanly by the player, pays the player +1. Approved at the gate; re-open only if that reads wrong in play.
- **Whether the Quarry's 5 may skull a card the player later draws.** Settled narrow in `plan.md` → Assumptions: the skull lands only on the card drawn into the Quarry's own hand. Approved at the gate.
- **Losing the Woodcutter's back-out.** A 5 now commits on its second tap with no prompt, so `the-hunt.md` §5's "Opening the choice does not commit the card" no longer covers it. Approved at the gate; noted here because it is a rule a player currently relies on.
- The Swap control's exact wording ("3 of 3" vs. an alternative), and whether the cap belongs on the control's face or beside it.
- The duration, easing and colour of the raised-Swap mark and the skull-arrived mark on the Quarry's suit-shape row.
- Whether the 7's harp / chalice / sword and the 5's axe still read for their new rules — criterion 14, a visual judgement, on the running app.
- Whether the 3's prompt at its new size still sits right on the felt now that it shows four controls instead of a whole hand.
- Whether the difficulty shift is acceptable, after a simulator comparison across the same seeds before and after this change.

---

## Phase 1 — Configuration and the run's two per-fight figures

Adds the four constants and the two `RunState` fields, plus the pure Swap-pile rule. Nothing reads any of them yet and both fields default to 0, so the game plays bit-identically at this boundary — a safe stopping point that widens before anything cuts.

### Task 1: Add the four configuration keys and the Swap-pile rule ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/swapPile.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/swapPile.test.ts`
- Config: `src/hunt/config.ts` — add `TREASURE_BASE_DAMAGE_STEP`, `QUARRY_TREASURE_DAMAGE`, `WOODCUTTER_SWAP_STEP`, `QUARRY_SWAP_SKULL_CHANCE` (all four values transcribed from the ticket; see "Developer decides or observes")

- [x] **Step 1: Add the four keys to `src/hunt/config.ts`, beside `DISCARDS_PER_FIGHT` and `SKULL_DENSITY`**

Each carries its unit and its provenance, matching the file's existing comment style.

```ts
// DLR-163 AC8 — what one Treasure trick the player BANKED adds to the fight's base damage.
// UNIT: damage per banked Treasure trick. Feeds the SAME term a Whetstone raises, so the two
// stack; unlike a Whetstone this dies at the fight boundary.
export const TREASURE_BASE_DAMAGE_STEP: Damage = 1

// DLR-163 AC10 — damage to the player from a hurt trick that carried a Treasure. REPLACES
// DAMAGE_PER_HIT for that trick rather than adding to it. UNIT: damage per event. This is the
// constant that retires the-hunt.md §8's "damage to the player, per event: 1, every time".
export const QUARRY_TREASURE_DAMAGE: Damage = 2

// DLR-163 AC5 — what one Woodcutter the player plays adds to BOTH the Swap cap and the Swaps
// remaining. UNIT: Swap actions, per Woodcutter played, for the rest of the fight.
export const WOODCUTTER_SWAP_STEP = 1

// DLR-163 AC7 — the chance the card the QUARRY'S Woodcutter draws carries a skull. A PROPORTION
// in 0..1, exactly like SKULL_DENSITY above, NOT a 0..100 percentage. Independent of
// SKULL_DENSITY, which is a property of the DEAL; this one mints a skull mid-hand.
export const QUARRY_SWAP_SKULL_CHANCE = 0.4
```

- [x] **Step 2: Write the failing spec for the Swap-pile rule**

`src/hunt/__tests__/swapPile.test.ts` — pin the two rows AC5 states by name, plus the cap function.

```ts
import { describe, expect, it } from 'vitest'
import { DISCARDS_PER_FIGHT, swapCapFor, swapPileAfterWoodcutter } from '..'

describe('swapPileAfterWoodcutter', () => {
  it('raises a FULL pile rather than refusing it — 3 of 3 becomes 4 of 4', () => {
    expect(swapPileAfterWoodcutter({ discardsRemaining: 3, discardCapBonus: 0 })).toEqual({
      discardsRemaining: 4,
      discardCapBonus: 1,
    })
  })

  it('fills an EMPTY pile by exactly the step — 0 of 3 becomes 1 of 4', () => {
    expect(swapPileAfterWoodcutter({ discardsRemaining: 0, discardCapBonus: 0 })).toEqual({
      discardsRemaining: 1,
      discardCapBonus: 1,
    })
  })

  it('stacks — two Woodcutters give a cap of 5 (AC11)', () => {
    const once = swapPileAfterWoodcutter({ discardsRemaining: 3, discardCapBonus: 0 })
    expect(swapCapFor(swapPileAfterWoodcutter(once).discardCapBonus)).toBe(DISCARDS_PER_FIGHT + 2)
  })
})
```

- [x] **Step 3: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/hunt/__tests__/swapPile.test.ts`
Expected: non-zero exit; the failure names the missing `swapPile` exports, not a wrong value.

- [x] **Step 4: Write `src/hunt/swapPile.ts`**

A separate file rather than an addition to `run.ts`, which stands at 307 lines and gains two field docblocks in Task 2.

```ts
import { DISCARDS_PER_FIGHT, WOODCUTTER_SWAP_STEP } from './config'

/** DLR-163 AC5 — the two figures the Swap control prints, as plain values. This module owns the
 *  rule and must not learn the shape of the layer that calls it — `DiscardStock`'s discipline. */
export interface SwapPile {
  readonly discardsRemaining: number
  readonly discardCapBonus: number
}

/** DLR-163 AC5 — THE statement of what one played Woodcutter does to the Swap pile. BOTH figures
 *  climb by `WOODCUTTER_SWAP_STEP`, which is what makes "never refused for a full pile" true by
 *  construction rather than by a guard: 3 of 3 becomes 4 of 4, and 0 of 3 becomes 1 of 4. */
export function swapPileAfterWoodcutter(pile: SwapPile): SwapPile {
  return {
    discardsRemaining: pile.discardsRemaining + WOODCUTTER_SWAP_STEP,
    discardCapBonus: pile.discardCapBonus + WOODCUTTER_SWAP_STEP,
  }
}

/** DLR-163 AC5 — the cap the Swap control prints, stated once so the control's readout and any
 *  future refusal cannot disagree about what "full" means. */
export function swapCapFor(discardCapBonus: number): number {
  return DISCARDS_PER_FIGHT + discardCapBonus
}
```

- [x] **Step 5: Re-export from `src/hunt/index.ts`**

Add `swapPileAfterWoodcutter`, `swapCapFor` and `type SwapPile` alongside the existing `run.ts` exports, and the four new config keys alongside `DISCARDS_PER_FIGHT`.

- [x] **Step 6: Run the spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__/swapPile.test.ts; npm run typecheck`
Expected: Vitest reports 3 passed, 0 failed; `tsc -b` exits 0.

### Task 2: Add the two per-fight `RunState` figures ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts` (the `RunState` interface and `startRun`'s returned literal), `src/hunt/runTransitions.ts` (`recordEncounter`'s signature and returned spread, `advanceRun`'s returned literal)
- Test: `src/hunt/__tests__/run.discard.test.ts` (extend), `src/hunt/__tests__/run.test.ts` (extend)

- [x] **Step 1: Add both fields to `RunState`, documented against `discardsRemaining`'s contract**

```ts
  /** DLR-163 AC5/AC11 — Swaps added to THIS FIGHT's cap by Woodcutters played. Carried across
   *  every hand within a fight and reset by `advanceRun` at the fight boundary, exactly as
   *  `discardsRemaining` above is; the hand owns it for its life and hands the survivor back
   *  through `WarCouncilRoundResult`. A COUNT of steps, not a total — `swapCapFor` owns the
   *  addition. NEVER persisted, exactly as `coins` above. */
  readonly discardCapBonus: number
  /** DLR-163 AC8/AC11 — base damage earned THIS FIGHT by banking tricks that carried a Treasure.
   *  SUMMED with `baseDamageBonusFor`'s run-permanent Whetstone figure at `playOptions`, never
   *  merged into it: a Whetstone is run-permanent and this dies at the fight boundary. Reset by
   *  `advanceRun`, exactly as `discardsRemaining` is. NEVER persisted, exactly as `coins`. */
  readonly treasureDamageBonus: number
```

- [x] **Step 2: Seed both to 0 in `startRun`'s returned literal**

Beside `discardsRemaining: DISCARDS_PER_FIGHT`:

```ts
    discardCapBonus: 0,
    treasureDamageBonus: 0,
```

- [x] **Step 3: Reset both to 0 in `advanceRun`'s returned literal**

Beside `discardsRemaining: DISCARDS_PER_FIGHT` — AC11's "everything resets when the fight ends".

```ts
    discardCapBonus: 0,
    treasureDamageBonus: 0,
```

- [x] **Step 4: Add the two trailing optional parameters to `recordEncounter`**

Following `feederCarry`'s and `streak`'s precedent exactly, so no existing call site changes.

```ts
  /** DLR-163 AC5 — the fight's Swap cap bonus after this hand. OPTIONAL and defaulted to
   *  `run.discardCapBonus`, mirroring `feederCarry` and `streak` immediately above, so every
   *  existing call site is unchanged. `advanceRun`, not this function, resets it. */
  discardCapBonus?: number,
  /** DLR-163 AC8 — base damage earned this fight after this hand. OPTIONAL and defaulted to
   *  `run.treasureDamageBonus`, for `discardCapBonus`'s stated reason. */
  treasureDamageBonus?: number,
```

and in the returned spread:

```ts
    discardCapBonus: discardCapBonus ?? run.discardCapBonus,
    treasureDamageBonus: treasureDamageBonus ?? run.treasureDamageBonus,
```

- [x] **Step 5: Add specs pinning the carry and the reset**

In `src/hunt/__tests__/run.discard.test.ts`, add a `describe('the fight Swap cap bonus')` block asserting that `startRun` opens at 0, `recordEncounter` with an explicit value adopts it, `recordEncounter` without one keeps the run's, and `advanceRun` resets it to 0. Add the mirror block for `treasureDamageBonus` in `src/hunt/__tests__/run.test.ts`.

- [x] **Step 6: Run the run specs and the typecheck**

Run: `npx vitest run src/hunt/__tests__/run.discard.test.ts src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0. Any `RunState` literal the compiler flags is one of the 7 construction sites the audit named — fix it in this task, not later.

- [x] **Step 7: Confirm `run.ts` is still inside budget**

Run: `(Get-Content src\hunt\run.ts).Count; (Get-Content src\hunt\runTransitions.ts).Count`
Expected: both under 400. `run.ts` was 307 and `runTransitions.ts` 369 before this task; if either crosses, split it here rather than reporting it.

---

## Phase 2 — The 3 names a suit, and the 5 stops opening a prompt

Both changes to `AbilityChoice` land together, because the 3 and the 5 share that type and splitting them would leave a phase boundary where the Woodcutter prompt references a removed choice kind. At this boundary the 3 works end to end and the 5 is temporarily a plain card with no effect at all — the project type-checks and plays, and Phase 3 gives the 5 its two effects.

### Task 3: Retype the decree, the ability choice, and the reject reasons ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/types.ts`
- Test: `src/warCouncil/__tests__/types.test.ts`

- [x] **Step 1: Widen `RoundState.decree` and replace the choice union**

```ts
  /** DLR-163 AC2 — the decree card, or `null` once a Fox has replaced it with a bare suit.
   *  `null` does NOT mean "no trump": `trumpSuit` beside this is always live, and a `null` decree
   *  means the plate shows that suit with no card behind it. The replaced card joins `spentPile`
   *  at the instant it is replaced, so `closeHand` must not spend it a second time. */
  readonly decree: Card | null
```

```ts
export const AbilityChoiceKind = {
  /** DLR-163 AC1 — replaces `FoxExchange`. Carries a SUIT, not a card: nothing leaves the hand.
   *  Naming the suit already in force is accepted and behaves exactly as `DeclineTrump`, which is
   *  enforced in `applyNameTrump` rather than at the prompt so the two cannot disagree. */
  NameTrump: 'nameTrump',
  /** DLR-163 AC1 — replaces `FoxDecline`. */
  DeclineTrump: 'declineTrump',
} as const
export type AbilityChoiceKind = (typeof AbilityChoiceKind)[keyof typeof AbilityChoiceKind]

export type AbilityChoice =
  | { readonly kind: typeof AbilityChoiceKind.NameTrump; readonly suit: Suit }
  | { readonly kind: typeof AbilityChoiceKind.DeclineTrump }
```

`WoodcutterDiscard` is removed outright — DLR-163 AC5 gives the 5 no choice to make.

- [x] **Step 2: Remove the two dead reject reasons from `IllegalMoveReason`**

Delete `InvalidFoxExchangeCard` and `InvalidWoodcutterDiscard`. `MissingAbilityChoice` and `UnexpectedAbilityChoice` stay and their meanings widen — the second now also covers a choice offered with a 5.

- [x] **Step 3: Typecheck and read the failure list**

Run: `npm run typecheck`
Expected: non-zero exit, with errors confined to the readers the audit enumerated — `abilities.ts`, `playCard.ts`, `cpuPlayer.ts`, `encounterDeck.ts`, and the app-layer decree readers. Tasks 4 to 8 clear them; do not silence any with a cast.

### Task 4: Replace the Fox exchange with naming a suit ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/abilities.ts`, `src/warCouncil/playCard.ts:62-73`, `src/warCouncil/encounterDeck.ts:47-58`, `src/warCouncil/index.ts`, `src/warCouncil/skulls.ts:105-115`, `src/warCouncil/timebomb.ts:15-25`
- Test: `src/warCouncil/__tests__/nameTrump.test.ts`, `src/warCouncil/__tests__/abilities.test.ts`, `src/warCouncil/__tests__/playCard.test.ts`, `src/warCouncil/__tests__/deckCycle.test.ts`

- [x] **Step 1: Write the failing spec for the new rule**

`src/warCouncil/__tests__/nameTrump.test.ts` — four assertions, one per clause of AC1 to AC3.

```ts
import { describe, expect, it } from 'vitest'
import { applyNameTrump } from '../abilities'
import { Suit } from '../types'
// build a RoundState through `dealRound` with a seeded rng, as the sibling specs do

describe('applyNameTrump', () => {
  it('AC1 — names any suit and that suit becomes trump, taking nothing from hand', () => {})
  it('AC2 — the decree becomes null and the card it replaced joins the spent pile', () => {})
  it('AC1 — naming the suit already in force returns the state UNCHANGED', () => {})
  it('AC2 — a second 3 on an already-null decree changes trump and spends nothing more', () => {})
})
```

- [x] **Step 2: Run it and confirm it fails on the missing export**

Run: `npx vitest run src/warCouncil/__tests__/nameTrump.test.ts`
Expected: non-zero exit naming `applyNameTrump`.

- [x] **Step 3: Replace `applyFoxExchange` with `applyNameTrump` in `abilities.ts`**

```ts
/**
 * DLR-163 AC1/AC2/AC3 — replaces `applyFoxExchange`. NOTHING leaves the hand: the whole complaint
 * the ticket quotes is that the old rule always cost a card the player wanted.
 *
 * Naming the suit ALREADY IN FORCE returns the state unchanged, which is what makes AC1's "the
 * same as declining" true in code rather than asserted in a comment — and it is enforced here
 * rather than at the prompt so the felt and the engine cannot disagree about it.
 *
 * The replaced decree card joins `spentPile` HERE, at the instant it is replaced (AC2), which is
 * why `closeHand` must skip a `null` decree — see its own docblock. On an already-`null` decree
 * there is no card to spend and nothing is appended.
 */
export function applyNameTrump(state: RoundState, suit: Suit): RoundState {
  if (suit === state.trumpSuit) return state
  return {
    ...state,
    decree: null,
    trumpSuit: suit,
    spentPile: state.decree === null ? state.spentPile : [...state.spentPile, state.decree],
  }
}
```

- [x] **Step 4: Rewrite `playCard.ts`'s rank-3 branch**

Replace the `CardRank.Fox` block's body:

```ts
  if (card.rank === CardRank.Fox) {
    if (!choice) {
      return { ok: false, reason: IllegalMoveReason.MissingAbilityChoice }
    }
    if (choice.kind === AbilityChoiceKind.NameTrump) {
      next = applyNameTrump(next, choice.suit)
    } else if (choice.kind !== AbilityChoiceKind.DeclineTrump) {
      return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
    }
  } else if (choice) {
    return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
  }
```

The whole `CardRank.Woodcutter` branch is deleted, so a choice offered with a 5 now falls into the trailing `UnexpectedAbilityChoice`. `applyWoodcutterDraw`'s import goes with it. The timing is unchanged (AC3) because this still runs before `currentTrick` is extended and before `resolveTrickWinner`.

- [x] **Step 5: Guard `closeHand` against an already-spent decree**

In `src/warCouncil/encounterDeck.ts`:

```ts
    spentPile: [
      ...state.spentPile,
      // DLR-163 AC2 — a Fox that named a suit already sent this card to the spent pile, so a
      // `null` decree spends nothing here. Spending it twice would duplicate a card and break the
      // all-33-conserved invariant `deckCycle.test.ts` pins; skipping it when there IS a card
      // would lose one. This conditional is the whole of the difference.
      ...(state.decree === null ? [] : [state.decree]),
      ...state.hands[PlayerSide.Player],
      ...state.hands[PlayerSide.Cpu],
      ...state.currentTrick.map((t) => t.card),
    ],
```

Also update the function's docblock, which currently says the one rule "covers a Fox exchange (whatever card the Fox left in the decree slot is what gets spent)" — that path no longer exists.

- [x] **Step 6: Rewrite the two docblocks that cite the retired Fox path**

`skulls.ts`'s `trickIsSkulled` and `timebomb.ts`'s `trickIsPrimed` both justify testing the trick rather than the seat by citing "the Quarry's Fox can exchange a skulled card into the decree and the player's Fox can later take that decree into hand". No card is ever moved onto the decree any more, so that path is gone. Keep the trick-shaped test — it is still the right shape and needs no special case — and rewrite each docblock to say the path closed on DLR-163 and that the test is retained because it is total, not because that path exists.

- [x] **Step 7: Update `src/warCouncil/index.ts`'s exports**

`applyFoxExchange` and `applyWoodcutterDraw` out; `applyNameTrump` in.

- [x] **Step 8: Fix the existing engine specs the compiler names**

`abilities.test.ts`, `playCard.test.ts`, `deckCycle.test.ts` and `handRefill.test.ts` all build Fox or Woodcutter choices. Rewrite each to the new choice shape; **do not delete a case** — a Woodcutter case that tested the draw-and-bury becomes a case asserting a 5 now plays with no choice and moves no card, and `deckCycle.test.ts`'s all-33 assertion must gain a case where a 3 has nulled the decree.

- [x] **Step 9: Run the engine specs and the typecheck**

Run: `npx vitest run src/warCouncil --project node; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0 for `src/warCouncil/` (app-layer errors remain until Tasks 6–8).

### Task 5: Teach the Quarry to name a suit ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts:88-116`
- Test: `src/warCouncil/__tests__/cpuPlayer.test.ts`, `src/warCouncil/__tests__/quarryIntent.test.ts`

- [x] **Step 1: Replace `chooseCpuFoxChoice` with `chooseCpuTrumpChoice`**

AC4's rule is the existing heuristic with the exchange removed — the suit it holds most of, declining when that is already trump. It no longer needs a hand card, so the empty-hand guard goes: a 3 played as the last card can still name a suit.

```ts
/**
 * DLR-163 AC4 — the Quarry names the suit it holds MOST of, and declines when that suit is
 * already trump. This is `chooseCpuFoxChoice`'s own heuristic with the cost removed: it no longer
 * has to give up a card, so the empty-hand decline it used to need is gone — a 3 played as the
 * Quarry's last card can still change trump.
 *
 * Ties break on `ALL_SUITS` order through `reduce`'s strict `>`, unchanged, so the choice stays
 * deterministic and a seeded encounter reproduces it.
 */
export function chooseCpuTrumpChoice(
  handAfterFox: readonly Card[],
  trumpSuit: Suit,
): AbilityChoice {
  const strongest = ALL_SUITS.map((suit) => ({
    suit,
    count: cardsOfSuit(handAfterFox, suit).length,
  })).reduce((best, row) => (row.count > best.count ? row : best))
  if (strongest.count === 0 || strongest.suit === trumpSuit) {
    return { kind: AbilityChoiceKind.DeclineTrump }
  }
  return { kind: AbilityChoiceKind.NameTrump, suit: strongest.suit }
}
```

- [x] **Step 2: Delete `chooseCpuWoodcutterChoice` and simplify `chooseCpuMove`**

The Woodcutter branch and its `drawCards` preview both go; only the Fox branch remains.

```ts
export function chooseCpuMove(state: RoundState, side: PlayerSide): CpuMove {
  const card = chooseCpuCard(state, side)
  if (card.rank === CardRank.Fox) {
    return { card, choice: chooseCpuTrumpChoice(removeCard(state.hands[side], card), state.trumpSuit) }
  }
  return { card }
}
```

- [x] **Step 3: Update the CPU specs**

`cpuPlayer.test.ts` has 6 `AbilityChoiceKind.` references. Rewrite the Fox cases to the new shape and assert AC4's two clauses by name; replace the Woodcutter-choice cases with one asserting `chooseCpuMove` returns no `choice` for a rank 5.

- [x] **Step 4: Run the CPU specs and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts src/warCouncil/__tests__/quarryIntent.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; no new `tsc` error in `src/warCouncil/`.

### Task 6: Rebuild the ability prompt as a suit picker ✓

- Skill: `react-frontend`, and `game-ux` for the roving-tabindex and tap-cost floors
- Layout, copy and interaction per `mockup.html`'s "The 3 — name a suit" section in this folder.

**Files:**
- Modify: `src/app/warCouncil/AbilityPrompt.tsx`, `src/app/warCouncil/warCouncilCards.css`
- Test: `src/app/warCouncil/__tests__/AbilityPrompt.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.abilityCancel.test.tsx`

- [x] **Step 1: Rewrite the component to one branch with four controls**

Both the Fox and Woodcutter branches go. The new props are `card`, `trumpSuit`, `onChoose`, `onCancel` — `decree`, `hand`, `drawnCard` and `primedCards` are all removed. Keep `attachGroup` and its focus guard **verbatim**, and keep `useRovingTabIndex(count, () => true, onCancel)` with `count = ALL_SUITS.length + 1`. Keep the cancel button outside `.wc-prompt-row` and rendered last, for the reason its existing comment gives. The suit already in force is still offered and is marked with a dashed edge **and** the words "already trump", so the state does not read by colour alone.

- [x] **Step 2: Add the suit-row styles to `warCouncilCards.css`**

Rules for `.wc-suit-choice`, its per-suit glyph colour from the existing `--wc-bells` / `--wc-keys` / `--wc-moons` tokens, and the `[data-inforce]` dashed treatment. Minimum target 44×44px, `:focus-visible` outlines, `@media (hover: hover)` around the hover state, `touch-action: manipulation` — per `react-frontend`'s accessibility floor.

- [x] **Step 3: Rewrite the prompt spec**

`AbilityPrompt.test.tsx` — query by role and accessible name. Assert: three suit buttons plus a decline button are rendered; clicking a suit calls `onChoose` with `{ kind: NameTrump, suit }`; clicking decline calls it with `{ kind: DeclineTrump }`; `ArrowRight` moves focus within the group and `Escape` calls `onCancel`; the suit currently in force renders its "already trump" wording.

- [x] **Step 4: Run the prompt specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/AbilityPrompt.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.abilityCancel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed.

### Task 7: Render the decree as a suit placeholder ✓

- Skill: `react-frontend`, and `game-ux` for the "state reads without colour alone" floor
- Layout per `mockup.html`'s decree plate.

**Files:**
- Modify: `src/app/warCouncil/DecreePile.tsx`, `src/app/warCouncil/FeltRail.tsx:22,47-64`, `src/app/warCouncil/warCouncilTable.css`
- Test: `src/app/warCouncil/__tests__/MotionAnchors.test.tsx`, and a new `describe` in `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx`

- [x] **Step 1: Accept a nullable decree in `DecreePile.tsx`**

`decree: Card | null`. When it is `null`, render a `.wc-decree-marker` in the card's own footprint — the suit glyph and the suit name — instead of the `PlayingCard`, keeping the two decorative backs and the trump chip exactly as they are so the plate does not reflow. The `useMotionAnchor` calls are unconditional, before the branch, per this codebase's hook rules. The marker carries `role="img"` and an `aria-label` naming the suit, so a screen reader is told what the plate now holds.

Delete the component's DLR-157 carve-out comment about the Fox exchange's two-flight commit: no card is moved onto the decree any more, so the case it documents is unreachable. Say so in one line rather than deleting silently.

- [x] **Step 2: Widen `FeltRail.tsx`'s prop and pass it through**

`readonly decree: Card | null`. `decreePrimed` stays a boolean; its caller already computes it and Task 8 guards that read.

- [x] **Step 3: Style the marker in `warCouncilTable.css`**

A dashed brass border and the suit glyph, sharing the card's box dimensions from the existing custom properties rather than a new fixed size. Form as well as colour — the dashed edge is what distinguishes it in greyscale.

- [x] **Step 4: Add the placeholder assertion**

In `WarCouncilRound.readouts.test.tsx`, add a case mounting with a `null` decree and asserting the plate exposes the suit's accessible name and no card.

- [x] **Step 5: Typecheck and run the felt specs**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx src/app/warCouncil/__tests__/MotionAnchors.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed.

### Task 8: Clear the remaining nullable-decree readers and the rank-5 prompt ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/cardPlacement.ts:93`, `src/app/warCouncil/resolutionView.ts:25-26`, `src/app/warCouncil/roundControlsProps.ts:119-122,204-206`, `src/app/warCouncil/commitHandlers.ts:187-188`, `src/app/warCouncil/roundReducer.ts:170`, `src/app/warCouncil/WarCouncilTable.tsx:216-217`, `src/app/warCouncil/TrickResolutionScreen.tsx` (comment), `src/app/warCouncil/labels.ts:85-88`
- Test: `src/app/warCouncil/__tests__/cardPlacement.test.ts`, `src/app/warCouncil/__tests__/roundReducer.test.ts`, `src/app/warCouncil/__tests__/roundFixture.ts`, `src/app/warCouncil/__tests__/labels.test.ts`, `src/app/warCouncil/__tests__/TrickResolutionScreen.test.tsx`

- [x] **Step 1: Skip a null decree in the placement map**

`cardPlacement.ts` line 93 currently writes `map.set(cardKey(state.decree), …)` unconditionally. Guard it — a `null` decree has no card key, and calling `cardKey(null)` would throw inside a render.

```ts
  // DLR-163 AC2 — a decree replaced by a suit marker has no card to place. Guarded rather than
  // defaulted: `cardKey` takes a `Card` and a fabricated stand-in would collide with a real card.
  if (state.decree !== null) map.set(cardKey(state.decree), { kind: PlaceKind.DecreePlate })
```

- [x] **Step 2: Widen `ResolutionView.decree` and its producer**

`resolutionView.ts` → `readonly decree: Card | null`, with its AC7 docblock extended to say a `null` decree means the trick resolved under a suit marker. `commitHandlers.ts:188` needs no change beyond the type flowing through.

- [x] **Step 3: Narrow the prompt to rank 3 only, in both readers**

`roundReducer.ts:170` currently arms a prompt for `CardRank.Fox || CardRank.Woodcutter`; drop the Woodcutter clause. `WarCouncilTable.tsx:216-217` excludes both ranks from its prompt-free predicate; drop the Woodcutter clause there too, so a 5 commits on its second tap like any plain card.

- [x] **Step 4: Rebuild the prompt's props in `roundControlsProps.ts`**

The `AbilityPrompt` prop assembly at lines 204-206 loses `decree`, `hand`, `drawnCard` and `primedCards` and gains `trumpSuit: ui.round.trumpSuit`. Line 122's `isPrimed(ui.round.primedCards, ui.round.decree)` must guard the null: a `null` decree is never primed.

```ts
    decreePrimed: ui.round.decree !== null && isPrimed(ui.round.primedCards, ui.round.decree),
```

- [x] **Step 5: Remove the two dead reason-code labels**

`labels.ts:87-88` maps `InvalidFoxExchangeCard` and `InvalidWoodcutterDiscard` to copy. Both keys are gone from the union, so both rows are removed; the map is a total `Record` over the union, so the compiler proves nothing else is left dangling.

- [x] **Step 6: Fix the test fixtures the compiler names**

`roundFixture.ts` and the six `roundReducer.*.test.ts` files build ability choices and read `decree`. Rewrite each to the new shape and keep every case; add one asserting that tapping a 5 twice commits it directly with no prompt.

- [x] **Step 7: Typecheck the whole project and run the app-layer suite**

Run: `npm run typecheck; npx vitest run src/app/warCouncil`
Expected: `tsc -b` exits 0 across the whole project for the first time since Task 3; Vitest reports 0 failed.

---

## Phase 3 — The 5's two effects

Gives the 5 its rules on both sides of the table: the player's Swap pile grows, and the Quarry's swap can mint a skull. Two files at their 400-line ceiling are split in the tasks that grow them, so the phase ends inside budget as well as type-checking.

### Task 9: The Quarry's swap, with its seeded skull roll ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/abilities.ts`, `src/warCouncil/playCard.ts`, `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/quarrySwap.test.ts`, `src/warCouncil/__tests__/deckCycle.test.ts`

- [x] **Step 1: Write the failing spec**

`src/warCouncil/__tests__/quarrySwap.test.ts` — five cases, each naming its criterion.

```ts
describe('applyQuarrySwap', () => {
  it('AC7 — swaps one card: the named card leaves the Quarry hand and one drawn card arrives', () => {})
  it('AC7 — the swapped card goes to the BOTTOM of the draw pile, as applyDiscard does', () => {})
  it('AC7 — on a hit, the DRAWN card joins skulledCards', () => {})
  it('AC7 — a drawn rank 1 is never skulled even on a hit, because its weight is 0', () => {})
  it('is reproducible: the same drawSeed and tricksPlayed give the same roll every call', () => {})
})
```

- [x] **Step 2: Run it and confirm it fails on the missing export**

Run: `npx vitest run src/warCouncil/__tests__/quarrySwap.test.ts`
Expected: non-zero exit naming `applyQuarrySwap`.

- [x] **Step 3: Write `applyQuarrySwap` in `abilities.ts`**

```ts
/**
 * DLR-163 AC7 — the QUARRY'S Woodcutter, and only the Quarry's. The player's 5 has no engine
 * effect at all: it raises a run figure this tree has never been allowed to see, and
 * `commitHandlers.ts` applies that.
 *
 * The swap itself is `applyDiscard`'s shape for one card — through `drawCards`, the single draw
 * primitive, so a mid-hand reshuffle is inherited rather than restated, and the swapped card goes
 * to the BOTTOM of whatever pile the draw left.
 *
 * The skull is the first randomness this tree has ever needed inside `playCard`, which takes no
 * generator. Rather than thread one through every call site, the roll is drawn from
 * `state.drawSeed` — which exists precisely so mid-hand randomness is reproducible — mixed with
 * `state.tricksPlayed`, so each trick gets its own stable value and a seeded encounter reproduces
 * its minted skulls exactly as it reproduces its reshuffles. `drawSeed` is READ, never advanced,
 * so the existing reshuffle sequence for a given seed is bit-identical after this change.
 *
 * EXACTLY ONE `rng()` call, before the swap, so the roll cannot depend on how many times the
 * generator was consumed. `skullableCards` decides whether the drawn rank may carry a skull —
 * "never rank 1" is `SKULL_RANK_WEIGHTS[1] === 0` and lives in the curve, never restated here.
 */
export function applyQuarrySwap(state: RoundState, swapped: Card): RoundState
```

Implementation order inside the function: build the generator, take the one roll, `drawCards(state, 1)`, remove `swapped` from the Quarry hand and append the drawn card, bottom `swapped` onto `draw.drawPile`, and append the drawn card to `skulledCards` when the roll hit **and** `skullableCards([drawn]).length > 0`. An exhausted deck returns no drawn card; follow `applyWoodcutterDraw`'s documented posture — the hand shrinks by one and nothing throws — and carry that note across.

- [x] **Step 4: Call it from `playCard.ts` for the Quarry only**

Between the rank-3 branch and the trailing `else if (choice)`:

```ts
  } else if (card.rank === CardRank.Woodcutter && side === QUARRY_SIDE) {
    // DLR-163 AC7 — asymmetric BY DESIGN, and the one place in this tree that is. AC5 gives the
    // player's 5 an effect on a run figure the card layer cannot see, so the player's 5 does
    // nothing here and `commitHandlers.ts` owns it. `QUARRY_SIDE` exists for exactly this.
    next = applyQuarrySwap(next, chooseQuarrySwapCard(next.hands[side]))
```

`chooseQuarrySwapCard` is the lowest-ranked held card, mirroring the deleted `chooseCpuWoodcutterChoice`'s stated "keep your best cards" default. Put it in `cpuPlayer.ts` and import it, so the Quarry's judgement stays in the Quarry's module; a Quarry holding nothing after the 5 is a no-op.

- [x] **Step 5: Run the new spec, the deck-cycle spec and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/quarrySwap.test.ts src/warCouncil/__tests__/deckCycle.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed. `deckCycle.test.ts`'s all-33-conserved assertion is the one that proves the swap did not duplicate or lose a card.

### Task 10: Raise the Swap pile on a committed 5, and split `commitHandlers.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/potHandlers.ts`
- Modify: `src/app/warCouncil/commitHandlers.ts`, `src/app/warCouncil/roundReducer.ts:8-33,138-152`, `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/roundUiSeed.ts`, `src/app/warCouncil/roundResult.ts`, `src/app/warCouncilMount.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.swapPile.test.ts`, `src/app/warCouncil/__tests__/roundResult.test.ts`

- [x] **Step 1: Move the two pot handlers out first, before growing the file**

Cut `applyPotAction` and `rollOverAction` — with their docblocks — from `commitHandlers.ts` into a new `src/app/warCouncil/potHandlers.ts`, and repoint `roundReducer.ts`'s import. A pure move: no behaviour changes, and every docblock travels with its function. This is done **before** the additions below so the file never crosses its budget mid-task.

- [x] **Step 2: Confirm the split landed inside budget**

Run: `(Get-Content src\app\warCouncil\commitHandlers.ts).Count; (Get-Content src\app\warCouncil\potHandlers.ts).Count; npm run typecheck`
Expected: `commitHandlers.ts` comfortably under 400 (it was 399); `potHandlers.ts` well under; `tsc -b` exits 0.

- [x] **Step 3: Add the two per-fight figures and the raised mark to `RoundUiState`**

```ts
  /** DLR-163 AC5 — the fight's Swap cap bonus, mirrored from the mount's opening prop and climbed
   *  by each Woodcutter the player commits. Run state carried for the life of the hand and handed
   *  back through `WarCouncilRoundResult` — the same contract `discardsRemaining` documents. */
  readonly discardCapBonus: number
  /** DLR-163 AC8 — base damage earned this FIGHT so far. Mirrored from the mount's opening prop
   *  and climbed by each banked trick that carried a Treasure. Unlike `baseDamageBonus` beside it,
   *  which is a Whetstone figure a hand cannot change, this one IS written during a hand. */
  readonly treasureDamageBonus: number
  /** DLR-163 AC6 — the Swap pile climbed on the last committed card, so the control marks where
   *  the addition went. Set by `commit` and cleared by the next commit, NOT by a timer: a
   *  timeout-driven flash would need cleanup, would double-fire under StrictMode's development
   *  double-mount, and would strand the mark if the felt unmounted mid-flash. */
  readonly swapJustRaised: boolean
```

Seed all three in `roundUiSeed.ts` from new **optional** `RoundUiSeed` fields defaulting to `0` / `0` / `false`, following `feederCarry`'s precedent so no existing seed fixture changes.

- [x] **Step 4: Apply the bump in `commit`**

After a successful `playCard` and before the result is assembled:

```ts
  // DLR-163 AC5 — the PLAYER'S 5 only. The rule itself is `swapPileAfterWoodcutter`, in
  // `src/hunt/`, so the arithmetic is unit-testable with no renderer and the reducer holds no
  // reading of its own. `commit` is the single place a player's card is committed, which is what
  // makes one call site sufficient.
  const raisedSwap = cardToPlay.rank === CardRank.Woodcutter
  const swap = raisedSwap
    ? swapPileAfterWoodcutter({
        discardsRemaining: state.discardsRemaining,
        discardCapBonus: state.discardCapBonus,
      })
    : { discardsRemaining: state.discardsRemaining, discardCapBonus: state.discardCapBonus }
```

Spread `discardsRemaining: swap.discardsRemaining`, `discardCapBonus: swap.discardCapBonus` and `swapJustRaised: raisedSwap` into `settled`. Note in a comment that the discard action's own decrement (`discardHandlers.ts`) is untouched and the two never run in the same transition.

- [x] **Step 5: Hand both figures back and thread the mount contract**

`roundResult.ts` gains `discardCapBonus: ui.discardCapBonus` and `treasureDamageBonus: ui.treasureDamageBonus`. `warCouncilMount.ts` gains the two **optional** props (defaulted to 0, documented against `feederCarry`) and the two **required** result fields (documented against `feederCarry`'s "so the compiler enumerates every construction site").

- [x] **Step 6: Write the reducer spec**

`roundReducer.swapPile.test.ts` — committing a 5 raises both figures by one; committing it at 0 remaining gives 1 of 4; committing it at full gives 4 of 4; `swapJustRaised` is true after that commit and false after the next; committing any other rank changes neither figure.

- [x] **Step 7: Run the specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.swapPile.test.ts src/app/warCouncil/__tests__/roundResult.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 11: Show the cap on the Swap control and the skull on the Quarry's shape ✓

- Skill: `react-frontend`, and `game-ux` for the greyscale and "no panel with nothing to say" floors
- Layout and treatment per `mockup.html`'s "The 5 — the Swap pile grows" and "The Quarry's 5" sections.

**Files:**
- Modify: `src/app/warCouncil/ActionBar.tsx:20,61,133-146`, `src/app/warCouncil/QuarryShape.tsx`, `src/app/warCouncil/roundControlsProps.ts:97`, `src/app/warCouncil/WarCouncilTable.tsx:154,282`, `src/app/warCouncil/warCouncilActionBar.css`, `src/app/warCouncil/warCouncilHunt.css`
- Test: `src/app/warCouncil/__tests__/ActionBar.test.tsx`, `src/app/warCouncil/__tests__/QuarryShape.test.tsx`, `src/app/warCouncil/__tests__/quarryShapeCss.test.ts`

- [x] **Step 1: Print the cap and mark the raise on the Swap control**

`ActionBar.tsx` gains `swapCap: number` and `swapJustRaised: boolean`. The count line changes from `{discardsRemaining} left` to the "N of M" form, with `swapCapFor` supplying the cap through `roundControlsProps.ts`. The raised state adds a class carrying a thickened border **and** a boxed count, so it survives a greyscale screenshot; the transition is CSS-only and is disabled under `@media (prefers-reduced-motion: reduce)`.

- [x] **Step 2: Mark the suit whose skulled count just climbed**

`QuarryShape.tsx` gains `skullArrivedIn: Suit | null`. `WarCouncilTable.tsx` derives it by comparing the resolved trick's skulled count per suit against the previous render's — take it from the reducer rather than a ref, so it is a plain value and StrictMode's double render recomputes the same answer. The mark is a border colour **and** a visible word in the row, plus screen-reader text through the existing `.wc-sr-only` span, so a player using a reader is told a skull arrived.

- [x] **Step 3: Add both CSS rules and keep the drift spec honest**

`quarryShapeCss.test.ts` pins the shape row's tokens; extend it rather than working around it.

- [x] **Step 4: Update the two component specs**

`ActionBar.test.tsx` asserts the "N of M" readout at cap 3 and at cap 4, and that the raised class is present only when `swapJustRaised`. `QuarryShape.test.tsx` asserts the mark and its accessible text appear only for the named suit.

- [x] **Step 5: Run the component specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/ActionBar.test.tsx src/app/warCouncil/__tests__/QuarryShape.test.tsx src/app/warCouncil/__tests__/quarryShapeCss.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed.

### Task 12: Thread both figures through the run driver, and split `App.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/run/useRunTransitions.ts`
- Modify: `src/App.tsx`, `src/sim/playRun.ts`
- Test: `src/__tests__/App.test.tsx`, `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Move the four run-transition handlers out first, before growing the file**

Cut `leaveForNextFight`, `handleContinue`, `handleBuy` and `handleDrinkFlask` from `App.tsx` into `src/app/run/useRunTransitions.ts` as one `use*` hook taking the state setters it needs and returning the four callbacks. A pure move — no behaviour change — done before the additions below so the file never crosses its budget mid-task. `src/app/run/` is where every other run-screen hook already lives (`useShopSlot`, `useManageBuffs`, `useSlotSpin`).

- [x] **Step 2: Confirm the split landed inside budget**

Run: `(Get-Content src\App.tsx).Count; (Get-Content src\app\run\useRunTransitions.ts).Count; npm run typecheck`
Expected: `App.tsx` comfortably under 400 (it was 399); `tsc -b` exits 0.

- [x] **Step 3: Pass both figures down and record both back**

The `<WarCouncilRound>` mount gains `discardCapBonus={run.discardCapBonus}` and `treasureDamageBonus={run.treasureDamageBonus}`; `handleComplete`'s `recordEncounter` call gains `result.discardCapBonus` and `result.treasureDamageBonus` as its tenth and eleventh arguments.

- [x] **Step 4: Mirror the same threading in the simulator's run driver**

`src/sim/playRun.ts` calls `recordEncounter` with the same trailing arguments, so a simulated run carries both figures exactly as a played one does. Without this the simulator measures the pre-change game and silently reports the wrong figures — which is the specific failure this ticket exists to make impossible.

- [x] **Step 5: Run the driver specs and the typecheck**

Run: `npx vitest run src/__tests__/App.test.tsx src/sim/__tests__/simulate.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 4 — The 7

Two facts about a completed trick, derived in one place and consumed in two. The phase ends with the 7 live end to end and the hand fan's damage preview inheriting it with no arithmetic of its own.

### Task 13: The Treasure fact in the streak module ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/streak.ts`
- Test: `src/warCouncil/__tests__/streak.treasure.test.ts`, `src/warCouncil/__tests__/streak.test.ts`, `src/warCouncil/__tests__/streak.buffs.test.ts`, `src/warCouncil/__tests__/streak.formula.test.ts`, `src/warCouncil/__tests__/streak.integration.test.ts`, `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Write the failing spec for both halves**

`src/warCouncil/__tests__/streak.treasure.test.ts` — six cases against the four outcomes.

```ts
describe('a trick that carried a Treasure', () => {
  it('AC10 — a clean loss costs QUARRY_TREASURE_DAMAGE, not DAMAGE_PER_HIT', () => {})
  it('AC10 — an eaten skull costs QUARRY_TREASURE_DAMAGE too: both are hurt tricks', () => {})
  it('AC8 — a clean win reports treasureBonusEarned', () => {})
  it('AC8 — a dodge reports treasureBonusEarned: banked is banked, however it got there', () => {})
  it('AC8/AC9 — a hurt trick reports treasureBonusEarned false and costs 2', () => {})
  it('a trick with no Treasure is unchanged in both respects', () => {})
})
```

- [x] **Step 2: Run it and confirm it fails on the missing fields**

Run: `npx vitest run src/warCouncil/__tests__/streak.treasure.test.ts`
Expected: non-zero exit naming `treasureTrick` / `treasureBonusEarned`.

- [x] **Step 3: Add `TrickFacts.treasureTrick` and `TrickResolution.treasureBonusEarned`**

Both with the docblocks `plan.md` Part 2 → Data shapes states. `treasureTrick` is REQUIRED, following `buffs`' stated reason.

- [x] **Step 4: Use the fact in `resolveTrickBank`**

Exactly two uses and no more:

```ts
  // DLR-163 AC10 — a Treasure REPLACES the flat hit rather than adding to it. This is the line
  // that retires the-hunt.md §8's "damage to the player, per event: 1, every time" — every
  // readout, projection and simulator figure that assumed exactly 1 has to stop assuming it.
  // The Timebomb term beside it is unaffected: it is a separate event with its own amount.
  const hitDamage = trick.treasureTrick ? QUARRY_TREASURE_DAMAGE : DAMAGE_PER_HIT
  const damageToPlayer = (trickHit ? hitDamage : 0) + trick.timebombToPlayer
```

and, in the returned record:

```ts
    // DLR-163 AC8 — reported OUT, never applied here. The fight's base-damage figure is RUN state
    // and this module has never been allowed to see one — the same contract `baseDamageBonus`
    // states from the other direction. `taken` is the outcome axis, which is exactly AC9's
    // "victorious means the outcome axis, not the mechanical one".
    treasureBonusEarned: trick.treasureTrick && taken,
```

- [x] **Step 5: Add the field to the five test helpers**

Each `facts()` / `Partial<TrickFacts>` helper gains `treasureTrick: false`, and `cardDamage.ts`'s `shared` literal is handled in Task 14. These are the construction sites the audit counted; the compiler enumerates any it missed.

- [x] **Step 6: Run the streak specs and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/streak.treasure.test.ts src/warCouncil/__tests__/streak.test.ts src/warCouncil/__tests__/streak.buffs.test.ts src/warCouncil/__tests__/streak.formula.test.ts src/warCouncil/__tests__/streak.integration.test.ts src/warCouncil/__tests__/rankTiers.resolution.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed.

- [x] **Step 7: Confirm `streak.ts` is still inside budget**

Run: `(Get-Content src\warCouncil\streak.ts).Count`
Expected: under 400. It was 367; if the additions cross it, split the four-outcome table's helpers out here rather than reporting the breach.

### Task 14: Derive the fact, and let the preview inherit it ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/playCard.ts`, `src/app/warCouncil/cardDamage.ts:103-122`
- Test: `src/warCouncil/__tests__/playCard.bank.test.ts`, `src/app/warCouncil/__tests__/cardDamage.test.ts`

- [x] **Step 1: Derive `treasureTrick` in `playCard.ts` beside its two siblings**

```ts
      // DLR-163 AC8/AC10 — a fact about the TRICK, derived where `trickIsSkulled` and
      // `trickIsPrimed` beside it are. OWNERSHIP-BLIND deliberately: AC8 says "a trick you were
      // victorious on THAT CARRIED a 7" and AC10 mirrors it, and exactly one side is victorious
      // on the outcome axis each trick, so whose card it was decides nothing (`plan.md`
      // Part 1 → Assumptions made).
      treasureTrick: completedTrick.some((t) => t.card.rank === CardRank.Treasure),
```

- [x] **Step 2: Add the same derivation to the hand fan's preview**

`cardDamage.ts`'s `shared: Omit<TrickFacts, 'playerWon'>` literal gains `treasureTrick: visible.some((t) => t.card.rank === CardRank.Treasure)`, so the win and lose branches both see it and the preview's "this card costs 2" is right for a Treasure trick.

- [x] **Step 3: Add the two assertions**

`playCard.bank.test.ts` — a hurt trick carrying a Treasure costs 2 and a banked one reports the bonus. `cardDamage.test.ts` — the lose branch of a preview against a Treasure lead reads 2, not 1.

- [x] **Step 4: Run both specs and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/playCard.bank.test.ts src/app/warCouncil/__tests__/cardDamage.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed.

### Task 15: Accumulate the fight's base damage and feed it back in ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts` (`playOptions` and both resolution sites in `commit`)
- Test: `src/app/warCouncil/__tests__/roundReducer.treasure.test.ts`

- [x] **Step 1: Write the failing spec**

`roundReducer.treasure.test.ts` — four cases:

```ts
describe('the fight base-damage figure', () => {
  it('AC8 — banking a Treasure trick climbs it by TREASURE_BASE_DAMAGE_STEP', () => {})
  it("AC8 — the climb applies to the NEXT trick's damage, not to the trick that earned it", () => {})
  it('AC11 — three banked Treasure tricks give +3', () => {})
  it('AC8 — it SUMS with the Whetstone figure rather than replacing it', () => {})
})
```

- [x] **Step 2: Sum both figures in `playOptions`**

```ts
    // DLR-163 AC8 — the Whetstone's run-permanent figure PLUS this fight's earned figure, summed
    // in the ONE assembly all three readers share: the player's commit, the Quarry's follow, and
    // `cardDamage.ts`'s preview. That is what makes the preview inherit the 7 with no arithmetic
    // of its own. Kept as two fields on the state and summed here rather than merged into one:
    // a Whetstone lasts the run and this dies at the fight boundary.
    baseDamageBonus: state.baseDamageBonus + state.treasureDamageBonus,
```

- [x] **Step 3: Climb the figure at both resolution sites**

`commit` resolves a trick in two places — the player's own follow, and the Quarry's automatic follow after a player lead. Both read `resolution.treasureBonusEarned` and add `TREASURE_BASE_DAMAGE_STEP`. Because `playOptions(settled)` is re-read for the Quarry's follow, the second site must be handed the state whose figure has **not** yet climbed for the trick it is about to resolve — that is AC8's "for the rest of the fight" and the reason the two orderings are not interchangeable. State this in a comment at both sites.

- [x] **Step 4: Run the spec and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.treasure.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed.

- [x] **Step 5: Confirm `commitHandlers.ts` is still inside budget**

Run: `(Get-Content src\app\warCouncil\commitHandlers.ts).Count`
Expected: under 400. Task 10 moved two handlers out; if the phase's additions cross the line again, split further here.

---

## Phase 5 — The faces and the copy

The 7 stops printing "no rule" and all three ranks get their new rule text. No logic changes, so this phase's only risk is a drift spec.

### Task 16: Make the 7 an acting face and rewrite the three rule texts ✓

- Skill: `react-frontend`
- Face treatment per `mockup.html`'s "The three faces" section, which shows the 7 before and after.

**Files:**
- Modify: `src/app/warCouncil/cardFace.ts:44-56`, `src/app/warCouncil/cardRuleText.ts:21-31`
- Test: `src/app/warCouncil/__tests__/cardFace.test.ts`, `src/app/warCouncil/__tests__/cardRuleText.test.ts`, `src/app/warCouncil/__tests__/CardAbilityTip.test.tsx`

- [x] **Step 1: Flip rank 7's face class**

```ts
  7: {
    // DLR-163 AC12 — was `RankFaceClass.Inert`. The no-rule mark comes off BY CONSTRUCTION:
    // `printedRects` pushes `noRuleMark` only for an Inert face, and `cardActs` is already
    // `faceClass === Act`, so the tooltip's "this card does something" branch follows too.
    // The three per-suit figures are UNCHANGED — `RankFace.figure` already accepts a record and
    // `printedRects` branches on `figure !== null`, not on the class. Whether the harp, chalice
    // and sword still read for the new rule is criterion 14 and is the developer's.
    faceClass: RankFaceClass.Act,
    name: 'Treasure',
    figure: { bells: 'harp', keys: 'chalice', moons: 'sword' },
  },
```

Update `cardActs`'s docblock, which currently says "the Treasure is named and does not act, which is the whole point of this ticket" — that ticket's point has been superseded.

- [x] **Step 2: Rewrite the three rule texts**

```ts
  3: 'On playing it, you may name any suit; that suit becomes the new trump suit and the decree becomes a marker showing it. You give up nothing. You may decline.',
  5: 'On playing it, your Swap pile gains one — both the cap and the Swaps you have left — for the rest of the fight.',
  7: 'A trick you were victorious on that carried a Treasure adds 1 to your base damage for the rest of the fight. A trick that hurt you and carried one costs 2 health instead of 1.',
```

`NO_RULE_MARK_LABEL` stays exported and stays applied to rank 8, which is still an unnamed plain card. The wording is placeholder copy in the sense this project's copy always is — the developer's.

- [x] **Step 3: Update the face specs**

`cardFace.test.ts` asserts rank 7's printed rectangles no longer include `noRuleMark` and that `cardActs(7)` is true. `cardRuleText.test.ts` asserts the three texts are non-empty and distinct from `PLAIN_RANK_RULE_TEXT`, and that every rank in `RANKS` still has an entry — the total-`Record` property that stops the tooltip rendering nothing.

- [x] **Step 4: Run the face specs and the typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/cardFace.test.ts src/app/warCouncil/__tests__/cardRuleText.test.ts src/app/warCouncil/__tests__/CardAbilityTip.test.tsx src/app/warCouncil/__tests__/cardFaceCss.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed.

---

## Phase 6 — The simulator can see all three

The 5 no longer opens a prompt, so the policies must stop excluding it — otherwise the ticket's stated second goal, measuring the two strongest levers in the deck, still fails.

### Task 17: Stop the policies avoiding the Woodcutter ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/sim/baselinePolicy.ts:232`, `src/sim/cardAwarePolicy.ts:83-88`, `src/sim/skilledCardPlay.ts:163-180`, `src/sim/skilledPolicy.ts:74-101`, `src/sim/playHand.ts:111-112,214`, `src/sim/types.ts:16-20,221`
- Test: `src/sim/__tests__/baselinePolicy.test.ts`, `src/sim/__tests__/cardAwarePolicy.test.ts`, `src/sim/__tests__/skilledPolicy.test.ts`, `src/sim/__tests__/playHand.test.ts`

- [x] **Step 1: Narrow the three prompt-free predicates to the Fox alone**

Each currently reads `card.rank !== CardRank.Fox && card.rank !== CardRank.Woodcutter`. Drop the second clause in all three and update the docblock above it to say the 5 carries no choice since DLR-163, so a policy may lead or follow with one freely.

- [x] **Step 2: Update the comments that describe the old prompt behaviour**

`playHand.ts:111-112` and `:214` both explain a window-reset in terms of "a Fox or Woodcutter prompt is pending"; only a Fox can be pending now. `types.ts:16-20` describes `choice` as "for a Fox or a Woodcutter"; `types.ts:221` describes a trump suit as "after any Fox exchange made in it" — there is no exchange any more. `skilledPolicy.ts:99-101` names a Cheat unlocking a Woodcutter as a stall risk; that risk is gone.

- [x] **Step 3: Assert the change in the policy specs**

Add one case per policy spec: a hand whose only card is a rank 5 is playable and the policy returns it with no `choice`. Keep the existing Fox cases unchanged.

- [x] **Step 4: Run the simulator specs and the typecheck**

Run: `npx vitest run src/sim; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

- [x] **Step 5: Confirm no policy still names the Woodcutter as prompted**

Run: `Get-ChildItem src\sim -Recurse -Include *.ts | Select-String -Pattern "CardRank.Woodcutter"`
Expected: zero hits.

---

## Phase 7 — The ruleset and the module docs

> **DEFERRED by the 2026-09-03 batch run.** `.docs/` is rewritten once at the end of the batch,
> because several plans in the run edit the same ruleset file. Every requirement below still
> stands and is unchanged; it is executed by the batch's single documentation pass, not here.

The two rules the ticket names as breaking are rewritten, §5's ability table is replaced, and every module doc this contract touched is updated. Nothing under `src/` changes.

### Task 18: Update `the-hunt.md` and `.docs/implementation/`

- Skill: `implementation-doc-writer`, with `game-designer` read first for the two broken rules' reasoning

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`, `.docs/implementation/**` (the skill decides which module folders)

- [ ] **Step 1: Read the design reasoning behind the two rules being broken**

Invoke `game-designer` and read `ideas.md`'s "Rewriting the 3, the 5 and the 7" plus `hybrid-design.md` §9, so §8's "damage to the player, per event: 1, every time" and §5's "a drawn card is never skulled" are rewritten against the reasoning that justified them rather than merely edited. Do **not** re-open the design; the developer settled it on 2026-09-03.

- [ ] **Step 2: Invoke `implementation-doc-writer` with this contract's changed-file list**

Its Step 1 rule check is a certain yes — this contract changes what a player may do (the 3's choice, the 5's prompt removal), what a card is worth (the 7's two halves), and a per-event damage figure. Specifically it must:
- replace §5's ability table rows for 3, 5 and 7, and rewrite §5's "Timing", "A drawn card is never skulled" and "Opening the choice does not commit the card" passages — the last of these because backing out of a Woodcutter is no longer possible;
- rewrite §8's "Damage to the player, per event: 1, every time" against `QUARRY_TREASURE_DAMAGE`;
- record the decree-as-placeholder rule in §2 or §4, wherever the decree is introduced in playing order, and note that no card is ever moved onto the decree any more;
- record the Swap cap and the fight base-damage figure in §7 and §4's Swap passage, marked against their constants;
- leave §5's three `[not built]` ladder rows for the Fox, Woodcutter and Treasure exactly as they are;
- append the difficulty shift to **Known tensions** rather than resolving it, naming the simulator comparison as the measurement that would settle it;
- update the module docs for `war-council/`, `hunt/`, `app/` and `sim/`, and the top-level `.docs/implementation/README.md`.

- [ ] **Step 3: Confirm every path in the Status register still resolves**

Run: `Get-ChildItem .docs\game_rules\the-hunt.md | Select-String -Pattern "src/"`
Expected: every `src/` path printed exists on disk — check each with `Get-ChildItem`. `applyFoxExchange`, `applyWoodcutterDraw` and `chooseCpuFoxChoice` are gone, so any register row naming one is stale.

- [ ] **Step 4: Confirm no doc still describes the retired rules**

Run: `Get-ChildItem .docs\implementation,.docs\game_rules -Recurse -Include *.md | Select-String -Pattern "applyFoxExchange|applyWoodcutterDraw|chooseCpuFoxChoice|chooseCpuWoodcutterChoice|InvalidFoxExchangeCard|InvalidWoodcutterDiscard"`
Expected: zero hits.

---

## Phase 8 — Final verification

No production changes. Only sanity checks that the cumulative work is clean and inside its budgets.

### Task 19: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code written`

- [x] **Step 1: Grep the two pure trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `Math.random` is included deliberately — the Quarry's skull roll is the first randomness inside `playCard`, and a `Math.random()` reaching it would make every seeded measurement irreproducible with nothing failing.

- [x] **Step 2: Grep the simulator, which is lint-enforced pure too**

Run: `Get-ChildItem src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bdocument\.|Math\.random"`
Expected: zero hits.

### Task 20: Confirm no tuning value was hard-coded and no retired name remains ✓

- Skill: `none — verification greps, no code written`

- [x] **Step 1: Grep source for the four literals configuration now owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "0\.4\b" | Select-String -NotMatch "__tests__|config.ts"`
Expected: zero hits — `QUARRY_SWAP_SKULL_CHANCE` is the only place `0.4` may appear outside a spec. The other three constants are `1` and `2` and cannot be grepped usefully; confirm by reading the diff that no branch compares against a bare numeral instead of the named export.

- [x] **Step 2: Grep for every removed identifier**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "applyFoxExchange|applyWoodcutterDraw|chooseCpuFoxChoice|chooseCpuWoodcutterChoice|FoxExchange|FoxDecline|WoodcutterDiscard|InvalidFoxExchangeCard|InvalidWoodcutterDiscard"`
Expected: zero hits.

- [x] **Step 3: Confirm every file this contract created or grew is inside its budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | ForEach-Object { [pscustomobject]@{ n = $_.FullName; c = (Get-Content $_.FullName).Count } } | Where-Object { $_.c -gt 400 } | Sort-Object c -Descending`
Expected: no file this contract touched appears. `src/sim/skilledPolicy.ts` stands at 420 and is a **pre-existing** breach this contract does not touch — report it, do not fix it here.

### Task 21: Static gates and the full suite

- Skill: `none — verification only`

- [ ] **Step 1: Warm the Vitest transform cache, then run the whole suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: every command exits 0; Vitest reports 0 failed. A single cold `Timeout waiting for worker to respond` on the `dom` project is infrastructure, not a defect — the warm-up above is what avoids it; a second consecutive one is a real problem.

- [ ] **Step 2: Check formatting of the files this contract changed only**

Run: `npx prettier --check <every path in this contract's File map>`
Expected: exits 0. Do **not** run `npm run format` — it rewrites the whole repo including the developer's design documents.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 22: Update the PR description ✓

- Skill: `none — a written hand-off, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder, noting the mockup was reviewed as a local file because the publish was refused.
- A summary of the three rule changes and the two per-fight run figures.
- Every decision listed under "Developer decides or observes" above, restated as a checklist, with the four transcribed constants called out first.
- The verification results from Phase 8, quoted — exit codes and the Vitest summary line.
- A one-line note for future contributors on the one new convention: a rule whose effect lands on run state is stated as a pure function in `src/hunt/` and applied by `commit`, because the card engine may not see a run figure.
- The two rules of `the-hunt.md` that stopped being settled, so a reader of the diff knows to expect the ruleset change.

---

## Self-review

**Spec coverage:**

- AC1 (name any suit, decline, naming the suit in force is a decline) — Tasks 3, 4, 6.
- AC2 (the decree becomes a placeholder; the replaced card goes to the resolved pile) — Tasks 3, 4, 7, 8.
- AC3 (timing unchanged, before the winner is decided) — Task 4, Step 4.
- AC4 (the Quarry's 3 picks its most-held suit, declines when it is already trump) — Task 5.
- AC5 (+1 cap and +1 remaining, never refused) — Tasks 1, 2, 10.
- AC6 (the Swap pile marks where the addition went) — Task 11, Step 1.
- AC7 (the Quarry's 5 swaps with a 40% skull, rank 1 never skulled, marked as it lands) — Tasks 9, 11.
- AC8 (a banked Treasure trick adds +1 base damage, stacking with Whetstones) — Tasks 13, 14, 15.
- AC9 (victorious means the outcome axis) — Task 13, Step 4's `taken` term, pinned by that task's dodge and skull-win cases.
- AC10 (the Quarry's 7 deals 2, per-trick and non-accumulating) — Task 13, Step 4's `hitDamage`.
- AC11 (all three stack within a fight; everything resets) — Task 1 Step 2's stacking case, Task 2 Step 3's reset, Task 15's three-Treasure case.
- AC12 (the 7 stops being inert, the no-rule mark comes off) — Task 16, Step 1.
- AC13 (rule text on all three faces) — Task 16, Step 2.
- AC14 (the figure art is reviewed) — routed to the developer in the File map; no code task, deliberately.
- "Updating `the-hunt.md` §5 and every rule this contradicts" — Task 18.
- The plan's simulator scope bullet — Tasks 12 Step 4 and 17.
- The plan's two file-budget bullets — Tasks 10 Steps 1-2 and 12 Steps 1-2, re-checked in Task 20 Step 3.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step carries either a concrete code block or a `Run:` / `Expected:` pair. The four spec skeletons in Tasks 4, 9, 13 and 15 name each case's criterion and its assertion in the test name, which is the contract the executor fills — they are not placeholders for undecided behaviour.

**Type / name consistency:** `applyNameTrump`, `applyQuarrySwap`, `chooseCpuTrumpChoice`, `chooseQuarrySwapCard`, `swapPileAfterWoodcutter`, `swapCapFor`, `SwapPile`, `TREASURE_BASE_DAMAGE_STEP`, `QUARRY_TREASURE_DAMAGE`, `WOODCUTTER_SWAP_STEP`, `QUARRY_SWAP_SKULL_CHANCE`, `discardCapBonus`, `treasureDamageBonus`, `swapJustRaised`, `skullArrivedIn`, `treasureTrick`, `treasureBonusEarned`, `AbilityChoiceKind.NameTrump`, `AbilityChoiceKind.DeclineTrump` — each spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses it. No task references a type or key not introduced by `plan.md` or by an earlier task.

**Phase boundary cleanliness:**

- **Phase 1** adds constants, one new pure module and two `RunState` fields defaulted to 0. Nothing reads them; the game plays bit-identically and `tsc -b` exits 0.
- **Phase 2** retypes the choice union and clears every reader in the same phase, so the boundary type-checks. The 3 works end to end; the 5 is temporarily a plain card with no effect, which is a coherent state rather than a half-applied one.
- **Phase 3** gives the 5 both effects and splits the two files at their ceiling before growing them, so the boundary is inside budget as well as type-checking.
- **Phase 4** adds one required `TrickFacts` field and fixes all seven construction sites in the same task, so no spec is left uncompilable.
- **Phase 5** touches only two data tables and their specs; no logic moves.
- **Phase 6** narrows three predicates and their comments; the simulator compiles and runs at the boundary.
- **Phase 7** writes documentation only — no `src/` file is touched, so the boundary is trivially clean.
- **Phase 8** is verification only.
