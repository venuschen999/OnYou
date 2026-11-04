import { Fragment, type ReactElement } from "react";

// Port of the in-code pet() SVG in OnYou_web_mockups.html (AGENTS.md §7: reuse,
// never substitute). tests/unit/components/PetArt.test.tsx compares this output
// with the mockup function for every state and bowl.
export type PetVisualState = "starving" | "hungry" | "full" | "slapped";
export type PetBowl = 0 | 1 | 2;

type PetArtProps = {
  state: PetVisualState;
  bowl?: PetBowl;
  label: string;
  className?: string;
};

// Fixed art colors from the mockup drawing, not theme tokens.
const INK = "#2A211B";
const EAR = "#9C6B47";
const MUZZLE = "#FBEBDD";
const LEFT_EYE_X = 47;
const RIGHT_EYE_X = 73;

type Geometry = { cy: number; eY: number };

function Nose({ cy }: Geometry): ReactElement {
  return (
    <path d={`M54 ${cy + 5} q6 -3 12 0 q-1 6 -6 7 q-5 -1 -6 -7z`} fill={INK} />
  );
}

function Muzzle({ cy }: Geometry): ReactElement {
  return <ellipse cx="60" cy={cy + 13} rx="16" ry="11" fill={MUZZLE} />;
}

function HappyMouth({ cy }: Geometry): ReactElement {
  return (
    <path
      d={`M60 ${cy + 12} v3 M60 ${cy + 15} q-4 4 -8 1 M60 ${cy + 15} q4 4 8 1`}
      fill="none"
      stroke={INK}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}

function FrownMouth({ cy, curve }: Geometry & { curve: number }): ReactElement {
  return (
    <path
      d={`M53 ${cy + 20} q7 -${curve} 14 0`}
      fill="none"
      stroke={INK}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  );
}

function FullFace(g: Geometry): ReactElement {
  const { cy, eY } = g;
  return (
    <>
      <path
        d={`M${LEFT_EYE_X - 6} ${eY + 1} q6 -7 12 0 M${RIGHT_EYE_X - 6} ${eY + 1} q6 -7 12 0`}
        fill="none"
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <Muzzle {...g} />
      <ellipse cx="60" cy={cy + 21} rx="4.5" ry="5.5" fill="#E8798A" />
      <HappyMouth {...g} />
      <Nose {...g} />
      <circle cx="36" cy={cy + 8} r="5" fill="var(--apple)" opacity=".25" />
      <circle cx="84" cy={cy + 8} r="5" fill="var(--apple)" opacity=".25" />
    </>
  );
}

function HungryFace(g: Geometry): ReactElement {
  const { eY } = g;
  return (
    <>
      <circle cx={LEFT_EYE_X} cy={eY} r="4.6" fill={INK} />
      <circle cx={RIGHT_EYE_X} cy={eY} r="4.6" fill={INK} />
      <circle cx={LEFT_EYE_X + 1.6} cy={eY - 1.6} r="1.5" fill="#fff" />
      <circle cx={RIGHT_EYE_X + 1.6} cy={eY - 1.6} r="1.5" fill="#fff" />
      <Muzzle {...g} />
      <HappyMouth {...g} />
      <Nose {...g} />
    </>
  );
}

function StarvingFace(g: Geometry): ReactElement {
  const { cy, eY } = g;
  return (
    <>
      <path
        d={`M${LEFT_EYE_X - 5} ${eY - 1} q5 5 10 0 M${RIGHT_EYE_X - 5} ${eY - 1} q5 5 10 0`}
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d={`M${LEFT_EYE_X - 6} ${eY - 9} l10 -3 M${RIGHT_EYE_X + 6} ${eY - 9} l-10 -3`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <Muzzle {...g} />
      <FrownMouth {...g} curve={5} />
      <Nose {...g} />
      <path d={`M92 ${cy - 26} q-5 8 0 10 q5 -2 0 -10z`} fill="#7FB3D9" />
    </>
  );
}

function SlappedFace(g: Geometry): ReactElement {
  const { cy, eY } = g;
  return (
    <>
      <path
        d={`M${LEFT_EYE_X - 4} ${eY - 5} l8 5 l-8 5 M${RIGHT_EYE_X + 4} ${eY - 5} l-8 5 l8 5`}
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Muzzle {...g} />
      <FrownMouth {...g} curve={4} />
      <Nose {...g} />
      <ellipse
        cx="84"
        cy={cy + 9}
        rx="9"
        ry="7"
        fill="var(--apple)"
        opacity=".55"
      />
      <path
        d={`M110 ${cy + 12} l9 0 M108 ${cy + 22} l8 4 M110 ${cy + 2} l8 -3`}
        stroke="var(--muted)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </>
  );
}

const FACES: Record<PetVisualState, (g: Geometry) => ReactElement> = {
  full: FullFace,
  hungry: HungryFace,
  starving: StarvingFace,
  slapped: SlappedFace,
};

function Head({ cy, eY }: Geometry): ReactElement {
  return (
    <>
      <ellipse
        cx="60"
        cy={cy}
        rx="34"
        ry="30"
        fill="var(--peach)"
        stroke="var(--peach-dark)"
        strokeWidth="2.2"
      />
      <path
        d={`M42 ${cy + 25} q18 9 36 0`}
        fill="none"
        stroke="var(--pine)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="60"
        cy={cy + 33}
        r="4.2"
        fill="#E7B53C"
        stroke="#B9871A"
        strokeWidth="1.2"
      />
      <ellipse
        cx={RIGHT_EYE_X}
        cy={eY - 1}
        rx="10"
        ry="9"
        fill={EAR}
        opacity=".55"
      />
      <ellipse cx="50" cy={cy - 21} rx="9" ry="4" fill="#fff" opacity=".3" />
    </>
  );
}

function Ears({
  state,
  cy,
}: Geometry & { state: PetVisualState }): ReactElement {
  const isStarving = state === "starving";
  const leftRotation = isStarving ? 6 : 22;
  const rightRotation = state === "slapped" ? -40 : isStarving ? -6 : -22;
  const earY = isStarving ? cy + 4 : cy - 2;
  return (
    <>
      <ellipse
        cx="29"
        cy={earY}
        rx="10"
        ry="21"
        fill={EAR}
        transform={`rotate(${leftRotation} 33 ${cy - 20})`}
      />
      <ellipse
        cx="91"
        cy={earY}
        rx="10"
        ry="21"
        fill={EAR}
        transform={`rotate(${rightRotation} 87 ${cy - 20})`}
      />
    </>
  );
}

const APPLE_POSITIONS: Record<PetBowl, number[]> = {
  0: [],
  1: [60],
  2: [48, 72],
};

function Bowl({ apples }: { apples: PetBowl }): ReactElement {
  return (
    <>
      <path
        d="M24 124 L96 124 Q93 152 60 152 Q27 152 24 124 Z"
        fill="var(--tint)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      {APPLE_POSITIONS[apples].map((x) => (
        <Fragment key={x}>
          <circle cx={x} cy="118" r="9" fill="var(--apple)" />
          <path
            d={`M${x} 109 q2 -5 6 -6`}
            fill="none"
            stroke="var(--leaf)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </Fragment>
      ))}
    </>
  );
}

export function PetArt({
  state,
  bowl,
  label,
  className = "",
}: PetArtProps): ReactElement {
  const cy = state === "starving" ? 70 : 64;
  const geometry: Geometry = { cy, eY: cy - 4 };
  const hasBowl = bowl !== undefined;
  const viewBoxHeight = (hasBowl ? 158 : 118) + 8;
  const Face = FACES[state];
  return (
    <div
      role="img"
      aria-label={label}
      className={`[&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${className}`}
    >
      <svg viewBox={`-4 -6 128 ${viewBoxHeight}`} aria-hidden="true">
        <Head {...geometry} />
        <Ears {...geometry} state={state} />
        <Face {...geometry} />
        {hasBowl && <Bowl apples={bowl} />}
      </svg>
    </div>
  );
}
