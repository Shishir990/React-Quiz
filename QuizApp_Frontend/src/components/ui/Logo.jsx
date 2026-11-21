// QuizApp logo: a "Q" whose tail turns into a tick (the right answer), on a lime tile.
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
      <rect width="40" height="40" rx="11" fill="#A3E635" />
      <path d="M26.16 21.8A9 9 0 1 0 20.33 26.69" fill="none" stroke="#172503" strokeWidth="4" strokeLinecap="round" />
      <path d="M21.5 25.5L25.5 29.5L33 21" fill="none" stroke="#172503" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
