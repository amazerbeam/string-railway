# Tasks: War Council UI — hand, trick area, trump/decree, score

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-05

**Goal:** Build the playable War Council round as a real game screen matching `mockup.html` — a full-viewport no-scroll shell holding the opponent plate and scoreboard, a felt table with the decree card, draw pile, trump mark and trick well, and a fanned hand played by tapping a card once to arm it and again to commit — with every rules question delegated to the existing engine and all sequencing in one pure reducer.

**Spec:** `plan.md` in this folder. **`mockup.html` in this folder is the approved visual and interaction specification** — where it and `plan.md` disagree, the mockup wins.

---

## File map

**Created:**

- `src/app/warCouncil/labels.ts` — suit and rank names, accessible card name, illegal-move copy
- `src/app/warCouncil/fanLayout.ts` — pure fan geometry (rotation, arc, overlap, z-order)
- `src/app/warCouncil/roundReducer.ts` — the single pure reducer owning every transition
- `src/app/warCouncil/warCouncil.css` — the full-viewport shell grid, design tokens, status band, felt, and hand container
- `src/app/warCouncil/warCouncilCards.css` — sibling stylesheet added in Phase 3: the card face, ability prompt, and round-over panel, split out because the combined stylesheet exceeded the 400-line budget (Task 9 Step 2's instruction). Import both from the mount.
- `src/app/warCouncil/SuitMark.tsx` — inline-SVG suit symbol
- `src/app/warCouncil/PlayingCard.tsx` — one card, three renderings (`hand` / `table` / `pile`)
- `src/app/warCouncil/RoundStatusBand.tsx` — opponent plate + scoreboard (AC4)
- `src/app/warCouncil/DecreePile.tsx` — decree, draw pile, trump chip, on the felt (AC3)
- `src/app/warCouncil/TrickWell.tsx` — current and resolved trick (AC2)
- `src/app/warCouncil/HandFan.tsx` — the fanned hand, roving tabindex (AC1)
- `src/app/warCouncil/AbilityPrompt.tsx` — Fox / Woodcutter choice, on the felt
- `src/app/warCouncil/RoundOverPanel.tsx` — end-of-round tricks and points
- `src/app/warCouncil/WarCouncilRound.tsx` — the mount implementing `WarCouncilMountProps`
- `src/app/warCouncil/__tests__/roundFixture.ts` — hand-built `WarCouncilState` helper (not a spec)
- `src/app/warCouncil/__tests__/labels.test.ts`
- `src/app/warCouncil/__tests__/fanLayout.test.ts`
- `src/app/warCouncil/__tests__/roundReducer.test.ts`
- `src/app/warCouncil/__tests__/HandFan.test.tsx`
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

**Modified:**

- `package.json` — add `jsdom`, `@testing-library/react`, `@testing-library/dom` to devDependencies
- `vite.config.ts` — `test.projects`: a `node` project and a `jsdom` project scoped to `*.test.tsx`
- `src/warCouncil/index.ts` — additively export `sameCard` and `containsCard`
- `index.html:6` — add `viewport-fit=cover` to the viewport meta
- `src/styles/global.css` — remove `min-height: 100vh`, stop the document scrolling
- `src/App.tsx` — replace the placeholder with a minimal dev host that deals and mounts the round
- `.docs/implementation/app.md` — module graduates from scaffold; satisfied *Deferred* entries move out
- `.docs/implementation/README.md` — refresh the `src/app/` row

**Deleted:**

- `src/app/stubs/WarCouncilStub.tsx` — replaced wholesale, per `.docs/implementation/app.md`

**Developer decides or observes:**

- Every value in `warCouncil.css`'s token table and `fanLayout.ts`'s constants is transcribed from the approved mockup. Each is a one-line retune — felt/brass/parchment palette, the three suit hues, the `clamp()` card-size bounds, fan rotation step, lift factor, overlap.
- Whether tap-twice is discoverable without being told, and whether 13 arms + 13 commits + 13 carry-ons per round drags. Only playing settles either. The timed alternative needs a `TRICK_REVEAL_MS` value nobody has chosen and this contract does not invent one.
- Whether the single dark theme is right for the game screen, given `global.css` keeps `color-scheme` for any future non-game screen.
- Whether the ability pip reads clearly enough in place of a printed ability name.
- `WAR_COUNCIL_FIRST_DEALER` stays SCRUM-25's placeholder, so the opponent leads trick 1 and the player's first sight is a card already on the table. Flip it in one line in `src/battle/config.ts` if the other opening is wanted — not this contract's change.

---

## Phase 1 — Test environment and engine surface

Foundation only: the DOM test environment and the two engine exports every later phase depends on. Nothing renders yet. The phase boundary is safe because each task ends with the full existing suite still collecting **34 files / 268 tests** and `npm run typecheck` clean — this is the one phase that can silently un-run tests, so it verifies counts explicitly rather than exit codes alone.

### Task 1: Add the three DOM-test devDependencies to `package.json` ✓

- Skill: `react-frontend`

**Files:**

- Config: `package.json` — add `jsdom`, `@testing-library/react`, `@testing-library/dom` to `devDependencies`

- [x] **Step 1: Install the three packages as devDependencies**

Developer-approved in the planning session. All three are development-only, so the deliberate two-runtime-dependency rule is untouched. Let npm write both `package.json` and `package-lock.json` — never hand-edit the lockfile.

Run: `npm install -D jsdom @testing-library/react @testing-library/dom`
Expected: exits 0. `package.json` gains all three under `devDependencies`; `package-lock.json` is regenerated.

- [x] **Step 2: Confirm the suite is unaffected before any config changes**

Run: `npx vitest run`
Expected: exits 0, and the summary reads `Test Files  34 passed (34)` and `Tests  268 passed (268)`. Record both numbers — Task 2 compares against them.

### Task 2: Split the Vitest environment in `vite.config.ts` ✓

- Skill: `react-frontend`

**Files:**

- Config: `vite.config.ts` — replace the flat `test` block with a two-project `test.projects` array

- [x] **Step 1: Replace the `test` block with two projects**

`react-frontend` § *Testing* requires an environment split rather than flipping the global environment to `jsdom`, which would remove the no-DOM guarantee from all 34 existing pure-logic specs at once. Its other suggested mechanism, `environmentMatchGlobs`, does not exist in the installed Vitest 4.1.10 — `test.projects` does. `extends: true` makes each project inherit the root config, which is what carries `@vitejs/plugin-react` into the DOM project.

Replace:

```ts
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
```

with:

```ts
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/__tests__/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.tsx'],
        },
      },
    ],
  },
```

- [x] **Step 2: Confirm no spec stopped being collected**

The `node` project's `include` is unchanged, so its file and test counts must be identical. There are zero `.test.tsx` files yet, so the `dom` project starts empty.

Run: `npx vitest run`
Expected: exits 0, `Test Files  34 passed (34)` and `Tests  268 passed (268)` — identical to Task 1 Step 2. A lower count means the include pattern was fumbled; stop and fix it rather than continuing.

- [x] **Step 3: Typecheck the config change**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 3: Export `sameCard` and `containsCard` from the engine barrel ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:13-14`

- [x] **Step 1: Add the additive export line**

The UI compares cards for selection and legality display and must use the engine's own structural equality rather than re-implementing it or deep-importing `./cardUtils`. Purely additive — no existing export changes, and the 5 and 4 internal call sites of `sameCard`/`containsCard` inside `src/warCouncil/` are untouched.

Insert immediately after the `export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'` line:

```ts
export { containsCard, sameCard } from './cardUtils'
```

- [x] **Step 2: Typecheck and confirm the pure-core boundary still holds**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. The lint run matters here specifically because this is the only edit inside the `src/warCouncil/**` ESLint override — it imports nothing new and touches no DOM global, so `no-restricted-imports` and `no-restricted-globals` must both stay silent.

---

## Phase 2 — Pure logic

Every module here is plain TypeScript with no React import and no DOM access, tested in the `node` project — the cheapest coverage available and where all of this feature's real invariants live. Test-first throughout, since each has behaviour with a stated invariant. The phase ends type-checking with the three modules and their specs green and nothing rendering yet.

### Task 4: Add `src/app/warCouncil/labels.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Write the failing spec**

```ts
import { describe, expect, it } from 'vitest'
import { IllegalMoveReason, Suit } from '../../../warCouncil'
import { cardAccessibleName, ILLEGAL_MOVE_MESSAGE, RANK_NAME, SUIT_NAME } from '../labels'

describe('cardAccessibleName', () => {
  it('names an ability-bearing rank', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 })).toBe('3 of Keys (Fox)')
  })

  it('omits the parenthetical for an ordinary rank', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 7 })).toBe('7 of Bells')
  })
})

describe('the label maps', () => {
  it('names every suit', () => {
    for (const suit of Object.values(Suit)) expect(SUIT_NAME[suit]).toBeTruthy()
  })

  it('names exactly the five ability-bearing ranks', () => {
    expect(Object.keys(RANK_NAME).map(Number).sort((a, b) => a - b)).toEqual([1, 3, 5, 9, 11])
  })

  it('carries copy for every illegal-move reason', () => {
    for (const reason of Object.values(IllegalMoveReason)) {
      expect(ILLEGAL_MOVE_MESSAGE[reason]).toBeTruthy()
    }
  })
})
```

- [x] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: non-zero exit, failing to resolve `../labels`. A different error means the spec itself is wrong.

- [x] **Step 3: Implement `labels.ts`**

Keyed off `CardRank` so no ability rank is a bare numeric literal, and typed `Record<IllegalMoveReason, string>` so a future engine ticket that widens the union fails to compile here rather than rendering `undefined`. Copy is transcribed from the approved mockup.

```ts
import { CardRank, IllegalMoveReason, Suit, type Card } from '../../warCouncil'

export const SUIT_NAME: Readonly<Record<Suit, string>> = {
  [Suit.Bells]: 'Bells',
  [Suit.Keys]: 'Keys',
  [Suit.Moons]: 'Moons',
}

export const RANK_NAME: Readonly<Record<number, string>> = {
  [CardRank.Swan]: 'Swan',
  [CardRank.Fox]: 'Fox',
  [CardRank.Woodcutter]: 'Woodcutter',
  [CardRank.Witch]: 'Witch',
  [CardRank.Monarch]: 'Monarch',
}

export function cardAccessibleName(card: Card): string {
  const base = `${card.rank} of ${SUIT_NAME[card.suit]}`
  const named = RANK_NAME[card.rank]
  return named ? `${base} (${named})` : base
}

export const ILLEGAL_MOVE_MESSAGE: Readonly<Record<IllegalMoveReason, string>> = {
  [IllegalMoveReason.RoundComplete]: 'The round is over.',
  [IllegalMoveReason.NotYourTurn]: 'It is not your turn.',
  [IllegalMoveReason.CardNotInHand]: 'That card is not in your hand.',
  [IllegalMoveReason.MustFollowLeadSuit]: 'You must follow the led suit.',
  [IllegalMoveReason.MustFollowMonarch]:
    'The Monarch was led — play your Swan or your highest card of that suit.',
  [IllegalMoveReason.MissingAbilityChoice]: 'Choose what this card does before playing it.',
  [IllegalMoveReason.UnexpectedAbilityChoice]: 'That card takes no choice.',
  [IllegalMoveReason.InvalidFoxExchangeCard]: 'That card is not available to exchange.',
  [IllegalMoveReason.InvalidWoodcutterDiscard]: 'That card is not available to discard.',
}
```

- [x] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest reports 5 passed, 0 failed; typecheck exits 0.

### Task 5: Add `src/app/warCouncil/fanLayout.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/fanLayout.ts`
- Test: `src/app/warCouncil/__tests__/fanLayout.test.ts`

- [x] **Step 1: Write the failing spec**

The invariants that matter are symmetry and finiteness. Finiteness is not pedantry: a `NaN` inside a `transform` string produces an invalid declaration that the browser silently drops, so the fan would flatten with no error anywhere.

```ts
import { describe, expect, it } from 'vitest'
import { FAN_ARMED_Z_INDEX, fanPlacement } from '../fanLayout'

describe('fanPlacement', () => {
  it('is symmetric about the centre of the fan', () => {
    expect(fanPlacement(0, 13, false).rotateDeg).toBeCloseTo(-fanPlacement(12, 13, false).rotateDeg)
    expect(fanPlacement(0, 13, false).liftPct).toBeCloseTo(fanPlacement(12, 13, false).liftPct)
  })

  it('leaves a single card upright', () => {
    const only = fanPlacement(0, 1, false)
    expect(only.rotateDeg).toBe(0)
    expect(only.liftPct).toBe(0)
  })

  it('never overlaps the first card', () => {
    expect(fanPlacement(0, 13, false).overlapPx).toBe(0)
  })

  it('tightens the overlap as the hand grows', () => {
    expect(fanPlacement(1, 13, false).overlapPx).toBeLessThan(fanPlacement(1, 5, false).overlapPx)
  })

  it('lifts an armed card above every sibling', () => {
    expect(fanPlacement(3, 13, true).zIndex).toBe(FAN_ARMED_Z_INDEX)
    expect(fanPlacement(3, 13, false).zIndex).toBeLessThan(FAN_ARMED_Z_INDEX)
  })

  it('produces finite numbers for every hand size a round can reach', () => {
    for (let count = 0; count <= 13; count++) {
      for (let i = 0; i < Math.max(count, 1); i++) {
        const p = fanPlacement(i, count, false)
        expect(Number.isFinite(p.rotateDeg)).toBe(true)
        expect(Number.isFinite(p.liftPct)).toBe(true)
        expect(Number.isFinite(p.overlapPx)).toBe(true)
      }
    }
  })
})
```

- [x] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/fanLayout.test.ts`
Expected: non-zero exit, failing to resolve `../fanLayout`.

- [x] **Step 3: Implement `fanLayout.ts`**

Constants transcribed from the approved mockup.

```ts
export const FAN_ROTATION_STEP_DEG = 2.1
export const FAN_LIFT_FACTOR = 0.13
export const FAN_OVERLAP_PX = { loose: -4, medium: -10, tight: -18 } as const
export const FAN_ARMED_Z_INDEX = 20

export interface FanPlacement {
  readonly rotateDeg: number
  readonly liftPct: number
  readonly overlapPx: number
  readonly zIndex: number
}

export function fanPlacement(index: number, count: number, armed: boolean): FanPlacement {
  const spread = count > 1 ? index - (count - 1) / 2 : 0
  const overlapPx =
    index === 0
      ? 0
      : count > 9
        ? FAN_OVERLAP_PX.tight
        : count > 6
          ? FAN_OVERLAP_PX.medium
          : FAN_OVERLAP_PX.loose

  return {
    rotateDeg: spread * FAN_ROTATION_STEP_DEG,
    liftPct: Math.abs(spread) ** 2 * FAN_LIFT_FACTOR,
    overlapPx,
    zIndex: armed ? FAN_ARMED_Z_INDEX : index,
  }
}
```

- [x] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/warCouncil/__tests__/fanLayout.test.ts; npm run typecheck`
Expected: Vitest reports 6 passed, 0 failed; typecheck exits 0.

### Task 6: Add the round fixture helper ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/__tests__/roundFixture.ts`

- [x] **Step 1: Write the fixture builder**

Following the precedent of `src/vanguard/__tests__/testBoard.ts` and `src/battle/__tests__/battleTestHelpers.ts`: a helper inside `__tests__/` whose name does not match `*.test.ts`, so the include pattern does not collect it as a spec. Hand-built rather than dealt, because the reducer's specs need specific legality situations and a seeded deal cannot be aimed at one.

```ts
import {
  PlayerSide,
  RoundPhase,
  Suit,
  type Card,
  type WarCouncilState,
} from '../../../warCouncil'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

/** An unstarted round the player leads. Override any field a spec needs to aim. */
export function makeRound(overrides: Partial<WarCouncilState> = {}): WarCouncilState {
  return {
    dealer: PlayerSide.Cpu,
    hands: {
      [PlayerSide.Player]: [
        card(Suit.Bells, 2),
        card(Suit.Bells, 7),
        card(Suit.Keys, 3),
        card(Suit.Keys, 8),
        card(Suit.Moons, 5),
        card(Suit.Moons, 11),
      ],
      [PlayerSide.Cpu]: [
        card(Suit.Bells, 4),
        card(Suit.Keys, 6),
        card(Suit.Moons, 9),
        card(Suit.Moons, 10),
      ],
    },
    drawPile: [
      card(Suit.Bells, 1),
      card(Suit.Bells, 5),
      card(Suit.Keys, 9),
      card(Suit.Keys, 11),
      card(Suit.Moons, 2),
      card(Suit.Moons, 6),
    ],
    decree: card(Suit.Bells, 10),
    trumpSuit: Suit.Bells,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

export { card }
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. A `noUnusedLocals` error here means an unused import — fix it rather than suppressing.

### Task 7: Add `src/app/warCouncil/roundReducer.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/roundReducer.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Write the failing spec**

Covers the tap-twice flow, both rejection surfaces, trick-winner derivation, the Fox's trump mutation (AC3), and round completion. `MustFollowLeadSuit` is reached by arming a card the engine excludes — the reducer arms anything in hand and lets `playCard` adjudicate, which is what makes AC1's "rejected" half real rather than a re-implemented check.

```ts
import { describe, expect, it } from 'vitest'
import {
  AbilityChoiceKind,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  Suit,
  currentTurn,
} from '../../../warCouncil'
import { createRoundUiState, roundReducer, RoundUiActionKind } from '../roundReducer'
import { card, makeRound } from './roundFixture'

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const

describe('createRoundUiState', () => {
  it('plays the opponent’s lead when they lead the first trick', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Cpu }))
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
    expect(currentTurn(ui.round)).toBe(PlayerSide.Player)
  })

  it('leaves the table empty when the player leads', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Player }))
    expect(ui.round.currentTrick).toHaveLength(0)
    expect(ui.armed).toBeNull()
  })
})

describe('tap-twice', () => {
  it('arms on the first tap without playing', () => {
    const ui = createRoundUiState(makeRound())
    const next = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(next.armed).toEqual(card(Suit.Bells, 7))
    expect(next.round.currentTrick).toHaveLength(0)
    expect(next.round.hands[PlayerSide.Player]).toHaveLength(6)
  })

  it('moves the arm when a different card is tapped', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 8)))
    expect(ui.armed).toEqual(card(Suit.Keys, 8))
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('commits on the second tap of the same card', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.armed).toBeNull()
    expect(ui.round.hands[PlayerSide.Player]).toHaveLength(5)
    // The player led, so the opponent answered in the same commit and the trick resolved.
    expect(ui.resolvedTrick).not.toBeNull()
    expect(ui.resolvedTrick?.cards).toHaveLength(2)
  })

  it('clears the arm on CancelSelection', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelSelection })
    expect(ui.armed).toBeNull()
    expect(ui.prompt).toBeNull()
  })
})

describe('rejection', () => {
  it('names the engine’s own reason and leaves the round untouched', () => {
    // The opponent led Moons and the player holds Moons, so Bells is illegal.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    let ui = { ...createRoundUiState(round), round }
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    const before = ui.round
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
    expect(ui.round).toBe(before)
  })
})

describe('abilities', () => {
  it('opens the prompt instead of playing a Fox', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    expect(ui.prompt).toEqual(card(Suit.Keys, 3))
    expect(ui.armed).toBeNull()
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('changes the trump suit when the exchange is chosen', () => {
    let ui = createRoundUiState(makeRound())
    expect(ui.round.trumpSuit).toBe(Suit.Bells)
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, {
      kind: RoundUiActionKind.ChooseAbility,
      choice: { kind: AbilityChoiceKind.FoxExchange, handCard: card(Suit.Moons, 5) },
    })
    expect(ui.round.trumpSuit).toBe(Suit.Moons)
    expect(ui.round.decree).toEqual(card(Suit.Moons, 5))
    expect(ui.prompt).toBeNull()
  })
})

describe('the trick beat', () => {
  it('derives the winner from the tricks-won delta', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    const winner = ui.resolvedTrick?.winner
    expect(winner).toBeDefined()
    expect(ui.round.tricksWon[winner!]).toBe(1)
  })

  it('clears the reveal on CarryOn', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    expect(ui.resolvedTrick).toBeNull()
  })

  it('completes the round on the thirteenth trick', () => {
    const round = makeRound({
      tricksPlayed: 12,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    let ui = { ...createRoundUiState(round), round }
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.round.phase).toBe(RoundPhase.Complete)
    expect(ui.resolvedTrick).not.toBeNull()
  })
})

describe('a corrupt opponent turn', () => {
  it('reports a fault instead of throwing when the opponent has no legal move', () => {
    // chooseCpuMove throws on an empty legal set — lowestCard([]) is undefined and
    // card.rank then throws — so the reducer must guard before calling it.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      hands: { [PlayerSide.Player]: [card(Suit.Bells, 7)], [PlayerSide.Cpu]: [] },
      tricksPlayed: 5,
    })
    const ui = createRoundUiState(round)
    expect(ui.cpuFault).toBe('noLegalMove')
    expect(ui.round.currentTrick).toHaveLength(0)
  })
})
```

- [x] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: non-zero exit, failing to resolve `../roundReducer`.

- [x] **Step 3: Implement `roundReducer.ts`**

Structure, in order: imports → the exported shapes → `roundReducer` → private helpers → nothing else. Three rules the implementation must hold:

1. **No suit or rank comparison anywhere.** `legalMoves` decides what is playable, `playCard` what commits, `chooseCpuMove` the opponent's move. `sameCard`/`containsCard` from the barrel do every equality check.
2. **The trick winner is derived, never recomputed** — a trick resolved iff `after.tricksPlayed > before.tricksPlayed`, and the winner is whichever side's `tricksWon` rose. Do not call `resolveTrickWinner`; it would need a trump suit this layer should not be choosing.
3. **The CPU advance guards `legalMoves(...).length === 0` before calling `chooseCpuMove`**, setting `cpuFault: 'noLegalMove'`. A `playCard` rejection of a heuristic move sets `cpuFault` to the bubbled `IllegalMoveReason` — a defensive branch, unreachable through today's engine and deliberately carried without a test rather than faked with a contrived fixture.

Types exactly as `plan.md` Part 2 → Data shapes declares them: `ResolvedTrick`, `RoundUiState`, `CpuFault`, `RoundUiActionKind`, `RoundUiAction`, `createRoundUiState`, `roundReducer`.

Behaviour per action:

- `TapCard` — ignored when it is not the player's turn, or `resolvedTrick`/`prompt`/`cpuFault` is set, or the round is complete. If `armed` is the same card: rank `CardRank.Fox` or `CardRank.Woodcutter` → set `prompt`, clear `armed`; otherwise commit. Any other card → set `armed`, clear `rejection`.
- `ChooseAbility` — commits `prompt`'s card with that `AbilityChoice`; no-op when `prompt` is null.
- `CancelSelection` — clears `armed` and `prompt`.
- `CarryOn` — clears `resolvedTrick`, then advances the opponent if it is now their turn; no-op when the round is complete (the mount calls `onComplete` for that case).

A commit runs `playCard`, sets `rejection` and returns the input state's `round` **by reference** on `{ ok: false }`, and on success derives `resolvedTrick`; if the trick did not resolve, the player led, so advance the opponent in the same commit.

- [x] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts; npm run typecheck`
Expected: Vitest reports 13 passed, 0 failed; typecheck exits 0.

- [x] **Step 5: Confirm this module stayed pure and within budget**

Run: `Select-String -Path src\app\warCouncil\roundReducer.ts,src\app\warCouncil\labels.ts,src\app\warCouncil\fanLayout.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"; (Get-Content src\app\warCouncil\roundReducer.ts | Measure-Object -Line).Lines`
Expected: zero `Select-String` hits; the line count is reported and under 200.

---

## Phase 3 — The shell and shared card rendering

The full-viewport grid comes first, before any content, because `game-ux` is explicit that retrofitting a no-scroll shell around a laid-out screen is the expensive order. Then the two components every zone shares. Read `.claude/skills/game-ux/references/full-viewport-layout.md` before writing the CSS. The phase boundary is safe because nothing yet mounts these components — `App.tsx` is still the placeholder, so the app renders exactly as it did before.

### Task 8: Prepare the document for a non-scrolling app ✓

- Skill: `react-frontend`

**Files:**

- Modify: `index.html:6`
- Modify: `src/styles/global.css:11-14`

- [x] **Step 1: Add `viewport-fit=cover` to the viewport meta**

Without it, every `env(safe-area-inset-*)` resolves to zero and the shell's safe-area padding silently does nothing on a notched device.

Replace `index.html:6`:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

with:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [x] **Step 2: Remove `min-height: 100vh` and stop the document scrolling**

`100vh` is measured against the large viewport, so on mobile it is taller than the visible area and pushes the bottom of the layout under the address bar — the exact anti-pattern `game-ux` names. The shell owns its own height in `dvh`, so `body` needs no height at all.

Replace the `body` rule in `src/styles/global.css`:

```css
body {
  margin: 0;
  min-height: 100vh;
}
```

with:

```css
body {
  margin: 0;
  /* The game shell owns its own height in dvh; the document itself never scrolls. */
  overflow: hidden;
}
```

- [x] **Step 3: Confirm no `vh` or `vw` unit survives anywhere in the source**

Run: `Select-String -Path src\**\*.css,src\**\*.tsx,index.html -Pattern "\d(vh|vw)\b"`
Expected: zero hits.

Confirmed zero hits.

- [x] **Step 4: Static gates**

Run: `npm run typecheck; npm run format:check`
Expected: both exit 0. If `format:check` fails on the edited files, run `npm run format` and re-check.

Confirmed at the Phase 3 end-of-phase verification block below: `typecheck` exits 0; repo-wide `format:check` still flags 20 pre-existing files outside this phase's scope (`.docs/**`, `src/battle/**`, `src/vanguard/**`, Phase 2's `labels.test.ts`) — untouched, per the file-scope constraint. Every file this phase created or edited (`index.html`, `src/styles/global.css`, `warCouncil.css`, `warCouncilCards.css`, `SuitMark.tsx`, `PlayingCard.tsx`) passes `prettier --check` scoped to just those paths.

