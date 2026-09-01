# Tasks: Every card movement animates — one shared card-motion system

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-09-01

**Goal:** Turn DLR-156's single proven card flight into the game's only way a card moves — one shared primitive with a flip, a stagger, a reduced-motion path and one token block — and wire it to all seventeen animated movements the inventory found.

**Spec:** `plan.md` in this folder. **Inventory:** `card-movement-inventory.md` in this folder — the authoritative list of what moves, from where, to where, and which movements are deliberately instant. **Layout and pacing reference:** `mockup.html` in this folder, and `.claude/contract/archive/DLR-156-roll-over-damage-model/ui-notes.md` §2 and §6.

---

## File map

**Created:**
- `src/app/warCouncil/warCouncilMotion.css` — the single motion token block (AC10) and the `.wc-card-flyer` layer rule
- `src/app/warCouncil/cardMotionConfig.ts` — reads the six motion tokens live, with documented fallbacks
- `src/app/warCouncil/cardPlacement.ts` — PURE: where every card is, and what changed between two states
- `src/app/warCouncil/cardMotionPlan.ts` — PURE: turns a diff into a staggered, flip-aware schedule
- `src/app/warCouncil/MotionAnchors.tsx` — the place registry and the `arriving` set
- `src/app/warCouncil/useCardMotion.ts` — the shared primitive (renamed and generalised from `useCardFlight.ts`)
- `src/app/warCouncil/useCardMotionDriver.ts` — diffs `RoundState` across renders and runs the primitive
- `src/app/warCouncil/useTableCardMotion.ts` — M1's pre-commit orchestration, lifted out of `WarCouncilTable.tsx`
- `src/app/warCouncil/useBuffCardMotion.ts` — M15/M16, the buff going up to the riding strip and coming back
- `src/app/warCouncil/__tests__/cardPlacement.test.ts`
- `src/app/warCouncil/__tests__/cardMotionPlan.test.ts`
- `src/app/warCouncil/__tests__/cardMotionConfig.test.ts`
- `src/app/warCouncil/__tests__/MotionAnchors.test.tsx`
- `src/app/warCouncil/__tests__/useCardMotion.test.tsx` — replaces `useCardFlight.test.tsx`
- `src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx`
- `src/app/run/__tests__/ShopCardMotion.test.tsx`

**Modified:**
- `src/app/warCouncil/warCouncil.css:388-397` — `.wc-card-flyer` rule removed (file is at **405 lines**, over budget)
- `src/app/warCouncil/warCouncilResolve.css:14` — `--wc-flight` declaration removed, now owned by `warCouncilMotion.css`
- `src/app/warCouncil/WarCouncilRound.tsx` — imports the new stylesheet, mounts `MotionAnchorProvider` and `useCardMotionDriver`
- `src/app/warCouncil/WarCouncilTable.tsx:109-125,215-243` — flight orchestration moves to `useTableCardMotion` (file is at exactly **400 lines**)
- `src/app/warCouncil/useResolveHold.ts:12` and `useTrickDwell.ts:8,37,44` — docblock references to `useCardFlight`
- `src/app/warCouncil/HandFan.tsx`, `TrickWell.tsx`, `DecreePile.tsx`, `DiscardPile.tsx`, `RoundStatusBand.tsx`, `AbilityPrompt.tsx`, `BuffGallery.tsx`, `BuffRidingList.tsx` — each registers its place(s)
- `src/app/run/ShopHeld.tsx`, `src/app/run/ShopPanel.tsx` — M21/M22
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — the `useCardFlight` reference

**Deleted:**
- `src/app/warCouncil/useCardFlight.ts` — renamed to `useCardMotion.ts`
- `src/app/warCouncil/__tests__/useCardFlight.test.tsx` — renamed to `useCardMotion.test.tsx`

**Developer decides or observes:**
- `--wc-flip-at` in `warCouncilMotion.css` — AC6's in-transit-vs-on-landing call, as a 0–1 fraction of the flight. Ships as `0.5`. Compare against `1.0` on the Quarry's play in `mockup.html`.
- `--wc-flight-stagger` — the number that decides whether the deal reads as a beat or as a tax. Ships as `70ms`. Six cards at 70ms is 350ms of stagger on top of the 380ms flight, every hand.
- `PILE_COLLAPSE_THRESHOLD` in `cardMotionPlan.ts` — above how many cards a group collapses to one representative flight. Ships as `3`.
- `--wc-flight-lift` (`34px`) and `--wc-flight-tilt` (`4deg`) — transcribed unchanged from DLR-156's literals; tunable for the first time.
- **Whether seventeen animated movements is the right amount of motion at all.** The ticket predicts the first playable version is too slow. Play a full hand and judge the deal, the trick close, and the discard swap in particular.

---

