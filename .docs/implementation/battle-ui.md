# Battle UI — `src/app/battle/`

**Status:** implemented
**Built by:** SCRUM-31, SCRUM-34

## Responsibility

The Battle-level screens `src/battle/` (see [battle.md](battle.md)) has no UI for — a
round-transition summary and a Breach win/loss screen — **plus the orchestrator that drives the
whole playable battle loop**, `BattleHost`. Since SCRUM-34 this module is what `src/App.tsx` mounts:
it owns the sequencing of War Council rounds, round transitions, The Clash, and the final Breach
screen.

The two panels (`RoundTransitionPanel`, `BattleOverPanel`) own **presentation only** — they take
already-computed props (`score`, `muster`, `winner`) and call no engine function. `BattleHost` owns
**sequencing only** — it decides which screen shows and threads already-computed values between
them, but adjudicates no game rule itself; every legal-move question stays inside `WarCouncilRound`'s
and `VanguardMatch`'s own reducers. It is the third sibling under `src/app/`, alongside
`src/app/warCouncil/` and `src/app/vanguard/`, because these screens belong to neither subgame —
they are Battle-level, not per-subgame, concepts.

It sits under `src/app/` for the same reason its two siblings do: `eslint.config.js`'s pure-core
override bars `src/warCouncil/**` and `src/vanguard/**` from importing React, so any `.tsx` needs a
home outside those trees. See [app.md](app.md) for the mount-prop contract `BattleHost` now fulfils
on both games' behalf.

## Key types & exports

| Export                     | Purpose                                                                 | File                     |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `SIDE_LABEL`                | `Readonly<Record<PlayerSide, string>>` — `player: 'You'`, `cpu: 'The opponent'` | `labels.ts`        |
| `RoundTransitionPanel`      | Default export — the round-transition summary component                | `RoundTransitionPanel.tsx` |
| `RoundTransitionPanelProps` | `{ round, dealer, tricksWon, score, muster, onContinue }`               | `RoundTransitionPanel.tsx` |
| `BattleOverPanel`           | Default export — the Breach win/loss screen component                   | `BattleOverPanel.tsx`   |
| `BattleOverPanelProps`      | `{ round, winner }`                                                     | `BattleOverPanel.tsx`   |
| `BattleHost`                | Default export — the battle-loop orchestrator; what `App.tsx` mounts    | `BattleHost.tsx`        |
| `BattleHostProps`           | `{ rng?: () => number }` — `rng` is a test seam, not a tuning value     | `BattleHost.tsx`        |
| `dealerForRound`            | `(round: number) => PlayerSide` — the alternating dealer, by parity     | `dealerForRound.ts`     |
| `BattleHostUiState`         | Four-variant union: which screen is showing                             | `battleHostReducer.ts`  |
| `BattleHostUiAction`        | The four transitions between those variants                             | `battleHostReducer.ts`  |
| `BattleHostActionKind`      | `as const` map of the four action kinds, plus its derived type          | `battleHostReducer.ts`  |
| `createBattleHostUiState`   | Lazy initializer — returns `{ kind: 'vanguard', round: 0 }`             | `battleHostReducer.ts`  |
| `battleHostReducer`         | The pure screen-sequencing reducer                                      | `battleHostReducer.ts`  |

The folder deliberately has no barrel, matching `src/app/warCouncil/` and `src/app/vanguard/` —
`BattleHost.tsx` imports each component directly by path, and `App.tsx` imports `BattleHost` the
same way.

## How it works

### The loop is driven by fulfilling `VanguardMatch`'s promise, not by `src/battle/`'s state machine

This is the load-bearing structural decision of SCRUM-34, and it is deliberate: **`src/battle/`'s
`BattleState` machine is not wired into the running app at all.** `BattleHost` imports exactly one
thing from `src/battle/` — the `WAR_COUNCIL_FIRST_DEALER` constant, and only indirectly via
`dealerForRound.ts`. `startBattle`, `submitWarCouncilCard`, `beginClash`, `submitClashAction`,
`playCpuWarCouncilTurn`, and `playCpuClashTurn` all go unused by the app.

The reason is a shape mismatch. `src/battle/`'s functions are **push-based** — one call per player
action. The two built UI mounts are **pull-based** — each owns a private reducer and reports back
exactly once, via one callback, per completed round (`WarCouncilRound`) or per completed match
(`VanguardMatch`). Neither accepts an externally-dispatched per-action update. Reconciling the two
would mean rewriting both components' internals, so `BattleHost` instead composes them through the
mount-prop contracts they already satisfy (see [app.md](app.md)).

