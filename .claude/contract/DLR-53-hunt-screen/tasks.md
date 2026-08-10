# Tasks: The Hunt screen — play a full 13-trick Hunt against a telegraphing Quarry

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Turn the existing War Council round renderer into the Hunt screen — §4's five persistent readouts, the intent telegraph shown before every commit, and an end panel showing `Spoils × Standing = Score` before the cleared/missed verdict — with every number read from `src/hunt/` config through the engine functions DLR-49/50/51/52 already shipped.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved at the DLR-53 planning gate, 2026-08-10).

---

## File map

**Created:**

- `src/app/warCouncil/intentPreview.ts` — pure: the Quarry's intent for the trick the player is about to lead
- `src/app/warCouncil/__tests__/intentPreview.test.ts` — its node-project unit test
- `src/app/warCouncil/IntentTelegraph.tsx` — the telegraph line, live or speculative
- `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`
- `src/app/warCouncil/HuntLedger.tsx` — Demand, running Spoils, Standing band, the live product
- `src/app/warCouncil/__tests__/HuntLedger.test.tsx`
- `src/app/warCouncil/QuarryDossier.tsx` — the character, its rule-break sentence, its trick count
- `src/app/warCouncil/__tests__/QuarryDossier.test.tsx`
- `src/app/warCouncil/warCouncilHunt.css` — the third stylesheet: dossier zone, ledger, telegraph, equation panel

**Modified:**

- `src/hunt/config.ts` — add `FIXED_DEMAND` and `SLICE_QUARRY_CHARACTER`
- `src/hunt/index.ts` — re-export both
- `src/hunt/__tests__/config.test.ts` — assert both, and that `DEMAND_CURVE` is still null-valued
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps` gains `hunt: Hunt`
- `src/App.tsx` — build the `Hunt` from config; deal with the slice's Quarry character
- `src/app/warCouncil/labels.ts` — four new copy maps and `intentAccessibleName`
- `src/app/warCouncil/__tests__/labels.test.ts` — cover them
- `src/app/warCouncil/roundReducer.ts` — stop auto-committing the Quarry's lead; commit it on `CarryOn`
- `src/app/warCouncil/__tests__/roundReducer.test.ts` — the telegraph-then-commit lead flow
- `src/app/warCouncil/TrickWell.tsx` — a fourth branch for the un-committed Quarry lead
- `src/app/warCouncil/WarCouncilRound.tsx` — derive the intent, mount the dossier, wire the new carry-on state
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — AC2/AC3/AC4 accessible-name assertions
- `src/app/warCouncil/RoundStatusBand.tsx` — mount `HuntLedger`
- `src/app/warCouncil/RoundOverPanel.tsx` — rewritten: the equation, the Demand, the verdict
- `src/app/warCouncil/__tests__/roundFixture.ts` — a shared `Hunt` fixture
- `src/app/warCouncil/warCouncil.css` — the shell grid gains a `dossier` area

**Deleted:** (none)

**Developer decides or observes:**

- `src/hunt/config.ts` → `FIXED_DEMAND` — **220 is a documented placeholder, not a chosen value.** At printed multipliers and rank-valued cards a Hunt scores ≈`12k × f(k)`: ≈216 at 3 tricks, 48 at 4, 120 at 5, 216 at 6, ≈504 at 7, ≈648 at 9, 0 at 10+. 220 puts the Humble-3 and Defeated-6 lines on a knife edge; ~500 makes only Victorious clear. This value sets what T8's kill-criterion playtest measures.
- The speculative follow telegraph — plan.md implements option (a), previewing the Quarry's response to the armed card. Whether that is too much inference about a hand §4 marks hidden is a design call only playing settles; option (c), gating it behind `TELEGRAPH_FIDELITY`, remains a small addition afterwards.
- The live in-play product (`Spoils × Standing` during play) is an addition to AC2, not a requirement of it — judge whether it earns its space.
- Card and dossier size bounds — the `clamp()` min/max in `warCouncilHunt.css` follow the established `--wc-card-w` shape but the specific bounds are tuning values.
- Whether reading the telegraph actually changes the card you play — the epic's headline question, and T8's kill criterion. QA can confirm it renders and names the right suit and stance; it cannot answer this.
- Whether the opening tap ("Let them lead" on trick 1, the one trick with no prior reveal to fold onto) reads as a stall.
- All visual and copy judgement is deferred to T15 per AC8 — do not block this ticket on it.

---

## Phase 1 — Config, the mount contract, and the pure modules

The Demand and the Quarry's character reach the screen, and the two pure modules everything downstream reads are written and tested. No rendering changes in this phase, so it ends type-checking with the screen behaving exactly as it does today. `WarCouncilRound.tsx` deliberately does **not** destructure the new `hunt` prop yet — it only becomes required on the props type — so nothing is declared-but-unused at this boundary.

### Task 1: Add the slice's two config keys to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/config.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `FIXED_DEMAND` (value is a developer decision) and `SLICE_QUARRY_CHARACTER`

- [x] **Step 1: Add the import and the two keys to `src/hunt/config.ts`**

`config.ts` currently imports nothing. Add at the top of the file, above `StandingBandName`:

```ts
import { QuarryCharacter, type Demand } from './types'
```

Then append to the end of the file, after `TELEGRAPH_FIDELITY`:

```ts
// §11 "one fixed Demand": the slice checks Score against a single target rather than a
// curve. DEMAND_CURVE stays null-valued — the rising curve is T9's run state, not this.
// UNIT: score points, compared against `Spoils × Standing` by `checkDemand`.
// VALUE: a developer decision (DLR-53 plan.md → Risks). 220 is the placeholder recorded
// at the DLR-53 planning gate so the slice is playable — it is not a derived constant and
// it is the number most likely to move after T8's playtest.
export const FIXED_DEMAND: Demand = 220

// §11 "any single character is sufficient; which of the five is not load-bearing". Not a
// tuning value: DLR-51 enforces only the Monarch's rule-break and QUARRY_CHARACTERS holds
// only its copy, so this is forced by what is implemented. It exists as a key so T13 has
// exactly one place to change when the other four characters land.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch
```

- [x] **Step 2: Re-export both from `src/hunt/index.ts`**

In the existing `export { … } from './config'` block, add `FIXED_DEMAND` and `SLICE_QUARRY_CHARACTER` to the list.

- [x] **Step 3: Cover both keys, and lock the untouched Demand curve, in `src/hunt/__tests__/config.test.ts`**

Add `FIXED_DEMAND`, `SLICE_QUARRY_CHARACTER` to the file's existing import from `../config`, and append:

```ts
describe('FIXED_DEMAND', () => {
  it('is a positive finite number, so checkDemand can never compare against null', () => {
    expect(Number.isFinite(FIXED_DEMAND)).toBe(true)
    expect(FIXED_DEMAND).toBeGreaterThan(0)
  })
})

