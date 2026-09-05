# Unity port — code architecture

**What this document is.** The shape the Unity project should be built in: which assemblies exist,
what may reference what, where each fact lives, and which of the prototype's structures survive the
crossing unchanged. It is about **code**, never about rules — `.docs/game_rules/the-hunt.md` owns the
rules, `feature-inventory-for-the-port.md` owns what exists, and
`structure-notes-for-the-port.md` owns the four shortcuts the prototype took deliberately. This file
answers only "how should the Unity code be laid out."

**Written against Unity 6 LTS.** Two facts move under this document and should be re-checked rather
than trusted: Unity 6.8 removes Mono and makes CoreCLR/.NET 10 the only target, and Fast Enter Play
Mode becomes mandatory at 6.8 — after which **static state no longer resets between Play sessions**.
Everything below is written to be correct on both runtimes. **No Unity API signature in this document
was resolved against `docs.unity3d.com`** — none is written out in full, deliberately. Resolve any
API against the docs for the project's actual editor version before the first line of C# is written.

**Vocabulary.** This document uses the **port's** names (Shade, Charm, the Wake, the Cairn, Raven /
Salmon / Hound, Oathbreak, Surge, the Omen), because they are the names the Unity code must carry.
Where it points at a prototype file it uses the prototype's names, because that is what is on disk.
The no-leakage rule in the feature inventory — no `buff`, `Quarry`, `Hunt`, `Bell`, `WarCouncil`,
`Cheat`, `Momentum`, `Vault`, `flask`, `Moon`, `Key`, `decree` anywhere in the Unity project, in any
casing — is an **architectural constraint here**, not a copy pass at the end. It decides assembly
names, namespaces, asset filenames and serialised field names, all of which are bound by string and
none of which a compiler will catch later.

---

## 1. The shape in one paragraph

**A pure C# rules core that does not know Unity exists, a folder of ScriptableObject assets that
feeds it data, a set of pure view-model functions that turn its state into something drawable, and a
thin layer of MonoBehaviours that draw and animate that.** The prototype already has three of those
four layers — `src/warCouncil/` and `src/hunt/` are the rules core, `src/app/*/…Model.ts` are the
view models, and the React components are the thin layer. The port's job is to make the boundaries
that are currently conventions into **assembly boundaries the compiler enforces**, and to move the
data that is currently hardcoded into assets.

---

## 2. Assemblies

Seven assembly definitions. The reference arrows are the whole architecture; everything else follows
from them.

| Assembly | References `UnityEngine`? | May reference | Holds |
| --- | --- | --- | --- |
| `TechDuinn.Table` | **No** | — | Cards, suits, ranks, the deal, legal moves, trick resolution, the draw pile and its reshuffle, the Shade's card choice, the four outcomes, the pot arithmetic |
| `TechDuinn.Passage` | **No** | `Table` | The run: charms, the Cairn's grants, the shop, Dagda's Cauldron, health, coins, the opponent ladder, the fight boundary and what survives it |
| `TechDuinn.Presentation` | **No** | `Table`, `Passage` | View models — pure functions from rules state to what a screen shows: lit cards, per-card damage readouts, refusal wording, the resolution beat list, screen routing |
| `TechDuinn.Data` | Yes | `Table`, `Passage` | ScriptableObject definitions and the mapping from an asset to the plain rules value it produces |
| `TechDuinn.Persistence` | Yes | `Table`, `Passage` | The save envelope, the key composer, the one class that touches the filesystem |
| `TechDuinn.Game` | Yes | all of the above | MonoBehaviours, prefabs, input, animation, audio, scene wiring, the composition root |
| `TechDuinn.Simulation` | **No** | `Table`, `Passage` | The headless run simulator and its policies |

Four rules make these worth having:

- **`Table` and `Passage` compile with no `UnityEngine` reference at all.** That is what makes every
  rule unit-testable without entering Play mode, what lets the simulator run tens of thousands of
  runs in a console process, and what makes it structurally impossible for a `MonoBehaviour`, a
  `Transform` or a `ScriptableObject` to end up inside a rule. The prototype achieves the same thing
  with an ESLint rule; an assembly definition is the version that cannot be turned off.
- **`Passage` references `Table`, never the reverse.** The prototype has this edge and pays a real
  price for it: `src/hunt/` cannot import `src/warCouncil/`, so it declares its **own duplicate suit
  enum** (`BuffTargetSuit`, pinned to `Suit` by a test rather than by the compiler). One assembly
  pair with one direction of reference removes the duplicate outright — there is one `Suit` in the
  port, in `Table`, and `Passage` uses it.
- **Nothing references `Data`.** Definition assets flow *into* the rules as plain values; a rule
  never holds a `ScriptableObject`. §4 says how.
- **`Presentation` is engine-free too.** This is the non-obvious one and it is worth the discipline:
  every "which cards light up", "what does this card pay if it wins", "why is this button greyed out"
  question is answered by a pure function with a unit test, and the MonoBehaviour only positions
  things. The prototype proves the pattern works at scale — `roundUiState.ts`,
  `buffBreakdownModel.ts`, `cardDamage.ts`, `armingSurfaceModel.ts` are exactly this and are all
  tested without rendering anything.

### 2.1 The four engine-free assemblies should also build without Unity at all

A consequence of the split that is worth deliberately designing for, because it changes the
day-to-day loop more than anything else in this document.

`Table`, `Passage`, `Presentation` and `Simulation` reference nothing but .NET. That means they can
carry an ordinary `.csproj` **alongside** their `.asmdef`, pointed at the same source folders — so
the same code is a Unity assembly when the editor opens it and a plain class library when
`dotnet test` does.

What that buys:

- **The rules test suite runs in seconds, with no Unity install and no licence.** Unity's own test
  runner needs a full editor launch and a domain reload per run; a `dotnet test` over four
  dependency-free assemblies is nearly instant. Given the prototype has 139 test files and this
  project's workflow leans hard on an automated plan-and-verify loop, that difference compounds every
  single day.
- **CI is trivial** — no Unity licence in the pipeline for the part of the codebase that holds all
  the rules.
- **The balance simulator is a console app for free**, which §12 wants anyway.

