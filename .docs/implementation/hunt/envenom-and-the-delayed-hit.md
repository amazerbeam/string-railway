Part of [Hunt](README.md).

# Envenom — the held charge, the delayed-hit queue, and where it is paid

DLR-90, retimed by DLR-91. The third shop item, and the first effect in this game that resolves
**later than the thing that caused it**. Every other consequence in the codebase lands in the same
statement that decides it: a trick's damage is applied by the resolution that computed it, a heal is
applied by the purchase that bought it. Envenom books a hit against a side and pays it **at the
resolution of the next trick**, which means the module needs somewhere to keep it in the meantime and
exactly one place to settle it.

The mark itself is not here — it lives on `RoundState` and is written by
[`src/warCouncil/envenom.ts`](../war-council/the-envenom-mark.md). This file owns the two things
`src/hunt/` still holds: the **charge** the player buys and carries, and the **queue** the resolved
trick writes into. **The payment left this module at DLR-91** — it is now folded into the next trick's
own damage by `roundReducer.ts`, for the reason recorded below.

> **DLR-91 changed the timing, the amount, and who pays what — 2026-08-19.** Three facts DLR-90 shipped
> are no longer true and are corrected in place throughout this file: the hit landed **at the deal of the
> next hand** and now lands **at the resolution of the next trick**; the single `ENVENOM_DAMAGE = 4` key
> became the pair `ENVENOM_QUARRY_DAMAGE` (4) / `ENVENOM_PLAYER_DAMAGE` (2), so **the hit is no longer
> symmetric**; and the player's share now **forces the streak's cash-out**, which the Quarry has no
> equivalent of. `applyPendingEnvenom` and `beginNextHand` — DLR-90's payment pair — were **deleted**.
> Unchanged and still DLR-90's: the queue's shape, both halves of its lifetime, the marker, the replaced
> clean loss, and the charge as a count.

## Three pieces of state, at three different lifetimes

The feature spans three lifetimes, and each piece sits on the state that already has that lifetime —
none of them needed a new container:

| Piece               | Lives on        | Lifetime            | Written by                        |
| ------------------- | --------------- | ------------------- | --------------------------------- |
| `envenomCharges`    | `RunState`      | the whole run       | `buyFromShop`, then the hand      |
| `pendingEnvenom`    | `EncounterState` | one fight           | `queueEnvenom`; cleared by the reducer at the trick that pays it |
| `envenomedCards`    | `RoundState`    | one hand            | `envenomCard` (warCouncil)        |

That alignment is what makes the discard rules free rather than enforced. A mark cannot leak into
the next hand because `dealRound` rebuilds `RoundState`; a booking cannot cross a fight or a run
boundary because `startEncounter` seeds `pendingEnvenom` to zeros and both `advanceRun` and
`startRun` route through it. **There is no explicit clear step anywhere**, which is the point — a
clear step is a thing a later ticket forgets to call.

## The queue is shaped like the damage it will become

`EncounterState.pendingEnvenom` is an `IncomingDamage` — `Readonly<Record<DuelSide, Damage>>` — the
same type `applyDamage` already consumes, keyed by **the side the damage is applied to** and never
by the side that dealt it. That is the module-wide convention `IncomingDamage` exists to state.

Reusing the type rather than inventing a parallel one bought DLR-90 a payment that was one
`applyDamage` call with no branch. **Under DLR-91 it buys something slightly different**: the record's
two figures are read out per side into `TrickFacts` and end up back in an `IncomingDamage` anyway,
because `incomingFrom` sums the Quarry's poison into the Quarry's total and `resolveTrickBank` folds
the player's into `damageToPlayer`. The queue is still shaped like the damage it becomes; what changed
is that it now travels through the trick's own resolution rather than around it.

**A per-side record rather than a `DuelSide | null`** was the load-bearing choice, and it is worth
knowing why, because the null version looks simpler and is not:

- Two marked cards can resolve in one hand, on either side. A record accumulates; a single side
  would have to either overwrite (losing a hit) or grow a second field.
- The symmetry the design asks for — the hit follows whoever won the marked trick, player or Quarry
  — becomes **structural** rather than a mirrored rule. Nothing on the paying path asks which side is
  owed; it reads both keys and adds whatever is there. (DLR-91 made the *amounts* asymmetric without
  making the *plumbing* asymmetric: `envenomDamageFor` decides the figure once, at booking time.)
