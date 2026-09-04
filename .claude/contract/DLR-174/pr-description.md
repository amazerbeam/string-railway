# DLR-174 — Arm buffs from the card you are about to play

Plan: `.claude/contract/DLR-174/plan.md`

## Summary

Tapping a card in hand now raises it and replaces the felt stage with an arming
surface. The surface shows that card's live win/lose figures and only the
buffs that could still pay if it is played — filtered through
`projectBuffBranches` with the candidate buff appended to the active set, the
same projection the riding strip already uses for an active buff, asked here
one step earlier for a held one. No second condition table exists anywhere in
the new code.

A plain card stays at exactly two taps (raise, play); a card with a buff to
arm is four (raise, poise, arm, play). An illegal hand card is now enabled and
focusable rather than disabled, so it can refuse and shake instead of being
unreachable — a held Cheat can still unlock it as a lock rather than a flat
refusal.

Key new/changed files:

- `src/app/warCouncil/armingSurfaceModel.ts` — the pure per-card buff filter
  and the surface's view-model (`buildArmingSurface`, `armingReachOf`).
- `src/app/warCouncil/ArmingSurface.tsx` + `warCouncilArming.css` — the
  surface itself and its styles.
- `src/app/warCouncil/armingLabels.ts` — the surface's copy, transcribed from
  `mockup.html`.
- `src/app/warCouncil/armingWindows.ts` — the four new window predicates
  (`cardRaiseWindowOpen`, `unlockingCheat`, `armingSurfaceOpen`,
  `galleryOpen`), re-exported from `roundUiState.ts`.
- `src/app/warCouncil/FeltRegion.tsx` — the felt stage's three-way choice
  (arming surface / buff gallery / felt stage), split out of
  `WarCouncilTable.tsx` to keep it under its 400-line budget.
- Reducer changes in `roundReducer.ts`, `commitHandlers.ts`, `buffHandlers.ts`
  — the raise/play split, the Cheat lock, the no-Cheat refusal, `loadout`
  cleared on both commit exits.
- `PlayingCard.tsx` — `illegal` is now presentational only; a new `disabled`
  prop carries actual tappability.
- `HandFan.tsx` — gained a required `refusing` prop and widened focusability
  so an illegal card can be reached by keyboard.
