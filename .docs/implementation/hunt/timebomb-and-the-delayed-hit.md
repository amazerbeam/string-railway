Part of [Hunt](README.md).

# Timebomb — the held charge, the delayed-hit queue, and where it is paid

DLR-90, retimed by DLR-91. The third shop item, and **for two tickets** the only effect in this game
that resolves **later than the thing that caused it**. Every other consequence in the codebase lands
in the same statement that decides it: a trick's damage is applied by the resolution that computed
it, a heal is applied by the purchase that bought it. Timebomb books a hit against a side and pays it
**at the resolution of the next trick**, which means the module needs somewhere to keep it in the
meantime and exactly one place to settle it.

> **DLR-109 gave this mechanic a sibling, and the two must not be confused.** Apply Damage's payout
> (`applyDamagePayout.ts`) delayed its own cash-out by a trick or more, reusing this module's
> queue-on-`EncounterState` shape deliberately rather than inventing a second one — but it is **not**
> a Timebomb: it is *queued* and *lands*, never *primed*, *ticking*, or *detonating*. The two queues
> also interact once: because Apply Damage's wipe rule lives inside `applyDamage`, a Timebomb that
> detonates against the player on the same trick a payout was due destroys that payout. See
> **Both that module and its doc were deleted by DLR-156.** See the DLR-109 paragraph in
> [README.md](README.md) for the record of the
> ordering rule that produces that interaction.

The mark itself is not here — it lives on `RoundState` and is written by
[`src/warCouncil/timebomb.ts`](../war-council/the-timebomb-mark.md). This file owns the two things
`src/hunt/` still holds: the **charge** the player buys and carries, and the **queue** the resolved
trick writes into. **The payment left this module at DLR-91** — it is now folded into the next trick's
own damage by `roundReducer.ts`, for the reason recorded below.

> **DLR-91 changed the timing, the amount, and who pays what — 2026-08-19.** Three facts DLR-90 shipped
> are no longer true and are corrected in place throughout this file: the hit landed **at the deal of the
> next hand** and now lands **at the resolution of the next trick**; the single `TIMEBOMB_DAMAGE = 4` key
> became the pair `TIMEBOMB_QUARRY_DAMAGE` (4) / `TIMEBOMB_PLAYER_DAMAGE` (2), so **the hit is no longer
> symmetric**; and the player's share now **forces the streak's cash-out**, which the Quarry has no
> equivalent of. `applyPendingTimebomb` and `beginNextHand` — DLR-90's payment pair — were **deleted**.
> Unchanged and still DLR-90's: the queue's shape, both halves of its lifetime, the marker, the replaced
> clean loss, and the charge as a count.

## Three pieces of state, at three different lifetimes

The feature spans three lifetimes, and each piece sits on the state that already has that lifetime —
none of them needed a new container:

| Piece               | Lives on        | Lifetime            | Written by                        |
| ------------------- | --------------- | ------------------- | --------------------------------- |
| `timebombCharges`    | `RunState`      | the whole run       | `buyFromShop`, then the hand      |
| `pendingTimebomb`    | `EncounterState` | one fight           | `queueTimebomb`; cleared by the reducer at the trick that pays it |
| `primedCards`    | `RoundState`    | one hand            | `primeCard` (warCouncil)        |

That alignment is what makes the discard rules free rather than enforced. A mark cannot leak into
the next hand because `dealRound` rebuilds `RoundState`; a booking cannot cross a fight or a run
boundary because `startEncounter` seeds `pendingTimebomb` to zeros and both `advanceRun` and
`startRun` route through it. **There is no explicit clear step anywhere**, which is the point — a
clear step is a thing a later ticket forgets to call.

## The queue is shaped like the damage it will become

`EncounterState.pendingTimebomb` is an `IncomingDamage` — `Readonly<Record<DuelSide, Damage>>` — the
same type `applyDamage` already consumes, keyed by **the side the damage is applied to** and never
by the side that dealt it. That is the module-wide convention `IncomingDamage` exists to state.

