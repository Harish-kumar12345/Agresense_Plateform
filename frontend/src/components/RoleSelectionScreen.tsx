import React from 'react';
import { motion } from 'framer-motion';
import { Sprout, Shield, User, ArrowRight } from 'lucide-react';
import type { Role } from './RoleContext';

interface RoleCard {
  role: Role | 'guest';
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
  borderHover: string;
  glowColor: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: 'farmer',
    emoji: '🌱',
    icon: <Sprout className="w-7 h-7" />,
    title: 'Farmer',
    subtitle: 'Access crop insights, weather & AI advisory',
    accentColor: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/70',
    glowColor: 'hover:shadow-emerald-500/20',
  },
  {
    role: 'officer',
    emoji: '🛡️',
    icon: <Shield className="w-7 h-7" />,
    title: 'Officer',
    subtitle: 'Manage farmer queries & platform operations',
    accentColor: 'text-sky-400',
    borderHover: 'hover:border-sky-500/70',
    glowColor: 'hover:shadow-sky-500/20',
  },
  {
    role: 'guest',
    emoji: '👤',
    icon: <User className="w-7 h-7" />,
    title: 'Guest',
    subtitle: 'Explore instantly, no account needed',
    accentColor: 'text-slate-300',
    borderHover: 'hover:border-slate-400/50',
    glowColor: 'hover:shadow-slate-400/10',
  },
];

interface RoleSelectionScreenProps {
  onSelectRole: (role: Role | 'guest') => void;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.25 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function RoleSelectionScreen({ onSelectRole }: RoleSelectionScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 agri-canvas relative overflow-hidden select-none">
      {/* Aurora ambient glows */}
      <div className="aurora-glow -top-32 -left-32 bg-emerald-600/25" />
      <div className="aurora-glow -bottom-32 -right-32 bg-teal-600/15" />
      <div className="aurora-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-900/10 w-[600px] h-[600px]" />

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          {/* Logo mark */}
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-600/30 border border-emerald-300/40">
            <Sprout className="w-7 h-7 text-slate-950" />
          </div>

          {/* Brand wordmark */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-bold tracking-tight text-white font-display">
              Agri<span className="text-emerald-400">Sense</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
              Platform
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-display mb-2">
            <span className="apple-title-gradient">Welcome to AgriSense</span>
          </h1>
          <p className="text-sm sm:text-base text-[#94A3B8] max-w-sm mx-auto font-medium">
            Choose how you'd like to continue
          </p>
        </motion.div>

        {/* Role Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {ROLE_CARDS.map((card) => (
            <motion.button
              key={card.role}
              variants={cardVariants}
              type="button"
              onClick={() => onSelectRole(card.role)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`
                group relative flex flex-col items-center text-center p-8 rounded-3xl cursor-pointer
                apple-glass-card
                transition-all duration-300
              `}
            >
              {/* Glow ring on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.4), 0 0 24px -4px rgba(16,185,129,0.2)' }}
              />

              {/* Icon container */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                bg-[#070D0A] border border-emerald-900/40
                group-hover:border-emerald-500/40 transition-all duration-200
                ${card.accentColor}
              `}>
                {card.icon}
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-white tracking-tight font-display mb-2">
                {card.title}
              </h2>

              {/* Subtitle */}
              <p className="text-xs text-slate-400 leading-relaxed mb-5 flex-1">
                {card.subtitle}
              </p>

              {/* CTA */}
              <div className={`
                flex items-center gap-1.5 text-xs font-semibold transition-all duration-200
                ${card.accentColor} opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
              `}>
                <span>Continue as {card.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-center text-xs text-slate-500 mt-8"
        >
          Precision Agronomic Intelligence · Verified for Indian Agriculture
        </motion.p>
      </div>
    </div>
  );
}
