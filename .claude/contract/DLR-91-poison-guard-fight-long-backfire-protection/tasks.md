# Tasks: Poison retimed to the next trick, plus Poison Guard

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-19

**Goal:** Make poison land at the next trick's resolution where a live streak exists — 4 to the Quarry, 2 to the player, forcing the player's cash-out — resequence all damage Quarry-first, then sell a 1-coin fight-long Poison Guard that saves the streak but not the health.

**Spec:** `plan.md` in this folder. Layout for the shop's new purse cell and the Fight-long shelf: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/hunt/__tests__/poisonGuard.test.ts` — the Guard's purchase, refusal, one-fight lifetime and consumption

**Modified:**
- `src/hunt/config.ts` — delete `SIMULTANEOUS_DEPLETION_WINNER`; rename `ENVENOM_DAMAGE` → `ENVENOM_QUARRY_DAMAGE`; add `ENVENOM_PLAYER_DAMAGE`, `POISON_GUARD_PRICE`
- `src/hunt/encounter.ts` — `applyDamage` Quarry-first, `resolveWinner` without a tie branch, `queueEnvenom` per-side, delete `applyPendingEnvenom`
- `src/hunt/types.ts` — docblock citing the deleted constant
- `src/hunt/run.ts` — `poisonGuardHeld`, `guardAfter`, `recordEncounter`'s fifth parameter, delete `beginNextHand`
- `src/hunt/shop.ts` — `ShopItem.PoisonGuard`, `PurchaseRefusal.GuardAlreadyActive`, `ShopStock.poisonGuardHeld`, `priceOf`, `categoryOf`, `refusalFor`
- `src/hunt/index.ts` — export surface
- `src/warCouncil/bank.ts` — three new `TrickFacts` fields, two new `TrickResolution` fields, the second cash-out trigger, `incomingFrom` sums the Quarry's two sources
- `src/warCouncil/legalMoves.ts` — `PlayCardOptions` extending `LegalMoveOptions`
- `src/warCouncil/playCard.ts` — forwards the poison facts into `TrickFacts`
- `src/warCouncil/index.ts` — export `PlayCardOptions`
- `src/app/warCouncil/roundReducer.ts` — supplies the pending figures, pays and re-books the queue at the trick, spends the Guard
- `src/app/warCouncil/roundUiState.ts` — `poisonGuardHeld` on the seed and the state
- `src/app/warCouncil/WarCouncilRound.tsx` — the prop through to the seed and the result
- `src/app/warCouncilMount.ts` — `poisonGuardHeld` on the mount props and the result
- `src/app/run/shopLabels.ts` — item name, both blurbs, the refusal sentence, the purse-cell copy
- `src/app/run/ShopPanel.tsx` — `poisonGuardHeld` prop and a fourth purse cell
- `src/App.tsx` — drop `beginNextHand`, fourth `refusals` entry, two new props, `recordEncounter`'s fifth argument
- `.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md` — §1 rewritten for D1–D6
- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — §9's simultaneous-depletion ruling marked overturned

**Test files modified:**
- `src/hunt/__tests__/config.test.ts`, `src/hunt/__tests__/encounter.test.ts`, `src/hunt/__tests__/envenom.test.ts`, `src/hunt/__tests__/shop.test.ts`, `src/hunt/__tests__/run.test.ts`
- `src/warCouncil/__tests__/bank.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`
- `src/app/run/__tests__/shopLabels.test.ts`, `src/app/run/__tests__/ShopPanel.test.tsx`

**Deleted:** *(no files — only exported functions and one constant, inside files that survive)*

**Developer decides or observes:**
- **A1's ordering** — a trick the player *wins* while poisoned banks first, then the poison cashes the larger figure. Watch whether the streak climbing and immediately dying reads as poison's doing or as a bug.
- **Whether poison is legible at all mid-hand** — pending poison is invisible on the felt, a held Guard is invisible during a fight, and the hit shows as damage plus a vanished streak with nothing naming the cause. The likeliest thing to come back from the playtest.
- **D7's difficulty change** — every mutual kill now favours the player. No compensating retune is in scope.
- **D8's oddity** — holding a Guard suppresses the cash-out, so the Quarry survives and the player takes 2 they would otherwise have dodged. Sometimes the right play is not to hold one.
- **Whether 2-and-3 damage and a 1-coin Guard feel right**, and whether "Poison Guard" and its blurb are the copy you want.

---

## Phase 1 — Quarry-first damage sequencing

D7, and it goes first because every later phase's expected damage numbers depend on it. One task, because deleting `SIMULTANEOUS_DEPLETION_WINNER` and rewriting the two functions that read it cannot be split without leaving a phase where a constant has no reader or a reader has no constant. Ends type-checking with the whole tree consistent.

### Task 1: Resequence `applyDamage` and retire the simultaneous-depletion ruling ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/encounter.ts` — `applyDamage`, `resolveWinner`
- Modify: `src/hunt/config.ts` — delete `SIMULTANEOUS_DEPLETION_WINNER`
- Modify: `src/hunt/index.ts` — drop it from the `./config` export list
- Modify: `src/hunt/run.ts` — the docblock on `outcomeFor` that cites it
- Modify: `src/hunt/types.ts` — the `EncounterState.winner` docblock that cites it
- Test: `src/hunt/__tests__/encounter.test.ts`, `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Write the failing tests for Quarry-first sequencing**

In `src/hunt/__tests__/encounter.test.ts`, replace the existing simultaneous-depletion test with these. Keep every other test in the file.

```ts
it('D7 — a Quarry killed by this event spares the player its damage entirely', () => {
  const encounter = startEncounter(0, 3)
  const quarryHealth = encounter.health[DuelSide.Quarry]
  const after = applyDamage(encounter, {
    [DuelSide.Player]: 99,
    [DuelSide.Quarry]: quarryHealth,
  })
  expect(after.health[DuelSide.Quarry]).toBe(0)
  expect(after.health[DuelSide.Player]).toBe(3)
  expect(after.winner).toBe(DuelSide.Player)
})

it('D7 — a Quarry that survives lets the player take the damage', () => {
  const encounter = startEncounter(0, 10)
  const after = applyDamage(encounter, { [DuelSide.Player]: 4, [DuelSide.Quarry]: 1 })
  expect(after.health[DuelSide.Player]).toBe(6)
  expect(after.winner).toBeNull()
})

it('D7 — the player still goes down when the Quarry survives the same event', () => {
  const encounter = startEncounter(0, 2)
  const after = applyDamage(encounter, { [DuelSide.Player]: 2, [DuelSide.Quarry]: 1 })
  expect(after.health[DuelSide.Player]).toBe(0)
  expect(after.winner).toBe(DuelSide.Quarry)
})

it('D7 — a non-finite figure aimed at the player is still refused on the Quarry-down path', () => {
  const encounter = startEncounter(0, 5)
  const quarryHealth = encounter.health[DuelSide.Quarry]
  expect(() =>
    applyDamage(encounter, { [DuelSide.Player]: Number.NaN, [DuelSide.Quarry]: quarryHealth }),
  ).toThrow(RangeError)
})
```

- [x] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts`
Expected: the four new tests fail — the first because the player's health is depleted anyway, the rest as the sequencing changes. Vitest reports a non-zero failed count.

- [x] **Step 3: Rewrite `applyDamage`'s depletion and `resolveWinner`**

In `src/hunt/encounter.ts`, replace the body of `applyDamage` after the two `assertApplicable` calls, and replace `resolveWinner` entirely. Both `assertApplicable` calls stay exactly where they are and run before any subtraction — the new fourth test above exists to keep the player's guard alive on the branch that skips the player's subtraction.

```ts
  // D7 — the Quarry FIRST. A Quarry that goes down to this event ends the encounter, and the
  // player takes nothing from it: the killing blow is its own protection. Replaces DLR-70's
  // deplete-both-then-inspect, which existed only to keep the simultaneous case reachable —
  // the developer overturned §9's tie ruling on 2026-08-19 and the tie is now unreachable by
  // construction rather than decided by a constant.
  const quarryHealth = deplete(encounter.health[DuelSide.Quarry], incoming[DuelSide.Quarry])
  const quarryDown = quarryHealth <= 0
  const playerHealth = quarryDown
    ? encounter.health[DuelSide.Player]
    : deplete(encounter.health[DuelSide.Player], incoming[DuelSide.Player])

  const health = {
    [DuelSide.Player]: playerHealth,
    [DuelSide.Quarry]: quarryHealth,
  }

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner: resolveWinner(health),
    pendingEnvenom: encounter.pendingEnvenom,
  }
```

```ts
/**
 * D7's two cases, over bars already depleted Quarry-first.
 *
 * There is no tie branch and no `SIMULTANEOUS_DEPLETION_WINNER`: `applyDamage` leaves the player's
 * health untouched whenever the Quarry goes down, so both-bars-empty is unreachable. §9's dated
 * ruling (2026-08-11 — the player loses) was overturned by the developer on 2026-08-19.
 *
 * `<= 0` rather than `=== 0` states the rule's own wording. `deplete` makes zero the only reachable
 * floor today, so the two are equivalent; the comparison survives a future path that does not clamp.
 */
function resolveWinner(health: Readonly<Record<DuelSide, Health>>): DuelSide | null {
  if (health[DuelSide.Quarry] <= 0) return DuelSide.Player
  if (health[DuelSide.Player] <= 0) return DuelSide.Quarry
  return null
}
```

