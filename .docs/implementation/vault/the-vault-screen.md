Part of [Vault](README.md).

# The Vault screen — `src/app/vault/`

**Built by:** DLR-118. DLR-113 shipped every function this screen calls and deliberately shipped no
screen at all; until this ticket `buyOddsBoost` and `buyStartingTier` had **no production caller**,
so a player could neither see a balance nor spend anything. This is the surface that closed that.

## Where it sits in the run flow, and what opens it

It is a **fourth run-level surface**, beside the verdict, the map and the shop, mounted from the same
`RunPhase` union in `src/App.tsx` that already carries the other three — `RunPhase.Vault`, added by
this ticket, reachable only from a **terminal** verdict.

**It sits beside `RunOutcomePanel`; it does not replace it.** The verdict names the outcome and draws
the trick tally, which the Vault screen has no business restating, and the ticket itself calls the new
screen "distinct from the verdict panel". Replacing it would have deleted DLR-82/85's three verdict
states for the sake of a meta-progression screen.

The route is one press. On the branch where `canAdvanceRun(run)` is false — the state that previously
offered `Start a new run` alone — `RunOutcomePanel` now renders two controls: **`Open the Vault`**
(`VAULT_LABEL` in `src/app/run/runLabels.ts`) as the primary, and `Start a new run` as the secondary
beside it. `onVault` is a **required** prop, and there is deliberately no Vault control while a run can
still continue — nothing in the `canContinue` branches changed.

Leaving is a single control, `VAULT_LEAVE_LABEL`, plus `Escape` on the container (a container
`onKeyDown`, not a document listener, matching `RunPathScreen` and `ShopPanel` — so there is nothing to
clean up). Both call `App.tsx`'s `handleNewRun`, the same transition the verdict's own control performs,
which satisfies the ticket's "leaving returns the player to the existing start-screen flow". There is no
way back to the verdict: the verdict is a report on a run that is over.

## The one rule this screen exists to render correctly

**Leftover coin converts to Vault currency only on a loss.** `App.tsx`'s `handleComplete` remains the
single place a run's outcome is decided and therefore the single place the deposit is committed, gated
on `recorded.outcome === RunOutcome.Lost`. A win is its own reward.

**`run.coins` is deliberately not zeroed**, because the verdict panel still reads it — and, since
DLR-118, because the Vault screen re-derives what was banked from it rather than needing a sixth
`useState` in the driver. That derivation is `creditedFromRun` in `vaultRunCredit.ts`:

```ts
export function creditedFromRun(outcome: RunOutcome, coins: Coins): number {
  if (outcome !== RunOutcome.Lost) return 0
  return depositLeftoverCoin(EMPTY_VAULT, coins).balance
}
```

**Calling `depositLeftoverCoin` rather than dividing is the load-bearing half.** The rate, the floor,
and the `Number.isFinite`/negative guards are stated once, in `src/vault/vaultEconomy.ts`; a second
division here would be a second source of truth free to drift from the number actually banked. It also
means the loss-only rule is a three-line pure function with its own spec
(`__tests__/vaultRunCredit.test.ts`) instead of an invariant a reviewer must trace through a component
tree. `vaultLabels.ts`'s `vaultDepositText` calls `creditedFromRun` and does no arithmetic of its own.

## The screen's states, all of them

Every state below is rendered explicitly and asserted in `__tests__/VaultScreen.test.tsx` by accessible
role and label. The empty and failure states are written out rather than skipped, because those are the
ones that get skipped and then look broken.

**The deposit line** (`role="status"`, from `vaultDepositText`), three branches:

| Run                            | What it says                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Lost, coins at or above the rate | what this run paid in, in currency                                            |
| Lost, coins below the rate     | that nothing converted, quoting `VAULT_EXCHANGE_RATE` by interpolation         |
| **Won** (or any non-lost)      | that a won run pays nothing into the Vault — a win is its own reward           |

