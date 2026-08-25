Part of [War Council UI](README.md).

# Apply Damage — the two-tap cash-out, and the extraction that had to come first

> **The plate this page is named for no longer exists — DLR-114 deleted it, and every rule below
> survives it.** `ApplyDamagePlate.tsx` and `warCouncilApplyDamage.css` were removed with the felt
> rail itself; Apply Damage is now the **fourth button on the action bar**, and it carries the same
> two-tap poise-then-commit grammar, the same refusal-re-read on both taps, the same refusal sentence
> on the control's own face, the same `aria-pressed`, the same `Escape` cancel, and the same
> `APPLY_DAMAGE_REFUSAL_MESSAGE` map — `labels.ts`'s label functions were kept and reused rather than
> rewritten, which is why no copy changed. Two things are genuinely new on the bar: the **AP cost is
> now stated on the button's face** (`12 for 1 AP` since 2026-08-25, was `12 for 3 AP`), and a
> **queued payout is now visible**
> (`Payout queued: 12 damage, 2 tricks to go.`) where before it was invisible. Read the sections below
> as the rule and its history; read
> [the action bar and the buff loadout](action-bar-and-loadout.md) for where the control now lives.
> Where this page says "the plate", the bar's Apply Damage button is what does it today.

DLR-94 added the felt's third rail control: a plate that cashes the player's banked streak into the
Quarry on demand, at no cost in health. The rule is entirely in
[`voluntaryCashOut.ts`](../war-council/voluntary-cash-out.md); everything here is presentation and
sequencing.

