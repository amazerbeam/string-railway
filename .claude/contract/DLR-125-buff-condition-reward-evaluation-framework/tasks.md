# Tasks: Engine — buff condition/reward evaluation framework

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> **`plan.md` was not developer-confirmed.** This contract runs inside the 2026-08-23 unattended sprint run, whose dispatch instructs the plan-approval gate to be taken at its stated defaults and each default logged. No `AskUserQuestion` gate was presented. No mockup was called for: the two `.tsx` files in the map are touched only to pass an existing number through, and nothing new renders.

**Goal:** Give `buffAccrual.ts` its missing caller — a pure evaluator for the eleven shipping condition families, wired into `resolveTrickBank` at DLR-124 R3's ordered positions, so an activated condition buff genuinely changes damage, coins and the action-point pool, and DLR-117's preview inherits the contributions without arithmetic of its own.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/buffEvaluation.ts` — the pure condition evaluator, R4's cadence, and the one call that folds R1/R2/R5/R6 for a trick.
- `src/hunt/__tests__/buffEvaluation.test.ts` — one test per condition family (AC5), additivity (AC4), apply-to-card (AC3), cadence.
- `src/warCouncil/buffTrickFacts.ts` — derives the per-trick half of the context from the trick itself, mirroring `swanTierFactsFor`.
- `src/warCouncil/__tests__/buffTrickFacts.test.ts` — the derivation, including the player-only gate.
- `src/warCouncil/__tests__/bank.buffs.test.ts` — R3's order, the cash-out spend, and the Overlap Bonus at resolution level.
- `src/app/warCouncil/buffRoundState.ts` — the hand's buff bookkeeping, its assembly into `PlayCardOptions`, and the post-trick fold.
- `src/app/warCouncil/__tests__/buffRoundState.test.ts` — the fold: AP refund, coin accumulation, once-per-hand recording, the no-hit counter, and the per-hand-not-per-hit asymmetry.

**Modified:**
- `src/hunt/buffAccrual.ts` — two `*Paid` counters, `payableCashOutBonus`, `markCashOutPaid`.
- `src/hunt/__tests__/buffAccrual.test.ts:32` — the `EMPTY_BUFF_ACCRUAL` fixture gains two zeros; new cases for the spend.
- `src/hunt/index.ts` — export the new evaluation surface.
- `src/hunt/runTransitions.ts:70-78` — `recordEncounter` gains an optional eighth parameter.
- `src/hunt/__tests__/run-buffs.test.ts` — a case for the new parameter.
- `src/warCouncil/bank.ts` — `TrickFacts.buffs`, `TrickResolution.buffAccrual`/`.firedBuffIds`, R3's step 2 and step 4.
- `src/warCouncil/legalMoves.ts` — `PlayCardOptions.buffs?`.
- `src/warCouncil/playCard.ts:114-127` — thread the buff facts into `TrickFacts`.
- `src/warCouncil/index.ts` — export `buffTrickFactsFor` and its input type.
- `src/warCouncil/__tests__/bank.test.ts:29` — `TrickFacts` fixture gains `buffs: null`.
- `src/warCouncil/__tests__/bank.integration.test.ts:17` — same.
- `src/warCouncil/__tests__/rankTiers.resolution.test.ts` — same, at every `TrickFacts` literal.
- `src/app/warCouncil/commitHandlers.ts:51-62` — `playOptions` supplies `buffs`.
- `src/app/warCouncil/cardDamage.ts:72-86` — the preview passes it through; DLR-117 AC3.
- `src/app/warCouncil/roundUiState.ts` — `RoundUiState.buffHand`, `RoundUiSeed.coins?`.
- `src/app/warCouncil/roundReducer.ts` — the fold on the resolved-trick edge; the Apply Damage press flag.
- `src/app/warCouncil/quarryAdvance.ts` — the Quarry's follow already reads `playOptions`; confirm and thread `remainingHand`.
- `src/app/warCouncil/WarCouncilRound.tsx:220-245` — `coinsEarned` on both `onComplete` payloads; `coins` into the seed.
- `src/app/warCouncilMount.ts` — `WarCouncilRoundResult.coinsEarned`.
- `src/App.tsx:159-167` — pass `result.coinsEarned` to `recordEncounter`.
- `src/app/warCouncil/__tests__/BankMeter.test.tsx:16` — `TrickResolution` fixture gains two fields.
- `src/app/warCouncil/__tests__/roundHint.test.ts:62` — same.
- `src/app/warCouncil/__tests__/roundReducer.test.ts:127` — same.
- `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:37` — same.
- `src/app/warCouncil/__tests__/TrickWell.test.tsx:24` — same.

**Deleted:** (none)

**Developer decides or observes:**
- **`Keepsake` is expected to be unfireable in live play** — every dealt card is played, so the hand is empty at hand's end and the three Purse Keepsake cards pay nothing. Redefine "hand's end" against DLR-123's persistent encounter deck, or retire the family. Not decided here.
- **The Momentum/Blade spend model** — each pool is spent once per hand rather than re-applied at every cash-out, because R6's cap is stated per hand. Confirm the reading; reversing it is a one-line change in `bank.ts`.
- **The Overlap Bonus magnitude fires on real play for the first time** — `+(k−1)` Momentum from the shared multiplier pool. Never played against a real hand.
- **`Miser` now genuinely fights the shop** — a live Miser buff pays for *not* spending. Balance call for the end-of-epic pass.
- **DLR-117 AC1, the "once any buff is active" visibility gate** — left undone; hiding a currently-always-visible readout changes the felt at rest. Follow-up ticket.
- **Nothing announces a buff firing.** A player sees a larger number with no cause named. Judge whether that reads, and whether it needs a felt-side signal.

---

## Phase 1 — The pure evaluator

Everything in this phase is DOM-free, dependency-free `src/hunt/` logic with no caller yet, so the phase ends type-checking with the existing game byte-for-byte unchanged. It is the safest possible stopping point: nothing outside `src/hunt/` has been touched.

### Task 1: Add the cash-out spend model to `src/hunt/buffAccrual.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffAccrual.ts`
- Test: `src/hunt/__tests__/buffAccrual.test.ts`

- [x] **Step 1: Add the two paid counters to `BuffBonusAccrual` and to `EMPTY_BUFF_ACCRUAL`**

Extend the interface — the four existing fields keep their exact meaning and their existing docblock:

```ts
export interface BuffBonusAccrual {
  readonly multiplierBonus: number
  readonly flatDamageBonus: number
  readonly coinBonus: number
  readonly apRefunded: number
  /** DLR-125 — how much of `multiplierBonus` a cash-out has already been paid. Moves FORWARD
   *  only, and only when a cash-out actually fires. `startHandAccrual()` remains the only reset
   *  in this module and nothing resets this on a hit — R6's asymmetry, unchanged. */
  readonly multiplierPaid: number
  /** DLR-125 — the same, for `flatDamageBonus`. */
  readonly flatDamagePaid: number
}

