# Tasks: Rebuild the buff gallery, re-home the felt's game state, and add the trick consequence readout

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Run it with `--browser`.** AC1, AC10, AC11, AC17 and AC19 are functional questions with right answers that jsdom cannot answer — `npx vitest run` proves nothing about whether a card's text overflows or whether the gallery covers the decree.

Status: COMPLETE
Started: 2026-08-26

**Goal:** Replace the buff loadout list with a dense gallery of buff cards — metallic tier frame, roman numeral, coloured suit glyph, contrast-derived payoff bar, duplicates collapsed into a counted pile, five runs each opened by a card-shaped tab, unusable buffs fenced — re-home the felt into a permanent left game rail plus a stage so the gallery can never occlude the decree, spent pile or the Quarry's card, add a consequence readout to that rail that says what the led card does either way and renders nothing when it has nothing to say, give skulled cards a skull face, and delete the intent telegraph.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (the *scoped* view — `.claude/contract/DLR-147-full-ui-pass/mockup-buff-gallery.html` is the approved target but deliberately carries DLR-153's activation model and eight cut families).

---

## File map

**Created:**
- `src/app/warCouncil/buffGallery.ts` — pure gallery view-model: runs, tier order, `×N` stacks, the fence
- `src/app/warCouncil/trickConsequence.ts` — pure readout view-model: clause kinds, or `null`
- `src/app/warCouncil/consequenceLabels.ts` — the readout's copy, keyed over the closed clause union
- `src/app/warCouncil/BuffGallery.tsx` — the panel; owns the roving-tabindex group
- `src/app/warCouncil/BuffCard.tsx` — one stack's card
- `src/app/warCouncil/BuffRunTab.tsx` — a run's card-shaped tab (a `<div>`, never a `<button>`)
- `src/app/warCouncil/BuffTierFilter.tsx` — the tier chips, rendered outside `groupRef`
- `src/app/warCouncil/TrickConsequence.tsx` — the off-white slip in the rail
- `src/app/warCouncil/FeltRail.tsx` — decree · trick slot · readout · spent
- `src/app/warCouncil/FeltStage.tsx` — the felt's branch chain, lifted out of `WarCouncilRound.tsx`
- `src/app/warCouncil/warCouncilBuffGallery.css` — the gallery, the card, the tabs, the fence
- `src/app/warCouncil/warCouncilFeltRail.css` — the rail and the readout
- `src/app/warCouncil/__tests__/buffGallery.test.ts`
- `src/app/warCouncil/__tests__/trickConsequence.test.ts`
- `src/app/warCouncil/__tests__/BuffGallery.test.tsx`
- `src/app/warCouncil/__tests__/TrickConsequence.test.tsx`
- `src/app/warCouncil/__tests__/contrast.test.ts` — parses the stylesheets and asserts WCAG AA

**Modified:**
- `src/app/warCouncil/buffLabels.ts` — cadence word, tiered payoff, the card's accessible name
- `src/app/warCouncil/roundUiState.ts` — one new action kind and union member
- `src/app/warCouncil/buffHandlers.ts` — `handleCancelBuffPoise`
- `src/app/warCouncil/roundReducer.ts` — the new case
- `src/app/warCouncil/roundControlsProps.ts` — `buffGalleryProps`, `feltRailProps`, `feltStageProps`
- `src/app/warCouncil/WarCouncilRound.tsx` — the re-home, and the telegraph's removal
- `src/app/warCouncil/PlayingCard.tsx` — the skull face
- `src/app/warCouncil/SuitMark.tsx` — the `#wc-skull` symbol
- `src/app/warCouncil/TrickWell.tsx:128-140` — the copy that tells the player to read the intent
- `src/app/warCouncil/labels.ts:70-77` — delete `STANCE_PHRASE` and `intentAccessibleName`
- `src/app/warCouncil/ActionBar.tsx:49,58` — docblock references to the deleted component
- `src/app/warCouncil/warCouncil.css` — the new `:root` tokens
- `src/app/warCouncil/warCouncilCards.css` — `.wc-card-skull-face`, and `.wc-skull-mark` removed
- `src/app/warCouncil/warCouncilTable.css` — the felt's grid, and the stale `warCouncilCheats.css` comment
- `src/app/warCouncil/warCouncilActionBar.css:134-239` — the fourteen `.wc-loadout*` rules removed
- `src/app/warCouncil/warCouncilHunt.css:306-338` — the six `.wc-telegraph*` rules removed
- `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`
- `src/app/warCouncil/__tests__/TrickWell.test.tsx`
- `src/app/warCouncil/__tests__/PlayingCard.test.tsx`
- `src/app/warCouncil/__tests__/labels.test.ts`
- `src/app/warCouncil/__tests__/buffLabels.test.ts`
- `src/app/warCouncil/__tests__/ActionBar.test.tsx:147` — docblock reference

**Deleted:**
- `src/app/warCouncil/BuffLoadoutPanel.tsx`
- `src/app/warCouncil/IntentTelegraph.tsx`
- `src/app/warCouncil/intentPreview.ts`
- `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`
- `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`
- `src/app/warCouncil/__tests__/intentPreview.test.ts`
- `src/app/warCouncil/__tests__/WarCouncilRound.telegraph.test.tsx`

**Developer decides or observes:**
- **The cadence words.** This contract builds `TAKE / MISS / DODGE / WHEN / HAND END / PRESS`; the mockup says `WIN / LOSE`. Copy, and the mechanical-vs-outcome axis is the reason. Changing it is one map in `buffLabels.ts`.
- **Every colour token added in Task 4** — three tier metals and their edges, three face tints and their edges, the card ink pair, the skull wash. None chosen by anyone. **The 4.5:1 contrast floor is NOT yours to retune** and `contrast.test.ts` enforces it.
- **Every size bound added in Task 4** — `--wc-buffcard-w`, `--wc-rail-w`, `--wc-buff-frame`, the pile offsets, the sheen's duration/angle/width, the fenced card's drop.
- **The trick's cards moving between the stage and the rail when the gallery opens** (plan.md → Risks). Only the running app settles whether that reads as a move or a loss.
- **Whether fenced buffs re-sorting live mid-trick feels right.** This contract re-derives the view every render, so they re-sort live.
- **Whether to open a follow-up ticket** for `quarryIntent` / `TelegraphFidelity` / `TELEGRAPH_FIDELITY`, which the telegraph's deletion strands in the engine with no production consumer.
- **The 44-card deep pile's internal scroll.** `mockup.html`'s `Pile → deep` shows it. AC11 only promises the mid-trick fit; the fix if it bites is a narrower card, which is a tuning value.

---

## Phase 1 — The pure view-models

Three plain `.ts` modules beside their components, no React and no DOM, each tested without a renderer under the `node` Vitest project. Nothing renders differently at the end of this phase — every module is written, tested and unreferenced, so the phase boundary type-checks with the app untouched. This is deliberately the whole of the ticket's testable logic: by the end of Phase 1, which run a buff belongs to, how duplicates collapse, what order runs come in, which cards fence, and which consequence clauses a led card produces are all settled and pinned.

### Task 1: Build the gallery view-model in `src/app/warCouncil/buffGallery.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/buffGallery.ts`
- Test: `src/app/warCouncil/__tests__/buffGallery.test.ts`

- [x] **Step 1: Write the failing spec for run grouping, exact-identity collapse, tier order and the fence**

Create `src/app/warCouncil/__tests__/buffGallery.test.ts`. Build fixtures with `BUFF_TEMPLATES` from `src/hunt/buffTemplates.ts` so the spec cannot drift from the live thirteen. Cover, one `it` each:

- A Bells-targeting Taker lands in `BuffRunKind.Bells`; a Sidestep lands in `Suitless`; **Cheat and Timebomb land in `Press`, not `Suitless`** (AC4).
- `BUFF_RUN_ORDER` is `[Bells, Keys, Moons, Suitless, Press]` and `runs` comes back in that order, with empty runs omitted entirely.
- Two identical Bell-Takers collapse to one stack with `count: 2` and both ids in `ids` (AC7).
- **A bronze and a gold Bell-Taker (Blade) do NOT collapse** — tier is part of identity.
- **A Bell-Taker (Blade) and a Bell-Taker (Momentum) do NOT collapse** — reward axis is part of identity.
- Within a run, stacks are tier-descending, then template-id ascending; assert the order is **total** by building two piles with the same cards in different input order and asserting identical output.
- A stack whose `refusalFor` returns non-`null` is absent from `runs` and present in `fence`, whatever its run (AC8).
- `fence.reason` is the shared refusal when every fenced stack agrees, and `null` when they do not.
- `held` is the sum of every `count`; `usable` is the sum over unfenced stacks only.
- An empty pile returns `runs: []`, `fence.stacks: []`, `held: 0`, `usable: 0` — and does not throw.

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/buffGallery.test.ts`
Expected: fails to resolve `./buffGallery` — a transform error naming the missing module, not an assertion failure.

- [x] **Step 3: Write `buffGallery.ts` to the shapes in `plan.md` Part 2 → Data shapes**

Exports exactly `BuffRunKind`, `BUFF_RUN_ORDER`, `BuffStack`, `BuffRun`, `BuffFence`, `BuffGalleryView`, `buildBuffGallery`, `buffStackKey`, `buffRunOf`. Use the `as const` object-map form — `erasableSyntaxOnly` is on, so no `enum`.

```ts
import { BuffCadence, BUFF_CADENCE, buffTargetRankOf, buffTargetSuitOf, BuffTargetSuit, BuffTier, type Buff, type BuffActivationRefusal } from '../../hunt'