Remove `SIMULTANEOUS_DEPLETION_WINNER` from this file's import block.

- [x] **Step 4: Delete the constant and fix the two docblocks that cite it**

In `src/hunt/config.ts`, delete the `SIMULTANEOUS_DEPLETION_WINNER` declaration and its comment block. In `src/hunt/index.ts`, remove it from the `./config` export list.

In `src/hunt/run.ts`, `outcomeFor`'s docblock currently says the tie is "already resolved to the Quarry via `SIMULTANEOUS_DEPLETION_WINNER`". Replace that clause with:

```ts
 * AC4 before AC5, deliberately: the player being down ends the run wherever it happens, including
 * on the final fight. There is no longer a simultaneous case to rule on — D7 (2026-08-19) makes
 * `applyDamage` spare the player whenever the Quarry goes down, so a mutual kill is a player win.
```

In `src/hunt/types.ts`, `EncounterState.winner`'s docblock ends "rather than a translation onto a second vocabulary" after citing the constant. Replace the citation clause so it reads:

```ts
  /** `null` while the encounter is live. `Player` — the encounter is won; `Quarry` — the run
   *  ends. Typed `DuelSide` so a screen reads the winning side directly rather than translating
   *  onto a second vocabulary. Since D7 (2026-08-19) a Quarry killed by an event spares the
   *  player that event's damage, so `Quarry` here means the player went down alone. */
```

- [x] **Step 5: Drop the constant's own spec and confirm no reference survives**

In `src/hunt/__tests__/config.test.ts`, delete the `SIMULTANEOUS_DEPLETION_WINNER` assertions and its import.

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "SIMULTANEOUS_DEPLETION_WINNER"`
Expected: zero hits.

- [x] **Step 6: Verify the phase**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/config.test.ts src/hunt/__tests__/run.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

---

## Phase 2 — Poison's two damage figures

D2. Splitting the amounts by target side is independent of *when* poison is paid, so it lands before the retiming and leaves the hand-start payment working on the new figures. The rename is the risky half — 36 hits across 9 files, one of them user-facing copy — so it happens in a single task with a grep to prove nothing stale survives.

### Task 2: Rename `ENVENOM_DAMAGE` and add the player-side figure ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts` — rename to `ENVENOM_QUARRY_DAMAGE`, add `ENVENOM_PLAYER_DAMAGE`
- Modify: `src/hunt/encounter.ts` — `queueEnvenom` reads the per-side figure
- Modify: `src/hunt/index.ts` — both names in the `./config` export list
- Modify: `src/warCouncil/bank.ts` — the comment referencing the old name
- Modify: `src/app/run/shopLabels.ts` — the Envenom blurb, rewritten for both figures
- Test: `src/hunt/__tests__/config.test.ts`, `src/hunt/__tests__/envenom.test.ts`, `src/app/run/__tests__/shopLabels.test.ts`, `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`

- [x] **Step 1: Replace the config key with the pair**

In `src/hunt/config.ts`, replace the `ENVENOM_DAMAGE` declaration and its comment block with:

```ts
// DLR-91 D2 (2026-08-19) — poison's two figures. TWO keys, not one shared number: the player-side
// hit is HALVED because it also forces the streak's cash-out (D3), which the Quarry has no
// equivalent of. A single shared key is the bug that type-checks, reads correctly, and pays the
// wrong side. Renamed from ENVENOM_DAMAGE for exactly that reason — a bare name sitting beside
// ENVENOM_PLAYER_DAMAGE is an invitation to reach for the wrong one.
//
// The Quarry's 4 is TRANSCRIBED from version-4-scope.md §1: "the same figure the doc already uses
// for 'one fight's worth of damage' (the-hunt.md §9) and for the shop's own Heal".
// The player's 2 is DEVELOPER-CHOSEN, 2026-08-19. Not transcribed and not an open tuning value.
// UNIT: health points, applied once, to one side, at the resolution of the next trick.
export const ENVENOM_QUARRY_DAMAGE: Damage = 4
export const ENVENOM_PLAYER_DAMAGE: Damage = 2
```

- [x] **Step 2: Book the per-side figure in `queueEnvenom`**

In `src/hunt/encounter.ts`, swap the import and rewrite `queueEnvenom`:

```ts
/** D2 — the amount owed depends on WHICH SIDE will pay it. Stated here, once, beside the booking:
 *  a caller that had to choose the figure itself is a caller that can choose the wrong one. */
function envenomDamageFor(target: DuelSide): Damage {
  return target === DuelSide.Player ? ENVENOM_PLAYER_DAMAGE : ENVENOM_QUARRY_DAMAGE
}
```

```ts
/**
 * D1/D3 — book poison against one side, to be paid at the resolution of the NEXT TRICK.
 *
 * ACCUMULATES rather than overwrites (D4), so two bookings against one side sum. Returns the
 * encounter UNCHANGED when it is already resolved — a hit must never be carried into a fight that
 * is over. NEVER throws: the reducer calls this during an event handler, and a throw there
 * unmounts the tree.
 */
export function queueEnvenom(encounter: EncounterState, target: DuelSide): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return {
    ...encounter,
    pendingEnvenom: {
      ...encounter.pendingEnvenom,
      [target]: encounter.pendingEnvenom[target] + envenomDamageFor(target),
    },
  }
}
```

- [x] **Step 3: Update the export list, the stale comment, and the blurb**

In `src/hunt/index.ts`, replace `ENVENOM_DAMAGE` with `ENVENOM_QUARRY_DAMAGE,` and `ENVENOM_PLAYER_DAMAGE,` in the `./config` export list.

In `src/warCouncil/bank.ts`, the `TrickResolution.envenomTarget` docblock names `ENVENOM_DAMAGE` — change it to "the poison figure for that side (`ENVENOM_QUARRY_DAMAGE` or `ENVENOM_PLAYER_DAMAGE`)".

In `src/app/run/shopLabels.ts`, import both new names and replace the Envenom blurb. Both figures interpolated, never quoted:

```ts
  [ShopItem.Envenom]: `Poison a card in your hand. The winner of the trick it is played into takes damage at the next trick — ${ENVENOM_QUARRY_DAMAGE} for the Quarry, ${ENVENOM_PLAYER_DAMAGE} for you, and yours cashes out your streak.`,
```

- [x] **Step 4: Retarget every spec that names the old key, and add the asymmetry test**

Across `src/hunt/__tests__/config.test.ts`, `src/hunt/__tests__/envenom.test.ts`, `src/app/run/__tests__/shopLabels.test.ts` and `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`, replace every `ENVENOM_DAMAGE` reference with whichever of the two names the assertion actually means — the Quarry's figure wherever the Quarry is the target, the player's wherever the player is. Add to `src/hunt/__tests__/envenom.test.ts`:

```ts
it('D2 — books the Quarry’s figure against the Quarry and the player’s against the player', () => {
  const base = startEncounter(0, 10)
  expect(queueEnvenom(base, DuelSide.Quarry).pendingEnvenom[DuelSide.Quarry]).toBe(
    ENVENOM_QUARRY_DAMAGE,
  )
  expect(queueEnvenom(base, DuelSide.Player).pendingEnvenom[DuelSide.Player]).toBe(
    ENVENOM_PLAYER_DAMAGE,
  )
})

it('D4 — two bookings against one side sum rather than replacing', () => {
  const once = queueEnvenom(startEncounter(0, 10), DuelSide.Player)
  expect(queueEnvenom(once, DuelSide.Player).pendingEnvenom[DuelSide.Player]).toBe(
    ENVENOM_PLAYER_DAMAGE * 2,
  )
})
```

- [x] **Step 5: Prove the old name is gone and the phase is clean**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "ENVENOM_DAMAGE"`
Expected: zero hits. `ENVENOM_QUARRY_DAMAGE` and `ENVENOM_PLAYER_DAMAGE` both contain the substring `ENVENOM_`, but neither matches `ENVENOM_DAMAGE` — a hit here is a genuine survivor.

Run: `npm run typecheck; npx vitest run --project node`
Expected: typecheck exits 0; Vitest reports 0 failed.

---

## Phase 3 — Poison retimed to the next trick

D1, D3, D4 and D5. The queue moves from being paid at the deal of the next hand to being paid at the resolution of the next trick, folded into that trick's own damage, and — for the player — forcing the same cash-out any other hit forces. The phase deliberately breaks type-checking in the middle: Task 3 adds required `TrickFacts` fields that only Task 4 supplies. It is coherent again at the phase boundary, so stop only at the end.

### Task 3: Give `resolveTrickBank` a second way to be hit ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/bank.ts` — `TrickFacts`, `TrickResolution`, `resolveTrickBank`, `incomingFrom`
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Write the failing tests for poison as a hit**

Add to `src/warCouncil/__tests__/bank.test.ts`. Match the file's existing fixture style for building `TrickFacts`; every new field is required, so a local helper defaulting the three poison fields to `0`/`0`/`false` keeps the file's other cases readable.