- `roundControlsProps.ts` — `FeltRailOptions.galleryOpen` renamed to
  `stageReplaced` (it's now true for either surface, not just the gallery).

## Decisions the developer must make, and behaviour to judge by playing

Carried verbatim from `tasks.md`'s "Developer decides or observes" list, plus
two items Phase 3 raised:

- `warCouncilArming.css` → `--wc-arming-card-w` — the buff-card size bound on
  this surface. The mockup keys it off felt height rather than viewport
  width, since the felt is the container that actually constrains it. Ships
  with the mockup's own value as a documented placeholder; retune against a
  measurement.
- `warCouncilArming.css` → `--wc-arming-reject-ms` — the rejection
  animation's duration. Too short and the shake isn't read; too long and it
  delays the retry. Ships with the mockup's own value as a documented
  placeholder.
- Whether listing a skull-reading buff on every card while you lead (the
  acceptance criterion about a buff appearing even before the trick's skull
  status is known) reveals more than intended. A design call, not a UI one —
  goes to the game-designer skill and a follow-up ticket if it's wrong, never
  patched here.
- Whether the arming surface feels right to use — the raise, the two-tap arm,
  the shake on a refused card, and whether four taps for a buffed card reads
  as cheap. QA can confirm it *works*; only the developer can judge how it
  feels.
- Whether Apply Buff lowering a raised card (rather than being disabled while
  the surface is open) is the right interaction.
- **New from Phase 3:** whether the rejection shake's current treatment —
  keyed to the head thumbnail in the no-valid-cards state — is right, or
  whether the tapped hand card itself should shake instead (or as well).
- **Superseded by the review fix pass:** `HandFan`'s `refusing` prop (noted here after Phase 3) has
  since been removed entirely — see "Review fix pass" below for why.

## Verification results

From the prior phases (Implementer-run, scoped):

- Typecheck: clean at the end of every phase (`npm run typecheck` exits 0).
- Lint: clean at the end of every phase.
- `npx vitest run --project node` — **168 files / 2056 tests passed**.
- `npx vitest run --project dom` — **52 files / 481 tests passed**.
- Phase 4 (this pass) — the verification greps in Task 12 and Task 13, all
  clean (see `tasks.md` for the full output of each).

From the review fix pass (this pass, after the Defender/QA/Code-Evaluator dispatch):

- `npx vitest run --project node` — **168 files / 2057 tests passed** (one net new test:
  the AC8 assertion and the CancelSelection test both landed in an already-counted describe
  block; the AC6 structural test gained one extra assertion rather than a new `it`, and one new
  reducer-level `it` was added for `CancelSelection`).
- `npx vitest run --project dom` — **53 files / 482 tests passed** (one new file,
  `WarCouncilRound.armingGap.test.tsx`, one new `it`).
- `npm run typecheck` — exits 0.
- `npm run lint` — exits 0.
- `npx prettier --check` on every file this contract touched, plus the newly touched
  `armingWindows.ts` and the new test file — exits 0 (one file needed `--write` after the edit,
  then re-checked clean).

**Not run by this phase, and not this phase's to run:** the unfiltered
`npm test` suite, formatting checks outside this contract's own files, and `npm run build`. These
belong to QA on the verification round.

From the second review fix pass (this pass, Defender Critical only):

- `npx vitest run --project node` — **168 files / 2060 tests passed** (three net new tests in
  `roundReducer.arming.test.ts`; `roundReducer.test.ts`'s AC9 spec corrected in place, count
  unchanged).
- `npx vitest run --project dom` — **53 files / 482 tests passed**, unchanged (no `.tsx` touched
  this pass).
- `npm run typecheck` — exits 0.
- `npm run lint` — exits 0.
- `npx prettier --check` on `roundReducer.ts`, `roundReducer.arming.test.ts` and
  `roundReducer.test.ts` — exits 0.

## Browser agenda — the developer's eyes-on list

jsdom has no layout engine, so nothing in the test suite proves the felt still
fits. No browser pass was requested on this invocation, so this is the
developer's list to walk (or QA's on a future `--browser` run):

- No page scroll at **1920×960** and **1366×720** in all four surface states.
- The plain-card path is **exactly two taps** (raise, play) and the buffed
  path **exactly four** (raise, poise, arm, play). Count them — the ticket's
  own text says the design has failed if the plain case ever costs three.
- The greyscale screenshot is **actually taken**, and armed vs. poised, and
  the two window statements, are all still distinguishable in it. This check
  has failed before on this project after being claimed as passed.
- The console is clean through a full trick with a buff armed and removed.

## Review fix pass (Defender + QA + Code-Evaluator, one combined round)

All three reviewers ran in parallel against the finished implementation. Every finding below was
fixed in this pass; nothing was deferred except the two `src/warCouncil/**` items, which that
tree's READ-ONLY boundary in this contract explicitly forbids touching.

- **The Quarry-to-lead gap was unreachable through the real UI (Defender Critical 1).** The
  reducer's own raise window (`handleTapCard`) already accepted a raise there, but
  `WarCouncilTable.tsx`'s `handInteractive` never read `cardRaiseWindowOpen`, so `HandFan`
  rendered every card `disabled` in that gap — AC5's whole promise was not actually reachable by
  click. Fixed by widening `handInteractive` to also read `cardRaiseWindowOpen(ui) && !inFlight`.
  Added `WarCouncilRound.armingGap.test.tsx`, a real DOM mount that clicks a hand-card button in
  that gap and asserts the arming surface's dialog appears — the reducer-level spec alone (dispatch
  a `TapCard` action directly) could not have caught this, because it never goes through a
  `disabled` button.
- **`CancelSelection` opened the gallery instead of returning to the felt (Defender Critical 2).**
  Raising a card now also sets the shared poise holder (`ui.loadout`), but `CancelSelection` —
  which is exactly what `ArmingSurface`'s own second `Escape` press dispatches, and which this
  ticket's own state diagram documents as Arming -> Felt — never cleared it. `galleryOpen` read
  `true` once `armed` went `null`, so the felt rendered the full, unfiltered `BuffGallery` instead
  of the plain felt on the "raise then cancel" path. Fixed by having `CancelSelection` also clear
  `loadout`. Added a reducer-level test (`roundReducer.arming.test.ts`) that dispatches `TapCard`
  then `CancelSelection` and asserts both `armingSurfaceOpen` and `galleryOpen` read `false`
  afterward.