Reusing the type rather than inventing a parallel one bought DLR-90 a payment that was one
`applyDamage` call with no branch. **Under DLR-91 it buys something slightly different**: the record's
two figures are read out per side into `TrickFacts` and end up back in an `IncomingDamage` anyway,
because `incomingFrom` sums the Quarry's Timebomb into the Quarry's total and `resolveTrickBank` folds
the player's into `damageToPlayer`. The queue is still shaped like the damage it becomes; what changed
is that it now travels through the trick's own resolution rather than around it.

**A per-side record rather than a `DuelSide | null`** was the load-bearing choice, and it is worth
knowing why, because the null version looks simpler and is not:

- Two marked cards can resolve in one hand, on either side. A record accumulates; a single side
  would have to either overwrite (losing a hit) or grow a second field.
- The symmetry the design asks for — the hit follows whoever won the marked trick, player or Quarry
  — becomes **structural** rather than a mirrored rule. Nothing on the paying path asks which side is
  owed; it reads both keys and adds whatever is there. (DLR-91 made the *amounts* asymmetric without
  making the *plumbing* asymmetric: `timebombDamageFor` decides the figure once, at booking time.)
- A later delayed effect can accumulate into the same record without reshaping `EncounterState`. That
  prediction was tested by **Blast Guard** (DLR-91) and held: the Guard reads this record and adds no
  field to `EncounterState` at all. See [Blast Guard](blast-guard.md).

`NO_PENDING_TIMEBOMB` is the shared zero — `IncomingDamage`-typed and therefore deeply `readonly`,
only ever spread from and never assigned into, the same discipline `duelHealthBars.ts`'s `NO_BREAKING`
uses. It is the one new module-level object in the feature.

## `queueTimebomb` — booking the hit

> **DLR-132 changed this function's signature, 2026-08-24.** `timebombDamageFor` is deleted, and
> `queueTimebomb` now takes the damage pair as a required third argument rather than picking a figure
> internally — because a Timebomb's amount depends on the tier of the card that primed it, which this
> module cannot see. The paragraphs immediately below describe the pre-DLR-132 shape; the corrected
> signature and its caller are described after them.

`(encounter, target) => EncounterState`. Adds the **target side's own figure** to the record and
returns a new encounter — `TIMEBOMB_QUARRY_DAMAGE` (4) against the Quarry, `TIMEBOMB_PLAYER_DAMAGE` (2)
against the player, since DLR-91 split the single key. It was one shared figure as DLR-90 shipped it.

**Which figure was chosen once, in `timebombDamageFor(target)` beside the booking** (D2). That
placement was the point: a caller that had to pick the amount itself is a caller that can pick the wrong
one, and two keys whose names differ by one word is exactly the shape of a bug that type-checks, reads
correctly, and pays the wrong side. Nothing outside this file named either key.

**Since DLR-132, `(encounter, target, damage: TimebombDamage) => EncounterState`.** The caller now
supplies the pair — `damage[target]` is added to the record — because the figure is the *primed
card's own tier's*, and `commit` in `src/app/warCouncil/commitHandlers.ts` is the one place that
knows which card that was (`state.primedTimebombDamage`). `TimebombDamage` is `buffCatalog.ts`'s
type, retyped `Readonly<Record<DuelSide, Damage>>` so `damage[target]` reads identically to the old
`timebombDamageFor(target)` at every call site that still only needs one side.

**It was module-private until DLR-101, which promoted it to a `src/hunt` export** — a purely additive
change, with `queueTimebomb` still its only internal caller. The reason is the same argument one layer
out: the felt's copy layer now names the booked amount on the trick that books it, and a copy layer
choosing between `TIMEBOMB_QUARRY_DAMAGE` and `TIMEBOMB_PLAYER_DAMAGE` at the call site is exactly the
caller this function exists to prevent. `labels.ts`'s `timebombBookedText` reads it. **This is the only
engine-side change DLR-101 made**, and no behaviour moved with it.