```ts
it('D3 — poison owed to the player cashes the streak out and resets it, even on a trick they won', () => {
  const before = { bank: 4, multiplier: 4 }
  const r = resolveTrickBank(before, {
    playerWon: true,
    skullTrick: false,
    finalTrick: false,
    envenomTrick: false,
    poisonToPlayer: 2,
    poisonToQuarry: 0,
    poisonGuarded: false,
  })
  // A1 — the win banks FIRST, so the cash-out is 5 x 5, not 4 x 4.
  expect(r.bankAdded).toBe(1)
  expect(r.cashOut).toBe(25)
  expect(r.bank).toBe(0)
  expect(r.multiplier).toBe(0)
  // D2 — 2 on a trick the player won: no DAMAGE_PER_HIT, only the poison.
  expect(r.damageToPlayer).toBe(2)
})

it('D2 — a trick the player loses while poisoned costs the trick’s damage AND the poison', () => {
  const r = resolveTrickBank(
    { bank: 3, multiplier: 3 },
    {
      playerWon: false,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 2,
      poisonToQuarry: 0,
      poisonGuarded: false,
    },
  )
  expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT + 2)
  expect(r.cashOut).toBe(9)
  expect(r.multiplier).toBe(0)
})

it('D1 — poison owed to the Quarry never touches the player’s streak', () => {
  const r = resolveTrickBank(
    { bank: 2, multiplier: 2 },
    {
      playerWon: true,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 0,
      poisonToQuarry: 4,
      poisonGuarded: false,
    },
  )
  expect(r.bank).toBe(3)
  expect(r.multiplier).toBe(3)
  expect(r.damageToPlayer).toBe(0)
  expect(r.poisonToQuarry).toBe(4)
})

it('D1 — incomingFrom sums the Quarry’s cash-out and its poison into one figure', () => {
  const r = resolveTrickBank(
    { bank: 2, multiplier: 2 },
    {
      playerWon: false,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 0,
      poisonToQuarry: 4,
      poisonGuarded: false,
    },
  )
  expect(incomingFrom(r)[DuelSide.Quarry]).toBe(r.cashOut + 4)
  expect(incomingFrom(r)[DuelSide.Player]).toBe(DAMAGE_PER_HIT)
})
```

- [x] **Step 2: Run them and watch them fail to compile**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: a transform/collection error naming the unknown properties `poisonToPlayer`, `poisonToQuarry`, `poisonGuarded`. That is a compile failure, not a test failure — the file's tests do not run.

- [x] **Step 3: Widen `TrickFacts` and `TrickResolution`**

In `src/warCouncil/bank.ts`, add to `TrickFacts`:

```ts
  /** D1/D3 — poison owed to the PLAYER from an earlier trick, being paid at this one. 0 when none.
   *  Non-zero makes this trick a hit for the cash-out's purposes even if the player won it. */
  readonly poisonToPlayer: Damage
  /** D1 — poison owed to the QUARRY from an earlier trick, being paid at this one. 0 when none.
   *  Never touches the bank: the Quarry has no streak to lose. */
  readonly poisonToQuarry: Damage
  /** DLR-91 AC4 — a Poison Guard is held, so poison must NOT force the cash-out. Gates the poison
   *  trigger only, never the trick's own hit: a 1-coin item does not insure against every loss. */
  readonly poisonGuarded: boolean
```

and to `TrickResolution`:

```ts
  /** D1 — carried through so `incomingFrom` sums it into the Quarry's total. Display-safe: this is
   *  the figure paid at THIS trick, not one booked by it — that is `envenomTarget`. */
  readonly poisonToQuarry: Damage
  /** AC4 — the Guard fired and suppressed a reset, so the reducer must spend it. `true` only when
   *  poison was actually owed to the player at this trick AND a Guard was held. */
  readonly poisonGuardSpent: boolean
```

Also widen the `TrickFacts` docblock's "the four facts" wording — it is seven now.

- [x] **Step 4: Add the second trigger and lift `damageToPlayer` out of the branch**

Replace `resolveTrickBank`'s body between the `replaced` const and the `finalTrick` block:

```ts
  if (isTaken(outcome)) {
    // PT-002 — the bank counts TRICKS, not card values. Both terms climb by exactly 1 per trick
    // taken, so a streak of n cashes n x n.
    bankAdded = 1
    bank += bankAdded
    multiplier += 1
  }

  // TWO sources of a hit since D1/D3. `trickHit` is the pre-existing one — a clean loss or a skull
  // win, unless DLR-90's AC5 replaced it. Poison is the new one, and it reaches the SAME branch
  // rather than getting a rule of its own: that is what makes "poison behaves like any other
  // damage" true in code instead of asserted in a comment.
  const trickHit = !isTaken(outcome) && !replaced
  // AC4 — a held Guard suppresses the POISON trigger only.
  const poisonResets = trick.poisonToPlayer > 0 && !trick.poisonGuarded

  // Owed whether or not the streak resets: a Guard buys back the streak, never the health.
  // D2's 2-or-3 is this line — the poison alone on a trick the player won, plus DAMAGE_PER_HIT
  // on one they also lost.
  damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.poisonToPlayer

  if (trickHit || poisonResets) {
    // A1 — the win above has already banked, so a won-but-poisoned trick cashes the LARGER figure.
    cashOut = bank * multiplier
    bank = 0
    multiplier = 0
  }
```

Add the two new fields to the returned object:

```ts
    poisonToQuarry: trick.poisonToQuarry,
    poisonGuardSpent: trick.poisonToPlayer > 0 && trick.poisonGuarded,
```

- [x] **Step 5: Sum the Quarry's two sources in `incomingFrom`**

```ts
/**
 * THE one `PlayerSide` -> `DuelSide` crossing. Keyed by the side the damage is APPLIED TO: the
 * player eats `damageToPlayer`, the Quarry eats its cash-out PLUS any poison paid at this trick.
 * Summing here rather than at the call site keeps that the only crossing — a caller assembling
 * this record by hand is one transposition from depleting the wrong bar forever.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut + resolution.poisonToQuarry,
  }
}
```

Import `Damage` from `'../hunt'` alongside the existing `DAMAGE_PER_HIT` / `DuelSide` / `IncomingDamage`.

- [x] **Step 6: Run the bank spec**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: 0 failed. `npm run typecheck` will still fail at `playCard.ts` — Task 4 supplies the new facts.

### Task 4: Let the caller supply the pending figures through `playCard` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/legalMoves.ts` — add `PlayCardOptions`
- Modify: `src/warCouncil/playCard.ts` — retype the options parameter, forward the three facts
- Modify: `src/warCouncil/index.ts` — export the `PlayCardOptions` type

- [x] **Step 1: Declare `PlayCardOptions` beside `LegalMoveOptions`**

In `src/warCouncil/legalMoves.ts`, after the existing `LegalMoveOptions`:

```ts
/**
 * What `playCard` needs beyond the legality question. EXTENDS `LegalMoveOptions` so the same object
 * still satisfies `legalMoves` with no second parameter to keep in step.
 *
 * The poison figures are handed IN rather than read: the pending queue lives on `EncounterState` in
 * `src/hunt/`, the bank rules live on `RoundState` here, and `src/hunt/` must never learn about
 * `RoundState` — `hunt/types.ts` documents that cycle. The reducer holds both and is the one place
 * they can meet.
 */
export interface PlayCardOptions extends LegalMoveOptions {
  readonly poisonToPlayer?: Damage
  readonly poisonToQuarry?: Damage
  readonly poisonGuarded?: boolean
}
```

Import `type Damage` from `'../hunt'`.

- [x] **Step 2: Forward the three facts into `TrickFacts`**

In `src/warCouncil/playCard.ts`, change the signature's fifth parameter to `options?: PlayCardOptions` and extend the `resolveTrickBank` call:

```ts
  // Every rule AC4-AC9 states lives in `resolveTrickBank`, DLR-90's AC5 with them, and DLR-91's
  // D1/D3 too; this function decides nothing about the outcome, it only reports the facts. The
  // three poison facts arrive from the caller for the reason `PlayCardOptions` documents.
  const lastResolution = resolveTrickBank(
    { bank: next.bank, multiplier: next.multiplier },
    {
      playerWon: winner === PlayerSide.Player,
      skullTrick: trickIsSkulled(next.skulledCards, completedTrick),
      finalTrick,
      envenomTrick: trickIsEnvenomed(next.envenomedCards, completedTrick),
      poisonToPlayer: options?.poisonToPlayer ?? 0,
      poisonToQuarry: options?.poisonToQuarry ?? 0,
      poisonGuarded: options?.poisonGuarded ?? false,
    },
  )
```

Import `type PlayCardOptions` from `'./legalMoves'`.

- [x] **Step 3: Export the type and typecheck**

Add `PlayCardOptions` to `src/warCouncil/index.ts`'s type exports beside `LegalMoveOptions`.

Run: `npm run typecheck`
Expected: exits 0. `commitQuarryMove` passes no options and needs no change — a lead never completes a trick, so no resolution is produced there.