describe('SLICE_QUARRY_CHARACTER', () => {
  it('names a character whose rule-break is actually enforced', () => {
    expect(quarryCharacterInfo(SLICE_QUARRY_CHARACTER)).toBeDefined()
  })
})
```

Import `quarryCharacterInfo` from `../quarryCharacters`. The existing `DEMAND_CURVE` block asserting both fields are `null` must remain untouched and passing — that is the check that the run's curve was not quietly started here.

- [x] **Step 4: Run the hunt config spec**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 2: Thread `hunt: Hunt` through the mount contract ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncilMount.ts`
- Modify: `src/App.tsx`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts`

- [x] **Step 1: Add the required prop in `src/app/warCouncilMount.ts`**

```ts
import type { Hunt } from '../hunt'
import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Demand and Quarry (§1, §4). Required: an optional Demand would let a
   *  caller render a Hunt with nothing to clear and no verdict to reach. */
  readonly hunt: Hunt
  readonly onComplete: (result: WarCouncilRoundResult) => void
}
```

`WarCouncilRoundResult` is unchanged.

- [x] **Step 2: Build the `Hunt` from config in `src/App.tsx`**

Replace the imports and body so the deal carries the slice's Quarry character and the mount receives the `Hunt`:

```ts
import { useState } from 'react'
import { FIXED_DEMAND, SLICE_QUARRY_CHARACTER, type Hunt } from './hunt'
import { dealRound, type WarCouncilState } from './warCouncil'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'

// The slice's single encounter (§11): one fixed Demand, one Quarry. Built once at module
// scope because both halves are configuration constants — it holds no per-round state, so
// it cannot go stale across the remounts below.
const HUNT: Hunt = {
  quarry: { character: SLICE_QUARRY_CHARACTER },
  demand: FIXED_DEMAND,
}
```

and inside `App`, pass `SLICE_QUARRY_CHARACTER` as `dealRound`'s third argument in **both** `useState` initialiser and `handleComplete`, and add `hunt={HUNT}` to the `<WarCouncilRound … />` element. Keep the existing comment above `handleComplete` explaining why the result parameter is omitted.

- [x] **Step 3: Add a shared `Hunt` fixture to `src/app/warCouncil/__tests__/roundFixture.ts`**

Append an exported fixture the component tests share, so no test invents its own Demand:

```ts
import { QuarryCharacter, type Hunt } from '../../../hunt'

/** A fixed Hunt for component tests — a literal Demand, so a test never depends on the
 *  developer-owned FIXED_DEMAND value and never breaks when that value is retuned. */
export const huntFixture: Hunt = {
  quarry: { character: QuarryCharacter.Monarch },
  demand: 100,
}
```

- [x] **Step 4: Typecheck — every construction site of the new required prop must be accounted for**

Run: `npm run typecheck`
Expected: exits 0. Any error here names a `WarCouncilMountProps` construction site missing `hunt` — `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` is the expected one, and Task 7 fixes it. If `npm run typecheck` fails only on that test file, add `hunt={huntFixture}` to every `<WarCouncilRound … />` in it now and re-run.

### Task 3: Add the Hunt copy maps to `src/app/warCouncil/labels.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Append the four maps and the telegraph's accessible-name builder**

Extend the file's existing import line and append after `ILLEGAL_MOVE_MESSAGE`:

```ts
/** The verb phrase for each telegraphed stance (§4, DLR-52's QuarryIntentStance). */
export const STANCE_PHRASE: Readonly<Record<QuarryIntentStance, string>> = {
  [QuarryIntentStance.Leading]: 'lead',
  [QuarryIntentStance.Pressing]: 'press with',
  [QuarryIntentStance.Ducking]: 'duck with',
}

/** Display copy for each Standing band (§1). The multiplier is rendered beside it and is
 *  read from the band itself, never written here. */
export const STANDING_BAND_NAME: Readonly<Record<StandingBandName, string>> = {
  [StandingBandName.Humble]: 'Humble',
  [StandingBandName.Defeated]: 'Defeated',
  [StandingBandName.Victorious]: 'Victorious',
  [StandingBandName.Greedy]: 'Greedy',
}

/** The end-of-Hunt verdict (§11's "a visible outcome: cleared or missed"). */
export const DEMAND_OUTCOME_VERDICT: Readonly<Record<DemandOutcome, string>> = {
  [DemandOutcome.Cleared]: 'Demand cleared',
  [DemandOutcome.Missed]: 'Demand missed',
}

/**
 * The telegraph's screen-reader name (AC6). `speculative` distinguishes the live reading of
 * the Quarry's own turn from the preview against a card the player has merely armed, so the
 * two never sound identical to someone who cannot see the difference in the border.
 */
export function intentAccessibleName(intent: QuarryIntent | null, speculative: boolean): string {
  if (intent === null) {
    return speculative
      ? 'The Quarry has no readable answer to that lead.'
      : 'The Quarry has no intent to read yet.'
  }
  const suit = SUIT_NAME[intent.suit]
  const phrase = intent.stance === undefined ? 'play' : STANCE_PHRASE[intent.stance]
  const body = `The Quarry will ${phrase} ${suit}.`
  return speculative ? `If you lead that card: ${body}` : body
}
```

Import `QuarryIntentStance`, `DemandOutcome`, and `type QuarryIntent` from `../../warCouncil`, and `StandingBandName` from `../../hunt`.

Note the `intent.stance === undefined` branch: `QuarryIntent.stance` is optional by design — DLR-52 omits it when `TELEGRAPH_FIDELITY` is `Suit`-only — so this must not assume it is present.

- [x] **Step 2: Cover the new maps in `src/app/warCouncil/__tests__/labels.test.ts`**

Add tests asserting: every `QuarryIntentStance` value has a `STANCE_PHRASE` entry; every `StandingBandName` value has a `STANDING_BAND_NAME` entry; both `DemandOutcome` values have a verdict; `intentAccessibleName` names the suit and the stance for a live intent; it prefixes with "If you lead that card" when speculative; it returns a distinct sentence for `null` in each mode; and it omits the stance without crashing when `stance` is absent.

- [x] **Step 3: Run the labels spec**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 4: Write the pure `previewQuarryIntent` module ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/intentPreview.ts`
- Test: `src/app/warCouncil/__tests__/intentPreview.test.ts`

- [x] **Step 1: Write the failing test first**

Create `src/app/warCouncil/__tests__/intentPreview.test.ts`. It is a `.test.ts`, so it runs in the **node** project with no renderer — the module must stay React-free and DOM-free. Build states with `dealRound` and the existing `roundFixture.ts` helpers. Assert:

- Leading a card the Quarry can answer returns a `QuarryIntent` naming a suit.
- The returned intent equals `quarryIntent(playCard(round, Player, card).state)` — i.e. the preview and the live reading agree, which is the module's whole contract.
- A card that is not a legal move returns `null`.
- A Fox (rank 3) or a Woodcutter (rank 5) returns `null`, because `playCard` rejects it with `MissingAbilityChoice` until the ability prompt is answered.
- Calling it twice with the same arguments returns equal values and leaves `round` unchanged (`expect(round).toEqual(snapshotTakenBefore)`) — the purity guarantee the component relies on when calling it during render.

- [x] **Step 2: Run the spec and watch it fail for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/intentPreview.test.ts`
Expected: exits non-zero, failing on the missing `../intentPreview` module — not on a syntax error in the spec.