const RUN_FOR_SUIT: Readonly<Record<BuffTargetSuit, BuffRunKind>> = {
  [BuffTargetSuit.Bells]: BuffRunKind.Bells,
  [BuffTargetSuit.Keys]: BuffRunKind.Keys,
  [BuffTargetSuit.Moons]: BuffRunKind.Moons,
}

/** The ticket's own key: `suit ?? (cadence === PRESS ? 'press' : 'null')`. PRESS is the display
 *  word for `BuffCadence.Activated`, so the cadence is read from `BUFF_CADENCE` and never from
 *  a hard-coded list of the two activated kinds — restoring a consumable must not need an edit
 *  here. */
export function buffRunOf(buff: Buff): BuffRunKind {
  const suit = buffTargetSuitOf(buff)
  if (suit !== null) return RUN_FOR_SUIT[suit]
  return BUFF_CADENCE[buff.kind] === BuffCadence.Activated ? BuffRunKind.Press : BuffRunKind.Suitless
}

/** AC7's "exact ×N" is only true if the collapse key is exact: two cards merge only when they
 *  are the same card in EVERY respect a player could tell apart. */
export function buffStackKey(buff: Buff): string {
  return [
    buff.kind,
    buff.tier,
    buffTargetSuitOf(buff) ?? '',
    buffTargetRankOf(buff) ?? '',
    buff.reward.axis,
    buff.reward.value,
  ].join('|')
}

const TIER_RANK: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}
```

`buildBuffGallery` walks `buffs` once into a `Map<string, BuffStack>` keyed by `buffStackKey` (preserving pile order for `ids`, so `stack.buff` is the first-held copy and a repeated tap spends a stable one), calls `refusalFor` **once per stack** rather than once per copy, then partitions into runs and fence and sorts each run by `TIER_RANK` descending then `buffStackKey` ascending. No `Math.random()`, no date, no mutation of the input.

- [x] **Step 4: Run the spec green and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/buffGallery.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  N passed` with 0 failed; `tsc -b` exits 0.

### Task 2: Build the consequence view-model in `src/app/warCouncil/trickConsequence.ts` and its copy in `consequenceLabels.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/trickConsequence.ts`, `src/app/warCouncil/consequenceLabels.ts`
- Test: `src/app/warCouncil/__tests__/trickConsequence.test.ts`

- [x] **Step 1: Write the failing spec, one `it` per rank rule and per silence case**

Create `src/app/warCouncil/__tests__/trickConsequence.test.ts`. Every expected sentence is cited to `.docs/game_rules/the-hunt.md`, never invented in the spec.

- **Silence (AC14):** `led: null` → `null`. A led card whose `side` is `PlayerSide.Player` → `null`. A clean (unskulled) 4 led by the Quarry → `null`. A clean Treasure (7) led by the Quarry → `null` — *"No effect at all. A named card with no rule attached."*
- **The skull pair (AC13):** a skulled 4 → exactly two rows, `Win` then `Lose`. The `Win` row carries `YouEatSkull` at tone `Costly`; the `Lose` row carries `TheyEatSkull` at tone `Worthwhile`. This is `the-hunt.md` §7's dodge quadrant: **damage on a skull trick comes from winning it, never from losing it.**
- **The Swan clause:** a skulled Swan adds `SwanLoserLeads` to the **`Win` row only** — on the lose branch their Swan won and `nextLeaderAfterTrick` does nothing. An *unskulled* Swan led by the Quarry still produces the pair-less `Win`-only leader row… **assert instead that an unskulled Swan returns a single `Win` row carrying only `SwanLoserLeads`**, since the leader change is real whether or not a skull is present.
- **The Monarch (AC13):** a led Monarch produces a `Rule` row carrying `MonarchNarrowsFollow`, tone `Neutral`, whether or not it is skulled — cited to `the-hunt.md` §4 and `IllegalMoveReason.MustFollowMonarch`.
- **The lone Witch:** `led.rank === Witch` with `witchCount === 1` produces a `Rule` row carrying `LoneWitchIsTrump`. With `witchCount === 2` it produces **no rule row** — two Witches cancel.
- **Fox and Woodcutter produce no clause** — both resolve the instant the card is played, before the follow (`the-hunt.md` → *Timing*).
- **AC15:** no returned clause kind mentions the Quarry's hand or unplayed card, and when both `Win` and `Lose` rows exist **neither carries a flag, weight, or ordering that marks it as likely** — assert the two rows differ only in `branch` and `clauses`.
- `rows` is never empty when the return is non-`null`, and no `ConsequenceRow.clauses` is empty.
- Every `ConsequenceClauseKind` has an entry in `CONSEQUENCE_CLAUSE_TEXT`, and every entry is non-empty.

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/trickConsequence.test.ts`
Expected: fails to resolve `./trickConsequence` — a transform error, not an assertion failure.

- [x] **Step 3: Write `consequenceLabels.ts` — the copy, and nothing else**

```ts
/** PLACEHOLDER COPY, as this project's rest is. Every sentence is TRANSCRIBED from
 *  `.docs/game_rules/the-hunt.md` — the rank table for the three rule clauses, section 7's
 *  four-outcome table for the two skull clauses. Keyed over the closed clause union so a
 *  member added later fails to compile here rather than rendering `undefined`. */
export const CONSEQUENCE_CLAUSE_TEXT: Readonly<Record<ConsequenceClauseKind, string>> = {
  [ConsequenceClauseKind.YouEatSkull]:
    'You eat the skull — one heart, and your bank cashes at two-thirds.',
  [ConsequenceClauseKind.TheyEatSkull]:
    'They eat the skull. You bank the trick and your multiplier climbs.',
  [ConsequenceClauseKind.SwanLoserLeads]: 'Their Swan lost, so they lead the next trick.',
  [ConsequenceClauseKind.MonarchNarrowsFollow]:
    'You may play only your Swan of that suit, or your highest card of it.',
  [ConsequenceClauseKind.LoneWitchIsTrump]:
    'Their Witch counts as trump — unless you play a Witch too, and the two cancel.',
}

export const CONSEQUENCE_BRANCH_LABEL: Readonly<Record<ConsequenceBranch, string>> = {
  [ConsequenceBranch.Win]: 'If you win',
  [ConsequenceBranch.Lose]: 'If you lose',
  [ConsequenceBranch.Rule]: 'Rule',
}
```

Also export `consequenceAccessibleName(view)`, joining the led card's name (via `cardAccessibleName`, so the skull suffix comes from the one owner) with each row's label and clauses.

- [x] **Step 4: Write `trickConsequence.ts` to the shapes in `plan.md` Part 2 → Data shapes**

The three silence cases are **one guard at the top**, not a render-time check:

```ts
export function trickConsequence(facts: TrickConsequenceFacts): TrickConsequenceView | null {
  const { led } = facts
  // The readout speaks about THEIR card. No led card, or a card the player led themselves,
  // and there is nothing to say — AC14, and AC16's lead state, satisfied by construction.
  if (led === null || led.side === PlayerSide.Player) return null

  const rows: ConsequenceRow[] = []
  // …build Win/Lose from `facts.skulled` and the Swan clause, then any Rule row…

  // A clean card with no acting rank reaches here with nothing. Return `null`, never an empty
  // view: `game-ux` — do not render a panel that has nothing to say, and an empty view would
  // hand the component the choice.
  return rows.length === 0 ? null : { led: led.card, skulled: facts.skulled, rows }
}
```

Also export `trickConsequenceFacts(state: RoundUiState)`, deriving `led` from `state.round.currentTrick[0] ?? null`, `skulled` from `isSkulled(state.round.skulledCards, led.card)`, `trumpSuit` from `state.round.trumpSuit`, and `witchCount` by counting `CardRank.Witch` across `state.round.currentTrick` — so the rail and its spec cannot read the trick differently.

- [x] **Step 5: Run the spec green and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/trickConsequence.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  N passed` with 0 failed; `tsc -b` exits 0.

### Task 3: Extend `src/app/warCouncil/buffLabels.ts` with the cadence word, the tiered payoff, and the card's accessible name ✓