### Task 9: Add `src/app/warCouncil/warCouncil.css` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/warCouncil.css`

- [x] **Step 1: Write the shell grid and the token table**

Transcribe the palette, the `clamp()` sizes, the felt treatment, the fan and card styling, the plates, the well marking, and the prompt layout from `mockup.html`'s `<style>` block, renaming every custom property with a `wc-` prefix and every class with a `wc-` prefix. `plan.md` Part 2 → Data shapes carries the authoritative token table; the mockup carries everything else.

Non-negotiable in this file:

```css
.wc-shell {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: 'status' 'table' 'hand';
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  box-sizing: border-box;
  color-scheme: dark;
}
```

Four details the mockup settled that are easy to lose:

- **The fan reserves its own room.** Card rotation and lift are transforms and do not affect layout size, so the shell's `overflow: hidden` crops them unless the fan container has explicit height and padding: `min-height: calc(var(--wc-card-w) * 1.5 + 2.1rem); padding: 1.3rem 0 0.6rem;`.
- **`1fr` belongs to the table, `auto` to the two bands.** Reversed, the hand grows and the play area collapses at short viewports.
- **The table is `grid-template-columns: 1fr auto 1fr`** with the decree pile in column 1 (`justify-self: start`) and the trick well in column 2, so the well stays centred on the felt while the pile never overlaps it.
- **Interactive controls clear 44px and use `:focus-visible`**, with hover rules inside `@media (hover: hover)` and `touch-action: manipulation`, per `react-frontend` § *Accessibility and input*. Honour `prefers-reduced-motion` for the card transition and the carry-on hint pulse.