- [x] **Step 3: Write `src/app/warCouncil/intentPreview.ts`**

```ts
import {
  PlayerSide,
  playCard,
  quarryIntent,
  type Card,
  type QuarryIntent,
  type WarCouncilState,
} from '../../warCouncil'
import type { TelegraphFidelity } from '../../hunt'

/**
 * The Quarry's intent for the trick the player is *about* to lead — what `quarryIntent`
 * would say once `card` has been led. Pure: builds a throwaway state through `playCard`
 * and never mutates `round`, so it is safe to call during render and under StrictMode's
 * double-invoke.
 *
 * This is what makes DLR-53 AC3 true for the following case. A follow is a function of the
 * lead, so it does not exist until a lead is chosen; asking after the player commits would
 * make the telegraph a caption on a decision already made, which is exactly the
 * "die roll resolved after you commit" that `forbidden-solitaire.md` §5/§10.5 — the
 * citation §4's visibility table rests on — says telegraphing exists to eliminate.
 *
 * Returns `null` — never throws — whenever there is no answer to give:
 * - `playCard` rejected `card`: it is not a legal move, or it is a Fox or a Woodcutter
 *   awaiting its `AbilityChoice`, so no hypothetical state exists yet.
 * - The resulting state is not the Quarry's turn (the player won the trick and leads
 *   again). `quarryIntent` makes that check its own responsibility and returns `null`.
 */
export function previewQuarryIntent(
  round: WarCouncilState,
  card: Card,
  fidelity?: TelegraphFidelity,
): QuarryIntent | null {
  const result = playCard(round, PlayerSide.Player, card)
  if (!result.ok) {
    return null
  }
  return quarryIntent(result.state, fidelity)
}
```

`quarryIntent`'s second parameter defaults to `TELEGRAPH_FIDELITY`, so passing `undefined` through keeps the configured default — no literal fidelity is written here.

- [x] **Step 4: Run the spec green, then typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/intentPreview.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 2 — The telegraph flow

The Quarry's lead stops committing itself, so it can be telegraphed before it lands, and the telegraph renders at both of §4's decision points. This phase changes behaviour a player can see. It ends type-checking and fully functional, but **unstyled** — the new `.wc-telegraph` and `.wc-dossier` selectors do not exist until Phase 3, so the dossier flows as an ordinary block. That is a safe boundary: nothing is half-applied, and no test asserts layout.

### Task 5: Stop auto-committing the Quarry's lead in `roundReducer.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Make `createRoundUiState` a pure restructuring of its argument**

Today it calls `advanceCpu` when the CPU leads trick 1, so the opening lead is already on the table before anything renders and can never be telegraphed. Replace the whole function with:

```ts
/**
 * Initial UI state. Deliberately does **not** play the Quarry's opening lead: DLR-53 AC3
 * requires that lead to be telegraphed before it lands, and `handleCarryOn` commits it when
 * the player is ready. Being a pure restructuring of `initialState` also makes it trivially
 * safe under StrictMode's double-invocation of a lazy `useReducer` initialiser.
 */
export function createRoundUiState(initialState: WarCouncilState): RoundUiState {
  return {
    round: initialState,
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
  }
}
```

- [x] **Step 2: Split `advanceCpu` into a lead path and a follow path**

Rename the existing `advanceCpu` to `advanceQuarryFollow` (its body is unchanged — it still needs `chooseCpuMove`'s card to build the resolved trick's reveal) and update its one caller inside `commit`. Then add the lead path beside it:

```ts
/**
 * Commits a Quarry *lead* through the engine's own `commitQuarryMove` — the commit half of
 * the split DLR-52 introduced for exactly this. A lead never completes a trick, so there is
 * no resolved reveal to derive and no need to know which card was chosen.
 *
 * Keeps `advanceQuarryFollow`'s empty-legal-set guard: `commitQuarryMove` reaches
 * `chooseCpuCard`, whose `lowestCard([])` would throw rather than return a rejection.
 */
function advanceQuarryLead(round: WarCouncilState): CpuAdvanceResult {
  if (legalMoves(round, QUARRY_SIDE).length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }
  const result = commitQuarryMove(round)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }
  return { round: result.state, resolvedTrick: null, cpuFault: null }
}
```

Add `commitQuarryMove` and `QUARRY_SIDE` to the module's existing import from `'../../warCouncil'`. Inside `advanceQuarryFollow`, replace the three `PlayerSide.Cpu` arguments with `QUARRY_SIDE` so both paths name the seat the same way.

- [x] **Step 3: Make `handleCarryOn` clear the reveal *and* commit a pending Quarry lead**

Today it returns early whenever `resolvedTrick === null`, which would strand the game on the opening lead. Replace it with:

```ts
/**
 * The single control the player presses between decisions. Clears a held trick reveal —
 * including the deciding thirteenth, so its cards and winner are seen before the end panel
 * — and then commits the Quarry's lead if one is pending.
 *
 * Doing both in one transition is what keeps the telegraph free: the Quarry's next lead is
 * already readable beside the held reveal, so the tap that clears the reveal is the same tap
 * that lets them lead. Only trick 1 has no prior reveal to fold onto.
 */
function handleCarryOn(state: RoundUiState): RoundUiState {
  const cleared: RoundUiState =
    state.resolvedTrick === null ? state : { ...state, resolvedTrick: null }

  if (
    cleared.cpuFault !== null ||
    cleared.prompt !== null ||
    cleared.round.phase === RoundPhase.Complete ||
    currentTurn(cleared.round) !== QUARRY_SIDE ||
    cleared.round.currentTrick.length > 0
  ) {
    return cleared
  }

  const advanced = advanceQuarryLead(cleared.round)
  return {
    ...cleared,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
  }
}
```

The `currentTrick.length > 0` guard is what keeps this to *leads* only: a Quarry follow is committed inside `commit` in the same transition as the player's lead and must never be reachable from here.

- [x] **Step 3b: Confirm `PlayerSide` is still used, or drop the import**

`QUARRY_SIDE` replaces `PlayerSide.Cpu` in the two advance helpers, but `PlayerSide.Player` is still used by `canAct`, `commit`, and `deriveResolvedTrick`. Keep the import; do not remove it.

- [x] **Step 4: Update `src/app/warCouncil/__tests__/roundReducer.test.ts`**

Existing tests asserting that `createRoundUiState` plays the CPU's opening lead now assert the opposite. Rewrite them and add coverage for the new flow:

