Part of [War Council UI](README.md).

# The trick resolution screen — the build-up, the pot, and the apply-or-roll choice

Built by DLR-156, replacing the Apply Damage plate DLR-94/DLR-109/DLR-143 built into the action bar.
**The button is gone**, along with its five refusal reasons, its AP cost, and the delayed-payout
queue behind it. In its place, **every resolved trick hands off to a second full-viewport screen**
that carries the two played cards across, derives the trick's damage one term at a time, and asks
whether to cash the pot or push it.

The arithmetic this screen narrates is the engine's, not its own — see
[war-council/the-streak-and-the-pot.md](../war-council/the-streak-and-the-pot.md). This page is about
the surface.

## The shape: two screens, not one panel

`WarCouncilRound.tsx` was at 390 of its 400-line budget and could not absorb a second shell. It is
now a **99-line switch** that owns the reducer and renders one of two siblings:

```
ui.resolution === null   ->  <WarCouncilTable>        the felt, the hand, the action bar
ui.resolution !== null   ->  <TrickResolutionScreen>  the trick, the ledger, the pot, the choice
```

Every derivation the felt needs moved **wholesale** into `WarCouncilTable.tsx` in that split; no
behaviour changed in the move. `SuitSymbolSheet` and `CardArtSheet` are rendered above the switch
rather than inside either screen — both need the same sprite definitions, and only one screen is
mounted at a time, so hoisting avoids a duplicate-id risk for no cost.

**It is a second full-viewport shell, not a modal over the felt.** A dialog centred on the table
leaves the felt visible round the edges, which reads as "you are still there" while every control on
it is dead. The screen is a `100dvh` grid with `overflow: hidden` and safe-area insets, and its one
scrolling region is the ledger.

**The two played cards are cloned, not moved.** The felt is not mounted while this screen is up, so
there is nothing to move them from; the screen renders its own `PlayingCard` for each of
`ResolutionView.cards`. The player is returning to that table in a moment, and a trick well that lost
its cards while the screen was up reads as a bug on the way back.

## `RoundUiState.resolution` — one nullable field

```ts
readonly resolution: ResolutionView | null
```

**One nullable field rather than a boolean plus a payload**, exactly as `discardSelection` and
`loadout` are, so "screen closed but holding a stale trick" is unexpressible.

`ResolutionView` carries the screen's whole content: the two `cards`, the `winner`, the engine's
`TrickResolution`, the ordered `beats`, the 1-based `trickNumber` for the header, and `nextPotFloor`.

`nextPotFloor` is `potValue(total + BASE_DAMAGE, roll + 1)` — **the bare rule**, because the player
may fire nothing on the next trick. It is what the Roll over button states as a floor (`108+`), and
it inherits `potValue`'s own guard.

## Where it is set, and where it is cleared

`commitHandlers.ts`'s `resolutionViewFor` builds the whole view on the **`null` → non-null edge of
`resolvedTrick`** — the same edge `foldBuffOutcome` and `openWindowOnTrickResolved` already fire on.
There are two such sites, because a trick can complete either on the player's own commit or on the
Quarry's follow, and both are wired.

Two reducer actions clear it, and they are the screen's only exits:

| Action | What it does | Which button |
| --- | --- | --- |
| `ApplyPot` | `applyPot(streak)` → the pot to the Quarry through `applyDamage(incomingFromPot(dealt))`, `total`/`roll` to zero, screen closed | **Apply Damage** |
| `RollOver` | leaves `total`/`roll` exactly as they stand and closes the screen | **Roll over**, and the hurt branch's **Onward** |

`TapApplyDamage`, `CancelApplyDamage`, `RoundUiState.applyPoised` and `applyDamageStock` were deleted
with the plate.

Both handlers are **total and guarded**: a `null` resolution is a no-op returning `state` unchanged
rather than a throw, because a throw inside an event handler unmounts the tree (the discipline
`primeTapped` already documents). `applyPotAction` also repeats `applyResolution`'s
`isEncounterResolved` short-circuit, so applying a pot into an already-dead Quarry closes the screen
inertly rather than reaching `applyDamage`'s `RangeError`.

DLR-156 Assumption 11: the cut, unconstructible Debt Collector family's `applyDamagePressed` trigger
moved here, because this is the only place a cash-out can now happen.

