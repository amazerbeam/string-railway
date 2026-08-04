export const BattlePhase = {
  WarCouncilRound: 'warCouncilRound',
  MusterConversion: 'musterConversion',
  Clash: 'clash',
  Resolved: 'resolved',
} as const

export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase]