### Task 5: Pay and re-book the queue at the trick that resolves ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts` — `applyResolution`, and the two `playCard` call sites
- Test: `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts` (this phase split its D1 payment tests into a new sibling, `roundReducer.poison.test.ts`, to keep both files under the 400-line budget)

- [x] **Step 1: Supply the pending figures at both call sites**

In `src/app/warCouncil/roundReducer.ts`, add a helper above `commit`:

```ts
/**
 * D1 — what a resolving trick owes from EARLIER tricks, read off the encounter's queue.
 *
 * One statement, read by both `playCard` call sites: the player's follow in `commit` and the
 * Quarry's in `advanceQuarryFollow`. Two readings of "what is pending" is exactly how a hit gets
 * paid twice or skipped.
 */
function poisonOptions(state: RoundUiState): PlayCardOptions {
  return {
    poisonToPlayer: state.encounter.pendingEnvenom[DuelSide.Player],
    poisonToQuarry: state.encounter.pendingEnvenom[DuelSide.Quarry],
    poisonGuarded: state.poisonGuardHeld,
  }
}
```

`state.poisonGuardHeld` does not exist until Phase 4 Task 11 — leave the reference in place; this phase's typecheck step is at the phase boundary and Task 11 lands before it. Import `DuelSide` from `'../../hunt'` and `type PlayCardOptions` from `'../../warCouncil'`.

In `commit`, merge it into the existing options argument:

```ts
  const armedCheat = cheatArmed(state) ? state.cheatSelection : null
  const result = playCard(state.round, PlayerSide.Player, cardToPlay, choice, {
    ...poisonOptions(state),
    ...(armedCheat ? { ignoreFollowSuit: true } : {}),
  })
```

`advanceQuarryFollow` needs the options too, so give it a second parameter and pass them from `commit`'s call and from `handleCarryOn`'s path:

```ts
function advanceQuarryFollow(round: WarCouncilState, options: PlayCardOptions): CpuAdvanceResult {
  const legal = legalMoves(round, QUARRY_SIDE)
  if (legal.length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }
  const move = chooseCpuMove(round, QUARRY_SIDE)
  const result = playCard(round, QUARRY_SIDE, move.card, move.choice, options)
  ...
```

In `commit`'s tail, change `advanceQuarryFollow(result.state)` to `advanceQuarryFollow(result.state, poisonOptions(settled))` — `settled`, not `state`, so the Quarry's follow reads the queue as the player's own commit left it.

- [x] **Step 2: Pay the queue, clear it, then book this trick's mark**

Replace `applyResolution`:

```ts
/**
 * One trick's whole effect on the encounter, in the one place it is stated: the trick's own damage,
 * D1's poison paid from an EARLIER trick, and this trick's own mark booked for the NEXT one.
 *
 * ORDER IS LOAD-BEARING, for the reason DLR-90 gave and one more. The damage lands FIRST, so
 * `queueEnvenom` then refuses a resolved encounter — a hit must never be carried into a fight that
 * is already over (D5's discard half at a fight boundary). And the queue is cleared BEFORE the new
 * booking, so a trick that both pays a poison and carries a mark does not have its own mark wiped
 * by the clear.
 *
 * The all-zero skip avoids bumping `damageEventsApplied` for nothing, but does not return early: a
 * REPLACED clean loss (DLR-90 AC5) is an all-zero event that still owes a booking.
 */
function applyResolution(encounter: EncounterState, resolution: TrickResolution): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  const cleared = hasPendingEnvenom(paid)
    ? { ...paid, pendingEnvenom: NO_PENDING_ENVENOM }
    : paid
  return resolution.envenomTarget === null
    ? cleared
    : queueEnvenom(cleared, resolution.envenomTarget)
}
```

Add `hasPendingEnvenom` and `NO_PENDING_ENVENOM` to this file's `'../../hunt'` import.

- [x] **Step 2a: Rewrite the reducer's envenom spec for next-trick timing**

`src/app/warCouncil/__tests__/roundReducer.envenom.test.ts` currently asserts that a mark leaves damage pending across a hand boundary. Retarget every such assertion to the next trick, and add:

```ts
it('D1 — a mark booked at one trick is paid at the very next trick, not at the next hand', () => {
  // Build a state whose encounter already owes the player poison, then resolve one trick.
  // Assert the player's health dropped by ENVENOM_PLAYER_DAMAGE and pendingEnvenom is back to zero.
})

it('D1 — the queue is cleared by the trick that pays it, so it is never paid twice', () => {
  // Resolve two tricks against one booking; only the first costs health.
})
```

Fill both bodies against this file's existing fixture helpers — the comments name the assertions, not the plumbing.

- [x] **Step 3: Run the reducer spec**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.envenom.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts`
Expected: 0 failed. Typecheck still fails on `state.poisonGuardHeld` until Task 11.

### Task 6: Delete the hand-start payment ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts` — delete `beginNextHand`
- Modify: `src/hunt/encounter.ts` — delete `applyPendingEnvenom`
- Modify: `src/hunt/index.ts` — drop both from the export lists
- Modify: `src/App.tsx:125-145` — drop the call and the resolution re-check
- Test: `src/hunt/__tests__/envenom.test.ts`

- [x] **Step 1: Delete both functions**

Delete `beginNextHand` from `src/hunt/run.ts` and `applyPendingEnvenom` from `src/hunt/encounter.ts`, and remove both names from `src/hunt/index.ts`. **Keep `hasPendingEnvenom` exported** — D6 (Apply Damage disabled while poison is pending) needs exactly that predicate when its ticket is built, and deleting it now means re-deriving the same rule later. Add to its docblock:

```ts
/** Whether anything is owed. ONE statement, so a queue check and a payment cannot disagree.
 *  Also the predicate D6 (2026-08-19) reserves: Apply Damage must be disabled while poison is
 *  pending. That control does not exist yet — version-4-scope.md §3 — so this has no caller for
 *  that purpose today and is kept deliberately rather than re-derived then. */
```

- [x] **Step 2: Simplify `handleComplete` in the driver**

In `src/App.tsx`, replace the body of `handleComplete` after `recorded` is computed. The `beginNextHand` call and the second resolution re-check both go: poison is now paid inside the hand, so a hand that ends unresolved cannot become resolved between hands.

```ts
  function handleComplete(result: WarCouncilRoundResult) {
    const recorded = recordEncounter(run, result.encounter, result.cheats, result.envenomCharges)
    setRun(recorded)
    if (isEncounterResolved(recorded.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      // The verdict is next, not another hand. D5 — any queued poison is discarded, because
      // `advanceRun` and `startRun` both re-seed the encounter through `startEncounter`.
      return
    }
    // D1 — nothing is owed at a hand boundary any more. Poison is paid by `applyResolution` at the
    // trick that resolves it, so an unresolved hand simply deals the next one. Any poison booked by
    // this hand's last trick rides on `encounter.pendingEnvenom` into the next hand's first trick,
    // which is D5's carry half.
    dealNextHand()
  }
```

Remove `beginNextHand` from the `'./hunt'` import block.

- [x] **Step 3: Retarget the hunt-side envenom spec**

In `src/hunt/__tests__/envenom.test.ts`, delete every test of `beginNextHand` and `applyPendingEnvenom` and their imports. Keep the `queueEnvenom` / `hasPendingEnvenom` / `NO_PENDING_ENVENOM` tests and the two added in Phase 2. Add:

```ts
it('D5 — a queued hit does not survive the fight it was booked in', () => {
  const owed = queueEnvenom(startEncounter(0, 10), DuelSide.Player)
  expect(hasPendingEnvenom(owed)).toBe(true)
  // A fresh encounter re-seeds the queue to zeros, which is the discard with no explicit step.
  expect(hasPendingEnvenom(startEncounter(1, owed.health[DuelSide.Player]))).toBe(false)
})
```

- [x] **Step 4: Prove both names are gone**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "beginNextHand|applyPendingEnvenom"`
Expected: zero hits.

- [x] **Step 5: Verify the phase's engine half**

Run: `npx vitest run src/hunt/__tests__/envenom.test.ts src/warCouncil/__tests__/bank.test.ts`
Expected: 0 failed. Full typecheck comes at the end of Phase 4, once `poisonGuardHeld` exists.

---

## Phase 4 — Poison Guard's engine and plumbing

DLR-91's own criteria. Three shape changes here break every reader the moment they land — `ShopItem` widening (four total maps plus two hand-built records), `ShopStock`'s required field, and `recordEncounter`'s fifth parameter — so each travels with all of its readers in one task, per the config-change rule. The phase closes with the first full `typecheck` since Phase 2, because Task 5 deliberately left a dangling reference for Task 11 to satisfy.

### Task 7: Add the price key ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts` — add `POISON_GUARD_PRICE`
- Modify: `src/hunt/index.ts` — export it
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Declare it beside the other prices**

```ts
// DLR-91 AC1 — TRANSCRIBED from version-4-scope.md §1's own heading ("Fight-long — new item:
// Poison Guard, 1 coin"), which prices it level with HEAL_PRICE because both are a 1-coin-for-4-HP
// trade run in opposite directions. NOT chosen here and NOT an open tuning value. Its own key for
// the reason CHEAT_PRICE and HEAL_PRICE are already separate: re-pricing one item must not move
// another.
// UNIT: coins per purchase.
export const POISON_GUARD_PRICE: Coins = 1
```