## The build-up — `resolutionBeats.ts`, pure and rendererless

`resolutionBeatsFor(resolution, fired, before)` turns the engine's decision into an ordered
`readonly ResolutionBeat[]`. It **runs no rule of its own** — the discipline `buffProjection.ts`'s
docblock sets out and `cardDamage.ts` already follows. `resolveTrickBank` has already computed
`trickDamage` and picked which buffs fired; this module only replays those already-decided terms so
the screen can narrate them.

It is pure and takes no renderer, but lives in `src/app/warCouncil/` rather than `src/warCouncil/`
because it produces **worded labels**, and the engine holds no user-facing copy. The wording itself
is one file over again, in `resolutionLabels.ts`.

Each beat carries the running `damage` and `mult` registers **after** it lands plus their product, so
the component renders a value rather than computing one, and the whole sequence is assertable in a
`.test.ts` with no renderer.

### The order

A **banked** trick opens on `Base` (`BASE_DAMAGE + baseDamageBonus`), then one beat per id in
`resolution.firedBuffIds`, in that order, classified `Blade` or `Momentum` by the fired buff's own
reward axis — any other axis contributes nothing to this trick's damage and gets no beat. Then the
**Overlap Bonus on its own beat**, but only when it is non-zero: `overlapBonusFor(1)` is 0, so a
single fired buff never produces one. The sequence closes on `Banked`, which adds nothing itself and
carries the final figures forward unchanged, so the last beat's `running` always equals
`trickDamage.dealt`.

**A Momentum card never touches the damage number.** It moves the multiplier and the product
recomputes, which is why the readout reads `DAMAGE × MULT` rather than one figure — the player can
see which register each card moved.

### The three one-beat branches

A trick with `trickDamage === null` produces exactly **one** beat, and there are two shapes of it:

- **`Hurt`** — states the health taken and the pot that was lost with it. The pot lost is computed
  from `before`, the streak this trick wiped, because the engine's own `total`/`roll` are already
  zero by then. There is no two-thirds consolation to state.
