Part of [the headless run simulator](README.md).

# The policy seam, the two policies, and why every printed number depends on them

`SimPolicy` (`types.ts`) is *who is at the controls*. It is the only place the simulator decides
anything, and every figure `npm run sim` prints is conditional on which implementation was passed —
which is why both shipped policies write their behaviour out in full in their own module docblock
rather than leaving it to be read off the code.

## Three required methods, and three optional ones

| Method | Required? | Asked when |
|---|---|---|
| `chooseCard(round)` | yes | the driver's `canAct` branch, once per card played |
| `chooseBuffs(ui)` | yes | each between-tricks window |
| `nextShopAction(run)` | yes | repeatedly during a shop visit, until it answers `null` |
| `chooseDiscard(ui)` | **no** | the first between-tricks window of a hand, before the buffs |
| `wantsCheatPlay(ui)` | **no** | the `canAct` branch, before `chooseCard` |
| `wantsApplyPot(ui)` | **no** | the resolution screen, and only when it offers a real choice |

`wantsApplyDamage` was required until DLR-156, which deleted the button it answered for.
**`wantsApplyPot` replaced it and is optional**, for the reason the paragraph below gives.

The two optional methods were added by DLR-120 and are optional **on purpose**. Making either
required would force `baselinePolicy` to implement a refusal, and that changes what its printed
figures *mean* while changing none of them: its docblock's claim would go from "this player does not
consider discarding" to "this player considers discarding and declines", which are different
statements about the same numbers. Keeping them optional is what lets the baseline's output stay
byte-identical to the figures recorded before the seam widened — verified, and it does.

If a third policy needs a third lever, add it optional too. **DLR-156 added the third**:
`wantsApplyPot` is asked only when the resolution screen offers a real choice — a hurt trick's only
exit is `RollOver`/"Onward", so the policy is never asked on that branch, matching the screen's own
gate.

> **The modelling default when no policy answers is: apply whenever a pot stands, and never push.**
> That is the lowest-variance strategy the apply-or-roll choice admits, and it is deliberately **not
> a claim about optimal play** — the whole point of the roll-over mechanic is the push a never-apply
> floor cannot see. It is a modelling decision routed to the developer, not a rule of the game. It
> exists because a review pass found the driver dispatching `CarryOn` directly, which left
> `ui.resolution` open and unconsumed: since a resolution's `cashOut` is now unconditionally zero,
> the Quarry could take **no pot damage at all on any seed**. With the choice wired, the simulator
> averages 4.45 damage per hand and 1.5 fights won per run.

## Every answer is advisory

The driver never trusts a policy. Before dispatching anything it re-asks the engine's own refusal
predicate — `loadoutRefusalFor`, `discardRefusalFor`, `hasCheat`,
`refusalFor`, `slotPullRefusalFor`, `flaskRefusalFor` — and silently skips a refused action. A
policy therefore cannot make the driver throw, so a carelessly written future policy cannot crash a
measurement batch. It also cannot cheat: a policy that names an illegal card, a Cheat it does not
hold, or a discard it cannot afford simply does not get it.

Both new levers extend that discipline to multi-step rituals, which is the part worth understanding.

### `runDiscard` — open, select, commit, and never leave it half-open

`runDiscard` (`playHandWindows.ts`, split out of `playHand.ts` by DLR-145) drives the same three-stage interaction a player performs: `TapDiscard`
opens the selection, one `TapCard` per card toggles it in (capped at `MAX_CARDS_PER_DISCARD`), and a
second `TapDiscard` commits the swap and spends a budget charge. It re-asks `discardRefusalFor`
before opening *and* again before committing, because the second call is what catches an empty
selection — `DiscardRefusal.EmptySelection` only fires once the selection is open.

Every path that cannot commit dispatches `CancelDiscard` before returning. That matters more than it
looks: an open `discardSelection` **reinterprets the next hand-card tap** as a selection toggle
rather than a card play, so a leaked selection would silently corrupt the next card commit and would
read as a card-play bug rather than a driver bug. `committed` is reported by re-reading
`discardSelecting`, not by assuming the dispatch worked.

It runs **before** the buff window of the same trick, because `discardStock` and
`buffActivationStock` read the same `discardWindowOpen` predicate — there is no second timing gate —
and because a swap changes the hand the buff decision is then made against.

### `runCheatPlay` — arm, play, and count only what was actually spent

> **DLR-132 replaced this mechanism, 2026-08-24.** `TapCheat`, `CancelCheat` and the `ui.cheats`
> array are deleted — a Cheat is an ordinary buff row now. The paragraphs below are DLR-90/DLR-96's
> original record; the corrected route follows them.

`runCheatPlay` (`playHandWindows.ts` since DLR-145) dispatched `TapCheat` twice to poise then arm, then `TapCard` twice to
arm and commit the card the policy named. A `CheatPlay` names the Cheat **and** the card together,
deliberately: arming a Cheat and then playing a card that was follow-suit-legal anyway spends the
card for nothing, which would report the Cheat as *harmful* rather than as unexercised.