export const EMPTY_BUFF_ACCRUAL: BuffBonusAccrual = {
  multiplierBonus: 0,
  flatDamageBonus: 0,
  coinBonus: 0,
  apRefunded: 0,
  multiplierPaid: 0,
  flatDamagePaid: 0,
}
```

- [x] **Step 2: Add `payableCashOutBonus` and `markCashOutPaid` below `resolveFiredBuffs`**

```ts
/** The unspent balance of the two axes that land AT a cash-out — R3's step 2 (Momentum, inside
 *  the product) and step 4 (Blade, outside it). */
export interface CashOutBonus {
  readonly multiplierBonus: number
  readonly flatDamageBonus: number
}

/** What THIS cash-out may add. Clamped at 0 so a malformed accrual can never produce a negative
 *  bonus that would REDUCE damage — `web-project.md`'s "guard the divisor, not the symptom",
 *  applied to a subtraction that feeds a rendered heart row. */
export function payableCashOutBonus(accrual: BuffBonusAccrual): CashOutBonus {
  return {
    multiplierBonus: Math.max(0, accrual.multiplierBonus - accrual.multiplierPaid),
    flatDamageBonus: Math.max(0, accrual.flatDamageBonus - accrual.flatDamagePaid),
  }
}

/** Records `paid` as spent. This is what makes R6's cap a PER-HAND bound rather than a
 *  per-cash-out one: a pool re-added at every cash-out would pay up to
 *  `MAX_FLAT_DAMAGE_BONUS_PER_HAND` three times in a hand holding a forced cash-out, a voluntary
 *  Apply Damage and an end-of-hand fold. Never mutates `accrual`. */
export function markCashOutPaid(accrual: BuffBonusAccrual, paid: CashOutBonus): BuffBonusAccrual {
  return {
    ...accrual,
    multiplierPaid: accrual.multiplierPaid + paid.multiplierBonus,
    flatDamagePaid: accrual.flatDamagePaid + paid.flatDamageBonus,
  }
}
```

- [x] **Step 3: Update the existing fixture and add spend cases to `buffAccrual.test.ts`**

Add `multiplierPaid: 0, flatDamagePaid: 0` to the literal at line 32, then add:

```ts
it('a second cash-out in the same hand pays nothing more once the pool is spent', () => {
  const accrued = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Magnitude, 5)
  const first = payableCashOutBonus(accrued)
  expect(first.flatDamageBonus).toBe(5)
  const after = markCashOutPaid(accrued, first)
  expect(payableCashOutBonus(after).flatDamageBonus).toBe(0)
})

it('a contribution accrued AFTER a cash-out is still payable at the next one', () => {
  const spent = markCashOutPaid(
    accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 2),
    { multiplierBonus: 2, flatDamageBonus: 0 },
  )
  const more = accrueAxisBonus(spent, BuffRewardAxis.Multiplier, 3)
  expect(payableCashOutBonus(more).multiplierBonus).toBe(3)
})

it('the accrued total still clips at its cap after a spend — the cap is per hand, not per pool', () => {
  let a = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 6)
  a = markCashOutPaid(a, payableCashOutBonus(a))
  a = accrueAxisBonus(a, BuffRewardAxis.Multiplier, 4)
  expect(a.multiplierBonus).toBe(MAX_MULTIPLIER_BONUS_PER_HAND)
  expect(payableCashOutBonus(a).multiplierBonus).toBe(0)
})
```

- [x] **Step 4: Run the scoped spec**

Run: `npx vitest run src/hunt/__tests__/buffAccrual.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 2: Write the condition evaluator in `src/hunt/buffEvaluation.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/buffEvaluation.ts`
- Test: `src/hunt/__tests__/buffEvaluation.test.ts`

- [x] **Step 1: Write the failing spec first — one case per condition family (AC5)**

Create `src/hunt/__tests__/buffEvaluation.test.ts` with a `ctx()` helper producing a `BuffTrickContext` of all-false / all-empty / all-zero defaults plus an override object, and a `buff()` helper minting through `mintFromTemplate(templateById(id)!, tier, id)` so **every case is a real v1 template rather than a synthetic literal** — AC5's requirement. Cover, one `it` each, asserting `buffFires` is `true` in the satisfying context and `false` in a near-miss:

`taker:bells:magnitude` (win with Bells) · `feeder:keys:coins` (lose with Keys) · `markOfRank:9:magnitude` (win with a 9) · `sidestep:magnitude` (lost a skull trick) · `glutton:coins` (won a skull trick) · `hoarder:magnitude` at bronze (bank 2) · `unbloodied:coins` at silver (3 tricks without a hit) · `debtCollector:magnitude` (`applyDamagePressed`) · `keepsake:moons:coins` (a Moons card remaining, `finalTrick`) · `miser:magnitude` at bronze (5 coins) · `cornered:multiplier` at bronze (health below 60% of `PLAYER_START_HEALTH`).

Add the three structural cases:

