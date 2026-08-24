# Tasks: Live card preview — win/lose damage readout

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Not developer-confirmed.** This is an unattended sprint run: `AskUserQuestion` was not presented, so `plan.md` and `mockup.html` were approved by taking the plan's stated defaults. The mockup at `mockup.html` in this folder went **unseen**.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Give every hand card an always-visible, never-lying readout of the damage it would deal if it wins its trick and the damage it would cost if it loses, derived by handing a hypothetical resolution to the same `applyResolution` fold the reducer commits with.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/app/warCouncil/cardDamage.ts` — the pure per-card win/lose derivation, routed through the live resolution path.
- `src/app/warCouncil/__tests__/cardDamage.test.ts` — node-project spec for that module.

**Modified:**
- `src/app/warCouncil/commitHandlers.ts` — export `playOptions`, `applyResolution` and `FoldedResolution`; no signature or behaviour change.
- `src/app/warCouncil/labels.ts` — add `cardDamageGlyphText`, `cardDamageText` and the estimate note constant.
- `src/app/warCouncil/PlayingCard.tsx` — add the optional `describedBy` prop.
- `src/app/warCouncil/HandFan.tsx` — wrap each card in `.wc-fan-slot`, render the damage strip, add the required `damageForCard` prop.
- `src/app/warCouncil/warCouncilHand.css` — `.wc-fan-slot` and `.wc-card-damage`.
- `src/app/warCouncil/WarCouncilRound.tsx:348-362` — pass `damageForCard`.
- `src/app/warCouncil/__tests__/labels.test.ts` — cover both copy functions.
- `src/app/warCouncil/__tests__/PlayingCard.test.tsx` — cover `describedBy`.
- `src/app/warCouncil/__tests__/HandFan.test.tsx` — supply the new required prop in `renderFan`, and cover the strip.
- `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx` — cover the wired readout on the real screen.

**Deleted:** (none)

**Developer decides or observes:**
- The glyph form `W6 L1` and the `~` estimate marker are **placeholder copy** — the wording and the glyphs are the developer's, as `TRICK_OUTCOME_MESSAGE` and the Timebomb `⚗` mark are.
- `font-size: calc(var(--wc-card-w) * 0.2)` is transcribed from the card's own scale convention (rank `0.34`, suit `0.56`, pip `0.12`). Whether it is legible at the smallest clamp (`--wc-card-w: 2.9rem`, ~9.3px) is an eyes-on judgement and the multiplier is the developer's to retune.
- **Vertical cost — look at this first.** The `hand` grid row grows by roughly 7-12px. DLR-119's three open `.wc-shell` risks (scrolling at 1280×800 / 1024×768 / 1366×768 / 390×844, the never-rendered narrow-viewport `actions` row, the hand-fan crop) get slightly worse, not better. The browser pass is **not** requested this run, so nobody will have seen it.
- Whether showing only the two card-DEPENDENT figures on the card face (dealt-on-win, taken-on-lose) is the right density, given that the two card-invariant cross-terms are already previewed on the health bars and the full four-figure truth is in the spoken form.
- Whether truncating overkill is the right reading: every figure is a health delta, so "win: 4" against a Quarry on 4 health means "enough", not "exactly 4 gross".
- Whether the preview should ever collapse to the one branch that will actually happen. It deliberately does not, because `chooseCpuCard` is deterministic and doing so would leak the Quarry's exact card past `TELEGRAPH_FIDELITY`.

---

## Phase 1 — Open the resolution path and derive both branches from it

This phase adds no rendering. It makes the two functions the commit path already uses reachable, then builds the pure derivation on top of them and pins it with a node-project spec. The boundary is safe because nothing yet imports the new module in a component, so the app compiles and behaves exactly as before at the end of it.

### Task 1: Export `playOptions` and `applyResolution` from `src/app/warCouncil/commitHandlers.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:46,75,83`

- [x] **Step 1: Add `export` to the two functions and the interface, and record why**

Change the three declarations in place. Nothing else in the file moves; every existing docblock stays with its function.

```ts
// line 46 — was: function playOptions(state: RoundUiState): PlayCardOptions {
export function playOptions(state: RoundUiState): PlayCardOptions {

// line 75 — was: interface FoldedResolution {
export interface FoldedResolution {

// line 83 — was: function applyResolution(
export function applyResolution(
```

Append this paragraph to `applyResolution`'s existing docblock, immediately before its closing `*/`:

