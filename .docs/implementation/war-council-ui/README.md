# War Council UI — `src/app/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-28, DLR-47

## Responsibility

The playable War Council round screen: a full-viewport, non-scrolling game surface that renders a
dealt `WarCouncilState`, lets a human play a round of it by hand, and reports the finished round
back through SCRUM-37's `WarCouncilMountProps` contract. It owns **presentation and sequencing
only** — every rules question is delegated to `src/warCouncil/` (see
[../war-council/README.md](../war-council/README.md)), and this module contains no legality check,
no scoring rule, and no trick-winner computation of its own.

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
| `createRoundUiState`                                                              | Lazy `useReducer` initializer; advances the opponent's opening lead when they lead trick 1            | `roundReducer.ts`      |
| `RoundUiState`                                                                    | `{ round, armed, prompt, resolvedTrick, rejection, cpuFault }` — the mount's one piece of state       | `roundReducer.ts`      |
| `RoundUiAction`                                                                   | `TapCard \| ChooseAbility \| CancelSelection \| CarryOn`, via the `RoundUiActionKind` `as const` map  | `roundReducer.ts`      |
| `ResolvedTrick`                                                                   | `{ cards, winner }` — a just-resolved trick held on screen until the player carries on                | `roundReducer.ts`      |
| `CpuFault`                                                                        | `IllegalMoveReason \| 'noLegalMove'` — a corrupt CPU turn, shown rather than swallowed                | `roundReducer.ts`      |
| `SUIT_NAME`, `RANK_NAME`                                                          | Display names for `Suit` and the five ability-bearing `CardRank` values                               | `labels.ts`            |
| `cardAccessibleName`                                                              | `"3 of Keys (Fox)"` / `"7 of Bells"` — the accessible name every card button binds to                 | `labels.ts`            |
| `cardKey`                                                                         | `"bells-7"` — the one stable React list key for a card, shared by every card list in the module       | `labels.ts`            |
| `ILLEGAL_MOVE_MESSAGE`                                                            | `Record<IllegalMoveReason, string>` — human copy for the engine's own rejection reasons               | `labels.ts`            |
| `fanPlacement`                                                                    | Pure fan geometry: rotation, lift, overlap, and z-order for one card at one hand position             | `fanLayout.ts`         |
| `FAN_ROTATION_STEP_DEG`, `FAN_LIFT_FACTOR`, `FAN_OVERLAP_PX`, `FAN_ARMED_Z_INDEX` | Named tuning constants `fanPlacement` reads, transcribed from the approved mockup                     | `fanLayout.ts`         |
| `useRovingTabIndex`                                                               | Shared roving-tabindex hook: one tab stop over a flat list of `count` controls, arrow/Home/End/Escape | `useRovingTabIndex.ts` |
| `SuitSymbolSheet`, `SuitMark`                                                     | The three inline `<symbol>` definitions, mounted once, and a `<use>` reference to one of them         | `SuitMark.tsx`         |
| `PlayingCard`                                                                     | One card in three renderings via `variant: 'hand' \| 'table' \| 'pile'`                               | `PlayingCard.tsx`      |

The zone components — `RoundStatusBand`, `DecreePile`, `TrickWell`, `HandFan`, `AbilityPrompt`,
`RoundOverPanel` — are each a default export consumed only by `WarCouncilRound.tsx`.

`labels.ts`, `fanLayout.ts`, and `roundReducer.ts` import no React and touch no DOM global, so all
three are unit-tested in the cheap `node` Vitest project; the components are tested in the `dom`
project (see [Testing](testing.md)).

## How it works

- [Layout and styling](layout-and-styling.md) — the full-viewport shell, the `dvh` vs `svh`
  choice, the two-stylesheet split, and how the fan's transform is composed in CSS rather than
  written whole from React.
- [Interaction and state](interaction-and-state.md) — tap-twice-to-play, the reducer's no-effect
  design, how a held trick's winner is derived rather than recomputed, and rejected-move recovery.
- [Accessibility](accessibility.md) — the shared roving tabindex, the ability prompt's focus
  handling, and the fan's `aria-hidden` behaviour while a prompt is open.
- [Error handling](error-handling.md) — the two `cpuFault` cases and why they're shown, not
  swallowed.
- [Testing](testing.md) — the two-project Vitest layout this module's tests depend on.

## Rules & invariants enforced

- **This module re-implements no rule.** `legalMoves` decides what `HandFan` renders as tappable,
  `playCard` decides what commits, `chooseCpuMove` plays the opponent, `scoreRound` computes the
  reported score, and card equality is always the engine's own `sameCard`/`containsCard` (exported
  from `src/warCouncil/index.ts` by this ticket rather than deep-imported or re-written).
  `roundReducer.ts` contains no suit comparison, no rank comparison, and no trick-winner
  computation. The single permitted rank _identity_ check is "is this rank `CardRank.Fox` or
  `CardRank.Woodcutter`", for opening the ability prompt — via `CardRank`, never a numeric literal.
- **No `useEffect` or `useLayoutEffect` anywhere**, in `.ts` or `.tsx` (see
  [Interaction and state § The module has no effect at all](interaction-and-state.md)). Enforced by
  a grep in the contract's final verification.
- **`labels.ts`, `fanLayout.ts`, and `roundReducer.ts` import no React and touch no DOM global** —
  verified by grep, which is what lets them run in the `node` Vitest project.
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

- **The "Points" column is a Standing multiplier, not a Hunt score.** `RoundOverPanel` reports
  `scoreRound`'s per-side value, which since DLR-50 comes from `src/hunt`'s `resolveStanding` — a
  ×0–×6 multiplier, not `Spoils × Standing`. `scoreHunt`/`checkDemand` exist and are tested (see
  [../war-council/scoring.md](../war-council/scoring.md)) but nothing in this module calls them;
  surfacing the real score, band, and Demand on screen is T7 in the DLR-46 epic.
- **No automated test covers the no-scroll layout.** `jsdom` has no layout engine, so nothing in the
  suite can prove `.wc-shell` never scrolls or crops at a given viewport size. That check belongs to
  QA driving the app in a real browser at named sizes. It has been verified at 1280×720, 844×390
  (landscape), and a phone portrait — the last at 500×844 rather than 390×844, because the browser
  tooling floors window width at 500px on this machine; `--wc-card-w`'s
  `clamp(2.9rem, 6.2vmin, 4.3rem)` resolves to its `2.9rem` floor at both widths, making the two
  layout-equivalent for that measurement.
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
  change — not final values.
- **`ILLEGAL_MOVE_MESSAGE[IllegalMoveReason.MustFollowMonarch]`'s copy is now stale for one of its
  two triggers, and this module was not the one that made it so.** DLR-51 (engine-side, this
  module's files untouched) widened *when* the engine reports that reason: it now also fires for
  the Quarry's round-long rule-break, where an ordinary card was led and the Monarch character is
  simply active for the round — not the pre-existing case this string was written for, where a
  literal Monarch (rank 11) was led. The fixed string here (`"The Monarch was led — play your Swan
  or your highest card of that suit."`) is factually wrong for the round-long trigger. Currently
  unreachable — no round in the shipped app has a `quarryCharacter` active (see
  [../war-council/README.md](../war-council/README.md)'s Deferred section) — but whichever ticket
  next wires character scheduling into a real round must fix this copy before it ships, either by
  rewording to a trigger-neutral statement or by splitting the reason code. Left as-is here because
  the wording is a developer copy call, not this doc-writer's or any agent's to invent.
