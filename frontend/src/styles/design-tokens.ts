/**
 * AgriSense Design System Tokens
 * Defines primary brand emerald, harvest amber, slate neutrals, elevation, and motion curves.
 */

export const colors = {
  // Primary Forest/Emerald Green Scale
  forest: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // Secondary Harvest / Soil Gold Scale
  harvest: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Slate / Zinc Neutral SaaS scale (No pure #000 or #fff)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#090d16',
  },
  // Semantic Tint Surfaces
  semantic: {
    success: { text: '#15803d', bg: '#dcfce7', border: '#86efac' },
    warning: { text: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
    danger: { text: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
    info: { text: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  }
};

export const elevation = {
  card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06)',
  cardHover: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 16px 32px -4px rgba(15, 23, 42, 0.1)',
  glowEmerald: '0 0 30px -5px rgba(34, 197, 94, 0.25)',
  glowAmber: '0 0 30px -5px rgba(245, 158, 11, 0.25)',
  modal: '0 25px 50px -12px rgba(9, 13, 22, 0.25)',
};

export const motionTokens = {
  transition: {
    micro: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    normal: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    macro: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  easing: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export type CategoryTone = 'weather' | 'soil' | 'yield' | 'price' | 'disease' | 'inventory' | 'farm' | 'default';

export const categoryTones: Record<CategoryTone, {
  name: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  glowHover: string;
  iconBg: string;
  iconColor: string;
  heroGradient: string;
}> = {
  weather: {
    name: 'Weather Telemetry',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  soil: {
    name: 'Soil Horizon & NPK',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  yield: {
    name: 'Yield Prediction ML',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  price: {
    name: 'Mandi Market Rates',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  disease: {
    name: 'Pathogen & Pest Risk',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  inventory: {
    name: 'Inventory & Stock Tracker',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  farm: {
    name: 'Farm GIS & Field Boundaries',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  default: {
    name: 'Agronomic Operations',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/30 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  }
};

export const motionPresets = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
  },
  hoverLift: {
    scale: 1.015,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
  }
};
