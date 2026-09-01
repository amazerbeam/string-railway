Part of [Run verdict UI](README.md).

# The slot machine on screen — reading, pulling, and watching it land

**DLR-116 is the ticket where a player first pulls a reel.** DLR-112 shipped the draw model with no
surface and DLR-113 gave it a Vault-driven odds seam; neither was reachable. This is the screen half.
The engine is [../hunt/the-slot-machine.md](../hunt/the-slot-machine.md).

**On 2026-09-01 it became an actual slot machine** — a cabinet with a marquee, three framed windows
whose reels travel and stop one after another, a payline, and a lever you pull. Before that it was a
radio group, a paragraph of odds, an eight-row text list and a `Pull` button; the developer's brief
was *"the slot machine needs to be an actual slot machine, 2 seconds for the whole animation is
fine"*, with a reference photograph of a classic cabinet. The anatomy came from that photograph; the
palette did not — it is the game's own brass and chamber-dark rather than casino red and yellow.

Eight files now. `SlotMachinePanel.tsx` (renders), `useShopSlot.ts` (seeds, derives, commits),
`slotLabels.ts` (every string), and five added by the cabinet: `SlotReel.tsx` (one window and its
drum), `useSlotSpin.ts` (the animation clock), `slotSpinConfig.ts` (its timings), `slotSymbols.ts`
(a template reduced to a reel face) and `SlotGlyph.tsx` (the three non-suit marks), plus
`SlotStripChips.tsx` for the strip. `ShopPanel` mounts the panel and passes its props straight
through without reading one.

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

1. **The marquee** — the lit sign on top of the cabinet. **At a one-machine roster it is a
   nameplate**: a `<span class="shop-cabinet-name is-plate">`, no radiogroup, no radios, no tab stop.
   **At two or more it is the chooser again** — `role="radiogroup"` with the group label on the
   container, one `<button role="radio" aria-checked>` per machine, **roving tabindex** with the
   selected control the lone `tabIndex={0}`, arrow keys moving *and* selecting, `Home`/`End` jumping
   to the ends. It does **not** reuse `useRovingTabIndex` from `src/app/warCouncil/`: that hook
   implements the WAI-ARIA *tabs* pattern, where arrow keys move focus and activation is manual, and
   a `radiogroup`'s correct behaviour is the opposite — arrowing selects immediately. Selection reads
   without colour alone (a lit plate, a brass edge, a marker glyph). The branch is on
   `machineIds.length`, so restoring a machine restores the control with no further edit, and
   `SlotMachinePanel.test.tsx` **keeps testing the keyboard model against an explicit two-machine
   roster** rather than letting it rot while nothing exercises it.
2. **The case** — three `SlotReel` windows with the payline laid over them, the price plate beneath,
   and the lever on the right shoulder. See *The cabinet* below.
3. **The strip** — `SlotStripChips.tsx`, eight glyph chips rather than eight sentences.
4. **The payout table** — `slotOddsRows()`, three rows best-first, plus `slotStripSummaryText()`.
5. **The last pull** — a `role="group"` showing the outcome and one row per award at its tier.
   **Nothing renders before the first pull.**

**The empty-collection guard is real and tested**, and there are now three of them: `machineIds.length`
is checked before any indexing and before either marquee form renders, `SlotReel` guards an undrawn
strip before `strip[index % strip.length]` (which would otherwise index on `NaN`), and
`SlotStripChips` returns `null` rather than an empty frame. That is not defensive padding: the `Unassigned`-class trap
has been hit twice on this project, and its second instance was precisely a roving-tabindex probe
calling `isFocusable(0)` on an empty collection.

## The cabinet, and the two seconds

**The developer's figure is `SPIN_TOTAL_MS = 2000`** — they asked for two seconds for the whole
animation, and it lives in `slotSpinConfig.ts` with every other timing. The rest of that file is a
placeholder split the developer owns: `REEL_STAGGER_MS` (320) is how much sooner each earlier reel
stops, `RESULT_REVEAL_MS` (260) is the beat the cabinet holds every reel still before the outcome
appears, and `REDUCED_MOTION_MS` (320) is the one short beat that replaces the travel entirely.
`reelStopMs(i, n)` is the only arithmetic: reel 3 lands at 2000ms, reel 2 at 1680ms, reel 1 at
1360ms.

### The drum is a transform, not a timer

`SlotReel.tsx` builds its column as `[...strip, ...strip, ...strip, landed]` — three whole passes of
the strip and then **the symbol this reel actually stopped on** — and animates a single CSS
`translateY` across it. Two consequences worth having:

- The motion is the **compositor's** job, so it stays smooth while React is idle. Swapping a symbol
  on a `setInterval` would have put every frame through a re-render.
- The reel **physically arrives at its result** rather than cutting to it. What is under the payline
  when the drum stops is the same template the engine resolved — verified in a browser by reading the
  three symbols on the payline and matching them against the awarded cards.

`key={spinId}` on the travelling column is load-bearing: it **remounts** the column per pull, which
restarts the travel from the top. Without it a second pull landing on the same three symbols shows an
unchanged transform and nothing moves at all.

At rest the column is simply **parked** at its landed offset with no animation attached. An earlier
cut applied the animation unconditionally, and the shop spun itself the moment it opened.

### `useSlotSpin.ts` — the one owner of every timer