```ts
it('every consumable and activated kind fires on nothing (AC5 negative half)', () => {
  for (const kind of [BuffKind.Cheat, BuffKind.Timebomb, BuffKind.Ward, BuffKind.Puppeteer,
    BuffKind.SecondThoughts, BuffKind.Foresight, BuffKind.Spyglass, BuffKind.Shield,
    BuffKind.Unassigned]) {
    expect(buffFires({ id: 1, kind, tier: BuffTier.Bronze,
      condition: { kind }, reward: { axis: BuffRewardAxis.Magnitude, value: 1 } },
      ctx({ playerWon: true, skullTrick: true, finalTrick: true, bankAfterTrick: 9 }))).toBe(false)
  }
})

it('a threshold family already fired this hand does not fire again', () => {
  const hoarder = fromTemplate('hoarder:magnitude', BuffTier.Bronze, 7)
  const c = ctx({ bankAfterTrick: 4 })
  expect(firedBuffs([hoarder], [], c)).toHaveLength(1)
  expect(firedBuffs([hoarder], [7], c)).toHaveLength(0)
})

it('an event family fires on every trick its condition holds', () => {
  const taker = fromTemplate('taker:bells:magnitude', BuffTier.Bronze, 8)
  const c = ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells] })
  expect(firedBuffs([taker], [8], c)).toHaveLength(1)
})

it('Keepsake fires only at the final trick', () => {
  const k = fromTemplate('keepsake:moons:coins', BuffTier.Bronze, 9)
  const held = { remainingSuits: [BuffTargetSuit.Moons] }
  expect(firedBuffs([k], [], ctx({ ...held, finalTrick: false }))).toHaveLength(0)
  expect(firedBuffs([k], [], ctx({ ...held, finalTrick: true }))).toHaveLength(1)
})
```

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts`
Expected: fails to collect — `Cannot find module './buffEvaluation'`. That is the failing state this step establishes.

- [x] **Step 2: Write `buffEvaluation.ts`**

The module docblock cites `hybrid-design.md` §5 R4 and `v1-buff-card-list.md` → *Condition templates* / *Firing cadence* rather than restating them, and states plainly that Long Fall (#8) is deferred by DLR-111 and has no template. The shapes are `plan.md` Part 2 → Data shapes verbatim. The core:

```ts
/** ONE buff's condition against ONE trick. A total `switch` over `BuffConditionKind`, so a
 *  twelfth family added to `buffCosts.ts` fails to compile HERE rather than silently never
 *  firing. Every Activated kind and `BuffKind.Unassigned` return `false` through the guard
 *  above the switch — a card that did not fire, which R7 calls a legitimate player mistake, not
 *  an error. NEVER THROWS: no `ErrorBoundary` exists (DLR-131) and this runs inside a reducer
 *  dispatch. */
export function buffFires(buff: Buff, ctx: BuffTrickContext): boolean {
  if (!isConditionFamily(buff.kind)) return false
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const threshold = conditionThresholdOf(buff)
  switch (buff.kind) {
    case BuffKind.Taker:
      return ctx.playerWon && suit !== null && ctx.playerSuits.includes(suit)
    case BuffKind.Feeder:
      return !ctx.playerWon && suit !== null && ctx.playerSuits.includes(suit)
    case BuffKind.MarkOfRank:
      return ctx.playerWon && rank !== null && ctx.playerRanks.includes(rank)
    // "Dodge a skull with this card" — the trick this buff was activated FOR is a Dodge.
    case BuffKind.Sidestep:
      return ctx.skullTrick && !ctx.playerWon
    // "Eat a skull with this card" — the same trick is a Skull Win.
    case BuffKind.Glutton:
      return ctx.skullTrick && ctx.playerWon
    case BuffKind.Hoarder:
      return threshold !== null && ctx.bankAfterTrick >= threshold
    case BuffKind.Unbloodied:
      return threshold !== null && ctx.tricksWithoutHit >= threshold
    // DLR-109's reading, enforced: Apply Damage means THE PRESS, not the landing.
    case BuffKind.DebtCollector:
      return ctx.applyDamagePressed
    case BuffKind.Keepsake:
      return ctx.finalTrick && suit !== null && ctx.remainingSuits.includes(suit)
    case BuffKind.Miser:
      return threshold !== null && ctx.coins >= threshold
    // Integer both sides — no division, so no NaN can reach a rendered heart row.
    case BuffKind.Cornered:
      return threshold !== null && ctx.playerHealth * 100 < threshold * PLAYER_START_HEALTH
  }
}

/** R4 — `Event` fires every time, `Threshold` and `Terminal` once per hand. Order follows
 *  `active`, because the pile's order is the player's mental order. */
export function firesOncePerHand(buff: Buff): boolean {
  const cadence = BUFF_CADENCE[buff.kind]
  return cadence === BuffCadence.Threshold || cadence === BuffCadence.Terminal
}

export function firedBuffs(
  active: readonly Buff[],
  firedThisHand: readonly BuffId[],
  ctx: BuffTrickContext,
): readonly Buff[] {
  return active.filter(
    (buff) =>
      BUFF_CADENCE[buff.kind] !== BuffCadence.Activated &&
      !(firesOncePerHand(buff) && firedThisHand.includes(buff.id)) &&
      buffFires(buff, ctx),
  )
}

/** Unbloodied's condition counter, advanced. THE one statement of it — `resolveTrickBank` needs
 *  the value INCLUDING this trick and `foldBuffOutcome` stores it for the next one. A CONDITION
 *  counter, not a cap: this is the one thing here that legitimately zeroes on a hit, and it lives
 *  as far from `buffAccrual.ts` as the module graph allows so nobody confuses the two (R6). */
export function advanceTricksWithoutHit(current: number, playerHit: boolean): number {
  return playerHit ? 0 : current + 1
}

/** R4's cadence and R1/R2/R5/R6 in one call, so `bank.ts` states R3's ORDER and nothing else.
 *  Delegates every figure to `resolveFiredBuffs` — the accrual arithmetic is never re-derived. */
export function resolveTrickBuffs(
  input: BuffTrickInput,
  ctx: BuffTrickContext,
): BuffTrickOutcome {
  const fired = firedBuffs(input.active, input.firedThisHand, ctx)
  return {
    accrual: resolveFiredBuffs(input.accrual, fired),
    firedIds: fired.map((buff) => buff.id),
  }
}
```

- [x] **Step 3: Add the AC3 and AC4 cases to the same spec**

```ts
it('AC3 — the same generic Sidestep template fires off two different played cards in one hand', () => {
  const sidestep = fromTemplate('sidestep:magnitude', BuffTier.Bronze, 3)
  // Trick 1: the player dodges with a Bells card. Trick 2: with a Keys card. The template names
  // neither, and fires on both — "this card" is the card played on the trick it was bought for.
  expect(buffFires(sidestep, ctx({ skullTrick: true, playerWon: false,
    playerSuits: [BuffTargetSuit.Bells] }))).toBe(true)
  expect(buffFires(sidestep, ctx({ skullTrick: true, playerWon: false,
    playerSuits: [BuffTargetSuit.Keys] }))).toBe(true)
  // …and does NOT fire on a trick with no skull, whichever card was played.
  expect(buffFires(sidestep, ctx({ playerWon: false,
    playerSuits: [BuffTargetSuit.Bells] }))).toBe(false)
})

