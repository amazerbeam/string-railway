export const STATION_TYPE = {
  STARTING: 'STARTING',
  HAMLET: 'HAMLET',
  VILLAGE: 'VILLAGE',
  TOWN: 'TOWN',
  SCENIC: 'SCENIC',
  RURAL: 'RURAL',
  TERMINUS: 'TERMINUS',
  RAILYARD: 'RAILYARD',
  LANDMARK: 'LANDMARK',
  DEPOT: 'DEPOT',
} as const

export type StationType = (typeof STATION_TYPE)[keyof typeof STATION_TYPE]

export interface StationFlags {
  readonly drawStation: boolean
  readonly mountainBonus: boolean
  readonly terminus: boolean
  readonly multiplier: boolean
  readonly needsMarker: boolean
  readonly markerPenalty: boolean
  readonly markerBonus: boolean
}

export interface StationDefinition {
  readonly bonusFirst: number
  readonly bonusLater: number
  readonly playerLimit: number
  /**
   * §8 — Scenic's printed "+2 more inside the mountain" connection bonus
   * (Rules.md §10.3 pseudocode: `if station.flags.mountainBonus and
   * station.insideMountain: base += 2`). Zero for every station without the
   * mountainBonus flag. A fixed rulebook value, NOT an M2/M6/M8 tunable —
   * it never changes when rules.json changes.
   */
  readonly mountainBonusValue: number
  readonly flags: StationFlags
}

const NO_FLAGS: StationFlags = {
  drawStation: false,
  mountainBonus: false,
  terminus: false,
  multiplier: false,
  needsMarker: false,
  markerPenalty: false,
  markerBonus: false,
}

/**
 * Rules.md §8 printed card values. These are rulebook data, NOT tunables — the
 * only tunable in the deck is the M17 composition, which lives in rules.json.
 */
export const STATION_DEFINITIONS: Readonly<Record<StationType, StationDefinition>> = {
  [STATION_TYPE.STARTING]: {
    bonusFirst: 3,
    bonusLater: 2,
    playerLimit: 5,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, markerPenalty: true },
  },
  [STATION_TYPE.HAMLET]: {
    bonusFirst: 2,
    bonusLater: 2,
    playerLimit: 2,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS },
  },
  [STATION_TYPE.VILLAGE]: {
    bonusFirst: 2,
    bonusLater: 2,
    playerLimit: 3,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS },
  },
  [STATION_TYPE.TOWN]: {
    bonusFirst: 3,
    bonusLater: 3,
    playerLimit: 5,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS },
  },
  [STATION_TYPE.SCENIC]: {
    bonusFirst: 1,
    bonusLater: 1,
    playerLimit: 3,
    mountainBonusValue: 2,
    flags: { ...NO_FLAGS, mountainBonus: true },
  },
  [STATION_TYPE.RURAL]: {
    bonusFirst: 1,
    bonusLater: 1,
    playerLimit: 1,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, drawStation: true },
  },
  [STATION_TYPE.TERMINUS]: {
    bonusFirst: 3,
    bonusLater: 3,
    playerLimit: 5,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, terminus: true },
  },
  [STATION_TYPE.RAILYARD]: {
    bonusFirst: 1,
    bonusLater: 1,
    playerLimit: 3,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, multiplier: true },
  },
  [STATION_TYPE.LANDMARK]: {
    bonusFirst: 3,
    bonusLater: 2,
    playerLimit: 5,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, needsMarker: true, markerPenalty: true },
  },
  [STATION_TYPE.DEPOT]: {
    bonusFirst: 0,
    bonusLater: 2,
    playerLimit: 5,
    mountainBonusValue: 0,
    flags: { ...NO_FLAGS, needsMarker: true, markerBonus: true },
  },
}
