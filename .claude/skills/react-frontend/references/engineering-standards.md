# Engineering Standards — Reference

General React/TypeScript engineering standards that apply regardless of feature. Read once, internalise, return when scaffolding something new or reviewing a large change.

**Not here:** the hard MUST/NEVER contract and the project-specific stack facts and traps — those live in `SKILL.md`. This file is the rationale and the detail behind the principles it names.

## Principles in practice

Optimise every implementation for, in order: readability over cleverness, simplicity over abstraction, consistency over personal preference, maintainability over speed of implementation, reusability over duplication, predictability over complexity. Each one only matters once it's concrete:

- **Readability over cleverness.** A one-line reduce that requires tracing three levels of destructuring to understand is not shorter in any way that counts — it costs the same six months from now, plus the re-derivation. Prefer:

  ```ts
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  ```

  over a version that folds the same logic into a point-free composition of three generic helpers imported for this one call site.

- **Simplicity over abstraction.** A single `formatDate(date, style)` function beats a `DateFormatterFactory` with a strategy interface when there are two call sites and one format. Build the abstraction when the second *real* variation shows up, not in anticipation of one.

- **Consistency over preference.** If the codebase already destructures props at the top of a function, do that in the new one too, even if a different style is arguably nicer — a codebase with one convention per author is harder to read than one with a single mediocre convention applied everywhere.

Before calling a change done, answer: will another developer understand this in six months? Is this the simplest solution that solves the problem? Does it match existing patterns in this codebase? Can it be tested and maintained without special knowledge only the author has?

Code is read far more often than it is written. The goal is an application that stays simple, consistent, and reliable as it grows — not a sophisticated one.

## Component size budget

| Lines | Verdict |
|---|---|
| < 200 | fine |
| 200–400 | needs a second look — is there a hook or a sibling component hiding in here? |
| > 400 | **blocking** — split it in the same change |

Measure, don't estimate:

```powershell
(Get-Content <file> | Measure-Object -Line).Lines
```

A file over 400 lines is not a review note for later — split it now, using one of two strategies:

- **Logic → a `use*` hook.** If the component body computes, aggregates, sequences, or subscribes to something, that behaviour wants to live in a custom hook that returns values and callbacks, leaving the component to just render them.
- **Render concerns → sibling components.** If the JSX itself has grown a distinct section — a header, a list item, a footer — with its own props and its own conditional logic, extract it into a sibling file in the same folder rather than deepening the one file.

Choose based on where the size actually came from: a component that's long because it computes a lot wants the hook split; one that's long because it renders a lot of distinct sub-trees wants the component split. Files frequently need both.

## Constants taxonomy

Three distinct categories, and conflating them is a defect:

**Constants** — values with fixed meaning that appear more than once and will never need to change without a code review. Magic strings and numbers are a primary source of silent defects: a typo in a repeated literal fails at runtime, in one branch, quietly.

```ts
export const REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const
```

`UPPER_SNAKE_CASE` keys, one exported map, imported everywhere it's used. Because `erasableSyntaxOnly` is on in this project's `tsconfig.app.json`, this `as const` object form is the only option — a TypeScript `enum` is not erasable and will fail to compile.

**Configuration** — values a developer is actively tuning and expects to change without touching source: thresholds, limits, feature flags, anything with a "the right number here is a judgement call, not a fact" quality. These belong in a configuration file or a clearly-named config module the developer owns — never hard-coded inline, and never duplicated as a second literal elsewhere "just this once."

**Legitimate inline literals** — a value with no meaning outside its one use site and no chance of needing to change independently: a CSS `0` used as a reset, an array index in a genuinely one-off transform, a single retry count with no other configuration nearby. If in doubt, promote it — a constant nobody reads twice costs nothing; a hard-coded config value someone needs to change without a code review is a recurring cost.

The dividing question between the last two: *if this needs to change, does it need a code change and review, or does the developer just want to try a different number?* The first is a constant; the second is configuration.

## Exhaustiveness checking

A discriminated union (a set of variants sharing one literal-typed field — `kind`, `stance`, `phase`) is only as safe as the code that switches on it. A `switch` with a `default:` that silently falls through, or an `if`/`else if` chain with no final `else`, compiles cleanly today and stops compiling loudly the day a variant is added — it just silently does nothing for the new case instead. Close that gap with a `never` guard in the branch that should be unreachable:

```ts
function describe(intent: QuarryIntent): string {
  switch (intent.stance) {
    case QuarryIntentStance.Leading:
      return 'opening the trick'
    case QuarryIntentStance.Pressing:
      return 'pressing to win'
    case QuarryIntentStance.Ducking:
      return 'ducking'
    default: {
      const _exhaustive: never = intent.stance
      return _exhaustive
    }
  }
}
```

Adding a fourth `QuarryIntentStance` value without adding its case here now fails `npm run typecheck` instead of shipping a silent no-op. This is worth reaching for anywhere a union is expected to grow — CPU intent shapes, ability-choice kinds, round phases — not just where a bug already happened once.

## A known gap, not yet closed: `noUncheckedIndexedAccess`