## Phase 1 — The motion tokens and the two pure modules

Groundwork with no behaviour change: one stylesheet gains the tokens, two pure modules gain the logic that has a real invariant, and one reader binds them together. Nothing calls any of it yet, so the phase ends type-checking with the app behaving exactly as before. Doing the pure work first is deliberate — it is the only part testable without a renderer, and getting the placement differ wrong invisibly would poison every phase after it.

### Task 1: Move every motion number into one token block

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/warCouncilMotion.css`
- Modify: `src/app/warCouncil/warCouncil.css:388-397` (remove the `.wc-card-flyer` rule and its comment), `src/app/warCouncil/warCouncilResolve.css:14` (remove the `--wc-flight` declaration), `src/app/warCouncil/WarCouncilRound.tsx` (import the new stylesheet alongside the others)

- [ ] **Step 1: Create the token block, transcribing the values from `mockup.html`'s `:root`**

`warCouncilMotion.css`. Every value is a PLACEHOLDER — say so, the way `warCouncilResolve.css:8` already does.

```css
/* DLR-157 AC10 — the ONE place any card movement's duration, distance or easing is stated.
   `cardMotionConfig.ts` reads all six live; nothing else in `src/` restates any of them.
   Transcribed from `mockup.html`'s tuning rail. Every value is a PLACEHOLDER — the
   developer's to set by playing, not chosen here. */
:root {
  /* MOVED from `warCouncilResolve.css`, value unchanged — one card's travel time. */
  --wc-flight: 380ms;
  /* AC5 — the single stagger between requests in one group. */
  --wc-flight-stagger: 70ms;
  /* The arc's peak lift. Was a bare `-34` literal in `useCardFlight.ts`. */
  --wc-flight-lift: 34px;
  /* The mid-flight rotation. Was a bare `-4deg` literal at the same line. */
  --wc-flight-tilt: 4deg;
  /* Was a bare `cubic-bezier(...)` string literal in `useCardFlight.ts`. */
  --wc-flight-ease: cubic-bezier(0.3, 0.75, 0.25, 1);
  /* AC6 — DEVELOPER DECISION, shipped unchosen. The fraction of the flight the flip
     lands on: 0.5 turns the card in mid-air, 1 turns it as it lands. Recorded once
     here and applied to every movement whose face changes. */
  --wc-flip-at: 0.5;
}

/* MOVED from `warCouncil.css` (which was at 405 lines, over the 400 budget). The flight
   layer: `useCardMotion.ts` appends every clone here, on `document.body`, so no clone is
   ever clipped by the hand's or the felt's `overflow: hidden` (`ui-notes.md` §2). Only the
   per-flight `left`/`top`/`width`/`height` are set inline. */
.wc-card-flyer {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  will-change: transform;
  transform-style: preserve-3d;
}
```

- [ ] **Step 2: Remove both moved declarations from their old homes and import the new sheet**

Delete `warCouncil.css:388-397` (the `.wc-card-flyer` rule and its DLR-156 comment) and `warCouncilResolve.css:14` (`--wc-flight: 380ms;`), leaving `warCouncilResolve.css`'s other four tokens in place. Add `import './warCouncilMotion.css'` to `WarCouncilRound.tsx` beside its existing stylesheet imports.

- [ ] **Step 3: Confirm each moved name now has exactly one declaration**

Run: `Get-ChildItem src\app -Recurse -Include *.css | Select-String -Pattern "--wc-flight:|\.wc-card-flyer \{"`
Expected: exactly two hits, both in `src\app\warCouncil\warCouncilMotion.css`.

- [ ] **Step 4: Confirm the relieved file is back under budget**

Run: `(Get-Content src\app\warCouncil\warCouncil.css).Count; (Get-Content src\app\warCouncil\warCouncilMotion.css).Count`
Expected: the first is below 400; the second is well below 400.

### Task 2: Read the six tokens live, with documented fallbacks

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/cardMotionConfig.ts`
- Test: `src/app/warCouncil/__tests__/cardMotionConfig.test.ts`

- [ ] **Step 1: Write the failing test for a missing, an unparseable and a negative token**

`cardMotionConfig.test.ts`, under the `node` project (no DOM needed — stub `getComputedStyle` and `document` on `globalThis`). Assert: a well-formed token is read; an absent token yields the documented fallback; `NaN` yields the fallback rather than propagating; a zero or negative duration yields the fallback; `--wc-flight-stagger` of `0` is **kept** (zero stagger is a legitimate setting, unlike a zero duration); `--wc-flip-at` is clamped into `[0, 1]`.

Run: `npx vitest run src/app/warCouncil/__tests__/cardMotionConfig.test.ts`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Implement the reader, following `useCardFlight.ts:16-24` exactly**