**The ledger** also carries the balance (`vaultBalanceText`) and a holdings list — every odds boost via
`boostLineText`, every queued starting card via `grantLineText`. When the vault holds nothing at all the
list shows `VAULT_EMPTY_TEXT` instead: that is the **first-ever run** state, and it is reached on a
`SaveReadOutcome.Empty` read, which is **not a failure** and gets no alert.

**The alert region** (`role="alert"`) shows the first applicable of three problems, and nothing when
there is none:

| Condition                                   | Source                                  |
| ------------------------------------------- | --------------------------------------- |
| the save could not be read                  | `VAULT_READ_PROBLEM[handle.loadOutcome]` |
| the last write did not land                 | `VAULT_WRITE_PROBLEM[handle.lastWriteOutcome]` |
| reconciliation dropped entries              | `vaultDroppedText(handle.droppedCount)` |

Both maps are `Readonly<Record<Union, string | null>>` **total over their unions**, so a sixth read
outcome or a fourth write outcome is a compile error here rather than a blank line on screen — the
guarantee `PURCHASE_REFUSAL_MESSAGE` and `SLOT_OUTCOME_LABEL` already give. `Loaded` and `Empty` map to
`null`; so does `Written`.

**The `Corrupt` and `VersionMismatch` copy states DLR-113's decided behaviour and does not invent a new
one**: the unreadable record is **left on disk untouched** and this session starts from an empty Vault.
That is exactly what [saving the Vault](saving-the-vault.md) describes — a read must not destroy data,
even data this build cannot understand — and the screen's job is to say why rather than show a silent
zero. `Unavailable` says the Vault works for this session but will not be remembered.

## Choosing a card: two native selects, not two roving tabindexes

There are **71 templates**. A flat list with four buy controls each would be 284 controls on a no-scroll
surface, so selection narrows in two steps: a **family** select (the distinct `kind` values of
`BUFF_TEMPLATES` in declaration order, worded by `BUFF_FAMILY_WORD` from
`src/app/warCouncil/buffLabels.ts`), then a **card** select over `templatesForFamily(selectedKind)`.

Both are native `<select>` elements rather than roving-tabindex radio groups. `game-ux` requires a
collection of more than about five sibling controls to be one widget with one tab stop and arrow-key
movement — **a native listbox is that widget**, supplied by the platform with `Home`/`End` and type-ahead
for free, and it has **no index arithmetic to get wrong on an empty collection**. That last point is the
reason, not a bonus: the same unguarded-index shape has bitten this codebase three times, once surfacing
only under integration from a roving-tabindex probe calling `isFocusable(0)` on an empty collection.

The empty case is still guarded rather than assumed. `FIRST_BUFF_FAMILY` is derived once at module scope
with an explicit `undefined` check, the initial template id is `templatesForFamily(…)[0]?.id ?? ''`, and
an empty family renders no card select and disables every buy control before anything is indexed.

**No card on this screen is worded by a new grammar.** Every one goes through `slotSymbolText` in
`src/app/run/slotLabels.ts`, which is already the shipped way to word a `BuffTemplate` and which reaches
DLR-114's one grammar in `buffLabels.ts`. The screen therefore **never calls `apCostOf` and never handles
a `Buff`** — which is what makes the `Unassigned` `RangeError` structurally unreachable from this surface
rather than merely avoided.

## The two spends, and why the refusal is re-derived inside the updater

Four buy controls: one odds boost priced at `VAULT_ODDS_BOOST_PRICE`, and one per `BuffTier` priced at
`VAULT_STARTING_TIER_PRICE[tier]`. Each is `disabled` when its refusal is non-null and folds that refusal
into its own `aria-label` through `oddsBoostAccessibleName` / `startingTierAccessibleName`, mirroring
`slotPullAccessibleName` — so a screen-reader user hears **why** a control refuses without hunting for the
sentence beside it.

The `disabled` state and the accessible name read the refusal against the render's `handle.vault`, which
is correct: they are render-time concerns. **The decision to call the throwing function is not**, and
getting that wrong was this ticket's one real defect, caught in review:

