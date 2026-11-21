// QuizApp logo: a white "q" with a lime dot on a black rounded tile.
// The same drawing is the browser-tab icon (public/favicon.svg).
export function Logo({ size = 34, className = '' }) {
  return (
    <svg
      className={`app-logo ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="QuizApp logo"
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="#0C0D0C" stroke="#2A2E2A" />
      <circle cx="18" cy="18" r="7.5" fill="none" stroke="#F2F4EF" strokeWidth="4.2" />
      <path d="M25.5 12v19" stroke="#F2F4EF" strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="31.5" cy="31" r="3.2" fill="#A3E635" />
    </svg>
  );
}
