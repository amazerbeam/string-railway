Part of [Hunt](README.md).

# Shield — non-stacking blue hearts, absorbed ahead of red health

DLR-110. `src/hunt/shield.ts` (95 lines) plus the shield half of `src/hunt/encounter.ts`. A Shield
activation adds a tier-sized cluster of **blue hearts** that take incoming player damage before
ordinary (red) health does, one point per blue heart, and the cluster does not stack across
activations.

## `SHIELD_HEARTS` — the tier ladder

```ts
export const SHIELD_HEARTS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}
```

TRANSCRIBED, not chosen in this module: design doc §7a ("bronze adds 1, silver 2, gold 3"). The
unit is **blue hearts granted by one activation** — the same 1/2/3 ladder `CHEAT_DURATION_TRICKS`
carries, for the same reason: it is the only tier curve the design sources actually state.

## `NO_SHIELD_HEARTS` — the empty state

`NO_SHIELD_HEARTS: Health = 0`. What `startEncounter` seeds a fresh encounter to (`encounter.ts:52`)
and what a fully spent shield returns to once its blue hearts are gone.

## `absorbWithShield` — THE single statement of the absorption order

Blue hearts take damage **before** ordinary hearts, one point each:

```ts
export function absorbWithShield(shieldHearts: Health, damage: Damage): ShieldAbsorption {
  // ...
  const absorbed = Math.min(shieldHearts, damage)
  return {
    absorbed,
    throughToHealth: damage - absorbed,
    shieldHeartsRemaining: shieldHearts - absorbed,
  }
}
```

**A blue heart is worth one point, not one hit.** Three damage into two blue hearts consumes both
and lets one point through to red health — it does not negate the hit outright. That is design
§7a's "dividing what you take", and it is what keeps Shield distinct from `Ward`
(`v1-buff-card-list.md`), which absorbs up to N on the next hit and then breaks regardless of how
much of that N it actually used.

Its result, `ShieldAbsorption`, uses **named fields rather than a tuple** because `absorbed` and
`throughToHealth` are both `Damage` — a transposed pair would type-check cleanly and deplete the
wrong pool.

Its two `RangeError` guards (a non-finite/negative `shieldHearts`, a non-finite/negative `damage`)
are **guards rather than live paths**: `applyDamage`'s `assertApplicable` already rejects a bad
`damage` upstream, so nothing in the shipped call graph reaches either throw today. They exist so a
future direct caller cannot assume the check happened for them — an unguarded `NaN` here would
produce `NaN` remaining hearts, reach a rendered row as nothing at all, and log nothing.

`absorbWithShield` performs **no clamping of red health** — `deplete` in `encounter.ts` remains the
single clamp point for that, and this function never touches `health`.

## `shieldHeartsForTier` — the only reader of `SHIELD_HEARTS`

```ts
export function shieldHeartsForTier(tier: BuffTier): Health {
  const hearts = SHIELD_HEARTS[tier]
  if (hearts === undefined) {
    throw new RangeError(`No shield heart count is defined for tier ${tier}`)
  }
  return hearts
}
```

One tier has exactly one answer, and it **throws rather than returning `undefined`** — an
`undefined` count would flow into `activateShield` and set a shield of `undefined` blue hearts,
which renders as nothing rather than failing loudly.

## `activateShield` — SETS rather than adds

```ts
export function activateShield(encounter: EncounterState, tier: BuffTier): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  return { ...encounter, shieldHearts: shieldHeartsForTier(tier) }
}
```

(`encounter.ts:240-243`.) Activation **replaces** `shieldHearts` with the new tier's count rather
than adding to whatever is already standing — so it is non-stacking by construction and needs no
upper-cap guard; none exists, because 3 (gold) is the maximum any tier can produce. Returns the
encounter unchanged when it is already resolved, the same discipline every other post-resolution
mutator in this module follows.

## Non-healable — a measured fact, not a design claim

`shieldHearts` has exactly three writers in `src/`:

- the seed at `encounter.ts:52` (`NO_SHIELD_HEARTS`, on every fresh encounter),
- the absorption result at `encounter.ts:152` (`absorption.shieldHeartsRemaining`, every damage
  event),
- `activateShield` at `encounter.ts:242`.

No heal path writes it. `healedBy` (the flask's and the paid Heal's single writer for player
health) never touches `shieldHearts`, so there is no route by which a blue heart is restored once
spent — a Shield activation is the only way the count increases.

## Where Ward sits relative to it

A held Ward absorbs **ahead of** blue hearts. Inside `applyDamage`, `wardSplit` is computed and
consumed before `absorbWithShield` runs (`encounter.ts:112-123`): the Ward's remainder
(`wardSplit.throughToHealth`) is what reaches `absorbWithShield`, not the raw incoming damage. A
Ward that fully absorbs a hit leaves nothing for the shield to spend on; a Ward that only partially
absorbs passes the remainder on to the blue hearts first, ahead of red health.

## Known defects, recorded and not fixed

- **Unreachable in play, for a narrower reason since DLR-142 (2026-08-25).** `activateShield` now
  HAS an app-layer caller — `handleTapBuff` (`src/app/warCouncil/buffHandlers.ts`) wires it in,
  mirroring the existing Ward branch — and fires correctly the moment it runs. What still makes
  `encounter.shieldHearts` `0` for the whole of a real run is that `shieldBuff` has zero production
  callers: nothing mints a Shield into any drawable pool, so `activateShield` is never actually
  invoked in play. Pinned by `src/sim/__tests__/reachability.test.ts`, which asserts `BuffKind.Shield`
  is _still_ unreachable. **No blue heart has ever been drawn by anything.** DLR-142 also made
  Shield single-use by default (`ACTIVATED_CARD_SINGLE_USE`, see
  [consumable-items.md](consumable-items.md)) — once a Shield source exists, activating one removes
  it from the pile the same way a Cheat now does.
- **The `breaking` overlay over-draws** when a shield partially absorbs a landed hit: 3 damage into
  2 blue hearts drops red health by 1 but draws 3 breaking red pips, because
  `resolution.damageToPlayer` is gross while `encounter.shieldHearts` is post-absorption and the
  absorbed amount is not recoverable from the two. Needs `ResolvedTrick` to record the absorption.
  Documented in `roundBars.ts`; unreachable today for the reason above, and **visible the moment
  Shield is wired.**