- [x] **Step 2: Assert it in the config spec**

Add to `src/hunt/__tests__/config.test.ts`, matching the file's existing shape for the other price keys:

```ts
it('prices the Poison Guard at a positive whole number of coins', () => {
  expect(Number.isInteger(POISON_GUARD_PRICE)).toBe(true)
  expect(POISON_GUARD_PRICE).toBeGreaterThan(0)
})
```

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: 0 failed.

### Task 8: Widen the catalogue and the refusal vocabulary ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/shop.ts` — `ShopItem`, `SHOP_ITEMS`, `priceOf`, `categoryOf`, `PurchaseRefusal`, `ShopStock`, `refusalFor`
- Modify: `src/hunt/index.ts` — nothing new to name; the widened unions ride the existing exports
- Modify: `src/app/run/shopLabels.ts` — `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`, `PURCHASE_REFUSAL_MESSAGE`
- Modify: `src/App.tsx:233-237` — the fourth `refusals` entry
- Test: `src/hunt/__tests__/shop.test.ts`, `src/app/run/__tests__/ShopPanel.test.tsx` (the `noRefusals` fixture)

- [x] **Step 1: Widen both unions and the stock**

In `src/hunt/shop.ts`:

```ts
export const ShopItem = {
  Cheat: 'cheat',
  Envenom: 'envenom',
  PoisonGuard: 'poisonGuard',
  Heal: 'heal',
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** DLR-91 — four now. THE statement of the catalogue: a screen maps this, it never lists the items
 *  itself. The Heal stays LAST because `UNCATEGORISED_SHOP_ITEMS` derives from this order. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  ShopItem.Cheat,
  ShopItem.Envenom,
  ShopItem.PoisonGuard,
  ShopItem.Heal,
]
```

```ts
export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  GuardAlreadyActive: 'guardAlreadyActive',
  NotEnoughCoins: 'notEnoughCoins',
} as const
export type PurchaseRefusal = (typeof PurchaseRefusal)[keyof typeof PurchaseRefusal]
```

Add to `ShopStock`:

```ts
  /** DLR-91 AC3 — a bought-but-unspent Guard is already held. Only one can be active at a time. */
  readonly poisonGuardHeld: boolean
```

- [x] **Step 2: Fill the two total switches and add the refusal branch**

`priceOf` gains `case ShopItem.PoisonGuard: return POISON_GUARD_PRICE` (import it). `categoryOf` gains:

```ts
    // DLR-91 AC1 — the fight-long rung, which DLR-89 built and left empty for exactly this.
    case ShopItem.PoisonGuard:
      return ShopCategory.FightLong
```

`refusalFor` gains one branch, placed after the Heal branch and **before** the coin check, per that function's own stated ordering rule — with a Guard held and no coins, the held Guard is the reason that will still be true when a coin arrives:

```ts
  if (item === ShopItem.PoisonGuard && stock.poisonGuardHeld) {
    return PurchaseRefusal.GuardAlreadyActive
  }
```

- [x] **Step 3: Fill every total map the compiler now flags**

In `src/app/run/shopLabels.ts`:

```ts
  [ShopItem.PoisonGuard]: 'Poison Guard', // PLACEHOLDER copy — the developer's call.
```

```ts
  [ShopItem.PoisonGuard]: `Insurance for one fight. The next time your own poison lands on you, you still take the ${ENVENOM_PLAYER_DAMAGE} but your streak survives.`,
```

```ts
  [PurchaseRefusal.GuardAlreadyActive]: 'You are already holding a Poison Guard.',
```

- [x] **Step 4: Fill the two hand-built records the compiler cannot flag**

`Record<ShopItem, …>` construction sites are total, so these two are compile errors — but they are *literals*, so find them by name rather than trusting a grep for the new member. In `src/App.tsx`:

```ts
          [ShopItem.PoisonGuard]: refusalFor(stock, ShopItem.PoisonGuard),
```

In `src/app/run/__tests__/ShopPanel.test.tsx`'s `noRefusals` fixture:

```ts
  [ShopItem.PoisonGuard]: null,
```

- [x] **Step 5: Update the two catalogue assertions that now read false, and cover the refusal**

In `src/hunt/__tests__/shop.test.ts`, line 29's `SHOP_ITEMS` equality becomes `[ShopItem.Cheat, ShopItem.Envenom, ShopItem.PoisonGuard, ShopItem.Heal]`, and line 175's `SHOP_ITEMS_BY_CATEGORY[ShopCategory.FightLong]` becomes `[ShopItem.PoisonGuard]`. Every `ShopStock` literal in the file gains `poisonGuardHeld: false`. Then add:

```ts
it('AC3 — refuses a Guard while one is held, and says which reason', () => {
  const held = { ...baseStock, coins: 9, poisonGuardHeld: true }
  expect(refusalFor(held, ShopItem.PoisonGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
})

it('AC3 — the held Guard outranks the coin check, so the reason survives the coin arriving', () => {
  const broke = { ...baseStock, coins: 0, poisonGuardHeld: true }
  expect(refusalFor(broke, ShopItem.PoisonGuard)).toBe(PurchaseRefusal.GuardAlreadyActive)
})

it('AC1 — sells a Guard when none is held and the coins are there', () => {
  const ready = { ...baseStock, coins: POISON_GUARD_PRICE, poisonGuardHeld: false }
  expect(refusalFor(ready, ShopItem.PoisonGuard)).toBeNull()
})
```

Name `baseStock` after whatever the file's existing fixture is called.

- [x] **Step 6: Run the shop spec**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts`
Expected: 0 failed.

### Task 9: Hold the Guard on the run for exactly one fight ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts` — `RunState.poisonGuardHeld`, `startRun`, `buyFromShop`, `shopStockFor`, `recordEncounter`'s fifth parameter, `guardAfter`
- Modify: `src/App.tsx` — `recordEncounter`'s fifth argument (the signature change breaks the only call site)
- Test: `src/hunt/__tests__/poisonGuard.test.ts` (create), `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Write the failing lifetime spec**

Create `src/hunt/__tests__/poisonGuard.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  advanceRun,
  applyDamage,
  buyFromShop,
  DuelSide,
  POISON_GUARD_PRICE,
  PurchaseRefusal,
  recordEncounter,
  refusalFor,
  ShopItem,
  shopStockFor,
  startRun,
} from '..'

/** A run holding enough coins to buy a Guard, sitting on a won encounter — which is the only
 *  state the shop is reachable from. */
function wonRunWithCoins(coins: number) {
  const run = startRun(10)
  const killed = applyDamage(run.encounter, {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: run.encounter.health[DuelSide.Quarry],
  })
  return { ...recordEncounter(run, killed, run.cheats, run.envenomCharges, false), coins }
}

describe('Poison Guard purchase (AC1/AC3)', () => {
  it('AC1 — buying one spends the price and holds the Guard', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(bought.poisonGuardHeld).toBe(true)
    expect(bought.coins).toBe(3 - POISON_GUARD_PRICE)
  })

  it('AC3 — a second purchase is refused rather than stacking or overwriting', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(refusalFor(shopStockFor(bought), ShopItem.PoisonGuard)).toBe(
      PurchaseRefusal.GuardAlreadyActive,
    )
    expect(() => buyFromShop(bought, ShopItem.PoisonGuard)).toThrow(RangeError)
    expect(bought.coins).toBe(3 - POISON_GUARD_PRICE)
  })

  it('a fresh run holds no Guard', () => {
    expect(startRun(10).poisonGuardHeld).toBe(false)
  })
})

describe('Poison Guard lifetime (AC2)', () => {
  it('AC2 — survives the advanceRun that opens the fight it was bought for', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(advanceRun(bought).poisonGuardHeld).toBe(true)
  })

  it('AC2 — is gone once that fight resolves, spent or not', () => {
    const fighting = advanceRun(buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard))
    const killed = applyDamage(fighting.encounter, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: fighting.encounter.health[DuelSide.Quarry],
    })
    const after = recordEncounter(fighting, killed, fighting.cheats, fighting.envenomCharges, true)
    expect(after.poisonGuardHeld).toBe(false)
  })

  it('AC2 — survives a hand that does NOT resolve the fight', () => {
    const fighting = advanceRun(buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard))
    const scratched = applyDamage(fighting.encounter, {
      [DuelSide.Player]: 1,
      [DuelSide.Quarry]: 1,
    })
    const after = recordEncounter(fighting, scratched, fighting.cheats, fighting.envenomCharges, true)
    expect(after.poisonGuardHeld).toBe(true)
  })
})
```

- [x] **Step 2: Run it and watch it fail to compile**

Run: `npx vitest run src/hunt/__tests__/poisonGuard.test.ts`
Expected: a transform error — `POISON_GUARD_PRICE` and `ShopItem.PoisonGuard` resolve after Tasks 7 and 8, but `poisonGuardHeld` and `recordEncounter`'s fifth argument do not exist yet.

- [x] **Step 3: Add the field, the helper, and the four transitions**

In `src/hunt/run.ts`, add to `RunState`:

```ts
  /** DLR-91 AC2 — a bought-but-unspent Poison Guard. Run-level like `coins` rather than on
   *  `EncounterState`, and that placement is load-bearing: the shop is reachable only AFTER an
   *  encounter resolves and BEFORE `advanceRun` runs, and `advanceRun` re-seeds the encounter
   *  through `startEncounter` — so a flag on the encounter would be bought onto the finished fight
   *  and destroyed by the very transition that opens the fight it was bought for. Carried by
   *  `advanceRun`'s spread and cleared by `guardAfter` when that fight resolves, which is what
   *  makes "fight-long" a real duration. NEVER persisted, exactly as `coins`. */
  readonly poisonGuardHeld: boolean