> **DLR-154 gave `queueTimebomb` a SECOND producer, 2026-08-31 — and no signature change.** A
> primed card the player never plays now carries a **two-trick fuse** and detonates in the hand:
> when the fuse runs out, `commitHandlers.ts` calls this same function with `DuelSide.Player` and
> the primed card's own tier pair, so `damage[target]` selects the **player** figure (2 / 4 / 6).
> Booking rather than applying is the whole point of the choice — the bank-and-multiplier reset, the
> Blast Guard's absorption and spend, the zero floor and the forced cash-out are all inherited from
> the path a played bomb already takes, with nothing restated. The cost is one further trick of
> delay before the hit lands, which is the same one-trick fuse every booked hit has. **Whether the
> Blast Guard should absorb an in-hand pop is inherited, not chosen, and is the developer's.** The
> fuse itself is entirely the felt's — see
> [Priming a Timebomb](../war-council-ui/timebomb-priming-and-the-fuse.md).

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

`applyPendingTimebomb` and `beginNextHand` are **gone** (DLR-91). What replaced them is not another
function in `src/hunt/`: the queue is now paid by `roundReducer.ts`'s `applyResolution`, at the trick
that resolves, as part of that trick's own damage.

**The reason it moved is a module boundary the old design did not have to cross.** DLR-90's hit was
health and nothing else, so paying it needed only `applyDamage` — which lives here. DLR-91's
player-side hit additionally **forces the streak to cash out**, and the bank and the multiplier are
`RoundState`'s, in `src/warCouncil/`. `src/hunt/` must not learn what a `RoundState` is — its own type
docs warn about exactly that cycle, and `warCouncil` already imports `hunt` — so the encounter cannot
reach the streak. What ships instead is the reverse: the **reducer holds both**, reads the two pending
figures off `encounter.pendingTimebomb`, and hands them *into* `playCard` through a widened options
parameter. `resolveTrickBank` then folds the player's share into that trick's `damageToPlayer` and
reaches the same cash-out branch a lost trick reaches; the Quarry's share rides out on
`TrickResolution` and is summed by `incomingFrom`. See
[the bank and the cash-out](../war-council/the-streak-and-the-pot.md).

Two alternatives were considered and rejected, and both are worth knowing before moving it back:

- **Putting pending Timebomb on `RoundState`.** The round is re-dealt every hand, so a booking made on
  the last trick of a hand would need a new `dealRound` parameter and a new field on
  `WarCouncilRoundResult` to survive — and the queue would stop being discarded for free at a fight
  boundary. Everything the encounter's lifetime gives away for nothing would have to be re-enforced.
- **Post-processing the bank in the reducer after `resolveTrickBank` returned.** That is two readings
  of one rule — "what resets the streak" — stated in two files, and the two would drift.

**What this module kept is the queue, not the payment.** `queueTimebomb` books, `hasPendingTimebomb`
answers whether anything is owed, `startEncounter` discards at a fight boundary, and `applyDamage`
carries the record through untouched. Nothing here decides *when* the hit lands any more.

`hasPendingTimebomb` is exported as the one statement of "is anything owed", so a queue check and a
payment cannot disagree about whether there is work to do. The reducer reads it to decide whether the
queue needs clearing after a payment.

> **Its second, reserved purpose acquired a caller at DLR-94, and lost it again at DLR-143.** D6
> (2026-08-19) decided that Apply Damage must be disabled while Timebomb is pending, and when DLR-91
> shipped there was no such control, so the predicate was kept waiting rather than re-derived by a
> later ticket. DLR-94 built the control and read this predicate:
> `src/warCouncil/voluntaryCashOut.ts`'s `applyDamageRefusalFor` returned `TimebombPending` (both
> deleted by DLR-156), re-asked
> on the confirming second tap, reading **both** sides of the queue so a hit owed to the Quarry locked
> the control too. **DLR-143 (2026-08-25) reversed D6 outright** — the two systems now stack rather
> than exclude each other — and `roundUiState.ts`'s `applyDamageStock` dropped its only call to
> `hasPendingTimebomb` in that file as part of the change. The exported predicate itself is untouched
> and still answers "is anything owed" for the reducer's own clearing logic; it simply has no
> caller outside `src/hunt/` any more.

## The charge — bought, carried, spent

> **DLR-132 deleted everything this section originally described, 2026-08-24.** `RunState.timebombCharges`
> and the required `cheats`/`timebombCharges` parameters on `recordEncounter` are gone. A Timebomb is
> now an ordinary pile member on `RunState.buffs`, exactly like a Cheat or any other buff — it survives
> a fight boundary through the pile's own carry, with no separate count and no separate parameter for a
> hand to hand back. This section is kept for its historical record of DLR-90's original design; read
> [Cheat and Timebomb as buff-pile objects](cheat-and-timebomb-buffs.md) for what replaced it.