```ts
 * EXPORTED on DLR-117 so the hand fan's per-card preview can ask THIS function what a
 * hypothetical trick would cost instead of re-deriving the arithmetic. That is the whole
 * anti-drift argument for the preview: it reads a health DELTA off the real fold, so shield
 * absorption, the zero floor, and the payout-destroyed-by-a-hit rule are inherited rather
 * than restated. `projectedDepletion` (`duelHealthBars.ts`) is the cautionary case — it had
 * its own absorption arithmetic and it lied until DLR-115.
```

And this one to `playOptions`'s docblock, before its closing `*/`:

```ts
 * EXPORTED on DLR-117: a THIRD reader, `cardDamage.ts`'s preview, which must assemble the
 * same four fields the two commit call sites do. A preview that read the queue itself would
 * be exactly the second reading this docblock already warns about.
```

- [x] **Step 2: Confirm the exports compile and nothing else changed**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [x] **Step 3: Confirm the commit path's own specs still pass**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 2: Add the per-card derivation in `src/app/warCouncil/cardDamage.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/cardDamage.ts`
- Test: `src/app/warCouncil/__tests__/cardDamage.test.ts`

- [x] **Step 1: Write the failing spec**

Model it on `src/app/warCouncil/__tests__/roundBars.test.ts` — the same `seededUi()` helper over `createRoundUiState` and `roundFixture.ts`. It is a `.test.ts` file, so it runs in the **node** project and must not import a renderer.

```ts
import { describe, expect, it } from 'vitest'
import { DuelSide, queueTimebomb, startEncounter } from '../../../hunt'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { createRoundUiState } from '../roundUiState'
import { cardDamagePreview } from '../cardDamage'
import {
  bankClimbBonusFixture,
  blastGuardHeldFixture,
  card,
  discardsRemainingFixture,
  encounterFixture,
  makeRound,
  timebombChargesFixture,
} from './roundFixture'
```

Assert, at minimum, these behaviours — each is a claim about the resolution path, not about arithmetic this module performs:

1. With an empty bank and nothing pending, a lead card previews `win.toQuarry === 0` and `lose.toPlayer === DAMAGE_PER_HIT`, read from `src/hunt/config.ts` rather than written as a literal.
2. With a bank of 3 at a multiplier of 2, the lose branch's `toQuarry` equals `forcedCashValue(3, 2)` — imported from `../../../warCouncil`, never recomputed in the spec.
3. On the final trick (`tricksPlayed: HAND_SIZE - 1`), the win branch's `toQuarry` equals `cashValue` of the post-take bank and multiplier, i.e. the end-of-hand cash fires.
4. `exact` is `false` for a state the player leads (`currentTrick: []`) and `true` for a state where the Quarry's lead is already on the table (`currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 4) }]`, `leader: PlayerSide.Cpu`).
5. A skulled Quarry lead on the table inverts the branches: `trickIsSkulled` is true, so the WIN branch is a `SkullWin` and costs the player health while the LOSE branch is a Dodge and costs nothing.
6. A Timebomb queued against the player (`queueTimebomb(encounterFixture, DuelSide.Player)`) shows in **both** branches' `toPlayer`, because it detonates whichever way the trick goes.
7. Playing a card that is in `primedCards` and losing it cleanly costs **nothing** — DLR-90 AC5's REPLACED clean loss — proving the preview reads `resolveTrickBank`'s own rule rather than assuming a loss always hurts.
8. `cardDamagePreview` returns `null` when `round.phase === RoundPhase.Complete`, and `null` for an encounter already resolved (build one by applying lethal damage through `applyDamage`, or by seeding `startEncounter` and driving it — whichever the fixture supports without new helpers).
9. Calling `cardDamagePreview` twice on the same state returns deeply equal values and leaves `ui.encounter` unchanged — the purity claim StrictMode depends on.

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/cardDamage.test.ts`
Expected: FAIL — `cardDamage.ts` does not exist yet, so Vitest reports a collection/transform error for the file.

- [x] **Step 3: Write the module**

```ts
/**
 * The hand fan's per-card win/lose damage readout (DLR-117).
 *
 * THE ONE RULE THIS MODULE OBEYS: it performs no damage arithmetic. Both branches are
 * produced by handing a hypothetical `TrickResolution` to `applyResolution` — the SAME fold
 * `commitHandlers.ts` commits a real trick through — and reading the health DELTA back off
 * the returned encounter. Shield absorption, the zero floor on health, and the rule that a
 * hit destroys a payout due at the same resolution are therefore inherited, not restated.
 * `projectedDepletion` is the cautionary case this discipline comes from: it carried its own
 * absorption arithmetic and previewed red hearts breaking that blue hearts would have
 * absorbed, until DLR-115 routed it through `absorbWithShield`.
 *
 * Split out of the component for `roundBars.ts`'s reason: as a block inside `HandFan` this
 * could only be exercised through a renderer.
 */