- A later delayed effect can accumulate into the same record without reshaping `EncounterState`. That
  prediction was tested by **Poison Guard** (DLR-91) and held: the Guard reads this record and adds no
  field to `EncounterState` at all. See [Poison Guard](poison-guard.md).

`NO_PENDING_ENVENOM` is the shared zero — `IncomingDamage`-typed and therefore deeply `readonly`,
only ever spread from and never assigned into, the same discipline `duelHealthBars.ts`'s `NO_BREAKING`
uses. It is the one new module-level object in the feature.

## `queueEnvenom` — booking the hit

`(encounter, target) => EncounterState`. Adds the **target side's own figure** to the record and
returns a new encounter — `ENVENOM_QUARRY_DAMAGE` (4) against the Quarry, `ENVENOM_PLAYER_DAMAGE` (2)
against the player, since DLR-91 split the single key. It was one shared figure as DLR-90 shipped it.

**Which figure is chosen once, in `envenomDamageFor(target)` beside the booking** (D2). That
placement is the point: a caller that had to pick the amount itself is a caller that can pick the wrong
one, and two keys whose names differ by one word is exactly the shape of a bug that type-checks, reads
correctly, and pays the wrong side. Nothing outside this file names either key.

**It was module-private until DLR-101, which promoted it to a `src/hunt` export** — a purely additive
change, with `queueEnvenom` still its only internal caller. The reason is the same argument one layer
out: the felt's copy layer now names the booked amount on the trick that books it, and a copy layer
choosing between `ENVENOM_QUARRY_DAMAGE` and `ENVENOM_PLAYER_DAMAGE` at the call site is exactly the
caller this function exists to prevent. `labels.ts`'s `poisonBookedText` reads it. **This is the only
engine-side change DLR-101 made**, and no behaviour moved with it.

Two properties are deliberate:

- **It never throws.** Every other transition in this module throws on misuse, because every other
  one is only ever reached deliberately. This one is called from `roundReducer.ts` during an event
  handler, and **a throw inside a reducer unmounts the tree** — so the failure mode this function
  must not have is the loud one.
- **It returns the encounter unchanged when the encounter is already resolved.** That is not a
  swallowed error, it is the rule: if the marked trick's own cash-out emptied a bar, the fight is
  over and the delayed hit is discarded rather than carried anywhere. "Unchanged" is the correct
  answer, so returning it is honest.

It touches neither `health` nor `damageEventsApplied` — a booking is not a damage event, and
counting it as one would make the counter mean two different things.

## Where the payment happens now — and why it is not in this module

`applyPendingEnvenom` and `beginNextHand` are **gone** (DLR-91). What replaced them is not another
function in `src/hunt/`: the queue is now paid by `roundReducer.ts`'s `applyResolution`, at the trick
that resolves, as part of that trick's own damage.

**The reason it moved is a module boundary the old design did not have to cross.** DLR-90's hit was
health and nothing else, so paying it needed only `applyDamage` — which lives here. DLR-91's
player-side hit additionally **forces the streak to cash out**, and the bank and the multiplier are
`RoundState`'s, in `src/warCouncil/`. `src/hunt/` must not learn what a `RoundState` is — its own type
docs warn about exactly that cycle, and `warCouncil` already imports `hunt` — so the encounter cannot
reach the streak. What ships instead is the reverse: the **reducer holds both**, reads the two pending
figures off `encounter.pendingEnvenom`, and hands them *into* `playCard` through a widened options
parameter. `resolveTrickBank` then folds the player's share into that trick's `damageToPlayer` and
reaches the same cash-out branch a lost trick reaches; the Quarry's share rides out on
`TrickResolution` and is summed by `incomingFrom`. See
[the bank and the cash-out](../war-council/bank-and-cash-out.md).

Two alternatives were considered and rejected, and both are worth knowing before moving it back:

- **Putting pending poison on `RoundState`.** The round is re-dealt every hand, so a booking made on
  the last trick of a hand would need a new `dealRound` parameter and a new field on
  `WarCouncilRoundResult` to survive — and the queue would stop being discarded for free at a fight
  boundary. Everything the encounter's lifetime gives away for nothing would have to be re-enforced.
- **Post-processing the bank in the reducer after `resolveTrickBank` returned.** That is two readings
  of one rule — "what resets the streak" — stated in two files, and the two would drift.

**What this module kept is the queue, not the payment.** `queueEnvenom` books, `hasPendingEnvenom`
answers whether anything is owed, `startEncounter` discards at a fight boundary, and `applyDamage`
carries the record through untouched. Nothing here decides *when* the hit lands any more.

