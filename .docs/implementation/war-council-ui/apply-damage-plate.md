Part of [War Council UI](README.md).

# The Apply Damage plate, and the extraction that had to come first

DLR-94 added the felt's third rail control: a plate that cashes the player's banked streak into the
Quarry on demand, at no cost in health. The rule is entirely in
[`voluntaryCashOut.ts`](../war-council/voluntary-cash-out.md); everything here is presentation and
sequencing.

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
`handleTapCheat`, `commitEnvenom`, `handleCarryOn` and `commit`, none of which moved. Lint is what
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
the failure this contract had to avoid, and the same reason `cheatArmed` and `envenomArmed` already
live in that file rather than being recomputed in the component.

Beside it, **`applyDamageStock`** is the single place the app layer's shape is translated into the pure
module's: it is where `hasPendingEnvenom(encounter)` and `canAct(state)` are read, and it is what lets
`applyDamageRefusalFor` take four plain values and stay ignorant of both `EncounterState` and
`RoundUiState`.

## The two-tap grammar

`RoundUiState` gained one field: **`applyPoised: boolean`**. Required rather than optional, so every
construction site is a compile error rather than an `undefined` — `createRoundUiState` is the only one,
and it seeds `false`. `RoundUiSeed` is untouched: nothing about this control is run state, and a poise
is a hand-transient that dies on remount. That is correct behaviour, not a limitation.

**A single boolean rather than `EnvenomStage`'s two-stage union**, deliberately: Envenom needs a second
stage because its armed state waits for a *third* tap on a hand card. Apply Damage's second tap **is**
the action, so "poised" is the only state there is to be in.

`handleTapApplyDamage` has three outcomes, mirroring `handleTapEnvenom`'s shape — a refusal changes
nothing, nothing poised poises, poised commits:

```ts
if (applyDamageRefusalFor(applyDamageStock(state)) !== null)
  return state.applyPoised ? { ...state, applyPoised: false } : state
if (!state.applyPoised) return { ...state, applyPoised: true }
// …commit
```

**It asks the refusal predicate on BOTH taps, and that is load-bearing.** The felt can change under a
poised plate — a poison booking lands, a reveal is held, the turn passes — and re-reading is what stops
a poise made while the control was live from committing after it stopped being. Design decision D6 asks
for exactly this: the control must read the pending-poison predicate *before it commits to anything*.
There is a spec that books poison between the two taps and asserts the commit is refused and the poise
dropped.

A refusal **drops a held poise** rather than leaving it stranded, and never half-applies. The reason is
already on the plate's face, so the player is never left with an inert control and no visible cause.

The commit itself is three statements: `cashBankNow`, then `applyDamage` through `incomingFromCashOut`,
then clear the poise. It is **guarded by `isEncounterResolved`** for the reason `applyResolution` guards:
`applyDamage` *throws* on an already-resolved encounter, and a throw inside a reducer during an event
handler unmounts the tree. Unreachable in practice — a resolved encounter already fails `canAct` — so it
is a guard rather than a live path.

**`resolvedTrick` stays `null` and nothing writes `lastResolution`**, so no reveal is held, the felt
never enters its waiting state, and the player is simply looking at a zeroed `BankMeter` and a shorter
Quarry heart row with their card still to play.

**Poising does not clear a Cheat or an Envenom selection, and they do not clear it.** Those two
reinterpret the next hand-card tap and therefore cannot coexist; this one reinterprets nothing, so a
player may poise a Cheat and apply damage in either order without losing either.

## The plate

`ApplyDamagePlate.tsx` is a **sibling** of `CheatSlots` and `EnvenomCharge` rather than a
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

`warCouncilApplyDamage.css` mirrors `warCouncilEnvenom.css`'s selectors and tokens so the three rail
controls read as one family — form-not-colour state (`:disabled` dashed and dimmed, `.is-poised` dashed
brass with a lift and a corner notch), the ≥44px hit-area floor as an explicit `min-width`/`min-height`,
`:focus-visible`, `@media (hover: hover)`, and `touch-action: manipulation`. The `.is-armed` block is
dropped: this control has no armed stage.

## The second figure on the bank readout

`BankMeter` gained one line — what the streak pays **if the player is hit before applying** — computed
through `forcedCashValue` rather than restating the fraction, so the copy cannot drift from the
constants. It is on the face of the readout rather than behind a hover because it is precisely the
number the new decision needs.

Its `aria-label` was **extended, not rewritten**: the `cashes for ${cash}` substring had to survive
intact because `WarCouncilRound.envenom.test.tsx` matches on `/cashes for 6\b/i`. Props are unchanged.

**The at-risk heart preview deliberately still shows the FULL figure.** `projectedFromStreak` and
`duelHealthBars.ts` are untouched — the recorded decision is that the player can realise the full figure
on demand, so the full figure is what their streak is genuinely worth to them; the reduced figure
belongs beside the button that avoids it, not competing with the full one on the Quarry's bar.

## All of the copy is placeholder

`APPLY_DAMAGE_RAIL_LABEL`, the poised hint, the three refusal sentences,
`applyDamageAccessibleName`'s wording, `BankMeter`'s new line and the plate's `⤓` glyph are all
placeholder, flagged as such in `labels.ts` exactly as every other label in that file is. The wording is
the developer's; nothing about the rule depends on it. `APPLY_DAMAGE_REFUSAL_MESSAGE` is a **total
`Record`**, so a fourth refusal reason is a compile error here rather than an `undefined` sentence under
a disabled button.

## What the tests pin

- `__tests__/roundReducer.applyDamage.test.ts` — the poise, all three refusals, the D6 race (poison
  booked *between* the two taps), cancel, the full payout, the zero player damage, the zeroed counters,
  the trick carrying on and resolving normally afterwards, a lethal cash-out ending the fight through
  the ordinary machinery, and a further tap on a resolved fight being inert rather than throwing.
- `__tests__/ApplyDamagePlate.test.tsx` — live and tappable, disabled with the reason on its face, the
  D6 reason stated rather than going quiet, `aria-pressed` and the class together, never reading as
  poised while refused, `Escape`, and the click not reaching the felt behind it.
- `__tests__/labels.test.ts` — the three distinct accessible names, the figure in the name, the reason
  in the name, and a refusal outranking a poise.
- `__tests__/BankMeter.test.tsx` — the widened label and the reduced figure on the readout's face.
- `__tests__/WarCouncilRound.test.tsx` — the whole thing end to end through the rendered felt: poise,
  commit, the Quarry's hearts down by the full figure, the player's untouched, the bank zeroed, the
  plate now refused, and the card still there to play.
