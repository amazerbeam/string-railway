/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { BuffTier, mintFromTemplate, templateById } from '../../../hunt'
import AbilityPrompt from '../AbilityPrompt'
import BuffGallery from '../BuffGallery'
import { buildBuffGallery } from '../buffGalleryModel'
import BuffRidingList from '../BuffRidingList'
import { PlaceKind } from '../cardPlacement'
import DecreePile from '../DecreePile'
import DiscardPile from '../DiscardPile'
import HandFan from '../HandFan'
import { cardKey } from '../labels'
import { MotionAnchorProvider } from '../MotionAnchors'
import { useMotionAnchor, useMotionAnchors, type MotionAnchors } from '../motionAnchorContext'
import RoundStatusBand from '../RoundStatusBand'
import { card } from './roundFixture'
import TrickWell from '../TrickWell'
import type { PlaceId } from '../cardPlacement'

afterEach(cleanup)

function AnchorButton({ place, label }: { place: PlaceId; label: string }) {
  const ref = useMotionAnchor(place)
  return <button ref={ref} aria-label={label} />
}

function Reader({ onReady }: { onReady: (anchors: MotionAnchors) => void }) {
  const anchors = useMotionAnchors()
  onReady(anchors)
  return null
}

function Host({
  mounted,
  onReady,
}: {
  mounted: boolean
  onReady: (anchors: MotionAnchors) => void
}) {
  return (
    <MotionAnchorProvider>
      <Reader onReady={onReady} />
      {mounted && <AnchorButton place={{ kind: PlaceKind.TrickWell }} label="Trick well" />}
    </MotionAnchorProvider>
  )
}

describe('MotionAnchors', () => {
  it('resolves a registered place after mount', () => {
    let anchors!: MotionAnchors
    render(<Host mounted onReady={(a) => (anchors = a)} />)
    expect(anchors.resolve({ kind: PlaceKind.TrickWell })).not.toBeNull()
  })

  it('resolves to null after unmount — the ref callback unregisters, or the registry leaks a detached node', () => {
    let anchors!: MotionAnchors
    const { rerender } = render(<Host mounted onReady={(a) => (anchors = a)} />)
    expect(anchors.resolve({ kind: PlaceKind.TrickWell })).not.toBeNull()
    rerender(<Host mounted={false} onReady={(a) => (anchors = a)} />)
    expect(anchors.resolve({ kind: PlaceKind.TrickWell })).toBeNull()
  })

  it('resolves two places differing only by slot to different elements', () => {
    let anchors!: MotionAnchors
    render(
      <MotionAnchorProvider>
        <Reader onReady={(a) => (anchors = a)} />
        <AnchorButton place={{ kind: PlaceKind.PlayerHand, slot: 'a' }} label="Card A" />
        <AnchorButton place={{ kind: PlaceKind.PlayerHand, slot: 'b' }} label="Card B" />
      </MotionAnchorProvider>,
    )
    const elA = anchors.resolve({ kind: PlaceKind.PlayerHand, slot: 'a' })
    const elB = anchors.resolve({ kind: PlaceKind.PlayerHand, slot: 'b' })
    expect(elA).not.toBeNull()
    expect(elB).not.toBeNull()
    expect(elA).not.toBe(elB)
  })

  it('resolve on an unregistered place returns null rather than throwing', () => {
    let anchors!: MotionAnchors
    render(
      <MotionAnchorProvider>
        <Reader onReady={(a) => (anchors = a)} />
      </MotionAnchorProvider>,
    )
    expect(() => anchors.resolve({ kind: PlaceKind.SpentPile })).not.toThrow()
    expect(anchors.resolve({ kind: PlaceKind.SpentPile })).toBeNull()
  })

  it('arriving starts empty', () => {
    let anchors!: MotionAnchors
    render(
      <MotionAnchorProvider>
        <Reader onReady={(a) => (anchors = a)} />
      </MotionAnchorProvider>,
    )
    expect(anchors.arriving.size).toBe(0)
  })
})

// DLR-157 Task 8 — the felt's own places, registered by the real components rather than a
// synthetic `AnchorButton`, so a mis-wired anchor (the wrong `PlaceKind`, a missing `slot`)
// surfaces here as a resolvable-or-not assertion instead of a card flying to the wrong corner.
const HAND_CARD = card(Suit.Bells, 7)