What actually drives the loop is `VanguardMatch`'s own `requestTricksWon` effect. `VanguardMatch`
stays mounted for the entire battle (its own contract — one mount per match), and whenever it needs
a round's trick split it calls `requestTricksWon(round)` and awaits the promise. `BattleHost`
fulfils that promise by running a whole War Council round on screen:

```
VanguardMatch calls requestTricksWon(round)
  → BattleHost deals a round: dealRound(dealerForRound(round), rng)
  → dispatch RoundRequested        → overlay shows WarCouncilRound
  → WarCouncilRound.onComplete     → dispatch RoundComplete
                                      → overlay shows RoundTransitionPanel
                                        (score from the result, muster via convertScoreToMuster)
  → RoundTransitionPanel.onContinue → dispatch ContinueToClash + resolve the pending promise
                                      → overlays gone; VanguardMatch has its tricks, starts The Clash
  → VanguardMatch.onComplete       → dispatch BattleResolved → BattleOverPanel
```

Round 1 needs no special case: `VanguardMatch`'s reducer requests round 1's tricks the instant it
mounts, so the very first thing a player sees is a dealt War Council round.

### `BattleHost` holds three state slots and zero effects

`BattleHost.tsx` deliberately owns no effect of its own — the only effect anywhere in the subtree is
`VanguardMatch`'s pre-existing request effect. Its three slots:

- `useState<VanguardState>(() => createVanguardBoard())` — the board's stable initial value, via a
  pure lazy initializer so StrictMode's development double-invocation is harmless.
- `useReducer(battleHostReducer, undefined, createBattleHostUiState)` — which screen is showing,
  same lazy-initializer safety.
- `useRef<PendingRoundRequest | null>(null)` — the in-flight promise's `resolve`, mirroring
  `TestModeVanguardHost.tsx`'s existing `pendingRef` pattern. It is only ever read and written
  synchronously from user-triggered callbacks, subscribes to nothing, and so needs no cleanup.

`requestTricksWon` is a `useCallback` with deps `[rng]`, satisfying `RequestTricksWon`'s documented
referential-stability requirement (see [app.md](app.md) → _`RequestTricksWon` carries a referential-
stability requirement_). `rng` defaults to the `Math.random` **reference** rather than an
`() => Math.random()` wrapper, which is what keeps that callback identity stable across renders — an
inline wrapper would re-fire `VanguardMatch`'s effect every render.

Under StrictMode, `VanguardMatch`'s effect fires twice on first mount, so `requestTricksWon` runs
twice for the same round: two `dealRound` shuffles happen (wasted work, development only) and the
second call overwrites `pendingRef`, orphaning the first `resolve`. This self-heals — the reducer's
`RoundRequested` case is itself an unconditional overwrite, and the abandoned promise is inert
because nothing external ever calls it. The behaviour is documented in a comment above `pendingRef`.

### `battleHostReducer` is a pure four-variant screen machine with guarded transitions

`battleHostReducer.ts` models which screen is showing as a discriminated union on `kind`:
`vanguard` | `warCouncilRound` | `roundTransition` | `battleOver`. Every variant carries `round`, so
`BattleOverPanel` always has a round number to display.

Two of the four transitions are **guarded no-ops outside their expected source state**:
`RoundComplete` returns `state` unchanged unless `state.kind === 'warCouncilRound'`, and
`BattleResolved` returns it unchanged unless `state.kind === 'vanguard'`. `BattleHost`'s own render
logic never fires either dispatch outside those states, so the guards are defensive rather than
load-bearing — but they are asserted by referential identity (`expect(next).toBe(state)`) in
`__tests__/battleHostReducer.test.ts`, not merely by shape equality.

The reducer computes exactly one derived value: `muster: convertScoreToMuster(score)` on the
`RoundComplete` transition, reusing the same pure function `src/battle/beginClash.ts` itself wraps.
`score` is taken straight off `WarCouncilRoundResult` — already computed by `WarCouncilRound`, never
recomputed here.

### `dealerForRound` states the alternation rule once, as a pure function of the round number

`dealerForRound.ts` is nine lines: `(round - 1) % 2 === 0` picks `WAR_COUNCIL_FIRST_DEALER`,
otherwise `otherSide(WAR_COUNCIL_FIRST_DEALER)`. It **imports** the constant from `src/battle/`
rather than restating it — verified by grep that nothing under `src/app/**` ever redefines
`WAR_COUNCIL_FIRST_DEALER`. This matches [battle.md](battle.md)'s documented rule that the dealer
flips exactly once per completed round with no other trigger, expressed as parity so no running
"whose turn to deal" state has to be threaded anywhere.

