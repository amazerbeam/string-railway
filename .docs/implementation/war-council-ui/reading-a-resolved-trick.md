Part of [War Council UI](README.md).

**DLR-160** — what the screen says about a trick once it has resolved: which of the four outcomes it
was and why, which cards carried a skull, which decree was in force, which armed buffs paid nothing,
and whether applying the pot would end the fight. The panel these facts appear on is
[the resolution screen](the-resolution-screen.md); this page is about the facts themselves, because
**two surfaces state them** — the trick well on the felt as the cards land, and the panel a beat
later — and the whole point of the ticket is that neither surface words them itself.

The rules behind them are `../../game_rules/the-hunt.md` §7 (the four outcomes) and §4 (what a buff
needed). Nothing here decides anything; every module below crosses facts the engine already settled.

## The four outcomes — `resolutionOutcome.ts`

The defect this fixes: the felt said **"You take the trick"** and the panel said **"You took it"**.
Both are true on the mechanical axis and both mislead on a skull trick, where taking the cards is the
bad outcome. A play session read "You take the trick", saw health drop, and could not tell why.

`trickOutcomeKindFor(playerTook, skullTrick)` is the whole of it — a two-by-two cross of two facts
the engine already decided, returning one of `TrickOutcomeKind`'s four members:

|                               | Clean trick | Skull trick   |
| ----------------------------- | ----------- | ------------- |
| **The player took the cards** | `CleanWin`  | `AteTheSkull` |
| **The Quarry took them**      | `CleanLoss` | `Dodge`       |

`playerTook` is `winner === PlayerSide.Player` — **the mechanical axis, before the skull inverts what
it is worth**, which is the same axis `BuffTrickContext.playerWon` means and the same one every buff
condition reads. Nothing here consults damage, the streak or the pot: the outcome word is a _name_
for what happened, and the arithmetic that follows from it is `resolutionBeats.ts`'s job.

Two `Record`s carry the copy, and both are **placeholders the developer has not chosen**:
`TRICK_OUTCOME_WORD` (`Clean win` / `Dodge` / `Clean loss` / `Ate the skull` — `the-hunt.md` §7's own
terms) and `TRICK_OUTCOME_WHY`, the one-line cause, which is the half the session found missing:
_"they took it, and it carried a skull — so it banks, and costs you nothing"_.

The module lives under `src/app/warCouncil/` rather than in the pure core for the same reason
`resolutionBeats.ts` does: **it produces user-facing words, and the engine holds no copy.** It is
still React-free, DOM-free and clock-free, and `resolutionOutcome.test.ts` asserts all four crossings
plus both copy tables directly, with no renderer.

### One module, two surfaces — the convention this ticket establishes

`resolutionOutcome.ts` is **the single source of the four-outcome vocabulary, and neither surface may
word an outcome itself.**

- **The trick well** (`TrickWell.tsx`, resolved branch) renders `TRICK_OUTCOME_WORD` as its own
  headline line (`.wc-well-outcome`) and `TRICK_OUTCOME_WHY` in place of the old winner sentence,
  keeping the damage and Timebomb clauses that followed it. It reads the skull fact from a new
  optional `skulledInTrick` prop, defaulted to `[]` like its `skulledCards` and `primedCards`
  siblings, so a caller predating the prop still compiles and simply narrates a clean trick.
- **The resolution panel** (`TrickResolutionScreen.tsx`) renders the same two strings as
  `.wc-resolve-outcome` and `.wc-resolve-outcome-why`, where `.wc-resolve-verdict` used to print
  "You took it" / "They took it". The class was renamed with the meaning.

Because the felt states it during `--wc-trick-dwell` and the panel states it after, **the same trick
is worded twice in a row** — deliberately, on the developer's own red-line at the approval gate
("say 'trick won/lost' and a reason why"), and the shared module is what stops the two saying
different things.

### Which cards in _this_ trick carry a skull

Both surfaces need the same membership test, and the round's `skulledCards` list covers the whole
deal rather than the two cards in front of the player. Each surface is handed the filtered list
rather than filtering it itself:

- `roundControlsProps.ts`'s `feltStageProps` filters `ui.resolvedTrick.cards` through the shared
  `isSkulled` predicate and passes the result to `TrickWell` as `skulledInTrick`.
- `commitHandlers.ts`'s `resolutionViewFor` does the identical filter into
  `ResolutionView.skulledInTrick`, at the hand-off.

`TrickResolutionScreen` then marks the individual card with `PlayingCard`'s existing `skulled` prop,
matched by `sameCard` — the same identity comparison `cardPlacement.ts` and `useTableCardMotion`
use — so the skull appears on the card face on the panel as well as being named in the outcome line.

## The decree, on the panel — AC7

`ResolutionView.decree` is `state.round.decree` captured at the hand-off, rendered in the panel's
header as a `SuitMark` glyph plus the suit word (`SUIT_NAME`), never the glyph alone. It is a
readout, not a rule: the decree was always on the felt, and the felt is now behind the panel rather
than replaced by it — but the panel is what the player is reading while deciding whether to roll the
pot over, and the trick they are deciding about was won under that trump.

## Armed and did not fire — `resolutionDeadBuffs.ts`

The false bug report this exists to answer: a **Key-Feeder** — pay when a trick with a Key in it is
lost — was armed, the player _won_ the trick, so it correctly paid nothing, and **nothing on screen
said so.** The player reported a broken buff.