- [x] **Step 2: Confirm the file is within budget and formatted**

Run: `(Get-Content src\app\warCouncil\warCouncil.css | Measure-Object -Line).Lines; npm run format:check`
Expected: line count reported; `format:check` exits 0. A CSS file over 400 lines is blocking — split per-zone rules into a sibling stylesheet imported by the same component if it happens.

The combined stylesheet was 581 lines, over budget — split into `warCouncil.css` (368 lines: tokens, shell, status band, felt/table, hand container) and `warCouncilCards.css` (220 lines: card face, ability prompt, round-over panel). `format:check` deferred to the Phase 3 end-of-phase verification block.

### Task 10: Add `src/app/warCouncil/SuitMark.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/SuitMark.tsx`

- [x] **Step 1: Write the component and its symbol sheet**

Two exports, both components, so `react-refresh/only-export-components` stays quiet: `SuitSymbolSheet` renders the three `<symbol>` definitions once (mounted by `WarCouncilRound`), and `SuitMark` references one with `<use>`. The `s-bells` / `s-keys` / `s-moons` ids bind by string — a rename type-checks cleanly and renders nothing, so this task owns both sides of that binding and nothing else may introduce a fourth id.

Transcribe the three paths verbatim from `mockup.html`'s `<svg>` block. Every mark is `stroke="currentColor" fill="none"` so the suit hue comes from CSS, and the sheet is `aria-hidden` with zero size.

