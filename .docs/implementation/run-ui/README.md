# Run verdict and shop UI — `src/app/run/`

**Status:** implemented
**Built by:** DLR-82, DLR-84, DLR-85, DLR-89, DLR-90, DLR-91

## Responsibility

The full-viewport surfaces the run layer owns, and every user-visible string it produces.

- **The verdict** (DLR-82) — shown whenever a fight or the run resolves: a headline, a supporting
  line, the deciding hand's trick split as a bar row, the carried health and coins, the run
  position, and the forward controls. Since DLR-85 the headline **names the opponent just beaten**,
  the primary control **names the opponent it leads to**, and a third `Map` control sits beside
  `Continue` and `Shop`.
- **The shop** (DLR-84, DLR-89) — reached by choice from the verdict: who is coming next, the purse,
  priced purchases with a stated reason under any that cannot be made, and one control that leaves
  for the next fight. Since DLR-85 that control **names the next opponent** rather than reading
  `Next fight`. Since DLR-89 the purchases sit in a **four-tab persistence-length ladder** — one-time
  use, fight-long, run-permanent, game-permanent — with the last shown and refused as "Coming soon",
  two shelves stating they are empty, and the heal outside the ladder entirely.
- **The path** (DLR-85) — one component, `RunPathScreen`, serving **two** surfaces: the start screen
  before fight one, and the map reached between fights. Inside it `RunMap` draws the whole run as one
  horizontal line — a tick per ordinary opponent, a block per stage boss, every node named, beaten
  nodes struck out and still present. See
  [the run map and the path screen](run-map-and-the-path-screen.md).

It also owns the run-position readout the card layer renders in its status band — since DLR-85 that
reads `Fight 1 of 25 — Aoife` rather than a bare `Fight 1 of 3` — and the `NEXT_FIGHT_LABEL` the
shop's leave button falls back to when no opponent name is known.

The module exists because of a play session. The terminal state before DLR-82 was a
`<p role="status">` sentence inside a tally table on the felt, with no control on it — visually
near-identical to the ordinary between-hands panel. The developer's note was that *"the player
didn't know when she beat the opponent or lose"*. The fix taken is a change of **channel** — a
distinct full-screen surface with a headline — rather than a change of wording, because rewording a
sentence in the same place would not fix "did not notice it".

**This module computes nothing.** Every figure, every refusal and every branch arrives as a prop
from `App.tsx`.

## Key types & exports

