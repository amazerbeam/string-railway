import type { QuarryCharacterInfo } from '../../hunt'

interface QuarryDossierProps {
  /** `undefined` when the character has no entry — `quarryCharacterInfo`'s documented
   *  contract. Renders nothing rather than an empty panel. */
  readonly info: QuarryCharacterInfo | undefined
  readonly tricksWon: number
}

/**
 * Who you are facing, and how many tricks they have taken.
 *
 * **No rule line.** DLR-81 deleted the Monarch's round-long rule-break, so there is no power
 * to print — the Quarry plays by exactly the player's rules. This panel states no rule of its
 * own, and it must not grow one back without a power in the engine to match it.
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
      <p className="wc-dossier-tricks">
        Tricks taken <b aria-label={`The Quarry has taken ${tricksWon} tricks`}>{tricksWon}</b>
      </p>
    </section>
  )
}
