/**
 * The eight figure `<symbol>` bodies referenced by a card's art window: swan, fox, axe, witch,
 * crown, harp, chalice, sword — one per acting rank, plus the three the Treasure paints per suit.
 * Mounted once per round (`WarCouncilRound.tsx`) and referenced everywhere by `<use>`, exactly
 * like `SuitSymbolSheet` — eleven cards on the felt then cost eleven references, not eleven
 * fifteen-path drawings.
 *
 * These are COMPOSITIONAL PLACEHOLDERS: pose, crop, and how much of the art window a figure
 * fills. Real art replaces these symbol bodies with no layout change, since the art window
 * itself is declared in `cardFace.ts`'s `CARD_FACE_GEOMETRY`.
 *
 * Every fill and stroke is a class, never a `var()` in a presentation attribute — the same trap
 * `SuitMark.tsx`'s docblock records. `.wc-fig-dark` / `-mid` / `-light` / `-white` carry the
 * per-suit fill tones and `.wc-fig-stroke-light` / `-mid` / `-white` the strokes, all read from
 * inherited custom properties set by the call site's `.wc-suit-*` class, exactly as
 * `.wc-skull-shadow` already works.
 *
 * Carries the reference sheet's two measured performance findings verbatim: no SVG `filter`
 * (its own header records that `feTurbulence` grain made an eleven-card screenshot time out at
 * 120 seconds, because every filtered box re-rasterises independently) and no `mix-blend-mode`
 * anywhere.
 */
