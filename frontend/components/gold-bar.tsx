import { cn } from "@/lib/utils"

interface GoldBarProps {
  className?: string
  /** 0..1 ramps the rose glow up */
  intensity?: number
}

/**
 * Procedural gold ingot for the landing hero.
 * The realism comes from mass, bevel contrast, subtle texture, and restrained motion.
 */
export function GoldBar({ className, intensity = 0 }: GoldBarProps) {
  const glowOpacity = 0.24 + intensity * 0.42

  return (
    <div className={cn("relative aspect-[1.55] isolate", className)}>
      <div
        aria-hidden
        className="animate-glow-breathe absolute left-1/2 top-[44%] -z-10 h-[112%] w-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E1BAC2] blur-3xl"
        style={{ opacity: glowOpacity }}
      />

      <div
        aria-hidden
        className="absolute bottom-[9%] left-1/2 -z-10 h-[13%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(95,72,18,0.34),rgba(95,72,18,0.12)_45%,transparent_72%)] blur-md"
      />

      <div className="animate-gold-float-real relative h-full w-full">
        <svg
          viewBox="0 0 560 360"
          role="img"
          aria-label="Sanad gold bar"
          className="animate-gold-perspective relative h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="goldTopReal" x1="104" y1="73" x2="457" y2="271" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFF2B7" />
              <stop offset="0.14" stopColor="#D6A92E" />
              <stop offset="0.34" stopColor="#8D6511" />
              <stop offset="0.5" stopColor="#FFE58C" />
              <stop offset="0.66" stopColor="#C28A16" />
              <stop offset="0.84" stopColor="#6F4A0B" />
              <stop offset="1" stopColor="#F7C94C" />
            </linearGradient>
            <linearGradient id="goldLeftReal" x1="82" y1="130" x2="148" y2="293" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#B57910" />
              <stop offset="0.46" stopColor="#F3B52A" />
              <stop offset="1" stopColor="#7B510C" />
            </linearGradient>
            <linearGradient id="goldRightReal" x1="430" y1="113" x2="486" y2="279" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#F2C85F" />
              <stop offset="0.38" stopColor="#A86F11" />
              <stop offset="1" stopColor="#5A3907" />
            </linearGradient>
            <linearGradient id="goldLipReal" x1="139" y1="270" x2="450" y2="307" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#8C5D0C" />
              <stop offset="0.3" stopColor="#F3C04B" />
              <stop offset="0.72" stopColor="#B37A12" />
              <stop offset="1" stopColor="#5B3B08" />
            </linearGradient>
            <linearGradient id="edgeHighlight" x1="107" y1="91" x2="430" y2="252" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFF7C9" stopOpacity="0.85" />
              <stop offset="0.45" stopColor="#FFF7C9" stopOpacity="0.12" />
              <stop offset="1" stopColor="#FFF7C9" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="movingSheenReal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="0.44" stopColor="#FFFFFF" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.58" />
              <stop offset="0.57" stopColor="#FFFFFF" stopOpacity="0.12" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id="goldTexture" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" seed="8" result="noise" />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0 0 0 0 0.78 0 0 0 0 0.56 0 0 0 0 0.13 0 0 0 .18 0"
                result="warmNoise"
              />
              <feBlend in="SourceGraphic" in2="warmNoise" mode="soft-light" />
            </filter>
            <filter id="softGoldShadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="26" stdDeviation="20" floodColor="#171414" floodOpacity="0.3" />
              <feDropShadow dx="-16" dy="12" stdDeviation="10" floodColor="#7A4F0A" floodOpacity="0.18" />
            </filter>
            <clipPath id="topFaceClip">
              <path d="M113 93L421 74L489 193L154 271Z" />
            </clipPath>
          </defs>

          <ellipse cx="292" cy="307" rx="201" ry="33" fill="rgba(93,65,13,0.16)" />

          <g filter="url(#softGoldShadow)">
            <path d="M113 93L421 74L489 193L154 271Z" fill="url(#goldTopReal)" filter="url(#goldTexture)" />
            <path d="M113 93L154 271L98 248L61 133Z" fill="url(#goldLeftReal)" filter="url(#goldTexture)" />
            <path d="M421 74L489 193L453 273L392 153Z" fill="url(#goldRightReal)" filter="url(#goldTexture)" />
            <path d="M154 271L489 193L453 273L188 321L98 248Z" fill="url(#goldLipReal)" filter="url(#goldTexture)" />

            <path
              d="M113 93L421 74L489 193L154 271Z"
              fill="none"
              stroke="url(#edgeHighlight)"
              strokeWidth="4"
              strokeLinejoin="round"
              opacity="0.82"
            />
            <path d="M154 271L489 193L453 273L188 321L98 248Z" fill="#5D3B08" opacity="0.18" />
            <path d="M118 104L417 86L475 190L158 260Z" fill="none" stroke="#FFF3B1" strokeOpacity="0.34" strokeWidth="2" />

            <g clipPath="url(#topFaceClip)">
              <rect
                className="animate-gold-sheen-real"
                x="-170"
                y="36"
                width="96"
                height="270"
                fill="url(#movingSheenReal)"
                opacity="0.82"
                transform="rotate(-12 0 0)"
              />
              <path d="M128 113L236 105" stroke="#FFF8D5" strokeWidth="2" strokeLinecap="round" opacity="0.34" />
              <path d="M302 244L432 214" stroke="#3E2806" strokeWidth="2" strokeLinecap="round" opacity="0.22" />
              <path d="M139 246L246 223" stroke="#FFF8D5" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            </g>

            <g transform="translate(277 171) rotate(-11) skewX(-14)" textAnchor="middle">
              <text
                y="-13"
                fontSize="28"
                fontWeight="900"
                letterSpacing="8"
                fill="#3F2B08"
                opacity="0.46"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SANAD
              </text>
              <text
                x="-1.5"
                y="-15"
                fontSize="28"
                fontWeight="900"
                letterSpacing="8"
                fill="#FFEFAE"
                opacity="0.42"
                style={{ fontFamily: "var(--font-display)" }}
              >
                SANAD
              </text>
              <text y="24" fontSize="13" fontWeight="800" letterSpacing="5" fill="#3F2B08" opacity="0.4">
                999.9 FINE GOLD
              </text>
              <text x="-1" y="22.5" fontSize="13" fontWeight="800" letterSpacing="5" fill="#FFF1B7" opacity="0.38">
                999.9 FINE GOLD
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
