Part of [Run verdict UI](README.md).

# The verdict panel — three outcomes, three forward controls, and the unspent-coin warning

`RunOutcomePanel.tsx` is the full-viewport surface shown whenever a fight or the run resolves. It
computes nothing: every figure and every branch arrives as a prop from `App.tsx`.

## Three verdicts, told apart without colour

The panel renders one of three states, and `game-ux`'s hard floor is that a greyscale screenshot
must still distinguish them. Four things differ, not just the hue:

| State                     | Headline           | Rule above it        | Controls                                       |
| ------------------------- | ------------------ | -------------------- | ---------------------------------------------- |
| Fight won, more to come   | `Aoife defeated`   | single 2px rule      | `Fight Cillian`, `Shop` **and** `Map` (DLR-85) |
| Run won                   | `YOU WIN`          | **double** rule      | `Open the Vault` **and** `Start a new run`     |
| Run lost                  | `YOU LOSE`         | **hatched** rule     | `Open the Vault` **and** `Start a new run`     |

**DLR-85 named the first row and added the third control.** The headline is
`runHeadline(outcome, beatenName)` — the opponent just beaten, which is the one at `encounterIndex`
because `recordEncounter` does not advance it. The primary control is `fightLabel(nextName)`, falling
back to `NEXT_FIGHT_LABEL` when there is no next fight. **Only the intermediate-win headline takes a
name:** `YOU WIN` and `YOU LOSE` keep DLR-82's wording, because a run-level verdict is about the run
rather than about one opponent, and the opponent is named in the supporting line instead.

The `Map` control (`onMap`) opens the run's path — the same `RunPathScreen` the start screen uses. It
sits **only on the first row**: a finished run offers no map, and a spec pins that absence. See
[the run map and the path screen](run-map-and-the-path-screen.md).

**DLR-118 gave the two terminal rows a second control, and made it the primary.** `onVault` is a
**required** prop, rendered only in the `!canContinue` branch: `Open the Vault` (`VAULT_LABEL` in
`runLabels.ts`) first, `Start a new run` beside it. The mirror of the `Map` rule holds — **there is no
Vault control while a run can still continue**, and a spec pins that absence too. Nothing in the
`canContinue` branches changed. The Vault screen sits **beside** this panel rather than replacing it,
because the verdict owns the outcome and the trick tally and the Vault screen has no business
restating either; see [the Vault screen](../vault/the-vault-screen.md).

> **The warned branch's labels were deliberately left alone.** `Visit the shop` / `Continue anyway` keep
> their DLR-84 wording rather than being renamed to name the opponent, because a DLR-84 component spec
> tells the warned verdict from the plain one **by button name** and renaming both branches risked a
> collision. AC8 is satisfied on the unwarned primary control.

The supporting line differs in all three too. Colour is carried by a `data-verdict` attribute on
`.run-verdict` rather than by a class per state, so the CSS selects on one attribute.

