import React from 'react';

interface SdaaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  variant?: 'full' | 'icon-only';
}

export const SdaaLogo: React.FC<SdaaLogoProps> = ({ 
  className = '', 
  size = 'md',
  showSubtitle = false,
  variant = 'full'
}) => {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Modern Geometric Data Logo Mark */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="neonBar1" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="neonBar2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="neonBar3" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="neonBar4" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagonal container with dark background and border */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="22"
            fill="#10162B"
            stroke="#27345A"
            strokeWidth="3"
          />

          {/* Multi-colored glowing vertical data bars */}
          <rect x="22" y="52" width="10" height="26" rx="3" fill="url(#neonBar1)" filter="url(#neonGlow)" />
          <rect x="38" y="38" width="10" height="40" rx="3" fill="url(#neonBar2)" filter="url(#neonGlow)" />
          <rect x="54" y="24" width="10" height="54" rx="3" fill="url(#neonBar3)" filter="url(#neonGlow)" />
          <rect x="70" y="44" width="10" height="34" rx="3" fill="url(#neonBar4)" filter="url(#neonGlow)" />

          {/* Neural trend line connecting top points */}
          <path
            d="M 27 52 L 43 38 L 59 24 L 75 44"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="27" cy="52" r="3.5" fill="#FFFFFF" />
          <circle cx="43" cy="38" r="3.5" fill="#FFFFFF" />
          <circle cx="59" cy="24" r="3.5" fill="#FFFFFF" />
          <circle cx="75" cy="44" r="3.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography Section */}
      {variant === 'full' && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-[#F8FAFC] ${textSizes}`}>
            SDA
          </span>
          <span className={`font-black tracking-tight text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)] ${textSizes}`}>
            Assistant
          </span>
        </div>
      )}
    </div>
  );
};
