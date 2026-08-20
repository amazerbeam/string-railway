_Part of [War Council UI](README.md)._

### The Cheat slots — two frames on the felt, and a two-click arm

DLR-83 put two **Cheat slots** on the felt. The rules half is a parameter in the engine
([../war-council/legal-moves-and-abilities.md](../war-council/legal-moves-and-abilities.md)) and the
card itself is run state ([../hunt/cheats-and-slots.md](../hunt/cheats-and-slots.md)); everything
about *arming* one lives here.

#### Where they sit, and why it is not where they started

`CheatSlots.tsx` renders as the **second register of the felt-left plate**, directly beneath the
decree pile and separated from it by a hairline. `DecreePile` and `CheatSlots` are wrapped in a new
`.wc-felt-rail` column, which took over the three positioning properties `.wc-pile` used to carry
itself (`grid-column: 1`, `justify-self: start`, `align-self: center`) plus its padding — so the
trick stays centred in `.wc-table`'s middle column and the pile renders identically.

**The first draft put them at the hand zone's left edge, and the developer overruled it at the
approval gate** — _"make the cheat closer to the deck… they are too far and don't look connected"_.
The move is the better read anyway: `.wc-pile` is already a vertical stack of card-sized things under
`.wc-plate-label` captions, and a Cheat is a **table resource** like the decree rather than part of
the hand. The rail reuses `.wc-plate-label` for its `Cheats` caption rather than declaring its own,
which is half of what makes the two registers read as one plate.

The consequence worth recording: **`warCouncilHand.css` was not touched at all**, and `.wc-hand`
remains the unused rule it already was. The cost is that arming a Cheat is now a trip to the felt-left
plate and back to the fan — if that reads as a detour in play, the contract's stated fix is a second
affordance in the hand zone, **not** moving the plate back.

#### `stopPropagation` on the rail is load-bearing, not defensive

`.wc-table` carries an `onClick` that fires `handleCarryOn` whenever the felt is waiting. The slots
now mount **inside** that element, so without intervention a click on a slot would bubble into it —
and arming a Cheat while a trick reveal was being held would *also* clear the reveal and commit the
Quarry's lead as a side effect. `.wc-cheat-rail` therefore carries
`onClick={(e) => e.stopPropagation()}` on the **wrapper**, one handler rather than one per button.

React's synthetic events bubble through the component tree, so this covers the keyboard path too: an
`Enter` or `Space` on a focused slot is converted to a native `click` by the browser and follows the
same synthetic path, and is stopped at the same place. QA exercised this case deliberately in a real
browser — armed a Cheat with a reveal held, and confirmed the reveal survived.

**Do not remove this as an unnecessary guard.** It is the difference between arming a Cheat and
silently losing a trick.

#### The component decides nothing

```tsx
interface CheatSlotsProps {
  readonly cheats: readonly CheatCard[]
  readonly selection: CheatSelection | null
  readonly interactive: boolean
  readonly onTap: (id: CheatCardId) => void
  readonly onCancel: () => void
}
```

It renders exactly `CHEAT_SLOT_COUNT` frames — imported straight from `../../hunt`, following
`RoundStatusBand.tsx`'s precedent for `HAND_SIZE` rather than taking it as a prop — filled from the
head of the list. A filled slot is a `<button>` carrying `aria-pressed` for the armed stage and an
accessible name from `cheatAccessibleName(stage)`; an empty slot is a non-interactive framed `<span>`
with its own label. It computes no legality, asserts no cap, and holds no state.

`interactive` is the **same gate the hand fan uses**, so a Cheat cannot be armed into a moment where
no card could be played anyway.

Two controls is below `game-ux`'s roving-tabindex threshold of about five, so these are plain tab
stops rather than a managed focus group — a deliberate departure from the hand fan, which needs one.
`Escape` cancels, via an `onKeyDown` **React prop on the rail element**, not an `addEventListener`:
it unmounts with the node and there is nothing to release. **No `useEffect` was added anywhere in
this contract.**

#### Four states, none of them told apart by colour alone

| Class        | Frame                                            |
| ------------ | ------------------------------------------------ |
| `.is-empty`  | faint **dashed** `--wc-chalk-dim`                |
| `.is-held`   | **solid** `--wc-brass-dim`                       |
| `.is-poised` | **dashed** `--wc-brass`, small lift              |
| `.is-armed`  | **solid** `--wc-brass`, larger lift, corner notch |

Each differs in **form** as well as tone, so greyscale still separates them. No new hue was
introduced — the three tokens are the sheet's existing ones. Every slot carries
`min-width`/`min-height: 2.75rem` so the ≥44px hit target holds at the small end of the clamp, with
the padding rather than the frame doing that work: the frame is drawn at the condensed plate size
(`--wc-cheat-slot-w`, a `2/3` aspect matching `.wc-pile-back`) so the hand fan keeps visual
precedence.