```ts
export interface CardMotionTiming {
  readonly durationMs: number
  readonly staggerMs: number
  readonly liftPx: number
  readonly tiltDeg: number
  readonly easing: string
  /** 0..1, clamped. AC6's in-transit-vs-on-landing call as a single number. */
  readonly flipAt: number
}

export function cardMotionTiming(): CardMotionTiming
export function prefersReducedMotion(): boolean
```

Each fallback is a `const FALLBACK_*` with a docblock stating it is a placeholder transcribed from `warCouncilMotion.css`, and that the stylesheet is the real source — the same wording `useCardFlight.ts:3-13` already uses. `prefersReducedMotion` guards `typeof window.matchMedia === 'function'` the way `useCardFlight.ts:103` and `useSlotSpin.ts:63` both do.

Run: `npx vitest run src/app/warCouncil/__tests__/cardMotionConfig.test.ts`
Expected: passes; Vitest reports 0 failed.

### Task 3: Say where every card is, and what changed

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/cardPlacement.ts`
- Test: `src/app/warCouncil/__tests__/cardPlacement.test.ts`

- [ ] **Step 1: Write the failing test for the placement invariants**

Build `RoundState` fixtures with the existing helpers in `src/app/warCouncil/__tests__/` (follow `resolutionTestHelpers.ts`'s pattern). Assert:

- `placementsOf` is **total** — every card in the draw pile, the spent pile, both hands, the current trick and the decree appears exactly once, and the map's size equals the sum of those six.
- `faceAt` returns `'down'` for `DrawPile`, `SpentPile` and `QuarryHand`, and `'up'` for every other kind.
- `diffPlacements` on two identical maps returns `[]`.
- The trick-close case (inventory **M3+M4**): moving both played cards to the spent pile *and* drawing one refill in the same step yields exactly three movements — two `TrickWell → SpentPile` and one `DrawPile → PlayerHand`.
- The discard case (**M9+M10**): discarded cards move `PlayerHand → DrawPile`, **not** to a spent or discard pile — this is the seed-list error the inventory records.
- A card present in `next` but absent from `prev` yields no movement.

Run: `npx vitest run src/app/warCouncil/__tests__/cardPlacement.test.ts`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Implement the pure module**

```ts
export const PlaceKind = {
  PlayerHand: 'playerHand',
  QuarryHand: 'quarryHand',
  TrickWell: 'trickWell',
  DrawPile: 'drawPile',
  SpentPile: 'spentPile',
  DecreePlate: 'decreePlate',
  AbilityPrompt: 'abilityPrompt',
  BuffGallery: 'buffGallery',
  RidingStrip: 'ridingStrip',
  HeldTray: 'heldTray',
} as const
export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind]

export interface PlaceId {
  readonly kind: PlaceKind
  readonly slot?: string
}

export interface CardMovement {
  readonly cardKey: string
  readonly from: PlaceId
  readonly to: PlaceId
}

export function placementsOf(state: RoundState): ReadonlyMap<string, PlaceId>
export function diffPlacements(
  prev: ReadonlyMap<string, PlaceId>,
  next: ReadonlyMap<string, PlaceId>,
): readonly CardMovement[]
export function faceAt(place: PlaceId): 'up' | 'down'
```

No React import and no DOM access — this module is pure so it can be tested without a renderer. Card keys come from the existing `cardKey` helper in `src/app/warCouncil/`; do not invent a second key form.

Run: `npx vitest run src/app/warCouncil/__tests__/cardPlacement.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 4: Turn a diff into a staggered, flip-aware schedule

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/cardMotionPlan.ts`
- Test: `src/app/warCouncil/__tests__/cardMotionPlan.test.ts`

- [ ] **Step 1: Write the failing test for the stagger, the flip and the pile collapse**

Assert: *n* movements yield delays `0, s, 2s, …, (n-1)s` for a given stagger (AC5); a stagger of `0` yields every delay `0`; `flip` is true exactly when `faceAt(from) !== faceAt(to)` (AC6) — check the Quarry's play (`QuarryHand → TrickWell`, down→up, flips) against the player's (`PlayerHand → TrickWell`, up→up, does not); a group of more than `PILE_COLLAPSE_THRESHOLD` movements sharing one source **and** one destination pile collapses to a single request (inventory **M8**, **M14**); a group at or under the threshold does not collapse; `hide` is `'from'` for a departure and `'to'` for an arrival.

Run: `npx vitest run src/app/warCouncil/__tests__/cardMotionPlan.test.ts`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Implement the pure planner**

```ts
export interface CardMoveRequest {
  readonly from: PlaceId
  readonly to: PlaceId
  readonly hide: 'from' | 'to'
  readonly flip: boolean
  readonly delayMs: number
  /** Absent for a collapsed pile group, which flies one representative rather than n cards. */
  readonly cardKey?: string
}