```

`startRun` adds `poisonGuardHeld: false`. `shopStockFor` adds `poisonGuardHeld: run.poisonGuardHeld`. `buyFromShop`'s `switch` gains:

```ts
    case ShopItem.PoisonGuard:
      return { ...paid, poisonGuardHeld: true }
```

`recordEncounter` gains a fifth required parameter and routes the flag through the helper:

```ts
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
  poisonGuardHeld: boolean,
): RunState {
```

with `poisonGuardHeld: guardAfter(encounter, poisonGuardHeld),` in the returned object, and this private helper beside `outcomeFor`:

```ts
/**
 * AC2 — ONE statement of "a Guard does not outlive the fight it was bought for".
 *
 * A named function rather than an inline ternary deliberately: `recordEncounter` is the only
 * transition that adopts a hand's end state today, but a second one is exactly the kind of thing
 * that gets added without remembering to clear this, and a named rule is what a reviewer finds.
 */
function guardAfter(encounter: EncounterState, held: boolean): boolean {
  return isEncounterResolved(encounter) ? false : held
}
```

Extend `recordEncounter`'s docblock: the fifth parameter is REQUIRED for the reason `cheats` and `envenomCharges` already are — the hand owns it for its lifetime and hands the survivor back through `WarCouncilRoundResult`.

- [x] **Step 4: Fix the driver's call site and every existing `recordEncounter` caller in specs**

In `src/App.tsx`, pass the fifth argument:

```ts
    const recorded = recordEncounter(
      run,
      result.encounter,
      result.cheats,
      result.envenomCharges,
      result.poisonGuardHeld,
    )
```

`result.poisonGuardHeld` lands in Task 11; the reference is written now so Task 11 has nothing left to remember. Add the fifth argument to every `recordEncounter` call in `src/hunt/__tests__/run.test.ts` — `false` wherever the test says nothing about the Guard.

- [x] **Step 5: Run the two hunt specs**

Run: `npx vitest run src/hunt/__tests__/poisonGuard.test.ts src/hunt/__tests__/run.test.ts`
Expected: 0 failed.

### Task 10: Gate the poison cash-out on the Guard ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/bank.ts` — no new fields (Task 3 added them); confirm `poisonGuardSpent` and the `poisonResets` gate behave
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Write the Guard's bank-level tests**

Task 3 already added `poisonGuarded` and `poisonGuardSpent`; this task proves they do what AC4 and A4 require. Add to `src/warCouncil/__tests__/bank.test.ts`:

```ts
it('AC4 — a held Guard leaves the streak standing but does not refund the health', () => {
  const r = resolveTrickBank(
    { bank: 4, multiplier: 4 },
    {
      playerWon: true,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 2,
      poisonToQuarry: 0,
      poisonGuarded: true,
    },
  )
  expect(r.bank).toBe(5)
  expect(r.multiplier).toBe(5)
  expect(r.cashOut).toBe(0)
  expect(r.damageToPlayer).toBe(2)
  expect(r.poisonGuardSpent).toBe(true)
})

it('A4 — a Guard does NOT save the streak from the trick’s own hit, and is not spent by it', () => {
  const r = resolveTrickBank(
    { bank: 4, multiplier: 4 },
    {
      playerWon: false,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 0,
      poisonToQuarry: 0,
      poisonGuarded: true,
    },
  )
  expect(r.cashOut).toBe(16)
  expect(r.multiplier).toBe(0)
  expect(r.poisonGuardSpent).toBe(false)
})

it('A5 — a Guard is not spent on a trick that owed the player no poison', () => {
  const r = resolveTrickBank(
    { bank: 1, multiplier: 1 },
    {
      playerWon: true,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 0,
      poisonToQuarry: 4,
      poisonGuarded: true,
    },
  )
  expect(r.poisonGuardSpent).toBe(false)
})

it('AC5 — a Guard does nothing to poison owed to the Quarry', () => {
  const guarded = {
    playerWon: true,
    skullTrick: false,
    finalTrick: false,
    envenomTrick: false,
    poisonToPlayer: 0,
    poisonToQuarry: 4,
    poisonGuarded: true,
  } as const
  const bare = { ...guarded, poisonGuarded: false }
  expect(incomingFrom(resolveTrickBank({ bank: 0, multiplier: 0 }, guarded))).toEqual(
    incomingFrom(resolveTrickBank({ bank: 0, multiplier: 0 }, bare)),
  )
})

it('AC4 — a Guard fires and is spent even with no streak in progress', () => {
  const r = resolveTrickBank(
    { bank: 0, multiplier: 0 },
    {
      playerWon: true,
      skullTrick: false,
      finalTrick: false,
      envenomTrick: false,
      poisonToPlayer: 2,
      poisonToQuarry: 0,
      poisonGuarded: true,
    },
  )
  expect(r.poisonGuardSpent).toBe(true)
})
```

- [x] **Step 2: Run them**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: 0 failed. If any fail, the fix belongs in Task 3's `poisonResets` gate or the `poisonGuardSpent` expression — not in a new branch here.

### Task 11: Thread the Guard through the hand ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncilMount.ts` — `WarCouncilMountProps.poisonGuardHeld`, `WarCouncilRoundResult.poisonGuardHeld`
- Modify: `src/app/warCouncil/roundUiState.ts` — `RoundUiSeed`, `RoundUiState`, `createRoundUiState`
- Modify: `src/app/warCouncil/roundReducer.ts` — spend the Guard in `commit`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx` — prop into the seed, flag into both `onComplete` results
- Modify: `src/App.tsx` — pass `poisonGuardHeld={run.poisonGuardHeld}` to `WarCouncilRound`
- Test: `src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`

- [x] **Step 1: Declare it at the mount boundary**

In `src/app/warCouncilMount.ts`, add to `WarCouncilMountProps`:

```ts
  /** DLR-91 AC4 — whether a Poison Guard is held at the START of this hand. The same contract
   *  `envenomCharges` above documents: an opening figure the reducer owns for the hand's life and
   *  hands back through `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler
   *  enumerates every mount site instead of letting one silently fight without its insurance. */
  readonly poisonGuardHeld: boolean
```

and to `WarCouncilRoundResult`:

```ts
  /** DLR-91 AC4 — whether the Guard is still held after this hand. `false` once it has fired; the
   *  run adopts it through `recordEncounter`'s fifth parameter, which also clears it when the
   *  encounter resolved. */
  readonly poisonGuardHeld: boolean
```

- [x] **Step 2: Carry it on the reducer's state**

In `src/app/warCouncil/roundUiState.ts`, add `readonly poisonGuardHeld: boolean` to both `RoundUiSeed` and `RoundUiState` — on `RoundUiState` with:

```ts
  /** AC4 — mirrored from the mount's opening prop and flipped to `false` the moment a resolved
   *  trick reports `poisonGuardSpent`. Run state carried for the life of the hand, the same
   *  contract `cheats` and `envenomCharges` document. */
```

and `poisonGuardHeld: seed.poisonGuardHeld,` in `createRoundUiState`.

- [x] **Step 3: Spend it when a resolved trick says so**

In `src/app/warCouncil/roundReducer.ts`'s `commit`, the `settled` object gains:

```ts
    // AC4 — consumed exactly when it suppressed a reset, which `resolveTrickBank` decided. The
    // reducer does not re-derive "did the Guard matter" — that would be a second reading of one
    // rule, and the two would drift.
    poisonGuardHeld: resolvedTrick?.resolution.poisonGuardSpent
      ? false
      : state.poisonGuardHeld,
```

and the Quarry-follow tail, which can resolve its own trick, needs the same treatment against `advanced.resolvedTrick`:

```ts
    poisonGuardHeld: advanced.resolvedTrick?.resolution.poisonGuardSpent
      ? false
      : settled.poisonGuardHeld,
```

This also satisfies the `state.poisonGuardHeld` reference Task 5 left dangling in `poisonOptions`.

- [x] **Step 4: Wire the component and the driver**

In `src/app/warCouncil/WarCouncilRound.tsx`, destructure `poisonGuardHeld` from props, pass it in the `useReducer` seed object beside `envenomCharges`, and add `poisonGuardHeld: ui.poisonGuardHeld` to **both** `onComplete` result objects (the file has two, around lines 190 and 203 — miss one and a Guard silently survives a hand).

In `src/App.tsx`, add `poisonGuardHeld={run.poisonGuardHeld}` to the `<WarCouncilRound>` element.

- [x] **Step 5: Cover the consumption through the reducer**

Added to `src/app/warCouncil/__tests__/roundReducer.poison.test.ts` instead of `roundReducer.envenom.test.ts` — Phase 3's split already moved the queue/payment behaviour there (see "State of the tree" note), and the Guard's consumption through poison payment is exactly that subject:

```ts
it('AC4 — a held Guard survives the poison hit and is spent, leaving the streak standing', () => {
  // Seed a state with poisonGuardHeld: true and pendingEnvenom owed to the player, resolve a
  // trick, then assert: health dropped by ENVENOM_PLAYER_DAMAGE, round.multiplier did NOT reset,
  // and poisonGuardHeld is now false.
})

it('AC4 — the Guard fires only once; a second poison hit in the same fight lands in full', () => {
  // Resolve two poisoned tricks against one Guard; the second resets the streak.
})
```

Fill both bodies against this file's existing fixture helpers.

- [x] **Step 6: First full typecheck since Phase 2**

Run: `npm run typecheck; npx vitest run --project node`
Expected: typecheck exits 0; Vitest reports 0 failed. The `.tsx` specs run in the `dom` project and are covered in Phase 5.

---

## Phase 5 — The shop screen and the design record

Everything left is a rendered readout, its copy, and the two design documents whose rulings this contract changed. Nothing here decides a rule. The phase boundary is the last one before verification.

### Task 12: Show a held Guard on the shop screen ✓

- Skill: `react-frontend`, and `game-ux` for the cell's placement and its colour-free state

**Files:**
- Modify: `src/app/run/shopLabels.ts` — the purse-cell copy
- Modify: `src/app/run/ShopPanel.tsx` — `poisonGuardHeld` prop, fourth purse cell
- Modify: `src/App.tsx` — pass `poisonGuardHeld={run.poisonGuardHeld}` to `ShopPanel`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`, `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Add the copy**

In `src/app/run/shopLabels.ts`, beside `SHOP_ENVENOM_LABEL`:

```ts
/** DLR-91 AC3 — the purse cell for a held Guard, so the refusal on a second purchase has a visible
 *  cause. PLACEHOLDER copy. Words rather than a colour or a glyph alone, per `game-ux`'s "state
 *  reads without motion or colour alone" — a static screenshot still says which it is. */
export const SHOP_GUARD_LABEL = 'Poison Guard'
export const SHOP_GUARD_HELD = 'Held'
export const SHOP_GUARD_NONE = 'None'
```

- [x] **Step 2: Render the fourth cell**

In `src/app/run/ShopPanel.tsx`, add to `ShopPanelProps`:

```ts
  /** DLR-91 AC3 — whether a Guard is already held. A boolean, not a count like `envenomCharges`:
   *  only one can be active at a time, which is what the refusal enforces. */
  readonly poisonGuardHeld: boolean
```

Destructure it and add a fourth cell after the Envenom one, reusing the existing classes so no CSS changes:

```tsx
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_GUARD_LABEL}</span>
            <span className="shop-purse-value">
              {poisonGuardHeld ? SHOP_GUARD_HELD : SHOP_GUARD_NONE}
            </span>
          </span>
