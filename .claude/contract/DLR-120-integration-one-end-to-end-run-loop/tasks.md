# Tasks: Integration — one end-to-end run loop

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **`plan.md` was NOT developer-confirmed.** This ran as ticket 21 of an unattended sprint run: the Step 3 `AskUserQuestion` approval gate was not presented, no mockup was built (no `.tsx` file is in the file map), and the Step 1.5c skill-confirmation call was not presented either. Every bullet under `plan.md` Part 1 → Assumptions made stands in for a developer answer.

**Goal:** Prove or disprove that this epic's twenty tickets form one working run, using the headless simulator as the instrument — extending it with the levers the baseline never pulls and with the one statistic that separates a balance failure from an integration failure, pinning every reachability gap as an executable audit, and handing over precisely what is a feature gap rather than a wiring gap.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/sim/reachability.ts` — derives, from production data only, which `BuffKind`s a player can obtain and which are declared but unreachable.
- `src/sim/__tests__/reachability.test.ts` — the executable audit. Pins today's gaps so none can be silently inherited.
- `.claude/contract/DLR-120-integration-one-end-to-end-run-loop/pr-description.md` — the hand-over, including the balance-versus-integration verdict.

**Modified:**
- `src/sim/types.ts` — `CheatPlay`; two optional `SimPolicy` methods; three added required `HandReport` fields.
- `src/sim/playHand.ts` — drives the discard and the Cheat play; counts the three new fields.
- `src/sim/baselinePolicy.ts` — adds `maximalistPolicy`; registers it in `POLICIES`.
- `src/sim/report.ts` — three new reported figures.
- `src/sim/index.ts` — barrel exports for the new policy and the reachability helpers.
- `src/hunt/buffTemplates.ts:15-21,111-113` — corrects two docblock claims that DLR-126 has not landed. **Prose only, zero behavioural diff.**
- `src/sim/__tests__/playHand.test.ts` — cases for the two new driver paths.
- `src/sim/__tests__/baselinePolicy.test.ts` — cases for `maximalistPolicy` and for `POLICIES`.
- `src/sim/__tests__/simulate.test.ts` — a case pinning the three new report lines.

**Deleted:** (none)

**Developer decides or observes:**
- **Whether the 0-win result is a balance problem or an integration problem.** This contract records the evidence and states its reading in `pr-description.md`; the decision, and any retune, is the developer's. **Not one tuning value is edited here.**
- **Whether consumables ship in v1's slot reel.** No template mints one. Closing it needs `BuffTemplate.kind` widened past `BuffConditionKind`, `BuffTemplate.axis` given a meaning a consumable does not have, `mintFromTemplate` branched, `slotOdds.ts`'s expected-value arithmetic changed, and **14 agent-chosen slot weights** (7 kinds × 2 machines) in `SLOT_FAMILY_WEIGHTS`. Every one of those weights is a tuning value nobody has chosen.
- **Whether DLR-116's pared-down `SHOP_ITEMS` is still the intended shelf.** With Timebomb, Blast Guard and Whetstone off it and `startRun()` seeding `timebombCharges: 0` / `blastGuardHeld: false` / `whetstones: 0`, **no player can obtain any of the three** — and four tickets of Timebomb work (DLR-101, DLR-107, DLR-110's Blast Guard, DLR-129) sit behind that.
- **Whether to finish DLR-107's Cheat/Timebomb migration into the buff pile.** That ticket's log entry conditioned its intermediate state on "the activation ticket and the UI ticket"; DLR-108 and DLR-114 both landed and it was never finished. `cheatBuff`, `timebombBuff` and `shieldBuff` still have zero production callers.
- **`Keepsake`** — redefine "hand's end" against DLR-123's persistent encounter deck, or retire the family. **`Long Fall`** — author the template or retire the family. Both are rule decisions this ticket's own dependency clause reserves for the developer.
- **Whether `maximalist` is the player worth measuring**, and whether to split its two levers into separate policies for attribution (a five-line change to `POLICIES`).
- **Everything a browser would still check** — unchanged from DLR-119's `pr-description.md` §7. This ticket adds no UI surface and closes none of that debt.

---

## Phase 1 — Two levers and one statistic on the instrument

Extends `src/sim/`'s policy seam and report so a simulated player can pull the discard budget and the run's starting Cheat, and so the report states directly how many hands were played with nothing to activate. The phase boundary is safe because every change is additive within `src/sim/`: the two policy methods are optional, so `baselinePolicy` compiles and behaves unchanged, and the three `HandReport` fields have exactly one construction site.

### Task 1: Widen the policy seam and the hand report in `src/sim/types.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/types.ts:1-47`