Every `setTimeout` on this screen is registered in one ref'd array and cleared in one effect's
cleanup. That effect **schedules nothing**; it exists purely so an unmount mid-spin — leaving for the
next fight while the reels are still turning — leaves nothing behind to fire into a dead component.
`SlotMachineCabinet.test.tsx` asserts exactly that by unmounting mid-spin and advancing fake timers
past the end.

It sits neither in the panel (which stays a renderer of props) nor in `useShopSlot` (which is
deliberately effect-free and timer-free, and owns run state — a spin is presentation, discarded on
unmount).

A second lever press mid-spin **restarts** rather than layering a second set of timers over the
first, which would land reels out of order. The lever is also `disabled` while spinning, so the
common path never reaches that guard.

### The result is withheld until the reels agree

`resultVisible` is false from the lever press until `RESULT_REVEAL_MS` after the last reel lands.
This is the whole point of animating: a result readable at 200ms makes the remaining 1.8 seconds
decoration. The test asserts the outcome text is **absent** at `SPIN_TOTAL_MS - 1` and present after.

### The lever is the pull control

Not a button beside a picture of a lever — the `<button>` **is** the lever, so it keeps its 44px
target, its `:focus-visible` ring and `Enter`/`Space` for nothing. It rotates about its pivot boss on
press and stays down while the reels turn, so the object the action happened on is the object that
shows it. One tap, no confirm step, which is the rule the section below already sets.

### The match reads without colour or motion

A matched window gets a **brass ring** (an inset shadow, so the window does not resize) and its
**payline pip** fills from a hollow diamond to a solid one. The outcome line prefixes `◆◆◆` or `◆◆`.
So a still greyscale frame of a landed pull still shows which reels agreed — `game-ux`'s floor, and
the reason the ring is not simply a colour change.

`matchedReels` derives which windows matched from the landed symbols alone, the same comparison
`resolvePull` makes. On an all-different pull nothing is ringed, because nothing matched.

### Reduced motion

`useSlotSpin` reads `prefers-reduced-motion` itself and skips the stagger entirely — every reel lands
at once, after one short beat. `shopSlotReel.css` makes the same decision in CSS, so the timing and
the rendering agree rather than one of them animating alone. `matchMedia` is called defensively
(`typeof window.matchMedia === 'function'`), because jsdom does not implement it.

## The strip is chips now, not sentences

`SlotStripChips.tsx` renders each of the eight templates as a chip carrying the same three facts a
reel window carries — **suit glyph, family word, reward axis** — in the same shape, so the strip is
**compared** against the three windows rather than read. `slotSymbols.ts`'s `slotSymbolFace` is the
one reduction both use, and `SlotGlyph.tsx` holds the three non-suit marks so a chip and a window can
never disagree about what a symbol looks like. The suits still come from `SuitMark`; redrawing them
would be a second source of truth for what a suit is.

Eight rows of `Moon-Taker (Momentum) — win a trick with Moons` was a large part of what the developer
meant by *"a huge amount of info"*. **The compression hides nothing a decision needs**: each chip
carries the full `slotSymbolText` sentence on both its `title` and its `aria-label`, so the long form
is reachable by pointer and by screen reader, and it is not hover-only — the glyph, the family and
the axis are all on the chip's face. `game-ux` forbids putting a decision's inputs behind hover, and
this does not.

> **The suit tints on a chip are the LIGHTER `--wc-bells` family, not the reel face's
> `--wc-fig-*-mid` family.** A chip sits on the dark ground and a reel face on a light drum; the same
> token cannot serve both, and `game-ux` requires the ratio be measured on the ground it actually
> sits on rather than inherited from a token that passed somewhere else.

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

- **The odds are surfaced, and derived.** The strip is face-up and the payout table states all three
  outcome probabilities, with the expected cards per pull in the strip summary beside it. DLR-112 chose a flat-uniform spin expressly
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

- ~~**Nobody has seen this screen.**~~ **Seen and measured on 2026-09-01.** The screen was driven in
  Chrome against a harness mounting the real `ShopPanel`: the spin was watched frame by frame (reel 3
  still turning at 2009ms while reels 1 and 2 had stopped), the landed payline symbols were matched
  against the awarded cards, and the layout was measured at ten viewport sizes from 1920×1080 to
  360×640 with no page scroll and nothing clipped. jsdom still cannot settle a layout question, so a
  future change needs re-measuring — see
  [the shop screen](shop-screen.md#the-clipping-history-and-why-it-still-matters).
- **How the spin FEELS is unjudged.** The 320ms stagger and the 260ms reveal beat are placeholders
  the developer owns; only the two-second total is theirs already. Whether the deceleration reads as
  a wheel or as a slide is an eyes-on question no test can answer.
- ~~**A drawn buff still pays nothing when activated.**~~ **Fixed by DLR-125 on 2026-08-24** —
  `buffAccrual.ts` gained its caller, so a card won here is evaluated and paid. See
  [hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md). (This module's own code
  did not change; the claim it made about another module did.)
- **Strongbox is cut, so there is nothing to choose.** `SLOT_MACHINE_IDS` is one entry as of
  2026-09-01 — see [../hunt/the-slot-machine.md](../hunt/the-slot-machine.md) for why, and for what
  restoring it would take. The chooser and its keyboard model are retained in code and still tested;
  they are simply unreachable.
- **`Miser` fights this screen directly**, and this screen made the tension worse rather than better:
  `Miser` rewards unspent coins, and an uncapped 1-coin reroll is now the strongest coin sink in the
  game. Recorded as a design tension, not patched with UI.