/** PLACEHOLDER, not a chosen value — the developer's to set. Above this many movements sharing
 *  one source and one destination pile, the group flies as ONE representative card back:
 *  thirteen simultaneous flights at the end of a hand is the tempo failure DLR-157's own risk
 *  section predicts. */
export const PILE_COLLAPSE_THRESHOLD = 3

export function planMovements(
  movements: readonly CardMovement[],
  staggerMs: number,
): readonly CardMoveRequest[]
```

No React import and no DOM access.

Run: `npx vitest run --project node; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 2 — The registry and the shared primitive

The primitive itself. `useCardFlight` becomes `useCardMotion`, keeping DLR-156's three-path landing race verbatim and gaining a request list, a stagger, a flip and a reduced-motion short circuit. The registry that lets a movement name a *place* rather than hand over an element goes in alongside it. By the end of this phase M1 runs through the new primitive with no behaviour change and every other movement is still a teleport — a genuine stopping point, since the one shipped animation is the one under test.

### Task 5: Register every place a card can be

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/MotionAnchors.tsx`
- Test: `src/app/warCouncil/__tests__/MotionAnchors.test.tsx`

- [ ] **Step 1: Write the failing test for register, resolve and unmount**

Assert: a component calling `useMotionAnchor(place)` is resolvable by `resolve(place)` after mount; it resolves to `null` after unmount (the ref callback must unregister, or the registry leaks a detached node); two places differing only by `slot` resolve to different elements; `resolve` on an unregistered place returns `null` rather than throwing; `arriving` starts empty. Query by accessible role and label.

Run: `npx vitest run src/app/warCouncil/__tests__/MotionAnchors.test.tsx`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Implement the provider, the hook and the key form**

```ts
export type MotionAnchorKey = string
export function anchorKeyFor(place: PlaceId): MotionAnchorKey

export interface MotionAnchors {
  readonly register: (key: MotionAnchorKey) => (el: HTMLElement | null) => void
  readonly resolve: (place: PlaceId) => HTMLElement | null
  /** Card keys currently flying INTO a slot. That slot renders laid out but invisible (AC7). */
  readonly arriving: ReadonlySet<string>
  readonly setArriving: (keys: ReadonlySet<string>) => void
}

export function MotionAnchorProvider(props: { children: ReactNode }): ReactElement
export function useMotionAnchors(): MotionAnchors
export function useMotionAnchor(place: PlaceId): (el: HTMLElement | null) => void
```

The element map lives in a `useRef<Map<...>>` inside the provider — **never** module-level mutable state, which survives HMR and leaks between tests in one file. The ref callback registers on a non-null element and deletes on `null`, so React's own unmount call is what unregisters.

Run: `npx vitest run src/app/warCouncil/__tests__/MotionAnchors.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 6: Generalise the primitive from one flight to a group

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useCardMotion.ts`
- Delete: `src/app/warCouncil/useCardFlight.ts`
- Test: `src/app/warCouncil/__tests__/useCardMotion.test.tsx` (carrying over every case from `useCardFlight.test.tsx`)
- Delete: `src/app/warCouncil/__tests__/useCardFlight.test.tsx`
- Modify: `src/app/warCouncil/useResolveHold.ts:12`, `src/app/warCouncil/useTrickDwell.ts:8,37,44` — the docblock references to the old name

- [ ] **Step 1: Carry over the existing spec unchanged, then add the new cases**

Every case in `useCardFlight.test.tsx` (lines 58, 67, 78, 91, 103 — the five `fly` calls) must survive as a `move` call with a one-request list, with the same assertions: `onfinish` lands; the timer lands when `onfinish` never fires; `visibilitychange` lands a flight frozen by a hidden tab; the landing is idempotent across all three paths; unmount tears down **without** calling the landing callback. Then add:

- A three-request list calls `onAllLanded` **exactly once**, after the last request lands.
- Requests start at `0, s, 2s` with fake timers (AC5).
- Under `prefers-reduced-motion` (stub `matchMedia`), **no clone is appended to `document.body`**, no timer is set, and `onAllLanded` fires synchronously (AC8).
- A request whose `from` or `to` resolves to `null` still lands and still counts toward `onAllLanded` — no destination is left empty.
- A request with `flip: true` runs a second animation on the clone; one with `flip: false` does not.
- With `hide: 'to'`, the destination element carries `visibility: hidden` during the flight and has it cleared on landing; with `hide: 'from'`, the source does (AC7).

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotion.test.tsx`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Write the hook, preserving DLR-156's docblocks rather than re-deriving them**

```ts
export interface CardMotion {
  readonly move: (requests: readonly CardMoveRequest[], onAllLanded: () => void) => void
  readonly inFlight: boolean
}
export function useCardMotion(): CardMotion
```