`RunState.timebombCharges` was a **count**, not a list of objects like `cheats`. A Cheat is an object
because a spend names a specific card and React needs a stable key for the slot it leaves; a charge
has no identity to spend by name — **the card it marks is the identity**, and that lives on
`RoundState.primedCards`. `startRun` seeded it to `0` and `advanceRun`'s existing spread carried
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
  case ShopItem.Timebomb: return { ...paid, timebombCharges: run.timebombCharges + 1 }
  case ShopItem.Heal:    return { ...paid, encounter: { … Math.min(maxPlayerHealth, …) … } }
}
```

A fourth item is now a compile error here rather than an item that quietly does whatever the last
branch happened to do. QA confirmed the fix in a real browser as well as in the type system: buying
a Heal at 9 of 10 health raises health and leaves the Timebomb count untouched.

> **DLR-132 rewrote the Cheat and Timebomb arms above, 2026-08-24.** Neither `addCheat` nor
> `cheats`/`timebombCharges` exists any longer. Both arms now mint a bronze `Buff` into the pile
> through a shared `withMintedBuff` helper (`case ShopItem.Cheat: return withMintedBuff(paid,
> cheatBuff(BuffTier.Bronze, run.nextBuffId))`, and the mirror for Timebomb). `SHOP_ITEMS` still does
> not list either `ShopItem` (DLR-116), so this branch has no reachable caller today — see
> [reachability-audit.md](../sim/reachability-audit.md) — but it is exercised directly by
> `run.shop.test.ts`.

**`refusalFor` needed no clause at all**, and that is the correct rule rather than an omission.
Timebomb falls through both item-specific guards to the coin check, because there is **no cap on
charges held** — coins are the only limiter. The Cheat's `SlotsFull` refusal exists because
`CHEAT_SLOT_COUNT` is a designed inversion-preserving cap, and nothing states an analogue here.
Adding one later is a config key, one `refusalFor` clause and one `PurchaseRefusal` code.

## The two tunables, both transcribed

| Key                     | Value | Unit                                         | Where it came from |
| ----------------------- | ----- | -------------------------------------------- | ------------------ |
| `TIMEBOMB_PRICE`         | `2`   | coins per purchase                           | `version-4-scope.md`'s own heading ("2 coins") — **transcribed** |
| `TIMEBOMB_QUARRY_DAMAGE` | `4`   | health, applied once, at the next trick's resolution | `version-4-scope.md`, which ties it to "one fight's worth of damage" and the shop's Heal — **transcribed** |
| `TIMEBOMB_PLAYER_DAMAGE` | `2`   | health, applied once, at the next trick's resolution | **the developer's choice, 2026-08-19 (DLR-91)** — halved because the player-side hit **also** forces the streak's cash-out |

**DLR-90 shipped ONE key, `TIMEBOMB_DAMAGE = 4`, applied to whichever side won.** DLR-91 replaced it
with the pair above, so **the hit is no longer symmetric**: 4 against the Quarry, 2 against the
player. Its own comment states the reason a shared key was rejected — "a single shared key is the bug
that type-checks, reads correctly, and pays the wrong side."

The price is twice `BLAST_GUARD_PRICE` because Timebomb is a guaranteed unconditional hit rather than
insurance against a risk. The Quarry's 4 reads on a scale the player already knows, and it is **equal
to `HEAL_HEALTH_RESTORED` by design but a separate key**, because the two are the same number for a
stated reason rather than the same value.

**No figure is written as a literal outside `config.ts`**, and the shop blurb interpolates the key
rather than quoting it — so re-tuning cannot leave a screen naming a number the engine no longer uses.
A Final-verification grep pins exactly that.

## Where the `timebomb` and `Timebomb` stems are each used, and why

`CardRank.Poison = 8` already exists, and it is an **ordinary card with no rule at all** — the-hunt.md
§1 records its name as actively misleading and an open question. A `primedCards` field sitting
beside `CardRank.Poison` would be a permanent reading trap in a codebase whose whole discipline is
stating each fact once, so **everything that is about the marker or the queue uses the `Timebomb` /
`timebomb` stem**: `primedCards`, `primeCard`, `pendingTimebomb`, `queueTimebomb`,
`TIMEBOMB_QUARRY_DAMAGE`.

**DLR-91 introduced the `Timebomb` stem alongside it, deliberately and for a different job.** The names
it added are about the *effect being paid* and the *item that insures against it*, not about the
marker: `timebombToPlayer` / `timebombToQuarry` / `blastGuarded` on `TrickFacts`, `blastGuardHeld` on
`RunState`, `ShopItem.BlastGuard`, `BLAST_GUARD_PRICE`. None of them is a card-membership list, so
none of them is confusable with `CardRank.Poison` at a call site. The line to hold is that one: **a
list of marked cards is never called `Timebomb…`**, and the forbidden-identifier grep below is what
holds it.

**User-facing copy says "primed" and "Blast Guard"**, because that is what the design doc and the
tickets call it and it reads better than "primed". A Final-verification grep
checks the specific forbidden identifiers (`primedCards`, `pendingTimebombs`, `TimebombTrick`,
`TimebombTarget`, `isPrimed`, `TimebombCard`, `TimebombStage`) rather than the word, so it cannot match
the legitimate copy or the card rank.

> **`pendingTimebombs` is now in `src/` anyway, introduced by DLR-101 and not caught.** It is the
> parameter name on `projectedDepletion` in `src/app/warCouncil/duelHealthBars.ts` and a local in
> `roundBars.ts`, and in both places it holds `encounter.pendingTimebomb` — a per-side damage record,
> not a card-membership list, so the confusion with `CardRank.Poison` the rule guards against is not
> actually present. The identifier is still on the forbidden list, and the grep did not run over
> `src/app/`, so this is a real gap between the rule as written and the rule as enforced. Either
> rename the two occurrences to `pendingTimebomb`, or narrow the rule to the case it is about — a
> list of marked cards. Recorded rather than fixed, because it is a naming decision.

## The queue has a readout now — DLR-101

Everything above describes a booking the player could not see. Until DLR-101 that was literally true:
**nothing on the felt showed a pending hit existed, who owed it, or how much it was for.** A session
on the second fight lost a primed trick cleanly, 4 damage was correctly booked against the Quarry,
the bar read 14/14, and the player concluded the mechanic was broken.

The readout is entirely downstream of this module — it derives from `pendingTimebomb` and stores
nothing — so **no part of this file's behaviour changed**. What exists now: the health bars carry
booked Timebomb as a distinguished standing heart on whichever side owes it, on **both** bars, and the
trick reveal that books a hit names the side and the amount. See
[the duel's health bars](../war-council-ui/duel-health-bars.md) for the derivation, the fifth heart
state, and the several things about it nobody has yet looked at.

**A held Blast Guard remains invisible during a fight**, which is now a sharper seam than it was:
the player can see Timebomb booked against them that a Guard they are holding may cancel, and nothing
says the Guard is there. See [Blast Guard](blast-guard.md).

> **A pre-existing failure in this area, not caused by the above.**
> `src/hunt/__tests__/timebomb.test.ts :: 'does NOT add a Cheat'` fails, and it failed **identically
> on the pre-DLR-101 tree** — confirmed by stashing that contract's diff and re-running. It asserts
> that buying an Timebomb charge leaves `cheats` an empty array. Nothing in DLR-101 touches
> `buyFromShop`, the shop, or `cheats`. It is recorded here because it sits in the timebomb area this
> file covers, and because an unattributed red test is the kind of thing a later ticket wastes a
> round rediscovering. Whose it is, is still open.

## Purity

Everything in this file is inside the lint-enforced no-React, no-DOM boundary on `src/hunt/**`. The
queue, its payment and the charge are all plain immutable transitions unit-testable with no renderer,
and `src/hunt/` still never imports `src/warCouncil/`. The `PlayerSide` → `DuelSide` crossing this
feature needs happens once, on the warCouncil side, in `streak.ts` — see
[the mark](../war-council/the-timebomb-mark.md).