- `createRoundUiState` on a state where the Quarry leads returns `round` **identical** to `initialState` (`toBe`, not just `toEqual`), with `resolvedTrick`, `cpuFault`, `armed`, and `prompt` all `null`.
- `quarryIntent(created.round)` is non-null in that state — the telegraph has something to show before any card is played.
- Dispatching `CarryOn` from that state puts exactly one card in `currentTrick`, played by the Quarry, and leaves `cpuFault` null.
- Dispatching `CarryOn` when the player is to lead is a no-op (`toBe` the same state object).
- Dispatching `CarryOn` while a resolved trick is held **and** the Quarry leads next clears the reveal and commits the lead in one transition.
- The player leading still advances the Quarry's follow inside the same `TapCard` commit — the existing behaviour, unchanged.
- A round played to completion still reaches `RoundPhase.Complete` with `tricksPlayed === TRICKS_PER_ROUND`. Drive it with a loop that dispatches `CarryOn` whenever the Quarry is to lead and taps the first legal card twice otherwise — this is the reducer-level proof of AC1.

- [x] **Step 5: Run the reducer spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 6: Build the `IntentTelegraph` component ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/IntentTelegraph.tsx`
- Test: `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`

- [x] **Step 1: Write the component**

```tsx
import type { QuarryIntent } from '../../warCouncil'
import { intentAccessibleName, STANCE_PHRASE, SUIT_NAME } from './labels'
import { SuitMark } from './SuitMark'

interface IntentTelegraphProps {
  readonly intent: QuarryIntent | null
  /** True when derived from a card the player has armed but not committed. */
  readonly speculative: boolean
}

/**
 * §4's telegraphed intent (AC3). Renders suit and stance only — never the card — so the
 * hidden-hand row of §4's visibility table is never violated. Computes nothing: the intent
 * arrives already derived, and the fidelity that decided whether `stance` is present at all
 * is `TELEGRAPH_FIDELITY`'s, not this component's.
 *
 * `role="status"` announces a changed intent without stealing focus from the hand.
 */
export default function IntentTelegraph({ intent, speculative }: IntentTelegraphProps) {
  const className = [
    'wc-telegraph',
    speculative && 'wc-is-speculative',
    intent === null && 'wc-telegraph-empty',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="status" aria-label={intentAccessibleName(intent, speculative)}>
      <span className="wc-telegraph-eyebrow" aria-hidden="true">
        {speculative ? 'If you lead that' : 'Their intent'}
      </span>
      <p className="wc-telegraph-line" aria-hidden="true">
        {intent === null ? (
          speculative ? 'Nothing to read from that lead.' : 'Waiting on your lead.'
        ) : (
          <>
            <SuitMark suit={intent.suit} className="wc-telegraph-mark" />
            They will {intent.stance === undefined ? 'play' : STANCE_PHRASE[intent.stance]}{' '}
            {SUIT_NAME[intent.suit]}.
          </>
        )}
      </p>
    </div>
  )
}
```

The visible text is `aria-hidden` and the whole box carries one `aria-label`, so a screen reader hears one sentence rather than the eyebrow and the line as two fragments.

- [x] **Step 2: Write the component test**

Create `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx` (a `.tsx` spec, so it runs in the **dom** project). Query by role and accessible name only — never by class. Assert:

- A live leading intent is reachable as `getByRole('status', { name: /will lead Bells/i })`.
- A speculative pressing intent's accessible name starts with "If you lead that card".
- A `null` intent still exposes a `status` with a distinct name in each mode.
- An intent with no `stance` (suit-only fidelity) renders without crashing and names the suit.

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 7: Wire the telegraph and the pending lead into the felt and the mount ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/TrickWell.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Add the fourth branch to `TrickWell.tsx`**

Add `readonly quarryToLead: boolean` to `TrickWellProps`, and insert this branch **after** the `resolvedTrick` branch and **before** the `currentTrick.length > 0` branch:

```tsx
if (quarryToLead) {
  // The Quarry's lead is chosen but not committed, so the telegraph beside the felt can be
  // read first (AC3). The control is a real button for the same reason the carry-on control
  // is: while the Quarry holds the turn every hand card is disabled, so this is the only
  // thing a keyboard-only player can reach.
  return (
    <>
      <div className="wc-trick-row" />
      <p className="wc-table-line">They are about to lead. Read their intent first.</p>
      <button type="button" className="wc-table-hint wc-is-carry-on" onClick={handleHintClick}>
        Let them lead
      </button>
    </>
  )
}
```

`handleHintClick` currently lives inside the `resolvedTrick` branch. Lift it to the component body — above the `if (resolvedTrick)` — so both branches share the one handler and its `event.stopPropagation()` guard against the felt's own `onClick`.

- [x] **Step 2: Derive the intent and the pending-lead flag in `WarCouncilRound.tsx`**

Add to the imports: `quarryIntent`, `type QuarryIntent` from `'../../warCouncil'`; `previewQuarryIntent` from `'./intentPreview'`; `IntentTelegraph` from `'./IntentTelegraph'`; `QuarryDossier` from `'./QuarryDossier'` (created in Phase 3 — **add this import in Task 10, not here**, or the module will not resolve).

After the existing `const legal = …` line:

```ts
// The Quarry has chosen its lead but has not committed it, so the telegraph can be read
// before the card lands. `currentTrick.length === 0` is what keeps this to leads only.
const quarryToLead =
  !roundComplete &&
  ui.resolvedTrick === null &&
  ui.prompt === null &&
  ui.cpuFault === null &&
  currentTurn(ui.round) === PlayerSide.Cpu &&
  ui.round.currentTrick.length === 0

// Two readings of the same telegraph, never both at once. An armed card is a selection, not
// a commitment, so previewing the Quarry's answer to it is still "before the player commits"
// (AC3). With nothing armed, `quarryIntent` self-guards and returns null unless it is
// genuinely the Quarry's turn. Both are pure and cheap enough to derive every render —
// storing either could only make it stale against `ui.round`.
const speculative = ui.armed !== null
const intent: QuarryIntent | null = speculative
  ? previewQuarryIntent(ui.round, ui.armed)
  : quarryIntent(ui.round)
```

TypeScript narrows `ui.armed` to `Card` inside the true branch of `speculative` only if `speculative` is inlined; if the compiler complains, write the conditional as `ui.armed !== null ? previewQuarryIntent(ui.round, ui.armed) : quarryIntent(ui.round)` and derive `speculative` separately.

- [x] **Step 3: Let the carry-on control commit the pending lead**

`handleCarryOn` currently dispatches only when `ui.resolvedTrick !== null`. Replace its first branch:

```ts
if (ui.resolvedTrick !== null || quarryToLead) {
  dispatch({ kind: RoundUiActionKind.CarryOn })
  return
}
```

Then extend the two places the felt reacts to a waiting state, so the pending lead behaves exactly like a held reveal:

- the `<section>`'s className: `` `wc-table${ui.resolvedTrick || quarryToLead ? ' wc-is-waiting' : ''}` ``
- its `onClick`: `{ui.resolvedTrick || quarryToLead ? handleCarryOn : undefined}`

Pass `quarryToLead={quarryToLead}` to **both** `<TrickWell …/>` elements in the `felt` cascade.

- [x] **Step 4: Render the telegraph in the dossier zone**

Add, between the `<RoundStatusBand …/>` and the `<section className="wc-table" …>` elements:

```tsx
<aside className="wc-dossier">
  <IntentTelegraph intent={intent} speculative={speculative} />