```

Add the three names to the `./shopLabels` import. In `src/App.tsx`, add `poisonGuardHeld={run.poisonGuardHeld}` to `<ShopPanel>`.

- [x] **Step 3: Cover the cell and the new item's card**

In `src/app/run/__tests__/ShopPanel.test.tsx`, add `poisonGuardHeld: false` to `baseProps`, then add:

```tsx
it('DLR-91 — states whether a Guard is held, in words', () => {
  const { rerender } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
  expect(screen.getByText(SHOP_GUARD_NONE)).toBeTruthy()
  rerender(<ShopPanel {...baseProps} poisonGuardHeld refusals={noRefusals} />)
  expect(screen.getByText(SHOP_GUARD_HELD)).toBeTruthy()
})

it('DLR-91 AC1 — the Guard is on the Fight-long shelf, not the default one', () => {
  render(<ShopPanel {...baseProps} refusals={noRefusals} />)
  const name = shopItemAccessibleName(ShopItem.PoisonGuard, null)
  expect(screen.queryByRole('button', { name })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }))
  expect(screen.getByRole('button', { name })).toBeTruthy()
})

it('DLR-91 AC3 — a refused Guard is disabled with its reason in the document', () => {
  const refusals = { ...noRefusals, [ShopItem.PoisonGuard]: PurchaseRefusal.GuardAlreadyActive }
  render(<ShopPanel {...baseProps} poisonGuardHeld refusals={refusals} />)
  fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }))
  const button = screen.getByRole('button', {
    name: shopItemAccessibleName(ShopItem.PoisonGuard, PurchaseRefusal.GuardAlreadyActive),
  })
  expect(button).toHaveProperty('disabled', true)
  expect(
    screen.getByText(PURCHASE_REFUSAL_MESSAGE[PurchaseRefusal.GuardAlreadyActive]),
  ).toBeTruthy()
})
```

In `src/app/run/__tests__/shopLabels.test.ts`, add the three new constants to the non-empty-copy loop that already covers `SHOP_TABLIST_LABEL` and its neighbours.

- [x] **Step 4: Run both specs**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/shopLabels.test.ts`
Expected: 0 failed. If the `dom` project times out on a cold cache, warm it with `npx vitest run --project dom` first — that is a worker-start timeout, not a failure.

- [x] **Step 5 (added by the orchestrator): Fix the stale D7 fixture**