- [x] **Step 1: Add the `CheatPlay` shape and the two optional `SimPolicy` methods**

Add `Card` to the existing `../warCouncil` type import and a new `CheatCardId` type import from `../hunt` (`CheatCardId` is exported by `src/hunt/index.ts:82`, **not** by `src/warCouncil`). Then add above `SimPolicy`:

```ts
/** A Cheat to arm and the off-suit card to play with it. Named TOGETHER, deliberately: arming a
 *  Cheat and then playing a card that was follow-suit-legal anyway spends the card for nothing,
 *  which would report the Cheat as harmful rather than as unexercised. */
export interface CheatPlay {
  readonly cheatId: CheatCardId
  readonly card: Card
}
```

and append to the `SimPolicy` interface, after `nextShopAction`:

```ts
  /** OPTIONAL — cards to discard in this between-tricks window; `[]` or an absent method means
   *  none. Advisory like every other answer here: the driver re-asks `discardRefusalFor`, caps the
   *  selection at `MAX_CARDS_PER_DISCARD`, and cancels rather than committing an empty one.
   *
   *  Optional rather than required so `baselinePolicy` needs no stub. A stub would turn that
   *  module's docblock claim — that the baseline never discards because nothing on the shelf makes
   *  it worth doing — from "does not consider it" into "considers it and declines", changing what
   *  its printed figures mean while changing none of them. */
  chooseDiscard?(ui: RoundUiState): readonly Card[]

  /** OPTIONAL — a Cheat to arm and the card to play with it, or `null`. Advisory: the driver
   *  re-checks `hasCheat`, re-checks that the Cheat actually armed, and gives it back unspent if
   *  the card does not commit. Optional for `chooseDiscard`'s reason. */
  wantsCheatPlay?(ui: RoundUiState): CheatPlay | null
```

- [x] **Step 2: Add the three required `HandReport` fields**

Append inside `HandReport`, before `stalled`:

```ts
  /** Priced buffs in the pile at the hand's START — `activatableBuffs(run.buffs).length`, the same
   *  production predicate the loadout panel reads, so the simulator and the felt cannot disagree
   *  about what "the player holds a usable buff" means. `0` means there was nothing to activate for
   *  the whole hand, whatever the AP pool said. Measured at the start because the shop is only
   *  reachable between fights, so a buff cannot arrive mid-hand today; a ticket that changes that
   *  makes this an understatement. UNIT: cards. */
  readonly activatableBuffsHeld: number
  /** Discard actions COMMITTED this hand, never merely offered. UNIT: discard actions. */
  readonly discardsUsed: number
  /** Cheats armed AND spent this hand — an arm that is given back unspent is not counted.
   *  UNIT: cards. */
  readonly cheatsArmed: number
```

- [x] **Step 3: Typecheck and confirm the failure is the one construction site the audit predicted**

Run: `npm run typecheck`
Expected: exits non-zero with errors naming `src/sim/playHand.ts` only — the single `HandReport` object literal at `src/sim/playHand.ts:224`, exactly as `plan.md`'s construction-site audit states (12 annotated sites, 1 construction site, 0 in specs). **If any other file is named, stop: the audit undercounted and the extra file must be added to Task 2's `**Files:**` block before continuing.**

### Task 2: Drive the discard and the Cheat play in `src/sim/playHand.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/playHand.ts:13-49,81-128,133-238`
- Test: `src/sim/__tests__/playHand.test.ts`

- [x] **Step 1: Extend the imports**

Add `cheatArmed`, `discardSelecting` and `discardStock` to the existing `../app/warCouncil/roundUiState` import; add `discardRefusalFor` to the existing `../warCouncil` import; add `activatableBuffs`, `hasCheat` and `MAX_CARDS_PER_DISCARD` to the existing `../hunt` import.

- [x] **Step 2: Add the discard runner beside `runBuffWindow`**

Insert above `runBuffWindow`:

