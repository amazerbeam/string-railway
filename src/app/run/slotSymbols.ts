import {
  BuffKind,
  BuffRewardAxis,
  type BuffActivatedTemplateKind,
  type BuffTargetSuit,
  type BuffTemplate,
  type ConditionBuffTemplate,
  type MintableRewardAxis,
} from '../../hunt'

/**
 * A reel symbol's FACE — what one window of the cabinet shows while it spins past.
 *
 * A slot reel is read in the fraction of a second it is moving, so the strip's long sentence
 * (`slotSymbolText`, still the strip list's and the screen reader's wording) is unreadable in a
 * window. This module reduces a template to the three marks a symbol can carry at speed: a suit
 * glyph, a one-word family, and a one-word reward axis.
 *
 * `slotLabels.ts` stays the ONE grammar for a symbol's SENTENCE; this is its glyph vocabulary, and
 * it derives every word from `buffLabels.ts`'s own tables rather than restating them.
 */

/** What the window paints in its glyph slot. `suit` covers the two suit-parameterised families;
 *  Sidestep, Skull Helmet, Skull Tether and the two activated templates carry no suit and take
 *  their own mark instead. */
export type SlotGlyph =
  | { readonly kind: 'suit'; readonly suit: BuffTargetSuit }
  | { readonly kind: 'sidestep' }
  | { readonly kind: 'cheat' }
  | { readonly kind: 'skullHelmet' }
  | { readonly kind: 'skullTether' }
  // DLR-162 — the wildcard's own mark, drawn by `src/app/warCouncil/WildMark.tsx`.
  | { readonly kind: 'wildcard' }

export interface SlotSymbolFace {
  /** `template.id` — already unique across the strip, so it is the React key AND what a
   *  match compares on, exactly as `resolvePull` compares templates. */
  readonly id: string
  readonly glyph: SlotGlyph
  /** The family word — Taker / Feeder / Sidestep / Cheat. */
  readonly family: string
  /** The reward axis word — Blade / Momentum — or `null` for an activated card, which has no
   *  axis at all (`ActivatedBuffTemplate`'s own docblock). Rendering nothing rather than a
   *  placeholder row is `game-ux`'s "do not render a panel that has nothing to say". */
  readonly axis: string | null
}

/** PLACEHOLDER COPY, the developer's to retune, exactly as `slotLabels.ts` marks its own. Keyed
 *  over the family words a mintable template can carry, so a restored family fails to compile
 *  here rather than rendering `undefined` in a reel window. */
const FAMILY_WORD: Readonly<Record<BuffTemplate['kind'], string>> = {
  [BuffKind.Taker]: 'Taker',
  [BuffKind.Feeder]: 'Feeder',
  [BuffKind.Sidestep]: 'Sidestep',
  [BuffKind.Cheat]: 'Cheat',
  // DLR-161 — short forms, for a moving reel window; the full card name is `slotLabels.ts`'s job.
  [BuffKind.SkullHelmet]: 'Helmet',
  [BuffKind.SkullTether]: 'Tether',
  // DLR-162 — PLACEHOLDER copy.
  [BuffKind.Wildcard]: 'Wildcard',
}

/** DLR-162 — was `glyph: { kind: 'cheat' }` outright on the activated branch, which rendered a
 *  SECOND activated card as a Cheat in a reel window with no error at all. Total over the closed
 *  union, so a third activated card is a compile error here. */
const ACTIVATED_GLYPH: Readonly<Record<BuffActivatedTemplateKind, SlotGlyph>> = {
  [BuffKind.Cheat]: { kind: 'cheat' },
  [BuffKind.Wildcard]: { kind: 'wildcard' },
}

/** The mintable axes, in the same words `BUFF_REWARD_SUFFIX` uses — restated as a narrowed
 *  table rather than imported wholesale so a cut axis cannot leak onto a reel face. */
const AXIS_WORD: Readonly<Record<MintableRewardAxis, string>> = {
  [BuffRewardAxis.Magnitude]: 'Blade',
  [BuffRewardAxis.Multiplier]: 'Momentum',
  // DLR-161
  [BuffRewardAxis.Protection]: 'Guard',
}

/** DLR-161 — the glyph a condition template carries. A total switch over the kinds a condition
 *  template can be, so a sixth family is a compile error here rather than a blank or a borrowed
 *  mark in a reel window. Throws on a suit-parameterised family that arrived without a suit —
 *  `mintFromTemplate`'s discipline: a plausible-looking wrong glyph is the bug that type-checks. */
function conditionGlyphFor(template: ConditionBuffTemplate): SlotGlyph {
  const suit = template.target?.suit
  if (suit !== undefined) return { kind: 'suit', suit }
  switch (template.kind) {
    case BuffKind.Sidestep:
      return { kind: 'sidestep' }
    case BuffKind.SkullHelmet:
      return { kind: 'skullHelmet' }
    case BuffKind.SkullTether:
      return { kind: 'skullTether' }
    case BuffKind.Taker:
    case BuffKind.Feeder:
      throw new RangeError(`Template ${template.id} is suit-parameterised but carries no suit`)
  }
}

/** One template's reel face. Total over the `form` union, so a third template shape is a compile
 *  error here rather than a blank window. */
export function slotSymbolFace(template: BuffTemplate): SlotSymbolFace {
  if (template.form === 'activated') {
    return {
      id: template.id,
      glyph: ACTIVATED_GLYPH[template.kind],
      family: FAMILY_WORD[template.kind],
      axis: null,
    }
  }
  return {
    id: template.id,
    glyph: conditionGlyphFor(template),
    family: FAMILY_WORD[template.kind],
    axis: AXIS_WORD[template.axis],
  }
}