it('AC4 — two satisfied buffs on one trick add within their axis, plus the Overlap Bonus', () => {
  const blade = fromTemplate('taker:bells:magnitude', BuffTier.Silver, 1) // +3 damage
  const second = fromTemplate('markOfRank:9:magnitude', BuffTier.Bronze, 2) // +1 damage
  const out = resolveTrickBuffs(
    { active: [blade, second], accrual: startHandAccrual(), firedThisHand: [],
      hand: HAND_CONTEXT },
    ctx({ playerWon: true, playerSuits: [BuffTargetSuit.Bells], playerRanks: [9] }),
  )
  expect(out.firedIds).toEqual([1, 2])
  expect(out.accrual.flatDamageBonus).toBe(4)
  expect(out.accrual.multiplierBonus).toBe(1) // R5 — Overlap Bonus, k - 1 with k = 2
})
```

Run: `npx vitest run src/hunt/__tests__/buffEvaluation.test.ts`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 4: Record the Keepsake defect as an executable observation, not a comment**

```ts
it('Keepsake evaluates correctly, and records that the live path hands it an empty hand', () => {
  const k = fromTemplate('keepsake:moons:coins', BuffTier.Bronze, 9)
  // The evaluator is right…
  expect(buffFires(k, ctx({ finalTrick: true, remainingSuits: [BuffTargetSuit.Moons] }))).toBe(true)
  // …and the shape the live game actually reaches it with is this one. With HAND_SIZE cards and
  // HAND_SIZE tricks, every dealt card is played, so `remainingSuits` is empty at the final
  // trick and the three Purse Keepsake cards pay nothing. Known open defect — see
  // `plan.md` → Risks. Not fixed here; pinned so a fix has a failing assertion to flip.
  expect(buffFires(k, ctx({ finalTrick: true, remainingSuits: [] }))).toBe(false)
})
```

- [x] **Step 5: Export the new surface from the hunt barrel and typecheck**

Add to `src/hunt/index.ts`, beside the existing `buffAccrual` exports:

```ts
export type {
  BuffHandContext,
  BuffTrickContext,
  BuffTrickInput,
  BuffTrickOutcome,
} from './buffEvaluation'
export {
  advanceTricksWithoutHit,
  buffFires,
  firedBuffs,
  firesOncePerHand,
  resolveTrickBuffs,
} from './buffEvaluation'
export type { CashOutBonus } from './buffAccrual'
export { markCashOutPaid, payableCashOutBonus } from './buffAccrual'
```

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/buffEvaluation.test.ts src/hunt/__tests__/buffAccrual.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

- [x] **Step 6: Measure the two files against the 400-line budget**

Run: `(Get-Content src\hunt\buffEvaluation.ts).Count; (Get-Content src\hunt\buffAccrual.ts).Count`
Expected: each below 400. If either is at or above it, split it in this task — `CLAUDE.md`'s limit is blocking and fixed in-ticket.

---

## Phase 2 — Resolution: R3's order, inside `resolveTrickBank`

This phase gives the evaluator its call site and widens two engine types. It ends type-checking with every existing spec updated in the same task as the shape it depends on — the mandatory shape-change task ordering — so there is no boundary at which a fixture is half-migrated.

### Task 3: Derive the per-trick context in `src/warCouncil/buffTrickFacts.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/buffTrickFacts.ts`
- Modify: `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/buffTrickFacts.test.ts`

- [x] **Step 1: Write the module, mirroring `swanTierFactsFor`**

```ts
/**
 * DLR-125 — the per-trick half of the buff evaluation context, derived from the trick itself.
 * THE single producer, read by `playCard` and by `cardDamage`'s preview, exactly as
 * `swanTierFactsFor` is: two readings of "what did the player play" is how a preview and a
 * commit drift apart.
 *
 * `src/hunt/` cannot see `TrickCard`, so this crossing lives on the `warCouncil` side and hands
 * `hunt` plain `BuffTargetSuit` values. The two suit unions are pinned member-for-member by a
 * test in `buffs.test.ts`; `TARGET_SUIT` below is the total map between them, so a member added
 * to `Suit` fails to compile here rather than silently mapping to `undefined`.
 */
const TARGET_SUIT: Readonly<Record<Suit, BuffTargetSuit>> = {
  [Suit.Bells]: BuffTargetSuit.Bells,
  [Suit.Keys]: BuffTargetSuit.Keys,
  [Suit.Moons]: BuffTargetSuit.Moons,
}

/** What the app layer supplies — everything the trick itself cannot say. */
export interface BuffHandInput {
  readonly active: readonly Buff[]
  readonly accrual: BuffBonusAccrual
  readonly firedThisHand: readonly BuffId[]
  readonly tricksWithoutHit: number
  readonly coins: number
  readonly playerHealth: number
  readonly applyDamagePressed: boolean
}

/** `null` in, `{ buffs: null }` out — a caller that evaluates no buffs says so once, here, and
 *  `bank.ts` needs no second guard. `remainingHand` is the player's hand AFTER the played card
 *  left it, which is what "at hand's end" means for Keepsake. */
export function buffTrickFactsFor(
  trick: readonly TrickCard[],
  remainingHand: readonly Card[],
  input: BuffHandInput | null,
): Pick<TrickFacts, 'buffs'> {
  if (input === null) return { buffs: null }
  const played = trick.filter((t) => t.side === PlayerSide.Player)
  return {
    buffs: {
      active: input.active,
      accrual: input.accrual,
      firedThisHand: input.firedThisHand,
      hand: {
        playerSuits: played.map((t) => TARGET_SUIT[t.card.suit]),
        playerRanks: played.map((t) => t.card.rank),
        remainingSuits: remainingHand.map((c) => TARGET_SUIT[c.suit]),
        tricksWithoutHit: input.tricksWithoutHit,
        coins: input.coins,
        playerHealth: input.playerHealth,
        applyDamagePressed: input.applyDamagePressed,
      },
    },
  }
}
```

Export both names from `src/warCouncil/index.ts` beside the `rankTierRules` line.

- [x] **Step 2: Write the spec**

Cases: a `null` input yields `{ buffs: null }`; only the **player's** cards reach `playerSuits`/`playerRanks` (a Quarry Bells card on the table does not satisfy a Bell-Taker); `remainingSuits` reflects the hand passed in; a trick with no player card yields empty lists.

Run: `npx vitest run src/warCouncil/__tests__/buffTrickFacts.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 4: Wire evaluation into `resolveTrickBank` and widen the two shapes ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/bank.ts`
- Modify: `src/warCouncil/legalMoves.ts`
- Modify: `src/warCouncil/playCard.ts:114-127`
- Test: `src/warCouncil/__tests__/bank.buffs.test.ts`
- Test: `src/warCouncil/__tests__/bank.test.ts:29`
- Test: `src/warCouncil/__tests__/bank.integration.test.ts:17`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts`
- Test: `src/app/warCouncil/__tests__/BankMeter.test.tsx:16`
- Test: `src/app/warCouncil/__tests__/roundHint.test.ts:62`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts:127`
- Test: `src/app/warCouncil/__tests__/roundReducer.timebomb.test.ts:37`
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx:24`

