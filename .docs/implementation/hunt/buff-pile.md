Part of [Hunt](README.md).

DLR-105 gave the run a second object type owned across its whole life — `buffs.ts` is a new
standalone, pure module holding `Buff`, and it exists so Cheat, Timebomb, Shield, and every
slot-machine-drawn templated card can become interchangeable objects the rest of the system draws,
activates, and persists identically, instead of three (and counting) bespoke mechanics. This
ticket ships only the type and the pile's persistence; nothing yet draws, activates, or renders a
buff.

**`Buff` had four fields as DLR-105 shipped it, and the fourth is the one that ticket's own risk
note singled out.** (DLR-107 later added a fifth, `kind` — the identity field described in
[Cheat and Timebomb as buff-pile objects](cheat-and-timebomb-buffs.md). The four below are
unchanged by it.)
`id` (`BuffId`, minted from `RunState.nextBuffId`, never `Math.random()` — `src/hunt/` must stay
deterministic, exactly as `CheatCardId` already is) and `tier` (`BuffTier`, `bronze`/`silver`/`gold`)
are unremarkable. `condition` (`BuffCondition`, `{ kind: string }`) is data only — no evaluator,
since AC4 defers activation logic to a later ticket, and `kind` stays an open string because the
real condition catalog (design doc §5) is explicitly "TO BE REVIEWED, not committed." `reward`
(`BuffReward`, `{ axis: BuffRewardAxis, value: number }`) is the field the acceptance criteria
themselves flag as the risk to get right: a tier does not always scale the same quantity — the
design doc's worked Bells example scales a flat damage `magnitude` (+1/+3/+5), Cheat scales
`durationTricks` (how many tricks the follow-suit break lasts), and Shield scales `heartCount` (a
count of blue hearts). `BuffRewardAxis` is a **closed three-value union** naming exactly those three
axes, rather than a fixed "damage" field on `Buff` itself — closing the union now, rather than
leaving it an open string like `BuffCondition.kind`, is deliberate: this is exactly what AC1's own
risk note asks to be reviewed before the ticket is marked done, so it is reviewed by being made a
type the compiler enforces rather than a convention a later ticket might drift from. A fourth axis
is a type change for whichever later ticket needs it.