import {
  DuelSide,
  HAND_SIZE,
  isEncounterResolved,
  type Damage,
} from '../../hunt'
import {
  PlayerSide,
  resolveTrickBank,
  RoundPhase,
  trickIsPrimed,
  trickIsSkulled,
  type Card,
  type TrickCard,
  type TrickFacts,
} from '../../warCouncil'
import { applyResolution, playOptions } from './commitHandlers'
import type { RoundUiState } from './roundUiState'

/** The health each side loses at this trick's resolution, in one branch. */
export interface CardDamageBranch {
  readonly toQuarry: Damage
  readonly toPlayer: Damage
  /** Blue hearts spent absorbing this branch's hit. `0` while nothing mints a Shield. */
  readonly shielded: Damage
}

export interface CardDamagePreview {
  readonly win: CardDamageBranch
  readonly lose: CardDamageBranch
  /** `true` only when the Quarry's card is already on the table, so `trickIsSkulled` and
   *  `trickIsPrimed` have every card of the trick to test. `false` while the player leads —
   *  the Quarry's face-down card may carry a skull, which inverts the win branch. */
  readonly exact: boolean
}

/**
 * `null` once the encounter is resolved or the hand is over: there is no next trick to
 * preview, and `applyResolution` short-circuits on a resolved encounter, so computing anyway
 * would print a confident `0 / 0` meaning "nothing to preview" and reading as "no damage".
 */
export function cardDamagePreview(state: RoundUiState, card: Card): CardDamagePreview | null {
  if (state.round.phase === RoundPhase.Complete || isEncounterResolved(state.encounter)) {
    return null
  }

  // Only the cards the PLAYER can see: the Quarry's lead if it is already on the table, plus
  // the card being considered. The Quarry's unplayed answer is never consulted — it is
  // computable (`chooseCpuCard` is deterministic) and reading it would leak the exact card
  // past `TELEGRAPH_FIDELITY`.
  const visible: readonly TrickCard[] = [
    ...state.round.currentTrick,
    { side: PlayerSide.Player, card },
  ]

  // The four queue/run facts come from `playOptions` — the SAME assembly both commit call
  // sites use — with `playCard.ts`'s own `?? 0` / `?? false` defaulting reproduced field for
  // field, so the preview and the commit cannot read "what is pending" differently.
  const options = playOptions(state)
  const finalTrick = state.round.tricksPlayed + 1 === HAND_SIZE
  const shared: Omit<TrickFacts, 'playerWon'> = {
    skullTrick: trickIsSkulled(state.round.skulledCards, visible),
    finalTrick,
    timebombTrick: trickIsPrimed(state.round.primedCards, visible),
    timebombToPlayer: options.timebombToPlayer ?? 0,
    timebombToQuarry: options.timebombToQuarry ?? 0,
    blastGuarded: options.blastGuarded ?? false,
    bankClimbBonus: options.bankClimbBonus ?? 0,
  }

  return {
    win: branchFor(state, { ...shared, playerWon: true }),
    lose: branchFor(state, { ...shared, playerWon: false }),
    exact: state.round.currentTrick.length === 1,
  }
}