```ts
interface SuitMarkProps {
  readonly suit: Suit
  readonly className?: string
}
```

`SuitMark` renders `aria-hidden="true"` and `focusable="false"` — the suit is always carried in the surrounding control's accessible name, so announcing the glyph would duplicate it.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

Confirmed at the Phase 3 end-of-phase verification block below.

### Task 11: Add `src/app/warCouncil/PlayingCard.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/PlayingCard.tsx`

- [x] **Step 1: Write the component**

One card with three renderings, per `plan.md` Part 2 → Data shapes' `PlayingCardProps`. `variant` is what keeps "a played card is a record, not a choice" to a single prop instead of three near-duplicate components: `hand` is interactive and full width; `table` and `pile` render at `--wc-plate-card-w`, are `disabled`, and carry `tabIndex={-1}` so they never enter the keyboard path.

Requirements:

- The element is always a `<button type="button">`, and its accessible name is `cardAccessibleName(card)` from `labels.ts` — this is what AC5's role-and-label queries bind to.
- The visible rank, the `SuitMark`, and the ability pip are all `aria-hidden`, so the name is announced once and cleanly.
- The ability pip renders for the five ranks in `RANK_NAME` and is otherwise blank. It replaces a printed ability name, which cannot fit at this card width without becoming unreadable — the full name lives in the accessible name and in `HandFan`'s hint.
- `illegal` sets the `disabled` attribute; `armed` sets `aria-pressed="true"`.
- `style` is applied as given, carrying `fanPlacement`'s transform from `HandFan`. This component computes no geometry of its own.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

Confirmed at the Phase 3 end-of-phase verification block below.

---

## Phase 4 — The zones

One component per zone, each rendering state it is handed and deciding nothing. `HandFan` is the only one with behaviour of its own — the roving tabindex — so it is the only one carrying a component test at this stage. The phase ends type-checking with every zone built but still unmounted, so the running app is unchanged.

### Task 12: Add `src/app/warCouncil/RoundStatusBand.tsx` — AC4 ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/RoundStatusBand.tsx`

- [x] **Step 1: Write the component**

Per `RoundStatusBandProps` in `plan.md`, and the layout of `mockup.html`'s top band: an opponent plate on one edge — a face-down card stack (`aria-hidden`, decorative) plus a held count — and a three-cell scoreboard on the other, reading your tricks, the trick number, and their tricks. The band is a `<header>`; the scoreboard is a labelled group. Trick number is `Math.min(tricksPlayed + (roundComplete ? 0 : 1), 13)` — the `roundComplete` prop exists so the final trick does not display as trick 14. Counts use `font-variant-numeric: tabular-nums` so they do not jitter as they change. Nothing here is hover-only.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 13: Add `src/app/warCouncil/DecreePile.tsx` — AC3 ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/DecreePile.tsx`

- [x] **Step 1: Write the component**

Per `DecreePileProps`, and `mockup.html`'s felt-left pile: the decree card face-up in `variant="pile"`, two decorative face-down backs offset behind it, a `<suit> is trump` chip carrying a `SuitMark` and the suit name, and the draw-pile count. This lives on the felt rather than in a corner plate — the developer moved it there because trump is the most consulted value in a trick-taking game and a corner is where it gets occluded.

AC3 needs no extra wiring: `decree` and `trumpSuit` are read straight from round state on every render, so a Fox exchange — which `playCard` applies before the trick resolves — updates both immediately.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 14: Add `src/app/warCouncil/TrickWell.tsx` — AC2 ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/TrickWell.tsx`

- [x] **Step 1: Write the component**

Per `TrickWellProps`. Three states, all in the faintly-marked well of `mockup.html`'s felt centre:

- `resolvedTrick` set — both cards in `[lead, follow]` order, each labelled by side, the winner's card marked, and a line naming who took it. This is the state that makes AC2 real: `playCard` clears `currentTrick` the instant the second card lands, so without holding the resolved trick the winning card would never be visible.
- `currentTrick` non-empty — the led card labelled by side, and a line naming what was led.
- both empty — a line saying the table is the player's to lead.

Cards render `variant="table"`. Side labels come from a local map, not from `PlayerSide` values directly, so "Them" is copy rather than an engine string leaking into the UI.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 15: Add `src/app/warCouncil/HandFan.tsx` — AC1 ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/HandFan.tsx`
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx`

- [x] **Step 1: Write the component**

Per `HandFanProps`. Renders every card in `hand` as a `PlayingCard` with `variant="hand"`, positioned by `fanPlacement(index, hand.length, armed)` — this component computes no geometry itself. A card is `illegal` when `interactive` is false or `containsCard(legal, card)` is false, so legality is the engine's answer, never a local suit comparison. The hint line above the fan is the `hint` prop, rendered in a live region so a rejection is announced.

The roving tabindex, per `game-ux`:

- Local `useState` holds the focused position; `useRef` holds the button elements.
- Exactly one card carries `tabIndex={0}` and the rest `-1`, so the whole hand is one tab stop rather than thirteen.
- Arrow keys move the focus **among the legal cards only** and call `.focus()` on the target in the same handler — a `disabled` button cannot take focus, so illegal cards are skipped rather than becoming dead stops. `Home`/`End` jump to the first and last legal card.
- `Escape` calls `onCancel`. `Enter` and `Space` need no handling — they activate the focused `<button>` natively, which is `onTap`.
- Focus movement happens inside the keydown handler, not in an effect. There is no `useEffect` in this component.
- Clamp the focused position against `hand.length`, which shrinks by one after every play.

- [x] **Step 2: Write the component test**

First `.test.tsx` in the repository, so it is also the proof the `dom` Vitest project works. `afterEach(cleanup)` is explicit per file rather than a `setupFiles` entry — a global setup file would import `@testing-library/react` into all 34 node-environment specs and break them.

**Two corrections made to the block below as shipped, both mechanical, no assertion weakened:** (1) the given import line pulled in `PlayerSide` from the barrel but never used it — dropped, since `noUnusedLocals` fails the build on it regardless of the component; (2) `card(Suit.Moons, 11)` is `CardRank.Monarch`, one of the five ability-bearing ranks Task 4's already-shipped `labels.ts` decorates (`RANK_NAME` keys `[1, 3, 5, 9, 11]`), so its correct accessible name is `'11 of Moons (Monarch)'`, not the bare `'11 of Moons'` the three affected queries expected — corrected the three literal strings to the name `cardAccessibleName` actually produces, per the existing, tested Phase 2 behaviour, changing no other line. Flagging both as likely `/fb-issue` material for the planner.

```tsx
/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import HandFan from '../HandFan'
import { card } from './roundFixture'