</aside>
```

`QuarryDossier` joins this aside in Task 10. Also add `import './warCouncilHunt.css'` — **in Task 11**, when that file exists.

- [x] **Step 5: Extend `deriveHint` so the pending lead has a hint**

In `deriveHint`, add `if (quarryToLead) return 'They are choosing their lead'` after the `resolvedTrick` line. Add `quarryToLead: boolean` as its third parameter and pass it at the call site.

- [x] **Step 6: Add AC3 coverage to `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`**

Pass `hunt={huntFixture}` to every render (see Task 2 Step 4). Query by role and accessible name only. Assert:

- **AC3, lead case:** rendering a state where the Quarry leads shows a `status` naming a suit **and** no card in the trick row yet, with a `button` named `/let them lead/i` present. Clicking it puts the Quarry's card on the table.
- **AC3, follow case:** with the player to lead, clicking a hand card once (arming it) makes the `status`'s accessible name start with "If you lead that card"; the card has not been played (the trick row is still empty).
- Pressing `Escape` after arming clears the speculative reading back to the live one.
- **AC1:** a keyboard-only path exists — the "Let them lead" button is reachable by `Tab` and activates on `Enter`.

- [x] **Step 7: Run the affected specs and typecheck**

Run: `npx vitest run --project dom; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0. If the dom project reports a worker-start timeout on a cold cache, re-run it once before treating it as a failure — `.claude/workflow/web-project.md` documents that as infrastructure, not a defect.

---

## Phase 3 — The persistent readouts and the shell zone

§4's visibility table arrives on screen: the ledger inside the existing status band, the dossier in the new grid zone beside the felt, and the stylesheet that places both. This phase ends with AC2 and AC5 satisfied and the screen laid out as the approved `mockup.html`.

### Task 8: Build the `HuntLedger` component ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/HuntLedger.tsx`
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

- [x] **Step 1: Write the component**

```tsx
import type { Demand, Spoils, StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'

interface HuntLedgerProps {
  readonly demand: Demand
  readonly spoils: Spoils
  readonly band: StandingBand
}

/**
 * §1's equation in progress (AC2): running Spoils, the Standing band the player's trick
 * count currently sits in, the product they make, and the Demand it is checked against.
 * Computes only that product — every input arrives already derived from config through
 * `spoils` and `resolveStanding`, so no multiplier or band boundary is written here.
 *
 * Each cell carries its own `aria-label` because the visible value is a bare number whose
 * meaning lives in a separate key element (AC6).
 */
export default function HuntLedger({ demand, spoils, band }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]
  const score = spoils * band.multiplier

  return (
    <div className="wc-ledger" role="group" aria-label="The Hunt so far">
      <span className="wc-ledger-cell">
        <span className="wc-ledger-key" aria-hidden="true">Spoils</span>
        <span className="wc-ledger-value" aria-label={`Running Spoils: ${spoils}`}>{spoils}</span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">×</span>
      <span className="wc-ledger-cell wc-is-band">
        <span className="wc-ledger-key" aria-hidden="true">Standing</span>
        <span
          className="wc-ledger-value"
          aria-label={`Standing band: ${bandName}, multiplier ${band.multiplier}`}
        >
          {bandName} ×{band.multiplier}
        </span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">=</span>
      <span className="wc-ledger-cell">
        <span className="wc-ledger-key" aria-hidden="true">Score</span>
        <span className="wc-ledger-value" aria-label={`Score so far: ${score}`}>{score}</span>
      </span>
      <span className="wc-ledger-op" aria-hidden="true">/</span>
      <span className="wc-ledger-cell wc-is-demand">
        <span className="wc-ledger-key" aria-hidden="true">Demand</span>
        <span className="wc-ledger-value" aria-label={`The Demand: ${demand}`}>{demand}</span>
      </span>
    </div>
  )
}
```

- [x] **Step 2: Write the component test**

Create `src/app/warCouncil/__tests__/HuntLedger.test.tsx`. Build the band with `resolveStanding(n)` rather than a literal, so no test hard-codes a multiplier. Assert by accessible name: the Demand, the running Spoils, the band name with its multiplier, and the product. Include a case where `band.multiplier` is `0` (Greedy, 10+ tricks) and assert the score reads `0` rather than blank — a falsy number is the classic React render hole.

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 9: Build the `QuarryDossier` component ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/QuarryDossier.tsx`
- Test: `src/app/warCouncil/__tests__/QuarryDossier.test.tsx`

- [x] **Step 1: Write the component**

```tsx
import type { QuarryCharacterInfo } from '../../hunt'

interface QuarryDossierProps {
  /** `undefined` when the character's rule-break is not implemented — `quarryCharacterInfo`'s
   *  documented contract. Renders nothing rather than putting a rule on screen no code applies. */
  readonly info: QuarryCharacterInfo | undefined
  readonly tricksWon: number
}

/**
 * §4's always-on rows (AC2): the encounter's character, its round-long rule-break in the
 * plain language `quarryCharacters.ts` already writes, and its public trick count. Restates
 * no rule of its own — the sentence is the config's, and enforcement is
 * `warCouncil/quarryRuleBreak.ts`'s (DLR-51 AC7).
 */
export default function QuarryDossier({ info, tricksWon }: QuarryDossierProps) {
  if (info === undefined) {
    return null
  }

  return (
    <section className="wc-dossier-card" aria-label={`The Quarry: ${info.name}`}>
      <span className="wc-dossier-eyebrow" aria-hidden="true">The Quarry</span>
      <h2 className="wc-dossier-name">{info.name}</h2>
      <p className="wc-dossier-rule">{info.description}</p>
      <p className="wc-dossier-tricks">
        Tricks taken <b aria-label={`The Quarry has taken ${tricksWon} tricks`}>{tricksWon}</b>
      </p>
    </section>
  )
}
```

- [x] **Step 2: Write the component test**

Create `src/app/warCouncil/__tests__/QuarryDossier.test.tsx`. Feed it `quarryCharacterInfo(QuarryCharacter.Monarch)` rather than a hand-built object, so the test breaks if the shipped copy changes. Assert: the region is reachable by its accessible name; a heading carries the character's name; the rule-break sentence is present as text; the trick count is reachable by accessible name; and passing `undefined` renders nothing (`container.firstChild` is `null`).

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/QuarryDossier.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 10: Mount the ledger and the dossier ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/RoundStatusBand.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Mount `HuntLedger` inside `RoundStatusBand.tsx`**

Add `demand: Demand`, `spoils: Spoils`, and `band: StandingBand` to `RoundStatusBandProps`, import the three types from `'../../hunt'` and `HuntLedger` from `'./HuntLedger'`, and render `<HuntLedger demand={demand} spoils={spoils} band={band} />` as the last child of the `<header className="wc-status">`. The existing opponent plate and three-cell scoreboard are unchanged.

- [x] **Step 2: Derive the ledger's inputs in `WarCouncilRound.tsx`**

Destructure `hunt` from the props (`{ initialState, hunt, onComplete }`) and add after the `legal` line:

```ts
// Both derived every render from already-final state. `spoils` reduces over at most 26
// captured cards and `resolveStanding` scans a six-row table — bounded work, no memo.
const runningSpoils = spoils(ui.round, PlayerSide.Player)
const band = resolveStanding(ui.round.tricksWon[PlayerSide.Player])
```

Import `spoils` from `'../../warCouncil'` and `resolveStanding` from `'../../hunt'`. Pass `demand={hunt.demand}`, `spoils={runningSpoils}`, and `band={band}` to `<RoundStatusBand …/>`.

- [x] **Step 3: Mount `QuarryDossier` in the aside built in Task 7**

Add the imports `QuarryDossier` from `'./QuarryDossier'` and `quarryCharacterInfo` from `'../../hunt'`, and render it above the telegraph:

```tsx
<aside className="wc-dossier">
  <QuarryDossier
    info={quarryCharacterInfo(hunt.quarry.character)}
    tricksWon={ui.round.tricksWon[PlayerSide.Cpu]}
  />
  <IntentTelegraph intent={intent} speculative={speculative} />
