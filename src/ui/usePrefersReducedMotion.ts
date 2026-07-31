import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the OS "reduce motion" setting. CSS handles this for stylesheet animations,
 * but the hero's SMIL <animateMotion> cannot be disabled from CSS — this hook lets the
 * scene render parked trains instead.
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}

export { usePrefersReducedMotion }