afterEach(cleanup)

const HAND = [card(Suit.Bells, 7), card(Suit.Keys, 3), card(Suit.Moons, 11)]

function renderFan(overrides = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <HandFan
      hand={HAND}
      legal={[card(Suit.Moons, 11)]}
      armed={null}
      interactive
      hint="Follow their lead"
      onTap={onTap}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onTap, onCancel }
}

describe('HandFan', () => {
  it('names every card by rank and suit', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
    expect(screen.getByRole('button', { name: '11 of Moons' })).toBeDefined()
  })

  it('disables the cards the engine excluded', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '11 of Moons' })).toHaveProperty('disabled', false)
  })

  it('reports a tap on a legal card', () => {
    const { onTap } = renderFan()
    screen.getByRole('button', { name: '11 of Moons' }).click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Moons, 11))
  })

  it('keeps the whole hand to a single tab stop', () => {
    renderFan({ legal: HAND })
    const stops = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('cancels the selection on Escape', () => {
    const { onCancel } = renderFan({ armed: card(Suit.Moons, 11) })
    const group = screen.getByRole('group', { name: /hand/i })
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [x] **Step 3: Confirm the DOM project collects and passes it**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx`
Expected: exits 0, 5 passed, 0 failed, running under the `dom` project. `Cannot find module '@testing-library/react'` means Task 1 did not land; "document is not defined" means Task 2's `dom` project is not matching this file.

Confirmed: exits 0, `Test Files 1 passed (1)`, `Tests 5 passed (5)`, under the `dom` project.

- [x] **Step 4: Confirm nothing regressed and the file is within budget**

Run: `npx vitest run src/app/warCouncil; npm run typecheck; (Get-Content src\app\warCouncil\HandFan.tsx | Measure-Object -Line).Lines`
Expected: Vitest 0 failed across both projects; typecheck exits 0; line count reported and under 200.

Confirmed: `Test Files 4 passed (4)`, `Tests 29 passed (29)`; typecheck exits 0; `HandFan.tsx` is 138 lines.

### Task 16: Add `src/app/warCouncil/AbilityPrompt.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/AbilityPrompt.tsx`

- [x] **Step 1: Write the component**

Per `AbilityPromptProps`, rendered on the felt rather than in a modal so the hand stays visible while choosing — that is deliberate, because the choice is *which of my cards to give away*. Two shapes, both from `mockup.html`:

- **Fox** — a line explaining that the chosen card becomes the decree and `decree` comes back in return, then one `PlayingCard` per card in `hand`, each emitting `{ kind: AbilityChoiceKind.FoxExchange, handCard }`, plus a "Keep the decree" control emitting `{ kind: AbilityChoiceKind.FoxDecline }`.
- **Woodcutter** — a line naming `drawnCard`, then the drawn card flagged as such plus every card in `hand`, each emitting `{ kind: AbilityChoiceKind.WoodcutterDiscard, discard }`.

`onCancel` on `Escape`. The `AbilityChoice` variants are the engine's own, constructed with `AbilityChoiceKind` rather than string literals. The component picks nothing itself — a Fox with an empty `hand` renders decline as the only option, which is exactly what the engine accepts when the Fox was the last card in hand.

Implementation note: since the prompt sits on the felt alongside a now-non-interactive hand, the tapped card's button is disabled the instant the prompt opens and loses focus to the document — `Escape` would otherwise never bubble to anything. The wrapping `<div>` focuses itself on mount via a callback ref (`focusOnMount`), which is imperative DOM work at attach time, not a lifecycle effect, so the "no effect in this feature" constraint holds.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 17: Add `src/app/warCouncil/RoundOverPanel.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/RoundOverPanel.tsx`

- [x] **Step 1: Write the component**

Per `RoundOverPanelProps`, matching `mockup.html`'s round-over panel: a heading, a two-row table of each side's tricks and points, and one control calling `onFinish`. It computes nothing — `score` arrives already computed by the engine's `scoreRound`, because `tricksToPoints`' bands are a rule and this component owns no rules. Tabular numerals on both columns.

Implementation note: `mockup.html`'s own dev-harness round-over panel has no button — it never needed to satisfy `WarCouncilMountProps.onComplete`. The plan's `RoundOverPanelProps` and Task 18's own `WarCouncilRound.test.tsx` (`getByRole('button', { name: /finish/i })`) both require one, so a "Finish the round" control was added, styled with the already-established `wc-decline` treatment rather than inventing a new visual.

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 5 — The mount, the host, and the docs

The zones get composed into a mount honouring SCRUM-37's contract, wired into `App.tsx` so the round is playable, and the stub it replaces is deleted. This is the first phase whose output is visible in a browser. It ends with the module's implementation doc updated, so the repository's own record of what exists is current before Final verification.

### Task 18: Add `src/app/warCouncil/WarCouncilRound.tsx` — the mount ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Write the mount**

Default-exports `WarCouncilRound({ initialState, onComplete }: WarCouncilMountProps)`. Imports `./warCouncil.css` **and** `./warCouncilCards.css` — Phase 3 split the stylesheet in two to stay under the 400-line budget; both must be imported or the card face, ability prompt, and round-over panel render unstyled. Owns exactly one piece of state:

```ts
const [ui, dispatch] = useReducer(roundReducer, initialState, createRoundUiState)
```

The third argument is the lazy initializer, and it is what plays the opponent's opening lead when they lead trick 1. It is pure, so StrictMode's double-invocation recomputes an identical value.

Renders the `.wc-shell` grid with `SuitSymbolSheet` mounted once, `RoundStatusBand` in the status area, the felt holding `DecreePile` plus one of — in priority order — the fault message, `RoundOverPanel`, `AbilityPrompt`, or `TrickWell` — and `HandFan` in the hand area. `legalMoves(ui.round, PlayerSide.Player)` is computed inline for `HandFan`'s `legal` prop; the hint string is derived from `ui` and includes `ILLEGAL_MOVE_MESSAGE[ui.rejection]` when a rejection is set and `cardAccessibleName(ui.armed)` when a card is armed.

Three rules:

- **No `useEffect`.** Every transition is a user event or the lazy initializer. An effect dispatching the opponent's turn would call `setState` synchronously in an effect body, which fails this project's `react-hooks/set-state-in-effect` rule — `.docs/implementation/app.md` records SCRUM-37 hitting exactly that — and would double-fire under StrictMode.
- **`onComplete` is called from a handler, never an effect**, so it cannot double-fire on a second mount. The carry-on handler reads the current render's state: when `ui.round.phase === RoundPhase.Complete`, call `onComplete({ finalState: ui.round, score: scoreRound(ui.round.tricksWon) })` and do not dispatch; otherwise dispatch `CarryOn`.
- **Tapping the felt carries on** while a resolved trick is showing, matching the mockup, and `Enter` does the same.

- [x] **Step 2: Write the component test — AC5**

Shipped with four corrections to the block as originally given, none of them a weakened assertion:

1. **`'11 of Moons'` → `'11 of Moons (Monarch)'`** and **`'5 of Moons'` → `'5 of Moons (Woodcutter)'`** — the two corrections named by this task, for the same reason Phase 4 already hit in `HandFan.test.tsx`: both ranks are decorated by `labels.ts`'s `RANK_NAME`.
2. **Disambiguated the Fox-exchange query.** Once the prompt opens, `AbilityPrompt` renders a `PlayingCard` per remaining hand card alongside the now-non-interactive `HandFan`, so `'5 of Moons (Woodcutter)'` exists twice. Rather than soften the assertion, `AbilityPrompt.tsx` gained `role="group" aria-label="Choose what the card does"` on its wrapping `<div>` (both the Fox and the Woodcutter branch) — a component change, which the task explicitly permits as the better fix — and the test scopes the click with `within(screen.getByRole('group', { name: 'Choose what the card does' }))`.
3. **Same duplicate-name problem, undocumented by the task, in "plays a legal card on the second tap":** the committed 7 of Bells completes the trick immediately (both fixture hands hold exactly one Bells card, and Bells is trump), so the played card is still visible — condensed, disabled — in `TrickWell`'s held reveal (AC2's "hold the resolved trick" behaviour, working as designed). A bare `queryByRole('button', { name: '7 of Bells' })` therefore finds *that* card instead of correctly reporting "gone from the hand". Scoped the query to the hand's own `role="group"` region (`within(screen.getByRole('group', { name: /hand/i }))`) instead of weakening the assertion.
4. **Every `element.click()` replaced with `fireEvent.click(...)`.** Confirmed empirically: a raw `.click()` dispatches a real event and the handler runs (the Phase 4 `HandFan` spy-based tests pass with it), but under React 19 + jsdom the resulting state update is not guaranteed to flush synchronously outside an `act()` scope — the DOM still showed the pre-click `aria-pressed` value immediately after a raw click in this file. `fireEvent.click` wraps its dispatch in `act()`, so it is used for every click that a following assertion depends on.

Flagging all four as `/fb-issue` material for the planner, same as Phase 4's precedent.

- [x] **Step 3: Run the mount's spec**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`
Expected: exits 0, 5 passed, 0 failed.

Confirmed: `Test Files 1 passed (1)`, `Tests 5 passed (5)`.

- [x] **Step 4: Confirm budget and no stray effect**

Run: `Select-String -Path src\app\warCouncil\*.tsx -Pattern "useEffect|useLayoutEffect"; (Get-Content src\app\warCouncil\WarCouncilRound.tsx | Measure-Object -Line).Lines`
Expected: zero `Select-String` hits — the design is deliberately effect-free; line count reported and under 200.

Confirmed: zero hits; `WarCouncilRound.tsx` is 148 lines.

### Task 19: Wire a minimal dev host into `src/App.tsx` and delete the stub ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx`
- Delete: `src/app/stubs/WarCouncilStub.tsx`

- [x] **Step 1: Replace the placeholder with the host**

Deals one round and mounts the real UI, so the round is playable by hand and QA can drive it in a browser. `.docs/implementation/app.md` assigns real orchestrator wiring to SCRUM-34, which should **delete** this host rather than extend it.

- Keep the existing `useState<AppMode>(AppMode.Campaign)` slot and its deliberately-absent setter — SCRUM-37 put it there on purpose and `noUnusedLocals` fails if a setter is destructured unused.
- Remove the "Empty slate. Nothing is built here yet." copy, which is no longer true.
- Deal in a lazy initializer: `useState(() => dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random))`, importing the dealer constant from `src/battle` rather than choosing a side here. `Math.random` is correct at this call site — the engine takes `rng` injected and holds none of its own.
- Hold the `WarCouncilRoundResult` in state and render both sides' points as text once it arrives.
- Import the component directly (`./app/warCouncil/WarCouncilRound`); the folder has no barrel by design.

Note honestly in the summary: the deal initializer is **not** idempotent, so StrictMode's double-invocation deals a hand React then discards. That wastes randomness in development only and can never produce two live rounds.

Confirmed as built: `mode` is kept and rendered (in the round-complete view, so `noUnusedLocals` stays satisfied) rather than in the playing view — while a round is in progress, `App` renders `WarCouncilRound` alone with no sibling markup, so the mounted `.wc-shell` fills the viewport undisturbed.

- [x] **Step 2: Delete `WarCouncilStub.tsx`**

Pre-authorised by `.docs/implementation/app.md` § *The two stubs* — "SCRUM-28/29 replace them wholesale". It is referenced by no source file, and the real mount now proves `WarCouncilMountProps` compiles. `VanguardStub.tsx` stays.

Run: `Remove-Item src\app\stubs\WarCouncilStub.tsx; Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "WarCouncilStub"`
Expected: the file is gone and the grep returns zero hits.

Confirmed: file removed, zero grep hits.

- [x] **Step 3: Static gates**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. A `react-refresh/only-export-components` error here means a non-component export crept into a `.tsx` file.

Confirmed: both exit 0.

### Task 20: Update the implementation docs ✓

- Skill: `implementation-doc-writer`

**Files:**

- Modify: `.docs/implementation/app.md`
- Modify: `.docs/implementation/README.md`

- [x] **Step 1: Update `app.md` incrementally, never wholesale**

Per the `implementation-doc-writer` skill: append to the existing sections rather than replacing them, so SCRUM-37's contributions survive.

- **Status** `scaffold` → `partial`; append `SCRUM-28` to **Built by**.
- Add **Key types & exports** rows for `WarCouncilRound`, `roundReducer`, `RoundUiState`, `CpuFault`, `labels.ts`'s exports, and `fanLayout.ts`'s exports.
- Add **How it works** subsections for: the full-viewport shell and why `dvh`; tap-twice as a single `TapCard` action; why the feature has no effects; deriving the trick winner from the tricks-won delta; and the two `cpuFault` cases, including that `chooseCpuMove` throws on an empty legal set.
- Move these out of **Deferred**: "Neither real game UI exists" (now partial — Vanguard UI remains), "No `.tsx` render or interaction tests" (the `dom` Vitest project now exists), and `WarCouncilStub`'s entry (deleted).
- Add to **Deferred**: the `App.tsx` host awaiting SCRUM-34's replacement, and that no automated test covers the no-scroll layout.
- Update the § *The two stubs* text so it no longer describes a file that does not exist.

- [x] **Step 2: Refresh the README row and verify every named symbol exists**

Run: `Select-String -Path src\app\warCouncil\*.ts,src\app\warCouncil\*.tsx -Pattern "export (function|const|interface|type) (WarCouncilRound|roundReducer|createRoundUiState|fanPlacement|cardAccessibleName)"`
Expected: a hit for each name the doc claims. The skill requires every claim under **How it works** to trace to a real file and function.

Confirmed as run: 5 hits — `fanPlacement` (its `FanPlacement` interface and its function), `cardAccessibleName`, `createRoundUiState`, `roundReducer`. `WarCouncilRound` does **not** match this pattern, exactly as the task's own note anticipates — it is a **default** export (`export default function WarCouncilRound(...)` in `WarCouncilRound.tsx`), which this grep's `export (function|const|interface|type) NAME` shape cannot match. Confirmed by reading the file rather than widening the grep or dropping the doc's true claim. README row refreshed: `src/app/` → Status `partial`, Built by `SCRUM-37, SCRUM-28`.

---

## Phase 6 — Final verification

No production changes. Only checks that the cumulative work is clean, plus the browser verification that no test can perform.

### Task 21: Confirm the pure-logic boundary and the shell's unit discipline ✓

- Skill: `react-frontend`

**Files:** *(no file changes — verification only)*

- [x] **Step 1: Confirm the three pure modules import no React and touch no DOM global**

Run: `Select-String -Path src\app\warCouncil\labels.ts,src\app\warCouncil\fanLayout.ts,src\app\warCouncil\roundReducer.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits.

Confirmed (targeted residual fixes pass): zero hits.

- [x] **Step 2: Confirm no `vh`/`vw` unit and no hard-coded palette literal escaped into a component**

Run: `Select-String -Path src\**\*.css,src\**\*.tsx,index.html -Pattern "\d(vh|vw)\b"; Select-String -Path src\app\warCouncil\*.tsx -Pattern "#[0-9a-fA-F]{6}"`
Expected: zero hits for both. Every colour belongs to `warCouncil.css`'s token table; every dimension is `dvh`, `%`, `rem`, or `vmin`.

Confirmed: zero hits for both.

- [x] **Step 3: Confirm the SVG symbol ids match between definition and use**

Run: `Select-String -Path src\app\warCouncil\SuitMark.tsx -Pattern "s-bells|s-keys|s-moons"`
Expected: six hits — three `<symbol id>` definitions and three `<use href>` references, all inside this one file. A mismatch renders nothing and reports no error.

Actual: **nine** hits, not six — `SuitMark.tsx` shipped with an intermediate `SUIT_SYMBOL_ID` map (three more string literals: `[Suit.Bells]: 's-bells'`, etc.) that this task's `Expected:` line did not anticipate. All nine agree with each other (3 map entries feeding 3 `<use href>` refs, 3 `<symbol id>` definitions), so the ids still match correctly — this is a stale count in the task's own `Expected:` line from an earlier phase, not a defect, and out of this pass's seven-item Fix list, so left as a flagged observation rather than edited.

### Task 22: Static gates and the full suite ✓

- Skill: `react-frontend`

**Files:** *(no file changes — verification only)*

- [x] **Step 1: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0. Vitest reports 0 failed across both projects, with **at least 34 files and 268 tests in the `node` project** — the pre-change baseline, which must not have shrunk — plus the two new `.test.tsx` files in the `dom` project.

Confirmed (targeted residual fixes pass, explicitly directed to re-run this block myself): `typecheck` exits 0; `lint` exits 0, no warnings; `format:check` fails on exactly the same 15 pre-existing out-of-scope files as every prior phase (untouched by this contract); `npm test` run **five consecutive times**, every run `Test Files 40 passed (40)`, `Tests 314 passed (314)` — `node` 37/292 (unchanged), `dom` 3/22 (up from 3/20: `AbilityPrompt.test.tsx`'s corrected arrow-key spec split into two real tests, and `WarCouncilRound.test.tsx` gained the AC4 trick-count assertion). No flake across the five runs — the stray scratch file that caused an earlier 4-of-5 is confirmed absent from the tree.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a lint failure surfaces here as a build failure.

Confirmed: exits 0. `dist/index.html` 0.48 kB, `dist/assets/index-*.css` 10.35 kB, `dist/assets/index-*.js` 209.76 kB.

### Task 23: Browser verification — the checks no test can make ✓

- Skill: `react-frontend`

**Files:** *(no file changes — verification only)*

QA owns this task. jsdom has no layout engine, so nothing in the suite can detect a screen that scrolls, crops, or overflows; and every check below has a right answer, which is what makes it QA's rather than a developer observation.

- [x] **Step 1: Serve the app and drive it through the `chrome-devtools` MCP**

Start the dev server detached on the deterministic port per `.claude/workflow/web-project.md`, checking first whether one is already listening. Then, at **three viewport sizes** — a short laptop window (about 1280×720), a phone in portrait (about 390×844), and the same phone in landscape (about 844×390):

- Confirm `document.scrollingElement.scrollHeight <= window.innerHeight` and the same for width — **the document must not scroll at any of the three**.
- Confirm every zone's content is fully visible: the whole fan including the bottom edge of every card, the scoreboard, the decree card, the trump chip, and the trick well.
- Confirm the console is clean — no errors, no warnings, and no React key or `set-state-in-effect` complaints.

Report the three sizes and the measured values. Landscape is where a bottom-anchored hand and a `1fr` play area compete hardest, so it is the one most likely to fail.

**Result — no scroll at any of the three.** 1280×720 → `scrollHeight/innerHeight` 720/720, `scrollWidth/innerWidth` 1280/1280. Phone landscape 844×390 (exact) → 390/390, 844/844. Phone portrait → **achieved at 500×844, not 390×844**: the `chrome-devtools` resize tool floors window width at 500px on this machine. QA confirmed `--wc-card-w`'s `clamp(2.9rem, 6.2vmin, 4.3rem)` resolves to its `2.9rem` floor at both 390 and 500 width, making the two layout-equivalent for this measurement → 844/844, 500/500. Fan fully visible at both phone orientations: portrait `maxBottom` 840.3 ≤ 844, landscape 386.3 ≤ 390. Console clean on load, after a hard reload, and throughout play.

- [x] **Step 2: Play a round through and confirm the functional behaviour**

- Tap a legal card once — it lifts and the hint names it. Tap it again — it commits and leaves the hand.
- Confirm an illegal card is disabled and does not respond.
- Confirm the resolved trick stays visible with its winner marked until the table is tapped.
- Confirm the trick counts increment and the trump chip changes when a Fox exchange lands.
- Tab into the hand once and cross it with the arrow keys — confirm one tab stop, not thirteen, and that `Escape` clears the selection.
- Play to the thirteenth trick and confirm the round-over panel shows both sides' tricks and points.

Expected: every behaviour as described, console clean throughout.

**Result — every behaviour confirmed live, console clean throughout.** Tap-twice arms then commits; illegal cards `disabled` and inert; the resolved trick holds with its winner until carried on; trick counts increment (`YOU 0` → `YOU 1` on the first resolution); the trump chip changed `Bells is trump` → `Moons is trump` the instant a Fox exchange landed, and again on a CPU-triggered exchange; one tab stop across the hand, arrow keys skipping illegal cards, `Escape` clearing the selection; the round-over panel showed both sides' tricks and points, and `Finish the round` fired `onComplete` exactly once with a matching score.

**Two blocking keyboard defects were found here that no test caught** — both only by driving the app live, and both fixed:

1. **A keyboard-only player could not leave a held trick.** The felt `<section>` had an `onKeyDown` but no `tabIndex`, and every other element on screen was `disabled` at that moment, so the handler was dead code. Fixed with a real focusable control inside `TrickWell` (now a native `<button>`).
2. **`AbilityPrompt`'s roving tabindex updated `tabindex` but never moved real focus**, because an inline callback ref re-fired `.focus()` on the group on every re-render. A player forced to play a Fox or Woodcutter was stuck in an unbreakable loop. Fixed with a `contains(document.activeElement)` guard.

Final confirmation: **a complete round played start to finish by keyboard alone**, including two live ability prompts (a Fox exchange and a Woodcutter discard), reaching the round-over panel and `onComplete`. `Enter` and `Space` each advanced exactly one trick — no double-dispatch.

### Task 24: Write the PR description ✓

- Skill: `none — a hand-off document, no code`

**Files:**

- Create: `.claude/contract/SCRUM-28-war-council-ui/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- A link to `plan.md` and to `mockup.html` in this folder, naming the mockup as the approved specification.
- A summary of the change: the new `src/app/warCouncil/` module, the full-viewport shell, tap-twice, the DOM test-environment split, the `App.tsx` dev host, and the deleted stub.
- The three new devDependencies with their justification, and an explicit statement that no runtime dependency was added.
- Verification results: the actual `typecheck` / `lint` / `format:check` / `npm test` / `build` outcomes with the real test counts, and QA's three viewport sizes with the measured scroll values.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes".
- New conventions introduced, for future contributors: the two-project Vitest layout and where a `.test.tsx` must live to be collected; the `wc-` CSS token and class prefix; that `src/app/warCouncil/` is deliberately effect-free; and that this is the repository's first per-component stylesheet.
- Known debt carried deliberately: the `cpuFault` `IllegalMoveReason` branch is defensive and untested because it is unreachable through today's engine; `chooseCpuMove` throws rather than rejecting on an empty legal set, which the reducer guards around rather than fixing in the engine; and no automated test covers the no-scroll layout.

Written after the review fix pass below, so its verification numbers were the post-fix ones at the
time (`Test Files  40 passed (40)`, `Tests  312 passed (312)`), not the pre-fix numbers QA originally
reported. **Superseded again by the targeted residual fixes pass documented below** — current
numbers are `Test Files  40 passed (40)`, `Tests  314 passed (314)`, confirmed green across five
consecutive `npm test` runs; `pr-description.md` itself carries the current numbers.

**Post-review fix pass (against this Phase 6), applied in one combined pass per `/fb-apply`'s
max-2-rounds policy:**

Code-Evaluator, Defender, and QA reviewed the full implementation in parallel once, at the end of
every phase above. QA passed everything; Code-Evaluator and Defender each independently found the
same critical accessibility defect (no keyboard path off a resolved trick) plus several others, all
fixed in this pass and re-verified — see `pr-description.md`'s own *Review findings fixed in this
pass* section for the full list:

- Critical/blocking: the resolved-trick "carry on" affordance had no keyboard path at all
  (`WarCouncilRound.tsx`) — fixed with a real, focusable control inside `TrickWell`, covered by a
  new keyboard-only component test.
- The deciding thirteenth trick was never shown before the round-over panel — fixed by branching on
  the held trick before `roundComplete`; `roundReducer.ts`'s `CarryOn` no longer treats a completed
  round as a blanket no-op. `WarCouncilRound.test.tsx`'s affected spec was corrected to the real
  sequence, keeping its load-bearing `toHaveBeenCalledTimes(1)` assertion.
- The fan's hover/armed lift never rendered, because `HandFan` wrote `transform` inline, permanently
  outranking the external hover/armed rules — fixed by writing only `--wc-fan-rot`/`--wc-fan-lift`
  custom properties inline and composing the real `transform` in one CSS rule.
- `AbilityPrompt`'s choice row had no roving tabindex — fixed by extracting `useRovingTabIndex.ts`
  (shared with `HandFan`) and wiring both through it, covered by a new `AbilityPrompt.test.tsx`.
- The rejection hint's `wc-is-reject`/`wc-is-live` classes existed in CSS but were never applied —
  fixed by deriving the class from the same cascade the mockup's own script uses.
- The hand duplicated into the accessible tree while a prompt was open — fixed with `aria-hidden` on
  the now-inert fan while a prompt is showing.
- DRY/convention: `cardKey` was defined identically in `HandFan.tsx` and `AbilityPrompt.tsx` —
  consolidated into `labels.ts`; module-level helper functions declared before their component in
  three files were moved after it, matching every other component in this contract.
- A defensive one-line guard (`hand[index] !== undefined`) was added to `HandFan`'s focusability
  check.

Two Defender findings were explicitly left alone, per the review's own instruction: the raw
`IllegalMoveReason` interpolated into the engine-fault message (deliberately diagnostic), and
`focusedIndex`'s numeric-position fallback across a shrinking hand (already correct).

`.docs/implementation/app.md` was updated incrementally with four new **How it works** subsections
covering the keyboard carry-on path, the held final trick, the fan's CSS-composed transform, and the
shared roving-tabindex hook — plus a `Key types & exports` row each for `cardKey` and
`useRovingTabIndex`.

**Second, targeted residual fixes pass (against a further verification round that found the first
fix pass above closed the keyboard trap in `TrickWell` but introduced an equally severe new one in
`AbilityPrompt`, plus a stray file and two smaller gaps):**

- **`AbilityPrompt.tsx`** — the roving tabindex updated the `tabindex` attribute correctly but never
  moved real `document.activeElement`, because the mount-focus callback ref was a new function
  identity every render, so React re-fired `.focus()` on the group container on every re-render,
  stomping the focus `useRovingTabIndex` had just set — an unbreakable keyboard trap for a
  Fox/Woodcutter-only hand. **Caught by QA driving the app live in Chrome, not by the passing test**
  (`AbilityPrompt.test.tsx`'s arrow-key spec asserted only the `tabindex` attribute). Fixed with a
  guard — refuse to call `.focus()` when the group already contains `document.activeElement` —
  rather than a stable ref identity, since this project's `react-hooks/refs` lint rule forbids
  reading a ref's `.current` synchronously during render (the shape a stable-identity fix would need).
  The test now asserts `document.activeElement` directly and a new Enter/Space-activation assertion;
  both were confirmed to **fail against the old code and pass against the fix** before being trusted.
- **`TrickWell.tsx`** — swapped `<span role="button" tabIndex={0}>` plus its manual `onKeyDown` for a
  plain `<button type="button" onClick>`, matching `RoundOverPanel`'s existing precedent, after
  Code-Evaluator found the double-dispatch concern that motivated the custom element is only real if
  a manual key handler is paired with a native button — nothing required that pairing.
  `warCouncilCards.css`'s `.wc-is-carry-on` gained a minimal button-chrome reset so the browser's
  default button face doesn't reappear. `WarCouncilRound.test.tsx`'s keyboard-carry-on spec now
  activates via `fireEvent.click` rather than re-proving native Enter/Space activation.
- **AC4 test gap closed** — added an assertion to `WarCouncilRound.test.tsx` that the rendered "Tricks
  won" group's text actually changes after a trick resolves, since `roundReducer.test.ts` only ever
  asserted the reducer's internal `tricksWon`, never that the scoreboard displays it.
- **`useRovingTabIndex.ts`** gained a comment documenting the `querySelectorAll('button')` tag-name
  coupling invariant — no code change, per this pass's own instruction.
- **The stray `src/__tests__/zzz-scratch-native-button.test.tsx`** named in this pass's brief was
  already absent from the working tree when this pass began (confirmed via `Get-ChildItem` and `git
  status`) — no deletion was needed, but `npm test` was still run five consecutive times to prove the
  flake is gone rather than assumed.
- **`pr-description.md`** — corrected the overstated `AbilityPrompt` claim from the first fix pass and
  added a "Second verification round" section describing the actual defect, that it was found by live
  browser driving rather than a passing test, and the real fix; re-quoted every gate's numbers.
- **`.docs/implementation/app.md`** — updated the *Carrying on from a held trick* subsection for the
  native-button swap, and added a new *`AbilityPrompt` focuses its own group on mount...* subsection
  for the ref-churn fix. Flag for the next editor: this doc is now 442 lines by raw line count
  (`Get-Content -Raw` split on newline) — a plain `Get-Content | Measure-Object -Line` undercounts it
  at 377 for reasons not investigated here, so use the raw-split form when measuring this file. It
  was already over 400 lines before this pass (404); growing it further without splitting is a
  deliberate, flagged choice for this narrow fix pass, not an oversight — the
  `implementation-doc-writer` skill, not this one, owns whether and how to split it.

---

## Self-review

*(Filled by the planner before hand-off so the executor can confirm coverage.)*

**Spec coverage — every `plan.md` Part 1 "In scope" bullet maps to a task:**

- Full-viewport shell (`100dvh`, `overflow: hidden`, grid, safe-area) — Tasks 8, 9; verified 21, 23.
- Opponent plate and scoreboard, both trick counts (**AC4**) — Task 12.
- Felt table with decree, draw pile, trump chip (**AC3**) — Task 13; trump mutation asserted in Tasks 7 and 18.
- Trick well, current and held-resolved trick (**AC2**) — Task 14; held-reveal behaviour asserted in Task 7.
- Fanned hand, cards as named buttons, illegal disabled (**AC1**) — Tasks 11, 15; geometry in Task 5.
- CSS/text card faces, SVG suit marks, ability pip (**AC6**) — Tasks 10, 11.
- Ability prompts on the felt — Task 16; reducer branches in Task 7.
- Round-over panel and engine-fault state — Tasks 17, 18; fault branch in Task 7.
- Tap-twice, arm/commit/cancel, carry-on — Tasks 7, 15, 18.
- Roving tabindex — Task 15, asserted in its spec and in Task 23.
- Pure reducer plus label and geometry modules — Tasks 4, 5, 7.
- devDependencies and the Vitest project split — Tasks 1, 2.
- Component specs querying by role and label (**AC5**) — Tasks 15, 18.
- `viewport-fit=cover` and the `global.css` changes — Task 8.
- `App.tsx` dev host — Task 19.
- Deleting `WarCouncilStub.tsx` — Task 19.
- `sameCard`/`containsCard` barrel exports — Task 3.
- Implementation docs — Task 20.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, "appropriate error handling", or "similar to Task N" references. Every step is either a concrete code block, a precise edit naming what it replaces, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `roundReducer`, `createRoundUiState`, `RoundUiState`, `RoundUiActionKind`, `RoundUiAction`, `ResolvedTrick`, `CpuFault`, `fanPlacement`, `FanPlacement`, `FAN_ROTATION_STEP_DEG`, `FAN_LIFT_FACTOR`, `FAN_OVERLAP_PX`, `FAN_ARMED_Z_INDEX`, `cardAccessibleName`, `SUIT_NAME`, `RANK_NAME`, `ILLEGAL_MOVE_MESSAGE`, `SuitMark`, `SuitSymbolSheet`, `PlayingCard`, `RoundStatusBand`, `DecreePile`, `TrickWell`, `HandFan`, `AbilityPrompt`, `RoundOverPanel`, `WarCouncilRound`, and the `wc-` CSS prefix are each spelled identically in every task that names them, and each matches `plan.md` Part 2 → Data shapes. The SVG ids `s-bells`/`s-keys`/`s-moons` are introduced and consumed in Task 10 alone and re-checked in Task 21.

**Phase boundary cleanliness:**

- **Phase 1** ends with `typecheck` and `lint` clean and the suite still collecting exactly 34 files / 268 tests — the two engine exports are additive and the config split adds an empty second project.
- **Phase 2** ends with three pure modules and their specs green; nothing imports them yet, so no half-wired consumer exists.
- **Phase 3** ends type-checking with the shell CSS and two shared components built but unmounted; `App.tsx` is untouched, so the running app is byte-for-byte as it was.
- **Phase 4** ends with every zone built and type-checking, `HandFan`'s spec green, and still nothing mounted.
- **Phase 5** is the first phase that changes what the app renders, and it ends with the mount, the host, the stub deletion, and the docs all consistent — no dangling import of the deleted stub, and no doc claim about a symbol that does not exist.
- **Phase 6** changes no production file.
