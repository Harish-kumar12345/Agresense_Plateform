import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'hero' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'harvest' | 'sky' | 'forest' | 'destructive' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'asymmetric';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  radius,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer";

  const defaultRadius = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-xl',
  }[size];

  const radiusStyles = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
    asymmetric: 'rounded-xl rounded-tr-sm',
  };

  const chosenRadius = radius ? radiusStyles[radius] : defaultRadius;

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-5 py-3 gap-2.5 font-semibold",
  };

  const normalizedVariant = variant === 'danger' ? 'destructive' : variant;

  const variantStyles: Record<string, string> = {
    hero: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold tracking-wide shadow-lg shadow-emerald-950/40 hover:shadow-glow-emerald border border-emerald-300/40",
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-950/30 hover:shadow-lg hover:shadow-emerald-600/30 border border-emerald-500/40",
    forest: "bg-emerald-700 hover:bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40 border border-emerald-400/30",
    sky: "bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-950/40 border border-sky-400/30",
    harvest: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-950/40 hover:shadow-lg hover:shadow-amber-500/30 border border-amber-300/50",
    secondary: "bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/12 shadow-sm hover:text-white",
    outline: "bg-transparent hover:bg-white/[0.06] text-slate-200 border border-white/20 hover:border-white/35",
    ghost: "bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white",
    glass: "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-sm",
    destructive: "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-950/40 border border-rose-500/30",
  };

  return (
    <button
      className={`${baseStyles} ${chosenRadius} ${sizeStyles[size]} ${variantStyles[normalizedVariant] || variantStyles.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      
      <span>{children}</span>
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