/** One branch, as a health delta across the real fold. Never mutates `state`. */
function branchFor(state: RoundUiState, facts: TrickFacts): CardDamageBranch {
  const resolution = resolveTrickBank(
    { bank: state.round.bank, multiplier: state.round.multiplier },
    facts,
  )
  const before = state.encounter
  const after = applyResolution(before, resolution, facts.finalTrick).encounter
  return {
    toQuarry: before.health[DuelSide.Quarry] - after.health[DuelSide.Quarry],
    toPlayer: before.health[DuelSide.Player] - after.health[DuelSide.Player],
    shielded: before.shieldHearts - after.shieldHearts,
  }
}
```

- [x] **Step 4: Re-run the spec and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/cardDamage.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `npm run typecheck` exits 0.

- [x] **Step 5: Confirm no second copy of the arithmetic was written**

Run: `Select-String -Path src\app\warCouncil\cardDamage.ts -Pattern "Math\.min|Math\.max|DAMAGE_PER_HIT|FORCED_CASH_OUT|forcedCashValue|cashValue|absorbWithShield"`
Expected: zero hits. Every one of those belongs to the engine; a hit here means the preview grew its own arithmetic and can now diverge from what is paid.

---

## Phase 2 — Copy for both forms

`labels.ts` is this screen's single copy owner, so both the compact on-card form and the full spoken sentence are written there rather than inline in the fan. The boundary is safe because nothing renders them yet — the module type-checks against `CardDamagePreview`, which Phase 1 created.

### Task 3: Add `cardDamageGlyphText` and `cardDamageText` to `src/app/warCouncil/labels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Add the two functions and the estimate note at the end of `labels.ts`**

Add `import type { CardDamageBranch, CardDamagePreview } from '../cardDamage'` — wait, `labels.ts` sits in the same folder, so the specifier is `'./cardDamage'`. Append:

```ts
/** DLR-117 — the caveat a preview carries while the Quarry's card is face down. Its own
 *  constant rather than an inline string, so the sentence and any future non-fan reader of
 *  the same caveat cannot drift. PLACEHOLDER copy, as this file's rest is. */
export const CARD_DAMAGE_ESTIMATE_NOTE =
  'Estimate — the Quarry’s card is face down, so this trick’s skull and Timebomb state are not yet decided.'

/** The `~` an estimate carries in the compact form. A FORM signal, not colour — `game-ux`'s
 *  "state reads without motion or colour alone". PLACEHOLDER glyph. */
export const CARD_DAMAGE_ESTIMATE_GLYPH = '~'

/**
 * DLR-117 — the compact on-card form, e.g. `W6 L1`, or `~W6 L1` for an estimate. Rendered
 * `aria-hidden`; `cardDamageText` below is what a reader who cannot see it gets.
 *
 * TWO figures, and they are the CARD-DEPENDENT ones: what this card deals if it wins, what it
 * costs if it loses. The two cross-terms — a Timebomb detonating on a win, the forced cash-out
 * on a loss — are the same whichever card is played and are already previewed on the bars
 * (DLR-101's ticking hearts, DLR-86 AC3's at-risk band), so repeating them on six cards would
 * add noise without adding information. The full four-figure truth is in the sentence below.
 * PLACEHOLDER glyphs: the wording is the developer's.
 */
export function cardDamageGlyphText(preview: CardDamagePreview): string {
  const estimate = preview.exact ? '' : CARD_DAMAGE_ESTIMATE_GLYPH
  return `${estimate}W${preview.win.toQuarry} L${preview.lose.toPlayer}`
}

/** One branch, in words. Omits a zero rather than saying "0 damage to you", and says
 *  "no damage" when the branch costs nobody anything — a REPLACED clean loss (DLR-90 AC5) is
 *  exactly that, and it is the branch a player most needs stated plainly. */
function cardDamageBranchText(branch: CardDamageBranch): string {
  const parts: string[] = []
  if (branch.toQuarry > 0) parts.push(`${branch.toQuarry} damage to the Quarry`)
  if (branch.toPlayer > 0) parts.push(`${branch.toPlayer} damage to you`)
  if (branch.shielded > 0) parts.push(`${branch.shielded} absorbed by your shield`)
  return parts.length === 0 ? 'no damage' : parts.join(', ')
}

/**
 * DLR-117 — the `.wc-sr-only` sentence, and the COMPLETE statement: both branches, both sides
 * of each, any shield absorption, and the estimate caveat when one applies. Reached through
 * the card button's `aria-describedby`, so it is a DESCRIPTION and never part of the card's
 * accessible NAME — `cardAccessibleName` stays the card's identity alone. PLACEHOLDER copy.
 */
export function cardDamageText(preview: CardDamagePreview): string {
  const body =
    `If you win this trick: ${cardDamageBranchText(preview.win)}. ` +
    `If you lose: ${cardDamageBranchText(preview.lose)}.`
  return preview.exact ? body : `${body} ${CARD_DAMAGE_ESTIMATE_NOTE}`
}
```

- [x] **Step 2: Add assertions to `src/app/warCouncil/__tests__/labels.test.ts`**

Cover, building `CardDamagePreview` literals by hand (no engine needed — this is copy):

