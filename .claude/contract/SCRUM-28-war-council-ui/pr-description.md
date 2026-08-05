# SCRUM-28 — War Council UI: hand, trick area, trump/decree, score

**Plan:** [`plan.md`](./plan.md) in this folder.
**Approved specification:** [`mockup.html`](./mockup.html) in this folder — the plan states explicitly
that where the built screen and the mockup disagree, the mockup wins and the disagreement is a
defect, not a variation. Two review findings in this pass were exactly that (see *Review findings
fixed in this pass*, below).

## Summary

Adds the playable War Council round as a real, full-viewport game screen: a new
`src/app/warCouncil/` module (13 production files plus a shared roving-tabindex hook added during
review) implementing SCRUM-37's `WarCouncilMountProps` contract. Highlights:

- **A full-viewport, no-scroll shell** — `100dvh`, `overflow: hidden`, a three-row grid (status /
  table / hand), safe-area insets, and a single dark theme — holding the opponent plate and
  scoreboard, a felt table with the decree card, draw pile, trump chip and trick well, and the
  player's fanned hand.
- **Tap-twice to play a card** — one action (`TapCard`) arms a card on the first tap and commits it
  on the second, with a Fox or Woodcutter opening its ability prompt on the felt instead. All
  sequencing lives in one pure reducer (`roundReducer.ts`) that never re-implements a rule: legality,
  commitment, the CPU's move, and scoring are always the engine's own `legalMoves`, `playCard`,
  `chooseCpuMove`, and `scoreRound`.
- **The DOM test-environment split** SCRUM-37 deferred to this ticket: `vite.config.ts` now runs two
  Vitest projects, a `node` project (unchanged, pure-logic specs) and a new `dom` project (`jsdom`,
  scoped to `*.test.tsx`), so the 34 pre-existing pure-logic specs keep running with no DOM at all.
- **A minimal `App.tsx` dev host** that deals one round with `dealRound(WAR_COUNCIL_FIRST_DEALER,
  Math.random)` and mounts the real component, so the round is playable by hand and QA can drive it
  in a browser. Temporary by design — SCRUM-34 replaces this host rather than extending it.
- **`src/app/stubs/WarCouncilStub.tsx` deleted** — replaced wholesale, exactly as
  `.docs/implementation/app.md` said this ticket would. `VanguardStub.tsx` is untouched.

## Dependencies

Three new **devDependencies**, all approved in the planning session, zero bundle cost:

| Package | Why |
|---|---|
| `jsdom` | The DOM environment AC5's component tests run in — Node has no DOM. |
| `@testing-library/react` | `render`, `screen`, `fireEvent`, `cleanup` — the role-and-label testing API. |
| `@testing-library/dom` | Peer dependency of `@testing-library/react` v16+, listed explicitly. |

**No runtime dependency was added.** `react` and `react-dom` remain the only two.

## Verification (actual, re-run after the second fix pass below — numbers changed again)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Exits 0, no errors. |
| Lint | `npm run lint` | Exits 0, no errors, no warnings, zero `eslint-disable` in `src/`. |
| Formatting | `npm run format:check` | Fails on exactly the **same 15 pre-existing files** outside this contract's file map (`.docs/design/campaign-layer-concept.md`, `.docs/implementation/battle.md`, `.docs/implementation/vanguard.md`, `.docs/implementation/war-council.md`, four `src/battle/__tests__/*.ts`, `src/battle/playCpuClashTurn.ts`, three `src/vanguard/__tests__/*.ts`, `src/vanguard/cpuPlayer.ts`) — untouched by this contract at any point. Every file this contract created or modified passes `prettier --check` scoped to those paths (`TrickWell.tsx` needed one `prettier --write` after its `<button>` swap; everything else was already clean). |
| Full suite | `npm test`, run **five consecutive times** | `Test Files  40 passed (40)`, `Tests  314 passed (314)` on **all five runs**, no flake. (The stray `zzz-scratch-native-button.test.tsx` that made an earlier run 4-of-5 was never a tracked or task-listed file and is confirmed absent from the tree.) Split by project: **`node`** → 37 files / 292 tests (unchanged — nothing in this pass touched a pure-logic module); **`dom`** → 3 files / 22 tests (`HandFan.test.tsx` 9, `AbilityPrompt.test.tsx` 6, `WarCouncilRound.test.tsx` 7 — up from 20 total before this pass: `AbilityPrompt.test.tsx` gained a real net test as its broken arrow-key spec split into two correct ones, and `WarCouncilRound.test.tsx` gained the AC4 trick-count assertion below). |
| Build | `npm run build` | Exits 0. `dist/index.html` (0.48 kB), `dist/assets/index-*.css` (10.35 kB), `dist/assets/index-*.js` (209.76 kB). No bundler errors. `build` runs lint first, so a lint failure would surface here. |