- Skill: `react-frontend` (and `game-designer` for Step 1's vocabulary check only — the mechanical-vs-outcome split in `CLAUDE.md`, no rule change)

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts`

- [x] **Step 1: Add the failing assertions to the existing spec**

Append to `src/app/warCouncil/__tests__/buffLabels.test.ts`:

- `buffCadenceWord` returns `'PRESS'` for Cheat and for Timebomb, **derived through `BUFF_CADENCE`** — assert by iterating every `BuffKind` and checking that every kind whose `BUFF_CADENCE` entry is `Activated` gets `'PRESS'`, so the derivation cannot be faked with a two-name list (AC9).
- `Taker → 'TAKE'`, `Feeder → 'MISS'`, `Sidestep → 'DODGE'`, `Hoarder → 'WHEN'` (Threshold), `Keepsake → 'HAND END'` (Terminal).
- **Every `BuffKind` resolves to a non-empty word** — including the eight cut families, which still have `BUFF_CADENCE` rows.
- `buffPayoff` on a Timebomb returns **both** figures at that card's own tier, and `risk` is `null` on every other kind (AC5).
- `buffCardAccessibleName` on a Timebomb contains both figures in one sentence (AC5's second half).
- `buffCardAccessibleName` contains `buffName(buff)` verbatim — this is what keeps
  `WarCouncilRound.actionBar.test.tsx`'s `getByRole('button', { name: /Cheat \(/ })` and
  `WarCouncilRound.timebomb.test.tsx`'s equivalents working across the rewrite.
- A stack with `count > 1` states the count; a stack with `count === 1` does not say "1 held".
- A `press` card poised reads `BUFF_POISED_HINT_PRESS` ("Tap again to spend"), every other card reads `BUFF_POISED_HINT` — for these two the second tap consumes the card and `Escape` will not bring it back.

- [x] **Step 2: Run and confirm the new assertions fail**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: the pre-existing assertions still pass; the new ones fail on missing exports.

- [x] **Step 3: Add the exports named in `plan.md` Part 2 → Data shapes**

```ts
/** AC9 — the cadence word, DERIVED from `BUFF_CADENCE` and never authored per card. */
const CADENCE_WORD: Readonly<Record<BuffCadence, string>> = {
  [BuffCadence.Event]: 'WHEN',      // narrowed by kind below — three live families share it
  [BuffCadence.Threshold]: 'WHEN',
  [BuffCadence.Terminal]: 'HAND END',
  [BuffCadence.Activated]: 'PRESS',
}

/** `Event` is shared by three live families that fire on different branches of the trick, so
 *  the word is narrowed by kind. MECHANICAL vocabulary — every buff condition reads
 *  `playerWon`, "did the player physically take the cards", NOT the outcome axis the bank and
 *  the damage read. `CLAUDE.md` names this as the single most common source of wrong statements
 *  about this game: a `WIN` pill on a Taker beside a readout saying "if you take the trick" is
 *  the two axes given one pair of words. Keyed over the closed `BuffKind` union; the eight cut
 *  families fall through to their `CADENCE_WORD`. */
const EVENT_WORD: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.Taker]: 'TAKE',
  [BuffKind.Feeder]: 'MISS',
  [BuffKind.Sidestep]: 'DODGE',
}

export function buffCadenceWord(buff: Buff): string {
  return EVENT_WORD[buff.kind] ?? CADENCE_WORD[BUFF_CADENCE[buff.kind]]
}
```

`buffPayoff` reads `TIMEBOMB_DAMAGE[buff.tier]` from `src/hunt` for the split — **not a literal**, so a retuned ladder cannot leave the card advertising a figure the engine will not honour. `buffCardAccessibleName` composes `buffName` + `buffConditionSentence` + the payoff sentence + the count + the poise/refusal suffix, reusing `BUFF_ACTIVATION_REFUSAL_MESSAGE`. **Do not delete `buffLine` or `buffRowAccessibleName`** — `src/app/run/SlotMachinePanel.tsx` and its spec consume them.

- [x] **Step 4: Run the spec green, typecheck, and measure the file**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts; npm run typecheck; (Get-Content src\app\warCouncil\buffLabels.ts).Count`
Expected: `Tests  N passed`, 0 failed; `tsc -b` exits 0; the count is under 400 (it starts at 177).

---

## Phase 2 — The reducer's one-level unwind

One action, one handler, one reducer case, added together so no phase boundary sits between a dispatched action and the case that handles it. `RoundUiAction` is a discriminated union with a single exhaustive `switch` in `roundReducer.ts`, so a missing case is a compile error rather than a silent no-op — that is the guard, and this phase relies on it. Nothing dispatches the new action yet; the phase ends type-checking with the app behaving exactly as before.

### Task 4: Add `CancelBuffPoise` to `roundUiState.ts`, `buffHandlers.ts` and `roundReducer.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncil/buffHandlers.ts`, `src/app/warCouncil/roundReducer.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Write the failing assertions**

Append to `src/app/warCouncil/__tests__/roundReducer.test.ts`:

- From a state with `loadout: { poised: <id> }`, `CancelBuffPoise` returns `loadout: { poised: null }` — **the panel stays open**.
- From a state with `loadout: { poised: null }`, `CancelBuffPoise` is a **no-op** — it does not close the panel, so a stray `Escape` cannot shut a panel by accident.
- From a state with `loadout: null`, `CancelBuffPoise` is a no-op.
- `CancelLoadout` still closes outright from both poised and unpoised — unchanged, because the bar's own toggle dispatches it.

- [x] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: the new assertions fail; the pre-existing ones pass.

- [x] **Step 3: Add the action kind and the union member**

In `src/app/warCouncil/roundUiState.ts`, add to `RoundUiActionKind` and to `RoundUiAction`:

```ts
  /** AC18 — `Escape` unwinds ONE level: this drops an unspent poise and leaves the panel open.
   *  `CancelLoadout` keeps meaning "close outright", which is what the bar's toggle dispatches. */
  CancelBuffPoise: 'cancelBuffPoise',
```
```ts
  | { readonly kind: typeof RoundUiActionKind.CancelBuffPoise }
```

- [x] **Step 4: Add the handler and the reducer case**

In `src/app/warCouncil/buffHandlers.ts`, beside `handleCancelLoadout`:

```ts
/** Drops an unspent poise, leaving the panel open. A no-op when the panel is shut or nothing
 *  is poised — returning `state` itself, not a fresh object, so an idle `Escape` cannot even
 *  cause a re-render. */
export function handleCancelBuffPoise(state: RoundUiState): RoundUiState {
  if (state.loadout === null || state.loadout.poised === null) return state
  return { ...state, loadout: { ...state.loadout, poised: null } }
}
```

Add the matching `case RoundUiActionKind.CancelBuffPoise:` to `roundReducer.ts`'s switch, delegating to it.

