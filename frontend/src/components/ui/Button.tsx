import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'harvest' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2.5 rounded-xl gap-2",
    lg: "text-base px-5 py-3 rounded-xl gap-2.5 font-semibold",
  };

  const variantStyles = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-600/30 border border-emerald-500/30",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-sm",
    outline: "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900",
    glass: "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-sm",
    harvest: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-600/20 hover:shadow-lg hover:shadow-amber-500/30 border border-amber-400/40",
    destructive: "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-700/20 border border-rose-500/30",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
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
