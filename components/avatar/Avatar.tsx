"use client";

import { useId } from "react";
import type { AvatarPreset } from "./presets";

export function Avatar({
  preset,
  size,
  crown = false,
}: {
  preset: AvatarPreset;
  size: number;
  crown?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hi = `avHi${uid}`;
  const sh = `avSh${uid}`;
  const hr = `avHair${uid}`;
  const clip = `avClip${uid}`;
  const { hair, hairColor, skin, bg } = preset;
  const tuftOp = hair === "a" ? 1 : 0;
  const pigOp = hair === "b" ? 1 : 0;
  const bobOp = hair === "c" ? 1 : 0;
  const crownOp = crown ? 1 : 0;

  return (
    <div style={{ width: size, height: size, flex: "0 0 auto", display: "block" }}>
      <svg
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        role="img"
        aria-label="Avatar phi hành gia nhí"
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id={hi} cx="34%" cy="26%" r="62%">
            <stop offset="0" stopColor="#fff" stopOpacity=".6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={sh} cx="50%" cy="42%" r="62%">
            <stop offset=".62" stopColor="#7a3b2e" stopOpacity="0" />
            <stop offset="1" stopColor="#7a3b2e" stopOpacity=".3" />
          </radialGradient>
          <radialGradient id={hr} cx="40%" cy="20%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity=".35" />
            <stop offset="1" stopColor="#000" stopOpacity=".18" />
          </radialGradient>
          <clipPath id={clip}>
            <circle cx="60" cy="60" r="58" />
          </clipPath>
        </defs>
        <circle cx="60" cy="60" r="58" fill={bg} />
        <circle cx="60" cy="60" r="58" fill={`url(#${hi})`} opacity=".5" />
        <g clipPath={`url(#${clip})`}>
          <path d="M14 124 C14 100 34 92 60 92 C86 92 106 100 106 124Z" fill="#FFFFFF" />
          <path d="M14 124 C14 100 34 92 60 92 C86 92 106 100 106 124Z" fill="#6675E8" opacity=".10" />
          <path d="M46 93 L60 116 L74 93 Q60 99 46 93Z" fill="#E5334F" />
          <path d="M52 97 L60 108 L68 97Z" fill="#fff" opacity=".22" />
          <circle cx="60" cy="100" r="4.2" fill="#C8203B" />
          <path d="M56 104 L50 122 L58 120Z M64 104 L70 122 L62 120Z" fill="#E5334F" />
          <polygon
            points="86,104 88,109 93,109.4 89.2,112.6 90.4,117.6 86,115 81.6,117.6 82.8,112.6 79,109.4 84,109"
            fill="#FFC857"
            stroke="#E0A020"
            strokeWidth=".8"
            strokeLinejoin="round"
          />
        </g>
        <g data-part="pigtails" opacity={pigOp}>
          <circle cx="24" cy="66" r="12" fill={hairColor} />
          <circle cx="96" cy="66" r="12" fill={hairColor} />
          <circle cx="24" cy="66" r="12" fill={`url(#${hr})`} />
          <circle cx="96" cy="66" r="12" fill={`url(#${hr})`} />
          <rect x="27" y="52" width="8" height="5" rx="2.5" fill="#F46FA5" />
          <rect x="85" y="52" width="8" height="5" rx="2.5" fill="#F46FA5" />
        </g>
        <g data-part="bob" opacity={bobOp}>
          <path d="M26 54 C20 80 26 90 36 90 L42 60Z M94 54 C100 80 94 90 84 90 L78 60Z" fill={hairColor} />
          <path d="M26 54 C20 80 26 90 36 90 L42 60Z M94 54 C100 80 94 90 84 90 L78 60Z" fill={`url(#${hr})`} />
        </g>
        <circle cx="28.5" cy="60" r="5.5" fill={skin} />
        <circle cx="91.5" cy="60" r="5.5" fill={skin} />
        <circle cx="60" cy="56" r="32" fill={skin} />
        <circle cx="60" cy="56" r="32" fill={`url(#${sh})`} />
        <circle cx="60" cy="56" r="32" fill={`url(#${hi})`} opacity=".7" />
        <path d="M27 56 C22 26 50 18 62 20 C86 20 99 36 93 58 C89 45 80 39 60 39 C42 39 32 46 27 56Z" fill={hairColor} />
        <path d="M27 56 C22 26 50 18 62 20 C86 20 99 36 93 58 C89 45 80 39 60 39 C42 39 32 46 27 56Z" fill={`url(#${hr})`} />
        <path d="M45 30 Q58 24 72 28" stroke="#fff" strokeOpacity=".4" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g data-part="tuft" opacity={tuftOp}>
          <path d="M58 21 C54 11 66 8 70 15 C66 14 62 16 62 21Z" fill={hairColor} />
        </g>
        <ellipse cx="46" cy="60" rx="5.2" ry="6.6" fill="#2B2350" />
        <ellipse cx="74" cy="60" rx="5.2" ry="6.6" fill="#2B2350" />
        <circle cx="44.2" cy="57.2" r="2.2" fill="#fff" />
        <circle cx="72.2" cy="57.2" r="2.2" fill="#fff" />
        <circle cx="48" cy="63" r="1.1" fill="#fff" opacity=".8" />
        <circle cx="76" cy="63" r="1.1" fill="#fff" opacity=".8" />
        <ellipse cx="37" cy="70" rx="6" ry="3.6" fill="#FF7FAE" opacity=".5" />
        <ellipse cx="83" cy="70" rx="6" ry="3.6" fill="#FF7FAE" opacity=".5" />
        <path d="M54 71 Q60 77.5 66 71" stroke="#B0475E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="56" r="40" fill="#fff" opacity=".10" />
        <circle cx="60" cy="56" r="40" fill="none" stroke="#fff" strokeWidth="3" opacity=".85" />
        <path d="M28 34 A38 38 0 0 1 48 20" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".9" />
        <circle cx="32" cy="30" r="1.8" fill="#fff" opacity=".9" />
        <g data-part="crown" opacity={crownOp}>
          <path d="M42 20 L45 5 L54 14 L60 1 L66 14 L75 5 L78 20 Z" fill="#FFC857" stroke="#E0A020" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="42" y="17" width="36" height="5" rx="2" fill="#F5A81C" />
          <circle cx="60" cy="19.5" r="2" fill="#F46FA5" />
          <circle cx="50" cy="19.5" r="1.5" fill="#6675E8" />
          <circle cx="70" cy="19.5" r="1.5" fill="#6675E8" />
          <path
            d="M95 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z M20 20 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z"
            fill="#FFE08A"
          />
        </g>
      </svg>
    </div>
  );
}