- [x] **Step 5: Run the spec green, typecheck, and measure `roundUiState.ts`**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts; npm run typecheck; (Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: `Tests  N passed`, 0 failed; `tsc -b` exits 0; the count is **at or under 400**.

Result: `Tests  27 passed` (0 failed); `tsc -b` exited 0; `(Get-Content src\app\warCouncil\roundUiState.ts).Count` returned **396** — under 400, no split into `roundUiActions.ts` needed.

`roundUiState.ts` is **392 lines before this task** — the tightest budget in the contract. If the count comes back over 400, do not trim a comment to squeak under: move `RoundUiActionKind` and the `RoundUiAction` union into a new `src/app/warCouncil/roundUiActions.ts` and re-export both from `roundUiState.ts` (`export * from './roundUiActions'`), which keeps all 20-odd importers compiling unchanged. Re-run this step afterwards.

---

## Phase 3 — The buff gallery

The tokens, the stylesheet, the four components, and the swap-in, in that order. The phase ends with `BuffLoadoutPanel` deleted and `BuffGallery` mounted in its place inside the felt exactly where the old panel was — the felt's own grid does not change until Phase 5, so this phase is a like-for-like component replacement and AC1 is not yet true. That is the safe boundary: the app compiles, the panel works, and the layout is still the old one.

### Task 5: Add the gallery's `:root` tokens to `src/app/warCouncil/warCouncil.css` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/warCouncil.css`
- Config: none

- [x] **Step 1: Append the tokens from `plan.md` Part 2 → Data shapes → New CSS tokens**

Add every token in that table to the existing `:root` block, each under a comment stating it is a PLACEHOLDER the developer owns — except the three `--wc-payoff-ink-*` values, which carry their measured ratio and a note that they are **contrast-derived, not chosen**:

```css
  /* DLR-148 — the settled buff card: a near-neutral face with tier carried by a METALLIC
     FRAME, so tier and suit stop competing for one colour channel. That is a measured
     decision, not taste: the Bells suit colour #c9873f sits 28.7 RGB units from the old
     bronze tier field #b0793f — effectively the same amber. Every value below is a
     PLACEHOLDER and the developer's, EXCEPT the three payoff inks. */
  --wc-m-bronze: linear-gradient(142deg, #f3c894 0%, #b0702e 22%, #65401c 47%, #e0a561 64%, #7d4d20 100%);
  /* …silver, gold, the three edges, the three face tints and their edges, the ink pair… */
  --wc-buff-frame: 5px;  /* at 3px the colour reads but the shine has nowhere to land */

  /* CONTRAST-DERIVED, NOT CHOSEN. White FAILS WCAG AA on all three suits at this size —
     Bells 2.99:1, Keys 3.37:1, Moons 3.51:1. These pass: 6.22 / 4.92 / 5.14:1. The suit
     colours are placeholders; the 4.5:1 floor is not. Retune a suit and RE-MEASURE — the
     whole point is that the failing option was the one that looked obvious.
     Enforced by `__tests__/contrast.test.ts`. */
  --wc-payoff-ink-bells: #1d1004;
  --wc-payoff-ink-keys: #06212e;
  --wc-payoff-ink-moons: #1c1030;

  /* PLACEHOLDER, but CONSTRAINED — chosen against the PANEL's measured width, not the
     viewport's. At 7.6vw the card was 109px, six per row, three rows, 56px of overflow that
     pushed the fence out of sight. 6vw gives ~86px and EIGHT per row. Retune only against a
     measurement. */
  --wc-buffcard-w: clamp(4.6rem, 6vw, 6.6rem);
  --wc-rail-w: clamp(9rem, 14vw, 13.5rem);
```

- [x] **Step 2: Confirm the tokens parse and nothing else moved**

Run: `npx prettier --check src/app/warCouncil/warCouncil.css; (Get-Content src\app\warCouncil\warCouncil.css).Count`
Expected: prettier reports the file formatted; the count is under 400 (it starts at 295).

### Task 6: Write `src/app/warCouncil/warCouncilBuffGallery.css` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Create: `src/app/warCouncil/warCouncilBuffGallery.css`

- [x] **Step 1: Author the stylesheet, re-authored from `mockup.html` rather than ported**

Class names `wc-gallery*`, `wc-buffcard*`, `wc-runtab*`, `wc-fence*`, `wc-stack`. Every rule takes its colours from the Task 5 tokens; no literal colour and no literal size outside a `clamp()` bound that is itself a token. Five rules are **structural guarantees, not styling**, and each carries a comment saying so at the point of use:

```css
/* CARRY — a card's size must not encode how many there are. `repeat(auto-fill, <fixed>)`,
   NEVER `minmax(…, 1fr)`: with `1fr`, filtering the gallery down to three gold cards
   stretched those three across the whole panel. */
.wc-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--wc-buffcard-w));
  justify-content: start;
  align-content: start;
  gap: clamp(0.4rem, 1vw, 0.8rem);
  padding-top: 13px;   /* headroom for the duplicate pile's layers, which step up and right */
  padding-right: 13px;
}

/* CARRY — the card MUST be its own stacking context and MUST clip itself. Without
   `isolation`, the face's `z-index: 1` and the sheen's `z-index: 0` resolve in the GRID's
   stacking context rather than the card's, so one card's face paints over the card beside it
   and the sheen escapes the card it belongs to. Without `overflow: hidden` the sheen —
   deliberately taller and wider than the card, so the band can travel — sweeps across the
   neighbouring cards and the felt instead of along this card's rim. Both were observed on the
   first render of `mockup.html`. */
.wc-buffcard { isolation: isolate; overflow: hidden; display: block; position: relative; }

/* CARRY — the pile layers must be ordered EXPLICITLY behind the card. They are absolutely
   positioned and the card is `position: relative`, so at `z-index: auto` the order depends on
   whatever stacking context happens to be nearest, and the pile silently paints OVER its own
   card: a stacked buff renders as a blank slab of metal with no face at all. That does not
   read as a z-order bug, it reads as "that card is broken". */
.wc-stack { position: relative; display: block; isolation: isolate; }
.wc-stack .wc-stack-layer { position: absolute; inset: 0; z-index: 0; }
.wc-stack > .wc-buffcard { z-index: 1; }

/* CARRY — ONE LINE, ALWAYS. A bar pinned to the bottom that gains a second line grows UPWARD
   into the condition text, after which no percentage above it can be safe. `nowrap` is what
   makes the rest of the card's vertical layout computable. Expect this again the first time a
   reward string gets longer, and expect it on one card out of thirteen rather than all. */
.wc-buffcard-payoff { white-space: nowrap; overflow: hidden; }

/* CARRY — the top row is `nowrap`, and the NOWRAP is the guarantee, not the smaller sizes.
   At the ~86px the grid affords, suit mark + numeral + cadence + count stopped fitting and the
   row grew a second line that pushed the name down into itself. The sizes buy headroom; this
   makes the row's height a constant. */
.wc-buffcard-top { display: flex; flex-wrap: nowrap; overflow: hidden; }

/* CARRY — the condition text needs a FLOOR as well as a ceiling. `top: 50%` because a two-line
   name reaches 47% of an 86px card; `bottom: 30%` because the payoff bar's top edge sits at
   73%. Both measured on the rendered card. */
.wc-buffcard-cond { position: absolute; top: 50%; bottom: 30%; overflow: hidden; }
```

**No paper grain.** Add the two prohibitions as a comment where a future ticket would add it — `filter: url(#grain)` over `feTurbulence` timed out `Page.captureScreenshot` at 120s with eleven cards on screen, and `mix-blend-mode` on the overlay forces a compositing layer per card and stalled the rasteriser even after the filter was removed. The hover sheen fires **once per hover, never on a loop**, and under `prefers-reduced-motion` the band does not travel — the static specular brightens instead, so the hover still reads.

Wrap every hover rule in `@media (hover: hover)` and pair it with `:active`; use `:focus-visible`; give the card `touch-action: manipulation`.

- [x] **Step 2: Confirm formatting and the line budget** — exceeded 400 as one sheet (630 lines); split into `warCouncilBuffGallery.css` (272) + `warCouncilBuffCard.css` (387), both imported from `BuffGallery.tsx`

Run: `npx prettier --check src/app/warCouncil/warCouncilBuffGallery.css; (Get-Content src\app\warCouncil\warCouncilBuffGallery.css).Count`
Expected: formatted; under 400 lines. If it exceeds 400, split the card's own rules into `warCouncilBuffCard.css` and import both from `BuffGallery.tsx`.

### Task 7: Write `BuffCard.tsx` and `BuffRunTab.tsx` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Create: `src/app/warCouncil/BuffCard.tsx`, `src/app/warCouncil/BuffRunTab.tsx`

- [x] **Step 1: Write `BuffCard.tsx`**

```tsx
interface BuffCardProps {
  readonly stack: BuffStack
  readonly poised: boolean
  readonly tabIndex: number
  readonly onTap: (id: BuffId) => void
}
```

The `<button>` **is** the grid item and contains **only phrasing content** — `<span>`s throughout, no `<h3>` and no `<p>`. Both are CARRY traps from the mockups: a `<button>` may only contain phrasing content, and it stops stretching the moment it is not a direct grid item, which broke that layout three separate times. When `stack.count > 1` the card is wrapped in `<span className="wc-stack">` carrying one or two `<span className="wc-stack-layer">` siblings **before** the button.

The face carries, in order: the top row (suit glyph via `SuitMark` / an em-dash for suitless, the roman numeral, the cadence pill from `buffCadenceWord`, and `×N` when `count > 1`), the name from `buffName`, the condition from `buffConditionSentence`, and the payoff bar from `buffPayoff` — split into two spans when `risk` is non-`null`. **The tier WORD is not rendered here**: tier is already carried by the metal, the numeral and the tinted face, and it was the line that pushed the condition into the bar. `aria-label={buffCardAccessibleName(stack, poised, stack.refusal)}`, `aria-pressed={poised}`, `disabled={stack.refusal !== null}`.

- [x] **Step 2: Write `BuffRunTab.tsx`**

A **`<div>`, not a `<button>`** — it labels a run, it is not a control, and `useRovingTabIndex` indexes `groupRef.current.querySelectorAll('button')` **positionally**, so any extra button inside the group silently breaks arrow-key traversal. Carries the suit glyph, the run's name and its held count. `aria-hidden="true"`: the count is already in each card's accessible name, and the visual grouping is a sighted-scanning aid. Solid border for `Press`, dashed for the other four — it names an **action** rather than the absence of a target suit.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 8: Write `BuffTierFilter.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/BuffTierFilter.tsx`

- [x] **Step 1: Write the component**

```tsx
interface BuffTierFilterProps {
  readonly counts: Readonly<Record<BuffTier | 'all', number>>
  readonly selected: BuffTier | 'all'
  readonly onSelect: (tier: BuffTier | 'all') => void
}
```

Four `<button>`s with `aria-pressed`, each a metal swatch plus the tier word plus a live count. **These are real buttons and they must be rendered OUTSIDE `groupRef`** — see Task 9. Each is ≥44px in its hit area.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 9: Write `BuffGallery.tsx` with the roving-tabindex group and the two-level `Escape` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Create: `src/app/warCouncil/BuffGallery.tsx`
- Test: `src/app/warCouncil/__tests__/BuffGallery.test.tsx`

- [x] **Step 1: Write the failing component spec**

Create `src/app/warCouncil/__tests__/BuffGallery.test.tsx` (the `dom` project). Query by accessible role and label only.

- **AC18 — arrow keys traverse.** Render a gallery with ≥5 usable stacks across two runs; `ArrowRight` from the first card focuses the second, stepping **over the run tab** (which is a `<div>` and therefore not in the collection at all). `Home`/`End` jump to first/last.
- **AC18 — Enter/Space poises then activates.** `Enter` on a focused card fires nothing yet and sets `aria-pressed="true"`; a second `Enter` calls `onTapBuff` with the stack's first id.
- **AC18 — `Escape` unwinds one level.** With a card poised, `Escape` calls `onCancelPoise` and **not** `onClose`. With nothing poised, `Escape` calls `onClose`.
- **AC7 — duplicates.** A stack with `count: 3` renders **one** card whose accessible name states 3 held, and whose visible text contains `×3`.
- **AC8 — the fence.** Fenced stacks are absent from the grid group, present in the fence, `disabled`, and the fence states the count and the shared reason using `BUFF_ACTIVATION_REFUSAL_MESSAGE`.
- **AC4 — Cheat and Timebomb appear under the `Press` run tab, not the suitless one.**
- **The empty pile does not crash** — this is the exact `isFocusable(0)` probe that has caused an integration-only crash before.
- The tier filter narrows the grid, and the fence's count follows.

- [x] **Step 2: Run and confirm failure** — confirmed the underlying component didn't exist yet at this point in the phase; the recorded first failing run (once the test and a stub import existed) was the case-collision crash below, fixed before Step 4

- [x] **Step 3: Write the component**

Keeps `role="dialog"` and `aria-label={LOADOUT_PANEL_LABEL}` — **load-bearing**: `WarCouncilRound.actionBar.test.tsx` and `WarCouncilRound.timebomb.test.tsx` both reach the panel through `getByRole('dialog', { name: 'Your buffs' })`.

```tsx
// The roving collection is the GRID's cards and nothing else. `useRovingTabIndex` indexes
// `groupRef.current.querySelectorAll('button')` POSITIONALLY with no typed contract, so every
// focusable control inside `groupRef` must be a native <button> in DOM order — which is why
// the run tabs are <div>s and the tier chips are rendered ABOVE this element, outside the ref.
const cards = view.runs.flatMap((run) => run.stacks)
// Guards against `stacks[index]` being undefined: the hook probes `isFocusable(0)`
// unconditionally even when the collection is empty. This exact gap caused an
// integration-only crash before; it is load-bearing, not defensive noise.
const isFocusable = (i: number) => cards[i] !== undefined && cards[i].refusal === null
const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(cards.length, isFocusable, onCancelPoise)
```

`Escape` is handled **once**, on the outer container, and chooses the level: `poised !== null ? onCancelPoise() : onClose()`. Keep the outer `onClick={(e) => e.stopPropagation()}` — this mounts inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting.

The tier filter is component-local `useState<BuffTier | 'all'>('all')` — ephemeral view state that dies with the panel, not round state. **No `useMemo`**: `buildBuffGallery` runs over a pile of at most a few dozen cards, once per render of a panel that is open only between tricks.

- [x] **Step 4: Run the spec green and typecheck** — `Tests 13 passed`; `tsc -b` exit 0. Note: hit and fixed a Windows/Vite case-collision between `BuffGallery.tsx` and the pre-existing `buffGallery.ts` (see Notes) by renaming the latter to `buffGalleryModel.ts`

### Task 10: Swap the gallery in, delete `BuffLoadoutPanel`, and strip its stylesheet ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundControlsProps.ts`, `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/ActionBar.tsx:49,58`, `src/app/warCouncil/warCouncilActionBar.css:134-239`
- Delete: `src/app/warCouncil/BuffLoadoutPanel.tsx`, `src/app/warCouncil/__tests__/BuffLoadoutPanel.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.actionBar.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx`, `src/app/warCouncil/__tests__/ActionBar.test.tsx:147`

- [x] **Step 1: Rename `buffLoadoutPanelProps` to `buffGalleryProps` and return `BuffGalleryProps`**

```ts
export function buffGalleryProps({ ui, dispatch, offered }: BuffGalleryOptions): BuffGalleryProps {
  return {
    // The ONE reading of the window, through the gate `buffActivationWindowOpen` already owns.
    // Twelve of the thirteen live cards are `discardWindowOpen` (between tricks); Cheat alone
    // is `canAct`, because the one moment a Cheat has value is FOLLOWING an already-committed
    // lead. This ticket reads that gate and does not move it.
    view: buildBuffGallery(offered, (buff) => loadoutRefusalFor(ui, buff)),
    poised: ui.loadout?.poised ?? null,
    onTapBuff: (id) => dispatch({ kind: RoundUiActionKind.TapBuff, id }),
    onCancelPoise: () => dispatch({ kind: RoundUiActionKind.CancelBuffPoise }),
    onClose: () => dispatch({ kind: RoundUiActionKind.CancelLoadout }),
  }
}
```

- [x] **Step 2: Swap the mount in `WarCouncilRound.tsx` and delete the old component**

Replace the `<BuffLoadoutPanel {...buffLoadoutPanelProps(…)} />` line and its import with `<BuffGallery {...buffGalleryProps(…)} />`. Delete `BuffLoadoutPanel.tsx` and `__tests__/BuffLoadoutPanel.test.tsx`. Update the two docblock references in `ActionBar.tsx` (lines 49 and 58) and the one in `ActionBar.test.tsx:147` to name `BuffGallery` — the reasoning they record (why that `stopPropagation` is load-bearing) is still true of the new component.

- [x] **Step 3: Delete the fourteen `.wc-loadout*` rules from `warCouncilActionBar.css`**

Remove lines 134–239. Leave the bar's own rules untouched.

- [x] **Step 4: Re-point the two integration specs at the gallery** — also re-pointed `WarCouncilRound.timebomb.test.tsx`'s "cancels the poise on Escape" case: AC18's two-level Escape means the panel now stays OPEN with the poise dropped, where the pre-DLR-148 test expected the panel to close outright on the first Escape

`WarCouncilRound.actionBar.test.tsx` and `WarCouncilRound.timebomb.test.tsx` reach rows through `getByRole('dialog', { name: 'Your buffs' })` then `getByRole('button', { name: /Cheat \(/ })`. Both selectors survive, because `BuffGallery` keeps the dialog role and label and `buffCardAccessibleName` contains `buffName` verbatim. Update only what genuinely changed: the assertion at `actionBar.test.tsx:119` that a refused row shows `"Not between tricks."` now finds that string on the **fence's shared-reason line** rather than on a per-row `<p>`, so re-point it at the fence and assert the count alongside it.

- [x] **Step 5: Run every affected spec and typecheck** — `Tests 33 passed`, 0 failed; `tsc -b` exit 0

### Task 11: Assert the payoff inks meet WCAG AA ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/__tests__/contrast.test.ts`

- [x] **Step 1: Write the spec — it reads the stylesheet, so the CSS stays the single owner**

AC6 says assert it, do not eyeball it. Exporting the hex values from TypeScript and mirroring them in CSS would be two sources of truth for one colour; instead the spec parses the real stylesheet, so retuning a suit without re-measuring **fails the build**.

```ts
import { readFileSync } from 'node:fs'

/** WCAG 2.x relative luminance. The divisor is `>= 0.05` by construction, so no NaN is
 *  reachable — there is no guard to write because there is no degenerate case. */
function luminance(hex: string): number { /* sRGB -> linear, 0.2126/0.7152/0.0722 */ }
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function token(css: string, name: string): string {
  const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})'))
  if (m === null) throw new Error(`token --${name} not found — was it renamed?`)
  return m[1]
}
```

The `throw` is deliberate: a renamed token must fail loudly, not silently pass by comparing `undefined`.

Assert, over `src/app/warCouncil/warCouncil.css`:

- `--wc-payoff-ink-bells` on `--wc-bells` ≥ 4.5
- `--wc-payoff-ink-keys` on `--wc-keys` ≥ 4.5
- `--wc-payoff-ink-moons` on `--wc-moons` ≥ 4.5
- **The regression the ink exists for:** `#ffffff` on each of the three suits is **below** 4.5 — so the spec fails if someone "simplifies" the bar back to white text.

- [x] **Step 2: Run it** — `Tests 5 passed`, 0 failed

---

## Phase 4 — The skull face

One rendering change to one component plus one symbol. It is isolated from everything else in this contract, it touches no layout, and `PlayingCard`'s props do not change — `skulled` already exists and only what it draws is different — so none of its 15 non-owner construction sites needs an edit. The phase ends with skulls rendering as faces everywhere a card is face up, including the player's own hand and the decree.

### Task 12: Give a skulled card the skull face ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Modify: `src/app/warCouncil/PlayingCard.tsx`, `src/app/warCouncil/SuitMark.tsx`, `src/app/warCouncil/warCouncilCards.css`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx`

- [x] **Step 1: Write the failing assertions**

Append to `src/app/warCouncil/__tests__/PlayingCard.test.tsx`:

- **AC12 — identical on every rank and suit.** Render every combination of the five acting ranks and a plain rank across all three suits with `skulled`, and assert the skull element's markup is byte-identical each time — a skull is a property of the **trick**, not of a character, so a player must recognise one across the table without reading it.
- **AC12 — the corner survives.** A skulled card still renders its rank and its suit mark, because the trick is still won on rank and suit.
- The accessible name still ends `", skulled"` via `cardAccessibleName` — unchanged, one owner.
- A skulled **and** primed card renders both the skull face and the primed mark: a skull **replaces** the art, a Timebomb is **added**. A primed Swan is still a Swan.
- An unskulled card renders the pip and **no** skull element.

- [x] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx`
Expected: the new assertions fail; the pre-existing ones pass.

- [x] **Step 3: Add the `#wc-skull` symbol to `SuitSymbolSheet` in `SuitMark.tsx`**

One `<symbol id="wc-skull">` beside the three suit symbols, referenced by `<use>`. **One skull in the document however many skulled cards are on screen** — N skulled cards then cost one path rather than N. Follow the file's existing convention and set **no `stroke-width`**, so call sites choose weight in CSS.

- [x] **Step 4: Replace the corner glyph with the face in `PlayingCard.tsx`**

```tsx
{/* AC12 — a skull REPLACES the art; a Timebomb is ADDED. One bone skull on one dark wash,
    identical on every rank and suit. The corner index keeps rank, suit glyph and rank name,
    because the trick is still won on those. */}
{skulled ? (
  <span className="wc-card-skull-face" aria-hidden="true">
    <svg viewBox="0 0 32 32"><use href="#wc-skull" /></svg>
  </span>
) : (
  <span className={`wc-card-pip${hasAbility ? '' : ' wc-is-blank'}`} aria-hidden="true" />
)}
```

Delete the `{skulled && <span className="wc-skull-mark">☠</span>}` block and the `.wc-skull-mark` rule from `warCouncilCards.css`; add `.wc-card-skull-face`. The wash colour is a **placeholder** token, commented as the developer's.

- [x] **Step 5: Run the spec green, typecheck, and measure**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx; npm run typecheck; (Get-Content src\app\warCouncil\warCouncilCards.css).Count`
Expected: `Tests  N passed`, 0 failed; `tsc -b` exits 0; the CSS is under 400 lines (it starts at 346).

---

## Phase 5 — The felt re-home, the readout, and the telegraph's deletion

The structural phase, and the one that makes AC1 true. The felt's grid becomes `rail | stage`, the rail gains the trick slot and the readout, the intent telegraph is deleted in both halves, and `WarCouncilRound.tsx` comes back under its line budget by handing the branch chain to `FeltStage`. These land in one phase because splitting them leaves a boundary where the felt has two columns and nothing renders in one of them.

### Task 13: Write `TrickConsequence.tsx` and `warCouncilFeltRail.css` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Create: `src/app/warCouncil/TrickConsequence.tsx`, `src/app/warCouncil/warCouncilFeltRail.css`
- Test: `src/app/warCouncil/__tests__/TrickConsequence.test.tsx`, `src/app/warCouncil/__tests__/contrast.test.ts`

- [x] **Step 1: Write the failing component spec**

Create `src/app/warCouncil/__tests__/TrickConsequence.test.tsx`:

- **AC14 — `view={null}` renders nothing at all.** Assert `container.firstChild` is `null`: no placeholder row, no empty frame, no "nothing to report" text. A readout that sits in the same place every turn becomes furniture, and furniture teaches a player to stop looking — which is what would make it invisible on the hand that matters.
- **AC13** — a skulled view renders both branch labels and both consequences.
- **AC15** — neither branch row carries an emphasis class, an ordering marker, or an `aria-*` attribute the other lacks.
- The label is plain and **never carries a consequence colour** — colour appears only on the consequence itself.
- The whole readout has one accessible name from `consequenceAccessibleName`.

- [x] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickConsequence.test.tsx`
Expected: fails to resolve `../TrickConsequence`.

**Note:** it failed differently than predicted, for the reason `buffGalleryModel.ts`'s docblock
already documents — `../TrickConsequence` case-insensitively resolved to the existing
`trickConsequence.ts` (no default export ⇒ `undefined`), throwing `Element type is invalid`
rather than a bare module-not-found. Confirmed the SAME collision by creating a throwaway
`TrickConsequence.tsx` stub alongside the still-named `trickConsequence.ts`: it reproduced
identically. Fixed the root cause before Step 3 rather than building on top of it — renamed
`trickConsequence.ts` → `trickConsequenceModel.ts` and `__tests__/trickConsequence.test.ts` →
`__tests__/trickConsequenceModel.test.ts`, updating the one production consumer
(`consequenceLabels.ts`) and both specs' imports. This is outside this task's own `**Files:**`
list but is the same fix already applied once this contract for `buffGallery.ts` →
`buffGalleryModel.ts`, for the identical reason.

- [x] **Step 3: Write the component and the stylesheet**

`TrickConsequence` takes `{ view: TrickConsequenceView | null }` and returns `null` when `view` is `null` — the component decides nothing; `trickConsequence` already did.

`warCouncilFeltRail.css` styles `.wc-felt-rail` — **which has had no CSS rule at all since `warCouncilCheats.css` was deleted**; `warCouncilTable.css:8` still points at that missing file — plus `.wc-rail-*` and `.wc-readout-*`. Add the readout's four measured tokens to `warCouncil.css`'s `:root` with their ratios:

```css
  /* DLR-148 — the readout is an off-white slip matching the card faces. On this LIGHT ground
     BOTH project accent tokens fail WCAG AA outright: --wc-alarm falls to 3.03:1 and
     --wc-brass to 2.29:1. Each is replaced by a DARKER MEMBER OF ITS OWN FAMILY, so it still
     reads as "the red one" and "the gold one" rather than as a new colour. Values are
     placeholders; the 4.5:1 floor is not. Enforced by `__tests__/contrast.test.ts`. */
  --wc-readout-ground: #f6f2e8;
  --wc-readout-ink: #1b1710;        /* 15.96:1 */
  --wc-readout-label: #5f5647;      /*  6.46:1 */
  --wc-readout-costly: #96301f;     /*  6.86:1 */
  --wc-readout-worthwhile: #6f5412; /*  6.36:1 */
```

- [x] **Step 4: Extend `contrast.test.ts` with the readout's four pairs**

Assert each of `--wc-readout-ink`, `--wc-readout-label`, `--wc-readout-costly`, `--wc-readout-worthwhile` against `--wc-readout-ground` at ≥ 4.5, **and** assert that `--wc-alarm` and `--wc-brass` on that ground are **below** 4.5 — the regression guard, so nobody "simplifies" the readout back onto the project accents.

- [x] **Step 5: Run both specs green and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickConsequence.test.tsx src/app/warCouncil/__tests__/contrast.test.ts; npm run typecheck`
Expected: `Tests  N passed`, 0 failed; `tsc -b` exits 0.

### Task 14: Write `FeltRail.tsx` and `FeltStage.tsx` and their prop builders ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Create: `src/app/warCouncil/FeltRail.tsx`, `src/app/warCouncil/FeltStage.tsx`
- Modify: `src/app/warCouncil/roundControlsProps.ts`

- [x] **Step 1: Write `FeltRail.tsx`**

Renders, top to bottom: `DecreePile`, a rule, the trick section, a rule, `DiscardPile`. The trick section renders the condensed trick strip **only when `trick !== null`** — the caller passes `null` while the gallery is shut, because the stage's own `TrickWell` is showing the cards then. The `TrickConsequence` slip renders **in both states**, directly beneath, which is the whole point of the rail placement: under the trick well it would vanish at the exact moment the player is choosing a buff, which is when knowing the consequence matters most.

- [x] **Step 2: Write `FeltStage.tsx`**

Takes the felt's branch chain out of `WarCouncilRound.tsx` verbatim — fault, held reveal, round over, ability prompt, in-progress trick — behind one props object. **Move the branches, do not rewrite them**: their ordering is load-bearing and documented (the held reveal is checked before `roundComplete` so the deciding sixth trick is shown at all).

**Note:** the chain itself lives in `roundControlsProps.ts`'s `feltStageProps` (built with
`createElement`, since that file is `.ts`, not `.tsx`) — `FeltStage.tsx` is the thin wrapper the
plan's own Data-shapes section specifies (`{ children: ReactNode }`), matching Step 3's builder.
`WarCouncilRound.tsx` still carries its OWN copy of the chain until Task 15 removes it — Task 15
Step 2 is what rewires the call site to `feltStageProps` and deletes the original.

- [x] **Step 3: Add `feltRailProps` and `feltStageProps` to `roundControlsProps.ts`**

Same shape as the two builders already there: one named-fields options object, because these carry several same-typed values that would transpose silently as positional arguments. `feltRailProps` takes `{ ui, galleryOpen }` and calls `trickConsequenceFacts(ui)` then `trickConsequence(...)`.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 15: Re-home the felt in `WarCouncilRound.tsx` and `warCouncilTable.css`, and delete the intent telegraph ✓

- Skill: `react-frontend`, `game-ux`

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/warCouncilTable.css`, `src/app/warCouncil/warCouncilHunt.css:306-338`, `src/app/warCouncil/labels.ts:70-77`, `src/app/warCouncil/TrickWell.tsx:128-140`
- Delete: `src/app/warCouncil/IntentTelegraph.tsx`, `src/app/warCouncil/intentPreview.ts`, `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`, `src/app/warCouncil/__tests__/intentPreview.test.ts`, `src/app/warCouncil/__tests__/WarCouncilRound.telegraph.test.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `src/app/warCouncil/__tests__/TrickWell.test.tsx`, `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Change the felt's grid in `warCouncilTable.css`**

```css
.wc-table {
  /* DLR-148 — `game rail | stage`, replacing `1fr auto 1fr` with an absolutely-positioned
     panel over the middle. AC1 is a STRUCTURAL guarantee, not a z-index: the decree, the live
     trick and the spent pile are a grid COLUMN, so nothing the stage renders can occlude
     them. */
  grid-template-columns: var(--wc-rail-w) minmax(0, 1fr);
  gap: clamp(0.35rem, 1vw, 0.8rem);
  align-items: stretch;
  justify-items: stretch;
}
```

Correct the stale comment at line 8 — it says `.wc-felt-rail` is "declared in warCouncilCheats.css", **a file that no longer exists**, which is why that class has had no rules at all. Point it at `warCouncilFeltRail.css`.

- [x] **Step 2: Rewire `WarCouncilRound.tsx`**

Remove the `IntentTelegraph` import and its `<IntentTelegraph …>` element from `<aside className="wc-dossier">` — the dossier drops to **three** panels. Remove the `previewQuarryIntent` / `quarryIntent` imports and the `speculative` / `intent` locals. Replace the `.wc-felt-rail` div and the `{loadoutOpen(ui) && <BuffGallery …>}` / `<div className="wc-table-inner">{felt}</div>` pair with:

```tsx
<FeltRail {...feltRailProps({ ui, galleryOpen: loadoutOpen(ui) })} />
{loadoutOpen(ui) ? (
  <BuffGallery {...buffGalleryProps({ ui, dispatch, offered })} />
) : (
  <FeltStage {...feltStageProps({ ui, dispatch, offered, quarryToLead, handSummary, displayHand, onCarryOn: handleCarryOn, onCancel: handleCancel })} />
)}
```

The gallery and the felt's other states never contend: `loadoutDoorOpen` is `discardWindowOpen || canAct`, and a held reveal, an open prompt, an engine fault and a complete round each make both false — so the gallery can only coexist with an empty or an in-progress trick. Import `warCouncilFeltRail.css` and `warCouncilBuffGallery.css` alongside the existing sheets.

**Deviation, found running the full spec directory (see Step 6):** the literal condition `loadoutOpen(ui)` is not what makes the sentence above true — `ui.loadout` is never cleared by the reducer when a trick resolves, a prompt opens, a fault occurs, or the round completes, so a panel opened while the trick was empty stays "open" (by this flag alone) straight through those four states. Reading `loadoutOpen(ui) && loadoutDoorOpen(ui)` for BOTH the ternary and `feltRailProps`' `galleryOpen` is what actually enforces the sentence — `loadoutDoorOpen` (already imported from `buffHandlers.ts` for `loadoutBarRefusalFor`) is exactly the four-state gate the sentence describes. This is a one-line, in-scope correction to `WarCouncilRound.tsx` (no reducer or out-of-scope file touched) and is documented inline at the call site. See Step 6 for the one test this does not (and structurally cannot) fix.

- [x] **Step 3: Delete the telegraph, both halves**

Delete `IntentTelegraph.tsx`, `intentPreview.ts`, and the three specs listed above. Delete `STANCE_PHRASE` and `intentAccessibleName` from `labels.ts:70-77` and their assertions from `labels.test.ts`. Delete the six `.wc-telegraph*` rules from `warCouncilHunt.css:306-338`.

**Leave `quarryIntent`, `TelegraphFidelity` and `TELEGRAPH_FIDELITY` in the engine.** They lose their production consumer but keep their own spec and config; removing engine surface is out of this ticket's scope and would reach into the pure-core tree. This is recorded in `plan.md` → Risks as a possible follow-up, not as an oversight.

- [x] **Step 4: Fix the copy that pointed at the deleted panel**

`TrickWell.tsx:128-140`'s `quarryToLead` branch reads *"They are about to lead. Read their intent first."* There is no intent panel any more. Replace with copy that does not promise a surface that no longer exists — **PLACEHOLDER, the developer's** — and update the matching assertion in `TrickWell.test.tsx`. Update the docblock comment above it, which explains the branch by reference to the telegraph.

**Note:** no existing assertion in `TrickWell.test.tsx` actually pinned the old copy (it was only exercised, indirectly, through the now-deleted `WarCouncilRound.telegraph.test.tsx`) — added a new `describe('TrickWell — the Quarry is about to lead', …)` block asserting the new copy and the absence of the word "intent", rather than editing a pre-existing assertion that turned out not to exist.

- [x] **Step 5: Update `WarCouncilRound.test.tsx`**

Its docblock at line 35 cross-references `WarCouncilRound.telegraph.test.tsx`, now deleted. Remove any assertion that the dossier holds four panels and assert three. Add an assertion that with the gallery open the decree, the spent pile and the Quarry's played card are all still in the document — the jsdom half of AC1 (the geometric half is QA's).

