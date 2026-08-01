import { CONFIG_FAILURE } from '../constants/game'
import { DECK_SIZE, STATION_TYPE } from '../constants/stations'
import type { StationType } from '../constants/stations'

/** The only `configVersion` this build can read. A mismatch is a hard failure,
 *  never a best-effort parse. */
export const CONFIG_VERSION = 1

/** §8.1 — the nine deck-eligible types. STARTING is excluded: §2 ships the five
 *  starting stations as their own component, and generation places them. */
export type DeckStationType = Exclude<StationType, typeof STATION_TYPE.STARTING>
export type DeckComposition = Readonly<Record<DeckStationType, number>>

/**
 * Tuning values the engine and the setup generator are injected with. Every
 * field is a tunable read from rules.json (M2 / M6 / M8 / M17) — none may ever
 * appear as a literal in src/.
 */
export interface RulesConfig {
  /** M2 — nominal arc length of a short railway string, world units. */
  readonly shortStringLength: number
  /** M2 — nominal arc length of a long railway string, world units. */
  readonly longStringLength: number
  /** M6 — permitted deviation from nominal, as a fraction (0.02 = ±2%). Inclusive. */
  readonly arcLengthTolerance: number
  /** M8 — how close a near-touch must be before §10.2 check 10 rejects it, world units. */
  readonly tangencyTolerance: number
  /** M2 — station card footprint (square), world units. Also the search sampling step. */
  readonly cardSize: number
  /** M2 — total border string length, world units. Edge = this / sideCount, so the
   *  perimeter is preserved exactly across every player count (§3, §6). */
  readonly borderPerimeter: number
  /** M2 — mountain closed-loop perimeter, world units. */
  readonly mountainLength: number
  /** M2 — river open-arc length, world units. */
  readonly riverLength: number
  /** M17 — station-type counts, summing to DECK_SIZE. */
  readonly deckComposition: DeckComposition
}

export type ConfigFailureReason = (typeof CONFIG_FAILURE)[keyof typeof CONFIG_FAILURE]

export interface ConfigFailure {
  readonly reason: ConfigFailureReason
  /** Dotted path of the offending key, e.g. "geometry.riverLength". */
  readonly key: string
  readonly detail: string
}

export type ParseResult =
  | { readonly ok: true; readonly config: RulesConfig }
  | { readonly ok: false; readonly failures: readonly ConfigFailure[] }

/** The eight geometry keys, all of which must be finite and > 0. */
const GEOMETRY_KEYS = [
  'borderPerimeter',
  'cardSize',
  'shortStringLength',
  'longStringLength',
  'mountainLength',
  'riverLength',
  'arcLengthTolerance',
  'tangencyTolerance',
] as const

/** tangencyTolerance may legitimately be 0 (exact-touch); every other length may not. */
const ZERO_ALLOWED: ReadonlySet<string> = new Set(['tangencyTolerance'])