export function CardArtSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id="wc-fig-swan" viewBox="0 0 100 100">
        <ellipse cx="50" cy="88" rx="42" ry="6" className="wc-fig-dark" opacity=".22" />
        <path
          d="M14 74c0-11 14-19 32-19s34 7 34 18c0 8-13 14-33 14S14 82 14 74z"
          className="wc-fig-light"
        />
        <path d="M27 67c9-8 23-11 35-7-6 3-10 8-12 13-9 2-17 0-23-6z" className="wc-fig-white" />
        <path
          d="M22 77c11-6 25-8 37-4"
          className="wc-fig-stroke-light"
          strokeWidth="2"
          fill="none"
          opacity=".75"
        />
        <path
          d="M64 66C50 54 55 28 72 24"
          className="wc-fig-stroke-light"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="74" cy="23" r="8.5" className="wc-fig-white" />
        <path d="M81 20l13 4-13 5z" className="wc-fig-light" />
        <circle cx="77.5" cy="21" r="1.7" className="wc-fig-dark" />
      </symbol>

      <symbol id="wc-fig-fox" viewBox="0 0 100 100">
        <ellipse cx="54" cy="91" rx="40" ry="5" className="wc-fig-dark" opacity=".2" />
        <path d="M22 88C0 80 4 46 30 42c-9 17-4 33 10 40z" className="wc-fig-mid" />
        <path
          d="M22 88c-8-6-12-16-12-26 0-8 3-15 8-20-3 7-4 14-4 21 0 10 3 19 8 25z"
          className="wc-fig-white"
          opacity=".8"
        />
        <path d="M32 90c0-19 11-31 26-31s26 12 26 31z" className="wc-fig-mid" />
        <path d="M46 90c0-13 4-22 12-25 8 3 12 12 12 25z" className="wc-fig-white" opacity=".5" />
        <path
          d="M35 44L39 12l17 17h10l17-17 4 32c0 8-3 14-9 19L61 76 44 63c-6-5-9-11-9-19z"
          className="wc-fig-mid"
        />
        <path d="M45 38l-4-18 12 11z" className="wc-fig-dark" />
        <path d="M77 38l4-18-12 11z" className="wc-fig-dark" />
        <path
          d="M44 50c2 11 8 19 17 24 9-5 15-13 17-24-1 13-7 22-17 27-10-5-16-14-17-27z"
          className="wc-fig-white"
          opacity=".62"
        />
        <circle cx="50" cy="45" r="3" className="wc-fig-dark" />
        <circle cx="72" cy="45" r="3" className="wc-fig-dark" />
        <path d="M61 60l5 5-5 5-5-5z" className="wc-fig-dark" />
      </symbol>

      <symbol id="wc-fig-axe" viewBox="0 0 100 100">
        <ellipse cx="50" cy="93" rx="28" ry="4" className="wc-fig-dark" opacity=".22" />
        <path
          d="M40 92L58 24"
          className="wc-fig-stroke-mid"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M38 90L56 26"
          className="wc-fig-stroke-mid"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
          opacity=".4"
        />
        <path
          d="M54 30c14-15 33-15 40-2-9 9-12 21-8 33-15 4-30-5-35-19z"
          className="wc-fig-light"
        />
        <path
          d="M54 30c10-10 23-12 33-7-9 4-14 11-15 19-8-2-14-6-18-12z"
          className="wc-fig-white"
          opacity=".5"
        />
        <path
          d="M58 45c9 8 20 12 28 10"
          className="wc-fig-stroke-mid"
          strokeWidth="2"
          fill="none"
          opacity=".55"
        />
        <rect
          x="46"
          y="37"
          width="17"
          height="7"
          rx="3.2"
          transform="rotate(-15 54 40)"
          className="wc-fig-dark"
        />
      </symbol>

      <symbol id="wc-fig-witch" viewBox="0 0 100 100">
        <ellipse cx="48" cy="92" rx="33" ry="5" className="wc-fig-dark" opacity=".25" />
        <circle cx="78" cy="16" r="21" className="wc-fig-white" opacity=".3" />
        <rect x="75.5" y="18" width="5" height="74" rx="2.5" className="wc-fig-mid" />
        <circle
          cx="78"
          cy="15"
          r="7.5"
          fill="none"
          className="wc-fig-stroke-light"
          strokeWidth="3.5"
        />
        <circle cx="78" cy="15" r="3" className="wc-fig-white" />
        <path d="M22 92c0-30 10-48 24-48s24 18 24 48z" className="wc-fig-mid" />
        <path d="M30 92c1-19 5-31 11-36-3 11-4 24-3 36z" className="wc-fig-light" opacity=".32" />
        <path d="M62 92c0-16-2-27-6-34 7 6 11 19 12 34z" className="wc-fig-dark" opacity=".45" />
        <path d="M32 52c0-13 6-21 14-21s14 8 14 21c0 7-28 7-28 0z" className="wc-fig-dark" />
        <ellipse cx="46" cy="48" rx="7" ry="8.5" className="wc-fig-white" opacity=".92" />
        <path d="M39 45c1-5 4-9 8-11-4 5-6 10-6 16z" className="wc-fig-dark" opacity=".3" />
        <circle cx="44" cy="47" r="1.6" className="wc-fig-dark" />
        <circle cx="49.5" cy="47" r="1.6" className="wc-fig-dark" />
      </symbol>

      <symbol id="wc-fig-crown" viewBox="0 0 100 100">
        <ellipse cx="50" cy="93" rx="31" ry="4" className="wc-fig-dark" opacity=".24" />
        <path d="M18 74L10 26l22 17L50 16l18 27 22-17-8 48z" className="wc-fig-mid" />
        <path d="M18 74L10 26l22 17L50 16v58z" className="wc-fig-white" opacity=".16" />
        <rect x="15" y="75" width="70" height="15" rx="5" className="wc-fig-mid" />
        <rect x="15" y="75" width="70" height="5" rx="2.5" className="wc-fig-white" opacity=".28" />
        <circle cx="50" cy="29" r="5" className="wc-fig-white" />
        <circle cx="23" cy="59" r="4" className="wc-fig-white" opacity=".85" />
        <circle cx="77" cy="59" r="4" className="wc-fig-white" opacity=".85" />
        <circle cx="32" cy="83" r="3.4" className="wc-fig-white" opacity=".68" />
        <circle cx="50" cy="83" r="3.4" className="wc-fig-white" opacity=".68" />
        <circle cx="68" cy="83" r="3.4" className="wc-fig-white" opacity=".68" />
      </symbol>

      <symbol id="wc-fig-harp" viewBox="0 0 100 100">
        <ellipse cx="50" cy="92" rx="26" ry="4" className="wc-fig-dark" opacity=".24" />
        <rect x="29" y="79" width="42" height="10" rx="5" className="wc-fig-light" />
        <rect
          x="29"
          y="79"
          width="42"
          height="3.5"
          rx="1.75"
          className="wc-fig-white"
          opacity=".35"
        />
        <path d="M35 81c-5-23 0-42 13-55 3-3 8 0 6 4-10 12-15 29-12 51z" className="wc-fig-light" />
        <path d="M62 81c1-18 1-34-1-47l7-2c2 14 2 31 1 49z" className="wc-fig-light" />
        <path d="M49 27l21-5 2 9-22 4z" className="wc-fig-mid" />
        <g className="wc-fig-stroke-white" strokeWidth="1.1" opacity=".8" strokeLinecap="round">
          <path d="M53 32L44 79" />
          <path d="M58 31L51 79" />
          <path d="M63 30L58 79" />
          <path d="M68 29L65 79" />
        </g>
        <circle cx="70" cy="25" r="3.4" className="wc-fig-white" />
      </symbol>

      <symbol id="wc-fig-chalice" viewBox="0 0 100 100">
        <ellipse cx="50" cy="93" rx="23" ry="4" className="wc-fig-dark" opacity=".24" />
        <path
          d="M31 84h38c2 0 3 2 3 4s-1 4-3 4H31c-2 0-3-2-3-4s1-4 3-4z"
          className="wc-fig-light"
        />
        <rect x="45.5" y="58" width="9" height="27" className="wc-fig-light" />
        <ellipse cx="50" cy="66" rx="6.5" ry="5" className="wc-fig-light" />
        <path d="M27 28h46c0 19-10 32-23 32S27 47 27 28z" className="wc-fig-light" />
        <ellipse cx="50" cy="28" rx="23" ry="5.5" className="wc-fig-white" />
        <ellipse cx="50" cy="28" rx="17" ry="3.6" className="wc-fig-mid" opacity=".55" />
        <path d="M31 32c2 12 8 21 17 24-11-2-19-12-21-24z" className="wc-fig-white" opacity=".45" />
        <circle cx="50" cy="44" r="4.2" className="wc-fig-white" opacity=".85" />
      </symbol>

      <symbol id="wc-fig-sword" viewBox="0 0 100 100">
        <ellipse cx="50" cy="94" rx="17" ry="3.5" className="wc-fig-dark" opacity=".24" />
        <path d="M50 8l8 16v42H42V24z" className="wc-fig-light" />
        <path d="M50 8l8 16v42h-8z" className="wc-fig-dark" opacity=".22" />
        <path
          d="M27 64h46c2 0 3 2 3 4.5s-1 4.5-3 4.5H27c-2 0-3-2-3-4.5S25 64 27 64z"
          className="wc-fig-mid"
        />
        <path d="M27 64h46c2 0 3 1 3 2H24c0-1 1-2 3-2z" className="wc-fig-white" opacity=".4" />
        <rect x="45.5" y="73" width="9" height="15" rx="3" className="wc-fig-dark" />
        <circle cx="50" cy="90" r="5.2" className="wc-fig-light" />
        <circle cx="50" cy="68.5" r="3.2" className="wc-fig-white" />
      </symbol>
    </svg>
  )
}
