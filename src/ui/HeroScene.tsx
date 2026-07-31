import type { CSSProperties } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import './HeroScene.css'

// Decorative only — none of this geometry is game geometry. Real board constants
// live in public/rules.json (M2), and nothing here is read by src/rules/.

type Rail = {
  id: string
  path: string
  stringColour: string
  bodyColour: string
  roofColour: string
  duration: string
  /** Where the train sits when the OS asks for reduced motion. */
  park: string
}

const RAILS: Rail[] = [
  {
    id: 'cherry',
    path: 'M -60 168 C 130 96 250 210 410 152 C 570 94 640 176 800 132 C 900 104 960 120 1020 112',
    stringColour: '#ff5a5f',
    bodyColour: '#ff5a5f',
    roofColour: '#ffd166',
    duration: '17s',
    park: 'translate(410 152) rotate(-14)',
  },
  {
    id: 'sunshine',
    path: 'M -60 236 C 110 236 170 150 300 176 C 430 202 470 292 610 268 C 740 246 800 168 1020 190',
    stringColour: '#ffc02e',
    bodyColour: '#3bb3ff',
    roofColour: '#ff5a5f',
    duration: '13s',
    park: 'translate(300 176) rotate(9)',
  },
  {
    id: 'blueberry',
    path: 'M -60 292 C 150 292 250 236 400 258 C 560 282 620 330 790 306 C 900 290 950 300 1020 296',
    stringColour: '#3bb3ff',
    bodyColour: '#48c774',
    roofColour: '#a86bff',
    duration: '21s',
    park: 'translate(400 258) rotate(6)',
  },
]

type Station = { x: number; y: number; tilt: number; colour: string; delay: string }

const STATIONS: Station[] = [
  { x: 214, y: 118, tilt: -9, colour: '#48c774', delay: '0s' },
  { x: 452, y: 84, tilt: 11, colour: '#3bb3ff', delay: '0.7s' },
  { x: 546, y: 224, tilt: 7, colour: '#a86bff', delay: '1.4s' },
  { x: 742, y: 108, tilt: -13, colour: '#ff5a5f', delay: '2.1s' },
  { x: 848, y: 252, tilt: -5, colour: '#ffc02e', delay: '2.8s' },
]

type Sparkle = { x: number; y: number; r: number; colour: string; delay: string }

const SPARKLES: Sparkle[] = [
  { x: 92, y: 62, r: 6, colour: '#ffd166', delay: '0s' },
  { x: 332, y: 46, r: 4, colour: '#ff9fb1', delay: '0.5s' },
  { x: 620, y: 58, r: 7, colour: '#8ee0ff', delay: '1s' },
  { x: 886, y: 70, r: 5, colour: '#c4a0ff', delay: '1.5s' },
  { x: 168, y: 314, r: 5, colour: '#8ee0ff', delay: '2s' },
  { x: 686, y: 326, r: 4, colour: '#ffd166', delay: '2.5s' },
]