### The overlay is a curtain over a still-mounted board, not a remount

`VanguardMatch` cannot be unmounted between rounds — it exposes no way to extract its live board
state for a later remount, and its own contract is that a whole match is one mount. So
`BattleHost` renders it unconditionally and stacks the War Council round / round-transition screens
*above* it in a `<div className="battle-overlay">`: `position: fixed; inset: 0; z-index: 100`.

The `z-index` value is not arbitrary and carries a comment saying so. `.vg-shell` is
`position: relative` with no `z-index`, so it does **not** establish a stacking context — its
positioned descendants (`.vg-entry` at 10, `.vg-alert` at 11, `.vg-panel` at 12 in
`vanguardPanels.css`) compare directly against `.battle-overlay` in the root stacking context. An
earlier value of 10 would have lost to two of them. 100 dominates every `z-index` anywhere in `src/`
(the highest elsewhere is 30, in `warCouncilCards.css`) with deliberate headroom, so a future
addition to the Vanguard subtree's scale cannot silently bleed through the curtain.

The board beneath stays genuinely non-interactive while the curtain is up — not merely obscured.
`VanguardMatch`'s own reducer disables every cell while it is awaiting a trick split, which QA
verified in the browser by reading all 121 hex-cell buttons' `disabled` state during a War Council
round.

### Both panel components are pure, prop-driven, and call no engine function

`RoundTransitionPanel` takes `round`, `dealer`, `tricksWon`, `score`, `muster`, and `onContinue` as
props — the same `tricksWon`/`score` shape `RoundOverPanel` (`src/app/warCouncil/`) already takes,
so a caller that has just run `scoreRound` can hand the result to either. `BattleOverPanel` takes
`round` and `winner`. Neither imports `scoreRound`, `convertScoreToMuster`, `beginClash`, or
`submitClashAction` — grepped, zero hits in `src/app/battle/`. The only derived value either
component computes is `RoundTransitionPanel`'s next dealer, via the already-exported
`otherSide(dealer)` (`src/warCouncil/`) — narration of an already-known fact, not new game logic.

### `BattleOverPanel` ends active play by having nothing else to render

AC2's "no further card or board interaction is possible after this screen appears" is satisfied
structurally: `BattleOverPanel` renders a heading naming the winner (`SIDE_LABEL[winner]` + "have"
or "has taken the Vanguard"), one paragraph of body copy, and a round-note — no button, no board,
no interactive element of any kind. This is not a disabled state; there is nothing to disable. It
also mirrors `BattleState`'s own shape: the `Resolved` variant (`src/battle/battleState.ts`) carries
no `warCouncil` or `clash` field, so a future caller switching on `state.phase` cannot accidentally
keep an interactive layer mounted alongside this screen.

### One shared copy map, following `TrickWell.tsx`'s convention