```ts
interface DiscardOutcome {
  readonly ui: RoundUiState
  /** `true` only when a swap actually committed and a budget charge was spent. */
  readonly committed: boolean
}

/**
 * One optional discard, in the same between-tricks window the buff activations use — `discardStock`
 * and `buffActivationStock` read the SAME `discardWindowOpen` predicate, so there is no second
 * timing gate to keep in step. Runs BEFORE the buff window because a swap changes the hand the buff
 * decision is made against.
 *
 * Every dispatch is preceded by re-asking the engine's own refusal predicate, and any path that
 * cannot commit cancels the selection rather than leaving it open — `runBuffWindow`'s own
 * discipline, and load-bearing here because an open selection reinterprets the next hand-card tap.
 */
function runDiscard(initial: RoundUiState, policy: SimPolicy): DiscardOutcome {
  if (policy.chooseDiscard === undefined) return { ui: initial, committed: false }
  const wanted = policy.chooseDiscard(initial)
  if (wanted.length === 0) return { ui: initial, committed: false }
  if (discardRefusalFor(discardStock(initial)) !== null) return { ui: initial, committed: false }

  let ui = roundReducer(initial, { kind: RoundUiActionKind.TapDiscard })
  if (!discardSelecting(ui)) return { ui: initial, committed: false }

  for (const card of wanted.slice(0, MAX_CARDS_PER_DISCARD)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card })
  }
  if (discardRefusalFor(discardStock(ui)) !== null) {
    return { ui: roundReducer(ui, { kind: RoundUiActionKind.CancelDiscard }), committed: false }
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.TapDiscard })
  return { ui, committed: !discardSelecting(ui) }
}
```

- [x] **Step 3: Add the Cheat runner beside it**

Insert directly below `runDiscard`:

```ts
interface CheatPlayOutcome {
  readonly ui: RoundUiState
  /** `true` only when the Cheat left `ui.cheats` — i.e. the card actually committed. */
  readonly spent: boolean
}

/**
 * One optional Cheat-armed play: two taps to poise and arm, then two to commit the card the policy
 * named. Counted only when the Cheat actually LEFT the pile, which `commitHandlers.ts` does on the
 * committing tap and only there.
 *
 * A play that does not commit — an illegal card, or a Fox/Woodcutter that opened a prompt instead —
 * gives the Cheat back through `CancelCheat` and then clears any armed card through
 * `CancelSelection`, so the caller's ordinary two-tap commit is not left racing a half-armed state.
 */
function runCheatPlay(initial: RoundUiState, policy: SimPolicy): CheatPlayOutcome {
  const play = policy.wantsCheatPlay?.(initial) ?? null
  if (play === null || !hasCheat(initial.cheats, play.cheatId)) {
    return { ui: initial, spent: false }
  }

  let ui = roundReducer(initial, { kind: RoundUiActionKind.TapCheat, id: play.cheatId })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: play.cheatId })
  if (!cheatArmed(ui)) {
    return { ui: initial, spent: false }
  }

  const before = ui.cheats.length
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card })
  if (ui.cheats.length < before) {
    return { ui, spent: true }
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.CancelCheat })
  ui = roundReducer(ui, { kind: RoundUiActionKind.CancelSelection })
  return { ui, spent: false }
}
```

- [x] **Step 4: Call both from `playHand`'s loop and count them**

Beside the existing `let buffsActivated = 0` block, add `let discardsUsed = 0`, `let cheatsArmed = 0` and `let discardedThisHand = false`. Above the loop, add:

```ts
  // The decisive statistic. Read through the PRODUCTION predicate rather than counting the pile,
  // so this can never disagree with what the loadout panel offers.
  const activatableBuffsHeld = activatableBuffs(run.buffs).length
```

Replace the window branch body with:

```ts
    if (discardWindowOpen(ui) && windowKey !== ui.round.tricksPlayed) {
      windowKey = ui.round.tricksPlayed
      if (!discardedThisHand) {
        const discard = runDiscard(ui, policy)
        ui = discard.ui
        if (discard.committed) {
          discardsUsed += 1
          discardedThisHand = true
        }
      }
      const outcome = runBuffWindow(ui, policy)
      ui = outcome.ui
      buffsActivated += outcome.buffsActivated
      applyDamagePresses += outcome.applyDamagePresses
      deadCardRefusals += outcome.deadCardRefusals
      continue
    }
```

and replace the `canAct` branch with:

```ts
    if (canAct(ui)) {
      const cheat = runCheatPlay(ui, policy)
      ui = cheat.ui
      if (cheat.spent) {
        cheatsArmed += 1
        continue
      }
      const move = policy.chooseCard(ui.round)
      heldChoice = move.choice
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // arm
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: move.card }) // commit
      continue
    }
```

Finally add `activatableBuffsHeld,`, `discardsUsed,` and `cheatsArmed,` to the `const report: HandReport = { … }` literal.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [x] **Step 6: Add driver cases to `src/sim/__tests__/playHand.test.ts`**

Append a `describe('playHand — the optional levers')` block with four cases, each built on the file's existing fixture helpers:

