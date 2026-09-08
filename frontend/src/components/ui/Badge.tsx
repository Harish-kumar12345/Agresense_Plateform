import React from 'react';
import { CategoryTone } from '../../styles/design-tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'outline' | 'weather' | 'soil' | 'yield' | 'price' | 'disease' | 'inventory' | 'farm' | 'harvest';
  tone?: CategoryTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  tone,
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const activeKey = tone || variant;

  const variantStyles: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    soil: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    farm: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    yield: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    price: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    harvest: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    weather: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    disease: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    inventory: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border-white/10',
    default: 'bg-slate-800/80 text-slate-300 border-white/10',
    outline: 'bg-transparent text-slate-300 border-white/20',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs select-none backdrop-blur-xs ${sizeStyles[size]} ${variantStyles[activeKey] || variantStyles.emerald} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
