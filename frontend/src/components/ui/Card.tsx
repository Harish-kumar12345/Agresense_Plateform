import React from 'react';
import { CategoryTone, categoryTones } from '../../styles/design-tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'dark';
  glow?: 'emerald' | 'amber' | 'sky' | 'rose' | 'indigo' | 'none';
  tone?: CategoryTone;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  glow = 'none',
  tone,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-[#0D1612]/90 backdrop-blur-xl border border-emerald-900/30 text-slate-100 shadow-xl",
    elevated: "bg-[#0D1612]/95 backdrop-blur-xl border border-emerald-900/40 text-slate-100 shadow-2xl hover:shadow-black/60",
    glass: "bg-[#0D1612]/75 backdrop-blur-2xl border border-emerald-900/30 text-white shadow-2xl",
    dark: "bg-[#070D0A] border border-emerald-950 text-white shadow-2xl",
  };

  const glowStyles = {
    none: "",
    emerald: "hover:shadow-glow-emerald",
    amber: "hover:shadow-glow-amber",
    sky: "hover:shadow-glow-sky",
    rose: "hover:shadow-glow-rose",
    indigo: "hover:shadow-glow-indigo",
  };

  const toneConfig = tone ? categoryTones[tone] : null;
  const toneClasses = toneConfig ? `${toneConfig.cardBorder} ${toneConfig.glowHover}` : "hover:border-emerald-500/30";

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${variantStyles[variant]} ${tone ? toneClasses : glowStyles[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
