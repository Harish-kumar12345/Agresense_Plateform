import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryTone, categoryTones } from '../../styles/design-tokens';

export interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  tone?: CategoryTone;
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
  iconBg,
  tone,
  trend,
  badge,
  className = '',
  onClick,
}) => {
  const toneConfig = tone ? categoryTones[tone] : null;
  const resolvedIconBg = iconBg || (toneConfig ? `${toneConfig.iconBg} ${toneConfig.iconColor}` : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30');
  const toneBorder = toneConfig ? toneConfig.cardBorder : 'border-white/10 hover:border-emerald-500/30';

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.012 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`saas-card p-5 group relative overflow-hidden ${toneBorder} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${resolvedIconBg} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-200 border border-white/10">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-1">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-display">
            {value}
          </h3>
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                trend.direction === 'up'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : trend.direction === 'down'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
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
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};