- [x] **Step 1: Widen `TrickFacts` and `TrickResolution` in `src/warCouncil/bank.ts`**

```ts
export interface TrickFacts {
  // …the nine existing fields, unchanged…
  /** DLR-125 — the buffs activated for this trick plus the hand facts their conditions read.
   *  REQUIRED and `| null`, not optional: optional would let a call site skip buffs silently,
   *  and this shape has five construction sites the compiler should enumerate. A plain value
   *  handed in, never a run figure read — exactly `bankClimbBonus`'s and `blastGuarded`'s
   *  contract. */
  readonly buffs: BuffTrickInput | null
}

export interface TrickResolution extends BankState {
  // …the existing fields, unchanged…
  /** DLR-125 — the hand's accrual AFTER this trick, or `null` when `TrickFacts.buffs` was
   *  `null`. Reported back OUT so the felt folds one value rather than re-deriving it. */
  readonly buffAccrual: BuffBonusAccrual | null
  /** DLR-125 — the ids that fired on this trick, in `active` order. */
  readonly firedBuffIds: readonly BuffId[]
}
```

- [x] **Step 2: Evaluate and apply at R3's step 2 and step 4 inside `resolveTrickBank`**

Immediately after the existing `damageToPlayer` line and **before** the `if (trickHit || timebombResets)` block, evaluate; then apply the payable bonus at each of the two cash-out points. Add this comment above the evaluation, because the ordering is the rule:

```ts
// DLR-125/DLR-124 R3 — evaluation happens HERE, between the climb and the cash-out, because two
// conditions read figures that exist only inside this function: Hoarder's bank AFTER the climb
// and Unbloodied's "was this trick a hit". R3's five steps then land in their forced order —
// step 2 (Momentum) inside the product below, step 4 (Blade) outside it, after §7's two-thirds
// floor. Steps 1 and 5 (Second Wind, Purse) touch nothing this hand's damage depends on and are
// folded by the felt from `buffAccrual`. Cited, never restated: hybrid-design.md §5.
const buffOutcome =
  trick.buffs === null
    ? null
    : resolveTrickBuffs(trick.buffs, {
        playerWon: trick.playerWon,
        skullTrick: trick.skullTrick,
        playerHit: damageToPlayer > 0,
        finalTrick: trick.finalTrick,
        bankAfterTrick: bank,
        ...trick.buffs.hand,
        tricksWithoutHit: advanceTricksWithoutHit(
          trick.buffs.hand.tricksWithoutHit,
          damageToPlayer > 0,
        ),
      })
let accrual = buffOutcome?.accrual ?? null
```

Inside the `if (!swanKeepsBank)` branch, replace the two lines that compute `cashOut` with the buffed form, and do the same at the `finalTrick` fold:

```ts
// R3 steps 2-4: Momentum joins the multiplier INSIDE the product, Blade is added to what the
// product (and §7's two-thirds reduction) produced. `spend`/`markCashOutPaid` is what makes
// R6's cap a per-HAND bound: each pool pays once, not once per cash-out.
const spend = accrual === null ? NO_CASH_OUT_BONUS : payableCashOutBonus(accrual)
cashOut = forcedCashValue(bank, multiplier + spend.multiplierBonus) + spend.flatDamageBonus
if (accrual !== null) accrual = markCashOutPaid(accrual, spend)
```

and

```ts
const endSpend = accrual === null ? NO_CASH_OUT_BONUS : payableCashOutBonus(accrual)
const handEndCash = trick.finalTrick
  ? cashValue(bank, multiplier + endSpend.multiplierBonus) + endSpend.flatDamageBonus
  : 0
if (trick.finalTrick && accrual !== null) accrual = markCashOutPaid(accrual, endSpend)
```

`cashedAtHandEnd` keeps reading `handEndCash > 0`, unchanged. Return `buffAccrual: accrual` and `firedBuffIds: buffOutcome?.firedIds ?? []`. Declare `const NO_CASH_OUT_BONUS: CashOutBonus = { multiplierBonus: 0, flatDamageBonus: 0 }` at module scope beside `TAKEN` — a `const`, not mutable state.

- [x] **Step 3: Add `PlayCardOptions.buffs?` and thread it through `playCard`**

In `src/warCouncil/legalMoves.ts`, add to `PlayCardOptions`:

```ts
  /** DLR-125 — the hand-scoped buff input. Optional like every other field on this interface;
   *  absent is "this caller evaluates no buffs", which is what the Quarry's own call sites are. */
  readonly buffs?: BuffHandInput
```

In `src/warCouncil/playCard.ts`, add one spread to the `TrickFacts` literal, beside `swanTierFactsFor`:

```ts
      ...swanTierFactsFor(completedTrick, options?.playerRankTiers),
      // DLR-125 — `next.hands` is already post-removal, which is exactly "the hand at hand's
      // end" Keepsake reads. Derived by the ONE producer both this call site and the preview use.
      ...buffTrickFactsFor(completedTrick, next.hands[PlayerSide.Player], options?.buffs ?? null),
```

- [x] **Step 4: Add `buffs: null` to the three `TrickFacts` fixtures and the two new `TrickResolution` fields to the five resolution fixtures**

`bank.test.ts:29`, `bank.integration.test.ts:17`, and every `TrickFacts` literal in `rankTiers.resolution.test.ts` gain `buffs: null`. `BankMeter.test.tsx:16`, `roundHint.test.ts:62`, `roundReducer.test.ts:127`, `roundReducer.timebomb.test.ts:37` and `TrickWell.test.tsx:24` gain `buffAccrual: null, firedBuffIds: []`.

- [x] **Step 5: Write `bank.buffs.test.ts` — R3's order at resolution level**