**Every `clamp()` bound here, the token, and the hairline's weight and width are placeholders and the
developer's to retune.**

#### Why the rules live in a separate stylesheet

`warCouncil.css` stood at **398 lines against a 400-line blocking budget**, so it could not take a new
block. Every new rule and the new token went into **`warCouncilCheats.css`** instead, imported by
`CheatSlots.tsx` itself (as every component here imports its own sheet), and `warCouncil.css` took a
**net deletion** — down to 397 — when `.wc-pile` shed its four properties. A custom property declared
in one loaded sheet resolves the same from any other, so `--wc-cheat-slot-w` living outside
`warCouncil.css`'s `:root` costs nothing.

#### The three signals that a Cheat is armed

AC5 asks that it be *obvious* the next card played is the one the Cheat covers. Three things say so,
and the third is much the strongest:

1. The slot's own frame — solid brass, lifted, notched.
2. The hint line, which reads `Cheat armed — play any card in your hand`. `deriveHint` gained one
   case, inserted after the existing `ui.armed` case and before `quarryToLead`.
3. **The hand fan stops being grey.** `WarCouncilRound.tsx` computes its `legal` set with the bypass
   on, so every previously-forbidden card becomes enabled the instant the second click lands. QA
   confirmed all six cards flipping from disabled to enabled in a live browser.

`mockup.html` also showed a `.wc-cheat-stage` text span — a secondary `ARMED` / `TAP AGAIN` label
beside the slots — and it was **deliberately not built**: the hint line already carries that
information, and the contract's own component code omitted it. QA judged AC5 still met on screen
without it. Adding it back is a copy decision, not a defect fix.

#### The reducer half

`RoundUiState` gained the hand's live `cheats` and a **single** `cheatSelection: { id, stage } | null`
field. One discriminated field rather than two nullable ones, because two nullables admit the invalid
pair "poised **and** armed" and one does not. `cheatArmed(state)` is **exported** so the mount
computes its `legal` set from the same predicate `commit` spends with — two readings of "is the Cheat
armed" is exactly how a fan's greying and a rejection reason drift apart, and a review confirmed no
second reading exists.

`TapCheat` is four outcomes on one id: nothing selected → poised; poised on the same id → armed;
armed on the same id → nothing (the disarm); a tap on a *different* id → poises that one. It guards
`hasCheat` first, because `cheats.ts`'s transitions throw and **a reducer must not**.

`CancelCheat` clears the selection and also drops a poised hand card that the **re-narrowed** legal
set has just made illegal — otherwise the player is left holding a selection that will be rejected on
its next tap with no visible cause.

Inside `commit`, the consume is two lines: read whether the selection is armed, pass
`{ ignoreFollowSuit: true }` to `playCard`, and on success `removeCheat` that id. **A rejection
returns before the removal** — a refused play is not a commit, so the Cheat survives and stays armed
and the player can try another card without paying twice. A success consumes it **even if the card
was legal anyway**, which is AC7 read literally: a "was it needed" check would put a legality
judgement in the reducer that `legalMoves` already owns, and would make arming free.

#### How the spend reaches the run

Through the existing `encounter` round trip, not a callback — a reducer cannot call a prop.
`WarCouncilMountProps.cheats` is the opening figure, the reducer owns it for the hand's life, and
`WarCouncilRoundResult.cheats` is the final one, adopted by `App.handleComplete` via
`recordEncounter`'s required third parameter. Both are **required** members, so the compiler
enumerated every mount site rather than letting one render an empty rail.

Mid-hand the rail renders from reducer state, so a spent slot empties on screen **immediately**;
the run adopts at hand end. The remount `key` is still the monotonic hand counter, so each hand
re-seeds `cheats` from the run's current list rather than carrying the previous hand's — a spend
cannot be resurrected by a remount, nor adopted twice.

#### Testing

`__tests__/CheatSlots.test.tsx` is a `.tsx`, so it lands in the `dom` Vitest project. Six cases, all
by role and label: the frame count with an empty list and a partial one, head-first filling, the tap
reporting its card's id, the armed slot's distinct name and `aria-pressed`, `Escape` reaching
`onCancel`, and the disabled state when the felt is not interactive.

The assertion that ties the rail to the rules is in `WarCouncilRound.readouts.test.tsx` (it lived in
`WarCouncilRound.test.tsx` until DLR-93 split that file): a genuinely off-suit
card is confirmed **disabled**, two clicks arm a Cheat, and the same card is then **enabled**. The
off-suit card's name is built with `cardAccessibleName` against the fixture's own hand rather than
hard-coded, and its illegality was verified empirically rather than assumed — two earlier phases of
this contract each hit a fixture that turned out to be accidentally legal.

**No spec drives a cheated trick through real card play end to end.** Producing a genuine void-suit
position from the real deal needs a fixed deck and would pin the CPU's choices rather than the rule.
That whole loop is QA's, in a real browser, and it was exercised: arm, play a forbidden card, watch
the slot empty.