</aside>
```

Reading the character from `hunt.quarry.character` rather than `ui.round.quarryCharacter` keeps the encounter's identity on the encounter, where §4 puts it; the round state's copy is what the *engine* enforces against.

- [x] **Step 4: Add AC2 coverage to `WarCouncilRound.test.tsx`**

Assert, on a mid-round render and by accessible name only: the Demand matches `huntFixture.demand`; the running Spoils is present; the Standing band names a band and a multiplier; the Quarry's trick count is present; the Quarry's rule-break sentence is on screen. This is the AC6 check — each of the four named surfaces must be reachable by a screen-reader name.

- [x] **Step 5: Measure the two files that grew, then run the dom project**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx | Measure-Object -Line).Lines; (Get-Content src\app\warCouncil\RoundStatusBand.tsx | Measure-Object -Line).Lines`
Expected: both under 400. If `WarCouncilRound.tsx` is over, extract the derivations into a `use*` hook in the same task rather than deferring it.

Run: `npx vitest run --project dom; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

Confirmed: `WarCouncilRound.tsx` measured 207 (Measure-Object)/220 (.Count) lines, `RoundStatusBand.tsx` 62/66 lines — both well under 400. `npx vitest run --project dom` reported 6 files, 35 tests passed; `npm run typecheck` exited 0.

### Task 11: Write the Hunt stylesheet and add the shell's dossier zone ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/warCouncilHunt.css`
- Modify: `src/app/warCouncil/warCouncil.css`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`

- [x] **Step 1: Give `.wc-shell` a dossier column in `warCouncil.css`**

Replace the `grid-template-rows` / `grid-template-areas` block of `.wc-shell` with:

```css
  grid-template-rows: auto 1fr auto;
  grid-template-columns: minmax(10rem, 17vw) 1fr;
  grid-template-areas:
    'status  status'
    'dossier table'
    'hand    hand';
```

`height: 100dvh`, `overflow: hidden`, and the `env(safe-area-inset-*)` padding stay exactly as they are — do not touch them. Add nothing else to this file; it is at 366 of 400 lines and this change must stay within a handful.

- [x] **Step 2: Write `src/app/warCouncil/warCouncilHunt.css`**

Transcribe the ledger, dossier, telegraph, and equation rules from `mockup.html` in this folder, using only the existing `--wc-*` tokens — **no new colour token**, per AC8. Include the mockup's narrow/short collapse so AC5 holds on a phone and on a short laptop window:

```css
@media (max-width: 44rem), (max-height: 34rem) {
  .wc-shell {
    grid-template-columns: 1fr;
    grid-template-areas: 'status' 'dossier' 'table' 'hand';
    grid-template-rows: auto auto 1fr auto;
  }
  .wc-dossier { flex-direction: row; align-items: center; flex-wrap: wrap; }
}
```

Every state must read without colour alone (`game-ux`): the Demand cell takes a solid 2px border, the Standing cell a dashed one, the speculative telegraph a dotted border against the live one's dashed. Interactive controls keep `min-height: 44px`, `touch-action: manipulation`, and a `:focus-visible` outline. The `.wc-dossier` zone needs `min-width: 0` and `overflow: hidden` so a long rule-break sentence cannot force the grid wider than the viewport — the most likely way this change breaks the no-scroll guarantee.

- [x] **Step 3: Import the new stylesheet in `WarCouncilRound.tsx`**

Add `import './warCouncilHunt.css'` alongside the two existing stylesheet imports, keeping the file's imports-then-constants-then-component order.

- [x] **Step 4: Measure both stylesheets and check formatting**

Run: `(Get-Content src\app\warCouncil\warCouncil.css | Measure-Object -Line).Lines; (Get-Content src\app\warCouncil\warCouncilHunt.css | Measure-Object -Line).Lines`
Expected: both under 400.

Run: `npx prettier --check src/app/warCouncil/warCouncilHunt.css src/app/warCouncil/warCouncil.css`
Expected: exits 0. The repo-wide `format:check` fails on pre-existing files unrelated to this contract — scope the check to what this contract changed.

Confirmed: `warCouncil.css` measured 317 (Measure-Object, which undercounts blank lines)/367 (`.Count`, the true line count); `warCouncilHunt.css` 216/253. Both well under 400 by either measure. Note for later phases and QA: `(Get-Content <file> | Measure-Object -Line).Lines` silently undercounts a file's true line count by its number of blank lines (Measure-Object -Line counts 0 for an empty-string object), so a file close to the 400 boundary should be cross-checked with `(Get-Content <file>).Count`. Not a blocker here — neither file is near the boundary either way — but flagged since the contract's own commands rely on the undercounting form throughout. `npx prettier --write` was run once on `warCouncilHunt.css` to fix wrapping the tool itself objected to; `--check` on both files then exited 0.

**Post-review fix (QA finding, fix pass 1):** the narrow/short media query restructured `.wc-shell` and `.wc-dossier` but never touched `.wc-status` (`warCouncil.css`) — at ≤44rem width its three children (`.wc-plate`, `.wc-score`, `.wc-ledger`) overflowed the viewport with no wrap, and `.wc-ledger`'s own row (five `white-space: nowrap` cells plus three operators) was wide enough to overflow on its own even once `.wc-status` wrapped. Added `.wc-status { flex-wrap: wrap; }` and `.wc-ledger { flex-wrap: wrap; }` to the existing media query block in `warCouncilHunt.css` (no touch to `warCouncil.css` needed — the later-imported stylesheet's media-scoped rule overrides the unconditional base rule at matching widths). `warCouncilHunt.css` now measures 268 lines by `.Count`, still well under 400. No new colour token; `.wc-shell`'s `height: 100dvh`, `overflow: hidden`, and safe-area padding untouched.

---

## Phase 4 — The end-of-Hunt panel

The last acceptance criterion with a visible surface: `Spoils × Standing = Score`, the Demand, and the verdict. One task, because the panel's props, its readers, and its test all change together.

### Task 12: Rewrite `RoundOverPanel` around §1's equation ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/RoundOverPanel.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Replace `RoundOverPanelProps` and the panel's body**

The `score: Record<PlayerSide, number>` prop (from `scoreRound`) is replaced by the equation's parts. The opponent's *points* row goes — §1's equation is one-sided and the Quarry has no Demand to clear — while its trick count stays.

```tsx
import type { Demand } from '../../hunt'
import { DemandOutcome, PlayerSide, type HuntScore } from '../../warCouncil'
import { DEMAND_OUTCOME_VERDICT, STANDING_BAND_NAME } from './labels'

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly huntScore: HuntScore
  readonly demand: Demand
  readonly outcome: DemandOutcome
  readonly onFinish: () => void
}
```

The body renders, in order: an `<h2>`; a `role="group"` labelled "Spoils times Standing equals Score" holding four parts — Spoils, `×`, the Standing multiplier, `=`, the Score — each part's value carrying its own `aria-label`; a line naming the trick count and band; the verdict from `DEMAND_OUTCOME_VERDICT[outcome]` with `wc-is-cleared` / `wc-is-missed`; the trick tally; and the existing `wc-decline` finish button, unchanged. Show the arithmetic, not just the result — that is AC4's whole point.

- [x] **Step 2: Compute the Hunt score at the call site in `WarCouncilRound.tsx`**

Import `scoreHunt` and `checkDemand` from `'../../warCouncil'`. In the `roundComplete` branch of the `felt` cascade:

```tsx
} else if (roundComplete) {
  const huntScore = scoreHunt(ui.round, PlayerSide.Player)
  felt = (
    <RoundOverPanel
      tricksWon={ui.round.tricksWon}
      huntScore={huntScore}
      demand={hunt.demand}
      outcome={checkDemand(huntScore.score, hunt.demand)}
      onFinish={handleCarryOn}
    />
  )
}
```

`handleCarryOn`'s `onComplete` payload still uses `scoreRound(ui.round.tricksWon)` — `WarCouncilRoundResult` is unchanged by this contract, so leave that line alone.

- [x] **Step 3: Add AC4 coverage to `WarCouncilRound.test.tsx`**

Drive a full round to completion (the same loop shape as the reducer test: `CarryOn` when the Quarry leads, two taps on the first legal card otherwise), then assert by accessible name that the panel shows the Spoils, the Standing multiplier, the Score, the Demand, and a cleared-or-missed verdict — and that the Score equals Spoils × Standing as rendered. Cover both verdicts by choosing `huntFixture.demand` such that one run clears and a second fixture misses; assert the verdict text differs.

- [x] **Step 4: Run the dom project and typecheck**

Run: `npx vitest run --project dom; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