| Export                                                    | Purpose                                                                                                                                                                              | File           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `RunOutcomePanel` (default)                               | The verdict surface. Three distinguishable states plus the warned variant; renders what it is handed                                                                                  | `RunOutcomePanel.tsx` |
| `TrickTally`                                              | `{ taken: number; lost: number }` — the deciding hand's trick split, as two counts                                                                                                    | `RunOutcomePanel.tsx` |
| `runProgressText(index, count)`                           | 0-based index in, 1-based fight number out: `(0, 25)` → `'Fight 1 of 25'`. Read by the shop, by the panel for its own position line, and — since DLR-85 — **through `runPositionLabel`** rather than directly for the felt's status band, so the position is worded in exactly one place | `runLabels.ts` |
| `runHeadline(outcome, beatenName)`                        | `<name> defeated` / `YOU WIN` / `YOU LOSE`. An exhaustive `switch`, not a `Record` — a `Record` would need an unreachable entry to stay total. **DLR-85 widened it by one required parameter**, so the compiler flagged every call site; the intermediate-win case now names the opponent, falling back to DLR-82's `FIGHT WON` when the name is `undefined`. **Only that case takes a name** — a run-level verdict is about the run, not one opponent, so `YOU WIN` / `YOU LOSE` keep their wording | `runLabels.ts` |
| `runVerdictDetail(outcome, index, count, carried, nextName)` | The supporting line: where the run stands, and what health is carried into the next fight. **DLR-85 widened it by one required parameter** to name the coming opponent. The existing `runProgressText(...)` substrings are preserved intact, because three existing `toContain` assertions depend on them                                                                | `runLabels.ts` |
| `fightLabel(name)`                                        | `Fight <name>` — **one function, three call sites**: the start screen's begin action, the verdict's primary control, and the shop's leave control (DLR-85)                                                                                                                                                                                                             | `runLabels.ts` |
| `runGoalText(total)`                                      | `Beat all <total>` — the run's goal in words, from the configured length. Never a quoted number (DLR-85)                                                                                                                                                                                                                                                             | `runLabels.ts` |
| `runPositionLabel(index, count, name)`                    | `Fight 1 of 25 — Aoife` — the felt's status-band readout, now naming the opponent. Built **on** `runProgressText` so the position is worded once (DLR-85)                                                                                                                                                                                                             | `runLabels.ts` |
| `RunMap` (default)                                        | The path diagram. Ticks, blocks, names, three states — and computes nothing beyond a node count for `data-final` (DLR-85)                                                                                                                                                                                                                                            | `RunMap.tsx`   |
| `RunPathScreen` (default)                                 | Title + goal + `RunMap` + one action, inside `run.css`'s existing `.run-shell`. **One component for both the start screen and the between-fights map** — they differ only in title and action label (DLR-85)                                                                                                                                                          | `RunPathScreen.tsx` |
| `START_TITLE`, `MAP_TITLE`, `MAP_LABEL`, `MAP_BACK_LABEL`, `RUN_MAP_GROUP_LABEL` | `'The Hunt'` / `'The path'` / `'Map'` / `'Back'`, plus the path list's accessible name. All placeholder copy, all the developer's (DLR-85)                                                                                                                          | `runLabels.ts` |
| `tricksTakenText(taken, lost)`                            | The bar row's accessible name — states both figures, so the split never depends on colour                                                                                            | `runLabels.ts` |
| `unspentCoinsText(coins)`                                 | The warning sentence, naming the balance being walked past. Decides only the **words** — `canBuyAnything` decides whether to warn (DLR-84)                                            | `runLabels.ts` |
| `SHOP_LABEL`                                              | The verdict's shop control. The shop is **opt-in** (DLR-84). **`CONTINUE_LABEL` was DELETED by DLR-85** rather than left exported and unread — the unwarned primary control now reads `fightLabel(nextName)`, so the word "Continue" is gone from that row. Ten hits across four files changed together; a final-verification grep confirms zero remain | `runLabels.ts` |
| `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`               | The warning's own pair. All four must differ — a component test tells the warned verdict from the plain one by button name (DLR-84)                                                   | `runLabels.ts` |
| `TRICKS_TAKEN_LABEL`, `CARRIED_HEALTH_LABEL`, `NEXT_FIGHT_LABEL`, `NEW_RUN_LABEL` | The fixed strings. `NEXT_FIGHT_LABEL` was **re-sited to the shop's leave button** by DLR-84 — same value, new consumer                         | `runLabels.ts` |
| `ShopPanel` (default)                                     | The shop surface. Reads a `refusals` record and fires two callbacks (DLR-84). **DLR-89 rewired what it renders without changing `ShopPanelProps` at all**: it holds the selected shelf in `useState`, maps `SHOP_ITEMS_BY_CATEGORY` for the open rung plus `UNCATEGORISED_SHOP_ITEMS` outside the tabs, and no longer imports `SHOP_ITEMS` | `ShopPanel.tsx` |
| `ShopCategoryTabs` (default)                              | The `role="tablist"` of four shelves, in `SHOP_CATEGORIES` order. Presentational — asks `isShopCategoryAvailable` whether a rung refuses rather than naming `GamePermanent`. One tab stop with arrow keys inside it, via `useRovingTabIndex`; the refused rung carries `aria-disabled`, not the native attribute (DLR-89) | `ShopCategoryTabs.tsx` |
| `shopTabId`, `shopPanelId`                                | `(category) => string` — the ids pairing each tab to its panel, exported because **both** the tab and the tabpanel must name the same two. They live here rather than in the component because `react-refresh/only-export-components` forbids a component file exporting a non-component value (DLR-89) | `shopLabels.ts` |
| `SHOP_CATEGORY_LABEL`, `shopCategoryAccessibleName`       | The four tab labels, **total over `ShopCategory`** so a fifth rung is a compile error rather than a blank tab; and the accessible name, which folds the refusal reason in so a screen-reader user hears *why* on focus (DLR-89) | `shopLabels.ts` |
| `SHOP_TABLIST_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY`, `SHOP_ASIDE_LABEL` | The tablist's group label, the refused rung's stated reason, the empty-shelf sentence, and the heading over the block outside the ladder (DLR-89) | `shopLabels.ts` |
| `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`, `PURCHASE_REFUSAL_MESSAGE` | The catalogue's copy and the three refusal sentences. All three `Record`s are **total over their union**, so a new item or reason code is a compile error here (DLR-84)          | `shopLabels.ts` |
| `priceText`, `shopItemAccessibleName`, `nextOpponentText` | Prices read from `priceOf` and never quoted; the accessible name folds in the refusal; the opponent line reads sensibly with an `undefined` name (DLR-84)                              | `shopLabels.ts` |
| `SHOP_TITLE`, `SHOP_COINS_LABEL`, `SHOP_HEALTH_LABEL`, `SHOP_SLOTS_LABEL`, `SHOP_PURSE_GROUP_LABEL`, `SHOP_NOTHING_TO_BUY_HINT` | The shop's fixed strings (DLR-84)                                                          | `shopLabels.ts` |