Fixed `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`'s failing "reports onComplete with the whole hand's damage once the encounter resolves mid-hand" test. Restructured the fixture into two tricks so the player's damage and the Quarry's death are separate events — see the Implementer Report for the exact restructuring.

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`
Expected: 0 failed.

### Task 13: Record the two overturned design rulings ✓

- Skill: `game-designer` — `.docs/design/**` is its territory per `CLAUDE.md`'s ownership table

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md` — §1's Envenom and Poison Guard subsections, and a note against §3
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — §9's simultaneous-depletion row

- [x] **Step 1: Rewrite §1's Envenom and Poison Guard paragraphs**

In `version-4-scope.md` §1, the Envenom subsection currently says the winner "takes 4 damage at the start of the following hand". Replace the timing and the figures with D1–D4, dated, and state what the old text said so the change is attributable rather than silent:

- Damage is paid at the resolution of the **next trick**, not the start of the following hand. Originally the latter; changed 2026-08-19 because a hit paid at a hand boundary arrives after `resolveTrickBank` has already cashed and zeroed the streak, so it could not interact with the bank at all.
- **4 to the Quarry, 2 to the player.** The player's figure is halved because their hit also forces the streak's cash-out, which the Quarry has no equivalent of.
- Poison damage to the player **behaves as any other damage does**: the bank cashes out into the Quarry and both counters reset. Not destroyed.
- Pending poison **accumulates**; a poisoned final trick **carries** into the next hand, and is **discarded** if the fight or run ends first.

Then rewrite the Poison Guard subsection: it no longer says "Active for one hand" (which contradicted its own "Fight-long" heading) but **active for the fight it was bought for**, and its effect is that the player still takes the 2 health while the streak survives uncashed. Record D8's accepted consequence in a sentence: because the Guard suppresses the cash-out, a Quarry that would have died to that cash-out survives, so a held Guard can cost the player health under the new Quarry-first sequencing — accepted deliberately.

Add a line to §3 (Apply Damage): **D6 — the control must be disabled while poison is pending**, decided 2026-08-19, ahead of that ticket being built.

- [x] **Step 2: Mark §9's simultaneous-depletion ruling overturned**

In `hybrid-design.md` §9, find the row/entry recording the 2026-08-11 decision that the player loses a simultaneous depletion. Do not delete it — mark it **Overturned 2026-08-19** and record the replacement: damage applies Quarry-first, a Quarry killed by an event spares the player that event's damage, so a mutual kill is a player win and the tie is unreachable. Note that `SIMULTANEOUS_DEPLETION_WINNER` was deleted rather than retargeted, since a constant with no reader is a tunable that silently does nothing.

- [x] **Step 3: Confirm no design doc still states the retired timing**

Run: `Select-String -Path .docs\design\Balatro-Forbidden-Solitaire\version-4-scope.md -Pattern "start of the following hand|Active for one hand"`
Expected: zero hits.

---

## Phase 6 — Final verification

No production changes. Only sanity checks that the cumulative work is clean.

### Task 14: Confirm the purity boundary still holds ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep both pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. Both trees are lint-enforced pure per `web-project.md` → Architectural boundaries, and this contract added rules to both.

Result: zero hits.

- [x] **Step 2: Confirm `src/hunt/` gained no import from `src/warCouncil/`**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "warCouncil"`
Expected: zero hits outside comments. The cycle `hunt/types.ts` warns about is exactly what the `PlayCardOptions` design avoids.

Result: 6 hits, all inside docblock comments in `run.ts` and `types.ts` explaining the import direction — no live import.

### Task 15: Confirm no tunable was hard-coded and no retired name survives ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep for the literals configuration now owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.test.tsx | Select-String -Pattern "SIMULTANEOUS_DEPLETION_WINNER|ENVENOM_DAMAGE|beginNextHand|applyPendingEnvenom"`
Expected: zero hits. All four were deleted or renamed by this contract.

Result: 2 hits, both known/intended exceptions — `src/hunt/encounter.ts`'s `resolveWinner` docblock citing `SIMULTANEOUS_DEPLETION_WINNER`, and `src/hunt/config.ts`'s rename rationale citing `ENVENOM_DAMAGE`. No genuine survivor.

- [x] **Step 2: Confirm the shop copy quotes no figure it should interpolate**

Run: `Select-String -Path src\app\run\shopLabels.ts -Pattern "\b(1|2|4) (coin|damage|health)\b"`
Expected: zero hits — every figure in that file comes from `priceOf`, `ENVENOM_QUARRY_DAMAGE`, `ENVENOM_PLAYER_DAMAGE` or `HEAL_HEALTH_RESTORED`.

Result: zero hits.

- [x] **Step 3: Measure every file this contract grew**

Run: `foreach ($f in "src\hunt\config.ts","src\hunt\run.ts","src\hunt\shop.ts","src\hunt\encounter.ts","src\warCouncil\bank.ts","src\warCouncil\playCard.ts","src\app\warCouncil\roundReducer.ts","src\app\run\ShopPanel.tsx","src\app\run\shopLabels.ts","src\App.tsx") { "$((Get-Content $f).Count) $f" }`
Expected: every count under 400. `(Get-Content).Count`, never `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.

Result: config.ts 370, run.ts 278, shop.ts 173, encounter.ts 189, bank.ts 198, playCard.ts 135, roundReducer.ts 386, ShopPanel.tsx 224, shopLabels.ts 116, App.tsx 282 — all under 400. Test files this contract created or grew, same method: `run.test.ts` 397 (**warning, 380+, still under 400**); poisonGuard.test.ts 79, config.test.ts 238, encounter.test.ts 188, envenom.test.ts 181, shop.test.ts 251, bank.test.ts 299, roundReducer.envenom.test.ts 244, roundReducer.poison.test.ts 310, shopLabels.test.ts 113, ShopPanel.test.tsx 266, WarCouncilRound.duelHealthBars.test.tsx 329 — all comfortably under.

### Task 16: Static gates and the full suite ✓

- Skill: `react-frontend`

- [x] **Step 1: Warm the transform cache, then run both projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project is infrastructure, not a failure — re-run once before treating it as real.

Result: node — `Test Files 39 passed (39)`, `Tests 647 passed (647)`. dom — `Test Files 21 passed (21)`, `Tests 177 passed (177)`. No cold-cache timeout.

- [x] **Step 2: Typecheck and lint (scoped to the Implementer)**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

Result: both exit 0, no output. **`npm test` (unfiltered) is delegated to QA — not run here**, per this project's pipeline (Implementer runs scoped Vitest only).

- [x] **Step 2 (delegated): the unfiltered suite `npm test`**

Delegated to QA, and QA ran it: `Test Files 60 passed (60)`, `Tests 824 passed (824)`, exit 0.

- [x] **Step 3: Formatting of this contract's files only**

Run: `npx prettier --check src\hunt\config.ts src\hunt\encounter.ts src\hunt\run.ts src\hunt\shop.ts src\hunt\index.ts src\hunt\types.ts src\warCouncil\bank.ts src\warCouncil\playCard.ts src\warCouncil\legalMoves.ts src\warCouncil\index.ts src\app\warCouncil\roundReducer.ts src\app\warCouncil\roundUiState.ts src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncilMount.ts src\app\run\shopLabels.ts src\app\run\ShopPanel.tsx src\App.tsx`

Result: `src/app/warCouncil/roundReducer.ts` failed; fixed with `prettier --write` (formatting only, no logic change) and re-confirmed clean. Test-file pass (`src\hunt\__tests__\run.test.ts` and the other contract-touched specs): `run.test.ts` failed; fixed the same way and re-confirmed clean. Re-ran `npm run typecheck` (exit 0) and the affected scoped Vitest projects after both writes — all passing (`Test Files 60 passed (60)`, `Tests 824 passed (824)` for the combined re-run).
Expected: exits 0. The repo-wide `format:check` fails on pre-existing `.docs/**` files no contract has touched — do not fix that here.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result (QA): exit 0. `dist/index.html`, `dist/assets/index-BVGjGz7d.css` (31.83 kB), `dist/assets/index-BuPZg2th.js` (245.67 kB). No bundler errors.

### Task 17: Functional check in a real browser ✓ — Envenom mid-hand retiming not driven live (coin budget); covered by four reviewed tests

- Skill: `game-ux`

**Delegated to QA in full** — the Implementer did not start a dev server and did not drive the app.

- [x] **Step 1: Drive the shop and one poisoned trick**

QA starts the app detached per `web-project.md`'s table and drives it through the `chrome-devtools` MCP. Confirm, with the viewport sizes named in the report:

- The shop's **Fight-long** tab shows the Poison Guard card rather than "Nothing on this shelf yet", and **Run-permanent** still shows the empty message.
- Buying it spends a coin, flips the purse cell to **Held**, and disables the card with "You are already holding a Poison Guard."
- The shop screen does **not** scroll with four purse cells and the Fight-long shelf open. jsdom has no layout engine, so this cannot be a test.
- Buying Envenom, marking a card, winning the trick it is played into, and resolving one more trick costs 2 health at that second trick — not at the next hand.
- The console is clean throughout.

### Task 18: Write the PR description ✓

- Skill: `none — a prose document for the developer to paste, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; the D1–D8 decision table from Part 1 → Task reference; that §9's simultaneous-depletion ruling is overturned and `SIMULTANEOUS_DEPLETION_WINNER` deleted; that `ENVENOM_DAMAGE` is renamed; that `beginNextHand` and `applyPendingEnvenom` are gone; every item under "Developer decides or observes" above; the verification results from Phase 6 with real numbers; and a one-line note for future contributors that poison figures are per-target-side and must be read through `envenomDamageFor`, never picked at a call site.

Written to `.claude/contract/DLR-91-poison-guard-fight-long-backfire-protection/pr-description.md`.

---

## Self-review

**Spec coverage:**
- D1 poison paid at the next trick — Tasks 3, 4, 5, 6.
- D2 4 to the Quarry / 2 to the player — Task 2, asserted in Task 3.
- D3 poison kills the streak by cashing it out — Task 3.
- D4 pending poison accumulates — Task 2 (the `queueEnvenom` sum and its test).
- D5 carries across a hand, discarded at a fight boundary — Task 5 (clear-then-book ordering), Task 6 (the discard test and the driver's comment).
- D6 Apply Damage disabled while poisoned — Task 6 Step 1 (`hasPendingEnvenom` kept), Task 13 Step 1 (recorded against §3). No code, by design.
- D7 Quarry-first sequencing, §9 overturned — Task 1, recorded in Task 13.
- D8 the Guard's accepted health cost — recorded in Task 13; no code.
- AC1 item on the fight-long rung at `POISON_GUARD_PRICE` — Tasks 7, 8, 12.
- AC2 fight-long is a real duration — Task 9.
- AC3 second purchase refused with a stated reason — Tasks 8, 9, 12.
- AC4 next-time-only, health kept, streak saved, consumed regardless — Tasks 3, 10, 11.
- AC5 no effect on the Quarry-side case — Task 10.
- AC6 Vitest coverage of all five behaviours — Tasks 8, 9, 10, 11, 12.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N". Two test bodies in Task 5 Step 2a and two in Task 11 Step 5 are specified by their assertions rather than transcribed, because they need this repo's existing reducer fixtures whose helper names the plan does not own — each names the exact state to seed and the exact facts to assert, which is a concrete instruction, not a placeholder.

**Type / name consistency:** `ENVENOM_QUARRY_DAMAGE`, `ENVENOM_PLAYER_DAMAGE`, `POISON_GUARD_PRICE`, `ShopItem.PoisonGuard`, `PurchaseRefusal.GuardAlreadyActive`, `ShopStock.poisonGuardHeld`, `RunState.poisonGuardHeld`, `guardAfter`, `envenomDamageFor`, `TrickFacts.poisonToPlayer` / `.poisonToQuarry` / `.poisonGuarded`, `TrickResolution.poisonToQuarry` / `.poisonGuardSpent`, `PlayCardOptions`, `poisonOptions`, `SHOP_GUARD_LABEL` / `SHOP_GUARD_HELD` / `SHOP_GUARD_NONE` — each spelled identically in every task that names it, and each matching `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: the constant and both its readers change together, and the two docblocks citing it are rewritten in the same task.
- **Phase 2** ends type-checking: the rename covers all 36 hits and Step 5 greps to prove it, while poison is still paid at hand start and works on the new figures.
- **Phase 3** deliberately breaks type-checking mid-phase (Task 3's required fields, Task 5's forward reference to `poisonGuardHeld`) and is verified by scoped specs per task; it is NOT a safe stopping point until Phase 4 Task 11 Step 6 — the framing paragraphs on both phases say so.
- **Phase 4** ends with the first full `npm run typecheck` since Phase 2, all three breaking shape changes travelling with their readers in one task each.
- **Phase 5** ends type-checking: `ShopPanel`'s required prop and its only call site change in the same task; the doc edits touch no code.
- **Phase 6** changes nothing.