Confirmed: `npx vitest run --project dom` reported 6 files, 37 tests passed (the two new AC4
tests included). `npm run typecheck` exited 0. `npm run lint` (also run, since this phase
touched `.ts`/`.tsx`) exited 0. `npx prettier --check` on the three touched files exits 0
after one `--write` pass fixed the new test file's import ordering. `RoundOverPanel.tsx`
measures 99 lines, `WarCouncilRound.tsx` 225, `WarCouncilRound.test.tsx` 309 — all well under
400 (`.Count`, the true line count).

---

## Phase 5 — Final verification

No production changes. Sanity-checks that the cumulative work is clean, plus the PR description.

### Task 13.1: Confirm the pure-core boundary still holds ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Grep the engine trees for React and DOM references**

Run: `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `eslint.config.js` enforces this on `src/warCouncil/**` and `src/hunt/**`; this contract added to `src/hunt/config.ts` and put its new pure module in `src/app/warCouncil/` instead, so the boundary is unchanged.

Confirmed: zero hits.

- [x] **Step 2: Confirm the new pure module imports no React**

Run: `Select-String -Path src\app\warCouncil\intentPreview.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."`
Expected: zero hits. It sits outside the lint-enforced tree by design, so this is a review-enforced check.

Confirmed: zero hits.

### Task 13.2: Confirm no tunable was hard-coded and no readout invents a number ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Grep components for the literals configuration owns**

Run: `Select-String -Path src\app\warCouncil\*.tsx -Pattern "\b(220|\bx?6\b|\bx?3\b)\s*\)" ; Select-String -Path src\app\warCouncil\*.tsx -Pattern "demand\s*[:=]\s*[0-9]"`
Expected: zero hits for a hard-coded Demand or multiplier. Every multiplier reaches a component as `band.multiplier` and every Demand as `hunt.demand` — AC7.

Confirmed: zero hits.

- [x] **Step 2: Confirm the Demand curve was not quietly started**

Run: `Select-String -Path src\hunt\config.ts -Pattern "base: null"`
Expected: one hit. `DEMAND_CURVE` stays null-valued; the rising curve is T9's.

Confirmed: one hit — `src\hunt\config.ts:66:  base: null,`.

- [x] **Step 3: Confirm no debug logging shipped**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "console\.(log|debug)"`
Expected: zero hits.

Confirmed: zero hits.

### Task 13.3: File sizes, static gates, and the full suite ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\app\warCouncil\*.tsx,src\app\warCouncil\*.ts,src\app\warCouncil\*.css | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }`
Expected: every line count under 400. Over 400 is blocking and must be split before this task passes.

Confirmed, both by the mandated `Measure-Object -Line` command and by the true `.Count`
(re-measured per the Phase 3 correction that `Measure-Object -Line` undercounts blank lines).
Every file in `src\app\warCouncil\` is well under 400 by either measure; the largest is
`warCouncil.css` at 317 (Measure-Object) / 367 (`.Count`) lines, followed by `roundReducer.ts`
at 211/237 and `WarCouncilRound.tsx` at 212/225. No split required.

- [x] **Step 2: Warm the Vite transform cache, then run the gates**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. Running the projects separately first avoids the cold-cache worker-start timeout documented in `.claude/workflow/web-project.md`; a single cold timeout is infrastructure, not a test failure, but a second consecutive one is a real problem.

Confirmed: `--project node` → "Test Files 23 passed (23)", "Tests 396 passed (396)"; no
worker-start timeout. `--project dom` → "Test Files 6 passed (6)", "Tests 37 passed (37)".
Both exited 0.

- [x] **Step 3: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

`npm run typecheck` and `npm run lint` run by the Implementer per this phase's scope: both
exited 0 with no output. The unfiltered `npm test` was delegated to QA and run there —
"Test Files 29 passed (29)", "Tests 433 passed (433)", exit 0. Re-confirmed unchanged in the
round-2 verification pass after the `.wc-status` wrap fix.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Run by QA: exit 0 — 55 modules transformed, `dist/index.html`, `dist/assets/index-*.css`
(13.81 kB) and `dist/assets/index-*.js` (217.53 kB) written, no bundler errors.

- [x] **Step 5: Drive the screen in a real browser (QA)**

Start the dev server detached per `.claude/workflow/web-project.md`, then through the `chrome-devtools` MCP verify — these are functional questions with right answers, not judgement calls:

- **AC5:** `document.scrollingElement.scrollHeight <= clientHeight` and the same for width, at **1920×1080**, **1366×768**, **1024×640**, and **390×844**. Report the sizes checked.
- **AC1:** play all 13 tricks to a cleared-or-missed outcome using clicks only, then again using only `Tab`, arrow keys, `Enter`, and `Escape`.
- **AC3:** the telegraph is present before every commit — both before each Quarry lead and while a card is armed.
- **AC9:** `list_console_messages` reports no error across the whole round.

Run by QA on a detached server (port 5199, own PID killed afterwards), across two review rounds.

- **AC5:** confirmed at **1920×1080** (achieved 1920×949 after browser chrome), **1366×768**,
  **1024×640**, and a phone portrait at **500×844** — the browser tooling floors window width at
  500px on this machine, so 390 was not reachable; `scrollHeight === clientHeight` and
  `scrollWidth === clientWidth` at all four.
- **Round 1 found a real defect here that no component test could see:** `.wc-status` had no wrap
  rule under the narrow/short media query, so at 500px the Hunt ledger measured 744px wide and the
  Demand cell rendered at `left: 682` — entirely off-screen, invisible to a sighted player while
  `.wc-shell`'s `overflow: hidden` kept any scrollbar from appearing. Fixed by `flex-wrap: wrap` on
  `.wc-status` and `.wc-ledger`; re-measured at 500×844, every ledger cell now falls inside the
  viewport (Demand at `left: 299.3, right: 370.9`), with the felt and hand unclipped.
- **AC1:** a full 13-trick round played by mouse to `81 × 3 = 243` vs Demand 220 — **Demand
  cleared**; a second to `62 × 3 = 186` — **Demand missed**. Keyboard-only path exercised across
  `Tab`, arrow keys, `Enter`, and `Escape`: arming, cancelling, committing, "Let them lead", and
  carry-on all reachable and operable.
- **AC3:** the telegraph was present before every one of ~26 commits across both rounds — the live
  reading before each Quarry lead, the speculative reading while a card was armed, including the
  documented `null` case for a Woodcutter awaiting its ability choice.
- **AC9:** `list_console_messages` clean throughout — only Vite's connect/connected lines and the
  React DevTools banner, across two full rounds, a remount, and four resizes.

### Task 13.4: Write the PR description ✓

- Skill: none — a document, not code

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` and `mockup.html` in this folder; a summary of the change; **every item from this file's "Developer decides or observes" list**, with `FIXED_DEMAND` first and stated plainly as an unchosen placeholder; the verification results from Task 13.3 with the real numbers and the viewport sizes checked; and a one-line note for future contributors that the telegraph is derived every render rather than stored, and why.

Written to `pr-description.md` in this folder. The viewport sizes named in Task 13.3 Step 5
are listed in its verification table as **PENDING QA** — that step is QA's to run and its
sizes have not yet been checked by anyone, so no number is invented for them.

---

## Self-review

**Spec coverage:**

- AC1 — full 13-trick round, mouse and keyboard, cleared or missed — Tasks 5 (reducer-level round loop), 7 (keyboard path for the new control), 13.3 Step 5.
- AC2 — the five persistent readouts — Tasks 8 (ledger: Demand, Spoils, Standing band), 9 (dossier: character, rule-break, Quarry trick count), 10 (mounting both; player trick count already in the band).
- AC3 — intent shown before commit, every trick, leading and following — Tasks 4 (the preview module), 5 (the lead is no longer auto-committed), 6 (the component), 7 (both wirings + tests).
- AC4 — the end panel as `Spoils × Standing = Score`, then Demand, then verdict — Task 12.
- AC5 — full-viewport, no scroll — Task 11 (shell zone, narrow/short collapse, `min-width: 0` on the dossier), verified in Task 13.3 Step 5 at four named sizes.
- AC6 — component tests by role and label; accessible names on the telegraph, Demand, band, and rule-break — Tasks 6, 8, 9, 10 Step 4.
- AC7 — every number from config through T3/T4's functions — Tasks 1, 2, 10 Step 2, 12 Step 2; grep-verified in Task 13.2.
- AC8 — functional defaults, visual judgement deferred — Task 11 Step 2 (no new colour token); the deferral is recorded in the File map.
- AC9 — typecheck, lint, scoped Vitest green; driven in a browser with no console error — Task 13.3.
- In-scope bullet "a pure `previewQuarryIntent` module" — Task 4. "a reducer change" — Task 5. "the shell grid gaining one zone" — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. `FIXED_DEMAND = 220` is a *documented placeholder value* routed to the developer in the File map, not an invented tuning value presented as settled — the distinction the contract requires.

**Type / name consistency:** `FIXED_DEMAND`, `SLICE_QUARRY_CHARACTER`, `previewQuarryIntent`, `intentAccessibleName`, `STANCE_PHRASE`, `STANDING_BAND_NAME`, `DEMAND_OUTCOME_VERDICT`, `huntFixture`, `advanceQuarryLead`, `advanceQuarryFollow`, `quarryToLead`, `HuntLedger`, `QuarryDossier`, `IntentTelegraph`, and the props `hunt`, `huntScore`, `demand`, `spoils`, `band`, `outcome`, `info`, `speculative` are each spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes. The one deliberate refinement of `plan.md`: `commitQuarryMove` is used on the **lead** path only (Task 5 Step 2), because a follow's resolved-trick reveal needs the chosen card, which that function does not return — `plan.md` said the reducer commits the Quarry "through `commitQuarryMove` when one is pending", and a pending Quarry turn is only ever a lead, so this is consistent, not a change. CSS class names all take the existing `wc-` prefix and are declared in `warCouncilHunt.css` and used only by the components that own them.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking with no rendering change: the config keys have readers and tests, the `hunt` prop exists on the type and is passed by `App.tsx` and the test fixture, and `WarCouncilRound.tsx` deliberately does not destructure it yet, so nothing is declared-but-unused. Task 2 Step 4 forces any missed construction site to surface as a typecheck error rather than at runtime.
- **Phase 2** ends type-checking and fully functional: the telegraph renders and the Quarry's lead commits on the carry-on control. It is unstyled — the `.wc-telegraph` and `.wc-dossier` selectors arrive in Phase 3 — which affects appearance only; no test asserts layout, and the tasks explicitly defer the `warCouncilHunt.css` import and the `QuarryDossier` import to Tasks 11 and 10 so no module is imported before it exists.
- **Phase 3** ends type-checking with AC2 and AC5 satisfied and the layout matching the approved mockup; the two stylesheets and the two grown components are measured against the 400-line limit inside the phase, not after it.
- **Phase 4** ends type-checking with the last visible surface complete; the props change, its one call site, and its test all move in the single task, so there is no boundary at which `RoundOverPanel` has a shape nobody satisfies.
- **Phase 5** makes no production change.