1. `baselinePolicy` (which implements neither optional method) reports `discardsUsed: 0` and `cheatsArmed: 0`, and its `HandReport` is otherwise **byte-identical** to a report produced before this contract — assert `damageToQuarry`, `damageToPlayer`, `tricksWon`, `buffsActivated`, `apSpent` and `applyDamagePresses` against a second `playHand` call on the same seed.
2. A stub policy whose `chooseDiscard` returns the first two cards of the player's hand commits **exactly one** discard across the whole hand (`discardsUsed === 1`), and the discarded cards are gone from the final hand.
3. A stub policy whose `chooseDiscard` returns `[]` commits none and leaves `discardsRemaining` untouched.
4. A stub policy whose `wantsCheatPlay` names a `cheatId` that is **not** in `ui.cheats` reports `cheatsArmed: 0` and leaves `result.cheats` unchanged — the advisory-answer guarantee.

- [x] **Step 7: Run the scoped spec**

Run: `npx vitest run src/sim/__tests__/playHand.test.ts`
Expected: exits 0, 0 failed.

### Task 3: Add `maximalistPolicy` to `src/sim/baselinePolicy.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/baselinePolicy.ts:1-113`
- Test: `src/sim/__tests__/baselinePolicy.test.ts`

- [x] **Step 1: Add the policy, its two lever functions, and its docblock**

Append below `baselinePolicy`, and extend the module docblock with a `MAXIMALIST` paragraph stating the same rules in prose (every printed figure is conditional on the policy, so it is written out rather than left to be read off the code):

```ts
/**
 * DLR-120 — the second policy: `baselinePolicy`'s cards and buffs, VERBATIM, plus the two levers a
 * run actually grants and the baseline never pulls. Card and buff play are deliberately identical
 * so a difference in the printed figures is attributable to the levers rather than to card play.
 *
 * DISCARD — once per hand, on the first open between-tricks window, the lowest-ranked
 * `MAX_CARDS_PER_DISCARD` cards, while `discardsRemaining > 0`. Discarding at EVERY window would
 * spend the fight's whole `DISCARDS_PER_FIGHT` budget inside hand one, which measures the budget
 * rather than exercising the swap. Every number in that sentence is an existing configuration
 * constant read by name; this policy introduces none.
 *
 * CHEAT — the run's starting Cheat (`RUN_STARTING_CHEATS = 1`), armed ONLY where lifting
 * follow-suit strictly widens the legal set, and then playing the highest-ranked card the widening
 * admits. Fox and Woodcutter are excluded: both open an `AbilityChoice` prompt, and the driver
 * answers a prompt from `chooseCpuMove`'s choice for a different card.
 */
function chooseDiscard(ui: RoundUiState): readonly Card[] {
  if (discardRefusalFor(discardStock(ui)) !== null) return []
  const hand = ui.round.hands[PlayerSide.Player]
  return [...hand]
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.suit.localeCompare(b.suit)))
    .slice(0, MAX_CARDS_PER_DISCARD)
}

function wantsCheatPlay(ui: RoundUiState): CheatPlay | null {
  const cheat = ui.cheats[0]
  if (cheat === undefined) return null

  const legal = legalMoves(ui.round, PlayerSide.Player)
  const widened = legalMoves(ui.round, PlayerSide.Player, { ignoreFollowSuit: true })
  if (widened.length <= legal.length) return null

  const gained = widened.filter(
    (card) =>
      !containsCard(legal, card) &&
      card.rank !== CardRank.Fox &&
      card.rank !== CardRank.Woodcutter,
  )
  if (gained.length === 0) return null

  const best = gained.reduce((highest, card) => (card.rank > highest.rank ? card : highest))
  return { cheatId: cheat.id, card: best }
}

export const maximalistPolicy: SimPolicy = {
  name: 'maximalist',
  chooseCard,
  wantsApplyDamage,
  chooseBuffs,
  nextShopAction,
  chooseDiscard,
  wantsCheatPlay,
}
```

Change the last line of the file to:

```ts
export const POLICIES: Readonly<Record<string, SimPolicy>> = {
  baseline: baselinePolicy,
  maximalist: maximalistPolicy,
}
```

Add the imports the new code needs: `CardRank`, `containsCard` and `legalMoves` plus the `Card` type from `../warCouncil`; `MAX_CARDS_PER_DISCARD` from `../hunt`; `discardStock` from `../app/warCouncil/roundUiState`; `discardRefusalFor` from `../warCouncil`; and `CheatPlay` from `./types`.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [x] **Step 3: Add policy cases to `src/sim/__tests__/baselinePolicy.test.ts`**

Append a `describe('maximalistPolicy')` block with four cases:

