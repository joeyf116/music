// The site mark: a guitar pick cut from a fretboard, with a scale run climbing diagonally across three strings
// (square root, then round notes, the last one lit like a playing note). public/favicon.svg is the same drawing.
export default function Logo({ size = 32 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-pick" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.45" stopColor="#f0a033" />
          <stop offset="1" stopColor="#e5484d" />
        </linearGradient>
        <clipPath id="logo-body">
          <path d="M32 62C20.5 51.5 4 36 4 20.5 4 9 16.5 2 32 2s28 7 28 18.5C60 36 43.5 51.5 32 62Z" />
        </clipPath>
      </defs>
      <g transform="rotate(-14 32 32)">
        <path d="M32 62C20.5 51.5 4 36 4 20.5 4 9 16.5 2 32 2s28 7 28 18.5C60 36 43.5 51.5 32 62Z" fill="url(#logo-pick)" />
        <g clipPath="url(#logo-body)" stroke="#12151b" fill="none">
          <path d="M0 16H64M0 30H64M0 44H64" strokeWidth="1.6" opacity=".22" />
          <path d="M21 0V64M32 0V64M43 0V64" strokeWidth="2.4" opacity=".75" />
          <path d="M21 40 32 30 43 16" strokeWidth="3" strokeLinecap="round" opacity=".5" />
        </g>
        <rect x="15" y="34" width="12" height="12" rx="2.5" fill="#12151b" />
        <circle cx="32" cy="29" r="5.2" fill="#12151b" />
        <circle cx="43" cy="15" r="6" fill="#fff" stroke="#12151b" strokeWidth="2.6" />
      </g>
    </svg>
  )
}