Carry over verbatim from `useCardFlight.ts`: the three-path `land()` race and its reasoning (the hidden-tab defect), the `ActiveFlight` teardown that closes the guard without calling the callback, the feature detection on `typeof from.animate !== 'function'`, and the `startBox.width > 0 ? … : 1` scale guard. What changes: `fly(from, to, onLanded)` becomes `move(requests, onAllLanded)`; the ref holds an array of live flights rather than one; each request gets its own stagger `setTimeout`, released in the same cleanup; `lift`, `tilt` and `easing` come from `cardMotionTiming()` instead of the three literals at lines 113 and 118; `prefersReducedMotion()` short-circuits **before** any clone is made; and a `flip: true` request runs a second `rotateY` animation on the clone whose keyframe offsets are placed around `flipAt`.

- [ ] **Step 3: Update the two docblock references and confirm the old name is gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "useCardFlight|CardFlight\b"`
Expected: zero hits.

- [ ] **Step 4: Run the primitive's spec and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotion.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 7: Re-point the player's own flight, unchanged, and relieve the 400-line file

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useTableCardMotion.ts`
- Modify: `src/app/warCouncil/WarCouncilTable.tsx:109-125,215-243`, `src/app/warCouncil/WarCouncilRound.tsx` (mount `MotionAnchorProvider`), `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` (the `useCardFlight` reference)

- [ ] **Step 1: Lift the orchestration into its own hook, resolving the well by anchor**

```ts
export interface TableCardMotion {
  /** DLR-156's behaviour, unchanged: clones the armed card, flies it to the trick well, and
   *  calls `onLanded` once — so the trick resolves when the card visibly arrives, not before. */
  readonly flyPlayedCard: (card: Card, onLanded: () => void) => void
  readonly inFlight: boolean
}
export function useTableCardMotion(): TableCardMotion
```

The `document.querySelector('.wc-trick-row')` at `WarCouncilTable.tsx:234` is replaced by `resolve({ kind: PlaceKind.TrickWell })`; the `[data-buff-anchor="…"] button` lookup at line 231 is replaced by `resolve({ kind: PlaceKind.PlayerHand, slot: cardKey(card) })`. The `cardEl === null` fallback branch stays — it is now the primitive's own instant-landing path, so `flyPlayedCard` simply calls `move` with the request and lets it land instantly.

**Nothing about M1's behaviour changes**: same commit-tap gate, same `inFlight` folded into `interactive`, same deferred dispatch, same guard against a second tap mid-flight. `WarCouncilTable.tsx`'s DLR-156 comment block at lines 109-125 moves with the code it explains.

- [ ] **Step 2: Wrap the round in the anchor provider**

`WarCouncilRound.tsx` wraps its returned tree in `<MotionAnchorProvider>`, so both the table and the resolution screen resolve against one registry.

- [ ] **Step 3: Confirm both budget-pressured files are under 400 and M1 still behaves**

Run: `(Get-Content src\app\warCouncil\WarCouncilTable.tsx).Count; (Get-Content src\app\warCouncil\useTableCardMotion.ts).Count`
Expected: both below 400.

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 3 — Every place registers itself

Purely additive: each component that renders a place calls `useMotionAnchor` once and attaches the returned ref. Nothing animates yet and no behaviour changes, so the phase ends type-checking with the app visually identical. Splitting it from Phase 4 means a mis-registered anchor surfaces as a resolvable-or-not assertion rather than as a card flying to the wrong corner.

### Task 8: Register the felt's places

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/HandFan.tsx` (one anchor per `.wc-fan-slot`, slotted by `cardKey`), `src/app/warCouncil/TrickWell.tsx` (the four `.wc-trick-row` sites), `src/app/warCouncil/DecreePile.tsx` (the decree plate and the draw pile — two distinct places in one component), `src/app/warCouncil/DiscardPile.tsx` (the spent pile), `src/app/warCouncil/RoundStatusBand.tsx` (the Quarry's hand)
- Test: `src/app/warCouncil/__tests__/MotionAnchors.test.tsx` (extend)

- [ ] **Step 1: Attach a ref to each place, changing no markup and no class name**

Each component takes the ref callback from `useMotionAnchor(place)` and puts it on the element it already renders. **No class name is renamed** — `.wc-trick-row`, `.wc-fan-slot`, `.wc-pile`, `.wc-spent` and `.wc-stack` keep their existing owners and their existing styling and test bindings. `DecreePile.tsx` renders both the decree plate and the draw-pile count, so it registers two places.

- [ ] **Step 2: Extend the registry spec to assert every felt place resolves**

Render a round and assert `resolve` returns a non-null element for `PlayerHand` (slotted), `QuarryHand`, `TrickWell`, `DrawPile`, `SpentPile` and `DecreePlate`. Query by accessible role and label.

Run: `npx vitest run src/app/warCouncil/__tests__/MotionAnchors.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 9: Register the prompt, the gallery and the riding strip

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/AbilityPrompt.tsx:139-155` (the Woodcutter's `.wc-drawn-wrap` and the prompt row), `src/app/warCouncil/BuffGallery.tsx:147` (one anchor per gallery card, slotted by buff id), `src/app/warCouncil/BuffRidingList.tsx:39` (one anchor per riding row, slotted by buff id)
- Test: `src/app/warCouncil/__tests__/MotionAnchors.test.tsx` (extend)

- [ ] **Step 1: Attach the three remaining anchor groups**

The gallery and the strip are slotted by the same buff id at both ends, so a buff's flight up (**M15**) and back (**M16**) resolve to the pair of elements that represent it.

- [ ] **Step 2: Assert each resolves**

Run: `npx vitest run src/app/warCouncil/__tests__/MotionAnchors.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 4 — The driver, and the felt starts moving