**`BuffReward` models one axis/value pair, not a list.** The design doc's own §5 flags stacking two
reward templates on one tier as itself an open question ("whether tiers should stack _two_ reward
templates rather than scale one is itself an open question") — closing that question here, ahead of
any ticket that actually needs a stacked reward, would have been inventing an answer this module has
no authority to give.

**The starting pile's content is deliberately inert, not a preview of the real catalog.**
`UNASSIGNED_BUFF_CONDITION` (`{ kind: 'unassigned' }`) and `UNASSIGNED_BUFF_REWARD` (`{ axis:
magnitude, value: 0 }`) fill every buff `seedStartingBuffPile` mints. The real card catalog — which
condition/reward pairings actually exist, at what magnitudes — is explicitly deferred to DLR-103's
T7a, a design-only ticket, and since nothing in this ticket reads or evaluates a buff's
`condition`/`reward` (AC4), there was nothing this ticket could correctly guess at. The two constants
are exported so the seed function and its own test share one literal rather than each hard-coding a
copy that could drift.

> **T7a landed on 2026-08-23 (DLR-111), and the placeholder content is still correct.** The v1
> catalog is now authored — 78 named, AP-costed card templates at
> `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md`. Nothing in `src/` reads it yet,
> so `seedStartingBuffPile` still mints `UNASSIGNED_BUFF_CONDITION`/`UNASSIGNED_BUFF_REWARD` and
> that remains the right content for a pile with no consumer. What the list changes is that the
> shape gaps are now known rather than open: `BuffKind` needs one member per template family,
> `BuffRewardAxis` needs eight more axes, `Buff` needs an `apCost` field it does not have, and
> `BuffCondition`'s payload-free `{ kind: string }` cannot express the suit- and rank-parameterised
> families without an optional `target`. Those four are DLR-108's and DLR-112's to close.
>
> **DLR-108 closed all four on 2026-08-23.** `BuffKind` now carries 19 members, `BuffRewardAxis` 11,
> `BuffCondition` an optional `target`, and the AP cost has a home — as a **derived lookup**
> (`apCostOf`) over two retunable tables rather than as a field on `Buff`, which is the shape the
> list itself recommended. The pile's _content_ is unaffected: `seedStartingBuffPile` still mints
> `UNASSIGNED_BUFF_CONDITION`/`UNASSIGNED_BUFF_REWARD`, because nothing draws a real card into it
> yet (DLR-112's). See
> [Buff activation and the tiered AP costs](buff-activation-and-ap-costs.md).

> **DLR-124 added a fifth gap on 2026-08-23, and it is state rather than shape.** The hand-wide
> stacking rule — what happens when several equipped buffs fire on the same trick — is now decided
> and argued at `hybrid-design.md` §5 → _Resolving several buffs on one trick_. Resolving it needs a
> **per-hand accrual** (`multiplierBonus`, `flatDamageBonus`, `coinBonus`, `apRefunded`), each
> clamped at its own cap. That is **state on the hand, not a field on `Buff`** — the same distinction
> this note already draws for `apCost` — and it **resets per hand and NOT on a hit**, which is the
> rule's whole containment mechanism. It belongs in `src/hunt/**` behind the existing pure-core
> boundary, alongside the four cap constants (`MAX_REFUND_PER_HAND`, `MAX_MULTIPLIER_BONUS_PER_HAND`,
> `MAX_FLAT_DAMAGE_BONUS_PER_HAND`, `MAX_COIN_BONUS_PER_HAND`) that DLR-108 must create in
> `config.ts`. Still no reader in `src/`, so the placeholder content above is unaffected.
>
> **DLR-108 built it, and put the four constants in `src/hunt/apConfig.ts` rather than `config.ts`
> — a difference of file, not of reach**: `config.ts` re-exports all four, so every consumer and
> `index.ts` see them exactly where this note said they would be. The split happened because
> `config.ts` had reached its 400-line blocking budget. `BuffBonusAccrual` lives in
> `src/hunt/buffAccrual.ts`, and the reset-per-hand-**not**-on-a-hit asymmetry survived intact:
> `startHandAccrual()` is the module's only exported reset, and no per-hit reset function was
> written at all. Still no reader in `src/`.

**The pile is carried through `advanceRun`/`recordEncounter` with no explicit parameter, following
`whetstones` rather than `cheats`.** `cheats` is an explicit, required parameter to `recordEncounter`
because a hand can spend a Cheat mid-fight and must hand the survivor back; `whetstones` needs no
such parameter because nothing spends or replaces one mid-hand, so it simply survives whatever
`{ ...run, ... }` spread `advanceRun` and `recordEncounter` already build. `buffs`/`nextBuffId`
follow `whetstones`'s shape for the same reason: no consumer in this ticket (or any ticket before
T5's buff activation) touches a buff mid-hand, so there is nothing yet for a hand to hand back.
`seedStartingBuffPile(count, firstId)` mirrors `grantCheats`'s `(count, firstId)` shape but carries
**no upper-bound throw** — unlike `CHEAT_SLOT_COUNT`, nothing in this ticket's scope, the design
doc's §3, or its §8 states a capacity cap on the buff pile. §8 calls it "a growing pool." Whether one
is wanted later is an open question for whichever ticket first lets the pile grow past this seed
(most likely T5 or T8) — adding one then is a config key plus a throw in that function, the same
shape `CHEAT_SLOT_COUNT`'s cap already takes in `cheats.ts`.

`STARTING_BUFF_COUNT = 4` (`config.ts`) is **transcribed**, not chosen here — both the ticket's AC3
and design doc §8 state the figure explicitly ("a fresh run starts with 4 buff cards already in the
player's pile... all four arrive at bronze"), the same way `RUN_STARTING_CHEATS` and most of this
module's shop prices are transcribed rather than invented.

**Nothing here has a consumer yet, and that is the whole of this ticket's scope.** No component,
hook, or reducer reads `RunState.buffs`; no function evaluates a `BuffCondition` against play state
or applies a `BuffReward`; no slot machine exists to draw a real card into the pile. Cheat/Timebomb's
migration onto this pile, Shield's redesign onto it, and the slot-machine draw are three separate,
later tickets (DLR-103's T4, T7, T8) — this ticket is exactly what it says it is: the type, and the
owned-pile persistence, and nothing else.

**Since DLR-107, T4 has partly landed and this paragraph needs one correction.** Cheat and Timebomb
now have a `Buff` representation and their tier tables — but still no consumer: nothing evaluates a
condition, applies a reward, or reads the pile. The felt continues to drive the old bespoke Cheat and
Timebomb state machines, so the two mechanics currently exist twice over. See
[Cheat and Timebomb as buff-pile objects](cheat-and-timebomb-buffs.md) for why that duplication is
deliberate and what ends it.