**`canContinue` decides which control is offered, and it is a prop.** `App.tsx` computes it from
`canAdvanceRun` and hands it down, so the panel cannot disagree with the run module about whether
the run is over. The panel's only internal derivation is `const verdict = canContinue ? 'fightWon'
: outcome` — the fourth display case the three-value `RunOutcome` union does not carry, because
"fight won with another waiting" is `InProgress` with the Quarry down.

## The reward line names what the win paid — DLR-95

Until DLR-95 a win paid one coin and the verdict never said so. The quick-kill payout made the
figure variable — a fast kill can pay several coins, a slow one none — and a coin reward a player
cannot see the reason for reads as arbitrary. So the panel gained one `<p className="run-reward"
role="status">` above the existing `.run-carry` line:

```
Fight won +1 coin · Quick kill +10 coins
```

Four decisions are worth keeping:

- **Two clauses, not one figure.** The flat coin and the quick kill are named separately, so a quick
  kill never reads as the flat coin having grown. That the two are additive at all is a developer
  decision from 2026-08-20 — see [../hunt/quick-kill-payout.md](../hunt/quick-kill-payout.md).
- **The quick-kill clause is omitted entirely at zero**, rather than shown as `+0 coins`. That is the
  design's taper read as copy: a slow fight's verdict does not advertise a mechanic that paid it
  nothing.
- **It is gated on the outcome, not on `canContinue`.** The line renders on any non-lost verdict,
  because the **final fight of a won run pays a quick kill too** and `canContinue` is false there. A
  lost run shows no reward line at all, and a spec pins that absence.
- **The panel still computes nothing.** Both figures arrive as props — `quickKillPayout` straight off
  `RunState.lastQuickKillPayout`, and `winCoins` **handed in rather than imported**, so the panel
  reads no configuration of its own. The wording lives in `runLabels.ts`'s `rewardText(winCoins,
  quickKillPayout)`, and the plural in a single `coinsText` helper that `unspentCoinsText` was
  re-pointed at in the same ticket, so two readouts of the same purse cannot disagree about it.

`game-ux`'s floor is met cheaply: it is one more line in a centred column that already sizes with
`clamp()`, it adds **no interactive control** and therefore no tap cost and no tab stop, and it is
distinguishable in greyscale because the words themselves differ — `.run-reward` is bracketed by a
border rather than merely tinted, following `.run-warning`'s precedent, so the tint reinforces the
state rather than carrying it.

> **The copy is placeholder**, exactly as `runLabels.ts`'s own header states all of its copy is.
> Whether the line should also name *why* — how many cards were left, which hand it was — is a
> developer call that was flagged rather than decided; the richer form costs two more `RunState`
> fields to carry the count and the hand number.

> **Adding a second `role="status"` node broke a query, not a behaviour.** A pre-existing spec used
> `getByRole('status')` to find the fight-position line; with the reward line present that match is
> ambiguous. It was switched to the `getAllByRole('status').some(...)` pattern already used elsewhere
> in the same file. Worth knowing before adding a third live region to this panel.

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

**DLR-85 then deleted `CONTINUE_LABEL` outright**, because the unwarned primary control now reads
`fightLabel(nextName)` and a constant nothing renders is debt. Ten hits across four files changed
together and a final-verification grep confirms zero remain. `NEXT_FIGHT_LABEL` survives as the
fallback for an `undefined` name — and, in the shop, is still what the leave control reads when no
opponent is known.

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

## The copy names the opponent now — DLR-85

**This section previously recorded the opposite, and DLR-85 is the change it was waiting for.** Until
then every string here was generic (`FIGHT WON`, never `Aoife defeated`), because
`SLICE_QUARRY_CHARACTER` named one character for the whole run and `QUARRY_CHARACTERS` held one of five
entries — so a name would have printed identically on every fight, and `quarryCharacterInfo` returns
`undefined` for the other four.

`RUN_ENCOUNTERS` removed that obstacle: every one of the twenty-five entries carries a name, so
`runEncounterAt(index).name` is always a real string and no fallback is exercised in production. The
naming landed across **four surfaces in one pass**, deliberately, because a named map beside an unnamed
verdict reads as two different games:

| Surface                        | Now reads                  | Via                                 |
| ------------------------------ | -------------------------- | ----------------------------------- |
| The verdict headline           | `Aoife defeated`           | `runHeadline(outcome, beatenName)`  |
| The verdict's primary control  | `Fight Cillian`            | `fightLabel(nextName)`              |
| The shop's leave control       | `Fight Cillian`            | `fightLabel(nextOpponentName)`      |
| The felt's status band         | `Fight 1 of 25 — Aoife`    | `runPositionLabel(…, currentName)`  |

`App.tsx` is the only file that reads the roster; all four surfaces receive **already-worded strings or
plain names as props**, so no component looks an opponent up for itself.

**The fight screen was left anonymous by DLR-85, and has since been half closed.** The **health bar** now
reads `Aoife’s health` — `quarryHealthLabel(name)` in `src/app/warCouncil/labels.ts`, threaded down as a
pre-worded string exactly as `runLabel` is, so the bar and the map agree. **`QuarryDossier` is the
remainder**, along with the "What the Quarry holds" heading beside it; both still name the Monarch, which
is what DLR-85's ticket scoped to a separate ticket. See the README's Deferred section.

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