The keystone. One hook watches `ui.round` across renders, diffs placements, plans the schedule and runs the primitive — and with it fourteen of the inventory's movements start animating at once, because they all fall out of the same diff. The phase ends with the felt fully animated and the run-level surfaces untouched, which is a safe boundary: the shop is a different screen and a different contract's working tree.

### Task 10: Drive every movement off the state diff

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useCardMotionDriver.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx` (mount the driver)
- Test: `src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx`

- [ ] **Step 1: Write the failing test for the driver's own three rules**

Assert: the **first** render emits no movements (the previous placement is seeded, not diffed against an empty map — otherwise 33 cards fly in from nowhere on mount); a `RoundState` change emits exactly the movements `diffPlacements` reports; a re-render with an unchanged `round` emits nothing; the previous placement lives in a ref and survives a re-render; unmount mid-flight leaves no clone attached to `document.body`.

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx`
Expected: fails — the module does not exist yet.

- [ ] **Step 2: Implement the driver**

```ts
/** Watches `round` across renders, diffs placements, plans the schedule and runs it. Holds the
 *  previous placement in a `useRef` — never module-level state, which survives HMR and leaks
 *  between tests in one file. Mounted exactly once, in `WarCouncilRound`. */
export function useCardMotionDriver(round: RoundState): void
```

The effect reads `placementsOf(round)`, diffs it against the ref, calls `planMovements(diff, cardMotionTiming().staggerMs)`, publishes the arriving card keys through `setArriving`, calls `move(...)`, and clears the arriving set in the landing callback. The ref is updated **immediately**, not in the callback, so a second state change mid-flight diffs against the truth rather than against a stale map. Every timer the effect starts is released in its cleanup — under StrictMode's double mount the second mount seeds from the current state and emits nothing.

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 11: An arriving slot holds its space and shows nothing until it lands

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/HandFan.tsx`, `src/app/warCouncil/TrickWell.tsx`, `src/app/warCouncil/DecreePile.tsx`, `src/app/warCouncil/warCouncilMotion.css`
- Test: `src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx` (extend)

- [ ] **Step 1: Add the one class that carries AC7, and read the arriving set**

In `warCouncilMotion.css`:

```css
/* DLR-157 AC7 — a slot mid-movement keeps its space and loses only its paint, so nothing
   reflows under the player's pointer: a departing card's gap closes AFTER it lands, and an
   arriving card's slot fills after it lands, never during either. `visibility`, never
   `display` — `display: none` removes the box and reflows the row immediately. */
.wc-is-in-flight {
  visibility: hidden;
}
```

Each of the three components reads `arriving` from `useMotionAnchors()` and adds the class to a slot whose card key is in the set.

- [ ] **Step 2: Assert the class goes on during a flight and comes off on landing**

Extend the driver spec: with a stubbed `Element.prototype.animate`, a card arriving into the hand carries `wc-is-in-flight` while airborne and does not after the landing; under `prefers-reduced-motion` it never carries it at all.

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotionDriver.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 12: Pin each named movement to a spec, so a regression names itself

- Skill: react-frontend

**Files:**
- Test: `src/app/warCouncil/__tests__/cardPlacement.test.ts` (extend)

- [ ] **Step 1: Add one assertion per animated felt movement, named by its inventory row**

One `it(...)` per row, titled with the inventory's identifier so a failure says which movement broke. Cover **M2** (Quarry hand → trick well, flips), **M3+M4** (the pair on one commit), **M5/M6/M7** (the deal's three destinations, including the decree), **M8** (a reshuffle collapses to one request), **M9+M10** (out to the draw pile, back to the hand), **M11** (the Fox's crossing pair), **M12+M13** (the Woodcutter's draw and return), **M14** (the hand ending collapses to one sweep). Each asserts the end state and the movement list, never a pixel — jsdom has no layout engine.

Run: `npx vitest run --project node; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 5 — The buffs, and the run-level movements