`hasPendingEnvenom` is exported as the one statement of "is anything owed", so a queue check and a
payment cannot disagree about whether there is work to do. The reducer reads it to decide whether the
queue needs clearing after a payment. **Its second, reserved purpose acquired a caller at DLR-94** —
D6 (2026-08-19) decided that Apply Damage must be disabled while poison is pending, and when DLR-91
shipped there was no such control, so the predicate was kept waiting rather than re-derived by a later
ticket. DLR-94 built the control and read this predicate: `src/warCouncil/voluntaryCashOut.ts`'s
`applyDamageRefusalFor` returns `PoisonPending`, re-asked on the confirming second tap. It reads
**both** sides of the queue, so a hit owed to the Quarry locks the control too.

## The charge — bought, carried, spent

`RunState.envenomCharges` is a **count**, not a list of objects like `cheats`. A Cheat is an object
because a spend names a specific card and React needs a stable key for the slot it leaves; a charge
has no identity to spend by name — **the card it marks is the identity**, and that lives on
`RoundState.envenomedCards`. `startRun` seeds it to `0` and `advanceRun`'s existing spread carries
it across every fight boundary with no new code.

`recordEncounter` gained a **required fourth parameter** to take the count back from a finished
hand, for the reason its own docblock already argued when `cheats` became its third: a second
transition the caller must remember to make beside this one is the transition that eventually gets
forgotten. Required rather than defaulted means the compiler enumerated all ~20 call sites instead
of trusting a caller.

### `buyFromShop` was restructured, and it was hiding a real defect

Adding a third item to the shop exposed something the two-item version had got away with. The old
tail branched `if (item === ShopItem.Cheat) { … }` and then **returned the heal unconditionally** as
its fallback — so a third item would have healed the player, silently, and type-checked cleanly.

It is now an exhaustive `switch` with **no `default`**, every arm returning:

```ts
switch (item) {
  case ShopItem.Cheat:   return { ...paid, cheats: addCheat(...), nextCheatId: run.nextCheatId + 1 }
  case ShopItem.Envenom: return { ...paid, envenomCharges: run.envenomCharges + 1 }
  case ShopItem.Heal:    return { ...paid, encounter: { … Math.min(maxPlayerHealth, …) … } }
}
```

A fourth item is now a compile error here rather than an item that quietly does whatever the last
branch happened to do. QA confirmed the fix in a real browser as well as in the type system: buying
a Heal at 9 of 10 health raises health and leaves the Envenom count untouched.

**`refusalFor` needed no clause at all**, and that is the correct rule rather than an omission.
Envenom falls through both item-specific guards to the coin check, because there is **no cap on
charges held** — coins are the only limiter. The Cheat's `SlotsFull` refusal exists because
`CHEAT_SLOT_COUNT` is a designed inversion-preserving cap, and nothing states an analogue here.
Adding one later is a config key, one `refusalFor` clause and one `PurchaseRefusal` code.

## The two tunables, both transcribed

| Key                     | Value | Unit                                         | Where it came from |
| ----------------------- | ----- | -------------------------------------------- | ------------------ |
| `ENVENOM_PRICE`         | `2`   | coins per purchase                           | `version-4-scope.md`'s own heading ("2 coins") — **transcribed** |
| `ENVENOM_QUARRY_DAMAGE` | `4`   | health, applied once, at the next trick's resolution | `version-4-scope.md`, which ties it to "one fight's worth of damage" and the shop's Heal — **transcribed** |
| `ENVENOM_PLAYER_DAMAGE` | `2`   | health, applied once, at the next trick's resolution | **the developer's choice, 2026-08-19 (DLR-91)** — halved because the player-side hit **also** forces the streak's cash-out |

**DLR-90 shipped ONE key, `ENVENOM_DAMAGE = 4`, applied to whichever side won.** DLR-91 replaced it
with the pair above, so **the hit is no longer symmetric**: 4 against the Quarry, 2 against the
player. Its own comment states the reason a shared key was rejected — "a single shared key is the bug
that type-checks, reads correctly, and pays the wrong side."

The price is twice `POISON_GUARD_PRICE` because Envenom is a guaranteed unconditional hit rather than
insurance against a risk. The Quarry's 4 reads on a scale the player already knows, and it is **equal
to `HEAL_HEALTH_RESTORED` by design but a separate key**, because the two are the same number for a
stated reason rather than the same value.

**No figure is written as a literal outside `config.ts`**, and the shop blurb interpolates the key
rather than quoting it — so re-tuning cannot leave a screen naming a number the engine no longer uses.
A Final-verification grep pins exactly that.

