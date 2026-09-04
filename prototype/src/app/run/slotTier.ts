import type { BuffTemplate, BuffTier, SlotAward } from '../../hunt'

/**
 * DLR-160 AC10 — the tier each landed reel window awarded, by index.
 *
 * A strip symbol is a `BuffTemplate`, which carries no tier of its own (`buffTemplates.ts`'s own
 * comment) — the tier is decided by `resolvePull`'s match rule, from how the three reels landed.
 * This function NEVER re-derives that rule: it reads the pull's own `awards`, matching each landed
 * symbol back to the award that names its template by id, and returns that award's tier. If the
 * match rule ever changes, this still reads correctly, because it never encodes the rule itself.
 *
 * `null` for a symbol with no matching award — unreachable with today's `resolvePull` (every
 * symbol appears in exactly one award), but this is not this function's rule to assume, so a
 * missing match is reported rather than silently coerced to a guess.
 */
export function reelTiers(
  symbols: readonly BuffTemplate[],
  awards: readonly SlotAward[],
): readonly (BuffTier | null)[] {
  const tierByTemplateId = new Map<string, BuffTier>()
  for (const award of awards) {
    tierByTemplateId.set(award.template.id, award.tier)
  }
  return symbols.map((symbol) => tierByTemplateId.get(symbol.id) ?? null)
}