The two movements that are not cards in a `RoundState` — a buff going up to the riding strip and coming back — plus the two on the shop screen. These are caller-driven, like M1, because both ends exist and a handler knows exactly when they happen; they go through the same `move` primitive, which is what AC3 asks for. The shop is last on purpose: `ShopPanel.tsx`, `ShopHeld.tsx` and six shop stylesheets have uncommitted changes on this branch, so a conflict there cannot block anything before it.

### Task 13: The buff card goes up, and comes back

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useBuffCardMotion.ts`
- Modify: `src/app/warCouncil/buffRideProps.ts` (call it from the activate and remove handlers)
- Test: `src/app/warCouncil/__tests__/useCardMotion.test.tsx` (extend)

- [ ] **Step 1: Wire both directions through the shared primitive**

```ts
export interface BuffCardMotion {
  /** M15 — the gallery card flies to the riding strip row it becomes. */
  readonly flyToStrip: (buffId: string, onLanded: () => void) => void
  /** M16 — the exact reverse, on removal or on `Escape` while priming. */
  readonly flyToGallery: (buffId: string, onLanded: () => void) => void
}
export function useBuffCardMotion(): BuffCardMotion
```

Neither end changes face, so `flip` is false for both. `handleRemoveBuff` stays the only place `removedAnnouncement` is set (DLR-154 FIX 3) — the motion wraps it, it does not replace it.

- [ ] **Step 2: Assert both directions land and neither is skipped when an anchor is missing**

A buff removed while the gallery is closed has no destination anchor; assert it lands instantly and the removal still commits.

Run: `npx vitest run src/app/warCouncil/__tests__/useCardMotion.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 14: A bought buff travels into the held tray

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/ShopHeld.tsx` (register the tray as a place), `src/app/run/ShopPanel.tsx` (fly a purchase and a slot win into it)
- Test: `src/app/run/__tests__/ShopCardMotion.test.tsx`

- [ ] **Step 1: Write the failing test for both run-level movements**

Assert **M22** (a purchased buff lands in the tray) and **M21** (a slot win lands in the tray), each reaching its end state whether or not the animation ran, and under `prefers-reduced-motion` reaching it with no clone appended. The tray must never be left empty — the buff is in `heldBuffStacks` either way.

Run: `npx vitest run src/app/run/__tests__/ShopCardMotion.test.tsx`
Expected: fails.

- [ ] **Step 2: Wrap the shop screen in the anchor provider and call the primitive**

`ShopPanel.tsx` mounts its own `MotionAnchorProvider` — the shop and the round are different screens and never share a registry. The slot machine's own reel spin (`useSlotSpin.ts`) is untouched: the inventory records it as already animated and not a card movement.

Run: `npx vitest run src/app/run/__tests__/ShopCardMotion.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 6 — Final verification

No production changes. Only checks that the cumulative work is clean, that every tunable is in the one token block AC10 asks for, and that no stale name survives the rename.

### Task 15: Confirm the pure-core boundary still holds

- Skill: none — a verification grep, no code written

**Files:**
- Test: (none — verification only)

- [ ] **Step 1: Grep the pure modules for React and DOM references**

Run: `Get-ChildItem src\app\warCouncil -Include cardPlacement.ts,cardMotionPlan.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|getComputedStyle|matchMedia"`
Expected: zero hits — both modules are pure and testable without a renderer.

- [ ] **Step 2: Confirm the engine tree is untouched**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src/warCouncil src/hunt`
Expected: no output — this contract changes no engine or configuration module.

### Task 16: Confirm no tunable was hard-coded and no stale name remains

- Skill: none — verification greps, no code written

**Files:**
- Test: (none — verification only)

- [ ] **Step 1: Grep source for the literals the token block now owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "cubic-bezier|\b380\b|\b-?34\b|\b-?4deg\b|\b70\b"`
Expected: hits only inside `cardMotionConfig.ts`'s documented `FALLBACK_*` constants. Any hit elsewhere is a duration, distance or easing that escaped AC10's single block.

- [ ] **Step 2: Confirm the renamed hook leaves nothing behind**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "useCardFlight|CardFlight\b|querySelector"`
Expected: zero hits for the first two. Any `querySelector` hit must be justified — this contract removes the only one on a motion path, in favour of the anchor registry.

- [ ] **Step 3: Confirm every motion token is declared exactly once**

Run: `Get-ChildItem src -Recurse -Include *.css | Select-String -Pattern "--wc-flight|--wc-flip-at"`
Expected: six declarations, all in `src\app\warCouncil\warCouncilMotion.css`.

### Task 17: Confirm no file breached the 400-line budget

- Skill: none — verification only

**Files:**
- Test: (none — verification only)

- [ ] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\app\warCouncil,src\app\run -Include *.ts,*.tsx,*.css -Recurse | ForEach-Object { [pscustomobject]@{ n = (Get-Content $_.FullName).Count; f = $_.Name } } | Where-Object { $_.n -gt 400 } | Sort-Object n -Descending`
Expected: no output. `(Get-Content).Count`, not `Measure-Object -Line`, which drops blank lines and undercounts.