1. `POLICIES` holds exactly the keys `['baseline', 'maximalist']`, and each entry's `name` equals its key.
2. `maximalistPolicy.chooseCard`, `.wantsApplyDamage`, `.chooseBuffs` and `.nextShopAction` are **reference-identical** to `baselinePolicy`'s — the "differs only in the levers" claim, asserted rather than described.
3. `chooseDiscard` on a fresh hand returns `MAX_CARDS_PER_DISCARD` cards, all of them in the player's hand, sorted ascending by rank; and returns `[]` when `discardsRemaining` is `0`.
4. `wantsCheatPlay` returns `null` when the trick is empty (leading, where every card is already legal), and — on a state where the player is following a suit they do not hold enough of — returns a card that is in `widened` but not in `legal`, and is neither a Fox nor a Woodcutter.

- [x] **Step 4: Run the scoped spec**

Run: `npx vitest run src/sim/__tests__/baselinePolicy.test.ts`
Expected: exits 0, 0 failed.

### Task 4: Report the three new figures from `src/sim/report.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/report.ts:36-87`
- Test: `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Compute and print them**

Before the `lines` array, add:

```ts
  const buffStarvedHands = hands.filter((hand) => hand.activatableBuffsHeld === 0).length
  const discardsPerRun = runs.map((run) =>
    run.hands.reduce((sum, hand) => sum + hand.discardsUsed, 0),
  )
  const cheatsPerRun = runs.map((run) =>
    run.hands.reduce((sum, hand) => sum + hand.cheatsArmed, 0),
  )
```

Append to the `Buffs and AP` line, after the `NoEffectYet refusals` figure:

```ts
    `  hands played holding NO activatable buff: ${percent(buffStarvedHands, hands.length)}`,
```

as its own line, and add a new section immediately below it:

```ts
    '',
    'Levers',
    `  mean discards per run: ${mean(discardsPerRun)}  mean Cheats armed per run: ${mean(cheatsPerRun)}`,
```

Both reuse the existing `mean` and `percent` helpers, which already return `n/a` on an empty sample, so no `NaN` can be printed.

- [x] **Step 2: Add a report case to `src/sim/__tests__/simulate.test.ts`**

Append two cases:

1. A summary whose runs are all buff-starved formats `hands played holding NO activatable buff: 100.0%`; one where none is formats `0.0%`.
2. A summary with **zero runs** formats `n/a` for all three new figures and contains no `NaN`.

- [x] **Step 3: Run the scoped spec**

Run: `npx vitest run src/sim/__tests__/simulate.test.ts`
Expected: exits 0, 0 failed.

---

## Phase 2 — The reachability audit

Turns "no template mints a consumable" from a comment somebody has to remember into a red test the moment it stops being true. Everything here is derived from production data — `BUFF_TEMPLATES`, `SHOP_ITEMS`, `startRun()` — and nothing is hand-listed, so a card added to the game is admitted to the audit automatically. The phase boundary is safe because both files are new and nothing imports them except the barrel and the spec.

### Task 5: Derive the reachable and unreachable sets in `src/sim/reachability.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/sim/reachability.ts`
- Test: `src/sim/__tests__/reachability.test.ts`
- Modify: `src/sim/index.ts`

- [x] **Step 1: Write the module**

```ts
/**
 * DLR-120 — the integration ticket's reachability audit: which cards the game DECLARES against
 * which cards a player can actually OBTAIN. Derived from production data at every step and
 * hand-listing nothing, so a family added to `BUFF_TEMPLATES` or an item returned to `SHOP_ITEMS`
 * is admitted here without an edit.
 *
 * It lives in `src/sim/` rather than in `src/hunt/` because reachability is a property of the WHOLE
 * RUN — a card exists AND some path puts it in a player's hand — and no single module owns both
 * halves. `src/sim/` is the only tree whose subject is the whole run.
 *
 * A PURE, DATA-ONLY module: it builds no `RoundState`, drives no reducer, and calls no `rng`.
 */
import {
  BUFF_TEMPLATES,
  BuffKind,
  SHOP_ITEMS,
  startRun,
  type ShopItem,
} from '../hunt'

/** Every `BuffKind` some production path can put in the BUFF PILE today. `Unassigned` is excluded:
 *  it is `seedStartingBuffPile`'s placeholder, filtered out of every offer by `activatableBuffs`,
 *  and it is not a card. */
export function mintableBuffKinds(): ReadonlySet<BuffKind> {
  const kinds = new Set<BuffKind>()
  for (const template of BUFF_TEMPLATES) {
    kinds.add(template.kind)
  }
  for (const buff of startRun().buffs) {
    if (buff.kind !== BuffKind.Unassigned) kinds.add(buff.kind)
  }
  return kinds
}

