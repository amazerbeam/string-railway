import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'

export interface RovingTabIndex {
  readonly groupRef: RefObject<HTMLDivElement | null>
  readonly tabStopIndex: number
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

/**
 * A roving tabindex over a flat list of `count` sibling controls, per `game-ux`'s hard
 * floor: exactly one control is a tab stop, arrow keys move among the focusable ones only
 * (`Home`/`End` jump to the first/last), and `Escape` calls `onCancel`. Focus moves
 * imperatively inside the returned keydown handler, never from an effect.
 *
 * Shared by `HandFan` (whose focusable set is the engine's own legal cards) and
 * `AbilityPrompt` (whose focusable set is every offered choice) rather than each
 * re-implementing the same mechanism over a different collection.
 */
export function useRovingTabIndex(
  count: number,
  isFocusable: (index: number) => boolean,
  onCancel: () => void,
): RovingTabIndex {
  const groupRef = useRef<HTMLDivElement>(null)

  const [focusedIndex, setFocusedIndex] = useState(() => firstFocusableIndex(count, isFocusable))

  // The collection can shrink after a render (a played card leaves the hand) — clamp
  // against its current size here, at render time, rather than syncing it back into
  // state from an effect.
  const clampedIndex = count > 0 ? Math.min(focusedIndex, count - 1) : 0
  const tabStopIndex = isFocusable(clampedIndex)
    ? clampedIndex
    : firstFocusableIndex(count, isFocusable)

  function focusIndex(index: number) {
    setFocusedIndex(index)
    // Invariant this hook depends on but cannot enforce: the `index`-th sibling of the
    // focusable collection, in DOM order, must be a native <button> — both current callers
    // (HandFan over PlayingCard, AbilityPrompt over PlayingCard + its own decline/drawn-card
    // controls) satisfy this today. `querySelectorAll('button')` binds by HTML tag name with
    // no typed contract: if a future change ever swaps the root element PlayingCard or the
    // decline control renders away from a native `<button>`, arrow-key navigation silently
    // stops moving focus — the call is optional-chained, so nothing throws, no test fails
    // differently, and TypeScript cannot see it, since the tag name is just a string either way.
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onCancel()
      return
    }

    const focusableIndices: number[] = []
    for (let index = 0; index < count; index++) {
      if (isFocusable(index)) focusableIndices.push(index)
    }
    if (focusableIndices.length === 0) {
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusIndex(focusableIndices[0])
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      focusIndex(focusableIndices[focusableIndices.length - 1])
      return
    }

    const currentPosition = focusableIndices.indexOf(tabStopIndex)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = currentPosition === -1 ? 0 : (currentPosition + 1) % focusableIndices.length
      focusIndex(focusableIndices[next])
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const previous =
        currentPosition === -1
          ? 0
          : (currentPosition - 1 + focusableIndices.length) % focusableIndices.length
      focusIndex(focusableIndices[previous])
    }
  }

  return { groupRef, tabStopIndex, handleKeyDown }
}

function firstFocusableIndex(count: number, isFocusable: (index: number) => boolean): number {
  for (let index = 0; index < count; index++) {
    if (isFocusable(index)) return index
  }
  return 0
}
