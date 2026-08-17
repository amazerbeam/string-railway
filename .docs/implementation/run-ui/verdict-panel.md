Part of [Run verdict UI](README.md).

# The verdict panel — three outcomes, two forward controls, and the unspent-coin warning

`RunOutcomePanel.tsx` is the full-viewport surface shown whenever a fight or the run resolves. It
computes nothing: every figure and every branch arrives as a prop from `App.tsx`.

## Three verdicts, told apart without colour

The panel renders one of three states, and `game-ux`'s hard floor is that a greyscale screenshot
must still distinguish them. Four things differ, not just the hue:

| State                     | Headline    | Rule above it        | Controls                        |
| ------------------------- | ----------- | -------------------- | ------------------------------- |
| Fight won, more to come   | `FIGHT WON` | single 2px rule      | `Continue` **and** `Shop`       |
| Run won                   | `YOU WIN`   | **double** rule      | `Start a new run`               |
| Run lost                  | `YOU LOSE`  | **hatched** rule     | `Start a new run`               |

The supporting line differs in all three too. Colour is carried by a `data-verdict` attribute on
`.run-verdict` rather than by a class per state, so the CSS selects on one attribute.

**`canContinue` decides which control is offered, and it is a prop.** `App.tsx` computes it from
`canAdvanceRun` and hands it down, so the panel cannot disagree with the run module about whether
the run is over. The panel's only internal derivation is `const verdict = canContinue ? 'fightWon'
: outcome` — the fourth display case the three-value `RunOutcome` union does not carry, because
"fight won with another waiting" is `InProgress` with the Quarry down.

## Two forward controls, and the shop is opt-in

**DLR-84 replaced the single `Next fight` control with a `Continue` / `Shop` pair**, on the
developer's ruling at that contract's planning gate. The first draft of the plan had put the shop on
the path as a mandatory step between fights; the ruling was that it should be a screen the player
chooses to enter.

- **`Shop` opens the shop unconditionally.** A player is always allowed to go and look — the shop's
  own refusal sentences explain anything they cannot afford once they are there.
- **`Continue` is the guarded one.** The driver asks `canBuyAnything(shopStockFor(run))`, and if at
  least one item is purchasable *right now* it moves to a warned state rather than advancing.

`NEXT_FIGHT_LABEL` was **re-sited rather than renamed** — same value, same type, but its consumer
moved from this panel to the shop's own leave button, where "Next fight" is literally what the
control does. The verdict took the new `CONTINUE_LABEL` / `SHOP_LABEL` pair instead, which was
cheaper than renaming a constant across nine hits for no change in meaning.

The `onNextFight` prop **was** renamed, to `onContinue`, because its meaning genuinely changed: the
control no longer starts a fight on its own. Pressed on an unwarned verdict it may raise the warning
instead; pressed on a warned one it advances.

## The warning is an in-place swap, not a modal

When `warning` is true the two forward controls are replaced, in place, by a sentence naming the
balance plus `Visit the shop` / `Continue anyway`:

```tsx
<div className="run-warning" onKeyDown={(e) => { if (e.key === 'Escape') onDismissWarning() }}>
  <p className="run-warning-text" role="status">{unspentCoinsText(coins)}</p>
  …
</div>
```

**Being a swap rather than a modal is the design decision, and it is what removes the cleanup
problem entirely.** A modal would need a focus trap, a document-level key listener, and a teardown
for both. An in-place swap needs none: the `Escape` handler is an `onKeyDown` on the element React
already owns, torn down with it. There is no effect, no listener, no timer and no
`requestAnimationFrame` anywhere in this module.

**The panel does not decide whether to warn.** `warning` is a prop; `canBuyAnything` decides, in
`App.tsx`. That keeps the same discipline as `canContinue` — the panel branches on rules, it never
states them.

`Escape` dismisses back to the plain verdict rather than continuing or shopping. That is the
conservative reading of a dismissal — it takes no action on the player's behalf — and it is flagged
as the developer's to overturn.

### Why affordability, not a balance

The warning fires on `canBuyAnything`, which is `some()` over `refusalFor` — the same predicate the
shop's own buttons grey on. So the warning cannot claim there is something to buy while every
purchase card on the shop screen is disabled. A player holding a coin with both slots full and full
health has nothing to stop for, and a warning they could not act on is noise.

**It will fire on nearly every visit at current prices**, though: a 1-coin payout against 1-coin
items means anything unspent is affordable. Whether that reads as a safety net or as a nag is a
play-session question, and removing it or putting it behind a threshold is one line in `App.tsx`.

## The trick bars are grouped, not chronological — because the data does not exist

The row draws one bar per trick of the **deciding hand**: `taken` solid bars, then `lost` hatched
ones. It is not in play order, and it cannot be: `WarCouncilState.tricksWon` is a `Record` of two
numbers and the engine keeps **no per-trick winner history**. Rendering them chronologically means
adding a history array to `src/warCouncil/`, which DLR-82's AC7 put out of bounds — a clean
follow-up if the order turns out to matter.

They are the *deciding hand's* tricks rather than the whole fight's for the same reason: nothing
accumulates tricks across the several hands a fight takes, so the last hand's figures are the only
ones that exist.

A lost bar is **hatched and outlined as well as red**, and the row carries a text count
(`Tricks taken · 4 of 6`) plus an accessible name via `tricksTakenText`. Red-versus-green alone
fails the no-colour-only rule; three channels is what satisfies it.

## The copy names no Quarry, deliberately

Every string is generic — `FIGHT WON`, not `Aoife defeated`. `SLICE_QUARRY_CHARACTER` names **one**
character for the whole run and `QUARRY_CHARACTERS` holds one of five entries, so a name here would
print identically on every fight, and `quarryCharacterInfo` returns `undefined` for the other four —
name-based copy would need a fallback exercised the moment the roster grows.

**DLR-85 owns the roster and must rename this file's copy in the same change that lands it.** That
ticket's description carries a note naming `RunOutcomePanel.tsx`, `runLabels.ts` (`runHeadline`,
`NEXT_FIGHT_LABEL`) and the `runLabel` band readout as the surfaces it must update in step, so the
map and the verdict cannot ship one named and one anonymous. **The shop screen joins that list** —
it prints the opponent's name through `nextOpponentText`, which already handles `undefined`.

## The shell

`run.css` is the module's full-viewport shell: `100dvh` and `width: 100%` — **never `100vh` or
`100vw`**, per `game-ux` — with `overflow: hidden`, safe-area insets on the vertical padding, and
`clamp()` sizing throughout. It declares **no new custom properties**, reusing the `--wc-*` tokens
`warCouncil.css` already puts on `:root`, because every colour and every `clamp()` bound here is a
tuning value the developer owns. Controls are `min-height: 44px` / `min-width: 44px` with
`:focus-visible` outlines and `@media (hover: hover)`-guarded hover.

DLR-84 added one block to it — `.run-warning` / `.run-warning-text`, a **dashed bracket** around the
swapped controls, so a held decision reads in greyscale as well as in colour. The shop's own rules
live in a sibling sheet and reuse this one's `.run-shell` and `.run-btn` unchanged.