function HeroScene() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <svg
      className="hero-scene"
      viewBox="0 0 960 340"
      role="img"
      aria-label="Toy trains looping along coloured strings between little station cards"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="55%" stopColor="#ffe8f2" />
          <stop offset="100%" stopColor="#e4f3ff" />
        </linearGradient>
      </defs>

      <rect width="960" height="340" rx="28" fill="url(#hero-sky)" />

      <g className="hero-scene__hills">
        <ellipse cx="150" cy="352" rx="280" ry="96" fill="#b6e8c9" />
        <ellipse cx="620" cy="366" rx="330" ry="110" fill="#9fdfd0" />
        <ellipse cx="900" cy="356" rx="220" ry="84" fill="#c9ecb2" />
      </g>

      {SPARKLES.map((sparkle) => (
        <circle
          key={`${sparkle.x}-${sparkle.y}`}
          className="hero-scene__sparkle"
          cx={sparkle.x}
          cy={sparkle.y}
          r={sparkle.r}
          fill={sparkle.colour}
          style={{ animationDelay: sparkle.delay }}
        />
      ))}

      {/* Loose loops of spare string, waiting to be played. */}
      <g className="hero-scene__coils" fill="none" strokeLinecap="round">
        <path
          d="M 66 268 C 34 250 40 214 74 216 C 108 218 112 254 82 262 C 56 268 50 240 70 236"
          stroke="#a86bff"
          strokeWidth="6"
        />
        <path
          d="M 906 208 C 940 194 946 158 912 156 C 878 154 872 190 902 198 C 926 204 932 178 912 172"
          stroke="#ff9fb1"
          strokeWidth="6"
        />
      </g>

      {RAILS.map((rail) => (
        <g key={rail.id}>
          <path
            d={rail.path}
            fill="none"
            stroke="#2b2540"
            strokeOpacity="0.12"
            strokeWidth="16"
            strokeLinecap="round"
            transform="translate(0 7)"
          />
          <path
            d={rail.path}
            fill="none"
            stroke={rail.stringColour}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d={rail.path}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="2 16"
          />
        </g>
      ))}

      {STATIONS.map((station) => (
        <g key={`${station.x}-${station.y}`} transform={`translate(${station.x} ${station.y})`}>
          <g
            className="hero-scene__station"
            style={
              { '--tilt': `${station.tilt}deg`, animationDelay: station.delay } as CSSProperties
            }
          >
            <rect
              x="-30"
              y="-21"
              width="60"
              height="42"
              rx="8"
              fill="#fffdf6"
              stroke={station.colour}
              strokeWidth="5"
            />
            <circle cx="-13" cy="-4" r="7" fill={station.colour} />
            <rect
              x="0"
              y="-8"
              width="20"
              height="5"
              rx="2.5"
              fill={station.colour}
              opacity="0.55"
            />
            <rect x="0" y="2" width="14" height="5" rx="2.5" fill={station.colour} opacity="0.35" />
            <rect x="-17" y="8" width="34" height="4" rx="2" fill={station.colour} opacity="0.2" />
          </g>
        </g>
      ))}

      {RAILS.map((rail) => (
        <g key={`train-${rail.id}`} transform={prefersReducedMotion ? rail.park : undefined}>
          <Train bodyColour={rail.bodyColour} roofColour={rail.roofColour} />
          {!prefersReducedMotion && (
            <animateMotion
              dur={rail.duration}
              repeatCount="indefinite"
              rotate="auto"
              path={rail.path}
            />
          )}
        </g>
      ))}
    </svg>
  )
}

function Train({ bodyColour, roofColour }: { bodyColour: string; roofColour: string }) {
  return (
    <g className="hero-scene__train">
      <g className="hero-scene__puffs" fill="#ffffff" opacity="0.85">
        <circle className="hero-scene__puff" cx="8" cy="-40" r="6" />
        <circle
          className="hero-scene__puff"
          cx="8"
          cy="-40"
          r="5"
          style={{ animationDelay: '0.45s' }}
        />
        <circle
          className="hero-scene__puff"
          cx="8"
          cy="-40"
          r="4"
          style={{ animationDelay: '0.9s' }}
        />
      </g>

      <rect x="-30" y="-24" width="46" height="18" rx="6" fill={bodyColour} />
      <rect x="-32" y="-38" width="20" height="20" rx="6" fill={roofColour} />
      <rect x="-28" y="-34" width="12" height="9" rx="3" fill="#fffdf6" opacity="0.9" />
      <rect x="4" y="-33" width="9" height="11" rx="3" fill={roofColour} />
      <rect x="1" y="-36" width="15" height="5" rx="2.5" fill={roofColour} />
      <circle cx="-22" cy="-5" r="5.5" fill="#2b2540" />
      <circle cx="-22" cy="-5" r="2" fill="#fffdf6" />
      <circle cx="-6" cy="-5" r="5.5" fill="#2b2540" />
      <circle cx="-6" cy="-5" r="2" fill="#fffdf6" />
      <circle cx="10" cy="-5" r="5.5" fill="#2b2540" />
      <circle cx="10" cy="-5" r="2" fill="#fffdf6" />
    </g>
  )
}

export default HeroScene