**All copy in both files is placeholder — the developer's to rewrite**, marked as such in each
file's header.

## How it works

- [The verdict panel](verdict-panel.md) — the three outcomes and how they read without colour, the
  `Continue` / `Shop` pair and why the shop is opt-in, the unspent-coin warning as an in-place swap
  rather than a modal, the grouped trick bars and why they cannot be chronological, and the shell
  (DLR-82, DLR-84).
- [The shop screen](shop-screen.md) — why it computes nothing and what the `refusals` prop buys, the
  three ways a refusal reads, the purse row, why no price is ever a literal, and the keyboard
  contract (DLR-84); plus the **four-shelf tablist**, why the refused rung is `aria-disabled` rather
  than `disabled`, the `Escape` double-fire trap the tablist had to be designed around, and the
  **viewport-clipping defect and the two fixes that did not work** (DLR-89).
- [The run map, and the one screen that serves both the start and the map](run-map-and-the-path-screen.md)
  — why one component serves two surfaces, the `ol > li > ol > li` nesting and why it has to be that,
  the path as a status display with zero tab stops, how the three states read without colour, the AC3
  layout defect that every test passed through, and **the AC11 crop that is this contract's one unmet
  criterion** (DLR-85).

## Rules & invariants enforced

- **No panel in the module computes anything.** `outcome`, `canContinue`, `carriedHealth`, `coins`,
  `warning`, `refusals`, `beatenName`, `nextName`, `stages`, `goalText`, `actionLabel`, the counts and
  the tallies are all props. The only local expressions are the verdict attribute string, the bar array
  built from two counts, and `RunMap`'s node count for `data-final`. **DLR-89 added the module's one
  piece of local state** — `ShopPanel`'s selected shelf — which is presentation, not a rule: it
  re-derives nothing, and the grouping and the refusal it renders both come from `src/hunt/`.
- **No component names the refused rung or groups the catalogue itself** (DLR-89). `ShopCategoryTabs`
  asks `isShopCategoryAvailable`; `ShopPanel` reads `SHOP_ITEMS_BY_CATEGORY` and
  `UNCATEGORISED_SHOP_ITEMS` and never the flat `SHOP_ITEMS`. Two final-verification greps guard both;
  their only surviving hits are a doc comment and `SHOP_CATEGORY_LABEL`'s key for that rung, which is a
  copy table total over the union rather than a branch.
- **The path adds no tab stops**, and a spec asserts it. Nothing on it is clickable, because route
  choice is out of scope — so there is no roving tabindex here, and twenty-five tab stops on
  unclickable glyphs would breach `game-ux`'s interaction-cost threshold rather than satisfy its
  keyboard one (DLR-85).
- **The module has exactly one roving tabindex, and it is the shop's tablist** (DLR-89). It reuses
  `useRovingTabIndex` from `src/app/warCouncil/` rather than re-implementing the mechanism, and it
  respects that hook's untyped `querySelectorAll('button')` invariant — the tablist container holds
  the four tab buttons and nothing else clickable, with the coming-soon `<p>` last and not a button.
  Its `onCancel` is a **deliberate no-op**, because the hook does not stop propagation and `.shop`
  already handles `Escape`; wiring it through would fire `advanceRun` twice from one keypress.
- **There is exactly one full-viewport shell in the module.** `run.css`'s `.run-shell` is reused by
  every surface including both new ones; `runMap.css` defines no second shell (DLR-85).
- **No rule is re-derived at a call site.** The shop's disabled controls read the same `refusalFor`
  result that `buyFromShop` throws on and that `canBuyAnything` folds — one predicate, four readers.
  See [../hunt/coins-and-the-shop.md](../hunt/coins-and-the-shop.md).
- **No effect, no timer, no listener** anywhere in the module — every control is a plain `onClick`,
  and the two `Escape` handlers are `onKeyDown` on elements React already owns. The warning is
  deliberately an in-place swap rather than a modal precisely so it needs no focus trap and no
  document-level key listener.
- **All copy lives in `runLabels.ts` / `shopLabels.ts`**, never inline in a component, matching
  `warCouncil/labels.ts`'s convention. Each surface owns its own file, so the felt and the shop can
  be reworded independently.