- an exact preview reads `W6 L1` and its sentence names both figures and carries no caveat;
- an inexact preview reads `~W6 L1` and its sentence ends with `CARD_DAMAGE_ESTIMATE_NOTE`;
- a branch with `toQuarry: 0, toPlayer: 0, shielded: 0` renders `no damage` rather than `0 damage to you`;
- a win branch that also costs the player (`toPlayer: 2`) names **both** sides in the sentence, proving the cross-term is not dropped from the spoken form;
- a branch with `shielded: 1` names the absorption.

- [x] **Step 3: Run the copy spec and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `npm run typecheck` exits 0.

- [x] **Step 4: Measure `labels.ts` against the 400-line budget**

Run: `(Get-Content src\app\warCouncil\labels.ts).Count`
Expected: a number below 400. `Measure-Object -Line` undercounts and must not be used (`web-project.md`).

---

## Phase 3 — Render it on the fan

The presentation half: an optional description hook on the card, the strip and its wrapper on the fan, the stylesheet, and the one line in the mount that wires the derivation in. The phase ends with the feature visible and every existing spec green, because the card's accessible NAME is deliberately untouched.

### Task 4: Add the `describedBy` prop to `src/app/warCouncil/PlayingCard.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/PlayingCard.tsx`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx`

- [x] **Step 1: Add the optional prop and pass it through**

In `PlayingCardProps`, beside `tabIndex`:

```ts
  /** DLR-117 — the id of an element that DESCRIBES this card (the fan's damage strip).
   *  Optional so all 13 other call sites keep compiling; only the fan passes one. Deliberately
   *  a DESCRIPTION rather than part of `cardAccessibleName`: a card's accessible name is its
   *  identity, and folding a derived figure into it would break every `getByRole('button',
   *  { name })` query in the suite and conflate two different claims. */
  readonly describedBy?: string
```

Add `describedBy` to the destructured parameter list, and add one attribute to the `<button>`, immediately after `aria-label`:

```tsx
      aria-describedby={describedBy}
```

- [x] **Step 2: Add an assertion to `PlayingCard.test.tsx`**

One test: a card rendered with `describedBy="dmg-1"` exposes `aria-describedby="dmg-1"` on the button found by `getByRole('button', { name: … })`, and a card rendered without it exposes no `aria-describedby` attribute at all.

- [x] **Step 3: Run the card spec**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

### Task 5: Render the strip in `src/app/warCouncil/HandFan.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/HandFan.tsx`
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx`

Layout per `mockup.html` in this plan folder — the strip is a sibling of the card button inside a `.wc-fan-slot` column, never inside the card face.

- [x] **Step 1: Add the required prop, the wrapper, and the strip**

Import `useId` from `react`, `cardDamageGlyphText` and `cardDamageText` from `./labels`, and `type CardDamagePreview` from `./cardDamage`. Add to `HandFanProps`:

```ts
  /** DLR-117 — this card's win/lose preview, or `null` when there is nothing to preview.
   *  REQUIRED and deliberately NOT defaulted, for the reason `projectedDepletion`'s fifth
   *  parameter is required (`duelHealthBars.ts`): a defaulted stub is exactly how a preview
   *  silently stops previewing. Asked as a callback rather than taken as an array so this
   *  component still computes nothing about a card's state, exactly as it takes `legal` from
   *  the engine rather than comparing suits itself. */
  readonly damageForCard: (card: Card) => CardDamagePreview | null
```

Take `damageForCard` in the destructure. Above the `return`, add:

```ts
  // Stable per mount and unique across mounts, so two fans could coexist without their
  // description ids colliding. `cardKey` is unique within one hand.
  const damageIdBase = useId()