```ts
it('R3 — Momentum is inside the product and Blade is outside it', () => {
  // Bank 3, multiplier 3, final trick. A bronze Momentum (+2) and a bronze Blade (+1) both fire.
  // Inside-the-product: (3) x (3 + 2) = 15, then + 1 flat = 16. If Blade were inside the
  // product instead, the figure would be 3 x (3 + 2 + 1) = 18 — the exact confusion the cost
  // model's price gap depends on not happening.
  expect(r.cashOut).toBe(16)
})

it('R3 step 4 lands AFTER §7\'s two-thirds floor on a forced cash-out', () => { … })

it('R6 — the flat pool pays once across a forced cash-out and the end-of-hand fold', () => { … })

it('R5 — three buffs firing on one trick add +2 Momentum from the Overlap Bonus', () => { … })

it('a null `buffs` fact reproduces the pre-DLR-125 figures exactly', () => {
  // The regression that matters most: every existing hand must play identically.
})
```

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__ src/hunt/__tests__`
Expected: both exit 0; Vitest reports 0 failed.

- [x] **Step 6: Measure `bank.ts` against the 400-line budget**

Run: `(Get-Content src\warCouncil\bank.ts).Count`
Expected: below 400. It stands at 315 before this task; if the edit pushes it to 400 or above, split the buff block into a sibling module in this task rather than reporting it.

---

## Phase 3 — The felt: hand state, the fold, and the four axes landing

This phase connects the engine to the game. It ends with an activated buff genuinely changing damage, the AP pool, and the run's purse, and with DLR-117's preview inheriting the contributions. Every change is data threading through paths that already exist; nothing new renders.

### Task 5: Build the hand's buff bookkeeping in `src/app/warCouncil/buffRoundState.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/buffRoundState.ts`
- Modify: `src/app/warCouncil/roundUiState.ts`
- Test: `src/app/warCouncil/__tests__/buffRoundState.test.ts`

- [x] **Step 1: Write `buffRoundState.ts`**

Shapes are `plan.md` Part 2 → Data shapes verbatim. The module docblock states why it is a separate file: `roundUiState.ts` stands at 379 of its 400-line budget and three documented state fields would breach it. The fold:

```ts
/**
 * Folds a resolved trick's buff outcome back into the felt. R3's steps 1 and 5 land here —
 * step 1 (Second Wind) into the AP pool, which is why this runs AFTER the trick has resolved and
 * never during it: a refund the player could re-spend on the trick that generated it is the loop
 * `MAX_REFUND_PER_HAND` exists to bound. Step 5 (Purse) accumulates for the hand's end.
 *
 * Fires on the `null` -> non-null edge of `resolvedTrick`, the same edge `openWindowOnTrickResolved`
 * uses, and must run BEFORE it so the refunded AP survives into the next window. Pure and
 * two-argument, so StrictMode's development double dispatch recomputes an identical value.
 *
 * `tricksWithoutHit` is the ONE counter here that zeroes on a hit. It is Unbloodied's CONDITION,
 * not a cap: R6's four caps reset per hand and NOT on a hit, they live in `buffAccrual.ts`, and
 * `startHandAccrual()` is still the only reset that touches them.
 */
export function foldBuffOutcome(prev: RoundUiState, next: RoundUiState): RoundUiState {
  if (prev.resolvedTrick !== null || next.resolvedTrick === null) return next
  const { resolution } = next.resolvedTrick
  const accrual = resolution.buffAccrual
  const hand = next.buffHand
  if (accrual === null) {
    return {
      ...next,
      buffHand: {
        ...hand,
        tricksWithoutHit: advanceTricksWithoutHit(
          hand.tricksWithoutHit,
          resolution.damageToPlayer > 0,
        ),
      },
    }
  }
  // Deltas, not totals: `accrual` is the hand's running figure and the pool has already been
  // credited with everything before this trick.
  const refunded = accrual.apRefunded - hand.accrual.apRefunded
  const coined = accrual.coinBonus - hand.accrual.coinBonus
  const firedOnce = firedOncePerHandIds(next, resolution.firedBuffIds)
  return {
    ...next,
    buffActivation: { ...next.buffActivation, apPool: next.buffActivation.apPool + refunded },
    buffHand: {
      accrual,
      firedThisHand: [...hand.firedThisHand, ...firedOnce],
      tricksWithoutHit: advanceTricksWithoutHit(
        hand.tricksWithoutHit,
        resolution.damageToPlayer > 0,
      ),
      coinsEarned: hand.coinsEarned + coined,
      applyDamagePressed: hand.applyDamagePressed,
    },
  }
}
```

`firedOncePerHandIds` resolves each fired id back to its `Buff` through `offeredBuffs(state)` — **never a second filter** — and keeps only those `firesOncePerHand` is true for. `buffHandInputFor(state)` assembles `BuffHandInput` from `offeredBuffs(state)` filtered to `state.buffActivation.activatedThisTrick`, `state.buffHand`, `state.encounter.health[DuelSide.Player]` and `state.coins`.

- [x] **Step 2: Add `buffHand` to `RoundUiState` and `coins?` to `RoundUiSeed`**

In `src/app/warCouncil/roundUiState.ts`: add `readonly buffHand: BuffHandState` to `RoundUiState` and `readonly coins: Coins` (read from the seed), add `readonly coins?: Coins` to `RoundUiSeed`, and in `createRoundUiState` add `buffHand: startBuffHand(), coins: seed.coins ?? 0`. The docblock on `buffHand` states that `createRoundUiState` **is** the per-hand reset, because `App.tsx` remounts the felt per hand (`key={hand}`) — the identical argument `buffActivation`'s own docblock already makes.

- [x] **Step 3: Write the fold's spec**

```ts
it('R3 step 1 — a Second Wind refund lands in the pool for the NEXT window', () => { … })
it('R3 step 5 — a Purse contribution accumulates into coinsEarned', () => { … })
it('a threshold family that fired is recorded once and does not fire again this hand', () => { … })
it('an event family that fired is NOT recorded, so it can fire again', () => { … })
it('the no-hit counter climbs on a clean trick and zeroes on a hit', () => { … })
it('R6 — a hit does NOT reset the accrual or its caps', () => {
  // The single most likely thing to be lost in translation (hybrid-design.md §5 R6). A hand
  // that has spent its whole Momentum pool, then takes a hit, has no bonus left for the rest of
  // the hand — `startHandAccrual()` is the only reset and the fold never calls it.
})
```

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/buffRoundState.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

- [x] **Step 4: Measure both files**

Run: `(Get-Content src\app\warCouncil\buffRoundState.ts).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: each below 400. `roundUiState.ts` stands at 379; if the edit reaches 400, move a block into `buffRoundState.ts` in this task.