It counted a Cheat as spent by comparing `ui.cheats.length` before and after. That proxy was sound
rather than convenient: `commitHandlers.ts`'s `commit` reached `removeCheat` only past its `!ok`
early return, and a Fox or Woodcutter's second tap routed to a `prompt` instead of committing — so
the length was unchanged in **both** the rejected case and the opened-a-prompt case, which are
exactly the two cases that must not be counted. When the play did not commit, the Cheat was given
back with `CancelCheat` and any armed card or open prompt was then cleared with `CancelSelection`.

**Since DLR-132**, the policy opens the loadout (`ToggleLoadout`), finds the row
(`offeredBuffs(ui).find((b) => b.kind === BuffKind.Cheat)`), taps it twice (`TapBuff` × 2) to spend
it, then plays the card through the ordinary `TapCard` × 2 commit. The *decision* the policy makes —
arm only where lifting follow-suit widens the legal set — is unchanged; only the dispatch mechanism
moved, because there is no longer a poise-then-cancel Cheat state to race against.

## `baselinePolicy` — the reference player

Read `baselinePolicy.ts`'s docblock before reading any number this tool prints. In brief:

- **Cards** — `chooseCpuMove` seated on the player's side, the engine's own opponent heuristic.
- **Buffs** — activated cheapest-AP-first at every between-tricks window, while the pool would still
  cover the Apply Damage press's AP cost (deleted by DLR-156 with the button). The sort tiebreaks on `buff.id`, which is monotonic and never
  reused, so the ordering is total.
- **Apply Damage** — pressed when the multiplier reaches `BASELINE_CASH_AT_MULTIPLIER` (3), or on the
  hand's last window with a non-empty bank. **"The hand's last window" is `HAND_SIZE -
  tricksPlayed <= 1` since DLR-146**, and the change matters more than it reads: it used to be
  `hands[Player].length <= 1`, a *proxy* for the same thing that silently stops firing at any hand
  floor above 1. Left alone, the reference player would have quietly stopped banking at every hand's
  end — corrupting the very runs the floor was to be judged by. The new expression is identical at a
  floor of `0` (both mean five or six tricks played) and floor-invariant thereafter.
  `cardAwarePolicy.ts` compares `deadCards.length` to `hand.length` and assumes nothing about tricks
  remaining, so it needed no equivalent change.
- **Never** discards, marks a Timebomb, or arms a Cheat — it implements neither optional method.
- **Shop** — free pulls, then Heal → Swan tier → Witch tier while affordable, then the
  flask.

`BASELINE_CASH_AT_MULTIPLIER` is a **policy** parameter, not a game tunable. It deliberately does not
live in `src/hunt/config.ts`, and it is the single knob with the most leverage over the printed
damage figures.

## `maximalistPolicy` — the same player, pulling every lever a run actually grants

Added by DLR-120 to answer one question: are the levers the player *does* have the missing
ingredient? Its `chooseCard`, `chooseBuffs` and `nextShopAction` are
`baselinePolicy`'s **by reference** — asserted in `baselinePolicy.test.ts`, not merely described — so
any difference in the printed figures is attributable to the levers alone and never to card play.

- **Discard** — once per hand, on the first open between-tricks window, the lowest-ranked
  `MAX_CARDS_PER_DISCARD` cards, while `discardsRemaining > 0`. Discarding at *every* window would
  spend the fight's whole `DISCARDS_PER_FIGHT` budget inside hand one, which measures the budget
  rather than exercising the swap. The sort is total on `(rank, suit)` so no tie can resolve
  differently between runs.
- **Cheat** — the run's one starting Cheat (`RUN_STARTING_CHEATS`), armed **only** where lifting
  follow-suit strictly widens the legal set, then playing the highest-ranked card the widening
  admits. Fox and Woodcutter are excluded, because both open an `AbilityChoice` prompt and the driver
  answers a prompt from `chooseCpuMove`'s choice for a *different* card.

Every threshold in that description is an existing configuration constant read by name. The policy
introduces no number of its own.

> **The Cheat lever stopped being singular on 2026-08-25 — DLR-135.** A run's opening pile is now a
> real weighted draw from `BUFF_TEMPLATES`, and **Cheat is an eligible draw**, so a run can open
> holding more than the one `RUN_STARTING_CHEATS` guarantees. The policy is unchanged and needs no
> edit — it arms whatever Cheats the pile holds — but "exactly 1.00 Cheats" below is a figure from
> before that draw existed, not an invariant. The value of `RUN_STARTING_CHEATS` itself is untouched
> at **1**.

**The measured answer, at 200 runs across four seeds: no.** Both levers fire on every run — about 4
discards and exactly 1.00 Cheats — and the per-hand exchange moves by roughly 0.02 damage. That is a
useful negative result: it says the missing piece is the system the player cannot reach, not the
levers they already hold. See [the reachability audit](reachability-audit.md).