```

Replace the body of the `hand.map(...)` callback. The rotation and lift custom properties stay on the CARD (`warCouncilCards.css`'s `.wc-fan .wc-card` composes them into the hover/armed transform); only the fan's own layout — the overlap margin and the stacking order — moves to the slot, because the slot is now the flex item:

```tsx
          const style: FanCardStyle = {
            '--wc-fan-rot': `rotate(${placement.rotateDeg}deg)`,
            '--wc-fan-lift': `translateY(${placement.liftPct}%)`,
          }
          const slotStyle: CSSProperties = {
            marginLeft: `${placement.overlapPx}px`,
            zIndex: placement.zIndex,
          }
          const damage = damageForCard(card)
          const damageId = `${damageIdBase}-${cardKey(card)}`

          return (
            <div key={cardKey(card)} className="wc-fan-slot" style={slotStyle}>
              <PlayingCard
                card={card}
                variant="hand"
                armed={isArmed}
                illegal={
                  !interactive || (!timebombArmed && !discardSelecting && !containsCard(legal, card))
                }
                primed={isPrimed(primedCards, card)}
                discardSelected={containsCard(discardSelection, card)}
                tabIndex={index === tabStopIndex ? 0 : -1}
                describedBy={damage === null ? undefined : damageId}
                style={style}
                onTap={onTap}
              />
              {damage !== null && (
                <span
                  id={damageId}
                  className={`wc-card-damage${damage.exact ? '' : ' wc-is-estimate'}`}
                >
                  <span aria-hidden="true">{cardDamageGlyphText(damage)}</span>
                  <span className="wc-sr-only">{cardDamageText(damage)}</span>
                </span>
              )}
            </div>
          )
```

Add a note to the component docblock recording why the extra wrapper is safe:

```
 * DLR-117 wraps each card in a `.wc-fan-slot` column so the damage strip can sit beneath the
 * card rather than on its face — all four corners of the face are taken (rank, skull, primed
 * mark, ability pip) and the centre is the suit mark. `useRovingTabIndex`'s `focusIndex` uses
 * `groupRef.current.querySelectorAll('button')`, a DESCENDANT query, so the extra element
 * leaves the arrow-key order and count exactly as they were; the strip is a `<span>` and
 * never enters that list.
```

- [x] **Step 2: Update `renderFan` and add the strip's tests in `HandFan.test.tsx`**

Add `damageForCard={() => PREVIEW}` to the `<HandFan …>` literal inside `renderFan`, with a hand-built fixture at the top of the file:

```tsx
const PREVIEW = {
  win: { toQuarry: 6, toPlayer: 0, shielded: 0 },
  lose: { toQuarry: 4, toPlayer: 1, shielded: 0 },
  exact: true,
}
```

Then add tests that query **by accessible role and label** (AC4):

- every card is described by its own strip: `screen.getByRole('button', { name: '7 of Bells', description: 'If you win this trick: 6 damage to the Quarry. If you lose: 4 damage to the Quarry, 1 damage to you.' })` resolves;
- an inexact preview (`damageForCard={() => ({ ...PREVIEW, exact: false })}`) puts `CARD_DAMAGE_ESTIMATE_NOTE` into that same description;
- `damageForCard={() => null}` renders no strip and leaves the card with no `aria-describedby`;
- the existing name assertions (`'7 of Bells'`, `'3 of Keys (Fox)'`, `'11 of Moons (Monarch)'`) still resolve — the accessible NAME is unchanged;
- arrow-key navigation still moves focus between cards with the wrapper in place (extend or re-run the file's existing roving-tabindex test).

- [x] **Step 3: Run the fan spec**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

### Task 6: Style the slot and the strip in `src/app/warCouncil/warCouncilHand.css` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilHand.css`

- [x] **Step 1: Append the two rules**

```css
/* DLR-117 — one fan item: the card, and its damage strip beneath. The rotation and lift
   custom properties stay on the card itself (`warCouncilCards.css`'s `.wc-fan .wc-card`
   composes them with the hover/armed states); only the overlap margin and the stacking order
   move out here, because the slot is now the flex item. `useRovingTabIndex` queries
   `querySelectorAll('button')` on the group, a DESCENDANT query, so this wrapper changes
   neither the arrow-key order nor the count. */
.wc-fan-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--wc-card-w) * 0.04);
}

/* The two figures this ticket exists for. OUTSIDE the card face by necessity — all four
   corners are taken (rank top-left, skull top-right, primed mark bottom-left, ability pip
   bottom-right) and the centre is the large suit mark, so there is no free area on it at a
   legible size, and keeping them off the face also keeps `game-ux`'s "the cards take visual
   precedence" intact. Sized off `--wc-card-w` with the same multiplier convention the card's
   own marks use (rank 0.34, suit 0.56, pip 0.12). PLACEHOLDER size and hue — the developer's
   to retune, as those are.

   COST: this is the ONLY thing on this screen that adds vertical space — roughly 7-12px on
   the `hand` grid row, being one line of text plus the gap, less the ~3.2px of slack already
   inside `.wc-fan`'s `min-height`. No grid row is added and `.wc-fan`'s rotation-reserve
   padding is deliberately not spent, because that reserve is DLR-119's territory. */
.wc-card-damage {
  font-size: calc(var(--wc-card-w) * 0.2);
  line-height: 1.1;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--wc-chalk-dim);
}

/* An estimate reads as one without relying on colour (`game-ux`): the italic slant here and
   the leading `~` in `cardDamageGlyphText` are both form signals, and either alone suffices. */
.wc-card-damage.wc-is-estimate {
  font-style: italic;
}
```

