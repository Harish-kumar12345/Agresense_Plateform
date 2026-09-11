import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryTone, categoryTones } from '../../styles/design-tokens';
import { AnimatedCounter } from '../Common/AnimatedCounter';

export interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  tone?: CategoryTone;
  radius?: 'md' | 'lg' | 'xl' | 'asymmetric';
  trend?: {
    value: number | string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  badge?: string;
  className?: string;
  onClick?: () => void;
  numericValue?: number;
  suffix?: string;
  decimals?: number;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  tone,
  radius = 'xl',
  trend,
  badge,
  className = '',
  onClick,
  numericValue,
  suffix = '',
  decimals = 0,
}) => {
  const toneConfig = tone ? categoryTones[tone] : null;

  const radiusClasses = {
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    asymmetric: 'rounded-2xl rounded-tr-sm',
  }[radius];

  const resolvedIconBg = iconBg || (toneConfig ? `${toneConfig.iconBg} ${toneConfig.iconColor}` : 'bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 text-emerald-300 border-emerald-500/35 shadow-inner');
  const cardBg = toneConfig ? toneConfig.cardBg : 'bg-[#0D1612]/92';
  const toneBorder = toneConfig ? toneConfig.cardBorder : 'border-emerald-900/30 hover:border-emerald-500/40';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`p-5 group relative overflow-hidden backdrop-blur-xl border ${radiusClasses} ${cardBg} ${toneBorder} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${resolvedIconBg} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-900/90 text-slate-200 border border-white/15 shadow-xs">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-300 mb-1 tracking-normal">
          {title}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-display">
            {typeof numericValue === 'number' ? (
              <AnimatedCounter value={numericValue} decimals={decimals} suffix={suffix} />
            ) : (
              value
            )}
          </h3>
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                trend.direction === 'up'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/35'
                  : trend.direction === 'down'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/35'
                  : 'bg-slate-900/80 text-slate-200 border-white/15'
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
          <p className="text-xs text-slate-300/85 mt-1.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};