The cost is keeping two project files listing the same folders, which is a one-time setup and a rule
in the checklist. Worth it. **Unity still owns the build**; the `.csproj` exists only to compile and
test, and nothing about it may leak into how the game ships.

**Nullable reference types on per assembly, starting with `Table`, `Passage`, `Presentation` and
`Simulation`.** Those four have no Unity serializer assigning their fields, so nullable annotations
tell the truth there. Leave it off in `Data` and `Game`, where a `[SerializeField]` the Inspector
never filled is null while the compiler believes it cannot be.

---

## 3. The single biggest fix: one owner for run state

**What the prototype does.** `RunState` lives in `App.tsx`'s `useState`. The fight screen runs a
separate reducer whose `RoundUiState` carries **flattened copies** of eight run figures —
`baseDamageBonus`, `discardsRemaining`, `discardCapBonus`, `treasureDamageBonus`, `rankTiers`,
`coins`, `buffs`, `streak` — mutates them during the fight, and a `useEffect` copies the results back
out through `recordEncounter` when the fight ends. Two objects hold the same facts, and a third
function reconciles them.

That was a reasonable shape for React: the felt is one component subtree and a reducer is how you
give a subtree local state. It is the wrong shape for the port, and it is the single most expensive
thing to leave in place, because every new run figure is three edits — the run state, the copy, and
the reconciliation — and forgetting the third is silent.

**What the port does.** One plain C# object owns the run, and the fight reads and writes it directly.

```csharp
// TechDuinn.Passage
public sealed class RunSession
{
    public RunState State { get; private set; }

    public void Apply(IRunCommand command) => State = command.Execute(State);
}
```

The fight is a **view over `RunState`**, not a copy of parts of it. The felt's own ephemeral state —
which card is armed, which charm is poised, whether the swap selection is open, which trick is being
shown on the resolution screen — is genuinely fight-local and stays in a `FightUiState` beside it;
that is the half of `RoundUiState` that was always correct. The half that duplicated run figures goes
away, and `recordEncounter`'s reconciliation goes away with it.

This fix has a second beneficiary that is easy to miss: **the simulator**. See §12.

**Keep the immutability.** `RunState` and `RoundState` are immutable records in the prototype and
should be `record` types in C#, updated with `with`. This is not a per-frame path — a trick resolves
when the player taps a card, not sixty times a second — so the allocation is irrelevant and the
guarantee is worth a great deal: state can be snapshotted, diffed for the animation layer, replayed
by the simulator, and compared in a test with one `==`. **Do not carry allocation-free discipline
into the rules layer.** Spend it in the animation and layout code, which is where the frames actually
go.

---

## 4. Charms — the class you were describing

This is the part of the prototype most worth rebuilding rather than translating. A charm is one card
with one condition and one reward, and the prototype answers **ten separate questions about it in
eight different files**:

| Question about a charm | Where the prototype answers it |
| --- | --- |
| Which card is it | `BuffKind` in `src/hunt/buffs.ts` |
| When does its condition fire | a `switch` case in `buffEvaluation.ts`'s `buffFires` |
| How often may it fire | `BUFF_CADENCE` table in `buffs.ts` |
| What does it pay at each tier | `REWARD_TIER_VALUE` in `buffTemplates.ts`, `REWARD_BASE` in `buffCosts.ts` |
| When may the player activate it | `buff.kind === BuffKind.Cheat ? … : …` in `roundUiState.ts` |
| Is it consumed when used | `ACTIVATED_CARD_SINGLE_USE` / `CONDITION_CARD_SINGLE_USE` in `consumables.ts` |
| Can it be taken back off the trick | the `REVOCABLE_BUFF_KINDS` set in `buffActivation.ts` |
| Can the Cauldron mint it | two narrowed type unions in `buffTemplates.ts` |
| How rare is it | `SLOT_FAMILY_WEIGHTS × SLOT_AXIS_WEIGHTS` in `slotWeights.ts` |
| What is it priced at | `CONDITION_MODIFIER` in `buffCosts.ts` |

Adding a charm today means finding all ten. At nineteen templates that is annoying; at seventy it is
the reason nobody adds one.

### 4.1 The split you need: definition versus instance

Two types, and getting this boundary right is most of the work.

```csharp
// TechDuinn.Data — an ASSET. One per card in the game. Authored in the Inspector. READ-ONLY.
[CreateAssetMenu(menuName = "Tech Duinn/Charm")]
public sealed class CharmDefinition : ScriptableObject
{
    [SerializeField] private string _id;              // persisted in the Cairn — frozen once shipped
    [SerializeField] private string _displayName;
    [SerializeField] private Sprite _face;
    [SerializeReference] private CharmCondition _condition;
    [SerializeField] private CharmReward _reward;      // axis + the bronze/silver/gold ladder
    [SerializeField] private ActivationWindow _window; // BetweenTricks | AnyPlayableMoment | ShopOnly
    [SerializeField] private bool _consumedOnUse;
    [SerializeField] private bool _retractable;
    [SerializeField] private float _rarityWeight;
    // …
}
```

```csharp
// TechDuinn.Passage — RUNTIME STATE. One per card the player actually owns. Immutable.
public readonly record struct Charm(int Id, CharmSpec Spec, CharmTier Tier);
```

**`CharmSpec` is the plain-C# projection of `CharmDefinition`.** `Passage` cannot reference `Data`,
so `Data` maps each asset to a `CharmSpec` once at load and hands that to the rules. That indirection
is not ceremony — it is the thing that stops a `ScriptableObject` reference from reaching a rule, a
save file, or the simulator, all three of which must work with no editor and no asset database.

**Never mutate a `CharmDefinition` at runtime.** It is an asset: the write persists in the editor and
vanishes in a build. Every mutable fact about a card the player holds lives on the `Charm` instance.

### 4.2 The condition is a small object, not a switch case

`buffFires` is one `switch` over every condition family. It works, and it is exhaustively typed so a
new family fails to compile — which is genuinely good and is why it survived this long. But it means
a new condition is an edit to a central file, and a designer cannot author one at all.

