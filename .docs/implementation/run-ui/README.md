# Run verdict UI — `src/app/run/`

**Status:** implemented
**Built by:** DLR-82

## Responsibility

The full-viewport screen shown whenever a fight or the run resolves: a headline, a supporting line,
the deciding hand's trick split as a bar row, the carried health, the run position, and **exactly
one** forward control. It also owns every user-visible string the run layer produces, including the
"Fight 2 of 3" readout the card layer renders in its status band.

It exists because of a play session. The terminal state before DLR-82 was a `<p role="status">`
sentence inside a tally table on the felt, with no control on it — visually near-identical to the
ordinary between-hands panel. The developer's note was that *"the player didn't know when she beat
the opponent or lose"*. The fix taken is a change of **channel** — a distinct full-screen surface
with a headline — rather than a change of wording, because rewording a sentence in the same place
would not fix "did not notice it".

This module **computes nothing**. Every figure and every branch arrives as a prop from `App.tsx`.

## Key types & exports

| Export                                                    | Purpose                                                                                                                                                                              | File           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `RunOutcomePanel` (default)                               | The verdict surface. Three distinguishable states; renders what it is handed                                                                                                          | `RunOutcomePanel.tsx` |
| `TrickTally`                                              | `{ taken: number; lost: number }` — the deciding hand's trick split, as two counts                                                                                                    | `RunOutcomePanel.tsx` |
| `runProgressText(index, count)`                           | 0-based index in, 1-based fight number out: `(0, 3)` → `'Fight 1 of 3'`. Read by `App.tsx` for the status band and by the panel for its own position line                             | `runLabels.ts` |
| `runHeadline(outcome)`                                    | `FIGHT WON` / `YOU WIN` / `YOU LOSE`. An exhaustive `switch`, not a `Record` — a `Record` would need an unreachable entry to stay total                                                | `runLabels.ts` |
| `runVerdictDetail(outcome, index, count, carried)`        | The supporting line: where the run stands, and what health is carried into the next fight                                                                                            | `runLabels.ts` |
| `tricksTakenText(taken, lost)`                            | The bar row's accessible name — states both figures, so the split never depends on colour                                                                                            | `runLabels.ts` |
| `TRICKS_TAKEN_LABEL`, `CARRIED_HEALTH_LABEL`, `NEXT_FIGHT_LABEL`, `NEW_RUN_LABEL` | The four fixed strings. **All placeholder copy — the developer's to rewrite**                                                                 | `runLabels.ts` |

## How it works

### Three verdicts, told apart without colour

The panel renders one of three states, and `game-ux`'s hard floor is that a greyscale screenshot
must still distinguish them. Four things differ, not just the hue:

| State                     | Headline    | Rule above it        | Control            |
| ------------------------- | ----------- | -------------------- | ------------------ |
| Fight won, more to come   | `FIGHT WON` | single 2px rule      | `Next fight`       |
| Run won                   | `YOU WIN`   | **double** rule      | `Start a new run`  |
| Run lost                  | `YOU LOSE`  | **hatched** rule     | `Start a new run`  |

The supporting line differs in all three too. Colour is carried by a `data-verdict` attribute on
`.run-verdict` rather than by a class per state, so the CSS selects on one attribute.

**`canContinue` decides which control is offered, and it is a prop.** `App.tsx` computes it from
`canAdvanceRun` and hands it down, so the panel cannot disagree with the run module about whether
the run is over. The panel's only internal derivation is `const verdict = canContinue ? 'fightWon'
: outcome` — the fourth display case the three-value `RunOutcome` union does not carry, because
"fight won with another waiting" is `InProgress` with the Quarry down.

### The trick bars are grouped, not chronological — because the data does not exist

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

### The copy names no Quarry, deliberately

Every string is generic — `FIGHT WON`, not `Aoife defeated`. At DLR-82 `SLICE_QUARRY_CHARACTER`
names **one** character for the whole run and `QUARRY_CHARACTERS` holds one of five entries, so a
name here would print identically on every fight, and `quarryCharacterInfo` returns `undefined` for
the other four — name-based copy would need a fallback exercised the moment the roster grows.

**DLR-85 owns the roster and must rename this file's copy in the same change that lands it.** That
ticket's description carries a note naming `RunOutcomePanel.tsx`, `runLabels.ts` (`runHeadline`,
`NEXT_FIGHT_LABEL`) and the `runLabel` band readout as the surfaces it must update in step, so the
map and the verdict cannot ship one named and one anonymous.

### The shell

`run.css` is the module's own full-viewport shell: `100dvh` and `width: 100%` — **never `100vh` or
`100vw`**, per `game-ux` — with `overflow: hidden`, safe-area insets on the vertical padding, and
`clamp()` sizing throughout. It declares **no new custom properties**, reusing the `--wc-*` tokens
`warCouncil.css` already puts on `:root`, because every colour and every `clamp()` bound here is a
tuning value the developer owns. Controls are `min-height: 44px` / `min-width: 44px` with
`:focus-visible` outlines and `@media (hover: hover)`-guarded hover.

## Rules & invariants enforced

- **The panel computes nothing.** `outcome`, `canContinue`, `carriedHealth`, `encounterIndex`,
  `encounterCount` and `tricks` are all props; the only local expressions are the `verdict`
  attribute string and the bar array built from two counts.
- **No effect, no timer, no listener** — the two controls are plain `onClick` handlers.
- **All copy lives in `runLabels.ts`**, never inline in the component, matching
  `warCouncil/labels.ts`'s existing convention.
- **No `100vh` / `100vw`** anywhere in `run.css`; a final-verification grep guards it.
- Component tests query by **accessible role and label** (`getByRole('button', { name })`,
  `getByRole('group', { name: /tricks taken/i })`), per this project's testing posture.
- File sizes: `RunOutcomePanel.tsx` 109, `run.css` 155, `runLabels.ts` 59 — all far under the
  400-line budget.

## Deferred / not yet implemented

- **The trick bars are not in play order** — the engine keeps no per-trick history. See above.
- **The bars show the deciding hand only**, not the whole fight; no per-fight trick accumulator
  exists.
- **The felt's hand tally does not carry onto the verdict.** DLR-82 deleted the terminal panel that
  showed health lost and health dealt; only the trick split moved across. If those two figures are
  wanted here they join `TrickTally` — flagged in the contract as the developer's call.
- **All copy is placeholder**, and the headline's `clamp()` bounds and the `--wc-poison` /
  `--wc-alarm` hues on the bars are unchosen tuning values.
- **Whether a full surface beats an overlay** over the frozen felt is a feel question the contract
  answered one way (full surface, because the observation was "she did not notice") and left open to
  revision.
- **No animation or transition** into the verdict — it replaces the felt immediately.
