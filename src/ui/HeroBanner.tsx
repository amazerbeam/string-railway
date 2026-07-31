import type { CSSProperties } from 'react'
import HeroScene from './HeroScene'
import './HeroBanner.css'

const TITLE = 'Strings & Stations'

const LETTER_COLOURS = ['#ff5a5f', '#ffa62e', '#ffc02e', '#48c774', '#3bb3ff', '#a86bff']

function HeroBanner() {
  return (
    <header className="hero-banner">
      <h1 className="hero-banner__logo" aria-label={TITLE}>
        <span className="hero-banner__letters" aria-hidden="true">
          {renderLetters(TITLE)}
        </span>
      </h1>

      <p className="hero-banner__tagline">Build a railway out of string.</p>

      <HeroScene />

      <p className="hero-banner__note">
        Early prototype — the board, the station deck and the fixed-length string drag are on their
        way.
      </p>
    </header>
  )
}

function renderLetters(title: string) {
  let letterIndex = 0

  return Array.from(title).map((character, index) => {
    if (character === ' ') {
      return (
        <span className="hero-banner__space" key={`space-${index}`}>
          {' '}
        </span>
      )
    }

    const style = {
      '--letter-colour': LETTER_COLOURS[letterIndex % LETTER_COLOURS.length],
      animationDelay: `${letterIndex * 0.08}s`,
    } as CSSProperties
    letterIndex += 1

    return (
      <span className="hero-banner__letter" key={`${character}-${index}`} style={style}>
        {character}
      </span>
    )
  })
}

export default HeroBanner