```csharp
// TechDuinn.Table — [Serializable] is System.SerializableAttribute, NOT UnityEngine.
// So these classes live in the engine-free assembly and Unity can still serialize them.
[Serializable]
public abstract class CharmCondition
{
    public abstract bool Fires(in TrickContext ctx);
}

[Serializable]
public sealed class WentHighInSuit : CharmCondition
{
    [SerializeField] private Suit _suit;
    [SerializeField] private bool _ignoresSuit;   // a wildcard was spent on this card

    public override bool Fires(in TrickContext ctx) =>
        ctx.PlayerWentHigh && (_ignoresSuit || ctx.PlayerSuits.Contains(_suit));
}
```

`[SerializeReference]` on the definition's field is what lets the Inspector hold *any* subclass, so a
new condition is a new class plus a new asset and **nothing central changes**. Two things to know
about it before committing: it stores the type by assembly-qualified name, so renaming or moving a
condition class breaks every asset referencing it unless the class carries a `MovedFrom` attribute;
and it is 2019.3+, so it is safe on Unity 6 but confirm the attribute's exact namespace against the
docs before use.

**Keep the prototype's `TrickContext`.** `BuffTrickContext` in `buffEvaluation.ts` is a flat bag of
plain values — did the player go high, was there a skull, which suits did they play, what is the
health — deliberately containing no `RoundState` and no `Card`. That is what makes conditions
trivially testable and what stops a condition reaching into state it has no business reading. Port it
field for field, as a `readonly record struct` passed by `in`.

### 4.3 The three properties that must not become one category

Structure note 3 is the load-bearing warning here. Oathbreak and the wildcard differ from a condition
card in three independent ways — when they may be activated, whether they are consumed, whether they
can be taken back off the trick — and the prototype answers each by naming the card. It is tempting
to collapse all three into `isUtilityCard`, because so far every card that answers one answers all
three the same way.

**Three fields, not one flag.** The moment one card wants a between-tricks activation that is still
consumed, or a mid-trick activation that can be withdrawn, a category is a lie and every reader of it
has to be found and unpicked. Grouping charms for the *player* — a charm shelf and a utility shelf in
the shop — is presentation and can be a tag on the definition. It must not be what the rules read.

### 4.4 Rarity gets a number; tier stays separate

Today a card's frequency is the product of a family weight and a reward-axis weight from two tables,
and nothing on the card says how rare it is. Put **one `rarityWeight` on the definition** and let a
machine or a drop table *scale* it rather than compose it.

**Tier stays a separate axis and is still decided at draw time by the reel-match rules.** A gold
Oathbreak breaking follow-suit for three tricks where a bronze one breaks it for one is a *power*
difference, not a *rarity* difference. Collapsing them loses the ability to have a common card that
is strong at gold, which the design wants.

The thing the prototype has no answer to at all: the distribution never moves as a run progresses,
and the design intends early access to silver and gold to make an early Shade a formality. Whatever
carries that — a per-fight weight table, a progress multiplier on each card's weight — is a port
decision, and it wants the per-card number to exist first.

### 4.5 Keep the two-reader discipline

One thing the prototype gets right that a data-driven rewrite can easily lose.
`buffActivationWindowOpen` has exactly two callers — the greyed-out state of the row, and the commit
— **precisely so the two cannot disagree**, and `activateBuff` re-checks the window itself and throws
on a refusal, so a caller that asked one question at the disable and a different one at the commit
surfaces as a thrown exception rather than a silent mis-play.

Carry that. A data-driven definition read by three call sites asking three slightly different
questions is worse than the hardcoded check it replaced. **One predicate per question, every caller
through it, and the commit path re-asserts.**

### 4.6 A charm can exist that no definition describes

This is the constraint that breaks the naive "a `Charm` is just a pointer to a `CharmDefinition`"
model, and it is worth getting right before any asset is authored.

Two run-time transformations mint charms the Cauldron cannot deal:

- **Combining.** Two identical cards at the same tier merge into one of the next tier. That is fine
  — the tier is already on the instance.