- **No tuning value is quoted.** Prices come from `priceOf`, the heal figure is interpolated from
  `HEAL_HEALTH_RESTORED`; a final-verification grep guards it.
- **No `100vh` / `100vw`** anywhere in `run.css`, `shop.css` or `runMap.css`; a final-verification grep
  guards it. **Fitting inside that shell is a separate matter from declaring it, and the path does not
  currently fit** — see Deferred.
- **`.shop-panel` is the module's one scoped scroll region**, and it is justified rather than
  incidental: the catalogue is unbounded while the viewport is not (DLR-89). Everything a purchase
  decision needs stays outside it. It works because `.shop` is capped by a **definite** length —
  `calc(100dvh - 2 * clamp(1rem, 4vmin, 3rem))`, mirroring `.run-shell`'s padding — and the panel is
  the only `flex: 1 1 auto; min-height: 0` child while every sibling is `flex: 0 0 auto`. A
  percentage cap does **not** work here and reads as a silent no-op; see
  [the shop screen](shop-screen.md).
- **A state never reads in colour alone** — the refused purchase card is dashed-edged as well as
  dimmed, the warning is a dashed bracket, and a lost trick bar is hatched and outlined as well as
  red.
- Component tests query by **accessible role and label** (`getByRole('button', { name })`,
  `getByRole('group', { name })`), per this project's testing posture. No `data-testid` exists here.
- File sizes, measured after DLR-89 with `(Get-Content <file>).Count`: `run.css` 173,
  `RunOutcomePanel.tsx` 175, `runMap.css` 168, **`shop.css` 387**, `ShopPanel.tsx` 202,
  `ShopCategoryTabs.tsx` 92, `runLabels.ts` 112, `RunPathScreen.tsx` 56, `RunMap.tsx` 65,
  `shopLabels.ts` 95 — all under the 400-line budget, but **`shop.css` is now within 13 lines of it**.
  It carries heavy explanatory comments and per-state selectors for two surfaces' worth of rules; the
  next contract to add to it should expect to split it rather than squeeze. Measure with
  `(Get-Content <file>).Count`, never `Measure-Object -Line`, which drops blank lines and has hidden a
  real breach on this project before.

## Deferred / not yet implemented

- **The trick bars are not in play order** — the engine keeps no per-trick history. See
  [the verdict panel](verdict-panel.md).
- **The bars show the deciding hand only**, not the whole fight; no per-fight trick accumulator
  exists.
- **The felt's hand tally does not carry onto the verdict.** DLR-82 deleted the terminal panel that
  showed health lost and health dealt; only the trick split moved across. If those two figures are
  wanted here they join `TrickTally` — flagged in the contract as the developer's call.
- **All copy is placeholder**, across all three surfaces, and every `clamp()` bound and hue in all
  three stylesheets is an unchosen tuning value. In `runMap.css` the two that matter most are the
  **name font size** and the **−52° angle**, since those are what decide whether twenty-five names fit
  at a narrow viewport — see the AC11 entry above.
- **The path crops silently below about 1088px of usable width — AC11 is NOT met** (DLR-85). This is
  the contract's one unmet acceptance criterion, and the failure mode is the bad one: the shell is
  `overflow: hidden`, so nodes past the right edge are **cropped rather than scrolled**, with nothing on
  screen to say so. Measured live: 25/25 nodes at 1280×800, **21/25 at 1024×768, 16/25 at 768×1024, and
  14/25 at 500×844** — the last losing Diarmuid, the title, and half the action button. The three honest
  fixes are a **smaller name font, a steeper name angle, or letting the path itself be the one
  horizontally-scrolling region** (which `game-ux` permits if scoped and justified); all three are the
  developer's to choose, so none was applied. Widths below 500px were not directly observable and would
  be worse. See [the run map and the path screen](run-map-and-the-path-screen.md).
- **The shop names the next opponent now — CLOSED** (DLR-85). It read "The Monarch" on every fight of
  the run; `App.tsx` now feeds `nextOpponentName` from `RUN_ENCOUNTERS` instead of from
  `quarryCharacterInfo(SLICE_QUARRY_CHARACTER)`, which was a real defect fix rather than a copy change.
  `ShopPanelProps` did not change shape — `nextOpponentName: string | undefined` already existed, and
  `NEXT_FIGHT_LABEL` remains the fallback.
- **The run map has a home — CLOSED, and not the one DLR-84 predicted** (DLR-85). DLR-84 recorded that
  the map would mount **into `ShopPanel`**. It did not: the developer settled it at DLR-85's planning
  gate as **its own surface**, reached from a third `Map` control beside `Continue` and `Shop`, with the
  same `RunPathScreen` also serving as the start screen. `ShopPanel` was not touched by the change
  beyond its leave-button label.