## Where the `envenom` and `poison` stems are each used, and why

`CardRank.Poison = 8` already exists, and it is an **ordinary card with no rule at all** — the-hunt.md
§1 records its name as actively misleading and an open question. A `poisonedCards` field sitting
beside `CardRank.Poison` would be a permanent reading trap in a codebase whose whole discipline is
stating each fact once, so **everything that is about the marker or the queue uses the `Envenom` /
`envenom` stem**: `envenomedCards`, `envenomCard`, `pendingEnvenom`, `queueEnvenom`,
`ENVENOM_QUARRY_DAMAGE`.

**DLR-91 introduced the `poison` stem alongside it, deliberately and for a different job.** The names
it added are about the *effect being paid* and the *item that insures against it*, not about the
marker: `poisonToPlayer` / `poisonToQuarry` / `poisonGuarded` on `TrickFacts`, `poisonGuardHeld` on
`RunState`, `ShopItem.PoisonGuard`, `POISON_GUARD_PRICE`. None of them is a card-membership list, so
none of them is confusable with `CardRank.Poison` at a call site. The line to hold is that one: **a
list of marked cards is never called `poison…`**, and the forbidden-identifier grep below is what
holds it.

**User-facing copy says "poisoned" and "Poison Guard"**, because that is what the design doc and the
tickets call it and it reads better than "envenomed". A Final-verification grep
checks the specific forbidden identifiers (`poisonedCards`, `pendingPoison`, `poisonTrick`,
`poisonTarget`, `isPoisoned`, `poisonCard`, `PoisonStage`) rather than the word, so it cannot match
the legitimate copy or the card rank.

> **`pendingPoison` is now in `src/` anyway, introduced by DLR-101 and not caught.** It is the
> parameter name on `projectedDepletion` in `src/app/warCouncil/duelHealthBars.ts` and a local in
> `roundBars.ts`, and in both places it holds `encounter.pendingEnvenom` — a per-side damage record,
> not a card-membership list, so the confusion with `CardRank.Poison` the rule guards against is not
> actually present. The identifier is still on the forbidden list, and the grep did not run over
> `src/app/`, so this is a real gap between the rule as written and the rule as enforced. Either
> rename the two occurrences to `pendingEnvenom`, or narrow the rule to the case it is about — a
> list of marked cards. Recorded rather than fixed, because it is a naming decision.

## The queue has a readout now — DLR-101

Everything above describes a booking the player could not see. Until DLR-101 that was literally true:
**nothing on the felt showed a pending hit existed, who owed it, or how much it was for.** A session
on the second fight lost a poisoned trick cleanly, 4 damage was correctly booked against the Quarry,
the bar read 14/14, and the player concluded the mechanic was broken.

The readout is entirely downstream of this module — it derives from `pendingEnvenom` and stores
nothing — so **no part of this file's behaviour changed**. What exists now: the health bars carry
booked poison as a distinguished standing heart on whichever side owes it, on **both** bars, and the
trick reveal that books a hit names the side and the amount. See
[the duel's health bars](../war-council-ui/duel-health-bars.md) for the derivation, the fifth heart
state, and the several things about it nobody has yet looked at.

**A held Poison Guard remains invisible during a fight**, which is now a sharper seam than it was:
the player can see poison booked against them that a Guard they are holding may cancel, and nothing
says the Guard is there. See [Poison Guard](poison-guard.md).

> **A pre-existing failure in this area, not caused by the above.**
> `src/hunt/__tests__/envenom.test.ts :: 'does NOT add a Cheat'` fails, and it failed **identically
> on the pre-DLR-101 tree** — confirmed by stashing that contract's diff and re-running. It asserts
> that buying an Envenom charge leaves `cheats` an empty array. Nothing in DLR-101 touches
> `buyFromShop`, the shop, or `cheats`. It is recorded here because it sits in the envenom area this
> file covers, and because an unattributed red test is the kind of thing a later ticket wastes a
> round rediscovering. Whose it is, is still open.

## Purity

Everything in this file is inside the lint-enforced no-React, no-DOM boundary on `src/hunt/**`. The
queue, its payment and the charge are all plain immutable transitions unit-testable with no renderer,
and `src/hunt/` still never imports `src/warCouncil/`. The `PlayerSide` → `DuelSide` crossing this
feature needs happens once, on the warCouncil side, in `bank.ts` — see
[the mark](../war-council/the-envenom-mark.md).