/** Every `BuffKind` the game declares that no production path can mint — `mintableBuffKinds`'s
 *  complement, less `Unassigned`. NON-EMPTY TODAY, and that is the finding, not a bug in this
 *  function: see `reachability.test.ts` for what is in it and which ticket each entry belongs to. */
export function unreachableBuffKinds(): ReadonlySet<BuffKind> {
  const mintable = mintableBuffKinds()
  const unreachable = new Set<BuffKind>()
  for (const kind of Object.values(BuffKind)) {
    if (kind !== BuffKind.Unassigned && !mintable.has(kind)) unreachable.add(kind)
  }
  return unreachable
}

/** Every `ShopItem` the game prices that the current shelf does not offer. `SHOP_ITEMS` is the
 *  shelf; the `ShopItem` union is everything `priceOf` still knows how to charge for. */
export function unshelvedShopItems(): ReadonlySet<ShopItem> {
  const shelved = new Set<ShopItem>(SHOP_ITEMS)
  const unshelved = new Set<ShopItem>()
  for (const item of Object.values(ShopItemValues)) {
    if (!shelved.has(item)) unshelved.add(item)
  }
  return unshelved
}
```

Import the `ShopItem` *value* map alongside the type — `src/hunt/index.ts` exports both under the same name, so import it once without `type` and alias the value locally as `ShopItemValues` if the executor finds the dual export ambiguous; otherwise use `ShopItem` directly for both and drop the alias. Resolve this against the real barrel at Step 2's typecheck rather than guessing.

- [x] **Step 2: Export from the barrel and typecheck**

Add to `src/sim/index.ts`, beside the existing `baselinePolicy` export:

```ts
export { maximalistPolicy } from './baselinePolicy'
export { mintableBuffKinds, unreachableBuffKinds, unshelvedShopItems } from './reachability'
```

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [x] **Step 3: Write the audit spec**

Create `src/sim/__tests__/reachability.test.ts`. **Every assertion that pins a gap carries a comment naming the gap and the decision that would clear it** — a reader must not mistake a pinned defect for an endorsement. Eight cases:

1. `mintableBuffKinds()` has **11** members and contains `Taker`, `Feeder`, `MarkOfRank`, `Sidestep`, `Glutton`, `Hoarder`, `Unbloodied`, `DebtCollector`, `Keepsake`, `Miser` and `Cornered` — the condition families, and only those.
2. **PINNED GAP** — `unreachableBuffKinds()` contains all five consumables (`Ward`, `Puppeteer`, `SecondThoughts`, `Foresight`, `Spyglass`). Comment: *no template mints one (`BuffTemplate.kind` is typed `BuffConditionKind`); DLR-126 built them, DLR-112's pool cannot produce them; the developer decides whether they ship in v1's reel.*
3. **PINNED GAP** — `unreachableBuffKinds()` also contains `Cheat`, `Timebomb` and `Shield`, so it has **8** members. Comment: *`cheatBuff` / `timebombBuff` / `shieldBuff` have zero production callers — DLR-107's migration into the buff pile was never finished.*
4. `BUFF_TEMPLATES` has **71** members, and `mintableBuffKinds().size + unreachableBuffKinds().size + 1` equals the number of `BuffKind` values — the two sets partition the union, so a new kind cannot fall out of both.
5. **PINNED GAP** — `unshelvedShopItems()` contains `Cheat`, `Timebomb`, `BlastGuard` and `Whetstone`. Comment: *DLR-116 pared the shelf; all four are still priced and still tested, and none can be bought.*
6. **PINNED GAP** — a fresh `startRun()` has `timebombCharges === 0`, `blastGuardHeld === false` and `whetstones === 0`. Taken with case 5, **no play path can produce a Timebomb, a Blast Guard or a Whetstone.** Comment names DLR-101, DLR-107, DLR-110 and DLR-129 as the tickets sitting behind it.
7. A fresh `startRun()` has `cheats.length === RUN_STARTING_CHEATS` — the Cheat is the **one** activated card a player can reach, and only because the run seeds one. Assert against the constant, never the literal `1`.
8. A fresh `startRun()` has `activatableBuffs(run.buffs).length === 0`, so **the player enters fight one with nothing to activate.** Comment: *this is the measurement `HandReport.activatableBuffsHeld` generalises, and it is the central evidence in this ticket's balance-versus-integration reading.*

- [x] **Step 4: Run the scoped spec**

Run: `npx vitest run src/sim/__tests__/reachability.test.ts`
Expected: exits 0, 0 failed, 8 passed.

### Task 6: Correct the stale DLR-126 claims in `src/hunt/buffTemplates.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffTemplates.ts:15-21,111-113`

- [x] **Step 1: Rewrite both docblock sentences**

Both currently read *"The 7 consumable/activated templates are deliberately absent — AC6 is DLR-126's to resolve and DLR-126 has not landed."* **DLR-126 landed at `4d3b8f7`-era commit in this sprint run and answered AC6 affirmatively** — a consumable is an ordinary `Buff` and needs no change to DLR-112's draw mechanism. Replace both with, adjusted to each site's surrounding sentence:

```
 * The 7 consumable/activated templates are still absent, and that is now a KNOWN GAP rather than a
 * deferral: DLR-126 landed and resolved AC6 affirmatively — a consumable is an ordinary `Buff` and
 * the draw mechanism needs no change — but no template was ever added, so `BuffKind.Ward` and its
 * four siblings are unreachable by playing. DLR-120's `src/sim/__tests__/reachability.test.ts`
 * pins that. Closing it is NOT a data edit: `BuffTemplate.kind` is typed `BuffConditionKind` and
 * `axis` is typed `BuffCostAxis`, and a consumable has neither — it is priced through
 * `CONSUMABLE_AP_COST` and pays in its effect. It also needs 14 slot weights nobody has chosen.
 * The developer decides whether consumables ship in v1's reel.
