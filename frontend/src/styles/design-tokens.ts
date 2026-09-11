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

export type CategoryTone = 'weather' | 'soil' | 'yield' | 'price' | 'disease' | 'inventory' | 'farm' | 'harvest' | 'default';

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
    accent: 'sky',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/35',
    cardBg: 'bg-[#0a1520]/90',
    cardBorder: 'border-sky-900/35 hover:border-sky-500/40',
    glowHover: 'hover:shadow-glow-sky',
    iconBg: 'bg-gradient-to-br from-sky-500/20 to-sky-900/40 border-sky-500/35 shadow-inner',
    iconColor: 'text-sky-300',
    heroGradient: 'from-sky-950/70 via-[#0a1520] to-[#070D0A]',
  },
  soil: {
    name: 'Soil Horizon & NPK',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/35 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/35 shadow-inner',
    iconColor: 'text-emerald-300',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  yield: {
    name: 'Yield Prediction ML',
    accent: 'harvest',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/35',
    cardBg: 'bg-[#17130a]/90',
    cardBorder: 'border-amber-900/35 hover:border-amber-500/40',
    glowHover: 'hover:shadow-glow-amber',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-900/40 border-amber-500/35 shadow-inner',
    iconColor: 'text-amber-300',
    heroGradient: 'from-amber-950/70 via-[#17130a] to-[#070D0A]',
  },
  price: {
    name: 'Mandi Market Rates',
    accent: 'harvest',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/35',
    cardBg: 'bg-[#17130a]/90',
    cardBorder: 'border-amber-900/35 hover:border-amber-500/40',
    glowHover: 'hover:shadow-glow-harvest',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-900/40 border-amber-500/35 shadow-inner',
    iconColor: 'text-amber-300',
    heroGradient: 'from-amber-950/70 via-[#17130a] to-[#070D0A]',
  },
  disease: {
    name: 'Pathogen & Pest Risk',
    accent: 'rose',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/35',
    cardBg: 'bg-[#170a0d]/90',
    cardBorder: 'border-rose-900/35 hover:border-rose-500/40',
    glowHover: 'hover:shadow-glow-rose',
    iconBg: 'bg-gradient-to-br from-rose-500/20 to-rose-900/40 border-rose-500/35 shadow-inner',
    iconColor: 'text-rose-300',
    heroGradient: 'from-rose-950/70 via-[#170a0d] to-[#070D0A]',
  },
  inventory: {
    name: 'Inventory & Stock Tracker',
    accent: 'indigo',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/35',
    cardBg: 'bg-[#0f121d]/90',
    cardBorder: 'border-indigo-900/35 hover:border-indigo-500/40',
    glowHover: 'hover:shadow-glow-indigo',
    iconBg: 'bg-gradient-to-br from-indigo-500/20 to-indigo-900/40 border-indigo-500/35 shadow-inner',
    iconColor: 'text-indigo-300',
    heroGradient: 'from-indigo-950/70 via-[#0f121d] to-[#070D0A]',
  },
  farm: {
    name: 'Farm GIS & Field Boundaries',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/35 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/35 shadow-inner',
    iconColor: 'text-emerald-300',
    heroGradient: 'from-emerald-950/70 via-[#0D1612] to-[#070D0A]',
  },
  harvest: {
    name: 'Harvest Operations',
    accent: 'harvest',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/35',
    cardBg: 'bg-[#17130a]/90',
    cardBorder: 'border-amber-900/35 hover:border-amber-500/40',
    glowHover: 'hover:shadow-glow-amber',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-900/40 border-amber-500/35 shadow-inner',
    iconColor: 'text-amber-300',
    heroGradient: 'from-amber-950/70 via-[#17130a] to-[#070D0A]',
  },
  default: {
    name: 'Agronomic Operations',
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    cardBg: 'bg-[#0D1612]/90',
    cardBorder: 'border-emerald-900/35 hover:border-emerald-500/40',
    glowHover: 'hover:shadow-glow-emerald',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/35 shadow-inner',
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