- **The fight screen still calls the opponent "The Monarch"** (DLR-85, deliberate). The run-level
  surfaces are named, and **the Quarry's health bar was closed on 2026-08-17** — it reads
  `Aoife’s health` via `quarryHealthLabel` in `src/app/warCouncil/labels.ts`, threaded down as a
  pre-worded string exactly as `runLabel` is. **`QuarryDossier` is the remainder**, along with the "What
  the Quarry holds" heading beside it. So a player still sees "Aoife" on the map and the bar, and "The
  Monarch" in the dossier of the same fight. Whether to close that now is **the developer's call**.
- **Whether the map is worth the extra click from the verdict** is unmeasured, as is whether five
  stages of four ticks and a block read as "five stages" **without counting** (DLR-85). Both are feel
  questions no test can answer.
- **Whether `'<name> defeated'` still lands as a win** (DLR-85). It replaced `FIGHT WON`, so it now
  carries the whole "you won that one" signal on its own. `FIGHT WON` survives only as the fallback for
  an `undefined` name, which production never passes.
- **Whether the start screen's button should read `Fight Aoife` or `Begin run`** (DLR-85). AC1 asked for
  "a single action to begin the run" and AC8 asked that continue actions name their opponent; the
  contract resolved that in AC8's favour, with the title carrying the "this is the start" framing.
- **Whether the warning is a safety net or a nag** is unmeasured. At a 1-coin payout against 1-coin
  prices it fires on every visit where anything is unspent. A threshold, or removing it, is one line
  in `App.tsx`.
- **Whether `Escape` in the shop should advance the run** — it currently does, because it is wired
  to the same `onLeave` as the leave button. The developer's call, and **still open after DLR-89**,
  which deliberately avoided making it worse: passing the tablist hook's `onCancel` through to
  `onLeave` would have fired `advanceRun` twice from one keypress. A spec now guards that it fires
  exactly once.
- **The item cards inside a shop panel have no roving tabindex, and that becomes a `game-ux` breach
  once a shelf holds about five cards** (DLR-89). One card sits in a panel today, so building the
  mechanism now would be speculative and untestable against real behaviour — but the shelves are
  expected to grow, so this is a **named obligation on the three follow-on item tickets**, not a
  closed question. The mechanism already exists in `useRovingTabIndex` and `.shop-panel` is the right
  container to attach it to. Building it now costs one component test and removes the chance that
  three separate item tickets each assume another one did it.
- **Two shop shelves are empty by design, pending their items** (DLR-89, narrowed by DLR-91):
  run-permanent states "Nothing on this shelf yet." and is selectable; game-permanent is refused with
  "Coming soon." and nothing is designed for it at all. **Fight-long is no longer one of them** — DLR-91
  put **Poison Guard** on it, at the cost of one purse cell and no item-rendering change whatsoever, which
  is the second time the ladder has paid off. **Whetstone** is the item still to come, on its own ticket.
- **Whether the shop's tightened spacing reads as intentional rather than squeezed** (DLR-89). Closing
  the viewport-clipping defect meant tightening seven spacing values and letting `.shop-panel` shrink
  to as little as 63px at a 600px-tall viewport, where it shows part of one card and scrolls. The
  button is on screen at every size measured; whether the result *looks* right is the developer's eye,
  and `.shop-panel`'s `max-height` and `.shop-grid`'s `minmax()` floor are the two values that decide
  it. See [the shop screen](shop-screen.md).
- **Whether the shop's selected shelf should survive leaving and re-entering** (DLR-89). It does not:
  local state, reset on mount, defaulting to one-time use. Nothing asked otherwise, and the
  alternative means lifting the selection into `App.tsx`.
- **The tablist's arrow-key anchor can go stale after a mouse click** (DLR-89, **known residual**).
  `useRovingTabIndex` tracks its own internal index and only advances it on a keypress, so clicking a
  tab and then pressing an arrow key can move focus relative to that stale index rather than the tab
  just clicked — it self-corrects on the next `Home`/`End`. Which tab is *marked* as the tab stop was
  fixed (it derives from the selected prop, and a spec guards it); the hook's internal anchor was not,
  because closing it properly means changing a hook three components share. Logged rather than fixed.
- **Whether a full surface beats an overlay** over the frozen felt is a feel question the contract
  answered one way (full surface, because the observation was "she did not notice") and left open to
  revision.
- **No animation or transition** into either surface — each replaces what preceded it immediately.