`labels.ts` exports one `SIDE_LABEL: Readonly<Record<PlayerSide, string>>`, promoted to a shared
module because both components need identical wording — the same DRY move
`src/app/warCouncil/TrickWell.tsx` already makes with its own file-local, differently-worded
`SIDE_LABEL` ("Them" vs. this module's "The opponent"). The two are unrelated, unexported bindings
in their own module scopes; there is no collision, but a future consolidation of Battle-layer and
War-Council-layer copy would need to reconcile the wording deliberately.

`RoundTransitionPanel`'s dealer-copy lines (`dealer === PlayerSide.Player ? 'you' : 'the opponent'`)
re-derive a lowercase variant of what `SIDE_LABEL` already owns, for mid-sentence copy
("dealt by **you**") rather than `SIDE_LABEL`'s capitalized standalone form — a deliberate,
reviewed choice, not an oversight.

### One shared full-viewport shell, `battle.css`

`battle.css` covers both screens with one stylesheet: `.battle-shell` (`100dvh`, `overflow: hidden`,
grid, `env(safe-area-inset-*)` padding) and `.battle-panel` (a centered card), following the
`game-ux` skill's shell pattern the same way `warCouncil.css`/`vanguard.css` do for their own
screens. Its `:root` block reuses the exact chamber/felt/brass/chalk/parchment hex values
`vanguard.css`/`warCouncil.css` already declare identically — confirmed byte-for-byte during
review — this game's one established palette, not a third one invented for the Battle layer.
`table.battle-tally` styles the two summary tables `RoundTransitionPanel` renders (tricks/score, and
Muster); `.battle-dealer` and `.battle-primary` are specific to that one component.
`.battle-overlay` (SCRUM-34) is the full-viewport curtain described above.

## Rules & invariants enforced

- **No engine call from either panel component** — `scoreRound`, `convertScoreToMuster`,
  `beginClash`, `submitClashAction` are never imported into `RoundTransitionPanel.tsx` or
  `BattleOverPanel.tsx`. Grep-verified.
- **`BattleHost` adjudicates no game rule.** It adds no interactive control of its own — every
  button a player can click still belongs to an already-tested child component that enforces its own
  engine's legality. QA verified this in the browser across a full 13-trick round: only follow-suit-
  legal cards were ever enabled, and all 121 board cells stayed disabled while the curtain was up.
- **Zero internal state, zero `useEffect`, zero refs, zero listeners** in either panel component;
  and **zero effects in `BattleHost`** — its two lazy initializers and one ref carry no cleanup
  obligation, so nothing in this module can misbehave under React StrictMode's double-invocation
  beyond the documented, self-healing wasted shuffle.
- **`src/battle/`'s state machine is deliberately unused by the running app** — only
  `WAR_COUNCIL_FIRST_DEALER` crosses that boundary, and only as an import. See _How it works_ above
  for why, and _Deferred_ below for what that leaves open.
- **`WAR_COUNCIL_FIRST_DEALER` is never redefined under `src/app/**`** — grep-verified as part of
  the contract's own verification phase.
- **No restart / "play again" control anywhere in this module** — `BattleOverPanel` renders no
  button. Deliberate: the source ticket calls a restart flow optional and explicitly out of scope.
- **No configuration key, tunable, or persisted shape is introduced.** `SIDE_LABEL` is copy, not a
  tunable; `BattleHostProps.rng` is a test seam with a comment saying so, not a tuning value; no
  `localStorage`/`sessionStorage` reference exists anywhere in `src/`.
- Tests query by accessible role and label only (`getByRole('region'/'heading'/'button', …)`,
  `getByText`) — no `data-testid` in the panel spec files. `BattleHost.test.tsx` uses two
  `data-testid`s, but only inside its own hand-written mock of `VanguardMatch`, never against real
  component output.

## Deferred / not yet implemented

- **`src/battle/`'s state machine has no consumer.** `BattleState`, `startBattle`,
  `submitWarCouncilCard`, `beginClash`, `submitClashAction`, `playCpuWarCouncilTurn`, and
  `playCpuClashTurn` are all built and tested (see [battle.md](battle.md)) but nothing in the running
  app calls them. Driving the UI through them instead would mean rewriting `WarCouncilRound` and
  `VanguardMatch` to accept external dispatch — a materially larger ticket than "wire existing pieces
  together," and one that would need its own scope and approval.
- **The round-transition screen's phase placement is now resolved in code, but not yet play-tested.**
  `battle-ui.md` previously flagged this as an assumption; SCRUM-34 answers it by mounting
  `RoundTransitionPanel` between round-complete and Clash-begin. Worth a developer sanity-check
  during play, since an alternative reading remains defensible.
- **No round cap.** Matches `battle.md`'s documented deliberate non-requirement, so a sufficiently
  even matchup could in principle run a long time before a Breach.
- **No Vanguard board snapshot on the win/loss screen.** Out of scope — not required by the ticket's
  "names the winning side unambiguously," and would pull in `VanguardBoardView`'s non-interactive
  rendering mode, which has no other caller yet.
- **Visual styling is a structural placeholder**, transcribed from the approved `mockup.html` but
  not a final visual pass. SCRUM-33 (the UI polish pass) is the deliberately-deferred next step —
  sequenced *after* this ticket by a developer decision so it can polish against a playable loop
  rather than guessing blind. The overlay's visual layering in particular is worth a look in the
  running app.
- **`TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, and `appMode.ts` are left on disk but
  unreferenced** from `App.tsx` after SCRUM-34's rewrite. Deleting a standalone dev sandbox wasn't
  asked for and is easily reversible either way; see [vanguard-ui.md](vanguard-ui.md) for what they
  still do if remounted.
- **Randomness is unseeded.** `Math.random` is used directly, matching prior `App.tsx` precedent —
  no seeding requirement was ever stated. `BattleHostProps.rng` exists purely so the component test
  can inject a deterministic sequence, and is not a product-facing feature.