const DECK_TYPES: readonly DeckStationType[] = Object.values(STATION_TYPE).filter(
  (type): type is DeckStationType => type !== STATION_TYPE.STARTING,
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * SCRUM-3 AC4 — validates a parsed rules.json payload. Takes `unknown` rather
 * than doing its own fetch or JSON.parse so this module stays pure and inside
 * the src/rules/ boundary; useRulesConfig owns both of those.
 *
 * Never returns a default and never returns a partially-filled config: a
 * defaulted constant plays a differently-tuned game and silently corrupts
 * every conclusion drawn from the session.
 */
export function parseRulesConfig(raw: unknown): ParseResult {
  const failures: ConfigFailure[] = []
  const fail = (reason: ConfigFailureReason, key: string, detail: string): void => {
    failures.push({ reason, key, detail })
  }

  if (!isRecord(raw)) {
    return {
      ok: false,
      failures: [
        {
          reason: CONFIG_FAILURE.NOT_AN_OBJECT,
          key: '(root)',
          detail: `expected a JSON object, received ${typeof raw}`,
        },
      ],
    }
  }

  if (raw.configVersion !== CONFIG_VERSION) {
    fail(
      CONFIG_FAILURE.VERSION_MISMATCH,
      'configVersion',
      `this build reads configVersion ${CONFIG_VERSION}, file declares ${String(raw.configVersion)}`,
    )
  }

  const geometry = isRecord(raw.geometry) ? raw.geometry : {}
  if (!isRecord(raw.geometry)) {
    fail(CONFIG_FAILURE.MISSING_KEY, 'geometry', 'geometry object is absent or not an object')
  }

  const numbers = new Map<string, number>()
  for (const key of GEOMETRY_KEYS) {
    const path = `geometry.${key}`
    const value = geometry[key]
    if (value === undefined) {
      fail(CONFIG_FAILURE.MISSING_KEY, path, 'required geometry constant is absent')
      continue
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(CONFIG_FAILURE.NOT_A_NUMBER, path, `expected a finite number, received ${String(value)}`)
      continue
    }
    if (value < 0 || (value === 0 && !ZERO_ALLOWED.has(key))) {
      fail(CONFIG_FAILURE.NOT_POSITIVE, path, `must be greater than 0, received ${value}`)
      continue
    }
    numbers.set(key, value)
  }

  const tolerance = numbers.get('arcLengthTolerance')
  if (tolerance !== undefined && (tolerance <= 0 || tolerance >= 1)) {
    fail(
      CONFIG_FAILURE.TOLERANCE_OUT_OF_RANGE,
      'geometry.arcLengthTolerance',
      `must be a fraction strictly between 0 and 1, received ${tolerance}`,
    )
  }

  const short = numbers.get('shortStringLength')
  const long = numbers.get('longStringLength')
  if (short !== undefined && long !== undefined && long <= short) {
    fail(
      CONFIG_FAILURE.LONG_NOT_LONGER_THAN_SHORT,
      'geometry.longStringLength',
      `long string (${long}) must exceed short string (${short})`,
    )
  }

  const deck = isRecord(raw.deck) ? raw.deck : {}
  const composition = isRecord(deck.composition) ? deck.composition : {}
  if (!isRecord(deck.composition)) {
    fail(
      CONFIG_FAILURE.MISSING_KEY,
      'deck.composition',
      'deck.composition object is absent or not an object',
    )
  }

  for (const key of Object.keys(composition)) {
    if (!(DECK_TYPES as readonly string[]).includes(key)) {
      fail(
        CONFIG_FAILURE.DECK_TYPE_NOT_ALLOWED,
        `deck.composition.${key}`,
        'not a deck-eligible station type (§2 ships the starting stations separately)',
      )
    }
  }

  const counts: Partial<Record<DeckStationType, number>> = {}
  let total = 0
  for (const type of DECK_TYPES) {
    const path = `deck.composition.${type}`
    const value = composition[type]
    if (value === undefined) {
      fail(CONFIG_FAILURE.MISSING_KEY, path, 'required station-type count is absent')
      continue
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      fail(
        CONFIG_FAILURE.DECK_COUNT_NOT_INTEGER,
        path,
        `expected a non-negative integer, received ${String(value)}`,
      )
      continue
    }
    counts[type] = value
    total += value
  }

  if (failures.length === 0 && total !== DECK_SIZE) {
    fail(
      CONFIG_FAILURE.DECK_TOTAL_MISMATCH,
      'deck.composition',
      `counts sum to ${total}, expected the §2 printed total of ${DECK_SIZE}`,
    )
  }

  if (failures.length > 0) {
    return { ok: false, failures }
  }

  return {
    ok: true,
    config: {
      shortStringLength: numbers.get('shortStringLength') as number,
      longStringLength: numbers.get('longStringLength') as number,
      arcLengthTolerance: numbers.get('arcLengthTolerance') as number,
      tangencyTolerance: numbers.get('tangencyTolerance') as number,
      cardSize: numbers.get('cardSize') as number,
      borderPerimeter: numbers.get('borderPerimeter') as number,
      mountainLength: numbers.get('mountainLength') as number,
      riverLength: numbers.get('riverLength') as number,
      deckComposition: counts as DeckComposition,
    },
  }
}

/** One line per failure, for the startup error UI. */
export function describeConfigFailures(failures: readonly ConfigFailure[]): string {
  return failures
    .map((failure) => `${failure.key}: ${failure.reason} — ${failure.detail}`)
    .join('; ')
}
