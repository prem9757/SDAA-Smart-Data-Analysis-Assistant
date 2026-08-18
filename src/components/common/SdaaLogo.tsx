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
  showSubtitle = true,
  variant = 'full'
}) => {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }[size];

  const subTextSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Modern Geometric Data Logo Mark */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary Cyan-Teal Hex Gradient */}
            <linearGradient id="sdaaPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>

            {/* Accent Glowing Blue-Indigo */}
            <linearGradient id="sdaaAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            {/* Subtle Metallic Shimmer */}
            <linearGradient id="sdaaShimmer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.2" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="sdaaGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Shield/Rounded Isometric Prism */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="24"
            className="fill-slate-100 dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="3"
          />

          {/* Hexagonal Isometric Prism Path */}
          <path
            d="M 50 18 L 82 35 L 82 68 L 50 85 L 18 68 L 18 35 Z"
            fill="url(#sdaaPrimaryGrad)"
            opacity="0.15"
            stroke="url(#sdaaPrimaryGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Inner 3D Cubical Analytics Facets */}
          {/* Top Facet */}
          <path
            d="M 50 20 L 78 35 L 50 50 L 22 35 Z"
            fill="url(#sdaaPrimaryGrad)"
            opacity="0.9"
          />

          {/* Left Facet */}
          <path
            d="M 22 35 L 50 50 L 50 80 L 22 65 Z"
            fill="url(#sdaaPrimaryGrad)"
            opacity="0.6"
          />

          {/* Right Facet */}
          <path
            d="M 50 50 L 78 35 L 78 65 L 50 80 Z"
            fill="url(#sdaaPrimaryGrad)"
            opacity="0.75"
          />

          {/* Dynamic Floating Data Bar Charts inside Prism */}
          <rect x="33" y="44" width="6" height="18" rx="2" fill="#FFFFFF" opacity="0.9" />
          <rect x="43" y="38" width="6" height="24" rx="2" fill="#38BDF8" filter="url(#sdaaGlow)" />
          <rect x="53" y="32" width="6" height="30" rx="2" fill="#22D3EE" filter="url(#sdaaGlow)" />
          <rect x="63" y="42" width="6" height="20" rx="2" fill="#818CF8" />

          {/* AI Spark Star Node Overlay */}
          <path
            d="M 50 12 L 52.5 17.5 L 58 20 L 52.5 22.5 L 50 28 L 47.5 22.5 L 42 20 L 47.5 17.5 Z"
            fill="#38BDF8"
            filter="url(#sdaaGlow)"
          />

          {/* Connecting Neural Trendline */}
          <path
            d="M 28 62 L 40 54 L 56 58 L 72 46"
            fill="none"
            stroke="#67E8F9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#sdaaGlow)"
          />
          <circle cx="28" cy="62" r="3.5" fill="#38BDF8" />
          <circle cx="40" cy="54" r="3.5" fill="#38BDF8" />
          <circle cx="56" cy="58" r="3.5" fill="#22D3EE" />
          <circle cx="72" cy="46" r="4" fill="#67E8F9" />
        </svg>
      </div>

      {/* Typography Section */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes}`}>
              SDA
            </span>
            <span className={`font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 ${textSizes}`}>
              Assistant
            </span>
          </div>

          {showSubtitle && (
            <div className={`font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-0.5 ${subTextSizes}`}>
              Smart Data Analysis Platform
            </div>
          )}
        </div>
      )}
    </div>
  );
};