```

**Comment prose only. Change no code, no table, no export, and no `throw`.**

- [x] **Step 2: Prove the diff is prose-only**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff -- src/hunt/buffTemplates.ts | Select-String "^[+-]" | Select-String -NotMatch "^[+-]{3}" | Select-String -NotMatch "^[+-]\s*(\*|//|/\*)"`
Expected: zero hits — every added and removed line is a comment line.

- [x] **Step 3: Typecheck and re-run the module's own spec**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/buffTemplates.test.ts`
Expected: both exit 0, 0 failed. If that spec file does not exist, run `npx vitest run src/hunt` instead and expect 0 failed.

---

## Phase 3 — Observation

Runs the instrument and records what it actually printed. **Nothing is retuned on the strength of any figure here** — this phase produces evidence and a written reading, and the reading is the deliverable the ticket exists for. The boundary is safe because the phase changes no source file.

### Task 7: Run both policies across several seeds and record the output verbatim ✓

- Skill: none — this task runs a command and transcribes its output; it writes no TypeScript.

**Files:**
- Create: `.claude/contract/DLR-120-integration-one-end-to-end-run-loop/pr-description.md`

- [x] **Step 1: Baseline, four seeds**

Run: `npm run sim -- --runs 200 --seed 1; npm run sim -- --runs 200 --seed 7; npm run sim -- --runs 200 --seed 42; npm run sim -- --runs 200 --seed 99999`
Expected: each exits 0 and prints `Faults: none` with `stalled runs: 0`. **A fault or a stalled run at any seed is a genuine integration defect and must be investigated before this contract goes green**, not reported as an observation.

- [x] **Step 2: Maximalist, the same four seeds**

Run: `npm run sim -- --runs 200 --seed 1 --policy maximalist; npm run sim -- --runs 200 --seed 7 --policy maximalist; npm run sim -- --runs 200 --seed 42 --policy maximalist; npm run sim -- --runs 200 --seed 99999 --policy maximalist`
Expected: each exits 0, `Faults: none`, `stalled runs: 0`, and a non-zero `mean discards per run` and `mean Cheats armed per run` — a zero on either means the lever was wired but never pulled, which is itself a defect in this contract's own work.

- [x] **Step 3: Confirm determinism survived**

Run: `npm run sim -- --runs 50 --seed 3 --policy maximalist > sim-a.txt; npm run sim -- --runs 50 --seed 3 --policy maximalist > sim-b.txt; if ((Get-FileHash sim-a.txt).Hash -eq (Get-FileHash sim-b.txt).Hash) { "IDENTICAL" } else { "DIVERGED" }; Remove-Item sim-a.txt,sim-b.txt`
Expected: prints `IDENTICAL`.

- [x] **Step 4: Write `pr-description.md`**

Include, in this order:

- A link to `plan.md` in this folder and a one-paragraph summary.
- **The verbatim simulator output** for every invocation in Steps 1–3.
- **The balance-versus-integration verdict**, argued from the `hands played holding NO activatable buff` figure, the `mean slot pulls` figure, the reachability audit's eight pinned facts, and the maximalist-versus-baseline delta. State it as a reading and name what would change it.
- **Every seam found between two tickets' assumptions**, each with what was fixed versus handed over and why.
- Every entry from this file's "Developer decides or observes" list.
- What a browser would still need to check — carried forward from DLR-119's `pr-description.md` §7, restated because this ticket closes none of it.
- Verification results from every phase.

