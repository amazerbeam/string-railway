Part of [Hunt](README.md).

# The flask — a free heal, one charge, refilled by a stage-boss kill

`src/hunt/flask.ts` (DLR-93) is the second module in this folder built on `shop.ts`'s shape and the
first one that is **not** about a purchase. It states the rules of a free, player-triggered emergency
heal: how much it restores, the two reasons it can be refused, and nothing else. The charge lives on
`RunState`; the transition that spends it lives in `runTransitions.ts`; the control that fires it
lives on the shop screen. See
[the flask control](../run-ui/the-flask-control.md) for the screen half.

## The two tunables, and what they actually are

| Key                      | Value | Unit                                   | Read by                                       |
| ------------------------ | ----- | -------------------------------------- | --------------------------------------------- |
| `FLASK_STARTING_CHARGES` | `1`   | flask charges                          | `startRun`, and `flaskAfter`'s boss refill     |
| `FLASK_HEAL_PERCENT`     | `0.6` | **a proportion in 0..1**, not a 0..100 percentage | `flaskHealAmount`, and nothing else |

Both are transcribed rather than chosen — from DLR-93's acceptance criteria and
`.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md` §2 ("Restores 60% of the player's
maximum health — 6 points at today's provisional 10. Carried as a single charge … refilled to one
charge each time a stage boss is beaten").

**`FLASK_HEAL_PERCENT` being a proportion is the trap worth naming.** `SKULL_DENSITY = 0.3` is the
existing precedent in the same file, and AC2's formula fixes the reading:
`Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)`. Written as `60` it would heal 600.

**One key, not two.** `FLASK_STARTING_CHARGES` is both the figure a run opens on *and* the figure a
boss kill refills to. A separate refill key beside it is the one that gets raised without the other;
today the two readings are indistinguishable, because both are 1.

**The heal is a percentage of the maximum rather than a flat figure like `HEAL_HEALTH_RESTORED = 4`,
deliberately.** `PLAYER_START_HEALTH` has already moved once (25 → 10). A flat flask sized against
the old bar would have stopped being an emergency heal; a proportion cannot.

At today's `PLAYER_START_HEALTH = 10` the flask restores **6**.

## `flask.ts` — the rules, and nothing about the run

```ts
export const FlaskRefusal = { NoCharges: 'noCharges', AlreadyFullHealth: 'alreadyFullHealth' } as const

export interface FlaskStock {
  readonly charges: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}

export function flaskHealAmount(maxPlayerHealth: Health): Health
export function flaskRefusalFor(stock: FlaskStock): FlaskRefusal | null
```

**`FlaskStock` is deliberately not a `RunState`**, exactly as `ShopStock` is not — this module states
the flask's rules and must not learn the run's shape. `run.ts`'s `flaskStockFor` is the projection
that builds one, so no screen assembles the three figures by hand and gets one wrong.

**`FlaskRefusal` is its own union, not two new members of `PurchaseRefusal`.** The flask is not a
purchase: it is free and charge-limited. Widening `PurchaseRefusal` — 49 hits across `src/`, with a
total `PURCHASE_REFUSAL_MESSAGE` map and item-specific branches in `refusalFor` — would force every
shop item's exhaustive handling to grow a case that can never occur for a purchase, and would let a
flask reason reach a shop card's `aria-label`. `FlaskRefusal.AlreadyFullHealth` duplicates the *name*
of its `PurchaseRefusal` twin because it is the same player-facing fact reached by a different rule.

### `flaskHealAmount` — the size of one drink, before the clamp

`Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)`, and it is the **only** reader of that key. It
rounds for the reason `config.ts`'s boss-health projection rounds: a fractional figure cannot reach a
heart row that renders whole hearts.

It **throws a `RangeError`** on a non-positive or non-finite maximum rather than returning `NaN`. A
`NaN` heal would corrupt the `Math.min` in the clamp, land in `encounter.health`, and vanish from the
health bar with nothing logged anywhere.

### `flaskRefusalFor` — the one statement of "can this be drunk"

Two readers, one rule: `drinkFlask` throws when it returns non-null, and the screen disables the
control and prints the reason. Never two rules — the same discipline `shop.ts`'s `refusalFor` already
carries.

```ts
if (!Number.isFinite(stock.charges) || stock.charges <= 0) return FlaskRefusal.NoCharges
if (stock.playerHealth >= stock.maxPlayerHealth) return FlaskRefusal.AlreadyFullHealth
return null
```

**`NoCharges` comes first deliberately**, mirroring `refusalFor`'s item-before-coins ordering: with an
empty flask at full health, the empty flask is the reason that will still be true after the next hit.

**A non-finite charge count refuses rather than passing the comparison.** `NaN <= 0` is `false`, which
would otherwise read as "a charge in hand" and present a primed figure as a drinkable flask — the
same guard `refusalFor` puts on `stock.coins`.

**There is no third reason code for "mid-hand".** Availability between fights is a driver-level gate
(which `RunPhase` mounts the shop), so reaching the transition mid-hand is a bug rather than something
to word for the player — see below.

## `drinkFlask` — the transition

Lives in `src/hunt/runTransitions.ts`, beside `buyFromShop` and for the same reasons. See
[the run](run-sequence.md) for why the transitions are their own module.

```ts
export function drinkFlask(run: RunState): RunState
```

> **DLR-158 deleted the `maxPlayerHealth` parameter.** The ceiling is now `RunState.maxPlayerHealth`,
> run state that the shop can raise, so a caller passing its own figure could disagree with the run.
> `flaskHealAmount` keeps its numeric parameter — it takes a number, not a run — and `drinkFlask`
> hands it `run.maxPlayerHealth`, which is the whole of "the flask scales with a raised ceiling":
> no edit to `flask.ts` at all.

It throws **twice over**, with two different messages, and returns an unchanged run in neither case:

- **On an unresolved encounter**, naming the fight. The flask is a between-fights action, gated by
  which `RunPhase` mounts the shop; reaching it mid-hand is a driver bug, so it gets `advanceRun`'s
  treatment rather than a reason code the screen would have to render.
- **On a non-null `flaskRefusalFor`**, naming the `FlaskRefusal`, the charges held and the health of
  maximum. A silent no-op is the "spent the charge for nothing" failure this folder already refuses to
  allow. Reaching it is a driver bug, because the control is disabled whenever the refusal is non-null
  and the driver re-derives it inside its own functional updater.

`maxPlayerHealth` **was** a defaulted parameter here, matching `startEncounter` / `startRun` /
`buyFromShop`'s injectable pattern. DLR-158 removed it from all four — see
[the max-health purchase](the-max-health-purchase.md). `startEncounter` kept its second parameter,
which is *current* health, a different quantity.

## `healedBy` is now the single writer that raises player health

This is the structural half of DLR-93, and AC2's explicit instruction — *"reuse that clamp pattern
rather than writing a second one"*.

Before this ticket, `buyFromShop`'s `Heal` branch inlined `Math.min(maxPlayerHealth, health + HEAL_HEALTH_RESTORED)`
and its own comment called itself "THE clamp, and therefore also the single place overheal is
discarded". Once a second thing healed, that sentence was only true if the expression moved. It did:

```ts
function healedBy(run: RunState, restored: Health, maxPlayerHealth: Health): RunState
```

- **Two callers, one clamp.** The paid Heal passes `HEAL_HEALTH_RESTORED`; the flask passes
  `flaskHealAmount(maxPlayerHealth)`. Neither owns the clamp, and overheal is discarded in exactly one
  place (DLR-84 AC4's rule, now stated once for both).
- **The paid Heal's behaviour is byte-identical** for identical inputs. The existing heal specs in
  `run.test.ts` and `shop.test.ts` passed unedited, which is the evidence.
- **It writes into `encounter.health[DuelSide.Player]`, because that IS the carried figure.**
  `RunState` holds no separate player-health field, and `advanceRun` seeds the next fight from the
  encounter. It deliberately does **not** go through `applyDamage`, which refuses a resolved encounter
  — a restore is not a damage event.

**Any future healing mechanic goes through `healedBy`, not beside it.** That is the whole point of the
refactor: a third heal that writes its own `Math.min` re-opens the drift this closed. **DLR-158 is
the test of that rule and it held**: the max-health purchase restores to the top of a *raised*
ceiling through `fullyHealed(run, ceiling)`, a named helper beside `healedBy` that simply calls it
with the ceiling as both the amount and the clamp — no second `Math.min` anywhere.

## The refill — `flaskAfter`, inside `recordEncounter`

```ts
export function flaskAfter(
  encounterIndex: number,
  flaskCharges: number,
  wonThisEncounter: boolean,
): number {
  const beatABoss = wonThisEncounter && runEncounterAt(encounterIndex).kind === OpponentKind.Boss
  return beatABoss ? FLASK_STARTING_CHARGES : flaskCharges
}
```

> **DLR-158 moved this helper (and the four carry helpers beside it) into `src/hunt/runCarry.ts`**,
> a pure extraction forced by `runTransitions.ts` crossing the 400-line budget. It is exported now
> and takes the two figures it reads rather than the whole `RunState`, so `runCarry.ts` need not
> import `run.ts`; the expression is unchanged. `recordEncounter` still calls it.

**A named function, not an inline ternary**, following `guardAfter`'s precedent beside it: a second transition adopting a hand's end state is exactly the thing that gets added without
remembering this rule, and a named rule is what a reviewer finds.

**It lives in `recordEncounter` and could not live in `advanceRun`** — for the same reason the coin
payout cannot. `advanceRun` never runs for the final fight of a won run, and Diarmuid, the last boss,
is precisely that fight.

**`run.encounterIndex` is the encounter just *fought*** at this point — `advanceRun` has not run yet —
so `runEncounterAt` on it names the opponent just beaten. This is `run.ts`'s first ever read of
`OpponentKind`; before DLR-93 that union fed only the map's glyph and the health formula.

**It refills to `FLASK_STARTING_CHARGES`, not to a literal `1`**, so the run's full-flask figure is
stated once. Indistinguishable today; visible the moment the epic's deferred re-tune raises the count.
The refill is unconditional on what the player was holding — 0 or 1 both become 1 (AC5's "regardless").

**An ordinary kill refills nothing**, and losing to a boss refills nothing either: `wonThisEncounter`
gates the whole expression.

## `RunState.flaskCharges` — a count, not a boolean

```ts
readonly flaskCharges: number   // DLR-93
```

- **A count** for the same reason `timebombCharges` is one: AC5 refills "regardless of whether the
  player had 0 or 1", and the deferred re-tune of the charge count raises the ceiling without changing
  this type.
- **Run-level**, like `coins`, and carried by both `advanceRun`'s and `recordEncounter`'s spreads. A
  free heal that reset at a fight boundary would be a per-fight heal.
- **Never handed back by a hand**, unlike `cheats`, `timebombCharges` and `blastGuardHeld` — a hand
  cannot drink the flask (AC4), so there is nothing for `WarCouncilRoundResult` to return and
  `recordEncounter` takes no flask parameter.
- **Never persisted**, exactly as `coins` is not. Nothing in this project is saved.

## `ENCOUNTER_PLAYER_RESTORE` is still read by nothing, and the flask is not it

DLR-82 named the flask as the answer to the run's health curve and forbade wiring the automatic
between-fight restore in until the flask was designed. **DLR-93 is that design landing, and it landed
without touching the tunable.** `ENCOUNTER_PLAYER_RESTORE` remains `0` with no production consumer;
the contract's final verification re-ran DLR-82's grep and expects the same eight hits (a declaration,
three prose comments, a barrel export and three in `config.test.ts`).

They are different mechanics and the distinction is the point: an automatic restore is something the
game does to you between fights, and the flask is something you choose to spend. The two prose
comments in `src/` that asserted no flask existed (`config.ts`, `encounter.ts`) were corrected by this
contract rather than deleted — both now record that the flask shipped *and* that the tunable stays
unread.

## Purity and coverage

`flask.ts` sits inside the lint-enforced `src/hunt/**` boundary: it imports `./config` and `./types`
and touches no global. It is unit-tested with plain function-in/value-out assertions under the `node`
Vitest project — `src/hunt/__tests__/flask.test.ts` for the two exported functions, and
`src/hunt/__tests__/run.flask.test.ts` for the charge on `RunState`, the drink-and-clamp, both
refusals, the boss refill and the ordinary-kill non-refill (AC7's six cases). The flask's specs live
in their own two files rather than joining `run.test.ts`, which was already at 343 lines — the same
call `blastGuard.test.ts` made.