- [x] **Step 2: Confirm the class names are used exactly where the component writes them**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-fan-slot|wc-card-damage|wc-is-estimate"`
Expected: `wc-fan-slot` in `HandFan.tsx` and `warCouncilHand.css`; `wc-card-damage` and `wc-is-estimate` in `HandFan.tsx` and `warCouncilHand.css`. No other file, and no spelling variant.

### Task 7: Wire the derivation into the mount in `src/app/warCouncil/WarCouncilRound.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:348-362`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx`

- [x] **Step 1: Import the derivation and pass it to the fan**

Add `import { cardDamagePreview } from './cardDamage'` beside the existing `./roundBars` import, and one prop to the `<HandFan …>` element, beside `primedCards`:

```tsx
        damageForCard={(card) => cardDamagePreview(ui, card)}
```

No `useCallback` — `react-frontend` forbids memoisation without profiling evidence, and the preview is a pure function of committed state, which is exactly what makes AC2's live update free: the fan re-derives every render and cannot go stale.

- [x] **Step 2: Add a screen-level assertion to `WarCouncilRound.readouts.test.tsx`**

One test proving the readout is real on the assembled screen, queried by accessible role and label: render the round with a fixture whose bank and multiplier are non-zero, find a hand card by `getByRole('button', { name: … })`, and assert its accessible description names both branches. A second test asserting the description changes when the seeded bank changes proves AC2's live wiring without needing a buff to fire.

- [x] **Step 3: Run the screen specs and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: both spec files report 0 failed; `npm run typecheck` exits 0.

- [x] **Step 4: Measure the two grown components against the 400-line budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\HandFan.tsx).Count; (Get-Content src\app\warCouncil\cardDamage.ts).Count`
Expected: each below 400. If `WarCouncilRound.tsx` crosses it, split it in this ticket rather than reporting it — its siblings `roundBars.ts`, `commitHandlers.ts` and `quarryAdvance.ts` are the precedent.

- [x] **Step 5: Format only the files this contract changed**

Run: `npx prettier --write src\app\warCouncil\cardDamage.ts src\app\warCouncil\commitHandlers.ts src\app\warCouncil\labels.ts src\app\warCouncil\PlayingCard.tsx src\app\warCouncil\HandFan.tsx src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\warCouncilHand.css src\app\warCouncil\__tests__\cardDamage.test.ts src\app\warCouncil\__tests__\labels.test.ts src\app\warCouncil\__tests__\PlayingCard.test.tsx src\app\warCouncil\__tests__\HandFan.test.tsx src\app\warCouncil\__tests__\WarCouncilRound.readouts.test.tsx`
Expected: exits 0. **Never run `npm run format`** — it is `prettier --write` repo-wide and rewrote 59 files during DLR-116.

---

## Phase 4 — Final verification

No production changes. Three checks that the anti-drift claim actually holds, then the static gates, the unfiltered suite and the build.

### Task 8: Confirm the preview cannot diverge from the resolution path ✓

- Skill: none — a verification grep, no code written

**Files:**
- Modify: (none — read-only checks)

- [x] **Step 1: Confirm the preview reaches damage only through the exported fold**

Run: `Select-String -Path src\app\warCouncil\cardDamage.ts -Pattern "applyResolution|playOptions|resolveTrickBank"`
Expected: three hits in the import statement plus one call site each — the preview's only routes to a damage figure.

- [x] **Step 2: Confirm no inline shield arithmetic was reintroduced anywhere in the diff**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.min\(.*[Ss]hield|absorbWithShield"`
Expected: zero hits. `absorbWithShield` is reached only from inside `src/hunt/` and from `duelHealthBars.ts`'s pre-existing calls, never from this ticket's files. This is the exact check both reviewers ran on DLR-115.

