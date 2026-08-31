Part of [War Council UI](README.md).

# Priming a Timebomb — the waiting hand, the mark on the wrapper, the two-trick fuse, and taking it back

DLR-154. Before this ticket a Timebomb worked mechanically and was almost entirely invisible: the
prompt that asks for a card sat below a hint branch that is true throughout the prompt's own
lifetime, the class the hand set while waiting styled nothing at all, the mark was a `⚗` glyph in a
disc, the riding row called a spent Timebomb "already spent" and offered no way back, and `Escape`
silently ate a paid-for card. Two rules were wrong as well: a second Timebomb could be spent over a
first, overwriting its tier, and a marked card the player simply never played evaporated at hand
end for free.

The engine side of a Timebomb is not here. The marker itself is
[`src/warCouncil/timebomb.ts`](../war-council/the-timebomb-mark.md); the queue the mark books into
is [`src/hunt/`'s](../hunt/timebomb-and-the-delayed-hit.md). This file owns what the player sees,
does and is held to — the priming mode, the mark, the fuse, the refusal and the revocation.

> **Every colour, size, timing and string this ticket added is a PLACEHOLDER pending the
> developer** — the mark's overhang, size and hue, the `620ms` fizz, the `.wc-fan.wc-is-marking`
> tint and drift, the numeral's size, and all five new or retuned copy strings. None of them was
> chosen by an agent; they are carried unretuned from `mockup-primed-card.html` or proposed fresh
> and flagged. `tasks.md`'s *Developer decides or observes* block is the list.

## One source of truth for which card is primed, and it is the engine's

`RoundState.primedCards` is it, and the design is what it does **not** add. There is no
`primedTarget` field anywhere: the riding row's target is **derived** — `timebombTargetFor` in
`buffRideModel.ts` returns `null` while the mode is still waiting (`timebombArmedDamage !== null`)
and `primedCards.at(-1) ?? null` otherwise. The two fields DLR-154 did add answer different
questions and so cannot disagree with it: `timebombFuseRemaining` answers *how long is left*, and
`timebombBuff` holds *the buff*, never the card.

`primedCards.at(-1)` returns `undefined` on an empty array and `?? null` converts it explicitly,
so a blank can never reach a render.

## The priming mode: a hint that is reachable, and a hand that shows it is waiting

Priming mode is `timebombArmed(state)` — `timebombArmedDamage !== null` — and needed no new flag.
What it needed was to be visible.

**`deriveHint`'s Timebomb branch moved above `quarryToLead`** (`roundHint.ts`), joining
DLR-100's discard branch there and for the same reason: the Quarry-to-lead gap spans exactly the
between-tricks window a Timebomb is activatable in, so beneath that branch the prompt was
unreachable throughout its own lifetime. The retuned `TIMEBOMB_ARMED_HINT` now says *why* the hand
is being asked for a card, not merely that it is.

**`.wc-fan.wc-is-marking` has a rule now.** The class had been rendered by `HandFan.tsx` since
DLR-90 with **zero stylesheet rules behind it anywhere**, so "the hand shows it is waiting" was not
weak, it was absent. `warCouncilHand.css` gives it a tint, an inset edge and a slow drift on the
cards, with a `prefers-reduced-motion` block that stops the drift. (`.wc-is-discarding` still has no
rule; that is DLR-100's and stayed out of scope.)

### The window a Timebomb is armed in is wider than the window `canAct` allows

This is the non-obvious part, and it cost a review round as a blocker. `canAct` is **false**
whenever the Quarry is to lead an empty trick — and that gap is precisely the window
`discardWindowOpen` lets a Timebomb be armed in. Two places therefore have to know it:

- `handleTapCard` in `roundReducer.ts` checks `timebombArmed(state)` **before** the `canAct` guard,
  mirroring the `discardSelecting` special case immediately above it. Legality is deliberately not
  checked on that path: priming is not a move, and marking a card you are not allowed to play is the
  whole point of the card.
- `handInteractive` in `WarCouncilRound.tsx` is `interactive || discardSelecting(ui) ||
  timebombArmed(ui)`. Without the third term every hand card rendered `disabled` and untabbable
  during exactly that window, so the mark could be neither clicked nor tabbed to.

**A tap on an already-primed card is a no-op that keeps the mode open** (`primeTapped`). It used to
clear `timebombArmedDamage` on that guard, abandoning a paid-for card with no mark to show for it.
The not-in-hand guard keeps its old clear-and-abandon behaviour, being unreachable from the fan.

## `TimebombMark` — inline SVG, deliberately not `<symbol>` + `<use>`

`TimebombMark.tsx` draws the DLR-147-approved cartoon bomb as **inline shapes**. That is the
opposite of the rule `#wc-skull` follows, and the reason is load-bearing rather than stylistic:
`<use>` clones its content into a shadow tree, which the fizz class cannot reach from the light DOM
— the spark would sit dead and out of `prefers-reduced-motion`'s reach.

- **Its two radial-gradient ids are minted per instance from `useId()`.** The mockup hard-codes
  `id="bombBody"`/`id="sparkGlow"`, and two marks on screen at once — a primed card in hand and the
  same card in the trick well — would collide on a literal id.
- **It is `aria-hidden` and `pointer-events: none`.** The primed fact and the fuse clause reach
  assistive tech through `cardAccessibleName`, not through this decoration; an overhanging
  decoration must never steal a tap from the card beneath it.
- **The numeral is a real text node**, not a CSS `content`, so it survives a screenshot.
- **It uses no effect, listener, timer or `requestAnimationFrame`.** The fizz is a CSS animation the
  browser tears down with the element, and the fuse lives in reducer state rather than a timer — so
  it cannot tick while the tree is unmounted and cannot double-tick under StrictMode.

### It hangs on the wrapper, and that is what makes one placement serve every render path

`PlayingCard` renders `{primed && <TimebombMark …/>}` as a sibling of its `<button class="wc-card">`
inside `.wc-card-tip-host` — the `<span>` `CardAbilityTip` already wraps *every* card with, already
`position: relative`. Being outside `.wc-card`'s clipped, contained box is what lets the mark
overhang the corner; being on the wrapper every render path already goes through — hand, trick well,
ability prompt, decree pile — is what makes one definition serve all of them.

**The on-face geometry was deleted, not repointed.** `CARD_FACE_GEOMETRY.primedMark`, the four
`--wc-face-primed-*` custom properties, the `.wc-card .wc-primed-mark` rule, that entry in
`printedRects` and the four drift rows in `cardFaceCss.test.ts` all went together. A mark hanging
off the corner has no printed-on-the-face rectangle, and `cardFaceCss.test.ts` is a machine for
proving such rectangles honest — keeping a declared one would have had the spec certify a false
claim. The class was renamed `.wc-primed-mark` → `.wc-timebomb-mark` in the same pass. The cost is
real and accepted: nothing pins the bomb's box any more, by design.

**A known count only.** `fuseRemaining` is optional and **undefaulted** on both
`PlayingCardProps` and `TimebombMarkProps`, and the numeral renders only when the value is defined
and positive. `0` and `undefined` render identically, because the render layer cannot tell "the
fuse really is spent" from "this call site never learned the real count" apart — and fabricating a
`0` for the latter reads as *detonating now* on a card that may have two tricks left. `HandFan`
threads the true count; `AbilityPrompt` and `DecreePile` (via `FeltRail`) legitimately do not know
it and omit the prop.

## The fuse — a count, seeded at the prime, decremented at each resolution, booked at zero

`TIMEBOMB_FUSE_TRICKS = 2` lives in `src/hunt/buffCatalog.ts`, beside `CHEAT_DURATION_TRICKS` and
`TIMEBOMB_DAMAGE` — the two constants it sits beside conceptually — rather than in `config.ts`,
which stood at 388 of its 400 lines and could not take a documented key. It is the **developer's own
stated figure**, not an invented tunable.

`RoundUiState.timebombFuseRemaining` is a **count, not a stage**, following
`cheatTricksRemaining`'s precedent exactly: the fuse length is a config key and a boolean could only
ever express one. `primeTapped` seeds it; `commit` in `commitHandlers.ts` decrements it beside
Cheat's own decrement, in the one place a resolved trick is already known; `Math.max(0, …)` floors
it, so it is integer-only and cannot reach a rendered numeral as a negative, a fraction or `NaN`.

Two properties of the count are worth stating precisely:

- **It counts trick resolutions, not player turns.** Every successful commit completes a resolution
  within the same call — either the play is the follow, or it is the lead and the Quarry's automatic
  follow resolves it a few lines further down — so one decrement per commit is one per resolution.
- **It only counts while the primed card is still in the player's hand.** `primedStillHeld` tests
  membership of the post-play hand. A card played into this trick has left the hand, so its fuse
  stops rather than ticking to a detonation the player already avoided — and a card the Woodcutter
  buries or the Fox exchanges away zeroes the fuse instead of detonating.

### At zero the bomb is *booked*, never applied

`fuseExpired` hands `queueTimebomb(encounter, DuelSide.Player, timebombDamage)` — the **identical**
booking a played bomb makes — rather than calling `applyDamage`. This is the single most
consequential choice in the fuse's implementation, and everything it buys is inherited rather than
restated: the bank-and-multiplier reset, the Blast Guard's absorption **and its spend**, the zero
floor, and the forced cash-out. Restating those four rules a second time is exactly the duplication
`duelHealthBars.ts` is this codebase's standing cautionary case for.

It uses the **player** side of the primed card's own tier pair (`queueTimebomb` indexes
`damage[target]`, so `DuelSide.Player` selects 2 / 4 / 6) — the same figure as eating your own bomb
by winning a marked trick. `buffCatalog.ts` records that the player figure is deliberately the
smaller of the two *because* it also forces the streak's cash-out, which the booking preserves.

The price is one extra trick of real-world delay: the fuse expires at trick N+1's resolution and the
hit lands at N+2's. That is consistent — every Timebomb has a one-trick fuse from the moment it is
triggered, however it was triggered — but it means "two tricks to play it" is really "two tricks,
then it goes off, then a beat before you feel it". **Whether the hit should instead be immediate is
the developer's, and it is the one change here that would need those four rules written twice.**
So is **whether the Blast Guard should absorb an in-hand pop** — it does, inherited from the shared
path, not chosen.

`liftExpiredMarks` lifts the mark in the same transition, so the same card cannot detonate twice.

## The Timebomb's three lifetime exits — the subtlest part of the ticket

`RoundUiState.timebombBuff` persists the armed or primed Timebomb's `Buff` **outside**
`buffActivation.activatedThisTrick` and `spentThisTrick`. It has to: `openBuffWindow` clears both of
those lists at **every** trick resolution, while a Timebomb now outlives one trick by design.
Deriving the riding row — or `Escape`'s target — from either list made the row and its remove control
vanish the moment a second trick resolved with the card still held.

Having made the buff outlive the trick, **all three of its exits must clear it**:

1. **Removal** — `removeRidingTimebomb` (below).
2. **In-hand fuse expiry** — `fuseExpired`.
3. **The primed card being played and detonating normally** —
   `resolvedTrick.resolution.timebombTarget !== null`, checked across **both** of `commit`'s
   resolution branches (the player's own follow, and the marked lead resolved only by the Quarry's
   automatic follow).

The third is the one that was missed, and it cost a second review round. Without it `timebombLive`
stayed true forever — blocking every later Timebomb for the rest of the hand — and a spent
single-use buff could be resurrected into the pile by a later removal. `liftDetonatedMark` lifts its
mark from the trick's own played cards rather than from the hand, because by then the card has left
the hand; both lift helpers live in `timebombMarks.ts`, split out of `commitHandlers.ts` for the
400-line budget, the same reason `quarryAdvance.ts` and `discardHandlers.ts` were.

## One Timebomb at a time — a refusal, not a block at the prime

`BuffActivationRefusal.TimebombLive` (`src/hunt/buffActivation.ts`) refuses the **spend** while one
Timebomb is armed or primed, rather than allowing the spend and blocking the prime — which would
strand a just-paid-for card, the exact failure the `Escape` criterion exists to prevent.

- The predicate is the app layer's `timebombLive(state)` in `roundUiState.ts`:
  `timebombArmed(state) || state.round.primedCards.length > 0`. It enters the pure rule the way
  `windowOpen` already does, through `buffActivationStock` — the one place a felt fact becomes a
  `BuffActivationStock` — and is applied only to a Timebomb (`buff.kind === BuffKind.Timebomb &&
  timebombLive`).
- It is threaded from `buffHandlers.ts`'s `handleTapBuff` into `activateFromPile`, so
  `activateBuff`'s throw-guard reads the felt's real fact rather than a defaulted `false`.
- Order is `NoEffectYet → WindowClosed → TimebombLive → AlreadyActive → InsufficientAp`: a
  felt-wide reason still wins, and R2's reason wins over a per-card one.
- It is a **distinct member rather than a reuse of `AlreadyActive`**, which means "this same card,
  twice in one trick" — false of a *different* Timebomb blocked by state from an earlier trick.
  Cheap, because nothing `switch`es over the union; the only exhaustive construct is
  `BUFF_ACTIVATION_REFUSAL_MESSAGE` in `buffLabels.ts`.

Because the refusal is the same value the gallery row already renders, the row goes visibly
unavailable with its reason on its face, and no second gate was written.

## Taking a riding Timebomb back — the first revocable Activated card

`REVOCABLE_CONDITION_KINDS` is renamed `REVOCABLE_BUFF_KINDS` and gains `BuffKind.Timebomb`. It is
no longer condition-only, and the widening is valid **only because `AP_ENABLED` is false**: with
points off, the whole of a revocation is the card returning to the pile. Cheat, Ward and Shield stay
out.

**The pure module returns the card; the app layer reverses the felt.** `src/hunt/` cannot reach
`timebombArmedDamage`, `primedTimebombDamage`, `timebombFuseRemaining` or `round.primedCards`, and
must not learn to — so `handleRemoveBuff`'s Timebomb branch does it, clearing all four plus
`timebombBuff`. That branch calls `removeRidingTimebomb`, which returns the card to the pile
directly rather than through `deactivateFromPile`: once a trick boundary has passed the buff's id is
no longer in `activatedThisTrick`, and that function throws on exactly that membership check. It
also clears any stale trick-scoped membership, so a fresh re-arm afterwards is never refused
`AlreadyActive` for a card that no longer exists.

`unprimeCard` is `primeCard`'s mirror in `src/warCouncil/timebomb.ts` and **throws** on a card that
is not primed, the same discipline `primeCard` sets — a silent no-op would let a caller believe a
mark was lifted that was never there. **Every call site guards with `isPrimed` first**, because a
reducer must not throw during an event handler.

**`Escape` and the riding row's remove control reach the same function.** `handleCancel` in
`WarCouncilRound.tsx` calls `buffRide.handleRemoveBuff` **itself**, not a raw `RemoveBuff` dispatch:
that hook is the only place `removedAnnouncement` is set, so dispatching the action directly
reversed the felt but announced nothing to a screen reader. Two reversals is how two reversals
drift apart.

## The riding row, and what it says

`RidingBuffRow` gains `timebomb: TimebombRide | null`, non-null on a Timebomb row only, carrying the
derived `target` and the mirrored `fuseRemaining`. `buffRideModel.ts` builds the Timebomb row from
`state.timebombBuff` directly and filters Timebombs out of the ordinary rows, so the row survives
the trick boundary that clears `activatedThisTrick`. `buffRideLabels.ts` words all four states —
not yet primed, one trick left, *n* tricks left, and a `fuseRemaining <= 0` branch for a card whose
fuse was spent by a route other than counting down in hand (the Fox exchange) so the row cannot read
"0 tricks left". `timebombRemoveLabel` and `timebombRemovedText` name the card being taken back;
`buffRideProps.ts`'s `handleRemoveBuff` calls the latter instead of the generic reach-based
sentence.

The countdown rides on the **mark**, not in the riding list, and that placement is forced rather
than chosen: `openBuffWindow` clears `activatedThisTrick` at every trick resolution, which is
exactly the moment the countdown starts mattering. `CardAbilityTip` gains a fuse line
(`.wc-card-tip-fuse`) for a primed card, and `cardAccessibleName` folds the same clause into the
card's name so the numeral reaches assistive tech without a second live region.

## One extraction paid for the space

`WarCouncilRound.tsx` stood at 399 of its 400-line budget. Its two dev-only `window.__DEBUG_STATE__`
mirror effects moved **verbatim** into `useDebugRoundState.ts` — a self-contained block with no
coupling to the render tree, including the deliberate two-effect split `debugState.ts`'s docblock
explains. No behaviour changed and no effect was added. The file finished at 397.

## What a browser has to judge, and what tests cannot

- **A card that is both skulled and primed, now with a numeral on it too**, at real scale.
- **The countdown's legibility.** The bomb is 46% of a card whose width is
  `clamp(2.9rem, 6.2vmin, 4.3rem)`, so at the small end the numeral shares a roughly 21px disc with
  the fuse and the spark. It may need to move beside the bomb rather than onto it.
- **The priming mode's tint and drift** — no approved reference exists for the hand *while waiting*;
  this is a fresh design call.
- **No page or horizontal scroll** at 1440×900, 1280×720 and a ~430px touch viewport.
