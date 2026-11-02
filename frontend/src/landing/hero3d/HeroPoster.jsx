// HeroPoster - static SVG fallback for the 3D hero
// Matches the composition: coin with "सं" above a zero ring

export default function HeroPoster() {
  return (
    <svg
      viewBox="0 0 400 400"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      role="img"
      aria-label="Sampada coin with Sanskrit mark सं above a zero ring — representing the journey from debt to wealth"
    >
      <defs>
        {/* Coin gradient */}
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f08e7c" />
          <stop offset="50%" stopColor="#ed6f5c" />
          <stop offset="100%" stopColor="#c45a4a" />
        </linearGradient>
        {/* Ring gradient */}
        <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ed6f5c" stopOpacity="0" />
          <stop offset="70%" stopColor="#ed6f5c" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ed6f5c" stopOpacity="0" />
        </radialGradient>
        {/* Subtle glow filter */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="200" cy="200" r="180" fill="#f7f1de" />

      {/* Zero ring - the target */}
      <circle cx="200" cy="280" r="90" fill="none" stroke="url(#ringGrad)" strokeWidth="12" filter="url(#softGlow)" />
      <circle cx="200" cy="280" r="70" fill="none" stroke="#ed6f5c" strokeWidth="2" opacity="0.3" />

      {/* Inner ring glow */}
      <circle cx="200" cy="280" r="55" fill="none" stroke="#ed6f5c" strokeWidth="1" opacity="0.15" />

      {/* Coin shadow */}
      <ellipse cx="200" cy="290" rx="65" ry="8" fill="#ed6f5c" opacity="0.15" filter="url(#softGlow)" />

      {/* Coin body */}
      <g filter="url(#softGlow)">
        {/* Coin edge */}
        <ellipse cx="200" cy="165" rx="62" ry="14" fill="#b3402f" />
        {/* Coin top face */}
        <ellipse cx="200" cy="150" rx="60" ry="12" fill="url(#coinGrad)" />
        {/* Coin inner highlight */}
        <ellipse cx="200" cy="145" rx="45" ry="8" fill="#f08e7c" opacity="0.5" />
      </g>

      {/* Sanskrit mark "सं" on coin */}
      <text
        x="200"
        y="158"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Noto Sans Devanagari', 'Noto Sans', sans-serif"
        fontSize="48"
        fontWeight="700"
        fill="#ed6f5c"
        filter="url(#softGlow)"
      >
        सं
      </text>

      {/* Subtle "संपदा" below ring */}
      <text
        x="200"
        y="350"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Noto Sans Devanagari', 'Noto Sans', sans-serif"
        fontSize="20"
        fontWeight="500"
        fill="#ed6f5c"
        opacity="0.4"
      >
        संपदा
      </text>

      {/* Floating particles */}
      <g opacity="0.4" fill="#ed6f5c">
        <circle cx="120" cy="100" r="2" />
        <circle cx="300" cy="80" r="1.5" />
        <circle cx="80" cy="300" r="1" />
        <circle cx="340" cy="320" r="2" />
        <circle cx="160" cy="40" r="1.5" />
        <circle cx="280" cy="360" r="1" />
      </g>
    </svg>
  )
}