- [x] **Step 3: Confirm the pure engine trees are untouched by this contract**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src\hunt src\warCouncil`
Expected: no output. This contract changes nothing under either pure-core tree, so no determinism or `Math.random()` question arises there.

### Task 9: Static gates, full suite and build ✓

- Skill: none — verification only, no code written

**Files:**
- Modify: (none — read-only checks)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed against a baseline of 1503 passed of 1503 across 116 files, plus this contract's new tests. Warm the transform cache first with `npx vitest run --project node; npx vitest run --project dom` if `npm test` reports a `Timeout waiting for worker to respond` — that is a cold-cache infrastructure symptom, not a failing test (`web-project.md`).

- [x] **Step 2: Formatting of the changed files only**

Run: `npx prettier --check src\app\warCouncil\cardDamage.ts src\app\warCouncil\commitHandlers.ts src\app\warCouncil\labels.ts src\app\warCouncil\PlayingCard.tsx src\app\warCouncil\HandFan.tsx src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\warCouncilHand.css src\app\warCouncil\__tests__\cardDamage.test.ts src\app\warCouncil\__tests__\labels.test.ts src\app\warCouncil\__tests__\PlayingCard.test.tsx src\app\warCouncil\__tests__\HandFan.test.tsx src\app\warCouncil\__tests__\WarCouncilRound.readouts.test.tsx`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not this contract's gate.

- [x] **Step 2b: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 10: Update the PR description ✓

- Skill: none — a document, no code written

**Files:**
- Create: `.claude/contract/DLR-117-live-card-preview-win-lose-damage-readout/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary of the change.
- **Every case where the preview is an estimate rather than a certainty**, listed explicitly: the Quarry's face-down card leaving `skullTrick`/`timebombTrick` undecided when the player leads; a Timebomb this card would BOOK not appearing (it costs no health at this resolution); overkill truncated to the health actually lost; and the fact that activated buffs contribute nothing because `buffAccrual.ts` has no caller.
- How the anti-drift claim was proved — the exported `applyResolution` fold, the health-delta reading, and the Phase 4 greps.
- The vertical cost (7-12px on the `hand` row) and its interaction with DLR-119's three open risks.
- **Precisely what a browser would have checked** and did not, because the browser pass was not requested: that the strip renders under every card at 1280×800 / 1024×768 / 1366×768 / 390×844 without `.wc-shell` scrolling or the fan cropping; that `--wc-card-w` and `--wc-chalk-dim` resolve in `.wc-card-damage` rather than falling back; that the numbers are legible at the smallest clamp; and that the console is clean.
- Verification results from the prior phases, with the counts quoted.
- A one-line note for future contributors: a preview on this screen derives from `applyResolution` and reads a health delta — it never re-derives damage.

- [x] **Step 2: Tick Task 8, Task 9 and Task 10 in `tasks.md`**

---

## Self-review

**Spec coverage:**
- Pure module deriving both branches through the live resolution path — Tasks 1, 2.
- Marking the preview inexact when the Quarry's card is face down — Task 2 (the `exact` field), Task 3 (both copy forms), Task 5 (the `wc-is-estimate` class).
- Rendering under every card without touching the card's accessible name — Tasks 4, 5, 6.
- Copy in `labels.ts` — Task 3.
- CSS in `warCouncilHand.css` — Task 6.
- Live wiring with no effect and no memoisation (AC2) — Task 7.
- Component tests querying by accessible role and label (AC4) — Tasks 4, 5, 7.
- Unit tests for the pure module — Task 2.
- The anti-drift claim, verified rather than asserted — Task 8.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `cardDamagePreview`, `CardDamagePreview`, `CardDamageBranch`, `cardDamageGlyphText`, `cardDamageText`, `CARD_DAMAGE_ESTIMATE_NOTE`, `CARD_DAMAGE_ESTIMATE_GLYPH`, `damageForCard`, `describedBy`, `wc-fan-slot`, `wc-card-damage`, `wc-is-estimate` are each spelled identically in every task that names them, and all match `plan.md` Part 2 → Data shapes. The two exported names in Task 1 (`playOptions`, `applyResolution`) are the existing ones, unchanged.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: two `export` keywords and one new module that nothing imports yet, with its own passing spec.
- Phase 2 ends type-checking: two new copy functions over a type Phase 1 created, with their own passing spec; still nothing rendered.
- Phase 3 ends type-checking with the feature live: the required `damageForCard` prop is added and both of its two construction sites (`WarCouncilRound.tsx`, `HandFan.test.tsx`) are fixed in the same phase, so there is no point at which the app fails to compile.
- Phase 4 changes no production code — greps, gates, and a document.
