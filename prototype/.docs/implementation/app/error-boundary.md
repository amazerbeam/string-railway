Part of [App shell](README.md).

# The `ErrorBoundary`

DLR-131 — the net under `src/`'s deliberate `throw` sites (98 `throw new` sites across 37 files at
this ticket's start). `src/app/ErrorBoundary.tsx` is mounted around `<App />` in `src/main.tsx`,
inside `<StrictMode>`, and is the **only class in `src/`**. Not one existing `throw` was weakened,
removed, or converted to a silent return — this adds a backstop, not a softer floor.

## Why root-only, and not per-screen

The ticket asked for the root-versus-per-screen question to be decided and argued, not assumed. The
decision is **root-only**, for a structural reason rather than a preference.

React runs a `useState` functional updater **during the render of the component that owns that
state**. DLR-116 and DLR-118 deliberately moved the shop's and the Vault's spend guards *inside*
those updaters — `setRun((r) => refusalFor(shopStockFor(r), item) !== null ? r : buyFromShop(r,
item))` in `App.tsx`, and the matching functional `commit((v) => …)` for the Vault. That fix is
correct and stays, but it also fixes *where* a surviving throw would surface: if `buyFromShop` or
`buyOddsBoost` throws, it throws while React is rendering **`App`**, not while React is rendering
`ShopPanel` or `VaultScreen`. A boundary placed around each screen sits strictly *below* `App` in the
tree and is structurally incapable of catching it. The one placement that catches the exact class of
bug this ticket was raised for is the one **above** `App` — see `run-driver.md`'s `handleBuy` and
`handleDrinkFlask` sections for the double-click race this same convention already closes.

The second half of the argument is that a per-screen boundary could not honestly offer what its
existence would imply. Every piece of run state — `run`, `hand`, `dealt`, `tricks`, `phase` — lives
in `App`; the five screens are pure views of it. A screen that throws during render throws *because
of* that state, so clearing a screen-level boundary and re-entering the same screen with the same
state re-throws immediately. The only recovery a screen-level fallback could actually offer is
"back out of this screen", which for a crashing fight means abandoning the fight — the same loss as
a root reset, dressed up as a rescue.

Two smaller factors closed it further. `App.tsx` was near its 400-line budget, and wrapping its
several early-return JSX branches would have forced a split whose only motivation was a boundary
already argued to be the wrong shape. And a root boundary catches three things no per-screen
boundary can reach: a throw in `App`'s own render body, a throw in `useVault`'s lazy `useState`
initialiser as it reads and validates `localStorage`, and a throw in `useShopSlot`'s per-render
derivation of the strip.

## Why it is the only class in `src/`, and must stay one

`getDerivedStateFromError` and `componentDidCatch` have no hook equivalent in React 19 — there is no
function-component way to write an error boundary at all. `ErrorBoundary.tsx`'s own docblock states
this, so a later reader "modernising" the file into a function component does not silently delete
the mechanism while everything still type-checks, lints, and renders. `componentDidCatch` is
deliberately absent: React already prints the caught error and its component stack to the console
itself, this prototype has no telemetry sink, and `console.log`/`console.debug` are forbidden in
shipped code — an empty override or a duplicate log would both be worse than the omission.

## What it does not catch

An error boundary catches a throw in render, in a lifecycle method, or in a constructor of the tree
beneath it. It does **not** catch a throw inside an event handler, a `setTimeout`, a rejected
promise, or its own fallback render. So a click handler that computes *before* calling `setState` —
rather than inside the updater — still escapes to `window.onerror` and still blanks the screen.

That is not a gap papered over; it is a second argument for the in-the-updater guard convention
DLR-116 and DLR-118 established, and it is why `handleBuy` and `handleDrinkFlask` in `run-driver.md`
re-derive their refusal against whichever `run` the functional updater actually sees rather than
computing it ahead of the `setState` call — that is what brings a guarded spend under this net at
all. A guard written outside the updater it protects is exactly the code path this boundary cannot
reach.

## What the fallback says, and what it deliberately does not promise

The fallback is a full-viewport `<main role="alert">` panel. It states plainly that the in-memory
run is gone — no false offer to resume a crashed fight — and that Vault progress is written through
`saveVault` on every `commit`, so anything already banked *should* still be there. "Should", not
"is": a write can come back `SaveWriteOutcome.Rejected` on a quota error or in private browsing, and
the Vault screen is the surface that already reports that separately (see
[../vault/the-vault-screen.md](../vault/the-vault-screen.md)). The caught error's one-line
`.message` is shown as technical detail; `.stack` is never read or rendered.

Two controls. "Start a new run" clears the boundary's `error` state — React already destroyed the
failed subtree when it swapped to the fallback, so clearing the error mounts `App` fresh, with the
Vault re-read from storage. "Reload the page" calls `window.location.reload()`, for the case where a
remount re-crashes on the same input.

## The three docblocks corrected in the same contract

Three functions asserted "no `ErrorBoundary` exists (DLR-131)" as part of their reason to stay
throw-free or to keep a guard: `buffFires` in `src/hunt/buffEvaluation.ts`, `activateWard` in
`src/hunt/encounter.ts`, and `dealPileFor` in `src/warCouncil/encounterDeck.ts`. All three comments
were rewritten — comment prose only, zero behavioural diff — to state that a root boundary now
exists but that it replaces the whole app with the fallback panel rather than preventing a run from
being lost, so the guard or the throw-free discipline each function already had stays exactly as it
was. None of the three underlying `throw` statements changed.