function FeltPlaces() {
  return (
    <>
      <HandFan
        hand={[HAND_CARD]}
        legal={[HAND_CARD]}
        armed={null}
        interactive
        hint="Lead"
        rejected={false}
        promptOpen={false}
        discardSelecting={false}
        discardSelection={[]}
        skulledCards={[]}
        curseArmed={false}
        damageForCard={() => null}
        buffLightForCard={() => null}
        onCardEnter={() => {}}
        onCardLeave={() => {}}
        onTap={() => {}}
        onCancel={() => {}}
      />
      <TrickWell
        currentTrick={[{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }]}
        resolvedTrick={null}
        quarryToLead={false}
        onCarryOn={() => {}}
      />
      <DecreePile decree={card(Suit.Bells, 10)} trumpSuit={Suit.Bells} drawPileCount={5} />
      <DiscardPile spentCount={3} reshuffled={false} />
      <RoundStatusBand
        tricksWon={{ [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 }}
        tricksPlayed={0}
        opponentHandCount={4}
        roundComplete={false}
        bars={[]}
        runLabel="Fight 1 of 3"
        coins={0}
        quarryLabel="Their health"
      />
    </>
  )
}

describe('MotionAnchors — Task 8, the felt registers itself', () => {
  it('resolves every felt place the real components register', () => {
    let anchors!: MotionAnchors
    render(
      <MotionAnchorProvider>
        <Reader onReady={(a) => (anchors = a)} />
        <FeltPlaces />
      </MotionAnchorProvider>,
    )
    expect(anchors.resolve({ kind: PlaceKind.PlayerHand, slot: cardKey(HAND_CARD) })).not.toBeNull()
    expect(anchors.resolve({ kind: PlaceKind.QuarryHand })).not.toBeNull()
    expect(anchors.resolve({ kind: PlaceKind.TrickWell })).not.toBeNull()
    expect(anchors.resolve({ kind: PlaceKind.DrawPile })).not.toBeNull()
    expect(anchors.resolve({ kind: PlaceKind.SpentPile })).not.toBeNull()
    expect(anchors.resolve({ kind: PlaceKind.DecreePlate })).not.toBeNull()
  })
})

// DLR-157 Task 9 — the prompt, the gallery and the riding strip.
const woodcutterBuff = mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, 1)
const noRefusal = () => null

function PromptGalleryStripPlaces() {
  const view = buildBuffGallery([woodcutterBuff], noRefusal)
  return (
    <>
      {/* DLR-163 — the prompt is the 3's suit picker now; it takes no hand and no drawn card. */}
      <AbilityPrompt
        card={card(Suit.Keys, 3)}
        trumpSuit={Suit.Bells}
        onChoose={() => {}}
        onCancel={() => {}}
      />
      <BuffGallery
        view={view}
        poised={null}
        onTapBuff={() => {}}
        onCancelPoise={() => {}}
        onClose={() => {}}
      />
      <BuffRidingList
        rows={[{ buff: woodcutterBuff, reach: 1, revocable: true }]}
        onRemove={() => {}}
        disabled={false}
      />
    </>
  )
}

describe('MotionAnchors — Task 9, the prompt, the gallery and the riding strip', () => {
  // DLR-163 — the Woodcutter's drawn slot is GONE with the Woodcutter prompt itself; the 3's
  // suit picker registers the prompt row and nothing else.
  it('resolves the prompt row, a gallery card and its riding-strip row by the same buff id', () => {
    let anchors!: MotionAnchors
    render(
      <MotionAnchorProvider>
        <Reader onReady={(a) => (anchors = a)} />
        <PromptGalleryStripPlaces />
      </MotionAnchorProvider>,
    )
    expect(anchors.resolve({ kind: PlaceKind.AbilityPrompt })).not.toBeNull()
    expect(
      anchors.resolve({ kind: PlaceKind.BuffGallery, slot: String(woodcutterBuff.id) }),
    ).not.toBeNull()
    expect(
      anchors.resolve({ kind: PlaceKind.RidingStrip, slot: String(woodcutterBuff.id) }),
    ).not.toBeNull()
  })
})