---

## Phase 4 — Final verification

No production changes. Confirms the boundaries this contract had to respect are all still intact, and runs the four gates.

### Task 8: Confirm the pure-core boundary and the determinism constraint still hold ✓

- Skill: none — verification greps only, no code is written.

**Files:**
- (none — read-only checks)

- [x] **Step 1: No React and no DOM inside the pure trees**

Run: `Get-ChildItem src\sim,src\hunt,src\warCouncil,src\vault -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: No `Math.random()` outside `App.tsx`'s three seeding calls**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.random\(\)"`
Expected: exactly three hits, all in `src/App.tsx`, all of the form `Math.floor(Math.random() * 0x100000000)`. Every other match in the tree is the word inside a docblock stating the ban — confirm each hit is one of those two categories.

- [x] **Step 3: No `throw` was weakened**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "throw new" | Measure-Object | Select-Object -ExpandProperty Count`
Expected: **102 or more.** 102 is the count QA measured at `c760f78` (this run's log records an earlier figure of 98 that was stale). This contract adds no production `throw` and removes none, so a count below 102 is a regression to investigate.

- [x] **Step 4: No file breached the 400-line budget**

Run: `Get-ChildItem src\sim,src\hunt -Recurse -Include *.ts | ForEach-Object { [pscustomobject]@{ File = $_.FullName; Lines = (Get-Content $_.FullName).Count } } | Where-Object { $_.Lines -gt 400 }`
Expected: zero rows. Note this uses `(Get-Content).Count`, **not** `Measure-Object -Line`, which drops blank lines and undercounts.

- [x] **Step 5: The three files at the ceiling were not touched**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --name-only -- src/app/warCouncil/roundUiState.ts src/App.tsx src/app/warCouncil/WarCouncilRound.tsx`
Expected: no output. None of the three is in this contract's file map, and `roundUiState.ts` has one line of headroom.

### Task 9: Static gates, full suite, and the build ✓

- Skill: none — gate execution only, no code is written.

**Files:**
- (none — read-only checks)

- [x] **Step 1: Format the contract's own files, scoped**

Run: `npx prettier --write src/sim/types.ts src/sim/playHand.ts src/sim/baselinePolicy.ts src/sim/report.ts src/sim/reachability.ts src/sim/index.ts src/hunt/buffTemplates.ts src/sim/__tests__/playHand.test.ts src/sim/__tests__/baselinePolicy.test.ts src/sim/__tests__/simulate.test.ts src/sim/__tests__/reachability.test.ts`
Expected: exits 0. **Never `npm run format`** — it rewrites ~58 pre-existing `.md` files nobody asked for.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports **0 failed** and **more than 1811 passed across more than 140 files** (the baseline at `363fcd2` is 1811 / 140; the delta is this contract's new cases).

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

---

## Self-review

**Spec coverage:**
- Extend `SimPolicy` with two optional hooks and drive both from `playHand` — Tasks 1, 2.
- Add `maximalist` to `POLICIES` — Task 3.
- Add the three `HandReport` fields and report from them — Tasks 1, 2, 4.
- Add the executable reachability audit — Task 5.
- Correct the stale DLR-126 docblock claims — Task 6.
- Run the simulator across seeds and both policies and write the verdict — Task 7.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, `npm run format`, or edits `package-lock.json`. No step invents a tuning value — the two policy rules read `MAX_CARDS_PER_DISCARD`, `DISCARDS_PER_FIGHT` and `RUN_STARTING_CHEATS` by name.

**Type / name consistency:** `CheatPlay`, `chooseDiscard`, `wantsCheatPlay`, `activatableBuffsHeld`, `discardsUsed`, `cheatsArmed`, `maximalistPolicy`, `mintableBuffKinds`, `unreachableBuffKinds` and `unshelvedShopItems` are spelled identically in `plan.md` Part 2 → Data shapes and in every task that touches them. `runDiscard` / `DiscardOutcome` and `runCheatPlay` / `CheatPlayOutcome` are private to `playHand.ts` and used only there.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: the two policy methods are optional so `baselinePolicy` compiles untouched, and the three required `HandReport` fields are added and populated in the same phase across their single construction site. Task 1 Step 3 deliberately ends type-checking *red* mid-task and Task 2 Step 5 closes it — the phase, not the task, is the boundary.
- **Phase 2** ends type-checking: both new files are leaves, exported from the barrel in the same task that creates them.
- **Phase 3** changes no source file at all.
- **Phase 4** is read-only.