This project's `tsconfig.app.json` enables `strict: true`, but `noUncheckedIndexedAccess` is not among the flags `strict` bundles — it has to be turned on separately. With it off, `someArray[i]` and `someRecord[key]` type as `T`, not `T | undefined`, so an out-of-range index or a mistyped `Record` key type-checks cleanly and fails at runtime instead of at the type checker. This codebase leans on exactly the patterns that flag protects — `state.hands[side]`, table scans in `src/hunt/config.ts`, `Record<PlayerSide, ...>` lookups throughout `src/warCouncil/`.

Recorded here as a stated gap rather than turned on inline: enabling it repo-wide is very likely to surface a batch of new type errors across existing files, which is its own scoped piece of work, not something to fold silently into an unrelated task. Reach for it as a deliberate follow-up, not a drive-by fix.

## The four async states

Every asynchronous surface has **four** states, not two:

| State | Requirement |
|---|---|
| loading | a visible indicator — never a frozen or blank UI |
| success | the data |
| error | a human-readable message, never a raw stack trace or a blank screen |
| empty | distinct from loading and from error |

The empty state is the one most often skipped, and skipping it is a defect, not an oversight that doesn't matter: a list that has genuinely zero items and a list that is still loading look identical to a user staring at a blank area, and a user who can't tell "there's nothing here" from "this is broken" will file the wrong bug or refresh in a loop.

A `catch` block that returns a success-shaped fallback — `catch { return [] }`, `catch { return DEFAULT_CONFIG }` — is worse than no error handling at all. It converts a real failure into "loaded successfully, and the data happens to be empty/default," which is indistinguishable from the legitimate empty or success state at every layer above the catch. Whoever is debugging a downstream symptom has no way to discover that the actual cause was an upstream failure, because the code told them it succeeded.

## Performance order

Work in this order; stop when the problem is solved:

1. **Measure first.** Don't optimise a suspicion — profile, or at minimum time the operation, before changing anything. "This feels slow" is not evidence of where the cost is.
2. **Reduce work per event.** Before touching React's render behaviour, check whether the code is doing more work than it needs to on each interaction — recomputing something already known, iterating a full collection when only the changed item matters, doing a network round-trip that could be batched or cached.
3. **Keep high-frequency updates off the reconciler.** A value that changes on every animation frame or every pointer move belongs in a ref, mutated directly and read on the next meaningful commit, not in state that re-renders the tree on every tick.
4. **Only then memoise, with evidence.** `memo`, `useMemo`, and `useCallback` added without a profiler showing they fix a measured problem are themselves an anti-pattern — they add indirection and a dependency-array maintenance burden for a gain nobody confirmed exists.

Memoisation is always last. It is the step most often reached for first, and it is the step that should be reached for last.

## Testing posture

**Worth a test:** behaviour with an invariant — a function that must always satisfy some property regardless of input shape (a sort that must be stable, a parser that must round-trip, a reducer transition that must be idempotent when replayed), a bug that has happened once and must not happen silently again, and any pure logic with more than one meaningful branch.

**Not worth a test:** implementation detail that would break the test on every refactor without the behaviour changing (asserting on internal variable names or call counts to a helper), and framework behaviour that the framework's own test suite already covers (asserting that `useState` re-renders, that CSS applies, that React calls an effect after mount).

**Pure logic tested without a renderer is the cheapest coverage available.** A function that takes plain values in and returns a plain value out needs no DOM, no mount, no cleanup, and runs in milliseconds — that's why establishing a pure-logic boundary early (see `SKILL.md` → "The pure-core boundary") pays for itself the first time a substantial chunk of logic can be tested this way instead of through a rendered component.

**Component tests query by accessible role and label** (`getByRole`, `getByLabelText`), not by test id or CSS selector, wherever an accessible query exists. This does double duty: it tests the behaviour a user actually experiences rather than an implementation detail, and a component that's awkward to query this way is usually awkward for a screen reader too — the friction is itself a signal.

## Definition of Done

A change is done when:

- Functionality works, verified by actually exercising it — or explicitly stated as unverified, and why.
- `npm test` and `npm run typecheck` both pass, and the summary says so having actually run them, not assumed it.
- No file left over 400 lines; no new `console.log` / `console.debug`; no new magic value that should have been a constant or configuration.
- All four async states are handled on any new async surface, with no `catch` returning a success-shaped fallback.
- Accessibility is satisfied where it applies: keyboard reachable, semantic elements, ARIA on icon-only controls, ≥44px touch targets, AA contrast. A genuine gap (no keyboard equivalent for a pointer-only interaction, say) is stated openly rather than implied to be covered.
- Errors are handled — no blank screens, no raw stack traces, no swallowed failures.
- The summary states: what changed, why this approach, what was verified and how, what was not verified, and any known risk or debt introduced deliberately.

Smaller incremental changes beat one large one — past roughly 500 lines of diff, flag it explicitly and say why it couldn't be split. Never introduce technical debt silently: if a shortcut is the right call under the circumstances, say so in the summary so it is a decision on record, not a surprise for whoever reads the diff next.
