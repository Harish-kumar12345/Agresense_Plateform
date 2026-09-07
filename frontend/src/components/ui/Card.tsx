import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'dark';
  glow?: 'emerald' | 'amber' | 'none';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  glow = 'none',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border border-slate-200/80 shadow-sm hover:border-slate-300",
    elevated: "bg-white border border-slate-200/80 shadow-saas hover:shadow-saas-hover hover:border-slate-300",
    glass: "bg-white/80 backdrop-blur-xl border border-white/40 shadow-saas",
    dark: "bg-slate-900 border border-slate-800 text-white shadow-2xl",
  };

  const glowStyles = {
    none: "",
    emerald: "hover:shadow-glow-emerald",
    amber: "hover:shadow-glow-harvest",
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${variantStyles[variant]} ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