> **DLR-109 changed the commit itself, and no `.tsx` file changed to do it.** The two-tap grammar,
> the plate's component, its copy, and its CSS are exactly as this page describes below. What moved
> is `handleTapApplyDamage`'s commit branch and the trick-resolution ordering behind it — see
> [What the commit does now — since DLR-109](#what-the-commit-does-now--since-dlr-109) at the foot of
> this page, and [the delayed Apply Damage payout](../hunt/delayed-apply-damage-payout.md) for the
> mechanic itself.

## The extraction that had to come first

`roundReducer.ts` stood at **390 of its 400-line budget** and could not take a new handler. So the
first task of the phase moved the Quarry's half of a commit — `deriveResolvedTrick`,
`advanceQuarryFollow`, `advanceQuarryLead` and the `CpuAdvanceResult` interface — verbatim into a new
**`quarryAdvance.ts`**, docblocks intact, before anything new was written.

**Widen before cutting.** That ordering is what kept each step of the phase type-checking rather than
leaving a window where the file was both over budget and half-rewritten. It is the same seam
`roundUiState.ts` was split on in DLR-90: this is the block that talks to `cpuPlayer` and `playCard`
and decides nothing about the player's own state, so nothing in it needs to know what a `RoundUiState`
is. **A pure move with no behaviour change** — the evidence is that every pre-existing reducer spec
passed unedited through it. `roundReducer.ts` came out at 352 lines and `quarryAdvance.ts` at 96.

The one hazard in a move like this is the import list. Pruning it by eye over-pruned on the first
attempt — `PlayerSide`, `QUARRY_SIDE`, `RoundPhase` and `currentTurn` are still used by
`handleTapCheat`, `commitTimebomb`, `handleCarryOn` and `commit`, none of which moved. Lint is what
catches this; it is worth running before assuming a move is clean.

## `canAct` moved, and that is the point of it

`canAct` was a private function in `roundReducer.ts` while `WarCouncilRound.tsx` recomputed the
**identical six-clause expression** inline as `interactive`. DLR-94 moved it into `roundUiState.ts`,
exported, and pointed both at it:

```ts
canAct(state) =
  phase !== Complete && !isEncounterResolved(encounter) && resolvedTrick === null &&
  prompt === null && cpuFault === null && currentTurn(round) === Player
```

Two readings of one gate is how a greyed control and a reducer branch drift apart — which is exactly
the failure this contract had to avoid, and the same reason `cheatArmed` and `timebombArmed` already
live in that file rather than being recomputed in the component.

Beside it, **`applyDamageStock`** is the single place the app layer's shape is translated into the pure
module's: it is where `hasPendingTimebomb(encounter)` and `canAct(state)` are read, and it is what lets
`applyDamageRefusalFor` take four plain values and stay ignorant of both `EncounterState` and
`RoundUiState`.

## The two-tap grammar

`RoundUiState` gained one field: **`applyPoised: boolean`**. Required rather than optional, so every
construction site is a compile error rather than an `undefined` — `createRoundUiState` is the only one,
and it seeds `false`. `RoundUiSeed` is untouched: nothing about this control is run state, and a poise
is a hand-transient that dies on remount. That is correct behaviour, not a limitation.

**A single boolean rather than `TimebombStage`'s two-stage union**, deliberately: Timebomb needs a second
stage because its armed state waits for a *third* tap on a hand card. Apply Damage's second tap **is**
the action, so "poised" is the only state there is to be in.

`handleTapApplyDamage` has three outcomes, mirroring `handleTapTimebomb`'s shape — a refusal changes
nothing, nothing poised poises, poised commits:

```ts
if (applyDamageRefusalFor(applyDamageStock(state)) !== null)
  return state.applyPoised ? { ...state, applyPoised: false } : state
if (!state.applyPoised) return { ...state, applyPoised: true }
// …commit
```

**It asks the refusal predicate on BOTH taps, and that is load-bearing.** The felt can change under a
poised plate — the Quarry leads (starting the trick and closing the leader-only window), a reveal is
held, the turn passes — and re-reading is what stops a poise made while the control was live from
committing after it stopped being.

> **Design decision D6 (2026-08-19) asked for exactly this against a different predicate, and DLR-143
> (2026-08-25) reversed which predicate it is.** ~~The control must read the pending-Timebomb predicate
> *before it commits to anything*. There is a spec that books Timebomb between the two taps and asserts
> the commit is refused and the poise dropped.~~ A pending Timebomb no longer refuses the press at all —
> `ApplyDamageRefusal.TimebombPending` is deleted from the reason vocabulary, not merely relaxed. The
> re-read on both taps is still load-bearing, but against the **leader-only** gate now:
> `TrickInProgress` refuses once any card is on the table, so a poise made while the trick was still
> empty correctly drops if the Quarry's lead lands before the second tap. The spec that used to book a
> Timebomb between the two taps and assert the commit refused now asserts the **opposite** — the commit
> succeeds and the Timebomb settles alongside the queued payout at the next trick resolution — and a
> new spec covers the leader-only case directly (a card already on the table blocks even the poise).

A refusal **drops a held poise** rather than leaving it stranded, and never half-applies. The reason is
already on the plate's face, so the player is never left with an inert control and no visible cause.

**Before DLR-109, the commit was three statements: `cashBankNow`, then `applyDamage` through
`incomingFromCashOut`, then clear the poise** — see
[What the commit does now](#what-the-commit-does-now--since-dlr-109) below for what replaced it. It
was, and is still, **guarded by `isEncounterResolved`** for the reason `applyResolution` guards:
`applyDamage` *throws* on an already-resolved encounter, and a throw inside a reducer during an event
handler unmounts the tree. Unreachable in practice — a resolved encounter already fails `canAct` — so it
is a guard rather than a live path.

**`resolvedTrick` stays `null` and nothing writes `lastResolution`**, so no reveal is held, the felt
never enters its waiting state, and the player is simply looking at a zeroed `BankMeter` and a shorter
Quarry heart row with their card still to play — **still true since DLR-109**, because the payout
lands at a later trick's own resolution, not at the press.

**Poising does not clear a Cheat or an Timebomb selection, and they do not clear it.** Those two
reinterpret the next hand-card tap and therefore cannot coexist; this one reinterprets nothing, so a
player may poise a Cheat and apply damage in either order without losing either.

## The plate

`ApplyDamagePlate.tsx` (deleted by DLR-114; every property below now belongs to the bar's own Apply
Damage button) was a **sibling** of `CheatSlots` and `TimebombCharge` rather than a
generalisation of either — the three keep independent copy and independent components, so retuning one
never risks the others. It is a pure render over props with two callbacks: **no effect, no listener, no
timer**, and therefore no cleanup to write and nothing to leak on remount.

- **`onClick` stops propagation**, and this is load-bearing rather than defensive: the plate mounts
  inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting. Without the
  stop, poising the plate during a held reveal would *also* clear the reveal and commit the Quarry's
  lead as a side effect. A spec renders it inside a click-handling parent and asserts the parent never
  fires.
- **`Escape` cancels a poise** — an `onKeyDown` prop on the plate's own wrapper, a React synthetic
  handler rather than an `addEventListener`, so it is torn down with the element. It sits on the
  always-live wrapper rather than the button, so it still works when the button is disabled.
- **The refusal sentence renders on the face of the control**, as a `<p>`, never a `title` attribute:
  `game-ux` forbids hiding anything the current decision needs behind hover, and touch has no hover at
  all.
- **`aria-pressed` carries the poise**, and is forced `false` while refused — a stranded poise must
  never read as available to assistive tech. The class follows the same rule.
- One control is far below the roving-tabindex threshold, so it stays a **plain tab stop**.

`applyDamageAccessibleName` gives the three readings — live, poised, refused — **three different
accessible names**, which is how the specs tell them apart (`getByRole('button', { name })`), and it
puts the figure in the name rather than only in the glyph. A refusal **outranks** a poise in the name,
pinned by its own spec.

`warCouncilApplyDamage.css` (**deleted by DLR-114** with the plate; `warCouncilActionBar.css`'s
`.wc-bar-*` block carries the equivalent rules now) mirrored `warCouncilTimebomb.css`'s selectors and
tokens so the three rail controls read as one family — form-not-colour state (`:disabled` dashed and dimmed, `.is-poised` dashed
brass with a lift and a corner notch), the ≥44px hit-area floor as an explicit `min-width`/`min-height`,
`:focus-visible`, `@media (hover: hover)`, and `touch-action: manipulation`. The `.is-armed` block is
dropped: this control has no armed stage.

## The second figure on the bank readout

`BankMeter` gained one line — what the streak pays **if the player is hit before applying** — computed
through `forcedCashValue` rather than restating the fraction, so the copy cannot drift from the
constants. It is on the face of the readout rather than behind a hover because it is precisely the
number the new decision needs.

Its `aria-label` was **extended, not rewritten**: the `cashes for ${cash}` substring had to survive
intact because `WarCouncilRound.timebomb.test.tsx` matches on `/cashes for 6\b/i`. Props are unchanged.

**The at-risk heart preview deliberately still shows the FULL figure.** The projection and
`duelHealthBars.ts` were untouched by DLR-94 — the recorded decision is that the player can realise the
full figure on demand, so the full figure is what their streak is genuinely worth to them; the reduced
figure belongs beside the button that avoids it, not competing with the full one on the Quarry's bar.
_(DLR-101 later renamed `projectedFromStreak` to `projectedDepletion` and taught it about booked
Timebomb. **The full-figure decision above is untouched by that** — Timebomb is a separate band with its
own heart state, and the streak's own preview still shows what cashing right now would take.)_

## All of the copy is placeholder

`APPLY_DAMAGE_RAIL_LABEL`, the poised hint, the three refusal sentences,
`applyDamageAccessibleName`'s wording, `BankMeter`'s new line and the plate's `⤓` glyph are all
placeholder, flagged as such in `labels.ts` exactly as every other label in that file is. The wording is
the developer's; nothing about the rule depends on it. `APPLY_DAMAGE_REFUSAL_MESSAGE` is a **total
`Record`**, so a fourth refusal reason is a compile error here rather than an `undefined` sentence under
a disabled button.

## What the tests pin

- `__tests__/roundReducer.applyDamage.test.ts` — the poise, the refusals (all five since DLR-109,
  `TrickInProgress` since DLR-143), cancel, the trick carrying on and resolving normally afterwards,
  and a further tap on a resolved fight being inert rather than throwing.
  **Since DLR-109** its assertions on the committing tap changed direction: the Quarry's health no
  longer drops in the same transition, `encounter.pendingApplyPayout` holds the frozen `cashOut`
  instead, and `apPool` falls by `APPLY_DAMAGE_AP_COST` on the commit and not on the poise. **DLR-143
  rewrote the two D6-titled tests to their mirrors** (a pending Timebomb no longer blocks the poise or
  the commit), added a leader-only test (a trick already in flight cannot even be poised), and added a
  stacked-fold test proving a Timebomb queued before the press and the payout the press queues both
  settle in the same trick resolution — the one scenario the old refusal made unreachable.
- `__tests__/roundReducer.delayedApply.test.ts` (new, DLR-109; **rewritten for the reduce-not-wipe
  figures, DLR-141; restructured for the one-trick settle and ⅓ retention, DLR-143**) — the landing at
  the resolution of the very next trick after the press (was `APPLY_DAMAGE_DELAY_TRICKS + 1`
  resolutions with the delay at `1`; now the same expression evaluates to 1 resolution with the delay
  at `0`), the AC3/DLR-141 reduction to `APPLY_DAMAGE_HIT_RETENTION` floored (`⅓` since DLR-143, `3`
  where the worked example used to read `5`), the AC4 press-time snapshot surviving a card played
  during the delay window, the Timebomb-then-reduce ordering on a shared resolution, and the hand-end
  flush.
- ~~`__tests__/ApplyDamagePlate.test.tsx`~~ — **deleted with the component by DLR-114.** Its coverage
  moved to `__tests__/ActionBar.test.tsx` and `__tests__/WarCouncilRound.actionBar.test.tsx`, which
  assert the same behaviours against the bar's button: live and tappable, disabled with the reason on
  its face, the D6 reason stated rather than going quiet, `aria-pressed` and the class together, never
  reading as poised while refused, and `Escape`. The suite's file and test totals fell against the
  pre-DLR-114 baseline for this reason; it is a relocation, not a regression.
- `__tests__/labels.test.ts` — the three distinct accessible names, the figure in the name, the reason
  in the name, and a refusal outranking a poise.
- `__tests__/BankMeter.test.tsx` — the widened label and the reduced figure on the readout's face.
- `__tests__/WarCouncilRound.test.tsx` — the whole thing end to end through the rendered felt: poise,
  commit, the Quarry's hearts down by the full figure, the player's untouched, the bank zeroed, the
  plate now refused, and the card still there to play.

## DLR-97 — the plate's polish pass

_(Recorded for its reasoning; the sheet itself went with the plate on DLR-114.)_ Two CSS-only changes
to `warCouncilApplyDamage.css`, matching the identical fix applied to the
Timebomb plate the same phase (see
[the Timebomb plate's own note](timebomb-charge-and-the-mark.md#dlr-97-the-plates-polish-pass)):
the plate's `filter` (its hover brightness) gained a transition reading the shared
`--wc-ui-transition-ms` token, alongside the `transform`/`box-shadow` pair it already transitioned.
And its `aspect-ratio` moved from `2 / 3` to `4 / 3` with `border-radius: 10px`, done in lockstep with
the Cheat slot and the Timebomb plate so all three felt-rail plates stay one shape family, distinct
from `.wc-card`'s silhouette. No prop, refusal string, or accessible-name computation changed.

## What the commit does now — since DLR-109

**No `.tsx` file changed.** The plate, its copy, its CSS, and the two-tap grammar above are exactly
as this page already describes; what changed is `handleTapApplyDamage`'s commit branch, in
`roundReducer.ts`:

```ts
const { state: round, cashOut } = cashBankNow(state.round)
const payout = queueApplyPayout(cashOut, state.round.hands[PlayerSide.Player].length)
return {
  ...state,
  round,
  encounter: queueApplyDamagePayout(state.encounter, payout),
  apPool: spendAp(state.apPool, APPLY_DAMAGE_AP_COST),  // see the DLR-114 note below
  applyPoised: false,
}
```

> **Since DLR-114 that spend writes into a different field.** `RoundUiState.apPool` was **deleted**
> and replaced by `buffActivation: BuffActivationState`, so the line above now reads
> `buffActivation: { ...state.buffActivation, apPool: spendAp(state.buffActivation.apPool,
> APPLY_DAMAGE_AP_COST) }` and `applyDamageStock` reads `state.buffActivation.apPool`. Nothing about
> the rule changed — what changed is that this is now the **same** pool `activateBuff` spends from,
> rather than one of two independent numbers both claiming to be the hand's action points. See
> [the action bar and the buff loadout](action-bar-and-loadout.md#one-ap-pool-where-there-used-to-be-two).

`cashBankNow` still zeroes bank and multiplier in the same transition as before — the bank readout
still visibly drops the instant the second tap lands. What no longer happens on this transition is
the cash-out itself: instead of `applyDamage(state.encounter, incomingFromCashOut(cashOut))`, the
figure and the press-time hand size are frozen into a `PendingApplyPayout` and handed to the
encounter's queue, and `APPLY_DAMAGE_AP_COST` is spent from the hand's `apPool` — **not refunded**
regardless of what later becomes of the payout (paid, reduced, or evaporated — DLR-141). `captureUnplayed` no longer fires on this transition at all, because the
press no longer resolves the encounter; a **delayed** kill's unplayed count instead comes from the
payout's own frozen `unplayedAtPress`, threaded through `commit` in `commitHandlers.ts`. See
[the delayed Apply Damage payout](../hunt/delayed-apply-damage-payout.md) for the queue, the
four-step trick-resolution order that settles it, and both new refusal codes
(`PayoutPending`, `InsufficientAp`) the two-tap grammar above now also has to be refused by.

**The refusal check on both taps is unchanged in shape and now guards more.** `applyDamageRefusalFor`
is still asked before the poise and re-asked on the commit, for the same D6 race this page already
describes — it now can also return `PayoutPending` (a payout from an earlier press is still in the
air) or `InsufficientAp` (the hand's `apPool` will not cover the cost). Both render through the
plate's existing `APPLY_DAMAGE_REFUSAL_MESSAGE` map with no component change.

~~**`apPool` has no felt-side readout.**~~ **Closed by DLR-114.** It was true from DLR-109 until then:
the pool was spent and refused against with nothing on the rail showing its value, so an
`InsufficientAp` refusal read as the button dying for no visible reason. The action bar now shows the
pool on the Apply Buff button's face (`6 AP · 3 held`) and again inside the loadout panel
(`6 action points left`), and Apply Damage's own button states its cost. Whether the figure is
legible where it sits is a look-at-it question nobody has answered.
