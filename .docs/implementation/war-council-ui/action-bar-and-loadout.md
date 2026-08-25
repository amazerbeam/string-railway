_Part of [War Council UI](README.md)._

# The action bar, the buff loadout, and the AP pool that stopped being two numbers

DLR-114 replaced the felt rail's four separate plates with **one action bar along the bottom of the
screen** carrying every pre-trick decision — **Apply Buff**, **Cards**, **Swap**, **Apply Damage** —
and, behind it, made the buff system player-reachable for the first time. Ten prior tickets had built
that system bottom-up (`RunState.buffs`, `apCostOf`, `startBuffActivation`/`activateBuff`/
`openBuffWindow`, `buffActivationRefusalFor`) and nothing in `src/` rendered or called any of it.

The shape is **relocation plus one new capability**, not a rewrite. Swap and Apply Damage moved onto
the bar with their `RoundUiAction` kinds untouched; Cards is a second entry point into the existing
`TapCard` second-tap path rather than a new action at all. Only the buff loadout is new.

## The bar is a fourth grid row, and it is always mounted

`.wc-shell` was `grid-template-rows: auto 1fr auto` over `status / dossier table / hand`. It is now
`auto 1fr auto auto` over `status / dossier table / hand / actions`, and `ActionBar` renders as a
sibling of `.wc-table` and `HandFan` under the shell rather than inside the felt. Only the `1fr`
table row absorbs the difference, which is what the no-scroll floor requires: the bar's own height is
`auto`, bounded by `clamp()` values copied from the sibling rail stylesheets, and the felt shrinks to
make room rather than the page growing. The rejected alternative was a fixed-position strip overlaid
on the hand, which would occlude hand cards at short viewports — the crop failure the hard floor
names. `.wc-felt-rail` keeps only `DecreePile`. See
[Layout and styling](layout-and-styling.md#a-full-viewport-shell-never-a-page) for the base rule and
the narrow-viewport override that must be maintained alongside it.

**Nothing on the bar is ever conditionally unmounted.** A control that vanishes costs more than one
that greys: the player relearns where things are, and the layout reflows on a screen that must not
scroll. Every button therefore greys with its reason on its own face, following `TimebombCharge`'s
existing "inert rather than absent" precedent. Four controls sits below `game-ux`'s roving-tabindex
threshold of about five, so the bar's buttons are plain tab stops; the loadout panel's unbounded buff
list uses `useRovingTabIndex`.

`ActionBar`'s `onClick` stops propagation, but for that component the stop is **defensive only** — it
renders under `.wc-shell`, which carries no `onClick`, so a click there could never reach
`handleCarryOn`. `BuffLoadoutPanel`'s identical-looking stop **is** load-bearing: the panel mounts
inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting. Do not delete
the panel's stop on the mistaken belief the bar's already covers it; the component docblocks say so
in both places.

## One AP pool, where there used to be two

Before this ticket the felt held **two independent numbers both claiming to be the hand's action
points**: `RoundUiState.apPool: ActionPoints` (DLR-109's, which Apply Damage spent from) and
`BuffActivationState.apPool` (DLR-108's, which nothing spent from). They had never been observed to
diverge only because the second had no consumer. This contract is the first that spends from both, so
the field was **deleted** and replaced:

```ts
readonly buffActivation: BuffActivationState  // REPLACES apPool: ActionPoints
readonly buffs: readonly Buff[]               // mirrored from the mount prop
readonly loadout: LoadoutSelection | null     // null = panel closed
```

Divergence is now unexpressible. `applyDamageStock` reads `state.buffActivation.apPool`,
`handleTapApplyDamage` writes `spendAp`'s result back into `state.buffActivation.apPool`, and
`activateBuff` returns a whole new `BuffActivationState`. `startBuffActivation()` seeds it in
`createRoundUiState`, which **is** the per-hand refresh because `App.tsx` remounts the felt with
`key={hand}` — the identical argument the retired `apPool: refreshActionPointsForNewHand(STARTING_AP)`
seed already made. `refreshBuffsForNewHand` remains the pure statement of the per-hand rule and
remains uncalled by the felt.

`buffs` is the first field mirrored from a mount prop that is **never written by any action** and
never handed back on `WarCouncilRoundResult` — a hand spends action points, not cards, so it cannot
change the pile. That makes it `bankClimbBonus`'s contract rather than `cheats`'s.

`LoadoutSelection` is `{ poised: BuffId | null }`, and `state.loadout` is one nullable field rather
than a boolean-plus-id pair, for `CheatSelection`'s stated reason: two fields would admit "closed but
holding a stale poise". It mirrors `discardSelection`'s `null` / `[]` shape exactly.

## The per-trick window fires when a trick resolves, not when one starts

`roundReducer` gained a second pure wrapper beside `captureUnplayed`:

```ts
export function roundReducer(state, action) {
  return openWindowOnTrickResolved(state, captureUnplayed(applyAction(state, action)))
}

function openWindowOnTrickResolved(prev: RoundUiState, next: RoundUiState): RoundUiState {
  if (prev.resolvedTrick !== null || next.resolvedTrick === null) return next
  return { ...next, buffActivation: openBuffWindow(next.buffActivation) }
}
```

That is DLR-108 AC4's per-trick activation boundary, applied at the one transition where a trick
actually resolves — the `null` → non-null edge of `resolvedTrick`. It deliberately does **not** key on
"the current trick is empty": a buff is activated _while_ the trick is empty (that is what
`discardWindowOpen` means), so an empty-trick rule would erase every activation the instant it was
made. Two arguments and pure, so StrictMode's development double dispatch recomputes an identical
value — the same property `captureUnplayed` beside it relies on. `openBuffWindow` clears
`activatedThisTrick` and, since 2026-08-25, also refills the pool back to `BuffActivationState.capacity`
— see [action-points.md](../hunt/action-points.md#the-refresh-cadence-moved-to-per-trick-2026-08-25)
for the cadence change and why `capacity` exists.

## The panel door is wider than the activation window, and that is a fix rather than a looseness

Two different questions, two different gates, and the separation is load-bearing:

| Question                         | Gate                                                                                            | Where                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| May the panel be **opened**?     | `loadoutDoorOpen(state) = discardWindowOpen(state) \|\| canAct(state)`                          | `buffHandlers.ts`            |
| May a **buff row** be activated? | `buffActivationRefusalFor(buffActivationStock(...))`, whose `windowOpen` is `discardWindowOpen` | `src/hunt/buffActivation.ts` |

The reason the door is wider: **Cheat and Timebomb moved inside the panel**. Before DLR-114 both were
reachable on any of the player's own turns — including while following a lead the Quarry had already
committed, which is exactly when a Cheat has value (breaking follow-suit) and the only moment marking
an illegal card makes sense. Gating the door on `discardWindowOpen` alone made that structurally
impossible, since a committed lead means `currentTrick.length !== 0`. The plan promised the
relocation would carry "no rule change and no reducer change"; the gate the relocation introduced is
what broke that promise, so the gate is what widened back. **The regression was found and fixed
inside the ticket.**

The practical consequence, which is the shipped behaviour: mid-trick the panel **opens**, the Cheat
slots and Timebomb charge inside it are **live**, and every buff row inside it is **disabled reading
"Not between tricks."** Opening the drawer is not itself a game action — reading what is inside costs
nothing.

`loadoutBarRefusalFor(state)` is the bar's own Apply Buff refusal, and it reads `loadoutDoorOpen`
directly so the button and `handleToggleLoadout`'s transition cannot disagree. It returns only
`WindowClosed` or `null`: a row's own `InsufficientAp` / `AlreadyActive` belongs on that row's face
inside the panel, never on the bar.

## Activation is two-tap: reversible until the second tap, committing after

`handleTapBuff` has three outcomes on one row, mirroring `handleTapApplyDamage`'s shape:

- a refusal **drops the poise** and changes nothing else;
- nothing poised, or a different buff poised, **poises this one**;
- the same buff poised **commits** through `activateBuff`, which spends AP through `spendAp` — the
  only subtraction path — and appends the id to `activatedThisTrick`.

The refusal is re-read on **both** taps, for `handleTapApplyDamage`'s stated reason: the felt can
change under a poised row, and re-reading is what stops a poise made while the row was live from
committing after it stopped being. `Escape` (via `handleCancelLoadout`) drops the poise unspent.

**There is no un-activate**, and that is not an omission: `activateBuff` spends through `spendAp` and
`activatedThisTrick` has no removal path, so the engine ships no refund and inventing one here would
be writing a rule `src/hunt/` does not own. The reversibility the ticket asks for is satisfied by the
poise stage — the same grammar Cheat, Timebomb and Apply Damage already use, so the bar teaches one
ritual rather than a fifth.

**Committing leaves the panel open**, because a player may activate more than one buff per trick.

Nothing in `buffHandlers.ts` throws. `activateBuff` throws `RangeError` by design on a refused
activation, so every path asks `buffActivationRefusalFor` first — a throw inside a reducer during an
event handler unmounts the tree. A `TapBuff` naming an id not in `offeredBuffs` is a no-op with the
poise dropped, never a throw.

**Opening the panel is mutually exclusive with everything else that reinterprets a hand-card tap.**
`handleToggleLoadout` clears `armed`, `cheatSelection`, `timebombStage` and `discardSelection` on the
way in; arming a Cheat or Timebomb from inside the panel closes it. All of those reinterpret the next
hand-card tap, and two at once makes that tap ambiguous — `handleTapDiscard`'s existing rule, extended
by one control.

## The `Unassigned` trap is closed in the pure layer, not in JSX

`apCostOf` **throws `RangeError`** on `BuffKind.Unassigned`, which is exactly what `startRun` seeds
`STARTING_BUFF_COUNT` of. So the filter lives in `src/hunt/buffActivation.ts` beside the function that
would throw — `isPricedBuff(buff)` and `activatableBuffs(buffs)` — rather than in a component that
would have to remember it. `roundUiState.ts`'s `offeredBuffs(state)` states the offered pile once, and
both the panel's rows and `handleTapBuff`'s guard read it, so they cannot disagree about which buffs
exist. See [hunt/buff-activation-and-ap-costs.md](../hunt/buff-activation-and-ap-costs.md).

## The copy is transcribed, and one string serves both surfaces

`buffLabels.ts` holds three `Record`s keyed over the **closed** `BuffKind` and `BuffRewardAxis`
unions — `BUFF_FAMILY_WORD`, `BUFF_CONDITION_SENTENCE`, `BUFF_REWARD_SUFFIX` — with the eleven
condition families' words, sentences and the four reward suffixes (Blade / Purse / Second Wind /
Momentum) taken verbatim from `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` →
_How a card is named_. Keying over the closed unions means a `BuffKind` added later fails to compile
here rather than rendering `undefined`. The activated/consumable kinds and `Unassigned` have no row in
that document, so their words are this ticket's own placeholder copy.

`buffLine(buff, apCost)` composes the one glanceable line:

```
Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. 2 AP.
```

and `buffRowAccessibleName` appends the poise hint or the refusal sentence. **The same string is the
row's visible text and its accessible name**, so what a sighted player reads and what a screen reader
announces cannot drift — which is also what makes the component specs' `getByRole('button', { name })`
assertions test the string a player actually sees.

`actionBarLabels.ts` owns the bar's own copy and reuses `labels.ts`'s existing
`APPLY_DAMAGE_POISED_HINT`, `APPLY_DAMAGE_REFUSAL_MESSAGE`, `DISCARD_REFUSAL_MESSAGE`,
`discardAccessibleName` and `cardAccessibleName` rather than restating any of them — which is why
deleting the two plates rewrote no copy. `queuedPayoutText(pending)` is the queued-payout readout
(`Payout queued: 12 damage, 2 tricks to go.`), returning `null` rather than rendering
`undefined tricks` when nothing is queued; `applyDamageBarAccessibleName` puts the AP cost on the
control's face. All of it is placeholder copy, as this project's rest is.

## The props assembly is its own file

`roundControlsProps.ts` assembles `ActionBarProps` and `BuffLoadoutPanelProps` from the reducer's own
state plus the handful of values `WarCouncilRound.tsx` already derives once. It was split out the
moment the two prop objects pushed that component over its 400-line budget — the same forcing function
that produced `quarryAdvance.ts`, `commitHandlers.ts`, `discardHandlers.ts` and `roundBars.ts`. It
decides nothing.

Both functions take **one options object rather than positional parameters**, deliberately:
`ActionBarOptions` alone carries three same-shaped nullable refusal values (`loadoutRefusal`,
`applyRefusal`, `discardRefusal`) that would transpose silently as positional arguments — TypeScript
cannot catch two same-typed values swapped by position, but a mislabelled field is a compile error.
This is `duelHealthBars`'s `HealthBarOverlays` reasoning applied a second time.

## What was deleted

`ApplyDamagePlate.tsx`, `DiscardPlate.tsx`, `warCouncilApplyDamage.css`, `warCouncilDiscard.css` and
the two components' specs. Their **mechanics did not go anywhere** — the two-tap Apply Damage grammar,
its refusal-on-both-taps rule, the discard's `discardWindowOpen` gate and its selection model are all
unchanged and all now driven from the bar. Their explanations stay where they were, in
[apply-damage-plate.md](apply-damage-plate.md) and
[discard-plate-and-selection.md](discard-plate-and-selection.md), each carrying a note about where the
control now lives. `labels.ts`'s label functions were kept and are reused by the bar.

## What this does NOT make reachable

- ~~**A buff's condition is never evaluated and its reward is never paid.**~~ True of DLR-114 and
  **no longer true since DLR-125** (2026-08-24): `buffAccrual.ts` has a caller, an activated buff's
  condition is checked at every trick resolution, and the reward reaches the cash-out, the AP pool
  and the run's purse. Nothing on this bar changed to make that happen — the buffs the panel
  activates simply now reach the engine that pays them. See
  [The hand's buff bookkeeping, and the fold that pays it out](buff-hand-state-and-the-fold.md).
- **On a fresh run with an empty Vault the buff list opens holding one card — the starting Cheat —
  and fills further at the first shop.** `startRun` seeds four `Unassigned` placeholders (filtered out
  by `activatableBuffs`) plus, since DLR-132, one bronze Cheat buff, so the panel shows exactly one
  row until the player pulls a reel. **DLR-116 wired `slotMachine.ts` into the shop**, so priced buffs
  now reach the pile through a pull as well as through Vault grants (`mintGrants`) — roughly 2.6 cards
  per pull, one pull free per visit, and since DLR-132 the pull can land a Cheat or a Timebomb too.
  Activating one **now pays**, since DLR-125 — see the bullet above.

> **DLR-132 closed the gap the two bullets below originally described, 2026-08-24.** Cheat and
> Timebomb no longer run on their own bespoke state: `CheatStage`, `TimebombStage`, `CheatSlots.tsx`
> and `TimebombCharge.tsx` are deleted, both are ordinary rows in `buffs` activated through
> `handleTapBuff` beside Ward's, and `timebombDamageOf` (via `mintFromTemplate`) is the only minting
> path for both. The nomination this section used to defer — `commitTimebomb` replaced by
> `activateBuff` priming a card — is what DLR-132 built: spending a Timebomb sets
> `timebombArmedDamage`, and the very next hand-card tap primes through `primeTapped`, folded into
> `handleTapCard`. See [Cheat and Timebomb as buff-pile objects](../hunt/cheat-and-timebomb-buffs.md).
> The two bullets immediately below are DLR-114's original record, kept for its accurate description
> of the panel's move onto one door — only the "still bespoke" claim they made is now wrong.

- ~~**Cheat and Timebomb still run on their own bespoke state.**~~ Was true from DLR-114 through
  DLR-132; see the note above for what replaced it.

## What the tests pin

- `__tests__/buffHandlers.test.ts` — the door's widened gate, the mutual exclusions on open, the
  three `handleTapBuff` outcomes, the re-read refusal on the second tap, an unknown id, and
  `Escape`'s unspent close.
- `__tests__/ActionBar.test.tsx` and `__tests__/BuffLoadoutPanel.test.tsx` — every control by
  accessible role and label: greying with the reason on its own face, `aria-pressed` for each poise,
  the empty-pile message, the per-row refusal sentences, and the panel's click not reaching the felt
  behind it.
- `__tests__/buffLabels.test.ts` and `__tests__/actionBarLabels.test.ts` — the composed line, the
  refusal and poise suffixes, the queued-payout sentence and its `null`.
- `__tests__/WarCouncilRound.actionBar.test.tsx` — the whole bar through the mounted felt.
- `__tests__/roundReducer.applyDamage.test.ts` — repointed at `buffActivation.apPool`; if any
  assertion there had been passing for the wrong reason, this is where it would have surfaced.