### Task 6: Supply the buff input and fold the outcome — the reducer and the shared assembly ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:51-62`
- Modify: `src/app/warCouncil/roundReducer.ts`
- Modify: `src/app/warCouncil/cardDamage.ts:72-86`
- Modify: `src/app/warCouncil/quarryAdvance.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Add `buffs` to `playOptions`**

In `commitHandlers.ts`, one field on the assembly whose docblock already explains why a second reading is the bug:

```ts
    playerRankTiers: state.rankTiers,
    // DLR-125 — the SIXTH field, in the one assembly all three readers share. This is what makes
    // DLR-117's preview inherit buff contributions with no arithmetic of its own: it hands a
    // hypothetical resolution to `applyResolution` and reads the health delta, so a buffed
    // multiplier and a Blade bonus arrive in that delta for free.
    buffs: buffHandInputFor(state),
```

- [x] **Step 2: Fold on the resolved-trick edge in `roundReducer.ts`**

```ts
export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  return openWindowOnTrickResolved(
    state,
    foldBuffOutcome(state, captureUnplayed(applyAction(state, action))),
  )
}
```

The order is load-bearing and gets a comment saying so: `foldBuffOutcome` credits the AP refund, then `openWindowOnTrickResolved` clears `activatedThisTrick` and leaves the pool untouched — the reverse order would clear the activations the fold reads.

- [x] **Step 3: Record the Apply Damage press — DLR-109's reading, enforced**

In `handleTapApplyDamage`'s committing branch, alongside the existing `spendAp` on `buffActivation`:

```ts
    // DLR-125 — Debt Collector's trigger is THE PRESS, not the landing (DLR-109's reading, until
    // now unenforced in code). Set here, at the moment the press commits, and read at the next
    // trick's resolution; firing on the queued payout's arrival would pay the family a trick or
    // more late and would silently contradict a reading DLR-109 already recorded.
    buffHand: { ...state.buffHand, applyDamagePressed: true },
```

- [x] **Step 4: Pass it through the preview — DLR-117 AC3**

In `cardDamage.ts`'s `shared` literal, beside `...swanTierFactsFor(...)`:

```ts
    // DLR-117 AC3, met by DLR-125. The preview STILL computes no damage: it threads the same
    // buff input the commit does through the same `resolveTrickBank`, then reads a health delta
    // off `applyResolution`. R3's order, the four caps and the Overlap Bonus are inherited, never
    // restated here — which is the preview's whole correctness argument.
    ...buffTrickFactsFor(visible, remainingHand, options.buffs ?? null),
```

where `remainingHand` is `state.round.hands[PlayerSide.Player].filter((c) => !sameCard(c, card))` — the hand as it would stand after this card is played, matching what `playCard` passes.

- [x] **Step 5: Confirm the Quarry's follow reads the same assembly**

`advanceQuarryFollow(result.state, playOptions(settled))` already threads every option; confirm no change is needed beyond the type widening, and that the Quarry's own `advanceQuarryLead` passes no options (a lead resolves no trick, so it evaluates nothing).

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__`
Expected: both exit 0; Vitest reports 0 failed.

### Task 7: Pay the Purse axis into the run's wallet ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/runTransitions.ts:70-78`
- Modify: `src/app/warCouncilMount.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:220-245`
- Modify: `src/App.tsx:159-167`
- Test: `src/hunt/__tests__/run-buffs.test.ts`

- [x] **Step 1: Add the optional eighth parameter to `recordEncounter`**

```ts
  unplayedCards: number | null,
  /** DLR-125 — Purse coins this hand's fired buffs earned, already clipped at
   *  `MAX_COIN_BONUS_PER_HAND` by the accrual. OPTIONAL and defaulted to 0 so all 48 existing
   *  call sites are unchanged; `App.tsx` is the only caller that passes it. Added to the same
   *  sum the win payout and the quick kill already feed, never as a second coin path. */
  buffCoinsEarned: Coins = 0,
): RunState {
```

Add `buffCoinsEarned` into the existing `coins:` sum in the returned run state.

- [x] **Step 2: Add `coinsEarned` to `WarCouncilRoundResult` and both `onComplete` payloads**

`src/app/warCouncilMount.ts` gains the required field with its docblock; `WarCouncilRound.tsx` adds `coinsEarned: ui.buffHand.coinsEarned` at lines 221 and 237, and passes `coins` into the reducer's seed so `Miser` can read the purse.

- [x] **Step 3: Pass it in `App.tsx`**

```ts
      result.unplayedAtResolve,
      result.coinsEarned,
    )
```

- [x] **Step 4: Add the run-level test**

```ts
it('DLR-125 — Purse coins a hand earned reach the run purse through recordEncounter', () => { … })
it('an omitted buffCoinsEarned reproduces the pre-DLR-125 payout exactly', () => { … })
```

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/run-buffs.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

### Task 8: Prove an activated buff genuinely pays ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/bank.buffs.test.ts`
- Test: `src/app/warCouncil/__tests__/buffRoundState.test.ts`

- [x] **Step 1: Add the end-to-end assertion the whole ticket exists for**

A resolution-level test that takes a real `EncounterState`, resolves the same trick twice — once with `buffs: null` and once with a bronze `taker:bells:magnitude` activated — hands both to `applyResolution`, and asserts the Quarry's health delta is **strictly larger** in the buffed case. This is the assertion that fails if any link in the chain is broken, and it is the one to point at when asking whether an activated buff now pays.

```ts
it('an activated Bell-Taker (Blade) genuinely increases the damage applyResolution deals', () => {
  const plain = applyResolution(encounter, resolveTrickBank(BANK, facts({ buffs: null })), false)
  const buffed = applyResolution(encounter, resolveTrickBank(BANK, facts({ buffs: INPUT })), false)
  expect(quarryLost(buffed)).toBeGreaterThan(quarryLost(plain))
})
```

Run: `npx vitest run src/warCouncil/__tests__/bank.buffs.test.ts src/app/warCouncil/__tests__/buffRoundState.test.ts`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 4 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, the pure-core boundary still holds, and the determinism guarantee DLR-130's simulator depends on is intact.

### Task 9: Confirm the pure-core boundary and the determinism guarantee still hold ✓

- Skill: none — verification only, no code is written or edited.

**Files:**
- (no files changed)

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Grep the pure trees for `Math.random`**

