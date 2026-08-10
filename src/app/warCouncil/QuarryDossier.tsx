import type { QuarryCharacterInfo } from '../../hunt'

interface QuarryDossierProps {
  /** `undefined` when the character's rule-break is not implemented — `quarryCharacterInfo`'s
   *  documented contract. Renders nothing rather than putting a rule on screen no code applies. */
  readonly info: QuarryCharacterInfo | undefined
  readonly tricksWon: number
}

/**
 * §4's always-on rows (AC2): the encounter's character, its round-long rule-break in the
 * plain language `quarryCharacters.ts` already writes, and its public trick count. Restates
 * no rule of its own — the sentence is the config's, and enforcement is
 * `warCouncil/quarryRuleBreak.ts`'s (DLR-51 AC7).
 */
export default function QuarryDossier({ info, tricksWon }: QuarryDossierProps) {
  if (info === undefined) {
    return null
  }

  return (
    <section className="wc-dossier-card" aria-label={`The Quarry: ${info.name}`}>
      <span className="wc-dossier-eyebrow" aria-hidden="true">
        The Quarry
      </span>
      <h2 className="wc-dossier-name">{info.name}</h2>
      <p className="wc-dossier-rule">{info.description}</p>
      <p className="wc-dossier-tricks">
        Tricks taken <b aria-label={`The Quarry has taken ${tricksWon} tricks`}>{tricksWon}</b>
      </p>
    </section>
  )
}