```ts
handle.commit((v) => (oddsBoostRefusalFor(v, id) !== null ? v : buyOddsBoost(v, id)))
```

The refusal is re-derived **inside** the updater, against whichever vault that call actually sees. The
first shipped attempt derived it outside, against the render-time prop, then called `buyOddsBoost`
unconditionally inside — so two activations landing before React re-rendered (a double-click, or a fast
repeated `Enter`/`Space` on a focused button) both passed the same stale guard, and the second reached
`buyOddsBoost`'s deliberate `RangeError`. **There is no `ErrorBoundary` anywhere in `src/`**, so that
crashed to a blank screen rather than no-oping.

This is verbatim the discipline `App.tsx`'s `handleBuy` and `handleDrinkFlask` already carry, and which a
DLR-116 review round forced once already. It keeps `oddsBoostRefusalFor` / `startingTierRefusalFor` the
single statement of affordability and keeps `vaultEconomy.ts`'s throw reachable only from a genuine driver
bug. Two regression tests compose the captured updater twice in sequence and assert both that nothing
throws and that the second application is a true no-op.

## `useVault.commit` gained a functional-updater form

The above only works because `commit` accepts one. DLR-118 **widened** it, never narrowed it:

```ts
export type VaultCommit = VaultState | ((prev: VaultState) => VaultState)
```

It is implemented against a `useRef` mirror of the committed vault, written **only inside `commit`**:

```ts
const committed = useRef(load.vault)

function commit(next: VaultCommit): void {
  const value = typeof next === 'function' ? next(committed.current) : next
  committed.current = value
  const outcome = saveVault(store, value)
  setLoad((prev) => ({ ...prev, vault: value, lastWriteOutcome: outcome }))
}
```

**A ref rather than a write inside `setLoad`'s updater** is the deliberate choice: a `saveVault` call
inside a state updater would fire twice under StrictMode's development double-invocation. `commit` is an
event callback, never double-invoked, so reading and writing the ref there is both correct and pure — and
because `commit` is the hook's only writer of vault state, the ref cannot drift and needs no effect to
keep it in step. It survives HMR unchanged because it is a `const` holding no cross-mount state.

Widening left both of `App.tsx`'s pre-existing value-form call sites compiling untouched; they were
converted in the same ticket anyway, to `commit((v) => depositLeftoverCoin(v, recorded.coins))` and
`commit(clearStartingGrants)` — the latter passed as a bare reference, since `clearStartingGrants` is
already `(vault: VaultState) => VaultState` shaped.

## Copy, layout, and what nobody has looked at

Every user-facing string lives in `vaultLabels.ts` and is **placeholder copy**, exactly as
`shopLabels.ts` and `slotLabels.ts` mark their own — **including the currency noun "mark"/"marks"**,
which this ticket invented because leaving the balance unit-less reads ambiguously beside coins. The
wording is the developer's. **No price, rate or cap appears as a numeric literal** in either the labels
module or the component; every figure is interpolated from `src/vault/vaultConfig.ts`, so a retuned price
cannot leave this screen quoting a number the engine no longer uses.

The screen mounts inside `run.css`'s existing `.run-shell`, so there is still exactly **one `100dvh` grid
in the codebase**; `vault.css` styles only the inside of it and defines no second full-viewport shell.
**It shares CSS with `run.css` and shares none with `warCouncilHunt.css`**, so DLR-119's three unverified
layout risks do not reach it. The holdings list is the one region given its own `overflow-y: auto` and a
`max-height`, because the queued-grant list is unbounded in length.

**Nothing on this screen has ever been seen in a browser.** The contract ran unattended with its browser
pass off and its `mockup.html` unseen by the developer. jsdom has no layout engine, so no test can prove
the no-scroll claim: whether the screen fits without scrolling at 1280×800, 1024×768, 1366×768 and
390×844, and whether `vault.css`'s custom properties resolve rather than silently falling back, are both
untested by anything. Every `clamp()` bound and hue in `vault.css` was copied from `run.css`'s existing
scale rather than chosen, and all of it is the developer's to retune.
