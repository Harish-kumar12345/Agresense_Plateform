import React from 'react';
import { CategoryTone, categoryTones } from '../../styles/design-tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'dark' | 'lightTint';
  glow?: 'emerald' | 'amber' | 'sky' | 'rose' | 'indigo' | 'none';
  tone?: CategoryTone;
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'asymmetric';
  elevation?: 'flat' | 'resting' | 'interactive' | 'hero';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  glow = 'none',
  tone,
  radius = 'xl',
  elevation = 'resting',
  className = '',
  children,
  ...props
}) => {
  const toneConfig = tone ? categoryTones[tone] : null;

  // Deliberate radius scale
  const radiusStyles = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
    '3xl': 'rounded-[1.75rem]',
    asymmetric: 'rounded-3xl rounded-tr-xl',
  };

  // 3-Tier Elevation hierarchy
  const elevationStyles = {
    flat: 'shadow-none',
    resting: 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.55)]',
    interactive: 'shadow-[0_6px_24px_-4px_rgba(0,0,0,0.65)] hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.85)] hover:-translate-y-0.5',
    hero: 'shadow-[0_16px_44px_-8px_rgba(0,0,0,0.8)] border-t border-t-white/15',
  };

  const variantStyles = {
    default: toneConfig 
      ? `${toneConfig.cardBg} backdrop-blur-xl ${toneConfig.cardBorder} text-slate-100`
      : 'bg-[#0D1612]/92 backdrop-blur-xl border border-emerald-900/30 text-slate-100',
    elevated: toneConfig
      ? `${toneConfig.cardBg} backdrop-blur-xl ${toneConfig.cardBorder} text-slate-100`
      : 'bg-[#0D1612]/96 backdrop-blur-xl border border-emerald-800/40 text-slate-100',
    glass: 'bg-white/[0.04] backdrop-blur-2xl border border-white/12 text-white',
    dark: 'bg-[#070D0A] border border-emerald-950/60 text-white',
    lightTint: 'bg-slate-900/90 border border-slate-700/50 text-slate-100',
  };

  const glowStyles = {
    none: '',
    emerald: 'hover:shadow-glow-emerald',
    amber: 'hover:shadow-glow-amber',
    sky: 'hover:shadow-glow-sky',
    rose: 'hover:shadow-glow-rose',
    indigo: 'hover:shadow-glow-indigo',
  };

  const resolvedGlow = glow !== 'none'
    ? glowStyles[glow]
    : toneConfig
    ? toneConfig.glowHover
    : '';

  return (
    <div
      className={`transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${radiusStyles[radius]} ${elevationStyles[elevation]} ${variantStyles[variant]} ${resolvedGlow} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