- **`Absorbed`** — a **replaced clean loss** (DLR-90's primed card the Quarry wins cleanly) resets
  nothing: no health taken, `total` and `roll` standing. `damageToPlayer === 0` is a total and
  reliable test for it, because either of `streak.ts`'s two hurt triggers being true always makes
  `damageToPlayer` positive. It gets its own beat kind rather than a cosmetic variant of `Hurt`,
  because `Hurt`'s wording named a pot that was never touched. **This is a real engine/screen pair
  worth knowing about**: the one outcome where the player loses a trick and nothing at all happens.

An id in `firedBuffIds` with no matching `Buff` is **dropped** rather than rendering `undefined`,
mirroring `buffFiredLabels.ts`'s own `resolveFired`.

## `useBeatSequence` — the clock

Walks `beats` one per `--wc-beat`, and **still staggers under `prefers-reduced-motion`**: one term at
a time *is* the derivation, so removing the stagger would remove the information. What reduced motion
suppresses is only the travel, scale and ring classes the component applies.

Two effects, each with its own cleanup: one `matchMedia` change listener, and one `setTimeout`
advancing `landed` by one. **The timer effect is keyed off `landed` itself**, a value in state, so
StrictMode's double invoke-then-cleanup-then-invoke mount recomputes an identical schedule instead of
double-scheduling. The initial reduced-motion read is computed lazily in `useState`'s initialiser
rather than synchronously in an effect body, which `react-hooks/set-state-in-effect` flags.

The pace is **read from the stylesheet**, not duplicated as a TypeScript literal: `beatIntervalMs()`
reads `--wc-beat` off the document's computed style and falls back to `520` only when the property
cannot be read at all — which is always true in jsdom, since it computes no custom properties.
`useCardFlight` reads `--wc-flight` by the same pattern.

## `ResolutionLedger` — two rows, always, and an instant follow

The window is **exactly two rows tall at all times**. It does not grow with the sixth beat and it
does not collapse on the first: its height is `calc(2 * var(--wc-ledger-row))`, pinned to a token
rather than to content, so two rows is exactly two rows whatever a card is called. A panel that
changes height mid-sequence drags everything around it up and down on every beat — motion the beat
itself then has to compete with. Reserving the space costs one empty row on a bare trick and buys a
readout that never moves.

Above two rows it scrolls, and this is the **only scrolling region in the change**; `game-ux`'s
no-scroll floor is met by scoping the overflow here rather than to the shell. The top edge fades
while the box overflows, so a scrolled-away row does not simply vanish.

> **The follow is a plain assignment — `el.scrollTop = el.scrollHeight` — and it must never become
> `behavior: 'smooth'` or `scrollIntoView`.** Both ride the same compositor as the card flight, and
> the mockup measured the smooth version silently never running: `scrollTop` stayed at 0 for a whole
> run and every term after the second landed out of sight with no sign anything had happened. An
> effect that can silently not run is not acceptable here; an assignment cannot.

The effect registers no listener, timer or observer, so it has **no cleanup to write** — the one
place in this change where that is true. Row keys join the beat index to the beat kind, because a
kind repeats within a trick (two Momentum cards, say) and the *order* is what makes a row unique.

## The choice

Both halves of the bet are on screen with what the decision needs: the pot as it stands, what it
becomes if the next trick also banks, and the roll being wagered.

- **Apply Damage** — solid-edged, states the pot in full, "dealt now · total and roll reset".
- **Roll over** — dashed-edged (the idiom the rest of this UI uses for *provisional*), states the
  payout as a **floor** (`108+`, because the player may fire nothing next trick), and directly
  beneath it, in the alarm colour, `0 if you do not`. Stating the floor and the risk in the same
  control is what turns this from a nag into a bet.

The two are told apart by **shape and words first** — solid versus dashed, "dealt now" versus "if you
take trick 4". Colour only reinforces, so the pair survives a greyscale screenshot. The accessible
name of each button states its whole consequence, and the pot line is a `role="group"` labelled
`Total N, roll N, pot N`.

**The branch with no choice.** A hurt trick offers nothing to decide, so it gets a **way out** rather
than a decision: one **Onward** button, dispatching the same `RollOver` action (there is nothing left
to reset). Its subtext branches on `absorbed` — "total and roll stand — nothing changed" when a
primed card absorbed the loss, "trick N+1 starts from nothing" when the streak actually broke — and
so does the header line, which reads `banked`, `the streak is broken`, or `nothing changed`.

## The card's flight — `useCardFlight`

AC15: the played card **travels** from the hand to the table rather than appearing there.

The **second** tap on an already-armed card is the one that plays it, so that is the tap the flight
is wired to: the dispatch that commits the card is **deferred to the landing callback**, so the trick
resolves only once the card visibly arrives. Every other tap — arming, cancelling, marking a
Timebomb, toggling a discard, and the Fox/Woodcutter second tap that opens a prompt rather than
playing — dispatches immediately, exactly as before. The rank check mirrors the reducer's own so a
flight is never started for a card that is not about to leave the hand.

The card is **cloned into a fixed layer** above everything (`.wc-card-flyer`), so it is never clipped
by the hand's or the felt's overflow, and it moves on an **arc**, lifting clear before it travels,
which is what makes it read as *placed* rather than dragged through its neighbours. The original stays
in the layout but is hidden, so the gap in the hand collapses **after** the landing, never during.

> **The landing must not depend on `onfinish` alone. This is a real defect that was found and fixed,
> not a nicety.** A background tab does not run Web Animations: `currentTime` stays at 0, `onfinish`
> never fires, and everything after an awaited finish is dead — the trick never resolves and the hand
> stops responding for the rest of the session. `land()` is therefore **idempotent and reachable
> three ways**: `onfinish`, a `setTimeout` matched to `--wc-flight`, and a `visibilitychange`
> handler. All three, plus the cloned node and the animation itself, are released in the effect's
> cleanup. **Anything in `src/` that awaits a Web Animations finish needs the same treatment.**

Unmount tears the flight down through `teardown()`, which marks the guard closed **without** calling
`onLanded` — so a stray timer or `visibilitychange` firing after unmount lands nothing.

Two more properties matter:

- **Web Animations support is feature-detected, not environment-sniffed.** An environment with no
  `Element.prototype.animate` (jsdom by default) lands immediately rather than leaving the tap
  silently unresolved. Every spec that wants the real three-path race stubs `animate` itself, which
  is what makes that branch false for them.
- **The hand is disabled for the whole flight.** `inFlight` feeds the shared `interactive` predicate,
  so the fan, the action bar and the hint all agree that flight blocks acting, and `handleTap`
  refuses re-entry as a belt-and-braces guard. A review pass found that a still-enabled hand let a
  second tap on a *different* card land mid-flight and read as a fresh arm; the deferred dispatch is
  closed over the card that started the flight, which makes it stale-aware regardless.
- **No target to fly to is a fall-back, not a failure.** If either the card element or the trick well
  cannot be found, the commit dispatches exactly as it did before rather than stranding the tap on a
  flight that could never start.

## The four tunables are transcribed placeholders

Declared once, in `src/app/warCouncil/warCouncilResolve.css`, and read from there:

| Property | Value | What it prices |
| --- | --- | --- |
| `--wc-beat` | `520ms` | one term's beat |
| `--wc-resolve-hold` | `700ms` | how long the screen holds after a choice before returning — **declared and never read; see below** |
| `--wc-flight` | `380ms` | the card's travel from hand to table |
| `--wc-ledger-row` | `2.5rem` | the pinned ledger row height |

**None of these is a chosen value.** All four are transcribed verbatim from the approved mockup and
marked `PLACEHOLDER` in the stylesheet. `--wc-beat` is the one that matters most — five impacts at
520ms is about three seconds a trick, six times a hand — and `ui-notes.md` §7 calls it the single
number most worth setting from a play-through. **They are the developer's, and only answerable by
playing.**

## The post-choice hold is not built

`ui-notes.md` §4 specifies that **both exits hold before leaving**: applying a large pot and cutting
straight back to the felt shows the player the number they chose for zero frames, so the payout
should land, the header should change to name what happened ("Dealt to Aoife" / "Rolled over"), and
only then should the screen return.

**That does not happen.** `applyPotAction` and `rollOverAction` both set `resolution` to `null` in the
same transition that deals the pot, so the screen leaves immediately. `--wc-resolve-hold` is declared
in `warCouncilResolve.css` and **has no reader anywhere in `src/`**, and no header copy for either
outcome exists. Nothing else depends on it; building it is a timer in the screen (or a two-stage
`resolution` value) plus two lines of copy.

## What is untested, and what a browser would have checked

**No browser pass was run on this ticket.** Everything below is a verification gap rather than a
build gap — the feature is reachable in the app.

jsdom has no layout engine, so neither screen can be proven not to scroll under Vitest. What *is*
covered: the beat derivation for every branch (`resolutionBeats.test.ts`), the ledger's two-row cap
and its follow-to-newest (`ResolutionLedger.test.tsx`), the screen's two branches and their
accessible names (`TrickResolutionScreen.test.tsx`), the beat clock and its reduced-motion branch
(`useBeatSequence.test.tsx`), the flight landing even when the animation never runs
(`useCardFlight.test.tsx`), and both reducer actions (`roundReducer.resolution.test.ts`).

What a browser would have checked: that neither screen scrolls at the seven viewport sizes the mockup
was measured at; that the ledger holds a constant height across a full six-beat run; that a greyscale
screenshot still tells the two prompt buttons apart and still names the winning side; and that the
whole sequence reads at 520ms rather than dragging.

**One residual layout defect is recorded rather than fixed.** On the *table* screen at 640px of
viewport height or less, the trick well overhangs the felt's lip by 7–55px with the prompt open. The
measurement is pessimistic — the mockup's test shrinks the shell while its `clamp()` bounds still
read the full viewport — and at 600px the layout wants a structural change rather than a tuning one.
The resolution screen itself had zero overflow at every size tested. Whether this becomes its own
ticket is the developer's call.

## The open question this screen was built to answer

**Does a whole screen firing up to six times a hand wear out?** The old button might be pressed once
or never; this prompt is mandatory and blocks. `spec.md` and `ui-notes.md` §7 both mark it
play-and-see, and this ticket deliberately ships the blocking, always-shown version. The candidate
fixes — skipping a bare trick where there is nothing to decide, or a faster non-blocking variant —
are named and not built.
