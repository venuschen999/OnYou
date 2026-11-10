type PetArtProps = {
  label: string;
};

// Waiting face from OnYou_web_mockups.html. Feeding-state variants stay with
// the dashboard issue; the timer uses this waiting pose.
export function PetArt({ label }: PetArtProps) {
  return (
    <div className="w-full" role="img" aria-label={label}>
      <svg viewBox="-4 -6 128 126" aria-hidden="true" className="h-auto w-full">
        <ellipse
          cx="29"
          cy="62"
          rx="10"
          ry="21"
          fill="#9c6b47"
          transform="rotate(22 33 44)"
        />
        <ellipse
          cx="91"
          cy="62"
          rx="10"
          ry="21"
          fill="#9c6b47"
          transform="rotate(-22 87 44)"
        />
        <ellipse
          cx="60"
          cy="64"
          rx="34"
          ry="30"
          fill="var(--peach)"
          stroke="var(--peach-dark)"
          strokeWidth="2.2"
        />
        <path
          d="M42 89 q18 9 36 0"
          fill="none"
          stroke="var(--pine)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="60"
          cy="97"
          r="4.2"
          fill="#e7b53c"
          stroke="#b9871a"
          strokeWidth="1.2"
        />
        <ellipse cx="73" cy="59" rx="10" ry="9" fill="#9c6b47" opacity="0.55" />
        <ellipse cx="50" cy="43" rx="9" ry="4" fill="#fff" opacity="0.3" />
        <circle cx="47" cy="60" r="4.6" fill="#2a211b" />
        <circle cx="73" cy="60" r="4.6" fill="#2a211b" />
        <circle cx="48.6" cy="58.4" r="1.5" fill="#fff" />
        <circle cx="74.6" cy="58.4" r="1.5" fill="#fff" />
        <ellipse cx="60" cy="77" rx="16" ry="11" fill="#fbebdd" />
        <path
          d="M60 76 v3 M60 79 q-4 4 -8 1 M60 79 q4 4 8 1"
          fill="none"
          stroke="#2a211b"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M54 69 q6 -3 12 0 q-1 6 -6 7 q-5 -1 -6 -7z" fill="#2a211b" />
      </svg>
    </div>
  );
}
