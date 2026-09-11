import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  MapPin,
  BarChart3,
  Brain,
  Tractor,
  IndianRupee,
  Bug,
  Pill,
  FlaskConical,
  CloudSun,
  MessageSquare,
  Shield,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Activity,
  Wrench,
  Sparkles,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavbarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  unreadAlertCount: number;
  onOpenAlerts: () => void;
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  unreadAlertCount,
  onOpenAlerts,
  user,
  onLogout
}) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Scroll listener for glass elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFarmActive = ['home', 'dashboard', 'gis', 'analytics'].includes(currentView);
  const isMonitorActive = ['weather', 'soil', 'disease'].includes(currentView);
  const isOpsActive = ['inventory', 'harvest'].includes(currentView);
  const isIntelActive = ['yield', 'prices', 'chat'].includes(currentView);

  const navSections = [
    {
      id: 'farm',
      label: 'Workspace',
      icon: <Sprout className="w-4 h-4" />,
      isActive: isFarmActive,
      items: [
        { id: 'home', label: 'Field Setup & Entry', sub: 'Coordinates & crop parameters', icon: <Activity className="w-4 h-4 text-emerald-400" />, iconBox: 'bg-emerald-950/70 border-emerald-500/30' },
        { id: 'dashboard', label: 'Agronomic Overview', sub: 'Telemetry & operations summary', icon: <BarChart3 className="w-4 h-4 text-emerald-400" />, iconBox: 'bg-emerald-950/70 border-emerald-500/30' },
        { id: 'gis', label: 'GIS Boundary Map', sub: 'Boundary polygons & coordinates', icon: <MapPin className="w-4 h-4 text-emerald-300" />, iconBox: 'bg-emerald-950/70 border-emerald-500/30' },
        { id: 'analytics', label: 'Farm Analytics', sub: 'Historical & sensory performance', icon: <Layers className="w-4 h-4 text-teal-400" />, iconBox: 'bg-teal-950/70 border-teal-500/30' },
      ]
    },
    {
      id: 'monitor',
      label: 'Monitoring',
      icon: <CloudSun className="w-4 h-4" />,
      isActive: isMonitorActive,
      items: [
        { id: 'weather', label: 'Weather Telemetry', sub: 'Hyperlocal forecast & precip', icon: <CloudSun className="w-4 h-4 text-sky-400" />, iconBox: 'bg-sky-950/70 border-sky-500/30' },
        { id: 'soil', label: 'Soil Horizon & NPK', sub: 'Moisture, pH & nutrients', icon: <FlaskConical className="w-4 h-4 text-emerald-400" />, iconBox: 'bg-emerald-950/70 border-emerald-500/30' },
        { id: 'disease', label: 'Pathogen & Pest Risk', sub: 'Random Forest risk classifier', icon: <Bug className="w-4 h-4 text-rose-400" />, iconBox: 'bg-rose-950/70 border-rose-500/30' },
      ]
    },
    {
      id: 'ops',
      label: 'Operations',
      icon: <Wrench className="w-4 h-4" />,
      isActive: isOpsActive,
      items: [
        { id: 'inventory', label: 'Inventory Tracker', sub: 'Stock, fertilizers & pesticides', icon: <Pill className="w-4 h-4 text-indigo-400" />, iconBox: 'bg-indigo-950/70 border-indigo-500/30' },
        { id: 'harvest', label: 'Harvest Planning', sub: 'Schedules, logistics & storage', icon: <Tractor className="w-4 h-4 text-amber-400" />, iconBox: 'bg-amber-950/70 border-amber-500/30' },
      ]
    },
    {
      id: 'intel',
      label: 'Intelligence',
      icon: <Brain className="w-4 h-4" />,
      isActive: isIntelActive,
      items: [
        { id: 'yield', label: 'Yield Prediction ML', sub: 'Multi-variable tonnage forecast', icon: <Brain className="w-4 h-4 text-amber-300" />, iconBox: 'bg-amber-950/70 border-amber-500/30' },
        { id: 'prices', label: 'Mandi Market Rates', sub: 'Live commodity price tracking', icon: <IndianRupee className="w-4 h-4 text-amber-400" />, iconBox: 'bg-amber-950/70 border-amber-500/30' },
        { id: 'chat', label: 'Agronomist Advisor', sub: 'Bilingual AI voice & chat assistant', icon: <MessageSquare className="w-4 h-4 text-emerald-400" />, iconBox: 'bg-emerald-950/70 border-emerald-500/30' },
      ]
    }
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070D0A]/92 backdrop-blur-2xl border-b border-emerald-900/30 shadow-2xl shadow-black/70 py-2.5'
          : 'bg-[#070D0A]/80 backdrop-blur-xl border-b border-white/10 py-3'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo & Wordmark */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => onSelectView('home')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-300/30 group-hover:scale-105 transition-transform duration-200">
              <Sprout className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white font-display">
                  Agri<span className="text-emerald-400">Sense</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Precision Suite
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Sliding Nav - VerdaAgro Organic Glass Pill */}
          <nav className="hidden lg:flex items-center shrink-0 bg-[#0D1612]/90 p-1.5 rounded-full border border-emerald-900/40 shadow-inner" ref={navRef}>
            {navSections.map((sec) => {
              const isOpen = activeDropdown === sec.id;
              return (
                <div key={sec.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(isOpen ? null : sec.id)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 select-none cursor-pointer ${
                      sec.isActive
                        ? 'text-white bg-emerald-500/20 border border-emerald-400/40 shadow-sm'
                        : 'text-[#D1DED6] hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={sec.isActive ? 'text-emerald-400' : 'text-[#D1DED6]'}>
                      {sec.icon}
                    </span>
                    <span>{sec.label}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 mt-2 w-64 bg-[#0D1612]/98 backdrop-blur-2xl border border-emerald-900/50 rounded-2xl shadow-2xl p-2 space-y-1 z-50"
                      >
                        {sec.items.map((item) => {
                          const isCurrent = currentView === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onSelectView(item.id);
                                setActiveDropdown(null);
                              }}
                              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-start gap-3 transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'text-white hover:bg-[#13231B] hover:text-white'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${(item as any).iconBox || 'bg-[#070D0A] border-emerald-900/40'}`}>
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold tracking-tight text-white">{item.label}</div>
                                <div className="text-[11px] text-[#D1DED6] truncate">{item.sub}</div>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Right Utility Section: Alerts + User Avatar */}
          <div className="hidden lg:flex items-center gap-3">

            {/* Smart Alerts Center Trigger */}
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative p-2 bg-[#0D1612]/90 hover:bg-emerald-950/40 border border-emerald-900/40 hover:border-emerald-500/40 text-[#D1DED6] hover:text-white rounded-xl transition-all select-none cursor-pointer group"
              title="Smart Telemetry Alerts"
            >
              <Bell className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {/* User Profile / Avatar Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 bg-[#0D1612]/90 hover:bg-emerald-950/40 border border-emerald-900/40 hover:border-emerald-500/40 rounded-xl text-xs text-white transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-[11px]">
                    {(user.name || user.email || 'F')[0].toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate font-medium text-white">{user.name || user.email || 'Farmer'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-[#0D1612]/98 backdrop-blur-2xl border border-emerald-900/50 rounded-2xl shadow-2xl p-2 z-50"
                    >
                      <div className="px-3 py-2 border-b border-emerald-900/30 mb-1">
                        <p className="text-xs font-semibold text-white truncate">{user.name || 'User'}</p>
                        <p className="text-[11px] text-[#D1DED6] truncate">{user.email || 'guest@agrisense.farm'}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#070D0A] text-emerald-400 border border-emerald-500/30">
                          {user.role || 'Guest Mode'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile Actions: Alerts + Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={onOpenAlerts}
              className="relative p-2 bg-[#0D1612]/90 text-[#D1DED6] hover:text-white rounded-xl border border-emerald-900/40"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#D1DED6] hover:text-white bg-[#0D1612]/90 hover:bg-emerald-950/40 rounded-xl border border-emerald-900/40"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#070D0A]/98 backdrop-blur-2xl border-b border-emerald-900/40 px-4 py-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <button type="button" onClick={() => { onSelectView('home'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <Sprout className="w-4 h-4 text-emerald-400" /> Setup & Entry
              </button>
              <button type="button" onClick={() => { onSelectView('dashboard'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> Dashboard
              </button>
              <button type="button" onClick={() => { onSelectView('gis'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4 text-emerald-400" /> GIS Map
              </button>
              <button type="button" onClick={() => { onSelectView('weather'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <CloudSun className="w-4 h-4 text-sky-400" /> Weather
              </button>
              <button type="button" onClick={() => { onSelectView('soil'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <FlaskConical className="w-4 h-4 text-emerald-400" /> Soil NPK
              </button>
              <button type="button" onClick={() => { onSelectView('disease'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <Bug className="w-4 h-4 text-rose-400" /> Disease Risk
              </button>
              <button type="button" onClick={() => { onSelectView('inventory'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <Pill className="w-4 h-4 text-purple-400" /> Inventory
              </button>
              <button type="button" onClick={() => { onSelectView('harvest'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <Tractor className="w-4 h-4 text-amber-400" /> Harvest
              </button>
              <button type="button" onClick={() => { onSelectView('yield'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <Brain className="w-4 h-4 text-emerald-400" /> Yield Prediction
              </button>
              <button type="button" onClick={() => { onSelectView('prices'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-emerald-900/30 rounded-xl text-left flex items-center gap-2 text-white">
                <IndianRupee className="w-4 h-4 text-emerald-400" /> Crop Prices
              </button>
              <button type="button" onClick={() => { onSelectView('chat'); setMobileMenuOpen(false); }} className="p-2.5 bg-[#0D1612] border border-sky-500/30 rounded-xl text-left flex items-center gap-2 col-span-2 text-sky-300">
                <MessageSquare className="w-4 h-4 text-sky-400" /> Agronomic Advisor
              </button>
            </div>

            {user && (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300">{user.name || user.email}</span>
                <button type="button" onClick={onLogout} className="text-rose-400 hover:text-rose-300 font-semibold">
                  Sign Out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