- **AC8 is met as the ticket states it, not as `tasks.md`'s state diagram narrowed it (QA
  Finding 1).** An off-suit tap with no Cheat held used to set only `rejection`, never `armed`, so
  the arming surface never opened for the single most direct illegal tap — only the pre-existing
  hand-card shake fired. AC8's own text ("gives a rejection animation on the card AND puts 'No
  valid cards to play' in the surface's head") and the developer's own browser-checked
  `mockup.html` (`tapCard()` raises/selects the card on every tap, legal or not, before adding the
  shake class) both disagree with the narrower reading `tasks.md`'s state diagram and Task 5 Step 1
  encoded — two developer-authored sources against one derived planning artifact. **The plan was
  wrong here, not the original implementation, which followed it faithfully.** Fixed: an illegal
  card with no armable Cheat now always raises (`armed: tapped`), and `rejection` is set
  alongside it so the card still shakes while the surface states the reason and remedy in
  `NoValidCards` mode. Updated the superseded assertion in `roundReducer.arming.test.ts` to pin the
  corrected behaviour.
- **The "AC6, structurally" assertion proved nothing (QA Finding 2).** Both
  `roundReducer.arming.test.ts`'s AC6 spec and `ArmingSurface.test.tsx`'s "Cheat only" spec passed
  `offered: [cheat]` alone, so `view.rows.every(row => row.stack.buff.kind === Cheat)` was true
  whether or not the window-exclusion logic in `armingSurfaceModel.ts` actually worked — nothing
  else was ever given a chance to appear. Fixed both specs to also pass a non-Cheat buff
  (`suitHigh:moons:magnitude`, matching the raised card's own suit so it would otherwise be
  per-card-relevant too) and assert its row is absent, driven through the window predicate itself
  rather than naming a specific card family.
- **The `refusing` prop earned no place (Code-Evaluator Issue 1, Defender Warning 1).** A
  required prop threaded `BuffRideZone` -> `HandFan`, producing a `wc-is-refusing` class no CSS
  rule anywhere selected and no component read. Its derivation also disagreed with the reducer's
  actual refusal decision on two counts: it omitted `!inFlight` (which `WarCouncilTable.tsx`'s own
  `interactive` already includes) and it omitted the `unlockingCheat` term (so it read "refusing"
  even on the one trick where a held Cheat turns an illegal tap into a LOCK rather than a refusal).
  **Removed the prop and its three construction sites entirely** (`HandFan.tsx`, `BuffRideZone.tsx`,
  and the three test fixtures that passed it) rather than fixing its derivation: AC9 is about a
  card being enabled, focusable and clickable — delivered and tested by `handFanRefusal.test.tsx` —
  not about a fan-level class, and with QA Finding 1 fixed the refusal is now stated on the arming
  surface itself, which is where AC8 puts it. This is a plan deviation worth flagging: `plan.md`'s
  `HandFan` data shape named this prop; it is gone as of this review pass, for the reason above.
- **`legalMoves` was re-typed rather than reused (Code-Evaluator Issue 2).** Both
  `WarCouncilTable.tsx` and `roundReducer.ts`'s own `legalNow` independently built the identical
  `legalMoves(round, PlayerSide.Player, cheatArmed(state) ? { ignoreFollowSuit: true } : undefined)`
  expression. Added one exported `legalMovesFor(state)` in `armingWindows.ts` (re-exported from
  `roundUiState.ts`, same seam as the other three window predicates) and call it from both sites.
- **`armingWindows.ts`'s own docblock described the wrong cycle (Defender Info 1).** It claimed
  `buffHandlers.ts` imports from this module; it does not — the actual cycle is the three-file
  triangle `armingWindows.ts` -> `buffHandlers.ts` -> `roundUiState.ts` -> `armingWindows.ts`, the
  last edge being this file's own re-export. Corrected the docblock; the safety claim itself
  (every cross-module reference is used only inside a function body) stands unchanged.
