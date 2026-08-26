Part of [Run verdict UI](README.md).

# The slot machine on screen — choosing, reading, pulling

**DLR-116 is the ticket where a player first pulls a reel.** DLR-112 shipped the draw model with no
surface and DLR-113 gave it a Vault-driven odds seam; neither was reachable. This is the screen half.
The engine is [../hunt/the-slot-machine.md](../hunt/the-slot-machine.md).

Three files: `SlotMachinePanel.tsx` (renders), `useShopSlot.ts` (seeds, derives, commits),
`slotLabels.ts` (every string). `ShopPanel` mounts the panel and passes its props straight through
without reading one.

## The hook owns the seeding, and holds no strip

```ts
useShopSlot(run, vault, onRun): { view, selectMachine, pull }
```

Two `useState` values and nothing else: the chosen `SlotMachineId` (initialised to
`SLOT_MACHINE_IDS[0]`) and the last pull. **Everything else is derived during render**:

```
stripSeed = slotSeedFor(run.runSeed, machineId, run.encounterIndex)
machine   = drawVaultReelPool(vault, machineId, createSeededRng(stripSeed))
```

`run.encounterIndex` **is** the visit index — the shop is reachable exactly once per resolved
encounter, so no field was added for it. The strip is never stored, on `RunState` or anywhere else,
which is the invariant DLR-112's own module comment asks the next ticket to preserve.

It goes through `drawVaultReelPool` rather than `drawReelPool` directly, so the Vault's odds boost is
honoured through the defaulted `weightOf` seam DLR-113 built. **This is that function's first
production caller** — until now it was exercised by tests only.

A pull resolves with `pullMachine(machine, createSeededRng(spinSeedFor(stripSeed, run.slotPullsThisVisit)))`
and commits through `pullSlotMachine`. **`Math.random()` appears nowhere in this file**; the only call
in the whole seed path is `App.tsx` choosing `runSeed` once per run, beside the
`dealRound(…, Math.random)` already there.

### No effect, and how the stale result clears itself

There is no `useEffect`, timer, listener or `requestAnimationFrame` anywhere in this diff. The last
pull is stored **together with the `(machineId, visitIndex)` it belongs to** and rendered only while
both still match the current ones — so switching machines or advancing a fight drops the stale result
with no reset effect to write, and nothing to clean up on unmount. StrictMode's double-invocation
recomputes identical values, because every derivation is a pure function of `run` and `vault`.

### The commit is a functional update, and that was a review finding

`pull()` commits as:

```ts
onRun((live) => {
  if (slotPullRefusalFor(slotVisitStockFor(live)) !== null) return live
  return pullSlotMachine(live, resolved)
})
```

`onRun` is typed as a functional updater and `App.tsx` passes `setRun` straight into it. The first
implementation checked the refusal against the render's own closed-over `run` and committed the same
way — which reads like the stale-closure guard `handleBuy` and `handleDrinkFlask` use but is not one,
because both halves read the *same* closure. It was harmless only because everything downstream is a
pure function of `run` and the pull index, which is an accidental safety net rather than a structural
one. The Defender caught it; the fix makes the check and the commit happen against whatever state
React has live. `pullSlotMachine` throws a deliberate `RangeError` on a refused pull, and this is what
keeps a double-click off it.

## The panel computes nothing

Top to bottom inside one `<section aria-label={SLOT_SECTION_LABEL}>`:

1. **The machine chooser** — `role="radiogroup"` with the group label on the container, one
   `<button role="radio" aria-checked>` per machine. **Roving tabindex**: the selected control is the
   lone `tabIndex={0}`, arrow keys move *and* select, `Home`/`End` jump to the ends. It does **not**
   reuse `useRovingTabIndex` from `src/app/warCouncil/`: that hook implements the WAI-ARIA *tabs*
   pattern, where arrow keys move focus and activation is manual, and a `radiogroup`'s correct
   behaviour is the opposite — arrowing selects immediately. Selection reads without colour alone (a
   thicker border plus a marker glyph).
2. **The odds line** — `slotOddsText()`, built entirely from `slotOutcomeOdds()` and
   `expectedCardsPerPull()`.
3. **The strip** — a `<ul>` of eight `<li>`, one per template, face-up and always visible.
4. **The pull control** — one button, `disabled` when refused, with the reason in a `role="status"`
   line beneath and folded into the button's own accessible name.