- [x] **Step 6: Run every affected spec, typecheck, and measure both files that were in breach**

Run: `npx vitest run src/app/warCouncil/__tests__ ; npm run typecheck; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\warCouncilHunt.css).Count`
Expected: `Tests  N passed`, 0 failed; `tsc -b` exits 0; **`WarCouncilRound.tsx` is under 400** (it was 415) and **`warCouncilHunt.css` is under 400** (it was 417).

**Actual: `Test Files 1 failed | 42 passed (43)`, `Tests 1 failed | 496 passed (497)`.** `tsc -b`
exits 0. `WarCouncilRound.tsx` is **341** lines, `warCouncilHunt.css` is **376** — both under
budget. The Step 2 guard fix (`loadoutDoorOpen`) turned what was FOUR failures into one
irreducible one: `WarCouncilRound.timebomb.test.tsx > … > 'is disabled while a trick reveal is
held, and does not clear the reveal on click (stopPropagation)'` asserts the Timebomb ROW (inside
the gallery) is visible AND disabled AT THE SAME TIME the resolved-trick text is visible — i.e. it
pins the OLD simultaneous-rendering behaviour this very task deletes (AC1's whole point is that
the gallery and the felt's other content do not render at once). No condition on `WarCouncilRound`'s
own state can satisfy both halves of that assertion under the new design; the fix is in the test,
not the component. `WarCouncilRound.timebomb.test.tsx` is NOT in this task's `**Files:**` list, so
it is left as-is and flagged for the developer/QA rather than edited outside scope — see the
Implementer Report's Notes.

---

## Phase 6 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, plus the PR description.

### Task 16: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code`

- [x] **Step 1: Grep the two lint-enforced pure trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. This contract adds no file to either tree, so the override's `files` array is unchanged.

Actual: zero hits. PASS.

### Task 17: Confirm every deleted name is gone and no stale reference remains ✓

- Skill: `none — verification greps, no code`

- [x] **Step 1: Grep recursively for the deleted components, modules and class names**

`Select-String -Path` does **not** recurse and `**` in its glob matches exactly one directory level, which silently reports zero hits for a name still present two levels down — the false green in the very phase that exists to catch it. Use the recursive form:

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "IntentTelegraph|previewQuarryIntent|intentAccessibleName|STANCE_PHRASE|BuffLoadoutPanel|wc-telegraph|wc-loadout|wc-skull-mark|warCouncilCheats"`
Expected: zero hits.

**Actual: 4 hits, all in comments/docblocks, none live** — `BuffGallery.tsx` lines 28 and 49
reference `BuffLoadoutPanel` by name to say what replaced it; `warCouncilActionBar.css` line 7
says `.wc-loadout` / `.wc-loadout-row` is gone; `warCouncilActionBar.css` line 2 and
`warCouncilFeltRail.css` line 3 name `warCouncilCheats.css` as a file already deleted. No import,
class selector, or identifier use of any deleted name exists — every hit is historical prose
explaining what a file replaced or when a sibling file was deleted. Confirmed by inspection rather
than treated as a false green.

- [x] **Step 2: Confirm the storage rule was not tripped**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'"`
Expected: hits only in `src/persistence/config.ts`. No task in this contract persists a value, so `SAVE_SCHEMA_VERSION` is deliberately not bumped.

Actual: one hit, `src\persistence\config.ts:9`. PASS.

### Task 18: Confirm no file is over the 400-line budget ✓

- Skill: `none — a measurement, no code`

- [x] **Step 1: Measure every file this contract created or grew**

`Measure-Object -Line` silently drops blank lines and undercounts — it hid a real breach on DLR-63. Use the array length:

Run: `Get-ChildItem src\app\warCouncil -Include *.ts,*.tsx,*.css -Recurse | ForEach-Object { [pscustomobject]@{ File = $_.Name; Lines = (Get-Content $_.FullName).Count } } | Where-Object Lines -gt 400 | Format-Table`
Expected: no rows. `WarCouncilRound.tsx` (415) and `warCouncilHunt.css` (417) were both in breach **before** this contract and are fixed by Phase 5.

**Actual: first pass found ONE row — `roundReducer.test.ts` at 423 lines.** Not a
pre-existing breach: `git status`/`git diff --stat` confirmed this file is `M` (modified,
uncommitted) with +39 lines from this contract's own Task adding the `CancelBuffPoise` describe
block (AC18) on top of an already-carved-out 384-line file. Fixed in-ticket, matching this file's
own established convention (`roundReducer.bank.test.ts` was carved out of the same file for the
identical reason on an earlier ticket): extracted the four-test `CancelBuffPoise unwinds one
level (AC18, DLR-148)` describe block into a new file,
`src/app/warCouncil/__tests__/roundReducer.cancelBuffPoise.test.ts`, duplicating the small
`uiFrom` seed helper locally rather than importing it — the same local-duplication pattern
`roundReducer.bank.test.ts`'s own docblock documents. Re-measured: `roundReducer.test.ts` **387**
lines, `roundReducer.cancelBuffPoise.test.ts` **60** lines — both under budget. Re-ran the full
sweep after the split: zero rows. `npx vitest run` on both files: `Tests 27 passed` (0 failed);
`npm run typecheck` exited 0.

### Task 19: Static gates and the full suite ✓

- Skill: `none — verification only, no code`

- [x] **Step 1: Warm the transform cache, then run the unfiltered suite**

A cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` — that is a jsdom worker-**start** timeout, not a failing test, and the affected `.test.tsx` files never execute at all. Warm the projects separately first:

Run: `npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all three exit 0; the final run reports `Tests  N passed` with 0 failed and collects every spec file.

**Actual:** `--project node` → `Test Files 122 passed (122)`, `Tests 1668 passed (1668)`.
`--project dom` → `Test Files 27 passed (27)`, `Tests 271 passed (271)`. `npm test` (warm) →
`Test Files 149 passed (149)`, `Tests 1939 passed (1939)`. All three exited 0.

- [x] **Step 2: Typecheck, lint, and scoped format check**

Run: `npm run typecheck; npm run lint; npx prettier --check src/app/warCouncil`
Expected: all three exit 0. Run `npm run format:check` as well and **report** its result, but do not gate on it and do not "fix" it — it fails on pre-existing `.docs/**` files this contract never touched, and `npm run format` would rewrite ~59 unrelated files.

**Actual:** `npm run typecheck` exited 0 (`tsc -b`, no output). `npm run lint` exited 0
(`eslint .`, no output). `npx prettier --check src/app/warCouncil` **first failed**
(`SuitMark.tsx`, `__tests__/PlayingCard.test.tsx` — both `M` in `git status`, i.e. modified by
this contract) — fixed in-scope with `npx prettier --write` on exactly those two files (both
under `src/app/warCouncil`, both already touched by this contract, no other file rewritten);
re-ran typecheck/lint (still 0) and `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx`
(`Tests 12 passed`); re-ran the scoped check clean: `All matched files use Prettier code style!`.
`npm run format:check` (reported, not gated): exit 1, **79 files** — all `.docs/**`,
`.github/copilot-instructions.md`/`.github/instructions/mermaid.instructions.md`, and one
pre-existing, contract-untouched file, `src/warCouncil/__tests__/discard.test.ts` (`git status`
shows no local modification). None are in this contract's file map; not fixed, per the standing
rule against a repo-wide `format` rewrite.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

**Actual:** exited 0. `dist/index.html` (0.48 kB), `dist/assets/index-CtRppG3e.css` (52.20 kB),
`dist/assets/index-BxDVh_42.js` (314.80 kB) — `✓ built in 1.00s`, no bundler errors.

### Task 20: The browser pass — the five criteria jsdom cannot answer ✓

- Skill: `game-ux`

jsdom has **no layout engine**, so no Vitest test can prove a screen does not scroll or that a card's text does not overflow. These have right answers, so they are QA's, not the developer's. QA starts the server detached on `--port 5199 --strictPort` and drives it through the `chrome-devtools` MCP.

- [x] **Step 1: AC1 — rectangle intersection on all four edges, at 1440x900 and 1280x720**

With the gallery open, assert the gallery's bounding box does not intersect the decree card's, the spent pile's, or the Quarry's played card's. **Test all four edges, not one axis** — the shell restacks at narrow widths, where an x-only test reports a collision that cannot exist.

- [x] **Step 2: AC10 and AC11 — overflow, on every card in every state**

At both viewports, and in each of the three windows (player to lead, Quarry to lead, mid-trick): assert the grid's `scrollWidth - clientWidth` is 0, that no card's text node overflows its own box, and that mid-trick the fence is visible without internal scrolling. **The longest string is the only one that fails**, so assert every card rather than spot-checking: `Cheat`'s payoff and the two-line names are the ones that broke the mockup. Report the deep-pile behaviour too — with the pile large, the gallery is expected to scroll **inside its own panel**, which is scoped overflow, not a page scroll.

- [x] **Step 3: AC17 — no pip, glyph or art overlaps another element, across every rank and suit**

Assert geometrically on `PlayingCard`, including the skulled face against both corner indices.

- [x] **Step 4: AC19 — take the greyscale screenshot**

Apply a greyscale filter and capture. Confirm the three tiers are distinguishable (the roman numeral is the carrier — a metallic gradient reads as light-and-dark, never as bronze/silver/gold), that poised reads by lift and ring rather than by hue, and that fenced reads by tarnish and the dashed group. **This epic has already had a "reads without colour" claim fail its own test twice** — the claim is not acceptable without the image.

- [x] **Step 5: Confirm the console is clean and report what a browser checked**

List every check run, with the viewport sizes named, and separate them from what remains the developer's eye: whether the trick moving between stage and rail reads as a move or a loss, whether live re-sorting of fenced buffs feels right, and every placeholder colour and size.

### Task 21: Write the PR description ✓

- Skill: `none — a document, not code`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` and `mockup.html` in this folder; a summary of the change; **every developer decision listed in the File map above**, especially the cadence-word copy call; the verification results from Phase 6 with real numbers; and a one-line note for future contributors on the new convention this introduces — that a card component in a grid must be its own stacking context and clip itself, which is the fourth carry trap and the one not on the ticket.

Written to `pr-description.md` in this plan folder. Includes links to `plan.md` and `mockup.html`;
a summary; all seven "Developer decides or observes" items from the File map, led by the
cadence-word copy call; Phase 6's real verification numbers (full suite, typecheck, lint, scoped
format, `format:check`, build, both Task 16/17 greps, and the Task 18 in-ticket fix); and two
convention notes — the stacking-context/clip trap, and the `*Model.ts` case-collision rule the two
renames established (also worth recording for future contributors, since it isn't on the ticket
either).

---

## Self-review

**Spec coverage:**
- Gallery view-model: runs, order, `×N`, fence (AC3, AC4, AC7, AC8) — Task 1, asserted again in Task 9.
- Consequence view-model and its silence (AC13, AC14, AC15) — Task 2, rendered in Task 13.
- Cadence derived from `BUFF_CADENCE` (AC9) and the Timebomb's two figures (AC5) — Task 3.
- `Escape` unwinds one level (AC18) — Tasks 4 and 9.
- Metallic frame, neutral face, roman numeral (AC2) — Tasks 5, 6, 7.
- WCAG AA on the payoff bars and the readout (AC6) — Tasks 11 and 13.
- Gallery mounted, old panel gone — Task 10.
- Skull face, identical everywhere, corner intact (AC12) — Task 12.
- Felt re-homed so nothing is occluded (AC1) — Tasks 14, 15; geometry in Task 20.
- "Their intent" removed and the lead state handled explicitly (AC16) — Task 15, and by construction in Task 2's `led === null` / `side === Player` guard.
- Overflow, geometry, greyscale (AC10, AC11, AC17, AC19) — Task 20.
- Gates (AC20) — Task 19.
- The 400-line breaches that predate this ticket — Tasks 15 and 18.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, `npm run format`, or edits `package-lock.json`. No step invents a tuning value; every unchosen value is routed to the File map's developer list. No step's fix is an `eslint-disable`.

**Type / name consistency:** `BuffRunKind`, `BUFF_RUN_ORDER`, `BuffStack`, `BuffRun`, `BuffFence`, `BuffGalleryView`, `buildBuffGallery`, `buffStackKey`, `buffRunOf`, `ConsequenceBranch`, `ConsequenceTone`, `ConsequenceClauseKind`, `ConsequenceClause`, `ConsequenceRow`, `TrickConsequenceView`, `TrickConsequenceFacts`, `trickConsequence`, `trickConsequenceFacts`, `CONSEQUENCE_CLAUSE_TEXT`, `CONSEQUENCE_BRANCH_LABEL`, `consequenceAccessibleName`, `buffCadenceWord`, `buffPayoff`, `BuffPayoff`, `buffCardAccessibleName`, `BUFF_POISED_HINT_PRESS`, `RoundUiActionKind.CancelBuffPoise`, `handleCancelBuffPoise`, `BuffGalleryProps`, `buffGalleryProps`, `FeltRailProps`, `feltRailProps`, `FeltStageProps`, `feltStageProps` are each spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses them. CSS class prefixes `wc-gallery*`, `wc-buffcard*`, `wc-runtab*`, `wc-fence*`, `wc-stack*`, `wc-rail*`, `wc-readout*`, `wc-card-skull-face` are introduced with the stylesheets that declare them and the components that use them, in the same tasks. `--wc-skull` is the symbol id; `--wc-payoff-ink-*` and `--wc-readout-*` are the token names the contrast spec greps for by exactly those strings.

**Phase boundary cleanliness:**
- **Phase 1** ends with three new pure modules, fully specced and referenced by nothing. `tsc -b` clean, app unchanged.
- **Phase 2** ends with one new action fully handled — the exhaustive `switch` in `roundReducer.ts` makes a missing case a compile error — and nothing dispatching it yet. `tsc -b` clean, behaviour unchanged.
- **Phase 3** ends with `BuffGallery` mounted exactly where `BuffLoadoutPanel` was, that component and its spec deleted, its CSS stripped, and both integration specs re-pointed. The felt's grid is untouched, so the layout is still the old one and AC1 is not yet true — deliberately, and stated.
- **Phase 4** ends with the skull face rendering everywhere a card is face up. It touches no layout and changes no prop, so no other component or spec is mid-edit.
- **Phase 5** ends with the felt re-homed, the readout in the rail, the telegraph deleted in both halves with no dangling import or stale class, and both pre-existing 400-line breaches measured back under budget.
- **Phase 6** changes no production code.