- **Spending a wildcard.** It strips a card's suit condition. The result is a card that **has no
  definition and never will** (`buffWild.ts`: "A wild card is mintable ONLY here and NEVER from a
  template"), deliberately, because a wild template in the draw pool would dilute every other card's
  weight and put an undealable card into two different draws.

So `Charm` must carry the condition it is *actually* being evaluated with, not only a reference to
the definition it came from. The cheap version — the one the prototype effectively uses — is a
`wild` flag the condition reads, which is what `_ignoresSuit` is in the sketch above. That works
while stripping the suit is the only transformation. **If a second transformation is ever wanted,
the instance should carry its own `CharmCondition`, cloned from the definition at mint time and
mutated on transformation**, and the definition becomes purely the authoring template. Decide which
of the two before authoring, because it changes the save shape.

**The wildcard also keeps the id it had.** The prototype does this deliberately so the run's id
counter does not advance on a spend and two runs on one seed stay identical. Carry that — it is a
determinism property, not tidiness.

### 4.7 Stacking needs a key, and the key is not the id

Identical copies gather into one counted pile in the charm grid and on the Manage Charms screen, and
combining operates on that pile. `buffCombineKey` composes a string from everything that makes two
cards the same card: the family, the target suit, the reward axis, the tier, and whether it is wild.

In C# a `readonly record struct` gives value equality for free, which is most of the way there — but
**the grouping key and equality are not the same question**. `buffCombineFamilyKey` exists beside
`buffCombineKey` because the screen groups by family *across* tiers while combining matches within
one. Port both, as explicit key methods on `Charm`, and never let a screen invent its own grouping
by concatenating fields inline.

---

## 5. The rest of the data that stops being code

Same treatment, lower stakes. Each of these is a table in a `.ts` file today and should be an asset
the designer edits:

| Fact | Prototype home | Port shape |
| --- | --- | --- |
| The 25 opponents — name, health, ordinary or boss | `ORDINARY_OPPONENT_NAMES`, `STAGE_BOSS_NAMES`, the health formula in `config.ts` | One `OpponentDefinition` asset each, ordered by a `RunLadder` asset. The formula becomes the *default* the assets were generated from, not the source of truth — the design already wants per-opponent powers eventually |
| Skull weighting by rank | `skullWeights.ts` — one live curve, three built and unwired | A curve on an opponent or difficulty asset. **Port one curve.** The other three are dead |
| Reel strip lean | `SLOT_FAMILY_WEIGHTS` / `SLOT_AXIS_WEIGHTS` | Per-card `rarityWeight`, plus a per-machine multiplier asset |
| Shop prices, heal amount, max-health price curve | `config.ts` constants | One `EconomyConfig` asset |
| Hand size, refill floor, skull density, swap budget, base damage | `config.ts` constants | One `WakeConfig` asset |
| Reward ladders per axis and tier | `REWARD_TIER_VALUE` | On the `CharmDefinition`, beside the axis it scales |

**Everything above stays a plain value inside `Table` / `Passage`.** The asset is the *authoring*
surface; the rules receive numbers. That is what keeps the simulator and the tests running with no
asset database loaded — they construct the config directly.

### 5.1 A shop item is the same shape as a charm, and has the same problem

`shop.ts` is the charm scatter in miniature, and it is worth fixing at the same time because the fix
is the one you will already have written.

A shop item today is an enum member (`ShopItem`), and everything about it is answered elsewhere by
naming it: `priceOf` is a switch, `refusalFor` is a switch, `categoryOf` is a switch, and
`SHOP_ITEMS_BY_CATEGORY` is a table whose categories are dead (the four shelves were removed). Adding
an item means finding all four.

There are only two live items — the heal and the max-health raise — so this is genuinely small today,
which is exactly why it is cheap to do properly now. **A `ShopItemDefinition` asset carrying its own
price rule, its own refusal predicate and its own effect** costs almost nothing at two items and is
the difference between a designer adding a shelf item and a programmer doing it.

One behaviour to carry over deliberately: **where more than one refusal is true, the shop names the
one that will still be true when the money arrives.** "You cannot afford this" is useless on an item
you also cannot use; the ordering is a deliberate rule, not an accident of evaluation order, and it
belongs on the definition rather than in a chain of `if`s.

---

## 6. The engine-to-view boundary: beats

The prototype's fight screen has 116 files, and a large share of them exist because the view has to
work out *what just happened* by comparing states. `resolutionBeats.ts` is the right idea already and
should be promoted to the formal boundary.

**Every rules call returns the new state plus an ordered list of beats.**

```csharp
public readonly record struct TrickResult(RoundState State, IReadOnlyList<Beat> Beats);
```

A beat is a small record: `CardPlayed`, `TrumpNamed`, `TrickTaken`, `CharmFired`, `PotBanked`,
`HealthLost`, `CardsDrawn`, `PileReshuffled`. The rules produce them; the presentation layer walks
them and plays an animation per beat; nothing in the view ever diffs two states to guess what
changed.

Four payoffs, all of which the prototype pays for the absence of: the animation sequence is data and
can be tested; the resolution screen's readout ("this was a Low Victory, these charms paid, these
paid nothing and here is what they needed") is the beat list rendered rather than a second derivation
of the rules; the simulator can assert on beats without rendering anything; and **audio and haptics
come free** — the prototype has no sound at all, and a beat list is exactly the hook a sound
designer needs, with no second pass over the rules to find the moments.

**Sequencing beats is `Awaitable`, not a coroutine.** A coroutine stops when its GameObject is
disabled; an async method does not — so every `await` in the sequencer carries
`destroyCancellationToken`, and the sequencer is the one place an `async void` entry point is
allowed, wrapped in `try`/`catch`. Resolve `Awaitable`'s members against the docs for the project's
editor version before writing it.

### 6.1 A preview is the real resolver run on a hypothetical — never a second calculation

This is the strongest single idea in the prototype and the easiest one to lose, because the
temptation to compute a readout in the UI script is enormous and it always works at first.

This game shows the player a great deal *before* they commit: two numbers under every card in hand
(the damage dealt if it wins, the damage taken if it loses), the per-card charm breakdown, the count
on each lit card, and the pot preview flashing on the Shade's health bar. Every one of those is a
statement about what the rules will do.

`cardDamage.ts` states the discipline in its own opening line: **it performs no damage arithmetic at
all.** It builds a hypothetical trick resolution, hands it to `applyResolution` — *the same fold the
real commit goes through* — and reads the health delta back off the returned encounter. Shield
absorption, the zero floor on health, and the rule that a hit destroys a payout due at the same
resolution are therefore **inherited, not restated**.

The docblock also records why the rule exists, which is worth more than the rule: an earlier preview
carried its own absorption arithmetic and previewed red hearts breaking that would actually have been
absorbed. It was correct-looking, tested, and wrong.

**In the port, no view model computes a game number.** It constructs a candidate state, calls the
same rules function the commit calls, and reads the answer. Two consequences worth planning for:

- **The rules must be cheap and side-effect-free enough to speculatively evaluate.** Six cards in
  hand × two branches each, re-run whenever the hand changes, is nothing — but only because
  resolution is a pure function over immutable records with no logging, no events fired, and no
  animation triggered. This is the real argument for §3's immutability, stronger than the tidiness
  one: **a mutable resolver cannot be used to preview itself.** If a beat is ever emitted as a side
  effect of resolving rather than returned from it, previewing silently starts firing sound cues.
- **A preview is tri-state, not a boolean.** While the player is leading, a skull the Shade has not
  played yet could flip the reading, so `projectBuffBranches` evaluates *both* readings and reports
  the charms whose answer is **indeterminate** separately from yes and no. The screen then marks
  those numbers as estimates. Model that third state in the port's preview types from the start —
  it is not a UI flourish, it is the honest answer, and retrofitting it means touching every readout.

---

## 7. A refusal is a value, never an exception

This is a pattern the prototype applies consistently and it is one of the best things in it. Every
rule that can say no returns *why*, as data, and the screen prints it:

- `playCard` returns `{ ok: false, reason: IllegalMoveReason }` — a discriminated union, not a throw.
- Activating a charm returns a `BuffActivationRefusal` code.
- Spending a wildcard returns a `WildRefusal`; combining returns a `CombineRefusal`.
- The shop's greyed buttons **carry their reason on their own face**, and where more than one
  refusal is true it names the one that will still be true when the money arrives.

Three consequences the port should keep deliberately:

1. **The refusal codes live in the rules assembly; the sentences live in `Presentation`.** The
   prototype is explicit about this — "a reason CODE, not a sentence". That split is what makes the
   rules testable without asserting on English, and it is what makes §13's string table possible.
2. **A disabled control is never removed.** The design's rule is that a button that cannot be used is
   greyed with its reason printed, so the player learns the rule rather than watching the UI change
   shape. That means every refusal code needs wording, and the compiler should force it: a
   `Record`-style exhaustive lookup keyed over the refusal enum, so a new refusal fails to build
   until someone writes its sentence.
3. **Exceptions are for bugs only.** `activateBuff` throws on a refusal *because a caller reaching it
   already asked and was told no* — the throw is a contract violation, not a player mistake. Keep
   that distinction sharp in C#: player input returns a result, broken invariants throw.

**Unity has no error boundary.** React gave the prototype a free net: `ErrorBoundary.tsx` catches a
render fault and shows a message instead of a white screen. Unity's nearest equivalent is an
uncaught exception in an `Update` that leaves the game in a half-drawn state with no notice. The port
needs a deliberate answer, and the prototype's `CpuFault` field is a good model — a corrupt Shade
turn is stored on the state and **shown, not swallowed**. Do the same: the beat sequencer and the
composition root catch, halt the fight cleanly, and surface a fault panel with the state dump.

---

## 8. One legality gate, three players

The human, the Shade's AI, and every simulator policy all reach the rules through the same door, and
none of them is trusted.

- `cpuPlayer.ts` chooses "only from `legalMoves()`'s own output, so this can never" produce an
  illegal move — and `playCard` re-checks anyway.
- Every `SimPolicy` method is **advisory**: the driver re-asks the refusal predicate, caps the
  selection, and cancels rather than committing something invalid.

**Port that contract explicitly**, as an interface both the AI and the policies implement, with the
legality check living in `Table`/`Passage` and running on every path. It is what lets you write a
dumb AI without fear, swap in a better one later, and use the simulator's policies as opponent
brains if a mode ever wants that. It also means there is exactly one definition of a legal move,
which is the thing a card game most easily gets wrong twice.

---

## 9. A card is a value, and skulls are a set of values

Easy to break in the crossing, expensive to discover afterwards.

In the prototype a `Card` is `{ suit, rank }` — a plain value with no identity. There are 33 of them
and they are all distinct, so value equality is exact. Everything downstream depends on this:
`sameCard`, `containsCard`, `removeCard`, and — critically — **the skull is not a field on the
card**. `RoundState` carries `skulledCards: readonly Card[]` and `cursedCards: readonly Card[]`, two
separate lists, and a card is skulled if it appears in one of them.

That is not an accident. The two lists are separate because "a skull dealt to the Shade, fixed for
the hand" and "a curse the player put on their own card, lasting one trick" behave completely
differently — one is written once by the deal, the other is written mid-hand and cleared at every
trick's resolution — and inside one list nothing could tell them apart, so nothing would know what to
lift.

**In Unity the trap is obvious and inviting: give the card view a `bool isSkulled`.** The moment a
card is a `MonoBehaviour` with mutable state, the two lists collapse into one flag, the curse stops
lapsing correctly, and cards that change hands stop carrying their skull.

The port's version:

- `readonly record struct Card(Suit Suit, int Rank)` in `Table` — value equality for free.
- The two lists stay two lists on the state, exactly as they are.
- **`CardView` is a pooled MonoBehaviour that is *shown* a `Card` and told how to draw it.** It holds
  no rules state, it is not the card, and it is recycled between hands.

---

## 10. Determinism and seeding

The prototype is deterministic end to end: a run seed, a per-deal seed derived from
(run, encounter, hand), and a `drawSeed` carried **inside `RoundState`** and re-mixed each time a
reshuffle consumes it. Every function takes its generator as an explicit parameter. That is why the
same run deals the same opening pile and the same reshuffle, and why the simulator can replay one
seed to explain a loss.

Carry it exactly, with one Unity-specific prohibition:

- **`UnityEngine.Random` is banned in `Table`, `Passage` and `Simulation`** — it is a global static,
  which means it is shared, order-dependent, and (once Fast Enter Play Mode is mandatory) not reset
  between Play sessions. Those assemblies cannot reference `UnityEngine` anyway, which is the
  enforcement.
- **`System.Random` is banned too**, in these assemblies. Its sequence is not contractually stable
  across .NET versions, and the Mono-to-CoreCLR cutover is exactly the event that would change it —
  silently, invalidating every recorded seed. Port the prototype's own small PRNG
  (`seededRng.ts`) as a `readonly record struct` with an explicit algorithm, so a seed recorded today
  reproduces after the cutover.
- **Seeds are values in state, never fields on a service.** `drawSeed` living on `RoundState` rather
  than in a closure is what makes the state serialisable and replayable; keep it there.

---

## 11. Persistence

`.claude/rules/save-data-versioning.md` carries across unchanged in substance. The Cairn is the only
thing saved.

- **One class touches storage.** In the prototype that is `browserStorage.ts`, and ESLint fails the
  build on any other file naming `localStorage`. In Unity the equivalent is a single
  `IStorageDriver` implementation inside `TechDuinn.Persistence`; nothing else opens a file.
- **Not `PlayerPrefs`.** It is the instinctive `localStorage` analogue and it is the wrong tool — on
  Windows it is the registry, with a size ceiling and no atomic write. Write JSON to
  `Application.persistentDataPath`, through a temp-file-then-move so a crash mid-write cannot leave a
  half-file.
- **Not `BinaryFormatter`, ever.** It is obsolete and absent from the surface Unity is moving to.
- **The `{ version, data }` envelope, stamped with a schema version, keyed by one composer.** A
  reader meeting a version it does not recognise returns its default and reports *why* — never a
  silent zero. The prototype's `SaveReadOutcome` enum is the right shape; port it.
- **Reconciliation reports what it dropped.** `reconcileVault` drops saved entries naming cards this
  build no longer has, and returns a **count** so the screen can say so. That is the same "never a
  silent success" rule applied one level down, and it is what makes a charm rename survivable rather
  than mysterious. Port the reported count, not just the drop.
- **Charm ids are persisted, so they are frozen the moment the game ships.** The Cairn keys its odds
  boosts and starting grants on them. The prototype has already been bitten by this once: renaming
  three condition families changed every id, and the fix was a schema bump that resets the save,
  chosen deliberately over a migration map that would keep the dead vocabulary alive in code. Set the
  ids in the port's own final vocabulary **before** anyone has a save, and the problem never happens.
  This is a concrete reason to settle §16's naming before writing definition assets.
- **`JsonUtility` will not serialise a dictionary, an interface, or a nullable.** Either shape the
  save records around that limitation or take a JSON library; decide once, in this assembly, and
  state which.

---

## 12. The simulator, and the coupling to break

The headless run simulator is the single most valuable thing in the prototype and the easiest to lose
in a port. It plays whole runs with no UI under several strategy policies, and it is what measured the
26.6–32.4% win rate.

**But it is coupled to the presentation layer today, and that must not cross.** `SimPolicy`'s methods
take `RoundUiState` — the fight screen's reducer state — because that is where the run figures a
policy needs were copied to. It is a direct consequence of §3's split ownership, and fixing §3 fixes
this: with one authoritative fight state in `Passage`, the policies read that, and
`TechDuinn.Simulation` references `Table` and `Passage` and nothing else. If the port ever finds
itself adding a `Presentation` reference to the simulation assembly, §3 was not finished.

Two consumers:

- **Edit-mode tests** — a few hundred runs per policy as a regression gate, so a tuning change that
  moves the win rate fails a build rather than being discovered in a playtest.
- **A console entry point** — tens of thousands of runs for balance work, run from the command line
  with no Unity process at all.

Keep the **policy seam** (pick a card, decide the shop action, choose charms, decide whether to cash
the pot) with its optional methods: a policy that does not implement a decision is recorded as *not
considering* it, which is a different and more honest claim than declining it every time. Keep the
per-run report shape — it is what makes "why did *this* seed lose" answerable.

**Port the unreachability audit.** The prototype has a test asserting exactly which decided,
enforced, fully tested features cannot be reached in play, so a feature joining or leaving that list
turns a test red. Given how much of the prototype is dead-but-live code (§15), this is the tool that
stops the port silently re-growing the same problem.

**Port the state mirror too.** `debugState.ts` exposes live state on a dev-only global so automated
playthroughs read the real state instead of parsing the screen. In Unity that is a development-build
debug service exposing the current `RunState`/`FightState` as JSON — the same trick, and the thing
that makes automated play-testing of the real UI cheap rather than brittle. Gate it on
`Debug.isDebugBuild` or a define, exactly as the prototype gates it on `import.meta.env.DEV`.

---

## 13. Text: a string table from day one, not at localisation time

The prototype holds roughly 1,550 lines of user-facing English in code —
`labels.ts`, `buffLabels.ts`, `armingLabels.ts`, `errorLabels.ts`, `manageBuffsLabels.ts`, plus card
names composed at runtime from a family word and a suit word. It is well organised: exhaustive
lookups keyed over closed unions, so a new card fails to compile until someone names it. But it is
still English embedded in the build.

**Take Unity's Localization package at the start, not later.** Three reasons specific to this
project:

1. **The rename.** Every player-facing string changes in the port — Charm, Shade, Oathbreak, Raven.
   Doing that once, into a table, costs the same as doing it once into more C# constants, and only
   one of the two is still useful afterwards.
2. **Card names are composed, not written.** "Blade of the Raven", "Surge of the Hound" are built
   from parts. Composition plus localisation is a known hard problem — grammatical gender, word
   order — and it is far cheaper to design the composition against a string table's smart-format
   syntax than to retrofit it.
3. **The refusal wording** (§7) has to be exhaustive over the refusal codes. That exhaustiveness is
   the thing that makes a table safe: a missing key is a build-time failure, not a blank button.

Keep the prototype's discipline inside the new home: **the rules never hold a sentence**, only a
code; `Presentation` maps codes to table keys; the table holds the English.

---

## 14. The card face, and what the art pipeline has to support

Worth stating because the prototype's cards are placeholder SVG and it would be easy to assume the
port just swaps in a sprite.

A card face is **composed of layers**, and the geometry is data (`CARD_FACE_GEOMETRY` in
`cardFace.ts`): a frame, a suit-tinted ground, an art window, a rank in the corner, a suit mark, and
— when the card is skulled or cursed — **a skull that replaces the picture while leaving the rank and
suit readable in the corner**. That last rule holds wherever the card is: in a trick, on the Omen
plate, in a hand.

So the Unity card prefab is not one sprite. It is a small composed prefab with slots, driven by the
`Card` value and the two skull lists (§9). Practical consequences:

- **One `CardView` prefab, pooled.** 33 cards, of which about a dozen are on screen at once, plus the
  charm grid. Pooling is the one place in this game where allocation discipline genuinely earns its
  keep.
- **Rank and suit are text/sprite slots, not baked art** — otherwise the skull overlay has nothing to
  leave readable.
- The prototype's two measured performance findings were about SVG filters and blend modes, and do
  not transfer. Do not carry them across as constraints; re-measure in Unity's own profiler.

---

## 15. Screens, routing, and the UI framework choice

**Routing is already a pure function and should stay one.** `screenFor(phase, encounterOver)` returns
which screen to show, given two values. No screen decides what comes next; the state decides, and the
router obeys. That is why the prototype's debug mirror cannot disagree with what is rendered — both
call the same function.

Port it directly: a `ScreenRoute` pure function in `Presentation`, and a router MonoBehaviour in
`Game` that activates the matching panel. **Never let a screen call the next screen directly** —
that is the mess this avoids, and it is the default thing a Unity project does.

**Decide uGUI versus UI Toolkit before building any screen.** It is a real fork and this project has
arguments on both sides: the shop, the Manage Charms grid, the map and the verdict are dense,
data-bound, list-heavy layouts that UI Toolkit is much better at, while the felt is animated,
free-positioned cards with motion and layering, which uGUI (or plain world-space sprites) handles more
naturally. A defensible split is **UI Toolkit for the run screens, world-space `CardView` prefabs for
the felt**, but pick deliberately and write down why.

**Keyboard and controller navigation is a requirement, not a nice-to-have.** The prototype has a
roving tab index across the hand and the charm grid with `Escape` unwinding one step at a time, and
the design's accessibility rule is that a lit card carries **three** signals — a glow, a travelling
edge, and a number — so the state reads without colour, without motion, and in greyscale. Both
survive the port and both are much cheaper designed in than added: build every screen against
Unity's Input System navigation from the first one.

---

## 16. Dead code — what does not cross

Roughly two fifths of the feature inventory is marked `X`. The dangerous entries are not the deleted
ones but the ones **still in the prototype's code, fully tested and enforced, that nothing in play can
reach**. They type-check, so they look like features.

Do not port, and do not carry a field, an enum member or a table row for:

- **Action points** — the whole per-hand pool, its price formula, and the shop item that topped it up.
  This one has the widest footprint in the prototype; excising it removes `apCost` from every charm,
  `apPool` from the activation state, and a reward axis.
- **Blue hearts and the card that grants them.**
- **The five one-shot items** — Ward, Second Thoughts, Foresight, Spyglass, Puppeteer.
- **The eight cut condition families** — Mark of the Rank, Glutton, Hoarder, Unbloodied, Debt
  Collector, Keepsake, Miser, Cornered.
- **The two cut reward axes** — coins and the action-point refund.
- **The bronze/silver/gold ladder for named ranks**, and the reserved rows for the five ranks that
  never got rules.
- **The Whetstone**, the second cauldron, the four shop shelves, the run-permanent shelf.
- **The forage budget**, and the automatic between-fight health restore.
- **The `Unassigned` charm sentinel.** It exists in the prototype as a fixture for guard tests. The
  port's guard is the type system: there is no charm without a definition asset.

**And one whole mechanism that is inert rather than merely unused: the per-hand accrual caps.**
`buffAccrual.ts` carries four running totals — flat damage, multiplier, coins, action-point refund —
each clamped at its own named ceiling, with a long docblock on why the caps reset per hand and
deliberately not on a hit. Check `apConfig.ts` and the whole thing evaporates: the two **live** axes
are capped at `Number.POSITIVE_INFINITY`, and the two axes carrying real ceilings (10 coins, 6
refunded points) are both dead. Nothing has ever been clipped.

So **the port's accrual is two integers with no clamps**, not four with four caps. This one is worth
calling out separately from the list above because a faithful translation would carry the machinery
across *and* would have to invent an awkward sentinel for an infinite cap in an int-typed field —
paying twice for something that does nothing. Keep only the one rule in that file that is live and
load-bearing: the low carry, which diverts a Suit Low reward earned on a Defeat into the **next**
hand, out of reach of the reset that would otherwise wipe it.

**Where the port's structure is better than a rewrite of a cut mechanic, say so.** A charm's reward
axis, for instance, is a field on the definition — restoring a cut axis later is authoring, not code.
That is the point of §4.

---

## 17. Naming is an architecture decision, not a polish pass

Two names are still open and both should be settled before the first assembly definition, because
both end up in string-bound places that no compiler checks.

**The two engine layers.** `warCouncil` names a design direction the game no longer has, and covers
the card layer and its UI under one word. This document proposes **`Table`** for the card layer — the
felt, the deck, the trick — and **`Passage`** for the run layer, a passage through the house of Donn.
They keep one vocabulary across the design docs, the ruleset and the code, which is the vocabulary
you will be tuning against. This is cheap to change now and expensive later; if a different pair is
wanted, decide it here.

**The charm ids.** §11: they are persisted and frozen on ship. Settle the vocabulary first, author the
assets second.

**Run the leakage check from day one, not at a milestone.** One case-insensitive search of the whole
Unity project — including `.asset`, `.prefab`, `.unity` and `.meta` files, which is where the old
words survive a rename — for the banned word list. It should return nothing. Words re-enter one at a
time, usually by someone copying a line out of the prototype.

---

## 18. Unity hazards that bite *this* project specifically

The general list is in the `unity-programmer` skill. These four are the ones this game's shape will
actually hit.

1. **Fast Enter Play Mode and statics.** The prototype forbids module-level mutable state precisely
   because it survives hot reload and leaks between tests. The same rule, harder: `Table`, `Passage`
   and `Presentation` should have **zero mutable statics**. Anything that must be static gets an
   explicit reset — a `RuntimeInitializeOnLoadMethod` at `SubsystemRegistration`, or the newer
   auto-cleanup attribute if the editor version has it (resolve it; it is 6.5+). The classic symptom
   is a run that works the first time you press Play and deals strangely the second.
2. **Event subscriptions outliving the fight.** The beat sequencer, the charm grid and the health
   bars will all subscribe to something. Every `+=` in `OnEnable`, every `-=` in `OnDisable`, no
   exceptions — a subscription on a ScriptableObject or a static outlives the card that made it and
   fires into a destroyed object.
3. **`== null`, not `is null`.** Unity overloads `==` on `UnityEngine.Object` so a destroyed object
   compares equal to null while its managed wrapper still exists. `is null`, `?.` and nullable
   reference types bypass that overload and hand you a destroyed object. This bites in `Game` and
   `Data` only — `Table` and `Passage` hold no `UnityEngine.Object`, which is another reason the
   split is worth having.
4. **Card animation is the only real hot path.** Thirty-plus card GameObjects moving at once is where
   the frames go, not the rules. Pool the card views, cache their transforms, batch position and
   rotation writes, and keep LINQ out of anything running per frame. Everywhere else in this codebase
   — the rules, the view models, the shop, the simulator — write the straightforward thing, and only
   optimise against a Profiler capture that names the marker.

---

## 19. Suggested port order

Each milestone is independently verifiable, and the early ones need no art and no scene.

1. **`Table`** — cards, deal, legal moves, trick resolution, the four outcomes, the pot. Port the
   prototype's tests alongside; they are the specification.
2. **`Passage` minus charms** — health, coins, the opponent ladder, the fight boundary, the shop's
   heal and max-health purchases.
3. **`TechDuinn.Simulation`** — the baseline policy over the two assemblies above. This is the first
   moment the port can be checked against the prototype's measured numbers, and it happens before a
   single prefab exists.
4. **Charms** — `CharmDefinition`, the condition hierarchy, `CharmSpec`, the accrual and the low
   carry. Author the nineteen live templates as assets.
5. **Dagda's Cauldron and the Cairn** — the draw, the odds, the save envelope.
6. **`Presentation`** — the view models, the router, the beat list, still with no scene. Testable in
   full.
7. **`Game`** — the fight scene, the beat sequencer, the card animation, the run screens.

---

## 20. Decisions that are cheap now and expensive later

None of these is logic, and every one of them is harder to change after the first ten files exist.

### 20.1 Keep the prototype alive as an oracle

**Do not archive the Vite prototype when the port starts.** It is a working, measured, deterministic
implementation of the same rules, and that makes it the best test the port will ever have.

The technique: both simulators are seeded, both produce a structured per-run report, and the same
seed must produce the same report. Dump the prototype's report for a few hundred seeds to JSON once,
commit it, and make the Unity simulator reproduce it. A rule ported subtly wrong — an off-by-one in
the refill, the skull curve read one rank out, the overlap bonus counting the wrong number of charms
— shows up as a diff on a specific seed rather than as a vague sense that the game feels different.

This is worth far more than porting the unit tests alone, because it catches the errors that live in
the *interaction* of correct-looking parts. It also has a shelf life: it only works while the port is
meant to behave identically. The moment the port deliberately changes a rule, that seed's golden file
is retired on purpose, and the diff is the record of what changed.

### 20.2 No floating-point arithmetic in the rules

The prototype has floats scattered through its config — a 1.5 boss health multiplier, a 0.6 flask
heal, a 0.4 skull chance on a swap, quick-kill multipliers of 2 / 1 / 0.5. They are harmless in one
browser. They are not harmless across a Windows build, a Mac build, and a recorded seed that has to
replay on both.

`Table` and `Passage` should do **integer arithmetic only**, with percentages as integers and the
rounding direction stated at every division. The prototype already has the instinct where it counted
— the "am I below a share of maximum health" check is deliberately written as `health * 100 <
threshold * maxHealth` specifically so no division happens and no `NaN` can reach a rendered heart —
and the quick-kill payout already specifies "always rounded down". Make that the rule rather than the
exception.

This also removes a whole class of save bug: an integer round-trips through JSON exactly, and a float
does not.

### 20.3 An agent can write C#, but must not hand-edit a scene or a prefab

Worth stating plainly because it is a real constraint on this project's workflow and it has an
architectural consequence.

`.unity`, `.prefab` and `.asset` files are machine-authored YAML full of file GUIDs. They can be read
and they can be diffed, but they cannot safely be *written* by anything that is not Unity — a
plausible-looking hand edit produces a broken reference that surfaces as a missing script at runtime,
not as a compile error.

Two things follow:

- **Push as much as possible out of scenes and into code and data.** Every screen wired in a scene is
  a file the pipeline cannot touch; every screen wired from a prefab reference resolved in code is a
  file it can. This is the same conclusion §2 reaches for testability, arriving from a completely
  different direction, which is usually a sign it is right.
- **Set git up before the first binary asset lands.** Force text serialization, commit `.meta` files,
  configure LFS for art and audio, and take Unity's own `.gitignore`. Retrofitting LFS after sprites
  are in history is a rewrite of the repository.

### 20.4 The `/fb-*` pipeline needs a Unity sibling to its workflow file

`.claude/workflow/web-project.md` owns where code lives, the runner commands, and the correctness
traps — and every one of its answers is about npm and Vitest. The moment the port starts, none of
them is true: the verification gates become a `dotnet test` over the four engine-free assemblies
(§2.1), an editor-mode test run for anything touching `Data` or `Game`, and a player build.

That file is the single source of truth the four agents read, so it is the one place the change has
to be made — and it should be made **before** the first Unity ticket, not discovered by an agent
recording a gate as `N/A`.

Two of this repo's skills also carry web assumptions worth re-pointing rather than rewriting:
`react-frontend` is replaced wholesale by `unity-programmer` for anything under the Unity project,
and `game-ux`'s zoning and interaction-cost thinking transfers while its CSS specifics do not.

### 20.5 Pin the irreversible Unity choices first

Cheap to decide now, structural afterwards: the **editor version** (and whether the Mono-to-CoreCLR
cutover at 6.8 is something to land on deliberately or to sit behind), the **render pipeline**, the
**Input System**, and the **base resolution and card dimensions** — the last because the card face is
a composed layout (§14) and every piece of art is drawn against it.

---

## 21. The checklist a change is held to

- Every rule lives in an assembly with no `UnityEngine` reference, and its test runs without entering
  Play mode — and, for the four engine-free assemblies, without Unity running at all.
- No floating-point arithmetic in `Table` or `Passage`; every division states its rounding.
- No `ScriptableObject`, `MonoBehaviour` or `Transform` appears in `Table`, `Passage`,
  `Presentation` or `Simulation`.
- `TechDuinn.Simulation` references `Presentation` nowhere.
- No `ScriptableObject` is written to at runtime.
- No mutable static without an explicit reset; every `+=` has a matching `-=`.
- No `UnityEngine.Random` or `System.Random` in a rules or simulation path; every generator is a
  seed passed as a parameter.
- No `GameObject.Find`, `FindObjectOfType`, `SendMessage`, `BinaryFormatter`, or finalizer.
- A rule that can say no returns a refusal code; it does not throw and it does not hold the sentence.
- No view model computes a game number. Every preview runs the real rules on a hypothetical state.
- Resolving a trick fires no events and triggers no animation — it returns beats. Otherwise it
  cannot be used to preview itself.
- No user-facing English outside the string table.
- No `new` in a per-frame method or its call tree; no LINQ in per-frame code. Rules code is exempt —
  it does not run per frame.
- Storage is touched by one class; every save is a versioned envelope; a version it cannot read
  returns the default *and* says why; a reconciliation reports what it dropped.
- Not one of the banned prototype words appears anywhere in the project, including asset and scene
  filenames.
- Every file measured; nothing over 400 lines. `Measure-Object -Line` drops blank lines, so check the
  raw count near the limit.
- The Unity version any resolved API was checked against is stated in the change summary.