5. **The last pull** — a `role="group"` showing the outcome, the three symbols, and one row per award
   at its tier. `SLOT_NO_PULL_YET` renders before the first pull, so an empty result area cannot be
   mistaken for a broken one — the rule `SHOP_CATEGORY_EMPTY` set on DLR-89 and which outlived it.

**The empty-collection guard is real and tested.** `machineIds.length === 0` returns before any
indexing and before the radiogroup renders. That is not defensive padding: the `Unassigned`-class trap
has been hit twice on this project, and its second instance was precisely a roving-tabindex probe
calling `isFocusable(0)` on an empty collection.

## One grammar for a buff, not two

Every buff this surface names goes through DLR-114's `src/app/warCouncil/buffLabels.ts`. A strip
symbol is a `BuffTemplate` and carries **no tier**, so `slotSymbolText` mints it at bronze with a
throwaway id purely for wording and returns `buffName(b) + ' — ' + buffConditionSentence(b)`; the
bronze is a wording device and claims nothing. A won award is a real `Buff` and gets the full
`buffLine(award)` — `Silver Bell-Taker (Momentum) — win a trick with Bells: +3
multiplier.` (`buffLine` took an `apCost` second argument until DLR-145 removed action points; the
award row passed `apCostOf(award)` and the line ended `2 AP.`) `slotLabels.test.ts` asserts `slotSymbolText`'s output against an independently
recomputed `buffName` / `buffConditionSentence` pair, which is what proves there is one grammar
rather than two.

**A duplicated tier word was caught and removed, DLR-142 (2026-08-25).** The award row used to
prepend its own `SLOT_TIER_LABEL[award.tier]` in front of `buffLine(...)` — a leftover from before
`buffLine` stated its own tier word — which read as `"Silver — Silver Bell-Taker..."` once `buffLine`
gained the `BUFF_TIER_WORD` prefix in the same ticket. The existing test only asserted the row's
text *contained* `buffLine(...)`'s output, which stayed true even duplicated, so it caught nothing.
`SLOT_TIER_LABEL` was removed from `slotLabels.ts` entirely (it had no other consumer) and the award
row now renders `buffLine(award)` alone; the test was rewritten to assert the row's
exact text so a reintroduced duplicate fails loudly.

## The three interaction rules DLR-116 decided

- **The odds are surfaced, and derived.** The strip is face-up and the sentence states all three
  outcome probabilities plus the expected cards per pull. DLR-112 chose a flat-uniform spin expressly
  so a player *can* read the strip and compute their own odds; hiding them throws away the reason the
  model is shaped that way. Deriving rather than transcribing stops a retuned `REEL_POOL_SIZE`
  leaving the screen quoting `1.6%` forever. *Whether four figures reads as clarity or as clutter is a
  copy judgement and the developer's; the fallback is to drop the expected-cards figure.*
- **An unaffordable pull is disabled and explained, never hidden.** The strip and the odds stay
  readable, so a player can see what they are saving for. `game-ux`: a decision's inputs stay on the
  face of the thing.
- **A drawn buff goes straight to the pile. There is no choose-one gate.** One tap, no confirm step —
  this is the screen's most repeated action, and a reroll re-spins the same strip with no cap, so a
  confirm would be a second click on every single pull. It is also arithmetic: 2.64 cards per pull is
  a per-pull yield that only holds if every award lands.

## Copy

`slotLabels.ts` is all placeholder wording, marked as such in its own header exactly as
`shopLabels.ts` is. Every figure is interpolated from the engine and never quoted, and both
`SLOT_OUTCOME_LABEL` and `SLOT_REFUSAL_MESSAGE` are `Record`s **total over their unions**, so a fourth
outcome or a second refusal code is a compile error here rather than a blank line on screen.

## Deferred / not yet verified

- **Nobody has seen this screen.** The browser pass was not requested on DLR-116. Whether the pared
  shop plus this section fits without scrolling or cropping at 1280×800, 1024×768, 1366×768 or 390×844
  is unverified, and jsdom cannot settle it — see [the shop screen](shop-screen.md#the-clipping-history-and-why-it-still-matters).
- ~~**A drawn buff still pays nothing when activated.**~~ **Fixed by DLR-125 on 2026-08-24** —
  `buffAccrual.ts` gained its caller, so a card won here is evaluated and paid. See
  [hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md). (This module's own code
  did not change; the claim it made about another module did.)
- **`Miser` fights this screen directly**, and this screen made the tension worse rather than better:
  `Miser` rewards unspent coins, and an uncapped 1-coin reroll is now the strongest coin sink in the
  game. Recorded as a design tension, not patched with UI.