- **`unlockingCheat`'s latent trap (Defender Info 2).** It only excludes a Cheat refused for
  `WindowClosed`; a Cheat refused for `InsufficientAp` or `AlreadyActive` would still be offered as
  an "unlocking" row it cannot actually arm. Not reachable today (`AP_ENABLED` is off; a Cheat
  still in `offeredBuffs` cannot structurally be `AlreadyActive`) — added a comment naming the
  assumption rather than restructuring for a dead path, per review guidance.
- **A minor import tidy (Code-Evaluator Issue 4).** `BuffActivationRefusal` in
  `armingSurfaceModel.ts` was imported in a second, separate statement from `'../../hunt'` after
  the local-file imports; merged into the first.

### Deferred — `src/warCouncil/**` is READ-ONLY in this contract

- **`refusalReasonFor` (`roundReducer.ts`) duplicates `playCard.ts`'s Monarch-constraint
  derivation** (Defender Warning 2, Code-Evaluator Issue 3). Both independently state
  `state.round.currentTrick.length === 1 && state.round.currentTrick[0].card.rank ===
  CardRank.Monarch`. Nothing enforces the two stay in sync. Both reviewers accepted the
  READ-ONLY boundary as the reason this stands rather than being fixed here — a follow-up ticket
  should give this rule one owner in `src/warCouncil/`, read by both.

## Second review fix pass (Defender Critical, this pass)

- **A repeat tap on a still-illegal raised card fell into `commit` and unmounted the arming
  surface (Defender Critical).** `handleTapCard`'s same-card branch (`sameCard(state.armed,
  tapped)`) ran BEFORE any legality check, so a second tap on an already-raised card that was
  still illegal — no Cheat held (AC8), or a Cheat held but not yet armed (AC7's lock) — went
  straight to `commit`. `commit`'s rejection branch correctly refuses the play but also clears
  `armed` to `null`, and `armingSurfaceOpen` reads `armed !== null`, so the whole surface
  unmounted instead of re-shaking the card — the opposite of the developer's own `mockup.html`
  (`tapCard()` checks `!isLegal(c)` first, unconditionally, before ever reaching its "already
  selected, play it" branch).
  **The branch-order rule this establishes: legality is decided before a same-card tap is
  treated as a play attempt.** Fixed by testing `legalMovesFor(state)` (which already folds
  `cheatArmed` in) inside the same-card branch, before falling through to `commit`: an illegal
  card re-raises with its rejection refreshed (no Cheat) or stays raised as a silent lock (a
  held, unarmed Cheat); a legal card — including one whose Cheat has since been armed — still
  falls through to `commit` unchanged, so AC7's "arm then play on the second tap" path does not
  regress.
  Added three specs to `roundReducer.arming.test.ts` covering the no-Cheat re-raise, the
  held-but-unarmed-Cheat lock, and the positive control (Cheat armed, second tap commits).
  Also corrected `roundReducer.test.ts`'s AC9 spec, which asserted the pre-fix (buggy) behaviour
  as if it were correct — it tapped an off-suit card twice with two Cheats held but neither
  armed, and expected the second tap to reject with `MustFollowLeadSuit`. That is exactly AC7's
  lock case; the corrected assertion is that the card stays raised with `rejection: null` and the
  pile untouched.

## Conventions this ticket introduces

- `illegal` on `PlayingCard` is now **presentational only** — it no longer
  gates tappability. `disabled` is the separate fact carrying whether the
  card can be tapped at all. Don't reach for `illegal` to disable a card.
- `ui.loadout` is now the shared poise holder for **both** arming surfaces
  (the buff gallery and the new per-card arming surface), not "the gallery is
  open." Read it as "something is poised," not as a gallery flag.
- The four window predicates (`cardRaiseWindowOpen`, `unlockingCheat`,
  `armingSurfaceOpen`, `galleryOpen`) live in `armingWindows.ts` and are
  re-exported from `roundUiState.ts` — import them from `roundUiState.ts` as
  before; there is one import path, not two.
