# War Council UI — `src/app/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-28, DLR-47, DLR-53, DLR-63, DLR-66, DLR-67, DLR-68

## Responsibility

The playable **Hunt screen**: a full-viewport, non-scrolling game surface that renders a dealt
`WarCouncilState`, lets a human play a 13-trick round of it by hand against a telegraphing Quarry,
and reports the finished round back through SCRUM-37's `WarCouncilMountProps` contract. It owns
**presentation and sequencing only** — every rules question is delegated to `src/warCouncil/` (see
[../war-council/README.md](../war-council/README.md)), and this module contains no legality check,
no scoring rule, and no trick-winner computation of its own.

DLR-53 added the Hunt layer on top of the round renderer rather than rebuilding it: §4's persistent
readouts (running Spoils, the Standing band, the Quarry's character and trick count), the Quarry's
intent telegraphed before every commit, and an end panel showing the scoring equation as arithmetic.
Every number on that screen originates in `src/hunt/config.ts` and arrives already derived — see
[Hunt readouts and the telegraph](hunt-readouts-and-telegraph.md).

DLR-63 put a decision at the front of the round and changed what a card looks like: a **declare gate**
gating the first trick, the hand rendered **longest-suit-first** instead of in dealt order, and a
suit-coloured border with a bottom-left suit mark on every card face. As with the Hunt layer, no rule
moved here — `declareHunt` writes the declaration. See
[The declare gate and the hand's order](declare-gate-and-hand-order.md).

**DLR-67 took two things off this screen and reshaped a third.** The Demand cell, the end panel's
cleared/missed verdict, the credits cell and the trick well's claim control are all gone with the
mechanics behind them; the ledger's third cell now reads **Damage** rather than "Score"; and the end
panel grew a **second equation**, so both sides' `Spoils × Standing = Damage` is stated side by side.
A resolved trick now always offers exactly one control.

**DLR-68 replaced the ledger's one-cell Standing readout with the whole table.** Where the bar
previously said only *"Defeated ×3"* — where you are, and nothing about where you could go — it now
shows every configured band as a **profile**: each bracket as wide as its trick span, as tall as its
multiplier, pipped once per trick, with the bracket you currently occupy marked. Below the existing
narrow-viewport breakpoint it collapses back to the single cell. This arrived as a **mid-planning
scope widening** — DLR-68 was an engine-only ticket until the developer supplied an annotated
screenshot and asked for it — so the ticket carries an `engine` label over what is now partly UI work.
See [Hunt readouts and the telegraph](hunt-readouts-and-telegraph.md).

It sits under `src/app/` rather than beside the engine for a hard reason: `eslint.config.js`'s
pure-core override bars `src/warCouncil/**` from importing React at all, so a `.tsx` file there
would trip `no-restricted-imports` (the same override previously also scoped `src/vanguard/**`
before DLR-47 deleted that tree). `src/app/` is the layer that is _expected_ to consume the engine
and import React, which makes this its natural home. See [../app/README.md](../app/README.md) for
the mount-prop contract this module implements.

The folder deliberately has **no barrel**. `App.tsx` imports the mount directly by path
(`./app/warCouncil/WarCouncilRound`); `src/app/index.ts` excludes components on purpose, and a `.ts`
barrel re-exporting one is a needless brush with `react-refresh/only-export-components`.

## Key types & exports

| Export                                                                            | Purpose                                                                                               | File                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| `WarCouncilRound`                                                                 | Default export — the mount, satisfying `WarCouncilMountProps` (`initialState` in, `onComplete` out)   | `WarCouncilRound.tsx`  |
| `roundReducer`                                                                    | The single reducer owning every UI transition: `(RoundUiState, RoundUiAction) => RoundUiState`        | `roundReducer.ts`      |
| `createRoundUiState`                                                              | Lazy `useReducer` initializer; a pure restructuring of `initialState` — since DLR-53 it deliberately leaves the Quarry's opening lead uncommitted so it can be telegraphed | `roundReducer.ts`      |
| `RoundUiState`                                                                    | `{ round, armed, prompt, resolvedTrick, rejection, cpuFault }` — the mount's one piece of state       | `roundReducer.ts`      |
| `RoundUiAction`                                                                   | `TapCard \| ChooseAbility \| CancelSelection \| CarryOn \| Declare`, via the `RoundUiActionKind` `as const` map. **`RoundUiState` gained no field for `Declare`** — the declaration lives on `RoundState`. DLR-63's sixth member `ClaimTrick` was deleted by DLR-67 | `roundReducer.ts`      |
| `sortHandForDisplay`                                                              | Pure: a **copy** of the hand in display order — longest suit first, `ALL_SUITS` as the tie-break, ascending rank within a suit (DLR-63 AC6). React-free and DOM-free, so it runs in the `node` project | `handOrder.ts`         |
| `HUNT_DECLARATION_NAME`, `DECLARE_REJECTION_MESSAGE`                              | Display copy for the two declarable paths and `declareHunt`'s rejection union (DLR-63). `CLAIM_REJECTION_MESSAGE` was deleted by DLR-67 with the union it keyed on | `labels.ts`            |
| `ResolvedTrick`                                                                   | `{ cards, winner }` — a just-resolved trick held on screen until the player carries on                | `roundReducer.ts`      |
| `CpuFault`                                                                        | `IllegalMoveReason \| 'noLegalMove'` — a corrupt CPU turn, shown rather than swallowed                | `roundReducer.ts`      |
| `SUIT_NAME`, `RANK_NAME`                                                          | Display names for `Suit` and the five ability-bearing `CardRank` values                               | `labels.ts`            |
| `cardAccessibleName`                                                              | `"3 of Keys (Fox)"` / `"7 of Bells"` — the accessible name every card button binds to                 | `labels.ts`            |
| `cardKey`                                                                         | `"bells-7"` — the one stable React list key for a card, shared by every card list in the module       | `labels.ts`            |
| `ILLEGAL_MOVE_MESSAGE`                                                            | `Record<IllegalMoveReason, string>` — human copy for the engine's own rejection reasons               | `labels.ts`            |
| `STANCE_PHRASE`, `STANDING_BAND_NAME`                                             | Display copy for the telegraphed stance and the four Standing bands (DLR-53). `DEMAND_OUTCOME_VERDICT` was deleted by DLR-67 — there is no verdict, because there is no target | `labels.ts`            |
| `intentAccessibleName`                                                            | The telegraph's single screen-reader sentence; distinguishes a live reading from a speculative one (DLR-53) | `labels.ts`            |
| `previewQuarryIntent`                                                             | Pure: the Quarry's intent for the trick the player is *about* to lead. Returns `null`, never throws (DLR-53) | `intentPreview.ts`     |
| `fanPlacement`                                                                    | Pure fan geometry: rotation, lift, overlap, and z-order for one card at one hand position             | `fanLayout.ts`         |
| `FAN_ROTATION_STEP_DEG`, `FAN_LIFT_FACTOR`, `FAN_OVERLAP_PX`, `FAN_ARMED_Z_INDEX` | Named tuning constants `fanPlacement` reads, transcribed from the approved mockup                     | `fanLayout.ts`         |
| `useRovingTabIndex`                                                               | Shared roving-tabindex hook: one tab stop over a flat list of `count` controls, arrow/Home/End/Escape | `useRovingTabIndex.ts` |
| `SuitSymbolSheet`, `SuitMark`                                                     | The three inline `<symbol>` definitions, mounted once, and a `<use>` reference to one of them         | `SuitMark.tsx`         |
| `PlayingCard`                                                                     | One card in three renderings via `variant: 'hand' \| 'table' \| 'pile'`                               | `PlayingCard.tsx`      |

The zone components — `RoundStatusBand`, `DecreePile`, `TrickWell`, `HandFan`, `AbilityPrompt`,
`RoundOverPanel` — are each a default export consumed only by `WarCouncilRound.tsx`. DLR-53 added
three more in the same shape: `HuntLedger` (mounted inside `RoundStatusBand`), `QuarryDossier`, and
`IntentTelegraph` (both mounted in the new `wc-dossier` zone). DLR-63 added `DeclareGate`, mounted as
the felt cascade's **first** branch. DLR-68 added `StandingTrack`, mounted inside `HuntLedger` — which
gained two required props (`table` and `tricks`) to feed it, threaded down from `WarCouncilRound`
through `RoundStatusBand`.

`WarCouncilRound` supplies that table as `standingTableFor(declaredPath(ui.round))` — **the same pair
the engine scores with**, which is what makes it impossible for the track to display a different table
from the one `huntDamage` would use.

`labels.ts`, `fanLayout.ts`, `roundReducer.ts`, `intentPreview.ts`, `handOrder.ts`, and (DLR-68)
`standingSegments.ts` import no React and touch no DOM global, so all six are unit-tested in the cheap
`node` Vitest project; the components are tested in the `dom` project (see [Testing](testing.md)).

`standingSegments.ts` sits here rather than in the lint-enforced pure core for the same reason
`handOrder.ts` does: **how a table is drawn is not a game rule.** It derives spans, height ratios and
peak/cliff flags from whatever table it is handed and writes no multiplier or boundary of its own.

`handOrder.ts` sits here rather than in the lint-enforced pure core on purpose: **display order is not
a game rule.** It is the same call `intentPreview.ts` already makes — React-free and DOM-free, but
review-enforced rather than lint-enforced. Sorting `RoundState.hands` instead would have changed what
`dealRound` returns, and what every engine spec asserts, for a purely presentational reason.

## How it works

- [Layout and styling](layout-and-styling.md) — the full-viewport shell, the `dvh` vs `svh`
  choice, the **five**-stylesheet split and the 400-line budget that caused every one of them, and
  how the fan's transform is composed in CSS rather than written whole from React.
- [Interaction and state](interaction-and-state.md) — tap-twice-to-play, the reducer's no-effect
  design, how a held trick's winner is derived rather than recomputed, and rejected-move recovery.
- [Hunt readouts and the telegraph](hunt-readouts-and-telegraph.md) — the `hunt` prop, the ledger
  and dossier, the telegraph's two readings and why the Quarry's lead is held uncommitted, the
  end panel's equation, and (DLR-68) the **Standing track**: the whole multiplier table drawn as a
  profile, why its geometry lives in a pure helper, why its pips nest inside their bracket, and why
  its narrow-viewport collapse is pure CSS with no effect to clean up.
- [The declare gate and the hand's order](declare-gate-and-hand-order.md) — why the gate is the felt
  cascade's first branch rather than a modal, its one-prop shape and the copy that is the developer's
  to overturn, the three-key display sort and why the hand re-orders mid-round, and AC7's card face
  (DLR-63, DLR-67).
- [Accessibility](accessibility.md) — the shared roving tabindex, the ability prompt's focus
  handling, and the fan's `aria-hidden` behaviour while a prompt is open.
- [Error handling](error-handling.md) — the two `cpuFault` cases and why they're shown, not
  swallowed.
- [Testing](testing.md) — the two-project Vitest layout this module's tests depend on.

## Rules & invariants enforced

- **This module re-implements no rule.** `legalMoves` decides what `HandFan` renders as tappable,
  `playCard` decides what commits, `chooseCpuMove` and `commitQuarryMove` play the opponent,
  `quarryIntent` computes the telegraphed stance, and — since DLR-67 — a single `scoreHunt` call per
  side computes everything the screen shows about scoring: the running Spoils, the Standing band, and
  the Damage. That one record feeds the status band, the end panel, and `onComplete` alike, so the
  number the player reads and the number the mount reports cannot diverge. Card equality is always the
  engine's own `sameCard`/`containsCard` (exported
  from `src/warCouncil/index.ts` by this ticket rather than deep-imported or re-written).
  `roundReducer.ts` contains no suit comparison, no rank comparison, and no trick-winner
  computation. The single permitted rank _identity_ check is "is this rank `CardRank.Fox` or
  `CardRank.Woodcutter`", for opening the ability prompt — via `CardRank`, never a numeric literal.
- **No `useEffect` or `useLayoutEffect` anywhere**, in `.ts` or `.tsx` (see
  [Interaction and state § The module has no effect at all](interaction-and-state.md)). Enforced by
  a grep in the contract's final verification.
- **`labels.ts`, `fanLayout.ts`, and `roundReducer.ts` import no React and touch no DOM global** —
  verified by grep, which is what lets them run in the `node` Vitest project.
- **No component sees a numeric literal standing in for a multiplier, a band boundary, or a card
  value** (DLR-53, extended by DLR-63, re-verified by DLR-66 and DLR-67). Every one arrives already
  derived — `band.multiplier`, `huntDamage[side].standing`, `invertedCardValue(CardRank.Swan)` for the
  declare gate's worked example — from `src/hunt/config.ts` through the engine. DLR-66 made
  `resolveStanding`'s table required, so `WarCouncilRound.tsx` now names a **declaration** at that call
  site (never a table) and the module still holds no boundary or multiplier of its own: DLR-66's
  verification greps `src/app/` for `minTricks|maxTricks` and expects zero hits. Grep-verified in the
  contract's final verification, but structural rather than merely observed: there is no path by
  which a component could invent one. See
  [Hunt readouts and the telegraph](hunt-readouts-and-telegraph.md).
- **Every visual value is a named CSS custom property or a named constant in `fanLayout.ts`**,
  transcribed from the developer-approved `mockup.html`. No hex colour appears in any `.tsx` — a grep
  enforces this — and no `vh`/`vw` unit appears anywhere in `src/` or `index.html`; dimensions are
  `dvh`, `%`, `rem`, or `vmin`.
- **No `memo`, `useMemo`, or `useCallback`.** There is no profiling evidence for any and the
  `react-frontend` skill forbids speculative memoisation. The heaviest per-tap work is one
  `legalMoves` over at most 13 cards plus one `playCard`; every collection is bounded by the 33-card
  deck.
- No lint rule is suppressed anywhere in the module, there is no `any`, no module-level mutable
  state, and no `console.log`/`console.debug`.
- The three SVG `<symbol>` ids (`s-bells`, `s-keys`, `s-moons`) are defined and consumed entirely
  within `SuitMark.tsx`, routed through a `SUIT_SYMBOL_ID` map. They bind by string: a rename
  type-checks cleanly and renders nothing.

## Deferred / not yet implemented

- **⚠ The short-viewport layout is currently BROKEN and is not a settled state.** DLR-67's end panel
  grew a second equation, which overflowed the felt at viewports inside the stylesheet's own
  `@media (max-width: 44rem), (max-height: 34rem)` breakpoint — the Opponent's panel rendered below
  the fold with `.wc-shell { overflow: hidden }` and no way to reach it. The fix applied
  (`align-self: stretch` + `min-height: 0` + `justify-content: center` + `overflow-y: auto` on
  `.wc-table-inner`, scoped to that media query) resolved the end panel **but regressed the declare
  gate**: `justify-content: center` on a scroll container clips overflowing content symmetrically,
  and `scrollTop` cannot go negative, so the "Play to Win" option's own heading became unreachable at
  any scroll position at 680×520 and 700×544 — and a click on that button failed on first attempt.
  QA measured both. **Do not treat this breakpoint's behaviour as documented-and-intended until it is
  resolved**; the two candidate resolutions are scoping the stretch/scroll to the end-panel state
  alone, or `align-items: flex-start` so `scrollTop: 0` shows the true top of content.
- **No automated test covers the no-scroll layout.** `jsdom` has no layout engine, so nothing in the
  suite can prove `.wc-shell` never scrolls or crops at a given viewport size — which is not a
  theoretical gap: DLR-53's first review round shipped a `.wc-status` that pushed the Demand cell
  entirely off-screen at phone width, and DLR-67 did it twice more (above), with every component
  test passing each time. That check belongs to QA driving the app in a real browser at named sizes,
  and it has now caught a real defect three times.
  Verified at 1280×720 and 844×390 (landscape) by SCRUM-28, and re-verified by DLR-53 at 1920×1080,
  1366×768, 1024×640, and a phone portrait — the last at 500×844 rather than 390×844, because the
  browser tooling floors window width at 500px on this machine; `--wc-card-w`'s
  `clamp(2.9rem, 6.2vmin, 4.3rem)` resolves to its `2.9rem` floor at both widths, making the two
  layout-equivalent for that measurement.
- **The telegraph's line renders beside the end-of-Hunt panel.** Once the round completes,
  `quarryIntent` correctly returns `null` and `IntentTelegraph` reads "Waiting on your lead" next to
  a panel where there is nothing left to lead. Harmless and never stale, but a redundant line during
  that state — worth a glance when the visual pass lands.
- **The Quarry's *lead* costs one extra tap on trick 1 only.** Holding the lead uncommitted is what
  makes it telegraphable, and every later lead folds its commit onto the carry-on tap the player was
  already making. Trick 1 has no prior reveal to fold onto, so it opens with a "Let them lead" tap.
  Whether that reads as a stall is a developer judgement nobody has made yet.
- **The `cpuFault` `IllegalMoveReason` branch is defensive and deliberately untested** — unreachable
  through today's engine, carried as a guard against a future engine regression rather than faked
  with a contrived fixture.
- **`chooseCpuMove` throws instead of rejecting on an empty legal set.** The reducer guards around it
  rather than fixing the engine, which was out of scope for a UI ticket. A future engine ticket
  should make it return a rejection like every other failure path.
- **Single round only.** The mount spans exactly one round per `WarCouncilRoundResult`. Multi-round
  play, persistence, save/replay, and undo are all absent — nothing in this repository stores state
  yet, so round state lives only in the `useReducer` and a later persistence ticket would need no
  migration.
- **A single dark theme, deliberately.** The shell sets `color-scheme: dark` locally and offers no
  light variant; `src/styles/global.css` keeps `color-scheme` for any future non-game screen.
  Reversible, but it means the game screen and a future non-game screen will not match by default.
- **No card art.** Card faces are CSS and text — parchment ground, serif rank, an inline-SVG suit
  mark tinted per suit, and a brass pip on the five ability-bearing ranks. The pip stands in for a
  printed ability name, which cannot fit at this card width without truncating. Art direction is a
  separate ticket.
- **Animation is limited to the mockup's card lift and the carry-on hint pulse**, both of which
  honour `prefers-reduced-motion`. Nothing else moves.
- **Focus reverts to `<body>` when a carry-on control unmounts**, so a keyboard player presses `Tab`
  once per trick to reach the next control. Standard browser behaviour when a focused element is
  removed or disabled; minor friction across a 13-trick round, not a trap, and left as-is.
- **Every visual constant remains the developer's to retune.** The felt/brass/parchment palette, the
  three suit hues, the `clamp()` card-size bounds, and `fanLayout.ts`'s rotation step, lift factor,
  and overlap are transcribed-and-confirmed defaults from the approved mockup, each a one-line
  change — not final values. DLR-63 added four more of the same kind: the card border's width, the
  suit mark's corner offset, whether a suit-coloured border reads as information or decoration at
  `--wc-card-w`'s `clamp(2.9rem, 6.2vmin, 4.3rem)` floor, and the rank direction *within* a suit in
  `sortHandForDisplay` (ascending is the chosen default — see
  [declare-gate-and-hand-order.md](declare-gate-and-hand-order.md)).
- **Whether the declare gate's opening tap reads as a decision or a speed bump is unjudged**, and it
  compounds the "Let them lead" tap below: trick 1 now opens with **two** taps before the first card.
  Both are structural consequences of things worth having — the gate is where the round's whole
  scoring scheme is chosen, and holding the lead uncommitted is what makes it telegraphable — but
  nobody has yet played it and said whether the opening reads well.
- **The declare gate's Lose copy is now factually wrong, and fixing it is a copy decision.** DLR-67
  wrote it to describe the own-pile interim; DLR-69 landed the pile swap and put every UI file out of
  scope, so the sentence "every trick you take still adds both its cards to your Spoils" now asserts
  the opposite of the rule — at the moment a player is choosing the path. See
  [declare-gate-and-hand-order.md](declare-gate-and-hand-order.md); the wording is the developer's.
- **The Spoils readouts may no longer read honestly on a Lose Hunt.** Since DLR-69, `HuntLedger`'s
  "Running Spoils" and `RoundOverPanel`'s "Spoils" display a figure built from the **Quarry's** captured
  cards under the player's own heading. The labels are neutral enough to survive — they name the additive
  term without claiming whose cards it came from — but whether that reads as honest or as a mislabelled
  number can only be answered by playing a declared-Lose Hunt and looking at it.
- **The Lose path has no decision of its own between tricks, and the pile swap did not give it one.**
  DLR-67 removed the claim fork, so every resolved trick now offers the same single carry-on control
  under either declaration — thirteen fewer forks per round, and a strictly lower interaction cost, but
  also a path whose only decision is the opening one. DLR-69's swap was expected to give it texture back
  and does so structurally rather than as a decision: what it adds is a reason to care *which* cards the
  Quarry captures, inside the existing follow-suit choice. Whether that reads as a decision is the thing
  to watch when playing.
- **Whether the end panel's two mirrored equations read as a comparison or as two unrelated sums is
  unjudged**, as is whether the heavier border on the higher total is the right ahead-marker. Both
  are DLR-67 additions settled by `mockup.html` rather than by play.
- **The mid-round hand re-order is accepted, not mitigated.** Because holding size is one of the sort
  keys, a suit can lose its leftmost slot as cards leave the hand, so a card located by position on
  trick 4 may sit elsewhere on trick 5. This is what a physical hand does and positions already
  shifted whenever a card was removed — but whether it reads as the hand tidying itself or as cards
  moving under your finger is only answerable by playing. The fallback is fixed `ALL_SUITS` order, one
  line in `handOrder.ts`.
- **The `prefers-reduced-motion` suppression of the declare option's hover lift is unverified in a
  browser.** The rule and its suppression are co-located in `warCouncilCards.css` with the override
  later in source order, so it wins at equal specificity by construction — but the browser tooling
  available to QA exposes no CSS media-feature emulation, so it has only been checked statically.
  Confirm by hand: DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion: reduce`"
  → hover a declare option → expect no lift.
- **`ILLEGAL_MOVE_MESSAGE[IllegalMoveReason.MustFollowMonarch]`'s copy is now stale for one of its
  two triggers, and this module was not the one that made it so.** DLR-51 (engine-side, this
  module's files untouched) widened *when* the engine reports that reason: it now also fires for
  the Quarry's round-long rule-break, where an ordinary card was led and the Monarch character is
  simply active for the round — not the pre-existing case this string was written for, where a
  literal Monarch (rank 11) was led. The fixed string here (`"The Monarch was led — play your Swan
  or your highest card of that suit."`) is factually wrong for the round-long trigger.
  **DLR-53 made this reachable.** `src/App.tsx` now passes `SLICE_QUARRY_CHARACTER` (the Monarch) as
  `dealRound`'s third argument, so every round in the shipped app has the character active and a
  player who breaks the round-long rule now sees copy describing a trigger that did not fire. This
  is the highest-value copy fix outstanding in the module. It was left as-is through DLR-53 because
  the wording is a developer copy call — reword to a trigger-neutral statement, or split the reason
  code in the engine — and not this doc-writer's or any agent's to invent.