### Task 18: Static gates and the full suite

- Skill: none — verification only

**Files:**
- Test: (none — verification only)

- [ ] **Step 1: Warm the transform cache, then typecheck, lint and run the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. A **first** cold `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a failing test — the two scoped runs above are what warms it. A second consecutive timeout is real.

- [ ] **Step 2: Check formatting of only the files this contract touched**

Run: `npx prettier --check src/app/warCouncil src/app/run`
Expected: exits 0. Do **not** run `npm run format` — it rewrites ~59 unrelated markdown files.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 19: Record what a browser must check, and update the PR description

- Skill: none — a document for the developer

**Files:**
- Create: `.claude/contract/DLR-157-every-card-movement-animates/pr-description.md`

- [ ] **Step 1: Write the PR description**

Include:
- A link to `plan.md`, `card-movement-inventory.md` and `mockup.html` in this folder.
- A summary: one primitive, seventeen animated movements, five instant-with-reason, four unreachable.
- **Every developer decision, restated**: `--wc-flip-at`, `--wc-flight-stagger`, `PILE_COLLAPSE_THRESHOLD`, `--wc-flight-lift`, `--wc-flight-tilt`, and whether the overall amount of motion is right.
- Verification results from the prior phases, quoting the actual Vitest summary line.
- **What a browser must check, because jsdom cannot** (the layout claims, which have right answers and belong to a QA browser pass): every movement lands on its destination's box at 1440×900 and 1024×640; no gap closes mid-flight in the hand; the deal's six cards stagger rather than fire at once; the Quarry's card flips; `prefers-reduced-motion` forced on leaves every card in place with nothing mid-flight; and switching tabs mid-deal still lands every card.
- A one-line note for future contributors: **a new card movement is added by teaching `placementsOf` about a new place and registering its anchor — not by calling `move` at a new site.**

---

## Self-review

**Spec coverage:**
- The inventory as a durable document (`plan.md` In scope 1) — delivered during planning as `card-movement-inventory.md`; cited by Tasks 3, 4, 12 and 19.
- One shared primitive carrying DLR-156's landing race (In scope 2) — Task 6.
- The named-anchor registry (In scope 3) — Tasks 5, 8, 9.
- The pure placement differ (In scope 4) — Task 3.
- The flip (In scope 5) — Tasks 1, 2, 4, 6.
- The stagger as one tunable (In scope 6) — Tasks 1, 4, 6.
- The reflow rule (In scope 7) — Task 11.
- The `prefers-reduced-motion` path (In scope 8) — Tasks 2, 6, 11, 14.
- One token block owning every duration, distance and easing (In scope 9) — Tasks 1, 2, 16.
- Wiring at every animated site (In scope 10) — Tasks 10, 12, 13, 14.
- M1 re-pointed with no behaviour change (In scope 11) — Task 7.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact rename, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `PlaceKind`, `PlaceId`, `CardMovement`, `CardMoveRequest`, `MotionAnchorKey`, `CardMotionTiming`, `PILE_COLLAPSE_THRESHOLD`, `placementsOf`, `diffPlacements`, `faceAt`, `planMovements`, `cardMotionTiming`, `prefersReducedMotion`, `useCardMotion`, `move`, `inFlight`, `useMotionAnchor`, `useMotionAnchors`, `MotionAnchorProvider`, `register`, `resolve`, `arriving`, `setArriving`, `useCardMotionDriver`, `useTableCardMotion`, `flyPlayedCard`, `useBuffCardMotion`, `flyToStrip`, `flyToGallery`, and the six CSS tokens plus `.wc-card-flyer` and `.wc-is-in-flight` are each spelled identically in every task that names them and in `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: two pure modules, one config reader and one stylesheet exist and are tested; nothing imports them, and the app behaves exactly as before.
- **Phase 2** ends type-checking with the old hook fully removed (Task 6 Step 3 greps for it), M1 running through the new primitive with unchanged behaviour, and both budget-pressured files back under 400.
- **Phase 3** ends type-checking: anchors are registered and resolvable, no markup or class name changed, nothing animates.
- **Phase 4** ends type-checking with the felt fully animated and every named movement pinned to a spec.
- **Phase 5** ends type-checking with the buffs and the shop wired; no half-applied rename remains anywhere.
- **Phase 6** changes no production code.