### QA's browser verification (from the review round; not re-run in this pass, since it targets pointer/visual behaviour this pass did not touch beyond the keyboard fixes below, which QA's own note explains it did not exercise)

Three viewport sizes, document scroll:

- **1280×720** → `scrollHeight/innerHeight` 720/720, `scrollWidth/innerWidth` 1280/1280.
- **Phone portrait**, requested 390×844 → the `chrome-devtools` resize tool floored window width at
  500px on the test machine, so the achieved size was 500×844 → 844/844, 500/500. `--wc-card-w`'s
  `clamp(2.9rem, 6.2vmin, 4.3rem)` resolves to its 2.9rem floor at both 390 and 500 width, so QA
  treated the achieved size as layout-equivalent for this check.
- **Phone landscape**, 844×390 exact → 390/390, 844/844.

Fan fully visible in both phone orientations (portrait `maxBottom` 840.3 ≤ 844; landscape `maxBottom`
386.3 ≤ 390). Console clean on load, after a hard reload, and through an entire played round. A full
round played to trick 13 reported correctly through `onComplete`.

**QA did not catch the keyboard carry-on defect below**, because it carried on from each resolved
trick by clicking the felt, never by keyboard — the new component tests (`WarCouncilRound.test.tsx`'s
keyboard-carry-on spec, and `AbilityPrompt.test.tsx`'s roving-tabindex specs) close that hole at the
automated level; the *feel* of the keyboard path in a real browser is still unverified (see
*Unverified*, below).

## Review findings fixed in this pass

Code-Evaluator, Defender, and QA reviewed the full implementation in parallel; QA passed everything,
but Code-Evaluator and Defender independently found the same critical accessibility defect plus
several others. All are fixed, re-verified above:

- **Keyboard-only players could not carry on past trick 1–12.** The felt's "tap to carry on"
  affordance had no `tabIndex`, and every hand card is disabled the instant a trick resolves, so
  nothing in the tree was focusable. Fixed with a real, focusable control inside `TrickWell`
  (`role="button"`, own `Enter`/`Space` handling) — covered by a new keyboard-only component test.
  This was also an undisclosed deviation from the mockup, which attaches its own carry-on listener at
  `document`, not an element.
- **The deciding thirteenth trick was never shown.** The round-over panel appeared the instant the
  final trick resolved, since the felt checked `roundComplete` before `resolvedTrick`. Fixed by
  branching on the held trick first regardless of `roundComplete`; the reducer's `CarryOn` now clears
  a held trick even once the round is complete, rather than treating completion as a blanket no-op.
  The affected component spec was corrected to walk the real sequence (commit → see the held trick →
  carry on → see the panel → Finish), keeping its load-bearing `toHaveBeenCalledTimes(1)` assertion.
- **The hand's hover/armed lift never rendered.** `HandFan` wrote the fan's `transform` inline on
  every card, which always outranks the external hover/armed rules already in the stylesheet (an
  inline style beats any external rule without `!important`). Fixed by having `HandFan` write only
  the two `--wc-fan-rot`/`--wc-fan-lift` custom properties inline, with one base `transform` rule in
  CSS composing them with the hover/active/armed states.
- **A Fox/Woodcutter prompt offered every card its own tab stop.** Up to a dozen candidates plus a
  decline/drawn-card control, unwired to any roving tabindex. Fixed by extracting
  `useRovingTabIndex` — the mechanism `HandFan` already used over its own hand — into a shared hook,
  and wiring `AbilityPrompt`'s choice row through it. Covered by a new `AbilityPrompt.test.tsx`.
- **The rejection hint never got its alarm styling.** `wc-is-live`/`wc-is-reject` classes existed in
  CSS but were never applied. Fixed by deriving the class from the same cascade the mockup itself
  uses (reject wins, an armed card is "live", everything else is plain).
- **The hand duplicated into the accessible tree while a prompt was open.** Every remaining hand card
  appeared twice with the same accessible name — once disabled in `HandFan`, once live in
  `AbilityPrompt`. Fixed with `aria-hidden` on the now-inert fan while a prompt is open.
- **`cardKey` was defined identically in two sibling files.** Consolidated into `labels.ts`.
- **Module-level helper functions were declared before their component**, against this contract's own
  established convention. Moved after the default export in `HandFan.tsx`, `AbilityPrompt.tsx`, and
  `WarCouncilRound.tsx`.
- **A defensive-but-cheap guard** (`hand[index] !== undefined` before `containsCard`) was added to
  `HandFan`'s focusability check, removing reliance on an implicit cross-component invariant.

Two Defender findings were explicitly **not** changed, per the review's own instruction: the
`IllegalMoveReason` interpolated raw in the engine-fault message (deliberately diagnostic — "a bug,
not a rule") and `focusedIndex`'s numeric-position fallback across a shrinking hand (already correct,
not a defect).

## Second verification round — targeted residual fixes

A further verification round — QA driving the app live in Chrome, plus a Code-Evaluator pass — found
that the first fix pass above **closed the keyboard trap in `TrickWell` but introduced an equally
severe new one in `AbilityPrompt`**, plus a few smaller items. This section corrects an overstated
claim in the section above and documents what changed.

- **Correction to the claim above: `AbilityPrompt`'s roving tabindex was fixed only by half.**
  The bullet above ("A Fox/Woodcutter prompt offered every card its own tab stop... Covered by a new
  `AbilityPrompt.test.tsx`") is true as far as it goes, but read as fully confirmed-working when it
  wasn't: the fix that shipped for it carried its own new, independently severe keyboard trap, and
  **the passing test did not catch it — QA did, driving the app live.** `AbilityPrompt.test.tsx`'s
  "moves the tab stop" spec only ever read the `tabindex` **attribute**, never
  `document.activeElement`. Real cause: `promptRef`, the callback ref that focuses the prompt's group
  container on mount, was defined inline in the component body — a new function identity on every
  render — so React detached and reattached it, and re-fired `element.focus()` on the group
  container, on *every* re-render, including the render an arrow key itself causes. That stomped the
  focus `useRovingTabIndex`'s `focusIndex` had just moved a moment earlier in the same keydown: the
  `tabindex` bookkeeping advanced correctly, but real keyboard focus never left the group `<div>`, so
  `Enter`/`Space` on the "focused" card did nothing. A keyboard-only player whose only legal card was
  a Fox or a Woodcutter was stuck in an unbreakable loop — arrow keys went nowhere, `Enter` did
  nothing, `Escape` returned to the identical forced state. Fixed by keeping the ref callback a plain
  inline function (this project's `react-hooks/refs` lint rule forbids the alternative — a stable
  identity via `useRef(fn).current` — since that reads a ref's `.current` synchronously during
  render) and adding a guard that refuses to call `.focus()` when the group already contains
  `document.activeElement`. That is sufficient because `focusIndex` moves real focus synchronously
  inside the keydown handler, strictly before React re-renders and this ref reattaches — by the time
  the callback re-fires, the newly-focused card is already `document.activeElement`, and the
  `contains` check is `true`. The test was rewritten to assert `document.activeElement` directly
  (plus a new assertion that the focused choice actually activates), and — because a test that
  passes while the behaviour is broken is worse than no test — **both new assertions were confirmed
  to fail against the old inline-callback code and pass against the fix** before being trusted.
- **`TrickWell`'s carry-on control is now a native `<button>`, not a `<span role="button">`.** The
  first pass's rationale for the custom element (avoiding a double-dispatch risk from pairing a
  manual key handler with a native button) turned out to be a risk that only exists if you attach
  one — nothing required it. `RoundOverPanel`'s semantically identical "Finish the round" control was
  already a plain `<button type="button" onClick>` with no manual key handler, getting correct native
  `Enter`/`Space` activation for free with zero double-dispatch risk. Swapped `TrickWell` to match;
  deleted the now-unneeded `handleHintKeyDown`; kept `handleHintClick`'s `event.stopPropagation()`,
  which guards against bubbling to the felt's own `onClick` regardless of which element is used.
  `warCouncilCards.css`'s `.wc-is-carry-on` gained a small button-chrome reset
  (`font-family: inherit; background: none; border: 0`) so the browser's default button face doesn't
  reappear around what is still meant to read as plain hint text — neutral values, not a new visual
  design decision, and `.wc-table-hint`'s own font-size/weight/letter-spacing/color are untouched.
  `WarCouncilRound.test.tsx`'s keyboard-carry-on spec now asserts the control is reachable by
  keyboard (real focus, no explicit `tabIndex` needed) and activates on `fireEvent.click`, rather than
  re-proving the HTML platform's own Enter/Space-activates-`<button>` guarantee.
- **AC4 ("running trick counts... visible and update after each trick resolves") had no component-level
  coverage.** `roundReducer.test.ts` asserted the reducer's internal `tricksWon`; nothing asserted the
  scoreboard itself displays it. Added an assertion to `WarCouncilRound.test.tsx` (chosen over a
  standalone `RoundStatusBand.test.tsx` because it proves the real wiring end-to-end, not just the
  presentation in isolation) that the rendered "Tricks won" group reads `You0` before a card is
  played and `You1` after the trick resolves.
- **`useRovingTabIndex.ts`'s `querySelectorAll('button')` tag-name coupling is now a visible comment,
  no code change.** The hook has two callers over two different collections; if a future change ever
  swaps the rendered root element away from a native `<button>`, arrow-key navigation would silently
  stop moving focus — the call is optional-chained, so nothing throws and no test fails differently.
- **The stray `zzz-scratch-native-button.test.tsx`** that made one `npm test` run 4-of-5 is confirmed
  absent from the working tree (it was never tracked and named by no task's `Files:` block); five
  consecutive `npm test` runs are green above with no flake.

## Decisions the developer must make or judge by playing

Copied from the plan's own "Developer decides or observes" list — unchanged by this review pass:

- **Every value in `warCouncil.css`'s token table and `fanLayout.ts`'s constants is transcribed from
  the approved mockup.** Each is a one-line retune — felt/brass/parchment palette, the three suit
  hues, the `clamp()` card-size bounds, fan rotation step, lift factor, overlap.
- **Whether tap-twice is discoverable without being told**, and whether 13 arms + 13 commits + 13
  carry-ons per round drags. Only playing settles either. The timed-auto-advance alternative needs a
  `TRICK_REVEAL_MS` value nobody has chosen, and neither the plan nor this pass invents one.
- **Whether the single dark theme is right** for the game screen, given `global.css` keeps
  `color-scheme` for any future non-game screen.
- **Whether the ability pip reads clearly enough** in place of a printed ability name.
- **`WAR_COUNCIL_FIRST_DEALER` stays SCRUM-25's placeholder**, so the opponent leads trick 1 and the
  player's first sight is a card already on the table. One-line change in `src/battle/config.ts` if
  the other opening is wanted — not this contract's decision.
- **New in this pass — whether the felt's whole-table tap and the resolved trick's own dedicated
  keyboard control feel redundant or right together.** Pointer users get both (tap anywhere on the
  felt, or the smaller text control); keyboard users only ever see the latter. Only playing settles
  whether that reads as intentional.

## New conventions for future contributors

- **Two-project Vitest layout.** `vite.config.ts`'s `test.projects` runs a `node` project
  (`environment: 'node'`, `*.test.ts` under `src/**/__tests__/`) and a `dom` project
  (`environment: 'jsdom'`, `*.test.tsx`). A `.test.tsx` file is **only** collected if it lives under
  a `src/**/__tests__/` folder and ends in `.test.tsx` — anything else silently sits uncollected with
  a green exit code.
- **The `wc-` prefix.** Every CSS custom property and class name this module introduces is prefixed
  `wc-`, so a search for the module's visual surface is unambiguous.
- **`src/app/warCouncil/` is deliberately effect-free.** No `useEffect`/`useLayoutEffect` anywhere in
  the module — every transition is a user event or a lazy `useReducer` initializer. A Phase 6 grep
  enforces zero hits; if a future change needs an effect here, that is a design conversation, not a
  quick add.
- **This is the repository's first per-component stylesheet pair.** `warCouncil.css` (tokens, shell,
  status band, felt/table, hand container) and `warCouncilCards.css` (card face, ability prompt,
  round-over panel) are siblings, split because the combined file exceeded the 400-line budget.
  Import both from the mount — importing only one leaves half the feature unstyled with no error.
- **`useRovingTabIndex`** (added during this review pass) is the one place roving-tabindex logic
  lives for this module; a future collection of sibling controls should call it rather than
  re-implementing the arrow-key/`Home`/`End`/`Escape` mechanism a third time.

## Known debt carried deliberately

- **The `cpuFault` `IllegalMoveReason` branch is defensive and untested.** It covers a `playCard`
  rejection of the CPU's own chosen move, unreachable through today's engine (`chooseCpuMove` is
  documented to only ever return a move `playCard` accepts) — carried as a guard against a future
  engine regression rather than faked with a contrived fixture.
- **`chooseCpuMove` throws rather than rejecting on an empty legal set.** `roundReducer.ts`'s
  `advanceCpu` guards `legalMoves(...).length === 0` before calling it, rather than fixing the engine
  itself — a completed, tested module this contract does not touch.
- **No automated test covers the no-scroll layout.** `jsdom` has no layout engine, so nothing in the
  suite can prove `.wc-shell` never scrolls or crops at a given viewport size; that check is QA's, in
  a real browser at named sizes (see above).

## Unverified

Neither fix pass could observe the running app directly — every claim above is typecheck, lint, a
scoped or full Vitest run, `npm run build`, and greps. jsdom has no layout engine and simulates focus
and click dispatch, not a real user agent's full input pipeline, so:

- **The AbilityPrompt keyboard fix is proven at the jsdom level (real `document.activeElement` moves,
  confirmed to fail against the old code) but not yet re-driven live in Chrome.** The original defect
  was only found by QA driving the app by hand; this pass fixed and re-tested it in jsdom but did not
  re-run QA's own live-browser pass against it.
- Whether the new native `<button>` carry-on control **feels** right in a real browser — reachable
  and activatable per the component tests, but its visual presentation (the reset button chrome,
  the padding/negative-margin hit-area technique) and how it reads next to the felt's own
  tap-anywhere behaviour are unverified by eye.
- Whether the fan's hover/armed lift, now actually reaching the DOM for the first time, looks the way
  the mockup intended once rendered rather than just composed correctly in the stylesheet.
- Everything QA's own "Decisions that are not yours" list already named (tap-twice discoverability,
  pacing, the single dark theme, the ability pip's legibility) — unchanged by this pass, still open.
