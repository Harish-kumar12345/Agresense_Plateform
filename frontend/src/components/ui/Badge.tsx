import React from 'react';
import { CategoryTone } from '../../styles/design-tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'amber' | 'sky' | 'rose' | 'indigo' | 'slate' | 'outline' | 'weather' | 'soil' | 'yield' | 'price' | 'disease' | 'inventory' | 'farm' | 'harvest' | 'default';
  tone?: CategoryTone;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'pill' | 'tag' | 'live';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  tone,
  size = 'md',
  shape = 'pill',
  icon,
  children,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
    lg: 'text-xs px-3 py-1 gap-1.5 font-semibold',
  };

  const shapeStyles = {
    pill: 'rounded-full',
    tag: 'rounded-md',
    live: 'rounded-full pr-3',
  };

  const activeKey = tone || variant;

  const variantStyles: Record<string, string> = {
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-xs',
    soil: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-xs',
    farm: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-xs',
    
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-xs',
    yield: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-xs',
    price: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-xs',
    harvest: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-xs',
    
    sky: 'bg-sky-950/60 text-sky-300 border-sky-500/40 shadow-xs',
    weather: 'bg-sky-950/60 text-sky-300 border-sky-500/40 shadow-xs',
    
    rose: 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-xs',
    disease: 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-xs',
    
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 shadow-xs',
    inventory: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 shadow-xs',
    
    slate: 'bg-slate-900/80 text-slate-200 border-white/15 shadow-xs',
    default: 'bg-slate-900/80 text-slate-200 border-white/15 shadow-xs',
    outline: 'bg-transparent text-slate-200 border-white/25',
  };

  return (
    <span
      className={`inline-flex items-center border select-none backdrop-blur-md ${shapeStyles[shape]} ${sizeStyles[size]} ${variantStyles[activeKey] || variantStyles.emerald} ${className}`}
      {...props}
    >
      {shape === 'live' && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