Run: `Get-ChildItem src\hunt,src\vault,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits. DLR-123 removed the last one and DLR-130's balance simulator depends on it staying that way.

- [x] **Step 3: Confirm no per-hit reset function was added to the accrual**

Run: `Select-String -Path src\hunt\buffAccrual.ts -Pattern "resetOnHit|resetForStreak|resetOnDamage|export function reset"`
Expected: zero hits. `startHandAccrual` must remain the only reset in that module — `hybrid-design.md` §5 R6 calls this the single most likely thing to be lost in translation.

### Task 10: Confirm no tunable was hard-coded and no vocabulary regression landed ✓

- Skill: none — verification only, no code is written or edited.

**Files:**
- (no files changed)

- [x] **Step 1: Grep the new modules for the cap and threshold literals configuration owns**

Run: `Get-ChildItem src\hunt\buffEvaluation.ts,src\warCouncil\buffTrickFacts.ts,src\app\warCouncil\buffRoundState.ts | Select-String -Pattern "\b(6|12|10|60|45|33|20)\b"`
Expected: no hit that is a bare tunable. Every cap comes from `apConfig.ts` and every threshold from `conditionThresholdOf`; a hit inside a comment or an array index is fine, a hit in an expression is a defect to fix here.

- [x] **Step 2: Grep the diff's new files for the retired vocabulary**

Run: `Get-ChildItem src\hunt\buffEvaluation.ts,src\warCouncil\buffTrickFacts.ts,src\app\warCouncil\buffRoundState.ts | Select-String -Pattern "[Ee]nvenom|[Pp]oison"`
Expected: zero hits. `6ba6224` retired both names; only `CardRank.Poison` (rank 8) survives, and nothing in these three files reads it.

### Task 11: Static gates and full suite ✓

- Skill: none — verification only, no code is written or edited.

**Files:**
- (no files changed)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed against a baseline of 1655 passed of 1655 across 127 files, plus this contract's new specs.

- [x] **Step 2: Formatting, scoped to this contract's files**

Run: `npx prettier --check src/hunt/buffEvaluation.ts src/hunt/buffAccrual.ts src/hunt/index.ts src/hunt/runTransitions.ts src/warCouncil/buffTrickFacts.ts src/warCouncil/bank.ts src/warCouncil/legalMoves.ts src/warCouncil/playCard.ts src/warCouncil/index.ts src/app/warCouncil/buffRoundState.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/commitHandlers.ts src/app/warCouncil/cardDamage.ts src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncilMount.ts src/App.tsx`
Expected: exits 0. On a failure, run `npx prettier --write` over **the same explicit list only** — never `npm run format`, which rewrites ~58 pre-existing `.md` files nobody asked for.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 4: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\buffEvaluation.ts,src\hunt\buffAccrual.ts,src\warCouncil\buffTrickFacts.ts,src\warCouncil\bank.ts,src\app\warCouncil\buffRoundState.ts,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\roundReducer.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count below 400. A file at or above it is fixed in this ticket, not reported.

### Task 12: Update the PR description ✓

- Skill: none — a document for the developer, no code.

**Files:**
- Create: `.claude/contract/DLR-125-buff-condition-reward-evaluation-framework/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; a summary of the change; **the explicit list of which of the twelve condition families fire and which do not**, because that list is what tells the developer and DLR-130's simulator which of the 78 cards are real; whether DLR-117's preview inherits buff contributions and why; how the per-hand-not-per-hit reset asymmetry is preserved; how the three known open defects (`Keepsake`, `Ward`, `Miser`) moved; every decision from the File map's "Developer decides or observes"; the verification results from Phase 4 with real numbers; and a one-line note that `BuffTrickContext` is the extension point for a twelfth family, added by widening the `switch` in `buffFires` — which will not compile until every family has a case.

---

## Self-review

**Spec coverage:**
- Generic condition-evaluation function over every condition shape (AC1) — Task 2.
- Generic reward application across all four axes (AC2) — Task 1 (the cash-out pools), Task 4 (Blade and Momentum landing), Task 5 (Second Wind and Purse landing), Task 7 (Purse reaching the run).
- Apply-to-card targeting reading the played card, not a printed one (AC3) — Task 2 Step 3, Task 3.
- Additive stacking of two satisfied buffs on one trick (AC4) — Task 2 Step 3.
- Exercised against a representative sample, at least one per condition-template row (AC5) — Task 2 Step 1.
- `buffAccrual.ts` gains a caller and an activated buff genuinely pays — Task 4, Task 8.
- DLR-117 AC3, buff contributions in the readout — Task 6 Step 4.
- DLR-109's "Apply Damage means the press" enforced — Task 6 Step 3.
- The R6 per-hand-not-per-hit asymmetry preserved — Task 1, Task 5 Step 3, Task 9 Step 3.
- The three known defects assessed, not fixed — Task 2 Step 4 (`Keepsake`), and the File map's developer list (`Ward`, `Miser`).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. The `{ … }` bodies in Task 4 Step 5, Task 5 Step 3, Task 7 Step 4 and Task 8 are named test cases whose assertion is fully specified by the `it` string and the surrounding step text, not unspecified work.

**Type / name consistency:** `BuffTrickContext`, `BuffHandContext`, `BuffTrickInput`, `BuffTrickOutcome`, `BuffHandInput`, `BuffHandState`, `CashOutBonus`, `buffFires`, `firedBuffs`, `firesOncePerHand`, `resolveTrickBuffs`, `advanceTricksWithoutHit`, `payableCashOutBonus`, `markCashOutPaid`, `buffTrickFactsFor`, `startBuffHand`, `buffHandInputFor`, `foldBuffOutcome`, `TrickFacts.buffs`, `TrickResolution.buffAccrual`, `TrickResolution.firedBuffIds`, `PlayCardOptions.buffs`, `RoundUiState.buffHand`, `RoundUiSeed.coins`, `WarCouncilRoundResult.coinsEarned`, `recordEncounter`'s `buffCoinsEarned` — each is spelled identically in `plan.md` Part 2 → Data shapes and at every task that uses it.

**Phase boundary cleanliness:**
- **Phase 1** ends with two `src/hunt/` modules that nothing imports; the game is byte-for-byte unchanged and every existing spec passes.
- **Phase 2** ends with both widened shapes and all eight affected fixture files updated in the same task as the shape, so no fixture is half-migrated; `buffs: null` reproduces every pre-DLR-125 figure, pinned by a test.
- **Phase 3** ends with the felt supplying and folding real buff state; every new field on `RoundUiState` is written by exactly one function and read by the assembly beside it.
- **Phase 4** changes no production code at all.