`deadBuffsFor(armedIds, firedIds, candidates)` is a set difference and nothing else: every id in
`buffActivation.activatedThisTrick` that is not in `resolution.firedBuffIds`, resolved to a `Buff`
against the same `offeredBuffs + spentThisTrick` union the paying beats resolve against. **An id with
no match is dropped rather than rendered as `undefined`** — the same rule `resolveFired` in
`resolutionBeats.ts` and `buffFiredLabels.ts` already apply.

**The reason is composed, never authored.** `deadBuffReasonText(buff)` is the buff's name plus
`needed: ` and its existing `buffConditionSentence` from `buffLabels.ts`. Writing a second table of
per-family miss reasons would be a second reading of `buffFires`, and it would drift from
`src/hunt/buffEvaluation.ts`'s total switch the first time a family's condition moved — the discipline
`buffProjection.ts`'s docblock sets out, and the same argument `resolutionBeats.ts` makes for running
no rule of its own.

`ResolutionBreakdown.tsx` renders them: the unchanged `ResolutionLedger` for what fired, then, **only
when the list is non-empty**, a `<ul aria-label="Armed and did not fire this trick">` of struck-through
(`<s>`) rows each captioned `did not fire` rather than a figure. Dead-ness is carried by strikethrough,
by opacity and by that caption — three signals, none of them colour — so the rows read as dead in a
greyscale screenshot. An empty list renders nothing at all: a panel that reports "nothing dead" every
trick is furniture.

The component exists because `TrickResolutionScreen.tsx` was already at 195 lines before this
ticket's outcome line, decree mark, skull marking, dead list and lethal tag; the breakdown is the
seam that kept it under budget.

**One judgement was deliberately not made.** Three armed buffs with one firing gives two
struck-through rows in a panel DLR-160 also made smaller, at a viewport where an overflow is already
recorded. Whether that needs a cap, a scroll region or a collapsed count is a layout call against the
real panel — flagged in the stylesheet, not invented in the ticket.

## Would this pot end the fight? — `resolutionLethal.ts`

`potIsLethal(encounter, pot)` composes **the same two calls `applyPotAction` makes** when the player
actually presses Apply — `isEncounterResolved(applyDamage(encounter, incomingFromPot(pot)))` — so the
Quarry's shields and the zero floor are _inherited_ rather than restated. The cautionary case is
`duelHealthBars.ts`'s `projectedDepletion`, which carried its own absorption arithmetic and lied
until DLR-115.

**Which encounter it is asked about is load-bearing.** `resolutionViewFor` is passed the encounter
**after this trick's own damage was folded in** (`folded?.encounter ?? state.encounter`), never
`state.encounter`: a skull's health loss or a Timebomb detonation has already landed by then, and
only the pot has not.

`TrickResolutionScreen` renders the fact as a word inside the Apply control — `Lethal · ends the
fight` — and folds it into that button's `aria-label`, so a screen-reader user hears it in the
control's name rather than beside it. The colour reinforces; the word carries it.

### A crash this found, and a residual it did not fix

**Fixed:** `applyDamage` throws deliberately on an already-resolved encounter, and the encounter
handed in here is _routinely_ already resolved by the trick's own damage. The first version called it
unguarded and crashed sixteen simulator tests through the production `commit()` path. `potIsLethal`
now asks `isEncounterResolved` first and answers `true` — a finished fight cannot be un-ended by
applying more pot — with the boundary pinned by `resolutionLethal.test.ts`.

**Not fixed, and deliberately so.** That early `true` is returned for _any_ resolved encounter,
**including one resolved in the Quarry's favour — the player already dead.** That state is reachable:
Timebomb damage can take the player to zero on a trick they physically won, which also banks a pot.
The Apply control then reads "Lethal · ends the fight" as though the pot were about to kill the
Quarry, when the fight has already ended the other way. **Pressing it is safe** — `applyPotAction`
no-ops on a resolved encounter — so this is misleading copy, not a crash. It was raised in review and
routed to the developer, because the two ways out are a design reading: branch on which side the
encounter resolved in favour of, or suppress the apply-or-roll choice entirely once it is resolved
against the player, folding it into the existing no-choice branch. It is recorded in
`../../game_rules/the-hunt.md`'s Known tensions.

## What is placeholder here

Everything a player reads on this page is copy or colour nobody has chosen: both
`TRICK_OUTCOME_WORD` and `TRICK_OUTCOME_WHY`, the `needed:` grammar of a dead row, its `did not fire`
caption, and the lethal marking's wording and its colour. All of it ships as a documented placeholder
and all of it is a one-table edit away from the developer's own words.

## What the tests pin, and what a browser would have checked

`resolutionOutcome.test.ts`, `resolutionDeadBuffs.test.ts` and `resolutionLethal.test.ts` cover the
three pure modules exhaustively — all four crossings, the dropped-id rule, the set difference, the
shielded and already-resolved encounters. `TrickWell.test.tsx` pins the well's own outcome word on a
resolved trick, and `TrickResolutionScreen.test.tsx` pins the panel's, plus the dead row's caption
and the lethal tag. Neither spec has to assert that the two surfaces agree, because neither surface
composes the words: both read the same two `Record`s.

A browser would still have to answer whether _Ate the skull_ reads well on a panel at real size,
whether the doubled statement (felt, then panel) reads as reinforcement or as repetition, and whether
two struck-through rows fit the panel at 640px of viewport height.
