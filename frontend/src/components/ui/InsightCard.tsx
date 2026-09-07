import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: {
    value: number | string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  badge?: string;
  className?: string;
  onClick?: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
  trend,
  badge,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`saas-card p-5 group relative overflow-hidden ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${iconBg} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 mb-1">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-display">
            {value}
          </h3>
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : trend.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trend.direction === 'up' && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
              {trend.direction === 'down' && <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3 mr-0.5" />}
              {trend.value}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
