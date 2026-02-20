interface PeachLogoProps {
  className?: string;
}

export function PeachLogo({ className = 'h-6 w-6' }: PeachLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stem */}
      <path
        d="M50 28C50 28 48 18 50 10C52 18 50 28 50 28Z"
        fill="#6b8e23"
        stroke="#558b2f"
        strokeWidth="1"
      />
      {/* Leaf */}
      <ellipse cx="60" cy="16" rx="14" ry="7" fill="#7cb342" stroke="#558b2f" strokeWidth="1" transform="rotate(-15 60 16)" />
      <path d="M52 16C56 14 62 13 68 16" stroke="#558b2f" strokeWidth="0.8" fill="none" />
      {/* Peach body */}
      <ellipse cx="50" cy="58" rx="32" ry="34" fill="#ffa07a" stroke="#e8734a" strokeWidth="2.5" />
      {/* Cleft line */}
      <path
        d="M50 28C48 38 46 48 47 58C48 68 49 78 50 90"
        stroke="#e8734a"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Highlight */}
      <ellipse cx="40" cy="48" rx="10" ry="14" fill="#ffcba4" opacity="0.5" />
      {/* Blush */}
      <ellipse cx="55" cy="62" rx="16" ry="14" fill="#ff7f6e" opacity="0.3" />
    </svg>
  );
}
